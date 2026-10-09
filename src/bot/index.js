// Botning markaziy dispetcheri. Barcha tugmalar inline.
import { qator, sorov, hodisa } from '../db.js';
import { yubor, javobBer, tg } from './tg.js';
import { asosiyMenyu, ortga } from './keyboards.js';
import { adminmi } from '../lib/admin.js';
import * as admin from './handlers/admin.js';
import { obunaHolati, obunaXabari, obunaniUnut } from '../services/majburiy-kanal.js';
import { brendNomi } from '../lib/brend.js';
import * as reg from './handlers/register.js';
import * as skaner from './handlers/scanner.js';
import * as dokon from './handlers/shop.js';
import { esc } from './format.js';
import { sorovJavobi, telegramKirishniTasdiqla } from '../services/ilova-kirish.js';
import * as ochiq from '../services/ochiq-skan.js';
import { hisobniOchir } from '../services/hisob.js';
import { botStart } from '../services/manba.js';

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

  // Taklif / manba havolasi: `t.me/bot?start=h_madina-5c1`. Start bosilgan
  // zahoti sanaladi va yangi odam kimdan kelgani yoziladi (src/services/manba.js)
  const hMos = /^\/start (h_[a-z0-9-]{2,32})$/i.exec(matn);
  if (hMos) await botStart(user, hMos[1]).catch(() => {});

  // ---- Ilovaga Telegram orqali kirish ----
  // `t.me/bot?start=kir_<kalit>`. Obuna va ro'yxatdan o'tish
  // tekshiruvidan OLDIN: ilovaga kirish kanalga obuna bo'lishga
  // bog'liq bo'lmasligi kerak. Ro'yxatdan o'tish (ism, telefon,
  // rozilik) keyin ilovaning o'zida so'raladi.
  const kirMos = /^\/start kir_([A-Za-z0-9_-]{20,64})$/.exec(matn);
  if (kirMos) {
    const ok = await telegramKirishniTasdiqla(kirMos[1], user);
    return yubor(chatId, ok
      ? '✅ <b>Ilovaga kirdingiz</b>\n\nKiOVO ilovasiga qayting — u allaqachon ochildi.'
      : '⏳ Bu havolaning muddati o‘tgan. Ilovada «Telegram orqali kirish» ni qayta bosing.');
  }

  // «Yozmoqda…» DARHOL ko'rinadi. Javobning o'zi bir necha baza
  // so'rovidan keyin keladi va shu bir lahzada odam «bot o'lganmi?»
  // deb o'ylardi. Kutish shu bilan sezilmaydi.
  tg('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});

  // ---- Majburiy obuna ----
  // Brend nomi ham shu yerda, PARALLEL so'raladi: ikkalasi ham
  // javobga kerak va ketma-ket kutish javobni ikki barobar sekinlashtiradi
  const [obuna] = await Promise.all([
    obunaHolati(user.telegram_id, user),
    brendNomi().catch(() => null),
  ]);
  if (obuna.kerak) {
    const x = obunaXabari(obuna.havola, await brendNomi(), obuna.kanal);
    return yubor(chatId, x.matn, { reply_markup: x.reply_markup });
  }

  // ---- Admin buyruqlari va ko'p qadamli holatlari ----
  // Rasm skanerdan OLDIN tekshiriladi: admin /qosh rejimida bo'lsa
  // yuborgan surati mahsulot skrinshoti, yuz emas.
  if (await admin.adminRasmi(msg, user)) return;
  if (await admin.adminBuyrugi(msg, user)) return;
  if (await admin.adminHolati(msg, user)) return;

  // ---- Buyruqlar ----
  if (matn === '/start' || matn.startsWith('/start ')) {
    // Instagramdan kelgan odam: havolada tahlil TOKENI bor
    // (`t.me/bot?start=n_<token>`). Tokenni eslab qo'yamiz —
    // ro'yxatdan o'tgach natija o'zi keladi.
    const arg = matn.slice(6).trim();
    if (/^n_[0-9a-f]{32}$/.test(arg)) {
      const bor = await ochiq.tokenniOl(arg.slice(2), user);
      if (bor.ok) {
        if (reg.royxatdanOtganmi(user)) {
          await yubor(chatId, '✅ Tahlilingiz topildi!');
          return skaner.natijaniQaytaYubor(chatId, user, bor.analysisId);
        }
        // Hali ro'yxatdan o'tmagan — tahlil biriktirildi, oxirida beriladi
        await sorov(`update users set state_data = state_data || $1::jsonb where id = $2`,
          [JSON.stringify({ kutayotgan_tahlil: bor.analysisId }), user.id]);
        await yubor(chatId,
          '✅ <b>Tahlilingiz tayyor!</b>\n\nUni ko‘rsatish uchun uch qisqa '
          + 'savolga javob bering — 30 soniya.');
        return reg.boshla(chatId, user);
      }
      if (bor.sabab === 'olingan') {
        await yubor(chatId, 'Bu natija allaqachon olingan.');
      }
    }
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
    { reply_markup: await asosiyMenyu(adminmi(user)) });
}

// ---------- Inline tugmalar ----------
const AMALLAR = {
  menyu:         (chatId, user) => dokon.menyuniKorsat(chatId, user),
  natija_ol:     (chatId, user) => skaner.natijaniQaytaYubor(chatId, user),
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

  // Obunani qayta tekshirish
  if (data === 'obuna_tekshir') {
    await obunaniUnut(user.telegram_id);
    const h = await obunaHolati(user.telegram_id, user);
    if (h.kerak) return javobBer(cq.id, 'Hali obuna bo‘lmagansiz. Kanalga kiring va qayta bosing.', true);
    await javobBer(cq.id, '✅ Rahmat!');
    return dokon.menyuniKorsat(chatId, user);
  }

  if (await admin.adminCallback(cq, user)) return;

  if (data === 'roziman') {
    await javobBer(cq.id, '✅ Qabul qilindi');
    // Tugmalar ikkinchi marta bosilmasin
    if (cq.message) await tg('editMessageReplyMarkup', {
      chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] },
    });
    if (!user.agreed_at) await reg.roziBol(chatId, user);
    return;
  }

  // Brauzerdan kirishni tasdiqlash
  if (data.startsWith('kir:')) {
    const [, javob, id] = data.split(':');
    const s = await sorovJavobi(id, javob === 'ha', user.id);
    if (!s) return javobBer(cq.id, 'Bu so‘rovning muddati o‘tgan yoki javob berilgan', true);

    await javobBer(cq.id, javob === 'ha' ? '✅ Tasdiqlandi' : '🚫 Rad etildi');
    if (cq.message) {
      await tg('editMessageText', {
        chat_id: chatId, message_id: cq.message.message_id, parse_mode: 'HTML',
        text: javob === 'ha'
          ? `✅ <b>Kirish tasdiqlandi</b>\n\nBrauzerdagi ilova ochildi. `
            + `Endi u yerda Telegramsiz ishlaydi.`
          : `🚫 <b>Kirish rad etildi</b>\n\nAgar bu siz bo‘lmasangiz — xavotir olmang, `
            + `hech kim kira olmadi. Parol kerak emas: kirish faqat shu yerdagi `
            + `tasdiq bilan bo‘ladi.`,
      }).catch(() => {});
    }
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

/**
 * Botdagi /ochir — ilovadagi «Hisobni o'chirish» bilan BIR XIL ish
 * (src/services/hisob.js). Ilgari bu yerda o'z nusxasi turardi va
 * buyurtmalardagi ism, telefon, manzil o'chmay qolardi.
 */
async function malumotniOchir(chatId, user) {
  const r = await hisobniOchir(user.id);
  if (!r.ok) {
    return yubor(chatId, [
      `⏳ <b>Hozir o‘chirib bo‘lmaydi</b>`,
      ``,
      `Sizda faol buyurtma bor: <b>${esc(r.buyurtmalar.join(', '))}</b>.`,
      `U yetkazilgach /ochir ni qayta yuboring — yoki biz bilan bog‘laning.`,
    ].join('\n'));
  }
  await yubor(chatId, [
    `🗑 <b>Hisobingiz o‘chirildi</b>`,
    ``,
    `Yuz suratlari, tahlillar, savat, sevimlilar va shaxsiy ma’lumotlar o‘chirildi.`,
    `<i>Buyurtmalar hisobi qonun talabi bilan saqlanadi, lekin ism, telefon va manzilsiz.</i>`,
    ``,
    `Qaytadan boshlash: /start`,
  ].join('\n'), { reply_markup: { remove_keyboard: true } });
}
