// OVOZ VAQTI — TTS ovozidan sahna chegaralari, so'z vaqtlari va lab harakati.
//
// Gemini TTS so'z vaqtini (timestamp) bermaydi. Shuning uchun:
//   1) butun matn BITTA so'rovda o'qiladi (ovoz ohangi bir xil, kvota tejaladi);
//   2) jimliklar topiladi va sahnalar orasidagi chegara matn uzunligiga
//      ko'ra kutilgan joyga eng yaqin jimlikka qo'yiladi;
//   3) sahna ichida so'zlar faqat OVOZLI vaqtga (jimliklarsiz) harf soniga
//      mutanosib taqsimlanadi — pauzalarda subtitr «yugurib» ketmaydi;
//   4) lab: har kadrdagi ovoz kuchi (RMS), silliqlangan, 0..1.

/** WAV (16-bit PCM) → Float32 namunalar. */
export function wavOqi(wav) {
  const b = Buffer.isBuffer(wav) ? wav : Buffer.from(wav);
  let hz = 24000, kanal = 1, i = 12, data = null;
  while (i + 8 <= b.length) {
    const id = b.toString('ascii', i, i + 4), uz = b.readUInt32LE(i + 4);
    if (id === 'fmt ') { kanal = b.readUInt16LE(i + 10); hz = b.readUInt32LE(i + 12); }
    if (id === 'data') { data = b.subarray(i + 8, Math.min(b.length, i + 8 + uz)); break; }
    i += 8 + uz + (uz % 2);
  }
  if (!data) data = b.subarray(44);
  const n = Math.floor(data.length / 2 / kanal);
  const s = new Float32Array(n);
  for (let k = 0; k < n; k++) s[k] = data.readInt16LE(k * 2 * kanal) / 32768;
  return { s, hz };
}

/** 10 ms oynalardagi energiya (RMS). */
function energiya(s, hz, oyna = 0.01) {
  const q = Math.max(1, Math.round(hz * oyna)), n = Math.ceil(s.length / q);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let j = 0;
    const a = i * q, b = Math.min(s.length, a + q);
    for (let k = a; k < b; k++) j += s[k] * s[k];
    e[i] = Math.sqrt(j / Math.max(1, b - a));
  }
  return { e, oyna };
}

/** Ovozli/jim oynalar: chegara — eng baland 95-persentilning 8 foizi. */
function ovozliOynalar(e) {
  const tartib = Array.from(e).sort((a, b) => a - b);
  const yuqori = tartib[Math.floor(tartib.length * 0.95)] || 0;
  const chegara = Math.max(0.004, yuqori * 0.08);
  return Array.from(e, (v) => v > chegara);
}

/** Jimliklar: [{bosh, oxir}] soniyada (kamida `min` uzunlikdagi). */
export function jimliklar(s, hz, min = 0.16) {
  const { e, oyna } = energiya(s, hz);
  const ov = ovozliOynalar(e);
  const chiq = [];
  let b = -1;
  for (let i = 0; i <= ov.length; i++) {
    const jim = i < ov.length && !ov[i];
    if (jim && b < 0) b = i;
    if (!jim && b >= 0) { if ((i - b) * oyna >= min) chiq.push({ bosh: b * oyna, oxir: i * oyna }); b = -1; }
  }
  return chiq;
}

const vazn = (matn) => String(matn || '').replace(/\s+/g, ' ').trim().length + 2;

/**
 * Bir ovozni sahnalarga bo'ladi.
 * @param {string[]} matnlar har sahna matni (o'qilish tartibida)
 * @returns {{bosh:number, oxir:number}[]} har sahna ovozining vaqti (soniya)
 */
export function sahnalargaBol(s, hz, matnlar) {
  const jami = s.length / hz;
  const j = jimliklar(s, hz, 0.12);
  // Ovoz boshidagi va oxiridagi jimlik — chegara emas
  const boshJim = j.length && j[0].bosh < 0.02 ? j[0].oxir : 0;
  const oxirJim = j.length && j[j.length - 1].oxir > jami - 0.02 ? j[j.length - 1].bosh : jami;
  const ichki = j.filter((q) => q.bosh > boshJim + 0.05 && q.oxir < oxirJim - 0.05);
  const vaznlar = matnlar.map(vazn), umumiy = vaznlar.reduce((a, b) => a + b, 0) || 1;
  const chegaralar = [];
  let yigindi = 0, oldingi = boshJim;
  for (let i = 0; i < matnlar.length - 1; i++) {
    yigindi += vaznlar[i];
    const kutilgan = boshJim + (oxirJim - boshJim) * (yigindi / umumiy);
    // kutilgan joyga eng yaqin, oldingisidan keyingi jimlik (±35% oralig'ida)
    const oraliq = (oxirJim - boshJim) * 0.35 * (vaznlar[i] / umumiy) + 0.6;
    let eng = null;
    for (const q of ichki) {
      const orta = (q.bosh + q.oxir) / 2;
      if (orta <= oldingi + 0.25 || Math.abs(orta - kutilgan) > oraliq) continue;
      const ball = Math.abs(orta - kutilgan) - (q.oxir - q.bosh) * 1.5;      // uzun jimlik — ishonchliroq
      if (!eng || ball < eng.ball) eng = { ...q, ball };
    }
    const nuqta = eng ? (eng.bosh + eng.oxir) / 2 : kutilgan;
    chegaralar.push(nuqta);
    oldingi = nuqta;
  }
  const chiq = [];
  let b0 = boshJim;
  for (let i = 0; i < matnlar.length; i++) {
    const o = i < chegaralar.length ? chegaralar[i] : oxirJim;
    chiq.push({ bosh: +b0.toFixed(3), oxir: +Math.max(b0 + 0.2, o).toFixed(3) });
    b0 = o;
  }
  return chiq;
}

/**
 * Sahna ichida so'z vaqtlari: [{w, s, e}] (ovoz boshidan, soniyada).
 * Faqat ovozli vaqt hisobga olinadi; tinish belgisidan keyin kichik pauza.
 */
export function sozVaqtlari(matn, s, hz, bosh, oxir) {
  const sozlar = String(matn || '').split(/\s+/).filter(Boolean);
  if (!sozlar.length) return [];
  const { e, oyna } = energiya(s, hz);
  const ov = ovozliOynalar(e);
  const i0 = Math.max(0, Math.floor(bosh / oyna)), i1 = Math.min(ov.length, Math.ceil(oxir / oyna));
  // ovozli vaqtning yig'indisi (oyna bo'yicha)
  const yig = [0];
  for (let i = i0; i < i1; i++) yig.push(yig[yig.length - 1] + (ov[i] ? 1 : 0));
  const ovozli = yig[yig.length - 1];
  const vaqtga = (ulush) => {
    if (ovozli < 3) return bosh + (oxir - bosh) * ulush;
    const maqsad = ulush * ovozli;
    let lo = 0, hi = yig.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (yig[m] < maqsad) lo = m + 1; else hi = m; }
    return (i0 + lo) * oyna;
  };
  const v = sozlar.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.2 + (/[.,!?;:…—]$/.test(w) ? 1.5 : 0));
  const jami = v.reduce((a, b) => a + b, 0);
  let y = 0;
  return sozlar.map((w, k) => {
    const s0 = vaqtga(y / jami); y += v[k];
    const e0 = vaqtga(y / jami);
    return { w, s: +s0.toFixed(3), e: +Math.max(s0 + 0.08, e0).toFixed(3) };
  });
}

/** Lab harakati: har kadr uchun 0..1 (silliqlangan, tez ochilib sekin yopiladi). */
export function labZarfi(s, hz, fps, kadrlar) {
  const q = hz / fps;
  const xom = new Float32Array(kadrlar);
  for (let f = 0; f < kadrlar; f++) {
    const a = Math.floor(f * q), b = Math.min(s.length, Math.floor((f + 1) * q));
    let j = 0;
    for (let k = a; k < b; k++) j += s[k] * s[k];
    xom[f] = b > a ? Math.sqrt(j / (b - a)) : 0;
  }
  const tartib = Array.from(xom).filter((v) => v > 0.002).sort((a, b) => a - b);
  const yuqori = tartib[Math.floor(tartib.length * 0.9)] || 1;
  const chiq = new Float32Array(kadrlar);
  let oldingi = 0;
  for (let f = 0; f < kadrlar; f++) {
    let v = Math.min(1, Math.max(0, (xom[f] / yuqori - 0.12) / 0.88));
    v = v > oldingi ? oldingi + (v - oldingi) * 0.75 : oldingi + (v - oldingi) * 0.4;
    chiq[f] = v; oldingi = v;
  }
  return chiq;
}
