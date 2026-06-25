window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Path = (() => {
  const { Utils } = Pilgrim;

  function render(state) {
    const { pilgrim, location } = state;
    if (!location || location.type !== 'path') return;

    const tick = Pilgrim.State.estimateTick();
    const ticksLeft = Utils.ticksUntilArrival(pilgrim, location);
    const progress = Utils.pathProgressFraction(pilgrim, location.length);

    const goingToIdx = pilgrim.pathDirection === 0 ? 1 : 0;
    const fromIdx    = pilgrim.pathDirection === 0 ? 0 : 1;
    const destName   = location.beaconNames[goingToIdx];
    const fromName   = location.beaconNames[fromIdx];
    const destCores  = location.beaconCoreIdeals[goingToIdx];
    const fromCores  = location.beaconCoreIdeals[fromIdx];

    let html = `
      <div class="screen-header">
        <h2>${fromName} → ${destName}</h2>
      </div>

      <section class="section journey-progress">
        <div class="progress-labels">
          <span>${fromName}</span><span>${destName}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" id="path-progress-fill" style="width:${(progress * 100).toFixed(1)}%"></div></div>
        <div class="progress-eta" id="path-eta">Arrives in ${Utils.ticksToSeconds(ticksLeft)}</div>
      </section>`;

    html += `<section class="section"><h3>Carrying</h3>`;
    if (pilgrim.carriedIdeal) {
      html += `<div class="carrying-row">${Utils.idealBadge(pilgrim.carriedIdeal, true)}<span class="ideal-name" style="color:${Pilgrim.IDEALS[pilgrim.carriedIdeal].color}">${Pilgrim.IDEALS[pilgrim.carriedIdeal].name}</span></div>`;
    } else {
      html += `<p class="muted">Carrying nothing</p>`;
    }
    html += `</section>`;

    html += `<div class="path-actions">
      <button class="btn" data-action="reverse">Reverse Direction</button>
    </div>`;

    if (location.pilgrimsOnPath.length > 1 || pilgrim.encounteredPilgrims.length > 0) {
      html += `<section class="section"><h3>Pilgrims Passed (${location.passedCount})</h3>`;
      if (pilgrim.encounteredPilgrims.length === 0) {
        html += `<p class="muted">None yet</p>`;
      } else {
        html += `<div class="encounter-list">`;
        for (const enc of pilgrim.encounteredPilgrims) {
          html += renderEncounter(enc, pilgrim);
        }
        html += `</div>`;
      }
      html += `</section>`;
    }

    if (destCores || fromCores) {
      html += `<section class="section"><h3>Beacon Ideals</h3>`;
      if (fromCores) {
        html += `<div class="beacon-cores"><span class="beacon-name-sm">${fromName}:</span> ${fromCores.map(id => Utils.idealTag(id)).join(' ')}</div>`;
      }
      if (destCores) {
        html += `<div class="beacon-cores"><span class="beacon-name-sm">${destName}:</span> ${destCores.map(id => Utils.idealTag(id)).join(' ')}</div>`;
      }
      html += `</section>`;
    }

    document.getElementById('tab-game').innerHTML = html;
  }

  function renderEncounter(enc, pilgrim) {
    const ideal = enc.idealId ? Pilgrim.IDEALS[enc.idealId] : null;
    const carrying = pilgrim.carriedIdeal === enc.idealId;

    return `
      <div class="encounter-row">
        ${enc.idealId ? Utils.idealBadge(enc.idealId, false) : '<span class="ideal-badge empty-badge">?</span>'}
        <span class="encounter-ideal" ${ideal ? `style="color:${ideal.color}"` : ''}>${ideal ? ideal.name : 'Nothing'}</span>
        ${!carrying && enc.idealId ? `<button class="btn btn-sm" data-action="swap" data-pilgrim="${enc.pilgrimId}">Take</button>` : ''}
      </div>`;
  }

  return { render };
})();
