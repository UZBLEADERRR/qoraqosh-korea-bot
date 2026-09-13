/* KiOVO — YUZ va KO'Z aniqlash (Viola-Jones).
 *
 * Muammo. Ilgari yuz TERI RANGI bo'yicha chamalanardi. Haqiqiy
 * telefonlarda bu ishlamadi: bej devor, yog'och eshik, bo'yin va
 * qo'l ham «teri» bo'lib chiqdi — quti butun kadrni egalladi va
 * ilova bejizga «biroz uzoqlashing» dedi. Natija ekranida esa
 * «peshona» belgisi sochga tushib qolardi.
 *
 * Yechim. Haar kaskadi (OpenCV, `yuz-kaskad.js` da) — yuzni RANGI
 * emas, SHAKLI bo'yicha taniydi: ko'z sohasi yonoqdan to'q,
 * burun ko'prigi ko'z kosasidan yorug' va hokazo. Ranggi umuman
 * qaralmaydi, shuning uchun har qanday teri rangida bir xil
 * ishlaydi.
 *
 * Bu yerda faqat MATEMATIKA — DOM yo'q, shuning uchun sinovda
 * oddiy massiv bilan tekshiriladi.
 *
 * Qanday ishlaydi (qisqacha):
 *   1. INTEGRAL rasm — har nuqtada chap-yuqoridagi barcha
 *      piksellar yig'indisi. Shundan keyin ISTALGAN to'rtburchak
 *      yig'indisi 4 ta qo'shish bilan topiladi, qancha katta
 *      bo'lishidan qat'i nazar.
 *   2. Kadr bo'ylab 20x20 oyna suriladi, keyin oyna kattalashadi
 *      (1.2 barobar) — shunday qilib har xil masofadagi yuz
 *      topiladi.
 *   3. Har oyna 22 ta BOSQICHdan o'tadi. Birinchi bosqich arzon
 *      (2-3 belgi) va oynalarning 50% ini darrov rad etadi —
 *      shuning uchun butun jarayon telefonda ham tez.
 *   4. Bir yuz bir necha o'lchamda topiladi — ustma-ust tushgan
 *      to'rtburchaklar bittaga birlashtiriladi.
 */
(function (G) {
  'use strict';

  // Ustma-ust tushgan qutilar: shundan ko'p kesishsa — bitta yuz
  var QOPLAMA = 0.5;

  /**
   * Integral rasm va uning KVADRATI.
   *
   * Kvadrati kerak, chunki har oynada yorqinlik dispersiyasi
   * hisoblanadi: belgilar shunga BO'LINADI. Aks holda yorug'
   * xonadagi yuz bilan qorong'i xonadagi yuz uchun boshqa-boshqa
   * chegara kerak bo'lardi.
   *
   * O'lchami (w+1)x(h+1) — chap va yuqori chekkada nol qator,
   * shunda chekkadagi to'rtburchak uchun alohida shart yozilmaydi.
   */
  function integral(g, w, h) {
    var W = w + 1;
    var s = new Float64Array(W * (h + 1));
    var k = new Float64Array(W * (h + 1));
    for (var y = 0; y < h; y++) {
      var qs = 0, qk = 0;               // shu qatordagi yugurib borayotgan yig'indi
      for (var x = 0; x < w; x++) {
        var v = g[y * w + x];
        qs += v; qk += v * v;
        s[(y + 1) * W + x + 1] = s[y * W + x + 1] + qs;
        k[(y + 1) * W + x + 1] = k[y * W + x + 1] + qk;
      }
    }
    return { s: s, k: k, W: W };
  }

  /** To'rtburchak yig'indisi — 4 ta qo'shish. */
  function jam(s, W, x, y, en, boy) {
    var a = y * W + x;
    var b = a + en;
    var c = a + boy * W;
    var d = c + en;
    return s[d] - s[b] - s[c] + s[a];
  }

  /**
   * Bitta oynani kaskaddan o'tkazadi.
   *
   * @param {Float64Array} K  kaskad ma'lumoti
   * @returns {boolean} barcha bosqichdan o'tdimi
   */
  function bosqichlar(K, it, x, y, en, boy, olcham) {
    var s = it.s, k = it.k, W = it.W;
    var maydon = en * boy;
    var teskari = 1 / maydon;

    var yig = jam(s, W, x, y, en, boy);
    var kvad = jam(k, W, x, y, en, boy);
    var ora = yig * teskari;
    var disp = kvad * teskari - ora * ora;
    // Dispersiya manfiy bo'lishi mumkin emas, lekin suzuvchi
    // nuqta xatosi tufayli -1e-12 chiqib qolishi mumkin
    var std = disp > 0 ? Math.sqrt(disp) : 1;

    var i = 2;                         // [0],[1] — asosiy o'lcham
    var oxir = K.length;
    while (i < oxir) {
      var bosqichChegara = K[i++];
      var tugunSoni = K[i++];
      var bosqichJami = 0;

      for (var t = 0; t < tugunSoni; t++) {
        i++;                           // «tilted» — bu kaskadda ishlatilmaydi
        var quti = K[i++];
        var belgi = 0;

        for (var r = 0; r < quti; r++) {
          // Kaskad 20x20 uchun yozilgan — koordinatalarni
          // hozirgi oyna o'lchamiga cho'zamiz
          // «+0.5» — YAXLITLASH. Kesib tashlash (truncate) bilan
          // to'rtburchak chekkasi bir pikselga surilib ketadi va
          // belgi qiymati buziladi: ba'zi o'lchamda yuz topilib,
          // qo'shni o'lchamda topilmay qoladi.
          var rx = (x + K[i++] * olcham + 0.5) | 0;
          var ry = (y + K[i++] * olcham + 0.5) | 0;
          var re = (K[i++] * olcham + 0.5) | 0;
          var rb = (K[i++] * olcham + 0.5) | 0;
          var ogirlik = K[i++];
          belgi += jam(s, W, rx, ry, re, rb) * ogirlik;
        }

        var tugunChegara = K[i++];
        var chap = K[i++];
        var ong = K[i++];
        bosqichJami += (belgi * teskari < tugunChegara * std) ? chap : ong;
      }

      // Bosqichdan o'tmadi — bu yuz emas, keyingi oynaga
      if (bosqichJami < bosqichChegara) return false;
    }
    return true;
  }

  /**
   * Ustma-ust tushgan qutilarni birlashtiradi.
   *
   * Bitta yuz odatda 3-8 marta topiladi (qo'shni o'lchamlarda).
   * Guruhning O'RTACHASI olinadi — natija bitta kadrdan ikkinchisiga
   * sakramaydi, chiziqlar silliq turadi.
   */
  function birlashtir(list) {
    // Bir marta yurish yetmaydi: A bilan B, B bilan C kesishsa ham
    // A bilan C kesishmasligi mumkin. Ro'yxat qisqarmaguncha
    // qayta-qayta birlashtiramiz.
    var oldingi = list;
    for (var n = 0; n < 4; n++) {
      var yangi = birMarta(oldingi);
      if (yangi.length === oldingi.length) return yangi;
      oldingi = yangi;
    }
    return oldingi;
  }

  function birMarta(list) {
    if (list.length < 2) return list.slice();
    var guruh = new Array(list.length);
    for (var i = 0; i < guruh.length; i++) guruh[i] = -1;
    var n = 0;

    for (var a = 0; a < list.length; a++) {
      if (guruh[a] < 0) guruh[a] = n++;
      for (var b = a + 1; b < list.length; b++) {
        if (guruh[b] >= 0) continue;
        if (kesishuv(list[a], list[b]) >= QOPLAMA) guruh[b] = guruh[a];
      }
    }

    var natija = [];
    for (var gi = 0; gi < n; gi++) {
      var sx = 0, sy = 0, se = 0, sb = 0, soni = 0;
      var ogirlik = 0;
      for (var j = 0; j < list.length; j++) {
        if (guruh[j] !== gi) continue;
        sx += list[j].x; sy += list[j].y;
        se += list[j].en; sb += list[j].boy; soni++;
        ogirlik += list[j].soni || 1;
      }
      if (!soni) continue;
      natija.push({
        x: Math.round(sx / soni), y: Math.round(sy / soni),
        en: Math.round(se / soni), boy: Math.round(sb / soni),
        soni: ogirlik,
      });
    }
    // Ko'proq marta topilgani — ishonchliroq
    natija.sort(function (p, q) { return q.soni - p.soni; });
    return natija;
  }

  /** Ikki qutining kesishuvi / birlashmasi (IoU). */
  function kesishuv(a, b) {
    var x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
    var x1 = Math.min(a.x + a.en, b.x + b.en);
    var y1 = Math.min(a.y + a.boy, b.y + b.boy);
    if (x1 <= x0 || y1 <= y0) return 0;
    var kes = (x1 - x0) * (y1 - y0);
    return kes / (a.en * a.boy + b.en * b.boy - kes);
  }

  /**
   * Kaskad bo'yicha qidirish.
   *
   * @param {Float32Array} g   kulrang massiv
   * @param {object} sozlama   { kaskad, eng_kichik, qadam, olchov, soha }
   * @returns {Array} topilgan qutilar (ishonchli birinchi)
   */
  function qidir(g, w, h, sozlama) {
    var K = sozlama.kaskad;
    if (!K || K.length < 4) return [];
    var asosE = K[0], asosB = K[1];
    var olchov = sozlama.olchov || 1.2;
    var qadamK = sozlama.qadam || 1.5;

    // Faqat berilgan soha ichida qidirish (masalan, ko'z — yuz ichida)
    var soha = sozlama.soha || { x: 0, y: 0, en: w, boy: h };
    var sx0 = Math.max(0, soha.x | 0), sy0 = Math.max(0, soha.y | 0);
    var sx1 = Math.min(w, (soha.x + soha.en) | 0);
    var sy1 = Math.min(h, (soha.y + soha.boy) | 0);
    var sohaE = sx1 - sx0, sohaB = sy1 - sy0;
    if (sohaE < asosE || sohaB < asosB) return [];

    var it = integral(g, w, h);

    // Eng kichik yuz — soha eniga nisbatan. Juda kichik yuzni
    // qidirish uzoq davom etadi va bizga kerak ham emas: ekranda
    // 12% dan kichik yuz baribir «uzoqsiz» deb qaytariladi.
    var kichikUlush = sozlama.eng_kichik || 0.2;
    var boshOlcham = Math.max(1, (Math.min(sohaE, sohaB) * kichikUlush) / asosE);
    var maksOlcham = Math.min(sohaE / asosE, sohaB / asosB);

    var topildi = [];
    for (var olch = boshOlcham; olch <= maksOlcham; olch *= olchov) {
      var en = (asosE * olch) | 0, boy = (asosB * olch) | 0;
      if (en < 8 || boy < 8) continue;
      // Qadam oyna o'lchamiga bog'liq — katta oyna katta qadam bilan
      var qadam = Math.max(2, (olch * qadamK) | 0);
      for (var y = sy0; y + boy < sy1; y += qadam) {
        for (var x = sx0; x + en < sx1; x += qadam) {
          if (bosqichlar(K, it, x, y, en, boy, olch)) {
            topildi.push({ x: x, y: y, en: en, boy: boy });
          }
        }
      }
    }
    var ro = birlashtir(topildi);

    // Yolg'on topilmalarni chiqarib tashlash. Haqiqiy yuz qo'shni
    // o'lchamlarda bir necha marta topiladi; devordagi naqsh yoki
    // soya esa odatda bir martagina. Lekin agar BOSHQA hech nima
    // topilmagan bo'lsa, bittalikni ham qoldiramiz — yo'qdan ko'ra
    // taxminiy quti afzal.
    var kam = sozlama.eng_kam || 2;
    var kuchli = ro.filter(function (r) { return r.soni >= kam; });
    return kuchli.length ? kuchli : ro.slice(0, 1);
  }

  /**
   * Eng katta (eng yaqindagi) yuzni topadi.
   *
   * Faqat bittasi qaytariladi: skanerda odam o'zini suratga oladi,
   * orqa fonda turgan boshqa yuz emas, ENG KATTA yuz kerak.
   */
  function yuzniTop(g, w, h, kaskad, sozlama) {
    var s = sozlama || {};
    var ro = qidir(g, w, h, {
      kaskad: kaskad,
      // Zich qadam SHART: siyrak qadamda kaskad yuzning bir
      // bo'lagini (ko'zoynak + burun) yuz deb topib qo'yadi va
      // quti pastga siljib ketadi — haqiqiy telefonda shu sabab
      // «peshona» belgisi sochga tushardi.
      eng_kichik: s.eng_kichik || 0.15,
      olchov: s.olchov || 1.15,
      qadam: s.qadam || 1.0,
      eng_kam: s.eng_kam || 2,
    });
    if (!ro.length) return null;

    // Avval ISHONCH, keyin kattalik. Faqat kattaligiga qarasak,
    // bir marta topilgan yolg'on «yuz» (devor naqshi, ko'ylak
    // burmasi) haqiqiy yuzdan katta bo'lib chiqib, quti sakrab
    // ketardi. `qidir` ro'yxatni ishonch bo'yicha qaytaradi.
    var engIshonch = ro[0].soni || 1;
    var eng = null;
    for (var i = 0; i < ro.length; i++) {
      if ((ro[i].soni || 1) < engIshonch * 0.6) continue;
      if (!eng || ro[i].en * ro[i].boy > eng.en * eng.boy) eng = ro[i];
    }
    return eng || ro[0];
  }

  /**
   * Ko'zlarni yuz ichidan topadi.
   *
   * Faqat yuzning YUQORI yarmida qidiriladi — labning burchagi va
   * burun soyasi ham vaqti-vaqti bilan «ko'z» bo'lib chiqadi, shu
   * bilan ular chiqarib tashlanadi. Chap/o'ng — RASMDAGI tomon.
   */
  function kozlarniTop(g, w, h, yuz, kaskad) {
    if (!yuz) return null;
    var haar = kaskad ? kozHaar(g, w, h, yuz, kaskad) : null;
    return haar || kozQorongi(g, w, h, yuz);
  }

  /**
   * Ko'z — QORONG'I joy bo'yicha (zaxira usul).
   *
   * Haar kaskadi ko'zoynak taqqan odamda va bosh biroz burilganda
   * ishlamay qoladi. Lekin bir narsa doim to'g'ri: ko'z kosasi
   * (ko'zoynak gardishi ham) yuzning eng TO'Q joyi. Shuning uchun
   * yuzning yuqori yarmida eng qorong'i ufqiy yo'lakni topamiz,
   * so'ng uni chap va o'ng yarimga bo'lib, har yarimning qorong'i
   * markazini olamiz.
   *
   * Bu «ko'zni tanish» emas, lekin BELGI QO'YISH uchun yetarli:
   * peshona, yonoq va iyak aynan shu ikki nuqtadan o'lchanadi.
   */
  function kozQorongi(g, w, h, yuz) {
    var x0 = Math.max(0, Math.round(yuz.x + yuz.en * 0.10));
    var x1 = Math.min(w, Math.round(yuz.x + yuz.en * 0.90));
    var y0 = Math.max(0, Math.round(yuz.y + yuz.boy * 0.22));
    var y1 = Math.min(h, Math.round(yuz.y + yuz.boy * 0.58));
    if (x1 - x0 < 12 || y1 - y0 < 6) return null;

    // 1. Eng to'q qator — ko'z yo'lagi
    var engQator = y0, engOra = 1e9;
    for (var y = y0; y < y1; y++) {
      var s = 0;
      for (var x = x0; x < x1; x++) s += g[y * w + x];
      s /= (x1 - x0);
      if (s < engOra) { engOra = s; engQator = y; }
    }

    // 2. Yo'lak balandligi — yuz bo'yining 12% i
    var yarim = Math.max(2, Math.round(yuz.boy * 0.06));
    var ya = Math.max(0, engQator - yarim), yb = Math.min(h, engQator + yarim + 1);
    var orta = (x0 + x1) / 2;

    // 3. Har yarimda QORONG'ILIK bilan tortilgan markaz
    var top = function (a, b) {
      var jx = 0, jy = 0, og = 0;
      for (var yy = ya; yy < yb; yy++) {
        for (var xx = a; xx < b; xx++) {
          // Yorug' piksel nolga yaqin, to'q piksel katta og'irlik oladi
          var v = Math.max(0, 140 - g[yy * w + xx]);
          v = v * v;
          jx += xx * v; jy += yy * v; og += v;
        }
      }
      if (og < 1) return null;
      return { x: jx / og, y: jy / og };
    };
    var chap = top(x0, Math.round(orta)), ong = top(Math.round(orta), x1);
    if (!chap || !ong) return null;
    if (ong.x - chap.x < yuz.en * 0.18) return null;
    return { chap: chap, ong: ong, manba: 'qorongi' };
  }

  /** Ko'zni Haar kaskadi bilan qidirish. */
  function kozHaar(g, w, h, yuz, kaskad) {
    var soha = {
      x: yuz.x + yuz.en * 0.06,
      y: yuz.y + yuz.boy * 0.20,
      en: yuz.en * 0.88,
      boy: yuz.boy * 0.38,
    };
    var ro = qidir(g, w, h, {
      kaskad: kaskad, soha: soha,
      eng_kichik: 0.34, olchov: 1.15, qadam: 1.0, eng_kam: 1,
    });
    if (ro.length < 2) return null;

    // Ishonchli ikkitasini olamiz va tomonga ajratamiz
    var a = ro[0], b = ro[1];
    for (var i = 2; i < ro.length; i++) if (ro[i].soni > b.soni) b = ro[i];
    var markaz = function (q) { return { x: q.x + q.en / 2, y: q.y + q.boy / 2 }; };
    var ma = markaz(a), mb = markaz(b);
    // Bir xil tomonda ikkita quti — bittasi yolg'on, rad etamiz
    if (Math.abs(ma.x - mb.x) < yuz.en * 0.18) return null;
    return ma.x < mb.x ? { chap: ma, ong: mb, manba: 'haar' }
                       : { chap: mb, ong: ma, manba: 'haar' };
  }

  /**
   * Yuz qutisidan ANATOMIK nuqtalar.
   *
   * Ko'zlar topilgan bo'lsa — o'lcham va BURCHAK ular bo'yicha
   * aniqlanadi (bosh qiyshaygan bo'lsa ham belgilar joyida turadi).
   * Topilmasa — kaskadning o'rtacha nisbatlaridan foydalanamiz:
   * `haarcascade_frontalface_alt` qutisida ko'zlar taxminan 0.38
   * balandlikda, peshona 0.18 da, iyak esa qutidan sal pastda.
   */
  function nuqtalar(yuz, kozlar) {
    if (!yuz) return null;
    var cx = yuz.x + yuz.en / 2;
    var chap, ong;
    if (kozlar) { chap = kozlar.chap; ong = kozlar.ong; }
    else {
      chap = { x: yuz.x + yuz.en * 0.30, y: yuz.y + yuz.boy * 0.38 };
      ong  = { x: yuz.x + yuz.en * 0.70, y: yuz.y + yuz.boy * 0.38 };
    }
    var kozOra = { x: (chap.x + ong.x) / 2, y: (chap.y + ong.y) / 2 };
    var oraliq = Math.max(1, Math.hypot(ong.x - chap.x, ong.y - chap.y));
    var burchak = Math.atan2(ong.y - chap.y, ong.x - chap.x);

    // Ko'zlar oralig'i — yuzning tabiiy o'lchov birligi. Odamda u
    // yuz enining ~0.42 qismi, peshonadan iyakkacha esa ~2.0 oraliq.
    var pastga = function (k) {
      return { x: kozOra.x - Math.sin(burchak) * oraliq * k,
               y: kozOra.y + Math.cos(burchak) * oraliq * k };
    };
    var yonga = function (k, pastk) {
      var p = pastga(pastk);
      return { x: p.x + Math.cos(burchak) * oraliq * k,
               y: p.y + Math.sin(burchak) * oraliq * k };
    };

    return {
      markaz: { x: cx, y: yuz.y + yuz.boy / 2 },
      koz_chap: chap,
      koz_ong: ong,
      koz_ora: kozOra,
      oraliq: oraliq,
      burchak: burchak,
      peshona: pastga(-0.75),
      burun: pastga(0.62),
      lab: pastga(1.30),
      iyak: pastga(1.85),
      yonoq_chap: yonga(-0.85, 0.70),
      yonoq_ong: yonga(0.85, 0.70),
      chakka_chap: yonga(-1.15, -0.20),
      chakka_ong: yonga(1.15, -0.20),
    };
  }

  G.Yuz = {
    integral: integral, jam: jam, kesishuv: kesishuv, birlashtir: birlashtir,
    qidir: qidir, yuzniTop: yuzniTop, kozlarniTop: kozlarniTop,
    kozQorongi: kozQorongi, kozHaar: kozHaar,
    nuqtalar: nuqtalar, QOPLAMA: QOPLAMA,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
