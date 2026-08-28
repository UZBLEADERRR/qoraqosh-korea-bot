// Botdagi matnli bo'limlar — hammasi qisqa, batafsili ilovada.
import { qatorlar, qiymat, sozlama } from '../../db.js';
import { yubor } from '../tg.js';
import { esc, narx } from '../format.js';
import { asosiyMenyu, ortga, appTugma } from '../keyboards.js';

const HOLAT_EMOJI = {
  yangi: '🆕', tasdiqlangan: '✅', yolda: '🚚', yetkazildi: '📦', bekor: '❌',
};
const HOLAT_NOM = {
  yangi: 'Yangi', tasdiqlangan: 'Tasdiqlangan', yolda: 'Yo‘lda',
  yetkazildi: 'Yetkazildi', bekor: 'Bekor qilingan',
};

export async function buyurtmalarniKorsat(chatId, user) {
  const data = await qatorlar(
    `select order_no, total, status, created_at from orders
      where user_id = $1 order by created_at desc limit 5`, [user.id]);

  if (!data.length) {
    const kb = appTugma('🛍 Do‘konga o‘tish');
    return yubor(chatId, '📋 Hozircha buyurtmangiz yo‘q.',
      { reply_markup: kb ? { inline_keyboard: [[kb], [{ text: '⬅️ Menyu', callback_data: 'menyu' }]] } : ortga() });
  }

  const q = ['📋 <b>Buyurtmalaringiz</b>', ''];
  for (const o of data) {
    q.push(`${HOLAT_EMOJI[o.status] || '•'} <b>${esc(o.order_no)}</b> — ${narx(o.total)}`);
    q.push(`<i>${HOLAT_NOM[o.status] || o.status} · ${new Date(o.created_at).toLocaleDateString('uz-UZ')}</i>`);
    q.push('');
  }
  const kb = appTugma('📋 Batafsil ko‘rish', '/app/?tab=buyurtma');
  await yubor(chatId, q.join('\n'),
    { reply_markup: kb ? { inline_keyboard: [[kb], [{ text: '⬅️ Menyu', callback_data: 'menyu' }]] } : ortga() });
}

export async function profilniKorsat(chatId, user) {
  const [tahlilSoni, buyurtmaSoni] = await Promise.all([
    qiymat('select count(*)::int from analyses where user_id = $1', [user.id]),
    qiymat('select count(*)::int from orders   where user_id = $1', [user.id]),
  ]);

  await yubor(chatId, [
    `👤 <b>Profilingiz</b>`,
    ``,
    `📛 ${esc(user.full_name || '—')}`,
    `📱 ${esc(user.phone || '—')}`,
    `🎂 ${user.age || '—'} yosh`,
    ``,
    `🔬 ${tahlilSoni ?? 0} ta tahlil`,
    `📦 ${buyurtmaSoni ?? 0} ta buyurtma`,
    ``,
    `<i>O‘zgartirish: /qayta · O‘chirish: /ochir</i>`,
  ].join('\n'), { reply_markup: ortga() });
}

export async function konsultatsiya(chatId) {
  const username = String(await sozlama('konsultatsiya_user', 'qoraqosh_admin')).replace(/"/g, '');
  const qatorlarKb = [[{ text: '💬 Menejerga yozish', url: `https://t.me/${username}` }]];
  qatorlarKb.push([{ text: '⬅️ Menyu', callback_data: 'menyu' }]);

  await yubor(chatId, [
    `💬 <b>Konsultatsiya</b>`,
    ``,
    `Savolingiz bormi? Menejerimiz javob beradi:`,
    ``,
    `🧴 qaysi mahsulot sizga mos`,
    `🔄 mahsulotlarni birga ishlatsa bo‘ladimi`,
    `🚚 yetkazib berish va to‘lov`,
    `↩️ almashtirish va qaytarish`,
    ``,
    `<i>Odatda 1 soat ichida javob beramiz.</i>`,
  ].join('\n'), { reply_markup: { inline_keyboard: qatorlarKb } });
}

export async function yordamKorsat(chatId) {
  const oferta = appTugma('📄 Ommaviy oferta', '/oferta');
  const kb = [];
  if (oferta) kb.push([{ text: '📄 Ommaviy oferta', url: oferta.web_app.url }]);
  kb.push([{ text: '⬅️ Menyu', callback_data: 'menyu' }]);

  await yubor(chatId, [
    `ℹ️ <b>Yordam</b>`,
    ``,
    `🔬 <b>Yuz skaneri</b> — rasm yuboring, teri holatini tahlil qilaman`,
    `🛍 <b>Do‘kon</b> — katalog, qidiruv va narx bo‘yicha filtr`,
    `🛒 <b>Savat</b> — buyurtma berish`,
    `💬 <b>Konsultatsiya</b> — menejer bilan bog‘lanish`,
    ``,
    `<b>Buyruqlar</b>`,
    `/start — boshlash`,
    `/skaner — yuz tahlili`,
    `/qayta — ma’lumotni yangilash`,
    `/ochir — ma’lumotimni o‘chirish`,
    ``,
    `<i>⚕️ AI tahlili tibbiy tashxis emas. Jiddiy teri muammosida dermatologga murojaat qiling.</i>`,
  ].join('\n'), { reply_markup: { inline_keyboard: kb } });
}

export const menyuniKorsat = (chatId, user) =>
  yubor(chatId, `🌸 <b>QoraQosh</b>\n\nNima qilamiz, ${esc((user.full_name || '').split(' ')[0] || 'do‘stim')}?`,
    { reply_markup: asosiyMenyu() });
