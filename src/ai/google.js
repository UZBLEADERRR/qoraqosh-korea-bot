// Google Generative Language API (to'g'ridan-to'g'ri).
import { config } from '../config.js';
import { hovuz, sabab } from './kalitlar.js';
import { modelOl, modelBand, modelYoq, modelYaxshi, kvotaTuri, kutishMs,
  modellarniTaminla, rasmModeli } from './modellar.js';

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * MUHIM: gemini-2.5-* — "thinking" modellari. O'ylash tokenlari
 * maxOutputTokens dan yeyiladi, ya'ni byudjet kichik bo'lsa model javob
 * yozishga ulgurmay MAX_TOKENS bilan to'xtaydi va BO'SH javob qaytaradi.
 * Shuning uchun tuzilgan (JSON) javoblarda o'ylashni o'chiramiz va
 * byudjetni keng qo'yamiz.
 */
/**
 * So'rov tanasi.
 *
 * `rejim` — SODDALASHTIRISH bosqichi. Google 400 qaytarsa aybdor odatda
 * qo'shimcha sozlama bo'ladi (sxemadagi biror kalit, thinkingConfig,
 * safetySettings) — modeldan yoki API versiyasidan qat'i nazar ishlashi
 * uchun ularni bosqichma-bosqich olib tashlaymiz:
 *   0 — hammasi (sxema + o'ylash sozlamasi)
 *   1 — o'ylash sozlamasisiz
 *   2 — SXEMASIZ: sxema promptga matn bo'lib qo'shiladi
 * Shunda bitta sozlama yoqmagani uchun butun skaner ishdan chiqmaydi.
 */
function tana(parts, schema, opts, rejim = 0) {
  const oylash = opts.oylash ?? 0;
  const bolaklar = rejim >= 2
    ? [{ text: `Javobni FAQAT shu JSON sxemasiga mos qaytar:\n${JSON.stringify(schema)}` }, ...parts]
    : parts;
  return {
    contents: [{ role: 'user', parts: bolaklar }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      responseMimeType: 'application/json',
      ...(rejim >= 2 ? {} : { responseSchema: schema }),
      maxOutputTokens: opts.maxTokens ?? 8192,
      ...(rejim >= 1 || oylash < 0 ? {} : { thinkingConfig: { thinkingBudget: oylash } }),
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

// Kalitlar hovuzi: bir nechta GEMINI_API_KEY berilsa navbat bilan
// ishlatiladi va kvotasi tugagani vaqtincha chetga qo'yiladi.
export const geminiHovuz = hovuz(config.geminiKeys);

export async function googleJson(parts, schema, opts = {}) {
  // Admin panelda tanlangan ro'yxat (keshlangan, 30 soniyada bir marta)
  await modellarniTaminla();
  let oxirgi;
  // 400 kelganda so'rovni soddalashtiramiz (tana() dagi izohga qarang)
  let rejim = 0;
  // Shu chaqiruvda yiqilgan modellar — ularga qaytmaymiz
  const otkaz = [];
  // Admin ANIQ modelni so'ragan bo'lsa (sinov tugmasi) — boshqasiga
  // o'tmaymiz, aks holda sinov boshqa modelni tekshirib qo'yadi.
  const qatiy = Boolean(opts.model);
  let model = opts.model || modelOl();
  // Har model uchun 4 tadan urinish, lekin jami cheksiz emas
  const MAKS = 4 + (opts.model ? 0 : 3);

  for (let urinish = 0; urinish < MAKS; urinish++) {
    // Har qayta urinishda byudjetni IKKI BAROBAR oshiramiz:
    // 8192 → 16384 → 32768. Javob uzilib qolgan bo'lsa shu yordam beradi.
    const maxTokens = (opts.maxTokens ?? 8192) * (1 << Math.min(2, urinish));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
    const k = geminiHovuz.ol();
    let res;
    try {
      res = await fetch(`${config.geminiApi}/${model}:generateContent?key=${k?.kalit || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana(parts, schema, { ...opts, maxTokens }, rejim)),
        signal: ctrl.signal,
      });
    } catch (e) {
      oxirgi = Object.assign(e, { turkum: e.name === 'AbortError' ? 'vaqt' : 'tarmoq' });
      await kut(700 * (urinish + 1));
      continue;
    } finally { clearTimeout(timer); }

    if (res.status === 429) {
      // Javob TANASINI o'qiymiz: qaysi kvota tugagani va qancha kutish
      // kerakligi aynan shu yerda yozilgan. Ilgari tana tashlab
      // yuborilardi va «Google HTTP 429» dan boshqa hech nima
      // bilinmasdi — kunlikmi, daqiqalikmi, farqi ko'rinmasdi.
      const matn = await res.text().catch(() => '');
      const tur = kvotaTuri(matn);
      const kutish = kutishMs(matn);

      // Kvota MODELGA bog'liq: shu modelni chetga qo'yib, keyingisiga
      // o'tamiz. Har modelning o'z kvotasi bor, shuning uchun bu
      // kutishdan tezroq yechim.
      modelBand(model, tur, kutish);
      if (k) geminiHovuz.yomon(k.indeks, 'kvota');
      otkaz.push(model);

      oxirgi = Object.assign(
        new Error(`Google HTTP 429 · ${model} · ${tur} kvota${
          matn ? ` · ${matn.replace(/\s+/g, ' ').slice(0, 200)}` : ''}`),
        { turkum: tur === 'kunlik' ? 'kvota_kunlik' : 'kvota', model: model, kvota: tur });

      const keyingi = qatiy ? null : modelOl(otkaz);
      // `otkaz` da bo'lsa — ro'yxat aylanib chiqdi, hammasi tugagan.
      // Qayta urinish behuda kvota sarflaydi.
      if (keyingi && keyingi !== model && !otkaz.includes(keyingi)) {
        console.warn(`Google ${model} kvotasi tugadi (${tur}) → ${keyingi}`);
        model = keyingi;
        continue;                     // yangi model bilan DARROV urinamiz
      }
      // Boshqa model qolmadi — kunlik kvotada qayta urinish behuda
      if (qatiy || tur === 'kunlik' || otkaz.length >= 2) break;
      await kut(Math.min(kutish || 900 * (urinish + 1), 3000));
      continue;
    }
    if (res.status >= 500) {
      if (k) geminiHovuz.yomon(k.indeks, 'xato');
      oxirgi = Object.assign(new Error(`Google HTTP ${res.status} · ${model}`), { turkum: 'band' });
      await kut(geminiHovuz.tayyorSoni() > 0 ? 50 : 900 * (urinish + 1));
      continue;
    }
    if (res.status === 404) {
      // Model nomi noto'g'ri yoki kalitga ruxsat yo'q. Qayta urinish
      // behuda — ro'yxatdan chiqarib, keyingisiga o'tamiz.
      modelYoq(model);
      otkaz.push(model);
      const keyingi = qatiy ? null : modelOl(otkaz);
      oxirgi = Object.assign(new Error(`Google HTTP 404 · «${model}» mavjud emas`),
        { turkum: 'model', model });
      if (keyingi && keyingi !== model) { model = keyingi; continue; }
      break;
    }
    if (res.status === 401 || res.status === 403) {
      if (k) geminiHovuz.yomon(k.indeks, 'notogri');
      if (geminiHovuz.tayyorSoni() > 0 && urinish < MAKS - 1) {
        oxirgi = Object.assign(new Error(`Google HTTP ${res.status}`), { turkum: 'kalit' });
        continue;                       // boshqa kalit bilan urinamiz
      }
    }
    if (res.status === 400) {
      const matn = await res.text().catch(() => '');
      // Google KALIT noto'g'ri bo'lganda ham 400 beradi (401 emas).
      // Buni «so'rov xatosi» deb ko'rsatish adminni chalg'itadi va
      // so'rovni soddalashtirib qayta urinish behuda.
      if (/API_KEY_INVALID|API key not valid|API key expired/i.test(matn)) {
        if (k) geminiHovuz.yomon(k.indeks, 'notogri');
        throw Object.assign(new Error(`Google: API kalit noto‘g‘ri yoki muddati tugagan`),
          { turkum: 'kalit', kod: 400 });
      }
      if (rejim < 2) {
        // Sozlamalardan biri yoqmadi — soddalashtirib qayta urinamiz.
        // Haqiqiy sababni logga yozamiz: mijozga "JPG yuboring" deb
        // aytish noto'g'ri bo'lardi, muammo rasmda emas.
        console.warn(`Google 400 (rejim ${rejim}) → soddalashtiramiz: ${matn.slice(0, 300)}`);
        rejim += 1;
        continue;
      }
      xatoTashla(400, matn);
    }
    if (!res.ok) {
      if (k) geminiHovuz.yomon(k.indeks, sabab(new Error(`HTTP ${res.status}`)));
      xatoTashla(res.status, await res.text().catch(() => ''));
    }
    if (k) geminiHovuz.yaxshi(k.indeks);
    modelYaxshi(model);

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
    catch {
      // Javob YARIM kelgan bo'lsa JSON albatta buziladi. Ilgari shu yerda
      // darrov xato tashlanardi va odam "AI javobi tushunarsiz" degan
      // xabarni ko'rardi — aslida shunchaki byudjet yetmagan. Endi
      // keyingi urinishda byudjet ikki barobar bo'ladi.
      if (cand?.finishReason === 'MAX_TOKENS') {
        oxirgi = Object.assign(
          new Error(`Javob uzilib qoldi (MAX_TOKENS, byudjet ${maxTokens})`), { turkum: 'uzilgan' });
        continue;
      }
      oxirgi = Object.assign(new Error(`JSON emas: ${text.slice(0, 200)}`), { turkum: 'json' });
      continue;
    }
  }
  throw oxirgi || Object.assign(new Error('Google javob bermadi'), { turkum: 'nomalum' });
}

/** Rasm chizish (gemini-*-image). */
export async function googleRasm(parts, { nisbat, model, timeoutMs = 90000 } = {}) {
  await modellarniTaminla();
  const m = model || rasmModeli();
  const k = geminiHovuz.ol();
  const yubor = (imageConfigBilan) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(`${config.geminiApi}/${m}:generateContent?key=${k?.kalit || ''}`, {
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
  if (res.status === 429 || res.status >= 500) {
    // Kvota tugagan kalitni chetga qo'yib, boshqasi bilan urinamiz
    if (k) geminiHovuz.yomon(k.indeks, res.status === 429 ? 'kvota' : 'xato');
    const k2 = geminiHovuz.ol();
    if (k2 && k2.indeks !== k?.indeks) { k.kalit = k2.kalit; k.indeks = k2.indeks; }
    await kut(k2 && k2.indeks !== k?.indeks ? 50 : 1200);
    res = await yubor(true);
  }
  if (res.status === 400 && nisbat) {
    const matn = await res.clone().text().catch(() => '');
    // 400 imageConfig sababli bo'lsagina nisbatsiz urinamiz
    if (/imageConfig|aspectRatio|aspect_ratio/i.test(matn)) res = await yubor(false);
  }
  if (!res.ok) {
    if (k) geminiHovuz.yomon(k.indeks, sabab(new Error(`HTTP ${res.status}`)));
    xatoTashla(res.status, await res.text().catch(() => ''));
  }
  if (k) geminiHovuz.yaxshi(k.indeks);

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
