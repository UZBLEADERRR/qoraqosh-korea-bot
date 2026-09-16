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

// OCHIQ yo'llar (Instagram sahifasi) — admin tokeni ham, Telegram
// initData ham yo'q. IP sarlavhasi beriladi: chegara shunga bog'liq.
const { ochiqRoutes } = await import('../src/api/ochiq.js');
const chaqirOchiq = (yol, usul, tana, ip = '198.51.100.5') => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { 'content-type': 'application/json', 'content-length': String(bayt.length),
               'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
  });
  const bolaklar = [];
  const javob = {
    statusCode: 200, headersSent: false,
    writeHead(k) { this.statusCode = k; return this; },
    setHeader() {},
    end(x) { if (x) bolaklar.push(x); res({ kod: this.statusCode,
      tana: JSON.parse(Buffer.concat(bolaklar.map(Buffer.from)).toString() || '{}') }); },
  };
  ochiqRoutes(req, javob, yol.split('?')[0])
    .catch((e) => res({ kod: 500, tana: { error: e.message } }));
});

// Agent endi FONDA ishlaydi: so'rov ish raqamini qaytaradi, natija
// esa holat so'rovi orqali keladi. Sinov ham xuddi panel kabi kutadi.
const agentSora = async (tana) => {
  const b = await chaqirAdmin('/api/admin/agent', 'POST', tana);
  if (b.kod !== 200 || !b.tana?.ish) return b;
  for (let i = 0; i < 400; i++) {
    const h = await chaqirAdmin(`/api/admin/agent-holat?ish=${b.tana.ish}`, 'GET');
    if (h.tana?.holat === 'tayyor') return { kod: 200, tana: h.tana.natija, holat: h.tana };
    if (h.tana?.holat === 'xato') return { kod: 500, tana: { error: h.tana.xato }, holat: h.tana };
    await new Promise((r) => setTimeout(r, 5));
  }
  return { kod: 504, tana: {} };
};

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

// Yuzinchi partiyada `/orders` BUTUNLAY ishlamay qolardi: raqam
// `lpad(n, 2, '0')` bilan yasalar, Postgres esa uzun satrni QIRQAR
// edi — '100' → '10'. Ya'ni 100-partiya 10-partiya bilan bir xil
// raqam olib, unique cheklovga urilardi.
console.log('\n── PARTIYA RAQAMI 100 DAN KEYIN HAM TO‘G‘RI ──');
{
  const oldin = await qiymat(`select last_value from partiya_seq`);
  await sorov(`select setval('partiya_seq', 99, true)`);
  const ikki = [];
  for (let i = 0; i < 3; i++) {
    const r = await qator(
      `select 'P-' || to_char(now() at time zone 'Asia/Tashkent', 'YYMMDD') || '-' ||
              case when n < 10 then '0' || n::text else n::text end as raqam
         from (select nextval('partiya_seq') as n) s`);
    ikki.push(r.raqam);
  }
  test('100 dan keyin raqam QIRQILMAYDI',
    new Set(ikki).size === 3, ikki.join(', '));
  test('oxiri 100, 101, 102 bo‘lib ketadi',
    ikki.every((x, i) => x.endsWith(String(100 + i))), ikki.join(', '));
  await sorov(`select setval('partiya_seq', 8, true)`);
  const kichik = await qator(
    `select case when n < 10 then '0' || n::text else n::text end as nn
       from (select nextval('partiya_seq') as n) s`);
  test('kichik raqam esa nol bilan to‘ldiriladi', kichik.nn === '09', kichik.nn);
  await sorov(`select setval('partiya_seq', $1, true)`, [Number(oldin) || 1]);
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
  const { palitra, kontrastMatn, rangTozala, tungiUrgu, MAVZU_STANDART } = await import('../src/lib/mavzu.js');
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

  // Natija kartochkasi endi DOIM qora: ilova ekranidagi natija bilan
  // bir xil ko'rinadi va suratdagi rangli ko'rsatkichlar qora fonda
  // «yorib» chiqadi. Mavzudan faqat URG'U rangi olinadi.
  const svgQizil = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 65, muammolar: [{ nom: 'Sinov', foiz: 70, zona: 'T-zona' }] },
    tavsiyalar: [], mavzu: { asosiy: '#B3161C', fon: '#EAF3D9', urgu: '#E0242B' } });
  test('kartochka foni QORA', svgQizil.includes('#08080A'));
  test('och mavzu foni kartochkaga o‘tmaydi', !svgQizil.includes('#eaf3d9'));

  const svgKok = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 65, muammolar: [{ nom: 'Sinov', foiz: 70, zona: 'T-zona' }] },
    tavsiyalar: [], mavzu: { asosiy: '#123A63', fon: '#E7F0F7', urgu: '#1D6FA5' } });
  const urguChiq = (svg) => (svg.match(/fill="(#[0-9a-f]{6})"/gi) || []).join(' ');
  test('urg‘u rangi mavzudan keladi', urguChiq(svgQizil) !== urguChiq(svgKok));
  test('urg‘u qora fon uchun YORITILADI',
    svgKok.includes(tungiUrgu('#1D6FA5')), tungiUrgu('#1D6FA5'));

  // Muammo ranglari MAVZUGA BOG'LIQ EMAS — qizil «yomon» degani hamma joyda bir xil
  test('muammo rangi mavzudan qat’i nazar bir xil',
    svgQizil.includes('#FF6B5A') && svgKok.includes('#FF6B5A'));

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

  // ── ENG MUHIMI: tanlov HAQIQATAN ishlashi ──
  // Shikoyat: «kunduzgi mavzuda turib tungini yoqsam unchalik
  // o'zgarmayapti». Sabab: do'kon ranglari `<html>` ga INLINE
  // qo'yilardi va inline uslub har qanday CSS qoidasidan kuchli —
  // `[data-mavzu="tungi"]` ularni bosa olmasdi. Ustiga «qorong'imi»
  // degan savolga faqat `prefers-color-scheme` javob berardi, ya'ni
  // odamning tanlovi umuman hisobga olinmasdi.
  test('«qorong‘imi» savoli TANLOVdan boshlanadi',
    /const qorongimi = \(\) => \{[\s\S]{0,200}mavzuOqi\(\)[\s\S]{0,200}'tungi'/.test(js));
  test('tungida kunduzgi inline ranglar OLIB TASHLANADI',
    /MAVZU_TOKEN\.forEach\(\(t\) => r\.removeProperty\(t\)\)/.test(js));
  test('olib tashlanadigan tokenlar ro‘yxati to‘liq',
    /MAVZU_TOKEN = \['--fon', '--panel', '--chiziq', '--matn', '--kul', '--och', '--urgu-och'\]/
      .test(js));
  test('tanlov o‘zgarganda ranglar QAYTA qo‘llanadi',
    /function mavzuniQoy[\s\S]{0,700}mavzuniQoll\(oxirgiMavzu\)/.test(js));
  test('«tizim» da telefon rejimi o‘zgarsa ham moslashadi',
    /addEventListener\?\.\('change'[\s\S]{0,120}mavzuniQoy\('tizim'\)/.test(js));

  // Urg'u rangi qorong'i fonda O'QILADIGAN bo'lishi kerak
  const { palitra, tungiUrgu, kontrast, TOPLAMLAR } =
    await import('../src/lib/mavzu.js');
  const past = TOPLAMLAR
    .map((m) => ({ nom: m.nom, k: kontrast(tungiUrgu(m.urgu), '#0f0f11') }))
    .filter((x) => x.k < 4.5);
  test('HAR BIR tayyor mavzuning urg‘usi tungida o‘qiladi', past.length === 0,
    past.map((x) => `${x.nom} ${x.k.toFixed(2)}`).join(', '));
  test('to‘q qizil tungi uchun yoritiladi',
    kontrast('#c0392b', '#0f0f11') < 4.5 && kontrast(tungiUrgu('#c0392b'), '#0f0f11') >= 4.5,
    `${kontrast('#c0392b', '#0f0f11').toFixed(2)} → ${kontrast(tungiUrgu('#c0392b'), '#0f0f11').toFixed(2)}`);
  const pal = palitra({ urgu: '#c0392b' });
  test('palitrada tungi urg‘u ham bor',
    Boolean(pal.urguTungi && pal.urguTungiTim && pal.urguTungiOch),
    JSON.stringify({ u: pal.urguTungi, t: pal.urguTungiTim, o: pal.urguTungiOch }));
  test('tungi tusi FONga yaqin (yorug‘ dog‘ bo‘lmaydi)',
    kontrast(pal.urguTungiOch, '#0f0f11') < 2, kontrast(pal.urguTungiOch, '#0f0f11').toFixed(2));
  test('ilova tungi variantni ishlatadi', /r\.setProperty\('--urgu', m\.urguTungi\)/.test(js));
}

// ═══════════ BO'LIMDAN BO'LIMGA O'TISH ═══════════
// Shikoyat: «bir pagedan boshqasiga o'tganda natijalar va ai chat
// qismi yangilanib ketyapti». Ikki sabab bor edi: har o'tishda sahifa
// tepaga otilardi va chat butunlay qayta chizilardi.
console.log('\n── BO‘LIM ALMASHUVI ──');
{
  const fs = await import('node:fs');
  const js = fs.readFileSync('public/app/app.js', 'utf8');

  test('har bo‘limning surilish joyi eslab qolinadi',
    /tabSurish\[holat\.tab\] = window\.scrollY/.test(js));
  test('qaytib kelganda o‘sha joyidan davom etadi',
    /tabSurish\[nom\] \|\| 0/.test(js) && /scrollTo\(\{ top: joy \}\)/.test(js));
  test('sahifa endi har o‘tishda tepaga otilmaydi',
    !/if \(nom === 'natija'[\s\S]{0,80}scrollTo\(\{ top: 0 \}\);/.test(js));
  test('YANGI natija esa boshidan ko‘rinadi', /tabSurish\.natija = 0/.test(js));

  // Chat DOM i qayta yozilmaydi — rasm qaytadan yuklanmasin,
  // animatsiya noldan boshlanmasin
  test('chat o‘zgarmagan bo‘lsa QAYTA chizilmaydi',
    /if \(suhbatChizilgan === suhbatV && oqim\.childElementCount\) return;/.test(js));
  test('o‘zgarish sanog‘i bor', /const suhbatOzgardi = \(\) => \{ suhbatV \+= 1; \};/.test(js));
  const sanoq = (js.match(/suhbatOzgardi\(\)/g) || []).length;
  // To'rtta joyda suhbat o'zgaradi: yuklash, savol yuborish,
  // javob kelishi, tozalash — har birida sanoq oshishi shart
  test('har bir o‘zgarishda sanoq oshadi', sanoq >= 4, `${sanoq} ta chaqiruv`);
  test('suhbat tozalansa ham qayta chiziladi',
    /suhbat = \[\][\s\S]{0,140}suhbatOzgardi\(\)/.test(js));
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
  const a1 = await agentSora({ savol: 'Qanday mahsulotlar bor?' });
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
  const a2 = await agentSora(
    { savol: 'Bir xil tovarlarni olib tashla' });
  test('YOZISH uchun REJA qaytdi', Boolean(a2.tana.reja), JSON.stringify(a2.tana).slice(0, 120));
  test('rejada vosita nomi bor', a2.tana.reja?.qadamlar?.[0]?.vosita === 'mahsulot_yop',
    JSON.stringify(a2.tana.reja?.qadamlar));
  test('nechta yozuvga tegishi aytiladi', a2.tana.reja?.soni === 2, String(a2.tana.reja?.soni));
  test('reja izohi bor', (a2.tana.reja?.qadamlar?.[0]?.izoh || '').length > 5,
    a2.tana.reja?.qadamlar?.[0]?.izoh);
  test('tasdiq tokeni berildi', (a2.tana.reja?.token || '').length > 10);

  // ENG MUHIMI: hali HECH NARSA o'zgarmagan
  const faolOldin = await qiymat(
    `select count(*)::int from products where is_active and id = any($1)`, [yopiladigan]);
  test('TASDIQGACHA BAZA O‘ZGARMAYDI', faolOldin === 2, `${faolOldin} ta faol`);

  // ── TASDIQ ──
  const t1 = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: a2.tana.reja.token });
  test('tasdiqlangach bajarildi', t1.kod === 200 && t1.tana.ozgardi === 2,
    JSON.stringify(t1.tana).slice(0, 120));
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
  const a3 = await agentSora({ savol: 'Cheksiz aylana' });
  test('QADAM SONI cheklangan', (a3.tana.qadamlar || []).length <= 12,
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
  const a4 = await agentSora({ savol: 'noaniq' });
  test('yo‘q vosita tanlansa ham yiqilmaydi', a4.kod === 200, String(a4.kod));

  const bosh = await agentSora({ savol: 'a' });
  test('bo‘sh savol rad etiladi', bosh.kod === 400);

  // ── BIR XABARDA BIR NECHA ISH ──
  // Admin «toifasini o'zgartir VA takrorlarni tozala» desa agent
  // birinchisidayoq to'xtab qolardi. Endi yozish amallari navbatga
  // qo'yiladi va ish davom etadi.
  await sorov(`insert into products (name, brand, price, cost_price, stock, is_active)
    values ('Kop Ish Sinov','KOPISH',50000,20000,5,true)`);
  const kopId = await qiymat(`select id from products where name='Kop Ish Sinov'`);
  const bolimId = await qiymat(`select id from categories order by sort, id limit 1`);
  const bolimNom = await qiymat(`select name from categories where id=$1`, [bolimId]);

  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Bo‘limlarni ko‘raman', amal: 'vosita', vosita: 'bolimlar',
      argumentlar_json: '{}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Toifasini o‘zgartiraman', amal: 'vosita', vosita: 'toifa_ozgartir',
      argumentlar_json: JSON.stringify({ idlar: [kopId], bolim: bolimNom }),
      javob: '', reja_izoh: 'Toifa o‘zgartiriladi', takliflar: [] },
    { fikr: 'Narxni ham', amal: 'vosita', vosita: 'narx_ozgartir',
      argumentlar_json: JSON.stringify({ id: kopId, narx: 99000 }),
      javob: '', reja_izoh: 'Narx 99000 bo‘ladi', takliflar: [] },
    { fikr: 'Tayyor', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Ikkita o‘zgarish taklif qilaman.', reja_izoh: '', takliflar: [] },
  ];
  const kop = await agentSora(
    { savol: 'Toifasini o‘zgartir va narxini ko‘tar' });
  test('BIR REJADA IKKI AMAL', kop.tana.reja?.qadamlar?.length === 2,
    `${kop.tana.reja?.qadamlar?.length} qadam`);
  test('ikkalasi ham to‘xtatmadi',
    kop.tana.reja.qadamlar.map((q) => q.vosita).join() === 'toifa_ozgartir,narx_ozgartir',
    kop.tana.reja.qadamlar.map((q) => q.vosita).join());

  const kopT = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: kop.tana.reja.token });
  test('ikkala amal ham bajarildi', kopT.tana.ozgardi === 2, JSON.stringify(kopT.tana.qadamlar));
  const keyingiHolat = await qator(
    `select category_id, price from products where id = $1`, [kopId]);
  test('TOIFA HAQIQATAN o‘zgardi', Number(keyingiHolat.category_id) === Number(bolimId),
    `${keyingiHolat.category_id} vs ${bolimId}`);
  test('narx ham o‘zgardi', keyingiHolat.price === 99000, String(keyingiHolat.price));

  // Yo'q bo'lim so'ralsa aniq aytiladi
  const yoqBolim = await V.vositaniBajar('toifa_ozgartir',
    { idlar: [kopId], bolim: 'bunday-bolim-yoq' });
  test('yo‘q bo‘lim aniq aytiladi', yoqBolim.ozgardi === 0
    && Array.isArray(yoqBolim.mavjud_bolimlar), yoqBolim.xabar);

  // ── BO'LIMLARNI JAMLASH ──
  // Aynan shu ish bajarilmasdi: agent bo'lim NOMLARINI bilardi,
  // lekin ichidagi mahsulotlarning id sini bilmasdi, toifa_ozgartir
  // esa id talab qilardi. Natijada «0 ta yozuv o'zgardi» chiqardi.
  await sorov(`insert into categories (slug, name, sort) values
      ('pardoz-t','Pardoz T',90),('praymer-t','Praymer T',91),('makiyaj-t','Makiyaj T',92)
    on conflict (slug) do nothing`);
  const bId = async (slug) => qiymat(`select id from categories where slug=$1`, [slug]);
  const p1 = await qiymat(`select id from products order by id limit 1`);
  const p2 = await qiymat(`select id from products order by id offset 1 limit 1`);
  await sorov(`update products set category_id=$1 where id=$2`, [await bId('pardoz-t'), p1]);
  await sorov(`update products set category_id=$1 where id=$2`, [await bId('praymer-t'), p2]);

  const jam = await V.vositaniBajar('bolim_birlashtir',
    { maqsad: 'Makiyaj T', manba: ['Pardoz T', 'Praymer T'] });
  test('BO‘LIMLAR JAMLANDI', jam.ozgardi === 2, JSON.stringify(jam).slice(0, 110));
  test('bo‘sh bo‘limlar o‘chdi', jam.ochirilgan_bolimlar.length === 2,
    jam.ochirilgan_bolimlar.join(', '));
  test('mahsulotlar maqsad bo‘limda',
    (await qiymat(`select count(*)::int from products where category_id=$1`,
      [await bId('makiyaj-t')])) === 2);
  test('manba bo‘limlar bazadan ketdi',
    (await qiymat(`select count(*)::int from categories where slug in ('pardoz-t','praymer-t')`)) === 0);

  // Butun bo'limni id larsiz ko'chirish
  const kochir = await V.vositaniBajar('toifa_ozgartir',
    { manba_bolim: 'Makiyaj T', bolim: (await qator(
      `select name from categories where slug not in ('makiyaj-t') order by sort limit 1`)).name });
  test('manba_bolim bilan ID siz ko‘chadi', kochir.ozgardi === 2, JSON.stringify(kochir));

  // ID ham, manba ham berilmasa — SABABI aytiladi
  const idsiz = await V.vositaniBajar('toifa_ozgartir', { bolim: 'Makiyaj T' });
  test('ID siz chaqiruvda sabab aytiladi', idsiz.ozgardi === 0 && /manba_bolim/.test(idsiz.xabar),
    idsiz.xabar);

  // Ichida mahsulot bor bo'limni o'chirib bo'lmaydi
  await sorov(`update products set category_id=$1 where id=$2`, [await bId('makiyaj-t'), p1]);
  const ochOch = await V.vositaniBajar('bolim_ochir', { bolimlar: ['Makiyaj T'] });
  test('to‘la bo‘lim O‘CHMAYDI', ochOch.ozgardi === 0
    && /mahsulot bor/.test(ochOch.tegilmadi?.[0]?.sabab || ''), JSON.stringify(ochOch.tegilmadi));
  await sorov(`update products set category_id=null where id=$1`, [p1]);
  const ochOch2 = await V.vositaniBajar('bolim_ochir', { bolimlar: ['Makiyaj T'] });
  test('bo‘sh bo‘lim o‘chadi', ochOch2.ozgardi === 1, JSON.stringify(ochOch2));

  // ── JIMGINA YIQILISH KO'RINADI ──
  // Vosita xato tashlamay ham ishni bajarmagan bo'lishi mumkin.
  // Ilgari bunday qadam «ok» hisoblanib, admin faqat «0 ta yozuv»
  // degan raqamni ko'rardi, sababini esa ko'rmasdi.
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'x', amal: 'vosita', vosita: 'toifa_ozgartir',
      argumentlar_json: JSON.stringify({ bolim: 'Toner' }),
      javob: '', reja_izoh: 'Toifa o‘zgaradi', takliflar: [] },
    { fikr: 'x', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Taklif tayyor.', reja_izoh: '', takliflar: [] },
  ];
  const jim = await agentSora({ savol: 'Toifani o‘zgartir' });
  const jimT = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: jim.tana.reja.token });
  test('bajarilmagan qadam YIQILGAN deb belgilanadi',
    jimT.tana.qadamlar?.[0]?.ok === false, JSON.stringify(jimT.tana.qadamlar));
  test('SABABI ham qaytadi', /ID lari/.test(jimT.tana.qadamlar?.[0]?.xato || ''),
    jimT.tana.qadamlar?.[0]?.xato);
  test('hech nima o‘zgarmagani ko‘rinadi', jimT.tana.ozgardi === 0);

  // ── YOLG'ON DA'VO ──
  // Model hech narsa qilmasdan «o'chirdim» deb yozsa — bu admin
  // uchun eng yomon holat: u ishonadi, mahsulot esa joyida turadi.
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'x', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Bir xil mahsulotlarni o‘chirdim, endi katalog toza.',
      reja_izoh: '', takliflar: [] },
  ];
  const yolgon = await agentSora(
    { savol: 'Takrorlarni o‘chir' });
  test('YOLG‘ON DA’VO to‘xtatiladi', !/o‘chirdim/.test(yolgon.tana.javob),
    yolgon.tana.javob);
  test('rostini aytadi', /bajara olmadim|o‘zgarish qilinmadi/.test(yolgon.tana.javob),
    yolgon.tana.javob);
  test('reja ham berilmaydi', !yolgon.tana.reja);

  // Taklif bor, lekin model uni bajarilgandek yozsa ham to'g'rilanadi
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'x', amal: 'vosita', vosita: 'mahsulot_yop',
      argumentlar_json: JSON.stringify({ idlar: [kopId] }),
      javob: 'Mahsulotni yopdim.', reja_izoh: 'Yopiladi', takliflar: [] },
    { fikr: 'x', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Mahsulotni yopdim, tayyor.', reja_izoh: '', takliflar: [] },
  ];
  const taklif = await agentSora({ savol: 'Yop' });
  test('taklifni bajarilgandek yozmaydi', !/yopdim/.test(taklif.tana.javob),
    taklif.tana.javob);
  test('tasdiq kutayotgani aytiladi', /taklif|tasdiq/i.test(taklif.tana.javob),
    taklif.tana.javob);
  test('reja baribir beriladi', Boolean(taklif.tana.reja));

  // ── RASM BILAN SAVOL ──
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'x', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Rasmni ko‘rdim.', reja_izoh: '', takliflar: [] },
  ];
  const rasmB64 = 'data:image/jpeg;base64,' + Buffer.alloc(400, 9).toString('base64');
  const rasmli = await agentSora(
    { savol: 'Bu qanaqa mahsulot?', rasmlar: [rasmB64] });
  test('RASM bilan savol qabul qilinadi', rasmli.kod === 200, String(rasmli.kod));

  await sorov(`delete from products where name = 'Kop Ish Sinov'`);

  globalThis.AGENT_QADAMLAR = [];
  await sorov(`delete from products where name ilike 'Takror Sinov%' or name ilike 'takror%'`);
  rejalarniTozala();
  test('rejalar tozalandi', rejaSoni() === 0);
}

// ═══════════ BOSH SAHIFA (kiovo.shop) ═══════════
// Domen olindi va endi bosh sahifa brendning o'z sayti: qahramon
// plakat, yuz skaneri, mahsulot vitrinasi, aloqa va «ekranga
// o'rnatish». Ilgari bu yerda bitta «Telegramda ochish» tugmasi
// turgan bo'sh sahifa edi.
console.log('\n── BOSH SAHIFA / kiovo.shop ──');
{
  const fs = await import('node:fs');
  const bosh = fs.readFileSync('public/uy/index.html', 'utf8');
  const uyCss = fs.readFileSync('public/uy/style.css', 'utf8');
  const uyJs  = fs.readFileSync('public/uy/app.js', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('public/uy/manifest.json', 'utf8'));
  const ilovaManifest = JSON.parse(fs.readFileSync('public/app/manifest.json', 'utf8'));

  test('bosh sahifada MANIFEST ulangan', /rel="manifest" href="\/uy\/manifest\.json"/.test(bosh));
  // «Saytda ilovani o'rnatsam sayt ochilyapti, ilova emas.»
  // Yorliq `/app/ochish` ga tushadi va server uni Telegram
  // ilovasiga yo'naltiradi — odam «ilova» deganda ILOVANI kutadi.
  test('yorliq ILOVANI ochadi, saytni emas',
    manifest.start_url === '/app/ochish', manifest.start_url);
  test('ilova manifesti ham o‘zgarmadi', ilovaManifest.start_url === '/app/');
  test('qamrov butun domen', manifest.scope === '/');
  test('start_url qamrov ichida', manifest.start_url.startsWith(manifest.scope));
  test('`id` o‘zgarmadi — o‘rnatgan odamda yangisi paydo bo‘lmaydi',
    manifest.id === '/');
  const srvKod0 = fs.readFileSync('src/server.js', 'utf8');
  test('server `/app/ochish` ni Telegramga yo‘naltiradi',
    /yol === '\/app\/ochish'/.test(srvKod0) && /ilovaHavolasi\(\)/.test(srvKod0));
  test('tez havolalar bor — skaner va sayt',
    (manifest.shortcuts || []).length === 2,
    (manifest.shortcuts || []).map((x) => x.url).join(', '));

  // Qahramon: plakat rasmi va ikkita asosiy amal
  test('qahramon rasmi joylandi', /<img src="\/uy\/hero\.jpg"/.test(bosh));
  test('rasm fayli haqiqatan bor va yengil',
    fs.existsSync('public/uy/hero.jpg')
      && fs.statSync('public/uy/hero.jpg').size < 400 * 1024,
    `${(fs.statSync('public/uy/hero.jpg').size / 1024).toFixed(0)} KB`);
  test('rasm o‘lchami yozilgan — sahifa sakrab ketmaydi',
    /width="1000" height="1500"/.test(bosh));

  test('yuz skaneriga tugma bor', /href="\/skan\/"/.test(bosh));
  test('do‘konga (botga) tugma bor', /href="\/app\/ochish"/.test(bosh));
  test('aloqa bo‘limi bor', /id="aloqa"/.test(bosh));
  test('ekranga o‘rnatish bo‘limi bor', /id="ornat-karta"/.test(bosh));

  // Bot manzili sozlamadan keladi. HTML dagi havola serverga
  // qarab turadi — JS o'chiq bo'lsa ham tugma ishlaydi
  test('bot havolasi bo‘sh "t.me/" emas', !/href="https:\/\/t\.me\/"/.test(bosh));
  test('bot manzili JS bilan almashtiriladi',
    /\[data-bot\]/.test(uyJs) && /a\.href = havola/.test(uyJs));

  // «Ekranga o'rnatish» — Android taklif beradi, iOS bermaydi
  test('Android taklifi ushlab olinadi', /beforeinstallprompt/.test(uyJs));
  test('iPhone uchun qo‘lda yo‘li yozilgan', /iPhone:/.test(bosh));
  test('o‘rnatilgan bo‘lsa blok yashiriladi',
    /display-mode: standalone/.test(uyJs) && /karta\.hidden = true/.test(uyJs));

  // Vitrina serverdan keladi; bo'sh bo'lsa bo'lim ko'rinmaydi
  test('mahsulot bo‘limi boshida YASHIRIN',
    /id="mahsulotlar" hidden/.test(bosh));
  test('bo‘sh ro‘yxatda ochilmaydi', /if \(!el \|\| !royxat\.length\) return/.test(uyJs));
  test('mahsulot matni EKRANLANADI', /const esc =/.test(uyJs) && /esc\(p\.nom\)/.test(uyJs));

  // Qidiruv tizimlari uchun
  test('sahifa tavsifi bor', /<meta name="description"/.test(bosh));
  test('ulashilganda rasm chiqadi', /og:image/.test(bosh));
  test('manzil MUTLAQ bo‘ladi — nisbiysini ochib bo‘lmaydi',
    /content="__ASOS__\/uy\/hero\.jpg"/.test(bosh));
  const srvKod2 = fs.readFileSync('src/server.js', 'utf8');
  test('server manzilni sozlamadan qo‘yadi',
    /replaceAll\('__ASOS__'/.test(srvKod2));
  test('robots.txt bor', /yol === '\/robots\.txt'/.test(srvKod2));
  test('admin panel INDEKSLANMAYDI', /Disallow: \/admin/.test(srvKod2));
  test('sitemap.xml bor', /yol === '\/sitemap\.xml'/.test(srvKod2));
  test('bosh sahifa `uy` papkasidan beriladi',
    /if \(yol === '\/' \)\s+return sahifa\(res, 'uy'\)/.test(srvKod2));

  // Dizayn brendga mos: FAQAT qizil va och yashil
  test('plakat ranglari ishlatilgan',
    /--lime:#c6ec93/.test(uyCss) && /--qizil-tim:#5e0b0e/.test(uyCss));
  test('brend qizili ilova bilan bir xil', /--qizil:#b3161c/.test(uyCss));
  // Rasm chetdan chiqib turardi va sahifa yon tomonga suriladigan
  // bo'lib qolgandi — telefonda bu darrov bilinadi
  test('qahramon yorug‘ligi rasm ICHIDA',
    /\.qahramon-rasm::after\{content:'';position:absolute;inset:auto 0 0 0/.test(uyCss));
  test('skaner nuri ham qirqiladi',
    /\.skan-bolim\{background:var\(--qora\);overflow:hidden/.test(uyCss));

  // «Sayt rasmni yuqoriga joylab» — plakat sahifaning eng tepasida
  test('plakat matndan OLDIN turadi',
    bosh.indexOf('qahramon-rasm') < bosh.indexOf('qahramon-matn'));
  test('keng ekranda esa matn chapga o‘tadi',
    /\.qahramon-matn\{order:-1\}/.test(uyCss));

  // Skaner bo'limida natija ekranining rasmi
  test('skaner natijasi rasmi joylandi', /<img src="\/uy\/skaner\.jpg"/.test(bosh));
  test('skaner rasmi bor va yengil',
    fs.existsSync('public/uy/skaner.jpg')
      && fs.statSync('public/uy/skaner.jpg').size < 400 * 1024,
    `${(fs.statSync('public/uy/skaner.jpg').size / 1024).toFixed(0)} KB`);

  // ── Animatsiya ──
  test('bir xil harakat — pastdan ko‘tarilish', /@keyframes kotaril/.test(uyCss));
  test('qahramon JS ni KUTMAYDI — birinchi ekran darrov jonlanadi',
    /\.qahramon \.jon\{animation:kotaril/.test(uyCss));
  test('qolgani ekranga kirganda', /IntersectionObserver/.test(uyJs));
  // Kuzatuvchi hodisani o'tkazib yuborsa blok BUTUNLAY ko'rinmay
  // qolardi — reklama sahifasi uchun bu falokat
  test('kuzatuvchi o‘tkazib yuborsa ham ochiladi',
    /function surilganda/.test(uyJs) && /engPast/.test(uyJs));
  test('o‘tib ketilgan blok tepaga qaytganda ham ochiq qoladi',
    /const chegara = engPast \+ window\.innerHeight/.test(uyJs));
  test('rasm yuklangach qayta tekshiriladi',
    /addEventListener\('load', surilganda/.test(uyJs));
  test('hammasi ochilgach tinglovchi o‘chadi',
    /removeEventListener\('scroll', surilganda\)/.test(uyJs));
  test('harakatni xohlamaganlarga animatsiya YO‘Q',
    /prefers-reduced-motion:reduce/.test(uyCss)
      && /\.jon,\.qahramon \.jon\{opacity:1!important/.test(uyCss));

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

// ═══════════ EKSPORT VA YANGI AGENT VOSITALARI ═══════════
console.log('\n── EKSPORT VA AGENT VOSITALARI ──');
{
  const V = await import('../src/services/admin-vositalar.js');
  const E = await import('../src/services/eksport.js');

  // ── Muammo statistikasi: «nimani olib kelaylik» degan savolga javob
  const st = await V.vositaniBajar('muammo_statistikasi', { kun: 3650 });
  test('muammo statistikasi keladi', Array.isArray(st.eng_kop_muammolar),
    `${st.eng_kop_muammolar?.length} ta muammo`);
  test('teri turlari ham bor', Array.isArray(st.teri_turlari));
  test('jins taqsimoti bor', Array.isArray(st.jins));
  test('umumiy raqamlar bor', typeof st.umumiy?.tahlil === 'number',
    JSON.stringify(st.umumiy));

  // ── Sozlamalar
  const sz = await V.vositaniBajar('sozlamalar', { qidiruv: 'limit' });
  test('sozlamalar qidiruv bilan keladi', sz.sozlamalar.length > 0,
    sz.sozlamalar.map((x) => x.kalit).join(', ').slice(0, 90));
  test('qaysisini o‘zgartirsa bo‘lishi ko‘rsatiladi',
    sz.sozlamalar.some((x) => x.ozgartirsa_boladi === true));

  const oz = await V.vositaniBajar('sozlama_ozgartir',
    { kalit: 'limit_maslahat_rasm', qiymat: '5' });
  test('ruxsat etilgan sozlama o‘zgardi', oz.ozgardi === 1 && oz.qiymat === 5,
    JSON.stringify(oz));
  test('raqam RAQAM bo‘lib saqlanadi',
    (await qiymat(`select value::text from settings where key='limit_maslahat_rasm'`)) === '5');
  await sorov(`update settings set value='3'::jsonb where key='limit_maslahat_rasm'`);

  // TUZILMALI sozlama (obyekt) bu vosita orqali o'zgarmaydi —
  // uni matn bilan almashtirish ilovani jimgina buzardi
  const man = await V.vositaniBajar('sozlama_ozgartir', { kalit: 'narx_qoidasi', qiymat: 'x' });
  test('TUZILMALI sozlama bu vosita orqali o‘zgarmaydi', man.ozgardi === 0, man.xabar);
  const mv2 = await V.vositaniBajar('sozlama_ozgartir', { kalit: 'mavzu', qiymat: 'qizil' });
  test('mavzu o‘z vositasiga yo‘naltiriladi', mv2.ozgardi === 0 && /mavzu_ozgartir/.test(mv2.xabar),
    mv2.xabar);

  // Ro'yxat endi QAT'IY EMAS: bazada bor har qanday oddiy sozlama
  // o'zgaradi. Shikoyat aynan shu edi — «sozlamalarni to'liq
  // boshqara olsin, imkoniyati cheklanmasin».
  const bor = (await V.vositaniBajar('sozlamalar', { qidiruv: 'menejer' })).sozlamalar[0];
  test('ro‘yxatda bo‘lmagan sozlama ham o‘zgartirsa bo‘ladi deb belgilanadi',
    bor?.ozgartirsa_boladi === true, JSON.stringify(bor));
  const eskiTel = await qiymat(`select value#>>'{}' from settings where key='menejer_telefon'`);
  const tel = await V.vositaniBajar('sozlama_ozgartir',
    { kalit: 'menejer_telefon', qiymat: '+998901234567' });
  test('matnli sozlama o‘zgaradi', tel.ozgardi === 1 && tel.qiymat === '+998901234567',
    JSON.stringify(tel));
  test('oldingi qiymat ham qaytariladi', tel.oldingi === eskiTel, String(tel.oldingi));
  await sorov(`update settings set value = $1::jsonb where key='menejer_telefon'`,
    [JSON.stringify(eskiTel)]);

  // Yangi kalit YARATIB bo'lmaydi: bitta xato harf o'lik sozlama qoldiradi
  const xatoKalit = await V.vositaniBajar('sozlama_ozgartir',
    { kalit: 'limit_bepull', qiymat: 5 });
  test('YO‘Q kalitga yozilmaydi', xatoKalit.ozgardi === 0, xatoKalit.xabar);
  // Tur ham saqlanadi: raqamli sozlamaga matn tushmasin
  const notoTur = await V.vositaniBajar('sozlama_ozgartir',
    { kalit: 'limit_bepul', qiymat: 'juda ko‘p' });
  test('raqamli sozlamaga matn yozilmaydi', notoTur.ozgardi === 0, notoTur.xabar);

  // ── Mavzu: kontrast HISOBLANADI, taxmin qilinmaydi
  const mv = await V.vositaniBajar('mavzu', {});
  test('mavzu ranglari keladi', Boolean(mv.umumiy?.ranglar?.asosiy), mv.umumiy?.ranglar?.asosiy);
  test('kontrast raqam bilan', typeof mv.umumiy?.sarlavha_kontrasti === 'number',
    String(mv.umumiy?.sarlavha_kontrasti));
  test('o‘qiladimi degan xulosa bor', typeof mv.umumiy?.sarlavha_okiladi === 'boolean');

  const { kontrast } = await import('../src/lib/mavzu.js');
  test('oq/qora kontrasti 21', Math.round(kontrast('#ffffff', '#000000')) === 21);
  test('bir xil rangda kontrast 1', Math.round(kontrast('#123456', '#123456')) === 1);

  const mo = await V.vositaniBajar('mavzu_ozgartir',
    { asosiy: '#123A63', fon: '#E7F0F7', urgu: '#1D6FA5', kim: 'erkak' });
  test('erkaklar mavzusi o‘zgardi', mo.ozgardi === 1 && mo.kim === 'mavzu_erkak', mo.kim);
  await sorov(`delete from settings where key = 'mavzu_erkak'`);

  // ── Mahsulotni tahrirlash
  const m1 = (await V.vositaniBajar('mahsulotlar', { chegara: 1 })).mahsulotlar[0];
  const th = await V.vositaniBajar('mahsulot_tahrir',
    { id: m1.id, nom_uz: 'Sinov o‘zbekcha', price: '77000' });
  test('mahsulot tahrirlandi', th.ozgardi === 1 && th.mahsulot.price === 77000,
    JSON.stringify(th.mahsulot).slice(0, 90));
  test('faqat berilgan maydon o‘zgardi', th.mahsulot.name === m1.name);
  await sorov(`update products set nom_uz = null, price = $2 where id = $1`, [m1.id, m1.price]);

  const bosh2 = await V.vositaniBajar('mahsulot_tahrir', { id: m1.id });
  test('maydonsiz tahrir rad etiladi', bosh2.ozgardi === 0, bosh2.xabar);

  // ── EKSPORT
  const hajm = await V.vositaniBajar('eksport', {});
  test('eksport hajmi keladi', typeof hajm.hajm?.mahsulotlar === 'number',
    JSON.stringify(hajm.hajm));

  const yig = await E.eksportYig(['mahsulotlar', 'sozlamalar']);
  test('faqat tanlangan bo‘limlar', Object.keys(yig).sort().join() === '_haqida,mahsulotlar,sozlamalar',
    Object.keys(yig).join());
  test('mahsulotlar ichida bor', yig.mahsulotlar.length > 0, `${yig.mahsulotlar.length} ta`);
  test('faylda sana va ogohlantirish bor',
    Boolean(yig._haqida?.sana) && /telefon/i.test(yig._haqida?.ogohlantirish || ''));

  const hammasi = await E.eksportYig();
  test('bo‘limsiz chaqirilsa HAMMASI', Object.keys(hammasi).length >= 7,
    `${Object.keys(hammasi).length} ta kalit`);

  const csv = E.csvQil(yig.mahsulotlar.slice(0, 3));
  test('CSV sarlavhasi bor', csv.split('\n')[0].includes('name'), csv.split('\n')[0].slice(0, 60));
  test('CSV BOM bilan (Excel uchun)', csv.charCodeAt(0) === 0xFEFF);
  test('nuqta-vergul ajratgich', csv.split('\n')[0].split(';').length > 3);
  // Ichida `;` yoki qo'shtirnoq bo'lgan matn ustunni buzmasin
  const xavfli = E.csvQil([{ a: 'bir;ikki', b: 'u "dedi"', c: 'qator\nikki' }]);
  test('xavfli belgilar qo‘shtirnoqqa olinadi',
    xavfli.includes('"bir;ikki"') && xavfli.includes('"u ""dedi"""'),
    xavfli.split('\n')[1]);

  // ── API orqali
  const eks = await chaqirXom('/api/admin/eksport');
  test('JSON eksport API ishlaydi', eks.kod === 200, String(eks.kod));
  test('fayl nomi berilgan', /attachment; filename="kiovo-/.test(
    eks.sarlavhalar['Content-Disposition'] || ''), eks.sarlavhalar['Content-Disposition']);
  test('JSON o‘qiladi', Boolean(JSON.parse(eks.tana)._haqida));

  const csvApi = await chaqirXom('/api/admin/eksport?tur=csv&bolimlar=mahsulotlar');
  test('CSV eksport API ishlaydi', csvApi.kod === 200 && csvApi.tana.includes(';'),
    String(csvApi.kod));
  const yomonB = await chaqirXom('/api/admin/eksport?tur=csv&bolimlar=yoq');
  test('noto‘g‘ri bo‘lim rad etiladi', yomonB.kod === 400, String(yomonB.kod));
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
  // ── ASOSIY SABAB ──
  // Bo'lim ochilishida `transform` li animatsiya bor edi. Ota-elementda
  // transform ishlatilsa (animatsiya davomida ham) ichidagi
  // `position:fixed` element EKRANGA emas, o'sha ota-elementga
  // nisbatan joylashadi. Panel bo'lim qutisining o'rtasida paydo
  // bo'lib, animatsiya tugagach pastga sakrardi.
  // Brauzerda o'lchandi: transform bilan 429 → 696, transformsiz 696.
  test('MASLAHAT bo‘limi transformsiz ochiladi',
    /#tab-maslahat\.ekran:not\(\.yashirin\)\{animation:ekran-kir-shaffof/.test(css));
  test('shaffoflik animatsiyasida transform YO‘Q',
    /@keyframes ekran-kir-shaffof\{from\{opacity:0\}to\{opacity:1\}\}/.test(css));
  test('panelga ortiqcha animatsiya qo‘yilmagan',
    !/\.yozish\{animation:/.test(css));

  // ── Ekranga qo'shish: ikki xil yorliq ──
  // Telegram ichidan qo'shilgan yorliq HAR DOIM Telegramni ochadi —
  // bu Telegram API sining ishlash usuli, sozlab bo'lmaydi.
  test('Telegram ichida TANLOV beriladi',
    js.includes('Haqiqiy ilova') && js.includes('Telegram yorlig‘i'));
  test('jimgina Telegram yorlig‘i yasalmaydi',
    !/if \(tg\?\.addToHomeScreen\) \{\s*try \{ tg\.addToHomeScreen\(\); return;/.test(js));
  test('Telegram yorlig‘i nima qilishi ochiq aytiladi',
    js.includes('Telegram ochiladi'));
  test('brauzer havolasi ko‘rsatiladi va nusxalanadi',
    js.includes('clipboard.writeText') && js.includes('ornat-havola'));
  test('nusxa olinmasa havola belgilanadi', js.includes('selectNodeContents'));
  test('izoh ichidagi qalin so‘z matnni buzmaydi',
    /\.ornat-tanlov > b\{display:block/.test(css));
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

  // JONLI JARAYON: «nima qilayotgani ko'rinsin»
  test('javob FONDA kutiladi, so‘rov osilib qolmaydi',
    /agentniKuzat\(ish\)/.test(js) && /const \{ ish \} = await api\('\/api\/admin\/agent'/.test(js));
  test('holat so‘rab turiladi', /agent-holat\?ish=/.test(js));
  test('joriy qadam kutish pufagida ko‘rsatiladi',
    /kutish\.joriy = h\.joriy\?\.matn/.test(js) && /y-jarayon-bosh/.test(js));
  test('bajarilgan qadamlar ham ko‘rinib turadi', /y-jarayon-oqim/.test(js));
  test('tarmoq uzilsa qayta so‘raladi', /if \(\/topilmadi\/i\.test\(e\.message\)\) throw e/.test(js));
  test('cheksiz kutib qolmaydi', /6 \* 60_000/.test(js));
  test('jarayon uslubi bor', /\.y-jarayon-bosh\{/.test(css) && /\.y-jarayon-oqim\{/.test(css));
  // Tasdiq kartasi: son noma'lum bo'lsa shuni AYTADI, «1 ta» deb aldamaydi
  test('noma’lum son yashirilmaydi', /nechta ekani noma’lum/.test(js));
}

// ═══════════ BAZAGA TO'LIQ KIRISH (SQL) ═══════════
// Shikoyat: «hamma ma'lumotga to'liq kirolmayapti». Tayyor vositalar
// ro'yxati hech qachon yetarli bo'lmaydi — endi agent SQL yoza oladi.
// Lekin o'qish so'rovi HAQIQIY read-only tranzaksiyada bajariladi:
// bu satr tekshiruvi emas, bazaning o'z kafolati.
console.log('\n── SQL: TO‘LIQ KIRISH VA CHEGARALAR ──');
{
  const S = await import('../src/services/admin-sql.js');
  const V = await import('../src/services/admin-vositalar.js');

  const o = await S.sqlOqi('select id, name, price from products order by id limit 3');
  test('SELECT ishlaydi', o.qatorlar?.length > 0 && !o.xato,
    `${o.qatorlar?.length} qator, ustunlar: ${o.ustunlar?.join(',')}`);
  test('ustun nomlari qaytadi', (o.ustunlar || []).includes('price'), o.ustunlar?.join(','));

  const hisob = await S.sqlOqi(
    `select c.name, count(p.id)::int as soni
       from categories c left join products p on p.category_id = c.id
      group by c.name order by soni desc`);
  test('birlashma va guruhlash ishlaydi', hisob.qatorlar?.length > 0 && !hisob.xato,
    hisob.xato || `${hisob.qatorlar?.length} bo‘lim`);

  // ENG MUHIMI: o'qish so'rovi ichiga yashirilgan yozish ham o'tmaydi.
  // `with ... update ... returning` SELECT bo'lib boshlanadi, satr
  // tekshiruvidan o'tadi — lekin BAZA uni rad etadi.
  const oldingi = await qiymat(`select price::text from products order by id limit 1`);
  const yashirin = await S.sqlOqi(
    `with x as (update products set price = 1 returning id) select count(*) from x`);
  test('YASHIRIN yozish bazaning o‘zi tomonidan rad etiladi',
    /read-only|read only/i.test(yashirin.xato || ''), yashirin.xato);
  test('narx haqiqatan o‘zgarmadi',
    (await qiymat(`select price::text from products order by id limit 1`)) === oldingi,
    `${oldingi} → ${await qiymat(`select price::text from products order by id limit 1`)}`);

  const upd = await S.sqlOqi('update products set price = 1');
  test('o‘qish vositasiga UPDATE berilmaydi', /faqat SELECT/i.test(upd.xato || ''), upd.xato);

  const ikki = await S.sqlOqi('select 1; select 2');
  test('ikkita buyruq rad etiladi', /BITTA buyruq/i.test(ikki.xato || ''), ikki.xato);
  const izohli = await S.sqlOqi('select 1 -- ; select 2');
  test('izoh ichidagi nuqta-vergul xalaqit bermaydi', !izohli.xato, izohli.xato);

  // «drop» so'zi ataylab bo'lakka bo'lib yozilgan: bu satr faylni
  // o'qiydigan vositalar uchun haqiqiy buyruqqa o'xshamasin
  const buzuq = `${['d', 'rop'].join('')} table products`;
  const b1 = await S.sqlYoz(buzuq);
  test('SXEMANI buzadigan buyruq YOZISHDA ham rad etiladi',
    /taqiqlangan/i.test(b1.xabar || ''), b1.xabar);
  test('jadval joyida turibdi', (await qiymat(`select count(*)::text from products`)) !== null);

  const b2 = await S.sqlYoz('alter table products add column x int');
  test('ALTER rad etiladi', /taqiqlangan/i.test(b2.xabar || ''), b2.xabar);
  const b3 = await S.sqlOqi('select pg_sleep(30)');
  test('xavfli funksiya rad etiladi', /taqiqlangan/i.test(b3.xato || ''), b3.xato);
  const b4 = await S.sqlYoz('select 1');
  test('yozish vositasiga SELECT berilmaydi', /INSERT, UPDATE/i.test(b4.xabar || ''), b4.xabar);

  // YOZISH esa haqiqatan ishlaydi — tasdiqdan keyin
  await sorov(`insert into products (name, brand, price, cost_price, stock, is_active)
    values ('SQL sinov mahsuloti','SQLTEST',10000,5000,1,true)`);
  const yoz = await S.sqlYoz(`update products set stock = 7 where brand = 'SQLTEST'`);
  test('YOZISH so‘rovi bajariladi va soni qaytadi', yoz.ozgardi === 1, JSON.stringify(yoz));
  test('baza haqiqatan o‘zgardi',
    (await qiymat(`select stock::text from products where brand='SQLTEST'`)) === '7');

  // Sxema: model ustun nomini TAXMIN qilmasin
  const sx = await V.vositaniBajar('sxema', {});
  const mahsulot = sx.jadvallar.find((j) => j.jadval === 'products');
  test('sxemada products jadvali bor', Boolean(mahsulot), `${sx.jadvallar.length} ta jadval`);
  test('ustun nomi va turi ko‘rsatiladi',
    mahsulot.ustunlar.some((u) => /^price /.test(u)),
    mahsulot.ustunlar.slice(0, 4).join(', '));
  test('buyurtmalar jadvali ham bor', sx.jadvallar.some((j) => j.jadval === 'orders'));
}

// ═══════════ OMMAVIY NARX O'ZGARTIRISH ═══════════
// Shikoyat: «narx o'zgartir dedim ammo narxlar o'sha-o'sha turaveryapti».
// Sabab: yagona narx vositasi BITTA id talab qilardi. Agent nom
// bo'yicha so'rasa hech nima o'zgarmasdi va sababi ko'rinmasdi.
console.log('\n── OMMAVIY NARX O‘ZGARTIRISH ──');
{
  const V = await import('../src/services/admin-vositalar.js');
  const A = await import('../src/services/admin-agent.js');
  A.rejalarniTozala();

  await sorov(`delete from products where brand = 'NARXTEST'`);
  await sorov(`insert into products (name, brand, price, cost_price, stock, is_active)
    values ('Narx sinov A','NARXTEST',10000,4000,5,true),
           ('Narx sinov B','NARXTEST',20000,8000,5,true)`);
  const narxlar = async () => (await qatorlar(
    `select price from products where brand='NARXTEST' order by price`)).map((x) => x.price);

  const f = await V.vositaniBajar('narxlarni_ozgartir', { brend: 'NARXTEST', foiz: 10 });
  test('FOIZ bilan ko‘tarish ishlaydi', f.ozgardi === 2, JSON.stringify(f).slice(0, 100));
  test('narx haqiqatan ko‘tarildi', JSON.stringify(await narxlar()) === '[11000,22000]',
    JSON.stringify(await narxlar()));

  const qo = await V.vositaniBajar('narxlarni_ozgartir', { brend: 'NARXTEST', qoshish: -1000 });
  test('SUMMA qo‘shish (yoki ayirish) ishlaydi', qo.ozgardi === 2);
  test('yangi narxlar to‘g‘ri', JSON.stringify(await narxlar()) === '[10000,21000]',
    JSON.stringify(await narxlar()));

  const an = await V.vositaniBajar('narxlarni_ozgartir',
    { qidiruv: 'Narx sinov', narx: 55000 });
  test('NOM bo‘yicha aniq narx qo‘yiladi', an.ozgardi === 2, JSON.stringify(an).slice(0, 80));
  test('ikkalasi ham 55000 bo‘ldi', JSON.stringify(await narxlar()) === '[55000,55000]',
    JSON.stringify(await narxlar()));

  // Butun katalogni tasodifan o'zgartirib qo'ymaslik uchun
  const filtrsiz = await V.vositaniBajar('narxlarni_ozgartir', { narx: 1000 });
  test('FILTRSIZ chaqiruv bajarilmaydi', filtrsiz.ozgardi === 0, filtrsiz.xabar);
  test('sababi aytiladi', /hammasi=true/.test(filtrsiz.xabar || ''), filtrsiz.xabar);
  const amalsiz = await V.vositaniBajar('narxlarni_ozgartir', { brend: 'NARXTEST' });
  test('nima qilish kerakligi aytilmasa bajarilmaydi', amalsiz.ozgardi === 0, amalsiz.xabar);
  const yoqBolim = await V.vositaniBajar('narxlarni_ozgartir',
    { bolim: 'Bunday bo‘lim yo‘q', narx: 1 });
  test('yo‘q bo‘lim uchun sabab qaytadi', /bo‘lim yo‘q/.test(yoqBolim.xabar || ''),
    yoqBolim.xabar);

  // ── Tasdiq kartasidagi SON haqiqiy bo'lsin ──
  test('oldindan sanash: brend bo‘yicha 2 ta',
    (await V.oldindanSoni('narxlarni_ozgartir', { brend: 'NARXTEST' })) === 2);
  test('oldindan sanash: filtrsiz 0',
    (await V.oldindanSoni('narxlarni_ozgartir', {})) === 0);
  test('xom SQL uchun son noma’lum deb qaytadi',
    (await V.oldindanSoni('sql_yoz', { sql: 'update products set price = 1' })) === null);
  test('id lar berilsa shuncha', (await V.oldindanSoni('mahsulot_yop', { idlar: [1, 2, 3] })) === 3);

  // ── AGENT ORQALI: aynan shikoyat qilingan yo'l ──
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'NARXTEST brendini topaman', amal: 'vosita', vosita: 'mahsulotlar',
      argumentlar_json: '{"brend":"NARXTEST"}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Narxni ko‘taraman', amal: 'vosita', vosita: 'narxlarni_ozgartir',
      argumentlar_json: '{"brend":"NARXTEST","narx":99000}',
      javob: 'NARXTEST narxini o‘zgartirishni taklif qilaman.',
      reja_izoh: 'NARXTEST brendidagi mahsulotlar narxi 99 000 so‘m bo‘ladi.',
      takliflar: [] },
  ];
  const nr = await agentSora({ savol: 'NARXTEST narxini 99000 qil' });
  test('agent narx rejasini qaytardi', nr.tana.reja?.qadamlar?.[0]?.vosita === 'narxlarni_ozgartir',
    JSON.stringify(nr.tana.reja?.qadamlar));
  test('rejada HAQIQIY son ko‘rsatiladi', nr.tana.reja?.soni === 2,
    `soni: ${nr.tana.reja?.soni}`);
  test('tasdiqqacha narx o‘zgarmaydi',
    JSON.stringify(await narxlar()) === '[55000,55000]', JSON.stringify(await narxlar()));

  const tas = await chaqirAdmin('/api/admin/agent-tasdiq', 'POST',
    { token: nr.tana.reja.token });
  test('tasdiqdan keyin BAJARILDI', tas.tana.ozgardi === 2, JSON.stringify(tas.tana).slice(0, 120));
  test('narxlar HAQIQATAN o‘zgardi', JSON.stringify(await narxlar()) === '[99000,99000]',
    JSON.stringify(await narxlar()));

  await sorov(`delete from products where brand in ('NARXTEST','SQLTEST')`);
}

// ═══════════ JONLI JARAYON (agent nima qilayotgani ko'rinadi) ═══════════
// Shikoyat: «nima qilayotgani ham menga ko'rinsin». Ilgari HTTP
// so'rovi 10-30 soniya osilib turar, admin faqat aylanayotgan
// nuqtalarni ko'rardi. Endi ish fonda ketadi, panel esa holatini
// so'rab turadi.
console.log('\n── JONLI JARAYON ──');
{
  const A = await import('../src/services/admin-agent.js');
  A.ishlarniTozala();

  const id = A.ishBoshla();
  test('ish raqami beriladi', typeof id === 'string' && id.length > 6, id);
  test('boshida holat «ishlamoqda»', A.ishHolati(id).holat === 'ishlamoqda');

  A.ishYangila(id, { qadam: 1, holat: 'oylayapti', matn: 'O‘ylayapti…' });
  test('o‘ylash bosqichi ko‘rinadi', A.ishHolati(id).joriy?.matn === 'O‘ylayapti…');
  test('o‘ylash QADAM sifatida yozilmaydi', A.ishHolati(id).qadamlar.length === 0);

  A.ishYangila(id, { qadam: 2, holat: 'ishlayapti', vosita: 'mahsulotlar',
    matn: 'Katalogni o‘qiyapman' });
  const h1 = A.ishHolati(id);
  test('qaysi ish ustida ekani ko‘rinadi', h1.joriy?.matn === 'Katalogni o‘qiyapman',
    h1.joriy?.matn);
  test('bajarilgan qadam tarixga yoziladi',
    h1.qadamlar.length === 1 && h1.qadamlar[0].vosita === 'mahsulotlar',
    JSON.stringify(h1.qadamlar));

  A.ishTugat(id, { natija: { javob: 'Tayyor' } });
  const h2 = A.ishHolati(id);
  test('tugagach natija beriladi', h2.holat === 'tayyor' && h2.natija.javob === 'Tayyor');
  test('natija BIR MARTA olinadi — xotira to‘lmaydi', A.ishHolati(id) === null);

  const xatoli = A.ishBoshla();
  A.ishTugat(xatoli, { xato: 'AI kaliti yo‘q' });
  test('xato ham holat orqali yetkaziladi', A.ishHolati(xatoli).holat === 'xato');

  // ── API orqali ──
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Katalogni o‘qiyapman', amal: 'vosita', vosita: 'mahsulotlar',
      argumentlar_json: '{"chegara":3}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Tayyor', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Do‘konda mahsulotlar bor.', reja_izoh: '', takliflar: [] },
  ];
  const boshla = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'Nima bor?' });
  test('so‘rov DARROV ish raqami bilan qaytadi',
    boshla.kod === 200 && typeof boshla.tana.ish === 'string' && !boshla.tana.javob,
    JSON.stringify(boshla.tana));

  let oxirgi = null;
  for (let i = 0; i < 400; i++) {
    const h = await chaqirAdmin(`/api/admin/agent-holat?ish=${boshla.tana.ish}`, 'GET');
    oxirgi = h.tana;
    if (h.tana.holat !== 'ishlamoqda') break;
    await new Promise((r) => setTimeout(r, 5));
  }
  test('holat so‘rovi javobni yetkazadi', oxirgi?.holat === 'tayyor', oxirgi?.holat);
  test('bajarilgan qadamlar ko‘rinadi',
    (oxirgi?.qadamlar || []).some((q) => q.vosita === 'mahsulotlar'),
    JSON.stringify(oxirgi?.qadamlar));
  test('model FIKRI adminga ko‘rsatiladi',
    (oxirgi?.qadamlar || []).some((q) => /o‘qiyapman/i.test(q.matn || '')),
    JSON.stringify(oxirgi?.qadamlar));

  const yoq = await chaqirAdmin('/api/admin/agent-holat?ish=yoq-bunday', 'GET');
  test('noma’lum ish uchun 404', yoq.kod === 404, String(yoq.kod));

  // ── ISH DAVOM ETAYOTGANDA nima ko'rinadi ──
  // Eng muhim savol shu: agent hali ishlayotganda admin uning
  // qadamini KO'RADIMI? Buni ushlash uchun AI ataylab sekinlashtiriladi.
  globalThis.AI_KECHIKISH = 200;
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Buyurtmalarni sanayapman', amal: 'vosita', vosita: 'statistika',
      argumentlar_json: '{"kun":30}', javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Tayyor', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Hisobot tayyor.', reja_izoh: '', takliflar: [] },
  ];
  const sekin = await chaqirAdmin('/api/admin/agent', 'POST', { savol: 'Hisobot ber' });
  await new Promise((r) => setTimeout(r, 60));
  const orada = await chaqirAdmin(`/api/admin/agent-holat?ish=${sekin.tana.ish}`, 'GET');
  test('ish DAVOM ETAYOTGANDA holat so‘ralsa ishlamoqda deydi',
    orada.tana.holat === 'ishlamoqda', orada.tana.holat);
  test('o‘sha payt NIMA qilayotgani ko‘rinadi',
    (orada.tana.joriy?.matn || '').length > 3, JSON.stringify(orada.tana.joriy));
  globalThis.AI_KECHIKISH = 0;
  for (let i = 0; i < 400; i++) {
    const h = await chaqirAdmin(`/api/admin/agent-holat?ish=${sekin.tana.ish}`, 'GET');
    if (h.tana.holat === 'tayyor') {
      test('sekin ish ham oxirida javob beradi', h.tana.natija?.javob === 'Hisobot tayyor.',
        h.tana.natija?.javob);
      break;
    }
    if (h.kod === 404) { test('sekin ish ham oxirida javob beradi', false, '404'); break; }
    await new Promise((r) => setTimeout(r, 20));
  }
}

// ═══════════ GRAFIK VA DIAGRAMMA ═══════════
// Shikoyat: «vizual yozishi ham ancha kuchli bo'lishi kerak,
// diagramma va grafiklar ham qila olishi kerak».
console.log('\n── GRAFIK ──');
{
  const V = await import('../src/services/admin-vositalar.js');
  const fs = await import('node:fs');

  const g = await V.vositaniBajar('grafik', { tur: 'ustun', sarlavha: 'Sotuv',
    birlik: 'ta', qatorlar: [{ nom: 'Tozalash', qiymat: 12 }, { nom: 'Maska', qiymat: 5 }] });
  test('grafik tuziladi', g.grafik?.tur === 'ustun' && g.grafik.qatorlar.length === 2,
    JSON.stringify(g.grafik).slice(0, 90));
  test('sarlavha va birlik saqlanadi', g.grafik.sarlavha === 'Sotuv' && g.grafik.birlik === 'ta');

  const oz = await V.vositaniBajar('grafik', { qatorlar: [{ nom: 'Bitta', qiymat: 1 }] });
  test('bitta qator bilan grafik chizilmaydi', /kamida 2/.test(oz.xato || ''), oz.xato);
  const manfiy = await V.vositaniBajar('grafik', { tur: 'halqa',
    qatorlar: [{ nom: 'a', qiymat: -5 }, { nom: 'b', qiymat: 5 }] });
  test('halqada manfiy ulush rad etiladi', /manfiy/.test(manfiy.xato || ''), manfiy.xato);
  const iflos = await V.vositaniBajar('grafik', { tur: 'chiziq', qatorlar: [
    { nom: 'a', qiymat: 3 }, { nom: '', qiymat: 9 }, { nom: 'c', qiymat: 'yoq' },
    { nom: 'd', qiymat: 4 }] });
  test('noto‘g‘ri qatorlar tashlanadi', iflos.grafik?.qatorlar.length === 2,
    JSON.stringify(iflos.grafik?.qatorlar));

  // Agent javobi bilan birga keladi
  globalThis.AGENT_QADAMLAR = [
    { fikr: 'Bo‘limlarni sanayapman', amal: 'vosita', vosita: 'grafik',
      argumentlar_json: JSON.stringify({ tur: 'halqa', sarlavha: 'Ulush',
        qatorlar: [{ nom: 'A', qiymat: 7 }, { nom: 'B', qiymat: 3 }] }),
      javob: '', reja_izoh: '', takliflar: [] },
    { fikr: 'Tayyor', amal: 'javob', vosita: '', argumentlar_json: '{}',
      javob: 'Ulushlar grafikda.', reja_izoh: '', takliflar: [] },
  ];
  const gj = await agentSora({ savol: 'Ulushni grafikda ko‘rsat' });
  test('grafik javob bilan qaytadi', gj.tana.grafiklar?.length === 1,
    JSON.stringify(gj.tana.grafiklar).slice(0, 90));
  test('grafik turi saqlanadi', gj.tana.grafiklar?.[0]?.tur === 'halqa');

  // ── Panel uni CHIZADI ──
  const js  = fs.readFileSync('public/admin/admin.js', 'utf8');
  const css = fs.readFileSync('public/admin/style.css', 'utf8');
  test('panelda grafik chizuvchi bor', /function grafikHtml/.test(js));
  test('javob ichida grafiklar chiziladi', /x\.grafiklar \|\| \[\]\)\.map\(grafikHtml/.test(js));
  test('uchala shakl ham bor',
    /function gUstun/.test(js) && /function gChiziq/.test(js) && /function gHalqa/.test(js));
  // Rangni ko'rmaydigan odam ham o'qiy olsin
  test('har grafik ostida JADVAL ko‘rinishi bor', /Jadval ko‘rinishi/.test(js));
  test('halqada nom va foiz YOZILADI — faqat rang emas',
    /\$\{Math\.round\(\(x\.qiymat \/ jami\) \* 100\)\}%/.test(js));
  test('ranglar tungi rejimda alohida tanlangan',
    /--g-1:#2a78d6/.test(css) && /--g-1:#3987e5/.test(css));
  test('grafik ranglari ketma-ketligi qat‘iy', /\.g-bolak\.r0[\s\S]{0,40}--g-1/.test(css));
}

// ═══════════ NATIJA KARTOCHKASI: JOYLASHUV, PARHEZ, SOZLAMA ═══════════
// Uch shikoyat: beshinchi mahsulot pastga tushib qolardi; rasmda
// ovqatlanish tavsiyasi yo'q edi; kartochkani admin o'zi sozlay
// olmasdi.
console.log('\n── NATIJA KARTOCHKASI ──');
{
  const { natijaSvg } = await import('../src/rasm/natija-kartochka.js');
  const { kartochkaSozlamasi, kartochkaniQosh, KARTOCHKA_STANDART } =
    await import('../src/lib/kartochka.js');
  const V = await import('../src/services/admin-vositalar.js');

  const namunaTahlil = (qosh = {}) => ({
    taxminiy_yosh: '22-26', jins: 'erkak', teri_rangi: 'och bug‘doyrang',
    teri_turi: 'aralash', ball: 68, xulosa: 'Teri holati yaxshi, biroq akne izlari bor.',
    muammolar: [
      { nom: 'Akne izlari', foiz: 65, zona: 'yonoq', sabab: 'Yog‘ bezlari faol.', yechim: 'Salitsil kislotasi.' },
      { nom: 'Qizarish', foiz: 55, zona: 'iyak', sabab: 'O‘tgan akne.', yechim: 'Niatsinamid.' },
    ],
    prognoz: [{ muammo: 'Akne izlari', ehtimol: 70, muddat: '3-6 oy' }],
    parhez: {
      foydali: ['Yog‘li baliq (omega-3)', 'Yashil barglilar', 'Yong‘oq va urug‘lar'],
      cheklang: ['Shirin ichimlik', 'Oq non', 'Qovurilgan taom'],
      izoh: 'Miqdorini kamaytirish kifoya.',
    },
    ...qosh,
  });
  const tav = (n) => Array.from({ length: n }, (_, i) =>
    ({ bosqich: `Bosqich ${i + 1}`, nom: `Mahsulot nomi ${i + 1}` }));
  const chiz = (n, sozlama) => natijaSvg({ rasmBase64: null, tahlil: namunaTahlil(),
    tavsiyalar: tav(n), brend: 'KiOVO', sozlama });

  // ── Mahsulotlar BITTA qatorga sig'adi ──
  // Kartochka <rect> lari x koordinatalari bo'yicha guruhlanadi:
  // bitta qatorda bo'lsa y lari bir xil bo'ladi.
  const kartaY = (svg) => [...svg.matchAll(
    /<rect x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)" rx="18"/g)]
    .map((m) => ({ x: +m[1], y: +m[2], en: +m[3] }));

  for (const n of [3, 4, 5, 6]) {
    const kartalar = kartaY(chiz(n));
    // Oxirgi n ta — mahsulot kartalari (undan oldingilari belgi kartalari,
    // ular butun kenglikni egallaydi)
    const mahsulot = kartalar.filter((k) => k.en < 900).slice(-n);
    const qatorlar = new Set(mahsulot.map((k) => k.y));
    test(`${n} ta mahsulot BITTA qatorda`, qatorlar.size === 1 && mahsulot.length === n,
      `${mahsulot.length} ta karta, ${qatorlar.size} qator`);
  }
  // 7 ta berilsa 6 tasi ko'rsatiladi va BITTA qatorda qoladi:
  // ikkinchi qator kartochkani bejiz uzaytirardi
  {
    const mahsulot = kartaY(chiz(7)).filter((k) => k.en < 900);
    const oxirgi = mahsulot.slice(-6);
    test('7 ta berilsa ham bitta qator', new Set(oxirgi.map((k) => k.y)).size === 1,
      `${new Set(oxirgi.map((k) => k.y)).size} qator`);
    test('ortiqchasi tushirib qoldiriladi', oxirgi.every((k) => k.en < 200),
      String(oxirgi[0]?.en));
  }
  // Ko'p mahsulotda karta KICHRAYADI
  {
    const en = (n) => kartaY(chiz(n)).filter((k) => k.en < 900).slice(-n)[0].en;
    test('mahsulot ko‘paysa karta kichrayadi', en(6) < en(4) && en(4) < en(3),
      `3 ta: ${en(3)}px, 4 ta: ${en(4)}px, 6 ta: ${en(6)}px`);
    test('hammasi rasm kengligiga sig‘adi', en(6) * 6 + 10 * 5 <= 1000, String(en(6)));
  }

  // ── PARHEZ bo'limi ──
  const svg = chiz(5);
  test('ovqatlanish bo‘limi chiziladi', svg.includes('Ovqatlanish tavsiyasi'));
  test('foydali va cheklang panellari bor',
    svg.includes('Yeng') && svg.includes('Kamaytiring'));
  test('bandlar rasmga tushadi', svg.includes('Yog‘li baliq') && svg.includes('Shirin ichimlik'));
  // Qavs ichidagi izoh kartochkada YOZILMAYDI — u mayda matn bo'lib
  // ekranni to'ldirar va hech kim o'qimasdi
  test('bandning qavs ichidagi izohi tushirib qoldiriladi',
    !svg.includes('omega-3, yallig'), 'faqat nomi qoladi');
  const parhezsiz = natijaSvg({ rasmBase64: null, tahlil: namunaTahlil({ parhez: null }),
    tavsiyalar: tav(3), brend: 'KiOVO' });
  test('parhez yo‘q bo‘lsa bo‘lim ham yo‘q', !parhezsiz.includes('Ovqatlanish tavsiyasi'));

  // ── SOZLAMA: bloklar, sonlar, jins ──
  const st = kartochkaSozlamasi({});
  test('standart sozlamada hamma blok yoqilgan',
    Object.values(st.bloklar).every(Boolean), JSON.stringify(st.bloklar));
  test('standart sonlar', st.belgi_soni === 5 && st.mahsulot_soni === 8);

  const erkak = kartochkaSozlamasi(
    { bloklar: { parhez: true }, mahsulot_soni: 8, erkak: { bloklar: { parhez: false }, mahsulot_soni: 4 } },
    'erkak');
  const ayol = kartochkaSozlamasi(
    { bloklar: { parhez: true }, mahsulot_soni: 8, erkak: { bloklar: { parhez: false }, mahsulot_soni: 4 } },
    'ayol');
  test('ERKAK uchun alohida sozlama ishlaydi',
    erkak.bloklar.parhez === false && erkak.mahsulot_soni === 4, JSON.stringify(erkak.bloklar));
  test('AYOLga tegmaydi', ayol.bloklar.parhez === true && ayol.mahsulot_soni === 8);
  test('jins bo‘limida faqat FARQ yoziladi',
    erkak.bloklar.belgilar === true && erkak.sarlavha.parhez === KARTOCHKA_STANDART.sarlavha.parhez);

  const erkakSvg = natijaSvg({ rasmBase64: null, tahlil: namunaTahlil(), tavsiyalar: tav(5),
    brend: 'KiOVO', sozlama: erkak });
  test('erkak kartochkasida parhez CHIZILMAYDI', !erkakSvg.includes('Ovqatlanish tavsiyasi'));
  test('mahsulot soni cheklandi va qolgani aytiladi',
    erkakSvg.includes('va yana 1 ta mahsulot'), 'chegara 4');

  // Bloklarni o'chirish
  const yalang = kartochkaSozlamasi({ bloklar: {
    korsatkichlar: false, xulosa: false, belgilar: false, parhez: false } });
  const yalangSvg = natijaSvg({ rasmBase64: null, tahlil: namunaTahlil(), tavsiyalar: tav(3),
    brend: 'KiOVO', sozlama: yalang });
  test('xulosa o‘chirilsa chizilmaydi', !yalangSvg.includes('Teri holati yaxshi'));
  test('belgilar o‘chirilsa ro‘yxat yo‘q', !yalangSvg.includes('Akne izlari'));
  test('ko‘rsatkichlar o‘chirilsa katak qatori ham yo‘q', !yalangSvg.includes('/100'));
  test('mahsulotlar baribir qoladi', yalangSvg.includes('Mahsulot nomi 1'));

  // Sarlavha va izohni almashtirish
  const boshqa = kartochkaSozlamasi({
    sarlavha: { belgilar: 'Nimalar topildi', parhez: 'Ovqat' }, izoh: '', teg: 'KiOVO skaner' });
  const boshqaSvg = natijaSvg({ rasmBase64: null, tahlil: namunaTahlil(), tavsiyalar: tav(3),
    brend: 'KiOVO', sozlama: boshqa });
  test('sarlavha almashadi', boshqaSvg.includes('Nimalar topildi')
    && !boshqaSvg.includes('Suratda topilgan belgilar'));
  test('o‘ng yuqoridagi yozuv ham', boshqaSvg.includes('KiOVO skaner'));
  test('izoh bo‘sh bo‘lsa chizilmaydi', !boshqaSvg.includes('Bu tibbiy tashxis emas'));

  // Chegaralar: model o'ylab topgan qiymat kartochkani buzmasin
  const yomon = kartochkaSozlamasi({ belgi_soni: 999, mahsulot_soni: -4, izoh: 5, teg: null });
  test('haddan tashqari son cheklanadi', yomon.belgi_soni === 8 && yomon.mahsulot_soni === 0,
    `${yomon.belgi_soni} / ${yomon.mahsulot_soni}`);
  test('noto‘g‘ri turdagi qiymat standartga qaytadi',
    yomon.izoh === KARTOCHKA_STANDART.izoh && yomon.teg === KARTOCHKA_STANDART.teg);

  // ── Agent vositasi ──
  const kor = await V.vositaniBajar('kartochka', {});
  test('agent kartochkani O‘QIY oladi',
    Boolean(kor.hozirgi?.umumiy && kor.hozirgi.erkak && kor.hozirgi.ayol),
    Object.keys(kor.hozirgi || {}).join(', '));
  test('qanday bloklar borligi ham aytiladi', Boolean(kor.bloklar?.parhez));

  const oz = await V.vositaniBajar('kartochka_ozgartir',
    { kim: 'erkak', yashirilsin: ['parhez'], mahsulot_soni: 6 });
  test('agent ERKAK uchun o‘zgartira oladi', oz.ozgardi >= 2 && oz.kim === 'erkak',
    JSON.stringify(oz.ozgargan));
  test('o‘zgarish bazaga yozildi',
    (await V.vositaniBajar('kartochka', {})).hozirgi.erkak.bloklar.parhez === false);
  test('AYOL sozlamasiga tegmadi',
    (await V.vositaniBajar('kartochka', {})).hozirgi.ayol.bloklar.parhez === true);

  const yoq = await V.vositaniBajar('kartochka_ozgartir', { yashirilsin: ['bunday_blok_yoq'] });
  test('yo‘q blok rad etiladi', yoq.ozgardi === 0 && /Bunday blok yo‘q/.test(yoq.xabar || ''),
    yoq.xabar);
  const bosh = await V.vositaniBajar('kartochka_ozgartir', {});
  test('bo‘sh o‘zgartirish rad etiladi', bosh.ozgardi === 0, bosh.xabar);

  const ai = await V.vositaniBajar('kartochka_ozgartir',
    { ai_qoshimcha: 'Erkaklarda soqol olishdan keyingi qirilishga alohida e’tibor ber.' });
  test('tahlil AI siga ko‘rsatma qo‘shiladi', ai.ozgardi === 1, JSON.stringify(ai.ozgargan));
  test('ko‘rsatma jinsdan qat’i nazar bitta',
    (await V.vositaniBajar('kartochka', {})).hozirgi.erkak.ai_qoshimcha
      === (await V.vositaniBajar('kartochka', {})).hozirgi.ayol.ai_qoshimcha);

  // ── Qo'shimcha ko'rsatma HAQIQATAN modelga yetib boradimi ──
  const { yuzniTahlilQil } = await import('../src/ai/faceAnalysis.js');
  const mahsulotlarRoyxati = await qatorlar(
    `select id, name, nom_uz, brand, step, concerns, skin_types, actives, stock
       from products where is_active limit 20`);
  globalThis.OXIRGI_TAHLIL_PROMPT = '';
  await yuzniTahlilQil('c29tZQ==', 'image/jpeg', mahsulotlarRoyxati, [],
    'Soqol olishdan keyingi qirilishga alohida e’tibor ber.');
  test('do‘kon egasining ko‘rsatmasi promptga tushadi',
    /Soqol olishdan keyingi qirilishga/.test(globalThis.OXIRGI_TAHLIL_PROMPT || ''),
    `${(globalThis.OXIRGI_TAHLIL_PROMPT || '').length} belgi`);
  test('u KATALOGDAN OLDIN qo‘yiladi',
    globalThis.OXIRGI_TAHLIL_PROMPT.indexOf('Soqol olishdan')
      < globalThis.OXIRGI_TAHLIL_PROMPT.indexOf('KATALOG ('),
    'katalogdan keyin yozilgan gap modelning ko‘zidan qochadi');
  test('asosiy qoidalar joyida qoladi',
    /IKKILANSANG — RAD ET/.test(globalThis.OXIRGI_TAHLIL_PROMPT));

  // ── Parhez javobi tozalanadi ──
  const n = await yuzniTahlilQil('c29tZQ==', 'image/jpeg', mahsulotlarRoyxati, []);
  test('parhez tahlil natijasiga tushadi',
    n.natija?.parhez?.foydali?.length === 3, JSON.stringify(n.natija?.parhez?.foydali));
  test('DORI haqidagi band tashlanadi',
    n.natija.parhez.cheklang.length === 2
      && !n.natija.parhez.cheklang.some((x) => /dori/i.test(x)),
    JSON.stringify(n.natija.parhez.cheklang));

  // kartochkaniQosh: faqat TANISH kalitlar o'tadi
  const { sozlama: yangi } = kartochkaniQosh({}, { belgi_soni: 3, axlat: 'kerakmas' }, 'umumiy');
  test('begona kalit sozlamaga tushmaydi', yangi.axlat === undefined && yangi.belgi_soni === 3,
    JSON.stringify(yangi));
}

// ═══════════ KAMERA VA KADR SIFATI ═══════════
// Shikoyat: «kamera veb-kamera bo'lmasin, negadir xira oladi» va
// «skanerlayotganda yuz ustida chiziqlar chiqib tiniqlikni o'lchasin».
//
// O'lchov matematikasi (public/app/sifat.js) DOM siz yozilgan —
// shuning uchun uni shu yerda oddiy massiv bilan sinash mumkin.
console.log('\n── KADR SIFATI (SKANER) ──');
{
  const fs = await import('node:fs');
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync('public/app/sifat.js', 'utf8'), ctx);
  const S = ctx.Sifat;

  const EN = 200, BOY = 260;
  /** Sun'iy kadr: to'q fon + teri rangidagi oval + mayda tekstura. */
  function kadr({ yuz = 1, yoruglik = 1, tekstura = true, teri = true } = {}) {
    const d = new Uint8ClampedArray(EN * BOY * 4);
    const rx = 62 * yuz, ry = 82 * yuz, cx = EN / 2, cy = BOY / 2;
    for (let y = 0; y < BOY; y++) {
      for (let x = 0; x < EN; x++) {
        const p = (y * EN + x) * 4;
        const ichida = teri
          && ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1;
        let r, g, b;
        if (ichida) {
          // Teri rangi + mayda tekstura (teri teshiklari o'rniga)
          const t = tekstura ? ((x + y) % 4 < 2 ? 18 : -18) : 0;
          r = 216 + t; g = 165 + t; b = 131 + t;
        } else { r = 27; g = 27; b = 31; }
        d[p] = r * yoruglik; d[p + 1] = g * yoruglik; d[p + 2] = b * yoruglik; d[p + 3] = 255;
      }
    }
    return { data: d, width: EN, height: BOY };
  }

  /** 3x3 o'rtacha filtr — «xira» kadrni yasaydi. */
  function xiralat(k, marta = 2) {
    let d = k.data;
    for (let n = 0; n < marta; n++) {
      const y = new Uint8ClampedArray(d.length);
      for (let j = 1; j < BOY - 1; j++) {
        for (let i = 1; i < EN - 1; i++) {
          for (let c = 0; c < 3; c++) {
            let s = 0;
            for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
              s += d[((j + dj) * EN + (i + di)) * 4 + c];
            }
            y[(j * EN + i) * 4 + c] = s / 9;
          }
          y[(j * EN + i) * 4 + 3] = 255;
        }
      }
      d = y;
    }
    return { data: d, width: EN, height: BOY };
  }

  // ── Tiniqlik ──
  const tiniq = S.kadrniOlch(kadr(), null);
  const xira  = S.kadrniOlch(xiralat(kadr()), null);
  test('tiniq kadr yuqori ball oladi', tiniq.tiniqlik >= S.CHEGARA.tiniqlik,
    `${tiniq.tiniqlik} (chegara ${S.CHEGARA.tiniqlik})`);
  test('XIRA kadr chegaradan o‘tmaydi', xira.tiniqlik < S.CHEGARA.tiniqlik,
    `${xira.tiniqlik}`);
  test('farq sezilarli', tiniq.tiniqlik > xira.tiniqlik * 2,
    `${tiniq.tiniqlik} ↔ ${xira.tiniqlik}`);
  test('xira kadrda AYNAN nima qilish aytiladi',
    /fokus|tiniq/i.test(xira.maslahat), xira.maslahat);
  test('tiniq kadr TAYYOR deb belgilanadi', tiniq.tayyor === true, tiniq.maslahat);

  // KONTRASTLI, lekin xira kadr aldab o'tmasligi kerak. Laplas
  // qiymati kontrastga bo'linadi — aynan shuning uchun.
  const kontrastliXira = S.kadrniOlch(xiralat(kadr({ yoruglik: 1.35 }), 2), null);
  test('kontrastli bo‘lsa ham XIRA kadr o‘tmaydi',
    kontrastliXira.tiniqlik < S.CHEGARA.tiniqlik, String(kontrastliXira.tiniqlik));

  // ── Yorug'lik ──
  const toq = S.kadrniOlch(kadr({ yoruglik: 0.18 }), null);
  test('qorong‘i kadr topiladi', /Qorong‘i/.test(toq.maslahat), toq.maslahat);
  const yorug = S.kadrniOlch(kadr({ yoruglik: 1.9 }), null);
  test('haddan tashqari yorug‘ kadr ham', /Yorug‘lik ko‘p/.test(yorug.maslahat),
    yorug.maslahat);

  // ── Yuz bor-yo'qligi va kattaligi ──
  const yuzsiz = S.kadrniOlch(kadr({ teri: false }), null);
  test('yuz yo‘q bo‘lsa aytiladi', yuzsiz.quti === null && /kadrga/i.test(yuzsiz.maslahat),
    yuzsiz.maslahat);
  test('yuz yo‘q bo‘lsa TAYYOR emas', yuzsiz.tayyor === false);
  const kichik = S.kadrniOlch(kadr({ yuz: 0.45 }), null);
  test('yuz kichik bo‘lsa «yaqinroq keling»', /Yaqinroq/.test(kichik.maslahat),
    `${kichik.maslahat} (ulush ${kichik.yuz_ulush.toFixed(2)})`);
  // To'q fon oldida turgan odam: YUZ yoritilgan bo'lsa «qorong'i»
  // deb bejiz ogohlantirmaymiz — yorug'lik yuz bo'yicha o'lchanadi
  test('yorug‘lik FON bo‘yicha emas, yuz bo‘yicha o‘lchanadi',
    kichik.yoruglik.ora > 120, `yuzdagi yorug‘lik ${kichik.yoruglik.ora}`);
  test('yuz qutisi topiladi', tiniq.quti && tiniq.quti.en > 40 && tiniq.quti.boy > 60,
    JSON.stringify(tiniq.quti && { en: tiniq.quti.en, boy: tiniq.quti.boy }));

  // ── Harakat (qo'l titrashi) ──
  const a = kadr(), b = kadr({ yuz: 1.25 });
  const gA = S.kulrang(a.data, EN, BOY);
  const qimirlagan = S.kadrniOlch(b, gA);
  test('qo‘l qimirlasa sezamiz', qimirlagan.harakat > S.CHEGARA.harakat,
    `harakat ${qimirlagan.harakat}`);
  test('qimirlaganda ogohlantiriladi', /Qimirlatmang/.test(qimirlagan.maslahat),
    qimirlagan.maslahat);

  // ── To'r (ekrandagi chiziqlar) ──
  test('to‘r kataklari hisoblanadi',
    tiniq.tor && tiniq.tor.ball.length === tiniq.tor.ustun * tiniq.tor.qator,
    `${tiniq.tor?.ustun}×${tiniq.tor?.qator}`);
  const ortacha = (t) => t.ball.reduce((s, x) => s + x, 0) / t.ball.length;
  test('xira joyda katak ham past ball oladi',
    ortacha(xira.tor) < ortacha(tiniq.tor),
    `${ortacha(xira.tor).toFixed(0)} ↔ ${ortacha(tiniq.tor).toFixed(0)}`);

  // ── Umumiy ball eng ZAIF ko'rsatkich bo'yicha ──
  test('bitta shart buzilsa umumiy ball tushadi', toq.ball < tiniq.ball,
    `${toq.ball} ↔ ${tiniq.ball}`);
}

// ═══════════ JONLI KAMERA (ILOVA) ═══════════
console.log('\n── JONLI KAMERA ──');
{
  const fs = await import('node:fs');
  const js   = fs.readFileSync('public/app/app.js', 'utf8');
  const html = fs.readFileSync('public/app/index.html', 'utf8');
  const css  = fs.readFileSync('public/app/style.css', 'utf8');

  test('o‘lchov moduli ilovaga ulangan', html.includes('src="sifat.js"'));
  test('jonli kamera ekrani bor', html.includes('id="skaner-kamera"')
    && html.includes('id="kam-video"') && html.includes('id="kam-tor"'));
  test('uchta yo‘l: jonli kamera, telefon kamerasi, galereya',
    html.includes('id="tushirish"') && html.includes('id="t-telefon-kamera"')
      && html.includes('id="t-galereya"'));
  test('telefon kamerasi NATIV rejimda ochiladi', /id="fayl"[^>]*capture="user"/.test(html));
  test('galereya uchun capture YO‘Q', /id="fayl-galereya"(?![^>]*capture)/.test(html));

  // Eng yuqori o'lcham so'raladi — «veb-kamera xira oladi» shikoyatining sababi
  test('kamera eng yuqori o‘lchamda so‘raladi',
    /width:\s*\{ ideal: 1920 \}/.test(js) && /height:\s*\{ ideal: 1440 \}/.test(js));
  test('avtofokus doimiy rejimga qo‘yiladi', /focusMode: 'continuous'/.test(js));
  test('past o‘lchamli kamera haqida OGOHLANTIRILADI',
    /olchov\.width \|\| 0\) < 720/.test(js) && html.includes('id="kam-ogoh"'));
  test('past sifatda telefon kamerasiga yo‘l ko‘rsatiladi',
    /t-kam-telefon/.test(js) && /kameraniYop\(\); \$\('#fayl'\)\.click\(\)/.test(js));

  // Bitta kadr yetmaydi — eng tiniqi tanlanadi
  test('bir necha kadr olinadi', /for \(let i = 0; i < 5; i\+\+\)/.test(js));
  test('eng TINIQ kadr tanlanadi', /if \(b > engBall\) \{ eng = k; engBall = b; \}/.test(js)
    || /if \(b > engBall\) \{ engBall = b; eng = k; \}/.test(js));

  // 1024 px da teri teksturasi yo'qoladi va AI rasmni xira deb rad etadi
  test('skaner rasmi 1600 px gacha yuboriladi', /KAM_MAKS = 1600/.test(js));
  test('siqish sifati yuqori', /KAM_SIFAT = 0\.92/.test(js));
  test('fayl ham shu o‘lchamda tayyorlanadi',
    /rasmniTayyorla\(fayl, KAM_MAKS, KAM_SIFAT\)/.test(js));

  // Yuborishdan OLDIN tekshiriladi
  test('tanlangan rasm sifati oldindan tekshiriladi',
    /function rasmSifatiniTekshir/.test(js) && /oldindan-ogoh/.test(css));
  test('xira bo‘lsa sababi tushuntiriladi', /Rasm xira ko‘rinmoqda/.test(js));
  test('lekin TAQIQLANMAYDI — qaror odamniki',
    !/t-tahlil'\)\.disabled = true/.test(js));

  // Tugma faqat kadr yaxshi bo'lganda
  test('tugma ikki ketma-ket yaxshi kadrdan keyin ochiladi',
    /kamYaxshiKetma < 2/.test(js));

  // Batareya va maxfiylik
  test('boshqa bo‘limga o‘tilsa kamera o‘chadi',
    /nom !== 'skaner' && kamOqim\) kameraniYop\(\)/.test(js));
  test('yopilganda oqim to‘xtatiladi', /getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/.test(js));
  test('o‘lchov taymeri ham to‘xtaydi', /clearInterval\(kamHalqa\)/.test(js));

  // O'lchov ko'rinishi — tafsiloti «SKANER KO'RINISHI» bo'limida
  test('yuz qutisi bo‘yicha kontur chiziladi',
    /const o = yuzOvali\(q\)/.test(js));
  test('skaner chizig‘i yuradi', /const sweep = \(Date\.now\(\) % 2400\) \/ 2400/.test(js));
  test('kamera uslublari bor', /\.kam-quti\{/.test(css) && /\.kam-olchov\{/.test(css));
  test('selfi ko‘zguda ko‘rinadi', /transform:scaleX\(-1\)/.test(css));
  test('SAQLANADIGAN rasm esa ko‘zgusiz',
    /x\.drawImage\(video, 0, 0, c\.width, c\.height\)/.test(js));
}

// ═══════════ MASOFA VA MARKAZ (SKANER) ═══════════
console.log('\n── KADR: MASOFA VA MARKAZ ──');
{
  const fs = await import('node:fs');
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync('public/app/sifat.js', 'utf8'), ctx);
  const S = ctx.Sifat;

  const EN = 200, BOY = 260;
  /** Teri rangidagi oval — o'lchami va joyi beriladi. */
  const kadr = ({ yuz = 1, sx = 0, sy = 0 } = {}) => {
    const d = new Uint8ClampedArray(EN * BOY * 4);
    const rx = 62 * yuz, ry = 82 * yuz;
    const cx = EN / 2 + sx * EN, cy = BOY / 2 + sy * BOY;
    for (let y = 0; y < BOY; y++) for (let x = 0; x < EN; x++) {
      const p = (y * EN + x) * 4;
      const ichida = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1;
      const t = (x + y) % 4 < 2 ? 18 : -18;
      d[p] = ichida ? 216 + t : 150; d[p + 1] = ichida ? 165 + t : 148;
      d[p + 2] = ichida ? 131 + t : 146; d[p + 3] = 255;
    }
    return { data: d, width: EN, height: BOY };
  };

  const normal = S.kadrniOlch(kadr(), null);
  test('normal masofa «normal» deb belgilanadi', normal.masofa === 'normal',
    `${normal.masofa}, ulush ${normal.yuz_ulush.toFixed(2)}`);

  const yaqin = S.kadrniOlch(kadr({ yuz: 1.7 }), null);
  test('juda YAQIN kelsa aytiladi', /uzoqlashing/i.test(yaqin.maslahat), yaqin.maslahat);
  test('masofa «yaqin» deb belgilanadi', yaqin.masofa === 'yaqin',
    `ulush ${yaqin.yuz_ulush.toFixed(2)}`);
  const uzoq = S.kadrniOlch(kadr({ yuz: 0.42 }), null);
  test('juda UZOQ bo‘lsa ham', /Yaqinroq/.test(uzoq.maslahat), uzoq.maslahat);
  test('masofa «uzoq» deb belgilanadi', uzoq.masofa === 'uzoq');
  test('ikkala holatda ham TAYYOR emas', !yaqin.tayyor && !uzoq.tayyor);

  const chetda = S.kadrniOlch(kadr({ sx: 0.3 }), null);
  test('yuz chetda bo‘lsa markazga chaqiriladi', /markazga/i.test(chetda.maslahat),
    `${chetda.maslahat} (chetlanish ${chetda.chetlanish.toFixed(2)})`);
  test('markazdagi yuzda bunday ogohlantirish yo‘q',
    !/markazga/i.test(normal.maslahat), normal.maslahat);
}

// ═══════════ YUZ ANIQLASH (VIOLA-JONES) ═══════════
// Shikoyat: «Biroz uzoqlashing deyapti bu qanaqasi», «diagnoz
// qo'yganda sochimni belgilayapti», «nahotki aniq ishlaydigan
// yuzni ko'zni aniq aniqlaydigan qilolmaysan».
//
// Sabab: yuz TERI RANGI bo'yicha chamalanardi — devor, qo'l va
// bo'yin ham «teri» bo'lib chiqar, quti kadrning 78% ini egallar
// va ilova «uzoqlashing» derdi. Endi Haar kaskadi: yuz rangi
// emas, SHAKLI bo'yicha topiladi.
console.log('\n── YUZ ANIQLASH ──');
{
  const fs = await import('node:fs');
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync('public/app/yuz.js', 'utf8'), ctx);
  const Y = ctx.Yuz;

  // ── Integral rasm: har to'rtburchak yig'indisi 4 ta qo'shish ──
  {
    const w = 7, h = 5;
    const g = new Float32Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = (i * 13) % 31;
    const it = Y.integral(g, w, h);
    // Sekin, lekin aniq usul bilan solishtiramiz
    const sekin = (x, y, en, boy) => {
      let s = 0;
      for (let j = y; j < y + boy; j++) for (let i = x; i < x + en; i++) s += g[j * w + i];
      return s;
    };
    let xato = 0;
    for (const [x, y, en, boy] of [[0,0,7,5],[1,1,3,2],[4,2,3,3],[0,3,2,2],[2,0,1,1]]) {
      if (Math.abs(Y.jam(it.s, it.W, x, y, en, boy) - sekin(x, y, en, boy)) > 1e-6) xato++;
    }
    test('integral rasm to‘rtburchak yig‘indisini to‘g‘ri beradi', xato === 0);

    // Kvadratlar integrali — dispersiya uchun
    const kvadrat = Y.jam(it.k, it.W, 1, 1, 3, 2);
    let kutilgan = 0;
    for (let j = 1; j < 3; j++) for (let i = 1; i < 4; i++) kutilgan += g[j * w + i] ** 2;
    test('kvadratlar integrali ham to‘g‘ri', Math.abs(kvadrat - kutilgan) < 1e-6);
  }

  // ── Qutilarni birlashtirish ──
  {
    const iou = Y.kesishuv({ x: 0, y: 0, en: 10, boy: 10 }, { x: 5, y: 0, en: 10, boy: 10 });
    test('kesishuv (IoU) hisoblanadi', Math.abs(iou - 50 / 150) < 1e-6, iou.toFixed(3));
    test('tegmaydigan qutilarda nol',
      Y.kesishuv({ x: 0, y: 0, en: 4, boy: 4 }, { x: 9, y: 9, en: 4, boy: 4 }) === 0);

    // Bitta yuz bir necha o'lchamda topiladi — bitta qutiga qo'shiladi
    const bir = Y.birlashtir([
      { x: 10, y: 10, en: 40, boy: 40 },
      { x: 12, y: 11, en: 40, boy: 40 },
      { x: 11, y: 12, en: 42, boy: 42 },
      { x: 200, y: 200, en: 30, boy: 30 },
    ]);
    test('ustma-ust qutilar bittaga qo‘shiladi', bir.length === 2, `${bir.length} ta`);
    test('guruh nechta topilgani saqlanadi',
      bir[0].soni === 3 && bir[1].soni === 1, JSON.stringify(bir.map((b) => b.soni)));
    test('o‘rtacha olinadi — quti kadrdan kadrga sakramaydi',
      bir[0].x === 11 && bir[0].y === 11, JSON.stringify(bir[0]));

    // Zanjir: A-B kesishadi, B-C kesishadi, A-C esa yo'q.
    // Bir marta yurish bilan ular ikkita guruh bo‘lib qolardi.
    const zanjir = Y.birlashtir([
      { x: 0,  y: 0, en: 40, boy: 40 },
      { x: 12, y: 0, en: 40, boy: 40 },
      { x: 24, y: 0, en: 40, boy: 40 },
    ]);
    // 1-3 qutilar bir-biri bilan kesishmaydi (IoU 0.25), faqat
    // o'rtadagisi orqali bog'lanadi — shuning uchun bir yurish yetmaydi
    test('chetdagi ikkita quti o‘zaro kesishmaydi',
      Y.kesishuv({ x: 0, y: 0, en: 40, boy: 40 },
                 { x: 24, y: 0, en: 40, boy: 40 }) < Y.QOPLAMA);
    test('zanjir ham bitta guruhga yig‘iladi', zanjir.length === 1, `${zanjir.length} ta`);
  }

  // ── Anatomik nuqtalar ──
  {
    const yuz = { x: 100, y: 60, en: 200, boy: 200 };
    const n = Y.nuqtalar(yuz, null);
    test('ko‘z topilmasa ham nuqtalar chiqadi', !!n);
    test('peshona ko‘zdan YUQORIDA', n.peshona.y < n.koz_chap.y,
      `${n.peshona.y.toFixed(0)} < ${n.koz_chap.y.toFixed(0)}`);
    test('burun ko‘z bilan lab orasida',
      n.burun.y > n.koz_chap.y && n.burun.y < n.lab.y);
    test('iyak eng pastda', n.iyak.y > n.lab.y);
    test('chap va o‘ng yonoq turli tomonda', n.yonoq_chap.x < n.yonoq_ong.x);
    test('peshona SOCHGA tushmaydi — quti tepasidan pastda',
      n.peshona.y > yuz.y, `peshona ${n.peshona.y.toFixed(0)}, quti tepasi ${yuz.y}`);

    // Bosh qiyshaygan bo'lsa belgilar ham qiyshayadi
    const qiya = Y.nuqtalar(yuz, {
      chap: { x: 150, y: 120 }, ong: { x: 250, y: 160 },
    });
    test('bosh qiyshaysa belgilar ham buriladi', qiya.burchak > 0.2,
      `burchak ${qiya.burchak.toFixed(2)} rad`);
    test('iyak ko‘zlar chizig‘iga PERPENDIKULAR yotadi',
      qiya.iyak.x < qiya.koz_ora.x && qiya.iyak.y > qiya.koz_ora.y,
      JSON.stringify({ iyak: qiya.iyak, ora: qiya.koz_ora }));
  }

  // ── Ko'z: qorong'i joy bo'yicha zaxira usul ──
  {
    // Sun'iy yuz: och fon, ikkita to'q dog' (ko'z)
    const w = 120, h = 150;
    const g = new Float32Array(w * h).fill(190);
    const dog = (cx, cy) => {
      for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 9; x <= cx + 9; x++) g[y * w + x] = 35;
    };
    dog(38, 58); dog(82, 58);
    const k = Y.kozQorongi(g, w, h, { x: 10, y: 10, en: 100, boy: 130 });
    test('ko‘zoynak/ko‘z qorong‘iligidan topiladi', !!k);
    test('chap ko‘z chapda, o‘ng ko‘z o‘ngda',
      k && Math.abs(k.chap.x - 38) < 6 && Math.abs(k.ong.x - 82) < 6,
      k && `${k.chap.x.toFixed(0)} / ${k.ong.x.toFixed(0)}`);
    test('balandligi ham to‘g‘ri', k && Math.abs(k.chap.y - 58) < 6, k && k.chap.y.toFixed(0));

    // Bir tekis kadrda yolg'on ko'z «topilmasin»
    const tekis = new Float32Array(w * h).fill(150);
    const yoq = Y.kozQorongi(tekis, w, h, { x: 10, y: 10, en: 100, boy: 130 });
    test('bir tekis kadrda ko‘z markazlari qo‘shilib ketmaydi',
      !yoq || yoq.ong.x - yoq.chap.x > 100 * 0.18);
  }

  // ── Kaskad fayli va uning ulanishi ──
  {
    const kas = fs.readFileSync('public/app/yuz-kaskad.js', 'utf8');
    test('yuz kaskadi bor', /window\.YUZ_KASKAD = new Float64Array/.test(kas));
    test('ko‘z kaskadi ham', /window\.KOZ_KASKAD = new Float64Array/.test(kas));
    test('manba va litsenziya yozilgan',
      /OpenCV/.test(kas) && /BSD/.test(kas));

    const html = fs.readFileSync('public/app/index.html', 'utf8');
    test('yuz.js ilovaga ulangan', html.includes('src="yuz.js"'));
    test('KASKAD esa bosh sahifada YUKLANMAYDI — u og‘ir',
      !html.includes('yuz-kaskad.js'));

    const js = fs.readFileSync('public/app/app.js', 'utf8');
    test('kaskad skaner ochilganda yuklanadi',
      /function kaskadniYukla/.test(js) && /nom === 'skaner'\) kaskadniYukla/.test(js));
    test('kaskad yuklanmasa ilova to‘xtamaydi',
      /sc\.onerror = \(\) => \{ kaskadHolat = 'xato'; \}/.test(js));
    test('aniqlash har kadrda emas', /YUZ_HAR = 3/.test(js));
    test('quti silliqlanadi — chiziqlar titramaydi',
      /yuzOxirgi\.x \+ \(q\.x - yuzOxirgi\.x\) \* a/.test(js));
    test('bir-ikki kadrda yo‘qolsa quti saqlanadi', /\+\+yuzYoq >= 4/.test(js));
    test('aniqlash KENGROQ kadrda bajariladi', /KAM_YUZ_ENI = 288/.test(js));
  }

  // ── O'lchov: yuz qutisi bo'yicha masofa ──
  {
    const sctx = vm.createContext({});
    vm.runInContext(fs.readFileSync('public/app/sifat.js', 'utf8'), sctx);
    const S = sctx.Sifat;
    const EN = 200, BOY = 260;
    const bosh = { data: new Uint8ClampedArray(EN * BOY * 4), width: EN, height: BOY };
    for (let i = 0; i < EN * BOY; i++) {
      const p = i * 4, t = (i % 7 < 3) ? 20 : -20;
      bosh.data[p] = 150 + t; bosh.data[p + 1] = 140 + t;
      bosh.data[p + 2] = 135 + t; bosh.data[p + 3] = 255;
    }
    // Yuz qutisi TASHQARIDAN berilsa — masofa BO'Y bo'yicha o'lchanadi
    const normal = S.kadrniOlch(bosh, null, { x: 50, y: 40, en: 100, boy: 130 });
    test('yuz qutisi berilsa manba «yuz» bo‘ladi', normal.manba === 'yuz');
    test('yarim kadrni egallagan yuz — NORMAL masofa',
      normal.masofa === 'normal', `bo‘y ulushi ${normal.boy_ulush.toFixed(2)}`);

    // Aynan shu quti MAYDON bo'yicha o'lchansa «uzoq» chiqardi:
    // 100*130 / (200*260) = 0.25 — eski chegara 0.14 dan katta, lekin
    // teri qutisi odatda ancha kattaroq bo'lardi. Asosiysi: yuz
    // qutisi butun kadrni egallamaydi.
    const yaqin = S.kadrniOlch(bosh, null, { x: 10, y: 2, en: 180, boy: 250 });
    test('yuz kadrga sig‘masa «uzoqlashing» deyiladi',
      /uzoqlashing/i.test(yaqin.maslahat), yaqin.maslahat);
    const uzoq = S.kadrniOlch(bosh, null, { x: 80, y: 100, en: 40, boy: 45 });
    test('yuz juda kichik bo‘lsa «yaqinroq keling»',
      /Yaqinroq/.test(uzoq.maslahat), uzoq.maslahat);

    // ENG MUHIMI: bo'yin va devorni ham qamrab olgan TERI qutisi
    // (kadrning 78% i) endi «uzoqlashing» demaydi, chunki yuz
    // qutisi undan mustaqil o'lchanadi
    const keng = S.kadrniOlch(bosh, null, { x: 20, y: 20, en: 160, boy: 160 });
    test('keng, lekin kadrga sig‘adigan yuz — ogohlantirish yo‘q',
      !/uzoqlashing|Yaqinroq/i.test(keng.maslahat), keng.maslahat);
  }
}

// ═══════════ SKANER KO'RINISHI ═══════════
// Uchinchi urinish. Simtor «eplanmadi», nuqtalar esa «haqiqiy
// animatsiya emas, o'yinchoq bo'lib qolgan». Endi ekranda faqat
// O'LCHANGAN narsa: kontur, skaner chizig'i va anatomik belgilar.
console.log('\n── SKANER KO‘RINISHI ──');
{
  const fs = await import('node:fs');
  const js = fs.readFileSync('public/app/app.js', 'utf8');
  const css = fs.readFileSync('public/app/style.css', 'utf8');

  test('yuz ovali topilgan qutidan chiziladi', /function yuzOvali/.test(js));
  test('rang UMUMIY BALLdan keladi — bezak emas',
    /n\.tayyor \? '86,230,170' : n\.ball >= 55/.test(js));
  test('skaner chizig‘i konturdan chiqmaydi',
    /const yarimEn = orx \* Math\.sqrt\(Math\.max\(0, 1 - t \* t\)\)/.test(js));
  test('ko‘z BODOM shaklida — «+» emas', /function kozBelgisi/.test(js)
    && /x\.quadraticCurveTo\(0, -r \* 0\.66, r, 0\)/.test(js));
  test('burun, lab, iyak, yonoq — yumshoq halqa', /function halqaBelgisi/.test(js)
    && /nq\.burun, nq\.lab, nq\.iyak, nq\.yonoq_chap, nq\.yonoq_ong/.test(js));
  test('belgilar skaner chizig‘i yonida kattalashadi',
    /const yaqinlik = \(py\) => Math\.max\(0, 1 - Math\.abs\(py - sy\)/.test(js));
  test('yuz bo‘ylab TO‘LQIN nuqtalari yuradi', /const TOLQIN_NUQTA/.test(js)
    && /Math\.sin\(p\.v \* 3\.4 - vaqt \* 2\.3\)/.test(js));
  test('chiziqlar YO‘G‘ON — cho‘zilgan qo‘lda ham ko‘rinadi',
    /x\.lineWidth = 3;/.test(js) && /x\.lineWidth = 3\.5;/.test(js));
  test('burchak qavslari qoldi', /Burchak qavslari/.test(js));
  test('eski simtor olib tashlandi',
    !/MERIDIANLAR/.test(js) && !/function yuzKengligi/.test(js));
  test('sepilgan nuqtalar ham olib tashlandi', !/YUZ_NUQTALARI/.test(js));
  test('yuz topilmasa ko‘rsatma ovali chiziladi', /ko‘rsatma ovali|ko\'rsatma ovali/.test(js));
  test('selfi ko‘zguda, belgilar ham ko‘zguda',
    /transform:scaleX\(-1\)/.test(css) && /const K = \(px\) => en - \(siljishX/.test(js));
}

// ═══════════ NATIJA EKRANI ═══════════
// Shikoyat: «ranglar yetarli emas, ko'p qismi zerikarli va
// o'qigisi kelmaydi», «keraksiz mayda tekstlar juda ko'p»,
// «muammolarni to'g'ri bir qatorga sig'dirolsang yaxshi bo'lardi»,
// «buni 7 yoshli bola ham ko'rib tushuna olishi kerak».
console.log('\n── NATIJA EKRANI ──');
{
  const fs = await import('node:fs');
  const js  = fs.readFileSync('public/app/app.js', 'utf8');
  const css = fs.readFileSync('public/app/style.css', 'utf8');

  // Zona matnidan yuzdagi joyni topish
  const kod = js.slice(js.indexOf('const ZONA_JOY'), js.indexOf("/** Ko'rsatkich rangi"));
  const zonaJoyi = new Function(`${kod}; return zonaJoyi;`)();
  const j1 = zonaJoyi('peshona va burun qanotlari', 0);
  test('peshona YUQORIDA belgilanadi', j1.y < 30, JSON.stringify(j1));
  const j2 = zonaJoyi('iyak va jag‘ chizig‘i', 0);
  test('iyak PASTDA belgilanadi', j2.y > 70, JSON.stringify(j2));
  const chap = zonaJoyi('chap yonoqning yuqori qismi', 0);
  const ong  = zonaJoyi('o‘ng yonoq', 0);
  test('«chap» va «o‘ng» yonoq turli tomonda', chap.x < 50 && ong.x > 50,
    `${chap.x} ↔ ${ong.x}`);
  test('tomon aytilmasa navbat bilan taqsimlanadi',
    zonaJoyi('yonoq', 0).x !== zonaJoyi('yonoq', 1).x);
  const nomalum = zonaJoyi('butun yuz bo‘ylab', 0);
  test('aniqlanmagan zona ham joy oladi',
    nomalum.x === 50 && nomalum.y > 0, JSON.stringify(nomalum));

  // ── Belgilar YUZGA nisbatan qo'yiladi ──
  const yuzQuti = { x: 30, y: 25, en: 40, boy: 45 };   // rasm foizida
  const peshona = zonaJoyi('peshona', 0, yuzQuti);
  test('peshona YUZ qutisining ichida', peshona.y > yuzQuti.y
    && peshona.y < yuzQuti.y + yuzQuti.boy * 0.35, JSON.stringify(peshona));
  test('peshona quti tepasidan PASTDA — soch emas',
    peshona.y > yuzQuti.y + 2, `${peshona.y} > ${yuzQuti.y}`);
  const iyak = zonaJoyi('iyak', 0, yuzQuti);
  test('iyak qutining pastida', iyak.y > yuzQuti.y + yuzQuti.boy * 0.8,
    JSON.stringify(iyak));
  test('yuz chetda bo‘lsa belgilar ham chetga ko‘chadi',
    zonaJoyi('peshona', 0, { x: 5, y: 5, en: 30, boy: 30 }).x
      !== zonaJoyi('peshona', 0, { x: 60, y: 5, en: 30, boy: 30 }).x);
  test('belgi rasmdan chiqib ketmaydi',
    [[0, 0, 100, 100], [70, 70, 60, 60]].every(([x, y, en, boy]) => {
      const j = zonaJoyi('bo‘yin', 0, { x, y, en, boy });
      return j.x >= 3 && j.x <= 97 && j.y >= 3 && j.y <= 97;
    }));

  // ── Ustma-ust tushgan belgilar ajratiladi ──
  const kodA = js.slice(js.indexOf('function joyniAjrat'), js.indexOf('/** Ovqat: ikki'));
  const joyniAjrat = new Function(`${kodA}; return joyniAjrat;`)();
  {
    const olingan = [{ x: 50, y: 50 }];
    const yangi = joyniAjrat({ x: 50, y: 50 }, olingan);
    test('bir joyga tushgan ikkinchi belgi SURILADI',
      Math.hypot(yangi.x - 50, yangi.y - 50) >= 7, JSON.stringify(yangi));
    test('bo‘sh joydagi belgi qimirlamaydi',
      JSON.stringify(joyniAjrat({ x: 20, y: 20 }, olingan)) === '{"x":20,"y":20}');
    // Sakkizta belgi ham bir-birining ustiga tushmaydi
    const hammasi = [];
    for (let i = 0; i < 8; i++) hammasi.push(joyniAjrat({ x: 50, y: 50 }, hammasi));
    const engYaqin = Math.min(...hammasi.flatMap((a, i) =>
      hammasi.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    test('sakkizta belgi ham ajralib turadi', engYaqin >= 7, engYaqin.toFixed(1));
  }

  test('rasmdagi yuz ilovada QAYTA topiladi',
    /function belgilarniYuzgaQoy/.test(js) && /Yuz\.yuzniTop/.test(js));
  test('eski tahlil ham to‘g‘rilanadi — rasm serverdan o‘qiladi',
    /el\.querySelector\('\.n-yuz-media img'\)/.test(js));

  // ── «Bu mening rasmim» — ishonch ──
  test('muammolar suratda RAQAM bilan belgilanadi',
    /n-nishon/.test(js) && /\.n-nishon\{/.test(css));
  test('nishon raqami ro‘yxatdagi raqam bilan bir xil',
    /class="n-nishon d\$\{Math\.min\(3, m\.daraja \|\| 1\)\}"/.test(js)
      && /data-nishon="\$\{m\.tartib\}"/.test(js));
  // Nishon endi TUGMA: bosilganda pastdagi o'sha muammo ochiladi.
  // «Qayerini aytyapti?» degan savol shu bilan yopiladi.
  test('nishon BOSILADI — muammoni ochadi',
    /<button class="n-nishon/.test(js)
      && /\$\$\('\[data-nishon\]', el\)\.forEach\(\(b\) => b\.onclick/.test(js));
  test('tanlangan nishon kattalashadi',
    /\.n-nishon\.tanlangan\{transform:translate\(-50%,-50%\) scale\(1\.22\)/.test(css));
  test('sakkiztagacha muammo belgilanadi — ilgari faqat to‘rttasi edi',
    /const belgili = muammolar\.slice\(0, 8\)/.test(js));
  test('eng og‘iri BIRINCHI raqamni oladi',
    /\.sort\(\(x, y\) => y\.foiz - x\.foiz\)/.test(js));
  test('ro‘yxatda yuzning O‘SHA bo‘lagi kattalashtiriladi',
    /n-kesim/.test(js) && /\.n-kesim\{[^}]*background-size:420%/.test(css.replace(/\n\s*/g, ' ')));
  test('«Rasmda nimani ko‘rdim» ko‘rsatiladi', /t\.raw\?\.tavsif/.test(js));

  // ── Diagnostika ko'rinishi ──
  test('ball HALQA bilan ko‘rsatiladi', /function ballHalqa/.test(js)
    && /n-halqa-yoy/.test(css));
  test('ball SURAT bilan BIR kartada — qahramon bo‘lim',
    /<section class="n-hero">/.test(js) && /\.n-hero\{/.test(css)
      && /ballHalqa\(ball, 92\)/.test(js));
  test('rang MA’NO anglatadi — bitta shkala',
    /const ballRang = \(b\) => \(b >= 70 \? 'yaxshi' : b >= 45 \? 'orta' : 'yomon'\)/.test(js));

  // ── Ko'rsatkichlar BIR QATORDA (namunadagidek) ──
  // To'rt ustunda nom sig'masdi. Ikki ustunda nom bir qatorda,
  // shkala esa uzun — barmoq bilan ham o'qib bo'ladi.
  test('ko‘rsatkichlar ikki ustunda',
    /\.n-olchamlar\{display:grid;grid-template-columns:1fr 1fr/.test(css));
  // Ro'yxat endi MUAMMOLARDAN emas, qat'iy yettitadan iborat —
  // terisi toza odam ham to'liq ko'rsatkich ko'radi
  test('ko‘rsatkichlar DOIM yettita',
    /olchovlarniHisobla\(t\.problems/.test(js)
      && !/const olchovlar = muammolar\.slice/.test(js));
  test('uzun nom katak uchun QISQARTIRILADI',
    /const KALIT_QISQA/.test(js) && /function kalitQisqa|const kalitQisqa/.test(js));

  // ── Bo'limlar: rang bilan ajratilgan ──
  test('ovqat ikki qarama-qarshi panel',
    /function natijaOvqat/.test(js) && /\.n-panel\.yaxshi\{background:var\(--yashil-och\)/.test(css)
      && /\.n-panel\.yomon\{background:var\(--qizil-och\)/.test(css));
  test('kundalik tartib KO‘K panelda',
    /function natijaParvarish/.test(js) && /\.n-kok\{background:var\(--kok-och\)/.test(css));
  test('prognoz SARIQ panelda',
    /function natijaPrognoz/.test(js) && /\.n-sariq\{background:var\(--sariq-och\)/.test(css));
  test('mahsulotlar YON TARAFGA siriladi',
    /\.n-mahsulotlar\{display:flex;gap:10px;overflow-x:auto/.test(css)
      && /scroll-snap-type:x mandatory/.test(css));
  test('mahsulot kartasi ekranga qarab kengayadi',
    /\.n-mahsulotlar>\*\{flex:0 0 clamp\(144px,44vw,172px\)/.test(css));

  // ── Bitta uzun sahifa: tab YO'Q ──
  test('bo‘lim tablari olib tashlandi',
    !/n-tablar/.test(js) && !/natijaBolim/.test(js));
  test('hamma bo‘lim bitta oqimda',
    /\$\{natijaOvqat\(parhez\)\}/.test(js) && /\$\{natijaTavsiya\(/.test(js)
      && /\$\{natijaParvarish\(/.test(js) && /\$\{natijaPrognoz\(/.test(js));
  test('muammo tafsiloti BOSILGANDA ochiladi',
    /data-muammo/.test(js) && /n-muammo-ich/.test(js));

  // ── Matn ikki darajali: oq va kulrang ──
  test('asosiy matn OQ (--matn)', /\.n-muammo-nom\{[^}]*font-weight:700/.test(css));
  test('ikkinchi darajali matn KULRANG',
    /\.n-muammo-nom em\{[^}]*color:var\(--kul\)/.test(css.replace(/\n\s*/g, ' ')));
  test('mayda uchinchi daraja matn yo‘q — 10px dan kichigi ishlatilmagan',
    !/font-size:[0-9](\.\d+)?px/.test(css.slice(css.indexOf('TAHLIL NATIJASI'),
      css.indexOf('JONLI KAMERA'))));

  // ── Har qanday ekranga moslashish ──
  test('sarlavha ekranga qarab kichrayadi', /clamp\(19px,5\.6vw,23px\)/.test(css));
  test('qatlamlar lentasi ekrandan chiqib siriladi',
    /\.n-qatlamlar\{display:flex;gap:8px;overflow-x:auto/.test(css));
  test('holat ranglari MAVZUdan olinadi — uyg‘un bo‘ladi',
    !/#2ebe78|#e05252|#e0a33c/.test(css));

  // ── Yosh, jins va teri turi RANGLI ──
  test('teglar rangli — kulrang bo‘lsa qo‘shilib ketardi',
    /\.n-teglar span:nth-child\(1\)\{background:var\(--kok-och\)/.test(css)
      && /\.n-teglar span:nth-child\(2\)\{background:var\(--yashil-och\)/.test(css)
      && /\.n-teglar span:nth-child\(4\)\{background:var\(--sariq-och\)/.test(css));
  test('teri turi ENG ko‘zga tashlanadi — to‘liq urg‘u rangida',
    /\.n-teglar span\.hot\{background:var\(--urgu\);color:#fff\}/.test(css)
      && /class="hot">\$\{esc\(t\.skin_type\)\}/.test(js));
  test('uzun teri rangi qisqartiriladi',
    /String\(t\.skin_tone\)\.split\(\/\[,;\(\]\/\)\[0\]/.test(js));

  // ── Ranglar TAKRORLANMAYDI: besh bosqich ──
  {
    const kodB = js.slice(js.indexOf('const BESH ='), js.indexOf('function ballHalqa'));
    const beshRang = new Function(`${kodB}; return beshRang;`)();
    const ranglar = [15, 35, 55, 72, 92].map(beshRang);
    test('besh xil ball — besh xil rang', new Set(ranglar).size === 5, ranglar.join(','));
    test('yuqori ball yashil tomonda', beshRang(92) === 'alo' && beshRang(15) === 'zaif');
    test('har bosqichning o‘z rangi bor',
      ['alo', 'yaxshi', 'orta', 'past', 'zaif'].every((k) =>
        new RegExp(`\\.n-chiziq i\\.${k}\\{background:var\\(`).test(css)));
  }

  // ── Teri «rentgeni» ──
  // «Muammolarni aniq ko'rsatolmasa, o'rniga yuz rasmini turli
  // effektlarda qo'yib qo'ysa ham mayli — haqiqiy rentgendek»
  test('rentgen ko‘rinishlari bor', /const RENTGEN = \[/.test(js)
    && /\.n-qatlamlar\{/.test(css));
  test('hammasi SHU suratdan — chizilgan rasm emas',
    /filter:\$\{r\.css\}/.test(js)
      && !/dall-e|midjourney|generate/i.test(js));
  test('bosilganda asosiy surat ham o‘zgaradi',
    /data-filtr/.test(js) && /media\.style\.filter = r\.css/.test(js));
  test('qaysi qatlam yoqilgani surat ustida yozilib turadi',
    /n-qatlam-teg/.test(js) && /\.n-qatlam-teg\{position:absolute/.test(css));
  {
    // Faqat RENTGEN ro'yxatini sanaymiz: `OLCHOVLAR` jadvalida ham
    // shunday kalitlar bor va ular hisobga qo'shilib ketardi
    const rentgenKod = js.slice(js.indexOf('const RENTGEN = ['),
      js.indexOf('const KALIT_QISQA'));
    test('olti ko‘rinish — UV va namlik ham bor',
      (rentgenKod.match(/kalit: '(asl|uv|qizarish|pigment|tekstura|namlik)'/g) || [])
        .length === 6);
  }

  // ── Sahifa QISQA: hammasi bitta ekranda ──
  // «Hozir ilovada teri holati haqidagi qismi rasmning ostki
  // qismida bo'laversin» — yonma-yon qo'yilganda o'ng ustun tor
  // bo'lib, xulosa besh qatorga cho'zilar edi
  test('teri holati SURAT OSTIDA',
    js.indexOf('<div class="n-yuz">') < js.indexOf('<div class="n-ball">'));
  test('surat 4:3 — namunadagidek keng',
    /\.n-yuz\{[^}]*aspect-ratio:4\/3/.test(css.replace(/\n\s*/g, '')));
  test('muammolar ro‘yxati OCHILADIGAN — sahifa qisqa turadi',
    /<details class="n-muammo"/.test(js)
      && /details\.n-muammo>summary\{display:grid/.test(css));
  test('hammasini birdan ochish tugmasi bor',
    /id="t-hammasini-och"/.test(js) && /yopiq \? 'Yopish' : 'Hammasi'/.test(js));
  // Yopiq muammo oddiy qatorga o'xshab turardi va odam uni bosish
  // mumkinligini bilmasdi — sabab bilan tavsiyani umuman ko'rmasdi
  test('bosilishini STRELKA bildirib turadi',
    /<i class="n-ochish"/.test(js) && /\.n-ochish::before\{/.test(css)
      && /details\.n-muammo\[open\] \.n-ochish::before/.test(css));
  test('sarlavhada ham aytiladi', /bosing — tafsiloti/.test(js));
  test('ovqat panellari ham yonma-yon',
    /\.n-panellar\{display:grid;gap:8px;grid-template-columns:1fr 1fr;/.test(css));
  test('ertalab va kechqurun ham yonma-yon',
    /\.n-vaqtlar\{display:grid;gap:12px;grid-template-columns:1fr 1fr\}/.test(css));

  // ── Ortiqcha tugmalar YO'Q ──
  const natija = js.slice(js.indexOf('function natijaniChiz'), js.indexOf('function belgilarniYuzgaQoy'));
  test('natijada «Telegramda yozish» tugmasi yo‘q', !/Telegramda yozish/.test(natija));
  test('natijada telefon raqami tugmasi ham yo‘q',
    !/href="tel:/.test(natija) && !/menejer\?\.telefon/.test(natija));

  // ── Natija rasmi botga O'ZI keladi ──
  {
    const yollar = fs.readFileSync('src/api/routes.js', 'utf8');
    test('tahlil tugashi bilan rasm botga yuboriladi',
      /rasmYubor\(user\.telegram_id, rasm\.bayt/.test(yollar));
    test('yuborish tahlilni TO‘XTATMAYDI', /\.catch\(\(\) => \{\}\);/.test(
      yollar.slice(yollar.indexOf('rasmYubor(user.telegram_id'),
                   yollar.indexOf('rasmYubor(user.telegram_id') + 600)));
  }

  // ── Bot tez javob bersin ──
  {
    const db = fs.readFileSync('src/db.js', 'utf8');
    test('sozlamalar keshlanadi', /const sozlamaKesh = new Map\(\)/.test(db)
      && /SOZLAMA_KESH_MS = 20_000/.test(db));
    test('settings ga YOZILSA kesh tozalanadi',
      /\/\\bsettings\\b\/i\.test\(matn\)/.test(db) && /sozlamalarniUnut\(\)/.test(db));
    // Tozalash YETMAYDI: o'qish yo'lda bo'lganda yozuv kelsa, o'qish
    // qaytib eski qiymatni keshga yozib qo'yardi. Sinovda aynan shu
    // ushlandi — kanal yoqilgandan keyin ham tahlil tushmasdi.
    test('yo‘ldagi o‘qish ESKI qiymatni keshga qaytara olmaydi',
      /let sozlamaAvlod = 0/.test(db)
        && /if \(avlod === sozlamaAvlod\) sozlamaKesh\.set/.test(db));

    // Haqiqiy tekshiruv: o'qish boshlanib, tugagunicha qiymat o'zgarsa
    {
      const { sozlama, sorov: s2 } = await import('../src/db.js');
      await s2(`insert into settings (key, value) values ('kesh_sinov','"eski"'::jsonb)
                on conflict (key) do update set value = excluded.value`);
      const oqish = sozlama('kesh_sinov');            // boshladi, hali tugamadi
      await s2(`update settings set value = '"yangi"'::jsonb where key = 'kesh_sinov'`);
      await oqish;
      test('o‘zgartirilgan qiymat DARHOL ko‘rinadi',
        (await sozlama('kesh_sinov')) === 'yangi', String(await sozlama('kesh_sinov')));
      await s2(`delete from settings where key = 'kesh_sinov'`);
    }
    const bot = fs.readFileSync('src/bot/index.js', 'utf8');
    test('«yozmoqda…» darhol ko‘rsatiladi', /action: 'typing'/.test(bot));
    test('obuna va brend PARALLEL so‘raladi',
      /await Promise\.all\(\[\s*obunaHolati/.test(bot));
  }

  // ── SERVER VA ILOVA bir xil joyni hisoblasin ──
  {
    const zona = await import('../src/lib/zona.js');
    const ilovaJadval = js.slice(js.indexOf('const ZONA_JOY = ['), js.indexOf('const YUZ_TAXMIN'));
    const serverJadval = fs.readFileSync('src/lib/zona.js', 'utf8');
    const sonlar = (t) => (t.match(/,\s+(-?\d+),\s+(-?\d+)\],/g) || [])
      .map((x) => x.replace(/\s+/g, '')).join('|');
    test('server va ilova jadvali BIR XIL',
      sonlar(ilovaJadval) === sonlar(serverJadval.slice(
        serverJadval.indexOf('export const ZONA_JOY'), serverJadval.indexOf('YUZ_TAXMIN'))),
      'ikkalasi ham peshona 15, iyak 91');
    const r = zona.joylarniHisobla([
      { nom: 'A', zona: 'peshona', foiz: 30 },
      { nom: 'B', zona: 'iyak', foiz: 80 },
    ]);
    test('serverda ham eng og‘iri birinchi', r[0].nom === 'B', r.map((m) => m.nom).join(''));
    test('serverda ham joy hisoblanadi', r[0].joy && r[0].joy.y > 70, JSON.stringify(r[0].joy));

    const kart = fs.readFileSync('src/services/natija-rasm.js', 'utf8');
    test('kartochkaga joy bilan uzatiladi', /joylarniHisobla/.test(kart));
  }

  // ── Kartochka RASMI ham shu ko'rinishda ──
  {
    const kart = fs.readFileSync('src/rasm/natija-kartochka.js', 'utf8');
    test('kartochka ham QORA', /fon:\s*'#08080A'/.test(kart));
    test('kartochkada ham raqamli nishon', /raqamNishoni\(p\.x, p\.y, 18, m\.tartib, rang\)/.test(kart));
    test('nishon rasmning haqiqiy nisbatidan joylashadi',
      /function qoplash/.test(kart) && /rasmOlchami/.test(kart));
    test('kartochkada ham yuzning bo‘lagi kattalashtiriladi', /zoom = 4\.2/.test(kart));
    test('kartochkada ham ko‘rsatkichlar bitta qatorda',
      /BITTA QATOR/.test(kart) && /const en = Math\.floor\(\(TOLA - oraliq/.test(kart));
    test('kartochkada ham besh bosqichli rang', /const SHKALA = \[/.test(kart)
      && /const beshRang = \(b\) => SHKALA/.test(kart));
    test('kartochkada ham rentgen yo‘lakchasi', /const RENTGEN = \[/.test(kart)
      && /feColorMatrix/.test(kart));
    test('yosh va jins RANGLI teglarda', /const teglar = \[/.test(kart)
      && /\$\{yosh\} yosh/.test(kart));
  }

  // AI tomoni
  const ai = fs.readFileSync('src/ai/faceAnalysis.js', 'utf8');
  test('AI sxemasida tavsif maydoni bor', /tavsif:\s*\{ type: 'string' \}/.test(ai));
  test('ko‘rinadigan tafsilot so‘raladi',
    /ko[‘'`]zoynak, zirak, quloqchin/i.test(ai));
  test('odamni TANISH taqiqlangan',
    /odamni TANIMA va ismini aytma/.test(ai) && /millat\/irq\/din haqida gapirma/.test(ai));
}

// ═══════════ SAYT UCHUN OCHIQ API ═══════════
// Bosh sahifa autentifikatsiyasiz ochiladi, shuning uchun bu
// javobga faqat VITRINAGA chiqadigan narsa tushishi kerak.
console.log('\n── SAYT MA’LUMOTI (/api/ochiq/sayt) ──');
{
  const r = await chaqirOchiq('/api/ochiq/sayt', 'GET');
  test('javob keldi', r.kod === 200, String(r.kod));
  test('brend nomi bor', typeof r.tana.brend === 'string' && r.tana.brend.length > 0,
    r.tana.brend);
  test('mahsulot ro‘yxati keladi', Array.isArray(r.tana.mahsulotlar),
    `${(r.tana.mahsulotlar || []).length} ta`);
  test('sakkiztadan oshmaydi', (r.tana.mahsulotlar || []).length <= 8);

  const p0 = (r.tana.mahsulotlar || [])[0];
  if (p0) {
    test('kartada nom, narx va rasm bor',
      p0.nom && typeof p0.narx === 'number' && p0.rasm, JSON.stringify(p0).slice(0, 90));
    test('rasm /media yo‘li orqali', /^\/media\//.test(p0.rasm));
  }

  // Sir ma'lumot chiqib ketmasin — bu yo'l HAMMAGA ochiq
  const matn = JSON.stringify(r.tana);
  test('TANNARX chiqmaydi', !/cost_price|tannarx/i.test(matn));
  test('ombor qoldig‘i chiqmaydi', !/"stock"/.test(matn));
  test('mijoz ma’lumoti chiqmaydi', !/telegram_id|"phone"/.test(matn));
  test('karta raqami chiqmaydi', !/karta_raqam/i.test(matn));

  // Sotuvda yo'q mahsulot saytda ko'rinmasligi kerak: odam ilovaga
  // o'tib «yo'q ekan» deb qaytib ketadi
  const V5 = await import('../src/services/admin-vositalar.js');
  test('faqat omborda BOR mahsulot',
    !(r.tana.mahsulotlar || []).some((x) => x.narx === 0)
      && typeof V5.VOSITALAR === 'object');
  const ochiqKod = (await import('node:fs')).readFileSync('src/api/ochiq.js', 'utf8');
  test('so‘rovda `stock > 0` sharti bor', /stock > 0/.test(ochiqKod));
  test('rasmi yo‘q mahsulot ham chiqmaydi', /poster_id is not null/.test(ochiqKod));
  test('eng ko‘p sotilgani birinchi', /order by sold_count desc/.test(ochiqKod));
}

// ═══════════ OCHIQ SKANER (INSTAGRAM) ═══════════
// «Sen menga bir link tayyorlab ber, buni Instagramga qo'yaman:
// userlar uchun face scan bo'ladi, boshqa shop qismlar ko'rinmaydi.»
console.log('\n── OCHIQ SKANER ──');
{
  const fs = await import('node:fs');
  const html = fs.readFileSync('public/skan/index.html', 'utf8');
  // Izohlar hisobga olinmaydi — ular sahifada ko'rinmaydi
  const korinadi = html.replace(/<!--[\s\S]*?-->/g, '');

  test('reklama sahifasi bor', html.length > 1000);
  test('do‘kon, savat va menyu YO‘Q',
    !/savat|do.kon|katalog|mahsulot/i.test(korinadi));
  test('bitta amal: yuzni skanerlash',
    /Kamerani yoqish/.test(korinadi) && /Galereyadan/.test(korinadi));
  test('biologik yosh va jins va’da qilinadi', /biologik yosh/i.test(korinadi));
  test('to‘liq natija TELEGRAMDA deyiladi', /To‘liq natija Telegramda/.test(korinadi));
  test('berkitilgan qism xira ko‘rsatiladi',
    /class="xira"/.test(korinadi) && /filter:blur/.test(fs.readFileSync('public/skan/style.css', 'utf8')));
  test('skaner moduli ILOVADAN olinadi — kod takrorlanmaydi',
    /src="\/app\/sifat\.js"/.test(html) && /src="\/app\/yuz\.js"/.test(html));

  const js = fs.readFileSync('public/skan/app.js', 'utf8');
  test('saqlanadigan rasm ko‘zguda', /x\.scale\(-1, 1\)/.test(js));
  test('avtomatik surat bu yerda ham bor', /sanoqniBoshla/.test(js));
  test('halqa chiroq bu yerda ham bor', /classList\.add\('yorug'\)/.test(js));

  // ── Haqiqiy so'rovlar ──
  // Oldingi yurishdan qolgan yozuvlar chegarani band qilib turmasin
  await sorov('delete from ochiq_skan');
  await sorov(`delete from users where telegram_id like 'mehmon:%'`);

  const holat = await chaqirOchiq('/api/ochiq/holat', 'GET');
  test('holat brend va qolgan limitni beradi',
    holat.kod === 200 && typeof holat.tana.qolgan === 'number',
    `${holat.tana.brend} · qolgan ${holat.tana.qolgan}`);

  const rasm = fs.readFileSync('test/namuna-yuz.b64', 'utf8').trim();
  const IP = '198.51.100.77';
  const r = await chaqirOchiq('/api/ochiq/skan', 'POST',
    { image: rasm, mime: 'image/jpeg' }, IP);
  test('ochiq skaner ishlaydi', r.kod === 200 && r.tana.yaroqli === true,
    r.tana.error || r.tana.sabab || '');
  test('ochiq qismda tavsif, yosh va jins bor',
    Boolean(r.tana.ochiq?.tavsif) && Boolean(r.tana.ochiq?.yosh)
      && Boolean(r.tana.ochiq?.jins),
    `${r.tana.ochiq?.yosh} · ${r.tana.ochiq?.jins}`);
  test('ball ham bepul ko‘rinadi', Number(r.tana.ochiq?.ball) > 0);

  // ENG MUHIMI: berkitilgan matn klientga UMUMAN ketmaydi —
  // «blur» ni brauzerda ochib bo'lmasin
  const xom = JSON.stringify(r.tana);
  test('muammo sababi va yechimi javobda YO‘Q', !/"sabab"|"yechim"/.test(xom));
  test('foizlar ham YO‘Q', !/"foiz"/.test(xom));
  test('mahsulot tavsiyasi ham YO‘Q', !/product_id|"narx"|routine/.test(xom));
  test('faqat muammo SONI va nomlari aytiladi',
    typeof r.tana.yopiq?.muammo_soni === 'number' && Array.isArray(r.tana.yopiq?.nomlar));

  test('botga TOKENLI havola qaytadi',
    /\?start=n_[0-9a-f]{32}$/.test(r.tana.havola || ''), r.tana.havola);
  test('natija rasmi oldindan chizilgan', r.tana.rasm_bor === true);

  // ── Chegara ──
  const yana = async () => (await chaqirOchiq('/api/ochiq/skan', 'POST',
    { image: rasm, mime: 'image/jpeg' }, IP)).kod;
  await yana(); await yana();
  test('bir IP kuniga uch marta', (await yana()) === 429);
  const boshqa = await chaqirOchiq('/api/ochiq/skan', 'POST',
    { image: rasm, mime: 'image/jpeg' }, '198.51.100.78');
  test('boshqa IP ga ta’sir qilmaydi', boshqa.kod === 200);

  // ── Botda tokenni olish ──
  const token = r.tana.havola.split('start=n_')[1];
  const TG = 811001;
  await sorov('delete from users where telegram_id = $1', [String(TG)]);
  yuborilgan.length = 0;
  await yangilanish({ update_id: 90001, message: { message_id: 1, date: 1,
    chat: { id: TG, type: 'private' }, from: { id: TG, first_name: 'Insta' },
    text: `/start n_${token}` } });
  const matnlar = yuborilgan.map((x) => x.text || '').join('\n');
  test('bot tokenni tanidi', /Tahlilingiz tayyor/.test(matnlar));

  const u = await qator('select * from users where telegram_id = $1', [String(TG)]);
  test('kutayotgan tahlil eslab qolindi', Boolean(u?.state_data?.kutayotgan_tahlil));
  const a = await qator('select user_id from analyses where id = $1',
    [u.state_data.kutayotgan_tahlil]);
  test('tahlil MEHMONdan yangi egasiga ko‘chdi', String(a.user_id) === String(u.id));
  test('mehmon foydalanuvchi o‘chirildi',
    !(await qator(`select 1 as b from users where telegram_id = $1`, [`mehmon:${token}`])));

  yuborilgan.length = 0;
  await yangilanish({ update_id: 90002, message: { message_id: 2, date: 1,
    chat: { id: 811002, type: 'private' }, from: { id: 811002, first_name: 'Bosqinchi' },
    text: `/start n_${token}` } });
  test('boshqa odam o‘sha tokenni OLOLMAYDI',
    /allaqachon olingan/i.test(yuborilgan.map((x) => x.text || '').join('\n')));
  await sorov('delete from users where telegram_id in ($1,$2)', ['811001', '811002']);
}

// ═══════════ BOTDA «NATIJANI OLISH» ═══════════
// «Botda eski natija rasmlarida ham har safar natijani olish
// qismi kelsin, ya'ni tugmasi.»
console.log('\n── NATIJANI QAYTA OLISH ──');
{
  const fs = await import('node:fs');
  const kb = fs.readFileSync('src/bot/keyboards.js', 'utf8');
  test('natija ostida «Natijani olish» tugmasi bor',
    /Natijani olish.*callback_data: 'natija_ol'/s.test(kb));
  test('u BIRINCHI turadi — eng ko‘p bosiladigan amal',
    /const qatorlar = \[\[\{ text: '📥 Natijani olish'/.test(kb));

  const bot = fs.readFileSync('src/bot/index.js', 'utf8');
  test('callback ulangan', /natija_ol:\s+\(chatId, user\) => skaner\.natijaniQaytaYubor/.test(bot));
  const sk = fs.readFileSync('src/bot/handlers/scanner.js', 'utf8');
  test('qayta yuborishda TAHLIL QAYTARILMAYDI — kvota yonmaydi',
    /export async function natijaniQaytaYubor/.test(sk) && !/tahlilQil/.test(
      sk.slice(sk.indexOf('export async function natijaniQaytaYubor'))));
  test('saqlangan rasm bazadan olinadi', /saqlanganRasm\(a\.id, user\.id\)/.test(sk));
  const shop = fs.readFileSync('src/bot/handlers/shop.js', 'utf8');
  test('tahlili borlarga menyuda ham chiqadi',
    /callback_data: 'natija_ol'/.test(shop));
}

// ═══════════ KARTOCHKA KODINI AI YOZADI ═══════════
// «AI yordamchi natija rasmini UI uchun to'liq kodlay olsin, avval
// men istagan UI ni yaratadi va artifact qilib beradi, men sinab
// ko'raman, yoqsa tasdiqlayman.»
console.log('\n── KARTOCHKA SHABLONI ──');
{
  const { toldir, tekshir, MAYDONLAR } = await import('../src/rasm/shablon.js');
  const { namunaMalumot, shablonMalumoti } = await import('../src/rasm/shablon-malumot.js');

  // ── Shablon tili ──
  const d = { brend: 'KiOVO', ball: 68, xulosa: 'Yaxshi', tavsif: '',
    muammolar: [{ nom: 'Akne', foiz: 65 }, { nom: 'Pora', foiz: 40 }], foydali: [] };
  test('oddiy qiymat qo‘yiladi', toldir('{{brend}}-{{ball}}', d) === 'KiOVO-68');
  test('ro‘yxat bo‘ylab takrorlanadi',
    toldir('{{#muammolar}}[{{@n}}{{nom}}]{{/}}', d) === '[1Akne][2Pora]');
  test('shart ishlaydi', toldir('{{?xulosa}}A{{/}}{{^tavsif}}B{{/}}', d) === 'AB');
  test('bo‘sh ro‘yxat chiqmaydi', toldir('{{#foydali}}X{{/}}Y', d) === 'Y');
  test('ichma-ich bloklar', toldir('{{?ball}}({{#muammolar}}{{nom}}{{/}}){{/}}', d)
    === '(AknePora)');
  test('nuqtali yo‘l', toldir('{{a.b}}', { a: { b: 'ichkarida' } }) === 'ichkarida');
  // Qatorlarni pastga tushirish — ifodasiz bo‘lmaydi, lekin `eval` ham xavfli
  test('sanoq ustida kichik hisob',
    toldir('{{#muammolar}}[{{@i*60+970}}]{{/}}', d) === '[970][1030]');
  test('manfiy qadam ham', toldir('{{#muammolar}}({{@n*-24}}){{/}}', d) === '(-24)(-48)');
  test('boshqa ifoda BAJARILMAYDI — matn bo‘lib qoladi',
    toldir('{{a + b}}', { a: 1, b: 2 }) === '{{a + b}}');
  test('matn EKRANLANADI — SVG buzilmaydi',
    toldir('{{n}}', { n: '<x>&"' }) === '&lt;x&gt;&amp;&quot;');

  // ── Xavfsizlik: AI yozgan kod SERVERDA BAJARILMAYDI ──
  const rad = (sh) => tekshir(sh).ok === false;
  test('<script> rad etiladi', rad('<svg width="1" height="1"><script>x</script></svg>'));
  test('<foreignObject> rad etiladi', rad('<svg width="1" height="1"><foreignObject/></svg>'));
  test('onclick rad etiladi', rad('<svg width="1" height="1"><rect onclick="x()"/></svg>'));
  test('tashqi manzil rad etiladi',
    rad('<svg width="1" height="1"><image href="https://x/a.png"/></svg>'));
  test('javascript: havolasi rad etiladi',
    rad('<svg width="1" height="1"><a href="javascript:x">t</a></svg>'));
  test('yopilmagan blok SAQLASHDAN OLDIN topiladi',
    rad('<svg width="1" height="1">{{#muammolar}}{{nom}}</svg>'));
  test('<svg> bo‘lmasa rad etiladi', rad('salom, bu shablon emas'));
  test('data: rasm esa RUXSAT',
    tekshir('<svg width="1080" height="10">{{brend}}{{ball}}'
      + '<image href="{{yuz}}"/></svg>').ok);

  // ── Ma'lumot ──
  const m = namunaMalumot('KiOVO');
  test('namunada hamma maydon bor',
    Object.keys(MAYDONLAR).every((k) => k in m || k === 'yuz_bor'),
    Object.keys(MAYDONLAR).filter((k) => !(k in m)).join(','));
  test('muammolar og‘irligi bo‘yicha tartiblangan',
    m.muammolar[0].foiz >= m.muammolar[1].foiz);
  test('har muammoda yuzdagi JOY bor',
    m.muammolar.every((x) => typeof x.joy_x === 'number' && typeof x.joy_y === 'number'));
  test('rang oldindan hisoblangan — shablonda hisob yo‘q',
    /^#[0-9A-F]{6}$/i.test(m.ball_rang) && m.muammolar.every((x) => /^#/.test(x.rang)));
  test('mahsulotlar tartib raqami bilan',
    m.mahsulotlar[0].tartib === 1 && m.mahsulotlar[4].tartib === 5);
  test('ovqat bandidan qavs ichidagi izoh olib tashlanadi',
    m.foydali[0].nom === 'Yog‘li baliq', m.foydali[0].nom);

  // ── AI yozgan shablon HAQIQATAN chiziladimi ──
  const { svgdanPng } = await import('../src/rasm/chiz.js');
  const namunaSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="420"
      viewBox="0 0 1080 420">
    <rect width="1080" height="420" fill="#08080A"/>
    <text x="40" y="70" font-family="Liberation Sans" font-size="42" font-weight="700"
      fill="#fff">{{brend}}</text>
    <text x="40" y="150" font-family="Liberation Sans" font-size="90" font-weight="700"
      fill="{{ball_rang}}">{{ball}}</text>
    {{?yuz_bor}}<image href="{{yuz}}" x="700" y="30" width="340" height="340"/>{{/}}
    {{#muammolar}}
      <rect x="40" y="{{@i}}" width="10" height="10" fill="{{rang}}"/>
      <text x="70" y="{{@n}}" font-family="Liberation Sans" font-size="24"
        fill="#9A9AA6">{{@n}}. {{nom}} — {{foiz}}%</text>
    {{/}}
  </svg>`;
  test('AI yozgan shablon tekshiruvdan o‘tadi', tekshir(namunaSvg).ok);
  const chizilgan = toldir(namunaSvg, m);
  test('shablonda qiymat qoladi', chizilgan.includes('KiOVO') && chizilgan.includes('68'));
  test('barcha muammo chizildi',
    (chizilgan.match(/Yallig|Kengaygan|Qizargan|Pigment|soya/g) || []).length >= 5);
  const bayt = await svgdanPng(chizilgan, 540);
  test('PNG haqiqatan chiqadi', bayt.length > 3000, `${(bayt.length / 1024).toFixed(0)} KB`);

  // ── Vositalar ──
  const V = await import('../src/services/admin-vositalar.js');
  test('yordamchida kartochka kodi vositalari bor',
    'kartochka_kodi' in V.VOSITALAR && 'kartochka_kodi_yoz' in V.VOSITALAR
      && 'kartochka_kodi_ochir' in V.VOSITALAR);
  test('yozish vositasi TASDIQ so‘raydi', V.VOSITALAR.kartochka_kodi_yoz.oqish === false);

  const yomon = await V.VOSITALAR.kartochka_kodi_yoz.ishla({ svg: '<svg><script>x</script></svg>' });
  test('xavfli shablon SAQLANMAYDI', yomon.saqlandi === false, yomon.xato);

  const yaxshi = await V.VOSITALAR.kartochka_kodi_yoz.ishla(
    { svg: namunaSvg, izoh: 'Sinov ko‘rinishi' });
  test('to‘g‘ri shablon saqlanadi', yaxshi.saqlandi === true, yaxshi.xato || '');
  test('QORALAMA bo‘lib saqlanadi — avtomatik ishlatilmaydi',
    yaxshi.holat === 'qoralama');
  test('ko‘rinish havolasi qaytadi', /\/kartochka\/[a-z0-9]+\?i=[0-9a-f]{24}$/.test(
    yaxshi.korinish || ''), yaxshi.korinish);

  const oqi = await V.VOSITALAR.kartochka_kodi.ishla({});
  test('yordamchi holatni o‘qiy oladi', oqi.holat === 'qoralama');
  test('maydonlar ro‘yxati beriladi', Object.keys(oqi.maydonlar).length > 10);
  test('qoidalar ham beriladi — AI taxmin qilmasin', oqi.qoida.length >= 6);

  // Tasdiqlanmaguncha MIJOZGA ESKI ko'rinish boradi
  const { natijaRasminiYarat } = await import('../src/services/natija-rasm.js');
  const u2 = await qator(`insert into users (telegram_id) values ('shablon-sinov')
    on conflict (telegram_id) do update set last_active = now() returning id`);
  const eski = await natijaRasminiYarat({ analysisId: null, userId: u2.id,
    rasmBase64: null, mime: 'image/jpeg',
    tahlil: { ball: 70, muammolar: [] }, mahsulotlar: [] });
  test('qoralama MIJOZGA ketmaydi', eski && eski.bayt.length > 1000);

  await V.VOSITALAR.kartochka_kodi_ochir.ishla({});
  test('shablonni o‘chirib ichki ko‘rinishga qaytish mumkin',
    (await V.VOSITALAR.kartochka_kodi.ishla({})).holat === 'yoq');
  await sorov(`delete from users where telegram_id = 'shablon-sinov'`);
}


// ══════════════ YORDAMCHI HAQIQATAN ISH QILADI ══════════════
//
// Shikoyat: «Ai yordamchi hech narsa qilolmayapti». Ekranda
// «⚠️ Hech narsa o'zgarmadi», «Bajarilmagan amallar:
// kartochka_kodi_yoz» yozuvi turardi — vaholanki shablon bazaga
// SAQLANGAN edi. Sabab: agent faqat `ozgardi` va `ochirildi`
// maydonlarini tushunardi, vosita esa `{saqlandi:true}` qaytarardi.
{
  console.log('\n── YORDAMCHI NATIJANI TO‘G‘RI O‘QIYDI ──');
  const { vositaOzgarishi } = await import('../src/services/admin-agent.js');
  test('raqamli o‘zgarish sanaladi', vositaOzgarishi({ ozgardi: 3 }) === 3);
  test('o‘chirilgan qator ham', vositaOzgarishi({ ochirildi: 2 }) === 2);
  test('«saqlandi» ham BAJARILGAN ish', vositaOzgarishi({ saqlandi: true }) === 1);
  test('«tayyor» ham — fayl yasash o‘zgarish emas, lekin ish',
    vositaOzgarishi({ tayyor: true }) === 1);
  test('«bajarildi» ham', vositaOzgarishi({ bajarildi: true }) === 1);
  test('haqiqatan hech nima bo‘lmasa — nol',
    vositaOzgarishi({ ozgardi: 0 }) === 0 && vositaOzgarishi({}) === 0
      && vositaOzgarishi(null) === 0);

  const V = await import('../src/services/admin-vositalar.js');
  const n = await V.VOSITALAR.kartochka_kodi_yoz.ishla(
    { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
         + '<rect width="10" height="10" fill="#111"/><text x="1" y="5">{{ball}}</text></svg>',
      izoh: 'sinov' });
  test('shablon saqlansa yordamchi BAJARILDI deb sanaydi',
    vositaOzgarishi(n) >= 1, JSON.stringify(n).slice(0, 120));
  test('rad etilgan shablon esa sanalmaydi',
    vositaOzgarishi(await V.VOSITALAR.kartochka_kodi_yoz.ishla(
      { svg: '<svg><script>x</script></svg>' })) === 0);
  await V.VOSITALAR.kartochka_kodi_ochir.ishla({});
  const fs2 = await import('node:fs');
  const panelJs = fs2.readFileSync('public/admin/admin.js', 'utf8');
  test('panel bajarilgan qadamning NATIJASINI ko‘rsatadi',
    /const n = q\.natija \|\| \{\}/.test(panelJs)
      && /n\.korinish \|\| n\.havola/.test(panelJs)
      && /Bajarildi — <b>\$\{soni\}<\/b> ta o‘zgarish/.test(panelJs));
}

// ══════════════ MA'LUMOTNI JSON QILIB YUKLAB OLISH ══════════════
//
// «mahsulot va baza faylini json qilib yuklab olishni ham qoshib ket»
// Yordamchi chatda HAVOLA beradi — odam bosadi va fayl tushadi.
// Admin API si Bearer sarlavhasini talab qiladi, brauzer esa oddiy
// bosishda uni yubormaydi, shuning uchun havola IMZOLANGAN.
{
  console.log('\n── JSON QILIB YUKLAB OLISH ──');
  const { eksportHavolasi, eksportOchib } = await import('../src/lib/eksport-havola.js');
  const h = eksportHavolasi(['mahsulotlar'], 'json');
  test('havola yasaladi', typeof h === 'string' && h.includes('/eksport/'), h);
  const u = new URL(h);
  const b64 = u.pathname.split('/').pop().replace(/\.(json|csv)$/, '');
  const ochildi = eksportOchib(b64, u.searchParams.get('i'));
  test('o‘z imzosi bilan ochiladi', ochildi.ok === true);
  test('nima so‘ralgani saqlanadi',
    ochildi.tur === 'json' && ochildi.bolimlar.join() === 'mahsulotlar');
  test('IMZO buzilsa ochilmaydi',
    eksportOchib(b64, 'a'.repeat(32)).ok === false);
  test('yo‘lni o‘zgartirib boshqa bo‘limni olib bo‘lmaydi',
    eksportOchib(Buffer.from('json~mijozlar~' + (Date.now() + 60000))
      .toString('base64url'), u.searchParams.get('i')).ok === false);
  const eski = Buffer.from(`json~~${Date.now() - 1000}`, 'utf8').toString('base64url');
  const eskiImzo = new URL(eksportHavolasi([], 'json')).searchParams.get('i');
  test('MUDDATI o‘tgan havola o‘lik', eksportOchib(eski, eskiImzo).ok === false);

  const V = await import('../src/services/admin-vositalar.js');
  const t1 = await V.VOSITALAR.eksport.ishla({ bolimlar: ['mahsulotlar'] });
  test('yordamchi bosiladigan havola beradi',
    t1.tayyor === true && String(t1.havola).includes('/eksport/'));
  test('bu ham BAJARILGAN ish deb sanaladi',
    (await import('../src/services/admin-agent.js')).vositaOzgarishi(t1) === 1);
  const t2 = await V.VOSITALAR.eksport.ishla({ tur: 'csv' });
  test('CSV uchun bitta bo‘lim TALAB qilinadi',
    !t2.tayyor && /bitta bo‘lim/.test(t2.xabar));
  const t3 = await V.VOSITALAR.eksport.ishla({});
  test('hammasi so‘ralsa mijozlar haqida OGOHLANTIRADI',
    /telefon/.test(t3.ogohlantirish || ''));

  // Havolaning ORQASIDA haqiqiy fayl turadi
  const { eksportYig, csvQil, BOLIMLAR } = await import('../src/services/eksport.js');
  const fayl = await eksportYig(ochildi.bolimlar);
  test('faylda mahsulotlar bor', Array.isArray(fayl.mahsulotlar));
  test('so‘ralmagan bo‘lim ICHIDA YO‘Q — mijoz telefoni tarqamaydi',
    fayl.mijozlar === undefined);
  test('fayl nima ekanini O‘ZI aytadi', fayl._haqida?.manba === 'KiOVO');
  test('Excel uchun CSV ham chiqadi',
    csvQil(await BOLIMLAR.mahsulotlar.ol()).includes(';'));

  // Server marshruti: imzoni tekshiradi va faylni YUKLAB berish
  // (attachment) qilib qaytaradi — brauzerda ochilib ketmaydi
  const fs3 = await import('node:fs');
  const srvKod = fs3.readFileSync('src/server.js', 'utf8');
  test('server /eksport/… yo‘lini biladi',
    /\^\\\/eksport\\\/\(\[A-Za-z0-9_-\]\+\)\\\.\(json\|csv\)\$/.test(srvKod));
  test('imzo har so‘rovda TEKSHIRILADI', /eksportOchib\(eksMos\[1\]/.test(srvKod));
  test('muddati o‘tgan havolaga 410 — sabab aytiladi',
    /410[\s\S]{0,160}muddati tugadi/.test(srvKod));
  test('brauzer uni SAQLAYDI — attachment',
    (srvKod.match(/Content-Disposition': `attachment/g) || []).length >= 2);
  test('kesh saqlanmaydi — havola o‘lgach fayl ham qolmaydi',
    (srvKod.slice(srvKod.indexOf('/^\\/eksport\\/'))
      .match(/'Cache-Control': 'no-store'/g) || []).length >= 2);

  const adminJs = fs3.readFileSync('public/admin/admin.js', 'utf8');
  test('panelda «Faqat mahsulotlar» tugmasi bor',
    /mahsulotlarni JSON/i.test(adminJs));
  test('panelda butun bazani olish tugmasi ham bor',
    /Butun bazani JSON/i.test(adminJs));
}


// ══════════════ YETTITA DOIMIY O'LCHOV ══════════════
//
// «Bu rasmdagi analizlar faqat bir xil chiqadimi, yuzdagi barcha
// muammolarni aniqlay olmaydimi» — ilgari ko'rsatkichlar TOPILGAN
// MUAMMOLARDAN yasalardi: terisi toza odam bitta ham ko'rsatkich
// ko'rmasdi va ikki tahlilni solishtirib bo'lmasdi.
{
  console.log('\n── TERI O‘LCHOVLARI ──');
  const fs4 = await import('node:fs');
  const O = await import('../src/lib/olchov.js');

  test('yettita o‘lchov bor', O.OLCHOVLAR.length === 7,
    O.OLCHOV_KALITLARI.join(', '));
  test('salon apparati beradigan o‘sha ro‘yxat',
    ['pora','ajin','pigment','qizarish','tekstura','namlik','yoglilik']
      .every((k) => O.OLCHOV_KALITLARI.includes(k)));

  // Terisi TOZA odam ham to'liq ko'rsatkich ko'radi
  const toza = O.olchovlarniHisobla([], null);
  test('muammo topilmasa ham yettitasi chiqadi', toza.length === 7);
  test('hammasiga baho qo‘yiladi', toza.every((o) => o.ball > 0 && o.ball <= 100));
  test('«100/100» yozilmaydi — ishonchni yo‘qotadi',
    toza.every((o) => o.ball < 100), String(toza[0].ball));

  // Muammodan hisoblash (AI o'lchov bermagan — eski tahlil)
  const bilan = O.olchovlarniHisobla(
    [{ kalit: 'teshik', foiz: 72, izoh: 'Burun atrofida kengaygan' },
     { kalit: 'akne', foiz: 40 }], null);
  const pora = bilan.find((o) => o.kalit === 'pora');
  test('muammo kuchli bo‘lsa o‘lchov PAST', pora.ball === 28, String(pora.ball));
  test('teskari emas — ball qancha yuqori, shuncha yaxshi',
    O.olchovBahosi(85) === 'A’lo' && O.olchovBahosi(25) === 'Zaif');
  test('muammoning izohi o‘lchovga ko‘chadi',
    pora.izoh === 'Burun atrofida kengaygan');
  test('muammo TEGMAGAN o‘lchov izohi bo‘sh — matn o‘ylab topilmaydi',
    bilan.find((o) => o.kalit === 'namlik').izoh === '');

  // Bir o'lchovga ikki muammo tushsa — eng kuchlisi
  const ikki = O.olchovlarniHisobla(
    [{ kalit: 'dog', foiz: 30 }, { kalit: 'qora_doira', foiz: 70 }], null);
  test('bitta o‘lchovga ikki muammo tushsa — ENG KUCHLISI',
    ikki.find((o) => o.kalit === 'pigment').ball === 30);

  // AI bergan ball muammodan hisoblanganini yengadi
  const aiBilan = O.olchovlarniHisobla([{ kalit: 'teshik', foiz: 72 }],
    { pora: 44, namlik: 91 });
  test('AI bergan ball ustun — u rasmni ko‘rgan',
    aiBilan.find((o) => o.kalit === 'pora').ball === 44);
  test('AI bermagani muammodan/zaxiradan olinadi',
    aiBilan.find((o) => o.kalit === 'ajin').ball === 82);
  test('chegaradan chiqqan raqam qisiladi',
    O.olchovlarniHisobla([], { pora: 999, ajin: -5 })
      .filter((o) => o.ball === 100 || o.ball === 0).length === 2);
  test('AI javobi tozalanadi — begona kalit o‘tmaydi',
    Object.keys(O.olchovlarniTozala({ pora: 50, zararli: 1 })).join() === 'pora');
  test('bo‘sh javob null — keyin muammodan hisoblanadi',
    O.olchovlarniTozala({}) === null && O.olchovlarniTozala(null) === null);

  // AI sxemasi
  const aiKod = fs4.readFileSync('src/ai/faceAnalysis.js', 'utf8');
  test('sxemada olchovlar MAJBURIY — model tashlab keta olmaydi',
    /required: \['sifat', 'umumiy', 'olchovlar'/.test(aiKod));
  test('modelga «yuqori = yaxshi» deb aytilgan',
    /QANCHA YUQORI BO.LSA SHUNCHA YAXSHI/.test(aiKod));
  test('modelga muammolar bilan ziddiyatsiz bo‘lishi aytilgan',
    /ZIDDIYATSIZ/.test(aiKod));
  test('dumaloq raqamlardan qochish aytilgan',
    /dumaloq sonlardan qoch/.test(aiKod));

  // Bazaga tushadimi — sahifa yangilangach yo'qolmasin
  const servis = fs4.readFileSync('src/services/analysis.js', 'utf8');
  test('o‘lchovlar BAZAGA saqlanadi', /olchovlar: a\.olchovlar/.test(servis));
  test('parhez va tavsif ham saqlanadi — ilgari yo‘qolardi',
    /tavsif: a\.tavsif/.test(servis) && /parhez: a\.parhez/.test(servis));

  // Ilovadagi nusxa serverdagisidan ajralib ketmasin
  const ilova = fs4.readFileSync('public/app/app.js', 'utf8');
  const ilovaKalitlari = [...ilova.slice(ilova.indexOf('const OLCHOVLAR = ['),
    ilova.indexOf('const MUAMMO_OLCHOVI')).matchAll(/kalit: '(\w+)'/g)].map((m) => m[1]);
  test('ilovadagi jadval server bilan BIR XIL',
    ilovaKalitlari.join() === O.OLCHOV_KALITLARI.join(),
    ilovaKalitlari.join());
  const ilovaMos = ilova.slice(ilova.indexOf('const MUAMMO_OLCHOVI'),
    ilova.indexOf('const MUAMMOSIZ'));
  test('muammo→o‘lchov jadvali ham bir xil',
    Object.entries(O.MUAMMO_OLCHOVI).every(([k, v]) =>
      new RegExp(`${k}: '${v}'`).test(ilovaMos)));
  test('ilovada ham yettitasi DOIM chiziladi',
    /olchovlarniHisobla\(t\.problems \|\| \[\], t\.raw\?\.olchovlar\)/.test(ilova)
      && !/const olchovlar = muammolar\.slice/.test(ilova));
  test('raqam yonida o‘zbekcha baho ham bor',
    /<em class="\$\{beshRang\(o\.ball\)\}">\$\{esc\(o\.baho\)\}<\/em>/.test(ilova));

  // Natija RASMIDA ham yettitasi
  const { natijaSvg } = await import('../src/rasm/natija-kartochka.js');
  const svg = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 71, muammolar: [{ kalit: 'teshik', nom: 'Teshik', foiz: 60 }],
              olchovlar: { pora: 40, namlik: 88 } } });
  test('rasmda ham yettita o‘lchov chiziladi',
    O.OLCHOVLAR.every((o) => svg.includes(o.nom)),
    O.OLCHOVLAR.map((o) => o.nom).join(', '));
  test('AI bergan ball rasmda ham ishlatiladi', svg.includes('>40<'));
  const tozaSvg = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 88, muammolar: [] } });
  test('muammosiz odamda ham ko‘rsatkichlar bo‘limi bor',
    tozaSvg.includes('Teri ko‘rsatkichlari'));
}

// ══════════════ NATIJA RASMINING TARTIBI ══════════════
//
// «Umumiy teri holati rasmning ostida bo'lsin, muammolar ustiga
// bosilsa sabab va tavsiya ko'rinsin.»
{
  console.log('\n── NATIJA RASMI: TARTIB VA TAFSILOT ──');
  const fs5 = await import('node:fs');
  const { natijaSvg } = await import('../src/rasm/natija-kartochka.js');
  const { joylarniHisobla } = await import('../src/lib/zona.js');
  const { svgdanPng } = await import('../src/rasm/chiz.js');
  const surat = fs5.readFileSync('test/namuna-yuz.b64', 'utf8').trim();

  const svg = natijaSvg({
    rasmBase64: surat, mime: 'image/jpeg', brend: 'KiOVO',
    tahlil: {
      ball: 71, taxminiy_yosh: '22-26', jins: 'erkak', teri_turi: 'aralash',
      xulosa: 'Teringiz umuman sog‘lom, T-zonada yog‘ ko‘p.',
      tavsif: 'Ko‘zoynak taqqan yigit, xona yorug‘ligida olingan surat.',
      muammolar: joylarniHisobla([
        { kalit: 'teshik', nom: 'Kengaygan teshiklar', foiz: 72, zona: 'burun',
          sabab: 'Yog‘ bezlari faol ishlaydi va teshiklar tiqilib qoladi.',
          yechim: 'Haftada ikki marta salitsil kislotali tozalagich ishlating.' },
        { kalit: 'qizarish', nom: 'Yengil qizarish', foiz: 38, zona: 'yonoq',
          sabab: 'Teri sezgir.', yechim: 'Tinchlantiruvchi toner.' },
      ]),
    },
  });

  // Umumiy holat RASM OSTIDA: SVG da <image> (surat) oldin, ball
  // halqasi bilan «UMUMIY TERI HOLATI» keyin chiziladi
  const suratJoyi = svg.indexOf('clip-path="url(#yuz)"');
  const holatJoyi = svg.indexOf('UMUMIY TERI HOLATI');
  test('umumiy holat SURAT OSTIDA', suratJoyi > 0 && holatJoyi > suratJoyi);
  test('ko‘rsatkichlar esa undan keyin',
    svg.indexOf('Teri ko‘rsatkichlari') > holatJoyi);

  // Ball kartasi to'liq kenglikda — suratning yonida emas
  const ballKarta = svg.match(/<rect x="40" y="\d+" width="1000" height="\d+" rx="26"/g) || [];
  test('ball kartasi TO‘LIQ enda', ballKarta.length >= 1, `${ballKarta.length} ta`);

  // Sabab va tavsiya rasmda ham bor
  test('muammoda SABABI ko‘rsatiladi', svg.includes('SABABI'));
  test('muammoda TAVSIYA ham', svg.includes('TAVSIYA'));
  test('sabab matni to‘liq chiqadi', /Yog. bezlari faol ishlaydi/.test(svg));
  test('tavsiya matni ham', /salitsil kislotali/.test(svg));
  test('har muammoning O‘Z balandligi bor — matn qirqilmaydi',
    /const boy = Math\.max/.test(
      fs5.readFileSync('src/rasm/natija-kartochka.js', 'utf8')));

  // Sababsiz muammo ham buzilmasin
  const sababsiz = natijaSvg({ rasmBase64: null, brend: 'KiOVO',
    tahlil: { ball: 60, muammolar: [{ kalit: 'dog', nom: 'Pigment', foiz: 40 }] } });
  test('sababi yo‘q muammo ham chiziladi', sababsiz.includes('Pigment'));
  test('bo‘sh yorliq yozilmaydi', !sababsiz.includes('SABABI'));

  // Qatlamlar ilova bilan bir xil — oltita
  const ilovaJs = fs5.readFileSync('public/app/app.js', 'utf8');
  const ilovaQ = [...ilovaJs.slice(ilovaJs.indexOf('const RENTGEN = ['),
    ilovaJs.indexOf('const KALIT_QISQA')).matchAll(/kalit: '(\w+)'/g)].map((m) => m[1]);
  const rasmKod = fs5.readFileSync('src/rasm/natija-kartochka.js', 'utf8');
  const rasmQ = [...rasmKod.slice(rasmKod.indexOf('const RENTGEN = ['),
    rasmKod.indexOf('const OYLAR')).matchAll(/kalit: '(\w+)'/g)].map((m) => m[1]);
  test('rasmdagi qatlamlar ILOVA bilan bir xil',
    rasmQ.join() === ilovaQ.join(), rasmQ.join(', '));
  test('oltalasi ham chizildi',
    rasmQ.every((k) => svg.includes(`>${k === 'asl' ? 'Asl' : ''}`) || true)
      && (svg.match(/clip-path="url\(#rk\d\)"/g) || []).length === 6);

  const bayt = await svgdanPng(svg, 1080);
  test('PNG haqiqatan chiqadi', bayt.length > 20000, `${(bayt.length / 1024).toFixed(0)} KB`);

  // Yordamchi shablon yozganda ham shu ro'yxatdan foydalanadi
  const { namunaMalumot } = await import('../src/rasm/shablon-malumot.js');
  const nm = namunaMalumot('KiOVO');
  test('shablon ma’lumotida olchovlar bor', nm.olchovlar.length === 7);
  test('har o‘lchovda rang oldindan hisoblangan',
    nm.olchovlar.every((o) => /^#[0-9A-F]{6}$/i.test(o.rang)));
  const { MAYDONLAR } = await import('../src/rasm/shablon.js');
  test('yordamchiga maydon ro‘yxatida aytiladi',
    /yettita/i.test(MAYDONLAR.olchovlar || ''));
  const V4 = await import('../src/services/admin-vositalar.js');
  test('yordamchining qoidalarida ham bor',
    (await V4.VOSITALAR.kartochka_kodi.ishla({})).qoida
      .some((r) => /olchovlar/.test(r)));
}

console.log(`\n${xato?'❌':'✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato?1:0);
