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
import { zona, masofaTuri, emuNarxi, ZONA_IZOH, MASOFA_IZOH } from '../lib/emu-tarif.js';

export const TURLAR = {
  filial: { kalit: 'filial', nom: 'Pochta filialidan olib ketaman', emoji: '🏤' },
  uy:     { kalit: 'uy',     nom: 'Manzilimgacha yetkazilsin',      emoji: '🏠' },
};

export const turTozala = (t) => (String(t) === 'uy' ? 'uy' : 'filial');

/** Sozlamalarni bir marta o'qib, 60 soniya keshda saqlaymiz. */
const sozlamalar = () => kesh('yetkazish-sozlama', 60_000, async () => {
  const [provayder, filial1, uy1, qoshimcha, qadoq, standart, apiUrl, apiKalit,
         jonatuvchi, yaqin, qqs, ustama] =
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
      sozlama('emu_yaqin_tumanlar', {}),
      sozlama('yetkazish_qqs_foiz', 0),
      sozlama('yetkazish_ustama_foiz', 0),
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
    yaqin:     (yaqin && typeof yaqin === 'object' && !Array.isArray(yaqin)) ? yaqin : {},
    qqs:       son(qqs, 0),
    ustama:    son(ustama, 0),
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
 * EMU rasmiy tarif kartasi bo'yicha narx.
 * Zona (jo'natuvchi↔qabul qiluvchi viloyat), masofa (markaz / 40 km gacha /
 * uzoq) va og'irlikdan chiqadi.
 */
async function emuHisobi(turi, gramm, viloyat, tuman) {
  const s = await sozlamalar();
  const kilo = kg(gramm);
  const z = zona(s.jonatuvchi, viloyat);
  const masofa = masofaTuri(viloyat, tuman, s.yaqin[viloyat] || []);
  const asos = emuNarxi({ turi: turi === 'uy' ? 'uy' : 'ofis', zona: z, masofa, kg: kilo });

  // Ustama va QQS — ikkalasi ham asos narxdan hisoblanadi
  const ustama = Math.round(asos * s.ustama / 100);
  const qqs    = Math.round((asos + ustama) * s.qqs / 100);
  const jami   = asos + ustama + qqs;

  return {
    narx: yuzgacha(jami),
    izoh: {
      manba: 'emu', zona: z, zona_izoh: ZONA_IZOH[z],
      masofa, masofa_izoh: MASOFA_IZOH[masofa],
      kg: kilo, asos, ustama, qqs,
      jonatuvchi: s.jonatuvchi,
    },
  };
}

/** Oddiy jadval — admin EMU o'rniga o'z narxini qo'ymoqchi bo'lsa. */
async function jadvalNarxi(turi, gramm) {
  const s = await sozlamalar();
  const kilo = kg(gramm);
  const asos = turi === 'uy' ? s.uy1 : s.filial1;
  return { narx: asos + Math.max(0, kilo - 1) * s.qoshimcha,
           izoh: { manba: 'jadval', kg: kilo } };
}

/** Narxni 100 so'mgacha yaxlitlaymiz — "27 350" ko'rinishi g'alati. */
const yuzgacha = (n) => Math.round(n / 100) * 100;

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
  const s = await sozlamalar();
  const t = turTozala(turi);
  const og = gramm ?? await ogirlikHisobla(items || []);

  // 1) API sozlangan bo'lsa — undan
  const api = await apiNarxi(t, og, viloyat, tuman);
  if (api != null) {
    return { narx: api, gramm: og, kilo: kg(og), turi: t, manba: 'api',
             izoh: { manba: 'api', kg: kg(og) } };
  }

  // 2) Aks holda EMU rasmiy tarifi (yoki admin tanlagan oddiy jadval)
  const h = s.provayder === 'jadval'
    ? await jadvalNarxi(t, og)
    : await emuHisobi(t, og, viloyat, tuman);

  return { narx: h.narx, gramm: og, kilo: kg(og), turi: t,
           manba: h.izoh.manba, izoh: h.izoh };
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
