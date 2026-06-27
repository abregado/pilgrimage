import { getState } from '../state.js';
import { SEED_MAP } from '../seeds.js';
import { renderMeeple } from '../meeple.js';

function seedIcon(seedId) {
  if (!seedId) return `<div class="seed-icon" style="background:#222"></div>`;
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  return `<div class="seed-icon" style="background:${color}"><img src="/assets/seed_${seedId}.svg" alt="" onerror="this.style.display='none'"></div>`;
}

export function renderArrival(app) {
  const state = getState();
  if (!state) return;

  const { gardener, arrival } = state;
  if (!arrival) return;

  let html = `<div class="arrival-screen">`;

  html += `
    <div class="arrival-label">Arrived at</div>
    <div class="arrival-name">${arrival.locationName}</div>`;

  // Seed picker
  if (gardener.availableSeeds && gardener.availableSeeds.length > 0) {
    html += `<div class="section" style="text-align:left"><h3>Seed</h3><div class="carry-swap">`;
    for (const seedId of gardener.availableSeeds) {
      const seed = SEED_MAP[seedId];
      const color = seed ? seed.color : '#666';
      const isSelected = gardener.seed === seedId;
      html += `<button class="carry-chip${isSelected ? ' selected' : ''}"
        data-action="pick_seed" data-seed-id="${seedId}"
        ${isSelected ? 'disabled' : ''}
        style="--chip-color:${color}">
        <span class="carry-chip-dot" style="background:${color}"></span>${seed ? seed.name : seedId}
      </button>`;
    }
    html += `</div></div>`;
  }

  // Encounters on the journey
  if (arrival.encounters && arrival.encounters.length > 0) {
    html += `<div class="section" style="text-align:left"><h3>On your journey</h3><div class="encounter-list">`;
    for (const enc of arrival.encounters) {
      const encSeed = enc.seed ? SEED_MAP[enc.seed] : null;
      const carrying = gardener.seed === enc.seed && enc.seed !== null;
      html += `
        <div class="encounter-row">
          ${renderMeeple(enc.state)}
          ${seedIcon(enc.seed)}
          <div class="encounter-info">
            <div class="encounter-seed">${encSeed ? encSeed.name : 'Carrying nothing'}</div>
          </div>
          ${enc.seed && !carrying
            ? `<button class="btn btn-sm btn-sage" data-action="take_seed" data-from-id="${enc.id}">Take Seed</button>`
            : ''}
        </div>`;
    }
    html += `</div></div>`;
  }

  html += `<div class="arrival-continue">
    <button class="btn btn-accent btn-full" data-action="continue">Continue to ${arrival.locationName}</button>
  </div>`;

  html += `</div>`; // arrival-screen
  app.innerHTML = html;
}
