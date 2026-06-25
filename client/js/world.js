window.Pilgrim = window.Pilgrim || {};

Pilgrim.WORLD = {
  beacons: {
    beacon_citadel: { name: 'The Citadel', x: 160, y: 60  },
    beacon_grove:   { name: 'The Grove',   x: 50,  y: 210 },
    beacon_forge:   { name: 'The Forge',   x: 270, y: 210 },
    beacon_spring:  { name: 'The Spring',  x: 160, y: 310 },
  },
  paths: {
    path_citadel_grove:  { beaconIds: ['beacon_citadel', 'beacon_grove'],  length: 1500 },
    path_citadel_forge:  { beaconIds: ['beacon_citadel', 'beacon_forge'],  length: 3000 },
    path_citadel_spring: { beaconIds: ['beacon_citadel', 'beacon_spring'], length: 2500 },
    path_grove_forge:    { beaconIds: ['beacon_grove',   'beacon_forge'],   length: 2000 },
    path_grove_spring:   { beaconIds: ['beacon_grove',   'beacon_spring'],  length: 4000 },
    path_forge_spring:   { beaconIds: ['beacon_forge',   'beacon_spring'],  length: 1000 },
  },
};
