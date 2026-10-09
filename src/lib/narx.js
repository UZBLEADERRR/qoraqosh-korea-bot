// Sotuv narxini hisoblash qoidasi.
//
//   narx = tannarx + yo'lkira + sof foyda
//
//   tannarx   — Koreyadagi narx (KRW) kursga ko'paytiriladi
//   yo'lkira  — Koreyadan olib kelish: OG'IRLIKKA MUTANOSIB, eng kami
//               `yetkazish_min`. Qalam, lab bo'yog'i kabi 5–30 grammlik
//               tovarga 2 000–5 000 so'm tushadi. Ilgari har BOSHLANGAN
//               100 g uchun to'liq 15 000 olinardi — 10 grammlik qalam
//               ham 15 000 «yo'l haqi» to'lardi, bu esa narxni sun'iy
//               oshirib, raqobatdan chiqarardi. Yuk butun posilka bo'lib
//               kilolab to'lanadi, ya'ni har tovarga og'irligiga yarasha
//               ulush tushadi — mutanosib hisob shuning uchun to'g'ri.
//   sof foyda — FAQAT TANNARXDAN foiz (yo'lkira foydaga aralashmaydi),
//               eng kam / eng ko'p summa bilan, ustidan esa
//               `foyda_chegara_foiz` — «hech bir mahsulotda yo'lkiradan
//               tashqari foyda 30% dan oshmasin» degan qat'iy chegara.
//               Chegara MIN dan ham ustun: arzon tovarda eng kam foyda
//               30 000 bo'lsa ham, chegara undan oshirishga yo'l qo'ymaydi.

export const NARX_QOIDASI = {
  krw_kurs:           9.5,     // 1 KRW necha so'm
  yetkazish_100g:     15000,   // yo'lkira stavkasi: 100 g uchun
  yetkazish_min:      2000,    // eng yengil tovarga ham shuncha
  foyda_foiz:         35,      // sof foyda — tannarxdan
  foyda_min:          30000,   // kichik tovarlar uchun (chegara undan ustun)
  foyda_max:          50000,   // krem va shunga o'xshashlar uchun
  foyda_chegara_foiz: 0,       // 0 — cheklovsiz; 30 — tannarxning 30% idan oshmaydi
  yaxlitlash:         1000,    // yakuniy narx shu songacha yaxlitlanadi
};

// Og'irligi noma'lum tovar — o'rtacha kosmetika og'irligi deb olinadi
export const TAXMINIY_GRAMM = 100;

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
  if (q.foyda_chegara_foiz > 500) q.foyda_chegara_foiz = 500;
  return q;
}

/** Yo'lkira: og'irlikka mutanosib, 500 so'mgacha yaxlitlangan, eng kami `yetkazish_min`. */
export function yolkira(gramm, qoida = NARX_QOIDASI) {
  const q = qoidaniTozala(qoida);
  const g = Number(gramm) > 0 ? Number(gramm) : TAXMINIY_GRAMM;
  return Math.max(q.yetkazish_min, Math.ceil((g * q.yetkazish_100g) / 100 / 500) * 500);
}

/**
 * «50 ml», «30g», «120 гр» — hajmdan og'irlikni taxmin qiladi (qadoq
 * bilan ~15% og'irroq). Topilmasa null.
 */
export function ogirlikTaxmini(hajm) {
  const t = String(hajm || '').toLowerCase().replace(',', '.');
  const m = t.match(/(\d+(?:\.\d+)?)\s*(ml|мл|g|gr|г|гр|gramm|kg|кг|l|л)(?![a-zа-я])/);
  if (!m) return null;
  let n = Number(m[1]);
  if (/^(kg|кг|l|л)$/.test(m[2])) n *= 1000;
  // «10 x 20 g» — to'plam: o'nta yigirma grammlik
  const k = t.match(/^\s*(\d{1,4})\s*[x×*]\s*\d/);
  if (k) n *= Number(k[1]);
  return n > 0 ? Math.round(n * 1.15) : null;
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
 *            foyda_foiz:number, marja:number}}
 */
export function narxHisobla({ krw, tannarx, gramm }, qoida = NARX_QOIDASI) {
  const q = qoidaniTozala(qoida);

  const asos = krw != null && Number.isFinite(Number(krw))
    ? Math.round(Number(krw) * q.krw_kurs)
    : Math.max(0, Math.round(Number(tannarx) || 0));

  const yetkazish = yolkira(gramm, q);

  let foyda = Math.min(q.foyda_max, Math.max(q.foyda_min, Math.round(asos * q.foyda_foiz / 100)));
  const chegara = q.foyda_chegara_foiz > 0 ? Math.floor(asos * q.foyda_chegara_foiz / 100) : Infinity;
  foyda = Math.min(foyda, chegara);

  const xomNarx = asos + yetkazish + foyda;
  let narx = Math.ceil(xomNarx / q.yaxlitlash) * q.yaxlitlash;
  // Yaxlitlash ham chegarani buzmasin: pastga yaxlitlaymiz, lekin
  // tannarx + yo'lkiradan pastga tushmaymiz
  if (narx - asos - yetkazish > chegara) {
    narx = Math.max(Math.floor(xomNarx / q.yaxlitlash) * q.yaxlitlash, asos + yetkazish);
  }

  const sof = narx - asos - yetkazish;
  return {
    narx,
    tannarx: asos,
    yetkazish,
    // Yaxlitlashdan chiqqan ortiqcha ham foydaga qo'shiladi
    foyda: sof,
    // Sof foyda tannarxga nisbatan — admin «marja 30%» deganda shuni nazarda tutadi
    foyda_foiz: asos ? Math.round((sof / asos) * 1000) / 10 : 0,
    // Sotuv narxidagi ulush (yo'lkirasiz)
    marja: narx ? Math.round((sof / narx) * 100) : 0,
  };
}
