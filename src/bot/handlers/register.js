// Ro'yxatdan o'tish: telefon -> ism -> yosh -> manzil -> shartnoma roziligi.
import { db, q, logEvent } from '../../db.js';
import { config } from '../../config.js';
import { yubor } from '../tg.js';
import { esc, royxat } from '../format.js';
import { asosiyMenyu, telefonSora, shartnomaTugmalari } from '../keyboards.js';

export const HOLAT = {
  TELEFON: 'reg_telefon',
  ISM:     'reg_ism',
  YOSH:    'reg_yosh',
  MANZIL:  'reg_manzil',
  SHARTNOMA: 'reg_shartnoma',
};

export const royxatdanOtganmi = (u) => Boolean(u?.phone && u?.full_name && u?.agreed_at);

async function holat(userId, state, data) {
  await q(db.from('users').update({
    state,
    ...(data !== undefined ? { state_data: data } : {}),
  }).eq('id', userId), 'holatni saqlash');
}

export async function boshla(chatId, user) {
  await yubor(chatId,
    [
      `👋 <b>QoraQosh</b> — Koreya kosmetikasi.`,
      ``,
      `Men yuzingizni AI bilan tahlil qilib, aynan sizga mos parvarishni tuzib beraman.`,
      ``,
      `Avval qisqa ro‘yxatdan o‘tamiz — buyurtmani yetkazish uchun kerak.`,
      `Bu 4 ta savol, 1 daqiqa.`,
      ``,
      `<b>1/4.</b> Telefon raqamingizni ulashing 👇`,
    ].join('\n'),
    { reply_markup: telefonSora() });
  await holat(user.id, HOLAT.TELEFON, {});
  await logEvent(user.id, 'start');
}

/** Ro'yxatdan o'tish bosqichlarini boshqaradi. @returns {boolean} qayta ishlandimi */
export async function qadam(msg, user) {
  const chatId = msg.chat.id;
  const matn = (msg.text || '').trim();

  switch (user.state) {
    case HOLAT.TELEFON: {
      let tel = msg.contact?.phone_number || '';
      // Boshqa odamning kontaktini yuborishga yo'l qo'ymaymiz
      if (msg.contact && String(msg.contact.user_id) !== String(msg.from.id)) {
        await yubor(chatId, "⚠️ Iltimos, <b>o‘zingizning</b> raqamingizni ulashing.", { reply_markup: telefonSora() });
        return true;
      }
      if (!tel && /^\+?998\d{9}$/.test(matn.replace(/[\s()-]/g, ''))) {
        tel = matn.replace(/[\s()-]/g, '');
      }
      if (!tel) {
        await yubor(chatId,
          "📱 Pastdagi <b>«Telefon raqamimni ulashish»</b> tugmasini bosing yoki raqamni <code>+998901234567</code> ko‘rinishida yozing.",
          { reply_markup: telefonSora() });
        return true;
      }
      if (!tel.startsWith('+')) tel = '+' + tel;
      await q(db.from('users').update({ phone: tel, state: HOLAT.ISM }).eq('id', user.id), 'telefon');
      await yubor(chatId, `✅ Raqam saqlandi: <code>${esc(tel)}</code>\n\n<b>2/4.</b> Ism-familiyangizni yozing.`,
        { reply_markup: { remove_keyboard: true } });
      return true;
    }

    case HOLAT.ISM: {
      if (matn.length < 3 || matn.length > 70) {
        await yubor(chatId, "Ism-familiyangizni to‘liqroq yozing (masalan: <i>Aliyeva Malika</i>).");
        return true;
      }
      await q(db.from('users').update({ full_name: matn, state: HOLAT.YOSH }).eq('id', user.id), 'ism');
      await yubor(chatId, `✅ Xush kelibsiz, <b>${esc(matn.split(' ')[0])}</b>!\n\n<b>3/4.</b> Yoshingizni raqam bilan yozing (masalan: <code>24</code>).`);
      return true;
    }

    case HOLAT.YOSH: {
      const yosh = Number(matn.replace(/\D/g, ''));
      if (!yosh || yosh < 12 || yosh > 90) {
        await yubor(chatId, "Yoshni 12 dan 90 gacha raqam bilan yozing.");
        return true;
      }
      await q(db.from('users').update({ age: yosh, state: HOLAT.MANZIL }).eq('id', user.id), 'yosh');
      await yubor(chatId,
        `<b>4/4.</b> Yetkazib berish manzilingizni yozing.\n\n<i>Masalan: Toshkent sh., Chilonzor tumani, 5-mavze, 12-uy, 34-xonadon</i>`);
      return true;
    }

    case HOLAT.MANZIL: {
      if (matn.length < 10) {
        await yubor(chatId, "Manzilni to‘liqroq yozing — kuryer topa olishi kerak (shahar, tuman, ko‘cha, uy).");
        return true;
      }
      await q(db.from('users').update({ address: matn, state: HOLAT.SHARTNOMA }).eq('id', user.id), 'manzil');

      const yangilangan = await q(db.from('users').select('*').eq('id', user.id).single(), 'user');
      await yubor(chatId,
        [
          `📋 <b>Ma’lumotlaringiz</b>`,
          royxat([
            ['Ism',     yangilangan.full_name || '—'],
            ['Telefon', yangilangan.phone || '—'],
            ['Yosh',    String(yangilangan.age || '—')],
            ['Manzil',  yangilangan.address || '—'],
          ]),
          ``,
          `Oxirgi qadam — <b>ommaviy oferta</b> (foydalanish shartlari va shaxsiy`,
          `ma’lumotlarni qayta ishlash roziligi) bilan tanishing.`,
          ``,
          `<i>Yuz suratingiz faqat tahlil uchun ishlatiladi va saqlanmaydi —`,
          `bazada faqat tahlil natijasi qoladi.</i>`,
        ].join('\n'),
        { reply_markup: shartnomaTugmalari() });
      return true;
    }

    default:
      return false;
  }
}

/** «Barchasiga roziman» tugmasi. */
export async function roziBol(chatId, user) {
  await q(db.from('users').update({
    agreed_at: new Date().toISOString(),
    agreement_version: config.agreementVersion,
    state: null,
  }).eq('id', user.id), 'rozilik');
  await logEvent(user.id, 'register');

  await yubor(chatId,
    [
      `✅ <b>Ro‘yxatdan o‘tdingiz!</b>`,
      ``,
      `Endi eng qizig‘i: <b>🔬 Yuz skaneri</b> tugmasini bosing va yuzingiz`,
      `aniq ko‘ringan surat yuboring.`,
      ``,
      `Men aniqlab beraman:`,
      `• taxminiy yosh, teri rangi va turi`,
      `• qaysi muammolar bor va qanchalik kuchli`,
      `• e’tibor berilmasa nima bo‘lishi mumkin`,
      `• qaysi mahsulot, qaysi tartibda va <b>nima uchun</b> kerak`,
    ].join('\n'),
    { reply_markup: asosiyMenyu() });
}
