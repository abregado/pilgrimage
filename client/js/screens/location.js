import { getState, getTab, getSelectedNurserySeedId, getSelectedPotId,
         getEmbarkingPathId, getEmbarkChosenSeed, getAutoArrive } from '../state.js';
import { formatDuration } from '../utils.js';
import { SEED_MAP, SEEDS } from '../seeds.js';
import { getPathsForLocation, LOCATION_MAP, PATHS } from '../world.js';
import { renderMap } from './map.js';
import { renderRecord } from './record.js';
import { renderInfo } from './info.js';
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

function seedColor(seedId) {
  if (!seedId) return '#666';
  const seed = SEED_MAP[seedId];
  return seed ? seed.color : '#666';
}

function seedIconSmall(seedId) {
  if (!seedId) return '';
  return `<img src="/assets/seed_${seedId}.svg" class="seed-icon-inline" alt="" onerror="this.style.display='none'">`;
}

// Keep in sync with server/constants.js
const SEEDLING_TICKS = 1800;
const GROWN_TICKS    = 21600;
const FRUITING_TICKS = 604800;
const DEAD_TICKS     = 2592000;

const ENERGY_COST_BASE     = 1;
const ENERGY_COST_SEEDLING = 3;
const ENERGY_COST_GROWN    = 8;
const ENERGY_COST_FRUITING = 12;

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

function potEnergyCost(pot, tick) {
  if (!pot.seedId || pot.lastPlantedTick === null || pot.lastPlantedTick === undefined) {
    return ENERGY_COST_BASE;
  }
  const age = tick - pot.lastPlantedTick;
  if (age >= DEAD_TICKS)     return ENERGY_COST_BASE;
  if (age >= FRUITING_TICKS) return ENERGY_COST_FRUITING;
  if (age >= GROWN_TICKS)    return ENERGY_COST_GROWN;
  if (age >= SEEDLING_TICKS) return ENERGY_COST_SEEDLING;
  return ENERGY_COST_BASE;
}

// ── Travel animation ──────────────────────────────────────────────────────────
let _animId = null;
let _animData = null;

export function startTravelAnim(path, movementSpeed, speedBonus, rulesSpeedBonus) {
  stopTravelAnim();
  const effectiveSpeed = movementSpeed * (speedBonus ?? 1) * (1 + (rulesSpeedBonus ?? 0));
  _animData = {
    progress: path.progress,
    startTime: performance.now(),
    length: path.length,
    effectiveSpeed,
    goingRight: path.pathFrom === path.fromId,
  };

  function loop() {
    if (!_animData) return;
    const elapsed = (performance.now() - _animData.startTime) / 1000;
    const progress = Math.min(_animData.length, _animData.progress + _animData.effectiveSpeed * elapsed);
    const frac = progress / _animData.length;
    const t = _animData.goingRight ? frac : (1 - frac);

    const mx = (1-t)*(1-t)*20 + 2*(1-t)*t*150 + t*t*280;
    const my = (1-t)*(1-t)*40 + 2*(1-t)*t*14 + t*t*40;

    const meepleEl = document.getElementById('travel-meeple');
    if (meepleEl) {
      meepleEl.setAttribute('transform', `translate(${mx.toFixed(1)},${my.toFixed(1)})`);
    }

    const etaEl = document.getElementById('travel-eta');
    if (etaEl) {
      const remaining = Math.max(0, _animData.length - progress);
      const ticksLeft = Math.ceil(remaining / _animData.effectiveSpeed);
      etaEl.textContent = `~${formatDuration(ticksLeft)} remaining`;
    }

    _animId = requestAnimationFrame(loop);
  }

  _animId = requestAnimationFrame(loop);
}

export function stopTravelAnim() {
  if (_animId !== null) {
    cancelAnimationFrame(_animId);
    _animId = null;
  }
  _animData = null;
}

// ─────────────────────────────────────────────────────────────────────────────

function renderTravelProgress(path, movementSpeed, speedBonus, rulesSpeedBonus) {
  const frac = Math.min(1, path.progress / path.length);
  const remaining = path.length - path.progress;
  const effectiveSpeed = movementSpeed * (speedBonus ?? 1) * (1 + (rulesSpeedBonus ?? 0));
  const ticksLeft = Math.ceil(remaining / effectiveSpeed);

  const fromName = path.fromName || path.fromId;
  const toName   = path.toName   || path.toId;

  const goingRight = path.pathFrom === path.fromId;
  const t = goingRight ? frac : (1 - frac);

  const mx = Math.round((1-t)*(1-t)*20 + 2*(1-t)*t*150 + t*t*280);
  const my = Math.round((1-t)*(1-t)*40 + 2*(1-t)*t*14 + t*t*40);

  const clr  = '#c9a84c';
  const pClr = '#7a5c2e';

  const arrowRight = `<polygon points="8,-9 15,-5 8,-1" fill="${clr}"/>`;
  const arrowLeft  = `<polygon points="-8,-9 -15,-5 -8,-1" fill="${clr}"/>`;

  const svg = `
    <svg id="travel-path-svg" viewBox="0 0 300 80" class="path-visual-svg" xmlns="http://www.w3.org/2000/svg">
      <path d="M 20 40 Q 150 14 280 40"
            stroke="${pClr}" stroke-width="3" stroke-dasharray="7,5"
            fill="none" stroke-linecap="round"/>
      <line x1="13" y1="33" x2="27" y2="47" stroke="${pClr}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="27" y1="33" x2="13" y2="47" stroke="${pClr}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="273" y1="33" x2="287" y2="47" stroke="${pClr}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="287" y1="33" x2="273" y2="47" stroke="${pClr}" stroke-width="2.5" stroke-linecap="round"/>
      <g id="travel-meeple" transform="translate(${mx},${my})">
        <polygon points="-5,13 5,13 0,3" fill="${clr}"/>
        <circle cx="0" cy="-5" r="6" fill="${clr}"/>
        ${goingRight ? arrowRight : arrowLeft}
      </g>
    </svg>`;

  return `
    <div class="path-visual-wrap">
      <div class="path-visual-labels">
        <span>${fromName}</span><span>${toName}</span>
      </div>
      ${svg}
      <div id="travel-eta" class="path-visual-eta">~${formatDuration(ticksLeft)} remaining</div>
    </div>`;
}

function renderEnergyBar(energy, energyMax, energyRegenAt, tick) {
  let html = `<div class="location-top-energy">`;
  html += Array.from({ length: energyMax }, (_, i) =>
    `<span class="energy-pip${i < energy ? ' full' : ''}"></span>`
  ).join('');
  html += `<span class="energy-label">${energy}/${energyMax}</span>`;
  if (energyRegenAt !== null && energy < energyMax) {
    const secs = Math.max(0, energyRegenAt - tick);
    html += `<span class="energy-regen">+1 in ${formatDuration(secs)}</span>`;
  }
  html += `</div>`;
  return html;
}

function renderPotsWheel(pots, tick, gardener, selectedPotId, selectedNurserySeedId) {
  const n = pots.length;
  const R = 36;

  let html = `<div class="pots-wheel">`;

  for (let i = 0; i < n; i++) {
    const pot = pots[i];
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
    const px = Math.round(Math.cos(angle) * R * 10) / 10;
    const py = Math.round(Math.sin(angle) * R * 10) / 10;

    const isSelected = pot.id === selectedPotId;
    const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;

    let decDots = '';
    if (isSelected && pot.decoratorCount > 0) {
      const dotR = 33;
      for (let d = 0; d < pot.decoratorCount; d++) {
        const da = (d * 2 * Math.PI / pot.decoratorCount) - Math.PI / 2;
        const dx = Math.round(Math.cos(da) * dotR * 10) / 10;
        const dy = Math.round(Math.sin(da) * dotR * 10) / 10;
        const isPlayerDot = pot.iDecorated && d === pot.decoratorCount - 1;
        const dotClass = isPlayerDot ? 'dec-dot dec-dot-mine' : `dec-dot dec-dot-${d % 2}`;
        decDots += `<div class="${dotClass}" style="left:calc(50% + ${dx}px);top:calc(50% + ${dy}px)"></div>`;
      }
    }

    html += `
      <button class="pot-item${isSelected ? ' selected' : ''}"
        style="left:calc(50% + ${px}%);top:calc(50% + ${py}%)"
        data-action="select_pot" data-pot-id="${pot.id}"
        aria-label="${pot.seedId ? seedName(pot.seedId) : 'Empty pot'}">
        <div class="pot-circle${pot.settlingUntil !== null ? ' settling' : ''}">
          ${stage ? `<img src="/assets/${pot.seedId}_${stage}.png" class="pot-wheel-img" alt="${stage}" onerror="this.style.display='none'">` : `<img src="/assets/empty_pot.png" class="pot-wheel-img" alt="empty pot" onerror="this.style.display='none'">`}
          ${pot.seedId ? `<img src="/assets/seed_${pot.seedId}.svg" class="pot-seed-overlay${isSelected ? ' selected' : ''}" alt="" onerror="this.style.display='none'">` : ''}
        </div>
        ${decDots}
      </button>`;
  }

  html += `<div class="pots-center">`;

  if (selectedPotId) {
    const pot = pots.find(p => p.id === selectedPotId);
    if (pot) {
      const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;
      const next  = pot.seedId ? timeToNextStage(pot.lastPlantedTick, tick) : null;
      const cost  = potEnergyCost(pot, tick);

      if (pot.seedId) {
        const color = seedColor(pot.seedId);
        html += `<div class="pot-center-name" style="color:${color}">${seedIconSmall(pot.seedId)}${seedName(pot.seedId)}</div>`;
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
        if (selectedNurserySeedId && pot.settlingUntil === null) {
          const canAfford = gardener.energy >= cost;
          const name = seedName(selectedNurserySeedId);
          html += canAfford
            ? `<button class="btn btn-sm btn-accent btn-multiline" data-action="pot" data-pot-id="${pot.id}">${seedIconSmall(selectedNurserySeedId)} Plant ${name}<span class="btn-duration">${cost} energy</span></button>`
            : `<button class="btn btn-sm btn-multiline" disabled title="Not enough energy">${seedIconSmall(selectedNurserySeedId)} Plant ${name}<span class="btn-duration">${cost} energy</span></button>`;
        }
        if (!selectedNurserySeedId && pot.seedId) {
          const canAfford = gardener.energy >= cost;
          html += canAfford
            ? `<button class="btn btn-sm btn-danger btn-multiline" data-action="pot" data-pot-id="${pot.id}" data-seed-id="">Clear<span class="btn-duration">${cost} energy</span></button>`
            : `<button class="btn btn-sm btn-danger btn-multiline" disabled title="Not enough energy">Clear<span class="btn-duration">${cost} energy</span></button>`;
        }
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

const TAB_ICONS = {
  location: '/assets/nav-location.svg',
  map:      '/assets/nav-map.svg',
  record:   '/assets/nav-record.svg',
  info:     '/assets/nav-info.svg',
};

export function renderLocation(app) {
  const state = getState();
  const tab = getTab();

  if (!state) {
    app.innerHTML = `<div class="connect-screen"><div class="connect-inner"><div class="connect-title">Verdant</div></div></div>`;
    return;
  }

  const { gardener, location, path, tick, movementSpeed, rulesSpeedBonus } = state;

  const tabBar = `
    <nav class="tab-bar">
      ${['location', 'map', 'record', 'info'].map(t => `
        <button class="tab-btn${tab === t ? ' active' : ''}" data-action="tab" data-tab="${t}" aria-label="${t}">
          <img src="${TAB_ICONS[t]}" class="tab-icon" alt="${t}">
        </button>`).join('')}
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

  if (tab === 'info') {
    app.innerHTML = `<div class="main-screen"><div class="screen-content" id="screen-content"></div>${tabBar}</div>`;
    renderInfo(document.getElementById('screen-content'));
    return;
  }

  // ── Walking state: show travel content in Location tab ────────────────────
  if (gardener.state === 'walking' && path) {
    const destId   = path.pathFrom === path.fromId ? path.toId : path.fromId;
    const destName = (LOCATION_MAP[destId] || {}).name || destId;
    const autoArrive = getAutoArrive();
    const energy    = gardener.energy ?? 0;
    const energyMax = gardener.energyMax ?? 0;

    let html = `<div class="main-screen"><div class="screen-content">`;

    html += `<div class="location-header">
      <h2>Travelling to ${destName}</h2>
      ${renderEnergyBar(energy, energyMax, gardener.energyRegenAt ?? null, tick)}
    </div>`;

    html += `<div class="reverse-row">
      <button class="btn btn-sm" data-action="reverse">↩ Reverse</button>
    </div>`;

    html += renderTravelProgress(path, movementSpeed, gardener.speedBonus, rulesSpeedBonus);

    html += `<div class="auto-arrive-row">
      <button class="btn btn-sm${autoArrive ? ' btn-accent active' : ''}" data-action="toggle_auto_arrive">
        Auto-arrive${autoArrive ? ' ✓' : ''}
      </button>
    </div>`;

    if (path.encounters && path.encounters.length > 0) {
      html += `<div class="section"><h3>Encountered (${path.encounters.length})</h3><div class="encounter-list">`;
      for (const enc of path.encounters) {
        const encSeed = enc.seed ? SEED_MAP[enc.seed] : null;
        const carrying = gardener.seed === enc.seed && enc.seed !== null;
        html += `
          <div class="encounter-row">
            ${renderMeeple(enc.state)}
            ${seedIcon(enc.seed)}
            <div class="encounter-info">
              <div class="encounter-seed">${encSeed ? `${seedIconSmall(enc.seed)} ${encSeed.name}` : 'Carrying nothing'}</div>
            </div>
            ${enc.seed && !carrying
              ? `<button class="btn btn-sm btn-sage" data-action="take_seed" data-from-id="${enc.id}">Take Seed</button>`
              : ''}
          </div>`;
      }
      html += `</div></div>`;
    }

    html += `</div>${tabBar}</div>`;
    app.innerHTML = html;
    return;
  }

  // ── Normal location content ───────────────────────────────────────────────
  const energy = gardener.energy ?? 0;
  const energyMax = gardener.energyMax ?? 0;
  const selectedNurserySeedId = getSelectedNurserySeedId();
  const selectedPotId = getSelectedPotId();
  const embarkingPathId = getEmbarkingPathId();

  let html = `<div class="main-screen"><div class="screen-content">`;

  // ── Unified top bar: meeples + location name + energy ─────────────────────
  if (location) {
    const population = 1 + (location.otherGardeners ? location.otherGardeners.length : 0);
    const allHere = [
      { state: gardener.state },
      ...(location.otherGardeners || []),
    ];
    const locName = location ? location.name : '...';

    html += `<div class="location-top-bar">`;
    html += `<div class="location-top-meeples">`;
    for (const g of allHere) html += renderMeeple(g.state);
    html += `<span class="population-count">${population}</span>`;
    html += `</div>`;
    html += `<h2 class="location-top-name">${locName}</h2>`;
    html += renderEnergyBar(energy, energyMax, gardener.energyRegenAt ?? null, tick);
    html += `</div>`;
  } else {
    const locName = '...';
    html += `<div class="location-top-bar">`;
    html += `<h2 class="location-top-name">${locName}</h2>`;
    html += `</div>`;
  }

  // ── Embark seed picker (replaces normal content) ──────────────────────────
  if (embarkingPathId && gardener.state === 'resting' && location) {
    const embarkPath = PATHS.find(p => p.id === embarkingPathId);
    const destId = embarkPath ? (embarkPath.fromId === gardener.locationId ? embarkPath.toId : embarkPath.fromId) : null;
    const destName = destId ? ((LOCATION_MAP[destId] || {}).name || destId) : '?';
    const chosenSeed = getEmbarkChosenSeed();

    html += `<div class="section">`;
    html += `<p class="seed-carry-prompt">Which seed will you carry to <strong>${destName}</strong>?</p>`;
    html += `<div class="nursery-grid">`;
    for (const seedId of location.seedPool) {
      const seed = SEED_MAP[seedId];
      const color = seed ? seed.color : '#666';
      const isChosen = chosenSeed === seedId;
      html += `
        <button class="nursery-seed${isChosen ? ' planting-selected' : ''}"
          data-action="select_embark_seed" data-seed-id="${seedId}">
          ${seedIcon(seedId)}
          <span class="nursery-seed-name" style="color:${color}">${seedIconSmall(seedId)}${seed ? seed.name : seedId}</span>
        </button>`;
    }
    html += `</div>`;
    html += `<div class="embark-actions">
      <button class="btn btn-sm btn-muted" data-action="cancel_embark">Cancel</button>
      <button class="btn btn-sm btn-accent" data-action="embark">Embark →</button>
    </div>`;
    html += `</div>`;

    html += `</div>${tabBar}</div>`;
    app.innerHTML = html;
    return;
  }

  if (location) {
    // ── 1. Pots ──────────────────────────────────────────────────────────────
    html += `<div class="section">`;
    html += renderPotsWheel(location.pots, tick, gardener, selectedPotId, selectedNurserySeedId);
    html += `</div>`;

    // ── 2. Nursery ───────────────────────────────────────────────────────────
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
              <span class="nursery-seed-name" style="color:${color}">${seedIconSmall(seedId)}${seed ? seed.name : seedId}</span>
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

    // ── 3. Vision ────────────────────────────────────────────────────────────
    const activeRules = (gardener.rules || []).filter(r => !r.refreshing);
    if (activeRules.length > 0) {
      html += `<div class="section"><h3>Vision</h3><div class="vision-list">`;
      for (const rule of activeRules) {
        let safeTag = '';
        if (rule.completed && rule.safeUntil !== null && rule.safeUntil > tick) {
          const safeRemaining = Math.max(0, rule.safeUntil - tick);
          safeTag = `<span class="vision-safe">Safe ${formatDuration(safeRemaining)}</span>`;
        }
        html += `
          <div class="vision-card${rule.completed ? ' completed' : ''}${rule.satisfiedHere ? ' satisfied-here' : ''}">
            <div class="vision-level-badge level-${rule.level}">L${rule.level}</div>
            <div class="vision-desc">${rule.description}</div>
            <div class="vision-footer">
              <span class="vision-progress">${rule.satisfiedCount} / ${rule.difficulty}</span>
              ${rule.satisfiedHere ? `<span class="vision-here">Here</span>` : ''}
              ${rule.completed ? `<span class="vision-badge">Complete</span>` : ''}
              ${safeTag}
            </div>
          </div>`;
      }
      html += `</div></div>`;
    }

    // ── 4. Travel ────────────────────────────────────────────────────────────
    const paths = getPathsForLocation(gardener.locationId);
    if (paths.length > 0 && gardener.state === 'resting') {
      const originBySeedLoc = Object.fromEntries(SEEDS.filter(s => s.locationId).map(s => [s.locationId, s]));
      const visited = new Set(state.record ? state.record.wanderings : []);
      html += `<div class="section"><h3>Travel</h3><div class="paths-list">`;
      for (const p of paths) {
        const destId = p.fromId === gardener.locationId ? p.toId : p.fromId;
        const dest = LOCATION_MAP[destId];
        const destName = dest ? dest.name : destId;
        const ticks = Math.ceil(p.length / (movementSpeed * (gardener.speedBonus ?? 1) * (1 + (rulesSpeedBonus ?? 0))));
        const isVisited = visited.has(destId);
        const originSeed = originBySeedLoc[destId];

        let destLabel;
        let memStrip = '';
        if (isVisited) {
          const icon = originSeed
            ? `<img src="/assets/seed_${originSeed.id}.svg" class="travel-seed-icon" alt="" onerror="this.style.display='none'">`
            : '';
          destLabel = `${icon}${destName}`;
          const memPots = (gardener.locationMemory || {})[destId];
          if (memPots) {
            memStrip = `<div class="pot-memory-strip">`;
            for (const mp of memPots) {
              if (mp.seedId) {
                const s = SEED_MAP[mp.seedId];
                memStrip += `<span class="pot-mem-dot" style="background:${s ? s.color : '#666'}"></span>`;
              } else {
                memStrip += `<span class="pot-mem-dot pot-mem-dot-empty"></span>`;
              }
            }
            memStrip += `</div>`;
          }
        } else {
          destLabel = `${destName} <span class="badge-new">new</span>`;
        }

        html += `
          <div class="path-row">
            <div class="path-info">
              <div class="path-dest">${destLabel}</div>
              <div class="path-dist">~${formatDuration(ticks)}</div>
              ${memStrip}
            </div>
            <button class="btn btn-sm" data-action="walk" data-path-id="${p.id}">Walk</button>
          </div>`;
      }
      html += `</div></div>`;
    }
  }

  html += `</div>${tabBar}</div>`;
  app.innerHTML = html;
}
