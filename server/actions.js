import { SEEDS, SEED_MAP } from './seeds.js';
import { PATH_MAP, LOCATION_MAP } from './world.js';
import { TENDING_DURATION, SETTLING_DURATION } from './constants.js';
import { getCherishedPot } from './state.js';

function fail(error) {
  return { ok: false, error };
}

function ok() {
  return { ok: true };
}

// Find which location a pot belongs to
function findPotLocation(potId, state) {
  for (const [locId, locData] of Object.entries(state.locations)) {
    const pot = locData.pots.find(p => p.id === potId);
    if (pot) return { locId, locData, pot };
  }
  return null;
}

export function createOrRestoreGardener(deviceId, state) {
  const existing = state.gardeners[deviceId];
  if (existing) {
    if (existing.state === 'sleeping') {
      existing.state = 'resting';
    }
    existing.lastActiveTick = state.tick;
    return ok();
  }

  // Create new gardener
  let id = '';
  for (let i = 0; i < 4; i++) id += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');

  const locationIds = Object.keys(state.locations);
  const spawnLocation = locationIds[Math.floor(Math.random() * locationIds.length)];

  // Build empty seed log
  const seedLog = {};
  for (const seed of SEEDS) {
    seedLog[seed.id] = { seed: false, plant: false, origin: false, cherished: false };
  }

  state.gardeners[deviceId] = {
    id,
    state: 'resting',
    locationId: spawnLocation,
    pathId: null,
    pathFrom: null,
    progress: 0,
    seed: null,
    tendingUntil: null,
    justTookOrigin: false,
    encounteredThisTrip: [],
    arrivedEncounters: null,
    createdTick: state.tick,
    lastActiveTick: state.tick,
    record: {
      wanderings: [spawnLocation],
      seedLog,
      singerPots: [],
    },
  };

  return ok();
}

export function sing(deviceId, potId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting' && gardener.state !== 'tending') return fail('Must be at a location');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  // Find the pot in this location
  const pot = locData.pots.find(p => p.id === potId);
  if (!pot) return fail('Pot not found at this location');
  if (!pot.seedId) return fail('Pot is empty');

  // Remove gardener from ALL pots at this location
  for (const p of locData.pots) {
    const idx = p.singers.indexOf(gardener.id);
    if (idx !== -1) {
      p.singers.splice(idx, 1);
      // Remove from singerPots record
      const spIdx = gardener.record.singerPots.indexOf(p.id);
      if (spIdx !== -1) gardener.record.singerPots.splice(spIdx, 1);
    }
  }

  // Add to this pot
  if (!pot.singers.includes(gardener.id)) {
    pot.singers.push(gardener.id);
  }

  // Update singerPots record
  if (!gardener.record.singerPots.includes(potId)) {
    gardener.record.singerPots.push(potId);
  }

  gardener.lastActiveTick = state.tick;
  return ok();
}

export function pot(deviceId, potId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.seed) return fail('Not carrying a seed');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const potObj = locData.pots.find(p => p.id === potId);
  if (!potObj) return fail('Pot not found at this location');

  // Check cherished
  const cherishedId = getCherishedPot(gardener.locationId);
  if (potObj.id === cherishedId) return fail('Cannot pot into a cherished pot');

  // Check settling
  if (potObj.settlingUntil !== null && potObj.settlingUntil > state.tick) {
    return fail('Pot is still settling');
  }

  // Remove all singers from pot
  // Also remove this pot from their singerPots records
  for (const singerId of potObj.singers) {
    // Find the gardener with this public id
    for (const [dId, g] of Object.entries(state.gardeners)) {
      if (g.id === singerId) {
        const spIdx = g.record.singerPots.indexOf(potId);
        if (spIdx !== -1) g.record.singerPots.splice(spIdx, 1);
        break;
      }
    }
  }
  potObj.singers = [];

  potObj.seedId = gardener.seed;
  potObj.settlingUntil = state.tick + SETTLING_DURATION;

  gardener.state = 'tending';
  gardener.tendingUntil = state.tick + TENDING_DURATION;
  gardener.seed = null;
  gardener.lastActiveTick = state.tick;

  return ok();
}

export function takeOrigin(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');

  // Find origin seed for this location
  const originSeed = SEEDS.find(s => s.locationId === gardener.locationId);
  if (!originSeed) return fail('No origin seed for this location');

  gardener.seed = originSeed.id;
  gardener.justTookOrigin = true;
  gardener.lastActiveTick = state.tick;

  // Mark 'seed' discovered
  if (gardener.record.seedLog[originSeed.id]) {
    gardener.record.seedLog[originSeed.id].seed = true;
  }

  return ok();
}

export function undoTake(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (!gardener.justTookOrigin) return fail('Nothing to undo');

  gardener.seed = null;
  gardener.justTookOrigin = false;

  return ok();
}

export function walk(deviceId, pathId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');

  const path = PATH_MAP[pathId];
  if (!path) return fail('Path not found');
  if (path.fromId !== gardener.locationId && path.toId !== gardener.locationId) {
    return fail('Path does not connect to current location');
  }

  gardener.pathFrom = gardener.locationId;
  gardener.pathId = pathId;
  gardener.progress = 0;
  gardener.state = 'walking';
  gardener.locationId = null;
  gardener.encounteredThisTrip = [];
  gardener.justTookOrigin = false;
  gardener.lastActiveTick = state.tick;

  return ok();
}

export function reverse(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'walking') return fail('Not walking');

  const path = PATH_MAP[gardener.pathId];
  if (!path) return fail('Path not found');

  // Swap pathFrom to the other end
  const newFrom = gardener.pathFrom === path.fromId ? path.toId : path.fromId;
  gardener.progress = path.length - gardener.progress;
  gardener.pathFrom = newFrom;
  gardener.lastActiveTick = state.tick;

  return ok();
}

export function takeSeed(deviceId, fromId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'walking' && gardener.state !== 'arriving') {
    return fail('Must be walking or arriving');
  }

  // Check fromId is in encounteredThisTrip or arrivedEncounters
  const list = gardener.state === 'arriving'
    ? (gardener.arrivedEncounters || [])
    : gardener.encounteredThisTrip;

  const encounter = list.find(e => e.id === fromId);
  if (!encounter) return fail('Gardener not encountered');

  // Find the encountered gardener by public id
  let encounteredGardener = null;
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (g.id === fromId) {
      encounteredGardener = g;
      break;
    }
  }

  if (!encounteredGardener || !encounteredGardener.seed) {
    return fail('Encountered gardener is not carrying a seed');
  }

  gardener.seed = encounteredGardener.seed; // copy, not remove
  gardener.justTookOrigin = false;

  // Mark 'seed' discovered
  if (gardener.record.seedLog[encounteredGardener.seed]) {
    gardener.record.seedLog[encounteredGardener.seed].seed = true;
  }

  gardener.lastActiveTick = state.tick;
  return ok();
}

export function continuee(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'arriving') return fail('Not arriving');

  gardener.state = 'resting';
  // locationId is already set from arrival
  gardener.arrivedEncounters = null;
  gardener.lastActiveTick = state.tick;

  return ok();
}
