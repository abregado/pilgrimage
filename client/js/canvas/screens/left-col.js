// Left column renderer — location name, energy bar, vision cards
// Width: 220px. Fixed header, scrollable vision cards below.

import { fillRect, strokeRect, roundRect, drawCircle, drawLine,
         drawText, measureText, drawWrappedText, drawImage, withScroll, alpha } from '../draw.js';
import { hit, beginScrollRegion, endScrollRegion, getScrollY } from '../input.js';
import { pulse } from '../anim.js';
import { getTheme } from '../theme.js';
import { getImg } from '../assets.js';
import { SEED_MAP } from '../../seeds.js';
import { liveTick } from '../../clock.js';
import { formatDuration } from '../../utils.js';

const ICONS_RESERVE = 36; // right-side space reserved for up to 2 seed icons

const HEADER_H = 36;
const CARD_PAD_X = 12;      // horizontal padding inside column
const CARD_INNER_X = 12;    // extra x inside card for text
const CARD_RADIUS = 8;
const CARD_GAP = 10;
const CARD_TOP_PAD = 12;    // padding from header to first card

// Level badge colors by level index (1-based)
function _levelColor(level, T) {
  if (level === 1) return T.jade;
  if (level === 2) return T.accent;
  return T.danger;
}

// Interpolate two hex colors by t (0..1)
function _lerpColor(hexA, hexB, t) {
  const rA = parseInt(hexA.slice(1, 3), 16);
  const gA = parseInt(hexA.slice(3, 5), 16);
  const bA = parseInt(hexA.slice(5, 7), 16);
  const rB = parseInt(hexB.slice(1, 3), 16);
  const gB = parseInt(hexB.slice(3, 5), 16);
  const bB = parseInt(hexB.slice(5, 7), 16);
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);
  return `rgb(${r},${g},${b})`;
}

export function renderLeftCol(ctx, col, state) {
  const T = getTheme();

  // ── Background + right border ──────────────────────────────────────────────
  fillRect(ctx, col.x, col.y, col.w, col.h, T.surface);
  drawLine(ctx, col.x + col.w - 0.5, col.y, col.x + col.w - 0.5, col.y + col.h, T.border);

  if (!state) return;

  const gardener = state.gardener;
  const tick = liveTick();

  // ── HEADER ─────────────────────────────────────────────────────────────────

  drawText(ctx, 'Vision', col.x + CARD_PAD_X, col.y + 22, {
    font:  '500 15px Lora, Georgia, serif',
    color: T.text,
    align: 'left',
  });

  // ── VISION CARDS (scrollable) ──────────────────────────────────────────────

  const scrollX = col.x;
  const scrollY_top = col.y + HEADER_H;
  const scrollW = col.w;
  const scrollH = col.h - HEADER_H;
  const scrollId = 'left-col';

  const activeRules = (gardener.rules ?? []).filter(r => !r.refreshing);

  // Pre-measure card heights so we know contentH before drawing
  const BADGE_DIAM  = 18;
  const DESC_FONT   = '13px Lora, Georgia, serif';
  const DESC_MAX_W  = scrollW - CARD_PAD_X * 2 - CARD_INNER_X * 2 - BADGE_DIAM - 6 - ICONS_RESERVE;
  const PROG_H      = 3;
  const FOOTER_H    = 16;
  const CARD_INNER_PAD = 10; // top/bottom inner padding

  // We need ctx to measure text — build heights array
  const cardHeights = activeRules.map(rule => {
    ctx.font = DESC_FONT;
    // Estimate wrapped text height
    const words = (rule.description ?? '').split(' ');
    let line = '';
    let lines = 1;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > DESC_MAX_W && line) {
        lines++;
        line = w;
      } else {
        line = test;
      }
    }
    const descH = lines * 17; // 13px font ~17px line height
    const safeH = (rule.completed && rule.safeUntil > tick) ? 14 : 0;
    return CARD_INNER_PAD + BADGE_DIAM + 6 + descH + 6 + PROG_H + 4 + FOOTER_H + safeH + CARD_INNER_PAD;
  });

  let contentH = CARD_TOP_PAD;
  for (const h of cardHeights) contentH += h + CARD_GAP;
  if (activeRules.length === 0) contentH = 80;

  const curScrollY = getScrollY(scrollId);
  beginScrollRegion(scrollId, scrollX, scrollY_top, scrollW, scrollH, contentH);

  withScroll(ctx, scrollX, scrollY_top, scrollW, scrollH, curScrollY, () => {
    if (activeRules.length === 0) {
      drawText(ctx, 'No active visions', scrollW / 2, 40, {
        font:  '13px Lora, Georgia, serif',
        color: T.muted,
        align: 'center',
        baseline: 'middle',
      });
    } else {
      let cardY = CARD_TOP_PAD;
      const cardW = scrollW - CARD_PAD_X * 2;

      for (let idx = 0; idx < activeRules.length; idx++) {
        const rule = activeRules[idx];
        const cardH = cardHeights[idx];
        const cardX = CARD_PAD_X;

        // Card background fill
        const isCompleted   = !!rule.completed;
        const isSatisfied   = !!rule.satisfiedHere;
        const cardFill      = isCompleted ? alpha(T.surface2, 0.6) : T.surface2;

        // Border: pulse between T.border and T.accent when satisfiedHere —
        // but a completed rule's border stays static, never pulsing.
        let cardStroke = T.border;
        if (isSatisfied && !isCompleted) {
          const p = pulse(2500);
          cardStroke = _lerpColor(T.border, T.accent, p);
        }

        roundRect(ctx, cardX, cardY, cardW, cardH, CARD_RADIUS,
          cardFill, cardStroke, isSatisfied ? 1.5 : 1);

        // Hit region for the card (content-space coords inside withScroll)
        hit(cardX, cardY, cardW, cardH, 'vision_card', { ruleId: rule.id });

        // ── Level badge ──────────────────────────────────────────────────────
        const badgeColor = _levelColor(rule.level, T);
        const badgeCX = cardX + CARD_INNER_X + BADGE_DIAM / 2;
        const badgeCY = cardY + CARD_INNER_PAD + BADGE_DIAM / 2;
        drawCircle(ctx, badgeCX, badgeCY, BADGE_DIAM / 2, badgeColor, null, 0);
        drawText(ctx, `L${rule.level}`, badgeCX, badgeCY + 1, {
          font:     'bold 10px Lora, Georgia, serif',
          color:    T.bg,
          align:    'center',
          baseline: 'middle',
        });

        // ── Required seed icons (top-right of card) ────────────────────────────
        const seedIcons = rule.seeds ?? [];
        const iconY = cardY + CARD_INNER_PAD;
        let iconX = cardX + cardW - CARD_INNER_X - seedIcons.length * 16;
        for (const seedId of seedIcons) {
          const seedImg = getImg(`seed_${seedId}`);
          if (seedImg) {
            drawImage(ctx, seedImg, iconX, iconY, 14, 14);
          } else {
            drawCircle(ctx, iconX + 7, iconY + 7, 7, SEED_MAP[seedId]?.color ?? T.muted, null, 0);
          }
          iconX += 16;
        }

        // ── Description text ─────────────────────────────────────────────────
        const textX = cardX + CARD_INNER_X + BADGE_DIAM + 6;
        const textY = cardY + CARD_INNER_PAD + 4;
        const textMaxW = cardW - CARD_INNER_X - BADGE_DIAM - 10 - CARD_INNER_X - ICONS_RESERVE;
        const descH = drawWrappedText(ctx, rule.description ?? '', textX, textY + 13,
          textMaxW, 17, { font: DESC_FONT, color: T.text });

        // ── Progress bar ─────────────────────────────────────────────────────
        const progY = cardY + CARD_INNER_PAD + Math.max(BADGE_DIAM + 6, descH + 6 + 4);
        const frac  = Math.min(1, (rule.satisfiedCount ?? 0) / Math.max(1, rule.difficulty ?? 1));
        // Background
        fillRect(ctx, cardX, progY, cardW, PROG_H, T.surface);
        // Fill
        let progColor = alpha(T.jade, 0.8);
        if (isCompleted)  progColor = T.moss;
        if (isSatisfied)  progColor = T.accent;
        if (frac > 0) fillRect(ctx, cardX, progY, Math.round(cardW * frac), PROG_H, progColor);

        // ── Footer row ───────────────────────────────────────────────────────
        const footerY = progY + PROG_H + 4 + 11; // +11 for text baseline
        const countText = `${rule.satisfiedCount ?? 0} / ${rule.difficulty ?? 0}`;
        drawText(ctx, countText, cardX + CARD_INNER_X, footerY, {
          font:  '11px Lora, Georgia, serif',
          color: T.muted,
          align: 'left',
        });

        let badgeCurX = cardX + CARD_INNER_X + measureText(ctx, countText, '11px Lora, Georgia, serif') + 8;

        if (isSatisfied) {
          drawText(ctx, '✓ Here', badgeCurX, footerY, {
            font:  '11px Lora, Georgia, serif',
            color: T.jade,
            align: 'left',
          });
          badgeCurX += measureText(ctx, '✓ Here', '11px Lora, Georgia, serif') + 6;
        }

        if (isCompleted) {
          drawText(ctx, 'Complete', badgeCurX, footerY, {
            font:  '11px Lora, Georgia, serif',
            color: T.moss,
            align: 'left',
          });
        }

        // ── Safe timer ───────────────────────────────────────────────────────
        if (isCompleted && rule.safeUntil != null && rule.safeUntil > tick) {
          const safeRem = Math.max(0, rule.safeUntil - tick);
          drawText(ctx, `Safe ${formatDuration(safeRem)}`, cardX + CARD_INNER_X, footerY + 14, {
            font:  '10px Lora, Georgia, serif',
            color: T.stone,
            align: 'left',
          });
        }

        cardY += cardH + CARD_GAP;
      }
    }
  });

  endScrollRegion();
}
