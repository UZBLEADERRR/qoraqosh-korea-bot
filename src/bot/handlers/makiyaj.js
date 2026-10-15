// MAKIYAJ — botda «💄 Menga mos makiyaj» (hammaga; erkaklarga o'z tartibi).
//
// Tugma bosiladi → bot ko'rsatma beradi va 15 daqiqa «makiyaj rasmi»ni
// kutadi. Shu orada kelgan rasm teri skaneriga emas, rang tahliliga ketadi.
import { yubor, faylOl, harakat, tg, rasmYubor } from '../tg.js';
import { sorov } from '../../db.js';
import { appTugma } from '../keyboards.js';
import { radXabari } from '../render.js';
import { esc } from '../format.js';
import { makiyajRuxsat, rangimniTahlilQil, rangimMatni, rangimKartochkasi,
  oxirgiRangimKartochkasi, kanalgaMakiyaj } from '../../services/makiyaj.js';
import { xatoniTushuntir } from '../../lib/xatolar.js';

export const HOLAT = 'makiyaj_rasm';
const KUTISH_MS = 15 * 60_000;

/** Makiyaj natijasi — rasm (kartochka) + qisqa izoh + tugmalar. Rasm bo'lmasa matn. */
export async function rangimniYubor(chatId, { rangim, mahsulotlar = [], bayt = null }) {
  const nomlar = new Map(mahsulotlar.map((p) => [p.id, esc(`${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}${p.variant_nom ? ' — ' + p.variant_nom : ''}`)]));
  const ochish = appTugma('💄 To‘liq natija va makiyaj tartibi', '/app/?tab=rangim');
  const tugmalar = { reply_markup: { inline_keyboard: [
    ...(ochish ? [[ochish]] : []),
    [{ text: '🔄 Yangi selfi', callback_data: 'skaner' }],
  ] } };
  const matn = rangimMatni(rangim, nomlar);
  if (bayt) {
    const izoh = matn.length <= 1000 ? matn : rangimMatni(rangim, nomlar, { qisqa: true });
    const j = await rasmYubor(chatId, bayt, izoh, { parse_mode: 'HTML', ...tugmalar }).catch(() => null);
    if (j?.ok !== false) return true;
  }
  await yubor(chatId, matn, tugmalar);
  return true;
}

/**
 * «💄 Menga mos makiyaj» tugmasi. Makiyaj endi teri skani bilan BIRGA
 * aniqlanadi: natija bo'lsa — o'sha (joriy katalog bilan), bo'lmasa —
 * bitta selfi yuborishni so'raymiz (u ikkala natijani beradi).
 */
export async function makiyajBoshla(chatId, user) {
  if (!(await makiyajRuxsat(user))) return false;
  const oxirgi = await oxirgiRangimKartochkasi(user.id).catch(() => null);
  if (oxirgi) return rangimniYubor(chatId, oxirgi);
  await yubor(chatId, [
    `💄 <b>Sizga mos makiyajni tanlaymiz</b>`, ``,
    `Bitta selfi yuboring — <b>teri tahlili va mos makiyaj</b> birga keladi:`,
    `☀️ Deraza yonida, <b>kunduzgi yorug‘likda</b>`,
    `🧼 <b>Pardozsiz</b> (yoki faqat yengil qosh/kiprik)`,
    `🤳 Yuz to‘g‘ridan, soch yuzni yopmasin`,
  ].join('\n'));
  return true;
}

/** Eski oqim: makiyaj rasmi kutilayotgan bo'lsa (holat avvaldan qolgan) — shu yerda. */
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
    const bayt = await rangimKartochkasi({ rangim: r.rangim, mahsulotlar: r.mahsulotlar, rasmBase64: base64, mime });
    if (bayt) kanalgaMakiyaj(bayt, user, r.rangim, 'bot').catch(() => {});
    return rangimniYubor(chatId, { rangim: r.rangim, mahsulotlar: r.mahsulotlar, bayt });
  } catch (e) {
    if (e.message === 'LIMIT_TUGADI') {
      const { limitXabari } = await import('./scanner.js');
      await limitXabari(chatId, e.limit);
      return true;
    }
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
