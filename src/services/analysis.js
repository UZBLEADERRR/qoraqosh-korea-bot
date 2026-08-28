// Tahlil xizmati — bot ham, Mini App ham SHU funksiyani chaqiradi,
// shuning uchun ikkala kanalda natija bir xil bo'ladi.
import { qatorlar, qator, hodisa } from '../db.js';
import { yuzniTahlilQil } from '../ai/faceAnalysis.js';

const KATALOG_SQL = `
  select p.id, p.name, p.brand, p.step, p.price, p.volume, p.emoji, p.usage_text,
         p.warnings, p.concerns, p.skin_types, p.actives, p.stock, p.description,
         p.gradient, p.category_id, p.poster_id
    from products p
   where p.is_active
   order by p.id`;

export const faolMahsulotlar = () => qatorlar(KATALOG_SQL);

/**
 * Rasmni tahlil qiladi va natijani bazaga yozadi.
 * @returns {{yaroqli:boolean, sabab?:string, izoh?:string,
 *            tahlil?:object, mahsulotlar?:object[], analysisId?:number}}
 */
export async function tahlilQil(user, base64, mime) {
  const mahsulotlar = await faolMahsulotlar();
  const omborda = mahsulotlar.filter((p) => p.stock > 0);

  const natija = await yuzniTahlilQil(base64, mime, omborda.length ? omborda : mahsulotlar);

  if (!natija.yaroqli) {
    await hodisa(user.id, 'scan_rejected', { sabab: natija.sabab });
    return { yaroqli: false, sabab: natija.sabab, izoh: natija.izoh };
  }

  const a = natija.natija;
  const saqlangan = await qator(
    `insert into analyses
       (user_id, age_estimate, skin_tone, skin_type, score, problems, forecast, routine, is_offline, raw)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id`,
    [user.id, a.taxminiy_yosh, a.teri_rangi, a.teri_turi, a.ball,
     JSON.stringify(a.muammolar), JSON.stringify(a.prognoz), JSON.stringify(a.tavsiya),
     Boolean(natija.oflayn), JSON.stringify({ xulosa: a.xulosa })],
  );

  await hodisa(user.id, 'scan', { ball: a.ball, muammo: a.muammolar.length });

  return {
    yaroqli: true,
    tahlil: { ...a, oflayn: Boolean(natija.oflayn) },
    mahsulotlar,
    analysisId: saqlangan.id,
  };
}

/** Foydalanuvchining oxirgi tahlili. */
export const oxirgiTahlil = (userId) =>
  qator('select * from analyses where user_id = $1 order by created_at desc limit 1', [userId]);
