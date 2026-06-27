export const TICK_RATE = 1000;          // ms per tick
export const MOVEMENT_SPEED = 100;       // meters per tick
export const SETTLING_DURATION = 120;   // ticks

export const POT_EMPTY_DURATION    = 1;
export const POT_SEED_DURATION     = 60;
export const POT_SEEDLING_DURATION = 1200;
export const POT_GROWN_DURATION    = 3600;
export const POT_FRUITING_DURATION = 18000;
export const POT_DEAD_DURATION     = 1;
export const SLEEP_THRESHOLD = 21600;   // ticks (6 hours)

export const BASE_ENERGY_MAX = 3;
export const ENERGY_COST_PLANT = 1;
export const ENERGY_REGEN_TICKS = 60;   // 1 energy per minute

export const SEEDLING_TICKS = 1800;    // 30 minutes
export const GROWN_TICKS    = 21600;   // 6 hours
export const FRUITING_TICKS = 604800;  // 1 week
export const DEAD_TICKS     = 2592000; // ~30 days

export const INITIAL_RULE_SLOTS  = 4;
export const RULE_REFRESH_TICKS  = 60;  // 1 minute

export const SPEED_BONUS_PER_RULE = 0.10; // +10% movement speed per completed vision
