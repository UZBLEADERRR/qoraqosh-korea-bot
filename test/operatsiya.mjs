import { soxtaServer, yuborilgan, aiHisobi } from './soxta-server.mjs';
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
const { sorov, qator, qatorlar, qiymat, pool } = await import('../src/db.js');
const { yangilanish } = await import('../src/bot/index.js');

// Admin API sini to'g'ridan-to'g'ri chaqirish — server ko'tarmasdan.
// HTTP so'rovi va javobi taqlid qilinadi, marshrutlash haqiqiy kod bilan.
const { adminRoutes } = await import('../src/api/admin.js');
const { apiRoutes } = await import('../src/api/routes.js');
const { issueAdminToken } = await import('../src/lib/auth.js');
const { Readable } = await import('node:stream');
const adminToken = issueAdminToken({ rol: 'admin' });

const chaqirAdmin = (yol, usul, tana) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json',
               'content-length': String(bayt.length) },
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
  // Haqiqiy serverda marshrutga yo'lning O'ZI beriladi, so'rov satri emas
  adminRoutes(req, javob, yol.split('?')[0])
    .catch((e) => res({ kod: 500, tana: { error: e.message } }));
});

// CSV kabi JSON bo'lmagan javob uchun: tanani xom ko'rinishda qaytaradi
const chaqirXom = (yol) => new Promise((res) => {
  const req = Object.assign(new Readable({ read() { this.push(null); } }), {
    url: yol, method: 'GET',
    headers: { authorization: `Bearer ${adminToken}` },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const bolaklar = [];
  const sarlavhalar = {};
  const javob = {
    statusCode: 200, headersSent: false,
    writeHead(k, h) { this.statusCode = k; Object.assign(sarlavhalar, h || {}); return this; },
    setHeader(k, v) { sarlavhalar[k] = v; },
    end(x) { if (x) bolaklar.push(x);
      res({ kod: this.statusCode, sarlavhalar,
            tana: Buffer.concat(bolaklar.map(Buffer.from)).toString('utf8') }); },
  };
  adminRoutes(req, javob, yol.split('?')[0])
    .catch((e) => res({ kod: 500, sarlavhalar, tana: e.message }));
});

// Mini App API si — Telegram imzosi yoki brauzer seansi tokeni bilan
const chaqirIlova = (yol, usul, tana, token) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { 'content-type': 'application/json', 'content-length': String(bayt.length),
               ...(token ? { authorization: `Bearer ${token}` } : {}) },
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
// Sinov qayta-qayta ishga tushirilsa toza holatdan boshlansin: aks holda
// order_no takrorlanadi va oldingi yurishdan qolgan buyurtmalar sanoqni buzadi.
await sorov(`delete from partiyalar`);
await sorov(`delete from orders`);
// Marketplace importi katalogga qo'shgan sinov mahsulotlari: qolib ketsa
// keyingi yurishda "bu mahsulot allaqachon bor" deb o'tkazib yuboriladi.
await sorov(`delete from products where brand in ('TestBrand','Daiso')`);
await sorov(`delete from marketplace_topilgan`);
await sorov(`delete from marketplace_vazifa`);
await sorov(`delete from settings where key = 'marketplace_jadval'`);
await sorov(`delete from reja_bandlari`);
await sorov(`delete from rejalar`);
await sorov(`delete from media where tur = 'post'`);
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

// Buzuq buyurtma qatori /orders ni butunlay yiqitardi va admin HECH
// QANDAY javob ko'rmasdi — bot ishlamayaptimi, ro'yxat bo'shmi bilib
// bo'lmasdi. Endi bunday qator nomi bo'yicha ro'yxatga tushadi.
console.log('\n── BUZUQ BUYURTMA /orders NI YIQITMAYDI ──');
{
  const u = await qator(`select id from users where telegram_id = '800001'`);
  await sorov(`insert into orders (order_no,user_id,customer_name,customer_phone,
      customer_address,items,subtotal,delivery_fee,discount,total,status,payment_status)
    values ('QQ-BUZUQ',$1,'Sinov','+998901112233','Manzil',
      '[{"name":"Product_id siz qator","qty":2,"price":50000}]'::jsonb,
      100000,0,0,100000,'tasdiqlangan','tolangan')`, [u.id]);
  yuborilgan.length = 0;
  await yoz('700001', '/orders');
  const b = hammasi();
  test('buzuq qator bilan ham javob keldi', /XARID RO‘YXATI/.test(b), b.split('\n')[0]);
  test('buzuq qator ro‘yxatda ko‘rinadi', /Product_id siz qator/.test(b));
  await sorov(`delete from orders where order_no = 'QQ-BUZUQ'`);
}

// Buyruq ichida xato chiqsa ham admin jim qolmasligi kerak
console.log('\n── XATO BO‘LSA ADMIN XABAR OLADI ──');
{
  // Ro'yxat bo'sh bo'lsa buyruq erta qaytadi va xatoga bormaydi
  const u2 = await qator(`select id from users where telegram_id = '800001'`);
  await sorov(`insert into orders (order_no,user_id,customer_name,customer_phone,
      customer_address,items,subtotal,delivery_fee,discount,total,status,payment_status)
    values ('QQ-XATO',$1,'Sinov','+998901112233','Manzil',
      '[{"product_id":1,"name":"Cleansing Oil","qty":1,"price":50000}]'::jsonb,
      50000,0,0,50000,'tasdiqlangan','tolangan')`, [u2.id]);
  yuborilgan.length = 0;
  // Bazani vaqtincha buzamiz — buyruq ichida haqiqiy istisno chiqsin
  await sorov(`alter table products rename to products_vaqt`);
  await yoz('700001', '/orders');
  await sorov(`alter table products_vaqt rename to products`);
  test('xato haqida xabar berildi', /bajarilmadi/i.test(hammasi()),
    hammasi().split('\n')[0]);
  test('admin jim qolmadi', yuborilgan.length > 0, `${yuborilgan.length} ta xabar`);
  await sorov(`delete from orders where order_no = 'QQ-XATO'`);
}

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
await yoz('700001','/brend KiOVO');

console.log('\n── QO‘LLANMA HUJJATI ──');
yuborilgan.length=0;
await bos('700001', `pk:${par.id}`);
const qol = yuborilgan.find(x=>x.hujjat);
test('qo‘llanma fayli yuborildi', Boolean(qol), qol?`${(qol.hajm/1024).toFixed(1)} KB`:'');
test('partiya qo‘llanmasi ham PDF', /\.pdf$/.test(qol?.nom||''), qol?.nom);
test('izohda buyurtma soni bor', /ta buyurtma/.test(qol?.text||''));

console.log('\n── KANALDAN TO‘LOVNI TASDIQLASH ──');
await sorov(`update settings set value='"-100777"'::jsonb where key='kanal_buyurtma'`);
const yangiB = await buyurtma('QQ-900',[[1,'Cleansing Oil',1]]);
await sorov(`update orders set status='yangi', payment_status='chek_yuborilgan' where id=$1`,[yangiB.id]);
yuborilgan.length=0;
await bos('700001', `tt:${yangiB.id}`);
const ordDb = await qator(`select status, payment_status from orders where id=$1`,[yangiB.id]);
test('to‘lov tasdiqlandi', ordDb.payment_status==='tolangan', ordDb.payment_status);
test('buyurtma xaridga o‘tdi', ordDb.status==='tasdiqlangan', ordDb.status);
test('mijozga xabar bordi', yuborilgan.some(x=>String(x.chat_id)==='800001'));
yuborilgan.length=0;
await bos('700001', `tt:${yangiB.id}`);
test('ikkinchi marta tasdiqlanmaydi', !yuborilgan.some(x=>String(x.chat_id)==='800001'));

console.log('\n── YETKAZISH NARXI ──');
const { yetkazishNarxi, ogirlikHisobla, variantlar } = await import('../src/services/yetkazish.js');
await sorov(`update products set ogirlik = 300 where id in (1,2)`);
const { keshniTashla: kt } = await import('../src/lib/kesh.js'); kt();
const og = await ogirlikHisobla([{product_id:1,quantity:2},{product_id:2,quantity:1}]);
test('og‘irlik qadoq bilan hisoblandi', og === 300*3 + 200, `${og} g`);
// EMU tarifi: Toshkentdan Samarqand markazi = 2-zona, shahar
const f = await yetkazishNarxi({items:[{product_id:1,quantity:1}],turi:'filial',
  viloyat:'Samarqand viloyati',tuman:'Samarqand'});
test('EMU: Samarqand markazi, ofisgacha', f.narx === 27000, `${f.narx} so‘m, ${f.kilo} kg, zona ${f.izoh.zona}`);
const u = await yetkazishNarxi({items:[{product_id:1,quantity:1}],turi:'uy',
  viloyat:'Samarqand viloyati',tuman:'Samarqand'});
test('EMU: Samarqand markazi, uygacha', u.narx === 47000, `${u.narx} so‘m`);
const tum = await yetkazishNarxi({items:[{product_id:1,quantity:1}],turi:'uy',
  viloyat:'Samarqand viloyati',tuman:'Urgut tumani'});
test('tuman markazdan qimmatroq', tum.narx === 62000, `Urgut -> ${tum.narx} so‘m (${tum.izoh.masofa})`);
const ogir = await yetkazishNarxi({turi:'filial',gramm:3500,viloyat:'Samarqand viloyati',tuman:'Samarqand'});
test('og‘ir jo‘natma qimmatroq', ogir.narx === 27000 + 3*7000, `4 kg -> ${ogir.narx} so‘m`);
const v = await variantlar({items:[{product_id:1,quantity:1}],viloyat:'Buxoro viloyati',tuman:'Buxoro'});
test('ikkala variant qaytadi', v.filial.narx < v.uy.narx, `${v.filial.narx} / ${v.uy.narx}`);
test('hisob tafsiloti saqlanadi', f.izoh?.manba === 'emu' && f.izoh.zona === 2,
  `zona ${f.izoh?.zona}, ${f.izoh?.masofa}`);

console.log('\n── OYLIK HISOBOT ──');
const { qatorlar: qq } = await import('../src/db.js');
const oylar = await qq(`
  select to_char(created_at at time zone 'Asia/Tashkent', 'YYYY-MM') as oy,
         count(*)::int as buyurtma,
         coalesce(sum(subtotal),0)::bigint as mahsulot_daromadi,
         coalesce(sum(discount),0)::bigint as chegirma,
         coalesce(sum(delivery_fee),0)::bigint as yetkazish,
         coalesce(sum(cost_total),0)::bigint as tannarx,
         (coalesce(sum(subtotal),0)-coalesce(sum(discount),0)-coalesce(sum(cost_total),0))::bigint as sof_foyda
    from orders where status <> 'bekor' group by 1 order by 1 desc`);
test('oylik hisobot chiqadi', oylar.length > 0, `${oylar.length} oy`);
if (oylar.length) {
  const o = oylar[0];
  test('sof foyda = daromad − chegirma − tannarx',
    Number(o.sof_foyda) === Number(o.mahsulot_daromadi) - Number(o.chegirma) - Number(o.tannarx),
    `${o.sof_foyda}`);
  test('yetkazish alohida', o.yetkazish !== undefined);
}
// bigint: int4 chegarasidan oshsa ham sinmasin
const katta = await qq(`select (2200000000::bigint * 3)::bigint as x`);
test('katta summa bigint bilan sinmaydi', Number(katta[0].x) === 6600000000, `${katta[0].x}`);

console.log('\n── MAJBURIY KANAL ──');
await sorov(`update settings set value='"@meduza_kanal"'::jsonb where key='majburiy_kanal'`);
await sorov(`update settings set value='"https://t.me/meduza_kanal"'::jsonb where key='majburiy_kanal_havola'`);
const { keshniTashla } = await import('../src/lib/kesh.js');
keshniTashla();
globalThis.KANAL = 'ochiq';
// Soxta server getChatMember ga 'left' qaytaradi
await yoz('800001','/start');
test('a‘zo bo‘lmagan to‘siladi', /obuna bo‘ling/i.test(hammasi()), hammasi().split('\n')[0]);
test('obuna havolasi TUGMADA bor', (oxirgi().reply_markup?.inline_keyboard||[]).flat()
  .some(b=>b.url==='https://t.me/meduza_kanal'));
test('obuna havolasi MATNDA ham bor', /https:\/\/t\.me\/meduza_kanal/.test(oxirgi().text||''),
  'tugma ishlamasa ham odam qayerga borishni biladi');
await yoz('700001','/start');
test('ADMIN to‘silmaydi', !/obuna bo‘ling/i.test(hammasi()));

// A'zo bo'ldi
keshniTashla();
globalThis.AZO = true;
await yoz('800001','/start');
test('a‘zo bo‘lgach o‘tkaziladi', !/obuna bo‘ling/i.test(hammasi()));
globalThis.AZO = false;

// ── Havola qayerdan topiladi ──
console.log('  · havola manbalari:');
const havolaSinovi = async (nom, kanal, qoldaHavola, kutilgan) => {
  await sorov(`update settings set value=$1::jsonb where key='majburiy_kanal'`, [JSON.stringify(kanal)]);
  await sorov(`update settings set value=$1::jsonb where key='majburiy_kanal_havola'`,
    [JSON.stringify(qoldaHavola)]);
  keshniTashla();
  await yoz('800001','/start');
  const tugma = (oxirgi().reply_markup?.inline_keyboard||[]).flat().find(b=>b.url);
  const tosildi = /obuna bo‘ling/i.test(hammasi());
  if (kutilgan === null) {
    test(`    ${nom}: to‘smaydi`, !tosildi,
      tosildi ? 'TO‘SDI — foydalanuvchi qamalib qolardi!' : 'obuna vaqtincha o‘chdi');
  } else {
    test(`    ${nom}`, tugma?.url === kutilgan, tugma?.url || 'TUGMA YO‘Q');
  }
};
globalThis.KANAL = 'ochiq';
await havolaSinovi('@nom dan', '@meduza_kanal', '', 'https://t.me/meduza_kanal');
await havolaSinovi('qo‘lda yozilgan', '-1001234567890', 'https://t.me/+qolda', 'https://t.me/+qolda');
await havolaSinovi('kanal nomidan (getChat)', '-1001234567890', '', 'https://t.me/meduza_kanal');
globalThis.KANAL = 'yopiq_havolali';
await havolaSinovi('kanalning taklif havolasi', '-1001234567890', '', 'https://t.me/+eskiHavola');
globalThis.KANAL = 'yopiq';
await havolaSinovi('bot o‘zi yaratadi', '-1001234567890', '', 'https://t.me/+yangiHavola');
globalThis.HAVOLA_YARATILMAYDI = true;
await havolaSinovi('havola umuman yo‘q', '-1001234567890', '', null);
globalThis.HAVOLA_YARATILMAYDI = false;
globalThis.KANAL = 'yoq';
await havolaSinovi('kanal topilmadi', '-1001234567890', '', null);

await sorov(`update settings set value='""'::jsonb where key='majburiy_kanal'`);
keshniTashla();

// ═══════════ DONA CHEGIRMASI VA MINIMAL BUYURTMA ═══════════
console.log('\n── DONA CHEGIRMASI VA MINIMAL SUMMA ──');
{
  const q1 = qator;
  const mijoz = await q1(`select id from users where telegram_id='800001'`);
  await sorov(`update products set price=80000, stock=100, is_active=true where id in (1,2)`);
  await sorov(`update settings set value='[]'::jsonb where key='chegirma_pogonalari'`);
  await sorov(`update settings set value='5000'::jsonb where key='mahsulot_chegirma'`);
  await sorov(`update settings set value='1'::jsonb where key='mahsulot_chegirma_dan'`);
  await sorov(`update settings set value='0'::jsonb where key='minimal_buyurtma'`);
  await sorov(`update settings set value='99000000'::jsonb where key='free_delivery_from'`);

  const ber = (dona, yetkazish = 30000) => q1(
    `select subtotal, discount, delivery_fee, total, chegirma_izoh from place_order(
       $1, jsonb_build_array(jsonb_build_object('product_id',1,'quantity',$2::int)),
       'Sinov','+998901112233','Toshkent, 5-uy 12-xonadon', null, 'karta',
       'Toshkent shahri','Chilonzor tumani',$3,'filial',1200)`, [mijoz.id, dona, yetkazish]);

  const olti = await ber(6);
  test('6 ta mahsulot -> 30 000 chegirma', Number(olti.discount) === 30000,
    `${olti.discount} so‘m`);
  test('30 000 yo‘lkira o‘zini qopladi', Number(olti.total) === Number(olti.subtotal),
    `${olti.subtotal} -> ${olti.total}`);
  test('hisob tafsiloti saqlandi', Number(olti.chegirma_izoh?.dona) === 6);

  const bir = await ber(1);
  test('1 ta mahsulot -> 5 000 chegirma', Number(bir.discount) === 5000);

  // Chegirma faqat 3 donadan boshlansin
  await sorov(`update settings set value='3'::jsonb where key='mahsulot_chegirma_dan'`);
  const ikki = await ber(2);
  test('chegarasidan kam bo‘lsa chegirma yo‘q', Number(ikki.discount) === 0);
  const uch = await ber(3);
  test('chegarada chegirma boshlanadi', Number(uch.discount) === 15000);
  await sorov(`update settings set value='1'::jsonb where key='mahsulot_chegirma_dan'`);

  // Pog'ona chegirmasi bilan QO'SHILADI
  await sorov(`update settings set value='[{"dan":200000,"chegirma":20000}]'::jsonb
               where key='chegirma_pogonalari'`);
  const q = await ber(4);   // 320 000 -> pog'ona 20 000 + dona 20 000
  test('pog‘ona va dona chegirmasi qo‘shiladi', Number(q.discount) === 40000, `${q.discount} so‘m`);
  await sorov(`update settings set value='[]'::jsonb where key='chegirma_pogonalari'`);

  // Chegirma hech qachon summadan oshmasin
  await sorov(`update settings set value='500000'::jsonb where key='mahsulot_chegirma'`);
  const kop = await ber(1);
  test('chegirma summadan oshmaydi', Number(kop.discount) === Number(kop.subtotal),
    `${kop.discount} / ${kop.subtotal}`);
  await sorov(`update settings set value='5000'::jsonb where key='mahsulot_chegirma'`);

  // Minimal buyurtma
  await sorov(`update settings set value='300000'::jsonb where key='minimal_buyurtma'`);
  let xatoMatni = '';
  try { await ber(2); } catch (e) { xatoMatni = e.message; }
  test('minimal summadan kam buyurtma o‘tmaydi', /MINIMAL_SUMMA:300000:160000/.test(xatoMatni),
    xatoMatni.slice(0, 60));

  const { buyurtmaYarat } = await import('../src/services/orders.js');
  let mijozgaKorinadigan = '';
  try {
    await buyurtmaYarat({ id: mijoz.id, full_name: 'Sinov', phone: '+998901112233' },
      [{ product_id: 1, quantity: 2 }],
      { address: 'Toshkent, 5-uy 12-xonadon', viloyat: 'Toshkent shahri', tuman: 'Chilonzor tumani' });
  } catch (e) { mijozgaKorinadigan = e.message; }
  test('mijoz tushunarli xato ko‘radi', /Minimal buyurtma/.test(mijozgaKorinadigan),
    mijozgaKorinadigan);

  const yetadi = await ber(4);
  test('minimal summadan oshsa o‘tadi', Number(yetadi.subtotal) === 320000);
  await sorov(`update settings set value='0'::jsonb where key='minimal_buyurtma'`);
  await sorov(`update settings set value='0'::jsonb where key='mahsulot_chegirma'`);
  await sorov(`update settings set value='500000'::jsonb where key='free_delivery_from'`);
}

// ═══════════ MAHSULOTNI TO'LIQ O'CHIRISH ═══════════
console.log('\n── MAHSULOTNI TO‘LIQ O‘CHIRISH ──');
{
  const q1 = qator;
  const mijoz = await q1(`select id from users where telegram_id='800001'`);
  const yangi = await q1(
    `insert into products (name, brand, price, cost_price, stock, is_active)
     values ('Sinov mahsuloti','SINOV',50000,20000,10,true) returning id`);
  await sorov(`insert into cart_items (user_id, product_id, quantity) values ($1,$2,3)
               on conflict (user_id, product_id) do update set quantity=3`, [mijoz.id, yangi.id]);

  const buyurtmalarOldin = await qiymat(`select count(*)::int from orders`);

  const natija = await qiymat('select mahsulotni_ochir($1)', [yangi.id]);
  test('mahsulot butunlay o‘chdi',
    (await qiymat('select count(*)::int from products where id=$1', [yangi.id])) === 0);
  test('savatdan ham olindi',
    (await qiymat('select count(*)::int from cart_items where product_id=$1', [yangi.id])) === 0);
  test('nechta savatda borligi aytiladi', Number(natija.savat) === 1, JSON.stringify(natija));
  test('buyurtmalar tarixi buzilmadi',
    (await qiymat(`select count(*)::int from orders`)) === buyurtmalarOldin);

  let x2 = '';
  try { await qiymat('select mahsulotni_ochir($1)', [999999]); } catch (e) { x2 = e.message; }
  test('yo‘q mahsulotda aniq xato', /MAHSULOT_TOPILMADI/.test(x2));
}


// ═══════════ KO'P MAHSULOTNI BIRDAN QO'SHISH ═══════════
console.log('\n── KO‘P MAHSULOT QO‘SHISH ──');
{
  // Kichkina haqiqiy PNG — rasmniOl uni qabul qilishi kerak
  const { Resvg } = await import('@resvg/resvg-js');
  // Rasm yetarlicha katta bo'lsin: rasmniOl 500 belgidan qisqa base64 ni
  // «rasm emas» deb rad etadi (tasodifiy matn kelib qolmasin uchun)
  const png = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
       <rect width="400" height="400" fill="#8a5a3d"/>
       ${Array.from({ length: 60 }, (_, i) =>
         `<circle cx="${(i * 37) % 400}" cy="${(i * 61) % 400}" r="${5 + (i % 9)}"
            fill="#${((i * 2654435761) >>> 8).toString(16).padStart(6, '0').slice(0, 6)}"/>`).join('')}
     </svg>`, {}).render().asPng();
  const rasm = `data:image/png;base64,${png.toString('base64')}`;

  const chaqir = chaqirAdmin;

  const tanish = await chaqir('/api/admin/recognize-toplam', 'POST', { images: [rasm, rasm, rasm] });
  test('3 ta rasm tanildi', tanish.tana.natijalar?.length === 3,
    `${tanish.tana.natijalar?.length} ta`);
  test('har biriga rasm saqlandi',
    tanish.tana.natijalar?.every((n) => n.media_id));

  // Narxsiz saqlab bo'lmasin
  const narxsiz = await chaqir('/api/admin/products-toplam', 'POST', {
    mahsulotlar: [{ ...tanish.tana.natijalar[0], name: 'Narxsiz mahsulot', price: 0 }] });
  test('narxsiz mahsulot saqlanmaydi',
    narxsiz.tana.qoshildi?.length === 0 && narxsiz.tana.xatolar?.length === 1,
    narxsiz.tana.xatolar?.[0]?.sabab);

  const oldin = await qiymat('select count(*)::int from products');
  const saqlash = await chaqir('/api/admin/products-toplam', 'POST', {
    mahsulotlar: tanish.tana.natijalar.map((n, i) => ({
      ...n, name: `Toplam mahsulot ${i + 1}`, price: 100000 + i * 1000, stock: 5 })) });
  test('3 tasi ham saqlandi', saqlash.tana.qoshildi?.length === 3,
    `${saqlash.tana.qoshildi?.length} ta · xato: ${saqlash.tana.xatolar?.length || 0}`);
  test('katalogda paydo bo‘ldi',
    (await qiymat('select count(*)::int from products')) === oldin + 3);
  test('rasm mahsulotga bog‘landi',
    (await qiymat(`select count(*)::int from products
                    where name like 'Toplam mahsulot%' and poster_id is not null`)) === 3);
  test('narx va ombor o‘rnatildi',
    (await qiymat(`select price from products where name = 'Toplam mahsulot 1'`)) === 100000);
}

// ═══════════ /tanitish — MAHSULOT REKLAMASI ═══════════
console.log('\n── MAHSULOT REKLAMASI ──');
{
  await sorov(`update rejalar set kanal = '@meduza_kanal' where kanal = ''`);
  yuborilgan.length = 0;
  await yoz('700001', '/tanitish Toplam');
  const royxat = oxirgi().reply_markup?.inline_keyboard || [];
  test('mahsulot ro‘yxati chiqdi', royxat.length > 0, `${royxat.length} ta variant`);

  const tugma = royxat.flat().find((b) => b.callback_data?.startsWith('rk:'));
  test('tanlash tugmasi bor', Boolean(tugma), tugma?.text);

  // Hali reja yo'q — agent qaysi kanalga yuborishni so'raydi
  yuborilgan.length = 0;
  await bos('700001', tugma.callback_data);
  await kut(300);
  test('kanal so‘raladi', /Qaysi kanalga/.test(oxirgi().text || ''));

  yuborilgan.length = 0;
  await yoz('700001', '@meduza_kanal');
  await kut(700);
  const reklama = yuborilgan.find((x) => /Reklama/i.test(x.text || '') || x.rasm);
  test('reklama posti tayyorlandi', Boolean(reklama));
  test('reklama mahsulot rasmi bilan', yuborilgan.some((x) => x.rasm));

  const kb = (oxirgi().reply_markup?.inline_keyboard || []).flat();
  test('«Ko‘rinishini ochish» tugmasi bor',
    kb.some((b) => /Ko‘rinishini/.test(b.text || '') && b.url), kb.map((b) => b.text).join(' | '));
  test('«Kanalga joylash» tugmasi bor', kb.some((b) => b.callback_data?.startsWith('pj:')));

  const band = await qator(
    `select b.*, r.turi from reja_bandlari b join rejalar r on r.id = b.reja_id
      where b.mahsulot_id is not null order by b.id desc limit 1`);
  test('reklama bandi mahsulotga bog‘langan', Boolean(band?.mahsulot_id));
  test('reja turi «reklama»', band?.turi === 'reklama', band?.turi);
  test('matn bazaga yozildi', (band?.matn || '').length > 20);
}


// ═══════════ ILOVA MAVZUSI ═══════════
console.log('\n── MAVZU ──');
{
  const { palitra, kontrastMatn, rangTozala, MAVZU_STANDART } = await import('../src/lib/mavzu.js');
  const { natijaSvg } = await import('../src/rasm/natija-kartochka.js');

  const qizil = palitra({ asosiy: '#B3161C', fon: '#EAF3D9' });
  test('to‘q fon ustida OQ matn', qizil.asosiyMatn === '#FFFFFF', qizil.asosiyMatn);
  test('och fon ustida QORA matn', kontrastMatn('#EAF3D9') === '#141414');
  test('och fonda kartochka oq', qizil.karta === '#FFFFFF');

  const qora = palitra({ asosiy: '#1A1A1A', fon: '#101010' });
  test('qorong‘i fonda matn oqaradi', qora.matn.toLowerCase() !== '#1f1d1b', qora.matn);
  test('qorong‘i fonda kartochka oq EMAS', qora.karta !== '#FFFFFF', qora.karta);

  // Noto'g'ri rang standartga tushadi — ilova hech qachon buzilmaydi
  test('noto‘g‘ri rang rad etiladi', rangTozala('salom', '#B3161C') === '#b3161c');
  test('noto‘g‘ri rang palitrani buzmaydi',
    palitra({ asosiy: 'yashil', fon: '###' }).asosiy === MAVZU_STANDART.asosiy.toLowerCase(),
    palitra({ asosiy: 'yashil', fon: '###' }).asosiy);

  // Rasm mavzu rangi bilan chiziladi
  const svgQizil = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 65, muammolar: [{ nom: 'Sinov', foiz: 70, zona: 'T-zona' }] },
    tavsiyalar: [], mavzu: { asosiy: '#B3161C', fon: '#EAF3D9' } });
  test('rasmda mavzu foni ishlatilgan', svgQizil.includes('#eaf3d9'));

  const svgKok = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 65, muammolar: [{ nom: 'Sinov', foiz: 70, zona: 'T-zona' }] },
    tavsiyalar: [], mavzu: { asosiy: '#123A63', fon: '#E7F0F7' } });
  test('mavzu o‘zgarsa rasm ham o‘zgaradi',
    svgKok.includes('#e7f0f7') && !svgKok.includes('#eaf3d9'));

  // Muammo ranglari MAVZUGA BOG'LIQ EMAS — qizil «yomon» degani hamma joyda bir xil
  test('muammo rangi mavzudan qat’i nazar bir xil',
    svgQizil.includes('#D92B2B') && svgKok.includes('#D92B2B'));

  // Admin yo'li orqali saqlash
  const { MAVZU_STANDART: MS } = await import('../src/lib/mavzu.js');
  const saqlash = await chaqirAdmin('/api/admin/mavzu', 'POST',
    { asosiy: '#123A63', fon: '#E7F0F7', urgu: '#1D6FA5' });
  test('mavzu saqlandi', saqlash.tana.mavzu?.asosiy === '#123a63', saqlash.tana.mavzu?.asosiy);
  test('javobda palitra keladi', Boolean(saqlash.tana.palitra?.karta));

  const yomon = await chaqirAdmin('/api/admin/mavzu', 'POST', { asosiy: 'ololo', fon: '' });
  test('noto‘g‘ri rang standartga tushadi',
    yomon.tana.mavzu?.asosiy === MS.asosiy.toLowerCase(), yomon.tana.mavzu?.asosiy);

  await sorov(`update settings set value = '{"asosiy":"#B3161C","fon":"#EAF3D9","urgu":"#C0392B"}'::jsonb
                where key = 'mavzu'`);
}


// ═══════════ MIJOZGA QO'LLANMA ═══════════
// To'lov tasdiqlangach mijoz mahsulotni QANDAY ishlatishni bilishi kerak:
// aks holda natija ko'rmaydi va qaytib kelmaydi.
console.log('\n── MIJOZGA QO‘LLANMA ──');
{
  const mq = await import('../src/services/mijoz-qollanma.js');
  const o = await qator(`select * from orders where order_no = 'QQ-001'`);

  const royxat = await mq.buyurtmaMahsulotlari(o);
  test('buyurtmadagi mahsulotlar topildi', royxat.length === 2, `${royxat.length} ta`);
  test('parvarish tartibida saralangan',
    royxat[0].bosqich === 'tozalash' || royxat[0].bosqich === 'toner',
    royxat.map((r) => r.bosqich).join(' → '));

  yuborilgan.length = 0;
  const n = await mq.qollanmaYubor(o, '800001');
  test('qo‘llanma yuborildi', n.yuborildi === true, JSON.stringify(n));
  test('RASM bilan keldi', yuborilgan.some((x) => x.rasm),
    yuborilgan.map((x) => (x.rasm ? 'rasm' : x.hujjat ? 'hujjat' : 'matn')).join(', '));
  test('rasm bo‘sh emas', (yuborilgan.find((x) => x.rasm)?.hajm || 0) > 20000,
    `${((yuborilgan.find((x) => x.rasm)?.hajm || 0) / 1024).toFixed(0)} KB`);
  // PDF: mijoz telefonda .docx ni ocholmaydi va unda mahsulot rasmi yo'q
  const hj = yuborilgan.find((x) => x.hujjat);
  test('PDF hujjati ham keldi', Boolean(hj), hj?.nom);
  test('fayl .pdf kengaytmasida', /\.pdf$/.test(hj?.nom || ''), hj?.nom);
  test('mime application/pdf', hj?.mime === 'application/pdf', hj?.mime);
  test('PDF tanasi haqiqiy', hj?.pdfmi === true);
  test('izohda PDF ekani aytilgan', /PDF/.test(hj?.text || ''), hj?.text?.slice(0, 60));
  test('izohda tartib haqida aytilgan',
    /Tartibni buzmang/.test(yuborilgan.find((x) => x.rasm)?.text || ''));

  // Mahsulotsiz buyurtmada yiqilmasligi kerak
  const bosh = await mq.qollanmaYubor({ id: 0, order_no: 'YOQ', items: [] }, '800001');
  test('mahsulotsiz buyurtmada yiqilmaydi', bosh.yuborildi === false, bosh.sabab);
  test('chat id bo‘lmasa ham yiqilmaydi',
    (await mq.qollanmaYubor(o, null)).yuborildi === false);
}

// ═══════════ MARKETPLACE ═══════════
// Haqiqiy Daiso/Coupang sahifasi o'rniga soxta do'kon ishlatiladi:
// oqim bir xil — sahifa o'qiladi, AI kartochkani to'ldiradi, narx
// hisoblanadi, admin tasdiqlaydi.
console.log('\n── MARKETPLACE ──');
{
  const mp = await import('../src/services/marketplace.js');
  const DOKON = `http://127.0.0.1:${PORT}/dokon`;

  // Sahifadan ma'lumot ajratish
  const { html } = await mp.sahifaniOl(`${DOKON}/aloe-gel`);
  const siqilgan = mp.sahifaniSiqish(html);
  test('sahifadan sarlavha ajratildi', /Soothing Aloe Gel Cream/.test(siqilgan));
  test('meta narx ajratildi', /product:price:amount: 5000/.test(siqilgan));
  test('JSON-LD ajratildi', /"@type":"Product"/.test(siqilgan));
  test('skript va uslub tashlandi', !/<script/i.test(siqilgan));

  test('og:image topildi',
    (mp.rasmHavolasi(html, `${DOKON}/aloe-gel`) || '').includes('/rasm/mahsulot.png'));

  const havolalar = mp.mahsulotHavolalari(html, `${DOKON}/aloe-gel`);
  test('mahsulot havolalari yig‘ildi', havolalar.length === 2, havolalar.join(' '));
  test('tashqi sayt havolasi olinmadi', !havolalar.some((h) => h.includes('tashqi.example')));
  test('kategoriya havolasi olinmadi', !havolalar.some((h) => h.includes('/category/')));

  // To'liq oqim
  const t = await mp.havoladanOl(`${DOKON}/aloe-gel`);
  test('mahsulot ro‘yxatga tushdi', t.holat === 'kutilmoqda', `${t.holat} · ${t.sabab || ''}`);
  test('narx hisoblandi', t.narx_izoh?.narx > 0,
    `narx ${t.narx_izoh?.narx} · tannarx ${t.narx_izoh?.tannarx} · foyda ${t.narx_izoh?.foyda}`);
  test('tannarx KRW dan o‘girildi', t.narx_izoh?.tannarx === Math.round(5000 * 9.5));
  test('yetkazish 120 g uchun ikki bo‘lak', t.narx_izoh?.yetkazish === 2 * 15000,
    String(t.narx_izoh?.yetkazish));
  test('mahsulot rasmi saqlandi', Boolean(t.rasm_id));

  // Bir havola ikki marta tushmasin
  const takror = await mp.havoladanOl(`${DOKON}/aloe-gel`);
  test('takroriy havola qayta olinmaydi', takror.takror === true);
  test('bazada bitta yozuv',
    (await qiymat('select count(*)::int from marketplace_topilgan')) === 1);

  // Og'irlik chegarasi
  await sorov(`update settings set value = '100'::jsonb where key = 'marketplace_maks_ogirlik'`);
  const ogir = await mp.havoladanOl(`${DOKON}/ogir-mahsulot`);
  test('og‘ir mahsulot rad etiladi', ogir.holat === 'rad_etildi', ogir.sabab);
  test('sabab tushunarli', /Og‘irligi 120 g/.test(ogir.sabab || ''), ogir.sabab);
  await sorov(`update settings set value = '600'::jsonb where key = 'marketplace_maks_ogirlik'`);

  // Narx oralig'i
  await sorov(`update settings set value = '900000'::jsonb where key = 'marketplace_narx_dan'`);
  const arzon = await mp.havoladanOl(`${DOKON}/arzon`);
  test('narx oralig‘idan tashqari rad etiladi', arzon.holat === 'rad_etildi', arzon.sabab);
  await sorov(`update settings set value = '0'::jsonb where key = 'marketplace_narx_dan'`);

  // Do'kon rad etsa — tushunarli xato, tizim yiqilmaydi
  const bloklangan = await mp.havoladanOl(`${DOKON}/yoq-sahifa`);
  test('do‘kon rad etsa xato yoziladi', bloklangan.holat === 'xato');
  test('xato sababi tushunarli', /rad etdi|HTTP 403/.test(bloklangan.sabab || ''), bloklangan.sabab);

  // Tasdiqlash — katalogga qo'shiladi
  const oldin = await qiymat('select count(*)::int from products');
  const p = await mp.tasdiqla(t.id, { stock: 5 });
  test('katalogga qo‘shildi', Boolean(p.id));
  test('mahsulot soni oshdi',
    (await qiymat('select count(*)::int from products')) === oldin + 1);
  test('narx katalogga o‘tdi', p.price === t.narx_izoh.narx, `${p.price}`);
  test('tannarx ham yozildi', p.cost_price === t.narx_izoh.tannarx);
  test('manba havolasi saqlandi', p.manba_url.includes('/dokon/aloe-gel'));
  test('og‘irlik o‘tdi', p.ogirlik === 120, String(p.ogirlik));
  test('rasm mahsulotga bog‘landi', p.poster_id === t.rasm_id);
  test('ombor admin bergani bo‘yicha', p.stock === 5);

  let ikkinchi = '';
  try { await mp.tasdiqla(t.id, {}); } catch (e) { ikkinchi = e.message; }
  test('ikkinchi marta tasdiqlanmaydi', /allaqachon/.test(ikkinchi), ikkinchi);

  // ── Do'kon API si: sahifa emas, JSON o'qiladi ──
  // Daisomall kabi do'konda sahifa brauzerda chiziladi, HTML da mahsulot
  // yo'q. Shuning uchun avval API urinib ko'riladi.
  const QOIDA = [{
    manba: 'daiso', nom: 'Soxta Daiso', host: '127.0.0.1',
    id_qolip: 'pdNo=([0-9A-Za-z_-]+)',
    mahsulot_url: `http://127.0.0.1:${PORT}/api/pd/pdd/pdDetail?pdNo={id}`,
    sahifa_url: `http://127.0.0.1:${PORT}/dokon/product/pd?pdNo={id}`,
    id_kalit: 'pdNo',
  }];
  await mp.apiSaqla(QOIDA);
  const sozlash = await mp.sozlamalar();
  test('API qoidasi saqlandi', sozlash.api.length === 1, JSON.stringify(sozlash.api[0] || {}));

  const sinov = await mp.apiSinovi(`http://127.0.0.1:${PORT}/dokon/product/pd?pdNo=77`);
  test('API sinovi ishladi', sinov.ishladi === true, sinov.sabab || '');
  test('sinov chaqirgan manzil ko‘rinadi',
    (sinov.api_url || '').includes('/api/pd/pdd/pdDetail?pdNo=77'), sinov.api_url);
  test('API javobidan rasm topildi', /api-mahsulot\.png/.test(sinov.rasm || ''), sinov.rasm);

  await sorov('delete from marketplace_topilgan');
  const api1 = await mp.havoladanOl(`http://127.0.0.1:${PORT}/dokon/product/pd?pdNo=77`);
  test('mahsulot API orqali olindi', api1.malumot?.usul === 'api', api1.malumot?.usul);
  test('API dan olinganda ham narx hisoblanadi', api1.narx_izoh?.narx > 0,
    String(api1.narx_izoh?.narx));
  test('API rasmi saqlandi', Boolean(api1.rasm_id));

  // API 404 bersa — jim HTML ga qaytadi, oqim to'xtamaydi
  const zaxira = await mp.havoladanOl(`http://127.0.0.1:${PORT}/dokon/product/pd?pdNo=yoq`);
  test('API ishlamasa HTML ga qaytadi', zaxira.malumot?.usul === 'html', zaxira.malumot?.usul);
  test('qaytish sababi yozildi', /API javob bermadi/.test(zaxira.malumot?.usul_izoh || ''),
    zaxira.malumot?.usul_izoh);
  test('zaxira yo‘l bilan ham mahsulot tayyor', zaxira.holat === 'kutilmoqda', zaxira.sabab);

  // JSON qaytarmasa ham HTML ga qaytadi
  const jsonemas = await mp.havoladanOl(`http://127.0.0.1:${PORT}/dokon/product/pd?pdNo=html`);
  test('API JSON bermasa ham HTML ga qaytadi', jsonemas.malumot?.usul === 'html',
    jsonemas.malumot?.usul_izoh);

  // Bo'lim API si — agent ro'yxatni JSON dan oladi
  await sorov('delete from marketplace_topilgan');
  const api_royxat = await mp.agentYigish(`http://127.0.0.1:${PORT}/api/list?ctgr=krem`, { limit: 10 });
  test('agent API ro‘yxatidan havola yasadi', api_royxat.havolalar.length === 5,
    api_royxat.havolalar.join(' '));
  test('yasalgan havola mahsulot sahifasiga qaraydi',
    (api_royxat.havolalar[0] || '').includes('pdNo=p1_1'), api_royxat.havolalar[0]);
  test('agent API orqali yig‘di', api_royxat.hisob.kutilmoqda === 5,
    JSON.stringify(api_royxat.hisob));

  // ── Qidiruv API si: javobda mahsulot to'liq keladi ──
  // Daiso qidiruvining aynan shakli: har mahsulot uchun alohida sahifa
  // ochilmaydi, chunki nom, narx, brend va rasm ro'yxatda bor.
  {
    const da = await import('../src/services/dokon-api.js');
    const QIDIRUV = [{
      manba: 'daiso', nom: 'Soxta Daiso qidiruv', host: '127.0.0.1',
      royxat_url: `http://127.0.0.1:${PORT}/ssn/search/FindStoreGoods`
                + '?searchTerm={q}&cntPerPage=30&pageNum={sahifa}',
      royxat_yoli: 'resultSet.result.0.resultDocuments',
      element_id: 'PD_NO',
      sahifa_url: `http://127.0.0.1:${PORT}/dokon/product/pd?pdNo={id}`,
      id_qolip: 'pdNo=([0-9A-Za-z_-]+)',
      id_kalit: 'PD_NO',
      rasm_almashtir: { 'img.daisomall.co.kr': 'cdn.daisomall.co.kr' },
    }];
    await mp.apiSaqla(QIDIRUV);
    const q = (await mp.sozlamalar()).api[0];

    // Koddagi sukut qoidasi Daiso ning haqiqiy manziliga qarashi kerak
    test('sukut qoidasi Daiso qidiruviga qaraydi',
      da.API_STANDART[0].royxat_url.includes('prdm.daisomall.co.kr/ssn/search/FindStoreGoods'),
      da.API_STANDART[0].royxat_url);
    test('sukut qoidasi mahsulot sahifasini biladi',
      da.API_STANDART[0].sahifa_url.includes('/pd/pdr/SCR_PDR_0001?pdNo='));

    const url = da.royxatHavolasi(q, '크림', 2);
    test('qidiruv manzili yasaldi',
      url.includes('searchTerm=%ED%81%AC%EB%A6%BC') && url.endsWith('pageNum=2'), url);

    // Daiso eski rasm hostini beradi — CDN ga o'girilishi kerak
    test('rasm hosti CDN ga o‘giriladi',
      da.jsonRasm({ ATCH_FILE_URL: 'https://img.daisomall.co.kr/goods/1.jpg' },
        'https://prdm.daisomall.co.kr', q) === 'https://cdn.daisomall.co.kr/goods/1.jpg',
      da.jsonRasm({ ATCH_FILE_URL: 'https://img.daisomall.co.kr/goods/1.jpg' },
        'https://prdm.daisomall.co.kr', q));

    const { json } = await mp.sahifaniOl(url);
    const elementlar = da.jsonElementlar(json, q);
    test('javobdan mahsulotlar ajratildi', elementlar.length === 4, String(elementlar.length));
    test('mahsulotda nom va narx bor',
      Boolean(elementlar[0].PDNM && elementlar[0].PD_PRC), JSON.stringify(elementlar[0]));

    await sorov('delete from marketplace_topilgan');
    const el = await mp.elementdanOl(elementlar[0], q);
    test('ro‘yxatdagi elementdan mahsulot yasaldi', el.holat === 'kutilmoqda',
      `${el.holat} · ${el.sabab || ''}`);
    // «royxat» — AI ro'yxat elementini o'qigan, «xarita» — AI'siz yig'ilgan.
    // Ikkalasida ham mahsulot sahifasi OCHILMAGAN — asosiy narsa shu.
    test('sahifasiz olingani belgilangan',
      ['royxat', 'xarita'].includes(el.malumot?.usul), el.malumot?.usul);
    test('elementdan narx hisoblandi', el.narx_izoh?.narx > 0, String(el.narx_izoh?.narx));
    test('mahsulot havolasi odam ochadigan sahifaga qaraydi',
      el.manba_url.includes('pdNo='), el.manba_url);
    test('ro‘yxatdagi rasm saqlandi', Boolean(el.rasm_id));

    const takror2 = await mp.elementdanOl(elementlar[0], q);
    test('element takrori qayta olinmaydi', takror2.takror === true);

    // Import: havola emas, QIDIRUV SO'ZI beriladi
    await sorov('delete from marketplace_topilgan');
    await sorov('delete from marketplace_vazifa');
    const mpv0 = await import('../src/services/marketplace-vazifa.js');
    const kut0 = (ms) => new Promise((r) => setTimeout(r, ms));
    const vq = await mpv0.vazifaBoshla({
      havolalar: ['크림'], sahifagacha: 3, maqsad: 6, kechikish: 300 });
    for (let i = 0; i < 200; i++) {
      const v = await qator('select holat from marketplace_vazifa where id = $1', [vq.id]);
      if (v.holat !== 'ishlamoqda') break;
      await kut0(150);
    }
    const tq = await qator('select * from marketplace_vazifa where id = $1', [vq.id]);
    test('qidiruv so‘zi bilan import ishladi', tq.qoshilgan === 6,
      `${tq.holat} · qoshilgan ${tq.qoshilgan} · ${tq.sabab || ''}`);
    test('import sahifasiz, ro‘yxatdan oldi',
      (await qiymat(`select count(*)::int from marketplace_topilgan
                      where malumot->>'usul' in ('royxat','xarita')`)) === 6);

    // ── Arzon filtr: chegaradan chiqqani AI'GACHA YETMASIN ──
    // AI chaqiruvi pul turadi. Narx ro'yxatda bor — demak uni tekshirish
    // uchun token sarflash shart emas.
    await sorov('delete from marketplace_topilgan');
    await sorov(`update settings set value = '30000'::jsonb where key = 'marketplace_narx_gacha'`);
    const aiOldin = aiHisobi.marketplace;
    const qimmat = await mp.elementdanOl(elementlar[1], q);
    test('qimmat mahsulot rad etildi', qimmat.holat === 'rad_etildi', qimmat.sabab);
    test('rad etishga AI SARFLANMADI', aiHisobi.marketplace === aiOldin,
      `${aiHisobi.marketplace - aiOldin} ta chaqiruv`);
    test('kartochkada nomi ko‘rinadi', Boolean(qimmat.malumot?.name), qimmat.malumot?.name);
    test('natijada ai=false belgisi bor', qimmat.ai === false);
    await sorov(`update settings set value = '0'::jsonb where key = 'marketplace_narx_gacha'`);

    // «To'liq» rejimda chegara ichidagisi AI ga boradi
    await sorov('delete from marketplace_topilgan');
    await sorov(`update settings set value = '"toliq"'::jsonb where key = 'marketplace_ai'`);
    const aiOldin2 = aiHisobi.marketplace;
    const yaxshi = await mp.elementdanOl(elementlar[2], q);
    test('to‘liq rejimda AI chaqiriladi', aiHisobi.marketplace === aiOldin2 + 1,
      `${aiHisobi.marketplace - aiOldin2} ta chaqiruv`);
    test('u navbatga tushdi', yaxshi.holat === 'kutilmoqda', yaxshi.sabab);
    test('natijada ai=true belgisi bor', yaxshi.ai === true);
    await sorov(`update settings set value = '"tejamkor"'::jsonb where key = 'marketplace_ai'`);

    // Tejamkor rejimda esa xuddi shu mahsulotga AI kerak emas
    await sorov('delete from marketplace_topilgan');
    const aiOldin2b = aiHisobi.marketplace;
    const tejamkor = await mp.elementdanOl(elementlar[2], q);
    test('tejamkor rejimda AI chaqirilmadi', aiHisobi.marketplace === aiOldin2b,
      `${aiHisobi.marketplace - aiOldin2b} ta chaqiruv`);
    test('lekin mahsulot baribir tayyor', tejamkor.holat === 'kutilmoqda', tejamkor.sabab);

    // Sotuvda yo'q mahsulot ham AI'siz chetlanadi
    await sorov('delete from marketplace_topilgan');
    const aiOldin3 = aiHisobi.marketplace;
    const yoq = await mp.elementdanOl(
      { ...elementlar[3], SOLD_OUT_YN: 'Y' }, q);
    test('sotuvda yo‘q mahsulot rad etildi', yoq.holat === 'rad_etildi', yoq.sabab);
    test('unga ham AI sarflanmadi', aiHisobi.marketplace === aiOldin3);

    // Import hisobi: AI necha marta chaqirilgani yozib boriladi
    await sorov('delete from marketplace_topilgan');
    await sorov('delete from marketplace_vazifa');
    await sorov(`update settings set value = '30000'::jsonb where key = 'marketplace_narx_gacha'`);
    const vf = await mpv0.vazifaBoshla({
      havolalar: ['크림'], sahifagacha: 2, maqsad: 4, kechikish: 300 });
    for (let i = 0; i < 200; i++) {
      const v = await qator('select holat from marketplace_vazifa where id = $1', [vf.id]);
      if (v.holat !== 'ishlamoqda') break;
      await kut0(150);
    }
    const tf = await qator('select * from marketplace_vazifa where id = $1', [vf.id]);
    test('hammasi narx chegarasida rad etildi', tf.rad_etilgan > 0 && tf.qoshilgan === 0,
      `qoshilgan ${tf.qoshilgan} · rad ${tf.rad_etilgan}`);
    test('import AI chaqiruvini sanaydi va u NOLGA teng', tf.ai_soni === 0,
      `ai_soni ${tf.ai_soni} · korilgan ${tf.korilgan}`);
    await sorov(`update settings set value = '0'::jsonb where key = 'marketplace_narx_gacha'`);

    // ── AI'SIZ rejim: kartochka ro'yxatdagi maydonlardan yig'iladi ──
    const xar = await import('../src/services/mahsulot-xarita.js');
    test('nomdan toifa aniqlanadi',
      xar.toifaTop('선크림 SPF50 50g')?.category === 'quyosh');
    test('nomdan og‘irlik chiqadi', xar.ogirlikTaxmin('수분 크림 100ml') === 120,
      String(xar.ogirlikTaxmin('수분 크림 100ml')));
    test('kosmetika bo‘lmagani xaritadan o‘tmaydi',
      xar.toifaTop('스텐 국자') === null);

    await sorov('delete from marketplace_topilgan');
    await sorov(`update settings set value = '"yoq"'::jsonb where key = 'marketplace_ai'`);
    const aiOldin4 = aiHisobi.marketplace;
    const xsiz = await mp.elementdanOl(elementlar[0], q);
    test('AI‘siz rejimda mahsulot to‘liq yig‘ildi', xsiz.holat === 'kutilmoqda',
      `${xsiz.holat} · ${xsiz.sabab || ''}`);
    test('AI‘siz rejimda token sarflanmadi', aiHisobi.marketplace === aiOldin4,
      `${aiHisobi.marketplace - aiOldin4} ta chaqiruv`);
    test('xaritadan olingani belgilangan', xsiz.malumot?.usul === 'xarita', xsiz.malumot?.usul);
    test('narx xaritadan hisoblandi', xsiz.narx_izoh?.narx > 0, String(xsiz.narx_izoh?.narx));
    test('toifa va bosqich to‘ldi',
      Boolean(xsiz.malumot?.category && xsiz.malumot?.step),
      `${xsiz.malumot?.category} · ${xsiz.malumot?.step}`);
    await sorov(`update settings set value = '"tejamkor"'::jsonb where key = 'marketplace_ai'`);

    // ── Avtomatik jadval ──
    const jd = await mpv0.jadvalniSaqla({
      yoqilgan: true, sozlar: ['크림'], kunlar: 7, soat: 4, maqsad: 3,
      sahifagacha: 2, avto_tasdiq: true });
    test('jadval saqlandi', jd.yoqilgan === true && jd.sozlar[0] === '크림');
    test('jadval chegaralarni tekshiradi',
      (await mpv0.jadvalniSaqla({ yoqilgan: true, kunlar: 999, soat: 99 })).kunlar === 90);

    // Soati kelmagan bo'lsa ishlamaydi
    await mpv0.jadvalniSaqla({ yoqilgan: true, sozlar: ['크림'], soat: 4, kunlar: 7, maqsad: 3 });
    const notogri = new Date(Date.UTC(2026, 0, 1, 20, 0));   // Toshkentda 01:00
    test('soati kelmasa import boshlanmaydi',
      (await mpv0.jadvalniTekshir(notogri)) === null);

    // Soati kelganda o'zi boshlaydi
    await sorov('delete from marketplace_topilgan');
    await sorov('delete from marketplace_vazifa');
    const togri = new Date(Date.UTC(2026, 0, 1, 23, 0));     // Toshkentda 04:00
    const avto = await mpv0.jadvalniTekshir(togri);
    test('soati kelganda import O‘ZI boshlanadi', Boolean(avto?.id));
    test('jadval avto tasdiqni uzatadi', avto?.avto_tasdiq === true);
    for (let i = 0; i < 200; i++) {
      const v = await qator('select holat from marketplace_vazifa where id = $1', [avto.id]);
      if (v.holat !== 'ishlamoqda') break;
      await kut0(150);
    }
    test('avtomatik import katalogga o‘zi qo‘shdi',
      (await qiymat(`select count(*)::int from marketplace_topilgan
                      where holat = 'tasdiqlandi'`)) === 3);
    test('ikkinchi marta darhol takrorlanmaydi',
      (await mpv0.jadvalniTekshir(togri)) === null);
    await mpv0.jadvalniSaqla({ yoqilgan: false });

    // Keyingi sinovlar uchun oldingi qoidani qaytaramiz
    await mp.apiSaqla(QOIDA);
  }

  // ── Ommaviy import: yuzlab mahsulot bitta buyruq bilan ──
  // Admin havola qo'yib chiqmaydi: bo'lim havolasi va son beriladi,
  // qolganini server fonda qiladi.
  const mpv = await import('../src/services/marketplace-vazifa.js');
  const kut = (ms) => new Promise((r) => setTimeout(r, ms));
  const vazifaniKut = async (id, chegara = 60_000) => {
    const boshi = Date.now();
    for (;;) {
      const v = await qator('select * from marketplace_vazifa where id = $1', [id]);
      if (v.holat !== 'ishlamoqda' || Date.now() - boshi > chegara) return v;
      await kut(150);
    }
  };

  await sorov('delete from marketplace_topilgan');
  await sorov('delete from marketplace_vazifa');
  const RO_YXAT = `http://127.0.0.1:${PORT}/api/list?ctgr=krem&page={sahifa}`;

  const v1 = await mpv.vazifaBoshla({
    havolalar: [RO_YXAT], sahifadan: 1, sahifagacha: 3,
    maqsad: 6, kechikish: 300, avtoTasdiq: false });
  test('import vazifasi boshlandi', v1.holat === 'ishlamoqda');

  const ikkinchiImport = await mpv.vazifaBoshla({ havolalar: [RO_YXAT] })
    .then(() => null).catch((e) => e.message);
  test('bir vaqtda ikkita import ketmaydi', /allaqachon/.test(ikkinchiImport || ''),
    ikkinchiImport);

  const t1 = await vazifaniKut(v1.id);
  test('import maqsadga yetib to‘xtadi', t1.holat === 'tugadi', `${t1.holat} · ${t1.sabab || ''}`);
  test('kerakli sonda mahsulot yig‘ildi', t1.qoshilgan === 6,
    `qoshilgan ${t1.qoshilgan}, rad ${t1.rad_etilgan}, xato ${t1.xato}`);
  test('import bir nechta sahifadan yurdi', t1.sahifa >= 2, `sahifa ${t1.sahifa}`);
  test('mahsulotlar navbatda turibdi',
    (await qiymat(`select count(*)::int from marketplace_topilgan where holat = 'kutilmoqda'`)) === 6);

  // Navbatdagi hammasini birdan katalogga
  const oldingi = await qiymat('select count(*)::int from products');
  const hammasi = await mp.hammasiniTasdiqla();
  test('navbatdagi hammasi katalogga qo‘shildi', hammasi.qoshildi === 6,
    JSON.stringify(hammasi));
  test('katalog o‘sdi',
    (await qiymat('select count(*)::int from products')) === oldingi + 6);

  // Avto tasdiq: tasdiq kutmasdan katalogga
  await sorov('delete from marketplace_topilgan');
  await sorov('delete from marketplace_vazifa');
  const oldin2 = await qiymat('select count(*)::int from products');
  const v2 = await mpv.vazifaBoshla({
    havolalar: [RO_YXAT], sahifagacha: 3, maqsad: 3, kechikish: 300, avtoTasdiq: true });
  const t2 = await vazifaniKut(v2.id);
  test('avto tasdiqda katalogga o‘zi tushdi',
    (await qiymat('select count(*)::int from products')) === oldin2 + 3,
    `${t2.holat} · qoshilgan ${t2.qoshilgan}`);

  // To'xtatish
  await sorov('delete from marketplace_topilgan');
  await sorov('delete from marketplace_vazifa');
  const v3 = await mpv.vazifaBoshla({
    havolalar: [RO_YXAT], sahifagacha: 3, maqsad: 100, kechikish: 300 });
  await kut(600);
  await mpv.vazifaToxtat(v3.id);
  const t3 = await vazifaniKut(v3.id, 10_000);
  test('import to‘xtatildi', t3.holat === 'toxtatildi', t3.holat);
  test('to‘xtaganda topilgani saqlanib qoladi',
    (await qiymat('select count(*)::int from marketplace_topilgan')) >= 1);

  // Mahsulot tugasa import o'zi tugaydi (cheksiz aylanmaydi)
  await sorov('delete from marketplace_topilgan');
  await sorov('delete from marketplace_vazifa');
  const v4 = await mpv.vazifaBoshla({
    havolalar: [RO_YXAT], sahifagacha: 2, maqsad: 500, kechikish: 300 });
  const t4 = await vazifaniKut(v4.id, 90_000);
  test('sahifalar tugaganda import yakunlanadi', t4.holat === 'tugadi', t4.holat);
  test('bor mahsulotning hammasi olindi', t4.qoshilgan === 10, `${t4.qoshilgan}`);

  // Qoidalarni o'chirish — «faqat HTML» rejimi
  await mp.apiSaqla([]);
  test('qoidasiz rejim ham ishlaydi', (await mp.sozlamalar()).api.length === 0);

  // ── Agent topshirig'i: bo'limni o'zi aylanadi ──
  await sorov('delete from marketplace_topilgan');
  const y = await mp.agentYigish(`${DOKON}/category/kremlar`, { limit: 10 });
  test('agent mahsulot havolalarini topdi', y.havolalar.length === 2, y.havolalar.join(' '));
  test('agent hammasini navbatga qo‘ydi', y.hisob.kutilmoqda === 2,
    JSON.stringify(y.hisob));
  test('agent bazaga yozdi',
    (await qiymat('select count(*)::int from marketplace_topilgan')) === 2);
  // Agent HECH QACHON o'zi sotuvga qo'ymaydi — faqat tasdiq navbati
  test('agent katalogga o‘zi qo‘shmaydi',
    (await qiymat(`select count(*)::int from marketplace_topilgan where holat = 'tasdiqlandi'`)) === 0);

  // Ikkinchi marta yurganda takrorini ajratadi
  const y2 = await mp.agentYigish(`${DOKON}/category/kremlar`, { limit: 10 });
  test('agent takrorlarni qayta olmaydi', y2.hisob.takror === 2, JSON.stringify(y2.hisob));

  // Qoida agent yurganda ham ishlaydi
  await sorov('delete from marketplace_topilgan');
  await sorov(`update settings set value = '100'::jsonb where key = 'marketplace_maks_ogirlik'`);
  const y3 = await mp.agentYigish(`${DOKON}/category/kremlar`, { limit: 10 });
  test('agent og‘irlik chegarasiga bo‘ysunadi',
    y3.hisob.rad_etildi === 2 && y3.hisob.kutilmoqda === 0, JSON.stringify(y3.hisob));
  await sorov(`update settings set value = '600'::jsonb where key = 'marketplace_maks_ogirlik'`);
}


// ═══════════ AI KALITLARI HOVUZI ═══════════
// Bitta kalitning kunlik kvotasi bor. Bir nechta kalit qo'yilsa
// chegara shuncha barobar oshadi va biri tugasa keyingisi ishlaydi.
console.log('\n── AI KALITLARI ──');
{
  const { hovuz, sabab } = await import('../src/ai/kalitlar.js');

  test('kalitsiz hovuz bo‘sh', hovuz([]).bormi() === false);
  test('takror kalit bir marta olinadi', hovuz(['a', 'a', 'b']).soni() === 2);

  const h = hovuz(['k1', 'k2', 'k3']);
  test('uchta kalit', h.soni() === 3 && h.tayyorSoni() === 3);

  // NAVBAT bilan — yuk teng taqsimlanadi
  const olingan = [h.ol().kalit, h.ol().kalit, h.ol().kalit, h.ol().kalit];
  test('navbat bilan aylanadi', olingan.join(',') === 'k1,k2,k3,k1', olingan.join(','));

  // Kvotasi tugagan kalit CHETGA qo'yiladi
  h.yomon(0, 'kvota');
  test('chetga qo‘yilgani tayyor emas', h.tayyorSoni() === 2);
  const keyin = [h.ol().kalit, h.ol().kalit, h.ol().kalit];
  test('chetdagi kalit olinmaydi', !keyin.includes('k1'), keyin.join(','));

  // Muvaffaqiyat kalitni tiklaydi
  h.yaxshi(0);
  test('yaxshi javob kalitni tikladi', h.tayyorSoni() === 3);

  // HAMMASI chetda bo'lsa ham bittasi beriladi — «kalit yo'q» deb
  // to'xtagandan ko'ra urinib ko'rgan yaxshi
  h.yomon(0, 'kvota'); h.yomon(1, 'kvota'); h.yomon(2, 'notogri');
  test('hammasi damda ham kalit beriladi', Boolean(h.ol()?.kalit));

  // Bitta kalit bo'lsa oddiy xato uni chetga qo'ymaydi
  const bitta = hovuz(['yolgiz']);
  bitta.yomon(0, 'xato');
  test('yolg‘iz kalit oddiy xatoda chetga qo‘yilmaydi', bitta.tayyorSoni() === 1);
  bitta.yomon(0, 'kvota');
  test('kvota tugasa yolg‘iz kalit ham chetga', bitta.tayyorSoni() === 0);

  // Holat kalitni OSHKOR QILMAYDI
  const hh = hovuz(['juda-maxfiy-kalit-1234']).holatlar();
  test('kalit oshkor qilinmaydi', !hh[0].nom.includes('maxfiy'), hh[0].nom);
  test('faqat oxirgi 4 belgi', hh[0].nom === '…1234', hh[0].nom);

  // Sabab aniqlash
  test('kvota tanildi', sabab(new Error('429 Too Many Requests')) === 'kvota');
  test('quota so‘zi ham', sabab(new Error('RESOURCE_EXHAUSTED: quota')) === 'kvota');
  test('noto‘g‘ri kalit tanildi', sabab(new Error('403 invalid api key')) === 'notogri');
  test('boshqasi — oddiy xato', sabab(new Error('502 bad gateway')) === 'xato');
}

// ═══════════ AI NAVBATI ═══════════
// Minglab odam bir vaqtda so'rasa provayder 429 beradi va kvota
// bir necha daqiqada tugaydi. Hamma chaqiruv bitta darvozadan o'tadi.
console.log('\n── AI NAVBATI ──');
{
  const N = await import('../src/ai/navbat.js');
  N.navbatniTozala();

  // 1) Bir vaqtda ketadigan chaqiruvlar CHEKLANGAN
  let joriy = 0, eng = 0;
  const sekin = () => N.navbatga(async () => {
    joriy++; eng = Math.max(eng, joriy);
    await new Promise((r) => setTimeout(r, 40));
    joriy--; return 'ok';
  });
  await Promise.all(Array.from({ length: 30 }, sekin));
  const h = N.navbatHolati();
  test('bir vaqtda chegaradan oshmadi', eng <= h.bir_vaqtda, `${eng} / ${h.bir_vaqtda}`);
  test('hammasi bajarildi', h.jami === 30, String(h.jami));
  test('kutganlar sanaldi', h.kutgan > 0, `${h.kutgan} ta`);

  // 2) Xato ham chaqiruvchiga yetib boradi
  N.navbatniTozala();
  let xatoMatn = '';
  await N.navbatga(async () => { throw new Error('ichki xato'); }).catch((e) => { xatoMatn = e.message; });
  test('xato yutilmaydi', xatoMatn === 'ichki xato', xatoMatn);

  // 3) 429 kelganda BUTUN navbat pauza qiladi
  N.navbatniTozala();
  test('kutish soniyasi o‘qildi', N.kutishSoniyasi('429 Too Many Requests, retry after 45') === 45);
  test('sabab topilmasa 30 s', N.kutishSoniyasi('429') === 30);
  N.pauzaQil(2);
  const p = N.navbatHolati();
  test('pauza qo‘yildi', p.pauza_qoldi >= 1 && p.pauza_qoldi <= 2, `${p.pauza_qoldi} s`);
  const t0 = Date.now();
  await N.navbatga(async () => 'kechikdi');
  test('pauza tugagach ishladi', Date.now() - t0 >= 900, `${Date.now() - t0} ms`);

  // 4) Navbat to'lib ketsa DARROV rad etadi — odam aylanani kuzatmasin
  N.navbatniTozala();
  const uzoq = Array.from({ length: 200 }, () =>
    N.navbatga(() => new Promise((r) => setTimeout(() => r('ok'), 300))).catch((e) => e.turkum));
  const natijalar = await Promise.all(uzoq);
  const band = natijalar.filter((x) => x === 'band').length;
  test('to‘lgan navbat rad etiladi', band > 0, `${band} ta rad etildi`);
  test('rad etilganda «band» turkumi', band > 0);

  // 5) Muhim ish (admin importi) navbat boshiga tushadi
  N.navbatniTozala();
  const tartib = [];
  const band6 = Array.from({ length: 6 }, () =>
    N.navbatga(() => new Promise((r) => setTimeout(r, 60))));   // hamma joyni band qiladi
  await new Promise((r) => setTimeout(r, 5));
  const oddiy = N.navbatga(async () => { tartib.push('oddiy'); });
  const muhim = N.navbatga(async () => { tartib.push('muhim'); }, { muhim: true });
  await Promise.all([...band6, oddiy, muhim]);
  test('muhim ish oldinga o‘tdi', tartib[0] === 'muhim', tartib.join(' → '));

  N.navbatniTozala();
}

// ═══════════ RASM: JPEG VA KESH ═══════════
// Poster 1024px PNG = 1–2 MB. Do'kon sahifasida yigirmata shunday
// rasm mobil internetda ilovani «sekin» qiladi.
console.log('\n── RASM ──');
{
  const { rgbdanJpeg } = await import('../src/lib/jpeg.js');
  const { jpegQil, olchamOl } = await import('../src/rasm/olcham.js');
  const { pngdanRgb } = await import('../src/lib/pdf.js');
  const { svgdanPng } = await import('../src/rasm/chiz.js');
  const K = await import('../src/lib/media-kesh.js');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d7c8"/><stop offset="1" stop-color="#2b3a55"/>
    </linearGradient></defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    <circle cx="512" cy="400" r="260" fill="#fff" opacity="0.85"/></svg>`;
  const png = await svgdanPng(svg, 1024);

  const { eni, boyi, rgb } = pngdanRgb(png);
  const jpg = rgbdanJpeg(rgb, eni, boyi, 72);
  test('JPEG sarlavhasi to‘g‘ri', jpg[0] === 0xff && jpg[1] === 0xd8, jpg.subarray(0,2).toString('hex'));
  test('JPEG oxiri to‘g‘ri', jpg.at(-2) === 0xff && jpg.at(-1) === 0xd9);
  test('o‘lcham o‘qildi', JSON.stringify(olchamOl(jpg)) === JSON.stringify({ boyi: 1024, eni: 1024 }),
    JSON.stringify(olchamOl(jpg)));
  test('JPEG PNG dan ANCHA kichik', jpg.length < png.length / 4,
    `${(png.length/1024).toFixed(0)} KB → ${(jpg.length/1024).toFixed(0)} KB`);

  const kichik = await jpegQil(png, 'image/png', { eni: 400 });
  test('kichraytirildi', olchamOl(kichik.bayt)?.eni === 400, String(olchamOl(kichik.bayt)?.eni));
  test('mime jpeg', kichik.mime === 'image/jpeg');
  test('kartochka rasmi 60 KB dan kichik', kichik.bayt.length < 60 * 1024,
    `${(kichik.bayt.length/1024).toFixed(0)} KB`);

  // Asl rasm kichik bo'lsa kattalashtirilmaydi
  const mayda = await svgdanPng(svg, 100);
  const m2 = await jpegQil(mayda, 'image/png', { eni: 400 });
  test('kichik rasm kattalashtirilmaydi', olchamOl(m2.bayt)?.eni === 100,
    String(olchamOl(m2.bayt)?.eni));

  // ── Kesh ──
  K.keshniBoshat();
  test('bo‘sh keshda topilmaydi', K.keshdanOl('yoq:400') === null);
  K.keshgaQoy('a:400', Buffer.alloc(1000, 1), 'image/jpeg');
  test('keshdan topildi', K.keshdanOl('a:400')?.bayt.length === 1000);
  test('holat hisoblanadi', K.keshHolati().soni === 1, JSON.stringify(K.keshHolati()));
  K.keshdanOchir('a');
  test('o‘chirilgach yo‘q', K.keshdanOl('a:400') === null);
  test('hisob tozalandi', K.keshHolati().soni === 0);
  K.keshniBoshat();
}

// ═══════════ O'ZBEKCHA NOM ═══════════
// Ilovada mijoz o'zbekcha nomni ko'radi, buyurtma va xarid ro'yxati
// esa ASL nom bilan ketadi — Koreyadan aynan shu mahsulot topiladi.
console.log('\n── O‘ZBEKCHA NOM ──');
{
  const N = await import('../src/services/nom-uz.js');
  const { tozala } = await import('../src/ai/nom-uz.js');

  test('bo‘sh nom tozalanadi', tozala('  ') === '');
  test('qo‘shtirnoq olib tashlanadi', tozala('"Namlovchi krem"') === 'Namlovchi krem');
  test('BAQIRIQ kichraytiriladi', tozala('NAMLOVCHI KREM') === 'Namlovchi krem',
    tozala('NAMLOVCHI KREM'));
  test('juda uzun nom qisqartiriladi', tozala('a'.repeat(120)).length <= 70);

  await sorov(`update products set nom_uz = null`);
  const nomsizOldin = await N.nomsizSoni();
  test('boshida nomsizlar bor', nomsizOldin > 0, `${nomsizOldin} ta`);

  const r = await N.nomlarniToldir({ chegara: 50 });
  test('nomlar to‘ldirildi', r.yozildi > 0, JSON.stringify(r));
  test('nomsizlar kamaydi', (await N.nomsizSoni()) < nomsizOldin);

  const p1 = await qator('select id, name, nom_uz from products where id = 1');
  test('o‘zbekcha nom yozildi', Boolean(p1.nom_uz), p1.nom_uz);
  test('ASL NOM O‘ZGARMADI', p1.name === 'Heartleaf Pore Deep Cleansing Oil', p1.name);

  test('korinadiganNom o‘zbekchani beradi',
    N.korinadiganNom(p1) === p1.nom_uz);
  test('nom_uz bo‘lmasa asl nom ko‘rinadi',
    N.korinadiganNom({ name: 'Asl', nom_uz: null }) === 'Asl');
  test('bo‘sh nom_uz ham asl nomga tushadi',
    N.korinadiganNom({ name: 'Asl', nom_uz: '   ' }) === 'Asl');

  // Ilova katalogi o'zbekcha nomni beradi
  const kat = await chaqirIlova('/api/catalog', 'GET');
  const km = (kat.tana.mahsulotlar || []).find((x) => x.id === 1);
  test('katalogda ikkala nom ham bor', Boolean(km?.name && km?.nom_uz),
    `${km?.name} / ${km?.nom_uz}`);

  // ENG MUHIMI: buyurtma ASL nom bilan yoziladi
  const u = await qator(`select id from users where telegram_id = '800001'`);
  await sorov('delete from cart_items where user_id = $1', [u.id]);
  const { savatgaQosh, buyurtmaYarat } = await import('../src/services/orders.js');
  await savatgaQosh(u.id, 1, 1);
  const b = await buyurtmaYarat({ id: u.id, full_name: 'Sinov' },
    [{ product_id: 1, quantity: 1 }],
    { name: 'Sinov', phone: '+998901112233', address: 'Manzil 1',
      viloyat: 'Toshkent shahri', tuman: 'Chilonzor', yetkazishTuri: 'filial' });
  const element = (b.items || [])[0];
  test('BUYURTMADA ASL NOM', element?.name === 'Heartleaf Pore Deep Cleansing Oil',
    element?.name);
  test('buyurtmaga o‘zbekcha nom tushmadi', !/Sinov o‘zbekcha/.test(element?.name || ''));

  // Xarid ro'yxati ham asl nom bilan (Koreyadan shuni qidiriladi)
  const xr = await chaqirAdmin('/api/admin/xarid?holat=yangi&kun=0', 'GET');
  const xm = (xr.tana.mahsulotlar || []).find((x) => x.product_id === 1);
  test('XARID RO‘YXATIDA ASL NOM', xm?.nom === 'Heartleaf Pore Deep Cleansing Oil', xm?.nom);

  // Savatda esa o'zbekcha ko'rinadi
  const { savatniOl } = await import('../src/services/orders.js');
  await savatgaQosh(u.id, 1, 1);
  const savat = await savatniOl(u.id);
  test('savatda o‘zbekcha nom ham keladi', Boolean(savat[0]?.products?.nom_uz),
    savat[0]?.products?.nom_uz);
  await sorov('delete from cart_items where user_id = $1', [u.id]);

  // Admin qo'lda tahrirlashi
  const qol = await chaqirAdmin('/api/admin/nom-uz', 'POST',
    { id: 1, nom: '  Qo‘lda yozilgan nom  ' });
  test('admin qo‘lda nom yozdi', qol.tana.nom_uz === 'Qo‘lda yozilgan nom', qol.tana.nom_uz);
  const p2 = await qator('select name, nom_uz from products where id = 1');
  test('qo‘lda yozgach ham asl nom joyida',
    p2.name === 'Heartleaf Pore Deep Cleansing Oil' && p2.nom_uz === 'Qo‘lda yozilgan nom');

  // Bo'sh yuborilsa tozalanadi va yana asl nom ko'rinadi
  await chaqirAdmin('/api/admin/nom-uz', 'POST', { id: 1, nom: '' });
  const p3 = await qator('select name, nom_uz from products where id = 1');
  test('bo‘sh nom tozalab yuboriladi', p3.nom_uz === null);
  test('shunda ilovada asl nom ko‘rinadi', N.korinadiganNom(p3) === p3.name);

  await sorov(`update products set nom_uz = null`);
}

// ═══════════ TELEGRAMSIZ KIRISH ═══════════
// Bosh ekrandagi yorliq Telegramni ochishga majbur qilardi. Endi odam
// raqamini kiritadi, botga tasdiqlash keladi, tasdiqlagach brauzerda
// ham xuddi oddiy ilovadek ishlaydi.
console.log('\n── TELEGRAMSIZ KIRISH ──');
{
  const K = await import('../src/services/ilova-kirish.js');

  test('raqam har xil yozilsa ham bir xil tushuniladi',
    K.raqamTozala('90 123 45 67') === '+998901234567'
    && K.raqamTozala('+998901234567') === '+998901234567'
    && K.raqamTozala('998901234567') === '+998901234567');
  test('chala raqam rad etiladi', K.raqamTozala('90 123') === null);
  test('raqam niqoblanadi', K.raqamYashir('+998901234567') === '+998 90 *** ** 67',
    K.raqamYashir('+998901234567'));

  const u = await qator(`select id, telegram_id from users where telegram_id = '800001'`);
  await sorov(`update users set phone = '+998901234567' where id = $1`, [u.id]);
  await sorov('delete from kirish_sorovlari');
  await sorov('delete from ilova_seanslar');

  // Ro'yxatda yo'q raqam — begona odam birovga xabar yog'dira olmasin
  const yoq = await K.sorovYarat('+998900000000');
  test('ro‘yxatda yo‘q raqam rad etiladi', Boolean(yoq.xato), yoq.xato?.slice(0, 40));

  // Haqiqiy raqam — botga tasdiqlash keladi
  yuborilgan.length = 0;
  const s = await K.sorovYarat('90 123 45 67', { ip: '1.2.3.4', qurilma: 'Chrome' });
  test('so‘rov yaratildi', Boolean(s.kalit) && /^\d{4}$/.test(s.kod || ''), s.kod);
  test('botga tasdiqlash xabari bordi',
    yuborilgan.some((x) => String(x.chat_id) === '800001' && /kirish/i.test(x.text || '')));
  test('xabarda ekrandagi kod bor', (oxirgi().text || '').includes(s.kod), s.kod);
  test('tasdiqlash tugmalari bor', tugmalar().length === 2,
    tugmalar().map((b) => b.text).join(' / '));
  test('raqam to‘liq ko‘rsatilmaydi', !/901234567/.test(s.raqam || ''), s.raqam);

  test('tasdiqlanmaguncha token yo‘q',
    (await K.sorovHolati(s.kalit)).holat === 'kutilmoqda');

  // Botdagi «Ha, bu men»
  const ha = tugmalar().find((b) => /Ha, bu men/.test(b.text));
  await bos('800001', ha.callback_data);
  // Tugma bosilgach xabar TAHRIRLANADI (yangi xabar yuborilmaydi) —
  // shuning uchun natijani bazadan tekshiramiz
  const holat = await qiymat(`select holat from kirish_sorovlari where kalit = $1`, [s.kalit]);
  test('bot tasdig‘i qabul qilindi', holat === 'tasdiqlandi', holat);

  const h = await K.sorovHolati(s.kalit, { qurilma: 'Chrome' });
  test('token berildi', h.holat === 'tasdiqlandi' && Boolean(h.token), h.holat);

  const uu = await K.seansdanUser(h.token);
  test('token bilan foydalanuvchi topildi', uu?.id === u.id, uu?.full_name);

  // TOKEN BIR MARTALIK: kalitni bilgan odam ikkinchi token ololmasin
  test('so‘rov takror ishlatilmaydi', (await K.sorovHolati(s.kalit)).holat === 'yoq');
  test('soxta token ishlamaydi', (await K.seansdanUser('yolgon-token')) === null);

  // Ilova API si token bilan ishlaydi
  const bilan = await chaqirIlova('/api/me', 'GET', null, h.token);
  test('API token bilan ishlaydi', bilan.kod === 200, `kod=${bilan.kod}`);
  const tokensiz = await chaqirIlova('/api/me', 'GET', null, '');
  test('tokensiz API rad etadi', tokensiz.kod === 401, `kod=${tokensiz.kod}`);

  // Chiqish
  await K.seansniYop(h.token);
  test('chiqqandan keyin token o‘lik', (await K.seansdanUser(h.token)) === null);

  // Rad etish
  yuborilgan.length = 0;
  const s2 = await K.sorovYarat('+998901234567');
  const yq = tugmalar().find((b) => /Men emas/.test(b.text));
  await bos('800001', yq.callback_data);
  test('rad etilgan so‘rovdan token chiqmaydi',
    (await K.sorovHolati(s2.kalit)).holat === 'rad');

  // Muddati o'tgan so'rov
  const s3 = await K.sorovYarat('+998901234567');
  await sorov(`update kirish_sorovlari set expires_at = now() - interval '1 minute'
                where kalit = $1`, [s3.kalit]);
  test('muddati o‘tgan so‘rov', (await K.sorovHolati(s3.kalit)).holat === 'muddati_otdi');
  const id3 = (await qator('select id from kirish_sorovlari where kalit = $1', [s3.kalit])).id;
  test('muddati o‘tganini tasdiqlab bo‘lmaydi', (await K.sorovJavobi(id3, true)) === null);

  // Bloklangan foydalanuvchi
  const s4 = await K.sorovYarat('+998901234567');
  const id4 = (await qator('select id from kirish_sorovlari where kalit = $1', [s4.kalit])).id;
  await K.sorovJavobi(id4, true);
  const h4 = await K.sorovHolati(s4.kalit);
  await sorov('update users set is_blocked = true where id = $1', [u.id]);
  test('bloklangan foydalanuvchi kirolmaydi', (await K.seansdanUser(h4.token)) === null);
  await sorov('update users set is_blocked = false where id = $1', [u.id]);

  await sorov('delete from kirish_sorovlari');
  await sorov('delete from ilova_seanslar');
}

// ═══════════ XARID RO'YXATI (admin panel) ═══════════
// Botdagi /orders bitta partiya uchun. Panelda esa istalgan oraliq:
// nimadan nechta kerak va qaysi viloyatga qancha ketadi.
console.log('\n── XARID RO‘YXATI ──');
{
  const s = 'holat=tasdiqlangan,qadoqlanmoqda,yetkazildi,yangi&kun=0';
  const r = await chaqirAdmin(`/api/admin/xarid?${s}`, 'GET');
  test('xarid hisoboti keldi', r.kod === 200, `kod=${r.kod} ${r.tana.error || ''}`);

  const m = r.tana.mahsulotlar || [];
  test('mahsulotlar jamlandi', m.length > 0, `${m.length} xil`);
  test('eng ko‘p buyurtilgan birinchi',
    m.every((x, i, a) => i === 0 || a[i - 1].dona >= x.dona),
    m.slice(0, 3).map((x) => `${x.nom}:${x.dona}`).join(', '));
  test('bitta mahsulot bir necha buyurtmadan jamlandi',
    m.some((x) => x.buyurtma > 1), m.map((x) => x.buyurtma).join(','));
  test('ombor qoldig‘i ham keldi', m.every((x) => 'ombor' in x));
  test('manba havolasi ham keldi', m.some((x) => x.manba_url));

  const v = r.tana.viloyatlar || [];
  test('viloyatlar bo‘yicha jamlandi', v.length > 0, v.map((x) => x.viloyat).join(', '));
  test('viloyat buyurtma bo‘yicha saralangan',
    v.every((x, i, a) => i === 0 || a[i - 1].buyurtma >= x.buyurtma));
  test('viloyat jami donasi mahsulot jamiga teng',
    v.reduce((a, x) => a + x.dona, 0) === m.reduce((a, x) => a + x.dona, 0),
    `${v.reduce((a, x) => a + x.dona, 0)} / ${m.reduce((a, x) => a + x.dona, 0)}`);

  test('jami hisoblandi', r.tana.jami.dona > 0 && r.tana.jami.buyurtma > 0,
    JSON.stringify(r.tana.jami));

  // Viloyat bo'yicha filtr — qatorni bosganda shu ishlaydi
  const bir = v.find((x) => x.viloyat !== 'Ko‘rsatilmagan');
  if (bir) {
    const f = await chaqirAdmin(
      `/api/admin/xarid?${s}&viloyat=${encodeURIComponent(bir.viloyat)}`, 'GET');
    test('viloyat bo‘yicha filtr ishlaydi',
      f.tana.jami.buyurtma === bir.buyurtma,
      `${f.tana.jami.buyurtma} / ${bir.buyurtma}`);
    test('filtrda faqat bitta viloyat qoldi', (f.tana.viloyatlar || []).length === 1);
  }

  // Holat filtri: bekor qilinganlar xaridga tushmasligi kerak
  const faqat = await chaqirAdmin('/api/admin/xarid?holat=bekor&kun=0', 'GET');
  test('holat filtri ishlaydi',
    (faqat.tana.mahsulotlar || []).length < m.length,
    `bekor: ${faqat.tana.mahsulotlar?.length} · hammasi: ${m.length}`);

  test('havolasizlar sanaldi', typeof r.tana.havolasiz === 'number', String(r.tana.havolasiz));

  // ── CSV eksport ──
  const c = await chaqirXom(`/api/admin/xarid.csv?${s}&tur=mahsulot`);
  test('CSV keldi', c.kod === 200, `kod=${c.kod}`);
  test('CSV turi to‘g‘ri', /text\/csv/.test(c.sarlavhalar['Content-Type'] || ''));
  test('fayl nomi bilan yuklanadi',
    /attachment; filename="xarid-mahsulot-.*\.csv"/.test(c.sarlavhalar['Content-Disposition'] || ''),
    c.sarlavhalar['Content-Disposition']);
  test('Excel uchun BOM bor', c.tana.charCodeAt(0) === 0xfeff);
  test('ajratgich nuqta-vergul', /Mahsulot;Brend;Dona/.test(c.tana));
  test('CSV da hamma mahsulot bor',
    c.tana.trim().split('\r\n').length === m.length + 1,
    `${c.tana.trim().split('\r\n').length - 1} / ${m.length}`);

  const cv = await chaqirXom(`/api/admin/xarid.csv?${s}&tur=viloyat`);
  test('viloyat CSV ham ishlaydi', /Viloyat;Buyurtma;Dona/.test(cv.tana));

  // Nuqta-vergulli nom ustunlarni buzmasin
  await sorov(`update products set name = 'Test; nomi "qo‘shtirnoq"' where id = 1`);
  const c2 = await chaqirXom(`/api/admin/xarid.csv?${s}&tur=mahsulot`);
  test('CSV maxsus belgilarni qochiradi',
    c2.tana.includes('"Test; nomi ""qo‘shtirnoq"""'),
    c2.tana.split('\r\n').find((q) => q.includes('Test')));
  await sorov(`update products set name = 'Heartleaf Pore Deep Cleansing Oil' where id = 1`);

  // ── Telegramga yuborish (telefonda asosiy yo'l) ──
  yuborilgan.length = 0;
  const y = await chaqirAdmin('/api/admin/xarid-yubor', 'POST', { tur: 'mahsulot', sorov: s });
  test('CSV Telegramga yuborildi', y.kod === 200 && y.tana.yuborildi === true,
    `kod=${y.kod} ${y.tana.error || ''}`);
  const hj = yuborilgan.find((x) => x.hujjat);
  test('fayl hujjat sifatida keldi', Boolean(hj), hj?.nom);
  test('fayl .csv', /\.csv$/.test(hj?.nom || ''), hj?.nom);
  test('izohda oraliq ko‘rsatilgan', /Xarid ro‘yxati/.test(hj?.text || ''), hj?.text);
}

// ═══════════ TARMOQ UZILISHI VA UZUN XABAR ═══════════
// Railway'dan Telegram'ga ulanish uziladi. Ilgari bitta `fetch failed`
// butun buyruqni yo'q qilardi: admin /orders yozsa CHATDA HECH NARSA
// ko'rinmasdi va nima bo'lganini bilib bo'lmasdi.
console.log('\n── TARMOQ UZILISHI ──');
{
  const { tg, yubor } = await import('../src/bot/tg.js');
  const { urinishlar } = await import('./soxta-server.mjs');

  urinishlar.length = 0;
  globalThis.TG_UZILISH = 2;                 // ikkitasi uzilsin, uchinchisi o'tsin
  const j = await yubor('800001', 'Uzilishdan keyin yetib kelgan xabar');
  globalThis.TG_UZILISH = 0;
  test('uzilishdan keyin qayta urindi va yetkazdi', j?.ok === true, j?.description);
  test('uch marta urinildi', urinishlar.length === 3, `${urinishlar.length} ta`);

  // Umuman ulanmasa ham ISTISNO tashlamaydi — buyruq yiqilmaydi
  urinishlar.length = 0;
  globalThis.TG_UZILISH = 99;
  let tashladi = false;
  const j2 = await yubor('800001', 'yetmaydigan xabar').catch(() => { tashladi = true; });
  globalThis.TG_UZILISH = 0;
  test('tarmoq butunlay yo‘q bo‘lsa ham istisno yo‘q', tashladi === false);
  test('sabab tushunarli qaytdi', /TARMOQ/.test(j2?.description || ''), j2?.description);

  // Uzun ro'yxat: Telegram 4096 dan uzunini rad etadi — bo'lib yuboramiz
  yuborilgan.length = 0;
  const uzun = Array.from({ length: 400 }, (_, i) =>
    `${i + 1}. Mahsulot nomi juda uzun bo‘lgan qator — <b>3 dona</b>`).join('\n');
  const uz = await yubor('700001', uzun, {
    reply_markup: { inline_keyboard: [[{ text: 'Qabul qilindi', callback_data: 'x' }]] } });
  test('uzun xabar yuborildi', uz?.ok === true, uz?.description);
  test('bir nechta bo‘lakka bo‘lindi', yuborilgan.length > 1, `${yuborilgan.length} ta xabar`);
  test('har bo‘lak chegaradan qisqa',
    yuborilgan.every((x) => (x.text || '').length <= 4096),
    String(Math.max(...yuborilgan.map((x) => (x.text || '').length))));
  test('tugma faqat oxirgi bo‘lakda',
    yuborilgan.filter((x) => x.reply_markup).length === 1
    && Boolean(yuborilgan[yuborilgan.length - 1].reply_markup));

  // Buzuq HTML — bo'sh chat eng yomon variant, teglarsiz bo‘lsa ham ketsin
  yuborilgan.length = 0;
  const buz = await yubor('700001', 'Yopilmagan <b>teg');
  test('buzuq HTML da ham xabar yetdi', buz?.ok === true, buz?.description);
  test('teglar olib tashlandi', !/[<>]/.test(yuborilgan.at(-1)?.text || ''),
    yuborilgan.at(-1)?.text);

  void tg;
}

// ═══════════ TELEGRAM CHEKLOVI (PEER_FLOOD) ═══════════
// PEER_FLOOD — 429 emas, BOTGA qo'yilgan spam cheklovi va soatlab
// turadi. Cheklov paytida yana urinish uni UZAYTIRADI, shuning uchun
// ommaviy yuborish darrov to'xtashi kerak.
console.log('\n── TELEGRAM CHEKLOVI ──');
{
  const { floodTozala, floodKutilmoqda, floodQolgan } =
    await import('../src/lib/flood.js');
  const { urinishlar } = await import('./soxta-server.mjs');
  const bc = await import('../src/services/broadcast.js');
  floodTozala();

  // Ko'p odam bo'lsin — cheklov birinchisidayoq to'xtatishi kerak
  for (let i = 0; i < 12; i++) {
    await sorov(`insert into users (telegram_id, full_name, phone, source)
      values ($1, 'Sinov', '+99890111' || $2, 'telegram')
      on conflict (telegram_id) do nothing`, [`9500${i}`, String(2000 + i)]);
  }
  const hammasiSoni = await qiymat(
    `select count(*)::int from users where not is_blocked and telegram_id is not null`);

  globalThis.TG_FLOOD = true;
  urinishlar.length = 0;
  yuborilgan.length = 0;
  const y = await bc.broadcastBoshla({ matn: 'Sinov reklama', chatId: '700001' });
  // Fon vazifasi tugashini kutamiz
  for (let i = 0; i < 60; i++) {
    const h = await bc.broadcastHolati(y.id);
    if (h.holat !== 'ketmoqda') break;
    await new Promise((r) => setTimeout(r, 100));
  }
  globalThis.TG_FLOOD = false;

  test('cheklov aniqlandi', floodKutilmoqda() === true);
  test('sovish oynasi qo‘yildi', floodQolgan() > 60, `${floodQolgan()} sek`);
  test('yuborish TO‘XTATILDI, hammaga urinilmadi',
    urinishlar.length < hammasiSoni, `${urinishlar.length} / ${hammasiSoni}`);
  test('birinchi xatodayoq to‘xtadi', urinishlar.length <= 2, `${urinishlar.length} ta urinish`);

  const h = await bc.broadcastHolati(y.id);
  test('yuborish «toxtatildi» deb belgilandi', h.holat === 'toxtatildi', h.holat);

  // Cheklov paytida ommaviy yuborish umuman API ga bormaydi
  urinishlar.length = 0;
  const { tg } = await import('../src/bot/tg.js');
  const rad = await tg('sendMessage', { chat_id: '800001', text: 'x' }, { ommaviy: true });
  test('cheklov paytida ommaviy so‘rov yuborilmaydi', urinishlar.length === 0);
  test('sabab tushunarli', rad.description === 'PEER_FLOOD_KUTISH', rad.description);

  // Mijozning savoliga javob esa ISHLAYDI — uni javobsiz qoldirib bo'lmaydi
  const javob = await tg('sendMessage', { chat_id: '800001', text: 'javob' });
  test('oddiy javob cheklov paytida ham ketadi', javob.ok === true);

  // /holat adminga holatni ko'rsatadi
  yuborilgan.length = 0;
  await yoz('700001', '/holat');
  test('/holat cheklovni ko‘rsatdi', /PEER_FLOOD/.test(hammasi()));
  test('/holat nima qilishni aytdi', /BotSupport/.test(hammasi()));

  floodTozala();
  await sorov(`delete from users where telegram_id like '9500%'`);
  test('cheklov tozalangach yana ishlaydi', floodKutilmoqda() === false);
  yuborilgan.length = 0;
  await yoz('700001', '/holat');
  test('/holat toza holatni ham ko‘rsatadi', /cheklovi yo‘q/.test(hammasi()));
}

// ═══════════ MINI APP HAVOLASI ═══════════
// Bosh ekranga qo'yilgan yorliq BOT SUHBATINI ochardi, ilovani emas.
// Sabab: yorliq ilova qanday ochilganiga qarab yasaladi — to'g'ridan
// -to'g'ri havoladan ochilsa (t.me/bot/ilova) ilovaga bog'lanadi.
console.log('\n── MINI APP HAVOLASI ──');
{
  const { ilovaHavolasi, ilovaTugmasi, nomniUnut } =
    await import('../src/lib/ilova-havola.js');
  const qoy = async (v) => {
    await sorov(`insert into settings (key, value) values ('mini_app_nom', $1::jsonb)
                 on conflict (key) do update set value = excluded.value`,
                [JSON.stringify(v)]);
    nomniUnut();
  };

  await qoy('');
  const h1 = await ilovaHavolasi();
  test('qisqa nomsiz — startapp havolasi', /\?startapp=/.test(h1 || ''), h1);
  const t1 = await ilovaTugmasi('Do‘kon');
  test('qisqa nomsiz — web_app tugmasi', Boolean(t1?.web_app), JSON.stringify(t1));

  await qoy('ilova');
  const h2 = await ilovaHavolasi();
  test('qisqa nom bilan — to‘g‘ridan-to‘g‘ri havola',
    /^https:\/\/t\.me\/[^/]+\/ilova$/.test(h2 || ''), h2);
  // Do'kon tugmasi qisqa nomga BOG'LIQ EMAS: BotFather'da nom
  // ro'yxatdan o'tmagan bo'lsa url tugmasi o'lik havola bo'lib,
  // do'kon umuman ochilmay qolardi.
  const t2 = await ilovaTugmasi('Do‘kon');
  test('qisqa nom bilan ham web_app qoladi', Boolean(t2?.web_app) && !t2?.url,
    JSON.stringify(t2));

  // startapp parametri: mahsulotga to'g'ridan-to'g'ri o'tish uchun
  test('startapp qo‘shiladi', /\/ilova\?startapp=m12$/.test(await ilovaHavolasi('m12')));

  // Xavfsizlik: sozlamaga tashlangan axlat havolani buzmasin
  await qoy('@ilo va/../x');
  test('nom tozalanadi', /\/ilova\.\.x$|\/ilovax$/.test(await ilovaHavolasi() || ''),
    await ilovaHavolasi());
  await qoy('ilova');

  // Admin menyusidagi «Do'kon» ham shu havolani ishlatadi
  const { asosiyMenyu } = await import('../src/bot/keyboards.js');
  const menyu = await asosiyMenyu(false);
  const dokon = menyu.inline_keyboard.flat().find((b) => /Do‘kon/.test(b.text));
  test('menyudagi Do‘kon ilovani ochadi', Boolean(dokon?.web_app?.url), JSON.stringify(dokon));
}

// ═══════════ PDF ═══════════
// Qo'llanma PDF i kutubxonasiz yig'iladi — sahifalar to'g'ri
// o'ralganini va faylni ocha olishini tekshiramiz.
console.log('\n── PDF ──');
{
  const { pdfRasmlardan, pngdanRgb } = await import('../src/lib/pdf.js');
  const { svgdanPng } = await import('../src/rasm/chiz.js');
  const png = await svgdanPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">
       <rect width="200" height="300" fill="#e0242b"/>
       <text x="20" y="60" font-family="Liberation Sans" font-size="24"
         fill="#fff">Qo‘llanma</text></svg>`, 200);

  const r = pngdanRgb(png);
  test('PNG ochildi', r.eni === 200 && r.boyi === 300, `${r.eni}×${r.boyi}`);
  test('RGB uzunligi to‘g‘ri', r.rgb.length === 200 * 300 * 3, String(r.rgb.length));
  test('rang saqlandi (qizil)', r.rgb[0] > 200 && r.rgb[1] < 80, r.rgb.slice(0, 3).join(','));

  const pdf = pdfRasmlardan([png, png, png]);
  test('PDF sarlavhasi', pdf.subarray(0, 5).toString() === '%PDF-');
  test('uchta sahifa', /\/Count 3\b/.test(pdf.toString('latin1')));
  test('A4 o‘lchami', /MediaBox \[0 0 595\.28 841\.89\]/.test(pdf.toString('latin1')));
  test('xref va trailer bor', /\nxref\n/.test(pdf.toString('latin1'))
    && /%%EOF/.test(pdf.toString('latin1')));

  // startxref haqiqiy joyni ko'rsatsin — aks holda o'quvchi faylni rad etadi
  const xom = pdf.toString('latin1');
  const joy = Number(/startxref\n(\d+)/.exec(xom)?.[1]);
  test('startxref xref ga to‘g‘ri keladi', xom.slice(joy, joy + 4) === 'xref', String(joy));
}

// ═══════════ BOSQICH XABARI: OMBOR YO'Q ═══════════
// Mijozga «📍 {ombor} {manzil} {mo_ljal}» degan XOM matn borgan edi:
// shablonda o'rin egallovchi bor, to'ldiruvchi kod esa yo'q. Ustiga
// bizda ombor umuman yo'q — «olib ketishingiz mumkin» yolg'on va'da.
console.log('\n── BOSQICH XABARI (OMBOR YO‘Q) ──');
{
  const { oringaQoy } = await import('../src/bot/shablon.js');

  // ── to'ldiruvchining o'zi ──
  test('tanilmagan belgi mijozga bormaydi',
    !/[{}]/.test(oringaQoy('Salom {ombor} {mo_ljal}!', { raqam: 'A1' })),
    oringaQoy('Salom {ombor} {mo_ljal}!', { raqam: 'A1' }));

  const kop = oringaQoy('📮 {raqam}\n📍 {yetkazish}\n{pochta_izoh}\n📞 {telefon}',
    { raqam: 'QQ-1', yetkazish: 'Uyingizgacha', pochta_izoh: '', telefon: '' });
  test('bo‘sh belgi bilan butun qator o‘chadi',
    kop === '📮 QQ-1\n📍 Uyingizgacha', JSON.stringify(kop));

  test('to‘ldirilgan qator qoladi',
    oringaQoy('{a} · {b}', { a: 'bor', b: '' }) === 'bor ·',
    oringaQoy('{a} · {b}', { a: 'bor', b: '' }));

  test('HTML ekranlanadi',
    oringaQoy('{nom}', { nom: '<script>' }) === '&lt;script&gt;');

  test('bo‘sh teg qolmaydi', oringaQoy('<b>{x}</b>a', { x: '' }) === 'a',
    oringaQoy('<b>{x}</b>a', { x: '' }));

  // ── haqiqiy buyurtma bo'ylab ──
  const mijoz = await qator(`select id, telegram_id from users where telegram_id='800001'`);
  const { buyurtmaYarat } = await import('../src/services/orders.js');
  await sorov('delete from cart_items where user_id = $1', [mijoz.id]);
  await sorov(`update settings set value='0'::jsonb where key='minimal_buyurtma'`);
  const b = await buyurtmaYarat({ id: mijoz.id, full_name: 'Sinov', phone: '+998901112233' },
    [{ product_id: 1, quantity: 1 }],
    { name: 'Sinov', phone: '+998901112233', address: 'Chilonzor 5-uy',
      viloyat: 'Toshkent shahri', tuman: 'Chilonzor', yetkazishTuri: 'filial' });

  const mijozgaOxirgi = () => [...yuborilgan].reverse()
    .find((y) => String(y.chat_id) === String(mijoz.telegram_id))?.text || '';

  yuborilgan.length = 0;
  const r1 = await chaqirAdmin('/api/admin/order-status', 'POST',
    { id: b.id, status: 'omborda' });
  test('holat o‘zgardi', r1.kod === 200, JSON.stringify(r1.tana));
  await new Promise((r) => setTimeout(r, 400));      // xabar fon rejimida ketadi
  const x1 = mijozgaOxirgi();
  test('«omborda» xabari yetdi', x1.includes(b.order_no), x1.slice(0, 80));
  test('XOM BELGI YO‘Q', !/\{\w+\}/.test(x1), x1);
  test('ombor va’da qilinmaydi', !/ombor/i.test(x1), x1);
  test('olib ketishga chaqirmaydi', !/olib keting|olib ketish/i.test(x1), x1);

  // ── pochtadan jo'natildi: admin qayerga ketganini yozadi ──
  yuborilgan.length = 0;
  const izoh = 'Chilonzor 12-filial · AB123456789UZ';
  const r2 = await chaqirAdmin('/api/admin/order-status', 'POST',
    { id: b.id, status: 'pochta_jonatildi', pochta_izoh: izoh });
  test('jo‘natish holati o‘tdi', r2.kod === 200, JSON.stringify(r2.tana));
  test('pochta izohi bazaga yozildi',
    (await qiymat('select pochta_izoh from orders where id=$1', [b.id])) === izoh);
  await new Promise((r) => setTimeout(r, 400));
  const x2 = mijozgaOxirgi();
  test('MIJOZ QAYERGA KETGANINI KO‘RADI', x2.includes(izoh), x2);
  test('yetkazish turi aytiladi', /filial/i.test(x2), x2);
  test('bu yerda ham xom belgi yo‘q', !/\{\w+\}/.test(x2), x2);

  // Izohsiz jo'natilsa qator butunlay chiqmaydi — bo'sh «📍» qolmasin
  await sorov('update orders set pochta_izoh = null where id = $1', [b.id]);
  yuborilgan.length = 0;
  await chaqirAdmin('/api/admin/order-status', 'POST',
    { id: b.id, status: 'yolda' });
  await chaqirAdmin('/api/admin/order-status', 'POST',
    { id: b.id, status: 'pochta_jonatildi', pochta_izoh: '' });
  await new Promise((r) => setTimeout(r, 400));
  const x3 = mijozgaOxirgi();
  test('izohsiz ham xabar tushunarli', !/\{\w+\}/.test(x3) && x3.includes(b.order_no), x3);
  test('bo‘sh qator qolmadi', !/\n\s*\n\s*\n/.test(x3), JSON.stringify(x3));

  // Bekor qilinganda sabab sarlavha bilan keladi
  yuborilgan.length = 0;
  await chaqirAdmin('/api/admin/order-status', 'POST',
    { id: b.id, status: 'bekor', reason: 'mahsulot tugadi' });
  await new Promise((r) => setTimeout(r, 400));
  const x4 = mijozgaOxirgi();
  test('bekor sababi sarlavha bilan', /Sabab: mahsulot tugadi/.test(x4), x4);

  // Bot yo'li (partiya bosqichi) ham xuddi shunday to'ldiradi
  const { STANDART } = await import('../src/bot/shablonlar-standart.js');
  test('standart «omborda» matnida ombor yo‘q',
    !/\{ombor\}|\{mo_ljal\}/.test(STANDART.xabar_holat_omborda),
    STANDART.xabar_holat_omborda);
}

// ═══════════ AI MODELLARI ADMIN PANELDA ═══════════
// Model nomi faqat muhit o'zgaruvchisida edi — o'zgartirish uchun
// Railway'ga kirish kerak bo'lardi. Endi admin panelda tanlanadi.
console.log('\n── AI MODELLARI (ADMIN PANEL) ──');
{
  const M = await import('../src/ai/modellar.js');
  M.modellarniTozala();

  const b1 = await chaqirAdmin('/api/admin/ai-modellar', 'GET');
  test('ro‘yxat keldi', Array.isArray(b1.tana.modellar) && b1.tana.modellar.length > 0,
    (b1.tana.modellar || []).join(', '));
  test('boshida STANDART ro‘yxat', b1.tana.standart === true);
  test('tanlash uchun variantlar bor', (b1.tana.tavsiya || []).length >= 5,
    `${(b1.tana.tavsiya || []).length} ta`);
  test('rasm modeli alohida ko‘rsatiladi', Boolean(b1.tana.rasm_model), b1.tana.rasm_model);

  // ── Admin o'z tartibini saqlaydi ──
  const tanlov = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-2.5-flash'];
  const s1 = await chaqirAdmin('/api/admin/ai-modellar', 'POST',
    { modellar: tanlov, rasm_model: 'gemini-2.5-flash-image' });
  test('saqlandi', s1.kod === 200, JSON.stringify(s1.tana).slice(0, 90));
  test('TARTIB SAQLANDI', s1.tana.modellar.join() === tanlov.join(), s1.tana.modellar.join());
  test('endi standart emas', s1.tana.standart === false);

  M.modellarniTozala();                       // keshni tashlab, bazadan o'qitamiz
  await M.modellarniTaminla();
  test('bazadan o‘qildi', M.royxat().join() === tanlov.join(), M.royxat().join());
  test('birinchisi asosiy model', M.royxat()[0] === 'gemini-3.6-flash', M.royxat()[0]);
  test('rasm modeli ham saqlandi', M.rasmModeli() === 'gemini-2.5-flash-image', M.rasmModeli());

  // ── Takror va axlat tozalanadi ──
  const s2 = await chaqirAdmin('/api/admin/ai-modellar', 'POST',
    { modellar: ['gemini-3.8-flash', 'gemini-3.8-flash', '  ', '"gemini-3.7-flash"'],
      rasm_model: '' });
  test('takror olib tashlandi', s2.tana.modellar.length === 2, s2.tana.modellar.join(', '));
  test('qo‘shtirnoq va bo‘shliq tozalandi',
    s2.tana.modellar[1] === 'gemini-3.7-flash', s2.tana.modellar[1]);

  // ── Bo'sh ro'yxat = standartga qaytarish ──
  const s3 = await chaqirAdmin('/api/admin/ai-modellar', 'POST', { modellar: [], rasm_model: '' });
  test('bo‘sh ro‘yxat standartga qaytaradi', s3.tana.standart === true);
  test('standart ro‘yxat qaytdi', s3.tana.modellar[0] === 'gemini-3.8-flash',
    s3.tana.modellar[0]);
  test('ro‘yxatsiz emas', s3.tana.modellar.length >= 3, `${s3.tana.modellar.length} ta`);

  const yomon = await chaqirAdmin('/api/admin/ai-modellar', 'POST', { modellar: 'salom' });
  test('noto‘g‘ri ma’lumot rad etiladi', yomon.kod === 400, String(yomon.kod));

  // ── «Sinash» tugmasi: model HAQIQATAN ishlaydimi ──
  const sinov = await chaqirAdmin('/api/admin/ai-model-sinov', 'POST',
    { model: 'gemini-3.8-flash' });
  test('sinov o‘tdi', sinov.tana.ok === true, JSON.stringify(sinov.tana).slice(0, 120));

  // Yo'q model — sinov buni ANIQ aytadi va boshqasini sinab qo'ymaydi
  globalThis.AI_404_MODELLAR = ['gemini-yoq-model'];
  const sinov2 = await chaqirAdmin('/api/admin/ai-model-sinov', 'POST',
    { model: 'gemini-yoq-model' });
  globalThis.AI_404_MODELLAR = [];
  test('yo‘q model sinovda aniqlanadi', sinov2.tana.ok === false, JSON.stringify(sinov2.tana));
  test('sabab «model» deb aytiladi', sinov2.tana.turkum === 'model', sinov2.tana.turkum);
  test('QAYSI model yiqilgani aniq', sinov2.tana.model === 'gemini-yoq-model',
    sinov2.tana.model);

  // Kvota tugagan model — sinov BOSHQA modelga o'tib ketmasligi kerak,
  // aks holda admin noto'g'ri modelni «ishlayapti» deb o'ylaydi
  M.modellarniTozala();
  globalThis.AI_429_MODELLAR = ['gemini-3.8-flash'];
  const sinov3 = await chaqirAdmin('/api/admin/ai-model-sinov', 'POST',
    { model: 'gemini-3.8-flash' });
  globalThis.AI_429_MODELLAR = [];
  test('kvota tugagan model «ishlayapti» demaydi', sinov3.tana.ok === false,
    JSON.stringify(sinov3.tana).slice(0, 120));
  test('sinov boshqa modelga O‘TMAYDI', sinov3.tana.model === 'gemini-3.8-flash',
    sinov3.tana.model);
  test('kunlik kvota deb belgilanadi', sinov3.tana.turkum === 'kvota_kunlik',
    sinov3.tana.turkum);

  // Google KALIT noto'g'ri bo'lsa ham 400 beradi (401 emas). Buni
  // «so'rov xatosi» deb ko'rsatish adminni chalg'itardi: u kalitni
  // emas, kodni qidirib ketardi.
  M.modellarniTozala();
  globalThis.AI_KALIT_YOMON = true;
  const sinov4 = await chaqirAdmin('/api/admin/ai-model-sinov', 'POST',
    { model: 'gemini-3.8-flash' });
  globalThis.AI_KALIT_YOMON = false;
  test('noto‘g‘ri kalit «kalit» deb aniqlanadi', sinov4.tana.turkum === 'kalit',
    `${sinov4.tana.turkum} · ${sinov4.tana.xabar}`);
  test('kalit xatosida so‘rov soddalashtirilmaydi', sinov4.tana.ms < 3000,
    `${sinov4.tana.ms} ms`);

  const bosh = await chaqirAdmin('/api/admin/ai-model-sinov', 'POST', { model: '' });
  test('nomsiz sinov rad etiladi', bosh.kod === 400);

  M.modellarniTozala();
}

// ═══════════ KUNDUZGI / TUNGI KO'RINISH ═══════════
// Tungi ko'rinish faqat telefon sozlamasiga bog'liq edi — odam o'zi
// tanlay olmasdi. Endi tanlov `data-mavzu` atributi bilan ustun
// turadi. Bu CSS ishi, lekin himoyalar tasodifan olib tashlansa
// tanlov jimgina ishlamay qoladi — shuning uchun tekshiramiz.
console.log('\n── KO‘RINISH (KUNDUZGI/TUNGI) ──');
{
  const fs = await import('node:fs');
  const css = fs.readFileSync('public/app/style.css', 'utf8');
  const js  = fs.readFileSync('public/app/app.js', 'utf8');

  const media = [...css.matchAll(/@media \(prefers-color-scheme:dark\)/g)].length;
  test('tungi bloklar bor', media >= 4, `${media} ta`);

  // Har bir tungi media blok «kunduzgi» tanlovidan himoyalangan
  const himoyasiz = [...css.matchAll(/@media \(prefers-color-scheme:dark\)\{([^{]*)\{/g)]
    .filter((m) => !m[1].includes('data-mavzu="kunduzgi"'));
  test('HAR BIR tungi blok himoyalangan', himoyasiz.length === 0,
    himoyasiz.map((m) => m[1].slice(0, 40)).join(' | '));

  // Majburiy tungi uchun takror bloklar
  const tungi = [...css.matchAll(/\[data-mavzu="tungi"\]/g)].length;
  test('majburiy tungi qoidalar bor', tungi >= 4, `${tungi} ta`);
  test('tungi tokenlar to‘liq ko‘chirilgan',
    /:root\[data-mavzu="tungi"\][^}]*--fon:#0f0f11/.test(css));
  test('ko‘rinish tanlovi uslubi bor', css.includes('.korinish-tanlov'));

  // JS tomoni
  test('tanlov qurilmada saqlanadi', js.includes('kiovo_korinish'));
  test('«tizim» da atribut QO‘YILMAYDI',
    /removeAttribute\('data-mavzu'\)/.test(js));
  test('uchta variant bor',
    /kalit: 'tizim'/.test(js) && /kalit: 'kunduzgi'/.test(js) && /kalit: 'tungi'/.test(js));
  test('profilda tanlov chiziladi', js.includes("'y-korinish'"));

  // Ikonlar mavjud — yo'q ikon bo'sh joy bo'lib qoladi
  const ikon = fs.readFileSync('public/app/ikon.js', 'utf8');
  for (const nom of ['quyosh', 'oy', 'ekran']) {
    test(`«${nom}» ikoni bor`, new RegExp(`\\n\\s*${nom}:`).test(ikon));
  }
}

// ═══════════ ADMIN YORDAMCHISI (AGENT) ═══════════
// Do'kon haqidagi savolga javob beradi va topshiriqni bosqichma-
// bosqich bajaradi. Eng muhimi: bazani O'ZGARTIRADIGAN amal
// TASDIQSIZ bajarilmaydi — bitta noto'g'ri tushunilgan jumla
// katalogni yo'q qilib qo'ymasin.
console.log('\n── ADMIN YORDAMCHISI ──');
{
  const { rejalarniTozala, rejaSoni } = await import('../src/services/admin-agent.js');
  const V = await import('../src/services/admin-vositalar.js');
  rejalarniTozala();

  // ── Vositalarning o'zi ── (agentsiz, to'g'ridan-to'g'ri)
  const mh = await V.vositaniBajar('mahsulotlar', { chegara: 5 });
  test('mahsulotlar vositasi ishlaydi', mh.jami > 0 && mh.mahsulotlar.length <= 5,
    `jami ${mh.jami}, ko‘rsatilgan ${mh.korsatilgan}`);
  const qid = await V.vositaniBajar('mahsulotlar', { qidiruv: 'Heartleaf' });
  test('qidiruv ishlaydi', qid.mahsulotlar.some((p) => /Heartleaf/i.test(p.name)),
    `${qid.jami} ta`);

  const st = await V.vositaniBajar('statistika', { kun: 90 });
  test('statistika keladi', typeof st.umumiy?.buyurtma === 'number',
    JSON.stringify(st.umumiy).slice(0, 90));
  const bz = await V.vositaniBajar('buyurtmalar', { chegara: 5 });
  test('buyurtmalar keladi', Array.isArray(bz.buyurtmalar), `${bz.jami} ta`);
  const mj = await V.vositaniBajar('mijozlar', { chegara: 5 });
  test('mijozlar keladi', Array.isArray(mj.mijozlar), `${mj.jami} ta`);

  let yoq = '';
  try { await V.vositaniBajar('rm_rf', {}); } catch (e) { yoq = e.message; }
  test('NOMA’LUM vosita rad etiladi', /Noma'lum vosita/.test(yoq), yoq);

  // ── TAKRORLARNI TOPISH ──
  await sorov(`insert into products (name, brand, price, cost_price, stock, is_active)
    values ('Takror Sinov Krem','TESTBRAND',50000,20000,5,true),
           ('takror   sinov krem','testbrand',52000,21000,3,true),
           ('Takror Sinov Krem!','TESTBRAND',51000,20500,0,true)`);
  const tk = await V.vositaniBajar('takrorlar', {});
  const guruh = tk.guruhlar.find((g) => /takror sinov krem/.test(g.kalit));
  test('TAKRORLAR topildi', Boolean(guruh), `${tk.guruh_soni} guruh`);
  test('guruhda 3 ta yozuv bor', guruh && guruh.ortiqcha.length === 2,
    `${guruh?.ortiqcha.length} ta ortiqcha`);
  // Qaysi biri qolishi MODELGA emas, qoidaga bog'liq: ombori ko'pi
  test('ombori ko‘pi qoladi', guruh?.qoladi?.stock === 5, String(guruh?.qoladi?.stock));

  // ── AGENT: O'QISH erkin bajariladi ──
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Avval ro‘yxatni olaman', amal: 'vosita', vosita: 'mahsulotlar',
      argumentlar_json: '{"chegara":5}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Yetarli', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Do‘konda mahsulotlar bor.', reja_izoh: '',
      takliflar: ['Nechta tugagan?'] },
  ];
  const a1 = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'Qanday mahsulotlar bor?' });
  test('agent javob berdi', a1.kod === 200 && a1.tana.javob.length > 5,
    `${a1.kod} ${a1.tana.javob?.slice(0, 50)}`);
  test('o‘qish vositasi BAJARILDI', a1.tana.qadamlar?.[0]?.vosita === 'mahsulotlar',
    JSON.stringify(a1.tana.qadamlar));
  test('natija qisqartirib ko‘rsatiladi', /jami/.test(a1.tana.qadamlar?.[0]?.qisqa || ''),
    a1.tana.qadamlar?.[0]?.qisqa);
  test('tasdiq so‘ralmadi', !a1.tana.reja);
  test('takliflar keldi', (a1.tana.takliflar || []).length > 0);

  // ── AGENT: YOZISH tasdiqsiz BAJARILMAYDI ──
  // Haqiqiy oqim: agent avval takrorlarni topadi, keyin O'SHA
  // guruhdagi ortiqchalarni yopishni taklif qiladi.
  const yopiladigan = guruh.ortiqcha.map((p) => p.id);
  test('yopiladigan ikkita nusxa aniqlandi', yopiladigan.length === 2,
    `${yopiladigan.length} ta`);

  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Takrorlarni ko‘raman', amal: 'vosita', vosita: 'takrorlar',
      argumentlar_json: '{}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Ortiqchalarini yopaman', amal: 'vosita', vosita: 'mahsulot_yop',
      argumentlar_json: JSON.stringify({ idlar: yopiladigan }),
      javob: 'Ikkita takror topildi.',
      reja_izoh: '2 ta mahsulot sotuvdan olinadi.', takliflar: [] },
  ];
  const a2 = await chaqirAdmin('/api/admin/agent', 'POST',
    { savol: 'Bir xil tovarlarni olib tashla' });
  test('YOZISH uchun REJA qaytdi', Boolean(a2.tana.reja), JSON.stringify(a2.tana).slice(0, 120));
  test('rejada vosita nomi bor', a2.tana.reja?.vosita === 'mahsulot_yop', a2.tana.reja?.vosita);
  test('nechta yozuvga tegishi aytiladi', a2.tana.reja?.soni === 2, String(a2.tana.reja?.soni));
  test('reja izohi bor', (a2.tana.reja?.izoh || '').length > 5, a2.tana.reja?.izoh);
  test('tasdiq tokeni berildi', (a2.tana.reja?.token || '').length > 10);

  // ENG MUHIMI: hali HECH NARSA o'zgarmagan
  const faolOldin = await qiymat(
    `select count(*)::int from products where is_active and id = any($1)`, [yopiladigan]);
  test('TASDIQGACHA BAZA O‘ZGARMAYDI', faolOldin === 2, `${faolOldin} ta faol`);

  // ── TASDIQ ──
  const t1 = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: a2.tana.reja.token });
  test('tasdiqlangach bajarildi', t1.kod === 200 && t1.tana.natija?.ozgardi === 2,
    JSON.stringify(t1.tana).slice(0, 100));
  const faolKeyin = await qiymat(
    `select count(*)::int from products where is_active and id = any($1)`, [yopiladigan]);
  test('ikkalasi ham sotuvdan olindi', faolKeyin === 0, `${faolKeyin} ta faol qoldi`);
  const qoldi = await qiymat(
    `select is_active from products where id = $1`, [guruh.qoladi.id]);
  test('QOLADIGANI tegilmadi', qoldi === true, String(qoldi));

  // Token BIR MARTALIK — takroriy so'rov ishlamaydi
  const t2 = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: a2.tana.reja.token });
  test('token qayta ishlatilmaydi', t2.kod === 400, `${t2.kod} ${t2.tana.error}`);
  const soxta = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST', { token: 'oydirma' });
  test('o‘ydirma token rad etiladi', soxta.kod === 400);

  // ── Aylana cheksiz bo'lmasin ──
  globalThis.AGENT_QADAMLAR = Array.from({ length: 20 }, () => (
    { fikr: 'yana', amal: 'vosita', vosita: 'mahsulotlar',
      argumentlar_json: '{"chegara":1}', javob: '', reja_izoh: '', takliflar: [] }));
  const a3 = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'Cheksiz aylana' });
  test('QADAM SONI cheklangan', (a3.tana.qadamlar || []).length <= 6,
    `${a3.tana.qadamlar?.length} qadam`);
  test('cheklovda ham tushunarli javob', /bo‘laklarga/.test(a3.tana.javob || ''),
    a3.tana.javob?.slice(0, 60));

  // Model yo'q vositani tanlasa yiqilmaydi
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'x', amal: 'vosita', vosita: 'yoq_vosita', argumentlar_json: '{}',
      javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'x', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Tushunmadim, aniqroq yozing.', reja_izoh: '', takliflar: [] },
  ];
  const a4 = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'noaniq' });
  test('yo‘q vosita tanlansa ham yiqilmaydi', a4.kod === 200, String(a4.kod));

  const bosh = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'a' });
  test('bo‘sh savol rad etiladi', bosh.kod === 400);

  globalThis.AGENT_QADAMLAR = [];
  await sorov(`delete from products where name ilike 'Takror Sinov%' or name ilike 'takror%'`);
  rejalarniTozala();
  test('rejalar tozalandi', rejaSoni() === 0);
}

// ═══════════ BOSH SAHIFA VA EKRANGA QO'SHISH ═══════════
// Odam do'kon manzilini brauzerda ochsa faqat «Telegramda ochish»
// tugmasini ko'rardi — telefon bilan kirish yo'li ko'rinmasdi.
// Ekranga qo'shganda esa manifest yo'qligi uchun Android oddiy
// xatcho'p yasab, o'sha sahifani ochardi — ya'ni yorliq mini
// ilovani emas, botni ochardi.
console.log('\n── BOSH SAHIFA / EKRANGA QO‘SHISH ──');
{
  const fs = await import('node:fs');
  const bosh = fs.readFileSync('public/index.html', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('public/app/manifest.json', 'utf8'));

  test('bosh sahifada MANIFEST ulangan', /rel="manifest"/.test(bosh),
    (bosh.match(/<link rel="manifest"[^>]*>/) || [''])[0]);
  test('yorliq MINI ILOVANI ochadi', manifest.start_url === '/app/', manifest.start_url);
  test('qamrov bosh sahifani ham o‘z ichiga oladi', manifest.scope === '/', manifest.scope);
  test('start_url qamrov ichida', manifest.start_url.startsWith(manifest.scope));

  test('asosiy tugma do‘konni ochadi', /class="tugma" href="\/app\/"/.test(bosh));
  test('telefon bilan kirish haqida aytilgan', /Telefon raqamingiz bilan/.test(bosh));
  // Ilgari bu havola bo'sh "https://t.me/" edi va hech qayerga
  // olib bormasdi
  test('Telegram havolasi tirik', !/href="https:\/\/t\.me\/"/.test(bosh));
  test('Telegram havolasi serverga yo‘naltiradi', /href="\/app\/ochish"/.test(bosh));

  // Kirish oqimi bot bilan BIR XIL foydalanuvchiga bog'lanadi —
  // ya'ni ma'lumot avtomatik sinxron
  const K = await import('../src/services/ilova-kirish.js');
  const u = await qator(`select id, phone from users where telegram_id = '800001'`);
  const sorovNat = await K.sorovYarat(u.phone);
  test('mavjud raqamga so‘rov yaratildi', !sorovNat.xato, sorovNat.xato || 'ok');
  // Kalit bo'yicha topamiz: sorovYarat id qaytarmaydi (u faqat
  // brauzerga kerakli narsalarni qaytaradi)
  const bogliq = await qiymat(
    `select user_id from kirish_sorovlari where kalit = $1`, [sorovNat.kalit]);
  test('so‘rov BOTDAGI foydalanuvchiga bog‘landi', Number(bogliq) === Number(u.id),
    `${bogliq} vs ${u.id}`);
  test('tasdiqlash kodi berildi', /^\d{4}$/.test(sorovNat.kod || ''), sorovNat.kod);
  test('raqam to‘liq ko‘rsatilmaydi', /\*/.test(sorovNat.raqam || ''), sorovNat.raqam);

  const yoq = await K.sorovYarat('+998900000000');
  test('ro‘yxatda yo‘q raqam rad etiladi', Boolean(yoq.xato), yoq.xato);
}

// ═══════════ MASLAHAT EKRANI: KAM MATN, TINCH PANEL ═══════════
// Ikki shikoyat: kirish ekrani matnga to'lib ketgan, va tabdan tabga
// o'tganda yozish paneli qimirlab, yo'q bo'lib paydo bo'lardi.
console.log('\n── MASLAHAT EKRANI ──');
{
  const fs = await import('node:fs');
  const js  = fs.readFileSync('public/app/app.js', 'utf8');
  const css = fs.readFileSync('public/app/style.css', 'utf8');

  // ── Kam matn ──
  const namuna = (js.match(/const NAMUNA_SAVOL = \[([\s\S]*?)\];/) || [])[1] || '';
  const qatorlar = namuna.split('\n').filter((q) => /matn:/.test(q));
  test('namuna savol soni kamaydi', qatorlar.length === 3, `${qatorlar.length} ta`);
  const uzun = qatorlar.map((q) => (q.match(/matn:\s*'([^']*)'/) || [])[1] || '')
    .filter((t) => t.length > 22);
  test('har biri BITTA qatorga sig‘adi', uzun.length === 0, uzun.join(' | '));
  test('to‘liq savol AI ga ketadi', /sorov:/.test(namuna) && js.includes('n.sorov || n.matn'));
  test('kirish matni qisqartirildi',
    js.includes('mos mahsulotni topib beraman.')
      && !js.includes('do‘kondagi mahsulotlardan mos kelganini topib beraman'));
  test('uzun nom o‘ralmaydi', /\.namunalar button span\{[^}]*white-space:nowrap/.test(css));

  // ── Panel qimirlamasin ──
  test('tab almashuvi animatsiyasiz', js.includes('function animatsiyasiz'));
  test('butun almashuv shu ichida', /animatsiyasiz\(\(\) => \{[\s\S]{0,400}TABLAR\.forEach/.test(js));
  test('animatsiya bir kadrga o‘chadi',
    /body\.tez \.menyu,body\.tez \.yozish\{transition:none!important\}/.test(css));
  test('ikki kadrdan keyin qaytariladi',
    /requestAnimationFrame\(\(\) => requestAnimationFrame\(/.test(js));
  test('panel yumshoq paydo bo‘ladi',
    /#tab-maslahat:not\(\.yashirin\) \.yozish\{animation:panel-kir/.test(css));
  test('harakat kamaytirilganda animatsiya yo‘q',
    /prefers-reduced-motion[\s\S]{0,200}panel-kir[\s\S]{0,40}none|prefers-reduced-motion[\s\S]{0,220}\.yozish\{animation:none\}/.test(css));
}

// ═══════════ YORDAMCHI EKRANI (DIZAYN QOIDALARI) ═══════════
// Suhbat bo'lim ichida chizilganda sahifaning o'zi ham, xabarlar
// ro'yxati ham skroll bo'lardi — klaviatura ochilganda ekran «o'ynab»
// ketardi. Endi u alohida to'liq ekran. Bu qoidalar tasodifan
// buzilsa ko'rinish jimgina yomonlashadi, shuning uchun tekshiramiz.
console.log('\n── YORDAMCHI EKRANI ──');
{
  const fs = await import('node:fs');
  const js  = fs.readFileSync('public/admin/admin.js', 'utf8');
  const css = fs.readFileSync('public/admin/style.css', 'utf8');

  // Bo'lim EMAS, alohida ekran
  test('yordamchi bo‘limlar ro‘yxatida yo‘q', !/yordamchi:\s*\{\s*nom:/.test(js));
  test('alohida ekran sifatida ochiladi', js.includes('function yordamchiOch'));
  test('«Ko‘proq» menyusidan ochiladi', js.includes("id === 't-yordamchi'"));

  // Pastki menyu ko'rinmasin: ekran butun sahifani qoplaydi
  test('ekran fixed va to‘liq', /\.y-ekran\{[^}]*position:fixed[^}]*inset:0/.test(css),
    (css.match(/\.y-ekran\{[^}]*/) || [''])[0].slice(0, 70));
  test('pastki menyudan YUQORIDA turadi',
    Number((css.match(/\.y-ekran\{[^}]*z-index:(\d+)/) || [])[1]) > 40,
    (css.match(/\.y-ekran\{[^}]*z-index:(\d+)/) || [])[1]);
  test('orqa fon skroll bo‘lmaydi', /body\.y-ochiq\{overflow:hidden\}/.test(css));

  // SKROLL faqat bitta joyda
  test('skroll faqat xabarlar ro‘yxatida', /\.y-oqim\{[^}]*overflow-y:auto/.test(css));
  test('barmoq oxiriga yetganda orqa sahifa surilmaydi',
    /\.y-oqim\{[^}]*overscroll-behavior:contain/.test(css));
  test('yozish paneli qotib turadi', /\.y-yozish\{[^}]*flex:0 0 auto/.test(css));
  // 100vh telefonda brauzer paneli ostida qolib ketadi — dvh kerak
  test('klaviatura uchun dvh ishlatilgan', /\.y-ekran\{[^}]*height:100dvh/.test(css));
  test('pastki xavfsiz zona hisobga olingan',
    /\.y-yozish\{[^}]*safe-area-inset-bottom/.test(css));

  // Skroll «o'ynamasin»: sahifaning o'zi emas, ro'yxat suriladi
  test('sahifa emas, RO‘YXAT suriladi',
    js.includes('oqim.scrollTop = oqim.scrollHeight') && !/y-oqim[\s\S]{0,80}scrollIntoView/.test(js));
  test('eski javob o‘qilayotganda pastga tortilmaydi',
    /const yaqin = /.test(js) && /majburiy \|\| yaqin/.test(js));

  // Yozish maydoni qayta chizilmaydi — kursor va matn yo'qolmasin
  // Maydon BIR MARTA yaratiladi (yordamchiOch da) va qayta
  // chizilmaydi — aks holda yozayotgan matn va kursor yo'qoladi
  test('yozish maydoni bir marta yaratiladi',
    (js.match(/<textarea id="y-matn"/g) || []).length === 1);
  test('qayta chizish faqat xabarlar ro‘yxatiga tegadi',
    /function yordamchiChiz[\s\S]*?oqim\.innerHTML/.test(js)
      && !/function yordamchiChiz[\s\S]*?\.y-yozish/.test(js));
  test('maydon o‘zi o‘sadi va chegarasi bor',
    /Math\.min\(132, m\.scrollHeight\)/.test(js) && /max-height:132px/.test(css));

  // Suhbat BIR MARTALIK
  test('yopilganda suhbat tozalanadi',
    /function yordamchiYop[\s\S]{0,400}yordamchiSuhbat = \[\]/.test(js));
  test('hech qayerga saqlanmaydi',
    !/localStorage[^\n]*yordamchi/i.test(js) && !/yordamchi[^\n]*localStorage/i.test(js));
  test('sarlavhada shu aytilgan', js.includes('Suhbat saqlanmaydi'));
  test('telefonda «orqaga» ekranni yopadi', js.includes('popstate'));
}

console.log(`\n${xato?'❌':'✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato?1:0);
