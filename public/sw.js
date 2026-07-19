const CACHE_NAME = 'scoreo-v3'
// Vite's build output uses content-hashed JS/CSS filenames unknown ahead of
// time (unlike the Kotlin/webpack bundle's fixed `scoreo.js`), so only the
// stable, non-hashed entry points are precached here. At runtime, GET
// same-origin requests are split in two: hashed assets (`/assets/*`) are
// served cache-first and populated on first fetch — immutable, the hash
// guarantees freshness. Everything else same-origin (navigations,
// `css/*.css`, `manifest.json`, icons) is served network-first with a cache
// fallback for offline, refreshing the cache on every successful response.
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

const isHashedAsset = (url) => /\/assets\//.test(url.pathname)

const putInCache = (request, response) => {
  if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
  return response
}

const cacheFirst = (request) =>
  caches.match(request).then((cached) => cached || fetch(request).then((response) => putInCache(request, response)))

const networkFirst = (request) =>
  fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => caches.match(request))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(isHashedAsset(url) ? cacheFirst(request) : networkFirst(request))
})
