export const TICK_RATE = 1000;          // ms per tick
export const MOVEMENT_SPEED = 2;       // meters per tick
export const SETTLING_DURATION = 120;   // ticks
export const SLEEP_THRESHOLD = 21600;   // ticks (6 hours)

export const BASE_ENERGY_MAX      = 8;
export const ENERGY_BONUS_TIME    = 1;   // +3 per time milestone (day, week)
export const ENERGY_BONUS_EXPLORE = 1;   // +5 for visiting all 15 locations
export const ENERGY_BONUS_RULE    = 1;   // +5 per completed non-deleted rule
export const ENERGY_REGEN_TICKS   = 1000; // 1 energy per 5 minutes

export const ENERGY_COST_BASE      = 1;  // empty / dead / seed-stage pot
export const ENERGY_COST_SEEDLING  = 2;
export const ENERGY_COST_GROWN     = 10;
export const ENERGY_COST_FRUITING  = 12;

export const SEEDLING_TICKS = 1800;    // 30 minutes
export const GROWN_TICKS    = 21600;   // 6 hours
export const FRUITING_TICKS = 604800;  // 1 week
export const DEAD_TICKS     = 2592000; // ~30 days

export const INITIAL_RULE_SLOTS  = 4;
export const RULE_REFRESH_TICKS  = 60;    // 1 minute cooldown on rule refresh
export const RULE_SAFE_TIME      = 86400; // 24 hours

export const SPEED_BONUS_PER_RULE    = 0.25; // +25% per completed rule
export const SPEED_BONUS_FULL_VISION = 1.0;  // +100% when all 4 rules complete

export const FAST_TRAVEL_COST  = 1; // energy cost to activate fast travel
export const FAST_TRAVEL_MULTI = 20; // speed multiplier while fast travel is active
