import {
  TICK_RATE, MOVEMENT_SPEED, SLEEP_THRESHOLD, ENERGY_REGEN_TICKS,
  SEEDLING_TICKS, GROWN_TICKS, FRUITING_TICKS, DEAD_TICKS,
  RULE_REFRESH_TICKS, SPEED_BONUS_PER_RULE, SPEED_BONUS_FULL_VISION,
  RULE_SAFE_TIME, INITIAL_RULE_SLOTS, FAST_TRAVEL_MULTI,
} from './constants.js';
import { PATH_MAP } from './world.js';
import { SEEDS } from './seeds.js';
import { computeEnergyMax, nonWalkingDeviceIdsAtLocation } from './state.js';
import { RULE_TEMPLATE_MAP, pickNewRuleForLevel } from './rules.js';

export function startGameLoop(getState, saveState, broadcast) {
  setInterval(() => tick(getState, saveState, broadcast), TICK_RATE);
}

function growthStage(lastPlantedTick, tick) {
  if (lastPlantedTick === null) return null;
  const age = tick - lastPlantedTick;
  if (age >= DEAD_TICKS)     return 'dead';
  if (age >= FRUITING_TICKS) return 'fruiting';
  if (age >= GROWN_TICKS)    return 'grown';
  if (age >= SEEDLING_TICKS) return 'seedling';
  return 'seed';
}

function tick(getState, saveState, broadcast) {
  const state = getState();
  let changed = false;

  // Build gardener.id → deviceId reverse map
  const idToDevice = {};
  const notifySet = new Set();
  for (const [deviceId, g] of Object.entries(state.gardeners)) {
    idToDevice[g.id] = deviceId;
  }

  // 1. Increment tick
  state.tick++;

  // 2. Advance walking gardeners (client animates locally — no notify needed for progress only)
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    const activeRules = (gardener.rules || []).filter(r => r.deletedTick === null);
    const completedCount = activeRules.filter(r => r.completed).length;
    const fullVisionBonus = completedCount === INITIAL_RULE_SLOTS ? SPEED_BONUS_FULL_VISION : 0;
    const fastMulti = gardener.fastTravel ? FAST_TRAVEL_MULTI : 1;
    gardener.progress += MOVEMENT_SPEED * (gardener.speedBonus ?? 1) * (1 + completedCount * SPEED_BONUS_PER_RULE + fullVisionBonus) * fastMulti;
    changed = true;
  }

  // 3. Check for arrivals — notify the arriving gardener
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    const path = PATH_MAP[gardener.pathId];
    if (!path) continue;

    if (gardener.progress >= path.length) {
      const destId = path.fromId === gardener.pathFrom ? path.toId : path.fromId;
      gardener.record.wanderings.push(destId);

      const nextPathId = gardener.travelQueue && gardener.travelQueue.length > 0
        ? gardener.travelQueue[0] : null;
      const nextPath = nextPathId ? PATH_MAP[nextPathId] : null;

      if (nextPath && (nextPath.fromId === destId || nextPath.toId === destId)) {
        // Auto-start next leg: snapshot seeds and memory at this intermediate location
        gardener.travelQueue.shift();
        const locData = state.locations[destId];
        const originSeed = SEEDS.find(s => s.locationId === destId);
        const poolSet = new Set();
        if (originSeed) poolSet.add(originSeed.id);
        if (gardener.seed) poolSet.add(gardener.seed);
        if (locData) {
          for (const p of locData.pots) {
            if (p.seedId && p.lastPlantedTick !== null &&
                (state.tick - p.lastPlantedTick) >= GROWN_TICKS) {
              poolSet.add(p.seedId);
            }
          }
          if (!gardener.locationMemory) gardener.locationMemory = {};
          gardener.locationMemory[destId] = locData.pots.map(p => ({ id: p.id, seedId: p.seedId, lastPlantedTick: p.lastPlantedTick }));
        }
        for (const otherG of Object.values(state.gardeners)) {
          if (otherG.id !== gardener.id && otherG.locationId === destId &&
              otherG.state === 'resting' && otherG.seed) {
            poolSet.add(otherG.seed);
          }
        }
        gardener.availableSeeds = [...poolSet];

        gardener.pathId = nextPathId;
        gardener.pathFrom = destId;
        gardener.progress = 0;
        gardener.state = 'walking';
        gardener.locationId = null;
        gardener.encounteredThisTrip = [];
        gardener.arrivedEncounters = null;
      } else {
        // No valid queued path — normal arrival
        if (gardener.travelQueue) gardener.travelQueue = [];
        gardener.state = 'arriving';
        gardener.locationId = destId;
        gardener.arrivedEncounters = [...gardener.encounteredThisTrip];
        gardener.encounteredThisTrip = [];
        gardener.pathId = null;
        gardener.pathFrom = null;
        gardener.progress = 0;
      }

      notifySet.add(deviceId);
      changed = true;
    }
  }

  // 4. Encounters between walking gardeners going opposite directions — notify both
  const pathGroups = {};
  for (const gardener of Object.values(state.gardeners)) {
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

        const aToward = a.pathFrom === path.fromId ? path.toId : path.fromId;
        const bToward = b.pathFrom === path.fromId ? path.toId : path.fromId;
        if (aToward === bToward) continue;

        const absA = a.pathFrom === path.fromId ? a.progress : path.length - a.progress;
        const absB = b.pathFrom === path.fromId ? b.progress : path.length - b.progress;

        const sum = absA + absB;
        if (sum < path.length || sum >= path.length + 2 * MOVEMENT_SPEED) continue;

        if (a.encounteredThisTrip.some(e => e.id === b.id)) continue;

        a.encounteredThisTrip.push({ id: b.id, seed: b.seed });
        b.encounteredThisTrip.push({ id: a.id, seed: a.seed });

        if (b.seed && a.record.seedLog[b.seed]) a.record.seedLog[b.seed].seed = true;
        if (a.seed && b.record.seedLog[a.seed]) b.record.seedLog[a.seed].seed = true;

        notifySet.add(idToDevice[a.id]);
        notifySet.add(idToDevice[b.id]);
        changed = true;
      }
    }
  }

  // 5. Settling expiry and dead-pot cleanup (with dead-stage marking for resting gardeners)
  for (const [locId, locData] of Object.entries(state.locations)) {
    for (const pot of locData.pots) {
      if (pot.settlingUntil !== null && pot.settlingUntil <= state.tick) {
        pot.settlingUntil = null;
        changed = true;
        for (const dId of nonWalkingDeviceIdsAtLocation(state, locId)) notifySet.add(dId);
      }
      if (pot.seedId && pot.lastPlantedTick !== null &&
          (state.tick - pot.lastPlantedTick) >= DEAD_TICKS) {
        for (const g of Object.values(state.gardeners)) {
          if (g.state === 'resting' && g.locationId === locId &&
              g.record.seedLog[pot.seedId] && !g.record.seedLog[pot.seedId].dead) {
            g.record.seedLog[pot.seedId].dead = true;
            changed = true;
          }
        }
        pot.seedId = null;
        pot.lastPlantedTick = null;
        pot.decorators = [];
        pot.settlingUntil = null;
        changed = true;
        for (const dId of nonWalkingDeviceIdsAtLocation(state, locId)) notifySet.add(dId);
      }
    }
  }

  // 6. Seed stage observation for resting gardeners
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    if (gardener.state !== 'resting' || !gardener.locationId) continue;
    const locData = state.locations[gardener.locationId];
    if (!locData) continue;
    for (const pot of locData.pots) {
      if (!pot.seedId || pot.lastPlantedTick === null) continue;
      const stage = growthStage(pot.lastPlantedTick, state.tick);
      if (stage && stage !== 'dead' && gardener.record.seedLog[pot.seedId] &&
          !gardener.record.seedLog[pot.seedId][stage]) {
        gardener.record.seedLog[pot.seedId][stage] = true;
        changed = true;
        notifySet.add(deviceId);
      }
    }
  }

  // 7. Energy regen and energyMax sync
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    const newMax = computeEnergyMax(gardener, state);
    if (gardener.energyMax !== newMax) {
      gardener.energyMax = newMax;
      if (gardener.energy > gardener.energyMax) gardener.energy = gardener.energyMax;
      changed = true;
      notifySet.add(deviceId);
    }
    if (gardener.energy < gardener.energyMax && state.tick % ENERGY_REGEN_TICKS === 0) {
      gardener.energy += 1;
      changed = true;
      notifySet.add(deviceId);
    }
  }

  // 8. Rules: refresh cooling slots, evaluate completion/expiry
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    if (!gardener.rules) continue;

    // Refresh cooling slots
    for (let i = 0; i < gardener.rules.length; i++) {
      const rule = gardener.rules[i];
      if (rule.deletedTick !== null && state.tick >= rule.refreshAt) {
        const fresh = pickNewRuleForLevel(rule.level, gardener.rules);
        if (fresh) { gardener.rules[i] = fresh; changed = true; notifySet.add(deviceId); }
      }
    }

    const uniqueVisited = [...new Set(gardener.record.wanderings)];

    for (const rule of gardener.rules) {
      if (rule.deletedTick !== null) continue;

      // Skip while in safe period
      if (rule.safeUntil !== null && rule.safeUntil > state.tick) continue;

      const template = RULE_TEMPLATE_MAP[rule.templateId];
      if (!template) continue;

      let count = 0;
      for (const locId of uniqueVisited) {
        const locData = state.locations[locId];
        if (locData && template.check(locData.pots, state.tick)) count++;
      }

      const wasCompleted = rule.completed;
      const nowCompleted = count >= rule.difficulty;

      if (nowCompleted && !wasCompleted) {
        rule.completed = true;
        rule.safeUntil = state.tick + RULE_SAFE_TIME;
        gardener.speedBonus = Math.round((gardener.speedBonus ?? 1) * 1.02 * 1000) / 1000;

        // If this completes the last active rule, extend all safe times
        const activeRules = gardener.rules.filter(r => r.deletedTick === null);
        if (activeRules.every(r => r.completed)) {
          for (const r of activeRules) r.safeUntil = state.tick + RULE_SAFE_TIME * 3;
        }

        notifySet.add(deviceId);
        changed = true;
      } else if (!nowCompleted && wasCompleted) {
        // Safe period expired and conditions no longer met — un-complete
        rule.completed = false;
        rule.safeUntil = null;
        gardener.speedBonus = Math.round((gardener.speedBonus ?? 1) / 1.02 * 1000) / 1000;
        notifySet.add(deviceId);
        changed = true;
      } else if (nowCompleted && wasCompleted) {
        // Renew safe period
        rule.safeUntil = state.tick + RULE_SAFE_TIME;
        changed = true;
      }
    }
  }

  // 9. Sleep check
  for (const [deviceId, gardener] of Object.entries(state.gardeners)) {
    if (gardener.state === 'resting' && gardener.lastActiveTick + SLEEP_THRESHOLD < state.tick) {
      gardener.state = 'sleeping';
      changed = true;
      notifySet.add(deviceId);
    }
  }

  // 10. Save if changed
  if (changed) saveState(state);

  // 11. Push updated view — walking clients only notified on meaningful events
  broadcast(notifySet);
}
