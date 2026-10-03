// HAQIQIY server — HTTP orqali: sahifalar, xavfsizlik sarlavhalari,
// huquqiy sahifalar, assetlinks va brend fayllari.
//
// Boshqa sinovlar marshrutlarni to'g'ridan-to'g'ri chaqiradi; bu fayl
// esa `src/server.js` ni alohida jarayonda ishga tushiradi. Google Play
// aynan shu manzillarni tekshiradi (maxfiylik, hisobni o'chirish,
// assetlinks), shuning uchun ular brauzer ko'radigandek sinaladi.
//
//   DATABASE_URL=postgresql://... node test/sahifalar.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import { soxtaServer } from './soxta-server.mjs';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL kerak.'); process.exit(1); }

const SOXTA = 4483, PORT = 4484;
const srv = await soxtaServer(SOXTA);
const ASOS = `http://127.0.0.1:${PORT}`;
// Sayt manzili haqiqiydagidek www BILAN (www.kiovo.shop) — «www» siz
// variant (localhost) unga yo'naltirilishi kerak, teskarisi emas
const SAYT = `http://www.localhost:${PORT}`;
const SHA = Array.from({ length: 32 }, (_, i) => (i * 7 % 256).toString(16).padStart(2, '0')).join(':');

const server = spawn(process.execPath, ['src/server.js'], {
  env: { ...process.env, PORT: String(PORT), PUBLIC_URL: SAYT,
    BOT_TOKEN: '111111:TEST', ADMIN_LOGIN: 'sinov', ADMIN_PASSWORD: 'parol12345',
    ADMIN_JWT_SECRET: 'x'.repeat(30), TELEGRAM_API: `http://127.0.0.1:${SOXTA}`,
    GEMINI_API: `http://127.0.0.1:${SOXTA}/models`, GEMINI_API_KEY: 'soxta',
    // Bittasi to'g'ri, bittasi buzuq — buzug'i chiqmasligi kerak
    ANDROID_SHA256: `${SHA.toLowerCase()}, buzuq:barmoq:izi` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let jurnal = '';
server.stdout.on('data', (d) => { jurnal += d; });
server.stderr.on('data', (d) => { jurnal += d; });

let ok = 0, xato = 0;
const test = (nom, shart, izoh = '') => {
  if (shart) { console.log(`  ✓ ${nom}${izoh ? ' — ' + izoh : ''}`); ok++; }
  else { console.log(`  ✗ ${nom}${izoh ? ' — ' + izoh : ''}`); xato++; }
};
const yakun = (kod) => { server.kill(); srv.close(); process.exit(kod); };

// Server tayyor bo'lguncha kutamiz
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`${ASOS}/healthz`)).ok) break; } catch { /* hali emas */ }
  await new Promise((r) => setTimeout(r, 250));
}

try {
  console.log('\n── SAHIFALAR VA SARLAVHALAR ──');
  for (const yol of ['/', '/app/', '/skan/', '/admin/', '/buyurtma/']) {
    const r = await fetch(ASOS + yol);
    const html = await r.text();
    test(`${yol} ochiladi`, r.status === 200, String(r.status));
    test(`${yol} da o'rinbosar qolmagan`, !/__(LOGO|BELGI|ASOS)__/.test(html));
    test(`${yol} da CSP bor`, /default-src 'self'/.test(r.headers.get('content-security-policy') || ''));
  }
  const app = await fetch(`${ASOS}/app/`);
  const appHtml = await app.text();
  test('ilovada logotip INLINE (alohida so‘rovsiz)', /<svg class="logo-svg"/.test(appHtml));
  test('brend uslubi ulangan va versiyalangan', /\/umumiy\/brend\.css\?v=[0-9a-f]{8}/.test(appHtml));
  test('HSTS bor', /max-age=31536000/.test(app.headers.get('strict-transport-security') || ''));
  test('kamera FAQAT o‘zimizga, mikrofon va joylashuv hech kimga',
    /camera=\(self\)/.test(app.headers.get('permissions-policy') || '')
      && /microphone=\(\)/.test(app.headers.get('permissions-policy') || '')
      && /geolocation=\(\)/.test(app.headers.get('permissions-policy') || ''));
  test('ilova faqat Telegram Web ichiga joylanadi (clickjacking himoyasi)',
    /frame-ancestors 'self' https:\/\/web\.telegram\.org/.test(app.headers.get('content-security-policy') || ''));
  test('Telegram skripti sahifa boshida YUKLANMAYDI',
    !/<script src="https:\/\/telegram\.org/.test(appHtml) && /__tgTayyor/.test(appHtml));

  console.log('\n── BREND FAYLLARI ──');
  for (const [yol, tur] of [['/umumiy/brend.css', 'text/css'], ['/umumiy/shrift/manrope-latin.woff2', 'font/woff2'],
                            ['/favicon.svg', 'image/svg+xml'], ['/umumiy/logo.svg', 'image/svg+xml'],
                            ['/app/ikon-512.png', 'image/png'], ['/app/ikon-maska.png', 'image/png']]) {
    const r = await fetch(ASOS + yol);
    test(`${yol}`, r.status === 200 && (r.headers.get('content-type') || '').startsWith(tur),
      `${r.status} ${r.headers.get('content-type')}`);
  }
  const m = await (await fetch(`${ASOS}/app/manifest.json`)).json();
  test('manifestda «health» toifasi YO‘Q — Play tibbiy ilova qoidalarini qo‘llamasin',
    !m.categories.includes('health'), m.categories.join(','));
  test('manifest brend rangida', m.theme_color === '#ab0a0c');
  test('maskable ikonka bor', m.icons.some((i) => i.purpose === 'maskable'));

  console.log('\n── GOOGLE PLAY: HUQUQIY SAHIFALAR ──');
  const maxf = await (await fetch(`${ASOS}/maxfiylik`)).text();
  test('maxfiylik siyosati ochiladi', /Maxfiylik siyosati/.test(maxf));
  test('yuz surati Google Gemini’ga yuborilishi aytilgan', /Gemini/.test(maxf));
  test('ma’lumot sotilmasligi aytilgan', /sotilmaydi/.test(maxf));
  test('o‘chirish va yuklab olish yo‘li yozilgan', /Hisobni o‘chirish/.test(maxf) && /yuklab olish/.test(maxf));
  test('Google tekshiruvchisi uchun inglizcha qisqacha', /Summary in English/.test(maxf));
  test('/privacy ham ishlaydi', (await fetch(`${ASOS}/privacy`)).status === 200);
  const ochir = await (await fetch(`${ASOS}/hisobni-ochirish`)).text();
  test('hisobni o‘chirish sahifasi ilovaga olib boradi', /\/app\/\?ochir=1/.test(ochir));
  test('botdagi /ochir ham aytilgan', /\/ochir/.test(ochir));
  test('/delete-account ham ishlaydi', (await fetch(`${ASOS}/delete-account`)).status === 200);
  for (const [nom, html] of [['oferta', await (await fetch(`${ASOS}/oferta`)).text()],
                             ['maxfiylik', maxf], ['hisobni o‘chirish', ochir]]) {
    test(`${nom}: kvadrat qavsdagi to‘ldirilmagan joy YO‘Q`, !/\[(MCHJ|STIR|YURIDIK|\+998 __|email@)/.test(html));
  }
  const xarita = await (await fetch(`${ASOS}/sitemap.xml`)).text();
  test('sayt xaritasida maxfiylik bor', /\/maxfiylik/.test(xarita));

  console.log('\n── ANDROID: ASSETLINKS ──');
  const al = await fetch(`${ASOS}/.well-known/assetlinks.json`);
  const alj = await al.json();
  test('assetlinks JSON qaytadi', al.status === 200 && Array.isArray(alj));
  test('paket nomi to‘g‘ri', alj[0]?.target?.package_name === 'shop.kiovo.app');
  test('barmoq izi KATTA harfda, buzug‘i tashlangan',
    alj[0]?.target?.sha256_cert_fingerprints?.length === 1
      && alj[0].target.sha256_cert_fingerprints[0] === SHA.toUpperCase());

  console.log('\n── DOMEN: asosiy manzil www BILAN ──');
  // Brauzer Host sarlavhasini o'zgartirishga yo'l qo'ymaydi — oddiy http
  const xom = (yol, xost, usul = 'GET') => new Promise((ok_, rad) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: yol, method: usul,
      headers: { Host: xost } }, (j) => { j.resume(); j.on('end', () => ok_(j)); });
    r.on('error', rad); r.end();
  });
  const w0 = await xom('/app/?tab=savat', `www.localhost:${PORT}`);
  test('www dagi sahifa YO‘NALTIRILMAYDI (www siz domen boshqa sayt)', w0.statusCode === 200, String(w0.statusCode));
  const w1 = await xom('/app/?tab=savat', 'localhost');
  test('www siz so‘rov www ga 301 bilan yo‘naltiriladi, yo‘l va so‘rov saqlanadi',
    w1.statusCode === 301 && w1.headers.location === `${SAYT}/app/?tab=savat`, `${w1.statusCode} ${w1.headers.location}`);
  const w2 = await xom('/.well-known/assetlinks.json', 'localhost');
  test('assetlinks hech qachon yo‘naltirilmaydi (Android yo‘naltirishni qabul qilmaydi)', w2.statusCode === 200);
  const w3 = await xom('/tg/webhook', 'localhost', 'POST');
  test('POST (Telegram webhook) yo‘naltirilmaydi', w3.statusCode !== 301, String(w3.statusCode));
  const bosh = await (await fetch(`${ASOS}/`)).text();
  test('sahifalardagi mutlaq havolalar www bilan', bosh.includes(`${SAYT}/`) && !bosh.includes(`http://localhost:${PORT}/`));
  const w5 = await xom('/%E0%A4%A', '127.0.0.1');
  test('buzuq manzil — 400, so‘rov osilib qolmaydi', w5.statusCode === 400, String(w5.statusCode));
  const w6 = await xom('/app/', 'buzuq host[]');
  test('buzuq Host sarlavhasi — javob qaytadi', w6.statusCode > 0, String(w6.statusCode));

  console.log('\n── GOOGLE BILAN KIRISH (QAYTA YO‘NALTIRISH) ──');
  const g = await fetch(`${ASOS}/kirish/google`, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'credential=soxta.token.bu&g_csrf_token=abc' });
  const gh = await g.text();
  test('CSRF cookie bo‘lmasa — kirilmaydi', /Xavfsizlik tekshiruvidan o‘tmadi/.test(gh) && !/localStorage\.setItem/.test(gh));
  const g2 = await (await fetch(`${ASOS}/kirish/google`, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: 'g_csrf_token=abc' },
    body: 'credential=soxta.token.bu&g_csrf_token=abc' })).text();
  test('soxta token bilan — kirilmaydi, ilovaga xato bilan qaytaradi',
    !/localStorage\.setItem/.test(g2) && /kirish_xato=1/.test(g2));

  const sw = await (await fetch(`${ASOS}/app/sw.js`)).text();
  test('service worker versiyalangan', !/__VERSIYA__/.test(sw));
  test('katalog oflayn uchun keshlanadi', /u\.pathname === '\/api\/catalog'/.test(sw));
} catch (e) {
  console.error('Sinov xatosi:', e);
  console.error(jurnal.slice(-1500));
  xato++;
}

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
yakun(xato ? 1 : 0);
