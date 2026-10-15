// MAKIYAJ — «Mening rangim». Bu yerda faqat sof hisob: bosqichlar tartibi,
// rang tiplari palitrasi, kushon tonlarini o'qish va mos tonni tanlash.
// AI emas: bir xil rasm/profil — bir xil tavsiya.

/** Qo'llash tartibi — makiyaj aynan shu ketma-ketlikda surtiladi. */
export const MAKIYAJ_BOSQICHLAR = [
  { kalit: 'baza',     nom: 'Baza (praymer)',          izoh: 'Ton tekis yotishi va uzoq turishi uchun' },
  { kalit: 'ton',      nom: 'Ton (kushon / tonal krem)', izoh: 'Teri rangini tekislaydi' },
  { kalit: 'konsiler', nom: 'Konsiler',                izoh: 'Ko‘z osti va dog‘larni yopadi' },
  { kalit: 'pudra',    nom: 'Pudra',                   izoh: 'Tonni mahkamlaydi, yaltirashni oladi' },
  { kalit: 'qosh',     nom: 'Qosh',                    izoh: 'Yuzga ramka beradi' },
  { kalit: 'kozlar',   nom: 'Ko‘z (soya, qalam, tush)', izoh: 'Nigohni ochadi' },
  { kalit: 'rumyana',  nom: 'Rumyana',                 izoh: 'Yuzga jonli tus beradi' },
  { kalit: 'lab',      nom: 'Lab',                     izoh: 'Obrazni yakunlaydi' },
  { kalit: 'fiksator', nom: 'Fiksator',                izoh: 'Makiyajni kun bo‘yi saqlaydi' },
  { kalit: 'soch',     nom: 'Soch turmagi',            izoh: 'Pomada, vosk yoki gel — obrazni tartibli yakunlaydi' },
];

/* Erkaklarga — tabiiy «grooming»: ko'z soyasi va rumyana yo'q (faqat
   erkaklar uchun chiqarilgan mahsulot bo'lsa), nomlar ham boshqacha. */
const ERKAK_NOM = {
  baza:     { nom: 'Baza (mat praymer)',  izoh: 'Yog‘lanish va teshiklarni yashiradi' },
  ton:      { nom: 'BB / CC krem',        izoh: 'Qizarish va notekislikni bilinmas qiladi — tabiiy ko‘rinadi' },
  konsiler: { nom: 'Konsiler',            izoh: 'Ko‘z osti qorayishi va dog‘larni yopadi' },
  pudra:    { nom: 'Mat pudra',           izoh: 'Kun bo‘yi yaltiramaslik uchun' },
  qosh:     { nom: 'Qosh (gel / qalam)',  izoh: 'Qoshni tartibga soladi' },
  kozlar:   { nom: 'Ko‘z',                izoh: 'Erkaklar uchun yengil vosita' },
  rumyana:  { nom: 'Yuzga tus',           izoh: 'Charchoq ko‘rinishini oladi' },
  lab:      { nom: 'Lab (balzam / pomada)', izoh: 'Lab qurimaydi, tabiiy tus beradi' },
  fiksator: { nom: 'Fiksator',            izoh: 'Ko‘rinishni kun bo‘yi saqlaydi' },
  soch:     { nom: 'Soch turmagi',        izoh: 'Pomada, vosk yoki gel' },
};
/** Erkakka faqat erkaklar mahsuloti bo'lsa ko'rsatiladigan bosqichlar. */
export const ERKAK_FAQAT_OZI = new Set(['kozlar', 'rumyana', 'lab']);
export const bosqichlarJins = (jins) => (jins === 'erkak'
  ? MAKIYAJ_BOSQICHLAR.map((b) => ({ ...b, ...ERKAK_NOM[b.kalit] }))
  : MAKIYAJ_BOSQICHLAR);

/** Mahsulot erkaklar uchunmi — nomida yoki kalit so'zida «erkak», «men», «homme». */
const ERKAK_RE = /(erkak|\bmen\b|\bman\b|for\s*men|\bhomme\b|мужск|\bmale\b)/i;
export function erkaklarUchunmi(p) {
  const k = Array.isArray(p?.kalit_sozlar) ? p.kalit_sozlar.join(' ') : (p?.kalit_sozlar || '');
  return ERKAK_RE.test([p?.name, p?.nom_uz, k].filter(Boolean).join(' '));
}
export const MAKIYAJ_KALITLARI = MAKIYAJ_BOSQICHLAR.map((b) => b.kalit);
const MAKIYAJ_TOPLAM = new Set(MAKIYAJ_KALITLARI);
/* Admin mahsulotni «Makiyaj» toifasiga qo'yib, bosqichini tanlamay qoldirsa
   (yoki teri bosqichi qolib ketsa) — bosqich nomidan topiladi. Tartib muhim:
   «hair pomade» — soch, «skin tint» — ton, «eyebrow» — qosh. */
const NOMDAN_BOSQICH = [
  ['soch',     /(soch|hair|vosk|\bwax\b|pomade\b|styling|gel\s*for\s*hair)/i],
  ['fiksator', /(fiksator|fixer|fixing|setting\s*spray|makeup\s*fix|mist\s*fix)/i],
  ['baza',     /(praymer|primer|\bbaza\b|makeup\s*base|base\s*primer)/i],
  ['konsiler', /(konsiler|concealer|korrektor|corrector)/i],
  ['ton',      /(kushon|cushion|foundation|tonal|\bbb\b|\bcc\b|bb\s*cream|cc\s*cream|skin\s*tint)/i],
  ['pudra',    /(pudra|powder|pact\b)/i],
  ['qosh',     /(qosh|brow)/i],
  ['kozlar',   /(ko.?z|eye|mascara|tush\b|layner|liner|palet|palette|shadow|soya)/i],
  ['rumyana',  /(rumyana|blush|cheek|kontur|contour|highlight|xaylayter|bronzer)/i],
  ['lab',      /(\blab\b|lip|tint|pomada|lipstick|gloss|glos)/i],
];
const nomMatni = (p) => [p?.name, p?.nom_uz, ...(Array.isArray(p?.kalit_sozlar) ? p.kalit_sozlar : [])].filter(Boolean).join(' ');

/**
 * Makiyaj bosqichi: o'zi makiyaj bosqichida bo'lsa — o'sha; «Makiyaj»
 * toifasida bo'lsa — nomidan. Makiyaj emas bo'lsa null.
 */
export function makiyajBosqichi(p) {
  if (MAKIYAJ_TOPLAM.has(p?.step)) return p.step;
  if (p?.toifa_slug !== 'makiyaj') return null;
  const n = nomMatni(p);
  for (const [k, re] of NOMDAN_BOSQICH) if (re.test(n)) return k;
  return null;
}

/** Mahsulot makiyajmi (teri tahlili tavsiyasiga tushmasligi kerak). */
export const makiyajmi = (p) => MAKIYAJ_TOPLAM.has(p?.step) || p?.toifa_slug === 'makiyaj';

export const TUSLAR = { iliq: 'Iliq', sovuq: 'Sovuq', neytral: 'Neytral', zaytun: 'Zaytun' };
export const CHUQURLIK = ['', 'Juda och', 'Och', 'Och-o‘rta', 'O‘rta', 'Qoramtir', 'To‘q'];

/* Rang tiplari — mavsumiy rang tahlili. Har tipga lab, rumyana va ko'z
   soyasi uchun 3 tadan rang: palitra kartochkada ko'rsatiladi va katalog
   ranglari shu ranglarga eng yaqiniga qarab tanlanadi. */
export const RANG_TIPLARI = {
  bahor: { nom: 'Bahor', emoji: '🌸', izoh: 'Iliq va yorug‘ — shaftoli, marjon, oltin tuslar sizga yarashadi',
    lab: ['#F27A6B', '#F59A83', '#E5675A'], rumyana: ['#F7A38E', '#F4B183', '#EE8C7A'], kozlar: ['#D9A066', '#B98A5E', '#E8C39E'] },
  yoz:   { nom: 'Yoz', emoji: '🌊', izoh: 'Sovuq va yumshoq — atirgul, malina-pushti, lavanda tuslari',
    lab: ['#C9667F', '#D98A9C', '#B5546E'], rumyana: ['#E8A5B5', '#DE8FA3', '#F0B8C4'], kozlar: ['#A99BB8', '#B8A39C', '#8F8AA6'] },
  kuz:   { nom: 'Kuz', emoji: '🍂', izoh: 'Iliq va chuqur — terrakota, g‘isht, mis va jigarrang tuslar',
    lab: ['#A8483A', '#B85C45', '#8C3B2E'], rumyana: ['#C76E55', '#B8664F', '#D1866A'], kozlar: ['#8C5A3C', '#A66B3F', '#6E4B33'] },
  qish:  { nom: 'Qish', emoji: '❄️', izoh: 'Sovuq va kontrast — olcha, fuksiya, vino va toza qizil',
    lab: ['#A3123A', '#C2185B', '#7A1230'], rumyana: ['#D45D79', '#C94C6E', '#E07A92'], kozlar: ['#5B5470', '#7D6E83', '#3F3A4F'] },
};

/* Koreya kushon/tonal kremlari tonni «21N», «No.23W», «17C1» kabi yozadi:
   raqam — chuqurlik, harf — tus (N neytral, W/Y iliq, C/P sovuq). */
export function tonOqi(matn) {
  const m = /(?:^|[^0-9])(1[3-9]|2[0-9]|3[0-5])\s*([NWYCP])?\d?(?![0-9a-z])/i.exec(String(matn || ''));
  if (!m) return null;
  const h = (m[2] || '').toUpperCase();
  return { raqam: Number(m[1]), tus: h === 'N' ? 'neytral' : h === 'W' || h === 'Y' ? 'iliq' : h === 'C' || h === 'P' ? 'sovuq' : null };
}

/** Chuqurlik (1-6) → Koreya ton raqami. */
const CHUQURLIK_RAQAM = [0, 13, 17, 21, 23, 25, 29];
export const chuqurlikRaqami = (c) => CHUQURLIK_RAQAM[Math.min(6, Math.max(1, Math.round(Number(c) || 3)))];

// ── Rang masofasi (CIE Lab, ΔE76) ──
const hexRgb = (h) => {
  const s = String(h || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
function lab(hex) {
  const c = hexRgb(hex);
  if (!c) return null;
  const [r, g, b] = c.map((v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
export function rangFarqi(a, b) {
  const p = lab(a), q = lab(b);
  if (!p || !q) return null;
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
/** Terining yorug'ligi (L*, 0-100). */
export const yoruglik = (hex) => lab(hex)?.[0] ?? null;

/**
 * Ton mahsulotlari ichidan eng mosini tanlaydi.
 * @param {{tus:string, chuqurlik:number, teri_hex?:string}} profil
 * @param {Array} variantlar  mahsulotlar (variant_nom / name / rang_hex bilan)
 * @param {number} siljish  konsiler uchun +1 (bir pog'ona ochroq)
 * @returns {Array} eng mosidan boshlab, har biriga `moslik` (0-100)
 */
export function tonlarniSarala(profil, variantlar, siljish = 0) {
  const kerak = chuqurlikRaqami(profil.chuqurlik) - siljish * 2;
  const tus = profil.tus === 'zaytun' ? 'neytral' : profil.tus;
  return (variantlar || []).map((p) => {
    const t = tonOqi(p.variant_nom) || tonOqi(p.name);
    let jarima = 0;
    if (t) {
      jarima += Math.abs(t.raqam - kerak) * 6;                       // har 1 raqam ≈ yarim pog'ona
      if (t.tus && tus && t.tus !== tus) jarima += t.tus === 'neytral' || tus === 'neytral' ? 6 : 14;
    } else jarima += 30;                                             // toni noma'lum — oxirida
    const d = profil.teri_hex && p.rang_hex ? rangFarqi(profil.teri_hex, p.rang_hex) : null;
    if (d !== null) jarima = t ? jarima * 0.6 + d * 1.2 : d * 2;    // haqiqiy rang bo'lsa ko'proq ishonamiz
    return { ...p, ton: t, moslik: Math.max(0, Math.min(100, Math.round(100 - jarima))) };
  }).sort((a, b) => b.moslik - a.moslik);
}

/** Lab / rumyana / ko'z soyasi: rangi palitraga eng yaqin mahsulot birinchi. */
export function rangBoyichaSarala(palitra, mahsulotlar) {
  return (mahsulotlar || []).map((p) => {
    const ds = (palitra || []).map((h) => rangFarqi(h, p.rang_hex)).filter((x) => x !== null);
    return { ...p, farq: ds.length ? Math.min(...ds) : null };
  }).sort((a, b) => (a.farq ?? 999) - (b.farq ?? 999) || (b.sold_count || 0) - (a.sold_count || 0));
}

/** Admin paneldagi umumiy holat (settings.makiyaj_holat). */
export const MAKIYAJ_HOLATLARI = ['yopiq', 'admin', 'ochiq'];
export const MAKIYAJ_HOLAT_STANDART = 'admin';   // sinov davri: faqat adminlar ko'radi

/**
 * Makiyaj bo'limi kimga ko'rinadi:
 *   yopiq — hech kimga; admin — faqat adminlarga (sinov); ochiq — hammaga
 *   (erkaklarga o'z tartibi bilan). Har holda odam profilda o'zi o'chirgan
 *   bo'lsa yashiriladi.
 */
export function makiyajKorinadimi(user, holat = 'ochiq', adminmi = false) {
  if (!user || user.makiyaj === false) return false;
  if (holat === 'yopiq') return false;
  if (holat === 'admin') return Boolean(adminmi);
  return true;
}
