import { soxtaServer, yuborilgan } from './soxta-server.mjs';
const PORT=4479; const srv=await soxtaServer(PORT);
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

let ok=0,xato=0;
const test=(n,c,i='')=>{c?(console.log(`  ✓ ${n}${i?' — '+i:''}`),ok++):(console.log(`  ✗ ${n}${i?' — '+i:''}`),xato++)};
const oxirgi=()=>yuborilgan[yuborilgan.length-1]||{};
const hammasi=()=>yuborilgan.map(x=>x.text||'').join('\n');
const tugmalar=()=>(oxirgi().reply_markup?.inline_keyboard||[]).flat();
const yoz=async(id,t)=>{yuborilgan.length=0;
  await yangilanish({message:{message_id:1,chat:{id:Number(id),type:'private'},from:{id:Number(id)},text:t}});};
const kut=(ms=350)=>new Promise(r=>setTimeout(r,ms));
const bos=async(id,data,msgId=1)=>{yuborilgan.length=0;
  await yangilanish({callback_query:{id:'c1',from:{id:Number(id)},data,
    message:{message_id:msgId,chat:{id:Number(id),type:'private'}}}});
  await kut();};

// --- Ma'lumot tayyorlash ---
await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at, is_admin)
  values ('700001','Admin','+998901112233',30,now(),true)
  on conflict (telegram_id) do update set is_admin=true, agreed_at=now()`);
await sorov(`insert into users (telegram_id, full_name, phone, age, agreed_at)
  values ('800001','Malika Aliyeva','+998901112233',24,now())
  on conflict (telegram_id) do update set agreed_at=now()`);
await sorov(`update products set manba_url='https://www.coupang.com/vp/products/111', manba='coupang' where id=1`);
await sorov(`update products set manba_url='https://www.daiso.co.kr/p/222', manba='daiso' where id=2`);
const mijoz = await qator(`select id from users where telegram_id='800001'`);

async function buyurtma(no, mahsulotlar) {
  const items = JSON.stringify(mahsulotlar.map(([id,nom,qty])=>({product_id:id,name:nom,qty,price:100000})));
  return qator(`insert into orders (order_no,user_id,customer_name,customer_phone,customer_address,
      viloyat,tuman,items,subtotal,delivery_fee,discount,total,cost_total,status,payment_status)
    values ($1,$2,'Malika Aliyeva','+998901112233','Bunyodkor 12-uy, 45-xonadon',
      'Toshkent shahri','Chilonzor tumani',$3::jsonb,300000,0,0,300000,150000,'tasdiqlangan','tolangan')
    returning *`, [no, mijoz.id, items]);
}
await buyurtma('QQ-001',[[1,'Cleansing Oil',2],[2,'Toner',1]]);
await buyurtma('QQ-002',[[1,'Cleansing Oil',3]]);

console.log('\n── /orders: XARID RO‘YXATI ──');
await yoz('700001','/orders');
const ro = hammasi();
test('ro‘yxat chiqdi', /XARID RO‘YXATI/.test(ro));
test('mahsulotlar jamlandi (5 dona)', /5 dona/.test(ro), ro.match(/\d+ dona/g)?.join(', '));
test('Coupang havolasi bosiladigan', /href="https:\/\/www\.coupang\.com/.test(ro));
test('Daiso havolasi bosiladigan', /href="https:\/\/www\.daiso\.co\.kr/.test(ro));
test('«Qabul qilindi» tugmasi bor', tugmalar().some(b=>/Qabul qilindi/.test(b.text)));
const qabulTugma = tugmalar().find(b=>/Qabul qilindi/.test(b.text));

console.log('\n── QABUL QILINDI ──');
await bos('700001', qabulTugma.callback_data);
test('partiya yopildi', /qabul qilindi/i.test(hammasi()), hammasi().match(/P-\d+-\d+/)?.[0]);
const st = await qatorlar(`select status, count(*)::int n from orders group by status`);
test('buyurtmalar qadoqlashga o‘tdi',
  st.some(x=>x.status==='qadoqlanmoqda' && x.n===2), st.map(x=>`${x.status}:${x.n}`).join(', '));
test('mijozga xabar bordi', yuborilgan.some(x=>String(x.chat_id)==='800001' && /qadoqlan/i.test(x.text||'')));

console.log('\n── QAYTA /orders (yangi partiya) ──');
await yoz('700001','/orders');
test('ro‘yxat endi bo‘sh', /bo‘sh/i.test(hammasi()), hammasi().split('\n')[0]);
await buyurtma('QQ-003',[[2,'Toner',4]]);
await yoz('700001','/orders');
test('yangi buyurtma yangi ro‘yxatga tushdi', /4 dona/.test(hammasi()));
const p2 = (await qatorlar(`select raqam, holat from partiyalar order by id`));
test('ikkita partiya bor', p2.length===2, p2.map(x=>`${x.raqam}=${x.holat}`).join(', '));

console.log('\n── BOSQICHLAR ──');
const par = await qator(`select id from partiyalar where holat='qabul_qilingan' limit 1`);
await bos('700001', `ph:${par.id}:korea_jonatildi`);
test('partiya Koreyadan jo‘natildi', /Koreyadan jo‘natildi/.test(hammasi()));
test('mijozga bosqich xabari bordi',
  yuborilgan.some(x=>String(x.chat_id)==='800001' && /Koreyadan/.test(x.text||'')));

console.log('\n── POCHTA HUJJATI ──');
await bos('700001', `pd:${par.id}`);
const hujjat = yuborilgan.find(x=>x.hujjat);
test('Word fayl yuborildi', Boolean(hujjat), hujjat ? `${(hujjat.hajm/1024).toFixed(1)} KB` : '');

console.log('\n── MIJOZ JARAYONNI KO‘RADI ──');
await bos('800001','buyurtmalar');
const j = hammasi();
test('jarayon ko‘rsatilgan', /qayerda/i.test(j));
test('o‘tilgan bosqich belgilangan', /✅/.test(j) && /🔵/.test(j) && /⚪️/.test(j));

console.log('\n── BREND ──');
await yoz('700001','/brend Meduza Beauty');
test('brend o‘zgardi', /Meduza Beauty/.test(hammasi()));
await yoz('800001','/start');
test('menyuda yangi brend', /Meduza Beauty/.test(hammasi()));
await yoz('700001','/brend Meduza Cosmetics');

console.log('\n── MAJBURIY KANAL ──');
await sorov(`update settings set value='"@meduza_kanal"'::jsonb where key='majburiy_kanal'`);
await sorov(`update settings set value='"https://t.me/meduza_kanal"'::jsonb where key='majburiy_kanal_havola'`);
const { keshniTashla } = await import('../src/lib/kesh.js');
keshniTashla();
// Soxta server getChatMember ga 'left' qaytaradi
await yoz('800001','/start');
test('a‘zo bo‘lmagan to‘siladi', /obuna bo‘ling/i.test(hammasi()), hammasi().split('\n')[0]);
test('obuna havolasi bor', (oxirgi().reply_markup?.inline_keyboard||[]).flat()
  .some(b=>b.url==='https://t.me/meduza_kanal'));
await yoz('700001','/start');
test('ADMIN to‘silmaydi', !/obuna bo‘ling/i.test(hammasi()));

// A'zo bo'ldi
keshniTashla();
globalThis.AZO = true;
await yoz('800001','/start');
test('a‘zo bo‘lgach o‘tkaziladi', !/obuna bo‘ling/i.test(hammasi()));
await sorov(`update settings set value='""'::jsonb where key='majburiy_kanal'`);
keshniTashla();

console.log(`\n${xato?'❌':'✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato?1:0);
