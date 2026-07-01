// Column and page layout management

import { getTab } from '../state.js';

const TAB_H = 44; // right column tab bar height

export function isLandscape() {
  return window.innerWidth >= window.innerHeight;
}

// Narrow desktop windows (roughly square or taller-than-wide, ratio <= 8/9)
// don't have room for a fixed 3-column layout — the Vision column folds into
// the right tab bar instead and we run a 2-column layout.
export function isNarrowDesktop() {
  return window.innerWidth / window.innerHeight <= 8 / 9;
}

export function getColumns() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  if (isNarrowDesktop()) {
    const middleW = Math.round(W / 2);
    return {
      left:   null,
      middle: { x: 0,       y: 0, w: middleW,     h: H },
      right:  { x: middleW, y: 0, w: W - middleW, h: H },
    };
  }

  const colW = Math.round(W / 3);
  return {
    left:   { x: 0,           y: 0, w: colW,         h: H },
    middle: { x: colW,        y: 0, w: colW,         h: H },
    right:  { x: colW * 2,    y: 0, w: W - colW * 2, h: H },
  };
}

export function getTabBarBounds() {
  const cols = getColumns();
  const r = cols.right;
  return { x: r.x, y: r.y, w: r.w, h: TAB_H };
}

export function getRightContentBounds() {
  const cols = getColumns();
  const r = cols.right;
  return { x: r.x, y: r.y + TAB_H, w: r.w, h: r.h - TAB_H };
}

// Mobile: each page occupies the full viewport
export function getPageBounds(pageIndex, W = window.innerWidth, H = window.innerHeight) {
  return { x: pageIndex * W, y: 0, w: W, h: H };
}

export function getMobileTabBarBounds(W = window.innerWidth, H = window.innerHeight) {
  return { x: 0, y: 0, w: W, h: TAB_H }; // tab bar at top of right page content
}

export function TAB_BAR_HEIGHT() { return TAB_H; }
