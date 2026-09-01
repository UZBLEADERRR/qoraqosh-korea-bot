// Rasm keldi → sifat nazorati → tahlil → BITTA qisqa xabar + Mini App tugmasi.
import { harakat, yubor, faylOl, tg, rasmYubor } from '../tg.js';
import { natijaRasminiYarat, kanalgaTahlil, yuzniSaqla } from '../../services/natija-rasm.js';
import { tahlilQil } from '../../services/analysis.js';
import { radXabari, tahlilXabari, tavsiyaMatni, qisqaIzoh } from '../render.js';
import { natijaTugmalari, appUrl, ortga } from '../keyboards.js';
import { bolakla, esc } from '../format.js';
import { xabar } from '../shablon.js';
import { xatoniTushuntir } from '../../lib/xatolar.js';
import { limitHolati } from '../../services/analysis.js';
import { appTugma } from '../keyboards.js';

/** Rasm ostidagi qisqa izoh (Telegram cheklovi — 1024 belgi). */
export async function skanerYordami(chatId) {
  await yubor(chatId, await xabar('xabar_skaner', {},
    '🔬 <b>Yuz skaneri</b>\n\nYuzingiz aniq ko‘ringan surat yuboring 📸'),
    { reply_markup: ortga() });
}

/** Kunlik limit tugaganda — sotuvga yo'naltiruvchi xabar. */
async function limitXabari(chatId, limit) {
  const kb = [];
  const dokon = appTugma('🛍 Do‘konni ochish');
  if (dokon) kb.push([dokon]);
  kb.push([{ text: '💬 Konsultatsiya', callback_data: 'konsultatsiya' },
           { text: '⬅️ Menyu', callback_data: 'menyu' }]);

  await yubor(chatId, [
    `⏳ <b>Bugungi limit tugadi</b>`,
    ``,
    `Bugun ${limit.ishlatilgan} ta tahlil qildingiz (kuniga ${limit.limit} ta).`,
    ``,
    limit.mijoz
      ? `Ertaga yana ${limit.limit} ta tahlil ochiladi.`
      : `🎁 <b>Bizdan xarid qilsangiz</b> kunlik limit oshadi va tahlilni ko‘proq qilasiz.`,
    ``,
    `<i>Oxirgi tahlilingiz saqlangan — ilovadan qayta ko‘rishingiz mumkin.</i>`,
  ].join('\n'), { reply_markup: { inline_keyboard: kb } });
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
      await yubor(chatId, await radXabari(natija.sabab, natija.izoh), { reply_markup: ortga() });
      return true;
    }

    const tavsiyalar = natija.tahlil.tavsiya || [];

    // 1) Natija RASMI — foydalanuvchi suratining ustida tahlil.
    //    Rasm chizilmasa (motor yoki shrift yo'q) — matn baribir ketadi.
    const rasm = await natijaRasminiYarat({
      analysisId: natija.analysisId, userId: user.id,
      rasmBase64: base64, mime, tahlil: natija.tahlil, mahsulotlar: natija.mahsulotlar,
    });
    // Surat ilovadagi tahlil bo'limida belgilar bilan ko'rsatiladi
    await yuzniSaqla({ analysisId: natija.analysisId, rasmBase64: base64, mime });
    if (rasm) {
      // BITTA xabar: rasm + qisqa izoh + tugmalar.
      // Ilgari rasm va uzun matn alohida ketardi, matn esa rasmda
      // ko'ringanni takrorlardi — chat to'lib ketardi va tugma pastda
      // qolib, hech kim bosmasdi.
      await rasmYubor(chatId, rasm.bayt,
        await qisqaIzoh(natija.tahlil, tavsiyalar.length),
        { reply_markup: natijaTugmalari() });
      kanalgaTahlil(rasm.bayt, user, natija.tahlil).catch(() => {});
    } else {
      // Rasm chizilmadi (motor yoki shrift yo'q) — natija yo'qolmasin,
      // to'liq matnni yuboramiz
      const matn = await tahlilXabari(natija.tahlil, tavsiyalar.length);
      const qismlar = bolakla(matn);
      for (let i = 0; i < qismlar.length; i++) {
        await yubor(chatId, qismlar[i],
          i === qismlar.length - 1 ? { reply_markup: natijaTugmalari() } : {});
      }
    }

    // Mini App yo'q bo'lsa (PUBLIC_URL sozlanmagan) — tavsiyani matnda beramiz
    if (!appUrl() && tavsiyalar.length) {
      for (const b of bolakla(tavsiyaMatni(tavsiyalar, natija.mahsulotlar))) await yubor(chatId, b);
    }
    return true;
  } catch (e) {
    if (e.message === 'LIMIT_TUGADI') {
      await limitXabari(chatId, e.limit);
      return true;
    }
    const x = xatoniTushuntir(e);
    console.error('SKANER XATOSI', x.log);
    if (e?.stack) console.error(e.stack.split('\n').slice(0, 4).join('\n'));
    await yubor(chatId, x.matn, { reply_markup: ortga() });
    return true;
  } finally {
    if (kutish?.result?.message_id) {
      await tg('deleteMessage', { chat_id: chatId, message_id: kutish.result.message_id });
    }
  }
}
