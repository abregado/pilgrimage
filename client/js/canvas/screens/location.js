// Location screen orchestrator — three-column desktop, swipe-page mobile

import { getTheme } from '../../canvas/theme.js';
import { fillRect, drawLine, drawText, roundRect, alpha, drawCircle, drawImage, drawWrappedText } from '../../canvas/draw.js';
import { hit, getMobilePage, getMobilePageOffset, getScrollY, disableHits, enableHits } from '../../canvas/input.js';
import { isLandscape, getColumns, getTabBarBounds, getRightContentBounds, TAB_BAR_HEIGHT } from '../../canvas/layout.js';
import { getState, getTab, setTab, getEmbarkingPathId, getEmbarkChosenSeed } from '../../state.js';
import { SEED_MAP, SEEDS } from '../../seeds.js';
import { PATHS, PATH_MAP, LOCATION_MAP } from '../../world.js';
import { formatDuration } from '../../utils.js';
import { getImg } from '../../canvas/assets.js';
import { startAnim, getAnimT, running } from '../../canvas/anim.js';
import { isLightTheme } from '../../canvas/theme.js';
import { FAST_TRAVEL_MULTI, FAST_TRAVEL_COST } from '/js/constants.js';
import { renderLeftCol }   from './left-col.js';
import { renderMiddleCol } from './middle-col.js';
import { renderMapTab }    from './map-tab.js';
import { renderRecordTab } from './record-tab.js';
import { renderInfoTab }   from './info-tab.js';

// Travel animation state (set by network.js via exported helpers)
let _travelAnimData = null;
let _travelRafId    = null;
let _invalidateFn   = null;

export function setInvalidateFn(fn) { _invalidateFn = fn; }

export function startTravelAnim(path, movementSpeed, speedBonus, rulesSpeedBonus, fastTravel) {
  stopTravelAnim();
  const fastMulti = fastTravel ? FAST_TRAVEL_MULTI : 1;
  const effectiveSpeed = movementSpeed * (speedBonus ?? 1) * (1 + (rulesSpeedBonus ?? 0)) * fastMulti;
  _travelAnimData = {
    progress:      path.progress,
    startTime:     performance.now(),
    length:        path.length,
    effectiveSpeed,
    goingRight:    path.pathFrom === path.fromId,
    fromName:      path.fromName || path.fromId,
    toName:        path.toName   || path.toId,
  };

  function loop() {
    if (!_travelAnimData) return;
    if (_invalidateFn) _invalidateFn();
    _travelRafId = requestAnimationFrame(loop);
  }
  _travelRafId = requestAnimationFrame(loop);
}

export function stopTravelAnim() {
  if (_travelRafId !== null) { cancelAnimationFrame(_travelRafId); _travelRafId = null; }
  _travelAnimData = null;
}

export function getTravelAnimData() {
  if (!_travelAnimData) return null;
  const elapsed = (performance.now() - _travelAnimData.startTime) / 1000;
  const progress = Math.min(_travelAnimData.length, _travelAnimData.progress + _travelAnimData.effectiveSpeed * elapsed);
  return { ..._travelAnimData, progress };
}

// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['map', 'record', 'info'];
const TAB_LABELS = { map: 'Map', record: 'Record', info: 'Info' };

function drawTabBar(ctx, bounds, activeTab, T) {
  const { x, y, w, h } = bounds;
  fillRect(ctx, x, y, w, h, T.surface);
  drawLine(ctx, x, y + h, x + w, y + h, T.border, 1);

  const tabW = Math.floor((w - 60) / TABS.length); // leave 60px for theme toggle
  TABS.forEach((tab, i) => {
    const tx = x + i * tabW;
    const isActive = tab === activeTab;
    const color = isActive ? T.accent : T.muted;
    const font  = isActive
      ? `500 13px Lora, Georgia, serif`
      : `400 13px Lora, Georgia, serif`;
    drawText(ctx, TAB_LABELS[tab], tx + tabW / 2, y + h / 2 + 5, {
      font, color, align: 'center', baseline: 'middle',
    });
    if (isActive) {
      fillRect(ctx, tx + 8, y + h - 2, tabW - 16, 2, T.accent);
    }
    hit(tx, y, tabW, h, 'tab', { tab });
  });

  // Theme toggle button
  const themeX = x + w - 52;
  const label = isLightTheme() ? '☾' : '☀';
  roundRect(ctx, themeX + 6, y + 8, 40, h - 16, 6, T.surface2, T.border, 1);
  drawText(ctx, label, themeX + 26, y + h / 2 + 5, {
    font: '14px Lora, Georgia, serif', color: T.muted, align: 'center', baseline: 'middle',
  });
  hit(themeX + 6, y + 8, 40, h - 16, 'toggle_theme');
}

// ─────────────────────────────────────────────────────────────────────────────

export function renderLocation(ctx, W, H) {
  const T     = getTheme();
  const state = getState();
  const tab   = getTab();

  if (isLandscape()) {
    _renderDesktop(ctx, W, H, T, state, tab);
  } else {
    _renderMobile(ctx, W, H, T, state, tab);
  }
}

function _renderDesktop(ctx, W, H, T, state, tab) {
  const cols      = getColumns();
  const activeTab = (tab === 'location' || tab === 'map') ? 'map'
                  : tab === 'record' ? 'record' : 'info';

  // Column backgrounds + separators
  fillRect(ctx, 0, 0, W, H, T.bg);
  drawLine(ctx, cols.middle.x, 0, cols.middle.x, H, T.border, 1);
  drawLine(ctx, cols.right.x,  0, cols.right.x,  H, T.border, 1);

  // Left column — always visions
  renderLeftCol(ctx, cols.left, state);

  // Middle column — pots or travel
  renderMiddleCol(ctx, cols.middle, state, getTravelAnimData());

  // Right column — tab bar + tab content
  const tabBarBounds  = getTabBarBounds();
  const contentBounds = getRightContentBounds();

  drawTabBar(ctx, tabBarBounds, activeTab, T);

  if (activeTab === 'map')    renderMapTab(ctx, contentBounds, state);
  else if (activeTab === 'record') renderRecordTab(ctx, contentBounds, state);
  else                        renderInfoTab(ctx, contentBounds);

  _renderEmbarkOverlay(ctx, W, H, T, state);
}

function _renderMobile(ctx, W, H, T, state, tab) {
  const page       = getMobilePage();
  const pageOffset = getMobilePageOffset();
  const activeTab  = tab === 'location' ? 'map' : tab;

  // Render three pages translated
  const pages = [
    () => { renderLeftCol(ctx, { x: 0, y: 0, w: W, h: H }, state); },
    () => { renderMiddleCol(ctx, { x: 0, y: 0, w: W, h: H }, state, getTravelAnimData()); },
    () => {
      const tabBar     = { x: 0, y: 0, w: W, h: TAB_BAR_HEIGHT() };
      const tabContent = { x: 0, y: TAB_BAR_HEIGHT(), w: W, h: H - TAB_BAR_HEIGHT() };
      fillRect(ctx, 0, 0, W, H, T.bg);
      drawTabBar(ctx, tabBar, activeTab, T);
      if (activeTab === 'map')    renderMapTab(ctx, tabContent, state);
      else if (activeTab === 'record') renderRecordTab(ctx, tabContent, state);
      else                        renderInfoTab(ctx, tabContent);
    },
  ];

  pages.forEach((drawFn, i) => {
    const baseX = (i - page) * W + pageOffset;
    if (Math.abs(baseX) >= W) return; // fully off-screen, skip
    ctx.save();
    ctx.translate(baseX, 0);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    if (i !== page) disableHits();
    drawFn();
    if (i !== page) enableHits();
    ctx.restore();
  });

  // Page indicator dots
  _drawPageDots(ctx, W, H, page, T);

  _renderEmbarkOverlay(ctx, W, H, T, state);
}

// ── Embark picker overlay ─────────────────────────────────────────────────────

function _renderEmbarkOverlay(ctx, W, H, T, state) {
  const embarkPathId = getEmbarkingPathId();
  if (!embarkPathId || !state?.location || state.gardener.state !== 'resting') return;

  const gardener = state.gardener;
  const embarkPath = PATH_MAP[embarkPathId];
  const destId = embarkPath
    ? (embarkPath.fromId === gardener.locationId ? embarkPath.toId : embarkPath.fromId)
    : null;
  const destName = destId ? ((LOCATION_MAP[destId] || {}).name || destId) : '?';

  const baseSpeed = (state.movementSpeed ?? 3) * (gardener.speedBonus ?? 1) * (1 + (state.rulesSpeedBonus ?? 0));
  const pathLen = embarkPath?.length ?? 0;
  const normalTicks = pathLen > 0 ? Math.ceil(pathLen / baseSpeed) : 0;
  const fastTicks   = pathLen > 0 ? Math.ceil(pathLen / (baseSpeed * FAST_TRAVEL_MULTI)) : 0;
  const canFast     = (gardener.energy ?? 0) >= (FAST_TRAVEL_COST ?? 1);
  const chosenSeed  = getEmbarkChosenSeed();

  // Scrim
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  // Sheet
  const sheetW = Math.min(W - 32, 460);
  const sheetH = 320;
  const sheetX = (W - sheetW) / 2;
  const sheetY = H - sheetH - 20;

  roundRect(ctx, sheetX, sheetY, sheetW, sheetH, 16, T.surface, T.border, 1);

  // Handle / drag bar
  fillRect(ctx, sheetX + sheetW / 2 - 24, sheetY + 10, 48, 4, T.border);
  roundRect(ctx, sheetX + sheetW / 2 - 24, sheetY + 10, 48, 4, 2, T.border);

  // Title
  drawText(ctx, `Carry a seed to ${destName}?`, sheetX + sheetW / 2, sheetY + 36, {
    font: '500 15px Lora, Georgia, serif', color: T.text, align: 'center',
  });

  // Seed grid
  const seeds = state.location.seedPool || [];
  const cols  = 4;
  const cellW = Math.floor((sheetW - 32) / cols);
  const cellH = 64;
  const gridX = sheetX + 16;
  const gridY = sheetY + 54;

  // "None" option
  const noneSelected = !chosenSeed;
  roundRect(ctx, gridX, gridY, cellW - 8, cellH - 8, 8,
    noneSelected ? T.glaze : T.surface2,
    noneSelected ? T.accent : T.border, 1);
  drawText(ctx, 'None', gridX + (cellW - 8) / 2, gridY + cellH / 2, {
    font: '12px Lora, Georgia, serif', color: T.muted, align: 'center', baseline: 'middle',
  });
  hit(gridX, gridY, cellW - 8, cellH - 8, 'select_embark_seed', { seedId: '' });

  seeds.slice(0, cols * 2 - 1).forEach((seedId, idx) => {
    const col = (idx + 1) % cols;
    const row = Math.floor((idx + 1) / cols);
    const cx  = gridX + col * cellW;
    const cy  = gridY + row * cellH;
    const seed = SEED_MAP[seedId];
    const isChosen = chosenSeed === seedId;

    roundRect(ctx, cx, cy, cellW - 8, cellH - 8, 8,
      isChosen ? T.glaze : T.surface2,
      isChosen ? T.accent : T.border, 1);

    const img = getImg(`seed_${seedId}`);
    if (img) {
      drawImage(ctx, img, cx + (cellW - 8) / 2 - 16, cy + 6, 32, 32);
    } else {
      drawCircle(ctx, cx + (cellW - 8) / 2, cy + 22, 16, seed?.color ?? '#666');
    }
    drawText(ctx, seed?.name?.split(' ')[0] ?? seedId, cx + (cellW - 8) / 2, cy + cellH - 14, {
      font: '10px Lora, Georgia, serif', color: T.muted, align: 'center',
    });
    hit(cx, cy, cellW - 8, cellH - 8, 'select_embark_seed', { seedId });
  });

  // Action buttons
  const btnY  = sheetY + sheetH - 60;
  const btnH  = 44;
  const gap   = 8;
  const btnW  = (sheetW - 32 - gap * 2) / 3;

  // Cancel
  roundRect(ctx, sheetX + 16, btnY, btnW, btnH, 8, T.surface2, T.border, 1);
  drawText(ctx, 'Cancel', sheetX + 16 + btnW / 2, btnY + btnH / 2 + 5, {
    font: '400 13px Lora, Georgia, serif', color: T.muted, align: 'center', baseline: 'middle',
  });
  hit(sheetX + 16, btnY, btnW, btnH, 'cancel_embark');

  // Embark
  const embX = sheetX + 16 + btnW + gap;
  roundRect(ctx, embX, btnY, btnW, btnH, 8, T.accent);
  drawText(ctx, `Walk ~${formatDuration(normalTicks)}`, embX + btnW / 2, btnY + btnH / 2 + 5, {
    font: '500 12px Lora, Georgia, serif', color: T.bg, align: 'center', baseline: 'middle',
  });
  hit(embX, btnY, btnW, btnH, 'embark');

  // Fast
  const fastX = embX + btnW + gap;
  const fastColor = canFast ? T.jade : T.stone;
  roundRect(ctx, fastX, btnY, btnW, btnH, 8, fastColor);
  drawText(ctx, `⚡ ~${formatDuration(fastTicks)}`, fastX + btnW / 2, btnY + btnH / 2 + 5, {
    font: '500 12px Lora, Georgia, serif', color: T.bg, align: 'center', baseline: 'middle',
  });
  if (canFast) hit(fastX, btnY, btnW, btnH, 'embark_fast');
}

function _drawPageDots(ctx, W, H, page, T) {
  const dotR   = 4;
  const gap    = 18;
  const startX = W / 2 - gap;
  const dotY   = H - 16;
  for (let i = 0; i < 3; i++) {
    const cx = startX + i * gap;
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === page ? T.accent : T.stone;
    ctx.fill();
  }
}
