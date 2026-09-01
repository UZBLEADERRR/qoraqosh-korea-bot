// Do'kon API si — sahifani emas, do'konning O'ZINING JSON javobini o'qish.
//
// Nega kerak: daisomall.co.kr kabi zamonaviy do'konlar sahifani brauzerda
// yig'adi. Serverdan kelgan HTML da mahsulot ma'lumoti YO'Q — u keyin
// JSON so'rov bilan tortiladi. Shunday saytda HTML ni qanchalik yaxshi
// tahlil qilmaylik, bo'sh qoladi. Shuning uchun avval API urinib ko'riladi,
// bo'lmasa HTML ga qaytiladi.
//
// Daiso RASMIY, hujjatlashtirilgan API bermaydi. Bu yerda ishlatilayotgani —
// saytning o'zi ishlatadigan ichki manzil, u o'zgarishi mumkin. Shuning
// uchun manzil KODDA QOTIB QOLMAGAN: admin panelidan tahrirlanadi.
// Brauzerda mahsulot sahifasini ochib, F12 → Network → Fetch/XHR da
// haqiqiy manzil ko'rinadi, uni panelga qo'yish kifoya — deploy shart emas.

/**
 * Sukut qoidalari.
 *
 * `id_qolip`  — mahsulot sahifasi havolasidan raqamni ajratadi
 * `mahsulot_url` — API manzili, `{id}` o'rniga o'sha raqam qo'yiladi
 * `sahifa_url`   — teskarisi: id dan odam ko'radigan havola yasaladi
 * `id_kalit`     — ro'yxat (qidiruv/kategoriya) javobida mahsulot id si
 *                  qaysi kalitda turishi
 */
export const API_STANDART = [
  {
    manba: 'daiso',
    nom: 'Daiso Mall',
    host: 'daisomall.co.kr',
    id_qolip: '(?:pdNo|goodsNo|productNo)=([0-9A-Za-z_-]+)',
    mahsulot_url: 'https://www.daisomall.co.kr/api/pd/pdd/pdDetail?pdNo={id}',
    sahifa_url: 'https://www.daisomall.co.kr/pd/pdd/pdDetail?pdNo={id}',
    id_kalit: 'pdNo',
    yoq: false,
  },
];

/** JSON so'ralayotganini bildiradigan sarlavhalar. */
export const JSON_SARLAVHALAR = {
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
};

/** Sozlamadagi qoidalarni tekshirib, ishlatsa bo'ladigan holga keltiradi. */
export function qoidalarniTozala(xom) {
  const royxat = Array.isArray(xom) ? xom : [];
  return royxat.map((q) => ({
    manba: String(q.manba || 'boshqa').slice(0, 24),
    nom: String(q.nom || q.manba || 'Qoida').slice(0, 60),
    host: String(q.host || '').toLowerCase().slice(0, 120),
    id_qolip: String(q.id_qolip || '').slice(0, 200),
    mahsulot_url: String(q.mahsulot_url || '').slice(0, 400),
    sahifa_url: String(q.sahifa_url || '').slice(0, 400),
    id_kalit: String(q.id_kalit || '').slice(0, 40),
    sarlavhalar: (q.sarlavhalar && typeof q.sarlavhalar === 'object') ? q.sarlavhalar : {},
    yoq: Boolean(q.yoq),
  })).filter((q) => q.host && q.mahsulot_url);
}

/** Havolaga mos qoida (o'chirilganlari hisobga olinmaydi). */
export function qoidaTop(url, qoidalar) {
  let host;
  try { host = new URL(String(url)).hostname.toLowerCase(); } catch { return null; }
  return qoidalar.find((q) => !q.yoq && (host === q.host || host.endsWith(`.${q.host}`))) || null;
}

/** Havoladan mahsulot id sini ajratadi. */
export function idAjrat(url, qoida) {
  if (!qoida?.id_qolip) return null;
  let re;
  try { re = new RegExp(qoida.id_qolip, 'i'); } catch { return null; }
  const m = re.exec(String(url));
  return m ? (m[1] || m[0]) : null;
}

/** Qolipdagi {id} ni to'ldiradi. */
export const qolipniToldir = (qolip, id) =>
  String(qolip || '').replace(/\{id\}/g, encodeURIComponent(String(id)));

/**
 * Mahsulot sahifasi havolasidan API manzilini yasaydi.
 * @returns {string|null} id topilmasa null — bunda HTML ga qaytiladi
 */
export function apiHavolasi(url, qoida) {
  const id = idAjrat(url, qoida);
  return id ? qolipniToldir(qoida.mahsulot_url, id) : null;
}

// ──────────────── JSON ichidan ma'lumot olish ────────────────

/** Obyekt ichini aylanib chiqadi (chuqurlik cheklangan — halqadan himoya). */
function* yur(obj, chuqurlik = 0) {
  if (!obj || typeof obj !== 'object' || chuqurlik > 8) return;
  for (const [kalit, qiymat] of Object.entries(obj)) {
    yield [kalit, qiymat];
    if (qiymat && typeof qiymat === 'object') yield* yur(qiymat, chuqurlik + 1);
  }
}

const RASM_QOLIP = /\.(?:jpe?g|png|webp|gif|avif)(?:\?|$)/i;
const RASM_KALIT = /(image|img|thumb|photo|pic|rasm)/i;

/** JSON ichidan mahsulot rasmini topadi. */
export function jsonRasm(json, asosUrl) {
  const nomzodlar = [];
  for (const [kalit, qiymat] of yur(json)) {
    if (typeof qiymat !== 'string' || qiymat.length > 500) continue;
    const rasmga_oxshash = RASM_QOLIP.test(qiymat);
    if (!rasmga_oxshash && !(RASM_KALIT.test(kalit) && /^https?:|^\//.test(qiymat))) continue;
    // Kalitida "image" bo'lgani ishonchliroq — oldinga qo'yamiz
    nomzodlar.push([RASM_KALIT.test(kalit) ? 0 : 1, qiymat]);
  }
  nomzodlar.sort((a, b) => a[0] - b[0]);
  for (const [, v] of nomzodlar) {
    try { return new URL(v, asosUrl).toString(); } catch { /* keyingisi */ }
  }
  return null;
}

/** Ro'yxat javobidan mahsulot sahifalarining havolalarini yasaydi. */
export function jsonHavolalar(json, qoida, maxSoni = 40) {
  if (!qoida?.id_kalit || !qoida?.sahifa_url) return [];
  const kalit = qoida.id_kalit.toLowerCase();
  const idlar = [];
  for (const [k, v] of yur(json)) {
    if (k.toLowerCase() !== kalit) continue;
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    const id = String(v).trim();
    if (id && !idlar.includes(id)) idlar.push(id);
    if (idlar.length >= maxSoni) break;
  }
  return idlar.map((id) => qolipniToldir(qoida.sahifa_url, id));
}

const MAX_BELGI = 6000;

/**
 * JSON ni AI o'qiy oladigan holga keltiradi.
 *
 * Qaysi kalit narx, qaysisi og'irlik ekanini KOD TAXMIN QILMAYDI: do'kon
 * kalit nomlarini o'zgartirsa taxmin buziladi. JSON qisqartirilib modelga
 * beriladi va ma'noni u o'qiydi — HTML da qanday bo'lsa, xuddi shunday.
 */
export function jsonSiqish(json) {
  let matn;
  try { matn = JSON.stringify(json); } catch { return ''; }
  if (matn.length <= MAX_BELGI) return `DO‘KON API JAVOBI (JSON):\n${matn}`;

  // Uzun bo'lsa: eng katta massivlarni qirqib, qolganini saqlaymiz —
  // odatda mahsulot tavsifi qisqa, sharhlar va tavsiyalar uzun bo'ladi.
  const qirq = (v, chuqurlik = 0) => {
    if (Array.isArray(v)) return v.slice(0, 5).map((x) => qirq(x, chuqurlik + 1));
    if (v && typeof v === 'object' && chuqurlik <= 8) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, qirq(x, chuqurlik + 1)]));
    }
    return (typeof v === 'string' && v.length > 600) ? `${v.slice(0, 600)}…` : v;
  };
  try { matn = JSON.stringify(qirq(json)); } catch { /* borini olamiz */ }
  return `DO‘KON API JAVOBI (JSON):\n${matn.slice(0, MAX_BELGI)}`;
}
