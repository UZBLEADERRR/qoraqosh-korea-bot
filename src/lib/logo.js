// KiOVO LOGOTIPI — YAGONA MANBA.
//
// Shakllar brend egasi bergan asl logotipdan (1254×1254 PNG) piksel
// bo'yicha o'lchab olingan: ko'zlar, tabassum yoyi va «KiOVO» harflari.
// Ilgari har sahifada o'z «logotipi» bor edi — biri harflari orasida
// bo'shliq bilan, biri faqat tabassum, admin panelda esa 🌸 emoji.
// Endi hamma joy SHU fayldan oladi: sayt, ilova, ikonkalar, Android
// ikonkasi va natija rasmi.
//
// Koordinatalar asl rasm o'lchamida (1254 birlik) — shuning uchun
// asl bilan solishtirish oson va qayta o'lchash kerak bo'lmaydi.

/** Brend ranglari — logotipdan olingan aniq qiymatlar. */
export const BREND = {
  qizil: '#AB0A0C',
  lime:  '#BDDB7D',
};

/** Asl rasm o'lchami — barcha koordinatalar shunga nisbatan. */
export const ASL_OLCHAM = 1254;

// ── Belgi: ikki ko'z va tabassum ──
const KOZLAR = [{ cx: 423.5, cy: 423, r: 34 }, { cx: 829.5, cy: 423, r: 34 }];
// Yoy markazi (627, 429), radiusi 208 — tabassumning o'rta chizig'i.
// Radius asl rasm bilan piksel farqi eng kam bo'lgan qiymatga
// tanlangan. Qalinligi 40, uchlari dumaloq: asl rasmdagidek.
export const TABASSUM = { d: 'M439 518A208 208 0 0 0 815 518', qalinlik: 40 };

// ── So'z belgisi: K i O V O ──
const K = 'M196 722H241V797L310 722H362L293 796L368 899H314L262 828L241 850V899H196Z';
const I_TANA = 'M397 777H441V899H397Z';
const I_NUQTA = { cx: 419, cy: 733.5, r: 26.5 };
const V = 'M679 722H728L773 846L820 722H866L796 899H750Z';
// «O» — ellips halqa. Ichki va tashqi chiziq `evenodd` bilan teshik bo'ladi.
const halqa = (cx) => {
  const t = { rx: 100.5, ry: 95 }, i = { rx: 54, ry: 55 };
  const e = (rx, ry) => `M${cx - rx} 811A${rx} ${ry} 0 1 0 ${cx + rx} 811A${rx} ${ry} 0 1 0 ${cx - rx} 811Z`;
  return e(t.rx, t.ry) + e(i.rx, i.ry);
};
const O1 = halqa(571.5);
const O2 = halqa(969.5);

/** Belgi (tabassum) chegarasi — o'rash uchun. */
export const BELGI_QUTI = { x: 369, y: 369, en: 514, boy: 306 };
/** To'liq logotip chegarasi (belgi + so'z). */
export const LOGO_QUTI = { x: 176, y: 369, en: 913, boy: 556 };

const doira = ({ cx, cy, r }, rang) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rang}"/>`;

/** Faqat belgi (ko'zlar + tabassum) — SVG ichki elementlari. */
export function belgiQismlari(rang = BREND.lime) {
  return KOZLAR.map((k) => doira(k, rang)).join('')
    + `<path d="${TABASSUM.d}" fill="none" stroke="${rang}" stroke-width="${TABASSUM.qalinlik}" stroke-linecap="round"/>`;
}

/** Faqat «KiOVO» yozuvi — SVG ichki elementlari. */
export function sozQismlari(rang = BREND.lime) {
  return `<path d="${K}${I_TANA}${V}" fill="${rang}"/>${doira(I_NUQTA, rang)}`
    + `<path d="${O1}${O2}" fill="${rang}" fill-rule="evenodd"/>`;
}

/** To'liq logotip ichki elementlari. */
export const logoQismlari = (rang = BREND.lime) => belgiQismlari(rang) + sozQismlari(rang);

/**
 * Mustaqil SVG fayl.
 *
 * @param {object} o
 * @param {'toliq'|'belgi'} [o.tur]  to'liq logotip yoki faqat tabassum
 * @param {string} [o.rang]          shakl rangi
 * @param {string|null} [o.fon]      fon rangi (null — shaffof)
 * @param {number} [o.burchak]       fon burchagi radiusi (0..0.5, o'lchamga nisbatan)
 * @param {number} [o.ulush]         kvadrat ikonkada logotip egallaydigan kenglik (0..1)
 */
export function logoSvg({ tur = 'toliq', rang = BREND.lime, fon = null,
                          burchak = 0, ulush = null, sarlavha = 'KiOVO' } = {}) {
  const ichki = tur === 'belgi' ? belgiQismlari(rang) : logoQismlari(rang);
  const q = tur === 'belgi' ? BELGI_QUTI : LOGO_QUTI;

  // Kvadrat ikonka: logotip markazda, berilgan ulushda
  if (ulush) {
    const O = ASL_OLCHAM;
    const k = (O * ulush) / q.en;
    const tx = (O - q.en * k) / 2 - q.x * k;
    const ty = (O - q.boy * k) / 2 - q.y * k;
    const r = burchak * O;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${O} ${O}" role="img" aria-label="${sarlavha}">`
      + `<title>${sarlavha}</title>`
      + (fon ? `<rect width="${O}" height="${O}" rx="${r}" fill="${fon}"/>` : '')
      + `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})">${ichki}</g></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${q.x} ${q.y} ${q.en} ${q.boy}" role="img" aria-label="${sarlavha}">`
    + `<title>${sarlavha}</title>`
    + (fon ? `<rect x="${q.x}" y="${q.y}" width="${q.en}" height="${q.boy}" fill="${fon}"/>` : '')
    + ichki + '</svg>';
}
