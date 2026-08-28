// Admin API. Kirish: login/parol -> muddati cheklangan token (8 soat).
import { qator, qatorlar, sorov, qiymat } from '../db.js';
import { issueAdminToken, verifyAdminToken, loginBloklanganmi, loginXato, loginTozala } from '../lib/auth.js';
import { ok, xato, tana, ipOl } from '../lib/http.js';
import { verifyInitData } from '../lib/auth.js';
import { mahsulotniTani } from '../ai/productEnrich.js';
import { posterGoyalari, posterChiz, NISBATLAR } from '../ai/poster.js';
import { aiJson, aiBormi, provayder, openrouterBormi, googleBormi } from '../ai/index.js';
import { xatoniTushuntir } from '../lib/xatolar.js';
import { config } from '../config.js';
import { yubor, tg } from '../bot/tg.js';
import { esc } from '../bot/format.js';
import { xabar, keshniTozala } from '../bot/shablon.js';
import { STANDART, GURUHLAR, TAVSIF } from '../bot/shablonlar-standart.js';
import { keshniTashla } from '../lib/kesh.js';

// Katalog keshini bekor qilish: admin nimadir o'zgartirsa ilova darhol yangisini ko'rsin
const katalogYangilandi = () => keshniTashla('katalog');

const kunlarOldin = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const HOLATLAR = ['yangi', 'tasdiqlangan', 'omborda', 'yolda', 'yetkazildi', 'bekor'];

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
    if (holat === 'tolangan' && o.telegram_id) {
      xabar('xabar_tolov_tasdiq', { raqam: esc(o.order_no) },
        '✅ <b>{raqam}</b> — to‘lovingiz tasdiqlandi.')
        .then((m) => yubor(o.telegram_id, m)).catch(() => {});
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
      ai_filled: Boolean(b.ai_filled),
      is_active: b.is_active !== false,
    };
    if (!m.name)  return xato(res, 400, 'Mahsulot nomi kerak.');
    if (!m.price) return xato(res, 400, 'Narx kerak.');

    const q = [m.name, m.brand, m.category_id, m.step, m.price, m.old_price, m.cost_price,
               m.stock, m.volume, m.country, m.description, m.usage_text, m.ingredients,
               m.actives, m.concerns, m.skin_types, m.warnings, m.emoji, m.ai_filled, m.is_active];
    try {
      const natija = b.id
        ? await qator(
            `update products set name=$1,brand=$2,category_id=$3,step=$4,price=$5,old_price=$6,
                    cost_price=$7,stock=$8,volume=$9,country=$10,description=$11,usage_text=$12,
                    ingredients=$13,actives=$14,concerns=$15,skin_types=$16,warnings=$17,
                    emoji=$18,ai_filled=$19,is_active=$20,updated_at=now()
              where id=$21 returning *`, [...q, b.id])
        : await qator(
            `insert into products (name,brand,category_id,step,price,old_price,cost_price,stock,
                    volume,country,description,usage_text,ingredients,actives,concerns,skin_types,
                    warnings,emoji,ai_filled,is_active)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
    // O'chirmaymiz — buyurtmalar tarixi buziladi. Arxivga olamiz.
    await sorov('update products set is_active=false where id=$1', [b.id]);
    katalogYangilandi();
    return ok(res, { ok: true });
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
  if (yol === '/api/admin/users' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const qidiruv = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(1000, Number(url.searchParams.get('limit')) || 200);
    return ok(res, {
      users: await qatorlar(
        `select u.id, u.telegram_id, u.username, u.full_name, u.phone, u.age, u.address,
                u.agreed_at, u.is_blocked, u.created_at, u.last_active,
                coalesce((select sum(o.total) from orders o
                           where o.user_id = u.id and o.status <> 'bekor'), 0)::int as jami_xarid
           from users u
          ${qidiruv ? `where u.full_name ilike $2 or u.phone ilike $2 or u.username ilike $2` : ''}
          order by u.created_at desc limit $1`,
        qidiruv ? [limit, `%${qidiruv}%`] : [limit]),
    });
  }

  if (yol === '/api/admin/user-block' && req.method === 'POST') {
    const b = await tana(req);
    await sorov('update users set is_blocked=$1 where id=$2', [Boolean(b.blocked), b.id]);
    return ok(res, { ok: true });
  }

  // ================= SOTUVLAR =================
  if (yol === '/api/admin/sales' && req.method === 'GET') return ok(res, await sotuvlar());

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

  // ================= SOZLAMALAR =================
  if (yol === '/api/admin/settings' && req.method === 'GET') {
    const r = await qatorlar('select key, value from settings');
    return ok(res, { settings: Object.fromEntries(r.map((s) => [s.key, s.value])) });
  }
  if (yol === '/api/admin/settings' && req.method === 'POST') {
    const b = await tana(req);
    for (const [key, value] of Object.entries(b.settings || {})) {
      await sorov(
        `insert into settings (key, value, updated_at) values ($1,$2,now())
         on conflict (key) do update set value=excluded.value, updated_at=now()`,
        [key, JSON.stringify(value)]);
    }
    keshniTozala();        // yangi bot matni darhol kuchga kirsin
    katalogYangilandi();   // narx/karta/menejer sozlamalari ham
    return ok(res, { ok: true });
  }

  return xato(res, 404, 'Topilmadi');
}

// ---------- Yordamchilar ----------
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
    qator(`select coalesce(sum(total),0)::int      as daromad,
                  coalesce(sum(cost_total),0)::int as tannarx,
                  count(*)::int                    as soni
             from orders where status <> 'bekor'`),
    qator(`select coalesce(sum(total),0)::int as daromad, count(*)::int as soni
             from orders
            where status <> 'bekor' and created_at >= date_trunc('month', now())`),
    qatorlar(`select status, count(*)::int as soni, coalesce(sum(total),0)::int as summa
                from orders group by status`),
    qatorlar(`select to_char(d.kun,'YYYY-MM-DD') as kun,
                     coalesce(sum(o.total),0)::int as daromad,
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
                  coalesce(sum(stock * cost_price),0)::int                         as qiymat
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
async function sotuvlar() {
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
    )
    select product_id,
           max(name)  as name,
           max(brand) as brand,
           sum(qty)::int                       as soni,
           sum(qty * price)::int               as daromad,
           sum(qty * cost_price)::int          as tannarx,
           (sum(qty * price) - sum(qty * cost_price))::int as foyda,
           case when sum(qty * price) > 0
                then round(((sum(qty*price) - sum(qty*cost_price))::numeric / sum(qty*price)) * 100)::int
                else 0 end as marja
      from qatorlar
     group by product_id
     order by daromad desc`);

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
