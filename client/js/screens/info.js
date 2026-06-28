export function renderInfo(container) {
  container.innerHTML = `
    <div class="info-content">
      <h2 class="info-title">About Verdant</h2>
      <p class="info-intro">Verdant is a slow multiplayer wandering game. You play as a Pilgrim who travels a world of fifteen locations, carrying seeds and planting them in pots to fulfil a personal Vision.</p>

      <h3>What you do</h3>
      <ul class="info-list">
        <li>Walk paths between locations — travel takes real time</li>
        <li>Carry one seed at a time and plant it in pots at each location</li>
        <li>Encounter other pilgrims on the paths and copy their seed</li>
        <li>Complete your Vision rules to earn speed and energy bonuses</li>
        <li>Watch your plantings grow through seed, seedling, grown, fruiting, and dead stages</li>
      </ul>

      <h3>Vision</h3>
      <p class="info-para">Your Vision is a set of rules about the state of the world's gardens — things like "three locations with a fruiting pot" or "four locations with two different seed types." Each completed rule gives you +10% movement speed and more maximum energy.</p>

      <h3>Seeds &amp; Pots</h3>
      <p class="info-para">Each location has an origin seed you can always plant there. Grown and fruiting pots also produce seeds. Planting costs energy and locks the pot temporarily while it settles.</p>

      <h3>Energy</h3>
      <p class="info-para">You start with 3 energy. Gain more as your Pilgrim ages, visits all locations, and completes Vision rules. Energy refills slowly over time.</p>

      <h3>Decorating</h3>
      <p class="info-para">You can decorate a pot you did not plant. This marks your appreciation and shows in your Record.</p>

      <div class="info-manual-wrap">
        <a href="https://abregado.github.io/pilgrimage/" class="btn btn-sm" target="_blank" rel="noopener">Full manual &amp; server setup →</a>
      </div>
    </div>
  `;
}
