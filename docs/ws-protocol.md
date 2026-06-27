# WebSocket Protocol

All messages are JSON. Server is at `ws[s]://{host}`.

---

## Client → Server

### Session

| type      | fields                  | notes |
|-----------|-------------------------|-------|
| `connect` | `deviceId: string`      | First message. Server looks up gardener; sends state (null if new device). |
| `join`    | —                       | Creates new gardener. Only valid after `connect` returned null state. |

### Gardener actions

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
| `state` | `data: GardenerView\|null` | `null` = connected but no gardener yet (show join screen). Sent on connect and on every successful action. During walking, only sent on arrival, encounter, or rule completion — not on every progress tick (client animates locally). |
| `error` | `message: string`         | Sent when an action returns `{ ok: false }`. |

---

## Action result pattern

Every action returns `{ ok: true }` or `{ ok: false, error: string }`.

On `ok`:
1. `saveState(state)` — write to disk
2. `broadcast()` — push fresh GardenerView to every connected client

On failure: send `{ type: 'error', message }` to the requesting client only.
