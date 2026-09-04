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

/**
 * Gemini'ga xos kalitlarni olib tashlaydi.
 *
 * `propertyOrdering` — Google kengaytmasi. OpenAI uslubidagi qat'iy
 * (strict) json_schema tekshiruvi notanish kalitni ko'rsa BUTUN so'rovni
 * 400 bilan rad etadi va skaner ishlamay qoladi.
 */
function sxemaniTozala(x) {
  if (Array.isArray(x)) return x.map(sxemaniTozala);
  if (!x || typeof x !== 'object') return x;
  const chiqish = {};
  for (const [k, v] of Object.entries(x)) {
    if (k === 'propertyOrdering') continue;
    chiqish[k] = sxemaniTozala(v);
  }
  // strict rejimda hamma xossa "required" bo'lishi va qo'shimchasi
  // taqiqlanishi kerak
  if (chiqish.type === 'object' && chiqish.properties && chiqish.additionalProperties === undefined) {
    chiqish.additionalProperties = false;
  }
  return chiqish;
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

  const tozaSxema = sxemaniTozala(schema);

  for (let urinish = 0; urinish < 3; urinish++) {
    // Har qayta urinishda javob byudjetini ikki barobar oshiramiz:
    // uzilib qolgan JSON ni tuzatishning yagona to'g'ri yo'li shu.
    const maxTokens = (opts.maxTokens ?? 8192) * (1 << Math.min(2, urinish));
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
          max_tokens: maxTokens,
          response_format: qattiqSxema
            ? { type: 'json_schema', json_schema: { name: 'natija', strict: true, schema: tozaSxema } }
            : { type: 'json_object' },
          // Thinking modellarida o'ylashni o'chiramiz — javob byudjetini
          // yemasin. Ba'zi modellar `reasoning` ni umuman qabul qilmaydi va
          // 400 qaytaradi, shuning uchun ikkinchi urinishdan uni yubormaymiz.
          ...(urinish === 0 ? { reasoning: { max_tokens: 0, exclude: true } } : {}),
        }),
      });
    } catch (e) {
      oxirgi = Object.assign(e, { turkum: e.name === 'AbortError' ? 'vaqt' : 'tarmoq' });
      await kut(700 * (urinish + 1));
      continue;
    } finally { clearTimeout(timer); }

    if (res.status === 400 && urinish < 2) {
      // Model json_schema yoki reasoning ni qo'llab-quvvatlamadi —
      // soddaroq rejimda qaytamiz. Haqiqiy sabab logda qolsin.
      const matn = await res.text().catch(() => '');
      console.warn(`OpenRouter 400 (urinish ${urinish}) → soddalashtiramiz: ${matn.slice(0, 300)}`);
      oxirgi = new Error('json_schema/reasoning qo‘llab-quvvatlanmadi');
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
      // finish_reason "length" bo'lsa javob YARIM kelgan — bu "tushunarsiz
      // javob" emas, byudjet yetmagan. Keyingi urinishda ko'proq beramiz.
      const uzilgan = tanlov?.finish_reason === 'length';
      oxirgi = Object.assign(
        new Error(uzilgan
          ? `Javob uzilib qoldi (byudjet ${maxTokens})`
          : `JSON emas: ${toza.slice(0, 200)}`),
        { turkum: uzilgan ? 'uzilgan' : 'json' });
      continue;
    }
  }
  throw oxirgi || Object.assign(new Error('OpenRouter javob bermadi'), { turkum: 'nomalum' });
}
