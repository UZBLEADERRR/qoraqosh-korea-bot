// Tahlil natijasining rasmi — QORA fonli diagnostika varaqasi.
//
// Nega qora. Kartochka telefonda ko'riladi va do'stga yuboriladi:
// qora fonda surat va rangli ko'rsatkichlar «yorib» chiqadi, oq
// fonda esa hammasi bir xil bo'lib qolardi. Ilova ekranidagi natija
// ham aynan shunday ko'rinadi — odam ikkisini bir narsa deb taniydi.
//
// Tuzilishi (yuqoridan pastga):
//   1. Brend, shior va sana
//   2. Surat — muammolar RAQAMLANGAN nishon bilan belgilangan —
//      va yonida umumiy ball halqasi
//   3. To'rtta ko'rsatkich bitta qatorda
//   4. «Nima topildi» — raqam, yuzning o'sha bo'lagi, foiz, chiziq
//   5. Ovqat: yashil «yeng» va qizil «kamaytiring» panellari
//   6. Mahsulotlar bitta qatorda, tartib raqami bilan
//
// MATN QOIDASI: asosiysi oq, ikkinchi darajalisi kulrang, uchinchi
// daraja YO'Q. Ilgari kartochka mayda izohlarga to'lib ketgan edi.
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi.
import { x, qatorlarga, kes, SHRIFT, rasmOlchami } from './chiz.js';
import { palitra, TARTIB_RANG } from '../lib/mavzu.js';
import { kartochkaSozlamasi } from '../lib/kartochka.js';
import { olchovlarniHisobla } from '../lib/olchov.js';

const ENI = 1080;
const CHET = 40;

// Qora varaq palitrasi. Urg'u rangi mavzudan keladi (admin tanlaydi),
// qolgani qotib turadi: qora fon uchun kontrast hisoblab tanlangan.
/* BESH bosqichli shkala. Uch rang bilan to'rtta ko'rsatkichning
 * uchtasi bir xil chiqib qolardi — «ranglar takrorlanib ketyapti».
 * Endi 62 va 71 ball boshqa-boshqa ko'rinadi, lekin ma'no
 * saqlanadi: yashil tomon yaxshi, qizil tomon yomon. */
const SHKALA = ['#FF6B5A', '#FF9A5A', '#F0B429', '#4AA3FF', '#3DD68C'];
const beshRang = (b) => SHKALA[Math.max(0, Math.min(4, Math.floor(b / 20)))];

const T = {
  fon:     '#08080A',
  karta:   '#141417',
  chiziq:  '#26262C',
  plitka:  '#1C1C21',
  oq:      '#FFFFFF',
  kul:     '#9A9AA6',
  och:     '#6C6C78',
  yashil:  '#3DD68C',
  sariq:   '#F0B429',
  qizil:   '#FF6B5A',
};

/* Teri «rentgeni» — SVG filtrlari bilan.
 *
 * `feColorMatrix` — resvg to'liq qo'llab-quvvatlaydigan standart
 * filtr. Rasmning o'zi o'zgarmaydi: faqat rang kanallari boshqacha
 * aralashtiriladi, xuddi dermatolog lampasi ostida ko'rgandek.
 */
/* Teri «rentgeni» — ILOVADAGI qatlamlar bilan aynan bir xil
   ro'yxat va tartib. Rasm bilan ilova boshqa-boshqa narsa
   ko'rsatsa, odam qaysi biriga ishonishni bilmaydi. */
const RENTGEN = [
  { kalit: 'asl', nom: 'Asl', filtr: '' },
  { kalit: 'uv', nom: 'UV',
    filtr: '<feColorMatrix type="saturate" values="0"/>'
         + '<feComponentTransfer><feFuncR type="linear" slope="1.5" intercept="-0.22"/>'
         + '<feFuncG type="linear" slope="1.5" intercept="-0.22"/>'
         + '<feFuncB type="linear" slope="1.5" intercept="-0.22"/></feComponentTransfer>' },
  { kalit: 'qizarish', nom: 'Qizarish',
    filtr: '<feColorMatrix type="saturate" values="2.2"/>'
         + '<feColorMatrix type="hueRotate" values="-14"/>' },
  { kalit: 'pigment', nom: 'Pigment',
    filtr: '<feColorMatrix type="matrix" values="'
         + '-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/>'
         + '<feColorMatrix type="hueRotate" values="165"/>'
         + '<feColorMatrix type="saturate" values="1.5"/>' },
  { kalit: 'tekstura', nom: 'Tekstura',
    filtr: '<feColorMatrix type="saturate" values="0"/>'
         + '<feComponentTransfer><feFuncR type="linear" slope="2.4" intercept="-0.6"/>'
         + '<feFuncG type="linear" slope="2.4" intercept="-0.6"/>'
         + '<feFuncB type="linear" slope="2.4" intercept="-0.6"/></feComponentTransfer>' },
  { kalit: 'namlik', nom: 'Namlik',
    // Ko'k tomon MO‘TADIL suriladi. Kuchli koeffitsientda butun
    // kadr bir tekis ko'k bo'lib qolar va teri ko'rinmay ketardi —
    // rentgen emas, rangli filtr bo'lib chiqardi.
    filtr: '<feColorMatrix type="saturate" values="0"/>'
         + '<feColorMatrix type="matrix" values="'
         + '0.58 0 0 0 0  0.78 0 0 0 0.03  1 0 0 0 0.10  0 0 0 1 0"/>' },
];

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sana(d = new Date()) {
  // Toshkent vaqti (UTC+5)
  const t = new Date(d.getTime() + 5 * 3600 * 1000);
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const matn = (s, y, o = {}) => `<text x="${o.x ?? CHET}" y="${y}" font-family="${SHRIFT}"
  font-size="${o.olcham ?? 26}" font-weight="${o.ogirlik ?? 400}" fill="${o.rang ?? T.oq}"
  ${o.oxiri ? 'text-anchor="end"' : ''} ${o.markaz ? 'text-anchor="middle"' : ''}
  ${o.shaffof ? `fill-opacity="${o.shaffof}"` : ''}>${x(s)}</text>`;

/** Yumaloq uchli progress chiziq. */
const shkala = (xx, y, kenglik, foiz, tus, { balandlik = 10, fon = T.plitka } = {}) => {
  const t = Math.max(0, Math.min(100, foiz));
  const to = Math.max(balandlik, Math.round((kenglik * t) / 100));
  const r = balandlik / 2;
  return `<rect x="${xx}" y="${y}" width="${kenglik}" height="${balandlik}" rx="${r}" fill="${fon}"/>
    <rect x="${xx}" y="${y}" width="${to}" height="${balandlik}" rx="${r}" fill="${tus}"/>`;
};

/** Karta foni. */
const karta = (xx, y, en, boy, { r = 24, fon = T.karta, chiziq = T.chiziq } = {}) =>
  `<rect x="${xx}" y="${y}" width="${en}" height="${boy}" rx="${r}"
    fill="${fon}" stroke="${chiziq}" stroke-width="1.5"/>`;

// ──────────────── Vektor belgilar ────────────────
const BELGILAR = {
  tomchi: 'M12 3c3.5 4.2 5.5 7 5.5 9.6A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.4C6.5 10 8.5 7.2 12 3z',
  qalqon: 'M12 3l7 2.5v5.5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V5.5L12 3z',
  barg: 'M12 21c0-6 1.5-9.5 5-12.5C19.5 6.4 20 4.6 20 3c-2 0-4.6.4-6.8 1.8'
      + 'C9.6 6.6 8 9.4 8 12.4c0 1.2.2 2.2.6 3.1M12 21c0-3-.6-5.2-1.8-6.9'
      + 'C8.8 12 6.6 11 4 10.6c0 2 .3 3.8 1.2 5.2C6.4 17.8 8.6 19 11 19.4',
  quyosh: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z M12 2v2 M12 20v2 M2 12h2 M20 12h2'
      + ' M4.9 4.9l1.5 1.5 M17.6 17.6l1.5 1.5 M19.1 4.9l-1.5 1.5 M6.4 17.6l-1.5 1.5',
  oy: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  soat: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5.5l3.5 2',
  yurak: 'M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.6 12 20 12 20z',
  tozalik: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M8.5 9.5v.1 M15.5 9.5v.1 M9 14.5v.1 M14.5 14.5v.1',
  tasdiq: 'M5 12.5l4.5 4.5L19 7.5',
  chiziqcha: 'M6.5 12h11',
  ogoh: 'M12 4l9 16H3L12 4z M12 10v4 M12 17v.1',
};

/** Ko'rsatkich nishoni — ilovadagi bilan bir xil. */
const KALIT_BELGI = {
  akne: 'tomchi', teshik: 'tozalik', yoglilik: 'tomchi', quruqlik: 'tomchi',
  qizarish: 'yurak', dog: 'quyosh', ajin: 'soat', xiralik: 'quyosh',
  sezgirlik: 'yurak', qora_doira: 'oy', shishish: 'tomchi',
  // Yettita doimiy o'lchov (`src/lib/olchov.js`)
  pora: 'tozalik', pigment: 'quyosh', tekstura: 'qalqon', namlik: 'tomchi',
};

function belgiChiz(kalit, cx, cy, olcham, tus, { toldirilgan = false, qalin = 1.9 } = {}) {
  const k = olcham / 24;
  return `<g transform="translate(${cx - olcham / 2} ${cy - olcham / 2}) scale(${k})">
    <path d="${BELGILAR[kalit] || BELGILAR.tomchi}"
      fill="${toldirilgan ? tus : 'none'}" stroke="${tus}" stroke-width="${qalin}"
      stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

/** Raqamli nishon. */
const raqamNishoni = (cx, cy, r, raqam, tus) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${tus}"/>
  <text x="${cx}" y="${cy + r * 0.36}" font-family="${SHRIFT}" font-size="${Math.round(r * 1.05)}"
    font-weight="700" fill="#fff" text-anchor="middle">${raqam}</text>`;

/**
 * Rasmning `cover` rejimida qanday joylashishini hisoblaydi.
 *
 * `preserveAspectRatio="slice"` rasmni qutiga to'ldiradi va ortig'ini
 * kesadi. Nishonni to'g'ri joyga qo'yish uchun O'SHA kesishni
 * o'zimiz ham bilishimiz kerak: aks holda 30% deb belgilagan joy
 * ekranda 42% ga tushib qoladi.
 *
 * @returns {(fx:number, fy:number) => {x:number, y:number}}
 *          rasm foizidan (0-100) quti koordinatasiga
 */
function qoplash(qx, qy, qen, qboy, rEn, rBoy) {
  const k = Math.max(qen / rEn, qboy / rBoy);
  const en = rEn * k, boy = rBoy * k;
  const sx = qx + (qen - en) / 2, sy = qy + (qboy - boy) / 2;
  return (fx, fy) => ({ x: sx + (fx / 100) * en, y: sy + (fy / 100) * boy });
}

/**
 * @param {object} d
 * @param {string|null} d.rasmBase64  foydalanuvchi surati (base64, prefiksiz)
 * @param {string} d.mime
 * @param {object} d.tahlil           {taxminiy_yosh, teri_turi, ball, xulosa, muammolar, parhez}
 * @param {object[]} d.tavsiyalar     [{bosqich, nom, brend, rasmBase64, rasmMime}]
 * @param {string} d.brend
 * @param {object} [d.mavzu]          {asosiy, fon, urgu} — admin tanlagan ranglar
 * @returns {string} SVG
 */
export function natijaSvg({ rasmBase64, mime = 'image/jpeg', tahlil, tavsiyalar = [],
                            brend, logoBase64 = null, logoMime = 'image/png', mavzu = {},
                            sozlama = null }) {
  // Kartochka ko'rinishi admin paneldan (yordamchi orqali) sozlanadi.
  const S = sozlama && typeof sozlama === 'object'
    ? sozlama : kartochkaSozlamasi({}, tahlil?.jins || '');
  const R = palitra(mavzu);
  // Urg'u — qora fon uchun yoritilgan variant, aks holda to'q qizil
  // qora ustida umuman ko'rinmaydi
  const URGU = R.urguTungi || T.qizil;

  const t = tahlil || {};
  const hammaMuammo = (t.muammolar || t.problems || [])
    .map((m) => ({ ...m, foiz: Math.round(Number(m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25))) }))
    .sort((a, b) => b.foiz - a.foiz)
    .map((m, i) => ({ ...m, tartib: i + 1 }));
  const muammolar = S.bloklar.belgilar ? hammaMuammo.slice(0, S.belgi_soni) : [];
  const ball = Math.round(Number(t.ball ?? t.score ?? 0));
  const holatSoz = ball >= 80 ? 'A’lo holat' : ball >= 65 ? 'Yaxshi holat'
                 : ball >= 50 ? 'O‘rtacha holat' : ball >= 35 ? 'E’tibor kerak' : 'Zaif holat';
  const ballRang = ball >= 70 ? T.yashil : ball >= 45 ? T.sariq : T.qizil;
  const yosh = t.taxminiy_yosh || t.age_estimate || '';
  const jins = t.jins || '';
  const teriTuri = t.teri_turi || t.skin_type || '';

  // Rasmning haqiqiy nisbati — nishonlarni to'g'ri joyga qo'yish uchun
  let rasmEni = 3, rasmBoyi = 4;
  if (rasmBase64) {
    const o = rasmOlchami(Buffer.from(rasmBase64, 'base64'));
    if (o && o.en > 0 && o.boy > 0) { rasmEni = o.en; rasmBoyi = o.boy; }
  }

  const q = [];
  const TOLA = ENI - CHET * 2;

  // ══════════════════════════════════════════════
  // 1. SARLAVHA
  // ══════════════════════════════════════════════
  let y = 62;
  if (logoBase64) {
    q.push(`<clipPath id="logo"><rect x="${CHET}" y="${y - 40}" width="52" height="52" rx="15"/></clipPath>
      <image href="data:${logoMime};base64,${logoBase64}" x="${CHET}" y="${y - 40}"
        width="52" height="52" clip-path="url(#logo)" preserveAspectRatio="xMidYMid slice"/>`);
  }
  const brendX = logoBase64 ? CHET + 68 : CHET;
  q.push(matn(brend, y, { x: brendX, olcham: 44, ogirlik: 700, rang: T.oq }));
  q.push(matn(S.teg, y + 32, { x: brendX, olcham: 23, rang: T.kul }));
  q.push(matn(sana(), y - 6, { x: ENI - CHET, oxiri: true, olcham: 23, rang: T.och }));
  y += 62;

  // ══════════════════════════════════════════════
  // 2. SURAT — YUQORIDA, KENGLIK BO'YLAB O'RTADA
  // ══════════════════════════════════════════════
  // Surat BALAND va TOR: 3:4 selfi shu nisbatda deyarli kesilmaydi.
  // Keng qutida rasmning tepasi bilan pasti kesilar, peshonadagi
  // belgi esa kadrdan butunlay chiqib ketardi.
  //
  // Ilgari ball kartasi suratning YONIDA turardi. Endi u pastda,
  // to'liq kenglikda: «umumiy teri holati rasmning ostida bo'lsin».
  // Shu bilan surat ham kattaroq bo'ldi va xulosa uchun ham
  // tor ustun emas, butun kenglik ochildi.
  const HERO_H = rasmBase64 ? 700 : 0;
  const SURAT_ENI = rasmBase64 ? 560 : 0;
  const SURAT_X = Math.round((ENI - SURAT_ENI) / 2);

  if (rasmBase64) {
    q.push(`<clipPath id="yuz"><rect x="${SURAT_X}" y="${y}" width="${SURAT_ENI}" height="${HERO_H}" rx="26"/></clipPath>
      <image href="data:${mime};base64,${rasmBase64}" x="${SURAT_X}" y="${y}"
        width="${SURAT_ENI}" height="${HERO_H}" clip-path="url(#yuz)" preserveAspectRatio="xMidYMid slice"/>`);

    // Raqamli nishonlar — ilovadagi ro'yxat bilan BIR XIL raqam
    const joyla = qoplash(SURAT_X, y, SURAT_ENI, HERO_H, rasmEni, rasmBoyi);
    for (const m of muammolar) {
      if (!m.joy) continue;
      const p = joyla(m.joy.x, m.joy.y);
      if (p.x < SURAT_X + 16 || p.x > SURAT_X + SURAT_ENI - 16) continue;
      if (p.y < y + 16 || p.y > y + HERO_H - 16) continue;
      const rang = m.foiz >= 60 ? T.qizil : m.foiz >= 35 ? T.sariq : T.yashil;
      q.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="30" fill="none"
        stroke="${rang}" stroke-width="2" stroke-dasharray="5 5" opacity="0.75"/>`);
      q.push(raqamNishoni(p.x, p.y, 18, m.tartib, rang));
    }
  }

  // ── Teri «rentgeni» — bitta suratning olti ko'rinishi ──
  // Hech narsa o'ylab topilmaydi: bu o'sha surat, faqat boshqa
  // kanalda. AI muammoni aniq joyga bog'lay olmaganda ham odam
  // o'z terisini boshqacha ko'radi. Oltitasi ilovadagi qatlamlar
  // bilan bir xil — rasm va ilova bir narsani ko'rsatsin.
  const RENTGEN_ORALIQ = 12;
  const RENTGEN_KEN = Math.floor((TOLA - RENTGEN_ORALIQ * (RENTGEN.length - 1)) / RENTGEN.length);
  // Balandlik: kvadrat + yozuv + pastki bo'shliq. Ilgari qotib
  // turgan 128 edi va yozuv keyingi bo'lim ustiga tushib ketardi.
  const RENTGEN_H = rasmBase64 ? RENTGEN_KEN + 52 : 0;
  if (rasmBase64) {
    const ken = RENTGEN_KEN;
    const ry = y + HERO_H + 16;
    RENTGEN.forEach((r, i) => {
      const kx = CHET + i * (ken + RENTGEN_ORALIQ);
      q.push(`<clipPath id="rk${i}"><rect x="${kx}" y="${ry}" width="${ken}" height="${ken}" rx="16"/></clipPath>
        <image href="data:${mime};base64,${rasmBase64}" x="${kx}" y="${ry}"
          width="${ken}" height="${ken}" clip-path="url(#rk${i})"
          preserveAspectRatio="xMidYMid slice"${r.filtr ? ` filter="url(#f-${r.kalit})"` : ''}/>`);
      q.push(matn(r.nom, ry + ken + 28, { x: kx + ken / 2, markaz: true,
        olcham: 19, ogirlik: 700, rang: T.kul }));
    });
  }
  y += HERO_H + RENTGEN_H + (rasmBase64 ? 18 : 0);

  // ══════════════════════════════════════════════
  // 2b. UMUMIY TERI HOLATI — RASM OSTIDA, TO'LIQ ENDA
  // ══════════════════════════════════════════════
  {
    const MATN_X = CHET + 300;            // halqadan keyin
    const MATN_EN = TOLA - 300 - 30;
    const xulosa = S.bloklar.xulosa ? String(t.xulosa || t.summary || '') : '';
    const tavsif = String(t.tavsif || '');
    const xulosaQ = xulosa ? qatorlarga(xulosa, MATN_EN, 24).slice(0, 4) : [];
    const tavsifQ = tavsif ? qatorlarga(tavsif, MATN_EN, 21).slice(0, 3) : [];

    // Balandlikni OLDIN hisoblaymiz: matn kartadan chiqib ketmasin
    let ich = 62 + 48 + 52;               // sarlavha + holat + teglar
    if (xulosaQ.length) ich += 12 + xulosaQ.length * 32;
    if (tavsifQ.length) ich += 30 + tavsifQ.length * 28;
    const BALL_H = Math.max(268, ich + 34);

    q.push(karta(CHET, y, TOLA, BALL_H, { r: 26 }));

    const cx = CHET + 152, cy = y + BALL_H / 2, r = 92, qal = 18;
    const aylana = 2 * Math.PI * r;
    const to = (aylana * Math.max(0, Math.min(100, ball))) / 100;
    q.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${T.plitka}" stroke-width="${qal}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ballRang}"
        stroke-width="${qal}" stroke-linecap="round"
        stroke-dasharray="${to.toFixed(1)} ${(aylana - to).toFixed(1)}"
        transform="rotate(-90 ${cx} ${cy})"/>`);
    q.push(matn(String(ball), cy + 18, { x: cx, markaz: true, olcham: 72, ogirlik: 700, rang: T.oq }));
    q.push(matn('/ 100', cy + 52, { x: cx, markaz: true, olcham: 22, rang: T.och }));

    let yy = y + 62;
    q.push(matn('UMUMIY TERI HOLATI', yy, { x: MATN_X, olcham: 19, ogirlik: 700, rang: T.och }));
    yy += 48;
    q.push(matn(holatSoz, yy, { x: MATN_X, olcham: 40, ogirlik: 700, rang: ballRang }));
    yy += 16;

    // RANGLI teglar: yosh, jins, teri turi. Ilgari ular pastda,
    // kulrang mayda matnda edi va ko'rinmasdi.
    const teglar = [
      yosh && { matn: `${yosh} yosh`, rang: '#4AA3FF' },
      jins === 'erkak' ? { matn: 'Erkak', rang: URGU }
        : jins === 'ayol' ? { matn: 'Ayol', rang: URGU } : null,
      teriTuri && { matn: `${teriTuri} teri`, rang: T.yashil },
    ].filter(Boolean);
    let tx = MATN_X;
    for (const g of teglar) {
      const ken = Math.round(g.matn.length * 12.2) + 32;
      if (tx + ken > ENI - CHET - 30) break;
      q.push(`<rect x="${tx}" y="${yy}" width="${ken}" height="42" rx="21"
        fill="${g.rang}22" stroke="${g.rang}66" stroke-width="1.5"/>`);
      q.push(matn(g.matn, yy + 28, { x: tx + ken / 2, markaz: true, olcham: 21,
        ogirlik: 700, rang: g.rang }));
      tx += ken + 8;
    }
    yy += 52;

    if (xulosaQ.length) {
      yy += 12;
      xulosaQ.forEach((str) => {
        q.push(matn(str, yy, { x: MATN_X, olcham: 24, rang: T.kul }));
        yy += 32;
      });
    }

    // «MEN RASMDA NIMA KO'RDIM» — bezak emas: odam o'z suratining
    // tafsilotini o'qib, tahlil AYNAN uning rasmidan chiqqaniga
    // ishonch hosil qiladi.
    if (tavsifQ.length) {
      yy += 6;
      q.push(matn('RASMDA NIMA KO‘RDIM', yy, { x: MATN_X, olcham: 17,
        ogirlik: 700, rang: T.och }));
      yy += 28;
      tavsifQ.forEach((str) => {
        q.push(matn(str, yy, { x: MATN_X, olcham: 21, rang: T.och }));
        yy += 28;
      });
    }
    y += BALL_H + 18;
  }

  // ══════════════════════════════════════════════
  // 3. TERI KO'RSATKICHLARI — DOIM YETTITA
  // ══════════════════════════════════════════════
  //
  // Ilgari bu yerda topilgan muammolardan yasalgan to'rtta katak
  // turardi: terisi toza odam bitta ham ko'rsatkich ko'rmasdi va
  // ikki tahlilni solishtirib bo'lmasdi. Endi ro'yxat qat'iy —
  // salon apparatlari beradigan o'sha yettita o'lchov. Ular bir
  // ustunda, chunki nom + shkala + raqam bir qatorda o'qilishi
  // yetti ustunga siqilgan mayda katakdan ancha tushunarli.
  if (S.bloklar.korsatkichlar) {
    const royxat = olchovlarniHisobla(hammaMuammo, t.olchovlar || null);
    const SATR = 58;
    const H = 96 + royxat.length * SATR;
    q.push(karta(CHET, y, TOLA, H, { r: 26 }));
    q.push(matn('Teri ko‘rsatkichlari', y + 52, { x: CHET + 30, olcham: 32,
      ogirlik: 700, rang: T.oq }));
    q.push(matn('100 = ideal', y + 52, { x: ENI - CHET - 30, oxiri: true,
      olcham: 21, rang: T.och }));

    const NOM_X = CHET + 76;         // belgidan keyin
    const SHK_X = CHET + 330;        // shkala shu yerdan boshlanadi
    const SHK_EN = TOLA - 330 - 140; // o'ngda raqamga joy qoladi
    royxat.forEach((o, i) => {
      const sy = y + 96 + i * SATR;
      const rang = beshRang(o.ball);
      q.push(belgiChiz(KALIT_BELGI[o.kalit] || o.ikon || 'tomchi',
        CHET + 48, sy + 6, 26, rang));
      q.push(matn(o.nom, sy + 15, { x: NOM_X, olcham: 25, ogirlik: 600, rang: T.oq }));
      q.push(shkala(SHK_X, sy, SHK_EN, o.ball, rang, { balandlik: 12 }));
      q.push(matn(String(o.ball), sy + 15, { x: ENI - CHET - 30, oxiri: true,
        olcham: 30, ogirlik: 700, rang }));
    });
    y += H + 18;
  }

  // ══════════════════════════════════════════════
  // 4. NIMA TOPILDI
  // ══════════════════════════════════════════════
  if (muammolar.length) {
    // Har muammoning BALANDLIGI o'ziniki: sabab va tavsiya matni
    // uzun-qisqa bo'ladi. Ilgari qator qotib turgan 106 px edi va
    // faqat nom bilan foiz sig'ardi — odam «nega shunday bo'ldi,
    // nima qilay?» degan savoliga javob ilovadan qidirardi.
    const KESIM = 76;
    const olch = muammolar.map((m) => {
      const nomX = rasmBase64 && m.joy ? CHET + 84 + KESIM + 20 : CHET + 84;
      const ichEni = CHET + TOLA - 30 - nomX;
      const sabab = String(m.sabab || m.izoh || '');
      const yechim = String(m.yechim || '');
      const sababQ = sabab ? qatorlarga(sabab, ichEni - 96, 21).slice(0, 2) : [];
      const yechimQ = yechim ? qatorlarga(yechim, ichEni - 96, 21).slice(0, 2) : [];
      // 96 — chapdagi «SABABI» / «TAVSIYA» yorlig'i uchun ustun
      const boy = Math.max(KESIM + 24, 100)
                + (sababQ.length ? sababQ.length * 28 + 10 : 0)
                + (yechimQ.length ? yechimQ.length * 28 + 10 : 0);
      return { m, nomX, ichEni, sababQ, yechimQ, boy };
    });
    const H = 78 + olch.reduce((sum, o) => sum + o.boy + 18, 0);
    q.push(karta(CHET, y, TOLA, H, { r: 26 }));
    q.push(matn(S.sarlavha.belgilar, y + 52, { x: CHET + 30, olcham: 32, ogirlik: 700, rang: T.oq }));

    let sy = y + 78;
    olch.forEach((o, i) => {
      const { m, nomX, ichEni, sababQ, yechimQ } = o;
      const rang = m.foiz >= 60 ? T.qizil : m.foiz >= 35 ? T.sariq : T.yashil;
      if (i > 0) {
        q.push(`<line x1="${CHET + 30}" y1="${sy}" x2="${CHET + TOLA - 30}" y2="${sy}"
          stroke="${T.chiziq}" stroke-width="1.5"/>`);
      }
      q.push(raqamNishoni(CHET + 52, sy + 50, 20, m.tartib, rang));

      // Yuzning O'SHA joyi — kattalashtirilgan bo'lak
      if (rasmBase64 && m.joy) {
        const tomon = KESIM, zoom = 4.2, kx = CHET + 84, ky = sy + 12;
        const vEn = tomon * zoom * Math.max(1, rasmEni / rasmBoyi);
        const vBoy = tomon * zoom * Math.max(1, rasmBoyi / rasmEni);
        const ix = kx + tomon / 2 - (m.joy.x / 100) * vEn;
        const iy = ky + tomon / 2 - (m.joy.y / 100) * vBoy;
        q.push(`<clipPath id="kes${i}"><rect x="${kx}" y="${ky}" width="${tomon}" height="${tomon}" rx="16"/></clipPath>
          <g clip-path="url(#kes${i})"><image href="data:${mime};base64,${rasmBase64}"
            x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${vEn.toFixed(1)}" height="${vBoy.toFixed(1)}"
            preserveAspectRatio="none"/></g>
          <rect x="${kx}" y="${ky}" width="${tomon}" height="${tomon}" rx="16"
            fill="none" stroke="${T.chiziq}" stroke-width="1.5"/>`);
      }

      const foizX = CHET + TOLA - 30;
      q.push(matn(kes(m.nom || '', ichEni - 90, 28, 700), sy + 44,
        { x: nomX, olcham: 28, ogirlik: 700, rang: T.oq }));
      q.push(matn(`${m.foiz}%`, sy + 44, { x: foizX, oxiri: true, olcham: 28, ogirlik: 700, rang }));
      if (m.zona) {
        q.push(matn(kes(m.zona, ichEni - 20, 21), sy + 72, { x: nomX, olcham: 21, rang: T.kul }));
      }
      q.push(shkala(nomX, sy + 84, foizX - nomX, m.foiz, rang, { balandlik: 8 }));

      // SABABI va TAVSIYA — «nega shunday bo'ldi» va «nima qilay».
      // Yorliq chapda, matn o'ngda: ko'z bir ustundan pastga yuradi.
      let ty = sy + Math.max(KESIM + 24, 100) + 22;
      const band = (yorliq, qatlar, tus) => {
        if (!qatlar.length) return;
        q.push(matn(yorliq, ty, { x: nomX, olcham: 17, ogirlik: 700, rang: tus }));
        qatlar.forEach((str) => {
          q.push(matn(str, ty, { x: nomX + 96, olcham: 21, rang: T.kul }));
          ty += 28;
        });
        ty += 10;
      };
      band('SABABI', sababQ, T.och);
      band('TAVSIYA', yechimQ, T.yashil);

      sy += o.boy + 18;
    });
    y += H + 18;
  }

  // ══════════════════════════════════════════════
  // 5. OVQAT — IKKI PANEL
  // ══════════════════════════════════════════════
  const parhez = t.parhez || {};
  const foydali  = (parhez.foydali  || []).slice(0, 5);
  const cheklang = (parhez.cheklang || []).slice(0, 5);
  if (S.bloklar.parhez && (foydali.length || cheklang.length)) {
    const en = Math.floor((TOLA - 16) / 2);
    const bandEni = en - 92;
    const qatorlarni = (royxat) => royxat.map((b) => {
      // Qavs ichidagi izoh tashlanadi — kartochkada faqat NOM kerak
      const nom = String(b).replace(/\s*[（(].*?[)）]\s*$/, '').trim();
      return qatorlarga(nom, bandEni, 23).slice(0, 2);
    });
    const chapQ = qatorlarni(foydali), ongQ = qatorlarni(cheklang);
    const bal = (qq) => qq.reduce((sum, a) => sum + a.length * 28 + 14, 0);
    const H = Math.max(bal(chapQ), bal(ongQ), 70) + 92;

    q.push(matn(S.sarlavha.parhez, y + 34, { olcham: 32, ogirlik: 700, rang: T.oq }));
    y += 58;

    const panellar = [
      { x: CHET, nom: 'Yeng', rang: T.yashil, belgi: 'tasdiq', qat: chapQ, sarlavhaBelgi: 'barg' },
      { x: CHET + en + 16, nom: 'Kamaytiring', rang: T.qizil, belgi: 'chiziqcha',
        qat: ongQ, sarlavhaBelgi: 'ogoh' },
    ];
    for (const u of panellar) {
      q.push(karta(u.x, y, en, H, { r: 24, fon: T.karta, chiziq: u.rang + '55' }));
      q.push(belgiChiz(u.sarlavhaBelgi, u.x + 44, y + 44, 28, u.rang));
      q.push(matn(u.nom, y + 54, { x: u.x + 70, olcham: 30, ogirlik: 700, rang: u.rang }));
      let py = y + 104;
      u.qat.forEach((satrlar) => {
        q.push(`<circle cx="${u.x + 42}" cy="${py - 8}" r="15" fill="${u.rang}"/>`);
        q.push(belgiChiz(u.belgi, u.x + 42, py - 8, 16, T.fon, { qalin: 2.6 }));
        satrlar.forEach((str, i) => q.push(matn(str, py + i * 28,
          { x: u.x + 70, olcham: 23, rang: T.oq })));
        py += satrlar.length * 28 + 14;
      });
      if (!u.qat.length) q.push(matn('—', y + 108, { x: u.x + 34, olcham: 23, rang: T.och }));
    }
    y += H + 18;
  }

  // ══════════════════════════════════════════════
  // 6. MAHSULOTLAR — BITTA QATOR
  // ══════════════════════════════════════════════
  if (S.bloklar.mahsulotlar && tavsiyalar.length) {
    // Hammasi BITTA qatorga sig'adi: mahsulot ko'p bo'lsa karta
    // kichrayadi. Ilgari beshinchi mahsulot pastga tushib, yolg'iz
    // qolardi va rasm bejiz uzayardi.
    const royxat = tavsiyalar.slice(0, Math.min(6, S.mahsulot_soni));
    const oraliq = royxat.length >= 5 ? 10 : 14;
    const en = Math.floor((TOLA - oraliq * (royxat.length - 1)) / royxat.length);
    const rasmH = Math.round(en * 0.94);
    const shr = en < 150 ? 17 : en < 190 ? 19 : 21;
    const nomlar = royxat.map((r) => qatorlarga(r.nom, en - 28, shr, 600).slice(0, 2));
    const maksQator = Math.max(1, ...nomlar.map((a) => a.length));
    const H = rasmH + 34 + maksQator * (shr + 6) + 18;

    q.push(matn(S.sarlavha.mahsulotlar, y + 36, { olcham: 32, ogirlik: 700, rang: T.oq }));
    y += 60;

    royxat.forEach((r, i) => {
      const kx = CHET + i * (en + oraliq);
      const rang = TARTIB_RANG[i % TARTIB_RANG.length] || URGU;
      q.push(karta(kx, y, en, H, { r: 18, fon: T.karta }));
      if (r.rasmBase64) {
        q.push(`<clipPath id="m${i}"><rect x="${kx + 1}" y="${y + 1}"
            width="${en - 2}" height="${rasmH}" rx="17"/></clipPath>
          <image href="data:${r.rasmMime || 'image/png'};base64,${r.rasmBase64}"
            x="${kx + 1}" y="${y + 1}" width="${en - 2}" height="${rasmH}"
            clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
      } else {
        q.push(belgiChiz('tomchi', kx + en / 2, y + rasmH / 2, en * 0.34, T.och, { qalin: 1.4 }));
      }
      q.push(raqamNishoni(kx + 26, y + 26, 17, i + 1, rang));
      q.push(matn(kes(r.bosqich || 'Parvarish', en - 28, shr - 2, 700), y + rasmH + 26,
        { x: kx + 14, olcham: shr - 2, ogirlik: 700, rang }));
      nomlar[i].forEach((s, k) => q.push(matn(s, y + rasmH + 52 + k * (shr + 6),
        { x: kx + 14, olcham: shr, ogirlik: 500, rang: T.kul })));
    });
    y += H + 14;

    const qolgan = tavsiyalar.length - royxat.length;
    if (qolgan > 0) {
      q.push(matn(`va yana ${qolgan} ta mahsulot — ilovada`, y + 20,
        { olcham: 21, rang: T.och }));
      y += 30;
    }
    y += 4;
  }

  // ══════════════════════════════════════════════
  // 7. PASTKI QISM
  // ══════════════════════════════════════════════
  q.push(`<line x1="${CHET}" y1="${y + 6}" x2="${ENI - CHET}" y2="${y + 6}"
    stroke="${T.chiziq}" stroke-width="1.5"/>`);
  y += 48;
  // Yosh va jins TEPADA, rangli teglarda yozilgan — bu yerda
  // takrorlanmaydi
  q.push(matn(brend, y, { olcham: 25, ogirlik: 700, rang: URGU }));
  q.push(matn(sana(), y, { x: ENI - CHET, oxiri: true, olcham: 21, rang: T.och }));
  y += 30;
  if (S.izoh) {
    q.push(matn(S.izoh, y, { olcham: 21, rang: T.och }));
    y += 34;
  }
  y += 12;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <defs>
    ${RENTGEN.map((r) => `<filter id="f-${r.kalit}" color-interpolation-filters="sRGB">
      ${r.filtr}</filter>`).join('\n    ')}
  </defs>
  <rect width="${ENI}" height="${H}" fill="${T.fon}"/>
  ${q.join('\n  ')}
</svg>`;
}
