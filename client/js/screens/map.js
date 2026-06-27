import { LOCATIONS, PATHS, LOCATION_MAP } from '../world.js';
import { SEEDS } from '../seeds.js';
import { getSelectedMapLocId, getSelectedMapPathId } from '../state.js';

const SVG_W = 800;
const SVG_H = 900;
const LOC_R  = 10;

// origin seed keyed by locationId
const originByLoc = Object.fromEntries(SEEDS.filter(s => s.locationId).map(s => [s.locationId, s]));

export function renderMap(container, state) {
  if (!state) {
    container.innerHTML = `<p class="muted center">Not connected</p>`;
    return;
  }

  const selectedLocId  = getSelectedMapLocId();
  const selectedPathId = getSelectedMapPathId();

  const { gardener, path: pathView } = state;
  const wanderings = (state.record && state.record.wanderings) || [];

  const visited = new Set(wanderings);
  const currentLocId = gardener.locationId;
  if (currentLocId) visited.add(currentLocId);

  // Adjacent: connected to any visited but not itself visited
  const adjacent = new Set();
  for (const p of PATHS) {
    if (visited.has(p.fromId)) adjacent.add(p.toId);
    if (visited.has(p.toId)) adjacent.add(p.fromId);
  }
  for (const id of visited) adjacent.delete(id);

  // Walkable from current position: directly connected, pilgrim resting
  const walkable = new Map(); // locId -> pathId
  if (gardener.state === 'resting' && currentLocId) {
    for (const p of PATHS) {
      if (p.fromId === currentLocId) walkable.set(p.toId, p.id);
      if (p.toId === currentLocId) walkable.set(p.fromId, p.id);
    }
  }

  const visiblePaths = PATHS.filter(p => visited.has(p.fromId) || visited.has(p.toId));

  let svg = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" class="world-map" xmlns="http://www.w3.org/2000/svg">`;

  // Paths
  for (const p of visiblePaths) {
    const from = LOCATION_MAP[p.fromId];
    const to   = LOCATION_MAP[p.toId];
    if (!from || !to) continue;
    svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="map-path visited"/>`;
  }

  // Location circles
  for (const loc of LOCATIONS) {
    const isVisited  = visited.has(loc.id);
    const isAdjacent = adjacent.has(loc.id);
    if (!isVisited && !isAdjacent) continue;

    const isCurrent  = loc.id === currentLocId;
    const isWalkable = walkable.has(loc.id);

    let cls = isVisited ? 'map-loc visited' : 'map-loc adjacent';
    if (isWalkable) cls += ' walkable';
    if (loc.id === selectedLocId) cls += ' selected';

    const attrs = `data-loc-id="${loc.id}"` +
      (isWalkable ? ` data-action="select_map_loc" data-path-id="${walkable.get(loc.id)}"` : '');

    svg += `<circle cx="${loc.x}" cy="${loc.y}" r="${LOC_R}" class="${cls}" ${attrs}/>`;

    // Permanent name label only for current location
    if (isCurrent) {
      svg += `<text x="${loc.x}" y="${loc.y + LOC_R + 14}" class="map-label">${loc.name}</text>`;
    }
  }

  // Player position
  let youX = null, youY = null;
  if (currentLocId && LOCATION_MAP[currentLocId]) {
    const loc = LOCATION_MAP[currentLocId];
    youX = loc.x;
    youY = loc.y;
  } else if (pathView && pathView.pathFrom && pathView.length) {
    const from = LOCATION_MAP[pathView.pathFrom];
    const destId = pathView.pathFrom === pathView.fromId ? pathView.toId : pathView.fromId;
    const to = LOCATION_MAP[destId];
    if (from && to) {
      const frac = Math.min(1, pathView.progress / pathView.length);
      youX = from.x + (to.x - from.x) * frac;
      youY = from.y + (to.y - from.y) * frac;
    }
  }

  if (youX !== null && youY !== null) {
    svg += `<circle cx="${youX.toFixed(1)}" cy="${youY.toFixed(1)}" r="7" class="map-you"/>`;
    svg += `<text x="${youX.toFixed(1)}" y="${(youY - 14).toFixed(1)}" class="map-label map-you-label">You</text>`;
  }

  svg += `</svg>`;

  let travelButton = '';
  if (selectedLocId && selectedPathId) {
    const destName = LOCATION_MAP[selectedLocId]?.name ?? selectedLocId;
    travelButton = `<div class="map-travel-bar"><button class="btn" data-action="walk" data-path-id="${selectedPathId}">Travel to ${destName}</button></div>`;
  }

  container.innerHTML = `<div class="map-wrap"><div class="map-tooltip" hidden></div>${svg}</div>${travelButton}`;

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

    const isVis = visited.has(locId);
    const seed  = originByLoc[locId];
    const label = isVis
      ? `${seed?.symbol ?? ''} ${loc.name}`.trim()
      : '?';

    // Convert SVG coords → overlay pixels
    const svgRect  = svgEl.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const scaleX   = svgRect.width  / SVG_W;
    const scaleY   = svgRect.height / SVG_H;
    const px = loc.x * scaleX + (svgRect.left - wrapRect.left);
    const py = loc.y * scaleY + (svgRect.top  - wrapRect.top);

    tooltip.textContent = label;
    tooltip.removeAttribute('hidden');
    tooltip.style.left = `${px}px`;
    tooltip.style.top  = `${py - 36}px`;
  });

  svgEl.addEventListener('mouseleave', () => {
    tooltip.setAttribute('hidden', '');
  });
}
