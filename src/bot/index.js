// Botning markaziy dispetcheri.
import { qator, sorov, hodisa } from '../db.js';
import { yubor, javobBer } from './tg.js';
import { asosiyMenyu, katalogTugmasi } from './keyboards.js';
import * as reg from './handlers/register.js';
import * as skaner from './handlers/scanner.js';
import * as dokon from './handlers/shop.js';
import { esc } from './format.js';

/** Foydalanuvchini topadi yoki yaratadi. */
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
    if (reg.royxatdanOtganmi(user)) {
      await yubor(chatId, `👋 Qaytganingizdan xursandmiz, <b>${esc((user.full_name || '').split(' ')[0])}</b>!`,
        { reply_markup: asosiyMenyu() });
      return;
    }
    return reg.boshla(chatId, user);
  }
  if (matn === '/qayta') {
    await sorov('update users set state = $1 where id = $2', [reg.HOLAT.TELEFON, user.id]);
    return reg.boshla(chatId, { ...user, state: reg.HOLAT.TELEFON });
  }
  if (matn === '/ochir') return malumotniOchir(chatId, user);
  if (matn === '/help' || matn === 'ℹ️ Yordam') return dokon.yordamKorsat(chatId);

  // ---- Ro'yxatdan o'tish tugallanmagan bo'lsa ----
  if (!reg.royxatdanOtganmi(user)) {
    if (user.state && await reg.qadam(msg, user)) return;
    if (user.state === reg.HOLAT.SHARTNOMA) {
      await yubor(chatId, 'Davom etish uchun ofertaga rozilik bildiring 👆');
      return;
    }
    return reg.boshla(chatId, user);
  }

  // ---- Asosiy menyu ----
  if (matn === '🔬 Yuz skaneri' || matn === '/skaner') return skaner.skanerYordami(chatId);
  if (matn === '🛒 Savatim')      return dokon.savatniKorsat(chatId, user);
  if (matn === '📋 Buyurtmalarim') return dokon.buyurtmalarniKorsat(chatId, user);
  if (matn === '👤 Profilim')     return dokon.profilniKorsat(chatId, user);
  if (matn === '🛍 Katalog' || matn === '/katalog') {
    const kb = katalogTugmasi();
    return yubor(chatId, kb
      ? '🛍 Katalog ilovada ochiladi 👇'
      : '⚠️ Katalog hozircha mavjud emas (PUBLIC_URL sozlanmagan).',
      kb ? { reply_markup: kb } : {});
  }

  // ---- Rasm ----
  if (await skaner.rasmniQabulQil(msg, user)) return;

  await yubor(chatId, 'Pastdagi menyudan tanlang yoki yuz tahlili uchun rasm yuboring 📸',
    { reply_markup: asosiyMenyu() });
}

async function callback(cq) {
  const chatId = cq.message?.chat?.id;
  const user = await foydalanuvchi(cq.from);
  const data = cq.data || '';

  if (data === 'roziman') {
    await javobBer(cq.id, '✅ Qabul qilindi');
    if (!user.agreed_at) await reg.roziBol(chatId, user);
    return;
  }
  if (data === 'skaner') {
    await javobBer(cq.id);
    return skaner.skanerYordami(chatId);
  }
  await javobBer(cq.id);
}

/** Shaxsiy ma'lumotni o'chirish — oferta va qonun talabi. */
async function malumotniOchir(chatId, user) {
  await sorov(
    `update users set full_name=null, phone=null, address=null, age=null,
            agreed_at=null, state=null, state_data='{}'::jsonb
      where id=$1`, [user.id]);
  await sorov('delete from analyses where user_id = $1', [user.id]);
  await sorov('delete from cart_items where user_id = $1', [user.id]);
  await hodisa(user.id, 'delete_data');

  await yubor(chatId,
    ['🗑 <b>Ma’lumotlaringiz o‘chirildi.</b>',
     '',
     'Tahlillar va savat tozalandi. Buyurtmalar tarixi buxgalteriya talabi',
     'sababli saqlanadi, lekin shaxsiy ma’lumotlarsiz.',
     '',
     'Qaytadan boshlash uchun /start.'].join('\n'),
    { reply_markup: { remove_keyboard: true } });
}
