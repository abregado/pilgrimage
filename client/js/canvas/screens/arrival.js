// Canvas arrival screen renderer

import { getTheme } from '../../canvas/theme.js';
import { getImg } from '../../canvas/assets.js';
import { fillRect, roundRect, drawText, drawCircle } from '../../canvas/draw.js';
import { hit, beginScrollRegion, endScrollRegion, getScrollY, beginFrame } from '../../canvas/input.js';
import { getState } from '../../state.js';
import { SEED_MAP } from '../../seeds.js';
import { LOCATION_MAP, PATH_MAP } from '../../world.js';
import { startAnim, getAnimT, getAnimSpring } from '../../canvas/anim.js';
import { formatDuration } from '../../utils.js'; // available for future use

// Track last arrival so entrance animations only fire once per destination
let _lastArrivalId = null;

// State color for meeple dots
function _stateColor(state, T) {
  if (state === 'walking') return T.jade;
  if (state === 'arriving') return T.accent;
  return T.stone;
}

export function renderArrival(ctx, W, H) {
  beginFrame();
  const T     = getTheme();
  const state = getState();

  if (!state?.arrival) {
    fillRect(ctx, 0, 0, W, H, T.bg);
    return;
  }

  const { arrival, gardener, record } = state;

  // ── Fire entrance animations on new arrival location ──────────────────────
  if (arrival.locationId !== _lastArrivalId) {
    _lastArrivalId = arrival.locationId;
    startAnim('arrival-name', 400);
    startAnim('arrival-seed', 550);
  }

  // ── Layout constants ───────────────────────────────────────────────────────
  const cx        = W / 2;
  const contentW  = Math.min(W - 32, 480);
  const leftEdge  = Math.round((W - contentW) / 2);

  const encounters       = arrival.encounters ?? [];
  const wanderings       = record?.wanderings  ?? [];
  const recentWanderings = wanderings.slice().reverse().slice(0, 10);

  // Resolve travelQueue path IDs → destination location IDs
  const queuedLocIds = [];
  if (gardener.travelQueue?.length > 0) {
    let prevId = arrival.locationId;
    for (const pathId of gardener.travelQueue) {
      const p = PATH_MAP[pathId];
      if (!p) break;
      const dest = p.fromId === prevId ? p.toId : p.fromId;
      queuedLocIds.push(dest);
      prevId = dest;
    }
  }

  // Find the seed whose home is this location
  const originSeed = Object.values(SEED_MAP).find(s => s.locationId === arrival.locationId) ?? null;

  // ── Pre-compute total content height ───────────────────────────────────────
  let contentH = 0;
  contentH += 20;                             // top padding
  contentH += 20 + 12;                        // "Arrived at" label + gap
  contentH += 36 + 16;                        // location name + gap
  if (originSeed) {
    contentH += 56;                           // seed icon (48px diameter + 8)
    contentH += 24 + 16;                      // seed name + gap
  }
  contentH += 48 + 16;                        // top Continue button + gap
  if (encounters.length > 0) {
    contentH += 1 + 12;                       // divider + gap
    contentH += 24 + 4;                       // section header + gap
    contentH += encounters.length * 56;       // encounter rows
    contentH += 12;                           // section tail gap
  }
  if (recentWanderings.length > 0) {
    contentH += 1 + 12;
    contentH += 24 + 4;
    contentH += recentWanderings.length * 28;
    contentH += 12;
  }
  if (queuedLocIds.length > 0) {
    contentH += 1 + 12;
    contentH += 24 + 4;
    contentH += queuedLocIds.length * 28;
    contentH += 12;
  }
  contentH += 1 + 16;                         // bottom divider + gap
  contentH += 48 + 28;                        // bottom Continue button + bottom padding

  // ── Background (outside scroll region, always covers viewport) ────────────
  fillRect(ctx, 0, 0, W, H, T.bg);

  const scrollY = getScrollY('arrival');

  beginScrollRegion('arrival', 0, 0, W, H, contentH);

  // ── Scrollable content ────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.translate(0, -scrollY);

  let y = 20;

  // "Arrived at" label
  drawText(ctx, 'Arrived at', cx, y, {
    font:     '13px Lora, Georgia, serif',
    color:    T.muted,
    align:    'center',
    baseline: 'top',
  });
  y += 20 + 12;

  // Location name — fades/rises in on first view
  const nameT = getAnimT('arrival-name');
  ctx.save();
  ctx.globalAlpha = nameT;
  ctx.translate(0, Math.round((1 - nameT) * 10));
  drawText(ctx, arrival.locationName, cx, y, {
    font:     'bold 26px Lora, Georgia, serif',
    color:    T.text,
    align:    'center',
    baseline: 'top',
  });
  ctx.restore();
  y += 36 + 16;

  // ── Origin seed icon ───────────────────────────────────────────────────────
  if (originSeed) {
    const seedScale = getAnimSpring('arrival-seed');
    const iconR     = 24; // 48px diameter
    const iconCY    = y + iconR;
    const seedImg   = getImg('seed_' + originSeed.id);

    ctx.save();
    ctx.translate(cx, iconCY);
    ctx.scale(seedScale, seedScale);

    ctx.beginPath();
    ctx.arc(0, 0, iconR, 0, Math.PI * 2);
    ctx.fillStyle = originSeed.color;
    ctx.fill();

    if (seedImg) {
      ctx.drawImage(seedImg, -16, -16, 32, 32);
    } else {
      // Symbol fallback
      ctx.font         = '18px Lora, Georgia, serif';
      ctx.fillStyle    = '#ffffff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(originSeed.symbol, 0, 0);
    }
    ctx.restore();
    y += 56;

    // Seed name in its own color
    drawText(ctx, originSeed.name, cx, y, {
      font:     '13px Lora, Georgia, serif',
      color:    originSeed.color,
      align:    'center',
      baseline: 'top',
    });
    y += 24 + 16;
  }

  // ── Helper for section dividers ────────────────────────────────────────────
  function drawDivider(dy) {
    ctx.beginPath();
    ctx.moveTo(leftEdge, dy);
    ctx.lineTo(leftEdge + contentW, dy);
    ctx.strokeStyle = T.border;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Top Continue button ────────────────────────────────────────────────────
  const btnW = 220;
  const btnH = 48;
  const btnX = Math.round(cx - btnW / 2);

  roundRect(ctx, btnX, y, btnW, btnH, 8, T.accent);
  drawText(ctx, 'Continue →', cx, y + btnH / 2, {
    font:     'bold 15px Lora, Georgia, serif',
    color:    T.bg,
    align:    'center',
    baseline: 'middle',
  });
  hit(btnX, y, btnW, btnH, 'continue');
  y += btnH + 16;

  // ── Encounters ─────────────────────────────────────────────────────────────
  if (encounters.length > 0) {
    drawDivider(y); y += 12;

    drawText(ctx, 'ON YOUR JOURNEY', cx, y, {
      font:     '11px Lora, Georgia, serif',
      color:    T.muted,
      align:    'center',
      baseline: 'top',
    });
    y += 24 + 4;

    for (const enc of encounters) {
      const encSeed   = enc.seed ? SEED_MAP[enc.seed] : null;
      const encColor  = encSeed?.color ?? T.stone;
      const rowMidY   = y + 28; // vertical centre of the row

      // Meeple dot: 12px diameter = 6px radius
      const meepleX = leftEdge + 20;
      drawCircle(ctx, meepleX, rowMidY, 6, _stateColor(enc.state, T));

      // Seed colour circle: 16px diameter = 8px radius
      const seedDotX = meepleX + 6 + 14 + 8; // after meeple + gap
      drawCircle(ctx, seedDotX, rowMidY, 8, encColor);

      const encSeedImg = enc.seed ? getImg('seed_' + enc.seed) : null;
      if (encSeedImg) {
        ctx.drawImage(encSeedImg, seedDotX - 6, rowMidY - 6, 12, 12);
      }

      // Seed name
      const nameX        = seedDotX + 8 + 10;
      const encSeedName  = encSeed ? encSeed.name : 'Carrying nothing';
      drawText(ctx, encSeedName, nameX, rowMidY - 7, {
        font:     '13px Lora, Georgia, serif',
        color:    T.text,
        align:    'left',
        baseline: 'top',
      });

      // "Take Seed" button: shown only when encounter has a different seed
      if (enc.seed && enc.seed !== gardener.seed) {
        const tbW = 82;
        const tbH = 30;
        const tbX = leftEdge + contentW - tbW - 4;
        const tbY = rowMidY - tbH / 2;

        roundRect(ctx, tbX, tbY, tbW, tbH, 6, T.jade);
        drawText(ctx, 'Take Seed', tbX + tbW / 2, tbY + tbH / 2, {
          font:     '11px Lora, Georgia, serif',
          color:    '#fff',
          align:    'center',
          baseline: 'middle',
        });
        hit(tbX, tbY, tbW, tbH, 'take_seed', { fromId: enc.id });
      }

      y += 56;
    }
    y += 12;
  }

  // ── Journey log ────────────────────────────────────────────────────────────
  if (recentWanderings.length > 0) {
    drawDivider(y); y += 12;

    drawText(ctx, 'YOUR JOURNEY', cx, y, {
      font:     '11px Lora, Georgia, serif',
      color:    T.muted,
      align:    'center',
      baseline: 'top',
    });
    y += 24 + 4;

    for (const locId of recentWanderings) {
      const loc = LOCATION_MAP[locId];

      // Small bullet
      drawCircle(ctx, leftEdge + 12, y + 8, 3, T.muted);

      drawText(ctx, loc ? loc.name : locId, leftEdge + 24, y, {
        font:     '13px Lora, Georgia, serif',
        color:    T.text,
        align:    'left',
        baseline: 'top',
      });
      y += 28;
    }
    y += 12;
  }

  // ── Ahead (travel queue) ───────────────────────────────────────────────────
  if (queuedLocIds.length > 0) {
    drawDivider(y); y += 12;

    drawText(ctx, 'AHEAD', cx, y, {
      font:     '11px Lora, Georgia, serif',
      color:    T.muted,
      align:    'center',
      baseline: 'top',
    });
    y += 24 + 4;

    for (const locId of queuedLocIds) {
      const loc = LOCATION_MAP[locId];

      // Hollow bullet for queued stops
      ctx.beginPath();
      ctx.arc(leftEdge + 12, y + 8, 3, 0, Math.PI * 2);
      ctx.strokeStyle = T.muted;
      ctx.lineWidth   = 1;
      ctx.stroke();

      drawText(ctx, loc ? loc.name : locId, leftEdge + 24, y, {
        font:     '13px Lora, Georgia, serif',
        color:    T.muted,
        align:    'left',
        baseline: 'top',
      });
      y += 28;
    }
    y += 12;
  }

  // ── Bottom Continue button ─────────────────────────────────────────────────
  drawDivider(y); y += 16;

  roundRect(ctx, btnX, y, btnW, btnH, 8, T.accent);
  drawText(ctx, 'Continue →', cx, y + btnH / 2, {
    font:     'bold 15px Lora, Georgia, serif',
    color:    T.bg,
    align:    'center',
    baseline: 'middle',
  });
  hit(btnX, y, btnW, btnH, 'continue');

  ctx.restore();

  endScrollRegion();
}
