// Client-side state
let _state = null;         // last GardenerView from server
let _connected = false;    // true once any 'state' message received from server
let _screen = 'connect';   // 'connect' | 'location' | 'arrival'
let _tab = 'location';     // 'location' | 'map' | 'record'

let _selectedNurserySeedId = null;  // seed chosen for planting in nursery
let _selectedPotId = null;          // pot selected in the circular widget
let _selectedMapLocId = null;       // location selected on the map

// Session-based journey log (resets on page load)
let _journeyLog = [];
let _baseWanderingsLen = null;

export function setState(s) {
  if (s && (!_state || _state.gardener.locationId !== s.gardener.locationId)) {
    _selectedNurserySeedId = null;
    _selectedPotId = null;
  }

  // Track which locations the gardener visits this session
  if (s) {
    const newLen = s.record?.wanderings?.length ?? 0;
    if (_baseWanderingsLen === null) {
      _baseWanderingsLen = newLen;
    } else if (_state) {
      const prevLen = _state.record?.wanderings?.length ?? 0;
      for (let i = prevLen; i < newLen; i++) {
        _journeyLog.push(s.record.wanderings[i]);
      }
    }
  }

  _state = s;
}

export function getJourneyLog() { return _journeyLog; }

export function getConnected() { return _connected; }
export function setConnected(v) { _connected = v; }

export function getState()  { return _state; }
export function getScreen() { return _screen; }
export function getTab()    { return _tab; }
export function setTab(t)   {
  if (t !== 'map') { _selectedMapLocId = null; }
  _tab = t;
}

export function getSelectedNurserySeedId()    { return _selectedNurserySeedId; }
export function setSelectedNurserySeedId(id)  { _selectedNurserySeedId = id; }
export function getSelectedPotId()            { return _selectedPotId; }
export function setSelectedPotId(id)          { _selectedPotId = id; }
export function getSelectedMapLocId()         { return _selectedMapLocId; }
export function setSelectedMapLoc(locId)      { _selectedMapLocId = locId; }
export function clearSelectedMapLoc()         { _selectedMapLocId = null; }

// Derive screen from server state
export function updateScreenFromState() {
  if (!_state) { _screen = 'connect'; return; }
  const g = _state.gardener;
  if (g.state === 'arriving') _screen = 'arrival';
  else _screen = 'location'; // walking, resting, tending, sleeping all use location screen
}
