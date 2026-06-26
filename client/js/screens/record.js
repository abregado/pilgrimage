import { SEEDS, SEED_MAP } from '../seeds.js';
import { LOCATIONS, LOCATION_MAP } from '../world.js';
import { formatAge, formatDuration } from '../utils.js';

function seedIcon(seedId, small) {
  if (!seedId) return `<div class="seed-icon" style="background:#222;width:${small?24:32}px;height:${small?24:32}px;border-radius:4px"></div>`;
  const seed = SEED_MAP[seedId];
  const color = seed ? seed.color : '#666';
  const sz = small ? 24 : 32;
  return `<div class="seed-icon" style="background:${color};width:${sz}px;height:${sz}px;border-radius:${small?4:6}px"><img src="/assets/seed_${seedId}.svg" alt="" width="${sz}" height="${sz}" onerror="this.style.display='none'"></div>`;
}

function check(met) {
  return `<span class="log-check${met ? ' met' : ''}"></span>`;
}

export function renderRecord(container, state) {
  if (!state) {
    container.innerHTML = `<p class="muted center">No record yet</p>`;
    return;
  }

  const { record, gardener, tick } = state;
  if (!record) {
    container.innerHTML = `<p class="muted center">No record yet</p>`;
    return;
  }

  let html = ``;

  // Age
  html += `
    <div class="section">
      <h3>Age</h3>
      <div class="record-stat">
        <div class="stat-label">Time in the garden</div>
        <div class="stat-value">${formatAge(record.ageTicks)}</div>
      </div>
    </div>`;

  // Energy
  const energy = gardener?.energy ?? 0;
  const energyMax = gardener?.energyMax ?? 0;
  const rules = gardener?.rules || [];
  const completedRules = rules.filter(r => r.completed && !r.refreshing);
  const milestones = [
    { label: 'Day one',     met: record.ageTicks >= 86400 },
    { label: 'One week',    met: record.ageTicks >= 604800 },
    { label: 'Explorer',    met: LOCATIONS.every(l => record.wanderings.includes(l.id)) },
  ];
  html += `
    <div class="section">
      <h3>Energy</h3>
      <div class="energy-record-display">
        <span class="energy-record-value">${energy} / ${energyMax}</span>
      </div>
      <div class="milestone-list">`;
  for (const m of milestones) {
    html += `<div class="milestone-row${m.met ? ' met' : ''}">
      <span class="milestone-pip">${m.met ? '✓' : '·'}</span>
      <span class="milestone-label">${m.label}</span>
      <span class="milestone-bonus">+1 max energy</span>
    </div>`;
  }
  if (completedRules.length > 0) {
    html += `<div class="milestone-row met">
      <span class="milestone-pip">✓</span>
      <span class="milestone-label">${completedRules.length} vision${completedRules.length !== 1 ? 's' : ''} complete</span>
      <span class="milestone-bonus">+${completedRules.length} max energy</span>
    </div>`;
  }
  html += `</div></div>`;

  // Vision
  html += `<div class="section"><h3>Vision</h3>`;
  if (rules.length === 0) {
    html += `<p class="muted">No visions yet</p>`;
  } else {
    html += `<div class="vision-list">`;
    for (const rule of rules) {
      if (rule.refreshing) {
        const wait = Math.max(0, rule.refreshAt - tick);
        html += `<div class="vision-card refreshing"><span class="vision-refresh">New vision in ${formatDuration(wait)}</span></div>`;
      } else {
        html += `
          <div class="vision-card${rule.completed ? ' completed' : ''}">
            <div class="vision-desc">${rule.description}</div>
            <div class="vision-footer">
              <span class="vision-progress">${rule.satisfiedCount} / ${rule.difficulty} locations</span>
              ${rule.completed
                ? `<span class="vision-badge">Complete</span>`
                : `<button class="btn btn-sm btn-muted" data-action="delete_rule" data-rule-id="${rule.id}">Dismiss</button>`}
            </div>
          </div>`;
      }
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Wanderings
  html += `<div class="section"><h3>Wanderings (${record.wanderings.length})</h3>`;
  if (record.wanderings.length === 0) {
    html += `<p class="muted">No journeys yet</p>`;
  } else {
    html += `<div class="wanderings-list">`;
    for (const locId of [...record.wanderings].reverse()) {
      const loc = LOCATION_MAP[locId];
      html += `<div class="wandering-entry">${loc ? loc.name : locId}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Seed log — vertical list with stage checkboxes
  html += `
    <div class="section">
      <h3>Seed Log</h3>
      <div class="seedlog-header">
        <span class="seedlog-spacer"></span>
        <span class="log-col-label" title="Seed carried or seen">Sd</span>
        <span class="log-col-label" title="Seedling observed">Sl</span>
        <span class="log-col-label" title="Grown observed">Gr</span>
        <span class="log-col-label" title="Fruiting observed">Fr</span>
        <span class="log-col-label" title="Dead observed">De</span>
        <span class="log-col-label" title="Origin location visited">Or</span>
      </div>
      <div class="seedlog-list">`;
  for (const seed of SEEDS) {
    const log = record.seedLog[seed.id] || {};
    const originVisited = record.wanderings.includes(seed.locationId);
    html += `
      <div class="seedlog-row">
        <div class="seedlog-identity">
          ${seedIcon(seed.id, true)}
          <span class="seedlog-name">${seed.name}</span>
        </div>
        ${check(log.seed)}
        ${check(log.seedling)}
        ${check(log.grown)}
        ${check(log.fruiting)}
        ${check(log.dead)}
        ${check(originVisited)}
      </div>`;
  }
  html += `</div></div>`;

  // Garden (top 3 decorated pots)
  html += `<div class="section"><h3>Garden</h3>`;
  if (!record.garden || record.garden.length === 0) {
    html += `<p class="muted">Decorate pots to build your garden</p>`;
  } else {
    html += `<div class="garden-list">`;
    for (const entry of record.garden) {
      const seed = SEED_MAP[entry.seedId];
      const color = seed ? seed.color : '#666';
      html += `
        <div class="garden-entry">
          ${seedIcon(entry.seedId)}
          <div class="garden-info">
            <div class="garden-seed" style="color:${color}">${seed ? seed.name : entry.seedId}</div>
            <div class="garden-decorators">${entry.otherDecoratorCount} other decorator${entry.otherDecoratorCount !== 1 ? 's' : ''}</div>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  container.innerHTML = html;
}
