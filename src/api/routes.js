// Mini App API. Har bir so'rov Telegram initData imzosi bilan tekshiriladi.
import { qator, qatorlar, sorov, hodisa, sozlama } from '../db.js';
import { verifyInitData } from '../lib/auth.js';
import { ok, xato, tana, json, ipOl } from '../lib/http.js';
import { faolMahsulotlar, tahlilQil, oxirgiTahlil, limitHolati } from '../services/analysis.js';
import { xatoniTushuntir } from '../lib/xatolar.js';
import { savatniOl, savatgaQosh, savatOzgartir, savatniTozala, buyurtmaYarat } from '../services/orders.js';
import { yubor } from '../bot/tg.js';
import { esc, narx } from '../bot/format.js';
import { kesh } from '../lib/kesh.js';
import { cheklov } from '../lib/cheklov.js';
import { VILOYATLAR, tumanlar } from '../lib/hududlar.js';
import { kanalgaBuyurtma, kanalgaChek } from '../services/kanal.js';
import { variantlar, TURLAR, turTozala, bepulChegara } from '../services/yetkazish.js';
import { natijaRasminiYarat, saqlanganRasm, kanalgaTahlil } from '../services/natija-rasm.js';
import { rasmYubor } from '../bot/tg.js';

// Kuniga minglab foydalanuvchi bo'lganda katalog eng ko'p so'raladigan yo'l.
// 30 soniyalik kesh bazaga ketadigan bir xil so'rovlarni yig'ib bitta qiladi.
const KATALOG_KESH_MS = 30_000;

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
    // Ochiq yo'l — IP bo'yicha cheklaymiz, aks holda bitta bot bazani bosadi
    const c = cheklov('kat:' + ipOl(req), 90, 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Biroz kuting.' });

    return ok(res, await kesh('katalog', KATALOG_KESH_MS, katalogniYig));
  }

  // --- Bundan keyingi hammasi imzo talab qiladi ---
  const user = await kim(req);
  if (!user) return xato(res, 401, 'Ruxsat yo‘q. Ilovani Telegram orqali oching.');

  // Umumiy tinchlantirgich: normal ishlatishda hech qachon urilmaydi,
  // lekin buzilgan klient yoki skript tizimni bosib qo'yolmaydi.
  const umumiy = cheklov('api:' + user.id, 180, 60_000);
  if (!umumiy.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Biroz kuting.' });

  if (yol === '/api/limit' && req.method === 'GET') {
    return ok(res, { limit: await limitHolati(user.id) });
  }

  if (yol === '/api/me' && req.method === 'GET') {
    return ok(res, {
      limit: await limitHolati(user.id),
      user: {
        id: user.id, full_name: user.full_name, phone: user.phone,
        age: user.age, address: user.address,
        viloyat: user.viloyat, tuman: user.tuman,
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
    // Kunlik limitdan tashqari — qisqa oynadagi cheklov. Skan eng qimmat amal:
    // AI chaqiruvi sekin, shuning uchun bitta odam navbatni band qilmasin.
    const c = cheklov('skan:' + user.id, 6, 5 * 60_000);
    if (!c.ruxsat) {
      return json(res, 429, { error: `Juda tez-tez skanerlayapsiz. ${c.kutish} soniyadan keyin urinib ko‘ring.` });
    }
    const b = await tana(req);
    const base64 = String(b.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!base64 || base64.length < 1000)      return xato(res, 400, 'Rasm yuborilmadi.');
    if (base64.length > 12 * 1024 * 1024)     return xato(res, 413, 'Rasm juda katta.');
    try {
      const mime = tozaMime(b.mime);
      const natija = await tahlilQil(user, base64, mime);

      // Natija rasmini SHU YERDA chizamiz — asl suratni saqlamaymiz, keyin
      // qayta chizib bo'lmaydi. Chizish ~170 ms, AI chaqiruvi yonida sezilmaydi.
      if (natija.yaroqli) {
        const rasm = await natijaRasminiYarat({
          analysisId: natija.analysisId, userId: user.id,
          rasmBase64: base64, mime, tahlil: natija.tahlil, mahsulotlar: natija.mahsulotlar,
        });
        natija.rasm_bor = Boolean(rasm);
        if (rasm) kanalgaTahlil(rasm.bayt, user, natija.tahlil).catch(() => {});
      }
      return ok(res, natija);
    } catch (e) {
      if (e.message === 'LIMIT_TUGADI') {
        return json(res, 429, { error: 'Bugungi limit tugadi.', limit: e.limit });
      }
      const x = xatoniTushuntir(e);
      console.error('SKAN XATOSI', x.log);
      return xato(res, 502, x.matn);
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
      // Hududni ro'yxatga solishtiramiz. Mos kelmasa buyurtmani RAD ETMAYMIZ —
      // shunchaki noto'g'ri qismini tashlaymiz, aks holda eng yaqin ombor
      // xato tanlanadi (masalan "Buxoro viloyati / Chilonzor tumani").
      const { viloyat, tuman } = hududniTekshir(b.viloyat, b.tuman);

      const buyurtma = await buyurtmaYarat(
        user,
        savat.map((s) => ({ product_id: s.products.id, quantity: s.quantity })),
        { name: b.name, phone: tel, address: manzil, note: b.note, viloyat, tuman,
          yetkazishTuri: b.yetkazish_turi });

      // Manzilni keyingi safar uchun eslab qolamiz
      await sorov(
      `update users set address = $1, viloyat = coalesce($2, viloyat), tuman = coalesce($3, tuman)
        where id = $4`,
      [manzil, viloyat, tuman, user.id]);
      xabarYubor(user, buyurtma).catch(() => {});
      kanalgaBuyurtma(buyurtma, user).catch(() => {});
      return ok(res, { buyurtma });
    } catch (e) {
      return xato(res, 400, e.message);
    }
  }

  // --- Yetkazish narxi (savatga va manzilga qarab) ---
  // Mijoz filialdan olish yoki uygacha yetkazishni tanlaydi — ikkalasining
  // narxini ham ko'rsatamiz.
  if (yol === '/api/yetkazish' && req.method === 'POST') {
    const b = await tana(req);
    const savat = await savatniOl(user.id);
    if (!savat.length) return ok(res, { bosh: true });

    const items = savat.map((s) => ({ product_id: s.products.id, quantity: s.quantity }));
    const oraliq = savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
    const { viloyat, tuman } = hududniTekshir(b.viloyat, b.tuman);

    const v = await variantlar({ items, viloyat, tuman });
    const chegara = await bepulChegara();
    const bepul = oraliq >= chegara;

    return ok(res, {
      ogirlik: v.gramm, kilo: v.kilo, bepul, bepul_chegara: chegara,
      turlar: [
        { ...TURLAR.filial, narx: bepul ? 0 : v.filial.narx },
        { ...TURLAR.uy,     narx: bepul ? 0 : v.uy.narx },
      ],
    });
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
      kocha:   String(b.kocha   || '').slice(0, 200),
      note:    String(b.note    || '').slice(0, 200),
      viloyat: String(b.viloyat || '').slice(0, 60),
      tuman:   String(b.tuman   || '').slice(0, 60),
      qadam:   String(b.qadam   || '').slice(0, 20),
      yetkazish_turi: turTozala(b.yetkazish_turi),
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
    kanalgaChek(buyurtma.id).catch(() => {});
    return ok(res, { ok: true });
  }

  // --- Natija rasmini Telegram orqali yuborish ---
  // Telegram WebView ichida <a download> va navigator.share ishlamaydi,
  // shuning uchun rasmni foydalanuvchining o'z chatiga yuboramiz.
  if (yol === '/api/natija-yubor' && req.method === 'POST') {
    const c = cheklov('natija:' + user.id, 8, 10 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Biroz kuting va qayta urinib ko‘ring.' });

    const b = await tana(req);
    const oxirgi = b.analysis_id
      ? await qator('select id from analyses where id = $1 and user_id = $2', [Number(b.analysis_id), user.id])
      : await qator('select id from analyses where user_id = $1 order by created_at desc limit 1', [user.id]);
    if (!oxirgi) return xato(res, 404, 'Tahlil topilmadi.');

    const bayt = await saqlanganRasm(oxirgi.id, user.id);
    if (!bayt) return xato(res, 404, 'Bu tahlilning rasmi saqlanmagan. Yangi skaner qiling.');

    const r = await rasmYubor(user.telegram_id, bayt,
      '📸 <b>Teri tahlilingiz</b>\n\nRasmni bosib turib saqlashingiz yoki do‘stlaringizga ulashishingiz mumkin.');
    if (!r?.ok) return xato(res, 502, 'Telegram orqali yuborib bo‘lmadi. Botni bloklamaganingizni tekshiring.');
    await hodisa(user.id, 'natija_yuborildi', { analysis_id: oxirgi.id });
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

/** Viloyat/tuman juftligini rasmiy ro'yxatga solishtiradi. */
function hududniTekshir(xomViloyat, xomTuman) {
  const viloyat = String(xomViloyat || '').trim().slice(0, 60);
  const tuman   = String(xomTuman   || '').trim().slice(0, 60);
  if (!VILOYATLAR.includes(viloyat)) return { viloyat: null, tuman: null };
  return { viloyat, tuman: tumanlar(viloyat).includes(tuman) ? tuman : null };
}

/** Katalog ma'lumotini bir marta yig'adi — kesh shu funksiyani chaqiradi. */
async function katalogniYig() {
  const [mahsulotlar, kategoriyalar, fee, bepul, pogonalar, karta, egasi, konsult,
         menejerTel, ishVaqti] =
    await Promise.all([
      faolMahsulotlar(),
      qatorlar('select * from categories order by sort'),
      sozlama('delivery_fee', 25000),
      sozlama('free_delivery_from', 500000),
      sozlama('chegirma_pogonalari', []),
      sozlama('karta_raqami', ''),
      sozlama('karta_egasi', ''),
      sozlama('konsultatsiya_user', ''),
      sozlama('menejer_telefon', ''),
      sozlama('menejer_ish_vaqti', ''),
    ]);
  return {
    mahsulotlar, kategoriyalar,
    yetkazish: { narx: Number(fee), bepul_chegara: Number(bepul) },
    chegirmalar: Array.isArray(pogonalar) ? pogonalar : [],
    karta: { raqam: String(karta || ''), egasi: String(egasi || '') },
    konsultatsiya: String(konsult || ''),
    menejer: { telefon: String(menejerTel || ''), ish_vaqti: String(ishVaqti || '') },
  };
}

// Gemini qo'llab-quvvatlaydigan rasm turlari. iPhone HEIC, Android WebP yuboradi.
const MIME_RUYXAT = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
]);
const tozaMime = (m) => (MIME_RUYXAT.has(String(m || '').toLowerCase()) ? String(m).toLowerCase() : 'image/jpeg');

async function xabarYubor(user, o) {
  const qatorlarMatn = o.items.map((i) => `• ${esc(i.name)} × ${i.qty} — ${narx(i.price * i.qty)}`).join('\n');
  await yubor(user.telegram_id, [
    `✅ <b>Buyurtmangiz qabul qilindi!</b>`, ``,
    `<b>Raqam:</b> <code>${esc(o.order_no)}</code>`, ``,
    qatorlarMatn, ``,
    o.discount ? `🎁 Chegirma: −${narx(o.discount)}` : '',
    `🚚 Yetkazish: ${o.delivery_fee ? narx(o.delivery_fee) : 'bepul'}`,
    `<b>💰 Jami: ${narx(o.total)}</b>`, ``,
    `💳 To‘lovni amalga oshirib, chek rasmini ilovada yuklang.`,
    `📞 Menejer tez orada bog‘lanadi.`,
  ].filter((x) => x !== '').join('\n'));
}
