// QAHRAMON — videoda hikoya aytib beradigan multfilm personaj (vektor).
//
//   nigina — qiz: uzun soch, lime soch qisqich, qizil kofta;
//   jasur  — yigit: doppi (qalampir naqshli), oq ko'ylak, to'q nimcha.
//
// Hamma narsa kod bilan chiziladi — rasm fayli yo'q, har kadrda jonli:
//   • ko'z pirpiratadi (urug'li jadval bo'yicha), qaraydi;
//   • og'zi OVOZGA mos ochiladi (lab — ovoz balandligidan, 0..1);
//   • hissiyot: oddiy | xursand | hayron | xafa | oylash | hayajon;
//   • imo (qo'llar): tinch | silkit | korsat | ushlab | oylash | yelka | hayajon | yuz;
//   • nafas oladi, boshi sal chayqaladi, gapirganda bosh irg'aydi;
//   • teri: dog' (muammo sahnasi) va yaltiroq (natija sahnasi).
//
// Koordinata birligi R — bosh radiusi. (x, y) — bosh markazi.
import { clamp, lerp, noise, ease, circle, star, image, roundRect } from './L.js';

const TERI = {
  nigina: { teri: '#F7D0B8', soya: '#E8AE94', lab: '#D44A63', soch: '#2A1714', sochNur: '#5A3328', koz: '#3A2320' },
  jasur:  { teri: '#EBBE98', soya: '#D49B76', lab: '#B4534F', soch: '#17110F', sochNur: '#3A2A24', koz: '#2A1C18' },
};
const KIYIM = {
  nigina: { asosiy: '#D3263F', soya: '#A61B30', yoqa: '#FFE3E8' },
  jasur:  { asosiy: '#F3F3F1', soya: '#D6D6D2', nimcha: '#1E2A45', nimchaSoya: '#141C30' },
};

/** Qo'l uchlarining nishonlari (R birligida, bosh markaziga nisbatan). */
function imoNuqtalari(imo, t, yon = 1) {
  const b = Math.sin(t * 9);
  switch (imo) {
    case 'silkit':  return { chap: [-1.3, 3.62], ong: [1.75 + 0.22 * b, -0.25 + 0.08 * Math.cos(t * 9)] };
    case 'korsat':  return yon >= 0 ? { chap: [-1.3, 3.62], ong: [2.55, 0.95 + 0.04 * b] } : { chap: [-2.55, 0.95 + 0.04 * b], ong: [1.3, 3.62] };
    case 'ushlab':  return { chap: [-0.55, 2.42], ong: [0.55, 2.42] };
    case 'oylash':  return { chap: [0.42, 2.5], ong: [0.42, 1.05] };
    case 'yelka':   return { chap: [-1.9, 0.95], ong: [1.9, 0.95] };
    case 'hayajon': { const s = Math.abs(Math.sin(t * 7)) * 0.25; return { chap: [-1.55, -0.55 - s], ong: [1.55, -0.55 - s] }; }
    case 'yuz':     return { chap: [-0.66, 0.42], ong: [0.66, 0.42] };
    default:        return { chap: [-1.3, 3.62], ong: [1.3, 3.62] };
  }
}

/** Ikki bo'g'imli qo'l (IK): yelka → tirsak → kaft. Tirsak tashqariga/pastga bukiladi. */
function qolBogimi(sx, sy, tx, ty, a, b, tomon) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = (a + b) * 0.999;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  d = Math.max(d, Math.abs(a - b) + 1e-3);
  const asos = Math.atan2(dy, dx);
  const burch = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const nomzod = [asos + burch, asos - burch].map((q) => [sx + Math.cos(q) * a, sy + Math.sin(q) * a]);
  // tashqariga (tomon * x) va pastga (y) qaragan tirsak tabiiyroq
  const [e] = nomzod.sort((p, q) => (tomon * q[0] + 0.6 * q[1]) - (tomon * p[0] + 0.6 * p[1]));
  return { e, h: [sx + dx, sy + dy] };
}

/** Pirpiratish: har ~3 soniyada 0.14 s yumiladi. */
function kozOchiq(t, seed) {
  const davr = 3.1 + (seed % 3) * 0.4;
  const f = ((t + seed * 0.37) % davr) / davr;
  const yum = 0.14 / davr;
  if (f < yum) return Math.abs(1 - (f / yum) * 2);
  return 1;
}

const HISSIYOT = {
  //          ko'z  qosh(y)  qosh(egilish)  tabassum  og'iz(asos)  qizarish
  oddiy:   { koz: 1,    qy: 0,     qe: 0,     tab: 0.45, og: 0,    qz: 0.35 },
  xursand: { koz: 0.8,  qy: -0.03, qe: 0,     tab: 1,    og: 0.15, qz: 0.6 },
  hayron:  { koz: 1.28, qy: -0.12, qe: 0,     tab: 0,    og: 0.42, qz: 0.25 },
  xafa:    { koz: 0.78, qy: 0.02,  qe: 0.28,  tab: -0.7, og: 0,    qz: 0.15 },
  oylash:  { koz: 0.9,  qy: -0.04, qe: 0.12,  tab: -0.1, og: 0,    qz: 0.25 },
  hayajon: { koz: 1.15, qy: -0.1,  qe: 0,     tab: 1,    og: 0.35, qz: 0.7 },
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} h holat:
 *   tur ('nigina'|'jasur'), x, y, s (R = 100*s), t, hissiyot, imo, yon,
 *   lab (0..1 ovoz), qarash [-1..1], dog' (0..1), yaltiroq (0..1),
 *   oldingiImo + imoP (0..1) — imolar orasida silliq o'tish,
 *   mahsulot — qo'lida ushlab turadigan rasm (imo 'ushlab').
 */
export function qahramonChiz(ctx, h) {
  const tur = h.tur === 'jasur' ? 'jasur' : 'nigina';
  const R = 100 * (h.s ?? 1);
  const t = h.t ?? 0;
  const P = TERI[tur], K = KIYIM[tur];
  const hs = HISSIYOT[h.hissiyot] || HISSIYOT.oddiy;
  const lab = clamp(h.lab ?? 0);
  const seed = tur === 'jasur' ? 5 : 2;

  // Nafas va chayqalish
  const nafas = Math.sin(t * 2.2) * 0.012;
  const chayqal = noise(t * 0.45, seed) * 0.035 + (h.hissiyot === 'hayajon' ? Math.sin(t * 7) * 0.025 : 0);
  const sakrash = h.imo === 'hayajon' ? -Math.abs(Math.sin(t * 7)) * 0.12 * R : 0;
  const boshEgil = noise(t * 0.8 + 3, seed) * 0.05 + lab * 0.04 * Math.sin(t * 8)
    + (h.hissiyot === 'oylash' ? 0.1 : 0) + (h.hissiyot === 'xafa' ? -0.06 : 0);
  const yelkaKot = h.imo === 'yelka' ? -0.14 : 0;

  ctx.save();
  ctx.translate(h.x, h.y + sakrash);
  ctx.rotate(chayqal);

  // ── Orqa soch (qiz) ──
  if (tur === 'nigina') {
    ctx.save(); ctx.rotate(boshEgil * 0.6);
    ctx.fillStyle = P.soch;
    ctx.beginPath();
    ctx.moveTo(-1.08 * R, -0.1 * R);
    ctx.bezierCurveTo(-1.25 * R, -1.45 * R, 1.25 * R, -1.45 * R, 1.08 * R, -0.1 * R);
    ctx.bezierCurveTo(1.22 * R, 0.9 * R, 1.32 * R, 1.6 * R, 1.05 * R, 2.05 * R);
    ctx.quadraticCurveTo(0, 2.3 * R, -1.05 * R, 2.05 * R);
    ctx.bezierCurveTo(-1.32 * R, 1.6 * R, -1.22 * R, 0.9 * R, -1.08 * R, -0.1 * R);
    ctx.fill();
    ctx.restore();
  }

  // ── Tana ──
  const yelkaY = (1.42 + yelkaKot) * R;
  ctx.save();
  ctx.scale(1, 1 + nafas);
  ctx.fillStyle = P.soya;
  ctx.fillRect(-0.27 * R, 0.6 * R, 0.54 * R, 0.75 * R);                            // bo'yin
  ctx.fillStyle = K.asosiy;
  ctx.beginPath();
  ctx.moveTo(-0.35 * R, 1.05 * R);
  ctx.quadraticCurveTo(-1.2 * R, 1.08 * R + yelkaKot * R, -1.32 * R, yelkaY + 0.35 * R);
  ctx.lineTo(-1.42 * R, 5 * R); ctx.lineTo(1.42 * R, 5 * R);
  ctx.lineTo(1.32 * R, yelkaY + 0.35 * R);
  ctx.quadraticCurveTo(1.2 * R, 1.08 * R + yelkaKot * R, 0.35 * R, 1.05 * R);
  ctx.closePath(); ctx.fill();
  if (tur === 'nigina') {
    // dumaloq yoqa
    ctx.fillStyle = K.yoqa;
    ctx.beginPath(); ctx.ellipse(0, 1.1 * R, 0.42 * R, 0.24 * R, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = P.teri;
    ctx.beginPath(); ctx.ellipse(0, 1.06 * R, 0.33 * R, 0.17 * R, 0, 0, Math.PI); ctx.fill();
  } else {
    // ko'ylak yoqasi + nimcha
    ctx.fillStyle = K.nimcha;
    ctx.beginPath();
    ctx.moveTo(-1.3 * R, yelkaY + 0.4 * R); ctx.lineTo(-0.3 * R, 1.25 * R); ctx.lineTo(-0.1 * R, 5 * R); ctx.lineTo(-1.42 * R, 5 * R); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1.3 * R, yelkaY + 0.4 * R); ctx.lineTo(0.3 * R, 1.25 * R); ctx.lineTo(0.1 * R, 5 * R); ctx.lineTo(1.42 * R, 5 * R); ctx.closePath(); ctx.fill();
    // nimcha chetidagi naqsh (oltin chiziq)
    ctx.strokeStyle = '#C9A24A'; ctx.lineWidth = 0.05 * R;
    ctx.beginPath(); ctx.moveTo(-0.3 * R, 1.3 * R); ctx.lineTo(-0.12 * R, 5 * R); ctx.moveTo(0.3 * R, 1.3 * R); ctx.lineTo(0.12 * R, 5 * R); ctx.stroke();
    ctx.fillStyle = K.asosiy;
    ctx.beginPath(); ctx.moveTo(-0.34 * R, 1.02 * R); ctx.lineTo(0, 1.38 * R); ctx.lineTo(-0.12 * R, 1.5 * R); ctx.lineTo(-0.46 * R, 1.12 * R); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.34 * R, 1.02 * R); ctx.lineTo(0, 1.38 * R); ctx.lineTo(0.12 * R, 1.5 * R); ctx.lineTo(0.46 * R, 1.12 * R); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // ── Qo'lda mahsulot (ushlab) — qo'llar ostida ──
  const imoP = clamp(h.imoP ?? 1);
  const yangi = imoNuqtalari(h.imo, t, h.yon), eski = imoNuqtalari(h.oldingiImo || h.imo, t, h.yon);
  const ip = ease.outBack(imoP);
  const nishon = (k) => [lerp(eski[k][0], yangi[k][0], ip), lerp(eski[k][1], yangi[k][1], ip)];
  if (h.imo === 'ushlab' && h.mahsulot?.width) {
    const p = ease.outBack(imoP), en = 1.25 * R * p;
    ctx.save(); ctx.translate(0, 1.95 * R); ctx.rotate(Math.sin(t * 1.6) * 0.04);
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 0.3 * R;
    roundRect(ctx, -en / 2, -en / 2, en, en, 0.14 * R); ctx.fill(); ctx.shadowColor = 'transparent';
    image(ctx, h.mahsulot, -en / 2 + 0.07 * R * p, -en / 2 + 0.07 * R * p, en - 0.14 * R * p, en - 0.14 * R * p, { fit: 'contain', r: 0.1 * R });
    ctx.restore();
  }

  // ── Qo'llar ──
  const UZ_A = 1.12 * R, UZ_B = 1.05 * R;
  const kaftlar = [];
  for (const [k, tomon] of [['chap', -1], ['ong', 1]]) {
    const [nx, ny] = nishon(k);
    const sx = tomon * 1.12 * R, sy = yelkaY + 0.12 * R;
    const { e, h: q } = qolBogimi(sx, sy, nx * R, ny * R, UZ_A, UZ_B, tomon);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = tur === 'jasur' ? K.asosiy : K.asosiy;
    ctx.lineWidth = 0.4 * R;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e[0], e[1]); ctx.stroke();
    ctx.lineWidth = 0.34 * R;
    ctx.strokeStyle = tur === 'jasur' ? K.asosiy : K.soya;
    ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    circle(ctx, q[0], q[1], 0.21 * R, P.teri);
    kaftlar.push(q);
    if (h.imo === 'korsat' && ((h.yon ?? 1) >= 0) === (tomon > 0)) {
      // ko'rsatkich barmoq
      const a = Math.atan2(q[1] - e[1], q[0] - e[0]);
      ctx.strokeStyle = P.teri; ctx.lineWidth = 0.11 * R;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + Math.cos(a) * 0.34 * R, q[1] + Math.sin(a) * 0.34 * R); ctx.stroke();
    }
  }

  // ── Bosh ──
  ctx.save();
  ctx.rotate(boshEgil);
  // quloqlar
  circle(ctx, -0.98 * R, 0.12 * R, 0.17 * R, P.soya);
  circle(ctx, 0.98 * R, 0.12 * R, 0.17 * R, P.soya);
  // yuz
  ctx.fillStyle = P.teri;
  ctx.beginPath();
  ctx.moveTo(0, -1.02 * R);
  ctx.bezierCurveTo(0.62 * R, -1.02 * R, 1.0 * R, -0.6 * R, 1.0 * R, 0.02 * R);
  ctx.bezierCurveTo(1.0 * R, 0.62 * R, 0.6 * R, 1.02 * R, 0, 1.04 * R);
  ctx.bezierCurveTo(-0.6 * R, 1.02 * R, -1.0 * R, 0.62 * R, -1.0 * R, 0.02 * R);
  ctx.bezierCurveTo(-1.0 * R, -0.6 * R, -0.62 * R, -1.02 * R, 0, -1.02 * R);
  ctx.fill();

  // qizarish
  ctx.save(); ctx.globalAlpha *= hs.qz;
  ctx.fillStyle = '#FF7F98';
  ctx.beginPath(); ctx.ellipse(-0.58 * R, 0.42 * R, 0.2 * R, 0.12 * R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.58 * R, 0.42 * R, 0.2 * R, 0.12 * R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // teri muammosi — qizil dog'lar
  const dog = clamp(h.dog ?? 0);
  if (dog > 0.01) {
    ctx.save(); ctx.globalAlpha *= dog;
    for (const [dx, dy, r] of [[-0.55, 0.22, 0.05], [-0.42, 0.5, 0.04], [0.5, 0.3, 0.055], [0.62, 0.52, 0.035], [0.12, -0.55, 0.04], [-0.2, -0.62, 0.03]]) {
      circle(ctx, dx * R, dy * R, r * R * 1.6, 'rgba(214,72,72,0.35)');
      circle(ctx, dx * R, dy * R, r * R, '#D24848');
    }
    ctx.restore();
  }

  // ko'zlar
  const ochiq = kozOchiq(t, seed) * hs.koz;
  const qx = clamp(h.qarash ?? 0, -1, 1) * 0.05 * R;
  for (const tomon of [-1, 1]) {
    const ex = tomon * 0.38 * R, ey = 0.06 * R;
    const ry = 0.2 * R * clamp(ochiq, 0.06, 1.4);
    if (hs.tab >= 1 && h.hissiyot === 'xursand' && lab < 0.2) {
      // kulayotgan ko'z — teskari yoy
      ctx.strokeStyle = P.koz; ctx.lineWidth = 0.07 * R; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey + 0.05 * R, 0.14 * R, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex, ey, 0.17 * R, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 0.17 * R, ry, 0, 0, Math.PI * 2); ctx.clip();
      const qor = h.hissiyot === 'hayron' ? 0.1 : 0.13;
      circle(ctx, ex + qx, ey + 0.02 * R, qor * R, P.koz);
      circle(ctx, ex + qx, ey + 0.02 * R, qor * 0.5 * R, '#0d0706');
      circle(ctx, ex + qx + 0.05 * R, ey - 0.04 * R, 0.045 * R, '#fff');
      ctx.restore();
      if (tur === 'nigina') {
        ctx.strokeStyle = P.koz; ctx.lineWidth = 0.045 * R; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(ex, ey, 0.18 * R, ry * 1.04, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + tomon * 0.16 * R, ey - ry * 0.7); ctx.lineTo(ex + tomon * 0.25 * R, ey - ry * 0.95); ctx.stroke();
      }
    }
    // qoshlar
    const qy = ey - 0.33 * R + hs.qy * R - (h.hissiyot === 'hayron' ? 0.04 * R * Math.sin(t * 4) : 0);
    ctx.strokeStyle = tur === 'jasur' ? P.soch : P.sochNur; ctx.lineWidth = (tur === 'jasur' ? 0.085 : 0.06) * R; ctx.lineCap = 'round';
    ctx.beginPath();
    // qe > 0 — ichki uchi ko'tariladi (xafa, o'ylayotgan)
    ctx.moveTo(ex - tomon * 0.15 * R, qy - hs.qe * R * 0.5);
    ctx.quadraticCurveTo(ex, qy - 0.06 * R, ex + tomon * 0.16 * R, qy + hs.qe * R * 0.25);
    ctx.stroke();
  }

  // burun
  ctx.strokeStyle = P.soya; ctx.lineWidth = 0.05 * R; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.02 * R, 0.24 * R); ctx.quadraticCurveTo(0.09 * R, 0.33 * R, -0.03 * R, 0.36 * R); ctx.stroke();

  // og'iz: tabassum + ochilish (ovoz)
  const og = clamp(Math.max(hs.og, lab * 0.95));
  const tab = hs.tab;
  const my = 0.6 * R, mw = (0.3 - og * 0.06) * R;
  if (og < 0.06) {
    ctx.strokeStyle = P.lab; ctx.lineWidth = 0.065 * R; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-mw, my - tab * 0.02 * R); ctx.quadraticCurveTo(0, my + tab * 0.2 * R, mw, my - tab * 0.02 * R); ctx.stroke();
  } else {
    const ochil = og * 0.34 * R;
    ctx.fillStyle = '#5B1420';
    ctx.beginPath();
    ctx.moveTo(-mw, my);
    ctx.quadraticCurveTo(0, my - 0.05 * R + tab * 0.06 * R, mw, my);
    ctx.quadraticCurveTo(0, my + ochil * 2 + tab * 0.08 * R, -mw, my);
    ctx.fill();
    ctx.save(); ctx.clip();
    if (tab > 0.3) { ctx.fillStyle = '#fff'; ctx.fillRect(-mw, my - 0.06 * R, mw * 2, 0.09 * R); }
    ctx.fillStyle = '#E86A7E';
    ctx.beginPath(); ctx.ellipse(0, my + ochil * 1.5, mw * 0.6, ochil * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = P.lab; ctx.lineWidth = 0.04 * R;
    ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my - 0.05 * R + tab * 0.06 * R, mw, my); ctx.stroke();
  }

  // ── Old soch / doppi ──
  if (tur === 'nigina') {
    ctx.fillStyle = P.soch;
    ctx.beginPath();
    ctx.moveTo(-1.04 * R, 0.25 * R);
    ctx.bezierCurveTo(-1.18 * R, -0.95 * R, -0.5 * R, -1.25 * R, 0.05 * R, -1.18 * R);
    ctx.bezierCurveTo(0.75 * R, -1.18 * R, 1.2 * R, -0.85 * R, 1.04 * R, 0.25 * R);
    ctx.bezierCurveTo(0.98 * R, -0.25 * R, 0.82 * R, -0.5 * R, 0.6 * R, -0.58 * R);
    // peshona sochi — to'lqinli chet
    ctx.bezierCurveTo(0.4 * R, -0.42 * R, 0.25 * R, -0.5 * R, 0.12 * R, -0.62 * R);
    ctx.bezierCurveTo(-0.05 * R, -0.42 * R, -0.3 * R, -0.4 * R, -0.45 * R, -0.58 * R);
    ctx.bezierCurveTo(-0.62 * R, -0.45 * R, -0.95 * R, -0.3 * R, -1.04 * R, 0.25 * R);
    ctx.fill();
    // yaltirash
    ctx.strokeStyle = P.sochNur; ctx.lineWidth = 0.07 * R; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-0.1 * R, -0.45 * R, 0.62 * R, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    // lime qisqich
    ctx.save(); ctx.translate(0.66 * R, -0.66 * R); ctx.rotate(-0.6);
    ctx.fillStyle = '#BDDB7D';
    roundRect(ctx, -0.2 * R, -0.07 * R, 0.4 * R, 0.14 * R, 0.07 * R); ctx.fill();
    circle(ctx, 0, 0, 0.05 * R, '#8FB24A');
    ctx.restore();
  } else {
    // qisqa soch
    ctx.fillStyle = P.soch;
    ctx.beginPath();
    ctx.moveTo(-1.02 * R, 0.05 * R);
    ctx.bezierCurveTo(-1.08 * R, -0.85 * R, -0.5 * R, -1.15 * R, 0, -1.12 * R);
    ctx.bezierCurveTo(0.5 * R, -1.15 * R, 1.08 * R, -0.85 * R, 1.02 * R, 0.05 * R);
    ctx.lineTo(0.9 * R, -0.3 * R);
    ctx.quadraticCurveTo(0.3 * R, -0.62 * R, -0.2 * R, -0.5 * R);
    ctx.quadraticCurveTo(-0.7 * R, -0.55 * R, -0.9 * R, -0.3 * R);
    ctx.closePath(); ctx.fill();
    // DOPPI — to'rt qirrali, qora, oq qalampir naqshi
    ctx.save(); ctx.translate(0, -0.78 * R); ctx.rotate(-0.06);
    const ust = -0.62 * R, ost = 0.12 * R;
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.moveTo(-0.9 * R, ost);
    ctx.quadraticCurveTo(-0.84 * R, ust + 0.1 * R, -0.62 * R, ust);
    ctx.quadraticCurveTo(0, ust - 0.12 * R, 0.62 * R, ust);
    ctx.quadraticCurveTo(0.84 * R, ust + 0.1 * R, 0.9 * R, ost);
    ctx.quadraticCurveTo(0, ost + 0.1 * R, -0.9 * R, ost);
    ctx.fill();
    // qirralar (old yuzi chegarasi)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.025 * R;
    ctx.beginPath(); ctx.moveTo(-0.4 * R, ust - 0.02 * R); ctx.lineTo(-0.48 * R, ost + 0.04 * R);
    ctx.moveTo(0.4 * R, ust - 0.02 * R); ctx.lineTo(0.48 * R, ost + 0.04 * R); ctx.stroke();
    // qalampir naqshlari
    ctx.fillStyle = '#F4F1EA';
    for (const [qx0, qy0, a] of [[-0.66, -0.22, 0.5], [0, -0.26, 0], [0.66, -0.22, -0.5]]) {
      ctx.save(); ctx.translate(qx0 * R, qy0 * R); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -0.2 * R);
      ctx.bezierCurveTo(0.16 * R, -0.08 * R, 0.14 * R, 0.14 * R, 0, 0.2 * R);
      ctx.bezierCurveTo(-0.08 * R, 0.1 * R, -0.12 * R, -0.05 * R, 0, -0.2 * R);
      ctx.fill();
      ctx.fillStyle = '#121212'; circle(ctx, 0.02 * R, 0.04 * R, 0.035 * R, '#121212'); ctx.fillStyle = '#F4F1EA';
      ctx.restore();
    }
    // pastki hoshiya
    ctx.strokeStyle = '#F4F1EA'; ctx.lineWidth = 0.03 * R;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const x0 = lerp(-0.86, 0.86, i / 18) * R, y0 = ost - 0.06 * R + (i % 2 ? -0.04 : 0.03) * R + Math.abs(i - 9) * 0.004 * R;
      i ? ctx.lineTo(x0, y0) : ctx.moveTo(x0, y0);
    }
    ctx.stroke();
    ctx.restore();
  }

  // natija — yaltiroq teri
  const yal = clamp(h.yaltiroq ?? 0);
  if (yal > 0.01) {
    ctx.save(); ctx.globalAlpha *= yal;
    [[-0.72, 0.15, 0], [0.75, -0.05, 1.3], [0.5, 0.72, 2.1], [-0.3, -0.75, 3.2]].forEach(([sx, sy, f]) => {
      const p = (Math.sin(t * 4 + f) + 1) / 2;
      star(ctx, sx * R, sy * R, (0.1 + 0.08 * p) * R, 0.03 * R, 4, '#FFF7C2', t * 0.5 + f);
    });
    ctx.restore();
  }

  // ter tomchisi (xafa / hayron)
  if (h.hissiyot === 'xafa' || h.hissiyot === 'hayron') {
    const ty = ((t * 0.5) % 1) * 0.25 * R;
    ctx.fillStyle = '#9FD8FF';
    ctx.beginPath(); ctx.moveTo(0.92 * R, -0.45 * R + ty);
    ctx.quadraticCurveTo(1.04 * R, -0.25 * R + ty, 0.92 * R, -0.2 * R + ty);
    ctx.quadraticCurveTo(0.8 * R, -0.25 * R + ty, 0.92 * R, -0.45 * R + ty); ctx.fill();
  }
  ctx.restore();   // bosh

  // Yuzga tekkan kaftlar bosh USTIDA ko'rinsin (aks holda bosh yopib qo'yadi)
  if (h.imo === 'yuz' || h.imo === 'oylash') {
    // yuz bilan bir rangda — chegara chizig'i bilan ajraladi
    for (const q of kaftlar) if (q[1] < 1.3 * R) circle(ctx, q[0], q[1], 0.21 * R, P.teri, P.soya, 0.04 * R);
  }
  ctx.restore();   // butun
}

export const QAHRAMONLAR = ['nigina', 'jasur'];
export const HISSIYOTLAR = Object.keys(HISSIYOT);
export const IMOLAR = ['tinch', 'silkit', 'korsat', 'ushlab', 'oylash', 'yelka', 'hayajon', 'yuz'];
