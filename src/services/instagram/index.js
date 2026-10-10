// INSTAGRAM BOSHQARUVCHI: Direct (AI suhbatdosh) va kommentlar.
//
// Oqim:
//   Meta webhook → webhookKeldi()
//     • Direct xabar  → suhbatga yoziladi → AI javob beradi (odamdek, qisqa).
//       Yuz rasmi kelsa — bepul tahlil: TO'LIQ natija rasmi, keyin «mana
//       shular sizga kerak» degan mahsulotlar va Telegramda tavsiyani
//       ochadigan havola (xohlansa sozlamada eski «xira» rejim yoqiladi).
//     • Komment       → qoidalar: «+» qoldirsa Direct ga xabar va ochiq
//       javob («Direct'ga yozdik»), «narx» so'rasa AI yozgan Direct…
//   Admin o'zi yozsa (panel yoki Instagram ilovasi) — AI shu suhbatda
//   vaqtincha jim turadi: ikki «sotuvchi» bir-birining gapini bo'lmasin.
import crypto from 'node:crypto';
import { qator, qatorlar, qiymat, sorov, sozlama, sozlamalarniUnut } from '../../db.js';
import { config } from '../../config.js';
import * as api from './api.js';
import * as diag from './diag.js';

const SOZLAMA_KALIT = 'instagram';
export const STANDART = {
  ai_yoqiq: true,              // Direct ga AI javob beradi
  korsatma: '',                // AI ga do'kon egasining ko'rsatmasi (bo'sh — standart)
  yuz_tahlil: true,            // yuz rasmi kelsa — tahlil va natija
  xira: false,                 // true — natijaning muhim qismi xira (eski «teaser» rejim)
  komment_qoidalar: true,      // kommentlarga qoidalar ishlaydi
  komment_mention: true,       // ochiq javob @username bilan boshlansin
  komment_ai: true,            // qoidaga tushmagan HAR kommentga AI ma'nosiga qarab javob yozadi
  kechikish_soniya: 4,         // mijoz ketma-ket yozsa — oxirgisidan keyin javob
  qolda_pauza_daqiqa: 60,      // admin yozsa AI shuncha jim
  tahlil_matni: '',            // tahlildan keyingi xabar (bo'sh — standart)
  tahlil_xabari: 'qisqa',      // rasmdan keyin: qisqa (natija + havola) | yoq (faqat rasm) | mahsulotlar
  yozish_tezligi: 'tabiiy',    // tabiiy | sekin | tez — «yozmoqda…» va javob vaqti
  korildi: true,               // xabar «ko'rildi» bo'ladi (odam o'qigandek)
  bilim: '',                   // do'kon haqida FAQ: manzil, yetkazish muddati, kafolat… (AI shunga tayanadi)
  eslatma: true,               // tahlildan keyin Telegramga o'tmaganlarga bitta yumshoq eslatma
  eslatma_soat: 3,
  spam_yashir: true,           // havola/haqoratli kommentlar avtomatik yashiriladi
  tez_javoblar: [
    'Assalomu alaykum, eshitaman',
    'yuzingizni yorug\' joyda bitta rasmga olib tashlang, bepul tahlil qilib beraman',
    'buyurtmani telegram botimiz orqali qilasiz, oson',
    'yetkazib berish butun o\'zbekiston bo\'ylab pochta orqali',
    'to\'lov kartaga o\'tkazma, chekni botga tashlaysiz',
    'rahmat, sizni kutib qolamiz 😊',
  ],
};
const TANLOVLAR = {
  tahlil_xabari: ['qisqa', 'yoq', 'mahsulotlar'],
  yozish_tezligi: ['tabiiy', 'sekin', 'tez'],
};

const son = (v, z = 0) => (Number.isFinite(Number(v)) ? Number(v) : z);
const matn = (v, n = 1000) => String(v ?? '').trim().slice(0, n);

export async function igSozlamalari() {
  const s = await sozlama(SOZLAMA_KALIT, {}).catch(() => ({}));
  return { ...STANDART, ...(s && typeof s === 'object' ? s : {}) };
}

export async function sozlamaniSaqla(qism = {}) {
  const joriy = await igSozlamalari();
  const yangi = { ...joriy };
  for (const [k, v] of Object.entries(qism)) {
    if (!(k in STANDART)) continue;
    if (TANLOVLAR[k]) { if (TANLOVLAR[k].includes(v)) yangi[k] = v; continue; }
    if (Array.isArray(STANDART[k])) {
      const r = Array.isArray(v) ? v : String(v ?? '').split('\n');
      yangi[k] = r.map((x) => matn(x, 300)).filter(Boolean).slice(0, 30);
      continue;
    }
    yangi[k] = typeof STANDART[k] === 'boolean' ? v === true || v === 'true'
      : typeof STANDART[k] === 'number' ? Math.max(0, Math.min(1440, son(v, STANDART[k]))) : matn(v, 6000);
  }
  await sorov(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`, [SOZLAMA_KALIT, JSON.stringify(yangi)]);
  sozlamalarniUnut();
  return yangi;
}

/** Webhook tasdiqlash tokeni: env yoki bir marta yasalib bazada saqlanadi. */
export async function verifyToken() {
  if (config.instagramVerify) return config.instagramVerify;
  let t = await sozlama('instagram_verify', '').catch(() => '');
  if (!t) {
    t = crypto.randomBytes(12).toString('hex');
    await sorov(`insert into settings (key, value) values ('instagram_verify', $1::jsonb) on conflict (key) do nothing`, [JSON.stringify(t)]);
    sozlamalarniUnut();
    t = await sozlama('instagram_verify', t);
  }
  return t;
}

// Ilova siri: env (vergul bilan bir nechta) va/yoki admin paneldan kiritilgani.
// Bir nechta bo'lishi kerak: «Instagram Login» webhooklarini Meta
// *Instagram app secret* bilan imzolaydi, ko'pchilik esa Facebook ilovasining
// «App secret» ini qo'yadi — ikkalasini ham qabul qilamiz.
let panelSiri = '';
export async function sirlarniYukla() {
  const s = await sozlama('instagram_ulanish', {}).catch(() => ({}));
  panelSiri = String(s?.sir || '').trim();
  return sirlar();
}
const sirlar = () => [...new Set([...String(config.instagramSecret || '').split(','), panelSiri]
  .map((x) => x.trim()).filter(Boolean))];

/** X-Hub-Signature-256 — Meta xabarni imzolaydi (ilova sirini bilmagan soxta so'rov o'tmaydi). */
export function imzoTogri(xom, sarlavha) {
  const r = sirlar();
  if (!r.length) return true;                            // sir berilmagan — tekshirib bo'lmaydi (panelda ogohlantiriladi)
  const a = Buffer.from(String(sarlavha || ''));
  return r.some((sir) => {
    const b = Buffer.from('sha256=' + crypto.createHmac('sha256', sir).update(xom).digest('hex'));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

/** Ilova sirini panel orqali saqlash (Railway'ga kirmasdan). */
export async function sirniSaqla(sir) {
  const t = String(sir || '').trim();
  if (t && !/^[0-9a-f]{32}$/i.test(t)) return { xato: 'App secret 32 belgili (0-9, a-f) bo‘ladi — Meta’dan to‘liq nusxalang.' };
  const s = await sozlama('instagram_ulanish', {}).catch(() => ({}));
  await sorov(`insert into settings (key, value, updated_at) values ('instagram_ulanish', $1::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify({ ...(s || {}), sir: t })]);
  sozlamalarniUnut(); api.ulanishniUnut();
  await sirlarniYukla();
  return { saqlandi: true };
}

// ─────────────────────────── WEBHOOK ───────────────────────────

export async function webhookKeldi(body) {
  if (body?.object !== 'instagram') return;
  await diag.belgila('webhook');
  const akk = (await api.ulanish()).akkaunt_id;
  for (const entry of body.entry || []) {
    const bizniki = String(akk || entry.id || '');
    for (const ev of entry.messaging || []) await xabarKeldi(ev, bizniki).catch((e) => console.error('IG XABAR:', e.message));
    for (const ch of entry.changes || []) {
      if (ch.field === 'comments' || ch.field === 'live_comments') {
        await kommentKeldi(ch.value || {}, bizniki).catch((e) => console.error('IG KOMMENT:', e.message));
      }
    }
  }
}

async function suhbatOl(igsid) {
  let s = await qator(`select * from ig_suhbatlar where igsid = $1`, [igsid]);
  if (!s) {
    s = await qator(`insert into ig_suhbatlar (igsid) values ($1) on conflict (igsid) do update set igsid = excluded.igsid
      returning *`, [igsid]);
    // Ism va username — chatlar ro'yxatida odam tanilsin (yiqilsa ham davom etadi)
    api.profil(igsid).then((p) => p && sorov(`update ig_suhbatlar set username = $2, ism = $3, rasm_url = $4 where id = $1`,
      [s.id, p.username || null, p.name || null, p.profile_pic || null])).catch(() => {});
  }
  return s;
}

async function xabarYoz(suhbatId, { yonalish, kim, matn: m = null, rasm = null, mid = null, xato = null, niyat = null, javob_ms = null }) {
  const r = await qator(
    `insert into ig_xabarlar (suhbat_id, yonalish, kim, matn, rasm_url, mid, xato, niyat, javob_ms) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (mid) do nothing returning *`, [suhbatId, yonalish, kim, m, rasm, mid, xato, niyat, javob_ms]);
  if (r) {
    await sorov(`update ig_suhbatlar set oxirgi_at = now(), oxirgi_matn = $2,
        oqilmagan = oqilmagan + $3, oxirgi_kiruvchi = case when $4 then now() else oxirgi_kiruvchi end where id = $1`,
      [suhbatId, m ? m.slice(0, 200) : rasm ? '📷 Rasm' : '', yonalish === 'kiruvchi' ? 1 : 0, yonalish === 'kiruvchi']);
  }
  return r;
}

async function xabarKeldi(ev, bizniki) {
  const msg = ev.message;
  if (!msg || msg.is_deleted || msg.is_unsupported) return;
  // Echo — biz yuborgan (yoki admin Instagram ilovasidan yozgan) xabar
  if (msg.is_echo) {
    const igsid = String(ev.recipient?.id || '');
    if (!igsid) return;
    const rasmi = msg.attachments?.[0]?.payload?.url || null;
    const bizniki2 = () => api.bizYuborganmi({ mid: msg.mid, matn: msg.text, igsid, rasm: rasmi });
    // O'zimiz (AI, panel, komment DM) yuborgan xabar — admin yozdi deb AI jim qilinmaydi
    if (bizniki2() || await qator(`select 1 from ig_xabarlar where mid = $1`, [msg.mid])) return diag.belgila('echo');
    // Echo API javobidan oldin kelishi mumkin — ozgina kutib yana tekshiramiz
    await new Promise((ok) => setTimeout(ok, globalThis.IG_KECHIKISH_MS === 0 ? 0 : 3000));
    if (bizniki2() || await qator(`select 1 from ig_xabarlar where mid = $1`, [msg.mid])) return diag.belgila('echo');
    const s = await suhbatOl(igsid);
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'ilova', matn: msg.text || null, mid: msg.mid,
      rasm: msg.attachments?.[0]?.payload?.url || null });
    const st = await igSozlamalari();
    await sorov(`update ig_suhbatlar set ai_pauza_gacha = now() + ($2 || ' minutes')::interval where id = $1`,
      [s.id, String(st.qolda_pauza_daqiqa)]);
    return;
  }
  const igsid = String(ev.sender?.id || '');
  if (!igsid || igsid === bizniki) return;
  await diag.belgila('xabar');
  const s = await suhbatOl(igsid);
  const ilova = msg.attachments || [];
  const rasmlar = ilova.filter((a) => a.type === 'image' && a.payload?.url).map((a) => a.payload.url);
  // Matnsiz ilovalar AI uchun tushunarli izohga aylanadi (ovozli, story, post…)
  const IZOH = { audio: '(ovozli xabar yubordi)', video: '(video yubordi)', story_mention: '(sizni storysida belgiladi)',
    share: '(post ulashdi)', ig_reel: '(reels ulashdi)', reel: '(reels ulashdi)', file: '(fayl yubordi)' };
  let m = msg.text || ilova.map((a) => IZOH[a.type]).filter(Boolean)[0] || null;
  if (m && msg.reply_to?.story) m = `(storyingizga javob) ${m}`;
  const yangi = await xabarYoz(s.id, { yonalish: 'kiruvchi', kim: 'mijoz', matn: m, mid: msg.mid,
    rasm: rasmlar[0] || (ilova[0]?.payload?.url ?? null) });
  if (!yangi) return;                                     // takroriy webhook

  const st = await igSozlamalari();
  if (rasmlar.length && st.yuz_tahlil) return rasmniTahlilQil(s.id, rasmlar[0]);
  if (m || ilova.length) return javobniRejalashtir(s.id);
}

// Mijoz ketma-ket 3 ta xabar yozsa — uchtasiga bitta javob (odam ham shunday qiladi)
const kutish = new Map();
export function javobniRejalashtir(suhbatId) {
  return igSozlamalari().then((st) => {
    const ms = son(globalThis.IG_KECHIKISH_MS ?? st.kechikish_soniya * 1000, 4000);
    if (!ms) return aiJavobYoz(suhbatId);
    clearTimeout(kutish.get(suhbatId));
    kutish.set(suhbatId, setTimeout(() => { kutish.delete(suhbatId); aiJavobYoz(suhbatId).catch(() => {}); }, ms));
    return null;
  });
}

async function botHavolasi(start) {
  const { botNomi } = await import('../../lib/ilova-havola.js');
  const bot = await botNomi().catch(() => null);
  return bot ? `https://t.me/${bot}?start=${start}` : `${config.saytUrl || ''}/skan/`;
}

/** Ilova, Play va menejer telefoni — AI buyurtma/ilovani o'rgatishi uchun. */
async function dokonHavolalari() {
  const [play, telefon] = await Promise.all([
    sozlama('play_havola', '').catch(() => ''), sozlama('menejer_telefon', '').catch(() => ''),
  ]);
  return { ilova_havola: config.saytUrl ? `${config.saytUrl}/app/` : '', play_havola: play || '', telefon: telefon || '' };
}

/**
 * Ochiq skan tokeni bo'yicha to'liq tahlil: muammolar va tavsiya
 * qilingan mahsulotlar (nomi, narxi, nega mos). AI shu bilan maslahat
 * beradi, Direct xabari ham shundan tuziladi.
 */
export async function tahlilMalumoti(token, katalog = null) {
  const a = await qator(`select a.id, a.score, a.skin_type, a.age_estimate, a.problems, a.routine, a.natija_rasm_id,
         a.raw->>'tavsif' as tavsif, a.raw->>'xulosa' as xulosa
       from ochiq_skan o join analyses a on a.id = o.analysis_id where o.token = $1`, [token]);
  if (!a) return null;
  const routine = Array.isArray(a.routine) ? a.routine : [];
  const idlar = routine.map((r) => Number(r.product_id)).filter(Boolean);
  const mahsulot = katalog
    ? katalog.filter((p) => idlar.includes(Number(p.id)))
    : idlar.length ? await qatorlar(`select id, name, nom_uz, brand, price, old_price, stock from products where id = any($1)`, [idlar]) : [];
  const karta = new Map(mahsulot.map((p) => [Number(p.id), p]));
  const tavsiya = routine.map((r) => {
    const p = karta.get(Number(r.product_id));
    if (!p) return null;
    return { id: p.id, nom: p.nom_uz || p.name, brend: p.brand || '', narx: Number(p.price) || 0,
      eski_narx: Number(p.old_price) || 0, bosqich: r.bosqich || '', sabab: String(r.sabab || '').slice(0, 200),
      bor: !(p.stock <= 0) };
  }).filter(Boolean);
  const muammolar = (Array.isArray(a.problems) ? a.problems : [])
    .map((m) => ({ nom: m.nom, foiz: m.foiz, zona: m.zona, sabab: m.sabab })).filter((m) => m.nom);
  return {
    natija_rasm_id: a.natija_rasm_id,
    tahlil: { ball: a.score, teri_turi: a.skin_type, yosh: a.age_estimate, tavsif: a.tavsif || '', xulosa: a.xulosa || '', muammolar },
    tavsiya: [...tavsiya.filter((x) => x.bor), ...tavsiya.filter((x) => !x.bor)],
  };
}

const tahlilMatni = ({ tahlil: t, tavsiya }) => [
  `Ball ${t.ball ?? '?'}/100, ${t.teri_turi || ''} teri${t.yosh ? `, taxminiy yosh ${t.yosh}` : ''}. ${t.tavsif || ''} ${t.xulosa || ''}`.trim(),
  t.muammolar.length ? `Muammolar: ${t.muammolar.slice(0, 6).map((m) => `${m.nom}${m.foiz ? ` ${m.foiz}%` : ''}${m.zona ? ` (${m.zona})` : ''}`).join('; ')}` : 'Jiddiy muammo topilmadi.',
  tavsiya.length ? `Tavsiya qilingan mahsulotlar (unga yuborilgan):\n${tavsiya.slice(0, 6).map((p) =>
    `- ${p.brend ? p.brend + ' ' : ''}${p.nom} | ${p.narx} so'm | ${p.bosqich} | ${p.sabab}${p.bor ? '' : ' | TUGAGAN'}`).join('\n')}` : '',
].filter(Boolean).join('\n').slice(0, 1500);

/** Suhbat tarixi AI uchun. */
async function tarixi(suhbatId) {
  const r = await qatorlar(`select kim, matn, rasm_url from ig_xabarlar where suhbat_id = $1 and xato is null
     order by created_at desc, id desc limit 20`, [suhbatId]);
  return r.reverse().map((x) => ({
    kim: x.kim === 'mijoz' ? 'mijoz' : 'ai',
    matn: x.matn || (x.rasm_url ? (x.kim === 'mijoz' ? '(rasm yubordi)' : '(rasm yuborildi)') : ''),
  })).filter((x) => x.matn);
}

/** AI javobi — barcha shartlar tekshiriladi (o'chiq, pauza, admin yozdi…). */
const kut = (ms) => (ms > 0 && globalThis.IG_KECHIKISH_MS !== 0 ? new Promise((ok) => setTimeout(ok, ms)) : Promise.resolve());

/** AI uchun to'liq kontekst: tarix, katalog, tahlil, do'kon bilimi. */
async function javobKonteksti(s, st) {
  const { faolMahsulotlar } = await import('../analysis.js');
  const { uslubUrugi } = await import('../../ai/instagram-suhbat.js');
  const katalog = await faolMahsulotlar();
  const t = s.tahlil_token ? await tahlilMalumoti(s.tahlil_token, katalog).catch(() => null) : null;
  return {
    tarix: await tarixi(s.id), korsatma: st.korsatma, mahsulotlar: katalog,
    malumot: { ism: s.ism || s.username || '', tg_havola: await botHavolasi('h_ig-direct'),
      ...(await dokonHavolalari()), dokon: await dokonBilimi().catch(() => ''), bilim: st.bilim || '',
      izoh: s.izoh || '', urug: uslubUrugi(s.igsid),
      tahlil: t ? tahlilMatni(t) : '', tahlil_soz: t ? t.tahlil.muammolar.map((m) => m.nom).join(' ') : '',
      tahlil_havola: t ? await botHavolasi(`n_${s.tahlil_token}`) : '' },
  };
}

/** Oxirgi kiruvchi xabar id — javob yozilayotganda mijoz yana yozdimi, shu bilan bilinadi. */
const oxirgiKiruvchi = async (id) => Number(await qiymat(
  `select coalesce(max(id), 0) from ig_xabarlar where suhbat_id = $1 and yonalish = 'kiruvchi'`, [id]) || 0);

/**
 * Javobni ODAMDEK yuboradi: «ko'rildi» → «yozmoqda…» → har qism o'z
 * vaqtida, alohida xabar bo'lib. Yozib turgan paytda mijoz yana yozsa —
 * to'xtaydi ({uzildi:true}): odam ham yangi xabarni o'qib, javobini
 * o'zgartiradi.
 */
async function odamdekYubor(s, javob, kim, { niyat = null, st = null, kiruvchiId = null, birinchi = true } = {}) {
  const { qismlarga, yozishVaqti } = await import('../../ai/instagram-suhbat.js');
  st ||= await igSozlamalari();
  const qismlar = qismlarga(javob);
  const yangi = await qator(`select oxirgi_kiruvchi from ig_suhbatlar where id = $1`, [s.id]);
  const javobVaqti = () => (yangi?.oxirgi_kiruvchi ? Date.now() - new Date(yangi.oxirgi_kiruvchi).getTime() : null);
  for (let i = 0; i < qismlar.length; i++) {
    api.yozmoqda(s.igsid);
    let qoldi = yozishVaqti(qismlar[i], { birinchi: birinchi && i === 0, tezlik: st.yozish_tezligi });
    // «yozmoqda…» belgisi Instagram'da ~20 soniyada o'chadi — yangilab turamiz
    while (qoldi > 0) { const b = Math.min(qoldi, 9000); await kut(b); qoldi -= b; if (qoldi > 0) api.yozmoqda(s.igsid); }
    if (kiruvchiId !== null && await oxirgiKiruvchi(s.id) > kiruvchiId) return { uzildi: true, yuborildi: i };
    await yuborVaYoz(s, qismlar[i], kim, { niyat: i === 0 ? niyat : null, javob_ms: i === 0 && kim !== 'eslatma' ? javobVaqti() : null });
  }
  return { uzildi: false, yuborildi: qismlar.length };
}

// Bitta suhbatda bir vaqtda bitta javob: ikkinchisi navbat kutadi
const band = new Map();

/** AI javobi — barcha shartlar tekshiriladi (o'chiq, pauza, admin yozdi…). */
export async function aiJavobYoz(suhbatId, { majburiy = false } = {}) {
  if (band.has(suhbatId)) { band.get(suhbatId).qayta = true; return null; }
  const h = { qayta: false };
  band.set(suhbatId, h);
  try {
    let r = null;
    for (let urinish = 0; urinish < 3; urinish++) {
      h.qayta = false;
      r = await birJavob(suhbatId, { majburiy });
      if (!r?.uzildi && !h.qayta) break;
    }
    return r;
  } finally { band.delete(suhbatId); }
}

async function birJavob(suhbatId, { majburiy = false } = {}) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [suhbatId]);
  if (!s) return null;
  const st = await igSozlamalari();
  if (!majburiy) {
    if (!st.ai_yoqiq || !s.ai_yoqiq) return null;
    if (s.ai_pauza_gacha && new Date(s.ai_pauza_gacha) > new Date()) return null;
  }
  const { igJavob } = await import('../../ai/instagram-suhbat.js');
  const kiruvchiId = await oxirgiKiruvchi(s.id);
  // Odam avval o'qiydi: «ko'rildi»
  if (st.korildi) { await kut(st.yozish_tezligi === 'tez' ? 300 : 700 + Math.random() * 1800); api.korildi(s.igsid); }
  const sorovi = await javobKonteksti(s, st);
  let r;
  try {
    r = await igJavob(sorovi).catch(async () => {          // bir marta qayta urinish (provayder vaqtincha band)
      await kut(2000);
      return igJavob(sorovi);
    });
  } catch (e) {
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'ai', matn: null, xato: `AI javob bermadi: ${e.message}`.slice(0, 300) });
    await diag.belgila('ai_xato', e.message);
    // Mijoz jimlikda qolmasin: menejer chaqiriladi va odamga shu aytiladi
    await sorov(`update ig_suhbatlar set admin_kerak = true where id = $1`, [s.id]);
    await yuborVaYoz(s, 'xabaringizni oldim, hozir menejerimiz javob beradi 🙏', 'ai').catch(() => {});
    await adminlargaXabar(`📸 <b>Instagram</b>: AI ${s.username ? '@' + s.username : 'mijoz'}ga javob bera olmadi — `
      + `menejer yozsin.\nSabab: ${String(e.message).slice(0, 200)}\nAdmin panel → Instagram → Direct`, 'ai_xato').catch(() => {});
    return null;
  }
  if (!r.javob) return null;
  const y = await odamdekYubor(s, r.javob, 'ai', { niyat: r.niyat, st, kiruvchiId });
  if (y.uzildi) return { ...r, uzildi: true };
  await sorov(`update ig_suhbatlar set oxirgi_niyat = $2 where id = $1`, [s.id, r.niyat]);
  if (r.admin_kerak && !s.admin_kerak) {
    await sorov(`update ig_suhbatlar set admin_kerak = true where id = $1`, [s.id]);
    await adminlargaXabar(`📸 <b>Instagram</b>: ${s.username ? '@' + s.username : 'mijoz'} bilan suhbatga menejer kerak.\n`
      + `Oxirgi xabar: «${(await tarixi(s.id)).filter((x) => x.kim === 'mijoz').pop()?.matn?.slice(0, 200) || '-'}»\n`
      + `Admin panel → Instagram → Direct`).catch(() => {});
  }
  return r;
}

/** Admin uchun AI qoralamasi — YUBORILMAYDI, faqat matn qaytadi. */
export async function qoralama(id) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [Number(id)]);
  if (!s) return { xato: 'Suhbat topilmadi.' };
  const { igJavob } = await import('../../ai/instagram-suhbat.js');
  const r = await igJavob(await javobKonteksti(s, await igSozlamalari()));
  return { javob: r.javob, niyat: r.niyat, admin_kerak: r.admin_kerak };
}

// Do'kon bilimi — bazadan yig'iladi (brendlar, toifalar, aksiya, ko'p sotilganlar,
// yetkazish tarifi). 10 daqiqa keshda: har xabarga qayta so'rov shart emas.
let bilimKesh = null;
export async function dokonBilimi() {
  if (bilimKesh && Date.now() - bilimKesh.vaqt < 10 * 60_000) return bilimKesh.matn;
  const [jami, brendlar, toifalar, aksiya, top, filial, uy] = await Promise.all([
    qator(`select count(*)::int as n, min(price)::int as min, max(price)::int as max from products where is_active and stock > 0`),
    qatorlar(`select brand, count(*)::int as n from products where is_active and stock > 0 and brand is not null and brand <> ''
      group by brand order by n desc limit 25`),
    qatorlar(`select c.name, count(p.id)::int as n from categories c join products p on p.category_id = c.id and p.is_active
      group by c.name order by n desc limit 12`).catch(() => []),
    qatorlar(`select coalesce(nom_uz, name) as nom, brand, price, old_price from products
      where is_active and stock > 0 and old_price > price order by (old_price - price) desc limit 8`),
    qatorlar(`select coalesce(nom_uz, name) as nom, brand, price from products
      where is_active and stock > 0 order by sold_count desc nulls last limit 8`),
    sozlama('tarif_filial_1kg', 7000).catch(() => 7000), sozlama('tarif_uy_1kg', 15000).catch(() => 15000),
  ]);
  const nom = (x) => `${x.brand ? x.brand + ' ' : ''}${x.nom}`;
  const matnB = [
    `- Katalog: ${jami?.n || 0} ta mahsulot sotuvda, narxlar ${jami?.min || 0} — ${jami?.max || 0} so'm.`,
    brendlar.length ? `- Brendlar: ${brendlar.map((b) => b.brand).join(', ')}.` : '',
    toifalar.length ? `- Toifalar: ${toifalar.map((t) => t.name).join(', ')}.` : '',
    aksiya.length ? `- Hozirgi aksiyalar: ${aksiya.map((x) => `${nom(x)} ${x.price} (eski ${x.old_price})`).join('; ')}.` : '',
    top.length ? `- Ko'p sotilganlar: ${top.map((x) => `${nom(x)} ${x.price}`).join('; ')}.` : '',
    `- Yetkazish narxi taxminan: pochta filialigacha 1 kg ${filial} so'm, uygacha ${uy} so'm (og'irlikka qarab o'zgaradi).`,
  ].filter(Boolean).join('\n');
  bilimKesh = { matn: matnB, vaqt: Date.now() };
  return matnB;
}
export const bilimniUnut = () => { bilimKesh = null; };

async function yuborVaYoz(s, m, kim, { niyat = null, javob_ms = null } = {}) {
  try {
    const j = await api.matnYubor(s.igsid, m);
    await diag.belgila('yuborildi');
    return xabarYoz(s.id, { yonalish: 'chiquvchi', kim, matn: m, mid: j.message_id || null, niyat,
      javob_ms: Number.isFinite(javob_ms) ? Math.min(2e9, Math.round(javob_ms)) : null });
  } catch (e) {
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim, matn: m, xato: e.message.slice(0, 300) });
    await diag.belgila('yuborish_xato', e.message);
    if (kim !== 'admin') {
      await adminlargaXabar(`📸 <b>Instagram</b>: ${s.username ? '@' + s.username : 'mijoz'}ga javob yuborilmadi.\n`
        + `Sabab: ${e.message.slice(0, 250)}\nAdmin panel → Instagram → Sozlamalar → Tekshiruv`, 'yuborish_xato').catch(() => {});
    }
    throw e;
  }
}

// Bir xil ogohlantirish adminni ko'mib tashlamasin: turi bo'yicha 30 daqiqada bir marta
const ogohVaqti = new Map();
async function adminlargaXabar(html, tur = '') {
  if (tur) {
    if (Date.now() - (ogohVaqti.get(tur) || 0) < 30 * 60_000) return;
    ogohVaqti.set(tur, Date.now());
  }
  const { yubor } = await import('../../bot/tg.js');
  const idlar = new Set(config.adminTelegramIds || []);
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  for (const id of idlar) await yubor(id, html).catch(() => {});
}

// ─────────────────── YUZ RASMI → NATIJA VA TAVSIYA ───────────────────

const RAD_MATN = {
  xira: 'rasm biroz xira chiqibdi, yorug\' joyda kamerani yuzga to\'g\'ri tutib yana bitta tashlang',
  qorongi: 'qorong\'iroq chiqibdi, deraza yonida kunduzgi yorug\'likda yana bitta tashlang',
  uzoq: 'yuzingiz uzoqda qolibdi, yaqinroqdan oling, yuz kadrni to\'ldirsin',
  yopiq: 'yuzingiz biroz yopiq qolibdi (soch yoki ko\'zoynak), ochiq holda yana bitta tashlang',
  bir_nechta: 'rasmda bir nechta odam bor, faqat o\'zingiz tushgan rasmni tashlang',
  pardoz: 'pardoz terini yashirib qo\'yadi, iloji bo\'lsa pardozsiz rasm tashlang, aniqroq chiqadi',
  sunday: 'bu rasm filtrli yoki ishlangan ko\'rinyapti, oddiy kamerada olingan rasm kerak',
};

export async function rasmniTahlilQil(suhbatId, url) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [suhbatId]);
  const st = await igSozlamalari();
  if (!s) return null;
  const pauzada = !st.ai_yoqiq || !s.ai_yoqiq || (s.ai_pauza_gacha && new Date(s.ai_pauza_gacha) > new Date());
  if (pauzada) return null;                               // admin suhbatni o'zi olib boryapti
  const { uslubUrugi, insonlashtir } = await import('../../ai/instagram-suhbat.js');
  const urug = uslubUrugi(s.igsid);
  const kutMatn = ['oldim, hozir qarab beraman', 'ok, bir daqiqa tahlil qilib beraman',
    'rasm keldi, hozir ko\'rib chiqaman', 'qarayapman, yarim daqiqa'][Math.floor(Math.random() * 4)];
  if (st.korildi) { await kut(500 + Math.random() * 1200); api.korildi(s.igsid); }
  await odamdekYubor(s, insonlashtir(kutMatn, urug), 'tahlil', { st }).catch(() => {});
  api.yozmoqda(s.igsid);

  let base64, mime;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const bayt = Buffer.from(await r.arrayBuffer());
    if (bayt.length > 10 * 1024 * 1024) throw new Error('rasm juda katta');
    base64 = bayt.toString('base64');
    mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  } catch (e) {
    await yuborVaYoz(s, 'rasm ochilmadi, yana bir marta tashlab ko\'ring', 'tahlil').catch(() => {});
    return { xato: e.message };
  }

  const { ochiqSkan } = await import('../ochiq-skan.js');
  let n;
  try {
    n = await ochiqSkan({ base64, mime, ip: `ig:${s.igsid}`, manba: 'ig-direct' });
  } catch (e) {
    const m = e.message === 'CHEGARA'
      ? 'bugungi bepul tahlil limiti tugadi, ertaga yana tashlang yoki telegramda davom eting\n\n' + await botHavolasi('h_ig-direct')
      : 'hozir tahlil qilolmadim, bir necha daqiqadan keyin rasmni qayta tashlang 🙏';
    await yuborVaYoz(s, m, 'tahlil').catch(() => {});
    return { xato: e.message };
  }
  if (!n.yaroqli) {
    // Yuz emas (mahsulot rasmi, skrinshot) — oddiy suhbat: AI rasm haqida so'raydi
    if (['yuz_yoq', 'yuz_emas', 'ekran'].includes(n.sabab)) return aiJavobYoz(s.id);
    await odamdekYubor(s, RAD_MATN[n.sabab] || 'bu rasm tahlilga yaramadi, yorug\' joyda yuzingiz to\'liq ko\'rinadigan rasm tashlang', 'tahlil', { st }).catch(() => {});
    return { yaroqli: false, sabab: n.sabab };
  }
  await sorov(`update ig_suhbatlar set tahlil_token = $2 where id = $1`, [s.id, n.token]);

  const tg = await botHavolasi(`n_${n.token}`);
  const t = await tahlilMalumoti(n.token).catch(() => null);

  // 1) Natija rasmi. Asl rasm (tur 'natija') faqat admin uchun ochiq —
  //    Instagram uni yuklab olishi uchun ochiq nusxa saqlanadi.
  try {
    const m = t?.natija_rasm_id ? await qator(`select bayt from media where id = $1`, [t.natija_rasm_id]) : null;
    if (m?.bayt) {
      let bayt = Buffer.from(m.bayt), tur = 'ig_natija';
      if (st.xira) {
        const { xiraNatija } = await import('../../rasm/xira.js');
        bayt = await xiraNatija(bayt, { soni: n.yopiq?.muammo_soni || 0 });
        tur = 'ig_xira';
      }
      const md = await qator(`insert into media (tur, mime, bayt, hajm, goya) values ($1,'image/png',$2,$3,$4) returning id`,
        [tur, bayt, bayt.length, `Instagram natija · ${n.token.slice(0, 8)}`]);
      const rasmUrl = `${config.saytUrl}/media/${md.id}`;
      const j = await api.rasmYubor(s.igsid, rasmUrl);
      await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'tahlil', rasm: rasmUrl, mid: j.message_id || null });
    }
  } catch (e) {
    console.error('IG NATIJA RASMI:', e.message);
  }

  // 2) Rasmdan keyin. Standart — faqat natija va qisqa havola (mahsulot ro'yxati
  //    matnda yo'q: u natija rasmida ham, Telegramda ham bor). «mahsulotlar»
  //    rejimida — eski uzun xabar; «yoq» — faqat rasm.
  const o = n.ochiq || {};
  let tayyor = '';
  if (st.tahlil_matni) {
    const nomlar = (t?.tavsiya || []).slice(0, 4).map((p) => `${p.brend ? p.brend + ' ' : ''}${p.nom} ${p.narx.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so'm`).join('\n');
    tayyor = st.tahlil_matni.replaceAll('{ball}', String(o.ball ?? '')).replaceAll('{havola}', tg)
      .replaceAll('{soni}', String(n.yopiq?.muammo_soni ?? '')).replaceAll('{tavsif}', o.tavsif || '')
      .replaceAll('{mahsulotlar}', nomlar);
  } else if (st.tahlil_xabari === 'mahsulotlar') {
    const { tahlilXabari } = await import('../../ai/instagram-suhbat.js');
    tayyor = await tahlilXabari({
      tahlil: t?.tahlil || { ball: o.ball, tavsif: o.tavsif, teri_turi: o.teri_turi, muammolar: [] },
      tavsiya: t?.tavsiya || [], havola: tg, ism: s.ism || '', korsatma: st.korsatma,
    });
  } else if (st.tahlil_xabari !== 'yoq') {
    const { tahlilQisqa } = await import('../../ai/instagram-suhbat.js');
    const oxirgi = await qator(`select matn from ig_xabarlar where suhbat_id = $1 and yonalish = 'kiruvchi' and matn is not null
      order by id desc limit 1`, [s.id]);
    tayyor = tahlilQisqa({ havola: tg, urug: urug + Math.floor(Math.random() * 3), rus: /[а-яё]/i.test(oxirgi?.matn || '') }).join('\n\n');
  }
  if (tayyor) await odamdekYubor(s, insonlashtir(tayyor, urug), 'tahlil', { st, birinchi: false }).catch(() => {});
  await sorov(`update ig_suhbatlar set eslatma_at = null where id = $1`, [s.id]);
  return { yaroqli: true, token: n.token };
}

// ─────────────────────────── KOMMENTLAR ───────────────────────────

const normal = (t) => String(t || '').toLowerCase().replace(/[‘’'`ʻ]/g, '').replace(/\s+/g, ' ').trim();

// Spam: begona havola, «obuna bo'l», pul ishlash/kazino va so'kinish. Oddiy
// «+», «narxi?», emoji — spam EMAS.
const SPAM = [
  /https?:\/\/|www\.|\bt\.me\/|bit\.ly|\.(com|ru|net|xyz|top|uz)\b\/?/i,
  /(подпиш|подписывай|follow\s*(me|back)|f4f|l4l|obuna\s*bo['‘’ʻ]?l(ing)?\s*(menga|bizga))/i,
  /(заработ|earn\s*money|crypto|крипт|casino|казино|kazino|1xbet|ставк|investitsiya\s+qiling)/i,
  /(бля|сука|ху[йяеи]|пизд|ебан|jalab|qo['‘’ʻ]?toq|dalba[yj]o['‘’ʻ]?b|далба|onangni|gandon|гандон|mudak|мудак)/i,
];
export const spammi = (t) => SPAM.some((r) => r.test(String(t || '')));

/** Kommentga mos birinchi qoida. */
export function qoidaTop(qoidalar, kommentMatni, mediaId) {
  const t = normal(kommentMatni);
  for (const q of qoidalar) {
    if (!q.faol || (q.media_id && q.media_id !== mediaId)) continue;
    const k = (q.kalitlar || []).map(normal).filter(Boolean);
    if (q.aniq ? k.includes(t) || k.includes(t.replace(/\s/g, '')) : k.some((x) => t.includes(x))) return q;
  }
  return null;
}

async function kommentKeldi(v, bizniki) {
  const id = String(v.id || '');
  const from = v.from || {};
  if (!id || String(from.id || '') === bizniki) return;   // o'zimizning javobimiz
  const yangi = await qator(
    `insert into ig_kommentlar (id, media_id, parent_id, matn, username, from_id) values ($1,$2,$3,$4,$5,$6)
     on conflict (id) do nothing returning *`,
    [id, v.media?.id || null, v.parent_id || null, matn(v.text, 2200), from.username || null, from.id ? String(from.id) : null]);
  if (!yangi) return;
  const st = await igSozlamalari();
  if (st.spam_yashir && spammi(v.text)) {
    await api.kommentYashir(id, true).then(() =>
      sorov(`update ig_kommentlar set spam = true, yashirildi = true where id = $1`, [id]))
      .catch((e) => sorov(`update ig_kommentlar set spam = true, xato = $2 where id = $1`, [id, e.message.slice(0, 300)]));
    return;
  }
  if (!st.komment_qoidalar) return;
  const q = qoidaTop(await qatorlar(`select * from ig_qoidalar order by tartib, id`), v.text, v.media?.id);
  if (q) return qoidaniBajar(yangi, q, st);
  if (!st.komment_ai) return;
  // Odam kommentga darrov emas, biroz keyin javob yozadi
  const ms = globalThis.IG_KECHIKISH_MS === 0 ? 0
    : st.yozish_tezligi === 'tez' ? 2000 + Math.random() * 3000
    : st.yozish_tezligi === 'sekin' ? 60_000 + Math.random() * 180_000 : 20_000 + Math.random() * 60_000;
  if (!ms) return kommentgaAi(yangi, st);
  setTimeout(() => kommentgaAi(yangi, st).catch((e) => console.error('IG komment AI:', e.message)), ms);
}

// Post matni — AI kommentni post mavzusi bilan tushunsin (kesh: post o'zgarmaydi)
const postKesh = new Map();
async function postMatni(mediaId) {
  if (!mediaId) return '';
  if (postKesh.has(mediaId)) return postKesh.get(mediaId);
  const r = await api.ig(`/${mediaId}`, { qidiruv: { fields: 'caption' } }).catch(() => null);
  const m = String(r?.caption || '').slice(0, 600);
  if (postKesh.size > 300) postKesh.clear();
  postKesh.set(mediaId, m);
  return m;
}

/** Kommentga Direct (shaxsiy javob) — suhbat ochiladi, mijoz yozsa AI davom ettiradi. */
async function kommentgaDmYubor(k, dmMatn, kim) {
  const j = await api.kommentgaDm(k.id, dmMatn);
  if (j.recipient_id) {
    const s = await suhbatOl(String(j.recipient_id));
    if (k.username) await sorov(`update ig_suhbatlar set username = coalesce(username, $2) where id = $1`, [s.id, k.username]);
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim, matn: dmMatn, mid: j.message_id || null });
  }
  return j;
}

/**
 * Qoidaga tushmagan kommentga AI javobi: ma'nosiga qarab ochiq javob va
 * kerak bo'lsa (narx, shaxsiy savol, shikoyat) Direct. Bir odam ketma-ket
 * ko'p yozsa — 2 daqiqada bitta ochiq javob (spamdek ko'rinmasin).
 */
export async function kommentgaAi(k, st = null, { majburiy = false } = {}) {
  st ||= await igSozlamalari();
  const xatolar = [];
  if (!majburiy && k.from_id && await qator(`select 1 from ig_kommentlar where from_id = $1 and id <> $2 and javob is not null
      and created_at > now() - interval '2 minutes'`, [k.from_id, k.id])) return { otkazildi: 'tez-tez' };
  const { kommentJavobi, kommentDmMatni, uslubUrugi } = await import('../../ai/instagram-suhbat.js');
  const { faolMahsulotlar } = await import('../analysis.js');
  const katalog = await faolMahsulotlar();
  const malumot = { ...(await dokonHavolalari()), dokon: await dokonBilimi().catch(() => ''), bilim: st.bilim || '',
    urug: uslubUrugi(k.from_id || k.id) };
  let r;
  try {
    r = await kommentJavobi({ komment: k.matn, username: k.username || '', post: await postMatni(k.media_id),
      korsatma: st.korsatma, mahsulotlar: katalog, malumot });
  } catch (e) {
    await sorov(`update ig_kommentlar set xato = $2 where id = $1`, [k.id, `AI: ${e.message}`.slice(0, 300)]);
    return { xato: e.message };
  }
  let dm = Boolean(k.dm_yuborildi);
  if (r.direct && !dm) {
    try {
      const dmMatn = await kommentDmMatni({ komment: k.matn, korsatma: st.korsatma, mahsulotlar: katalog,
        malumot: { ...malumot, ism: k.username || '', tg_havola: await botHavolasi('h_ig-komment') } });
      if (dmMatn) { await kommentgaDmYubor(k, dmMatn, 'ai'); dm = true; }
    } catch (e) { xatolar.push(`Direct: ${e.message}`); }
  }
  let javob = r.javob || null;
  if (javob) {
    if (st.komment_mention && k.username) javob = `@${k.username} ${javob}`;
    // Javobga javob (thread) — Instagram faqat asosiy kommentga javob qabul qiladi
    try { await api.kommentgaJavob(k.parent_id || k.id, javob); } catch (e) { xatolar.push(`Javob: ${e.message}`); javob = null; }
  }
  await sorov(`update ig_kommentlar set javob = coalesce($2, javob), dm_yuborildi = $3, ai = $4, xato = $5 where id = $1`,
    [k.id, javob, dm, Boolean(javob || dm), xatolar.join(' · ') || null]);
  return { javob, dm, xatolar };
}

export async function qoidaniBajar(k, q, st) {
  const xatolar = [];
  let dm = false, javob = null;
  const ism = k.username ? ` ${k.username}` : '';
  // 1) Direct (kommentga shaxsiy javob — Instagram bitta xabarga ruxsat beradi)
  let dmMatn = q.dm_matn ? q.dm_matn.replaceAll('{ism}', ism).replaceAll('{tg_havola}', await botHavolasi('h_ig-komment')) : '';
  if (q.dm_ai) {
    try {
      const { kommentDmMatni } = await import('../../ai/instagram-suhbat.js');
      const { faolMahsulotlar } = await import('../analysis.js');
      dmMatn = await kommentDmMatni({ komment: k.matn, korsatma: st.korsatma, mahsulotlar: await faolMahsulotlar(),
        malumot: { ism: k.username || '', tg_havola: await botHavolasi('h_ig-komment') } }) || dmMatn;
    } catch (e) { xatolar.push(`AI: ${e.message}`); }
  }
  if (dmMatn) {
    try { await kommentgaDmYubor(k, dmMatn, 'qoida'); dm = true; } catch (e) { xatolar.push(`Direct: ${e.message}`); }
  }
  // 2) Ochiq javob (bir nechta variantdan tasodifiy — bir xil javob spamdek ko'rinadi)
  const variantlar = (q.javoblar || []).filter(Boolean);
  if (variantlar.length) {
    javob = variantlar[Math.floor(Math.random() * variantlar.length)];
    if (st.komment_mention && k.username) javob = `@${k.username} ${javob}`;
    try { await api.kommentgaJavob(k.id, javob); } catch (e) { xatolar.push(`Javob: ${e.message}`); javob = null; }
  }
  await sorov(`update ig_kommentlar set qoida_id = $2, dm_yuborildi = $3, javob = $4, xato = $5 where id = $1`,
    [k.id, q.id, dm, javob, xatolar.join(' · ') || null]);
  await sorov(`update ig_qoidalar set ishladi = ishladi + 1 where id = $1`, [q.id]);
  return { dm, javob, xatolar };
}

// ─────────────────────────── ADMIN PANEL ───────────────────────────

export async function igHolat() {
  const u = await api.ulanish();
  const [st, bugun, tg] = await Promise.all([
    igSozlamalari(),
    qator(`select
        (select count(*) from ig_xabarlar where yonalish = 'kiruvchi' and created_at >= date_trunc('day', now()))::int as kiruvchi,
        (select count(*) from ig_xabarlar where kim = 'ai' and xato is null and created_at >= date_trunc('day', now()))::int as ai_javob,
        (select count(*) from ig_suhbatlar where tahlil_token is not null and created_at >= now() - interval '30 days')::int as tahlil,
        (select count(*) from ig_kommentlar where created_at >= date_trunc('day', now()))::int as komment,
        (select count(*) from ig_kommentlar where dm_yuborildi and created_at >= date_trunc('day', now()))::int as dm,
        (select count(*) from ig_suhbatlar where oqilmagan > 0)::int as oqilmagan,
        (select count(*) from ig_suhbatlar where admin_kerak)::int as admin_kerak`),
    qator(`select count(*)::int as soni from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token
        where o.olindi_id is not null`).catch(() => ({ soni: 0 })),
  ]);
  return {
    ulangan: Boolean(u.token), username: u.username, akkaunt_id: u.akkaunt_id, token_manba: u.manba,
    imzo_sir: sirlar().length > 0, imzo_sir_panel: Boolean(panelSiri),
    diag: await diag.diagnostika(),
    webhook_url: `${config.saytUrl}/instagram/webhook`, verify_token: await verifyToken(),
    sozlamalar: st, bugun: { ...bugun, telegramga_otdi: tg?.soni ?? 0 },
    standart_korsatma: (await import('../../ai/instagram-suhbat.js')).STANDART_KORSATMA,
  };
}

/**
 * «Instadan yozsam javob yo'q» — sababni bosqichma-bosqich tekshiradi.
 * Har qator: {nom, holat: 'ok'|'ogoh'|'xato', izoh}.
 */
export async function tekshiruv() {
  await sirlarniYukla();
  const u = await api.ulanish();
  const d = await diag.diagnostika();
  const st = await igSozlamalari();
  const q = [];
  const vaqt = (t) => (t ? new Date(t).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : '');
  if (!u.token) {
    q.push({ nom: 'Token', holat: 'xato', izoh: 'Instagram ulanmagan — Sozlamalarda token kiriting.' });
    return { qatorlar: q, diag: d };
  }
  try {
    const me = await api.akkaunt();
    q.push({ nom: 'Token', holat: 'ok', izoh: `@${me?.username || u.username} ulangan.` });
  } catch (e) {
    q.push({ nom: 'Token', holat: 'xato', izoh: e.message });
  }
  try {
    const w = await api.webhookHolati();
    const maydon = (w?.data || []).flatMap((x) => x.subscribed_fields || []);
    q.push(maydon.includes('messages')
      ? { nom: 'Webhook obunasi', holat: 'ok', izoh: `Ulangan: ${maydon.join(', ')}.` }
      : { nom: 'Webhook obunasi', holat: 'xato', izoh: 'Akkaunt «messages» ga obuna emas — «Webhookni akkauntga ulash» tugmasini bosing.' });
  } catch (e) {
    q.push({ nom: 'Webhook obunasi', holat: 'ogoh', izoh: `Tekshirib bo‘lmadi: ${e.message}` });
  }
  if (!sirlar().length) q.push({ nom: 'Imzo (App secret)', holat: 'ogoh', izoh: 'App secret berilmagan — xabarlar qabul qilinadi, lekin imzo tekshirilmaydi.' });
  else if (d.imzo_xato_oxirgi && (!d.webhook_oxirgi || d.imzo_xato_oxirgi > d.webhook_oxirgi)) {
    q.push({ nom: 'Imzo (App secret)', holat: 'xato',
      izoh: `Meta yuborgan ${d.imzo_xato_soni || 1} ta xabar imzo mos kelmagani uchun RAD etildi (oxirgisi ${vaqt(d.imzo_xato_oxirgi)}). `
        + 'Meta → App → Instagram → «API setup with Instagram login» → «Business login settings» dagi «Instagram app secret» ni '
        + 'shu yerga kiriting (Facebook «App secret» emas).' });
  } else q.push({ nom: 'Imzo (App secret)', holat: 'ok', izoh: 'Imzo tekshirilyapti.' });
  q.push(d.webhook_oxirgi
    ? { nom: 'Meta’dan xabar kelyaptimi', holat: 'ok', izoh: `Oxirgi webhook: ${vaqt(d.webhook_oxirgi)} (jami ${d.webhook_soni || 0}).` }
    : { nom: 'Meta’dan xabar kelyaptimi', holat: 'xato',
        izoh: 'Hali BIRORTA webhook kelmagan. Tekshiring: 1) Meta → Webhooks da manzil va verify token to‘g‘ri, «messages» maydoni Subscribe; '
          + '2) ilova Development rejimida bo‘lsa, faqat ilovada roli bor (Tester) akkauntlar yozganda keladi — '
          + 'boshqa odamlar uchun ilovani Live qiling va instagram_business_manage_messages ga Advanced Access oling; '
          + '3) Instagram ilovasida: Sozlamalar → Xabarlar → «Ulangan vositalar» → «Xabarlarga ruxsat» yoqilgan bo‘lsin; '
          + '4) yuqoridagi «Webhookni akkauntga ulash» tugmasini bosing.' });
  if (d.yuborish_xato_oxirgi && (!d.yuborildi_oxirgi || d.yuborish_xato_oxirgi > d.yuborildi_oxirgi)) {
    q.push({ nom: 'Javob yuborish', holat: 'xato', izoh: `Oxirgi xato (${vaqt(d.yuborish_xato_oxirgi)}): ${d.yuborish_xato_izoh || ''}` });
  } else if (d.yuborildi_oxirgi) q.push({ nom: 'Javob yuborish', holat: 'ok', izoh: `Oxirgi javob: ${vaqt(d.yuborildi_oxirgi)}.` });
  if (d.ai_xato_oxirgi && (!d.yuborildi_oxirgi || d.ai_xato_oxirgi > d.yuborildi_oxirgi)) {
    q.push({ nom: 'AI', holat: 'xato', izoh: `AI javob bermadi (${vaqt(d.ai_xato_oxirgi)}): ${d.ai_xato_izoh || ''}` });
  }
  if (!st.ai_yoqiq) q.push({ nom: 'AI javoblari', holat: 'ogoh', izoh: '«Direct’ga AI javob bersin» o‘chiq.' });
  const pauza = await qator(`select count(*)::int as n from ig_suhbatlar where ai_pauza_gacha > now() or not ai_yoqiq`);
  if (pauza?.n) q.push({ nom: 'Jim suhbatlar', holat: 'ogoh', izoh: `${pauza.n} ta suhbatda AI hozir jim (siz yozgansiz yoki o‘chirilgan). Direct → suhbat → «AI ni qaytarish».` });
  return { qatorlar: q, diag: d };
}

/** Hamma suhbatlardagi «AI jim» pauzasini olib tashlaydi (echo xatosidan keyin tozalash). */
export async function pauzalarniOch() {
  const r = await sorov(`update ig_suhbatlar set ai_pauza_gacha = null where ai_pauza_gacha > now()`);
  return { ochildi: r.rowCount || 0 };
}

// Suhbat bosqichi (voronka): suhbat → tahlil → telegram → mijoz (buyurtma qildi)
const BOSQICH_SQL = `case
    when exists (select 1 from ochiq_skan o join orders r on r.user_id = o.olindi_id
                  where o.token = s.tahlil_token and r.status <> 'bekor') then 'mijoz'
    when exists (select 1 from ochiq_skan o where o.token = s.tahlil_token and o.olindi_id is not null) then 'telegram'
    when s.tahlil_token is not null then 'tahlil'
    else 'suhbat' end`;

export async function suhbatlar({ q = '', filtr = '', chegara = 60 } = {}) {
  const p = [];
  const shart = ['1=1'];
  if (q) { p.push(`%${matn(q, 60)}%`); shart.push(`(username ilike $${p.length} or ism ilike $${p.length} or oxirgi_matn ilike $${p.length} or izoh ilike $${p.length})`); }
  if (filtr === 'oqilmagan') shart.push('oqilmagan > 0');
  if (filtr === 'admin') shart.push('admin_kerak');
  if (filtr === 'tahlil') shart.push('tahlil');
  if (['telegram', 'mijoz'].includes(filtr)) { p.push(filtr); shart.push(`bosqich = $${p.length}`); }
  p.push(Math.min(200, son(chegara, 60)));
  return qatorlar(`select * from (select id, igsid, username, ism, rasm_url, ai_yoqiq, ai_pauza_gacha, admin_kerak, oqilmagan,
      oxirgi_matn, oxirgi_at, oxirgi_kiruvchi, oxirgi_niyat, izoh, teglar, tahlil_token is not null as tahlil, ${BOSQICH_SQL} as bosqich
      from ig_suhbatlar s) t where ${shart.join(' and ')} order by oxirgi_at desc limit $${p.length}`, p);
}

export async function suhbatXabarlari(id, { oqildi = true } = {}) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [Number(id)]);
  if (!s) return null;
  if (oqildi && s.oqilmagan) await sorov(`update ig_suhbatlar set oqilmagan = 0 where id = $1`, [s.id]);
  const xabarlar = await qatorlar(`select id, yonalish, kim, matn, rasm_url, xato, niyat, created_at from ig_xabarlar
      where suhbat_id = $1 order by created_at, id`, [s.id]);
  const tg = s.tahlil_token ? await qator(`select olindi_id, olindi_at from ochiq_skan where token = $1`, [s.tahlil_token]) : null;
  // Mijoz kartasi: tahlil, Telegram'dagi foydalanuvchi va buyurtmalari
  let tahlil = null, mijoz = null;
  if (s.tahlil_token) {
    const t = await tahlilMalumoti(s.tahlil_token).catch(() => null);
    if (t) tahlil = { ball: t.tahlil.ball, teri_turi: t.tahlil.teri_turi, yosh: t.tahlil.yosh,
      muammolar: t.tahlil.muammolar.slice(0, 5).map((m) => m.nom),
      tavsiya: t.tavsiya.slice(0, 5).map((p) => ({ nom: `${p.brend ? p.brend + ' ' : ''}${p.nom}`, narx: p.narx })) };
  }
  if (tg?.olindi_id) {
    mijoz = await qator(`select u.id, u.full_name as ism, u.phone as telefon,
        (select count(*)::int from orders r where r.user_id = u.id and r.status <> 'bekor') as buyurtma_soni,
        (select coalesce(sum(total), 0)::int from orders r where r.user_id = u.id and r.status <> 'bekor') as jami
      from users u where u.id = $1`, [tg.olindi_id]).catch(() => null);
  }
  const bosqich = mijoz?.buyurtma_soni ? 'mijoz' : tg?.olindi_id ? 'telegram' : s.tahlil_token ? 'tahlil' : 'suhbat';
  return {
    suhbat: { ...s, oyna_ochiq: s.oxirgi_kiruvchi && Date.now() - new Date(s.oxirgi_kiruvchi) < 24 * 3600e3,
      telegramga_otdi: Boolean(tg?.olindi_id), bosqich },
    xabarlar, karta: { tahlil, mijoz, bosqich },
  };
}

/** Admin panel/AI yordamchidan qo'lda xabar — AI shu suhbatda vaqtincha jim turadi. */
export async function qoldaYubor(id, m, { pauza = true } = {}) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [Number(id)]);
  if (!s) return { xato: 'Suhbat topilmadi.' };
  const t = matn(m, 1000);
  if (!t) return { xato: 'Xabar bo‘sh.' };
  try { await yuborVaYoz(s, t, 'admin'); } catch (e) { return { xato: e.message }; }
  if (pauza) {
    const st = await igSozlamalari();
    await sorov(`update ig_suhbatlar set ai_pauza_gacha = now() + ($2 || ' minutes')::interval, admin_kerak = false where id = $1`,
      [s.id, String(st.qolda_pauza_daqiqa)]);
  }
  return { yuborildi: true };
}

export async function suhbatOzgartir(id, { ai_yoqiq, admin_kerak, pauza_olib, izoh, teglar } = {}) {
  const tg = Array.isArray(teglar) ? teglar.map((x) => matn(x, 30)).filter(Boolean).slice(0, 10) : null;
  const r = await qator(`update ig_suhbatlar set ai_yoqiq = coalesce($2, ai_yoqiq), admin_kerak = coalesce($3, admin_kerak),
      ai_pauza_gacha = case when $4 then null else ai_pauza_gacha end,
      izoh = case when $5::text is null then izoh else nullif($5, '') end, teglar = coalesce($6, teglar)
      where id = $1 returning *`,
    [Number(id), typeof ai_yoqiq === 'boolean' ? ai_yoqiq : null, typeof admin_kerak === 'boolean' ? admin_kerak : null, pauza_olib === true,
      typeof izoh === 'string' ? matn(izoh, 1000) : null, tg]);
  return r ? { suhbat: r } : { xato: 'Suhbat topilmadi.' };
}

export const kommentlar = ({ chegara = 80, filtr = '' } = {}) => qatorlar(
  `select k.*, q.nom as qoida_nom from ig_kommentlar k left join ig_qoidalar q on q.id = k.qoida_id
    ${filtr === 'javobsiz' ? 'where k.javob is null and not k.dm_yuborildi and not k.yashirildi' : filtr === 'qoida' ? 'where k.qoida_id is not null' : ''}
    order by k.created_at desc limit $1`, [Math.min(300, son(chegara, 80))]);

export async function kommentAmal(id, amal, m = '') {
  const k = await qator(`select * from ig_kommentlar where id = $1`, [String(id)]);
  if (!k) return { xato: 'Komment topilmadi.' };
  try {
    if (amal === 'javob') {
      const t = matn(m, 300); if (!t) return { xato: 'Javob bo‘sh.' };
      await api.kommentgaJavob(k.id, t);
      await sorov(`update ig_kommentlar set javob = $2 where id = $1`, [k.id, t]);
    } else if (amal === 'dm') {
      const t = matn(m, 1000); if (!t) return { xato: 'Xabar bo‘sh.' };
      const j = await api.kommentgaDm(k.id, t);
      await sorov(`update ig_kommentlar set dm_yuborildi = true where id = $1`, [k.id]);
      if (j.recipient_id) {
        const s = await suhbatOl(String(j.recipient_id));
        await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'admin', matn: t, mid: j.message_id || null });
      }
    } else if (amal === 'yashir' || amal === 'kor') {
      await api.kommentYashir(k.id, amal === 'yashir');
      await sorov(`update ig_kommentlar set yashirildi = $2 where id = $1`, [k.id, amal === 'yashir']);
    } else if (amal === 'ochir') {
      await api.kommentOchir(k.id);
      await sorov(`delete from ig_kommentlar where id = $1`, [k.id]);
    } else if (amal === 'ai') {
      const r = await kommentgaAi(k, null, { majburiy: true });
      if (r.xato) return { xato: `AI: ${r.xato}` };
      return { ...r, ok: true };
    } else if (amal === 'qoida') {
      const st = await igSozlamalari();
      const q = qoidaTop(await qatorlar(`select * from ig_qoidalar order by tartib, id`), k.matn, k.media_id);
      if (!q) return { xato: 'Bu kommentga mos qoida yo‘q.' };
      return { ...(await qoidaniBajar(k, q, st)), qoida: q.nom };
    } else return { xato: 'Noma’lum amal.' };
  } catch (e) { return { xato: e.message }; }
  return { ok: true };
}

export const qoidalar = () => qatorlar(`select * from ig_qoidalar order by tartib, id`);

export async function qoidaSaqla(b = {}) {
  const ro = (v) => (Array.isArray(v) ? v : String(v || '').split(/\n|,/)).map((x) => matn(x, 200)).filter(Boolean).slice(0, 30);
  const nom = matn(b.nom, 80);
  const kalitlar = ro(b.kalitlar).map((x) => x.slice(0, 40));
  if (!nom) return { xato: 'Qoida nomini yozing.' };
  if (!kalitlar.length) return { xato: 'Kamida bitta kalit so‘z kerak (masalan «+»).' };
  const javoblar = (Array.isArray(b.javoblar) ? b.javoblar : String(b.javoblar || '').split('\n')).map((x) => matn(x, 300)).filter(Boolean).slice(0, 10);
  const dm = matn(b.dm_matn, 1000) || null;
  if (!javoblar.length && !dm && b.dm_ai !== true) return { xato: 'Ochiq javob yoki Direct xabari bo‘lishi kerak.' };
  const qiymat = [nom, b.faol !== false, Math.round(son(b.tartib, 100)), kalitlar, b.aniq === true, matn(b.media_id, 40) || null,
    javoblar, dm, b.dm_ai === true];
  const r = b.id
    ? await qator(`update ig_qoidalar set nom=$1, faol=$2, tartib=$3, kalitlar=$4, aniq=$5, media_id=$6, javoblar=$7, dm_matn=$8, dm_ai=$9
        where id = $10 returning *`, [...qiymat, Number(b.id)])
    : await qator(`insert into ig_qoidalar (nom, faol, tartib, kalitlar, aniq, media_id, javoblar, dm_matn, dm_ai)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`, qiymat);
  return r ? { qoida: r } : { xato: 'Qoida topilmadi.' };
}

export async function qoidaOchir(id) {
  const r = await qator(`delete from ig_qoidalar where id = $1 returning id`, [Number(id)]);
  return { ochirildi: Boolean(r) };
}

/** Oxirgi postlar va ularning kommentlari (webhookdan oldingilari ham ko'rinsin). */
export async function sinxron({ postSoni = 6 } = {}) {
  const p = await api.postlar(postSoni);
  let yangi = 0;
  const bizniki = String((await api.ulanish()).akkaunt_id || '');
  for (const m of p.data || []) {
    const k = await api.postKommentlari(m.id, 50).catch(() => ({ data: [] }));
    for (const c of k.data || []) {
      if (String(c.from?.id || '') === bizniki) continue;
      const r = await qator(`insert into ig_kommentlar (id, media_id, parent_id, matn, username, from_id, yashirildi, created_at)
          values ($1,$2,$3,$4,$5,$6,$7,coalesce($8::timestamptz, now())) on conflict (id) do nothing returning id`,
        [c.id, m.id, c.parent_id || null, c.text || '', c.username || c.from?.username || null, c.from?.id || null,
         c.hidden === true, c.timestamp || null]);
      if (r) yangi += 1;
    }
  }
  return { postlar: (p.data || []).map((m) => ({ id: m.id, caption: (m.caption || '').slice(0, 120), rasm: m.thumbnail_url || m.media_url,
    havola: m.permalink, komment: m.comments_count, layk: m.like_count, vaqt: m.timestamp })), yangi_komment: yangi };
}

// ─────────────────────────── ESLATMA ───────────────────────────

/**
 * Tahlil olib, Telegramdagi tavsiyani ochmagan odamga BITTA yumshoq eslatma.
 * Faqat 24 soatlik oyna ichida (Instagram qoidasi) va oxirgi xabar bizniki
 * bo'lsa — mijoz yozib turgan suhbatga aralashmaydi. Har 10 daqiqada.
 */
export async function eslatmalarniYubor() {
  const st = await igSozlamalari();
  if (!st.eslatma || !st.ai_yoqiq || !(await api.ulanganmi())) return { yuborildi: 0 };
  const r = await qatorlar(`select s.* from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token
     where o.olindi_id is null and s.eslatma_at is null and s.ai_yoqiq and not s.admin_kerak
       and (s.ai_pauza_gacha is null or s.ai_pauza_gacha < now())
       and s.oxirgi_kiruvchi > now() - interval '22 hours'
       and s.oxirgi_at < now() - ($1 || ' hours')::interval
       and (select x.yonalish from ig_xabarlar x where x.suhbat_id = s.id and x.xato is null
             order by x.created_at desc, x.id desc limit 1) = 'chiquvchi'
     order by s.oxirgi_at limit 20`, [String(Math.max(1, son(st.eslatma_soat, 3)))]);
  const { insonlashtir, uslubUrugi } = await import('../../ai/instagram-suhbat.js');
  let yuborildi = 0;
  for (const s of r) {
    await sorov(`update ig_suhbatlar set eslatma_at = now() where id = $1`, [s.id]);
    const tg = await botHavolasi(`n_${s.tahlil_token}`);
    const V = [
      `natijani ochib ko'rdingizmi?\n\ntushunmagan joyi bo'lsa yozing, tushuntirib beraman`,
      `tahlilingizni ko'rib chiqdingizmi\n\nhavolasi shu yerda edi\n${tg}`,
      `qalay, natija bo'yicha savol bormi?\n\nqaysi biridan boshlashni aytib beraman`,
    ];
    const m = V[(uslubUrugi(s.igsid) + new Date().getDate()) % V.length];
    try { await odamdekYubor(s, insonlashtir(m, uslubUrugi(s.igsid)), 'eslatma', { st }); yuborildi++; }
    catch { /* oyna yopilgan bo'lishi mumkin — xato ig_xabarlar da ko'rinadi */ }
  }
  return { yuborildi };
}

// ─────────────────────────── HISOBOT ───────────────────────────

/** Instagram hisoboti: kunlik grafik, voronka, javob tezligi, niyatlar, soatlar. */
export async function igStatistika({ kun = 30 } = {}) {
  const k = Math.max(1, Math.min(180, son(kun, 30)));
  const [kunlik, voronka, tezlik, niyatlar, soatlar, komment, qoidalarTop] = await Promise.all([
    qatorlar(`with d as (select generate_series((now() at time zone 'Asia/Tashkent')::date - ($1::int - 1),
                (now() at time zone 'Asia/Tashkent')::date, interval '1 day')::date as kun)
      select to_char(d.kun, 'DD.MM') as kun,
        (select count(*) from ig_xabarlar x where x.yonalish = 'kiruvchi' and (x.created_at at time zone 'Asia/Tashkent')::date = d.kun)::int as kiruvchi,
        (select count(*) from ig_xabarlar x where x.kim = 'ai' and x.xato is null and x.matn is not null
           and (x.created_at at time zone 'Asia/Tashkent')::date = d.kun)::int as ai,
        (select count(*) from ig_xabarlar x where x.kim = 'tahlil' and x.rasm_url is not null
           and (x.created_at at time zone 'Asia/Tashkent')::date = d.kun)::int as tahlil
      from d order by d.kun`, [k]),
    qator(`select
        (select count(distinct x.suhbat_id) from ig_xabarlar x where x.yonalish = 'kiruvchi' and x.created_at > now() - ($1 || ' days')::interval)::int as yozdi,
        (select count(*) from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token where o.created_at > now() - ($1 || ' days')::interval)::int as tahlil,
        (select count(*) from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token
           where o.olindi_id is not null and o.created_at > now() - ($1 || ' days')::interval)::int as telegram,
        (select count(distinct o.olindi_id) from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token
           join orders r on r.user_id = o.olindi_id and r.status <> 'bekor' and r.created_at >= o.olindi_at
           where o.created_at > now() - ($1 || ' days')::interval)::int as buyurtma,
        (select coalesce(sum(r.total), 0) from ig_suhbatlar s join ochiq_skan o on o.token = s.tahlil_token
           join orders r on r.user_id = o.olindi_id and r.status <> 'bekor' and r.created_at >= o.olindi_at
           where o.created_at > now() - ($1 || ' days')::interval)::bigint as tushum`, [String(k)]),
    qator(`select
        (percentile_cont(0.5) within group (order by javob_ms) filter (where kim = 'ai'))::int as ai_ms,
        (percentile_cont(0.5) within group (order by javob_ms) filter (where kim = 'admin'))::int as admin_ms,
        count(*) filter (where kim = 'ai')::int as ai_soni, count(*) filter (where kim = 'admin')::int as admin_soni
      from ig_xabarlar where javob_ms is not null and created_at > now() - ($1 || ' days')::interval`, [String(k)]),
    qatorlar(`select niyat, count(*)::int as soni from ig_xabarlar where niyat is not null
        and created_at > now() - ($1 || ' days')::interval group by niyat order by soni desc`, [String(k)]),
    qatorlar(`select extract(hour from created_at at time zone 'Asia/Tashkent')::int as soat, count(*)::int as soni
        from ig_xabarlar where yonalish = 'kiruvchi' and created_at > now() - ($1 || ' days')::interval group by 1 order by 1`, [String(k)]),
    qator(`select count(*)::int as jami, count(*) filter (where qoida_id is not null)::int as qoida,
        count(*) filter (where dm_yuborildi)::int as dm, count(*) filter (where spam)::int as spam,
        count(*) filter (where ai)::int as ai
        from ig_kommentlar where created_at > now() - ($1 || ' days')::interval`, [String(k)]),
    qatorlar(`select nom, ishladi from ig_qoidalar where ishladi > 0 order by ishladi desc limit 6`),
  ]);
  const soat24 = Array.from({ length: 24 }, (_, i) => soatlar.find((x) => x.soat === i)?.soni || 0);
  return { kun: k, kunlik, voronka: { ...voronka, tushum: Number(voronka?.tushum || 0) }, tezlik, niyatlar, soatlar: soat24, komment, qoidalar: qoidalarTop };
}

/**
 * Javobsiz qolgan kommentlarga (masalan «Postlardan yangilash» bilan
 * kelgan eski kommentlar) AI bir yo'la javob yozadi. Ko'pi bilan 30 ta,
 * oxirgi `kun` kun ichidagilar; spam va o'zimizniki o'tkaziladi.
 */
export async function javobsizlargaAi({ kun = 7, chegara = 30 } = {}) {
  const st = await igSozlamalari();
  const akk = (await api.ulanish()).akkaunt_id || '';
  const r = await qatorlar(`select * from ig_kommentlar where javob is null and not dm_yuborildi and not spam and not yashirildi
      and coalesce(from_id, '') <> $1 and created_at > now() - ($2 || ' days')::interval order by created_at desc limit $3`,
    [akk, String(Math.max(1, Math.min(30, son(kun, 7)))), Math.max(1, Math.min(30, son(chegara, 30)))]);
  let javob = 0, dm = 0, otkazildi = 0;
  const xatolar = [];
  for (const k of r) {
    const n = await kommentgaAi(k, st, { majburiy: true });
    if (n.javob) javob++;
    if (n.dm) dm++;
    if (!n.javob && !n.dm) otkazildi++;
    if (n.xato || n.xatolar?.length) xatolar.push(n.xato || n.xatolar.join(' · '));
  }
  return { korildi: r.length, javob, dm, otkazildi, xatolar: xatolar.slice(0, 5) };
}
