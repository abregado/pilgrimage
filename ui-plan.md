# UI Improvement Plan

Goals: (1) rustic/floral/wooden bonsai-inspired visual theme, (2) dark and light colour schemes, (3) replaceable meeple SVG, (4) travelling screen parallax landscape, (5) single HTML5 canvas rendering with portrait/landscape orientation-based layout switching — three-column desktop (landscape) and swipe-paged mobile (portrait) with separate mouse/touch input models, (6) widget UX improvements throughout.

---

## 1. Visual Theme — Rustic, Floral, Bonsai

### 1a. Plant & seed colour analysis

Before touching any tokens, it's important to understand the existing art — because the UI must serve as a neutral stage for it, not compete with it.

**The pots.** Every plant PNG uses the same pot mould rendered in different glazes:
- Most plants (velour bloom, goldthread, rainfall lily, duskbell, wanderbloom, mirewort): **deep blue-grey glaze** — approximately `#3d4880` to `#4a5588`. This is a classic Japanese bonsai ceramic colour.
- Ironmoss: **dark bronze-charcoal**, approximately `#524030`.
- Empty pot: **cracked dark stone**, approximately `#48484e` with lighter mortar lines.

This matters enormously. The pots are the dominant geometric frame around every plant. A strongly warm-brown UI surface will fight the cool blue-grey glaze. The surfaces must be **dark and near-neutral** so the glazed pots read as the intended focal objects.

**Soil.** Inside every pot: near-black rich soil `#1a1008`–`#2a1810`. This validates very dark surface colours — the art is already comfortable in the dark.

**Moss at the base.** Every grown or fruiting plant has a vivid **chartreuse/yellow-green** moss patch — approximately `#8aaa28`–`#a0c020`. This is much brighter than the muted `--moss` token originally planned. It will need to feel comfortable against whatever background it sits on.

**Stems and trunks.** The goldthread has a prominent warm amber-brown twisted trunk `#8a6030`–`#b08040`. Most plant stems are dark. Dead plants show very dark near-black bark. These warm brown wood tones validate a warm accent vocabulary — but only as accents, not as the surface base.

**Stamens and gold details.** Velour bloom and rainfall lily both have gold-orange stamens `#d4a040`–`#e0a830`. This exactly matches the planned `--accent` gold — good.

**Transparent backgrounds.** All plant PNGs have white/transparent backgrounds. The plant images will float against whatever surface colour is behind them, so the surface must not clash with the blue-grey glazed pots.

**Seed icon circles.** The 15 seed SVGs span almost the full colour wheel:

| Seed | Circle colour | Character |
|---|---|---|
| Velour Bloom | `#7B3F8C` | Deep purple |
| Cinder Fern | `#9E9E9E` | Mid grey |
| Mirewort | `#2E6B3E` | Dark forest green |
| Stonecress | `#BDBDBD` | Pale grey |
| Ember Weed | `#B71C1C` | Crimson |
| Wanderbloom | `#E67E22` | Orange |
| Goldthread | `#F9A825` | Amber |
| Salthorn | `#B0A882` | Sandy tan |
| Rainfall Lily | `#1565C0` | Deep blue |
| Quietbranch | `#78909C` | Blue-grey |
| Thornwhisper | `#B0BEC5` | Pale blue-grey |
| Glassroot | `#4FC3F7` | Sky blue |
| Ironmoss | `#546E7A` | Dark slate |
| Duskbell | `#4527A0` | Deep violet |
| Murmuring Sage | `#90A4AE` | Warm grey-blue |

Note five **light-coloured** seeds — salthorn `#B0A882`, stonecress `#BDBDBD`, thornwhisper `#B0BEC5`, cinder fern `#9E9E9E`, murmuring sage `#90A4AE` — that will have poor contrast against a light parchment surface. These need an explicit `border: 1px solid var(--border)` on their `.seed-icon` container in the light theme, and possibly a very slight shadow. This is noted in the light theme section.

---

### 1b. Colour philosophy

The **bonsai aesthetic** is the anchor. The bonsai visual grammar is: **dark, cool container → warm, living plant**. The UI surface IS the container. Just as the glazed pot recedes to let the plant be the subject, the UI surface should recede to let the plant artwork, seed icons, and player actions be the subject.

This means:
- **Surfaces are dark and near-neutral** — not warm brown. The warmth in the current artwork comes from the *plants and accents*, not from the containing vessel.
- **Warmth arrives through accents** — the gold stamens/goldthread leaves (→ `--accent`), the amber-brown trunks and stems (→ `--clay`), the vivid moss (→ `--moss`).
- **The blue-grey pot glaze becomes a UI token** — `--glaze` — used for selection states on pot-wheel items, creating visual continuity between the physical art and the UI chrome.
- **"Rustic and wooden" comes from texture and decoration** — the surface texture PNG, floral dividers, engraved card corners — not from background colour.

Five semantic tokens are added alongside the existing set:

| Token | Purpose | Source in artwork |
|---|---|---|
| `--glaze` | Pot-glaze blue-grey; selection states | The dominant pot ceramic |
| `--clay` | Warm amber-brown; stem/earth accents | Plant trunks, goldthread branches |
| `--jade` | Primary active green; replaces `--sage` | Mirewort leaves, lily stems, moss shadow |
| `--stone` | Cool neutral grey; inactive/empty states | Empty cracked-stone pot |
| `--moss` | Vivid chartreuse; vigorous/healthy accent | Base moss in every mature plant |

`--sage` is retained as an alias for `--jade` — no CSS class names change.

---

**Canvas note:** Because all rendering goes through the Canvas 2D API, these tokens are not CSS custom properties — they are fields on a `THEME` JS object (defined fully in §4g). The colour values listed in §1c/§1d are the source of truth; CSS variables are not used in the main canvas layer.

---

### 1c. Dark theme (default)

Night studio. The bonsai on a dark display shelf, lit by a single warm light source.

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#0c0e14` | Very dark, faintly cool — like deep glazed ceramic shadow |
| `--surface` | `#14161e` | Card/panel background — dark enough for plant images to read clearly |
| `--surface2` | `#1c1f2a` | Slightly raised surfaces |
| `--border` | `#2c3044` | Cool-dark border — picks up the pot glaze tone |
| `--text` | `#e8e4d0` | Warm cream — matches the white SVG motifs and flower petals |
| `--muted` | `#7a7a8a` | Slightly cool grey |
| `--accent` | `#d4a843` | Gold — matches stamens, goldthread leaves, training wire |
| `--jade` | `#5a8a5c` | Forest green — between the bright mirewort leaves and the darker plant backgrounds |
| `--sage` | `var(--jade)` | Alias; backward compatible |
| `--glaze` | `#44527a` | Blue-grey pot glaze; used for pot selection highlights |
| `--clay` | `#9a6030` | Warm brown; stem/earth accent, used sparingly |
| `--stone` | `#585864` | Cool grey; empty pot / inactive states |
| `--moss` | `#7aaa28` | Vivid chartreuse — matches the pot-base moss in the artwork |
| `--danger` | `#b04040` | Unchanged |

The shift from the previously planned warm-brown surfaces: `--surface` moves from `#1e1108` (warm wood) to `#14161e` (dark cool-neutral). The warmth is preserved through `--accent`, `--clay`, and `--moss` as focal accents — not as the surrounding field.

---

### 1d. Light theme

Daylight. The bonsai on a pale display table by a window, or studied in a hand-drawn botanical journal.

Applied via `data-theme="light"` on `<html>`.

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#f0ece0` | Warm pale parchment — a botanical journal page |
| `--surface` | `#e8e2d0` | Slightly more cream for cards |
| `--surface2` | `#ddd5be` | Warm tan for raised surfaces |
| `--border` | `#b8a880` | Medium warm brown-tan border |
| `--text` | `#1a1820` | Very dark ink — slightly cool to echo the glaze |
| `--muted` | `#6a6050` | Faded sepia ink |
| `--accent` | `#b8920e` | Gold in daylight — slightly richer |
| `--jade` | `#3a7040` | Forest green — more saturated in daylight |
| `--sage` | `var(--jade)` | Alias |
| `--glaze` | `#3a4872` | Blue-grey glaze in daylight — slightly lighter |
| `--clay` | `#8a5025` | Darker terracotta in daylight |
| `--stone` | `#7a7a80` | Neutral grey — the stone pot reads crisply on the pale background |
| `--moss` | `#6a9820` | Moss in daylight — slightly less vivid to avoid harshness on pale bg |
| `--danger` | `#9a2020` | Deeper red on light background |

**Light theme contrast note for seed icons.** The five light-coloured seeds (salthorn `#B0A882`, stonecress `#BDBDBD`, thornwhisper `#B0BEC5`, cinder fern `#9E9E9E`, murmuring sage `#90A4AE`) will barely contrast against the pale `--surface` parchment. Add this to `main.css`:

```css
:root[data-theme="light"] .seed-icon {
  box-shadow: 0 0 0 1px var(--border);
}
```

This gives all seed icon circles a visible edge in light mode without a hard border that would look odd in dark mode.

**The pots on a light background.** In light mode, the dark blue-grey glazed pots will stand out strongly against the pale parchment — exactly how bonsai is traditionally photographed (against white or pale walls). This is the most natural-feeling presentation of the artwork.

CSS structure:

```css
:root {
  /* dark theme — all tokens */
}

:root[data-theme="light"] {
  /* all light overrides */
}
```

---

### 1e. Theme toggle

**Where:** A small sun/moon button. On mobile: bottom of the Info tab. On desktop: top-right of the right panel nav bar, after the tab buttons.

**How (JS):**
- On load in `main.js`: `document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark'`
- `toggleTheme()` flips the value and writes back to localStorage
- Button fires `data-action="toggle_theme"` in the delegated click handler
- No re-render required — CSS custom properties cascade instantly

**Button label:** `☀ Light` when dark; `☾ Dark` when light. Rendered as `.btn.btn-sm.btn-muted`.

---

### 1f. Typography

Add to `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
```

- Body: `'Lora', Georgia, serif`
- `h2`: Lora 400, letter-spacing slightly tightened
- `h3` section labels: Lora 500, uppercase, `letter-spacing: 0.2em` — engraved character
- Buttons: Lora 500

---

### 1g. Surface texture

A tileable texture is overlaid on card surfaces to suggest material — dark ceramic/stone in dark mode, aged paper in light mode. The same PNG works for both because `background-blend-mode: overlay` lets the base colour dominate while the texture just adds surface interest.

**Asset to supply:** `/assets/texture-surface.png` (~256×256px tileable grain — could be fine stone texture, washi paper grain, or subtle linen weave). In dark mode this reads as ceramic; in light mode it reads as paper.

```css
.pot-card, .path-row, .vision-card, .record-stat, .encounter-row, .journey-stop {
  background-image: url('/assets/texture-surface.png');
  background-repeat: repeat;
  background-size: 256px;
  background-blend-mode: overlay;
}
```

---

### 1h. Section dividers

Between sections on the location screen.

**Asset to supply:** `/assets/divider-floral.svg` (~400×24px vine/flower motif using `currentColor` strokes so it picks up `--muted` in both themes).

```css
.section-divider {
  width: 100%;
  height: 24px;
  background: url('/assets/divider-floral.svg') no-repeat center;
  background-size: contain;
  margin: 4px 0 12px;
  opacity: 0.35;
}
```

Insert `<div class="section-divider"></div>` between pots, nursery, vision, and travel sections in `location.js`.

---

### 1i. Card corners

**Asset to supply:** `/assets/corner-flourish.svg` (24×24px corner curl). Used on `.vision-card` and `.path-row` via `::before` / `::after` at `opacity: 0.18`.

---

### 1j. Tab bar

**Asset to supply:** `/assets/tab-bar-bg.png` (~480×56px — could be a strip of engraved stone, dark ceramic, or aged wood plank; in light mode it reads as pale linen or wood).

```css
.tab-bar {
  background-image: url('/assets/tab-bar-bg.png'), linear-gradient(var(--surface), var(--surface));
  background-size: cover;
  border-top: 2px solid var(--border);
}
```

Active tab: `--accent` gold. Inactive: `--muted`.

---

### 1k. Connect screen

**Asset to supply:** `/assets/connect-bg.png` (~480×800px — a landscape or garden path illustration, ideally with bonsai-influenced composition: gnarled trees, stone path, distant hills).

```css
.connect-screen {
  background: url('/assets/connect-bg.png') bottom center / cover no-repeat, var(--bg);
}
.connect-inner {
  border-radius: 16px;
  padding: 32px 24px;
  backdrop-filter: blur(6px);
}

/* Dark: dark ceramic scrim */
.connect-inner { background: rgba(12, 14, 20, 0.80); }

/* Light: parchment scrim */
:root[data-theme="light"] .connect-inner { background: rgba(240, 236, 224, 0.85); }
```

Title "Verdant": `font-size: 44px`, Lora italic bold. Colour: `--accent`.

---

### 1l. Buttons and pips

- `.btn` border-radius: `6px`
- `.btn-accent`: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.12)`
- `.btn` hover dark: `background: #22253a` (faint cool-dark lift, consistent with surface)
- `.btn` hover light: `background: #d5cbb8`

Energy pips: optionally leaf-shaped via CSS mask.
**Asset to supply (optional):** `/assets/pip-leaf.svg` (16×16px silhouette).

---

### 1m. Pot selection state using `--glaze`

When a pot is selected in the pots wheel, the current code applies `border-bottom: 3px solid var(--accent)` (gold). To create visual continuity with the actual glazed pot artwork, change the selection indicator to `--glaze`:

```css
.pot-item.selected .pot-circle { border-bottom: 3px solid var(--glaze); }
.pot-item:hover .pot-circle    { border-color: color-mix(in srgb, var(--glaze) 60%, transparent); }
```

Gold (`--accent`) is reserved for action buttons and active map routes. The pot selection uses `--glaze` — the same blue-grey as the actual pot ceramic. This small touch ties the UI state to the physical material in the art.

---

## 2. Replaceable Meeple SVG

### 2a. Status meeple (small, colour-tinted by state)

**Asset to supply:** `/assets/meeple.svg` — silhouette, no `fill` attributes (or `fill="black"`), ~22×26 viewBox. Any shape you like.

CSS mask approach — `background-color` provides the tint, `mask-image` clips it to the shape:

```css
.meeple {
  display: inline-block;
  flex-shrink: 0;
  width: 22px;
  height: 26px;
  -webkit-mask-image: url('/assets/meeple.svg');
          mask-image: url('/assets/meeple.svg');
  -webkit-mask-size: contain;
          mask-size: contain;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  -webkit-mask-position: center;
          mask-position: center;
}
```

Updated `client/js/meeple.js`:

```js
const MEEPLE_COLORS = {
  resting:  'var(--jade)',
  tending:  'var(--accent)',
  walking:  'var(--glaze)',   // the blue-grey of the glazed pot — travellers are "in the vessel"
  arriving: 'var(--glaze)',
  sleeping: 'var(--stone)',
};

export function renderMeeple(state) {
  const color = MEEPLE_COLORS[state] || 'var(--stone)';
  return `<div class="meeple" style="background-color:${color}" aria-hidden="true"></div>`;
}
```

State colour rationale:
- **Resting** → `--jade` (green, settled, growing)
- **Tending** → `--accent` (gold, active and focused)
- **Walking/Arriving** → `--glaze` (blue-grey, "in transit" — the colour of the ceramic vessel that holds journeys)
- **Sleeping** → `--stone` (grey, dormant)

---

### 2b. Travel meeple (large, in parallax scene)

**Asset to supply:** `/assets/meeple-travel.svg` — silhouette, ~48×60 viewBox. A pilgrim figure — staff, cloak, whatever suits. No hardcoded fills.

```css
.travel-meeple-figure {
  position: absolute;
  left: 38%;
  bottom: 18px;
  width: 40px;
  height: 52px;
  -webkit-mask-image: url('/assets/meeple-travel.svg');
          mask-image: url('/assets/meeple-travel.svg');
  -webkit-mask-size: contain;
          mask-size: contain;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  background-color: var(--accent);  /* gold — visible against any landscape layer */
  z-index: 10;
  will-change: transform;
}
```

In `renderTravelProgress()`: replace the meeple `<g>` inside the SVG with `<div id="travel-meeple-figure" class="travel-meeple-figure"></div>` as a sibling of the parallax layers.

In `startTravelAnim()`: replace `setAttribute('transform', ...)` with a gentle Y-axis bob:

```js
const meepleEl = document.getElementById('travel-meeple-figure');
if (meepleEl) {
  const bob = Math.sin(elapsed * 3.5) * 2.5;
  meepleEl.style.transform = `translateY(${bob.toFixed(1)}px)`;
}
```

---

## 3. Travelling Screen Parallax Landscape

### Overview

Three horizontal layers at different scroll speeds, driven by journey progress. The meeple figure is fixed in the scene while the landscape scrolls past.

### HTML structure (inside `renderTravelProgress()`)

```html
<div class="travel-scene" id="travel-scene">
  <div class="travel-layer travel-layer-bg"  id="travel-layer-bg"></div>
  <div class="travel-layer travel-layer-mid" id="travel-layer-mid"></div>
  <div class="travel-layer travel-layer-fg"  id="travel-layer-fg"></div>
  <div id="travel-meeple-figure" class="travel-meeple-figure"></div>
</div>
<div class="path-visual-labels">
  <span>{fromName}</span><span>{toName}</span>
</div>
<div id="travel-eta" class="path-visual-eta">~... remaining</div>
```

### Assets to supply

| File | Description | Size |
|---|---|---|
| `/assets/travel-bg.png` | Sky, distant hills — could include bonsai-shaped distant pines | 2400×160px+ |
| `/assets/travel-mid.png` | Midground — trees, hedgerows, garden walls | 2400×200px+ |
| `/assets/travel-fg.png` | Foreground — flowers, grass, soil strip; transparent upper half | 2400×120px+ |

**Colour guidance for these assets** (to harmonise with the UI themes):
- In dark mode these layers will sit on a `--surface` background (`#14161e`). They should fade to near-transparent at their edges so the scene blends into the dark surface. Use PNG alpha.
- Foreground flowers can echo seed colours — orange wanderbloom, purple velour bloom, pale stonecress clusters — this makes the travel world feel botanically consistent with the pots.
- The midground could include a distant blue-glazed bonsai pot silhouette as a landmark — connecting the parallax world to the pot artwork.

### CSS

```css
.travel-scene {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 12px;
  background: var(--surface);
}

.travel-layer {
  position: absolute;
  top: 0; left: 0;
  width: 300%;
  height: 100%;
  background-repeat: repeat-x;
  background-position: left center;
  background-size: auto 100%;
  will-change: transform;
}

.travel-layer-bg  { background-image: url('/assets/travel-bg.png'); }
.travel-layer-mid { background-image: url('/assets/travel-mid.png'); }
.travel-layer-fg  {
  background-image: url('/assets/travel-fg.png');
  background-position: left bottom;
  top: auto; bottom: 0;
}
```

### Animation (JS — extension to `startTravelAnim`)

```js
const bgEl     = document.getElementById('travel-layer-bg');
const midEl    = document.getElementById('travel-layer-mid');
const fgEl     = document.getElementById('travel-layer-fg');
const meepleEl = document.getElementById('travel-meeple-figure');

if (bgEl)    bgEl.style.transform  = `translateX(${-(frac * 20).toFixed(2)}%)`;
if (midEl)   midEl.style.transform = `translateX(${-(frac * 45).toFixed(2)}%)`;
if (fgEl)    fgEl.style.transform  = `translateX(${-(frac * 70).toFixed(2)}%)`;
if (meepleEl) {
  const bob = Math.sin(elapsed * 3.5) * 2.5;
  meepleEl.style.transform = `translateY(${bob.toFixed(1)}px)`;
}
```

---

## 4. Canvas Architecture & Layout

### 4a. Rendering approach: single HTML5 canvas

The entire game UI renders on a single `<canvas>` element that fills the viewport. There are no DOM-based UI elements in the game layer — no divs, no scrollable elements, no CSS layout. The only HTML beyond the canvas is a hidden `<input>` for any future text-entry fields.

**Core infrastructure:**

- **Render loop:** `requestAnimationFrame` drives all visual updates. A dirty-flag system tracks which panels need redrawing and skips full-canvas redraws when nothing has changed.
- **DPR scaling:** On init (and on each `resize`), `canvas.width = window.innerWidth * devicePixelRatio`, `canvas.height = window.innerHeight * devicePixelRatio`, then `ctx.scale(dpr, dpr)`. All layout coordinates are in CSS pixels; the canvas surface is sharper on retina displays.
- **Font loading:** Fonts are loaded via the FontFace API. The render loop is gated behind `document.fonts.ready` — no text draws until fonts are available.
- **Asset preloading:** All images (plant PNGs, seed SVGs, parallax layers, meeple SVGs, texture PNGs) are pre-decoded into `HTMLImageElement` instances at startup. `drawImage()` references these cached instances. A loading screen is shown until all assets resolve.
- **Hit registry:** Each interactive region registers a bounding box `{ x, y, w, h, action, data }` each render frame. Mouse/touch handlers iterate this list in reverse (top-most first) to dispatch actions. The registry is rebuilt on every frame — no stale state.
- **Scroll state:** Each scrollable panel tracks an independent `scrollY` offset in the render state. Scrolling is simulated by saving/translating/clipping the draw context, not by native browser scroll.
- **Theme constants:** CSS custom properties do not apply to canvas. Theme tokens live in a JS `THEME` object. See §4g.

---

### 4b. Orientation breakpoints

Layout is determined by orientation, not a pixel breakpoint:

| Condition | Layout mode |
|---|---|
| `window.innerWidth >= window.innerHeight` | **Desktop** — three-column landscape |
| `window.innerWidth < window.innerHeight` | **Mobile** — single-column portrait, swipe-paged |

A `resize` event handler recalculates column widths, resets panel scroll offsets, flushes the hit registry, and triggers a full redraw. Orientation changes are treated as resizes.

---

### 4c. Desktop three-column layout (landscape)

```
┌────────────────┬─────────────────┬──────────────────────────────────┐
│  LEFT (220px)  │  MIDDLE (300px) │  RIGHT (remaining width)         │
│                │                 │                                  │
│  Visions       │  Pot display    │  [Map] [Record] [Info]  [☀/☾]   │
│  panel         │  (wheel +       │  ──────────────────────────────  │
│                │   pot drawer)   │                                  │
│  Independently │                 │  Active tab content              │
│  scrollable    │  OR: parallax   │  (independently scrollable)      │
│                │  travel scene   │                                  │
│                │  + controls     │                                  │
└────────────────┴─────────────────┴──────────────────────────────────┘
```

**Column responsibilities:**

- **Left (220px fixed):** Visions only — vision cards with progress bars and shimmer states. Independently scrollable. Location name and energy bar are shown at the top of this column above the vision list.
- **Middle (300px fixed):** Pot display only — the pots wheel and pot detail drawer. When the player is walking, this column replaces the pot display with the parallax travel scene and travel controls (Reverse, Auto-arrive, Fast Travel). Independently scrollable if the pot drawer is tall.
- **Right (remaining width):** Tab bar pinned at the top of the column; active tab content fills the remainder. Independently scrollable. Tabs: Map, Record, Info. Theme toggle sits at the far right of the tab bar.

**Column separators:** 1px vertical lines drawn in `THEME.border` between each column.

**Travel state:** While walking, the Left column continues to show visions. The Middle column shows the parallax travel scene. The Right column shows the Map tab by default (so the player can watch the route progress).

---

### 4d. Desktop input handling (mouse + click-drag)

All interaction uses mouse events attached to the canvas element. Touch events are not connected in desktop mode.

- **Click:** `mousedown` + `mouseup` within a ~4px movement threshold → hit-test the registry → dispatch action.
- **Hover states:** `mousemove` → hit-test → update a `hoveredRegion` variable → set `canvas.style.cursor` (`pointer` over buttons, `grab` over draggable regions). On the next frame, hovered regions render with a highlight.
- **Map panning (click-drag):** On the Map tab in the right column, `mousedown` inside the map region begins a pan drag. `mousemove` accumulates `(dx, dy)` and shifts the map viewport offset. `mouseup` or `mouseleave` ends the drag.
- **Pots wheel rotation (click-drag):** On the Middle column, dragging left/right within the wheel area shifts the selected pot index. A momentum/snap system reads pointer velocity on release and coasts the wheel to the nearest pot.
- **Scroll:** `wheel` events on the canvas hit-test which column the cursor is over and adjust that panel's `scrollY`. Clamped to the content height.

---

### 4e. Mobile single-column layout (portrait)

In portrait mode, the three logical columns become three horizontally-arranged **pages** that are swiped between. Only one page is visible at a time; the others are rendered off-screen and translated into view during a swipe gesture.

| Page index | Content |
|---|---|
| 0 (left) | Visions |
| 1 (center, default) | Pot display (or travel scene while walking) |
| 2 (right) | Tabbed content — Map / Record / Info |

**Navigation indicator:** Three dots drawn at the bottom of the canvas indicate the current page. Active dot uses `THEME.accent`; inactive dots use `THEME.stone`.

**Page transitions:** A swipe gesture animates all three pages sliding in unison. The animation is driven by `requestAnimationFrame` with an `easeOutCubic` curve over ~250ms. There is no momentum scroll between pages — swipe commits to the next/previous page or snaps back.

**Scroll within pages:** Vertical swipes scroll the content of the current page. The page-nav swipe recogniser fires only when horizontal delta exceeds vertical delta by a ratio of at least 1.5:1, preventing accidental page changes during content scrolling.

---

### 4f. Mobile input handling (touch only)

Touch events are attached to the canvas element. Mouse events are not connected in mobile mode.

- **Tap:** `touchstart` records position and time. `touchend` at ≤ 8px displacement and ≤ 300ms → hit-test → dispatch action.
- **Page swipe:** `touchstart` → `touchmove` tracking horizontal delta. If `|dx| > |dy| × 1.5` (landscape-swipe guard) and `|dx| > 40px`, begin page transition. `touchend` commits or snaps back based on velocity/distance threshold.
- **Content scroll:** If `|dy| > |dx| × 1.2` (portrait-swipe guard), accumulate vertical delta into the current page's `scrollY`. A kinetic decay continues scrolling after `touchend` using exponential ease-out.
- **Pots wheel swipe:** Swiping left/right within the pots wheel region rotates the selected pot. Snaps to the nearest pot after release, with slight momentum.
- **No drag, no hover, no right-click, no multi-touch (for now).**

Long-press (> 500ms without movement) can be reserved for future contextual menus but is not used in the initial implementation.

---

### 4g. Theme as JS constants

Because canvas rendering does not use CSS, the colour tokens from §1c and §1d are implemented as fields on a `THEME` JS module — not as CSS custom properties. The colour values are identical; only the mechanism changes.

```js
// Approximate structure — exact field names match §1c/§1d token names
export const THEME_DARK = {
  bg:       '#0c0e14',
  surface:  '#14161e',
  surface2: '#1c1f2a',
  border:   '#2c3044',
  text:     '#e8e4d0',
  muted:    '#7a7a8a',
  accent:   '#d4a843',
  jade:     '#5a8a5c',
  glaze:    '#44527a',
  clay:     '#9a6030',
  stone:    '#585864',
  moss:     '#7aaa28',
  danger:   '#b04040',
};

export const THEME_LIGHT = { /* matching values from §1d */ };

export let THEME = THEME_DARK;  // active; swapped by toggleTheme()
```

All draw calls use `THEME.surface`, `THEME.accent`, etc. `toggleTheme()` swaps `THEME` and invalidates all panel dirty flags, triggering a full redraw on the next frame. The preference is persisted to `localStorage` exactly as §1e describes, but the `data-theme` attribute on `<html>` is not used.

---

### 4h. Canvas animation approach

The CSS animations described throughout §8 are re-expressed as time-based canvas draw logic rather than CSS keyframes:

- Each animation is driven by a start timestamp stored in render state.
- On each `requestAnimationFrame` tick, elapsed time `t` is computed and the animated value is derived from an easing function.
- When `t >= duration`, the animation is marked complete and removed from state — no further redraws are triggered by it.
- The `prefers-reduced-motion` media query is checked once at startup. If true, all animation durations are set to `0.01ms` (effectively instant), respecting §8's accessibility requirement.

The visual intent of every animation in §8 is unchanged — only the implementation mechanism moves from CSS keyframes to canvas draw math.

---

## 5. Asset Checklist

| File | Used by | Notes |
|---|---|---|
| `/assets/meeple.svg` | Status meeples everywhere | Silhouette only, no fill, ~22×26 viewBox |
| `/assets/meeple-travel.svg` | Parallax travel scene | Silhouette only, ~48×60 viewBox |
| `/assets/texture-surface.png` | Card surfaces | Tileable ~256×256px; stone or paper grain |
| `/assets/divider-floral.svg` | Between location sections | ~400×24px, `currentColor` strokes |
| `/assets/corner-flourish.svg` | Vision cards, path rows | 24×24px corner curl |
| `/assets/tab-bar-bg.png` | Tab bar | ~480×56px plank/stone/ceramic strip |
| `/assets/connect-bg.png` | Connect screen backdrop | ~480×800px landscape |
| `/assets/pip-leaf.svg` | Energy pip shape (optional) | 16×16px silhouette |
| `/assets/travel-bg.png` | Parallax background layer | 2400×160px+ sky/distant hills |
| `/assets/travel-mid.png` | Parallax midground layer | 2400×200px+ trees/walls |
| `/assets/travel-fg.png` | Parallax foreground layer | 2400×120px+ flowers/grass, transparent top |

---

## 6. Implementation Order

1. **Colour tokens** — update CSS variables in `main.css` with the new dark theme values (near-neutral dark surfaces, correct `--glaze`, `--moss`, `--stone`, `--clay`). Check all 15 seed icon circles are readable.
2. **Light theme block** — add `:root[data-theme="light"]` overrides; add seed-icon shadow fix for light colours.
3. **Typography (Lora)** — `index.html` link + CSS `font-family`.
4. **Theme toggle** — `toggleTheme()` in `main.js`, button in info tab, button in desktop nav.
5. **Replaceable status meeple** — update `meeple.js` to return a `<div>`, add `.meeple` mask CSS. Drop `/assets/meeple.svg` placeholder (even a simple circle SVG will do to verify it works).
6. **Pot selection with `--glaze`** — update `.pot-item.selected` border colour.
7. **Surface texture + section dividers** — add CSS, insert dividers in `location.js`. Use plain colour placeholder first.
8. **Travel parallax + travel meeple** — replace `renderTravelProgress()`, extend `startTravelAnim()`, add CSS. Solid-colour divs as placeholders first.
9. **Desktop two-column layout** — `isDesktop()` branch, `@media` CSS. Test by resizing.
10. **Connect screen + card corners + tab bar texture** — final polish.

---

## 7. Widget UX Improvements

These are organised by severity: Group A is fundamental flow problems that cause real friction; Group B are improvements with measurable benefit; Group C is polish. Each change includes a specific reason it matters.

---

### Group A — Fundamental flow problems

#### A1. Arrival screen: Continue button must move to the top

**Current:** The "Continue to X" button is the very last element in `renderArrival()` — after encounters, the journey log, and the queued destinations list. A player who has queued a multi-stop route and just wants to continue has to scroll past everything to reach the only meaningful action on this screen.

**Why it matters:** The arrival screen is a brief pause, not a dossier. In auto-queued travel especially, the player just wants to resume movement. Burying the CTA is a textbook case of prioritising information display over task completion.

**Change:** Move the Continue button to directly after the location name and core seed icon, before any other content. The encounters, journey log, and queue remain below it as supplementary reading. Add a second Continue button at the bottom as well, so both positions are covered.

```
[Arrived at]
[Location Name]
[Core seed icon]
[→ Continue to Location]    ← moved here

[On your journey]
[encounter rows]
[Your journey log]
[Ahead queue]

[→ Continue to Location]    ← also kept at bottom
```

---

#### A2. Pots wheel center panel: action buttons are untappable

**Current:** The center panel of the pots wheel is confined to 44% of the wheel's width (max 130px). Action buttons inside it use `font-size: 10px` and `min-height: 28px` — well below the 44px minimum touch target size for mobile. The centre of a circular wheel layout is geometrically the worst place to put actions: it's small, surrounded by the ring of pot buttons, and cramped.

**Why it matters:** Planting and clearing are the primary actions in the game. They're currently hidden inside a tiny centred panel that's hard to read and harder to tap. The CSS itself acknowledges this: `.pots-center .btn { font-size: 10px; padding: 4px 8px; min-height: 28px; }`.

**Change:** Keep the pot wheel as-is (the circular metaphor is strong, and the pot imagery works at this size). Remove the center panel from inside the wheel. Instead, render a **pot detail drawer** immediately below the wheel when a pot is selected. This drawer has no size constraints — full-width, normal button sizes, readable typography.

```html
<!-- new structure -->
<div class="pots-wheel">
  <!-- pot buttons ring, no center panel -->
</div>

<!-- replaces pots-center; only rendered when a pot is selected -->
<div class="pot-drawer" id="pot-drawer">
  <div class="pot-drawer-name">Velour Bloom — fruiting</div>
  <div class="pot-drawer-meta">next: dead in 2h 10m · 3 decorators</div>
  <div class="pot-drawer-actions">
    <button class="btn btn-accent">Plant Mirewort  ·  3 energy</button>
    <button class="btn btn-danger">Clear  ·  8 energy</button>
    <button class="btn btn-sage">Decorate</button>
  </div>
</div>
```

CSS for `.pot-drawer`:
```css
.pot-drawer {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  margin-top: 8px;
  min-height: 56px;
}
.pot-drawer-name  { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
.pot-drawer-meta  { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.pot-drawer-actions { display: flex; flex-direction: column; gap: 6px; }
.pot-drawer-actions .btn { font-size: 14px; min-height: 44px; width: 100%; }
```

When no pot is selected, the drawer shows: *"Tap a pot"* in muted text — same hint as now, just in a proper-sized slot below the wheel.

---

#### A3. Nursery → pot targeting: no visual affordance

**Current:** When a player selects a seed in the nursery, they receive a small text hint ("Tap a pot to plant Mirewort") but nothing in the pot wheel changes. There is no visual connection between the selected seed and the valid target pots. Players must remember which seed they picked, scroll up to the wheel, and guess which pots are valid.

**Why it matters:** This is a broken affordance. The nursery and the wheel interact with each other but display no visual relationship. On a long page, the hint text can scroll out of view. Players who can't find what to tap will simply not plant things.

**Change:** When `selectedNurserySeedId` is non-null, update pot button rendering to visually categorise each pot:

- **Valid target** (empty, or occupied but not settling): add class `pot-item--plantable` → pulse border in `--jade`
- **Settling** (can't plant yet): add class `pot-item--settling` → dim to 50% opacity  
- **Occupied by same seed** (already planted): no change needed

CSS:
```css
.pot-item--plantable .pot-circle {
  border-color: var(--jade);
  animation: pot-pulse 1.8s ease-in-out infinite;
}
.pot-item--settling { opacity: 0.5; cursor: not-allowed; }

@keyframes pot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--jade) 40%, transparent); }
  50%       { box-shadow: 0 0 0 6px color-mix(in srgb, var(--jade) 0%, transparent); }
}
```

This is a JS change only in the pot rendering loop — one extra class applied based on existing state.

---

### Group B — Clear friction reduction

#### B1. Embark seed picker: full-screen replacement is disorienting

**Current:** When "Walk" is clicked from the Travel section, `renderLocation` detects `embarkingPathId` and replaces the *entire* screen content with the seed picker. The location you're about to leave vanishes. The Cancel button sits alongside the Embark buttons with identical styling, making all three actions feel equal-weight.

**Why it matters:** Context loss. The player was looking at their location's pots and nursery, decided to embark, and the whole screen resets. There's no visual continuity between "I was here, I picked Walk" and "now I'm in a seed picker." Cancel looks the same weight as Embark.

**Change:** Render the embark picker as a **slide-up drawer** fixed to the bottom of the screen, rather than replacing the screen content. The location content remains visible (dimmed) above.

```css
.embark-sheet {
  position: fixed;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%; max-width: 480px;
  background: var(--surface);
  border-top: 2px solid var(--border);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px 32px;
  z-index: 200;
  animation: slide-up 0.25s ease-out;
}

@keyframes slide-up {
  from { transform: translateX(-50%) translateY(100%); }
  to   { transform: translateX(-50%) translateY(0); }
}

/* dim the content behind */
.embark-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 199;
}
```

The Cancel button becomes a small close handle at the top of the sheet (a `×` or a drag bar), clearly subordinate to the Embark actions.

JS change in `renderLocation`: instead of injecting the picker into `html` at the top level, inject `.embark-overlay` + `.embark-sheet` separately into `app` after the main content renders. On cancel, remove those two elements without re-rendering the whole screen.

---

#### B2. Walking screen: Reverse and Fast Travel are wrongly grouped

**Current:** Both "↩ Reverse" and "⚡ Fast Travel" live in `.reverse-row`, side by side, with similar visual weight. Reverse abandons the current journey direction; Fast Travel commits energy to accelerate it. These are opposite decisions placed in identical buttons next to each other — easy to misfire.

**Why it matters:** Accidentally tapping Reverse mid-journey would be frustrating. The two actions have completely different implications (reversal vs. commitment) and should be visually separated.

**Change:** Give each its own row with clear context. The travel controls become two distinct rows:

```
[↩ Reverse direction]                  ← subdued, btn-muted
─────────────────────────────────────
[⚡ Fast Travel · 2 energy]            ← accent, prominent
```

Or on wider mobile, place Reverse left-aligned (small, muted) and Fast Travel right-aligned (larger, accent), separated by the full row width so accidental taps are minimised.

---

#### B3. Pot memory strip: 8px dots are too abstract

**Current:** The pot memory strip (used in the Travel section and on the map widget) shows 8px solid circles coloured by seed colour. These dots appear in two places and are supposed to tell you "what seeds are in the pots at that location from your last visit." But an 8px dot gives no shape — just colour — and seed colours aren't memorised by most players.

**Why it matters:** The pot memory strip could be a genuinely useful decision aid. "I see purple and orange in those pots, I should bring something different." But at 8px, it's just decorative noise.

**Change:** Replace the 8px dots with 14px inline seed SVG icons, using the existing `seedIconSmall()` pattern (`<img class="seed-icon-inline">`). The seed icons have distinctive silhouettes — a flower, a fern, a water drop — which are legible even at 14px. Empty pots stay as a small empty ring.

```js
// In pot memory strip rendering:
if (mp.seedId) {
  memStrip += seedIconSmall(mp.seedId); // already exists, returns 14px <img>
} else {
  memStrip += `<span class="pot-mem-empty">·</span>`;
}
```

```css
.pot-mem-empty { font-size: 14px; color: var(--stone); }
```

---

#### B4. Vision cards: progress fraction is hard to scan

**Current:** Vision progress is shown as `"3 / 5 locations"` — a text fraction in small `.vision-progress` text. Scanning four vision cards means reading four fractions. There is no at-a-glance sense of "how far along" each vision is.

**Why it matters:** Vision progress is the main progression mechanic. Players check it frequently. A visual bar makes progress scannable in under a second vs. reading four numbers.

**Change:** Add a thin progress bar below the vision description, above the footer:

```html
<div class="vision-progress-bar">
  <div class="vision-progress-fill" style="width:${Math.round(rule.satisfiedCount/rule.difficulty*100)}%"></div>
</div>
```

```css
.vision-progress-bar {
  height: 3px;
  background: var(--surface2);
  border-radius: 2px;
  margin: 6px 0;
  overflow: hidden;
}
.vision-progress-fill {
  height: 100%;
  background: var(--jade);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.vision-card.completed .vision-progress-fill { background: var(--moss); }
.vision-card.satisfied-here .vision-progress-fill { background: var(--accent); }
```

Keep the fraction text — the bar is a supplement, not a replacement.

---

#### B5. Record tab: music toggle and Delete Pilgrim are buried

**Current:** The Music toggle and Delete Pilgrim buttons are the last two items in `renderRecord()` — below age, energy milestones, vision list, speed, and the full 15-row seed log. A player who wants to toggle music mid-game has to scroll through their entire history.

**Why it matters:** These are **settings actions**, not record content. They don't belong in a stats screen. The Delete Pilgrim button especially should be easily discoverable before a player is frustrated enough to quit — burying it reduces discoverability as an intentional "escape hatch."

**Change:** Move both buttons to the **Info tab** (`renderInfo`) under a "Settings" section at the bottom. The Info tab already contains auxiliary content (game explanation) and is the natural home for controls that affect the session rather than display statistics. Delete Pilgrim should also get a confirmation step — a second button that reveals only after the first is clicked:

```html
<div class="section">
  <h3>Settings</h3>
  <button class="btn btn-full btn-muted" data-action="toggle_music">Music: On</button>
  <!-- theme toggle button here too -->
</div>
<div class="section">
  <button class="btn btn-full btn-muted" id="delete-pilgrim-reveal">Delete my Pilgrim…</button>
  <!-- only appears after clicking the above: -->
  <button class="btn btn-full btn-danger" data-action="delete_pilgrim" hidden id="delete-pilgrim-confirm">
    Yes, delete permanently
  </button>
</div>
```

The two-step delete is a pure JS toggle on the `hidden` attribute, no server interaction.

---

#### B6. Energy regen countdown: missing CSS

**Current:** `renderEnergyBar()` outputs `<span class="energy-regen">+1 in 2m 30s</span>` but `main.css` has no rule for `.energy-regen`. The countdown text renders unstyled, with no colour or visual hierarchy to distinguish it from the pip count.

**Why it matters:** The regen countdown is important timing information for decisions ("should I wait for one more energy before embarking?"). Currently it's invisible if default browser styling happens to blend it in.

**Change:** Add a CSS rule:

```css
.energy-regen {
  font-size: 11px;
  color: var(--accent);
  margin-left: 6px;
  font-style: italic;
}
```

Gold/accent colour connects it visually to the filled pips (which also use `--jade`) and marks it as a "soon, something will happen" signal.

---

### Group C — Polish

#### C1. Seed log column headers: opaque on mobile

**Current:** The seed log uses abbreviated headers `Sd, Sl, Gr, Fr, De` with `title` attributes — these are mouse-hover tooltips, completely useless on touch devices. A new player on mobile looking at the seed log grid has no idea what the columns mean.

**Change:** Replace abbreviations with the same stage badges used elsewhere in the UI, using the existing `.badge-stage-*` classes. The stage names are already known to the player from the pot wheel (they see "seedling", "grown", "fruiting" on pots). One word each fits in the 22px column:

```html
<span class="log-col-label"><span class="badge badge-stage-seed">Sd</span></span>
```

Or better yet, since the plant PNGs are the most recognisable representation of each stage, add a small thumbnail of the first plant at each stage as the column header. But that's more complex — the badge approach is sufficient.

---

#### C2. Auto-arrive toggle: unclear placement

**Current:** Auto-arrive sits in `.auto-arrive-row` between the parallax scene and the encounters list. It's sandwiched between two visually distinct sections with no clear grouping. It reads like an afterthought after the scene.

**Change:** Move Auto-arrive to sit alongside the travel controls (Reverse / Fast Travel) at the top of the walking screen, before the parallax scene. It's a journey-mode setting, not an encounter action. Group all three journey controls together:

```
[↩ Reverse]    [Auto-arrive ✓]    [⚡ Fast Travel]
─────────────────────────────────────────────────────
[parallax travel scene]
─────────────────────────────────────────────────────
[encounters]
```

---

## 8. CSS Animations

All animations respect `prefers-reduced-motion` — wrap every `animation` property in a media query or use the global rule below so users who have requested reduced motion get none of these:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
}
```

---

### 8a. Leaf drift — connect screen

Small leaf silhouettes drift slowly downward across the connect screen background while the player waits to join. Reuses `/assets/pip-leaf.svg` already in the asset list.

Five or six `.connect-leaf` elements are injected into `.connect-screen` by `renderConnect()`. Each has a randomised `left`, `animation-duration` (8–14s), and `animation-delay` so they never feel synchronised.

```css
@keyframes leaf-fall {
  0%   { transform: translateY(-40px) translateX(0px)   rotate(0deg);   opacity: 0; }
  10%  { opacity: 0.7; }
  50%  { transform: translateY(45vh)  translateX(20px)  rotate(40deg); }
  90%  { opacity: 0.5; }
  100% { transform: translateY(110vh) translateX(-10px) rotate(80deg); opacity: 0; }
}

.connect-leaf {
  position: absolute;
  width: 16px;
  height: 16px;
  background-color: var(--jade);
  -webkit-mask-image: url('/assets/pip-leaf.svg');
          mask-image: url('/assets/pip-leaf.svg');
  -webkit-mask-size: contain;
          mask-size: contain;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  animation: leaf-fall linear infinite;
  pointer-events: none;
  z-index: 1;
}
```

JS in `renderConnect()` — appended after `innerHTML` is set:

```js
const screen = app.querySelector('.connect-screen');
const configs = [
  { left: '12%', duration: '9s',  delay: '0s'   },
  { left: '28%', duration: '13s', delay: '-3s'  },
  { left: '48%', duration: '10s', delay: '-6s'  },
  { left: '65%', duration: '8s',  delay: '-1.5s'},
  { left: '82%', duration: '12s', delay: '-8s'  },
];
for (const c of configs) {
  const leaf = document.createElement('div');
  leaf.className = 'connect-leaf';
  leaf.style.cssText = `left:${c.left};animation-duration:${c.duration};animation-delay:${c.delay}`;
  screen.appendChild(leaf);
}
```

---

### 8b. Map route trace

When a destination is selected on the map and the gold route appears, it draws itself from current location toward the target rather than appearing all at once — like tracing a finger on a paper map.

Each route `<line>` element gets `pathLength="1"` as an SVG attribute, which normalises stroke-dasharray regardless of the line's actual pixel length. Each leg in a multi-hop route gets a slightly later `animation-delay` so they draw sequentially.

```css
@keyframes draw-path {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}

.map-path.route {
  stroke-dasharray: 1;
  pathLength: 1;
  animation: draw-path 0.5s ease-out forwards;
}
```

In `renderMap()`, multi-segment routes (when `travelRoute.length > 1`) stagger the delay per segment:

```js
// When building route line SVG elements:
isRoute ? ` class="map-path visited route" style="animation-delay:${routeIndex * 0.12}s" pathLength="1"` : ...
```

The `routeIndex` is the position of this path segment in the `travelRoute` array.

---

### 8c. Energy pip bloom on regen

When the server sends a state update where `energy` is higher than the previous render — a pip just regenerated — the newly filled pip plays a brief bloom: scales up from small with a pulse through gold before settling to jade green. Like a bud opening.

```css
@keyframes pip-bloom {
  0%   { transform: scale(0.4); background-color: var(--moss);   opacity: 0.6; }
  55%  { transform: scale(1.3); background-color: var(--accent); opacity: 1;   }
  100% { transform: scale(1);   background-color: var(--jade);   opacity: 1;   }
}

.energy-pip.full.pip-blooming {
  animation: pip-bloom 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

JS — track previous energy in a module-level variable in `location.js`:

```js
let _prevEnergy = null;

// Inside renderEnergyBar(), before building pip HTML:
const newlyFilled = (_prevEnergy !== null && energy > _prevEnergy)
  ? energy  // the pip at this index just filled
  : null;
_prevEnergy = energy;

// When rendering each pip:
const isNew = newlyFilled !== null && i === newlyFilled - 1;
`<span class="energy-pip full${isNew ? ' pip-blooming' : ''}"></span>`
```

When all pips are full (energy === energyMax), all newly filled pips bloom simultaneously for a more celebratory effect.

---

### 8d. "Verdant" title gold shimmer

The connect screen title cycles a slow gold-to-bright-gold-to-gold gradient sweep — like candlelight or gold leaf catching a flicker. One sweep every 6 seconds, restrained enough to feel precious rather than flashy.

```css
@keyframes gold-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

.connect-title {
  background: linear-gradient(
    90deg,
    var(--accent)  20%,
    #fff8d0        50%,
    var(--accent)  80%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gold-shimmer 6s linear infinite;
}
```

In light theme, the `#fff8d0` highlight remains legible because it's a pale gold rather than pure white. In dark theme it appears as a bright catch-light against the deeper gold.

---

### 8e. Vision card "satisfied here" shimmer

When a vision card is in the `satisfied-here` state — your current location actively meets this vision's conditions — the card's border pulses with a slow amber glow. Like candlelight on the edge of a scroll.

```css
@keyframes border-shimmer {
  0%, 100% { box-shadow: 0 0 0   0   transparent; border-color: var(--accent); }
  50%       { box-shadow: 0 0 10px 1px color-mix(in srgb, var(--accent) 35%, transparent);
              border-color: #f0d070; }
}

.vision-card.satisfied-here {
  animation: border-shimmer 2.5s ease-in-out infinite;
}
```

The existing `satisfied-here` rule already sets a static `border-color` and `background`. This animation replaces the static border-color with a live pulse while keeping the background tint. The 2.5s period is long enough to feel organic rather than urgent.

---

### 8f. Arrival seed icon entrance

When the arrival screen renders, the location's core seed icon scales up from a tiny point with a spring overshoot, while the location name drifts up from below. Together they make the arrival feel like something is opening and presenting itself.

```css
@keyframes seed-sprout {
  0%   { transform: scale(0.15); opacity: 0; }
  65%  { transform: scale(1.1);  opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

@keyframes name-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.arrival-core-seed .seed-icon {
  animation: seed-sprout 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.arrival-name {
  animation: name-rise 0.4s ease-out 0.25s both;
}

.arrival-label {
  animation: name-rise 0.3s ease-out 0.1s both;
}
```

The cubic-bezier is a spring curve producing the natural overshoot without requiring a `bounce` keyframe. The `arrival-label` ("Arrived at") fades first, then the name rises with a short delay, then the seed icon springs up — a three-beat sequence in under a second.

---

### 8g. Encounter row slide-in

When a new encounter appears in the list while walking — another pilgrim appears on the path — the row slides in from the right, as if approaching from that direction.

Only *new* encounters animate; existing ones stay fixed.

```css
@keyframes encounter-enter {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0);    }
}

.encounter-row.encounter-new {
  animation: encounter-enter 0.3s ease-out forwards;
}
```

JS — track known encounter IDs in `location.js`:

```js
let _knownEncounterIds = new Set();

// When building encounter rows:
const isNew = !_knownEncounterIds.has(enc.id);
if (isNew) _knownEncounterIds.add(enc.id);

// In the encounter row HTML:
`<div class="encounter-row${isNew ? ' encounter-new' : ''}">`

// Clear on leaving walking state:
export function clearEncounterTracking() { _knownEncounterIds.clear(); }
```

`clearEncounterTracking()` is called from `stopTravelAnim()` or whenever the walking screen exits.

---

### 8h. Pot drawer open

When the pot drawer appears below the wheel (on first pot selection — transitioning from "no selection" to "pot selected"), it enters with a quick downward reveal. Swapping between already-selected pots updates the content without re-animating.

```css
@keyframes drawer-open {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.pot-drawer {
  animation: drawer-open 0.18s ease-out forwards;
}
```

In JS, the `pot-drawer` div is only created when `selectedPotId` is non-null. The animation fires automatically each time the element is inserted into the DOM. When switching between pots (selectedPotId changes from one to another), the drawer's `innerHTML` is updated without removing/reinserting the element, so the animation doesn't re-fire — only the opening moment is animated.

---

### 8i. Fast Travel activation flash

At the moment Fast Travel activates — the player commits 2 energy to move at 5× speed — the parallax scene briefly brightens as though the landscape blurs with sudden velocity.

```css
@keyframes speed-flash {
  0%   { opacity: 0; }
  15%  { opacity: 0.28; }
  100% { opacity: 0; }
}

.travel-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  pointer-events: none;
  border-radius: inherit;
  z-index: 20;
}

.travel-scene.fast-activated::after {
  animation: speed-flash 0.7s ease-out forwards;
}
```

JS — in the click handler for `activate_fast_travel` (or wherever the fast travel state change is detected in the render cycle), add the class and remove it after the animation completes:

```js
const scene = document.getElementById('travel-scene');
if (scene) {
  scene.classList.add('fast-activated');
  setTimeout(() => scene.classList.remove('fast-activated'), 700);
}
```

The `::after` sits above all parallax layers (`z-index: 20`) but the flash is brief and at low opacity so it doesn't fully obscure the scene. The meeple's `z-index: 10` means the flash passes over it too, which is correct — the whole world momentarily bleaches with speed.

---

## 9. Updated Implementation Order

### Phase 0 — Canvas foundation (prerequisite for everything else)

1. **Canvas shell** — replace `#app` div with a full-viewport `<canvas>`. Set up the `requestAnimationFrame` render loop, DPR scaling, and `resize` handler. A solid `THEME_DARK.bg` fill proves it works.
2. **THEME constants module** — define `THEME_DARK` and `THEME_LIGHT` objects with the colour values from §1c/§1d. Wire `toggleTheme()` to swap the active THEME and trigger a full redraw. Persist to `localStorage`.
3. **Font loading gate** — load Lora via FontFace API; hold first render until `document.fonts.ready` resolves.
4. **Asset preloader** — preload all image assets (plant PNGs, seed SVGs, textures, parallax layers, meeple SVGs) into a keyed map of `HTMLImageElement`. Show a loading screen until complete.
5. **Hit registry + input dispatch** — implement the bounding-box hit registry, `mousedown`/`mouseup`/`mousemove` handlers (desktop) and `touchstart`/`touchmove`/`touchend` handlers (mobile). Wire to a central action dispatcher that mirrors the existing action names used throughout the codebase.
6. **Orientation detection** — `isLandscape()` check on `window.innerWidth >= window.innerHeight`; `resize` handler rebuilds column layout and flushes scroll offsets.

### Phase 1 — Layout structure

7. **Desktop three-column layout** — draw column separators; implement per-column clip regions; wire each column to its content renderer (visions / pot display / tab content). Placeholder grey fill in each column to verify proportions.
8. **Mobile swipe-page layout** — three virtual pages; page indicator dots; horizontal swipe recognition with the 1.5:1 guard ratio; page-transition animation with `easeOutCubic` over ~250ms.
9. **Per-panel scroll** — vertical scroll tracking with kinetic decay for mobile; `wheel` event routing per column for desktop. Clamp to content height.

### Phase 2 — Core widget rendering (canvas draw calls)

10. **Energy regen display** — draw energy pips and regen countdown in `THEME.accent`; currently broken (§B6), fix early.
11. **Replaceable status meeple** — draw the meeple via `drawImage()` with tint using `globalCompositeOperation`. Load from `/assets/meeple.svg` placeholder.
12. **Pot selection with glaze colour** — pot wheel selection highlight drawn in `THEME.glaze`.
13. **Pot drawer** — remove the center panel logic; draw pot detail drawer below the wheel in the Middle column.
14. **Nursery target highlighting** — when `selectedNurserySeedId` is set, mark plantable pots with a time-based opacity-oscillating jade border.
15. **Arrival screen: Continue button at top + entrance animations** — reorder draw calls; implement `seed-sprout` scale spring and `name-rise` translate fade as time-based canvas animations per §4h.
16. **Vision progress bars + satisfied-here shimmer** — draw progress bars under each vision card; time-based border glow pulse for `satisfied-here` state.
17. **Energy pip bloom** — track `_prevEnergy`; newly filled pips run a scale+colour spring animation.
18. **Pot memory strip → seed icons** — draw 14px seed icon images in place of dot circles.
19. **Walking screen controls** — separate Reverse/Fast Travel rows; move Auto-arrive alongside them (§B2/§C2); draw in Middle column.
20. **Encounter row slide-in** — `_knownEncounterIds` tracking; new rows translate in from `+24px` over ~300ms.

### Phase 3 — Rich visuals

21. **Surface texture overlay** — draw `texture-surface.png` tiled over card/panel regions using `ctx.createPattern()`.
22. **Section dividers** — draw the floral SVG divider image between sections in the left/middle columns.
23. **Travel parallax + travel meeple** — implement parallax layer `translateX` as `drawImage()` with fractional offset; add meeple bob. Solid-colour placeholder layers first.
24. **Embark picker → bottom-sheet overlay** — draw a darkening scrim over the full canvas, then the embark sheet above it with slide-up animation. Tapping the scrim closes the sheet.
25. **Connect screen: background, leaf drift, title shimmer** — `drawImage()` for background; leaf particle system with time-based positions; gold shimmer on title text via a moving gradient clip.
26. **Map route trace** — draw route segments with animated stroke progress; per-segment delay.
27. **Fast Travel activation flash** — brief white overlay rectangle at low opacity over the Middle column travel scene.

### Phase 4 — Polish and accessibility

28. **Card corners** — draw the corner flourish SVG at corners of vision cards and path rows.
29. **Tab bar texture** — draw `tab-bar-bg.png` behind the right-column tab bar.
30. **Record → move Music/Delete to Info tab** — with two-step delete confirmation drawn as an inline overlay prompt.
31. **`prefers-reduced-motion` check** — on startup, if `matchMedia('(prefers-reduced-motion: reduce)').matches`, set all animation durations to `0.01ms` throughout the render state so time-based animations skip to their end state instantly.

---

## 10. What Is Not Changing

- All game logic, server code, WebSocket protocol
- The 15 seed SVG files and all plant PNG images
- The visual intent of all colour tokens (values unchanged; mechanism moves from CSS vars to JS THEME object)
- The `startTravelAnim` / `stopTravelAnim` export contract (callers unchanged; internals replaced with canvas draw calls)
- All action names throughout the codebase — the canvas hit registry dispatches the same action strings, so game logic handlers need no changes
- The asset list in §5 — same files, same sizes, same content; they are now loaded via the preloader rather than CSS `url()` references
