// Agentga BEVOSITA baza kirishi.
//
// Nima uchun kerak. Tayyor vositalar ro'yxati qanchalik uzun bo'lmasin,
// admin har safar ro'yxatda yo'q narsani so'raydi: «shu oyda qaysi
// viloyatdan ko'p buyurtma tushdi», «narxi tannarxidan past
// mahsulotlar bormi». Har biriga alohida vosita yozib bo'lmaydi —
// SQL ning o'zi shu ish uchun yaratilgan til.
//
// XAVFSIZLIK — ikki qatlam:
//
//   1. O'QISH so'rovi HAQIQIY «read only» tranzaksiyada bajariladi.
//      Bu satr tekshiruvi emas, BAZANING O'ZI kafolati: `update`
//      yashirin yo'l bilan o'tib ketsa ham Postgres uni rad etadi.
//      Ustiga statement_timeout qo'yiladi — og'ir so'rov butun
//      ilovani sekinlashtirmaydi.
//
//   2. YOZISH so'rovi admin tasdiqlamaguncha umuman bajarilmaydi
//      (agent oqimi shuni ta'minlaydi) va SXEMANI buzadigan
//      buyruqlar butunlay taqiqlangan: drop, truncate, alter, grant.
//      Bularni qaytarib bo'lmaydi va do'kon boshqaruvi uchun hech
//      qachon kerak emas.
import { pool } from '../db.js';

const MAKS_QATOR = 500;
const VAQT_MS = 8000;

// Sxemani buzadigan buyruqlar — YOZISHDA ham taqiqlanadi
const TAQIQ = /\b(drop|truncate|alter|grant|revoke|create\s+(role|user|extension)|copy|vacuum|reindex|cluster)\b/i;
// Bazadan tashqariga chiqishga urinish
const XAVFLI = /\b(pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink|pg_sleep|pg_terminate_backend)\b/i;

/** Bir nechta buyruqni bitta satrga tiqishning oldini oladi. */
function bittaBuyruqmi(sql) {
  // Qatorlar va izohlarni tashlab, `;` faqat oxirida bo'lishi kerak
  const toza = String(sql)
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim()
    .replace(/;+\s*$/, '');
  return !toza.includes(';');
}

function tekshir(sql, { yozish = false } = {}) {
  const s = String(sql || '').trim();
  if (!s) return 'So‘rov bo‘sh.';
  if (s.length > 4000) return 'So‘rov juda uzun.';
  if (!bittaBuyruqmi(s)) return 'Faqat BITTA buyruq bo‘lishi mumkin (`;` bilan ajratmang).';
  if (XAVFLI.test(s)) return 'Bu funksiya taqiqlangan.';
  if (TAQIQ.test(s)) {
    return 'Sxemani o‘zgartiradigan buyruqlar (drop, truncate, alter, grant) taqiqlangan — '
         + 'ularni qaytarib bo‘lmaydi.';
  }
  if (!yozish && !/^\s*(select|with)\b/i.test(s)) {
    return 'O‘qish uchun faqat SELECT yoki WITH.';
  }
  if (yozish && !/^\s*(insert|update|delete|with)\b/i.test(s)) {
    return 'Yozish uchun INSERT, UPDATE yoki DELETE.';
  }
  return null;
}

/**
 * O'qish so'rovi. HAQIQIY read-only tranzaksiyada bajariladi.
 * @returns {{ustunlar:string[], qatorlar:Array, soni:number, kesildi:boolean}}
 */
export async function sqlOqi(sql, { chegara = MAKS_QATOR } = {}) {
  const xato = tekshir(sql, { yozish: false });
  if (xato) return { xato };

  const mijoz = await pool.connect();
  try {
    // READ ONLY — bazaning o'z kafolati, satr tekshiruvi emas
    await mijoz.query('begin transaction read only');
    await mijoz.query(`set local statement_timeout = ${VAQT_MS}`);
    const r = await mijoz.query(sql);
    await mijoz.query('rollback');

    const n = Math.max(1, Math.min(MAKS_QATOR, Number(chegara) || MAKS_QATOR));
    return {
      ustunlar: (r.fields || []).map((f) => f.name),
      qatorlar: (r.rows || []).slice(0, n),
      soni: r.rows?.length ?? 0,
      kesildi: (r.rows?.length ?? 0) > n,
    };
  } catch (e) {
    await mijoz.query('rollback').catch(() => {});
    return { xato: String(e.message).slice(0, 300) };
  } finally {
    mijoz.release();
  }
}

/**
 * Yozish so'rovi. FAQAT admin tasdiqlagandan keyin chaqiriladi.
 * Nechta satrga tekkani qaytariladi — da'vo emas, natija.
 */
export async function sqlYoz(sql) {
  const xato = tekshir(sql, { yozish: true });
  if (xato) return { ozgardi: 0, xabar: xato };

  const mijoz = await pool.connect();
  try {
    await mijoz.query('begin');
    await mijoz.query(`set local statement_timeout = ${VAQT_MS}`);
    const r = await mijoz.query(sql);
    await mijoz.query('commit');
    return { ozgardi: r.rowCount ?? 0, qatorlar: (r.rows || []).slice(0, 50) };
  } catch (e) {
    await mijoz.query('rollback').catch(() => {});
    return { ozgardi: 0, xabar: String(e.message).slice(0, 300) };
  } finally {
    mijoz.release();
  }
}

/**
 * Baza SXEMASI — agent qanday ustunlar borligini bilmasa to'g'ri
 * SQL yoza olmaydi. Ilgari u ustun nomlarini TAXMIN qilardi va
 * so'rov «column does not exist» bilan yiqilardi.
 */
export async function sxema() {
  const r = await pool.query(
    `select table_name, column_name, data_type
       from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position`);
  const jadval = new Map();
  for (const x of r.rows) {
    if (!jadval.has(x.table_name)) jadval.set(x.table_name, []);
    jadval.get(x.table_name).push(`${x.column_name} ${x.data_type}`);
  }
  return [...jadval.entries()].map(([nom, ustunlar]) => ({ jadval: nom, ustunlar }));
}
