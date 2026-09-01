// Xabar shablonlari — matnlar bazada, admin panelidan tahrirlanadi.
//
// {figurali qavs} — o'rin egallovchi. Noma'lum nom bo'sh qatorga aylanadi,
// shuning uchun admin shablonni buzib qo'ysa ham bot yiqilmaydi.
import { qatorlar } from '../db.js';

let kesh = null;
let keshVaqti = 0;
const TTL = 30_000;   // 30 soniya: admin o'zgartirsa tez ko'rinadi

/** Barcha shablonlarni bazadan o'qiydi (keshlangan). */
async function shablonlar() {
  if (kesh && Date.now() - keshVaqti < TTL) return kesh;
  try {
    const r = await qatorlar(
      `select key, value from settings
        where key like 'xabar\\_%' or key like 'blok\\_%' or key like 'ogohlantirish\\_%'`);
    kesh = new Map(r.map((s) => [s.key, String(s.value ?? '')]));
    keshVaqti = Date.now();
  } catch (e) {
    console.error('Shablonlarni o‘qishda xato:', e.message);
    if (!kesh) kesh = new Map();
  }
  return kesh;
}

/** Admin sozlamani saqlaganda darhol yangilanishi uchun. */
export function keshniTozala() { kesh = null; keshVaqti = 0; }

/** {nom} larni almashtiradi. Bo'sh qiymat — bo'sh satr. */
export function toldir(matn, qiymatlar = {}) {
  return String(matn || '').replace(/\{(\w+)\}/g, (_, nom) => {
    const v = qiymatlar[nom];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Shablonni bazadan olib to'ldiradi.
 * @param {string} kalit    settings kaliti (xabar_start, blok_muammo…)
 * @param {object} qiymatlar
 * @param {string} zaxira   shablon topilmasa ishlatiladigan matn
 */
export async function xabar(kalit, qiymatlar = {}, zaxira = '') {
  const s = await shablonlar();
  const shablon = s.get(kalit);
  return tozala(toldir(shablon || zaxira, qiymatlar));
}

/**
 * Shablon qoldiqlarini yig'ishtiradi.
 * O'rin egallovchi bo'sh bo'lsa (masalan zona aytilmagan) `<i></i>` kabi
 * bo'sh teg va bo'sh qator qolib ketardi — ularni olib tashlaymiz.
 */
function tozala(matn) {
  return matn
    .replace(/<(b|i|u|s|code)>\s*<\/\1>/g, '')   // bo'sh teg
    .replace(/^[ \t]*[·—-]?[ \t]*$/gm, '')        // faqat tinish qolgan qator
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

// ---------------- Ko'rsatkichlar ----------------
/** 0–100 → ■■■■■■■□□□  (Telegram'da ham, ilovada ham bir xil ko'rinadi) */
export function shkala(foiz, uzunlik = 10) {
  const v = Math.min(100, Math.max(0, Math.round(Number(foiz) || 0)));
  const toldi = Math.round((v / 100) * uzunlik);
  return '■'.repeat(toldi) + '□'.repeat(uzunlik - toldi);
}

/** Foizdan daraja: 1 yengil, 2 o'rtacha, 3 kuchli. */
export const darajaFoizdan = (foiz) => (foiz >= 70 ? 3 : foiz >= 40 ? 2 : 1);
export const darajaNuqta   = (d) => ['', '🟢', '🟡', '🔴'][Math.min(3, Math.max(1, d || 1))];
export const darajaSoz     = (d) => ['', 'yengil', 'o‘rtacha', 'kuchli'][Math.min(3, Math.max(1, d || 1))];
