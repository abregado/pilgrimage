import { getOrCreateDeviceId } from './utils.js';
import { setState, setConnected, updateScreenFromState, setTab,
         getAutoArrive, clearJourneyLog,
         getPendingPickSeed, clearPendingPickSeed } from './state.js';
import { setServerTick } from './clock.js';
import { render } from './render.js';
import { startTravelAnim, stopTravelAnim } from './canvas/screens/location.js';

let ws = null;
let _prevGardenerState = null;

export function connect() {
  const deviceId = getOrCreateDeviceId();
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'connect', deviceId }));
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }

    if (msg.type === 'state') {
      setConnected(true);
      setState(msg.data);
      updateScreenFromState();
      const gardener = msg.data?.gardener;
      setServerTick(
        msg.data.tick,
        gardener?.energy ?? 0,
        gardener?.energyRegenAt ?? null,
        gardener?.energyMax ?? 0,
      );
      const newState = gardener?.state ?? null;

      // Auto-arrive: skip arrival screen
      if (newState === 'arriving' && getAutoArrive()) {
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

      if (newState === 'walking' && msg.data.path) {
        startTravelAnim(
          msg.data.path,
          msg.data.movementSpeed,
          gardener.speedBonus,
          msg.data.rulesSpeedBonus,
          gardener.fastTravel ?? false,
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
}

export function sendAction(action) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: action.type, ...action }));
}
