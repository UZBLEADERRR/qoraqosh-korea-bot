// PUSH BILDIRISHNOMA — Web Push (RFC 8030), shifrlash RFC 8291
// (aes128gcm), server imzosi VAPID (RFC 8292).
//
// Tashqi kutubxona yo'q: hammasi `node:crypto` da. Bu ataylab — loyiha
// bitta bog'liqlik bilan yashaydi va bu kod 150 qatordan oshmaydi.
//
// Android ilovada (TWA) bildirishnoma Chrome orqali keladi, lekin
// telefonda KiOVO nomi va ikonkasi bilan ko'rinadi: ilova manifestida
// DelegationService bor (android/app/src/main/AndroidManifest.xml).
//
// VAPID KALITI SAQLANMAYDI: u ADMIN_JWT_SECRET dan hisoblanadi. Shuning
// uchun hech qanday sozlash kerak emas, deploydan deployga o'zgarmaydi
// va bazada (sozlamalar, eksport, agentning SQL'i) ko'rinmaydi. Kerak
// bo'lsa VAPID_KALIT (32 bayt, base64url) bilan almashtiriladi.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { qatorlar, sorov } from '../db.js';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const b64uOch = (s) => Buffer.from(String(s || ''), 'base64url');

// ── VAPID kaliti ──
let kalit = null;
function vapid() {
  if (kalit) return kalit;
  const d = config.vapidKalit
    ? b64uOch(config.vapidKalit)
    : Buffer.from(crypto.hkdfSync('sha256', String(config.adminSecret || ''), 'kiovo-vapid',
        'KiOVO web push VAPID kaliti', 32));
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(d);
  const ochiq = ecdh.getPublicKey();                 // 65 bayt, 0x04 || x || y
  const yopiq = crypto.createPrivateKey({ format: 'jwk', key: {
    kty: 'EC', crv: 'P-256', d: b64u(d),
    x: b64u(ochiq.subarray(1, 33)), y: b64u(ochiq.subarray(33, 65)) } });
  kalit = { ochiq, ochiqB64: b64u(ochiq), yopiq };
  return kalit;
}

/** Brauzer `pushManager.subscribe` ga beradigan ochiq kalit. */
export const ochiqKalit = () => vapid().ochiqB64;

/** Sinov uchun: kalit qayta hisoblansin. */
export const kalitniUnut = () => { kalit = null; };

// ── Obuna manzili ──
// Faqat MA'LUM push xizmatlari. Aks holda «obuna» niqobida server
// istalgan manzilga (masalan, ichki tarmoqqa) so'rov yuboradigan
// bo'lib qolardi.
const XIZMATLAR = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/i;

export function manzilYaroqlimi(endpoint) {
  let u;
  try { u = new URL(String(endpoint || '')); } catch { return false; }
  if (String(endpoint).length > 1000) return false;
  if (config.pushSinovXost && u.host === config.pushSinovXost) return true;   // faqat sinovda
  return u.protocol === 'https:' && !u.port && XIZMATLAR.test(u.hostname);
}

// ── Shifrlash (RFC 8291 + RFC 8188) ──
/**
 * @param {Buffer} matn        yuboriladigan ma'lumot
 * @param {Buffer} uaOchiq     brauzerning p256dh kaliti (65 bayt)
 * @param {Buffer} uaSir       brauzerning auth siri (16 bayt)
 * @returns {Buffer} so'rov tanasi
 */
export function shifrla(matn, uaOchiq, uaSir, { tuz = crypto.randomBytes(16), ecdh = null } = {}) {
  const as = ecdh || crypto.createECDH('prime256v1');
  if (!ecdh) as.generateKeys();
  const asOchiq = as.getPublicKey();
  const umumiy = as.computeSecret(uaOchiq);

  const kalitInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaOchiq, asOchiq]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', umumiy, uaSir, kalitInfo, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, tuz, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, tuz, Buffer.from('Content-Encoding: nonce\0'), 12));

  const sh = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  // 0x02 — «oxirgi yozuv» belgisi (RFC 8188)
  const shifr = Buffer.concat([sh.update(Buffer.concat([matn, Buffer.from([2])])), sh.final(), sh.getAuthTag()]);

  const sarlavha = Buffer.alloc(21);
  tuz.copy(sarlavha, 0);
  sarlavha.writeUInt32BE(4096, 16);
  sarlavha.writeUInt8(asOchiq.length, 20);
  return Buffer.concat([sarlavha, asOchiq, shifr]);
}

/** VAPID imzosi — push xizmati so'rov bizdan ekanini shundan biladi. */
export function vapidSarlavha(endpoint, hozir = Math.floor(Date.now() / 1000)) {
  const { yopiq, ochiqB64 } = vapid();
  const aud = new URL(endpoint).origin;
  const sub = /^https:\/\//.test(config.saytUrl || '') ? config.saytUrl : 'https://kiovo.shop';
  const qism = `${b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${b64u(JSON.stringify({ aud, exp: hozir + 12 * 3600, sub }))}`;
  const imzo = crypto.sign('sha256', Buffer.from(qism), { key: yopiq, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${qism}.${b64u(imzo)}, k=${ochiqB64}`;
}

/**
 * Bitta obunaga yuboradi.
 * @returns {Promise<{ok:boolean, kod?:number, ketdi?:boolean}>} ketdi — obuna endi yaroqsiz
 */
export async function obunagaYubor(obuna, yuk, { ttl = 86400, shoshilinch = 'normal' } = {}) {
  if (!manzilYaroqlimi(obuna.endpoint)) return { ok: false, ketdi: true };
  const tana = shifrla(Buffer.from(JSON.stringify(yuk)), b64uOch(obuna.p256dh), b64uOch(obuna.auth));
  try {
    const r = await fetch(obuna.endpoint, {
      method: 'POST', body: tana, signal: AbortSignal.timeout(10_000),
      headers: { TTL: String(ttl), Urgency: shoshilinch, 'Content-Encoding': 'aes128gcm',
                 'Content-Type': 'application/octet-stream', Authorization: vapidSarlavha(obuna.endpoint) },
    });
    // 404/410 — obuna bekor qilingan; 403 — boshqa kalit bilan yozilgan
    return { ok: r.status >= 200 && r.status < 300, kod: r.status, ketdi: [403, 404, 410].includes(r.status) };
  } catch (e) {
    return { ok: false, xato: e.message };
  }
}

// ── Baza ──
export async function obunaSaqla(userId, { endpoint, keys } = {}, qurilma = '') {
  if (!manzilYaroqlimi(endpoint)) return { xato: 'Bu bildirishnoma manzili qabul qilinmaydi.' };
  const p256dh = String(keys?.p256dh || ''), auth = String(keys?.auth || '');
  if (b64uOch(p256dh).length !== 65 || b64uOch(auth).length !== 16) return { xato: 'Kalitlar noto‘g‘ri.' };
  // Bir qurilma boshqa hisob bilan kirsa — obuna yangi egaga o'tadi
  await sorov(
    `insert into push_obunalar (user_id, endpoint, p256dh, auth, qurilma)
     values ($1, $2, $3, $4, $5)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh,
            auth = excluded.auth, qurilma = excluded.qurilma, xatolar = 0`,
    [userId, endpoint, p256dh, auth, String(qurilma || '').slice(0, 200)]);
  return { ok: true };
}

export const obunaOchir = (userId, endpoint) =>
  sorov('delete from push_obunalar where user_id = $1 and endpoint = $2', [userId, String(endpoint || '')]);

export async function obunaBormi(userId) {
  const r = await qatorlar('select 1 from push_obunalar where user_id = $1 limit 1', [userId]);
  return r.length > 0;
}

/** Telegram HTML'idan oddiy matn — bildirishnoma HTML ko'rsatmaydi. */
export const oddiyMatn = (html) => String(html || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\n{3,}/g, '\n\n').trim();

/**
 * Foydalanuvchining HAMMA qurilmasiga yuboradi.
 * @param {object} x  {sarlavha, matn, havola, teg}
 * @returns {Promise<number>} yetib borganlar soni
 */
export async function foydalanuvchigaPush(userId, { sarlavha, matn, havola = '/app/', teg = '' }) {
  if (!userId) return 0;
  const obunalar = await qatorlar('select * from push_obunalar where user_id = $1', [userId]);
  if (!obunalar.length) return 0;
  const yuk = { sarlavha: String(sarlavha || 'KiOVO').slice(0, 120),
                matn: oddiyMatn(matn).slice(0, 400), havola, teg: String(teg || '').slice(0, 60) };
  let yetdi = 0;
  for (const o of obunalar) {
    const j = await obunagaYubor(o, yuk);
    if (j.ok) {
      yetdi++;
      await sorov('update push_obunalar set oxirgi_marta = now(), xatolar = 0 where id = $1', [o.id]);
    } else if (j.ketdi) {
      await sorov('delete from push_obunalar where id = $1', [o.id]);
    } else {
      // Vaqtinchalik xato — 5 marta ketma-ket bo'lsa obuna tashlanadi
      await sorov(`delete from push_obunalar where id = $1 and xatolar >= 4`, [o.id]);
      await sorov('update push_obunalar set xatolar = xatolar + 1 where id = $1', [o.id]);
    }
  }
  return yetdi;
}
