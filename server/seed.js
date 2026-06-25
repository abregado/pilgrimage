const { ALTAR_PROTECTION_TIME } = require('./constants');

function makeAltar(id, beaconId, idealId) {
  return {
    id,
    beaconId,
    idealId,
    believers: [],
    lastChangeTick: -ALTAR_PROTECTION_TIME,
  };
}

function createSeed() {
  return {
    tick: 0,
    beacons: {
      beacon_citadel: {
        id: 'beacon_citadel',
        name: 'The Citadel',
        coreIdeals: ['wisdom', 'justice', 'honor'],
        altars: {
          altar_citadel_1: makeAltar('altar_citadel_1', 'beacon_citadel', 'wisdom'),
          altar_citadel_2: makeAltar('altar_citadel_2', 'beacon_citadel', 'justice'),
          altar_citadel_3: makeAltar('altar_citadel_3', 'beacon_citadel', 'honor'),
        },
      },
      beacon_grove: {
        id: 'beacon_grove',
        name: 'The Grove',
        coreIdeals: ['compassion', 'humility', 'gratitude'],
        altars: {
          altar_grove_1: makeAltar('altar_grove_1', 'beacon_grove', 'compassion'),
          altar_grove_2: makeAltar('altar_grove_2', 'beacon_grove', 'humility'),
          altar_grove_3: makeAltar('altar_grove_3', 'beacon_grove', 'gratitude'),
        },
      },
      beacon_forge: {
        id: 'beacon_forge',
        name: 'The Forge',
        coreIdeals: ['courage', 'perseverance', 'fortitude'],
        altars: {
          altar_forge_1: makeAltar('altar_forge_1', 'beacon_forge', 'courage'),
          altar_forge_2: makeAltar('altar_forge_2', 'beacon_forge', 'perseverance'),
          altar_forge_3: makeAltar('altar_forge_3', 'beacon_forge', 'fortitude'),
        },
      },
      beacon_spring: {
        id: 'beacon_spring',
        name: 'The Spring',
        coreIdeals: ['truth', 'temperance', 'serenity'],
        altars: {
          altar_spring_1: makeAltar('altar_spring_1', 'beacon_spring', 'truth'),
          altar_spring_2: makeAltar('altar_spring_2', 'beacon_spring', 'temperance'),
          altar_spring_3: makeAltar('altar_spring_3', 'beacon_spring', 'serenity'),
        },
      },
    },
    paths: {
      path_citadel_grove: {
        id: 'path_citadel_grove',
        beaconIds: ['beacon_citadel', 'beacon_grove'],
        length: 1500,
      },
      path_citadel_forge: {
        id: 'path_citadel_forge',
        beaconIds: ['beacon_citadel', 'beacon_forge'],
        length: 3000,
      },
      path_citadel_spring: {
        id: 'path_citadel_spring',
        beaconIds: ['beacon_citadel', 'beacon_spring'],
        length: 2500,
      },
      path_grove_forge: {
        id: 'path_grove_forge',
        beaconIds: ['beacon_grove', 'beacon_forge'],
        length: 2000,
      },
      path_grove_spring: {
        id: 'path_grove_spring',
        beaconIds: ['beacon_grove', 'beacon_spring'],
        length: 4000,
      },
      path_forge_spring: {
        id: 'path_forge_spring',
        beaconIds: ['beacon_forge', 'beacon_spring'],
        length: 1000,
      },
    },
    pilgrims: {},
  };
}

module.exports = { createSeed };
