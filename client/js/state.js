// Client-side state
let _state = null;         // last GardenerView from server
let _screen = 'connect';   // 'connect' | 'location' | 'path' | 'arrival'
let _tab = 'location';     // 'location' | 'map' | 'record'

let _selectedNurserySeedId = null;  // seed chosen for planting in nursery
let _selectedPotId = null;          // pot selected in the circular widget

export function setState(s) {
  // Reset per-location selections when the gardener changes location
  if (!_state || _state.gardener.locationId !== s.gardener.locationId) {
    _selectedNurserySeedId = null;
    _selectedPotId = null;
  }
  _state = s;
}

export function getState()  { return _state; }
export function getScreen() { return _screen; }
export function getTab()    { return _tab; }
export function setTab(t)   { _tab = t; }

export function getSelectedNurserySeedId()    { return _selectedNurserySeedId; }
export function setSelectedNurserySeedId(id)  { _selectedNurserySeedId = id; }
export function getSelectedPotId()            { return _selectedPotId; }
export function setSelectedPotId(id)          { _selectedPotId = id; }

// Derive screen from server state
export function updateScreenFromState() {
  if (!_state) { _screen = 'connect'; return; }
  const g = _state.gardener;
  if (g.state === 'arriving') _screen = 'arrival';
  else if (g.state === 'walking') _screen = 'path';
  else _screen = 'location';
}
