# Constants (`server/constants.js`)

All values in ticks (1 tick = 1 second) unless noted.

## Timing

| Constant              | Value   | Meaning                                      |
|-----------------------|---------|----------------------------------------------|
| `TICK_RATE`           | 1000 ms | setInterval period                           |
| `MOVEMENT_SPEED`      | 100     | Metres per tick (base; modified by speedBonus + rules) |
| `SETTLING_DURATION`   | 120     | Ticks a pot cannot be replanted after planting |
| `SLEEP_THRESHOLD`     | 21600   | Ticks inactive before gardener sleeps (6 h)  |
| `ENERGY_REGEN_TICKS`  | 1200    | 1 energy restored per this many ticks (20 min)|
| `RULE_REFRESH_TICKS`  | 60      | Cooldown after deleting a vision rule (1 min) |
| `RULE_SAFE_TIME`      | 86400   | Ticks a completed rule is protected after completion (24 h) |

## Plant growth thresholds (age in ticks)

| Constant        | Value    | Stage begins  | Real time   |
|-----------------|----------|---------------|-------------|
| `SEEDLING_TICKS`| 1800     | seedling      | 30 min      |
| `GROWN_TICKS`   | 21600    | grown         | 6 h         |
| `FRUITING_TICKS`| 604800   | fruiting      | 1 week      |
| `DEAD_TICKS`    | 2592000  | dead (wiped)  | ~30 days    |

## Energy

| Constant               | Value | Meaning                                          |
|------------------------|-------|--------------------------------------------------|
| `BASE_ENERGY_MAX`      | 10    | Starting energy max                              |
| `ENERGY_BONUS_TIME`    | 3     | +3 max energy per time milestone (day, week)     |
| `ENERGY_BONUS_EXPLORE` | 5     | +5 max energy for visiting all 15 locations      |
| `ENERGY_BONUS_RULE`    | 5     | +5 max energy per completed non-deleted rule     |
| `ENERGY_REGEN_TICKS`   | 1200  | 1 energy restored every 20 minutes               |
| `ENERGY_COST_BASE`     | 1     | Energy cost: empty / dead / seed-stage pot       |
| `ENERGY_COST_SEEDLING` | 3     | Energy cost: seedling pot                        |
| `ENERGY_COST_GROWN`    | 8     | Energy cost: grown pot                           |
| `ENERGY_COST_FRUITING` | 12    | Energy cost: fruiting pot                        |

Energy cost applies to both **planting** and **clearing**. Potting is now instant — no tending duration or blocked state.

### energyMax milestones (computed in `state.js`)

- Base: 10
- +3 after 1 day (`age >= 86400` ticks)
- +3 after 1 week (`age >= 604800` ticks)
- +5 if all 15 locations visited
- +5 per completed, non-deleted vision rule

## Rules / speed

| Constant                | Value | Meaning                                                |
|-------------------------|-------|--------------------------------------------------------|
| `INITIAL_RULE_SLOTS`    | 4     | Vision slots per gardener                              |
| `SPEED_BONUS_PER_RULE`  | 0.10  | +10% per completed rule (additive in movement formula) |
| `SPEED_BONUS_FULL_VISION`| 1.0  | +100% when all 4 rules are completed simultaneously    |

### Speed formula

```
progress += MOVEMENT_SPEED × speedBonus × (1 + completedRules × SPEED_BONUS_PER_RULE + fullVisionBonus)
```

`speedBonus` starts at 1.0 and is multiplied by 1.02 each time a rule is completed. If a completed rule is deleted or un-completes after safe period, it is divided by 1.02.

`fullVisionBonus` is 1.0 when all 4 rule slots are simultaneously completed, otherwise 0.
