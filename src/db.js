// Postgres (Supabase session pooler) — to'g'ridan-to'g'ri SQL.
// Faqat DATABASE_URL kerak; boshqa kalit yo'q.
import pg from 'pg';
import { config } from './config.js';

// pg sukut bo'yicha bigint (int8) ni SATR qilib qaytaradi — chunki int64 JS
// raqamiga sig'masligi mumkin. Bizda id'lar hech qachon 2^53 dan oshmaydi,
// lekin satr bo'lib qolsa id solishtirishlari (p.id === 5) jimgina buziladi.
// Shuning uchun int8 va numeric ni raqamga o'giramiz.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));   // int8
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric

// Supabase pooler zanjirini Node standart ishonch ombori tanimaydi.
// Sertifikat berilgan bo'lsa to'liq tekshiramiz, aks holda shifrlash bor,
// lekin zanjir tekshirilmaydi (Supabase uchun odatiy amaliyot).
const ssl = config.dbCaCert
  ? { ca: config.dbCaCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1') ? false : ssl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 12_000,
  // Bitta osilib qolgan so'rov hovuzdagi ulanishni abadiy band qilmasin
  statement_timeout: config.dbSorovTimeout,
  query_timeout: config.dbSorovTimeout + 2000,
  keepAlive: true,          // pooler bo'sh ulanishni uzib qo'ymasin
  application_name: 'qoraqosh',
});

pool.on('error', (e) => console.error('Baza pool xatosi:', e.message));

/**
 * Alohida ulanish — hovuzning vaqt cheklovlarisiz.
 * Migratsiya uchun: katta indeks qurish yoki advisory lock navbatida kutish
 * 15 soniyadan uzoq bo'lishi normal.
 */
export function uzunUlanish() {
  return new pg.Client({
    connectionString: config.databaseUrl,
    ssl: pool.options.ssl,
    application_name: 'qoraqosh-migratsiya',
  });
}

// Sekin so'rovlarni ko'rib turamiz — yuk oshganda birinchi bo'lib shular biladi
const SEKIN_MS = Number(process.env.SLOW_QUERY_MS || 1000);

/** Xom so'rov. */
export async function sorov(matn, qiymatlar = []) {
  const boshi = Date.now();
  try {
    return await pool.query(matn, qiymatlar);
  } finally {
    const ketdi = Date.now() - boshi;
    if (ketdi > SEKIN_MS) {
      console.warn(`SEKIN SO'ROV ${ketdi}ms:`, String(matn).replace(/\s+/g, ' ').slice(0, 120));
    }
  }
}

/** Barcha qatorlar. */
export async function qatorlar(matn, qiymatlar = []) {
  const { rows } = await sorov(matn, qiymatlar);
  return rows;
}

/** Birinchi qator yoki null. */
export async function qator(matn, qiymatlar = []) {
  const { rows } = await sorov(matn, qiymatlar);
  return rows[0] ?? null;
}

/** Bitta qiymat. */
export async function qiymat(matn, qiymatlar = []) {
  const r = await qator(matn, qiymatlar);
  return r ? Object.values(r)[0] : null;
}

/** Tranzaksiya: xatoda avtomatik rollback. */
export async function tranzaksiya(ish) {
  const mijoz = await pool.connect();
  try {
    await mijoz.query('begin');
    const natija = await ish(mijoz);
    await mijoz.query('commit');
    return natija;
  } catch (e) {
    await mijoz.query('rollback').catch(() => {});
    throw e;
  } finally {
    mijoz.release();
  }
}

/** settings jadvalidan qiymat. */
export async function sozlama(kalit, zaxira = null) {
  const r = await qator('select value from settings where key = $1', [kalit]);
  return r ? r.value : zaxira;
}

/** Voronka hodisasi. Analitika hech qachon asosiy oqimni to'xtatmasin. */
export async function hodisa(userId, tur, meta = {}) {
  try {
    await sorov('insert into events (user_id, type, meta) values ($1,$2,$3)', [userId ?? null, tur, meta]);
  } catch { /* jim */ }
}

export async function ulanishniTekshir() {
  const r = await qator('select current_database() as baza, version() as v');
  return { baza: r.baza, versiya: String(r.v).split(' ').slice(0, 2).join(' ') };
}
