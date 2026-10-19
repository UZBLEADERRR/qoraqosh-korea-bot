// KUNLIK REELS — AI har kuni bitta mahsulot videosini yasaydi va Instagram'ga joylaydi.
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
const SAHNA = ['hook', 'muammo', 'kashfiyot', 'foyda', 'natija', 'sharh', 'narx', 'cta', 'hikoya'];
const HISSIYOT = ['oddiy', 'xursand', 'hayron', 'xafa', 'oylash', 'hayajon'];
const IMO = ['tinch', 'silkit', 'korsat', 'ushlab', 'oylash', 'yelka', 'hayajon', 'yuz'];
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

/**
 * AI rejissyor: hikoya formati + sahnalar + Instagram izohi.
 * @param {object} p mahsulot qatori
 * @param {object} st sozlamalar
 * @param {{goya?: string, format?: string, qahramon?: string|null, sharhlar?: object[]}} o
 */
export async function ssenariyYoz(p, st, { goya = '', format = null, qahramon = null, sharhlar = [] } = {}) {
  const { aiJson } = await import('../ai/index.js');
  const m = mahsulotMalumoti(p);
  const sozSoni = { 15: '30–40', 30: '60–80', 45: '95–120' }[st.davomiylik] || '60–80';
  const sahnaSoni = { 15: '4–5', 30: '6–8', 45: '8–9' }[st.davomiylik] || '6–8';
  const shaxs = qahramon === 'jasur' ? 'Jasur — doppili, quvnoq o‘zbek yigiti (erkaklar parvarishi haqida erkakcha gapiradi)'
    : qahramon === 'nigina' ? 'Nigina — do‘kon yordamchisi, quvnoq o‘zbek qizi' : null;
  const j = await aiJson([{ text: `Sen KiOVO (Koreya kosmetikasi, O'zbekiston) Instagram sahifasining REJISSYORISAN.
Animatsion HIKOYA-Reels ssenariysini yozasan: ${shaxs ? `multfilm qahramon ${shaxs} BIRINCHI SHAXSDA hikoya qiladi` : 'diktor gapiradi, ekranda kinetik matn va mahsulot'}.
Maqsad — odam videoni oxirigacha ko'rsin va izohga «+» yozsin.

MAHSULOT (faqat shu faktlar — o'ylab topma):
- nom: ${m.brend ? m.brend + ' ' : ''}${m.nom}${m.hajm ? ` (${m.hajm})` : ''}
- tavsif: ${String(p.description || '').slice(0, 700)}
- faol moddalar: ${(p.actives || []).join(', ') || '—'}
- qaysi muammoga: ${(p.concerns || []).join(', ') || '—'}
- teri turi: ${(p.skin_types || []).join(', ') || '—'}
- qo'llash: ${String(p.usage_text || '').slice(0, 300)}
- narx: ${m.narx}${m.chegirma ? ` (chegirma ${m.chegirma}, eski narx ${m.eskiNarx})` : ''}
- reyting: ${m.reytingMatn || '—'}
- haqiqiy sharhlar: ${sharhlar.length ? sharhlar.map((x) => `«${x.matn}» (${x.baho}★)`).join('; ') : 'YO‘Q'}

HIKOYA FORMATI: ${format ? `${format} — ${FORMATLAR[format]}` : 'o‘zing tanla'}
${goya ? `ADMIN G'OYASI (albatta shunga amal qil): ${toza(goya, 400)}\n` : ''}${st.yoriqnoma ? `DOIMIY YO'RIQNOMA: ${st.yoriqnoma}\n` : ''}
SAHNALAR (${sahnaSoni} ta, tartib bilan). Turlar:
- hook — 1-sahna, MAJBURIY. ekran: 2–5 so'zli kutilmagan gap (masalan «Sotib olish shart emas»), kichik: 2–5 so'zli davomi.
- muammo — belgilar: 2–3 ta qisqa muammo (2–3 so'z).
- kashfiyot — mahsulot birinchi ko'rinadi, MAJBURIY. ekran: «Keyin buni topdim» kabi.
- foyda — punktlar: ROPPA-ROSA 3 ta {matn: 3–5 so'z, emoji}. Faqat tavsif/tarkibdagi faktlar.
- natija — his-tuyg'u va natija (halol, va'dasiz). raqam/birlik — FAQAT mahsulot ma'lumotida bo'lsa (masalan qo'llash soni), aks holda bo'sh.
- sharh — FAQAT haqiqiy sharh bo'lsa${sharhlar.length ? '' : ' (hozir YO‘Q — bu turni ishlatma)'}.
- narx — narx bazadan ko'rsatiladi${st.narx_korsat ? '' : ' (bu safar narx sahnasini QO‘SHMA)'}; ekran: «Bugun chegirmada» kabi, ovozda raqam aytma.
- hikoya — qahramonning nutq pufagi (qo'shimcha hikoya lahzasi).
- cta — oxirgi sahna, MAJBURIY. ekran: «Izohga «+» yozing», kichik: «Narx va maslahat — Direct’da».

Har sahnada:
- ovoz — qahramon aytadigan gap, 6–20 so'z, jonli og'zaki o'zbek tili (do'stiga gapirgandek), raqamlarni so'z bilan yoz,
  belgilar (+, %, —) ishlatma. Jami ovoz: ${sozSoni} so'z. cta ovozi: «Izohga plyus yozing — narx va maslahatni Direct'ga yuboraman».
- ekran — ekrandagi katta matn, 2–6 so'z (ovozni takrorlamaydi, urg'u beradi). urgu — ekran ichidagi BITTA eng muhim so'z.
- emoji — bitta mos emoji. hissiyot: ${HISSIYOT.join('/')}. imo (qo'llar): ${IMO.join('/')}.
Taqiq: kasallikni davolaydi deb va'da berma, «100%», «abadiy», «kafolat» yozma; boshqa brendlarni yomonlama.

izoh — Instagram post matni: 2–4 qisqa abzats, hikoya ohangida, 1–3 emoji, oxirida «Izohga «+» yozing — narx va maslahatni Direct'ga yuboramiz 💌». Narxni yozma.
hashtaglar — 6–10 ta, # bilan, bo'sh joy bilan.
format — tanlagan format kaliti (${Object.keys(FORMATLAR).join('/')}).
Butun javob O'ZBEK tilida (lotin). Faqat JSON.` }], SXEMA,
  { temperature: 0.9, maxTokens: 3000, qayerda: 'reels', yozuv: true });
  return ssenariyTozala(j, { st, sharhlar, format, qahramon });
}

/** AI javobini (yoki admin tahririni) xavfsiz ko'rinishga keltiradi. */
export function ssenariyTozala(j, { st = STANDART, sharhlar = [], format = null, qahramon = null } = {}) {
  let sahnalar = (Array.isArray(j?.sahnalar) ? j.sahnalar : []).map((x) => ({
    tur: SAHNA.includes(x?.tur) ? x.tur : 'hikoya',
    ovoz: toza(x?.ovoz, 260),
    ekran: toza(x?.ekran, 60),
    kichik: toza(x?.kichik, 70),
    // urg'u bo'lmasa — ekran matnidagi eng uzun so'z (markerli ko'rinadi)
    urgu: toza(x?.urgu, 30) || String(x?.ekran || '').split(/\s+/).sort((a, b) => b.length - a.length)[0]?.replace(/[^\p{L}\p{N}‘’'ʻ]/gu, '') || '',
    emoji: bitEmoji(x?.emoji),
    hissiyot: HISSIYOT.includes(x?.hissiyot) ? x.hissiyot : undefined,
    imo: IMO.includes(x?.imo) ? x.imo : undefined,
    belgilar: (Array.isArray(x?.belgilar) ? x.belgilar : []).map((b) => toza(b, 28)).filter(Boolean).slice(0, 3),
    punktlar: (Array.isArray(x?.punktlar) ? x.punktlar : []).map((q) => ({ matn: toza(q?.matn ?? q, 46), emoji: bitEmoji(q?.emoji) || '✨' }))
      .filter((q) => q.matn).slice(0, 3),
    raqam: toza(x?.raqam, 6),
    birlik: toza(x?.birlik, 16),
  })).filter((x) => x.ovoz || x.ekran);
  // Sharh — faqat haqiqiy sharh bo'lsa (AI to'qigan sharh ko'rsatilmaydi)
  const sharh = sharhlar[0] || null;
  sahnalar = sahnalar.filter((x) => (x.tur !== 'sharh' || sharh) && (x.tur !== 'narx' || st.narx_korsat));
  sahnalar.forEach((x) => { if (x.tur === 'sharh') x.sharh = sharh; });
  // Bitta turdagi sahnalar takrorlanmasin (hikoyadan tashqari)
  const bor = new Set();
  sahnalar = sahnalar.filter((x) => { if (x.tur === 'hikoya') return true; if (bor.has(x.tur)) return false; bor.add(x.tur); return true; });
  if (!sahnalar.length || sahnalar[0].tur !== 'hook') {
    const i = sahnalar.findIndex((x) => x.tur === 'hook');
    if (i > 0) sahnalar.unshift(...sahnalar.splice(i, 1));
    else sahnalar.unshift({ tur: 'hook', ekran: 'Buni bilarmidingiz?', kichik: '', ovoz: 'Buni bilarmidingiz?', emoji: '🤫', belgilar: [], punktlar: [] });
  }
  if (!sahnalar.some((x) => x.tur === 'kashfiyot')) {
    sahnalar.splice(Math.min(2, sahnalar.length), 0, { tur: 'kashfiyot', ekran: 'Mana u!', ovoz: 'Mana, men aytgan mahsulot.', emoji: '✨', belgilar: [], punktlar: [] });
  }
  const ctaI = sahnalar.findIndex((x) => x.tur === 'cta');
  const cta = ctaI >= 0 ? sahnalar.splice(ctaI, 1)[0] : { tur: 'cta', ekran: 'Izohga «+» yozing', kichik: 'Narx va maslahat — Direct’da',
    ovoz: 'Izohga plyus yozing — narx va maslahatni Direct’ga yuboraman!', emoji: '💌', belgilar: [], punktlar: [] };
  if (!cta.ekran) cta.ekran = 'Izohga «+» yozing';
  sahnalar = [...sahnalar.slice(0, 8), cta];
  for (const x of sahnalar) {
    if (x.tur === 'foyda') {
      while (x.punktlar.length < 3) x.punktlar.push([{ matn: 'Koreyadan original', emoji: '🇰🇷' }, { matn: 'Teriga yumshoq', emoji: '🌿' }, { matn: 'Har kuni qulay', emoji: '✨' }][x.punktlar.length]);
    }
    if (!x.ovoz) x.ovoz = x.ekran;
    if (!x.birlik) x.raqam = '';                 // «10» nima ekani aytilmasa — ko'rsatilmaydi
  }
  const izoh = `${String(j?.izoh || '').trim().slice(0, 1800)}\n\n${toza(j?.hashtaglar, 300)}`.trim();
  return { format: format || (FORMATLAR[j?.format] ? j.format : 'aralash'), qahramon, sahnalar, izoh };
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
  if (st.uslub === 'hikoya') {
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

/**
 * Video tayyorlaydi (joylamaydi).
 * @param {object} o
 * @param {number} [o.productId]  aniq mahsulot (bo'lmasa — navbatdagisi)
 * @param {string} [o.manba]      jadval | qolda | tahrir
 * @param {string} [o.goya]       admin g'oyasi (shu video uchun)
 * @param {object} [o.ssenariy]   tayyor (tahrirlangan) ssenariy — AI qayta yozmaydi
 * @param {string} [o.qahramon]   majburiy qahramon
 * @param {string} [o.format]     majburiy hikoya formati
 * @param {string} [o.sifat]      toliq | sinov
 * @returns {Promise<object>} reels_postlar qatori (holat 'tayyor')
 */
export async function videoTayyorla({ productId = null, manba = 'jadval', goya = '', ssenariy = null, qahramon = null, format = null, sifat = process.env.REELS_SIFAT || 'toliq' } = {}) {
  const st = await sozlamalar();
  const p = await mahsulotTanla(productId);
  if (!p) throw Object.assign(new Error('Video uchun mahsulot yo‘q — omborda bor va surati bor mahsulot kerak.'), { turkum: 'reels' });
  const r = await qator(`insert into reels_postlar (product_id, manba) values ($1, $2) returning *`, [p.id, manba]);
  try {
    const sharhlar = await sharhlarOl(p.id);
    const tl = await tanlovlar(st, { qahramon: qahramon ?? ssenariy?.qahramon, format: format ?? ssenariy?.format });
    const s = ssenariy
      ? { ...ssenariyTozala(ssenariy, { st, sharhlar, format: ssenariy.format || tl.format, qahramon: tl.qahramon }), izoh: String(ssenariy.izoh || '').slice(0, 2200) }
      : await ssenariyYoz(p, st, { goya, format: tl.format, qahramon: tl.qahramon, sharhlar });
    s.qahramon = tl.qahramon; s.mavzu = ssenariy?.mavzu || tl.mavzu; s.musiqa = ssenariy?.musiqa || tl.musiqa;
    if (goya) s.goya = toza(goya, 400);

    const { mp4, soniya, ovozli } = await navbatda(() => render(p, s, st, sifat));
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

/** Ovoz + render. Kanvas yo'q yoki motor 'oddiy' — eski shablon. */
async function render(p, s, st, sifat) {
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
  const surat = await suratBayt(p);
  const kino = await import('../video/kino/index.js');
  const kanvasBor = st.motor === 'kino' && (await kino.kanvasBormi()).ha;
  if (kanvasBor) {
    const { wavOqi } = await import('../video/kino/ovoz-vaqt.js');
    const r = await kino.kinoYasa({
      sahnalar: s.sahnalar, qahramon: s.qahramon, mavzu: s.mavzu, mahsulot: mahsulotMalumoti(p),
      rasmlar: { mahsulot: surat, logo: await logoPng() },
      ovoz: ovoz ? wavOqi(ovoz.wav) : null,
      musiqa: s.musiqa, musiqaBaland: st.musiqa_baland / 100, sfx: st.sfx, subtitr: st.subtitr,
      seed: (p.id % 7) + 1,
    }, { sifat });
    return { mp4: r.mp4, soniya: +r.soniya.toFixed(2), ovozli: Boolean(ovoz) };
  }
  const o = oddiyKorinish(s), m = mahsulotMalumoti(p);
  const r = await reelsYasa({ surat: surat ? { rasm: surat.toString('base64'), mime: 'image/jpeg' } : null, ovoz, ssenariy: {
    hook: o.hook, punktlar: o.punktlar, nom: m.nom, brend: m.brend, narx: m.narx, eskiNarx: m.eskiNarx,
    chaqiriq: 'Izohga «+» yozing', pastki: 'Narx va maslahat — Direct’da · KiOVO' } });
  return { ...r, ovozli: Boolean(ovoz) };
}

/** Avvalgi videoni qayta yasaydi: tahrirlangan ssenariy bilan yoki shu mahsulotga yangi ssenariy. */
export async function qaytaYasa(id, { ssenariy = null, izoh = null, goya = '' } = {}) {
  const eski = await qator('select * from reels_postlar where id = $1', [id]);
  if (!eski) throw new Error('Video topilmadi.');
  if (ssenariy) {
    const s = { ...(eski.ssenariy || {}), ...ssenariy, izoh: izoh ?? ssenariy.izoh ?? eski.izoh ?? '' };
    return videoTayyorla({ productId: eski.product_id, manba: 'tahrir', ssenariy: s });
  }
  return videoTayyorla({ productId: eski.product_id, manba: 'qolda', goya,
    qahramon: eski.ssenariy?.qahramon || null });
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
    [{ text: '♻️ Shu mahsulot, boshqa hikoya', callback_data: `rl_qayta:${r.id}` }],
    [{ text: '🔄 Boshqa mahsulot', callback_data: 'rl_yangi' }, { text: '❌ Bekor', callback_data: `rl_bekor:${r.id}` }],
    ...(tahrir.length ? [tahrir] : [])] }
    : (r.permalink ? { inline_keyboard: [[{ text: '📲 Instagram’da ochish', url: r.permalink }]] } : undefined);
  let n = 0;
  for (const id of await adminlar()) {
    const j = await tgFayl('sendVideo', {
      chat_id: id, parse_mode: 'HTML', supports_streaming: true,
      caption: `${sarlavha || '🎬 <b>Bugungi Reels</b>'}\n\n${qisqaIzoh(r).replace(/&/g, '&amp;').replace(/</g, '&lt;')}`.slice(0, 1024),
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
