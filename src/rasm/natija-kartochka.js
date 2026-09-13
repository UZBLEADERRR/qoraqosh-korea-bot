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
import { kartochkaSozlamasi } from '../lib/kartochka.js';

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
  // Belgi (tasdiq) — «foydali» ro'yxati oldida
  tasdiq: 'M5 12.5l4.5 4.5L19 7.5',
  // Chiziq — «cheklang» ro'yxati oldida
  chiziqcha: 'M6.5 12h11',
  // Kosa — ovqatlanish bo'limi sarlavhasi
  kosa: 'M4 11h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8z M8.5 7.5c0-1.2 1-1.6 1-2.6'
      + 'M12 7.5c0-1.4 1-1.8 1-3 M15.5 7.5c0-1.2 1-1.6 1-2.6',
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
                            brend, logoBase64 = null, logoMime = 'image/png', mavzu = {},
                            sozlama = null }) {
  // Kartochka ko'rinishi admin paneldan (yordamchi orqali) sozlanadi:
  // qaysi bo'lim ko'rinsin, nechta belgi va mahsulot chiqsin,
  // sarlavhalar qanday yozilsin — erkak va ayol uchun alohida.
  const S = sozlama && typeof sozlama === 'object'
    ? sozlama : kartochkaSozlamasi({}, tahlil?.jins || '');
  const R = palitra(mavzu);
  const oq = R.asosiyMatn;                       // sarlavha ustidagi matn
  const shaffofFon = oq === '#FFFFFF' ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const tus = (a) => `${shaffofFon}${a})`;

  const t = tahlil || {};
  // Ko'rsatkichlar TOPILGANiga qarab hisoblanadi, ro'yxat esa
  // sozlamadagi songa qarab qisqartiriladi: «2 ta belgi topildi» deb
  // yozib, ostida bittasini ko'rsatish adminni ham, mijozni ham
  // chalg'itadi — shuning uchun ikkalasi alohida.
  const hammaMuammo = t.muammolar || t.problems || [];
  const muammolar = S.bloklar.belgilar ? hammaMuammo.slice(0, S.belgi_soni) : [];
  const ball = Math.round(Number(t.ball ?? t.score ?? 0));
  const yosh = t.taxminiy_yosh || t.age_estimate || '';
  const jins = t.jins || '';
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
  q.push(matn(S.teg, 72, { x: ENI - P - 34, oxiri: true, olcham: 25, rang: oq, shaffof: 0.85 }));
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

  // AI ba'zan «18-22 yosh» deb qaytaradi — «yosh» ikki marta yozilmasin
  const soz = (v, q) => (v && !new RegExp(q, 'i').test(v) ? `${v} ${q}` : v);
  // Jins TAXMIN — «nomalum» bo'lsa yorliq umuman chiqmaydi, chunki
  // «noma'lum jins» degan yorliq odamga hech nima bermaydi.
  const jinsYorliq = jins === 'erkak' ? 'erkak' : jins === 'ayol' ? 'ayol' : '';
  const yorliqlar = [soz(yosh, 'yosh'), jinsYorliq, soz(teriTuri, 'teri')].filter(Boolean);
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

  // «Rasmda nimani ko'rdim» — odam suratni O'ZINIKI ekanini tanisin.
  // Kartochka boshqa odamga ham yuboriladi, shuning uchun bu satr
  // faqat KO'RINAYOTGAN neytral tafsilotdan iborat (AI qoidasi).
  const tavsif = String(t.tavsif || '').trim();
  if (tavsif) {
    const qat = qatorlarga(tavsif, ONG_ENI, 21).slice(0, 2);
    qat.forEach((s, i) => q.push(matn(s, oy + 20 + i * 26,
      { x: ONG, olcham: 21, rang: oq, shaffof: 0.7 })));
    oy += qat.length * 26 + 6;
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
  const eng = hammaMuammo.slice().sort((a, b) => (b.foiz ?? 0) - (a.foiz ?? 0))[0];
  const prognoz = (t.prognoz || t.forecast || [])
    .slice().sort((a, b) => (b.ehtimol ?? 0) - (a.ehtimol ?? 0))[0];

  const KO_Y = IK_Y + IK_BOYI + 26;
  const KO_BOYI = 92;
  const ustunEni = IK_ENI / 3;
  const korsatkichlar = [
    { belgi: 'hujjat', qiymat: String(hammaMuammo.length), izoh: 'topilgan belgi' },
    // Izoh kichik harf bilan boshlanadi — ko'rsatkich sarlavha emas, tavsif
    { belgi: 'tomchi', qiymat: eng ? `${Math.round(eng.foiz ?? 0)}%` : '—',
      izoh: eng?.nom ? eng.nom[0].toLowerCase() + eng.nom.slice(1) : 'belgi yo‘q' },
    { belgi: 'qalqon', qiymat: prognoz ? `${Math.round(prognoz.ehtimol ?? 0)}%` : '—',
      izoh: prognoz ? `${prognoz.muddat || 'yaqin oyda'} xavf` : 'xavf yo‘q' },
  ];
  if (S.bloklar.korsatkichlar) korsatkichlar.forEach((k, i) => {
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

  const SARLAVHA_H = S.bloklar.korsatkichlar ? KO_Y + KO_BOYI + 28 : KO_Y + 6;

  // ══════════════════════════════════════════════
  // 2. OCH FON
  // ══════════════════════════════════════════════
  let y = SARLAVHA_H + 34;

  // Xulosa
  const xulosa = S.bloklar.xulosa ? (t.xulosa || t.summary || '') : '';
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
    q.push(matn(S.sarlavha.belgilar, y + 30, { olcham: 32, ogirlik: 700, rang: R.matn }));
    y += 54;

    // Har belgi uchun SABABI ham yoziladi: "54% qizarish" degan raqamdan
    // ko'ra "nega shunday bo'ldi" foydaliroq. Karta balandligi matnga
    // qarab o'zgaradi — sabab yo'q bo'lsa qator past bo'lib qoladi.
    muammolar.forEach((m, i) => {
      const foiz = Math.round(Number(m.foiz ?? 40));
      const rang = TARTIB_RANG[i] || darajaRangi(foiz);
      const kartaEni = ENI - CHET * 2;
      const nomX = CHET + 92;
      const ichEni = kartaEni - (nomX - CHET) - 34;

      const sabab = String(m.sabab || m.izoh || '').trim();
      const sababQat = sabab ? qatorlarga(`Sababi: ${sabab}`, ichEni, 21).slice(0, 2) : [];
      const yechim = String(m.yechim || '').trim();
      const yechimQat = yechim ? qatorlarga(`Yechimi: ${yechim}`, ichEni, 21).slice(0, 2) : [];

      const SATR = 74 + (m.zona ? 26 : 0)
        + (sababQat.length ? sababQat.length * 26 + 6 : 0)
        + (yechimQat.length ? yechimQat.length * 26 + 4 : 0);

      q.push(`<rect x="${CHET}" y="${y}" width="${kartaEni}" height="${SATR}" rx="18"
        fill="${R.karta}" stroke="${R.chiziq}"/>`);
      // Chap chekkadagi rangli chiziq
      q.push(`<path d="M${CHET + 7} ${y} h-1 a6 6 0 0 0-6 6 v${SATR - 12} a6 6 0 0 0 6 6 h1 z"
        fill="${rang}"/>`);
      q.push(raqamNishoni(CHET + 52, y + 40, 21, i + 1, rang));

      let ty = y + 38;
      // Nom va foiz bir qatorda
      q.push(matn(kes(m.nom, ichEni - 90, 27, 700), ty,
        { x: nomX, olcham: 27, ogirlik: 700, rang: R.matn }));
      q.push(matn(`${foiz}%`, ty, { x: CHET + kartaEni - 26, oxiri: true,
        olcham: 27, ogirlik: 700, rang }));
      ty += 26;

      if (m.zona) {
        q.push(matn(kes(m.zona, ichEni, 21), ty, { x: nomX, olcham: 21, rang: R.kul }));
        ty += 26;
      }
      // Shkala nom ostida — endi u raqam bilan joy talashmaydi
      q.push(shkala(nomX, ty - 12, ichEni, foiz, rang, { balandlik: 10, fon: R.chiziq }));
      ty += 18;

      sababQat.forEach((str) => {
        q.push(matn(str, ty, { x: nomX, olcham: 21, rang: R.kul }));
        ty += 26;
      });
      if (yechimQat.length) ty += 4;
      yechimQat.forEach((str) => {
        q.push(matn(str, ty, { x: nomX, olcham: 21, rang: R.yashil || R.kul }));
        ty += 26;
      });

      y += SATR + 12;
    });
    y += 22;
  }

  // ── Ovqatlanish tavsiyasi ──
  // Teri holatiga ovqat ham ta'sir qiladi, lekin mijoz buni hech
  // qayerda o'qimaydi. Ikki ustun: nima foydali, nimani cheklash.
  const parhez = t.parhez || {};
  const foydali  = (parhez.foydali  || []).slice(0, 5);
  const cheklang = (parhez.cheklang || []).slice(0, 5);
  if (S.bloklar.parhez && (foydali.length || cheklang.length)) {
    q.push(belgiChiz('kosa', CHET + 15, y + 20, 30, R.matn, { qalin: 1.9 }));
    q.push(matn(S.sarlavha.parhez, y + 30, { x: CHET + 40, olcham: 32, ogirlik: 700, rang: R.matn }));
    y += 52;

    const ustunEni2 = Math.floor((ENI - CHET * 2 - 14) / 2);
    const bandEni = ustunEni2 - 74;
    // Ikki ustun bir xil balandlikda bo'lsin — bandlar soni har xil
    // bo'lsa ham kartalar teng ko'rinadi
    const qatorlarni = (royxat) => royxat.map((b) => qatorlarga(b, bandEni, 21).slice(0, 2));
    const chapQ = qatorlarni(foydali);
    const ongQ  = qatorlarni(cheklang);
    const balandlik = (qq) => qq.reduce((sum, x) => sum + x.length * 26 + 8, 0);
    const H_PARHEZ = Math.max(balandlik(chapQ), balandlik(ongQ), 60) + 78;

    const ustunlar = [
      { x: CHET, nom: 'Foydali', rang: R.yashil || '#2e7d55', belgi: 'tasdiq', qat: chapQ },
      { x: CHET + ustunEni2 + 14, nom: 'Cheklang', rang: R.qizil || '#b0423a',
        belgi: 'chiziqcha', qat: ongQ },
    ];
    for (const u of ustunlar) {
      q.push(`<rect x="${u.x}" y="${y}" width="${ustunEni2}" height="${H_PARHEZ}" rx="18"
        fill="${R.karta}" stroke="${R.chiziq}"/>`);
      q.push(`<rect x="${u.x}" y="${y}" width="${ustunEni2}" height="6" rx="3" fill="${u.rang}"/>`);
      q.push(matn(u.nom, y + 46, { x: u.x + 24, olcham: 26, ogirlik: 700, rang: u.rang }));
      let py = y + 84;
      u.qat.forEach((satrlar) => {
        q.push(`<circle cx="${u.x + 36}" cy="${py - 8}" r="14" fill="${yoritish(u.rang, 0.86)}"/>`);
        q.push(belgiChiz(u.belgi, u.x + 36, py - 8, 16, u.rang, { qalin: 2.4 }));
        satrlar.forEach((str, i) => {
          q.push(matn(str, py + i * 26, { x: u.x + 60, olcham: 21, rang: R.matn }));
        });
        py += satrlar.length * 26 + 8;
      });
      if (!u.qat.length) {
        q.push(matn('—', y + 92, { x: u.x + 24, olcham: 21, rang: R.och }));
      }
    }
    y += H_PARHEZ + 12;

    if (parhez.izoh) {
      const qat = qatorlarga(parhez.izoh, ENI - CHET * 2 - 48, 21).slice(0, 2);
      qat.forEach((str, i) => q.push(matn(str, y + 18 + i * 26,
        { x: CHET + 24, olcham: 21, rang: R.kul })));
      y += qat.length * 26 + 12;
    }
    y += 22;
  }

  // ── Tavsiya etilgan mahsulotlar ──
  if (S.bloklar.mahsulotlar && tavsiyalar.length) {
    q.push(matn(S.sarlavha.mahsulotlar, y + 30, { olcham: 32, ogirlik: 700, rang: R.matn }));
    y += 52;

    // Mahsulot ko'p bo'lsa kartalar KICHRAYADI va HAMMASI bitta
    // qatorga sig'adi. Ilgari ustunlar soni 4 ta bilan cheklangan edi:
    // beshinchi mahsulot pastga tushib, yolg'iz qolar va rasm bejiz
    // uzayardi. Endi ustunlar soni mahsulot soniga teng; 6 tadan
    // ortiq bo'lsagina ikkiga bo'linadi, lekin TENG bo'linadi
    // (7 -> 4+3), ya'ni yolg'iz karta hech qachon qolmaydi.
    const royxat = tavsiyalar.slice(0, S.mahsulot_soni);
    const oraliq = royxat.length >= 5 ? 10 : 14;
    const ustun = royxat.length <= 6 ? royxat.length : Math.ceil(royxat.length / 2);
    const tolaEni = ENI - CHET * 2;
    // Kartaning eng katta o'lchami: bitta-ikkita mahsulot butun
    // qatorni egallab, bemaza katta ko'rinmasin
    const kartaEni = Math.min(300,
      Math.floor((tolaEni - oraliq * (ustun - 1)) / ustun));
    const qatorEni = ustun * kartaEni + oraliq * (ustun - 1);
    const chapX = CHET + Math.round((tolaEni - qatorEni) / 2);   // markazlash
    const rasmH = Math.round(kartaEni * 0.86);
    // Karta torayganda shrift ham kichrayadi — matn chetdan chiqmasin
    const juda = kartaEni < 185;
    const kichik = kartaEni < 235;
    const shr = juda ? 17 : kichik ? 19 : 22;
    const ich = juda ? 9 : kichik ? 12 : 16;
    const bosqichY = rasmH + (juda ? 25 : kichik ? 28 : 34);
    const nomY = rasmH + (juda ? 48 : kichik ? 54 : 64);
    // Karta balandligi eng UZUN nomga qarab: hammasi bir xil bo'lsin,
    // lekin uch qatorli nom kesilib qolmasin ham
    const nomlar = royxat.map((r) => qatorlarga(r.nom, kartaEni - ich * 2, shr, 600).slice(0, 3));
    const maksQator = Math.max(1, ...nomlar.map((a) => a.length));
    const kartaH = nomY + (maksQator - 1) * (shr + 5) + (juda ? 16 : 20);

    royxat.forEach((r, i) => {
      const qator = Math.floor(i / ustun);
      const ustunda = i % ustun;
      const kx = chapX + ustunda * (kartaEni + oraliq);
      const ky = y + qator * (kartaH + oraliq);
      const rang = TARTIB_RANG[i % TARTIB_RANG.length] || R.urgu;
      q.push(`<rect x="${kx}" y="${ky}" width="${kartaEni}" height="${kartaH}" rx="18"
        fill="${R.plitka}" stroke="${R.chiziq}"/>`);

      if (r.rasmBase64) {
        q.push(`<clipPath id="m${i}"><rect x="${kx + 1}" y="${ky + 1}"
            width="${kartaEni - 2}" height="${rasmH}" rx="17"/></clipPath>
          <image href="data:${r.rasmMime || 'image/png'};base64,${r.rasmBase64}"
            x="${kx + 1}" y="${ky + 1}" width="${kartaEni - 2}" height="${rasmH}"
            clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
      } else {
        q.push(belgiChiz('tomchi', kx + kartaEni / 2, ky + rasmH / 2,
          juda ? 44 : kichik ? 56 : 74, R.och, { qalin: 1.5 }));
      }

      const nishonR = juda ? 14 : kichik ? 16 : 19;
      q.push(raqamNishoni(kx + nishonR + 8, ky + nishonR + 8, nishonR, i + 1, rang));

      q.push(matn(kes(r.bosqich || 'Parvarish', kartaEni - ich * 2, shr, 700),
        ky + bosqichY, { x: kx + ich, olcham: shr - 2, ogirlik: 700, rang }));

      nomlar[i].forEach((s, k) => q.push(matn(s, ky + nomY + k * (shr + 5),
        { x: kx + ich, olcham: shr, ogirlik: 600, rang: R.matn })));
    });

    const qatorlarSoni = Math.ceil(royxat.length / ustun);
    y += qatorlarSoni * kartaH + (qatorlarSoni - 1) * oraliq + 30;

    const qolgan = tavsiyalar.length - royxat.length;
    if (qolgan > 0) {
      q.push(matn(`va yana ${qolgan} ta mahsulot — ilovada`, y + 4,
        { olcham: 22, rang: R.kul }));
      y += 30;
    }
  }

  // ── Pastki qism ──
  q.push(`<line x1="${CHET}" y1="${y}" x2="${ENI - CHET}" y2="${y}"
    stroke="${R.chiziq}" stroke-width="2"/>`);
  y += 36;
  q.push(matn(brend, y, { olcham: 25, ogirlik: 700, rang: R.urgu }));
  q.push(matn(sana(), y, { x: ENI - CHET, oxiri: true, olcham: 21, rang: R.kul }));
  y += 30;
  if (S.izoh) {
    q.push(matn(S.izoh, y, { olcham: 21, rang: R.kul }));
    y += 40;
  } else {
    y += 10;
  }

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
