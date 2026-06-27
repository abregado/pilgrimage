# Architecture

## Stack

Node.js server, vanilla JS client, WebSockets (ws library), no framework. Run with `npm start`. Served on port 3000 (or `$PORT`).

## File Layout

```
server/
  index.js          WS server, message routing
  state.js          In-memory state, getGardenerView(), migration
  actions.js        All mutation functions
  gameLoop.js       setInterval tick (1s)
  persistence.js    loadState / saveState → server/data/state.json
  constants.js      Numeric constants
  rules.js          Vision template definitions + picker functions
  seeds.js          SEEDS array + SEED_MAP
  world.js          LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP

client/
  index.html
  css/main.css
  js/
    main.js         Single delegated click handler, connect() call
    network.js      WebSocket client, sendAction()
    render.js       Top-level render() dispatcher
    state.js        Client state (_state, _screen, _tab, selections, _connected)
    utils.js        formatDistance, formatDuration, getOrCreateDeviceId
    meeple.js       renderMeeple(state) → SVG/HTML snippet
    audio.js        Music toggle
    seeds.js        SEEDS + SEED_MAP (mirrors server)
    world.js        LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP (mirrors server)
    screens/
      connect.js    renderConnect(app)
      location.js   renderLocation(app)  ← main location/map/record tabs
      path.js       renderPath(app)
      arrival.js    renderArrival(app)
      map.js        renderMap(container, state)  ← called by location.js
      record.js     renderRecord(container, state)
```

## Request / Response Flow

1. Client opens WebSocket.
2. Client sends `{ type: 'connect', deviceId }`.
3. Server checks for existing gardener:
   - Exists → wake from sleep, reply `{ type: 'state', data: GardenerView }`.
   - New device → reply `{ type: 'state', data: null }`.
4. Client sets `_connected = true`, renders connect screen with "Become a Pilgrim" button.
5. User clicks join → client sends `{ type: 'join' }`.
6. Server calls `createOrRestoreGardener`, broadcasts updated views.
7. All subsequent actions follow the same pattern: client sends action → server mutates state → `broadcast()` pushes new GardenerView to every connected client.

## Screen Routing (client)

`_screen` in `client/js/state.js` drives which render function fires.  
Derived in `updateScreenFromState()` from `gardener.state`:

| `_state`       | `gardener.state`      | `_screen`  |
|----------------|-----------------------|------------|
| `null`         | —                     | `connect`  |
| set            | `arriving`            | `arrival`  |
| set            | `walking`             | `path`     |
| set            | `resting` / `tending` / `sleeping` | `location` |

`_tab` (location / map / record) is a sub-selection within the `location` screen; preserved across state updates.

## Persistence

State is written to `server/data/state.json` on every mutation. Loaded at startup, migrated if `version` field differs from `CURRENT_VERSION` (currently 10).
