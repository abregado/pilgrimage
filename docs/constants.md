# Constants (`server/constants.js`)

All values in ticks (1 tick = 1 second) unless noted.

## Timing

| Constant              | Value   | Meaning                                      |
|-----------------------|---------|----------------------------------------------|
| `TICK_RATE`           | 1000 ms | setInterval period                           |
| `MOVEMENT_SPEED`      | 3       | Metres per tick (base; modified by speedBonus + rules) |
| `SETTLING_DURATION`   | 120     | Ticks a pot cannot be replanted after planting |
| `SLEEP_THRESHOLD`     | 21600   | Ticks inactive before gardener sleeps (6 h)  |
| `ENERGY_REGEN_TICKS`  | 300     | 1 energy restored per this many ticks (5 min) |
| `RULE_REFRESH_TICKS`  | 60      | Cooldown after deleting a vision rule (1 min) |
| `RULE_SAFE_TIME`      | 86400   | Ticks a completed rule is protected after completion (24 h) |

## Plant growth thresholds (age in ticks)

| Constant        | Value    | Stage begins  | Real time   |
|-----------------|----------|---------------|-------------|
| `SEEDLING_TICKS`| 1800     | seedling      | 30 min      |
| `GROWN_TICKS`   | 21600    | grown         | 6 h         |
| `FRUITING_TICKS`| 129600   | fruiting      | 36 h        |
| `DEAD_TICKS`    | 172800   | dead (wiped)  | 48 h        |

## Energy

| Constant               | Value | Meaning                                          |
|------------------------|-------|--------------------------------------------------|
| `BASE_ENERGY_MAX`      | 8     | Starting energy max                              |
| `ENERGY_BONUS_TIME`    | 1     | +1 max energy per time milestone (day, week)     |
| `ENERGY_BONUS_EXPLORE` | 1     | +1 max energy for visiting all 15 locations      |
| `ENERGY_BONUS_RULE`    | 1     | +1 max energy per completed non-deleted rule     |
| `ENERGY_REGEN_TICKS`   | 300   | 1 energy restored every 5 minutes                |
| `ENERGY_COST_BASE`     | 1     | Energy cost: empty / dead / seed-stage pot       |
| `ENERGY_COST_SEEDLING` | 2     | Energy cost: seedling pot                        |
| `ENERGY_COST_GROWN`    | 6     | Energy cost: grown pot                           |
| `ENERGY_COST_FRUITING` | 10    | Energy cost: fruiting pot                        |

Energy cost applies to both **planting** and **clearing**. Potting is now instant — no tending duration or blocked state.

### energyMax milestones (computed in `state.js`)

- Base: 8
- +1 after 1 day (`age >= 86400` ticks)
- +1 after 1 week (`age >= 604800` ticks)
- +1 if all 15 locations visited
- +1 per completed, non-deleted vision rule

## Rules / speed

| Constant                | Value | Meaning                                                |
|-------------------------|-------|--------------------------------------------------------|
| `INITIAL_RULE_SLOTS`    | 4     | Vision slots per gardener                              |
| `SPEED_BONUS_PER_RULE`  | 0.25  | +25% per completed rule (additive in movement formula) |
| `SPEED_BONUS_FULL_VISION`| 1.0  | +100% when all 4 rules are completed simultaneously    |

## Fast travel

| Constant            | Value | Meaning                                           |
|---------------------|-------|---------------------------------------------------|
| `FAST_TRAVEL_COST`  | 1     | Energy cost to activate fast travel               |
| `FAST_TRAVEL_MULTI` | 200   | Speed multiplier applied while fast travel active |

### Speed formula

```
progress += MOVEMENT_SPEED × speedBonus × (1 + completedRules × SPEED_BONUS_PER_RULE + fullVisionBonus)
```

`speedBonus` starts at 1.0 and is multiplied by 1.02 each time a rule is completed. If a completed rule is deleted or un-completes after safe period, it is divided by 1.02.

`fullVisionBonus` is 1.0 when all 4 rule slots are simultaneously completed, otherwise 0.
