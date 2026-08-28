// Botning to'liq yo'lini soxta Telegram va Gemini bilan sinaydi.
// Haqiqiy kalit kerak emas — faqat ishlaydigan Postgres.
//
//   DATABASE_URL=postgresql://... node test/bot-oqimi.mjs
//
// Botda "Xatolik yuz berdi" chiqsa, avval shuni ishga tushiring: agar bu yerda
// hammasi o'tsa, muammo kodda emas — kalitlarda yoki tarmoqda.
import { soxtaServer, yuborilgan } from './soxta-server.mjs';

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
const { sorov, pool } = await import('../src/db.js');
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
const t = oxirgi().text || '';
test('rasmga tahlil qaytaradi', /Tahlil tayyor/.test(t), `${yuborilgan.length} ta xabar`);
test('foiz shkalasi bor', /■+□*\s*\d+%/.test(t));
test('muammo joyi ko‘rsatilgan', /📍/.test(t));
test('sabab va yechim bor', /Sababi/.test(t) && /Yechimi/.test(t));
test('tibbiy ogohlantirish bor', /tashxis emas/.test(t));
test('Mini App tugmasi bor',
  (oxirgi().reply_markup?.inline_keyboard || []).flat().some((b) => b.web_app));

for (const [data, kutilgan] of [
  ['menyu', /Meduza Cosmetics/], ['skaner', /Yuz skaneri/], ['konsultatsiya', /Konsultatsiya/],
  ['profil', /Profilingiz/], ['yordam', /Yordam/], ['buyurtmalar', /buyurtma/i],
]) {
  yuborilgan.length = 0;
  await bosish(data);
  test(`tugma «${data}» ishlaydi`, kutilgan.test(oxirgi().text || ''));
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
test('rasmdan keyin batafsil matn ham keladi',
  yuborilgan.some((x) => !x.rasm && /Sababi/.test(x.text || '')));

const { qator } = await import('../src/db.js');
const saqlangan = await qator(
  `select natija_rasm_id from analyses where user_id = (select id from users where telegram_id = $1)
    order by created_at desc limit 1`, [TG]);
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

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
