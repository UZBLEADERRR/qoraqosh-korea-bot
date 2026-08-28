import { soxtaServer, yuborilgan } from './soxta-server.mjs';
const PORT=4480; const srv=await soxtaServer(PORT);
process.env.BOT_TOKEN='111111:TEST';
process.env.ADMIN_LOGIN='a'; process.env.ADMIN_PASSWORD='parol12345';
process.env.ADMIN_JWT_SECRET='x'.repeat(30);
process.env.TELEGRAM_API=`http://127.0.0.1:${PORT}`;
process.env.GEMINI_API=`http://127.0.0.1:${PORT}/models`; process.env.GEMINI_API_KEY='soxta';
process.env.PUBLIC_URL='https://sinov.example';
process.env.ADMIN_TELEGRAM_IDS='700001';

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, qatorlar, pool } = await import('../src/db.js');
const { yangilanish } = await import('../src/bot/index.js');
const { agentBirMarta } = await import('../src/services/agent-jadval.js');

let ok=0,xato=0;
const test=(n,c,i='')=>{c?(console.log(`  ✓ ${n}${i?' — '+i:''}`),ok++):(console.log(`  ✗ ${n}${i?' — '+i:''}`),xato++)};
const hammasi=()=>yuborilgan.map(x=>x.text||'').join('\n');
const oxirgi=()=>yuborilgan[yuborilgan.length-1]||{};
const tugmalar=()=>yuborilgan.flatMap(x=>(x.reply_markup?.inline_keyboard||[]).flat());
const kut=(ms=400)=>new Promise(r=>setTimeout(r,ms));
const yoz=async(id,t)=>{yuborilgan.length=0;
  await yangilanish({message:{message_id:1,chat:{id:Number(id),type:'private'},from:{id:Number(id)},text:t}});await kut();};
const bos=async(id,data)=>{yuborilgan.length=0;
  await yangilanish({callback_query:{id:'c1',from:{id:Number(id)},data,
    message:{message_id:1,chat:{id:Number(id),type:'private'}}}});await kut();};

await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at, is_admin)
  values ('700001','Admin','+998901112233',30,now(),true)
  on conflict (telegram_id) do update set is_admin=true, agreed_at=now()`);
await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at)
  values ('800001','Malika','+998901112233',24,now())
  on conflict (telegram_id) do update set agreed_at=now()`);

console.log('\n── AGENT: REJA TUZISH ──');
await yoz('700001','/reja');
test('reja menyusi ochildi', /Kanal agenti/.test(hammasi()));
await bos('700001','rj_yangi');
test('topshiriq so‘raldi', /Topshiriqni/.test(hammasi()));
await yoz('700001','Har kuni soat 9 da teri parvarishi haqida foydali post joyla');
test('AI 30 kunlik reja tuzdi', /30 kunlik reja tayyor/.test(hammasi()), hammasi().match(/\d+ kunlik/)?.[0]);
test('mavzular ko‘rsatildi', /1-kun/.test(hammasi()));
await yoz('700001','@meduza_kanal');
test('soat so‘raldi', /Qaysi soatda/.test(hammasi()));
const soatTugma = tugmalar().find(b=>/9:00/.test(b.text));
await bos('700001', soatTugma.callback_data);
test('reja ishga tushdi', /ishga tushdi/.test(hammasi()));
test('tasdiqsiz chiqmasligi aytildi', /tasdiqlamaguncha/.test(hammasi()));

console.log('\n── AGENT: POST TAYYORLASH ──');
const reja = await qator(`select id from rejalar limit 1`);
yuborilgan.length=0;
await bos('700001', `rj:${reja.id}`);
const hozirTugma = tugmalar().find(b=>/Hozir bitta tayyorla/.test(b.text));
await bos('700001', hozirTugma.callback_data);
const post = yuborilgan.find(x=>x.rasm);
test('post RASM bilan tayyorlandi', Boolean(post), post?`${(post.hajm/1024).toFixed(0)} KB`:'');
test('post matni bor', /namlang/i.test(post?.text||''));
test('kanalga hali chiqmadi', !yuborilgan.some(x=>String(x.chat_id)==='@meduza_kanal'));
const tb = tugmalar();
for (const kutilgan of ['Kanalga joylash','O‘zim yozaman','AI ga aytaman','Boshqa variant','O‘tkazib'])
  test(`tugma «${kutilgan}»`, tb.some(b=>b.text.includes(kutilgan)));

console.log('\n── AGENT: AI GA TUZATISH AYTISH ──');
const band = await qator(`select id from reja_bandlari where holat='tasdiq_kutilmoqda' limit 1`);
await bos('700001', `pf:${band.id}`);
test('nimani to‘g‘rilash so‘raldi', /Nimani to‘g‘rilay/.test(hammasi()));
await yoz('700001','Juda uzun, qisqartir');
test('AI qayta yozdi', yuborilgan.some(x=>x.rasm));

console.log('\n── AGENT: KANALGA JOYLASH ──');
const band2 = await qator(`select id from reja_bandlari where holat='tasdiq_kutilmoqda' order by id limit 1`);
await bos('700001', `pj:${band2.id}`);
const kanalga = yuborilgan.find(x=>String(x.chat_id)==='@meduza_kanal');
test('KANALGA joylandi', Boolean(kanalga), kanalga?.rasm?'rasm bilan':'matn');
test('adminga tasdiq keldi', /joylandi/i.test(hammasi()));
const b2 = await qator(`select holat from reja_bandlari where id=$1`,[band2.id]);
test('band «joylandi» deb belgilandi', b2.holat==='joylandi', b2.holat);
const rasmQoldi = await qator(`select count(*)::int n from media where tur='post'`);
test('joylangan post rasmi o‘chirildi', rasmQoldi.n === 0, `${rasmQoldi.n} ta qoldi`);

console.log('\n── AGENT: JADVAL ──');
await sorov(`update rejalar set soat = 0`);
await sorov(`update reja_bandlari set holat='rejada' where holat<>'joylandi'`);
yuborilgan.length=0;
await agentBirMarta(); await kut(600);
test('jadval postni o‘zi tayyorladi', yuborilgan.some(x=>x.rasm));
yuborilgan.length=0;
await agentBirMarta(); await kut(400);
test('bir kunda IKKINCHI post tayyorlamaydi', !yuborilgan.some(x=>x.rasm),
  `${yuborilgan.length} ta xabar`);

console.log('\n── BROADCAST ──');
await yoz('700001','/reklama');
test('reklama boshlandi', /Reklama xabari/.test(hammasi()));
test('oluvchilar soni ko‘rsatildi', /\d+ ta<\/b> foydalanuvchi/.test(hammasi()));
await yoz('700001','🎁 Chegirma boshlandi!');
test('oldindan ko‘rsatildi', /Shunday ko‘rinadi/.test(hammasi()));
const yuborTugma = tugmalar().find(b=>/Hammaga yuborish/.test(b.text));
await bos('700001', yuborTugma.callback_data);
await kut(1200);
test('foydalanuvchiga yetdi', yuborilgan.some(x=>String(x.chat_id)==='800001' && /Chegirma boshlandi/.test(x.text||'')));
const y = await qator(`select * from yuborishlar order by id desc limit 1`);
test('yuborish bazaga yozildi', y && y.yuborildi >= 2, `${y?.yuborildi}/${y?.jami}`);

console.log(`\n${xato?'❌':'✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato?1:0);
