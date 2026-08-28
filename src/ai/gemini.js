// Gemini bilan ishlashning yagona quyi qatlami.
// Har doim JSON qaytaradi (responseSchema bilan majburlanadi) va
// tarmoq xatosida cheklangan marta qayta uriniladi.
import { config } from '../config.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiBormi = () => Boolean(config.geminiKey);

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {Array} parts        Gemini "parts" massivi (matn va/yoki inline_data)
 * @param {object} schema      responseSchema (OpenAPI subset)
 * @param {object} [opts]
 */
export async function geminiJson(parts, schema, opts = {}) {
  if (!geminiBormi()) throw new Error('GEMINI_KALIT_YOQ');

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
        throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 300)}`);
      }

      const data = await res.json();
      const cand = data?.candidates?.[0];
      if (cand?.finishReason === 'SAFETY') throw new Error('GEMINI_XAVFSIZLIK');

      const text = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
      if (!text) throw new Error('GEMINI_BOSH_JAVOB');
      return JSON.parse(text);
    } catch (e) {
      oxirgiXato = e;
      if (e.name === 'AbortError' || /HTTP 5|429/.test(e.message)) {
        await kut(700 * (urinish + 1));
        continue;
      }
      throw e;
    }
  }
  throw oxirgiXato || new Error('GEMINI_XATO');
}

/** Telegram/brauzerdan kelgan rasmni Gemini parts formatiga o'giradi. */
export const rasmPart = (base64, mime = 'image/jpeg') => ({
  inline_data: { mime_type: mime, data: base64 },
});
