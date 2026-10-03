// Natija rasmini YUKLAB OLISH uchun imzolangan havola.
//
// Ilovadagi «Saqlash» rasmni telefon galereyasiga tushirishi kerak.
// Buning eng ishonchli yo'li — oddiy fayl yuklash: Android uni
// «Download» albomiga qo'yadi va galereya darhol ko'rsatadi. Lekin
// yuklash HAVOLA bilan bo'ladi va brauzer unga `Authorization`
// sarlavhasini qo'shmaydi. Telegram'ning `downloadFile` i ham faqat
// havola qabul qiladi. Shuning uchun qisqa muddatli imzo: ichida
// tahlil, egasi va tugash vaqti, ADMIN_JWT_SECRET bilan imzolangan.
import crypto from 'node:crypto';
import { config } from '../config.js';

const MUDDAT_MS = 15 * 60 * 1000;

const imzola = (yuk) => crypto.createHmac('sha256', config.adminSecret)
  .update(`natija-rasm:${yuk}`).digest('base64url').slice(0, 32);

/** @returns {string} nisbiy havola: /api/natija-rasm/<yuk>.png?i=<imzo> */
export function natijaHavolasi(analysisId, userId, hozir = Date.now()) {
  const yuk = Buffer.from(`${Number(analysisId)}~${Number(userId)}~${hozir + MUDDAT_MS}`)
    .toString('base64url');
  return `/api/natija-rasm/${yuk}.png?i=${imzola(yuk)}`;
}

/** @returns {{ok:true, analysisId:number, userId:number}|{ok:false, sabab:string}} */
export function natijaHavolasiniOch(yuk, imzo, hozir = Date.now()) {
  const kutilgan = Buffer.from(imzola(String(yuk || '')));
  const berilgan = Buffer.from(String(imzo || ''));
  if (kutilgan.length !== berilgan.length || !crypto.timingSafeEqual(kutilgan, berilgan)) {
    return { ok: false, sabab: 'imzo' };
  }
  const [id, user, muddat] = Buffer.from(String(yuk), 'base64url').toString('utf8').split('~').map(Number);
  if (!(muddat > hozir)) return { ok: false, sabab: 'muddat' };
  if (!(id > 0) || !(user > 0)) return { ok: false, sabab: 'buzilgan' };
  return { ok: true, analysisId: id, userId: user };
}
