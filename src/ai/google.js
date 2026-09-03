// Google Generative Language API (to'g'ridan-to'g'ri).
import { config } from '../config.js';

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * MUHIM: gemini-2.5-* — "thinking" modellari. O'ylash tokenlari
 * maxOutputTokens dan yeyiladi, ya'ni byudjet kichik bo'lsa model javob
 * yozishga ulgurmay MAX_TOKENS bilan to'xtaydi va BO'SH javob qaytaradi.
 * Shuning uchun tuzilgan (JSON) javoblarda o'ylashni o'chiramiz va
 * byudjetni keng qo'yamiz.
 */
function tana(parts, schema, opts) {
  const oylash = opts.oylash ?? 0;
  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: opts.maxTokens ?? 8192,
      ...(oylash >= 0 ? { thinkingConfig: { thinkingBudget: oylash } } : {}),
    },
    safetySettings: [
      'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT',
    ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
  };
}

function xatoTashla(kod, matn) {
  const e = new Error(`Google HTTP ${kod}: ${String(matn).slice(0, 400)}`);
  e.turkum = kod === 400 ? 'sorov'
           : kod === 401 || kod === 403 ? 'kalit'
           : kod === 404 ? 'model'
           : kod === 429 ? 'kvota' : 'nomalum';
  e.kod = kod;
  throw e;
}

export async function googleJson(parts, schema, opts = {}) {
  const model = opts.model || config.geminiModel;
  let oxirgi;

  for (let urinish = 0; urinish < 3; urinish++) {
    // Har qayta urinishda byudjetni IKKI BAROBAR oshiramiz:
    // 8192 → 16384 → 32768. Javob uzilib qolgan bo'lsa shu yordam beradi.
    const maxTokens = (opts.maxTokens ?? 8192) * (1 << urinish);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
    let res;
    try {
      res = await fetch(`${config.geminiApi}/${model}:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana(parts, schema, { ...opts, maxTokens })),
        signal: ctrl.signal,
      });
    } catch (e) {
      oxirgi = Object.assign(e, { turkum: e.name === 'AbortError' ? 'vaqt' : 'tarmoq' });
      await kut(700 * (urinish + 1));
      continue;
    } finally { clearTimeout(timer); }

    if (res.status === 429 || res.status >= 500) {
      oxirgi = Object.assign(new Error(`Google HTTP ${res.status}`),
        { turkum: res.status === 429 ? 'kvota' : 'band' });
      await kut(900 * (urinish + 1));
      continue;
    }
    if (!res.ok) xatoTashla(res.status, await res.text().catch(() => ''));

    const data = await res.json();
    const cand = data?.candidates?.[0];

    if (data?.promptFeedback?.blockReason || /SAFETY/.test(cand?.finishReason || '')) {
      throw Object.assign(new Error('Google xavfsizlik filtri rad etdi'), { turkum: 'xavfsizlik' });
    }
    const text = (cand?.content?.parts || []).map((p) => p.text).filter(Boolean).join('');

    if (cand?.finishReason === 'MAX_TOKENS' && !text) {
      // O'ylash byudjetni yeb qo'ygan — keyingi urinishda ikki barobar beramiz
      oxirgi = Object.assign(
        new Error(`Javob uzilib qoldi (MAX_TOKENS, byudjet ${maxTokens})`), { turkum: 'uzilgan' });
      continue;
    }
    if (!text) {
      oxirgi = Object.assign(
        new Error(`Bo'sh javob (finishReason: ${cand?.finishReason || 'yo\'q'})`), { turkum: 'bosh' });
      continue;
    }
    try { return JSON.parse(text); }
    catch { throw Object.assign(new Error(`JSON emas: ${text.slice(0, 200)}`), { turkum: 'json' }); }
  }
  throw oxirgi || Object.assign(new Error('Google javob bermadi'), { turkum: 'nomalum' });
}

/** Rasm chizish (gemini-*-image). */
export async function googleRasm(parts, { nisbat, model, timeoutMs = 90000 } = {}) {
  const m = model || config.geminiImageModel;
  const yubor = (imageConfigBilan) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(`${config.geminiApi}/${m}:generateContent?key=${config.geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          ...(imageConfigBilan && nisbat ? { imageConfig: { aspectRatio: nisbat } } : {}),
        },
      }),
    });
  };

  // Nisbat SAQLANADI. Ilgari 400 yoki 429 da imageConfig tashlab
  // yuborilardi va model o'z sukutini — keng gorizontal rasmni —
  // qaytarardi. Endi qayta urinishda ham nisbat beriladi; faqat
  // imageConfig ni MODEL tushunmagan holatdagina u olib tashlanadi
  // (aks holda rasm umuman kelmaydi).
  let res = await yubor(true);
  if (res.status === 429 || res.status >= 500) { await kut(1200); res = await yubor(true); }
  if (res.status === 400 && nisbat) {
    const matn = await res.clone().text().catch(() => '');
    // 400 imageConfig sababli bo'lsagina nisbatsiz urinamiz
    if (/imageConfig|aspectRatio|aspect_ratio/i.test(matn)) res = await yubor(false);
  }
  if (!res.ok) xatoTashla(res.status, await res.text().catch(() => ''));

  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (/SAFETY/.test(cand?.finishReason || '')) {
    throw Object.assign(new Error('Model bu so‘rov bo‘yicha rasm chizishdan bosh tortdi'),
      { turkum: 'xavfsizlik' });
  }
  const rasm = (cand?.content?.parts || [])
    .map((p) => p.inline_data || p.inlineData).find((d) => d?.data);
  if (!rasm) {
    const matn = (cand?.content?.parts || []).map((p) => p.text).filter(Boolean).join(' ');
    throw Object.assign(new Error(matn ? `Rasm o‘rniga matn: ${matn.slice(0, 160)}` : 'Rasm qaytmadi'),
      { turkum: 'bosh' });
  }
  return { base64: rasm.data, mime: rasm.mime_type || rasm.mimeType || 'image/png' };
}
