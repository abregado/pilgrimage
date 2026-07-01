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

| type          | fields                          | guards |
|---------------|---------------------------------|--------|
| `pot`         | `potId, seedId\|null`           | Must be `resting`. `seedId` null = clear pot. |
| `decorate`    | `potId`                         | Must be `resting` or `tending`. Pot must have a seed. |
| `undecorate`  | `potId`                         | Must be `resting` or `tending`. Must have decorated this pot. |
| `swap`        | `seedId\|null`                  | Must be `resting`. Sets carried seed from location pool. `null` = drop. |
| `walk`        | `pathId`                        | Must be `resting`. Path must connect to current location. |
| `reverse`     | —                               | Must be `walking`. |
| `take_seed`   | `fromId`                        | Must be `walking` or `arriving`. `fromId` = encountered gardener public id. |
| `pick_seed`   | `seedId`                        | Must be `walking` or `arriving`. `seedId` must be in `availableSeeds`. |
| `continue`    | —                               | Must be `arriving`. Moves to `resting`; clears `availableSeeds`. |
| `delete_rule` | `ruleId`                        | Marks rule as refreshing; starts 60-tick cooldown. |
| `queue_travel`| `pathIds: string[]`             | Must be `resting`. Validates chain of pathIds from current location; starts first leg immediately, stores rest in `travelQueue`. |
| `poll`        | —                               | No-op; triggers a broadcast (used to force a view refresh). |

---

## Server → Client

| type    | fields                    | notes |
|---------|---------------------------|-------|
| `state` | `data: GardenerView\|null` | `null` = connected but no gardener yet (show join screen). `data.gardener.lastProcessedSeq` is the highest client `seq` the server has processed for this device. Sent on connect and on every successful action — but only to the acting client and other non-walking gardeners at the affected location, not every connected client (see "Action broadcast scoping" below). During walking, only sent on arrival, encounter, or rule completion — not on every progress tick (client animates locally). |
| `error` | `message: string, seq: number` | Sent when an action returns `{ ok: false }`, to the requesting client only. `seq` identifies which client action was rejected. |

---

## Action broadcast scoping

`broadcast()` in `server/index.js` accepts an optional `Set<deviceId>` filter. On a successful action, the server notifies:

- The acting client, always.
- `pot`, `decorate`, `undecorate`, `swap`, `continue`, `join`: also every other non-walking gardener at the resulting location (`nonWalkingDeviceIdsAtLocation` in `server/state.js`).
- `walk`, `queue_travel`: also every other non-walking gardener at the location being **left** (captured before the action mutates `locationId`).
- `reverse`, `take_seed`, `pick_seed`, `delete_rule`, `activate_fast_travel`, `poll`: the acting client only.
- `delete_pilgrim`: full unfiltered broadcast (decorations can span arbitrary locations; rare enough not to bother scoping).

The tick loop (`server/gameLoop.js`) already does the same kind of selective notification for its own events (arrivals, encounters, settling/dead-pot cleanup, energy/rule changes).

---

## Action result pattern

Every action returns `{ ok: true }` or `{ ok: false, error: string }`.

On `ok`:
1. `saveState(state)` — write to disk
2. `broadcast(notifySet)` — push fresh GardenerView to the acting client plus whichever other clients are affected (see "Action broadcast scoping" above)

On failure: send `{ type: 'error', message, seq }` to the requesting client only.
