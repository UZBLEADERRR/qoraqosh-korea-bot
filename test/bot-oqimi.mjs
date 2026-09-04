// Botning to'liq yo'lini soxta Telegram va Gemini bilan sinaydi.
// Haqiqiy kalit kerak emas — faqat ishlaydigan Postgres.
//
//   DATABASE_URL=postgresql://... node test/bot-oqimi.mjs
//
// Botda "Xatolik yuz berdi" chiqsa, avval shuni ishga tushiring: agar bu yerda
// hammasi o'tsa, muammo kodda emas — kalitlarda yoki tarmoqda.
import { soxtaServer, yuborilgan, korinadigan } from './soxta-server.mjs';

const PORT = 4477;
const srv = await soxtaServer(PORT);

process.env.BOT_TOKEN       ||= '111111:TEST';
process.env.ADMIN_LOGIN     ||= 'sinov';
process.env.ADMIN_PASSWORD  ||= 'parol12345';
process.env.ADMIN_JWT_SECRET ||= 'x'.repeat(30);
process.env.TELEGRAM_API    = `http://127.0.0.1:${PORT}`;
process.env.GEMINI_API      = `http://127.0.0.1:${PORT}/models`;
process.env.GEMINI_API_KEY  = 'soxta';
process.env.PUBLIC_URL      ||= 'https://sinov.example';
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL kerak.'); process.exit(1);
}

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, pool } = await import('../src/db.js');
const { yangilanish } = await import('../src/bot/index.js');

let ok = 0, xato = 0;
const test = (nom, shart, izoh = '') => {
  if (shart) { console.log(`  ✓ ${nom}${izoh ? ' — ' + izoh : ''}`); ok++; }
  else { console.log(`  ✗ ${nom}${izoh ? ' — ' + izoh : ''}`); xato++; }
};
const oxirgi = () => yuborilgan[yuborilgan.length - 1] || {};

const TG = '900001';
await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at)
  values ($1,'Sinov','+998901112233',24, now())
  on conflict (telegram_id) do update set agreed_at = now(), full_name = 'Sinov',
    phone = '+998901112233', age = 24, is_blocked = false`, [TG]);
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
await sorov(`update settings set value = '99'::jsonb where key = 'limit_bepul'`);

const rasmYubor = () => yangilanish({ update_id: Math.random(), message: {
  message_id: 1, date: Math.floor(Date.now() / 1000),
  chat: { id: Number(TG), type: 'private' },
  from: { id: Number(TG), first_name: 'Sinov', username: 'sinov' },
  photo: [{ file_id: 'small' }, { file_id: 'big', file_size: 128000 }] } });

const bosish = (data) => yangilanish({ update_id: Math.random(), callback_query: {
  id: '1', data, from: { id: Number(TG), first_name: 'Sinov' },
  message: { message_id: 1, chat: { id: Number(TG), type: 'private' } } } });

console.log('\n── BOT OQIMI ──');

yuborilgan.length = 0;
await rasmYubor();
// Tahlil BITTA xabar bo'lib keladi: rasm + izoh. Izohda belgilar,
// foizi va zonasi bor; SABAB va YECHIM esa ataylab yo'q — ular ilovada.
// «Tahlil qilinmoqda…» xabari o'chiriladi — chatda faqat natija qoladi
test('tahlil bitta xabar bo‘lib keladi', korinadigan().length === 1,
  `${korinadigan().length} ta xabar: ${korinadigan().map((x) => (x.text || '').slice(0, 24)).join(' | ')}`);
const botMatni = korinadigan().map((x) => x.text || '').join('\n');
test('rasmga tahlil qaytaradi', /Tahlil natijasi/.test(botMatni));
test('izohda yosh va teri turi bor', /👤 .+ · /.test(botMatni));
test('izohda teri rangi bor', /🎨 /.test(botMatni));
test('izohda teri holati bali bor', /\d+\/100/.test(botMatni));
test('izohda shkala bor', /■/.test(botMatni));
test('nechta belgi topilgani aytilgan', /\d+ ta belgi<\/b> aniqlandi/.test(botMatni));
test('eng kuchli belgi aytilgan', /eng kuchlisi/.test(botMatni));
// Muammolar RO'YXATI botda YO'Q: u rasmda va ilovada — bot xabari
// odamni tugmani bosishga olib borishi kerak
test('muammolar ro‘yxati botda YO‘Q', !/📍/.test(botMatni));
test('qalin va kursiv yozuv ishlatilgan',
  /<b>/.test(botMatni) && /<i>/.test(botMatni));
// Prognoz, sabab va yechim ATAYLAB botda yo'q — ular ilovada
test('prognoz botda YO‘Q — ilovada', !/e’tibor bermasangiz/i.test(botMatni));
test('sabab va yechim botda YO‘Q — ular ilovada',
  !/Sababi|Yechimi/.test(botMatni));
// Telegram rasm izohini 1024 belgida kesadi va kesilgan HTML teg
// xabarni umuman yuborilmaydigan qiladi
test('izoh Telegram chegarasiga sig‘adi', botMatni.length <= 1024,
  `${botMatni.length} belgi`);
test('ilovaga chaqiriq bor', /tugmani bosing/i.test(botMatni));
test('tibbiy ogohlantirish bor', /tashxis emas/.test(botMatni));
test('«Tavsiyani ochish» tugmasi bor',
  (oxirgi().reply_markup?.inline_keyboard || []).flat()
    .some((b) => b.web_app && /Tavsiya/i.test(b.text)));

// Asosiy menyu ikkita tugmadan iborat: skaner va do'kon
await bosish('menyu');
const menyuTugmalari = (oxirgi().reply_markup?.inline_keyboard || []).flat();
test('asosiy menyuda 2 ta tugma', menyuTugmalari.length === 2,
  menyuTugmalari.map((b) => b.text).join(' | '));
test('menyuda skaner va do‘kon bor',
  menyuTugmalari.some((b) => /skaner/i.test(b.text)) &&
  menyuTugmalari.some((b) => /Do‘kon|Dokon/i.test(b.text)));

for (const [data, kutilgan] of [
  ['menyu', /KiOVO/], ['skaner', /Yuz skaneri/], ['konsultatsiya', /Konsultatsiya/],
  ['profil', /Profilingiz/], ['yordam', /Yordam/], ['buyurtmalar', /buyurtma/i],
]) {
  yuborilgan.length = 0;
  await bosish(data);
  test(`tugma «${data}» ishlaydi`, kutilgan.test(oxirgi().text || ''));
}

// ═══════════ AI 400 QAYTARSA ═══════════
// Google ba'zan sozlamalardan birini qabul qilmay 400 beradi (masalan
// thinkingConfig yoki sxemadagi kalit). Ilgari butun skaner ishlamay
// qolardi va mijozga «JPG yuboring» deb noto'g'ri xabar ketardi.
{
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_400 = 2;                 // ikki marta 400, keyin ishlaydi
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_400 = 0;
  test('AI 400 qaytarsa ham tahlil chiqadi',
    korinadigan().some((x) => /Tahlil natijasi/.test(x.text || '')),
    korinadigan().map((x) => (x.text || '').slice(0, 40)).join(' | '));
  test('mijozga «JPG yuboring» deb noto‘g‘ri xabar ketmaydi',
    !korinadigan().some((x) => /JPG yoki PNG/.test(x.text || '')));
}

// Javob YARIM kelib qolsa (MAX_TOKENS) JSON albatta buziladi. Ilgari
// mijoz «AI javobi tushunarsiz chiqdi» degan xabarni ko'rardi — aslida
// shunchaki javob byudjeti yetmagan edi. Endi byudjet oshirilib qayta
// so'raladi.
{
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_UZILGAN = 2;             // ikki marta yarim javob
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_UZILGAN = 0;
  test('uzilib qolgan javobdan keyin tahlil baribir chiqadi',
    korinadigan().some((x) => /Tahlil natijasi/.test(x.text || '')),
    korinadigan().map((x) => (x.text || '').slice(0, 40)).join(' | '));
  test('«tushunarsiz javob» xabari ketmaydi',
    !korinadigan().some((x) => /tushunarsiz/.test(x.text || '')));
}

// ═══════════ KVOTA TUGAGANDA ═══════════
// Aynan shu holat mijozga «⚠️ Xatolik yuz berdi» bo'lib borardi:
// google.js 429 da `kvota` turkumini tashlaydi, xatolar.js da esa bu
// turkum uchun matn yo'q edi va umumiy zaxira matn chiqardi. Mijoz
// aybni rasmdan qidirib qayta-qayta urinardi, admin esa sababni faqat
// Railway loglaridan bilardi.
console.log('\n── KVOTA TUGAGANDA ──');
{
  const { jurnalniTozala, jurnalHolati } = await import('../src/ai/jurnal.js');
  const { navbatniTozala } = await import('../src/ai/navbat.js');
  jurnalniTozala(); navbatniTozala();

  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_429 = 99;                // hech qanaqa urinish o'tmaydi
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429 = 0;

  const xabarlar = korinadigan().map((x) => x.text || '').join('\n');
  test('umumiy «Xatolik yuz berdi» CHIQMAYDI',
    !/⚠️ Xatolik yuz berdi/.test(xabarlar), xabarlar.slice(-160));
  test('mijozga aniq sabab aytiladi', /limiti vaqtincha tugadi/i.test(xabarlar),
    xabarlar.slice(-160));
  test('qachon urinishni ham aytadi', /10–15 daqiqa/.test(xabarlar));

  // Jurnal sababni eslab qoldi — /holat shundan o'qiydi
  const j = jurnalHolati();
  test('jurnalga yozildi', j.xato > 0, `${j.muvaffaq}/${j.jami}, xato ${j.xato}`);
  test('turkum «kvota» deb aniqlandi', j.oxirgi[0]?.turkum === 'kvota',
    j.oxirgi[0]?.turkum);
  test('qayerda bo‘lgani ham yozildi', j.oxirgi[0]?.qayerda === 'skaner',
    j.oxirgi[0]?.qayerda);
  test('KALIT jurnalga TUSHMAYDI', !/key=soxta/.test(j.oxirgi[0]?.xabar || ''),
    j.oxirgi[0]?.xabar);

  // 429 butun navbatni pauzaga qo'yishi kerak — aks holda navbatdagi
  // hamma so'rov ketma-ket urilib cheklovni uzaytiradi
  const { navbatHolati } = await import('../src/ai/navbat.js');
  test('navbat pauzaga o‘tdi', navbatHolati().pauza_qoldi > 0,
    `${navbatHolati().pauza_qoldi} s`);
  navbatniTozala();

  // ── ADMIN texnik sababni darrov ko'radi ──
  // Ilgari admin ham mijozdek umumiy xabarni ko'rardi va sababni
  // bilish uchun Railway loglarini ochishga majbur edi.
  await sorov(`update users set is_admin = true where telegram_id = $1`, [TG]);
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  navbatniTozala();
  globalThis.AI_429 = 99;
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429 = 0;
  const adminga = korinadigan().map((x) => x.text || '').join('\n');
  test('adminga texnik sabab ko‘rsatiladi', /Google HTTP 429/.test(adminga),
    adminga.slice(-200));
  test('adminga /holat tavsiya qilinadi', /\/holat/.test(adminga));
  navbatniTozala();

  // ── /holat sababni KO'RSATADI ──
  yuborilgan.length = 0;
  await yangilanish({ update_id: 1, message: { message_id: 1, chat: { id: Number(TG), type: 'private' },
    from: { id: Number(TG) }, text: '/holat' } });
  const holat = yuborilgan.map((x) => x.text || '').join('\n');
  test('/holat AI bo‘limini ko‘rsatadi', /🤖 <b>AI<\/b>/.test(holat), holat.slice(0, 200));
  test('/holat oxirgi xatoni ko‘rsatadi', /Oxirgi xatolar/.test(holat));
  test('/holat SABABNI aytadi', /kvota/.test(holat));
  test('/holat NIMA QILISHNI aytadi', /Nima qilish/.test(holat), holat.slice(-300));
  test('/holat kalitni oshkor qilmaydi', !/soxta/.test(holat.replace(/soxta-server/g, '')));

  jurnalniTozala();
  await sorov(`update users set is_admin = false where telegram_id = $1`, [TG]);
}

// ═══════════ SKANER NAMUNASI ═══════════
// «Yuz skaneri» bosilganda botda ham namuna surat kelishi kerak: odam
// ko'rsatmani o'qib emas, ko'rib tushunadi.
{
  yuborilgan.length = 0;
  await bosish('skaner');
  test('namuna yo‘q bo‘lsa oddiy matn keladi',
    !oxirgi().rasm && /Yuz skaneri/.test(oxirgi().text || ''));

  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const m = await qator(
    `insert into media (tur, mime, bayt, hajm, goya)
     values ('namuna', 'image/jpeg', decode($1,'base64'), 68, 'Skaner namunasi')
     returning id`, [png]);
  await sorov(
    `insert into settings (key, value) values ('skaner_namuna_id', $1::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(m.id)]);

  yuborilgan.length = 0;
  await bosish('skaner');
  test('namuna qo‘yilsa botda RASM bilan keladi', Boolean(oxirgi().rasm));
  test('namuna izohida ko‘rsatma bor', /Yuz skaneri/.test(oxirgi().text || ''));
  test('namuna ostida orqaga tugmasi bor',
    (oxirgi().reply_markup?.inline_keyboard || []).flat().length > 0);

  await sorov(`delete from settings where key = 'skaner_namuna_id'`);
}

// Limit
await sorov(`update settings set value = '1'::jsonb where key = 'limit_bepul'`);
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0; await rasmYubor();
yuborilgan.length = 0; await rasmYubor();
test('limit tugaganda ogohlantiradi', /limit tugadi/i.test(oxirgi().text || ''));
test('limit xabarida do‘kon tugmasi bor',
  (oxirgi().reply_markup?.inline_keyboard || []).flat().some((b) => /Do‘kon|Dokon/i.test(b.text)));

// ═══════════ NATIJA RASMI ═══════════
console.log('\n── NATIJA RASMI ──');
await sorov(`update settings set value = '9'::jsonb where key = 'limit_bepul'`);
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0;
await rasmYubor();

const rasmlar = yuborilgan.filter((x) => x.rasm);
test('tahlil RASM bilan yuboriladi', rasmlar.length === 1,
  `${rasmlar.length} ta rasm, ${(rasmlar[0]?.hajm / 1024 || 0).toFixed(0)} KB`);
test('rasm bo‘sh emas', (rasmlar[0]?.hajm || 0) > 20000);
test('rasm izohida ball bor', /\d+\/100/.test(rasmlar[0]?.text || ''));
test('rasmdan keyin qo‘shimcha matn YUBORILMAYDI',
  korinadigan().filter((x) => !x.rasm).length === 0,
  `${korinadigan().filter((x) => !x.rasm).length} ta ortiqcha xabar`);

const saqlangan = await qator(
  `select natija_rasm_id from analyses where user_id = (select id from users where telegram_id = $1)
    order by created_at desc limit 1`, [TG]);
// Surat ilovadagi tahlil bo'limida ko'rsatiladi
{
  const { qator } = await import('../src/db.js');
  const a = await qator(
    `select problems, yuz_rasm_id from analyses
      where user_id = (select id from users where telegram_id = $1)
      order by created_at desc limit 1`, [TG]);
  test('muammo zonasi saqlandi',
    (a?.problems || []).every((m) => typeof m.zona === 'string'),
    (a?.problems || [])[0]?.zona);
  test('foydalanuvchi surati saqlandi', Boolean(a?.yuz_rasm_id));
}

test('rasm bazaga bog‘landi', Boolean(saqlangan?.natija_rasm_id));

// ═══════════ KANALLAR ═══════════
console.log('\n── KANALLAR ──');
await sorov(`update settings set value = '"-100555"'::jsonb where key = 'kanal_tahlil'`);
await sorov(`update settings set value = 'false'::jsonb where key = 'kanal_tahlil_yoqilgan'`);
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0; await rasmYubor();
test('o‘chiq bo‘lsa tahlil kanalga YUBORILMAYDI',
  !yuborilgan.some((x) => String(x.chat_id) === '-100555'));

await sorov(`update settings set value = 'true'::jsonb where key = 'kanal_tahlil_yoqilgan'`);
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0; await rasmYubor();
await new Promise((r) => setTimeout(r, 400));
const kanalga = yuborilgan.find((x) => String(x.chat_id) === '-100555');
test('yoqilganda tahlil kanalga rasm bilan tushadi', Boolean(kanalga?.rasm));
test('kanal izohida ball va muammo bor',
  /Ball/.test(kanalga?.text || '') && /Muammolar/.test(kanalga?.text || ''));


// ═══════════ /ochir — surat ham o'chsin ═══════════
// Ofertada «suratingizni /ochir bilan o'chirasiz» deb yozilgan. media ga
// havola `on delete set null` — tahlilni o'chirsak rasm bazada YETIM
// qolib ketardi, ya'ni va'da bajarilmasdi.
console.log('\n── MA’LUMOTNI O‘CHIRISH ──');
{
  const { qatorlar: qq, qiymat } = await import('../src/db.js');
  const bogliq = await qq(
    `select yuz_rasm_id, natija_rasm_id from analyses
      where user_id = (select id from users where telegram_id = $1)`, [TG]);
  const idlar = bogliq.flatMap((a) => [a.yuz_rasm_id, a.natija_rasm_id]).filter(Boolean);
  test('tahlilga bog‘langan rasmlar bor', idlar.length > 0, `${idlar.length} ta`);

  await yangilanish({ update_id: Math.random(), message: {
    message_id: 99, date: Math.floor(Date.now() / 1000),
    chat: { id: Number(TG), type: 'private' },
    from: { id: Number(TG), first_name: 'Sinov' }, text: '/ochir' } });

  test('tahlillar o‘chdi', (await qiymat(
    `select count(*)::int from analyses
      where user_id = (select id from users where telegram_id = $1)`, [TG])) === 0);
  test('surat va natija rasmlari ham o‘chdi',
    (await qiymat('select count(*)::int from media where id = any($1::uuid[])', [idlar])) === 0);
}

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
