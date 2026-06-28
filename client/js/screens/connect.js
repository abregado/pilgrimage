import { getConnected } from '../state.js';

export function renderConnect(app) {
  const explanation = `
    <div class="connect-explain">
      <p class="connect-explain-text">Verdant is a slow multiplayer wandering game. You play as a Pilgrim who travels a world of fifteen locations, carrying seeds and planting them in pots to fulfil a personal Vision.</p>
      <ul class="connect-explain-list">
        <li>Walk paths between locations — travel takes real time</li>
        <li>Carry seeds and plant them to grow a living garden</li>
        <li>Complete your Vision rules to move faster across the world</li>
        <li>Encounter other pilgrims and share seeds</li>
      </ul>
      <a href="https://abregado.github.io/pilgrimage/" class="connect-manual-link" target="_blank" rel="noopener">Full rules &amp; manual →</a>
    </div>`;

  if (!getConnected()) {
    app.innerHTML = `
      <div class="connect-screen">
        <div class="connect-inner">
          <div class="connect-title">Verdant</div>
          <div class="connect-sub">Connecting&hellip;</div>
          ${explanation}
        </div>
      </div>`;
  } else {
    app.innerHTML = `
      <div class="connect-screen">
        <div class="connect-inner">
          <div class="connect-title">Verdant</div>
          <button class="btn btn-accent" style="margin-top:24px" data-action="join">Become a Pilgrim</button>
          ${explanation}
        </div>
      </div>`;
  }
}
