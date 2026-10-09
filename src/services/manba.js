// MIJOZ QAYERDAN KELDI — Instagram, TikTok, Telegram…
//
// Uch qatlam:
//   1. QISQA HAVOLA — www.kiovo.shop/h/<kod>. Har reklama joyiga o'z
//      havolasi (Instagram bio, TikTok bio, bitta video). Bosilganda
//      bosish yoziladi, brauzerga belgi (cookie) qo'yiladi va odam
//      kerakli sahifaga (skaner, sayt, ilova, bot) o'tadi.
//   2. AVTOMATIK — havolasiz kelganlar ham: Instagram va TikTok o'z
//      ichki brauzerida sayt ochganda User-Agent da o'zini aytadi
//      («Instagram 312.0…», «musical_ly», «BytedanceWebview»).
//   3. BOG'LASH — odam ro'yxatdan o'tganda (bot, ilova, Google, telefon)
//      foydalanuvchiga BIRINCHI manbasi yoziladi. Shundan keyin
//      «nechta keldi» bilan birga «nechtasi tahlil qildi, sotib oldi,
//      qancha pul keltirdi» ham hisoblanadi.
//
// Manba faqat YANGI foydalanuvchiga yoziladi (7 kun ichida ochilgan
// hisob): bir yildan beri xarid qilayotgan mijoz Instagramdagi
// havolani bosgani uchun «Instagramdan kelgan» bo'lib qolmaydi.
import crypto from 'node:crypto';
import { qator, qatorlar, sorov } from '../db.js';
import { cookieOl } from '../lib/http.js';

export const MANBALAR = {
  taklif: 'Taklif (odam orqali)',
  instagram: 'Instagram', tiktok: 'TikTok', telegram: 'Telegram', youtube: 'YouTube',
  facebook: 'Facebook', google: 'Google', boshqa: 'Boshqa',
};
export const MAQSADLAR = {
  skan:    'Bepul yuz tahlili (/skan/)',
  sayt:    'Bosh sahifa',
  ilova:   'Ilova (/app/)',
  bot:     'Telegram bot',
  miniapp: 'Telegram ilova (Mini App)',
};

const KUN_30 = 30 * 86400;
const YANGI_HISOB = "interval '7 days'";
const KOD_RE = /^[a-z0-9-]{2,32}$/;

/** Ichki brauzer va kelgan sahifadan manbani taniydi. null — bilinmadi. */
export function uaManba(ua = '', referer = '') {
  const u = String(ua), r = String(referer).toLowerCase();
  if (/Instagram/i.test(u) || /instagram\.com/.test(r)) return 'instagram';
  if (/musical_ly|BytedanceWebview|TikTok|trill_/i.test(u) || /tiktok\.com/.test(r)) return 'tiktok';
  if (/FBAN|FBAV|FB_IAB/.test(u) || /facebook\.com|fb\.com/.test(r)) return 'facebook';
  if (/youtube\.com|youtu\.be/.test(r)) return 'youtube';
  if (/(^|\.)t\.me|telegram\.org/.test(r)) return 'telegram';
  if (/(^|\.)google\./.test(r)) return 'google';
  return null;
}

/** utm_source=ig kabi qiymatni bizning manbaga aylantiradi. */
export function utmManba(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return null;
  if (/^(ig|insta)/.test(s)) return 'instagram';
  if (/^(tt|tiktok)/.test(s)) return 'tiktok';
  if (/^(tg|telegram)/.test(s)) return 'telegram';
  if (/^(yt|youtube)/.test(s)) return 'youtube';
  if (/^(fb|facebook)/.test(s)) return 'facebook';
  if (/^google/.test(s)) return 'google';
  return 'boshqa';
}

const qurilma = (ua = '') => (/iPhone|iPad|iOS/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'kompyuter');

/** Brauzer belgisi: bitta odamni ikki marta sanamaslik uchun. */
function mehmonBelgisi(req, cookies) {
  let m = cookieOl(req, 'kq_m');
  if (!/^[0-9a-f]{16}$/.test(m || '')) {
    m = crypto.randomBytes(8).toString('hex');
    cookies.push(`kq_m=${m}; Max-Age=${KUN_30 * 12}; Path=/; SameSite=Lax; Secure`);
  }
  return m;
}

function cookieQosh(res, cookies) {
  if (!cookies.length) return;
  const bor = res.getHeader?.('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(bor) ? bor : bor ? [String(bor)] : []), ...cookies]);
}

/** Havola bosildi: yoziladi va qayerga yo'naltirish kerakligi qaytariladi. */
export async function havolaBosildi(req, res, kod) {
  const k = String(kod || '').toLowerCase();
  const h = KOD_RE.test(k) ? await qator(`select * from havolalar where kod = $1 and faol`, [k]) : null;
  if (!h) return '/';
  const cookies = [];
  const mehmon = mehmonBelgisi(req, cookies);
  // Oxirgi bosilgan havola belgisi — ro'yxatdan o'tganda shu yoziladi.
  // kq_k — shu kunlik tashrif allaqachon sanaldi (avtomatik qayta sanamasin)
  cookies.push(`kq_h=${h.kod}; Max-Age=${KUN_30}; Path=/; SameSite=Lax; Secure`,
               `kq_k=1; Max-Age=86400; Path=/; SameSite=Lax; Secure`);
  cookieQosh(res, cookies);
  await sorov(`insert into havola_bosishlar (havola_id, manba, mehmon, qurilma) values ($1,$2,$3,$4)`,
    [h.id, h.manba, mehmon, qurilma(req.headers['user-agent'])]).catch(() => {});
  return manzil(h);
}

/** Havola qayerga olib boradi. */
export async function manzil(h) {
  if (h.maqsad === 'bot' || h.maqsad === 'miniapp') {
    const { botNomi, ilovaHavolasi } = await import('../lib/ilova-havola.js');
    if (h.maqsad === 'miniapp') {
      const m = await ilovaHavolasi(`h_${h.kod}`).catch(() => null);
      if (m) return m;
    }
    const bot = await botNomi().catch(() => null);
    if (bot) return `https://t.me/${bot}?start=h_${h.kod}`;
    return `/?h=${h.kod}`;
  }
  const yol = { skan: '/skan/', ilova: '/app/', sayt: '/' }[h.maqsad] || '/';
  return `${yol}?h=${h.kod}`;
}

/**
 * Havolasiz tashrif: sayt, skaner yoki ilova Instagram/TikTok ichidan
 * ochildi (yoki utm_source bilan). Kuniga bir marta sanaladi.
 */
export async function avtoTashrif(req, res, url) {
  try {
    if (url.searchParams.get('h') || cookieOl(req, 'kq_k')) return;
    const m = utmManba(url.searchParams.get('utm_source'))
      || uaManba(req.headers['user-agent'], req.headers.referer);
    if (!m) return;
    const cookies = [];
    const mehmon = mehmonBelgisi(req, cookies);
    cookies.push(`kq_k=1; Max-Age=86400; Path=/; SameSite=Lax; Secure`);
    if (!cookieOl(req, 'kq_h')) cookies.push(`kq_h=auto-${m}; Max-Age=${KUN_30}; Path=/; SameSite=Lax; Secure`);
    cookieQosh(res, cookies);
    await sorov(`insert into havola_bosishlar (havola_id, manba, mehmon, qurilma) values (null,$1,$2,$3)`,
      [m, mehmon, qurilma(req.headers['user-agent'])]);
  } catch { /* statistika hech qachon sahifani to'xtatmasin */ }
}

/**
 * Foydalanuvchiga manba yozadi. `belgi` — havola kodi («ig»), «h_ig»
 * yoki avtomatik «auto-instagram». Faqat manbasi yo'q YANGI hisobga.
 */
export async function manbaBelgila(userId, belgi) {
  const b = String(belgi || '').toLowerCase().replace(/^h_/, '').trim();
  if (!userId || !b) return false;
  let manba = null, havolaId = null;
  const avto = /^auto-([a-z]+)$/.exec(b);
  if (avto) manba = MANBALAR[avto[1]] ? avto[1] : null;
  else if (KOD_RE.test(b)) {
    const h = await qator(`select id, manba from havolalar where kod = $1`, [b]);
    if (h) { manba = h.manba; havolaId = h.id; }
  }
  if (!manba) return false;
  const r = await qator(
    `update users set manba = $2, havola_id = $3
      where id = $1 and manba is null and created_at > now() - ${YANGI_HISOB}
      returning id`, [userId, manba, havolaId]);
  return Boolean(r);
}

/** So'rovdan manba belgisi: ilova sarlavhasi yoki brauzer cookie si. */
export function sorovBelgisi(req) {
  const x = String(req.headers['x-manba'] || cookieOl(req, 'kq_h') || '').slice(0, 40);
  return /^(h_)?[a-z0-9-]{2,32}$/i.test(x) ? x : '';
}

/** Mehmon (ochiq skaner) foydalanuvchidan haqiqiy hisobga manbani ko'chiradi. */
export async function manbaKochir(mehmonId, userId) {
  if (!mehmonId || !userId) return;
  await sorov(
    `update users u set manba = m.manba, havola_id = m.havola_id
       from users m
      where u.id = $2 and m.id = $1 and m.manba is not null and u.manba is null
        and u.created_at > now() - ${YANGI_HISOB}`, [mehmonId, userId]).catch(() => {});
}

// ─────────────────────── HAVOLALARNI BOSHQARISH ───────────────────────

const toliq = (asos, kod) => `${String(asos || '').replace(/\/+$/, '')}/h/${kod}`;

function kodYasa(manba, nom) {
  const bosh = { instagram: 'ig', tiktok: 'tt', telegram: 'tg', youtube: 'yt', facebook: 'fb', google: 'gg' }[manba] || 'h';
  const soz = String(nom || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 14);
  return `${bosh}-${soz ? soz + '-' : ''}${crypto.randomBytes(2).toString('hex')}`.slice(0, 32);
}

export async function havolaYarat({ nom, manba, maqsad = 'skan', kod } = {}, asos = '') {
  const n = String(nom || '').trim().slice(0, 80);
  const m = MANBALAR[manba] ? manba : 'boshqa';
  const q = MAQSADLAR[maqsad] ? maqsad : 'skan';
  if (n.length < 2) return { xato: 'Havola nomini yozing (masalan «TikTok — aksiya videosi»).' };
  let k = String(kod || '').toLowerCase().trim();
  if (k && !KOD_RE.test(k)) return { xato: 'Kod faqat lotin harf, raqam va «-» (2–32 belgi).' };
  if (!k) k = kodYasa(m, n);
  try {
    const h = await qator(
      `insert into havolalar (kod, nom, manba, maqsad) values ($1,$2,$3,$4) returning *`, [k, n, m, q]);
    return { havola: { ...h, url: toliq(asos, h.kod), natija_url: natijaUrl(asos, h) } };
  } catch (e) {
    if (/duplicate key/.test(e.message)) return { xato: `«${k}» kodi band — boshqasini tanlang.` };
    throw e;
  }
}

// Taklifchining o'z natijasini ko'radigan sahifasi
const natijaUrl = (asos, h) => `${String(asos || '').replace(/\/+$/, '')}/taklif/${h.kod}?s=${h.sir}`;

/** O'zbekcha ismdan kod uchun so'z: «Sardor O'ktamov» → «sardor-oktamov». */
const lotin = (t) => String(t || '').toLowerCase()
  .replace(/[‘’'`ʻʼ]/g, '')
  .replace(/[ая]/g, 'a').replace(/[бв]/g, (c) => (c === 'б' ? 'b' : 'v')).replace(/[гғ]/g, 'g')
  .replace(/д/g, 'd').replace(/[её]/g, 'e').replace(/ж/g, 'j').replace(/з/g, 'z').replace(/[иий]/g, 'i')
  .replace(/[кқ]/g, 'k').replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/[оў]/g, 'o')
  .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't').replace(/у/g, 'u')
  .replace(/ф/g, 'f').replace(/[хҳ]/g, 'h').replace(/ц/g, 's').replace(/ч/g, 'ch').replace(/ш/g, 'sh')
  .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Ro'yxatdan qatorlar: «Ism Familiya, +998 90 123 45 67» yoki faqat ism.
 * Telefon ixtiyoriy — vergul, tire yoki tab bilan ajratiladi.
 */
export function ismlarniAjrat(matn) {
  return String(matn || '').split(/\r?\n/).map((q) => q.trim()).filter(Boolean).map((q) => {
    const tel = (q.match(/\+?\d[\d\s()-]{6,}\d/) || [''])[0];
    const nom = q.replace(tel, '').replace(/[,;\t|—–-]+\s*$/, '').replace(/^\s*[,;\t|—–-]+/, '').trim();
    let t = tel.replace(/[^\d+]/g, '');
    if (/^998\d{9}$/.test(t)) t = `+${t}`;
    else if (/^\d{9}$/.test(t)) t = `+998${t}`;
    return { nom: (nom || tel).slice(0, 80), telefon: t || null };
  }).filter((x) => x.nom.length >= 2);
}

/**
 * BIR URINISHDA KO'P HAVOLA: har odamga o'z havolasi.
 * `ismlar` — ro'yxat matni yoki [{nom, telefon}]; berilmasa `soni` ta
 * «<prefiks> 1, 2, 3…» yasaladi. Eng ko'pi 500 ta.
 */
export async function havolalarniYarat({ ismlar, soni, prefiks, manba = 'taklif', maqsad = 'skan', guruh } = {}, asos = '') {
  let royxat = Array.isArray(ismlar) ? ismlar.map((x) => (typeof x === 'string' ? { nom: x } : x))
    : ismlarniAjrat(ismlar);
  royxat = royxat.map((x) => ({ nom: String(x.nom || '').trim().slice(0, 80), telefon: x.telefon || null }))
    .filter((x) => x.nom.length >= 2);
  if (!royxat.length) {
    const n = Math.max(0, Math.min(500, Math.round(Number(soni) || 0)));
    const p = String(prefiks || 'Taklifchi').trim().slice(0, 60) || 'Taklifchi';
    royxat = Array.from({ length: n }, (_, i) => ({ nom: `${p} ${i + 1}`, telefon: null }));
  }
  if (!royxat.length) return { xato: 'Ismlar ro‘yxatini yozing (har qatorga bitta) yoki nechta havola kerakligini kiriting.' };
  if (royxat.length > 500) return { xato: 'Bir urinishda eng ko‘pi 500 ta havola.' };
  const m = MANBALAR[manba] ? manba : 'taklif';
  const q = MAQSADLAR[maqsad] ? maqsad : 'skan';
  const g = String(guruh || '').trim().slice(0, 60)
    || `Taklif ${new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  const natija = [];
  for (const x of royxat) {
    // Kod ismdan: www.kiovo.shop/h/sardor-7f3 — odam o'zinikini taniydi
    for (let urinish = 0; urinish < 5; urinish++) {
      const kod = `${(lotin(x.nom) || 'taklif').slice(0, 20).replace(/-+$/, '')}-${crypto.randomBytes(2).toString('hex').slice(0, 3 + urinish)}`;
      const h = await qator(
        `insert into havolalar (kod, nom, manba, maqsad, guruh, telefon) values ($1,$2,$3,$4,$5,$6)
         on conflict (kod) do nothing returning *`, [kod, x.nom, m, q, g, x.telefon]);
      if (h) { natija.push({ id: h.id, nom: h.nom, telefon: h.telefon, kod: h.kod, url: toliq(asos, h.kod), natija_url: natijaUrl(asos, h) }); break; }
    }
  }
  return { guruh: g, soni: natija.length, havolalar: natija };
}

/** Taklifchining O'Z natijasi (sahifa uchun): faqat sir to'g'ri bo'lsa. */
export async function taklifchiNatijasi(kod, sir) {
  const h = await qator(`select * from havolalar where kod = $1`, [String(kod || '').toLowerCase()]);
  if (!h || !sir || h.sir !== String(sir)) return null;
  const b = await qator(`select count(*)::int as bosish, count(distinct coalesce(mehmon, id::text))::int as unikal
      from havola_bosishlar where havola_id = $1`, [h.id]);
  const u = await qator(`select count(*) filter (where telegram_id not like 'mehmon:%')::int as royxat,
      count(*) filter (where exists (select 1 from orders o where o.user_id = users.id and o.status <> 'bekor'))::int as xaridor
      from users where havola_id = $1`, [h.id]);
  return { nom: h.nom, kod: h.kod, faol: h.faol, ...b, ...u };
}

export async function havolaOzgartir({ id, nom, maqsad, faol, telefon, guruh } = {}) {
  const h = await qator(
    `update havolalar set nom = coalesce($2, nom), maqsad = coalesce($3, maqsad), faol = coalesce($4, faol),
            telefon = coalesce($5, telefon), guruh = coalesce($6, guruh)
      where id = $1 returning *`,
    [Number(id), nom ? String(nom).slice(0, 80) : null, MAQSADLAR[maqsad] ? maqsad : null,
     typeof faol === 'boolean' ? faol : null, telefon ? String(telefon).slice(0, 20) : null,
     guruh ? String(guruh).slice(0, 60) : null]);
  return h ? { havola: h } : { xato: 'Havola topilmadi.' };
}

export async function havolaOchir(id) {
  const r = await qator(`delete from havolalar where id = $1 returning id`, [Number(id)]);
  return { ochirildi: Boolean(r) };
}

// ─────────────────────────── HISOBOT ───────────────────────────

const bosh = () => ({ bosish: 0, unikal: 0, royxat: 0, tahlil: 0, xaridor: 0, buyurtma: 0, daromad: 0 });
const SONLAR = Object.keys(bosh());
const qosh = (a, b) => { for (const k of SONLAR) a[k] += Number(b[k]) || 0; return a; };

/**
 * Manbalar bo'yicha: bosish, unikal odam, ro'yxatdan o'tgan, tahlil
 * qilgan, xarid qilgan, daromad — va har havola bo'yicha alohida.
 * @param {{kun?:number}} a  0 — butun davr
 */
export async function manbaHisoboti({ kun = 30 } = {}, asos = '') {
  const k = Math.max(0, Math.min(3650, Math.round(Number(kun) || 0)));
  const dan = k ? `now() - interval '${k} days'` : `'-infinity'::timestamptz`;
  const [bos, foy, noma, havolalar, kunlar] = await Promise.all([
    qatorlar(`select manba, havola_id, count(*)::int as bosish,
                     count(distinct coalesce(mehmon, id::text))::int as unikal
                from havola_bosishlar where created_at >= ${dan} group by 1, 2`),
    qatorlar(`select u.manba, u.havola_id,
                     count(*) filter (where u.telegram_id not like 'mehmon:%')::int as royxat,
                     count(*) filter (where exists (select 1 from analyses a where a.user_id = u.id))::int as tahlil,
                     count(*) filter (where o.soni > 0)::int as xaridor,
                     coalesce(sum(o.soni), 0)::int as buyurtma,
                     coalesce(sum(o.summa), 0)::bigint as daromad
                from users u
                left join lateral (select count(*) as soni, sum(total) as summa from orders
                                    where user_id = u.id and status <> 'bekor') o on true
               where u.manba is not null and u.created_at >= ${dan}
               group by 1, 2`),
    qator(`select count(*)::int as royxat from users
            where manba is null and created_at >= ${dan}
              and telegram_id not like 'mehmon:%' and telegram_id not like 'ochirilgan:%'`),
    qatorlar(`select * from havolalar order by created_at`),
    qatorlar(`select to_char(d, 'YYYY-MM-DD') as kun, b.manba, count(b.id)::int as bosish
                from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), '1 day') d
                left join havola_bosishlar b on date_trunc('day', b.created_at) = d
               group by 1, 2 order by 1`),
  ]);

  const manbalar = {};
  const ol = (m) => (manbalar[m] ||= { manba: m, nom: MANBALAR[m] || m, ...bosh() });
  const havolaHisob = Object.fromEntries(havolalar.map((h) => [h.id, bosh()]));
  for (const r of bos) { qosh(ol(r.manba), r); if (r.havola_id && havolaHisob[r.havola_id]) qosh(havolaHisob[r.havola_id], r); }
  for (const r of foy) { qosh(ol(r.manba), r); if (r.havola_id && havolaHisob[r.havola_id]) qosh(havolaHisob[r.havola_id], r); }

  const konv = (x) => ({ ...x, konversiya_foiz: x.unikal ? Math.round((x.royxat / x.unikal) * 1000) / 10 : null,
    xarid_foiz: x.royxat ? Math.round((x.xaridor / x.royxat) * 1000) / 10 : null });
  const jami = Object.values(manbalar).reduce((s, x) => qosh(s, x), bosh());

  // Grafik: 14 kun, har manba bo'yicha bosishlar
  const seriya = {};
  for (const r of kunlar) {
    seriya[r.kun] ||= {};
    if (r.manba) seriya[r.kun][r.manba] = r.bosish;
  }

  return {
    davr: k ? `${k} kun` : 'butun davr',
    jami: konv(jami),
    manbasi_nomalum_royxat: noma?.royxat ?? 0,
    manbalar: Object.values(manbalar).map(konv).sort((a, b) => b.royxat - a.royxat || b.bosish - a.bosish),
    havolalar: havolalar.map((h) => konv({ id: h.id, kod: h.kod, nom: h.nom, manba: h.manba,
      manba_nom: MANBALAR[h.manba] || h.manba, maqsad: h.maqsad, maqsad_nom: MAQSADLAR[h.maqsad] || h.maqsad,
      faol: h.faol, guruh: h.guruh, telefon: h.telefon, url: toliq(asos, h.kod), natija_url: natijaUrl(asos, h),
      created_at: h.created_at, ...havolaHisob[h.id] }))
      // Reyting: kim ko'p odam olib keldi — birinchi
      .sort((a, b) => b.royxat - a.royxat || b.xaridor - a.xaridor || b.unikal - a.unikal || a.id - b.id),
    guruhlar: [...new Set(havolalar.map((h) => h.guruh).filter(Boolean))],
    kunlar: Object.entries(seriya).map(([kun, x]) => ({ kun, ...x })),
  };
}
