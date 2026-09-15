/* TERI O'LCHOVLARI — HAR TAHLILDA DOIM O'SHA YETTITASI.
 *
 * Muammo shunday edi: ekranda ko'rsatkichlar TOPILGAN MUAMMOLARDAN
 * yasalardi. Ya'ni terisi toza odam bitta ham ko'rsatkich ko'rmasdi,
 * ikki kishinikida esa butunlay boshqa-boshqa qatorlar chiqardi va
 * ularni solishtirib bo'lmasdi. «Bir oydan keyin solishtirasiz»
 * degan va'da ham shu sababli ishlamasdi.
 *
 * Endi o'lchov YETTITA va u har doim to'liq: teshiklar, ajinlar,
 * pigment, qizarish, tekstura, namlik, yog'lilik. Muammo topilmasa
 * ham o'lchov bor — shunchaki bahosi yuqori. Bu haqiqiy teri
 * diagnostikasi apparatlari (Janubiy Koreya salonlaridagi) beradigan
 * o'lchovlar ro'yxati bilan bir xil.
 *
 * QOIDA: ball QANCHA YUQORI bo'lsa, SHUNCHA YAXSHI. 100 — ideal.
 * Muammoning `foiz` i esa teskari: u muammoning KUCHI. Shuning uchun
 * o'lchov balli = 100 - eng kuchli muammoning foizi.
 */

/** Yettita o'lchov — tartibi ekranda ham, rasmda ham shu. */
export const OLCHOVLAR = [
  { kalit: 'pora',     nom: 'Teshiklar', qisqa: 'Teshik',   ikon: 'tozalik' },
  { kalit: 'ajin',     nom: 'Ajinlar',   qisqa: 'Ajin',     ikon: 'soat' },
  { kalit: 'pigment',  nom: 'Pigment',   qisqa: 'Pigment',  ikon: 'quyosh' },
  { kalit: 'qizarish', nom: 'Qizarish',  qisqa: 'Qizarish', ikon: 'yurak' },
  { kalit: 'tekstura', nom: 'Tekstura',  qisqa: 'Tekstura', ikon: 'qalqon' },
  { kalit: 'namlik',   nom: 'Namlik',    qisqa: 'Namlik',   ikon: 'tomchi' },
  { kalit: 'yoglilik', nom: 'Yog‘lilik', qisqa: 'Yog‘',     ikon: 'tomchi' },
];

export const OLCHOV_KALITLARI = OLCHOVLAR.map((o) => o.kalit);

/* Qaysi muammo qaysi o'lchovga tegishli.
 *
 * Bu jadval AI o'lchov bermagan (eski tahlil yoki oflayn rejim)
 * holat uchun: o'lchov topilgan muammolardan hisoblanadi. Bir
 * o'lchovga bir nechta muammo tushsa — eng kuchlisi hisobga olinadi,
 * chunki odam terisiga eng kuchli muammo bo'yicha baho beradi. */
export const MUAMMO_OLCHOVI = {
  teshik:     'pora',
  akne:       'tekstura',
  xiralik:    'tekstura',
  ajin:       'ajin',
  dog:        'pigment',
  qora_doira: 'pigment',
  qizarish:   'qizarish',
  sezgirlik:  'qizarish',
  quruqlik:   'namlik',
  shishish:   'namlik',
  yoglilik:   'yoglilik',
};

/* Muammo topilmagan o'lchovning bahosi.
 *
 * 100 EMAS: hech kimning terisi ideal emas va «100/100» yozuv
 * ishonchni yo'qotadi — odam «demak o'lchamagan» deb o'ylaydi.
 * 82 — «yaxshi, lekin mukammal emas» degan halol baho. */
const MUAMMOSIZ = 82;

const chegara = (n, zaxira) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(100, Math.max(0, Math.round(x))) : zaxira;
};

/** Besh bosqichli rang — ilovadagi `beshRang` bilan bir xil. */
export const BESH = ['zaif', 'past', 'orta', 'yaxshi', 'alo'];
export const olchovRangi = (ball) =>
  BESH[Math.max(0, Math.min(4, Math.floor(chegara(ball, 0) / 20)))];

/** O'zbekcha baho — raqamni odam tilida takrorlaydi. */
export const olchovBahosi = (ball) => {
  const b = chegara(ball, 0);
  return b >= 80 ? 'A’lo' : b >= 65 ? 'Yaxshi' : b >= 50 ? 'O‘rtacha'
       : b >= 35 ? 'E’tibor kerak' : 'Zaif';
};

/**
 * Yettita o'lchovni to'liq qaytaradi.
 *
 * @param {Array}  muammolar  tahlildagi muammolar ro'yxati
 * @param {Object} xom        AI bergan o'lchovlar (bo'lmasligi mumkin)
 * @returns {Array<{kalit,nom,qisqa,ikon,ball,baho,rang,izoh,zona}>}
 */
export function olchovlarniHisobla(muammolar = [], xom = null) {
  // Har o'lchovga tegishli ENG KUCHLI muammo
  const eng = {};
  for (const m of Array.isArray(muammolar) ? muammolar : []) {
    const k = MUAMMO_OLCHOVI[m?.kalit];
    if (!k) continue;
    const foiz = chegara(m.foiz, 0);
    if (!eng[k] || foiz > chegara(eng[k].foiz, 0)) eng[k] = m;
  }

  return OLCHOVLAR.map((o) => {
    const m = eng[o.kalit];
    // AI bergan ball ustun turadi — u rasmni ko'rgan. Bermagan bo'lsa
    // muammodan hisoblaymiz, u ham bo'lmasa «muammo ko'rinmadi».
    const ball = chegara(xom?.[o.kalit],
      m ? Math.max(5, 100 - chegara(m.foiz, 0)) : MUAMMOSIZ);
    return {
      ...o,
      ball,
      baho: olchovBahosi(ball),
      rang: olchovRangi(ball),
      // Izoh O'YLAB TOPILMAYDI: agar shu o'lchovga tegishli muammo
      // topilgan bo'lsa — uning izohi, aks holda bo'sh.
      izoh: m ? String(m.izoh || '').slice(0, 120) : '',
      zona: m ? String(m.zona || '').slice(0, 60) : '',
    };
  });
}

/** AI javobini sxemaga solish — faqat yettita kalit, faqat 0-100. */
export function olchovlarniTozala(xom) {
  if (!xom || typeof xom !== 'object') return null;
  const t = {};
  let bormi = false;
  for (const k of OLCHOV_KALITLARI) {
    const b = chegara(xom[k], null);
    if (b === null) continue;
    t[k] = b; bormi = true;
  }
  return bormi ? t : null;
}
