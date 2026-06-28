# Server Actions (`server/actions.js`)

All exported functions take `(deviceId, ...args, state)` and return `{ ok, error? }`.

---

## `createOrRestoreGardener(deviceId, state)`

Called by `join` message handler.

- **Existing gardener**: wakes from sleep (`sleeping` → `resting`), updates `lastActiveTick`.
- **New gardener**: creates full gardener object.
  - Spawns at random location.
  - `seed` set to that location's origin seed.
  - `availableSeeds: null`, `locationMemory: {}`.
  - `energy = energyMax = BASE_ENERGY_MAX (10)`.
  - `speedBonus = 1.0`.
  - Calls `pickInitialRules(originSeedId)` → 2×L1, 1×L2, 1×L3.
  - `record.wanderings` starts with spawn location.
  - `record.seedLog` initialised with all 15 seeds, all stages `false`.

---

## `pot(deviceId, potId, seedId|null, state)`

Guards: `resting`, at a location, pot exists at that location.

Potting is **instant** — no tending state or duration. Energy is deducted immediately based on the existing pot content's growth stage:

| Existing content          | Energy cost |
|---------------------------|-------------|
| Empty / seed / dead       | 1           |
| Seedling (age < 21600)    | 3           |
| Grown (age < 604800)      | 8           |
| Fruiting (age < 2592000)  | 12          |

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
1. Builds nursery seedPool (origin seed + carried + grown pots + other resting gardeners' seeds here).
2. Stores as `gardener.availableSeeds`.
3. Snapshots `locData.pots.map(p => ({id, seedId}))` into `gardener.locationMemory[locId]`.

Then: clears `locationId`, sets `pathId`, `pathFrom`, `progress = 0`, `state = 'walking'`, clears `encounteredThisTrip`.

---

## `reverse(deviceId, state)`

Guard: `walking`.

Flips direction: `progress = path.length - progress`, swaps `pathFrom` to the other end. Also clears `gardener.travelQueue`.

---

## `queueTravel(deviceId, pathIds[], state)`

Guard: `resting`, at a location, `pathIds` is a non-empty array.

Validates that the array of path IDs forms a continuous chain from the gardener's current location. Stores `pathIds.slice(1)` in `gardener.travelQueue`, then calls `walk(deviceId, pathIds[0], state)` to start the first leg immediately. The game loop auto-starts subsequent legs on each intermediate arrival (step 3).

---

## `continuee(deviceId, state)`

Guard: `arriving`.

Sets `state = 'resting'`, clears `arrivedEncounters`, clears `availableSeeds = null`.

---

## `pickSeed(deviceId, seedId, state)`

Guard: `walking` or `arriving`. `seedId` must be in `gardener.availableSeeds`.

Sets `gardener.seed = seedId`. Used by the embarkation screen before walking.

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

## Nursery seedPool (used in `pot` and `swap`)

**`pot`** (strict): origin seed + carried seed + pots with `age >= GROWN_TICKS (21600)` + other **resting** gardeners' seeds.

**`swap`** (loose): origin seed + all planted pots (any age) + other **resting** gardeners' seeds.
