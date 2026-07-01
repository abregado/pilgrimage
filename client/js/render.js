import { getScreen, getLastError } from './state.js';
import { invalidate } from './canvas/engine.js';
import { beginFrame } from './canvas/input.js';
import { tickAnims } from './canvas/anim.js';
import { roundRect, drawText } from './canvas/draw.js';
import { getTheme } from './canvas/theme.js';
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

  _drawErrorBanner(ctx, W);
}

// Transient banner for a rejected optimistic prediction — drawn on top of
// whichever screen is active, since it can fire from any of them.
function _drawErrorBanner(ctx, W) {
  const err = getLastError();
  if (!err) return;
  const T = getTheme();

  const font = 'bold 12px Lora, Georgia, serif';
  ctx.font = font;
  const textW = ctx.measureText(err.message).width;
  const boxW  = Math.min(W - 24, textW + 32);
  const boxH  = 32;
  const x = (W - boxW) / 2;
  const y = 10;

  roundRect(ctx, x, y, boxW, boxH, 8, T.danger, null, 0);
  drawText(ctx, err.message, W / 2, y + boxH / 2 + 1, {
    font, color: T.bg, align: 'center', baseline: 'middle', maxWidth: boxW - 16,
  });
}
