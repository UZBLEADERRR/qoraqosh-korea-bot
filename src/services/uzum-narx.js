// Uzum Market'dagi narxni tekshirish.
//
// Maqsad: aynan shu mahsulot Uzum'da sotilayotgan bo'lsa, biz undan
// ozgina ARZON turishimiz kerak — odam narxni solishtiradi.
//
// Muhim cheklovlar:
//  - Uzum rasmiy ochiq API bermaydi. Quyidagi so'rov ularning veb-sayti
//    ishlatadigan GraphQL uchiga boradi va istalgan payt o'zgarishi
//    mumkin. Shuning uchun HAR QANDAY xato "ma'lumot yo'q" deb
//    qabul qilinadi va narx o'z qoidamiz bo'yicha qoladi.
//  - Nomlar bir xil bo'lmaydi ("Anua Heartleaf Cleansing Oil 200ml" va
//    "ANUA Хартлиф гидрофильное масло"). Shuning uchun mos kelish
//    QAT'IY tekshiriladi: brend va kamida ikkita muhim so'z mos
//    kelmasa — hisobga olinmaydi. Noto'g'ri moslik narxni buzadi.
import { sozlama } from '../db.js';

const UZUM_API = 'https://graphql.uzum.uz/';
const VAQT_MS = 8000;

/** Nomlarni solishtirish uchun bir xil ko'rinishga keltiradi. */
const meyor = (s) => String(s || '').toLowerCase()
  .replace(/[’'`ʻʼ]/g, '')
  .replace(/[^a-z0-9Ѐ-ӿ]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Hajm, o'lcham va umumiy so'zlar moslikni hisoblashda ishtirok etmaydi
const BOSH_SOZ = new Set(['ml','g','gr','мл','г','ta','dona','for','the','and','va',
  'krem','cream','крем','set','pack','new','original','uchun']);

const sozlar = (s) => meyor(s).split(' ')
  .filter((w) => w.length > 2 && !BOSH_SOZ.has(w) && !/^\d+$/.test(w));

/**
 * Ikki nom bir mahsulotni bildiradimi.
 * Qat'iy: brend mos kelishi SHART, ustiga kamida 2 ta muhim so'z.
 */
export function mosKeladimi(bizniki, brend, ularniki) {
  const u = meyor(ularniki);
  if (!u) return false;
  if (brend && !u.includes(meyor(brend))) return false;

  const biz = sozlar(bizniki);
  if (biz.length < 2) return false;
  const mos = biz.filter((w) => u.includes(w)).length;
  return mos >= Math.min(2, biz.length);
}

/**
 * Uzum'da shu nom bo'yicha eng arzon mos taklifni topadi.
 * @returns {Promise<{narx:number, nom:string, havola:string}|null>}
 */
export async function uzumdaTop(nom, brend = '') {
  const qidiruv = `${brend} ${nom}`.trim().slice(0, 120);
  if (!qidiruv) return null;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), VAQT_MS);
  try {
    const res = await fetch(UZUM_API, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'uz-UZ',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      },
      body: JSON.stringify({
        operationName: 'getMakeSearch',
        variables: { queryInput: { showAdultContent: 'TRUE', text: qidiruv, pagination: { offset: 0, limit: 12 } } },
        query: `query getMakeSearch($queryInput: SearchQueryInput!) {
          makeSearch(query: $queryInput) {
            items { catalogCard { title minSellPrice productId } }
          }
        }`,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    const items = j?.data?.makeSearch?.items;
    if (!Array.isArray(items) || !items.length) return null;

    const nomzodlar = items
      .map((x) => x?.catalogCard)
      .filter((c) => c && Number(c.minSellPrice) > 0)
      .filter((c) => mosKeladimi(nom, brend, c.title))
      .map((c) => ({
        narx: Math.round(Number(c.minSellPrice)),
        nom: String(c.title || ''),
        havola: c.productId ? `https://uzum.uz/uz/product/${c.productId}` : '',
      }))
      .sort((a, b) => a.narx - b.narx);

    return nomzodlar[0] || null;
  } catch {
    return null;                       // tarmoq, sxema yoki vaqt xatosi
  } finally { clearTimeout(t); }
}

/**
 * Narxni Uzum'dan arzonroq qilib tuzatadi.
 *
 * Zararga sotmaymiz: narx hech qachon tannarx + yetkazishdan pastga
 * tushmaydi. Uzum bizdan arzon bo'lsa-yu, bu chegaradan past bo'lsa —
 * narx o'z qoidamiz bo'yicha qoladi.
 *
 * @param {{narx:number, tannarx:number, yetkazish:number}} hisob
 * @returns {Promise<{narx:number, uzum?:object, ozgardi:boolean}>}
 */
export async function uzumgaMoslab(hisob, nom, brend = '') {
  if (!(await sozlama('uzum_tekshir', false))) return { narx: hisob.narx, ozgardi: false };

  const farq = Number(await sozlama('uzum_arzon_farq', 1000)) || 1000;
  const u = await uzumdaTop(nom, brend);
  if (!u) return { narx: hisob.narx, ozgardi: false };

  const taklif = u.narx - farq;
  const eng_past = hisob.tannarx + hisob.yetkazish;      // zararga sotmaymiz
  if (taklif >= hisob.narx || taklif < eng_past) {
    return { narx: hisob.narx, uzum: u, ozgardi: false };
  }
  return { narx: Math.round(taklif / 1000) * 1000, uzum: u, ozgardi: true };
}
