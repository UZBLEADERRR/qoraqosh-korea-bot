// Kutubxonasiz JPEG kodlovchi (baseline, 4:2:0).
//
// Nega kerak. Mahsulot posterlari AI dan PNG bo'lib keladi va bazaga
// shundayligicha tushadi — 1024px fotosurat PNG da 1–2 MB. Do'kon
// sahifasida yigirmata shunday rasm = 20–40 MB: mobil internetda ilova
// «sekin ishlaydi». O'sha rasm JPEG da 40–80 KB, ya'ni 20 barobar
// kichik va ko'z bilan farqi bilinmaydi.
//
// Node'da JPEG kodlovchi yo'q, resvg esa faqat PNG chiqaradi. Tashqi
// kutubxona qo'shmaslik uchun (loyihada faqat `pg` va `@resvg/resvg-js`)
// kodlovchi shu yerda: standart Annex K kvantlash va Huffman jadvallari,
// 4:2:0 subsemplash. ~300 satr, o'zgarmas algoritm.
//
// Sifat: 100 = eng yaxshi/eng katta, 1 = eng yomon. 72 — mahsulot
// fotosurati uchun ko'z bilan yo'qotishsiz chegara.

// ── Standart kvantlash jadvallari (ITU T.81, Annex K) ──
const YORQ_Q = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const RANG_Q = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];

const ZIGZAG = [
   0, 1, 8,16, 9, 2, 3,10,17,24,32,25,18,11, 4, 5,
  12,19,26,33,40,48,41,34,27,20,13, 6, 7,14,21,28,
  35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,
  58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63];

// ── Standart Huffman jadvallari (Annex K) ──
const DC_Y_BITS = [0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
const DC_Y_QIY  = [0,1,2,3,4,5,6,7,8,9,10,11];
const DC_C_BITS = [0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
const DC_C_QIY  = [0,1,2,3,4,5,6,7,8,9,10,11];
const AC_Y_BITS = [0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d];
const AC_Y_QIY  = [
  0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
  0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
  0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
  0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
  0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
  0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
  0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
  0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
  0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
  0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa];
const AC_C_BITS = [0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77];
const AC_C_QIY  = [
  0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
  0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
  0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
  0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
  0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
  0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
  0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
  0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
  0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
  0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa];

/** BITS/QIYMAT jadvalidan {kod, uzunlik} xaritasi. */
function huffmanJadval(bits, qiymatlar) {
  const jadval = [];
  let kod = 0, k = 0;
  for (let uzunlik = 1; uzunlik <= 16; uzunlik++) {
    for (let i = 0; i < bits[uzunlik]; i++) {
      jadval[qiymatlar[k++]] = { kod, uzunlik };
      kod++;
    }
    kod <<= 1;
  }
  return jadval;
}

const DC_Y = huffmanJadval(DC_Y_BITS, DC_Y_QIY);
const AC_Y = huffmanJadval(AC_Y_BITS, AC_Y_QIY);
const DC_C = huffmanJadval(DC_C_BITS, DC_C_QIY);
const AC_C = huffmanJadval(AC_C_BITS, AC_C_QIY);

/** Sifatga qarab kvantlash jadvalini kattalashtiradi/kichraytiradi. */
function jadvalniMoslash(asos, sifat) {
  const s = sifat < 50 ? Math.floor(5000 / sifat) : 200 - sifat * 2;
  return asos.map((v) => Math.min(255, Math.max(1, Math.floor((v * s + 50) / 100))));
}

// ── Bitlarni yozuvchi ──
// JPEG oqimida 0xFF baytdan keyin 0x00 qo'yiladi (byte stuffing), aks
// holda dekoder uni marker deb o'qiydi.
class BitOqim {
  constructor() { this.bolaklar = []; this.joriy = []; this.bufer = 0; this.bitlar = 0; }
  yoz(kod, uzunlik) {
    for (let i = uzunlik - 1; i >= 0; i--) {
      this.bufer = (this.bufer << 1) | ((kod >> i) & 1);
      if (++this.bitlar === 8) {
        this.joriy.push(this.bufer);
        if (this.bufer === 0xff) this.joriy.push(0x00);
        this.bufer = 0; this.bitlar = 0;
        if (this.joriy.length > 8192) { this.bolaklar.push(Buffer.from(this.joriy)); this.joriy = []; }
      }
    }
  }
  tugat() {
    while (this.bitlar) this.yoz(1, 1);          // qolgan bitlar birlar bilan to'ldiriladi
    this.bolaklar.push(Buffer.from(this.joriy));
    return Buffer.concat(this.bolaklar);
  }
}

/** Qiymatni JPEG «kattalik + bitlar» ko'rinishiga o'tkazadi. */
function kattalik(v) {
  const m = Math.abs(v);
  let k = 0;
  while (m >> k) k++;
  return k;
}

// ── Oldinga DCT (AAN emas, to'g'ridan-to'g'ri ajratiladigan) ──
// 8 nuqtali DCT ikki marta: avval qatorlar, keyin ustunlar.
const COS = new Float32Array(64);
for (let u = 0; u < 8; u++) {
  for (let x = 0; x < 8; x++) COS[u * 8 + x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
}
const C0 = Math.SQRT1_2;

function dct8x8(blok, chiqish) {
  const oraliq = new Float32Array(64);
  for (let y = 0; y < 8; y++) {
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let x = 0; x < 8; x++) s += blok[y * 8 + x] * COS[u * 8 + x];
      oraliq[y * 8 + u] = s * (u === 0 ? C0 : 1);
    }
  }
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 8; y++) s += oraliq[y * 8 + u] * COS[v * 8 + y];
      chiqish[v * 8 + u] = s * (v === 0 ? C0 : 1) * 0.25;
    }
  }
}

/** Bitta 8×8 blokni kvantlab, Huffman bilan yozadi. */
function blokniYoz(oqim, blok, kvant, dcJadval, acJadval, oldingiDc) {
  const dct = new Float32Array(64);
  dct8x8(blok, dct);

  const q = new Int16Array(64);
  for (let i = 0; i < 64; i++) q[i] = Math.round(dct[i] / kvant[i]);

  // DC — oldingi blokdan farq
  const dc = q[0] - oldingiDc;
  if (dc === 0) {
    oqim.yoz(dcJadval[0].kod, dcJadval[0].uzunlik);
  } else {
    const k = kattalik(dc);
    oqim.yoz(dcJadval[k].kod, dcJadval[k].uzunlik);
    oqim.yoz(dc > 0 ? dc : dc + (1 << k) - 1, k);
  }

  // AC — zigzag tartibda, nollar guruhlanadi
  let oxirgi = 0;
  for (let i = 63; i > 0; i--) if (q[ZIGZAG[i]] !== 0) { oxirgi = i; break; }

  let nol = 0;
  for (let i = 1; i <= oxirgi; i++) {
    const v = q[ZIGZAG[i]];
    if (v === 0) { nol++; continue; }
    while (nol > 15) { oqim.yoz(acJadval[0xf0].kod, acJadval[0xf0].uzunlik); nol -= 16; }
    const k = kattalik(v);
    const belgi = (nol << 4) | k;
    oqim.yoz(acJadval[belgi].kod, acJadval[belgi].uzunlik);
    oqim.yoz(v > 0 ? v : v + (1 << k) - 1, k);
    nol = 0;
  }
  if (oxirgi < 63) oqim.yoz(acJadval[0].kod, acJadval[0].uzunlik);   // EOB
  return q[0];
}

const marker = (kod, tana) => Buffer.concat([
  Buffer.from([0xff, kod, (tana.length + 2) >> 8, (tana.length + 2) & 0xff]), tana]);

/**
 * Xom RGB dan JPEG.
 *
 * @param {Buffer} rgb   eni*boyi*3 bayt
 * @param {number} eni
 * @param {number} boyi
 * @param {number} [sifat] 1..100
 * @returns {Buffer}
 */
export function rgbdanJpeg(rgb, eni, boyi, sifat = 72) {
  if (!eni || !boyi) throw new Error('O‘lcham yo‘q');
  const s = Math.min(100, Math.max(1, Math.round(sifat)));
  const yq = jadvalniMoslash(YORQ_Q, s);
  const cq = jadvalniMoslash(RANG_Q, s);

  // ── RGB → YCbCr ──
  const n = eni * boyi;
  const Y = new Float32Array(n), CB = new Float32Array(n), CR = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
    Y[i]  =  0.299 * r + 0.587 * g + 0.114 * b - 128;
    CB[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
    CR[i] =  0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  // ── 4:2:0: rang kanallari ikki barobar kichrayadi ──
  // Ko'z rangdagi tafsilotni yorug'likdagichalik sezmaydi, shuning
  // uchun faylning uchdan biri shu yerda tejaladi.
  const cEni = Math.ceil(eni / 2), cBoyi = Math.ceil(boyi / 2);
  const cb = new Float32Array(cEni * cBoyi), cr = new Float32Array(cEni * cBoyi);
  for (let y = 0; y < cBoyi; y++) {
    for (let x = 0; x < cEni; x++) {
      let sb = 0, sr = 0, k = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const yy = Math.min(boyi - 1, y * 2 + dy), xx = Math.min(eni - 1, x * 2 + dx);
          sb += CB[yy * eni + xx]; sr += CR[yy * eni + xx]; k++;
        }
      }
      cb[y * cEni + x] = sb / k; cr[y * cEni + x] = sr / k;
    }
  }

  // ── Sarlavhalar ──
  const bolaklar = [Buffer.from([0xff, 0xd8])];                    // SOI

  const dqt = Buffer.alloc(2 + 64 * 2 + 2 - 2);
  dqt[0] = 0x00;
  for (let i = 0; i < 64; i++) dqt[1 + i] = yq[ZIGZAG[i]];
  dqt[65] = 0x01;
  for (let i = 0; i < 64; i++) dqt[66 + i] = cq[ZIGZAG[i]];
  bolaklar.push(marker(0xdb, dqt.subarray(0, 130)));

  bolaklar.push(marker(0xc0, Buffer.from([                          // SOF0
    8, boyi >> 8, boyi & 0xff, eni >> 8, eni & 0xff, 3,
    1, 0x22, 0,      // Y  — 2×2 subsemplash
    2, 0x11, 1,      // Cb
    3, 0x11, 1,      // Cr
  ])));

  const dht = (sinf, id, bits, qiy) =>
    marker(0xc4, Buffer.concat([
      Buffer.from([(sinf << 4) | id]), Buffer.from(bits.slice(1)), Buffer.from(qiy)]));
  bolaklar.push(dht(0, 0, DC_Y_BITS, DC_Y_QIY), dht(1, 0, AC_Y_BITS, AC_Y_QIY),
                dht(0, 1, DC_C_BITS, DC_C_QIY), dht(1, 1, AC_C_BITS, AC_C_QIY));

  bolaklar.push(marker(0xda, Buffer.from([                          // SOS
    3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0])));

  // ── Skanerlash: har MCU 16×16 piksel (4 ta Y bloki + 1 Cb + 1 Cr) ──
  const oqim = new BitOqim();
  const blok = new Float32Array(64);
  let dcY = 0, dcCb = 0, dcCr = 0;

  const blokniOl = (manba, mEni, mBoyi, bx, by) => {
    for (let y = 0; y < 8; y++) {
      const sy = Math.min(mBoyi - 1, by + y);
      for (let x = 0; x < 8; x++) {
        blok[y * 8 + x] = manba[sy * mEni + Math.min(mEni - 1, bx + x)];
      }
    }
  };

  for (let my = 0; my < boyi; my += 16) {
    for (let mx = 0; mx < eni; mx += 16) {
      for (let by = 0; by < 16; by += 8) {
        for (let bx = 0; bx < 16; bx += 8) {
          blokniOl(Y, eni, boyi, mx + bx, my + by);
          dcY = blokniYoz(oqim, blok, yq, DC_Y, AC_Y, dcY);
        }
      }
      blokniOl(cb, cEni, cBoyi, mx >> 1, my >> 1);
      dcCb = blokniYoz(oqim, blok, cq, DC_C, AC_C, dcCb);
      blokniOl(cr, cEni, cBoyi, mx >> 1, my >> 1);
      dcCr = blokniYoz(oqim, blok, cq, DC_C, AC_C, dcCr);
    }
  }

  bolaklar.push(oqim.tugat());
  bolaklar.push(Buffer.from([0xff, 0xd9]));                        // EOI
  return Buffer.concat(bolaklar);
}
