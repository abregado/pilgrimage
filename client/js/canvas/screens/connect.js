// Canvas connect / join screen renderer

import { getTheme } from '../../canvas/theme.js';
import { getImg } from '../../canvas/assets.js';
import { fillRect, roundRect, drawText, drawWrappedText } from '../../canvas/draw.js';
import { hit, beginFrame } from '../../canvas/input.js';
import { getConnected } from '../../state.js';
import { pulse } from '../../canvas/anim.js';

const CARD_W        = 380;
const EXPLANATION   = 'Travel between gardens, plant seeds, tend pots. Complete visions to grow your legend.';
const TITLE_FONT    = 'italic bold 44px Lora, Georgia, serif';
const BODY_FONT     = '14px Lora, Georgia, serif';

export function renderConnect(ctx, W, H) {
  beginFrame();
  const T         = getTheme();
  const connected = getConnected();

  // ── Background ─────────────────────────────────────────────────────────────
  fillRect(ctx, 0, 0, W, H, T.bg);

  const bgImg = getImg('connect-bg');
  if (bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const iw    = bgImg.width  * scale;
    const ih    = bgImg.height * scale;
    ctx.globalAlpha = 0.12;
    ctx.drawImage(bgImg, (W - iw) / 2, (H - ih) / 2, iw, ih);
    ctx.globalAlpha = 1;
  }

  // ── Drifting leaf particles ─────────────────────────────────────────────────
  // Five circles drift downward at slightly different speeds using performance.now()
  const now = performance.now();
  for (let i = 0; i < 5; i++) {
    const phase  = i * 1.73;
    const xBase  = W * (0.08 + i * 0.19);
    const speed  = 0.022 + i * 0.007;
    const leafY  = ((now * speed + phase * 180) % (H + 48)) - 24;
    const leafX  = xBase + Math.sin(now * 0.0009 + phase) * 22;
    const leafA  = 0.20 + Math.abs(Math.sin(now * 0.0013 + phase)) * 0.13;
    ctx.globalAlpha = leafA;
    ctx.beginPath();
    ctx.arc(leafX, leafY, 6, 0, Math.PI * 2);
    ctx.fillStyle = T.jade;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Card ───────────────────────────────────────────────────────────────────
  const cardW  = Math.min(CARD_W, W - 32);
  const cardH  = connected ? 308 : 246;
  const cardX  = Math.round((W - cardW) / 2);
  const cardY  = Math.round((H - cardH) / 2);
  const cx     = W / 2;

  roundRect(ctx, cardX, cardY, cardW, cardH, 12, T.surface, T.border, 1);

  // ── Title "Verdant" with shimmer sweep ─────────────────────────────────────
  // titleY is the alphabetic baseline of the 44px title text
  const titleY = cardY + 28 + 44;

  ctx.font         = TITLE_FONT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  // Base pass in accent color
  ctx.fillStyle = T.accent;
  ctx.fillText('Verdant', cx, titleY);

  // Shimmer overlay: a narrow band sweeps left → right over 6 s
  const shimmerT = pulse(6000);
  const bandCx   = cardX - 30 + (cardW + 60) * shimmerT;
  ctx.save();
  ctx.beginPath();
  ctx.rect(bandCx - 28, titleY - 46, 56, 54);
  ctx.clip();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#fff4c0';
  ctx.fillText('Verdant', cx, titleY);
  ctx.restore();

  // ── Subtitle ───────────────────────────────────────────────────────────────
  let y = titleY + 16;
  const subText = connected ? 'Ready to begin' : 'Connecting…';
  drawText(ctx, subText, cx, y, {
    font:     BODY_FONT,
    color:    T.muted,
    align:    'center',
    baseline: 'top',
  });
  y += 28;

  // ── Explanation text ───────────────────────────────────────────────────────
  const wrapW  = cardW - 40;
  const textH  = drawWrappedText(ctx, EXPLANATION, cx, y, wrapW, 22, {
    font:  BODY_FONT,
    color: T.muted,
    align: 'center',
  });
  y += textH + 18;

  // ── "Become a Pilgrim" button ──────────────────────────────────────────────
  if (connected) {
    const btnW = 200;
    const btnH = 48;
    const btnX = Math.round(cx - btnW / 2);
    const btnY = Math.round(y);

    roundRect(ctx, btnX, btnY, btnW, btnH, 8, T.accent);
    drawText(ctx, 'Become a Pilgrim', cx, btnY + btnH / 2, {
      font:     'bold 15px Lora, Georgia, serif',
      color:    T.bg,
      align:    'center',
      baseline: 'middle',
    });
    hit(btnX, btnY, btnW, btnH, 'join');
  }
}
