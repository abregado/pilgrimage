# v10 Plan

## Save-state impact summary
- **Will NOT reset.** Version bumps 9 → 10 with a real in-place migration (patches rule difficulties and descriptions from the updated templates; all gardener progress is preserved).
- New gardener fields (`availableSeeds`, `locationMemory`) are additive — existing gardeners start with `null`/`{}`.

---

## Changes by file

### A. `server/constants.js`
- Add six new POT duration constants (in ticks at 1s/tick): `POT_EMPTY_DURATION=1`, `POT_SEED_DURATION=60`, `POT_SEEDLING_DURATION=1200`, `POT_GROWN_DURATION=3600`, `POT_FRUITING_DURATION=18000`, `POT_DEAD_DURATION=1`
- `TENDING_DURATION` is no longer a single value — remove it (its import in actions.js will be replaced)

### B. `server/rules.js`
- Reword all template descriptions: "Discovered N locations where X…" → "N locations in the world have X…"
- Change difficulties: all 10 → 6, all 5 → 3 (the 8s stay)

### C. `server/state.js`
- Bump `CURRENT_VERSION` 9 → 10
- Replace the current wipe-everything migration with a real v9→v10 patch: for each gardener rule, look up its `templateId` in `RULE_TEMPLATE_MAP` and overwrite `rule.difficulty` and `rule.description` from the (now-updated) template
- `getGardenerView`: add `availableSeeds` and `locationMemory` to the returned gardener object

### D. `server/actions.js`
- `createOrRestoreGardener`: set `seed` to the origin seed of the spawn location; initialise `availableSeeds: null`, `locationMemory: {}`
- `walk`: before leaving, compute the nursery seedPool and store it as `gardener.availableSeeds`; snapshot `locData.pots` (all pots, id + seedId) into `gardener.locationMemory[locId]`
- `continuee`: clear `gardener.availableSeeds = null`
- `pot`: determine growth stage of the *existing* pot content before planting; pick tending duration from the corresponding `POT_*_DURATION` constant
- New `pickSeed(deviceId, seedId, state)`: valid while walking or arriving; validates seedId is in `gardener.availableSeeds`; sets `gardener.seed`

### E. `server/index.js`
- `connect` handler: only wake existing gardeners from sleep; for new devices, send back `{ type: 'state', data: null }` without creating a gardener
- New `join` message type → calls `createOrRestoreGardener` (creates the gardener)
- New `pick_seed` message type → calls `pickSeed`

### F. `client/js/state.js`
- Add `_connected = false` flag (set to true the first time we receive any state from server); export `getConnected()` / `setConnected()`

### G. `client/js/network.js`
- On receiving `'state'`: call `setConnected(true)` before `setState`

### H. `client/js/screens/connect.js`
- If `!getConnected()`: show "Connecting…" (existing behaviour)
- If `getConnected()` (= connected but no gardener): show title + "Become a Pilgrim" button (`data-action="join"`)

### I. `client/js/main.js`
- Add `case 'join'`: `sendAction({ type: 'join' })`
- Add `case 'pick_seed'`: `sendAction({ type: 'pick_seed', seedId: btn.dataset.seedId })`

### J. `client/js/screens/location.js`
- Remove section 4 (the entire Carrying / swap-chips block)
- In the Travel section, per destination:
  - Unvisited: add a "new" badge next to the destination name
  - Visited: show the origin seed symbol next to the name
  - Visited: below the path-info row, show a horizontal strip of all pots from `gardener.locationMemory[destId]` (small colored dots, empty pots shown as blank)

### K. `client/js/screens/path.js`
- Replace the static "Carrying" display with a seed-picker: list `gardener.availableSeeds`; the currently carried seed is highlighted; clicking any other seed fires `pick_seed`

### L. `client/js/screens/arrival.js`
- Same seed-picker widget as path.js (above the encounters, below the arrival name)

### M. `client/js/screens/map.js`
- Discovered locations: replace `<circle>` with a `<text>` element showing the origin seed's symbol at a larger size (e.g. font-size 22)
- Undiscovered adjacent locations: keep existing circles
- Tooltip for undiscovered (adjacent) locations: show `loc.name` instead of `'?'`
