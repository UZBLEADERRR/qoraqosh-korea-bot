// Tahlil natijasining rasmi.
//
// Tuzilishi:
//   1. RANGLI SARLAVHA — brend, ichida kartochka: chapda surat, o'ng yonida
//      teri tavsifi va ball, o'ng chekkada ball halqasi. Ostida uchta
//      ko'rsatkich (belgi soni, eng kuchli belgi, xavf ehtimoli).
//   2. OCH FON — topilgan belgilar ro'yxati va tavsiya etilgan mahsulotlar
//      rasmi bilan.
//
// Ranglar MAVZUDAN olinadi (src/lib/mavzu.js) — admin panelda tanlanadi.
//
// Suratga doira CHIZILMAYDI: belgi qayerdaligi ro'yxatdagi «📍 zona»
// matnida yozilgan, doira esa suratni bulg'ab, asosiy raqamlarni
// ko'zdan qochirardi.
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi, o'rnida bo'sh
// kvadrat qoladi. Barcha belgilar vektor shakl bilan chiziladi.
import { x, qatorlarga, kes, SHRIFT } from './chiz.js';
import { palitra, darajaRangi, yoritish, TARTIB_RANG } from '../lib/mavzu.js';

const ENI = 1080;
const CHET = 40;

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sana(d = new Date()) {
  // Toshkent vaqti (UTC+5)
  const t = new Date(d.getTime() + 5 * 3600 * 1000);
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const matn = (s, y, o = {}) => `<text x="${o.x ?? CHET}" y="${y}" font-family="${SHRIFT}"
  font-size="${o.olcham ?? 26}" font-weight="${o.ogirlik ?? 400}" fill="${o.rang ?? '#000'}"
  ${o.oxiri ? 'text-anchor="end"' : ''} ${o.markaz ? 'text-anchor="middle"' : ''}
  ${o.shaffof ? `fill-opacity="${o.shaffof}"` : ''}>${x(s)}</text>`;

/** Yumaloq uchli progress chiziq. */
const shkala = (xx, y, kenglik, foiz, tus, { balandlik = 14, fon } = {}) => {
  const t = Math.max(0, Math.min(100, foiz));
  const to = Math.max(balandlik, Math.round((kenglik * t) / 100));
  const r = balandlik / 2;
  return `<rect x="${xx}" y="${y}" width="${kenglik}" height="${balandlik}" rx="${r}" fill="${fon}"/>
    <rect x="${xx}" y="${y}" width="${to}" height="${balandlik}" rx="${r}" fill="${tus}"/>`;
};

// ──────────────── Vektor belgilar ────────────────
// Har biri 24×24 koordinatalar tizimida chizilgan; `belgiChiz` uni
// kerakli joyga ko'chiradi va kattalashtiradi.

const BELGILAR = {
  // Hujjat — «topilgan belgi»
  hujjat: 'M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v4h4 M9 12h6 M9 16h6',
  // Tomchi — «terining yog'liligi»
  tomchi: 'M12 3c3.5 4.2 5.5 7 5.5 9.6A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.4C6.5 10 8.5 7.2 12 3z',
  // Qalqon — «xavf»
  qalqon: 'M12 3l7 2.5v5.5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V5.5L12 3z',
  // Barg — brend nishoni (logotip bo'lmaganda)
  barg: 'M12 21c0-6 1.5-9.5 5-12.5C19.5 6.4 20 4.6 20 3c-2 0-4.6.4-6.8 1.8'
      + 'C9.6 6.6 8 9.4 8 12.4c0 1.2.2 2.2.6 3.1M12 21c0-3-.6-5.2-1.8-6.9'
      + 'C8.8 12 6.6 11 4 10.6c0 2 .3 3.8 1.2 5.2C6.4 17.8 8.6 19 11 19.4',
  // «i» — xulosa oldidagi belgi
  axborot: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 10v7 M12 7.2v.1',
  // Yulduzcha — sarlavha va halqa ichida
  yulduz: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
};

/** @param {string} kalit  BELGILAR dan */
function belgiChiz(kalit, cx, cy, olcham, tus, { toldirilgan = false, qalin = 1.8 } = {}) {
  const k = olcham / 24;
  return `<g transform="translate(${cx - olcham / 2} ${cy - olcham / 2}) scale(${k})">
    <path d="${BELGILAR[kalit] || BELGILAR.hujjat}"
      fill="${toldirilgan ? tus : 'none'}" stroke="${tus}" stroke-width="${qalin}"
      stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

/** Yumaloq kvadrat ichidagi belgi — ko'rsatkichlar yonidagi plitka. */
const belgiPlitka = (xx, y, tomon, kalit, tus, fon, ozgacha = {}) => `
  <rect x="${xx}" y="${y}" width="${tomon}" height="${tomon}" rx="${tomon * 0.3}" fill="${fon}"/>
  ${belgiChiz(kalit, xx + tomon / 2, y + tomon / 2, tomon * 0.56, tus, ozgacha)}`;

/** Raqamli nishon — ro'yxatda va mahsulot kartochkasida. */
const raqamNishoni = (cx, cy, r, raqam, tus) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${tus}"/>
  <text x="${cx}" y="${cy + r * 0.36}" font-family="${SHRIFT}" font-size="${Math.round(r * 1.1)}"
    font-weight="700" fill="#fff" text-anchor="middle">${raqam}</text>`;

/**
 * @param {object} d
 * @param {string|null} d.rasmBase64  foydalanuvchi surati (base64, prefiksiz)
 * @param {string} d.mime
 * @param {object} d.tahlil           {taxminiy_yosh, teri_rangi, teri_turi, ball, xulosa, muammolar, prognoz}
 * @param {object[]} d.tavsiyalar     [{bosqich, nom, brend, rasmBase64, rasmMime}]
 * @param {string} d.brend
 * @param {string|null} d.logoBase64  brend logotipi (ixtiyoriy)
 * @param {object} [d.mavzu]          {asosiy, fon, urgu} — admin tanlagan ranglar
 * @returns {string} SVG
 */
export function natijaSvg({ rasmBase64, mime = 'image/jpeg', tahlil, tavsiyalar = [],
                            brend, logoBase64 = null, logoMime = 'image/png', mavzu = {} }) {
  const R = palitra(mavzu);
  const oq = R.asosiyMatn;                       // sarlavha ustidagi matn
  const shaffofFon = oq === '#FFFFFF' ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const tus = (a) => `${shaffofFon}${a})`;

  const t = tahlil || {};
  const muammolar = (t.muammolar || t.problems || []).slice(0, 5);
  const ball = Math.round(Number(t.ball ?? t.score ?? 0));
  const yosh = t.taxminiy_yosh || t.age_estimate || '';
  const teriTuri = t.teri_turi || t.skin_type || '';
  const teriRangi = t.teri_rangi || t.skin_tone || '';

  const q = [];

  // ══════════════════════════════════════════════
  // 1. SARLAVHA
  // ══════════════════════════════════════════════
  const P = 44;                       // sarlavha ichidagi chekka
  const NISHON = 56;

  // Brend nishoni
  if (logoBase64) {
    q.push(`<clipPath id="logo"><rect x="${P}" y="34" width="${NISHON}" height="${NISHON}" rx="17"/></clipPath>
      <image href="data:${logoMime};base64,${logoBase64}" x="${P}" y="34"
        width="${NISHON}" height="${NISHON}" clip-path="url(#logo)" preserveAspectRatio="xMidYMid slice"/>`);
  } else {
    q.push(`<rect x="${P}" y="34" width="${NISHON}" height="${NISHON}" rx="17" fill="${tus(0.16)}"/>`);
    q.push(belgiChiz('barg', P + NISHON / 2, 34 + NISHON / 2, 32, oq, { qalin: 2 }));
  }
  q.push(matn(brend, 78, { x: P + NISHON + 18, olcham: 38, ogirlik: 700, rang: oq }));
  q.push(matn('Teri tahlili', 72, { x: ENI - P - 34, oxiri: true, olcham: 25, rang: oq, shaffof: 0.85 }));
  q.push(belgiChiz('yulduz', ENI - P - 12, 62, 26, oq, { qalin: 1.6 }));

  // ── Ichki kartochka ──
  const IK_Y = 112;
  const IK_X = CHET;
  const IK_ENI = ENI - CHET * 2;

  const RASM_X = IK_X + 24;
  const RASM_Y = IK_Y + 24;
  const RASM_ENI = 300;
  const RASM_BOYI = 320;

  const ONG = RASM_X + RASM_ENI + 34;
  // Ball halqasi o'ng chekkada; ma'lumot ustuni undan oldin tugaydi
  const HALQA_R = 84;
  const HALQA_CX = IK_X + IK_ENI - 40 - HALQA_R;
  const HALQA_CY = RASM_Y + 150;
  const ONG_ENI = HALQA_CX - HALQA_R - 30 - ONG;

  // Surat
  if (rasmBase64) {
    q.push(`<clipPath id="yuz"><rect x="${RASM_X}" y="${RASM_Y}" width="${RASM_ENI}" height="${RASM_BOYI}" rx="20"/></clipPath>
      <image href="data:${mime};base64,${rasmBase64}" x="${RASM_X}" y="${RASM_Y}"
        width="${RASM_ENI}" height="${RASM_BOYI}" clip-path="url(#yuz)" preserveAspectRatio="xMidYMid slice"/>`);
  } else {
    q.push(`<rect x="${RASM_X}" y="${RASM_Y}" width="${RASM_ENI}" height="${RASM_BOYI}" rx="20" fill="${tus(0.14)}"/>
      <circle cx="${RASM_X + RASM_ENI / 2}" cy="${RASM_Y + 128}" r="52" fill="${tus(0.18)}"/>
      <path d="M${RASM_X + RASM_ENI / 2 - 78} ${RASM_Y + 268} a78 78 0 0 1 156 0 z" fill="${tus(0.18)}"/>`);
  }

  // Sarlavha va yorliqlar
  let oy = RASM_Y + 8;
  q.push(matn('Teri holati', oy + 40, { x: ONG, olcham: 44, ogirlik: 700, rang: oq }));
  oy += 66;

  const yorliqlar = [yosh ? `${yosh} yosh` : '', teriTuri ? `${teriTuri} teri` : ''].filter(Boolean);
  let yx = ONG;
  for (const s of yorliqlar) {
    const ken = Math.round(s.length * 13.4) + 34;
    if (yx + ken > ONG + ONG_ENI) break;
    q.push(`<rect x="${yx}" y="${oy}" width="${ken}" height="44" rx="22" fill="${tus(0.18)}"/>`);
    q.push(matn(s, oy + 30, { x: yx + ken / 2, markaz: true, olcham: 23, rang: oq }));
    yx += ken + 10;
  }
  if (yorliqlar.length) oy += 58;

  if (teriRangi) {
    const qat = qatorlarga(teriRangi, ONG_ENI, 24).slice(0, 2);
    qat.forEach((s, i) => q.push(matn(s, oy + 22 + i * 30,
      { x: ONG, olcham: 24, rang: oq, shaffof: 0.85 })));
    oy += qat.length * 30 + 8;
  }

  // Katta ball va chiziq
  const ballY = Math.max(oy + 24, RASM_Y + RASM_BOYI - 96);
  q.push(matn(String(ball), ballY + 46, { x: ONG, olcham: 62, ogirlik: 700, rang: oq }));
  q.push(matn('/ 100', ballY + 46,
    { x: ONG + String(ball).length * 38 + 14, olcham: 27, rang: oq, shaffof: 0.75 }));
  q.push(matn('teri holati', ballY + 46,
    { x: IK_X + IK_ENI - 24, oxiri: true, olcham: 22, rang: oq, shaffof: 0.75 }));
  // Chiziq rangi urgudan ochiroq — to'q sarlavha ustida ko'rinsin va
  // mavzu o'zgarganda ham mos tushsin
  q.push(shkala(ONG, ballY + 66, IK_X + IK_ENI - 24 - ONG, ball, yoritish(R.urgu, 0.35),
    { balandlik: 14, fon: tus(0.22) }));

  // Ball halqasi
  {
    const aylana = 2 * Math.PI * HALQA_R;
    const to = (aylana * Math.max(0, Math.min(100, ball))) / 100;
    q.push(`
      <circle cx="${HALQA_CX}" cy="${HALQA_CY}" r="${HALQA_R}" fill="none"
        stroke="${tus(0.2)}" stroke-width="9"/>
      <circle cx="${HALQA_CX}" cy="${HALQA_CY}" r="${HALQA_R}" fill="none" stroke="${tus(0.85)}"
        stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${to.toFixed(1)} ${(aylana - to).toFixed(1)}"
        transform="rotate(-90 ${HALQA_CX} ${HALQA_CY})"/>`);
    // Uchtasi halqa ichiga sig'ishi kerak: yulduzcha, raqam, izoh.
    // Halqa radiusi 84 — pastki chekkasi cy+84, izoh cy+46 da tugaydi.
    q.push(belgiChiz('yulduz', HALQA_CX, HALQA_CY - 42, 24, oq, { qalin: 1.6 }));
    q.push(matn(String(ball), HALQA_CY + 14,
      { x: HALQA_CX, markaz: true, olcham: 54, ogirlik: 700, rang: oq }));
    q.push(matn('umumiy holat', HALQA_CY + 46,
      { x: HALQA_CX, markaz: true, olcham: 19, rang: oq, shaffof: 0.8 }));
  }

  const IK_BOYI = Math.max(RASM_Y + RASM_BOYI, ballY + 90, HALQA_CY + HALQA_R) + 24 - IK_Y;
  // Kartochka fonini matndan OLDIN chizamiz — shuning uchun boshiga qo'yamiz
  q.unshift(`<rect x="${IK_X}" y="${IK_Y}" width="${IK_ENI}" height="${IK_BOYI}" rx="28"
    fill="${tus(0.1)}" stroke="${tus(0.16)}" stroke-width="1.5"/>`);

  // ── Ko'rsatkichlar ──
  const eng = muammolar.slice().sort((a, b) => (b.foiz ?? 0) - (a.foiz ?? 0))[0];
  const prognoz = (t.prognoz || t.forecast || [])
    .slice().sort((a, b) => (b.ehtimol ?? 0) - (a.ehtimol ?? 0))[0];

  const KO_Y = IK_Y + IK_BOYI + 26;
  const KO_BOYI = 92;
  const ustunEni = IK_ENI / 3;
  const korsatkichlar = [
    { belgi: 'hujjat', qiymat: String(muammolar.length), izoh: 'topilgan belgi' },
    // Izoh kichik harf bilan boshlanadi — ko'rsatkich sarlavha emas, tavsif
    { belgi: 'tomchi', qiymat: eng ? `${Math.round(eng.foiz ?? 0)}%` : '—',
      izoh: eng?.nom ? eng.nom[0].toLowerCase() + eng.nom.slice(1) : 'belgi yo‘q' },
    { belgi: 'qalqon', qiymat: prognoz ? `${Math.round(prognoz.ehtimol ?? 0)}%` : '—',
      izoh: prognoz ? `${prognoz.muddat || 'yaqin oyda'} xavf` : 'xavf yo‘q' },
  ];
  korsatkichlar.forEach((k, i) => {
    const kx = IK_X + i * ustunEni + 22;
    const plitkaY = KO_Y + (KO_BOYI - 62) / 2;
    q.push(belgiPlitka(kx, plitkaY, 62, k.belgi, oq, tus(0.16), { qalin: 1.9 }));
    q.push(matn(k.qiymat, plitkaY + 30, { x: kx + 80, olcham: 38, ogirlik: 700, rang: oq }));
    q.push(matn(kes(k.izoh, ustunEni - 100, 20), plitkaY + 56,
      { x: kx + 80, olcham: 20, rang: oq, shaffof: 0.8 }));
    if (i > 0) {
      q.push(`<line x1="${IK_X + i * ustunEni}" y1="${KO_Y + 14}"
        x2="${IK_X + i * ustunEni}" y2="${KO_Y + KO_BOYI - 14}"
        stroke="${tus(0.2)}" stroke-width="1.5"/>`);
    }
  });

  const SARLAVHA_H = KO_Y + KO_BOYI + 28;

  // ══════════════════════════════════════════════
  // 2. OCH FON
  // ══════════════════════════════════════════════
  let y = SARLAVHA_H + 34;

  // Xulosa
  const xulosa = t.xulosa || t.summary || '';
  if (xulosa) {
    const qat = qatorlarga(xulosa, ENI - CHET * 2 - 128, 25).slice(0, 3);
    const h = Math.max(76, 32 + qat.length * 34);
    q.push(`<rect x="${CHET}" y="${y}" width="${ENI - CHET * 2}" height="${h}" rx="20"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    q.push(`<circle cx="${CHET + 46}" cy="${y + h / 2}" r="21" fill="${R.plitka}"/>`);
    q.push(belgiChiz('axborot', CHET + 46, y + h / 2, 24, R.kul, { qalin: 1.9 }));
    const boshY = y + h / 2 - ((qat.length - 1) * 34) / 2 + 9;
    qat.forEach((s, i) => q.push(matn(s, boshY + i * 34, { x: CHET + 84, olcham: 25, rang: R.matn })));
    y += h + 30;
  }

  // ── Topilgan belgilar ──
  if (muammolar.length) {
    q.push(matn('Suratda topilgan belgilar', y + 30, { olcham: 32, ogirlik: 700, rang: R.matn }));
    y += 54;

    const SATR = 88;
    muammolar.forEach((m, i) => {
      const foiz = Math.round(Number(m.foiz ?? 40));
      const rang = TARTIB_RANG[i] || darajaRangi(foiz);
      const kartaEni = ENI - CHET * 2;

      q.push(`<rect x="${CHET}" y="${y}" width="${kartaEni}" height="${SATR}" rx="18"
        fill="${R.karta}" stroke="${R.chiziq}"/>`);
      // Chap chekkadagi rangli chiziq
      q.push(`<path d="M${CHET + 7} ${y} h-1 a6 6 0 0 0-6 6 v${SATR - 12} a6 6 0 0 0 6 6 h1 z"
        fill="${rang}"/>`);

      q.push(raqamNishoni(CHET + 52, y + SATR / 2, 21, i + 1, rang));

      const nomX = CHET + 92;
      const shkalaEni = 320;
      const foizX = CHET + kartaEni - 26;
      const shkalaX = foizX - 90 - shkalaEni;

      q.push(matn(kes(m.nom, shkalaX - nomX - 20, 27, 700), y + 38,
        { x: nomX, olcham: 27, ogirlik: 700, rang: R.matn }));
      if (m.zona) {
        q.push(matn(kes(m.zona, shkalaX - nomX - 20, 22), y + 66,
          { x: nomX, olcham: 22, rang: R.kul }));
      }
      q.push(shkala(shkalaX, y + SATR / 2 - 6, shkalaEni, foiz, rang,
        { balandlik: 12, fon: R.chiziq }));
      q.push(matn(`${foiz}%`, y + SATR / 2 + 10,
        { x: foizX, oxiri: true, olcham: 27, ogirlik: 700, rang }));

      y += SATR + 12;
    });
    y += 22;
  }

  // ── Tavsiya etilgan mahsulotlar ──
  if (tavsiyalar.length) {
    q.push(matn('Sizga mos parvarish', y + 30, { olcham: 32, ogirlik: 700, rang: R.matn }));
    y += 52;

    const royxat = tavsiyalar.slice(0, 3);
    const oraliq = 16;
    const kartaEni = Math.floor((ENI - CHET * 2 - oraliq * (royxat.length - 1)) / royxat.length);
    const rasmH = Math.round(kartaEni * 0.74);
    const kartaH = rasmH + 104;

    royxat.forEach((r, i) => {
      const kx = CHET + i * (kartaEni + oraliq);
      const rang = TARTIB_RANG[i] || R.urgu;
      q.push(`<rect x="${kx}" y="${y}" width="${kartaEni}" height="${kartaH}" rx="18"
        fill="${R.plitka}" stroke="${R.chiziq}"/>`);

      if (r.rasmBase64) {
        q.push(`<clipPath id="m${i}"><rect x="${kx + 1}" y="${y + 1}"
            width="${kartaEni - 2}" height="${rasmH}" rx="17"/></clipPath>
          <image href="data:${r.rasmMime || 'image/png'};base64,${r.rasmBase64}"
            x="${kx + 1}" y="${y + 1}" width="${kartaEni - 2}" height="${rasmH}"
            clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
      } else {
        q.push(belgiChiz('tomchi', kx + kartaEni / 2, y + rasmH / 2, 74, R.och, { qalin: 1.5 }));
      }

      q.push(raqamNishoni(kx + 32, y + 32, 19, i + 1, rang));

      q.push(matn(kes(r.bosqich || 'Parvarish', kartaEni - 28, 22, 700), y + rasmH + 34,
        { x: kx + 16, olcham: 22, ogirlik: 700, rang }));

      const nomQat = qatorlarga(r.nom, kartaEni - 28, 22, 600).slice(0, 2);
      nomQat.forEach((s, k) => q.push(matn(s, y + rasmH + 64 + k * 28,
        { x: kx + 16, olcham: 22, ogirlik: 600, rang: R.matn })));
    });
    y += kartaH + 30;
  }

  // ── Pastki qism ──
  q.push(`<line x1="${CHET}" y1="${y}" x2="${ENI - CHET}" y2="${y}"
    stroke="${R.chiziq}" stroke-width="2"/>`);
  y += 36;
  q.push(matn(brend, y, { olcham: 25, ogirlik: 700, rang: R.urgu }));
  q.push(matn(sana(), y, { x: ENI - CHET, oxiri: true, olcham: 21, rang: R.kul }));
  y += 30;
  q.push(matn('Bu tibbiy tashxis emas — kosmetologik tavsiya.', y, { olcham: 21, rang: R.kul }));
  y += 40;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <defs>
    <linearGradient id="sarlavha" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${R.asosiyOch}"/><stop offset="1" stop-color="${R.asosiyTim}"/>
    </linearGradient>
  </defs>
  <rect width="${ENI}" height="${H}" fill="${R.fon}"/>
  <path d="M0 0 H${ENI} V${SARLAVHA_H - 34} a34 34 0 0 1-34 34 H34 a34 34 0 0 1-34-34 Z"
    fill="url(#sarlavha)"/>
  ${q.join('\n  ')}
</svg>`;
}
