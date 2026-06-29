import { getScreen } from './state.js';
import { invalidate } from './canvas/engine.js';
import { beginFrame } from './canvas/input.js';
import { tickAnims } from './canvas/anim.js';
import { renderConnect }  from './canvas/screens/connect.js';
import { renderArrival }  from './canvas/screens/arrival.js';
import { renderLocation } from './canvas/screens/location.js';

export function render() {
  invalidate();
}

// Called by the engine on each dirty frame
export function renderFrame(ctx, W, H) {
  beginFrame();
  tickAnims(performance.now());

  const screen = getScreen();
  if (screen === 'connect')       renderConnect(ctx, W, H);
  else if (screen === 'arrival')  renderArrival(ctx, W, H);
  else                            renderLocation(ctx, W, H);
}
