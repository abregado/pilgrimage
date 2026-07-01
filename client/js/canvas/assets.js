// Asset preloader — all images decoded before first frame

import { SEEDS } from '../seeds.js';

const _imgs = {};

const PLANT_STAGES = ['seed', 'seedling', 'grown', 'fruiting', 'dead'];

function _load(key, src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => { _imgs[key] = img; resolve(); };
    img.onerror = () => { _imgs[key] = null; resolve(); }; // tolerate missing
    img.src = src;
  });
}

export async function loadAssets() {
  const tasks = [];

  // Plant stage images
  for (const seed of SEEDS) {
    for (const stage of PLANT_STAGES) {
      tasks.push(_load(`${seed.id}_${stage}`, `/assets/${seed.id}_${stage}.png`));
    }
  }

  // Empty pot
  tasks.push(_load('empty_pot', '/assets/empty_pot.png'));

  // Seed SVG icons
  for (const seed of SEEDS) {
    tasks.push(_load(`seed_${seed.id}`, `/assets/seed_${seed.id}.svg`));
  }

  // Nav icons
  for (const name of ['map', 'record', 'info', 'location']) {
    tasks.push(_load(`nav_${name}`, `/assets/nav-${name}.svg`));
  }

  // Pilgrim figure (travel scene + map marker) — faces right, flipped for
  // leftward travel by the renderer.
  tasks.push(_load('pilgrim', '/assets/pilgrim.svg'));

  // Optional assets (may not exist yet — fail silently)
  for (const key of ['meeple', 'meeple-travel', 'texture-surface',
                      'travel-bg', 'travel-mid', 'travel-fg',
                      'divider-floral', 'pip-leaf', 'connect-bg']) {
    tasks.push(_load(key, `/assets/${key}.png`).catch(() => {}));
    tasks.push(_load(`${key}_svg`, `/assets/${key}.svg`).catch(() => {}));
  }

  await Promise.all(tasks);
}

export function getImg(key) {
  return _imgs[key] ?? null;
}
