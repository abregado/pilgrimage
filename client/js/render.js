window.Pilgrim = window.Pilgrim || {};

Pilgrim.Render = (() => {
  let _rafId = null;
  let _lastSecond = 0;

  function start() {
    Pilgrim.State.subscribe(() => renderNow());
    // Single delegated handler for all game-tab actions — avoids stacking on re-render
    document.getElementById('tab-game').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, altar, ideal, path, pilgrim } = btn.dataset;
      const net = Pilgrim.Network;
      switch (action) {
        case 'pray':         net.sendAction({ type: 'PRAY',          altarId:  altar });   break;
        case 'change-altar': net.sendAction({ type: 'CHANGE_ALTAR',  altarId:  altar });   break;
        case 'take-ideal':   net.sendAction({ type: 'TAKE_CORE_IDEAL', idealId: ideal }); break;
        case 'undo-ideal':   net.sendAction({ type: 'UNDO_TAKE_IDEAL' });                  break;
        case 'travel':       net.sendAction({ type: 'BEGIN_TRAVEL',  pathId:   path });    break;
        case 'reverse':      net.sendAction({ type: 'REVERSE_DIRECTION' });                break;
        case 'swap':         net.sendAction({ type: 'SWAP_IDEAL',    pilgrimId: pilgrim }); break;
        case 'arrival-ok':   Pilgrim.State.clearArrival();                                 break;
      }
    });
    loop();
  }

  function loop() {
    const now = Date.now();
    const second = Math.floor(now / 1000);
    if (second !== _lastSecond) {
      _lastSecond = second;
      renderNow();
    }
    _rafId = requestAnimationFrame(loop);
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
