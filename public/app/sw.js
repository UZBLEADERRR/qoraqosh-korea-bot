// Ilova telefonga o'rnatilganda kerak bo'ladigan eng kichik service worker.
//
// Vazifasi ikkita:
//  1) PWA "o'rnatiladigan" bo'lishi uchun ro'yxatdan o'tgan SW kerak;
//  2) qobiq (HTML, CSS, JS, ikonka) keshdan ochilsin — tarmoq sekin
//     bo'lsa ham ilova darrov ko'rinadi.
//
// MA'LUMOT keshlanmaydi: katalog, savat, buyurtma — hammasi tarmoqdan.
// Eski narxni ko'rsatish eng yomon xato bo'lardi.
const KESH = 'kiovo-qobiq-v1';
const QOBIQ = [
  '/app/', '/app/index.html', '/app/style.css', '/app/app.js',
  '/app/ikon.js', '/app/hududlar.js', '/app/manifest.json',
  '/app/ikon-192.png', '/app/ikon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(KESH).then((k) => k.addAll(QOBIQ)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nomlar) => Promise.all(nomlar.filter((n) => n !== KESH).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // API va rasm — faqat tarmoqdan, eskisi ko'rsatilmasin
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/media/')) return;

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const n = r.clone(); caches.open(KESH).then((k) => k.put(e.request, n)); }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/app/index.html'))),
  );
});
