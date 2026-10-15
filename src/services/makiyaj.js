// MAKIYAJ — «Mening rangim» xizmati (hammaga; erkaklarga — o'z tartibi).
//
// Rasm → AI rang tahlili (src/ai/makiyaj.js) + yonoqdan o'lchangan teri rangi
// (src/rasm/teri-rangi.js) → katalogdan har bosqichga mos mahsulot
// (src/lib/makiyaj.js qoidalari) → bazaga. Ilova ham, bot ham shu yerdan.
import { qator, qatorlar, sorov, sozlama } from '../db.js';
import { rangniTahlilQil } from '../ai/makiyaj.js';
import { teriRangi } from '../rasm/teri-rangi.js';
import { makiyajSvg } from '../rasm/makiyaj-kartochka.js';
import { svgdanPng } from '../rasm/chiz.js';
import { brendNomi } from '../lib/brend.js';
import {
  MAKIYAJ_BOSQICHLAR, RANG_TIPLARI, TUSLAR, CHUQURLIK, makiyajmi, makiyajKorinadimi,
  tonlarniSarala, rangBoyichaSarala, chuqurlikRaqami, bosqichlarJins, erkaklarUchunmi, ERKAK_FAQAT_OZI,
  makiyajBosqichi, MAKIYAJ_HOLATLARI, MAKIYAJ_HOLAT_STANDART,
} from '../lib/makiyaj.js';
import { adminmi } from '../lib/admin.js';

// Asosiy chegara — teri tahlili bilan UMUMIY kunlik limit (skaner_limiti).
// Bu — admin limitni o'chirib qo'ysa ham AI xarajati cheksiz bo'lmasin.
const KUNLIK = 20;

/** Admin panelda tanlangan umumiy holat: yopiq | admin | ochiq. */
export async function makiyajHolati() {
  const h = await sozlama('makiyaj_holat', MAKIYAJ_HOLAT_STANDART).catch(() => MAKIYAJ_HOLAT_STANDART);
  return MAKIYAJ_HOLATLARI.includes(h) ? h : MAKIYAJ_HOLAT_STANDART;
}

/** Shu odamga makiyaj bo'limi ko'rinadimi (umumiy holat + odamning o'z tanlovi). */
export async function makiyajRuxsat(user) {
  if (!user) return false;
  return makiyajKorinadimi(user, await makiyajHolati(), adminmi(user));
}

/** Odamning jinsi: profil → oxirgi teri tahlili. Noma'lum bo'lsa null. */
async function jinsi(user) {
  if (user?.gender === 'ayol' || user?.gender === 'erkak') return user.gender;
  const a = await qator(`select jins from analyses where user_id = $1 and jins in ('ayol','erkak')
    order by created_at desc limit 1`, [user.id]).catch(() => null);
  return a?.jins || null;
}

const TON_HARF = { iliq: 'W', sovuq: 'C', neytral: 'N', zaytun: 'N' };

/** Katalogdagi makiyaj mahsulotlaridan har bosqichga eng mosi. */
export function mahsulotTanla(profil, katalog) {
  const erkak = profil.jins === 'erkak';
  // Ayolga erkaklar mahsuloti tavsiya qilinmaydi; erkakka — avval o'zinikilar
  // Bosqich — mahsulotniki yoki (Makiyaj toifasida, bosqichi tanlanmagan) nomidan
  const bor = katalog.filter((p) => makiyajmi(p) && (erkak || !erkaklarUchunmi(p)))
    .map((p) => ({ ...p, step: makiyajBosqichi(p) })).filter((p) => p.step);
  const omborda = bor.filter((p) => p.stock > 0);
  const manba = omborda.length ? omborda : bor;
  const bosqichda = (k) => {
    const r = manba.filter((p) => p.step === k);
    if (!erkak) return r;
    const ozi = r.filter(erkaklarUchunmi);
    return ozi.length ? ozi : ERKAK_FAQAT_OZI.has(k) ? [] : r;
  };
  const tip = RANG_TIPLARI[profil.rang_tipi] || RANG_TIPLARI.yoz;
  const tavsiya = [];
  for (const b of MAKIYAJ_BOSQICHLAR) {
    const r = bosqichda(b.kalit);
    if (!r.length) continue;
    let tanlangan = [];
    if (b.kalit === 'ton') tanlangan = tonlarniSarala(profil, r).slice(0, 2);
    else if (b.kalit === 'konsiler') tanlangan = tonlarniSarala(profil, r, 1).slice(0, 1);
    else if (!erkak && (b.kalit === 'lab' || b.kalit === 'rumyana' || b.kalit === 'kozlar')) tanlangan = rangBoyichaSarala(tip[b.kalit], r).slice(0, 1);
    else tanlangan = [...r].sort((x, y) => (y.sold_count || 0) - (x.sold_count || 0)).slice(0, 1);
    tanlangan.forEach((p, i) => tavsiya.push({
      bosqich: b.kalit, product_id: p.id, muqobil: i > 0,
      moslik: Number.isFinite(p.moslik) ? p.moslik : null,
    }));
  }
  return tavsiya;
}

/** Bazadagi yozuvni ilova/bot uchun bir xil ko'rinishga keltiradi. */
function korinish(r) {
  if (!r) return null;
  const n = r.natija || {};
  const erkak = n.jins === 'erkak';
  return {
    jins: n.jins || null, erkak,
    id: r.id, created_at: r.created_at,
    tus: r.tus, tus_nom: TUSLAR[r.tus] || r.tus,
    chuqurlik: r.chuqurlik, chuqurlik_nom: CHUQURLIK[r.chuqurlik] || '',
    ton_kodi: `${chuqurlikRaqami(r.chuqurlik)}${TON_HARF[r.tus] || ''}`,
    rang_tipi: r.rang_tipi, rang_tipi_nom: RANG_TIPLARI[r.rang_tipi]?.nom || r.rang_tipi,
    palitra: RANG_TIPLARI[r.rang_tipi] || null,
    yuz_shakli: r.yuz_shakli, kozlar: r.kozlar, teri_hex: r.teri_hex,
    yuz_rasm_id: r.yuz_rasm_id || null,
    yoruglik: n.yoruglik || 'kunduzgi', kontrast: n.kontrast, lab: n.lab,
    izoh: n.izoh || '', maslahat: n.maslahat || {}, tavsiya: n.tavsiya || [],
    bosqichlar: bosqichlarJins(n.jins),
  };
}

/** Tavsiya joriy katalogdan QAYTA tanlanadi: rang aniqlangandan keyin
 *  qo'shilgan mahsulot ham darhol chiqadi, sotuvdan olingani — yo'qoladi. */
async function yangiTavsiya(r, katalog) {
  if (!r) return r;
  const k = katalog || await (await import('./analysis.js')).faolMahsulotlar();
  const tavsiya = mahsulotTanla({ tus: r.tus, chuqurlik: r.chuqurlik, rang_tipi: r.rang_tipi,
    teri_hex: r.teri_hex, jins: r.jins }, k);
  return { ...r, tavsiya };
}

export const oxirgiRangim = async (userId) => yangiTavsiya(korinish(await qator(
  'select * from makiyaj_profillar where user_id = $1 order by created_at desc limit 1', [userId]).catch(() => null)));

/** Odamning suratini saqlaydi (teri tahlilidagi qoida bilan). */
async function suratniSaqla(profilId, base64, mime) {
  if (!/^image\/(jpe?g|png)$/i.test(String(mime || ''))) return null;
  if (!(await sozlama('yuz_rasm_saqlansin', true))) return null;
  try {
    const bayt = Buffer.from(base64, 'base64');
    if (bayt.length > 3 * 1024 * 1024) return null;
    const m = await qator(`insert into media (tur, mime, bayt, hajm, goya)
      values ('yuz', $1, $2, $3, $4) returning id`, [mime, bayt, bayt.length, `Makiyaj #${profilId}`]);
    await sorov('update makiyaj_profillar set yuz_rasm_id = $1 where id = $2', [m.id, profilId]);
    return m.id;
  } catch (e) {
    console.error('MAKIYAJ SURATI SAQLANMADI:', e.message);
    return null;
  }
}

/**
 * @returns {Promise<{yaroqli:boolean, sabab?, izoh?, rangim?, mahsulotlar?}>}
 * @throws Error('LIMIT_TUGADI') umumiy kunlik limit tugasa (e.limit bilan),
 *         Error('MAKIYAJ_LIMIT') xavfsizlik chegarasi tugasa
 */
export async function rangimniTahlilQil(user, base64, mime) {
  const { limitHolati } = await import('./analysis.js');
  const limit = await limitHolati(user.id);
  if (limit.tugadi) throw Object.assign(new Error('LIMIT_TUGADI'), { limit });
  const bugun = await qator(`select count(*)::int as n from makiyaj_profillar
    where user_id = $1 and created_at > now() - interval '24 hours'`, [user.id]);
  if ((bugun?.n || 0) >= KUNLIK) throw new Error('MAKIYAJ_LIMIT');

  const jins = await jinsi(user);
  const t = await rangniTahlilQil(base64, mime, { jins });
  if (!t.yaroqli) return { yaroqli: false, sabab: t.sabab, izoh: t.izoh };
  const a = t.natija;
  const teri_hex = await teriRangi(base64, mime, a.yuz_quti);

  const { faolMahsulotlar } = await import('./analysis.js');
  const katalog = await faolMahsulotlar();
  const profil = { tus: a.tus, chuqurlik: a.chuqurlik, rang_tipi: a.rang_tipi, teri_hex, jins };
  const tavsiya = mahsulotTanla(profil, katalog);

  const r = await qator(
    `insert into makiyaj_profillar (user_id, tus, chuqurlik, rang_tipi, yuz_shakli, kozlar, teri_hex, natija)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [user.id, a.tus, a.chuqurlik, a.rang_tipi, a.yuz_shakli, a.kozlar, teri_hex,
     JSON.stringify({ jins, yoruglik: a.yoruglik, tus_ishonch: a.tus_ishonch, kontrast: a.kontrast, lab: a.lab,
       izoh: a.izoh, maslahat: a.maslahat, tavsiya })]);
  r.yuz_rasm_id = await suratniSaqla(r.id, base64, mime);
  const idlar = new Set(tavsiya.map((x) => x.product_id));
  return { yaroqli: true, rangim: korinish(r), mahsulotlar: katalog.filter((p) => idlar.has(p.id)) };
}

/**
 * Natija kartochkasi (PNG) — botga yuboriladi. Chizib bo'lmasa null:
 * unda bot matn bilan javob beradi.
 */
export async function rangimKartochkasi({ rangim, mahsulotlar = [], rasmBase64 = null, mime = 'image/jpeg' }) {
  try {
    const kerak = mahsulotlar.filter((p) => (rangim.tavsiya || []).some((t) => t.product_id === p.id && !t.muqobil));
    const posterlar = kerak.map((p) => p.poster_id).filter(Boolean);
    const rasmlar = posterlar.length ? await qatorlar(
      'select id, mime, bayt from media where id = any($1::uuid[])', [posterlar]) : [];
    const rk = new Map(rasmlar.map((m) => [String(m.id), m]));
    const karta = new Map(kerak.map((p) => {
      const m = p.poster_id ? rk.get(String(p.poster_id)) : null;
      const ochiladi = m?.bayt && /^image\/(png|jpe?g)$/i.test(m.mime || '');
      return [p.id, {
        nom: `${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}${p.variant_nom ? ' — ' + p.variant_nom : ''}`,
        rang_hex: p.rang_hex, rasmBase64: ochiladi ? Buffer.from(m.bayt).toString('base64') : null, rasmMime: m?.mime,
      }];
    }));
    const surat = rasmBase64 && /^image\/(jpe?g|png)$/i.test(mime) ? rasmBase64 : null;
    const svg = makiyajSvg({ rangim, mahsulotlar: karta, rasmBase64: surat, mime, brend: await brendNomi() });
    return await svgdanPng(svg, 1080);
  } catch (e) {
    console.error('MAKIYAJ RASMI CHIZILMADI:', e.message);
    return null;
  }
}

/** Bot uchun qisqa matn (HTML). */
export function rangimMatni(r, nomlar = new Map(), { qisqa = false } = {}) {
  const p = r.palitra || {};
  const q = (k) => r.maslahat?.[k] ? `\n• ${r.maslahat[k]}` : '';
  const ton = r.tavsiya.find((x) => x.bosqich === 'ton' && !x.muqobil);
  return [
    `💄 <b>Sizning rangingiz</b>`, ``,
    `${p.emoji || '🎨'} Rang tipi: <b>${r.rang_tipi_nom}</b>`,
    `🌡 Teri osti tusi: <b>${r.tus_nom}</b> · ${r.chuqurlik_nom}`,
    `🧴 Sizga mos ${r.erkak ? 'BB krem' : 'kushon'} toni: <b>${r.ton_kodi}</b> atrofida`,
    ton && nomlar.get(ton.product_id) ? `   ✓ Katalogdan: ${nomlar.get(ton.product_id)}` : '',
    p.izoh ? `\n<i>${p.izoh}</i>` : '',
    qisqa ? '' : `\n<b>Maslahat:</b>${q('ton')}${r.erkak ? q('qosh') : q('rumyana')}${q('lab')}`,
    r.yoruglik !== 'kunduzgi' ? `\n⚠️ <i>Rasm xona chirog'ida olingan — ranglar biroz farq qilishi mumkin. Aniqroq natija uchun deraza yonida qayta oling.</i>` : '',
  ].filter((x) => x !== '').join('\n');
}

/** Profil sozlamasi: true / false / null (avtomatik). */
export async function makiyajSozla(userId, qiymat) {
  const v = qiymat === true || qiymat === false ? qiymat : null;
  await sorov('update users set makiyaj = $1 where id = $2', [v, userId]);
  return v;
}

export const makiyajTarixi = (userId) => qatorlar(
  'select id, rang_tipi, tus, chuqurlik, created_at from makiyaj_profillar where user_id = $1 order by created_at desc limit 10', [userId]);
