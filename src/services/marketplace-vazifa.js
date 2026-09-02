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
import { qator, qatorlar, sorov, sozlama } from '../db.js';
import {
  sahifaniOl, mahsulotHavolalari, havoladanOl, elementdanOl, tasdiqla, sozlamalar,
} from './marketplace.js';
import {
  qoidaTop, jsonHavolalar, jsonElementlar, royxatHavolasi, JSON_SARLAVHALAR,
} from './dokon-api.js';

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

    // Navbatdan bittasini olamiz. Navbatda ikki xil narsa turishi mumkin:
    // oddiy havola (satr) yoki ro'yxat javobidagi tayyor mahsulot obyekti.
    const band = navbat[0];
    const qolgan = navbat.slice(1);
    let natija = null;
    try {
      natija = typeof band === 'string'
        ? await havoladanOl(band)
        : await elementdanOl(band.element, band.qoida);
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
         ai_soni = ai_soni + $7,
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
       natija?.takror ? 1 : 0,
       // AI chaqirilmagan bo'lsa (arzon filtr rad etgan) hisobga olinmaydi
       natija?.ai === false ? 0 : 1]);

    await kut(v.kechikish_ms);
  }
}

const yakunla = (id, holat, sabab = null) => qator(
  `update marketplace_vazifa set holat = $2, sabab = coalesce($3, sabab),
          navbat = '[]'::jsonb, updated_at = now()
    where id = $1 returning *`, [id, holat, sabab]);

/**
 * Bazada bor bo'lganlarini tashlaydi (xato bo'lganini qayta uriladi).
 * Navbat elementi satr (havola) yoki `{element, qoida, url}` bo'lishi mumkin.
 */
async function filtrlaBorlarni(bandlar) {
  if (!bandlar.length) return [];
  const url = (b) => (typeof b === 'string' ? b : b.url);
  const bor = await qatorlar(
    `select manba_url from marketplace_topilgan
      where manba_url = any($1) and holat <> 'xato'`, [bandlar.map(url)]);
  const bors = new Set(bor.map((r) => r.manba_url));
  return bandlar.filter((b) => !bors.has(url(b)));
}

/**
 * Bir sahifadagi mahsulotlar.
 *
 * Kirish uch xil bo'lishi mumkin va admin farqini bilishi shart emas:
 *   1. QIDIRUV SO'ZI («크림») — do'kon qoidasidagi qidiruv manzili
 *      ishlatiladi. Eng qulayi: admin havola bilan ovora bo'lmaydi.
 *   2. Ro'yxat API havolasi — javobdagi mahsulotlar olinadi.
 *   3. Oddiy katalog sahifasi — HTML dagi havolalar yig'iladi.
 *
 * Javobda mahsulot ma'lumoti to'liq bo'lsa (Daiso qidiruvi kabi) navbatga
 * TAYYOR OBYEKT qo'yiladi va har mahsulot uchun alohida so'rov ketmaydi.
 *
 * @returns {Promise<Array<string|{element:object, qoida:object, url:string}>>}
 */
export async function havolalarniYig(qoliplar, sahifa, maxSoni = 100) {
  const s = await sozlamalar();
  const topildi = [];
  const url_ = (b) => (typeof b === 'string' ? b : b.url);

  for (const xom of (qoliplar || [])) {
    const qolip = String(xom).trim();
    const havolami = /^https?:\/\//i.test(qolip);

    // Qidiruv so'zi: qaysi do'konda qidirishni qoidalar aytadi
    let url;
    let qoida;
    if (havolami) {
      // Qolipsiz havola faqat birinchi sahifada o'qiladi
      if (!/\{sahifa\}/.test(qolip) && sahifa > 1) continue;
      url = qolip.replace(/\{sahifa\}/g, String(sahifa));
      qoida = qoidaTop(url, s.api);
    } else {
      qoida = s.api.find((q) => q.royxat_url);
      if (!qoida) continue;
      url = royxatHavolasi(qoida, qolip, sahifa);
    }

    const { html, json, url: oxirgi } = await sahifaniOl(url, qoida ? JSON_SARLAVHALAR : {});

    // 1) Javobda tayyor mahsulotlar bormi
    const elementlar = json ? jsonElementlar(json, qoida, maxSoni) : [];
    if (elementlar.length) {
      for (const e of elementlar) {
        const id = e[qoida.element_id || qoida.id_kalit];
        const sahifaUrl = qoida.sahifa_url
          ? qoida.sahifa_url.replace(/\{id\}/g, encodeURIComponent(String(id)))
          : `https://${qoida.host}#${id}`;
        const band = { element: e, qoida, url: sahifaUrl };
        if (!topildi.some((t) => url_(t) === sahifaUrl)) topildi.push(band);
      }
      continue;
    }

    // 2) Bo'lmasa — havolalar (JSON id lari yoki HTML dagi <a>)
    const havolalar = json
      ? jsonHavolalar(json, qoida, maxSoni)
      : mahsulotHavolalari(html, oxirgi, maxSoni);
    for (const h of havolalar) if (!topildi.some((t) => url_(t) === h)) topildi.push(h);
  }
  return topildi.slice(0, maxSoni);
}

// ──────────────── Avtomatik jadval ────────────────
// Admin hech narsa bosmaydi: server belgilangan kunlarda o'zi qidiradi,
// filtrlaydi va (ruxsat berilgan bo'lsa) katalogga qo'shadi.

const SOAT = 60 * 60 * 1000;

/** Jadval sozlamasi — noto'g'ri qiymatlardan himoyalangan. */
export async function jadval() {
  const j = await sozlama('marketplace_jadval', {});
  const o = (j && typeof j === 'object') ? j : {};
  return {
    yoqilgan: Boolean(o.yoqilgan),
    sozlar: (Array.isArray(o.sozlar) ? o.sozlar : [])
      .map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
    kunlar: Math.max(1, Math.min(90, Number(o.kunlar) || 7)),
    soat: Math.max(0, Math.min(23, Number(o.soat) || 4)),
    maqsad: Math.max(1, Math.min(1000, Number(o.maqsad) || 40)),
    sahifagacha: Math.max(1, Math.min(50, Number(o.sahifagacha) || 5)),
    avtoTasdiq: o.avto_tasdiq !== false,
    oxirgi: o.oxirgi ? new Date(o.oxirgi) : null,
  };
}

/** Jadvalni saqlaydi. */
export async function jadvalniSaqla(xom = {}) {
  const eski = await jadval();
  const yangi = {
    yoqilgan: Boolean(xom.yoqilgan),
    sozlar: (Array.isArray(xom.sozlar) ? xom.sozlar : eski.sozlar)
      .map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
    kunlar: Math.max(1, Math.min(90, Number(xom.kunlar) || eski.kunlar)),
    soat: Math.max(0, Math.min(23, Number(xom.soat ?? eski.soat))),
    maqsad: Math.max(1, Math.min(1000, Number(xom.maqsad) || eski.maqsad)),
    sahifagacha: Math.max(1, Math.min(50, Number(xom.sahifagacha) || eski.sahifagacha)),
    avto_tasdiq: xom.avto_tasdiq !== false,
    oxirgi: eski.oxirgi ? eski.oxirgi.toISOString() : null,
  };
  await sorov(
    `insert into settings (key, value) values ('marketplace_jadval', $1::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(yangi)]);
  return yangi;
}

/**
 * Vaqti kelgan bo'lsa importni boshlaydi.
 *
 * Vaqt Toshkent bo'yicha solishtiriladi: server qayerda turishidan
 * qat'i nazar, admin kutgan soatda ishlashi kerak.
 *
 * @returns {Promise<object|null>} boshlangan vazifa yoki null
 */
export async function jadvalniTekshir(hozir = new Date()) {
  const j = await jadval();
  if (!j.yoqilgan || !j.sozlar.length) return null;
  if (await joriyVazifa()) return null;          // allaqachon ish ketmoqda

  const toshkent = new Date(hozir.getTime() + 5 * SOAT);   // UTC+5
  if (toshkent.getUTCHours() !== j.soat) return null;

  if (j.oxirgi) {
    const kun = (hozir - j.oxirgi) / (24 * SOAT);
    if (kun < j.kunlar) return null;
  }

  const v = await vazifaBoshla({
    havolalar: j.sozlar,
    sahifagacha: j.sahifagacha,
    maqsad: j.maqsad,
    avtoTasdiq: j.avtoTasdiq,
  });
  await sorov(
    `update settings set value = jsonb_set(value, '{oxirgi}', to_jsonb($1::text))
      where key = 'marketplace_jadval'`, [hozir.toISOString()]);
  return v;
}

let jadvalTaymer = null;

/** Soatiga bir marta jadvalni tekshirib turadi. */
export function jadvalniIshgaTushir() {
  if (jadvalTaymer) return;
  const yur = () => jadvalniTekshir()
    .then((v) => v && console.log(`   Avtomatik import boshlandi: #${v.id}`))
    .catch((e) => console.error('Jadval xatosi:', e.message));
  jadvalTaymer = setInterval(yur, SOAT);
  if (jadvalTaymer.unref) jadvalTaymer.unref();
  setTimeout(yur, 60_000).unref?.();   // ko'tarilgandan bir daqiqa keyin
}
