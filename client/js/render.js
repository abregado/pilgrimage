window.Pilgrim = window.Pilgrim || {};

Pilgrim.Render = (() => {
  let _rafId = null;
  let _lastSecond = 0;

  function start() {
    // Full re-render only when server state actually changes
    Pilgrim.State.subscribe(() => renderNow());

    // Single delegated handler for all game-tab actions — avoids stacking on re-render
    document.getElementById('tab-game').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, altar, ideal, path, pilgrim } = btn.dataset;
      const net = Pilgrim.Network;
      switch (action) {
        case 'pray':         net.sendAction({ type: 'PRAY',            altarId:   altar });   break;
        case 'change-altar': net.sendAction({ type: 'CHANGE_ALTAR',    altarId:   altar });   break;
        case 'take-ideal':   net.sendAction({ type: 'TAKE_CORE_IDEAL', idealId:   ideal });   break;
        case 'undo-ideal':   net.sendAction({ type: 'UNDO_TAKE_IDEAL' });                      break;
        case 'travel':       net.sendAction({ type: 'BEGIN_TRAVEL',    pathId:    path });    break;
        case 'reverse':      net.sendAction({ type: 'REVERSE_DIRECTION' });                    break;
        case 'swap':         net.sendAction({ type: 'SWAP_IDEAL',      pilgrimId: pilgrim }); break;
        case 'arrival-ok':   Pilgrim.State.clearArrival();                                     break;
      }
    });
    loop();
  }

  function loop() {
    const now = Date.now();
    const second = Math.floor(now / 1000);
    if (second !== _lastSecond) {
      _lastSecond = second;
      tickUpdate(); // targeted patch only — no innerHTML replacement
    }
    _rafId = requestAnimationFrame(loop);
  }

  // Patches countdown text in the existing DOM without touching innerHTML.
  // Falls back to a full renderNow() when the DOM doesn't match expected state.
  function tickUpdate() {
    const state = Pilgrim.State.get();
    if (!state.connected || !state.pilgrim) return;

    const tab = state.activeTab || 'game';
    if (tab !== 'game') return; // pilgrim/map have no per-second countdowns

    const { pilgrim, location } = state;
    const tick = Pilgrim.State.estimateTick();

    // ── Path screen ───────────────────────────────────────────────────────────
    if (pilgrim.pathId || pilgrim.state === 'Travelling') {
      if (!location || location.type !== 'path') return;
      const fill = document.getElementById('path-progress-fill');
      const eta  = document.getElementById('path-eta');
      if (!fill || !eta) { renderNow(); return; }
      const progress  = Pilgrim.Utils.pathProgressFraction(pilgrim, location.length);
      const ticksLeft = Pilgrim.Utils.ticksUntilArrival(pilgrim, location);
      fill.style.width = `${(progress * 100).toFixed(1)}%`;
      eta.textContent  = `Arrives in ${Pilgrim.Utils.ticksToSeconds(ticksLeft)}`;
      return;
    }

    // ── Arrival screen ────────────────────────────────────────────────────────
    if (state.lastGameScreen === 'path') return; // no per-tick changes here

    // ── Beacon screen ─────────────────────────────────────────────────────────
    if (!location || location.type !== 'beacon') return;

    if (pilgrim.state === 'Praying') {
      const ticksLeft = Math.max(0, pilgrim.prayingUntilTick - tick);
      const el = document.getElementById('praying-countdown');
      if (ticksLeft <= 0 || !el) { renderNow(); return; } // praying ended or stale DOM
      el.textContent = Pilgrim.Utils.ticksToSeconds(ticksLeft);
    }

    for (const altar of location.altars) {
      const protectionLeft = Math.max(0, altar.lastChangeTick + 60 - tick);
      const el = document.getElementById(`altar-protection-${altar.id}`);
      if (protectionLeft <= 0) {
        if (el) { renderNow(); return; } // protection just expired — re-render to reveal button
        continue;
      }
      if (!el) { renderNow(); return; } // element should exist but doesn't — stale DOM
      el.textContent = Pilgrim.Utils.ticksToSeconds(protectionLeft);
    }
  }

  function renderNow() {
    const state = Pilgrim.State.get();

    if (!state.connected) {
      showScreen('screen-connect');
      Pilgrim.Screens.Connect.render();
      return;
    }

    showScreen('screen-main');

    const tab = state.activeTab || 'game';
    setActiveTab(tab);

    switch (tab) {
      case 'game':    renderGameTab(state); break;
      case 'pilgrim': Pilgrim.Screens.Pilgrim.render(state); break;
      case 'map':     Pilgrim.Screens.Map.render(state); break;
    }
  }

  function renderGameTab(state) {
    const { pilgrim } = state;
    if (!pilgrim) return;

    if (pilgrim.pathId || (pilgrim.state === 'Travelling')) {
      Pilgrim.Screens.Path.render(state);
    } else if (state.lastGameScreen === 'path' && pilgrim.beaconId) {
      Pilgrim.Screens.Arrival.render(state);
    } else {
      Pilgrim.Screens.Beacon.render(state);
    }
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function setActiveTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.toggle('active', tc.id === `tab-${tab}`);
    });
  }

  return { start, renderNow };
})();
