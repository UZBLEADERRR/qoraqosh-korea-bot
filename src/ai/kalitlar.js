// AI kalitlari hovuzi.
//
// Bitta kalitning kunlik kvotasi bor. Minglab foydalanuvchi bo'lsa u
// tez tugaydi va butun ilova AI'siz qoladi. Bir nechta kalit qo'ysangiz
// (GEMINI_API_KEY="kalit1,kalit2,kalit3") chegara shuncha barobar
// oshadi va bittasi tugasa/yiqilsa keyingisi ishlaydi.
//
// Ishlash tartibi:
//   • kalitlar NAVBAT bilan olinadi — yuk teng taqsimlanadi;
//   • kvota tugagan yoki noto'g'ri kalit VAQTINCHA chetga qo'yiladi
//     («dam olishga»), qolganlari ishlayveradi;
//   • hammasi dam olayotgan bo'lsa eng erta bo'shaydigani olinadi —
//     hech bo'lmasa urinib ko'ramiz, «kalit yo'q» deb to'xtamaymiz.

const DAM_MS = {
  kvota:   10 * 60_000,   // kunlik/daqiqalik kvota tugadi
  notogri:  60 * 60_000,  // kalit noto'g'ri yoki bekor qilingan
  xato:      2 * 60_000,  // vaqtinchalik nosozlik
};

/** @param {string[]} royxat */
export function hovuz(royxat) {
  const kalitlar = [...new Set((royxat || []).filter(Boolean))];
  // holat[i] = { damGacha, xato, ishlatilgan }
  const holat = kalitlar.map(() => ({ damGacha: 0, xato: 0, ishlatilgan: 0 }));
  let keyingi = 0;

  const bormi = () => kalitlar.length > 0;

  /** Ishlashga tayyor kalit. Yo'q bo'lsa eng erta bo'shaydigani. */
  function ol() {
    if (!kalitlar.length) return null;
    const hozir = Date.now();

    for (let i = 0; i < kalitlar.length; i++) {
      const j = (keyingi + i) % kalitlar.length;
      if (holat[j].damGacha <= hozir) {
        keyingi = (j + 1) % kalitlar.length;
        holat[j].ishlatilgan += 1;
        return { kalit: kalitlar[j], indeks: j };
      }
    }
    // Hammasi dam olyapti — eng erta bo'shaydiganini beramiz.
    // «Kalit yo'q» deb to'xtagandan ko'ra urinib ko'rgan yaxshi:
    // kvota hisobi provayder tomonda erta tiklangan bo'lishi mumkin.
    let eng = 0;
    for (let i = 1; i < holat.length; i++) if (holat[i].damGacha < holat[eng].damGacha) eng = i;
    holat[eng].ishlatilgan += 1;
    return { kalit: kalitlar[eng], indeks: eng };
  }

  /** Chaqiruv muvaffaqiyatli tugadi. */
  function yaxshi(indeks) {
    if (holat[indeks]) { holat[indeks].damGacha = 0; holat[indeks].xato = 0; }
  }

  /**
   * Chaqiruv yiqildi — kalitni vaqtincha chetga qo'yamiz.
   * @param {number} indeks
   * @param {string} sabab  'kvota' | 'notogri' | 'xato'
   */
  function yomon(indeks, sabab = 'xato') {
    const h = holat[indeks];
    if (!h) return;
    h.xato += 1;
    // Bitta kalit bo'lsa chetga qo'yishning ma'nosi yo'q — baribir
    // boshqasi yo'q, faqat kutish vaqti behuda ketadi.
    if (kalitlar.length === 1 && sabab !== 'kvota') return;
    h.damGacha = Date.now() + (DAM_MS[sabab] || DAM_MS.xato);
  }

  const holatlar = () => kalitlar.map((k, i) => ({
    // Kalitning O'ZI hech qachon ko'rsatilmaydi — faqat oxirgi 4 belgi
    nom: `…${k.slice(-4)}`,
    tayyor: holat[i].damGacha <= Date.now(),
    dam_qoldi: Math.max(0, Math.ceil((holat[i].damGacha - Date.now()) / 1000)),
    xato: holat[i].xato,
    ishlatilgan: holat[i].ishlatilgan,
  }));

  const tayyorSoni = () => holat.filter((h) => h.damGacha <= Date.now()).length;

  return { bormi, ol, yaxshi, yomon, holatlar, soni: () => kalitlar.length, tayyorSoni };
}

/**
 * Provayder xatosidan sababni aniqlaydi.
 * Kvota va noto'g'ri kalit — boshqacha muomala talab qiladi: birinchisi
 * vaqtincha, ikkinchisi uzoq muddatga chetga qo'yiladi.
 */
export function sabab(e) {
  const m = String(e?.message || e || '');
  if (/quota|resource[_ ]exhausted|billing|insufficient|credit/i.test(m)) return 'kvota';
  if (/\b429\b|rate limit|too many requests/i.test(m)) return 'kvota';
  if (/\b40[13]\b|api key|unauthorized|permission denied|invalid.{0,12}key/i.test(m)) return 'notogri';
  return 'xato';
}
