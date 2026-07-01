# Continuous State vs. Discrete Events

This guide describes a pattern for implementing authoritative-server multiplayer in C#. It is not tied to any specific engine or game — the same approach works in Unity, MonoGame, or a plain socket server.

The central idea: **not all networked data is the same shape, and treating it as if it were wastes bandwidth or introduces bugs.** Split your data into two categories up front, because they want different transports, different reliability guarantees, and different client-side handling.

---

## The two categories

| | Continuous state (positions, rotations, velocity) | Discrete events (an item was placed, a door opened, damage was dealt) |
|---|---|---|
| **Nature** | A value that exists every tick and changes smoothly | Something that happens once, at a specific moment |
| **If a packet is dropped** | Fine — a newer packet is coming in ~33ms with a fresher value | Bad — that event never happened, state diverges |
| **Reliability needed** | Unreliable/unordered is fine | Reliable, ordered (or reliable with explicit sequencing) |
| **Frequency** | Every tick, or on a fixed interval, whether or not it changed | Only when it actually occurs |
| **Payload** | Small, fixed-size, latest-value-wins | Small command describing *what happened*, not the resulting full state |
| **Client-side handling** | Interpolate/extrapolate between received values | Apply once, deterministically, on both sides |
| **Recovery from missed data** | Self-healing — just wait for the next update | Needs an explicit resync mechanism (see below) |

Conflating these is the most common netcode mistake: sending player position as a reliable "event," or sending every world mutation as a full-state broadcast. The former adds head-of-line-blocking latency to something that doesn't need it; the latter wastes bandwidth resending unrelated state and breaks down as the world grows.

---

## Architecture: authoritative server + two data paths

```
                 ┌─────────────────────┐
                 │       Server        │
                 │  (owns truth)       │
                 └─────────┬───────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                        │
  unreliable, every tick                 reliable, on change
  "here is the current                   "this event happened,
   value of X"                            apply it"
        │                                        │
        ▼                                        ▼
┌───────────────┐                        ┌───────────────────┐
│ Continuous     │                        │  Discrete event    │
│ state sync     │                        │  / command sync     │
│ (interpolate)  │                        │  (deterministic     │
│                │                        │   apply)            │
└───────────────┘                        └───────────────────┘
```

Both paths can run over the same connection using two logical channels (reliable + unreliable), which most transport libraries (ENet, LiteNetLib, Steam Networking Sockets, GameNetworkingSockets, raw UDP with your own reliability layer) expose directly.

---

## Part 1 — Syncing continuous state (positions, rotations, etc.)

### Server side

Every tick (or every Nth tick), gather the current value of each continuously-changing thing you care about into a small struct and send it unreliably. Don't bother deduplicating or resending old values — if a packet is lost, the next one supersedes it.

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct EntityTransformSnapshot
{
    public int entityId;
    public uint serverTick;
    public Vector3 position;
    public Quaternion rotation;
}
```

Keep this struct as small and flat as possible — it's sent at high frequency, so every byte is multiplied by tick rate × entity count × client count.

### Client side: never snap remote entities directly to the latest value

The mistake to avoid: setting `transform.position = received.position` the instant a packet arrives. Packets arrive at network tick rate (say 20–30Hz), not render frame rate (60+ FPS), so this produces visible stutter/teleporting.

Instead, buffer incoming snapshots and interpolate between them on a small delay:

```csharp
public class InterpolationBuffer
{
    private readonly List<EntityTransformSnapshot> buffer = new();
    private const float InterpolationDelaySeconds = 0.1f; // ~2-3 network ticks of buffer

    public void Push(EntityTransformSnapshot snapshot)
    {
        buffer.Add(snapshot);
        // Keep a small window; drop anything older than we'll ever render
        buffer.RemoveAll(s => s.serverTick < snapshot.serverTick - 60);
    }

    public (Vector3 position, Quaternion rotation) Sample(float renderTime)
    {
        float targetTime = renderTime - InterpolationDelaySeconds;

        // Find the two snapshots that straddle targetTime and lerp between them.
        // If targetTime is newer than everything buffered, extrapolate from the
        // last known velocity instead of holding position (falls back to snapping
        // only as a last resort, e.g. after a long stall).
        var (from, to) = FindSurrounding(targetTime);
        if (to == null) return Extrapolate(from, targetTime);

        float t = InverseLerp(from.serverTick, to.serverTick, targetTime);
        return (Vector3.Lerp(from.position, to.position, t),
                Quaternion.Slerp(from.rotation, to.rotation, t));
    }
}
```

This is the standard "render in the past" technique: always interpolate between two *already-received* snapshots rather than trying to guess ahead. It costs a small, constant amount of visual latency (the interpolation delay) in exchange for eliminating jitter entirely.

### Client-side prediction for the *local* player's own movement

Interpolation is for *other* entities. Your own locally-controlled entity should move immediately in response to input (don't wait for a server round-trip), then reconcile against the server's authoritative value:

1. Apply input locally immediately, and store `(inputSequenceNumber, inputs)` in a local history buffer.
2. Send the input to the server (not the resulting position — let the server simulate).
3. When the server's authoritative snapshot for your entity arrives, it's tagged with the last input sequence number it processed.
4. Discard acknowledged inputs from the local history, snap to the server's position, then **replay** the remaining not-yet-acknowledged inputs on top of it.

```csharp
public struct PendingInput
{
    public uint sequenceNumber;
    public Vector2 moveInput;
    public float deltaTime;
}

void OnAuthoritativeSnapshotReceived(EntityTransformSnapshot serverState, uint lastProcessedInput)
{
    localEntity.position = serverState.position;
    pendingInputs.RemoveAll(i => i.sequenceNumber <= lastProcessedInput);

    foreach (var input in pendingInputs)
        ApplyMovement(localEntity, input); // re-simulate deterministically
}
```

This is the same predict → reconcile → replay loop used by most action-oriented netcode (Quake-style). If your movement simulation isn't deterministic or cheap to re-run, you can skip the replay step and just accept a small correction snap — a reasonable tradeoff for slower-paced games where occasional micro-corrections aren't noticeable.

---

## Part 2 — Syncing discrete events (state changes, world mutations)

Discrete events should never be represented as "send me the new value of X" — represent them as **commands describing what happened**, and apply the command deterministically on whichever machine is simulating (this is event sourcing / command replication).

### Define a command envelope, not a raw state diff

```csharp
public enum CommandType : byte
{
    None = 0,
    SpawnItem,
    RemoveItem,
    ApplyDamage,
    ToggleSwitch,
    // ...
}

[StructLayout(LayoutKind.Explicit)]
public struct CommandPayload
{
    [FieldOffset(0)] public SpawnItemCommand spawnItem;
    [FieldOffset(0)] public RemoveItemCommand removeItem;
    [FieldOffset(0)] public ApplyDamageCommand applyDamage;
    // all payloads share offset 0 — a tagged union, keeps the envelope one fixed size
}

public struct Command
{
    public CommandType type;
    public CommandPayload payload;
    public uint sequenceNumber; // assigned when queued, used for de-dup and ack
    public int originClientId;
}
```

Why a command, not a state snapshot:
- **Bandwidth**: "spawn item X at position Y" is a handful of bytes; the resulting change to global state might be large.
- **Causality**: the command carries *why* something changed, which matters for authority checks (can this client actually do this?) and for producing readable logs/replays.
- **Determinism enables replays and reconciliation**: if applying a command is a pure function of `(current state, command) → new state`, the same command log can be replayed on any machine (client prediction, spectators, save-file replay, crash recovery) and produce identical results.

### Applying commands: one dispatch point

```csharp
public static class CommandProcessor
{
    public static void Apply(WorldState world, Command command)
    {
        switch (command.type)
        {
            case CommandType.SpawnItem:
                Apply_SpawnItem(world, command.payload.spawnItem);
                break;
            case CommandType.RemoveItem:
                Apply_RemoveItem(world, command.payload.removeItem);
                break;
            // ...
        }
    }
}
```

Route *every* mutation to shared state through this single switch, on both client and server. Never mutate shared state directly from input-handling or UI code — always go through a command. This is what makes it possible for the client to predict its own actions and reconcile later, and for the server to be the single source of truth without special-casing every feature.

### Reliability and ordering

Send commands over a **reliable, ordered** channel. A dropped "remove item" command that never gets resent leaves the client and server permanently disagreeing about whether that item exists. Tag each command with a sequence number per originator so the receiver can:

- de-duplicate (a resend arriving twice shouldn't apply twice)
- detect gaps (useful for diagnostics, and for deciding when a full resync is warranted)

```csharp
if (command.sequenceNumber <= lastAppliedSequenceNumberFor[command.originClientId])
    return; // already applied, ignore

lastAppliedSequenceNumberFor[command.originClientId] = command.sequenceNumber;
CommandProcessor.Apply(world, command);
```

### Client-side prediction for commands

The same predict-then-reconcile idea from Part 1 applies here too, just at the command level instead of the movement level:

1. When the local player issues a command (place an item, open a door), apply it locally immediately for responsiveness, and keep it in an "unacknowledged" list.
2. Send the command to the server.
3. The server validates, applies it authoritatively, and eventually the client receives confirmation (either an explicit ack, or a full state resync that supersedes local prediction).
4. On resync, discard acknowledged commands from the pending list and re-apply only the still-unacknowledged ones on top of the authoritative state — same replay pattern as movement prediction.

The difference from continuous state: because commands are deterministic and idempotent-once-deduplicated, replaying them after a resync reproduces the exact same result rather than an approximation, so there's no visible "correction" the way there can be with physics-based movement.

### Full-state resync as a fallback

However good your command replication is, keep a fallback: the ability to serialize the *entire* shared state and ship it to a client wholesale (on join, after a large gap in acknowledged sequence numbers, or on divergence detection). This is expensive and should be rare — but it's what saves you from ever needing to reason about every possible way an ordered reliable stream could still end up desynced (late joiners, reconnects, bugs). Command replication is the steady-state path; full resync is the recovery path.

```csharp
public byte[] SerializeFullState(WorldState world) { /* ... */ }
public void LoadFullState(WorldState world, byte[] data) { /* ... */ }
```

Chunk this if it can exceed your transport's MTU (typically ~1200–1400 bytes for UDP-based transports before fragmentation risk), and only send it when something has actually changed since the last send — diffing "has anything changed" is cheap even if the payload itself is a full dump (e.g. a dirty flag set by `CommandProcessor.Apply`).

---

## Putting the two paths together

| Concern | Continuous state | Discrete events |
|---|---|---|
| Channel | Unreliable, unordered | Reliable, ordered (or reliable + explicit sequence numbers) |
| Send cadence | Fixed tick rate, always | On occurrence only |
| Client applies as | Interpolated/extrapolated visual state | Deterministic simulation step |
| Local player exception | Predict movement immediately, reconcile on server update | Predict command result immediately, reconcile on ack/resync |
| Recovery from loss | Automatic (next tick supersedes) | Requires de-dup + resend, or full-state resync fallback |
| Bandwidth driver | Tick rate × entity count | Event rate (usually much lower) |

A useful gut-check when adding a new piece of networked data: **"does this change smoothly and continuously, or does it change at discrete moments in response to something happening?"** If you're unsure, ask whether losing one update is harmless (continuous) or corrupts state (discrete) — that answer tells you which path it belongs on.

---

## Common pitfalls

- **Snapping remote entities to the latest packet.** Always interpolate with a small delay buffer instead — see Part 1.
- **Sending world mutations as raw state diffs instead of commands.** You lose the ability to validate authority, replay for prediction, or produce a readable event log.
- **No de-duplication on reliable commands.** Reliable delivery guarantees a message arrives, not that it arrives exactly once from the sender's perspective after retries — always key on a sequence number.
- **Mutating shared state from more than one place.** If UI/input code can bypass the command dispatcher and mutate state directly, client prediction and server authority silently diverge.
- **No fallback full-state resync.** Command replication will eventually miss an edge case (late join, reconnect, a bug). Keep a "nuke and reload full state" path even if it's rarely used.
- **Treating both data types the same for bandwidth budgeting.** Continuous state cost scales with tick rate; discrete events don't — profile them separately.

---

## Checklist for adding a new networked value

- [ ] Decide: continuous state or discrete event?
- [ ] **Continuous:** small fixed-size struct, sent unreliably every tick, consumed via an interpolation buffer on receivers; predicted+reconciled locally if it's the local player's own value.
- [ ] **Discrete:** modeled as a command with a type tag + payload, sent reliably with a sequence number, applied through the single command-dispatch switch on both client and server.
- [ ] Local prediction path added if the value affects the local player's immediate responsiveness.
- [ ] De-duplication in place for anything reliable.
- [ ] Full-state resync path updated if this value is part of the serialized world state.
