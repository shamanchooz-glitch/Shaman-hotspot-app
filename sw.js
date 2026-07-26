const CACHE = 'shaman-hotspot-v3';
// Only static, rarely-changed assets are cache-first. The HTML shell is
// deliberately NOT pre-cached here — see the fetch handler below — so
// that updates to index.html are never masked by a stale cache again.
// jsQR is cached here too: it's the offline QR-scanning fallback for
// phones without a native barcode detector, and it's only ever reachable
// from a CDN — so the very first (online) open must capture it, or
// scanning would silently break the moment the phone has no signal.
const ASSETS = [
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Never intercept requests to the hotspot's own captive portal.
  if (url.includes('/login') || url.includes('10.10.10')) return;

  // Network-first for the page itself (navigations and index.html): the
  // app is small, so always fetching the latest version costs nothing,
  // and it guarantees a fix pushed to GitHub is never hidden by a cache.
  // Only if the network is unreachable do we fall back to whatever was
  // last cached, so the app still opens offline.
  if (e.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (icon, manifest, jsQR). Anything fetched
  // successfully here also gets cached on the fly, so the app keeps working
  // offline even for a resource that wasn't in the initial precache list.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
