import { TICK_RATE, MOVEMENT_SPEED, SLEEP_THRESHOLD } from './constants.js';
import { PATH_MAP, LOCATION_MAP } from './world.js';
import { SEED_MAP } from './seeds.js';
import { getCherishedPot } from './state.js';

export function startGameLoop(getState, saveState, broadcast) {
  setInterval(() => tick(getState, saveState, broadcast), TICK_RATE);
}

function tick(getState, saveState, broadcast) {
  const state = getState();
  let changed = false;

  // 1. Increment tick
  state.tick++;

  // 2. Advance walking gardeners
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    gardener.progress += MOVEMENT_SPEED;
    changed = true;
  }

  // 3. Check for arrivals
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    const path = PATH_MAP[gardener.pathId];
    if (!path) continue;

    if (gardener.progress >= path.length) {
      // Determine destination: the end that isn't pathFrom
      const destId = path.fromId === gardener.pathFrom ? path.toId : path.fromId;

      gardener.state = 'arriving';
      gardener.locationId = destId;
      gardener.arrivedEncounters = [...gardener.encounteredThisTrip];
      gardener.encounteredThisTrip = [];
      gardener.pathId = null;
      gardener.pathFrom = null;
      gardener.progress = 0;

      // Add to wanderings
      gardener.record.wanderings.push(destId);

      // Seed log discoveries at the arrived location
      updateSeedLogOnArrival(gardener, destId, state);

      changed = true;
    }
  }

  // 4. Check for encounters between walking gardeners going opposite directions
  // Group by pathId
  const pathGroups = {};
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    const pid = gardener.pathId;
    if (!pathGroups[pid]) pathGroups[pid] = [];
    pathGroups[pid].push(gardener);
  }

  for (const [pathId, walkers] of Object.entries(pathGroups)) {
    const path = PATH_MAP[pathId];
    if (!path) continue;

    for (let i = 0; i < walkers.length; i++) {
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i];
        const b = walkers[j];

        // Must be going opposite directions
        const aToward = a.pathFrom === path.fromId ? path.toId : path.fromId;
        const bToward = b.pathFrom === path.fromId ? path.toId : path.fromId;
        if (aToward === bToward) continue; // same direction

        // Absolute positions from path.fromId
        const absA = a.pathFrom === path.fromId ? a.progress : path.length - a.progress;
        const absB = b.pathFrom === path.fromId ? b.progress : path.length - b.progress;

        // Check crossing condition
        // (absA + absB) was < path.length last tick (by ~2*MOVEMENT_SPEED), now >= path.length
        const sum = absA + absB;
        if (sum < path.length || sum >= path.length + 2 * MOVEMENT_SPEED) continue;

        // Already encountered?
        const alreadyEncountered = a.encounteredThisTrip.some(e => e.id === b.id);
        if (alreadyEncountered) continue;

        // Add to each other's encounteredThisTrip
        a.encounteredThisTrip.push({ id: b.id, seed: b.seed });
        b.encounteredThisTrip.push({ id: a.id, seed: a.seed });

        // Seed log: mark 'seed' discovered for encountered seed
        if (b.seed && a.record.seedLog[b.seed]) {
          a.record.seedLog[b.seed].seed = true;
        }
        if (a.seed && b.record.seedLog[a.seed]) {
          b.record.seedLog[a.seed].seed = true;
        }

        changed = true;
      }
    }
  }

  // 5. Check for tending expiry
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state === 'tending' && gardener.tendingUntil !== null && gardener.tendingUntil <= state.tick) {
      gardener.state = 'resting';
      gardener.tendingUntil = null;
      changed = true;
    }
  }

  // 6. Check for settling expiry
  for (const locData of Object.values(state.locations)) {
    for (const pot of locData.pots) {
      if (pot.settlingUntil !== null && pot.settlingUntil <= state.tick) {
        pot.settlingUntil = null;
        changed = true;
      }
    }
  }

  // 7. Check for sleeping
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state === 'resting' && gardener.lastActiveTick + SLEEP_THRESHOLD < state.tick) {
      gardener.state = 'sleeping';
      changed = true;
    }
  }

  // 8. Save if changed
  if (changed) {
    saveState(state);
  }

  // 9. Push updated view to all connected clients
  broadcast();
}

function updateSeedLogOnArrival(gardener, locationId, state) {
  const locData = state.locations[locationId];
  if (!locData) return;

  const cherishedPotId = getCherishedPot(locationId);

  for (const pot of locData.pots) {
    if (!pot.seedId) continue;

    // Mark 'plant' — they see a planted seed
    if (gardener.record.seedLog[pot.seedId]) {
      gardener.record.seedLog[pot.seedId].plant = true;
    }

    // Mark 'origin' — if this pot is the origin pot
    if (pot.isOrigin && gardener.record.seedLog[pot.seedId]) {
      gardener.record.seedLog[pot.seedId].origin = true;
    }

    // Mark 'cherished' — if this is the cherished pot
    if (pot.id === cherishedPotId && gardener.record.seedLog[pot.seedId]) {
      gardener.record.seedLog[pot.seedId].cherished = true;
    }
  }
}
