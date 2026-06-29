// Hit registry + mouse/touch event handling

// Hit region types: 'fixed' (canvas coords) or 'scroll' (content-space within a region)
let _hits          = [];
let _scrollRegions = {}; // id -> { x, y, w, h, scrollY, contentH }
let _scrollStack   = []; // stack of active scroll region ids during render

let _mobilePage        = 1;   // 0=left, 1=center, 2=right
let _mobilePageOffset  = 0;   // animated px offset (during swipe)
let _swipeStart        = null;
let _swipeDir          = null; // 'horiz' | 'vert' | null

let _mouseDown  = null;
let _lastHover  = null;
let _hoveredAction = null;
let _dragState  = null; // { type:'scroll'|'pan', regionId, startX, startY, startScroll, startPanX, startPanY }

let _dispatchFn = null;
let _canvas     = null;
let _mapPanOffset = { x: 0, y: 0 };

export function initInput(canvas, dispatchFn) {
  _canvas     = canvas;
  _dispatchFn = dispatchFn;

  const isTouch = ('ontouchstart' in window);

  if (isTouch) {
    canvas.addEventListener('touchstart',  _onTouchStart,  { passive: false });
    canvas.addEventListener('touchmove',   _onTouchMove,   { passive: false });
    canvas.addEventListener('touchend',    _onTouchEnd,    { passive: false });
    canvas.addEventListener('touchcancel', _onTouchCancel, { passive: false });
  } else {
    canvas.addEventListener('mousedown', _onMouseDown);
    canvas.addEventListener('mousemove', _onMouseMove);
    canvas.addEventListener('mouseup',   _onMouseUp);
    canvas.addEventListener('mouseleave',_onMouseLeave);
    canvas.addEventListener('wheel',     _onWheel, { passive: false });
  }
}

// ── Frame lifecycle ──────────────────────────────────────────────────────────

let _hitsDisabled = false;

export function beginFrame() {
  _hits = [];
  _hitsDisabled = false;
}

export function disableHits() { _hitsDisabled = true; }
export function enableHits()  { _hitsDisabled = false; }

// ── Hit registration (call during render phase) ──────────────────────────────

export function hit(x, y, w, h, action, data = {}) {
  if (_hitsDisabled) return;
  if (_scrollStack.length > 0) {
    const id = _scrollStack[_scrollStack.length - 1];
    _hits.push({ type: 'scroll', regionId: id, contentX: x, contentY: y, w, h, action, data });
  } else {
    _hits.push({ type: 'fixed', x, y, w, h, action, data });
  }
}

export function hitCircle(cx, cy, r, action, data = {}) {
  hit(cx - r, cy - r, r * 2, r * 2, action, { ...data, _circle: { cx, cy, r } });
}

export function beginScrollRegion(id, x, y, w, h, contentH = 0) {
  if (!_scrollRegions[id]) _scrollRegions[id] = { x, y, w, h, scrollY: 0, contentH };
  else {
    _scrollRegions[id].x = x; _scrollRegions[id].y = y;
    _scrollRegions[id].w = w; _scrollRegions[id].h = h;
    _scrollRegions[id].contentH = contentH;
  }
  _scrollStack.push(id);
}

export function endScrollRegion() {
  _scrollStack.pop();
}

export function getScrollY(id) {
  return _scrollRegions[id]?.scrollY ?? 0;
}

export function setScrollY(id, val) {
  if (!_scrollRegions[id]) return;
  const { contentH, h } = _scrollRegions[id];
  _scrollRegions[id].scrollY = Math.max(0, Math.min(val, Math.max(0, contentH - h)));
}

export function registerScrollRegion(id, x, y, w, h, contentH = 0) {
  if (!_scrollRegions[id]) _scrollRegions[id] = { x, y, w, h, scrollY: 0, contentH };
  else {
    _scrollRegions[id].x = x; _scrollRegions[id].y = y;
    _scrollRegions[id].w = w; _scrollRegions[id].h = h;
    _scrollRegions[id].contentH = contentH;
  }
}

export function clearScrollRegion(id) {
  delete _scrollRegions[id];
}

// ── Hit testing ───────────────────────────────────────────────────────────────

function _inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function _inCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function _hitTest(canvasX, canvasY) {
  for (let i = _hits.length - 1; i >= 0; i--) {
    const r = _hits[i];
    if (r.type === 'fixed') {
      if (_inRect(canvasX, canvasY, r.x, r.y, r.w, r.h)) {
        if (r.data._circle) {
          const { cx, cy, r: cr } = r.data._circle;
          if (!_inCircle(canvasX, canvasY, cx, cy, cr)) continue;
        }
        return r;
      }
    } else {
      const reg = _scrollRegions[r.regionId];
      if (!reg) continue;
      if (!_inRect(canvasX, canvasY, reg.x, reg.y, reg.w, reg.h)) continue;
      const cx = canvasX - reg.x;
      const cy = canvasY - reg.y + reg.scrollY;
      if (_inRect(cx, cy, r.contentX, r.contentY, r.w, r.h)) {
        if (r.data._circle) {
          const { cx: ccx, cy: ccy, r: cr } = r.data._circle;
          if (!_inCircle(cx, cy, ccx, ccy, cr)) continue;
        }
        return r;
      }
    }
  }
  return null;
}

function _pos(e) {
  const rect = _canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ── Mobile page management ────────────────────────────────────────────────────

export function getMobilePage()       { return _mobilePage; }
export function setMobilePage(n)      { _mobilePage = Math.max(0, Math.min(2, n)); }
export function getMobilePageOffset() { return _mobilePageOffset; }

// ── Map pan state ─────────────────────────────────────────────────────────────

export function getMapPan()         { return _mapPanOffset; }
export function setMapPan(x, y)     { _mapPanOffset = { x, y }; }
export function resetMapPan()       { _mapPanOffset = { x: 0, y: 0 }; }

// ── Hover ──────────────────────────────────────────────────────────────────────

export function getHovered() { return _hoveredAction; }

// ── Mouse handlers ─────────────────────────────────────────────────────────────

function _onMouseDown(e) {
  const p = _pos(e);
  _mouseDown = { ...p, time: Date.now() };
  _dragState = null;

  // Check if click is on a scroll region for drag-scroll
  for (const [id, reg] of Object.entries(_scrollRegions)) {
    if (_inRect(p.x, p.y, reg.x, reg.y, reg.w, reg.h)) {
      _dragState = { type: 'scroll', regionId: id, startX: p.x, startY: p.y, startScroll: reg.scrollY };
      break;
    }
  }
}

function _onMouseMove(e) {
  const p = _pos(e);

  if (_mouseDown && _dragState?.type === 'scroll') {
    const dy = _mouseDown.y - p.y;
    setScrollY(_dragState.regionId, _dragState.startScroll + dy);
    if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
  }

  // Hover state
  const h = _hitTest(p.x, p.y);
  const newHover = h?.action ?? null;
  if (newHover !== _hoveredAction) {
    _hoveredAction = newHover;
    _canvas.style.cursor = newHover ? 'pointer' : 'default';
    if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
  }
}

function _onMouseUp(e) {
  if (!_mouseDown) return;
  const p = _pos(e);
  const dx = Math.abs(p.x - _mouseDown.x);
  const dy = Math.abs(p.y - _mouseDown.y);

  if (dx < 5 && dy < 5) {
    const h = _hitTest(p.x, p.y);
    if (h && _dispatchFn) _dispatchFn(h.action, h.data);
  }

  _mouseDown = null;
  _dragState = null;
}

function _onMouseLeave() {
  _mouseDown = null;
  _dragState = null;
  _hoveredAction = null;
  _canvas.style.cursor = 'default';
}

function _onWheel(e) {
  e.preventDefault();
  const p = _pos(e);
  for (const [id, reg] of Object.entries(_scrollRegions)) {
    if (_inRect(p.x, p.y, reg.x, reg.y, reg.w, reg.h)) {
      setScrollY(id, reg.scrollY + e.deltaY);
      if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
      break;
    }
  }
}

// ── Touch handlers ─────────────────────────────────────────────────────────────

const _SWIPE_PAGE_THRESHOLD  = 40;
const _SWIPE_DIR_RATIO       = 1.5;

let _touchStart = null;
let _touchScrollStart = null;
let _touchScrollId = null;
let _touchPageStart = null;

function _touchPos(e) {
  const rect = _canvas.getBoundingClientRect();
  const t = e.touches[0] || e.changedTouches[0];
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function _onTouchStart(e) {
  const p = _touchPos(e);
  _touchStart = { ...p, time: Date.now() };
  _touchPageStart = _mobilePage;
  _touchScrollStart = null;
  _touchScrollId = null;
  _swipeDir = null;

  // Find which scroll region we're in
  for (const [id, reg] of Object.entries(_scrollRegions)) {
    if (_inRect(p.x, p.y, reg.x, reg.y, reg.w, reg.h)) {
      _touchScrollId = id;
      _touchScrollStart = reg.scrollY;
      break;
    }
  }
}

function _onTouchMove(e) {
  e.preventDefault();
  if (!_touchStart) return;
  const p = _touchPos(e);
  const dx = p.x - _touchStart.x;
  const dy = p.y - _touchStart.y;

  if (!_swipeDir) {
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      _swipeDir = Math.abs(dx) > Math.abs(dy) * _SWIPE_DIR_RATIO ? 'horiz' : 'vert';
    }
    return;
  }

  if (_swipeDir === 'horiz') {
    // Page swipe
    const W = window.innerWidth;
    _mobilePageOffset = dx;
    if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
  } else if (_swipeDir === 'vert' && _touchScrollId) {
    setScrollY(_touchScrollId, _touchScrollStart - dy);
    if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
  }
}

function _onTouchEnd(e) {
  if (!_touchStart) return;
  const p = _touchPos(e);
  const dx = p.x - _touchStart.x;
  const dy = p.y - _touchStart.y;
  const dt = Date.now() - _touchStart.time;

  if (_swipeDir === 'horiz') {
    // Commit page change
    if (Math.abs(dx) > _SWIPE_PAGE_THRESHOLD) {
      const dir = dx < 0 ? 1 : -1;
      setMobilePage(_mobilePage + dir);
    }
    _mobilePageOffset = 0;
  } else if (!_swipeDir || (_swipeDir === 'vert')) {
    // Tap
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 300) {
      const h = _hitTest(_touchStart.x, _touchStart.y);
      if (h && _dispatchFn) _dispatchFn(h.action, h.data);
    }
  }

  _touchStart = null;
  _swipeDir = null;
  _mobilePageOffset = 0;
  if (typeof _dispatchFn === 'function') _dispatchFn('__invalidate__', {});
}

function _onTouchCancel() {
  _touchStart = null;
  _swipeDir = null;
  _mobilePageOffset = 0;
}
