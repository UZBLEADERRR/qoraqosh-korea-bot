// AI qatlamining yagona kirish nuqtasi.
// Qaysi provayder ishlatilishi kalitlarga qarab hal qilinadi:
//   OPENROUTER_API_KEY bo'lsa  → OpenRouter (asosiy)
//   GEMINI_API_KEY bo'lsa      → Google (asosiy yoki zaxira)
// Ikkalasi ham bo'lsa: OpenRouter yiqilsa Google'ga o'tadi.
import { config } from '../config.js';
import { googleJson, googleRasm, geminiHovuz } from './google.js';
import { openrouterJson, orHovuz } from './openrouter.js';
import { navbatga, pauzaQil, kutishSoniyasi } from './navbat.js';

export const openrouterBormi = () => Boolean(config.openrouterKey);
export const googleBormi     = () => Boolean(config.geminiKey);
export const aiBormi         = () => openrouterBormi() || googleBormi();

/** Hozir qaysi provayder asosiy. */
export function provayder() {
  if (openrouterBormi()) return { nom: 'openrouter', model: config.openrouterModel };
  if (googleBormi())     return { nom: 'google', model: config.geminiModel };
  return { nom: 'yoq', model: '—' };
}

/**
 * Tuzilgan JSON javob. Provayder tanlash va zaxiraga o'tish shu yerda.
 * @param {Array}  parts  [{text}, {inline_data:{mime_type,data}}]
 * @param {object} schema OpenAPI subset sxemasi
 */
export async function aiJson(parts, schema, opts = {}) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });
  // Hamma chaqiruv BITTA darvozadan o'tadi: minglab odam bir vaqtda
  // so'rasa ham provayder chegarasi buzilmaydi.
  return navbatga(() => chaqir(parts, schema, opts), { muhim: opts.muhim });
}

async function chaqir(parts, schema, opts) {
  if (openrouterBormi()) {
    try {
      return await openrouterJson(parts, schema, opts);
    } catch (e) {
      cheklovmi(e);
      if (!googleBormi()) throw e;
      // Zaxiraga o'tamiz — mijoz uchun uzilish bo'lmasin
      console.warn(`OpenRouter yiqildi (${e.turkum || '?'}: ${e.message.slice(0, 120)}) → Google'ga o'tildi`);
      try {
        return await googleJson(parts, schema, opts);
      } catch (g) { cheklovmi(g); throw g; }
    }
  }
  try {
    return await googleJson(parts, schema, opts);
  } catch (e) { cheklovmi(e); throw e; }
}

/**
 * Provayder «juda ko'p so'rov» dedimi?
 *
 * Shunda BUTUN navbat pauza qiladi. Aks holda navbatdagi yuzta so'rov
 * ketma-ket urilib, cheklovni yanada uzaytiradi.
 */
function cheklovmi(e) {
  const m = String(e?.message || '');
  if (e?.turkum === 'cheklov' || /\b429\b|rate limit|too many requests|quota|resource_exhausted/i.test(m)) {
    pauzaQil(kutishSoniyasi(m));
  }
}

/** Rasm chizish — faqat Google (OpenRouter'da Gemini image API yo'q). */
export async function aiRasm(parts, opts = {}) {
  if (!googleBormi()) {
    throw Object.assign(
      new Error('Rasm chizish uchun GEMINI_API_KEY kerak (OpenRouter buni qo‘llamaydi)'),
      { turkum: 'kalit' });
  }
  // Rasm chizish eng qimmat chaqiruv — u ham navbatdan o'tadi
  return navbatga(async () => {
    try {
      return await googleRasm(parts, opts);
    } catch (e) { cheklovmi(e); throw e; }
  }, { muhim: opts.muhim });
}

/** Gemini "parts" uchun rasm bo'lagi. */
export const rasmPart = (base64, mime = 'image/jpeg') => ({
  inline_data: { mime_type: mime, data: base64 },
});

/**
 * Kalitlar holati — admin panel uchun.
 * Kalitning O'ZI hech qachon qaytarilmaydi, faqat oxirgi 4 belgi.
 */
export function kalitHolati() {
  return {
    google:     geminiHovuz.holatlar(),
    openrouter: orHovuz.holatlar(),
  };
}
