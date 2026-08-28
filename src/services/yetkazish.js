// Yetkazib berish narxini hisoblash.
//
// Biz mijozning uyigacha o'zimiz eltmaymiz — jo'natma pochta orqali ketadi:
//   • filial — mijoz eng yaqin pochta filialidan olib ketadi (arzonroq)
//   • uy     — pochta mijozning manziligacha yetkazadi
//
// Narx OG'IRLIKKA qarab. Qadoqlash uchun ustiga qo'shimcha gramm qo'shiladi.
//
// Provayder: EMU yoki BTS ning API si sozlangan bo'lsa o'shandan so'raladi.
// API javob bermasa yoki sozlanmagan bo'lsa — sozlamalardagi tarif jadvali
// ishlaydi. Narx hech qachon "hisoblab bo'lmadi" bo'lib qolmaydi, aks holda
// mijoz buyurtmani tugata olmasdi.
import { qatorlar, sozlama } from '../db.js';
import { kesh } from '../lib/kesh.js';

export const TURLAR = {
  filial: { kalit: 'filial', nom: 'Pochta filialidan olib ketaman', emoji: '🏤' },
  uy:     { kalit: 'uy',     nom: 'Manzilimgacha yetkazilsin',      emoji: '🏠' },
};

export const turTozala = (t) => (String(t) === 'uy' ? 'uy' : 'filial');

/** Sozlamalarni bir marta o'qib, 60 soniya keshda saqlaymiz. */
const sozlamalar = () => kesh('yetkazish-sozlama', 60_000, async () => {
  const [provayder, filial1, uy1, qoshimcha, qadoq, standart, apiUrl, apiKalit, jonatuvchi] =
    await Promise.all([
      sozlama('yetkazish_provayder', 'emu'),
      sozlama('tarif_filial_1kg', 7000),
      sozlama('tarif_uy_1kg', 15000),
      sozlama('tarif_qoshimcha_kg', 5000),
      sozlama('qadoq_ogirlik', 200),
      sozlama('standart_ogirlik', 150),
      sozlama('yetkazish_api_url', ''),
      sozlama('yetkazish_api_kalit', ''),
      sozlama('jonatuvchi_viloyat', 'Toshkent shahri'),
    ]);
  const son = (v, z) => {
    const n = Number(String(v ?? '').replace(/"/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : z;
  };
  const matn = (v) => String(v ?? '').replace(/"/g, '').trim();
  return {
    provayder: matn(provayder) || 'emu',
    filial1:   son(filial1, 7000),
    uy1:       son(uy1, 15000),
    qoshimcha: son(qoshimcha, 5000),
    qadoq:     son(qadoq, 200),
    standart:  son(standart, 150),
    apiUrl:    matn(apiUrl),
    apiKalit:  matn(apiKalit),
    jonatuvchi: matn(jonatuvchi) || 'Toshkent shahri',
  };
});

/**
 * Savatning og'irligi (gramm) — qadoqlash bilan birga.
 * @param {Array<{product_id:number, quantity:number}>} items
 */
export async function ogirlikHisobla(items) {
  const s = await sozlamalar();
  const idlar = items.map((i) => Number(i.product_id)).filter(Boolean);
  if (!idlar.length) return s.qadoq;

  const mahsulotlar = await qatorlar(
    'select id, ogirlik from products where id = any($1)', [idlar]);
  const karta = new Map(mahsulotlar.map((p) => [Number(p.id), Number(p.ogirlik) || 0]));

  let jami = 0;
  for (const i of items) {
    const bir = karta.get(Number(i.product_id)) || s.standart;
    jami += bir * Math.max(1, Number(i.quantity) || 1);
  }
  return jami + s.qadoq;   // qutining o'zi ham og'irlik qiladi
}

/** Grammni to'liq kilogrammga yaxlitlaydi — pochta shunday hisoblaydi. */
export const kg = (gramm) => Math.max(1, Math.ceil(Number(gramm || 0) / 1000));

/**
 * Tarif jadvali bo'yicha narx. API bo'lmasa shu ishlaydi.
 * @param {'filial'|'uy'} turi
 * @param {number} gramm
 */
async function jadvalNarxi(turi, gramm) {
  const s = await sozlamalar();
  const kilo = kg(gramm);
  const asos = turi === 'uy' ? s.uy1 : s.filial1;
  return asos + Math.max(0, kilo - 1) * s.qoshimcha;
}

/**
 * Provayder API sidan so'rash. Sozlanmagan yoki javob bermasa null.
 *
 * API shartnomasi provayderga qarab farq qiladi va uni hujjatsiz aniqlab
 * bo'lmaydi, shuning uchun umumiy ko'rinishda yuboramiz va javobdan narxni
 * qidiramiz. Ishlamasa jadvalga tushamiz — mijoz buyurtmani baribir tugatadi.
 */
async function apiNarxi(turi, gramm, viloyat, tuman) {
  const s = await sozlamalar();
  if (!s.apiUrl) return null;

  const boshqaruv = AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined;
  try {
    const r = await fetch(s.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKalit ? { Authorization: `Bearer ${s.apiKalit}` } : {}),
      },
      body: JSON.stringify({
        provider: s.provayder,
        from_region: s.jonatuvchi,
        to_region: viloyat || '',
        to_district: tuman || '',
        weight_g: gramm,
        weight_kg: kg(gramm),
        delivery_type: turi,        // filial | uy
      }),
      signal: boshqaruv,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    // Turli API turlicha nomlaydi — birinchi topilgan sonni olamiz
    const narx = j?.price ?? j?.cost ?? j?.summa ?? j?.narx ?? j?.result?.price;
    const n = Number(narx);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  } catch (e) {
    console.warn('YETKAZISH API:', e.message, '— tarif jadvaliga o‘tildi');
    return null;
  }
}

/**
 * Yetkazish narxi.
 * @returns {Promise<{narx:number, gramm:number, kilo:number, turi:string, manba:'api'|'jadval'}>}
 */
export async function yetkazishNarxi({ items, turi, viloyat, tuman, gramm }) {
  const t = turTozala(turi);
  const og = gramm ?? await ogirlikHisobla(items || []);
  const api = await apiNarxi(t, og, viloyat, tuman);
  return {
    narx: api ?? await jadvalNarxi(t, og),
    gramm: og,
    kilo: kg(og),
    turi: t,
    manba: api != null ? 'api' : 'jadval',
  };
}

/** Ikkala variant uchun narx — mijoz tanlashi uchun. */
export async function variantlar({ items, viloyat, tuman }) {
  const gramm = await ogirlikHisobla(items || []);
  const [filial, uy] = await Promise.all([
    yetkazishNarxi({ turi: 'filial', viloyat, tuman, gramm }),
    yetkazishNarxi({ turi: 'uy', viloyat, tuman, gramm }),
  ]);
  return { gramm, kilo: kg(gramm), filial, uy };
}

/** Bepul yetkazish chegarasi (subtotal shundan oshsa narx 0). */
export const bepulChegara = async () =>
  Number(String(await sozlama('free_delivery_from', 500000)).replace(/"/g, '')) || 500000;
