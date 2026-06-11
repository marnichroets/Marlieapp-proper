// Minimal service worker so Pooks Birds is installable as a PWA.
// Bump this version whenever cached app-shell assets (like the app icon)
// change, so returning/installed users get the update instead of the old cache.
const CACHE = 'pooks-birds-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.png', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Network-first for navigations so she always gets the latest app shell,
  // falling back to cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
    )
    return
  }

  // Cache-first for everything else (assets, icons), updating in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
