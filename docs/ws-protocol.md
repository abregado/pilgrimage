# WebSocket Protocol

All messages are JSON. Server is at `ws[s]://{host}`.

---

## Sequence numbers (client-side prediction reconciliation)

Every gardener-action message from the client carries a monotonically increasing `seq: number` (assigned in `client/js/network.js`, reset on each `connect()`). The server tracks the highest `seq` it has processed per device (accepted or rejected — processing order is guaranteed by per-connection message ordering) and echoes it back as `lastProcessedSeq` on `gardener` in every `state` message, and as `seq` on `error`. The client uses this to know which of its optimistically-applied local predictions have been superseded by the authoritative reply and can be dropped from its pending-replay queue. See `predict.js` / `network.js` for the client side.

---

## Client → Server

### Session

| type      | fields                  | notes |
|-----------|-------------------------|-------|
| `connect` | `deviceId: string`      | First message. Server looks up gardener; sends state (null if new device). |
| `join`    | —                       | Creates new gardener. Only valid after `connect` returned null state. |

### Gardener actions

All gardener-action messages also carry `seq: number` (see "Sequence numbers" above) — omitted from the fields column below since it's universal.

| type                  | fields                          | guards |
|-----------------------|---------------------------------|--------|
| `pot`                 | `potId, seedId\|null`           | Must be `resting`. `seedId` null = clear pot. |
| `decorate`            | `potId`                         | Must be `resting`. Pot must have a seed. |
| `undecorate`          | `potId`                         | Must be `resting`. Must have decorated this pot. |
| `swap`                | `seedId\|null`                  | Must be `resting`. Sets carried seed from location pool. `null` = drop. |
| `walk`                | `pathId`                        | Must be `resting`. Path must connect to current location. |
| `reverse`             | —                               | Must be `walking`. |
| `take_seed`           | `fromId`                        | Must be `walking` or `arriving`. `fromId` = encountered gardener public id. |
| `pick_seed`           | `seedId`                        | Must be `walking` or `arriving`. `seedId` must be in `availableSeeds`. |
| `continue`            | —                               | Must be `arriving`. Moves to `resting`; clears `availableSeeds`. |
| `delete_rule`         | `ruleId`                        | Marks rule as refreshing; starts 60-tick cooldown. |
| `queue_travel`        | `pathIds: string[]`             | Must be `resting`. Validates chain of pathIds from current location; starts first leg immediately, stores rest in `travelQueue`. |
| `dendriport`          | `pathId`                        | Must be `resting`, `energy >= FAST_TRAVEL_COST`. Instant teleport across one path. |
| `dendriport_queue`    | `pathIds: string[]`             | Must be `resting`, `energy >= FAST_TRAVEL_COST`. Validates chain like `queue_travel`; teleports straight to the final destination in one hop. |
| `activate_dendriport` | —                               | Must be `walking`, `energy >= FAST_TRAVEL_COST`. Instantly finishes the current leg plus any queued legs. |
| `delete_pilgrim`      | —                               | Deletes the gardener permanently. Client confirms via `window.confirm` before sending. |
| `poll`                | —                               | No-op; triggers a broadcast (used to force a view refresh). |

---

## Server → Client

| type    | fields                    | notes |
|---------|---------------------------|-------|
| `state` | `data: GardenerView\|null` | `null` = connected but no gardener yet (show join screen). `data.gardener.lastProcessedSeq` is the highest client `seq` the server has processed for this device. Sent on connect and on every successful action — but only to the acting client and other non-walking gardeners at the affected location, not every connected client (see "Action broadcast scoping" below). Walking clients never receive one for a routine movement tick (the client animates locally, see `docs/architecture.md`), but can still get one mid-trip on arrival, an encounter, an energy regen/max change, or a vision change — see `docs/game-loop.md` step 11. |
| `error` | `message: string, seq: number` | Sent when an action returns `{ ok: false }`, to the requesting client only. `seq` identifies which client action was rejected. |

---

## Action broadcast scoping

`broadcast()` in `server/index.js` accepts an optional `Set<deviceId>` filter. On a successful action, the server notifies:

- The acting client, always.
- `pot`, `decorate`, `undecorate`, `swap`, `continue`, `join` (`LOCATION_SCOPED_CURRENT`): also every other non-walking gardener at the resulting location (`nonWalkingDeviceIdsAtLocation` in `server/state.js`).
- `walk`, `queue_travel` (`LOCATION_SCOPED_LEAVE`): also every other non-walking gardener at the location being **left** (captured before the action mutates `locationId`).
- `dendriport`, `dendriport_queue`, `activate_dendriport` (`LOCATION_SCOPED_TELEPORT`): also every other non-walking gardener at **both** the location left and the location arrived at — a Dendriport changes both in the same tick, so both audiences need telling.
- `reverse`, `take_seed`, `pick_seed`, `delete_rule`, `poll`: the acting client only.
- `delete_pilgrim`: full unfiltered broadcast (decorations can span arbitrary locations; rare enough not to bother scoping).

The tick loop (`server/gameLoop.js`) already does the same kind of selective notification for its own events (arrivals, encounters, settling/dead-pot cleanup, energy/rule changes).

---

## Action result pattern

Every action returns `{ ok: true }` or `{ ok: false, error: string }`.

On `ok`:
1. `saveState(state)` — write to disk
2. `broadcast(notifySet)` — push fresh GardenerView to the acting client plus whichever other clients are affected (see "Action broadcast scoping" above)

On failure: send `{ type: 'error', message, seq }` to the requesting client only.
