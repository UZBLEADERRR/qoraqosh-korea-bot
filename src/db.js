// Supabase — service_role kaliti bilan. Bu kalit FAQAT shu serverda yashaydi.
// Frontend bazaga to'g'ridan-to'g'ri murojaat qilmaydi; hammasi API orqali.
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Xatoni tashlab yuboradigan yordamchi — har joyda `if (error)` yozmaslik uchun. */
export async function q(builder, nima = 'so\'rov') {
  const { data, error } = await builder;
  if (error) {
    const e = new Error(`${nima}: ${error.message}`);
    e.cause = error;
    throw e;
  }
  return data;
}

/** Sozlamani bazadan o'qish (settings jadvali). */
export async function setting(key, fallback = null) {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? fallback;
}

export async function logEvent(userId, type, meta = {}) {
  try {
    await db.from('events').insert({ user_id: userId ?? null, type, meta });
  } catch { /* analitika hech qachon asosiy oqimni to'xtatmasin */ }
}
