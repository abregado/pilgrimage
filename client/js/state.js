// Client-side state
let _state = null;         // last GardenerView from server
let _connected = false;    // true once any 'state' message received from server
let _screen = 'connect';   // 'connect' | 'location' | 'arrival'
let _tab = 'location';     // 'location' | 'map' | 'record' | 'info'

let _selectedNurserySeedId = null;  // seed chosen for planting in nursery
let _selectedPotId = null;          // pot selected in the circular widget
let _selectedMapLocId = null;       // location selected on the map

// Embark flow: pre-walk seed selection
let _embarkingPathId = null;   // pathId being considered; null = not in embark mode
let _embarkChosenSeed = null;  // seed chosen for embark picker

// Seed to auto-pick once walking state arrives from server
let _pendingPickSeed = null;

// Session-based journey log (resets on page load)
let _journeyLog = [];
let _baseWanderingsLen = null;

export function setState(s) {
  // On location change: reset pot selection and pre-select carried seed in nursery
  if (s && (!_state || _state.gardener.locationId !== s.gardener.locationId)) {
    _selectedNurserySeedId = s.gardener.seed ?? null;
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

export function getJourneyLog()   { return _journeyLog; }
export function clearJourneyLog() { _journeyLog = []; }

export function getConnected()    { return _connected; }
export function setConnected(v)   { _connected = v; }

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

// Embark flow helpers
export function getEmbarkingPathId()  { return _embarkingPathId; }
export function getEmbarkChosenSeed() { return _embarkChosenSeed; }
export function startEmbarking(pathId, defaultSeed) {
  _embarkingPathId = pathId;
  _embarkChosenSeed = defaultSeed;
}
export function setEmbarkChosenSeed(seedId) { _embarkChosenSeed = seedId; }
export function clearEmbarking() {
  _embarkingPathId = null;
  _embarkChosenSeed = null;
}

// Pending seed pick after walk action
export function getPendingPickSeed()        { return _pendingPickSeed; }
export function setPendingPickSeed(seedId)  { _pendingPickSeed = seedId; }
export function clearPendingPickSeed()      { _pendingPickSeed = null; }

// Auto-arrive preference (localStorage)
export function getAutoArrive()    { return localStorage.getItem('autoArrive') === 'true'; }
export function setAutoArrive(v)   { localStorage.setItem('autoArrive', v ? 'true' : 'false'); }

// Derive screen from server state
export function updateScreenFromState() {
  if (!_state) { _screen = 'connect'; return; }
  const g = _state.gardener;
  if (g.state === 'arriving') _screen = 'arrival';
  else _screen = 'location';
}
