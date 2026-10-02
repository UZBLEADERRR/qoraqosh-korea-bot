// Ilova telefonga o'rnatilganda kerak bo'ladigan eng kichik service worker.
//
// Vazifasi ikkita:
//  1) PWA "o'rnatiladigan" bo'lishi uchun ro'yxatdan o'tgan SW kerak;
//  2) qobiq (HTML, CSS, JS, ikonka) keshdan ochilsin — tarmoq sekin
//     bo'lsa ham ilova darrov ko'rinadi.
//
// Katalog faqat OFLAYN zaxira sifatida keshlanadi (pastga qarang);
// savat va buyurtma — hamisha tarmoqdan. Shaxsiy ma'lumotning qurilmadagi
// nusxasini app.js o'zi saqlaydi (`kiovo_meniki`).
// Versiyani SERVER qo'yadi (src/server.js). Har deployda o'zgaradi,
// shuning uchun brauzer yangi service worker ni o'rnatadi va eski
// keshni tashlaydi. Ilgari bu nom qotib turgani uchun eski qobiq
// oylab saqlanib qolishi mumkin edi.
const VERSIYA = '__VERSIYA__';
const KESH = `kiovo-${VERSIYA}`;

// Faqat manzili O'ZGARMAYDIGAN fayllar oldindan keshlanadi.
// app.js va style.css versiyalangan manzil bilan keladi
// ("app.js?v=…") — ular so'ralganda keshga tushadi.
const QOBIQ = ['/app/', '/app/manifest.json', '/app/ikon-192.png', '/app/ikon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(KESH).then((k) => k.addAll(QOBIQ)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nomlar) => Promise.all(nomlar.filter((n) => n !== KESH && n !== RASM_KESH)
      .map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Mahsulot rasmlari alohida keshda — versiya almashganda o'chmaydi
// (rasm hech qachon o'zgarmaydi: yangisi yangi id oladi). Hajmi cheklangan.
const RASM_KESH = 'kiovo-rasm';
const RASM_MAKS = 160;

async function rasmniKeshla(so, javob) {
  const k = await caches.open(RASM_KESH);
  await k.put(so, javob);
  const kalitlar = await k.keys();
  for (const eski of kalitlar.slice(0, Math.max(0, kalitlar.length - RASM_MAKS))) await k.delete(eski);
}

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;

  // KATALOG — avval tarmoq, internet yo'q bo'lsa oxirgi nusxa. Eski
  // narxni TARMOQ bor paytda ko'rsatish eng yomon xato bo'lardi, shuning
  // uchun kesh faqat oflaynda ishlaydi va ilova buni ochiq aytadi.
  if (u.pathname === '/api/catalog') {
    e.respondWith(fetch(e.request)
      .then((r) => {
        if (r.ok) { const n = r.clone(); caches.open(KESH).then((k) => k.put('/api/catalog', n)); }
        return r;
      })
      .catch(() => caches.match('/api/catalog').then((r) => r || Response.error())));
    return;
  }
  // Mahsulot rasmlari (kichraytirilgan, ochiq) — keshdan, bo'lmasa tarmoqdan.
  // Chek va tahlil rasmlari bu yerga TUSHMAYDI: ular `?w=` siz va tokenli.
  if (u.pathname.startsWith('/media/') && u.searchParams.has('w') && !u.searchParams.has('t')) {
    e.respondWith(caches.match(e.request, { cacheName: RASM_KESH }).then((bor) => bor
      || fetch(e.request).then((r) => {
        if (r.ok) rasmniKeshla(e.request, r.clone()).catch(() => {});
        return r;
      })));
    return;
  }
  // Boshqa API va shaxsiy rasm — faqat tarmoqdan
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/media/')) return;

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const n = r.clone(); caches.open(KESH).then((k) => k.put(e.request, n)); }
        return r;
      })
      // Qobiq '/app/' kaliti bilan keshlangan ('/app/index.html' emas)
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/app/'))),
  );
});

// ── Bildirishnoma (push) ──
// Server buyurtma holati o'zgarganda yuboradi (src/services/push.js).
// Android ilovada u KiOVO nomi va ikonkasi bilan chiqadi.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { matn: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.sarlavha || 'KiOVO', {
    body: d.matn || '',
    icon: '/app/ikon-192.png',
    badge: '/app/bildirishnoma.png',
    tag: d.teg || undefined,
    renotify: Boolean(d.teg),
    lang: 'uz',
    data: { havola: d.havola || '/app/' },
  }));
});

// Bosilganda: ilova ochiq bo'lsa — o'sha oynaga o'tib kerakli joyni
// ochadi, yopiq bo'lsa — yangisini ochadi
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const havola = new URL(e.notification.data?.havola || '/app/', self.location.origin);
  if (havola.origin !== self.location.origin) return;
  e.waitUntil((async () => {
    const oynalar = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const bor = oynalar.find((o) => new URL(o.url).pathname.startsWith('/app'));
    if (bor) {
      bor.postMessage({ tur: 'bildirishnoma', havola: havola.pathname + havola.search });
      return bor.focus();
    }
    return self.clients.openWindow(havola.href);
  })());
});
