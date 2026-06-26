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

export const RULE_TEMPLATES = [
  // ── Single-seed presence (difficulty 2: need to see it at 2 locations) ────
  { id: 'velour_bloom_present',   description: 'A Velour Bloom is growing here',    difficulty: 2, check: (p) => p.some(x => x.seedId === 'velour_bloom') },
  { id: 'cinder_fern_present',    description: 'A Cinder Fern is growing here',     difficulty: 2, check: (p) => p.some(x => x.seedId === 'cinder_fern') },
  { id: 'mirewort_present',       description: 'Mirewort is growing here',           difficulty: 2, check: (p) => p.some(x => x.seedId === 'mirewort') },
  { id: 'stonecress_present',     description: 'Stonecress is growing here',         difficulty: 2, check: (p) => p.some(x => x.seedId === 'stonecress') },
  { id: 'ember_weed_present',     description: 'Ember Weed is growing here',         difficulty: 2, check: (p) => p.some(x => x.seedId === 'ember_weed') },
  { id: 'wanderbloom_present',    description: 'A Wanderbloom is growing here',      difficulty: 2, check: (p) => p.some(x => x.seedId === 'wanderbloom') },
  { id: 'goldthread_present',     description: 'Goldthread is growing here',         difficulty: 2, check: (p) => p.some(x => x.seedId === 'goldthread') },
  { id: 'salthorn_present',       description: 'Salthorn is growing here',           difficulty: 2, check: (p) => p.some(x => x.seedId === 'salthorn') },
  { id: 'rainfall_lily_present',  description: 'A Rainfall Lily is growing here',   difficulty: 2, check: (p) => p.some(x => x.seedId === 'rainfall_lily') },
  { id: 'quietbranch_present',    description: 'A Quietbranch is growing here',     difficulty: 2, check: (p) => p.some(x => x.seedId === 'quietbranch') },
  { id: 'thornwhisper_present',   description: 'Thornwhisper is growing here',       difficulty: 2, check: (p) => p.some(x => x.seedId === 'thornwhisper') },
  { id: 'glassroot_present',      description: 'Glassroot is growing here',          difficulty: 2, check: (p) => p.some(x => x.seedId === 'glassroot') },
  { id: 'ironmoss_present',       description: 'Ironmoss is growing here',           difficulty: 2, check: (p) => p.some(x => x.seedId === 'ironmoss') },
  { id: 'duskbell_present',       description: 'A Duskbell is growing here',         difficulty: 2, check: (p) => p.some(x => x.seedId === 'duskbell') },
  { id: 'murmuring_sage_present', description: 'Murmuring Sage is growing here',    difficulty: 2, check: (p) => p.some(x => x.seedId === 'murmuring_sage') },

  // ── Two-seed co-presence (difficulty 1: find both at the same location once) ─
  { id: 'mirewort_glassroot',        description: 'Mirewort and Glassroot grow together',           difficulty: 1, check: (p) => p.some(x => x.seedId === 'mirewort')      && p.some(x => x.seedId === 'glassroot') },
  { id: 'cinder_fern_ember_weed',    description: 'Cinder Fern and Ember Weed grow together',      difficulty: 1, check: (p) => p.some(x => x.seedId === 'cinder_fern')   && p.some(x => x.seedId === 'ember_weed') },
  { id: 'velour_bloom_duskbell',     description: 'Velour Bloom and Duskbell grow together',        difficulty: 1, check: (p) => p.some(x => x.seedId === 'velour_bloom')  && p.some(x => x.seedId === 'duskbell') },
  { id: 'goldthread_wanderbloom',    description: 'Goldthread and Wanderbloom grow together',       difficulty: 1, check: (p) => p.some(x => x.seedId === 'goldthread')    && p.some(x => x.seedId === 'wanderbloom') },
  { id: 'quietbranch_thornwhisper',  description: 'Quietbranch and Thornwhisper grow together',    difficulty: 1, check: (p) => p.some(x => x.seedId === 'quietbranch')   && p.some(x => x.seedId === 'thornwhisper') },
  { id: 'stonecress_salthorn',       description: 'Stonecress and Salthorn grow together',          difficulty: 1, check: (p) => p.some(x => x.seedId === 'stonecress')    && p.some(x => x.seedId === 'salthorn') },
  { id: 'rainfall_lily_mirewort',    description: 'Rainfall Lily and Mirewort grow together',      difficulty: 1, check: (p) => p.some(x => x.seedId === 'rainfall_lily') && p.some(x => x.seedId === 'mirewort') },
  { id: 'ironmoss_murmuring_sage',   description: 'Ironmoss and Murmuring Sage grow together',     difficulty: 1, check: (p) => p.some(x => x.seedId === 'ironmoss')      && p.some(x => x.seedId === 'murmuring_sage') },

  // ── Adjacency (difficulty 1: arrange two specific seeds in adjacent pots) ───
  // Pot 0 is adjacent to the last pot (circular arrangement)
  { id: 'mirewort_adj_glassroot',       description: 'Mirewort grows next to Glassroot',           difficulty: 1, check: adjCheck('mirewort',      'glassroot') },
  { id: 'cinder_fern_adj_ember_weed',   description: 'Cinder Fern grows next to Ember Weed',       difficulty: 1, check: adjCheck('cinder_fern',   'ember_weed') },
  { id: 'velour_bloom_adj_duskbell',    description: 'Velour Bloom grows next to Duskbell',         difficulty: 1, check: adjCheck('velour_bloom',  'duskbell') },
  { id: 'goldthread_adj_wanderbloom',   description: 'Goldthread grows next to Wanderbloom',        difficulty: 1, check: adjCheck('goldthread',    'wanderbloom') },
  { id: 'quietbranch_adj_thornwhisper', description: 'Quietbranch grows next to Thornwhisper',     difficulty: 1, check: adjCheck('quietbranch',   'thornwhisper') },
  { id: 'stonecress_adj_salthorn',      description: 'Stonecress grows next to Salthorn',           difficulty: 1, check: adjCheck('stonecress',    'salthorn') },
  { id: 'rainfall_lily_adj_mirewort',   description: 'Rainfall Lily grows next to Mirewort',       difficulty: 1, check: adjCheck('rainfall_lily', 'mirewort') },
  { id: 'ironmoss_adj_glassroot',       description: 'Ironmoss grows next to Glassroot',           difficulty: 1, check: adjCheck('ironmoss',      'glassroot') },
];

export const RULE_TEMPLATE_MAP = Object.fromEntries(RULE_TEMPLATES.map(r => [r.id, r]));

export function pickNewRule(existingRules = []) {
  const usedIds = new Set(existingRules.map(r => r.templateId));
  const available = RULE_TEMPLATES.filter(t => !usedIds.has(t.id));
  if (!available.length) return null;
  const template = available[Math.floor(Math.random() * available.length)];
  let id = '';
  for (let i = 0; i < 4; i++) id += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return {
    id,
    templateId: template.id,
    difficulty: template.difficulty,
    description: template.description,
    completed: false,
    deletedTick: null,
    refreshAt: null,
  };
}
