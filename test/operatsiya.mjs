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
const { sorov, qator, qatorlar, qiymat, pool } = await import('../src/db.js');
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
await yoz('700001','/brend KiOVO');

console.log('\n── QO‘LLANMA HUJJATI ──');
yuborilgan.length=0;
await bos('700001', `pk:${par.id}`);
const qol = yuborilgan.find(x=>x.hujjat);
test('qo‘llanma fayli yuborildi', Boolean(qol), qol?`${(qol.hajm/1024).toFixed(1)} KB`:'');
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


console.log(`\n${xato?'❌':'✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato?1:0);
