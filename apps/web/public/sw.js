// Service worker minimale: il gioco funziona offline dopo la prima visita.
// - asset con hash (/assets/*): cache-first
// - puzzle (/puzzles/*): network-first con ripiego sulla cache
// - navigazione: ripiego sull'index in cache
const CACHE = 'tuttialcuni-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const put = (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)));
  } else if (url.pathname.startsWith('/puzzles/')) {
    e.respondWith(
      fetch(req)
        .then(put)
        .catch(() => caches.match(req)),
    );
  } else if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(put)
        .catch(() => caches.match('/')),
    );
  } else {
    e.respondWith(
      fetch(req)
        .then(put)
        .catch(() => caches.match(req)),
    );
  }
});
