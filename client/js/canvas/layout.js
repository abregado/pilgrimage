// Column and page layout management

import { getTab } from '../state.js';

const LEFT_W   = 220;
const MIDDLE_W = 300;
const TAB_H    = 44; // right column tab bar height

export function isLandscape() {
  return window.innerWidth >= window.innerHeight;
}

export function getColumns() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const rightW = W - LEFT_W - MIDDLE_W;
  return {
    left:   { x: 0,                y: 0, w: LEFT_W,   h: H },
    middle: { x: LEFT_W,           y: 0, w: MIDDLE_W, h: H },
    right:  { x: LEFT_W + MIDDLE_W, y: 0, w: rightW,   h: H },
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
