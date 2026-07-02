/**
 * service-worker.js
 * Strategia cache-first per gli asset statici: l'app deve funzionare
 * al 100% offline, dato che è pensata per l'uso al tavolo/telefono
 * anche con connessione assente o instabile (es. in sala).
 *
 * I dati delle prenotazioni NON passano da qui: vivono in localStorage,
 * letto/scritto direttamente dalla pagina (vedi js/storage.js).
 */

const CACHE_NAME = 'prenotazioni-cache-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/storage.js',
  './js/config.js',
  './js/slots.js',
  './js/bookings.js',
  './js/utils.js',
  './js/api.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo richieste GET: il resto (se mai ce ne fosse) passa dritto alla rete.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Salva in cache anche eventuali risorse esterne future, se valide
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Offline e non in cache: per la navigazione, ricadi sulla pagina principale
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
