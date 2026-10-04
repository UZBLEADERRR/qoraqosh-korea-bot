// SUPABASE orqali Google (Gmail) bilan kirish.
//
// Supabase Auth Google OAuth ni o'zi bajaradi: odam Google'da hisobini
// tanlaydi, Supabase uni bizning /kirish/supabase sahifamizga
// `#access_token=…` bilan qaytaradi. Biz bu tokenga ISHONMAYMIZ —
// serverda Supabase'ning o'zidan so'raymiz (/auth/v1/user): token
// haqiqiy bo'lsagina kim ekani (email, ism, Google sub) qaytadi.
//
// Nega Google Identity Services yetarli emas edi: u tugmani Google
// skripti bilan chizadi va ba'zi telefonlarda (Play'dagi ilova, eski
// WebView) ko'rinmay qolardi. Supabase oqimi oddiy sahifa almashishi —
// har qayerda ishlaydi.
//
// Sozlash: SUPABASE_URL va SUPABASE_ANON_KEY (Supabase → Project
// Settings → API). Supabase → Authentication → Providers → Google
// yoqiladi; URL Configuration → Redirect URLs ga
// https://www.kiovo.shop/kirish/supabase qo'shiladi.
import { config } from '../config.js';

export const supabaseYoqilganmi = () => Boolean(config.supabaseUrl && config.supabaseAnonKey);

/** Google'ga yo'naltirish manzili (Supabase orqali). */
export function supabaseKirishManzili(qaytish) {
  const u = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
  u.searchParams.set('provider', 'google');
  u.searchParams.set('redirect_to', qaytish);
  // Har safar hisob tanlash oynasi chiqsin — telefonda bir nechta Gmail bo'ladi
  u.searchParams.set('prompt', 'select_account');
  return u.toString();
}

/**
 * Tokenni Supabase'da tekshiradi.
 * @returns {Promise<{sub:string, email:string, ism:string}>}
 */
export async function supabaseTokeniniTekshir(token, { fetchFn = fetch } = {}) {
  const t = String(token || '');
  if (!supabaseYoqilganmi()) throw new Error('supabase sozlanmagan');
  if (!/^[A-Za-z0-9._-]{20,4096}$/.test(t)) throw new Error('token shakli noto‘g‘ri');
  const r = await fetchFn(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${t}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  const u = await r.json();
  const google = (u.identities || []).find((i) => i.provider === 'google');
  const email = String(u.email || google?.identity_data?.email || '').toLowerCase();
  // Tasdiqlanmagan email bilan birovning hisobiga ulanib bo'lmasin
  const tasdiq = Boolean(u.email_confirmed_at || google?.identity_data?.email_verified);
  if (!email || !tasdiq) throw new Error('email tasdiqlanmagan');
  // Google sub — Google tugmasi orqali kirganlar bilan BIR hisob bo'lsin
  const sub = google?.identity_data?.sub || google?.id || (u.id ? `sb:${u.id}` : '');
  if (!sub) throw new Error('foydalanuvchi aniqlanmadi');
  const m = u.user_metadata || {};
  return { sub: String(sub), email, ism: String(m.full_name || m.name || '').slice(0, 80) };
}
