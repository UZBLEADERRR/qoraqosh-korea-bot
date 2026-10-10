// INSTAGRAM GRAPH API — yupqa mijoz (Instagram API with Instagram Login).
//
// Token ikki joydan: INSTAGRAM_ACCESS_TOKEN (Railway → Variables) yoki
// admin paneldagi «Instagram → Sozlamalar» da kiritilgani (bazada,
// `instagram_ulanish` sozlamasi). Uzoq muddatli token 60 kun yashaydi —
// har kuni yangilab turiladi (tokenniYangila).
//
// Hamma xato TUSHUNARLI matnga aylanadi: «Kutilmagan xatolik» o'rniga
// admin nima qilishni biladi (24 soatlik oyna yopilgan, token eskirgan…).
import { config } from '../../config.js';
import { sozlama, sorov, sozlamalarniUnut } from '../../db.js';

const KESH_MS = 60_000;
let kesh = null;

/** Ulanish: token va akkaunt (id, username). */
export async function ulanish() {
  if (kesh && Date.now() - kesh.vaqt < KESH_MS) return kesh.u;
  const s = await sozlama('instagram_ulanish', {}).catch(() => ({}));
  const u = {
    token: config.instagramToken || s?.token || '',
    akkaunt_id: s?.akkaunt_id || '',
    username: s?.username || '',
    manba: config.instagramToken ? 'env' : s?.token ? 'panel' : '',
    yangilangan: s?.yangilangan || null,
  };
  kesh = { u, vaqt: Date.now() };
  return u;
}
export const ulanishniUnut = () => { kesh = null; };
export const ulanganmi = async () => Boolean((await ulanish()).token);

/** Graph API xatosini tushunarli qiladi. */
function xatoMatni(kod, e = {}) {
  const c = e.code, sub = e.error_subcode;
  if (c === 190 || kod === 401) return 'Instagram tokeni eskirgan yoki noto‘g‘ri — Sozlamalarda yangi token kiriting.';
  if (c === 10 && /window|outside/i.test(e.message || '') || sub === 2534022 || sub === 2018278) {
    return 'Mijoz 24 soatdan beri yozmagan — Instagram bu suhbatga hozir xabar yuborishga ruxsat bermaydi.';
  }
  if (c === 100 && /comment/i.test(e.message || '')) return 'Komment topilmadi yoki o‘chirilgan.';
  if (c === 4 || c === 17 || c === 32 || c === 613 || kod === 429) return 'Instagram so‘rov chegarasi — bir ozdan keyin urinib ko‘ring.';
  if (c === 200 || c === 10) return `Ruxsat yo‘q: ${e.message || ''} (Meta ilovasida instagram_business_manage_messages / manage_comments ruxsatlarini tekshiring).`;
  return `Instagram xatosi${kod ? ` (${kod})` : ''}: ${String(e.message || 'noma’lum').slice(0, 200)}`;
}

/**
 * Bitta so'rov. `yol` — `/me/messages` kabi. GET da `qidiruv` so'rov
 * satriga, POST da tanaga ketadi.
 */
export async function ig(yol, { usul = 'GET', qidiruv = {}, tana = null, token } = {}) {
  const t = token || (await ulanish()).token;
  if (!t) throw Object.assign(new Error('Instagram ulanmagan — Sozlamalarda token kiriting.'), { turkum: 'ig_ulanmagan' });
  const u = new URL(yol.startsWith('http') ? yol : `${config.instagramApi}${yol}`);
  for (const [k, v] of Object.entries(qidiruv)) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', t);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(u, {
      method: usul, signal: ctrl.signal,
      headers: tana ? { 'Content-Type': 'application/json' } : {},
      body: tana ? JSON.stringify(tana) : undefined,
    });
  } catch (e) {
    throw Object.assign(new Error(`Instagram serveriga ulanib bo‘lmadi: ${e.name === 'AbortError' ? 'javob kelmadi' : e.message}`),
      { turkum: 'tarmoq' });
  } finally { clearTimeout(timer); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j?.error) {
    const e = j?.error || {};
    throw Object.assign(new Error(xatoMatni(res.status, e)), { turkum: 'ig', kod: res.status, ig: e });
  }
  return j;
}

/** Akkauntni aniqlaydi va token bilan saqlaydi (panel orqali ulanish). */
export async function tokenniSaqla(token) {
  const t = String(token || '').trim();
  if (t.length < 20) return { xato: 'Token juda qisqa — Meta Developer → Instagram → «Generate token» dan to‘liq nusxalang.' };
  const me = await ig('/me', { qidiruv: { fields: 'user_id,username,name,profile_picture_url' }, token: t });
  const qiymat = { token: t, akkaunt_id: String(me.user_id || me.id || ''), username: me.username || '',
    ism: me.name || '', rasm: me.profile_picture_url || '', yangilangan: new Date().toISOString() };
  await sorov(`insert into settings (key, value, updated_at) values ('instagram_ulanish', $1::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(qiymat)]);
  sozlamalarniUnut(); ulanishniUnut();
  return { username: qiymat.username, akkaunt_id: qiymat.akkaunt_id };
}

/** Akkaunt ma'lumoti (id ni ham to'ldiradi — webhookda o'z kommentimizni tanish uchun). */
export async function akkaunt() {
  const u = await ulanish();
  if (!u.token) return null;
  const me = await ig('/me', { qidiruv: { fields: 'user_id,username,name,profile_picture_url,followers_count,media_count' } });
  if (u.manba === 'panel' || !u.akkaunt_id) {
    const s = await sozlama('instagram_ulanish', {}).catch(() => ({}));
    await sorov(`insert into settings (key, value, updated_at) values ('instagram_ulanish', $1::jsonb, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify({ ...(s || {}), akkaunt_id: String(me.user_id || me.id || ''), username: me.username || '' })]);
    sozlamalarniUnut(); ulanishniUnut();
  }
  return me;
}

/** 60 kunlik tokenni uzaytiradi (kuniga bir marta chaqiriladi). Faqat paneldagi tokenni. */
export async function tokenniYangila() {
  const u = await ulanish();
  if (u.manba !== 'panel') return { ozgardi: false };
  const j = await ig('https://graph.instagram.com/refresh_access_token', { qidiruv: { grant_type: 'ig_refresh_token' } });
  if (!j.access_token) return { ozgardi: false };
  const s = await sozlama('instagram_ulanish', {});
  await sorov(`update settings set value = $1::jsonb, updated_at = now() where key = 'instagram_ulanish'`,
    [JSON.stringify({ ...s, token: j.access_token, yangilangan: new Date().toISOString() })]);
  sozlamalarniUnut(); ulanishniUnut();
  return { ozgardi: true };
}

// ── Xabarlar ──
export const matnYubor = (igsid, matn) =>
  ig('/me/messages', { usul: 'POST', tana: { recipient: { id: igsid }, message: { text: String(matn).slice(0, 1000) } } });
export const rasmYubor = (igsid, url) =>
  ig('/me/messages', { usul: 'POST', tana: { recipient: { id: igsid }, message: { attachment: { type: 'image', payload: { url } } } } });
export const yozmoqda = (igsid) =>
  ig('/me/messages', { usul: 'POST', tana: { recipient: { id: igsid }, sender_action: 'typing_on' } }).catch(() => null);
/** Kommentga Direct orqali «shaxsiy javob» (7 kun ichida, bitta xabar). */
export const kommentgaDm = (kommentId, matn) =>
  ig('/me/messages', { usul: 'POST', tana: { recipient: { comment_id: kommentId }, message: { text: String(matn).slice(0, 1000) } } });
export const profil = (igsid) => ig(`/${igsid}`, { qidiruv: { fields: 'name,username,profile_pic' } }).catch(() => null);

// ── Kommentlar va postlar ──
export const kommentgaJavob = (kommentId, matn) =>
  ig(`/${kommentId}/replies`, { usul: 'POST', qidiruv: { message: String(matn).slice(0, 300) } });
export const kommentYashir = (kommentId, ha = true) => ig(`/${kommentId}`, { usul: 'POST', qidiruv: { hide: ha } });
export const kommentOchir = (kommentId) => ig(`/${kommentId}`, { usul: 'DELETE' });
export const postlar = (chegara = 12) => ig('/me/media', {
  qidiruv: { fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count', limit: chegara } });
export const postKommentlari = (mediaId, chegara = 50) => ig(`/${mediaId}/comments`, {
  qidiruv: { fields: 'id,text,username,timestamp,from,hidden,parent_id', limit: chegara } });
/** Webhookni akkauntga ulash (Meta ilovasida webhook manzili kiritilgandan keyin). */
export const webhookniUla = () => ig('/me/subscribed_apps', {
  usul: 'POST', qidiruv: { subscribed_fields: 'messages,comments' } });
