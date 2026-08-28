// Telegram Bot API ustidan yupqa qatlam.
import { config } from '../config.js';

const API = `https://api.telegram.org/bot${config.botToken}`;

export async function tg(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
    // "message is not modified" kabi zararsiz xatolarni jim o'tkazamiz
    if (!/not modified|message to (edit|delete) not found|query is too old/i.test(data.description || '')) {
      console.error(`TG ${method}:`, data.description);
    }
  }
  return data;
}

export const yubor = (chat_id, text, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });

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

  const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${f.result.file_path}`);
  if (!res.ok) throw new Error('FAYL_YUKLANMADI');
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), path: f.result.file_path };
}
