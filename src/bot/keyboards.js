import { config } from '../config.js';

export const miniAppUrl = (yol = '/') =>
  config.publicUrl ? `${config.publicUrl}${yol}` : null;

/** Asosiy menyu — doimiy pastki klaviatura. */
export function asosiyMenyu() {
  return {
    keyboard: [
      [{ text: '🔬 Yuz skaneri' }],
      [{ text: '🛍 Katalog' }, { text: '🛒 Savatim' }],
      [{ text: '📋 Buyurtmalarim' }, { text: '👤 Profilim' }],
      [{ text: 'ℹ️ Yordam' }],
    ],
    resize_keyboard: true,
  };
}

export const telefonSora = () => ({
  keyboard: [[{ text: "📱 Telefon raqamimni ulashish", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

export const jinsSora = () => ({
  inline_keyboard: [[
    { text: '👩 Ayol', callback_data: 'jins:ayol' },
    { text: '👨 Erkak', callback_data: 'jins:erkak' },
  ]],
});

export function shartnomaTugmalari() {
  const url = miniAppUrl('/oferta');
  const qator = [];
  if (url) qator.push([{ text: '📄 Shartnomani ko\'rish', url }]);
  qator.push([{ text: "✅ Barchasiga roziman", callback_data: 'roziman' }]);
  return { inline_keyboard: qator };
}

/** Mini App tugmasi — mavjud bo'lsa web_app, aks holda oddiy havola. */
export function katalogTugmasi(matn = '🛍 Katalogni ochish', yol = '/app/') {
  const url = miniAppUrl(yol);
  if (!url) return null;
  return { inline_keyboard: [[{ text: matn, web_app: { url } }]] };
}
