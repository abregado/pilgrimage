// Canvas engine — RAF loop, DPR scaling, resize handling

let _canvas = null;
let _ctx    = null;
let _dpr    = 1;
let _w      = 0;
let _h      = 0;
let _dirty  = true;
let _rafId  = null;

const _renderCbs = [];
const _resizeCbs = [];

export function initCanvas() {
  _canvas = document.createElement('canvas');
  _canvas.id = 'game-canvas';
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext('2d');
  _applySize();
  window.addEventListener('resize', () => {
    _applySize();
    _resizeCbs.forEach(fn => fn(_w, _h));
    invalidate();
  });
  _loop();
}

function _applySize() {
  _dpr = window.devicePixelRatio || 1;
  _w   = window.innerWidth;
  _h   = window.innerHeight;
  _canvas.width  = Math.round(_w * _dpr);
  _canvas.height = Math.round(_h * _dpr);
  _canvas.style.width  = _w + 'px';
  _canvas.style.height = _h + 'px';
  _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
}

function _loop() {
  _rafId = requestAnimationFrame(_loop);
  if (!_dirty) return;
  _dirty = false;
  _renderCbs.forEach(fn => fn(_ctx, _w, _h));
}

export function invalidate()      { _dirty = true; }
export function getCtx()          { return _ctx; }
export function getCanvas()       { return _canvas; }
export function getW()            { return _w; }
export function getH()            { return _h; }
export function onRender(fn)      { _renderCbs.push(fn); }
export function onResize(fn)      { _resizeCbs.push(fn); }
