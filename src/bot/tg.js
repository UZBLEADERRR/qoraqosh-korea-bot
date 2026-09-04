// Telegram Bot API ustidan yupqa qatlam.
import { config } from '../config.js';
import { floodmi, floodBelgila, floodKutilmoqda } from '../lib/flood.js';

const API = `${config.telegramApi}/bot${config.botToken}`;

// Tarmoq uzilishi Railway'da kam emas: bitta `fetch failed` butun
// buyruqni yo'q qilardi — admin /orders yozsa hech narsa kelmasdi.
// Shuning uchun so'rov qayta uriniladi va tg() HECH QACHON istisno
// tashlamaydi: chaqiruvchi { ok:false } ni ko'radi va o'zi qaror qiladi.
const URINISH   = 3;
const VAQT_MS   = 25_000;
const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/** Qayta urinsa foydasi bormi: tarmoq uzildi yoki server o'zida xato. */
const qaytaUrinsa = (holat) => !holat || holat >= 500 || holat === 429;

/**
 * fetch ni qayta urinish bilan o'raydi.
 * @returns {Promise<{res?: Response, xato?: Error}>}
 */
async function soro(url, sozlama, usul) {
  let oxirgi = null;
  for (let i = 0; i < URINISH; i++) {
    try {
      const res = await fetch(url, { ...sozlama, signal: AbortSignal.timeout(VAQT_MS) });
      if (res.ok || !qaytaUrinsa(res.status) || i === URINISH - 1) return { res };
      oxirgi = new Error(`HTTP ${res.status}`);
    } catch (e) {
      oxirgi = e;
      if (i === URINISH - 1) break;
    }
    // 0.4s → 1.2s → ... : Telegram ham, tarmoq ham o'ziga kelsin
    await kut(400 * 3 ** i);
  }
  console.error(`TG ${usul}: tarmoq xatosi (${URINISH} urinish) — ${oxirgi?.message}`);
  return { xato: oxirgi || new Error('tarmoq') };
}

/**
 * @param {string} method
 * @param {object} body
 * @param {{ommaviy?: boolean}} [opts]  ommaviy — bu mijozning savoliga
 *   javob emas, o'zimiz boshlagan yuborish (reklama, bosqich xabari,
 *   kanal posti). Telegram cheklovi paytida bunday yuborish
 *   TO'XTATILADI: urinishning o'zi cheklovni uzaytiradi.
 */
export async function tg(method, body = {}, opts = {}) {
  if (opts.ommaviy && floodKutilmoqda()) {
    return { ok: false, description: 'PEER_FLOOD_KUTISH' };
  }
  const { res, xato } = await soro(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, method);
  if (xato) return { ok: false, description: `TARMOQ: ${xato.message}` };

  // Proksi yoki tarmoq xatosi HTML qaytarishi mumkin — JSON deb o'qimaymiz
  let data;
  try {
    data = await res.json();
  } catch {
    const xom = await res.text().catch(() => '');
    console.error(`TG ${method}: JSON emas (HTTP ${res.status}) ${xom.slice(0, 120)}`);
    return { ok: false, description: `HTTP ${res.status}` };
  }
  if (!data.ok) {
    // PEER_FLOOD — botga qo'yilgan spam cheklovi. Har urinishda jurnalni
    // to'ldirmaymiz: sovish oynasi uzayganidagina bir marta yoziladi.
    if (floodmi(data.description)) {
      floodBelgila({ usul: method, chat: body.chat_id });
      return data;
    }
    // "message is not modified" kabi zararsiz xatolarni jim o'tkazamiz
    if (!/not modified|message to (edit|delete) not found|query is too old/i.test(data.description || '')) {
      console.error(`TG ${method}${body.chat_id ? ` → ${body.chat_id}` : ''}:`, data.description);
    }
  }
  return data;
}

/**
 * Fayl yuklab yuborish (multipart). Telegram'ga baytlarni to'g'ridan-to'g'ri
 * beramiz — /media/... havolasi orqali emas: mahalliy ishlab chiqishda
 * PUBLIC_URL bo'lmaydi, Railway'da esa Telegram bizga qayta so'rov yuborishi
 * kerak bo'lardi.
 */
export async function tgFayl(method, maydonlar = {}, fayllar = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(maydonlar)) {
    if (v === undefined || v === null) continue;
    fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  for (const [k, f] of Object.entries(fayllar)) {
    fd.append(k, new Blob([f.bayt], { type: f.mime || 'image/png' }), f.nom || 'fayl.png');
  }
  const { res, xato } = await soro(`${API}/${method}`, { method: 'POST', body: fd }, method);
  if (xato) return { ok: false, description: `TARMOQ: ${xato.message}` };
  let data;
  try {
    data = await res.json();
  } catch {
    const xom = await res.text().catch(() => '');
    console.error(`TG ${method}: JSON emas (HTTP ${res.status}) ${xom.slice(0, 120)}`);
    return { ok: false, description: `HTTP ${res.status}` };
  }
  if (!data.ok) console.error(`TG ${method}:`, data.description);
  return data;
}

/** Rasm + izoh. Izoh 1024 belgidan uzun bo'lolmaydi. */
export const rasmYubor = (chat_id, bayt, caption = '', extra = {}, fayl = {}) =>
  tgFayl('sendPhoto', {
    chat_id,
    caption: caption.slice(0, 1024),
    parse_mode: 'HTML',
    ...extra,
  }, { photo: { bayt, mime: fayl.mime || 'image/png', nom: fayl.nom || 'natija.png' } });

/** Telegram'dagi mavjud rasmni (file_id) qayta yuborish — qayta yuklamaymiz. */
export const rasmniUzat = (chat_id, file_id, caption = '', extra = {}) =>
  tg('sendPhoto', { chat_id, photo: file_id, caption: caption.slice(0, 1024),
    parse_mode: 'HTML', ...extra });

// Telegram bitta xabarga 4096 belgidan ko'p bermaydi. Undan uzun matn
// JIM RAD ETILADI — xarid ro'yxati uzayganda admin hech narsa ko'rmasdi.
// Shuning uchun uzun matn qatorlar chegarasidan bo'linadi, tugmalar esa
// OXIRGI bo'lakka qo'yiladi: ular ro'yxatning tagida turishi kerak.
const MAKS_BELGI = 4000;

function bolaklarga(matn) {
  if (matn.length <= MAKS_BELGI) return [matn];
  const bolaklar = [];
  let joriy = '';
  for (const qator of String(matn).split('\n')) {
    // Bitta qatorning o'zi sig'masa — uni ham kesamiz
    if (qator.length > MAKS_BELGI) {
      if (joriy) { bolaklar.push(joriy); joriy = ''; }
      for (let i = 0; i < qator.length; i += MAKS_BELGI) {
        bolaklar.push(qator.slice(i, i + MAKS_BELGI));
      }
      continue;
    }
    if (joriy.length + qator.length + 1 > MAKS_BELGI) { bolaklar.push(joriy); joriy = ''; }
    joriy = joriy ? `${joriy}\n${qator}` : qator;
  }
  if (joriy) bolaklar.push(joriy);
  return bolaklar;
}

export const yubor = async (chat_id, text, extra = {}) => {
  const { ommaviy, ...qolgan } = extra;
  const bolaklar = bolaklarga(String(text ?? ''));
  let javob = null;
  for (let i = 0; i < bolaklar.length; i++) {
    const oxirgimi = i === bolaklar.length - 1;
    javob = await tg('sendMessage', {
      chat_id, text: bolaklar[i], parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...qolgan,
      // Tugmalar faqat oxirida
      ...(oxirgimi ? {} : { reply_markup: undefined }),
    }, { ommaviy });
    // HTML buzilgan bo'lsa (bo'linishda teg ikkiga bo'linib qolgan yoki
    // matn ichidagi «<» belgisi) Telegram xabarni butunlay rad etadi.
    // Bo'sh chat yomonroq: teglarni olib tashlab, oddiy matn yuboramiz.
    if (!javob?.ok && /can't parse entities|unsupported start tag/i.test(javob?.description || '')) {
      javob = await tg('sendMessage', {
        chat_id, text: tegsiz(bolaklar[i]),
        link_preview_options: { is_disabled: true },
        ...qolgan, parse_mode: undefined,
        ...(oxirgimi ? {} : { reply_markup: undefined }),
      }, { ommaviy });
    }
    if (!javob?.ok) return javob;
  }
  return javob;
};

/** HTML teglarini olib tashlaydi va belgilar kodini ochadi. */
const tegsiz = (s) => String(s).replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, '\'').replace(/&amp;/g, '&');

export const tahrirla = (chat_id, message_id, text, extra = {}) =>
  tg('editMessageText', { chat_id, message_id, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });

export const javobBer = (callback_query_id, text = '', alert = false) =>
  tg('answerCallbackQuery', { callback_query_id, text, show_alert: alert });

export const harakat = (chat_id, action = 'typing') => tg('sendChatAction', { chat_id, action });

/** Telegram serveridan faylni yuklab, base64 qaytaradi. */
export async function faylOl(fileId, maxBayt = 12 * 1024 * 1024) {
  const f = await tg('getFile', { file_id: fileId });
  if (!f.ok || !f.result?.file_path) throw new Error('FAYL_OLINMADI');
  if (f.result.file_size && f.result.file_size > maxBayt) throw new Error('FAYL_KATTA');

  const { res, xato } = await soro(
    `${config.telegramApi}/file/bot${config.botToken}/${f.result.file_path}`, {}, 'getFileBody');
  if (xato || !res.ok) throw new Error('FAYL_YUKLANMADI');
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), path: f.result.file_path };
}
