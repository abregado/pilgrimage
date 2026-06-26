import { SEEDS, SEED_MAP } from './seeds.js';
import { LOCATIONS, LOCATION_MAP, PATH_MAP } from './world.js';

let _state = null;

function makeFreshLocations() {
  const locations = {};
  for (const loc of LOCATIONS) {
    const originSeed = SEEDS.find(s => s.locationId === loc.id);
    const pots = [
      {
        id: `${loc.id}_pot_0`,
        seedId: originSeed ? originSeed.id : null,
        isOrigin: true,
        singers: [],
        settlingUntil: null,
      },
      {
        id: `${loc.id}_pot_1`,
        seedId: null,
        isOrigin: false,
        singers: [],
        settlingUntil: null,
      },
      {
        id: `${loc.id}_pot_2`,
        seedId: null,
        isOrigin: false,
        singers: [],
        settlingUntil: null,
      },
    ];
    locations[loc.id] = { pots };
  }
  return locations;
}

export function initState(loaded) {
  if (loaded && loaded.tick !== undefined && loaded.locations && loaded.gardeners) {
    _state = loaded;
  } else {
    _state = {
      tick: 0,
      gardeners: {},
      locations: makeFreshLocations(),
    };
  }
}

export function getState() {
  return _state;
}

export function getCherishedPot(locationId) {
  const loc = _state.locations[locationId];
  if (!loc) return null;

  let best = null;
  let bestCount = -1;

  for (const pot of loc.pots) {
    if (!pot.seedId) continue; // empty pots can't be cherished
    const count = pot.singers.length;
    if (count > bestCount || (count === bestCount && pot.isOrigin)) {
      best = pot;
      bestCount = count;
    }
  }

  // Must have at least 0 singers? Actually any non-empty pot with most singers is cherished.
  // But ties go to origin. A pot with 0 singers can still be cherished if all pots have 0.
  return best ? best.id : null;
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
    const cherishedPotId = getCherishedPot(gardener.locationId);

    // Other gardeners at this location
    const otherGardeners = [];
    for (const [dId, g] of Object.entries(_state.gardeners)) {
      if (dId !== deviceId && g.locationId === gardener.locationId && g.state !== 'sleeping') {
        otherGardeners.push({ id: g.id, seed: g.seed });
      }
    }

    const pots = locData.pots.map(pot => {
      const seedMeta = pot.seedId ? SEED_MAP[pot.seedId] : null;
      return {
        id: pot.id,
        seedId: pot.seedId,
        seedName: seedMeta ? seedMeta.name : null,
        isOrigin: pot.isOrigin,
        singerCount: pot.singers.length,
        iAmSinger: pot.singers.includes(gardener.id),
        isCherished: pot.id === cherishedPotId,
        settlingUntil: pot.settlingUntil,
      };
    });

    locationView = {
      id: gardener.locationId,
      name: locMeta.name,
      pots,
      otherGardeners,
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
      encounters: gardener.encounteredThisTrip.map(e => ({ id: e.id, seed: e.seed })),
    };
  }

  // Build arrival data
  let arrivalView = null;
  if (gardener.state === 'arriving' && gardener.locationId) {
    const locMeta = LOCATION_MAP[gardener.locationId];
    arrivalView = {
      locationId: gardener.locationId,
      locationName: locMeta.name,
      encounters: (gardener.arrivedEncounters || []).map(e => ({ id: e.id, seed: e.seed })),
    };
  }

  // Build record data
  const record = gardener.record;
  // Build garden: top 3 pots where iAmSinger and still a singer
  const gardenPots = [];
  for (const potId of record.singerPots) {
    // Find this pot in all locations
    for (const [locId, locData] of Object.entries(_state.locations)) {
      const pot = locData.pots.find(p => p.id === potId);
      if (pot && pot.singers.includes(gardener.id) && pot.seedId) {
        gardenPots.push({
          seedId: pot.seedId,
          otherSingerCount: pot.singers.length - 1,
        });
        break;
      }
    }
  }
  gardenPots.sort((a, b) => b.otherSingerCount - a.otherSingerCount);
  const garden = gardenPots.slice(0, 3);

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
      justTookOrigin: gardener.justTookOrigin,
      createdTick: gardener.createdTick,
      lastActiveTick: gardener.lastActiveTick,
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
  };
}
