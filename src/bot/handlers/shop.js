// Savat, buyurtmalar, profil va yordam — botdagi matnli bo'limlar.
import { db } from '../../db.js';
import { yubor } from '../tg.js';
import { esc, narx, jadval, royxat } from '../format.js';
import { savatniOl } from '../../services/orders.js';
import { katalogTugmasi, miniAppUrl } from '../keyboards.js';

const HOLAT_NOM = {
  yangi: '🆕 Yangi', tasdiqlangan: '✅ Tasdiqlangan', yolda: '🚚 Yo‘lda',
  yetkazildi: '📦 Yetkazildi', bekor: '❌ Bekor qilingan',
};

export async function savatniKorsat(chatId, user) {
  const qatorlar = await savatniOl(user.id);
  if (!qatorlar.length) {
    await yubor(chatId, '🛒 Savatingiz bo‘sh.\n\nKatalogdan mahsulot tanlang yoki yuz skanerini ishlating.',
      { reply_markup: katalogTugmasi() || undefined });
    return;
  }
  let jami = 0;
  const jadvalQator = qatorlar.map(({ quantity, products: p }) => {
    const summa = p.price * quantity;
    jami += summa;
    return [p.name, `${quantity}x`, narx(summa).replace(" so'm", '')];
  });

  await yubor(chatId, [
    `🛒 <b>SAVATINGIZ</b>`,
    ``,
    jadval(['Mahsulot', 'Soni', 'Summa'], jadvalQator, { ong: [false, true, true] }),
    ``,
    `<b>Jami: ${narx(jami)}</b>`,
    ``,
    `Buyurtmani rasmiylashtirish uchun ilovani oching 👇`,
  ].join('\n'), { reply_markup: katalogTugmasi('🛒 Buyurtmani rasmiylashtirish', '/app/?tab=savat') || undefined });
}

export async function buyurtmalarniKorsat(chatId, user) {
  const { data } = await db.from('orders')
    .select('order_no,total,status,created_at,items')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);

  if (!data?.length) {
    await yubor(chatId, '📋 Hozircha buyurtmangiz yo‘q.');
    return;
  }
  const qatorlar = data.map((o) => [
    o.order_no.replace('QQ-', ''),
    new Date(o.created_at).toLocaleDateString('uz-UZ'),
    narx(o.total).replace(" so'm", ''),
  ]);
  await yubor(chatId, [
    `📋 <b>BUYURTMALARINGIZ</b>`,
    ``,
    jadval(['Raqam', 'Sana', 'Summa'], qatorlar, { ong: [false, false, true] }),
    ``,
    ...data.slice(0, 5).map((o) => `<b>${esc(o.order_no)}</b> — ${HOLAT_NOM[o.status] || o.status}`),
  ].join('\n'));
}

export async function profilniKorsat(chatId, user) {
  const { count: tahlilSoni } = await db.from('analyses')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  const { count: buyurtmaSoni } = await db.from('orders')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);

  await yubor(chatId, [
    `👤 <b>PROFILINGIZ</b>`,
    ``,
    royxat([
      ['Ism',      user.full_name || '—'],
      ['Telefon',  user.phone || '—'],
      ['Yosh',     String(user.age || '—')],
      ['Manzil',   user.address || '—'],
      ['Tahlillar', String(tahlilSoni ?? 0)],
      ['Buyurtmalar', String(buyurtmaSoni ?? 0)],
    ]),
    ``,
    `Ma’lumotni o‘zgartirish uchun: /qayta`,
  ].join('\n'));
}

export async function yordamKorsat(chatId) {
  const oferta = miniAppUrl('/oferta');
  await yubor(chatId, [
    `ℹ️ <b>YORDAM</b>`,
    ``,
    `<b>🔬 Yuz skaneri</b> — yuzingiz suratini yuboring, AI teri holatini`,
    `tahlil qiladi va bosqichma-bosqich parvarish tuzadi.`,
    ``,
    `<b>🛍 Katalog</b> — barcha mahsulotlar, filtr va qidiruv bilan.`,
    ``,
    `<b>🛒 Savat</b> — tanlangan mahsulotlar va buyurtma berish.`,
    ``,
    `<b>Buyruqlar</b>`,
    `/start — boshlash`,
    `/skaner — yuz tahlili`,
    `/qayta — ma’lumotlarni yangilash`,
    `/ochir — ma’lumotlarimni o‘chirish`,
    ``,
    oferta ? `<a href="${oferta}">📄 Ommaviy oferta</a>` : '',
    ``,
    `<i>AI tahlili tibbiy tashxis emas. Jiddiy teri muammolarida`,
    `dermatologga murojaat qiling.</i>`,
  ].filter(Boolean).join('\n'));
}
