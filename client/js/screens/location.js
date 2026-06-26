import { getState, getTab } from '../state.js';
import { formatDistance, formatDuration } from '../utils.js';
import { SEED_MAP } from '../seeds.js';
import { getPathsForLocation, LOCATION_MAP } from '../world.js';
import { renderMap } from './map.js';
import { renderRecord } from './record.js';

function seedIcon(seedId) {
  if (!seedId) return `<div class="seed-icon" style="background:#222"></div>`;
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  return `<div class="seed-icon" style="background:${color}"><img src="/assets/seed_${seedId}.svg" alt="${seed ? seed.name : ''}" onerror="this.style.display='none'"></div>`;
}

function seedName(seedId) {
  if (!seedId) return 'Empty';
  const seed = SEED_MAP[seedId];
  return seed ? seed.name : seedId;
}

export function renderLocation(app) {
  const state = getState();
  const tab = getTab();

  if (!state) {
    app.innerHTML = `<div class="connect-screen"><div class="connect-inner"><div class="connect-title">Verdant</div></div></div>`;
    return;
  }

  const { gardener, location, tick } = state;

  const tabBar = `
    <nav class="tab-bar">
      <button class="tab-btn${tab === 'location' ? ' active' : ''}" data-action="tab" data-tab="location">Location</button>
      <button class="tab-btn${tab === 'map' ? ' active' : ''}" data-action="tab" data-tab="map">Map</button>
      <button class="tab-btn${tab === 'record' ? ' active' : ''}" data-action="tab" data-tab="record">Record</button>
    </nav>
  `;

  if (tab === 'map') {
    app.innerHTML = `<div class="main-screen"><div class="screen-content" id="screen-content"></div>${tabBar}</div>`;
    renderMap(document.getElementById('screen-content'), state);
    return;
  }

  if (tab === 'record') {
    app.innerHTML = `<div class="main-screen"><div class="screen-content" id="screen-content"></div>${tabBar}</div>`;
    renderRecord(document.getElementById('screen-content'), state);
    return;
  }

  // Location tab
  let html = `<div class="main-screen"><div class="screen-content">`;

  // Header
  const locName = location ? location.name : '...';
  html += `<div class="location-header"><h2>${locName}</h2></div>`;

  // Carry bar
  if (gardener.seed) {
    const seed = SEED_MAP[gardener.seed];
    const color = seed ? seed.color : '#666';
    html += `
      <div class="carry-bar">
        ${seedIcon(gardener.seed)}
        <span class="carry-name" style="color:${color}">${seed ? seed.name : gardener.seed}</span>
        <span class="carry-label">carried</span>
      </div>`;
  } else {
    html += `<div class="carry-bar"><span class="carry-label">Carrying nothing</span></div>`;
  }

  // Origin seed button
  html += `<div class="section"><div class="origin-bar">`;
  if (gardener.justTookOrigin) {
    html += `<button class="btn btn-sm btn-danger" data-action="undo_take">Undo Take</button>`;
    html += `<span class="muted">Origin seed taken</span>`;
  } else if (gardener.state === 'resting') {
    html += `<button class="btn btn-sm btn-sage" data-action="take_origin">Take Origin Seed</button>`;
  } else if (gardener.state === 'tending') {
    const remaining = gardener.tendingUntil !== null ? Math.max(0, gardener.tendingUntil - tick) : 0;
    html += `<span class="muted">Tending&hellip; (${formatDuration(remaining)})</span>`;
  }
  html += `</div></div>`;

  // Pots
  if (location) {
    html += `<div class="section"><h3>Pots</h3><div class="pots-grid">`;
    for (const pot of location.pots) {
      const cherished = pot.isCherished;
      html += `<div class="pot-card${cherished ? ' cherished' : ''}">`;

      if (pot.seedId) {
        html += seedIcon(pot.seedId);
        html += `<span class="pot-seed-name">${seedName(pot.seedId)}</span>`;
      } else {
        html += `<span class="pot-empty">Empty</span>`;
      }

      // Badges
      html += `<div class="pot-badges">`;
      if (cherished) html += `<span class="badge badge-cherished">Cherished</span>`;
      if (pot.settlingUntil !== null) {
        const rem = Math.max(0, pot.settlingUntil - tick);
        html += `<span class="badge badge-settling">Settling ${formatDuration(rem)}</span>`;
      }
      if (pot.iAmSinger) html += `<span class="badge badge-singer">Singing</span>`;
      html += `</div>`;

      // Singer count
      if (pot.seedId) {
        html += `<span class="pot-singers">${pot.singerCount} singer${pot.singerCount !== 1 ? 's' : ''}</span>`;
      }

      // Actions
      html += `<div class="pot-actions">`;
      if (pot.seedId && !pot.iAmSinger && gardener.state === 'resting') {
        html += `<button class="btn btn-sm btn-sage" data-action="sing" data-pot-id="${pot.id}">Sing</button>`;
      }
      if (gardener.seed && !cherished && pot.settlingUntil === null && gardener.state === 'resting') {
        html += `<button class="btn btn-sm" data-action="pot" data-pot-id="${pot.id}">Place Seed</button>`;
      }
      html += `</div>`;

      html += `</div>`; // pot-card
    }
    html += `</div></div>`; // pots-grid, section

    // Paths
    const paths = getPathsForLocation(gardener.locationId);
    if (paths.length > 0 && gardener.state === 'resting') {
      html += `<div class="section"><h3>Paths</h3><div class="paths-list">`;
      for (const path of paths) {
        const destId = path.fromId === gardener.locationId ? path.toId : path.fromId;
        const dest = LOCATION_MAP[destId];
        const destName = dest ? dest.name : destId;
        const ticks = Math.ceil(path.length / 16); // MOVEMENT_SPEED = 16
        html += `
          <div class="path-row">
            <div class="path-info">
              <div class="path-dest">${destName}</div>
              <div class="path-dist">${formatDistance(path.length)} &middot; ~${formatDuration(ticks)}</div>
            </div>
            <button class="btn btn-sm" data-action="walk" data-path-id="${path.id}">Walk</button>
          </div>`;
      }
      html += `</div></div>`;
    }

    // Other gardeners
    if (location.otherGardeners && location.otherGardeners.length > 0) {
      html += `<div class="section"><h3>Here now</h3>`;
      for (const g of location.otherGardeners) {
        html += `<div class="gardener-row">${seedIcon(g.seed)}<span class="muted">${g.id}</span></div>`;
      }
      html += `</div>`;
    }
  }

  html += `</div>${tabBar}</div>`; // screen-content, main-screen
  app.innerHTML = html;
}
