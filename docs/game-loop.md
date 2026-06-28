# Game Loop (`server/gameLoop.js`)

Runs every 1000ms via `setInterval`. Each tick:

---

## Step 1 — Increment tick

`state.tick++`

---

## Step 2 — Advance walkers

For every `walking` gardener:

```
progress += MOVEMENT_SPEED (100) × speedBonus × (1 + completedRules × 0.10 + fullVisionBonus)
```

`completedRules` = count of non-deleted completed vision rules.  
`fullVisionBonus` = 1.0 if all 4 rule slots are simultaneously completed, otherwise 0.

---

## Step 3 — Arrival check

For every `walking` gardener whose `progress >= path.length`:

- Appends `destId` to `record.wanderings`.
- **If `travelQueue` has a valid next path from `destId`**: shift it off the queue, snapshot seeds and locationMemory at the intermediate location, start walking the next leg immediately (stays `walking` state). The client receives a state update for this leg transition.
- **Otherwise**: sets `state = 'arriving'`, `locationId = destId`. Moves `encounteredThisTrip` to `arrivedEncounters`. Clears `pathId`, `pathFrom`, `progress = 0`.

In both cases the arriving gardener's `deviceId` is added to `notifySet` so they receive a state update.

---

## Step 4 — Encounters

Two walkers on the same path, heading in **opposite directions**, cross when their combined absolute positions sum to approximately the path length (within a 2×MOVEMENT_SPEED window). Each records the other in `encounteredThisTrip` (idempotent). Seed stage `seed = true` is marked in each other's seedLog. Both gardeners' deviceIds are added to `notifySet`.

---

## Step 5 — Settling expiry + dead-pot cleanup

- Pots whose `settlingUntil <= tick`: clear `settlingUntil`.
- Pots whose `age >= DEAD_TICKS (2592000)`:
  - Mark `dead = true` in seedLog of any resting gardener at that location.
  - Clear `seedId`, `lastPlantedTick`, `decorators`, `settlingUntil`.

---

## Step 6 — Seed stage observation

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

## Step 7 — Energy regen + energyMax sync

- Recompute `energyMax` for every gardener (using `computeEnergyMax`); clamp `energy` if needed.
- Every `ENERGY_REGEN_TICKS (1200)` ticks: `energy += 1` for all under-max gardeners.

---

## Step 8 — Vision (rules)

For each gardener's active rules (not deleted):

1. **Refresh**: slots where `deletedTick !== null && tick >= refreshAt` → replace with `pickNewRuleForLevel(level, existingRules)`.
2. **Safe-period skip**: rules where `safeUntil !== null && safeUntil > tick` are skipped.
3. **Evaluate**: count how many of the gardener's unique visited locations satisfy `template.check(pots, tick)`.
   - `check` now requires plants to be at minimum stage: L2 checks require SEEDLING+, L3 checks require GROWN+.
4. **Newly completed** (`count >= difficulty && !wasCompleted`):
   - Set `completed = true`, `safeUntil = tick + RULE_SAFE_TIME` (24 h).
   - `speedBonus *= 1.02`.
   - If this completes all active rules: set `safeUntil = tick + RULE_SAFE_TIME * 3` (72 h) for all active rules.
5. **Un-completed** (`count < difficulty && wasCompleted`):
   - Safe period expired and conditions no longer met.
   - Set `completed = false`, `safeUntil = null`, `speedBonus /= 1.02`.
6. **Renewed** (`count >= difficulty && wasCompleted`): set `safeUntil = tick + RULE_SAFE_TIME` (renew 24 h protection).

---

## Step 9 — Sleep check

Any `resting` gardener whose `lastActiveTick + 21600 < tick` → `sleeping`.

---

## Step 10 — Persist

If any `changed` flag was set: `saveState(state)`.

---

## Step 11 — Selective broadcast

`broadcast(notifySet)` sends a fresh `GardenerView` only to clients in `notifySet`.

`notifySet` is built each tick:
- All **non-walking** gardeners are always included (energy regen, rule changes, etc.).
- **Walking** gardeners are only added when something meaningful happens to them: arrival (step 3), encounter (step 4), or rule completion (step 8).

This means walking clients receive no network traffic for routine progress ticks — the client animates the meeple locally using `requestAnimationFrame` with `startTravelAnim()` exported from `location.js`.

Action-triggered broadcasts (player clicks) still call `broadcast()` with no filter → all clients updated.
