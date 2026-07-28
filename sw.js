const CACHE = 'shaman-production-v6';
// Everything this app needs is local — no CDN dependency at all — so a
// full precache at install time is enough to make it open and work
// completely offline immediately after installation.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-maskable.png',
  './avatar.png',
];

const OFFLINE_FALLBACK = new Response(
  '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<body style="font-family:sans-serif;background:#0B1E1C;color:#EAF3F0;padding:32px;text-align:center;">' +
  '<h1>Hors connexion</h1><p>Rouvrez cette app une première fois avec internet actif, ' +
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

  if (e.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/')) {
    // Network-first for the shell: always get the latest version when
    // online, but never fail outright when offline — something is always
    // cached, from install onward.
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

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
