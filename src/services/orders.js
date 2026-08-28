// Buyurtma xizmati. Narx va ombor tekshiruvi bazadagi place_order() ichida —
// mijoz yuborgan summa hech qachon ishonchli deb qabul qilinmaydi.
import { db, q } from '../db.js';

const XATO_MATNI = (msg) => {
  if (msg.includes('BOSH_SAVAT'))        return 'Savat bo‘sh.';
  if (msg.includes('TELEFON_YOQ'))       return 'Telefon raqami ko‘rsatilmagan.';
  if (msg.includes('MAHSULOT_TOPILMADI')) return 'Mahsulotlardan biri katalogdan olib tashlangan. Savatni yangilang.';
  const ombor = msg.match(/OMBORDA_YETARLI_EMAS:(.+?):(\d+)/);
  if (ombor) return `«${ombor[1]}» omborda ${ombor[2]} dona qoldi. Miqdorni kamaytiring.`;
  return 'Buyurtmani rasmiylashtirib bo‘lmadi. Qayta urinib ko‘ring.';
};

export async function buyurtmaYarat(user, items, { name, phone, address, note } = {}) {
  const { data, error } = await db.rpc('place_order', {
    p_user_id: user.id,
    p_items:   items.map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) || 1 })),
    p_name:    name    || user.full_name,
    p_phone:   phone   || user.phone,
    p_address: address || user.address,
    p_note:    note || null,
  });
  if (error) {
    const e = new Error(XATO_MATNI(error.message));
    e.xom = error.message;
    throw e;
  }
  return Array.isArray(data) ? data[0] : data;
}

export const savatniOl = (userId) =>
  q(db.from('cart_items')
      .select('quantity, products(id,name,brand,price,stock,emoji,volume)')
      .eq('user_id', userId),
    'savat');

export async function savatgaQosh(userId, productId, quantity = 1) {
  const { data: bor } = await db.from('cart_items')
    .select('quantity').eq('user_id', userId).eq('product_id', productId).maybeSingle();
  const yangi = Math.max(1, (bor?.quantity || 0) + quantity);
  await q(db.from('cart_items').upsert({ user_id: userId, product_id: productId, quantity: yangi }), 'savatga qo‘shish');
  return yangi;
}

export async function savatOzgartir(userId, productId, quantity) {
  if (quantity <= 0) {
    await q(db.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId), 'savatdan olish');
    return 0;
  }
  await q(db.from('cart_items').upsert({ user_id: userId, product_id: productId, quantity }), 'savat');
  return quantity;
}

export const savatniTozala = (userId) =>
  q(db.from('cart_items').delete().eq('user_id', userId), 'savatni tozalash');
