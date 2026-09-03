// Ilova mavzusi — ranglar bitta joydan boshqariladi.
//
// Admin panelda ikkita rang tanlanadi: SARLAVHA foni va ILOVA foni.
// Qolgan hamma tuslar (och variant, to'q variant, matn rangi, chegara)
// shulardan HISOBLANADI — admin o'nta rangni qo'lda tanlab, keyin
// o'qib bo'lmaydigan kombinatsiya yasab qo'yishi mumkin emas.
//
// Bir xil palitra uch joyda ishlatiladi: Mini App (CSS o'zgaruvchilari),
// natija rasmi (SVG) va admin paneldagi ko'rinish.

export const MAVZU_STANDART = {
  asosiy: '#B3161C',   // sarlavha foni (brend qizili)
  fon:    '#FBF8F3',   // ilova va rasm foni (issiq fil suyagi)
  urgu:   '#B3161C',   // tugmalar va narx
};

/** Tayyor to'plamlar — admin bir bosishda tanlaydi. */
export const TOPLAMLAR = [
  { kalit: 'fil',      nom: 'Qizil · fil suyagi', asosiy: '#B3161C', fon: '#FBF8F3', urgu: '#B3161C' },
  { kalit: 'qizil',    nom: 'Qizil · och yashil', asosiy: '#B3161C', fon: '#EAF3D9', urgu: '#C0392B' },
  { kalit: 'jigarrang', nom: 'Jigarrang · krem',  asosiy: '#6F4830', fon: '#FAF9F7', urgu: '#8A5A3D' },
  { kalit: 'yashil',   nom: 'To‘q yashil · krem', asosiy: '#12362A', fon: '#F2EDE8', urgu: '#B4654A' },
  { kalit: 'kok',      nom: 'Ko‘k · och ko‘k',    asosiy: '#123A63', fon: '#E7F0F7', urgu: '#1D6FA5' },
  { kalit: 'binafsha', nom: 'Binafsha · och pushti', asosiy: '#4A1D5C', fon: '#F6EBF6', urgu: '#8E3FA8' },
  { kalit: 'qora',     nom: 'Qora · oq',          asosiy: '#1A1A1A', fon: '#F5F5F5', urgu: '#333333' },
];

// ──────────────── Rang bilan ishlash ────────────────

/** "#RRGGBB" yoki "#RGB" -> [r,g,b]. Noto'g'ri qiymatda null. */
export function hexRgb(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  const t = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (!/^[0-9a-f]{6}$/i.test(t)) return null;
  return [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16));
}

const ikki = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export const rgbHex = ([r, g, b]) => `#${ikki(r)}${ikki(g)}${ikki(b)}`;

/**
 * Rangni tekshiradi va bir ko'rinishga keltiradi (kichik harf, # bilan).
 * Noto'g'ri bo'lsa zaxira qiymat — u ham shu ko'rinishga keltiriladi,
 * shunda palitra hamma joyda bir xil solishtiriladi.
 */
export function rangTozala(hex, zaxira) {
  const bir = (v) => `#${String(v).replace(/^#/, '').toLowerCase()}`;
  if (hexRgb(hex)) return bir(hex);
  return hexRgb(zaxira) ? bir(zaxira) : MAVZU_STANDART.asosiy.toLowerCase();
}

/** Rangni oqqa aralashtirish (0 = o'zi, 1 = oq). */
export function yoritish(hex, ulush) {
  const c = hexRgb(hex) || [0, 0, 0];
  return rgbHex(c.map((v) => v + (255 - v) * ulush));
}

/** Rangni qoraga aralashtirish. */
export function qoraytirish(hex, ulush) {
  const c = hexRgb(hex) || [0, 0, 0];
  return rgbHex(c.map((v) => v * (1 - ulush)));
}

/**
 * Fon ustida qaysi matn rangi o'qiladi — oqmi yoki qoramai.
 * WCAG nisbiy yorqinligi bo'yicha: taxminiy formula emas, haqiqiy hisob,
 * chunki admin har qanday rangni tanlashi mumkin va matn baribir
 * o'qiladigan bo'lishi kerak.
 */
export function kontrastMatn(hex) {
  const c = hexRgb(hex) || [255, 255, 255];
  const [r, g, b] = c.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  const yorqinlik = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return yorqinlik > 0.45 ? '#141414' : '#FFFFFF';
}

/** Fon och (yorug‘) rangmi — ilova qaysi tusda ishlashini bilish uchun. */
export const ochmi = (hex) => kontrastMatn(hex) === '#141414';

/**
 * Ikki asosiy rangdan to'liq palitra yig'adi.
 *
 * @param {{asosiy?:string, fon?:string, urgu?:string}} xom  admin tanlagani
 * @returns {object} rasm va ilova ishlatadigan barcha tuslar
 */
export function palitra(xom = {}) {
  const asosiy = rangTozala(xom.asosiy, MAVZU_STANDART.asosiy);
  const fon    = rangTozala(xom.fon,    MAVZU_STANDART.fon);
  const urgu   = rangTozala(xom.urgu,   asosiy);

  const fonOch = ochmi(fon);
  return {
    asosiy,
    fon,
    urgu,
    // Sarlavha ichidagi kartochka — asosiy rangdan biroz ochroq
    asosiyOch:  yoritish(asosiy, 0.12),
    asosiyTim:  qoraytirish(asosiy, 0.22),
    asosiyMatn: kontrastMatn(asosiy),
    urguOch:    yoritish(urgu, 0.86),
    urguTim:    qoraytirish(urgu, 0.2),
    // Fon ustidagi matn va kartochka
    matn:   fonOch ? '#1F1D1B' : '#F2F0EE',
    kul:    fonOch ? '#5F5A55' : '#B3ADA8',
    och:    fonOch ? '#8A847E' : '#8A847E',
    karta:  fonOch ? '#FFFFFF' : qoraytirish(fon, 0.35),
    chiziq: fonOch ? qoraytirish(fon, 0.1) : yoritish(fon, 0.12),
    // Mahsulot kartochkasining foni — fondan biroz to'qroq
    plitka: fonOch ? qoraytirish(fon, 0.05) : yoritish(fon, 0.06),
    fonOch,
  };
}

// Muammo darajasining ranglari mavzuga BOG'LIQ EMAS: qizil «yomon»,
// yashil «yaxshi» degani hamma joyda bir xil bo'lishi kerak.
export const DARAJA_RANG = {
  1: '#6AA84F',   // yengil
  2: '#E8A33D',   // o'rtacha
  3: '#D92B2B',   // kuchli
};
export const darajaRangi = (foiz) =>
  (foiz >= 70 ? DARAJA_RANG[3] : foiz >= 40 ? DARAJA_RANG[2] : DARAJA_RANG[1]);

// Ro'yxatdagi tartib bo'yicha rang — rasmdagi kabi qizildan yashilgacha
export const TARTIB_RANG = ['#D92B2B', '#E8703A', '#F0B429', '#6AA84F', '#4A90D9'];
