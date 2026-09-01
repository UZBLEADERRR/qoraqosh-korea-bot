// Marketplace — Daiso / Coupang dan mahsulotni to'g'ridan-to'g'ri olish.
//
// Oqim:
//   1. Admin havola beradi (bitta yoki ro'yxat, yoki katalog sahifasi)
//   2. Server sahifani o'qiydi va MUHIM QISMINI ajratib oladi
//   3. AI kartochkani to'ldiradi (nom, tarkib, og'irlik, bosqich…)
//   4. Narx QOIDA bo'yicha hisoblanadi (src/lib/narx.js)
//   5. Filtrlar: kosmetikami, og'irligi chegaradami, narxi oraliqdami
//   6. Admin ko'rib chiqadi va tasdiqlaydi — shundan keyingina katalogga
//
// Nega CSS selektor emas: do'kon sahifasining tuzilishi tez-tez o'zgaradi
// va har bir sayt uchun alohida parser yozsak, ular bir oydan keyin
// ishlamay qoladi. Shuning uchun sahifadan meta teglar, JSON-LD va matn
// ajratib olinadi va MA'NOSINI AI o'qiydi — u tuzilish o'zgarganda ham
// ishlaydi.
import { qator, qatorlar, sorov, sozlama } from '../db.js';
import { aiJson, aiBormi } from '../ai/index.js';
import { narxHisobla, qoidaniTozala } from '../lib/narx.js';

// Sahifani brauzerdek so'raymiz: ko'p do'kon oddiy so'rovni rad etadi
const SARLAVHALAR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
              + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

const KUTISH_MS = 20_000;
const MAX_HAJM = 3 * 1024 * 1024;   // 3 MB dan katta sahifani o'qimaymiz

/** Havoladan manbani aniqlaydi. */
export function manbaTuri(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('daiso')) return 'daiso';
  if (u.includes('coupang')) return 'coupang';
  if (u.includes('oliveyoung')) return 'oliveyoung';
  return 'boshqa';
}

/** Havola http(s) va haqiqiy manzilmi. */
export function havolaTogrimi(url) {
  try {
    const u = new URL(String(url).trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : null;
  } catch { return null; }
}

/**
 * Sahifani yuklaydi.
 * @returns {Promise<{html:string, url:string}>}
 * @throws {Error} do'kon rad etsa yoki tarmoq yopiq bo'lsa
 */
export async function sahifaniOl(url) {
  const boshqaruv = AbortSignal.timeout ? AbortSignal.timeout(KUTISH_MS) : undefined;
  let javob;
  try {
    javob = await fetch(url, { headers: SARLAVHALAR, redirect: 'follow', signal: boshqaruv });
  } catch (e) {
    // Tarmoq yopiq, DNS yo'q yoki vaqt tugadi
    const x = new Error(`Sahifaga ulanib bo‘lmadi: ${e.message}`);
    x.turi = 'tarmoq';
    throw x;
  }
  if (!javob.ok) {
    const x = new Error(javob.status === 403 || javob.status === 429
      ? `Do‘kon so‘rovni rad etdi (HTTP ${javob.status}). Bot himoyasi ishlagan bo‘lishi mumkin — `
        + 'mahsulotni skrinshotdan qo‘shib ko‘ring.'
      : `Sahifa ochilmadi (HTTP ${javob.status})`);
    x.turi = 'dokon';
    throw x;
  }

  // Katta sahifani to'liq o'qimaymiz — birinchi bo'laklari yetarli
  const xom = await javob.text();
  return { html: xom.slice(0, MAX_HAJM), url: javob.url || url };
}

/**
 * Sahifadan AI ga beriladigan qismni ajratadi.
 *
 * Butun HTML ni modelga bersak, u skript va uslub kodiga ko'milib qoladi
 * va tokenlar behuda ketadi. Bu yerda eng ma'lumotli uch manba olinadi:
 * meta teglar (og:title, og:image, narx), JSON-LD (do'konlar mahsulotni
 * shu yerda tuzilgan holda beradi) va ko'rinadigan matn.
 */
export function sahifaniSiqish(html) {
  const s = String(html || '');

  const sarlavha = (s.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i) || [])[1] || '';

  // meta[property] va meta[name] — ikkalasi ham ishlatiladi
  const metalar = [];
  const metaQolip = /<meta\s+[^>]*?(?:property|name)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*>/gi;
  let m;
  while ((m = metaQolip.exec(s)) && metalar.length < 40) {
    if (/^(og:|twitter:|product|price|description|keywords)/i.test(m[1])) {
      metalar.push(`${m[1]}: ${m[2]}`.slice(0, 300));
    }
  }

  // JSON-LD: do'konlar mahsulot ma'lumotini shu yerda beradi
  const jsonld = [];
  const ldQolip = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldQolip.exec(s)) && jsonld.length < 4) {
    const t = m[1].trim();
    if (/"@type"\s*:\s*"?(Product|Offer)/i.test(t)) jsonld.push(t.slice(0, 3000));
  }

  // Ko'rinadigan matn
  const matn = s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);

  return [
    `SARLAVHA: ${sarlavha.trim()}`,
    metalar.length ? `META:\n${metalar.join('\n')}` : '',
    jsonld.length ? `JSON-LD:\n${jsonld.join('\n---\n')}` : '',
    `MATN:\n${matn}`,
  ].filter(Boolean).join('\n\n');
}

/** Sahifadagi mahsulot rasmini topadi (og:image yoki JSON-LD image). */
export function rasmHavolasi(html, sahifaUrl) {
  const s = String(html || '');
  const og = s.match(/<meta\s+[^>]*?(?:property|name)=["']og:image["'][^>]*?content=["']([^"']+)["']/i)
          || s.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:image["']/i);
  let havola = og?.[1];
  if (!havola) {
    const ld = s.match(/"image"\s*:\s*"([^"]+)"/i) || s.match(/"image"\s*:\s*\[\s*"([^"]+)"/i);
    havola = ld?.[1];
  }
  if (!havola) return null;
  try { return new URL(havola.replace(/&amp;/g, '&'), sahifaUrl).toString(); } catch { return null; }
}

/** Katalog sahifasidan mahsulot havolalarini yig'adi. */
export function mahsulotHavolalari(html, sahifaUrl, maxSoni = 40) {
  const asos = new URL(sahifaUrl);
  const topildi = new Set();
  const qolip = /<a\s[^>]*href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = qolip.exec(String(html))) && topildi.size < maxSoni * 3) {
    let u;
    try { u = new URL(m[1].replace(/&amp;/g, '&'), sahifaUrl); } catch { continue; }
    if (u.host !== asos.host) continue;
    // Mahsulot sahifasiga o'xshaydimi — do'konlarda odatda shunday yo'llar.
    // Ataylab tor: kategoriya va yordam sahifalari tushib qolmasin.
    // Topilmasa admin havolalarni qo'lda qo'yadi — panel shuni aytadi.
    if (!/\/(product|products|goods|item|pd|dp|vp\/products)\//i.test(u.pathname)
        && !/(productNo|itemId|goodsNo|productId)=/i.test(u.search)) continue;
    u.hash = '';
    topildi.add(u.toString());
  }
  return [...topildi].slice(0, maxSoni);
}

// ──────────────── AI bilan o'qish ────────────────

const SXEMA = {
  type: 'object',
  properties: {
    kosmetikami: { type: 'boolean' },
    ishonch:     { type: 'integer' },
    izoh:        { type: 'string' },
    name:        { type: 'string' },
    brand:       { type: 'string' },
    narx_qiymat: { type: 'number' },
    narx_valyuta:{ type: 'string', enum: ['KRW', 'USD', 'UZS', 'nomalum'] },
    ogirlik_g:   { type: 'integer' },
    volume:      { type: 'string' },
    category:    { type: 'string', enum: ['tozalash','toner','serum','krem','niqob','quyosh','lab','toplam','ichimlik'] },
    step:        { type: 'string', enum: ['tozalash','toner','davolash','namlash','himoya','qoshimcha','ichki'] },
    description: { type: 'string' },
    usage_text:  { type: 'string' },
    ingredients: { type: 'string' },
    actives:     { type: 'array', items: { type: 'string' } },
    concerns:    { type: 'array', items: { type: 'string', enum: ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','quyosh'] } },
    skin_types:  { type: 'array', items: { type: 'string', enum: ['quruq','yogli','aralash','normal','sezgir','barcha'] } },
    warnings:    { type: 'string' },
    emoji:       { type: 'string' },
  },
  required: ['kosmetikami','ishonch','izoh','name','brand','narx_qiymat','narx_valyuta',
             'ogirlik_g','volume','category','step','description','usage_text','ingredients',
             'actives','concerns','skin_types','warnings','emoji'],
  propertyOrdering: ['kosmetikami','ishonch','izoh','name','brand','narx_qiymat','narx_valyuta',
             'ogirlik_g','volume','category','step','description','usage_text','ingredients',
             'actives','concerns','skin_types','warnings','emoji'],
};

const KORSATMA = `Sen — Koreya kosmetikasi do'konining katalog muharrirsan.
Quyida koreys onlayn do'konining mahsulot sahifasidan olingan ma'lumot bor.
Undan do'kon kartochkasini to'ldir.

QOIDALAR — eng muhimi:
- MA'LUMOTNI O'YLAB TOPMA. Sahifada yo'q narsani yozma. Tarkibi ko'rinmasa
  ingredients ni bo'sh qoldir; og'irlik yozilmagan bo'lsa hajmidan
  (ml/g) TAXMIN qil va shuni ogirlik_g ga yoz.
- kosmetikami: bu teri parvarishi mahsulotimi (krem, toner, serum,
  tozalagich, niqob, SPF, lab vositasi) YOKI teri uchun ichki qabul
  qilinadigan qo'shimcha (kollagen, jenshen, vitamin, biotin)? Oziq-ovqat,
  idish-tovoq, kiyim, o'yinchoq va boshqa narsa bo'lsa — false.
- narx_qiymat: sahifadagi SOTUV narxi (chegirmali bo'lsa o'shanisi).
  Faqat son, ajratgichsiz. narx_valyuta: koreys do'konida odatda KRW
  (원, ₩). Aniq bo'lmasa "nomalum" va narx_qiymat = 0.
- ogirlik_g: mahsulot og'irligi GRAMMDA, qadoqsiz. 50 ml krem ~ 60 g,
  200 ml toner ~ 220 g, 30 ta niqob varag'i ~ 700 g. Bilmasang 0.
- step: parvarish bosqichi. Ichki qabul (kollagen, vitamin, jenshen) uchun
  "ichki", u tashqi parvarish tartibiga kirmaydi.
- description: mahsulot nima qilishi, 2-3 jumla, sotuvchi tilida emas.
- usage_text: qanday foydalanish — aniq ketma-ketlik va qachon.
  Ichki qabul uchun: kuniga qancha, qachon ichiladi.
- ishonch: sahifani qanchalik aniq o'qiy olganingga qarab 0-100.
- Butun javob O'ZBEK tilida (lotin alifbosida), mahsulot nomi bundan
  mustasno — u asl holida qoladi.

Faqat JSON qaytar.`;

/**
 * Sahifadan mahsulot kartochkasini o'qiydi.
 * @param {string} siqilgan  sahifaniSiqish natijasi
 */
export async function sahifaniOqi(siqilgan) {
  if (!aiBormi()) {
    const e = new Error('AI kaliti sozlanmagan — marketplace ishlamaydi.');
    e.turi = 'ai';
    throw e;
  }
  const j = await aiJson(
    [{ text: `${KORSATMA}\n\nSAHIFA:\n"""\n${siqilgan}\n"""` }],
    SXEMA, { temperature: 0.1, maxTokens: 2048 });

  const s = (v, n) => String(v ?? '').slice(0, n);
  const arr = (v, n) => (Array.isArray(v) ? v : []).map((x) => s(x, 40)).filter(Boolean).slice(0, n);

  return {
    kosmetikami: Boolean(j.kosmetikami),
    ishonch:  Math.min(100, Math.max(0, Number(j.ishonch) || 0)),
    izoh:     s(j.izoh, 300),
    name:     s(j.name, 120),
    brand:    s(j.brand, 60),
    narx_qiymat:  Math.max(0, Number(j.narx_qiymat) || 0),
    narx_valyuta: ['KRW', 'USD', 'UZS'].includes(j.narx_valyuta) ? j.narx_valyuta : 'nomalum',
    ogirlik_g: Math.max(0, Math.min(50000, Number(j.ogirlik_g) || 0)),
    volume:   s(j.volume, 30),
    category: s(j.category, 20) || 'krem',
    step:     s(j.step, 20) || 'namlash',
    description: s(j.description, 600),
    usage_text:  s(j.usage_text, 600),
    ingredients: s(j.ingredients, 900),
    actives:    arr(j.actives, 10),
    concerns:   arr(j.concerns, 8),
    skin_types: arr(j.skin_types, 6),
    warnings:   s(j.warnings, 300),
    emoji:      s(j.emoji, 4) || '🧴',
  };
}

// ──────────────── Sozlamalar va filtrlar ────────────────

export async function sozlamalar() {
  const [qoida, maksOgirlik, narxDan, narxGacha] = await Promise.all([
    sozlama('narx_qoidasi', {}),
    sozlama('marketplace_maks_ogirlik', 600),
    sozlama('marketplace_narx_dan', 0),
    sozlama('marketplace_narx_gacha', 0),
  ]);
  const son = (v) => Math.max(0, Number(String(v ?? '').replace(/"/g, '')) || 0);
  return {
    qoida: qoidaniTozala(qoida && typeof qoida === 'object' ? qoida : {}),
    maksOgirlik: son(maksOgirlik) || 600,
    narxDan: son(narxDan),
    narxGacha: son(narxGacha),
  };
}

/**
 * Mahsulot qoidalarga to'g'ri keladimi.
 * @returns {string|null} rad etish sababi yoki null
 */
export function filtrdanOtdimi(m, narx, s) {
  if (!m.kosmetikami) return 'Kosmetika yoki teri uchun qo‘shimcha emas';
  if (m.ishonch < 55) return `Sahifa aniq o‘qilmadi (ishonch ${m.ishonch}%)`;
  if (!m.name) return 'Mahsulot nomi topilmadi';
  if (!m.narx_qiymat) return 'Sahifada narx topilmadi';
  if (m.ogirlik_g > s.maksOgirlik) {
    return `Og‘irligi ${m.ogirlik_g} g — chegara ${s.maksOgirlik} g`;
  }
  if (s.narxDan && narx.narx < s.narxDan) {
    return `Narxi ${narx.narx} so‘m — eng kam ${s.narxDan} so‘m`;
  }
  if (s.narxGacha && narx.narx > s.narxGacha) {
    return `Narxi ${narx.narx} so‘m — eng ko‘p ${s.narxGacha} so‘m`;
  }
  return null;
}

// ──────────────── Asosiy oqim ────────────────

/**
 * Bitta havoladan mahsulot olib, ro'yxatga qo'yadi.
 * @returns {Promise<object>} marketplace_topilgan qatori
 */
export async function havoladanOl(xomUrl, { adminId = null } = {}) {
  const url = havolaTogrimi(xomUrl);
  if (!url) throw Object.assign(new Error('Havola noto‘g‘ri'), { turi: 'havola' });

  const bor = await qator('select * from marketplace_topilgan where manba_url = $1', [url]);
  if (bor && bor.holat !== 'xato') {
    return { ...bor, takror: true };
  }

  const s = await sozlamalar();
  let holat = 'kutilmoqda';
  let sabab = null;
  let malumot = {};
  let narx = {};
  let rasmId = null;

  try {
    const { html, url: oxirgi } = await sahifaniOl(url);
    malumot = await sahifaniOqi(sahifaniSiqish(html));

    // Narx faqat KRW da ishonchli: boshqa valyutada admin qo'lda kiritadi
    narx = narxHisobla(
      malumot.narx_valyuta === 'KRW'
        ? { krw: malumot.narx_qiymat, gramm: malumot.ogirlik_g }
        : { tannarx: 0, gramm: malumot.ogirlik_g },
      s.qoida);

    sabab = filtrdanOtdimi(malumot, narx, s);
    if (sabab) holat = 'rad_etildi';

    rasmId = await rasmniSaqla(rasmHavolasi(html, oxirgi), malumot.name);
  } catch (e) {
    holat = 'xato';
    sabab = e.message;
  }

  const r = await qator(
    `insert into marketplace_topilgan (manba, manba_url, malumot, narx_izoh, rasm_id,
            holat, sabab, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (manba_url) do update set
       malumot = excluded.malumot, narx_izoh = excluded.narx_izoh,
       rasm_id = coalesce(excluded.rasm_id, marketplace_topilgan.rasm_id),
       holat = excluded.holat, sabab = excluded.sabab, updated_at = now()
     returning *`,
    [manbaTuri(url), url, JSON.stringify(malumot), JSON.stringify(narx),
     rasmId, holat, sabab, adminId]);
  return r;
}

/**
 * AGENT TOPSHIRIG'I: katalog sahifasini o'zi aylanib chiqadi.
 *
 * Admin bitta havola beradi («kremlar» bo'limi), qolganini agent qiladi:
 * sahifadagi mahsulot havolalarini topadi, har birini o'qiydi va
 * SOZLAMALARDAGI filtrdan o'tkazadi — kosmetika bo'lmagani, og'irligi
 * chegaradan oshgani va narx oralig'iga tushmagani «rad etildi» bo'lib
 * qoladi. Katalogga esa ADMIN TASDIQLAGANDAN keyin tushadi: agent hech
 * qachon o'zi sotuvga qo'ymaydi.
 *
 * Havolalar KETMA-KET olinadi: do'kon bir vaqtda kelgan o'nlab so'rovni
 * bot deb hisoblab bloklaydi.
 *
 * @param {string} xomUrl   katalog (bo'lim) sahifasi
 * @param {{limit?:number, adminId?:number|null}} [par]
 */
export async function agentYigish(xomUrl, { limit = 10, adminId = null } = {}) {
  const url = havolaTogrimi(xomUrl);
  if (!url) throw Object.assign(new Error('Havola noto‘g‘ri'), { turi: 'havola' });

  const soni = Math.max(1, Math.min(30, Number(limit) || 10));
  const { html, url: oxirgi } = await sahifaniOl(url);
  const havolalar = mahsulotHavolalari(html, oxirgi, soni);
  if (!havolalar.length) {
    return { havolalar: [], natijalar: [], hisob: bosh(),
             sabab: 'Sahifada mahsulot havolasi topilmadi — bo‘lim havolasini tekshiring.' };
  }

  const natijalar = [];
  for (const h of havolalar) {
    try {
      natijalar.push(await havoladanOl(h, { adminId }));
    } catch (e) {
      natijalar.push({ manba_url: h, holat: 'xato', sabab: e.message });
    }
  }
  return { havolalar, natijalar, hisob: yigindi(natijalar) };
}

const bosh = () => ({ kutilmoqda: 0, rad_etildi: 0, xato: 0, takror: 0 });

/** Agent hisoboti: nechtasi tasdiq kutmoqda, nechtasi filtrdan o'tmadi. */
function yigindi(natijalar) {
  const h = bosh();
  for (const n of natijalar) {
    if (n.takror) h.takror += 1;
    else if (h[n.holat] != null) h[n.holat] += 1;
  }
  return h;
}

/** Mahsulot rasmini yuklab, media ga saqlaydi. */
async function rasmniSaqla(havola, nom) {
  if (!havola) return null;
  try {
    const boshqaruv = AbortSignal.timeout ? AbortSignal.timeout(15_000) : undefined;
    const r = await fetch(havola, { headers: SARLAVHALAR, signal: boshqaruv });
    if (!r.ok) return null;
    const mime = String(r.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(mime)) return null;

    const bayt = Buffer.from(await r.arrayBuffer());
    if (!bayt.length || bayt.length > 5 * 1024 * 1024) return null;

    const m = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('poster', $1, $2, $3, $4) returning id`,
      [mime, bayt, bayt.length, String(nom || 'Marketplace').slice(0, 200)]);
    return m.id;
  } catch {
    // Rasm bo'lmasa ham mahsulot qo'shiladi — admin keyin yuklaydi
    return null;
  }
}

/**
 * Ro'yxatdagi mahsulotni katalogga qo'shadi.
 * @param {number} id       marketplace_topilgan.id
 * @param {object} ozgarish admin tahrirlagan maydonlar (narx, ombor…)
 */
export async function tasdiqla(id, ozgarish = {}) {
  const t = await qator('select * from marketplace_topilgan where id = $1', [id]);
  if (!t) throw new Error('Topilmadi');
  if (t.product_id) throw new Error('Bu mahsulot allaqachon qo‘shilgan');

  const m = t.malumot || {};
  const n = t.narx_izoh || {};
  const son = (v, z) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? Math.round(x) : z;
  };

  const nom = String(ozgarish.name ?? m.name ?? '').trim().slice(0, 120);
  const narx = son(ozgarish.price, son(n.narx, 0));
  if (!nom)  throw new Error('Mahsulot nomi kerak');
  if (!narx) throw new Error('Narx kerak');

  const kategoriya = await qator('select id from categories where slug = $1',
    [String(ozgarish.category ?? m.category ?? '')]);

  const p = await qator(
    `insert into products (name, brand, category_id, step, price, cost_price, stock,
            volume, country, description, usage_text, ingredients, actives, concerns,
            skin_types, warnings, emoji, ai_filled, is_active, manba_url, manba,
            ogirlik, poster_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'KR',$9,$10,$11,$12,$13,$14,$15,$16,true,true,$17,$18,$19,$20)
     returning *`,
    [nom,
     String(ozgarish.brand ?? m.brand ?? '').trim().slice(0, 60) || null,
     kategoriya?.id ?? null,
     String(ozgarish.step ?? m.step ?? 'namlash').slice(0, 20),
     narx,
     son(ozgarish.cost_price, son(n.tannarx, 0)),
     son(ozgarish.stock, 0),
     String(ozgarish.volume ?? m.volume ?? '').slice(0, 30) || null,
     String(m.description || '').slice(0, 900) || null,
     String(m.usage_text || '').slice(0, 900) || null,
     String(m.ingredients || '').slice(0, 1200) || null,
     (m.actives || []).slice(0, 12),
     (m.concerns || []).slice(0, 10),
     (m.skin_types || []).slice(0, 8),
     String(m.warnings || '').slice(0, 400) || null,
     String(m.emoji || '🧴').slice(0, 4),
     t.manba_url, t.manba,
     son(ozgarish.ogirlik, son(m.ogirlik_g, 0)),
     t.rasm_id]);

  // Rasmni mahsulotga bog'laymiz: mahsulot o'chsa rasm ham o'chadi
  if (t.rasm_id) {
    await sorov('update media set product_id = $1 where id = $2', [p.id, t.rasm_id]).catch(() => {});
  }
  await sorov(
    `update marketplace_topilgan set holat = 'tasdiqlandi', product_id = $1, updated_at = now()
      where id = $2`, [p.id, id]);
  return p;
}

export const radEt = (id, sabab = 'Admin rad etdi') => sorov(
  `update marketplace_topilgan set holat = 'rad_etildi', sabab = $1, updated_at = now()
    where id = $2 and product_id is null`, [String(sabab).slice(0, 300), id]);

export const ochir = (id) => sorov('delete from marketplace_topilgan where id = $1', [id]);

/** Ro'yxat — admin panelga. */
export const royxat = (holat = '', limit = 100) => qatorlar(
  `select t.*, p.name as mahsulot_nomi
     from marketplace_topilgan t
     left join products p on p.id = t.product_id
    ${holat ? 'where t.holat = $2' : ''}
    order by t.created_at desc limit $1`,
  holat ? [limit, holat] : [limit]);

/** Har bir holatdan nechtadan bor. */
export const hisob = () => qatorlar(
  `select holat, count(*)::int as soni from marketplace_topilgan group by holat`);
