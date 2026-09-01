// Sotuv narxini hisoblash qoidasi.
//
//   narx = tannarx + yetkazish + sof foyda
//
//   tannarx    — Koreyadagi narx (KRW) kursga ko'paytiriladi
//   yetkazish  — har boshlangan 100 gramm uchun belgilangan summa
//   sof foyda  — (tannarx + yetkazish) dan foiz, MIN va MAX bilan cheklangan
//
// Min va max nima uchun: arzon va kichik tovarda foiz juda kam chiqadi —
// mahsulotni qidirish, buyurtma qilish va qadoqlash mehnati qoplanmaydi.
// Qimmat kremda esa aksincha, foiz haddan tashqari ko'p chiqib, narx
// raqobatbardosh bo'lmay qoladi.

export const NARX_QOIDASI = {
  krw_kurs:       9.5,     // 1 KRW necha so'm
  yetkazish_100g: 15000,   // har boshlangan 100 g uchun
  foyda_foiz:     35,      // tannarx + yetkazishdan
  foyda_min:      30000,   // kichik tovarlar uchun
  foyda_max:      50000,   // krem va shunga o'xshashlar uchun
  yaxlitlash:     1000,    // yakuniy narx shu songacha yaxlitlanadi
};

const son = (v, zaxira) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : zaxira;
};

/** Sozlamadagi xom obyektni to'liq qoidaga aylantiradi. */
export function qoidaniTozala(xom = {}) {
  const q = { ...NARX_QOIDASI };
  for (const k of Object.keys(NARX_QOIDASI)) q[k] = son(xom?.[k], NARX_QOIDASI[k]);
  // Yaxlitlash 0 bo'lsa bo'lish xatosi chiqardi
  if (q.yaxlitlash < 1) q.yaxlitlash = 1;
  if (q.foyda_max < q.foyda_min) q.foyda_max = q.foyda_min;
  return q;
}

/**
 * Sotuv narxi va uning tarkibi.
 *
 * @param {object} p
 * @param {number} [p.krw]      Koreyadagi narx (won). tannarx bilan birga
 *                              berilsa KRW ustun turadi.
 * @param {number} [p.tannarx]  to'g'ridan-to'g'ri so'mdagi tannarx
 * @param {number} p.gramm      mahsulot og'irligi (qadoqsiz)
 * @param {object} [qoida]
 * @returns {{narx:number, tannarx:number, yetkazish:number, foyda:number,
 *            marja:number, kg100:number}}
 */
export function narxHisobla({ krw, tannarx, gramm }, qoida = NARX_QOIDASI) {
  const q = qoidaniTozala(qoida);

  const asos = krw != null && Number.isFinite(Number(krw))
    ? Math.round(Number(krw) * q.krw_kurs)
    : Math.max(0, Math.round(Number(tannarx) || 0));

  // Har BOSHLANGAN 100 gramm: 130 g ham ikki bo'lakka to'lanadi,
  // chunki pochta ham to'liq bosqichlar bilan hisoblaydi
  const kg100 = Math.max(1, Math.ceil(Math.max(0, Number(gramm) || 0) / 100));
  const yetkazish = kg100 * q.yetkazish_100g;

  const xomFoyda = Math.round((asos + yetkazish) * q.foyda_foiz / 100);
  const foyda = Math.min(q.foyda_max, Math.max(q.foyda_min, xomFoyda));

  const xomNarx = asos + yetkazish + foyda;
  const narx = Math.ceil(xomNarx / q.yaxlitlash) * q.yaxlitlash;

  return {
    narx,
    tannarx: asos,
    yetkazish,
    // Yaxlitlashdan chiqqan ortiqcha ham foydaga qo'shiladi
    foyda: narx - asos - yetkazish,
    marja: narx ? Math.round(((narx - asos) / narx) * 100) : 0,
    kg100,
  };
}
