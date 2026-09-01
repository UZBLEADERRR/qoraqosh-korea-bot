// Tahlil natijasining rasmi.
//
// Tuzilishi (yuqoridan pastga):
//   1. TO'Q RANGLI BOSH QISM — chapda surat, uning ustida muammolar
//      RAQAMLANGAN DOIRA bilan belgilangan; o'ng yonida teri tavsifi
//      (taxminiy yosh, teri turi va rangi) va umumiy ball. Statistika shu
//      rangli fon ustida.
//   2. PASTKI QISM — har bir muammo o'z raqami bilan (suratdagi doira
//      raqami bilan bir xil), keyin tavsiya etilgan mahsulotlar rasmi bilan
//      kichik kartochkalarda.
//
// ISM YOZILMAYDI: bitta telefondan bir necha odam surat yuklashi mumkin.
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi, o'rnida bo'sh
// kvadrat qoladi. Barcha belgilar vektor shakl bilan chiziladi.
import { x, qatorlarga, kes, SHRIFT, joyniKochir } from './chiz.js';

const ENI = 1080;
const CHET = 56;
const ICH = ENI - CHET * 2;

const R = {
  fon:      '#F2EDE8',   // pastki qismning iliq foni (oq EMAS)
  karta:    '#FFFFFF',
  matn:     '#241C1A',
  kul:      '#6F625C',
  chiziq:   '#E2D6CE',
  urgu:     '#B4654A',

  // Bosh qismning to'q yashil foni
  tim:      '#12362A',
  timOch:   '#1B4A39',
  timMatn:  '#FFFFFF',
  timKul:   'rgba(255,255,255,.72)',
  timChiziq:'rgba(255,255,255,.16)',

  yuqori:  '#D9604A',   // kuchli muammo
  orta:    '#D99A3C',
  past:    '#3E9E70',   // yengil / yaxshi
};

// Muammo kartochkasining fon rangi — darajaga qarab juda och tus.
// Oq fon "bo'sh varaq" ta'sirini berardi.
const FON_TUS = { 3: '#FCEDE9', 2: '#FBF2E2', 1: '#EAF4EE' };

const rang = (foiz) => (foiz >= 70 ? R.yuqori : foiz >= 40 ? R.orta : R.past);
const daraja = (foiz) => (foiz >= 70 ? 3 : foiz >= 40 ? 2 : 1);

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

/** Raqamli doira — suratda ham, ro'yxatda ham bir xil ko'rinadi. */
function raqamliDoira(cx, cy, r, raqam, tus, { qalin = 5, fonli = false } = {}) {
  const belgiR = Math.min(22, Math.max(15, r * 0.32));
  return `
    ${fonli ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tus}" fill-opacity=".14"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tus}" stroke-width="${qalin}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
    <circle cx="${cx + r * 0.72}" cy="${cy - r * 0.72}" r="${belgiR}" fill="${tus}"/>
    <text x="${cx + r * 0.72}" y="${cy - r * 0.72 + belgiR * 0.36}" font-family="${SHRIFT}"
      font-size="${Math.round(belgiR * 1.15)}" font-weight="700" fill="#fff"
      text-anchor="middle">${raqam}</text>`;
}

/** Ro'yxatdagi tartib raqami — suratdagi doira raqami bilan bir xil. */
const raqamNishoni = (cx, cy, r, raqam, tus) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${tus}"/>
  <text x="${cx}" y="${cy + r * 0.36}" font-family="${SHRIFT}" font-size="${Math.round(r * 1.15)}"
    font-weight="700" fill="#fff" text-anchor="middle">${raqam}</text>`;

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
 * @param {{eni:number,boyi:number}|null} d.rasmOlchami  doira joyini to'g'ri
 *        qo'yish uchun asl surat o'lchami
 * @param {object} d.tahlil           {taxminiy_yosh, teri_rangi, teri_turi, ball, xulosa, muammolar, prognoz}
 * @param {object[]} d.tavsiyalar     [{bosqich, nom, brend, rasmBase64, rasmMime}]
 * @param {string} d.brend
 * @param {string|null} d.logoBase64  brend logotipi (ixtiyoriy)
 * @returns {string} SVG
 */
export function natijaSvg({ rasmBase64, mime = 'image/jpeg', rasmOlchami = null,
                            tahlil, tavsiyalar = [], brend,
                            logoBase64 = null, logoMime = 'image/png' }) {
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
  const RASM = 340;              // surat tomoni
  const RASM_Y = 118;
  const ONG = CHET + RASM + 34;  // ma'lumot ustuni chapdan shu yerdan
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
      <g clip-path="url(#kesim)">
        <image href="data:${mime};base64,${rasmBase64}" x="${CHET}" y="${RASM_Y}"
          width="${RASM}" height="${RASM}" preserveAspectRatio="xMidYMid slice"/>`);

    // ---- Muammolar aynan KO'RINGAN JOYIDA belgilanadi ----
    // Doira raqami quyidagi ro'yxatdagi raqam bilan bir xil: odam
    // «2-belgi qayerda ekan?» deb izlab o'tirmaydi.
    muammolar.forEach((m, i) => {
      if (!m.joy) return;
      const p = joyniKochir(rasmOlchami, m.joy, CHET, RASM_Y, RASM);
      if (!p) return;
      qismlar.push(raqamliDoira(p.x, p.y, p.r, i + 1, rang(Number(m.foiz ?? 40))));
    });
    qismlar.push('</g>');
  } else {
    // Surat ochilmasa joyi bo'sh qolmasin — bosh silueti
    qismlar.push(`
      <rect x="${CHET}" y="${RASM_Y}" width="${RASM}" height="${RASM}" rx="28" fill="${R.timOch}"/>
      <circle cx="${CHET + RASM / 2}" cy="${RASM_Y + 136}" r="55" fill="rgba(255,255,255,.16)"/>
      <path d="M${CHET + RASM / 2 - 82} ${RASM_Y + 286}
               a82 82 0 0 1 164 0 z" fill="rgba(255,255,255,.16)"/>`);
  }

  // ---- Suratning YONIDA: teri tavsifi ----
  let oy = RASM_Y + 10;

  qismlar.push(matn('Teri holati', oy + 34,
    { x: ONG, olcham: 42, ogirlik: 700, rang: R.timMatn }));
  oy += 56;

  const yorliqlar = [yosh ? `${yosh} yosh` : '', teriTuri ? `${teriTuri} teri` : '']
    .filter(Boolean);
  let yx = ONG;
  for (const s of yorliqlar) {
    const y1 = yorliq(yx, oy, s);
    if (yx + y1.ken > ENI - CHET) break;
    qismlar.push(y1.svg);
    yx += y1.ken + 10;
  }
  if (yorliqlar.length) oy += 58;

  if (teriRangi) {
    const qat = qatorlarga(teriRangi, ONG_ENI, 24).slice(0, 2);
    qat.forEach((q, i) => qismlar.push(matn(q, oy + 22 + i * 32,
      { x: ONG, olcham: 24, rang: R.timKul })));
    oy += qat.length * 32 + 10;
  }

  // ---- Ball ----
  const ballY = Math.max(oy + 6, RASM_Y + RASM - 78);
  qismlar.push(matn(String(ball), ballY + 44,
    { x: ONG, olcham: 62, ogirlik: 700, rang: R.timMatn }));
  qismlar.push(matn('/ 100', ballY + 44,
    { x: ONG + String(ball).length * 38 + 12, olcham: 26, rang: R.timKul }));
  qismlar.push(matn('teri holati', ballY + 44,
    { x: ENI - CHET, oxiri: true, olcham: 23, rang: R.timKul }));
  qismlar.push(shkala(ONG, ballY + 62, ONG_ENI, ball,
    { balandlik: 12, fon: 'rgba(255,255,255,.18)',
      tus: ball >= 65 ? R.past : ball >= 40 ? R.orta : R.yuqori }));

  let y = Math.max(RASM_Y + RASM, ballY + 86) + 38;

  // ---- STATISTIKA: rangli fon ustida ----
  const eng = muammolar.slice().sort((a, b) => (b.foiz ?? 0) - (a.foiz ?? 0))[0];
  const prognoz = (t.prognoz || t.forecast || [])
    .slice().sort((a, b) => (b.ehtimol ?? 0) - (a.ehtimol ?? 0))[0];

  const statH = 108;
  qismlar.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${statH}" rx="24"
    fill="rgba(255,255,255,.07)" stroke="${R.timChiziq}"/>`);
  const ustun = ICH / 3;
  qismlar.push(statistika(CHET, y + 6, ustun, String(muammolar.length), 'topilgan belgi'));
  qismlar.push(statistika(CHET + ustun, y + 6, ustun,
    eng ? `${Math.round(eng.foiz ?? 0)}%` : '—', kes(eng?.nom || 'belgi yo‘q', ustun - 20, 21)));
  qismlar.push(statistika(CHET + ustun * 2, y + 6, ustun,
    prognoz ? `${Math.round(prognoz.ehtimol ?? 0)}%` : '—',
    prognoz ? kes(prognoz.muddat ? `${prognoz.muddat}da xavf` : 'xavf ehtimoli', ustun - 20, 21)
            : 'xavf yo‘q'));
  for (const i of [1, 2]) {
    qismlar.push(`<line x1="${CHET + ustun * i}" y1="${y + 22}" x2="${CHET + ustun * i}"
      y2="${y + statH - 22}" stroke="${R.timChiziq}" stroke-width="2"/>`);
  }
  y += statH + 56;

  const BOSH_H = y;   // to'q fon shu yergacha

  // ══════════════════════════════════════════════════
  // 2. PASTKI QISM — belgilar va mahsulotlar
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
    y += h + 34;
  }

  // ---- Topilgan belgilar ----
  if (muammolar.length) {
    qismlar.push(matn('Suratda topilgan belgilar', y + 26, { olcham: 30, ogirlik: 700 }));
    y += 50;

    muammolar.forEach((m, i) => {
      const foiz = Math.round(Number(m.foiz ?? 40));
      const d = daraja(foiz);
      const tus = rang(foiz);
      const boshY = y;
      const ichki = [];

      // Raqam — suratdagi doira raqami bilan bir xil
      ichki.push(raqamNishoni(CHET + 44, boshY + 44, 21, i + 1, tus));

      ichki.push(matn(kes(m.nom, ICH - 220, 27, 700), boshY + 40,
        { x: CHET + 78, olcham: 27, ogirlik: 700 }));
      ichki.push(matn(`${foiz}%`, boshY + 40,
        { x: ENI - CHET - 22, oxiri: true, olcham: 27, ogirlik: 700, rang: tus }));

      let my = boshY + 56;
      ichki.push(shkala(CHET + 78, my, ICH - 100 - 78 + 22, foiz, { balandlik: 10 }));
      my += 30;

      if (m.zona) {
        const qat = qatorlarga(m.zona, ICH - 120, 23).slice(0, 2);
        qat.forEach((q, k) => ichki.push(matn(q, my + 20 + k * 30,
          { x: CHET + 78, olcham: 23, rang: R.kul })));
        my += qat.length * 30 + 4;
      }

      const h = my - boshY + 14;
      qismlar.push(`<rect x="${CHET}" y="${boshY}" width="${ICH}" height="${h}" rx="20"
        fill="${FON_TUS[d]}" stroke="${tus}" stroke-opacity=".28"/>
        <rect x="${CHET}" y="${boshY}" width="7" height="${h}" rx="3.5" fill="${tus}"/>`);
      qismlar.push(...ichki);
      y = boshY + h + 12;
    });
    y += 20;
  }

  // ---- Tavsiya etilgan mahsulotlar: rasmli kichik kartochkalar ----
  if (tavsiyalar.length) {
    qismlar.push(matn('Sizga mos parvarish', y + 26, { olcham: 30, ogirlik: 700 }));
    y += 46;

    const royxat = tavsiyalar.slice(0, 4);
    const oraliq = 14;
    const kartaEni = Math.floor((ICH - oraliq * (royxat.length - 1)) / royxat.length);
    const rasmH = Math.round(kartaEni * 0.78);
    const kartaH = rasmH + 108;

    royxat.forEach((r, i) => {
      const kx = CHET + i * (kartaEni + oraliq);
      qismlar.push(`<rect x="${kx}" y="${y}" width="${kartaEni}" height="${kartaH}" rx="18"
        fill="${R.karta}" stroke="${R.chiziq}"/>`);

      // Mahsulot rasmi (bo'lmasa — tartib raqami bilan to'q maydon)
      if (r.rasmBase64) {
        qismlar.push(`<clipPath id="m${i}"><rect x="${kx + 1}" y="${y + 1}"
            width="${kartaEni - 2}" height="${rasmH}" rx="17"/></clipPath>
          <image href="data:${r.rasmMime || 'image/png'};base64,${r.rasmBase64}"
            x="${kx + 1}" y="${y + 1}" width="${kartaEni - 2}" height="${rasmH}"
            clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
      } else {
        qismlar.push(`<rect x="${kx + 1}" y="${y + 1}" width="${kartaEni - 2}" height="${rasmH}"
            rx="17" fill="#EFE6E0"/>
          <text x="${kx + kartaEni / 2}" y="${y + rasmH / 2 + 14}" font-family="${SHRIFT}"
            font-size="40" font-weight="700" fill="${R.urgu}" text-anchor="middle">${i + 1}</text>`);
      }

      // Nima uchun — 1-2 so'z (bosqich nomi), urgu rangida
      qismlar.push(matn(kes(r.bosqich || 'Parvarish', kartaEni - 24, 21, 700), y + rasmH + 34,
        { x: kx + 12, olcham: 21, ogirlik: 700, rang: R.urgu }));

      // Nomi — ikki qatorgacha
      const nomQat = qatorlarga(r.nom, kartaEni - 24, 20, 600).slice(0, 2);
      nomQat.forEach((q, k) => qismlar.push(matn(q, y + rasmH + 62 + k * 26,
        { x: kx + 12, olcham: 20, ogirlik: 600 })));

      // Brend kartochkaning PASTIGA qadaladi: nomi bir yoki ikki qator
      // bo'lishiga qarab suzib yurmasin, qator bir tekis ko'rinsin.
      if (r.brend) {
        qismlar.push(matn(kes(r.brend, kartaEni - 24, 18), y + kartaH - 16,
          { x: kx + 12, olcham: 18, rang: R.kul }));
      }
    });
    y += kartaH + 34;
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
