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
  - `energy = energyMax = BASE_ENERGY_MAX (3)`.
  - `speedBonus = 1.0`.
  - Calls `pickInitialRules(originSeedId)` → 2×L1, 1×L2, 1×L3.
  - `record.wanderings` starts with spawn location.
  - `record.seedLog` initialised with all 15 seeds, all stages `false`.

---

## `pot(deviceId, potId, seedId|null, state)`

Guards: `resting`, at a location, pot exists at that location.

- `seedId = null`: clears the pot (resets `seedId`, `lastPlantedTick`, `decorators`, `settlingUntil`).
- `seedId` set: validates seed is in the location's nursery pool; requires `energy >= 1`; pot must not be settling.
  - Computes tending duration from **existing** pot content's growth stage (see table below).
  - Clears existing pot's decorators (removes from all gardener records).
  - Sets `pot.seedId`, `pot.lastPlantedTick = tick`, `pot.settlingUntil = tick + 120`.
  - Deducts 1 energy. Sets gardener to `tending`, `tendingUntil = tick + duration`.

### Tending duration by existing content stage

| Existing content     | Duration (ticks) |
|----------------------|-----------------|
| Empty                | 1               |
| Seed (< 1800 ticks)  | 60              |
| Seedling (< 21600)   | 1200            |
| Grown (< 604800)     | 3600            |
| Fruiting (< 2592000) | 18000           |
| Dead                 | 1               |

---

## `walk(deviceId, pathId, state)`

Guard: `resting`, at a location, path connects to current location.

Before leaving:
1. Builds nursery seedPool (origin seed + carried + grown pots + other gardeners' seeds here).
2. Stores as `gardener.availableSeeds`.
3. Snapshots `locData.pots.map(p => ({id, seedId}))` into `gardener.locationMemory[locId]`.

Then: clears `locationId`, sets `pathId`, `pathFrom`, `progress = 0`, `state = 'walking'`, clears `encounteredThisTrip`.

---

## `reverse(deviceId, state)`

Guard: `walking`.

Flips direction: `progress = path.length - progress`, swaps `pathFrom` to the other end.

---

## `continuee(deviceId, state)`

Guard: `arriving`.

Sets `state = 'resting'`, clears `arrivedEncounters`, clears `availableSeeds = null`.

---

## `pickSeed(deviceId, seedId, state)`

Guard: `walking` or `arriving`. `seedId` must be in `gardener.availableSeeds`.

Sets `gardener.seed = seedId`.

---

## `takeSeed(deviceId, fromId, state)`

Guard: `walking` or `arriving`. `fromId` must be in `encounteredThisTrip` or `arrivedEncounters`.

Copies (not removes) the encountered gardener's seed to `gardener.seed`. Marks seed stage `seed = true` in seedLog.

---

## `swap(deviceId, targetSeedId, state)`

Guard: `resting`. If `targetSeedId` is falsy, drops carried seed. Otherwise validates against location seedPool (origin + all pots regardless of growth stage + others' seeds here). Marks `seed = true` in seedLog.

---

## `decorate(deviceId, potId, state)`

Guard: `resting` or `tending`. Pot must have a seed. Adds gardener id to `pot.decorators` and potId to `gardener.record.decoratedPots` (idempotent).

---

## `undecorate(deviceId, potId, state)`

Guard: `resting` or `tending`. Removes gardener id from `pot.decorators` and potId from `decoratedPots`.

---

## `deleteRule(deviceId, ruleId, state)`

Marks rule `deletedTick = tick`, `refreshAt = tick + 60`. If rule was completed, reduces `speedBonus` by 2%.

---

## Nursery seedPool (used in `pot` and `swap`)

**`pot`** (strict): origin seed + carried seed + pots with `age >= GROWN_TICKS (21600)` + other resting/tending gardeners' seeds.

**`swap`** (loose): origin seed + all planted pots (any age) + other resting/tending gardeners' seeds.
