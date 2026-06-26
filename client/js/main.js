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
    case 'delete_rule': {
      sendAction({ type: 'delete_rule', ruleId: btn.dataset.ruleId });
      break;
    }
  }
});

connect();
