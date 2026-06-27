import { SEEDS } from './seeds.js';
import { PATH_MAP, LOCATION_MAP } from './world.js';
import { TENDING_DURATION, SETTLING_DURATION, BASE_ENERGY_MAX, ENERGY_COST_PLANT, INITIAL_RULE_SLOTS, RULE_REFRESH_TICKS, GROWN_TICKS } from './constants.js';
import { pickInitialRules } from './rules.js';

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
    seedLog[seed.id] = { seed: false, seedling: false, grown: false, fruiting: false, dead: false };
  }

  const originSeedObj = SEEDS.find(s => s.locationId === spawnLocation);
  const rules = pickInitialRules(originSeedObj ? originSeedObj.id : null);

  state.gardeners[deviceId] = {
    id,
    state: 'resting',
    locationId: spawnLocation,
    pathId: null,
    pathFrom: null,
    progress: 0,
    seed: null,
    tendingUntil: null,
    encounteredThisTrip: [],
    arrivedEncounters: null,
    createdTick: state.tick,
    lastActiveTick: state.tick,
    energy: BASE_ENERGY_MAX,
    energyMax: BASE_ENERGY_MAX,
    rules,
    ruleSlots: INITIAL_RULE_SLOTS,
    speedBonus: 1.0,
    record: {
      wanderings: [spawnLocation],
      seedLog,
      decoratedPots: [],
    },
  };

  return ok();
}

export function decorate(deviceId, potId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting' && gardener.state !== 'tending') return fail('Must be at a location');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const pot = locData.pots.find(p => p.id === potId);
  if (!pot) return fail('Pot not found at this location');
  if (!pot.seedId) return fail('Pot is empty');

  // Add to this pot
  if (!pot.decorators.includes(gardener.id)) {
    pot.decorators.push(gardener.id);
  }

  if (!gardener.record.decoratedPots.includes(potId)) {
    gardener.record.decoratedPots.push(potId);
  }

  gardener.lastActiveTick = state.tick;
  return ok();
}

export function pot(deviceId, potId, seedId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const potObj = locData.pots.find(p => p.id === potId);
  if (!potObj) return fail('Pot not found at this location');

  // No seedId → clear the pot
  if (!seedId) {
    if (!potObj.seedId) return fail('Pot is already empty');
    potObj.seedId = null;
    potObj.lastPlantedTick = null;
    potObj.decorators = [];
    potObj.settlingUntil = null;
    gardener.lastActiveTick = state.tick;
    return ok();
  }

  // Validate seedId is available in the nursery pool
  const originSeed = SEEDS.find(s => s.locationId === gardener.locationId);
  const poolSet = new Set();
  if (originSeed) poolSet.add(originSeed.id);
  if (gardener.seed) poolSet.add(gardener.seed);
  for (const p of locData.pots) {
    if (p.seedId && p.lastPlantedTick !== null &&
        (state.tick - p.lastPlantedTick) >= GROWN_TICKS) {
      poolSet.add(p.seedId);
    }
  }
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (dId !== deviceId && g.locationId === gardener.locationId &&
        (g.state === 'resting' || g.state === 'tending') && g.seed) {
      poolSet.add(g.seed);
    }
  }
  if (!poolSet.has(seedId)) return fail('Seed not available here');

  if (gardener.energy < ENERGY_COST_PLANT) return fail('Not enough energy');
  if (potObj.settlingUntil !== null && potObj.settlingUntil > state.tick) {
    return fail('Pot is still settling');
  }

  clearPotDecorators(potObj, state);

  potObj.seedId = seedId;
  potObj.lastPlantedTick = state.tick;
  potObj.settlingUntil = state.tick + SETTLING_DURATION;

  gardener.energy -= ENERGY_COST_PLANT;
  gardener.state = 'tending';
  gardener.tendingUntil = state.tick + TENDING_DURATION;
  gardener.lastActiveTick = state.tick;

  return ok();
}

export function swap(deviceId, targetSeedId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');

  // Empty/null = drop carried seed
  if (!targetSeedId) {
    gardener.seed = null;
    gardener.lastActiveTick = state.tick;
    return ok();
  }

  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  // Build seedPool inline (same logic as the view)
  const originSeed = SEEDS.find(s => s.locationId === gardener.locationId);
  const poolSet = new Set();
  if (originSeed) poolSet.add(originSeed.id);
  for (const pot of locData.pots) {
    if (pot.seedId) poolSet.add(pot.seedId);
  }
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (dId !== deviceId && g.locationId === gardener.locationId &&
        (g.state === 'resting' || g.state === 'tending') && g.seed) {
      poolSet.add(g.seed);
    }
  }

  if (!poolSet.has(targetSeedId)) return fail('Seed not available here');

  gardener.seed = targetSeedId;
  gardener.lastActiveTick = state.tick;

  if (gardener.record.seedLog[targetSeedId]) {
    gardener.record.seedLog[targetSeedId].seed = true;
  }

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

function clearPotDecorators(potObj, state) {
  for (const decoratorId of potObj.decorators) {
    for (const g of Object.values(state.gardeners)) {
      if (g.id === decoratorId) {
        const idx = g.record.decoratedPots.indexOf(potObj.id);
        if (idx !== -1) g.record.decoratedPots.splice(idx, 1);
        break;
      }
    }
  }
  potObj.decorators = [];
}

export function undecorate(deviceId, potId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting' && gardener.state !== 'tending') return fail('Must be at a location');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const pot = locData.pots.find(p => p.id === potId);
  if (!pot) return fail('Pot not found at this location');

  const idx = pot.decorators.indexOf(gardener.id);
  if (idx === -1) return fail('Not decorated by you');

  pot.decorators.splice(idx, 1);
  const dpIdx = gardener.record.decoratedPots.indexOf(potId);
  if (dpIdx !== -1) gardener.record.decoratedPots.splice(dpIdx, 1);

  gardener.lastActiveTick = state.tick;
  return ok();
}

export function deleteRule(deviceId, ruleId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  const rule = (gardener.rules || []).find(r => r.id === ruleId);
  if (!rule) return fail('Rule not found');
  if (rule.deletedTick !== null) return fail('Rule already refreshing');
  if (rule.completed) {
    gardener.speedBonus = Math.round(gardener.speedBonus / 1.02 * 1000) / 1000;
  }
  rule.deletedTick = state.tick;
  rule.refreshAt = state.tick + RULE_REFRESH_TICKS;
  gardener.lastActiveTick = state.tick;
  return ok();
}
