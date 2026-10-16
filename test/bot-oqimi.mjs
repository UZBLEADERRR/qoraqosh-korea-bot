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
// Menyu ataylab qisqa: skaner va do'kon. Tahlili BORLARGA yana
// bittasi qo'shiladi — «Natijani olish»: odam eski rasmni chatdan
// qidirib o'tirmasin. «💄 Menga mos makiyaj» — to'rtinchisi.
test('asosiy menyuda ortiqcha tugma yo‘q', menyuTugmalari.length <= 4,
  menyuTugmalari.map((b) => b.text).join(' | '));
test('menyuda skaner va do‘kon bor',
  menyuTugmalari.some((b) => /skaner/i.test(b.text)) &&
  menyuTugmalari.some((b) => /Do‘kon|Dokon/i.test(b.text)));
test('tahlili borga «Natijani olish» ham chiqadi',
  menyuTugmalari.some((b) => b.callback_data === 'natija_ol'),
  menyuTugmalari.map((b) => b.text).join(' | '));

// Tugma bosilsa saqlangan rasm QAYTA yuboriladi — yangi tahlil emas
yuborilgan.length = 0;
await bosish('natija_ol');
test('«Natijani olish» saqlangan natijani qaytaradi',
  yuborilgan.some((x) => x.photo || /tahlil/i.test(x.text || '')),
  yuborilgan.map((x) => (x.photo ? '[rasm]' : (x.text || '').slice(0, 30))).join(' | '));

for (const [data, kutilgan] of [
  ['menyu', /KiOVO/], ['skaner', /Yuz skaneri/], ['konsultatsiya', /Konsultatsiya/],
  ['profil', /Profilingiz/], ['yordam', /Yordam/], ['buyurtmalar', /buyurtma/i],
]) {
  yuborilgan.length = 0;
  await bosish(data);
  test(`tugma «${data}» ishlaydi`, kutilgan.test(oxirgi().text || ''));
}

// Bu bo'limlar TERI tahlilining AI zaxirasini sinaydi. Admin uchun makiyaj
// ham parallel ketadi va navbatni egallab, sinovni chalg'itadi — o'chiramiz
// (makiyaj o'z bo'limida yoqiladi).
await sorov(`insert into settings (key, value) values ('makiyaj_holat', '"yopiq"')
  on conflict (key) do update set value = excluded.value`);

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
  globalThis.AI_429_KUNLIK = false;      // DAQIQALIK chegara
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429 = 0; globalThis.AI_429_KUNLIK = true;

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
  test('jurnalda QAYSI MODEL yiqilgani ham bor', /gemini-/.test(j.oxirgi[0]?.xabar || ''),
    j.oxirgi[0]?.xabar?.slice(0, 80));
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
  globalThis.AI_429 = 99; globalThis.AI_429_KUNLIK = false;
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429 = 0; globalThis.AI_429_KUNLIK = true;
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

// ═══════════ MODEL ALMASHUVI ═══════════
// Skaner va maslahatchi ishlamay qolgan, poster esa ishlayvergan edi.
// Sabab: JSON chaqiruvlar bitta matn modeliga, rasm chizish esa boshqa
// modelga ketadi va Google'da HAR MODELNING O'Z KVOTASI bor. Matn
// modelining kunlik chegarasi tugagach butun skaner to'xtagan.
// Endi zaxira modellar bor: biri tugasa keyingisi ishlaydi.
console.log('\n── MODEL ALMASHUVI ──');
{
  const { modellarniTozala, modelHolatlari, royxat, kvotaTuri, kutishMs }
    = await import('../src/ai/modellar.js');
  const { jurnalniTozala } = await import('../src/ai/jurnal.js');
  const { navbatniTozala } = await import('../src/ai/navbat.js');

  // ── 429 javobini o'qish ──
  const kunlikJavob = JSON.stringify({ error: { details: [
    { violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
    { retryDelay: '31s' }] } });
  test('kunlik kvota ajratildi', kvotaTuri(kunlikJavob) === 'kunlik', kvotaTuri(kunlikJavob));
  test('daqiqalik kvota ajratildi',
    kvotaTuri('quotaId: GenerateRequestsPerMinutePerProjectPerModel') === 'daqiqalik');
  test('retryDelay o‘qildi', kutishMs(kunlikJavob) === 31000, String(kutishMs(kunlikJavob)));

  const modellar = royxat();
  test('zaxira modellar ro‘yxati: 3.8 → 3.7', modellar.length >= 2 && modellar[1] === 'gemini-3.7-flash', modellar.join(', '));
  test('birinchisi eng yangi flash', modellar[0] === 'gemini-3.8-flash', modellar[0]);

  // ── Asosiy model kvotasi tugasa keyingisi ishlaydi ──
  modellarniTozala(); jurnalniTozala(); navbatniTozala();
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_429_MODELLAR = [modellar[0]];   // asosiysi (3.8) tugagan
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429_MODELLAR = [];

  test('ASOSIY MODEL TUGASA HAM TAHLIL CHIQADI',
    korinadigan().some((x) => /Tahlil natijasi/.test(x.text || '')),
    korinadigan().map((x) => (x.text || '').slice(0, 40)).join(' | '));
  test('mijozga xato ko‘rsatilmadi',
    !korinadigan().some((x) => /limiti|Xatolik/.test(x.text || '')));

  const h = modelHolatlari();
  test('tugagan modellar chetga qo‘yildi',
    h[0].tayyor === false,
    h.map((m) => `${m.nom}:${m.tayyor ? 'tayyor' : m.sabab}`).join(' | '));
  test('sabab «kunlik» deb yozildi', h[0].sabab === 'kunlik', h[0].sabab);
  test('zaxira (3.7) ishladi', h[1].tayyor === true && h[1].ishlatilgan > 0,
    `${h[1].nom} · ${h[1].ishlatilgan} marta`);

  // ── Model nomi noto'g'ri bo'lsa (404) butunlay chiqariladi ──
  modellarniTozala(); navbatniTozala();
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_404_MODELLAR = [modellar[0]];
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_404_MODELLAR = [];
  test('yo‘q model tahlilni to‘xtatmaydi',
    korinadigan().some((x) => /Tahlil natijasi/.test(x.text || '')),
    korinadigan().map((x) => (x.text || '').slice(0, 40)).join(' | '));
  const h2 = modelHolatlari();
  test('yo‘q model ro‘yxatdan chiqarildi', h2[0].yoq === true, h2[0].sabab);

  // ── HAMMA model tugasa: aniq va HALOL xabar ──
  modellarniTozala(); jurnalniTozala(); navbatniTozala();
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  globalThis.AI_429_MODELLAR = modellar;
  yuborilgan.length = 0;
  await rasmYubor();
  globalThis.AI_429_MODELLAR = [];
  const matn = korinadigan().map((x) => x.text || '').join('\n');
  test('kunlik kvotada «ertaga» deyiladi', /Bugungi AI limiti tugadi/.test(matn),
    matn.slice(-200));
  test('«10 daqiqadan keyin» deb ALDAMAYDI', !/10–15 daqiqadan/.test(matn));
  test('do‘konga yo‘naltiradi', /do‘kondan/.test(matn));

  // ── /holat qaysi model ishlayotganini ko'rsatadi ──
  await sorov(`update users set is_admin = true where telegram_id = $1`, [TG]);
  yuborilgan.length = 0;
  await yangilanish({ update_id: 1, message: { message_id: 1,
    chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG) }, text: '/holat' } });
  const holat2 = yuborilgan.map((x) => x.text || '').join('\n');
  test('/holat modelni ko‘rsatadi', /📦 Tahlillar: Google/.test(holat2) && /gemini-3.8-flash → gemini-3.7-flash/.test(holat2), holat2.slice(0, 160));
  test('/holat kunlik kvotani aytadi', /kunlik kvota tugadi/.test(holat2));
  test('/holat kalit qo‘shishni maslahat beradi', /GEMINI_MODELLAR|GEMINI_API_KEY/.test(holat2));
  await sorov(`update users set is_admin = false where telegram_id = $1`, [TG]);

  modellarniTozala(); jurnalniTozala(); navbatniTozala();
}

await sorov(`delete from settings where key = 'makiyaj_holat'`);

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

// ═══════════ /tugat: ISH TUGAMAGUNCHA KUTADI ═══════════
// Har rasm bittalab (bitta AI chaqiruvi) ishlanadi, ya'ni yuzta rasm
// bir necha daqiqa oladi. Ilgari /tugat shu zahoti hisobot chiqarar va
// navbatni o'chirardi: hisobotda faqat o'sha paytgacha ishlangani
// ko'rinardi, qolganlari esa jimgina katalogga tushaverardi.
console.log('\n── /tugat KUTADI ──');
{
  const I = await import('../src/services/skrinshot-import.js');

  // Navbat ishlayotgan holatni yasaymiz
  const soxtaNavbat = {
    royxat: ['a', 'b', 'c'], ishlamoqda: true, xabarId: null,
    chatId: Number(TG), qoshildi: [], otkazildi: [], xato: 0, jami: 5,
    tugatilsin: false, user: null,
  };
  // Ichki Map ga to'g'ridan-to'g'ri kira olmaymiz — haqiqiy oqim bilan
  // sinaymiz: rasm yuboramiz va DARROV /tugat bosamiz
  const u = await qator(`select id from users where telegram_id = $1`, [TG]);
  await sorov(`update users set is_admin = true, state = 'admin_skrinshot' where id = $1`, [u.id]);

  yuborilgan.length = 0;
  // Bir nechta rasm — ishlov boshlanadi
  for (let i = 0; i < 3; i++) {
    await yangilanish({ update_id: 1, message: { message_id: 10 + i,
      chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG) },
      photo: [{ file_id: `sinov-rasm-${i}`, width: 800, height: 800 }] } });
  }
  // Ishlov hali tugamagan bo'lishi mumkin — DARROV /tugat
  await yangilanish({ update_id: 2, message: { message_id: 20,
    chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG) }, text: '/tugat' } });

  const matnlar = yuborilgan.map((x) => x.text || '').join('\n');
  const kutdi = /Hali ishlanmoqda/.test(matnlar);
  const tayyor = /✅ <b>Tayyor<\/b>/.test(matnlar);
  test('/tugat javobsiz qolmaydi', kutdi || tayyor,
    matnlar.slice(-160));
  if (kutdi) {
    test('nechta qolgani aytiladi', /Navbatda: <b>\d+<\/b>/.test(matnlar));
    test('kutib o‘tirmaslik aytiladi', /tugagach hisobot o‘zi keladi/.test(matnlar));
  }

  // Ish tugagach hisobot O'ZI kelishi kerak
  for (let i = 0; i < 40 && !/✅ <b>Tayyor<\/b>/.test(
    yuborilgan.map((x) => x.text || '').join('\n')); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  const oxir = yuborilgan.map((x) => x.text || '').join('\n');
  test('HISOBOT O‘ZI KELDI', /✅ <b>Tayyor<\/b>/.test(oxir), oxir.slice(-200));
  test('hisobotda qo‘shilganlar soni bor', /Katalogga qo‘shildi: <b>\d+<\/b>/.test(oxir));

  // Ikkinchi marta /tugat — navbat yo'q, tushunarli javob
  yuborilgan.length = 0;
  await yangilanish({ update_id: 3, message: { message_id: 21,
    chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG) }, text: '/tugat' } });
  test('navbatsiz /tugat tushunarli javob beradi',
    /rasm yuborilmadi/i.test(yuborilgan.map((x) => x.text || '').join('\n')),
    yuborilgan.map((x) => (x.text || '').slice(0, 50)).join(' | '));

  await sorov(`update users set is_admin = false, state = null where id = $1`, [u.id]);
  void soxtaNavbat;
}

// ═══════════ JINS VA ERKAKLAR RANGI ═══════════
// Erkak terisi qalinroq, yog' ko'proq ishlab chiqadi va soqol olish
// qirilishi ayollarda umuman uchramaydi. Buni bilmasdan berilgan
// tavsiya erkaklar uchun deyarli har doim noto'g'ri chiqadi.
console.log('\n── JINS ──');
{
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  yuborilgan.length = 0;
  await rasmYubor();

  const a = await qator(
    `select jins, age_estimate from analyses
      where user_id = (select id from users where telegram_id = $1)
      order by created_at desc limit 1`, [TG]);
  test('jins bazaga yozildi', a?.jins === 'erkak', a?.jins);

  // Kartochkada jins yorliq bo'lib chiqadi
  const { natijaSvg } = await import('../src/rasm/natija-kartochka.js');
  const svg = natijaSvg({ tahlil: { ball: 70, jins: 'erkak', taxminiy_yosh: '24-28',
    teri_turi: 'aralash', muammolar: [] } });
  test('kartochkada «erkak» yorlig‘i bor', /erkak/i.test(svg), '');
  const ayolSvg = natijaSvg({ tahlil: { ball: 70, jins: 'ayol', taxminiy_yosh: '24-28',
    teri_turi: 'aralash', muammolar: [] } });
  test('«ayol» ham chiqadi', /ayol/i.test(ayolSvg));
  // Noma'lum bo'lsa yorliq UMUMAN chiqmaydi — «noma'lum jins» degan
  // yozuv odamga hech nima bermaydi
  const nomalum = natijaSvg({ tahlil: { ball: 70, jins: 'nomalum', taxminiy_yosh: '24-28',
    teri_turi: 'aralash', muammolar: [] } });
  test('noma’lum jins yorlig‘i chiqmaydi', !/nomalum|noma’lum/.test(nomalum));

  // ── Erkaklar uchun boshqa rang ──
  const { natijaRasminiYarat } = await import('../src/services/natija-rasm.js');
  await sorov(`insert into settings (key, value) values
      ('mavzu', '{"asosiy":"#E0242B","fon":"#F6F6F7","urgu":"#E0242B"}'::jsonb)
    on conflict (key) do update set value = excluded.value`);
  await sorov(`insert into settings (key, value) values
      ('mavzu_erkak', '{"asosiy":"#123A63","fon":"#E7F0F7","urgu":"#1D6FA5"}'::jsonb)
    on conflict (key) do update set value = excluded.value`);

  // Faqat RANG ta'sirini ajratamiz: jins bir xil (erkak) qoladi,
  // sozlama esa o'zgaradi. Aks holda jins yorlig'i baytlarni baribir
  // farqlantirib, sinov hech nima isbotlamasdi.
  const u = await qator(`select id from users where telegram_id = $1`, [TG]);
  // Yordamchi yozgan shablon tasdiqlangan bo'lsa kartochka O'SHANDAN
  // chiziladi va mavzu rangiga umuman bog'liq bo'lmaydi — sinov
  // uchun ichki ko'rinishga qaytaramiz
  await sorov(`delete from settings where key = 'natija_shablon'`);
  const chiz = () => natijaRasminiYarat({ analysisId: null, userId: u.id,
    rasmBase64: null, mime: 'image/jpeg',
    tahlil: { ball: 70, jins: 'erkak', muammolar: [], tavsiya: [] }, mahsulotlar: [] });

  const kokBilan = await chiz();
  await sorov(`delete from settings where key = 'mavzu_erkak'`);
  const kokSiz = await chiz();
  test('ERKAKLAR RANGI kartochkani o‘zgartiradi',
    kokBilan && kokSiz && !kokBilan.bayt.equals(kokSiz.bayt),
    `${kokBilan?.bayt.length} vs ${kokSiz?.bayt.length} bayt`);

  // O'chirilgach umumiy mavzuga qaytadi — takroriy chizish bir xil
  const kokSiz2 = await chiz();
  test('o‘chirilgach umumiy mavzu barqaror',
    kokSiz2 && kokSiz2.bayt.equals(kokSiz.bayt));

  // Ayol kartochkasi rangi hech qachon erkaknikiga o'tmaydi
  await sorov(`insert into settings (key, value) values
      ('mavzu_erkak', '{"asosiy":"#123A63","fon":"#E7F0F7","urgu":"#1D6FA5"}'::jsonb)
    on conflict (key) do update set value = excluded.value`);
  const ayol1 = await natijaRasminiYarat({ analysisId: null, userId: u.id,
    rasmBase64: null, mime: 'image/jpeg',
    tahlil: { ball: 70, jins: 'ayol', muammolar: [], tavsiya: [] }, mahsulotlar: [] });
  await sorov(`delete from settings where key = 'mavzu_erkak'`);
  const ayol2 = await natijaRasminiYarat({ analysisId: null, userId: u.id,
    rasmBase64: null, mime: 'image/jpeg',
    tahlil: { ball: 70, jins: 'ayol', muammolar: [], tavsiya: [] }, mahsulotlar: [] });
  test('AYOL kartochkasiga erkaklar rangi TEGMAYDI',
    ayol1 && ayol2 && ayol1.bayt.equals(ayol2.bayt));
}

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
// Sozlama SQL bilan to'g'ridan-to'g'ri o'zgartirilyapti, admin paneli
// orqali emas — shuning uchun keshni O'ZIMIZ tozalaymiz. Ilgari bu
// yo'q edi va `sozlama()` eski qiymatni qaytarib turardi: kanal
// yoqilganiga qaramay test «kanalga hech narsa tushmadi» derdi.
const { sozlamalarniUnut } = await import('../src/db.js');
// `update` EMAS, `insert ... on conflict`: bu ikki kalit migratsiyada
// urug'lantirilmaydi (kanalga YUZ SURATI ketadi, shuning uchun ular
// ataylab yo'q). `update` qatorni topmay jimgina o'tib ketar va test
// kanalni umuman yoqmagan holda «tekshirib» turardi.
await sorov(`insert into settings (key, value) values
    ('kanal_tahlil', '"-100555"'::jsonb), ('kanal_tahlil_yoqilgan', 'false'::jsonb)
    on conflict (key) do update set value = excluded.value`);
sozlamalarniUnut();
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0; await rasmYubor();
await new Promise((r) => setTimeout(r, 400));
test('o‘chiq bo‘lsa tahlil kanalga YUBORILMAYDI',
  !yuborilgan.some((x) => String(x.chat_id) === '-100555'));

await sorov(`update settings set value = 'true'::jsonb where key = 'kanal_tahlil_yoqilgan'`);
sozlamalarniUnut();
await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
yuborilgan.length = 0; await rasmYubor();
await new Promise((r) => setTimeout(r, 400));
const kanalga = yuborilgan.find((x) => String(x.chat_id) === '-100555');
test('yoqilganda tahlil kanalga rasm bilan tushadi', Boolean(kanalga?.rasm));
test('kanal izohida ball va muammo bor',
  /Ball/.test(kanalga?.text || '') && /Muammolar/.test(kanalga?.text || ''));
// Kanalda tahlil QAYSI YO'LDAN kelgani ham yozilishi kerak: botdan,
// Mini App dan yoki saytdagi skanerdan
test('kanalda manba — «Telegram bot» deb yozilgan',
  /Telegram bot/.test(kanalga?.text || ''), kanalga?.text?.slice(0, 80));
// Kanal keyingi bo'limlarga o'tib ketmasin
await sorov(`delete from settings where key in ('kanal_tahlil','kanal_tahlil_yoqilgan')`);
sozlamalarniUnut();


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

// ═══ Botni bloklab qaytgan odam: bot jim qolmasin ═══
{
  // Ommaviy xabar «bot was blocked» qaytargan — belgi qo'yilgan
  await sorov('update users set bot_bloklagan_at = now(), is_blocked = false where telegram_id = $1', [TG]);
  const oldin = yuborilgan.length;
  await yangilanish({ update_id: Math.random(), message: {
    message_id: 120, date: Math.floor(Date.now() / 1000),
    chat: { id: Number(TG), type: 'private' },
    from: { id: Number(TG), first_name: 'Sinov' }, text: '/start' } });
  test('botni bloklab qaytgan odamga /start javob beradi',
    yuborilgan.slice(oldin).some((y) => String(y.chat_id) === TG && y.text));
  await new Promise((r) => setTimeout(r, 150));
  test('qaytib yozgach «bloklagan» belgisi tozalanadi',
    (await qator('select bot_bloklagan_at is null as t from users where telegram_id = $1', [TG])).t === true);

  // Telegram my_chat_member: kicked → belgi, member → tozalanadi
  const mcm = (status) => yangilanish({ update_id: Math.random(), my_chat_member: {
    chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG), first_name: 'Sinov' },
    date: Math.floor(Date.now() / 1000),
    old_chat_member: { status: status === 'kicked' ? 'member' : 'kicked', user: { id: 1, is_bot: true } },
    new_chat_member: { status, user: { id: 1, is_bot: true } } } });
  await mcm('kicked');
  test('botni bloklasa belgilanadi (admin taqiqi emas)',
    (await qator('select (bot_bloklagan_at is not null and not is_blocked) as t from users where telegram_id = $1', [TG])).t === true);
  await mcm('member');
  test('blokdan chiqarsa belgi tozalanadi',
    (await qator('select bot_bloklagan_at is null as t from users where telegram_id = $1', [TG])).t === true);
}

// ═══ Noto'g'ri ketgan ommaviy xabarni hammadan o'chirish ═══
{
  globalThis.OCHIR_ORALIQ = 0;
  const B = await import('../src/services/broadcast.js');
  const odamlar = ['900101', '900102', '900103'];
  for (const t of odamlar) {
    await sorov(`insert into users (telegram_id, full_name) values ($1, 'Oluvchi') on conflict (telegram_id)
      do update set is_blocked = false, bot_bloklagan_at = null`, [t]);
  }
  const ids = (await sorov(`select id from users where telegram_id = any($1)`, [odamlar])).rows.map((r) => r.id);
  const kutTugash = async (sql, id) => { for (let i = 0; i < 200; i++) { const r = await qator(sql, [id]); if (r?.t) return true; await new Promise((z) => setTimeout(z, 50)); } return false; };
  const chatda = (matnQism) => korinadigan().filter((y) => odamlar.includes(String(y.chat_id)) && String(y.text || '').includes(matnQism));

  // 1) id lar saqlanadi va shular bilan o'chiriladi
  const nr = Date.now().toString(36);
  const b1 = await B.broadcastBoshla({ matn: `<b>Xato aksiya</b>, {ism}: hammasi 90% arzon ${nr}`, userIdlar: ids });
  await kutTugash(`select holat <> 'ketmoqda' as t from yuborishlar where id = $1`, b1.id);
  test('ommaviy xabar id lari saqlanadi', (await qator('select count(*)::int as n from yuborish_xabarlar where yuborish_id = $1', [b1.id])).n === 3);
  test('xabar 3 ta chatda ko‘rinadi', chatda('Xato aksiya').length === 3);
  const r1 = await B.yuborishniOchir({ id: b1.id });
  await kutTugash(`select ochirish_holat = 'tugadi' as t from yuborishlar where id = $1`, b1.id);
  test('id bilan: hammaning chatidan o‘chdi', r1.usul === 'id' && chatda('Xato aksiya').length === 0
    && (await qator('select ochirildi from yuborishlar where id = $1', [b1.id])).ochirildi === 3);

  // 2) id lar saqlanmagan eski xabar — matni bo'yicha qidirib o'chiriladi, boshqa xabarga tegmaydi
  const b2 = await B.broadcastBoshla({ matn: `Eski xato xabar: {ism}, ertaga do‘kon yopiq ${nr}`, userIdlar: ids });
  await kutTugash(`select holat <> 'ketmoqda' as t from yuborishlar where id = $1`, b2.id);
  await sorov('delete from yuborish_xabarlar where yuborish_id = $1', [b2.id]);
  const { yubor: botYubor } = await import('../src/bot/tg.js');
  await botYubor(odamlar[0], 'Boshqa muhim xabar — o‘chmasligi kerak');
  // Soxta serverda message_id hamma chat uchun UMUMIY (Telegram'da — har chatga alohida).
  // Bazadagi boshqa yuzlab odamlarni qidiruv vaqtida chetga olamiz, aks holda
  // id lar orasidagi masofa qidiruv chuqurligidan oshib ketadi.
  const chetda = (await sorov(`update users set bot_bloklagan_at = now() where telegram_id ~ '^[0-9]+$'
    and telegram_id <> all($1) and bot_bloklagan_at is null returning telegram_id`, [odamlar])).rows.map((r) => r.telegram_id);
  const r2 = await B.yuborishniOchir({ id: b2.id, adminChat: '700001' });
  await kutTugash(`select ochirish_holat = 'tugadi' as t from yuborishlar where id = $1`, b2.id);
  await sorov('update users set bot_bloklagan_at = null where telegram_id = any($1)', [chetda]);
  test('qidiruv bilan: matni mos xabar hammadan o‘chdi', r2.usul === 'qidiruv' && chatda('Eski xato xabar').length === 0,
    `${chatda('Eski xato xabar').length} qoldi`);
  test('qidiruv: boshqa xabarga tegmadi', chatda('Boshqa muhim xabar').length === 1);
  test('qidiruv: yordamchi «·» va forward nusxalari chatda qolmadi',
    !korinadigan().some((y) => (odamlar.includes(String(y.chat_id)) || String(y.chat_id) === '700001') && y.text === '·'));

  // 2b) Bir xil xabar 10 daqiqada qayta ommaviy ketmaydi (qaysi yo'l bilan kelmasin)
  const t1 = await B.broadcastBoshla({ matn: `Takror himoyasi sinovi ${nr}`, userIdlar: ids });
  const t2 = await B.broadcastBoshla({ matn: `Takror himoyasi sinovi ${nr}`, userIdlar: ids });
  test('bir xil xabar 10 daqiqa ichida qayta yuborilmaydi', !t1.takror && t2.takror === true && t2.id === t1.id && t2.jami === 0);
  await kutTugash(`select holat <> 'ketmoqda' as t from yuborishlar where id = $1`, t1.id);

  // 2c) Takror ketgan nusxalar GURUH bo'lib birga o'chiriladi
  await sorov(`insert into yuborishlar (matn, holat, jami, yuborildi, created_at, tugadi_at)
    select matn, 'tugadi', jami, yuborildi, created_at + interval '1 minute', tugadi_at + interval '1 minute' from yuborishlar where id = $1`, [t1.id]);
  const nusxaId = (await qator('select max(id) as id from yuborishlar where matn = $1', [`Takror himoyasi sinovi ${nr}`])).id;
  for (const t of odamlar) {
    const m = await botYubor(t, `Takror himoyasi sinovi ${nr}`);
    await sorov('insert into yuborish_xabarlar (yuborish_id, telegram_id, message_id) values ($1, $2, $3)', [nusxaId, t, m.result.message_id]);
  }
  test('nusxa bilan har chatda 2 tadan', odamlar.every((t) => korinadigan().filter((y) => String(y.chat_id) === t && y.text === `Takror himoyasi sinovi ${nr}`).length === 2));
  const rG = await B.yuborishniOchir({ id: t1.id });
  await kutTugash(`select ochirish_holat = 'tugadi' as t from yuborishlar where id = $1`, nusxaId);
  test('takror nusxalar birga o‘chdi', rG.nusxa === 2 && chatda(`Takror himoyasi sinovi ${nr}`).length === 0, `${chatda(`Takror himoyasi sinovi ${nr}`).length} qoldi`);

  // 3) 48 soatdan eski — Telegram o'chirmaydi, aniq aytiladi
  await sorov(`update yuborishlar set created_at = now() - interval '3 days', ochirish_holat = null where id = $1`, [b2.id]);
  test('48 soatdan eski xabar — tushunarli rad', /48 soat/.test((await B.yuborishniOchir({ id: b2.id })).xato || ''));
  test('matnni moslovchi {ism} va HTML ni hisobga oladi',
    B.moslovchi('<b>Salom</b>, {ism}! Aksiya')('Salom, Malika! Aksiya bugun') && !B.moslovchi('Salom, {ism}! Aksiya')('Boshqa matn'));
}

// ═══ Makiyaj: «💄 Menga mos makiyaj» — hammaga (o'chirganlarga yo'q) ═══
{
  const tugmalar = (y) => (y?.reply_markup?.inline_keyboard || []).flat();
  const menyuKor = async () => {
    const o = yuborilgan.length;
    await yangilanish({ update_id: Math.random(), message: { message_id: 300, date: Math.floor(Date.now() / 1000),
      chat: { id: Number(TG), type: 'private' }, from: { id: Number(TG), first_name: 'Sinov' }, text: '/menyu' } });
    return yuborilgan.slice(o).filter((y) => String(y.chat_id) === TG);
  };
  // Oldingi /ochir sinovi hisobni o'chirgan — ro'yxatdan o'tgan holatni tiklaymiz
  await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at) values ($1, 'Sinov', '+998901112233', 24, now())
    on conflict (telegram_id) do update set agreed_at = now(), full_name = 'Sinov', phone = '+998901112233', age = 24, is_blocked = false`, [TG]);
  // Standart — sinov rejimi: oddiy foydalanuvchiga tugma YO'Q
  await sorov(`delete from settings where key = 'makiyaj_holat'`);
  await sorov(`update users set gender = 'erkak', makiyaj = null, state = null where telegram_id = $1`, [TG]);
  test('sinov rejimi: oddiy odam menyusida makiyaj YO‘Q', !(await menyuKor()).some((y) => tugmalar(y).some((b) => b.callback_data === 'makiyaj')));
  await sorov(`insert into settings (key, value) values ('makiyaj_holat', '"ochiq"') on conflict (key) do update set value = excluded.value`);
  test('erkak: menyuda ham makiyaj tugmasi bor', (await menyuKor()).some((y) => tugmalar(y).some((b) => b.callback_data === 'makiyaj')));
  await sorov(`update users set makiyaj = false where telegram_id = $1`, [TG]);
  test('o‘chirgan odam: menyuda makiyaj tugmasi YO‘Q', !(await menyuKor()).some((y) => tugmalar(y).some((b) => b.callback_data === 'makiyaj')));
  await sorov(`update users set gender = 'ayol', makiyaj = null where telegram_id = $1`, [TG]);
  test('ayol: menyuda «💄 Menga mos makiyaj»', (await menyuKor()).some((y) => tugmalar(y).some((b) => b.callback_data === 'makiyaj')));
  await sorov(`delete from makiyaj_profillar where user_id = (select id from users where telegram_id = $1)`, [TG]);
  await sorov(`delete from analyses where user_id = (select id from users where telegram_id = $1)`, [TG]);
  const o1 = yuborilgan.length;
  await bosish('makiyaj');
  test('natija yo‘q — tugma bitta selfi so‘raydi (teri + makiyaj birga)',
    yuborilgan.slice(o1).some((y) => /teri tahlili va mos makiyaj/.test(y.text || '')));
  await sorov(`insert into settings (key, value) values ('kanal_tahlil', '"-1009988"'), ('kanal_tahlil_yoqilgan', 'true')
    on conflict (key) do update set value = excluded.value`);
  const o2 = yuborilgan.length;
  await rasmYubor();
  const rasmlar = yuborilgan.slice(o2).filter((y) => y.rasm && String(y.chat_id) === TG);
  await new Promise((r) => setTimeout(r, 300));
  test('tahlillar kanaliga makiyaj natijasi ham keldi', yuborilgan.slice(o2).some((y) => y.rasm
    && String(y.chat_id) === '-1009988' && /Makiyaj natijasi/.test(y.text || '')));
  await sorov(`delete from settings where key in ('kanal_tahlil', 'kanal_tahlil_yoqilgan')`);
  const rangXabar = rasmlar.find((y) => /Sizning rangingiz/.test(y.text || ''));
  test('bitta selfi — 2 ta rasm: teri natijasi va makiyaj', rasmlar.length === 2 && Boolean(rangXabar)
    && rasmlar[0] !== rangXabar, rasmlar.map((y) => (y.text || '').slice(0, 30)).join(' | '));
  test('makiyaj rasmi: izoh va tugmalar (to‘liq natija, yangi selfi)', /Kuz/.test(rangXabar?.text || '')
    && (rangXabar?.reply_markup?.inline_keyboard || []).flat().some((t) => t.callback_data === 'skaner'));
  test('teri natijasida ortiqcha «makiyaj» tugmasi yo‘q', !(rasmlar[0]?.reply_markup?.inline_keyboard || []).flat()
    .some((t) => t.callback_data === 'makiyaj'));
  const bog = await qator(`select analysis_id from makiyaj_profillar where user_id = (select id from users where telegram_id = $1)
    order by created_at desc limit 1`, [TG]);
  test('makiyaj natijasi o‘sha skanga bog‘landi (limit — bitta skan)', Boolean(bog?.analysis_id));
  const o4 = yuborilgan.length;
  await bosish('makiyaj');
  test('natija bor — tugma oxirgi makiyaj rasmini qaytaradi', yuborilgan.slice(o4).some((y) => y.rasm && /Sizning rangingiz/.test(y.text || '')));
  await sorov(`update users set makiyaj = false where telegram_id = $1`, [TG]);
  const o3 = yuborilgan.length;
  await bosish('makiyaj');
  test('o‘chirgan odam eski tugmani bossa — makiyaj boshlanmaydi',
    !yuborilgan.slice(o3).some((y) => /Sizga mos makiyajni|Sizning rangingiz/.test(y.text || '')));
  await sorov(`update users set gender = null, makiyaj = null where telegram_id = $1`, [TG]);
  await sorov(`delete from makiyaj_profillar where user_id = (select id from users where telegram_id = $1)`, [TG]);
  await sorov(`delete from settings where key = 'makiyaj_holat'`);
}

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
