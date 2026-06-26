import { getState, getTab } from '../state.js';
import { formatDistance, formatDuration } from '../utils.js';
import { SEED_MAP } from '../seeds.js';
import { getPathsForLocation, LOCATION_MAP } from '../world.js';
import { renderMap } from './map.js';
import { renderRecord } from './record.js';
import { renderMeeple } from '../meeple.js';

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

// Keep in sync with server/constants.js
const SEEDLING_TICKS = 1800;
const GROWN_TICKS    = 21600;
const FRUITING_TICKS = 604800;
const DEAD_TICKS     = 2592000;

function getGrowthStage(lastPlantedTick, currentTick) {
  if (lastPlantedTick === null || lastPlantedTick === undefined) return null;
  const age = currentTick - lastPlantedTick;
  if (age >= DEAD_TICKS)     return 'dead';
  if (age >= FRUITING_TICKS) return 'fruiting';
  if (age >= GROWN_TICKS)    return 'grown';
  if (age >= SEEDLING_TICKS) return 'seedling';
  return 'seed';
}

function timeToNextStage(lastPlantedTick, currentTick) {
  if (lastPlantedTick === null || lastPlantedTick === undefined) return null;
  const age = currentTick - lastPlantedTick;
  if (age < SEEDLING_TICKS) return { next: 'seedling', remaining: SEEDLING_TICKS - age };
  if (age < GROWN_TICKS)    return { next: 'grown',    remaining: GROWN_TICKS - age };
  if (age < FRUITING_TICKS) return { next: 'fruiting', remaining: FRUITING_TICKS - age };
  if (age < DEAD_TICKS)     return { next: 'dead',     remaining: DEAD_TICKS - age };
  return null;
}

export function renderLocation(app) {
  const state = getState();
  const tab = getTab();

  if (!state) {
    app.innerHTML = `<div class="connect-screen"><div class="connect-inner"><div class="connect-title">Verdant</div></div></div>`;
    return;
  }

  const { gardener, location, tick, movementSpeed } = state;

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

  const energy = gardener.energy ?? 0;
  const energyMax = gardener.energyMax ?? 0;

  // Location tab
  let html = `<div class="main-screen"><div class="screen-content">`;

  // Header + energy
  const locName = location ? location.name : '...';
  html += `<div class="location-header">
    <h2>${locName}</h2>
    <div class="energy-bar">
      ${Array.from({ length: energyMax }, (_, i) =>
        `<span class="energy-pip${i < energy ? ' full' : ''}"></span>`
      ).join('')}
      <span class="energy-label">${energy}/${energyMax}</span>
    </div>
  </div>`;

  // Tending status
  if (gardener.state === 'tending') {
    const remaining = gardener.tendingUntil !== null ? Math.max(0, gardener.tendingUntil - tick) : 0;
    html += `<div class="section"><div class="origin-bar"><span class="muted">Tending&hellip; (${formatDuration(remaining)})</span></div></div>`;
  }

  if (location) {
    // ── 1. Pots ───────────────────────────────────────────────────────────────
    html += `<div class="section"><h3>Pots</h3><div class="pots-grid">`;
    for (const pot of location.pots) {
      html += `<div class="pot-card">`;

      if (pot.seedId) {
        const stage = getGrowthStage(pot.lastPlantedTick, tick);
        if (stage) html += `<img src="/assets/${pot.seedId}_${stage}.png" class="pot-growth-img" alt="${stage}" onerror="this.style.display='none'">`;
        html += seedIcon(pot.seedId);
        html += `<span class="pot-seed-name">${seedName(pot.seedId)}</span>`;
      } else {
        html += `<span class="pot-empty">Empty</span>`;
      }

      // Badges
      html += `<div class="pot-badges">`;
      if (pot.seedId) {
        const stage = getGrowthStage(pot.lastPlantedTick, tick);
        if (stage) html += `<span class="badge badge-stage badge-stage-${stage}">${stage}</span>`;
        const next = timeToNextStage(pot.lastPlantedTick, tick);
        if (next) html += `<span class="badge badge-next-stage">${next.next} in ${formatDuration(next.remaining)}</span>`;
      }
      if (pot.settlingUntil !== null) {
        const rem = Math.max(0, pot.settlingUntil - tick);
        html += `<span class="badge badge-settling">Settling ${formatDuration(rem)}</span>`;
      }
      if (pot.iDecorated) html += `<span class="badge badge-decorated">Decorated</span>`;
      html += `</div>`;

      // Decorator count
      if (pot.seedId) {
        html += `<span class="pot-decorators">${pot.decoratorCount} decorator${pot.decoratorCount !== 1 ? 's' : ''}</span>`;
      }

      // Actions
      html += `<div class="pot-actions">`;
      if (pot.seedId && gardener.state === 'resting') {
        if (pot.iDecorated) {
          html += `<button class="btn btn-sm btn-muted" data-action="undecorate" data-pot-id="${pot.id}">Undecorate</button>`;
        } else {
          html += `<button class="btn btn-sm btn-sage" data-action="decorate" data-pot-id="${pot.id}">Decorate</button>`;
        }
      }
      if (gardener.seed && pot.settlingUntil === null && gardener.state === 'resting') {
        if (energy > 0) {
          html += `<button class="btn btn-sm" data-action="pot" data-pot-id="${pot.id}">Place Seed</button>`;
        } else {
          html += `<button class="btn btn-sm" disabled title="No energy">Place Seed</button>`;
        }
      }
      if (!gardener.seed && pot.seedId && gardener.state === 'resting') {
        html += `<button class="btn btn-sm btn-danger" data-action="pot" data-pot-id="${pot.id}">Clear</button>`;
      }
      html += `</div>`;

      html += `</div>`; // pot-card
    }
    html += `</div></div>`; // pots-grid, section

    // ── 2. Nursery (seed pool) ────────────────────────────────────────────────
    if (location.seedPool && location.seedPool.length > 0 && gardener.state === 'resting') {
      html += `<div class="section"><h3>Nursery</h3><div class="nursery-grid">`;
      const noSeedSelected = gardener.seed === null;
      html += `
        <button class="nursery-seed nursery-no-seed${noSeedSelected ? ' carried' : ''}" data-action="swap" data-seed-id="" ${noSeedSelected ? 'disabled' : ''}>
          <div class="seed-icon" style="background:#1a1f1a"></div>
          <span class="nursery-seed-name" style="color:var(--muted)">No Seed</span>
        </button>`;
      for (const seedId of location.seedPool) {
        const seed = SEED_MAP[seedId];
        const color = seed ? seed.color : '#666';
        const isCarried = gardener.seed === seedId;
        html += `
          <button class="nursery-seed${isCarried ? ' carried' : ''}" data-action="swap" data-seed-id="${seedId}" ${isCarried ? 'disabled' : ''}>
            ${seedIcon(seedId)}
            <span class="nursery-seed-name" style="color:${color}">${seed ? seed.name : seedId}</span>
          </button>`;
      }
      html += `</div></div>`;
    }

    // ── 3. Carrying ───────────────────────────────────────────────────────────
    {
      const carriedSeed = SEED_MAP[gardener.seed];
      const carriedColor = carriedSeed ? carriedSeed.color : null;
      html += `<div class="section carry-section">
        <div class="carry-header">
          <span class="carry-label-heading">Carrying</span>
          <div class="carry-current">
            ${gardener.seed
              ? `${seedIcon(gardener.seed)}<span class="carry-name" style="color:${carriedColor}">${carriedSeed ? carriedSeed.name : gardener.seed}</span>`
              : `<span class="carry-empty">Nothing</span>`}
          </div>
        </div>`;
      if (gardener.state === 'resting' && location.seedPool && location.seedPool.length > 0) {
        html += `<div class="carry-swap">`;
        const noSeedSelected = gardener.seed === null;
        html += `<button class="carry-chip${noSeedSelected ? ' selected' : ''}" data-action="swap" data-seed-id="" ${noSeedSelected ? 'disabled' : ''}>No Seed</button>`;
        for (const seedId of location.seedPool) {
          const seed = SEED_MAP[seedId];
          const color = seed ? seed.color : '#666';
          const isSelected = gardener.seed === seedId;
          html += `<button class="carry-chip${isSelected ? ' selected' : ''}" data-action="swap" data-seed-id="${seedId}" ${isSelected ? 'disabled' : ''} style="--chip-color:${color}">
            <span class="carry-chip-dot" style="background:${color}"></span>${seed ? seed.name : seedId}
          </button>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    // ── 4. Travel ─────────────────────────────────────────────────────────────
    const paths = getPathsForLocation(gardener.locationId);
    if (paths.length > 0 && gardener.state === 'resting') {
      html += `<div class="section"><h3>Travel</h3><div class="paths-list">`;
      for (const path of paths) {
        const destId = path.fromId === gardener.locationId ? path.toId : path.fromId;
        const dest = LOCATION_MAP[destId];
        const destName = dest ? dest.name : destId;
        const ticks = Math.ceil(path.length / movementSpeed);
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

    // ── 5. Vision ─────────────────────────────────────────────────────────────
    const activeRules = (gardener.rules || []).filter(r => !r.refreshing);
    if (activeRules.length > 0) {
      html += `<div class="section"><h3>Vision</h3><div class="vision-list">`;
      for (const rule of activeRules) {
        html += `
          <div class="vision-card${rule.completed ? ' completed' : ''}${rule.satisfiedHere ? ' satisfied-here' : ''}">
            <div class="vision-desc">${rule.description}</div>
            <div class="vision-footer">
              <span class="vision-progress">${rule.satisfiedCount} / ${rule.difficulty}</span>
              ${rule.satisfiedHere ? `<span class="vision-here">Here</span>` : ''}
            </div>
          </div>`;
      }
      html += `</div></div>`;
    }

    // ── 6. Other gardeners ────────────────────────────────────────────────────
    if (location.otherGardeners && location.otherGardeners.length > 0) {
      html += `<div class="section"><h3>Here now</h3><div class="gardener-list">`;
      for (const g of location.otherGardeners) {
        html += `<div class="gardener-row">${renderMeeple(g.state)}${seedIcon(g.seed)}</div>`;
      }
      html += `</div></div>`;
    }
  }

  html += `</div>${tabBar}</div>`;
  app.innerHTML = html;
}
