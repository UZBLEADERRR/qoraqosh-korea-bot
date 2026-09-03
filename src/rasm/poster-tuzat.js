// AI chizgan posterni TUZATISH: nisbat va yozuv.
//
// Ikki muammo bor edi:
//   1. Model so'ralgan nisbatni har doim ham bermaydi — kvadrat so'rasang
//      keng gorizontal rasm qaytarib qo'yadi.
//   2. Model o'zbekcha yozuvni xato yozadi ("Tabiatdan ilhom" o'rniga
//      tanib bo'lmaydigan harflar). Bu brendni arzonlashtiradi.
//
// Yechim: rasmni O'ZIMIZ kesamiz va yozuvni O'ZIMIZ yozamiz — repozitoriyadagi
// shrift bilan, ya'ni imlo har doim to'g'ri.
import { svgdanPng, x, qatorlarga } from './chiz.js';

/** PNG/JPEG/WebP sarlavhasidan o'lcham. Aniqlanmasa null. */
export function rasmOlchami(bayt) {
  const b = Buffer.isBuffer(bayt) ? bayt : Buffer.from(bayt);
  // PNG: 8 bayt imzo + IHDR
  if (b.length > 24 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') {
    return { eni: b.readUInt32BE(16), boyi: b.readUInt32BE(20) };
  }
  // JPEG: SOFn bo'lagini qidiramiz
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const belgi = b[i + 1];
      const uzunlik = b.readUInt16BE(i + 2);
      // SOF0..SOF15 (DHT, DAC va RSTn dan tashqari)
      if (belgi >= 0xc0 && belgi <= 0xcf && belgi !== 0xc4 && belgi !== 0xc8 && belgi !== 0xcc) {
        return { boyi: b.readUInt16BE(i + 5), eni: b.readUInt16BE(i + 7) };
      }
      i += 2 + uzunlik;
    }
  }
  // WebP (VP8X)
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
      && b.toString('ascii', 12, 16) === 'VP8X') {
    return { eni: (b.readUIntLE(24, 3) + 1), boyi: (b.readUIntLE(27, 3) + 1) };
  }
  return null;
}

const NISBAT_SON = { '1:1': 1, '3:4': 3 / 4, '4:3': 4 / 3, '9:16': 9 / 16, '16:9': 16 / 9 };

/**
 * Rasmni kerakli nisbatga KESADI (markazdan) va ustiga yozuv qo'yadi.
 *
 * @param {object} p
 * @param {string} p.base64
 * @param {string} p.mime
 * @param {string} p.nisbat     '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
 * @param {string} [p.matnBosh] sarlavha — biz yozamiz, model emas
 * @param {string} [p.matnQosh] ostidagi qator
 * @returns {Promise<{base64:string, mime:string, kesildi:boolean}>}
 */
export async function posterniTuzat({ base64, mime, nisbat, matnBosh = '', matnQosh = '' }) {
  const maqsad = NISBAT_SON[nisbat] || NISBAT_SON['3:4'];
  const bayt = Buffer.from(base64, 'base64');
  const o = rasmOlchami(bayt);
  const yozuvBor = Boolean(String(matnBosh).trim() || String(matnQosh).trim());

  // O'lchamni o'qiy olmasak va yozuv ham kerak bo'lmasa — tegmaymiz
  if (!o && !yozuvBor) return { base64, mime, kesildi: false };

  const eni = o?.eni || 1024;
  const boyi = o?.boyi || Math.round(1024 / maqsad);
  const joriy = eni / boyi;
  const kerak = Math.abs(joriy - maqsad) / maqsad > 0.04;
  if (!kerak && !yozuvBor) return { base64, mime, kesildi: false };

  // Chiqish o'lchami: kengligi saqlanadi, bo'yi nisbatdan
  const chEni = Math.min(1400, Math.max(768, eni));
  const chBoyi = Math.round(chEni / maqsad);

  // Rasmni markazdan qirqib, butun maydonni to'ldiramiz (cover)
  const koef = Math.max(chEni / eni, chBoyi / boyi);
  const rEni = eni * koef;
  const rBoyi = boyi * koef;
  const rx = (chEni - rEni) / 2;
  const ry = (chBoyi - rBoyi) / 2;

  const qat = [];
  qat.push(`<image href="data:${mime || 'image/png'};base64,${base64}"
    x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rEni.toFixed(1)}" height="${rBoyi.toFixed(1)}"
    preserveAspectRatio="none"/>`);

  if (yozuvBor) {
    // Yozuv pastda: ustiga qoraygan parda — har qanday rasmda o'qiladi
    const boshO = Math.round(chEni * 0.072);
    const qoshO = Math.round(chEni * 0.036);
    const boshQat = qatorlarga(matnBosh, chEni * 0.86, boshO, 700).slice(0, 3);
    const qoshQat = qatorlarga(matnQosh, chEni * 0.86, qoshO, 400).slice(0, 2);
    const yozuvH = boshQat.length * boshO * 1.16 + (qoshQat.length ? qoshQat.length * qoshO * 1.4 + 10 : 0);
    const pardaH = Math.round(yozuvH + chEni * 0.13);

    qat.push(`<defs><linearGradient id="parda" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.86"/></linearGradient></defs>`);
    qat.push(`<rect x="0" y="${chBoyi - pardaH}" width="${chEni}" height="${pardaH}" fill="url(#parda)"/>`);

    let y = chBoyi - pardaH + Math.round(chEni * 0.075);
    const chap = Math.round(chEni * 0.07);
    for (const s of boshQat) {
      qat.push(`<text x="${chap}" y="${y}" font-size="${boshO}" font-weight="700"
        fill="#ffffff">${x(s)}</text>`);
      y += Math.round(boshO * 1.16);
    }
    if (qoshQat.length) {
      y += 8;
      for (const s of qoshQat) {
        qat.push(`<text x="${chap}" y="${y}" font-size="${qoshO}" fill="#ffffff"
          fill-opacity="0.88">${x(s)}</text>`);
        y += Math.round(qoshO * 1.4);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chEni}" height="${chBoyi}"
    viewBox="0 0 ${chEni} ${chBoyi}">${qat.join('')}</svg>`;
  const png = await svgdanPng(svg, chEni);
  return { base64: png.toString('base64'), mime: 'image/png', kesildi: kerak };
}
