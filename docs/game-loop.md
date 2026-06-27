# Game Loop (`server/gameLoop.js`)

Runs every 1000ms via `setInterval`. Each tick:

---

## Step 1 — Increment tick

`state.tick++`

---

## Step 2 — Advance walkers

For every `walking` gardener:

```
progress += MOVEMENT_SPEED (100) × speedBonus × (1 + completedRules × 0.10)
```

`completedRules` = count of non-deleted completed vision rules.

---

## Step 3 — Arrival check

For every `walking` gardener whose `progress >= path.length`:

- Sets `state = 'arriving'`, `locationId = destId`.
- Moves `encounteredThisTrip` to `arrivedEncounters`.
- Appends `destId` to `record.wanderings`.
- Clears `pathId`, `pathFrom`, `progress = 0`.

---

## Step 4 — Encounters

Two walkers on the same path, heading in **opposite directions**, cross when their combined absolute positions sum to approximately the path length (within a 2×MOVEMENT_SPEED window). Each records the other in `encounteredThisTrip` (idempotent). Seed stage `seed = true` is marked in each other's seedLog.

---

## Step 5 — Tending expiry

`tending` gardeners whose `tendingUntil <= tick` → `resting`, `tendingUntil = null`.

---

## Step 6 — Settling expiry + dead-pot cleanup

- Pots whose `settlingUntil <= tick`: clear `settlingUntil`.
- Pots whose `age >= DEAD_TICKS (2592000)`:
  - Mark `dead = true` in seedLog of any resting gardener at that location.
  - Clear `seedId`, `lastPlantedTick`, `decorators`, `settlingUntil`.

---

## Step 7 — Seed stage observation

For every `resting` gardener at a location: scan all pots. For each pot with a seed, derive its growth stage. If the gardener hasn't seen that stage yet, mark it true in `seedLog[seedId][stage]`.

Growth stage thresholds (age in ticks):

| Stage    | Age range             |
|----------|-----------------------|
| seed     | 0 – 1799              |
| seedling | 1800 – 21599          |
| grown    | 21600 – 604799        |
| fruiting | 604800 – 2591999      |
| dead     | ≥ 2592000 (then wiped)|

---

## Step 8 — Energy regen + energyMax sync

- Recompute `energyMax` for every gardener; clamp `energy` if needed.
- Every `ENERGY_REGEN_TICKS (60)` ticks: `energy += 1` for all under-max gardeners.

---

## Step 9 — Vision (rules)

1. **Refresh**: slots where `deletedTick !== null && tick >= refreshAt` → replace with `pickNewRuleForLevel(level, existingRules)`.
2. **Completion**: for each active, incomplete rule, count how many of the gardener's unique visited locations satisfy `template.check(pots)`. If `count >= difficulty`, mark `completed = true`, apply `speedBonus *= 1.02`.

---

## Step 10 — Sleep check

Any `resting` gardener whose `lastActiveTick + 21600 < tick` → `sleeping`.

---

## Step 11 — Persist

If any `changed` flag was set: `saveState(state)`.

---

## Step 12 — Broadcast

`broadcast()` sends a fresh `GardenerView` to every connected client regardless of whether anything changed.
