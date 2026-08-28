// Ikki xil kirish:
//  1) Foydalanuvchi  — Telegram initData HMAC-SHA256 imzosi
//  2) Admin          — login/parol -> muddati cheklangan HMAC token (JWT uslubida)
import crypto from 'node:crypto';
import { config } from '../config.js';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 soat

// ---------- Telegram initData ----------
const MAX_AUTH_AGE = 24 * 60 * 60; // 24 soat

export function verifyInitData(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
    const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    const a = Buffer.from(hmac, 'utf8');
    const b = Buffer.from(hash, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    // Eskirgan initData qayta ishlatilmasin
    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || (Date.now() / 1000) - authDate > MAX_AUTH_AGE) return null;

    const user = JSON.parse(params.get('user') || 'null');
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

// ---------- Admin token ----------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => crypto.createHmac('sha256', config.adminSecret).update(p).digest('base64url');

export function issueAdminToken() {
  const payload = b64({ role: 'admin', exp: Date.now() + TOKEN_TTL_MS });
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { role, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return role === 'admin' && Date.now() < exp;
  } catch { return false; }
}

/** Login urinishlarini sekinlashtirish (brute-force himoyasi). */
const urinishlar = new Map();
export function loginBloklanganmi(ip) {
  const r = urinishlar.get(ip);
  if (!r) return false;
  if (Date.now() > r.until) { urinishlar.delete(ip); return false; }
  return r.count >= 5;
}
export function loginXato(ip) {
  const r = urinishlar.get(ip) || { count: 0, until: 0 };
  r.count += 1;
  r.until = Date.now() + 15 * 60 * 1000;
  urinishlar.set(ip, r);
}
export function loginTozala(ip) { urinishlar.delete(ip); }
