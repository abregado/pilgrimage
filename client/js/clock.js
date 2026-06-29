import { ENERGY_REGEN_TICKS } from '/js/constants.js';
import { invalidate } from './canvas/engine.js';

let _serverTick     = 0;
let _serverTickAt   = 0;
let _predictedEnergy    = 0;
let _predictedRegenAt   = null;
let _energyMax      = 0;

export function setServerTick(tick, energy, energyRegenAt, energyMax) {
  _serverTick      = tick;
  _serverTickAt    = performance.now();
  _predictedEnergy = energy ?? 0;
  _predictedRegenAt = energyRegenAt ?? null;
  _energyMax       = energyMax ?? 0;
}

export function liveTick() {
  return _serverTick + Math.floor((performance.now() - _serverTickAt) / 1000);
}

export function getPredictedEnergy()   { return _predictedEnergy; }
export function getPredictedRegenAt()  { return _predictedRegenAt; }

export function startClockUpdater() {
  setInterval(_tick, 250);
}

function _tick() {
  const tick = liveTick();
  let changed = false;

  // Advance predicted energy across regen boundaries
  while (_predictedRegenAt !== null && tick >= _predictedRegenAt && _predictedEnergy < _energyMax) {
    _predictedEnergy++;
    _predictedRegenAt += ENERGY_REGEN_TICKS;
    changed = true;
  }

  // Invalidate canvas every 250ms so countdown timers re-render
  invalidate();
}
