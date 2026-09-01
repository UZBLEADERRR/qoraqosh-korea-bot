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
    nom: 'Daiso Mall — qidiruv',
    host: 'prdm.daisomall.co.kr',
    // Do'konning o'z qidiruv manzili. Javobda mahsulot NOMI, NARXI, BRENDI
    // va RASMI bor — shuning uchun har mahsulot uchun alohida sahifa
    // ochilmaydi: yuztasini olish yuzta so'rov emas, uch-to'rt so'rov.
    royxat_url: 'https://prdm.daisomall.co.kr/ssn/search/FindStoreGoods'
              + '?searchTerm={q}&cntPerPage=30&pageNum={sahifa}',
    royxat_yoli: 'resultSet.result.0.resultDocuments',
    element_id: 'PD_NO',
    // Odam ko'radigan sahifa — kartochkadagi «Sahifa» tugmasi shunga olib boradi
    sahifa_url: 'https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={id}',
    id_qolip: 'pdNo=([0-9A-Za-z_-]+)',
    id_kalit: 'PD_NO',
    // Eski rasm hosti CDN ga o'giriladi
    rasm_almashtir: { 'img.daisomall.co.kr': 'cdn.daisomall.co.kr' },
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
    royxat_url: String(q.royxat_url || '').slice(0, 500),
    royxat_yoli: String(q.royxat_yoli || '').slice(0, 200),
    element_id: String(q.element_id || '').slice(0, 40),
    rasm_almashtir: (q.rasm_almashtir && typeof q.rasm_almashtir === 'object')
      ? q.rasm_almashtir : {},
    sarlavhalar: (q.sarlavhalar && typeof q.sarlavhalar === 'object') ? q.sarlavhalar : {},
    yoq: Boolean(q.yoq),
  })).filter((q) => q.host && (q.mahsulot_url || q.royxat_url));
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
export function jsonRasm(json, asosUrl, qoida = null) {
  const nomzodlar = [];
  for (const [kalit, qiymat] of yur(json)) {
    if (typeof qiymat !== 'string' || qiymat.length > 500) continue;
    const rasmga_oxshash = RASM_QOLIP.test(qiymat);
    if (!rasmga_oxshash && !(RASM_KALIT.test(kalit) && /^https?:|^\//.test(qiymat))) continue;
    // Kalitida "image" bo'lgani ishonchliroq — oldinga qo'yamiz
    nomzodlar.push([RASM_KALIT.test(kalit) ? 0 : 1, qiymat]);
  }
  nomzodlar.sort((a, b) => a[0] - b[0]);
  const almashtir = qoida?.rasm_almashtir || {};
  for (const [, v] of nomzodlar) {
    try {
      const u = new URL(v, asosUrl);
      // Do'kon eski rasm hostini bersa, CDN ga o'giramiz
      if (almashtir[u.hostname]) u.hostname = almashtir[u.hostname];
      return u.toString();
    } catch { /* keyingisi */ }
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

/** "a.b.0.c" ko'rinishidagi yo'l bo'yicha qiymat oladi. */
export function yol(obj, yoli) {
  return String(yoli || '').split('.').filter(Boolean)
    .reduce((o, k) => (o == null ? o : o[k]), obj);
}

/**
 * Ro'yxat javobidan MAHSULOT OBYEKTLARINI oladi.
 *
 * Daiso qidiruvi kabi javoblarda kartochka uchun kerak bo'ladigan hamma
 * narsa — nomi, narxi, brendi, rasmi — allaqachon bor. Shunda har
 * mahsulot uchun alohida sahifa ochish shart emas: yuzta mahsulot yuzta
 * so'rov emas, bir necha so'rovda olinadi va do'kon bizni bloklamaydi.
 */
export function jsonElementlar(json, qoida, maxSoni = 100) {
  if (!qoida?.royxat_yoli) return [];
  const xom = yol(json, qoida.royxat_yoli);
  if (!Array.isArray(xom)) return [];
  const kalit = qoida.element_id || qoida.id_kalit;
  return xom
    .filter((x) => x && typeof x === 'object' && (!kalit || x[kalit] != null))
    .slice(0, maxSoni);
}

/** Element ichidagi mahsulot id si. */
export const elementId = (element, qoida) => {
  const kalit = qoida?.element_id || qoida?.id_kalit;
  const v = kalit ? element?.[kalit] : null;
  return (v == null || v === '') ? null : String(v);
};

/** Ro'yxat manzilini yasaydi: {q} — qidiruv so'zi, {sahifa} — sahifa raqami. */
export const royxatHavolasi = (qoida, soz, sahifa) =>
  String(qoida?.royxat_url || '')
    .replace(/\{q\}/g, encodeURIComponent(String(soz || '')))
    .replace(/\{sahifa\}/g, String(sahifa || 1));

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
