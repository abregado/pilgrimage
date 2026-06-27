import { connect, sendAction } from './network.js';
import { getState, getTab, setTab, getSelectedNurserySeedId, setSelectedNurserySeedId, getSelectedPotId, setSelectedPotId, setSelectedMapLoc, clearSelectedMapLoc, getSelectedMapLocId } from './state.js';
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
        setSelectedMapLoc(locId, btn.dataset.pathId);
      }
      render();
      break;
    }
    case 'walk': {
      sendAction({ type: 'walk', pathId: btn.dataset.pathId });
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
      sendAction({ type: 'continue' });
      break;
    }
    case 'delete_rule': {
      sendAction({ type: 'delete_rule', ruleId: btn.dataset.ruleId });
      break;
    }
    case 'toggle_music': {
      toggleMusic();
      render();
      break;
    }
  }
});

connect();
