import { LOCATIONS, PATHS, LOCATION_MAP, PATH_MAP } from '../world.js';

const SVG_W = 800;
const SVG_H = 900;
const LOC_R  = 10;

export function renderMap(container, state) {
  if (!state) {
    container.innerHTML = `<p class="muted center">Not connected</p>`;
    return;
  }

  const { gardener, path: pathView } = state;
  const wanderings = (state.record && state.record.wanderings) || [];

  // Visited locations: all in wanderings
  const visited = new Set(wanderings);

  // Current location
  const currentLocId = gardener.locationId;
  if (currentLocId) visited.add(currentLocId);

  // Adjacent: connected to visited but not visited
  const adjacent = new Set();
  for (const p of PATHS) {
    if (visited.has(p.fromId)) adjacent.add(p.toId);
    if (visited.has(p.toId)) adjacent.add(p.fromId);
  }
  // Remove visited from adjacent
  for (const id of visited) adjacent.delete(id);

  // Visible paths: at least one end visited
  const visiblePaths = PATHS.filter(p => visited.has(p.fromId) || visited.has(p.toId));

  // Build SVG
  let svg = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" class="world-map" xmlns="http://www.w3.org/2000/svg">`;

  // Paths
  for (const p of visiblePaths) {
    const from = LOCATION_MAP[p.fromId];
    const to = LOCATION_MAP[p.toId];
    if (!from || !to) continue;
    const cls = (visited.has(p.fromId) || visited.has(p.toId)) ? 'map-path visited' : 'map-path';
    svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="${cls}"/>`;
  }

  // Locations
  for (const loc of LOCATIONS) {
    const isVisited = visited.has(loc.id);
    const isAdjacent = adjacent.has(loc.id);
    if (!isVisited && !isAdjacent) continue;

    const cls = isVisited ? 'map-loc visited' : 'map-loc adjacent';
    svg += `<circle cx="${loc.x}" cy="${loc.y}" r="${LOC_R}" class="${cls}"/>`;
    if (isVisited) {
      svg += `<text x="${loc.x}" y="${loc.y + LOC_R + 12}" class="map-label">${loc.name}</text>`;
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
    svg += `<text x="${youX.toFixed(1)}" y="${(youY - 14).toFixed(1)}" class="map-label" style="fill:#c9a84c;font-size:11px">You</text>`;
  }

  svg += `</svg>`;

  container.innerHTML = `<div class="map-wrap">${svg}</div>`;
}
