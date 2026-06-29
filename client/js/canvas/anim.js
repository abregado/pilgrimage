// Time-based animation state management

import { getReducedMotion } from './theme.js';

const _anims = {}; // key -> { startTime, duration }
let   _now   = 0;

export function tickAnims(timestamp) {
  _now = timestamp;
}

export function startAnim(key, durationMs = 300) {
  if (getReducedMotion()) {
    _anims[key] = { startTime: -Infinity, duration: 1 };
    return;
  }
  _anims[key] = { startTime: _now, duration: durationMs };
}

export function getAnimRaw(key) {
  const a = _anims[key];
  if (!a) return 1;
  const t = (_now - a.startTime) / a.duration;
  return Math.min(1, Math.max(0, t));
}

export function getAnimT(key) {
  return easeOut(getAnimRaw(key));
}

export function getAnimSpring(key) {
  return spring(getAnimRaw(key));
}

export function running(key) {
  const a = _anims[key];
  if (!a) return false;
  return (_now - a.startTime) < a.duration;
}

export function clearAnim(key) {
  delete _anims[key];
}

// ── Easing functions ──────────────────────────────────────────────────────────

export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Spring-like overshoot curve
export function spring(t) {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Oscillating sine wave (for pulsing effects)
export function pulse(period = 2000) {
  return (Math.sin((_now / period) * Math.PI * 2) + 1) / 2;
}

// For travel meeple bob
export function bob(amplitude = 2.5, speed = 3.5) {
  return Math.sin((_now / 1000) * speed) * amplitude;
}
