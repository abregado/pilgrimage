const { TICK_RATE, MOVEMENT_SPEED, SLEEP_THRESHOLD } = require('./constants');
const { applyAction } = require('./actions');
const { buildClientPayload, findPilgrimByUUID } = require('./state');
const { saveState } = require('./persistence');
const crypto = require('crypto');

let _state = null;
const _clients = new Map(); // hardwareUUID -> WebSocket
const _actionQueue = []; // { pilgrimId, action, resolve }

function init(state) {
  _state = state;
  setInterval(tick, TICK_RATE);
}

function getState() {
  return _state;
}

function registerClient(hardwareUUID, ws) {
  _clients.set(hardwareUUID, ws);
}

function unregisterClient(hardwareUUID) {
  _clients.delete(hardwareUUID);
}

function queueAction(pilgrimId, action, resolve) {
  _actionQueue.push({ pilgrimId, action, resolve });
}

function createPilgrim(hardwareUUID) {
  const beaconIds = Object.keys(_state.beacons);
  const spawnBeaconId = beaconIds[Math.floor(Math.random() * beaconIds.length)];
  const beacon = _state.beacons[spawnBeaconId];

  const pilgrim = {
    id: crypto.randomUUID(),
    hardwareUUID,
    state: 'Waiting',
    beaconId: spawnBeaconId,
    pathId: null,
    pathPosition: null,
    pathDirection: 0,
    prayingUntilTick: null,
    lastActiveTick: _state.tick,
    createdTick: _state.tick,
    carriedIdeal: null,
    canUndo: false,
    undoIdeal: null,
    passport: [spawnBeaconId],
    seenIdeals: [...beacon.coreIdeals],
    encounteredPilgrims: [],
  };

  _state.pilgrims[pilgrim.id] = pilgrim;
  return pilgrim;
}

function sendState(ws, pilgrim) {
  const payload = buildClientPayload(_state, pilgrim);
  ws.send(JSON.stringify({ type: 'STATE', payload }));
}

function pushToClient(hardwareUUID, pilgrim) {
  const ws = _clients.get(hardwareUUID);
  if (ws && ws.readyState === 1) {
    sendState(ws, pilgrim);
  }
}

function tick() {
  let changed = false;
  const toNotify = new Set(); // pilgrimIds to push state to

  // 1. Process queued actions
  const actions = _actionQueue.splice(0);
  for (const { pilgrimId, action, resolve } of actions) {
    const result = applyAction(_state, pilgrimId, action);
    resolve(result);
    if (result.success) {
      toNotify.add(pilgrimId);
      changed = true;
    }
  }

  // 2. Advance travelling pilgrims (save prev positions for encounter detection)
  const prevPositions = {};
  for (const pilgrim of Object.values(_state.pilgrims)) {
    if (pilgrim.state !== 'Travelling') continue;
    prevPositions[pilgrim.id] = pilgrim.pathPosition;

    const path = _state.paths[pilgrim.pathId];
    if (!path) continue;

    if (pilgrim.pathDirection === 0) {
      pilgrim.pathPosition = Math.min(pilgrim.pathPosition + MOVEMENT_SPEED, path.length);
    } else {
      pilgrim.pathPosition = Math.max(pilgrim.pathPosition - MOVEMENT_SPEED, 0);
    }
    changed = true;
  }

  // 3. Detect encounters
  const pathGroups = {};
  for (const pilgrim of Object.values(_state.pilgrims)) {
    if (pilgrim.state !== 'Travelling') continue;
    if (!pathGroups[pilgrim.pathId]) pathGroups[pilgrim.pathId] = [];
    pathGroups[pilgrim.pathId].push(pilgrim);
  }

  for (const pilgrims of Object.values(pathGroups)) {
    for (let i = 0; i < pilgrims.length; i++) {
      for (let j = i + 1; j < pilgrims.length; j++) {
        const a = pilgrims[i];
        const b = pilgrims[j];
        if (a.pathDirection === b.pathDirection) continue;

        const pA = prevPositions[a.id] ?? a.pathPosition;
        const pB = prevPositions[b.id] ?? b.pathPosition;
        const cA = a.pathPosition;
        const cB = b.pathPosition;

        let crossed = false;
        if (a.pathDirection === 0 && b.pathDirection === 1) {
          crossed = pA <= pB && cA >= cB;
        } else if (a.pathDirection === 1 && b.pathDirection === 0) {
          crossed = pA >= pB && cA <= cB;
        }

        if (!crossed) continue;

        if (!a.encounteredPilgrims.some(e => e.pilgrimId === b.id)) {
          a.encounteredPilgrims.push({ pilgrimId: b.id, idealId: b.carriedIdeal });
          if (b.carriedIdeal && !a.seenIdeals.includes(b.carriedIdeal)) {
            a.seenIdeals.push(b.carriedIdeal);
          }
          toNotify.add(a.id);
        }
        if (!b.encounteredPilgrims.some(e => e.pilgrimId === a.id)) {
          b.encounteredPilgrims.push({ pilgrimId: a.id, idealId: a.carriedIdeal });
          if (a.carriedIdeal && !b.seenIdeals.includes(a.carriedIdeal)) {
            b.seenIdeals.push(a.carriedIdeal);
          }
          toNotify.add(b.id);
        }
        changed = true;
      }
    }
  }

  // 4. Detect arrivals
  for (const pilgrim of Object.values(_state.pilgrims)) {
    if (pilgrim.state !== 'Travelling') continue;
    const path = _state.paths[pilgrim.pathId];
    if (!path) continue;

    let arrived = false;
    let destBeaconId = null;

    if (pilgrim.pathDirection === 0 && pilgrim.pathPosition >= path.length) {
      destBeaconId = path.beaconIds[1];
      arrived = true;
    } else if (pilgrim.pathDirection === 1 && pilgrim.pathPosition <= 0) {
      destBeaconId = path.beaconIds[0];
      arrived = true;
    }

    if (arrived) {
      pilgrim.beaconId = destBeaconId;
      pilgrim.pathId = null;
      pilgrim.pathPosition = null;
      pilgrim.state = 'Waiting';

      if (!pilgrim.passport.includes(destBeaconId)) {
        pilgrim.passport.push(destBeaconId);
      }
      const destBeacon = _state.beacons[destBeaconId];
      if (destBeacon) {
        for (const idealId of destBeacon.coreIdeals) {
          if (!pilgrim.seenIdeals.includes(idealId)) {
            pilgrim.seenIdeals.push(idealId);
          }
        }
      }
      toNotify.add(pilgrim.id);
      changed = true;
    }
  }

  // 5. Expire Praying states and detect sleeping
  _state.tick++;
  for (const pilgrim of Object.values(_state.pilgrims)) {
    if (pilgrim.state === 'Praying' && pilgrim.prayingUntilTick <= _state.tick) {
      pilgrim.state = 'Waiting';
      pilgrim.prayingUntilTick = null;
      toNotify.add(pilgrim.id);
      changed = true;
    }
    if (
      (pilgrim.state === 'Waiting' || pilgrim.state === 'Praying') &&
      _state.tick - pilgrim.lastActiveTick >= SLEEP_THRESHOLD
    ) {
      pilgrim.state = 'Sleeping';
      toNotify.add(pilgrim.id);
      changed = true;
    }
  }

  // 6. Save if changed
  if (changed) {
    saveState(_state);
  }

  // 7. Push to affected clients
  for (const pilgrimId of toNotify) {
    const pilgrim = _state.pilgrims[pilgrimId];
    if (pilgrim) pushToClient(pilgrim.hardwareUUID, pilgrim);
  }
}

module.exports = {
  init,
  getState,
  registerClient,
  unregisterClient,
  queueAction,
  createPilgrim,
  sendState,
  findPilgrimByUUID,
};
