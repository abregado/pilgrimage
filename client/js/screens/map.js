window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Map = (() => {
  const SVG_W = 320;
  const SVG_H = 380;
  const BEACON_R = 18;

  function render(state) {
    const { pilgrim } = state;
    const tab = document.getElementById('tab-map');

    if (!pilgrim) {
      tab.innerHTML = '<p class="muted center">Not connected</p>';
      return;
    }

    const visited = new Set(pilgrim.passport);

    // Determine which beacons are visible:
    // - Visited beacons are always visible
    // - Adjacent beacons (connected by a path to a visited beacon) are shown dimmed
    const adjacent = new Set();
    for (const path of Object.values(Pilgrim.WORLD.paths)) {
      const [b0, b1] = path.beaconIds;
      if (visited.has(b0)) adjacent.add(b1);
      if (visited.has(b1)) adjacent.add(b0);
    }

    // Which paths to draw: at least one end visited
    const visiblePaths = Object.entries(Pilgrim.WORLD.paths).filter(([, p]) =>
      visited.has(p.beaconIds[0]) || visited.has(p.beaconIds[1])
    );

    // Pilgrim position on path (if travelling)
    let pilgrimOnPath = null;
    if (pilgrim.pathId && state.location && state.location.type === 'path') {
      const worldPath = Pilgrim.WORLD.paths[pilgrim.pathId];
      if (worldPath) {
        const b0 = Pilgrim.WORLD.beacons[worldPath.beaconIds[0]];
        const b1 = Pilgrim.WORLD.beacons[worldPath.beaconIds[1]];
        const frac = pilgrim.pathPosition / state.location.length;
        pilgrimOnPath = {
          x: b0.x + (b1.x - b0.x) * frac,
          y: b0.y + (b1.y - b0.y) * frac,
        };
      }
    }

    let pathsSvg = '';
    for (const [, p] of visiblePaths) {
      const b0 = Pilgrim.WORLD.beacons[p.beaconIds[0]];
      const b1 = Pilgrim.WORLD.beacons[p.beaconIds[1]];
      pathsSvg += `<line x1="${b0.x}" y1="${b0.y}" x2="${b1.x}" y2="${b1.y}" class="map-path"/>`;
    }

    let beaconsSvg = '';
    for (const [id, b] of Object.entries(Pilgrim.WORLD.beacons)) {
      const isVisited = visited.has(id);
      const isAdjacent = adjacent.has(id) && !isVisited;
      if (!isVisited && !isAdjacent) continue;

      const cls = isVisited ? 'map-beacon visited' : 'map-beacon adjacent';
      beaconsSvg += `
        <circle cx="${b.x}" cy="${b.y}" r="${BEACON_R}" class="${cls}"/>
        <text x="${b.x}" y="${b.y + BEACON_R + 13}" class="map-beacon-label${isAdjacent ? ' dim' : ''}">${b.name}</text>`;
    }

    let pilgrimSvg = '';
    if (pilgrimOnPath) {
      pilgrimSvg = `<circle cx="${pilgrimOnPath.x.toFixed(1)}" cy="${pilgrimOnPath.y.toFixed(1)}" r="6" class="map-pilgrim"/>`;
    } else if (pilgrim.beaconId) {
      const b = Pilgrim.WORLD.beacons[pilgrim.beaconId];
      if (b) {
        pilgrimSvg = `<circle cx="${b.x}" cy="${b.y}" r="6" class="map-pilgrim"/>`;
      }
    }

    const svgHtml = `
      <svg viewBox="0 0 ${SVG_W} ${SVG_H}" class="world-map" xmlns="http://www.w3.org/2000/svg">
        ${pathsSvg}
        ${beaconsSvg}
        ${pilgrimSvg}
      </svg>`;

    tab.innerHTML = `
      <div class="map-container">
        <h3 class="map-title">World Map</h3>
        ${visited.size === 0 ? '<p class="muted center">Explore to reveal the map</p>' : svgHtml}
      </div>`;
  }

  return { render };
})();
