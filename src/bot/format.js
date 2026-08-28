// Telegram HTML formatlash.
//
// MUHIM: Telegram jadvalni qo'llab-quvvatlamaydi. Ilgari <pre> bloki bilan
// "jadval" chizilgan edi — telefonda u siqilib, ustunlar buzilib, ustiga
// "COPY CODE" tugmasi bilan chiqadi. Shuning uchun jadval umuman ishlatilmaydi:
// har bir qator emoji + qalin matn + nozik izoh ko'rinishida beriladi.

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const narx  = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ') + " so'm";
export const raqam = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');

// Shkala va daraja belgilari shablon.js da (u yerda shablonlar bilan birga ishlatiladi).

/** Uzun matnni Telegram chegarasiga (4096) sig'diradi. */
export function bolakla(matn, max = 3900) {
  if (matn.length <= max) return [matn];
  const bolaklar = [];
  let qoldi = matn;
  while (qoldi.length > max) {
    let kesish = qoldi.lastIndexOf('\n', max);
    if (kesish < max * 0.5) kesish = max;
    bolaklar.push(qoldi.slice(0, kesish));
    qoldi = qoldi.slice(kesish);
  }
  if (qoldi.trim()) bolaklar.push(qoldi);
  return bolaklar;
}
