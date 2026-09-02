// Mahsulot kartochkasini AI'SIZ yig'ish.
//
// Do'kon ro'yxati mahsulotni tayyor beradi: nomi, narxi, brendi, rasmi.
// Bularni o'qish uchun AI shart emas — kalitlar ma'lum. AI faqat
// TUSHUNTIRISH yozish uchun kerak, u ham har doim emas.
//
// Shuning uchun import uch rejimda ishlaydi (Sozlamalar → «AI rejimi»):
//   yoq       — AI umuman chaqirilmaydi. Tokendan pul ketmaydi.
//   tejamkor  — xaritadan chiqmagan mahsulot uchungina AI (sukut).
//   toliq     — har mahsulot uchun AI (eng chiroyli tavsif, eng qimmat).

/** Koreyscha kalit so'z -> toifa va parvarish bosqichi. */
const TOIFA = [
  [/선크림|자외선|선스틱|썬크림/, 'quyosh',   'himoya',   'Quyoshdan himoya'],
  [/클렌징|폼클렌|클렌저|세안/,    'tozalash', 'tozalash', 'Yuzni tozalash'],
  [/토너|스킨|미스트/,             'toner',    'toner',    'Teri muvozanati'],
  [/세럼|에센스|앰플/,             'serum',    'davolash', 'Muammoga qarshi'],
  [/마스크팩|마스크|시트팩|팩\b/,  'niqob',    'qoshimcha','Haftalik parvarish'],
  [/립밤|립\b|틴트/,               'lab',      'qoshimcha','Lab parvarishi'],
  [/콜라겐|비타민|홍삼|유산균|비오틴|영양제/, 'ichimlik', 'ichki', 'Ichki qabul'],
  [/크림|로션|모이스처|수분/,      'krem',     'namlash',  'Namlantirish'],
];

/** Nomdan hajm topib, grammga o'giradi. */
export function ogirlikTaxmin(nom) {
  const s = String(nom || '');
  // 100ml, 50 mL
  const ml = s.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|мл|ML)/i);
  if (ml) return Math.round(Number(ml[1].replace(',', '.')) * 1.2);   // idishi bilan
  // 50g, 250 g
  const g = s.match(/(\d+(?:[.,]\d+)?)\s*(?:g|гр|G)\b/i);
  if (g) return Math.round(Number(g[1].replace(',', '.')) * 1.2);
  // 30매 / 30개입 — varaq yoki dona
  const dona = s.match(/(\d+)\s*(?:매|개입|장)/);
  if (dona) return Math.min(1200, Number(dona[1]) * 22);
  return 0;
}

/** Nomga qarab toifa va bosqich. */
export function toifaTop(nom) {
  const s = String(nom || '');
  for (const [qolip, category, step, maqsad] of TOIFA) {
    if (qolip.test(s)) return { category, step, maqsad };
  }
  return null;
}

/**
 * Ro'yxat elementidan kartochka yig'adi.
 *
 * @returns {{karta:object, toliq:boolean}|null}
 *   `toliq` — hamma muhim maydon topildi, AI kerak emas degani.
 */
export function xaritadanKarta(element, qoida) {
  if (!element || typeof element !== 'object') return null;
  const m = qoida?.maydonlar || {};

  const olish = (kalit, qolip) => {
    if (kalit && element[kalit] != null) return element[kalit];
    const k = Object.keys(element).find((x) => qolip.test(x));
    return k ? element[k] : null;
  };

  const nom     = String(olish(m.nom,   /nm$|name|nom/i) ?? '').trim();
  const brend   = String(olish(m.brend, /brnd|brand/i) ?? '').trim();
  const xomNarx = String(olish(m.narx,  /(^|_)prc$|price|narx/i) ?? '');
  const narx    = Number(xomNarx.replace(/[^\d]/g, ''));
  if (!nom || !narx) return null;

  const toifa = toifaTop(nom);
  const gramm = ogirlikTaxmin(nom);
  const hajm  = (nom.match(/\d+(?:[.,]\d+)?\s*(?:ml|g|매|개입)/i) || [''])[0];

  return {
    toliq: Boolean(toifa && gramm),
    karta: {
      // Kosmetikami: qidiruv koreyscha kalit so'z bo'yicha ketgani uchun
      // nomida shu so'zlardan biri bo'lsa — kosmetika
      kosmetikami: Boolean(toifa),
      ishonch: toifa ? (gramm ? 85 : 70) : 40,
      izoh: toifa ? '' : 'Nomidan toifasi aniqlanmadi',
      name: nom.slice(0, 120),
      brand: (brend || qoida?.manba || '').slice(0, 60),
      narx_qiymat: narx,
      narx_valyuta: 'KRW',
      ogirlik_g: gramm,
      volume: hajm,
      category: toifa?.category || 'krem',
      step: toifa?.step || 'namlash',
      description: toifa ? `${toifa.maqsad}. Koreya mahsuloti.` : '',
      usage_text: '',
      ingredients: '',
      actives: [], concerns: [], skin_types: ['barcha'],
      warnings: '', emoji: '🧴',
      usul: 'xarita',
    },
  };
}
