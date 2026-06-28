# Energy System

Energy is the resource that gates planting, clearing, and fast travel. This document covers how it is spent, regenerated, and how the maximum grows over time.

---

## Constants (`server/constants.js`)

| Constant               | Value | Meaning                                      |
|------------------------|-------|----------------------------------------------|
| `BASE_ENERGY_MAX`      | 8     | Starting maximum energy for a new gardener   |
| `ENERGY_REGEN_TICKS`   | 1000  | Ticks between each +1 regen (~16.7 min)      |
| `ENERGY_BONUS_TIME`    | 1     | +max per time milestone (day, week)          |
| `ENERGY_BONUS_EXPLORE` | 1     | +max for visiting all 15 locations           |
| `ENERGY_BONUS_RULE`    | 1     | +max per completed, non-deleted vision rule  |
| `FAST_TRAVEL_COST`     | 2     | Energy to activate fast travel               |
| `ENERGY_COST_BASE`     | 1     | Plant/clear cost: empty, dead, or seed-stage |
| `ENERGY_COST_SEEDLING` | 2     | Plant/clear cost: seedling-stage pot         |
| `ENERGY_COST_GROWN`    | 10    | Plant/clear cost: grown-stage pot            |
| `ENERGY_COST_FRUITING` | 12    | Plant/clear cost: fruiting-stage pot         |

---

## Energy Maximum (`server/state.js → computeEnergyMax`)

`energyMax` is recomputed from scratch on every relevant event:

```
energyMax = BASE_ENERGY_MAX (8)
          + ENERGY_BONUS_TIME  if age >= 86400  ticks (1 day)
          + ENERGY_BONUS_TIME  if age >= 604800 ticks (1 week)
          + ENERGY_BONUS_EXPLORE if all 15 locations have been visited
          + ENERGY_BONUS_RULE × (count of completed, non-deleted vision rules)
```

`age` is `state.tick - gardener.createdTick`.

The maximum is rechecked every tick in the game loop (step 7) and also synchronously inside `getGardenerView` before broadcasting. If `energyMax` drops (e.g. a completed rule is deleted), `energy` is immediately clamped down to the new maximum.

---

## Regeneration (`server/gameLoop.js` step 7)

Every tick the game loop:

1. Recomputes `energyMax` for every gardener and clamps `energy` if needed.
2. Checks `state.tick % ENERGY_REGEN_TICKS === 0`. When true, every gardener below their max gains +1 energy.

Regen fires for all gardeners regardless of state (resting, walking, arriving, sleeping).

### `energyRegenAt` (client countdown)

`getGardenerView` computes the tick of the next regen boundary:

```js
energyRegenAt = (Math.floor(tick / ENERGY_REGEN_TICKS) + 1) * ENERGY_REGEN_TICKS
```

This is `null` when the gardener is already at max. The client uses it to show a live countdown on the energy bar.

---

## Spending Energy

### Potting (`server/actions.js → pot`)

Planting a seed into a pot or clearing a pot both cost energy based on the **current growth stage of the pot being acted on**:

| Pot state                      | Cost                   |
|-------------------------------|------------------------|
| Empty / dead / seed stage      | `ENERGY_COST_BASE` (1) |
| Seedling stage                 | `ENERGY_COST_SEEDLING` (2) |
| Grown stage                    | `ENERGY_COST_GROWN` (10) |
| Fruiting stage                 | `ENERGY_COST_FRUITING` (12) |

The cost is computed by `potEnergyCost(potObj, tick)` in both `server/actions.js` and `client/js/screens/location.js` (for button labels and disabled state). The action guard rejects the request if `gardener.energy < cost`.

### Fast Travel (`server/actions.js → walk` / `activateFastTravel`)

Fast travel costs `FAST_TRAVEL_COST` (2) energy and can be activated two ways:

- **At embark** (`walk` action with `fast: true`, or `queue_travel` with `fast: true`): energy is deducted inside `walk()` before the gardener starts moving. Fails if `energy < FAST_TRAVEL_COST`.
- **Mid-travel** (`activate_fast_travel` action): deducts energy from a walking gardener. Fails if already active or insufficient energy.

`gardener.fastTravel` is set to `true` in both cases and resets to `false` whenever the gardener takes any resting action (potting, swapping seed, decorating, undecorating).

---

## Initial Energy

New gardeners are created with `energy = BASE_ENERGY_MAX` (`createOrRestoreGardener` in `server/actions.js`). There is no grace period or starting boost beyond the base maximum.

---

## Client Display

### Energy bar (`client/js/screens/location.js → renderEnergyBar`)

Shown at the top of the Location tab (both resting and walking states):
- One pip per `energyMax`, filled pips up to `energy`.
- `energy / energyMax` numeric label.
- Regen countdown: "+1 in Xm Ys" derived from `energyRegenAt - tick`, hidden when full.

### Pot buttons (`client/js/screens/location.js`)

Plant and clear buttons show the energy cost inline (e.g. "Plant Mirewort · 2 energy") and are `disabled` when `gardener.energy < cost`. The client computes the cost with the same `potEnergyCost` logic as the server.

### Embark picker (`client/js/screens/location.js`)

The "⚡ Fast →" embark button shows the fast-travel time estimate and the `FAST_TRAVEL_COST` label. It is `disabled` when `gardener.energy < FAST_TRAVEL_COST`.

### Record tab (`client/js/screens/record.js`)

Shows current `energy / energyMax` and a milestone checklist:

| Milestone      | Condition                        | Bonus         |
|----------------|----------------------------------|---------------|
| Day one        | `ageTicks >= 86400`              | +1 max energy |
| One week       | `ageTicks >= 604800`             | +1 max energy |
| Explorer       | All 15 locations visited         | +1 max energy |
| Per rule       | Each completed non-deleted rule  | +1 max energy |

---

## Files Involved

| File                                    | Role                                                          |
|-----------------------------------------|---------------------------------------------------------------|
| `server/constants.js`                   | All energy constants (single source of truth)                |
| `server/state.js`                       | `computeEnergyMax()`, `energyRegenAt` calculation in `getGardenerView` |
| `server/gameLoop.js`                    | Step 7: regen tick, energyMax sync, energy clamping          |
| `server/actions.js`                     | `pot` (plant/clear cost), `walk` / `activateFastTravel` (fast travel cost), `createOrRestoreGardener` (initial energy) |
| `client/js/screens/location.js`         | Energy bar, pot button costs/disabled state, embark fast button |
| `client/js/screens/record.js`           | Milestone display                                             |
