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
import { qator, qatorlar, sorov, sozlama, sozlamalarniUnut } from '../../db.js';
import { config } from '../../config.js';
import * as api from './api.js';

const SOZLAMA_KALIT = 'instagram';
export const STANDART = {
  ai_yoqiq: true,              // Direct ga AI javob beradi
  korsatma: '',                // AI ga do'kon egasining ko'rsatmasi (bo'sh — standart)
  yuz_tahlil: true,            // yuz rasmi kelsa — tahlil va natija
  xira: false,                 // true — natijaning muhim qismi xira (eski «teaser» rejim)
  komment_qoidalar: true,      // kommentlarga qoidalar ishlaydi
  komment_mention: true,       // ochiq javob @username bilan boshlansin
  kechikish_soniya: 4,         // mijoz ketma-ket yozsa — oxirgisidan keyin javob
  qolda_pauza_daqiqa: 60,      // admin yozsa AI shuncha jim
  tahlil_matni: '',            // tahlildan keyingi xabar (bo'sh — standart)
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

/** X-Hub-Signature-256 — Meta xabarni imzolaydi (ilova sirini bilmagan soxta so'rov o'tmaydi). */
export function imzoTogri(xom, sarlavha) {
  if (!config.instagramSecret) return true;              // sir berilmagan — tekshirib bo'lmaydi (panelda ogohlantiriladi)
  const kutilgan = 'sha256=' + crypto.createHmac('sha256', config.instagramSecret).update(xom).digest('hex');
  const a = Buffer.from(String(sarlavha || '')), b = Buffer.from(kutilgan);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─────────────────────────── WEBHOOK ───────────────────────────

export async function webhookKeldi(body) {
  if (body?.object !== 'instagram') return;
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

async function xabarYoz(suhbatId, { yonalish, kim, matn: m = null, rasm = null, mid = null, xato = null }) {
  const r = await qator(
    `insert into ig_xabarlar (suhbat_id, yonalish, kim, matn, rasm_url, mid, xato) values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (mid) do nothing returning *`, [suhbatId, yonalish, kim, m, rasm, mid, xato]);
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
    if (!igsid || await qator(`select 1 from ig_xabarlar where mid = $1`, [msg.mid])) return;
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
  const s = await suhbatOl(igsid);
  const rasmlar = (msg.attachments || []).filter((a) => a.type === 'image' && a.payload?.url).map((a) => a.payload.url);
  const yangi = await xabarYoz(s.id, { yonalish: 'kiruvchi', kim: 'mijoz', matn: msg.text || null, mid: msg.mid,
    rasm: rasmlar[0] || (msg.attachments?.[0]?.payload?.url ?? null) });
  if (!yangi) return;                                     // takroriy webhook

  const st = await igSozlamalari();
  if (rasmlar.length && st.yuz_tahlil) return rasmniTahlilQil(s.id, rasmlar[0]);
  if (msg.text || msg.attachments?.length) return javobniRejalashtir(s.id);
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
export async function aiJavobYoz(suhbatId, { majburiy = false } = {}) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [suhbatId]);
  if (!s) return null;
  const st = await igSozlamalari();
  if (!majburiy) {
    if (!st.ai_yoqiq || !s.ai_yoqiq) return null;
    if (s.ai_pauza_gacha && new Date(s.ai_pauza_gacha) > new Date()) return null;
  }
  const { faolMahsulotlar } = await import('../analysis.js');
  const { igJavob } = await import('../../ai/instagram-suhbat.js');
  const katalog = await faolMahsulotlar();
  const t = s.tahlil_token ? await tahlilMalumoti(s.tahlil_token, katalog).catch(() => null) : null;
  api.yozmoqda(s.igsid);
  let r;
  try {
    r = await igJavob({
      tarix: await tarixi(s.id), korsatma: st.korsatma, mahsulotlar: katalog,
      malumot: { ism: s.ism || s.username || '', tg_havola: await botHavolasi('h_ig-direct'),
        ...(await dokonHavolalari()),
        tahlil: t ? tahlilMatni(t) : '', tahlil_soz: t ? t.tahlil.muammolar.map((m) => m.nom).join(' ') : '',
        tahlil_havola: t ? await botHavolasi(`n_${s.tahlil_token}`) : '' },
    });
  } catch (e) {
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'ai', matn: null, xato: `AI javob bermadi: ${e.message}`.slice(0, 300) });
    return null;
  }
  if (!r.javob) return null;
  // Odamdek: uzun javob biroz «yoziladi» (sinovda — darhol)
  const pauza = globalThis.IG_KECHIKISH_MS === 0 ? 0 : Math.min(4000, 600 + r.javob.length * 25);
  if (pauza) await new Promise((ok) => setTimeout(ok, pauza));
  await yuborVaYoz(s, r.javob, 'ai');
  if (r.admin_kerak && !s.admin_kerak) {
    await sorov(`update ig_suhbatlar set admin_kerak = true where id = $1`, [s.id]);
    await adminlargaXabar(`📸 <b>Instagram</b>: ${s.username ? '@' + s.username : 'mijoz'} bilan suhbatga menejer kerak.\n`
      + `Oxirgi xabar: «${(await tarixi(s.id)).filter((x) => x.kim === 'mijoz').pop()?.matn?.slice(0, 200) || '-'}»\n`
      + `Admin panel → Instagram → Direct`).catch(() => {});
  }
  return r;
}

async function yuborVaYoz(s, m, kim) {
  try {
    const j = await api.matnYubor(s.igsid, m);
    return xabarYoz(s.id, { yonalish: 'chiquvchi', kim, matn: m, mid: j.message_id || null });
  } catch (e) {
    await xabarYoz(s.id, { yonalish: 'chiquvchi', kim, matn: m, xato: e.message.slice(0, 300) });
    throw e;
  }
}

async function adminlargaXabar(html) {
  const { yubor } = await import('../../bot/tg.js');
  const idlar = new Set(config.adminTelegramIds || []);
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  for (const id of idlar) await yubor(id, html).catch(() => {});
}

// ─────────────────── YUZ RASMI → NATIJA VA TAVSIYA ───────────────────

const RAD_MATN = {
  xira: 'Rasm biroz xira chiqibdi 🙏 Yorug‘ joyda, kamerani yuzingizga to‘g‘ri tutib yana bitta yuboring.',
  qorongi: 'Rasm qorong‘iroq chiqibdi — deraza yonida, kunduzgi yorug‘likda yana bitta yuboring 🙏',
  uzoq: 'Yuzingiz uzoqda qolibdi — yaqinroqdan, yuz kadrni to‘ldirib tursin.',
  yopiq: 'Yuzingiz biroz yopiq qolibdi (soch/ko‘zoynak) — ochiq holda yana bitta yuboring 🙏',
  bir_nechta: 'Rasmda bir nechta odam bor — faqat o‘zingiz tushgan rasmni yuboring.',
  pardoz: 'Pardoz teri holatini yashirib qo‘yadi — iloji bo‘lsa pardozsiz rasm yuboring, aniqroq chiqadi.',
  sunday: 'Bu rasm filtr yoki AI bilan ishlanganga o‘xshaydi — oddiy kamera bilan olingan rasm yuboring.',
};

export async function rasmniTahlilQil(suhbatId, url) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [suhbatId]);
  const st = await igSozlamalari();
  if (!s) return null;
  const pauzada = !st.ai_yoqiq || !s.ai_yoqiq || (s.ai_pauza_gacha && new Date(s.ai_pauza_gacha) > new Date());
  if (pauzada) return null;                               // admin suhbatni o'zi olib boryapti
  const kutMatn = ['Oldim, hozir ko‘rib chiqaman — yarim daqiqacha kuting.',
    'Rasm keldi, teringizni tahlil qilyapman. Bir daqiqa.',
    'Ko‘ryapman, 30 soniyacha vaqt bering.'][Math.floor(Math.random() * 3)];
  await yuborVaYoz(s, kutMatn, 'tahlil').catch(() => {});
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
    await yuborVaYoz(s, 'Rasm ochilmadi 😔 Iltimos, yana bir marta yuboring.', 'tahlil').catch(() => {});
    return { xato: e.message };
  }

  const { ochiqSkan } = await import('../ochiq-skan.js');
  let n;
  try {
    n = await ochiqSkan({ base64, mime, ip: `ig:${s.igsid}`, manba: 'ig-direct' });
  } catch (e) {
    const m = e.message === 'CHEGARA'
      ? 'Bugun bepul tahlil limitingiz tugadi 🙏 Ertaga yana yuboring yoki Telegramda davom eting: ' + await botHavolasi('h_ig-direct')
      : 'Hozir tahlil qila olmadim — bir necha daqiqadan keyin rasmni qayta yuboring 🙏';
    await yuborVaYoz(s, m, 'tahlil').catch(() => {});
    return { xato: e.message };
  }
  if (!n.yaroqli) {
    // Yuz emas (mahsulot rasmi, skrinshot) — oddiy suhbat: AI rasm haqida so'raydi
    if (['yuz_yoq', 'yuz_emas', 'ekran'].includes(n.sabab)) return aiJavobYoz(s.id);
    await yuborVaYoz(s, RAD_MATN[n.sabab] || 'Rasm tahlilga yaramadi — yorug‘ joyda, yuzingiz to‘liq ko‘rinadigan rasm yuboring 🙏', 'tahlil').catch(() => {});
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

  // 2) «Mana shular sizga kerak» + Telegramda tavsiyani ochadigan havola
  const o = n.ochiq || {};
  let tayyor;
  if (st.tahlil_matni) {
    const nomlar = (t?.tavsiya || []).slice(0, 4).map((p) => `${p.brend ? p.brend + ' ' : ''}${p.nom} — ${p.narx.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`).join('\n');
    tayyor = st.tahlil_matni.replaceAll('{ball}', String(o.ball ?? '')).replaceAll('{havola}', tg)
      .replaceAll('{soni}', String(n.yopiq?.muammo_soni ?? '')).replaceAll('{tavsif}', o.tavsif || '')
      .replaceAll('{mahsulotlar}', nomlar);
  } else {
    const { tahlilXabari } = await import('../../ai/instagram-suhbat.js');
    tayyor = await tahlilXabari({
      tahlil: t?.tahlil || { ball: o.ball, tavsif: o.tavsif, teri_turi: o.teri_turi, muammolar: [] },
      tavsiya: t?.tavsiya || [], havola: tg, ism: s.ism || '', korsatma: st.korsatma,
    });
  }
  api.yozmoqda(s.igsid);
  await yuborVaYoz(s, tayyor, 'tahlil').catch(() => {});
  return { yaroqli: true, token: n.token };
}

// ─────────────────────────── KOMMENTLAR ───────────────────────────

const normal = (t) => String(t || '').toLowerCase().replace(/[‘’'`ʻ]/g, '').replace(/\s+/g, ' ').trim();

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
  if (!st.komment_qoidalar) return;
  const q = qoidaTop(await qatorlar(`select * from ig_qoidalar order by tartib, id`), v.text, v.media?.id);
  if (q) await qoidaniBajar(yangi, q, st);
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
    try {
      const j = await api.kommentgaDm(k.id, dmMatn);
      dm = true;
      // Direct suhbati ochiladi — mijoz javob yozsa AI davom ettiradi
      if (j.recipient_id) {
        const s = await suhbatOl(String(j.recipient_id));
        if (k.username) await sorov(`update ig_suhbatlar set username = coalesce(username, $2) where id = $1`, [s.id, k.username]);
        await xabarYoz(s.id, { yonalish: 'chiquvchi', kim: 'qoida', matn: dmMatn, mid: j.message_id || null });
      }
    } catch (e) { xatolar.push(`Direct: ${e.message}`); }
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
    imzo_sir: Boolean(config.instagramSecret),
    webhook_url: `${config.saytUrl}/instagram/webhook`, verify_token: await verifyToken(),
    sozlamalar: st, bugun: { ...bugun, telegramga_otdi: tg?.soni ?? 0 },
    standart_korsatma: (await import('../../ai/instagram-suhbat.js')).STANDART_KORSATMA,
  };
}

export async function suhbatlar({ q = '', filtr = '', chegara = 60 } = {}) {
  const p = [];
  const shart = ['1=1'];
  if (q) { p.push(`%${matn(q, 60)}%`); shart.push(`(username ilike $${p.length} or ism ilike $${p.length} or oxirgi_matn ilike $${p.length})`); }
  if (filtr === 'oqilmagan') shart.push('oqilmagan > 0');
  if (filtr === 'admin') shart.push('admin_kerak');
  if (filtr === 'tahlil') shart.push('tahlil_token is not null');
  p.push(Math.min(200, son(chegara, 60)));
  return qatorlar(`select id, igsid, username, ism, rasm_url, ai_yoqiq, ai_pauza_gacha, admin_kerak, oqilmagan,
      oxirgi_matn, oxirgi_at, oxirgi_kiruvchi, tahlil_token is not null as tahlil
      from ig_suhbatlar where ${shart.join(' and ')} order by oxirgi_at desc limit $${p.length}`, p);
}

export async function suhbatXabarlari(id, { oqildi = true } = {}) {
  const s = await qator(`select * from ig_suhbatlar where id = $1`, [Number(id)]);
  if (!s) return null;
  if (oqildi && s.oqilmagan) await sorov(`update ig_suhbatlar set oqilmagan = 0 where id = $1`, [s.id]);
  const xabarlar = await qatorlar(`select id, yonalish, kim, matn, rasm_url, xato, created_at from ig_xabarlar
      where suhbat_id = $1 order by created_at, id`, [s.id]);
  const tg = s.tahlil_token ? await qator(`select olindi_id is not null as olindi from ochiq_skan where token = $1`, [s.tahlil_token]) : null;
  return {
    suhbat: { ...s, oyna_ochiq: s.oxirgi_kiruvchi && Date.now() - new Date(s.oxirgi_kiruvchi) < 24 * 3600e3,
      telegramga_otdi: Boolean(tg?.olindi) },
    xabarlar,
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

export async function suhbatOzgartir(id, { ai_yoqiq, admin_kerak, pauza_olib } = {}) {
  const r = await qator(`update ig_suhbatlar set ai_yoqiq = coalesce($2, ai_yoqiq), admin_kerak = coalesce($3, admin_kerak),
      ai_pauza_gacha = case when $4 then null else ai_pauza_gacha end where id = $1 returning *`,
    [Number(id), typeof ai_yoqiq === 'boolean' ? ai_yoqiq : null, typeof admin_kerak === 'boolean' ? admin_kerak : null, pauza_olib === true]);
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
