// Client-side state
let _state = null;         // last GardenerView from server
let _screen = 'connect';   // 'connect' | 'location' | 'path' | 'arrival'
let _tab = 'location';     // 'location' | 'map' | 'record'

export function setState(s) { _state = s; }
export function getState() { return _state; }
export function getScreen() { return _screen; }
export function getTab() { return _tab; }
export function setTab(t) { _tab = t; }

// Derive screen from server state
export function updateScreenFromState() {
  if (!_state) { _screen = 'connect'; return; }
  const g = _state.gardener;
  if (g.state === 'arriving') _screen = 'arrival';
  else if (g.state === 'walking') _screen = 'path';
  else _screen = 'location';
}
