/* KiOVO — TAHLIL QATLAMLARI (klinik skaner ko'rinishi).
 *
 * Nima qiladi. Yuz suratidan VISIA kabi apparatlardagi qatlamlarni
 * hisoblaydi: jigarrang pigment xaritasi, qizil qon tomirlari, yashil
 * bakteriya (porfirin), ko'k UV va kulrang tekstura. Teri fondan
 * ajratiladi: pigment va qizarishda fon oq, qolganlarida qora.
 *
 * Qanday. Har piksel uchun uchta son:
 *   L  — yorug'lik (0..1);
 *   hp — mahalliy kontrast: piksel atrofidagi o'rtachadan qanchalik
 *        farq qiladi. Dog', sepkil, pora — manfiy; yaltiroq — musbat;
 *   qz — qizillik indeksi (R−G)/(R+G).
 * Qatlamning formulasi shulardan 0..1 qiymat chiqaradi, u esa rang
 * shkalasiga solinadi. Teri niqobi — YCbCr oralig'i, yuz ellipsi bilan
 * cheklangan (fondagi teri rangli devor kirmasin).
 *
 * HALOL: bu suratdan hisoblangan VIZUALIZATSIYA, UV lampa emas —
 * ilovada shunday yoziladi.
 *
 * Bu yerda faqat MATEMATIKA: DOM yo'q. Bitta fayl ikki joyda ishlaydi —
 * telefonda (ilova, canvas piksellari) va serverda (natija rasmi,
 * resvg piksellari). Shuning uchun ilova va rasm bir xil ko'rinadi.
 */
(function (G) {
  'use strict';

  const QATLAMLAR = [
    { kalit: 'pigment', nom: 'Pigment', izoh: 'dog‘lar va sepkil', fon: '#ffffff', soch: 0.12,
      q: (v) => 0.2 + 0.5 * (1 - v.L) + Math.max(0, -v.hp) * 9,
      rang: [[0, '#fffaf2'], [0.3, '#e6b47c'], [0.62, '#a45d24'], [1, '#3d1806']] },
    { kalit: 'qizarish', nom: 'Qizarish', izoh: 'qon tomirlari', fon: '#ffffff', soch: 0.1,
      q: (v) => 0.12 + Math.max(0, v.qz - 0.06) * 2.6 + Math.max(0, -v.hp) * 5,
      rang: [[0, '#fff6f6'], [0.35, '#eda3ad'], [0.7, '#b51f37'], [1, '#55040f']] },
    { kalit: 'bakteriya', nom: 'Bakteriya', izoh: 'poralar, porfirin', fon: '#000000', soch: 0.55,
      q: (v) => 0.1 + 0.62 * v.L ** 1.25 - Math.max(0, -v.hp) * 9 + Math.max(0, v.hp) * 6,
      rang: [[0, '#000000'], [0.25, '#032b08'], [0.6, '#0fa82a'], [1, '#7bff7e']] },
    { kalit: 'uv', nom: 'UV', izoh: 'yashirin dog‘lar', fon: '#000208', soch: 0.6,
      q: (v) => 0.08 + 0.85 * v.L ** 1.35 - Math.max(0, -v.hp) * 7 + Math.max(0, v.hp) * 3,
      rang: [[0, '#00030c'], [0.3, '#0a1f6e'], [0.65, '#2f6bff'], [1, '#c8dcff']] },
    { kalit: 'tekstura', nom: 'Tekstura', izoh: 'relef va ajinlar', fon: '#000000', soch: 0.4,
      q: (v) => 0.5 + v.hp * 9 + (v.L - 0.55) * 0.35,
      rang: [[0, '#000000'], [0.45, '#3c3c3c'], [0.62, '#9a9a9a'], [1, '#ffffff']] },
  ];

  // Yuz topilmaganda: o'rtacha selfida yuz taxminan shu joyda (rasm foizida)
  const YUZ_TAXMIN = { x: 12, y: 5, en: 76, boy: 80 };

  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  /** Shkala: 256 ta rang oldindan — har pikselda qidirmaslik uchun. */
  function shkala(toxtash) {
    const t = toxtash.map(([n, h]) => [n, hexRgb(h)]);
    const j = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let k = 0;
      while (k < t.length - 2 && v > t[k + 1][0]) k++;
      const [a, ra] = t[k], [b, rb] = t[k + 1];
      const u = Math.min(1, Math.max(0, (v - a) / ((b - a) || 1)));
      for (let c = 0; c < 3; c++) j[i * 3 + c] = ra[c] + (rb[c] - ra[c]) * u;
    }
    return j;
  }

  /** Quti bo'yicha xiralash (gorizontal + vertikal, 2 marta ≈ Gauss). */
  function xiralash(a, W, H, r) {
    if (r < 1) return a.slice();
    let s = a, t = new Float32Array(a.length);
    const n = 2 * r + 1;
    for (let o = 0; o < 2; o++) {
      for (let y = 0; y < H; y++) {
        const q = y * W;
        let yig = 0;
        for (let x = -r; x <= r; x++) yig += s[q + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) {
          t[q + x] = yig / n;
          yig += s[q + Math.min(W - 1, x + r + 1)] - s[q + Math.max(0, x - r)];
        }
      }
      const u = new Float32Array(a.length);
      for (let x = 0; x < W; x++) {
        let yig = 0;
        for (let y = -r; y <= r; y++) yig += t[Math.min(H - 1, Math.max(0, y)) * W + x];
        for (let y = 0; y < H; y++) {
          u[y * W + x] = yig / n;
          yig += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x];
        }
      }
      s = u;
    }
    return s;
  }

  /**
   * Suratni tayyorlaydi (bir marta) — keyin istalgan qatlam tez chiziladi.
   * @param {Uint8ClampedArray|Uint8Array} rgba  W×H×4
   * @param {{x,y,en,boy}|null} yuz  yuz qutisi rasm foizida
   * @returns {{chiz:(kalit:string)=>Uint8ClampedArray|null, teriUlushi:number}}
   */
  function tayyorla(rgba, W, H, yuz) {
    const N = W * H;
    const L = new Float32Array(N), qz = new Float32Array(N), teri = new Float32Array(N);
    let teriSoni = 0;
    for (let i = 0; i < N; i++) {
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      const yy = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      L[i] = yy / 255;
      qz[i] = (r - g) / (r + g + 1);
      if (yy > 35 && cr >= 133 && cr <= 182 && cb >= 76 && cb <= 132) { teri[i] = 1; teriSoni++; }
    }
    const Lb = xiralash(L, W, H, Math.max(1, Math.round(W / 220)));
    const teriB = xiralash(teri, W, H, Math.max(2, Math.round(W / 90)));

    const q = (yuz && yuz.en > 0 && yuz.boy > 0) ? yuz : YUZ_TAXMIN;
    const cx = (q.x + q.en / 2) / 100 * W, cy = (q.y + q.boy / 2) / 100 * H;
    const rx = q.en / 100 * W * 0.62, ry = q.boy / 100 * H * 0.62;
    const teriKam = teriSoni < N * 0.04;      // teri topilmadi — faqat ellips
    const M = new Float32Array(N), S = new Uint8Array(N), HP = new Float32Array(N);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const ell = d <= 1 ? 1 : Math.max(0, 1 - (Math.sqrt(d) - 1) * 4);
      M[i] = teriKam ? ell : Math.min(1, teriB[i] * 1.5) * ell;
      S[i] = d <= 2.2 ? 1 : 0;                // soch va yuz atrofi
      HP[i] = L[i] - Lb[i];
    }

    const v = { L: 0, hp: 0, qz: 0 };
    return {
      teriUlushi: teriSoni / N,
      chiz(kalit) {
        const r = QATLAMLAR.find((x) => x.kalit === kalit);
        if (!r) return null;
        const j = shkala(r.rang), fon = hexRgb(r.fon);
        const o = new Uint8ClampedArray(N * 4);
        for (let i = 0; i < N; i++) {
          v.L = L[i]; v.hp = HP[i]; v.qz = qz[i];
          const k = Math.round(Math.max(0, Math.min(1, r.q(v))) * 255) * 3;
          // Yuz atrofida faqat TEKSTURALI joy (soch tolalari) ko'rinadi:
          // tekis fon (devor, osmon) toza oq/qora qoladi
          const a = Math.max(M[i], S[i] * r.soch * Math.min(1, Math.abs(HP[i]) * 14));
          o[i * 4]     = fon[0] + (j[k] - fon[0]) * a;
          o[i * 4 + 1] = fon[1] + (j[k + 1] - fon[1]) * a;
          o[i * 4 + 2] = fon[2] + (j[k + 2] - fon[2]) * a;
          o[i * 4 + 3] = 255;
        }
        return o;
      },
    };
  }

  G.Qatlam = { QATLAMLAR, tayyorla, xiralash, shkala, YUZ_TAXMIN };
})(typeof globalThis !== 'undefined' ? globalThis : window);
