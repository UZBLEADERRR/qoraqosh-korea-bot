// Barcha tugmalar inline. Yagona istisno — telefon so'rash:
// Telegram `request_contact` ni faqat pastki (reply) klaviaturada beradi.
import { config } from '../config.js';
import { ilovaTugmasi } from '../lib/ilova-havola.js';

export const appUrl = (yol = '/app/') => (config.publicUrl ? `${config.publicUrl}${yol}` : null);

/** Mini App tugmasi; PUBLIC_URL yo'q bo'lsa null. */
export function appTugma(matn, yol = '/app/') {
  const url = appUrl(yol);
  return url ? { text: matn, web_app: { url } } : null;
}

/**
 * Asosiy menyu — atigi IKKI tugma.
 *
 * Buyurtmalar, profil, konsultatsiya va yordam ILOVADAGI «Profil»
 * bo'limiga ko'chirildi: botda oltita tugma ko'rinsa odam qayerga
 * bosishni bilmay qoladi va asosiy amal — skaner va do'kon — ko'zdan
 * yo'qoladi. Eski xabarlardagi tugmalar hali ham ishlaydi (callback
 * ishlovchilari joyida turibdi).
 *
 * @param {boolean} adminmi  admin bo'lsa panel tugmasi ham qo'shiladi
 */
export async function asosiyMenyu(adminmi = false) {
  const qatorlar = [[{ text: '🔬 Yuz skaneri', callback_data: 'skaner' }]];

  // Do'kon tugmasi: qisqa nom sozlangan bo'lsa to'g'ridan-to'g'ri
  // ilova havolasi bo'ladi — shunda bosh ekrandagi yorliq ham
  // ilovani ochadi, bot suhbatini emas.
  const katalog = await ilovaTugmasi('🛍 Do‘kon', '/app/');
  if (katalog) qatorlar.push([katalog]);

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

/**
 * Tahlil natijasi ostidagi tugmalar.
 *
 * Botdagi xabar qisqa — muammo, sabab, yechim va mahsulotlarning to'liq
 * tafsiloti shu birinchi tugma ostida, ilovada.
 */
export function natijaTugmalari() {
  const qatorlar = [];
  const toliq = appTugma('💡 Tavsiyani ochish', '/app/?tab=natija');
  const savatga = appTugma('🛒 Hammasini savatga', '/app/?tavsiya=1');
  if (toliq)   qatorlar.push([toliq]);
  if (savatga) qatorlar.push([savatga]);
  qatorlar.push([{ text: '🔄 Qayta skanerlash', callback_data: 'skaner' }]);
  return { inline_keyboard: qatorlar };
}

export const ortga = () => ({ inline_keyboard: [[{ text: '⬅️ Menyu', callback_data: 'menyu' }]] });
