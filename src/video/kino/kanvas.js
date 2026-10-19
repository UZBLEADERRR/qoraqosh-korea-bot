// KANVAS — serverda Canvas 2D (@napi-rs/canvas, Skia).
//
// Nega resvg emas. Animatsiya — sekundiga 30 kadr. resvg har kadrda SVG ni
// qaytadan o'qiydi va shriftlarni qaytadan yuklaydi (~120 ms/kadr). Skia
// kanvasi esa bir marta ochiladi, kadr ~40–70 ms. Ikkinchi sabab: soya,
// xiralik (blur), gradient, kliplash, rangli emoji — hammasi tayyor.
//
// Shriftlar REPOZITORIYADAN (assets/shrift): Railway konteynerida tizim
// shriftlari yo'q. Emoji — Twemoji (COLR), 1.5 MB.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ILDIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHRIFT_PAPKA = path.join(ILDIZ, 'assets', 'shrift');

export const DISPLAY = 'KiovoDisplay';
export const EMOJI = 'KiovoEmoji';
/** Matn uchun shrift oilasi: avval Montserrat, keyin emoji, keyin zaxira. */
export const OILA = `"${DISPLAY}", "${EMOJI}", "Liberation Sans"`;

let modul = null;
let xato = null;

/** @napi-rs/canvas faqat kerak bo'lganda yuklanadi — u bo'lmasa bot baribir ishlaydi. */
export async function kanvas() {
  if (modul) return modul;
  if (xato) throw xato;
  try {
    const m = await import('@napi-rs/canvas');
    const { GlobalFonts } = m;
    for (const [fayl, oila] of [
      ['Display-Black.ttf', DISPLAY], ['Display-ExtraBold.ttf', DISPLAY],
      ['Display-Bold.ttf', DISPLAY], ['Display-SemiBold.ttf', DISPLAY],
      ['Emoji.ttf', EMOJI], ['Sans-Bold.ttf', 'Liberation Sans'], ['Sans-Regular.ttf', 'Liberation Sans'],
    ]) {
      const yol = path.join(SHRIFT_PAPKA, fayl);
      if (fs.existsSync(yol)) GlobalFonts.registerFromPath(yol, oila);
    }
    modul = m;
    return m;
  } catch (e) {
    xato = Object.assign(new Error(`KANVAS_YOQ: ${e.message}`), { turkum: 'kanvas' });
    throw xato;
  }
}

/** Animatsion video yasash mumkinmi (admin paneldagi tizim tekshiruvi uchun). */
export async function kanvasBormi() {
  try { await kanvas(); return { ha: true, sabab: '' }; } catch (e) { return { ha: false, sabab: e.message }; }
}
