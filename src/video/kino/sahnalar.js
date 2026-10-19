// SAHNALAR — har sahna turi o'z kompozitsiyasini chizadi (1080×1920).
//
// AI rejissyor faqat MAZMUNNI tanlaydi (sahna turi, matn, emoji, hissiyot);
// ko'rinish shu yerda — kod bilan, sinalgan. Shuning uchun video hech qachon
// «buzilib» chiqmaydi, AI qanday javob bermasin.
//
// Har tur:
//   chiz(ctx, t, d, S, Y)   — fon + asosiy mazmun (qahramon OSTIDA);
//   ustki(ctx, t, d, S, Y)  — qahramon USTIDAGI narsalar (emoji, pufak);
//   qahramon(t, d, S, Y)    — qahramonning joyi, hissiyoti, imosi;
//   sfx(S, Y)               — tovush effektlari [{tur, t}].
// Y: { W, H, mavzu, q (qahramon bormi), rasm {mahsulot, xira, logo}, mahsulot, seed }
// Instagram xavfsiz zonasi: tepada ~230 px va pastda ~330 px interfeys,
// o'ngda 1100–1700 oralig'ida tugmalar ustuni — muhim matn u yerga tushmaydi.
import * as L from './L.js';

const W = 1080, H = 1920;

export const MAVZULAR = {
  brend:  { asos: '#16040a', fon: ['#AB0A0C', '#6b0a35', '#3d1a10'], aksent: '#BDDB7D', aksent2: '#FFD60A', tugma: '#E3263B' },
  pastel: { asos: '#2a1630', fon: ['#ff7aa8', '#a77bff', '#5fc4ff'], aksent: '#FFE066', aksent2: '#FF6FA8', tugma: '#FF3D7F' },
  tungi:  { asos: '#05050d', fon: ['#6a26ff', '#ff2d75', '#00b7ff'], aksent: '#C6FF3D', aksent2: '#FF2D75', tugma: '#FF2D75' },
  yorqin: { asos: '#1d0a2c', fon: ['#ff3d7f', '#ff8a3c', '#ffcf3f'], aksent: '#FFF3A3', aksent2: '#FF3D7F', tugma: '#FF2D55' },
};
const SOVUQ = { asos: '#090d18', fon: ['#34445f', '#252c46', '#463a5c'] };

/** So'z aytiladigan vaqt (sahna ichida) yoki zaxira vaqt. */
export function at(S, soz, zaxira = 0) {
  const k = L.tozaSoz(soz);
  if (!k || !S.sozlar?.length) return zaxira;
  const w = S.sozlar.find((x) => L.tozaSoz(x.w).startsWith(k.slice(0, Math.max(3, k.length - 2))));
  return w ? w.s : zaxira;
}

function fon(ctx, t, Y, tur = 'asosiy') {
  const m = tur === 'sovuq' ? SOVUQ : Y.mavzu;
  L.blobBg(ctx, W, H, t + Y.seed, m.fon, m.asos);
  if (tur === 'mahsulot' && Y.rasm.xira) {
    ctx.save(); ctx.globalAlpha = 0.32;
    const z = 1.15 + 0.04 * Math.sin(t * 0.5);
    ctx.drawImage(Y.rasm.xira, W / 2 - (W * z) / 2, H / 2 - (H * z) / 2, W * z, H * z);
    ctx.restore();
  }
  if (tur === 'sovuq') L.particles(ctx, t, W, H, { soni: 40, rang: '#9fb6d8', olcham: [2, 3], yon: 'past', tezlik: 520, alpha: 0.28, shakl: 'tomchi', seed: 4 });
  else L.particles(ctx, t, W, H, { soni: 28, rang: [Y.mavzu.aksent, '#ffffff'], olcham: [2, 5], yon: 'tepa', tezlik: 40, alpha: 0.45, seed: 11 });
  L.vignette(ctx, W, H, 0.5);
}

const egri = (t, f = 1.6, a = 10) => Math.sin(t * f) * a;           // suzish

function chip(ctx, matn, x, y, t, bosh, o = {}) {
  const p = L.spring(t, bosh, { k: 220, c: 13 });
  if (p <= 0.001) return;
  ctx.save();
  ctx.font = L.font(o.olcham ?? 44, 800);
  const w = ctx.measureText(matn).width + 130, h = 92;
  x = L.clamp(x, w / 2 + 40, W - w / 2 - 40);                      // ekrandan chiqib ketmasin
  ctx.translate(x, y + egri(t + bosh * 3, 1.8, 8)); ctx.scale(p, p); ctx.rotate((o.egil ?? 0) + (1 - L.clamp(p)) * 0.3);
  L.rect(ctx, -w / 2, -h / 2, w, h, { fill: o.fon ?? '#ffffff', r: h / 2, soya: 'rgba(0,0,0,.35)', blur: 26 });
  L.circle(ctx, -w / 2 + 48, 0, 26, o.belgiRang ?? '#E5484D');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (o.belgi === 'ok') { ctx.beginPath(); ctx.moveTo(-w / 2 + 36, 1); ctx.lineTo(-w / 2 + 45, 11); ctx.lineTo(-w / 2 + 61, -9); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-w / 2 + 38, -10); ctx.lineTo(-w / 2 + 58, 10); ctx.moveTo(-w / 2 + 58, -10); ctx.lineTo(-w / 2 + 38, 10); ctx.stroke(); }
  ctx.fillStyle = o.rang ?? '#1d1514'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(matn, -w / 2 + 92, 2);
  ctx.restore();
}

function kichikMatn(ctx, S, y, t, bosh, Y, o = {}) {
  if (!S.kichik) return;
  const p = L.prog(t, bosh, 0.6, 'outExpo');
  L.text(ctx, S.kichik, o.x ?? W / 2, y + (1 - p) * 40, { olcham: o.olcham ?? 50, ogirlik: 700, rang: o.rang ?? 'rgba(255,255,255,.92)',
    alpha: p, maxEni: o.maxEni ?? 860, soya: true, avtoSig: true, min: 30, maxQator: 2 });
}

// ─────────────────────────── Sahna turlari ───────────────────────────

const hook = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.rays(ctx, W / 2, Y.q ? 1050 : 960, t, { rang: Y.mavzu.aksent, alpha: 0.07 * L.prog(t, 0.1, 0.6) });
    const sh = t < 0.55 ? L.shake(t, 22 * (1 - t / 0.55), 32) : { x: 0, y: 0 };
    ctx.save(); ctx.translate(sh.x, sh.y);
    const b = L.title(ctx, S.ekran, W / 2, Y.q ? 470 : 700, t, { uslub: 'zarba', bosh: 0.05, olcham: 126, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900 });
    kichikMatn(ctx, S, b.y1 + 80, t, 0.55, Y);
    ctx.restore();
    if (!Y.q) {
      // Qahramonsiz: mahsulot «mo'ralab» turadi
      const p = L.spring(t, 0.7, { k: 120, c: 13 });
      L.productCard(ctx, Y.rasm.mahsulot, W / 2, 1180 + (1 - p) * 500, { en: 520, egil: -0.08 + egri(t, 1.2, 0.03), alpha: L.clamp(p * 2) });
    }
    if (t < 0.22) { ctx.fillStyle = `rgba(255,255,255,${(0.65 * (1 - t / 0.22)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  },
  ustki(ctx, t, d, S, Y) {
    const bosh = 0.55;
    L.emoji(ctx, S.emoji || '😱', Y.q ? 845 : 820, Y.q ? 860 : 1500, Y.q ? 165 : 190,
      { s: L.spring(t, bosh, { k: 260, c: 12 }), r: Math.sin(t * 2.4) * 0.14 });
  },
  qahramon: (t, d, S) => ({ x: W / 2, y: 1170, s: 1.55, hissiyot: S.hissiyot || 'hayron', imo: S.imo || 'yelka', qarash: 0 }),
  sfx: () => [{ tur: 'boom', t: 0.05 }, { tur: 'pop', t: 0.55 }],
};

const muammo = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y, 'sovuq');
    const b = L.title(ctx, S.ekran, W / 2, 400, t, { uslub: 'soz', bosh: 0.1, olcham: 104, urgu: S.urgu, aksent: '#FF6B6B', maxEni: 900 });
    kichikMatn(ctx, S, b.y1 + 70, t, 0.5, Y, { olcham: 46 });
    const belgilar = (S.belgilar || []).slice(0, 3);
    const joylar = Y.q ? [[250, 770, -0.06], [830, 690, 0.05], [820, 960, -0.04]] : [[W / 2, 860, -0.04], [W / 2, 1010, 0.04], [W / 2, 1160, -0.03]];
    belgilar.forEach((m, i) => chip(ctx, m, joylar[i][0], joylar[i][1] + (Y.q ? 0 : 0), t,
      at(S, m, 0.6 + i * 0.5), { egil: joylar[i][2] }));
    if (!Y.q) L.emoji(ctx, S.emoji || '😩', W / 2, 1400, 230, { s: L.spring(t, 0.4), r: Math.sin(t * 2) * 0.1 });
  },
  ustki(ctx, t, d, S, Y) {
    if (Y.q) L.emoji(ctx, S.emoji || '😩', 200, 1040, 130, { s: L.spring(t, 0.35), r: Math.sin(t * 2) * 0.12 });
  },
  qahramon: (t, d, S) => ({ x: W / 2, y: 1230, s: 1.4, hissiyot: S.hissiyot || 'xafa', imo: S.imo || 'yuz', dog: 1, qarash: -0.3 }),
  sfx: (S) => (S.belgilar || []).slice(0, 3).map((m, i) => ({ tur: 'pop', t: at(S, m, 0.6 + i * 0.5) })),
};

const kashfiyot = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y, 'mahsulot');
    const cx = Y.q ? 650 : W / 2, cy = Y.q ? 950 : 940, en = Y.q ? 540 : 660;
    const ochil = L.prog(t, 0.15, 0.7, 'outCubic');
    L.rays(ctx, cx, cy, t, { rang: Y.mavzu.aksent, alpha: 0.13 * ochil, soni: 18, tezlik: 0.25 });
    // yorug'lik halqasi
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, en);
    g.addColorStop(0, L.hexA(Y.mavzu.aksent, 0.35 * ochil)); g.addColorStop(1, L.hexA(Y.mavzu.aksent, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    const p = L.spring(t, 0.2, { k: 120, c: 11 });
    const aylan = (1 - L.prog(t, 0.2, 0.9, 'outCubic')) * 1.35 + Math.sin(t * 1.3) * 0.08 * ochil;
    L.productCard(ctx, Y.rasm.mahsulot, cx, cy + egri(t, 1.4, 12), { en, s: 0.4 + 0.6 * p, aylan, nur: t - 1.0, alpha: L.clamp(p * 3) });
    L.particles(ctx, t, W, H, { soni: 22, rang: ['#fff', Y.mavzu.aksent2], olcham: [6, 14], yon: 'tashqari', cx, cy, tezlik: 160, alpha: 0.85 * ochil, shakl: 'yulduz', nur: true, seed: 21 });
    L.title(ctx, S.ekran, W / 2, 380, t, { uslub: 'maska', bosh: 0.05, olcham: 92, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const np = L.prog(t, 0.75, 0.6, 'outExpo');
    const ty = cy + en / 2 + 90;
    if (Y.mahsulot.brend) L.text(ctx, Y.mahsulot.brend.toUpperCase(), cx, ty + (1 - np) * 30, { olcham: 36, ogirlik: 800, rang: Y.mavzu.aksent, alpha: np });
    L.text(ctx, Y.mahsulot.nom, cx, ty + 80 + (1 - np) * 30, { olcham: 54, ogirlik: 800, alpha: np, maxEni: Y.q ? 600 : 860, avtoSig: true, min: 36, maxQator: 2, soya: true });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 205, y: 1480, s: 0.92, hissiyot: S.hissiyot || 'hayajon', imo: S.imo || 'korsat', yon: 1, qarash: 0.9 }),
  sfx: () => [{ tur: 'shimmer', t: 0.25 }, { tur: 'ding', t: 1.0 }],
};

const foyda = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.title(ctx, S.ekran || 'Nega aynan shu?', W / 2, 370, t, { uslub: 'maska', bosh: 0.05, olcham: 88, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const punkt = (S.punktlar || []).slice(0, 3);
    const x0 = Y.q ? 120 : 90, en = Y.q ? 860 : 900, bh = 196, ora = 36;
    const y0 = 540;
    punkt.forEach((q, i) => {
      const bosh = q.t ?? at(S, q.matn?.split(' ')[0], 0.45 + i * Math.max(0.5, (d - 1.6) / 3));
      const p = L.spring(t, bosh, { k: 170, c: 15 });
      if (p <= 0.001) return;
      const y = y0 + i * (bh + ora);
      ctx.save(); ctx.translate((1 - p) * 700, 0); ctx.globalAlpha = L.clamp(p * 2);
      L.rect(ctx, x0, y, en, bh, { fill: 'rgba(255,255,255,0.95)', r: 48, soya: 'rgba(0,0,0,.35)', blur: 34 });
      L.circle(ctx, x0 + 100, y + bh / 2, 64, L.hexA(Y.mavzu.aksent, 1));
      L.emoji(ctx, q.emoji || '✨', x0 + 100, y + bh / 2 + 4, 70, { s: L.spring(t, bosh + 0.15, { k: 260, c: 10 }) });
      L.text(ctx, q.matn, x0 + 200, y + bh / 2, { olcham: 50, ogirlik: 800, rang: '#1d1514', align: 'left', maxEni: en - 300, avtoSig: true, min: 34, maxQator: 2 });
      // belgi ✓ chiziladi
      const cp = L.prog(t, bosh + 0.35, 0.35);
      if (cp > 0) {
        ctx.strokeStyle = '#1FA463'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const bx = x0 + en - 70, by = y + bh / 2;
        ctx.beginPath(); ctx.moveTo(bx - 26, by);
        ctx.lineTo(bx - 26 + 18 * Math.min(1, cp * 2), by + 18 * Math.min(1, cp * 2));
        if (cp > 0.5) ctx.lineTo(bx - 8 + 40 * (cp - 0.5) * 2, by + 18 - 44 * (cp - 0.5) * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
    if (!Y.q) L.productCard(ctx, Y.rasm.mahsulot, W / 2, 1360, { en: 300, egil: egri(t, 1.1, 0.05) });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 200, y: 1525, s: 0.8, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'korsat', yon: 1, qarash: 0.8 }),
  sfx: (S) => (S.punktlar || []).slice(0, 3).map((q, i) => ({ tur: 'pop', t: q.t ?? at(S, q.matn?.split(' ')[0], 0.45 + i * 0.9) })),
};

const natija = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.rays(ctx, W / 2, 1050, t, { rang: Y.mavzu.aksent2, alpha: 0.08, soni: 20, tezlik: 0.15 });
    L.particles(ctx, t, W, H, { soni: 30, rang: ['#fff', Y.mavzu.aksent2], olcham: [5, 11], yon: 'suz', alpha: 0.75, shakl: 'yulduz', nur: true, seed: 33 });
    const b = L.title(ctx, S.ekran, W / 2, 400, t, { uslub: 'harf', bosh: 0.1, olcham: 100, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900 });
    kichikMatn(ctx, S, b.y1 + 70, t, 0.7, Y, { olcham: 46 });
    if (S.raqam) {
      const x = Y.q ? 860 : W / 2, y = Y.q ? 800 : 1000, r = Y.q ? 120 : 170;
      const p = L.spring(t, 0.5, { k: 160, c: 13 });
      L.tf(ctx, { x, y, s: p }, () => {
        L.circle(ctx, 0, 0, r + 20, 'rgba(255,255,255,0.12)');
        L.ring(ctx, 0, 0, r, L.prog(t, 0.6, 1.1, 'outCubic'), { qalin: 18, rang: Y.mavzu.aksent });
        L.text(ctx, String(S.raqam), 0, -12, { olcham: r * 0.72, ogirlik: 900, rang: '#fff', maxEni: r * 1.6, avtoSig: true, min: 30, maxQator: 1 });
        if (S.birlik) L.text(ctx, S.birlik, 0, r * 0.5, { olcham: r * 0.26, ogirlik: 800, rang: Y.mavzu.aksent, maxEni: r * 1.6, avtoSig: true, min: 18, maxQator: 1 });
      });
    }
    if (!Y.q) L.productCard(ctx, Y.rasm.mahsulot, W / 2, S.raqam ? 1400 : 1150, { en: S.raqam ? 340 : 540, nur: t - 0.6, egil: egri(t, 1, 0.04) });
    L.confetti(ctx, t, 0.55, W, H, { soni: 70, y: 820, ranglar: [Y.mavzu.aksent, Y.mavzu.aksent2, '#fff', '#FF6FA8'] });
  },
  ustki(ctx, t, d, S, Y) {
    if (Y.q && !S.raqam) L.emoji(ctx, S.emoji || '🤩', 850, 860, 150, { s: L.spring(t, 0.6), r: Math.sin(t * 2.2) * 0.12 });
  },
  qahramon: (t, d, S) => ({ x: W / 2, y: 1210, s: 1.42, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'yuz',
    dog: 1 - L.prog(t, 0.2, 1.1), yaltiroq: L.prog(t, 0.6, 0.6), qarash: 0 }),
  sfx: () => [{ tur: 'shimmer', t: 0.6 }, { tur: 'pop', t: 0.5 }],
};

const sharh = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.title(ctx, S.ekran || 'Mijozlar nima deydi?', W / 2, 370, t, { uslub: 'maska', bosh: 0.05, olcham: 86, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const sh = S.sharh || {};
    const cx = Y.q ? 480 : W / 2, cy = 860, en = Y.q ? 800 : 900;
    const p = L.spring(t, 0.25, { k: 150, c: 14 });
    ctx.save(); ctx.translate(cx, cy + (1 - p) * 260); ctx.globalAlpha = L.clamp(p * 2); ctx.rotate(-0.025);
    const bh = 480;
    L.rect(ctx, -en / 2, -bh / 2, en, bh, { fill: '#ffffff', r: 52, soya: 'rgba(0,0,0,.4)', blur: 50 });
    L.circle(ctx, -en / 2 + 100, -bh / 2 + 100, 52, Y.mavzu.tugma);
    L.text(ctx, String(sh.ism || 'M').trim().charAt(0).toUpperCase(), -en / 2 + 100, -bh / 2 + 102, { olcham: 54, ogirlik: 900 });
    L.text(ctx, sh.ism || 'Mijozimiz', -en / 2 + 180, -bh / 2 + 78, { olcham: 40, ogirlik: 800, rang: '#1d1514', align: 'left', maxEni: en - 240 });
    const baho = Math.max(1, Math.min(5, Math.round(Number(sh.baho) || 5)));
    for (let i = 0; i < 5; i++) {
      const sp = L.spring(t, 0.6 + i * 0.12, { k: 300, c: 12 });
      L.tf(ctx, { x: -en / 2 + 200 + i * 52, y: -bh / 2 + 126, s: sp }, () => L.star(ctx, 0, 0, 22, 10, 5, i < baho ? '#FFB800' : '#E2DADB'));
    }
    // matn so'zma-so'z paydo bo'ladi
    const sozlar = String(sh.matn || '').split(/\s+/).filter(Boolean);
    const korin = Math.ceil(L.clamp((t - 0.8) / Math.max(0.8, (d - 1.2) * 0.6)) * sozlar.length);
    L.text(ctx, `“${sozlar.slice(0, Math.max(0, korin)).join(' ')}”`, 0, 70, { olcham: 44, ogirlik: 700, rang: '#3a2b2d', maxEni: en - 120, avtoSig: true, min: 30, maxQator: 5, qator: 1.25 });
    ctx.restore();
    if (Y.mahsulot.reytingMatn) {
      const rp = L.prog(t, 1.2, 0.6, 'outExpo');
      L.text(ctx, Y.mahsulot.reytingMatn, cx, cy + 340 + (1 - rp) * 30, { olcham: 42, ogirlik: 800, alpha: rp, rang: Y.mavzu.aksent, fon: 'rgba(0,0,0,.35)' });
    }
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 880, y: 1500, s: 0.78, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'korsat', yon: -1, qarash: -0.8 }),
  sfx: () => [0, 1, 2, 3, 4].map((i) => ({ tur: 'tick', t: 0.6 + i * 0.12 })),
};

const narxSahna = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y, 'mahsulot');
    const m = Y.mahsulot;
    const cx = Y.q ? 640 : W / 2, cy = 800, en = Y.q ? 480 : 560;
    const p = L.spring(t, 0.1, { k: 140, c: 12 });
    const aylan = (1 - L.prog(t, 0.1, 0.8, 'outCubic')) * -1.3 + Math.sin(t * 1.6) * 0.12;
    L.productCard(ctx, Y.rasm.mahsulot, cx, cy + egri(t, 1.3, 10), { en, s: 0.5 + 0.5 * p, aylan, nur: t - 0.7, alpha: L.clamp(p * 3) });
    if (m.chegirma) {
      const bp = L.spring(t, 0.8, { k: 260, c: 11 });
      L.tf(ctx, { x: cx + en / 2 - 30, y: cy - en / 2 + 20, s: bp * (1 + 0.04 * Math.sin(t * 6)), r: -0.25 + (1 - L.clamp(bp)) * 1.5 }, () => {
        L.star(ctx, 0, 0, 118, 100, 16, Y.mavzu.tugma);
        L.text(ctx, m.chegirma, 0, 4, { olcham: 62, ogirlik: 900 });
      });
    }
    const y = cy + en / 2 + 150;
    if (m.eskiNarx) {
      const ep = L.prog(t, 0.45, 0.4, 'outCubic');
      const b = L.text(ctx, m.eskiNarx, cx, y, { olcham: 50, ogirlik: 700, rang: 'rgba(255,255,255,.75)', alpha: ep });
      const cp = L.prog(t, 0.75, 0.35, 'outCubic');
      if (cp > 0) { ctx.strokeStyle = '#FF4D5E'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x - 10, y + 4); ctx.lineTo(b.x - 10 + (b.w + 20) * cp, y - 6); ctx.stroke(); }
    }
    const np = L.spring(t, 0.95, { k: 200, c: 12 });
    const son = L.count(t, 0.95, 0.9, Math.round(m.narxSon * 0.4), m.narxSon);
    L.tf(ctx, { x: cx, y: y + (m.eskiNarx ? 120 : 40), s: np }, () => {
      L.text(ctx, `${String(son).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`, 0, 0, { olcham: 112, ogirlik: 900, rang: Y.mavzu.aksent, soya: true, maxEni: Y.q ? 640 : 900, avtoSig: true, min: 60, maxQator: 1 });
    });
    kichikMatn(ctx, S, y + (m.eskiNarx ? 240 : 160), t, 1.4, Y, { olcham: 44, x: cx, maxEni: Y.q ? 600 : 860 });
    L.title(ctx, S.ekran, W / 2, 350, t, { uslub: 'maska', bosh: 0.05, olcham: 80, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 190, y: 1560, s: 0.82, hissiyot: S.hissiyot || 'hayajon', imo: S.imo || 'korsat', yon: 1, qarash: 0.9 }),
  sfx: (S, Y) => [{ tur: 'whoosh', t: 0.1 }, ...(Y.mahsulot.chegirma ? [{ tur: 'pop', t: 0.8 }] : []), { tur: 'ding', t: 1.8 }],
};

const cta = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.rays(ctx, W / 2, 640, t, { rang: Y.mavzu.aksent, alpha: 0.06, soni: 14, tezlik: 0.12 });
    if (Y.rasm.logo) {
      const lp = L.spring(t, 0.05, { k: 180, c: 13 });
      const lw = 330, lh = lw * (Y.rasm.logo.height / Y.rasm.logo.width);
      L.tf(ctx, { x: W / 2, y: 330, s: lp }, () => ctx.drawImage(Y.rasm.logo, -lw / 2, -lh / 2, lw, lh));
    }
    L.button(ctx, S.ekran || 'Izohga «+» yozing', W / 2, 600, t, { bosh: 0.3, rang: Y.mavzu.tugma, olcham: 58 });
    kichikMatn(ctx, S, 760, t, 0.7, Y, { olcham: 44 });
    // Instagram izoh tugmasi tomon strelka (o'ngda)
    L.arrow(ctx, 760, 830, 975, 1330, L.prog(t, 1.0, 0.7, 'outCubic'), { rang: Y.mavzu.aksent, qalin: 12, egri: -0.25 });
    if (!Y.q) L.productCard(ctx, Y.rasm.mahsulot, W / 2, 1160, { en: 460, egil: egri(t, 1.2, 0.05), nur: t - 1.2 });
    L.confetti(ctx, t, 0.35, W, H, { soni: 90, y: 600, ranglar: [Y.mavzu.aksent, Y.mavzu.aksent2, '#fff', Y.mavzu.tugma] });
  },
  ustki(ctx, t, d, S, Y) {
    L.emoji(ctx, S.emoji || '💌', Y.q ? 230 : 820, Y.q ? 930 : 1450, 130, { s: L.spring(t, 0.9), r: Math.sin(t * 2.5) * 0.15 });
  },
  qahramon: (t, d, S) => ({ x: 470, y: 1270, s: 1.25, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'silkit', qarash: 0.4 }),
  sfx: () => [{ tur: 'pop', t: 0.3 }, { tur: 'ding', t: 0.45 }, { tur: 'whoosh', t: 1.0 }],
};

const hikoya = {
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    if (!Y.q) {
      L.title(ctx, S.ekran, W / 2, 700, t, { uslub: 'soz', bosh: 0.1, olcham: 104, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900 });
      kichikMatn(ctx, S, 980, t, 0.6, Y);
      L.emoji(ctx, S.emoji || '💭', W / 2, 1260, 220, { s: L.spring(t, 0.5), r: Math.sin(t * 2) * 0.1 });
    }
  },
  ustki(ctx, t, d, S, Y) {
    if (!Y.q) return;
    L.bubble(ctx, S.ekran, W / 2, 520, t, { bosh: 0.15, olcham: 62, maxEni: 760, dum: [W / 2 + 40, 860], oylash: S.hissiyot === 'oylash' });
    if (S.kichik) kichikMatn(ctx, S, 760, t, 0.8, Y, { olcham: 42 });
    if (S.emoji) L.emoji(ctx, S.emoji, 860, 900, 120, { s: L.spring(t, 0.7), r: Math.sin(t * 2) * 0.12 });
  },
  qahramon: (t, d, S) => ({ x: W / 2, y: 1210, s: 1.45, hissiyot: S.hissiyot || 'oddiy', imo: S.imo || 'tinch', qarash: 0.1 }),
  sfx: () => [{ tur: 'pop', t: 0.15 }],
};

export const SAHNALAR = { hook, muammo, kashfiyot, foyda, natija, sharh, narx: narxSahna, cta, hikoya };
export const SAHNA_TURLARI = Object.keys(SAHNALAR);
