// Botdagi matnli bo'limlar — hammasi qisqa, batafsili ilovada.
import { qatorlar, qiymat, sozlama } from '../../db.js';
import { yubor } from '../tg.js';
import { adminmi } from '../../lib/admin.js';
import { bosqich, jarayonMatni } from '../../lib/bosqichlar.js';
import { brendNomi } from '../../lib/brend.js';
import { esc, narx } from '../format.js';
import { asosiyMenyu, ortga, appTugma } from '../keyboards.js';
import { xabar } from '../shablon.js';


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
    const b = bosqich(o.status);
    q.push(`${b.emoji} <b>${esc(o.order_no)}</b> — ${narx(o.total)}`);
    q.push(`<i>${esc(b.nom)}</i>`);
    q.push('');
  }
  // Eng oxirgi buyurtmaning to'liq yo'li — mijoz qayerdaligini ko'rsin
  const oxirgi = data[0];
  if (oxirgi && oxirgi.status !== 'bekor') {
    q.push(`━━━━━━━━━━━━━━`, '');
    q.push(`🚀 <b>${esc(oxirgi.order_no)}</b> qayerda:`, '');
    q.push(jarayonMatni(oxirgi.status), '');
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
  const [username, telefon, ishVaqti] = await Promise.all([
    sozlama('konsultatsiya_user', 'qoraqosh_admin'),
    sozlama('menejer_telefon', ''),
    sozlama('menejer_ish_vaqti', ''),
  ]);
  const user = String(username).replace(/"/g, '');
  const tel = String(telefon || '').replace(/"/g, '');

  const qatorlarKb = [];
  if (user) qatorlarKb.push([{ text: '💬 Telegramda yozish', url: `https://t.me/${user}` }]);
  if (tel)  qatorlarKb.push([{ text: `📞 ${tel}`, url: `tel:${tel.replace(/[^+\d]/g, '')}` }]);
  qatorlarKb.push([{ text: '⬅️ Menyu', callback_data: 'menyu' }]);

  await yubor(chatId, await xabar('xabar_konsultatsiya',
    { telefon: tel, ish_vaqti: String(ishVaqti || '').replace(/"/g, '') },
    '💬 <b>Konsultatsiya</b>\n\nMenejerimizga yozing.'),
    { reply_markup: { inline_keyboard: qatorlarKb } });
}

export async function yordamKorsat(chatId) {
  const oferta = appTugma('📄 Ommaviy oferta', '/oferta');
  const kb = [];
  if (oferta) kb.push([{ text: '📄 Ommaviy oferta', url: oferta.web_app.url }]);
  kb.push([{ text: '⬅️ Menyu', callback_data: 'menyu' }]);

  const matn = await xabar('xabar_yordam', {}, 'ℹ️ <b>Yordam</b>');
  const tibbiy = await xabar('ogohlantirish_tibbiy', {}, '');
  await yubor(chatId, [matn, tibbiy].filter(Boolean).join('\n\n'),
    { reply_markup: { inline_keyboard: kb } });
}

export async function menyuniKorsat(chatId, user) {
  const brend = await brendNomi();
  const admin = adminmi(user);
  const ism = esc((user.full_name || '').split(' ')[0] || 'do‘stim');
  const qatorlar = [`🌸 <b>${esc(brend)}</b>`, ``, `Nima qilamiz, ${ism}?`];
  if (admin) qatorlar.push('', '⚙️ <i>Siz adminsiz — panel tugmasi quyida.</i>');
  return yubor(chatId, qatorlar.join('\n'), { reply_markup: await asosiyMenyu(admin) });
}
