import { ENERGY_REGEN_TICKS } from '/js/constants.js';
import { formatDuration } from './utils.js';

let _serverTick = 0;
let _serverTickAt = 0;
let _predictedEnergy = 0;
let _predictedRegenAt = null;
let _energyMax = 0;

export function setServerTick(tick, energy, energyRegenAt, energyMax) {
  _serverTick = tick;
  _serverTickAt = performance.now();
  _predictedEnergy = energy ?? 0;
  _predictedRegenAt = energyRegenAt ?? null;
  _energyMax = energyMax ?? 0;
}

export function liveTick() {
  return _serverTick + Math.floor((performance.now() - _serverTickAt) / 1000);
}

export function startClockUpdater() {
  setInterval(_updateCountdowns, 250);
}

function _updateEnergyBarInPlace(tick) {
  document.querySelectorAll('.energy-pip').forEach((pip, i) => {
    pip.classList.toggle('full', i < _predictedEnergy);
  });
  const label = document.querySelector('.energy-label');
  if (label) label.textContent = `${_predictedEnergy}/${_energyMax}`;

  const regenEl = document.querySelector('[data-countdown="regen"]');
  if (regenEl) {
    if (_predictedRegenAt !== null && _predictedEnergy < _energyMax) {
      regenEl.textContent = `+1 in ${formatDuration(Math.max(0, _predictedRegenAt - tick))}`;
    } else {
      regenEl.textContent = '';
    }
  }
}

function _updateCountdowns() {
  const tick = liveTick();

  // 1C: advance predicted energy across regen boundaries
  let energyChanged = false;
  while (_predictedRegenAt !== null && tick >= _predictedRegenAt && _predictedEnergy < _energyMax) {
    _predictedEnergy++;
    _predictedRegenAt += ENERGY_REGEN_TICKS;
    energyChanged = true;
  }
  if (energyChanged) _updateEnergyBarInPlace(tick);

  // Update all registered countdown text nodes
  for (const el of document.querySelectorAll('[data-countdown]')) {
    const type = el.dataset.countdown;
    if (type === 'regen') {
      if (_predictedRegenAt !== null && _predictedEnergy < _energyMax) {
        el.textContent = `+1 in ${formatDuration(Math.max(0, _predictedRegenAt - tick))}`;
      }
    } else {
      const until = parseInt(el.dataset.until ?? '0');
      const rem = Math.max(0, until - tick);
      if (type === 'stage') {
        el.textContent = `${el.dataset.next} in ${formatDuration(rem)}`;
      } else if (type === 'settling') {
        el.textContent = `settling ${formatDuration(rem)}`;
      } else if (type === 'vision-safe') {
        el.textContent = `Safe ${formatDuration(rem)}`;
      }
    }
  }
}
