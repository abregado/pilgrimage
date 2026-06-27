import { SEEDS, SEED_MAP } from './seeds.js';
import { LOCATIONS, LOCATION_MAP, PATH_MAP } from './world.js';
import { MOVEMENT_SPEED, BASE_ENERGY_MAX, GROWN_TICKS, SPEED_BONUS_PER_RULE } from './constants.js';
import { RULE_TEMPLATE_MAP } from './rules.js';

let _state = null;

function makeFreshLocations() {
  const locations = {};
  for (const loc of LOCATIONS) {
    const originSeed = SEEDS.find(s => s.locationId === loc.id);
    const pots = [];
    for (let i = 0; i < loc.potCount; i++) {
      pots.push({
        id: `${loc.id}_pot_${i}`,
        seedId: null,
        decorators: [],
        settlingUntil: null,
        lastPlantedTick: null,
      });
    }
    locations[loc.id] = { pots };
  }
  return locations;
}

const CURRENT_VERSION = 9;

export function computeEnergyMax(gardener, state) {
  let max = BASE_ENERGY_MAX;
  const age = state.tick - gardener.createdTick;
  if (age >= 86400)  max += 1; // 1 day
  if (age >= 604800) max += 1; // 1 week
  const allLocIds = new Set(LOCATIONS.map(l => l.id));
  if ([...allLocIds].every(id => gardener.record.wanderings.includes(id))) max += 1;
  if (gardener.rules) {
    max += gardener.rules.filter(r => r.completed && r.deletedTick === null).length;
  }
  return max;
}

function migrate(loaded) {
  const v = loaded.version || 1;
  if (v === CURRENT_VERSION) return loaded;
  // Version mismatch: wipe and rebuild (no long-lived player records worth preserving yet)
  console.log(`State version ${v} → ${CURRENT_VERSION}: rebuilding fresh state`);
  return null;
}

export function initState(loaded) {
  if (loaded && loaded.tick !== undefined && loaded.locations && loaded.gardeners) {
    const migrated = migrate(loaded);
    if (migrated) {
      _state = migrated;
    } else {
      _state = { version: CURRENT_VERSION, tick: 0, gardeners: {}, locations: makeFreshLocations() };
    }
  } else {
    _state = { version: CURRENT_VERSION, tick: 0, gardeners: {}, locations: makeFreshLocations() };
  }
}

export function getState() {
  return _state;
}


export function getGardenerView(deviceId) {
  if (!_state) return null;
  const gardener = _state.gardeners[deviceId];
  if (!gardener) return null;

  const tick = _state.tick;

  // Build location data
  let locationView = null;
  if (gardener.locationId) {
    const locData = _state.locations[gardener.locationId];
    const locMeta = LOCATION_MAP[gardener.locationId];
    // Other gardeners at this location
    const otherGardeners = [];
    for (const [dId, g] of Object.entries(_state.gardeners)) {
      if (dId !== deviceId && g.locationId === gardener.locationId && g.state !== 'sleeping') {
        otherGardeners.push({ id: g.id, seed: g.seed, state: g.state });
      }
    }

    const pots = locData.pots.map(pot => {
      const seedMeta = pot.seedId ? SEED_MAP[pot.seedId] : null;
      return {
        id: pot.id,
        seedId: pot.seedId,
        seedName: seedMeta ? seedMeta.name : null,
        decoratorCount: pot.decorators.length,
        iDecorated: pot.decorators.includes(gardener.id),
        settlingUntil: pot.settlingUntil,
        lastPlantedTick: pot.lastPlantedTick,
      };
    });

    // Build seedPool: origin seed + planted seeds + your carried seed + seeds carried by others here
    const originSeed = SEEDS.find(s => s.locationId === gardener.locationId);
    const poolSet = new Set();
    if (originSeed) poolSet.add(originSeed.id);
    if (gardener.seed) poolSet.add(gardener.seed);
    for (const pot of locData.pots) {
      if (pot.seedId && pot.lastPlantedTick !== null &&
          (tick - pot.lastPlantedTick) >= GROWN_TICKS) {
        poolSet.add(pot.seedId);
      }
    }
    for (const [dId, g] of Object.entries(_state.gardeners)) {
      if (dId !== deviceId && g.locationId === gardener.locationId &&
          (g.state === 'resting' || g.state === 'tending') && g.seed) {
        poolSet.add(g.seed);
      }
    }

    locationView = {
      id: gardener.locationId,
      name: locMeta.name,
      pots,
      otherGardeners,
      seedPool: [...poolSet],
    };
  }

  // Build path data
  let pathView = null;
  if (gardener.pathId) {
    const path = PATH_MAP[gardener.pathId];
    const fromLoc = LOCATION_MAP[path.fromId];
    const toLoc = LOCATION_MAP[path.toId];

    pathView = {
      id: path.id,
      length: path.length,
      fromId: path.fromId,
      fromName: fromLoc.name,
      toId: path.toId,
      toName: toLoc.name,
      progress: gardener.progress,
      pathFrom: gardener.pathFrom,
      encounters: gardener.encounteredThisTrip.map(e => {
        const g = Object.values(_state.gardeners).find(g => g.id === e.id);
        return { id: e.id, seed: e.seed, state: g ? g.state : 'walking' };
      }),
    };
  }

  // Build arrival data
  let arrivalView = null;
  if (gardener.state === 'arriving' && gardener.locationId) {
    const locMeta = LOCATION_MAP[gardener.locationId];
    arrivalView = {
      locationId: gardener.locationId,
      locationName: locMeta.name,
      encounters: (gardener.arrivedEncounters || []).map(e => {
        const g = Object.values(_state.gardeners).find(g => g.id === e.id);
        return { id: e.id, seed: e.seed, state: g ? g.state : 'walking' };
      }),
    };
  }

  // Build record data
  const record = gardener.record;
  // Build garden: top 3 pots where iDecorated and still a decorator
  const gardenPots = [];
  for (const potId of record.decoratedPots) {
    for (const [locId, locData] of Object.entries(_state.locations)) {
      const pot = locData.pots.find(p => p.id === potId);
      if (pot && pot.decorators.includes(gardener.id) && pot.seedId) {
        gardenPots.push({
          seedId: pot.seedId,
          otherDecoratorCount: pot.decorators.length - 1,
        });
        break;
      }
    }
  }
  gardenPots.sort((a, b) => b.otherDecoratorCount - a.otherDecoratorCount);
  const garden = gardenPots.slice(0, 3);

  // Sync energyMax in case milestones changed, then clamp energy
  gardener.energyMax = computeEnergyMax(gardener, _state);
  if (gardener.energy > gardener.energyMax) gardener.energy = gardener.energyMax;

  // Build rules view
  const uniqueVisited = [...new Set(gardener.record.wanderings)];
  const currentLocId = gardener.locationId;
  const rulesView = (gardener.rules || []).map(rule => {
    if (rule.deletedTick !== null) {
      return { id: rule.id, refreshing: true, refreshAt: rule.refreshAt };
    }
    const template = RULE_TEMPLATE_MAP[rule.templateId];
    let satisfiedCount = 0;
    let satisfiedHere = false;
    if (template) {
      for (const locId of uniqueVisited) {
        const locData = _state.locations[locId];
        if (locData && template.check(locData.pots)) {
          satisfiedCount++;
          if (locId === currentLocId) satisfiedHere = true;
        }
      }
    }
    return {
      id: rule.id,
      templateId: rule.templateId,
      level: rule.level,
      description: rule.description,
      difficulty: rule.difficulty,
      completed: rule.completed,
      satisfiedCount,
      satisfiedHere,
      refreshing: false,
      refreshAt: null,
    };
  });

  return {
    gardener: {
      id: gardener.id,
      state: gardener.state,
      locationId: gardener.locationId,
      pathId: gardener.pathId,
      pathFrom: gardener.pathFrom,
      progress: gardener.progress,
      seed: gardener.seed,
      tendingUntil: gardener.tendingUntil,
      createdTick: gardener.createdTick,
      lastActiveTick: gardener.lastActiveTick,
      energy: gardener.energy,
      energyMax: gardener.energyMax,
      speedBonus: gardener.speedBonus ?? 1,
      rules: rulesView,
    },
    location: locationView,
    path: pathView,
    arrival: arrivalView,
    record: {
      wanderings: record.wanderings,
      seedLog: record.seedLog,
      garden,
      ageTicks: tick - gardener.createdTick,
    },
    tick,
    movementSpeed: MOVEMENT_SPEED,
    rulesSpeedBonus: (gardener.rules || []).filter(r => r.completed && r.deletedTick === null).length * SPEED_BONUS_PER_RULE,
  };
}
