// Middle column renderer — pots wheel + pot detail + nursery (resting)
//                         or travel scene + controls (walking)
// Width: 300px.

import { fillRect, strokeRect, roundRect, drawCircle, drawLine,
         drawText, measureText, drawWrappedText, drawImage, drawImageFlipped, withScroll, alpha } from '../draw.js';
import { hit, hitCircle, beginScrollRegion, endScrollRegion, getScrollY } from '../input.js';
import { pulse, bob } from '../anim.js';
import { getTheme } from '../theme.js';
import { getImg } from '../assets.js';
import { getSelectedPotId, getSelectedNurserySeedId } from '../../state.js';
import { SEED_MAP } from '../../seeds.js';
import { liveTick } from '../../clock.js';
import { formatDuration } from '../../utils.js';
import { getGrowthStage, timeToNextStage, potEnergyCost } from '../../growth.js';
import { FAST_TRAVEL_COST } from '/js/constants.js';
import { drawMeeple } from '../meeple.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function _stageColor(stage, T) {
  switch (stage) {
    case 'seedling': return T.jade;
    case 'grown':    return T.moss;
    case 'fruiting': return T.accent;
    case 'dead':     return T.danger;
    default:         return T.muted;
  }
}

// Draw a simple pill badge
function _drawPill(ctx, text, cx, y, T, fillColor, textColor) {
  ctx.font = 'bold 10px Lora, Georgia, serif';
  const tw = ctx.measureText(text).width;
  const pw = tw + 10;
  const ph = 14;
  roundRect(ctx, cx - pw / 2, y, pw, ph, 7, fillColor, null, 0);
  drawText(ctx, text, cx, y + ph / 2 + 1, {
    font:     'bold 10px Lora, Georgia, serif',
    color:    textColor,
    align:    'center',
    baseline: 'middle',
  });
  return pw;
}

// Draw a rectangular button, return its height
function _drawButton(ctx, label, x, y, w, fillColor, textColor) {
  const BH = 28;
  roundRect(ctx, x, y, w, BH, 6, fillColor, null, 0);
  drawText(ctx, label, x + w / 2, y + BH / 2 + 1, {
    font:     '12px Lora, Georgia, serif',
    color:    textColor,
    align:    'center',
    baseline: 'middle',
  });
  return BH;
}

// Vertical offset of the pots-wheel centre from the top of the column —
// shared with _drawPotDrawer so the drawer sits directly below the wheel.
const WHEEL_CY_OFFSET = 172;

// ── Energy bar (top of Location/Travel views) ──────────────────────────────

function _drawEnergyRow(ctx, col, y, gardener, tick, T) {
  const energy    = gardener.energy    ?? 0;
  const energyMax = gardener.energyMax ?? 0;
  const energyRegenAt = gardener.energyRegenAt ?? null;

  const pipR = 4, pipStep = 11;
  const pipsW = energyMax * pipStep;
  const labelText = `${energy}/${energyMax}`;
  const labelFont = '11px Lora, Georgia, serif';
  const labelW = measureText(ctx, labelText, labelFont);

  let regenText = '';
  let regenW = 0;
  const regenFont = 'italic 10px Lora, Georgia, serif';
  if (energyRegenAt !== null && energy < energyMax) {
    const secs = Math.max(0, energyRegenAt - tick);
    regenText = `+1 in ${formatDuration(secs)}`;
    regenW = measureText(ctx, regenText, regenFont) + 6;
  }

  const totalW = pipsW + 4 + labelW + regenW;
  let x = col.x + (col.w - totalW) / 2;

  let pipX = x + pipR;
  for (let i = 0; i < energyMax; i++) {
    const filled = i < energy;
    drawCircle(ctx, pipX, y, pipR, filled ? T.jade : T.surface2, T.border, 1);
    pipX += pipStep;
  }
  x += pipsW + 4;

  drawText(ctx, labelText, x, y, {
    font: labelFont, color: T.muted, align: 'left', baseline: 'middle',
  });
  x += labelW;

  if (regenText) {
    drawText(ctx, regenText, x + 6, y, {
      font: regenFont, color: T.accent, align: 'left', baseline: 'middle',
    });
  }
}

// Small meeple row + count for who's physically at this location right now
// (self + location.otherGardeners), right-aligned in the header.
function _drawPopulationRow(ctx, col, y, gardener, otherGardeners, T) {
  const states = [gardener.state, ...otherGardeners.map(g => g.state)];
  const count = states.length;

  const dotW = 9, dotGap = 2, maxDots = 4;
  const shown = Math.min(count, maxDots);
  const dotsW = shown * dotW + Math.max(0, shown - 1) * dotGap;

  const countText = String(count);
  const countFont = 'bold 11px Lora, Georgia, serif';
  const countW = measureText(ctx, countText, countFont);

  const totalW = dotsW + (shown > 0 ? 6 : 0) + countW;
  let x = col.x + col.w - 10 - totalW;

  for (let i = 0; i < shown; i++) {
    drawMeeple(ctx, x + dotW / 2, y, states[i], dotW, dotW * 1.25);
    x += dotW + dotGap;
  }
  if (shown > 0) x += 6;

  drawText(ctx, countText, x, y, {
    font: countFont, color: T.muted, align: 'left', baseline: 'middle',
  });
}

// ── Resting: pots wheel ───────────────────────────────────────────────────────

function _drawPotsWheel(ctx, col, pots, tick, selectedPotId, T) {
  const cx = col.x + col.w / 2;
  const cy = col.y + WHEEL_CY_OFFSET;
  const R  = 90;   // orbit radius
  const PR = 38;   // pot circle radius
  const n  = pots.length;

  for (let i = 0; i < n; i++) {
    const pot   = pots[i];
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    const px    = cx + Math.cos(angle) * R;
    const py    = cy + Math.sin(angle) * R;

    const isSel = pot.id === selectedPotId;

    // No default background/outline. A ring is only drawn to indicate
    // selection (solid accent) or settling (dashed), never both filled.
    if (pot.settlingUntil !== null) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      drawCircle(ctx, px, py, PR, null, isSel ? T.glaze : T.border, isSel ? 2 : 1.5);
      ctx.setLineDash([]);
      ctx.restore();
    } else if (isSel) {
      drawCircle(ctx, px, py, PR, null, T.glaze, 2);
    }

    // Plant image
    const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;
    const imgKey = stage ? `${pot.seedId}_${stage}` : 'empty_pot';
    const img = getImg(imgKey);
    if (img) {
      drawImage(ctx, img, px - 32, py - 32, 64, 64);
    }

    // Seed overlay (small icon at 6 o'clock / bottom of pot)
    if (pot.seedId) {
      const seedImg = getImg(`seed_${pot.seedId}`);
      if (seedImg) drawImage(ctx, seedImg, px - 10, py + PR - 14, 20, 20);
    }

    // Decorator dots (small circles around pot at radius 48)
    if (pot.decoratorCount > 0) {
      const dotR    = 48;
      const dotSize = 6;
      for (let d = 0; d < pot.decoratorCount; d++) {
        const da = (2 * Math.PI * d / pot.decoratorCount) - Math.PI / 2;
        const dx = px + Math.cos(da) * dotR;
        const dy = py + Math.sin(da) * dotR;
        const isMe = pot.iDecorated && d === pot.decoratorCount - 1;
        drawCircle(ctx, dx, dy, dotSize / 2,
          isMe ? T.accent : alpha(T.muted, 0.6), null, 0);
      }
    }

    // Hit region — square bounding the circle, with _circle for precision
    hit(px - PR, py - PR, PR * 2, PR * 2,
      'select_pot', { potId: pot.id, _circle: { cx: px, cy: py, r: PR } });
  }
}

// ── Resting: pot drawer ───────────────────────────────────────────────────────

const DRAWER_PAD = 10;

function _drawPotDrawer(ctx, col, pot, tick, gardener, selectedNurserySeedId, T) {
  const drawerX = col.x + DRAWER_PAD;
  const drawerW = col.w - DRAWER_PAD * 2;
  // top of drawer: wheel centre y + orbit R + pot R + gap
  const drawerY = col.y + WHEEL_CY_OFFSET + 90 + 38 + 16;

  let curY = drawerY + DRAWER_PAD;

  if (!pot) {
    // No pot selected — placeholder
    drawText(ctx, 'Tap a pot', col.x + col.w / 2, drawerY + 30, {
      font:  '13px Lora, Georgia, serif',
      color: T.muted,
      align: 'center',
      baseline: 'middle',
    });
    return drawerY + 50;
  }

  const stage = pot.seedId ? getGrowthStage(pot.lastPlantedTick, tick) : null;
  const next  = pot.seedId ? timeToNextStage(pot.lastPlantedTick, tick) : null;
  const cost  = potEnergyCost(pot, tick);

  // Card background
  const cardH = pot.seedId ? 110 : 60;
  roundRect(ctx, drawerX, drawerY, drawerW, cardH + 20, 8, T.surface, T.border, 1);

  if (pot.seedId) {
    const seed      = SEED_MAP[pot.seedId];
    const seedColor = seed?.color ?? T.muted;
    const seedName  = seed?.name  ?? pot.seedId;

    // Color dot + seed name
    drawCircle(ctx, drawerX + DRAWER_PAD + 6, curY + 5, 6, seedColor, null, 0);
    drawText(ctx, seedName, drawerX + DRAWER_PAD + 18, curY + 6, {
      font:  '500 13px Lora, Georgia, serif',
      color: T.text,
      align: 'left',
    });
    curY += 18;

    // Stage badge
    if (stage) {
      const stageColor = _stageColor(stage, T);
      const stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1);
      _drawPill(ctx, stageLabel, drawerX + DRAWER_PAD + 30, curY, T, alpha(stageColor, 0.25), stageColor);
      curY += 18;
    }

    // Next stage countdown
    if (next) {
      drawText(ctx, `${next.next} in ${formatDuration(next.remaining)}`, drawerX + DRAWER_PAD, curY + 11, {
        font:  '11px Lora, Georgia, serif',
        color: T.muted,
        align: 'left',
        baseline: 'middle',
      });
      curY += 16;
    }

    // Settling
    if (pot.settlingUntil !== null) {
      const rem = Math.max(0, pot.settlingUntil - tick);
      drawText(ctx, `settling ${formatDuration(rem)}`, drawerX + DRAWER_PAD, curY + 11, {
        font:  '11px Lora, Georgia, serif',
        color: T.stone,
        align: 'left',
        baseline: 'middle',
      });
      curY += 16;
    }

    // Decorator count
    drawText(ctx, `${pot.decoratorCount} decorators`, drawerX + DRAWER_PAD, curY + 11, {
      font:  '11px Lora, Georgia, serif',
      color: T.muted,
      align: 'left',
      baseline: 'middle',
    });
    curY += 16;
  } else {
    drawText(ctx, 'Empty', drawerX + DRAWER_PAD, curY + 11, {
      font:  'italic 13px Lora, Georgia, serif',
      color: T.muted,
      align: 'left',
      baseline: 'middle',
    });
    curY += 18;
  }

  // ── Action buttons (resting only) ──────────────────────────────────────────
  if (gardener.state === 'resting') {
    const btnX = drawerX;
    const btnW = drawerW;

    // Plant button
    if (selectedNurserySeedId && pot.settlingUntil === null) {
      const seed = SEED_MAP[selectedNurserySeedId];
      const sName = seed?.name ?? selectedNurserySeedId;
      const canAfford = (gardener.energy ?? 0) >= cost;
      const btnFill = canAfford ? T.accent : T.stone;
      const label = `Plant ${sName} · ${cost} energy`;
      curY += 6;
      _drawButton(ctx, label, btnX, curY, btnW, btnFill, T.bg);
      hit(btnX, curY, btnW, 28, 'pot', { potId: pot.id, seedId: selectedNurserySeedId });
      curY += 34;
    }

    // Clear button
    if (!selectedNurserySeedId && pot.seedId) {
      const canAfford = (gardener.energy ?? 0) >= cost;
      const btnFill = canAfford ? T.danger : alpha(T.danger, 0.5);
      curY += 6;
      _drawButton(ctx, `Clear · ${cost} energy`, btnX, curY, btnW, btnFill, T.text);
      hit(btnX, curY, btnW, 28, 'pot', { potId: pot.id, seedId: '' });
      curY += 34;
    }

    // Decorate / Undecorate
    if (pot.seedId) {
      curY += 4;
      if (pot.iDecorated) {
        _drawButton(ctx, 'Undecorate', btnX, curY, btnW, T.stone, T.text);
        hit(btnX, curY, btnW, 28, 'undecorate', { potId: pot.id });
      } else {
        _drawButton(ctx, 'Decorate', btnX, curY, btnW, T.jade, T.bg);
        hit(btnX, curY, btnW, 28, 'decorate', { potId: pot.id });
      }
      curY += 34;
    }
  }

  return curY + DRAWER_PAD;
}

// ── Resting: nursery grid ─────────────────────────────────────────────────────

const NURSERY_COLS   = 3;
const NURSERY_CELL_W = 80;
const NURSERY_CELL_H = 64;
const NURSERY_SEED_R = 12;

function _drawNurseryGrid(ctx, col, seeds, gardener, selectedNurserySeedId, scrollTopY, T) {
  const gridW    = col.w - 16;
  const cellW    = Math.floor(gridW / NURSERY_COLS);
  const allSeeds = [null, ...seeds]; // null = "None" option
  const rows     = Math.ceil(allSeeds.length / NURSERY_COLS);
  const contentH = rows * NURSERY_CELL_H + 12;

  const scrollId = 'middle-nursery';
  const scrollH  = Math.max(1, Math.min(contentH, col.h - (scrollTopY - col.y)));

  const curScrollY = getScrollY(scrollId);
  beginScrollRegion(scrollId, col.x, scrollTopY, col.w, scrollH, contentH);

  withScroll(ctx, col.x, scrollTopY, col.w, scrollH, curScrollY, () => {
    let cellY = 6;
    for (let i = 0; i < allSeeds.length; i++) {
      const seedId = allSeeds[i];
      const col_i  = i % NURSERY_COLS;
      const row_i  = Math.floor(i / NURSERY_COLS);
      const cellX  = col_i * cellW + 8;
      cellY        = row_i * NURSERY_CELL_H + 6;

      const cx     = cellX + cellW / 2;
      const cy     = cellY + NURSERY_SEED_R + 6;

      const isSel      = seedId === selectedNurserySeedId;
      const isCarried  = seedId !== null && gardener.seed === seedId;

      // Button background
      const bgFill = isSel ? alpha(T.glaze, 0.3) : T.surface2;
      roundRect(ctx, cellX, cellY, cellW - 4, NURSERY_CELL_H - 4, 6,
        bgFill, isSel ? T.glaze : T.border, isSel ? 1.5 : 1);

      if (seedId === null) {
        // "None" option
        drawCircle(ctx, cx, cy, NURSERY_SEED_R, T.surface2, T.border, 1);
        drawText(ctx, 'None', cx, cy + NURSERY_SEED_R + 10, {
          font:  '11px Lora, Georgia, serif',
          color: T.muted,
          align: 'center',
          baseline: 'middle',
        });
      } else {
        const seed      = SEED_MAP[seedId];
        const seedColor = seed?.color ?? T.muted;
        const seedName  = seed?.name  ?? seedId;

        // Seed color circle
        drawCircle(ctx, cx, cy, NURSERY_SEED_R, seedColor, null, 0);

        // Seed icon overlay
        const seedImg = getImg(`seed_${seedId}`);
        if (seedImg) drawImage(ctx, seedImg, cx - 10, cy - 10, 20, 20);

        // Seed name
        drawText(ctx, seedName, cx, cy + NURSERY_SEED_R + 10, {
          font:     '11px Lora, Georgia, serif',
          color:    seedColor,
          align:    'center',
          baseline: 'middle',
          maxWidth: cellW - 8,
        });

        // Carried indicator
        if (isCarried) {
          drawCircle(ctx, cellX + cellW - 10, cellY + 6, 4, T.accent, null, 0);
        }
      }

      hit(cellX, cellY, cellW - 4, NURSERY_CELL_H - 4,
        'select_nursery_seed', { seedId: seedId ?? '' });
    }
  });

  endScrollRegion();

  // Hint below the scroll region (fixed, not scrolled)
  const hintY = scrollTopY + scrollH + 6;
  if (selectedNurserySeedId) {
    const seed  = SEED_MAP[selectedNurserySeedId];
    const sName = seed?.name ?? selectedNurserySeedId;
    drawText(ctx, `Tap a pot to plant ${sName}`, col.x + col.w / 2, hintY + 8, {
      font:  'italic 11px Lora, Georgia, serif',
      color: T.muted,
      align: 'center',
      baseline: 'middle',
    });
  }
}

// ── Walking: travel scene ─────────────────────────────────────────────────────

const SCENE_H = 80;

function _drawTravelScene(ctx, col, path, travelAnimData, T) {
  const sceneX = col.x + 10;
  const sceneY = col.y + 90;
  const sceneW = col.w - 20;

  roundRect(ctx, sceneX, sceneY, sceneW, SCENE_H, 8, T.surface2, T.border, 1);

  // Dashed path curve
  const goingRight = path.pathFrom === path.fromId;

  // Map SVG coords (0..300 × 0..80) onto scene rect
  const mapX = (svgX) => sceneX + (svgX / 300) * sceneW;
  const mapY = (svgY) => sceneY + (svgY / 80)  * SCENE_H;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mapX(20), mapY(40));
  ctx.quadraticCurveTo(mapX(150), mapY(14), mapX(280), mapY(40));
  ctx.strokeStyle = alpha(T.border, 0.8);
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Endpoint markers (×)
  const mkSize = 6;
  for (const [svgX, svgY] of [[20, 40], [280, 40]]) {
    const mx = mapX(svgX);
    const my = mapY(svgY);
    drawLine(ctx, mx - mkSize / 2, my - mkSize / 2, mx + mkSize / 2, my + mkSize / 2, T.stone, 2);
    drawLine(ctx, mx + mkSize / 2, my - mkSize / 2, mx - mkSize / 2, my + mkSize / 2, T.stone, 2);
  }

  // Meeple position — travelAnimData.progress is already extrapolated to "now"
  // by getTravelAnimData(); re-applying elapsed*effectiveSpeed here would double it.
  let frac = 0;
  if (travelAnimData) {
    frac = Math.min(1, travelAnimData.progress / travelAnimData.length);
  } else if (path) {
    frac = Math.min(1, path.progress / path.length);
  }

  const t   = goingRight ? frac : (1 - frac);
  const bx  = (1-t)*(1-t)*20 + 2*(1-t)*t*150 + t*t*280;
  const by_ = (1-t)*(1-t)*40 + 2*(1-t)*t*14  + t*t*40;
  const mx  = mapX(bx);
  const my  = mapY(by_) + bob(2, 3.5);

  // Pilgrim sprite — faces right by default, flipped when heading left
  const pilgrimImg = getImg('pilgrim');
  if (pilgrimImg) {
    drawImageFlipped(ctx, pilgrimImg, mx, my - 6, 18, 28, !goingRight);
  } else {
    // Fallback: circle + triangle pointer
    const clr = T.accent;
    ctx.save();
    ctx.fillStyle = clr;
    ctx.beginPath();
    ctx.arc(mx, my - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx - 5, my + 3);
    ctx.lineTo(mx + 5, my + 3);
    ctx.lineTo(mx, my + 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // From / to labels
  const fromName = path.fromName || path.fromId || '';
  const toName   = path.toName   || path.toId   || '';
  drawText(ctx, fromName, sceneX + 4, sceneY + SCENE_H + 13, {
    font:  '11px Lora, Georgia, serif',
    color: T.muted,
    align: 'left',
  });
  drawText(ctx, toName, sceneX + sceneW - 4, sceneY + SCENE_H + 13, {
    font:  '11px Lora, Georgia, serif',
    color: T.muted,
    align: 'right',
  });
}

function _drawTravelControls(ctx, col, gardener, path, T) {
  const ctrlY = col.y + 30;
  const ctrlH = 32;
  const pad   = 10;
  const half  = Math.floor((col.w - pad * 2 - 4) / 2);

  const energy = gardener.energy ?? 0;

  // ↩ Reverse
  const revX = col.x + pad;
  roundRect(ctx, revX, ctrlY, half, ctrlH, 6, T.surface, T.border, 1);
  drawText(ctx, '↩ Reverse', revX + half / 2, ctrlY + ctrlH / 2 + 1, {
    font: '12px Lora, Georgia, serif', color: T.text,
    align: 'center', baseline: 'middle',
  });
  hit(revX, ctrlY, half, ctrlH, 'reverse', {});

  // ⚡ Dendriport — instantly finishes the trip (this leg + any queued legs)
  const dendX = revX + half + 4;
  const canDendriport = energy >= FAST_TRAVEL_COST;
  const dendFill  = canDendriport ? T.accent : T.stone;
  const dendColor = canDendriport ? T.bg : T.muted;
  roundRect(ctx, dendX, ctrlY, half, ctrlH, 6, dendFill, null, 0);
  drawText(ctx, '⚡ Dendriport', dendX + half / 2, ctrlY + ctrlH / 2 + 1, {
    font: '12px Lora, Georgia, serif', color: dendColor,
    align: 'center', baseline: 'middle',
  });
  if (canDendriport) hit(dendX, ctrlY, half, ctrlH, 'activate_dendriport', {});
}

function _drawETA(ctx, col, path, travelAnimData, gardener, T) {
  const etaY = col.y + 90 + SCENE_H + 28;
  let remaining = 0;
  if (travelAnimData) {
    // travelAnimData.progress is already extrapolated to "now" — see _drawTravelScene.
    remaining = Math.max(0, travelAnimData.length - travelAnimData.progress);
    const ticksLeft = Math.ceil(remaining / Math.max(1, travelAnimData.effectiveSpeed));
    drawText(ctx, `~${formatDuration(ticksLeft)} remaining`, col.x + col.w / 2, etaY, {
      font: '12px Lora, Georgia, serif', color: T.muted,
      align: 'center', baseline: 'middle',
    });
  }
  return etaY + 14;
}

function _drawEncounters(ctx, col, encounters, gardener, startY, T) {
  if (!encounters || encounters.length === 0) return;

  let curY = startY + 8;
  drawText(ctx, `Encountered (${encounters.length})`, col.x + 12, curY + 10, {
    font: '500 12px Lora, Georgia, serif', color: T.text, align: 'left', baseline: 'middle',
  });
  curY += 22;

  for (const enc of encounters) {
    const encSeed     = enc.seed ? SEED_MAP[enc.seed] : null;
    const seedColor   = encSeed?.color ?? T.muted;
    const carrying    = gardener.seed === enc.seed && enc.seed !== null;

    // Dot
    drawCircle(ctx, col.x + 18, curY + 10, 6, seedColor, null, 0);
    // Name
    const label = encSeed ? encSeed.name : 'No seed';
    drawText(ctx, label, col.x + 30, curY + 11, {
      font: '12px Lora, Georgia, serif', color: T.muted, align: 'left', baseline: 'middle',
    });

    // Take Seed button
    if (enc.seed && !carrying) {
      const btnW = 72;
      const btnX = col.x + col.w - 12 - btnW;
      roundRect(ctx, btnX, curY + 2, btnW, 18, 4, T.jade, null, 0);
      drawText(ctx, 'Take Seed', btnX + btnW / 2, curY + 11, {
        font: '10px Lora, Georgia, serif', color: T.bg, align: 'center', baseline: 'middle',
      });
      hit(btnX, curY + 2, btnW, 18, 'take_seed', { fromId: enc.id });
    }
    curY += 22;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function renderMiddleCol(ctx, col, state, travelAnimData) {
  const T = getTheme();

  // Background
  fillRect(ctx, col.x, col.y, col.w, col.h, T.bg);

  if (!state) return;

  const gardener = state.gardener;
  const tick     = liveTick();

  // ── Walking ────────────────────────────────────────────────────────────────
  if (gardener.state === 'walking' && state.path) {
    const path = state.path;

    _drawEnergyRow(ctx, col, col.y + 14, gardener, tick, T);
    _drawTravelControls(ctx, col, gardener, path, T);
    _drawTravelScene(ctx, col, path, travelAnimData, T);
    const afterEta = _drawETA(ctx, col, path, travelAnimData, gardener, T);
    _drawEncounters(ctx, col, path.encounters, gardener, afterEta, T);
    return;
  }

  // ── Resting ────────────────────────────────────────────────────────────────

  if (!state.location) return;

  const pots               = state.location.pots ?? [];
  const selectedPotId      = getSelectedPotId();
  const selectedNurserySeedId = getSelectedNurserySeedId();

  // Location name label
  drawText(ctx, state.location.name ?? 'Location',
    col.x + col.w / 2, col.y + 14, {
      font:  '11px Lora, Georgia, serif',
      color: T.muted,
      align: 'center',
      baseline: 'middle',
    });

  // Who's here right now (self + other resting/arriving gardeners)
  _drawPopulationRow(ctx, col, col.y + 14, gardener, state.location.otherGardeners ?? [], T);

  _drawEnergyRow(ctx, col, col.y + 30, gardener, tick, T);

  // Pots wheel
  _drawPotsWheel(ctx, col, pots, tick, selectedPotId, T);

  // Pot drawer
  const selectedPot = pots.find(p => p.id === selectedPotId) ?? null;
  const drawerBottom = _drawPotDrawer(
    ctx, col, selectedPot, tick, gardener, selectedNurserySeedId, T);

  // Nursery section header
  const seeds = state.location.seedPool ?? [];
  let nurseryTopY = drawerBottom + 10;

  if (seeds.length > 0 || true) {
    drawText(ctx, 'Nursery', col.x + 12, nurseryTopY + 11, {
      font:  '500 12px Lora, Georgia, serif',
      color: T.text,
      align: 'left',
      baseline: 'middle',
    });
    nurseryTopY += 22;

    if (gardener.state === 'resting') {
      _drawNurseryGrid(ctx, col, seeds, gardener, selectedNurserySeedId, nurseryTopY, T);
    } else {
      drawText(ctx, 'Available when resting', col.x + 12, nurseryTopY + 11, {
        font:  'italic 12px Lora, Georgia, serif',
        color: T.muted,
        align: 'left',
        baseline: 'middle',
      });
    }
  }
}
