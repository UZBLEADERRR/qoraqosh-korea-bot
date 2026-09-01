// OpenRouter — bitta kalit bilan ko'p modelga kirish.
// Gemini modelini shu orqali chaqirish mumkin: kvota va hisob-kitob
// OpenRouter tomonida bo'ladi, Google kalitini alohida boshqarish shart emas.
import { config } from '../config.js';

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gemini "parts" ni OpenRouter (OpenAI uslubidagi) xabarga o'giradi. */
function xabarga(parts) {
  const tarkib = [];
  for (const p of parts) {
    if (p.text) tarkib.push({ type: 'text', text: p.text });
    const d = p.inline_data || p.inlineData;
    if (d?.data) {
      tarkib.push({
        type: 'image_url',
        image_url: { url: `data:${d.mime_type || d.mimeType || 'image/jpeg'};base64,${d.data}` },
      });
    }
  }
  return [{ role: 'user', content: tarkib }];
}

function xatoTashla(kod, matn) {
  const e = new Error(`OpenRouter HTTP ${kod}: ${String(matn).slice(0, 400)}`);
  e.turkum = kod === 401 || kod === 403 ? 'kalit'
           : kod === 404 ? 'model'
           : kod === 402 ? 'hisob'
           : kod === 429 ? 'kvota'
           : kod === 400 ? 'sorov' : 'nomalum';
  e.kod = kod;
  throw e;
}

/**
 * Tuzilgan JSON. Avval json_schema bilan urinamiz (aniqroq),
 * model qo'llab-quvvatlamasa json_object ga tushamiz va sxemani promptga qo'shamiz.
 */
export async function openrouterJson(parts, schema, opts = {}) {
  const model = opts.orModel || config.openrouterModel;
  let oxirgi;

  for (let urinish = 0; urinish < 3; urinish++) {
    const qattiqSxema = urinish === 0;
    const xabarlar = xabarga(qattiqSxema ? parts : [
      { text: `Javobni FAQAT shu JSON sxemasiga mos qaytar:\n${JSON.stringify(schema)}\n` },
      ...parts,
    ]);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
    let res;
    try {
      res = await fetch(`${config.openrouterApi}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openrouterKey}`,
          // OpenRouter statistikasi uchun (ixtiyoriy, lekin tavsiya etiladi)
          'HTTP-Referer': config.publicUrl || 'https://qoraqosh.uz',
          'X-Title': 'KiOVO',
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages: xabarlar,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 8192,
          response_format: qattiqSxema
            ? { type: 'json_schema', json_schema: { name: 'natija', strict: true, schema } }
            : { type: 'json_object' },
          // Thinking modellarida o'ylashni o'chiramiz — javob byudjetini yemasin
          reasoning: { max_tokens: 0, exclude: true },
        }),
      });
    } catch (e) {
      oxirgi = Object.assign(e, { turkum: e.name === 'AbortError' ? 'vaqt' : 'tarmoq' });
      await kut(700 * (urinish + 1));
      continue;
    } finally { clearTimeout(timer); }

    if (res.status === 400 && qattiqSxema) {
      // Model json_schema ni qo'llab-quvvatlamadi — soddaroq rejimda qaytamiz
      oxirgi = new Error('json_schema qo‘llab-quvvatlanmadi');
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      oxirgi = Object.assign(new Error(`OpenRouter HTTP ${res.status}`),
        { turkum: res.status === 429 ? 'kvota' : 'band' });
      await kut(900 * (urinish + 1));
      continue;
    }
    if (!res.ok) xatoTashla(res.status, await res.text().catch(() => ''));

    const data = await res.json();
    if (data?.error) xatoTashla(data.error.code || 500, data.error.message || 'xato');

    const tanlov = data?.choices?.[0];
    const matn = tanlov?.message?.content;
    if (!matn) {
      oxirgi = Object.assign(
        new Error(`Bo'sh javob (finish: ${tanlov?.finish_reason || 'yo\'q'})`), { turkum: 'bosh' });
      continue;
    }
    // Ba'zi modellar JSON ni ```json ``` ichida qaytaradi
    const toza = String(matn).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    try { return JSON.parse(toza); }
    catch {
      oxirgi = Object.assign(new Error(`JSON emas: ${toza.slice(0, 200)}`), { turkum: 'json' });
      continue;
    }
  }
  throw oxirgi || Object.assign(new Error('OpenRouter javob bermadi'), { turkum: 'nomalum' });
}
