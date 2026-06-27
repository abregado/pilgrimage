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

function adjCheck(seedA, seedB) {
  return (pots) => {
    for (let i = 0; i < pots.length; i++) {
      const j = (i + 1) % pots.length;
      const a = pots[i].seedId;
      const b = pots[j].seedId;
      if ((a === seedA && b === seedB) || (a === seedB && b === seedA)) return true;
    }
    return false;
  };
}

function nextToEmptyCheck(seedId) {
  return (pots) => {
    for (let i = 0; i < pots.length; i++) {
      if (pots[i].seedId === seedId) {
        const prev = pots[(i - 1 + pots.length) % pots.length];
        const next = pots[(i + 1) % pots.length];
        if (!prev.seedId || !next.seedId) return true;
      }
    }
    return false;
  };
}

// seedA is flanked by two seedB neighbours
function sandwichCheck(seedA, seedB) {
  return (pots) => {
    for (let i = 0; i < pots.length; i++) {
      if (pots[i].seedId === seedA) {
        const prev = pots[(i - 1 + pots.length) % pots.length];
        const next = pots[(i + 1) % pots.length];
        if (prev.seedId === seedB && next.seedId === seedB) return true;
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

// ── Level 2a: co-presence pairs (find 6 locations) ───────────────────────────
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_${b}_copresent`,
    2, 6,
    `6 locations in the world have ${SEED_NAMES[a]} and ${SEED_NAMES[b]} both planted`,
    [a, b],
    (p) => p.some(x => x.seedId === a) && p.some(x => x.seedId === b),
  ));
}

// ── Level 2b: adjacent pairs (find 3 locations) ───────────────────────────────
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_${b}_adjacent`,
    2, 3,
    `3 locations in the world have ${SEED_NAMES[a]} and ${SEED_NAMES[b]} planted adjacent to each other`,
    [a, b],
    adjCheck(a, b),
  ));
}

// ── Level 2c: next to an empty pot (find 8 locations) ────────────────────────
for (const seedId of ALL_SEEDS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${seedId}_next_empty`,
    2, 8,
    `8 locations in the world have ${SEED_NAMES[seedId]} planted next to an empty pot`,
    [seedId],
    nextToEmptyCheck(seedId),
  ));
}

// ── Level 3a: sandwich — seedA flanked by two seedB (find 3 locations) ────────
// Both directions so every seed can appear as "the centre"
for (const [a, b] of PAIRS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${b}_sandwiches_${a}`,
    3, 3,
    `3 locations in the world have two ${SEED_NAMES[b]} planted with ${SEED_NAMES[a]} between them`,
    [a, b],
    sandwichCheck(a, b),
  ));
  RULE_TEMPLATES.push(makeTemplate(
    `${a}_sandwiches_${b}`,
    3, 3,
    `3 locations in the world have two ${SEED_NAMES[a]} planted with ${SEED_NAMES[b]} between them`,
    [a, b],
    sandwichCheck(b, a),
  ));
}

// ── Level 3b: triple planting (find 6 locations) ─────────────────────────────
for (const seedId of ALL_SEEDS) {
  RULE_TEMPLATES.push(makeTemplate(
    `${seedId}_triple`,
    3, 6,
    `6 locations in the world have ${SEED_NAMES[seedId]} planted at least 3 times`,
    [seedId],
    (p) => p.filter(x => x.seedId === seedId).length >= 3,
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
    deletedTick: null,
    refreshAt:   null,
  };
}

function pickFromLevel(level, preferSeedId, usedTemplateIds) {
  let candidates = RULE_TEMPLATES.filter(t =>
    t.level === level &&
    !usedTemplateIds.has(t.id) &&
    (preferSeedId ? t.seeds.includes(preferSeedId) : true),
  );
  // Fallback: any unused template at this level
  if (!candidates.length && preferSeedId) {
    candidates = RULE_TEMPLATES.filter(t => t.level === level && !usedTemplateIds.has(t.id));
  }
  if (!candidates.length) return null;
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  usedTemplateIds.add(t.id);
  return makeRuleInstance(t);
}

// Build the 4 starting rules (2×L1, 1×L2, 1×L3) biased toward originSeedId
export function pickInitialRules(originSeedId) {
  const rules = [];
  const used = new Set();

  const l1a = pickFromLevel(1, originSeedId, used);
  if (l1a) rules.push(l1a);

  // Second L1: prefer origin seed again (will pick a different type if L1 for origin exhausted)
  const l1b = pickFromLevel(1, null, used);
  if (l1b) rules.push(l1b);

  const l2 = pickFromLevel(2, originSeedId, used);
  if (l2) rules.push(l2);

  const l3 = pickFromLevel(3, originSeedId, used);
  if (l3) rules.push(l3);

  return rules;
}

// Pick a replacement rule at the same level (for refresh)
export function pickNewRuleForLevel(level, existingRules = []) {
  const usedIds = new Set(
    existingRules.filter(r => r.deletedTick === null).map(r => r.templateId),
  );
  const candidates = RULE_TEMPLATES.filter(t => t.level === level && !usedIds.has(t.id));
  if (!candidates.length) return null;
  const t = candidates[Math.floor(Math.random() * candidates.length)];
  return makeRuleInstance(t);
}
