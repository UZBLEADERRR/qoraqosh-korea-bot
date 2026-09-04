// Rasmni ekranga mos o'lchamga keltirish va JPEG ga o'girish.
//
// Muammo. AI dan kelgan poster — 1024px PNG, ya'ni 1–2 MB. Do'kon
// kartochkasi esa telefonda ~150px, 2× ekranda 300px. Ya'ni biz kerak
// bo'lganidan o'n barobar ko'p piksel va yigirma barobar ko'p bayt
// yuboryapmiz. Mobil internetda ilova shundan «sekin ishlaydi».
//
// Yechim: kerakli kenglikka kichraytirib, JPEG qilib beramiz.
// 400px JPEG ≈ 25–40 KB — 1.5 MB o'rniga.
//
// Quvur: PNG → (resvg bilan kichraytirish) → PNG → xom RGB → JPEG.
// resvg allaqachon loyihada bor va rasmni sifatli kichraytiradi.
import { svgdanPng } from './chiz.js';
import { pngdanRgb } from '../lib/pdf.js';
import { rgbdanJpeg } from '../lib/jpeg.js';

/** PNG/JPEG sarlavhasidan o'lcham. Bilib bo'lmasa null. */
export function olchamOl(bayt) {
  if (!bayt || bayt.length < 24) return null;
  // PNG
  if (bayt.readUInt32BE(0) === 0x89504e47) {
    return { eni: bayt.readUInt32BE(16), boyi: bayt.readUInt32BE(20) };
  }
  // JPEG — SOF markerini qidiramiz
  if (bayt[0] === 0xff && bayt[1] === 0xd8) {
    for (let i = 2; i + 9 < bayt.length;) {
      if (bayt[i] !== 0xff) { i++; continue; }
      const m = bayt[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { boyi: bayt.readUInt16BE(i + 5), eni: bayt.readUInt16BE(i + 7) };
      }
      i += 2 + bayt.readUInt16BE(i + 2);
    }
  }
  return null;
}

/**
 * Rasmni berilgan kenglikka kichraytirib JPEG qaytaradi.
 *
 * @param {Buffer} bayt      asl rasm (PNG yoki JPEG)
 * @param {string} mime
 * @param {object} o
 * @param {number} [o.eni]   maksimal kenglik (asl kichikroq bo'lsa o'zgarmaydi)
 * @param {number} [o.sifat] JPEG sifati 1..100
 * @returns {Promise<{bayt:Buffer, mime:string}>}
 */
export async function jpegQil(bayt, mime, { eni = 480, sifat = 72 } = {}) {
  const o = olchamOl(bayt);
  if (!o?.eni) throw new Error('O‘LCHAM_YOQ');

  // Asl rasm allaqachon kichik bo'lsa kattalashtirib o'tirmaymiz
  const chEni = Math.max(32, Math.min(eni, o.eni));
  const chBoyi = Math.max(1, Math.round((o.boyi / o.eni) * chEni));

  // resvg SVG ni rasterlaydi — rasmni ichiga joylab, kerakli kenglikda
  // chizdiramiz. Kichraytirish sifati kutubxonanikidek.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chEni}" height="${chBoyi}"
      viewBox="0 0 ${chEni} ${chBoyi}">
    <rect width="${chEni}" height="${chBoyi}" fill="#ffffff"/>
    <image href="data:${mime || 'image/png'};base64,${bayt.toString('base64')}"
      x="0" y="0" width="${chEni}" height="${chBoyi}" preserveAspectRatio="none"/>
  </svg>`;

  const png = await svgdanPng(svg, chEni);
  const { eni: pe, boyi: pb, rgb } = pngdanRgb(png);
  return { bayt: rgbdanJpeg(rgb, pe, pb, sifat), mime: 'image/jpeg' };
}
