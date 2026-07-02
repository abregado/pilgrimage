# Game Loop (`server/gameLoop.js`)

Runs every 1000ms via `setInterval`. Each tick:

---

## Step 1 — Increment tick

`state.tick++`

---

## Step 2 — Advance walkers

For every `walking` gardener:

```
progress += MOVEMENT_SPEED (3) × speedBonus × (1 + completedRules × 0.25 + fullVisionBonus)
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

## Step 5 — Settling expiry + dead-pot marking

- Pots whose `settlingUntil <= tick`: clear `settlingUntil`.
- Pots whose `age >= DEAD_TICKS (172800)`: mark `dead = true` in the seedLog of any resting gardener at that location (once, when the flag transitions from unset).

Dead plants are **left in place** — they are never auto-cleared. A dead pot still holds its `seedId`/`lastPlantedTick`; `potEnergyCost` treats it as `ENERGY_COST_BASE` (see `docs/energy.md`), and the client (`getGrowthStage`) renders it with the `_dead` sprite. Only re-planting or clearing it (via `pot`) actually empties it.

---

## Step 6 — Seed stage observation

For every `resting` gardener at a location: scan all pots. For each pot with a seed, derive its growth stage. If the gardener hasn't seen that stage yet, mark it true in `seedLog[seedId][stage]`.

Growth stage thresholds (age in ticks):

| Stage    | Age range             |
|----------|-----------------------|
| seed     | 0 – 1799              |
| seedling | 1800 – 21599          |
| grown    | 21600 – 129599        |
| fruiting | 129600 – 172799       |
| dead     | ≥ 172800              |

---

## Step 7 — Energy regen + energyMax sync

- Recompute `energyMax` for every gardener (using `computeEnergyMax`); clamp `energy` if needed.
- Every `ENERGY_REGEN_TICKS (300)` ticks: `energy += 1` for all under-max gardeners.

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

`notifySet` is built each tick from whichever steps actually changed something for that gardener — there's no blanket "always include non-walking gardeners" rule. In practice:
- Steps 5 (settling/dead-pot) and 6 (seed stage observation) only ever add **non-walking** gardeners, since they're scoped to gardeners physically at a location.
- Steps 7 (energy regen/energyMax sync), 8 (rule refresh/completion/un-completion), and 9 (sleep) run over **all** gardeners regardless of state — so a walking gardener can occasionally get a state update mid-trip when their energy regenerates, their vision changes, or they fall asleep (sleep only applies to `resting`, so in practice this one never fires for a walker).
- Steps 3 (arrival) and 4 (encounter) add the specific gardener(s) involved.

The net effect: walking clients receive no network traffic for *routine progress ticks* (step 2 never adds to `notifySet`), but they aren't fully silent either — the client animates the meeple locally using `requestAnimationFrame` via `startTravelAnim()` (`client/js/canvas/screens/location.js`) regardless of whether a broadcast lands mid-trip.

Action-triggered broadcasts (player clicks) still call `broadcast()` with no filter → all clients updated.
