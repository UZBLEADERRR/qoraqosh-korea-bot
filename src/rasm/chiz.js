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
 * Rasmning o'lchamini FAYL SARLAVHASIDAN o'qiydi.
 *
 * Nega kerak. Natija kartochkasida yuz ustiga raqamli nishonlar
 * qo'yiladi va muammo joyining kattalashtirilgan bo'lagi ko'rsatiladi.
 * Ikkalasi ham rasmning haqiqiy nisbatini bilishni talab qiladi:
 * bilmasak, nishon yuzdan chetga tushib qoladi.
 *
 * Kutubxona kerak emas — JPEG va PNG sarlavhasi oddiy o'qiladi.
 * Tanimasak `null` qaytadi va chaqiruvchi 3:4 deb taxmin qiladi.
 *
 * @param {Buffer|Uint8Array} bayt
 * @returns {{en:number, boy:number}|null}
 */
export function rasmOlchami(bayt) {
  if (!bayt || bayt.length < 24) return null;
  const b = bayt;

  // PNG: 8 baytlik imzo, keyin IHDR (eni va bo'yi — 16-24 baytlar)
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const oq = (i) => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
    return { en: oq(16), boy: oq(20) };
  }

  // JPEG: segmentlar bo'ylab yuramiz va SOF (0xC0-0xCF) ni topamiz.
  // 0xC4 (Huffman), 0xC8 va 0xCC — SOF EMAS, ular o'tkazib yuboriladi.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const belgi = b[i + 1];
      if (belgi === 0xd8 || belgi === 0x01 || (belgi >= 0xd0 && belgi <= 0xd7)) { i += 2; continue; }
      if (belgi === 0xd9 || belgi === 0xda) break;          // rasm ma'lumoti boshlandi
      const uzunlik = (b[i + 2] << 8) | b[i + 3];
      if (uzunlik < 2) break;
      if (belgi >= 0xc0 && belgi <= 0xcf && belgi !== 0xc4 && belgi !== 0xc8 && belgi !== 0xcc) {
        return { boy: (b[i + 5] << 8) | b[i + 6], en: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + uzunlik;
    }
  }
  return null;
}
