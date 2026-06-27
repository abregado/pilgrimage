# Client Screens

All screens read from `client/js/state.js` and write HTML into `#app` (full replacement). The single click handler is in `main.js`; all screens use `data-action` attributes on buttons.

---

## connect.js — `renderConnect(app)`

Shown when `_screen === 'connect'` (i.e. `_state === null`).

- `!getConnected()` → title + "Connecting…" subtitle.
- `getConnected()` → title + "Become a Pilgrim" button (`data-action="join"`).

---

## location.js — `renderLocation(app)`

Shown when `_screen === 'location'` (covers `resting`, `tending`, `sleeping`, **and `walking`** states).

Contains a tab bar (Location / Map / Record). The `_tab` variable controls which sub-view renders. All three tabs are accessible while walking.

### Tab: Location — walking state

When `gardener.state === 'walking'` the Location tab shows the travel view:

1. **Header** — "Travelling to {destination}".
2. **SVG travel path** — curvy dotted brown line with X endpoints; a meeple (head circle + upward triangle body + direction arrow) animates smoothly along the curve. The SVG has `id="travel-path-svg"` and the meeple group has `id="travel-meeple"`. The `startTravelAnim(path, speed, speedBonus, rulesSpeedBonus)` exported function drives a `requestAnimationFrame` loop that updates the meeple transform and the `id="travel-eta"` ETA div without re-rendering the screen.
3. **Seed picker** — nursery-style 64px buttons with "Which seed do you wish to carry with you into {destination}?" prompt.
4. **Reverse Direction** button.
5. **Encounters list** with "Take Seed" buttons.

### Tab: Location — resting/tending state

Sections rendered in order:

1. **Population row** — meeple icons for all gardeners at this location.
2. **Header** — location name + energy pips.
3. **Tending status** — if `gardener.state === 'tending'`, shows countdown.
4. **Pots wheel** — circular layout (84×84px squares, 50% larger than old 56px circles). Selecting a pot reveals the centre panel with plant info and action buttons. Each occupied pot shows the plant image (square, uncropped) with a 32px seed SVG icon overlaid at the bottom centre (`class="pot-seed-overlay"`). Decorations (`.dec-dot`) only visible on the selected pot. Selected pot gets a yellow bottom border; its seed overlay gets a yellow outline. Action buttons show tending duration: `Plant Mirewort (20m)`, `Clear (5h)`.
5. **Nursery** — seed grid; clicking selects a seed for planting.
6. **Vision** — active rules as cards.
7. **Travel** — paths to adjacent locations with visited-destination symbol + pot memory strip.
8. **Other gardeners here** — meeple + seed icon row.

### Tab: Map / Record

Delegate to `renderMap` and `renderRecord` respectively.

---

## arrival.js — `renderArrival(app)`

Shown when `_screen === 'arrival'` (gardener is `arriving`).

- Location name.
- **Core seed icon** — 96px SVG icon of the location's home seed, always shown.
- **Seed picker** — nursery-style with "Which seed do you wish to carry with you into {name}?" prompt.
- Encounters on the journey with "Take Seed" buttons.
- **Journey log** — locations visited this session (from `getJourneyLog()`).
- **Ahead** — queued future destinations derived from `gardener.travelQueue`.
- "Continue to {location}" button.

---

## map.js — `renderMap(container, state)`

Called from `renderLocation` when tab is 'map'. Not a standalone screen. Accessible while walking.

- Renders an SVG world map.
- **Visited locations**: `<image href="/assets/seed_{id}.svg" width="32" height="32">` SVG elements. Walkable ones have `data-action="select_map_loc"` directly on the `<image>` (the image is the only clickable element — the location name label is not).
- **Unvisited adjacent locations**: `<circle>` element. Walkable ones are interactive.
- **Route highlighting**: when a destination is selected, the Dijkstra route paths are drawn in yellow (`.map-path.route`) on top of the standard grey paths.
- **You marker**: filled accent circle + "You" label.
- **Tooltip**: hover over any `[data-loc-id]` element shows the location name.
- Selected walkable location: "Travel to {name} · ~{time}" button fires `queue_travel`.
- **Bottom widget**: when a visited location is selected, shows its home seed icon (64px) + last-seen pot memory strip.

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
