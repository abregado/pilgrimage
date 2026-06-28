import { connect, sendAction } from './network.js';
import { startClockUpdater } from './clock.js';
import { getState, getTab, setTab,
         getSelectedNurserySeedId, setSelectedNurserySeedId,
         getSelectedPotId, setSelectedPotId,
         setSelectedMapLoc, clearSelectedMapLoc, getSelectedMapLocId,
         getConnected,
         getEmbarkingPathId, getEmbarkingPathIds, getEmbarkChosenSeed,
         startEmbarking, setEmbarkChosenSeed, clearEmbarking,
         setPendingPickSeed,
         clearJourneyLog, setAutoArrive } from './state.js';
import { render } from './render.js';
import { SEED_MAP } from './seeds.js';
import { ensurePlaying, toggleMusic } from './audio.js';

// Single delegated click handler — attached once, never removed
document.getElementById('app').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  ensurePlaying();
  const { action } = btn.dataset;

  switch (action) {
    case 'tab': {
      setTab(btn.dataset.tab);
      render();
      break;
    }
    case 'select_nursery_seed': {
      const id = btn.dataset.seedId || null;
      setSelectedNurserySeedId(id === getSelectedNurserySeedId() ? null : id);
      render();
      break;
    }
    case 'select_pot': {
      const id = btn.dataset.potId;
      setSelectedPotId(id === getSelectedPotId() ? null : id);
      render();
      break;
    }
    case 'swap': {
      sendAction({ type: 'swap', seedId: btn.dataset.seedId });
      break;
    }
    case 'decorate': {
      sendAction({ type: 'decorate', potId: btn.dataset.potId });
      break;
    }
    case 'undecorate': {
      sendAction({ type: 'undecorate', potId: btn.dataset.potId });
      break;
    }
    case 'pot': {
      sendAction({ type: 'pot', potId: btn.dataset.potId, seedId: btn.dataset.seedId || getSelectedNurserySeedId() || null });
      break;
    }
    case 'select_map_loc': {
      const locId = btn.dataset.locId;
      if (locId === getSelectedMapLocId()) {
        clearSelectedMapLoc();
      } else {
        setSelectedMapLoc(locId);
      }
      render();
      break;
    }
    case 'queue_travel': {
      const pathIds = JSON.parse(btn.dataset.pathIds);
      const st = getState();
      startEmbarking(pathIds[0], st?.gardener?.seed ?? null, pathIds);
      setTab('location');
      render();
      break;
    }
    case 'walk': {
      // Enter embark mode instead of walking immediately
      const st = getState();
      startEmbarking(btn.dataset.pathId, st?.gardener?.seed ?? null);
      render();
      break;
    }
    case 'select_embark_seed': {
      setEmbarkChosenSeed(btn.dataset.seedId || null);
      render();
      break;
    }
    case 'embark': {
      const pathId = getEmbarkingPathId();
      const pathIds = getEmbarkingPathIds();
      const chosenSeed = getEmbarkChosenSeed();
      const currentSeed = getState()?.gardener?.seed ?? null;
      clearEmbarking();
      if (chosenSeed !== currentSeed) {
        setPendingPickSeed(chosenSeed);
      }
      if (pathIds && pathIds.length > 1) {
        sendAction({ type: 'queue_travel', pathIds });
      } else {
        sendAction({ type: 'walk', pathId });
      }
      break;
    }
    case 'embark_fast': {
      const pathId = getEmbarkingPathId();
      const pathIds = getEmbarkingPathIds();
      const chosenSeed = getEmbarkChosenSeed();
      const currentSeed = getState()?.gardener?.seed ?? null;
      clearEmbarking();
      if (chosenSeed !== currentSeed) {
        setPendingPickSeed(chosenSeed);
      }
      if (pathIds && pathIds.length > 1) {
        sendAction({ type: 'queue_travel', pathIds, fast: true });
      } else {
        sendAction({ type: 'walk', pathId, fast: true });
      }
      break;
    }
    case 'activate_fast_travel': {
      sendAction({ type: 'activate_fast_travel' });
      break;
    }
    case 'cancel_embark': {
      clearEmbarking();
      render();
      break;
    }
    case 'reverse': {
      sendAction({ type: 'reverse' });
      break;
    }
    case 'take_seed': {
      sendAction({ type: 'take_seed', fromId: btn.dataset.fromId });
      break;
    }
    case 'continue': {
      clearJourneyLog();
      sendAction({ type: 'continue' });
      break;
    }
    case 'delete_rule': {
      sendAction({ type: 'delete_rule', ruleId: btn.dataset.ruleId });
      break;
    }
    case 'join': {
      sendAction({ type: 'join' });
      break;
    }
    case 'pick_seed': {
      sendAction({ type: 'pick_seed', seedId: btn.dataset.seedId });
      break;
    }
    case 'toggle_music': {
      toggleMusic();
      render();
      break;
    }
    case 'toggle_auto_arrive': {
      setAutoArrive(!btn.classList.contains('active'));
      render();
      break;
    }
    case 'delete_pilgrim': {
      if (window.confirm('Delete your Pilgrim permanently? This cannot be undone. Your decorations will also be removed.')) {
        sendAction({ type: 'delete_pilgrim' });
      }
      break;
    }
  }
});

connect();
startClockUpdater();
