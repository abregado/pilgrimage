// Shared pot growth-stage / energy-cost math — mirrors server/gameLoop.js's
// growthStage() and server/actions.js's potEnergyCost(), so the client can
// derive the same values locally without waiting on a broadcast.
import {
  SEEDLING_TICKS, GROWN_TICKS, FRUITING_TICKS, DEAD_TICKS,
  ENERGY_COST_BASE, ENERGY_COST_SEEDLING, ENERGY_COST_GROWN, ENERGY_COST_FRUITING,
} from '/js/constants.js';

export function getGrowthStage(lastPlantedTick, currentTick) {
  if (lastPlantedTick === null || lastPlantedTick === undefined) return null;
  const age = currentTick - lastPlantedTick;
  if (age >= DEAD_TICKS)     return 'dead';
  if (age >= FRUITING_TICKS) return 'fruiting';
  if (age >= GROWN_TICKS)    return 'grown';
  if (age >= SEEDLING_TICKS) return 'seedling';
  return 'seed';
}

export function timeToNextStage(lastPlantedTick, currentTick) {
  if (lastPlantedTick === null || lastPlantedTick === undefined) return null;
  const age = currentTick - lastPlantedTick;
  if (age < SEEDLING_TICKS) return { next: 'seedling', remaining: SEEDLING_TICKS - age };
  if (age < GROWN_TICKS)    return { next: 'grown',    remaining: GROWN_TICKS    - age };
  if (age < FRUITING_TICKS) return { next: 'fruiting', remaining: FRUITING_TICKS - age };
  if (age < DEAD_TICKS)     return { next: 'dead',     remaining: DEAD_TICKS     - age };
  return null;
}

export function potEnergyCost(pot, tick) {
  if (!pot.seedId || pot.lastPlantedTick === null || pot.lastPlantedTick === undefined) {
    return ENERGY_COST_BASE;
  }
  const age = tick - pot.lastPlantedTick;
  if (age >= DEAD_TICKS)     return ENERGY_COST_BASE;
  if (age >= FRUITING_TICKS) return ENERGY_COST_FRUITING;
  if (age >= GROWN_TICKS)    return ENERGY_COST_GROWN;
  if (age >= SEEDLING_TICKS) return ENERGY_COST_SEEDLING;
  return ENERGY_COST_BASE;
}
