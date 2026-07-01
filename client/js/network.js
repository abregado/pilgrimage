import { getOrCreateDeviceId } from './utils.js';
import { setState, getState, setConnected, updateScreenFromState, setTab,
         clearJourneyLog, setLastError,
         getPendingPickSeed, clearPendingPickSeed } from './state.js';
import { setServerTick, liveTick } from './clock.js';
import { render } from './render.js';
import { startTravelAnim, stopTravelAnim } from './canvas/screens/location.js';
import { applyPredictedAction } from './predict.js';

let ws = null;
let _prevGardenerState = null;

// Optimistic-prediction bookkeeping — reset on every (re)connect, matching
// the server's own per-connection lastProcessedSeq reset (server/index.js).
let _seq = 0;
let _pending = [];             // [{seq, action}], oldest first
let _lastAuthoritative = null; // last GardenerView actually received from the server

export function connect() {
  const deviceId = getOrCreateDeviceId();
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  _seq = 0;
  _pending = [];
  _lastAuthoritative = null;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'connect', deviceId }));
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }

    if (msg.type === 'error') {
      _pending = _pending.filter(p => p.seq !== msg.seq);
      if (_lastAuthoritative) {
        setState(_replayPending(_lastAuthoritative));
        render();
      }
      setLastError(msg.message);
      return;
    }

    if (msg.type === 'state') {
      setConnected(true);

      _lastAuthoritative = msg.data;
      const view = msg.data ? _reconcile(msg.data) : null;

      setState(view);
      updateScreenFromState();
      const gardener = view?.gardener;
      setServerTick(
        view?.tick ?? 0,
        gardener?.energy ?? 0,
        gardener?.energyRegenAt ?? null,
        gardener?.energyMax ?? 0,
      );
      const newState = gardener?.state ?? null;

      // Arrival is instantaneous from the player's perspective — there is no
      // arrival screen, so immediately confirm arrival server-side.
      if (newState === 'arriving') {
        clearJourneyLog();
        sendAction({ type: 'continue' });
        _prevGardenerState = newState;
        return;
      }

      // Switch to location/map tab when walking begins
      if (newState === 'walking' && _prevGardenerState !== 'walking') {
        setTab('map');
      }

      render();

      if (newState === 'walking' && view.path) {
        startTravelAnim(
          view.path,
          view.movementSpeed,
          gardener.speedBonus,
          view.rulesSpeedBonus,
        );
        const pending = getPendingPickSeed();
        if (pending && pending !== gardener.seed &&
            gardener.availableSeeds?.includes(pending)) {
          sendAction({ type: 'pick_seed', seedId: pending });
        }
        clearPendingPickSeed();
      } else {
        stopTravelAnim();
      }

      _prevGardenerState = newState;
    }
  };

  ws.onclose = () => {
    stopTravelAnim();
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    // onclose fires after onerror
  };
};

// Drops acknowledged pending actions (seq <= server's lastProcessedSeq for us)
// and replays whatever's left on top of the fresh authoritative view.
function _reconcile(authoritativeView) {
  const lastProcessedSeq = authoritativeView.gardener?.lastProcessedSeq ?? 0;
  _pending = _pending.filter(p => p.seq > lastProcessedSeq);
  return _replayPending(authoritativeView);
}

function _replayPending(baseView) {
  let view = baseView;
  for (const p of _pending) {
    const replayed = applyPredictedAction(view, p.action, view.tick);
    if (replayed) view = replayed;
  }
  return view;
}

export function sendAction(action) {
  if (!ws || ws.readyState !== 1) return;
  const seq = ++_seq;

  const predicted = applyPredictedAction(getState(), action, liveTick());
  if (predicted) {
    _pending.push({ seq, action });
    setState(predicted);
    render();
  }

  ws.send(JSON.stringify({ type: action.type, ...action, seq }));
}
