/* ═══════════════════════════════════════════════
   Service Worker — Lectio Divina (mode hors-ligne)
   Stratégie :
   - index.html        → network-first, cache fallback
   - /api/*            → network only (pas de cache)
   - *.pdf             → network only (trop volumineux)
   - autres (fonts…)   → stale-while-revalidate
═══════════════════════════════════════════════ */

const CACHE = 'lectio-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('/index.html'))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Toujours réseau pour les APIs et les PDFs
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.endsWith('.pdf'))   return;
  // Toujours réseau pour les ressources cross-origin (Google Fonts, CDN)
  if (url.hostname !== self.location.hostname) return;

  // Navigation (HTML) : réseau d'abord, cache en secours
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Autres assets : stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    )
  );
});
