import { getState } from '../state.js';
import { formatDistance, formatDuration } from '../utils.js';
import { SEED_MAP } from '../seeds.js';
import { LOCATION_MAP } from '../world.js';

function seedIcon(seedId) {
  if (!seedId) return `<div class="seed-icon" style="background:#222"></div>`;
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  return `<div class="seed-icon" style="background:${color}"><img src="/assets/seed_${seedId}.svg" alt="" onerror="this.style.display='none'"></div>`;
}

export function renderPath(app) {
  const state = getState();
  if (!state) return;

  const { gardener, path, tick } = state;
  if (!path) return;

  // Destination name
  const destId = path.pathFrom === path.fromId ? path.toId : path.fromId;
  const fromId = path.pathFrom;
  const destName = (LOCATION_MAP[destId] || {}).name || destId;
  const fromName = (LOCATION_MAP[fromId] || {}).name || fromId;

  // Progress fraction (from pathFrom toward destination)
  const frac = Math.min(1, path.progress / path.length);
  const pct = (frac * 100).toFixed(1);

  const remaining = path.length - path.progress;
  const ticksLeft = Math.ceil(remaining / 16); // MOVEMENT_SPEED

  let html = `<div class="main-screen"><div class="screen-content">`;

  // Header
  html += `<div class="location-header"><h2>${fromName} &rarr; ${destName}</h2></div>`;

  // Progress
  html += `
    <div class="section progress-wrap">
      <div class="progress-labels">
        <span>${fromName}</span><span>${destName}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="path-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-eta" id="path-eta">
        ${formatDistance(Math.max(0, remaining))} remaining &middot; ~${formatDuration(ticksLeft)}
      </div>
    </div>`;

  // Carry
  html += `<div class="section"><h3>Carrying</h3>`;
  if (gardener.seed) {
    const seed = SEED_MAP[gardener.seed];
    const color = seed ? seed.color : '#666';
    html += `<div class="carry-bar">
      ${seedIcon(gardener.seed)}
      <span class="carry-name" style="color:${color}">${seed ? seed.name : gardener.seed}</span>
    </div>`;
  } else {
    html += `<div class="carry-bar"><span class="carry-label">Carrying nothing</span></div>`;
  }
  html += `</div>`;

  // Reverse
  html += `<div class="section">
    <button class="btn" data-action="reverse">Reverse Direction</button>
  </div>`;

  // Encounters
  if (path.encounters && path.encounters.length > 0) {
    html += `<div class="section"><h3>Encountered (${path.encounters.length})</h3><div class="encounter-list">`;
    for (const enc of path.encounters) {
      const encSeed = enc.seed ? SEED_MAP[enc.seed] : null;
      const carrying = gardener.seed === enc.seed && enc.seed !== null;
      html += `
        <div class="encounter-row">
          ${seedIcon(enc.seed)}
          <div class="encounter-info">
            <div>${enc.id}</div>
            <div class="encounter-seed">${encSeed ? encSeed.name : 'Carrying nothing'}</div>
          </div>
          ${enc.seed && !carrying
            ? `<button class="btn btn-sm btn-sage" data-action="take_seed" data-from-id="${enc.id}">Take Seed</button>`
            : ''}
        </div>`;
    }
    html += `</div></div>`;
  }

  html += `</div></div>`; // screen-content, main-screen
  app.innerHTML = html;
}
