// Barcha tugmalar inline. Yagona istisno — telefon so'rash:
// Telegram `request_contact` ni faqat pastki (reply) klaviaturada beradi.
import { config } from '../config.js';

export const appUrl = (yol = '/app/') => (config.publicUrl ? `${config.publicUrl}${yol}` : null);

/** Mini App tugmasi; PUBLIC_URL yo'q bo'lsa null. */
export function appTugma(matn, yol = '/app/') {
  const url = appUrl(yol);
  return url ? { text: matn, web_app: { url } } : null;
}

/**
 * Asosiy menyu — inline.
 * @param {boolean} adminmi  admin bo'lsa panel tugmasi ham qo'shiladi
 */
export function asosiyMenyu(adminmi = false) {
  const qatorlar = [];
  const katalog = appTugma('🛍 Do‘kon', '/app/');
  const savat   = appTugma('🛒 Savatim', '/app/?tab=savat');

  qatorlar.push([{ text: '🔬 Yuz skaneri', callback_data: 'skaner' }]);
  if (katalog && savat) qatorlar.push([katalog, savat]);
  qatorlar.push([
    { text: '📋 Buyurtmalarim', callback_data: 'buyurtmalar' },
    { text: '💬 Konsultatsiya', callback_data: 'konsultatsiya' },
  ]);
  qatorlar.push([
    { text: '👤 Profilim', callback_data: 'profil' },
    { text: 'ℹ️ Yordam', callback_data: 'yordam' },
  ]);

  // Admin panel — faqat adminlarga ko'rinadi. Panel Telegram ID orqali
  // o'zi ham qayta tekshiradi, bu tugma shunchaki qulaylik.
  if (adminmi) {
    const panel = appTugma('⚙️ Admin panel', '/admin/');
    if (panel) qatorlar.push([panel]);
  }
  return { inline_keyboard: qatorlar };
}

export const telefonSora = () => ({
  keyboard: [[{ text: '📱 Raqamimni ulashish', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

export function shartnomaTugmalari() {
  const qatorlar = [];
  const url = config.publicUrl ? `${config.publicUrl}/oferta` : null;
  if (url) qatorlar.push([{ text: '📄 Shartnomani o‘qish', url }]);
  qatorlar.push([{ text: '✅ Roziman, davom etamiz', callback_data: 'roziman' }]);
  return { inline_keyboard: qatorlar };
}

/** Tahlil natijasi ostidagi tugmalar. */
export function natijaTugmalari() {
  const qatorlar = [];
  const toliq = appTugma('💡 To‘liq natija va tavsiya', '/app/?tab=natija');
  const savatga = appTugma('🛒 Hammasini savatga', '/app/?tavsiya=1');
  if (toliq)   qatorlar.push([toliq]);
  if (savatga) qatorlar.push([savatga]);
  qatorlar.push([
    { text: '🔄 Qayta skanerlash', callback_data: 'skaner' },
    { text: '💬 Konsultatsiya', callback_data: 'konsultatsiya' },
  ]);
  return { inline_keyboard: qatorlar };
}

export const ortga = () => ({ inline_keyboard: [[{ text: '⬅️ Menyu', callback_data: 'menyu' }]] });
