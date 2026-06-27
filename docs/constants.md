# Constants (`server/constants.js`)

All values in ticks (1 tick = 1 second) unless noted.

## Timing

| Constant              | Value   | Meaning                                      |
|-----------------------|---------|----------------------------------------------|
| `TICK_RATE`           | 1000 ms | setInterval period                           |
| `MOVEMENT_SPEED`      | 100     | Metres per tick (base; modified by speedBonus + rules) |
| `SETTLING_DURATION`   | 120     | Ticks a pot cannot be replanted after planting |
| `SLEEP_THRESHOLD`     | 21600   | Ticks inactive before gardener sleeps (6 h)  |
| `ENERGY_REGEN_TICKS`  | 60      | 1 energy restored per this many ticks (1 min)|
| `RULE_REFRESH_TICKS`  | 60      | Cooldown after deleting a vision rule (1 min) |

## Plant growth thresholds (age in ticks)

| Constant        | Value    | Stage begins  | Real time   |
|-----------------|----------|---------------|-------------|
| `SEEDLING_TICKS`| 1800     | seedling      | 30 min      |
| `GROWN_TICKS`   | 21600    | grown         | 6 h         |
| `FRUITING_TICKS`| 604800   | fruiting      | 1 week      |
| `DEAD_TICKS`    | 2592000  | dead (wiped)  | ~30 days    |

## Tending durations (replacing old content)

| Constant               | Value  | Applied when existing content is… |
|------------------------|--------|-----------------------------------|
| `POT_EMPTY_DURATION`   | 1      | empty                             |
| `POT_SEED_DURATION`    | 60     | seed stage (age < 1800)           |
| `POT_SEEDLING_DURATION`| 1200   | seedling (age < 21600)            |
| `POT_GROWN_DURATION`   | 3600   | grown (age < 604800)              |
| `POT_FRUITING_DURATION`| 18000  | fruiting (age < 2592000)          |
| `POT_DEAD_DURATION`    | 1      | dead                              |

## Energy

| Constant          | Value | Meaning                        |
|-------------------|-------|--------------------------------|
| `BASE_ENERGY_MAX` | 3     | Starting energy max            |
| `ENERGY_COST_PLANT`| 1    | Energy spent per `pot` action  |

## Rules / speed

| Constant              | Value | Meaning                                      |
|-----------------------|-------|----------------------------------------------|
| `INITIAL_RULE_SLOTS`  | 4     | Vision slots per gardener                    |
| `SPEED_BONUS_PER_RULE`| 0.10  | Additional speed multiplier per completed rule (stacks additively in movement formula) |

### Speed formula

```
progress += MOVEMENT_SPEED × speedBonus × (1 + completedRules × SPEED_BONUS_PER_RULE)
```

`speedBonus` starts at 1.0 and is multiplied by 1.02 each time a rule is completed. If a completed rule is deleted, it is divided by 1.02.
