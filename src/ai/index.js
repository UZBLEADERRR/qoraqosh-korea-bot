// AI qatlamining yagona kirish nuqtasi.
// Qaysi provayder ishlatilishi kalitlarga qarab hal qilinadi:
//   OPENROUTER_API_KEY bo'lsa  → OpenRouter (asosiy)
//   GEMINI_API_KEY bo'lsa      → Google (asosiy yoki zaxira)
// Ikkalasi ham bo'lsa: OpenRouter yiqilsa Google'ga o'tadi.
import { config } from '../config.js';
import { googleJson, googleRasm, geminiHovuz } from './google.js';
import { openrouterJson, openrouterRasm, orHovuz } from './openrouter.js';
import { navbatga, pauzaQil, kutishSoniyasi } from './navbat.js';
import * as jurnal from './jurnal.js';

export const openrouterBormi = () => Boolean(config.openrouterKey);
export const googleBormi     = () => Boolean(config.geminiKey);
export const aiBormi         = () => openrouterBormi() || googleBormi();

/** Hozir qaysi provayder asosiy (tahlillar uchun: skaner, maslahat, makiyaj…). */
export function provayder() {
  if (googleBormi())     return { nom: 'google', model: config.geminiModel };
  if (openrouterBormi()) return { nom: 'openrouter', model: config.openrouterModel };
  return { nom: 'yoq', model: '—' };
}

/* XABAR YOZISH modeli — OpenRouter orqali (Instagram/Direct javoblari,
   postlar, kontent g'oyalari). Admin panelda o'zgartiriladi
   (settings.ai_yozuv_model), bo'sh bo'lsa — muhit yoki standart. */
let yozuvKesh = { qiymat: '', vaqt: 0 };
export async function yozuvModeli() {
  if (Date.now() - yozuvKesh.vaqt > 30_000) {
    const { sozlama } = await import('../db.js');
    const v = await sozlama('ai_yozuv_model', '').catch(() => '');
    yozuvKesh = { qiymat: String(v || '').replace(/["'\s]/g, '').slice(0, 80), vaqt: Date.now() };
  }
  return yozuvKesh.qiymat || config.openrouterYozuvModel;
}
/** Admin saqlaganda darhol kuchga kirsin. */
export function yozuvModelKeshiniTashla() { yozuvKesh = { qiymat: '', vaqt: 0 }; }

/**
 * Tuzilgan JSON javob. Provayder tanlash va zaxiraga o'tish shu yerda.
 * @param {Array}  parts  [{text}, {inline_data:{mime_type,data}}]
 * @param {object} schema OpenAPI subset sxemasi
 */
export async function aiJson(parts, schema, opts = {}) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });
  // Hamma chaqiruv BITTA darvozadan o'tadi: minglab odam bir vaqtda
  // so'rasa ham provayder chegarasi buzilmaydi.
  return navbatga(() => yozibChaqir(parts, schema, opts), { muhim: opts.muhim });
}

/**
 * Chaqiruvni jurnalga yozib bajaradi.
 *
 * Ilgari xato faqat Railway logiga tushardi. Yarim kechada telefonda
 * log o'qib bo'lmaydi — endi oxirgi xatolar xotirada turadi va
 * /holat buyrug'i bilan ko'rinadi.
 */
async function yozibChaqir(parts, schema, opts) {
  try {
    const j = await chaqir(parts, schema, opts);
    jurnal.yaxshi();
    return j;
  } catch (e) {
    jurnal.yomon(e, opts.qayerda || '');
    throw e;
  }
}

/**
 * Kim javob beradi:
 *   • XABAR YOZISH (`opts.yozuv`) — OpenRouter'dagi yozuv modeli (GPT 5.6
 *     Luna), yiqilsa Google;
 *   • qolgan hammasi (skaner, maslahat, makiyaj, mahsulot to'ldirish…) —
 *     Google: gemini-3.8-flash, yiqilsa gemini-3.7-flash (modellar.js),
 *     ikkalasi ham ishlamasa — eng oxirgi chora OpenRouter.
 */
async function chaqir(parts, schema, opts) {
  if (opts.yozuv && openrouterBormi()) {
    try {
      return await openrouterJson(parts, schema, { ...opts, orModel: await yozuvModeli() });
    } catch (e) {
      cheklovmi(e);
      if (!googleBormi()) throw e;
      // Zaxiraga o'tamiz — mijoz uchun uzilish bo'lmasin
      console.warn(`OpenRouter (yozuv) yiqildi (${e.turkum || '?'}: ${e.message.slice(0, 120)}) → Google'ga o'tildi`);
      try { return await googleJson(parts, schema, opts); } catch (g) { cheklovmi(g); throw g; }
    }
  }
  if (googleBormi()) {
    try {
      return await googleJson(parts, schema, opts);
    } catch (e) {
      cheklovmi(e);
      // Rasm/so'rov xavfsizlik filtriga tushgan bo'lsa boshqa provayder ham rad etadi
      if (!openrouterBormi() || e.turkum === 'xavfsizlik') throw e;
      console.warn(`Google yiqildi (${e.turkum || '?'}: ${e.message.slice(0, 120)}) → OpenRouter'ga o'tildi`);
      try { return await openrouterJson(parts, schema, opts); } catch (o) { cheklovmi(o); throw o; }
    }
  }
  try {
    return await openrouterJson(parts, schema, opts);
  } catch (e) { cheklovmi(e); throw e; }
}

/**
 * Provayder «juda ko'p so'rov» dedimi?
 *
 * Shunda BUTUN navbat pauza qiladi. Aks holda navbatdagi yuzta so'rov
 * ketma-ket urilib, cheklovni yanada uzaytiradi.
 */
function cheklovmi(e) {
  const m = String(e?.message || '');
  // google.js 429 da `kvota`, openrouter `cheklov` beradi — ikkalasi ham
  // bir xil ma'noda: butun navbat pauza qilishi kerak.
  if (e?.turkum === 'cheklov' || e?.turkum === 'kvota' || e?.turkum === 'kvota_kunlik'
      || /\b429\b|rate limit|too many requests|quota|resource_exhausted/i.test(m)) {
    pauzaQil(kutishSoniyasi(m));
  }
}

/**
 * Rasm chizish. Avval Google (barcha kalitlar navbat bilan), ular
 * ishlamasa — OpenRouter orqali o'sha Gemini rasm modeli. Ilgari faqat
 * Google edi: bitta kalitda kredit tugasa poster chizish to'xtardi,
 * OpenRouter kaliti esa turgan bo'lsa ham ishlatilmasdi.
 */
// Google yiqilganda zaxiraga o'tish ma'noli xatolar (rasmning o'ziga
// bog'liq emas — xavfsizlik rad etsa, OpenRouter'da ham rad etadi)
const ZAXIRAGA = new Set(['hisob', 'kvota', 'kvota_kunlik', 'kalit', 'band', 'vaqt', 'tarmoq', 'model', 'nomalum']);

export async function aiRasm(parts, opts = {}) {
  if (!googleBormi() && !openrouterBormi()) {
    throw Object.assign(new Error('Rasm chizish uchun GEMINI_API_KEY yoki OPENROUTER_API_KEY kerak'), { turkum: 'kalit' });
  }
  return navbatga(async () => {
    let gXato = null;
    if (googleBormi()) {
      try {
        const r = await googleRasm(parts, opts);
        jurnal.yaxshi();
        return r;
      } catch (e) {
        gXato = e;
        if (!openrouterBormi() || !ZAXIRAGA.has(e.turkum)) { cheklovmi(e); jurnal.yomon(e, opts.qayerda || 'rasm'); throw e; }
        console.warn(`Google rasm yiqildi (${e.turkum}: ${String(e.message).slice(0, 120)}) → OpenRouter'ga o'tildi`);
      }
    }
    try {
      const r = await openrouterRasm(parts, opts);
      jurnal.yaxshi();
      return r;
    } catch (e) {
      jurnal.yomon(e, opts.qayerda || 'rasm');
      // Ikkalasi ham yiqildi — admin ikkala sababni ham ko'rsin
      if (gXato) e.message = `${e.message} | Google: ${String(gXato.message).slice(0, 160)}`;
      throw e;
    }
  }, { muhim: opts.muhim });
}

/** Gemini "parts" uchun rasm bo'lagi. */
export const rasmPart = (base64, mime = 'image/jpeg') => ({
  inline_data: { mime_type: mime, data: base64 },
});

/**
 * Kalitlar holati — admin panel uchun.
 * Kalitning O'ZI hech qachon qaytarilmaydi, faqat oxirgi 4 belgi.
 */
export function kalitHolati() {
  return {
    google:     geminiHovuz.holatlar(),
    openrouter: orHovuz.holatlar(),
  };
}

export { jurnalHolati, oxirgiXatolar } from './jurnal.js';
export { modelHolatlari } from './modellar.js';
