import { connect, sendAction } from './network.js';
import { startClockUpdater } from './clock.js';
import {
  getState, getTab, setTab,
  getSelectedNurserySeedId, setSelectedNurserySeedId,
  getSelectedPotId,        setSelectedPotId,
  setSelectedMapLoc,       clearSelectedMapLoc, getSelectedMapLocId,
  getConnected,
  getEmbarkingPathId, getEmbarkingPathIds, getEmbarkChosenSeed,
  startEmbarking, setEmbarkChosenSeed, clearEmbarking,
  setPendingPickSeed,
  clearJourneyLog,
} from './state.js';
import { render, renderFrame } from './render.js';
import { SEED_MAP } from './seeds.js';
import { ensurePlaying, toggleMusic } from './audio.js';
import { initCanvas, onRender, invalidate, getCanvas } from './canvas/engine.js';
import { initTheme, toggleTheme } from './canvas/theme.js';
import { loadAssets } from './canvas/assets.js';
import { initInput } from './canvas/input.js';
import { setInvalidateFn } from './canvas/screens/location.js';

async function boot() {
  // 1. Init theme (loads from localStorage before first paint)
  initTheme();

  // 2. Init canvas (appends <canvas> to body, starts RAF)
  initCanvas();

  // 3. Register render callback with engine
  onRender(renderFrame);

  // 4. Wire invalidate to location.js travel animation
  setInvalidateFn(invalidate);

  // 5. Init input with action dispatcher
  initInput(getCanvas(), dispatch);

  // 6. Load assets
  await loadAssets();

  // 7. Hide loading screen
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 500);
  }

  // 8. Connect to server + start clock
  connect();
  startClockUpdater();

  // 9. First render
  invalidate();
}

function dispatch(action, data = {}) {
  if (action === '__invalidate__') {
    invalidate();
    return;
  }

  ensurePlaying();

  switch (action) {
    case 'tab': {
      setTab(data.tab);
      render();
      break;
    }
    case 'select_nursery_seed': {
      const id = data.seedId || null;
      setSelectedNurserySeedId(id === getSelectedNurserySeedId() ? null : id);
      render();
      break;
    }
    case 'select_pot': {
      const id = data.potId;
      setSelectedPotId(id === getSelectedPotId() ? null : id);
      render();
      break;
    }
    case 'swap': {
      sendAction({ type: 'swap', seedId: data.seedId });
      break;
    }
    case 'decorate': {
      sendAction({ type: 'decorate', potId: data.potId });
      break;
    }
    case 'undecorate': {
      sendAction({ type: 'undecorate', potId: data.potId });
      break;
    }
    case 'pot': {
      const seedId = data.seedId !== undefined ? data.seedId : (getSelectedNurserySeedId() ?? null);
      sendAction({ type: 'pot', potId: data.potId, seedId: seedId || null });
      break;
    }
    case 'select_map_loc': {
      const locId = data.locId;
      if (locId === getSelectedMapLocId()) clearSelectedMapLoc();
      else setSelectedMapLoc(locId);
      render();
      break;
    }
    case 'clear_map_selection': {
      clearSelectedMapLoc();
      render();
      break;
    }
    case 'queue_travel': {
      const pathIds = data.pathIds;
      const st = getState();
      startEmbarking(pathIds[0], st?.gardener?.seed ?? null, pathIds);
      setTab('location');
      render();
      break;
    }
    case 'walk': {
      const st = getState();
      startEmbarking(data.pathId, st?.gardener?.seed ?? null);
      render();
      break;
    }
    case 'select_embark_seed': {
      setEmbarkChosenSeed(data.seedId || null);
      render();
      break;
    }
    case 'embark': {
      const pathId  = getEmbarkingPathId();
      const pathIds = getEmbarkingPathIds();
      const chosenSeed  = getEmbarkChosenSeed();
      const currentSeed = getState()?.gardener?.seed ?? null;
      clearEmbarking();
      if (chosenSeed !== currentSeed) setPendingPickSeed(chosenSeed);
      if (pathIds && pathIds.length > 1) sendAction({ type: 'queue_travel', pathIds });
      else sendAction({ type: 'walk', pathId });
      break;
    }
    case 'embark_dendriport': {
      // Dendriport lands the gardener straight back in 'resting' — there's no
      // 'walking' transition to hang a deferred pick_seed off of (unlike a
      // normal embark), so the carried-seed swap is sent up front instead.
      const pathId  = getEmbarkingPathId();
      const pathIds = getEmbarkingPathIds();
      const chosenSeed  = getEmbarkChosenSeed();
      const currentSeed = getState()?.gardener?.seed ?? null;
      clearEmbarking();
      if (chosenSeed !== currentSeed) sendAction({ type: 'swap', seedId: chosenSeed });
      if (pathIds && pathIds.length > 1) sendAction({ type: 'dendriport_queue', pathIds });
      else sendAction({ type: 'dendriport', pathId });
      break;
    }
    case 'activate_dendriport': {
      sendAction({ type: 'activate_dendriport' });
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
      sendAction({ type: 'take_seed', fromId: data.fromId });
      break;
    }
    case 'continue': {
      clearJourneyLog();
      sendAction({ type: 'continue' });
      break;
    }
    case 'delete_rule': {
      sendAction({ type: 'delete_rule', ruleId: data.ruleId });
      break;
    }
    case 'join': {
      sendAction({ type: 'join' });
      break;
    }
    case 'pick_seed': {
      sendAction({ type: 'pick_seed', seedId: data.seedId });
      break;
    }
    case 'toggle_music': {
      toggleMusic();
      render();
      break;
    }
    case 'toggle_theme': {
      toggleTheme();
      render();
      break;
    }
    case 'delete_pilgrim': {
      if (window.confirm('Delete your Pilgrim permanently? This cannot be undone.')) {
        sendAction({ type: 'delete_pilgrim' });
      }
      break;
    }
  }
}

boot();
