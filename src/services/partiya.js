// Xarid partiyalari.
//
// Ish jarayoni:
//   1. Mijozlar buyurtma beradi va to'lovni tasdiqlaydi.
//   2. Admin botda /orders yozadi — hali xarid qilinmagan barcha buyurtmalar
//      MAHSULOT BO'YICHA jamlanadi: "Suncream × 5" va Coupang/Daiso havolasi.
//   3. Admin Koreyadagi saytlardan xarid qiladi va «Qabul qilindi» ni bosadi.
//      Shu ondagi buyurtmalar bitta partiyaga biriktiriladi va ro'yxatdan
//      chiqadi. Keyin kelganlari yangi ro'yxatga yig'ila boshlaydi.
import { qator, qatorlar, sorov, tranzaksiya } from '../db.js';
import { esc } from '../bot/format.js';

// Faqat to'lovi tasdiqlangan buyurtma xaridga tushadi: pul kelmagan
// buyurtma uchun Koreyadan mahsulot sotib olinmaydi.

/**
 * Ochiq partiyani topadi (yoki yaratadi) va unga hali biriktirilmagan
 * to'langan buyurtmalarni qo'shadi.
 *
 * Nega shu yerda biriktiramiz: «Qabul qilindi» tugmasi bosilganda qaysi
 * buyurtmalar ro'yxatda bo'lganini ANIQ bilishimiz kerak. Tugmaning
 * callback_data si 64 baytdan oshmaydi, ya'ni ID ro'yxatini u yerga
 * sig'dirib bo'lmaydi. Shuning uchun bog'lanish bazada turadi.
 */
export async function ochiqPartiya() {
  return tranzaksiya(async (mijoz) => {
    let { rows: [p] } = await mijoz.query(
      `select * from partiyalar where holat = 'ochiq' order by created_at limit 1`);

    if (!p) {
      // Bo'sh partiya yaratmaymiz: admin kuniga bir necha marta /orders
      // yozsa, bazada ishlatilmagan raqamlar to'planib qolardi.
      const { rows: [bormi] } = await mijoz.query(
        `select 1 from orders where partiya_id is null and status = 'tasdiqlangan' limit 1`);
      if (!bormi) return null;

      ({ rows: [p] } = await mijoz.query(
        `insert into partiyalar (raqam, holat)
         values ('P-' || to_char(now() at time zone 'Asia/Tashkent', 'YYMMDD') || '-' ||
                 lpad(nextval('partiya_seq')::text, 2, '0'), 'ochiq') returning *`));
    }
    await mijoz.query(
      `update orders set partiya_id = $1
        where partiya_id is null and status = 'tasdiqlangan'`, [p.id]);
    return p;
  });
}

/** Xarid qilinishi kerak bo'lgan mahsulotlar, dona bo'yicha jamlangan. */
export async function xaridRoyxati(partiyaId) {
  const buyurtmalar = await qatorlar(
    `select o.id, o.order_no, o.items from orders o
      where o.partiya_id = $1 and o.status = 'tasdiqlangan' order by o.created_at`, [partiyaId]);

  // items — jsonb massiv: [{product_id, name, qty, price}]
  //
  // product_id ishonchsiz bo'lishi mumkin (eski buyurtma, qo'lda tuzatilgan
  // qator). Uni RAQAM deb hisoblab to'g'ridan-to'g'ri `id = any(...)` ga
  // bersak Postgres «invalid input syntax for type bigint: NaN» deb
  // yiqilardi va /orders admin uchun JIM qolardi. Endi bunday qator
  // ro'yxatdan tushib qolmaydi — nomi bo'yicha alohida jamlanadi.
  const jam = new Map();
  for (const o of buyurtmalar) {
    const elementlar = Array.isArray(o.items) ? o.items : [];
    for (const it of elementlar) {
      const xom = Number(it?.product_id);
      const id  = Number.isFinite(xom) && xom > 0 ? xom : null;
      const kalit = id ?? `nom:${String(it?.name || 'nomsiz').toLowerCase()}`;
      const bor = jam.get(kalit)
        || { product_id: id, nom: it?.name || 'Nomsiz mahsulot', soni: 0, summa: 0 };
      bor.soni  += Number(it?.qty) || 0;
      bor.summa += (Number(it?.price) || 0) * (Number(it?.qty) || 0);
      jam.set(kalit, bor);
    }
  }
  if (!jam.size) return { buyurtmalar, qatorlar: [], jami: 0 };

  // Manba havolasini katalogdan olamiz
  const idlar = [...jam.values()].map((x) => x.product_id).filter((x) => x !== null);
  const mahsulotlar = idlar.length ? await qatorlar(
    `select id, name, brand, manba, manba_url, cost_price from products where id = any($1)`,
    [idlar]) : [];
  const karta = new Map(mahsulotlar.map((p) => [Number(p.id), p]));

  const royxat = [...jam.values()].map((x) => {
    const p = (x.product_id !== null && karta.get(x.product_id)) || {};
    return {
      ...x,
      nom: p.name || x.nom,
      brend: p.brand || '',
      manba: p.manba || '',
      manba_url: p.manba_url || '',
      tannarx: (Number(p.cost_price) || 0) * x.soni,
    };
  }).sort((a, b) => b.soni - a.soni);

  return {
    buyurtmalar,
    qatorlar: royxat,
    jami: royxat.reduce((s, x) => s + x.tannarx, 0),
  };
}

const MANBA_EMOJI = { coupang: '🛒', daiso: '🏪', boshqa: '🔗' };

/** Kanalga tushadigan xarid ro'yxati (HTML). */
export function xaridMatni({ qatorlar: royxat, buyurtmalar, jami }, sarlavha = '🧾 <b>XARID RO‘YXATI</b>') {
  if (!royxat.length) {
    return `${sarlavha}\n\n✅ Hozircha xarid qilinadigan yangi buyurtma yo‘q.`;
  }
  const satr = royxat.map((x, i) => {
    const nom = `${esc(x.brend ? x.brend + ' · ' : '')}${esc(x.nom)}`;
    // Havola bo'lsa nomni bosiladigan qilamiz — xodim to'g'ri sahifaga o'tadi
    const bosh = x.manba_url
      ? `<a href="${esc(x.manba_url)}">${nom}</a> ${MANBA_EMOJI[x.manba] || '🔗'}`
      : `${nom} <i>(havola yo‘q)</i>`;
    return `${i + 1}. ${bosh}\n    <b>${x.soni} dona</b>`;
  }).join('\n');

  return [
    sarlavha, '',
    `📦 ${buyurtmalar.length} ta buyurtma · ${royxat.length} xil mahsulot`, '',
    satr, '',
    `💵 Taxminiy tannarx: <b>${jami.toLocaleString('ru-RU').replace(/ /g, ' ')} so‘m</b>`,
  ].join('\n');
}

/**
 * «Qabul qilindi» — partiya yopiladi, buyurtmalar qadoqlashga o'tadi.
 * Keyin kelgan buyurtmalar partiya_id siz qoladi va keyingi /orders
 * ularni yangi partiyaga yig'adi.
 */
export async function partiyaniQabulQil(partiyaId) {
  return tranzaksiya(async (mijoz) => {
    const { rows: [p] } = await mijoz.query(
      `update partiyalar set holat = 'qabul_qilingan', qabul_sana = now()
        where id = $1 and holat = 'ochiq' returning *`, [partiyaId]);
    if (!p) return null;                      // allaqachon bosilgan

    const { rowCount } = await mijoz.query(
      `update orders set status = 'qadoqlanmoqda', updated_at = now()
        where partiya_id = $1 and status = 'tasdiqlangan'`, [partiyaId]);

    return { partiya: p, soni: rowCount };
  });
}

/** Partiyadagi buyurtmalar — manzil hujjati va holat almashtirish uchun. */
export const partiyaBuyurtmalari = (partiyaId) => qatorlar(
  `select o.*, u.username
     from orders o join users u on u.id = o.user_id
    where o.partiya_id = $1 order by o.created_at`, [partiyaId]);

export const partiyaniOl = (id) => qator('select * from partiyalar where id = $1', [id]);

export const oxirgiPartiyalar = (limit = 20) => qatorlar(
  `select p.*, count(o.id)::int as buyurtma_soni,
          coalesce(sum(o.total), 0)::bigint as summa
     from partiyalar p left join orders o on o.partiya_id = p.id
    group by p.id order by p.created_at desc limit $1`, [limit]);

/** Butun partiyaning holatini birdaniga o'zgartirish. */
export const partiyaHolati = (partiyaId, holat) => sorov(
  `update orders set status = $1, updated_at = now()
    where partiya_id = $2 and status <> 'bekor'`, [holat, partiyaId]);
