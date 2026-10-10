// XIRA NATIJA — Instagram Direct ga yuboriladigan «teaser».
//
// To'liq natija kartochkasining yuqori qismi (umumiy ball, yosh, teri
// turi) OCHIQ qoladi — odam tahlil haqiqiy ekanini ko'radi. Pastki qism
// (ko'rsatkichlar, topilgan belgilar, mos mahsulotlar) xiralashtiriladi
// va ustiga qulf bilan «To'liq natija — Telegramda» yoziladi. Shu
// qiziqish odamni botga olib o'tadi, bot esa ro'yxatdan o'tgach to'liq
// natijani beradi.
import { svgdanPng, SHRIFT } from './chiz.js';

const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** PNG o'lchami (IHDR dan). */
function pngOlcham(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { en: b.readUInt32BE(16), boy: b.readUInt32BE(20) };
  return { en: 1080, boy: 1350 };
}

/**
 * @param {Buffer} bayt  to'liq natija PNG
 * @param {{ochiq?:number, sarlavha?:string, izoh?:string, soni?:number}} o
 *        ochiq — yuqoridan nechasi ochiq qoladi (ulush, 0..1)
 */
export async function xiraNatija(bayt, { ochiq = 0.27, sarlavha = 'To‘liq natija — Telegramda', izoh = '', soni = 0 } = {}) {
  const { en, boy } = pngOlcham(bayt);
  const y = Math.round(boy * ochiq);
  const href = `data:image/png;base64,${bayt.toString('base64')}`;
  const markaz = y + Math.round((boy - y) * 0.42);
  const izohMatn = izoh || (soni ? `${soni} ta belgi va sizga mos parvarish yashirin` : 'Muammolar va sizga mos parvarish yashirin');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${en}" height="${boy}" viewBox="0 0 ${en} ${boy}">
  <defs>
    <filter id="x" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${Math.round(en / 45)}"/></filter>
    <clipPath id="k"><rect x="0" y="${y}" width="${en}" height="${boy - y}"/></clipPath>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0606" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#0b0606" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <image x="0" y="0" width="${en}" height="${boy}" xlink:href="${href}"/>
  <g clip-path="url(#k)">
    <rect x="0" y="${y}" width="${en}" height="${boy - y}" fill="#111"/>
    <image x="0" y="0" width="${en}" height="${boy}" xlink:href="${href}" filter="url(#x)"/>
    <rect x="0" y="${y}" width="${en}" height="${boy - y}" fill="url(#g)"/>
  </g>
  <g font-family="${SHRIFT}" text-anchor="middle">
    <circle cx="${en / 2}" cy="${markaz - 120}" r="62" fill="#ab0a0c"/>
    <g transform="translate(${en / 2 - 26} ${markaz - 150})" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round">
      <rect x="0" y="24" width="52" height="40" rx="8" fill="#fff" stroke="none"/>
      <path d="M10 26V16a16 16 0 0 1 32 0v10"/>
    </g>
    <text x="${en / 2}" y="${markaz + 6}" font-size="54" font-weight="700" fill="#fff">${e(sarlavha)}</text>
    <text x="${en / 2}" y="${markaz + 66}" font-size="32" fill="#f3e9e9">${e(izohMatn)}</text>
    <rect x="${en / 2 - 250}" y="${markaz + 106}" width="500" height="84" rx="42" fill="#bddb7d"/>
    <text x="${en / 2}" y="${markaz + 160}" font-size="34" font-weight="700" fill="#3b0304">Havola xabarda pastda ↓</text>
  </g>
</svg>`;
  return svgdanPng(svg, en);
}
