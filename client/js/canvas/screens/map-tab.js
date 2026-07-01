// Canvas renderer for the Map tab (right column).
// Draws a scaled, pannable world map with paths, location nodes, player marker,
// and a tooltip card for the selected location.

import {
  fillRect, roundRect, drawCircle, drawLine,
  drawText, drawImage, withClip,
} from '../../canvas/draw.js';
import { hit, getMapPan } from '../../canvas/input.js';
import { getTheme } from '../../canvas/theme.js';
import { getImg } from '../../canvas/assets.js';
import { SEED_MAP, SEEDS } from '../../seeds.js';
import { LOCATIONS, LOCATION_MAP, PATHS, PATH_MAP } from '../../world.js';
import { getSelectedMapLocId } from '../../state.js';
import { formatDuration } from '../../utils.js';
import { liveTick } from '../../clock.js';
import { getGrowthStage } from '../../growth.js';

const MAP_W = 800;
const MAP_H = 900;

// Map each location id → its origin seed (the seed whose locationId matches)
const _originByLoc = Object.fromEntries(
  SEEDS.filter(s => s.locationId).map(s => [s.locationId, s]),
);

// ── Dijkstra route computation ────────────────────────────────────────────────
// Returns an ordered array of pathIds from startId → targetId,
// only traversing locations in the visited+adjacent known set.
// Returns null if no route exists.
function _computeRoute(startId, targetId, visited, adjacent) {
  if (startId === targetId) return [];

  const known = new Set([...visited, ...adjacent]);
  if (!known.has(startId) || !known.has(targetId)) return null;

  const dist = {};
  const prev = {};
  const unvisited = new Set(known);

  for (const id of known) dist[id] = Infinity;
  dist[startId] = 0;

  while (unvisited.size > 0) {
    // Pick lowest-dist unvisited node
    let u = null;
    for (const id of unvisited) {
      if (u === null || dist[id] < dist[u]) u = id;
    }
    if (u === null || dist[u] === Infinity) break;
    if (u === targetId) break;
    unvisited.delete(u);

    for (const p of PATHS) {
      // Only traverse paths that have at least one visited endpoint
      if (!visited.has(p.fromId) && !visited.has(p.toId)) continue;
      let neighbor = null;
      if (p.fromId === u && known.has(p.toId))   neighbor = p.toId;
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

// ── Main render function ──────────────────────────────────────────────────────

export function renderMapTab(ctx, bounds, state) {
  const T = getTheme();

  // ── Null state guard ─────────────────────────────────────────────────────
  if (!state) {
    fillRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, T.bg);
    drawText(ctx, 'Not connected', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, {
      font: '14px sans-serif',
      color: T.muted,
      align: 'center',
      baseline: 'middle',
    });
    return;
  }

  const { gardener, path: pathView } = state;
  const wanderings = state.record?.wanderings ?? [];

  // ── Visibility sets ───────────────────────────────────────────────────────
  const visited = new Set(wanderings);
  const currentLocId = gardener.locationId;
  if (currentLocId) visited.add(currentLocId);

  const adjacent = new Set();
  for (const p of PATHS) {
    if (visited.has(p.fromId)) adjacent.add(p.toId);
    if (visited.has(p.toId))   adjacent.add(p.fromId);
  }
  for (const id of visited) adjacent.delete(id);

  const canSelect = gardener.state === 'resting' && !!currentLocId;

  // ── Map projection ────────────────────────────────────────────────────────
  const scale = Math.min((bounds.w - 32) / MAP_W, (bounds.h - 32) / MAP_H);
  const offsetX = bounds.x + (bounds.w - MAP_W * scale) / 2;
  const offsetY = bounds.y + (bounds.h - MAP_H * scale) / 2;
  const pan = getMapPan();
  const ox = offsetX + pan.x;
  const oy = offsetY + pan.y;

  // Convenience: map logical → canvas
  const lx = (lx) => ox + lx * scale;
  const ly = (ly) => oy + ly * scale;

  // ── Route computation ─────────────────────────────────────────────────────
  const selectedLocId = getSelectedMapLocId();
  let travelRoute = null;
  const routePathIds = new Set();

  if (canSelect && selectedLocId && selectedLocId !== currentLocId) {
    travelRoute = _computeRoute(currentLocId, selectedLocId, visited, adjacent);
    if (travelRoute) {
      for (const pid of travelRoute) routePathIds.add(pid);
    }
  }

  // ── Compute travel ETA ────────────────────────────────────────────────────
  let travelEta = '';
  if (travelRoute && travelRoute.length > 0) {
    const speed = (state.movementSpeed ?? 1)
      * (gardener.speedBonus ?? 1)
      * (1 + (state.rulesSpeedBonus ?? 0));
    const totalTicks = travelRoute.reduce((sum, pid) => {
      const p = PATH_MAP[pid];
      return sum + (p ? Math.ceil(p.length / speed) : 0);
    }, 0);
    travelEta = formatDuration(totalTicks);
  }

  // ── Drawing (clipped to bounds) ───────────────────────────────────────────
  withClip(ctx, bounds.x, bounds.y, bounds.w, bounds.h, () => {

    // 1. Background
    fillRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, T.bg);

    // 2. Paths
    for (const p of PATHS) {
      const fromLoc = LOCATION_MAP[p.fromId];
      const toLoc   = LOCATION_MAP[p.toId];
      if (!fromLoc || !toLoc) continue;
      // Show path if at least one endpoint is visited
      if (!visited.has(p.fromId) && !visited.has(p.toId)) continue;

      const isRoute = routePathIds.has(p.id);
      drawLine(
        ctx,
        lx(fromLoc.x), ly(fromLoc.y),
        lx(toLoc.x),   ly(toLoc.y),
        isRoute ? T.accent : T.border,
        isRoute ? 2.5 : 1.5,
      );
    }

    // 3. Location nodes
    for (const loc of LOCATIONS) {
      const isVisited  = visited.has(loc.id);
      const isAdjacent = adjacent.has(loc.id);
      if (!isVisited && !isAdjacent) continue;

      const cx = lx(loc.x);
      const cy = ly(loc.y);

      if (isVisited) {
        const seed = _originByLoc[loc.id];
        if (seed) {
          const img = getImg(`seed_${seed.id}`);
          if (img) {
            drawImage(ctx, img, cx - 14, cy - 14, 28, 28);
          } else {
            // Fallback: filled circle in seed color
            drawCircle(ctx, cx, cy, 10, seed.color, null);
          }
        } else {
          drawCircle(ctx, cx, cy, 10, T.muted, null);
        }
      } else {
        // Adjacent: small hollow circle
        drawCircle(ctx, cx, cy, 8, null, T.muted, 1.5);
      }

      // Hit region for all visible locations (canvas-space, no scroll region)
      hit(cx - 16, cy - 16, 32, 32, 'select_map_loc', { locId: loc.id });
    }

    // 4. Player marker
    if (gardener.state === 'walking' && pathView?.pathFrom && pathView.length) {
      const fromLoc = LOCATION_MAP[pathView.pathFrom];
      const destId  = pathView.pathFrom === pathView.fromId ? pathView.toId : pathView.fromId;
      const toLoc   = LOCATION_MAP[destId];
      if (fromLoc && toLoc) {
        const frac = Math.min(1, pathView.progress / pathView.length);
        const mx = lx(fromLoc.x + (toLoc.x - fromLoc.x) * frac);
        const my = ly(fromLoc.y + (toLoc.y - fromLoc.y) * frac);
        drawCircle(ctx, mx, my, 6, T.accent, null);
      }
    } else if (currentLocId && LOCATION_MAP[currentLocId]) {
      const loc = LOCATION_MAP[currentLocId];
      const cx  = lx(loc.x);
      const cy  = ly(loc.y);
      drawCircle(ctx, cx, cy, 14, null, T.accent, 2);
      drawText(ctx, 'You', cx, cy - 20, {
        font: '11px sans-serif',
        color: T.accent,
        align: 'center',
        baseline: 'alphabetic',
      });
    }

    // 5. Selected location tooltip card
    if (selectedLocId) {
      const loc = LOCATION_MAP[selectedLocId];
      if (loc) {
        const isVisitedLoc = visited.has(selectedLocId);
        const cx = lx(loc.x);
        const cy = ly(loc.y);
        const seed = _originByLoc[selectedLocId];

        const hasTravel  = travelRoute && travelRoute.length > 0;
        const cardW = 140;
        const cardH = hasTravel ? 106 : 82;

        // Position: above node, clamped inside bounds
        let cardX = cx - cardW / 2;
        let cardY = cy - cardH - 18;
        if (cardX < bounds.x + 6)               cardX = bounds.x + 6;
        if (cardX + cardW > bounds.x + bounds.w - 6) cardX = bounds.x + bounds.w - 6 - cardW;
        if (cardY < bounds.y + 6)               cardY = cy + 18;

        // Card background
        roundRect(ctx, cardX, cardY, cardW, cardH, 8, T.surface, T.border);

        let iy = cardY + 10;

        // Seed icon + name row
        let nameX = cardX + 10;
        if (seed) {
          const img = getImg(`seed_${seed.id}`);
          if (img) {
            drawImage(ctx, img, cardX + 8, iy, 24, 24);
          } else {
            drawCircle(ctx, cardX + 8 + 12, iy + 12, 10, seed.color, null);
          }
          nameX = cardX + 36;
        }
        drawText(ctx, loc.name, nameX, iy + 14, {
          font: '10px sans-serif',
          color: T.text,
          align: 'left',
          baseline: 'alphabetic',
          maxWidth: cardW - (nameX - cardX) - 6,
        });
        iy += 28;

        // Visited / new badge
        drawText(ctx, isVisitedLoc ? 'visited' : 'new', cardX + 10, iy, {
          font: '10px sans-serif',
          color: isVisitedLoc ? T.jade : T.accent,
          align: 'left',
          baseline: 'alphabetic',
        });
        iy += 16;

        // Pot memory dots — forward-simulated from the departure snapshot using
        // the same growth thresholds as the live location view, so a remembered
        // pot doesn't look frozen at whatever stage it was in when you left.
        const memPots = (gardener.locationMemory ?? {})[selectedLocId];
        if (memPots && memPots.length > 0) {
          const memTick = liveTick();
          let dotX = cardX + 10;
          for (const mp of memPots) {
            const stage = mp.seedId ? getGrowthStage(mp.lastPlantedTick, memTick) : null;
            // A 'dead' pot has been auto-cleared server-side — show it as empty.
            const dotColor = (mp.seedId && stage !== 'dead') ? (SEED_MAP[mp.seedId]?.color ?? T.muted) : null;
            if (dotColor) {
              drawCircle(ctx, dotX + 4, iy + 4, 4, dotColor, null);
            } else {
              drawCircle(ctx, dotX + 4, iy + 4, 4, null, T.border, 1);
            }
            dotX += 12;
            if (dotX + 8 > cardX + cardW - 6) break;
          }
          iy += 14;
        }

        // Travel button
        if (hasTravel) {
          const btnY = cardY + cardH - 28;
          const btnX = cardX + 8;
          const btnW = cardW - 16;
          roundRect(ctx, btnX, btnY, btnW, 22, 4, T.accent, null);
          drawText(ctx, `Travel →  ~${travelEta}`, btnX + btnW / 2, btnY + 14, {
            font: 'bold 10px sans-serif',
            color: T.bg,
            align: 'center',
            baseline: 'alphabetic',
          });
          hit(btnX, btnY, btnW, 22, 'queue_travel', { pathIds: travelRoute });
        }
      }
    }
  }); // end withClip
}
