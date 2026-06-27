import { getState, getTab, getSelectedNurserySeedId, getSelectedPotId } from '../state.js';
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

function seedSymbol(seedId) {
  if (!seedId) return '';
  const seed = SEED_MAP[seedId];
  return seed ? seed.symbol : '';
}

function seedColor(seedId) {
  if (!seedId) return '#666';
  const seed = SEED_MAP[seedId];
  return seed ? seed.color : '#666';
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

function renderPotsWheel(pots, tick, gardener, selectedPotId, selectedNurserySeedId) {
  const n = pots.length;
  // Radius as % of container for pot centres
  const R  = 36;
  // Radius for seed symbol (just inside the ring toward centre)
  const Rs = 20;

  let html = `<div class="pots-wheel">`;

  for (let i = 0; i < n; i++) {
    const pot = pots[i];
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
    const px = Math.round(Math.cos(angle) * R * 10) / 10;
    const py = Math.round(Math.sin(angle) * R * 10) / 10;
    const sx = Math.round(Math.cos(angle) * Rs * 10) / 10;
    const sy = Math.round(Math.sin(angle) * Rs * 10) / 10;

    const isSelected = pot.id === selectedPotId;
    const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;
    const color = pot.seedId ? seedColor(pot.seedId) : null;
    const sym   = pot.seedId ? seedSymbol(pot.seedId) : null;

    // Pot circle
    html += `
      <button class="pot-item${isSelected ? ' selected' : ''}"
        style="left:calc(50% + ${px}%);top:calc(50% + ${py}%)"
        data-action="select_pot" data-pot-id="${pot.id}"
        aria-label="${pot.seedId ? seedName(pot.seedId) : 'Empty pot'}">
        <div class="pot-circle${pot.settlingUntil !== null ? ' settling' : ''}${pot.isOrigin ? ' origin' : ''}">
          ${stage ? `<img src="/assets/${pot.seedId}_${stage}.png" class="pot-wheel-img" alt="${stage}" onerror="this.style.display='none'">` : ''}
        </div>
      </button>`;

    // Seed symbol floated toward centre
    if (sym) {
      html += `
        <div class="pot-symbol" style="left:calc(50% + ${sx}%);top:calc(50% + ${sy}%);color:${color}">
          ${sym}
        </div>`;
    }
  }

  // Centre panel
  html += `<div class="pots-center">`;

  if (selectedPotId) {
    const pot = pots.find(p => p.id === selectedPotId);
    if (pot) {
      const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;
      const next  = pot.seedId ? timeToNextStage(pot.lastPlantedTick, tick) : null;

      if (pot.seedId) {
        const color = seedColor(pot.seedId);
        html += `<div class="pot-center-name" style="color:${color}">${seedName(pot.seedId)}</div>`;
        if (stage) html += `<div class="pot-center-stage badge badge-stage badge-stage-${stage}">${stage}</div>`;
        if (next)  html += `<div class="pot-center-next">${next.next} in ${formatDuration(next.remaining)}</div>`;
        if (pot.settlingUntil !== null) {
          const rem = Math.max(0, pot.settlingUntil - tick);
          html += `<div class="pot-center-settling">settling ${formatDuration(rem)}</div>`;
        }
        html += `<div class="pot-center-dec">${pot.decoratorCount} dec.</div>`;
      } else {
        html += `<div class="pot-center-empty">Empty</div>`;
      }

      if (gardener.state === 'resting') {
        // Plant button — uses the selected nursery seed
        if (selectedNurserySeedId && pot.settlingUntil === null) {
          const canPlant = gardener.energy > 0;
          const name = seedName(selectedNurserySeedId);
          html += canPlant
            ? `<button class="btn btn-sm btn-accent" data-action="pot" data-pot-id="${pot.id}">Plant ${name}</button>`
            : `<button class="btn btn-sm" disabled title="No energy">Plant ${name}</button>`;
        }
        // Clear button — when no planting seed is selected and pot has content
        if (!selectedNurserySeedId && pot.seedId) {
          html += `<button class="btn btn-sm btn-danger" data-action="pot" data-pot-id="${pot.id}" data-seed-id="">Clear</button>`;
        }
        // Decorate / undecorate
        if (pot.seedId) {
          if (pot.iDecorated) {
            html += `<button class="btn btn-sm btn-muted" data-action="undecorate" data-pot-id="${pot.id}">Undecorate</button>`;
          } else {
            html += `<button class="btn btn-sm btn-sage" data-action="decorate" data-pot-id="${pot.id}">Decorate</button>`;
          }
        }
      }
    }
  } else {
    html += `<div class="pot-center-hint">Tap a pot</div>`;
  }

  html += `</div>`; // pots-center
  html += `</div>`; // pots-wheel
  return html;
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
  const selectedNurserySeedId = getSelectedNurserySeedId();
  const selectedPotId = getSelectedPotId();

  let html = `<div class="main-screen"><div class="screen-content">`;

  // ── Population row (top) ──────────────────────────────────────────────────
  if (location) {
    const population = 1 + (location.otherGardeners ? location.otherGardeners.length : 0);
    const allHere = [
      { state: gardener.state },
      ...(location.otherGardeners || []),
    ];
    html += `<div class="population-row">`;
    for (const g of allHere) {
      html += renderMeeple(g.state);
    }
    html += `<span class="population-count">${population}</span>`;
    html += `</div>`;
  }

  // ── Header + energy ───────────────────────────────────────────────────────
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

  // ── Tending status ────────────────────────────────────────────────────────
  if (gardener.state === 'tending') {
    const remaining = gardener.tendingUntil !== null ? Math.max(0, gardener.tendingUntil - tick) : 0;
    html += `<div class="section"><div class="origin-bar"><span class="muted">Tending&hellip; (${formatDuration(remaining)})</span></div></div>`;
  }

  if (location) {
    // ── 1. Pots (circular wheel) ──────────────────────────────────────────
    html += `<div class="section">`;
    html += renderPotsWheel(location.pots, tick, gardener, selectedPotId, selectedNurserySeedId);
    html += `</div>`;

    // ── 2. Nursery (seed pool — select for planting) ──────────────────────
    if (location.seedPool && location.seedPool.length > 0) {
      html += `<div class="section"><h3>Nursery</h3>`;
      if (gardener.state === 'resting') {
        html += `<div class="nursery-grid">`;
        const isNoneSelected = selectedNurserySeedId === null;
        html += `
          <button class="nursery-seed nursery-no-seed${isNoneSelected ? ' planting-selected' : ''}" data-action="select_nursery_seed" data-seed-id="">
            <div class="seed-icon" style="background:#1a1f1a"></div>
            <span class="nursery-seed-name" style="color:var(--muted)">None</span>
          </button>`;
        for (const seedId of location.seedPool) {
          const seed = SEED_MAP[seedId];
          const color = seed ? seed.color : '#666';
          const isCarried = gardener.seed === seedId;
          const isSelected = selectedNurserySeedId === seedId;
          html += `
            <button class="nursery-seed${isSelected ? ' planting-selected' : ''}${isCarried ? ' carried-badge' : ''}"
              data-action="select_nursery_seed" data-seed-id="${seedId}">
              ${seedIcon(seedId)}
              <span class="nursery-seed-name" style="color:${color}">${seed ? seed.name : seedId}</span>
              ${isCarried ? `<span class="nursery-carry-dot" title="Carrying"></span>` : ''}
            </button>`;
        }
        html += `</div>`;
        if (selectedNurserySeedId) {
          const sName = seedName(selectedNurserySeedId);
          html += `<p class="nursery-hint">Tap a pot to plant <strong>${sName}</strong></p>`;
        }
      } else {
        html += `<p class="muted">Available when resting</p>`;
      }
      html += `</div>`;
    }

    // ── 3. Vision ─────────────────────────────────────────────────────────
    const activeRules = (gardener.rules || []).filter(r => !r.refreshing);
    if (activeRules.length > 0) {
      html += `<div class="section"><h3>Vision</h3><div class="vision-list">`;
      for (const rule of activeRules) {
        html += `
          <div class="vision-card${rule.completed ? ' completed' : ''}${rule.satisfiedHere ? ' satisfied-here' : ''}">
            <div class="vision-level-badge level-${rule.level}">L${rule.level}</div>
            <div class="vision-desc">${rule.description}</div>
            <div class="vision-footer">
              <span class="vision-progress">${rule.satisfiedCount} / ${rule.difficulty}</span>
              ${rule.satisfiedHere ? `<span class="vision-here">Here</span>` : ''}
              ${rule.completed ? `<button class="btn btn-sm btn-muted vision-refresh-btn" data-action="delete_rule" data-rule-id="${rule.id}">Refresh</button>` : ''}
            </div>
          </div>`;
      }
      html += `</div></div>`;
    }

    // ── 4. Carrying (controls what you take on walks) ─────────────────────
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

    // ── 5. Travel ─────────────────────────────────────────────────────────
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

    // ── 6. Other gardeners ────────────────────────────────────────────────
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
