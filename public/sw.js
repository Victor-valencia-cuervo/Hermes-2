/* Hermes offline: App Shell + assets en caché.
 * Si cambias mascotas/videos/css/js, sube la versión para forzar actualización. */
const CACHE = 'hermes-v13';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/robots.txt', '/sitemap.xml', '/icon/hermes-icon.png', '/icon/Roxy-img-white.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // SEO: robots/sitemap/manifest siempre frescos, sin interceptar.
  if (url.origin === self.location.origin && ['/robots.txt', '/sitemap.xml', '/favicon.svg'].includes(url.pathname)) return;
  // Los audios/videos con Range los deja al navegador (si no, se rompe la reproducción).
  if (request.headers.has('range')) return;

  // APIs de música (Piped, Audius, Deezer, iTunes, YouTube): directo a la red, sin pasar por
  // el Service Worker (cachearlas solo agregaba espera y llenaba el almacenamiento).
  if (url.origin !== self.location.origin && /piped|invidious|audius\.co|api\.deezer\.com|itunes\.apple\.com|youtube\.com|youtube-nocookie\.com|googlevideo\.com/i.test(url.hostname)) return;

  // Navegación: red primero, pero si tarda más de 2.5 s (celular lento, tras días sin abrir)
  // abre YA el index guardado y la red actualiza para la próxima vez.
  if (request.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = (await caches.match('/index.html')) || (await caches.match('/'));
      const net = fetch(request).then((r) => {
        if (r && r.ok) {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', cp));
        }
        return r;
      });
      if (!cached) return net;
      return Promise.race([
        net.catch(() => cached),
        new Promise((res) => setTimeout(() => res(cached), 2500)),
      ]);
    })());
    return;
  }

  // Archivos propios (assets, pets, caritas, icon, videos): caché primero + revalidar.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((hit) => {
        const net = fetch(request)
          .then((r) => {
            if (r && r.ok) {
              const cp = r.clone();
              caches.open(CACHE).then((c) => c.put(request, cp));
            }
            return r;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  // Terceros (fuentes, clima, streaming): red primero, caché como respaldo.
  e.respondWith(
    fetch(request)
      .then((r) => {
        if (r && (r.ok || r.type === 'opaque')) {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(request, cp)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(request)),
  );
});
