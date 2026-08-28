// Botning markaziy dispetcheri. Barcha tugmalar inline.
import { qator, sorov, hodisa } from '../db.js';
import { yubor, javobBer, tg } from './tg.js';
import { asosiyMenyu, ortga } from './keyboards.js';
import * as reg from './handlers/register.js';
import * as skaner from './handlers/scanner.js';
import * as dokon from './handlers/shop.js';
import { esc } from './format.js';

async function foydalanuvchi(from) {
  const telegramId = String(from.id);
  const bor = await qator('select * from users where telegram_id = $1', [telegramId]);
  if (bor) {
    sorov('update users set last_active = now(), username = $1 where id = $2',
          [from.username || null, bor.id]).catch(() => {});
    return bor;
  }
  return await qator(
    `insert into users (telegram_id, username, source) values ($1,$2,'telegram') returning *`,
    [telegramId, from.username || null]);
}

export async function yangilanish(upd) {
  if (upd.callback_query) return callback(upd.callback_query);
  const msg = upd.message;
  if (!msg?.chat || msg.chat.type !== 'private') return;

  const user = await foydalanuvchi(msg.from);
  if (user.is_blocked) return;

  const chatId = msg.chat.id;
  const matn = (msg.text || '').trim();

  // ---- Buyruqlar ----
  if (matn === '/start') {
    if (reg.royxatdanOtganmi(user)) return dokon.menyuniKorsat(chatId, user);
    return reg.boshla(chatId, user);
  }
  if (matn === '/qayta') {
    await sorov('update users set state = $1 where id = $2', [reg.HOLAT.TELEFON, user.id]);
    return reg.boshla(chatId, { ...user, state: reg.HOLAT.TELEFON });
  }
  if (matn === '/ochir') return malumotniOchir(chatId, user);
  if (matn === '/help')  return dokon.yordamKorsat(chatId);
  if (matn === '/menyu') return dokon.menyuniKorsat(chatId, user);

  // ---- Ro'yxatdan o'tish tugallanmagan ----
  if (!reg.royxatdanOtganmi(user)) {
    if (user.state && await reg.qadam(msg, user)) return;
    if (user.state === reg.HOLAT.SHARTNOMA) {
      return yubor(chatId, '👆 Davom etish uchun rozilik tugmasini bosing.');
    }
    return reg.boshla(chatId, user);
  }

  if (matn === '/skaner') return skaner.skanerYordami(chatId);

  // ---- Rasm ----
  if (await skaner.rasmniQabulQil(msg, user)) return;

  await yubor(chatId, '📸 Yuz tahlili uchun rasm yuboring yoki menyudan tanlang.',
    { reply_markup: asosiyMenyu() });
}

// ---------- Inline tugmalar ----------
const AMALLAR = {
  menyu:         (chatId, user) => dokon.menyuniKorsat(chatId, user),
  skaner:        (chatId)       => skaner.skanerYordami(chatId),
  buyurtmalar:   (chatId, user) => dokon.buyurtmalarniKorsat(chatId, user),
  profil:        (chatId, user) => dokon.profilniKorsat(chatId, user),
  konsultatsiya: (chatId)       => dokon.konsultatsiya(chatId),
  yordam:        (chatId)       => dokon.yordamKorsat(chatId),
};

async function callback(cq) {
  const chatId = cq.message?.chat?.id;
  const user = await foydalanuvchi(cq.from);
  const data = cq.data || '';

  if (data === 'roziman') {
    await javobBer(cq.id, '✅ Qabul qilindi');
    // Tugmalar ikkinchi marta bosilmasin
    if (cq.message) await tg('editMessageReplyMarkup', {
      chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] },
    });
    if (!user.agreed_at) await reg.roziBol(chatId, user);
    return;
  }

  const amal = AMALLAR[data];
  if (amal) {
    await javobBer(cq.id);
    if (!reg.royxatdanOtganmi(user) && data !== 'menyu') {
      return reg.boshla(chatId, user);
    }
    return amal(chatId, user);
  }
  await javobBer(cq.id);
}

async function malumotniOchir(chatId, user) {
  await sorov(
    `update users set full_name=null, phone=null, address=null, age=null,
            agreed_at=null, state=null, state_data='{}'::jsonb, checkout_draft='{}'::jsonb
      where id=$1`, [user.id]);
  await sorov('delete from analyses where user_id = $1', [user.id]);
  await sorov('delete from cart_items where user_id = $1', [user.id]);
  await hodisa(user.id, 'delete_data');

  await yubor(chatId, [
    `🗑 <b>Ma’lumotlaringiz o‘chirildi</b>`,
    ``,
    `Tahlillar va savat tozalandi.`,
    `<i>Buyurtmalar hisobi qonun talabi bilan saqlanadi, lekin shaxsiy ma’lumotlarsiz.</i>`,
    ``,
    `Qaytadan boshlash: /start`,
  ].join('\n'), { reply_markup: { remove_keyboard: true } });
}
