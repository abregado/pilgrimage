import { connect, sendAction } from './network.js';
import { getState, getTab, setTab } from './state.js';
import { render } from './render.js';
import { SEED_MAP } from './seeds.js';

// Single delegated click handler — attached once, never removed
document.getElementById('app').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action } = btn.dataset;

  switch (action) {
    case 'tab': {
      setTab(btn.dataset.tab);
      render();
      break;
    }
    case 'take_origin': {
      sendAction({ type: 'take_origin' });
      break;
    }
    case 'undo_take': {
      sendAction({ type: 'undo_take' });
      break;
    }
    case 'sing': {
      sendAction({ type: 'sing', potId: btn.dataset.potId });
      break;
    }
    case 'pot': {
      sendAction({ type: 'pot', potId: btn.dataset.potId });
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
  }
});

connect();
