const CACHE_NAME = 'scoreo-v2'
// Vite's build output uses content-hashed JS/CSS filenames unknown ahead of
// time (unlike the Kotlin/webpack bundle's fixed `scoreo.js`), so only the
// stable, non-hashed entry points are precached here; everything else is
// cached on first fetch by the cache-first handler below.
const ASSETS = ['./', './index.html', './css/styles.css']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
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
