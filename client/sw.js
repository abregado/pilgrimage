const CACHE = 'pilgrim-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './js/ideals.js',
  './js/world.js',
  './js/utils.js',
  './js/state.js',
  './js/network.js',
  './js/screens/connect.js',
  './js/screens/beacon.js',
  './js/screens/path.js',
  './js/screens/arrival.js',
  './js/screens/pilgrim.js',
  './js/screens/map.js',
  './js/render.js',
  './js/main.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/ideal_wisdom.png',
  './icons/ideal_courage.png',
  './icons/ideal_justice.png',
  './icons/ideal_temperance.png',
  './icons/ideal_compassion.png',
  './icons/ideal_humility.png',
  './icons/ideal_truth.png',
  './icons/ideal_honor.png',
  './icons/ideal_perseverance.png',
  './icons/ideal_serenity.png',
  './icons/ideal_gratitude.png',
  './icons/ideal_fortitude.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('ws')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
