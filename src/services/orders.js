// Buyurtma xizmati. Narx va ombor tekshiruvi bazadagi place_order() ichida —
// mijoz yuborgan summa hech qachon ishonchli deb qabul qilinmaydi.
import { qator, qatorlar, sorov } from '../db.js';

const XATO_MATNI = (msg) => {
  if (msg.includes('BOSH_SAVAT'))         return 'Savat bo‘sh.';
  if (msg.includes('TELEFON_YOQ'))        return 'Telefon raqami ko‘rsatilmagan.';
  if (msg.includes('MAHSULOT_TOPILMADI')) return 'Mahsulotlardan biri katalogdan olib tashlangan. Savatni yangilang.';
  const ombor = msg.match(/OMBORDA_YETARLI_EMAS:(.+?):(\d+)/);
  if (ombor) return `«${ombor[1]}» omborda ${ombor[2]} dona qoldi. Miqdorni kamaytiring.`;
  return 'Buyurtmani rasmiylashtirib bo‘lmadi. Qayta urinib ko‘ring.';
};

export async function buyurtmaYarat(user, items, { name, phone, address, note } = {}) {
  const toza = items.map((i) => ({
    product_id: Number(i.product_id),
    quantity: Math.max(1, Number(i.quantity) || 1),
  }));
  try {
    return await qator(
      'select * from place_order($1,$2,$3,$4,$5,$6)',
      [user.id, JSON.stringify(toza), name || user.full_name,
       phone || user.phone, address || user.address, note || null],
    );
  } catch (e) {
    const xato = new Error(XATO_MATNI(e.message));
    xato.xom = e.message;
    throw xato;
  }
}

export const savatniOl = (userId) => qatorlar(
  `select c.quantity,
          json_build_object('id', p.id, 'name', p.name, 'brand', p.brand,
                            'price', p.price, 'stock', p.stock, 'emoji', p.emoji,
                            'volume', p.volume, 'poster_id', p.poster_id) as products
     from cart_items c
     join products p on p.id = c.product_id
    where c.user_id = $1
    order by c.added_at`, [userId]);

export async function savatgaQosh(userId, productId, quantity = 1) {
  const r = await qator(
    `insert into cart_items (user_id, product_id, quantity)
     values ($1,$2,greatest(1,$3))
     on conflict (user_id, product_id)
       do update set quantity = cart_items.quantity + greatest(1,$3)
     returning quantity`, [userId, productId, quantity]);
  return r.quantity;
}

export async function savatOzgartir(userId, productId, quantity) {
  if (quantity <= 0) {
    await sorov('delete from cart_items where user_id=$1 and product_id=$2', [userId, productId]);
    return 0;
  }
  await sorov(
    `insert into cart_items (user_id, product_id, quantity) values ($1,$2,$3)
     on conflict (user_id, product_id) do update set quantity = excluded.quantity`,
    [userId, productId, quantity]);
  return quantity;
}

export const savatniTozala = (userId) =>
  sorov('delete from cart_items where user_id = $1', [userId]);
