// Mijozga to'lovdan keyin boradigan RASMLI qo'llanma.
//
// Word hujjati to'liq, lekin uni hamma ham ochmaydi. Telegramda esa rasm
// darrov ko'rinadi — shuning uchun bir qarashda o'qiladigan kartochka:
// qaysi tartibda, qachon (ertalab/kechqurun) va qanchadan.
import { x, qatorlarga } from './chiz.js';
import { palitra, TARTIB_RANG } from '../lib/mavzu.js';

const ENI = 1080;
const CHET = 44;

const VAQT = {
  tozalash: 'Ertalab va kechqurun',
  toner:    'Ertalab va kechqurun',
  davolash: 'Kechqurun',
  namlash:  'Ertalab va kechqurun',
  himoya:   'Faqat ertalab',
  qoshimcha:'Haftasiga 1–2 marta',
  ichki:    'Kuniga 1 marta, ovqatdan keyin',
};
const MIQDOR = {
  tozalash: 'No‘xatdek', toner: '2–3 tomchi kaftga', davolash: '2–3 tomchi',
  namlash: 'No‘xatdek', himoya: 'Ikki barmoq bo‘yi', qoshimcha: 'Bitta varaq',
  ichki: 'Qadoqdagi me’yorda',
};
const BOSQICH_NOM = {
  tozalash: 'Tozalash', toner: 'Toner', davolash: 'Davolash',
  namlash: 'Namlash', himoya: 'Quyoshdan himoya', qoshimcha: 'Qo‘shimcha',
  ichki: 'Ichki qabul',
};

const matn = (s, y, { x: xx = CHET, olcham = 26, ogirlik = 400, rang = '#1f1d1b',
                      oxiri = false, oraliq = 0 } = {}) =>
  `<text x="${xx}" y="${y}" font-size="${olcham}" font-weight="${ogirlik}" fill="${rang}"
    ${oxiri ? 'text-anchor="end"' : ''} ${oraliq ? `letter-spacing="${oraliq}"` : ''}
    font-family="Liberation Sans">${x(s)}</text>`;

/**
 * @param {object} d
 * @param {Array}  d.mahsulotlar  [{nom, brend, bosqich, hajm, rasmBase64, rasmMime, qanday}]
 * @param {string} d.brend
 * @param {string} [d.buyurtma]
 * @param {object} [d.mavzu]
 */
export function qollanmaSvg({ mahsulotlar = [], brend = 'KiOVO', buyurtma = '', mavzu = {} }) {
  const R = palitra(mavzu);
  const q = [];
  const SARLAVHA_H = 190;

  q.push(matn(brend.toUpperCase(), 74, { olcham: 24, ogirlik: 700, rang: R.asosiyMatn, oraliq: 5 }));
  q.push(matn('Parvarish qo‘llanmasi', 130, { olcham: 46, ogirlik: 700, rang: R.asosiyMatn }));
  if (buyurtma) {
    q.push(matn(buyurtma, 130, { x: ENI - CHET, oxiri: true, olcham: 26, rang: R.asosiyMatn }));
  }
  q.push(matn(`${mahsulotlar.length} ta mahsulot · quyidagi TARTIBDA ishlating`, 168,
    { olcham: 24, rang: R.asosiyMatn }));

  let y = SARLAVHA_H + 40;
  mahsulotlar.forEach((p, i) => {
    // Nom ikki qatorga tushsa kartochka ham o'sadi — aks holda oxirgi
    // qator ramkadan chiqib ketadi
    const nomQatSoni = Math.min(2,
      qatorlarga(`${p.brend ? p.brend + ' ' : ''}${p.nom}`, ENI - CHET * 2 - 26 - 138 - 24 - 26, 28, 700).length);
    const kartaH = 190 + (nomQatSoni - 1) * 34;
    const rang = TARTIB_RANG[i % TARTIB_RANG.length];
    q.push(`<rect x="${CHET}" y="${y}" width="${ENI - CHET * 2}" height="${kartaH}" rx="20"
      fill="${R.karta}" stroke="${R.chiziq}"/>`);
    q.push(`<rect x="${CHET}" y="${y}" width="7" height="${kartaH}" rx="3.5" fill="${rang}"/>`);

    // Mahsulot rasmi
    const rx = CHET + 26;
    const ry = y + 26;
    const rasmO = 138;
    if (p.rasmBase64) {
      q.push(`<clipPath id="q${i}"><rect x="${rx}" y="${ry}" width="${rasmO}" height="${rasmO}" rx="16"/></clipPath>
        <image href="data:${p.rasmMime || 'image/png'};base64,${p.rasmBase64}"
          x="${rx}" y="${ry}" width="${rasmO}" height="${rasmO}"
          clip-path="url(#q${i})" preserveAspectRatio="xMidYMid slice"/>`);
    } else {
      q.push(`<rect x="${rx}" y="${ry}" width="${rasmO}" height="${rasmO}" rx="16" fill="${R.plitka}"/>`);
    }

    // Raqam
    q.push(`<circle cx="${rx + 22}" cy="${ry + 22}" r="21" fill="${rang}"/>`);
    q.push(matn(String(i + 1), ry + 30, { x: rx + 22, olcham: 22, ogirlik: 700,
      rang: '#ffffff', oxiri: false }).replace('<text ', '<text text-anchor="middle" '));

    const tx = rx + rasmO + 24;
    const tEni = ENI - CHET - 26 - tx;
    q.push(matn((BOSQICH_NOM[p.bosqich] || 'Parvarish').toUpperCase(), ry + 22,
      { x: tx, olcham: 21, ogirlik: 700, rang, oraliq: 2 }));

    const nomQat = qatorlarga(`${p.brend ? p.brend + ' ' : ''}${p.nom}`, tEni, 28, 700).slice(0, 2);
    let ny = ry + 60;
    nomQat.forEach((s) => { q.push(matn(s, ny, { x: tx, olcham: 28, ogirlik: 700, rang: R.matn })); ny += 34; });

    q.push(matn(`Qachon: ${VAQT[p.bosqich] || 'Ko‘rsatmaga qarab'}`, ny + 6,
      { x: tx, olcham: 23, rang: R.kul }));
    q.push(matn(`Qancha: ${MIQDOR[p.bosqich] || 'Ko‘rsatmaga qarab'}`
      + (p.hajm ? `  ·  ${p.hajm}` : ''), ny + 38, { x: tx, olcham: 23, rang: R.kul }));

    y += kartaH + 16;
  });

  y += 14;
  q.push(`<rect x="${CHET}" y="${y}" width="${ENI - CHET * 2}" height="118" rx="18"
    fill="${R.urguOch}"/>`);
  q.push(matn('ESLATMA', y + 40, { x: CHET + 24, olcham: 21, ogirlik: 700, rang: R.urguTim, oraliq: 2 }));
  q.push(matn('Suyuqdan quyuqqa: toner → serum → krem. SPF ni tashlab ketmang.',
    y + 76, { x: CHET + 24, olcham: 24, rang: R.matn }));
  y += 150;

  q.push(matn(brend, y, { olcham: 24, ogirlik: 700, rang: R.urgu }));
  q.push(matn('Kosmetologik tavsiya — tibbiy tashxis emas', y,
    { x: ENI - CHET, oxiri: true, olcham: 21, rang: R.kul }));
  y += 40;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <rect width="${ENI}" height="${H}" fill="${R.fon}"/>
  <path d="M0 0 H${ENI} V${SARLAVHA_H - 30} a30 30 0 0 1-30 30 H30 a30 30 0 0 1-30-30 Z"
    fill="${R.asosiy}"/>
  ${q.join('\n  ')}
</svg>`;
}
