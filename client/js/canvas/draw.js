// Drawing primitives for the canvas renderer

export function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function strokeRect(ctx, x, y, w, h, color, lw = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function roundRect(ctx, x, y, w, h, r, fill, stroke = null, lw = 1) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  if (fill)   { ctx.fillStyle = fill;     ctx.fill();   }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function drawCircle(ctx, cx, cy, r, fill = null, stroke = null, lw = 1) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fill)   { ctx.fillStyle = fill;     ctx.fill();   }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function drawLine(ctx, x1, y1, x2, y2, color, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export function drawText(ctx, text, x, y, opts = {}) {
  const {
    font      = '14px Lora, Georgia, serif',
    color     = '#e8e4d0',
    align     = 'left',
    baseline  = 'alphabetic',
    maxWidth,
  } = opts;
  ctx.font         = font;
  ctx.fillStyle    = color;
  ctx.textAlign    = align;
  ctx.textBaseline = baseline;
  if (maxWidth !== undefined) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

export function measureText(ctx, text, font) {
  ctx.font = font;
  return ctx.measureText(text).width;
}

// Returns total height drawn
export function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, opts = {}) {
  const { font = '14px Lora, Georgia, serif', color = '#e8e4d0', align = 'left' } = opts;
  ctx.font         = font;
  ctx.fillStyle    = color;
  ctx.textAlign    = align;
  ctx.textBaseline = 'alphabetic';

  const words = text.split(' ');
  let line    = '';
  let curY    = y;

  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line  = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineHeight; }
  return curY - y;
}

export function drawImage(ctx, img, x, y, w, h) {
  if (!img) return;
  ctx.drawImage(img, x, y, w, h);
}

export function drawImageCentered(ctx, img, cx, cy, w, h) {
  if (!img) return;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// Draw img centered at (cx, cy), mirrored horizontally when flip is true —
// used for directional sprites (e.g. the pilgrim) that face right by default.
export function drawImageFlipped(ctx, img, cx, cy, w, h, flip = false) {
  if (!img) return;
  ctx.save();
  if (flip) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }
  ctx.restore();
}

// Draw img tinted with color using compositing
export function drawTintedImage(ctx, img, x, y, w, h, color) {
  if (!img) return;
  ctx.save();
  const offscreen = document.createElement('canvas');
  offscreen.width  = w;
  offscreen.height = h;
  const oc = offscreen.getContext('2d');
  oc.drawImage(img, 0, 0, w, h);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = color;
  oc.fillRect(0, 0, w, h);
  ctx.drawImage(offscreen, x, y);
  ctx.restore();
}

export function withClip(ctx, x, y, w, h, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

// Clip to rect, translate so content starts at (0,0) within the region
// content is scrolled by scrollY
export function withScroll(ctx, x, y, w, h, scrollY, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y - scrollY);
  fn();
  ctx.restore();
}

export function alpha(hex, a) {
  // Converts hex color to rgba with alpha
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function linearGradient(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  return g;
}
