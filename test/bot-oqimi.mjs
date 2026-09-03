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
  on conflict (telegram_id) do update set agreed_at = now(), full_name = 'Sinov'`, [TG]);
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
test('muammolar foizi bilan ko‘rsatilgan', /— \d+%/.test(botMatni));
test('muammo zonasi ko‘rsatilgan', /📍/.test(botMatni));
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
test('ilovaga chaqiriq bor', /tavsiyalarni ko‘ring/i.test(botMatni));
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
