// Rasm keldi → sifat nazorati → tahlil → BITTA qisqa xabar + Mini App tugmasi.
import { harakat, yubor, faylOl, tg } from '../tg.js';
import { tahlilQil } from '../../services/analysis.js';
import { radXabari, tahlilXabari, tavsiyaMatni } from '../render.js';
import { natijaTugmalari, appUrl, ortga } from '../keyboards.js';
import { bolakla } from '../format.js';

export async function skanerYordami(chatId) {
  await yubor(chatId, [
    `🔬 <b>Yuz skaneri</b>`,
    ``,
    `Yuzingiz aniq ko‘ringan surat yuboring 📸`,
    ``,
    `☀️ Yorug‘ joyda — deraza oldida`,
    `🤳 Yaqindan — yuz kadrni to‘ldirsin`,
    `👀 To‘g‘riga qarang`,
    `🧼 Pardozsiz va filtrsiz`,
    ``,
    `<i>Xira, uzoq, ekrandan olingan yoki AI chizgan rasm qabul qilinmaydi.</i>`,
  ].join('\n'), { reply_markup: ortga() });
}

export async function rasmniQabulQil(msg, user) {
  const chatId = msg.chat.id;
  const foto = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;
  const hujjat = msg.document && String(msg.document.mime_type || '').startsWith('image/') ? msg.document : null;
  if (!foto && !hujjat) return false;

  const fileId = foto ? foto.file_id : hujjat.file_id;
  const mime = hujjat ? hujjat.mime_type : 'image/jpeg';

  await harakat(chatId, 'typing');
  const kutish = await yubor(chatId, '🤖 <b>Tahlil qilinmoqda…</b>\n<i>10–20 soniya</i>');

  try {
    const { base64 } = await faylOl(fileId);
    const natija = await tahlilQil(user, base64, mime);

    if (!natija.yaroqli) {
      await yubor(chatId, radXabari(natija.sabab, natija.izoh), { reply_markup: ortga() });
      return true;
    }

    const tavsiyalar = natija.tahlil.tavsiya || [];
    await yubor(chatId, tahlilXabari(natija.tahlil, tavsiyalar.length),
      { reply_markup: natijaTugmalari() });

    // Mini App yo'q bo'lsa (PUBLIC_URL sozlanmagan) — tavsiyani matnda beramiz
    if (!appUrl() && tavsiyalar.length) {
      for (const b of bolakla(tavsiyaMatni(tavsiyalar, natija.mahsulotlar))) await yubor(chatId, b);
    }
    return true;
  } catch (e) {
    console.error('Skaner xatosi:', e.message);
    await yubor(chatId, e.message === 'FAYL_KATTA'
      ? '⚠️ Rasm juda katta. Kichikroq surat yuboring.'
      : '⚠️ Xatolik yuz berdi. Bir ozdan so‘ng qayta urinib ko‘ring.', { reply_markup: ortga() });
    return true;
  } finally {
    if (kutish?.result?.message_id) {
      await tg('deleteMessage', { chat_id: chatId, message_id: kutish.result.message_id });
    }
  }
}
