const CACHE_NAME = 'tori-valley-v1'
// The Cache Storage API is scoped to the ORIGIN, not to this service worker's
// scope, and remhiit.github.io hosts several PWAs side by side. So the
// activation purge must only ever consider this app's own caches — derived from
// CACHE_NAME by dropping its trailing version segment — otherwise it would wipe
// the neighbours' caches (scoreo-v3, ksabord-v1) every time this app activates.
const CACHE_PREFIX = CACHE_NAME.replace(/-v\d+$/, '') + '-'
// Vite's build output uses content-hashed JS/CSS filenames unknown ahead of
// time, so only the stable, non-hashed entry points are precached here;
// everything else is cached on first fetch by the cache-first handler below.
const ASSETS = ['./', './index.html', './css/styles.css']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
    return
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)))
})
