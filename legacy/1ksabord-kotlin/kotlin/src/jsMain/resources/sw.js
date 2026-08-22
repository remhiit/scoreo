const CACHE_NAME = 'ksabord-v1';
// L'API `caches` est partagée par toute l'origine, pas par scope de service worker :
// les autres PWA déployées sur remhiit.github.io y stockent aussi leurs caches.
// Le préfixe est dérivé de CACHE_NAME (partie avant le « -v » final) pour rester
// synchronisé automatiquement lors d'un changement de version.
const PREFIXE_CACHE = CACHE_NAME.replace(/-v[^-]*$/, '') + '-';
const ASSETS = ['./', './index.html', './app.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith(PREFIXE_CACHE) && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
