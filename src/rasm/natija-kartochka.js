// Tahlil natijasining rasmi: tepada foydalanuvchi surati, pastida natija.
// Bot ham, Mini App ham SHU rasmni oladi — ikkalasida bir xil ko'rinadi.
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi, o'rnida bo'sh
// kvadrat qoladi. Barcha belgilar vektor shakl bilan chiziladi.
import { x, qatorlarga, kes, SHRIFT } from './chiz.js';

const ENI = 1080;
const CHET = 64;
const ICH = ENI - CHET * 2;

const R = {
  fon:     '#FBF7F5',
  karta:   '#FFFFFF',
  matn:    '#2E2320',
  kul:     '#8A7A73',
  chiziq:  '#EDE2DC',
  urgu:    '#B4654A',
  yuqori:  '#D2604A',   // kuchli muammo
  orta:    '#DFA046',
  past:    '#5C9A72',   // yengil / yaxshi
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
  font-size="${o.olcham ?? 30}" font-weight="${o.ogirlik ?? 400}" fill="${o.rang ?? R.matn}"
  ${o.oxiri ? 'text-anchor="end"' : ''} ${o.markaz ? 'text-anchor="middle"' : ''}>${x(s)}</text>`;

/** Yumaloq uchli progress chiziq. */
function shkala(y, foiz, kenglik = ICH) {
  const t = Math.max(0, Math.min(100, foiz));
  const to = Math.max(16, Math.round((kenglik * t) / 100));
  return `<rect x="${CHET}" y="${y}" width="${kenglik}" height="16" rx="8" fill="${R.chiziq}"/>
    <rect x="${CHET}" y="${y}" width="${to}" height="16" rx="8" fill="${rang(t)}"/>`;
}

/** Ball uchun halqa (donut). */
function ballHalqasi(cx, cy, r, ball) {
  const aylana = 2 * Math.PI * r;
  const to = (aylana * Math.max(0, Math.min(100, ball))) / 100;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.28)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${to.toFixed(1)} ${(aylana - to).toFixed(1)}"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 12}" font-family="${SHRIFT}" font-size="46" font-weight="700"
      fill="#fff" text-anchor="middle">${Math.round(ball)}</text>
    <text x="${cx}" y="${cy + 44}" font-family="${SHRIFT}" font-size="19"
      fill="rgba(255,255,255,.85)" text-anchor="middle">ball</text>`;
}

/** Kichik yorliq (chip). */
function yorliq(xx, y, s, ken) {
  return `<rect x="${xx}" y="${y}" width="${ken}" height="52" rx="26" fill="${R.karta}" stroke="${R.chiziq}"/>
    <text x="${xx + ken / 2}" y="${y + 34}" font-family="${SHRIFT}" font-size="25"
      fill="${R.matn}" text-anchor="middle">${x(s)}</text>`;
}

/** "Tasdiq" belgisi — emoji o'rniga vektor. */
const belgiOk = (xx, y, r = 13) => `
  <circle cx="${xx + r}" cy="${y}" r="${r}" fill="${R.past}"/>
  <path d="M${xx + r - 6} ${y} l4 4 l8 -8" stroke="#fff" stroke-width="3"
    fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

/** "Joy" belgisi (pin). */
const belgiJoy = (xx, y) => `
  <path d="M${xx + 8} ${y - 14} a8 8 0 0 1 8 8 c0 6 -8 15 -8 15 s-8 -9 -8 -15 a8 8 0 0 1 8 -8 z"
    fill="${R.kul}"/><circle cx="${xx + 8}" cy="${y - 6}" r="3" fill="${R.fon}"/>`;

/**
 * @param {object} d
 * @param {string|null} d.rasmBase64  foydalanuvchi surati (base64, prefiksiz)
 * @param {string} d.mime
 * @param {object} d.tahlil           {taxminiy_yosh, teri_rangi, teri_turi, ball, xulosa, muammolar, tavsiya}
 * @param {object[]} d.tavsiyalar     [{bosqich, nom, brend}]
 * @param {string} d.brend
 * @returns {string} SVG
 */
export function natijaSvg({ rasmBase64, mime = 'image/jpeg', tahlil, tavsiyalar = [], brend }) {
  const t = tahlil || {};
  const muammolar = (t.muammolar || t.problems || []).slice(0, 4);
  const ball = Number(t.ball ?? t.score ?? 0);

  const qismlar = [];
  let y = 0;

  // ═══ 1. Sarlavha ═══
  qismlar.push(matn(brend, 62, { olcham: 34, ogirlik: 700, rang: R.urgu }));
  qismlar.push(matn('Teri tahlili', 62, { olcham: 26, rang: R.kul, x: ENI - CHET, oxiri: true }));
  y = 96;

  // ═══ 2. Surat ═══
  const rasmH = 660;
  if (rasmBase64) {
    qismlar.push(`
      <clipPath id="kesim"><rect x="${CHET}" y="${y}" width="${ICH}" height="${rasmH}" rx="36"/></clipPath>
      <g clip-path="url(#kesim)">
        <image href="data:${mime};base64,${rasmBase64}" x="${CHET}" y="${y}"
          width="${ICH}" height="${rasmH}" preserveAspectRatio="xMidYMid slice"/>
        <rect x="${CHET}" y="${y + rasmH - 240}" width="${ICH}" height="240" fill="url(#qora)"/>
      </g>`);
    // Suratdagi yozuv
    qismlar.push(matn(t.teri_turi || t.skin_type ? `${t.teri_turi || t.skin_type} teri` : 'Teri holati',
      y + rasmH - 96, { x: CHET + 44, olcham: 38, ogirlik: 700, rang: '#fff' }));
    qismlar.push(matn([t.taxminiy_yosh || t.age_estimate, t.teri_rangi || t.skin_tone]
      .filter(Boolean).join(' · '), y + rasmH - 50,
      { x: CHET + 44, olcham: 26, rang: 'rgba(255,255,255,.88)' }));
    qismlar.push(ballHalqasi(ENI - CHET - 96, y + rasmH - 110, 62, ball));
    y += rasmH + 56;
  } else {
    // Surat yo'q bo'lsa — ball kartochkasi
    qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="200" rx="32" fill="${R.karta}" stroke="${R.chiziq}"/>`);
    qismlar.push(matn(`${Math.round(ball)} / 100`, y + 108,
      { x: CHET + 44, olcham: 62, ogirlik: 700, rang: R.urgu }));
    qismlar.push(matn([t.taxminiy_yosh || t.age_estimate, `${t.teri_turi || t.skin_type || ''} teri`]
      .filter(Boolean).join(' · '), y + 152, { x: CHET + 44, olcham: 27, rang: R.kul }));
    y += 256;
  }

  // ═══ 3. Xulosa ═══
  const xulosa = t.xulosa || t.summary || '';
  if (xulosa) {
    const qat = qatorlarga(xulosa, ICH - 72, 29);
    const balandlik = 44 + qat.length * 42;
    qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${balandlik}" rx="26" fill="${R.karta}" stroke="${R.chiziq}"/>`);
    qat.forEach((q, i) => qismlar.push(matn(q, y + 52 + i * 42, { x: CHET + 36, olcham: 29 })));
    y += balandlik + 48;
  }

  // ═══ 4. Muammolar ═══
  if (muammolar.length) {
    qismlar.push(matn('Nima topildi', y + 34, { olcham: 40, ogirlik: 700 }));
    y += 82;

    for (const m of muammolar) {
      const foiz = Number(m.foiz ?? 40);
      qismlar.push(matn(kes(m.nom, ICH - 130, 32, 600), y + 30, { olcham: 32, ogirlik: 700 }));
      qismlar.push(matn(`${foiz}%`, y + 30,
        { x: ENI - CHET, oxiri: true, olcham: 32, ogirlik: 700, rang: rang(foiz) }));
      y += 52;
      qismlar.push(shkala(y, foiz));
      y += 48;

      if (m.zona) {
        qismlar.push(belgiJoy(CHET, y + 14));
        for (const q of qatorlarga(m.zona, ICH - 40, 26).slice(0, 2)) {
          qismlar.push(matn(q, y + 22, { x: CHET + 30, olcham: 26, rang: R.kul }));
          y += 36;
        }
        y += 4;
      }
      if (m.yechim) {
        const qat = qatorlarga(m.yechim, ICH - 44, 27).slice(0, 3);
        qismlar.push(belgiOk(CHET, y + 14));
        qat.forEach((q, i) => qismlar.push(matn(q, y + 22 + i * 38, { x: CHET + 40, olcham: 27 })));
        y += qat.length * 38 + 6;
      }
      y += 30;
    }
    y += 12;
  }

  // ═══ 5. Tavsiya ═══
  if (tavsiyalar.length) {
    qismlar.push(matn('Tavsiya etilgan parvarish', y + 34, { olcham: 40, ogirlik: 700 }));
    y += 74;
    const balandlik = 28 + tavsiyalar.length * 78;
    qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${balandlik}" rx="28" fill="${R.karta}" stroke="${R.chiziq}"/>`);
    let yy = y + 22;
    tavsiyalar.slice(0, 6).forEach((r, i) => {
      qismlar.push(`<circle cx="${CHET + 52}" cy="${yy + 32}" r="21" fill="${R.urgu}"/>`);
      qismlar.push(matn(String(i + 1), yy + 42,
        { x: CHET + 52, markaz: true, olcham: 25, ogirlik: 700, rang: '#fff' }));
      qismlar.push(matn(kes(r.nom, ICH - 190, 28, 600), yy + 28,
        { x: CHET + 92, olcham: 28, ogirlik: 600 }));
      qismlar.push(matn(kes([r.bosqich, r.brend].filter(Boolean).join(' · '), ICH - 190, 24),
        yy + 60, { x: CHET + 92, olcham: 24, rang: R.kul }));
      yy += 78;
    });
    y += balandlik + 46;
  }

  // ═══ 6. Pastki qism ═══
  qismlar.push(`<line x1="${CHET}" y1="${y}" x2="${ENI - CHET}" y2="${y}" stroke="${R.chiziq}" stroke-width="2"/>`);
  y += 44;
  qismlar.push(matn(brend, y, { olcham: 26, ogirlik: 700, rang: R.urgu }));
  qismlar.push(matn(sana(), y, { x: ENI - CHET, oxiri: true, olcham: 24, rang: R.kul }));
  y += 40;
  qismlar.push(matn('Bu tibbiy tashxis emas — kosmetologik tavsiya.', y,
    { olcham: 23, rang: R.kul }));
  y += 52;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <defs>
    <linearGradient id="qora" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,.78)"/>
    </linearGradient>
  </defs>
  <rect width="${ENI}" height="${H}" fill="${R.fon}"/>
  ${qismlar.join('\n  ')}
</svg>`;
}
