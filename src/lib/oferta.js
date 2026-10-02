// Ommaviy oferta sahifasi.
//
// Admin panelda o'z matni (yurist bergan hujjat) yozilsa — shu matn
// ko'rsatiladi. Bo'lmasa standart shablon. Sotuvchi ma'lumoti (ism,
// maqom, aloqa) sozlamadan keladi: ilgari shablonda kvadrat qavsdagi
// «[MCHJ / YaTT TO‘LIQ NOMI]» to'g'ridan-to'g'ri ochiq sahifada turardi.
import { huquqiyQobiq, ofertaStandart } from './huquqiy.js';

/**
 * Admin paneldan kelgan matnni HTML ga o'giradi.
 *
 * Admin oddiy matn yozadi (yurist bergan hujjatni ko'chirib qo'yadi),
 * biz uni sahifa ko'rinishiga solamiz. HTML teglari QO'YILMAYDI: aks holda
 * panelga tushgan har qanday matn sahifaga skript kiritishi mumkin bo'lardi.
 *
 *   # Sarlavha     -> h1
 *   ## Bo'lim      -> h2
 *   - band         -> ro'yxat
 *   bo'sh qator    -> yangi xatboshi
 */
function matndanHtml(xom) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const qatorlar = String(xom).split(/\r?\n/);
  const chiqish = [];
  let royxat = false;
  const royxatniYop = () => { if (royxat) { chiqish.push('</ul>'); royxat = false; } };

  for (const xomQator of qatorlar) {
    const q = xomQator.trim();
    if (!q) { royxatniYop(); continue; }
    if (q.startsWith('## ')) { royxatniYop(); chiqish.push(`<h2>${esc(q.slice(3))}</h2>`); continue; }
    if (q.startsWith('# '))  { royxatniYop(); chiqish.push(`<h1>${esc(q.slice(2))}</h1>`); continue; }
    if (/^[-•*]\s+/.test(q)) {
      if (!royxat) { chiqish.push('<ul>'); royxat = true; }
      chiqish.push(`<li>${esc(q.replace(/^[-•*]\s+/, ''))}</li>`);
      continue;
    }
    royxatniYop();
    chiqish.push(`<p>${esc(q)}</p>`);
  }
  royxatniYop();
  return chiqish.join('\n');
}

/**
 * Oferta sahifasi.
 *
 * @param {string} [xomMatn]  admin paneldagi matn. Bo'sh bo'lsa standart
 *   shablon (src/lib/huquqiy.js) — sotuvchi ma'lumoti sozlamadan qo'yiladi.
 * @param {object} s          sotuvchiMalumoti() natijasi
 */
export function ofertaSahifasi(xomMatn = '', s) {
  const ozi = String(xomMatn || '').trim();
  if (!ozi) return ofertaStandart(s);
  return huquqiyQobiq({ sarlavha: 'Ommaviy oferta', ichi: matndanHtml(ozi), s, faol: '/oferta' });
}
