import { TICK_RATE, MOVEMENT_SPEED, SLEEP_THRESHOLD, ENERGY_REGEN_TICKS,
         SEEDLING_TICKS, GROWN_TICKS, FRUITING_TICKS, DEAD_TICKS,
         RULE_REFRESH_TICKS, SPEED_BONUS_PER_RULE } from './constants.js';
import { PATH_MAP } from './world.js';
import { SEEDS } from './seeds.js';
import { computeEnergyMax } from './state.js';
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

  // 1. Increment tick
  state.tick++;

  // 2. Advance walking gardeners
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state !== 'walking') continue;
    const completedRules = (gardener.rules || []).filter(r => r.completed && r.deletedTick === null).length;
    gardener.progress += MOVEMENT_SPEED * (gardener.speedBonus ?? 1) * (1 + completedRules * SPEED_BONUS_PER_RULE);
    changed = true;
  }

  // 3. Check for arrivals
  for (const gardener of Object.values(state.gardeners)) {
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
          gardener.locationMemory[destId] = locData.pots.map(p => ({ id: p.id, seedId: p.seedId }));
        }
        for (const otherG of Object.values(state.gardeners)) {
          if (otherG.id !== gardener.id && otherG.locationId === destId &&
              (otherG.state === 'resting' || otherG.state === 'tending') && otherG.seed) {
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

      changed = true;
    }
  }

  // 4. Encounters between walking gardeners going opposite directions
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

        changed = true;
      }
    }
  }

  // 5. Tending expiry
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state === 'tending' && gardener.tendingUntil !== null && gardener.tendingUntil <= state.tick) {
      gardener.state = 'resting';
      gardener.tendingUntil = null;
      changed = true;
    }
  }

  // 6. Settling expiry and dead-pot cleanup (with dead-stage marking for resting gardeners)
  for (const [locId, locData] of Object.entries(state.locations)) {
    for (const pot of locData.pots) {
      if (pot.settlingUntil !== null && pot.settlingUntil <= state.tick) {
        pot.settlingUntil = null;
        changed = true;
      }
      if (pot.seedId && pot.lastPlantedTick !== null &&
          (state.tick - pot.lastPlantedTick) >= DEAD_TICKS) {
        // Mark dead seen for any resting gardener at this location before clearing
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
      }
    }
  }

  // 7. Seed stage observation for resting gardeners
  for (const gardener of Object.values(state.gardeners)) {
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
      }
    }
  }

  // 8. Energy regen and energyMax sync
  for (const gardener of Object.values(state.gardeners)) {
    const newMax = computeEnergyMax(gardener, state);
    if (gardener.energyMax !== newMax) {
      gardener.energyMax = newMax;
      if (gardener.energy > gardener.energyMax) gardener.energy = gardener.energyMax;
      changed = true;
    }
    if (gardener.energy < gardener.energyMax && state.tick % ENERGY_REGEN_TICKS === 0) {
      gardener.energy += 1;
      changed = true;
    }
  }

  // 9. Rules: refresh cooling slots, evaluate completion, expand new slots
  for (const gardener of Object.values(state.gardeners)) {
    if (!gardener.rules) continue;

    for (let i = 0; i < gardener.rules.length; i++) {
      const rule = gardener.rules[i];
      if (rule.deletedTick !== null && state.tick >= rule.refreshAt) {
        const fresh = pickNewRuleForLevel(rule.level, gardener.rules);
        if (fresh) { gardener.rules[i] = fresh; changed = true; }
      }
    }

    const uniqueVisited = [...new Set(gardener.record.wanderings)];
    for (const rule of gardener.rules) {
      if (rule.deletedTick !== null || rule.completed) continue;
      const template = RULE_TEMPLATE_MAP[rule.templateId];
      if (!template) continue;
      let count = 0;
      for (const locId of uniqueVisited) {
        const locData = state.locations[locId];
        if (locData && template.check(locData.pots)) count++;
      }
      if (count >= rule.difficulty) {
        rule.completed = true;
        gardener.speedBonus = Math.round((gardener.speedBonus ?? 1) * 1.02 * 1000) / 1000;
        changed = true;
      }
    }
  }

  // 10. Sleep check
  for (const gardener of Object.values(state.gardeners)) {
    if (gardener.state === 'resting' && gardener.lastActiveTick + SLEEP_THRESHOLD < state.tick) {
      gardener.state = 'sleeping';
      changed = true;
    }
  }

  // 11. Save if changed
  if (changed) saveState(state);

  // 12. Push updated view to all connected clients
  broadcast();
}
