// KUNLIK REELS — AI har kuni bitta video yasaydi va Instagram'ga joylaydi.
//
// Reels 3.0 — video TURLARI (faqat reklama emas):
//   mahsulot — mahsulot hikoyasi; skaner / maslahat / buyurtma — ilova haqida
//   (oynada matn yoziladi, kursor bosadi, chat, yuz skaneri, telefonda haqiqiy
//   skrinshot); foydali — teri parvarishi bo'yicha maslahat; aksiya — bazadagi
//   chegirmalar; erkin — admin g'oyasi. «aralash» jadvalda hafta kunlari bo'yicha
//   almashadi.
//
// Reels 2.0 (src/video/kino): animatsion HIKOYA video —
//   AI rejissyor hikoya formatini tanlaydi va sahnalarni yozadi (hook → muammo →
//   kashfiyot → foyda → natija → sharh → narx → chaqiriq); multfilm qahramon
//   (Nigina yoki doppili Jasur) gapiradi, lablari ovozga mos ochiladi,
//   so'zma-so'z subtitr, o'tishlar, musiqa va effektlar.
//   Mahsulot surati, nomi, narxi, chegirmasi, reytingi va SHARHLARI — BAZADAN
//   (AI dan emas): videoda noto'g'ri narx yoki to'qilgan sharh chiqmasin.
//
// Rejim (admin panel → «Kunlik Reels»):
//   tasdiq — avval adminga Telegramda video keladi: «✅ Joylash / ♻️ Qayta / 🔄 Boshqasi»;
//   avto   — o'zi joylaydi, adminga havola keladi.
// Kanvas (@napi-rs/canvas) ishlamasa — eski oddiy shablon (src/video/reels.js).
import { qator, qatorlar, sorov, sozlama, sozlamalarniUnut, pool } from '../db.js';
import { config } from '../config.js';
import { reelsYasa } from '../video/reels.js';
import { ovozYoz, OVOZ_STANDART, ovozModeliMi } from '../video/ovoz.js';
import { jpegQil } from '../rasm/olcham.js';

export const FORMATLAR = {
  shaxsiy: '«Men ham…» — qahramon o‘z hikoyasini aytadi: muammo → qanday topdi → natija',
  teskari: '«Sotib olish shart emas…» — teskari psixologiya: avval «kerak emas», keyin kimga aynan kerakligi',
  xatolar: '«Ko‘pchilik qiladigan xato» — noto‘g‘ri odat va to‘g‘ri yo‘l (mahsulot — yechim)',
  sir: '«Koreyslar buni biladi» — qiziq sir yoki fakt ochiladi',
  kun: '«Mening kechki parvarishim» — kun tartibi POV, mahsulot qadamlardan biri',
  mif: '«Mif yoki haqiqat?» — keng tarqalgan fikr tekshiriladi',
  savol: '«Sizda ham shunaqami?» — tomoshabinga savol, keyin yechim',
};
export const USLUBLAR = ['hikoya', 'reklama'];
export const QAHRAMON_TANLOV = ['navbat', 'nigina', 'jasur'];
export const MAVZU_TANLOV = ['brend', 'pastel', 'tungi', 'yorqin', 'aralash'];
export const MUSIQA_TANLOV = ['quvnoq', 'lofi', 'hissiy', 'energiya', 'aralash', 'yoq'];
const SAHNA = ['hook', 'muammo', 'kashfiyot', 'foyda', 'natija', 'sharh', 'narx', 'cta', 'hikoya',
  'matn', 'oyna', 'chat', 'skaner', 'ilova', 'royxat', 'taqqos', 'bosqich', 'aksiya', 'kadr', 'uchD'];
const MAHSULOT_SAHNA = ['kashfiyot', 'foyda', 'narx', 'sharh', 'uchD'];  // mahsulotsiz videoda bo'lmaydi
// AI chizadigan hikoya rasmlari uslubi (inglizcha — rasm modeli uchun)
export const RASM_USLUBLARI = {
  '3d': 'warm cinematic 3D animated-film style (Pixar-like), soft volumetric lighting, rich colors',
  anime: 'Studio Ghibli-like hand-painted anime illustration, soft colors',
  akvarel: 'soft watercolor storybook illustration, gentle colors, paper texture',
  foto: 'photorealistic cinematic photo, natural light, shallow depth of field',
  flat: 'clean modern flat vector illustration, bold colors, simple shapes',
};
const HISSIYOT = ['oddiy', 'xursand', 'hayron', 'xafa', 'oylash', 'hayajon'];
const IMO = ['tinch', 'silkit', 'korsat', 'ushlab', 'oylash', 'yelka', 'hayajon', 'yuz', 'tepaga'];
const EKRANLAR = ['skaner', 'dokon', 'mahsulot', 'savat', 'maslahat'];   // public/uy/ilova-*.jpg

/** Video turlari: nima haqida, qaysi sahnalar, mahsulot kerakmi. */
export const VIDEO_TURLARI = {
  mahsulot: { nom: '🛍 Mahsulot hikoyasi', mahsulot: true,
    sahnalar: ['hook', 'muammo', 'kashfiyot', 'foyda', 'natija', 'sharh', 'narx', 'cta', 'hikoya', 'matn', 'taqqos', 'royxat', 'kadr', 'uchD'],
    mavzu: 'bitta mahsulotni hikoya orqali sotish' },
  skaner: { nom: '📸 Yuz skaneri (ilova)', mahsulot: false,
    sahnalar: ['hook', 'matn', 'muammo', 'oyna', 'skaner', 'royxat', 'ilova', 'natija', 'chat', 'hikoya', 'kadr', 'cta'],
    mavzu: 'KiOVO botidagi bepul YUZ SKANERI: selfi → AI teri turini va muammolarni aniqlaydi → mos parvarish tuzadi. Tomoshabin skanerni sinab ko‘rsin' },
  maslahat: { nom: '💬 AI maslahatchi (ilova)', mahsulot: false,
    sahnalar: ['hook', 'matn', 'muammo', 'chat', 'oyna', 'ilova', 'royxat', 'hikoya', 'kadr', 'cta'],
    mavzu: 'KiOVO ilovasidagi AI MASLAHATCHI: teri haqida yozib so‘raysiz, rasm yuborsangiz ham bo‘ladi, darrov mos parvarish va mahsulot aytadi' },
  buyurtma: { nom: '📦 Qanday buyurtma beriladi', mahsulot: false,
    sahnalar: ['hook', 'matn', 'bosqich', 'oyna', 'ilova', 'royxat', 'hikoya', 'kadr', 'cta'],
    mavzu: 'KiOVO dan buyurtma berish qadamlari — oson va tez ekanini ko‘rsatish' },
  foydali: { nom: '💡 Foydali maslahat', mahsulot: false,
    sahnalar: ['hook', 'matn', 'muammo', 'taqqos', 'bosqich', 'royxat', 'hikoya', 'natija', 'kadr', 'cta'],
    mavzu: 'teri parvarishi bo‘yicha FOYDALI maslahat (ta’lim): odamlar saqlab qo‘yadigan, ulashadigan video. Sotuvga majburlamaydi' },
  aksiya: { nom: '🔥 Aksiya / chegirmalar', mahsulot: false,
    sahnalar: ['hook', 'matn', 'aksiya', 'hikoya', 'natija', 'kadr', 'cta'],
    mavzu: 'bugungi chegirmadagi mahsulotlar (bazadan) — tez harakat qilishga undash' },
  erkin: { nom: '✨ Erkin g‘oya', mahsulot: false, sahnalar: SAHNA, mavzu: 'admin g‘oyasi bo‘yicha' },
};
// «aralash» jadval: hafta kuni (0 — yakshanba) → video turi
const HAFTA_REJASI = ['maslahat', 'mahsulot', 'foydali', 'mahsulot', 'skaner', 'aksiya', 'mahsulot'];
// Qahramonga mos ovoz (Gemini TTS ovozlari) va o'qish uslubi
const QAHRAMON_OVOZI = {
  nigina: { ovoz: 'Leda', uslub: 'Speak like a cheerful young Uzbek woman telling a short personal story to a close friend: lively, warm, expressive, natural pace.' },
  jasur:  { ovoz: 'Puck', uslub: 'Speak like a friendly, confident young Uzbek man telling a short, slightly funny story to a friend: energetic, warm, natural pace.' },
};

export const STANDART = {
  yoqilgan: false, soat: 19, rejim: 'tasdiq', ovozli: true,
  ovoz_model: OVOZ_STANDART.model, ovoz: 'avto', ovoz_uslubi: '',
  motor: 'kino',            // kino — animatsion hikoya; oddiy — eski shablon
  uslub: 'hikoya', qahramon: 'navbat', format: 'aralash', mavzu: 'brend',
  musiqa: 'aralash', musiqa_baland: 35, sfx: true, subtitr: true, narx_korsat: true,
  davomiylik: 30, yoriqnoma: '',
  tur: 'aralash',           // har kungi video turi: aralash (hafta rejasi) yoki VIDEO_TURLARI dan biri
  subtitr_uslub: 'karaoke', // karaoke | chip | oddiy
  rasm_soni: 3,             // hikoyaga mos AI rasmlari (har video uchun, 0 — o'chiq)
  rasm_uslub: '3d',         // RASM_USLUBLARI
};
const QULF = 774411;                         // advisory lock — ikki nusxa bir vaqtda yasamasin

const tanlov = (v, ruxsat, std) => (ruxsat.includes(v) ? v : std);

/** Sozlamani tekshirib, to'liq ko'rinishda qaytaradi (admin ham shu funksiya bilan saqlaydi). */
export function sozlamaTozala(s = {}, eski = STANDART) {
  const r = { ...STANDART, ...eski, ...(s && typeof s === 'object' ? s : {}) };
  const bool = (v, std) => (v === undefined ? std : v === true || v === 'true' || v === 1 || v === '1');
  return {
    yoqilgan: bool(r.yoqilgan, false),
    soat: Math.min(23, Math.max(0, Math.round(Number(r.soat)) || 0)),
    rejim: tanlov(r.rejim, ['avto', 'tasdiq'], 'tasdiq'),
    ovozli: bool(r.ovozli, true),
    ovoz_model: ovozModeliMi(r.ovoz_model) ? String(r.ovoz_model) : OVOZ_STANDART.model,
    ovoz: String(r.ovoz || 'avto').replace(/[^A-Za-z]/g, '').slice(0, 30) || 'avto',
    ovoz_uslubi: String(r.ovoz_uslubi || '').replace(/\s+/g, ' ').trim().slice(0, 300),
    motor: tanlov(r.motor, ['kino', 'oddiy'], 'kino'),
    uslub: tanlov(r.uslub, USLUBLAR, 'hikoya'),
    qahramon: tanlov(r.qahramon, QAHRAMON_TANLOV, 'navbat'),
    format: tanlov(r.format, ['aralash', ...Object.keys(FORMATLAR)], 'aralash'),
    mavzu: tanlov(r.mavzu, MAVZU_TANLOV, 'brend'),
    musiqa: tanlov(r.musiqa, MUSIQA_TANLOV, 'aralash'),
    musiqa_baland: Math.min(100, Math.max(0, Math.round(Number(r.musiqa_baland ?? 35)))),
    sfx: bool(r.sfx, true),
    subtitr: bool(r.subtitr, true),
    narx_korsat: bool(r.narx_korsat, true),
    davomiylik: [15, 30, 45].includes(Number(r.davomiylik)) ? Number(r.davomiylik) : 30,
    yoriqnoma: String(r.yoriqnoma || '').trim().slice(0, 800),
    tur: tanlov(r.tur, ['aralash', ...Object.keys(VIDEO_TURLARI).filter((k) => k !== 'erkin')], 'aralash'),
    subtitr_uslub: tanlov(r.subtitr_uslub, ['karaoke', 'chip', 'oddiy'], 'karaoke'),
    rasm_soni: Math.min(5, Math.max(0, Math.round(Number(r.rasm_soni ?? 3)) || 0)),
    rasm_uslub: tanlov(r.rasm_uslub, Object.keys(RASM_USLUBLARI), '3d'),
  };
}

export async function sozlamalar() {
  const s = await sozlama('reels', {}).catch(() => ({}));
  return sozlamaTozala(s && typeof s === 'object' ? s : {});
}

// Mahalliy formatlash (toLocaleString) muhitga qarab uzilmas bo'shliq qo'yadi — o'zimiz
const narxMatni = (n) => `${String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;

/** Bugungi video uchun mahsulot. */
export async function mahsulotTanla(productId = null) {
  if (productId) return qator('select * from products where id = $1 and is_active', [productId]);
  return qator(`
    select p.* from products p
     where p.is_active and p.stock > 0 and p.poster_id is not null and p.variant_of is null
     order by (select max(r.created_at) from reels_postlar r
                where r.product_id = p.id and r.holat in ('joylandi', 'tayyor')) asc nulls first,
              (p.old_price is not null and p.old_price > p.price) desc,
              random()
     limit 1`);
}

/** Haqiqiy sharhlar (4–5 yulduz, matni bor) — videoda faqat shular. Ism: faqat birinchi so'z. */
async function sharhlarOl(productId) {
  const r = await qatorlar(`select s.baho, s.matn, u.full_name from sharhlar s join users u on u.id = s.user_id
     where s.product_id = $1 and s.baho >= 4 and length(coalesce(s.matn, '')) between 12 and 220
     order by s.baho desc, s.created_at desc limit 3`, [productId]).catch(() => []);
  return r.map((x) => ({ baho: x.baho, matn: String(x.matn).replace(/\s+/g, ' ').trim(),
    ism: String(x.full_name || '').trim().split(/\s+/)[0]?.slice(0, 20) || 'Mijozimiz' }));
}

/** Videoda ko'rinadigan mahsulot ma'lumoti — faqat bazadan. */
function mahsulotMalumoti(p) {
  const chegirma = p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  let reytingMatn = '';
  if (Number(p.reyting) > 0 && p.sharh_soni > 0) reytingMatn = `⭐ ${Number(p.reyting).toFixed(1)} · ${p.sharh_soni} ta sharh`;
  else if (Number(p.manba_reyting) > 0) reytingMatn = `⭐ ${Number(p.manba_reyting).toFixed(1)} · Koreyada${p.manba_sharh ? ` ${narxMatni(p.manba_sharh).replace(' so‘m', '')} ta` : ''} baho`;
  return {
    nom: p.nom_uz || p.name, brend: p.brand || '', narxSon: Number(p.price) || 0, narx: narxMatni(p.price),
    eskiNarx: chegirma >= 3 ? narxMatni(p.old_price) : '', chegirma: chegirma >= 3 ? `-${chegirma}%` : '',
    hajm: p.volume || '', reytingMatn,
  };
}

const SXEMA = {
  type: 'object',
  properties: {
    format: { type: 'string' },
    sahnalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tur: { type: 'string', enum: SAHNA },
          ovoz: { type: 'string' },
          ekran: { type: 'string' },
          kichik: { type: 'string' },
          urgu: { type: 'string' },
          emoji: { type: 'string' },
          hissiyot: { type: 'string', enum: HISSIYOT },
          imo: { type: 'string', enum: IMO },
          belgilar: { type: 'array', items: { type: 'string' } },
          punktlar: { type: 'array', items: { type: 'object', properties: { matn: { type: 'string' }, emoji: { type: 'string' } }, required: ['matn'] } },
          raqam: { type: 'string' },
          birlik: { type: 'string' },
          sarlavha: { type: 'string' },
          yozuv: { type: 'string' },
          natija: { type: 'string' },
          izohcha: { type: 'string' },
          tugma: { type: 'string' },
          tayyor: { type: 'string' },
          ekran_turi: { type: 'string', enum: EKRANLAR },
          xabarlar: { type: 'array', items: { type: 'object', properties: { kim: { type: 'string', enum: ['mijoz', 'ai'] }, matn: { type: 'string' } }, required: ['kim', 'matn'] } },
          yomon: { type: 'array', items: { type: 'string' } },
          yaxshi: { type: 'array', items: { type: 'string' } },
          rasm_tavsif: { type: 'string' },
        },
        required: ['tur', 'ovoz', 'ekran', 'urgu', 'emoji', 'hissiyot', 'imo'],
      },
    },
    izoh: { type: 'string' },
    hashtaglar: { type: 'string' },
  },
  required: ['sahnalar', 'izoh', 'hashtaglar'],
};

/** Oxirgi videolarda ishlatilgan formatlar — takrorlanmasin. */
async function oxirgiFormatlar(n = 4) {
  const r = await qatorlar(`select ssenariy->>'format' as f, ssenariy->>'qahramon' as q from reels_postlar
     where ssenariy is not null order by id desc limit $1`, [n]).catch(() => []);
  return r;
}

const toza = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const bitEmoji = (v) => [...String(v || '').trim()].slice(0, 4).join('');

// Sahna turlari — AI ga tushuntirish (faqat shu videoda ruxsat etilganlari yuboriladi)
const SAHNA_TAVSIF = {
  hook: 'hook — 1-sahna, MAJBURIY. ekran: 2–5 so‘zli kutilmagan gap («Sotib olish shart emas»), kichik: 2–5 so‘zli davomi.',
  muammo: 'muammo — belgilar: 2–3 ta qisqa muammo (2–3 so‘z).',
  kashfiyot: 'kashfiyot — mahsulot birinchi ko‘rinadi. ekran: «Keyin buni topdim» kabi.',
  foyda: 'foyda — punktlar: ROPPA-ROSA 3 ta {matn: 3–5 so‘z, emoji}. Faqat tavsif/tarkibdagi faktlar.',
  natija: 'natija — his-tuyg‘u va natija (halol, va’dasiz). raqam/birlik — FAQAT faktlarda bo‘lsa, aks holda bo‘sh.',
  sharh: 'sharh — FAQAT haqiqiy sharh bo‘lsa.',
  narx: 'narx — narx bazadan ko‘rsatiladi; ekran: «Bugun chegirmada» kabi, ovozda raqam aytma.',
  hikoya: 'hikoya — qahramonning nutq pufagi (ekran — pufakdagi gap).',
  matn: 'matn — kinetik tipografiya: ekran 2–6 so‘z KATTA harflar bilan so‘zma-so‘z urilib chiqadi (kuchli urg‘u lahzasi).',
  oyna: 'oyna — ilova oynasi animatsiyasi: sarlavha (oyna nomi, masalan «KiOVO bot»), ekran (bo‘lim nomi), kichik (1 qator izoh), yozuv (qidiruv/xabar maydoniga YOZILADIGAN 2–5 so‘z), natija (chiqqan natija nomi), izohcha (natija ostidagi izoh), tugma (1–2 so‘z), tayyor (bosilgandan keyingi 1–2 so‘z). Kursor kelib tugmani bosadi.',
  chat: 'chat — suhbat animatsiyasi: xabarlar 2–3 ta {kim: mijoz|ai, matn ≤ 14 so‘z}; ai javobi «yozmoqda…» dan keyin yoziladi. sarlavha — chat nomi.',
  skaner: 'skaner — yuz skaneri animatsiyasi (skan chizig‘i, yuz nuqtalari, topilgan joylar); punktlar: 3 ta ko‘rsatkich nomi {matn: 1–2 so‘z, emoji} (Namlik, Yog‘lilik, Teshiklar…).',
  ilova: 'ilova — telefonda ilovaning HAQIQIY skrinshoti; ekran_turi: skaner|dokon|mahsulot|savat|maslahat (mahsulot — videodagi mahsulotning o‘z sahifasi: rasm va narx bazadan); ekran — tepadagi sarlavha, kichik — pastdagi izoh.',
  royxat: 'royxat — bajarilayotgan ishlar ro‘yxati (har biri ✓ bilan yonadi): sarlavha + punktlar 3–5 ta {matn: 2–5 so‘z}.',
  taqqos: 'taqqos — ikki ustun: yomon (2–3 noto‘g‘ri odat) va yaxshi (2–3 to‘g‘ri odat), har biri 2–4 so‘z.',
  bosqich: 'bosqich — raqamli qadamlar: punktlar 3–4 ta {matn: 2–5 so‘z, emoji}.',
  aksiya: 'aksiya — chegirmadagi mahsulot kartochkalari (rasm va narx bazadan); ekran — sarlavha («Bugungi chegirmalar»).',
  cta: 'cta — oxirgi sahna, MAJBURIY. ekran: «Izohga «+» yozing».',
  kadr: 'kadr — hikoya KADRI: butun ekranda AI chizgan rasm (buvi, oshxona, qishki ko‘cha, oyna oldida…), kino kabi; rasm_tavsif MAJBURIY; ekran — rasm ustidagi qisqa yozuv.',
  uchD: 'uchD — 3D sahna: mahsulot perspektivada aylanadi, orbita zarrachalari, oynadek aks; ekran — sarlavha, kichik — izoh.',
};

/** AI rejissyorga rasm qoidasi (rasm o'chiq bo'lsa — bo'sh). */
const rasmQoidasi = (st) => (st.rasm_soni > 0 ? `
- rasm_tavsif — sahna FONI uchun rasm (AI chizadi). Hikoyada odam, joy yoki narsa tilga olinsa — o'shani tasvirla:
  masalan buvi haqida gapirilsa «an elderly Uzbek grandmother with a warm smile in a cozy Tashkent kitchen, morning light».
  INGLIZCHA, 1–2 gap, matnsiz (harflar, logotip yo'q). Ko'pi bilan ${st.rasm_soni} ta sahnada; kadr sahnasida majburiy.
  Mahsulotning o'zini chizdirma (uning haqiqiy surati bazadan qo'yiladi).` : '');

// Ilova haqida haqiqiy faktlar (AI o'ylab topmasin)
const ILOVA_FAKT = `ILOVA FAKTLARI (faqat shularga tayan):
- KiOVO — Telegram bot va Mini App (Telegram ichida ochiladi), Android ilova ham bor.
- 📸 Yuz skaneri: selfi yuborasiz → AI teri turini (yog‘li, quruq, aralash, sezgir) va muammolarni (yog‘lilik, quruqlik,
  husnbuzar, pigment, teshiklar, qizarish) aniqlaydi → ertalabki va kechki parvarishni katalogdagi mahsulotlardan tuzadi.
  Natija rasm bilan Telegramda keladi, tavsiyalar bir bosishda savatga qo‘shiladi. Bepul (kunlik cheklov bor).
- 💬 AI maslahatchi: teri haqida yozib so‘raysiz (rasm ham yuborsa bo‘ladi) — darrov mos parvarish va mahsulot aytadi.
- 💄 «Mening rangim»: selfidan mos makiyaj ranglari.
- 🛍 Do‘kon: katalog, qidiruv, aksiyalar; buyurtma: Savat → Rasmiylashtirish → viloyat, manzil, yetkazish turi
  (pochta filiali yoki uygacha) → narx og‘irlikka qarab o‘zi hisoblanadi → tasdiqlash → kartaga to‘lab chek yuklaysiz.
- Yetkazish O‘zbekiston bo‘ylab pochta orqali.`;

/**
 * AI rejissyor: video turi + hikoya formati → sahnalar + Instagram izohi.
 * @param {object|null} p mahsulot qatori (mahsulotsiz turlarda null bo'lishi mumkin)
 * @param {object} st sozlamalar
 * @param {{tur?: string, goya?: string, format?: string, qahramon?: string|null, sharhlar?: object[], aksiya?: object[]}} o
 */
export async function ssenariyYoz(p, st, { tur = 'mahsulot', goya = '', format = null, qahramon = null, sharhlar = [], aksiya = [], mahsulotKorsat = false } = {}) {
  const { aiJson } = await import('../ai/index.js');
  const VT = VIDEO_TURLARI[tur] || VIDEO_TURLARI.mahsulot;
  const m = p ? mahsulotMalumoti(p) : null;
  const ruxsat = ruxsatSahnalar(tur, { mahsulotBor: Boolean(p), aksiyaBor: aksiya.length > 0, sharhBor: sharhlar.length > 0, st });
  const sozSoni = { 15: '30–40', 30: '60–80', 45: '95–120' }[st.davomiylik] || '60–80';
  const sahnaSoni = { 15: '4–5', 30: '6–8', 45: '8–9' }[st.davomiylik] || '6–8';
  const shaxs = qahramon === 'jasur' ? 'Jasur — doppili, quvnoq o‘zbek yigiti (erkaklar parvarishi haqida erkakcha gapiradi)'
    : qahramon === 'nigina' ? 'Nigina — do‘kon yordamchisi, quvnoq o‘zbek qizi' : null;
  const mahsulotBlok = m ? `MAHSULOT (faqat shu faktlar — o'ylab topma)${tur === 'mahsulot' ? ''
    : mahsulotKorsat ? ' — ADMIN G‘OYASIGA MOS (ombordan tanlandi): videoda uni ALBATTA nomi bilan ko‘rsat (kashfiyot sahnasi), ovozda ham nomini ayt'
      : ' — ixtiyoriy: oxirida yechim sifatida eslatsang bo‘ladi'}:
- nom: ${m.brend ? m.brend + ' ' : ''}${m.nom}${m.hajm ? ` (${m.hajm})` : ''}
- tavsif: ${String(p.description || '').slice(0, 700)}
- faol moddalar: ${(p.actives || []).join(', ') || '—'}
- qaysi muammoga: ${(p.concerns || []).join(', ') || '—'}
- teri turi: ${(p.skin_types || []).join(', ') || '—'}
- qo'llash: ${String(p.usage_text || '').slice(0, 300)}
- narx: ${m.narx}${m.chegirma ? ` (chegirma ${m.chegirma}, eski narx ${m.eskiNarx})` : ''}
- reyting: ${m.reytingMatn || '—'}
- haqiqiy sharhlar: ${sharhlar.length ? sharhlar.map((x) => `«${x.matn}» (${x.baho}★)`).join('; ') : 'YO‘Q'}
` : '';
  const aksiyaBlok = aksiya.length ? `CHEGIRMADAGI MAHSULOTLAR (bazadan, kartochkada ko'rinadi — ovozda narx aytma):
${aksiya.map((a) => `- ${a.nom}: ${a.narx} (eski ${a.eskiNarx}, ${a.chegirma})`).join('\n')}
` : '';
  const ilovaBlok = ['skaner', 'maslahat', 'buyurtma', 'erkin'].includes(tur) ? `${ILOVA_FAKT}\n` : '';
  const ctaKichik = tur === 'mahsulot' ? 'Narx va maslahat — Direct’da' : 'Havolani Direct’ga yuboramiz';
  const j = await aiJson([{ text: `Sen KiOVO (Koreya kosmetikasi, O'zbekiston) Instagram sahifasining REJISSYORISAN.
Animatsion Reels ssenariysini yozasan: ${shaxs ? `multfilm qahramon ${shaxs} BIRINCHI SHAXSDA hikoya qiladi` : 'diktor gapiradi, ekranda kinetik matn va animatsiya'}.
VIDEO TURI: ${VT.nom} — ${VT.mavzu}.
Maqsad — odam videoni oxirigacha ko'rsin, saqlab qo'ysin va izohga «+» yozsin.

${mahsulotBlok}${aksiyaBlok}${ilovaBlok}HIKOYA FORMATI: ${format ? `${format} — ${FORMATLAR[format]}` : 'o‘zing tanla'}
${goya ? `ADMIN G'OYASI (albatta shunga amal qil): ${toza(goya, 400)}\n` : ''}${st.yoriqnoma ? `DOIMIY YO'RIQNOMA: ${st.yoriqnoma}\n` : ''}
SAHNALAR (${sahnaSoni} ta, tartib bilan, turlarni ARALASHTIR — bir xil ko'rinish ketma-ket kelmasin). Faqat shu turlar:
${ruxsat.map((k) => `- ${SAHNA_TAVSIF[k]}`).join('\n')}

Har sahnada:
- ovoz — qahramon aytadigan gap, 6–20 so'z, jonli og'zaki o'zbek tili (do'stiga gapirgandek), raqamlarni so'z bilan yoz,
  belgilar (+, %, —) ishlatma. Jami ovoz: ${sozSoni} so'z. cta ovozi: «Izohga plyus yozing — ${tur === 'mahsulot' ? 'narx va maslahatni' : 'havolani'} Direct'ga yuboraman».
  O‘zbek lotin yozuvi TO‘G‘RI bo‘lsin: o‘ va g‘ harflaridagi tutuq belgisi (‘) albatta yozilsin (to‘g‘ri, o‘rgatardi, yog‘) — bu taqiqlangan belgi emas.
- ekran — ekrandagi katta matn, 2–6 so'z (ovozni takrorlamaydi, urg'u beradi). urgu — ekran ichidagi BITTA eng muhim so'z.
- emoji — bitta mos emoji. hissiyot: ${HISSIYOT.join('/')}. imo (qo'llar): ${IMO.join('/')}.${rasmQoidasi(st)}
Taqiq: kasallikni davolaydi deb va'da berma, «100%», «abadiy», «kafolat» yozma; boshqa brendlarni yomonlama; faktlarda yo'q narsani aytma.
Mahsulot haqida gapirsang — FAQAT yuqoridagi MAHSULOT ni aniq nomi bilan ayt; «KiOVO mahsuloti», «bizning krem» kabi umumiy nom ishlatma.
Mahsulot berilmagan bo'lsa — aniq mahsulotni maqtama (o'ylab topilgan nom bo'lmasin).

izoh — Instagram post matni: 2–4 qisqa abzats, hikoya ohangida, 1–3 emoji, oxirida «Izohga «+» yozing — ${tur === 'mahsulot' ? 'narx va maslahatni' : 'havolani'} Direct'ga yuboramiz 💌». Narxni yozma.
hashtaglar — 6–10 ta, # bilan, bo'sh joy bilan.
format — tanlagan format kaliti (${Object.keys(FORMATLAR).join('/')}).
cta kichik matni: «${ctaKichik}».
Butun javob O'ZBEK tilida (lotin). Faqat JSON.` }], SXEMA,
  { temperature: 0.9, maxTokens: 3500, qayerda: 'reels', yozuv: true });
  return ssenariyTozala(j, { st, sharhlar, format, qahramon, tur, mahsulotBor: Boolean(p), aksiyaBor: aksiya.length > 0, mahsulotKorsat });
}

/** Shu video uchun ruxsat etilgan sahna turlari. */
function ruxsatSahnalar(tur, { mahsulotBor, aksiyaBor, sharhBor = true, st = STANDART }) {
  const VT = VIDEO_TURLARI[tur] || VIDEO_TURLARI.mahsulot;
  let r = [...VT.sahnalar];
  // Mahsulot berilgan foydali/erkin videoda — mahsulot sahnalari ham mumkin
  if (mahsulotBor && tur !== 'mahsulot') r.push(...MAHSULOT_SAHNA.filter((k) => !r.includes(k)));
  return r.filter((k) => (mahsulotBor || !MAHSULOT_SAHNA.includes(k)) && (aksiyaBor || k !== 'aksiya') && (st.rasm_soni > 0 || k !== 'kadr')
    && (sharhBor || k !== 'sharh') && (st.narx_korsat || k !== 'narx'));
}

const qatorRoyxat = (v, n, uz) => (Array.isArray(v) ? v : []).map((q) => toza(q, uz)).filter(Boolean).slice(0, n);

/** AI javobini (yoki admin tahririni) xavfsiz ko'rinishga keltiradi. */
export function ssenariyTozala(j, { st = STANDART, sharhlar = [], format = null, qahramon = null, tur = 'mahsulot',
  mahsulotBor = tur === 'mahsulot', aksiyaBor = false, mahsulotKorsat = false } = {}) {
  const sharh = sharhlar[0] || null;
  const ruxsat = new Set(ruxsatSahnalar(tur, { mahsulotBor, aksiyaBor, sharhBor: Boolean(sharh), st }));
  const stdEkran = { skaner: 'skaner', maslahat: 'maslahat', buyurtma: 'dokon' }[tur] || 'dokon';
  let sahnalar = (Array.isArray(j?.sahnalar) ? j.sahnalar : []).map((x) => {
    const y = {
      tur: SAHNA.includes(x?.tur) ? x.tur : 'hikoya',
      ovoz: toza(x?.ovoz, 260),
      ekran: toza(x?.ekran, 60),
      kichik: toza(x?.kichik, 70),
      // urg'u bo'lmasa — ekran matnidagi eng uzun so'z (markerli ko'rinadi)
      urgu: toza(x?.urgu, 30) || String(x?.ekran || '').split(/\s+/).sort((a, b) => b.length - a.length)[0]?.replace(/[^\p{L}\p{N}‘’'ʻ]/gu, '') || '',
      emoji: bitEmoji(x?.emoji),
      hissiyot: HISSIYOT.includes(x?.hissiyot) ? x.hissiyot : undefined,
      imo: IMO.includes(x?.imo) ? x.imo : undefined,
      belgilar: qatorRoyxat(x?.belgilar, 3, 28),
      punktlar: (Array.isArray(x?.punktlar) ? x.punktlar : []).map((q) => ({ matn: toza(q?.matn ?? q, 46), emoji: bitEmoji(q?.emoji) || '' }))
        .filter((q) => q.matn).slice(0, 5),
      raqam: toza(x?.raqam, 6),
      birlik: toza(x?.birlik, 16),
      rasm_tavsif: toza(x?.rasm_tavsif, 400) || undefined,
    };
    // Yangi sahnalar maydonlari — faqat kerakli turda
    if (y.tur === 'oyna') Object.assign(y, { sarlavha: toza(x?.sarlavha, 30), yozuv: toza(x?.yozuv, 40), natija: toza(x?.natija, 40),
      izohcha: toza(x?.izohcha, 50), tugma: toza(x?.tugma, 16), tayyor: toza(x?.tayyor, 16) });
    if (y.tur === 'chat') Object.assign(y, { sarlavha: toza(x?.sarlavha, 30), xabarlar: (Array.isArray(x?.xabarlar) ? x.xabarlar : [])
      .map((q) => ({ kim: q?.kim === 'mijoz' ? 'mijoz' : 'ai', matn: toza(q?.matn, 140) })).filter((q) => q.matn).slice(0, 4) });
    if (y.tur === 'royxat') y.sarlavha = toza(x?.sarlavha, 30);
    if (y.tur === 'ilova') y.ekran_turi = EKRANLAR.includes(x?.ekran_turi) ? x.ekran_turi : stdEkran;
    if (y.tur === 'taqqos') Object.assign(y, { yomon: qatorRoyxat(x?.yomon, 3, 40), yaxshi: qatorRoyxat(x?.yaxshi, 3, 40) });
    return y;
  }).filter((x) => x.ovoz || x.ekran);
  // Mahsulot/sharh/narx/aksiya sahnasi uchun ma'lumot bo'lmasa — sahna butunlay olib tashlanadi
  // (ovozi «mijozlar maqtashyapti» desa-yu, sharh bo'lmasa — bu yolg'on bo'ladi)
  sahnalar = sahnalar.filter((x) => ruxsat.has(x.tur) || ![...MAHSULOT_SAHNA, 'aksiya'].includes(x.tur));
  // Qolgan ruxsatsiz yoki ma'lumoti yetishmagan sahna — kinetik matnga aylanadi (ovoz yo'qolmaydi)
  for (const x of sahnalar) {
    const yetarli = (x.tur !== 'chat' || x.xabarlar?.length) && (x.tur !== 'taqqos' || (x.yomon?.length && x.yaxshi?.length))
      && (!['royxat', 'bosqich'].includes(x.tur) || x.punktlar.length >= 2) && (x.tur !== 'oyna' || x.yozuv)
      && (x.tur !== 'kadr' || x.rasm_tavsif);
    if (!ruxsat.has(x.tur) || !yetarli) x.tur = x.tur === 'hook' || x.tur === 'cta' ? x.tur : x.tur === 'kadr' ? 'hikoya' : 'matn';
    if (x.tur === 'skaner' && !x.punktlar.length) x.punktlar = [{ matn: 'Namlik', emoji: '💧' }, { matn: 'Yog‘lilik', emoji: '✨' }, { matn: 'Teshiklar', emoji: '🔍' }];
    if (x.tur === 'sharh') x.sharh = sharh;
  }
  // Bitta turdagi sahnalar takrorlanmasin (hikoya va matndan tashqari)
  const bor = new Set();
  sahnalar = sahnalar.filter((x) => { if (['hikoya', 'matn', 'kadr'].includes(x.tur)) return true; if (bor.has(x.tur)) return false; bor.add(x.tur); return true; });
  if (!sahnalar.length || sahnalar[0].tur !== 'hook') {
    const i = sahnalar.findIndex((x) => x.tur === 'hook');
    if (i > 0) sahnalar.unshift(...sahnalar.splice(i, 1));
    else sahnalar.unshift({ tur: 'hook', ekran: 'Buni bilarmidingiz?', kichik: '', ovoz: 'Buni bilarmidingiz?', emoji: '🤫', belgilar: [], punktlar: [] });
  }
  if ((tur === 'mahsulot' || mahsulotKorsat) && mahsulotBor && !sahnalar.some((x) => x.tur === 'kashfiyot')) {
    sahnalar.splice(Math.min(2, sahnalar.length), 0, { tur: 'kashfiyot', ekran: 'Mana u!', ovoz: 'Mana, men aytgan mahsulot.', emoji: '✨', belgilar: [], punktlar: [] });
  }
  const ctaKichik = tur === 'mahsulot' ? 'Narx va maslahat — Direct’da' : 'Havolani Direct’ga yuboramiz';
  const ctaI = sahnalar.findIndex((x) => x.tur === 'cta');
  const cta = ctaI >= 0 ? sahnalar.splice(ctaI, 1)[0] : { tur: 'cta', ekran: 'Izohga «+» yozing', kichik: ctaKichik,
    ovoz: `Izohga plyus yozing — ${tur === 'mahsulot' ? 'narx va maslahatni' : 'havolani'} Direct’ga yuboraman!`, emoji: '💌', belgilar: [], punktlar: [] };
  if (!cta.ekran) cta.ekran = 'Izohga «+» yozing';
  if (!cta.kichik) cta.kichik = ctaKichik;
  sahnalar = [...sahnalar.slice(0, 8), cta];
  for (const x of sahnalar) {
    if (x.tur === 'foyda') {
      x.punktlar = x.punktlar.slice(0, 3).map((q) => ({ ...q, emoji: q.emoji || '✨' }));
      while (x.punktlar.length < 3) x.punktlar.push([{ matn: 'Koreyadan original', emoji: '🇰🇷' }, { matn: 'Teriga yumshoq', emoji: '🌿' }, { matn: 'Har kuni qulay', emoji: '✨' }][x.punktlar.length]);
    }
    if (!x.ovoz) x.ovoz = x.ekran;
    if (!x.birlik) x.raqam = '';                 // «10» nima ekani aytilmasa — ko'rsatilmaydi
  }
  const izoh = `${String(j?.izoh || '').trim().slice(0, 1800)}\n\n${toza(j?.hashtaglar, 300)}`.trim();
  return { tur, format: format || (FORMATLAR[j?.format] ? j.format : 'aralash'), qahramon, sahnalar, izoh };
}

/** Eski shablon uchun (kanvas yo'q bo'lsa): hook, 3 punkt, ovoz. */
function oddiyKorinish(s) {
  const f = s.sahnalar.find((x) => x.tur === 'foyda');
  const punktlar = (f?.punktlar || []).map((q) => q.matn).slice(0, 3);
  while (punktlar.length < 3) punktlar.push(['Koreyadan original mahsulot', 'Teriga yumshoq ta’sir qiladi', 'Har kuni qo‘llash uchun qulay'][punktlar.length]);
  return { hook: s.sahnalar[0]?.ekran || 'Koreya sirini sinab ko‘ring', punktlar, ovoz: s.sahnalar.map((x) => x.ovoz).join(' ') };
}

async function suratBayt(p) {
  const m = p.poster_id ? await qator('select mime, bayt from media where id = $1', [p.poster_id]) : null;
  if (!m?.bayt) return null;
  try {
    const j = await jpegQil(Buffer.from(m.bayt), m.mime, { eni: 1080, sifat: 90 });
    return j.bayt;
  } catch { return Buffer.from(m.bayt); }
}

let logoKesh = null;
async function logoPng() {
  if (logoKesh) return logoKesh;
  const { svgdanPng } = await import('../rasm/chiz.js');
  const { logoSvg, BREND } = await import('../lib/logo.js');
  logoKesh = await svgdanPng(logoSvg({ rang: BREND.lime }), 600, { fon: null });
  return logoKesh;
}

const tasodif = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Bu video uchun qahramon, format, mavzu, musiqa. */
async function tanlovlar(st, { qahramon, format } = {}) {
  const oxirgi = await oxirgiFormatlar(4);
  let q = null;
  // 'yoq' — admin (yoki AI muharrir) shu videoni qahramonsiz so'radi
  if (st.uslub === 'hikoya' && qahramon !== 'yoq') {
    if (qahramon && ['nigina', 'jasur'].includes(qahramon)) q = qahramon;
    else if (st.qahramon === 'navbat') q = oxirgi.find((x) => x.q)?.q === 'nigina' ? 'jasur' : 'nigina';
    else q = st.qahramon;
  }
  let f = format && FORMATLAR[format] ? format : st.format;
  if (f === 'aralash') {
    const ishlatilgan = new Set(oxirgi.map((x) => x.f));
    const qolgan = Object.keys(FORMATLAR).filter((k) => !ishlatilgan.has(k));
    f = tasodif(qolgan.length ? qolgan : Object.keys(FORMATLAR));
  }
  const mavzu = st.mavzu === 'aralash' ? tasodif(['brend', 'pastel', 'tungi', 'yorqin']) : st.mavzu;
  const musiqa = st.musiqa === 'aralash' ? tasodif(['quvnoq', 'lofi', 'energiya', 'quvnoq']) : st.musiqa;
  return { qahramon: q, format: f, mavzu, musiqa };
}

// Bir vaqtda faqat BITTA render (CPU og'ir) — qolganlari navbat kutadi
let renderNavbati = Promise.resolve();
const navbatda = (fn) => {
  const r = renderNavbati.then(fn, fn);
  renderNavbati = r.catch(() => {});
  return r;
};

// ═══════════ MATNDAN MAHSULOTNI TOPISH ═══════════
// Admin g'oyada yoki tuzatishda mahsulot nomini aytsa («COSRX snail kremi haqida»,
// «Laneige ni ko'rsat») — u BAZADAN topiladi va video o'sha mahsulotning nomi,
// rasmi, narxi va tarkibi bilan yasaladi. Aks holda AI «KiOVO mahsuloti» deb
// umumiy gapirib qo'yardi.

/** Matnga nomi mos keladigan mahsulotlar (ball bo'yicha). */
export async function mahsulotNomzodlari(matn, n = 6) {
  const { sozlar } = await import('../ai/katalog-tanlov.js');
  const kalit = [...new Set(sozlar(matn))];
  if (!kalit.length) return [];
  // «kremi» ~ «krem», «snail» ~ «snails»: 4+ harfli so'zlarda boshi mos kelsa yetadi
  const mos = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
  const bor = (t) => kalit.some((k) => mos(k, t));
  const r = await qatorlar(`select id, name, nom_uz, brand, kalit_sozlar, poster_id, sold_count from products
     where is_active and variant_of is null`).catch(() => []);
  return r.map((p) => {
    const brend = sozlar(p.brand);
    const nom = new Set([...sozlar(p.name), ...sozlar(p.nom_uz)].filter((t) => !brend.includes(t)));
    const kal = new Set((p.kalit_sozlar || []).flatMap((x) => sozlar(x)).filter((t) => !nom.has(t) && !brend.includes(t)));
    let ball = brend.length && brend.every(bor) ? 5 : 0;
    for (const t of nom) if (bor(t)) ball += 3;
    for (const t of kal) if (bor(t)) ball += 2;
    return { ...p, ball };
  }).filter((p) => p.ball >= 3)
    .sort((a, b) => b.ball - a.ball || Number(Boolean(b.poster_id)) - Number(Boolean(a.poster_id)) || (b.sold_count || 0) - (a.sold_count || 0))
    .slice(0, n);
}

/** Bitta mahsulot aniq ajralib tursa — o'sha (aks holda null). */
export const aniqMahsulot = (nomzod) => {
  const [a, b] = nomzod;
  return a && a.ball >= 6 && (!b || a.ball - b.ball >= 3) ? a : null;
};

/**
 * AI BUTUN OMBORNI ko'rib, so'zlarga eng mos mahsulotni tanlaydi — nomi aytilmasa
 * ham mazmun bo'yicha («tovon uchun video» → tovon/oyoq kremi, «lab» → lab balzami).
 * Mos mahsulot yo'q yoki so'zlar mahsulotga aloqasiz bo'lsa — null.
 * @returns {Promise<{id:number, sabab:string}|null>}
 */
export async function katalogdanTanla(matn) {
  const r = await qatorlar(`select p.id, p.name, p.nom_uz, p.brand, p.step, p.concerns, p.kalit_sozlar, p.stock, p.poster_id,
       c.name as toifa
     from products p left join categories c on c.id = p.category_id
    where p.is_active and p.variant_of is null
    order by (p.stock > 0) desc, (p.poster_id is not null) desc, p.sold_count desc nulls last limit 800`).catch(() => []);
  if (!r.length) return null;
  const qator = (p) => [p.id, [p.brand, p.nom_uz || p.name].filter(Boolean).join(' ') + (p.nom_uz && p.nom_uz !== p.name ? ` (${p.name})` : ''),
    p.toifa || p.step || '', (p.concerns || []).slice(0, 4).join(','), (p.kalit_sozlar || []).slice(0, 6).join(','),
    p.stock > 0 ? '' : 'TUGAGAN', p.poster_id ? '' : 'RASMSIZ'].join('|').replace(/\|+$/, '');
  const { aiJson } = await import('../ai/index.js');
  const j = await aiJson([{ text: `Sen KiOVO do'koni (Koreya kosmetikasi) katalogini TO'LIQ bilasan.
Admin video haqida aytdi: «${toza(matn, 800)}»

Vazifa: shu video uchun katalogdan ENG MOS BITTA mahsulotni tanla.
- Nomi yoki brendi aytilgan bo'lsa — o'sha mahsulot.
- Nomi aytilmagan, lekin MAVZU aytilgan bo'lsa — mazmuniga mosini o'zing top: masalan «tovon», «oyoq» → tovon/oyoq kremi;
  «lab» → lab balzami/niqobi; «soch» → soch vositasi; «husnbuzar» → akne uchun vosita; «quyosh» → quyoshdan himoya.
- TUGAGAN va RASMSIZ belgilisini iloji boricha tanlama.
- So'zlar mahsulotga aloqasiz bo'lsa (masalan faqat musiqa, subtitr, rang, ovoz, uzunlik haqida) yoki katalogda mos mahsulot umuman yo'q bo'lsa — id: 0.
sabab — 1 qisqa gap (o'zbekcha): nega aynan shu mahsulot (yoki nega yo'q).

KATALOG (id|mahsulot|toifa|muammolar|kalit so'zlar|holat):
${r.map(qator).join('\n')}
Faqat JSON.` }], { type: 'object', properties: { id: { type: 'number' }, sabab: { type: 'string' } }, required: ['id', 'sabab'] },
  { temperature: 0, maxTokens: 1000, qayerda: 'reels-katalog' }).catch(() => null);
  const id = Number(j?.id);
  if (!j) return null;
  // id: 0 — mos mahsulot yo'q (sababi adminga ko'rsatiladi: «omborda tovon kremi yo'q»)
  return { id: id && r.some((p) => p.id === id) ? id : 0, sabab: toza(j?.sabab, 200) };
}

/** Matndagi mahsulot: avval aniq nom mosligi (tez, AI siz), bo'lmasa AI butun ombordan tanlaydi. */
export async function matndanMahsulot(matn) {
  const a = aniqMahsulot(await mahsulotNomzodlari(matn));
  if (a) return { id: a.id, sabab: 'nomi bo‘yicha topildi' };
  return katalogdanTanla(matn);
}

/** «aralash» rejada bugungi video turi (Toshkent hafta kuni bo'yicha). */
export function bugungiTur(sana = new Date()) {
  return HAFTA_REJASI[new Date(sana.getTime() + 5 * 3600e3).getUTCDay()];
}

/** Chegirmadagi mahsulotlar (eng katta chegirma birinchi) — aksiya videosi uchun. */
async function aksiyaMahsulotlar(n = 4) {
  const r = await qatorlar(`select * from products where is_active and stock > 0 and poster_id is not null
     and variant_of is null and old_price > price order by (old_price - price)::float / old_price desc limit $1`, [n]).catch(() => []);
  const chiq = [];
  for (const p of r) {
    const m = mahsulotMalumoti(p);
    chiq.push({ id: p.id, nom: [m.brend, m.nom].filter(Boolean).join(' '), narx: m.narx, eskiNarx: m.eskiNarx || narxMatni(p.old_price),
      chegirma: m.chegirma, rasm: await suratBayt(p).catch(() => null) });
  }
  return chiq;
}

/**
 * Video tayyorlaydi (joylamaydi).
 * @param {object} o
 * @param {string} [o.tur]        video turi (VIDEO_TURLARI); bo'lmasa — sozlama/hafta rejasi
 * @param {number} [o.productId]  aniq mahsulot (mahsulot turida bo'lmasa — navbatdagisi)
 * @param {string} [o.manba]      jadval | qolda | tahrir
 * @param {string} [o.goya]       admin g'oyasi (shu video uchun)
 * @param {object} [o.ssenariy]   tayyor (tahrirlangan) ssenariy — AI qayta yozmaydi
 * @param {string} [o.qahramon]   majburiy qahramon
 * @param {string} [o.format]     majburiy hikoya formati
 * @param {string} [o.sifat]      toliq | sinov
 * @returns {Promise<object>} reels_postlar qatori (holat 'tayyor')
 */
export async function videoTayyorla({ tur = null, productId = null, manba = 'jadval', goya = '', ssenariy = null, qahramon = null,
  format = null, sifat = process.env.REELS_SIFAT || 'toliq' } = {}) {
  const st = await sozlamalar();
  // G'oyada mahsulot (nomi yoki mavzusi) aytilgan bo'lsa — AI butun ombordan mosini topadi
  // (rasm, narx, tarkib — o'shaniki): «tovon uchun video» → tovon kremi
  let goyaMahsulot = false, tanlov = null;
  if (!productId && !ssenariy && String(goya || '').trim()) {
    tanlov = await matndanMahsulot(goya).catch(() => null);
    if (tanlov?.id) { productId = tanlov.id; goyaMahsulot = tanlov; }
  }
  // Mahsulot aniq tanlangan bo'lsa — mahsulot videosi; aks holda sozlama yoki hafta rejasi
  tur = tur || ssenariy?.tur || (ssenariy || productId ? 'mahsulot' : (st.tur === 'aralash' ? bugungiTur() : st.tur));
  if (!VIDEO_TURLARI[tur]) tur = 'mahsulot';
  if (tur === 'erkin' && !goya && !ssenariy) throw Object.assign(new Error('Erkin video uchun g‘oya yozing.'), { turkum: 'reels' });
  const aksiya = tur === 'aksiya' ? await aksiyaMahsulotlar() : [];
  if (tur === 'aksiya' && !aksiya.length) tur = 'mahsulot';            // chegirma yo'q — oddiy mahsulot videosi
  const p = VIDEO_TURLARI[tur].mahsulot || productId ? await mahsulotTanla(productId) : null;
  if (VIDEO_TURLARI[tur].mahsulot && !p) throw Object.assign(new Error('Video uchun mahsulot yo‘q — omborda bor va surati bor mahsulot kerak.'), { turkum: 'reels' });
  const r = await qator(`insert into reels_postlar (product_id, manba) values ($1, $2) returning *`, [p?.id ?? null, manba]);
  try {
    const sharhlar = p ? await sharhlarOl(p.id) : [];
    const tl = await tanlovlar(st, { qahramon: qahramon ?? ssenariy?.qahramon, format: format ?? ssenariy?.format });
    // Admin mahsulotni nomi bilan aytgan bo'lsa — videoda ALBATTA ko'rsatiladi (kashfiyot sahnasi)
    const mahsulotKorsat = Boolean(p) && (goyaMahsulot || Boolean(ssenariy?.mahsulot_korsat));
    const o = { st, sharhlar, tur, mahsulotBor: Boolean(p), aksiyaBor: aksiya.length > 0, mahsulotKorsat };
    const s = ssenariy
      ? { ...ssenariyTozala(ssenariy, { ...o, format: ssenariy.format || tl.format, qahramon: tl.qahramon }), izoh: String(ssenariy.izoh || '').slice(0, 2200) }
      : await ssenariyYoz(p, st, { tur, goya, format: tl.format, qahramon: tl.qahramon, sharhlar, aksiya, mahsulotKorsat });
    s.tur = tur; s.qahramon = tl.qahramon; s.mavzu = ssenariy?.mavzu || tl.mavzu; s.musiqa = ssenariy?.musiqa || tl.musiqa;
    if (mahsulotKorsat) s.mahsulot_korsat = true;
    if (goyaMahsulot && p) s.mahsulot_tanlov = { nom: [p.brand, p.nom_uz || p.name].filter(Boolean).join(' '), sabab: goyaMahsulot.sabab };
    else if (tanlov && !tanlov.id && tanlov.sabab) s.mahsulot_tanlov = { nom: null, sabab: tanlov.sabab };
    if (goya) s.goya = toza(goya, 400);

    if (ssenariy?.ustama) s.ustama = ssenariy.ustama;
    if (ssenariy?.tuzatishlar) s.tuzatishlar = ssenariy.tuzatishlar;
    // Shu videoga xos sozlamalar (AI muharrir: «subtitr chip bo'lsin», «musiqasiz»…)
    const stV = s.ustama ? sozlamaTozala(s.ustama, st) : st;
    const { mp4, soniya, ovozli } = await navbatda(() => render(p, s, stV, sifat, { aksiya }));
    const m = await qator(`insert into media (tur, mime, bayt, hajm, goya) values ('video', 'video/mp4', $1, $2, $3) returning id`,
      [mp4, mp4.length, `Reels #${r.id}`]);
    return await qator(`update reels_postlar set holat = 'tayyor', video_id = $1, soniya = $2, izoh = $3,
        ssenariy = $4, ovozli = $5 where id = $6 returning *`,
      [m.id, soniya, s.izoh, JSON.stringify(s), ovozli, r.id]);
  } catch (e) {
    await sorov(`update reels_postlar set holat = 'xato', xato = $1 where id = $2`, [String(e.message).slice(0, 500), r.id]);
    throw e;
  }
}

/**
 * Hikoyaga mos rasmlar: AI rejissyor yozgan rasm_tavsif bo'yicha Gemini chizadi
 * (buvi, oshxona, qishki ko'cha…). Bir xil tavsif + uslub qayta chizilmaydi —
 * bazadan olinadi (qayta render, AI tuzatish tez va bepul).
 * @returns {Promise<Record<number, Buffer>>} sahna indeksi → JPEG
 */
export async function sahnaRasmlari(sahnalar, st) {
  const chiq = {};
  if (!st.rasm_soni) return chiq;
  const navbat = sahnalar.map((x, i) => ({ x, i })).filter(({ x }) => x.rasm_tavsif)
    .sort((a, b) => Number(b.x.tur === 'kadr') - Number(a.x.tur === 'kadr')).slice(0, st.rasm_soni);
  if (!navbat.length) return chiq;
  const { createHash } = await import('node:crypto');
  const { aiRasm } = await import('../ai/index.js');
  for (const { x, i } of navbat) {
    const prompt = `${x.rasm_tavsif}. Style: ${RASM_USLUBLARI[st.rasm_uslub] || RASM_USLUBLARI['3d']}. Vertical 9:16 composition, `
      + 'main subject in the middle third, calm uncluttered areas at the top and bottom for captions. '
      + 'Absolutely no text, letters, numbers, logos or watermarks.';
    const kalit = `reels-rasm:${createHash('sha1').update(prompt).digest('hex').slice(0, 24)}`;
    let m = await qator(`select bayt from media where goya = $1 order by created_at desc limit 1`, [kalit]).catch(() => null);
    if (!m) {
      try {
        // Model ba'zan rasmsiz javob qaytaradi («Rasm qaytmadi») — bir marta soddaroq so'rov bilan qayta
        const r = await aiRasm([{ text: prompt }], { nisbat: '9:16', qayerda: 'reels-rasm' })
          .catch((e) => {
            if (!['bosh', 'nomalum', 'vaqt', 'band'].includes(e.turkum)) throw e;
            return aiRasm([{ text: `${x.rasm_tavsif}. ${RASM_USLUBLARI[st.rasm_uslub] || RASM_USLUBLARI['3d']}. Vertical image, no text.` }],
              { nisbat: '9:16', qayerda: 'reels-rasm' });
          });
        const xom = Buffer.from(r.base64, 'base64');
        const j = await jpegQil(xom, r.mime, { eni: 1080, sifat: 86 }).catch(() => ({ bayt: xom }));
        m = await qator(`insert into media (tur, mime, bayt, hajm, nisbat, prompt, goya)
          values ('reels_rasm', 'image/jpeg', $1, $2, '9:16', $3, $4) returning bayt`, [j.bayt, j.bayt.length, prompt.slice(0, 1000), kalit]);
      } catch (e) { console.warn('REELS rasm chizilmadi:', e.message); continue; }
    }
    chiq[i] = Buffer.from(m.bayt);
  }
  return chiq;
}

// Ilovaning haqiqiy skrinshotlari (public/uy/ilova-*.jpg) — «ilova» sahnasi uchun
let ekranKesh = null;
async function ilovaEkranlari() {
  if (ekranKesh) return ekranKesh;
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const papka = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'uy');
  ekranKesh = {};
  for (const k of EKRANLAR) {
    try { ekranKesh[k] = await fs.readFile(path.join(papka, `ilova-${k}.jpg`)); } catch { /* yo'q bo'lsa — rangli ekran */ }
  }
  return ekranKesh;
}

/** Ovoz + render. Kanvas yo'q yoki motor 'oddiy' — eski shablon (faqat mahsulot videosi). */
async function render(p, s, st, sifat, { aksiya = [] } = {}) {
  const ovozMatn = s.sahnalar.map((x) => x.ovoz).join('\n\n');
  const qo = QAHRAMON_OVOZI[s.qahramon];
  let ovoz = null;
  if (st.ovozli && ovozMatn) {
    ovoz = await ovozYoz(ovozMatn, {
      model: st.ovoz_model,
      ovoz: st.ovoz !== 'avto' ? st.ovoz : (qo?.ovoz || OVOZ_STANDART.ovoz),
      uslub: st.ovoz_uslubi || qo?.uslub || undefined,
    }).catch((e) => { console.warn('REELS ovoz yozilmadi:', e.message); return null; });
  }
  const surat = p ? await suratBayt(p) : null;
  const kino = await import('../video/kino/index.js');
  const kanvasBor = st.motor === 'kino' && (await kino.kanvasBormi()).ha;
  if (kanvasBor) {
    const { wavOqi } = await import('../video/kino/ovoz-vaqt.js');
    const r = await kino.kinoYasa({
      sahnalar: s.sahnalar, qahramon: s.qahramon, mavzu: s.mavzu, mahsulot: p ? mahsulotMalumoti(p) : {},
      rasmlar: { mahsulot: surat, logo: await logoPng(),
        ekranlar: s.sahnalar.some((x) => x.tur === 'ilova') ? await ilovaEkranlari() : {}, aksiya,
        sahna: await sahnaRasmlari(s.sahnalar, st) },
      ovoz: ovoz ? wavOqi(ovoz.wav) : null,
      musiqa: s.musiqa, musiqaBaland: st.musiqa_baland / 100, sfx: st.sfx, subtitr: st.subtitr,
      subtitrUslub: st.subtitr_uslub, seed: ((p?.id ?? s.sahnalar.length) % 7) + 1,
    }, { sifat });
    return { mp4: r.mp4, soniya: +r.soniya.toFixed(2), ovozli: Boolean(ovoz) };
  }
  if (!p) throw Object.assign(new Error('Animatsiya motori ishlamayapti — bu turdagi video faqat yangi motorda yasaladi.'), { turkum: 'kanvas' });
  const o = oddiyKorinish(s), m = mahsulotMalumoti(p);
  const r = await reelsYasa({ surat: surat ? { rasm: surat.toString('base64'), mime: 'image/jpeg' } : null, ovoz, ssenariy: {
    hook: o.hook, punktlar: o.punktlar, nom: m.nom, brend: m.brend, narx: m.narx, eskiNarx: m.eskiNarx,
    chaqiriq: 'Izohga «+» yozing', pastki: 'Narx va maslahat — Direct’da · KiOVO' } });
  return { ...r, ovozli: Boolean(ovoz) };
}

/** Avvalgi videoni qayta yasaydi: tahrirlangan ssenariy bilan yoki shu mavzuga yangi ssenariy. */
export async function qaytaYasa(id, { ssenariy = null, izoh = null, goya = '' } = {}) {
  const eski = await qator('select * from reels_postlar where id = $1', [id]);
  if (!eski) throw new Error('Video topilmadi.');
  const tur = eski.ssenariy?.tur || (eski.product_id ? 'mahsulot' : 'erkin');
  if (ssenariy) {
    const s = { ...(eski.ssenariy || {}), ...ssenariy, tur, izoh: izoh ?? ssenariy.izoh ?? eski.izoh ?? '' };
    return videoTayyorla({ tur, productId: eski.product_id, manba: 'tahrir', ssenariy: s });
  }
  return videoTayyorla({ tur, productId: eski.product_id, manba: 'qolda', goya: goya || eski.ssenariy?.goya || '',
    qahramon: eski.ssenariy?.qahramon || null });
}

// ═══════════ AI MUHARRIR — «kamchilikni ayting, o'zi tuzatadi» ═══════════
// Admin oddiy so'z bilan (yozib yoki ovozli xabar) nima yoqmaganini aytadi:
// «3-sahnadagi matn uzun», «qahramon Jasur bo'lsin», «musiqasiz», «oxirida
// chegirmani ayt». AI joriy ssenariyni o'qib, FAQAT so'ralganini o'zgartiradi
// va video qayta yasaladi. Faqat izoh haqida bo'lsa — video qayta yasalmaydi.
export const OVOZLAR = ['Leda', 'Kore', 'Aoede', 'Zephyr', 'Despina', 'Sulafat', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Achird'];

const TUZAT_SXEMA = {
  type: 'object',
  properties: {
    javob: { type: 'string' },
    faqat_izoh: { type: 'boolean' },
    qahramon: { type: 'string', enum: ['nigina', 'jasur', 'yoq'] },
    mavzu: { type: 'string', enum: ['brend', 'pastel', 'tungi', 'yorqin'] },
    musiqa: { type: 'string', enum: ['quvnoq', 'lofi', 'hissiy', 'energiya', 'yoq'] },
    subtitr_uslub: { type: 'string', enum: ['karaoke', 'chip', 'oddiy'] },
    subtitr: { type: 'boolean' },
    sfx: { type: 'boolean' },
    musiqa_baland: { type: 'number' },
    ovoz: { type: 'string', enum: ['avto', ...OVOZLAR] },
    sahnalar: SXEMA.properties.sahnalar,
    izoh: { type: 'string' },
  },
  required: ['javob', 'faqat_izoh', 'sahnalar', 'izoh'],
};

/**
 * Videoni admin aytgan kamchilik bo'yicha tuzatadi.
 * @param {number} id      reels_postlar.id
 * @param {string} buyruq  admin so'zlari («qahramon xursandroq bo'lsin…»)
 * @returns {Promise<{javob: string, faqatIzoh: boolean, row: object}>}
 */
export async function aiTuzat(id, buyruq) {
  const r = await qator('select * from reels_postlar where id = $1', [id]);
  if (!r?.ssenariy?.sahnalar) throw Object.assign(new Error('Bu videoni AI bilan tuzatib bo‘lmaydi (eski format) — yangisini yasang.'), { turkum: 'reels' });
  const b = toza(buyruq, 1500);
  if (b.length < 2) throw Object.assign(new Error('Nimani o‘zgartirish kerakligini yozing.'), { turkum: 'reels' });
  const { aiJson } = await import('../ai/index.js');
  const st = await sozlamalar();
  const s = r.ssenariy;
  const tur = s.tur || (r.product_id ? 'mahsulot' : 'erkin');
  let p = r.product_id ? await qator('select * from products where id = $1', [r.product_id]) : null;
  // Admin boshqa (yoki birinchi marta) mahsulot nomini aytdimi — bazadan topamiz
  const topildi = await matndanMahsulot(b).catch(() => null);
  const yangiMahsulot = topildi?.id && topildi.id !== p?.id ? await qator('select * from products where id = $1 and is_active', [topildi.id]) : null;
  if (yangiMahsulot) p = yangiMahsulot;
  const sharhlar = p ? await sharhlarOl(p.id) : [];
  const ruxsat = ruxsatSahnalar(tur, { mahsulotBor: Boolean(p), aksiyaBor: tur === 'aksiya', sharhBor: sharhlar.length > 0, st });
  const m = p ? mahsulotMalumoti(p) : null;
  const amal = sozlamaTozala(s.ustama || {}, st);                 // shu videoda amaldagi sozlamalar
  const SOZ = ['subtitr_uslub', 'subtitr', 'sfx', 'musiqa_baland', 'ovoz'];
  const joriy = { qahramon: s.qahramon || 'yoq', mavzu: s.mavzu, musiqa: s.musiqa, ...Object.fromEntries(SOZ.map((k) => [k, amal[k]])),
    sahnalar: s.sahnalar.map(({ sozlar, d, sharh, ...x }) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)))),
    izoh: r.izoh || s.izoh || '' };
  const j = await aiJson([{ text: `Sen KiOVO Instagram Reels MUHARRIRISAN. Admin tayyor videoni ko'rdi va kamchilikni aytdi.
Vazifa: joriy ssenariyni admin so'zlariga ko'ra TUZAT. Faqat so'ralgan narsani o'zgartir, qolgan hamma narsani AYNAN saqla.

ADMIN AYTDI: «${b}»
${(s.tuzatishlar || []).length ? `Avvalgi tuzatishlar (ular ham kuchda): ${s.tuzatishlar.map((x) => `«${x}»`).join('; ')}\n` : ''}
VIDEO TURI: ${(VIDEO_TURLARI[tur] || VIDEO_TURLARI.mahsulot).nom}
${m ? `${yangiMahsulot ? `ADMIN AYTGAN MAHSULOT (ombordan topildi${topildi?.sabab ? `: ${topildi.sabab}` : ''}): video endi shu mahsulot haqida — uni ALBATTA nomi bilan ko'rsat (kashfiyot sahnasi),
ovozda ham nomini ayt; «KiOVO mahsuloti» kabi umumiy yoki eski mahsulot nomlarini shu nom bilan almashtir.\n` : ''}MAHSULOT FAKTLARI (narx va rasm kartochkada bazadan chiqadi): ${[m.brend, m.nom].filter(Boolean).join(' ')}${m.hajm ? ` (${m.hajm})` : ''}; ${String(p.description || '').slice(0, 500)}; faol moddalar: ${(p.actives || []).join(', ') || '—'}; qaysi muammoga: ${(p.concerns || []).join(', ') || '—'}; qo'llash: ${String(p.usage_text || '').slice(0, 200)}; narx ${m.narx}${m.chegirma ? `, chegirma ${m.chegirma}` : ''}
Mahsulot haqida gapirsang — FAQAT shu nom bilan; «KiOVO mahsuloti», «bizning krem» dema.\n` : 'Videoda aniq mahsulot yo‘q — o‘ylab topilgan mahsulot nomini aytma.\n'}${['skaner', 'maslahat', 'buyurtma', 'erkin'].includes(tur) ? `${ILOVA_FAKT}\n` : ''}
JORIY SSENARIY (JSON):
${JSON.stringify(joriy)}

RUXSAT ETILGAN SAHNA TURLARI:
${ruxsat.map((k) => `- ${SAHNA_TAVSIF[k]}`).join('\n')}

Qoidalar:
- hook birinchi, cta oxirgi bo'lib qolsin. Sahnalar 4–9 ta.
- «N-sahna» — 1 dan sanaladi (hook = 1-sahna).
- ovoz — og'zaki o'zbek tili, raqamlar so'z bilan, belgilarsiz (+, %). Faktlarda yo'q narsani qo'shma, va'da berma.
- O‘zbek lotin yozuvi TO‘G‘RI bo‘lsin: o‘ va g‘ harflaridagi tutuq belgisi (‘) albatta yozilsin (to‘g‘ri, o‘rgatardi, yog‘) — bu taqiqlangan belgi emas.
- Video uzunligini so'rasa: taxminan 2.2 so'z = 1 soniya (ovoz bo'yicha).
- Qahramon, rang (mavzu), musiqa, subtitr uslubi, ovoz, effektlar haqida aytilsa — tegishli maydonni o'zgartir; aytilmasa — joriy qiymatni qaytar.
- Rasm (fon) haqida aytilsa — o'sha sahnaning rasm_tavsif ini INGLIZCHA qayta yoz (yangi rasm chiziladi); aytilmasa — rasm_tavsif ni AYNAN qoldir.${rasmQoidasi(st)}
- Agar admin FAQAT Instagram izohi (caption) haqida gapirsa — faqat_izoh: true va yangi izoh; sahnalarni o'zgartirmasdan qaytar.
- izoh — to'liq Instagram matni (hashtaglar bilan).
- javob — adminga 1–2 qisqa gap: nimani o'zgartirding (o'zbekcha). Agar so'rovni bajarib bo'lmasa — sababini ayt.
Faqat JSON.` }], TUZAT_SXEMA, { temperature: 0.4, maxTokens: 4000, qayerda: 'reels-tuzat', yozuv: true });

  const javob = toza(j?.javob, 300) || 'Tuzatildi.';
  // Faqat izoh haqida bo'lsa — video qayta yasalmaydi va bu buyruq tarixga yozilmaydi
  // (keyingi tuzatishlarda «faqat izoh» degan eski gap AI ni chalg'itmasin)
  if (j?.faqat_izoh && j?.izoh) {
    const row = await izohniOzgartir(id, j.izoh);
    if (row) return { javob, faqatIzoh: true, row };
  }
  const tuzatishlar = [...(s.tuzatishlar || []), b].slice(-8);
  const ustama = { ...(s.ustama || {}) };
  // Faqat haqiqatan o'zgargan sozlama yoziladi — AI qaytargan «joriy» qiymat umumiy sozlamani muzlatib qo'ymasin
  for (const k of SOZ) if (j?.[k] !== undefined && j[k] !== null && j[k] !== amal[k]) ustama[k] = j[k];
  const yangi = { ...s, sahnalar: Array.isArray(j?.sahnalar) && j.sahnalar.length ? j.sahnalar : s.sahnalar,
    ...(yangiMahsulot ? { mahsulot_korsat: true, mahsulot_tanlov: { nom: [yangiMahsulot.brand, yangiMahsulot.nom_uz || yangiMahsulot.name].filter(Boolean).join(' '), sabab: topildi.sabab } } : {}),
    izoh: String(j?.izoh || r.izoh || '').slice(0, 2200),
    qahramon: ['nigina', 'jasur', 'yoq'].includes(j?.qahramon) ? j.qahramon : (s.qahramon || 'yoq'),
    mavzu: MAVZU_TANLOV.includes(j?.mavzu) ? j.mavzu : s.mavzu,
    musiqa: MUSIQA_TANLOV.includes(j?.musiqa) ? j.musiqa : s.musiqa,
    ustama, tuzatishlar };
  await sorov(`update reels_postlar set holat = 'bekor' where id = $1 and holat = 'tayyor'`, [id]);
  const row = await videoTayyorla({ tur, productId: p?.id ?? null, manba: 'ai_tuzat', ssenariy: yangi });
  return { javob: yangiMahsulot ? `${javob} (Mahsulot: ${[p.brand, p.nom_uz || p.name].filter(Boolean).join(' ')})` : javob, faqatIzoh: false, row };
}

/** Ovozli xabar (Telegram voice, ogg) → matn. Admin «aytib» beradi. */
export async function ovozdanMatn(base64, mime = 'audio/ogg') {
  const { aiJson } = await import('../ai/index.js');
  const j = await aiJson([{ inline_data: { mime_type: mime, data: base64 } },
    { text: 'Bu ovozli xabarni so‘zma-so‘z matnga aylantir (o‘zbek tili, lotin yozuvi; ruscha so‘z bo‘lsa ham shunday yoz). Faqat JSON.' }],
  { type: 'object', properties: { matn: { type: 'string' } }, required: ['matn'] }, { temperature: 0, maxTokens: 800, qayerda: 'reels-ovoz' });
  return toza(j?.matn, 1500);
}

/** Faqat Instagram izohini o'zgartiradi (video qayta yasalmaydi). */
export async function izohniOzgartir(id, izoh) {
  return qator(`update reels_postlar set izoh = $1 where id = $2 and holat <> 'joylandi' returning *`,
    [String(izoh || '').slice(0, 2200), id]);
}

/** Tayyor videoni Instagram'ga joylaydi. */
export async function joyla(id) {
  const r = await qator('select * from reels_postlar where id = $1', [id]);
  if (!r?.video_id) throw new Error('Video topilmadi.');
  if (r.holat === 'joylandi') return r;
  if (!config.publicUrl) throw new Error('PUBLIC_URL sozlanmagan — Instagram videoni yuklab ololmaydi.');
  // Tugma ikki marta bosilsa ham bitta joylansin
  const ol = await qator(`update reels_postlar set holat = 'joylanmoqda', xato = null
     where id = $1 and holat in ('tayyor', 'xato', 'bekor') returning id`, [id]);
  if (!ol) throw Object.assign(new Error('Bu video allaqachon joylanmoqda.'), { turkum: 'reels' });
  const ig = await import('./instagram/api.js');
  try {
    // Muqova — hook sahnasining sarlavhasi va qahramon to'liq chiqqan lahza
    const n = await ig.reelsJoyla({ videoUrl: `${config.publicUrl}/media/${r.video_id}`, izoh: r.izoh || '', muqovaMs: 1800 });
    return await qator(`update reels_postlar set holat = 'joylandi', ig_media_id = $1, permalink = $2,
        joylangan_at = now(), xato = null where id = $3 returning *`, [n.id, n.permalink, id]);
  } catch (e) {
    await sorov(`update reels_postlar set holat = 'xato', xato = $1 where id = $2`, [String(e.message).slice(0, 500), id]);
    throw e;
  }
}

async function adminlar() {
  const idlar = new Set((config.adminTelegramIds || []).map(String));
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  return [...idlar];
}

const qisqaIzoh = (r) => String(r.izoh || '').slice(0, 700);

/** Videoni adminlarga yuboradi (tasdiq tugmalari bilan yoki xabar sifatida). */
export async function adminlargaVideo(r, { tasdiq = false, sarlavha = '' } = {}) {
  const { tgFayl } = await import('../bot/tg.js');
  const m = await qator('select bayt from media where id = $1', [r.video_id]);
  if (!m?.bayt) return 0;
  const bayt = Buffer.from(m.bayt);
  const tahrir = config.publicUrl ? [{ text: '✏️ Matnni tahrirlash', url: `${config.publicUrl}/admin/#reels-${r.id}` }] : [];
  const tugmalar = tasdiq ? { inline_keyboard: [
    [{ text: '✅ Instagram’ga joylash', callback_data: `rl_ok:${r.id}` }],
    [{ text: '🤖 AI bilan tuzatish', callback_data: `rl_ai:${r.id}` }],
    [{ text: '♻️ Shu mahsulot, boshqa hikoya', callback_data: `rl_qayta:${r.id}` }],
    [{ text: '🔄 Boshqa mahsulot', callback_data: 'rl_yangi' }, { text: '❌ Bekor', callback_data: `rl_bekor:${r.id}` }],
    ...(tahrir.length ? [tahrir] : [])] }
    : (r.permalink ? { inline_keyboard: [[{ text: '📲 Instagram’da ochish', url: r.permalink }]] } : undefined);
  let n = 0;
  for (const id of await adminlar()) {
    const j = await tgFayl('sendVideo', {
      chat_id: id, parse_mode: 'HTML', supports_streaming: true,
      caption: (`${sarlavha || '🎬 <b>Bugungi Reels</b>'}${VIDEO_TURLARI[r.ssenariy?.tur] ? `\n<i>${VIDEO_TURLARI[r.ssenariy.tur].nom}</i>` : ''}`
        + (r.ssenariy?.mahsulot_tanlov ? `\n🧴 <b>${String(r.ssenariy.mahsulot_tanlov.nom || 'Mahsulot qo‘shilmadi').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</b> — ${String(r.ssenariy.mahsulot_tanlov.sabab || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}` : '')
        + (tasdiq ? '\n💬 <i>Kamchilik bo‘lsa — shu videoga javob qilib yozing yoki ovozli xabar yuboring, AI o‘zi tuzatadi.</i>' : '')
        + `\n\n${qisqaIzoh(r).replace(/&/g, '&amp;').replace(/</g, '&lt;')}`).slice(0, 1024),
      reply_markup: tugmalar,
    }, { video: { bayt, mime: 'video/mp4', nom: `reels-${r.id}.mp4` } }).catch(() => null);
    if (j?.ok) n++;
  }
  return n;
}

async function adminlargaMatn(matn) {
  const { yubor } = await import('../bot/tg.js');
  for (const id of await adminlar()) await yubor(id, matn).catch(() => {});
}

/** Bitta to'liq ish: yasash → (avto) joylash yoki (tasdiq) adminga yuborish. */
export async function bugungiIsh({ manba = 'jadval', majburiyRejim = null } = {}) {
  const st = await sozlamalar();
  const rejim = majburiyRejim || st.rejim;
  const r = await videoTayyorla({ manba });
  if (rejim === 'tasdiq') {
    await adminlargaVideo(r, { tasdiq: true, sarlavha: '🎬 <b>Bugungi Reels tayyor</b> — joylaymi?' });
    return { holat: 'tasdiq_kutilmoqda', id: r.id };
  }
  const j = await joyla(r.id);
  await adminlargaVideo(j, { sarlavha: '✅ <b>Reels Instagram’ga joylandi</b>' });
  return { holat: 'joylandi', id: j.id, permalink: j.permalink };
}

/**
 * Har 10 daqiqada: yoqilgan, soat kelgan va bugun hali qilinmagan bo'lsa —
 * bugungi Reelsni yasaydi. Advisory lock — ikki server nusxasi takrorlamasin.
 */
export async function kunlikTekshir() {
  const st = await sozlamalar();
  if (!st.yoqilgan) return null;
  const hozir = new Date(Date.now() + 5 * 3600e3);                 // Toshkent (UTC+5)
  const bugun = hozir.toISOString().slice(0, 10);
  if (hozir.getUTCHours() < st.soat) return null;
  if (String(await sozlama('reels_oxirgi', '').catch(() => '')).replace(/"/g, '') === bugun) return null;
  const mijoz = await pool.connect();
  try {
    const { rows: [q] } = await mijoz.query('select pg_try_advisory_lock($1) as olindi', [QULF]);
    if (!q?.olindi) return null;
    try {
      if (String(await sozlama('reels_oxirgi', '').catch(() => '')).replace(/"/g, '') === bugun) return null;
      await sorov(`insert into settings (key, value, updated_at) values ('reels_oxirgi', $1::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(bugun)]);
      sozlamalarniUnut();
      try {
        return await bugungiIsh();
      } catch (e) {
        console.error('REELS:', e.message);
        await adminlargaMatn(`⚠️ <b>Bugungi Reels chiqmadi</b>\n\n${String(e.message).slice(0, 400)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')}\n\n<i>/reels — qayta urinish</i>`);
        return { holat: 'xato', xato: e.message };
      }
    } finally {
      await mijoz.query('select pg_advisory_unlock($1)', [QULF]).catch(() => {});
    }
  } finally { mijoz.release(); }
}

export const oxirgilar = (n = 10) => qatorlar(`select r.id, r.holat, r.soniya, r.permalink, r.xato, r.manba, r.ovozli,
    r.created_at, r.joylangan_at, r.video_id, r.product_id, r.izoh, r.ssenariy, p.name, p.nom_uz, p.brand
  from reels_postlar r left join products p on p.id = r.product_id order by r.id desc limit $1`, [n]);
