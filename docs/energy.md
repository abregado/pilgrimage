# Energy System

Energy is the resource that gates planting, clearing, and Dendriport teleporting. This document covers how it is spent, regenerated, and how the maximum grows over time.

---

## Constants (`server/constants.js`)

| Constant               | Value | Meaning                                      |
|------------------------|-------|----------------------------------------------|
| `BASE_ENERGY_MAX`      | 8     | Starting maximum energy for a new gardener   |
| `ENERGY_REGEN_TICKS`   | 300   | Ticks between each +1 regen (5 min)          |
| `ENERGY_BONUS_TIME`    | 1     | +max per time milestone (day, week)          |
| `ENERGY_BONUS_EXPLORE` | 1     | +max for visiting all 15 locations           |
| `ENERGY_BONUS_RULE`    | 1     | +max per completed, non-deleted vision rule  |
| `FAST_TRAVEL_COST`     | 1     | Energy per Dendriport teleport               |
| `ENERGY_COST_BASE`     | 1     | Plant/clear cost: empty, dead, or seed-stage |
| `ENERGY_COST_SEEDLING` | 2     | Plant/clear cost: seedling-stage pot         |
| `ENERGY_COST_GROWN`    | 6     | Plant/clear cost: grown-stage pot            |
| `ENERGY_COST_FRUITING` | 10    | Plant/clear cost: fruiting-stage pot         |

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

Regen fires for all gardeners regardless of state (resting, walking, arriving, sleeping). Unlike routine walking-progress ticks, an energyMax change or a regen tick does add a gardener to that tick's `notifySet` — so a walking gardener can occasionally receive a state update mid-trip for this reason (see `docs/game-loop.md`, step 11).

### `energyRegenAt` (client countdown)

`getGardenerView` computes the tick of the next regen boundary:

```js
energyRegenAt = (Math.floor(tick / ENERGY_REGEN_TICKS) + 1) * ENERGY_REGEN_TICKS
```

This is `null` when the gardener is already at max. The client uses it (via `client/js/clock.js`) to extrapolate a live countdown between broadcasts, shown on the energy bar.

---

## Spending Energy

### Potting (`server/actions.js → pot`)

Planting a seed into a pot or clearing a pot both cost energy based on the **current growth stage of the pot being acted on** (age in ticks since `lastPlantedTick`):

| Pot state                          | Cost                          |
|-------------------------------------|--------------------------------|
| Empty / no seed                     | `ENERGY_COST_BASE` (1)         |
| Seed stage (age < 1800)             | `ENERGY_COST_BASE` (1)         |
| Seedling (1800 ≤ age < 21600)       | `ENERGY_COST_SEEDLING` (2)     |
| Grown (21600 ≤ age < 129600)        | `ENERGY_COST_GROWN` (6)        |
| Fruiting (129600 ≤ age < 172800)    | `ENERGY_COST_FRUITING` (10)    |
| Dead (age ≥ 172800)                 | `ENERGY_COST_BASE` (1)         |

The cost is computed by `potEnergyCost(potObj, tick)` in `server/actions.js`, mirrored client-side by `potEnergyCost(pot, tick)` in `client/js/growth.js` (used for button labels, disabled state, and optimistic prediction in `client/js/predict.js`). The action guard rejects the request if `gardener.energy < cost`.

### Dendriport (`server/actions.js → dendriport` / `dendriportQueue` / `activateDendriport`)

Dendriport is an instant teleport (see `docs/actions.md`), not a speed boost. Each of the three Dendriport actions costs a flat `FAST_TRAVEL_COST` (1) energy, deducted at the moment of the teleport:

- **`dendriport`** — from resting, teleport across one path.
- **`dendriportQueue`** — from resting, teleport straight to the end of a multi-leg route (one charge regardless of route length).
- **`activateDendriport`** — mid-walk, instantly finish the current leg plus any queued legs.

Nothing persists on the gardener afterward — there is no flag equivalent to the old `gardener.fastTravel`. Each use is a standalone charge.

---

## Initial Energy

New gardeners are created with `energy = BASE_ENERGY_MAX` (`createOrRestoreGardener` in `server/actions.js`). There is no grace period or starting boost beyond the base maximum.

---

## Client Display

### Energy bar (`client/js/canvas/screens/middle-col.js → _drawEnergyRow`)

Drawn at the top of the middle column in both resting and walking states:
- One pip per `energyMax`, filled pips up to `energy`.
- `energy / energyMax` numeric label.
- Regen countdown: "+1 in Xm Ys" derived from `energyRegenAt - liveTick()`, hidden when full.

### Pot drawer (`client/js/canvas/screens/middle-col.js → _drawPotDrawer`)

Plant and clear buttons show the energy cost inline (e.g. "Plant Mirewort · 2 energy", "Clear · 6 energy") and render with a muted fill when `gardener.energy < cost` (the hit region is still registered — the server guard is authoritative). The client computes the cost with the same `potEnergyCost` logic as the server (`client/js/growth.js`).

### Embark overlay (`client/js/canvas/screens/location.js → _renderEmbarkOverlay`)

The "⚡ Dendriport" button in the embark sheet is enabled only when `gardener.energy >= FAST_TRAVEL_COST`.

### Travel controls (`client/js/canvas/screens/middle-col.js → _drawTravelControls`)

The "⚡ Dendriport" button shown while walking (finishes the trip instantly) is enabled only when `gardener.energy >= FAST_TRAVEL_COST`.

### Record tab (`client/js/canvas/screens/record-tab.js`)

Shows current `energy / energyMax` and a milestone checklist. Note: the checklist only lists three items (Day one, One week, Explorer) — the per-completed-rule bonus is not shown as a separate checklist row, only reflected implicitly in the displayed `energyMax`. The bonus labels currently shown in this UI ("+3 max energy", "+5 max energy") are stale display text left over from an earlier balance pass; the actual bonus per milestone is `+1` (`ENERGY_BONUS_TIME` / `ENERGY_BONUS_EXPLORE`, see constants table above).

---

## Files Involved

| File                                              | Role                                                          |
|-----------------------------------------------------|-----------------------------------------------------------------|
| `server/constants.js`                             | All energy constants (single source of truth)                |
| `server/state.js`                                 | `computeEnergyMax()`, `energyRegenAt` calculation in `getGardenerView` |
| `server/gameLoop.js`                              | Step 7: regen tick, energyMax sync, energy clamping          |
| `server/actions.js`                               | `pot` (plant/clear cost), `dendriport` / `dendriportQueue` / `activateDendriport` (teleport cost), `createOrRestoreGardener` (initial energy) |
| `client/js/growth.js`                             | Mirrors `potEnergyCost` for the client                        |
| `client/js/predict.js`                            | Optimistic energy deduction on predicted `pot` actions        |
| `client/js/clock.js`                              | Live countdown extrapolation between broadcasts               |
| `client/js/canvas/screens/middle-col.js`          | Energy bar, pot button costs, travel Dendriport button        |
| `client/js/canvas/screens/location.js`            | Embark overlay Dendriport button                               |
| `client/js/canvas/screens/record-tab.js`          | Milestone display                                              |
