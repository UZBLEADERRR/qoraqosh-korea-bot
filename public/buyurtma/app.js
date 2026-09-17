/* KiOVO — buyurtmalar ish stoli.
 *
 * NIMA UCHUN ALOHIDA EKRAN. Admin panelidagi buyurtmalar bo'limi
 * chalkashlik tug'dirardi: filtr faqat bosqich bo'yicha, qidiruv
 * yo'q, nechtaligi noma'lum, holatni o'zgartirish esa TO'QQIZTA
 * tugmadan iborat ro'yxat edi — operator qaysi biri keyingisi
 * ekanini o'zi eslab qolishi kerak edi.
 *
 * Bu yerda uchta qoida:
 *   1. «Nima qilishim kerak» birinchi o'rinda — ish navbatlari.
 *   2. Bitta ASOSIY amal: keyingi bosqich. Qolgani menyu ichida.
 *   3. Bir nechtasini birdan ko'chirish — partiya kelganda o'ttizta
 *      buyurtmani birma-bir ochib o'tirmaslik uchun.
 *
 * Kirish admin paneli bilan BIR XIL token (`qq_admin`): bir joyda
 * kirsangiz ikkinchisi ham ochiq bo'ladi.
 */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const som = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
  const narx = (n) => `${som(n)} so‘m`;

  const TOKEN_KALIT = 'qq_admin';   // admin paneli bilan umumiy

  const holat = {
    token: localStorage.getItem(TOKEN_KALIT) || '',
    navbat: 'chek',          // ochilishi bilan e'tibor kutayotganlar
    bosqich: '',
    q: '',
    surish: 0,
    royxat: [],
    jami: 0,
    tanlangan: new Set(),
    ochiq: null,
    bosqichlar: [],
  };

  /* Bosqich ranglari. Faqat MA'NO tashiydi: yakunlangan yashil,
     bekor qizil, yo'ldagilar sariq, kutayotganlar ko'k. */
  const RANG = {
    yangi: 'kok', tasdiqlangan: 'kok', qadoqlanmoqda: 'sariq',
    korea_jonatildi: 'sariq', yolda: 'sariq', omborda: 'kok',
    pochta_jonatildi: 'kok', yetkazildi: 'yashil', bekor: 'qizil',
  };
  const TOLOV = {
    kutilmoqda:      ['To‘lov kutilmoqda', 'sariq'],
    chek_yuborilgan: ['Chek keldi',        'kok'],
    tolangan:        ['To‘langan',         'yashil'],
    naqd:            ['Naqd',              ''],
  };
  const NAVBATLAR = [
    { kalit: 'chek',     nom: 'Chek tekshirish',  shoshilinch: true },
    { kalit: 'tolandi',  nom: 'Xaridga tayyor' },
    { kalit: 'kutmoqda', nom: '3 kundan beri turibdi', shoshilinch: true },
    { kalit: 'bugun',    nom: 'Bugun tushgan' },
    { kalit: '',         nom: 'Hammasi' },
  ];

  const bosqichNomi = (k) =>
    holat.bosqichlar.find((b) => b.kalit === k)?.nom || (k === 'bekor' ? 'Bekor qilindi' : k);

  /** Shu bosqichdan keyin keladigani. Oxirgisi yoki bekor bo'lsa null. */
  function keyingiBosqich(k) {
    const i = holat.bosqichlar.findIndex((b) => b.kalit === k);
    return i >= 0 && i < holat.bosqichlar.length - 1 ? holat.bosqichlar[i + 1] : null;
  }

  const vaqt = (d) => new Date(d).toLocaleString('uz-UZ',
    { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  /** «3 kun» — buyurtma qancha vaqtdan beri qimirlamagani. */
  function yosh(d) {
    const kun = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (kun >= 1) return `${kun} kun`;
    const soat = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    return soat >= 1 ? `${soat} soat` : 'hozir';
  }

  let tostTimer;
  function tost(matn, tur = '') {
    $('.tost')?.remove();
    const el = document.createElement('div');
    el.className = `tost ${tur}`;
    el.textContent = matn;
    document.body.appendChild(el);
    clearTimeout(tostTimer);
    tostTimer = setTimeout(() => el.remove(), 2800);
  }

  /* ── API ──
   * Sessiya tugasa kirish ekraniga qaytaramiz: «Xatolik (401)» degan
   * yozuv odamga hech narsa aytmaydi. */
  async function api(yol, opt = {}) {
    const r = await fetch(yol, {
      ...opt,
      headers: { 'Content-Type': 'application/json',
                 Authorization: `Bearer ${holat.token}`, ...(opt.headers || {}) },
    }).catch(() => null);
    if (!r) throw new Error('Internet aloqasi yo‘q');
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { chiqish(); throw new Error('Sessiya tugadi'); }
    if (!r.ok) throw new Error(j.error || `Xatolik (${r.status})`);
    return j;
  }

  // ══════════ KIRISH ══════════
  function kirishEkrani() {
    $('#ish').hidden = true;
    $('#kirish').hidden = false;
    $('#k-login').focus();
  }

  function chiqish() {
    holat.token = '';
    localStorage.removeItem(TOKEN_KALIT);
    kirishEkrani();
  }

  $('#kirish-forma').onsubmit = async (e) => {
    e.preventDefault();
    const t = $('#k-kir');
    const x = $('#kirish-xato');
    x.hidden = true;
    t.disabled = true; t.textContent = 'Tekshirilmoqda…';
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Server maydonni `password` deb kutadi — admin paneli ham
        // shu nom bilan yuboradi
        body: JSON.stringify({ login: $('#k-login').value.trim(),
                               password: $('#k-parol').value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Login yoki parol xato');
      holat.token = j.token;
      localStorage.setItem(TOKEN_KALIT, j.token);
      $('#kirish').hidden = true;
      $('#ish').hidden = false;
      boshla();
    } catch (err) {
      x.textContent = err.message; x.hidden = false;
    } finally {
      t.disabled = false; t.textContent = 'Kirish';
    }
  };

  // ══════════ YON USTUN ══════════
  function yonniChiz(sanoq = {}, navbat = {}) {
    // Qidiruv paytida hech biri faol emas: ro'yxat filtrga emas,
    // qidiruvga bo'ysunadi va yonda «faol» turgan tanlov yolg'on
    // bo'lardi
    const qidiryapti = Boolean(holat.q);
    $('#navbatlar').innerHTML = NAVBATLAR.map((n) => {
      const soni = n.kalit ? (navbat[n.kalit] ?? 0) : (holat.jamiBarcha ?? '');
      const faol = !qidiryapti && holat.navbat === n.kalit && !holat.bosqich;
      return `<button data-navbat="${n.kalit}" class="${faol ? 'faol' : ''}${
        n.shoshilinch && soni > 0 ? ' shoshilinch' : ''}">
        <i></i>${esc(n.nom)}${soni !== '' ? `<b>${soni}</b>` : ''}</button>`;
    }).join('');

    $('#bosqichlar').innerHTML = [...holat.bosqichlar, { kalit: 'bekor', nom: 'Bekor qilindi' }]
      .map((b) => `<button data-bosqich="${b.kalit}"
        class="${!qidiryapti && holat.bosqich === b.kalit ? 'faol' : ''}">
        <i></i>${esc(b.nom)}<b>${sanoq[b.kalit] ?? 0}</b></button>`).join('');

    $$('[data-navbat]').forEach((b) => b.onclick = () => {
      holat.navbat = b.dataset.navbat; holat.bosqich = ''; holat.surish = 0;
      yonYop(); yukla();
    });
    $$('[data-bosqich]').forEach((b) => b.onclick = () => {
      holat.bosqich = b.dataset.bosqich; holat.navbat = ''; holat.surish = 0;
      yonYop(); yukla();
    });
  }

  const yonYop = () => { $('#yon').classList.remove('ochiq'); $('#yon-parda').hidden = true; };
  $('#t-menyu').onclick = () => {
    const ochiq = $('#yon').classList.toggle('ochiq');
    $('#yon-parda').hidden = !ochiq;
  };
  $('#yon-parda').onclick = yonYop;

  // ══════════ RO'YXAT ══════════
  async function yukla({ qoshib = false } = {}) {
    if (!qoshib) $('#royxat').innerHTML = '<div class="yuklanmoqda"><span class="aylana"></span></div>';
    const p = new URLSearchParams();
    /* Qidiruv HAMMA buyurtma orasidan izlaydi.
     *
     * Ilgari u faol filtr bilan birga ishlardi va operator buyurtma
     * raqamini yozib «0 ta» degan javob olardi — chunki o'zi unutgan
     * «Yangi» filtri yoqiq turgan, buyurtma esa allaqachon keyingi
     * bosqichga o'tgan edi. Aynan shunday narsalar chalkashlik
     * tug'diradi: odam «tizim yo'qotib qo'ydi» deb o'ylaydi. */
    if (!holat.q) {
      if (holat.bosqich) p.set('holat', holat.bosqich);
      else if (holat.navbat) p.set('navbat', holat.navbat);
    } else {
      p.set('q', holat.q);
    }
    p.set('surish', String(holat.surish));
    p.set('limit', '50');

    try {
      const j = await api(`/api/admin/buyurtmalar?${p}`);
      holat.bosqichlar = j.bosqichlar || holat.bosqichlar;
      holat.jami = j.jami || 0;
      holat.jamiBarcha = Object.values(j.sanoq || {}).reduce((a, b) => a + b, 0);
      holat.royxat = qoshib ? [...holat.royxat, ...j.buyurtmalar] : j.buyurtmalar;
      yonniChiz(j.sanoq, j.navbat);
      royxatniChiz();
    } catch (e) {
      $('#royxat').innerHTML = `<div class="bosh-holat"><b>${esc(e.message)}</b>
        <span>Yangilab ko‘ring</span></div>`;
    }
  }

  function sarlavha() {
    if (holat.q) return `«${holat.q}» — barcha buyurtmalar orasidan`;
    if (holat.bosqich) return bosqichNomi(holat.bosqich);
    return NAVBATLAR.find((n) => n.kalit === holat.navbat)?.nom || 'Buyurtmalar';
  }

  function royxatniChiz() {
    const r = holat.royxat;
    const bosh = `<div class="royxat-bosh">
      <h1>${esc(sarlavha())}</h1>
      <span class="soni">${holat.jami} ta</span>
    </div>`;

    if (!r.length) {
      $('#royxat').innerHTML = `${bosh}<div class="bosh-holat">
        <b>Bu yerda buyurtma yo‘q</b>
        <span>${holat.q ? 'Boshqacha qidirib ko‘ring' : 'Hammasi joyida'}</span></div>`;
      return;
    }

    $('#royxat').innerHTML = `${bosh}
      <table class="jadval">
        <thead><tr>
          <th class="j-belgi"><input type="checkbox" id="hammasi" aria-label="Hammasini tanlash"></th>
          <th>Raqam</th><th>Mijoz</th><th>Hudud</th>
          <th>To‘lov</th><th>Bosqich</th><th style="text-align:right">Summa</th>
        </tr></thead>
        <tbody>${r.map(qator).join('')}</tbody>
      </table>
      <div class="kartalar">${r.map(karta).join('')}</div>
      ${r.length < holat.jami
        ? '<button class="tug yana" id="t-yana">Yana yuklash</button>' : ''}`;

    $$('[data-oq]').forEach((el) => el.onclick = (e) => {
      // Belgilash katakchasi qatorni ochmaydi
      if (e.target.closest('[data-belgi]')) return;
      panelniOch(Number(el.dataset.oq));
    });
    $$('[data-belgi]').forEach((el) => el.onchange = () => {
      const id = Number(el.dataset.belgi);
      if (el.checked) holat.tanlangan.add(id); else holat.tanlangan.delete(id);
      tanlovniChiz();
    });
    const hammasi = $('#hammasi');
    if (hammasi) hammasi.onchange = () => {
      r.forEach((o) => hammasi.checked ? holat.tanlangan.add(o.id) : holat.tanlangan.delete(o.id));
      $$('[data-belgi]').forEach((el) => { el.checked = hammasi.checked; });
      $$('.karta').forEach((el) => el.classList.toggle('tanlangan', hammasi.checked));
      tanlovniChiz();
    };
    const yana = $('#t-yana');
    if (yana) yana.onclick = () => {
      holat.surish = holat.royxat.length;
      yana.disabled = true; yana.textContent = 'Yuklanmoqda…';
      yukla({ qoshib: true });
    };
    tanlovniChiz();
  }

  function qator(o) {
    const [tn, tr] = TOLOV[o.payment_status] || ['—', ''];
    const foyda = o.total - o.delivery_fee + o.discount - o.cost_total;
    const belgilangan = holat.tanlangan.has(o.id);
    return `<tr data-oq="${o.id}"
      class="${belgilangan ? 'tanlangan' : ''}${holat.ochiq === o.id ? ' ochiq' : ''}">
      <td class="j-belgi"><input type="checkbox" data-belgi="${o.id}"
        ${belgilangan ? 'checked' : ''} aria-label="Tanlash"></td>
      <td><div class="j-raqam">${esc(o.order_no)}</div>
          <div class="j-vaqt">${vaqt(o.created_at)}</div></td>
      <td class="j-mijoz"><b>${esc(o.customer_name || '—')}</b>
          <span>${esc(o.customer_phone || '')}</span></td>
      <td>${esc([o.viloyat, o.tuman].filter(Boolean).join(', ') || '—')}</td>
      <td><span class="yor ${tr}">${esc(tn)}</span></td>
      <td><span class="yor ${RANG[o.status] || ''}">${esc(bosqichNomi(o.status))}</span>
          <div class="j-vaqt">${yosh(o.updated_at || o.created_at)}</div></td>
      <td class="j-summa">${som(o.total)}<small>+${som(foyda)}</small></td>
    </tr>`;
  }

  function karta(o) {
    const [tn, tr] = TOLOV[o.payment_status] || ['—', ''];
    const belgilangan = holat.tanlangan.has(o.id);
    return `<div class="karta ${belgilangan ? 'tanlangan' : ''}" data-oq="${o.id}">
      <div class="karta-bosh">
        <input type="checkbox" data-belgi="${o.id}" ${belgilangan ? 'checked' : ''}
          aria-label="Tanlash">
        <span class="j-raqam">${esc(o.order_no)}</span>
        <span class="yor ${RANG[o.status] || ''}">${esc(bosqichNomi(o.status))}</span>
      </div>
      <div class="karta-satr">${esc(o.customer_name || '—')}<b>${som(o.total)}</b></div>
      <div class="karta-satr">${esc(o.customer_phone || '')}
        <b><span class="yor ${tr}">${esc(tn)}</span></b></div>
      <div class="karta-satr">${esc([o.viloyat, o.tuman].filter(Boolean).join(', ') || '—')}
        <b>${yosh(o.updated_at || o.created_at)}</b></div>
    </div>`;
  }

  // ══════════ TANLOV ══════════
  function tanlovniChiz() {
    const n = holat.tanlangan.size;
    $('#tanlov-panel').hidden = n === 0;
    $('#tanlov-soni').textContent = `${n} ta tanlandi`;
  }

  $('#t-tanlovni-bekor').onclick = () => {
    holat.tanlangan.clear();
    $$('[data-belgi]').forEach((el) => { el.checked = false; });
    $$('.karta').forEach((el) => el.classList.remove('tanlangan'));
    const h = $('#hammasi'); if (h) h.checked = false;
    tanlovniChiz();
  };

  /* Ommaviy ko'chirish.
   *
   * Tanlanganlar TURLI bosqichda bo'lishi mumkin. Shuning uchun
   * «keyingi bosqich» degani noaniq bo'lardi — qaysi biriniki?
   * Aniq qilib so'raymiz: qaysi bosqichga ko'chirilsin. */
  $('#t-kochir').onclick = () => {
    const idlar = [...holat.tanlangan];
    const tanlovlar = holat.royxat.filter((o) => holat.tanlangan.has(o.id));
    // Hammasi bir bosqichda bo'lsa keyingisi oldindan taklif qilinadi
    const bir = new Set(tanlovlar.map((o) => o.status));
    const taklif = bir.size === 1 ? keyingiBosqich([...bir][0]) : null;

    oyna(`${idlar.length} ta buyurtmani ko‘chirish`, `
      ${taklif ? `<p>Hammasi «${esc(bosqichNomi([...bir][0]))}» bosqichida.</p>
        <button class="tug asos keng katta" data-koch="${taklif.kalit}"
          style="margin-bottom:14px">${esc(taklif.nom)} ga o‘tkazish</button>
        <p>Yoki boshqa bosqich:</p>` : '<p>Qaysi bosqichga ko‘chirilsin?</p>'}
      <div class="holat-royxat">
        ${holat.bosqichlar.filter((b) => b.kalit !== taklif?.kalit)
          .map((b) => `<button class="tug" data-koch="${b.kalit}">${esc(b.nom)}</button>`).join('')}
      </div>`);

    $$('[data-koch]').forEach((b) => b.onclick = async () => {
      $$('[data-koch]').forEach((x) => { x.disabled = true; });
      try {
        const j = await api('/api/admin/buyurtma-koch', { method: 'POST',
          body: JSON.stringify({ idlar, status: b.dataset.koch }) });
        oynaYop();
        holat.tanlangan.clear();
        tost(j.yiqilgan?.length
          ? `${j.bajarildi} ta ko‘chdi, ${j.yiqilgan.length} tasi yiqildi`
          : `${j.bajarildi} ta buyurtma ko‘chirildi`, j.yiqilgan?.length ? 'xato' : '');
        yukla();
      } catch (e) {
        tost(e.message, 'xato');
        $$('[data-koch]').forEach((x) => { x.disabled = false; });
      }
    });
  };

  // ══════════ TAFSILOT PANELI ══════════
  function panelniYop() {
    holat.ochiq = null;
    $('#panel').hidden = true;
    $('#panel-parda').hidden = true;
    $$('.jadval tbody tr').forEach((tr) => tr.classList.remove('ochiq'));
  }
  $('#panel-parda').onclick = panelniYop;

  function panelniOch(id) {
    const o = holat.royxat.find((x) => x.id === id);
    if (!o) return;
    holat.ochiq = id;
    $$('.jadval tbody tr').forEach((tr) =>
      tr.classList.toggle('ochiq', Number(tr.dataset.oq) === id));

    const [tn, tr] = TOLOV[o.payment_status] || ['—', ''];
    const foyda = o.total - o.delivery_fee + o.discount - o.cost_total;
    const keyin = keyingiBosqich(o.status);
    const tel = String(o.customer_phone || '').replace(/[^+\d]/g, '');

    $('#panel').innerHTML = `
      <div class="panel-bosh">
        <h2>${esc(o.order_no)}</h2>
        <span class="yor ${RANG[o.status] || ''}">${esc(bosqichNomi(o.status))}</span>
        <button class="ikon-tug" id="t-panel-yop" aria-label="Yopish">
          <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" fill="none"/></svg></button>
      </div>

      <div class="panel-ich">
        <div class="blok">
          <h3>Mijoz</h3>
          <div class="satr"><span class="k">Ism</span>
            <span class="v">${esc(o.customer_name || '—')}</span></div>
          <div class="satr"><span class="k">Telefon</span>
            <span class="v">${tel ? `<a href="tel:${esc(tel)}">${esc(o.customer_phone)}</a>` : '—'}</span></div>
          <div class="satr"><span class="k">Manzil</span>
            <span class="v">${esc(o.customer_address || '—')}</span></div>
          ${o.note ? `<div class="satr"><span class="k">Izoh</span>
            <span class="v">${esc(o.note)}</span></div>` : ''}
          ${o.pochta_izoh ? `<div class="satr"><span class="k">Pochta</span>
            <span class="v">${esc(o.pochta_izoh)}</span></div>` : ''}
          ${o.cancel_reason ? `<div class="satr"><span class="k">Bekor sababi</span>
            <span class="v">${esc(o.cancel_reason)}</span></div>` : ''}
        </div>

        <div class="blok">
          <h3>Mahsulotlar</h3>
          ${(o.items || []).map((i) => `<div class="satr">
            <span class="k" style="flex:1">${esc(i.name)} × ${i.qty}</span>
            <span class="v" style="flex:0 0 auto">${som(i.price * i.qty)}</span></div>`).join('')}
          ${o.discount ? `<div class="satr"><span class="k">Chegirma</span>
            <span class="v" style="color:var(--yashil)">−${som(o.discount)}</span></div>` : ''}
          <div class="satr"><span class="k">Yetkazish</span>
            <span class="v">${som(o.delivery_fee)}</span></div>
          <div class="satr jami"><span class="k">Jami</span>
            <span class="v">${narx(o.total)}</span></div>
          <div class="satr"><span class="k">Foyda</span>
            <span class="v" style="color:var(--yashil)">${som(foyda)}</span></div>
        </div>

        <div class="blok">
          <h3>To‘lov · <span class="yor ${tr}">${esc(tn)}</span></h3>
          ${o.receipt_id
            ? `<img class="chek" src="/media/${esc(o.receipt_id)}?t=${encodeURIComponent(holat.token)}"
                 alt="To‘lov cheki" loading="lazy">
               <div style="display:flex;gap:8px;margin-top:10px">
                 <button class="tug asos" id="t-tolov-ok" style="flex:1">To‘lovni tasdiqlash</button>
                 <button class="tug" id="t-tolov-yoq">Qayta so‘rash</button>
               </div>`
            : '<p style="margin:0;color:var(--och);font-size:13.5px">Chek yuborilmagan</p>'}
        </div>

        <div class="blok">
          <h3>Yo‘l</h3>
          <div class="yol">${yolniChiz(o.status)}</div>
        </div>
      </div>

      <div class="panel-oyoq">
        ${keyin && o.status !== 'bekor'
          ? `<button class="tug asos keng katta" id="t-keyingi">${esc(keyin.nom)} ga o‘tkazish</button>`
          : ''}
        <div style="display:flex;gap:8px">
          <button class="tug" id="t-boshqa" style="flex:1">Boshqa bosqich</button>
          ${o.status !== 'bekor'
            ? '<button class="tug xavf" id="t-bekor">Bekor qilish</button>' : ''}
        </div>
      </div>`;

    $('#panel').hidden = false;
    $('#panel-parda').hidden = window.matchMedia('(min-width:900px)').matches;
    $('#t-panel-yop').onclick = panelniYop;

    const ok = $('#t-tolov-ok'), yoq = $('#t-tolov-yoq');
    if (ok)  ok.onclick  = () => tolov(o.id, 'tolangan');
    if (yoq) yoq.onclick = () => tolov(o.id, 'kutilmoqda');

    const keyingi = $('#t-keyingi');
    if (keyingi) keyingi.onclick = () => holatniQoy(o, keyin.kalit);
    $('#t-boshqa').onclick = () => boshqaBosqich(o);
    const bekor = $('#t-bekor');
    if (bekor) bekor.onclick = () => bekorQil(o);
  }

  /** Buyurtma yo'lining qaysi nuqtasida turgani. */
  function yolniChiz(joriy) {
    if (joriy === 'bekor') {
      return `<div class="yol-qadam joriy"><i></i>Bekor qilindi</div>`;
    }
    const n = holat.bosqichlar.findIndex((b) => b.kalit === joriy);
    return holat.bosqichlar.map((b, i) => `<div class="yol-qadam ${
      i < n ? 'otgan' : i === n ? 'joriy' : ''}"><i></i>${esc(b.nom)}</div>`).join('');
  }

  // ══════════ AMALLAR ══════════
  async function holatniQoy(o, yangi, qosh = {}) {
    try {
      await api('/api/admin/order-status', { method: 'POST',
        body: JSON.stringify({ id: o.id, status: yangi, ...qosh }) });
      oynaYop(); panelniYop();
      tost(`${o.order_no} → ${bosqichNomi(yangi)}`);
      yukla();
    } catch (e) { tost(e.message, 'xato'); }
  }

  function boshqaBosqich(o) {
    oyna('Boshqa bosqichga o‘tkazish', `
      <div class="holat-royxat">
        ${holat.bosqichlar.filter((b) => b.kalit !== o.status)
          .map((b) => `<button class="tug" data-h="${b.kalit}">${esc(b.nom)}</button>`).join('')}
      </div>`);
    $$('[data-h]').forEach((b) => b.onclick = () => bosqichgaOtkaz(o, b.dataset.h));
  }

  /* Ba'zi bosqichlar QO'SHIMCHA ma'lumot so'raydi: pochtaga
   * berilganda mijoz aynan «qayerga ketdi» degan javobni kutadi.
   * Izohsiz o'tkazilsa xabar quruq chiqadi. */
  function bosqichgaOtkaz(o, yangi) {
    if (yangi === 'bekor') return bekorQil(o);
    if (yangi === 'pochta_jonatildi') {
      const joy = o.yetkazish_turi === 'uy' ? 'uy manziliga' : 'eng yaqin filialga';
      oyna('Qayerga jo‘natildi?', `
        <p>Mijozga xabar bo‘lib boradi. Bo‘sh qoldirsangiz faqat
          «${esc(joy)}» deb ketadi.</p>
        <input id="pochta-izoh" maxlength="300" value="${esc(o.pochta_izoh || '')}"
          placeholder="Chilonzor 12-filial · AB123456789UZ">
        <div class="oyna-tugmalar">
          <button class="tug" data-yop>Bekor</button>
          <button class="tug asos" id="t-ok">Jo‘natildi</button>
        </div>`);
      $('#t-ok').onclick = () =>
        holatniQoy(o, yangi, { pochta_izoh: $('#pochta-izoh').value.trim() });
      return;
    }
    holatniQoy(o, yangi);
  }

  function bekorQil(o) {
    oyna('Bekor qilish', `
      <p>Sabab mijozga xabar bo‘lib boradi. Mahsulotlar omborga qaytadi.</p>
      <input id="bekor-sabab" maxlength="200" placeholder="Masalan: mahsulot tugadi">
      <div class="oyna-tugmalar">
        <button class="tug" data-yop>Qaytish</button>
        <button class="tug xavf" id="t-ok">Bekor qilish</button>
      </div>`);
    $('#t-ok').onclick = () =>
      holatniQoy(o, 'bekor', { reason: $('#bekor-sabab').value.trim() });
  }

  async function tolov(id, qiymat) {
    try {
      await api('/api/admin/payment-status', { method: 'POST',
        body: JSON.stringify({ id, payment_status: qiymat }) });
      panelniYop();
      tost(qiymat === 'tolangan' ? 'To‘lov tasdiqlandi' : 'Qayta so‘raldi');
      yukla();
    } catch (e) { tost(e.message, 'xato'); }
  }

  // ══════════ OYNA ══════════
  function oyna(sarlavhaMatn, html) {
    $('#oyna').innerHTML = `<h3>${esc(sarlavhaMatn)}</h3>${html}`;
    $('#oyna').hidden = false;
    $('#oyna-parda').hidden = false;
    $$('[data-yop]').forEach((b) => b.onclick = oynaYop);
  }
  function oynaYop() { $('#oyna').hidden = true; $('#oyna-parda').hidden = true; }
  $('#oyna-parda').onclick = oynaYop;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#oyna').hidden) return oynaYop();
    if (!$('#panel').hidden) return panelniYop();
  });

  // ══════════ QIDIRUV ══════════
  let qidiruvTimer;
  $('#q').oninput = (e) => {
    clearTimeout(qidiruvTimer);
    qidiruvTimer = setTimeout(() => {
      holat.q = e.target.value.trim();
      holat.surish = 0;
      yukla();
    }, 280);
  };

  $('#t-yangila').onclick = () => { holat.surish = 0; yukla(); };
  $('#t-chiq').onclick = chiqish;

  // ══════════ BOSHLASH ══════════
  function boshla() { yukla(); }

  if (holat.token) { $('#ish').hidden = false; boshla(); }
  else kirishEkrani();
})();
