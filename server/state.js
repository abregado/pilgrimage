const { SLEEP_THRESHOLD } = require('./constants');

function getStrongestAltarId(beacon) {
  let max = 0;
  let strongestId = null;
  for (const altar of Object.values(beacon.altars)) {
    if (altar.believers.length > max) {
      max = altar.believers.length;
      strongestId = altar.id;
    }
  }
  return strongestId;
}

function getBeliefStructure(pilgrim, state) {
  const counts = {};
  for (const beacon of Object.values(state.beacons)) {
    for (const altar of Object.values(beacon.altars)) {
      if (altar.believers.includes(pilgrim.id) && altar.idealId) {
        counts[altar.idealId] = (counts[altar.idealId] || 0) + altar.believers.length;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

function findPilgrimByUUID(state, hardwareUUID) {
  return Object.values(state.pilgrims).find(p => p.hardwareUUID === hardwareUUID) || null;
}

function getPathsForBeacon(state, beaconId) {
  return Object.values(state.paths).filter(p => p.beaconIds.includes(beaconId));
}

function buildClientPayload(state, pilgrim) {
  const beliefStructure = getBeliefStructure(pilgrim, state);
  let location = null;

  if (pilgrim.pathId) {
    location = buildPathPayload(state, pilgrim);
  } else if (pilgrim.beaconId) {
    location = buildBeaconPayload(state, pilgrim);
  }

  return {
    tick: state.tick,
    pilgrim: {
      id: pilgrim.id,
      state: pilgrim.state,
      beaconId: pilgrim.beaconId,
      pathId: pilgrim.pathId,
      pathPosition: pilgrim.pathPosition,
      pathDirection: pilgrim.pathDirection,
      prayingUntilTick: pilgrim.prayingUntilTick,
      lastActiveTick: pilgrim.lastActiveTick,
      createdTick: pilgrim.createdTick,
      carriedIdeal: pilgrim.carriedIdeal,
      canUndo: pilgrim.canUndo,
      undoIdeal: pilgrim.undoIdeal,
      beliefStructure,
      passport: pilgrim.passport,
      seenIdeals: pilgrim.seenIdeals,
      encounteredPilgrims: pilgrim.encounteredPilgrims,
    },
    location,
  };
}

function buildBeaconPayload(state, pilgrim) {
  const beacon = state.beacons[pilgrim.beaconId];
  if (!beacon) return null;

  const strongestAltarId = getStrongestAltarId(beacon);

  const pilgrimsHere = Object.values(state.pilgrims).filter(p => p.beaconId === beacon.id);
  const awakePilgrims = pilgrimsHere.filter(
    p => state.tick - p.lastActiveTick < 21600
  ).length;

  const altars = Object.values(beacon.altars).map(altar => ({
    id: altar.id,
    idealId: altar.idealId,
    believersCount: altar.believers.length,
    lastChangeTick: altar.lastChangeTick,
    isStrongest: altar.id === strongestAltarId,
  }));

  const paths = getPathsForBeacon(state, beacon.id).map(path => {
    const otherBeaconId = path.beaconIds[0] === beacon.id ? path.beaconIds[1] : path.beaconIds[0];
    return {
      pathId: path.id,
      otherBeaconId,
      otherBeaconName: state.beacons[otherBeaconId].name,
      length: path.length,
    };
  });

  return {
    type: 'beacon',
    id: beacon.id,
    name: beacon.name,
    coreIdeals: beacon.coreIdeals,
    altars,
    pilgrimsPresent: pilgrimsHere.length,
    awakePilgrims,
    paths,
  };
}

function buildPathPayload(state, pilgrim) {
  const path = state.paths[pilgrim.pathId];
  if (!path) return null;

  const [b0id, b1id] = path.beaconIds;
  const b0 = state.beacons[b0id];
  const b1 = state.beacons[b1id];

  const b0Visited = pilgrim.passport.includes(b0id);
  const b1Visited = pilgrim.passport.includes(b1id);

  const pilgrimsOnPath = Object.values(state.pilgrims)
    .filter(p => p.pathId === path.id)
    .map(p => ({
      pathPosition: p.pathPosition,
      direction: p.pathDirection,
      idealId: p.carriedIdeal,
      isCurrentClient: p.id === pilgrim.id,
    }));

  return {
    type: 'path',
    id: path.id,
    length: path.length,
    beaconIds: path.beaconIds,
    beaconNames: [b0.name, b1.name],
    beaconCoreIdeals: [
      b0Visited ? b0.coreIdeals : null,
      b1Visited ? b1.coreIdeals : null,
    ],
    pilgrimsOnPath,
    passedCount: pilgrim.encounteredPilgrims.length,
  };
}

module.exports = {
  getStrongestAltarId,
  getBeliefStructure,
  findPilgrimByUUID,
  getPathsForBeacon,
  buildClientPayload,
};
