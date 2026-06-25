window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Beacon = (() => {
  const { Utils } = Pilgrim;

  function render(state) {
    const { pilgrim, location } = state;
    if (!location || location.type !== 'beacon') return;

    const tick = Pilgrim.State.estimateTick();
    const praying = pilgrim.state === 'Praying';
    const prayingTicksLeft = praying ? Math.max(0, pilgrim.prayingUntilTick - tick) : 0;

    let html = `
      <div class="screen-header">
        <h2>${location.name}</h2>
        <div class="beacon-meta">${location.pilgrimsPresent} pilgrim${location.pilgrimsPresent !== 1 ? 's' : ''} here &middot; ${location.awakePilgrims} awake</div>
      </div>`;

    if (praying) {
      html += `<div class="status-banner praying">Praying… <span id="praying-countdown">${Utils.ticksToSeconds(prayingTicksLeft)}</span></div>`;
    }

    html += `<section class="section"><h3>Altars</h3><div class="altar-list">`;
    for (const altar of location.altars) {
      html += renderAltar(altar, pilgrim, location, tick);
    }
    html += `</div></section>`;

    html += `<section class="section"><h3>Core Ideals</h3><div class="core-ideal-list">`;
    for (const idealId of location.coreIdeals) {
      html += renderCoreIdeal(idealId, pilgrim, praying);
    }
    html += `</div></section>`;

    html += `<section class="section"><h3>Paths</h3><div class="path-list">`;
    for (const p of location.paths) {
      html += renderPath(p, praying);
    }
    html += `</div></section>`;

    document.getElementById('tab-game').innerHTML = html;

    if (pilgrim.canUndo) {
      const undoBar = document.createElement('div');
      undoBar.className = 'undo-bar';
      undoBar.innerHTML = `<span>Picked up ${Pilgrim.IDEALS[pilgrim.carriedIdeal]?.name || 'ideal'}</span><button class="btn btn-sm" data-action="undo-ideal">Undo</button>`;
      document.getElementById('tab-game').prepend(undoBar);
    }
  }

  function renderAltar(altar, pilgrim, location, tick) {
    const ideal = Pilgrim.IDEALS[altar.idealId];
    const protectionLeft = Math.max(0, altar.lastChangeTick + 60 - tick);
    const isProtected = protectionLeft > 0;
    const idealAlreadyHere = location.altars.some(a => a.id !== altar.id && a.idealId === pilgrim.carriedIdeal);
    const canChange = !altar.isStrongest && !isProtected && pilgrim.carriedIdeal && pilgrim.state !== 'Praying' && !idealAlreadyHere;
    const isPraying = pilgrim.state === 'Praying';

    let badgeHtml = altar.idealId
      ? `${Utils.idealBadge(altar.idealId, true)}<span class="altar-ideal-name" style="color:${ideal.color}">${ideal.name}</span>`
      : `<span class="altar-empty">Empty</span>`;

    let statusHtml = '';
    if (altar.isStrongest && altar.believersCount > 0) {
      statusHtml = `<span class="altar-strongest">Strongest</span>`;
    } else if (isProtected) {
      statusHtml = `<span class="altar-protected">Protected <span id="altar-protection-${altar.id}">${Utils.ticksToSeconds(protectionLeft)}</span></span>`;
    }

    const prayBtn = !isPraying
      ? `<button class="btn btn-sm" data-action="pray" data-altar="${altar.id}">Pray</button>`
      : '';
    const changeBtn = canChange
      ? `<button class="btn btn-sm btn-accent" data-action="change-altar" data-altar="${altar.id}">Place ${Pilgrim.IDEALS[pilgrim.carriedIdeal]?.name}</button>`
      : '';

    return `
      <div class="altar-card${altar.isStrongest ? ' altar-strongest-card' : ''}">
        <div class="altar-ideal">${badgeHtml}</div>
        <div class="altar-info">
          <span class="altar-believers">${altar.believersCount} believer${altar.believersCount !== 1 ? 's' : ''}</span>
          ${statusHtml}
        </div>
        <div class="altar-actions">${prayBtn}${changeBtn}</div>
      </div>`;
  }

  function renderCoreIdeal(idealId, pilgrim, praying) {
    const ideal = Pilgrim.IDEALS[idealId];
    const carrying = pilgrim.carriedIdeal === idealId;
    const canTake = !praying;
    const takeLabel = pilgrim.carriedIdeal ? `Swap for ${ideal.name}` : `Take ${ideal.name}`;

    return `
      <div class="core-ideal-row">
        ${Utils.idealBadge(idealId, false)}
        <span class="ideal-name" style="color:${ideal.color}">${ideal.name}</span>
        ${carrying ? '<span class="carrying-label">Carrying</span>' : ''}
        ${!carrying && canTake ? `<button class="btn btn-sm" data-action="take-ideal" data-ideal="${idealId}">${takeLabel}</button>` : ''}
      </div>`;
  }

  function renderPath(p, praying) {
    return `
      <div class="path-row">
        <div class="path-info">
          <span class="path-dest">${p.otherBeaconName}</span>
          <span class="path-dist">${Utils.formatDistance(p.length)}</span>
        </div>
        ${!praying ? `<button class="btn btn-sm" data-action="travel" data-path="${p.pathId}">Travel</button>` : ''}
      </div>`;
  }

  return { render };
})();
