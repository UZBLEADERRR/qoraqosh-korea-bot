// Tahlil xizmati — bot ham, Mini App ham SHU funksiyani chaqiradi,
// shuning uchun ikkala kanalda natija bir xil bo'ladi.
import { db, q, logEvent } from '../db.js';
import { yuzniTahlilQil } from '../ai/faceAnalysis.js';

const KATALOG_MAYDON =
  'id,name,brand,step,price,volume,emoji,usage_text,warnings,concerns,skin_types,actives,stock,description,gradient,category_id';

export async function faolMahsulotlar() {
  return await q(
    db.from('products').select(KATALOG_MAYDON).eq('is_active', true).order('id'),
    'katalog',
  );
}

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
    await logEvent(user.id, 'scan_rejected', { sabab: natija.sabab });
    return { yaroqli: false, sabab: natija.sabab, izoh: natija.izoh };
  }

  const a = natija.natija;
  const saqlangan = await q(
    db.from('analyses').insert({
      user_id:      user.id,
      age_estimate: a.taxminiy_yosh,
      skin_tone:    a.teri_rangi,
      skin_type:    a.teri_turi,
      score:        a.ball,
      problems:     a.muammolar,
      forecast:     a.prognoz,
      routine:      a.tavsiya,
      is_offline:   Boolean(natija.oflayn),
      raw:          { xulosa: a.xulosa },
    }).select('id').single(),
    'tahlilni saqlash',
  );

  await logEvent(user.id, 'scan', { ball: a.ball, muammo: a.muammolar.length });

  return {
    yaroqli: true,
    tahlil: { ...a, oflayn: Boolean(natija.oflayn) },
    mahsulotlar,
    analysisId: saqlangan.id,
  };
}

/** Foydalanuvchining oxirgi tahlili (Mini App savatni to'ldirish uchun). */
export async function oxirgiTahlil(userId) {
  const { data } = await db.from('analyses')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data || null;
}
