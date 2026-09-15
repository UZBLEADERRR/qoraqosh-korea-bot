// Ma'lumotni yuklab olish uchun IMZOLANGAN havola.
//
// Muammo. Admin API si `Authorization: Bearer …` sarlavhasini talab
// qiladi — panel uni fetch bilan qo'shadi. Lekin yordamchi suhbatda
// HAVOLA beradi va odam uni oddiy bosadi: brauzer hech qanday
// sarlavha yubormaydi va javob 401 bo'ladi. Ya'ni «faylni yuklab
// oling» degan gap amalda ishlamasdi.
//
// Yechim: qisqa muddatli imzolangan havola. Ichida bo'limlar ro'yxati
// va tugash vaqti bor, hammasi ADMIN_JWT_SECRET bilan imzolangan.
// Havola 30 daqiqadan keyin o'ladi — chatdan nusxa ko'chirilib
// tarqatilsa ham uzoq yashamaydi.
import crypto from 'node:crypto';
import { config } from '../config.js';

const MUDDAT_MS = 30 * 60 * 1000;

const imzola = (yuk) => crypto.createHmac('sha256', config.adminSecret)
  .update(`eksport:${yuk}`).digest('hex').slice(0, 32);

/**
 * @param {string[]} bolimlar  bo'sh bo'lsa — hammasi
 * @param {'json'|'csv'} tur
 * @returns {string|null} to'liq havola (PUBLIC_URL yo'q bo'lsa null)
 */
export function eksportHavolasi(bolimlar = [], tur = 'json') {
  if (!config.publicUrl) return null;
  const yuk = [tur, (bolimlar || []).join('.'), Date.now() + MUDDAT_MS].join('~');
  const b64 = Buffer.from(yuk, 'utf8').toString('base64url');
  return `${config.publicUrl}/eksport/${b64}.${tur === 'csv' ? 'csv' : 'json'}?i=${imzola(yuk)}`;
}

/**
 * Havolani tekshiradi va nimani berish kerakligini aytadi.
 * @returns {{ok:true, tur:string, bolimlar:string[]}|{ok:false, sabab:string}}
 */
export function eksportOchib(b64, imzo) {
  let yuk = '';
  try { yuk = Buffer.from(String(b64 || ''), 'base64url').toString('utf8'); }
  catch { return { ok: false, sabab: 'buzilgan' }; }

  const kutilgan = imzola(yuk);
  const a = Buffer.from(String(imzo || ''));
  const b = Buffer.from(kutilgan);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, sabab: 'imzo' };
  }

  const [tur, bolimlar, muddat] = yuk.split('~');
  if (!(Number(muddat) > Date.now())) return { ok: false, sabab: 'muddat' };
  return {
    ok: true,
    tur: tur === 'csv' ? 'csv' : 'json',
    bolimlar: bolimlar ? bolimlar.split('.').filter(Boolean) : [],
  };
}
