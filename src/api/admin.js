// Admin API. Kirish: login/parol -> muddati cheklangan token (8 soat).
// Default parol YO'Q — config.js kalitlarsiz serverni ishga tushirmaydi.
import { db, q, setting } from '../db.js';
import { config } from '../config.js';
import { issueAdminToken, verifyAdminToken, loginBloklanganmi, loginXato, loginTozala } from '../lib/auth.js';
import { ok, xato, tana, ipOl } from '../lib/http.js';
import { mahsulotniTani } from '../ai/productEnrich.js';
import { yubor } from '../bot/tg.js';
import { esc } from '../bot/format.js';

const kun = (d) => new Date(d).toISOString().slice(0, 10);
const kunlarOldin = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

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

  // ---------- Bundan keyingi hammasi token talab qiladi ----------
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyAdminToken(token)) return xato(res, 401, 'Sessiya tugagan. Qayta kiring.');

  // ================= BOSHQARUV PANELI =================
  if (yol === '/api/admin/dashboard' && req.method === 'GET') {
    return ok(res, await boshqaruvPaneli());
  }

  // ================= BUYURTMALAR =================
  if (yol === '/api/admin/orders' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    let s = db.from('orders')
      .select('*, users(telegram_id,username,full_name)')
      .order('created_at', { ascending: false }).limit(Number(url.searchParams.get('limit')) || 100);
    const holat = url.searchParams.get('status');
    if (holat) s = s.eq('status', holat);
    return ok(res, { buyurtmalar: await q(s, 'buyurtmalar') });
  }

  if (yol === '/api/admin/order-status' && req.method === 'POST') {
    const b = await tana(req);
    const yangi = String(b.status || '');
    if (!['yangi','tasdiqlangan','yolda','yetkazildi','bekor'].includes(yangi)) {
      return xato(res, 400, 'Noto‘g‘ri holat.');
    }
    const eski = await q(db.from('orders').select('*, users(telegram_id)').eq('id', b.id).single(), 'buyurtma');

    // Bekor qilinsa ombor qaytadi (faqat bir marta)
    if (yangi === 'bekor' && eski.status !== 'bekor') {
      await db.rpc('restock_order', { p_order_id: Number(b.id) });
    }
    await q(db.from('orders').update({
      status: yangi,
      cancel_reason: yangi === 'bekor' ? String(b.reason || '').slice(0, 200) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', b.id), 'holat');

    mijozgaXabar(eski, yangi, b.reason).catch(() => {});
    return ok(res, { ok: true });
  }

  // ================= MAHSULOTLAR =================
  if (yol === '/api/admin/products' && req.method === 'GET') {
    const [mahsulotlar, kategoriyalar] = await Promise.all([
      q(db.from('products').select('*').order('id', { ascending: false }).limit(2000), 'mahsulotlar'),
      q(db.from('categories').select('*').order('sort'), 'kategoriyalar'),
    ]);
    return ok(res, { mahsulotlar, kategoriyalar });
  }

  // Skrinshotdan tanish — AI kartochkani to'ldiradi, admin tasdiqlaydi
  if (yol === '/api/admin/recognize' && req.method === 'POST') {
    const b = await tana(req);
    const base64 = String(b.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!base64 || base64.length < 500) return xato(res, 400, 'Rasm yuborilmadi.');
    try {
      const natija = await mahsulotniTani(base64, b.mime || 'image/jpeg');
      return ok(res, natija);
    } catch (e) {
      return xato(res, 502, e.foydalanuvchiga || 'AI mahsulotni tanimadi. Maydonlarni qo‘lda to‘ldiring.');
    }
  }

  if (yol === '/api/admin/product' && req.method === 'POST') {
    const b = await tana(req);
    const maydon = {
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
      actives: Array.isArray(b.actives) ? b.actives.slice(0, 12) : [],
      concerns: Array.isArray(b.concerns) ? b.concerns.slice(0, 10) : [],
      skin_types: Array.isArray(b.skin_types) ? b.skin_types.slice(0, 8) : [],
      warnings: String(b.warnings || '').slice(0, 400) || null,
      emoji: String(b.emoji || '🧴').slice(0, 4),
      ai_filled: Boolean(b.ai_filled),
      is_active: b.is_active !== false,
      updated_at: new Date().toISOString(),
    };
    if (!maydon.name) return xato(res, 400, 'Mahsulot nomi kerak.');
    if (!maydon.price) return xato(res, 400, 'Narx kerak.');

    try {
      const natija = b.id
        ? await q(db.from('products').update(maydon).eq('id', b.id).select('*').single(), 'mahsulotni yangilash')
        : await q(db.from('products').insert(maydon).select('*').single(), 'mahsulot qo‘shish');
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
    await q(db.from('products').update({ is_active: false }).eq('id', b.id), 'arxiv');
    return ok(res, { ok: true });
  }

  // ================= FOYDALANUVCHILAR =================
  if (yol === '/api/admin/users' && req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    const qidiruv = (url.searchParams.get('q') || '').trim();
    let s = db.from('users')
      .select('id,telegram_id,username,full_name,phone,age,address,agreed_at,is_blocked,created_at,last_active')
      .order('created_at', { ascending: false }).limit(Number(url.searchParams.get('limit')) || 200);
    if (qidiruv) s = s.or(`full_name.ilike.%${qidiruv}%,phone.ilike.%${qidiruv}%,username.ilike.%${qidiruv}%`);
    const users = await q(s, 'foydalanuvchilar');

    // Har bir foydalanuvchining sotib olgan summasi
    const buyurtmalar = await q(db.from('orders').select('user_id,total,status'), 'summalar');
    const jamiKarta = new Map();
    for (const o of buyurtmalar) {
      if (o.status === 'bekor') continue;
      jamiKarta.set(o.user_id, (jamiKarta.get(o.user_id) || 0) + o.total);
    }
    return ok(res, {
      users: users.map((u) => ({ ...u, jami_xarid: jamiKarta.get(u.id) || 0 })),
    });
  }

  if (yol === '/api/admin/user-block' && req.method === 'POST') {
    const b = await tana(req);
    await q(db.from('users').update({ is_blocked: Boolean(b.blocked) }).eq('id', b.id), 'blok');
    return ok(res, { ok: true });
  }

  // ================= SOTUVLAR VA ANALITIKA =================
  if (yol === '/api/admin/sales' && req.method === 'GET') {
    return ok(res, await sotuvlar());
  }

  // ================= SOZLAMALAR =================
  if (yol === '/api/admin/settings' && req.method === 'GET') {
    const data = await q(db.from('settings').select('*'), 'sozlamalar');
    return ok(res, { settings: Object.fromEntries(data.map((s) => [s.key, s.value])) });
  }
  if (yol === '/api/admin/settings' && req.method === 'POST') {
    const b = await tana(req);
    for (const [key, value] of Object.entries(b.settings || {})) {
      await q(db.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }), 'sozlama');
    }
    return ok(res, { ok: true });
  }

  return xato(res, 404, 'Topilmadi');
}

// ============================================================
// BOSHQARUV PANELI: KPI + DAROMAD PROGNOZI
// ============================================================
async function boshqaruvPaneli() {
  // Supabase sukut bo'yicha 1000 qator qaytaradi — chegarani ochiq ko'rsatamiz,
  // aks holda statistika jimgina kesilib, noto'g'ri bo'lib qoladi.
  const CHEK = 20000;
  const [buyurtmalar, users, mahsulotlar, hodisalar] = await Promise.all([
    q(db.from('orders').select('id,total,cost_total,status,created_at,items').limit(CHEK), 'buyurtmalar'),
    q(db.from('users').select('id,created_at,agreed_at').limit(CHEK), 'users'),
    q(db.from('products').select('id,name,brand,price,cost_price,stock,sold_count,is_active').limit(CHEK), 'mahsulotlar'),
    q(db.from('events').select('type,created_at').gte('created_at', kunlarOldin(30)).limit(CHEK), 'hodisalar'),
  ]);

  const bekorEmas = buyurtmalar.filter((o) => o.status !== 'bekor');
  const yetkazilgan = buyurtmalar.filter((o) => o.status === 'yetkazildi');
  const kutilayotgan = buyurtmalar.filter((o) => ['yangi', 'tasdiqlangan', 'yolda'].includes(o.status));

  const summa = (arr, f = (o) => o.total) => arr.reduce((s, o) => s + (f(o) || 0), 0);

  // ---- Tugallanish ehtimoli: tarixdan hisoblanadi ----
  const tugallangan = yetkazilgan.length;
  const bekorQilingan = buyurtmalar.filter((o) => o.status === 'bekor').length;
  const yakunlangan = tugallangan + bekorQilingan;
  // Tarix kam bo'lsa ehtiyotkor 70% dan boshlaymiz (Laplas tuzatishi bilan)
  const tugallanishEhtimoli = yakunlangan < 10
    ? (tugallangan + 7) / (yakunlangan + 10)
    : tugallangan / yakunlangan;

  // Holatga qarab ehtimol: yo'ldagi buyurtma yangisidan ishonchliroq
  const HOLAT_KOEF = { yangi: 0.75, tasdiqlangan: 0.9, yolda: 0.97 };
  const kutilayotganDaromad = kutilayotgan.reduce(
    (s, o) => s + o.total * (HOLAT_KOEF[o.status] ?? 0.8) * tugallanishEhtimoli, 0);

  // ---- Oy oxirigacha prognoz (kunlik o'rtacha × qolgan kunlar) ----
  const bugun = new Date();
  const oyBoshi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const oyKunlari = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0).getDate();
  const otganKunlar = bugun.getDate();
  const qolganKunlar = oyKunlari - otganKunlar;

  const shuOy = bekorEmas.filter((o) => new Date(o.created_at) >= oyBoshi);
  const oyDaromadi = summa(shuOy);
  const kunlikOrtacha = otganKunlar ? oyDaromadi / otganKunlar : 0;
  const prognozOyOxiri = oyDaromadi + kunlikOrtacha * qolganKunlar * tugallanishEhtimoli;

  // ---- Voronka (30 kun) ----
  const soni = (t) => hodisalar.filter((e) => e.type === t).length;
  const voronka = {
    start: soni('start'), register: soni('register'), scan: soni('scan'),
    scan_rejected: soni('scan_rejected'), add_cart: soni('add_cart'), order: soni('order'),
  };

  // ---- 14 kunlik daromad grafigi ----
  const kunlar = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = kun(d);
    const shuKun = bekorEmas.filter((o) => kun(o.created_at) === k);
    kunlar.push({ kun: k, daromad: summa(shuKun), soni: shuKun.length });
  }

  const jamiDaromad = summa(bekorEmas);
  const jamiTannarx = summa(bekorEmas, (o) => o.cost_total);

  return {
    kpi: {
      jami_daromad:      jamiDaromad,
      yalpi_foyda:       jamiDaromad - jamiTannarx,
      marja_foiz:        jamiDaromad ? Math.round(((jamiDaromad - jamiTannarx) / jamiDaromad) * 100) : 0,
      buyurtma_soni:     bekorEmas.length,
      ortacha_chek:      bekorEmas.length ? Math.round(jamiDaromad / bekorEmas.length) : 0,
      foydalanuvchi:     users.length,
      royxatdan_otgan:   users.filter((u) => u.agreed_at).length,
      oy_daromadi:       oyDaromadi,
      yangi_buyurtma:    buyurtmalar.filter((o) => o.status === 'yangi').length,
    },
    prognoz: {
      tugallanish_ehtimoli: Math.round(tugallanishEhtimoli * 100),
      kutilayotgan_soni:    kutilayotgan.length,
      kutilayotgan_summa:   summa(kutilayotgan),
      kutilayotgan_kutilma: Math.round(kutilayotganDaromad),
      kunlik_ortacha:       Math.round(kunlikOrtacha),
      qolgan_kunlar:        qolganKunlar,
      oy_oxiri_prognoz:     Math.round(prognozOyOxiri),
      izoh: yakunlangan < 10
        ? 'Tarix kam (10 tadan kam yakunlangan buyurtma) — prognoz taxminiy.'
        : `${yakunlangan} ta yakunlangan buyurtma tarixiga asoslangan.`,
    },
    voronka,
    kunlar,
    ombor: {
      tugagan:  mahsulotlar.filter((p) => p.is_active && p.stock === 0).length,
      kam:      mahsulotlar.filter((p) => p.is_active && p.stock > 0 && p.stock <= 5).length,
      jami:     mahsulotlar.filter((p) => p.is_active).length,
      qiymat:   mahsulotlar.reduce((s, p) => s + p.stock * p.cost_price, 0),
    },
  };
}

// ============================================================
// SOTILGAN MAHSULOTLAR RO'YXATI
// ============================================================
async function sotuvlar() {
  const buyurtmalar = await q(
    db.from('orders').select('order_no,items,total,status,created_at').neq('status', 'bekor').limit(20000),
    'sotuvlar');

  const karta = new Map();
  for (const o of buyurtmalar) {
    for (const i of o.items || []) {
      const k = i.product_id;
      const bor = karta.get(k) || {
        product_id: k, name: i.name, brand: i.brand,
        soni: 0, daromad: 0, tannarx: 0, buyurtmalar: 0,
      };
      bor.soni      += i.qty;
      bor.daromad   += i.price * i.qty;
      bor.tannarx   += (i.cost_price || 0) * i.qty;
      bor.buyurtmalar += 1;
      karta.set(k, bor);
    }
  }

  const royxat = [...karta.values()]
    .map((r) => ({ ...r, foyda: r.daromad - r.tannarx,
                   marja: r.daromad ? Math.round(((r.daromad - r.tannarx) / r.daromad) * 100) : 0 }))
    .sort((a, b) => b.daromad - a.daromad);

  return {
    sotuvlar: royxat,
    jami: {
      soni:    royxat.reduce((s, r) => s + r.soni, 0),
      daromad: royxat.reduce((s, r) => s + r.daromad, 0),
      foyda:   royxat.reduce((s, r) => s + r.foyda, 0),
    },
  };
}

// ============================================================
async function mijozgaXabar(buyurtma, holat, sabab) {
  const chatId = buyurtma.users?.telegram_id;
  if (!chatId) return;
  const matnlar = {
    tasdiqlangan: `✅ <b>${esc(buyurtma.order_no)}</b> buyurtmangiz tasdiqlandi. Tayyorlanmoqda.`,
    yolda:        `🚚 <b>${esc(buyurtma.order_no)}</b> buyurtmangiz yo‘lga chiqdi. Kuryer bog‘lanadi.`,
    yetkazildi:   `📦 <b>${esc(buyurtma.order_no)}</b> yetkazildi. Xaridingiz uchun rahmat! 🌸`,
    bekor:        `❌ <b>${esc(buyurtma.order_no)}</b> bekor qilindi.${sabab ? `\n\nSabab: ${esc(sabab)}` : ''}`,
  };
  if (matnlar[holat]) await yubor(chatId, matnlar[holat]);
}
