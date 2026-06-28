# Performance & Rendering Refactor Plan

**Problem statement:** The client rebuilds the entire `#app` DOM (`app.innerHTML = html`)
on **every** server `state` message. The server pushes a fresh state to every
non-walking client **every 1 second** (the game-loop tick), regardless of whether
anything in that client's view actually changed. The result: buttons get torn out
from under a finger mid-press, `:active`/`:hover`/`:focus` states evaporate, CSS
transitions and animations restart, selection highlights flash, and scroll position
resets — once per second, forever, while idle.

This document is a staged plan to fix it. It does **not** change game rules, the
WebSocket protocol's *meaning*, or the zero-dependency constraint (server: only
`express` + `ws`; client: no packages). Every phase is independently shippable and
ordered by **return-on-effort**: Phase 1 alone should eliminate the great majority
of the visible jank.

---

## 1. Diagnosis — exactly where the churn comes from

### 1a. The full-replace render

`client/js/render.js`:

```js
export function render() {
  const app = document.getElementById('app');
  ...
  else renderLocation(app);   // → app.innerHTML = html
}
```

Every screen renderer (`location.js`, `arrival.js`, `connect.js`) terminates in a
single `app.innerHTML = "..."`. This is a **destroy-and-recreate** of every node:
the browser discards the old subtree (and all its transient UI state) and parses a
new one. Nothing is reused, nothing is diffed.

This fires from **two** triggers:

1. **Server push** — `network.js` `ws.onmessage` → `render()` on every `state` msg.
2. **Local interaction** — `main.js` calls `render()` after `tab`, `select_pot`,
   `select_nursery_seed`, `select_map_loc`, `select_embark_seed`, etc. These are
   *client-only* state changes that still trigger a **full** rebuild.

So even a purely local "select a pot" tap rebuilds the whole screen — which is why
the highlight feels laggy and animations restart on interaction too.

### 1b. The 1-second broadcast storm

`server/gameLoop.js`:

```js
for (const [deviceId, g] of Object.entries(state.gardeners)) {
  idToDevice[g.id] = deviceId;
  if (g.state !== 'walking') notifySet.add(deviceId);   // ← every idle player, every tick
}
...
broadcast(notifySet);   // step 11
```

Every resting / arriving / sleeping gardener is added to `notifySet`
**unconditionally, every tick**. But look at what actually changes for an idle
player on a given tick:

| Thing that could change      | How often it really changes                |
|------------------------------|--------------------------------------------|
| Energy regen (`+1`)          | once per `ENERGY_REGEN_TICKS` (1000 ticks) |
| `energyMax`                  | only at age/rule/explore milestones        |
| Rule completion / expiry     | rare; gated by 24–72 h safe periods        |
| Sleep transition             | once, after 6 h idle                       |
| Pots at this location        | only when someone acts                     |
| `tick` (the number itself)   | **every tick** — but only used for countdowns |

The **only** field that changes every second is `tick`, and the client only needs
it to render countdown text ("+1 in 4m 12s", "seedling in 2h", "~3m remaining").
That is a clock-display problem, not a state-sync problem — and it does not require
the server to push, nor the DOM to be rebuilt.

**Conclusion:** ~99% of idle re-renders carry no new information. The walking path
already proved the fix works — walkers are excluded from per-tick broadcasts and
animate locally with `requestAnimationFrame`. We generalize that pattern.

---

## 2. Design principles

1. **Server pushes only on real change.** A client receives a `state` message when
   something in *its* view actually differs — never "because a second elapsed."
2. **Time is computed, not pushed.** The client derives the live tick from a local
   clock anchored to the last server tick. Countdowns tick smoothly client-side.
3. **Predict the deterministic, reconcile with the authoritative.** Movement,
   energy regen timing, and growth stages are pure functions of elapsed time and
   known constants; the client can compute them and correct itself when a real
   server message arrives.
4. **Update on interaction, locally.** A tab switch or pot selection is a
   client-only concern; it should patch the affected nodes, not rebuild the page,
   and never round-trip to the server.
5. **Never tear down the node being touched.** Patch text/classes/attributes in
   place; only add/remove DOM where the data structure genuinely changed.
6. **Keep a persistent animation surface.** Anything that moves continuously
   (travel scene, pots) lives on a long-lived canvas/SVG that is never replaced by
   a render; renders mutate a model the animation loop reads.

---

## 3. The plan, in layers

Each layer is shippable on its own. Phases 1–2 are pure wins with low risk.
Phases 3–4 are larger architectural moves with clear payoff but more surface area.

### Phase 1 — Stop the needless work (highest ROI, lowest risk)

**Goal:** Kill ~all idle re-renders without changing how anything renders yet.

#### 1A. Per-gardener change detection on the server

In `gameLoop.js`, stop pre-populating `notifySet` with every non-walking gardener.
Instead, add a gardener to `notifySet` **only when their view actually changed**
this tick. Two viable mechanisms:

- **Dirty flags (preferred, cheap):** the loop already knows when it mutates a
  gardener (energy regen, `energyMax` sync, rule completion/expiry, sleep, arrival,
  encounter, pot changes at their location). Add `notifySet.add(deviceId)` at each
  of those specific mutation sites (several already do this for walkers). Remove the
  blanket `if (g.state !== 'walking') notifySet.add(...)`.
- **View signature (fallback / safety net):** compute `getGardenerView(deviceId)`,
  hash a stable serialization, compare to the last broadcast hash per device, send
  only on difference. Simpler to reason about but does redundant view-building.

> Subtlety: "pots at my location changed" must notify *all resting gardeners at that
> location*, not just the actor. The action-triggered `broadcast()` in `index.js`
> already covers the actor; the loop must flag co-located resting gardeners when a
> pot's state changes (settling expiry, dead-pot cleanup). Map locationId → resting
> deviceIds once per tick and flag them on any pot mutation there.

**Effect:** A resting player drops from **60 full rebuilds/minute to roughly zero**,
with a real `state` message only at genuine events (regen, rule change, a neighbor
planting, etc.). This alone should resolve the reported button/animation
interference for resting players, because the DOM simply stops being rebuilt under
them.

#### 1B. Client-side clock for countdowns

Today the client reads `state.tick` for every countdown and only gets a fresh value
via a push. Replace with a local clock:

```js
// On each 'state' message:
_serverTick    = msg.data.tick;
_serverTickAt  = performance.now();

// Anywhere a countdown is needed:
function liveTick() {
  return _serverTick + Math.floor((performance.now() - _serverTickAt) / 1000);
}
```

A single low-frequency updater (one `setInterval(…, 250)` **or** a shared RAF loop)
walks a small set of registered countdown elements and sets their `textContent`
only — no `innerHTML`, no rebuild. Energy regen ETA, pot settling, growth
"next stage in", and travel ETA all switch to `liveTick()`.

This decouples "the clock advanced" from "the DOM was rebuilt." Even before Phase 2,
countdowns animate every frame while the structure stays put.

#### 1C. Predict energy regen locally

The client already receives `energyRegenAt` and knows `ENERGY_REGEN_TICKS`. When
`liveTick()` crosses `energyRegenAt` and `energy < energyMax`, the client can
optimistically fill one pip (and recompute the next boundary) without waiting for a
push. The next authoritative `state` message reconciles. This removes the only
remaining *data* reason to push idle players on a tick boundary.

**Phase 1 deliverables:** server change-detection in `gameLoop.js`; `liveTick()` +
countdown updater in client `state.js`/a new `clock.js`; energy-regen prediction.
No rendering-structure changes yet.

---

### Phase 2 — Targeted DOM updates instead of full replace

**Goal:** When a `state` message *does* arrive, and when the user interacts locally,
patch only what changed.

#### 2A. Section-structured, idempotent renderers

Break `renderLocation` into a fixed scaffold rendered **once** per screen-entry,
with stable container ids, plus per-section updater functions:

```
#screen-content
  #top-bar          → updateTopBar(state)
  #energy-bar       → updateEnergyBar(state)      (also driven by the clock)
  #pots-wheel       → updatePots(state, selection)
  #nursery          → updateNursery(state, selection)
  #vision           → updateVision(state)
  #travel           → updateTravel(state)
```

Each `update*` is **idempotent**: it sets `textContent`, toggles classes, and
adds/removes keyed children (pots and seeds have stable ids). It does **not** rebuild
its container. The scaffold (and thus the click targets) persists across updates, so
a press is never interrupted.

The single delegated click handler in `main.js` already survives re-render (it's
attached to `#app` once) — keep it exactly as is. It keeps working because we stop
replacing `#app`'s subtree wholesale.

#### 2B. Local interactions patch, never round-trip, never full-render

`select_pot`, `select_nursery_seed`, `select_map_loc`, `tab`, `select_embark_seed`
are client-only. Replace their `render()` calls with targeted updates:

- selecting a pot → toggle `.selected` on the two affected pot nodes and
  re-render only the pot-detail drawer; nothing else moves.
- selecting a nursery seed → toggle `.planting-selected` on two seed buttons and
  update the hint line.
- switching tabs → swap the right-panel content container only.

This removes the "selection feels laggy / things flash when I tap" class of bug
entirely, independent of the server.

#### 2C. Diff strategy (framework-free)

Two reasonable implementations, no dependencies either way:

- **Hand-written updaters (recommended):** explicit `update*` functions as above.
  Most predictable, smallest footprint, matches the existing hand-rolled style.
- **Tiny keyed-list helper:** a ~30-line `reconcileChildren(container, items, keyFn,
  renderItem, updateItem)` utility for the pots ring, nursery grid, vision list, and
  encounter list. Worth adding once and reusing; avoids bespoke add/remove logic in
  four places.

Avoid pulling in a VDOM library — it violates the zero-dep client rule and is
overkill for this surface area.

---

### Phase 3 — Canvas for the high-churn, animated widgets

**Goal:** Move the genuinely *animated and dense* visuals onto a persistent
`<canvas>` drawn by a single RAF loop, fully decoupled from state pushes. State
updates mutate a plain model object; the canvas reads it each frame. The canvas
element itself is created once and never torn down by a render.

#### 3A. Travel scene → canvas

The travel view already runs a RAF loop (`startTravelAnim` in `location.js`) and
already mutates SVG attributes each frame. Promote it to a canvas:

- Draw the parallax layers (per `ui-plan.md` §3), the path, and the meeple on one
  canvas sized to the container.
- The RAF loop reads `{ progress, length, effectiveSpeed, goingRight, fastTravel }`
  from a model; a `state` message only updates that model (e.g. on Fast Travel
  activation it re-anchors `effectiveSpeed`), it never rebuilds the scene.
- ETA text stays a DOM node updated from `liveTick()` (canvas text is avoidable).

Benefit: smooth 60 fps motion that is immune to any surrounding re-render, and the
parallax/meeple bobbing from the UI plan come "for free" on the same surface.

#### 3B. Pots wheel → canvas

The pots wheel is the densest interactive widget: N pot buttons, plant images, seed
overlays, decorator dots, a selection ring, and (per `ui-plan.md` A3) plantable-pulse
animations. Today every server tick rebuilt all of it.

- Render pots, plants, overlays, decorator dots, and selection/pulse rings on a
  single canvas via RAF.
- **Hit-testing:** positions are already computed analytically (`angle`, `px`, `py`
  in `renderPotsWheel`). Reuse that geometry: on click, map pointer coords →
  nearest pot within radius. One canvas click listener replaces N buttons.
- The pot **detail drawer / action buttons** stay as real DOM (they need accessible,
  44px+ tappable buttons with energy-cost labels and disabled states — bad fits for
  canvas). Only the *wheel visualization* goes to canvas.

> Trade-off to accept consciously: canvas loses DOM accessibility, text selection,
> and CSS theming for whatever moves onto it. So the rule is: **canvas only for the
> continuously-animated visualization; DOM for anything that is a form control,
> label, or list the player reads.** Pots wheel and travel scene qualify; nursery,
> vision cards, travel-path list, record/info tabs do **not** — leave them as DOM
> patched by Phase 2.

#### 3C. Map (optional)

The map is already SVG with its own RAF (`stopMapTravelAnim` etc.) and is not a
per-second-churn problem once Phase 1 lands. Leave it as SVG unless profiling shows
a need; SVG hit-testing via `data-action` is already clean here.

---

### Phase 4 — Make the server tick event-driven / coarser

**Goal:** Reduce server-side work and the *frequency* of any push at all. After
Phases 1–3 the client no longer depends on a 1 Hz push, which frees the server to
stop simulating every second.

Most game quantities are slow or analytically predictable:

- **Growth stages** are already computed on read from `lastPlantedTick` — they need
  no per-tick mutation at all. (The loop only writes `seedLog` observations and
  dead-pot cleanup.)
- **Energy** could be derived from a `lastRegenAnchor` on read in `getGardenerView`
  rather than mutated every 1000 ticks.
- **Walkers' progress** is `departTick`-relative at constant speed per leg; it can be
  computed on read too, with a re-anchor when Fast Travel toggles mid-leg.
- **Arrivals** happen at a *predictable* tick (`length / effectiveSpeed`). Instead of
  polling each tick, schedule them with `setTimeout` and re-broadcast then.
- **Encounters** between two walkers on a path with known speeds and start times
  cross at a computable tick — schedule the crossing instead of scanning pairwise
  every second.

End state options (pick based on appetite):

- **Conservative:** keep the 1 s `setInterval` for simulation but it only *persists
  and broadcasts on transitions* (already true after Phase 1). Lowest risk.
- **Coarse tick:** raise the interval to 5–10 s for the slow housekeeping (sleep
  checks, rule evaluation, energyMax sync), since nothing the player sees depends on
  1 s granularity once countdowns are client-side.
- **Fully event-driven:** drop the periodic loop; schedule arrivals/encounters/regen
  with timers and compute derived fields on read. Largest change; biggest reduction
  in idle server work; keep a slow heartbeat (e.g. 30–60 s) for safety/persistence.

This phase is about cost and scalability, not the visible jank — sequence it last.

---

## 4. Recommended sequencing & expected impact

| Phase | Change | Effort | Risk | Fixes the jank? |
|-------|--------|--------|------|-----------------|
| **1** | Server change-detection + client clock + regen prediction | S–M | Low | **Most of it** — idle rebuilds stop |
| **2** | Section updaters; local interactions patch in place | M | Low–Med | Selection/interaction jank gone |
| **3** | Canvas for travel scene + pots wheel | M–L | Med | Smooth motion, immune to renders |
| **4** | Event-driven / coarser server tick | L | Med | Server cost & scaling (not jank) |

**Do Phase 1 first and re-test.** It is plausible the reported symptom is fully
resolved there, because the DOM simply stops being rebuilt under the user's hands.
Phases 2–3 then make the *necessary* updates (real events, local interactions)
buttery rather than coarse.

---

## 5. Compatibility & constraints

- **Zero dependencies preserved.** No client packages, no VDOM lib; server stays on
  `express` + `ws`. All new code is hand-rolled ES modules.
- **WS protocol largely unchanged.** Message *types* and *shapes* stay the same; only
  the *cadence* of `state` messages changes (fewer, event-driven). The optional
  `poll` no-op still works as a manual refresh. If Phase 4 adds derived-on-read
  fields, `getGardenerView` already centralizes that.
- **Migrations.** None required for Phase 1–2. Phase 4's derived-energy/anchored-walk
  approach may add anchor fields (`lastRegenAnchor`, `departTick`) — handle via the
  existing `migrate()` in `server/state.js` and bump the state version.
- **Single delegated click handler stays.** `main.js`'s `#app` listener is already
  render-survivable; Phase 2 makes that property load-bearing instead of incidental.
- **Plays well with `ui-plan.md`.** That plan's parallax travel scene (§3), travel
  meeple (§2b), pot-drawer (§A2), plantable-pulse (§A3), and `prefers-reduced-motion`
  rule (§8) all land naturally on the canvas/patched-DOM architecture here. Build the
  performance scaffolding first so the UI animations attach to a stable surface.

---

## 6. Concrete first-PR checklist (Phase 1)

1. `server/gameLoop.js`: remove the blanket non-walking `notifySet.add`; add
   `notifySet.add(deviceId)` at each real mutation site (regen, energyMax change,
   rule completion/expiry, sleep, arrival, encounter). Flag co-located resting
   gardeners on any pot mutation (settling expiry, dead-pot cleanup).
2. `server/gameLoop.js`: optionally gate `saveState` the same way (already behind the
   `changed` flag — verify it doesn't over-trigger).
3. `client/js/state.js` (or new `client/js/clock.js`): add `_serverTick`,
   `_serverTickAt`, `liveTick()`, and a 250 ms updater that refreshes registered
   countdown text nodes only.
4. `client/js/network.js`: set the clock anchor on each `state` message.
5. Client countdown call sites (`renderEnergyBar`, pot settling/next-stage, travel
   ETA): read `liveTick()` instead of `state.tick`.
6. Energy-regen prediction at the clock boundary; reconcile on next `state`.
7. **Test:** sit idle on the location screen and confirm `state` messages arrive only
   on real events (instrument `ws.onmessage`), countdowns still tick every second,
   and a button press is no longer interrupted.
