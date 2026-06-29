// Canvas renderer for the Info / Help tab (right column).
// Draws static help text in scrollable sections.

import { drawText, drawWrappedText, withScroll } from '../../canvas/draw.js';
import { beginScrollRegion, endScrollRegion, getScrollY } from '../../canvas/input.js';
import { getTheme } from '../../canvas/theme.js';

// Persisted content height; updated each frame.
let _contentH = 800;

// ── Section content ───────────────────────────────────────────────────────────
const SECTIONS = [
  {
    title: 'What you do',
    body: 'Travel between gardens. Plant seeds in pots. Watch them grow. Complete vision rules to earn bonuses and deepen your legend.',
  },
  {
    title: 'Vision',
    body: 'Each gardener has personal vision rules — goals like “Have 3 grown plants at different locations”. Completing visions earns extra energy slots and travel speed. A completed vision stays safe for a while before refreshing.',
  },
  {
    title: 'Seeds & Pots',
    body: 'Each location has a seed pool. Carry a seed when you travel to plant it somewhere new. Pots cycle: seed → seedling → grown → fruiting → dead. Planting costs energy — more for mature plants.',
  },
  {
    title: 'Energy',
    body: 'Energy regenerates over time. Spending it on planting costs more for mature plants. Fast Travel costs 1 energy but moves at 200× speed.',
  },
  {
    title: 'Decorating',
    body: 'Once a plant is growing, you can decorate a pot to signal appreciation. Other gardeners can see your decoration.',
  },
];

const MANUAL_NOTE = 'For full details, visit the game manual.';

const HEADER_FONT = '13px sans-serif';
const BODY_FONT   = '13px sans-serif';
const LINE_H      = 20;
const PAD_X       = 16;
const PAD_TOP     = 16;
const SEC_GAP     = 20;

// ── Main render ───────────────────────────────────────────────────────────────

export function renderInfoTab(ctx, bounds) {
  const T = getTheme();

  const maxW = bounds.w - PAD_X * 2;

  beginScrollRegion('info-tab', bounds.x, bounds.y, bounds.w, bounds.h, _contentH);
  const scrollY = getScrollY('info-tab');

  let computedH = bounds.h;

  withScroll(ctx, bounds.x, bounds.y, bounds.w, bounds.h, scrollY, () => {
    let cy = PAD_TOP;

    for (const section of SECTIONS) {
      // Section heading
      drawText(ctx, section.title, PAD_X, cy, {
        font: `bold ${HEADER_FONT}`,
        color: T.accent,
        align: 'left',
        baseline: 'alphabetic',
      });
      cy += LINE_H;

      // Body text (wrapped)
      const bodyH = drawWrappedText(ctx, section.body, PAD_X, cy, maxW, LINE_H, {
        font: BODY_FONT,
        color: T.muted,
      });
      cy += bodyH;
      cy += SEC_GAP;
    }

    // Manual note (muted, no heading)
    drawText(ctx, MANUAL_NOTE, PAD_X, cy, {
      font: `italic ${BODY_FONT}`,
      color: T.muted,
      align: 'left',
      baseline: 'alphabetic',
    });
    cy += LINE_H;
    cy += PAD_TOP; // bottom padding

    computedH = cy;
  });

  endScrollRegion();
  _contentH = Math.max(computedH, bounds.h);
}
