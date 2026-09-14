/* KiOVO — ochiq yuz skaneri (Instagramdan kelgan odam uchun).
 *
 * Ilovadan farqi: do'kon, savat va menyu YO'Q, Telegram ham shart
 * emas — bu oddiy veb-sahifa. Vazifasi bitta: odam o'zi haqida
 * qiziq narsa bilsin va botga kirishni O'ZI xohlasin.
 *
 * Kamera va sifat o'lchovi ilovaning modullaridan olinadi
 * (`/app/sifat.js`, `/app/yuz.js`) — bitta kod ikki joyda
 * ishlaydi, ikkalasini alohida tuzatib o'tirmaymiz.
 */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);

  const EKRANLAR = ['bosh', 'kamera', 'kutish', 'natija'];
  function ekran(nom) {
    EKRANLAR.forEach((e) => kor($(`#ekran-${e}`), e === nom));
    window.scrollTo(0, 0);
  }

  let xatoTaymer = 0;
  function xato(matn) {
    const el = $('#xato');
    el.textContent = matn;
    kor(el, true);
    clearTimeout(xatoTaymer);
    xatoTaymer = setTimeout(() => kor(el, false), 6000);
  }

  // ── Kaskad: faqat kamera ochilganda yuklanadi (~270 KB) ──
  let kaskadHolat = 'yoq';
  function kaskadniYukla() {
    if (kaskadHolat !== 'yoq') return;
    kaskadHolat = 'yuklanmoqda';
    const sc = document.createElement('script');
    sc.src = '/app/yuz-kaskad.js';
    sc.async = true;
    sc.onload = () => { kaskadHolat = window.YUZ_KASKAD ? 'tayyor' : 'xato'; };
    sc.onerror = () => { kaskadHolat = 'xato'; };
    document.head.appendChild(sc);
  }

  // ════════ KAMERA ════════
  let oqim = null, halqa = 0, oldingi = null, yaxshiKetma = 0;
  let yuzOxirgi = null, yuzSanoq = 0, yuzYoq = 0;
  let sanoq = 0, sanoqTaymer = 0;
  const OLCHOV_ENI = 240, YUZ_ENI = 288, MAKS = 1600, SIFAT = 0.92;

  const kanvas = (() => {
    const keshi = {};
    return (kalit, en, boy) => {
      let c = keshi[kalit];
      if (!c) c = keshi[kalit] = document.createElement('canvas');
      if (c.width !== en || c.height !== boy) { c.width = en; c.height = boy; }
      return c;
    };
  })();

  async function kameraniYoq() {
    if (!navigator.mediaDevices?.getUserMedia) {
      xato('Bu brauzerda kamera ishlamaydi — galereyadan surat tanlang.');
      return $('#fayl').click();
    }
    ekran('kamera');
    kaskadniYukla();
    document.body.classList.add('yorug');
    $('#kam-maslahat').textContent = 'Kamera yoqilmoqda…';
    yuzOxirgi = null; yuzSanoq = 0; yuzYoq = 0; yaxshiKetma = 0; oldingi = null;

    try {
      oqim = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
    } catch (e) {
      kameraniYop();
      const rad = /NotAllowed|Permission/i.test(e.name || e.message || '');
      xato(rad ? 'Kameraga ruxsat berilmadi — galereyadan surat tanlang.'
               : 'Kamera ochilmadi — galereyadan surat tanlang.');
      return;
    }
    const v = $('#kam-video');
    v.srcObject = oqim;
    try { await v.play(); } catch {}
    try {
      await oqim.getVideoTracks()[0].applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    } catch {}
    clearInterval(halqa);
    halqa = setInterval(olch, 125);
  }

  function kameraniYop() {
    sanoqniBekor();
    clearInterval(halqa); halqa = 0;
    try { oqim?.getTracks().forEach((t) => t.stop()); } catch {}
    oqim = null; oldingi = null;
    document.body.classList.remove('yorug');
    const v = $('#kam-video'); if (v) v.srcObject = null;
  }

  /** Yuzni aniqlash — uchtadan bir kadrda, natijasi silliqlanadi. */
  function yuzniAniqla(video, en) {
    if (kaskadHolat !== 'tayyor' || !window.Yuz) return null;
    if (yuzSanoq++ % 3 !== 0 && yuzOxirgi) return yuzOxirgi;
    let q = null;
    try {
      const yb = Math.round(YUZ_ENI * video.videoHeight / video.videoWidth);
      const c = kanvas('yuz', YUZ_ENI, yb);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(video, 0, 0, YUZ_ENI, yb);
      const d = x.getImageData(0, 0, YUZ_ENI, yb);
      q = Yuz.yuzniTop(Sifat.kulrang(d.data, YUZ_ENI, yb), YUZ_ENI, yb, window.YUZ_KASKAD);
      if (q) {
        const k = en / YUZ_ENI;
        q = { x: q.x * k, y: q.y * k, en: q.en * k, boy: q.boy * k };
      }
    } catch { return yuzOxirgi; }
    if (!q) { if (++yuzYoq >= 4) yuzOxirgi = null; return yuzOxirgi; }
    yuzYoq = 0;
    if (yuzOxirgi) {
      const a = 0.45;
      q = { x: yuzOxirgi.x + (q.x - yuzOxirgi.x) * a, y: yuzOxirgi.y + (q.y - yuzOxirgi.y) * a,
            en: yuzOxirgi.en + (q.en - yuzOxirgi.en) * a,
            boy: yuzOxirgi.boy + (q.boy - yuzOxirgi.boy) * a };
    }
    yuzOxirgi = q;
    return q;
  }

  function olch() {
    const v = $('#kam-video');
    if (!v || !v.videoWidth || v.paused) return;
    const en = OLCHOV_ENI, boy = Math.round(en * v.videoHeight / v.videoWidth);
    const c = kanvas('olchov', en, boy);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(v, 0, 0, en, boy);

    let n;
    try { n = Sifat.kadrniOlch(x.getImageData(0, 0, en, boy), oldingi, yuzniAniqla(v, en)); }
    catch { return; }
    oldingi = n.kulrang;

    chiz(n, en, boy);
    $('#kam-maslahat').textContent = n.maslahat;
    $('.kam-holat').dataset.holat = n.holat;

    yaxshiKetma = n.tayyor ? yaxshiKetma + 1 : 0;
    $('#t-ol').disabled = yaxshiKetma < 2;
    if (yaxshiKetma >= 4) sanoqniBoshla();
    else if (!n.tayyor) sanoqniBekor();
  }

  /** Ekrandagi chiziqlar — ilovadagi bilan bir xil mantiq, soddaroq. */
  function chiz(n, oEni, oBoyi) {
    const c = $('#kam-tor');
    const q = c.getBoundingClientRect();
    const en = Math.round(q.width), boy = Math.round(q.height);
    if (!en || !boy) return;
    if (c.width !== en || c.height !== boy) { c.width = en; c.height = boy; }
    const x = c.getContext('2d');
    x.clearRect(0, 0, en, boy);
    const k = Math.max(en / oEni, boy / oBoyi);
    const sx = (en - oEni * k) / 2, sy = (boy - oBoyi * k) / 2;
    const K = (p) => en - (sx + p * k), Y = (p) => sy + p * k;

    if (!n.quti) {
      const p = 0.45 + 0.2 * Math.sin(Date.now() / 520);
      x.strokeStyle = `rgba(255,255,255,${p.toFixed(3)})`;
      x.lineWidth = 3; x.setLineDash([12, 14]);
      x.beginPath();
      x.ellipse(en / 2, boy * 0.46, en * 0.29, boy * 0.33, 0, 0, Math.PI * 2);
      x.stroke(); x.setLineDash([]);
      return;
    }
    const b = n.quti;
    const mx = K(b.x + b.en / 2), my = Y(b.y + b.boy * 0.52);
    const rx = b.en * 0.44 * k, ry = b.boy * 0.58 * k;
    const rang = n.tayyor ? '86,230,170' : n.ball >= 55 ? '250,205,110' : '250,120,120';

    x.save();
    x.beginPath(); x.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
    x.strokeStyle = `rgba(${rang},.6)`; x.lineWidth = 3;
    x.shadowColor = `rgba(${rang},.7)`; x.shadowBlur = 16;
    x.stroke(); x.restore();

    const sweep = (Date.now() % 2400) / 2400;
    const ly = my - ry + 2 * ry * sweep;
    const t = (ly - my) / ry;
    const yarim = rx * Math.sqrt(Math.max(0, 1 - t * t));
    if (yarim > 2) {
      x.save();
      x.beginPath(); x.moveTo(mx - yarim, ly); x.lineTo(mx + yarim, ly);
      x.strokeStyle = `rgba(${rang},.95)`; x.lineWidth = 3.5; x.lineCap = 'round';
      x.shadowColor = `rgba(${rang},.9)`; x.shadowBlur = 12;
      x.stroke(); x.restore();
    }
  }

  function sanoqniBoshla() {
    if (sanoq || !oqim) return;
    sanoq = 3;
    kor($('#kam-sanoq'), true);
    $('#kam-sanoq-son').textContent = '3';
    sanoqTaymer = setInterval(() => {
      sanoq--;
      if (sanoq <= 0) { sanoqniBekor(); suratOl(); return; }
      $('#kam-sanoq-son').textContent = String(sanoq);
    }, 700);
  }
  function sanoqniBekor() {
    clearInterval(sanoqTaymer); sanoqTaymer = 0; sanoq = 0;
    kor($('#kam-sanoq'), false);
  }

  const uxla = (ms) => new Promise((r) => setTimeout(r, ms));

  async function suratOl() {
    const v = $('#kam-video');
    if (!v?.videoWidth) return;
    sanoqniBekor();
    clearInterval(halqa); halqa = 0;
    $('#t-ol').disabled = true;
    $('#kam-maslahat').textContent = 'Olinmoqda — qimirlamang…';

    const kadrlar = [];
    for (let i = 0; i < 5; i++) { kadrlar.push(kadrniOl(v)); await uxla(70); }
    let eng = kadrlar[0], engBall = -1;
    for (const kd of kadrlar) {
      const b = tiniqligi(kd);
      if (b > engBall) { engBall = b; eng = kd; }
    }
    const data = eng.toDataURL('image/jpeg', SIFAT);
    kameraniYop();
    yubor(data, 'image/jpeg');
  }

  /** Videodan kadr. KO'ZGUDA — odam ekranda o'zini shunday ko'rgan. */
  function kadrniOl(v) {
    const n = Math.min(1, MAKS / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * n);
    c.height = Math.round(v.videoHeight * n);
    const x = c.getContext('2d');
    x.save(); x.translate(c.width, 0); x.scale(-1, 1);
    x.drawImage(v, 0, 0, c.width, c.height);
    x.restore();
    return c;
  }

  function tiniqligi(c) {
    const en = 480, boy = Math.round(en * c.height / c.width);
    const k = kanvas('tiniq', en, boy);
    const x = k.getContext('2d', { willReadFrequently: true });
    x.drawImage(c, 0, 0, en, boy);
    try {
      const d = x.getImageData(0, 0, en, boy);
      const g = Sifat.kulrang(d.data, en, boy);
      let quti = null;
      if (kaskadHolat === 'tayyor' && window.Yuz) {
        try { quti = Yuz.yuzniTop(g, en, boy, window.YUZ_KASKAD); } catch {}
      }
      if (!quti) quti = Sifat.teriQutisi(d.data, en, boy);
      return Sifat.tiniqlik(g, en, boy, quti);
    } catch { return 0; }
  }

  // ── Galereya ──
  $('#t-fayl').onclick = () => $('#fayl').click();
  $('#fayl').onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { yubor(await kichraytir(f), 'image/jpeg'); }
    catch { xato('Rasmni o‘qib bo‘lmadi. Boshqasini tanlang.'); }
    e.target.value = '';
  };

  function kichraytir(fayl) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const n = Math.min(1, MAKS / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * n); c.height = Math.round(im.height * n);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', SIFAT));
      };
      im.onerror = rej;
      im.src = URL.createObjectURL(fayl);
    });
  }

  // ════════ TAHLIL ════════
  const QADAMLAR = ['Yuz aniqlanmoqda', 'Teri teksturasi o‘qilmoqda',
    'Muammolar belgilanmoqda', 'Tavsiya tayyorlanmoqda'];

  async function yubor(dataUrl, mime) {
    $('#kutish-surat').src = dataUrl;
    ekran('kutish');
    let i = 0;
    const qadam = setInterval(() => {
      i = (i + 1) % QADAMLAR.length;
      $('#kutish-qadam').textContent = QADAMLAR[i];
    }, 2600);

    try {
      const r = await fetch('/api/ochiq/skan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mime }),
      });
      const j = await r.json().catch(() => ({}));
      clearInterval(qadam);
      if (!r.ok) { ekran('bosh'); return xato(j.error || 'Tahlil qilinmadi. Keyinroq urinib ko‘ring.'); }
      if (!j.yaroqli) { ekran('bosh'); return xato(j.izoh || j.sabab || 'Bu suratda yuz topilmadi.'); }
      natijaniChiz(j, dataUrl);
    } catch {
      clearInterval(qadam);
      ekran('bosh');
      xato('Tarmoq bilan aloqa yo‘q. Qayta urinib ko‘ring.');
    }
  }

  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function natijaniChiz(j, dataUrl) {
    const o = j.ochiq || {}, y = j.yopiq || {};
    $('#n-rasm').src = dataUrl;
    $('#n-ball').textContent = o.ball || '—';
    $('#n-tavsif').textContent = o.tavsif || 'Surat tahlil qilindi.';

    const JINS = { erkak: 'Erkak', ayol: 'Ayol' };
    const teglar = [
      o.yosh && ['t-yosh', `Biologik yosh: ${o.yosh}`],
      JINS[o.jins] && ['t-jins', JINS[o.jins]],
      o.teri_turi && ['t-teri', `${o.teri_turi} teri`],
      o.teri_rangi && ['t-rang', String(o.teri_rangi).split(/[,;(]/)[0].trim()],
    ].filter(Boolean);
    $('#n-teglar').innerHTML = teglar
      .map(([k, m]) => `<span class="${k}">${esc(m)}</span>`).join('');

    $('#n-soni').textContent = y.muammo_soni ? `· ${y.muammo_soni} ta` : '';
    // Xira chiziqlar — bu SHUNCHAKI bo'yalgan to'rtburchaklar.
    // Berkitilgan matn brauzerga umuman yuborilmagan.
    const n = Math.max(3, Math.min(6, y.muammo_soni || 4));
    $('#n-xira').innerHTML = Array.from({ length: n }, (_, i) =>
      `<i style="width:${[92, 74, 88, 66, 80, 70][i % 6]}%"></i>`).join('');

    $('#t-telegram').href = j.havola || '#';
    ekran('natija');
  }

  // ── Tugmalar ──
  $('#t-kamera').onclick = kameraniYoq;
  $('#t-ol').onclick = suratOl;
  $('#t-yop').onclick = () => { kameraniYop(); ekran('bosh'); };
  $('#t-qayta').onclick = () => ekran('bosh');
  document.addEventListener('visibilitychange', () => { if (document.hidden) kameraniYop(); });

  // ── Sahifa ochilganda: brend nomi va qolgan urinishlar ──
  fetch('/api/ochiq/holat').then((r) => r.json()).then((j) => {
    if (j.brend) { $('#brend').textContent = j.brend; document.title = `${j.brend} — bepul yuz tahlili`; }
    if (typeof j.qolgan === 'number') {
      $('#chegara-izoh').textContent = j.qolgan > 0
        ? `Bugun yana ${j.qolgan} marta tekshirishingiz mumkin`
        : 'Bugungi bepul limit tugadi — ertaga qayta urinib ko‘ring';
      if (j.qolgan <= 0) { $('#t-kamera').disabled = true; $('#t-fayl').disabled = true; }
    }
  }).catch(() => {});
})();
