// MAKIYAJ — botda «💄 Menga mos makiyaj» (hammaga; erkaklarga o'z tartibi).
//
// Tugma bosiladi → bot ko'rsatma beradi va 15 daqiqa «makiyaj rasmi»ni
// kutadi. Shu orada kelgan rasm teri skaneriga emas, rang tahliliga ketadi.
import { yubor, faylOl, harakat, tg, rasmYubor } from '../tg.js';
import { sorov } from '../../db.js';
import { appTugma } from '../keyboards.js';
import { radXabari } from '../render.js';
import { esc } from '../format.js';
import { makiyajRuxsat, rangimniTahlilQil, rangimMatni, rangimKartochkasi } from '../../services/makiyaj.js';
import { xatoniTushuntir } from '../../lib/xatolar.js';

export const HOLAT = 'makiyaj_rasm';
const KUTISH_MS = 15 * 60_000;

export async function makiyajBoshla(chatId, user) {
  if (!(await makiyajRuxsat(user))) return false;
  await sorov(`update users set state = $1, state_data = coalesce(state_data, '{}'::jsonb) || $2::jsonb where id = $3`,
    [HOLAT, JSON.stringify({ makiyaj_vaqt: Date.now() }), user.id]);
  await yubor(chatId, [
    `💄 <b>Sizga mos makiyajni tanlaymiz</b>`, ``,
    `Bitta selfi yuboring:`,
    `☀️ Deraza yonida, <b>kunduzgi yorug‘likda</b>`,
    `🧼 <b>Pardozsiz</b> (yoki faqat yengil qosh/kiprik)`,
    `🤳 Yuz to‘g‘ridan, soch yuzni yopmasin`, ``,
    `<i>Teri osti tusingiz, rang tipingiz va mos kushon toningizni aniqlab, makiyaj tartibini tuzib beraman.</i>`,
  ].join('\n'));
  return true;
}

/** Makiyaj rasmi kutilayotgan bo'lsa — shu yerda qayta ishlanadi. */
export async function makiyajRasmi(msg, user) {
  if (user.state !== HOLAT) return false;
  const foto = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;
  const hujjat = msg.document && String(msg.document.mime_type || '').startsWith('image/') ? msg.document : null;
  const vaqt = Number(user.state_data?.makiyaj_vaqt) || 0;
  // Muddat o'tgan yoki rasm emas — holatni tozalab, oddiy oqimga qaytaramiz
  if (!foto && !hujjat) return false;
  await sorov('update users set state = null where id = $1', [user.id]);
  if (Date.now() - vaqt > KUTISH_MS) return false;

  const chatId = msg.chat.id;
  await harakat(chatId, 'typing');
  const kutish = await yubor(chatId, '🎨 <b>Rangingiz aniqlanmoqda…</b>\n<i>10–15 soniya</i>');
  try {
    const { base64 } = await faylOl(foto ? foto.file_id : hujjat.file_id);
    const mime = hujjat ? hujjat.mime_type : 'image/jpeg';
    const r = await rangimniTahlilQil(user, base64, mime);
    if (!r.yaroqli) {
      await yubor(chatId, await radXabari(r.sabab, r.izoh), {
        reply_markup: { inline_keyboard: [[{ text: '🔄 Qayta yuborish', callback_data: 'makiyaj' }]] } });
      return true;
    }
    const nomlar = new Map(r.mahsulotlar.map((p) => [p.id, esc(`${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}${p.variant_nom ? ' — ' + p.variant_nom : ''}`)]));
    const ochish = appTugma('💄 To‘liq natija va makiyaj tartibi', '/app/?tab=rangim');
    const tugmalar = { reply_markup: { inline_keyboard: [
      ...(ochish ? [[ochish]] : []),
      [{ text: '🔄 Qayta aniqlash', callback_data: 'makiyaj' }],
    ] } };
    // Natija — RASM: surat, rang tipi, ton, palitra va mahsulotlar bitta
    // kartochkada (teri tahlilidagi kabi). Chizib bo'lmasa — matn.
    const bayt = await rangimKartochkasi({ rangim: r.rangim, mahsulotlar: r.mahsulotlar, rasmBase64: base64, mime });
    const matn = rangimMatni(r.rangim, nomlar);
    if (bayt) {
      const izoh = matn.length <= 1000 ? matn : rangimMatni(r.rangim, nomlar, { qisqa: true });
      const j = await rasmYubor(chatId, bayt, izoh, { parse_mode: 'HTML', ...tugmalar }).catch(() => null);
      if (j?.ok !== false) return true;
    }
    await yubor(chatId, matn, tugmalar);
    return true;
  } catch (e) {
    if (e.message === 'MAKIYAJ_LIMIT') {
      await yubor(chatId, '⏳ Bugungi rang tahlili limiti tugadi — ertaga yana urinib ko‘ring.');
      return true;
    }
    console.error('MAKIYAJ (bot):', xatoniTushuntir(e).log);
    await yubor(chatId, '⚠️ Hozir rangni aniqlab bo‘lmadi — birozdan keyin qayta urinib ko‘ring.',
      { reply_markup: { inline_keyboard: [[{ text: '🔄 Qayta urinish', callback_data: 'makiyaj' }]] } });
    return true;
  } finally {
    if (kutish?.result?.message_id) tg('deleteMessage', { chat_id: chatId, message_id: kutish.result.message_id }).catch(() => {});
  }
}
