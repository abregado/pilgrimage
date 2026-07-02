# Client Screens (canvas)

All screens are drawn directly to a single full-viewport `<canvas>` — there is no DOM UI. `client/js/render.js → renderFrame(ctx, W, H)` is the single dispatcher, called by the RAF loop in `client/js/canvas/engine.js` whenever `invalidate()` has been called. Every screen module registers clickable/scrollable areas via `hit()` / `hitCircle()` / `beginScrollRegion()` (`client/js/canvas/input.js`); `main.js`'s `dispatch(action, data)` is the single action switch, mirroring the old DOM version's single delegated click handler.

---

## connect.js — `renderConnect(ctx, W, H)`

Shown when `getScreen() === 'connect'` (i.e. `_state === null`).

- Background art + drifting particle effect, card with shimmering "Verdant" title.
- `!getConnected()` → subtitle "Connecting…", no button.
- `getConnected()` → subtitle "Ready to begin" + "Become a Pilgrim" button (`hit(..., 'join')`).

---

## location.js — `renderLocation(ctx, W, H)`

Shown for every other state (`resting`, `walking`, and the instantaneous `arriving` transition — there is no dedicated arrival screen; `network.js` auto-confirms arrival the instant it's observed). Picks a desktop or mobile layout based on `isLandscape()` (`client/js/canvas/layout.js`).

### Desktop (`_renderDesktop`)

Three fixed columns (`getColumns()`), or two on narrow-desktop windows (aspect ratio ≤ 8/9 — the left Vision column folds into the right tab bar as a `vision` tab instead):

1. **Left column** (`renderLeftCol`) — Vision cards, scrollable. Wide desktop only.
2. **Middle column** (`renderMiddleCol`) — pots wheel + drawer + nursery when resting, or the travel scene + controls when walking.
3. **Right column** — a tab bar (`drawTabBar`) over the active tab's content: `map` (`renderMapTab`), `record` (`renderRecordTab`), `info` (`renderInfoTab`), or `vision` (`renderLeftCol`, narrow desktop only). The tab bar also holds the theme toggle (☾/☀).

### Mobile (`_renderMobile`)

Three horizontally-swipeable pages (left col / middle col / tab bar + content), each rendered translated by `(page - i) * W + pageOffset`. Off-screen pages have their hit regions disabled (`disableHits()`/`enableHits()`) so a partially-visible neighboring page can't be clicked. `getMobilePage()`/swipe handling lives in `client/js/canvas/input.js`; page-indicator dots are drawn at the bottom.

### Embark overlay (`_renderEmbarkOverlay`)

Drawn on top of either layout when `getEmbarkingPathId()` is set (after tapping a travel option). A bottom sheet with:
- A seed grid (`state.location.seedPool`, plus "None") to choose what to carry — `select_embark_seed`.
- **Cancel**, **Walk ~{time}** (`embark`), and **⚡ Dendriport** (`embark_dendriport`, instant teleport, disabled if `energy < FAST_TRAVEL_COST`).

---

## left-col.js — `renderLeftCol(ctx, col, state)`

Vision cards, one per active (non-refreshing) rule slot, in a scroll region (`beginScrollRegion('left-col', ...)`).

Each card shows: level badge (L1/L2/L3, colored), required-seed icons, wrapped description, a progress bar (`satisfiedCount / difficulty`), and a footer with the count, a "✓ Here" badge when `satisfiedHere`, a "Complete" badge when `completed`, and — while in the safe period — a `Safe Xh Ym` countdown. A satisfied-but-not-yet-completed card's border pulses toward the accent color.

---

## middle-col.js — `renderMiddleCol(ctx, col, state, travelAnimData)`

### Resting

1. **Energy row** (`_drawEnergyRow`) — pips + `energy/energyMax` + regen countdown.
2. **Pots wheel** (`_drawPotsWheel`) — pots arranged in a circle; each shows its growth-stage sprite, a small seed icon, and decorator dots. Selecting a pot (`select_pot`) highlights it and opens the drawer below.
3. **Pot drawer** (`_drawPotDrawer`) — selected pot's seed name, stage badge, next-stage countdown, settling countdown, decorator count, and (while resting) action buttons: Plant (when a nursery seed is selected and the pot isn't settling), Clear (when no seed is selected and the pot has one), Decorate/Undecorate. Buttons show the energy cost inline and are visually muted when unaffordable.
4. **Nursery grid** (`_drawNurseryGrid`) — scrollable seed grid (`state.location.seedPool` + "None"); tapping selects a seed for planting (`select_nursery_seed`) and pre-fills the carried seed on location change.

### Walking

1. Energy row.
2. **Travel controls** (`_drawTravelControls`) — ↩ Reverse (`reverse`) and ⚡ Dendriport (`activate_dendriport`, instantly finishes the trip; disabled if `energy < FAST_TRAVEL_COST`).
3. **Travel scene** (`_drawTravelScene`) — a quadratic-curve path with a pilgrim sprite animated along it (position driven by `getTravelAnimData()`, which is exported from `location.js` and extrapolates client-side between broadcasts via `startTravelAnim()`/`requestAnimationFrame`; see `docs/architecture.md`).
4. **ETA** (`_drawETA`) — "~{time} remaining", derived from the same extrapolated progress.
5. **Encounters** (`_drawEncounters`) — list of gardeners met this trip, each with a "Take Seed" button (`take_seed`) unless already carrying that seed.

Note: the seed picker is **not** shown during travel. Seed selection happens on the embark overlay before departure (or via `pick_seed` once walking, sent automatically from `network.js` if a seed was chosen on the embark screen).

---

## map-tab.js — `renderMapTab(ctx, bounds, state)`

Right-column tab (also reachable from the mobile swipe pages). Draws a scaled, pannable (`getMapPan()`) world map:

- **Visited locations**: their origin-seed icon (56px), clickable (`select_map_loc`).
- **Adjacent-but-unvisited locations**: small hollow circle, clickable.
- **Paths**: shown if at least one endpoint is visited; a computed route (Dijkstra, `_computeRoute`, restricted to visited+adjacent nodes) is highlighted in the accent color when a destination is selected.
- **Player marker**: pilgrim sprite interpolated along the current path while walking, or an accent ring + "You" label at the current location while resting.
- **Selection tooltip card**: appears above/near the selected node — seed icon + name, visited/new badge, pot-memory dots (forward-simulated from `gardener.locationMemory` using the same growth thresholds as the live view — a pot that's since died is shown as empty, matching the server's non-clearing dead-pot behavior), and — when a route exists and the gardener can currently select (`resting` + at a location) — a "Travel → ~{eta}" button (`queue_travel`).

Clicking empty map background clears the selection (`clear_map_selection`).

---

## record-tab.js — `renderRecordTab(ctx, bounds, state)`

Scrollable. Sections in order:

1. **Age** — `formatAge(record.ageTicks)`.
2. **Energy** — `energy / energyMax` + a 3-item milestone checklist (Day one, One week, Explorer). See `docs/energy.md` for a note on stale bonus labels in this section.
3. **Visions** — `{completed} of {total} completed` + current speed bonus percentage.
4. **Seed Log** — table of all 15 seeds × 5 stages (seed/seedling/grown/fruiting/dead), a filled dot per stage the gardener has observed.
5. **Settings** — Music toggle (`toggle_music`), Theme toggle (`toggle_theme`), and "Delete my Pilgrim…" (`delete_pilgrim`, confirmed client-side via `window.confirm` before sending).

Note: this tab no longer shows the "garden" (top decorated pots) list that the pre-canvas Record screen had.

---

## info-tab.js — `renderInfoTab(ctx, bounds)`

Static, scrollable help text — no server state needed. Sections: What you do, Vision, Seeds & Pots, Energy, Decorating. Content is hard-coded in `SECTIONS`.

---

## Selection / UI state (`client/js/state.js`)

| Variable                  | Cleared when                                              |
|-----------------------------|--------------------------------------------------------------|
| `_selectedNurserySeedId`    | location changes (pre-filled to carried seed) or `setState(null)` |
| `_selectedPotId`            | location changes or `setState(null)`                        |
| `_selectedMapLocId`         | tab changes away from `map`                                 |
| `_embarkingPathId` / `_embarkChosenSeed` / `_embarkingPathIds` | `cancel_embark`, or on `embark`/`embark_dendriport` dispatch |
| `_pendingPickSeed`          | consumed once `walking` state arrives from the server        |
| `_journeyLog`                | on arrival confirm / `continue`                              |
