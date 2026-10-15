// MAKIYAJ NATIJASI RASMI — «Mening rangim» kartochkasi (botga yuboriladi).
//
// Teri tahlili kartochkasi bilan bir xil qora varaq (natija-kartochka.js):
// odam ikkalasini bir oiladan deb taniydi.
//
// Tuzilishi (yuqoridan pastga):
//   1. Logo, «Mening rangim» va sana
//   2. Chapda — odamning surati, o'ngda — rang tipi, ton kodi, teri rangi
//   3. Sizga mos ranglar: lab, rumyana, ko'z soyasi (erkaklarga — yo'q)
//   4. Makiyaj tartibi: raqam, bosqich, mahsulot surati va nomi, moslik foizi.
//      Katalogda mos mahsulot bo'lmasa — o'sha bosqich maslahati
//
// Emoji ISHLATILMAYDI: resvg rangli emoji shriftini chizmaydi.
import { x, qatorlarga, kes, SHRIFT } from './chiz.js';
import { BREND, LOGO_QUTI, logoQismlari } from '../lib/logo.js';

const ENI = 1080;
const CHET = 40;
const TOLA = ENI - CHET * 2;

const T = {
  fon: '#08080A', karta: '#141417', chiziq: '#26262C', plitka: '#1C1C21',
  oq: '#FFFFFF', kul: '#9A9AA6', och: '#6C6C78', urgu: '#FF5C7A', yashil: '#3DD68C',
};

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
function sana(d = new Date()) {
  const t = new Date(d.getTime() + 5 * 3600 * 1000);   // Toshkent vaqti
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const matn = (s, y, o = {}) => `<text x="${o.x ?? CHET}" y="${y}" font-family="${SHRIFT}"
  font-size="${o.olcham ?? 26}" font-weight="${o.ogirlik ?? 400}" fill="${o.rang ?? T.oq}"
  ${o.oxiri ? 'text-anchor="end"' : ''} ${o.markaz ? 'text-anchor="middle"' : ''}>${x(s)}</text>`;
const karta = (xx, y, en, boy, { r = 24, fon = T.karta } = {}) =>
  `<rect x="${xx}" y="${y}" width="${en}" height="${boy}" rx="${r}" fill="${fon}" stroke="${T.chiziq}" stroke-width="1.5"/>`;
const hexmi = (h) => /^#[0-9a-f]{6}$/i.test(String(h || ''));

function logoChiz(q, x0, yuqori, boy, rang) {
  const k = boy / LOGO_QUTI.boy;
  q.push(`<g transform="translate(${(x0 - LOGO_QUTI.x * k).toFixed(2)} ${(yuqori - LOGO_QUTI.y * k).toFixed(2)}) scale(${k.toFixed(5)})">${logoQismlari(rang)}</g>`);
  return LOGO_QUTI.en * k;
}

const YUZ = { oval: 'Oval', dumaloq: 'Dumaloq', kvadrat: 'Kvadrat', yurak: 'Yurak', uzunchoq: 'Uzunchoq', olmos: 'Olmos' };
const KOZ = { bodom: 'Bodomsimon', dumaloq: 'Dumaloq', osilgan: 'Osilgan qovoq', monolid: 'Monolid', chuqur: 'Chuqur', ensiz: 'Ensiz' };

/**
 * @param {object} d
 * @param {object} d.rangim        services/makiyaj.js → korinish() natijasi
 * @param {Map}    d.mahsulotlar   id → {nom, rasmBase64?, rasmMime?}
 * @param {string|null} d.rasmBase64  odamning surati (prefiksiz)
 * @param {string} [d.brend]
 * @returns {string} SVG
 */
export function makiyajSvg({ rangim: r, mahsulotlar = new Map(), rasmBase64 = null, mime = 'image/jpeg', brend = 'KiOVO' }) {
  const q = [];
  const p = r.palitra || {};
  const erkak = Boolean(r.erkak);
  let y = 62;

  // ── 1. SARLAVHA ──
  if (/^\s*kiovo\s*$/i.test(brend || '')) {
    const en = logoChiz(q, CHET, y - 38, 62, BREND.lime);
    q.push(matn('Mening rangim', y + 8, { x: CHET + en + 22, olcham: 25, rang: T.kul }));
  } else {
    q.push(matn(brend, y, { olcham: 44, ogirlik: 700 }));
    q.push(matn('Mening rangim', y + 32, { olcham: 23, rang: T.kul }));
  }
  q.push(matn(sana(), y - 6, { x: ENI - CHET, oxiri: true, olcham: 23, rang: T.och }));
  y += 70;

  // ── 2. SURAT + RANG TIPI ──
  const HERO = 560;
  const SURAT_EN = rasmBase64 ? 420 : 0;
  if (rasmBase64) {
    q.push(`<clipPath id="surat"><rect x="${CHET}" y="${y}" width="${SURAT_EN}" height="${HERO}" rx="28"/></clipPath>
      <image href="data:${mime};base64,${rasmBase64}" x="${CHET}" y="${y}" width="${SURAT_EN}" height="${HERO}"
        clip-path="url(#surat)" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${CHET}" y="${y}" width="${SURAT_EN}" height="${HERO}" rx="28" fill="none" stroke="${T.chiziq}" stroke-width="1.5"/>`);
  }
  const ox = CHET + (rasmBase64 ? SURAT_EN + 32 : 0);
  const oen = ENI - CHET - ox;
  q.push(karta(ox, y, oen, HERO, { r: 28 }));
  let iy = y + 62;
  q.push(matn('RANG TIPI', iy, { x: ox + 30, olcham: 21, ogirlik: 700, rang: T.urgu }));
  iy += 70;
  q.push(matn(r.rang_tipi_nom || '', iy, { x: ox + 30, olcham: 68, ogirlik: 700 }));
  iy += 16;
  for (const s of qatorlarga(p.izoh || '', oen - 60, 23).slice(0, 3)) {
    iy += 34; q.push(matn(s, iy, { x: ox + 30, olcham: 23, rang: T.kul }));
  }
  // Teri rangi doirasi va ton kodi
  iy += 56;
  const teri = hexmi(r.teri_hex) ? r.teri_hex : '#E8C4A8';
  q.push(`<circle cx="${ox + 30 + 38}" cy="${iy + 20}" r="38" fill="${teri}" stroke="#fff" stroke-opacity="0.25" stroke-width="3"/>`);
  q.push(matn(`${erkak ? 'BB krem' : 'Kushon'} toni`, iy + 6, { x: ox + 30 + 96, olcham: 21, rang: T.kul }));
  q.push(matn(`${r.ton_kodi || ''} atrofida`, iy + 44, { x: ox + 30 + 96, olcham: 36, ogirlik: 700 }));
  iy += 96;
  q.push(matn(kes(`${r.tus_nom || ''} tus · ${r.chuqurlik_nom || ''}`, oen - 60, 23), iy, { x: ox + 30, olcham: 23, rang: T.kul }));
  const teglar = [r.yuz_shakli && `Yuz: ${YUZ[r.yuz_shakli] || r.yuz_shakli}`, r.kozlar && `Ko‘z: ${KOZ[r.kozlar] || r.kozlar}`].filter(Boolean);
  if (teglar.length) {
    iy += 26;
    let tx = ox + 30;
    for (const t of teglar) {
      const en = Math.round(t.length * 12.5 + 32);
      if (tx + en > ox + oen - 20) break;
      q.push(`<rect x="${tx}" y="${iy}" width="${en}" height="40" rx="20" fill="${T.plitka}"/>`);
      q.push(matn(t, iy + 27, { x: tx + 16, olcham: 21, rang: T.oq }));
      tx += en + 10;
    }
  }
  y += HERO + 26;

  // ── 3. PALITRA (ayollarga) ──
  if (!erkak && (p.lab?.length || p.rumyana?.length || p.kozlar?.length)) {
    const qatorlar = [['Lab', p.lab], ['Rumyana', p.rumyana], ['Ko‘z soyasi', p.kozlar]].filter(([, a]) => a?.length);
    const ustun = Math.floor(TOLA / qatorlar.length);
    const H = 150;
    q.push(karta(CHET, y, TOLA, H, { r: 24 }));
    q.push(matn('Sizga mos ranglar', y + 44, { x: CHET + 28, olcham: 26, ogirlik: 700 }));
    qatorlar.forEach(([nom, ranglar], i) => {
      const bx = CHET + 28 + i * ustun;
      q.push(matn(nom, y + 86, { x: bx, olcham: 20, rang: T.kul }));
      ranglar.slice(0, 3).forEach((h, k) => {
        if (hexmi(h)) q.push(`<circle cx="${bx + 22 + k * 52}" cy="${y + 120}" r="21" fill="${h}"/>`);
      });
    });
    y += H + 22;
  }

  // ── 4. TARTIB ──
  const tanlangan = (r.tavsiya || []).filter((t) => !t.muqobil && mahsulotlar.has(t.product_id));
  const qadamlar = (r.bosqichlar || []).map((b) => ({
    b, t: tanlangan.find((t) => t.bosqich === b.kalit), masl: r.maslahat?.[b.kalit] || '',
  })).filter((z) => z.t || z.masl).slice(0, 7);
  if (qadamlar.length) {
    q.push(matn(erkak ? 'Ko‘rinish tartibi' : 'Makiyaj tartibi', y + 36, { olcham: 32, ogirlik: 700 }));
    y += 58;
    const QH = 128;
    qadamlar.forEach(({ b, t, masl }, i) => {
      q.push(karta(CHET, y, TOLA, QH, { r: 22 }));
      q.push(`<circle cx="${CHET + 44}" cy="${y + QH / 2}" r="22" fill="${T.urgu}"/>`);
      q.push(matn(String(i + 1), y + QH / 2 + 9, { x: CHET + 44, markaz: true, olcham: 24, ogirlik: 700 }));
      const m = t ? mahsulotlar.get(t.product_id) : null;
      let tx = CHET + 86;
      if (m?.rasmBase64) {
        q.push(`<clipPath id="m${i}"><rect x="${tx}" y="${y + 14}" width="100" height="100" rx="16"/></clipPath>
          <rect x="${tx}" y="${y + 14}" width="100" height="100" rx="16" fill="#fff"/>
          <image href="data:${m.rasmMime || 'image/png'};base64,${m.rasmBase64}" x="${tx}" y="${y + 14}"
            width="100" height="100" clip-path="url(#m${i})" preserveAspectRatio="xMidYMid slice"/>`);
        tx += 120;
      } else if (m && hexmi(m.rang_hex)) {
        q.push(`<circle cx="${tx + 50}" cy="${y + QH / 2}" r="40" fill="${m.rang_hex}"/>`);
        tx += 120;
      }
      const qen = ENI - CHET - 24 - tx;
      const foiz = t && Number.isFinite(t.moslik) ? `${t.moslik}% mos` : '';
      q.push(matn(kes(b.nom, qen - (foiz ? 150 : 0), 25, 700), y + 46, { x: tx, olcham: 25, ogirlik: 700 }));
      if (foiz) {
        q.push(`<rect x="${ENI - CHET - 24 - 132}" y="${y + 20}" width="132" height="38" rx="19" fill="${T.yashil}" fill-opacity="0.16"/>`);
        q.push(matn(foiz, y + 46, { x: ENI - CHET - 24 - 66, markaz: true, olcham: 20, ogirlik: 700, rang: T.yashil }));
      }
      const ikkinchi = m ? m.nom : masl;
      qatorlarga(ikkinchi, qen, 21).slice(0, 2).forEach((s, k) =>
        q.push(matn(s, y + 82 + k * 28, { x: tx, olcham: 21, rang: T.kul })));
      y += QH + 12;
    });
    y += 6;
  }

  // ── 5. PASTKI QISM ──
  q.push(`<line x1="${CHET}" y1="${y + 6}" x2="${ENI - CHET}" y2="${y + 6}" stroke="${T.chiziq}" stroke-width="1.5"/>`);
  y += 48;
  q.push(matn('To‘liq tartib va mahsulotlar — ilovada', y, { olcham: 22, rang: T.kul }));
  q.push(matn('Rang suratdan — taxminiy', y, { x: ENI - CHET, oxiri: true, olcham: 21, rang: T.och }));
  y += 34;

  const H = Math.round(y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENI}" height="${H}" viewBox="0 0 ${ENI} ${H}">
  <rect width="${ENI}" height="${H}" fill="${T.fon}"/>
  ${q.join('\n  ')}
</svg>`;
}
