// Canvas meeple renderer

import { getImg } from './assets.js';
import { drawTintedImage } from './draw.js';

const STATE_COLORS = {
  resting:  '#5a8a5c', // jade
  tending:  '#d4a843', // accent
  walking:  '#44527a', // glaze
  arriving: '#44527a', // glaze
  sleeping: '#585864', // stone
};

export function getStateColor(state) {
  return STATE_COLORS[state] ?? '#585864';
}

// Draw a small meeple at (cx, cy) sized w×h
export function drawMeeple(ctx, cx, cy, state = 'resting', w = 22, h = 26) {
  const color = getStateColor(state);
  const img   = getImg('meeple');

  if (img) {
    drawTintedImage(ctx, img, cx - w / 2, cy - h / 2, w, h, color);
    return;
  }

  // Geometric fallback: circle head + body
  ctx.save();
  ctx.fillStyle = color;

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.35, w * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.12);
  ctx.lineTo(cx - w * 0.28, cy + h * 0.3);
  ctx.lineTo(cx + w * 0.28, cy + h * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
