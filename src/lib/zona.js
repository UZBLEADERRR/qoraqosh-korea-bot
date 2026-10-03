// Yuzdagi zonani MATNDAN topish.
//
// AI koordinata bermaydi — u «yonoqlarning yuqori qismi» deb yozadi.
// Shu matndan yuzdagi joyni chamalaymiz va o'sha joyga raqamli
// nishon qo'yamiz.
//
// Sonlar YUZ QUTISIGA nisbatan foizda: 0 — qutining tepasi
// (peshona), 100 — iyak. Ilgari ular butun RASMGA nisbatan edi va
// shu sababli «peshona» belgisi sochga tushib qolardi.
//
// Bu fayl SERVER uchun (natija kartochkasi). Ilovada ayni shu
// jadval `public/app/app.js` ichida takrorlangan — u brauzerga
// oddiy <script> bilan yuklanadi va modul import qila olmaydi.
// Ikkalasi mos ekanini sinov tekshiradi.

export const ZONA_JOY = [
  [/peshona|peshana/i,            50, 15],
  [/t-?zona/i,                    50, 35],
  [/burun/i,                      50, 51],
  [/chakka/i,                      8, 27],
  [/qosh/i,                       32, 27],
  [/ko[‘'`ʻ]?z\s*ost|qora\s*doira/i, 28, 44],
  [/ko[‘'`ʻ]?z|qovoq/i,           28, 39],
  [/yonoq|yuz\s*yon/i,            16, 56],
  [/lab|og[‘'`ʻ]?iz|dahan/i,      50, 81],
  [/iyak|jag[‘'`ʻ]?|engak/i,      50, 91],
  [/bo[‘'`ʻ]?yin/i,               50, 109],
];

// Yuz topilmaganda: o'rtacha selfida yuz taxminan shu joyda turadi
// (rasm foizida). Serverda yuz aniqlagich yo'q, shuning uchun
// kartochkada doim shu taxmin ishlatiladi; ilovada esa haqiqiy
// quti topilsa nishonlar aniqroq joyga suriladi.
export const YUZ_TAXMIN = { x: 12, y: 5, en: 76, boy: 80 };

/**
 * @param {string} matn      zona tavsifi
 * @param {number} tartib    ro'yxatdagi o'rni (tomon aytilmasa navbat uchun)
 * @param {{x,y,en,boy}} [yuz]  yuz qutisi RASM FOIZIDA
 * @returns {{x:number,y:number}} rasm foizida
 */
export function zonaJoyi(matn, tartib, yuz) {
  const s = String(matn || '');
  let joy = null;
  for (const [re, x, y] of ZONA_JOY) if (re.test(s)) { joy = { x, y }; break; }
  if (!joy) joy = { x: 50, y: 45 + (tartib % 3) * 17 };
  if (joy.x !== 50) {
    const ong = /o[‘'`ʻ]?ng/i.test(s) || (!/chap/i.test(s) && tartib % 2 === 1);
    joy = { x: ong ? 100 - joy.x : joy.x, y: joy.y };
  }
  const q = yuz || YUZ_TAXMIN;
  return {
    x: Math.round(Math.max(3, Math.min(97, q.x + (joy.x / 100) * q.en))),
    y: Math.round(Math.max(3, Math.min(97, q.y + (joy.y / 100) * q.boy))),
  };
}

/**
 * Ustma-ust tushgan belgilarni ajratadi.
 *
 * AI ba'zan ikki muammoni bir zonaga bog'laydi. Belgilar bir
 * nuqtaga tushsa, ikkinchisi birinchisining tagida qolib ketadi.
 */
export function joyniAjrat(joy, olingan, engKam = 9) {
  const uzoqmi = (p) => olingan.every((o) => Math.hypot(o.x - p.x, o.y - p.y) >= engKam);
  if (uzoqmi(joy)) return joy;
  for (let halqa = 1; halqa <= 3; halqa++) {
    const r = engKam * halqa;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + halqa;
      const p = {
        x: Math.max(6, Math.min(94, Math.round(joy.x + Math.cos(a) * r))),
        y: Math.max(6, Math.min(94, Math.round(joy.y + Math.sin(a) * r * 0.8))),
      };
      if (uzoqmi(p)) return p;
    }
  }
  return joy;
}

/**
 * Muammolar ro'yxatiga `joy` qo'shadi — og'irligi bo'yicha tartiblab.
 *
 * Joy tartibi: (1) AI ko'rsatgan aniq nuqta (`m.nuqta`, rasm foizida) —
 * u rasmni ko'rgan; (2) bo'lmasa zona matni, lekin AI bergan YUZ
 * QUTISI bo'yicha; (3) u ham bo'lmasa taxminiy quti. Ilgari doim (3)
 * ishlatilardi: yuz rasm o'rtasida bo'lmasa belgilar sochga tushardi.
 */
export function joylarniHisobla(muammolar, yuz = null) {
  const olingan = [];
  return (muammolar || [])
    .map((m) => ({ ...m, foiz: Math.round(Number(m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25))) }))
    .sort((a, b) => b.foiz - a.foiz)
    .map((m, i) => {
      const aniq = m.nuqta && Number.isFinite(m.nuqta.x) && Number.isFinite(m.nuqta.y)
        ? { x: m.nuqta.x, y: m.nuqta.y } : null;
      const joy = joyniAjrat(aniq || zonaJoyi(m.zona || m.nom, i, yuz || undefined), olingan, aniq ? 5 : 9);
      olingan.push(joy);
      return { ...m, joy };
    });
}

/* ZONA VA NUQTA MOSMI.
 *
 * AI ikki narsa aytadi: matnda zona («yonoqlar») va rasmda nuqta. Ular
 * ba'zan bir-biriga zid: zona «iyak», nuqta esa peshonada. Bunday nuqta
 * ishonchsiz — uni tashlab, belgini zona matni bo'yicha qo'yamiz.
 *
 * Nuqta yuz qutisiga nisbatan (u — chapdan, v — tepadan, 0..1) olinadi.
 * Chegaralar ataylab KENG: maqsad aniq zid holatni ushlash, ozgina
 * chetga chiqqan to'g'ri nuqtani tashlash emas. Zona matnida bir nechta
 * joy bo'lsa («yonoqlar va burun») — birortasiga mos kelsa yetarli.
 */
const ZONA_SOHA = [
  [/peshona|peshana/i,                        (u, v) => v <= 0.45],
  [/t-?zona/i,                                (u, v) => v <= 0.75 && u >= 0.25 && u <= 0.75],
  [/burun/i,                                  (u, v) => v >= 0.25 && v <= 0.8 && u >= 0.25 && u <= 0.75],
  [/chakka/i,                                 (u, v) => v <= 0.6 && (u <= 0.35 || u >= 0.65)],
  [/qosh/i,                                   (u, v) => v >= 0.12 && v <= 0.5],
  [/ko[‘'`ʻ]?z|qovoq|qora\s*doira/i,         (u, v) => v >= 0.2 && v <= 0.65],
  [/yonoq|yuz\s*yon/i,                       (u, v) => v >= 0.3 && v <= 0.9 && (u <= 0.47 || u >= 0.53)],
  [/lab|og[‘'`ʻ]?iz|dahan/i,                  (u, v) => v >= 0.55 && u >= 0.2 && u <= 0.8],
  [/iyak|jag[‘'`ʻ]?|engak/i,                  (u, v) => v >= 0.6],
  [/bo[‘'`ʻ]?yin/i,                           (u, v) => v >= 0.85],
];

/**
 * @param {string} zona   AI yozgan zona matni
 * @param {{x,y}} nuqta   rasm foizida
 * @param {{x,y,en,boy}} yuz  yuz qutisi rasm foizida
 * @returns {boolean} nuqta zonaga zid emas (yoki tekshirib bo'lmaydi)
 */
export function zonaMosmi(zona, nuqta, yuz) {
  if (!nuqta || !yuz || !(yuz.en > 0) || !(yuz.boy > 0)) return true;
  const sohalar = ZONA_SOHA.filter(([re]) => re.test(String(zona || '')));
  if (!sohalar.length) return true;              // zona tanilmadi — tekshirmaymiz
  const u = (nuqta.x - yuz.x) / yuz.en, v = (nuqta.y - yuz.y) / yuz.boy;
  return sohalar.some(([, mos]) => mos(u, v));
}
