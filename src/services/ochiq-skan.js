// Instagramdan kelgan OCHIQ skaner.
//
// Oqim: reklama havolasi → brauzerda yuz skaneri → qisqa «men rasmda
// nima ko'rdim» tavsifi, biologik yosh, jins va teri turi → qolgani
// XIRA qilib berkitiladi → «To'liq natija Telegramda» tugmasi botga
// olib boradi va bot aynan shu tahlilni topib beradi.
//
// Nega shunday. Instagramdagi odam hali mijoz emas: undan darrov
// ro'yxatdan o'tishni so'rasang ketadi. Avval QIYMAT beriladi (u o'zi
// haqida biror narsa biladi), keyin qiziqishi eng yuqori nuqtada
// botga taklif qilinadi.
//
// Xavfsizlik. Bu yo'l ochiq, ya'ni har kim chaqira oladi va har
// chaqiruv AI pulini yeydi. Shuning uchun:
//   · IP bo'yicha kunlik chegara (xeshlangan holda saqlanadi);
//   · umumiy soatlik chegara — birdaniga hujum bo'lsa to'xtaydi;
//   · rasm o'lchami va turi tekshiriladi;
//   · to'liq natija (muammolar, mahsulotlar) javobda UMUMAN yo'q —
//     xira qilingan matnni klientdan «ochib» bo'lmaydi.
import crypto from 'node:crypto';
import { qator, qatorlar, sorov, hodisa } from '../db.js';
import { tahlilQil } from './analysis.js';
import { natijaRasminiYarat, yuzniSaqla, kanalgaTahlil } from './natija-rasm.js';

/** Bir IP kuniga shuncha marta skanerlay oladi. */
export const IP_KUNLIK = 3;
/** Butun tizim bo'yicha soatlik shift — kutilmagan oqimdan himoya. */
export const SOATLIK = 120;

const ipXesh = (ip) => crypto.createHash('sha256')
  .update(`ochiq:${String(ip || '')}`).digest('hex').slice(0, 32);

const tokenYasa = () => crypto.randomBytes(16).toString('hex');

/** Shu IP bugun nechta skaner qilgan va umumiy soatlik yuk qancha. */
export async function chegaraHolati(ip) {
  const x = ipXesh(ip);
  const [kunlik, soatlik] = await Promise.all([
    qator(`select count(*)::int as n from ochiq_skan
             where ip_xesh = $1 and created_at > now() - interval '1 day'`, [x]),
    qator(`select count(*)::int as n from ochiq_skan
             where created_at > now() - interval '1 hour'`),
  ]);
  return {
    ip_soni: kunlik?.n ?? 0,
    qolgan: Math.max(0, IP_KUNLIK - (kunlik?.n ?? 0)),
    soatlik: soatlik?.n ?? 0,
    ruxsat: (kunlik?.n ?? 0) < IP_KUNLIK && (soatlik?.n ?? 0) < SOATLIK,
  };
}

/**
 * Ochiq skaner: mehmon foydalanuvchi yaratadi, tahlil qiladi va
 * faqat OCHIQ qismini qaytaradi.
 *
 * @returns {{yaroqli:boolean, token?:string, ochiq?:object, sabab?:string}}
 */
export async function ochiqSkan({ base64, mime, ip }) {
  const chegara = await chegaraHolati(ip);
  if (!chegara.ruxsat) {
    const e = new Error('CHEGARA');
    e.chegara = chegara;
    throw e;
  }

  const token = tokenYasa();
  // Mehmon — vaqtinchalik foydalanuvchi. `telegram_id` majburiy va
  // yagona bo'lishi kerak, shuning uchun token asosida yasaladi.
  const mehmon = await qator(
    `insert into users (telegram_id, source) values ($1, 'instagram') returning *`,
    [`mehmon:${token}`]);

  let natija;
  try {
    natija = await tahlilQil(mehmon, base64, mime);
  } catch (e) {
    await sorov('delete from users where id = $1', [mehmon.id]).catch(() => {});
    throw e;
  }

  if (!natija.yaroqli) {
    await sorov('delete from users where id = $1', [mehmon.id]).catch(() => {});
    return { yaroqli: false, sabab: natija.sabab, izoh: natija.izoh };
  }

  // Natija rasmi SHU YERDA chiziladi: odam botga kelganda uni darhol
  // olishi kerak, qayta tahlil qilib o'tirmasdan
  const rasm = await natijaRasminiYarat({
    analysisId: natija.analysisId, userId: mehmon.id,
    rasmBase64: base64, mime, tahlil: natija.tahlil, mahsulotlar: natija.mahsulotlar,
  }).catch(() => null);
  await yuzniSaqla({ analysisId: natija.analysisId, rasmBase64: base64, mime }).catch(() => {});

  // Tahlillar kanaliga SAYTDAGI skaner ham tushadi. Ilgari bu yerda
  // chaqiruv yo'q edi va kanalga faqat botdagi tahlillar kelardi:
  // reklamadan kelgan odam skanerlab ketsa, do'kon egasi undan
  // umuman xabar topmasdi. Yiqilsa — skaner ishlayveradi.
  if (rasm?.bayt) kanalgaTahlil(rasm.bayt, mehmon, natija.tahlil, 'sayt').catch(() => {});

  await sorov(
    `insert into ochiq_skan (token, analysis_id, mehmon_id, ip_xesh)
     values ($1,$2,$3,$4)`,
    [token, natija.analysisId, mehmon.id, ipXesh(ip)]);
  await hodisa(mehmon.id, 'ochiq_skan', { token });

  const t = natija.tahlil || {};
  return {
    yaroqli: true,
    token,
    rasm_bor: Boolean(rasm),
    // OCHIQ qism — odam bepul ko'radi
    ochiq: {
      tavsif: t.tavsif || '',
      yosh: t.taxminiy_yosh || '',
      jins: t.jins || '',
      teri_turi: t.teri_turi || '',
      teri_rangi: t.teri_rangi || '',
      ball: Math.round(Number(t.ball ?? 0)),
    },
    // BERKITILGAN qism — faqat SONI aytiladi, mazmuni emas.
    // Matn klientga umuman yuborilmaydi: «blur» ni ochib bo'lmaydi.
    yopiq: {
      muammo_soni: (t.muammolar || []).length,
      mahsulot_soni: (t.tavsiyalar || t.routine || []).length,
      // Faqat nomlar — qiziqtirish uchun, lekin foizi va yechimi yo'q
      nomlar: (t.muammolar || []).slice(0, 4).map((m) => m.nom).filter(Boolean),
    },
  };
}

/**
 * Botga kelgan odam tokenni «da'vo» qiladi: tahlil unga ko'chadi.
 *
 * @returns {{ok:boolean, analysisId?:number, sabab?:string}}
 */
export async function tokenniOl(token, user) {
  const t = String(token || '').trim();
  if (!/^[0-9a-f]{32}$/.test(t)) return { ok: false, sabab: 'token' };

  const s = await qator('select * from ochiq_skan where token = $1', [t]);
  if (!s) return { ok: false, sabab: 'topilmadi' };
  if (s.olindi_id && String(s.olindi_id) !== String(user.id)) {
    return { ok: false, sabab: 'olingan' };
  }

  // Tahlil mehmondan haqiqiy foydalanuvchiga ko'chadi
  await sorov('update analyses set user_id = $1 where id = $2', [user.id, s.analysis_id]);
  await sorov(`update ochiq_skan set olindi_id = $1, olindi_at = now() where token = $2`,
    [user.id, t]);
  // Mehmon endi kerak emas. `on delete cascade` tahlilni o'chirib
  // yubormasin — shuning uchun AVVAL ko'chiramiz, keyin o'chiramiz.
  if (s.mehmon_id) await sorov('delete from users where id = $1', [s.mehmon_id]).catch(() => {});
  await hodisa(user.id, 'ochiq_skan_olindi', { token: t });
  return { ok: true, analysisId: Number(s.analysis_id) };
}

/** Reklama sahifasi uchun qisqa statistika (admin panelda ko'rinadi). */
export async function ochiqStatistika() {
  const r = await qatorlar(
    `select count(*)::int as jami,
            count(*) filter (where olindi_id is not null)::int as olingan,
            count(*) filter (where created_at > now() - interval '7 days')::int as hafta
       from ochiq_skan`);
  const x = r[0] || {};
  return {
    jami: x.jami ?? 0,
    olingan: x.olingan ?? 0,
    hafta: x.hafta ?? 0,
    konversiya: x.jami ? Math.round(((x.olingan ?? 0) / x.jami) * 100) : 0,
  };
}
