import { SEEDS, SEED_MAP } from '../seeds.js';
import { LOCATIONS } from '../world.js';
import { formatAge, formatDuration } from '../utils.js';
import { isMusicEnabled } from '../audio.js';

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

  const { record, gardener, tick, rulesSpeedBonus } = state;
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

  // Speed
  const bonusPct = Math.round((rulesSpeedBonus || 0) * 100);
  html += `
    <div class="section">
      <h3>Movement Speed</h3>
      <div class="record-stat">
        <div class="stat-label">Vision bonus</div>
        <div class="stat-value speed-bonus-value">+${bonusPct}%</div>
      </div>
      <p class="record-speed-hint">Complete more of your Vision to move faster across the world. Each completed vision adds +10% movement speed.</p>
    </div>`;

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
      </div>
      <div class="seedlog-list">`;
  for (const seed of SEEDS) {
    const log = record.seedLog[seed.id] || {};
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
      </div>`;
  }
  html += `</div></div>`;

  html += `
    <div class="section">
      <button class="btn btn-full btn-muted" data-action="toggle_music">${isMusicEnabled() ? 'Music: On' : 'Music: Off'}</button>
    </div>`;

  html += `
    <div class="section">
      <button class="btn btn-full btn-danger" data-action="delete_pilgrim">Delete my Pilgrim</button>
    </div>`;

  container.innerHTML = html;
}
