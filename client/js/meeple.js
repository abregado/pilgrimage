const MEEPLE_COLORS = {
  resting:  '#6b8f71',
  tending:  '#c9a84c',
  walking:  '#5b8fc9',
  arriving: '#5b8fc9',
  sleeping: '#444',
};

export function renderMeeple(state) {
  const color = MEEPLE_COLORS[state] || '#444';
  return `<svg class="meeple" width="22" height="26" viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="11" cy="5.5" r="4.5" fill="${color}"/>
    <path d="M4 25 Q4 14 11 16 Q18 14 18 25Z" fill="${color}"/>
    <path d="M4.5 15 L1 10.5" stroke="${color}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M17.5 15 L21 10.5" stroke="${color}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </svg>`;
}
