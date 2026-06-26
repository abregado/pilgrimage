window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Pilgrim = (() => {
  const { Utils } = Pilgrim;

  function render(state) {
    const { pilgrim, location } = state;
    if (!pilgrim) {
      document.getElementById('tab-pilgrim').innerHTML = '<p class="muted center">Connecting…</p>';
      return;
    }

    const tick = Pilgrim.State.estimateTick();
    const ageTicks = tick - pilgrim.createdTick;

    // Estimate km walked: passport length × average path length (rough)
    // We don't have perfect data, so show passport size as milestones
    const beaconsVisited = pilgrim.passport.length;

    // Top ideals from seenIdeals, sorted by times seen (we approximate by list order)
    const seenByCount = {};
    for (const idealId of pilgrim.seenIdeals) {
      seenByCount[idealId] = (seenByCount[idealId] || 0) + 1;
    }
    const sortedSeen = [...new Set(pilgrim.seenIdeals)].sort(
      (a, b) => (seenByCount[b] || 0) - (seenByCount[a] || 0)
    );

    let html = `<div class="pilgrim-tab">`;

    // Carried ideal
    html += `<section class="section"><h3>Carrying</h3>`;
    if (pilgrim.carriedIdeal) {
      const ideal = Pilgrim.IDEALS[pilgrim.carriedIdeal];
      html += `<div class="carrying-row large">${Utils.idealBadge(pilgrim.carriedIdeal, true)}<span class="ideal-name" style="color:${ideal.color}">${ideal.name}</span></div>`;
    } else {
      html += `<p class="muted">Carrying nothing</p>`;
    }
    html += `</section>`;

    // Belief structure
    if (pilgrim.beliefStructure.length > 0) {
      html += `<section class="section"><h3>Beliefs</h3><div class="belief-list">`;
      for (const idealId of pilgrim.beliefStructure) {
        html += Utils.idealTag(idealId);
      }
      html += `</div></section>`;
    }

    // Stats
    html += `<section class="section stats-grid">
      <div class="stat"><span class="stat-label">Age</span><span class="stat-value">${Utils.formatAge(ageTicks)}</span></div>
      <div class="stat"><span class="stat-label">Beacons Visited</span><span class="stat-value">${beaconsVisited}</span></div>
      <div class="stat"><span class="stat-label">Ideals Seen</span><span class="stat-value">${sortedSeen.length}</span></div>
      <div class="stat"><span class="stat-label">Status</span><span class="stat-value">${pilgrim.state}</span></div>
    </section>`;

    // Passport
    if (pilgrim.passport.length > 0) {
      html += `<section class="section"><h3>Passport</h3><div class="passport-list">`;
      for (const beaconId of pilgrim.passport) {
        const b = Pilgrim.WORLD.beacons[beaconId];
        const name = b ? b.name : beaconId;
        html += `<div class="passport-entry">${name}</div>`;
      }
      html += `</div></section>`;
    }

    // Seen ideals
    if (sortedSeen.length > 0) {
      html += `<section class="section"><h3>Ideals Encountered</h3><div class="seen-ideal-grid">`;
      for (const idealId of sortedSeen) {
        html += `<div class="seen-ideal-item">${Utils.idealBadge(idealId, false)}<span>${Pilgrim.IDEALS[idealId]?.name}</span></div>`;
      }
      html += `</div></section>`;
    }

    html += `</div>`;

    document.getElementById('tab-pilgrim').innerHTML = html;
  }

  return { render };
})();
