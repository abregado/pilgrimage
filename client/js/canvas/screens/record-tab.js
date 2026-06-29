// Canvas renderer for the Record tab (right column).
// Draws age, energy milestones, vision summary, seed log table, and settings.

import {
  fillRect, roundRect, drawCircle, drawText, alpha, withScroll,
} from '../../canvas/draw.js';
import {
  hit, beginScrollRegion, endScrollRegion, getScrollY,
} from '../../canvas/input.js';
import { getTheme, isLightTheme } from '../../canvas/theme.js';
import { SEEDS } from '../../seeds.js';
import { LOCATIONS } from '../../world.js';
import { formatAge } from '../../utils.js';
import { isMusicEnabled } from '../../audio.js';

// ── Layout constants ──────────────────────────────────────────────────────────
const ROW_PAD = 8;
const CELL_W  = 40;  // stage column width
const CELL_H  = 24;  // table row height
const BTN_H   = 32;  // settings button height

// Stage column definitions
const STAGES = [
  { label: 'Seed', key: 'seed'     },
  { label: 'Sdlg', key: 'seedling' },
  { label: 'Grwn', key: 'grown'    },
  { label: 'Frt',  key: 'fruiting' },
  { label: 'Dead', key: 'dead'     },
];

// Persisted content height estimate; updated each frame so clamping stays accurate.
let _contentH = 1400;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sectionHead(ctx, label, x, y, T) {
  drawText(ctx, label.toUpperCase(), x, y, {
    font: '10px sans-serif',
    color: T.muted,
    align: 'left',
    baseline: 'alphabetic',
  });
}

function _btn(ctx, label, x, y, w, h, bg, fg, border) {
  roundRect(ctx, x, y, w, h, 6, bg, border, 1);
  drawText(ctx, label, x + w / 2, y + h / 2 + 5, {
    font: '13px sans-serif',
    color: fg,
    align: 'center',
    baseline: 'alphabetic',
  });
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderRecordTab(ctx, bounds, state) {
  const T = getTheme();

  beginScrollRegion('record-tab', bounds.x, bounds.y, bounds.w, bounds.h, _contentH);
  const scrollY = getScrollY('record-tab');

  let computedH = bounds.h; // minimum

  withScroll(ctx, bounds.x, bounds.y, bounds.w, bounds.h, scrollY, () => {
    const cw = bounds.w;
    let cy   = 16;

    // ── No state guard ──────────────────────────────────────────────────────
    if (!state || !state.record) {
      drawText(ctx, 'No record yet.', cw / 2, cy + 20, {
        font: '14px sans-serif',
        color: T.muted,
        align: 'center',
        baseline: 'alphabetic',
      });
      computedH = cy + 60;
      return;
    }

    const { record, gardener, rulesSpeedBonus } = state;
    const wanderings = record.wanderings ?? [];

    // ── 1. AGE ──────────────────────────────────────────────────────────────
    _sectionHead(ctx, 'Age', ROW_PAD, cy, T);
    cy += 18;

    drawText(ctx, formatAge(record.ageTicks ?? 0), ROW_PAD, cy, {
      font: '16px sans-serif',
      color: T.text,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += 26;
    cy += 16;

    // ── 2. ENERGY ───────────────────────────────────────────────────────────
    _sectionHead(ctx, 'Energy', ROW_PAD, cy, T);
    cy += 18;

    const energy    = gardener?.energy    ?? 0;
    const energyMax = gardener?.energyMax ?? 0;
    drawText(ctx, `${energy} / ${energyMax}`, ROW_PAD, cy, {
      font: '16px sans-serif',
      color: T.text,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += 26;

    // Milestones
    const milestones = [
      { label: 'Day one',  met: (record.ageTicks ?? 0) >= 86400,  bonus: '+3 max energy' },
      { label: 'One week', met: (record.ageTicks ?? 0) >= 604800, bonus: '+3 max energy' },
      { label: 'Explorer', met: LOCATIONS.every(l => wanderings.includes(l.id)), bonus: '+5 max energy' },
    ];

    for (const m of milestones) {
      drawCircle(ctx, ROW_PAD + 5, cy - 3, 5, m.met ? T.jade : null, m.met ? null : T.border, 1.5);
      drawText(ctx, m.label, ROW_PAD + 16, cy, {
        font: '13px sans-serif',
        color: m.met ? T.text : T.muted,
        align: 'left',
        baseline: 'alphabetic',
      });
      drawText(ctx, m.bonus, cw - ROW_PAD, cy, {
        font: '12px sans-serif',
        color: m.met ? T.jade : T.muted,
        align: 'right',
        baseline: 'alphabetic',
      });
      cy += 22;
    }
    cy += 16;

    // ── 3. VISIONS COMPLETED ────────────────────────────────────────────────
    _sectionHead(ctx, 'Visions', ROW_PAD, cy, T);
    cy += 18;

    const rules          = gardener?.rules ?? [];
    const completedCount = rules.filter(r => r.completed && !r.refreshing).length;
    const bonusPct       = Math.round((rulesSpeedBonus ?? 0) * 100);

    drawText(ctx, `${completedCount} of ${rules.length} completed`, ROW_PAD, cy, {
      font: '13px sans-serif',
      color: T.text,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += 20;

    drawText(ctx, `Speed bonus: +${bonusPct}%`, ROW_PAD, cy, {
      font: '12px sans-serif',
      color: T.accent,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += 22;
    cy += 16;

    // ── 4. SEED LOG ─────────────────────────────────────────────────────────
    _sectionHead(ctx, 'Seed Log', ROW_PAD, cy, T);
    cy += 18;

    const tableX   = ROW_PAD;
    const nameColW = Math.max(80, cw - ROW_PAD * 2 - STAGES.length * CELL_W);
    const tableW   = nameColW + STAGES.length * CELL_W;
    const tableH   = CELL_H * (1 + SEEDS.length); // header + rows

    // Table outline
    roundRect(ctx, tableX, cy, tableW, tableH, 4, alpha(T.surface2, 0.5), T.border);

    // Header: stage abbreviations
    for (let ci = 0; ci < STAGES.length; ci++) {
      const cellCX = tableX + nameColW + ci * CELL_W + CELL_W / 2;
      drawText(ctx, STAGES[ci].label, cellCX, cy + CELL_H / 2 + 4, {
        font: 'bold 10px sans-serif',
        color: T.muted,
        align: 'center',
        baseline: 'alphabetic',
      });
    }
    cy += CELL_H;

    // Seed rows
    for (let si = 0; si < SEEDS.length; si++) {
      const seed = SEEDS[si];
      const log  = record.seedLog?.[seed.id] ?? {};
      const rowY = cy;
      const midY = rowY + CELL_H / 2;

      // Alternating row background
      if (si % 2 === 0) {
        fillRect(ctx, tableX, rowY, tableW, CELL_H, alpha(T.surface, 0.4));
      }

      // Seed color dot + name
      drawCircle(ctx, tableX + 8, midY, 5, seed.color, null);
      drawText(ctx, seed.name, tableX + 18, midY + 4, {
        font: '11px sans-serif',
        color: T.text,
        align: 'left',
        baseline: 'alphabetic',
        maxWidth: nameColW - 22,
      });

      // Stage circles
      for (let ci = 0; ci < STAGES.length; ci++) {
        const cellCX = tableX + nameColW + ci * CELL_W + CELL_W / 2;
        const met    = !!log[STAGES[ci].key];
        if (met) {
          drawCircle(ctx, cellCX, midY, 5, seed.color, null);
        } else {
          drawCircle(ctx, cellCX, midY, 4, null, T.border, 1);
        }
      }

      cy += CELL_H;
    }
    cy += 16;

    // ── 5. SETTINGS ─────────────────────────────────────────────────────────
    _sectionHead(ctx, 'Settings', ROW_PAD, cy, T);
    cy += 18;

    const btnW = cw - ROW_PAD * 2;

    // Music toggle
    const musicLabel = isMusicEnabled() ? 'Music: On' : 'Music: Off';
    _btn(ctx, musicLabel, ROW_PAD, cy, btnW, BTN_H, T.surface2, T.text, T.border);
    hit(ROW_PAD, cy, btnW, BTN_H, 'toggle_music');
    cy += BTN_H + 10;

    // Theme toggle
    const themeLabel = isLightTheme() ? 'Theme: Light' : 'Theme: Dark';
    _btn(ctx, themeLabel, ROW_PAD, cy, btnW, BTN_H, T.surface2, T.text, T.border);
    hit(ROW_PAD, cy, btnW, BTN_H, 'toggle_theme');
    cy += BTN_H + 10;

    // Delete pilgrim
    _btn(ctx, 'Delete my Pilgrim…', ROW_PAD, cy, btnW, BTN_H,
      alpha(T.danger, 0.12), T.danger, T.danger);
    hit(ROW_PAD, cy, btnW, BTN_H, 'delete_pilgrim');
    cy += BTN_H + 6;

    drawText(ctx, 'This cannot be undone', ROW_PAD, cy, {
      font: '11px sans-serif',
      color: T.muted,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += 20;

    cy += 16; // bottom padding
    computedH = cy;
  });

  endScrollRegion();
  _contentH = Math.max(computedH, bounds.h);
}
