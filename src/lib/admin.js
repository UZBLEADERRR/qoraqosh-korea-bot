// Kim admin? Bitta javob, ikki joyda ishlatiladi:
//   • bot — /start menyusida admin panel tugmasini ko'rsatish uchun
//   • admin API — Telegram orqali kirishda
//
// Ikkita manba bor: bazadagi users.is_admin va ADMIN_TELEGRAM_IDS muhit
// o'zgaruvchisi. Muhit o'zgaruvchisi "birinchi admin" muammosini yechadi:
// baza bo'sh bo'lganda ham egasi panelga kira oladi.
import { config } from '../config.js';

/** @param {{is_admin?:boolean, telegram_id?:string|number}} user */
export function adminmi(user) {
  if (!user) return false;
  if (user.is_admin) return true;
  return config.adminTelegramIds.includes(String(user.telegram_id ?? ''));
}

/** ENV ro'yxatidagi (ya'ni "tug'ma") adminmi. */
export const muhitAdmini = (telegramId) =>
  config.adminTelegramIds.includes(String(telegramId ?? ''));
