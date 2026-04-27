const cacheName = 'polish-verbs-v2'
const appShell = ['/PolishVerbs/', '/PolishVerbs/index.html', '/PolishVerbs/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(appShell)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isAppDocument =
    event.request.mode === 'navigate' || url.pathname === '/PolishVerbs/' || url.pathname === '/PolishVerbs/index.html'
  const isFreshAsset =
    url.pathname === '/PolishVerbs/manifest.webmanifest' || url.pathname === '/PolishVerbs/favicon.svg'

  if (isAppDocument || isFreshAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(cacheName).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/PolishVerbs/index.html'))),
    )
    return
  }

  if (!isSameOrigin) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(cacheName).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
    }),
  )
})
