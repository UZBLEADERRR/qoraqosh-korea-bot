// TAHLIL QATLAMLARI — natija RASMI uchun (server).
//
// Ilovadagi qatlamlar bilan AYNAN bir xil bo'lishi uchun hisob kodi
// bitta: public/app/qatlam.js. U DOM siz yozilgan va shu yerda ham
// ishga tushiriladi. Suratni resvg piksellarga ochadi, natija
// esa PNG bo'lib kartochkaga qo'yiladi. AI ishlatilmaydi.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { svgdanPiksel, rasmOlchami } from './chiz.js';

const FAYL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'app', 'qatlam.js');
// `vm` ichida emas: u yerda har `Math` murojaati qum qutisi orqali
// o'tadi va hisob 20 marta sekinlashardi. Fayl o'z obyektiga yozadi —
// global muhit ifloslanmaydi.
const muhit = {};
new Function('globalThis', fs.readFileSync(FAYL, 'utf8'))(muhit);
const Qatlam = muhit.Qatlam;

/** Ro'yxat (kalit, nom, izoh) — kartochka va ilova bir xil tartibda. */
export const QATLAMLAR = Qatlam.QATLAMLAR.map(({ kalit, nom, izoh }) => ({ kalit, nom, izoh }));

// ── Kichik PNG kodlovchi (RGB, filtrsiz) ──
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bolak = (tur, data) => {
  const uz = Buffer.alloc(4); uz.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(tur, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([uz, td, c]);
};
export function pngKodla(rgba, en, boy) {
  const xom = Buffer.alloc((en * 3 + 1) * boy);
  for (let y = 0; y < boy; y++) {
    const q = y * (en * 3 + 1);
    xom[q] = 0;
    for (let x = 0; x < en; x++) {
      const i = (y * en + x) * 4, o = q + 1 + x * 3;
      xom[o] = rgba[i]; xom[o + 1] = rgba[i + 1]; xom[o + 2] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(en, 0); ihdr.writeUInt32BE(boy, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bolak('IHDR', ihdr), bolak('IDAT', zlib.deflateSync(xom, { level: 6 })), bolak('IEND', Buffer.alloc(0))]);
}

/**
 * Suratdan hamma qatlamni hisoblaydi.
 * @param {string} rasmBase64
 * @param {string} mime
 * @param {{x,y,en,boy}|null} yuz  yuz qutisi rasm foizida
 * @param {number} eni  qatlam kengligi (kartochkadagi eskiz uchun 300 yetarli)
 * @returns {Promise<Record<string,string>|null>} kalit → PNG base64
 */
export async function qatlamRasmlari(rasmBase64, mime, yuz = null, eni = 300) {
  if (!rasmBase64) return null;
  const o = rasmOlchami(Buffer.from(rasmBase64, 'base64'));
  if (!o?.en || !o?.boy) return null;
  const boy = Math.max(1, Math.round(eni * o.boy / o.en));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eni}" height="${boy}">`
    + `<image href="data:${mime};base64,${rasmBase64}" width="${eni}" height="${boy}" preserveAspectRatio="none"/></svg>`;
  const { piksel, en, boy: b } = await svgdanPiksel(svg, eni);
  const t = Qatlam.tayyorla(piksel, en, b, yuz);
  const natija = {};
  for (const q of QATLAMLAR) natija[q.kalit] = pngKodla(t.chiz(q.kalit), en, b).toString('base64');
  return natija;
}
