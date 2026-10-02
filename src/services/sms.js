// SMS — Eskiz.uz orqali (O'zbekiston raqamlari).
//
// Yoqish uchun Railway → Variables:
//   ESKIZ_EMAIL, ESKIZ_PAROL  — my.eskiz.uz dagi kirish ma'lumoti
//   ESKIZ_FROM                — jo'natuvchi nomi (standart «4546»)
//
// MUHIM: Eskiz har bir SMS matnini oldindan MODERATSIYADAN o'tkazadi.
// my.eskiz.uz → «Shablonlar» ga aynan `KIRISH_MATNI` dagi matn yuboriladi
// (kod o'rnida istalgan raqam). Tasdiqlanmagan matnli SMS jo'natilmaydi.
//
// Sozlanmagan bo'lsa SMS yo'li o'chiq: ilova Google va Telegram bilan
// kirishni taklif qiladi.
import { config } from '../config.js';

/** Eskiz'da tasdiqlatiladigan shablon. `{kod}` — 6 xonali raqam. */
export const KIRISH_MATNI = (kod) =>
  `KiOVO ilovasiga kirish kodi: ${kod}. Kodni hech kimga bermang.`;

export const smsYoqilganmi = () => Boolean(config.eskizEmail && config.eskizParol);

/** SMS faqat O'zbekiston raqamiga: Eskiz'ning oddiy tarifi xorijga yubormaydi. */
export const smsGaYaroqlimi = (e164) => /^\+998\d{9}$/.test(String(e164 || ''));

let token = null;

async function kirish() {
  const fd = new FormData();
  fd.append('email', config.eskizEmail);
  fd.append('password', config.eskizParol);
  const res = await fetch(`${config.eskizApi}/auth/login`, {
    method: 'POST', body: fd, signal: AbortSignal.timeout(10_000) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.data?.token) throw new Error(`ESKIZ_KIRISH: ${j?.message || res.status}`);
  token = j.data.token;
  return token;
}

/**
 * SMS yuboradi.
 *
 * @param {string} e164   «+998901234567»
 * @param {string} matn
 * @returns {Promise<{ok:boolean, id?:string, xato?:string}>}
 */
export async function smsYubor(e164, matn) {
  if (!smsYoqilganmi()) return { ok: false, xato: 'sozlanmagan' };
  if (!smsGaYaroqlimi(e164)) return { ok: false, xato: 'raqam' };

  const yubor = async () => {
    const fd = new FormData();
    fd.append('mobile_phone', String(e164).replace(/\D/g, ''));
    fd.append('message', matn);
    fd.append('from', config.eskizFrom);
    return fetch(`${config.eskizApi}/message/sms/send`, {
      method: 'POST', body: fd,
      headers: { Authorization: `Bearer ${token || await kirish()}` },
      signal: AbortSignal.timeout(10_000),
    });
  };

  try {
    let res = await yubor();
    // Token muddati o'tgan (30 kun) — bir marta qayta kiramiz
    if (res.status === 401) { token = null; await kirish(); res = await yubor(); }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('SMS:', res.status, j?.message || '');
      return { ok: false, xato: String(j?.message || res.status) };
    }
    return { ok: true, id: String(j?.id || '') };
  } catch (e) {
    console.error('SMS:', e.message);
    return { ok: false, xato: e.message };
  }
}

/** Sinov uchun — saqlangan token tozalanadi. */
export const smsTokeniniUnut = () => { token = null; };
