import { getState, getJourneyLog } from '../state.js';
import { SEED_MAP, SEEDS } from '../seeds.js';
import { LOCATION_MAP, PATH_MAP } from '../world.js';
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

  // Origin/core seed for the arrival location
  const originSeed = SEEDS.find(s => s.locationId === arrival.locationId);

  let html = `<div class="arrival-screen">`;

  html += `
    <div class="arrival-label">Arrived at</div>
    <div class="arrival-name">${arrival.locationName}</div>`;

  if (originSeed) {
    html += `
      <div class="arrival-core-seed">
        <div class="seed-icon seed-icon-arrival" style="background:${originSeed.color}">
          <img src="/assets/seed_${originSeed.id}.svg" alt="${originSeed.name}" onerror="this.style.display='none'">
        </div>
        <div class="arrival-core-seed-name" style="color:${originSeed.color}">${originSeed.name}</div>
      </div>`;
  }

  // Encounters
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

  // Journey log (locations visited this session)
  const journeyLog = getJourneyLog();
  if (journeyLog.length > 0) {
    html += `<div class="section" style="text-align:left"><h3>Your journey</h3><div class="journey-list">`;
    for (const locId of journeyLog) {
      const loc = LOCATION_MAP[locId];
      html += `<div class="journey-stop">${loc ? loc.name : locId}</div>`;
    }
    html += `</div></div>`;
  }

  // Queued future locations
  if (gardener.travelQueue && gardener.travelQueue.length > 0) {
    const queuedLocIds = [];
    let prevDestId = arrival.locationId;
    for (const pathId of gardener.travelQueue) {
      const p = PATH_MAP[pathId];
      if (!p) break;
      const dest = p.fromId === prevDestId ? p.toId : p.fromId;
      queuedLocIds.push(dest);
      prevDestId = dest;
    }
    if (queuedLocIds.length > 0) {
      html += `<div class="section" style="text-align:left"><h3>Ahead</h3><div class="journey-list">`;
      for (const locId of queuedLocIds) {
        const loc = LOCATION_MAP[locId];
        html += `<div class="journey-stop journey-stop-queued">${loc ? loc.name : locId}</div>`;
      }
      html += `</div></div>`;
    }
  }

  html += `<div class="arrival-continue">
    <button class="btn btn-accent btn-full" data-action="continue">Continue to ${arrival.locationName}</button>
  </div>`;

  html += `</div>`; // arrival-screen
  app.innerHTML = html;
}
