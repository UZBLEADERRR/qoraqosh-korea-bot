// MATN MODELI QOIDASI — egasining talabi:
//   • matn/JSON (skaner, maslahat, makiyaj, xabar yozish…) uchun FAQAT
//     Gemini 3 va undan yangi (asosan Flash); Gemini 2.x va 1.x — HECH QACHON;
//   • gemini-2.5-flash-image kabi RASM modellari bu qoidaga kirmaydi —
//     ular faqat rasm chizishda ishlatiladi.
// Gemini bo'lmagan model (masalan OpenRouter'dagi GPT) — ruxsat.
//
// Qoida KODDA turadi: Railway'da OPENROUTER_MODEL=google/gemini-2.5-flash
// qolib ketsa yoki admin ro'yxatga eski model qo'shsa ham u ishlamaydi.

/** Shu model matn uchun ruxsatmi. */
export function matnUchunMi(nom) {
  const n = String(nom || '').toLowerCase().replace(/^google\//, '');
  if (!n) return false;
  if (/image/.test(n)) return false;                 // rasm modeli — matnga emas
  const m = /gemini-(\d+)/.exec(n);
  if (m) return Number(m[1]) >= 3;
  return true;
}

/** OpenRouter orqali matn uchun xavfsiz standart. */
export const OR_MATN_STANDART = 'google/gemini-3.8-flash';
