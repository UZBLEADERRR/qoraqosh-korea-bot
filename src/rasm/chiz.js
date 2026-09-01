// SVG -> PNG. Telegram SVG ni rasm sifatida ko'rsatmaydi, shuning uchun
// serverda rasterlaymiz.
//
// MUHIM: shriftlar repozitoriyadan yuklanadi (assets/shrift), tizimdagilar
// EMAS. Railway konteynerida shrift bo'lmasligi mumkin — u holda resvg
// matnni jimgina tashlab ketadi va rasm bo'sh chiqadi.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ILDIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHRIFTLAR = ['Sans-Regular.ttf', 'Sans-Bold.ttf']
  .map((f) => path.join(ILDIZ, 'assets', 'shrift', f))
  .filter((f) => fs.existsSync(f));

export const SHRIFT = 'Liberation Sans';

let Resvg = null;
let yuklashXatosi = null;

/** resvg faqat kerak bo'lganda yuklanadi — u bo'lmasa ham bot ishlashi kerak. */
async function motor() {
  if (Resvg) return Resvg;
  if (yuklashXatosi) throw yuklashXatosi;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
    return Resvg;
  } catch (e) {
    yuklashXatosi = new Error(`RASM_MOTORI_YOQ: ${e.message}`);
    throw yuklashXatosi;
  }
}

/** Rasm chizish umuman mumkinmi (tizim tekshiruvi uchun). */
export async function rasmChizaOlamizmi() {
  if (!SHRIFTLAR.length) return { ha: false, sabab: 'Shrift fayllari topilmadi (assets/shrift)' };
  try {
    await motor();
    return { ha: true, sabab: '' };
  } catch (e) {
    return { ha: false, sabab: e.message };
  }
}

/**
 * @param {string} svg
 * @param {number} eni  chiqish rasmining kengligi (piksel)
 * @returns {Promise<Buffer>} PNG
 */
export async function svgdanPng(svg, eni = 1080) {
  const R = await motor();
  const r = new R(svg, {
    fitTo: { mode: 'width', value: eni },
    font: {
      fontFiles: SHRIFTLAR,
      loadSystemFonts: false,      // konteynerdan konteynerga farq qilmasin
      defaultFontFamily: SHRIFT,
    },
    background: '#ffffff',
  });
  return r.render().asPng();
}

/** XML matn ichida xavfsiz bo'lishi uchun. */
export const x = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Matnni berilgan kenglikka sig'diradi.
 * resvg matn o'lchamini oldindan aytmaydi, shuning uchun harf kengligini
 * taxmin qilamiz. Liberation Sans uchun o'rtacha ~0.52em, lekin keng harflar
 * (m, w, o'zbekcha "sh", "ch") uchun biroz ehtiyot bilan 0.55 olamiz.
 */
export function qatorlarga(matn, maxEni, olcham, ogirlik = 400) {
  const kenglik = olcham * (ogirlik >= 600 ? 0.58 : 0.55);
  const maxHarf = Math.max(8, Math.floor(maxEni / kenglik));
  const sozlar = String(matn || '').split(/\s+/).filter(Boolean);
  const qatorlar = [];
  let joriy = '';
  for (const soz of sozlar) {
    const sinov = joriy ? `${joriy} ${soz}` : soz;
    if (sinov.length <= maxHarf) { joriy = sinov; continue; }
    if (joriy) qatorlar.push(joriy);
    // Bitta so'z sig'masa — kesamiz
    joriy = soz.length > maxHarf ? soz.slice(0, maxHarf - 1) + '…' : soz;
  }
  if (joriy) qatorlar.push(joriy);
  return qatorlar;
}

/** Bir qatorga sig'maydigan matnni kesadi. */
export const kes = (matn, maxEni, olcham, ogirlik = 400) => {
  const q = qatorlarga(matn, maxEni, olcham, ogirlik);
  return q.length <= 1 ? (q[0] || '') : q[0].replace(/…$/, '') + '…';
};

/**
 * Rasm o'lchamini FAYL SARLAVHASIDAN o'qiydi — dekodlamasdan.
 *
 * Kerak, chunki suratni kvadrat ramkaga `slice` bilan joylashtiramiz
 * (qirqiladi), va muammo koordinatalarini shu qirqimga to'g'ri ko'chirish
 * uchun asl eni/bo'yini bilishimiz shart. Aks holda doiralar yuzning
 * noto'g'ri joyiga tushardi.
 *
 * @param {Buffer} bayt
 * @returns {{eni:number, boyi:number}|null} tanilmasa null
 */
export function rasmOlchami(bayt) {
  if (!Buffer.isBuffer(bayt) || bayt.length < 24) return null;

  // PNG: 8 bayt imzo, so'ng IHDR (eni va bo'yi big-endian uint32)
  if (bayt[0] === 0x89 && bayt.toString('ascii', 1, 4) === 'PNG') {
    return { eni: bayt.readUInt32BE(16), boyi: bayt.readUInt32BE(20) };
  }

  // GIF: "GIF87a"/"GIF89a", so'ng eni va bo'yi little-endian uint16
  if (bayt.toString('ascii', 0, 3) === 'GIF') {
    return { eni: bayt.readUInt16LE(6), boyi: bayt.readUInt16LE(8) };
  }

  // JPEG: segmentlarni kezib SOF0..SOF15 ni topamiz (SOF4, SOF8, SOF12 emas)
  if (bayt[0] === 0xFF && bayt[1] === 0xD8) {
    let i = 2;
    while (i + 9 < bayt.length) {
      if (bayt[i] !== 0xFF) { i++; continue; }          // to'ldiruvchi baytlar
      const belgi = bayt[i + 1];
      if (belgi === 0xD8 || belgi === 0x01 || (belgi >= 0xD0 && belgi <= 0xD7)) { i += 2; continue; }
      if (belgi === 0xDA || belgi === 0xD9) break;      // tasvir ma'lumoti boshlandi
      const uzunlik = bayt.readUInt16BE(i + 2);
      if (uzunlik < 2) break;
      const sof = belgi >= 0xC0 && belgi <= 0xCF
        && belgi !== 0xC4 && belgi !== 0xC8 && belgi !== 0xCC;
      if (sof) return { boyi: bayt.readUInt16BE(i + 5), eni: bayt.readUInt16BE(i + 7) };
      i += 2 + uzunlik;
    }
  }
  return null;
}

/**
 * Kvadrat ramkaga `preserveAspectRatio="xMidYMid slice"` bilan joylangan
 * rasmda, aslning (fx, fy) nuqtasi qayerga tushishini hisoblaydi.
 * Hammasi foizda (0-100) beriladi va piksel qaytariladi.
 *
 * @param {{eni:number, boyi:number}|null} olcham  asl rasm o'lchami
 * @param {{x:number, y:number, r:number}} joy     foizda
 * @param {number} qutiX  ramkaning chap cheti
 * @param {number} qutiY  ramkaning yuqori cheti
 * @param {number} tomon  ramka tomoni (kvadrat)
 * @returns {{x:number, y:number, r:number}|null} ramkadan chiqib ketsa null
 */
export function joyniKochir(olcham, joy, qutiX, qutiY, tomon) {
  const W = olcham?.eni || 1;
  const H = olcham?.boyi || 1;
  // slice: kichik tomon ramkani to'ldiradi, ortiqchasi ikki yondan qirqiladi
  const kat = tomon / Math.min(W, H);
  const chapSurish = (tomon - W * kat) / 2;
  const tepaSurish = (tomon - H * kat) / 2;

  const x = qutiX + chapSurish + (joy.x / 100) * W * kat;
  const y = qutiY + tepaSurish + (joy.y / 100) * H * kat;
  const r = Math.max(18, (joy.r / 100) * W * kat);

  // Markazi ramkadan tashqarida qolsa — qirqilgan joyga tushibdi, chizmaymiz
  if (x < qutiX || x > qutiX + tomon || y < qutiY || y > qutiY + tomon) return null;
  return { x, y, r };
}
