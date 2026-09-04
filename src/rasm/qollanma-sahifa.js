// PDF qo'llanmaning A4 sahifalari (SVG).
//
// Word hujjatida mahsulot RASMI yo'q edi — mijoz qutidan flakonni olib,
// qaysi biri «2-qadam» ekanini matndan izlashi kerak edi. Bu yerda har
// mahsulot o'z surati bilan chiqadi va qadamlar bo'yicha tartiblanadi.
import { x, qatorlarga } from './chiz.js';
import { palitra, TARTIB_RANG } from '../lib/mavzu.js';

// A4 nisbati (210×297) — 150 dpi da
export const SAHIFA_ENI  = 1240;
export const SAHIFA_BOYI = 1754;
const CHET = 84;
const ICH  = SAHIFA_ENI - CHET * 2;

export const BOSQICH_NOM = {
  tozalash: 'Tozalash', toner: 'Toner', davolash: 'Davolash (serum)',
  namlash: 'Namlash', himoya: 'Quyoshdan himoya', qoshimcha: 'Qo‘shimcha',
  ichki: 'Ichki qabul',
};
const VAQT = {
  tozalash: 'Ertalab va kechqurun', toner: 'Ertalab va kechqurun',
  davolash: 'Kechqurun', namlash: 'Ertalab va kechqurun',
  himoya: 'Faqat ertalab', qoshimcha: 'Haftasiga 1–2 marta',
  ichki: 'Kuniga 1 marta, ovqatdan keyin',
};
const MIQDOR = {
  tozalash: 'No‘xatdek', toner: '2–3 tomchi kaftga', davolash: '2–3 tomchi',
  namlash: 'No‘xatdek', himoya: 'Ikki barmoq bo‘yi', qoshimcha: 'Bitta varaq',
  ichki: 'Qadoqdagi me’yorda',
};
const BOSQICH_IZOH = {
  tozalash: 'Yuzni iliq suv bilan ho‘llang, vositani qo‘lda ko‘piklantirib, '
          + 'aylanma harakatlar bilan 30–60 soniya massaj qiling va yuving.',
  toner:    'Toza paxta yoki kaftga oling va nam teriga yengil urib singdiring. Ishqalamang.',
  davolash: 'Bir necha tomchi oling, muammoli sohalarga surting. Singishini kuting.',
  namlash:  'Teri hali nam turganda surting — namlik ichkarida qulflanadi.',
  himoya:   'Ertalabki parvarishning ENG OXIRGI bosqichi. Har 2–3 soatda yangilang.',
  qoshimcha:'Haftasiga 1–2 marta, asosiy parvarishdan keyin.',
  ichki:    'Ichki qabul qilinadi — qadoqdagi ko‘rsatmaga amal qiling.',
};

const t = (s, y, { x: xx = CHET, olcham = 26, ogirlik = 400, rang = '#1f1d1b',
                   oxiri = false, orta = false, oraliq = 0 } = {}) =>
  `<text x="${xx}" y="${y}" font-size="${olcham}" font-weight="${ogirlik}" fill="${rang}"
    ${oxiri ? 'text-anchor="end"' : orta ? 'text-anchor="middle"' : ''}
    ${oraliq ? `letter-spacing="${oraliq}"` : ''}
    font-family="Liberation Sans">${x(s)}</text>`;

/** Ko'p qatorli matn — chizilgan balandlikni qaytaradi. */
function abzats(q, matn, y, { eni = ICH, olcham = 25, ogirlik = 400, rang = '#1f1d1b',
                              qadam = 36, xx = CHET, max = 99 } = {}) {
  const qat = qatorlarga(matn, eni, olcham, ogirlik).slice(0, max);
  qat.forEach((s, i) => q.push(t(s, y + i * qadam, { x: xx, olcham, ogirlik, rang })));
  return qat.length * qadam;
}

const sahifa = (ichi, R) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SAHIFA_ENI}" height="${SAHIFA_BOYI}"
     viewBox="0 0 ${SAHIFA_ENI} ${SAHIFA_BOYI}">
  <rect width="${SAHIFA_ENI}" height="${SAHIFA_BOYI}" fill="${R.fon}"/>
  ${ichi}
</svg>`;

/** Pastdagi imzo — har sahifada bir xil. */
function futer(q, R, brend, sahifaRaqam) {
  const y = SAHIFA_BOYI - 56;
  q.push(`<line x1="${CHET}" y1="${y - 34}" x2="${SAHIFA_ENI - CHET}" y2="${y - 34}"
    stroke="${R.chiziq}" stroke-width="2"/>`);
  q.push(t(brend, y, { olcham: 22, ogirlik: 700, rang: R.urgu }));
  q.push(t('Kosmetologik tavsiya — tibbiy tashxis emas', y,
    { x: SAHIFA_ENI / 2, orta: true, olcham: 20, rang: R.kul }));
  if (sahifaRaqam) {
    q.push(t(String(sahifaRaqam), y, { x: SAHIFA_ENI - CHET, oxiri: true, olcham: 20, rang: R.kul }));
  }
}

// ─────────────── 1-sahifa: muqova va tartib ───────────────
function muqova({ mahsulotlar, brend, buyurtma, mijoz }, R, raqam) {
  const q = [];
  const BOSH = 300;
  q.push(`<path d="M0 0 H${SAHIFA_ENI} V${BOSH - 40} a40 40 0 0 1-40 40 H40 a40 40 0 0 1-40-40 Z"
    fill="${R.asosiy}"/>`);
  q.push(t(brend.toUpperCase(), 108, { olcham: 26, ogirlik: 700, rang: R.asosiyMatn, oraliq: 6 }));
  q.push(t('Parvarish qo‘llanmasi', 180, { olcham: 56, ogirlik: 700, rang: R.asosiyMatn }));
  q.push(t([buyurtma && `Buyurtma ${buyurtma}`, mijoz].filter(Boolean).join('   ·   '), 232,
    { olcham: 26, rang: R.asosiyMatn }));
  q.push(t(`${mahsulotlar.length} ta mahsulot · quyidagi TARTIBDA ishlating`, 274,
    { olcham: 24, rang: R.asosiyMatn }));

  let y = BOSH + 56;
  y += abzats(q, 'Xaridingiz uchun rahmat! Quyida siz olgan mahsulotlarni qanday '
    + 'tartibda va qanday ishlatish yozilgan. Tartibni buzmang — har bosqich '
    + 'keyingisining ta’sirini kuchaytiradi.', y, { rang: R.kul, olcham: 25, qadam: 36 });
  y += 30;

  // Har mahsulot — surati, qadami, qachon va qanchadan
  for (const [i, p] of mahsulotlar.entries()) {
    const nomQat = qatorlarga(`${p.brend ? p.brend + ' ' : ''}${p.nom}`,
      ICH - 40 - 150 - 28, 28, 700).slice(0, 2);
    const balandlik = 198 + (nomQat.length - 1) * 36;
    const rang = TARTIB_RANG[i % TARTIB_RANG.length];

    q.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${balandlik}" rx="22"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    q.push(`<rect x="${CHET}" y="${y}" width="8" height="${balandlik}" rx="4" fill="${rang}"/>`);

    const rx = CHET + 30, ry = y + 24, ro = 150;
    if (p.rasmBase64) {
      q.push(`<clipPath id="m${i}"><rect x="${rx}" y="${ry}" width="${ro}" height="${ro}" rx="18"/></clipPath>
        <image href="data:${p.rasmMime || 'image/png'};base64,${p.rasmBase64}"
          x="${rx}" y="${ry}" width="${ro}" height="${ro}"
          clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
    } else {
      q.push(`<rect x="${rx}" y="${ry}" width="${ro}" height="${ro}" rx="18" fill="${R.plitka}"/>`);
    }
    q.push(`<circle cx="${rx + 24}" cy="${ry + 24}" r="23" fill="${rang}"/>`);
    q.push(t(String(i + 1), ry + 33, { x: rx + 24, orta: true, olcham: 24,
      ogirlik: 700, rang: '#ffffff' }));

    const tx = rx + ro + 28;
    q.push(t((BOSQICH_NOM[p.bosqich] || 'Parvarish').toUpperCase(), ry + 24,
      { x: tx, olcham: 21, ogirlik: 700, rang, oraliq: 2 }));
    let ny = ry + 66;
    nomQat.forEach((s) => { q.push(t(s, ny, { x: tx, olcham: 28, ogirlik: 700, rang: R.matn })); ny += 36; });
    q.push(t(`Qachon: ${VAQT[p.bosqich] || 'Ko‘rsatmaga qarab'}`, ny + 4,
      { x: tx, olcham: 23, rang: R.kul }));
    q.push(t(`Qancha: ${MIQDOR[p.bosqich] || 'Ko‘rsatmaga qarab'}`
      + (p.hajm ? `  ·  ${p.hajm}` : ''), ny + 38, { x: tx, olcham: 23, rang: R.kul }));

    y += balandlik + 18;
    if (y > SAHIFA_BOYI - 300) break;      // qolgani keyingi sahifalarda batafsil
  }

  q.push(`<rect x="${CHET}" y="${SAHIFA_BOYI - 220}" width="${ICH}" height="110" rx="20"
    fill="${R.urguOch}"/>`);
  q.push(t('ESLATMA', SAHIFA_BOYI - 176, { x: CHET + 28, olcham: 21, ogirlik: 700,
    rang: R.urguTim, oraliq: 2 }));
  q.push(t('Suyuqdan quyuqqa: toner → serum → krem. SPF ni tashlab ketmang.',
    SAHIFA_BOYI - 138, { x: CHET + 28, olcham: 24, rang: R.matn }));

  futer(q, R, brend, raqam);
  return sahifa(q.join('\n  '), R);
}

// ─────────────── Mahsulot sahifasi ───────────────
function mahsulotSahifasi(p, i, jami, { brend }, R, raqam) {
  const q = [];
  const rang = TARTIB_RANG[i % TARTIB_RANG.length];
  const BOSH = 96;

  q.push(`<rect x="0" y="0" width="${SAHIFA_ENI}" height="10" fill="${rang}"/>`);
  q.push(t(`${i + 1}-QADAM · ${(BOSQICH_NOM[p.bosqich] || 'PARVARISH').toUpperCase()}`,
    BOSH, { olcham: 22, ogirlik: 700, rang, oraliq: 3 }));
  q.push(t(`${i + 1} / ${jami}`, BOSH, { x: SAHIFA_ENI - CHET, oxiri: true,
    olcham: 22, rang: R.kul }));

  let y = BOSH + 62;
  y += abzats(q, `${p.brend ? p.brend + ' · ' : ''}${p.nom}`, y,
    { olcham: 42, ogirlik: 700, rang: R.matn, qadam: 54, max: 3 });
  if (p.hajm) { q.push(t(p.hajm, y + 8, { olcham: 24, rang: R.kul })); y += 44; }
  y += 26;

  // Katta surat — mijoz flakonni qutidan ajratib olsin
  const rasmB = 460;
  if (p.rasmBase64) {
    q.push(`<clipPath id="k${i}"><rect x="${CHET}" y="${y}" width="${ICH}" height="${rasmB}" rx="26"/></clipPath>
      <rect x="${CHET}" y="${y}" width="${ICH}" height="${rasmB}" rx="26" fill="${R.plitka}"/>
      <image href="data:${p.rasmMime || 'image/png'};base64,${p.rasmBase64}"
        x="${CHET}" y="${y}" width="${ICH}" height="${rasmB}"
        clip-path="url(#k${i})" preserveAspectRatio="xMidYMid meet"/>`);
  } else {
    q.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${rasmB}" rx="26" fill="${R.plitka}"/>`);
    q.push(t('Rasm yo‘q', y + rasmB / 2, { x: SAHIFA_ENI / 2, orta: true, olcham: 26, rang: R.och }));
  }
  y += rasmB + 46;

  // Qachon / qanchadan — bir qarashda
  const yorliq = [
    ['QACHON', VAQT[p.bosqich] || 'Ko‘rsatmaga qarab'],
    ['QANCHA', MIQDOR[p.bosqich] || 'Ko‘rsatmaga qarab'],
  ];
  const yEni = (ICH - 20) / 2;
  yorliq.forEach(([nom, qiy], j) => {
    const xx = CHET + j * (yEni + 20);
    q.push(`<rect x="${xx}" y="${y}" width="${yEni}" height="108" rx="18"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    q.push(t(nom, y + 40, { x: xx + 26, olcham: 19, ogirlik: 700, rang: R.och, oraliq: 2 }));
    q.push(t(qiy, y + 78, { x: xx + 26, olcham: 24, ogirlik: 700, rang: R.matn }));
  });
  y += 148;

  const bolim = (sarlavha, matn, max = 5) => {
    if (!matn || y > SAHIFA_BOYI - 190) return;
    q.push(t(sarlavha, y, { olcham: 20, ogirlik: 700, rang: rang, oraliq: 2 }));
    y += 38;
    y += abzats(q, matn, y, { olcham: 24, rang: R.matn, qadam: 34, max });
    y += 24;
  };
  bolim('NIMA QILADI', p.tavsif, 4);
  bolim('QANDAY ISHLATILADI', p.qanday || BOSQICH_IZOH[p.bosqich] || '', 5);
  if (p.faol?.length) bolim('FAOL MODDALAR', p.faol.join(', '), 2);
  if (p.ogohlantirish) bolim('EHTIYOT BO‘LING', p.ogohlantirish, 3);
  if (p.tarkib) bolim('TARKIBI', p.tarkib, 4);

  futer(q, R, brend, raqam);
  return sahifa(q.join('\n  '), R);
}

// ─────────────── Oxirgi sahifa: umumiy qoidalar ───────────────
const QOIDALAR = [
  ['Bittadan qo‘shing', 'Yangi mahsulotlarni birdaniga boshlamang — 2–3 kunda bittadan '
    + 'qo‘shing. Shunda teri qaysi vositaga qanday javob berayotganini bilasiz.'],
  ['Suyuqdan quyuqqa', 'Har doim eng suyuq vositadan eng quyuqiga qarab boring: '
    + 'toner → serum → krem.'],
  ['SPF ni tashlamang', 'Quyoshdan himoya eng muhim bosqich. Usiz qolgan parvarishning '
    + 'yarim foydasi yo‘qoladi — bulutli kunda ham surting.'],
  ['Sabr qiling', 'Natija 4–8 haftada ko‘rinadi. Birinchi haftada o‘zgarish '
    + 'bo‘lmasa — bu normal.'],
  ['Avval sinab ko‘ring', 'Yangi vositani birinchi marta ishlatishdan oldin bilak ichiga '
    + 'oz miqdorda surtib, 24 soat kuting.'],
];

function qoidaSahifasi({ brend, telefon, konsultant }, R, raqam) {
  const q = [];
  q.push(`<rect x="0" y="0" width="${SAHIFA_ENI}" height="10" fill="${R.asosiy}"/>`);
  q.push(t('UMUMIY QOIDALAR', 96, { olcham: 22, ogirlik: 700, rang: R.urgu, oraliq: 3 }));
  q.push(t('Beshta qoida — natijaning yarmi shunda', 158,
    { olcham: 40, ogirlik: 700, rang: R.matn }));

  let y = 240;
  QOIDALAR.forEach(([nom, izoh], i) => {
    const qat = qatorlarga(izoh, ICH - 116, 24, 400);
    const b = 96 + qat.length * 34;
    q.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="${b}" rx="20"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    q.push(`<circle cx="${CHET + 44}" cy="${y + 48}" r="22"
      fill="${TARTIB_RANG[i % TARTIB_RANG.length]}"/>`);
    q.push(t(String(i + 1), y + 57, { x: CHET + 44, orta: true, olcham: 23,
      ogirlik: 700, rang: '#ffffff' }));
    q.push(t(nom, y + 56, { x: CHET + 84, olcham: 27, ogirlik: 700, rang: R.matn }));
    abzats(q, izoh, y + 94, { xx: CHET + 84, eni: ICH - 116, olcham: 24,
      rang: R.kul, qadam: 34 });
    y += b + 18;
  });

  y += 20;
  q.push(`<rect x="${CHET}" y="${y}" width="${ICH}" height="176" rx="22" fill="${R.urguOch}"/>`);
  q.push(t('SAVOLINGIZ BORMI?', y + 52, { x: CHET + 32, olcham: 21, ogirlik: 700,
    rang: R.urguTim, oraliq: 2 }));
  q.push(t('Yozing yoki qo‘ng‘iroq qiling — parvarishni birga sozlaymiz.',
    y + 96, { x: CHET + 32, olcham: 24, rang: R.matn }));
  const aloqa = [telefon && `Telefon: ${telefon}`, konsultant && `Telegram: @${konsultant}`]
    .filter(Boolean).join('     ');
  if (aloqa) q.push(t(aloqa, y + 138, { x: CHET + 32, olcham: 24, ogirlik: 700, rang: R.matn }));

  futer(q, R, brend, raqam);
  return sahifa(q.join('\n  '), R);
}

/**
 * Bitta buyurtmaning barcha sahifalari (SVG massivi).
 *
 * @param {object} d
 * @param {Array}  d.mahsulotlar [{nom, brend, bosqich, hajm, qanday, tavsif,
 *                                 tarkib, ogohlantirish, faol, rasmBase64, rasmMime}]
 * @param {number} [d.boshRaqam] sahifa raqamlash shu sondan boshlanadi
 */
export function qollanmaSahifalari(d) {
  const R = palitra(d.mavzu && typeof d.mavzu === 'object' ? d.mavzu : {});
  const brend = d.brend || 'KiOVO';
  const mahsulotlar = d.mahsulotlar || [];
  let n = d.boshRaqam || 1;

  const sahifalar = [muqova({ ...d, brend, mahsulotlar }, R, n++)];
  mahsulotlar.forEach((p, i) => {
    sahifalar.push(mahsulotSahifasi(p, i, mahsulotlar.length, { brend }, R, n++));
  });
  sahifalar.push(qoidaSahifasi({ brend, telefon: d.telefon, konsultant: d.konsultant }, R, n++));
  return sahifalar;
}
