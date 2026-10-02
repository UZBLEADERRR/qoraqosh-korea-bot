// Google bilan kirish — ID tokenni SERVERDA tekshirish.
//
// Brauzerdagi Google tugmasi foydalanuvchiga imzolangan token (JWT)
// beradi. Unga ko'r-ko'rona ishonib bo'lmaydi: har kim o'zi «token»
// yasab yuborishi mumkin. Shuning uchun:
//   1. imzo Google'ning ochiq kalitlari bilan tekshiriladi (RS256);
//   2. token AYNAN bizning ilovamiz uchun berilgani (aud);
//   3. Google bergani (iss) va muddati o'tmagani (exp);
//   4. email Google tomonidan tasdiqlangani.
//
// Kutubxona QO'SHILMAYDI: `google-auth-library` o'nlab bog'liqlik olib
// keladi, bizga esa Node'ning o'z `crypto` si yetarli.
import crypto from 'node:crypto';
import { config } from '../config.js';

const ISSUERLAR = new Set(['accounts.google.com', 'https://accounts.google.com']);
// Soatlar biroz farq qilishi mumkin — bir daqiqa yon beramiz
const YON_BERISH_MS = 60_000;

let kesh = { kalitlar: null, gacha: 0 };

/** Google'ning ochiq kalitlari. `Cache-Control: max-age` bo'yicha keshlanadi. */
async function googleKalitlari({ yangila = false } = {}) {
  if (!yangila && kesh.kalitlar && Date.now() < kesh.gacha) return kesh.kalitlar;
  const res = await fetch(config.googleJwks, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`GOOGLE_KALIT: HTTP ${res.status}`);
  const j = await res.json();
  const maxAge = Number((/max-age=(\d+)/.exec(res.headers.get('cache-control') || '') || [])[1]);
  kesh = { kalitlar: j.keys || [], gacha: Date.now() + (maxAge > 0 ? maxAge : 3600) * 1000 };
  return kesh.kalitlar;
}

/** Sinov uchun: kesh tozalanadi. */
export const kalitKeshiniUnut = () => { kesh = { kalitlar: null, gacha: 0 }; };

const b64json = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

/**
 * ID tokenni tekshiradi.
 *
 * @param {string} jwt
 * @param {object} [o]
 * @param {string} [o.clientId]     kutilgan `aud` (standart — GOOGLE_CLIENT_ID)
 * @param {Function} [o.kalitlarOl] sinovda soxta kalitlar beriladi
 * @param {number} [o.hozir]        sinovda vaqt
 * @returns {Promise<{sub:string, email:string, ism:string, rasm:string}>}
 * @throws Error('GOOGLE_TOKEN: <sabab>')
 */
export async function googleTokeniniTekshir(jwt, {
  clientId = config.googleClientId,
  kalitlarOl = googleKalitlari,
  hozir = Date.now(),
} = {}) {
  const yiqil = (sabab) => { throw new Error(`GOOGLE_TOKEN: ${sabab}`); };
  if (!clientId) yiqil('sozlanmagan');

  const qism = String(jwt || '').split('.');
  if (qism.length !== 3) yiqil('shakl');
  let bosh, tana;
  try { bosh = b64json(qism[0]); tana = b64json(qism[1]); } catch { yiqil('shakl'); }
  if (bosh.alg !== 'RS256' || !bosh.kid) yiqil('algoritm');

  // Kalit topilmasa — Google kalitlarni almashtirgan bo'lishi mumkin,
  // bir marta yangilab ko'ramiz
  let kalit = (await kalitlarOl()).find((k) => k.kid === bosh.kid);
  if (!kalit) kalit = (await kalitlarOl({ yangila: true })).find((k) => k.kid === bosh.kid);
  if (!kalit) yiqil('kalit');

  const imzoTogri = crypto.verify('RSA-SHA256',
    Buffer.from(`${qism[0]}.${qism[1]}`),
    crypto.createPublicKey({ key: kalit, format: 'jwk' }),
    Buffer.from(qism[2], 'base64url'));
  if (!imzoTogri) yiqil('imzo');

  if (!ISSUERLAR.has(tana.iss)) yiqil('iss');
  const aud = Array.isArray(tana.aud) ? tana.aud : [tana.aud];
  if (!aud.includes(clientId)) yiqil('aud');
  if (!(Number(tana.exp) * 1000 > hozir - YON_BERISH_MS)) yiqil('muddat');
  if (Number(tana.iat) * 1000 > hozir + 5 * YON_BERISH_MS) yiqil('iat');
  if (!tana.sub) yiqil('sub');
  // Tasdiqlanmagan email bilan birovning hisobiga bog'lanib qolish mumkin edi
  if (tana.email && tana.email_verified !== true && tana.email_verified !== 'true') yiqil('email');

  return {
    sub: String(tana.sub),
    email: String(tana.email || '').toLowerCase(),
    ism: String(tana.name || tana.given_name || '').trim().slice(0, 70),
    rasm: String(tana.picture || ''),
  };
}
