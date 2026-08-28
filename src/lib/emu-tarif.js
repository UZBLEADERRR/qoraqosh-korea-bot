// EMU Express rasmiy tarif kartasi (Avgust 2025).
//
// Manba: "Express Mail Universal" MCHJ — EMU Tarif Kartasi PDF.
// Narx uch narsaga bog'liq:
//   1. ZONA        — jo'natuvchi va qabul qiluvchi viloyat juftligi (0–4)
//   2. MASOFA turi — viloyat markazi shahri / 40 km gacha / 40 km dan uzoq
//   3. OG'IRLIK    — birinchi kg + keyingi har kg
//
// Ikki xil yetkazish bor:
//   ofis — EMU ofisidan EMU ofisigacha, mijoz o'zi olib ketadi (arzonroq)
//   uy   — EMU ofisidan qabul qiluvchi manziligacha
//
// PDF dagi narxlar QQS SIZ. Shartnomangizga qarab QQS qo'shilishi mumkin —
// buni admin paneldagi foiz bilan sozlaysiz.

// Zonalar matritsasidagi ustun/qator tartibi — PDF dagi bilan bir xil
const HUDUD = [
  'Qoraqalpog‘iston', 'Andijon', 'Buxoro', 'Jizzax', 'Qashqadaryo', 'Navoiy',
  'Namangan', 'Samarqand', 'Surxondaryo', 'Sirdaryo', 'Toshkent viloyati',
  'Farg‘ona', 'Xorazm', 'Toshkent sh.',
];

// Qator — jo'natuvchi, ustun — qabul qiluvchi.
// Matritsa SIMMETRIK EMAS (masalan Qoraqalpog‘iston→Xorazm 2, teskarisi 1).
const ZONALAR = [
  [0, 4, 3, 4, 3, 3, 4, 3, 4, 4, 4, 4, 2, 4],  // Qoraqalpog‘iston
  [4, 0, 4, 3, 3, 3, 1, 3, 4, 3, 2, 1, 4, 2],  // Andijon
  [3, 4, 0, 2, 2, 1, 4, 2, 3, 3, 3, 4, 3, 3],  // Buxoro
  [4, 3, 2, 0, 2, 2, 3, 1, 3, 1, 2, 3, 3, 2],  // Jizzax
  [3, 4, 2, 2, 0, 2, 3, 2, 2, 2, 3, 3, 3, 3],  // Qashqadaryo
  [3, 4, 1, 2, 2, 0, 3, 1, 3, 2, 3, 3, 3, 3],  // Navoiy
  [4, 1, 4, 3, 3, 3, 0, 3, 4, 3, 2, 1, 4, 2],  // Namangan
  [3, 3, 2, 1, 2, 2, 3, 0, 2, 1, 2, 3, 3, 2],  // Samarqand
  [4, 4, 3, 3, 2, 3, 4, 3, 0, 3, 3, 4, 4, 3],  // Surxondaryo
  [4, 3, 3, 1, 2, 2, 3, 2, 3, 0, 2, 3, 4, 1],  // Sirdaryo
  [4, 2, 3, 2, 3, 3, 2, 2, 3, 2, 0, 2, 4, 1],  // Toshkent viloyati
  [4, 1, 4, 3, 3, 3, 1, 3, 4, 3, 2, 0, 4, 2],  // Farg‘ona
  [1, 4, 3, 4, 3, 3, 4, 3, 4, 4, 4, 4, 0, 4],  // Xorazm
  [4, 2, 3, 2, 3, 3, 2, 2, 3, 1, 1, 2, 4, 0],  // Toshkent sh.
];

// Bizdagi viloyat nomlari (hududlar.js) -> matritsadagi nom
const NOM = {
  'Toshkent shahri':               'Toshkent sh.',
  'Toshkent viloyati':             'Toshkent viloyati',
  'Andijon viloyati':              'Andijon',
  'Buxoro viloyati':               'Buxoro',
  'Farg‘ona viloyati':             'Farg‘ona',
  "Farg'ona viloyati":             'Farg‘ona',
  'Jizzax viloyati':               'Jizzax',
  'Namangan viloyati':             'Namangan',
  'Navoiy viloyati':               'Navoiy',
  'Qashqadaryo viloyati':          'Qashqadaryo',
  'Qoraqalpog‘iston Respublikasi': 'Qoraqalpog‘iston',
  "Qoraqalpog'iston Respublikasi": 'Qoraqalpog‘iston',
  'Samarqand viloyati':            'Samarqand',
  'Sirdaryo viloyati':             'Sirdaryo',
  'Surxondaryo viloyati':          'Surxondaryo',
  'Xorazm viloyati':               'Xorazm',
};

/** Har viloyatning markaziy shahri — "Shahar" tarifi shu yerga tegishli. */
export const MARKAZLAR = {
  'Toshkent viloyati':             'Nurafshon',
  'Andijon viloyati':              'Andijon',
  'Buxoro viloyati':               'Buxoro',
  'Farg‘ona viloyati':             'Farg‘ona',
  "Farg'ona viloyati":             "Farg'ona",
  'Jizzax viloyati':               'Jizzax',
  'Namangan viloyati':             'Namangan',
  'Navoiy viloyati':               'Navoiy',
  'Qashqadaryo viloyati':          'Qarshi',
  'Qoraqalpog‘iston Respublikasi': 'Nukus',
  "Qoraqalpog'iston Respublikasi": 'Nukus',
  'Samarqand viloyati':            'Samarqand',
  'Sirdaryo viloyati':             'Guliston',
  'Surxondaryo viloyati':          'Termiz',
  'Xorazm viloyati':               'Urganch',
};

// Tarif jadvallari. Indeks — zona (0..4).
const TARIF = {
  ofis: {
    shahar:  [22000, 25000, 27000, 29000, 33000],
    yaqin:   [26000, 29000, 31000, 33000, 37000],   // < 40 km
    uzoq:    [32000, 35000, 37000, 39000, 43000],   // > 40 km
    keyingiShahar: [3000, 6000, 7000, 8000, 9000],
    keyingiTuman:  [3500, 6500, 7500, 8500, 9500],
  },
  uy: {
    shahar:  [32000, 45000, 47000, 49000, 53000],
    yaqin:   [42000, 55000, 57000, 59000, 63000],
    uzoq:    [47000, 60000, 62000, 64000, 68000],
    keyingiShahar: [4000, 7000, 8000, 9000, 10000],
    keyingiTuman:  [5000, 8000, 9000, 10000, 11000],
  },
};

// Katta jo'natmalar uchun arzonlashadigan stavkalar (ikkala tarifda bir xil)
const KATTA = {
  20:  [2000, 5000, 6000, 7000, 8000],
  50:  [2000, 4000, 5000, 6000, 7000],
  100: [1000, 3000, 4000, 5000, 6000],
  500: [500,  1000, 2000, 2500, 3000],
};

const ind = (viloyat) => HUDUD.indexOf(NOM[String(viloyat || '').trim()] ?? '');

/**
 * Ikki viloyat orasidagi zona (0–4). Viloyat tanilmasa eng uzoq zona (4) —
 * kam olib zarar ko'rgandan ko'ra ehtiyot bo'lgan yaxshi.
 */
export function zona(jonatuvchi, qabul) {
  const a = ind(jonatuvchi);
  const b = ind(qabul);
  if (a < 0 || b < 0) return 4;
  return ZONALAR[a][b];
}

/**
 * Manzil qaysi masofa toifasiga kiradi.
 * @param {string} viloyat
 * @param {string} tuman
 * @param {string[]} yaqinTumanlar  admin sozlagan "40 km gacha" ro'yxati
 */
export function masofaTuri(viloyat, tuman, yaqinTumanlar = []) {
  const v = String(viloyat || '').trim();
  const t = String(tuman || '').trim();

  // Toshkent shahrining hamma tumani "shahar ichida"
  if (v === 'Toshkent shahri') return 'shahar';

  const markaz = MARKAZLAR[v];
  if (markaz && (t === markaz || t === `${markaz} tumani`)) return 'shahar';

  if (yaqinTumanlar.some((x) => String(x).trim().toLowerCase() === t.toLowerCase())) {
    return 'yaqin';
  }
  // Ro'yxatda yo'q bo'lsa eng uzoq deb hisoblaymiz — kam olmaslik uchun
  return 'uzoq';
}

/**
 * EMU tarifi bo'yicha narx.
 * @param {object} p
 * @param {'ofis'|'uy'} p.turi
 * @param {number} p.zona     0..4
 * @param {'shahar'|'yaqin'|'uzoq'} p.masofa
 * @param {number} p.kg       to'liq kilogrammga yaxlitlangan
 * @returns {number} so'm (QQS siz)
 */
export function emuNarxi({ turi, zona: z, masofa, kg }) {
  const t = TARIF[turi === 'uy' ? 'uy' : 'ofis'];
  const zz = Math.max(0, Math.min(4, Number(z) || 0));
  const kilo = Math.max(1, Math.ceil(Number(kg) || 1));

  let narx = t[masofa in t ? masofa : 'uzoq'][zz];
  const keyingi = masofa === 'shahar' ? t.keyingiShahar[zz] : t.keyingiTuman[zz];

  // 2-kg dan boshlab qo'shiladi, 20 kg dan keyin stavka arzonlashadi
  for (let k = 2; k <= kilo; k++) {
    if (k > 500)      narx += KATTA[500][zz];
    else if (k > 100) narx += KATTA[100][zz];
    else if (k > 50)  narx += KATTA[50][zz];
    else if (k > 20)  narx += KATTA[20][zz];
    else              narx += keyingi;
  }
  return narx;
}

/** Tushuntirish uchun — mijozga va adminga ko'rsatiladi. */
export const ZONA_IZOH = [
  'shahar ichida', '150 km gacha', '400 km gacha', '800 km gacha', '800 km dan ortiq',
];
export const MASOFA_IZOH = {
  shahar: 'markaziy shahar',
  yaqin:  'markazdan 40 km gacha',
  uzoq:   'markazdan 40 km dan uzoq',
};
