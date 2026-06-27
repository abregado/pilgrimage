# Client Screens

All screens read from `client/js/state.js` and write HTML into `#app` (full replacement). The single click handler is in `main.js`; all screens use `data-action` attributes on buttons.

---

## connect.js — `renderConnect(app)`

Shown when `_screen === 'connect'` (i.e. `_state === null`).

- `!getConnected()` → title + "Connecting…" subtitle.
- `getConnected()` → title + "Become a Pilgrim" button (`data-action="join"`).

---

## location.js — `renderLocation(app)`

Shown when `_screen === 'location'` (gardener is `resting`, `tending`, or `sleeping`).

Contains a tab bar (Location / Map / Record). The `_tab` variable controls which sub-view renders.

### Tab: Location

Sections rendered in order:

1. **Population row** — meeple icons for all gardeners at this location.
2. **Header** — location name + energy pips.
3. **Tending status** — if `gardener.state === 'tending'`, shows countdown.
4. **Pots wheel** — circular SVG-positioned layout of all pots; selecting a pot reveals centre panel with plant info and plant/clear/decorate actions.
5. **Nursery** — seed grid showing `location.seedPool`; clicking selects a seed for planting (`data-action="select_nursery_seed"`). Selected seed highlighted in accent colour.
6. **Vision** — active rules as cards showing progress bar and "Refresh" on completed rules.
7. **Travel** — paths to adjacent locations:
   - Unvisited destination: name + `<span class="badge-new">new</span>`.
   - Visited destination: origin seed symbol (coloured) + name + pot memory strip (coloured dots from `gardener.locationMemory[destId]`).
8. **Other gardeners here** — meeple + seed icon row.

### Tab: Map

Delegates to `renderMap(container, state)` in `map.js`.

### Tab: Record

Delegates to `renderRecord(container, state)` in `record.js`.

---

## path.js — `renderPath(app)`

Shown when `_screen === 'path'` (gardener is `walking`).

- Header: "From → To"
- Progress bar with ETA.
- **Seed picker** — shows `gardener.availableSeeds` as chip buttons. Currently carried seed is highlighted + disabled. Clicking another fires `pick_seed`. Hidden if `availableSeeds` is null or empty.
- Reverse button.
- Encounters list with "Take Seed" button.

---

## arrival.js — `renderArrival(app)`

Shown when `_screen === 'arrival'` (gardener is `arriving`).

- Arrival location name.
- **Seed picker** — same as path.js, above encounters.
- Encounters on the journey with "Take Seed" buttons.
- "Continue to {location}" button (`data-action="continue"`).

---

## map.js — `renderMap(container, state)`

Called from `renderLocation` when tab is 'map'. Not a standalone screen.

- Renders an SVG world map.
- **Visited locations**: `<text>` element with origin seed symbol (font-size 22, seed colour). Walkable ones have `data-action="select_map_loc"`.
- **Unvisited adjacent locations**: `<circle>` element. Walkable ones are interactive.
- **You marker**: filled accent circle + "You" label at current position (or interpolated along path when walking).
- **Tooltip**: hover shows seed symbol + name for visited; name only for unvisited adjacent.
- Selected walkable location shows a "Travel to X" button below the SVG.

---

## record.js — `renderRecord(container, state)`

Rendered within the location screen's Record tab.

- Age, speed bonus.
- Energy milestones.
- Wanderings log.
- Seed log table (15 seeds × 5 stages).
- Garden (top 3 most-decorated active pots).

---

## Selection state (client/js/state.js)

| Variable               | Cleared when                          |
|------------------------|---------------------------------------|
| `_selectedNurserySeedId` | location changes or `setState(null)` |
| `_selectedPotId`        | location changes or `setState(null)` |
| `_selectedMapLocId`     | tab changes away from map             |
| `_selectedMapPathId`    | tab changes away from map             |
