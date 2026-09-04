// Ilova versiyasi — brauzer keshini yangilash uchun.
//
// MUAMMO: index.html "no-cache" bilan keladi, lekin app.js va style.css
// oddiy manzilda ("app.js") turgani uchun Telegram ichidagi brauzer
// ularni ESKISINI saqlab qoladi. Natijada yangi HTML eski kod bilan
// ishlaydi va odam "hech narsa o'zgarmadi" deydi.
//
// YECHIM: fayl mazmunidan qisqa xesh hisoblanadi va havolaga qo'shiladi
// ("app.js?v=a1b2c3"). Kod o'zgarsa — manzil ham o'zgaradi, brauzer
// yangisini majburan oladi. O'zgarmasa — eski keshdan ishlaydi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Versiyaga ta'sir qiladigan fayllar (papkaga nisbatan). */
const KUZATILADI = ['index.html', 'app.js', 'style.css', 'ikon.js', 'hududlar.js'];

const keshlangan = new Map();

/** Papkadagi fayllar mazmunidan 8 belgili xesh. */
export function versiyaOl(ildiz, papka, fayllar = KUZATILADI) {
  const kalit = papka;
  if (keshlangan.has(kalit)) return keshlangan.get(kalit);

  const h = crypto.createHash('sha1');
  for (const f of fayllar) {
    const p = path.resolve(ildiz, papka, f);
    try { h.update(fs.readFileSync(p)); } catch { h.update(f); }
  }
  const v = h.digest('hex').slice(0, 8);
  keshlangan.set(kalit, v);
  return v;
}

/**
 * HTML ichidagi MAHALLIY havolalarga versiya qo'shadi.
 * Tashqi manzillar (telegram.org) tegilmaydi.
 */
export function versiyalaHtml(html, v) {
  return html
    .replace(/(<link[^>]+href=")(?!https?:|\/\/|data:)([^"?]+\.css)(")/g,
      (_, a, u, b) => `${a}${u}?v=${v}${b}`)
    .replace(/(<script[^>]+src=")(?!https?:|\/\/|data:)([^"?]+\.js)(")/g,
      (_, a, u, b) => `${a}${u}?v=${v}${b}`);
}

/** Versiyalangan faylni uzoq keshlash mumkin — manzili o'zgarmaguncha o'zi. */
export const versiyalanganmi = (sorovManzili) => /[?&]v=[0-9a-f]{6,}/.test(sorovManzili || '');
