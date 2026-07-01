import { SEEDLING_TICKS, GROWN_TICKS } from './constants.js';

const SEED_NAMES = {
  velour_bloom:   'Velour Bloom',
  cinder_fern:    'Cinder Fern',
  mirewort:       'Mirewort',
  stonecress:     'Stonecress',
  ember_weed:     'Ember Weed',
  wanderbloom:    'Wanderbloom',
  goldthread:     'Goldthread',
  salthorn:       'Salthorn',
  rainfall_lily:  'Rainfall Lily',
  quietbranch:    'Quietbranch',
  thornwhisper:   'Thornwhisper',
  glassroot:      'Glassroot',
  ironmoss:       'Ironmoss',
  duskbell:       'Duskbell',
  murmuring_sage: 'Murmuring Sage',
};

const ALL_SEEDS = Object.keys(SEED_NAMES);

// Adjacent ring of pairs — each seed has exactly two neighbours
const PAIRS = [
  ['velour_bloom',  'cinder_fern'],
  ['cinder_fern',   'mirewort'],
  ['mirewort',      'stonecress'],
  ['stonecress',    'ember_weed'],
  ['ember_weed',    'wanderbloom'],
  ['wanderbloom',   'goldthread'],
  ['goldthread',    'salthorn'],
  ['salthorn',      'rainfall_lily'],
  ['rainfall_lily', 'quietbranch'],
  ['quietbranch',   'thornwhisper'],
  ['thornwhisper',  'glassroot'],
  ['glassroot',     'ironmoss'],
  ['ironmoss',      'duskbell'],
  ['duskbell',      'murmuring_sage'],
  ['murmuring_sage','velour_bloom'],
];

// L2 checks: plants must be at least SEEDLING
// L3 checks: plants must be at least GROWN
function plantAge(pot, tick) {
  return pot.lastPlantedTick !== null ? tick - pot.lastPlantedTick : -1;
}

function adjCheck(seedA, seedB) {
  return (pots, tick) => {
    for (let i = 0; i < pots.length; i++) {
      const j = (i + 1) % pots.length;
      const pi = pots[i]; const pj = pots[j];
      if (plantAge(pi, tick) < SEEDLING_TICKS || plantAge(pj, tick) < SEEDLING_TICKS) continue;
      const a = pi.seedId; const b = pj.seedId;
      if ((a === seedA && b === seedB) || (a === seedB && b === seedA)) return true;
    }
    return false;
  };
}

// seedA is flanked by two seedB neighbours; both plants must be GROWN+
function sandwichCheck(seedA, seedB) {
  return (pots, tick) => {
    for (let i = 0; i < pots.length; i++) {
      if (pots[i].seedId !== seedA) continue;
      if (plantAge(pots[i], tick) < GROWN_TICKS) continue;
      const prev = pots[(i - 1 + pots.length) % pots.length];
      const next = pots[(i + 1) % pots.length];
      if (prev.seedId === seedB && next.seedId === seedB &&
          plantAge(prev, tick) >= GROWN_TICKS && plantAge(next, tick) >= GROWN_TICKS) {
        return true;
      }
    }
    return false;
  };
}

function makeTemplate(id, level, difficulty, description, seeds, check) {
  return { id, level, difficulty, description, seeds, check };
}

export const RULE_TEMPLATES = [];

// ── Level 1: single-seed presence (find 6 locations) ────────────────────────
for (const seedId of ALL_SEEDS) {
  const name = SEED_NAMES[seedId];
  RULE_TEMPLATES.push(makeTemplate(
    `${seedId}_present`,
    1, 6,
    `6 locations in the world have ${name} planted`,
    [seedId],
    (p) => p.some(x => x.seedId === seedId),
  ));
}

// ── Level 2a: co-presence pairs (find 6 locations; both must be SEEDLING+) ──
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_${b}_copresent`,
    2, 6,
    `6 locations in the world have ${SEED_NAMES[a]} and ${SEED_NAMES[b]} both planted as seedlings or older`,
    [a, b],
    (p, tick) =>
      p.some(x => x.seedId === a && plantAge(x, tick) >= SEEDLING_TICKS) &&
      p.some(x => x.seedId === b && plantAge(x, tick) >= SEEDLING_TICKS),
  ));
}

// ── Level 2b: adjacent pairs (find 3 locations; both must be SEEDLING+) ──────
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_${b}_adjacent`,
    2, 3,
    `3 locations in the world have ${SEED_NAMES[a]} and ${SEED_NAMES[b]} planted adjacent to each other as seedlings or older`,
    [a, b],
    adjCheck(a, b),
  ));
}

// ── Level 3a: sandwich — seedA flanked by two seedB (find 3; all GROWN+) ─────
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${b}_sandwiches_${a}`,
    3, 3,
    `3 locations in the world have two ${SEED_NAMES[b]} planted with ${SEED_NAMES[a]} between them, all grown or older`,
    [a, b],
    sandwichCheck(a, b),
  ));
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_sandwiches_${b}`,
    3, 3,
    `3 locations in the world have two ${SEED_NAMES[a]} planted with ${SEED_NAMES[b]} between them, all grown or older`,
    [a, b],
    sandwichCheck(b, a),
  ));
}

// ── Level 3b: triple planting (find 6 locations; all three must be GROWN+) ───
for (const seedId of ALL_SEEDS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${seedId}_triple`,
    3, 6,
    `6 locations in the world have ${SEED_NAMES[seedId]} planted at least 3 times as a grown plant or older`,
    [seedId],
    (p, tick) => p.filter(x => x.seedId === seedId && plantAge(x, tick) >= GROWN_TICKS).length >= 3,
  ));
}

export const RULE_TEMPLATE_MAP = Object.fromEntries(RULE_TEMPLATES.map(r => [r.id, r]));

function makeRuleInstance(template) {
  let id = '';
  for (let i = 0; i < 4; i++) id += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return {
    id,
    templateId:  template.id,
    level:       template.level,
    difficulty:  template.difficulty,
    description: template.description,
    completed:   false,
    safeUntil:   null,
    deletedTick: null,
    refreshAt:   null,
  };
}

// Seeds already claimed by a set of templates
function usedSeedsFromTemplates(templateIds) {
  const seeds = new Set();
  for (const id of templateIds) {
    const t = RULE_TEMPLATE_MAP[id];
    if (t) for (const s of t.seeds) seeds.add(s);
  }
  return seeds;
}

function pickFromLevel(level, preferSeedId, usedTemplateIds, usedSeedIds) {
  const noOverlap = t => !t.seeds.some(s => usedSeedIds.has(s));

  let candidates = RULE_TEMPLATES.filter(t =>
    t.level === level &&
    !usedTemplateIds.has(t.id) &&
    noOverlap(t) &&
    (preferSeedId ? t.seeds.includes(preferSeedId) : true),
  );
  // Fallback: any unused template at this level without seed overlap
  if (!candidates.length && preferSeedId) {
    candidates = RULE_TEMPLATES.filter(t =>
      t.level === level && !usedTemplateIds.has(t.id) && noOverlap(t),
    );
  }
  if (!candidates.length) return null;
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  usedTemplateIds.add(t.id);
  return makeRuleInstance(t);
}

// Build the 4 starting rules (2×L1, 1×L2, 1×L3) biased toward originSeedId
export function pickInitialRules(originSeedId) {
  const rules = [];
  const usedTemplateIds = new Set();
  const usedSeedIds = new Set();

  function push(rule) {
    if (!rule) return;
    rules.push(rule);
    for (const s of RULE_TEMPLATE_MAP[rule.templateId]?.seeds ?? []) usedSeedIds.add(s);
  }

  push(pickFromLevel(1, originSeedId, usedTemplateIds, usedSeedIds));
  push(pickFromLevel(1, null,         usedTemplateIds, usedSeedIds));
  push(pickFromLevel(2, originSeedId, usedTemplateIds, usedSeedIds));
  push(pickFromLevel(3, originSeedId, usedTemplateIds, usedSeedIds));

  return rules;
}

// Pick a replacement rule at the same level (for refresh)
export function pickNewRuleForLevel(level, existingRules = []) {
  const active = existingRules.filter(r => r.deletedTick === null);
  const usedTemplateIds = new Set(active.map(r => r.templateId));
  const usedSeedIds = usedSeedsFromTemplates(usedTemplateIds);

  const candidates = RULE_TEMPLATES.filter(t =>
    t.level === level &&
    !usedTemplateIds.has(t.id) &&
    !t.seeds.some(s => usedSeedIds.has(s)),
  );
  if (!candidates.length) return null;
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  return makeRuleInstance(t);
}
