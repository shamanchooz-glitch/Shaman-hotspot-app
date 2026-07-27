const CACHE = 'shaman-hotspot-v5';
// The HTML shell IS precached now (below), so the app is guaranteed to
// open offline immediately after install — not only after a first
// successful online navigation. It's still refreshed from the network
// on every online visit (see the fetch handler), so a fix pushed to
// GitHub is never hidden by a stale cache for long.
// jsQR is cached too: it's the offline QR-scanning fallback for phones
// without a native barcode detector, and it's only ever reachable from a
// CDN — so it must be captured at install time as well.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js',
];

// A tiny built-in fallback so a navigation can NEVER resolve to nothing
// (which is what causes Chrome's ERR_FAILED instead of a usable page).
// In practice this should only ever be seen if the app is opened offline
// on a device where install/caching itself failed.
const OFFLINE_FALLBACK = new Response(
  '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<body style="font-family:sans-serif;background:#0B1E1C;color:#EAF3F0;padding:32px;text-align:center;">' +
  '<h1>Hors connexion</h1><p>Rouvrez cette app une fois avec le Wi-Fi ou les données mobiles actives, ' +
  'puis elle fonctionnera hors connexion ensuite.</p></body>',
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

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
  // cached — and something is now ALWAYS cached, from install onward.
  if (e.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() =>
          caches.match(e.request)
            .then((cached) => cached || caches.match('./index.html'))
            .then((cached) => cached || OFFLINE_FALLBACK)
        )
    );
    return;
  }

  // Cache-first for static assets (icon, manifest, jsQR). Anything fetched
  // successfully here also gets cached on the fly, so the app keeps working
  // offline even for a resource that wasn't in the initial precache list.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
