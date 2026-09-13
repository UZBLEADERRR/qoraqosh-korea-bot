/* KiOVO — kadr SIFATINI o'lchash.
 *
 * Nima uchun kerak. Ilgari odam suratga olar, yuborar va bir necha
 * soniyadan keyin «rasm xira, qaytadan urinib ko'ring» degan javob
 * olardi. Tahlil kvotasi yonardi, vaqt ketardi, odam esa nima
 * noto'g'ri ekanini bilmasdi.
 *
 * Endi kadr KAMERADA turganida o'lchanadi va odamga AYNAN nima
 * qilish kerakligi aytiladi: yorug'roq joyga o'ting, qimirlatmang,
 * yaqinroq keling. Ekrandagi to'r ham shu o'lchovdan chiziladi —
 * bezak emas, har katak o'sha joydagi tiniqlikni ko'rsatadi.
 *
 * Bu yerda faqat MATEMATIKA: DOM ham, kamera ham yo'q. Shuning
 * uchun uni sinovda oddiy massiv bilan tekshirib bo'ladi.
 *
 * O'lchovlar:
 *   tiniqlik  — Laplas operatori (chekkalar qanchalik keskin).
 *               Kontrastga bo'linadi: qorong'i rasm ham, yorug' rasm
 *               ham bir xil o'lchansin.
 *   yorug'lik — o'rtacha yorqinlik va «kuygan» piksellar ulushi.
 *   teri      — teri rangidagi piksellar qutisi: yuz kadrning
 *               qanchasini egallayapti.
 *   harakat   — oldingi kadr bilan farq: qo'l qimirlasa surat xira
 *               chiqadi, buni TUSHIRISHDAN OLDIN bilish kerak.
 */
(function (G) {
  'use strict';

  /** RGBA dan kulrang (luma) massiv. */
  function kulrang(data, w, h) {
    const g = new Float32Array(w * h);
    for (let i = 0, p = 0; i < g.length; i++, p += 4) {
      g[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    }
    return g;
  }

  /** O'rtacha va standart chetlanish. */
  function oraStd(g) {
    let s = 0;
    for (let i = 0; i < g.length; i++) s += g[i];
    const ora = s / g.length;
    let d = 0;
    for (let i = 0; i < g.length; i++) { const x = g[i] - ora; d += x * x; }
    return { ora, std: Math.sqrt(d / g.length) };
  }

  /**
   * Tiniqlik balli (0-100).
   *
   * Laplas operatorining o'rtacha kvadrati chekkalarning keskinligini
   * beradi. Uni kontrastga bo'lamiz: aks holda kontrastli manzara
   * («oq devor oldidagi qora soch») xira bo'lsa ham yuqori ball olardi.
   *
   * @param {Float32Array} g   kulrang massiv
   * @param {number} qutiJoyi  faqat shu to'rtburchak ichini o'lchash (ixtiyoriy)
   */
  function tiniqlik(g, w, h, quti) {
    const x0 = Math.max(1, quti ? Math.floor(quti.x) : 1);
    const y0 = Math.max(1, quti ? Math.floor(quti.y) : 1);
    const x1 = Math.min(w - 1, quti ? Math.ceil(quti.x + quti.en) : w - 1);
    const y1 = Math.min(h - 1, quti ? Math.ceil(quti.y + quti.boy) : h - 1);
    if (x1 <= x0 || y1 <= y0) return 0;

    let jam = 0, soni = 0, yigindi = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * w + x;
        // 4 qo'shnili Laplas
        const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
        jam += l * l; soni++; yigindi += g[i];
      }
    }
    if (!soni) return 0;
    const rms = Math.sqrt(jam / soni);

    // Kontrast — o'sha soha bo'yicha
    const ora = yigindi / soni;
    let d = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) { const t = g[y * w + x] - ora; d += t * t; }
    }
    const std = Math.sqrt(d / soni);

    // NISBAT: keskinlik / kontrast. Sof qora kadr (std≈0) ni nolga
    // chiqarish uchun pastdan chegara qo'yiladi.
    const nisbat = rms / Math.max(std, 6);
    return Math.max(0, Math.min(100, Math.round(nisbat * 250)));
  }

  /**
   * Har katak uchun alohida tiniqlik — ekrandagi to'r shundan chiziladi.
   * @returns {{ustun:number, qator:number, ball:Float32Array}}
   */
  function toriTiniqlik(g, w, h, quti, ustun = 8, qator = 10) {
    const ball = new Float32Array(ustun * qator);
    const kx = quti.en / ustun;
    const ky = quti.boy / qator;
    for (let r = 0; r < qator; r++) {
      for (let c = 0; c < ustun; c++) {
        ball[r * ustun + c] = tiniqlik(g, w, h, {
          x: quti.x + c * kx, y: quti.y + r * ky, en: kx, boy: ky,
        });
      }
    }
    return { ustun, qator, ball };
  }

  /**
   * Yorug'lik holati: o'rtacha, kontrast va «kuygan» piksellar.
   *
   * Yuz qutisi berilsa FAQAT o'sha soha o'lchanadi. Sabab: to'q
   * fon oldida turgan odamning yuzi yaxshi yoritilgan bo'lsa ham,
   * butun kadr bo'yicha o'rtacha past chiqadi va ilova bejizga
   * «qorong'i» deb ogohlantirardi. Bizga fon emas, YUZdagi
   * yorug'lik kerak.
   */
  function yoruglik(g, w, h, quti) {
    const x0 = Math.max(0, quti ? Math.floor(quti.x) : 0);
    const y0 = Math.max(0, quti ? Math.floor(quti.y) : 0);
    const x1 = Math.min(w || 0, quti ? Math.ceil(quti.x + quti.en) : (w || 0));
    const y1 = Math.min(h || 0, quti ? Math.ceil(quti.y + quti.boy) : (h || 0));
    const hammasi = !quti || x1 <= x0 || y1 <= y0;

    let s = 0, toq = 0, yorug = 0, soni = 0;
    const qara = (v) => { s += v; if (v < 16) toq++; else if (v > 244) yorug++; soni++; };
    if (hammasi) { for (let i = 0; i < g.length; i++) qara(g[i]); }
    else { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) qara(g[y * w + x]); }

    const ora = s / Math.max(1, soni);
    let d = 0;
    if (hammasi) { for (let i = 0; i < g.length; i++) { const t = g[i] - ora; d += t * t; } }
    else {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const t = g[y * w + x] - ora; d += t * t;
      }
    }
    return {
      ora: Math.round(ora),
      kontrast: Math.round(Math.sqrt(d / Math.max(1, soni))),
      qora_ulush: toq / Math.max(1, soni),
      oq_ulush: yorug / Math.max(1, soni),
    };
  }

  /**
   * Teri rangidagi piksellar qutisi.
   *
   * Ikki qoida BIRLASHTIRILADI, chunki bittasi yetmaydi: RGB qoidasi
   * och terini yaxshi topadi, YCbCr esa to'q terini. Ikkalasi ham
   * «yuz shu yerda» degan TAXMIN — biz yuzni tanimaymiz, faqat
   * qayerda ekanini chamalab, to'rni o'sha joyga qo'yamiz.
   */
  function terimi(r, g, b) {
    const maks = Math.max(r, g, b), min = Math.min(r, g, b);
    const rgb = r > 60 && g > 30 && b > 15 && maks - min > 10
             && r > g && r > b && Math.abs(r - g) > 8;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const ycc = cb >= 74 && cb <= 132 && cr >= 130 && cr <= 180;
    return rgb || ycc;
  }

  function teriQutisi(data, w, h) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0, soni = 0;
    // Ustunlar va qatorlar bo'yicha hisob — bitta adashgan piksel
    // qutini butun kadrga cho'zib yubormasin
    const ust = new Int32Array(w), qat = new Int32Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        if (!terimi(data[p], data[p + 1], data[p + 2])) continue;
        ust[x]++; qat[y]++; soni++;
      }
    }
    if (soni < w * h * 0.02) return null;      // teri deyarli yo'q

    // Har ustun/qatorda kamida 12% teri bo'lsa — u yuz sohasiga kiradi
    const chegaraU = Math.max(2, h * 0.12), chegaraQ = Math.max(2, w * 0.12);
    for (let x = 0; x < w; x++) if (ust[x] >= chegaraU) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = 0; y < h; y++) if (qat[y] >= chegaraQ) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 <= x0 || y1 <= y0) return null;

    return { x: x0, y: y0, en: x1 - x0, boy: y1 - y0, ulush: soni / (w * h) };
  }

  /** Ikki kadr orasidagi farq (0-100). Qo'l qimirlaganini ko'rsatadi. */
  function harakat(g, oldingi) {
    if (!oldingi || oldingi.length !== g.length) return 0;
    let s = 0;
    for (let i = 0; i < g.length; i += 2) s += Math.abs(g[i] - oldingi[i]);
    return Math.min(100, Math.round((s / (g.length / 2)) * 3));
  }

  // Chegaralar. Tiniqlik chegarasi haqiqiy suratlarda o'lchab tanlangan:
  // xira kadr 12-25, yaxshi kadr 45 dan yuqori ball oladi.
  var CHEGARA = {
    tiniqlik: 40,
    yoruglik_past: 55,
    yoruglik_yuqori: 225,
    oq_ulush: 0.12,
    harakat: 14,
    yuz_ulush: 0.14,        // yuz kadrning kamida shuncha qismi
    yuz_ulush_maks: 0.72,   // bundan katta bo'lsa yuz kadrga sig'may qoladi
    markaz: 0.20,           // markazdan chetlanish (kadr o'lchamiga nisbatan)

    // HAQIQIY yuz qutisi (Haar) uchun boshqa o'lchov ishlatiladi.
    // Teri qutisi bo'yin va qo'lni ham qamrab olardi, shuning uchun
    // u kadrning 70-80% ini egallar va ilova bejizga «uzoqlashing»
    // derdi. Yuz qutisi esa faqat peshonadan iyakkacha — uni
    // MAYDON emas, BO'Y bilan o'lchash to'g'ri:
    //   bo'y/kadr < 0.30  → yuz juda kichik, tafsilot ko'rinmaydi
    //   bo'y/kadr > 0.92  → iyak yoki peshona kadrdan chiqib ketadi
    yuz_boy: 0.30,
    yuz_boy_maks: 0.92,
    yuz_markaz: 0.24,
  };

  /**
   * Barcha o'lchovlarni bitta xulosaga keltiradi.
   *
   * Bitta maslahat beriladi — ENG MUHIMI. Uchta ogohlantirishni
   * birdan ko'rsatish odamni chalg'itadi, u hech birini bajarmaydi.
   */
  function baho(o) {
    const y = o.yoruglik, quti = o.quti;
    // Quti QAYERDAN keldi: haqiqiy yuz aniqlagichdan («yuz») yoki
    // teri rangidan chamalab («teri»). Chegaralar ham shunga qarab.
    const yuzdan = o.manba === 'yuz';
    const yuzUlush = quti ? (quti.en * quti.boy) / (o.en * o.boy) : 0;
    const boyUlush = quti ? quti.boy / o.boy : 0;
    // Markazdan chetlanish: yuz kadrning o'rtasida turishi kerak,
    // aks holda yonoqning yarmi kadrdan chiqib ketadi
    const chetlanish = quti
      ? Math.max(Math.abs((quti.x + quti.en / 2) / o.en - 0.5),
                 Math.abs((quti.y + quti.boy / 2) / o.boy - 0.5)) : 0;
    const markazChegara = yuzdan ? CHEGARA.yuz_markaz : CHEGARA.markaz;
    // Masofa. Kamerada masofa o'lchagich yo'q, lekin yuz kadrning
    // qanchasini egallayotgani aynan shu haqda gapiradi.
    const masofa = !quti ? 'yoq'
      : yuzdan
        ? (boyUlush < CHEGARA.yuz_boy ? 'uzoq'
           : boyUlush > CHEGARA.yuz_boy_maks ? 'yaqin' : 'normal')
        : (yuzUlush < CHEGARA.yuz_ulush ? 'uzoq'
           : yuzUlush > CHEGARA.yuz_ulush_maks ? 'yaqin' : 'normal');

    var maslahat = '', holat = 'yaxshi';
    if (!quti) {
      maslahat = 'Yuzingiz kadrga to‘liq joylashsin';
      holat = 'yoq';
    } else if (y.ora < CHEGARA.yoruglik_past) {
      maslahat = 'Qorong‘i — yorug‘roq joyga o‘ting';
      holat = 'yomon';
    } else if (y.oq_ulush > CHEGARA.oq_ulush || y.ora > CHEGARA.yoruglik_yuqori) {
      maslahat = 'Yorug‘lik ko‘p — chiroqni yonlab oling';
      holat = 'yomon';
    } else if (masofa === 'uzoq') {
      maslahat = 'Yaqinroq keling';
      holat = 'yomon';
    } else if (masofa === 'yaqin') {
      maslahat = 'Biroz uzoqlashing — yuz kadrga sig‘maydi';
      holat = 'yomon';
    } else if (chetlanish > markazChegara) {
      maslahat = 'Yuzingizni markazga oling';
      holat = 'yomon';
    } else if (o.harakat > CHEGARA.harakat) {
      maslahat = 'Qimirlatmang — telefonni mahkam ushlang';
      holat = 'yomon';
    } else if (o.tiniqlik < CHEGARA.tiniqlik) {
      maslahat = 'Tiniq emas — fokuslang va yorug‘lik qo‘shing';
      holat = 'yomon';
    } else {
      maslahat = 'Tayyor — qimirlamay turing';
      holat = 'yaxshi';
    }

    // Umumiy ball: eng zaif ko'rsatkich bo'yicha — barcha shart
    // bajarilmasa surat baribir yaroqsiz
    const ballar = [
      Math.min(100, (o.tiniqlik / CHEGARA.tiniqlik) * 100),
      Math.min(100, (y.ora / CHEGARA.yoruglik_past) * 100),
      // Masofa: uzoq bo'lsa ulushga qarab, yaqin bo'lsa ortiqcha qismiga
      yuzdan
        ? (masofa === 'yaqin'
            ? Math.max(0, 100 - ((boyUlush - CHEGARA.yuz_boy_maks) / 0.12) * 100)
            : Math.min(100, (boyUlush / CHEGARA.yuz_boy) * 100))
        : (masofa === 'yaqin'
            ? Math.max(0, 100 - ((yuzUlush - CHEGARA.yuz_ulush_maks) / 0.2) * 100)
            : Math.min(100, (yuzUlush / CHEGARA.yuz_ulush) * 100)),
      Math.max(0, 100 - (o.harakat / CHEGARA.harakat) * 100 + 0),
      Math.max(0, 100 - (chetlanish / markazChegara) * 100 + 0),
    ];
    const ball = Math.max(0, Math.min(100, Math.round(Math.min.apply(null, ballar))));

    return { ball, holat, maslahat, yuz_ulush: yuzUlush, boy_ulush: boyUlush,
             manba: o.manba || 'teri', masofa, chetlanish,
             tayyor: holat === 'yaxshi' };
  }

  /**
   * Bitta kadrni to'liq o'lchaydi.
   * @param {ImageData|{data:Uint8ClampedArray,width:number,height:number}} kadr
   * @param {Float32Array|null} oldingi  oldingi kadrning kulrangi
   */
  function kadrniOlch(kadr, oldingi, yuzQutisi) {
    const w = kadr.width, h = kadr.height;
    const g = kulrang(kadr.data, w, h);
    // Haqiqiy yuz qutisi berilsa — o'shani ishlatamiz. Teri rangi
    // bo'yicha chamalash faqat ZAXIRA: u devor va qo'lni ham «teri»
    // deb hisoblaydi.
    const quti = yuzQutisi || teriQutisi(kadr.data, w, h);
    const manba = yuzQutisi ? 'yuz' : 'teri';
    const y = yoruglik(g, w, h, quti);
    const t = tiniqlik(g, w, h, quti);
    const harakati = harakat(g, oldingi);
    const natija = baho({ yoruglik: y, quti, tiniqlik: t, harakat: harakati,
                          en: w, boy: h, manba });
    return Object.assign(natija, {
      kulrang: g, quti, tiniqlik: t, yoruglik: y, harakat: harakati,
      tor: quti ? toriTiniqlik(g, w, h, quti) : null,
    });
  }

  G.Sifat = {
    kulrang, oraStd, tiniqlik, toriTiniqlik, yoruglik,
    terimi, teriQutisi, harakat, baho, kadrniOlch, CHEGARA,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
