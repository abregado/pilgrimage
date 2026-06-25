const { ALTAR_PROTECTION_TIME, ALTAR_CHANGE_TIME } = require('./constants');
const { getStrongestAltarId } = require('./state');

function applyAction(state, pilgrimId, action) {
  const pilgrim = state.pilgrims[pilgrimId];
  if (!pilgrim) return { success: false, error: 'PILGRIM_NOT_FOUND' };

  pilgrim.lastActiveTick = state.tick;

  if (pilgrim.state === 'Sleeping') {
    pilgrim.state = pilgrim.pathId ? 'Travelling' : 'Waiting';
  }

  switch (action.type) {
    case 'CHANGE_ALTAR':    return changeAltar(state, pilgrim, action);
    case 'PRAY':            return pray(state, pilgrim, action);
    case 'TAKE_CORE_IDEAL': return takeCoreIdeal(state, pilgrim, action);
    case 'UNDO_TAKE_IDEAL': return undoTakeIdeal(state, pilgrim);
    case 'BEGIN_TRAVEL':    return beginTravel(state, pilgrim, action);
    case 'REVERSE_DIRECTION': return reverseDirection(state, pilgrim);
    case 'SWAP_IDEAL':      return swapIdeal(state, pilgrim, action);
    default: return { success: false, error: 'UNKNOWN_ACTION' };
  }
}

function changeAltar(state, pilgrim, { altarId }) {
  if (pilgrim.state === 'Praying') return fail('PILGRIM_PRAYING');
  if (!pilgrim.beaconId) return fail('NOT_AT_BEACON');
  if (!pilgrim.carriedIdeal) return fail('NO_CARRIED_IDEAL');

  const beacon = state.beacons[pilgrim.beaconId];
  if (!beacon) return fail('BEACON_NOT_FOUND');

  const altar = beacon.altars[altarId];
  if (!altar) return fail('ALTAR_NOT_FOUND');

  if (altar.lastChangeTick + ALTAR_PROTECTION_TIME >= state.tick) return fail('ALTAR_PROTECTED');

  const strongestId = getStrongestAltarId(beacon);
  if (strongestId === altarId) return fail('ALTAR_STRONGEST');

  altar.idealId = pilgrim.carriedIdeal;
  altar.believers = [];
  altar.lastChangeTick = state.tick;
  pilgrim.carriedIdeal = null;
  pilgrim.canUndo = false;
  pilgrim.undoIdeal = null;
  pilgrim.state = 'Praying';
  pilgrim.prayingUntilTick = state.tick + ALTAR_CHANGE_TIME;

  return { success: true };
}

function pray(state, pilgrim, { altarId }) {
  if (pilgrim.state === 'Praying') return fail('PILGRIM_PRAYING');
  if (!pilgrim.beaconId) return fail('NOT_AT_BEACON');

  const beacon = state.beacons[pilgrim.beaconId];
  if (!beacon) return fail('BEACON_NOT_FOUND');

  const altar = beacon.altars[altarId];
  if (!altar) return fail('ALTAR_NOT_FOUND');

  for (const a of Object.values(beacon.altars)) {
    if (a.id !== altarId) {
      a.believers = a.believers.filter(id => id !== pilgrim.id);
    }
  }

  if (!altar.believers.includes(pilgrim.id)) {
    altar.believers.push(pilgrim.id);
  }

  if (altar.idealId && !pilgrim.seenIdeals.includes(altar.idealId)) {
    pilgrim.seenIdeals.push(altar.idealId);
  }

  return { success: true };
}

function takeCoreIdeal(state, pilgrim, { idealId }) {
  if (!pilgrim.beaconId) return fail('NOT_AT_BEACON');

  const beacon = state.beacons[pilgrim.beaconId];
  if (!beacon) return fail('BEACON_NOT_FOUND');
  if (!beacon.coreIdeals.includes(idealId)) return fail('IDEAL_NOT_CORE');

  pilgrim.undoIdeal = pilgrim.carriedIdeal;
  pilgrim.canUndo = true;
  pilgrim.carriedIdeal = idealId;

  if (!pilgrim.seenIdeals.includes(idealId)) {
    pilgrim.seenIdeals.push(idealId);
  }

  return { success: true };
}

function undoTakeIdeal(state, pilgrim) {
  if (!pilgrim.canUndo) return fail('NO_UNDO');

  pilgrim.carriedIdeal = pilgrim.undoIdeal;
  pilgrim.undoIdeal = null;
  pilgrim.canUndo = false;

  return { success: true };
}

function beginTravel(state, pilgrim, { pathId }) {
  if (pilgrim.state === 'Praying') return fail('PILGRIM_PRAYING');
  if (!pilgrim.beaconId) return fail('NOT_AT_BEACON');

  const path = state.paths[pathId];
  if (!path) return fail('PATH_NOT_FOUND');
  if (!path.beaconIds.includes(pilgrim.beaconId)) return fail('PATH_NOT_CONNECTED');

  const startingAtIndex0 = path.beaconIds[0] === pilgrim.beaconId;

  pilgrim.pathId = pathId;
  pilgrim.pathPosition = startingAtIndex0 ? 0 : path.length;
  pilgrim.pathDirection = startingAtIndex0 ? 0 : 1;
  pilgrim.beaconId = null;
  pilgrim.state = 'Travelling';
  pilgrim.encounteredPilgrims = [];
  pilgrim.canUndo = false;
  pilgrim.undoIdeal = null;

  return { success: true };
}

function reverseDirection(state, pilgrim) {
  if (pilgrim.state !== 'Travelling') return fail('NOT_TRAVELLING');

  pilgrim.pathDirection = pilgrim.pathDirection === 0 ? 1 : 0;

  return { success: true };
}

function swapIdeal(state, pilgrim, { pilgrimId }) {
  if (pilgrim.state !== 'Travelling') return fail('NOT_TRAVELLING');

  const encounter = pilgrim.encounteredPilgrims.find(e => e.pilgrimId === pilgrimId);
  if (!encounter) return fail('NOT_ENCOUNTERED');

  pilgrim.carriedIdeal = encounter.idealId;
  pilgrim.canUndo = false;
  pilgrim.undoIdeal = null;

  if (encounter.idealId && !pilgrim.seenIdeals.includes(encounter.idealId)) {
    pilgrim.seenIdeals.push(encounter.idealId);
  }

  return { success: true };
}

function fail(error) {
  return { success: false, error };
}

module.exports = { applyAction };
