// Admin API. Kirish: login/parol -> muddati cheklangan token (8 soat).
import { qator, qatorlar, sorov, qiymat, sozlama, tranzaksiya } from '../db.js';
import { issueAdminToken, verifyAdminToken, loginBloklanganmi, loginXato, loginTozala } from '../lib/auth.js';
import { ok, xato, tana, ipOl } from '../lib/http.js';
import { verifyInitData } from '../lib/auth.js';
import { mahsulotniTani } from '../ai/productEnrich.js';
import { posterGoyalari, posterChiz, NISBATLAR } from '../ai/poster.js';
import { aiJson, aiBormi, provayder, openrouterBormi, googleBormi } from '../ai/index.js';
import { xatoniTushuntir } from '../lib/xatolar.js';
import { config } from '../config.js';
import { HOLATLAR } from '../lib/bosqichlar.js';
import { yubor, tg } from '../bot/tg.js';
import { esc } from '../bot/format.js';
import { xabar, keshniTozala } from '../bot/shablon.js';
import { STANDART, GURUHLAR, TAVSIF } from '../bot/shablonlar-standart.js';
import { palitra, rangTozala, MAVZU_STANDART, TOPLAMLAR } from '../lib/mavzu.js';
import * as mp from '../services/marketplace.js';
import * as mpv from '../services/marketplace-vazifa.js';
import { narxHisobla, qoidaniTozala } from '../lib/narx.js';
import { keshniTashla } from '../lib/kesh.js';
import { kanalniSina, kanalgaHolat } from '../services/kanal.js';
import { rasmChizaOlamizmi, svgdanPng } from '../rasm/chiz.js';
import { natijaSvg } from '../rasm/natija-kartochka.js';
import { brendNomi } from '../lib/brend.js';

// Katalog keshini bekor qilish: admin nimadir o'zgartirsa ilova darhol yangisini ko'rsin
const katalogYangilandi = () => keshniTashla('katalog');

const kunlarOldin = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
// Ro'yxat bitta manbadan — bot ham, panel ham bir xil bosqichlarni biladi

export async function adminRoutes(req, res, yol) {
  // ---------- Kirish ----------
  if (yol === '/api/admin/login' && req.method === 'POST') {
    const ip = ipOl(req);
    if (loginBloklanganmi(ip)) return xato(res, 429, '5 marta xato. 15 daqiqadan so‘ng urinib ko‘ring.');
    const b = await tana(req);
    if (b.login === config.adminLogin && b.password === config.adminPassword) {
      loginTozala(ip);
      return ok(res, { token: issueAdminToken() });
    }
    loginXato(ip);
    return xato(res, 401, 'Login yoki parol noto‘g‘ri.');
  }

  // ---------- Telegram orqali kirish ----------
  // Admin panel Telegram Mini App sifatida ochilganda parol so'ralmaydi:
  // initData imzosi tekshiriladi va foydalanuvchi admin ro'yxatida bo'lishi kerak.
  if (yol === '/api/admin/tg-login' && req.method === 'POST') {
    const tgUser = verifyInitData(req.headers['x-init-data']);
    if (!tgUser) return xato(res, 401, 'Telegram imzosi tekshirilmadi.');

    const tid = String(tgUser.id);
    const bootstrap = config.adminTelegramIds.includes(tid);

    let u = await qator('select id, is_admin, full_name from users where telegram_id = $1', [tid]);
    if (!u && bootstrap) {
      u = await qator(
        `insert into users (telegram_id, username, is_admin, source)
         values ($1,$2,true,'admin') returning id, is_admin, full_name`,
        [tid, tgUser.username || null]);
    }
    if (!u) return xato(res, 403, 'Bu hisob admin emas.');

    // ENV dagi ID birinchi kirishda avtomatik admin qilinadi
    if (bootstrap && !u.is_admin) {
      await sorov('update users set is_admin = true where id = $1', [u.id]);
      u.is_admin = true;
    }
    if (!u.is_admin) return xato(res, 403, 'Bu hisob admin emas.');

    return ok(res, {
      token: issueAdminToken(),
      admin: { ism: u.full_name || tgUser.first_name || 'Admin', telegram_id: tid },
    });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyAdminToken(token)) return xato(res, 401, 'Sessiya tugagan. Qayta kiring.');

  // ================= TIZIM HOLATI =================
  // Nimadir ishlamay qolsa, sabab shu yerda ko'rinadi.
  if (yol === '/api/admin/health' && req.method === 'GET') {
    return ok(res, { tekshiruvlar: await tizimTekshir() });
  }

  // ================= BOSHQARUV =================
  if (yol === '/api/admin/dashboard' && req.method === 'GET') return ok(res, await boshqaruvPaneli());

  // ================= BUYURTMALAR =================
  if (yol === '/api/admin/orders' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const holat = url.searchParams.get('status');
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 100);
    return ok(res, {
      buyurtmalar: await qatorlar(
        `select o.*, u.telegram_id, u.username
           from orders o join users u on u.id = o.user_id
          ${holat ? 'where o.status = $2' : ''}
          order by o.created_at desc limit $1`,
        holat ? [limit, holat] : [limit]),
    });
  }

  if (yol === '/api/admin/order-status' && req.method === 'POST') {
    const b = await tana(req);
    if (!HOLATLAR.includes(String(b.status))) return xato(res, 400, 'Noto‘g‘ri holat.');
    const eski = await qator(
      `select o.*, u.telegram_id from orders o join users u on u.id=o.user_id where o.id=$1`, [b.id]);
    if (!eski) return xato(res, 404, 'Buyurtma topilmadi.');

    if (b.status === 'bekor' && eski.status !== 'bekor') await sorov('select restock_order($1)', [b.id]);

    await sorov(
      `update orders set status=$1, cancel_reason=$2, updated_at=now() where id=$3`,
      [b.status, b.status === 'bekor' ? String(b.reason || '').slice(0, 200) : null, b.id]);

    mijozgaXabar(eski, b.status, b.reason).catch((e) => console.error('Xabar:', e.message));
    kanalgaHolat(eski.order_no, b.status, b.reason).catch(() => {});
    return ok(res, { ok: true });
  }

  // To'lovni tasdiqlash / rad etish
  if (yol === '/api/admin/payment-status' && req.method === 'POST') {
    const b = await tana(req);
    const holat = String(b.payment_status || '');
    if (!['kutilmoqda', 'chek_yuborilgan', 'tolangan', 'naqd'].includes(holat)) {
      return xato(res, 400, 'Noto‘g‘ri to‘lov holati.');
    }
    const o = await qator(
      `select o.*, u.telegram_id from orders o join users u on u.id=o.user_id where o.id=$1`, [b.id]);
    if (!o) return xato(res, 404, 'Buyurtma topilmadi.');

    await sorov('update orders set payment_status=$1, updated_at=now() where id=$2', [holat, b.id]);

    if (holat === 'tolangan') {
      // To'lov tasdiqlangach buyurtma xarid ro'yxatiga tushishi kerak
      await sorov(
        `update orders set status = 'tasdiqlangan', updated_at = now()
          where id = $1 and status = 'yangi'`, [b.id]);

      // Chek rasmini saqlab o'tirmaymiz: u tekshirish uchun kerak edi, tekshirildi.
      // Mijozning bank ma'lumoti bazada yotishi shart emas.
      if (!(await sozlama('chek_saqlansin', false)) && o.receipt_id) {
        await sorov('update orders set receipt_id = null where id = $1', [b.id]);
        await sorov('delete from media where id = $1', [o.receipt_id]).catch(() => {});
      }

      if (o.telegram_id) {
        xabar('xabar_tolov_tasdiq', { raqam: esc(o.order_no) },
          '✅ <b>{raqam}</b> — to‘lovingiz tasdiqlandi.')
          .then((m) => yubor(o.telegram_id, m)).catch(() => {});
      }
    }
    return ok(res, { ok: true });
  }

  // ================= OMBORLAR / FILIALLAR =================
  if (yol === '/api/admin/omborlar' && req.method === 'GET') {
    return ok(res, {
      omborlar: await qatorlar(
        `select o.*, (select count(*)::int from orders where ombor_id = o.id) as buyurtma_soni
           from omborlar o order by o.tartib, o.nom`),
    });
  }

  if (yol === '/api/admin/ombor' && req.method === 'POST') {
    const b = await tana(req);
    const m = {
      nom:       String(b.nom || '').trim().slice(0, 80),
      viloyat:   String(b.viloyat || '').trim().slice(0, 60),
      tuman:     String(b.tuman || '').trim().slice(0, 60) || null,
      manzil:    String(b.manzil || '').trim().slice(0, 200) || null,
      telefon:   String(b.telefon || '').trim().slice(0, 30) || null,
      ish_vaqti: String(b.ish_vaqti || '').trim().slice(0, 60) || null,
      mo_ljal:   String(b.mo_ljal || '').trim().slice(0, 120) || null,
      faol:      b.faol !== false,
      tartib:    Number(b.tartib) || 100,
    };
    if (!m.nom)     return xato(res, 400, 'Ombor nomi kerak.');
    if (!m.viloyat) return xato(res, 400, 'Viloyat tanlanmagan.');
    const q = [m.nom, m.viloyat, m.tuman, m.manzil, m.telefon, m.ish_vaqti, m.mo_ljal, m.faol, m.tartib];
    const natija = b.id
      ? await qator(`update omborlar set nom=$1,viloyat=$2,tuman=$3,manzil=$4,telefon=$5,
                       ish_vaqti=$6,mo_ljal=$7,faol=$8,tartib=$9 where id=$10 returning *`, [...q, b.id])
      : await qator(`insert into omborlar (nom,viloyat,tuman,manzil,telefon,ish_vaqti,mo_ljal,faol,tartib)
                     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`, q);
    return ok(res, { ombor: natija });
  }

  if (yol === '/api/admin/ombor' && req.method === 'DELETE') {
    const b = await tana(req);
    await sorov('update omborlar set faol = false where id = $1', [b.id]);
    return ok(res, { ok: true });
  }

  // ================= ADMINLAR =================
  if (yol === '/api/admin/adminlar' && req.method === 'GET') {
    return ok(res, {
      adminlar: await qatorlar(
        `select id, telegram_id, username, full_name, last_active
           from users where is_admin order by created_at`),
      env_idlar: config.adminTelegramIds,
    });
  }
  if (yol === '/api/admin/admin-toggle' && req.method === 'POST') {
    const b = await tana(req);
    const tid = String(b.telegram_id || '').replace(/\D/g, '');
    if (!tid) return xato(res, 400, 'Telegram ID kerak.');
    if (b.qoshish === false && config.adminTelegramIds.includes(tid)) {
      return xato(res, 400, 'Bu ID muhit o‘zgaruvchisida — avval ADMIN_TELEGRAM_IDS dan olib tashlang.');
    }
    const u = await qator('select id from users where telegram_id = $1', [tid]);
    if (!u) return xato(res, 404, 'Bunday foydalanuvchi topilmadi. Avval botga /start yozsin.');
    await sorov('update users set is_admin = $1 where id = $2', [b.qoshish !== false, u.id]);
    return ok(res, { ok: true });
  }

  // ================= MAHSULOTLAR =================
  if (yol === '/api/admin/products' && req.method === 'GET') {
    return ok(res, {
      mahsulotlar: await qatorlar('select * from products order by id desc limit 2000'),
      kategoriyalar: await qatorlar('select * from categories order by sort'),
    });
  }

  if (yol === '/api/admin/recognize' && req.method === 'POST') {
    const b = await tana(req);
    const rasm = rasmniOl(b.image);
    if (!rasm) return xato(res, 400, 'Rasm yuborilmadi.');
    try {
      return ok(res, await mahsulotniTani(rasm.base64, b.mime || rasm.mime));
    } catch (e) {
      return xato(res, 502, e.foydalanuvchiga || 'AI mahsulotni tanimadi. Maydonlarni qo‘lda to‘ldiring.');
    }
  }

  // ══════════ Ko'p mahsulotni birdan qo'shish ══════════
  //
  // Admin bir necha rasm tanlaydi; har biri uchun AI kartochkani to'ldiradi
  // va rasmning O'ZI mahsulot rasmi bo'lib qoladi. Adminga faqat narx va
  // ombor qoladi. Bittalab qo'shishda 20 ta mahsulot yarim kun oladi.
  if (yol === '/api/admin/recognize-toplam' && req.method === 'POST') {
    const b = await tana(req);
    const rasmlar = (Array.isArray(b.images) ? b.images : []).slice(0, 12);
    if (!rasmlar.length) return xato(res, 400, 'Rasm yuborilmadi.');

    // Ketma-ket: bir vaqtda 12 ta AI chaqiruvi kvotani yeb qo'yadi va
    // provayder 429 qaytaradi. Bittasi yiqilsa qolganlari davom etadi.
    const natijalar = [];
    for (const xom of rasmlar) {
      const rasm = rasmniOl(typeof xom === 'string' ? xom : xom?.image);
      if (!rasm) { natijalar.push({ xato: 'Rasm o‘qilmadi yoki juda katta.' }); continue; }
      try {
        const tanilgan = await mahsulotniTani(rasm.base64, rasm.mime);
        // Rasmni saqlaymiz — u mahsulot kartochkasining rasmi bo'ladi
        const bayt = Buffer.from(rasm.base64, 'base64');
        const m = await qator(
          `insert into media (tur, mime, bayt, hajm, goya)
           values ('poster', $1, $2, $3, $4) returning id`,
          [rasm.mime, bayt, bayt.length, tanilgan.name.slice(0, 200) || 'Yangi mahsulot']);
        natijalar.push({ ...tanilgan, media_id: m.id });
      } catch (e) {
        natijalar.push({ xato: e.foydalanuvchiga || 'AI tanimadi.' });
      }
    }
    return ok(res, { natijalar });
  }

  // Tanilgan mahsulotlarni birdan saqlash
  if (yol === '/api/admin/products-toplam' && req.method === 'POST') {
    const royxat = (await tana(req)).mahsulotlar;
    if (!Array.isArray(royxat) || !royxat.length) return xato(res, 400, 'Ro‘yxat bo‘sh.');

    const qoshildi = [];
    const xatolar = [];
    for (const m of royxat.slice(0, 30)) {
      const nom = String(m.name || '').trim().slice(0, 120);
      const narx = Math.max(0, Number(m.price) || 0);
      if (!nom)  { xatolar.push({ nom: '(nomsiz)', sabab: 'Nomi yo‘q' }); continue; }
      if (!narx) { xatolar.push({ nom, sabab: 'Narx qo‘yilmagan' }); continue; }
      try {
        const r = await qator(
          `insert into products (name,brand,category_id,step,price,cost_price,stock,volume,
                  country,description,usage_text,ingredients,actives,concerns,skin_types,
                  warnings,emoji,ai_filled,is_active,manba_url,manba,ogirlik,poster_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18,$19,$20,$21,$22)
           returning id, name`,
          [nom,
           String(m.brand || '').trim().slice(0, 60) || null,
           m.category_id ? Number(m.category_id) : null,
           m.step || null,
           narx,
           Math.max(0, Number(m.cost_price) || 0),
           Math.max(0, Number(m.stock) || 0),
           String(m.volume || '').slice(0, 30) || null,
           String(m.country || 'KR').slice(0, 4),
           String(m.description || '').slice(0, 900) || null,
           String(m.usage_text || '').slice(0, 900) || null,
           String(m.ingredients || '').slice(0, 1200) || null,
           (Array.isArray(m.actives) ? m.actives : []).slice(0, 12),
           (Array.isArray(m.concerns) ? m.concerns : []).slice(0, 10),
           (Array.isArray(m.skin_types) ? m.skin_types : []).slice(0, 8),
           String(m.warnings || '').slice(0, 400) || null,
           String(m.emoji || '🧴').slice(0, 4),
           m.is_active !== false,
           manbaUrl(m.manba_url),
           manbaTuri(m.manba_url),
           Math.max(0, Math.min(50000, Number(m.ogirlik) || 0)),
           m.media_id || null]);

        // Rasmni mahsulotga bog'laymiz: keyin mahsulot o'chsa rasm ham o'chadi
        if (m.media_id) {
          await sorov('update media set product_id = $1 where id = $2', [r.id, m.media_id])
            .catch(() => {});
        }
        qoshildi.push(r);
      } catch (e) {
        xatolar.push({ nom,
          sabab: /duplicate key|products_brend_nom_uniq/i.test(e.message)
            ? 'Bunday mahsulot allaqachon bor' : 'Saqlanmadi' });
      }
    }
    katalogYangilandi();
    return ok(res, { qoshildi, xatolar });
  }

  if (yol === '/api/admin/product' && req.method === 'POST') {
    const b = await tana(req);
    const m = {
      name: String(b.name || '').trim().slice(0, 120),
      brand: String(b.brand || '').trim().slice(0, 60) || null,
      category_id: b.category_id ? Number(b.category_id) : null,
      step: b.step || null,
      price: Math.max(0, Number(b.price) || 0),
      old_price: b.old_price ? Number(b.old_price) : null,
      cost_price: Math.max(0, Number(b.cost_price) || 0),
      stock: Math.max(0, Number(b.stock) || 0),
      volume: String(b.volume || '').slice(0, 30) || null,
      country: String(b.country || 'KR').slice(0, 4),
      description: String(b.description || '').slice(0, 900) || null,
      usage_text: String(b.usage_text || '').slice(0, 900) || null,
      ingredients: String(b.ingredients || '').slice(0, 1200) || null,
      actives: (Array.isArray(b.actives) ? b.actives : []).slice(0, 12),
      concerns: (Array.isArray(b.concerns) ? b.concerns : []).slice(0, 10),
      skin_types: (Array.isArray(b.skin_types) ? b.skin_types : []).slice(0, 8),
      warnings: String(b.warnings || '').slice(0, 400) || null,
      emoji: String(b.emoji || '🧴').slice(0, 4),
      manba_url: manbaUrl(b.manba_url),
      manba: manbaTuri(b.manba_url),
      ogirlik: Math.max(0, Math.min(50000, Number(b.ogirlik) || 0)),
      ai_filled: Boolean(b.ai_filled),
      is_active: b.is_active !== false,
    };
    if (!m.name)  return xato(res, 400, 'Mahsulot nomi kerak.');
    if (!m.price) return xato(res, 400, 'Narx kerak.');

    const q = [m.name, m.brand, m.category_id, m.step, m.price, m.old_price, m.cost_price,
               m.stock, m.volume, m.country, m.description, m.usage_text, m.ingredients,
               m.actives, m.concerns, m.skin_types, m.warnings, m.emoji, m.ai_filled, m.is_active,
               m.manba_url, m.manba, m.ogirlik];
    try {
      const natija = b.id
        ? await qator(
            `update products set name=$1,brand=$2,category_id=$3,step=$4,price=$5,old_price=$6,
                    cost_price=$7,stock=$8,volume=$9,country=$10,description=$11,usage_text=$12,
                    ingredients=$13,actives=$14,concerns=$15,skin_types=$16,warnings=$17,
                    emoji=$18,ai_filled=$19,is_active=$20,manba_url=$21,manba=$22,
                    ogirlik=$23,updated_at=now()
              where id=$24 returning *`, [...q, b.id])
        : await qator(
            `insert into products (name,brand,category_id,step,price,old_price,cost_price,stock,
                    volume,country,description,usage_text,ingredients,actives,concerns,skin_types,
                    warnings,emoji,ai_filled,is_active,manba_url,manba,ogirlik)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
             returning *`, q);
      katalogYangilandi();
      return ok(res, { mahsulot: natija });
    } catch (e) {
      if (/duplicate key|products_brend_nom_uniq/i.test(e.message)) {
        return xato(res, 409, 'Bu brend va nom bilan mahsulot allaqachon bor. Mavjudini tahrirlang.');
      }
      throw e;
    }
  }

  if (yol === '/api/admin/product' && req.method === 'DELETE') {
    const b = await tana(req);
    const id = Number(b.id);
    if (!id) return xato(res, 400, 'id kerak.');

    // Ikki xil o'chirish:
    //   arxiv  — katalogdan yashiriladi, qaytarish mumkin (standart)
    //   to'liq — bazadan butunlay o'chadi, qaytarib bo'lmaydi
    // Buyurtma tarixi ikkalasida ham butun qoladi: mahsulot nomi va narxi
    // orders.items ichida nusxa bo'lib yotadi, products ga havola emas.
    if (b.toliq) {
      try {
        const r = await qiymat('select mahsulotni_ochir($1)', [id]);
        katalogYangilandi();
        return ok(res, { ok: true, toliq: true, natija: r });
      } catch (e) {
        if (/MAHSULOT_TOPILMADI/.test(e.message)) return xato(res, 404, 'Mahsulot topilmadi.');
        throw e;
      }
    }

    await sorov('update products set is_active=false where id=$1', [id]);
    katalogYangilandi();
    return ok(res, { ok: true, toliq: false });
  }

  // ================= POSTER =================
  // 1-qadam: AI bir necha g'oya taklif qiladi
  if (yol === '/api/admin/poster-ideas' && req.method === 'POST') {
    const b = await tana(req);
    const rasm = rasmniOl(b.image);
    if (!rasm) return xato(res, 400, 'Rasm yuborilmadi.');
    try {
      const goyalar = await posterGoyalari(rasm.base64, b.mime || rasm.mime, b.mahsulot || {});
      if (!goyalar.length) return xato(res, 502, 'AI g‘oya taklif qila olmadi. Qayta urinib ko‘ring.');
      return ok(res, { goyalar, nisbatlar: NISBATLAR });
    } catch (e) {
      return xato(res, 502, e.message === 'GEMINI_KALIT_YOQ'
        ? 'GEMINI_API_KEY sozlanmagan — poster generatsiyasi ishlamaydi.'
        : 'G‘oyalarni tayyorlab bo‘lmadi. Qayta urinib ko‘ring.');
    }
  }

  // 2-qadam: tanlangan g'oyani chizish va saqlash
  if (yol === '/api/admin/poster-generate' && req.method === 'POST') {
    const b = await tana(req);
    const rasm = rasmniOl(b.image);
    if (!b.prompt) return xato(res, 400, 'G‘oya tanlanmagan.');
    try {
      const chizilgan = await posterChiz({
        base64: rasm?.base64, mime: rasm?.mime,
        prompt: String(b.prompt).slice(0, 2000),
        nisbat: b.nisbat, matn_bosh: b.matn_bosh, matn_qosh: b.matn_qosh,
      });
      const bayt = Buffer.from(chizilgan.base64, 'base64');
      if (bayt.length > 6 * 1024 * 1024) return xato(res, 413, 'Chizilgan rasm juda katta.');

      const saqlangan = await qator(
        `insert into media (tur, mime, bayt, hajm, nisbat, product_id, prompt, goya)
         values ('poster',$1,$2,$3,$4,$5,$6,$7) returning id, nisbat, hajm, created_at`,
        [chizilgan.mime, bayt, bayt.length, b.nisbat || '4:5',
         b.product_id ? Number(b.product_id) : null,
         String(b.prompt).slice(0, 2000), String(b.goya || '').slice(0, 120)]);

      return ok(res, { poster: { ...saqlangan, url: `/media/${saqlangan.id}` } });
    } catch (e) {
      console.error('Poster xatosi:', e.message);
      return xato(res, 502, e.message.slice(0, 200));
    }
  }

  // Mahsulotning posterlari
  if (yol === '/api/admin/posters' && req.method === 'GET') {
    const id = Number(new URL(req.url, 'http://x').searchParams.get('product_id'));
    if (!id) return xato(res, 400, 'product_id kerak.');
    const [posterlar, mahsulot] = await Promise.all([
      qatorlar(`select id, nisbat, hajm, goya, created_at from media
                 where product_id=$1 and tur='poster' order by created_at desc`, [id]),
      qator('select poster_id from products where id=$1', [id]),
    ]);
    return ok(res, {
      posterlar: posterlar.map((p) => ({ ...p, url: `/media/${p.id}`, tanlangan: p.id === mahsulot?.poster_id })),
    });
  }

  // Qaysi poster katalogda ko'rinishi
  if (yol === '/api/admin/poster-select' && req.method === 'POST') {
    const b = await tana(req);
    await sorov('update products set poster_id=$1, updated_at=now() where id=$2',
                [b.poster_id || null, Number(b.product_id)]);
    katalogYangilandi();
    return ok(res, { ok: true });
  }

  if (yol === '/api/admin/poster' && req.method === 'DELETE') {
    const b = await tana(req);
    await sorov('delete from media where id=$1', [b.id]);
    return ok(res, { ok: true });
  }

  // ================= FOYDALANUVCHILAR =================
  // Mijozlarni filtrlash — marketing uchun.
  // «Kim qancha savdo qildi va qachon» — cold call ro'yxatini shu yerdan
  // olamiz: summa oralig'i, oxirgi xarid sanasi, buyurtmalar soni.
  if (yol === '/api/admin/users' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const p = url.searchParams;
    const qidiruv = (p.get('q') || '').trim();
    const limit = Math.min(2000, Number(p.get('limit')) || 200);

    // DIQQAT: Number(null) === 0. Bo'sh parametrni 0 deb qabul qilsak,
    // filtr qo'yilmaganda ham «jami <= 0» shartiga tushib, ro'yxat bo'sh
    // qolardi. Shuning uchun avval "berilganmi?" deb tekshiramiz.
    const son = (nom) => {
      const xom = p.get(nom);
      if (xom === null || String(xom).trim() === '') return null;
      const v = Number(xom);
      return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
    };
    const sana = (nom) => (/^\d{4}-\d{2}-\d{2}$/.test(p.get(nom) || '') ? p.get(nom) : null);

    const xaridDan = son('xarid_dan');       // shundan ko'p xarid qilganlar
    const xaridGacha = son('xarid_gacha');
    const buyurtmaDan = son('buyurtma_dan'); // shundan ko'p buyurtma bergani
    const oxirgiDan = sana('oxirgi_dan');    // oxirgi xaridi shu sanadan keyin
    const oxirgiGacha = sana('oxirgi_gacha');// ...shu sanagacha (uxlab qolganlar)

    // «Faqat xaridorlar» — hech narsa sotib olmaganlarni chiqarmaslik
    const faqatXaridor = p.get('xaridor') === '1';

    const TARTIB = {
      yangi:      'u.created_at desc nulls last',
      xarid:      'jami_xarid desc',
      buyurtma:   'buyurtma_soni desc',
      oxirgi:     'oxirgi_xarid desc nulls last',
      faol:       'u.last_active desc nulls last',
    };
    const tartib = TARTIB[p.get('tartib')] || TARTIB.yangi;

    // Shartlarni raqamlangan parametrlar bilan yig'amiz
    const arg = [limit];
    const shart = [];
    const q = (v) => { arg.push(v); return '$' + arg.length; };

    if (qidiruv) {
      const t = q(`%${qidiruv}%`);
      shart.push(`(u.full_name ilike ${t} or u.phone ilike ${t} or u.username ilike ${t})`);
    }
    // coalesce shart: left join tufayli xarid qilmaganda x.jami NULL bo'ladi,
    // NULL esa hech qanday solishtiruvga tushmaydi — «0 dan 0 gacha», ya'ni
    // «hali sotib olmaganlar» segmenti bo'sh chiqardi.
    if (xaridDan    != null) shart.push(`coalesce(x.jami, 0) >= ${q(xaridDan)}`);
    if (xaridGacha  != null) shart.push(`coalesce(x.jami, 0) <= ${q(xaridGacha)}`);
    if (buyurtmaDan != null) shart.push(`coalesce(x.soni, 0) >= ${q(buyurtmaDan)}`);
    // Sana chegaralari Toshkent vaqtida — admin ko'rgan sana bilan bir xil
    if (oxirgiDan)   shart.push(`(x.oxirgi at time zone 'Asia/Tashkent')::date >= ${q(oxirgiDan)}::date`);
    if (oxirgiGacha) shart.push(`(x.oxirgi at time zone 'Asia/Tashkent')::date <= ${q(oxirgiGacha)}::date`);
    if (faqatXaridor) shart.push('coalesce(x.soni, 0) > 0');

    const users = await qatorlar(
      `with x as (
         select o.user_id,
                coalesce(sum(o.total), 0)::bigint as jami,
                count(*)::int                     as soni,
                max(o.created_at)                 as oxirgi,
                min(o.created_at)                 as birinchi
           from orders o where o.status <> 'bekor'
          group by o.user_id)
       select u.id, u.telegram_id, u.username, u.full_name, u.phone, u.age, u.address,
              u.viloyat, u.tuman,
              u.agreed_at, u.is_blocked, u.created_at, u.last_active,
              coalesce(x.jami, 0)::bigint as jami_xarid,
              coalesce(x.soni, 0)::int    as buyurtma_soni,
              x.oxirgi                    as oxirgi_xarid,
              x.birinchi                  as birinchi_xarid,
              case when coalesce(x.soni, 0) > 0
                   then (coalesce(x.jami, 0) / x.soni)::bigint end as ortacha_chek
         from users u
         left join x on x.user_id = u.id
        ${shart.length ? 'where ' + shart.join(' and ') : ''}
        order by ${tartib}
        limit $1`, arg);

    // Ro'yxatning umumiy ko'rsatkichi — «shu segment qancha pul olib keladi»
    const jami = users.reduce((s, u) => s + Number(u.jami_xarid || 0), 0);
    return ok(res, {
      users,
      xulosa: {
        soni: users.length,
        jami_xarid: jami,
        xaridorlar: users.filter((u) => u.buyurtma_soni > 0).length,
        ortacha: users.length ? Math.round(jami / users.length) : 0,
      },
    });
  }

  if (yol === '/api/admin/user-block' && req.method === 'POST') {
    const b = await tana(req);
    await sorov('update users set is_blocked=$1 where id=$2', [Boolean(b.blocked), b.id]);
    return ok(res, { ok: true });
  }

  // ================= SOTUVLAR =================
  if (yol === '/api/admin/sales' && req.method === 'GET') {
    const oy = (new URL(req.url, 'http://x').searchParams.get('oy') || '').trim();  // 2026-08
    return ok(res, await sotuvlar(/^\d{4}-\d{2}$/.test(oy) ? oy : ''));
  }

  // Oylik hisobot: to'liq daromad, tannarx, yetkazish, sof foyda
  if (yol === '/api/admin/oylik' && req.method === 'GET') {
    return ok(res, { oylar: await oylikHisobot() });
  }

  // Sotuvlar tarixini tozalash — noldan boshlash
  if (yol === '/api/admin/sales-reset' && req.method === 'POST') {
    const b = await tana(req);
    // Tasodifan bosilmasin: aniq so'z yozilishi kerak
    if (String(b.tasdiq || '').trim().toUpperCase() !== 'TOZALASH') {
      return xato(res, 400, 'Tasdiqlash so‘zi noto‘g‘ri.');
    }
    const oldin = await qator(
      `select count(*)::int as soni, coalesce(sum(total),0)::bigint as summa from orders`);

    await tranzaksiya(async (mijoz) => {
      // Bog'liq yozuvlar avval — tashqi kalitlar buzilmasin
      await mijoz.query(`update orders set partiya_id = null, receipt_id = null`);
      await mijoz.query(`delete from media where tur = 'chek'`);
      await mijoz.query(`delete from orders`);
      await mijoz.query(`delete from partiyalar`);
      if (b.hodisalar) await mijoz.query(`delete from events where type in ('order','add_cart')`);
      // Raqamlash ham noldan
      await mijoz.query(`alter sequence order_no_seq restart with 1`).catch(() => {});
      await mijoz.query(`alter sequence partiya_seq  restart with 1`).catch(() => {});
    });

    keshniTashla();
    return ok(res, { ochirildi: oldin.soni, summa: Number(oldin.summa) });
  }

  // ================= XABAR SHABLONLARI =================
  if (yol === '/api/admin/templates' && req.method === 'GET') {
    const r = await qatorlar(
      `select key, value from settings
        where key like 'xabar\\_%' or key like 'blok\\_%' or key like 'ogohlantirish\\_%'`);
    const joriy = Object.fromEntries(r.map((x) => [x.key, String(x.value ?? '')]));
    return ok(res, { joriy, standart: STANDART, guruhlar: GURUHLAR, tavsif: TAVSIF });
  }

  if (yol === '/api/admin/templates' && req.method === 'POST') {
    const b = await tana(req);
    const yozildi = [];
    for (const [kalit, matn] of Object.entries(b.templates || {})) {
      // Faqat ma'lum shablonlar — tasodifiy sozlama yozib qo'yilmasin
      if (!Object.hasOwn(STANDART, kalit)) continue;
      await sorov(
        `insert into settings (key, value, updated_at) values ($1, to_jsonb($2::text), now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [kalit, String(matn ?? '').slice(0, 4000)]);
      yozildi.push(kalit);
    }
    keshniTozala();
    return ok(res, { ok: true, yozildi: yozildi.length });
  }

  // Majburiy kanal to'g'ri sozlanganmi: bot admin bo'lganmi, havola bormi
  if (yol === '/api/admin/obuna-sinov' && req.method === 'POST') {
    const kanal = String(await sozlama('majburiy_kanal', '') || '').replace(/"/g, '').trim();
    if (!kanal) return ok(res, { holat: 'yoq', xabar: 'Majburiy obuna o‘chiq' });

    const chat = await tg('getChat', { chat_id: kanal });
    if (!chat?.ok) {
      return ok(res, { holat: 'xato', kanal,
        xabar: `Kanal topilmadi: ${chat?.description || 'nomaʼlum'}. ` +
               'Botni kanalga ADMIN qilib qo‘shing.' });
    }

    // Bot a'zolikni tekshira olishi uchun admin bo'lishi shart
    const men = await tg('getMe');
    const azolik = men?.ok
      ? await tg('getChatMember', { chat_id: kanal, user_id: men.result.id })
      : null;
    const botAdmin = ['administrator', 'creator'].includes(azolik?.result?.status);

    const { havolaKeshiniTashla } = await import('../services/majburiy-kanal.js');
    await havolaKeshiniTashla(kanal);
    const qolda = String(await sozlama('majburiy_kanal_havola', '') || '').replace(/"/g, '').trim();

    let havola = qolda;
    let manba = 'qo‘lda yozilgan';
    if (!havola && chat.result.username) {
      havola = `https://t.me/${chat.result.username}`; manba = 'kanal nomidan';
    }
    if (!havola && chat.result.invite_link) {
      havola = chat.result.invite_link; manba = 'kanalning taklif havolasi';
    }
    if (!havola && botAdmin) {
      const y = await tg('createChatInviteLink', { chat_id: kanal, name: 'Bot orqali obuna' });
      if (y?.ok) { havola = y.result.invite_link; manba = 'bot yaratdi'; }
    }

    return ok(res, {
      holat: havola && botAdmin ? 'ok' : 'xato',
      kanal, nom: chat.result.title || '', bot_admin: botAdmin, havola, manba,
      xabar: !botAdmin
        ? 'Bot kanalda ADMIN emas — a’zolikni tekshira olmaydi.'
        : havola
          ? `Tayyor: ${chat.result.title || kanal}`
          : 'Havola topilmadi. Kanal sozlamalarida taklif havolasini yarating ' +
            'yoki uni qo‘lda yozing.',
    });
  }

  // Tarif sinovi — narx to'g'ri hisoblanayaptimi
  if (yol === '/api/admin/tarif-sinov' && req.method === 'POST') {
    const { variantlar } = await import('../services/yetkazish.js');
    const { MASOFA_IZOH } = await import('../lib/emu-tarif.js');
    const jonatuvchi = String(await sozlama('jonatuvchi_viloyat', 'Toshkent shahri')).replace(/"/g, '');

    // Har viloyatdan bittadan namuna — markaz shahri
    const namunalar = [
      ['Toshkent shahri', 'Chilonzor tumani'],
      ['Toshkent viloyati', 'Nurafshon'],
      ['Samarqand viloyati', 'Samarqand'],
      ['Samarqand viloyati', 'Urgut tumani'],
      ['Farg‘ona viloyati', 'Farg‘ona'],
      ['Buxoro viloyati', 'Buxoro'],
      ['Xorazm viloyati', 'Urganch'],
      ['Qoraqalpog‘iston Respublikasi', 'Nukus'],
    ];
    const qatorlarSinov = [];
    for (const [viloyat, tuman] of namunalar) {
      const v = await variantlar({ items: [], viloyat, tuman });
      qatorlarSinov.push({
        viloyat, tuman,
        zona: v.filial.izoh?.zona ?? '—',
        masofa: MASOFA_IZOH[v.filial.izoh?.masofa] || '—',
        filial: v.filial.narx, uy: v.uy.narx,
      });
    }
    return ok(res, { jonatuvchi, qatorlar: qatorlarSinov });
  }

  // Brend logotipi
  if (yol === '/api/admin/logo' && req.method === 'POST') {
    const b = await tana(req);
    const r = rasmniOl(b.image);
    if (!r) return xato(res, 400, 'Rasm yuborilmadi yoki juda katta.');

    const bayt = Buffer.from(r.base64, 'base64');
    const m = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('logo', $1, $2, $3, 'Brend logotipi') returning id`,
      [r.mime, bayt, bayt.length]);

    // Eskisini o'chiramiz — bazada bir nechta logotip yotmasin
    const eski = String(await sozlama('brend_rasm_id', '') || '').replace(/"/g, '');
    await sorov(
      `insert into settings (key, value, updated_at) values ('brend_rasm_id', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify(m.id)]);
    if (eski && eski !== m.id) await sorov('delete from media where id = $1', [eski]).catch(() => {});

    keshniTashla('brend-logo');
    return ok(res, { id: m.id });
  }

  // «Yuz skaneri» ekranidagi NAMUNA surat.
  // Odam qanday rasm kutilayotganini o'qib emas, KO'RIB tushunadi —
  // shuning uchun to'g'ri va noto'g'ri rasmni ko'rsatgan yaxshiroq.
  if (yol === '/api/admin/skaner-namuna' && req.method === 'POST') {
    const b = await tana(req);
    const r = rasmniOl(b.image);
    if (!r) return xato(res, 400, 'Rasm yuborilmadi yoki juda katta.');

    const bayt = Buffer.from(r.base64, 'base64');
    const m = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('namuna', $1, $2, $3, 'Skaner namunasi') returning id`,
      [r.mime, bayt, bayt.length]);

    const eski = String(await sozlama('skaner_namuna_id', '') || '').replace(/"/g, '');
    await sorov(
      `insert into settings (key, value, updated_at) values ('skaner_namuna_id', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify(m.id)]);
    if (eski && eski !== m.id) await sorov('delete from media where id = $1', [eski]).catch(() => {});

    katalogYangilandi();
    return ok(res, { id: m.id });
  }

  if (yol === '/api/admin/skaner-namuna' && req.method === 'DELETE') {
    const eski = String(await sozlama('skaner_namuna_id', '') || '').replace(/"/g, '');
    await sorov(`update settings set value = '""'::jsonb, updated_at = now()
                  where key = 'skaner_namuna_id'`);
    if (eski) await sorov('delete from media where id = $1', [eski]).catch(() => {});
    katalogYangilandi();
    return ok(res, { ok: true });
  }

  // ================= MARKETPLACE =================
  // Daiso / Coupang dan mahsulotni olish. Havola beriladi, server sahifani
  // o'qiydi, AI kartochkani to'ldiradi, narx qoida bo'yicha hisoblanadi.
  // Tasdiqlanmagan narsa katalogga TUSHMAYDI.
  if (yol === '/api/admin/marketplace' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const holat = url.searchParams.get('holat') || '';
    const [ro, hi, sozlash] = await Promise.all([
      mp.royxat(holat, 200), mp.hisob(), mp.sozlamalar(),
    ]);
    return ok(res, {
      royxat: ro,
      hisob: Object.fromEntries(hi.map((x) => [x.holat, x.soni])),
      sozlama: sozlash,
    });
  }

  // Havolalar ro'yxatini olish. Sahifalar KETMA-KET o'qiladi: bir vaqtda
  // o'nta so'rov yuborsak do'kon bizni bot deb bloklaydi.
  if (yol === '/api/admin/marketplace/olish' && req.method === 'POST') {
    const b = await tana(req);
    const xom = Array.isArray(b.havolalar) ? b.havolalar
      : String(b.havolalar || '').split(/[\s,]+/);
    const havolalar = xom.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
    if (!havolalar.length) return xato(res, 400, 'Havola yuborilmadi.');

    const natijalar = [];
    for (const h of havolalar) {
      try {
        // adminId yozilmaydi: panel tokeni foydalanuvchi id sini olib
        // yurmaydi, uni bu yerda o'ylab topgandan ko'ra bo'sh qoldirgan yaxshi
        natijalar.push(await mp.havoladanOl(h));
      } catch (e) {
        natijalar.push({ manba_url: h, holat: 'xato', sabab: e.message });
      }
    }
    return ok(res, { natijalar });
  }

  // Katalog sahifasidan mahsulot havolalarini topish
  if (yol === '/api/admin/marketplace/qidir' && req.method === 'POST') {
    const b = await tana(req);
    const url = mp.havolaTogrimi(b.url);
    if (!url) return xato(res, 400, 'Havola noto‘g‘ri.');
    try {
      const { html, url: oxirgi } = await mp.sahifaniOl(url);
      const havolalar = mp.mahsulotHavolalari(html, oxirgi,
        Math.min(40, Number(b.limit) || 20));
      return ok(res, { havolalar });
    } catch (e) {
      return xato(res, 502, e.message);
    }
  }

  // Agent topshirig'i: bo'lim havolasini berib qo'yiladi, qolganini o'zi qiladi
  if (yol === '/api/admin/marketplace/agent' && req.method === 'POST') {
    const b = await tana(req);
    try {
      return ok(res, await mp.agentYigish(b.url, { limit: Number(b.limit) || 10 }));
    } catch (e) {
      return xato(res, e.turi === 'havola' ? 400 : 502, e.message);
    }
  }

  if (yol === '/api/admin/marketplace/tasdiq' && req.method === 'POST') {
    const b = await tana(req);
    try {
      return ok(res, { mahsulot: await mp.tasdiqla(Number(b.id), b.ozgarish || {}) });
    } catch (e) {
      if (/duplicate key|products_brend_nom_uniq/i.test(e.message)) {
        return xato(res, 409, 'Bu brend va nom bilan mahsulot allaqachon bor.');
      }
      return xato(res, 400, e.message);
    }
  }

  if (yol === '/api/admin/marketplace/rad' && req.method === 'POST') {
    const b = await tana(req);
    await mp.radEt(Number(b.id), b.sabab);
    return ok(res, { ok: true });
  }

  if (yol === '/api/admin/marketplace' && req.method === 'DELETE') {
    const b = await tana(req);
    await mp.ochir(Number(b.id));
    return ok(res, { ok: true });
  }

  // Narxni qayta hisoblash — admin og'irlik yoki tannarxni o'zgartirganda
  if (yol === '/api/admin/marketplace/narx' && req.method === 'POST') {
    const b = await tana(req);
    const s = await mp.sozlamalar();
    return ok(res, {
      narx: narxHisobla({
        krw: b.krw != null ? Number(b.krw) : undefined,
        tannarx: Number(b.tannarx) || 0,
        gramm: Number(b.gramm) || 0,
      }, s.qoida),
      qoida: s.qoida,
    });
  }

  // ── Ommaviy import (fon vazifasi) ──
  if (yol === '/api/admin/marketplace/vazifa' && req.method === 'GET') {
    const [joriy, tarix] = await Promise.all([mpv.joriyVazifa(), mpv.vazifalar(5)]);
    return ok(res, { joriy, tarix });
  }

  if (yol === '/api/admin/marketplace/vazifa' && req.method === 'POST') {
    const b = await tana(req);
    try {
      return ok(res, { vazifa: await mpv.vazifaBoshla({
        havolalar: b.havolalar,
        sahifadan: b.sahifadan,
        sahifagacha: b.sahifagacha,
        maqsad: b.maqsad,
        kechikish: b.kechikish,
        avtoTasdiq: b.avto_tasdiq,
      }) });
    } catch (e) {
      return xato(res, e.turi === 'band' ? 409 : 400, e.message);
    }
  }

  if (yol === '/api/admin/marketplace/vazifa/toxtat' && req.method === 'POST') {
    const b = await tana(req);
    await mpv.vazifaToxtat(Number(b.id) || null);
    return ok(res, { toxtatildi: true });
  }

  // Navbatdagi hammasini katalogga
  if (yol === '/api/admin/marketplace/tasdiq-hammasi' && req.method === 'POST') {
    const b = await tana(req);
    return ok(res, await mp.hammasiniTasdiqla(Number(b.limit) || 500));
  }

  // Do'kon API qoidalari — saqlash va sinash
  if (yol === '/api/admin/marketplace/api' && req.method === 'POST') {
    const b = await tana(req);
    let xom = b.qoidalar;
    if (typeof xom === 'string') {
      try { xom = JSON.parse(xom); }
      catch (e) { return xato(res, 400, `JSON xato: ${e.message}`); }
    }
    if (!Array.isArray(xom)) return xato(res, 400, 'Qoidalar massiv bo‘lishi kerak.');
    return ok(res, { qoidalar: await mp.apiSaqla(xom) });
  }

  if (yol === '/api/admin/marketplace/api-sinov' && req.method === 'POST') {
    const b = await tana(req);
    try {
      return ok(res, await mp.apiSinovi(b.url));
    } catch (e) {
      return xato(res, 400, e.message);
    }
  }

  // Kanal ID to'g'rimi va bot unga yoza oladimi
  if (yol === '/api/admin/kanal-sinov' && req.method === 'POST') {
    const [buyurtma, tahlil] = await Promise.all([
      kanalniSina('kanal_buyurtma').catch((e) => ({ holat: 'xato', xabar: e.message })),
      kanalniSina('kanal_tahlil').catch((e) => ({ holat: 'xato', xabar: e.message })),
    ]);
    return ok(res, { buyurtma, tahlil });
  }

  // ================= SOZLAMALAR =================
  if (yol === '/api/admin/settings' && req.method === 'GET') {
    const r = await qatorlar('select key, value from settings');
    const settings = Object.fromEntries(r.map((s) => [s.key, s.value]));
    return ok(res, {
      settings,
      // Mavzu tanlash uchun: tayyor to'plamlar va hozirgi palitra
      mavzu_toplamlar: TOPLAMLAR,
      mavzu: palitra(settings.mavzu && typeof settings.mavzu === 'object' ? settings.mavzu : {}),
    });
  }
  // Mavzu — ranglar tekshiriladi va palitra qaytariladi.
  // Alohida yo'l: sozlamalar bilan birga yuborilsa ham noto'g'ri rang
  // bazaga tushib, ilova o'qib bo'lmaydigan holga kelmasligi kerak.
  if (yol === '/api/admin/mavzu' && req.method === 'POST') {
    const b = await tana(req);
    const toza = {
      asosiy: rangTozala(b.asosiy, MAVZU_STANDART.asosiy),
      fon:    rangTozala(b.fon,    MAVZU_STANDART.fon),
      urgu:   rangTozala(b.urgu,   b.asosiy || MAVZU_STANDART.urgu),
    };
    await sorov(
      `insert into settings (key, value, updated_at) values ('mavzu', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify(toza)]);
    katalogYangilandi();
    return ok(res, { mavzu: toza, palitra: palitra(toza) });
  }

  if (yol === '/api/admin/settings' && req.method === 'POST') {
    const b = await tana(req);
    for (const [key, value] of Object.entries(b.settings || {})) {
      await sorov(
        `insert into settings (key, value, updated_at) values ($1,$2,now())
         on conflict (key) do update set value=excluded.value, updated_at=now()`,
        [key, JSON.stringify(value)]);
    }
    keshniTozala();          // yangi bot matni darhol kuchga kirsin
    katalogYangilandi();     // narx/karta/menejer sozlamalari ham
    keshniTashla('brend');       // brend nomi ham
    keshniTashla('brend-logo');       // logotip ham
    keshniTashla('yetkazish-sozlama'); // tarif ham
    return ok(res, { ok: true });
  }

  return xato(res, 404, 'Topilmadi');
}

// ---------- Yordamchilar ----------
/** Faqat http(s) havolasini qabul qilamiz — javascript: kabi narsa o'tmasin. */
function manbaUrl(xom) {
  const u = String(xom || '').trim().slice(0, 500);
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : null;
}

/** Havoladan manbani taniymiz — /orders ro'yxatida belgi qo'yish uchun. */
function manbaTuri(xom) {
  const u = String(xom || '').toLowerCase();
  if (/coupang\./.test(u)) return 'coupang';
  if (/daiso/.test(u))      return 'daiso';
  return u ? 'boshqa' : null;
}

function rasmniOl(qiymat) {
  const xom = String(qiymat || '');
  const mos = xom.match(/^data:(image\/\w+);base64,(.+)$/s);
  const base64 = mos ? mos[2] : xom;
  if (!base64 || base64.length < 500) return null;
  if (base64.length > 12 * 1024 * 1024) return null;
  return { base64, mime: mos ? mos[1] : 'image/jpeg' };
}

// ============================================================
// TIZIM TEKSHIRUVI
// ============================================================
async function tizimTekshir() {
  const natija = [];
  const qadam = async (nom, izoh, ish) => {
    const boshlandi = Date.now();
    try {
      const j = await ish();
      natija.push({ nom, izoh, holat: 'ok', xabar: j || 'ishlayapti', ms: Date.now() - boshlandi });
    } catch (e) {
      const x = xatoniTushuntir(e);
      natija.push({ nom, izoh, holat: 'xato', xabar: x.log, ms: Date.now() - boshlandi });
    }
  };

  await qadam('Ma’lumotlar bazasi', 'Supabase session pooler', async () => {
    const r = await qator('select count(*)::int as n from products');
    return `ulanish bor · ${r.n} ta mahsulot`;
  });

  await qadam('Telegram bot', 'BOT_TOKEN to‘g‘rimi', async () => {
    const r = await tg('getMe');
    if (!r.ok) throw new Error(r.description || 'getMe muvaffaqiyatsiz');
    return `@${r.result.username} (${r.result.first_name})`;
  });

  await qadam('Telegram webhook', 'Xabarlar yetib kelyaptimi', async () => {
    const r = await tg('getWebhookInfo');
    if (!r.ok) throw new Error(r.description || 'getWebhookInfo muvaffaqiyatsiz');
    const w = r.result || {};
    // Telegram oxirgi xatoni shu yerda saqlaydi — bot jim qolsa sabab shu
    if (w.last_error_message) {
      throw new Error(`Telegram oxirgi xato: ${w.last_error_message} (${w.last_error_date
        ? new Date(w.last_error_date * 1000).toLocaleString('uz-UZ') : '—'})`);
    }
    if (!w.url) return 'webhook yo‘q — long-polling rejimi';
    return `${w.url.slice(0, 44)}… · navbatda ${w.pending_update_count || 0} ta`;
  });

  await qadam('AI provayderi', 'Qaysi orqali ishlaydi', async () => {
    const p = provayder();
    if (p.nom === 'yoq') throw Object.assign(new Error('Kalit yo‘q'), { turkum: 'kalit' });
    const zaxira = openrouterBormi() && googleBormi() ? ' · zaxira: Google' : '';
    return `${p.nom} · ${p.model}${zaxira}`;
  });

  await qadam('AI javob berishi', 'Haqiqiy chaqiruv', async () => {
    if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });
    const boshlandi = Date.now();
    const j = await aiJson(
      [{ text: 'Javob JSON: {"ok": true}' }],
      { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      { maxTokens: 2048, timeoutMs: 30000 });
    return `javob berdi (${Date.now() - boshlandi} ms): ${JSON.stringify(j).slice(0, 40)}`;
  });

  await qadam('Natija rasmi', 'Tahlilni rasm qilib chizish', async () => {
    const r = await rasmChizaOlamizmi();
    if (!r.ha) throw new Error(r.sabab);
    // Haqiqiy chizish: shrift yo'q bo'lsa rasm bo'sh chiqadi, buni bilib turaylik
    const bayt = await svgdanPng(
      natijaSvg({ rasmBase64: null, tahlil: { ball: 70, teri_turi: 'aralash', muammolar: [] },
                  tavsiyalar: [], brend: await brendNomi() }), 400);
    if (bayt.length < 1000) throw new Error('Rasm chizildi, lekin bo‘sh chiqdi');
    return `chizildi (${(bayt.length / 1024).toFixed(0)} KB)`;
  });

  await qadam('Buyurtmalar kanali', 'Telegram kanal', async () => {
    const k = String(await sozlama('kanal_buyurtma', '') || '');
    if (!k) throw new Error('Sozlanmagan — buyurtmalar kanalga tushmaydi');
    return k;
  });

  await qadam('Mini App manzili', 'PUBLIC_URL', async () => {
    if (!config.publicUrl) throw new Error('PUBLIC_URL sozlanmagan — Mini App tugmalari chiqmaydi');
    return config.publicUrl;
  });

  await qadam('Sozlamalar', 'To‘lov va aloqa', async () => {
    const r = await qatorlar(
      `select key, value from settings
        where key in ('karta_raqami','konsultatsiya_user','menejer_telefon')`);
    const m = Object.fromEntries(r.map((x) => [x.key, String(x.value ?? '').replace(/"/g, '')]));
    const yoq = [];
    if (!m.karta_raqami || /^8600 0000/.test(m.karta_raqami)) yoq.push('karta raqami');
    if (!m.konsultatsiya_user) yoq.push('menejer username');
    if (!m.menejer_telefon)    yoq.push('menejer telefoni');
    if (yoq.length) throw new Error(`To‘ldirilmagan: ${yoq.join(', ')}`);
    return 'hammasi to‘ldirilgan';
  });

  return natija;
}

// ============================================================
// BOSHQARUV PANELI: KPI + DAROMAD PROGNOZI
// ============================================================
async function boshqaruvPaneli() {
  // Og'ir hisoblar bazada — Node'ga faqat natija keladi
  const [umumiy, oy, holatlar, kunlar, voronka, ombor, users] = await Promise.all([
    qator(`select coalesce(sum(total),0)::bigint      as daromad,
                  coalesce(sum(cost_total),0)::bigint as tannarx,
                  count(*)::int                    as soni
             from orders where status <> 'bekor'`),
    qator(`select coalesce(sum(total),0)::bigint as daromad, count(*)::int as soni
             from orders
            where status <> 'bekor' and created_at >= date_trunc('month', now())`),
    qatorlar(`select status, count(*)::int as soni, coalesce(sum(total),0)::bigint as summa
                from orders group by status`),
    qatorlar(`select to_char(d.kun,'YYYY-MM-DD') as kun,
                     coalesce(sum(o.total),0)::bigint as daromad,
                     count(o.id)::int as soni
                from generate_series(current_date - interval '13 days', current_date, '1 day') d(kun)
                left join orders o
                  on o.created_at::date = d.kun and o.status <> 'bekor'
               group by d.kun order by d.kun`),
    qatorlar(`select type, count(*)::int as soni from events
               where created_at >= now() - interval '30 days' group by type`),
    qator(`select count(*) filter (where is_active)::int                          as jami,
                  count(*) filter (where is_active and stock = 0)::int             as tugagan,
                  count(*) filter (where is_active and stock between 1 and 5)::int as kam,
                  coalesce(sum(stock * cost_price),0)::bigint                      as qiymat
             from products`),
    qator(`select count(*)::int as jami, count(agreed_at)::int as royxatdan_otgan from users`),
  ]);

  const h = (nom) => holatlar.find((x) => x.status === nom) || { soni: 0, summa: 0 };
  const yetkazildi = h('yetkazildi').soni;
  const bekor = h('bekor').soni;
  const yakunlangan = yetkazildi + bekor;

  // Tarix kam bo'lsa ehtiyotkor bahodan boshlaymiz (Laplas tuzatishi)
  const tugallanishEhtimoli = yakunlangan < 10
    ? (yetkazildi + 7) / (yakunlangan + 10)
    : yetkazildi / yakunlangan;

  const KOEF = { yangi: 0.75, tasdiqlangan: 0.9, yolda: 0.97 };
  const kutilayotgan = ['yangi', 'tasdiqlangan', 'yolda'].map(h);
  const kutilayotganSoni  = kutilayotgan.reduce((s, x) => s + x.soni, 0);
  const kutilayotganSumma = kutilayotgan.reduce((s, x) => s + x.summa, 0);
  const kutilma = ['yangi', 'tasdiqlangan', 'yolda']
    .reduce((s, k) => s + h(k).summa * KOEF[k] * tugallanishEhtimoli, 0);

  const bugun = new Date();
  const oyKunlari = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0).getDate();
  const otganKunlar = bugun.getDate();
  const qolganKunlar = oyKunlari - otganKunlar;
  const kunlikOrtacha = otganKunlar ? oy.daromad / otganKunlar : 0;

  const v = (t) => voronka.find((x) => x.type === t)?.soni || 0;

  return {
    kpi: {
      jami_daromad:    umumiy.daromad,
      yalpi_foyda:     umumiy.daromad - umumiy.tannarx,
      marja_foiz:      umumiy.daromad ? Math.round(((umumiy.daromad - umumiy.tannarx) / umumiy.daromad) * 100) : 0,
      buyurtma_soni:   umumiy.soni,
      ortacha_chek:    umumiy.soni ? Math.round(umumiy.daromad / umumiy.soni) : 0,
      foydalanuvchi:   users.jami,
      royxatdan_otgan: users.royxatdan_otgan,
      oy_daromadi:     oy.daromad,
      yangi_buyurtma:  h('yangi').soni,
    },
    prognoz: {
      tugallanish_ehtimoli: Math.round(tugallanishEhtimoli * 100),
      kutilayotgan_soni:    kutilayotganSoni,
      kutilayotgan_summa:   kutilayotganSumma,
      kutilayotgan_kutilma: Math.round(kutilma),
      kunlik_ortacha:       Math.round(kunlikOrtacha),
      qolgan_kunlar:        qolganKunlar,
      oy_oxiri_prognoz:     Math.round(oy.daromad + kunlikOrtacha * qolganKunlar * tugallanishEhtimoli),
      izoh: yakunlangan < 10
        ? 'Tarix kam (10 tadan kam yakunlangan buyurtma) — prognoz taxminiy.'
        : `${yakunlangan} ta yakunlangan buyurtma tarixiga asoslangan.`,
    },
    voronka: {
      start: v('start'), register: v('register'), scan: v('scan'),
      scan_rejected: v('scan_rejected'), add_cart: v('add_cart'), order: v('order'),
    },
    kunlar,
    ombor,
  };
}

// ============================================================
/**
 * Oylik hisobot: har oy uchun to'liq daromad, tannarx, yetkazish va SOF FOYDA.
 *
 * Sof foyda = mahsulot daromadi − tannarx − chegirma.
 * Yetkazish alohida ko'rsatiladi: u bizning daromadimiz emas, pochtaga
 * o'tadi (ustama qo'ygan bo'lsangiz farqi foydaga kiradi).
 */
async function oylikHisobot() {
  return qatorlar(`
    select to_char(created_at at time zone 'Asia/Tashkent', 'YYYY-MM') as oy,
           count(*)::int                                    as buyurtma,
           count(distinct user_id)::int                     as mijoz,
           coalesce(sum(subtotal), 0)::bigint               as mahsulot_daromadi,
           coalesce(sum(discount), 0)::bigint               as chegirma,
           coalesce(sum(delivery_fee), 0)::bigint           as yetkazish,
           coalesce(sum(total), 0)::bigint                  as jami_tushum,
           coalesce(sum(cost_total), 0)::bigint             as tannarx,
           (coalesce(sum(subtotal), 0) - coalesce(sum(discount), 0)
            - coalesce(sum(cost_total), 0))::bigint         as sof_foyda,
           case when coalesce(sum(subtotal), 0) > 0
                then round(((coalesce(sum(subtotal),0) - coalesce(sum(discount),0)
                             - coalesce(sum(cost_total),0))::numeric
                            / coalesce(sum(subtotal),0)) * 100)::int
                else 0 end                                  as marja
      from orders
     where status <> 'bekor'
     group by 1
     order by 1 desc
     limit 24`);
}

/** @param {string} oy  'YYYY-MM' yoki bo'sh (hammasi) */
async function sotuvlar(oy = '') {
  const royxat = await qatorlar(`
    with qatorlar as (
      select (i->>'product_id')::bigint as product_id,
             i->>'name'  as name,
             i->>'brand' as brand,
             (i->>'qty')::int   as qty,
             (i->>'price')::int as price,
             coalesce((i->>'cost_price')::int, 0) as cost_price
        from orders o, jsonb_array_elements(o.items) i
       where o.status <> 'bekor'
         and ($1 = '' or to_char(o.created_at at time zone 'Asia/Tashkent', 'YYYY-MM') = $1)
    )
    select product_id,
           max(name)  as name,
           max(brand) as brand,
           sum(qty)::bigint                    as soni,
           sum(qty * price)::bigint            as daromad,
           sum(qty * cost_price)::bigint       as tannarx,
           (sum(qty * price) - sum(qty * cost_price))::bigint as foyda,
           case when sum(qty * price) > 0
                then round(((sum(qty*price) - sum(qty*cost_price))::numeric / sum(qty*price)) * 100)::int
                else 0 end as marja
      from qatorlar
     group by product_id
     order by daromad desc`, [oy]);

  return {
    sotuvlar: royxat,
    jami: {
      soni:    royxat.reduce((s, r) => s + r.soni, 0),
      daromad: royxat.reduce((s, r) => s + r.daromad, 0),
      foyda:   royxat.reduce((s, r) => s + r.foyda, 0),
    },
  };
}

async function mijozgaXabar(buyurtma, holat, sabab) {
  const chatId = buyurtma.telegram_id;
  if (!chatId) return;

  const qiymatlar = {
    raqam: esc(buyurtma.order_no),
    sabab: sabab ? `\n\nSabab: ${esc(sabab)}` : '',
  };

  // "Omborga yetib keldi" — eng yaqin ombor ma'lumotini qo'shamiz
  if (holat === 'omborda') {
    let ombor = buyurtma.ombor_id
      ? await qator('select * from omborlar where id = $1', [buyurtma.ombor_id])
      : null;
    // Buyurtma paytida ombor topilmagan bo'lsa — hozir qidiramiz
    if (!ombor) {
      ombor = await qator(
        `select * from omborlar
          where faol and (viloyat = $1 or $1 is null)
          order by (tuman = $2) desc nulls last, tartib limit 1`,
        [buyurtma.viloyat || null, buyurtma.tuman || null]);
      if (ombor) await sorov('update orders set ombor_id = $1 where id = $2', [ombor.id, buyurtma.id]);
    }
    Object.assign(qiymatlar, {
      ombor:     esc(ombor?.nom || 'Markaziy ombor'),
      manzil:    esc(ombor?.manzil || ''),
      mo_ljal:   ombor?.mo_ljal ? `📌 ${esc(ombor.mo_ljal)}` : '',
      telefon:   esc(ombor?.telefon || ''),
      ish_vaqti: esc(ombor?.ish_vaqti || ''),
    });
  }

  const matn = await xabar(`xabar_holat_${holat}`, qiymatlar, '');
  if (matn) await yubor(chatId, matn);
}
