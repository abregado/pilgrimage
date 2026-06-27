import { getConnected } from '../state.js';

export function renderConnect(app) {
  if (!getConnected()) {
    app.innerHTML = `
      <div class="connect-screen">
        <div class="connect-inner">
          <div class="connect-title">Verdant</div>
          <div class="connect-sub">Connecting&hellip;</div>
        </div>
      </div>`;
  } else {
    app.innerHTML = `
      <div class="connect-screen">
        <div class="connect-inner">
          <div class="connect-title">Verdant</div>
          <button class="btn btn-accent" style="margin-top:24px" data-action="join">Become a Pilgrim</button>
        </div>
      </div>`;
  }
}
