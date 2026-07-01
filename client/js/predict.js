// Client-side optimistic prediction for a scoped set of discrete actions.
// Mirrors the guards/mutations of the matching server/actions.js function so
// the UI can react immediately instead of waiting for the round-trip. Deliberately
// narrow: rule satisfiedCount/speedBonus/seedLog changes are NOT predicted here —
// those settle within the next tick/broadcast regardless, and replicating
// checkRuleCompletion client-side isn't worth the complexity for a cosmetic delay.
//
// Each apply* function takes an already-cloned GardenerView and either mutates
// it and returns it, or returns null if its local guard fails (the action is
// still sent to the server as normal — we just don't predict its outcome).
import { SETTLING_DURATION } from '/js/constants.js';
import { SEEDS } from './seeds.js';
import { potEnergyCost } from './growth.js';

// swap() validates against ANY planted pot regardless of age, unlike pot()'s
// grown+-only pool (server/actions.js:229-231) — location.seedPool as sent to
// the client is built with pot()'s stricter rule, so swap needs its own pool.
function loosePotPool(location) {
  const pool = new Set();
  const origin = SEEDS.find(s => s.locationId === location.id);
  if (origin) pool.add(origin.id);
  for (const pot of location.pots) if (pot.seedId) pool.add(pot.seedId);
  for (const og of location.otherGardeners ?? []) {
    if (og.state === 'resting' && og.seed) pool.add(og.seed);
  }
  return pool;
}

function applyPot(view, { potId, seedId }, tick) {
  const g = view.gardener;
  if (g.state !== 'resting' || !view.location) return null;
  const pot = view.location.pots.find(p => p.id === potId);
  if (!pot) return null;

  const cost = potEnergyCost(pot, tick);
  if ((g.energy ?? 0) < cost) return null;

  if (!seedId) {
    if (!pot.seedId) return null;
    pot.seedId = null;
    pot.decoratorCount = 0;
    pot.iDecorated = false;
    pot.settlingUntil = null;
    pot.lastPlantedTick = null;
    g.energy -= cost;
    g.fastTravel = false;
    return view;
  }

  if (!view.location.seedPool?.includes(seedId)) return null;
  if (pot.settlingUntil !== null && pot.settlingUntil > tick) return null;

  pot.seedId = seedId;
  pot.lastPlantedTick = tick;
  pot.settlingUntil = tick + SETTLING_DURATION;
  pot.decoratorCount = 0;
  pot.iDecorated = false;
  g.energy -= cost;
  g.fastTravel = false;
  return view;
}

function applyDecorate(view, { potId }) {
  const g = view.gardener;
  if (g.state !== 'resting' || !view.location) return null;
  const pot = view.location.pots.find(p => p.id === potId);
  if (!pot || !pot.seedId || pot.iDecorated) return null;
  pot.iDecorated = true;
  pot.decoratorCount = (pot.decoratorCount ?? 0) + 1;
  g.fastTravel = false;
  return view;
}

function applyUndecorate(view, { potId }) {
  const g = view.gardener;
  if (g.state !== 'resting' || !view.location) return null;
  const pot = view.location.pots.find(p => p.id === potId);
  if (!pot || !pot.iDecorated) return null;
  pot.iDecorated = false;
  pot.decoratorCount = Math.max(0, (pot.decoratorCount ?? 1) - 1);
  g.fastTravel = false;
  return view;
}

function applySwap(view, { seedId }) {
  const g = view.gardener;
  if (g.state !== 'resting') return null;
  if (!seedId) {
    g.seed = null;
    g.fastTravel = false;
    return view;
  }
  if (!view.location) return null;
  if (!loosePotPool(view.location).has(seedId)) return null;
  g.seed = seedId;
  g.fastTravel = false;
  return view;
}

function applyTakeSeed(view, { fromId }) {
  const g = view.gardener;
  if (g.state !== 'walking' && g.state !== 'arriving') return null;
  const list = g.state === 'arriving'
    ? (view.arrival?.encounters ?? [])
    : (view.path?.encounters ?? []);
  const enc = list.find(e => e.id === fromId);
  if (!enc || !enc.seed) return null;
  g.seed = enc.seed;
  return view;
}

function applyPickSeed(view, { seedId }) {
  const g = view.gardener;
  if (g.state !== 'walking' && g.state !== 'arriving') return null;
  if (!g.availableSeeds || !g.availableSeeds.includes(seedId)) return null;
  g.seed = seedId;
  return view;
}

function applyContinue(view) {
  const g = view.gardener;
  if (g.state !== 'arriving') return null;
  g.state = 'resting';
  view.arrival = null;
  g.availableSeeds = null;
  return view;
}

const REDUCERS = {
  pot: applyPot,
  decorate: applyDecorate,
  undecorate: applyUndecorate,
  swap: applySwap,
  take_seed: applyTakeSeed,
  pick_seed: applyPickSeed,
  continue: applyContinue,
};

// Returns a new predicted view, or null if this action type isn't predicted
// (or its local guard failed) — in which case the caller should just wait
// for the server's authoritative reply as before.
export function applyPredictedAction(view, action, tick) {
  const reducer = REDUCERS[action.type];
  if (!reducer || !view) return null;
  const clone = structuredClone(view);
  return reducer(clone, action, tick);
}
