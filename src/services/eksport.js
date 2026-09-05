// Ilova ma'lumotlarini FAYL qilib beradi.
//
// Nima uchun kerak. Ma'lumot bazada turibdi, lekin uni ko'rish uchun
// har safar panelga kirish shart. Buxgalterga, hisobotga yoki oddiy
// zaxira uchun bitta fayl kerak bo'ladi — buni bir bosishda olish
// mumkin bo'lsin.
//
// MUHIM: eksport ADMIN uchun, shuning uchun ichida mijoz telefoni
// ham bor. Fayl brauzerga bevosita yuklanadi va hech qayerda
// saqlanmaydi — server diskida qoldiq qolmaydi.
import { qatorlar, qiymat } from '../db.js';

/** Nimalarni eksport qilish mumkin. */
export const BOLIMLAR = {
  mahsulotlar: {
    nom: 'Mahsulotlar',
    ol: () => qatorlar(
      `select id, name, nom_uz, brand, price, cost_price, old_price, stock,
              is_active, step, volume, emoji, concerns, skin_types, actives,
              description, usage_text, warnings, manba_url, reyting, sharh_soni,
              sold_count, created_at
         from products order by id`),
  },
  buyurtmalar: {
    nom: 'Buyurtmalar',
    ol: () => qatorlar(
      `select o.id, o.order_no, o.status, o.payment_status, o.customer_name,
              o.customer_phone, o.viloyat, o.tuman, o.customer_address,
              o.yetkazish_turi, o.pochta_izoh, o.items, o.subtotal, o.discount,
              o.delivery_fee, o.total, o.cost_total, o.cancel_reason,
              o.created_at, u.telegram_id
         from orders o join users u on u.id = o.user_id order by o.id`),
  },
  mijozlar: {
    nom: 'Mijozlar',
    ol: () => qatorlar(
      `select id, telegram_id, username, full_name, phone, age, viloyat, tuman,
              teri_turi, allergiya, kasallik, is_admin, is_blocked, created_at
         from users order by id`),
  },
  tahlillar: {
    nom: 'Tahlillar',
    ol: () => qatorlar(
      `select id, user_id, age_estimate, jins, skin_tone, skin_type, score,
              problems, forecast, routine, is_offline, created_at
         from analyses order by id`),
  },
  sharhlar: {
    nom: 'Sharhlar',
    ol: () => qatorlar(
      `select id, user_id, product_id, baho, matn, created_at
         from sharhlar order by id`),
  },
  sozlamalar: {
    nom: 'Sozlamalar',
    ol: () => qatorlar(`select key, value, updated_at from settings order by key`),
  },
  bolimlar: {
    nom: 'Bo‘limlar',
    ol: () => qatorlar(
      `select id, slug, name as nom, emoji, ikon, sort as tartib
         from categories order by sort, id`),
  },
};

/**
 * Eksport ma'lumotini yig'adi.
 * @param {string[]} [tanlangan]  bo'lim kalitlari; bo'sh bo'lsa HAMMASI
 */
export async function eksportYig(tanlangan) {
  const kalitlar = (Array.isArray(tanlangan) && tanlangan.length
    ? tanlangan.filter((k) => BOLIMLAR[k])
    : Object.keys(BOLIMLAR));

  const natija = {
    // Faylni keyin ochganda nima ekani va qachonligi darrov bilinsin
    _haqida: {
      manba: 'KiOVO',
      sana: new Date().toISOString(),
      bolimlar: kalitlar,
      ogohlantirish: 'Ichida mijoz telefonlari bor — begonaga bermang.',
    },
  };

  for (const k of kalitlar) {
    try {
      natija[k] = await BOLIMLAR[k].ol();
    } catch (e) {
      // Bitta jadval yiqilsa butun eksport yo'qolmasin
      natija[k] = { xato: String(e.message).slice(0, 200) };
    }
  }
  return natija;
}

/** Qisqacha: nechta yozuv bor (agent shuni aytadi). */
export async function eksportHajmi() {
  const son = async (jadval) => {
    try { return await qiymat(`select count(*)::int from ${jadval}`); }
    catch { return 0; }
  };
  return {
    mahsulotlar: await son('products'),
    buyurtmalar: await son('orders'),
    mijozlar:    await son('users'),
    tahlillar:   await son('analyses'),
    sharhlar:    await son('sharhlar'),
    sozlamalar:  await son('settings'),
  };
}

/** Bitta bo'limni CSV qilib beradi — Excel'da ochish uchun. */
export function csvQil(qatorlarRoyxati) {
  const r = Array.isArray(qatorlarRoyxati) ? qatorlarRoyxati : [];
  if (!r.length) return '﻿';
  const ustunlar = [...new Set(r.flatMap((x) => Object.keys(x)))];
  const katak = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Excel `;` ni ustun ajratgichi deb oladi (o'zbek/rus lokalida)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM — Excel UTF-8 ni to'g'ri o'qishi uchun
  return '﻿' + [ustunlar.join(';'),
    ...r.map((x) => ustunlar.map((u) => katak(x[u])).join(';'))].join('\n');
}
