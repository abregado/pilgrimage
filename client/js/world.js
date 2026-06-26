export const LOCATIONS = [
  { id: 'the_glasshouse',      name: 'The Glasshouse',      x: 150, y: 300, potCount: 7 },
  { id: 'the_fernery',         name: 'The Fernery',         x: 280, y: 180, potCount: 6 },
  { id: 'the_bogwood',         name: 'The Bogwood',         x: 400, y: 260, potCount: 8 },
  { id: 'the_canopy',          name: 'The Canopy',          x: 500, y: 150, potCount: 9 },
  { id: 'the_thicket',         name: 'The Thicket',         x: 560, y: 300, potCount: 7 },
  { id: 'the_walled_garden',   name: 'The Walled Garden',   x: 620, y: 420, potCount: 9 },
  { id: 'the_cutting_garden',  name: 'The Cutting Garden',  x: 680, y: 550, potCount: 7 },
  { id: 'the_salt_flats',      name: 'The Salt Flats',      x: 600, y: 680, potCount: 6 },
  { id: 'the_terrace',         name: 'The Terrace',         x: 480, y: 760, potCount: 6 },
  { id: 'the_coldhouse',       name: 'The Coldhouse',       x: 320, y: 780, potCount: 7 },
  { id: 'the_undercroft',      name: 'The Undercroft',      x: 180, y: 680, potCount: 8 },
  { id: 'the_seedbank',        name: 'The Seedbank',        x: 360, y: 660, potCount: 7 },
  { id: 'the_nursery',         name: 'The Nursery',         x: 200, y: 500, potCount: 9 },
  { id: 'the_still_pool',      name: 'The Still Pool',      x: 380, y: 430, potCount: 6 },
  { id: 'the_orchard',         name: 'The Orchard',         x: 540, y: 530, potCount: 8 },
];

export const PATHS = [
  { id: 'glasshouse_fernery',           fromId: 'the_glasshouse',      toId: 'the_fernery',         length: 1500 },
  { id: 'glasshouse_nursery',           fromId: 'the_glasshouse',      toId: 'the_nursery',         length: 2000 },
  { id: 'glasshouse_undercroft',        fromId: 'the_glasshouse',      toId: 'the_undercroft',      length: 3000 },
  { id: 'fernery_bogwood',              fromId: 'the_fernery',         toId: 'the_bogwood',         length: 1000 },
  { id: 'fernery_canopy',               fromId: 'the_fernery',         toId: 'the_canopy',          length: 2500 },
  { id: 'bogwood_still_pool',           fromId: 'the_bogwood',         toId: 'the_still_pool',      length: 2000 },
  { id: 'bogwood_thicket',              fromId: 'the_bogwood',         toId: 'the_thicket',         length: 1500 },
  { id: 'canopy_thicket',               fromId: 'the_canopy',          toId: 'the_thicket',         length: 2000 },
  { id: 'canopy_orchard',               fromId: 'the_canopy',          toId: 'the_orchard',         length: 3500 },
  { id: 'thicket_walled_garden',        fromId: 'the_thicket',         toId: 'the_walled_garden',   length: 2500 },
  { id: 'walled_garden_cutting_garden', fromId: 'the_walled_garden',   toId: 'the_cutting_garden',  length: 1500 },
  { id: 'walled_garden_seedbank',       fromId: 'the_walled_garden',   toId: 'the_seedbank',        length: 2000 },
  { id: 'cutting_garden_salt_flats',    fromId: 'the_cutting_garden',  toId: 'the_salt_flats',      length: 3000 },
  { id: 'salt_flats_terrace',           fromId: 'the_salt_flats',      toId: 'the_terrace',         length: 1000 },
  { id: 'terrace_coldhouse',            fromId: 'the_terrace',         toId: 'the_coldhouse',       length: 2500 },
  { id: 'coldhouse_seedbank',           fromId: 'the_coldhouse',       toId: 'the_seedbank',        length: 1500 },
  { id: 'seedbank_nursery',             fromId: 'the_seedbank',        toId: 'the_nursery',         length: 2000 },
  { id: 'nursery_still_pool',           fromId: 'the_nursery',         toId: 'the_still_pool',      length: 3500 },
  { id: 'still_pool_orchard',           fromId: 'the_still_pool',      toId: 'the_orchard',         length: 2000 },
  { id: 'orchard_salt_flats',           fromId: 'the_orchard',         toId: 'the_salt_flats',      length: 4000 },
  { id: 'undercroft_coldhouse',         fromId: 'the_undercroft',      toId: 'the_coldhouse',       length: 2500 },
];

export const LOCATION_MAP = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
export const PATH_MAP = Object.fromEntries(PATHS.map(p => [p.id, p]));

export function getPathsForLocation(locationId) {
  return PATHS.filter(p => p.fromId === locationId || p.toId === locationId);
}
