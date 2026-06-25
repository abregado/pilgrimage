window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Arrival = (() => {
  const { Utils } = Pilgrim;

  function render(state) {
    const { pilgrim, location } = state;
    if (!location || location.type !== 'beacon') return;

    let html = `
      <div class="screen-header arrival-header">
        <div class="arrival-label">Arriving at</div>
        <h2>${location.name}</h2>
      </div>`;

    html += `<section class="section"><h3>Carrying</h3>`;
    if (pilgrim.carriedIdeal) {
      const ideal = Pilgrim.IDEALS[pilgrim.carriedIdeal];
      html += `<div class="carrying-row">${Utils.idealBadge(pilgrim.carriedIdeal, true)}<span class="ideal-name" style="color:${ideal.color}">${ideal.name}</span></div>`;
    } else {
      html += `<p class="muted">Carrying nothing</p>`;
    }
    html += `</section>`;

    if (pilgrim.encounteredPilgrims.length > 0) {
      html += `<section class="section"><h3>Pilgrims You Passed (${pilgrim.encounteredPilgrims.length})</h3><div class="encounter-list">`;
      for (const enc of pilgrim.encounteredPilgrims) {
        html += renderEncounter(enc, pilgrim);
      }
      html += `</div></section>`;
    }

    html += `<div class="arrival-ok"><button class="btn btn-primary" data-action="arrival-ok">Continue to ${location.name}</button></div>`;

    document.getElementById('tab-game').innerHTML = html;
  }

  function renderEncounter(enc, pilgrim) {
    const ideal = enc.idealId ? Pilgrim.IDEALS[enc.idealId] : null;
    const carrying = pilgrim.carriedIdeal === enc.idealId;

    return `
      <div class="encounter-row">
        ${enc.idealId ? Pilgrim.Utils.idealBadge(enc.idealId, false) : '<span class="ideal-badge empty-badge">?</span>'}
        <span class="encounter-ideal" ${ideal ? `style="color:${ideal.color}"` : ''}>${ideal ? ideal.name : 'Nothing'}</span>
        ${!carrying && enc.idealId ? `<button class="btn btn-sm" data-action="swap" data-pilgrim="${enc.pilgrimId}">Take</button>` : ''}
      </div>`;
  }

  return { render };
})();
