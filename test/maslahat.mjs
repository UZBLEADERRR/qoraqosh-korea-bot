// AI maslahatchi: /api/maslahat yo'lini haqiqiy marshrutlash bilan sinaydi.
// Soxta AI qasddan katalogda YO'Q id (999) ni ham qaytaradi — u tashlanishi kerak,
// aks holda ilovada bosib bo'lmaydigan mahsulot ko'rinadi.
//
//   DATABASE_URL=postgresql://... node test/maslahat.mjs
import crypto from 'node:crypto';
import { soxtaServer, aiHisobi } from './soxta-server.mjs';

const PORT = 4481;
const srv = await soxtaServer(PORT);

process.env.BOT_TOKEN        = '111111:TEST';
process.env.ADMIN_LOGIN      = 'a';
process.env.ADMIN_PASSWORD   = 'parol12345';
process.env.ADMIN_JWT_SECRET = 'x'.repeat(30);
process.env.TELEGRAM_API     = `http://127.0.0.1:${PORT}`;
process.env.GEMINI_API       = `http://127.0.0.1:${PORT}/models`;
process.env.GEMINI_API_KEY   = 'soxta';
process.env.PUBLIC_URL       = 'https://sinov.example';
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL kerak.'); process.exit(1); }

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, qiymat, pool } = await import('../src/db.js');
const { apiRoutes } = await import('../src/api/routes.js');
const { Readable } = await import('node:stream');

let ok = 0, xato = 0;
const test = (n, c, i = '') => { c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++)
                                   : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++); };

// --- Haqiqiy initData imzosi (auth.js ni chetlab o'tmaymiz) ---
function initData(id) {
  const p = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id, first_name: 'Sinov' }),
  });
  const tekshir = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const sir = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', sir).update(tekshir).digest('hex'));
  return p.toString();
}

const chaqir = (yol, usul, tana, imzo) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { 'content-type': 'application/json', 'content-length': String(bayt.length),
               ...(imzo === null ? {} : { 'x-init-data': imzo ?? initData(910001) }) },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const bolaklar = [];
  const javob = {
    statusCode: 200, headersSent: false,
    writeHead(k) { this.statusCode = k; return this; },
    setHeader() {},
    end(x) { if (x) bolaklar.push(x); res({ kod: this.statusCode,
      tana: JSON.parse(Buffer.concat(bolaklar.map(Buffer.from)).toString() || '{}') }); },
  };
  apiRoutes(req, javob, yol.split('?')[0])
    .catch((e) => res({ kod: 500, tana: { error: e.message } }));
});

console.log('\n== AI MASLAHATCHI ==');

// Katalogda kamida bitta faol mahsulot bo'lsin (soxta AI id=1 ni tavsiya qiladi)
const bor = await qator(`select id from products where is_active and id = 1`);
if (!bor) {
  await sorov(`insert into products (id, name, brand, price, stock, is_active, step)
    values (1,'Sinov Hydro Serum','KiOVO',89000,10,true,'davolash')
    on conflict (id) do update set is_active = true, stock = 10`);
}

const oldin = aiHisobi.jami;
const r = await chaqir('/api/maslahat', 'POST', { savol: 'Yuzim juda quruq, nima yordam beradi?' });
test('javob 200 keldi', r.kod === 200, `kod=${r.kod} ${r.tana.error || ''}`);
test('AI chaqirildi', aiHisobi.jami > oldin);
test('matnli javob bor', typeof r.tana.javob === 'string' && r.tana.javob.length > 10);
test('turi to‘g‘ri', r.tana.turi === 'tavsiya', r.tana.turi);
test('yo‘q mahsulot (id=999) tashlandi',
  (r.tana.tavsiya || []).every((t) => t.product_id !== 999),
  (r.tana.tavsiya || []).map((t) => t.product_id).join(', '));
test('tavsiyaga to‘liq kartochka qo‘shildi',
  Boolean(r.tana.tavsiya?.[0]?.mahsulot?.name && r.tana.tavsiya[0].mahsulot.price > 0),
  r.tana.tavsiya?.[0]?.mahsulot?.name || '—');
test('sabab bor', Boolean(r.tana.tavsiya?.[0]?.sabab));
test('qanday ishlatish aytilgan', Boolean(r.tana.tavsiya?.[0]?.qanday));
test('keyingi savol takliflari bor', (r.tana.takliflar || []).length >= 1,
  (r.tana.takliflar || []).join(' / '));

// --- TO'PLAM ---
test('to‘plam qaytdi', Boolean(r.tana.toplam?.nom), r.tana.toplam?.nom || '—');
test('to‘plamda bir nechta mahsulot', (r.tana.tavsiya || []).length > 1,
  `${r.tana.tavsiya?.length} ta`);
test('bosqichlar tartib bilan',
  (r.tana.tavsiya || []).every((t, i, a) => i === 0 || a[i - 1].tartib <= t.tartib),
  (r.tana.tavsiya || []).map((t) => `${t.tartib}.${t.bosqich}`).join(' → '));

// --- SOF MASLAHAT: mahsulot TAVSIYA QILINMAYDI ---
// "Akne nega chiqadi" degan savolga mahsulot tiqishtirish — maslahatchini
// sotuvchiga aylantiradi va ishonchni yo'qotadi.
globalThis.AI_JAVOB = true;
const jv = await chaqir('/api/maslahat', 'POST', { savol: 'Akne nega chiqadi?' });
test('sof savolga "javob" turi keldi', jv.tana.turi === 'javob', jv.tana.turi);
test('javobda mahsulot KO‘RSATILMAYDI', (jv.tana.tavsiya || []).length === 0,
  `${jv.tana.tavsiya?.length} ta`);
test('javob formatlangan (sarlavha va qadamlar bor)',
  /##/.test(jv.tana.javob) && /1\./.test(jv.tana.javob));

// --- ANIQLASHTIRUVCHI SAVOL ---
globalThis.AI_SAVOL = true;
const sv = await chaqir('/api/maslahat', 'POST', { savol: 'Krem kerak' });
test('AI aniqlashtiruvchi savol berdi', sv.tana.turi === 'savol', sv.tana.turi);
test('savol matni bor', Boolean(sv.tana.savol?.matn), sv.tana.savol?.matn);
test('tayyor variantlar berildi', (sv.tana.savol?.variantlar || []).length >= 2,
  (sv.tana.savol?.variantlar || []).join(' / '));
test('rasm so‘raldi', sv.tana.savol?.rasm_kerak === true);
test('savol paytida tavsiya BO‘SH', (sv.tana.tavsiya || []).length === 0);

// --- RASM BILAN SAVOL ---
const rasmB64 = Buffer.alloc(400, 7).toString('base64');
const rs = await chaqir('/api/maslahat', 'POST',
  { savol: 'Shu toshma nima?', rasm: rasmB64, mime: 'image/jpeg' });
test('rasm bilan ham javob keldi', rs.kod === 200, `kod=${rs.kod} ${rs.tana.error || ''}`);

// --- RASM: KUNLIK CHEGARA ---
// Rasm eng qimmat chaqiruv. Chegarasiz bitta odam butun kunlik
// kvotani yeb qo'yishi mumkin edi.
console.log('\n== RASM CHEGARASI ==');
{
  const u = await qator(`select id from users where telegram_id = '910001'`);
  await sorov(`delete from events where user_id = $1 and type = 'maslahat_rasm'`, [u.id]);
  await sorov(`update settings set value = '2'::jsonb where key = 'limit_maslahat_rasm'`);

  const b1 = await chaqir('/api/maslahat', 'POST',
    { savol: 'Shu toshma nima?', rasm: rasmB64, mime: 'image/jpeg' });
  test('1-rasm o‘tdi', b1.kod === 200 && !b1.tana.rasm_otkazildi,
    `kod=${b1.kod} otkazildi=${b1.tana.rasm_otkazildi}`);
  test('qolgani ko‘rsatiladi', b1.tana.rasm_limit?.qolgan === 1,
    JSON.stringify(b1.tana.rasm_limit));

  const b2 = await chaqir('/api/maslahat', 'POST',
    { savol: 'Yana bir surat', rasm: rasmB64, mime: 'image/jpeg' });
  test('2-rasm ham o‘tdi', b2.kod === 200 && !b2.tana.rasm_otkazildi);
  test('chegara tugadi', b2.tana.rasm_limit?.qolgan === 0,
    JSON.stringify(b2.tana.rasm_limit));

  // 3-si: rasm O'QILMAYDI, lekin savolning o'zi ishlayveradi —
  // odamni butunlay to'xtatib qo'ymaymiz
  const b3 = await chaqir('/api/maslahat', 'POST',
    { savol: 'Uchinchi surat, terim nega quruq?', rasm: rasmB64, mime: 'image/jpeg' });
  test('3-rasmda ham JAVOB keladi', b3.kod === 200, `kod=${b3.kod}`);
  test('rasm o‘tkazib yuborildi', b3.tana.rasm_otkazildi === true,
    String(b3.tana.rasm_otkazildi));
  test('javob matni bo‘sh emas', String(b3.tana.javob || '').length > 5);

  // O'tkazib yuborilgan rasm HISOBGA OLINMAYDI — aks holda chegara
  // o'z-o'zidan cheksiz o'sib ketardi
  const soni = await qiymat(
    `select count(*)::int from events where user_id = $1 and type = 'maslahat_rasm'`, [u.id]);
  test('o‘tkazilgan rasm hisobga olinmaydi', soni === 2, `${soni} ta`);

  // Faqat RASM yuborilsa (savolsiz) — aniq xato, chunki javob berish
  // uchun hech narsa qolmaydi
  const b4 = await chaqir('/api/maslahat', 'POST', { rasm: rasmB64, mime: 'image/jpeg' });
  test('savolsiz rasmda aniq xato', b4.kod === 429 && /rasm/i.test(b4.tana.error || ''),
    `${b4.kod} ${b4.tana.error}`);

  // Rasmsiz savol chegaradan keyin ham bemalol ishlaydi
  const b5 = await chaqir('/api/maslahat', 'POST', { savol: 'Matn bilan savol' });
  test('rasmsiz savol cheklanmaydi', b5.kod === 200, `kod=${b5.kod}`);

  await sorov(`update settings set value = '3'::jsonb where key = 'limit_maslahat_rasm'`);
  await sorov(`delete from events where user_id = $1 and type = 'maslahat_rasm'`, [u.id]);
}

// --- TOKEN TEJASH: KATALOG TANLOVI ---
// Butun katalog har savolda yuborilardi. 300 mahsulotda bu har
// savolga o'n minglab token demakdi.
console.log('\n== KATALOG TANLOVI ==');
{
  const { katalogniTanla, sozlar } = await import('../src/ai/katalog-tanlov.js');

  const yasa = (n) => Array.from({ length: n }, (_, i) => ({
    id: i + 1, name: `Mahsulot ${i + 1}`, brand: 'X',
    step: ['tozalash', 'toner', 'serum', 'krem', 'himoya'][i % 5],
    concerns: i % 7 === 0 ? ['akne'] : ['quruqlik'],
    actives: i % 11 === 0 ? ['salicylic acid'] : [],
    skin_types: ['aralash'], kalit_sozlar: [], price: 100000, stock: 5, sold_count: i,
  }));

  const kichik = katalogniTanla(yasa(20), { savol: 'akne', chegara: 60 });
  test('kichik katalog to‘liq ketadi', kichik.tanlandi === 20, `${kichik.tanlandi}/20`);

  const katta = yasa(300);
  const t = katalogniTanla(katta, { savol: 'aknega qarshi nimadir kerak', chegara: 60 });
  test('KATTA KATALOG QISQARDI', t.tanlandi === 60, `${t.tanlandi}/${t.jami}`);
  const akneli = t.royxat.filter((p) => (p.concerns || []).includes('akne')).length;
  test('mos mahsulotlar tanlandi', akneli >= 20, `${akneli} ta akneli`);

  // QAMROV: model to'plam tuzishi uchun har bosqichdan mahsulot kerak
  const bosqichlar = new Set(t.royxat.map((p) => p.step));
  test('HAR BOSQICH vakili bor', bosqichlar.size === 5,
    [...bosqichlar].join(', '));
  for (const b of ['tozalash', 'toner', 'serum', 'krem', 'himoya']) {
    const n = t.royxat.filter((p) => p.step === b).length;
    if (n < 2) test(`«${b}» bosqichidan yetarli`, false, `${n} ta`);
  }
  test('har bosqichdan kamida 2 ta',
    ['tozalash', 'toner', 'serum', 'krem', 'himoya']
      .every((b) => t.royxat.filter((p) => p.step === b).length >= 2));

  // Takror bo'lmasin — bitta mahsulot ikki marta ketsa token behuda
  test('takror yo‘q', new Set(t.royxat.map((p) => p.id)).size === t.royxat.length);

  // Vaqtinchalik ball maydoni mahsulotda qolib ketmasin
  test('vaqtinchalik maydon tozalandi', katta.every((p) => p.__ball === undefined));

  // So'zlarga ajratish: o'zbek yozuvi bir ko'rinishga keladi
  test('yozuv birxillashtiriladi', sozlar('yog‘li teri').includes('yogli'),
    sozlar('yog‘li teri').join(','));
  test('ma’nosiz so‘zlar tashlanadi', !sozlar('menga nima kerak').includes('menga'),
    sozlar('menga nima kerak').join(','));
}

// --- KONTEKST ---
const kt = await chaqir('/api/maslahat', 'POST', { savol: 'Yana nima?',
  tarix: [{ kim: 'odam', matn: 'Terim quruq' }, { kim: 'ai', matn: 'Namlash kerak' }] });
test('tarix bilan ham ishlaydi', kt.kod === 200, `kod=${kt.kod}`);

const bosh = await chaqir('/api/maslahat', 'POST', { savol: 'a' });
test('bo‘sh savol rad etildi', bosh.kod === 400, `kod=${bosh.kod}`);

const imzosiz = await chaqir('/api/maslahat', 'POST', { savol: 'salom' }, null);
test('imzosiz so‘rov rad etildi', imzosiz.kod === 401, `kod=${imzosiz.kod}`);

// Cheklov: 10 daqiqada 12 ta. 13-si to'xtatilishi kerak.
let oxirgiKod = 200;
for (let i = 0; i < 25 && oxirgiKod === 200; i++) {
  oxirgiKod = (await chaqir('/api/maslahat', 'POST', { savol: 'yana bir savol' })).kod;
}
test('cheklov ishlaydi (20 tadan keyin 429)', oxirgiKod === 429, `kod=${oxirgiKod}`);


// ================= QIDIRUV KALIT SO'ZLARI =================
// Odam "penka" deb ham, "пенка" deb ham, "foam cleanser" deb ham qidiradi.
console.log('\n== KALIT SO‘ZLAR ==');
{
  const { kalitlarniToldir, qoidadanSozlar } = await import('../src/services/kalit-sozlar.js');

  const q = qoidadanSozlar({ toifa: 'tozalash', step: 'tozalash', concerns: ['akne'] });
  test('tozalagichga «penka» qo‘shildi', q.includes('penka'));
  test('kirill «пенка» ham bor', q.includes('пенка'));
  test('inglizcha «foam cleanser» ham bor', q.includes('foam cleanser'));
  test('muammo so‘zlari ham tushdi (акне)', q.includes('акне'));

  const n = await kalitlarniToldir({ hammasi: true, chegara: 60 });
  test('kalit so‘zlar bazaga yozildi', n.jami > 0, `${n.jami} ta mahsulot, AI: ${n.ai}`);

  const bor = await qiymat(`select count(*)::int from products
                             where is_active and array_length(kalit_sozlar,1) > 0`);
  test('katalogda kalit so‘zli mahsulot bor', bor > 0, `${bor} ta`);

  // Klientdagi translit bilan bir xil ishlashini tekshiramiz
  const KIRILL = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'j',з:'z',и:'i',й:'y',к:'k',
    л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
    ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'yu',я:'ya',ў:'o',қ:'q',ғ:'g',ҳ:'h' };
  const tr = (x) => x.replace(/[\u0400-\u04FF]/g, (c) => KIRILL[c] ?? c);
  test('translit: пенка → penka', tr('пенка') === 'penka', tr('пенка'));
  test('translit: крем → krem', tr('крем') === 'krem', tr('крем'));

  // Katalog 30 soniya keshlanadi — yangi yozilgan so'zlar ko'rinishi uchun tashlaymiz
  (await import('../src/lib/kesh.js')).keshniTashla('katalog');
  const kat = await chaqir('/api/catalog', 'GET');
  test('katalog kalit_sozlar ni qaytaradi',
    (kat.tana.mahsulotlar || []).some((p) => (p.kalit_sozlar || []).length > 0));
}


// ================= SHARHLAR =================
// Sharh HAQIQIY bo'lishi kerak: uni faqat mahsulotni SOTIB OLGAN odam
// yozadi, reyting esa shu sharhlardan hisoblanadi.
console.log('\n== SHARHLAR ==');
{
  const u = await qator(`select id from users where telegram_id = '910001'`);
  // Sinov takrorlanadigan bo'lishi uchun 1-mahsulotdagi HAMMA sharh tozalanadi
  await sorov('delete from sharhlar where user_id = $1 or product_id = 1', [u.id]);
  await sorov(`delete from orders where user_id = $1 and order_no like 'SH-%'`, [u.id]);

  // Sotib olmagan odam sharh yozolmaydi
  const rad = await chaqir('/api/sharh', 'POST', { product_id: 1, baho: 5, matn: 'Zo‘r' });
  test('sotib olmagan odam sharh yozolmaydi', rad.kod === 403, `kod=${rad.kod}`);

  // Buyurtma qo'shamiz
  await sorov(
    `insert into orders (order_no, user_id, customer_name, customer_phone, customer_address,
        items, subtotal, delivery_fee, discount, total, status, payment_status)
     values ('SH-1',$1,'Sinov','+998901112233','Manzil 12',
       '[{"product_id":1,"name":"Sinov","qty":1,"price":80000}]'::jsonb,
       80000,0,0,80000,'yetkazildi','tolangan')`, [u.id]);

  const yoz = await chaqir('/api/sharh', 'POST',
    { product_id: 1, baho: 4, matn: 'Yaxshi, lekin hidi kuchli.' });
  test('sotib olgan odam sharh yozdi', yoz.kod === 200, `kod=${yoz.kod} ${yoz.tana.error || ''}`);
  test('reyting sharhdan hisoblandi', Number(yoz.tana.reyting) === 4, String(yoz.tana.reyting));
  test('sharh soni yangilandi', yoz.tana.sharh_soni === 1, String(yoz.tana.sharh_soni));

  // Baho chegarasi
  const yomon = await chaqir('/api/sharh', 'POST', { product_id: 1, baho: 9 });
  test('9 ball rad etildi', yomon.kod === 400, `kod=${yomon.kod}`);

  // Bir odam bitta sharh — ikkinchisi tahrir bo'ladi
  const qayta = await chaqir('/api/sharh', 'POST', { product_id: 1, baho: 5, matn: 'Ko‘nikdim' });
  test('takroriy sharh tahrirga aylandi', qayta.tana.sharh_soni === 1, String(qayta.tana.sharh_soni));
  test('reyting yangi bahoga o‘zgardi', Number(qayta.tana.reyting) === 5, String(qayta.tana.reyting));

  const royxat = await chaqir('/api/sharhlar?product_id=1', 'GET');
  test('sharhlar ro‘yxati keldi', royxat.kod === 200 && royxat.tana.sharhlar.length === 1);
  test('o‘z sharhi belgilangan', royxat.tana.sharhlar[0]?.meniki === true);
  test('familiya to‘liq ko‘rsatilmaydi',
    !/Sinov Familiya/.test(royxat.tana.sharhlar[0]?.ism || ''), royxat.tana.sharhlar[0]?.ism);
  test('yozsa bo‘ladi deb belgilandi', royxat.tana.yozsa_boladi === true);

  // Katalogda ham ko'rinadi
  (await import('../src/lib/kesh.js')).keshniTashla('katalog');
  const kat = await chaqir('/api/catalog', 'GET');
  const p1 = (kat.tana.mahsulotlar || []).find((x) => x.id === 1);
  test('katalogda reyting bor', Number(p1?.reyting) === 5 && p1?.sharh_soni === 1,
    `${p1?.reyting} / ${p1?.sharh_soni}`);
  test('manba bahosi alohida ustunda', 'manba_reyting' in (p1 || {}));

  // Baholanmagan mahsulotlar ro'yxati
  await sorov('delete from sharhlar where user_id = $1 or product_id = 1', [u.id]);
  const kut = await chaqir('/api/sharh-kutilmoqda', 'GET');
  test('baholanmagan mahsulot ro‘yxatda',
    (kut.tana.mahsulotlar || []).some((x) => Number(x.product_id) === 1));

  // O'chirish
  await chaqir('/api/sharh', 'POST', { product_id: 1, baho: 3 });
  const och = await chaqir('/api/sharh', 'DELETE', { product_id: 1 });
  test('sharh o‘chirildi', och.kod === 200);
  const p2 = await qator('select reyting, sharh_soni from products where id = 1');
  test('o‘chirilgach reyting tozalandi', p2.reyting === null && p2.sharh_soni === 0,
    `${p2.reyting} / ${p2.sharh_soni}`);

  await sorov(`delete from orders where user_id = $1 and order_no like 'SH-%'`, [u.id]);
}

console.log(`\n${xato ? '✗' : '✓'} ${ok} o‘tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
