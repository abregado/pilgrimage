// Canvas theme constants — replaces CSS custom properties

export const THEME_DARK = {
  bg:       '#0c0e14',
  surface:  '#14161e',
  surface2: '#1c1f2a',
  border:   '#2c3044',
  text:     '#e8e4d0',
  muted:    '#7a7a8a',
  accent:   '#d4a843',
  jade:     '#5a8a5c',
  glaze:    '#44527a',
  clay:     '#9a6030',
  stone:    '#585864',
  moss:     '#7aaa28',
  danger:   '#b04040',
};

export const THEME_LIGHT = {
  bg:       '#f0ece0',
  surface:  '#e8e2d0',
  surface2: '#ddd5be',
  border:   '#b8a880',
  text:     '#1a1820',
  muted:    '#6a6050',
  accent:   '#b8920e',
  jade:     '#3a7040',
  glaze:    '#3a4872',
  clay:     '#8a5025',
  stone:    '#7a7a80',
  moss:     '#6a9820',
  danger:   '#9a2020',
};

let _theme = THEME_DARK;
let _reducedMotion = false;

export function initTheme() {
  const saved = localStorage.getItem('verdant_theme');
  _theme = saved === 'light' ? THEME_LIGHT : THEME_DARK;
  _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getTheme() { return _theme; }

export function toggleTheme() {
  _theme = _theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  localStorage.setItem('verdant_theme', _theme === THEME_LIGHT ? 'light' : 'dark');
}

export function getReducedMotion() { return _reducedMotion; }

export function isLightTheme() { return _theme === THEME_LIGHT; }
