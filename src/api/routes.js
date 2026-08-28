// Mini App API. Har bir so'rov Telegram initData imzosi bilan tekshiriladi.
import { qator, qatorlar, sorov, hodisa, sozlama } from '../db.js';
import { verifyInitData } from '../lib/auth.js';
import { ok, xato, tana } from '../lib/http.js';
import { faolMahsulotlar, tahlilQil, oxirgiTahlil } from '../services/analysis.js';
import { savatniOl, savatgaQosh, savatOzgartir, savatniTozala, buyurtmaYarat } from '../services/orders.js';
import { yubor } from '../bot/tg.js';
import { esc, narx } from '../bot/format.js';

/** initData ni tekshirib, bazadagi foydalanuvchini qaytaradi. */
async function kim(req) {
  const tgUser = verifyInitData(req.headers['x-init-data']);
  if (!tgUser) return null;
  const bor = await qator('select * from users where telegram_id = $1', [String(tgUser.id)]);
  if (bor) return bor.is_blocked ? null : bor;
  return await qator(
    `insert into users (telegram_id, username, source) values ($1,$2,'miniapp') returning *`,
    [String(tgUser.id), tgUser.username || null]);
}

export async function apiRoutes(req, res, yol) {
  // --- Ochiq: katalog ---
  if (yol === '/api/catalog' && req.method === 'GET') {
    const [mahsulotlar, kategoriyalar, fee, bepul, pogonalar, karta, egasi, konsult] =
      await Promise.all([
        faolMahsulotlar(),
        qatorlar('select * from categories order by sort'),
        sozlama('delivery_fee', 25000),
        sozlama('free_delivery_from', 500000),
        sozlama('chegirma_pogonalari', []),
        sozlama('karta_raqami', ''),
        sozlama('karta_egasi', ''),
        sozlama('konsultatsiya_user', ''),
      ]);
    return ok(res, {
      mahsulotlar, kategoriyalar,
      yetkazish: { narx: Number(fee), bepul_chegara: Number(bepul) },
      chegirmalar: Array.isArray(pogonalar) ? pogonalar : [],
      karta: { raqam: String(karta || ''), egasi: String(egasi || '') },
      konsultatsiya: String(konsult || ''),
    });
  }

  // --- Bundan keyingi hammasi imzo talab qiladi ---
  const user = await kim(req);
  if (!user) return xato(res, 401, 'Ruxsat yo‘q. Ilovani Telegram orqali oching.');

  if (yol === '/api/me' && req.method === 'GET') {
    return ok(res, {
      user: {
        id: user.id, full_name: user.full_name, phone: user.phone,
        age: user.age, address: user.address,
        royxatdan_otgan: Boolean(user.phone && user.full_name && user.agreed_at),
      },
      oxirgi_tahlil: await oxirgiTahlil(user.id),
    });
  }

  if (yol === '/api/register' && req.method === 'POST') {
    const b = await tana(req);
    const tel = String(b.phone || '').replace(/[\s()-]/g, '');
    // Manzil bu yerda so'ralmaydi — u buyurtma rasmiylashtirishda olinadi.
    if (!/^\+?998\d{9}$/.test(tel))                  return xato(res, 400, 'Telefon raqami noto‘g‘ri.');
    if (String(b.full_name || '').trim().length < 3) return xato(res, 400, 'Ism to‘liq emas.');
    if (!b.agreed)                                   return xato(res, 400, 'Ofertaga rozilik kerak.');

    await sorov(
      `update users set phone=$1, full_name=$2, age=$3, address=$4,
              agreed_at=now(), agreement_version='1.0', state=null
        where id=$5`,
      [tel.startsWith('+') ? tel : '+' + tel,
       String(b.full_name).trim().slice(0, 70),
       Math.min(90, Math.max(12, Number(b.age) || 0)) || null,
       String(b.address || '').trim().slice(0, 300) || null,
       user.id]);
    await hodisa(user.id, 'register', { kanal: 'miniapp' });
    return ok(res, { ok: true });
  }

  if (yol === '/api/scan' && req.method === 'POST') {
    const b = await tana(req);
    const base64 = String(b.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!base64 || base64.length < 1000)      return xato(res, 400, 'Rasm yuborilmadi.');
    if (base64.length > 8 * 1024 * 1024)      return xato(res, 413, 'Rasm juda katta.');
    try {
      return ok(res, await tahlilQil(user, base64, b.mime || 'image/jpeg'));
    } catch (e) {
      console.error('Skan xatosi:', e.message);
      return xato(res, 500, 'Tahlil qilib bo‘lmadi. Qayta urinib ko‘ring.');
    }
  }

  if (yol === '/api/cart' && req.method === 'GET') {
    return ok(res, { savat: await savatniOl(user.id) });
  }
  if (yol === '/api/cart' && req.method === 'POST') {
    const b = await tana(req);
    if (b.amal === 'tozala') { await savatniTozala(user.id); return ok(res, { savat: [] }); }
    if (b.amal === 'toplam' && Array.isArray(b.items)) {
      for (const it of b.items.slice(0, 20)) await savatgaQosh(user.id, Number(it.product_id), Number(it.quantity) || 1);
      await hodisa(user.id, 'add_cart', { toplam: b.items.length });
      return ok(res, { savat: await savatniOl(user.id) });
    }
    const id = Number(b.product_id);
    if (!id) return xato(res, 400, 'product_id kerak.');
    if (b.amal === 'ozgartir') await savatOzgartir(user.id, id, Number(b.quantity) || 0);
    else { await savatgaQosh(user.id, id, Number(b.quantity) || 1); await hodisa(user.id, 'add_cart', { id }); }
    return ok(res, { savat: await savatniOl(user.id) });
  }

  if (yol === '/api/order' && req.method === 'POST') {
    const b = await tana(req);
    const savat = await savatniOl(user.id);
    if (!savat.length) return xato(res, 400, 'Savat bo‘sh.');

    // Manzilni shu yerda tekshiramiz: profildagi eski qiymat bo'sh manzilni
    // yashirib yubormasligi kerak.
    const manzil = String(b.address ?? user.address ?? '').trim();
    if (manzil.length < 10) return xato(res, 400, 'Yetkazib berish manzilini to‘liq kiriting.');
    const tel = String(b.phone ?? user.phone ?? '').replace(/[\s()-]/g, '');
    if (!/^\+?998\d{9}$/.test(tel)) return xato(res, 400, 'Telefon raqamini tekshiring.');
    try {
      const buyurtma = await buyurtmaYarat(
        user,
        savat.map((s) => ({ product_id: s.products.id, quantity: s.quantity })),
        { name: b.name, phone: tel, address: manzil, note: b.note,
          payment: b.payment === 'karta' ? 'karta' : 'naqd' });

      // Manzilni keyingi safar uchun eslab qolamiz
      await sorov('update users set address = $1 where id = $2', [manzil, user.id]);
      xabarYubor(user, buyurtma).catch(() => {});
      return ok(res, { buyurtma });
    } catch (e) {
      return xato(res, 400, e.message);
    }
  }

  // --- Buyurtma qoralamasi: yarim yo'lda chiqib ketsa yo'qolmasin ---
  if (yol === '/api/draft' && req.method === 'GET') {
    const r = await qator('select checkout_draft from users where id = $1', [user.id]);
    return ok(res, { draft: r?.checkout_draft || {} });
  }
  if (yol === '/api/draft' && req.method === 'POST') {
    const b = await tana(req);
    const toza = {
      name:    String(b.name    || '').slice(0, 70),
      phone:   String(b.phone   || '').slice(0, 20),
      address: String(b.address || '').slice(0, 300),
      note:    String(b.note    || '').slice(0, 200),
      payment: b.payment === 'karta' ? 'karta' : 'naqd',
      qadam:   String(b.qadam   || '').slice(0, 20),
    };
    await sorov('update users set checkout_draft = $1 where id = $2', [JSON.stringify(toza), user.id]);
    return ok(res, { ok: true });
  }

  // --- To'lov cheki ---
  if (yol === '/api/receipt' && req.method === 'POST') {
    const b = await tana(req);
    const xom = String(b.image || '');
    const mos = xom.match(/^data:(image\/\w+);base64,(.+)$/s);
    const base64 = mos ? mos[2] : xom;
    if (!base64 || base64.length < 500)        return xato(res, 400, 'Chek rasmi yuborilmadi.');
    if (base64.length > 8 * 1024 * 1024)       return xato(res, 413, 'Rasm juda katta.');

    const buyurtma = await qator(
      'select id, order_no from orders where order_no = $1 and user_id = $2', [b.order_no, user.id]);
    if (!buyurtma) return xato(res, 404, 'Buyurtma topilmadi.');

    const bayt = Buffer.from(base64, 'base64');
    const media = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('chek', $1, $2, $3, $4) returning id`,
      [mos ? mos[1] : 'image/jpeg', bayt, bayt.length, `Chek · ${buyurtma.order_no}`]);

    await sorov(
      `update orders set receipt_id = $1, payment_status = 'chek_yuborilgan', updated_at = now()
        where id = $2`, [media.id, buyurtma.id]);
    await hodisa(user.id, 'receipt', { order_no: buyurtma.order_no });
    return ok(res, { ok: true });
  }

  if (yol === '/api/orders' && req.method === 'GET') {
    return ok(res, {
      buyurtmalar: await qatorlar(
        `select order_no, subtotal, discount, delivery_fee, total, status, created_at,
                items, payment_method, payment_status, receipt_id
           from orders where user_id=$1 order by created_at desc limit 20`, [user.id]),
    });
  }

  return xato(res, 404, 'Topilmadi');
}

async function xabarYubor(user, o) {
  const qatorlarMatn = o.items.map((i) => `• ${esc(i.name)} × ${i.qty} — ${narx(i.price * i.qty)}`).join('\n');
  await yubor(user.telegram_id, [
    `✅ <b>Buyurtmangiz qabul qilindi!</b>`, ``,
    `<b>Raqam:</b> <code>${esc(o.order_no)}</code>`, ``,
    qatorlarMatn, ``,
    o.discount ? `🎁 Chegirma: −${narx(o.discount)}` : '',
    `🚚 Yetkazish: ${o.delivery_fee ? narx(o.delivery_fee) : 'bepul'}`,
    `<b>💰 Jami: ${narx(o.total)}</b>`, ``,
    o.payment_method === 'karta'
      ? `💳 To‘lovni amalga oshirib, chek rasmini ilovada yuklang.`
      : `💵 To‘lov yetkazib berishda naqd pulda.`,
    `📞 Menejer tez orada bog‘lanadi.`,
  ].filter((x) => x !== '').join('\n'));
}
