// TERI RANGI — yonoqlardan o'lchanadigan o'rtacha rang (hex).
//
// Model rangni raqam bilan aytishda adashadi, piksel esa yolg'on gapirmaydi.
// Ikkala yonoqdan (yuz qutisining o'rta-pastki yon qismlari) teri piksellari
// olinadi: soya (juda qorong'i) va yorug'lik aksi (juda yorug') tashlanadi,
// qolganining o'rtachasi — teri rangi. Ton tanlashda shu ishlatiladi.
import { svgdanPiksel, rasmOlchami } from './chiz.js';

const YUZ_TAXMIN = { x: 12, y: 5, en: 76, boy: 80 };   // public/app/qatlam.js bilan bir xil
const hex2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

/**
 * @param {Uint8Array|Uint8ClampedArray} rgba  W×H×4
 * @param {{x,y,en,boy}|null} yuz  rasm foizida
 * @returns {string|null} '#rrggbb'
 */
export function piksellardanTeriRangi(rgba, W, H, yuz) {
  const q = yuz && yuz.en > 0 && yuz.boy > 0 ? yuz : YUZ_TAXMIN;
  const qism = [[0.16, 0.38], [0.62, 0.84]];            // chap va o'ng yonoq (x bo'yicha)
  const y0 = Math.floor((q.y + q.boy * 0.48) / 100 * H), y1 = Math.ceil((q.y + q.boy * 0.70) / 100 * H);
  const yorugliklar = [], ranglar = [];
  for (const [a, b] of qism) {
    const x0 = Math.floor((q.x + q.en * a) / 100 * W), x1 = Math.ceil((q.x + q.en * b) / 100 * W);
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const i = (y * W + x) * 4, r = rgba[i], g = rgba[i + 1], bl = rgba[i + 2];
        const yy = 0.299 * r + 0.587 * g + 0.114 * bl;
        const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * bl, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * bl;
        if (!(yy > 35 && cr >= 133 && cr <= 182 && cb >= 76 && cb <= 132)) continue;   // teri emas
        yorugliklar.push(yy); ranglar.push([r, g, bl, yy]);
      }
    }
  }
  if (ranglar.length < 30) return null;
  // Soya va yaltirash: yorug'lik bo'yicha pastki 15% va yuqori 15% tashlanadi
  const t = yorugliklar.sort((m, n) => m - n);
  const past = t[Math.floor(t.length * 0.15)], yuqori = t[Math.floor(t.length * 0.85)];
  let s = [0, 0, 0], n = 0;
  for (const [r, g, b, yy] of ranglar) {
    if (yy < past || yy > yuqori) continue;
    s[0] += r; s[1] += g; s[2] += b; n++;
  }
  if (!n) return null;
  return `#${hex2(s[0] / n)}${hex2(s[1] / n)}${hex2(s[2] / n)}`;
}

/** base64 suratdan teri rangi. Xato bo'lsa null — tahlil baribir davom etadi. */
export async function teriRangi(base64, mime, yuz) {
  try {
    const o = rasmOlchami(Buffer.from(base64, 'base64'));
    if (!o?.en || !o?.boy) return null;
    const eni = 240, boy = Math.max(1, Math.round(eni * o.boy / o.en));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eni}" height="${boy}">`
      + `<image href="data:${mime};base64,${base64}" width="${eni}" height="${boy}" preserveAspectRatio="none"/></svg>`;
    const { piksel, en, boy: b } = await svgdanPiksel(svg, eni);
    return piksellardanTeriRangi(piksel, en, b, yuz);
  } catch { return null; }
}
