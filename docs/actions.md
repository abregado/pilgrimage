# Server Actions (`server/actions.js`)

All exported functions take `(deviceId, ...args, state)` and return `{ ok, error? }`.

---

## `createOrRestoreGardener(deviceId, state)`

Called by `join` message handler.

- **Existing gardener**: wakes from sleep (`sleeping` → `resting`), updates `lastActiveTick`.
- **New gardener**: creates full gardener object.
  - Spawns at random location.
  - `seed` set to that location's origin seed.
  - `availableSeeds: null`, `locationMemory: {}`, `travelQueue: []`.
  - `energy = energyMax = BASE_ENERGY_MAX (8)`.
  - `speedBonus = 1.0`.
  - Calls `pickInitialRules(originSeedId)` → 2×L1, 1×L2, 1×L3.
  - `record.wanderings` starts with spawn location.
  - `record.seedLog` initialised with all 15 seeds, all stages `false`.

---

## `pot(deviceId, potId, seedId|null, state)`

Guards: `resting`, at a location, pot exists at that location.

Potting is **instant** — no tending state or duration. Energy is deducted immediately based on the existing pot content's growth stage (`potEnergyCost`, age in ticks since `lastPlantedTick`):

| Existing content                       | Energy cost                |
|-----------------------------------------|-----------------------------|
| Empty / no seed                         | `ENERGY_COST_BASE` (1)      |
| Seed stage (age < 1800)                 | `ENERGY_COST_BASE` (1)      |
| Seedling (1800 ≤ age < 21600)           | `ENERGY_COST_SEEDLING` (2)  |
| Grown (21600 ≤ age < 129600)            | `ENERGY_COST_GROWN` (6)     |
| Fruiting (129600 ≤ age < 172800)        | `ENERGY_COST_FRUITING` (10) |
| Dead (age ≥ 172800)                     | `ENERGY_COST_BASE` (1)      |

The same cost table applies to **both planting and clearing**.

- `seedId = null`: **clears the pot**. Guards: `energy >= cost`. Clears decorators, resets `pot.seedId`, `lastPlantedTick`, `settlingUntil = null`. Deducts energy.
- `seedId` set: validates seed is in the location's nursery pool; requires `energy >= cost`; pot must not be settling.
  - Clears existing pot's decorators.
  - Sets `pot.seedId`, `pot.lastPlantedTick = tick`, `pot.settlingUntil = tick + 120`.
  - Deducts energy. Calls `checkRuleCompletion(gardener, state)` synchronously.

---

## `walk(deviceId, pathId, state)`

Guard: `resting`, at a location, path connects to current location.

Before leaving:
1. Builds nursery seedPool (origin seed + carried seed + grown/fruiting pots + other resting gardeners' seeds here).
2. Stores as `gardener.availableSeeds`.
3. Snapshots `locData.pots.map(p => ({id, seedId, lastPlantedTick}))` into `gardener.locationMemory[locId]`.

Then: sets `pathFrom = locId`, `pathId`, `progress = 0`, `state = 'walking'`, clears `locationId`, clears `encounteredThisTrip`.

There is no `fast` parameter anymore — normal walking is always at base speed (modified by `speedBonus` and completed rules). Instant travel is a separate action family: **Dendriport** (see below).

---

## `reverse(deviceId, state)`

Guard: `walking`.

Flips direction: `progress = path.length - progress`, swaps `pathFrom` to the other end. Also clears `gardener.travelQueue`.

---

## `queueTravel(deviceId, pathIds[], state)`

Guard: `resting`, at a location, `pathIds` is a non-empty array.

Validates that the array of path IDs forms a continuous chain from the gardener's current location. Stores `pathIds.slice(1)` in `gardener.travelQueue`, then calls `walk(deviceId, pathIds[0], state)` to start the first leg immediately. The game loop auto-starts subsequent legs on each intermediate arrival (step 3 of `gameLoop.js`).

---

## Dendriport (instant teleport)

Three actions replace the old persistent "fast travel" flag. Each is a one-shot instant teleport costing `FAST_TRAVEL_COST` (1) energy — there is no speed multiplier and no `gardener.fastTravel`-style flag left set afterward; every use is paid for individually.

All three share an internal `_teleportTo(gardener, destId, state)` helper: it snapshots `locationMemory` for the location being left (same shape as `walk`'s snapshot), pushes `destId` onto `record.wanderings`, and resets the gardener to `resting` at `destId` — clearing `pathId`, `pathFrom`, `progress`, `travelQueue`, `encounteredThisTrip`, `arrivedEncounters`, and `availableSeeds`.

### `dendriport(deviceId, pathId, state)`

Guard: `resting`, at a location, `energy >= FAST_TRAVEL_COST`, path connects to current location.

Teleports directly to the other end of `pathId`. Deducts `FAST_TRAVEL_COST`.

### `dendriportQueue(deviceId, pathIds[], state)`

Guard: `resting`, at a location, non-empty `pathIds`, `energy >= FAST_TRAVEL_COST`.

Validates the chain of `pathIds` connects from the current location (same validation as `queueTravel`), then teleports straight to the **final** destination in one hop — no intermediate legs, and only one `FAST_TRAVEL_COST` charge regardless of how many paths are in the chain.

### `activateDendriport(deviceId, state)`

Guard: `walking`, `energy >= FAST_TRAVEL_COST`.

Instantly finishes the trip: walks the current path plus every path in `gardener.travelQueue` (without regard to `progress`) to compute the final destination, then teleports there. Deducts `FAST_TRAVEL_COST`.

---

## `continuee(deviceId, state)`

Guard: `arriving`.

Sets `state = 'resting'`, clears `arrivedEncounters`, clears `availableSeeds = null`.

---

## `pickSeed(deviceId, seedId, state)`

Guard: `walking` or `arriving`. `seedId` must be in `gardener.availableSeeds`.

Sets `gardener.seed = seedId`. Used by the embarkation picker before walking/dendriporting.

---

## `takeSeed(deviceId, fromId, state)`

Guard: `walking` or `arriving`. `fromId` must be in `encounteredThisTrip` or `arrivedEncounters`.

Copies (not removes) the encountered gardener's seed to `gardener.seed`. Marks seed stage `seed = true` in seedLog.

---

## `swap(deviceId, targetSeedId, state)`

Guard: `resting`. If `targetSeedId` is falsy, drops carried seed. Otherwise validates against location seedPool (origin + all pots regardless of growth stage + others' seeds here). Marks `seed = true` in seedLog.

---

## `decorate(deviceId, potId, state)`

Guard: `resting`. Pot must have a seed. Adds gardener id to `pot.decorators` and potId to `gardener.record.decoratedPots` (idempotent).

---

## `undecorate(deviceId, potId, state)`

Guard: `resting`. Removes gardener id from `pot.decorators` and potId from `decoratedPots`.

---

## `deleteRule(deviceId, ruleId, state)`

Marks rule `deletedTick = tick`, `refreshAt = tick + 60`, clears `safeUntil`. If rule was completed, reduces `speedBonus` by 2%.

---

## `deleteGardener(deviceId, state)`

Handles the `delete_pilgrim` message. Removes the gardener's id from every pot's `decorators` array across all locations, then deletes `state.gardeners[deviceId]` entirely. No confirmation guard server-side — the client confirms via `window.confirm` before sending. Triggers a full unfiltered broadcast (see `docs/ws-protocol.md`).

---

## Nursery seedPool (used in `pot`, `walk`/`dendriport*`, and `swap`)

**`pot` / `walk` / `dendriport`** (strict): origin seed + carried seed + pots with `age >= GROWN_TICKS (21600)` + other **resting** gardeners' seeds.

**`swap`** (loose): origin seed + all planted pots (any age) + other **resting** gardeners' seeds.
