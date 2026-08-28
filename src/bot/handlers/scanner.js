// Rasm keldi -> sifat nazorati -> tahlil -> ikkita chiroyli xabar.
import { harakat, yubor, faylOl } from '../tg.js';
import { tahlilQil } from '../../services/analysis.js';
import { radXabari, tahlilXabari, tavsiyaXabari, tavsiyaTugmalari } from '../render.js';
import { bolakla } from '../format.js';
import { config } from '../../config.js';

export async function skanerYordami(chatId) {
  await yubor(chatId, [
    `🔬 <b>YUZ SKANERI</b>`,
    ``,
    `Yuzingiz aniq ko‘ringan surat yuboring.`,
    ``,
    `<b>Talablar:</b>`,
    `✅ Yuz kadrning kamida yarmini egallasin`,
    `✅ Kunduzgi yorug‘lik yoki oyna oldi`,
    `✅ To‘g‘ridan-to‘g‘ri kameraga qarang`,
    `✅ Pardozsiz va filtrsiz`,
    `✅ Soch va ko‘zoynak yuzni yopmasin`,
    ``,
    `<b>Qabul qilinmaydi:</b>`,
    `❌ Uzoqdan olingan yoki xira surat`,
    `❌ Ekrandan olingan surat`,
    `❌ AI chizgan yoki deepfake rasm`,
    `❌ Bir nechta odam bo‘lgan kadr`,
    ``,
    `📸 Rasmni shu yerga yuboring.`,
  ].join('\n'));
}

export async function rasmniQabulQil(msg, user) {
  const chatId = msg.chat.id;
  const foto = Array.isArray(msg.photo) && msg.photo.length
    ? msg.photo[msg.photo.length - 1]
    : null;
  const hujjat = msg.document && String(msg.document.mime_type || '').startsWith('image/')
    ? msg.document : null;

  if (!foto && !hujjat) return false;

  const fileId = foto ? foto.file_id : hujjat.file_id;
  const mime = hujjat ? hujjat.mime_type : 'image/jpeg';

  await harakat(chatId, 'typing');
  const kutish = await yubor(chatId, '🤖 <b>Tahlil qilinmoqda…</b>\n<i>Bu 10-20 soniya oladi.</i>');

  try {
    const { base64 } = await faylOl(fileId);
    const natija = await tahlilQil(user, base64, mime);

    if (!natija.yaroqli) {
      await yubor(chatId, radXabari(natija.sabab, natija.izoh));
      return true;
    }

    for (const bolak of bolakla(tahlilXabari(natija.tahlil))) {
      await yubor(chatId, bolak);
    }
    await yubor(
      chatId,
      tavsiyaXabari(natija.tahlil.tavsiya, natija.mahsulotlar),
      { reply_markup: tavsiyaTugmalari(natija.tahlil.tavsiya, config.publicUrl) },
    );
    return true;
  } catch (e) {
    console.error('Skaner xatosi:', e.message);
    const matn = e.message === 'FAYL_KATTA'
      ? '⚠️ Rasm juda katta. Kichikroq surat yuboring.'
      : '⚠️ Tahlilda xatolik yuz berdi. Bir ozdan so‘ng qayta urinib ko‘ring.';
    await yubor(chatId, matn);
    return true;
  } finally {
    if (kutish?.result?.message_id) {
      await import('../tg.js').then(({ tg }) =>
        tg('deleteMessage', { chat_id: chatId, message_id: kutish.result.message_id }));
    }
  }
}
