import { LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP } from '../world.js';
import { SEEDS, SEED_MAP } from '../seeds.js';
import { getSelectedMapLocId } from '../state.js';
import { formatDuration } from '../utils.js';

const SVG_W = 800;
const SVG_H = 900;
const LOC_R  = 10;

const originByLoc = Object.fromEntries(SEEDS.filter(s => s.locationId).map(s => [s.locationId, s]));

function seedIcon(seedId) {
  if (!seedId) return '';
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  return `<div class="seed-icon" style="background:${color}"><img src="/assets/seed_${seedId}.svg" alt="" onerror="this.style.display='none'"></div>`;
}

// Dijkstra over the visible path graph. Returns array of pathIds or null if unreachable.
function computeRoute(startId, targetId, visited, adjacent) {
  if (startId === targetId) return [];
  const known = new Set([...visited, ...adjacent]);
  if (!known.has(startId) || !known.has(targetId)) return null;

  const dist = {};
  const prev = {};
  const unvisited = new Set(known);

  for (const id of known) dist[id] = Infinity;
  dist[startId] = 0;

  while (unvisited.size > 0) {
    let u = null;
    for (const id of unvisited) {
      if (u === null || dist[id] < dist[u]) u = id;
    }
    if (u === null || dist[u] === Infinity) break;
    if (u === targetId) break;
    unvisited.delete(u);

    for (const p of PATHS) {
      if (!visited.has(p.fromId) && !visited.has(p.toId)) continue;
      let neighbor = null;
      if (p.fromId === u && known.has(p.toId)) neighbor = p.toId;
      else if (p.toId === u && known.has(p.fromId)) neighbor = p.fromId;
      if (!neighbor || !unvisited.has(neighbor)) continue;

      const alt = dist[u] + p.length;
      if (alt < dist[neighbor]) {
        dist[neighbor] = alt;
        prev[neighbor] = { from: u, pathId: p.id };
      }
    }
  }

  if (dist[targetId] === Infinity) return null;

  const pathIds = [];
  let curr = targetId;
  while (curr !== startId) {
    const step = prev[curr];
    if (!step) return null;
    pathIds.unshift(step.pathId);
    curr = step.from;
  }
  return pathIds;
}

// ── Map marker tween animation ────────────────────────────────────────────────
let _mapAnimId = null;

export function stopMapTravelAnim() {
  if (_mapAnimId !== null) {
    cancelAnimationFrame(_mapAnimId);
    _mapAnimId = null;
  }
}

function startMapTravelAnim(pathView, gardener, state) {
  stopMapTravelAnim();

  const from = LOCATION_MAP[pathView.pathFrom];
  const destId = pathView.pathFrom === pathView.fromId ? pathView.toId : pathView.fromId;
  const to = LOCATION_MAP[destId];
  if (!from || !to) return;

  const effectiveSpeed = state.movementSpeed * (gardener.speedBonus ?? 1) * (1 + (state.rulesSpeedBonus ?? 0));
  const startProgress = pathView.progress;
  const startTime = performance.now();

  // Build full route including queued legs
  const legs = [{ from, to, length: pathView.length }];
  let prevDestId = destId;
  for (const pid of (gardener.travelQueue || [])) {
    const p = PATH_MAP[pid];
    if (!p) break;
    const nextDestId = p.fromId === prevDestId ? p.toId : p.fromId;
    const legFrom = LOCATION_MAP[prevDestId];
    const legTo   = LOCATION_MAP[nextDestId];
    if (legFrom && legTo) legs.push({ from: legFrom, to: legTo, length: p.length });
    prevDestId = nextDestId;
  }

  function loop() {
    const elapsed = (performance.now() - startTime) / 1000;
    let remaining = startProgress + effectiveSpeed * elapsed;

    let x = to.x, y = to.y;
    for (const leg of legs) {
      if (remaining <= leg.length) {
        const t = remaining / leg.length;
        x = leg.from.x + (leg.to.x - leg.from.x) * t;
        y = leg.from.y + (leg.to.y - leg.from.y) * t;
        break;
      }
      remaining -= leg.length;
      x = leg.to.x;
      y = leg.to.y;
    }

    const marker = document.getElementById('map-you-marker');
    const label  = document.getElementById('map-you-label');
    if (marker) { marker.setAttribute('cx', x.toFixed(1)); marker.setAttribute('cy', y.toFixed(1)); }
    if (label)  { label.setAttribute('x', x.toFixed(1));  label.setAttribute('y', (y - 20).toFixed(1)); }

    _mapAnimId = requestAnimationFrame(loop);
  }

  _mapAnimId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────────────────

export function renderMap(container, state) {
  if (!state) {
    container.innerHTML = `<p class="muted center">Not connected</p>`;
    return;
  }

  const selectedLocId = getSelectedMapLocId();
  const { gardener, path: pathView } = state;
  const wanderings = (state.record && state.record.wanderings) || [];

  const visited = new Set(wanderings);
  const currentLocId = gardener.locationId;
  if (currentLocId) visited.add(currentLocId);

  const adjacent = new Set();
  for (const p of PATHS) {
    if (visited.has(p.fromId)) adjacent.add(p.toId);
    if (visited.has(p.toId)) adjacent.add(p.fromId);
  }
  for (const id of visited) adjacent.delete(id);

  const canSelect = gardener.state === 'resting' && currentLocId;

  const visiblePaths = PATHS.filter(p => visited.has(p.fromId) || visited.has(p.toId));

  let routePathIds = new Set();
  let travelRoute = null;
  if (canSelect && selectedLocId && selectedLocId !== currentLocId) {
    travelRoute = computeRoute(currentLocId, selectedLocId, visited, adjacent);
    if (travelRoute) {
      for (const pid of travelRoute) routePathIds.add(pid);
    }
  }

  let svg = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" class="world-map" xmlns="http://www.w3.org/2000/svg">`;

  for (const p of visiblePaths) {
    const from = LOCATION_MAP[p.fromId];
    const to   = LOCATION_MAP[p.toId];
    if (!from || !to) continue;
    const isRoute = routePathIds.has(p.id);
    svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="map-path visited${isRoute ? ' route' : ''}"/>`;
  }

  for (const loc of LOCATIONS) {
    const isVisited  = visited.has(loc.id);
    const isAdjacent = adjacent.has(loc.id);
    if (!isVisited && !isAdjacent) continue;

    const isCurrent  = loc.id === currentLocId;
    const isSelectable = canSelect && loc.id !== currentLocId;
    const isSelected = loc.id === selectedLocId;

    const attrs = `data-loc-id="${loc.id}"` +
      (isSelectable ? ` data-action="select_map_loc"` : '');

    if (isVisited) {
      const seed = originByLoc[loc.id];
      if (seed) {
        let cls = 'map-node-img';
        if (isSelectable) cls += ' walkable';
        if (isSelected)   cls += ' selected';
        svg += `<image href="/assets/seed_${seed.id}.svg"
          x="${loc.x - 16}" y="${loc.y - 16}" width="32" height="32"
          class="${cls}" ${attrs}/>`;
      } else {
        let cls = 'map-loc visited';
        if (isSelectable) cls += ' walkable';
        if (isSelected)   cls += ' selected';
        svg += `<circle cx="${loc.x}" cy="${loc.y}" r="${LOC_R}" class="${cls}" ${attrs}/>`;
      }
    } else {
      let cls = 'map-loc adjacent';
      if (isSelectable) cls += ' walkable';
      if (isSelected)   cls += ' selected';
      svg += `<circle cx="${loc.x}" cy="${loc.y}" r="${LOC_R}" class="${cls}" ${attrs}/>`;
    }
    // Location name text removed; hover tooltip still works
  }

  // Player position marker
  let youX = null, youY = null;
  let atLocation = false;
  if (currentLocId && LOCATION_MAP[currentLocId]) {
    const loc = LOCATION_MAP[currentLocId];
    youX = loc.x;
    youY = loc.y;
    atLocation = true;
  } else if (pathView && pathView.pathFrom && pathView.length) {
    const fromLoc = LOCATION_MAP[pathView.pathFrom];
    const destId = pathView.pathFrom === pathView.fromId ? pathView.toId : pathView.fromId;
    const toLoc = LOCATION_MAP[destId];
    if (fromLoc && toLoc) {
      const frac = Math.min(1, pathView.progress / pathView.length);
      youX = fromLoc.x + (toLoc.x - fromLoc.x) * frac;
      youY = fromLoc.y + (toLoc.y - fromLoc.y) * frac;
    }
  }

  if (youX !== null && youY !== null) {
    if (atLocation) {
      // Stroke-only circle, larger than the 32px seed icons (r≈16)
      svg += `<circle id="map-you-marker" cx="${youX.toFixed(1)}" cy="${youY.toFixed(1)}" r="22" class="map-you-at-loc"/>`;
    } else {
      svg += `<circle id="map-you-marker" cx="${youX.toFixed(1)}" cy="${youY.toFixed(1)}" r="7" class="map-you"/>`;
    }
    svg += `<text id="map-you-label" x="${youX.toFixed(1)}" y="${(youY - (atLocation ? 28 : 16)).toFixed(1)}" class="map-label map-you-label">You</text>`;
  }

  svg += `</svg>`;

  // Travel button
  let travelButton = '';
  if (travelRoute && travelRoute.length > 0) {
    const destName = LOCATION_MAP[selectedLocId]?.name ?? selectedLocId;
    const effectiveSpeed = state.movementSpeed * (gardener.speedBonus ?? 1) * (1 + (state.rulesSpeedBonus ?? 0));
    const totalTicks = travelRoute.reduce((sum, pid) => {
      const p = PATH_MAP[pid];
      return sum + Math.ceil((p ? p.length : 0) / effectiveSpeed);
    }, 0);
    const pathIdsJson = JSON.stringify(travelRoute);
    travelButton = `<div class="map-travel-bar">
      <button class="btn" data-action="queue_travel" data-path-ids='${pathIdsJson}'>
        Travel to ${destName} · ~${formatDuration(totalTicks)}
      </button>
    </div>`;
  }

  // Bottom widget: selected visited location
  let locWidget = '';
  if (selectedLocId && visited.has(selectedLocId)) {
    const locMeta    = LOCATION_MAP[selectedLocId];
    const coreSeed   = originByLoc[selectedLocId];
    const memPots    = (gardener.locationMemory || {})[selectedLocId];

    locWidget = `<div class="map-loc-widget">`;
    locWidget += `<div class="map-loc-widget-header">`;
    if (coreSeed) {
      locWidget += `<div class="seed-icon seed-icon-map-widget" style="background:${coreSeed.color}">
        <img src="/assets/seed_${coreSeed.id}.svg" alt="${coreSeed.name}" onerror="this.style.display='none'">
      </div>`;
    }
    locWidget += `<div class="map-loc-widget-name">${locMeta ? locMeta.name : selectedLocId}</div>`;
    locWidget += `</div>`;

    if (memPots && memPots.length > 0) {
      locWidget += `<div class="pot-memory-strip">`;
      for (const mp of memPots) {
        if (mp.seedId) {
          const s = SEED_MAP[mp.seedId];
          locWidget += `<span class="pot-mem-dot" style="background:${s ? s.color : '#666'}"></span>`;
        } else {
          locWidget += `<span class="pot-mem-dot pot-mem-dot-empty"></span>`;
        }
      }
      locWidget += `</div>`;
    } else if (!memPots) {
      locWidget += `<p class="muted" style="font-size:11px;margin-top:6px">No visit recorded yet</p>`;
    }

    locWidget += `</div>`;
  }

  container.innerHTML = `<div class="map-wrap"><div class="map-tooltip" hidden></div>${svg}</div>${travelButton}${locWidget}`;

  // Start marker tween if walking
  stopMapTravelAnim();
  if (gardener.state === 'walking' && pathView) {
    startMapTravelAnim(pathView, gardener, state);
  }

  // Hover tooltip
  const svgEl   = container.querySelector('.world-map');
  const tooltip = container.querySelector('.map-tooltip');
  const wrap    = container.querySelector('.map-wrap');

  svgEl.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-loc-id]');
    if (!el) return;
    const locId = el.dataset.locId;
    const loc   = LOCATION_MAP[locId];
    if (!loc) return;

    const svgRect  = svgEl.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const scaleX   = svgRect.width  / SVG_W;
    const scaleY   = svgRect.height / SVG_H;
    const px = loc.x * scaleX + (svgRect.left - wrapRect.left);
    const py = loc.y * scaleY + (svgRect.top  - wrapRect.top);

    tooltip.textContent = loc.name;
    tooltip.removeAttribute('hidden');
    tooltip.style.left = `${px}px`;
    tooltip.style.top  = `${py - 36}px`;
  });

  svgEl.addEventListener('mouseleave', () => {
    tooltip.setAttribute('hidden', '');
  });
}
