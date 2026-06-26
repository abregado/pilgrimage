# Refactor Plan — Verdant Design Update

This document covers all code changes required to implement the updated design in `plan-gardeners.md`. Changes are ordered so that each phase can be committed independently without leaving the game in a broken state.

---

## Cross-cutting issues to resolve first

Before touching any feature, three structural problems need addressing:

**1. Hardcoded `MOVEMENT_SPEED = 16` on the client.**
`client/js/screens/path.js:31` and `client/js/screens/location.js:137` both hardcode the value `16` instead of importing a constant. The server should send precomputed ETAs in the view, or expose the constant via a shared module. The simplest fix: include `movementSpeed` in the GardenerView and remove the client-side constant.

**2. Duplicate static data files.**
`server/seeds.js` and `client/js/seeds.js` are byte-for-byte identical. Same for `server/world.js` / `client/js/world.js`. Any field added to one must be added to the other. This duplication should be acknowledged but is not worth resolving in this refactor — just note that every change to these files must be applied twice.

**3. State schema migration.**
The persisted `server/data/state.json` will be incompatible after this refactor (renamed fields, new fields, different pot counts). Add a `version: number` field to the top-level state object. In `server/persistence.js`, after loading, check the version and run a migration function before the game loop starts. Start at version 1; the migration to version 2 covers everything in this refactor. The safest option is simply to wipe and rebuild the state when the version doesn't match, since there are no long-lived player records worth preserving yet.

**4. `the_nursery` naming collision.**
The location called "The Nursery" (`the_nursery`) shares a name with the new Nursery mechanic. In code, name the mechanic's seed pool `seedPool` (not `nursery`) in the server state and view objects, and "Nursery" only in the client UI label. This avoids confusion in `actions.js` and `state.js` where location IDs and concept names appear together.

---

## Phase 1 — Remove Singers and Cherished Pots; add Decorations

These two changes are tightly coupled and should land together.

### `server/state.js`

- In every `PotObject`, rename `singers: string[]` to `decorators: string[]`.
- In every `GardenerObject.record`, rename `singerPots: string[]` to `decoratedPots: string[]`.
- In `seedLog` entries, remove the `cherished` boolean field entirely.
- Delete the `getCherishedPot(locationId)` function.
- In `getGardenerView`, update pot view:
  - `singerCount` → `decoratorCount` (length of `pot.decorators`)
  - `iAmSinger` → `iDecorated` (whether this pilgrim's public ID is in `pot.decorators`)
  - Remove `isCherished` from the pot view entirely.
- In `getGardenerView`, update `record.garden`: it currently finds pots where `iAmSinger` is true. Change to pots where `iDecorated` is true. Rename the result field from `garden` to whatever fits (keep `garden` for UI consistency).

### `server/actions.js`

- Rename `sing(deviceId, potId, state)` to `decorate(deviceId, potId, state)`.
- Inside `decorate`: change all `pot.singers` references to `pot.decorators`, and `record.singerPots` to `record.decoratedPots`.
- The toggle logic (remove from other pots at this location, add to target) stays the same — a Pilgrim can only have one Decoration per pot but multiple pots across locations.
- In `pot(deviceId, potId, state)`:
  - Remove the `getCherishedPot` check and the early return that blocks planting in the cherished pot.
  - Remove the line that clears `pot.singers` when a new seed is planted (it cleared singers on the displaced seed's pot). With Decorations, decorators remain across replants — confirm this is the intended behaviour. If decorators should clear on replant, clear `pot.decorators = []` instead.

### `server/gameLoop.js`

- Remove the `cherished` update in `updateSeedLogOnArrival` (the part that marks `log.cherished = true`).
- Remove any import of `getCherishedPot`.

### `server/index.js`

- In the WebSocket dispatch table, rename `'sing'` → `'decorate'` and point it at `actions.decorate`.

### `client/js/main.js`

- Change the `data-action="sing"` case to `data-action="decorate"` and send `{ type: 'decorate', potId }`.

### `client/js/screens/location.js`

- Remove the "Cherished" badge from pot cards.
- Remove the `!isCherished` guard on the "Place Seed" button.
- Rename "Singing" badge to "Decorated".
- Change the Sing button to a Decorate button (`data-action="decorate"`).
- Use `pot.decoratorCount` and `pot.iDecorated` instead of `singerCount`/`iAmSinger`.

### `client/js/screens/record.js`

- Remove the `Cherish` badge from the Seed Log grid (the `log-cherished` lit state).
- In the Garden section, update references from `singerCount`/`other singers` to `decoratorCount`/`other decorators` (or similar UI label).

---

## Phase 2 — Pots per Location: 3 → 6–9

### `server/world.js` and `client/js/world.js`

Add a `potCount` field to each Location entry. Values must be between 6 and 9 and should vary to give each place its own character. A reasonable starting set (adjust during playtesting):

| Location | Pots |
|---|---|
| The Glasshouse | 7 |
| The Fernery | 6 |
| The Bogwood | 8 |
| The Terrace | 6 |
| The Coldhouse | 7 |
| The Nursery | 9 |
| The Orchard | 8 |
| The Salt Flats | 6 |
| The Cutting Garden | 7 |
| The Walled Garden | 9 |
| The Thicket | 7 |
| The Undercroft | 8 |
| The Canopy | 9 |
| The Still Pool | 6 |
| The Seedbank | 7 |

Apply the same table to both files.

### `server/state.js`

In `makeFreshLocations()`, replace the hardcoded `for (let i = 0; i < 3; i++)` loop with `for (let i = 0; i < loc.potCount; i++)`. `LOCATION_MAP` must be imported from `world.js` if it isn't already.

### `client/js/screens/location.js`

The pot grid CSS must accommodate up to 9 cards. Change the pot grid to use `grid-template-columns: repeat(auto-fill, minmax(Xpx, 1fr))` or a fixed 3-column layout — confirm with a visual check at 9 pots.

### State migration

The existing `state.json` has 3 pots per location. The version-2 migration must rebuild all locations from scratch (calling `makeFreshLocations()`), discarding existing pot state. Gardener `decoratedPots` arrays must also be cleared since all pot IDs change.

---

## Phase 3 — Energy System

### `server/constants.js`

Add:
```js
export const BASE_ENERGY_MAX = 3;
export const ENERGY_COST_PLANT = 1;
```

### `server/state.js`

- Add `energy: number` and `energyMax: number` to `GardenerObject`. Set both to `BASE_ENERGY_MAX` on creation.
- Add a helper `computeEnergyMax(gardener, state)` that sums:
  - `BASE_ENERGY_MAX`
  - `+1` if `(state.tick - gardener.createdTick) >= 86400` (1 day in ticks)
  - `+1` if `(state.tick - gardener.createdTick) >= 604800` (1 week)
  - `+1` if all 15 locations appear in `gardener.record.wanderings`
  - `+1` per completed Rule (added in Phase 5)
- Call `computeEnergyMax` whenever the view is built, and also sync `gardener.energyMax` in the game loop so energy doesn't permanently exceed the cap if milestones change.
- In `getGardenerView`, expose `energy` and `energyMax` on the gardener object.

### `server/actions.js`

In `pot(deviceId, potId, state)`:
- Add an energy check: `if (gardener.energy < ENERGY_COST_PLANT) return { ok: false, error: 'Not enough energy' }`.
- Deduct energy: `gardener.energy -= ENERGY_COST_PLANT` on a successful plant.

### `server/gameLoop.js`

Decide on an energy regeneration model (the design doc does not specify one yet — options: slow passive regen per tick, or a fixed regen interval). Placeholder: add one energy per N ticks when below `energyMax`. Leave `N` as a constant `ENERGY_REGEN_TICKS` to be tuned. This step can be skipped until the regen rate is decided and simply cap energy at max for now.

### `client/js/screens/location.js`

Add an energy display to the carry/action bar area: `Energy: X / Y`. Grey out or hide the "Place Seed" button when `energy === 0`.

### `client/js/screens/record.js`

Add an Energy section to the record showing current/max and which milestones have been unlocked.

---

## Phase 4 — Nursery and Planting Changes

### `server/state.js`

In `getGardenerView`, add a `seedPool: string[]` field to the location view. Build it as:
```
dedupe([
  location's origin seedId,
  ...all non-null pot seedIds at this location,
  ...seedIds of all other pilgrims currently resting/tending at this location,
])
```
Use `seedPool` (not `nursery`) as the field name to avoid collision with the `the_nursery` location ID.

### `server/actions.js`

- **Planting no longer removes the carried seed.** In `pot()`, delete the line `gardener.seed = null`. The pilgrim keeps their seed after planting.
- The `TENDING_DURATION` was previously 60 ticks; the plan sets it to 1 tick (1 second). Update the constant in `server/constants.js` to `export const TENDING_DURATION = 1`.
- Add a new `swap(deviceId, targetSeedId, state)` action:
  - Validate the pilgrim is resting at a location.
  - Validate `targetSeedId` is present in the location's `seedPool` (compute the same pool inline).
  - Set `gardener.seed = targetSeedId`.
  - Return `{ ok: true }`.
- Remove the `takeOrigin` and `undoTake` actions (replaced by `swap` from the pool, which always includes the origin seed). If an undo-swap grace period is wanted later, add it then.

### `server/index.js`

- Remove `take_origin` and `undo_take` from the dispatch table.
- Add `swap` → `actions.swap`.

### `client/js/main.js`

- Remove `take_origin` and `undo_take` cases.
- Add a `swap` case: send `{ type: 'swap', seedId }`.

### `client/js/screens/location.js`

- Remove the "Take Origin Seed" button and "Undo Take" button.
- Add a **Seed Pool** UI section (labelled "Nursery" in the UI) showing the `seedPool` seeds as selectable items. Clicking one sends `{ type: 'swap', seedId }`.
- The "Place Seed" button on a pot plants whatever seed the pilgrim is currently carrying into that pot. Since the pilgrim keeps their seed, the carry bar should remain visible and unchanged after planting.

---

## Phase 5 — Growth Stages

### `server/constants.js`

Add growth-stage tick thresholds (placeholder values — tune during playtesting):
```js
export const SEEDLING_TICKS = 300;    // 5 minutes
export const GROWN_TICKS    = 1800;   // 30 minutes
export const FRUITING_TICKS = 7200;   // 2 hours
export const DEAD_TICKS     = 21600;  // 6 hours
```

### `server/state.js`

- Add `lastPlantedTick: number | null` to every `PotObject`. Set to `null` for empty pots and to the current tick when a seed is planted.
- In `getGardenerView`, include `lastPlantedTick` on each pot in the view. The client computes the visual stage from this value and the current `tick` (also in the view).

### `server/actions.js`

In `pot()`, set `potObj.lastPlantedTick = state.tick` after placing the seed.

### `server/gameLoop.js`

After the settling-expiry step, add a **dead-pot step**: for each pot where `lastPlantedTick !== null` and `(tick - lastPlantedTick) >= DEAD_TICKS`, clear the pot: `seedId = null`, `lastPlantedTick = null`, `decorators = []`, `settlingUntil = null`.

### `client/js/screens/location.js`

Add a `getGrowthStage(lastPlantedTick, currentTick)` helper that returns `'seed' | 'seedling' | 'grown' | 'fruiting' | 'dead'` (or `null` for empty). Render the appropriate image and label per pot card. The pot card should use a `<img>` pointing to `/assets/<seedId>_<stage>.png`.

### `client/js/seeds.js` and `server/seeds.js`

Add a `stages` field (or descriptions) per seed for each growth stage — five text strings per seed (Seed, Seedling, Grown, Fruiting, Dead descriptions). This can be added as a follow-up once copy is written; stub with empty strings for now.

### Assets

Each of the 15 seeds needs 5 PNG files in `./assets/`:
```
<seedId>_seed.png
<seedId>_seedling.png
<seedId>_grown.png
<seedId>_fruiting.png
<seedId>_dead.png
```
The existing assets cover only the base seed icon. The 4 new stages per seed (60 new images total) are a content task separate from the code.

---

## Phase 6 — Rules and Vision

This is the most complex new system. It can be scoped into two sub-phases: data model + display first, rule evaluation second.

### Data model

**Rule object** (stored on the gardener):
```js
{
  id: string,           // stable identifier for this rule instance
  templateId: string,   // which rule template this is
  difficulty: number,   // 1, 2, or 3 — locations needed for completion
  description: string,  // human-readable
  completed: boolean,
  deletedTick: number | null,   // set when deleted; null when active
  refreshAt: number | null,     // tick when a new rule arrives (after deletion)
}
```

**Rule templates** live in a new file `server/rules.js` (and a copy in `client/js/rules.js`). Each template defines a `check(pots, seeds)` function that returns `true` if the arrangement at a location satisfies it, plus `id`, `description`, and `difficulty`. Start with a small set of hand-authored rules for balance passes.

**Gardener additions:**
- `rules: Rule[]` — the current rule slots (active + refreshing).
- `ruleSlots: number` — starts at 2; increases by 1 per completed rule.
- `speedBonus: number` — starts at 1.0; increases by 0.02 per completed rule.

### `server/constants.js`

```js
export const INITIAL_RULE_SLOTS  = 2;
export const RULE_REFRESH_TICKS  = 60;
```

### `server/state.js`

- Add `rules`, `ruleSlots`, `speedBonus` to `GardenerObject`.
- In `getGardenerView`, include `rules` and expose per-rule:
  - `description`, `difficulty`, `completed`
  - `satisfiedCount` — how many of the pilgrim's visited locations currently satisfy this rule (computed by running `template.check` against each visited location's current pots).
  - `refreshAt` (if the slot is refreshing after deletion).

### `server/gameLoop.js`

Add a **rules step** each tick:
1. For each active (non-refreshing) rule on each pilgrim, recount how many visited locations satisfy it (call `template.check` per location).
2. If `satisfiedCount >= rule.difficulty` and `!rule.completed`, mark `rule.completed = true`, increment `gardener.energyMax`, and multiply `gardener.speedBonus *= 1.02`.
3. For each refreshing slot where `tick >= refreshAt`, assign a new random rule from the template pool (excluding rules already held).

`MOVEMENT_SPEED` in the game loop should multiply by `gardener.speedBonus` when computing how far a walking pilgrim moves per tick.

### `server/actions.js`

Add a `deleteRule(deviceId, ruleId, state)` action:
- Find the rule by ID on the gardener.
- Set `rule.deletedTick = state.tick`, `rule.refreshAt = state.tick + RULE_REFRESH_TICKS`.
- If the rule was completed, decrement `gardener.energyMax` and divide `gardener.speedBonus / 1.02`.

### `server/index.js`

Add `delete_rule` → `actions.deleteRule` to the dispatch table.

### `client/js/main.js`

Add a `delete_rule` case: send `{ type: 'delete_rule', ruleId }`.

### `client/js/screens/record.js`

Add a **Vision** section to the Record screen:
- For each rule slot: show description, difficulty, satisfied count, and a Delete button (`data-action="delete_rule"`, `data-rule-id`).
- For refreshing slots: show a countdown from `refreshAt - currentTick` instead of a rule.

### `client/js/screens/location.js`

Add a **Vision widget** below the Pots grid on the Location tab:
- Show each active rule.
- Highlight rules where `satisfiedCount >= difficulty` at the current location specifically (not total — re-evaluate against current location pots client-side using the rule template, or add a `satisfiedHere: boolean` flag to the per-rule view).

---

## Phase 7 — Map and Navigation

### `client/js/screens/map.js`

**Click to walk:**
- Add `data-action="walk"` and `data-path-id` to each location circle that is reachable from the pilgrim's current location. To find the right path: filter `getPathsForLocation(loc.id)` for the path whose other end matches the pilgrim's `locationId`. Only add the action if the pilgrim is `resting` and the location is adjacent.

**Hover — name and origin seed symbol:**
- Add a `mouseover` / `mouseleave` listener to the SVG (delegated, matching `[data-loc-id]` elements).
- On hover, show a floating label (a `<div>` positioned outside the SVG) with the location name if visited, or a "?" if not visited.
- For visited locations, also show the origin seed symbol. Add a `symbol` (Unicode character or short label) field to each seed in `seeds.js`; the map reads this from `SEED_MAP[originSeedId].symbol`.
- On `mouseleave`, hide the label.

**Larger text:**
- Increase the font-size of location name labels (CSS class `map-label`). The current inline `font-size: 11px` on "You" label should also increase.
- Show location name labels only for the current location by default; other visited locations show names only on hover (not permanently rendered as text elements in the SVG).

### `client/js/main.js`

The `walk` case already exists and sends `{ type: 'walk', pathId }`. No changes needed there — the map will now emit the same action, just from a different UI element.

---

## Phase 8 — Here Now: Meeples

Replace every place where a Pilgrim or encounter is rendered as a raw ID string with a meeple shape.

**Meeple colours by state:**
```
resting  → green
tending  → amber
walking  → blue
sleeping → grey
```

Define a `renderMeeple(state)` helper in a new `client/js/meeple.js` that returns an SVG or HTML snippet for the given state colour.

### `server/state.js`

In `getGardenerView`, `otherGardeners` currently exposes `{id, seed}`. Add `state` to each entry so the client can colour meeples correctly. Do not expose the device ID — the public `id` (short hex) is already the only ID sent; the design says don't show it to other players, so simply omit the `id` field from `otherGardeners` in the view, or keep it for internal use but don't render it.

### `client/js/screens/location.js`

In the "Here now" widget, replace each `g.id` text label with a `renderMeeple(g.state)` shape. Remove any text showing the ID.

### `client/js/screens/path.js`

In the encounter list, replace `enc.id` text with `renderMeeple(enc.state)`. Add `state` to encounter objects in the view if not already present.

### `client/js/screens/arrival.js`

Same as path.js: replace `enc.id` text with a meeple.

---

## Suggested implementation order

1. Phase 1 — Singers → Decorations + remove Cherished (no new mechanics, safest first)
2. Phase 2 — Pot count change + migration (infrastructure, needed before anything else grows pots)
3. Phase 3 — Energy system (enables Phase 4 to work correctly)
4. Phase 4 — Nursery + planting changes (replaces old take-origin flow)
5. Phase 7 — Map click and hover (self-contained UI, no server changes)
6. Phase 8 — Meeples (self-contained UI)
7. Phase 5 — Growth stages (requires new assets to be visible; code can land before art)
8. Phase 6 — Rules and Vision (largest scope, depends on energy being live)
