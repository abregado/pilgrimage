# Architecture

## Stack

Node.js server (Express + `ws`), vanilla JS client rendered entirely on an HTML5 `<canvas>` (no DOM UI, no framework). Run with `npm start`. Served on port 3000 (or `$PORT`).

## File Layout

```
server/
  index.js          HTTP + WS server, message routing, broadcast scoping
  state.js          In-memory state, getGardenerView(), computeEnergyMax(), migration
  actions.js        All mutation functions (incl. Dendriport teleport actions)
  gameLoop.js       setInterval tick (1s)
  persistence.js    loadState / saveState → server/data/state.json
  constants.js      Numeric constants
  rules.js          Vision template definitions + picker functions
  seeds.js          SEEDS array + SEED_MAP
  world.js          LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP

client/
  index.html        Canvas host + loading screen (script type="module" src="/js/main.js")
  css/main.css       Minimal — canvas sizing + loading screen only, no UI styling
  js/
    main.js          boot() sequence + dispatch(action, data) — the one input→action switch
    network.js       WebSocket client, sendAction() with seq-based optimistic prediction; startTrafficPoll() polls every 5s while the map tab is open to refresh nearbyTraffic
    predict.js       Client-side optimistic reducers (mirrors a subset of server/actions.js)
    render.js        renderFrame(ctx, W, H) dispatcher (connect vs location screen)
    state.js         Client state (_state, _screen, _tab, selections, embark flow, journey log)
    clock.js         liveTick() — extrapolates ticks/energy regen between server broadcasts
    growth.js        Shared pot growth-stage / energy-cost math (mirrors server)
    utils.js         formatDuration, formatAge, formatDistance, getOrCreateDeviceId
    audio.js         Music toggle (localStorage-persisted)
    seeds.js         SEEDS + SEED_MAP (mirrors server/seeds.js exactly)
    world.js         LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP (mirrors server/world.js exactly)
    canvas/
      engine.js      RAF loop, DPR scaling, resize handling, dirty-flag invalidate()
      input.js       Hit-region registry + mouse/touch/scroll/swipe handling, dispatches actions
      theme.js       Dark/light theme color constants + toggle (localStorage-persisted)
      assets.js      Image preloader (plant stages, seed icons, nav icons, pilgrim sprite)
      draw.js        Drawing primitives (rect/circle/text/wrapped text/scroll clip/tint)
      anim.js        Time-based animation helpers (pulse, bob, easing, spring)
      meeple.js       Tinted meeple sprite renderer (state → color)
      layout.js      Column/page layout: 3-col desktop, 2-col narrow desktop, 3-page mobile swipe
      screens/
        connect.js     renderConnect(ctx, W, H) — join screen
        location.js    renderLocation(ctx, W, H) — orchestrator, travel animation, embark overlay
        left-col.js    Vision cards column (folds into a tab on narrow desktop windows)
        middle-col.js  Pots wheel + drawer + nursery (resting), or travel scene + controls (walking)
        map-tab.js     World map tab — Dijkstra route preview, pot-memory tooltip
        record-tab.js  Record tab — age, energy milestones, vision summary, seed log, settings
        info-tab.js    Static help tab
```

**Legacy, unused**: `client/js/screens/*.js` and `client/js/meeple.js` are the pre-canvas DOM-rendered UI. They are not imported by `main.js` or `render.js` and are dead code, retained but not maintained.

## Request / Response Flow

1. Client opens WebSocket.
2. Client sends `{ type: 'connect', deviceId }`.
3. Server checks for existing gardener:
   - Exists → wake from sleep, reply `{ type: 'state', data: GardenerView }`.
   - New device → reply `{ type: 'state', data: null }`.
4. Client sets `_connected = true`, renders the connect screen with a "Become a Pilgrim" button.
5. User clicks join → client sends `{ type: 'join', seq }`.
6. Server calls `createOrRestoreGardener`, broadcasts updated views to affected clients.
7. All subsequent gardener-action messages carry a monotonically increasing `seq`. The client applies an optimistic local prediction (`client/js/predict.js`) immediately and renders it, then sends the action to the server. When the authoritative `state` message arrives, the client drops any predictions the server has already processed (via `lastProcessedSeq`) and replays the rest on top. See `docs/ws-protocol.md` for the full reconciliation protocol.
8. Broadcasts are scoped, not global — see "Action broadcast scoping" in `ws-protocol.md`.

## Screen Routing (client)

There is no dedicated `arrival` screen — `network.js` immediately confirms arrival server-side (`sendAction({ type: 'continue' })`) the instant `gardener.state === 'arriving'` arrives, so it never renders. `_screen` in `client/js/state.js` is therefore only ever:

| `_state`       | `_screen`  |
|----------------|------------|
| `null`         | `connect`  |
| set            | `location` |

The `location` screen (`renderLocation`) covers `resting`, `walking`, and the instantaneous `arriving` transition. `_tab` (`location` / `map` / `record` / `info`, plus `vision` on narrow desktop windows where the left column folds into the tab bar) is a sub-selection preserved across state updates.

## Persistence

State is written to `server/data/state.json` on every mutation. Loaded at startup, migrated if `version` field differs from `CURRENT_VERSION` (currently 17).
