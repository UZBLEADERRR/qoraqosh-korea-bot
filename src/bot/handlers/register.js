// Ro'yxatdan o'tish: telefon → ism → yosh → rozilik.
// Manzil bu yerda SO'RALMAYDI — u buyurtma rasmiylashtirishda so'raladi,
// chunki kirish paytida uzun forma odamni qaytarib yuboradi.
import { qator, sorov, hodisa } from '../../db.js';
import { config } from '../../config.js';
import { yubor } from '../tg.js';
import { esc } from '../format.js';
import { asosiyMenyu, telefonSora, shartnomaTugmalari } from '../keyboards.js';
import { brendNomi } from '../../lib/brend.js';
import { adminmi } from '../../lib/admin.js';
import { xabar } from '../shablon.js';

export const HOLAT = {
  TELEFON:   'reg_telefon',
  ISM:       'reg_ism',
  YOSH:      'reg_yosh',
  SHARTNOMA: 'reg_shartnoma',
};

export const royxatdanOtganmi = (u) => Boolean(u?.phone && u?.full_name && u?.agreed_at);

const holat = (userId, state) => sorov('update users set state = $1 where id = $2', [state, userId]);

export async function boshla(chatId, user) {
  const dokon = await brendNomi();
  await yubor(chatId, await xabar('xabar_start', { dokon: esc(dokon) },
    '✨ <b>{dokon}</b>\n\n<b>1/3</b> · Telefon raqamingiz 👇'),
    { reply_markup: telefonSora() });
  await holat(user.id, HOLAT.TELEFON);
  await hodisa(user.id, 'start');
}

/** @returns {boolean} qayta ishlandimi */
export async function qadam(msg, user) {
  const chatId = msg.chat.id;
  const matn = (msg.text || '').trim();

  switch (user.state) {
    case HOLAT.TELEFON: {
      let tel = msg.contact?.phone_number || '';
      if (msg.contact && String(msg.contact.user_id) !== String(msg.from.id)) {
        await yubor(chatId, '⚠️ <b>O‘zingizning</b> raqamingizni ulashing.', { reply_markup: telefonSora() });
        return true;
      }
      if (!tel && /^\+?998\d{9}$/.test(matn.replace(/[\s()-]/g, ''))) tel = matn.replace(/[\s()-]/g, '');
      if (!tel) {
        await yubor(chatId,
          '📱 Pastdagi tugmani bosing yoki raqamni <code>+998901234567</code> ko‘rinishida yozing.',
          { reply_markup: telefonSora() });
        return true;
      }
      if (!tel.startsWith('+')) tel = '+' + tel;
      await sorov('update users set phone=$1, state=$2 where id=$3', [tel, HOLAT.ISM, user.id]);
      await yubor(chatId, `✅ <b>2/3</b> · Ismingizni yozing.`,
        { reply_markup: { remove_keyboard: true } });
      return true;
    }

    case HOLAT.ISM: {
      if (matn.length < 3 || matn.length > 70) {
        await yubor(chatId, '✍️ Ismingizni to‘liqroq yozing.');
        return true;
      }
      await sorov('update users set full_name=$1, state=$2 where id=$3', [matn, HOLAT.YOSH, user.id]);
      await yubor(chatId,
        `✅ <b>3/3</b> · Yoshingiz nechida? (masalan <code>24</code>)`);
      return true;
    }

    case HOLAT.YOSH: {
      const yosh = Number(matn.replace(/\D/g, ''));
      if (!yosh || yosh < 12 || yosh > 90) {
        await yubor(chatId, '🔢 Yoshni 12 dan 90 gacha raqam bilan yozing.');
        return true;
      }
      await sorov('update users set age=$1, state=$2 where id=$3', [yosh, HOLAT.SHARTNOMA, user.id]);
      // Qisqa: uzun huquqiy matn tugmagacha yetib borishga xalaqit beradi.
      // To'liq shartlar «Shartnomani o'qish» tugmasi ostida.
      await yubor(chatId,
        '🔒 Suratingiz <b>saqlanmaydi</b> — faqat tahlil paytida ishlatiladi.',
        { reply_markup: shartnomaTugmalari() });
      return true;
    }

    default:
      return false;
  }
}

export async function roziBol(chatId, user) {
  await sorov(
    'update users set agreed_at = now(), agreement_version = $1, state = null where id = $2',
    [config.agreementVersion, user.id]);
  await hodisa(user.id, 'register');

  await yubor(chatId, await xabar('xabar_royxat_tugadi',
    { ism: esc((user.full_name || '').split(' ')[0] || '') },
    '🎉 <b>Tayyor!</b>\n\n<b>🔬 Yuz skaneri</b> ni bosing.'),
    { reply_markup: asosiyMenyu(adminmi(user)) });
}
