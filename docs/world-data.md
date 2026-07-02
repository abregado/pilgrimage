# World Data

Static data mirrored in `server/seeds.js`, `server/world.js` and their `client/js/` counterparts.

---

## Seeds

15 seeds. Each has a home location (`locationId`); that location's origin seed is always in its nursery pool.

| id                | name            | color     | symbol | home location        |
|-------------------|-----------------|-----------|--------|----------------------|
| `velour_bloom`    | Velour Bloom    | `#7B3F8C` | ✿      | `the_glasshouse`     |
| `cinder_fern`     | Cinder Fern     | `#9E9E9E` | ⌁      | `the_fernery`        |
| `mirewort`        | Mirewort        | `#2E6B3E` | ≋      | `the_bogwood`        |
| `stonecress`      | Stonecress      | `#BDBDBD` | ◻      | `the_terrace`        |
| `ember_weed`      | Ember Weed      | `#B71C1C` | ✦      | `the_coldhouse`      |
| `wanderbloom`     | Wanderbloom     | `#E67E22` | ❁      | `the_nursery`        |
| `goldthread`      | Goldthread      | `#F9A825` | ✵      | `the_orchard`        |
| `salthorn`        | Salthorn        | `#F5F0DC` | ⋄      | `the_salt_flats`     |
| `rainfall_lily`   | Rainfall Lily   | `#1565C0` | ✧      | `the_cutting_garden` |
| `quietbranch`     | Quietbranch     | `#78909C` | ❧      | `the_walled_garden`  |
| `thornwhisper`    | Thornwhisper    | `#B0BEC5` | ⋈      | `the_thicket`        |
| `glassroot`       | Glassroot       | `#4FC3F7` | ◈      | `the_undercroft`     |
| `ironmoss`        | Ironmoss        | `#546E7A` | ♧      | `the_canopy`         |
| `duskbell`        | Duskbell        | `#4527A0` | ◆      | `the_still_pool`     |
| `murmuring_sage`  | Murmuring Sage  | `#90A4AE` | ❦      | `the_seedbank`       |

Adjacent seed pairs (ring): velour_bloom↔cinder_fern↔mirewort↔stonecress↔ember_weed↔wanderbloom↔goldthread↔salthorn↔rainfall_lily↔quietbranch↔thornwhisper↔glassroot↔ironmoss↔duskbell↔murmuring_sage↔velour_bloom

---

## Locations

15 locations. `potCount` is number of pots at that location.

| id                   | name               | x   | y   | pots |
|----------------------|--------------------|-----|-----|------|
| `the_glasshouse`     | The Glasshouse     | 150 | 300 | 7    |
| `the_fernery`        | The Fernery        | 280 | 180 | 6    |
| `the_bogwood`        | The Bogwood        | 400 | 260 | 8    |
| `the_canopy`         | The Canopy         | 500 | 150 | 9    |
| `the_thicket`        | The Thicket        | 560 | 300 | 7    |
| `the_walled_garden`  | The Walled Garden  | 620 | 420 | 9    |
| `the_cutting_garden` | The Cutting Garden | 680 | 550 | 7    |
| `the_salt_flats`     | The Salt Flats     | 600 | 680 | 6    |
| `the_terrace`        | The Terrace        | 480 | 760 | 6    |
| `the_coldhouse`      | The Coldhouse      | 320 | 780 | 7    |
| `the_undercroft`     | The Undercroft     | 180 | 680 | 8    |
| `the_seedbank`       | The Seedbank       | 360 | 660 | 7    |
| `the_nursery`        | The Nursery        | 200 | 500 | 9    |
| `the_still_pool`     | The Still Pool     | 380 | 430 | 6    |
| `the_orchard`        | The Orchard        | 540 | 530 | 8    |

SVG viewport: 800 × 900.

---

## Paths

21 paths. `length` is in metres; base travel speed is `MOVEMENT_SPEED` (3 m/tick), modified by `speedBonus` and completed-rule bonuses — see `docs/game-loop.md` and `docs/constants.md`.

| id                            | from                 | to                   | length |
|-------------------------------|----------------------|----------------------|--------|
| `glasshouse_fernery`          | the_glasshouse       | the_fernery          | 1500   |
| `glasshouse_nursery`          | the_glasshouse       | the_nursery          | 2000   |
| `glasshouse_undercroft`       | the_glasshouse       | the_undercroft       | 3000   |
| `fernery_bogwood`             | the_fernery          | the_bogwood          | 1000   |
| `fernery_canopy`              | the_fernery          | the_canopy           | 2500   |
| `bogwood_still_pool`          | the_bogwood          | the_still_pool       | 2000   |
| `bogwood_thicket`             | the_bogwood          | the_thicket          | 1500   |
| `canopy_thicket`              | the_canopy           | the_thicket          | 2000   |
| `canopy_orchard`              | the_canopy           | the_orchard          | 3500   |
| `thicket_walled_garden`       | the_thicket          | the_walled_garden    | 2500   |
| `walled_garden_cutting_garden`| the_walled_garden    | the_cutting_garden   | 1500   |
| `walled_garden_seedbank`      | the_walled_garden    | the_seedbank         | 2000   |
| `cutting_garden_salt_flats`   | the_cutting_garden   | the_salt_flats       | 3000   |
| `salt_flats_terrace`          | the_salt_flats       | the_terrace          | 1000   |
| `terrace_coldhouse`           | the_terrace          | the_coldhouse        | 2500   |
| `coldhouse_seedbank`          | the_coldhouse        | the_seedbank         | 1500   |
| `seedbank_nursery`            | the_seedbank         | the_nursery          | 2000   |
| `nursery_still_pool`          | the_nursery          | the_still_pool       | 3500   |
| `still_pool_orchard`          | the_still_pool       | the_orchard          | 2000   |
| `orchard_salt_flats`          | the_orchard          | the_salt_flats       | 4000   |
| `undercroft_coldhouse`        | the_undercroft       | the_coldhouse        | 2500   |
