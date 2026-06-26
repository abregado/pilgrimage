import { getState } from '../state.js';
import { SEEDS, SEED_MAP } from '../seeds.js';
import { LOCATION_MAP } from '../world.js';
import { formatAge } from '../utils.js';

function seedIcon(seedId, small) {
  if (!seedId) return `<div class="seed-icon" style="background:#222;width:${small?24:32}px;height:${small?24:32}px;border-radius:4px"></div>`;
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  const sz = small ? 24 : 32;
  return `<div class="seed-icon" style="background:${color};width:${sz}px;height:${sz}px;border-radius:${small?4:6}px"><img src="/assets/seed_${seedId}.svg" alt="" width="${sz}" height="${sz}" onerror="this.style.display='none'"></div>`;
}

export function renderRecord(container, state) {
  if (!state) {
    container.innerHTML = `<p class="muted center">No record yet</p>`;
    return;
  }

  const { record } = state;
  if (!record) {
    container.innerHTML = `<p class="muted center">No record yet</p>`;
    return;
  }

  let html = ``;

  // Age
  html += `
    <div class="section">
      <h3>Age</h3>
      <div class="record-stat">
        <div class="stat-label">Time in the garden</div>
        <div class="stat-value">${formatAge(record.ageTicks)}</div>
      </div>
    </div>`;

  // Wanderings
  html += `<div class="section"><h3>Wanderings (${record.wanderings.length})</h3>`;
  if (record.wanderings.length === 0) {
    html += `<p class="muted">No journeys yet</p>`;
  } else {
    html += `<div class="wanderings-list">`;
    for (const locId of [...record.wanderings].reverse()) {
      const loc = LOCATION_MAP[locId];
      html += `<div class="wandering-entry">${loc ? loc.name : locId}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Seed log
  html += `<div class="section"><h3>Seed Log</h3><div class="seedlog-grid">`;
  for (const seed of SEEDS) {
    const log = record.seedLog[seed.id] || {};
    html += `
      <div class="seedlog-item">
        ${seedIcon(seed.id, true)}
        <span class="seedlog-name">${seed.name}</span>
        <div class="seedlog-badges">
          <span class="log-badge log-seed${log.seed ? ' found' : ''}">Seed</span>
          <span class="log-badge log-plant${log.plant ? ' found' : ''}">Plant</span>
          <span class="log-badge log-origin${log.origin ? ' found' : ''}">Origin</span>
          <span class="log-badge log-cherished${log.cherished ? ' found' : ''}">Cherish</span>
        </div>
      </div>`;
  }
  html += `</div></div>`;

  // Garden (top 3 singer pots)
  html += `<div class="section"><h3>Garden</h3>`;
  if (!record.garden || record.garden.length === 0) {
    html += `<p class="muted">Sing at pots to build your garden</p>`;
  } else {
    html += `<div class="garden-list">`;
    for (const entry of record.garden) {
      const seed = SEED_MAP[entry.seedId];
      const color = seed ? seed.color : '#666';
      html += `
        <div class="garden-entry">
          ${seedIcon(entry.seedId)}
          <div class="garden-info">
            <div class="garden-seed" style="color:${color}">${seed ? seed.name : entry.seedId}</div>
            <div class="garden-singers">${entry.otherSingerCount} other singer${entry.otherSingerCount !== 1 ? 's' : ''}</div>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  container.innerHTML = html;
}
