/*
 * Service worker di Eulero. GENERATO in fase di build da apps/web/pwa/plugin.ts a partire da
 * questo template: la tabella dei file (percorso → revisione) è inserita al posto del segnaposto.
 *
 * Strategia: precarica TUTTO (app, icone, indice e tutti i livelli) e serve da cache, così il
 * gioco funziona offline. Ogni nuova build produce una tabella diversa: all'aggiornamento si
 * scaricano SOLO i file nuovi o cambiati (la cache è indicizzata per percorso+revisione) e si
 * eliminano quelli spariti.
 */
const TABLE = /*__TABLE__*/ {};
const VERSION = '/*__VERSION__*/';
const CACHE = 'eulero-precache';
const SHELL = '/index.html';
const INFO = '/__eulero-info';

const keyOf = (path) => path + '?rev=' + TABLE[path];
const isLevel = (path) => /^\/puzzles\/p-[a-z0-9]+\.json$/.test(path);

async function cachedKeys(cache) {
  return new Set((await cache.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search));
}

async function precache() {
  const cache = await caches.open(CACHE);
  const have = await cachedKeys(cache);
  const paths = Object.keys(TABLE);
  const missing = paths.filter((p) => !have.has(keyOf(p)));
  let added = 0;
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (p) => {
        // 'reload' = ignora la cache HTTP: vogliamo la versione che sta davvero sul server
        const res = await fetch(p, { cache: 'reload' });
        if (!res.ok) throw new Error('precache ' + p + ' → ' + res.status);
        await cache.put(keyOf(p), res);
        if (isLevel(p)) added++;
      }),
    );
  }
  const info = {
    type: 'EULERO_PRECACHED',
    version: VERSION,
    first: !paths.some((p) => have.has(keyOf(p))) && have.size === 0,
    added,
    levels: paths.filter(isLevel).length,
  };
  await cache.put(INFO, new Response(JSON.stringify(info)));
  return info;
}

async function broadcast(info) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) c.postMessage(info);
}

self.addEventListener('install', (event) => {
  // se anche un solo file non si scarica l'installazione fallisce: resta la versione precedente
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const valid = new Set(Object.keys(TABLE).map(keyOf));
      for (const req of await cache.keys()) {
        const u = new URL(req.url);
        if (u.pathname === INFO) continue;
        if (!valid.has(u.pathname + u.search)) await cache.delete(req);
      }
      await self.clients.claim();
      const stored = await cache.match(INFO);
      if (stored) await broadcast(await stored.json());
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navigazioni e "/" → l'app (single page); il resto per percorso esatto
  const path = req.mode === 'navigate' || url.pathname === '/' ? SHELL : url.pathname;
  if (!(path in TABLE)) return; // non precaricato: rete normale

  event.respondWith(
    caches.open(CACHE).then(async (cache) => (await cache.match(keyOf(path))) || fetch(req)),
  );
});
