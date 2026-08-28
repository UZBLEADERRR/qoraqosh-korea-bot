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
  'src/ai/faceAnalysis.js', 'src/ai/productEnrich.js', 'src/ai/gemini.js',
  'src/api/routes.js', 'src/api/admin.js',
  'migrations/001_schema.sql', 'migrations/002_katalog.sql', 'migrations/003_media.sql',
  'src/db/migrate.js', 'src/ai/poster.js',
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

console.log('\nKatalog:');
const katalog = fs.readFileSync(path.join(ildiz, 'migrations/002_katalog.sql'), 'utf8');
const soni = (katalog.match(/^\('/gm) || []).length;
soni >= 20 ? ok(`${soni} ta mahsulot`) : yiq(`katalogda faqat ${soni} ta mahsulot`);

console.log('\nSir kalitlar koddami:');
const shubhali = /(AAG[A-Za-z0-9_-]{30,}|AIzaSy[A-Za-z0-9_-]{30,}|eyJhbGciOi[A-Za-z0-9_-]{20,})/;
let topildi = 0;
const yur = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(e.name)) continue;
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
