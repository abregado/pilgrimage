import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initState, getState, getGardenerView, nonWalkingDeviceIdsAtLocation } from './state.js';
import { loadState, saveState } from './persistence.js';
import { startGameLoop } from './gameLoop.js';
import * as actions from './actions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// No-cache headers for all responses
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve server constants to client as an ES module
app.get('/js/constants.js', (_req, res) => {
  res.sendFile(join(__dirname, 'constants.js'));
});

// Serve assets and client
app.use('/assets', express.static('./assets'));
app.use(express.static('./client'));

// Map: deviceId → ws
const clients = new Map();

// Map: deviceId → highest action seq number processed for that device.
// Reset on connect, dropped on disconnect — purely a per-session reconciliation
// aid for the client's optimistic-prediction replay, never persisted.
const lastProcessedSeqByDevice = new Map();

// Action types whose effects are visible to other gardeners currently at the
// *resulting* location (pots/otherGardeners/seedPool all location-scoped).
const LOCATION_SCOPED_CURRENT = new Set(['decorate', 'undecorate', 'pot', 'swap', 'continue', 'join']);
// Action types that remove the actor from a location — the location being
// *left* needs to know, not the (not-yet-arrived) destination.
const LOCATION_SCOPED_LEAVE = new Set(['walk', 'queue_travel']);

function sendToClient(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(deviceIdsFilter = null) {
  for (const [deviceId, ws] of clients) {
    if (deviceIdsFilter !== null && !deviceIdsFilter.has(deviceId)) continue;
    const view = getGardenerView(deviceId);
    if (view) {
      view.gardener.lastProcessedSeq = lastProcessedSeqByDevice.get(deviceId) ?? 0;
      sendToClient(ws, { type: 'state', data: view });
    }
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
      lastProcessedSeqByDevice.set(deviceId, 0);
      const connectState = getState();
      const existing = connectState.gardeners[deviceId];
      if (existing) {
        if (existing.state === 'sleeping') existing.state = 'resting';
        existing.lastActiveTick = connectState.tick;
        saveState(connectState);
        const view = getGardenerView(deviceId);
        view.gardener.lastProcessedSeq = 0;
        sendToClient(ws, { type: 'state', data: view });
      } else {
        sendToClient(ws, { type: 'state', data: null });
      }
      return;
    }

    if (!deviceId) return;

    const state = getState();
    let result = { ok: false };
    // Captured before dispatch: walk/queue_travel clear locationId as part of
    // their mutation, so this is the only way to know which location's other
    // occupants need telling that this gardener left.
    const locBefore = state.gardeners[deviceId]?.locationId ?? null;

    if (msg.type === 'join') {
      result = actions.createOrRestoreGardener(deviceId, state);
    } else if (msg.type === 'decorate')    result = actions.decorate(deviceId, msg.potId, state);
    else if (msg.type === 'undecorate') result = actions.undecorate(deviceId, msg.potId, state);
    else if (msg.type === 'pot')    result = actions.pot(deviceId, msg.potId, msg.seedId || null, state);
    else if (msg.type === 'swap')   result = actions.swap(deviceId, msg.seedId, state);
    else if (msg.type === 'walk')   result = actions.walk(deviceId, msg.pathId, state, msg.fast ?? false);
    else if (msg.type === 'reverse') result = actions.reverse(deviceId, state);
    else if (msg.type === 'take_seed') result = actions.takeSeed(deviceId, msg.fromId, state);
    else if (msg.type === 'continue')   result = actions.continuee(deviceId, state);
    else if (msg.type === 'delete_rule') result = actions.deleteRule(deviceId, msg.ruleId, state);
    else if (msg.type === 'pick_seed') result = actions.pickSeed(deviceId, msg.seedId, state);
    else if (msg.type === 'queue_travel') result = actions.queueTravel(deviceId, msg.pathIds, state, msg.fast ?? false);
    else if (msg.type === 'activate_fast_travel') result = actions.activateFastTravel(deviceId, state);
    else if (msg.type === 'delete_pilgrim') result = actions.deleteGardener(deviceId, state);
    else if (msg.type === 'poll')   result = { ok: true };

    if (typeof msg.seq === 'number') lastProcessedSeqByDevice.set(deviceId, msg.seq);

    if (result.ok) {
      saveState(state);
      if (msg.type === 'delete_pilgrim') {
        sendToClient(ws, { type: 'state', data: null });
        broadcast(); // decorations can span arbitrary locations — not worth scoping for a rare action
      } else {
        const notify = new Set([deviceId]);
        const gardenerAfter = state.gardeners[deviceId];
        if (LOCATION_SCOPED_CURRENT.has(msg.type) && gardenerAfter?.locationId) {
          for (const dId of nonWalkingDeviceIdsAtLocation(state, gardenerAfter.locationId)) notify.add(dId);
        } else if (LOCATION_SCOPED_LEAVE.has(msg.type) && locBefore) {
          for (const dId of nonWalkingDeviceIdsAtLocation(state, locBefore)) notify.add(dId);
        }
        broadcast(notify);
      }
    } else {
      sendToClient(ws, { type: 'error', message: result.error, seq: msg.seq });
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      clients.delete(deviceId);
      lastProcessedSeqByDevice.delete(deviceId);
    }
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
