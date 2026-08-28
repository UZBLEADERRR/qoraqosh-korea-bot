// AI qatlamining yagona kirish nuqtasi.
// Qaysi provayder ishlatilishi kalitlarga qarab hal qilinadi:
//   OPENROUTER_API_KEY bo'lsa  → OpenRouter (asosiy)
//   GEMINI_API_KEY bo'lsa      → Google (asosiy yoki zaxira)
// Ikkalasi ham bo'lsa: OpenRouter yiqilsa Google'ga o'tadi.
import { config } from '../config.js';
import { googleJson, googleRasm } from './google.js';
import { openrouterJson } from './openrouter.js';

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

  if (openrouterBormi()) {
    try {
      return await openrouterJson(parts, schema, opts);
    } catch (e) {
      if (!googleBormi()) throw e;
      // Zaxiraga o'tamiz — mijoz uchun uzilish bo'lmasin
      console.warn(`OpenRouter yiqildi (${e.turkum || '?'}: ${e.message.slice(0, 120)}) → Google'ga o'tildi`);
      return await googleJson(parts, schema, opts);
    }
  }
  return await googleJson(parts, schema, opts);
}

/** Rasm chizish — faqat Google (OpenRouter'da Gemini image API yo'q). */
export async function aiRasm(parts, opts = {}) {
  if (!googleBormi()) {
    throw Object.assign(
      new Error('Rasm chizish uchun GEMINI_API_KEY kerak (OpenRouter buni qo‘llamaydi)'),
      { turkum: 'kalit' });
  }
  return await googleRasm(parts, opts);
}

/** Gemini "parts" uchun rasm bo'lagi. */
export const rasmPart = (base64, mime = 'image/jpeg') => ({
  inline_data: { mime_type: mime, data: base64 },
});
