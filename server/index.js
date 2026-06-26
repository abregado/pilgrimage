import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initState, getState, getGardenerView } from './state.js';
import { loadState, saveState } from './persistence.js';
import { startGameLoop } from './gameLoop.js';
import * as actions from './actions.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve assets and client
app.use('/assets', express.static('./assets'));
app.use(express.static('./client'));

// Map: deviceId → ws
const clients = new Map();

function sendToClient(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast() {
  for (const [deviceId, ws] of clients) {
    const view = getGardenerView(deviceId);
    if (view) sendToClient(ws, { type: 'state', data: view });
  }
}

wss.on('connection', (ws) => {
  let deviceId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'connect') {
      deviceId = msg.deviceId;
      clients.set(deviceId, ws);
      actions.createOrRestoreGardener(deviceId, getState());
      saveState(getState());
      sendToClient(ws, { type: 'state', data: getGardenerView(deviceId) });
      return;
    }

    if (!deviceId) return;

    const state = getState();
    let result = { ok: false };

    if (msg.type === 'sing')        result = actions.sing(deviceId, msg.potId, state);
    else if (msg.type === 'pot')    result = actions.pot(deviceId, msg.potId, state);
    else if (msg.type === 'take_origin') result = actions.takeOrigin(deviceId, state);
    else if (msg.type === 'undo_take')   result = actions.undoTake(deviceId, state);
    else if (msg.type === 'walk')   result = actions.walk(deviceId, msg.pathId, state);
    else if (msg.type === 'reverse') result = actions.reverse(deviceId, state);
    else if (msg.type === 'take_seed') result = actions.takeSeed(deviceId, msg.fromId, state);
    else if (msg.type === 'continue')   result = actions.continuee(deviceId, state);
    else if (msg.type === 'poll')   result = { ok: true };

    if (result.ok) {
      saveState(state);
      broadcast();
    } else {
      sendToClient(ws, { type: 'error', message: result.error });
    }
  });

  ws.on('close', () => {
    if (deviceId) clients.delete(deviceId);
  });

  ws.on('error', () => {
    if (deviceId) clients.delete(deviceId);
  });
});

// Start game loop
initState(loadState());
startGameLoop(getState, saveState, broadcast);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Verdant running on http://localhost:${PORT}`));
