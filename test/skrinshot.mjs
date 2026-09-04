// Admin botga skrinshot tashlaydi — mahsulot o'zi katalogga tushadimi.
//
//   DATABASE_URL=postgresql://... node test/skrinshot.mjs
import { soxtaServer, yuborilgan } from './soxta-server.mjs';

const PORT = 4482;
const srv = await soxtaServer(PORT);

process.env.BOT_TOKEN        = '111111:TEST';
process.env.ADMIN_LOGIN      = 'a';
process.env.ADMIN_PASSWORD   = 'parol12345';
process.env.ADMIN_JWT_SECRET = 'x'.repeat(30);
process.env.TELEGRAM_API     = `http://127.0.0.1:${PORT}`;
process.env.GEMINI_API       = `http://127.0.0.1:${PORT}/models`;
process.env.GEMINI_API_KEY   = 'soxta';
process.env.PUBLIC_URL       = 'https://sinov.example';
process.env.ADMIN_TELEGRAM_IDS = '700009';
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL kerak.'); process.exit(1); }

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, qatorlar, qiymat, pool } = await import('../src/db.js');
const { yangilanish } = await import('../src/bot/index.js');
const { adminRoutes } = await import('../src/api/admin.js');
const { issueAdminToken } = await import('../src/lib/auth.js');
const { Readable } = await import('node:stream');
const adminToken = issueAdminToken({ rol: 'admin' });

let ok = 0, xato = 0;
const test = (n, c, i = '') => { c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++)
                                  : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++); };
const kut = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const hammasi = () => yuborilgan.map((x) => x.text || '').join('\n');

const chaqirAdmin = (yol, usul, tana) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json',
               'content-length': String(bayt.length) },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const bolaklar = [];
  const javob = { statusCode: 200, headersSent: false,
    writeHead(k) { this.statusCode = k; return this; }, setHeader() {},
    end(x) { if (x) bolaklar.push(x); res({ kod: this.statusCode,
      tana: JSON.parse(Buffer.concat(bolaklar.map(Buffer.from)).toString() || '{}') }); } };
  adminRoutes(req, javob, yol).catch((e) => res({ kod: 500, tana: { error: e.message } }));
});

const TG = '700009';
await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at, is_admin)
  values ($1,'Admin','+998901112233',30, now(), true)
  on conflict (telegram_id) do update set is_admin = true, agreed_at = now()`, [TG]);
// Oldingi yurishdan qolgan sinov mahsulotlari qolmasin
await sorov(`delete from products where brand = 'Daiso'
              and (name like 'Green Tea Foam Cleanser%' or name like 'Hair Removal Stick%')`);
await sorov(`delete from categories where slug = 'aksessuar'`);

const yoz = async (t) => { yuborilgan.length = 0;
  await yangilanish({ message: { message_id: 1, date: 0, chat: { id: Number(TG), type: 'private' },
    from: { id: Number(TG) }, text: t } }); await kut(); };
const rasmYubor = async (n) => yangilanish({ message: {
  message_id: 100 + n, date: 0, chat: { id: Number(TG), type: 'private' },
  from: { id: Number(TG) }, photo: [{ file_id: `foto${n}`, file_size: 90000 }] } });

console.log('\n== BOTDAN SKRINSHOT BILAN QO‘SHISH ==');

await yoz('/qosh');
test('rejim ochildi', /Skrinshotdan mahsulot/.test(hammasi()));
test('narx qoidasi tushuntirildi', /KRW ×/.test(hammasi()), hammasi().match(/KRW × [\d.]+/)?.[0]);

const oldin = await qiymat('select count(*)::int from products where is_active');
yuborilgan.length = 0;
for (let i = 1; i <= 4; i++) await rasmYubor(i);
// Navbat bittalab ishlaydi — tugashini kutamiz
for (let i = 0; i < 60; i++) {
  const n = await qiymat('select count(*)::int from products where is_active');
  if (n >= oldin + 4) break;
  await kut(250);
}
const keyin = await qiymat('select count(*)::int from products where is_active');
test('4 ta skrinshotdan 4 ta mahsulot', keyin === oldin + 4, `${oldin} → ${keyin}`);

const yangilar = await qatorlar(
  `select p.*, c.slug as toifa, c.name as toifa_nom from products p
     left join categories c on c.id = p.category_id
    where p.brand = 'Daiso' and (p.name like 'Green Tea Foam Cleanser%'
       or p.name like 'Hair Removal Stick%')
    order by p.id`);
test('mahsulotlar topildi', yangilar.length === 4, `${yangilar.length} ta`);
test('ombor 100 dona qilib qo‘yildi', yangilar.every((p) => p.stock === 100),
  yangilar.map((p) => p.stock).join(', '));
test('narx hisoblandi', yangilar.every((p) => p.price > 0),
  yangilar.map((p) => p.price).join(', '));

// 3200 KRW × 9.5 = 30 400 tannarx; 120 g -> 2 bosqich × 15 000 = 30 000 pochta
const p1 = yangilar[0];
test('tannarx KRW dan hisoblandi', p1.cost_price === Math.round(3200 * 9.5),
  `${p1.cost_price} (kutilgan ${Math.round(3200 * 9.5)})`);
test('narx tannarx + pochtadan katta', p1.price > p1.cost_price + 30000,
  `${p1.price} > ${p1.cost_price + 30000}`);
test('narx 1000 ga yaxlitlandi', p1.price % 1000 === 0, String(p1.price));
test('og‘irlik saqlandi', p1.ogirlik === 120, String(p1.ogirlik));
test('rasm posterga bog‘landi', yangilar.every((p) => p.poster_id), 
  `${yangilar.filter((p) => p.poster_id).length}/4`);
test('katalogda faol', yangilar.every((p) => p.is_active));

// AI mos toifa topmasa yangisini o'zi ochadi
const yangiToifa = yangilar.find((p) => p.name.startsWith('Hair Removal'));
test('mos toifa yo‘q mahsulotga YANGI bo‘lim ochildi',
  yangiToifa?.toifa_nom === 'Aksessuar', yangiToifa?.toifa_nom || '—');
test('mos toifadagi mahsulot o‘z bo‘limiga tushdi',
  yangilar.find((p) => p.name.startsWith('Green Tea'))?.toifa === 'tozalash');

// Kalit so'zlar orqa fonda yoziladi
for (let i = 0; i < 20; i++) {
  const n = await qiymat(`select count(*)::int from products
                           where id = $1 and array_length(kalit_sozlar,1) > 0`, [p1.id]);
  if (n) break;
  await kut(200);
}
test('qidiruv kalit so‘zlari qo‘shildi',
  (await qiymat(`select array_length(kalit_sozlar,1) from products where id = $1`, [p1.id])) > 0);

yuborilgan.length = 0;
await yoz('/tugat');
test('hisobot yuborildi', /Tayyor/.test(hammasi()));
test('hisobotda soni bor', /Katalogga qo‘shildi/.test(hammasi()));
test('havola haqida eslatildi', /Havolalarni admin panelda/.test(hammasi()));

console.log('\n== ADMIN PANEL: HAVOLASIZLAR VA BO‘LIMLAR ==');

const hv = await chaqirAdmin('/api/admin/havolasiz', 'GET');
test('havolasizlar ro‘yxati keldi', hv.kod === 200 && Array.isArray(hv.tana.mahsulotlar),
  `${hv.tana.mahsulotlar?.length} ta`);
test('yangi mahsulotlar shu ro‘yxatda',
  yangilar.every((p) => hv.tana.mahsulotlar.some((x) => x.id === p.id)));

const hs = await chaqirAdmin('/api/admin/mahsulot-havola', 'POST',
  { id: p1.id, manba_url: 'https://www.daiso.co.kr/product/1234' });
test('havola saqlandi', hs.kod === 200, `kod=${hs.kod} ${hs.tana.error || ''}`);
test('manba aniqlandi',
  (await qator('select manba from products where id = $1', [p1.id]))?.manba === 'daiso');
const hv2 = await chaqirAdmin('/api/admin/havolasiz', 'GET');
test('havola qo‘yilgach ro‘yxatdan chiqdi',
  !hv2.tana.mahsulotlar.some((x) => x.id === p1.id));

const yomon = await chaqirAdmin('/api/admin/mahsulot-havola', 'POST',
  { id: p1.id, manba_url: 'daiso.co.kr/product/1' });
test('http‘siz havola rad etildi', yomon.kod === 400, `kod=${yomon.kod}`);

const t1 = await chaqirAdmin('/api/admin/toifa', 'POST',
  { name: 'Soch parvarishi', emoji: '💇', sort: 95 });
test('bo‘lim qo‘shildi', t1.kod === 200 && t1.tana.toifa?.slug === 'soch-parvarishi',
  t1.tana.toifa?.slug);
const tl = await chaqirAdmin('/api/admin/toifalar', 'GET');
test('bo‘limlar ro‘yxatida mahsulot soni bor',
  tl.tana.toifalar.some((x) => x.slug === 'tozalash' && x.soni > 0));
const t2 = await chaqirAdmin('/api/admin/toifa', 'POST',
  { id: t1.tana.toifa.id, name: 'Soch va tana', sort: 96 });
test('bo‘lim nomi o‘zgardi', t2.tana.toifa?.name === 'Soch va tana', t2.tana.toifa?.name);
const t3 = await chaqirAdmin('/api/admin/toifa', 'DELETE', { id: t1.tana.toifa.id });
test('bo‘lim o‘chirildi', t3.kod === 200);

console.log('\n== UZUM NARX MOSLIGI ==');
{
  const { mosKeladimi } = await import('../src/services/uzum-narx.js');
  test('brend va so‘zlar mos kelsa — moslik bor',
    mosKeladimi('Heartleaf Pore Cleansing Oil', 'Anua', 'Anua Heartleaf Pore Control Cleansing Oil 200ml'));
  test('boshqa brend — moslik yo‘q',
    !mosKeladimi('Heartleaf Pore Cleansing Oil', 'Anua', 'COSRX Heartleaf Cleansing Oil'));
  test('faqat umumiy so‘z mos kelsa — moslik yo‘q',
    !mosKeladimi('Green Tea Foam Cleanser', 'Innisfree', 'Innisfree Sunscreen SPF50'));
}

console.log(`\n${xato ? '✗' : '✓'} ${ok} o‘tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
