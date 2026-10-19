// MUSIQA VA TOVUSH EFFEKTLARI — JS sintezator, tayyor fayl kerak emas.
//
// Mualliflik huquqi muammosi yo'q: har video uchun musiqa noldan yasaladi.
// Kayfiyatlar: quvnoq | lofi | hissiy | energiya | yoq.
// Effektlar (SFX) sahna voqealariga bog'lanadi: o'tish → whoosh, sarlavha
// zarbasi → boom, so'z chiqishi → pop, mahsulot → shimmer, narx → ding.
// Ovoz eshitilganda musiqa avtomatik pasayadi (ducking).
import { rand } from './L.js';

export const MUSIQALAR = ['quvnoq', 'lofi', 'hissiy', 'energiya', 'yoq'];
const HZ = 48000;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// I–V–vi–IV (C) — har akkord bitta takt
const AKKORDLAR = [[60, 64, 67, 71], [55, 59, 62, 66], [57, 60, 64, 67], [53, 57, 60, 64]];
const BAS = [36, 43, 45, 41];

const KAYFIYAT = {
  quvnoq:   { bpm: 108, kick: [0, 2, 2.5], clap: [1, 3], hat: 0.5, arp: 0.25, bas: [0, 1.5, 2, 3.5], pad: 0.03, chol: 'pluck' },
  lofi:     { bpm: 82, kick: [0, 2.5], clap: [1, 3], hat: 0.5, swing: 0.08, akk: true, bas: [0, 2.5], pad: 0.02, chol: 'piano', shitir: true },
  hissiy:   { bpm: 72, kick: [0], clap: [], hat: 0, arp: 0.5, bas: [0], pad: 0.05, chol: 'piano', baraban: 4 },
  energiya: { bpm: 124, kick: [0, 1, 2, 3], clap: [1, 3], hat: 0.5, hatOff: true, arp: 0.25, bas: [0.5, 1.5, 2.5, 3.5], pad: 0.025, chol: 'pluck' },
};

/** Bitta nota: garmonikalar yig'indisi, eksponensial so'nish. */
function nota(L, R, f, t0, dur, { vol = 0.1, garm = [1], sonish = 3, hujum = 0.005, pan = 0 } = {}) {
  const a = Math.floor(t0 * HZ), n = Math.floor(dur * HZ);
  const gl = vol * (1 - Math.max(0, pan)), gr = vol * (1 + Math.min(0, pan));
  for (let i = 0; i < n && a + i < L.length; i++) {
    if (a + i < 0) continue;
    const t = i / HZ;
    const env = Math.min(1, t / hujum) * Math.exp(-t * sonish) * (i > n - 480 ? (n - i) / 480 : 1);
    let v = 0;
    for (let k = 0; k < garm.length; k++) v += garm[k] * Math.sin(2 * Math.PI * f * (k + 1) * t);
    v *= env;
    L[a + i] += v * gl; R[a + i] += v * gr;
  }
}

function kick(L, R, t0, vol = 0.55) {
  const a = Math.floor(t0 * HZ), n = Math.floor(0.38 * HZ);
  let faza = 0;
  for (let i = 0; i < n && a + i < L.length; i++) {
    const t = i / HZ, f = 45 + 85 * Math.exp(-t * 28);
    faza += (2 * Math.PI * f) / HZ;
    const v = Math.sin(faza) * Math.exp(-t * 9) * vol;
    L[a + i] += v; R[a + i] += v;
  }
}

function shovqin(L, R, t0, dur, { vol = 0.2, sonish = 30, yuqori = true, seed = 1, pan = 0 } = {}) {
  const r = rand(seed + Math.floor(t0 * 1000));
  const a = Math.floor(t0 * HZ), n = Math.floor(dur * HZ);
  let old = 0;
  for (let i = 0; i < n && a + i < L.length; i++) {
    const x = r() * 2 - 1;
    const v = (yuqori ? x - old : x) * Math.exp(-(i / HZ) * sonish) * vol;
    old = x;
    L[a + i] += v * (1 - Math.max(0, pan)); R[a + i] += v * (1 + Math.min(0, pan));
  }
}

const CHOLGU = {
  pluck: { garm: [1, 0.5, 0.18], sonish: 7, vol: 0.075 },
  piano: { garm: [1, 0.45, 0.22, 0.1], sonish: 2.2, vol: 0.06 },
};

/** Musiqa: L/R kanallarga yoziladi. */
function musiqaYoz(L, R, uzunlik, tur) {
  const k = KAYFIYAT[tur];
  if (!k) return;
  const beat = 60 / k.bpm, takt = beat * 4;
  const taktlar = Math.ceil(uzunlik / takt) + 1;
  const ch = CHOLGU[k.chol];
  for (let b = 0; b < taktlar; b++) {
    const t0 = b * takt, akk = AKKORDLAR[b % 4];
    // pad — uzun, yumshoq
    for (const n of akk.slice(0, 3)) nota(L, R, midi(n), t0, takt + 0.3, { vol: k.pad, garm: [1, 0.3, 0.12], sonish: 0.4, hujum: 0.35, pan: (n % 3 - 1) * 0.3 });
    // bas
    for (const q of k.bas) nota(L, R, midi(BAS[b % 4]), t0 + q * beat, beat * 0.9, { vol: 0.2, garm: [1, 0.35], sonish: 3.5 });
    // akkord (lofi) yoki arpedjio
    if (k.akk) {
      for (const [q, n] of akk.entries()) nota(L, R, midi(n), t0 + q * 0.018, takt, { ...ch, vol: ch.vol * 0.8 });
      for (const n of akk.slice(1, 3)) nota(L, R, midi(n + 12), t0 + 2.5 * beat, beat * 1.5, { ...ch, vol: ch.vol * 0.55 });
    } else if (k.arp) {
      const qadam = k.arp * beat, soni = Math.round(takt / qadam);
      for (let i = 0; i < soni; i++) {
        const n = akk[[0, 1, 2, 3, 2, 1][i % 6]] + 12;
        nota(L, R, midi(n), t0 + i * qadam, qadam * 2.5, { ...ch, pan: i % 2 ? 0.25 : -0.25 });
      }
    }
    // baraban
    if (b >= (k.baraban || 0)) {
      for (const q of k.kick) kick(L, R, t0 + q * beat, tur === 'lofi' ? 0.4 : 0.5);
      for (const q of k.clap) {
        shovqin(L, R, t0 + q * beat, 0.18, { vol: tur === 'lofi' ? 0.09 : 0.14, sonish: 22, yuqori: false, seed: 3 });
        nota(L, R, 190, t0 + q * beat, 0.1, { vol: 0.06, sonish: 30 });
      }
      if (k.hat) {
        const soni = Math.round(4 / k.hat);
        for (let i = 0; i < soni; i++) {
          if (k.hatOff && i % 2 === 0) continue;
          const sw = k.swing && i % 2 ? k.swing * beat : 0;
          shovqin(L, R, t0 + i * k.hat * beat + sw, 0.05, { vol: 0.05, sonish: 90, seed: 7, pan: 0.3 });
        }
      }
    }
  }
  if (k.shitir) {
    // plastinka shitirlashi
    const r = rand(99);
    for (let i = 0; i < L.length; i += 1) if (r() < 0.0004) { const v = (r() - 0.5) * 0.08; L[i] += v; R[i] += v; }
  }
}

/** Tovush effektlari. */
function sfxYoz(L, R, tur, t0) {
  switch (tur) {
    case 'whoosh': {
      const a = Math.floor(t0 * HZ), n = Math.floor(0.5 * HZ), r = rand(Math.floor(t0 * 100) + 11);
      let lp = 0;
      for (let i = 0; i < n && a + i < L.length; i++) {
        if (a + i < 0) continue;
        const p = i / n, env = Math.sin(Math.PI * p) ** 2;
        const kesish = 0.02 + 0.25 * Math.sin(Math.PI * p);
        lp += (r() * 2 - 1 - lp) * kesish;
        const v = lp * env * 0.55;
        L[a + i] += v * (1 - p * 0.7); R[a + i] += v * (0.3 + p * 0.7);
      }
      break;
    }
    case 'pop': nota(L, R, 620, t0, 0.12, { vol: 0.12, garm: [1, 0.3], sonish: 35 }); break;
    case 'boom':
      kick(L, R, t0, 0.7);
      nota(L, R, 55, t0, 0.9, { vol: 0.25, garm: [1, 0.5], sonish: 4 });
      shovqin(L, R, t0, 0.3, { vol: 0.12, sonish: 14, yuqori: false, seed: 5 });
      break;
    case 'ding':
      nota(L, R, 1568, t0, 1.4, { vol: 0.09, garm: [1, 0.35, 0.15], sonish: 3 });
      nota(L, R, 2093, t0 + 0.09, 1.2, { vol: 0.06, garm: [1, 0.3], sonish: 3.5 });
      break;
    case 'shimmer':
      [2093, 2349, 2637, 3136, 3520, 4186].forEach((f, i) => nota(L, R, f, t0 + i * 0.06, 0.5, { vol: 0.035, sonish: 7, pan: i % 2 ? 0.5 : -0.5 }));
      break;
    case 'tick': shovqin(L, R, t0, 0.03, { vol: 0.12, sonish: 150, seed: 9 }); break;
    default:
  }
}

/** Ovozni 48 kHz ga (chiziqli interpolyatsiya). */
function qaytaNamuna(s, hz) {
  if (hz === HZ) return s;
  const n = Math.floor(s.length * HZ / hz), chiq = new Float32Array(n), k = hz / HZ;
  for (let i = 0; i < n; i++) {
    const x = i * k, j = Math.floor(x), f = x - j;
    chiq[i] = (s[j] || 0) * (1 - f) + (s[j + 1] || 0) * f;
  }
  return chiq;
}

/**
 * Yakuniy audio: musiqa + effektlar + ovoz → WAV (48 kHz, stereo, 16-bit).
 * @param {object} d
 * @param {number} d.uzunlik  soniya
 * @param {string} d.musiqa   kayfiyat
 * @param {number} [d.baland] musiqa balandligi 0..1
 * @param {{s:Float32Array, hz:number, bosh:number}|null} d.ovoz
 * @param {{tur:string, t:number}[]} [d.sfx]
 */
export function aralashtir({ uzunlik, musiqa = 'quvnoq', baland = 0.35, ovoz = null, sfx = [] }) {
  const n = Math.ceil(uzunlik * HZ);
  const mL = new Float32Array(n), mR = new Float32Array(n);
  if (musiqa !== 'yoq') musiqaYoz(mL, mR, uzunlik, KAYFIYAT[musiqa] ? musiqa : 'quvnoq');
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const e of sfx) sfxYoz(L, R, e.tur, e.t);

  // Ovoz va musiqa pasaytirish (ducking) zarfi
  const ov = ovoz?.s?.length ? qaytaNamuna(ovoz.s, ovoz.hz) : null;
  const ovBosh = Math.floor((ovoz?.bosh || 0) * HZ);
  let zarf = 0;
  const bal = Math.max(0, Math.min(1, baland));
  const kirish = 0.4 * HZ, chiqish = 1.6 * HZ;
  for (let i = 0; i < n; i++) {
    const v = ov && i >= ovBosh && i - ovBosh < ov.length ? ov[i - ovBosh] : 0;
    const a = Math.abs(v);
    zarf = a > zarf ? zarf + (a - zarf) * 0.01 : zarf * 0.99985;
    const duck = 1 - Math.min(0.6, zarf * 6);
    const fade = Math.min(1, i / kirish, (n - i) / chiqish);
    L[i] += mL[i] * bal * 1.6 * duck * fade + v;
    R[i] += mR[i] * bal * 1.6 * duck * fade + v;
  }
  // Cheklagich (limiter): 5 ms oldindan ko'radi, cho'qqi chegaradan oshsa
  // ovozni silliq pasaytiradi — to'lqin kesilmaydi (xirillash yo'q).
  // Keyin umumiy balandlik bir xil darajaga keltiriladi (WAV da −2.4 dBFS cho'qqi).
  const CHEGARA = 0.72, oldin = Math.round(0.005 * HZ), qaytish = 1 / (0.12 * HZ);
  const cho = new Float32Array(n);
  for (let i = 0; i < n; i++) cho[i] = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  // oldindan ko'rish oynasidagi maksimum (monoton navbat)
  const maks = new Float32Array(n), q = new Int32Array(n);
  let bosh = 0, oxir = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (oxir > bosh && cho[q[oxir - 1]] <= cho[i]) oxir--;
    q[oxir++] = i;
    while (q[bosh] > i + oldin) bosh++;
    maks[i] = cho[q[bosh]];
  }
  let g = 1, eng = 0;
  for (let i = 0; i < n; i++) {
    const kerak = maks[i] > CHEGARA ? CHEGARA / maks[i] : 1;
    g = kerak < g ? kerak : g + (1 - g) * qaytish * 6;
    if (g > kerak) g = kerak;
    L[i] *= g; R[i] *= g;
    eng = Math.max(eng, Math.abs(L[i]), Math.abs(R[i]));
  }
  const kuch = eng > 0.001 ? 0.76 / eng : 1;          // AAC kodlash cho'qqini ~1.5 dB oshiradi
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(HZ, 24); buf.writeUInt32LE(HZ * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const qisq = (v) => Math.max(-32767, Math.min(32767, Math.round(v * kuch * 32767)));
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(qisq(L[i]), 44 + i * 4);
    buf.writeInt16LE(qisq(R[i]), 46 + i * 4);
  }
  return buf;
}
