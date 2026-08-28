// Telegram HTML formatlash yordamchilari.
// Telegram jadvalni qo'llab-quvvatlamaydi, shuning uchun jadval <pre> bloki
// ichida bo'shliq bilan tekislanadi. Muhim: <pre> ichiga EMOJI qo'ymaymiz —
// emoji ikki belgi enida chiziladi va ustunlar siljib ketadi.

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const narx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ') + " so'm";
export const raqam = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');

/** Belgi kengligi: emoji va boshqa keng belgilarni 2 deb hisoblaydi. */
function eni(s) {
  let w = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && (c <= 0x115f || c === 0x2329 || c === 0x232a ||
      (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) ||
      (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) ||
      (c >= 0x1f300 && c <= 0x1faff) || (c >= 0x1f000 && c <= 0x1f2ff))) ? 2 : 1;
  }
  return w;
}

function kes(s, max) {
  s = String(s ?? '');
  if (eni(s) <= max) return s;
  let out = '';
  for (const ch of s) {
    if (eni(out + ch) > max - 1) break;
    out += ch;
  }
  return out + '…';
}

const tekisla = (s, w, ong = false) => {
  const t = kes(s, w);
  const bosh = ' '.repeat(Math.max(0, w - eni(t)));
  return ong ? bosh + t : t + bosh;
};

/**
 * Telegram uchun matnli jadval.
 * @param {string[]} sarlavha
 * @param {Array<Array<string|number>>} qatorlar
 * @param {{eni?:number[], ong?:boolean[]}} opt
 */
export function jadval(sarlavha, qatorlar, opt = {}) {
  const n = sarlavha.length;
  const ong = opt.ong || Array(n).fill(false);
  const eniler = opt.eni || sarlavha.map((h, i) =>
    Math.min(22, Math.max(eni(h), ...qatorlar.map((r) => eni(r[i] ?? '')))));

  const chiziq = (qator, ustun) =>
    qator.map((c, i) => tekisla(c, eniler[i], ong[i])).join(' ' + ustun + ' ');

  const ajratgich = eniler.map((w) => '─'.repeat(w)).join('─┼─');

  const satrlar = [
    chiziq(sarlavha, '│'),
    ajratgich,
    ...qatorlar.map((r) => chiziq(r.map((c) => String(c ?? '')), '│')),
  ];
  return `<pre>${esc(satrlar.join('\n'))}</pre>`;
}

/** Ikki ustunli "kalit: qiymat" bloki — jadvaldan ixchamroq, mobil uchun qulay. */
export function royxat(juftlar) {
  const w = Math.max(...juftlar.map(([k]) => eni(k)));
  const satrlar = juftlar.map(([k, v]) => `${tekisla(k, w)}  ${v}`);
  return `<pre>${esc(satrlar.join('\n'))}</pre>`;
}

/** 0-100 -> ██████░░░░ 62 */
export function shkala(qiymat, uzunlik = 10) {
  const v = Math.min(100, Math.max(0, Number(qiymat) || 0));
  const toldi = Math.round((v / 100) * uzunlik);
  return '█'.repeat(toldi) + '░'.repeat(uzunlik - toldi);
}

export const darajaBelgi = (d) => ['', '▁ yengil', '▄ o‘rtacha', '█ kuchli'][Math.min(3, Math.max(1, d))];

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
