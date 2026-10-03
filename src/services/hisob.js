// HISOB: o'chirish va ma'lumotlarni yuklab olish.
//
// Google Play talabi: hisob ochish mumkin bo'lgan ilovada hisobni
// O'CHIRISH ham ilovaning o'zida bo'lishi shart (va veb-sahifa orqali
// so'rash imkoni). Ilgari bu faqat botdagi `/ochir` buyrug'i edi —
// Telegrami yo'q odam undan foydalana olmasdi.
//
// O'chirish nimani qiladi:
//   · yuz suratlari va tahlil natijalari — BUTUNLAY o'chadi;
//   · savat, sevimlilar, sharhlar, seanslar, kirish so'rovlari,
//     bildirishnoma obunalari — o'chadi;
//   · profil: ism, telefon, email, manzil, yosh, teri ma'lumoti — o'chadi;
//   · buyurtmalar — SAQLANADI (buxgalteriya hisobi), lekin ism, telefon
//     va manzil o'rniga «o'chirilgan»;
//   · foydalanuvchi qatori qoladi, lekin hech qanday shaxsiy ma'lumotsiz
//     (buyurtmalar unga bog'langan, bazada bog'lanishni uzib bo'lmaydi).
//
// Faol buyurtma bo'lsa (to'langan, yo'lda) — o'chirilmaydi: aks holda
// mahsulot yetkazib bo'lmay qoladi. To'lanmagan yangi buyurtmalar
// bekor qilinadi.
import crypto from 'node:crypto';
import { qator, qatorlar, sorov, hodisa } from '../db.js';

/** Bu holatdagi buyurtma bilan hisobni o'chirib bo'lmaydi. */
const YAKUNIY = ['yetkazildi', 'bekor'];

/** O'chirishga to'sqinlik qiladigan buyurtmalar. */
export async function faolBuyurtmalar(userId) {
  return qatorlar(
    `select order_no, status from orders
      where user_id = $1 and status <> all($2)
        and (status <> 'yangi' or receipt_id is not null)
      order by created_at desc`, [userId, YAKUNIY]);
}

/**
 * Hisobni o'chiradi.
 * @returns {Promise<{ok:boolean, sabab?:string, buyurtmalar?:string[]}>}
 */
export async function hisobniOchir(userId) {
  const faol = await faolBuyurtmalar(userId);
  if (faol.length) {
    return { ok: false, sabab: 'faol_buyurtma', buyurtmalar: faol.map((b) => b.order_no) };
  }

  // To'lanmagan yangi buyurtmalar — bekor
  await sorov(
    `update orders set status = 'bekor', cancel_reason = 'Mijoz hisobini o‘chirdi',
            updated_at = now()
      where user_id = $1 and status = 'yangi' and receipt_id is null`, [userId]);

  // Buyurtmalarda SHAXSIY ma'lumot qolmaydi
  await sorov(
    `update orders set customer_name = 'O‘chirilgan mijoz', customer_phone = '',
            customer_address = '', note = null
      where user_id = $1`, [userId]);

  // Yuz suratlari va natija rasmlari. media ga havola `on delete set null`
  // bilan turibdi — tahlilni o'chirsak rasm bazada YETIM qolardi.
  await sorov(
    `delete from media where id in (
       select yuz_rasm_id from analyses where user_id = $1 and yuz_rasm_id is not null
       union all
       select natija_rasm_id from analyses where user_id = $1 and natija_rasm_id is not null)`,
    [userId]);
  // Sharh rasmlari — sharh bilan birga (ular odamning o'z surati)
  await sorov(
    `delete from media where tur = 'sharh' and id in (
       select unnest(rasmlar) from sharhlar where user_id = $1)`, [userId]);
  for (const jadval of ['analyses', 'cart_items', 'sevimlilar', 'sharhlar',
                        'kirish_sorovlari', 'ilova_seanslar', 'push_obunalar']) {
    await sorov(`delete from ${jadval} where user_id = $1`, [userId]);
  }

  // Foydalanuvchi qatori: shaxsiy hamma narsa tozalanadi. Telegram id
  // ham almashtiriladi — odam botga qaytsa, u YANGI foydalanuvchi bo'ladi
  // va eski hisob bilan qayta bog'lanib qolmaydi.
  await sorov(
    `update users set telegram_id = $2, username = null, full_name = null, phone = null,
            email = null, google_sub = null, address = null, age = null, gender = null,
            viloyat = null, tuman = null, avatar_url = null, teri_turi = null,
            allergiya = null, kasallik = null, agreed_at = null, state = null,
            state_data = '{}'::jsonb, checkout_draft = '{}'::jsonb
      where id = $1`,
    [userId, `ochirilgan:${crypto.randomBytes(8).toString('hex')}`]);
  await hodisa(userId, 'hisob_ochirildi');
  return { ok: true };
}

/**
 * Foydalanuvchining O'Z ma'lumotlari — JSON qilib yuklab olish uchun.
 *
 * Yuz suratlarining o'zi qo'shilmaydi (fayl katta bo'lib ketadi), lekin
 * tahlil natijalari to'liq. Admin uchun ichki maydonlar (tannarx,
 * partiya) chiqarilmaydi — bu do'konning emas, MIJOZNING ma'lumoti.
 */
export async function meningMalumotlarim(userId) {
  const u = await qator(
    `select full_name, phone, email, age, address, viloyat, tuman, teri_turi,
            allergiya, kasallik, agreed_at, agreement_version, created_at,
            case when telegram_id ~ '^[0-9]+$' then 'telegram'
                 when telegram_id like 'google:%' then 'google'
                 when telegram_id like 'tel:%' then 'telefon' else 'boshqa' end as kirish
       from users where id = $1`, [userId]);
  const [tahlillar, buyurtmalar, sevimlilar, savat, sharhlar] = await Promise.all([
    qatorlar(`select created_at, age_estimate, skin_tone, skin_type, score, problems,
                     forecast, routine, raw from analyses
               where user_id = $1 order by created_at desc`, [userId]),
    qatorlar(`select order_no, created_at, status, items, subtotal, delivery_fee, discount,
                     total, payment_method, customer_name, customer_phone, customer_address,
                     viloyat, tuman, yetkazish_turi
                from orders where user_id = $1 order by created_at desc`, [userId]),
    qatorlar(`select p.name, s.created_at from sevimlilar s join products p on p.id = s.product_id
               where s.user_id = $1 order by s.created_at desc`, [userId]),
    qatorlar(`select p.name, c.quantity from cart_items c join products p on p.id = c.product_id
               where c.user_id = $1`, [userId]),
    qatorlar(`select p.name, s.baho, s.matn, s.created_at from sharhlar s
                join products p on p.id = s.product_id
               where s.user_id = $1 order by s.created_at desc`, [userId]).catch(() => []),
  ]);
  return {
    eksport: { sana: new Date().toISOString(), format: 'KiOVO · shaxsiy ma’lumotlar · 1' },
    profil: u || {},
    tahlillar, buyurtmalar, sevimlilar, savat, sharhlar,
  };
}
