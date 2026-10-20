// KINO MOTORI — loyiha (sahnalar + ovoz + rasm) → kadrma-kadr animatsiya → MP4.
//
// Tartib:
//   1) Ovoz sahnalarga bo'linadi (jimliklar bo'yicha) va har bo'lak o'z
//      sahnasiga qo'yiladi — sahna animatsiyasi uchun vaqt yetmasa, ovoz
//      orasiga jimlik qo'shiladi (ovoz hech qachon kesilmaydi);
//   2) har kadr: sahna(lar) → qahramon → ustki qatlam → subtitr → logo;
//      sahnalar orasida o'tish (zoom / surish / doira / yuqori / chaqnash);
//   3) musiqa + effektlar + ovoz bitta WAV ga aralashtiriladi;
//   4) kadrlar xom RGBA holida ffmpeg'ga oqiziladi (diskka PNG yozilmaydi).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { kanvas } from './kanvas.js';
import * as L from './L.js';
import { qahramonChiz } from './qahramon.js';
import { SAHNALAR, MAVZULAR } from './sahnalar.js';
import { sahnalargaBol, sozVaqtlari, labZarfi } from './ovoz-vaqt.js';
import { aralashtir } from './musiqa.js';
import { ffmpegOqim } from '../ffmpeg.js';

export const W = 1080, H = 1920;
const OTISH = 0.45;
const OTISHLAR = ['zoom', 'surish', 'doira', 'yuqori', 'chaqnash'];
// Animatsiya ulgurishi uchun eng qisqa sahna (soniya)
const MIN_D = { hook: 2.4, muammo: 2.6, kashfiyot: 3.0, foyda: 3.6, natija: 2.8, sharh: 3.4, narx: 3.2, cta: 3.4, hikoya: 2.4,
  matn: 2.4, oyna: 4.2, chat: 5.0, skaner: 4.2, ilova: 3.6, royxat: 3.6, taqqos: 4.4, bosqich: 4.0, aksiya: 3.6, kadr: 3.0, uchD: 3.6 };
// Oynada matn yozilib, kursor bosishiga ulgurish kerak — yozuv uzun bo'lsa sahna cho'ziladi
const qoshimchaVaqt = (S) => (S.tur === 'oyna' ? String(S.yozuv || '').length / 16 : 0)
  + (S.tur === 'chat' ? Math.max(0, (S.xabarlar || []).length - 3) * 1.2 : 0);
const SIFAT = { toliq: { en: 1080, fps: 30 }, orta: { en: 720, fps: 30 }, sinov: { en: 270, fps: 10 } };

/**
 * Vaqt jadvali: har sahnaning boshlanishi, davomiyligi, ovoz bo'lagi va so'zlari.
 * @param {object[]} sahnalar  [{tur, ovoz, ...}]
 * @param {{s:Float32Array, hz:number}|null} ovoz
 */
export function vaqtJadvali(sahnalar, ovoz) {
  const n = sahnalar.length;
  const bolak = ovoz?.s?.length ? sahnalargaBol(ovoz.s, ovoz.hz, sahnalar.map((s) => s.ovoz || s.ekran || '')) : null;
  const jadval = [];
  let bosh = 0;
  for (let i = 0; i < n; i++) {
    const S = sahnalar[i];
    const kech = i === 0 ? 0.35 : OTISH * 0.7;            // ovoz o'tish tugay deganda boshlanadi
    let uz, sozlar;
    if (bolak) {
      const b = bolak[i];
      uz = b.oxir - b.bosh;
      sozlar = sozVaqtlari(S.ovoz, ovoz.s, ovoz.hz, b.bosh, b.oxir).map((w) => ({ ...w, s: w.s - b.bosh, e: w.e - b.bosh }));
    } else {
      const sz = String(S.ovoz || S.ekran || '').split(/\s+/).filter(Boolean);
      uz = Math.max(1.2, sz.length * 0.36);
      let y = 0;
      sozlar = sz.map((w) => { const s0 = (y / sz.length) * uz; y++; return { w, s: s0, e: (y / sz.length) * uz }; });
    }
    const quyruq = i === n - 1 ? 1.8 : 0.3;
    const d = Math.max((MIN_D[S.tur] || 2.4) + qoshimchaVaqt(S), kech + uz + quyruq + (i === n - 1 ? 0 : OTISH));
    jadval.push({
      i, bosh, d, ovozBosh: bosh + kech, ovozUz: uz, bolak: bolak?.[i] || null,
      sozlar: sozlar.map((w) => ({ w: w.w, s: +(kech + w.s).toFixed(3), e: +(kech + w.e).toFixed(3) })),
    });
    bosh += d - OTISH;
  }
  const jami = jadval.length ? jadval[n - 1].bosh + jadval[n - 1].d : 0;
  return { jadval, jami: +jami.toFixed(3) };
}

/** Ovoz bo'laklarini yangi vaqtlariga qo'yib, bitta ovoz izini yig'adi. */
function ovozIzi(ovoz, jadval, jami) {
  if (!ovoz?.s?.length) return null;
  const iz = new Float32Array(Math.ceil(jami * ovoz.hz));
  for (const j of jadval) {
    if (!j.bolak) continue;
    const a = Math.floor(j.bolak.bosh * ovoz.hz), b = Math.min(ovoz.s.length, Math.ceil(j.bolak.oxir * ovoz.hz));
    const o = Math.floor(j.ovozBosh * ovoz.hz);
    for (let k = a; k < b && o + k - a < iz.length; k++) iz[o + k - a] += ovoz.s[k];
  }
  return { s: iz, hz: ovoz.hz };
}

/** So'zlarni subtitr iboralariga guruhlaydi (3–4 so'z, tinish belgisida uziladi). */
export function iboralar(jadval) {
  const sozlar = jadval.flatMap((j) => j.sozlar.map((w) => ({ w: w.w, s: j.bosh + w.s, e: j.bosh + w.e, sahna: j.i })));
  const chiq = [];
  let joriy = [];
  const yop = () => { if (joriy.length) chiq.push({ sozlar: joriy, s: joriy[0].s, e: joriy[joriy.length - 1].e }); joriy = []; };
  for (const w of sozlar) {
    const old = joriy[joriy.length - 1];
    if (old && (joriy.length >= 4 || joriy.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length > 22
      || /[.!?,;:…—]$/.test(old.w) || w.s - old.e > 0.45 || w.sahna !== old.sahna)) yop();
    joriy.push(w);
  }
  yop();
  chiq.forEach((b, i) => { b.oxir = Math.min(chiq[i + 1] ? chiq[i + 1].s - 0.04 : Infinity, b.e + 0.55); });
  return chiq;
}

/**
 * Subtitr joyi — qahramonning boshini HECH QACHON yopmaydi.
 * Qahramon chetda bo'lsa, subtitr uning yonidagi bo'sh tomonga o'tadi;
 * markazda bo'lsa — ko'kragiga (bosh ostiga) tushadi.
 * @returns {{cx:number, y:number, en:number}}
 */
export function subtitrJoyi(h) {
  const asos = { cx: W / 2, y: 1548, en: 880 };
  if (!h) return asos;
  const R = 100 * (h.s ?? 1);
  const bosh = { x0: h.x - 1.3 * R, x1: h.x + 1.3 * R, y0: h.y - 1.45 * R, y1: h.y + 1.15 * R };
  const ust = (y, b = 70) => y + b > bosh.y0 && y - b < bosh.y1;
  if (!ust(asos.y) || bosh.x1 < W / 2 - asos.en / 2 || bosh.x0 > W / 2 + asos.en / 2) return asos;
  // Qahramon chap yoki o'ng chetda — bo'sh tomonga
  const ong = { x0: bosh.x1 + 24, x1: W - 70 }, chap = { x0: 50, x1: bosh.x0 - 24 };
  const z = (ong.x1 - ong.x0) >= (chap.x1 - chap.x0) ? ong : chap;
  if (z.x1 - z.x0 >= 460) return { cx: (z.x0 + z.x1) / 2, y: asos.y, en: z.x1 - z.x0 };
  // Markazda: bosh tepasida joy bo'lsa — tepasiga (yorliq kabi), bo'lmasa ko'kragiga
  if (bosh.y0 - 85 >= 1180) return { ...asos, y: bosh.y0 - 85 };
  return { ...asos, y: Math.min(1640, bosh.y1 + 85) };
}

/** So'zlarni kenglikka qarab 1–2 qatorga bo'ladi. */
function qatorla(ctx, sozlar, maxEni, bosh) {
  const qator = [[]];
  let en = 0;
  sozlar.forEach((w, i) => {
    const ww = ctx.measureText(w).width;
    if (qator.at(-1).length && en + bosh + ww > maxEni) { qator.push([]); en = 0; }
    en += (qator.at(-1).length ? bosh : 0) + ww;
    qator.at(-1).push(i);
  });
  return qator;
}

/**
 * So'zma-so'z subtitr. uslub:
 *   karaoke — katta oq harflar, qora chiziq, aytilayotgan so'z aksent rangida;
 *   chip    — qora quti ichida (qahramon tepasidagi yorliq kabi), so'z oqarib yonadi;
 *   oddiy   — yarim shaffof fon ustida tinch matn.
 */
function subtitr(ctx, T, ibora, Y, h, uslub = 'karaoke') {
  const b = ibora.find((x) => T >= x.s - 0.08 && T < x.oxir);
  if (!b) return;
  const joy = subtitrJoyi(h);
  const kirish = L.spring(T, b.s - 0.08, { k: 320, c: 20 });
  const sozlar = b.sozlar.map((w) => L.belgiTozala(uslub === 'oddiy' ? w.w : w.w.toUpperCase()));
  const og = uslub === 'oddiy' ? 800 : 900;
  let olcham = uslub === 'chip' ? 58 : 70;
  ctx.save();
  ctx.font = L.font(olcham, og);
  const oraliq = () => ctx.measureText(' ').width * (uslub === 'karaoke' ? 1.5 : 1.1);
  let q = qatorla(ctx, sozlar, joy.en, oraliq());
  while (q.length > 2 && olcham > 40) { olcham -= 4; ctx.font = L.font(olcham, og); q = qatorla(ctx, sozlar, joy.en, oraliq()); }
  const lh = olcham * (uslub === 'karaoke' ? 1.12 : 1.25);
  const enlar = q.map((qq) => qq.reduce((a, i) => a + ctx.measureText(sozlar[i]).width, 0) + oraliq() * (qq.length - 1));
  const y0 = joy.y - (lh * (q.length - 1)) / 2;
  ctx.translate(joy.cx, joy.y); ctx.scale(0.82 + 0.18 * kirish, 0.82 + 0.18 * kirish); ctx.translate(-joy.cx, -joy.y);
  ctx.globalAlpha = L.clamp(kirish * 1.5);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  if (uslub !== 'karaoke') {
    const max = Math.max(...enlar), pad = olcham * 0.55;
    L.rect(ctx, joy.cx - max / 2 - pad, y0 - lh / 2 - pad * 0.45, max + pad * 2, lh * q.length + pad * 0.9,
      { fill: uslub === 'chip' ? 'rgba(18,18,22,0.92)' : 'rgba(0,0,0,0.45)', r: olcham * 0.32, soya: 'rgba(0,0,0,.35)', blur: 24 });
  }
  // Faol so'z — aytilayotgan oxirgisi (bir vaqtda faqat bittasi)
  let faolI = -1;
  b.sozlar.forEach((w, i) => { if (T >= w.s - 0.03) faolI = i; });
  q.forEach((qq, qi) => {
    let x = joy.cx - enlar[qi] / 2;
    const y = y0 + qi * lh;
    for (const i of qq) {
      const s = sozlar[i], ww = ctx.measureText(s).width, w = b.sozlar[i];
      const faol = i === faolI, aytildi = T >= w.s;
      ctx.save();
      if (uslub === 'karaoke') {
        const pop = faol ? 1.05 + 0.1 * (1 - L.prog(T, w.s, 0.22, 'outBack')) : 1;
        ctx.translate(x + ww / 2, y); ctx.scale(pop, pop); ctx.translate(-(x + ww / 2), -y);
        ctx.globalAlpha *= aytildi ? 1 : 0.62;
        ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.lineWidth = olcham * 0.2; ctx.strokeText(s, x, y);
        ctx.fillStyle = faol ? Y.mavzu.aksent : '#ffffff';
      } else if (uslub === 'chip') {
        ctx.fillStyle = faol || !aytildi ? (faol ? '#ffffff' : 'rgba(255,255,255,0.42)') : 'rgba(255,255,255,0.78)';
      } else {
        ctx.globalAlpha *= aytildi ? 1 : 0.55;
        ctx.fillStyle = faol ? Y.mavzu.aksent : '#ffffff';
      }
      ctx.fillText(s, x, y);
      ctx.restore();
      x += ww + oraliq();
    }
  });
  ctx.restore();
}

function otish(ctx, tur, p, cA, cB) {
  const e = L.ease.inOutCubic(L.clamp(p));
  ctx.save();
  switch (tur) {
    case 'surish':
      ctx.drawImage(cA, -W * e, 0, W, H); ctx.drawImage(cB, W * (1 - e), 0, W, H); break;
    case 'doira': {
      ctx.drawImage(cA, 0, 0, W, H);
      ctx.beginPath(); ctx.arc(W / 2, H * 0.45, Math.hypot(W, H) * 0.62 * e, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(cB, 0, 0, W, H); break;
    }
    case 'yuqori':
      ctx.drawImage(cA, 0, -H * 0.25 * e, W, H);
      ctx.drawImage(cB, 0, H * (1 - e), W, H); break;
    case 'chaqnash':
      ctx.drawImage(p < 0.5 ? cA : cB, 0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,${(1 - Math.abs(p - 0.5) * 2).toFixed(3)})`; ctx.fillRect(0, 0, W, H); break;
    default: { // zoom
      const za = 1 + 0.35 * e, zb = 0.8 + 0.2 * e;
      ctx.drawImage(cA, W / 2 - (W * za) / 2, H / 2 - (H * za) / 2, W * za, H * za);
      ctx.globalAlpha = e;
      ctx.drawImage(cB, W / 2 - (W * zb) / 2, H / 2 - (H * zb) / 2, W * zb, H * zb);
    }
  }
  ctx.restore();
}

// Bitta sahnadagi kutilmagan ma'lumot butun videoni yiqitmasin — kadr qolgani chiziladi
const ogohlantirildi = new Set();
function xavfsiz(fn, tur) {
  try { fn(); } catch (e) {
    if (!ogohlantirildi.has(tur)) { ogohlantirildi.add(tur); console.warn(`KINO: «${tur}» sahnasida xato:`, e.message); }
  }
}

/** Rasmlarni kanvas tasviriga aylantiradi; mahsulotning xira fon nusxasini tayyorlaydi. */
async function rasmlarniTayyorla(m, rasmlar = {}) {
  const chiq = {};
  if (rasmlar.mahsulot) {
    try { chiq.mahsulot = await m.loadImage(Buffer.from(rasmlar.mahsulot)); } catch { /* rasm o'qilmadi — kartochka bo'sh */ }
  }
  if (rasmlar.logo) {
    try { chiq.logo = await m.loadImage(Buffer.from(rasmlar.logo)); } catch { /* logo bo'lmasa ham bo'ladi */ }
  }
  // Ilova skrinshotlari (skaner, do'kon, maslahat…) — «ilova» sahnasi uchun
  chiq.ekranlar = {};
  for (const [k, b] of Object.entries(rasmlar.ekranlar || {})) {
    try { chiq.ekranlar[k] = await m.loadImage(Buffer.from(b)); } catch { /* bu ekran bo'lmaydi */ }
  }
  // Hikoya sahnalari uchun AI chizgan rasmlar: { sahna indeksi: bayt }
  chiq.sahna = {};
  for (const [i, b] of Object.entries(rasmlar.sahna || {})) {
    try { chiq.sahna[i] = await m.loadImage(Buffer.from(b)); } catch { /* rasmsiz — oddiy fon */ }
  }
  // Aksiyadagi mahsulotlar (rasm + bazadagi narx)
  chiq.aksiya = [];
  for (const a of (rasmlar.aksiya || []).slice(0, 4)) {
    let rasm = null;
    try { rasm = a.rasm ? await m.loadImage(Buffer.from(a.rasm)) : null; } catch { /* rasmsiz kartochka */ }
    chiq.aksiya.push({ ...a, rasm });
  }
  if (chiq.mahsulot) {
    const c = m.createCanvas(270, 480), x = c.getContext('2d');
    x.filter = 'blur(14px)';
    L.image(x, chiq.mahsulot, -20, -20, 310, 520, { fit: 'cover' });
    chiq.xira = c;
  }
  return chiq;
}

/**
 * Kadrlarni chizuvchi: (ctx, T) → bitta kadr. Videoda ham, muqova rasmida ham ishlatiladi.
 */
export async function chizuvchi(loyiha, { en = 1080 } = {}) {
  const m = await kanvas();
  const k = en / W, boy = Math.round(H * k);
  const rasm = await rasmlarniTayyorla(m, loyiha.rasmlar);
  const mavzu = MAVZULAR[loyiha.mavzu] || MAVZULAR.brend;
  const Y = { W, H, mavzu, q: Boolean(loyiha.qahramon), qTur: loyiha.qahramon || 'nigina', rasm, mahsulot: loyiha.mahsulot || {},
    aksiya: rasm.aksiya || [], seed: loyiha.seed ?? 3 };
  const sahnalar = loyiha.sahnalar.map((S) => ({ ...S, tur: SAHNALAR[S.tur] ? S.tur : 'hikoya' }));
  const { jadval, jami } = loyiha.jadval ? loyiha.jadval : vaqtJadvali(sahnalar, null);
  sahnalar.forEach((S, i) => { S.sozlar = jadval[i].sozlar; S.d = jadval[i].d; });
  const ibora = loyiha.subtitr === false ? [] : iboralar(jadval);
  const cA = m.createCanvas(en, boy), cB = m.createCanvas(en, boy);
  const xA = cA.getContext('2d'), xB = cB.getContext('2d');
  const lab = loyiha.lab || null, fps = loyiha.fps || 30;

  const joy = (i, t) => {
    const S = sahnalar[i];
    Y.sahnaRasm = rasm.sahna[i] || null;
    return { dog: 0, yaltiroq: 0, yon: 1, s: 1, ...SAHNALAR[S.tur].qahramon(t, S.d, S, Y) };
  };
  const sahnaChiz = (x, i, t, ustki = true) => {
    const S = sahnalar[i], Z = SAHNALAR[S.tur];
    Y.sahnaRasm = rasm.sahna[i] || null;              // hikoyaga mos AI rasmi (bo'lsa — fon)
    x.save(); x.setTransform(k, 0, 0, k, 0, 0);
    // Kamera: sahna davomida sekin yaqinlashadi
    const z = 1 + 0.035 * L.clamp(t / S.d);
    x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-W / 2, -H / 2);
    xavfsiz(() => Z.chiz(x, t, S.d, S, Y), S.tur);
    x.restore();
    if (ustki) { x.save(); x.setTransform(k, 0, 0, k, 0, 0); xavfsiz(() => Z.ustki(x, t, S.d, S, Y), S.tur); x.restore(); }
  };

  /** Bitta kadr. */
  function kadr(ctx, T) {
    let i = 0;
    while (i + 1 < jadval.length && T >= jadval[i + 1].bosh) i++;
    const t = T - jadval[i].bosh;
    const otishda = i > 0 && t < OTISH;
    if (otishda) {
      sahnaChiz(xA, i - 1, T - jadval[i - 1].bosh);
      sahnaChiz(xB, i, t);
      ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
      otish(ctx, sahnalar[i].otish || OTISHLAR[(i - 1) % OTISHLAR.length], t / OTISH, cA, cB);
      ctx.restore();
    } else sahnaChiz(ctx, i, t, false);

    ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
    let hJoy = null;                       // subtitr qahramonni chetlab o'tishi uchun
    if (Y.q) {
      const b = joy(i, t);
      // korinmas — qahramon bu sahnada pastga tushib ketadi (to'liq ekranli sahnalar)
      if (b.korinmas) b.y += 1500;
      if (!b.korinmas) hJoy = b;
      let h = { ...b, oldingiImo: b.imo, imoP: 1 };
      if (i > 0 && t < 0.6) {
        const a = joy(i - 1, T - jadval[i - 1].bosh), p = L.ease.inOutCubic(t / 0.6);
        if (a.korinmas) a.y += 1500;
        h = { ...b, x: L.lerp(a.x, b.x, p), y: L.lerp(a.y, b.y, p), s: L.lerp(a.s, b.s, p),
          dog: L.lerp(a.dog, b.dog, p), yaltiroq: L.lerp(a.yaltiroq, b.yaltiroq, p),
          hissiyot: p < 0.4 ? a.hissiyot : b.hissiyot, oldingiImo: a.imo, imoP: L.clamp(t / 0.55) };
      }
      if (i === 0) h.y += (1 - L.spring(T, 0.1, { k: 110, c: 14 })) * 1300;
      const f = Math.min(lab ? lab.length - 1 : 0, Math.floor(T * fps));
      if (h.y < H + 400) qahramonChiz(ctx, { ...h, tur: loyiha.qahramon, t: T, lab: lab ? lab[f] : 0, mahsulot: rasm.mahsulot });
    }
    Y.sahnaRasm = rasm.sahna[i] || null;
    if (!otishda) xavfsiz(() => SAHNALAR[sahnalar[i].tur].ustki(ctx, t, sahnalar[i].d, sahnalar[i], Y), sahnalar[i].tur);
    subtitr(ctx, T, ibora, Y, hJoy, loyiha.subtitrUslub);
    // Kichik logo (oxirgi sahnada katta logo bor)
    // Kichik logo — faqat tepasi bo'sh sahnalarda (boshqalarida katta sarlavha bilan to'qnashadi)
    if (rasm.logo && SAHNALAR[sahnalar[i].tur].logoBor) {
      const lw = 124, lh = lw * (rasm.logo.height / rasm.logo.width);
      ctx.globalAlpha = 0.85; ctx.drawImage(rasm.logo, W / 2 - lw / 2, 168, lw, lh); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  return { kadr, jami, jadval, sahnalar, Y, en, boy, m };
}

/**
 * To'liq video. loyiha: { sahnalar, qahramon, mavzu, mahsulot, rasmlar, ovoz {s,hz}|null,
 *   musiqa, musiqaBaland, sfx, subtitr }.
 * @returns {Promise<{mp4: Buffer, soniya: number, jadval: object[]}>}
 */
export async function videoYasa(loyiha, { sifat = 'toliq', chiqish = null } = {}) {
  const q = SIFAT[sifat] || SIFAT.toliq;
  const sahnalar = loyiha.sahnalar;
  const { jadval, jami } = vaqtJadvali(sahnalar, loyiha.ovoz);
  const iz = ovozIzi(loyiha.ovoz, jadval, jami);
  const fps = q.fps, kadrlar = Math.ceil(jami * fps);
  const lab = iz ? labZarfi(iz.s, iz.hz, fps, kadrlar) : null;
  const ch = await chizuvchi({ ...loyiha, jadval: { jadval, jami }, lab, fps }, { en: q.en });

  const papka = await fs.mkdtemp(path.join(os.tmpdir(), 'kino-'));
  try {
    // ── Audio ──
    const sfx = [];
    if (loyiha.sfx !== false) {
      ch.sahnalar.forEach((S, i) => {
        if (i > 0) sfx.push({ tur: 'whoosh', t: jadval[i].bosh - 0.08 });
        for (const e of SAHNALAR[S.tur].sfx(S, ch.Y, S.d)) sfx.push({ tur: e.tur, t: jadval[i].bosh + e.t });
      });
    }
    const wav = aralashtir({ uzunlik: jami, musiqa: loyiha.musiqa || 'quvnoq', baland: loyiha.musiqaBaland ?? 0.35,
      ovoz: iz ? { ...iz, bosh: 0 } : null, sfx });
    const wavYol = path.join(papka, 'audio.wav');
    await fs.writeFile(wavYol, wav);

    // ── Video ──
    const chiq = chiqish || path.join(papka, 'kino.mp4');
    const oqim = ffmpegOqim(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ch.en}x${ch.boy}`, '-r', String(fps), '-i', 'pipe:0',
      '-i', wavYol, '-map', '0:v', '-map', '1:a', '-t', jami.toFixed(2),
      '-c:v', 'libx264', '-preset', sifat === 'sinov' ? 'ultrafast' : 'veryfast', '-crf', '22', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', chiq]);
    const c = ch.m.createCanvas(ch.en, ch.boy), ctx = c.getContext('2d');
    for (let f = 0; f < kadrlar; f++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ch.en, ch.boy);
      ch.kadr(ctx, f / fps);
      await oqim.yoz(c.data());
    }
    await oqim.tugat();
    return { mp4: await fs.readFile(chiq), soniya: jami, jadval };
  } finally {
    fs.rm(papka, { recursive: true, force: true }).catch(() => {});
  }
}

/** Bitta kadr PNG (muqova / admin ko'rish uchun). */
export async function kadrPng(loyiha, T, { en = 540 } = {}) {
  const { jadval, jami } = vaqtJadvali(loyiha.sahnalar, loyiha.ovoz);
  const ch = await chizuvchi({ ...loyiha, jadval: { jadval, jami } }, { en });
  const c = ch.m.createCanvas(ch.en, ch.boy), ctx = c.getContext('2d');
  ch.kadr(ctx, Math.min(T, jami - 0.05));
  return c.toBuffer('image/png');
}
