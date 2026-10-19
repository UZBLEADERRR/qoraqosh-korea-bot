// REELS SAHNALARI — 1080×1920 kadrlar (SVG → PNG).
//
// Har sahna IKKI qatlam:
//   • fon  — mahsulot surati (xira fon + kartochka). Videoda sekin yaqinlashadi;
//   • matn — shaffof qatlam: sarlavha, afzallik, narx. Videoda paydo bo'lib,
//            pastdan siljib chiqadi.
// Sahnalar: hook → 3 ta afzallik → narx va chaqiriq («izohga + yozing»).
//
// Emoji ishlatilmaydi: resvg rangli emoji shriftini chizmaydi.
import { x, qatorlarga, SHRIFT } from '../rasm/chiz.js';
import { BREND, LOGO_QUTI, logoQismlari } from '../lib/logo.js';

export const W = 1080;
export const H = 1920;

const T = {
  qora: '#120306', toq: '#3a0710', qizil: BREND.qizil, lime: BREND.lime,
  oq: '#FFFFFF', kul: '#E9D6DA', matn: '#1d1514',
};

const matn = (s, y, o = {}) => `<text x="${o.x ?? W / 2}" y="${y}" font-family="${SHRIFT}"
  font-size="${o.olcham ?? 64}" font-weight="${o.ogirlik ?? 700}" fill="${o.rang ?? T.oq}"
  text-anchor="${o.anchor ?? 'middle'}"${o.chiz ? ' text-decoration="line-through"' : ''}>${x(s)}</text>`;

function logo(x0, y0, boy, rang = T.lime) {
  const k = boy / LOGO_QUTI.boy;
  return `<g transform="translate(${(x0 - LOGO_QUTI.x * k).toFixed(2)} ${(y0 - LOGO_QUTI.y * k).toFixed(2)}) scale(${k.toFixed(5)})">${logoQismlari(rang)}</g>`;
}

const svg = (ich, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}</defs>${ich}</svg>`;

/**
 * Fon qatlami: xira mahsulot surati + to'q qizil gradient + oq kartochkada mahsulot.
 * @param {{rasm?: string, mime?: string}} m  base64 surat
 * @param {'katta'|'kichik'} [o'lcham]
 */
export function fonSvg(m, olcham = 'katta') {
  const r = m?.rasm ? `data:${m.mime || 'image/jpeg'};base64,${m.rasm}` : null;
  const K = olcham === 'katta' ? { x: 150, y: 330, en: 780 } : { x: 240, y: 250, en: 600 };
  return svg(`
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    ${r ? `<image href="${r}" x="-200" y="-100" width="${W + 400}" height="${H + 200}" preserveAspectRatio="xMidYMid slice"
      filter="url(#xira)" opacity="0.38"/>` : ''}
    <rect width="${W}" height="${H}" fill="url(#qora)"/>
    <rect x="${K.x}" y="${K.y}" width="${K.en}" height="${K.en}" rx="56" fill="#ffffff"/>
    ${r ? `<clipPath id="kq"><rect x="${K.x + 24}" y="${K.y + 24}" width="${K.en - 48}" height="${K.en - 48}" rx="40"/></clipPath>
      <image href="${r}" x="${K.x + 24}" y="${K.y + 24}" width="${K.en - 48}" height="${K.en - 48}"
        preserveAspectRatio="xMidYMid meet" clip-path="url(#kq)"/>` : ''}`,
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stop-color="${T.toq}"/><stop offset="0.55" stop-color="#22040a"/><stop offset="1" stop-color="${T.qora}"/></linearGradient>
   <linearGradient id="qora" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></linearGradient>
   <filter id="xira" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="38"/></filter>`);
}

/** Yuqoridagi brend chizig'i (hamma matn qatlamida). */
const tepa = () => `${logo(70, 92, 64)}
  <rect x="${W - 420}" y="96" width="350" height="58" rx="29" fill="#ffffff" fill-opacity="0.14"/>
  ${matn('Koreya kosmetikasi', 135, { x: W - 245, olcham: 28, ogirlik: 600, rang: T.kul })}`;

/** Sahna 1 — hook: katta, qisqa savol yoki va'da. */
export function hookSvg(hook) {
  const q = qatorlarga(hook, 920, 92, 700).slice(0, 3);
  const y0 = 1330 - (q.length - 1) * 52;
  return svg(`${tepa()}
    ${q.map((s, i) => matn(s, y0 + i * 108, { olcham: 92 })).join('')}
    <rect x="${W / 2 - 90}" y="${y0 + q.length * 108 - 50}" width="180" height="12" rx="6" fill="${T.lime}"/>`);
}

/** Sahna 2–4 — bitta afzallik, raqam bilan. */
export function punktSvg(i, punkt, nom = '') {
  // qatorlarga() harf kengligini ehtiyot bilan oladi — panel ichi to'liq ishlatilsin
  const q = qatorlarga(punkt, 1000, 68, 700).slice(0, 3);
  const panelY = 990, panelH = 190 + q.length * 84;
  return svg(`${tepa()}
    <rect x="70" y="${panelY}" width="${W - 140}" height="${panelH}" rx="44" fill="#ffffff" fill-opacity="0.95"/>
    <circle cx="170" cy="${panelY + 92}" r="54" fill="${T.qizil}"/>
    ${matn(String(i), panelY + 114, { x: 170, olcham: 60, rang: T.oq })}
    ${matn(nom ? qatorlarga(nom, 640, 30, 600)[0] : 'Nega aynan shu?', panelY + 104, { x: 252, anchor: 'start', olcham: 30, ogirlik: 600, rang: '#7a5a5f' })}
    ${q.map((s, k) => matn(s, panelY + 214 + k * 84, { x: 110, anchor: 'start', olcham: 68, rang: T.matn })).join('')}`);
}

/** Oxirgi sahna — nom, narx va chaqiriq. */
export function ctaSvg({ nom, brend, narx, eskiNarx, chaqiriq, pastki }) {
  const nq = qatorlarga(nom, 900, 54, 700).slice(0, 2);
  const y = 1230;
  return svg(`${tepa()}
    ${brend ? matn(String(brend).toUpperCase(), y - 70, { olcham: 32, ogirlik: 700, rang: T.lime }) : ''}
    ${nq.map((s, i) => matn(s, y + i * 64, { olcham: 54 })).join('')}
    ${eskiNarx ? matn(eskiNarx, y + nq.length * 64 + 40, { olcham: 40, ogirlik: 600, rang: T.kul, chiz: true }) : ''}
    ${matn(narx, y + nq.length * 64 + (eskiNarx ? 130 : 90), { olcham: 104, rang: T.lime })}
    <rect x="110" y="${H - 360}" width="${W - 220}" height="128" rx="64" fill="${T.qizil}"/>
    ${matn(chaqiriq, H - 278, { olcham: 50 })}
    ${matn(pastki, H - 160, { olcham: 32, ogirlik: 600, rang: T.kul })}`);
}
