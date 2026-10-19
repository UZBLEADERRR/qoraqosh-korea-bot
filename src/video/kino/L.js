// L — animatsiya kutubxonasi (Canvas 2D). Har funksiya vaqtning SOF
// funksiyasi: bir xil t → bir xil kadr. Math.random() ishlatilmaydi
// (urug'li rand/noise), aks holda kadrlar «titraydi».
//
// G'oyalar LuxEditor dvigatelidan (src/engine/lib.ts) olingan va serverga
// (Skia) moslab qayta yozilgan.
import { OILA } from './kanvas.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

const c1 = 1.70158, c3 = c1 + 1, c4 = (2 * Math.PI) / 3;
export const ease = {
  linear: (x) => x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - (1 - x) ** 3,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  outQuart: (x) => 1 - (1 - x) ** 4,
  outExpo: (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),
  inExpo: (x) => (x === 0 ? 0 : 2 ** (10 * x - 10)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x) => 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2,
  outElastic: (x) => (x === 0 ? 0 : x === 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1),
  outBounce: (x) => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
};
const E = (e) => (typeof e === 'function' ? e : ease[e] || ease.outCubic);

/** `start` dan boshlanib `dur` davom etadigan harakatning 0→1 ulushi. */
export const prog = (t, start = 0, dur = 1, e = 'outCubic') => E(e)(clamp((t - start) / Math.max(dur, 1e-6)));

/** Prujina 0→1 (biroz oshib ketib qaytadi — «tirik» harakat). */
export function spring(t, start = 0, { k = 170, c = 12, m = 1 } = {}) {
  const x = t - start;
  if (x <= 0) return 0;
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * x) * (Math.cos(wd * x) + (z * w0 / wd) * Math.sin(wd * x));
  }
  return 1 - Math.exp(-w0 * x) * (1 + w0 * x);
}

/** Urug'li tasodifiy son generatori: const r = rand(5); r() → 0..1 */
export function rand(seed = 1) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let q = Math.imul(a ^ (a >>> 15), 1 | a);
    q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/** Silliq shovqin [-1, 1]. */
export function noise(x, y = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (v) => v * v * (3 - 2 * v);
  const h = (a, b) => hash(a * 57 + b * 131) * 2 - 1;
  const tepa = lerp(h(xi, yi), h(xi + 1, yi), s(xf)), past = lerp(h(xi, yi + 1), h(xi + 1, yi + 1), s(xf));
  return lerp(tepa, past, s(yf));
}

/** Kamera silkinishi. */
export const shake = (t, kuch = 10, tezlik = 20, seed = 1) => ({ x: noise(t * tezlik, seed) * kuch, y: noise(seed + 9, t * tezlik) * kuch });

export function hexA(hex, a) {
  if (!String(hex).startsWith('#')) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const font = (olcham, ogirlik = 800) => `${ogirlik} ${Math.round(olcham)}px ${OILA}`;

// Shriftda yo'q belgilar (✓ ✕ ★) bo'sh kvadrat bo'lib chiqadi — rangli emojiga almashtiramiz
const BELGI = { '✓': '✅', '✔': '✅', '☑': '✅', '✕': '❌', '✗': '❌', '✘': '❌', '✖': '❌', '★': '⭐', '☆': '⭐', '→': '➜', '⇒': '➜' };
export const belgiTozala = (s) => String(s ?? '').replace(/[✓✔☑✕✗✘✖★☆→⇒]\uFE0F?/g, (c) => BELGI[c[0]] || c);

/** Matnni kenglikka bo'lib qatorlarga ajratadi (haqiqiy o'lchov bilan). */
export function wrap(ctx, matn, maxEni) {
  const chiq = [];
  for (const xat of String(matn).split('\n')) {
    let q = '';
    for (const s of xat.split(/\s+/).filter(Boolean)) {
      const sinov = q ? `${q} ${s}` : s;
      if (ctx.measureText(sinov).width > maxEni && q) { chiq.push(q); q = s; } else q = sinov;
    }
    chiq.push(q);
  }
  return chiq;
}

export function roundRect(ctx, x, y, w, h, r = 20) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}

export function rect(ctx, x, y, w, h, o = {}) {
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.soya) { ctx.shadowColor = o.soya; ctx.shadowBlur = o.blur ?? 30; ctx.shadowOffsetY = (o.blur ?? 30) / 3; }
  roundRect(ctx, x, y, w, h, o.r ?? 0);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.shadowColor = 'transparent'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width ?? 4; ctx.stroke(); }
  ctx.restore();
}

export function circle(ctx, x, y, r, fill, stroke, width = 4) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

export function star(ctx, x, y, r1, r2, n = 5, fill = '#FFD60A', rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot - Math.PI / 2 + (i * Math.PI) / n;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

/** Transformatsiya: tf(ctx, {x,y,s,r,alpha}, () => markazda chizish) */
export function tf(ctx, o, fn) {
  ctx.save();
  ctx.translate(o.x ?? 0, o.y ?? 0);
  if (o.r) ctx.rotate(o.r);
  const s = o.s ?? 1; ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
  if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
  fn();
  ctx.restore();
}

// ─────────────── Matn ───────────────

/**
 * Oddiy (qatorlarga bo'linadigan) matn. Qutisini qaytaradi.
 * o: {olcham, ogirlik, rang, align, maxEni, qator, soya, stroke, strokeW, alpha, katta, fon, fonPad, avtoSig, min}
 */
export function text(ctx, matn, x, y, o = {}) {
  let olcham = o.olcham ?? 64;
  const og = o.ogirlik ?? 800;
  const s = belgiTozala(o.katta ? String(matn).toUpperCase() : String(matn));
  ctx.save();
  ctx.font = font(olcham, og);
  let qatorlar = o.maxEni ? wrap(ctx, s, o.maxEni) : s.split('\n');
  if (o.avtoSig && o.maxEni) {
    const min = o.min ?? 30;
    while (olcham > min && (qatorlar.length > (o.maxQator ?? 3) || qatorlar.some((l) => ctx.measureText(l).width > o.maxEni))) {
      olcham -= 3; ctx.font = font(olcham, og); qatorlar = wrap(ctx, s, o.maxEni);
    }
  }
  const lh = (o.qator ?? 1.12) * olcham;
  const align = o.align ?? 'center';
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.globalAlpha *= o.alpha ?? 1;
  const jami = lh * qatorlar.length;
  const y0 = y - jami / 2 + lh / 2;
  const enlar = qatorlar.map((l) => ctx.measureText(l).width);
  const maxW = Math.max(0, ...enlar);
  const bx = align === 'center' ? x - maxW / 2 : align === 'right' ? x - maxW : x;
  if (o.fon) {
    const pad = o.fonPad ?? olcham * 0.4;
    rect(ctx, bx - pad, y0 - lh / 2 - pad * 0.55, maxW + pad * 2, jami + pad * 1.1, { fill: o.fon, r: o.fonR ?? olcham * 0.4 });
  }
  ctx.fillStyle = o.rang ?? '#fff';
  if (o.soya) { ctx.shadowColor = typeof o.soya === 'string' ? o.soya : 'rgba(0,0,0,0.5)'; ctx.shadowBlur = olcham * 0.3; ctx.shadowOffsetY = olcham * 0.06; }
  qatorlar.forEach((l, i) => {
    const yy = y0 + i * lh;
    if (o.stroke) {
      ctx.save(); ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW ?? olcham * 0.14; ctx.strokeText(l, x, yy); ctx.restore();
    }
    ctx.fillText(l, x, yy);
  });
  ctx.restore();
  return { x: bx, y: y0 - lh / 2, w: maxW, h: jami, qatorlar, olcham };
}

/**
 * Animatsion sarlavha. uslub:
 *   'zarba' — katta bo'lib urilib tushadi (+ kamera silkinishi chaqiruvchida),
 *   'maska' — qatorlar pastdan maska ichidan chiqadi,
 *   'soz'   — so'zma-so'z sakrab chiqadi,
 *   'harf'  — harflar uchib keladi,
 *   'xira'  — xiralikdan aniq bo'ladi,
 *   'keng'  — keng harf oralig'idan yig'iladi.
 * urgu: shu so'z(lar) aksent rangida va markerli.
 */
export function title(ctx, matn, x, y, t, o = {}) {
  const uslub = o.uslub ?? 'maska', bosh = o.bosh ?? 0;
  let olcham = o.olcham ?? 110;
  const og = o.ogirlik ?? 900;
  const s = belgiTozala(o.katta === false ? String(matn) : String(matn).toUpperCase());
  const maxEni = o.maxEni ?? 920;
  ctx.save();
  ctx.font = font(olcham, og);
  let qatorlar = wrap(ctx, s, maxEni);
  while (olcham > 54 && (qatorlar.length > (o.maxQator ?? 3) || qatorlar.some((l) => ctx.measureText(l).width > maxEni))) {
    olcham -= 4; ctx.font = font(olcham, og); qatorlar = wrap(ctx, s, maxEni);
  }
  const lh = olcham * (o.qator ?? 1.08);
  const jami = lh * qatorlar.length;
  const urgu = new Set([].concat(o.urgu || []).flatMap((u) => String(u).split(/\s+/)).map(tozaSoz).filter(Boolean));
  const rang = o.rang ?? '#fff', aksent = o.aksent ?? '#FFD60A';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const bosh0 = ctx.measureText(' ').width;
  let k = 0;
  qatorlar.forEach((q, qi) => {
    const sozlar = q.split(' ');
    const en = ctx.measureText(q).width;
    let cx = (o.align === 'left' ? x : x - en / 2);
    const cy = y - jami / 2 + lh / 2 + qi * lh;
    const qp = prog(t, bosh + qi * 0.12, 0.55, 'outExpo');
    sozlar.forEach((w, wi) => {
      const ww = ctx.measureText(w).width;
      const st = bosh + (uslub === 'soz' ? k * (o.qadam ?? 0.09) : qi * 0.12);
      const p = clamp((t - st) / 0.5);
      if (p <= 0 && uslub !== 'maska') { cx += ww + bosh0; k++; return; }
      const u = urgu.has(tozaSoz(w));
      ctx.save();
      let a = 1, sc = 1, dy = 0, blur = 0;
      if (uslub === 'zarba') { sc = lerp(2.6, 1, ease.outExpo(clamp((t - bosh) / 0.35))); a = clamp((t - bosh) / 0.12); }
      else if (uslub === 'soz') { sc = 0.4 + 0.6 * spring(t, st, { k: 260, c: 15 }); a = clamp(p * 3); }
      else if (uslub === 'xira') { a = ease.outQuad(p); blur = (1 - p) * 18; }
      else if (uslub === 'keng') { a = p; }
      else if (uslub === 'maska') {
        // Qator o'z quti ichidan pastdan chiqadi
        ctx.beginPath(); ctx.rect(cx - 20, cy - lh * 0.62, ww + 40, lh * 1.24); ctx.clip();
        dy = (1 - qp) * lh;
      }
      ctx.globalAlpha *= a;
      if (blur > 0.6) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      // zarba — butun qator markaz atrofida kattalashadi (so'zlar ustma-ust tushmasin)
      const ox = uslub === 'zarba' ? (o.align === 'left' ? x + en / 2 : x) : cx + ww / 2;
      ctx.translate(ox, cy + dy); ctx.scale(sc, sc); ctx.translate(-ox, -cy);
      if (u) {
        const mp = prog(t, st + 0.25, 0.4, 'outCubic');
        rect(ctx, cx - olcham * 0.12, cy - olcham * 0.5, (ww + olcham * 0.24) * mp, olcham, { fill: hexA(aksent, 0.95), r: olcham * 0.18 });
      }
      if (o.soya !== false) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = olcham * 0.25; ctx.shadowOffsetY = olcham * 0.06; }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = olcham * 0.12; ctx.strokeText(w, cx, cy); }
      if (uslub === 'harf') {
        let hx = cx;
        [...w].forEach((h, hi) => {
          const hp = spring(t, st + (k + hi) * 0.025, { k: 200, c: 14 });
          const hw = ctx.measureText(h).width;
          ctx.save(); ctx.globalAlpha *= clamp(hp * 2);
          ctx.translate(hx + hw / 2, cy + (1 - hp) * 120); ctx.rotate((1 - hp) * 0.6);
          ctx.fillStyle = u ? (o.urguRang ?? '#1a0a0d') : rang; ctx.fillText(h, -hw / 2, 0); ctx.restore();
          hx += hw;
        });
      } else {
        ctx.fillStyle = u ? (o.urguRang ?? '#1a0a0d') : rang;
        if (uslub === 'keng') {
          const yoy = (1 - ease.outExpo(p)) * 26;
          let hx = cx - yoy * w.length / 2;
          for (const h of w) { ctx.fillText(h, hx, cy); hx += ctx.measureText(h).width + yoy; }
        } else ctx.fillText(w, cx, cy);
      }
      ctx.restore();
      cx += ww + bosh0; k++;
    });
  });
  ctx.restore();
  return { y0: y - jami / 2, y1: y + jami / 2, olcham };
}

export const tozaSoz = (w) => String(w || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// ─────────────── Fonlar va effektlar ───────────────

export function linearBg(ctx, W, H, ranglar, burchak = 90) {
  const a = (burchak * Math.PI) / 180, cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 2;
  const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  ranglar.forEach((c, i) => g.addColorStop(i / Math.max(1, ranglar.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function radialBg(ctx, W, H, ranglar, cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 1.6) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  ranglar.forEach((c, i) => g.addColorStop(i / Math.max(1, ranglar.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Jonli «mesh» gradient: rangli dog'lar sekin suzadi. */
export function blobBg(ctx, W, H, t, ranglar, asos = '#0b0b12') {
  ctx.fillStyle = asos; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ranglar.forEach((c, i) => {
    const x = W * (0.5 + 0.42 * noise(t * 0.18 + i * 3, i)), y = H * (0.5 + 0.4 * noise(i * 7, t * 0.14 + i));
    const r = Math.max(W, H) * (0.42 + 0.08 * Math.sin(t * 0.6 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(c, 0.55)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  ctx.restore();
}

export function vignette(ctx, W, H, kuch = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) / 1.8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${kuch})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Aylanuvchi nurlar. */
export function rays(ctx, cx, cy, t, o = {}) {
  const n = o.soni ?? 16, len = o.uzun ?? 2400;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (o.tezlik ?? 0.2));
  ctx.globalAlpha *= o.alpha ?? 0.15; ctx.fillStyle = o.rang ?? '#fff';
  for (let i = 0; i < n; i++) {
    ctx.rotate((Math.PI * 2) / n);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -len * 0.07); ctx.lineTo(len, len * 0.07); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Suzuvchi zarrachalar. yon: 'tepa' | 'past' | 'suz' | 'tashqari'; shakl: 'doira' | 'yulduz' | 'uchqun' */
export function particles(ctx, t, W, H, o = {}) {
  const r = rand(o.seed ?? 7), n = o.soni ?? 40, sp = o.tezlik ?? 60;
  const ranglar = Array.isArray(o.rang) ? o.rang : [o.rang ?? '#ffffff'];
  ctx.save();
  if (o.nur) ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = r() * W, by = r() * H, sz = lerp(o.olcham?.[0] ?? 3, o.olcham?.[1] ?? 9, r()), ph = r() * 10, spd = sp * (0.5 + r());
    const a0 = r() * Math.PI * 2, d0 = r() * 600;
    let x = bx, y = by;
    const yon = o.yon ?? 'tepa';
    if (yon === 'tepa') { y = ((by - t * spd) % (H + 40) + H + 40) % (H + 40) - 20; x = bx + Math.sin(t + ph) * 20; }
    else if (yon === 'past') { y = ((by + t * spd) % (H + 40) + H + 40) % (H + 40) - 20; x = bx + Math.sin(t + ph) * 14; }
    else if (yon === 'tashqari') { const d = (t * spd + d0) % 900; x = (o.cx ?? W / 2) + Math.cos(a0) * d; y = (o.cy ?? H / 2) + Math.sin(a0) * d; }
    else { x = bx + noise(t * 0.3 + ph) * 60; y = by + noise(ph, t * 0.3) * 60; }
    ctx.globalAlpha = (o.alpha ?? 0.8) * (0.55 + 0.45 * Math.sin(t * 3 + ph * 5));
    const c = ranglar[i % ranglar.length];
    if (o.shakl === 'yulduz') star(ctx, x, y, sz, sz * 0.42, 4, c, t + ph);
    else if (o.shakl === 'uchqun') {
      ctx.strokeStyle = c; ctx.lineWidth = sz / 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - sz, y); ctx.lineTo(x + sz, y); ctx.moveTo(x, y - sz); ctx.lineTo(x, y + sz); ctx.stroke();
    } else if (o.shakl === 'tomchi') {
      ctx.strokeStyle = c; ctx.lineWidth = sz / 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + sz * 5); ctx.stroke();
    } else circle(ctx, x, y, sz, c);
  }
  ctx.restore();
}

/** Konfetti portlashi `bosh` soniyada. */
export function confetti(ctx, t, bosh, W, H, o = {}) {
  const lt = t - bosh; if (lt < 0 || lt > 3.5) return;
  const r = rand(o.seed ?? 3), ranglar = o.ranglar ?? ['#FF3B6B', '#FFD60A', '#3BD5FF', '#C6FF3D', '#B36BFF'];
  const ox = o.x ?? W / 2, oy = o.y ?? H * 0.45;
  ctx.save();
  for (let i = 0; i < (o.soni ?? 110); i++) {
    const a = r() * Math.PI * 2, v = 500 + r() * 1300, rot = r() * 20;
    const x = ox + Math.cos(a) * v * lt * 0.6, y = oy + Math.sin(a) * v * lt * 0.6 + 900 * lt * lt;
    ctx.globalAlpha = clamp(1.6 - lt * 0.55);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * lt); ctx.scale(1, Math.cos(lt * 8 + i));
    ctx.fillStyle = ranglar[i % ranglar.length]; ctx.fillRect(-8, -14, 16, 28); ctx.restore();
  }
  ctx.restore();
}

/** Yaltiroq nur kartochka ustidan o'tadi. */
export function lightSweep(ctx, x, y, w, h, t, o = {}) {
  const p = prog(t, o.bosh ?? 0, o.dur ?? 0.9, 'inOutQuad');
  if (p <= 0 || p >= 1) return;
  ctx.save(); roundRect(ctx, x, y, w, h, o.r ?? 0); ctx.clip();
  const cx = lerp(x - w * 0.6, x + w * 1.6, p);
  const g = ctx.createLinearGradient(cx - 160, y, cx + 160, y + h * 0.25);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function ring(ctx, x, y, r, p, o = {}) {
  ctx.save(); ctx.lineWidth = o.qalin ?? 24; ctx.lineCap = 'round';
  ctx.strokeStyle = o.iz ?? 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = o.rang ?? '#C6FF3D'; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p)); ctx.stroke();
  ctx.restore();
}

/** Strelka chiziladi (p: 0..1). */
export function arrow(ctx, x1, y1, x2, y2, p, o = {}) {
  if (p <= 0) return;
  const egri = o.egri ?? 0.25;
  const mx = (x1 + x2) / 2 - (y2 - y1) * egri, my = (y1 + y2) / 2 + (x2 - x1) * egri;
  const nuqta = (q) => [(1 - q) ** 2 * x1 + 2 * (1 - q) * q * mx + q * q * x2, (1 - q) ** 2 * y1 + 2 * (1 - q) * q * my + q * q * y2];
  ctx.save(); ctx.strokeStyle = o.rang ?? '#fff'; ctx.lineWidth = o.qalin ?? 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= 24; i++) { const [px, py] = nuqta((i / 24) * p); ctx.lineTo(px, py); }
  ctx.stroke();
  if (p > 0.9) {
    const [ax, ay] = nuqta(p), [bx, by] = nuqta(Math.max(0, p - 0.06));
    const a = Math.atan2(ay - by, ax - bx), uz = (o.qalin ?? 12) * 3;
    ctx.beginPath(); ctx.moveTo(ax - Math.cos(a - 0.5) * uz, ay - Math.sin(a - 0.5) * uz); ctx.lineTo(ax, ay);
    ctx.lineTo(ax - Math.cos(a + 0.5) * uz, ay - Math.sin(a + 0.5) * uz); ctx.stroke();
  }
  ctx.restore();
}

/** Rasmni qutiga joylash (cover/contain). */
export function image(ctx, img, x, y, w, h, o = {}) {
  if (!img?.width) return;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.r) { roundRect(ctx, x, y, w, h, o.r); ctx.clip(); }
  const fit = o.fit ?? 'cover', zoom = o.zoom ?? 1;
  const s = (fit === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height)) * zoom;
  const dw = img.width * s, dh = img.height * s;
  const ox = (w - dw) / 2 + (o.panX ?? 0) * Math.max(0, dw - w) / 2;
  const oy = (h - dh) / 2 + (o.panY ?? 0) * Math.max(0, dh - h) / 2;
  ctx.drawImage(img, x + ox, y + oy, dw, dh);
  ctx.restore();
}

/**
 * Mahsulot kartochkasi: oq quti, ichida surat, soya, nur. Markazi (cx, cy).
 * aylan — Y o'qi atrofida 3D burilish (radian): kartochka «yupqalashadi».
 */
export function productCard(ctx, img, cx, cy, o = {}) {
  const w = o.en ?? 620, h = o.boy ?? w, r = o.r ?? w * 0.09;
  const aylan = o.aylan ?? 0, eg = o.egil ?? 0;
  ctx.save();
  ctx.translate(cx, cy);
  if (eg) ctx.rotate(eg);
  ctx.scale((Math.abs(Math.cos(aylan)) || 0.001) * (o.s ?? 1), (1 + 0.05 * Math.abs(Math.sin(aylan))) * (o.s ?? 1));
  ctx.globalAlpha *= o.alpha ?? 1;
  rect(ctx, -w / 2, -h / 2, w, h, { fill: o.fon ?? '#ffffff', r, soya: 'rgba(0,0,0,0.45)', blur: 60 });
  const ich = w * 0.06;
  image(ctx, img, -w / 2 + ich, -h / 2 + ich, w - ich * 2, h - ich * 2, { fit: 'contain', r: r * 0.7 });
  if (o.nur != null) lightSweep(ctx, -w / 2, -h / 2, w, h, o.nur, { bosh: 0, dur: 1, r });
  ctx.restore();
}

/** Emoji (rangli shrift bilan). */
export function emoji(ctx, ch, x, y, olcham = 120, o = {}) {
  if (!ch) return;
  ctx.save();
  ctx.translate(x, y); if (o.r) ctx.rotate(o.r); if (o.s != null) ctx.scale(o.s, o.s);
  if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
  ctx.font = `${Math.round(olcham)}px ${OILA}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

/** Tugma (CTA) — pulsatsiya bilan. */
export function button(ctx, matn, x, y, t, o = {}) {
  const p = spring(t, o.bosh ?? 0, { k: 210, c: 13 });
  if (p <= 0.001) return;
  const olcham = o.olcham ?? 54;
  ctx.save();
  ctx.font = font(olcham, 900);
  const w = ctx.measureText(matn).width + olcham * 1.6, h = olcham * 2.1;
  const puls = 1 + 0.035 * Math.sin((t - (o.bosh ?? 0)) * 6) * clamp(t - (o.bosh ?? 0) - 0.5);
  ctx.translate(x, y); ctx.scale(p * puls, p * puls);
  // Halqa to'lqini
  const tq = ((t - (o.bosh ?? 0)) % 1.4) / 1.4;
  rect(ctx, -w / 2 - 30 * tq, -h / 2 - 30 * tq, w + 60 * tq, h + 60 * tq, { stroke: hexA(o.rang ?? '#FF2D55', 0.6 * (1 - tq)), width: 6, r: h });
  rect(ctx, -w / 2, -h / 2, w, h, { fill: o.rang ?? '#FF2D55', r: h / 2, soya: 'rgba(0,0,0,.4)', blur: 40 });
  ctx.fillStyle = o.matnRang ?? '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(matn, 0, 3);
  ctx.restore();
}

/** Nutq pufagi (gapirish yoki o'ylash). dum: pufak dumi qaratilgan nuqta. */
export function bubble(ctx, matn, x, y, t, o = {}) {
  const p = spring(t, o.bosh ?? 0, { k: 230, c: 14 });
  if (p <= 0.001) return null;
  const olcham = o.olcham ?? 46;
  ctx.save();
  ctx.font = font(olcham, 800);
  const qator = wrap(ctx, belgiTozala(matn), o.maxEni ?? 560);
  const lh = olcham * 1.18;
  const w = Math.max(...qator.map((q) => ctx.measureText(q).width)) + olcham * 1.3, h = qator.length * lh + olcham * 0.95;
  ctx.translate(x, y); ctx.scale(p, p); ctx.rotate((o.egil ?? 0) * (1 - clamp(p)));
  ctx.fillStyle = o.fon ?? '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, olcham * 0.9)); ctx.fill();
  if (o.dum) {
    const [dx, dy] = [o.dum[0] - x, o.dum[1] - y];
    if (o.oylash) {
      [0.55, 0.78].forEach((k, i) => circle(ctx, dx * k, dy * k, olcham * (0.32 - i * 0.12), o.fon ?? '#ffffff'));
    } else {
      const a = Math.atan2(dy, dx), b = olcham * 0.55;
      ctx.beginPath(); ctx.moveTo(Math.cos(a + 1.57) * b, Math.sin(a + 1.57) * b);
      ctx.lineTo(dx * 0.62, dy * 0.62); ctx.lineTo(Math.cos(a - 1.57) * b, Math.sin(a - 1.57) * b); ctx.closePath(); ctx.fill();
    }
  }
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = o.rang ?? '#1d1514'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  qator.forEach((q, i) => ctx.fillText(q, 0, -h / 2 + olcham * 0.48 + lh / 2 + i * lh));
  ctx.restore();
  return { w: w * p, h: h * p };
}

/** Raqam sanog'i: from → to. */
export const count = (t, bosh, dur, from, to) => Math.round(lerp(from, to, prog(t, bosh, dur, 'outExpo')));

/** Telefon ekrani (ichida chizish uchun funksiya). */
export function phone(ctx, x, y, w, h, fn, o = {}) {
  ctx.save();
  rect(ctx, x, y, w, h, { fill: '#0d0d10', r: w * 0.14, soya: 'rgba(0,0,0,.5)', blur: 60 });
  const ich = w * 0.035;
  ctx.save(); roundRect(ctx, x + ich, y + ich, w - ich * 2, h - ich * 2, w * 0.11); ctx.clip();
  ctx.fillStyle = o.ekran ?? '#f6f1f2'; ctx.fillRect(x, y, w, h);
  fn(x + ich, y + ich, w - ich * 2, h - ich * 2);
  ctx.restore();
  rect(ctx, x + w / 2 - w * 0.16, y + ich + 14, w * 0.32, w * 0.075, { fill: '#0d0d10', r: w * 0.04 });
  ctx.restore();
}
