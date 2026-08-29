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

  const h = await havolaniTop(k, havola);

  // HAVOLA YO'Q — to'smaymiz.
  // Admin kanal ID sini yozib, havolani unutgan bo'lsa foydalanuvchi
  // "obuna bo'ling" xabarini ko'radi, lekin qayerga borishni bilmaydi va
  // botdan UMUMAN foydalana olmay qoladi. Bunday sozlama biznesni
  // to'xtatgandan ko'ra, obunani vaqtincha talab qilmagan yaxshi.
  if (!h) {
    console.error('MAJBURIY KANAL: havola topilmadi —', k,
      '· botni kanalga admin qiling yoki havolani sozlamalarga yozing');
    return { kerak: false, azo: true, kanal: k, havola: '' };
  }

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

/**
 * Kanalga kirish havolasi.
 *
 * Tartib:
 *   1. Admin qo'lda yozgan havola
 *   2. @nom bo'lsa — t.me/nom
 *   3. Telegram'dan so'raymiz: kanalning ochiq nomi yoki taklif havolasi
 *   4. Yopiq kanalda taklif havolasi yo'q bo'lsa — o'zimiz yaratamiz
 *
 * Natija keshlanadi: har xabarda Telegram'ga so'rov yubormaymiz.
 */
async function havolaniTop(kanal, qoldaYozilgan) {
  const qolda = String(qoldaYozilgan || '').replace(/"/g, '').trim();
  if (qolda) return qolda;
  if (kanal.startsWith('@')) return `https://t.me/${kanal.slice(1)}`;

  return kesh(`obuna-havola:${kanal}`, 30 * 60_000, async () => {
    const r = await tg('getChat', { chat_id: kanal });
    if (!r?.ok) {
      console.error('MAJBURIY KANAL getChat:', r?.description);
      return '';
    }
    const c = r.result || {};
    if (c.username) return `https://t.me/${c.username}`;
    if (c.invite_link) return c.invite_link;

    // Yopiq kanal va asosiy taklif havolasi hali yaratilmagan
    const y = await tg('createChatInviteLink', {
      chat_id: kanal, name: 'Bot orqali obuna', creates_join_request: false,
    });
    if (y?.ok && y.result?.invite_link) return y.result.invite_link;

    console.error('MAJBURIY KANAL: taklif havolasi yaratilmadi —', y?.description);
    return '';
  });
}

/** Havola keshini tashlash — admin sozlamani o'zgartirganda. */
export const havolaKeshiniTashla = (kanal) =>
  import('../lib/kesh.js').then(({ keshniTashla }) =>
    keshniTashla(kanal ? `obuna-havola:${kanal}` : undefined));

/** A'zo bo'lmaganga ko'rsatiladigan xabar. */
export function obunaXabari(havola, brend, kanal = '') {
  const kb = [];
  if (havola) kb.push([{ text: '📢 Kanalga obuna bo‘lish', url: havola }]);
  kb.push([{ text: '✅ Obuna bo‘ldim', callback_data: 'obuna_tekshir' }]);

  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const qatorlar = [
    `🔒 <b>Avval kanalimizga obuna bo‘ling</b>`, ``,
    `${esc(brend)} botidan foydalanish uchun kanalimizga a'zo bo‘lishingiz kerak.`,
    `U yerda chegirmalar, yangi mahsulotlar va teri parvarishi bo‘yicha`,
    `foydali maslahatlar chiqadi.`, ``,
  ];
  // Havolani MATNDA ham beramiz: tugma ba'zi klientlarda ochilmaydi va
  // odam qayerga borishni bilmay qoladi.
  if (havola) qatorlar.push(`👉 ${esc(havola)}`, ``);
  else if (kanal.startsWith('@')) qatorlar.push(`👉 ${esc(kanal)}`, ``);
  qatorlar.push(`Obuna bo‘lgach «✅ Obuna bo‘ldim» tugmasini bosing.`);

  return { matn: qatorlar.join('\n'), reply_markup: { inline_keyboard: kb } };
}

/** «Obuna bo'ldim» bosilganda keshni tashlab qayta tekshiramiz. */
export function obunaniUnut(telegramId) {
  // kesh moduli kalit bo'yicha o'chiradi
  return import('../lib/kesh.js').then(({ keshniTashla }) => keshniTashla(`obuna:${telegramId}`));
}
