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

/** 0–100 → ▓▓▓▓▓▓░░░░ (proporsional shriftda ham tekis ko'rinadi) */
export function shkala(qiymat, uzunlik = 10) {
  const v = Math.min(100, Math.max(0, Number(qiymat) || 0));
  const toldi = Math.round((v / 100) * uzunlik);
  return '▓'.repeat(toldi) + '░'.repeat(uzunlik - toldi);
}

/** Muammo darajasi → rangli nuqta */
export const daraja = (d) => ['', '🟢', '🟡', '🔴'][Math.min(3, Math.max(1, Number(d) || 1))];
export const darajaSoz = (d) => ['', 'yengil', "o'rtacha", 'kuchli'][Math.min(3, Math.max(1, Number(d) || 1))];

/** "🔹 <b>Kalit</b> — qiymat" ko'rinishidagi qator. */
export const satr = (emoji, kalit, qiymat) =>
  `${emoji} <b>${esc(kalit)}</b>${qiymat ? ' — ' + esc(qiymat) : ''}`;

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
