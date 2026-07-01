import { SEEDS } from './seeds.js';
import { PATH_MAP } from './world.js';
import {
  SETTLING_DURATION, BASE_ENERGY_MAX, INITIAL_RULE_SLOTS, RULE_REFRESH_TICKS,
  GROWN_TICKS, SEEDLING_TICKS, FRUITING_TICKS, DEAD_TICKS,
  ENERGY_COST_BASE, ENERGY_COST_SEEDLING, ENERGY_COST_GROWN, ENERGY_COST_FRUITING,
  RULE_SAFE_TIME, SPEED_BONUS_FULL_VISION,
  FAST_TRAVEL_COST,
} from './constants.js';
import { pickInitialRules, RULE_TEMPLATE_MAP } from './rules.js';

function fail(error) {
  return { ok: false, error };
}

function ok() {
  return { ok: true };
}

function potEnergyCost(potObj, tick) {
  if (!potObj.seedId || potObj.lastPlantedTick === null) return ENERGY_COST_BASE;
  const age = tick - potObj.lastPlantedTick;
  if (age >= DEAD_TICKS)     return ENERGY_COST_BASE;
  if (age >= FRUITING_TICKS) return ENERGY_COST_FRUITING;
  if (age >= GROWN_TICKS)    return ENERGY_COST_GROWN;
  if (age >= SEEDLING_TICKS) return ENERGY_COST_SEEDLING;
  return ENERGY_COST_BASE;
}

function checkRuleCompletion(gardener, state) {
  const tick = state.tick;
  const uniqueVisited = [...new Set(gardener.record.wanderings)];
  for (const rule of (gardener.rules || [])) {
    if (rule.deletedTick !== null || rule.completed) continue;
    const template = RULE_TEMPLATE_MAP[rule.templateId];
    if (!template) continue;
    let count = 0;
    for (const locId of uniqueVisited) {
      const locData = state.locations[locId];
      if (locData && template.check(locData.pots, tick)) count++;
    }
    if (count >= rule.difficulty) {
      rule.completed = true;
      rule.safeUntil = tick + RULE_SAFE_TIME;
      gardener.speedBonus = Math.round((gardener.speedBonus ?? 1) * 1.02 * 1000) / 1000;

      // If this was the last incomplete rule, extend all safe times
      const activeRules = gardener.rules.filter(r => r.deletedTick === null);
      if (activeRules.every(r => r.completed)) {
        for (const r of activeRules) r.safeUntil = tick + RULE_SAFE_TIME * 3;
      }
    }
  }
}

// Find which location a pot belongs to (unused externally but kept for safety)
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
    seed: originSeedObj ? originSeedObj.id : null,
    encounteredThisTrip: [],
    arrivedEncounters: null,
    createdTick: state.tick,
    lastActiveTick: state.tick,
    energy: BASE_ENERGY_MAX,
    energyMax: BASE_ENERGY_MAX,
    rules,
    ruleSlots: INITIAL_RULE_SLOTS,
    speedBonus: 1.0,
    availableSeeds: null,
    locationMemory: {},
    travelQueue: [],
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
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');

  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const pot = locData.pots.find(p => p.id === potId);
  if (!pot) return fail('Pot not found at this location');
  if (!pot.seedId) return fail('Pot is empty');

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

  const cost = potEnergyCost(potObj, state.tick);
  if (gardener.energy < cost) return fail('Not enough energy');

  // No seedId → clear the pot
  if (!seedId) {
    if (!potObj.seedId) return fail('Pot is already empty');
    clearPotDecorators(potObj, state);
    potObj.seedId = null;
    potObj.lastPlantedTick = null;
    potObj.settlingUntil = null;
    gardener.energy -= cost;
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
        g.state === 'resting' && g.seed) {
      poolSet.add(g.seed);
    }
  }
  if (!poolSet.has(seedId)) return fail('Seed not available here');

  if (potObj.settlingUntil !== null && potObj.settlingUntil > state.tick) {
    return fail('Pot is still settling');
  }

  clearPotDecorators(potObj, state);
  potObj.seedId = seedId;
  potObj.lastPlantedTick = state.tick;
  potObj.settlingUntil = state.tick + SETTLING_DURATION;
  gardener.energy -= cost;
  gardener.lastActiveTick = state.tick;

  checkRuleCompletion(gardener, state);
  return ok();
}

export function swap(deviceId, targetSeedId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');

  if (!targetSeedId) {
    gardener.seed = null;
    gardener.lastActiveTick = state.tick;
    return ok();
  }

  if (!gardener.locationId) return fail('Not at a location');
  const locData = state.locations[gardener.locationId];
  if (!locData) return fail('Location not found');

  const originSeed = SEEDS.find(s => s.locationId === gardener.locationId);
  const poolSet = new Set();
  if (originSeed) poolSet.add(originSeed.id);
  for (const pot of locData.pots) {
    if (pot.seedId) poolSet.add(pot.seedId);
  }
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (dId !== deviceId && g.locationId === gardener.locationId &&
        g.state === 'resting' && g.seed) {
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

  const locId = gardener.locationId;
  const locData = state.locations[locId];

  const originSeedWalk = SEEDS.find(s => s.locationId === locId);
  const poolSet = new Set();
  if (originSeedWalk) poolSet.add(originSeedWalk.id);
  if (gardener.seed) poolSet.add(gardener.seed);
  for (const p of locData.pots) {
    if (p.seedId && p.lastPlantedTick !== null &&
        (state.tick - p.lastPlantedTick) >= GROWN_TICKS) {
      poolSet.add(p.seedId);
    }
  }
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (dId !== deviceId && g.locationId === locId &&
        g.state === 'resting' && g.seed) {
      poolSet.add(g.seed);
    }
  }
  gardener.availableSeeds = [...poolSet];

  if (!gardener.locationMemory) gardener.locationMemory = {};
  gardener.locationMemory[locId] = locData.pots.map(p => ({ id: p.id, seedId: p.seedId, lastPlantedTick: p.lastPlantedTick }));

  gardener.pathFrom = locId;
  gardener.pathId = pathId;
  gardener.progress = 0;
  gardener.state = 'walking';
  gardener.locationId = null;
  gardener.encounteredThisTrip = [];
  gardener.lastActiveTick = state.tick;

  return ok();
}

// Instantly move a resting gardener to destId — no walking state, no travel
// time. Snapshots locationMemory for the location left behind, same as a
// normal walk, so the map still shows what pots looked like there.
function _teleportTo(gardener, destId, state) {
  const originLocId = gardener.locationId;
  if (originLocId) {
    const locData = state.locations[originLocId];
    if (locData) {
      if (!gardener.locationMemory) gardener.locationMemory = {};
      gardener.locationMemory[originLocId] = locData.pots.map(
        p => ({ id: p.id, seedId: p.seedId, lastPlantedTick: p.lastPlantedTick }));
    }
  }
  gardener.record.wanderings.push(destId);
  gardener.state = 'resting';
  gardener.locationId = destId;
  gardener.pathId = null;
  gardener.pathFrom = null;
  gardener.progress = 0;
  gardener.travelQueue = [];
  gardener.encounteredThisTrip = [];
  gardener.arrivedEncounters = null;
  gardener.availableSeeds = null;
}

// Dendriport: instant single-leg teleport from resting.
export function dendriport(deviceId, pathId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');
  if (gardener.energy < FAST_TRAVEL_COST) return fail('Not enough energy for Dendriport');

  const path = PATH_MAP[pathId];
  if (!path) return fail('Path not found');
  if (path.fromId !== gardener.locationId && path.toId !== gardener.locationId) {
    return fail('Path does not connect to current location');
  }

  const destId = path.fromId === gardener.locationId ? path.toId : path.fromId;
  _teleportTo(gardener, destId, state);
  gardener.energy -= FAST_TRAVEL_COST;
  gardener.lastActiveTick = state.tick;
  return ok();
}

// Dendriport across a queued multi-leg route: jumps straight to the final
// destination, same energy cost as a single leg.
export function dendriportQueue(deviceId, pathIds, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');
  if (!Array.isArray(pathIds) || pathIds.length === 0) return fail('No paths provided');
  if (gardener.energy < FAST_TRAVEL_COST) return fail('Not enough energy for Dendriport');

  let currentLocId = gardener.locationId;
  for (const pathId of pathIds) {
    const path = PATH_MAP[pathId];
    if (!path) return fail(`Path not found: ${pathId}`);
    if (path.fromId !== currentLocId && path.toId !== currentLocId) {
      return fail(`Path ${pathId} does not connect from ${currentLocId}`);
    }
    currentLocId = path.fromId === currentLocId ? path.toId : path.fromId;
  }

  _teleportTo(gardener, currentLocId, state);
  gardener.energy -= FAST_TRAVEL_COST;
  gardener.lastActiveTick = state.tick;
  return ok();
}

// Mid-walk Dendriport: instantly finishes the current leg plus any queued
// legs, landing at the final destination of the whole route.
export function activateDendriport(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'walking') return fail('Not walking');
  if (gardener.energy < FAST_TRAVEL_COST) return fail('Not enough energy for Dendriport');

  const path = PATH_MAP[gardener.pathId];
  if (!path) return fail('Path not found');
  let destId = path.fromId === gardener.pathFrom ? path.toId : path.fromId;

  for (const pid of (gardener.travelQueue || [])) {
    const p = PATH_MAP[pid];
    if (!p) break;
    destId = p.fromId === destId ? p.toId : p.fromId;
  }

  _teleportTo(gardener, destId, state);
  gardener.energy -= FAST_TRAVEL_COST;
  gardener.lastActiveTick = state.tick;
  return ok();
}

export function reverse(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'walking') return fail('Not walking');

  const path = PATH_MAP[gardener.pathId];
  if (!path) return fail('Path not found');

  gardener.travelQueue = [];
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

  const list = gardener.state === 'arriving'
    ? (gardener.arrivedEncounters || [])
    : gardener.encounteredThisTrip;
  const encounter = list.find(e => e.id === fromId);
  if (!encounter) return fail('Gardener not encountered');

  let encounteredGardener = null;
  for (const [dId, g] of Object.entries(state.gardeners)) {
    if (g.id === fromId) { encounteredGardener = g; break; }
  }
  if (!encounteredGardener || !encounteredGardener.seed) {
    return fail('Encountered gardener is not carrying a seed');
  }

  gardener.seed = encounteredGardener.seed;
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
  gardener.arrivedEncounters = null;
  gardener.availableSeeds = null;
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
  if (gardener.state !== 'resting') return fail('Must be resting');
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
  rule.safeUntil = null;
  gardener.lastActiveTick = state.tick;
  return ok();
}

export function pickSeed(deviceId, seedId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'walking' && gardener.state !== 'arriving') {
    return fail('Must be walking or arriving');
  }
  if (!gardener.availableSeeds || !gardener.availableSeeds.includes(seedId)) {
    return fail('Seed not available');
  }
  gardener.seed = seedId;
  gardener.lastActiveTick = state.tick;
  return ok();
}

export function deleteGardener(deviceId, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  for (const locData of Object.values(state.locations)) {
    for (const pot of locData.pots) {
      const idx = pot.decorators.indexOf(gardener.id);
      if (idx !== -1) pot.decorators.splice(idx, 1);
    }
  }
  delete state.gardeners[deviceId];
  return ok();
}

export function queueTravel(deviceId, pathIds, state) {
  const gardener = state.gardeners[deviceId];
  if (!gardener) return fail('Gardener not found');
  if (gardener.state !== 'resting') return fail('Must be resting');
  if (!gardener.locationId) return fail('Not at a location');
  if (!Array.isArray(pathIds) || pathIds.length === 0) return fail('No paths provided');

  let currentLocId = gardener.locationId;
  for (const pathId of pathIds) {
    const path = PATH_MAP[pathId];
    if (!path) return fail(`Path not found: ${pathId}`);
    if (path.fromId !== currentLocId && path.toId !== currentLocId) {
      return fail(`Path ${pathId} does not connect from ${currentLocId}`);
    }
    currentLocId = path.fromId === currentLocId ? path.toId : path.fromId;
  }

  gardener.travelQueue = pathIds.slice(1);
  return walk(deviceId, pathIds[0], state);
}
