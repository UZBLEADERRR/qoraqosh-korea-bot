// PWA ikonkalarini chizadi: qizil fon + KiOVO belgisi.
// Ilova telefon ekraniga o'rnatilganda shu rasm ko'rinadi.
import fs from 'node:fs';
import path from 'node:path';
import { svgdanPng } from '../src/rasm/chiz.js';

const QIZIL = '#b3161c';

/** @param {boolean} maskali  maskable uchun chetlarda bo'sh joy qoldiriladi */
const svg = (maskali) => {
  const s = 512;
  const k = maskali ? 0.72 : 0.86;     // belgi qanchalik joy egallaydi
  const w = s * k;
  const x0 = (s - w) / 2;
  const y0 = (s - w) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" ${maskali ? '' : `rx="${s * 0.22}"`} fill="${QIZIL}"/>
  <g transform="translate(${x0} ${y0}) scale(${w / 100})" fill="#fff">
    <circle cx="34" cy="17" r="7.5"/><circle cx="66" cy="17" r="7.5"/>
    <path d="M23 32c5.5 13.5 16 20.5 27 20.5S71.5 45.5 77 32"
          fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
    <text x="50" y="88" text-anchor="middle" font-family="Sans" font-weight="700"
          font-size="26" letter-spacing="-0.5" fill="#fff">KiOVO</text>
  </g>
</svg>`;
};

const chiqish = path.resolve(import.meta.dirname, '../public/app');
for (const [nom, maskali, olcham] of [
  ['ikon-192.png', false, 192],
  ['ikon-512.png', false, 512],
  ['ikon-maska.png', true, 512],
]) {
  const png = await svgdanPng(svg(maskali), olcham);
  fs.writeFileSync(path.join(chiqish, nom), png);
  console.log(`✓ ${nom} — ${(png.length / 1024).toFixed(1)} KB`);
}
