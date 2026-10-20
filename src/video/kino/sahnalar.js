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
import { qahramonChiz } from './qahramon.js';

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

function chip(ctx, matn0, x, y, t, bosh, o = {}) {
  const matn = L.belgiTozala(matn0);
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
    if (!Y.q && Y.rasm.mahsulot) {
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
    if (!Y.q && Y.rasm.mahsulot) L.productCard(ctx, Y.rasm.mahsulot, W / 2, 1360, { en: 300, egil: egri(t, 1.1, 0.05) });
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
    if (!Y.q && Y.rasm.mahsulot) L.productCard(ctx, Y.rasm.mahsulot, W / 2, S.raqam ? 1400 : 1150, { en: S.raqam ? 340 : 540, nur: t - 0.6, egil: egri(t, 1, 0.04) });
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
    if (!Y.q && Y.rasm.mahsulot) L.productCard(ctx, Y.rasm.mahsulot, W / 2, 1160, { en: 460, egil: egri(t, 1.2, 0.05), nur: t - 1.2 });
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

// ─────────────── Reels 3.0: mahsulotdan tashqari sahnalar ───────────────
// Ilova (skaner, maslahatchi, buyurtma), foydali maslahat, aksiya va erkin
// mavzular uchun: oynada matn yozilishi va kursor bosishi, chat, yuz
// skaneri, telefon ekrani, ro'yxat, taqqos, bosqichlar, kinetik matn.

const yozilgan = (matn, t, bosh, tezlik = 16) => String(matn || '').slice(0, Math.max(0, Math.floor((t - bosh) * tezlik)));
const yozishTugashi = (matn, bosh, tezlik = 16) => bosh + String(matn || '').length / tezlik;

/** Sichqoncha ko'rsatkichi (strelka). bos — 0..1 bosilish. */
function kursor(ctx, x, y, bos = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.5 - 0.15 * bos, 1.5 - 0.15 * bos);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 41); ctx.lineTo(22, 38);
  ctx.lineTo(15, 23); ctx.lineTo(27, 23); ctx.closePath();
  ctx.fillStyle = '#111'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}

/** Chizilgan belgi: 'ok' — ✓, 'yoq' — ✕ (shriftga bog'liq emas). */
function belgi(ctx, x, y, r, tur, rang) {
  ctx.save(); ctx.strokeStyle = rang; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (tur === 'ok') { ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.25, y + r * 0.75); ctx.lineTo(x + r, y - r * 0.75); }
  else { ctx.moveTo(x - r * 0.75, y - r * 0.75); ctx.lineTo(x + r * 0.75, y + r * 0.75); ctx.moveTo(x + r * 0.75, y - r * 0.75); ctx.lineTo(x - r * 0.75, y + r * 0.75); }
  ctx.stroke(); ctx.restore();
}

/** Aylanuvchi yuklanish halqasi yoki yashil ✓. */
function holatBelgisi(ctx, x, y, t, tayyorVaqt, r = 24) {
  if (t < tayyorVaqt) {
    ctx.save(); ctx.strokeStyle = '#C9CDD4'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r, t * 7, t * 7 + 4.2); ctx.stroke(); ctx.restore();
    return;
  }
  const p = L.spring(t, tayyorVaqt, { k: 300, c: 14 });
  L.tf(ctx, { x, y, s: p }, () => {
    L.circle(ctx, 0, 0, r + 2, '#1FA463');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35); ctx.stroke();
  });
}

/** macOS uslubidagi oyna (oq kartochka + uchta nuqta + sarlavha). Ichki maydon qutisini qaytaradi. */
function oynaKarta(ctx, x, y, w, h, sarlavha, p = 1) {
  ctx.save();
  ctx.globalAlpha *= L.clamp(p * 2);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p); ctx.translate(-(x + w / 2), -(y + h / 2));
  L.rect(ctx, x, y, w, h, { fill: '#ffffff', r: 34, soya: 'rgba(0,0,0,.45)', blur: 60 });
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => L.circle(ctx, x + 44 + i * 34, y + 40, 11, c));
  L.text(ctx, sarlavha || 'KiOVO', x + w / 2, y + 41, { olcham: 30, ogirlik: 700, rang: '#3a3a40' });
  ctx.strokeStyle = '#ECECEF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 80); ctx.lineTo(x + w, y + 80); ctx.stroke();
  ctx.restore();
  return { x: x + 40, y: y + 110, w: w - 80, h: h - 130 };
}

const matn = {
  logoBor: true,
  // Kinetik tipografiya: so'zlar ovoz bilan birga birma-bir urilib chiqadi
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    const sozlar = String(S.ekran || '').split(/\s+/).filter(Boolean);
    const urilish = sozlar.map((w, i) => at(S, w, 0.15 + i * 0.3));
    const songgi = urilish.filter((x) => x <= t).length;
    // Har so'zda fon bir lahza yorishadi
    const oxirgi = urilish[songgi - 1] ?? -9;
    if (t - oxirgi < 0.18) { ctx.fillStyle = L.hexA(Y.mavzu.aksent, 0.18 * (1 - (t - oxirgi) / 0.18)); ctx.fillRect(0, 0, W, H); }
    L.title(ctx, S.ekran, W / 2, 860, t, { uslub: 'soz', bosh: urilish[0], qadam: sozlar.length > 1 ? (urilish.at(-1) - urilish[0]) / (sozlar.length - 1) : 0.3,
      olcham: 150, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 940, maxQator: 4 });
    kichikMatn(ctx, S, 1240, t, (urilish.at(-1) || 0.5) + 0.3, Y, { olcham: 52 });
  },
  ustki(ctx, t, d, S, Y) {
    if (S.emoji) L.emoji(ctx, S.emoji, W / 2, 1380, 170, { s: L.spring(t, 0.6), r: Math.sin(t * 2.4) * 0.12 });
  },
  qahramon: () => ({ x: W / 2, y: 1500, s: 1, hissiyot: 'hayajon', imo: 'hayajon', korinmas: true }),
  sfx: (S) => String(S.ekran || '').split(/\s+/).filter(Boolean).map((w, i) => ({ tur: 'pop', t: at(S, w, 0.15 + i * 0.3) })),
};

const oyna = {
  logoBor: true,
  // Ilova oynasi: qidiruvga matn yoziladi → natija chiqadi → kursor tugmani bosadi
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    const p = L.spring(t, 0.05, { k: 150, c: 15 });
    const ich = oynaKarta(ctx, 90, 380, 900, 760, S.sarlavha || 'KiOVO', p);
    if (p < 0.3) return;
    L.text(ctx, S.ekran, ich.x, ich.y + 40, { olcham: 52, ogirlik: 800, rang: '#16161a', align: 'left', maxEni: ich.w, avtoSig: true, min: 34, maxQator: 1 });
    if (S.kichik) L.text(ctx, S.kichik, ich.x, ich.y + 100, { olcham: 32, ogirlik: 600, rang: '#7a7a85', align: 'left', maxEni: ich.w, avtoSig: true, min: 24, maxQator: 1 });
    // Qidiruv maydoni
    const qy = ich.y + 160, yb = 0.5, yt = yozishTugashi(S.yozuv, yb);
    L.rect(ctx, ich.x, qy, ich.w, 92, { fill: '#fff', r: 18, stroke: t > yb ? '#3B6CF6' : '#D9DCE3', width: 4 });
    ctx.strokeStyle = '#555'; ctx.lineWidth = 5; L.circle(ctx, ich.x + 44, qy + 42, 15, null, '#555', 5);
    ctx.beginPath(); ctx.moveTo(ich.x + 55, qy + 53); ctx.lineTo(ich.x + 66, qy + 64); ctx.stroke();
    const yoz = L.belgiTozala(yozilgan(S.yozuv, t, yb));
    ctx.save(); ctx.font = L.font(40, 600); ctx.fillStyle = '#16161a'; ctx.textBaseline = 'middle';
    ctx.fillText(yoz, ich.x + 90, qy + 47);
    if (Math.floor(t * 2.4) % 2 === 0 || t < yt) { const cx = ich.x + 92 + ctx.measureText(yoz).width; ctx.fillRect(cx, qy + 26, 4, 44); }
    ctx.restore();
    // Natija qatori
    const np = L.prog(t, yt + 0.25, 0.45, 'outExpo');
    if (np <= 0) return;
    const ry = qy + 130 + (1 - np) * -30;
    ctx.save(); ctx.globalAlpha *= np;
    L.rect(ctx, ich.x, ry, ich.w, 150, { fill: '#fff', r: 22, stroke: '#ECECEF', width: 3 });
    L.rect(ctx, ich.x + 24, ry + 27, 96, 96, { fill: L.hexA(Y.mavzu.aksent, 0.35), r: 22 });
    L.emoji(ctx, S.emoji || '✨', ich.x + 72, ry + 77, 58);
    L.text(ctx, S.natija || S.ekran, ich.x + 145, ry + 58, { olcham: 40, ogirlik: 800, rang: '#16161a', align: 'left', maxEni: ich.w - 420, avtoSig: true, min: 26, maxQator: 1 });
    if (S.izohcha) L.text(ctx, S.izohcha, ich.x + 145, ry + 102, { olcham: 28, ogirlik: 600, rang: '#7a7a85', align: 'left', maxEni: ich.w - 420, avtoSig: true, min: 20, maxQator: 1 });
    // Tugma: kursor kelib bosadi → yashil «✓»
    const bosish = yt + 1.5, bosildi = t >= bosish;
    const tx = ich.x + ich.w - 150, ty = ry + 75;
    const bp = bosildi ? 1 - 0.08 * Math.max(0, 1 - (t - bosish) / 0.15) : 1;
    L.tf(ctx, { x: tx, y: ty, s: bp }, () => {
      L.rect(ctx, -120, -38, 240, 76, { fill: bosildi ? '#1FA463' : Y.mavzu.tugma, r: 38 });
      if (bosildi) {
        belgi(ctx, -78, 0, 14, 'ok', '#fff');
        L.text(ctx, String(S.tayyor || 'Tayyor').replace(/^[✓✔✅]\s*/, ''), 16, 2, { olcham: 30, ogirlik: 800, maxEni: 160, avtoSig: true, min: 18, maxQator: 1 });
      } else L.text(ctx, S.tugma || 'Ochish', 0, 2, { olcham: 32, ogirlik: 800, maxEni: 220, avtoSig: true, min: 20, maxQator: 1 });
    });
    if (bosildi && t - bosish < 0.6) { ctx.strokeStyle = L.hexA('#1FA463', 1 - (t - bosish) / 0.6); ctx.lineWidth = 6; L.circle(ctx, tx, ty, 40 + (t - bosish) * 160, null, ctx.strokeStyle, 6); }
    ctx.restore();
    // Kursor yo'li: pastki o'ngdan tugma ustiga
    const kp = L.prog(t, yt + 0.6, 0.85, 'inOutCubic');
    if (kp > 0) kursor(ctx, L.lerp(980, tx + 20, kp), L.lerp(1320, ty + 10, kp), bosildi && t - bosish < 0.2 ? 1 : 0);
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: W / 2, y: 1530, s: 1, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'tepaga', qarash: 0.3 }),
  sfx: (S) => { const yt = yozishTugashi(S.yozuv, 0.5); return [{ tur: 'tick', t: 0.5 }, { tur: 'pop', t: yt + 0.3 }, { tur: 'tick', t: yt + 1.5 }, { tur: 'ding', t: yt + 1.55 }]; },
};

const chat = {
  logoBor: true,
  // Suhbat: mijoz yozadi, AI «yozmoqda…» deb turib javob beradi
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    const xab = (S.xabarlar || []).slice(0, 4);
    const p = L.spring(t, 0.05, { k: 150, c: 15 });
    const x = 80, y = 360, w = 920, h = 980;
    ctx.save(); ctx.globalAlpha *= L.clamp(p * 2);
    L.rect(ctx, x, y, w, h, { fill: '#F4F1F2', r: 44, soya: 'rgba(0,0,0,.45)', blur: 60 });
    L.rect(ctx, x, y, w, 120, { fill: '#ffffff', r: 44 });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 70, w, 50);
    L.circle(ctx, x + 75, y + 60, 36, Y.mavzu.tugma);
    if (Y.rasm.logo) ctx.drawImage(Y.rasm.logo, x + 47, y + 45, 56, 56 * Y.rasm.logo.height / Y.rasm.logo.width);
    L.text(ctx, S.sarlavha || 'KiOVO maslahatchi', x + 130, y + 45, { olcham: 36, ogirlik: 800, rang: '#16161a', align: 'left', maxEni: w - 200 });
    L.text(ctx, 'online', x + 130, y + 85, { olcham: 26, ogirlik: 600, rang: '#1FA463', align: 'left' });
    ctx.restore();
    // Xabarlar ketma-ket: har biri o'z vaqtida
    const bosh = 0.5, qadam = Math.max(1.0, (d - 1.4) / Math.max(1, xab.length));
    let cy = y + 170;
    xab.forEach((m, i) => {
      const t0 = bosh + i * qadam, ai = m.kim !== 'mijoz';
      const yozmoqda = ai ? 0.7 : 0;
      if (t < t0) return;
      ctx.save();
      ctx.font = L.font(38, 700);
      const qator = L.wrap(ctx, L.belgiTozala(m.matn), 600).slice(0, 4);
      const bw = Math.max(...qator.map((q) => ctx.measureText(q).width)) + 60, bh = qator.length * 48 + 40;
      const bx = ai ? x + 40 : x + w - 40 - bw;
      const ep = L.spring(t, t0, { k: 260, c: 16 });
      if (ai && t < t0 + yozmoqda) {
        // «yozmoqda…» uch nuqta
        L.rect(ctx, bx, cy, 150, 76, { fill: '#ffffff', r: 34 });
        [0, 1, 2].forEach((k) => L.circle(ctx, bx + 45 + k * 30, cy + 38 + Math.sin(t * 10 - k) * 5, 9, '#9aa0a8'));
        ctx.restore(); cy += 96; return;
      }
      ctx.translate(bx + (ai ? 0 : bw), cy); ctx.scale(ep, ep); ctx.translate(-(bx + (ai ? 0 : bw)), -cy);
      L.rect(ctx, bx, cy, bw, bh, { fill: ai ? '#ffffff' : Y.mavzu.tugma, r: 30 });
      const korin = L.belgiTozala(ai ? yozilgan(m.matn, t, t0 + yozmoqda, 40) : m.matn);
      ctx.font = L.font(38, 700); ctx.fillStyle = ai ? '#16161a' : '#ffffff'; ctx.textBaseline = 'middle';
      L.wrap(ctx, korin, 600).slice(0, 4).forEach((q, k) => ctx.fillText(q, bx + 30, cy + 44 + k * 48));
      ctx.restore();
      cy += bh + 26;
    });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 190, y: 1560, s: 0.78, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'korsat', yon: 1, qarash: 0.8 }),
  sfx: (S, Y, d = 6) => (S.xabarlar || []).slice(0, 4).map((m, i) => ({ tur: 'pop', t: 0.5 + i * Math.max(1.0, (d - 1.4) / Math.max(1, (S.xabarlar || []).length)) + (m.kim !== 'mijoz' ? 0.7 : 0) })),
};

const skaner = {
  logoBor: true,
  // Yuz skaneri: kamera ramkasida yuz, skan chizig'i, nuqtalar, keyin ko'rsatkichlar
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y, 'sovuq');
    const fx = 190, fy = 330, fw = 700, fh = 860;
    const p = L.spring(t, 0.05, { k: 140, c: 15 });
    ctx.save(); ctx.globalAlpha *= L.clamp(p * 2);
    L.rect(ctx, fx, fy, fw, fh, { fill: '#10131c', r: 60, soya: 'rgba(0,0,0,.5)', blur: 50 });
    ctx.save(); L.roundRect(ctx, fx, fy, fw, fh, 60); ctx.clip();
    L.radialBg(ctx, W, H, ['#2b3550', '#10131c'], fx + fw / 2, fy + fh * 0.45, fw);
    const R = 230, hx = fx + fw / 2, hy = fy + 410;
    qahramonChiz(ctx, { tur: Y.qTur || 'nigina', x: hx, y: hy, s: R / 100, t, hissiyot: t > 2.4 ? 'xursand' : 'oddiy', imo: 'tinch', dog: 1, qarash: 0 });
    // skan chizig'i
    const sp = L.prog(t, 0.5, 1.8, 'inOutSine');
    if (sp > 0 && sp < 1) {
      const sy = fy + 60 + (fh - 120) * (sp < 0.5 ? sp * 2 : 2 - sp * 2);
      const g = ctx.createLinearGradient(0, sy - 80, 0, sy + 10);
      g.addColorStop(0, L.hexA(Y.mavzu.aksent, 0)); g.addColorStop(1, L.hexA(Y.mavzu.aksent, 0.55));
      ctx.fillStyle = g; ctx.fillRect(fx, sy - 80, fw, 90);
      ctx.fillStyle = Y.mavzu.aksent; ctx.fillRect(fx, sy, fw, 5);
    }
    // nuqtalar (yuz belgilari)
    const nuqtalar = [[-0.38, 0.06], [0.38, 0.06], [0, 0.32], [-0.25, 0.6], [0.25, 0.6], [0, -0.6], [-0.75, 0.2], [0.75, 0.2]];
    nuqtalar.forEach(([nx, ny], i) => {
      const np = L.prog(t, 0.7 + i * 0.12, 0.3);
      if (np > 0) L.circle(ctx, hx + nx * R, hy + ny * R, 7 + Math.sin(t * 6 + i) * 2, L.hexA(Y.mavzu.aksent, np));
    });
    // topilgan muammo joylari — qizil halqalar
    if (t > 2.3) [[-0.55, 0.22], [0.5, 0.3], [0.12, -0.55]].forEach(([nx, ny], i) => {
      const rp = L.spring(t, 2.3 + i * 0.15, { k: 220, c: 12 });
      ctx.strokeStyle = '#FF4D5E'; ctx.lineWidth = 6; L.circle(ctx, hx + nx * R, hy + ny * R, 34 * rp, null, '#FF4D5E', 6);
    });
    ctx.restore();
    // burchak qavslari
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const [cx, cy, dx, dy] of [[fx + 40, fy + 40, 1, 1], [fx + fw - 40, fy + 40, -1, 1], [fx + 40, fy + fh - 40, 1, -1], [fx + fw - 40, fy + fh - 40, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy + dy * 70); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * 70, cy); ctx.stroke();
    }
    L.text(ctx, t < 2.3 ? 'Skanerlanmoqda…' : 'Tahlil tayyor ✅', W / 2, fy + fh - 80, { olcham: 36, ogirlik: 800, fon: 'rgba(0,0,0,.55)' });
    ctx.restore();
    // Ko'rsatkichlar (misol)
    const k = (S.punktlar || []).slice(0, 3);
    const r = L.rand(String(S.ekran || '').length + 3);
    k.forEach((q, i) => {
      const bosh = 2.5 + i * 0.25, kp = L.prog(t, bosh, 0.5, 'outExpo');
      if (kp <= 0) return;
      const y = 1240 + i * 72, qiymat = Math.round(45 + r() * 45);
      ctx.save(); ctx.globalAlpha *= kp;
      L.text(ctx, `${q.emoji || ''} ${q.matn}`.trim(), 140, y, { olcham: 36, ogirlik: 800, align: 'left', maxEni: 360, avtoSig: true, min: 24, maxQator: 1 });
      L.rect(ctx, 520, y - 14, 420, 28, { fill: 'rgba(255,255,255,.16)', r: 14 });
      L.rect(ctx, 520, y - 14, 420 * (qiymat / 100) * L.prog(t, bosh + 0.1, 0.8), 28, { fill: Y.mavzu.aksent, r: 14 });
      ctx.restore();
    });
    if (k.length && t > 2.5) L.text(ctx, 'namuna', 940, 1205, { olcham: 22, ogirlik: 600, rang: 'rgba(255,255,255,.5)', align: 'right' });
  },
  ustki() {},
  qahramon: () => ({ x: W / 2, y: 1500, s: 1, hissiyot: 'xursand', imo: 'tinch', korinmas: true }),
  sfx: () => [{ tur: 'whoosh', t: 0.5 }, { tur: 'tick', t: 0.8 }, { tur: 'ding', t: 2.3 }, { tur: 'shimmer', t: 2.5 }],
};

const ilova = {
  // Telefon ekranida ilovaning HAQIQIY skrinshoti; barmoq bosgan joyda to'lqin
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.title(ctx, S.ekran, W / 2, 300, t, { uslub: 'maska', bosh: 0.05, olcham: 80, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const rasm = Y.rasm.ekranlar?.[S.ekran_turi] || Y.rasm.ekranlar?.skaner || null;
    const p = L.spring(t, 0.15, { k: 120, c: 14 });
    const w = 480, h = 1000, x = Y.q ? 230 : W / 2 - w / 2, y = 420 + (1 - p) * 700;
    const aylan = (1 - L.prog(t, 0.15, 0.9, 'outCubic')) * 0.9;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(Math.cos(aylan), 1); ctx.rotate(-0.04 + Math.sin(t * 1.2) * 0.012); ctx.translate(-(x + w / 2), -(y + h / 2));
    // Videoda mahsulot bor va «mahsulot» ekrani — begona skrinshot emas, AYNAN shu mahsulot sahifasi
    const mahsulotEkrani = Y.rasm.mahsulot && (S.ekran_turi === 'mahsulot' || !rasm);
    L.phone(ctx, x, y, w, h, (ix, iy, iw, ih) => {
      if (mahsulotEkrani) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(ix, iy, iw, ih);
        L.image(ctx, Y.rasm.mahsulot, ix + 20, iy + 70, iw - 40, ih * 0.5, { fit: 'contain', r: 24 });
        const m = Y.mahsulot;
        if (m.brend) L.text(ctx, String(m.brend).toUpperCase(), ix + 30, iy + ih * 0.5 + 110, { olcham: 22, ogirlik: 800, rang: '#9a8a8d', align: 'left' });
        L.text(ctx, m.nom || '', ix + 30, iy + ih * 0.5 + 160, { olcham: 30, ogirlik: 800, rang: '#16161a', align: 'left', maxEni: iw - 60, avtoSig: true, min: 20, maxQator: 2 });
        if (m.narxSon) L.text(ctx, `${String(m.narxSon).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`, ix + 30, iy + ih * 0.5 + 240, { olcham: 36, ogirlik: 900, rang: Y.mavzu.tugma, align: 'left' });
        L.rect(ctx, ix + 30, iy + ih - 130, iw - 60, 84, { fill: Y.mavzu.tugma, r: 42 });
        L.text(ctx, 'Savatga', ix + iw / 2, iy + ih - 88, { olcham: 32, ogirlik: 800 });
      } else if (rasm) {
        const pan = L.prog(t, 0.9, Math.max(1, d - 1.6), 'inOutSine');
        L.image(ctx, rasm, ix, iy, iw, ih, { fit: 'cover', zoom: 1.12, panY: -1 + pan * 2 });
      } else {
        L.linearBg(ctx, iw, ih, [Y.mavzu.fon[0], Y.mavzu.asos], 90);
      }
      // bosish to'lqini
      const tb = 1.6;
      if (t > tb && t < tb + 0.8) {
        const q = (t - tb) / 0.8;
        L.circle(ctx, ix + iw * 0.5, iy + ih * 0.62, 24 + q * 90, L.hexA('#ffffff', 0.45 * (1 - q)));
        L.circle(ctx, ix + iw * 0.5, iy + ih * 0.62, 22, L.hexA('#ffffff', 0.8 * (1 - q)));
      }
    });
    L.lightSweep(ctx, x, y, w, h, t, { bosh: 0.9, dur: 1, r: w * 0.14 });
    ctx.restore();
    kichikMatn(ctx, S, 1490, t, 0.9, Y, { olcham: 42, x: Y.q ? 470 : W / 2, maxEni: Y.q ? 600 : 860 });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 875, y: 1240, s: 0.8, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'korsat', yon: -1, qarash: -0.8 }),
  sfx: () => [{ tur: 'whoosh', t: 0.15 }, { tur: 'tick', t: 1.6 }],
};

const royxat = {
  logoBor: true,
  // Bajarilayotgan ishlar ro'yxati: aylanuvchi halqa → yashil ✓
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    const k = (S.punktlar || []).slice(0, 5);
    const p = L.spring(t, 0.05, { k: 150, c: 15 });
    const qh = 112, h = 150 + k.length * qh;
    const ich = oynaKarta(ctx, 100, 380, 880, h, S.sarlavha || S.ekran, p);
    if (p < 0.3) return;
    k.forEach((q, i) => {
      const t0 = at(S, q.matn?.split(' ')[0], 0.4 + i * Math.max(0.45, (d - 1.5) / Math.max(1, k.length)));
      const ep = L.prog(t, t0 - 0.35, 0.35, 'outExpo');
      if (ep <= 0) return;
      const y = ich.y + 20 + i * qh;
      ctx.save(); ctx.globalAlpha *= ep; ctx.translate((1 - ep) * 40, 0);
      holatBelgisi(ctx, ich.x + 26, y + 26, t, t0 + 0.25);
      L.text(ctx, `${q.emoji ? q.emoji + ' ' : ''}${q.matn}`, ich.x + 80, y + 28, { olcham: 42, ogirlik: t >= t0 + 0.25 ? 700 : 600,
        rang: t >= t0 + 0.25 ? '#16161a' : '#8a8a95', align: 'left', maxEni: ich.w - 90, avtoSig: true, min: 28, maxQator: 1 });
      ctx.restore();
    });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: W / 2, y: 1540, s: 0.95, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'tepaga', qarash: 0 }),
  sfx: (S, Y, d = 5) => (S.punktlar || []).slice(0, 5).map((q, i) => ({ tur: 'tick', t: at(S, q.matn?.split(' ')[0], 0.4 + i * Math.max(0.45, (d - 1.5) / Math.max(1, (S.punktlar || []).length))) + 0.25 })),
};

const taqqos = {
  // ❌ Noto'g'ri / ✅ To'g'ri — ikki ustun, navbat bilan
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.title(ctx, S.ekran || 'Qaysi biri to‘g‘ri?', W / 2, 360, t, { uslub: 'maska', bosh: 0.05, olcham: 84, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const yomon = (S.yomon || []).slice(0, 3), yaxshi = (S.yaxshi || []).slice(0, 3);
    const n = Math.max(yomon.length, yaxshi.length, 1), qadam = Math.max(0.45, (d - 1.6) / (n * 2));
    const ustun = (x, sarlavha, rang, tur, royxat, ofset) => {
      const p = L.spring(t, 0.2 + ofset * 0.15, { k: 160, c: 15 });
      ctx.save(); ctx.globalAlpha *= L.clamp(p * 2); ctx.translate(0, (1 - p) * 120);
      L.rect(ctx, x, 520, 440, 760, { fill: 'rgba(255,255,255,0.95)', r: 40, soya: 'rgba(0,0,0,.35)', blur: 40 });
      L.rect(ctx, x, 520, 440, 110, { fill: rang, r: 40 });
      ctx.fillStyle = rang; ctx.fillRect(x, 590, 440, 40);
      belgi(ctx, x + 95, 575, 18, tur, '#fff');
      L.text(ctx, sarlavha, x + 245, 575, { olcham: 42, ogirlik: 900 });
      royxat.forEach((m, i) => {
        const ep = L.prog(t, 0.6 + (i * 2 + ofset) * qadam, 0.4, 'outBack');
        if (ep <= 0) return;
        L.tf(ctx, { x: x + 220, y: 720 + i * 190, s: ep }, () => {
          L.text(ctx, m, 0, 0, { olcham: 40, ogirlik: 800, rang: '#1d1514', maxEni: 380, avtoSig: true, min: 26, maxQator: 3 });
        });
      });
      ctx.restore();
    };
    ustun(80, 'Noto‘g‘ri', '#E5484D', 'yoq', yomon, 0);
    ustun(560, 'To‘g‘ri', '#1FA463', 'ok', yaxshi, 1);
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: W / 2, y: 1590, s: 0.78, hissiyot: S.hissiyot || 'oylash', imo: S.imo || 'oylash', qarash: 0 }),
  sfx: (S, Y, d = 6) => { const n = Math.max((S.yomon || []).length, (S.yaxshi || []).length, 1); const q = Math.max(0.45, (d - 1.6) / (n * 2)); return Array.from({ length: n * 2 }, (_, i) => ({ tur: 'pop', t: 0.6 + i * q })); },
};

const bosqich = {
  // 1 → 2 → 3: chiziq bo'ylab bosqichlar (qanday buyurtma, kechki parvarish…)
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y);
    L.title(ctx, S.ekran, W / 2, 360, t, { uslub: 'maska', bosh: 0.05, olcham: 84, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const k = (S.punktlar || []).slice(0, 4);
    const y0 = 560, oraliq = 210, x0 = 170;
    const vaqt = k.map((q, i) => at(S, q.matn?.split(' ')[0], 0.5 + i * Math.max(0.6, (d - 1.6) / Math.max(1, k.length))));
    const lp = k.length > 1 ? L.clamp((t - vaqt[0]) / Math.max(0.5, vaqt.at(-1) - vaqt[0])) : 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + oraliq * (k.length - 1)); ctx.stroke();
    ctx.strokeStyle = Y.mavzu.aksent; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + oraliq * (k.length - 1) * lp); ctx.stroke();
    k.forEach((q, i) => {
      const p = L.spring(t, vaqt[i], { k: 220, c: 13 });
      if (p <= 0.001) return;
      const y = y0 + i * oraliq;
      L.tf(ctx, { x: x0, y, s: p }, () => {
        L.circle(ctx, 0, 0, 58, Y.mavzu.tugma);
        L.text(ctx, String(i + 1), 0, 3, { olcham: 56, ogirlik: 900 });
      });
      ctx.save(); ctx.globalAlpha *= L.clamp(p); ctx.translate((1 - L.clamp(p)) * 80, 0);
      L.rect(ctx, x0 + 90, y - 70, 760, 140, { fill: 'rgba(255,255,255,0.95)', r: 36, soya: 'rgba(0,0,0,.3)', blur: 30 });
      if (q.emoji) L.emoji(ctx, q.emoji, x0 + 160, y + 2, 64);
      L.text(ctx, q.matn, x0 + (q.emoji ? 220 : 130), y, { olcham: 44, ogirlik: 800, rang: '#1d1514', align: 'left', maxEni: q.emoji ? 600 : 690, avtoSig: true, min: 28, maxQator: 2 });
      ctx.restore();
    });
  },
  ustki() {},
  qahramon: (t, d, S) => ({ x: 880, y: 1560, s: 0.75, hissiyot: S.hissiyot || 'xursand', imo: S.imo || 'korsat', yon: -1, qarash: -0.8 }),
  sfx: (S, Y, d = 6) => (S.punktlar || []).slice(0, 4).map((q, i) => ({ tur: 'pop', t: at(S, q.matn?.split(' ')[0], 0.5 + i * Math.max(0.6, (d - 1.6) / Math.max(1, (S.punktlar || []).length))) })),
};

const aksiya = {
  // Chegirmadagi mahsulotlar (bazadan) — 2×2 kartochkalar navbat bilan
  chiz(ctx, t, d, S, Y) {
    fon(ctx, t, Y, 'mahsulot');
    L.rays(ctx, W / 2, 900, t, { rang: Y.mavzu.aksent2, alpha: 0.07, soni: 20 });
    L.title(ctx, S.ekran || 'Bugungi chegirmalar', W / 2, 340, t, { uslub: 'zarba', bosh: 0.05, olcham: 96, urgu: S.urgu, aksent: Y.mavzu.aksent, maxEni: 900, maxQator: 2 });
    const m = (Y.aksiya || []).slice(0, 4);
    const en = 430, bo = 470;
    m.forEach((a, i) => {
      const cx = m.length === 1 ? W / 2 : 300 + (i % 2) * 480, cy = 720 + Math.floor(i / 2) * 510 + (m.length <= 2 ? 200 : 0);
      const p = L.spring(t, 0.5 + i * 0.35, { k: 170, c: 13 });
      if (p <= 0.001) return;
      ctx.save(); ctx.translate(cx, cy + egri(t + i, 1.3, 6)); ctx.scale(p, p); ctx.rotate((1 - L.clamp(p)) * 0.2);
      L.rect(ctx, -en / 2, -bo / 2, en, bo, { fill: '#ffffff', r: 36, soya: 'rgba(0,0,0,.4)', blur: 40 });
      L.image(ctx, a.rasm, -en / 2 + 20, -bo / 2 + 20, en - 40, 270, { fit: 'contain', r: 24 });
      L.text(ctx, a.nom, 0, 100, { olcham: 30, ogirlik: 800, rang: '#1d1514', maxEni: en - 40, avtoSig: true, min: 22, maxQator: 2 });
      if (a.eskiNarx) {
        const b = L.text(ctx, a.eskiNarx, 0, 162, { olcham: 26, ogirlik: 600, rang: '#9a8a8d' });
        ctx.strokeStyle = '#E5484D'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x - 4, 164); ctx.lineTo(b.x + b.w + 4, 158); ctx.stroke();
      }
      L.text(ctx, a.narx, 0, 202, { olcham: 40, ogirlik: 900, rang: Y.mavzu.tugma });
      if (a.chegirma) L.tf(ctx, { x: en / 2 - 30, y: -bo / 2 + 30, s: L.spring(t, 0.8 + i * 0.35, { k: 260, c: 11 }), r: -0.25 }, () => {
        L.star(ctx, 0, 0, 70, 58, 14, Y.mavzu.tugma);
        L.text(ctx, a.chegirma, 0, 3, { olcham: 36, ogirlik: 900 });
      });
      ctx.restore();
    });
  },
  ustki() {},
  qahramon: () => ({ x: W / 2, y: 1500, s: 1, hissiyot: 'hayajon', imo: 'hayajon', korinmas: true }),
  sfx: (S, Y) => (Y.aksiya || []).slice(0, 4).map((a, i) => ({ tur: 'pop', t: 0.5 + i * 0.35 })).concat([{ tur: 'ding', t: 0.9 }]),
};

export const SAHNALAR = { hook, muammo, kashfiyot, foyda, natija, sharh, narx: narxSahna, cta, hikoya,
  matn, oyna, chat, skaner, ilova, royxat, taqqos, bosqich, aksiya };
export const SAHNA_TURLARI = Object.keys(SAHNALAR);
