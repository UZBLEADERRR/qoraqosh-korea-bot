// Tahlil natijasining rasmi.
//
// Tuzilishi (yuqoridan pastga):
//   1. TO'Q RANGLI BOSH QISM — chapda surat, o'ng yonida foydalanuvchi
//      ma'lumoti (ism, taxminiy yosh, teri turi va rangi) va umumiy ball.
//      Statistika shu rangli fon ustida turadi: ko'z birinchi shu yerga
//      tushadi va rasm ijtimoiy tarmoqda ham o'qiladi.
//   2. OQ QISM — muammolar (sababi va yechimi bilan) hamda tavsiya etilgan
//      mahsulotlar. Bular KICHIKROQ: ular tafsilot, sarlavha emas.
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi, o'rnida bo'sh
// kvadrat qoladi. Barcha belgilar vektor shakl bilan chiziladi.
import { x, qatorlarga, kes, SHRIFT } from './chiz.js';

const ENI = 1080;
const CHET = 56;
const ICH = ENI - CHET * 2;

const R = {
  fon:     '#F7F4F1',
  karta:   '#FFFFFF',
  matn:    '#241C1A',
  kul:     '#7C6E68',
  chiziq:  '#E8DFD9',
  urgu:    '#B4654A',

  // Bosh qismning to'q yashil foni
  tim:      '#12362A',
  timOch:   '#1B4A39',
  timMatn:  '#FFFFFF',
  timKul:   'rgba(255,255,255,.72)',
  timChiziq:'rgba(255,255,255,.16)',

  yuqori:  '#E0705A',   // kuchli muammo
  orta:    '#E5AE55',
  past:    '#5FBE8C',   // yengil / yaxshi
};

const rang = (foiz) => (foiz >= 70 ? R.yuqori : foiz >= 40 ? R.orta : R.past);

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sana(d = new Date()) {
  // Toshkent vaqti (UTC+5)
  const t = new Date(d.getTime() + 5 * 3600 * 1000);
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const matn = (s, y, o = {}) => `<text x="${o.x ?? CHET}" y="${y}" font-family="${SHRIFT}"
  font-size="${o.olcham ?? 26}" font-weight="${o.ogirlik ?? 400}" fill="${o.rang ?? R.matn}"
  ${o.oxiri ? 'text-anchor="end"' : ''} ${o.markaz ? 'text-anchor="middle"' : ''}>${x(s)}</text>`;

/** Yumaloq uchli progress chiziq. */
function shkala(xx, y, kenglik, foiz, { balandlik = 12, fon = R.chiziq, tus = null } = {}) {
  const t = Math.max(0, Math.min(100, foiz));
  const to = Math.max(balandlik, Math.round((kenglik * t) / 100));
  const r = balandlik / 2;
  return `<rect x="${xx}" y="${y}" width="${kenglik}" height="${balandlik}" rx="${r}" fill="${fon}"/>
    <rect x="${xx}" y="${y}" width="${to}" height="${balandlik}" rx="${r}" fill="${tus || rang(t)}"/>`;
}

/** Yorliq (chip) — to'q fon ustida. */
function yorliq(xx, y, s, olcham = 24) {
  const ken = Math.max(90, Math.round(String(s).length * olcham * 0.56) + 34);
  return {
    ken,
    svg: `<rect x="${xx}" y="${y}" width="${ken}" height="44" rx="22"
        fill="${R.timChiziq}" stroke="rgba(255,255,255,.18)"/>
      <text x="${xx + ken / 2}" y="${y + 30}" font-family="${SHRIFT}" font-size="${olcham}"
        fill="${R.timMatn}" text-anchor="middle">${x(s)}</text>`,
  };
}

/** "Tasdiq" belgisi — emoji o'rniga vektor. */
const belgiOk = (xx, y, r = 10) => `
  <circle cx="${xx + r}" cy="${y}" r="${r}" fill="${R.past}"/>
  <path d="M${xx + r - 4.5} ${y} l3 3 l6 -6" stroke="#fff" stroke-width="2.4"
    fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** "Sabab" belgisi — savol doirasi. */
const belgiSabab = (xx, y, r = 10) => `
  <circle cx="${xx + r}" cy="${y}" r="${r}" fill="none" stroke="${R.kul}" stroke-width="2"/>
  <circle cx="${xx + r}" cy="${y}" r="2.2" fill="${R.kul}"/>`;

/** Kichik statistika ustuni to'q fon ustida. */
function statistika(xx, y, ken, qiymat, izoh) {
  return `
    <text x="${xx + ken / 2}" y="${y + 40}" font-family="${SHRIFT}" font-size="42"
      font-weight="700" fill="${R.timMatn}" text-anchor="middle">${x(qiymat)}</text>
    <text x="${xx + ken / 2}" y="${y + 72}" font-family="${SHRIFT}" font-size="21"
      fill="${R.timKul}" text-anchor="middle">${x(izoh)}</text>`;
}

/**
 * @param {object} d
 * @param {string|null} d.rasmBase64  foydalanuvchi surati (base64, prefiksiz)
 * @param {string} d.mime
 * @param {string} d.ism              foydalanuvchi ismi (bo'lmasa yozilmaydi)
 * @param {object} d.tahlil           {taxminiy_yosh, teri_rangi, teri_turi, ball, xulosa, muammolar, prognoz}
 * @param {object[]} d.tavsiyalar     [{bosqich, nom, brend}]
 * @param {string} d.brend
 * @param {string|null} d.logoBase64  brend logotipi (ixtiyoriy)
 * @returns {string} SVG
 */
export function natijaSvg({ rasmBase64, mime = 'image/jpeg', ism = '', tahlil, tavsiyalar = [],
                            brend, logoBase64 = null, logoMime = 'image/png' }) {
  const t = tahlil || {};
  const muammolar = (t.muammolar || t.problems || []).slice(0, 4);
  const ball = Math.round(Number(t.ball ?? t.score ?? 0));
  const yosh = t.taxminiy_yosh || t.age_estimate || '';
  const teriTuri = t.teri_turi || t.skin_type || '';
  const teriRangi = t.teri_rangi || t.skin_tone || '';

  const qismlar = [];

  // ══════════════════════════════════════════════════
  // 1. BOSH QISM — to'q yashil fon
  // ══════════════════════════════════════════════════
  const RASM = 320;              // surat tomoni
  const RASM_Y = 118;
  const ONG = CHET + RASM + 36;  // ma'lumot ustuni chapdan shu yerdan boshlanadi
  const ONG_ENI = ENI - CHET - ONG;

  // Sarlavha satri
  if (logoBase64) {
    qismlar.push(`<clipPath id="logo"><rect x="${CHET}" y="40" width="44" height="44" rx="12"/></clipPath>
      <image href="data:${logoMime};base64,${logoBase64}" x="${CHET}" y="40"
        width="44" height="44" clip-path="url(#logo)" preserveAspectRatio="xMidYMid slice"/>`);
    qismlar.push(matn(brend, 71, { x: CHET + 58, olcham: 29, ogirlik: 700, rang: R.timMatn }));
  } else {
    qismlar.push(matn(brend, 71, { olcham: 29, ogirlik: 700, rang: R.timMatn }));
  }
  qismlar.push(matn('Teri tahlili', 71,
    { x: ENI - CHET, oxiri: true, olcham: 23, rang: R.timKul }));

  // ---- Surat: yuqori CHAP tarafda ----
  if (rasmBase64) {
    qismlar.push(`
      <clipPath id="kesim"><rect x="${CHET}" y="${RASM_Y}" width="${RASM}" height="${RASM}" rx="28"/></clipPath>
      <rect x="${CHET - 3}" y="${RASM_Y - 3}" width="${RASM + 6}" height="${RASM + 6}" rx="31"
        fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3"/>
      <image href="data:${mime};base64,${rasmBase64}" x="${CHET}" y="${RASM_Y}"
        width="${RASM}" height="${RASM}" clip-path="url(#kesim)" preserveAspectRatio="xMidYMid slice"/>`);
  } else {
    // Surat ochilmasa joyi bo'sh qolmasin — bosh silueti
    qismlar.push(`
      <rect x="${CHET}" y="${RASM_Y}" width="${RASM}" height="${RASM}" rx="28" fill="${R.timOch}"/>
      <circle cx="${CHET + RASM / 2}" cy="${RASM_Y + 128}" r="52" fill="rgba(255,255,255,.16)"/>
      <path d="M${CHET + RASM / 2 - 78} ${RASM_Y + 268}
               a78 78 0 0 1 156 0 z" fill="rgba(255,255,255,.16)"/>`);
  }

  // ---- Suratning YONIDA: ism va tavsif ----
  let oy = RASM_Y + 14;    // o'ng ustundagi joriy y

  if (ism) {
    qismlar.push(matn(kes(ism, ONG_ENI, 46, 700), oy + 34,
      { x: ONG, olcham: 46, ogirlik: 700, rang: R.timMatn }));
    oy += 62;
  } else {
    qismlar.push(matn('Teri holatingiz', oy + 34,
      { x: ONG, olcham: 42, ogirlik: 700, rang: R.timMatn }));
    oy += 58;
  }

  // Tavsif yorliqlari: yosh, teri turi
  const yorliqlar = [yosh ? `${yosh} yosh` : '', teriTuri ? `${teriTuri} teri` : '']
    .filter(Boolean);
  let yx = ONG;
  for (const s of yorliqlar) {
    const y1 = yorliq(yx, oy, s);
    if (yx + y1.ken > ENI - CHET) break;
    qismlar.push(y1.svg);
    yx += y1.ken + 10;
  }
  if (yorliqlar.length) oy += 60;

  // Teri rangi — yorliqqa sig'maydi, ikki qatorgacha matn
  if (teriRangi) {
    const qat = qatorlarga(teriRangi, ONG_ENI, 24).slice(0, 2);
    qat.forEach((q, i) => qismlar.push(matn(q, oy + 22 + i * 32,
      { x: ONG, olcham: 24, rang: R.timKul })));
    oy += qat.length * 32 + 12;
  }

  // ---- Ball: raqam + chiziq ----
  const ballY = Math.max(oy + 10, RASM_Y + RASM - 78);
  qismlar.push(matn(String(ball), ballY + 44,
    { x: ONG, olcham: 62, ogirlik: 700, rang: R.timMatn }));
  qismlar.push(matn('/ 100', ballY + 44,
    { x: ONG + String(ball).length * 38 + 12, olcham: 26, rang: R.timKul }));
  qismlar.push(matn('teri holati', ballY + 44,
    { x: ENI - CHET, oxiri: true, olcham: 23, rang: R.timKul }));
  qismlar.push(shkala(ONG, ballY + 62, ONG_ENI, ball,
    { balandlik: 12, fon: 'rgba(255,255,255,.18)', tus: ball >= 65 ? R.past : ball >= 40 ? R.orta : R.yuqori }));

  let y = Math.max(RASM_Y + RASM, ballY + 86) + 40;

  // ---- STATISTIKA: rangli fon ustida ----
  const eng = muammolar.slice().sort((a, b) => (b.foiz ?? 0) - (a.foiz ?? 0))[0];
  const prognoz = (t.prognoz || []).slice().sort((a, b) => (b.ehtimol ?? 0) - (a.ehtimol ?? 0))[0];

  const statH = 108;
  qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${statH}" rx="24"
    fill="rgba(255,255,255,.07)" stroke="${R.timChiziq}"/>`);
  const ustun = ICH / 3;
  qismlar.push(statistika(CHET, y + 6, ustun, String(muammolar.length), 'topilgan muammo'));
  qismlar.push(statistika(CHET + ustun, y + 6, ustun,
    eng ? `${Math.round(eng.foiz ?? 0)}%` : '—', kes(eng?.nom || 'muammo yo‘q', ustun - 20, 21)));
  qismlar.push(statistika(CHET + ustun * 2, y + 6, ustun,
    prognoz ? `${Math.round(prognoz.ehtimol ?? 0)}%` : '—',
    prognoz ? kes(prognoz.muddat ? `${prognoz.muddat}da xavf` : 'xavf ehtimoli', ustun - 20, 21)
            : 'xavf yo‘q'));
  // Ustunlar orasidagi ingichka chiziq
  for (const i of [1, 2]) {
    qismlar.push(`<line x1="${CHET + ustun * i}" y1="${y + 22}" x2="${CHET + ustun * i}"
      y2="${y + statH - 22}" stroke="${R.timChiziq}" stroke-width="2"/>`);
  }
  y += statH + 56;

  const BOSH_H = y;   // to'q fon shu yergacha (chetlarida 22px zaxira)

  // ══════════════════════════════════════════════════
  // 2. OQ QISM — tafsilot. Bu yerdagi hamma narsa KICHIKROQ.
  // ══════════════════════════════════════════════════
  y += 44;

  // ---- Xulosa ----
  const xulosa = t.xulosa || t.summary || '';
  if (xulosa) {
    const qat = qatorlarga(xulosa, ICH - 56, 25).slice(0, 4);
    const h = 34 + qat.length * 34;
    qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${h}" rx="20"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    qat.forEach((q, i) => qismlar.push(matn(q, y + 40 + i * 34, { x: CHET + 28, olcham: 25 })));
    y += h + 36;
  }

  // ---- Muammolar: sababi va yechimi bilan ----
  if (muammolar.length) {
    qismlar.push(matn('Nima topildi', y + 26, { olcham: 30, ogirlik: 700 }));
    y += 54;

    for (const m of muammolar) {
      const foiz = Math.round(Number(m.foiz ?? 40));
      const boshY = y;
      const ichki = [];
      let my = y + 34;

      ichki.push(matn(kes(m.nom, ICH - 160, 26, 700), my, { x: CHET + 22, olcham: 26, ogirlik: 700 }));
      ichki.push(matn(`${foiz}%`, my,
        { x: ENI - CHET - 22, oxiri: true, olcham: 26, ogirlik: 700, rang: rang(foiz) }));
      my += 16;
      ichki.push(shkala(CHET + 22, my, ICH - 44, foiz, { balandlik: 10 }));
      my += 34;

      if (m.zona) {
        ichki.push(matn(kes(m.zona, ICH - 60, 22), my + 6, { x: CHET + 22, olcham: 22, rang: R.kul }));
        my += 30;
      }
      if (m.sabab) {
        const qat = qatorlarga(m.sabab, ICH - 92, 23).slice(0, 2);
        ichki.push(belgiSabab(CHET + 22, my + 10));
        qat.forEach((q, i) => ichki.push(matn(q, my + 18 + i * 30, { x: CHET + 52, olcham: 23, rang: R.kul })));
        my += qat.length * 30 + 6;
      }
      if (m.yechim) {
        const qat = qatorlarga(m.yechim, ICH - 92, 23).slice(0, 2);
        ichki.push(belgiOk(CHET + 22, my + 10));
        qat.forEach((q, i) => ichki.push(matn(q, my + 18 + i * 30, { x: CHET + 52, olcham: 23 })));
        my += qat.length * 30 + 6;
      }

      const h = my - boshY + 16;
      qismlar.push(`<rect x="${CHET}" y="${boshY}" width="${ICH}" height="${h}" rx="20"
        fill="${R.karta}" stroke="${R.chiziq}"/>`);
      qismlar.push(...ichki);
      y = boshY + h + 14;
    }
    y += 22;
  }

  // ---- Tavsiya etilgan mahsulotlar ----
  if (tavsiyalar.length) {
    qismlar.push(matn('Tavsiya etilgan parvarish', y + 26, { olcham: 30, ogirlik: 700 }));
    y += 52;
    const royxat = tavsiyalar.slice(0, 6);
    const h = 20 + royxat.length * 62;
    qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${h}" rx="20"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    let yy = y + 16;
    royxat.forEach((r, i) => {
      qismlar.push(`<circle cx="${CHET + 44}" cy="${yy + 26}" r="17" fill="${R.urgu}"/>`);
      qismlar.push(matn(String(i + 1), yy + 34,
        { x: CHET + 44, markaz: true, olcham: 21, ogirlik: 700, rang: '#fff' }));
      qismlar.push(matn(kes(r.nom, ICH - 150, 24, 600), yy + 22,
        { x: CHET + 76, olcham: 24, ogirlik: 600 }));
      qismlar.push(matn(kes([r.bosqich, r.brend].filter(Boolean).join(' · '), ICH - 150, 21),
        yy + 48, { x: CHET + 76, olcham: 21, rang: R.kul }));
      yy += 62;
    });
    y += h + 34;
  }

  // ---- Pastki qism ----
  qismlar.push(`<line x1="${CHET}" y1="${y}" x2="${ENI - CHET}" y2="${y}"
    stroke="${R.chiziq}" stroke-width="2"/>`);
  y += 36;
  qismlar.push(matn(brend, y, { olcham: 23, ogirlik: 700, rang: R.urgu }));
  qismlar.push(matn(sana(), y, { x: ENI - CHET, oxiri: true, olcham: 21, rang: R.kul }));
  y += 32;
  qismlar.push(matn('Bu tibbiy tashxis emas — kosmetologik tavsiya.', y,
    { olcham: 20, rang: R.kul }));
  y += 44;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <defs>
    <linearGradient id="bosh" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${R.tim}"/><stop offset="1" stop-color="${R.timOch}"/>
    </linearGradient>
  </defs>
  <rect width="${ENI}" height="${H}" fill="${R.fon}"/>
  <path d="M0 0 H${ENI} V${BOSH_H - 34} Q${ENI / 2} ${BOSH_H + 26} 0 ${BOSH_H - 34} Z" fill="url(#bosh)"/>
  ${qismlar.join('\n  ')}
</svg>`;
}
