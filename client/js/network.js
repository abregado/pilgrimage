import { getOrCreateDeviceId } from './utils.js';
import { setState, updateScreenFromState } from './state.js';
import { render } from './render.js';

let ws = null;

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
      setState(msg.data);
      updateScreenFromState();
      render();
    }
  };

  ws.onclose = () => {
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    // onclose will fire after onerror
  };
}

export function sendAction(action) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: action.type, ...action }));
}
