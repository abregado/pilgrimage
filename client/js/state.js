window.Pilgrim = window.Pilgrim || {};

Pilgrim.State = (() => {
  let _state = {
    connected: false,
    activeTab: 'game',
    lastGameScreen: 'beacon', // 'beacon' | 'path' — tracks previous game screen for arrival
    serverTick: 0,
    lastUpdateTime: 0,
    pilgrimId: null,
    pilgrim: null,
    location: null,
    serverUrl: null,
  };

  const _listeners = [];

  function get() {
    return _state;
  }

  function set(partial) {
    Object.assign(_state, partial);
    _listeners.forEach(fn => fn(_state));
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i > -1) _listeners.splice(i, 1);
    };
  }

  function applyServerState(payload) {
    const prevPilgrim = _state.pilgrim;

    // Detect transition from path → beacon for arrival screen
    if (prevPilgrim && prevPilgrim.pathId && payload.pilgrim && !payload.pilgrim.pathId) {
      _state.lastGameScreen = 'path';
    } else if (payload.pilgrim && payload.pilgrim.pathId) {
      _state.lastGameScreen = 'path';
    } else if (_state.lastGameScreen !== 'path') {
      _state.lastGameScreen = 'beacon';
    }

    set({
      serverTick: payload.tick,
      lastUpdateTime: Date.now(),
      pilgrim: payload.pilgrim,
      location: payload.location,
    });
  }

  function estimateTick() {
    return Pilgrim.Utils.estimateTick(_state.serverTick, _state.lastUpdateTime);
  }

  function clearArrival() {
    _state.lastGameScreen = 'beacon';
    _listeners.forEach(fn => fn(_state));
  }

  return { get, set, subscribe, applyServerState, estimateTick, clearArrival };
})();
