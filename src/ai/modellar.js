// Model hovuzi — bitta model tugasa keyingisiga o'tamiz.
//
// Muammo. Skaner va maslahatchi ishlamay qoldi, poster esa ishlayverdi.
// Sabab: JSON chaqiruvlar `gemini-3.8-flash` ga, rasm chizish esa
// `gemini-*-image` ga ketadi. Google'da HAR MODELNING O'Z KVOTASI bor,
// shuning uchun matn modelining kunlik chegarasi tugaganda rasm modeli
// bemalol ishlayverdi. Bitta kalitda o'tirgan holda esa kutishdan
// boshqa yo'l yo'q edi.
//
// Yechim: modellar RO'YXATI. Asosiysi kvotani tugatsa keyingisiga
// o'tamiz — har birining alohida kvotasi bor, ya'ni ilova to'xtamaydi.
// Bu kalit qo'shishdan ham tez ishlaydi: hech narsa sozlash kerak emas.
//
// Ikki xil chetga qo'yish:
//   • kvota tugadi  → VAQTINCHA (kunlik bo'lsa uzoqroq)
//   • model yo'q (404) → BUTUNLAY shu ish seansida: nom noto'g'ri yoki
//     kalit bu modelga ruxsatga ega emas, qayta urinish behuda.

import { config } from '../config.js';
import { sozlama, sorov } from '../db.js';

// Kunlik kvota ertaga tiklanadi, lekin aniq soatni bilmaymiz. Bir
// soatdan keyin bitta so'rov bilan tekshirib ko'rgan arzon.
const DAM_MS = { kunlik: 60 * 60_000, daqiqalik: 70_000, nomalum: 5 * 60_000 };

const holat = new Map();   // model → { bandGacha, yoq, xato, ishlatilgan, sabab }

const olish = (m) => {
  if (!holat.has(m)) holat.set(m, { bandGacha: 0, yoq: false, xato: 0, ishlatilgan: 0, sabab: '' });
  return holat.get(m);
};

// ── Ro'yxat manbasi ──
// Ustuvorlik: ADMIN PANELDA tanlangan ro'yxat → muhit o'zgaruvchisi →
// koddagi standart. Admin panelda tanlash eng qulayi: Railway'ga
// kirmasdan, telefondan ham o'zgartirsa bo'ladi.
const STANDART = () => {
  const hammasi = [config.geminiModel, ...(config.geminiModellar || [])];
  return [...new Set(hammasi.filter(Boolean))];
};

let kesh = null;          // adminniki yoki null (standart ishlatiladi)
let rasmKesh = null;
let keshVaqti = 0;
const TTL = 30_000;       // admin saqlasa yarim daqiqada hamma joyga yetadi

const tozaNom = (v) => String(v ?? '').replace(/["'\s]/g, '').slice(0, 80);

/**
 * Ro'yxatni bazadan yangilaydi. Har chaqiruvdan oldin chaqiriladi,
 * lekin 30 soniyada bir marta bazaga boradi.
 */
export async function modellarniTaminla() {
  if (kesh !== null && Date.now() - keshVaqti < TTL) return;
  try {
    const [m, r] = await Promise.all([
      sozlama('ai_modellar', []), sozlama('ai_rasm_model', ''),
    ]);
    const royxat = (Array.isArray(m) ? m : []).map(tozaNom).filter(Boolean);
    kesh = royxat.length ? [...new Set(royxat)] : [];
    rasmKesh = tozaNom(r);
    keshVaqti = Date.now();
  } catch (e) {
    // Baza yiqilsa AI ham to'xtamasin — standart ro'yxat bilan ishlaymiz
    console.error('AI modellarini o‘qishda xato:', e.message);
    if (kesh === null) { kesh = []; rasmKesh = ''; }
    keshVaqti = Date.now();
  }
}

/** Ro'yxat: asosiy model birinchi, keyin zaxiralar. */
export function royxat() {
  return (kesh && kesh.length) ? kesh : STANDART();
}

/** Admin tanlagan rasm modeli (yoki standarti). */
export const rasmModeli = () => rasmKesh || config.geminiImageModel;

/** Admin panel nimani ko'rsatishini biladi. */
export const standartmi = () => !(kesh && kesh.length);
export const standartRoyxat = STANDART;

/**
 * Admin tanlovini saqlaydi.
 * Bo'sh ro'yxat berilsa standartga qaytadi — bu «tiklash» tugmasi.
 */
export async function saqla(royxatYangi, rasmModel) {
  const toza = [...new Set((royxatYangi || []).map(tozaNom).filter(Boolean))].slice(0, 12);
  await sorov(
    `insert into settings (key, value, updated_at) values
       ('ai_modellar', $1::jsonb, now()), ('ai_rasm_model', $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(toza), JSON.stringify(tozaNom(rasmModel))]);
  // Yangi ro'yxatdagi modellar avvalgi «dam olish» belgisini
  // yo'qotsin: admin ataylab tanladi, darrov sinab ko'rilsin.
  for (const m of toza) holat.delete(m);
  kesh = toza; rasmKesh = tozaNom(rasmModel); keshVaqti = Date.now();
  return { modellar: royxat(), rasm_model: rasmModeli(), standart: standartmi() };
}

/** Admin saqlaganda keshni darhol bekor qilish. */
export function keshniTashla() { kesh = null; keshVaqti = 0; }

/**
 * Hozir ishlatiladigan model.
 * @param {string[]} [otkaz]  shu chaqiruvda allaqachon yiqilganlari
 */
export function modelOl(otkaz = []) {
  const hozir = Date.now();
  const r = royxat();
  const mos = r.find((m) => {
    const h = olish(m);
    return !h.yoq && h.bandGacha <= hozir && !otkaz.includes(m);
  });
  if (mos) { olish(mos).ishlatilgan += 1; return mos; }

  // Hammasi band — eng erta bo'shaydiganini beramiz. «Model yo'q» deb
  // to'xtagandan ko'ra urinib ko'rgan yaxshi: kvota Google tomonda
  // erta tiklangan bo'lishi mumkin.
  const qolgan = r.filter((m) => !olish(m).yoq && !otkaz.includes(m));
  if (!qolgan.length) return r.find((m) => !olish(m).yoq) || r[0];
  return qolgan.sort((a, b) => olish(a).bandGacha - olish(b).bandGacha)[0];
}

/** Kvota tugadi — modelni vaqtincha chetga qo'yamiz. */
export function modelBand(model, tur = 'nomalum', kutishMs = 0) {
  const h = olish(model);
  h.xato += 1;
  h.sabab = tur;
  h.bandGacha = Date.now() + Math.max(kutishMs || 0, DAM_MS[tur] || DAM_MS.nomalum);
}

/** 404 — bunday model yo'q yoki kalitga ruxsat berilmagan. */
export function modelYoq(model) {
  const h = olish(model);
  h.yoq = true; h.sabab = 'yoq';
  console.warn(`AI MODEL: «${model}» mavjud emas — ro‘yxatdan chiqarildi`);
}

/** Chaqiruv o'tdi. */
export function modelYaxshi(model) {
  const h = olish(model);
  h.bandGacha = 0; h.xato = 0; h.sabab = '';
}

/** Ishlashga tayyor model bormi. */
export const tayyorSoni = () => royxat()
  .filter((m) => { const h = olish(m); return !h.yoq && h.bandGacha <= Date.now(); }).length;

/** /holat va admin panel uchun. */
export const modelHolatlari = () => royxat().map((m) => {
  const h = olish(m);
  return {
    nom: m,
    tayyor: !h.yoq && h.bandGacha <= Date.now(),
    yoq: h.yoq,
    sabab: h.sabab,
    dam_qoldi: Math.max(0, Math.ceil((h.bandGacha - Date.now()) / 1000)),
    ishlatilgan: h.ishlatilgan,
  };
});

/** Sinov uchun. */
export const modellarniTozala = () => {
  holat.clear(); kesh = null; rasmKesh = null; keshVaqti = 0;
};

/**
 * Google 429 javobidan kvota TURINI ajratadi.
 *
 * Javob tanasida `quotaId` bo'ladi, masalan
 * "GenerateRequestsPerDayPerProjectPerModel-FreeTier". Kunlik va
 * daqiqalik chegara butunlay boshqacha muomala talab qiladi: birinchisi
 * ertagacha, ikkinchisi bir daqiqada tiklanadi. Ilgari javob tanasi
 * umuman o'qilmasdi va ikkalasi bir xil ko'rinardi.
 */
export function kvotaTuri(matn) {
  const s = String(matn || '');
  if (/per[_ ]?day|daily|PerDay/i.test(s)) return 'kunlik';
  if (/per[_ ]?minute|PerMinute/i.test(s)) return 'daqiqalik';
  return 'nomalum';
}

/** 429 javobidagi `retryDelay: "33s"` — ms da. */
export function kutishMs(matn) {
  const m = /retry(?:_|-)?delay"?\s*[:=]\s*"?(\d+)\s*s/i.exec(String(matn || ''));
  return m ? Number(m[1]) * 1000 : 0;
}
