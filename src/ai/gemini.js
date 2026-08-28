// Gemini bilan ishlashning yagona quyi qatlami.
// Har doim JSON qaytaradi (responseSchema bilan majburlanadi) va
// tarmoq xatosida cheklangan marta qayta uriniladi.
import { config } from '../config.js';

const BASE = config.geminiApi;

export const geminiBormi = () => Boolean(config.geminiKey);

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {Array} parts        Gemini "parts" massivi (matn va/yoki inline_data)
 * @param {object} schema      responseSchema (OpenAPI subset)
 * @param {object} [opts]
 */
export async function geminiJson(parts, schema, opts = {}) {
  if (!geminiBormi()) throw Object.assign(new Error('GEMINI_KALIT_YOQ'), { turkum: 'kalit' });

  const model = opts.model || config.geminiModel;
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: opts.maxTokens ?? 4096,
    },
    safetySettings: [
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
    ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
  };

  let oxirgiXato;
  for (let urinish = 0; urinish < 3; urinish++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
      const res = await fetch(`${BASE}/${model}:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));

      if (res.status === 429 || res.status >= 500) {
        oxirgiXato = new Error(`Gemini HTTP ${res.status}`);
        await kut(700 * (urinish + 1));
        continue;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        const e = new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 400)}`);
        // Turkum — chaqiruvchi mijozga to'g'ri xabar bera olsin
        e.turkum = res.status === 400 ? 'sorov'
                 : res.status === 401 || res.status === 403 ? 'kalit'
                 : res.status === 404 ? 'model'
                 : 'nomalum';
        e.kod = res.status;
        throw e;
      }

      const data = await res.json();
      const cand = data?.candidates?.[0];
      if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'IMAGE_SAFETY' ||
          data?.promptFeedback?.blockReason) {
        const e = new Error('Gemini xavfsizlik filtri rasmni rad etdi');
        e.turkum = 'xavfsizlik';
        throw e;
      }
      if (cand?.finishReason === 'MAX_TOKENS') {
        const e = new Error('Gemini javobi uzilib qoldi (MAX_TOKENS)');
        e.turkum = 'uzilgan';
        throw e;
      }

      const text = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
      if (!text) {
        const e = new Error(`Gemini bo'sh javob qaytardi (finishReason: ${cand?.finishReason || 'yo\'q'})`);
        e.turkum = 'bosh';
        throw e;
      }
      try {
        return JSON.parse(text);
      } catch {
        const e = new Error(`Gemini JSON emas: ${text.slice(0, 200)}`);
        e.turkum = 'json';
        throw e;
      }
    } catch (e) {
      oxirgiXato = e;
      if (e.name === 'AbortError') { e.turkum = 'vaqt'; await kut(700 * (urinish + 1)); continue; }
      if (/HTTP 5|429/.test(e.message)) { e.turkum = e.turkum || 'band'; await kut(700 * (urinish + 1)); continue; }
      throw e;
    }
  }
  throw oxirgiXato || Object.assign(new Error('Gemini javob bermadi'), { turkum: 'nomalum' });
}

/** Telegram/brauzerdan kelgan rasmni Gemini parts formatiga o'giradi. */
export const rasmPart = (base64, mime = 'image/jpeg') => ({
  inline_data: { mime_type: mime, data: base64 },
});

// ---------------- Rasm chizish (gemini-2.5-flash-image) ----------------
/**
 * Matn (va ixtiyoriy tayanch rasm) asosida rasm chizadi.
 * @returns {{base64:string, mime:string}}
 */
export async function geminiRasm(parts, { nisbat, model, timeoutMs = 90_000 } = {}) {
  if (!geminiBormi()) throw new Error('GEMINI_KALIT_YOQ');
  const m = model || config.geminiImageModel;

  const yubor = async (imageConfigBilan) => {
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(imageConfigBilan && nisbat ? { imageConfig: { aspectRatio: nisbat } } : {}),
      },
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/${m}:generateContent?key=${config.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    return res;
  };

  // Ba'zi model versiyalari imageConfig ni qabul qilmaydi — u holda usiz qayta yuboramiz
  let res = await yubor(true);
  if (res.status === 400 && nisbat) res = await yubor(false);

  if (res.status === 429 || res.status >= 500) {
    await kut(1200);
    res = await yubor(false);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Rasm chizishda xato (HTTP ${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'IMAGE_SAFETY') {
    throw new Error('Model bu so‘rov bo‘yicha rasm chizishdan bosh tortdi. Boshqa g‘oyani tanlang.');
  }

  const rasm = (cand?.content?.parts || [])
    .map((p) => p.inline_data || p.inlineData)
    .find((d) => d?.data);

  if (!rasm) {
    const matn = (cand?.content?.parts || []).map((p) => p.text).filter(Boolean).join(' ');
    throw new Error(matn
      ? `Model rasm o‘rniga matn qaytardi: ${matn.slice(0, 160)}`
      : 'Model rasm qaytarmadi. Qayta urinib ko‘ring.');
  }
  return { base64: rasm.data, mime: rasm.mime_type || rasm.mimeType || 'image/png' };
}
