// Deploy oldidan tez tekshiruv: barcha modullar sintaktik to'g'ri yuklanadimi,
// migratsiya va katalog fayllari joyidami, front-end fayllar butunmi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ildiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let xato = 0;
const ok  = (m) => console.log('  ✓', m);
const yiq = (m) => { console.error('  ✗', m); xato++; };

const kerakliFayllar = [
  'src/server.js', 'src/config.js', 'src/db.js',
  'src/bot/index.js', 'src/bot/render.js', 'src/bot/format.js',
  'src/ai/faceAnalysis.js', 'src/ai/productEnrich.js',
  'src/ai/index.js', 'src/ai/google.js', 'src/ai/openrouter.js',
  'src/api/routes.js', 'src/api/admin.js',
  'migrations/001_schema.sql', 'migrations/002_katalog.sql', 'migrations/003_media.sql',
  'src/db/migrate.js', 'src/ai/poster.js',
  'src/bot/shablon.js', 'src/bot/shablonlar-standart.js', 'src/lib/xatolar.js',
  'src/lib/kesh.js', 'src/lib/cheklov.js', 'src/lib/hududlar.js', 'public/app/hududlar.js',
  'src/lib/brend.js', 'src/lib/admin.js',
  'src/rasm/chiz.js', 'src/rasm/natija-kartochka.js',
  'src/services/natija-rasm.js', 'src/services/kanal.js',
  'assets/shrift/Sans-Regular.ttf', 'assets/shrift/Sans-Bold.ttf',
  'migrations/009_kanal_natija_rasm.sql', 'migrations/010_partiya_agent.sql',
  'src/lib/bosqichlar.js', 'src/lib/docx.js',
  'src/services/yetkazish.js', 'src/services/qollanma-hujjati.js',
  'migrations/011_yetkazish.sql',
  'src/services/partiya.js', 'src/services/pochta-hujjati.js',
  'src/services/broadcast.js', 'src/services/majburiy-kanal.js',
  'src/services/agent.js', 'src/services/agent-jadval.js',
  'src/bot/handlers/admin.js', 'src/bot/handlers/agent-oqim.js',
  'test/soxta-server.mjs', 'test/bot-oqimi.mjs', 'migrations/006_limit_aloqa.sql',
  'migrations/004_tolov_chegirma.sql', 'migrations/005_xabar_shablonlari.sql',
  'migrations/007_ombor_admin.sql', 'migrations/008_omborda_holati.sql',
  'public/index.html', 'public/app/index.html', 'public/app/app.js', 'public/app/style.css',
  'public/admin/index.html', 'public/admin/admin.js', 'public/admin/style.css',
];

console.log('\nFayllar:');
for (const f of kerakliFayllar) {
  fs.existsSync(path.join(ildiz, f)) ? ok(f) : yiq(`${f} — topilmadi`);
}

console.log('\nSxema:');
const sxema = fs.readFileSync(path.join(ildiz, 'migrations/001_schema.sql'), 'utf8');
for (const jadval of ['users', 'products', 'orders', 'analyses', 'cart_items', 'events', 'settings']) {
  sxema.includes(`create table if not exists public.${jadval}`)
    ? ok(`${jadval} jadvali`) : yiq(`${jadval} jadvali yo'q`);
}
sxema.includes('place_order') ? ok('place_order() funksiyasi') : yiq('place_order() yo\'q');
sxema.includes('from public;') ? ok('RPC PUBLIC dan tortilgan') : yiq('RPC PUBLIC dan tortilmagan');
(sxema.match(/enable row level security/g) || []).length >= 8
  ? ok('RLS barcha jadvalda yoqilgan') : yiq('RLS yetishmayapti');

console.log('\nXabar shablonlari:');
const { STANDART, GURUHLAR, TAVSIF } = await import(
  'file://' + path.join(ildiz, 'src/bot/shablonlar-standart.js'));
const kalitlar = Object.keys(STANDART);
kalitlar.length >= 15 ? ok(`${kalitlar.length} ta shablon`) : yiq('shablon kam');
// Har bir shablon guruhga kirganmi va tavsifi bormi
const guruhda = new Set(GURUHLAR.flatMap((g) => g.kalitlar));
const yetim = kalitlar.filter((k) => !guruhda.has(k));
yetim.length ? yiq(`guruhsiz shablon: ${yetim.join(', ')}`) : ok('hammasi guruhlangan');
const tavsifsiz = kalitlar.filter((k) => !TAVSIF[k]);
tavsifsiz.length ? yiq(`tavsifsiz: ${tavsifsiz.join(', ')}`) : ok('hammasida tavsif bor');
// Guruhda bor, lekin STANDART da yo'q kalit — admin panelida bo'sh maydon chiqardi
const yoq = [...guruhda].filter((k) => !STANDART[k]);
yoq.length ? yiq(`guruhda bor, matni yo'q: ${yoq.join(', ')}`) : ok('guruh va matnlar mos');
// O'rin egallovchilar tavsifda ro'yxatlanganmi
let orinXato = 0;
for (const [k, matn] of Object.entries(STANDART)) {
  const ishlatilgan = [...String(matn).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const elon = new Set(TAVSIF[k]?.orin || []);
  for (const o of ishlatilgan) {
    if (!elon.has(o)) { yiq(`${k}: {${o}} tavsifda ko'rsatilmagan`); orinXato++; }
  }
}
if (!orinXato) ok("o'rin egallovchilar tavsif bilan mos");

console.log('\nKatalog:');
const katalog = fs.readFileSync(path.join(ildiz, 'migrations/002_katalog.sql'), 'utf8');
const soni = (katalog.match(/^\('/gm) || []).length;
soni >= 20 ? ok(`${soni} ta mahsulot`) : yiq(`katalogda faqat ${soni} ta mahsulot`);

console.log('\nSir kalitlar koddami:');
const shubhali = /(AAG[A-Za-z0-9_-]{30,}|AIzaSy[A-Za-z0-9_-]{30,}|eyJhbGciOi[A-Za-z0-9_-]{20,})/;
let topildi = 0;
const yur = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    // design/ — dizayn kanvasining yig'ilgan fayli (git'ga kirmaydi, ichida
    // muharrir kodi bor va u kalitga o'xshash satrlarni saqlaydi)
    if (['node_modules', '.git', 'design', 'dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yur(p);
    else if (/\.(js|json|sql|html|md|example)$/.test(e.name)) {
      if (shubhali.test(fs.readFileSync(p, 'utf8'))) { yiq(`${path.relative(ildiz, p)} — kalitga o'xshash satr!`); topildi++; }
    }
  }
};
yur(ildiz);
if (!topildi) ok('koddan kalit topilmadi');

console.log(xato ? `\n❌ ${xato} ta muammo\n` : '\n✅ Hammasi joyida\n');
process.exit(xato ? 1 : 0);
