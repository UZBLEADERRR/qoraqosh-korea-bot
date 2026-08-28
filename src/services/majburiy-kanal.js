// Majburiy obuna: foydalanuvchi kanalga a'zo bo'lmasa botdan foydalana olmaydi.
//
// Tekshirish getChatMember orqali. Har xabarda Telegram'ga so'rov yubormaslik
// uchun natija qisqa vaqt keshlanadi — a'zo bo'lgan odam qayta-qayta
// tekshirilmaydi.
import { sozlama } from '../db.js';
import { tg } from '../bot/tg.js';
import { kesh } from '../lib/kesh.js';
import { adminmi } from '../lib/admin.js';

// A'zolikni 10 daqiqa eslab turamiz. Chiqib ketgan odam eng ko'pi bilan
// 10 daqiqa ortiqcha foydalanadi — bu Telegram'ni so'rovga ko'mgandan yaxshi.
const KESH_MS = 10 * 60_000;

const AZO = new Set(['creator', 'administrator', 'member']);

/**
 * @returns {Promise<{kerak:boolean, azo:boolean, kanal:string, havola:string}>}
 */
export async function obunaHolati(telegramId, user) {
  const [kanal, havola] = await Promise.all([
    sozlama('majburiy_kanal', ''),
    sozlama('majburiy_kanal_havola', ''),
  ]);
  const k = String(kanal || '').replace(/"/g, '').trim();
  if (!k) return { kerak: false, azo: true, kanal: '', havola: '' };

  // Adminlar hech qachon to'silmaydi — aks holda kanal noto'g'ri
  // sozlanganda o'z botiga kira olmay qolishardi.
  if (adminmi(user)) return { kerak: false, azo: true, kanal: k, havola: '' };

  const h = String(havola || '').replace(/"/g, '').trim()
    || (k.startsWith('@') ? `https://t.me/${k.slice(1)}` : '');

  const azo = await kesh(`obuna:${telegramId}`, KESH_MS, async () => {
    const r = await tg('getChatMember', { chat_id: k, user_id: Number(telegramId) });
    // Bot kanalga qo'shilmagan yoki kanal noto'g'ri bo'lsa — hammani
    // to'sib qo'ymaymiz. Noto'g'ri sozlama butun botni o'ldirmasligi kerak.
    if (!r?.ok) {
      console.error('MAJBURIY KANAL:', r?.description);
      return true;
    }
    return AZO.has(r.result?.status);
  });

  return { kerak: !azo, azo, kanal: k, havola: h };
}

/** A'zo bo'lmaganga ko'rsatiladigan xabar. */
export function obunaXabari(havola, brend) {
  const kb = [];
  if (havola) kb.push([{ text: '📢 Kanalga obuna bo‘lish', url: havola }]);
  kb.push([{ text: '✅ Obuna bo‘ldim', callback_data: 'obuna_tekshir' }]);
  return {
    matn: [
      `🔒 <b>Avval kanalimizga obuna bo‘ling</b>`, ``,
      `${brend} botidan foydalanish uchun kanalimizga a'zo bo‘lishingiz kerak.`,
      `U yerda chegirmalar, yangi mahsulotlar va teri parvarishi bo‘yicha`,
      `foydali maslahatlar chiqadi.`, ``,
      `Obuna bo‘lgach «✅ Obuna bo‘ldim» tugmasini bosing.`,
    ].join('\n'),
    reply_markup: { inline_keyboard: kb },
  };
}

/** «Obuna bo'ldim» bosilganda keshni tashlab qayta tekshiramiz. */
export function obunaniUnut(telegramId) {
  // kesh moduli kalit bo'yicha o'chiradi
  return import('../lib/kesh.js').then(({ keshniTashla }) => keshniTashla(`obuna:${telegramId}`));
}
