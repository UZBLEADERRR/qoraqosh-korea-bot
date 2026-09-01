// Ommaviy import — yuzlab mahsulotni bitta buyruq bilan.
//
// Muammo: bitta mahsulotni o'qish 5-20 soniya (sahifa + AI). Yuzta
// mahsulot — yarim soatdan ko'p. Buni HTTP so'rovi ichida qilib
// bo'lmaydi: brauzer ham, proksi ham kutmaydi. Shuning uchun vazifa
// BAZAGA yoziladi va fonda ishlaydi; admin sahifani yopib ketsa ham,
// server qayta ishga tushsa ham davom etadi.
//
// Vazifa BITTA bo'ladi: ikkita import bir vaqtda yursa do'kon bizni
// bot deb bloklaydi va AI hisobi ham ikki barobar yonadi.
import { qator, qatorlar, sorov } from '../db.js';
import {
  sahifaniOl, mahsulotHavolalari, havoladanOl, tasdiqla, sozlamalar,
} from './marketplace.js';
import { qoidaTop, jsonHavolalar, JSON_SARLAVHALAR } from './dokon-api.js';

const MAX_MAQSAD = 1000;
const MIN_KECHIKISH = 300;

/** Hozir ishlayotgan vazifa (bo'lsa). */
export const joriyVazifa = () => qator(
  `select * from marketplace_vazifa where holat = 'ishlamoqda'
    order by created_at desc limit 1`);

/** Oxirgi vazifalar — panelda tarix. */
export const vazifalar = (limit = 5) => qatorlar(
  'select * from marketplace_vazifa order by created_at desc limit $1', [limit]);

/**
 * Yangi import vazifasini boshlaydi.
 *
 * @param {object} p
 * @param {string[]} p.havolalar   bo'lim havolalari. `{sahifa}` bo'lsa
 *                                 sahifama-sahifa aylanadi
 * @param {number} [p.sahifadan]
 * @param {number} [p.sahifagacha]
 * @param {number} [p.maqsad]      nechta mahsulot kerak
 * @param {number} [p.kechikish]   so'rovlar orasidagi tanaffus (ms)
 * @param {boolean} [p.avtoTasdiq] filtrdan o'tganini to'g'ri katalogga
 */
export async function vazifaBoshla({
  havolalar, sahifadan = 1, sahifagacha = 1, maqsad = 100,
  kechikish = 1500, avtoTasdiq = false,
}) {
  const bor = await joriyVazifa();
  if (bor) {
    const e = new Error('Import allaqachon ketmoqda — avval uni to‘xtating.');
    e.turi = 'band';
    throw e;
  }

  const toza = (Array.isArray(havolalar) ? havolalar : String(havolalar || '').split(/[\s,]+/))
    .map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
  if (!toza.length) {
    throw Object.assign(new Error('Bo‘lim havolasi berilmadi.'), { turi: 'havola' });
  }

  const v = await qator(
    `insert into marketplace_vazifa
       (havolalar, sahifadan, sahifagacha, maqsad, kechikish_ms, avto_tasdiq)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [JSON.stringify(toza),
     Math.max(1, Number(sahifadan) || 1),
     Math.max(1, Number(sahifagacha) || 1),
     Math.min(MAX_MAQSAD, Math.max(1, Number(maqsad) || 100)),
     Math.max(MIN_KECHIKISH, Number(kechikish) || 1500),
     Boolean(avtoTasdiq)]);

  // Javobni kutmaymiz — vazifa fonda yuradi
  ishlat(v.id).catch((e) => console.error('IMPORT XATOSI', e.message));
  return v;
}

/** To'xtatish — ishchi keyingi qadamda o'zi to'xtaydi. */
export const vazifaToxtat = (id) => sorov(
  `update marketplace_vazifa set holat = 'toxtatildi', updated_at = now()
    where id = coalesce($1, (select id from marketplace_vazifa
                              where holat = 'ishlamoqda' order by created_at desc limit 1))`,
  [id || null]);

/** Server qayta ishga tushganda yarim qolgan vazifani davom ettiradi. */
export async function vazifaniTiklash() {
  const v = await joriyVazifa();
  if (!v) return null;
  ishlat(v.id).catch((e) => console.error('IMPORT XATOSI', e.message));
  return v;
}

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Vazifa ishchisi.
 *
 * Har qadamda vazifa bazadan QAYTA o'qiladi: admin «to'xtat» bosganini
 * shundan biladi. Xato bo'lsa vazifa to'xtaydi, lekin topilganlari
 * navbatda qoladi — mehnat yo'qolmaydi.
 */
export async function ishlat(id) {
  for (;;) {
    const v = await qator('select * from marketplace_vazifa where id = $1', [id]);
    if (!v || v.holat !== 'ishlamoqda') return v;

    // Maqsadga yetdikmi
    if (v.qoshilgan + v.rad_etilgan >= v.maqsad) return yakunla(id, 'tugadi');

    let navbat = Array.isArray(v.navbat) ? v.navbat : [];

    // Navbat bo'sh — keyingi sahifadan havola yig'amiz
    if (!navbat.length) {
      const sahifa = (v.sahifa || v.sahifadan - 1) + 1;
      if (sahifa > v.sahifagacha) {
        return yakunla(id, 'tugadi',
          v.qoshilgan ? null : 'Sahifalar tugadi — mahsulot topilmadi.');
      }
      let yangi = [];
      try {
        yangi = await havolalarniYig(v.havolalar, sahifa, v.maqsad);
      } catch (e) {
        // Bitta sahifa ochilmasa butun import to'xtamasin — keyingisiga o'tamiz
        await sorov(
          `update marketplace_vazifa set sahifa = $2, xato = xato + 1,
                  sabab = $3, updated_at = now() where id = $1`,
          [id, sahifa, `Sahifa ${sahifa}: ${e.message}`]);
        await kut(v.kechikish_ms);
        continue;
      }
      // Allaqachon olinganlarini tashlaymiz — AI ni bekorga yoqmaymiz
      const yangilar = await filtrlaBorlarni(yangi);
      await sorov(
        `update marketplace_vazifa set sahifa = $2, navbat = $3::jsonb, updated_at = now()
          where id = $1`,
        [id, sahifa, JSON.stringify(yangilar)]);
      if (!yangilar.length) { await kut(200); continue; }
      navbat = yangilar;
    }

    // Navbatdan bittasini olamiz
    const havola = navbat[0];
    const qolgan = navbat.slice(1);
    let natija = null;
    try {
      natija = await havoladanOl(havola);
    } catch (e) {
      natija = { holat: 'xato', sabab: e.message };
    }

    // Avto tasdiq: filtrdan o'tganini to'g'ridan-to'g'ri katalogga.
    // Xato bo'lsa (masalan nomi katalogda bor) mahsulot navbatda qoladi —
    // import to'xtamaydi, admin keyin qo'lda hal qiladi.
    if (v.avto_tasdiq && natija?.holat === 'kutilmoqda' && natija?.id) {
      try { await tasdiqla(natija.id, {}); } catch { /* navbatda qoladi */ }
    }

    await sorov(
      `update marketplace_vazifa set
         navbat = $2::jsonb,
         korilgan = korilgan + 1,
         qoshilgan = qoshilgan + $3,
         rad_etilgan = rad_etilgan + $4,
         xato = xato + $5,
         takror = takror + $6,
         updated_at = now()
       where id = $1`,
      [id, JSON.stringify(qolgan),
       natija?.takror ? 0 : (natija?.holat === 'kutilmoqda' ? 1 : 0),
       natija?.holat === 'rad_etildi' ? 1 : 0,
       natija?.holat === 'xato' ? 1 : 0,
       natija?.takror ? 1 : 0]);

    await kut(v.kechikish_ms);
  }
}

const yakunla = (id, holat, sabab = null) => qator(
  `update marketplace_vazifa set holat = $2, sabab = coalesce($3, sabab),
          navbat = '[]'::jsonb, updated_at = now()
    where id = $1 returning *`, [id, holat, sabab]);

/** Bazada bor havolalarni tashlaydi (xato bo'lganini qayta uriladi). */
async function filtrlaBorlarni(havolalar) {
  if (!havolalar.length) return [];
  const bor = await qatorlar(
    `select manba_url from marketplace_topilgan
      where manba_url = any($1) and holat <> 'xato'`, [havolalar]);
  const bors = new Set(bor.map((r) => r.manba_url));
  return havolalar.filter((h) => !bors.has(h));
}

/**
 * Bir sahifadagi mahsulot havolalari.
 *
 * `{sahifa}` qolipi bo'lsa raqam qo'yiladi. Javob JSON bo'lsa (do'kon
 * API si) havolalar id lardan yasaladi — SPA katalog sahifasining HTML
 * ida havola bo'lmaydi.
 */
export async function havolalarniYig(qoliplar, sahifa, maxSoni = 100) {
  const s = await sozlamalar();
  const topildi = [];
  for (const qolip of (qoliplar || [])) {
    const url = String(qolip).replace(/\{sahifa\}/g, String(sahifa));
    // Qolipsiz havola faqat birinchi sahifada o'qiladi
    if (!/\{sahifa\}/.test(String(qolip)) && sahifa > 1) continue;

    const qoida = qoidaTop(url, s.api);
    const { html, json, url: oxirgi } = await sahifaniOl(url, qoida ? JSON_SARLAVHALAR : {});
    const havolalar = json
      ? jsonHavolalar(json, qoida, maxSoni)
      : mahsulotHavolalari(html, oxirgi, maxSoni);
    for (const h of havolalar) if (!topildi.includes(h)) topildi.push(h);
  }
  return topildi.slice(0, maxSoni);
}
