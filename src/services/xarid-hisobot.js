// Xarid ro'yxati — admin panel uchun.
//
// Botdagi /orders bitta partiyani ko'rsatadi. Bu yerda esa istalgan
// oraliq va istalgan holat bo'yicha: nimadan nechta kerak, qaysi
// viloyatga qancha ketadi. Ikkita savolga javob beradi:
//
//   1. «Koreyadan nimadan nechta olaman?» — mahsulot bo'yicha jami.
//   2. «Qaysi viloyatga qancha jo'nataman?» — pochtani rejalashtirish.
//
// Jamlash SQL da: buyurtma minglab bo'lganda ham hammasini Node ga
// tortib olib sanash xotirani yeydi va sekinlashadi.
import { qatorlar } from '../db.js';

// jsonb massivdagi har elementni qatorga yoyamiz va faqat haqiqiy
// product_id li qatorlarni olamiz (eski buyurtmalarda u yo'q bo'lishi
// mumkin — o'shanda nom bo'yicha jamlanadi).
const ELEMENTLAR = `
  select o.id            as buyurtma_id,
         o.viloyat,
         coalesce(nullif(e->>'product_id',''), '') as xom_id,
         coalesce(nullif(e->>'name',''), 'Nomsiz') as nom,
         coalesce((e->>'qty')::numeric, 0)         as soni,
         coalesce((e->>'price')::numeric, 0)       as narx
    from orders o, lateral jsonb_array_elements(o.items) e
   where o.status = any($1) and o.created_at >= $2 and o.created_at < $3`;

/**
 * @param {object} f
 * @param {string[]} f.holatlar   qaysi holatdagi buyurtmalar
 * @param {string}   f.dan        ISO sana (kiritiladi)
 * @param {string}   f.gacha      ISO sana (kiritilmaydi)
 * @param {string}   [f.viloyat]  faqat shu viloyat
 */
export async function xaridHisoboti({ holatlar, dan, gacha, viloyat = '' }) {
  const p = [holatlar, dan, gacha];
  const viloyatShart = viloyat ? ' and o.viloyat = $4' : '';
  if (viloyat) p.push(viloyat);

  const [mahsulotlar, viloyatlar, jami] = await Promise.all([
    // ── Mahsulot bo'yicha: nechta dona, nechta buyurtmada, qancha pul
    qatorlar(`
      with e as (${ELEMENTLAR}${viloyatShart})
      select case when x.xom_id ~ '^[0-9]+$' then x.xom_id::bigint end as product_id,
             coalesce(p.name, x.nom)  as nom,
             coalesce(p.brand, '')    as brend,
             coalesce(p.step, '')     as bosqich,
             coalesce(p.manba, '')    as manba,
             coalesce(p.manba_url,'') as manba_url,
             coalesce(p.stock, 0)     as ombor,
             sum(x.soni)::int                     as dona,
             count(distinct x.buyurtma_id)::int   as buyurtma,
             sum(x.soni * x.narx)::bigint         as summa,
             (sum(x.soni) * max(coalesce(p.cost_price, 0)))::bigint as tannarx
        from e x
        left join products p
          on x.xom_id ~ '^[0-9]+$' and p.id = x.xom_id::bigint
       group by 1, 2, 3, 4, 5, 6, 7
       order by dona desc, nom`, p),

    // ── Viloyat bo'yicha: nechta buyurtma, nechta dona, qancha pul
    qatorlar(`
      with e as (${ELEMENTLAR}${viloyatShart})
      select coalesce(nullif(x.viloyat, ''), 'Ko‘rsatilmagan') as viloyat,
             count(distinct x.buyurtma_id)::int as buyurtma,
             sum(x.soni)::int                   as dona,
             sum(x.soni * x.narx)::bigint       as summa
        from e x
       group by 1
       order by buyurtma desc, viloyat`, p),

    qatorlar(`
      select count(*)::int as buyurtma,
             coalesce(sum(o.total), 0)::bigint      as summa,
             coalesce(sum(o.cost_total), 0)::bigint as tannarx
        from orders o
       where o.status = any($1) and o.created_at >= $2 and o.created_at < $3
         ${viloyat ? 'and o.viloyat = $4' : ''}`, p),
  ]);

  const dona = mahsulotlar.reduce((s, x) => s + Number(x.dona || 0), 0);
  return {
    mahsulotlar,
    viloyatlar,
    jami: { ...(jami[0] || { buyurtma: 0, summa: 0, tannarx: 0 }), dona,
            xil: mahsulotlar.length },
  };
}

/** Bitta viloyatdagi mahsulotlar — qatorni ochganda ko'rinadi. */
export const viloyatMahsulotlari = (viloyat, f) =>
  xaridHisoboti({ ...f, viloyat }).then((r) => r.mahsulotlar);

/** Havolasi yo'q mahsulotlar soni — «hali link kiritilmagan» ogohlantirishi. */
export const havolasizSoni = (mahsulotlar) =>
  mahsulotlar.filter((x) => x.product_id && !x.manba_url).length;

// ── CSV ──
// Excel o'zbekcha harflarni to'g'ri ochishi uchun BOM kerak, ajratgich
// esa nuqta-vergul: Excel ning ruscha/o'zbekcha lokalida vergul o'nlik
// belgisi bo'lgani uchun ustunlar aralashib ketadi.
const csvXona = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const csv = (sarlavhalar, satrlar) =>
  '﻿' + [sarlavhalar, ...satrlar].map((q) => q.map(csvXona).join(';')).join('\r\n');

/** Xarid ro'yxati CSV — Koreyaga xaridga chiqishdan oldin print qilinadi. */
export function mahsulotCsv(mahsulotlar) {
  return csv(
    ['#', 'Mahsulot', 'Brend', 'Dona', 'Buyurtma', 'Summa', 'Tannarx', 'Ombor', 'Manba', 'Havola'],
    mahsulotlar.map((x, i) => [
      i + 1, x.nom, x.brend, x.dona, x.buyurtma, x.summa, x.tannarx, x.ombor,
      x.manba, x.manba_url,
    ]));
}

/** Viloyatlar CSV — pochta va logistika uchun. */
export function viloyatCsv(viloyatlar) {
  return csv(['#', 'Viloyat', 'Buyurtma', 'Dona', 'Summa'],
    viloyatlar.map((x, i) => [i + 1, x.viloyat, x.buyurtma, x.dona, x.summa]));
}
