/* KiOVO admin — mobil uchun mo'ljallangan boshqaruv paneli. */
(() => {
'use strict';

// ═══════════ ASOSIY YORDAMCHILAR ═══════════
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const som = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
const narx = (n) => som(n) + " so'm";
const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);
const sana = (d) => new Date(d).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' });
const vaqt = (d) => new Date(d).toLocaleString('uz-UZ', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
const OYLAR = ['yanvar','fevral','mart','aprel','may','iyun',
               'iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const bugun = () => { const d = new Date(); return `${d.getDate()}-${OYLAR[d.getMonth()]}`; };

const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch {}

const holat = { token: localStorage.getItem('qq_admin') || '', bolim: 'boshqaruv', kesh: {} };

/** Qisqa bildirishnoma. */
let tostTimer;
function tost(matn, tur = '') {
  $('.tost')?.remove();
  const el = document.createElement('div');
  el.className = 'tost'; el.textContent = matn;
  if (tur === 'xato') el.style.background = 'var(--qizil)';
  document.body.appendChild(el);
  clearTimeout(tostTimer);
  tostTimer = setTimeout(() => el.remove(), 2600);
  try { tg?.HapticFeedback?.notificationOccurred?.(tur === 'xato' ? 'error' : 'success'); } catch {}
}

/**
 * API chaqiruvi. Tarmoq uzilsa bir marta qayta uriniladi;
 * sessiya tugasa kirish ekraniga qaytaradi.
 */
async function api(yol, opt = {}, qayta = true) {
  let res;
  try {
    res = await fetch(yol, {
      ...opt,
      headers: { 'Content-Type': 'application/json',
                 Authorization: `Bearer ${holat.token}`, ...(opt.headers || {}) },
    });
  } catch (e) {
    if (qayta) { await new Promise((r) => setTimeout(r, 800)); return api(yol, opt, false); }
    throw new Error('Internet aloqasi yo‘q');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { chiqish(); throw new Error(data.error || 'Sessiya tugadi'); }
  if (!res.ok) throw new Error(data.error || `Xatolik (${res.status})`);
  return data;
}

// ═══════════ MODAL ═══════════
function modal(sarlavha, html, { keng = false } = {}) {
  $('#modal-tan').innerHTML = `
    <div class="modal-bosh"><h2>${esc(sarlavha)}</h2>
      <button class="yop" data-yop aria-label="Yopish">✕</button></div>
    <div style="padding-top:14px">${html}</div>`;
  $('#modal .oyna').style.maxWidth = keng ? '760px' : '640px';
  kor($('#modal'), true);
  $$('[data-yop]').forEach((el) => el.onclick = modalYop);
}
const modalYop = () => kor($('#modal'), false);
$$('[data-yop]').forEach((el) => el.onclick = modalYop);

function tasdiqla(savol, izoh, amal, { xavf = false } = {}) {
  modal(savol, `
    <p class="mayda">${esc(izoh)}</p>
    <div style="display:flex;gap:9px;margin-top:20px">
      <button class="tug" data-yop style="flex:1">Bekor</button>
      <button class="tug ${xavf ? 'xavf' : 'asos'}" id="t-tasdiq" style="flex:1">Ha, davom etamiz</button>
    </div>`);
  $('#t-tasdiq').onclick = async () => { modalYop(); await amal(); };
}

// ═══════════ KIRISH ═══════════
async function boshla() {
  // Telegram Mini App sifatida ochilgan bo'lsa — avtomatik kirishga urinamiz
  if (tg?.initData) {
    kor($('#tg-quti'), true);
    try {
      const j = await tgKirish();
      if (j) return ochil();
    } catch { /* qo'lda kirsin */ }
  }
  if (holat.token) {
    try { await api('/api/admin/dashboard'); return ochil(); } catch { /* token eskirgan */ }
  }
  kor($('#kirish'), true);
}

async function tgKirish() {
  const res = await fetch('/api/admin/tg-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg.initData },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Kirish rad etildi');
  holat.token = j.token;
  localStorage.setItem('qq_admin', j.token);
  holat.admin = j.admin;
  return j;
}

$('#t-tg-kirish').onclick = async () => {
  const xato = $('#kirish-xato'); xato.textContent = '';
  try { await tgKirish(); ochil(); }
  catch (e) { xato.textContent = e.message; }
};

$('#kirish-forma').onsubmit = async (e) => {
  e.preventDefault();
  const xato = $('#kirish-xato'); xato.textContent = '';
  const tugma = e.target.querySelector('button');
  tugma.disabled = true;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: $('#k-login').value, password: $('#k-parol').value }),
    });
    const j = await res.json();
    if (!j.token) throw new Error(j.error || 'Kirish rad etildi');
    holat.token = j.token;
    localStorage.setItem('qq_admin', j.token);
    ochil();
  } catch (err) { xato.textContent = err.message; }
  finally { tugma.disabled = false; }
};

function chiqish() {
  holat.token = ''; localStorage.removeItem('qq_admin');
  kor($('#panel'), false); kor($('#kirish'), true);
}
$('#t-chiq-yon').onclick = chiqish;

function ochil() {
  kor($('#kirish'), false); kor($('#panel'), true);
  bolimOch(location.hash.slice(1) || 'boshqaruv');
  nishonlarniYangila();
  setInterval(nishonlarniYangila, 60000);   // yangi buyurtmalarni kuzatib turadi
}

// ═══════════ MARSHRUT ═══════════
const BOLIMLAR = {
  boshqaruv: { nom: 'Boshqaruv',    chiz: () => boshqaruv() },
  buyurtma:  { nom: 'Buyurtmalar',  chiz: () => buyurtmalar() },
  mahsulot:  { nom: 'Mahsulotlar',  chiz: () => mahsulotlar() },
  market:    { nom: 'Marketplace',  chiz: () => marketplace() },
  havola:    { nom: 'Havolasizlar', chiz: () => havolasizlar() },
  bolim:     { nom: 'Bo‘limlar',    chiz: () => bolimlar() },
  mijoz:     { nom: 'Mijozlar',     chiz: () => mijozlar() },
  sotuv:     { nom: 'Sotuvlar',     chiz: () => sotuvlar() },
  ombor:     { nom: 'Omborlar',     chiz: () => omborlar() },
  sozlama:   { nom: 'Sozlamalar',   chiz: () => sozlamalar() },
  xabar:     { nom: 'Xabarlar',     chiz: () => xabarlar() },
  tizim:     { nom: 'Tizim holati', chiz: () => tizim() },
  qollanma:  { nom: 'Qo‘llanma',    chiz: () => qollanma() },
};

function bolimOch(nom) {
  if (!BOLIMLAR[nom]) nom = 'boshqaruv';
  holat.bolim = nom;
  location.hash = nom;
  $('#tepa-nom').textContent = BOLIMLAR[nom].nom;
  $$('.yon button[data-b], .past-menyu button[data-b]').forEach((b) =>
    b.classList.toggle('faol', b.dataset.b === nom));
  $('#tan').scrollTop = 0; window.scrollTo({ top: 0 });
  yuklanmoqda();
  BOLIMLAR[nom].chiz();
}

$$('.yon button[data-b], .past-menyu button[data-b]').forEach((b) =>
  b.onclick = () => bolimOch(b.dataset.b));

// Telefonda «orqaga» tugmasi asosiy harakat — u ham bo'limni almashtirsin.
// (bolimOch o'zi ham hash yozadi, shuning uchun takror chizishdan saqlanamiz.)
window.addEventListener('hashchange', () => {
  const nom = location.hash.slice(1) || 'boshqaruv';
  if (nom !== holat.bolim && !$('#panel').classList.contains('yashirin')) bolimOch(nom);
});
$('#t-yangila').onclick = () => { holat.kesh = {}; bolimOch(holat.bolim); tost('Yangilandi'); };

const KOP_MENYU = ['market', 'havola', 'bolim', 'sotuv', 'ombor', 'sozlama', 'xabar', 'tizim', 'qollanma'];
const kopMenyu = () => modal('Ko‘proq', `
  <div style="display:grid;gap:8px">
    ${KOP_MENYU.map((k) => `<button class="tug keng" data-kop="${k}"
      style="justify-content:flex-start">${esc(BOLIMLAR[k].nom)}</button>`).join('')}
    <button class="tug xavf keng" id="t-chiq" style="margin-top:8px">↩︎ Chiqish</button>
  </div>`);
$('#t-kop').onclick = kopMenyu;
$('#t-kop2').onclick = kopMenyu;
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-kop]');
  if (b) { modalYop(); bolimOch(b.dataset.kop); }
  if (e.target.id === 't-chiq') { modalYop(); chiqish(); }
});

// ═══════════ UMUMIY CHIZISH ═══════════
const yuklanmoqda = (n = 3) => {
  $('#tan').innerHTML = `<div style="padding:0 16px">${
    Array.from({ length: n }, () => `<div class="karta">
      <div class="skelet" style="width:40%"></div>
      <div class="skelet" style="width:75%"></div>
      <div class="skelet" style="width:55%"></div></div>`).join('')}</div>`;
};
const xatoChiz = (e) => {
  $('#tan').innerHTML = `<div class="xabar-quti xato">${esc(e.message)}</div>
    <div style="padding:0 16px"><button class="tug keng" onclick="location.reload()">Qayta yuklash</button></div>`;
};
const boshHolat = (belgi, matn, tugma = '') =>
  `<div class="bosh-holat"><div class="belgi">${belgi}</div><p>${esc(matn)}</p>${tugma}</div>`;

const kpi = (k, v, q = '', urgu = false) =>
  `<div class="kpi${urgu ? ' urgu' : ''}"><div class="k">${esc(k)}</div>
   <div class="v">${v}</div>${q ? `<div class="q">${esc(q)}</div>` : ''}</div>`;

async function nishonlarniYangila() {
  if (!holat.token) return;
  try {
    const d = await api('/api/admin/dashboard');
    const soni = d.kpi.yangi_buyurtma;
    [$('#yon-nishon'), $('#past-nishon')].forEach((el) => {
      if (!el) return;
      el.textContent = soni; kor(el, soni > 0);
    });
  } catch { /* jim: nishon muhim emas */ }
}

// ═══════════ 1. BOSHQARUV ═══════════
async function boshqaruv() {
  try {
    const d = await api('/api/admin/dashboard');
    const k = d.kpi, p = d.prognoz;
    const maxKun = Math.max(1, ...d.kunlar.map((x) => x.daromad));

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Boshqaruv</h1>
        <span class="ozgina">${bugun()}</span></div>

      ${k.yangi_buyurtma ? `<div class="xabar-quti ogoh">
        📦 <b>${k.yangi_buyurtma} ta yangi buyurtma</b> ko‘rib chiqilmagan
        <button class="tug kichik" data-b2="buyurtma" style="margin-left:8px">Ochish</button></div>` : ''}
      ${d.ombor.tugagan ? `<div class="xabar-quti xato">
        ⚠️ <b>${d.ombor.tugagan} ta mahsulot tugagan</b> — mijoz sotib ololmaydi</div>` : ''}

      <div class="kpi-tor">
        ${kpi('Jami daromad', narx(k.jami_daromad), `${k.buyurtma_soni} ta buyurtma`)}
        ${kpi('Yalpi foyda', narx(k.yalpi_foyda), `marja ${k.marja_foiz}%`)}
        ${kpi("O‘rtacha chek", narx(k.ortacha_chek))}
        ${kpi('Bu oy', narx(k.oy_daromadi), `kuniga ~${som(p.kunlik_ortacha)}`)}
        ${kpi('Mijozlar', som(k.foydalanuvchi), `${som(k.royxatdan_otgan)} ro‘yxatdan o‘tgan`)}
        ${kpi('Yangi buyurtma', som(k.yangi_buyurtma))}
        ${kpi('Omborda tugagan', som(d.ombor.tugagan), `${som(d.ombor.kam)} ta kam qolgan`)}
        ${kpi('Ombor qiymati', narx(d.ombor.qiymat), 'tannarx bo‘yicha')}
      </div>

      <div class="karta">
        <div class="karta-bosh"><h2>💰 Daromad prognozi</h2>
          <span class="yor kok">${p.tugallanish_ehtimoli}%</span></div>
        <div class="qator-satr"><span class="k">Yo‘lda (kutilayotgan)</span>
          <span class="v">${narx(p.kutilayotgan_summa)}</span></div>
        <div class="qator-satr"><span class="k">Shundan kutilma</span>
          <span class="v">${narx(p.kutilayotgan_kutilma)}</span></div>
        <div class="qator-satr"><span class="k">Oy oxiri prognozi</span>
          <span class="v" style="color:var(--urgu)">${narx(p.oy_oxiri_prognoz)}</span></div>
        <p class="ozgina" style="margin-top:10px">${esc(p.izoh)} ${p.qolgan_kunlar} kun qoldi.</p>
      </div>

      <div class="karta">
        <div class="karta-bosh"><h2>📈 So‘nggi 14 kun</h2>
          <span class="ozgina">eng yuqori ${narx(maxKun)}</span></div>
        <div class="grafik">${d.kunlar.map((x) => `<div style="height:${Math.round(x.daromad / maxKun * 100)}%"
          title="${x.kun}: ${narx(x.daromad)}"></div>`).join('')}</div>
        <div class="grafik-x">${d.kunlar.map((x) => `<span>${x.kun.slice(8)}</span>`).join('')}</div>
      </div>

      <div class="karta voronka">
        <div class="karta-bosh"><h2>🔻 Voronka (30 kun)</h2></div>
        ${voronkaQator('Botni ochgan', d.voronka.start, d.voronka.start)}
        ${voronkaQator('Ro‘yxatdan o‘tgan', d.voronka.register, d.voronka.start)}
        ${voronkaQator('Skaner ishlatgan', d.voronka.scan, d.voronka.start)}
        ${voronkaQator('Savatga qo‘shgan', d.voronka.add_cart, d.voronka.start)}
        ${voronkaQator('Buyurtma bergan', d.voronka.order, d.voronka.start)}
        <p class="ozgina" style="margin-top:8px">
          Rad etilgan skanerlar: ${som(d.voronka.scan_rejected)} ta</p>
      </div>`;
    $$('[data-b2]').forEach((b) => b.onclick = () => bolimOch(b.dataset.b2));
  } catch (e) { xatoChiz(e); }
}

const voronkaQator = (nom, son, asos) => `
  <div class="q"><div class="nom">${esc(nom)}</div>
    <div class="chiziq"><i style="width:${asos ? Math.round(son / asos * 100) : 0}%"></i></div>
    <div class="son">${som(son)}${asos ? ` · ${Math.round(son / asos * 100)}%` : ''}</div></div>`;

// ═══════════ 2. BUYURTMALAR ═══════════
// Koreyadan mijozgacha bo'lgan yo'l. Tartib SHU YERDA — Postgres enum'idagi
// tartib tarixiy sabablarga ko'ra boshqacha (src/lib/bosqichlar.js ga qarang).
const HOLATLAR = {
  yangi:            ['🆕 Yangi',                  'kok'],
  tasdiqlangan:     ['✅ To‘lov tasdiqlandi',     'urgu'],
  qadoqlanmoqda:    ['📦 Koreyada qadoqlanmoqda', 'sariq'],
  korea_jonatildi:  ['✈️ Koreyadan jo‘natildi',   'sariq'],
  yolda:            ['🌍 Yo‘lda',                 'sariq'],
  omborda:          ['🏢 O‘zbekiston omborida',   'kok'],
  pochta_jonatildi: ['📮 Pochtadan jo‘natildi',   'kok'],
  yetkazildi:       ['🎉 Yetib keldi',            'yashil'],
  bekor:            ['❌ Bekor',                  'qizil'],
};
const TOLOV = {
  kutilmoqda:      ['⏳ To‘lov kutilmoqda', 'sariq'],
  chek_yuborilgan: ['📄 Chek keldi',        'kok'],
  tolangan:        ['✅ To‘langan',         'yashil'],
  naqd:            ['💵 Naqd',              'kul'],
};

async function buyurtmalar(filtr = '') {
  try {
    const j = await api('/api/admin/orders' + (filtr ? `?status=${filtr}` : ''));
    holat.kesh.buyurtmalar = j.buyurtmalar;

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Buyurtmalar</h1>
        <span class="ozgina">${j.buyurtmalar.length} ta</span></div>
      <div style="padding:0 16px 12px;display:flex;gap:7px;overflow-x:auto">
        <button class="tug kichik ${!filtr ? 'asos' : ''}" data-f="">Barchasi</button>
        ${Object.entries(HOLATLAR).map(([k, [n]]) =>
          `<button class="tug kichik ${filtr === k ? 'asos' : ''}" data-f="${k}"
            style="white-space:nowrap">${n}</button>`).join('')}
      </div>
      ${j.buyurtmalar.length ? j.buyurtmalar.map(buyurtmaKarta).join('')
        : boshHolat('📭', 'Bu holatda buyurtma yo‘q')}`;

    $$('[data-f]').forEach((b) => b.onclick = () => { yuklanmoqda(); buyurtmalar(b.dataset.f); });
    $$('[data-buyurtma]').forEach((b) => b.onclick = () =>
      buyurtmaOyna(holat.kesh.buyurtmalar.find((o) => o.id === Number(b.dataset.buyurtma))));
  } catch (e) { xatoChiz(e); }
}

function buyurtmaKarta(o) {
  const [hn, hs] = HOLATLAR[o.status] || [o.status, 'kul'];
  const [tn, ts] = TOLOV[o.payment_status] || ['—', 'kul'];
  const foyda = o.total - o.delivery_fee + o.discount - o.cost_total;
  return `
  <div class="qator-karta" data-buyurtma="${o.id}" style="cursor:pointer">
    <div class="qator-bosh">
      <div><div class="nom">${esc(o.order_no)}</div>
        <div class="ozgina">${vaqt(o.created_at)}</div></div>
      <span class="yor ${hs}">${hn}</span>
    </div>
    <div style="margin-top:9px">
      <div class="qator-satr"><span class="k">👤 ${esc(o.customer_name || '—')}</span>
        <span class="v">${esc(o.customer_phone || '')}</span></div>
      <div class="qator-satr"><span class="k">📍 ${esc([o.viloyat, o.tuman].filter(Boolean).join(', ') || '—')}</span>
        <span class="v"><span class="yor ${ts}">${tn}</span></span></div>
      <div class="qator-satr"><span class="k">🧾 ${o.items.length} ta mahsulot</span>
        <span class="v">${narx(o.total)}</span></div>
      <div class="qator-satr"><span class="k">💵 Foyda</span>
        <span class="v" style="color:var(--yashil)">${som(foyda)}</span></div>
    </div>
  </div>`;
}

function buyurtmaOyna(o) {
  if (!o) return;
  const [hn] = HOLATLAR[o.status] || [o.status];
  modal(o.order_no, `
    <div class="qator-satr"><span class="k">Holat</span><span class="v">${hn}</span></div>
    <div class="qator-satr"><span class="k">Mijoz</span><span class="v">${esc(o.customer_name || '—')}</span></div>
    <div class="qator-satr"><span class="k">Telefon</span>
      <span class="v"><a href="tel:${esc(String(o.customer_phone || '').replace(/[^+\d]/g, ''))}">${esc(o.customer_phone || '—')}</a></span></div>
    <div class="qator-satr"><span class="k">Manzil</span>
      <span class="v" style="max-width:60%">${esc(o.customer_address || '—')}</span></div>
    ${o.note ? `<div class="qator-satr"><span class="k">Izoh</span><span class="v">${esc(o.note)}</span></div>` : ''}

    <h3 style="margin:18px 0 6px">Mahsulotlar</h3>
    ${o.items.map((i) => `<div class="qator-satr">
      <span class="k">${esc(i.name)} × ${i.qty}</span>
      <span class="v">${som(i.price * i.qty)}</span></div>`).join('')}
    ${o.discount ? `<div class="qator-satr"><span class="k">Chegirma</span>
      <span class="v" style="color:var(--yashil)">−${som(o.discount)}</span></div>` : ''}
    <div class="qator-satr"><span class="k">Yetkazish</span><span class="v">${som(o.delivery_fee)}</span></div>
    <div class="qator-satr"><span class="k"><b>Jami</b></span>
      <span class="v" style="font-size:18px">${narx(o.total)}</span></div>

    ${o.receipt_id ? `<h3 style="margin:18px 0 8px">To‘lov cheki</h3>
      <img src="/media/${esc(o.receipt_id)}?t=${encodeURIComponent(holat.token)}"
           alt="Chek" style="width:100%;border-radius:12px;background:var(--fon)">
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="tug asos" id="t-tolov-ok" style="flex:1">✅ To‘lov tasdiqlandi</button>
        <button class="tug" id="t-tolov-yoq">↩︎ Qayta so‘rash</button>
      </div>`
    : `<div class="xabar-quti ogoh" style="margin:16px 0 0">Chek hali yuborilmagan</div>`}

    <h3 style="margin:20px 0 8px">Holatni o‘zgartirish</h3>
    <div style="display:grid;gap:8px">
      ${Object.entries(HOLATLAR).filter(([k]) => k !== o.status).map(([k, [n]]) =>
        `<button class="tug keng" data-holat="${k}" style="justify-content:flex-start">${n}</button>`).join('')}
    </div>`, { keng: true });

  $$('[data-holat]').forEach((b) => b.onclick = () => holatOzgartir(o, b.dataset.holat));
  const ok = $('#t-tolov-ok'), yoq = $('#t-tolov-yoq');
  if (ok) ok.onclick = () => tolovHolati(o.id, 'tolangan');
  if (yoq) yoq.onclick = () => tolovHolati(o.id, 'kutilmoqda');
}

async function holatOzgartir(o, yangi) {
  const amal = async (sabab) => {
    try {
      await api('/api/admin/order-status', { method: 'POST',
        body: JSON.stringify({ id: o.id, status: yangi, reason: sabab || null }) });
      modalYop(); tost('Holat o‘zgartirildi'); yuklanmoqda(); buyurtmalar();
    } catch (e) { tost(e.message, 'xato'); }
  };
  if (yangi === 'bekor') {
    modal('Bekor qilish sababi', `
      <p class="mayda">Sabab mijozga xabar bo‘lib boradi. Mahsulotlar omborga qaytadi.</p>
      <input id="bekor-sabab" placeholder="Masalan: mahsulot tugadi" style="margin-top:12px">
      <button class="tug xavf keng" id="t-bekor" style="margin-top:16px">Bekor qilish</button>`);
    $('#t-bekor').onclick = () => amal($('#bekor-sabab').value.trim());
    return;
  }
  if (yangi === 'omborda') {
    return tasdiqla('Omborga yetib keldimi?',
      'Mijozga eng yaqin ombor manzili va telefoni yuboriladi.', () => amal());
  }
  amal();
}

async function tolovHolati(id, holatNomi) {
  try {
    await api('/api/admin/payment-status', { method: 'POST',
      body: JSON.stringify({ id, payment_status: holatNomi }) });
    modalYop(); tost(holatNomi === 'tolangan' ? 'To‘lov tasdiqlandi' : 'Qayta so‘raldi');
    yuklanmoqda(); buyurtmalar();
  } catch (e) { tost(e.message, 'xato'); }
}

// ═══════════ 3. MAHSULOTLAR ═══════════
const BOSQICHLAR = { tozalash:'🫧 Tozalash', toner:'💧 Toner', davolash:'🧪 Davolash (serum)',
                     namlash:'🫙 Namlash', himoya:'☀️ Quyoshdan himoya', qoshimcha:'🎭 Qo‘shimcha',
                     ichki:'💊 Ichki qabul' };
const MUAMMOLAR = ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','quyosh'];
const TERILAR = ['quruq','yogli','aralash','normal','sezgir','barcha'];

async function mahsulotlar(qidiruv = '') {
  try {
    const j = await api('/api/admin/products');
    holat.kesh.mahsulotlar = j.mahsulotlar;
    holat.kesh.kategoriyalar = j.kategoriyalar;
    const q = qidiruv.toLowerCase();
    const royxat = q
      ? j.mahsulotlar.filter((p) => `${p.name} ${p.brand || ''}`.toLowerCase().includes(q))
      : j.mahsulotlar;

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Mahsulotlar</h1><span class="ozgina">${royxat.length} ta</span></div>
      <div style="padding:0 16px 12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="tug asos" id="t-toplam" style="flex:1 1 100%">
          📦 Ko‘p rasmdan birdan qo‘shish</button>
        <button class="tug" id="t-skrin" style="flex:1">📷 Bitta rasmdan</button>
        <button class="tug" id="t-yangi" style="flex:1">+ Qo‘lda</button>
      </div>
      <div style="padding:0 16px 12px">
        <input id="m-qidiruv" placeholder="🔍 Nom yoki brend" value="${esc(qidiruv)}">
      </div>
      ${royxat.length ? royxat.map(mahsulotKarta).join('') : boshHolat('🔍', 'Topilmadi')}`;

    let t; $('#m-qidiruv').oninput = (e) => {
      clearTimeout(t); const v = e.target.value;
      t = setTimeout(() => { mahsulotlar(v); setTimeout(() => $('#m-qidiruv')?.focus(), 0); }, 300);
    };
    $('#t-yangi').onclick = () => mahsulotOyna(null);
    $('#t-skrin').onclick = skrinshotOyna;
    $('#t-toplam').onclick = toplamOyna;
    $$('[data-mah]').forEach((b) => b.onclick = () =>
      mahsulotOyna(holat.kesh.mahsulotlar.find((p) => p.id === Number(b.dataset.mah))));
    $$('[data-poster]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      posterOyna(holat.kesh.mahsulotlar.find((p) => p.id === Number(b.dataset.poster)));
    });
  } catch (e) { xatoChiz(e); }
}

function mahsulotKarta(p) {
  const marja = p.price ? Math.round((p.price - p.cost_price) / p.price * 100) : 0;
  const omborYor = p.stock === 0 ? 'qizil' : p.stock <= 5 ? 'sariq' : 'yashil';
  return `
  <div class="qator-karta" style="${p.is_active ? '' : 'opacity:.5'}">
    <div class="qator-bosh" data-mah="${p.id}" style="cursor:pointer">
      <div style="display:flex;gap:10px;align-items:flex-start;min-width:0">
        <span style="font-size:26px;flex:0 0 auto">${esc(p.emoji || '🧴')}</span>
        <div style="min-width:0">
          <div class="nom">${esc(p.name)}</div>
          <div class="ozgina">${esc(p.brand || '')}${p.volume ? ' · ' + esc(p.volume) : ''}
            ${p.ai_filled ? '<span class="yor kok" style="margin-left:4px">AI</span>' : ''}</div>
        </div>
      </div>
      <span class="yor ${omborYor}">${p.stock} dona</span>
    </div>
    <div style="margin-top:9px">
      <div class="qator-satr"><span class="k">Narx / tannarx</span>
        <span class="v">${som(p.price)} / ${som(p.cost_price)}</span></div>
      <div class="qator-satr"><span class="k">Marja</span>
        <span class="v"><span class="yor ${marja >= 35 ? 'yashil' : marja >= 20 ? 'sariq' : 'qizil'}">${marja}%</span></span></div>
      <div class="qator-satr"><span class="k">Sotilgan</span><span class="v">${p.sold_count} dona</span></div>
    </div>
    <div class="amallar">
      <button class="tug kichik" data-mah="${p.id}">✏️ Tahrirlash</button>
      <button class="tug kichik" data-poster="${p.id}">📢 Poster</button>
    </div>
  </div>`;
}

function mahsulotOyna(p) {
  const yangi = !p?.id;
  const katId = p?.category_id ?? holat.kesh.kategoriyalar?.find((c) => c.slug === p?.category)?.id ?? '';
  const belgi = (royxat, tanlangan, nom) => royxat.map((v) =>
    `<label class="belgi-qator"><input type="checkbox" name="${nom}" value="${v}"
      ${(tanlangan || []).includes(v) ? 'checked' : ''}>${v}</label>`).join('');

  modal(yangi ? 'Yangi mahsulot' : 'Mahsulotni tahrirlash', `
    ${p?.ai_filled && yangi ? `<div class="xabar-quti ok" style="margin:0 0 12px">
      AI to‘ldirdi — tekshirib chiqing</div>` : ''}
    <label>Nomi *</label><input id="m-name" value="${esc(p?.name || '')}">
    <div class="forma-tor">
      <div><label>Brend</label><input id="m-brand" value="${esc(p?.brand || '')}"></div>
      <div><label>Hajm</label><input id="m-volume" value="${esc(p?.volume || '')}" placeholder="150 ml"></div>
      <div><label>Kategoriya</label><select id="m-cat">
        ${(holat.kesh.kategoriyalar || []).map((c) => `<option value="${c.id}"
          ${c.id === katId ? 'selected' : ''}>${esc(c.emoji || '')} ${esc(c.name)}</option>`).join('')}
      </select></div>
      <div><label>Parvarish bosqichi</label><select id="m-step">
        ${Object.entries(BOSQICHLAR).map(([k, n]) => `<option value="${k}"
          ${k === p?.step ? 'selected' : ''}>${n}</option>`).join('')}
      </select></div>
      <div><label>Narx (so‘m) *</label><input id="m-price" type="number" inputmode="numeric" value="${p?.price || ''}"></div>
      <div><label>Tannarx (so‘m)</label><input id="m-cost" type="number" inputmode="numeric" value="${p?.cost_price || ''}"></div>
      <div><label>Ombor (dona)</label><input id="m-stock" type="number" inputmode="numeric" value="${p?.stock ?? 0}"></div>
      <div><label>Og‘irlik (gramm)
        <span class="yordam">yetkazish narxi shunga qarab</span></label>
        <input id="m-ogirlik" type="number" inputmode="numeric" min="0"
          value="${p?.ogirlik || ''}" placeholder="150"></div>
      <div><label>Emoji</label><input id="m-emoji" value="${esc(p?.emoji || '🧴')}" maxlength="4"></div>
    </div>
    <label>🔗 Qayerdan olinadi <span class="yordam">Coupang yoki Daiso havolasi</span></label>
    <input id="m-manba" type="url" inputmode="url" placeholder="https://www.coupang.com/vp/products/..."
      value="${esc(p?.manba_url || '')}">
    <p class="mayda" style="margin:6px 0 0">
      Bu havola <b>/orders</b> xarid ro‘yxatida mahsulot nomiga bog‘lanadi —
      xodim bosib to‘g‘ridan-to‘g‘ri sotib olish sahifasiga o‘tadi.</p>

    <label>Tavsif — nima qiladi</label><textarea id="m-desc">${esc(p?.description || '')}</textarea>
    <label>Qanday foydalanish</label><textarea id="m-usage">${esc(p?.usage_text || '')}</textarea>
    <label>Tarkibi (INCI)</label><textarea id="m-ing">${esc(p?.ingredients || '')}</textarea>
    <label>Ehtiyot choralari</label><input id="m-warn" value="${esc(p?.warnings || '')}">
    <label>Faol moddalar <span class="yordam">vergul bilan</span></label>
    <input id="m-act" value="${esc((p?.actives || []).join(', '))}">
    <label>Qaysi muammoga yordam beradi <span class="yordam">qidiruvda ishlaydi</span></label>
    <div>${belgi(MUAMMOLAR, p?.concerns, 'concern')}</div>
    <label>Kimga mos</label><div>${belgi(TERILAR, p?.skin_types, 'skin')}</div>
    <label class="belgi-qator" style="margin-top:16px">
      <input type="checkbox" id="m-faol" ${p?.is_active !== false ? 'checked' : ''}> Katalogda ko‘rinsin</label>
    <div id="m-xato" class="xato"></div>
    <button class="tug asos keng" id="m-saqla" style="margin-top:18px">Saqlash</button>
    ${p?.id ? `<button class="tug xavf keng" id="m-ochir" style="margin-top:9px">
      🗑 Mahsulotni o‘chirish</button>` : ''}`, { keng: true });

  const och = $('#m-ochir');
  if (och) och.onclick = () => mahsulotniOchirOyna(p);

  $('#m-saqla').onclick = async () => {
    const xato = $('#m-xato');
    const tana = {
      id: p?.id || undefined,
      name: $('#m-name').value.trim(), brand: $('#m-brand').value.trim(),
      category_id: Number($('#m-cat').value) || null, step: $('#m-step').value,
      price: Number($('#m-price').value), cost_price: Number($('#m-cost').value) || 0,
      stock: Number($('#m-stock').value) || 0, volume: $('#m-volume').value.trim(),
      country: p?.country || 'KR', emoji: $('#m-emoji').value.trim(),
      description: $('#m-desc').value.trim(), usage_text: $('#m-usage').value.trim(),
      ingredients: $('#m-ing').value.trim(), warnings: $('#m-warn').value.trim(),
      actives: $('#m-act').value.split(',').map((s) => s.trim()).filter(Boolean),
      concerns: $$('input[name=concern]:checked').map((i) => i.value),
      skin_types: $$('input[name=skin]:checked').map((i) => i.value),
      is_active: $('#m-faol').checked, ai_filled: Boolean(p?.ai_filled),
      manba_url: $('#m-manba').value.trim(),
      ogirlik: Math.max(0, Number($('#m-ogirlik').value) || 0),
    };
    if (!tana.name)  return xato.textContent = 'Nomi kerak.';
    if (!tana.price) return xato.textContent = 'Narx kerak.';
    $('#m-saqla').disabled = true;
    try {
      await api('/api/admin/product', { method: 'POST', body: JSON.stringify(tana) });
      modalYop(); tost('Saqlandi'); yuklanmoqda(); mahsulotlar();
    } catch (e) { xato.textContent = e.message; $('#m-saqla').disabled = false; }
  };
}

/**
 * O'chirish oynasi: ikki yo'l.
 *   Arxiv  — katalogdan yashiradi, keyin qaytarish mumkin
 *   To'liq — bazadan butunlay o'chiradi, qaytarib bo'lmaydi
 *
 * Ikkalasida ham buyurtmalar tarixi butun qoladi: mahsulot nomi va narxi
 * buyurtmaning ichida nusxa bo'lib saqlanadi.
 */
function mahsulotniOchirOyna(p) {
  modal('🗑 Mahsulotni o‘chirish', `
    <p style="margin:0 0 4px"><b>${esc(p.name)}</b></p>
    <p class="mayda" style="margin:0 0 16px">${esc(p.brand || '')}</p>

    <button class="tug keng" id="o-arxiv">📦 Arxivga olish</button>
    <p class="mayda" style="margin:8px 0 18px">Katalogdan yo‘qoladi, lekin bazada
      qoladi. «Katalogda ko‘rinsin» belgisini qayta yoqib tiklaysiz.</p>

    <button class="tug xavf keng" id="o-toliq">💥 Butunlay o‘chirish</button>
    <p class="mayda" style="margin:8px 0 0">Bazadan butunlay o‘chadi: rasm, savatlardagi
      nusxalari va tavsiyalari bilan. <b>Qaytarib bo‘lmaydi.</b>
      Eski buyurtmalar tarixiga tegmaydi.</p>
    <div id="o-xato" class="xato"></div>`);

  const yubor = async (toliq, tugma, matn) => {
    if (toliq && !confirm(`«${p.name}» BUTUNLAY o‘chirilsinmi? Buni qaytarib bo‘lmaydi.`)) return;
    tugma.disabled = true; tugma.textContent = 'O‘chirilmoqda…';
    try {
      const j = await api('/api/admin/product',
        { method: 'DELETE', body: JSON.stringify({ id: p.id, toliq }) });
      modalYop();
      const n = j.natija || {};
      tost(toliq
        ? `O‘chirildi${n.savat ? ` · ${n.savat} ta savatdan olindi` : ''}`
        : 'Arxivga olindi');
      holat.kesh.mahsulotlar = null; mahsulotlar();
    } catch (e) {
      tugma.disabled = false; tugma.textContent = matn;
      $('#o-xato').textContent = e.message;
    }
  };

  $('#o-arxiv').onclick = (e) => yubor(false, e.currentTarget, '📦 Arxivga olish');
  $('#o-toliq').onclick = (e) => yubor(true,  e.currentTarget, '💥 Butunlay o‘chirish');
}


// ---------- Ko'p mahsulotni birdan qo'shish ----------
//
// Admin bir necha rasm tanlaydi, AI har birini tanib kartochkani to'ldiradi,
// adminga faqat NARX (va xohlasa tannarx/ombor) qoladi. Bittalab qo'shishda
// 20 ta mahsulot yarim kun oladi.
function toplamOyna() {
  modal('📦 Ko‘p mahsulot qo‘shish', `
    <p class="mayda">Mahsulot qadoqlari yoki do‘kon skrinshotlarini <b>bir vaqtda</b>
      tanlang (12 tagacha). AI har birini tanib, nomi, tarkibi va qo‘llash tartibini
      to‘ldiradi — sizga faqat narx qo‘yish qoladi. Tanlagan rasm mahsulot rasmi
      bo‘lib qoladi.</p>
    <button class="tug keng" id="t-toplam-tanla" style="margin-top:14px;height:110px;border-style:dashed">
      🖼 Rasmlarni tanlash</button>
    <input type="file" id="f-toplam" accept="image/*" multiple hidden>
    <div id="toplam-holat" style="margin-top:14px"></div>
    <div id="toplam-royxat"></div>`, { keng: true });

  $('#t-toplam-tanla').onclick = () => $('#f-toplam').click();
  $('#f-toplam').onchange = async (e) => {
    const fayllar = [...(e.target.files || [])].slice(0, 12);
    if (!fayllar.length) return;
    const h = $('#toplam-holat');
    h.innerHTML = `<div class="mayda"><span class="aylana"></span>
      ${fayllar.length} ta rasm tayyorlanmoqda…</div>`;
    try {
      const rasmlar = [];
      for (const f of fayllar) rasmlar.push(await rasmniTayyorla(f, 1024));
      h.innerHTML = `<div class="mayda"><span class="aylana"></span>
        AI ${fayllar.length} ta mahsulotni o‘rganmoqda… <b>bu 1-2 daqiqa oladi</b></div>`;

      const j = await api('/api/admin/recognize-toplam',
        { method: 'POST', body: JSON.stringify({ images: rasmlar }) });
      toplamRoyxat(j.natijalar || []);
    } catch (err) {
      h.innerHTML = `<div class="xato">${esc(err.message)}</div>`;
    }
  };
}

/** Tanilgan mahsulotlar ro'yxati — narx qo'yiladigan forma. */
function toplamRoyxat(natijalar) {
  const yaxshi = natijalar.filter((n) => !n.xato);
  const yomon  = natijalar.filter((n) => n.xato);

  $('#toplam-holat').innerHTML = `
    <div class="xabar-quti ${yaxshi.length ? 'ok' : 'xato'}">
      ${yaxshi.length} ta mahsulot tanildi${yomon.length ? ` · ${yomon.length} tasi tanilmadi` : ''}
    </div>
    ${yomon.length ? `<p class="mayda">Tanilmagan rasmlar tashlab yuborildi —
      ularni «Bitta rasmdan» yoki «Qo‘lda» qo‘shing.</p>` : ''}`;

  if (!yaxshi.length) return void ($('#toplam-royxat').innerHTML = '');

  holat.kesh.toplam = yaxshi;

  $('#toplam-royxat').innerHTML = `
    ${yaxshi.map((n, i) => `
      <div class="karta tor" style="margin:12px 0">
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${n.media_id ? `<img src="/media/${esc(n.media_id)}" alt=""
            style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex:0 0 auto">` : ''}
          <div style="flex:1;min-width:0">
            <label>Nomi</label>
            <input data-t="name" data-i="${i}" value="${esc(n.name)}">
            <div class="ozgina" style="margin-top:4px">
              ${esc(n.brand || '—')} · ishonch ${n.ishonch}%
              ${n.ishonch < 60 ? ' ⚠️ tekshiring' : ''}</div>
          </div>
        </div>
        <div class="forma-tor" style="margin-top:10px">
          <div><label>Narx (so‘m) <span class="yordam">majburiy</span></label>
            <input data-t="price" data-i="${i}" type="number" inputmode="numeric" placeholder="0"></div>
          <div><label>Tannarx</label>
            <input data-t="cost_price" data-i="${i}" type="number" inputmode="numeric" placeholder="0"></div>
          <div><label>Ombor (dona)</label>
            <input data-t="stock" data-i="${i}" type="number" inputmode="numeric" value="0"></div>
          <div><label>Og‘irlik (gramm)</label>
            <input data-t="ogirlik" data-i="${i}" type="number" inputmode="numeric" placeholder="0"></div>
        </div>
        <label>Manba havolasi <span class="yordam">Coupang / Daiso — ixtiyoriy</span></label>
        <input data-t="manba_url" data-i="${i}" placeholder="https://...">
        <details style="margin-top:10px">
          <summary class="mayda">AI to‘ldirgan qolgan maydonlar</summary>
          <p class="ozgina" style="margin-top:8px"><b>Bosqich:</b> ${esc(n.step || '—')} ·
            <b>Hajm:</b> ${esc(n.volume || '—')}</p>
          <p class="ozgina">${esc((n.description || '').slice(0, 220))}</p>
          <p class="ozgina"><b>Qo‘llash:</b> ${esc((n.usage_text || '').slice(0, 220))}</p>
        </details>
      </div>`).join('')}
    <div id="toplam-xato" class="xato"></div>
    <button class="tug asos keng" id="t-toplam-saqla" style="margin-top:6px">
      ✅ ${yaxshi.length} ta mahsulotni saqlash</button>`;

  $('#t-toplam-saqla').onclick = async (ev) => {
    const tugma = ev.currentTarget;
    // AI kategoriyani slug bilan qaytaradi — bazaga id kerak
    const katalar = holat.kesh.kategoriyalar || [];
    const royxat = holat.kesh.toplam.map((n) => ({
      ...n,
      category_id: katalar.find((c) => c.slug === n.category)?.id ?? null,
    }));
    $$('[data-t]').forEach((el) => {
      const n = royxat[Number(el.dataset.i)];
      if (n) n[el.dataset.t] = el.value;
    });

    const narxsiz = royxat.filter((n) => !Number(n.price));
    if (narxsiz.length) {
      return void ($('#toplam-xato').textContent =
        `${narxsiz.length} ta mahsulotda narx yo‘q — narxsiz saqlab bo‘lmaydi.`);
    }

    tugma.disabled = true; tugma.textContent = 'Saqlanmoqda…';
    try {
      const j = await api('/api/admin/products-toplam',
        { method: 'POST', body: JSON.stringify({ mahsulotlar: royxat }) });
      modalYop();
      tost(`${j.qoshildi.length} ta mahsulot qo‘shildi`);
      if (j.xatolar?.length) {
        setTimeout(() => modal('⚠️ Ba‘zilari saqlanmadi',
          j.xatolar.map((x) => `<p class="mayda">• <b>${esc(x.nom)}</b> — ${esc(x.sabab)}</p>`).join('')), 400);
      }
      holat.kesh.mahsulotlar = null; mahsulotlar();
    } catch (err) {
      tugma.disabled = false; tugma.textContent = '✅ Saqlash';
      $('#toplam-xato').textContent = err.message;
    }
  };
}

// ---------- Skrinshotdan tanish ----------
function skrinshotOyna() {
  modal('Skrinshotdan qo‘shish', `
    <p class="mayda">Mahsulot qadog‘i yoki do‘kon skrinshotini yuklang.
      AI nomi, tarkibi va qanday foydalanishni o‘zi to‘ldiradi — siz narx va omborni qo‘yasiz.</p>
    <button class="tug keng" id="t-tushir" style="margin-top:14px;height:110px;border-style:dashed">
      📷 Rasm tanlash</button>
    <input type="file" id="f-skrin" accept="image/*" hidden>
    <div id="skrin-holat" style="margin-top:14px"></div>`);
  $('#t-tushir').onclick = () => $('#f-skrin').click();
  $('#f-skrin').onchange = async (e) => {
    const fayl = e.target.files?.[0]; if (!fayl) return;
    const h = $('#skrin-holat');
    h.innerHTML = `<div class="mayda"><span class="aylana"></span> AI o‘rganmoqda…</div>`;
    try {
      const rasm = await rasmniTayyorla(fayl);
      const j = await api('/api/admin/recognize', { method: 'POST', body: JSON.stringify({ image: rasm }) });
      h.innerHTML = j.topildi && j.ishonch >= 35
        ? `<div class="xabar-quti ok" style="margin:0">✓ ${esc(j.brand)} ${esc(j.name)} (${j.ishonch}%)</div>`
        : `<div class="xabar-quti ogoh" style="margin:0">Aniq tanimadi (${j.ishonch}%). ${esc(j.izoh)}</div>`;
      setTimeout(() => mahsulotOyna({ ...j, id: null, ai_filled: true }), 900);
    } catch (err) { h.innerHTML = `<div class="xabar-quti xato" style="margin:0">${esc(err.message)}</div>`; }
  };
}

/** Rasmni kichraytiradi; brauzer formatni tanimasa o'z holicha yuboradi. */
function rasmniTayyorla(fayl, max = 1024, sifat = 0.85) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(fayl);
    const xom = () => {
      URL.revokeObjectURL(url);
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('Rasmni o‘qib bo‘lmadi'));
      fr.readAsDataURL(fayl);
    };
    const o = new Image();
    o.onload = () => {
      try {
        const n = Math.min(1, max / Math.max(o.width, o.height));
        const c = document.createElement('canvas');
        c.width = Math.round(o.width * n); c.height = Math.round(o.height * n);
        c.getContext('2d').drawImage(o, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', sifat));
      } catch { xom(); }
    };
    o.onerror = xom; o.src = url;
  });
}

// ═══════════ 4. POSTER USTASI ═══════════
const USLUB = {
  'muammo-yechim': ['Muammo va yechim', 'qizil'], minimalist: ['Minimalist', 'kul'],
  tabiiy: ['Tabiiy', 'yashil'], klinik: ['Klinik', 'kok'],
  lifestyle: ['Hayotiy', 'sariq'], aksiya: ['Aksiya', 'qizil'],
};
let poster = {};

async function posterOyna(m) {
  poster = { mahsulot: m, rasm: null, goyalar: [], nisbatlar: {} };
  modal(`Poster · ${m.name}`, '<div id="p-tan"></div>', { keng: true });
  await posterGalereya();
}

async function posterGalereya() {
  const el = $('#p-tan');
  el.innerHTML = `
    <button class="tug keng" id="p-yukla" style="height:110px;border-style:dashed;flex-direction:column">
      <span style="font-size:24px">📷</span>
      <span>Mahsulot rasmini yuklang</span>
      <span class="ozgina">AI bir necha poster g‘oyasini taklif qiladi</span></button>
    <input type="file" id="p-fayl" accept="image/*" hidden>
    <div id="p-galereya" style="margin-top:16px"></div>`;
  $('#p-yukla').onclick = () => $('#p-fayl').click();
  $('#p-fayl').onchange = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    poster.rasm = await rasmniTayyorla(f, 1024);
    goyalarniOl();
  };
  try {
    const j = await api(`/api/admin/posters?product_id=${poster.mahsulot.id}`);
    if (!j.posterlar.length) return;
    $('#p-galereya').innerHTML = `
      <h3 style="margin-bottom:9px">Tayyor posterlar</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">
        ${j.posterlar.map((p) => `
          <div style="border:2px solid ${p.tanlangan ? 'var(--urgu)' : 'var(--chiziq)'};
                      border-radius:12px;overflow:hidden">
            <img src="${p.url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">
            <div style="padding:8px">
              <div class="ozgina" style="min-height:30px">${esc(p.goya || '')}</div>
              <div class="ozgina">${p.nisbat} · ${Math.round(p.hajm / 1024)} KB</div>
              <div style="display:flex;gap:4px;margin-top:6px">
                <button class="tug kichik" data-ishlat="${p.id}" style="flex:1"
                  ${p.tanlangan ? 'disabled' : ''}>${p.tanlangan ? '✓' : 'Tanlash'}</button>
                <button class="tug kichik xavf" data-poch="${p.id}">🗑</button>
              </div></div></div>`).join('')}
      </div>`;
    $$('[data-ishlat]').forEach((b) => b.onclick = async () => {
      await api('/api/admin/poster-select', { method: 'POST',
        body: JSON.stringify({ product_id: poster.mahsulot.id, poster_id: b.dataset.ishlat }) });
      tost('Katalogda ishlatiladi'); posterGalereya();
    });
    $$('[data-poch]').forEach((b) => b.onclick = () =>
      tasdiqla('Posterni o‘chirasizmi?', 'Bu amalni qaytarib bo‘lmaydi.', async () => {
        await api('/api/admin/poster', { method: 'DELETE', body: JSON.stringify({ id: b.dataset.poch }) });
        posterGalereya();
      }, { xavf: true }));
  } catch { /* galereya ixtiyoriy */ }
}

async function goyalarniOl() {
  const el = $('#p-tan');
  el.innerHTML = `<div class="bosh-holat"><span class="aylana"></span>
    <p style="margin-top:12px">AI poster g‘oyalarini tayyorlamoqda…</p></div>`;
  try {
    const m = poster.mahsulot;
    const j = await api('/api/admin/poster-ideas', { method: 'POST', body: JSON.stringify({
      image: poster.rasm,
      mahsulot: { name:m.name, brand:m.brand, description:m.description,
                  concerns:m.concerns, skin_types:m.skin_types, actives:m.actives } })});
    poster.goyalar = j.goyalar; poster.nisbatlar = j.nisbatlar;
    goyalarniChiz();
  } catch (e) {
    el.innerHTML = `<div class="xabar-quti xato" style="margin:0">${esc(e.message)}</div>
      <button class="tug keng" id="p-qayta" style="margin-top:12px">Qayta urinish</button>`;
    $('#p-qayta').onclick = posterGalereya;
  }
}

function goyalarniChiz() {
  $('#p-tan').innerHTML = `
    <img src="${poster.rasm}" alt="" style="width:90px;border-radius:10px;float:right;margin-left:12px">
    <p class="mayda">AI ${poster.goyalar.length} ta g‘oya taklif qildi.</p>
    <div style="clear:both">
      ${poster.goyalar.map((g, i) => {
        const [un, uc] = USLUB[g.uslub] || [g.uslub, 'kul'];
        return `<div class="qator-karta" style="margin:10px 0;cursor:pointer" data-goya="${i}">
          <div class="qator-bosh"><div class="nom">${esc(g.sarlavha)}</div>
            <span class="yor ${uc}">${esc(un)}</span></div>
          <p class="mayda" style="margin:6px 0 8px">${esc(g.tavsif)}</p>
          <div style="background:var(--fon);border-radius:10px;padding:10px;margin-bottom:8px">
            <div style="font-weight:700">${esc(g.matn_bosh)}</div>
            <div class="ozgina">${esc(g.matn_qosh)}</div></div>
          <div class="ozgina">👥 ${esc(g.kimga)} · 📐 ${g.nisbat}</div>
          <button class="tug asos kichik keng" style="margin-top:10px">Shu g‘oyani chizish</button>
        </div>`; }).join('')}
    </div>
    <button class="tug keng" id="p-boshqa">↺ Boshqa rasm</button>`;
  $$('[data-goya]').forEach((k) => k.onclick = () => posterniChiz(poster.goyalar[Number(k.dataset.goya)]));
  $('#p-boshqa').onclick = posterGalereya;
}

async function posterniChiz(goya) {
  const el = $('#p-tan');
  el.innerHTML = `<div class="bosh-holat"><span class="aylana"></span>
    <p style="margin-top:12px"><b>${esc(goya.sarlavha)}</b> chizilmoqda…</p>
    <p class="ozgina">15–40 soniya</p></div>`;
  try {
    const j = await api('/api/admin/poster-generate', { method: 'POST', body: JSON.stringify({
      image: poster.rasm, prompt: goya.prompt, nisbat: goya.nisbat,
      matn_bosh: goya.matn_bosh, matn_qosh: goya.matn_qosh,
      goya: goya.sarlavha, product_id: poster.mahsulot.id })});
    el.innerHTML = `
      <img src="${j.poster.url}" alt="" style="width:100%;border-radius:12px;display:block">
      <div class="qator-satr" style="margin-top:12px"><span class="k">O‘lcham</span>
        <span class="v">${j.poster.nisbat} · ${poster.nisbatlar[j.poster.nisbat]?.px || ''}</span></div>
      <div class="qator-satr"><span class="k">Qayerga mos</span>
        <span class="v">${esc(poster.nisbatlar[j.poster.nisbat]?.joy || '')}</span></div>
      <button class="tug asos keng" id="p-ishlat" style="margin-top:14px">Katalogda ishlatish</button>
      <button class="tug keng" id="p-yana" style="margin-top:8px">← Boshqa g‘oya</button>`;
    $('#p-ishlat').onclick = async () => {
      await api('/api/admin/poster-select', { method: 'POST',
        body: JSON.stringify({ product_id: poster.mahsulot.id, poster_id: j.poster.id }) });
      modalYop(); tost('Katalogda ishlatiladi'); yuklanmoqda(); mahsulotlar();
    };
    $('#p-yana').onclick = goyalarniChiz;
  } catch (e) {
    el.innerHTML = `<div class="xabar-quti xato" style="margin:0">${esc(e.message)}</div>
      <button class="tug keng" id="p-yana" style="margin-top:12px">← G‘oyalarga qaytish</button>`;
    $('#p-yana').onclick = goyalarniChiz;
  }
}

// ═══════════ 5. MIJOZLAR ═══════════
//
// Bu bo'lim marketing uchun: «kim qancha savdo qilgan va qachon».
// Filtrlab, tayyor ro'yxat bilan cold call qilinadi — masalan
// «100 mingdan ko'p xarid qilgan, lekin 2 oydan beri jim» segmenti.

const MIJOZ_FILTR = {
  q: '', xarid_dan: '', xarid_gacha: '', buyurtma_dan: '',
  oxirgi_dan: '', oxirgi_gacha: '', xaridor: false, tartib: 'yangi',
};

/** Tayyor segmentlar — bir bosishda. Qo'lda raqam terish shart emas. */
const SEGMENTLAR = [
  { nom: '💎 Eng ko‘p xarid qilganlar', izoh: 'Sodiq mijozlar — yangi mahsulot birinchi ularga',
    f: { xaridor: true, tartib: 'xarid' } },
  { nom: '😴 Uxlab qolganlar', izoh: 'Xarid qilgan, lekin 60 kundan beri jim',
    f: { xaridor: true, oxirgi_gacha: kunOldin(60), tartib: 'oxirgi' } },
  { nom: '🔁 Takroriy xaridorlar', izoh: '2 va undan ko‘p buyurtma bergan',
    f: { buyurtma_dan: 2, tartib: 'buyurtma' } },
  { nom: '🌱 Hali sotib olmaganlar', izoh: 'Ro‘yxatdan o‘tgan, lekin buyurtma yo‘q',
    f: { xarid_gacha: 0, tartib: 'yangi' } },
];

function kunOldin(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

async function mijozlar(yangiFiltr = null) {
  if (yangiFiltr) Object.assign(MIJOZ_FILTR, yangiFiltr);
  const F = MIJOZ_FILTR;

  const p = new URLSearchParams();
  if (F.q) p.set('q', F.q);
  for (const k of ['xarid_dan', 'xarid_gacha', 'buyurtma_dan', 'oxirgi_dan', 'oxirgi_gacha']) {
    if (F[k] !== '' && F[k] !== null && F[k] !== undefined) p.set(k, String(F[k]));
  }
  if (F.xaridor) p.set('xaridor', '1');
  if (F.tartib)  p.set('tartib', F.tartib);
  p.set('limit', '500');

  try {
    const j = await api('/api/admin/users?' + p.toString());
    const x = j.xulosa || {};
    holat.kesh.mijozlar = j.users;

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Mijozlar</h1>
        <button class="tug kichik" id="u-csv">⬇️ CSV</button></div>

      <div style="padding:0 16px 12px">
        <input id="u-qidiruv" placeholder="🔍 Ism, telefon yoki username" value="${esc(F.q)}">
      </div>

      <div class="segment-lenta">
        ${SEGMENTLAR.map((sg, n) => `<button class="tug kichik" data-seg="${n}"
            title="${esc(sg.izoh)}">${sg.nom}</button>`).join('')}
        <button class="tug kichik" data-seg="tozala">✕ Tozalash</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🎯 Filtr</h2>
          <button class="tug kichik" id="u-qolla">Qo‘llash</button></div>
        <div class="forma-tor">
          <div><label>Xarid summasi — dan</label>
            <input id="f-xarid-dan" type="number" inputmode="numeric" value="${esc(F.xarid_dan)}"></div>
          <div><label>Xarid summasi — gacha</label>
            <input id="f-xarid-gacha" type="number" inputmode="numeric" value="${esc(F.xarid_gacha)}"></div>
          <div><label>Buyurtma soni — dan</label>
            <input id="f-buyurtma-dan" type="number" inputmode="numeric" value="${esc(F.buyurtma_dan)}"></div>
          <div><label>Saralash</label>
            <select id="f-tartib">
              ${[['yangi','Yangi qo‘shilgan'],['xarid','Ko‘p xarid qilgan'],
                 ['buyurtma','Ko‘p buyurtma bergan'],['oxirgi','Oxirgi xarid'],
                 ['faol','Oxirgi faollik']].map(([v, n]) =>
                `<option value="${v}" ${F.tartib === v ? 'selected' : ''}>${n}</option>`).join('')}
            </select></div>
          <div><label>Oxirgi xarid — dan</label>
            <input id="f-oxirgi-dan" type="date" value="${esc(F.oxirgi_dan)}"></div>
          <div><label>Oxirgi xarid — gacha</label>
            <input id="f-oxirgi-gacha" type="date" value="${esc(F.oxirgi_gacha)}"></div>
        </div>
        <label class="belgi-qator" style="margin-top:12px">
          <input type="checkbox" id="f-xaridor" ${F.xaridor ? 'checked' : ''}>
          Faqat sotib olganlar</label>
      </div>

      <div class="karta tor">
        <div class="qator-satr"><span class="k">Topildi</span>
          <span class="v">${x.soni ?? 0} ta</span></div>
        <div class="qator-satr"><span class="k">Shundan xaridor</span>
          <span class="v">${x.xaridorlar ?? 0} ta</span></div>
        <div class="qator-satr"><span class="k">Segment aylanmasi</span>
          <span class="v">${som(x.jami_xarid || 0)}</span></div>
        <div class="qator-satr"><span class="k">Bir mijozga o‘rtacha</span>
          <span class="v">${som(x.ortacha || 0)}</span></div>
      </div>

      ${j.users.length ? j.users.map((u) => `
        <div class="qator-karta" style="${u.is_blocked ? 'opacity:.5' : ''}">
          <div class="qator-bosh">
            <div><div class="nom">${esc(u.full_name || 'Ismsiz')}</div>
              <div class="ozgina">${u.username ? '@' + esc(u.username) : 'ID ' + esc(u.telegram_id)}</div></div>
            ${u.jami_xarid ? `<span class="yor yashil">${som(u.jami_xarid)}</span>`
              : '<span class="yor kul">xarid yo‘q</span>'}
          </div>
          <div style="margin-top:8px">
            <div class="qator-satr"><span class="k">📱 Telefon</span>
              <span class="v"><a href="tel:${esc(String(u.phone || '').replace(/[^+\d]/g, ''))}">${esc(u.phone || '—')}</a></span></div>
            <div class="qator-satr"><span class="k">🛒 Buyurtma</span>
              <span class="v">${u.buyurtma_soni || 0} ta${
                u.ortacha_chek ? ` · o‘rtacha ${som(u.ortacha_chek)}` : ''}</span></div>
            <div class="qator-satr"><span class="k">🕐 Oxirgi xarid</span>
              <span class="v">${u.oxirgi_xarid ? `${sana(u.oxirgi_xarid)} · ${kunlarOldin(u.oxirgi_xarid)}` : '—'}</span></div>
            <div class="qator-satr"><span class="k">📍 Hudud</span>
              <span class="v">${esc([u.viloyat, u.tuman].filter(Boolean).join(', ') || '—')}</span></div>
            <div class="qator-satr"><span class="k">📅 Ro‘yxat</span>
              <span class="v">${u.agreed_at ? sana(u.agreed_at) : '—'}</span></div>
          </div>
          <div class="amallar">
            ${u.phone ? `<a class="tug kichik" href="tel:${esc(String(u.phone).replace(/[^+\d]/g, ''))}">📞 Qo‘ng‘iroq</a>` : ''}
            ${u.username ? `<a class="tug kichik" target="_blank"
                href="https://t.me/${esc(u.username)}">💬 Yozish</a>` : ''}
            <button class="tug kichik ${u.is_blocked ? '' : 'xavf'}" data-blok="${u.id}"
              data-holat="${u.is_blocked ? 1 : 0}">${u.is_blocked ? '✓ Blokdan chiqarish' : '🚫 Bloklash'}</button>
          </div>
        </div>`).join('') : boshHolat('🔍', 'Bu filtrga mos mijoz topilmadi')}`;

    let t; $('#u-qidiruv').oninput = (e) => {
      clearTimeout(t); const v = e.target.value;
      t = setTimeout(() => { mijozlar({ q: v }); setTimeout(() => $('#u-qidiruv')?.focus(), 0); }, 350);
    };

    $('#u-qolla').onclick = () => mijozlar({
      xarid_dan:    $('#f-xarid-dan').value.trim(),
      xarid_gacha:  $('#f-xarid-gacha').value.trim(),
      buyurtma_dan: $('#f-buyurtma-dan').value.trim(),
      oxirgi_dan:   $('#f-oxirgi-dan').value,
      oxirgi_gacha: $('#f-oxirgi-gacha').value,
      xaridor:      $('#f-xaridor').checked,
      tartib:       $('#f-tartib').value,
    });

    $$('[data-seg]').forEach((b) => b.onclick = () => {
      const v = b.dataset.seg;
      if (v === 'tozala') {
        return mijozlar({ q: '', xarid_dan: '', xarid_gacha: '', buyurtma_dan: '',
                          oxirgi_dan: '', oxirgi_gacha: '', xaridor: false, tartib: 'yangi' });
      }
      mijozlar({ q: '', xarid_dan: '', xarid_gacha: '', buyurtma_dan: '',
                 oxirgi_dan: '', oxirgi_gacha: '', xaridor: false, tartib: 'yangi',
                 ...SEGMENTLAR[Number(v)].f });
    });

    $('#u-csv').onclick = () => mijozlarniCsv(j.users);

    $$('[data-blok]').forEach((b) => b.onclick = async () => {
      await api('/api/admin/user-block', { method: 'POST',
        body: JSON.stringify({ id: Number(b.dataset.blok), blocked: b.dataset.holat === '0' }) });
      tost('Saqlandi'); mijozlar();
    });
  } catch (e) { xatoChiz(e); }
}

/** «3 kun oldin» ko'rinishi — sanani o'qish osonroq bo'ladi. */
function kunlarOldin(vaqt) {
  const kun = Math.floor((Date.now() - new Date(vaqt).getTime()) / 86400000);
  if (kun <= 0) return 'bugun';
  if (kun === 1) return 'kecha';
  if (kun < 30) return `${kun} kun oldin`;
  const oy = Math.floor(kun / 30);
  return `${oy} oy oldin`;
}

/**
 * Ro'yxatni CSV qilib yuklab beradi — qo'ng'iroq qilish uchun.
 * Excel UTF-8 ni BOM siz o'qimaydi, shuning uchun boshiga \uFEFF qo'yamiz.
 */
function mijozlarniCsv(users) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const satrlar = [
    ['Ism', 'Telefon', 'Username', 'Yosh', 'Viloyat', 'Tuman',
     'Buyurtma', 'Jami xarid', "O'rtacha chek", 'Oxirgi xarid', "Ro'yxatdan"].map(q).join(','),
    ...users.map((u) => [
      u.full_name, u.phone, u.username ? '@' + u.username : '', u.age,
      u.viloyat, u.tuman, u.buyurtma_soni || 0, u.jami_xarid || 0, u.ortacha_chek || 0,
      u.oxirgi_xarid ? sana(u.oxirgi_xarid) : '',
      u.agreed_at ? sana(u.agreed_at) : '',
    ].map(q).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + satrlar.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mijozlar-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  tost(`${users.length} ta mijoz yuklandi`);
}

// ═══════════ MARKETPLACE ═══════════
//
// Daiso / Coupang dan mahsulotni to'g'ridan-to'g'ri olish.
// Havola beriladi -> server sahifani o'qiydi -> AI kartochkani to'ldiradi ->
// narx qoida bo'yicha hisoblanadi -> admin ko'rib tasdiqlaydi.
// Tasdiqlanmagan narsa KATALOGGA TUSHMAYDI.

const MARKET_HOLAT = {
  kutilmoqda:  ['Ko‘rib chiqilmagan', 'sariq'],
  tasdiqlandi: ['Katalogda',          'yashil'],
  rad_etildi:  ['Rad etilgan',        'kul'],
  xato:        ['Olinmadi',           'qizil'],
};
let marketFiltr = 'kutilmoqda';

// ═══════════ HAVOLASIZ MAHSULOTLAR ═══════════
// Botga skrinshot tashlab qo'shilgan mahsulotning manba havolasi yo'q.
// Bu yerda nomni bir bosishda nusxalab, do'kondan topib, havolani
// qo'yasiz. Xarid ro'yxati (/orders) shu havolalardan foydalanadi.

async function nusxala(matn, nima = 'Nom') {
  try {
    await navigator.clipboard.writeText(matn);
    tost(`${nima} nusxalandi`);
  } catch {
    // clipboard API yopiq bo'lsa (eski brauzer, HTTP) — eski usul
    const t = document.createElement('textarea');
    t.value = matn; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); tost(`${nima} nusxalandi`); }
    catch { tost('Nusxalab bo‘lmadi', 'xato'); }
    t.remove();
  }
}

async function havolasizlar() {
  try {
    const j = await api('/api/admin/havolasiz');
    const r = j.mahsulotlar || [];
    const hammaNom = r.map((p) => `${p.brand ? p.brand + ' ' : ''}${p.name}`).join('\n');

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Havolasizlar</h1>
        <span class="ozgina">${r.length} ta</span></div>

      <div class="karta tor">
        <p class="mayda" style="margin:0 0 10px">Botga skrinshot tashlab qo‘shilgan
          mahsulotlarning manba havolasi yo‘q. Nomini nusxalab do‘kondan toping va
          havolani shu yerga qo‘ying — <b>/orders</b> xarid ro‘yxati shundan
          foydalanadi.</p>
        ${r.length ? `<button class="tug keng" id="hv-hammasi">📋 Hamma nomni nusxalash</button>` : ''}
      </div>

      ${r.length ? r.map((p) => `
        <div class="karta tor" data-hv="${p.id}">
          <div class="qator-bosh">
            <b>${esc(p.name)}</b>
            <span class="ozgina">${(p.price || 0).toLocaleString('uz-UZ').replace(/,/g, ' ')} so‘m</span>
          </div>
          <div class="ozgina" style="margin:2px 0 8px">
            ${esc(p.brand || '—')} · ombor ${p.stock} dona</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="tug" data-nusxa="${esc(`${p.brand ? p.brand + ' ' : ''}${p.name}`)}">📋 Nom</button>
            <a class="tug" target="_blank" rel="noopener"
               href="https://www.coupang.com/np/search?q=${encodeURIComponent(p.name)}">Coupang’da qidirish</a>
          </div>
          <input type="url" class="hv-url" placeholder="https://www.daiso.co.kr/product/…"
                 style="margin-top:8px" spellcheck="false">
          <button class="tug asos keng" data-saqla="${p.id}" style="margin-top:8px">Havolani saqlash</button>
        </div>`).join('')
      : `<div class="karta tor"><p class="mayda" style="margin:0">
           Hamma mahsulotning havolasi bor 🎉</p></div>`}`;

    const h = $('#hv-hammasi');
    if (h) h.onclick = () => nusxala(hammaNom, `${r.length} ta nom`);

    $$('[data-nusxa]').forEach((b) => b.onclick = () => nusxala(b.dataset.nusxa));
    $$('[data-saqla]').forEach((b) => b.onclick = async () => {
      const karta = b.closest('[data-hv]');
      const url = karta.querySelector('.hv-url').value.trim();
      if (!url) return tost('Havolani kiriting', 'xato');
      b.disabled = true;
      try {
        await api('/api/admin/mahsulot-havola', { method: 'POST',
          body: JSON.stringify({ id: Number(b.dataset.saqla), manba_url: url }) });
        karta.remove();
        tost('Saqlandi');
      } catch (e) { tost(e.message, 'xato'); b.disabled = false; }
    });
  } catch (e) { xatoChiz(e); }
}

// ═══════════ BO'LIMLAR (TOIFALAR) ═══════════
// Do'kon bosh sahifasidagi bo'limlar shu ro'yxatdan chiziladi.
// AI ham mos toifa topolmasa yangisini o'zi qo'shadi — shu yerda
// nomini tuzatib, tartibini o'zgartirasiz.

async function bolimlar() {
  try {
    const j = await api('/api/admin/toifalar');
    const t = j.toifalar || [];
    $('#tan').innerHTML = `
      <div class="bosh"><h1>Bo‘limlar</h1><span class="ozgina">${t.length} ta</span></div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>➕ Yangi bo‘lim</h2></div>
        <p class="mayda" style="margin:0 0 10px">Do‘kon bosh sahifasida shu tartibda
          chiqadi. Botga tashlangan skrinshot mavjud bo‘limlarga tushmasa,
          <b>AI yangi bo‘limni o‘zi qo‘shadi</b> — keyin shu yerda nomini
          tuzatasiz.</p>
        <label>Nomi</label>
        <input id="bl-nom" placeholder="Soch parvarishi" maxlength="40">
        <div class="ikki">
          <div><label>Emoji</label><input id="bl-emoji" placeholder="💇" maxlength="4"></div>
          <div><label>Tartib</label><input id="bl-sort" type="number" value="100"></div>
        </div>
        <button class="tug asos keng" id="bl-qosh" style="margin-top:10px">Qo‘shish</button>
      </div>

      ${t.map((x) => `
        <div class="karta tor" data-bl="${x.id}">
          <div class="qator-bosh">
            <b>${esc(x.emoji || '')} ${esc(x.name)}</b>
            <span class="ozgina">${x.soni} ta mahsulot</span>
          </div>
          <div class="ozgina" style="margin:2px 0 8px">${esc(x.slug)} · tartib ${x.sort}</div>
          <div class="ikki">
            <div><label>Nomi</label><input class="bl-n" value="${esc(x.name)}" maxlength="40"></div>
            <div><label>Tartib</label><input class="bl-s" type="number" value="${x.sort}"></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="tug asos" data-yangi="${x.id}">Saqlash</button>
            <button class="tug xavf" data-ochir="${x.id}">O‘chirish</button>
          </div>
        </div>`).join('')}`;

    $('#bl-qosh').onclick = async () => {
      const nom = $('#bl-nom').value.trim();
      if (!nom) return tost('Nom kiriting', 'xato');
      try {
        await api('/api/admin/toifa', { method: 'POST', body: JSON.stringify({
          name: nom, emoji: $('#bl-emoji').value.trim(), sort: Number($('#bl-sort').value) || 100 }) });
        tost('Qo‘shildi'); bolimlar();
      } catch (e) { tost(e.message, 'xato'); }
    };
    $$('[data-yangi]').forEach((b) => b.onclick = async () => {
      const k = b.closest('[data-bl]');
      try {
        await api('/api/admin/toifa', { method: 'POST', body: JSON.stringify({
          id: Number(b.dataset.yangi), name: k.querySelector('.bl-n').value.trim(),
          sort: Number(k.querySelector('.bl-s').value) || 100 }) });
        tost('Saqlandi'); bolimlar();
      } catch (e) { tost(e.message, 'xato'); }
    });
    $$('[data-ochir]').forEach((b) => b.onclick = async () => {
      if (!confirm('Bo‘lim o‘chirilsinmi? Mahsulotlar o‘chmaydi, bo‘limsiz qoladi.')) return;
      try {
        await api('/api/admin/toifa', { method: 'DELETE',
          body: JSON.stringify({ id: Number(b.dataset.ochir) }) });
        tost('O‘chirildi'); bolimlar();
      } catch (e) { tost(e.message, 'xato'); }
    });
  } catch (e) { xatoChiz(e); }
}

async function marketplace() {
  try {
    const j = await api('/api/admin/marketplace' + (marketFiltr ? `?holat=${marketFiltr}` : ''));
    const h = j.hisob || {};
    const s = j.sozlama || {};
    const q = s.qoida || {};

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Marketplace</h1>
        <span class="ozgina">${j.royxat.length} ta</span></div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🔗 Havoladan olish</h2></div>
        <p class="mayda" style="margin:0 0 10px">Daiso yoki Coupang mahsulot havolasini
          qo‘ying — har qatorga bittadan. Server sahifani o‘qiydi, AI kartochkani
          to‘ldiradi, narx qoidaga ko‘ra hisoblanadi. <b>Siz tasdiqlamaguningizcha
          katalogga tushmaydi.</b></p>
        <textarea id="mk-havolalar" rows="4" spellcheck="false"
          placeholder="https://www.daiso.co.kr/product/...&#10;https://www.coupang.com/vp/products/..."></textarea>
        <button class="tug asos keng" id="mk-ol" style="margin-top:8px">Olib kelish</button>

        <details style="margin-top:12px">
          <summary class="mayda">Bo‘lim havolasi bilan ishlash</summary>
          <p class="mayda" style="margin:8px 0">Kategoriya yoki qidiruv sahifasining
            havolasini qo‘ying. <b>Havolalarni topish</b> ularni yuqoridagi maydonga
            tushiradi. <b>Agent o‘zi yig‘sin</b> esa har birini o‘qib chiqadi va
            faqat qoidaga to‘g‘ri kelganini — kosmetika, og‘irligi va narxi
            chegarada — tasdiq navbatiga qo‘yadi.</p>
          <input id="mk-katalog" placeholder="https://www.daiso.co.kr/category/..." spellcheck="false">
          <div class="forma-tor" style="margin-top:8px">
            <div><label>Nechta mahsulot</label>
              <input id="mk-agent-soni" type="number" min="1" max="30" value="10"></div>
          </div>
          <button class="tug keng" id="mk-qidir" style="margin-top:8px">Havolalarni topish</button>
          <button class="tug asos keng" id="mk-agent" style="margin-top:8px">🤖 Agent o‘zi yig‘sin</button>
        </details>
        <div id="mk-holat" style="margin-top:10px"></div>
      </div>

      <div class="karta tor" id="mk-import"></div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🔌 Do‘kon API si</h2></div>
        <p class="mayda" style="margin:0 0 10px">
          Daisomall kabi do‘konlar sahifani brauzerda chizadi — server olgan
          HTML da mahsulot <b>yo‘q</b>. Shuning uchun avval do‘konning o‘z
          <b>JSON manzili</b> so‘raladi, u ishlamasa sahifa o‘qiladi.
          Daiso rasmiy API bermaydi, bu manzil <b>ichki</b> va o‘zgarishi
          mumkin: brauzerda mahsulotni ochib <b>F12 → Network → Fetch/XHR</b>
          da haqiqiy manzilni ko‘rib, shu yerga qo‘ying — dastur qayta
          yig‘ilmaydi.</p>
        <label>Qoidalar (JSON)</label>
        <textarea id="mk-api" rows="12" spellcheck="false"
          style="font:12.5px/1.5 ui-monospace,Menlo,monospace">${esc(JSON.stringify(s.api || [], null, 2))}</textarea>
        <button class="tug keng" id="mk-api-saqla" style="margin-top:8px">Qoidalarni saqlash</button>

        <label style="margin-top:14px">Sinash uchun mahsulot havolasi</label>
        <input id="mk-api-url" spellcheck="false"
          placeholder="https://www.daisomall.co.kr/pd/pdd/pdDetail?pdNo=...">
        <button class="tug keng" id="mk-api-sinov" style="margin-top:8px">Sinab ko‘rish</button>
        <div id="mk-api-holat" style="margin-top:10px"></div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>💰 Narx qoidasi</h2></div>
        <p class="mayda" style="margin:0 0 10px">
          Narx = <b>tannarx</b> + <b>yetkazish</b> + <b>sof foyda</b>.
          Yetkazish har boshlangan 100 g uchun. Foyda foizda hisoblanadi,
          lekin eng kam va eng ko‘p chegarasidan chiqmaydi — arzon kichik
          tovarda mehnat qoplanishi, qimmat kremda esa narx haddan oshmasligi uchun.</p>
        <div class="forma-tor">
          <div><label>1 KRW necha so‘m</label>
            <input id="mk-kurs" type="number" step="0.1" value="${q.krw_kurs ?? 9.5}"></div>
          <div><label>Har 100 g uchun (so‘m)</label>
            <input id="mk-yetkazish" type="number" value="${q.yetkazish_100g ?? 15000}"></div>
          <div><label>Foyda foizi (%)</label>
            <input id="mk-foiz" type="number" value="${q.foyda_foiz ?? 35}"></div>
          <div><label>Yaxlitlash (so‘m)</label>
            <input id="mk-yaxlit" type="number" value="${q.yaxlitlash ?? 1000}"></div>
          <div><label>Eng kam sof foyda</label>
            <input id="mk-foyda-min" type="number" value="${q.foyda_min ?? 30000}"></div>
          <div><label>Eng ko‘p sof foyda</label>
            <input id="mk-foyda-max" type="number" value="${q.foyda_max ?? 50000}"></div>
          <div><label>Eng og‘ir mahsulot (g)</label>
            <input id="mk-maks-ogirlik" type="number" value="${s.maksOgirlik ?? 600}"></div>
          <div><label>Narx oralig‘i — dan <span class="yordam">0 = cheklovsiz</span></label>
            <input id="mk-narx-dan" type="number" value="${s.narxDan ?? 0}"></div>
          <div><label>Narx oralig‘i — gacha</label>
            <input id="mk-narx-gacha" type="number" value="${s.narxGacha ?? 0}"></div>
        </div>
        <div id="mk-namuna" class="ozgina" style="margin-top:10px"></div>
        <button class="tug keng" id="mk-qoida-saqla" style="margin-top:8px">Qoidani saqlash</button>
      </div>

      <div class="segment-lenta">
        ${['kutilmoqda', 'tasdiqlandi', 'rad_etildi', 'xato', ''].map((k) => `
          <button class="tug kichik ${marketFiltr === k ? 'asos' : ''}" data-mkf="${k}">
            ${k ? MARKET_HOLAT[k][0] : 'Hammasi'}${h[k] ? ` · ${h[k]}` : ''}</button>`).join('')}
      </div>

      ${h.kutilmoqda ? `<div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="tug asos" id="mk-hammasi" style="flex:1">
          ✅ Navbatdagi ${h.kutilmoqda} tasini katalogga qo‘shish</button>
      </div>` : ''}

      ${j.royxat.length ? j.royxat.map(marketKarta).join('')
        : boshHolat('🔗', 'Bu ro‘yxat bo‘sh',
            '<p class="mayda">Yuqoriga havola qo‘yib «Olib kelish» ni bosing</p>')}`;

    $('#mk-ol').onclick = marketOl;
    $('#mk-qidir').onclick = marketQidir;
    $('#mk-agent').onclick = marketAgent;
    $('#mk-api-saqla').onclick = marketApiSaqla;
    if ($('#mk-hammasi')) $('#mk-hammasi').onclick = marketHammasi;
    importChiz();
    $('#mk-api-sinov').onclick = marketApiSinov;
    $('#mk-qoida-saqla').onclick = marketQoidaSaqla;
    ['mk-kurs','mk-yetkazish','mk-foiz','mk-yaxlit','mk-foyda-min','mk-foyda-max']
      .forEach((id) => { const el = $('#' + id); if (el) el.oninput = marketNamuna; });
    marketNamuna();

    $$('[data-mkf]').forEach((b) => b.onclick = () => { marketFiltr = b.dataset.mkf; marketplace(); });
    $$('[data-mk-tasdiq]').forEach((b) => b.onclick = () => marketTasdiq(Number(b.dataset.mkTasdiq)));
    $$('[data-mk-rad]').forEach((b) => b.onclick = () => marketRad(Number(b.dataset.mkRad)));
    $$('[data-mk-qayta]').forEach((b) => b.onclick = () => {
      $('#mk-havolalar').value = b.dataset.mkQayta;
      $('#mk-havolalar').scrollIntoView({ block: 'center' });
    });
  } catch (e) { xatoChiz(e); }
}

// Mahsulot qaysi yo'l bilan olingani — API ishlamay qolganini admin
// darhol ko'rishi uchun
const MARKET_USUL = { api: '🔌 API', royxat: '🔎 ro‘yxatdan', html: '📄 sahifa' };

function marketKarta(t) {
  const m = t.malumot || {};
  const n = t.narx_izoh || {};
  const [nom, sinf] = MARKET_HOLAT[t.holat] || [t.holat, 'kul'];
  return `
  <div class="qator-karta">
    <div class="qator-bosh">
      <div style="display:flex;gap:10px;align-items:flex-start;min-width:0">
        ${t.rasm_id ? `<img src="/media/${esc(t.rasm_id)}" alt=""
          style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex:0 0 auto">` : ''}
        <div style="min-width:0">
          <div class="nom">${esc(m.name || '(nomsiz)')}</div>
          <div class="ozgina">${esc(m.brand || '')} · ${esc(t.manba)}${
            m.usul ? ` · ${MARKET_USUL[m.usul] || m.usul}` : ''}</div>
        </div>
      </div>
      <span class="yor ${sinf}">${nom}</span>
    </div>

    ${t.sabab ? `<div class="ozgina" style="margin-top:8px">⚠️ ${esc(t.sabab)}</div>` : ''}

    ${m.name ? `<div style="margin-top:8px">
      <div class="qator-satr"><span class="k">Koreyadagi narx</span>
        <span class="v">${m.narx_qiymat ? `${som(m.narx_qiymat)} ${esc(m.narx_valyuta)}` : '—'}</span></div>
      <div class="qator-satr"><span class="k">Og‘irligi</span>
        <span class="v">${m.ogirlik_g || '—'} g${m.volume ? ` · ${esc(m.volume)}` : ''}</span></div>
      <div class="qator-satr"><span class="k">Tannarx</span><span class="v">${som(n.tannarx || 0)}</span></div>
      <div class="qator-satr"><span class="k">Yetkazish</span><span class="v">${som(n.yetkazish || 0)}</span></div>
      <div class="qator-satr"><span class="k">Sof foyda</span><span class="v">${som(n.foyda || 0)}</span></div>
      <div class="qator-satr"><span class="k"><b>Sotuv narxi</b></span>
        <span class="v"><b>${som(n.narx || 0)}</b>${n.marja ? ` · marja ${n.marja}%` : ''}</span></div>
    </div>` : ''}

    <div class="amallar">
      <a class="tug kichik" href="${esc(t.manba_url)}" target="_blank" rel="noopener">🔗 Sahifa</a>
      ${t.holat === 'kutilmoqda'
        ? `<button class="tug kichik asos" data-mk-tasdiq="${t.id}">✅ Katalogga qo‘shish</button>
           <button class="tug kichik xavf" data-mk-rad="${t.id}">✕ Rad etish</button>`
        : ''}
      ${t.holat === 'xato' ? `<button class="tug kichik" data-mk-qayta="${esc(t.manba_url)}">🔄 Qayta urinish</button>` : ''}
      ${t.product_id ? `<span class="ozgina">Katalogda: ${esc(t.mahsulot_nomi || '')}</span>` : ''}
    </div>
  </div>`;
}

/** Qoida o'zgarganda misol darhol ko'rinsin — raqamlar mavhum qolmasin. */
async function marketNamuna() {
  const el = $('#mk-namuna'); if (!el) return;
  const qoida = marketQoida();
  const misollar = [
    ['Kichik tovar · 3 000 KRW · 50 g', 3000, 50],
    ['Krem · 12 000 KRW · 100 g',       12000, 100],
    ['Katta · 25 000 KRW · 250 g',      25000, 250],
  ];
  try {
    const natijalar = [];
    for (const [nom, krw, gramm] of misollar) {
      const j = await api('/api/admin/marketplace/narx',
        { method: 'POST', body: JSON.stringify({ krw, gramm, ...qoida }) });
      natijalar.push(`${nom} → <b>${som(j.narx.narx)}</b> (foyda ${som(j.narx.foyda)})`);
    }
    el.innerHTML = natijalar.join('<br>');
  } catch { el.innerHTML = ''; }
}

const marketQoida = () => ({
  krw_kurs:       Number($('#mk-kurs')?.value) || 9.5,
  yetkazish_100g: Number($('#mk-yetkazish')?.value) || 0,
  foyda_foiz:     Number($('#mk-foiz')?.value) || 0,
  foyda_min:      Number($('#mk-foyda-min')?.value) || 0,
  foyda_max:      Number($('#mk-foyda-max')?.value) || 0,
  yaxlitlash:     Number($('#mk-yaxlit')?.value) || 1000,
});

async function marketQoidaSaqla(ev) {
  const t = ev.currentTarget;
  t.disabled = true; t.textContent = 'Saqlanmoqda…';
  try {
    await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ settings: {
      narx_qoidasi: marketQoida(),
      marketplace_maks_ogirlik: Math.max(0, Number($('#mk-maks-ogirlik').value) || 0),
      marketplace_narx_dan:     Math.max(0, Number($('#mk-narx-dan').value) || 0),
      marketplace_narx_gacha:   Math.max(0, Number($('#mk-narx-gacha').value) || 0),
    }})});
    tost('Qoida saqlandi');
  } catch (e) { tost(e.message); }
  finally { t.disabled = false; t.textContent = 'Qoidani saqlash'; }
}

async function marketOl() {
  const havolalar = $('#mk-havolalar').value.trim();
  if (!havolalar) return tost('Havola qo‘ying');
  const h = $('#mk-holat');
  const t = $('#mk-ol');
  t.disabled = true;
  h.innerHTML = `<div class="mayda"><span class="aylana"></span>
    Sahifalar o‘qilmoqda… <b>har biri 10–20 soniya</b></div>`;
  try {
    const j = await api('/api/admin/marketplace/olish',
      { method: 'POST', body: JSON.stringify({ havolalar }) });
    const yaxshi = j.natijalar.filter((x) => x.holat === 'kutilmoqda').length;
    const xatolar = j.natijalar.filter((x) => x.holat === 'xato');
    $('#mk-havolalar').value = '';
    marketFiltr = yaxshi ? 'kutilmoqda' : 'xato';
    await marketplace();
    tost(`${yaxshi} ta tayyor${xatolar.length ? ` · ${xatolar.length} ta olinmadi` : ''}`);
  } catch (e) {
    h.innerHTML = `<div class="xato">${esc(e.message)}</div>`;
  } finally { t.disabled = false; }
}

async function marketQidir() {
  const url = $('#mk-katalog').value.trim();
  if (!url) return tost('Havola qo‘ying');
  const h = $('#mk-holat');
  h.innerHTML = `<div class="mayda"><span class="aylana"></span> Sahifa o‘qilmoqda…</div>`;
  try {
    const j = await api('/api/admin/marketplace/qidir',
      { method: 'POST', body: JSON.stringify({ url, limit: 20 }) });
    if (!j.havolalar.length) {
      h.innerHTML = `<div class="mayda">Mahsulot havolasi topilmadi.
        Bu sahifa JavaScript bilan yuklanadigan bo‘lishi mumkin — mahsulot
        havolalarini qo‘lda nusxa qiling.</div>`;
      return;
    }
    $('#mk-havolalar').value = j.havolalar.join('\n');
    h.innerHTML = `<div class="xabar-quti ok">${j.havolalar.length} ta havola topildi —
      tekshirib «Olib kelish» ni bosing</div>`;
  } catch (e) {
    h.innerHTML = `<div class="xato">${esc(e.message)}</div>`;
  }
}

/**
 * Agent topshirig'i: bo'limni o'zi aylanib chiqadi.
 *
 * Katalogga baribir ADMIN tasdiqlagandan keyin tushadi — agent faqat
 * navbat to'ldiradi. Rad etilganlari ham ro'yxatda qoladi: sababi
 * ko'rinib tursin, chunki ko'pincha muammo qoidada bo'ladi (masalan
 * og'irlik chegarasi past qo'yilgan).
 */
async function marketAgent() {
  const url = $('#mk-katalog').value.trim();
  if (!url) return tost('Bo‘lim havolasini qo‘ying');
  const soni = Math.max(1, Math.min(30, Number($('#mk-agent-soni').value) || 10));
  const h = $('#mk-holat');
  const t = $('#mk-agent');
  t.disabled = true;
  h.innerHTML = `<div class="mayda"><span class="aylana"></span>
    Agent ishlamoqda… <b>${soni} ta sahifa</b>, har biri 10–20 soniya.
    Sahifani yopmang.</div>`;
  try {
    const j = await api('/api/admin/marketplace/agent',
      { method: 'POST', body: JSON.stringify({ url, limit: soni }) });
    const c = j.hisob || {};
    if (!j.havolalar.length) {
      h.innerHTML = `<div class="mayda">${esc(j.sabab || 'Mahsulot havolasi topilmadi.')}</div>`;
      return;
    }
    marketFiltr = c.kutilmoqda ? 'kutilmoqda' : '';
    await marketplace();
    $('#mk-holat').innerHTML = `<div class="xabar-quti ok">
      Agent ${j.havolalar.length} ta havolani ko‘rdi:
      <b>${c.kutilmoqda || 0}</b> ta tasdiq kutmoqda,
      ${c.rad_etildi || 0} ta qoidaga to‘g‘ri kelmadi,
      ${c.takror || 0} ta avval olingan${c.xato ? `, ${c.xato} ta o‘qilmadi` : ''}.</div>`;
    tost(`${c.kutilmoqda || 0} ta mahsulot tasdiq kutmoqda`);
  } catch (e) {
    h.innerHTML = `<div class="xato">${esc(e.message)}</div>`;
  } finally { t.disabled = false; }
}

// ──────────────── Ommaviy import ────────────────
// Yuzta mahsulot yarim soat oladi, shuning uchun ish SERVERDA ketadi:
// sahifa yopilsa ham to'xtamaydi. Panel faqat holatni so'rab turadi.

let importTaymer = null;

const IMPORT_HOLAT = {
  ishlamoqda: ['Ketmoqda', 'ogoh'],
  tugadi:     ['Tugadi', 'ok'],
  toxtatildi: ['To‘xtatildi', 'kul'],
  xato:       ['Xato', 'xato'],
};

/** Import kartasini chizadi va vazifa ketayotgan bo'lsa yangilab turadi. */
async function importChiz() {
  const quti = $('#mk-import');
  if (!quti) { clearInterval(importTaymer); importTaymer = null; return; }
  let j;
  try { j = await api('/api/admin/marketplace/vazifa'); }
  catch { return; }

  const v = j.joriy || j.tarix?.[0] || null;
  const ketmoqda = v?.holat === 'ishlamoqda';
  const [nom, sinf] = IMPORT_HOLAT[v?.holat] || ['', 'kul'];
  const bajarildi = v ? Math.min(100, Math.round(((v.qoshilgan + v.rad_etilgan) / (v.maqsad || 1)) * 100)) : 0;
  // Qolgan vaqt: har mahsulot ~ kechikish + 8 soniya (sahifa va AI)
  const qoldi = v ? Math.max(0, v.maqsad - v.qoshilgan - v.rad_etilgan) : 0;
  const daqiqa = Math.round((qoldi * ((v?.kechikish_ms || 1500) + 8000)) / 60000);

  quti.innerHTML = `
    <div class="karta-bosh"><h2>🚀 Ommaviy import</h2>
      ${v ? `<span class="yor ${sinf}">${nom}</span>` : ''}</div>

    ${v ? `
      <div class="qator-karta" style="margin-bottom:12px">
        <div style="height:8px;background:var(--fon);border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${bajarildi}%;background:var(--urgu);
            transition:width .4s"></div></div>
        <div class="qator-satr" style="margin-top:8px"><span class="k">Katalog navbatiga</span>
          <span class="v">${v.qoshilgan} / ${v.maqsad}</span></div>
        <div class="qator-satr"><span class="k">Qoidaga to‘g‘ri kelmadi</span>
          <span class="v">${v.rad_etilgan}</span></div>
        <div class="qator-satr"><span class="k">Ko‘rilgan havola</span>
          <span class="v">${v.korilgan}${v.takror ? ` · ${v.takror} takror` : ''}</span></div>
        <div class="qator-satr"><span class="k">AI chaqiruvi <span class="yordam">pul turadi</span></span>
          <span class="v">${v.ai_soni ?? 0}${
            v.korilgan > (v.ai_soni ?? 0) ? ` · ${v.korilgan - (v.ai_soni ?? 0)} tasi AI'siz rad etildi` : ''}</span></div>
        <div class="qator-satr"><span class="k">Sahifa</span>
          <span class="v">${v.sahifa} / ${v.sahifagacha}</span></div>
        ${ketmoqda ? `<div class="qator-satr"><span class="k">Taxminan qoldi</span>
          <span class="v">${daqiqa} daqiqa</span></div>` : ''}
        ${v.sabab ? `<div class="ozgina" style="margin-top:8px">⚠️ ${esc(v.sabab)}</div>` : ''}
      </div>` : ''}

    ${ketmoqda ? `
      <p class="mayda" style="margin:0 0 10px">Import serverda ketmoqda — bu
        sahifani yopsangiz ham davom etadi.</p>
      <button class="tug keng xavf" id="mk-import-toxtat">■ To‘xtatish</button>`
    : `
      <p class="mayda" style="margin:0 0 10px">Har qatorga <b>qidiruv so‘zi</b>
        yozing (koreyscha yaxshiroq: <code>크림</code>, <code>토너</code>) —
        server Daiso qidiruvidan o‘zi topadi. Havola qo‘yish shart emas.
        Boshqa do‘konda bo‘lim havolasini qo‘ysangiz ham bo‘ladi;
        sahifalash uchun havolada <code>{sahifa}</code> yozing.</p>
      <label>Qidiruv so‘zlari yoki bo‘lim havolalari (har qatorga bittadan)</label>
      <textarea id="mk-im-havola" rows="4" spellcheck="false"
        placeholder="크림&#10;토너&#10;세럼"></textarea>
      <div class="segment-lenta" style="margin-top:8px">
        <button class="tug kichik" data-im-namuna="kosmetika">🧴 Kosmetika to‘plami</button>
        <button class="tug kichik" data-im-namuna="ichki">💊 Ichki qabul</button>
      </div>
      <div class="forma-tor" style="margin-top:8px">
        <div><label>Nechta mahsulot</label>
          <input id="mk-im-maqsad" type="number" min="1" max="1000" value="100"></div>
        <div><label>Sahifadan</label>
          <input id="mk-im-dan" type="number" min="1" value="1"></div>
        <div><label>Sahifagacha</label>
          <input id="mk-im-gacha" type="number" min="1" value="20"></div>
        <div><label>Tanaffus (ms) <span class="yordam">do‘kon bloklamasligi uchun</span></label>
          <input id="mk-im-kechikish" type="number" min="300" step="100" value="1500"></div>
      </div>
      <label class="belgi-qator" style="margin-top:10px">
        <input type="checkbox" id="mk-im-avto">
        <span>Tasdiqni kutmasdan to‘g‘ridan-to‘g‘ri katalogga qo‘shilsin</span></label>
      <button class="tug asos keng" id="mk-import-boshla" style="margin-top:10px">
        🚀 Importni boshlash</button>`}`;

  // Avtomatik jadval — hech narsa bosmasdan ishlashi uchun
  const jd = j.jadval || {};
  quti.insertAdjacentHTML('beforeend', `
    <hr style="border:0;border-top:1px solid var(--chiziq);margin:16px 0">
    <h3 style="margin:0 0 6px;font-size:15px">⏰ Avtomatik ishlash</h3>
    <p class="mayda" style="margin:0 0 10px">Yoqilgan bo‘lsa server o‘zi
      belgilangan kunlarda qidiradi, filtrlaydi va katalogga qo‘shadi —
      siz hech narsa bosmaysiz.</p>
    <label class="belgi-qator">
      <input type="checkbox" id="mk-jd-yoq" ${jd.yoqilgan ? 'checked' : ''}>
      <span>Avtomatik import yoqilsin</span></label>
    <label class="belgi-qator">
      <input type="checkbox" id="mk-jd-avto" ${jd.avtoTasdiq !== false ? 'checked' : ''}>
      <span>Topilgani to‘g‘ridan-to‘g‘ri katalogga</span></label>
    <label style="margin-top:8px">Qidiruv so‘zlari</label>
    <textarea id="mk-jd-sozlar" rows="2" spellcheck="false">${esc((jd.sozlar || []).join('\n'))}</textarea>
    <div class="forma-tor" style="margin-top:8px">
      <div><label>Har necha kunda</label>
        <input id="mk-jd-kunlar" type="number" min="1" max="90" value="${jd.kunlar ?? 7}"></div>
      <div><label>Soat (Toshkent)</label>
        <input id="mk-jd-soat" type="number" min="0" max="23" value="${jd.soat ?? 4}"></div>
      <div><label>Har safar nechta</label>
        <input id="mk-jd-maqsad" type="number" min="1" max="1000" value="${jd.maqsad ?? 40}"></div>
      <div><label>Sahifagacha</label>
        <input id="mk-jd-sahifa" type="number" min="1" max="50" value="${jd.sahifagacha ?? 5}"></div>
    </div>
    <label style="margin-top:10px">AI rejimi <span class="yordam">tavsif yozish uchun</span></label>
    <select id="mk-ai-rejim">
      <option value="yoq">Tekin — AI umuman chaqirilmaydi</option>
      <option value="tejamkor">Tejamkor — faqat kerak bo‘lganda (tavsiya)</option>
      <option value="toliq">To‘liq — har mahsulotga AI (chiroyli tavsif, qimmat)</option>
    </select>
    <button class="tug keng" id="mk-jd-saqla" style="margin-top:10px">Jadvalni saqlash</button>
    ${jd.oxirgi ? `<div class="ozgina" style="margin-top:8px">Oxirgi avtomatik ish:
      ${esc(new Date(jd.oxirgi).toLocaleString('uz'))}</div>` : ''}`);
  $('#mk-ai-rejim').value = j.ai_rejim || 'tejamkor';
  $('#mk-jd-saqla').onclick = jadvalSaqla;

  if (ketmoqda) {
    $('#mk-import-toxtat').onclick = importToxtat;
    if (!importTaymer) importTaymer = setInterval(importChiz, 4000);
  } else {
    clearInterval(importTaymer); importTaymer = null;
    $('#mk-import-boshla').onclick = importBoshla;
    $$('[data-im-namuna]').forEach((b) => b.onclick = () => {
      $('#mk-im-havola').value = IMPORT_NAMUNA[b.dataset.imNamuna].join('\n');
    });
  }
}

// Tayyor qidiruv to'plamlari — admin koreyscha yozib o'tirmasin.
// Koreyscha so'z ataylab: do'kon qidiruvi o'z tilida ancha yaxshi topadi.
const IMPORT_NAMUNA = {
  kosmetika: ['크림', '토너', '세럼', '클렌징', '마스크팩', '선크림', '립밤', '수분크림'],
  ichki: ['콜라겐', '비타민', '홍삼', '유산균', '비오틴'],
};

async function jadvalSaqla() {
  try {
    await api('/api/admin/marketplace/ai-rejim',
      { method: 'POST', body: JSON.stringify({ rejim: $('#mk-ai-rejim').value }) });
    await api('/api/admin/marketplace/jadval', { method: 'POST', body: JSON.stringify({
      yoqilgan: $('#mk-jd-yoq').checked,
      avto_tasdiq: $('#mk-jd-avto').checked,
      sozlar: $('#mk-jd-sozlar').value.split('\n').map((x) => x.trim()).filter(Boolean),
      kunlar: Number($('#mk-jd-kunlar').value) || 7,
      soat: Number($('#mk-jd-soat').value) || 0,
      maqsad: Number($('#mk-jd-maqsad').value) || 40,
      sahifagacha: Number($('#mk-jd-sahifa').value) || 5,
    }) });
    tost($('#mk-jd-yoq').checked ? 'Avtomatik import yoqildi' : 'Saqlandi');
    await importChiz();
  } catch (e) { tost(e.message); }
}

async function importBoshla() {
  const havolalar = $('#mk-im-havola').value.trim();
  if (!havolalar) return tost('Bo‘lim havolasini qo‘ying');
  const t = $('#mk-import-boshla');
  t.disabled = true;
  try {
    await api('/api/admin/marketplace/vazifa', { method: 'POST', body: JSON.stringify({
      havolalar: havolalar.split('\n').map((x) => x.trim()).filter(Boolean),
      maqsad: Number($('#mk-im-maqsad').value) || 100,
      sahifadan: Number($('#mk-im-dan').value) || 1,
      sahifagacha: Number($('#mk-im-gacha').value) || 1,
      kechikish: Number($('#mk-im-kechikish').value) || 1500,
      avto_tasdiq: $('#mk-im-avto').checked,
    }) });
    tost('Import boshlandi — sahifani yopsangiz ham davom etadi');
    await importChiz();
  } catch (e) { tost(e.message); t.disabled = false; }
}

async function importToxtat() {
  try {
    await api('/api/admin/marketplace/vazifa/toxtat', { method: 'POST', body: '{}' });
    tost('To‘xtatildi');
    await importChiz();
    await marketplace();
  } catch (e) { tost(e.message); }
}

/** Navbatdagi hammasini katalogga — bittalab tasdiqlash uchun vaqt yo'q. */
async function marketHammasi() {
  const t = $('#mk-hammasi');
  t.disabled = true;
  t.textContent = 'Qo‘shilmoqda…';
  try {
    const j = await api('/api/admin/marketplace/tasdiq-hammasi',
      { method: 'POST', body: JSON.stringify({ limit: 500 }) });
    await marketplace();
    tost(`${j.qoshildi} ta qo‘shildi${j.otkazildi ? ` · ${j.otkazildi} tasi o‘tkazildi` : ''}`);
  } catch (e) { tost(e.message); t.disabled = false; }
}

/** API qoidalarini saqlash — JSON xatosi bo'lsa aynan qayerdaligi aytiladi. */
async function marketApiSaqla() {
  const xom = $('#mk-api').value.trim();
  let qoidalar;
  try { qoidalar = JSON.parse(xom || '[]'); }
  catch (e) { return tost(`JSON xato: ${e.message}`); }
  try {
    const j = await api('/api/admin/marketplace/api',
      { method: 'POST', body: JSON.stringify({ qoidalar }) });
    $('#mk-api').value = JSON.stringify(j.qoidalar, null, 2);
    tost(`${j.qoidalar.length} ta qoida saqlandi`);
  } catch (e) { tost(e.message); }
}

/**
 * Qoidani sinash: qaysi manzil chaqirilgani va nima kelgani ko'rsatiladi.
 * Do'kon API sini o'zgartirganda birinchi kerak bo'ladigan narsa shu.
 */
async function marketApiSinov() {
  const url = $('#mk-api-url').value.trim();
  if (!url) return tost('Mahsulot havolasini qo‘ying');
  const h = $('#mk-api-holat');
  h.innerHTML = `<div class="mayda"><span class="aylana"></span> So‘ralmoqda…</div>`;
  try {
    const j = await api('/api/admin/marketplace/api-sinov',
      { method: 'POST', body: JSON.stringify({ url }) });
    h.innerHTML = `
      <div class="xabar-quti ${j.ishladi ? 'ok' : 'ogoh'}" style="margin:0">
        ${j.ishladi ? '✅ API javob berdi — mahsulot shu yerdan olinadi'
                    : `⚠️ ${esc(j.sabab || 'API ishlamadi')} `
                      + '<br>Mahsulot baribir sahifa HTML idan o‘qiladi.'}
      </div>
      <div class="qator-karta" style="margin-top:8px">
        <div class="qator-satr"><span class="k">Qoida</span>
          <span class="v">${esc(j.qoida || '—')}</span></div>
        <div class="qator-satr"><span class="k">Chaqirilgan manzil</span>
          <span class="v" style="word-break:break-all;font-size:12px">${esc(j.api_url || '—')}</span></div>
        ${j.rasm ? `<div class="qator-satr"><span class="k">Rasm topildi</span>
          <span class="v">✅</span></div>` : ''}
        ${j.havolalar?.length ? `<div class="qator-satr"><span class="k">Ro‘yxatdan havola</span>
          <span class="v">${j.havolalar.length} ta</span></div>` : ''}
      </div>
      ${j.korinish ? `<details style="margin-top:8px"><summary class="mayda">Javob boshi</summary>
        <pre style="white-space:pre-wrap;word-break:break-all;font-size:11.5px;
          background:var(--fon);border-radius:10px;padding:10px;margin-top:6px;
          max-height:220px;overflow:auto">${esc(j.korinish)}</pre>
      </details>` : ''}`;
  } catch (e) {
    h.innerHTML = `<div class="xato">${esc(e.message)}</div>`;
  }
}

async function marketTasdiq(id) {
  try {
    const j = await api('/api/admin/marketplace/tasdiq',
      { method: 'POST', body: JSON.stringify({ id, ozgarish: {} }) });
    tost(`«${j.mahsulot.name}» katalogga qo‘shildi`);
    holat.kesh.mahsulotlar = null;
    marketplace();
  } catch (e) { tost(e.message); }
}

async function marketRad(id) {
  if (!confirm('Rad etilsinmi?')) return;
  await api('/api/admin/marketplace/rad', { method: 'POST', body: JSON.stringify({ id }) });
  marketplace();
}

// ═══════════ 6. SOTUVLAR ═══════════
const OY_NOM = ['yanvar','fevral','mart','aprel','may','iyun',
  'iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const oyMatni = (s) => {
  const [y, o] = String(s).split('-');
  return `${OY_NOM[Number(o) - 1] || o} ${y}`;
};

async function sotuvlar(oy = '') {
  try {
    const [j, h] = await Promise.all([
      api('/api/admin/sales' + (oy ? `?oy=${encodeURIComponent(oy)}` : '')),
      api('/api/admin/oylik'),
    ]);
    holat.kesh.oylar = h.oylar;

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Sotuvlar</h1>
        <button class="tug kichik xavf" id="t-sotuv-tozala">🗑 Tarixni tozalash</button></div>

      ${h.oylar.length ? `
      <div class="karta">
        <div class="karta-bosh"><h2>📅 Oylik hisobot</h2></div>
        <p class="mayda" style="margin:0 0 12px">
          <b>Sof foyda</b> = mahsulot daromadi − chegirma − tannarx.
          Yetkazish alohida: u pochtaga o‘tadi.</p>
        <div style="overflow-x:auto">
          <table class="jadval">
            <tr><th>Oy</th><th>Buyurtma</th><th>Tushum</th><th>Tannarx</th><th>Sof foyda</th></tr>
            ${h.oylar.map((o) => `<tr class="oy-qator ${o.oy === oy ? 'tanlangan' : ''}" data-oy="${esc(o.oy)}">
              <td><b>${esc(oyMatni(o.oy))}</b><br><span class="mayda">${o.mijoz} mijoz</span></td>
              <td>${o.buyurtma}</td>
              <td>${som(o.jami_tushum)}<br><span class="mayda">yetk. ${som(o.yetkazish)}</span></td>
              <td>${som(o.tannarx)}</td>
              <td><b style="color:var(--yashil)">${som(o.sof_foyda)}</b><br>
                  <span class="mayda">marja ${o.marja}%</span></td>
            </tr>`).join('')}
          </table>
        </div>
        ${oy ? `<button class="tug keng" id="t-oy-bekor" style="margin-top:12px">
          ✕ ${esc(oyMatni(oy))} filtrini olib tashlash</button>` : `
          <p class="mayda" style="margin:10px 0 0">Oy ustiga bosing — quyidagi
          mahsulotlar ro‘yxati faqat o‘sha oy uchun chiqadi.</p>`}
      </div>` : ''}

      <div class="bosh" style="margin-top:8px">
        <h1 style="font-size:19px">${oy ? esc(oyMatni(oy)) : 'Butun davr'} · mahsulotlar</h1></div>
      <div class="kpi-tor">
        ${kpi('Sotilgan dona', som(j.jami.soni))}
        ${kpi('Daromad', narx(j.jami.daromad))}
        ${kpi('Yalpi foyda', narx(j.jami.foyda),
          j.jami.daromad ? `marja ${Math.round(j.jami.foyda / j.jami.daromad * 100)}%` : '', true)}
      </div>
      ${j.sotuvlar.length ? j.sotuvlar.map((r, i) => `
        <div class="qator-karta">
          <div class="qator-bosh">
            <div><div class="nom">${i + 1}. ${esc(r.name)}</div>
              <div class="ozgina">${esc(r.brand || '')}</div></div>
            <span class="yor ${r.marja >= 35 ? 'yashil' : r.marja >= 20 ? 'sariq' : 'qizil'}">${r.marja}%</span>
          </div>
          <div style="margin-top:8px">
            <div class="qator-satr"><span class="k">Sotilgan</span><span class="v">${r.soni} dona</span></div>
            <div class="qator-satr"><span class="k">Daromad</span><span class="v">${som(r.daromad)}</span></div>
            <div class="qator-satr"><span class="k">Foyda</span>
              <span class="v" style="color:var(--yashil)">${som(r.foyda)}</span></div>
          </div>
        </div>`).join('') : boshHolat('💰', 'Bu davrda sotuv yo‘q')}`;

    $$('[data-oy]').forEach((el) => el.onclick = () => sotuvlar(el.dataset.oy));
    const bekor = $('#t-oy-bekor');
    if (bekor) bekor.onclick = () => sotuvlar('');
    $('#t-sotuv-tozala').onclick = sotuvTarixiniTozala;
  } catch (e) { xatoChiz(e); }
}

/** Sotuvlar tarixini butunlay o'chirish — noldan boshlash uchun. */
function sotuvTarixiniTozala() {
  modal('🗑 Sotuvlar tarixini tozalash', `
    <div class="xabar-quti ogoh" style="margin:0 0 14px">
      ⚠️ <b>Bu amalni QAYTARIB BO‘LMAYDI.</b><br>
      Barcha buyurtmalar, partiyalar va to‘lov cheklari o‘chadi.
      Buyurtma raqamlari yana 1 dan boshlanadi.
    </div>
    <p class="mayda" style="margin:0 0 12px">
      Mahsulotlar, mijozlar va sozlamalar <b>saqlanadi</b> — faqat sotuv
      tarixi tozalanadi. Sinovdan haqiqiy ishga o‘tayotganda foydali.</p>
    <label class="belgi-qator"><input type="checkbox" id="sr-hodisa">
      Voronka hodisalari ham o‘chirilsin</label>
    <label style="margin-top:14px">Tasdiqlash uchun <b>TOZALASH</b> deb yozing</label>
    <input id="sr-tasdiq" placeholder="TOZALASH" autocapitalize="characters">
    <div id="sr-xato" class="xato"></div>
    <button class="tug xavf keng" id="sr-ha" style="margin-top:14px">O‘chirish</button>
    <button class="tug keng" id="sr-yoq" style="margin-top:9px">Bekor</button>`);

  $('#sr-yoq').onclick = modalYop;
  $('#sr-ha').onclick = async () => {
    const t = $('#sr-ha');
    t.disabled = true; t.textContent = 'O‘chirilmoqda…';
    try {
      const j = await api('/api/admin/sales-reset', { method: 'POST', body: JSON.stringify({
        tasdiq: $('#sr-tasdiq').value, hodisalar: $('#sr-hodisa').checked }) });
      modalYop();
      tost(`${j.ochirildi} ta buyurtma o‘chirildi`);
      holat.kesh = {}; sotuvlar('');
    } catch (e) {
      $('#sr-xato').textContent = e.message;
      t.disabled = false; t.textContent = 'O‘chirish';
    }
  };
}

// ═══════════ 7. OMBORLAR ═══════════
async function omborlar() {
  try {
    const j = await api('/api/admin/omborlar');
    holat.kesh.omborlar = j.omborlar;
    $('#tan').innerHTML = `
      <div class="bosh"><h1>Omborlar</h1>
        <button class="tug asos" id="t-ombor-yangi">+ Qo‘shish</button></div>
      <div class="xabar-quti ogoh" style="background:var(--kok-och);color:var(--kok)">
        🏬 Buyurtma «Omborda» holatiga o‘tganda mijozga eng yaqin ombor manzili,
        telefoni va ish vaqti avtomatik yuboriladi.</div>
      ${j.omborlar.length ? j.omborlar.map((o) => `
        <div class="qator-karta" style="${o.faol ? '' : 'opacity:.5'}">
          <div class="qator-bosh">
            <div><div class="nom">🏬 ${esc(o.nom)}</div>
              <div class="ozgina">${esc(o.viloyat)}${o.tuman ? ' · ' + esc(o.tuman) : ''}</div></div>
            <span class="yor ${o.faol ? 'yashil' : 'kul'}">${o.faol ? 'faol' : 'o‘chirilgan'}</span>
          </div>
          <div style="margin-top:8px">
            ${o.manzil ? `<div class="qator-satr"><span class="k">📍 Manzil</span>
              <span class="v" style="max-width:60%">${esc(o.manzil)}</span></div>` : ''}
            ${o.mo_ljal ? `<div class="qator-satr"><span class="k">📌 Mo‘ljal</span>
              <span class="v">${esc(o.mo_ljal)}</span></div>` : ''}
            ${o.telefon ? `<div class="qator-satr"><span class="k">📞 Telefon</span>
              <span class="v">${esc(o.telefon)}</span></div>` : ''}
            ${o.ish_vaqti ? `<div class="qator-satr"><span class="k">🕘 Ish vaqti</span>
              <span class="v">${esc(o.ish_vaqti)}</span></div>` : ''}
            <div class="qator-satr"><span class="k">📦 Buyurtmalar</span>
              <span class="v">${o.buyurtma_soni} ta</span></div>
          </div>
          <div class="amallar"><button class="tug kichik" data-omb="${o.id}">✏️ Tahrirlash</button></div>
        </div>`).join('') : boshHolat('🏬', 'Hali ombor qo‘shilmagan')}`;
    $('#t-ombor-yangi').onclick = () => omborOyna(null);
    $$('[data-omb]').forEach((b) => b.onclick = () =>
      omborOyna(holat.kesh.omborlar.find((o) => o.id === Number(b.dataset.omb))));
  } catch (e) { xatoChiz(e); }
}

function omborOyna(o) {
  const viloyatlar = window.VILOYATLAR || [];
  modal(o ? 'Omborni tahrirlash' : 'Yangi ombor', `
    <label>Nomi *</label>
    <input id="o-nom" value="${esc(o?.nom || '')}" placeholder="Chilonzor filiali">
    <label>Viloyat *</label>
    <select id="o-viloyat">
      <option value="">Tanlang</option>
      ${viloyatlar.map((v) => `<option ${v === o?.viloyat ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select>
    <label>Tuman</label>
    <select id="o-tuman"><option value="">— barcha tumanlar —</option></select>
    <label>Manzil</label><input id="o-manzil" value="${esc(o?.manzil || '')}" placeholder="Bunyodkor ko‘chasi 12">
    <label>Mo‘ljal <span class="yordam">Mijoz topishi oson bo‘lsin</span></label>
    <input id="o-moljal" value="${esc(o?.mo_ljal || '')}" placeholder="Metro yonida, 2-qavat">
    <div class="forma-tor">
      <div><label>Telefon</label><input id="o-tel" value="${esc(o?.telefon || '')}" placeholder="+998 90 123 45 67"></div>
      <div><label>Ish vaqti</label><input id="o-vaqt" value="${esc(o?.ish_vaqti || '')}" placeholder="9:00–21:00"></div>
    </div>
    <label>Tartib <span class="yordam">Kichik son — birinchi tanlanadi</span></label>
    <input id="o-tartib" type="number" value="${o?.tartib ?? 100}">
    <label class="belgi-qator" style="margin-top:16px">
      <input type="checkbox" id="o-faol" ${o?.faol !== false ? 'checked' : ''}> Faol</label>
    <div id="o-xato" class="xato"></div>
    <button class="tug asos keng" id="o-saqla" style="margin-top:18px">Saqlash</button>`);

  const tumanTanlov = $('#o-tuman');
  const tumanlarniYangila = (viloyat, tanlangan) => {
    const t = window.tumanlarniOl?.(viloyat) || [];
    tumanTanlov.innerHTML = '<option value="">— barcha tumanlar —</option>' +
      t.map((x) => `<option ${x === tanlangan ? 'selected' : ''}>${esc(x)}</option>`).join('');
  };
  tumanlarniYangila(o?.viloyat, o?.tuman);
  $('#o-viloyat').onchange = (e) => tumanlarniYangila(e.target.value);

  $('#o-saqla').onclick = async () => {
    const xato = $('#o-xato');
    const tana = {
      id: o?.id || undefined,
      nom: $('#o-nom').value.trim(), viloyat: $('#o-viloyat').value,
      tuman: tumanTanlov.value, manzil: $('#o-manzil').value.trim(),
      mo_ljal: $('#o-moljal').value.trim(), telefon: $('#o-tel').value.trim(),
      ish_vaqti: $('#o-vaqt').value.trim(), tartib: Number($('#o-tartib').value) || 100,
      faol: $('#o-faol').checked,
    };
    if (!tana.nom)     return xato.textContent = 'Nomi kerak.';
    if (!tana.viloyat) return xato.textContent = 'Viloyatni tanlang.';
    $('#o-saqla').disabled = true;
    try {
      await api('/api/admin/ombor', { method: 'POST', body: JSON.stringify(tana) });
      modalYop(); tost('Saqlandi'); yuklanmoqda(); omborlar();
    } catch (e) { xato.textContent = e.message; $('#o-saqla').disabled = false; }
  };
}

// ═══════════ 8. SOZLAMALAR ═══════════
async function sozlamalar() {
  try {
    const j = await api('/api/admin/settings');
    const st = j.settings;
    holat.kesh.mavzu = { ...(st.mavzu || {}) };
    holat.kesh.mavzuToplamlar = j.mavzu_toplamlar || [];
    const matn = (k, z = '') => String(st[k] ?? z).replace(/^"|"$/g, '');
    holat.kesh.pogonalar = Array.isArray(st.chegirma_pogonalari) ? [...st.chegirma_pogonalari] : [];

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Sozlamalar</h1></div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>💳 To‘lov kartasi</h2></div>
        <p class="mayda" style="margin:0">Mijoz buyurtmani tasdiqlaganda shu raqam chiqadi.
          To‘lov faqat karta orqali.</p>
        <label>Karta raqami</label>
        <input id="s-karta" inputmode="numeric" value="${esc(matn('karta_raqami'))}" placeholder="8600 0000 0000 0000">
        <label>Karta egasining ismi</label>
        <input id="s-egasi" value="${esc(matn('karta_egasi'))}" placeholder="ALIYEV ALI">
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🎁 Chegirma pog‘onalari</h2></div>
        <p class="mayda" style="margin:0 0 10px">Savat summasi chegaradan oshsa chegirma beriladi.
          Bir nechta pog‘ona mos kelsa — eng kattasi.</p>
        <div id="pogonalar"></div>
        <button class="tug kichik" id="p-qosh" style="margin-top:8px">+ Pog‘ona</button>
        <div id="p-namuna" class="ozgina" style="margin-top:10px"></div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>📦 Har mahsulot uchun chegirma</h2></div>
        <p class="mayda" style="margin:0 0 10px">Mijoz nechta DONA olsa, har biriga shuncha
          chegirma. 5 000 × 6 dona = 30 000 — pochta haqi o‘zini qoplaydi.
          Bu summa pog‘onasi bilan <b>qo‘shiladi</b>.</p>
        <div class="forma-tor">
          <div><label>Har donaga (so‘m) <span class="yordam">0 — o‘chirilgan</span></label>
            <input id="s-dona-chegirma" type="number" inputmode="numeric"
                   value="${Number(st.mahsulot_chegirma) || 0}"></div>
          <div><label>Nechta donadan boshlab</label>
            <input id="s-dona-dan" type="number" inputmode="numeric" min="1"
                   value="${Number(st.mahsulot_chegirma_dan) || 1}"></div>
        </div>
        <div id="dona-namuna" class="ozgina" style="margin-top:10px"></div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🧾 Minimal buyurtma</h2></div>
        <p class="mayda" style="margin:0 0 10px">Shu summadan kam savat bilan buyurtma
          berib bo‘lmaydi (yetkazish hisobga olinmaydi). Kichik buyurtma pochta haqi
          bilan zarar keltiradi. 0 — cheklov yo‘q.</p>
        <label>Minimal summa (so‘m)</label>
        <input id="s-minimal" type="number" inputmode="numeric"
               value="${Number(st.minimal_buyurtma) || 0}">
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🚚 Yetkazib berish</h2></div>
        <p class="mayda" style="margin:0 0 10px">Aniq narx EMU tarifidan hisoblanadi va
          mijozga faqat rasmiylashtirishda — manzil tanlangach — ko‘rinadi.
          Quyidagi narx faqat zaxira sifatida ishlatiladi.</p>
        <div class="forma-tor">
          <div><label>Zaxira narxi (so‘m)</label>
            <input id="s-fee" type="number" inputmode="numeric" value="${Number(st.delivery_fee) || 25000}"></div>
          <div><label>Qaysi summadan bepul</label>
            <input id="s-free" type="number" inputmode="numeric" value="${Number(st.free_delivery_from) || 500000}"></div>
        </div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>💬 Menejer</h2></div>
        <label>Telegram username <span class="yordam">@ belgisisiz</span></label>
        <input id="s-konsult" value="${esc(matn('konsultatsiya_user'))}" placeholder="qoraqosh_admin">
        <label>Telefon raqami</label>
        <input id="s-tel" inputmode="tel" value="${esc(matn('menejer_telefon'))}" placeholder="+998 90 123 45 67">
        <label>Ish vaqti</label>
        <input id="s-vaqt" value="${esc(matn('menejer_ish_vaqti'))}" placeholder="Har kuni 9:00 – 21:00">
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🎨 Ilova mavzusi</h2></div>
        <p class="mayda" style="margin:0 0 12px">Ikkita rang tanlaysiz —
          <b>sarlavha</b> va <b>fon</b>. Qolgan tuslar shulardan hisoblanadi,
          shuning uchun o‘qib bo‘lmaydigan kombinatsiya chiqmaydi.
          Ranglar Mini App’ga ham, tahlil rasmiga ham qo‘llanadi.</p>

        <div class="mavzu-toplamlar" id="mavzu-toplamlar"></div>

        <div class="forma-tor" style="margin-top:14px">
          <div><label>Sarlavha rangi</label>
            <div class="rang-tanlov">
              <input type="color" id="s-mv-asosiy">
              <input type="text" id="s-mv-asosiy-hex" spellcheck="false" maxlength="7">
            </div></div>
          <div><label>Fon rangi</label>
            <div class="rang-tanlov">
              <input type="color" id="s-mv-fon">
              <input type="text" id="s-mv-fon-hex" spellcheck="false" maxlength="7">
            </div></div>
          <div><label>Urg‘u (tugma va narx)</label>
            <div class="rang-tanlov">
              <input type="color" id="s-mv-urgu">
              <input type="text" id="s-mv-urgu-hex" spellcheck="false" maxlength="7">
            </div></div>
        </div>

        <label style="margin-top:14px">Ko‘rinishi</label>
        <div id="mavzu-korinish"></div>

        <div id="mavzu-holat"></div>
        <button class="tug asos keng" id="t-mavzu-saqla" style="margin-top:10px">
          Mavzuni saqlash</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>📄 Ommaviy oferta</h2></div>
        <p class="mayda" style="margin:0 0 10px">Bu matn <code>/oferta</code> sahifasida
          va ro‘yxatdan o‘tishda ko‘rinadi. Bo‘sh qoldirsangiz koddagi namunaviy
          shablon ishlaydi (unda <b>[kvadrat qavs]</b> joylari to‘ldirilmagan).
          <b>Yuristingiz bergan matnni shu yerga qo‘ying.</b></p>
        <p class="mayda" style="margin:0 0 10px">Belgilash: <code># Sarlavha</code> ·
          <code>## Bo‘lim</code> · <code>- ro‘yxat bandi</code>. HTML yozish shart emas.</p>
        <textarea id="s-oferta" rows="12" style="font-family:ui-monospace,monospace;font-size:13px"
          placeholder="# Ommaviy oferta&#10;&#10;## 1. Umumiy qoidalar&#10;- Sotuvchi: ...">${esc(matn('oferta_matni'))}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <a class="tug" href="/oferta" target="_blank">👁 Sahifani ko‘rish</a>
        </div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🖼 Bosh sahifa karuseli</h2></div>
        <p class="mayda" style="margin:0 0 10px">Ilova ochilganda eng yuqorida
          ko‘rinadigan rasmlar — aylanib turadi va ustidagi tugma yuz skaneriga
          olib boradi. <b>Kengroq rasm qo‘ying</b> (16:10 ga yaqin);
          ko‘pi bilan 10 ta. Rasm qo‘yilmasa oddiy chaqiriq kartasi ko‘rinadi.</p>
        <div id="karusel-royxat" class="karusel-royxat"></div>
        <input type="file" id="s-karusel" accept="image/png,image/jpeg" style="display:none">
        <button class="tug keng" id="t-karusel" style="margin-top:8px">🖼 Rasm qo‘shish</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>📸 Skaner namunasi</h2></div>
        <p class="mayda" style="margin:0 0 10px">«Yuz skaneri» ochilganda ko‘rsatiladigan
          namuna surat. Odam qanday rasm kutilayotganini o‘qib emas, <b>ko‘rib</b>
          tushunadi — shuning uchun bu rad etilgan rasmlarni ancha kamaytiradi.
          To‘g‘ri va noto‘g‘ri variantlar yonma-yon turgan rasm eng yaxshi ishlaydi.</p>
        <div id="namuna-oldi" style="margin:8px 0">${
          matn('skaner_namuna_id')
            ? `<img src="/media/${esc(matn('skaner_namuna_id'))}" alt="namuna"
                 style="max-width:180px;border-radius:14px;border:1px solid var(--chiziq)">`
            : '<span class="mayda">Yuklanmagan — ilovada matnli ko‘rsatma ko‘rinadi</span>'}</div>
        <input type="file" id="s-namuna" accept="image/png,image/jpeg" style="display:none">
        <div style="display:flex;gap:8px">
          <button class="tug" id="t-namuna">📷 Namuna yuklash</button>
          ${matn('skaner_namuna_id') ? '<button class="tug xavf" id="t-namuna-och">🗑 Olib tashlash</button>' : ''}
        </div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🏷 Brend</h2></div>
        <label>Do‘kon nomi <span class="yordam">bot, ilova va rasmlarda ko‘rinadi</span></label>
        <input id="s-brend" value="${esc(matn('dokon_nomi'))}" placeholder="KiOVO">
        <p class="mayda" style="margin:6px 0 14px">Botdan turib ham o‘zgartirasiz: <code>/brend</code></p>

        <label>Logotip <span class="yordam">tahlil rasmlarida chiqadi</span></label>
        <div id="logo-oldi" style="margin:8px 0">${
          matn('brend_rasm_id')
            ? `<img src="/media/${esc(matn('brend_rasm_id'))}" alt="logo"
                 style="width:72px;height:72px;border-radius:18px;object-fit:cover;border:1px solid var(--chiziq)">`
            : '<span class="mayda">Yuklanmagan</span>'}</div>
        <input type="file" id="s-logo" accept="image/png,image/jpeg" style="display:none">
        <div style="display:flex;gap:8px">
          <button class="tug" id="t-logo">📷 Logotip yuklash</button>
          ${matn('brend_rasm_id') ? '<button class="tug xavf" id="t-logo-och">🗑 Olib tashlash</button>' : ''}
        </div>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🔒 Majburiy obuna</h2></div>
        <p class="mayda" style="margin:0 0 12px">
          Kanal yozilsa, unga a'zo bo‘lmagan foydalanuvchi botdan foydalana olmaydi.
          Botni o‘sha kanalga <b>admin</b> qilib qo‘shing. Adminlar hech qachon to‘silmaydi.</p>
        <label>Kanal <span class="yordam">@nom yoki -100…</span></label>
        <input id="s-majburiy" value="${esc(matn('majburiy_kanal'))}" placeholder="@meduza_kanal">
        <label>Havola <span class="yordam">bo‘sh qoldirsangiz bot o‘zi topadi</span></label>
        <input id="s-majburiy-havola" value="${esc(matn('majburiy_kanal_havola'))}"
          placeholder="https://t.me/+AbCdEf...">
        <p class="mayda" style="margin:6px 0 0">
          Kanal <code>@nom</code> bilan yozilsa havola o‘zi yasaladi.
          <code>-100…</code> ID bo‘lsa bot Telegram’dan so‘rab oladi —
          buning uchun u kanalda <b>admin</b> bo‘lishi kerak.</p>
        <div class="xabar-quti ogoh" style="margin:10px 0 0">
          ⚠️ Havola topilmasa majburiy obuna <b>vaqtincha o‘chadi</b>:
          foydalanuvchi qayerga borishni bilmay botdan umuman
          foydalana olmay qolmasligi uchun.
        </div>
        <button class="tug keng" id="t-obuna-sina" style="margin-top:12px">
          🔍 Kanalni tekshirish</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🚚 Yetkazib berish</h2></div>
        <p class="mayda" style="margin:0 0 12px">
          Biz uyigacha o‘zimiz eltmaymiz — jo‘natma pochta orqali ketadi.
          Mijoz <b>filialdan olib ketish</b> yoki <b>manziligacha yetkazish</b> ni tanlaydi,
          narx og‘irlikka qarab hisoblanadi.</p>

        <label>Kim orqali <span class="yordam">narx shunga qarab hisoblanadi</span></label>
        <select id="s-provayder">
          <option value="emu" ${String(st.yetkazish_provayder).replace(/"/g,'') !== 'jadval' ? 'selected' : ''}>
            EMU Express — rasmiy tarif kartasi (avtomatik)</option>
          <option value="jadval" ${String(st.yetkazish_provayder).replace(/"/g,'') === 'jadval' ? 'selected' : ''}>
            O‘z narxim (oddiy jadval)</option>
        </select>
        <p class="mayda" style="margin:6px 0 14px">
          EMU tanlansa narx <b>zona × masofa × og‘irlik</b> bo‘yicha o‘zi
          hisoblanadi (Avgust 2025 tarif kartasi). Zona jo‘natuvchi va
          qabul qiluvchi viloyatdan chiqadi.</p>

        <label>Jo‘natuvchi viloyati <span class="yordam">qayerdan jo‘natasiz</span></label>
        <select id="s-jon-viloyat">
          ${(window.VILOYATLAR || ['Toshkent shahri']).map((v) => `<option value="${esc(v)}"
            ${matn('jonatuvchi_viloyat') === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select>

        <div class="forma-tor" style="margin-top:12px">
          <div><label>Qadoqlash (gramm)</label>
            <input id="s-qadoq" type="number" inputmode="numeric" min="0"
              value="${Number(st.qadoq_ogirlik) || 200}"></div>
          <div><label>Og‘irligi yo‘q mahsulot (g)</label>
            <input id="s-standart-og" type="number" inputmode="numeric" min="0"
              value="${Number(st.standart_ogirlik) || 150}"></div>
          <div><label>Ustama (%) <span class="yordam">qadoqlash mehnati</span></label>
            <input id="s-ustama" type="number" inputmode="numeric" min="0" max="100"
              value="${Number(st.yetkazish_ustama_foiz) || 0}"></div>
          <div><label>QQS (%) <span class="yordam">EMU narxi QQS siz</span></label>
            <input id="s-qqs" type="number" inputmode="numeric" min="0" max="100"
              value="${Number(st.yetkazish_qqs_foiz) || 0}"></div>
        </div>

        <details style="margin-top:14px">
          <summary class="mayda" style="cursor:pointer">O‘z narxim (EMU o‘rniga)</summary>
          <div class="forma-tor" style="margin-top:10px">
            <div><label>Filialdan olish (1 kg)</label>
              <input id="s-t-filial" type="number" inputmode="numeric" min="0"
                value="${Number(st.tarif_filial_1kg) || 7000}"></div>
            <div><label>Uygacha (1 kg)</label>
              <input id="s-t-uy" type="number" inputmode="numeric" min="0"
                value="${Number(st.tarif_uy_1kg) || 15000}"></div>
            <div><label>Har qo‘shimcha kg</label>
              <input id="s-t-kg" type="number" inputmode="numeric" min="0"
                value="${Number(st.tarif_qoshimcha_kg) || 5000}"></div>
          </div>
        </details>

        <details style="margin-top:10px">
          <summary class="mayda" style="cursor:pointer">Pochta xizmati API si (ixtiyoriy)</summary>
          <p class="mayda" style="margin:8px 0 0">
            Sozlansa narx o‘shandan olinadi; javob bermasa yuqoridagi tarif ishlaydi.</p>
          <label>API manzili</label>
          <input id="s-api-url" type="url" inputmode="url"
            value="${esc(matn('yetkazish_api_url'))}" placeholder="https://api.emu.uz/calculate">
          <label>API kaliti</label>
          <input id="s-api-kalit" value="${esc(matn('yetkazish_api_kalit'))}" placeholder="token">
        </details>

        <button class="tug keng" id="t-tarif-sina" style="margin-top:14px">🧮 Narxni sinab ko‘rish</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🧾 Xarid va pochta</h2></div>
        <label>Xarid kanali <span class="yordam">/orders ro‘yxati shu yerga tushadi</span></label>
        <input id="s-xarid-kanal" value="${esc(matn('xarid_kanal'))}" placeholder="-1001234567890">
        <label>Jo‘natuvchi manzili <span class="yordam">pochta hujjatida «KIMDAN»</span></label>
        <input id="s-jonatuvchi" value="${esc(matn('jonatuvchi_manzil'))}"
          placeholder="Toshkent shahri, Chilonzor tumani, Bunyodkor 12">
        <label class="belgi-qator" style="margin-top:12px"><input type="checkbox" id="s-chek-saqla"
          ${String(st.chek_saqlansin) === 'true' ? 'checked' : ''}> To‘lov cheklari saqlansin</label>
        <p class="mayda" style="margin:6px 0 0">
          Odatda o‘chiq: chek tekshirilgach o‘chiriladi — mijozning bank ma’lumoti
          bazada yotishi shart emas.</p>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>📢 Telegram kanallar</h2></div>
        <p class="mayda" style="margin:0 0 12px">
          Botni kanalga <b>admin</b> qilib qo‘shing, so‘ng kanal ID sini
          (<code>-100…</code>) yoki <code>@nom</code> ni yozing.
          Bo‘sh qoldirsangiz hech narsa yuborilmaydi.</p>

        <label>🛒 Buyurtmalar kanali</label>
        <input id="s-kanal-buyurtma" value="${esc(matn('kanal_buyurtma'))}" placeholder="-1001234567890">
        <p class="mayda" style="margin:6px 0 14px">
          Yangi buyurtma, to‘lov cheki (rasm + ma’lumot) va holat o‘zgarishi shu yerga tushadi.</p>

        <label>🔬 Tahlillar kanali</label>
        <input id="s-kanal-tahlil" value="${esc(matn('kanal_tahlil'))}" placeholder="-1009876543210">
        <label class="belgi-qator" style="margin-top:8px"><input type="checkbox" id="s-kanal-tahlil-yoq"
          ${String(st.kanal_tahlil_yoqilgan) === 'true' ? 'checked' : ''}> Tahlillarni kanalga yuborish</label>
        <div class="xabar-quti ogoh" style="margin:10px 0 0">
          ⚠️ Bu kanalga <b>mijozlarning yuz suratlari</b> tushadi. Kanal yopiq bo‘lsin va
          faqat xodimlaringiz kirsin. Shu sababli u sukut bo‘yicha o‘chiq turadi.
        </div>
        <button class="tug keng" id="t-kanal-sina" style="margin-top:12px">📨 Kanallarni sinash</button>
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🔬 Kunlik skaner limiti</h2></div>
        <p class="mayda" style="margin:0 0 10px"><b>Mijoz</b> — kamida bitta buyurtmasi bor
          foydalanuvchi. Unga limit kattaroq: bu xaridga undaydi.</p>
        <label class="belgi-qator"><input type="checkbox" id="s-limit-yoq"
          ${String(st.limit_yoqilgan) === 'true' ? 'checked' : ''}> Limit ishlasin</label>
        <div class="forma-tor">
          <div><label>Oddiy foydalanuvchi</label>
            <input id="s-limit-bepul" type="number" inputmode="numeric" min="0" value="${Number(st.limit_bepul) || 3}"></div>
          <div><label>Xarid qilgan mijoz</label>
            <input id="s-limit-mijoz" type="number" inputmode="numeric" min="0" value="${Number(st.limit_mijoz) || 10}"></div>
        </div>
      </div>

      <div class="karta tor" id="admin-quti">
        <div class="karta-bosh"><h2>🔑 Adminlar</h2></div>
        <div id="adminlar"><span class="aylana"></span></div>
      </div>

      <div style="padding:0 16px">
        <div id="s-holat"></div>
        <button class="tug asos keng" id="s-saqla">Barcha sozlamalarni saqlash</button>
      </div>`;

    pogonalarniChiz();
    $('#p-qosh').onclick = () => { holat.kesh.pogonalar.push({ dan: 0, chegirma: 0 }); pogonalarniChiz(); };
    donaNamunaChiz();
    $('#s-dona-chegirma').oninput = donaNamunaChiz;
    $('#s-dona-dan').oninput = donaNamunaChiz;
    mavzuniUla();
    $('#s-saqla').onclick = sozlamalarniSaqla;
    $('#t-kanal-sina').onclick = kanallarniSina;
    $('#t-tarif-sina').onclick = tarifniSina;
    $('#t-obuna-sina').onclick = obunaniSina;
    $('#t-logo').onclick = () => $('#s-logo').click();
    $('#s-logo').onchange = logoniYukla;
    $('#t-namuna').onclick = () => $('#s-namuna').click();
  $('#t-karusel').onclick = () => $('#s-karusel').click();
  $('#s-karusel').onchange = karuselYukla;
  karuselniChiz();
    $('#s-namuna').onchange = namunaniYukla;
    const nOch = $('#t-namuna-och');
    if (nOch) nOch.onclick = async () => {
      if (!confirm('Namuna surat olib tashlansinmi?')) return;
      await api('/api/admin/skaner-namuna', { method: 'DELETE' });
      tost('Olib tashlandi'); sozlamalar();
    };
    const lo = $('#t-logo-och');
    if (lo) lo.onclick = async () => {
      await api('/api/admin/settings', { method: 'POST',
        body: JSON.stringify({ settings: { brend_rasm_id: '' } }) });
      tost('Logotip olib tashlandi'); sozlamalar();
    };
    adminlarniChiz();
  } catch (e) { xatoChiz(e); }
}

function pogonalarniChiz() {
  const el = $('#pogonalar');
  const p = holat.kesh.pogonalar;
  el.innerHTML = p.length ? p.map((x, i) => `
    <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px">
      <div style="flex:1"><label style="margin-top:0">Summadan oshsa</label>
        <input type="number" inputmode="numeric" data-dan="${i}" value="${Number(x.dan) || 0}"></div>
      <div style="flex:1"><label style="margin-top:0">Chegirma</label>
        <input type="number" inputmode="numeric" data-ch="${i}" value="${Number(x.chegirma) || 0}"></div>
      <button class="tug kichik xavf" data-och="${i}" style="height:44px">🗑</button>
    </div>`).join('') : `<p class="mayda">Pog‘ona yo‘q — chegirma berilmaydi.</p>`;
  $$('[data-dan]', el).forEach((i) => i.oninput = () => {
    p[Number(i.dataset.dan)].dan = Number(i.value) || 0; namunaChiz(); });
  $$('[data-ch]', el).forEach((i) => i.oninput = () => {
    p[Number(i.dataset.ch)].chegirma = Number(i.value) || 0; namunaChiz(); });
  $$('[data-och]', el).forEach((b) => b.onclick = () => {
    p.splice(Number(b.dataset.och), 1); pogonalarniChiz(); });
  namunaChiz();
}

// ---------- Ilova mavzusi ----------
//
// Admin ikkita rang tanlaydi; qolgan tuslar SERVERDA hisoblanadi
// (src/lib/mavzu.js) va o'sha palitra ilovaga ham, tahlil rasmiga ham
// boradi. Shu sababli bu yerdagi ko'rinish haqiqiy natijaga mos tushadi.

/** Rangdan matn rangini tanlaydi — WCAG yorqinligi bo'yicha. */
function kontrastMatn(hex) {
  const t = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(t)) return '#fff';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(t.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.45 ? '#141414' : '#ffffff';
}

const aralash = (hex, ulush, oq) => {
  const t = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(t)) return hex;
  const c = [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16))
    .map((v) => (oq ? v + (255 - v) * ulush : v * (1 - ulush)));
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
};

function mavzuniUla() {
  const M = holat.kesh.mavzu || {};
  const maydonlar = [['asosiy', M.asosiy], ['fon', M.fon], ['urgu', M.urgu]];

  for (const [kalit, qiymat] of maydonlar) {
    const rang = $('#s-mv-' + kalit);
    const hex  = $('#s-mv-' + kalit + '-hex');
    if (!rang || !hex) continue;
    rang.value = qiymat || '#000000';
    hex.value  = qiymat || '';
    // Ikkita maydon bir qiymatni ko'rsatadi: rangni ko'z bilan tanlash ham,
    // brend kitobidan hex ko'chirib qo'yish ham ishlashi kerak
    rang.oninput = () => { hex.value = rang.value; mavzuOzgardi(); };
    hex.oninput = () => {
      const v = hex.value.trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(v)) { rang.value = v.startsWith('#') ? v : '#' + v; mavzuOzgardi(); }
    };
  }

  // Tayyor to'plamlar
  const t = $('#mavzu-toplamlar');
  if (t) {
    t.innerHTML = (holat.kesh.mavzuToplamlar || []).map((x) => `
      <button class="mavzu-plita" data-mv='${esc(JSON.stringify(x))}' title="${esc(x.nom)}">
        <span class="mv-tus"><i style="background:${esc(x.asosiy)}"></i><i style="background:${esc(x.fon)}"></i></span>
        <span class="mv-nom">${esc(x.nom)}</span>
      </button>`).join('');
    $$('[data-mv]', t).forEach((b) => b.onclick = () => {
      const x = JSON.parse(b.dataset.mv);
      $('#s-mv-asosiy').value = x.asosiy; $('#s-mv-asosiy-hex').value = x.asosiy;
      $('#s-mv-fon').value    = x.fon;    $('#s-mv-fon-hex').value    = x.fon;
      $('#s-mv-urgu').value   = x.urgu;   $('#s-mv-urgu-hex').value   = x.urgu;
      mavzuOzgardi();
    });
  }

  $('#t-mavzu-saqla').onclick = mavzuniSaqla;
  mavzuOzgardi();
}

/** Jonli ko'rinish — tahlil rasmining kichraytirilgan taqlidi. */
function mavzuOzgardi() {
  const el = $('#mavzu-korinish'); if (!el) return;
  const asosiy = $('#s-mv-asosiy').value;
  const fon    = $('#s-mv-fon').value;
  const urgu   = $('#s-mv-urgu').value;
  const oq     = kontrastMatn(asosiy);
  const shaffof = oq === '#ffffff' ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const fonMatn = kontrastMatn(fon);
  const karta   = fonMatn === '#141414' ? '#ffffff' : aralash(fon, 0.35, false);
  const chiziq  = fonMatn === '#141414' ? aralash(fon, 0.1, false) : aralash(fon, 0.12, true);

  el.innerHTML = `
    <div class="mv-korinish" style="background:${fon}">
      <div class="mv-bosh" style="background:linear-gradient(160deg,${aralash(asosiy, .12, true)},${aralash(asosiy, .22, false)});color:${oq}">
        <div class="mv-brend">
          <span class="mv-nishon" style="background:${shaffof}.18)"></span>
          <b>${esc(holat.kesh.mavzu?.brend || 'KiOVO')}</b>
          <span class="mv-ong" style="opacity:.8">Teri tahlili</span>
        </div>
        <div class="mv-karta" style="background:${shaffof}.1);border-color:${shaffof}.16)">
          <span class="mv-surat" style="background:${shaffof}.16)"></span>
          <span class="mv-tan">
            <b>Teri holati</b>
            <span class="mv-yorliqlar">
              <i style="background:${shaffof}.18)">18–22 yosh</i>
              <i style="background:${shaffof}.18)">yog‘li teri</i>
            </span>
            <span class="mv-chiziq" style="background:${shaffof}.22)">
              <i style="background:${aralash(urgu, .35, true)}"></i></span>
          </span>
        </div>
      </div>
      <div class="mv-tan-past">
        <div class="mv-satr" style="background:${karta};border-color:${chiziq};color:${fonMatn}">
          <i style="background:#D92B2B"></i><b>Terining yog‘liligi</b><span style="color:#D92B2B">70%</span>
        </div>
        <div class="mv-satr" style="background:${karta};border-color:${chiziq};color:${fonMatn}">
          <i style="background:#E8703A"></i><b>Kengaygan teshiklar</b><span style="color:#E8703A">65%</span>
        </div>
        <button class="mv-tugma" style="background:${urgu};color:${kontrastMatn(urgu)}">
          Savatga qo‘shish</button>
      </div>
    </div>`;
}

async function mavzuniSaqla() {
  const t = $('#t-mavzu-saqla');
  t.disabled = true; t.textContent = 'Saqlanmoqda…';
  try {
    const j = await api('/api/admin/mavzu', { method: 'POST', body: JSON.stringify({
      asosiy: $('#s-mv-asosiy').value,
      fon:    $('#s-mv-fon').value,
      urgu:   $('#s-mv-urgu').value,
    })});
    holat.kesh.mavzu = j.palitra;
    $('#mavzu-holat').innerHTML =
      `<div class="xabar-quti ok" style="margin:10px 0 0">✓ Saqlandi — ilovada va tahlil rasmida ko‘rinadi</div>`;
    setTimeout(() => { const h = $('#mavzu-holat'); if (h) h.innerHTML = ''; }, 4000);
  } catch (e) {
    $('#mavzu-holat').innerHTML = `<div class="xato">${esc(e.message)}</div>`;
  } finally {
    t.disabled = false; t.textContent = 'Mavzuni saqlash';
  }
}

/** Dona chegirmasi: admin raqamni yozayotganda natijani darhol ko'rsatamiz. */
function donaNamunaChiz() {
  const el = $('#dona-namuna'); if (!el) return;
  const narx = Math.max(0, Number($('#s-dona-chegirma')?.value) || 0);
  const dan  = Math.max(1, Number($('#s-dona-dan')?.value) || 1);
  if (!narx) return void (el.innerHTML = '<b>O‘chirilgan</b> — dona bo‘yicha chegirma berilmaydi.');
  el.innerHTML = `<b>Misol:</b> ` + [dan, dan + 2, 6, 10].filter((n, i, a) => a.indexOf(n) === i)
    .sort((a, b) => a - b)
    .map((n) => `${n} ta → −${som(narx * n)}`).join(' · ');
}

function namunaChiz() {
  const el = $('#p-namuna'); if (!el) return;
  const p = [...holat.kesh.pogonalar].filter((x) => x.dan > 0 && x.chegirma > 0).sort((a, b) => a.dan - b.dan);
  if (!p.length) return void (el.innerHTML = '');
  el.innerHTML = `<b>Misol:</b> ` + [200000, 350000, 550000, 800000].map((sum) => {
    const ch = p.reduce((m, x) => (sum >= x.dan ? Math.max(m, x.chegirma) : m), 0);
    return `${som(sum)} → ${ch ? `−${som(ch)}` : 'chegirmasiz'}`;
  }).join(' · ');
}

async function sozlamalarniSaqla() {
  const holatEl = $('#s-holat');
  const pogonalar = holat.kesh.pogonalar
    .filter((p) => Number(p.dan) > 0 && Number(p.chegirma) > 0)
    .map((p) => ({ dan: Number(p.dan), chegirma: Number(p.chegirma) }))
    .sort((a, b) => a.dan - b.dan);
  for (let i = 1; i < pogonalar.length; i++) {
    if (pogonalar[i].chegirma < pogonalar[i - 1].chegirma) {
      holatEl.innerHTML = `<div class="xabar-quti xato" style="margin:0 0 10px">
        ${som(pogonalar[i].dan)} so‘mlik pog‘onada chegirma oldingisidan kam.
        Kattaroq savdoga kattaroq chegirma bo‘lishi kerak.</div>`;
      return;
    }
  }
  try {
    await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ settings: {
      chegirma_pogonalari: pogonalar,
      karta_raqami:       $('#s-karta').value.trim(),
      karta_egasi:        $('#s-egasi').value.trim(),
      delivery_fee:       Number($('#s-fee').value) || 0,
      free_delivery_from: Number($('#s-free').value) || 0,
      mahsulot_chegirma:     Math.max(0, Number($('#s-dona-chegirma').value) || 0),
      mahsulot_chegirma_dan: Math.max(1, Number($('#s-dona-dan').value) || 1),
      minimal_buyurtma:      Math.max(0, Number($('#s-minimal').value) || 0),
      konsultatsiya_user: $('#s-konsult').value.trim().replace(/^@/, ''),
      menejer_telefon:    $('#s-tel').value.trim(),
      menejer_ish_vaqti:  $('#s-vaqt').value.trim(),
      limit_yoqilgan:     $('#s-limit-yoq').checked,
      limit_bepul:        Math.max(0, Number($('#s-limit-bepul').value) || 0),
      limit_mijoz:        Math.max(0, Number($('#s-limit-mijoz').value) || 0),
      dokon_nomi:            $('#s-brend').value.trim() || 'KiOVO',
      oferta_matni:          $('#s-oferta').value.trim(),
      kanal_buyurtma:        $('#s-kanal-buyurtma').value.trim(),
      kanal_tahlil:          $('#s-kanal-tahlil').value.trim(),
      kanal_tahlil_yoqilgan: $('#s-kanal-tahlil-yoq').checked,
      majburiy_kanal:        $('#s-majburiy').value.trim(),
      majburiy_kanal_havola: $('#s-majburiy-havola').value.trim(),
      xarid_kanal:           $('#s-xarid-kanal').value.trim(),
      jonatuvchi_manzil:     $('#s-jonatuvchi').value.trim(),
      chek_saqlansin:        $('#s-chek-saqla').checked,
      tarif_filial_1kg:      Math.max(0, Number($('#s-t-filial').value) || 0),
      tarif_uy_1kg:          Math.max(0, Number($('#s-t-uy').value) || 0),
      tarif_qoshimcha_kg:    Math.max(0, Number($('#s-t-kg').value) || 0),
      qadoq_ogirlik:         Math.max(0, Number($('#s-qadoq').value) || 0),
      standart_ogirlik:      Math.max(0, Number($('#s-standart-og').value) || 0),
      yetkazish_api_url:     $('#s-api-url').value.trim(),
      yetkazish_api_kalit:   $('#s-api-kalit').value.trim(),
      jonatuvchi_viloyat:    $('#s-jon-viloyat').value,
      yetkazish_provayder:   $('#s-provayder').value,
      yetkazish_ustama_foiz: Math.max(0, Math.min(100, Number($('#s-ustama').value) || 0)),
      yetkazish_qqs_foiz:    Math.max(0, Math.min(100, Number($('#s-qqs').value) || 0)),
    }})});
    holatEl.innerHTML = `<div class="xabar-quti ok" style="margin:0 0 10px">✓ Saqlandi</div>`;
    tost('Sozlamalar saqlandi');
  } catch (e) { holatEl.innerHTML = `<div class="xabar-quti xato" style="margin:0 0 10px">${esc(e.message)}</div>`; }
}

/** Karusel rasmlari — ro'yxat, qo'shish va o'chirish. */
async function karuselniChiz() {
  const quti = $('#karusel-royxat');
  if (!quti) return;
  try {
    const j = await api('/api/admin/karusel');
    quti.innerHTML = j.rasmlar.length
      ? j.rasmlar.map((id) => `
          <div class="karusel-katak">
            <img src="/media/${esc(id)}" alt="">
            <button class="karusel-och" data-karusel-och="${esc(id)}"
              aria-label="O‘chirish">✕</button>
          </div>`).join('')
      : '<span class="mayda">Rasm yo‘q — ilovada oddiy chaqiriq kartasi ko‘rinadi</span>';
    $$('[data-karusel-och]').forEach((b) => b.onclick = () => karuselOchir(b.dataset.karuselOch));
  } catch { quti.innerHTML = '<span class="mayda">Ro‘yxat olinmadi</span>'; }
}

async function karuselYukla(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  const t = $('#t-karusel');
  t.disabled = true; t.textContent = 'Yuklanmoqda…';
  try {
    // Karusel keng va katta ko'rinadi — 1600 px yetarli
    const rasm = await rasmniTayyorla(f, 1600, 0.85);
    await api('/api/admin/karusel', { method: 'POST', body: JSON.stringify({ image: rasm }) });
    tost('Rasm qo‘shildi');
    await karuselniChiz();
  } catch (err) { tost(err.message || 'Yuklab bo‘lmadi'); }
  finally { t.disabled = false; t.textContent = '🖼 Rasm qo‘shish'; e.target.value = ''; }
}

async function karuselOchir(id) {
  try {
    await api(`/api/admin/karusel?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await karuselniChiz();
  } catch (e) { tost(e.message); }
}

/** Skaner namunasi — logotip bilan bir xil oqim. */
async function namunaniYukla(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  const t = $('#t-namuna');
  t.disabled = true; t.textContent = 'Yuklanmoqda…';
  try {
    // Namuna ilovada ko'rsatiladi — 1024 px yetarli, bazani shishirmaymiz
    const rasm = await rasmniTayyorla(f, 1024, 0.85);
    await api('/api/admin/skaner-namuna', { method: 'POST', body: JSON.stringify({ image: rasm }) });
    tost('Namuna saqlandi'); sozlamalar();
  } catch (err) {
    tost(err.message || 'Yuklab bo‘lmadi');
  } finally {
    t.disabled = false; t.textContent = '📷 Namuna yuklash';
  }
}

async function logoniYukla(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) return tost('Rasm 2 MB dan katta');
  const t = $('#t-logo');
  t.disabled = true; t.textContent = 'Yuklanmoqda…';
  try {
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
    });
    await api('/api/admin/logo', { method: 'POST', body: JSON.stringify({ image: base64 }) });
    tost('Logotip saqlandi'); sozlamalar();
  } catch (err) {
    tost(err.message || 'Yuklab bo‘lmadi');
  } finally {
    t.disabled = false; t.textContent = '📷 Logotip yuklash';
  }
}

/** Majburiy kanal to'g'ri sozlanganmi — bot admin bo'lganmi, havola bormi. */
async function obunaniSina() {
  const t = $('#t-obuna-sina');
  t.disabled = true; t.textContent = 'Tekshirilmoqda…';
  try {
    await sozlamalarniSaqla();
    const j = await api('/api/admin/obuna-sinov', { method: 'POST' });
    const belgi = j.holat === 'ok' ? '✅' : j.holat === 'yoq' ? '➖' : '❌';
    modal(`${belgi} Majburiy obuna`, `
      <div class="qator-satr"><span class="k">Kanal</span>
        <span class="v">${esc(j.nom || j.kanal || '—')}</span></div>
      <div class="qator-satr"><span class="k">Bot admin</span>
        <span class="v">${j.bot_admin ? '✅ ha' : '❌ yo‘q'}</span></div>
      <div class="qator-satr"><span class="k">Havola</span>
        <span class="v">${j.havola ? '✅ bor' : '❌ yo‘q'}</span></div>
      ${j.havola ? `<p class="mayda" style="margin:12px 0 0;word-break:break-all">
        <b>${esc(j.havola)}</b><br><span class="ozgina">${esc(j.manba)}</span></p>` : ''}
      <div class="xabar-quti ${j.holat === 'ok' ? 'ok' : 'xato'}" style="margin:14px 0 0">
        ${esc(j.xabar)}</div>
      ${j.holat !== 'ok' ? `<ol class="mayda" style="padding-left:18px;line-height:1.9;margin:12px 0 0">
        <li>Kanalni oching → <b>Administratorlar</b> → botni qo‘shing</li>
        <li>Botga <b>«Taklif havolalarini boshqarish»</b> huquqini bering</li>
        <li>Shu tugmani qayta bosing</li>
      </ol>` : ''}`);
  } catch (e) {
    tost(e.message || 'Tekshirib bo‘lmadi');
  } finally {
    t.disabled = false; t.textContent = '🔍 Kanalni tekshirish';
  }
}

/** Tarif to'g'ri hisoblanayaptimi — bir necha shahar uchun ko'rsatamiz. */
async function tarifniSina() {
  const t = $('#t-tarif-sina');
  t.disabled = true; t.textContent = 'Hisoblanmoqda…';
  try {
    await sozlamalarniSaqla();
    const j = await api('/api/admin/tarif-sinov', { method: 'POST' });
    modal('🧮 Yetkazish narxi', `
      <p class="mayda" style="margin:0 0 12px">
        Jo‘natuvchi: <b>${esc(j.jonatuvchi)}</b> · 1 kg jo‘natma uchun</p>
      <div style="overflow-x:auto">
      <table class="jadval">
        <tr><th>Qayerga</th><th>Zona</th><th>Filialdan</th><th>Uygacha</th></tr>
        ${j.qatorlar.map((r) => `<tr>
          <td>${esc(r.viloyat)}<br><span class="mayda">${esc(r.tuman)} · ${esc(r.masofa)}</span></td>
          <td>${r.zona}</td>
          <td><b>${som(r.filial)}</b></td>
          <td><b>${som(r.uy)}</b></td></tr>`).join('')}
      </table></div>
      <p class="mayda" style="margin:12px 0 0">
        Og‘irlik oshsa narx ham oshadi. Manzil viloyat markazida bo‘lmasa
        «40 km dan uzoq» tarifi qo‘llanadi — yaqin tumanlarni belgilamoqchi
        bo‘lsangiz menejerga ayting.</p>`, { keng: true });
  } catch (e) {
    tost(e.message || 'Hisoblab bo‘lmadi');
  } finally {
    t.disabled = false; t.textContent = '🧮 Narxni sinab ko‘rish';
  }
}

/** Kanal ID to'g'rimi va bot unga yoza oladimi — darhol tekshiramiz. */
async function kanallarniSina() {
  const t = $('#t-kanal-sina');
  t.disabled = true; t.textContent = 'Sinovdan o‘tkazilmoqda…';
  try {
    // Avval saqlaymiz — aks holda eski qiymat sinaladi
    await sozlamalarniSaqla();
    const j = await api('/api/admin/kanal-sinov', { method: 'POST' });
    const belgi = (h) => (h === 'ok' ? '✅' : h === 'yoq' ? '➖' : '❌');
    modal('📨 Kanal sinovi', `
      <div class="qator-satr"><span class="k">🛒 Buyurtmalar</span>
        <span class="v">${belgi(j.buyurtma.holat)} ${esc(j.buyurtma.xabar)}</span></div>
      <div class="qator-satr"><span class="k">🔬 Tahlillar</span>
        <span class="v">${belgi(j.tahlil.holat)} ${esc(j.tahlil.xabar)}</span></div>
      <p class="mayda" style="margin-top:12px">✅ bo‘lsa kanalga sinov xabari yuborildi —
        kanalni ochib tekshiring. ❌ bo‘lsa botni kanalga admin qilib qo‘shing.</p>`);
  } catch (e) {
    tost(e.message || 'Sinov bajarilmadi');
  } finally {
    t.disabled = false; t.textContent = '📨 Kanallarni sinash';
  }
}

async function adminlarniChiz() {
  const el = $('#adminlar'); if (!el) return;
  try {
    const j = await api('/api/admin/adminlar');
    el.innerHTML = `
      <p class="mayda" style="margin:0 0 10px">Bu hisoblar Telegram orqali admin panelga kira oladi.</p>
      ${j.adminlar.map((a) => `
        <div class="qator-satr">
          <span class="k">${esc(a.full_name || 'Ismsiz')}
            <span class="ozgina">${a.username ? '@' + esc(a.username) : ''} · ${esc(a.telegram_id)}</span></span>
          <span class="v">${j.env_idlar.includes(String(a.telegram_id))
            ? '<span class="yor kul">ENV</span>'
            : `<button class="tug kichik xavf" data-adm="${esc(a.telegram_id)}">Olib tashlash</button>`}</span>
        </div>`).join('') || '<p class="mayda">Admin yo‘q</p>'}
      <label style="margin-top:14px">Yangi admin qo‘shish
        <span class="yordam">Telegram ID. Avval botga /start yozgan bo‘lishi kerak.</span></label>
      <div style="display:flex;gap:8px">
        <input id="a-id" inputmode="numeric" placeholder="123456789" style="flex:1">
        <button class="tug" id="a-qosh">Qo‘shish</button>
      </div>`;
    $('#a-qosh').onclick = async () => {
      const id = $('#a-id').value.trim();
      if (!id) return;
      try {
        await api('/api/admin/admin-toggle', { method: 'POST',
          body: JSON.stringify({ telegram_id: id, qoshish: true }) });
        tost('Admin qo‘shildi'); adminlarniChiz();
      } catch (e) { tost(e.message, 'xato'); }
    };
    $$('[data-adm]', el).forEach((b) => b.onclick = () =>
      tasdiqla('Adminlikdan olib tashlash?', 'Bu hisob admin panelga kira olmaydi.', async () => {
        await api('/api/admin/admin-toggle', { method: 'POST',
          body: JSON.stringify({ telegram_id: b.dataset.adm, qoshish: false }) });
        tost('Olib tashlandi'); adminlarniChiz();
      }, { xavf: true }));
  } catch (e) { el.innerHTML = `<div class="xato">${esc(e.message)}</div>`; }
}

// ═══════════ 9. XABAR SHABLONLARI ═══════════
const SHKALA = (foiz, n = 10) => {
  const v = Math.min(100, Math.max(0, Math.round(Number(foiz) || 0)));
  const t = Math.round(v / 100 * n);
  return '■'.repeat(t) + '□'.repeat(n - t);
};
const NAMUNA = {
  dokon:'KiOVO', ism:'Malika', yosh:'24–28', teri_turi:'aralash',
  teri_rangi:'och bug‘doyrang, iliq ton', ball:62, baho:'o‘rtacha 😌', shkala:SHKALA(62),
  nuqta:'🔴', nom:'Kengaygan teshiklar', foiz:72, zona:'Burun qanotlari va peshona (T-zona)',
  izoh:'Teshiklar aniq ko‘rinadi', sabab:'Yog‘ bezlari faol ishlaydi, teshiklar tiqiladi',
  yechim:'Kechqurun BHA bilan tozalang, kunduzi niatsinamid ishlating',
  ogohlantirish:'Qora nuqtalarni siqmang — iz qoladi',
  muammo:'Kengaygan teshiklar', ehtimol:68, muddat:'6–12 oy',
  natija:'Teshiklar kengayib, qora nuqtalar ko‘payishi mumkin',
  tavsiya_soni:4, raqam:'QQ-260828-0001', emoji:'🤖',
  telefon:'+998 90 111 22 33', ish_vaqti:'Har kuni 9:00 – 21:00',
  ombor:'Chilonzor filiali', manzil:'Bunyodkor ko‘chasi 12', mo_ljal:'📌 Metro yonida',
};

const toldir = (m, q) => String(m || '').replace(/\{(\w+)\}/g, (_, n) => (q[n] === undefined ? '' : String(q[n])));

function tgKorinish(matn, kalit) {
  const q = { ...NAMUNA };
  if (kalit === 'blok_muammo')  q.shkala = SHKALA(q.foiz);
  if (kalit === 'blok_prognoz') q.shkala = SHKALA(q.ehtimol);
  return esc(toldir(matn, q))
    .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gs, '<b>$1</b>')
    .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gs, '<i>$1</i>')
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gs, '<u>$1</u>')
    .replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/gs, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

async function xabarlar() {
  try {
    const j = await api('/api/admin/templates');
    holat.kesh.shablon = { ...j.joriy };
    holat.kesh.standart = j.standart;
    holat.kesh.tavsif = j.tavsif;

    $('#tan').innerHTML = `
      <div class="bosh"><h1>Bot xabarlari</h1>
        <button class="tug asos" id="x-saqla">Saqlash</button></div>
      <div class="xabar-quti ogoh" style="background:var(--kok-och);color:var(--kok)">
        ✍️ Bu matnlar botda mijozga ko‘rinadi. O‘zgartirsangiz darhol kuchga kiradi.
        <b>{qavs}</b> ichidagilar avtomatik to‘ldiriladi.</div>
      <div id="x-holat"></div>
      ${j.guruhlar.map((g) => `
        <div class="karta">
          <div class="karta-bosh"><h2>${esc(g.nom)}</h2></div>
          <p class="mayda" style="margin:-6px 0 12px">${esc(g.izoh)}</p>
          ${g.kalitlar.map(shablonMaydoni).join('')}
        </div>`).join('')}`;

    $$('[data-shablon]').forEach((ta) => ta.oninput = () => {
      holat.kesh.shablon[ta.dataset.shablon] = ta.value;
      korinishniYangila(ta.dataset.shablon);
    });
    $$('[data-tiklash]').forEach((b) => b.onclick = () => {
      const k = b.dataset.tiklash;
      holat.kesh.shablon[k] = holat.kesh.standart[k];
      $(`[data-shablon="${k}"]`).value = holat.kesh.standart[k];
      korinishniYangila(k); tost('Standartga qaytarildi');
    });
    j.guruhlar.forEach((g) => g.kalitlar.forEach(korinishniYangila));
    $('#x-saqla').onclick = xabarlarniSaqla;
  } catch (e) { xatoChiz(e); }
}

function shablonMaydoni(kalit) {
  const t = holat.kesh.tavsif[kalit] || { nom: kalit, izoh: '', orin: [] };
  const qiymat = holat.kesh.shablon[kalit] ?? holat.kesh.standart[kalit] ?? '';
  const ozgargan = qiymat !== (holat.kesh.standart[kalit] ?? '');
  return `
    <div style="padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid var(--chiziq)">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <b style="font-size:14.5px">${esc(t.nom)}</b>
        ${ozgargan ? '<span class="yor sariq">o‘zgartirilgan</span>' : ''}
        <button class="tug kichik" data-tiklash="${esc(kalit)}" style="margin-left:auto">↺</button>
      </div>
      ${t.izoh ? `<p class="ozgina" style="margin:4px 0 0">${esc(t.izoh)}</p>` : ''}
      <textarea data-shablon="${esc(kalit)}" rows="${Math.min(12, qiymat.split('\n').length + 1)}"
        style="margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:13px">${esc(qiymat)}</textarea>
      ${t.orin.length ? `<p class="ozgina" style="margin:6px 0 0">
        ${t.orin.map((o) => `<code>{${esc(o)}}</code>`).join(' ')}</p>` : ''}
      <div class="ozgina" style="margin-top:9px">Botda shunday ko‘rinadi:</div>
      <div class="tg-korinish" id="kor-${esc(kalit)}"></div>
    </div>`;
}

function korinishniYangila(kalit) {
  const el = document.getElementById(`kor-${kalit}`);
  if (el) el.innerHTML = tgKorinish(holat.kesh.shablon[kalit] ?? '', kalit);
}

async function xabarlarniSaqla() {
  const h = $('#x-holat');
  const bosh = Object.entries(holat.kesh.shablon).filter(([, v]) => !String(v || '').trim());
  try {
    const j = await api('/api/admin/templates', { method: 'POST',
      body: JSON.stringify({ templates: holat.kesh.shablon }) });
    h.innerHTML = `<div class="xabar-quti ok">✓ ${j.yozildi} ta xabar saqlandi
      ${bosh.length ? ` · ${bosh.length} tasi bo‘sh (yuborilmaydi)` : ''}</div>`;
    tost('Saqlandi');
  } catch (e) { h.innerHTML = `<div class="xabar-quti xato">${esc(e.message)}</div>`; }
}

// ═══════════ 10. TIZIM HOLATI ═══════════
async function tizim() {
  $('#tan').innerHTML = `
    <div class="bosh"><h1>Tizim holati</h1>
      <button class="tug asos" id="t-tekshir">Tekshirish</button></div>
    <div id="tizim-tan"><div class="bosh-holat"><span class="aylana"></span>
      <p style="margin-top:12px">Tekshirilmoqda…</p></div></div>`;
  $('#t-tekshir').onclick = tizim;
  try {
    const j = await api('/api/admin/health');
    const xatolar = j.tekshiruvlar.filter((t) => t.holat === 'xato');
    $('#tizim-tan').innerHTML = `
      <div class="xabar-quti ${xatolar.length ? 'xato' : 'ok'}">
        ${xatolar.length ? `⚠️ ${xatolar.length} ta muammo topildi` : '✅ Hammasi joyida'}</div>
      ${j.tekshiruvlar.map((t) => `
        <div class="qator-karta">
          <div class="qator-bosh">
            <div><div class="nom">${esc(t.nom)}</div><div class="ozgina">${esc(t.izoh)}</div></div>
            <span class="yor ${t.holat === 'ok' ? 'yashil' : 'qizil'}">
              ${t.holat === 'ok' ? '✓' : '✕'} ${t.ms} ms</span>
          </div>
          <p style="margin:9px 0 0;font-size:14px;word-break:break-word;
             color:var(--${t.holat === 'ok' ? 'kul' : 'qizil'})">${esc(t.xabar)}</p>
        </div>`).join('')}
      <div class="karta">
        <h3>Nima qilish kerak</h3>
        <ul style="padding-left:18px;line-height:1.85;margin:8px 0 0" class="mayda">
          <li><b>Baza</b> qizil — <code>DATABASE_URL</code> ni tekshiring.</li>
          <li><b>Telegram bot</b> qizil — <code>BOT_TOKEN</code> noto‘g‘ri.</li>
          <li><b>Webhook</b> qizil — xato matni Telegram tomonidan yozilgan.</li>
          <li><b>AI javob berishi</b> qizil — kalit, model nomi yoki kvota muammosi.
            <code>OPENROUTER_API_KEY</code> qo‘ysangiz Gemini OpenRouter orqali chaqiriladi.</li>
          <li><b>Mini App manzili</b> qizil — <code>PUBLIC_URL</code> yo‘q, tugmalar chiqmaydi.</li>
        </ul>
      </div>`;
  } catch (e) {
    $('#tizim-tan').innerHTML = `<div class="xabar-quti xato">${esc(e.message)}</div>`;
  }
}

// ═══════════ 11. QO'LLANMA ═══════════
function qollanma() {
  $('#tan').innerHTML = `
    <div class="bosh"><h1>Qo‘llanma</h1></div>

    <div class="karta">
      <h2>🚀 Birinchi kun</h2>
      <ol style="padding-left:18px;line-height:1.9;margin:10px 0 0" class="mayda">
        <li><b>Sozlamalar</b> → do‘kon nomi, karta raqami, menejer telefoni, chegirma pog‘onalari.</li>
        <li><b>Telegram kanallar</b> → ikkita yopiq kanal oching, botni ikkalasiga ham
          <b>admin</b> qilib qo‘shing, ID larini kiriting va «Kanallarni sinash» ni bosing.</li>
        <li><b>Omborlar</b> → filiallaringizni qo‘shing (viloyat va tuman bilan).</li>
        <li><b>Mahsulotlar</b> → har birining <b>narx, tannarx va ombor</b> sonini kiriting.
          Tannarxsiz foyda hisoblanmaydi. <b>Og‘irlik (gramm)</b> ni ham yozing —
          yetkazish narxi shunga qarab hisoblanadi.</li>
      </ol>
    </div>

    <div class="karta">
      <h2>📢 Kanallar nima qiladi</h2>
      <p class="mayda" style="margin:8px 0 0;line-height:1.8">
        <b>Buyurtmalar kanali</b> — mijoz buyurtma bergani, to‘lov chekini yuborgani
        (chek rasmi va ostida ism, manzil, summa) va holat o‘zgargani shu yerga tushadi.
        Xodimlaringiz admin panelni ochmasdan ham hammasini ko‘rib turadi.<br><br>
        <b>Tahlillar kanali</b> — har bir yuz tahlili natijasi rasm bilan.
        Bu kanalga <b>mijozlarning suratlari</b> tushadi: kanal yopiq bo‘lsin,
        faqat xodimlaringiz kirsin. Shuning uchun u sukut bo‘yicha o‘chiq —
        yoqishdan oldin kanal sozlamalarini tekshiring.
      </p>
    </div>

    <div class="karta">
      <h2>🧾 Xarid qanday ishlaydi</h2>
      <ol style="padding-left:18px;line-height:1.9;margin:10px 0 0" class="mayda">
        <li>Mijoz to‘laydi va chek yuboradi → siz <b>✅ To‘lov tasdiqlandi</b> ni bosasiz.</li>
        <li>Botda <code>/orders</code> yozasiz. Bot barcha to‘langan buyurtmalarni
          <b>mahsulot bo‘yicha jamlab</b> beradi: «Cleansing Oil — 5 dona».</li>
        <li>Mahsulot nomini bosasiz — Coupang yoki Daiso sahifasi ochiladi.
          <i>(Havolani mahsulot kartochkasida yozib qo‘yasiz.)</i></li>
        <li>Hammasini sotib olgach <b>«Qabul qilindi»</b> ni bosasiz.
          Shu buyurtmalar bitta <b>partiya</b> ga birlashadi, keyingilari
          yangi ro‘yxatga yig‘ila boshlaydi.</li>
        <li><code>/partiya</code> → partiyani tanlab, holatini birdaniga
          suradingiz. Mijozlarga xabar o‘zi ketadi.</li>
        <li>O‘zbekistonga yetgach ikkita hujjat olasiz:
          <b>📄 Pochta hujjati</b> (jadval + qirqiladigan yorliqlar) va
          <b>📘 Parvarish qo‘llanmasi</b> (har mijozga o‘zi olgan mahsulotlarni
          qanday ishlatish). Print qilib, yorliqni qutiga yopishtirasiz,
          qo‘llanmani ichiga solasiz.</li>
      </ol>
    </div>

    <div class="karta">
      <h2>🤖 Kanal agenti</h2>
      <p class="mayda" style="margin:8px 0 0;line-height:1.8">
        Botda <code>/reja</code> yozing va topshiriq bering — masalan
        «har kuni teri parvarishi haqida foydali post joyla».
        Agent 30 kunlik mavzular rejasini tuzadi va har kuni belgilangan
        soatda post (matn + rasm) tayyorlab <b>sizga</b> yuboradi.<br><br>
        <b>Siz tasdiqlamaguncha kanalga hech narsa chiqmaydi.</b>
        Tugmalar: kanalga joylash · o‘zim yozaman · AI ga aytaman
        («qisqartir», «yoshlarga mos qil») · boshqa variant · o‘tkazib yuborish.
      </p>
    </div>

    <div class="karta">
      <h2>📢 Reklama yuborish</h2>
      <p class="mayda" style="margin:8px 0 0;line-height:1.8">
        Botda <code>/reklama</code> → xabar matnini yozing (yoki rasmni izoh
        bilan yuboring) → oldindan ko‘rasiz → «Hammaga yuborish».
        Yuborish fonda ketadi, tugagach hisobot keladi.
        Botni bloklaganlar avtomatik belgilanadi.
      </p>
    </div>

    <div class="karta">
      <h2>📊 Hisobotlar</h2>
      <p class="mayda" style="margin:8px 0 0;line-height:1.8">
        <b>Sotuvlar</b> bo‘limida oylik jadval bor: har oy uchun tushum,
        tannarx va <b>sof foyda</b>. Oy ustiga bossangiz quyidagi mahsulotlar
        ro‘yxati faqat o‘sha oy uchun chiqadi.<br><br>
        <b>Sof foyda</b> = mahsulot daromadi − chegirma − tannarx.
        Yetkazish alohida ko‘rsatiladi: u pochtaga o‘tadi, sizning
        daromadingiz emas.<br><br>
        Sinovdan haqiqiy ishga o‘tayotganda <b>🗑 Tarixni tozalash</b> bilan
        buyurtmalar tarixini nolga qaytarasiz — mahsulot va mijozlar qoladi.
      </p>
    </div>

    <div class="karta">
      <h2>📦 Har kuni</h2>
      <ol style="padding-left:18px;line-height:1.9;margin:10px 0 0" class="mayda">
        <li>Yangi buyurtma kelsa pastdagi <b>📦</b> belgisida son chiqadi.</li>
        <li>Buyurtmani oching → chekni tekshiring → <b>✅ To‘lov tasdiqlandi</b>.</li>
        <li>Holatni ketma-ket suring: <b>To‘lov tasdiqlandi → Koreyada qadoqlanmoqda →
          Koreyadan jo‘natildi → Yo‘lda → O‘zbekiston omborida →
          Pochtadan jo‘natildi → Yetib keldi</b>.
          Har o‘zgarishda mijozga xabar boradi.</li>
        <li><b>Omborda</b> bosilganda mijozga eng yaqin filial manzili avtomatik yuboriladi.</li>
      </ol>
    </div>

    <div class="karta">
      <h2>🛍 Mahsulot qo‘shish</h2>
      <p class="mayda"><b>📷 Skrinshotdan</b> — qadoq rasmini yuklaysiz, AI nomi, tarkibi va
        qanday foydalanishni to‘ldiradi. Siz narx va omborni qo‘yasiz.</p>
      <p class="mayda"><b>Parvarish bosqichi</b> ni to‘g‘ri tanlang — AI tavsiyani shu bo‘yicha
        tartibga soladi. <b>Muammolar</b> esa qidiruvda ishlaydi.</p>
    </div>

    <div class="karta">
      <h2>✍️ Bot matnlari</h2>
      <p class="mayda"><b>Xabarlar</b> bo‘limida botning har bir jumlasini o‘zingiz yozasiz.
        Har maydon ostida jonli ko‘rinish bor. <b>{qavs}</b> ichidagilarga tegmang —
        ular avtomatik to‘ldiriladi. Xato qilsangiz <b>↺</b> tugmasi bor.</p>
    </div>

    <div class="karta">
      <h2>📊 Raqamlar</h2>
      <ul style="padding-left:18px;line-height:1.9;margin:8px 0 0" class="mayda">
        <li><b>Yalpi foyda</b> = daromad − tannarx (kuryer va reklama kirmaydi).</li>
        <li><b>Marja</b> 35% dan past bo‘lsa — narx past yoki tannarx yuqori.</li>
        <li><b>Voronka</b> qayerda odam yo‘qotayotganingizni ko‘rsatadi.</li>
        <li><b>Prognoz</b> — tarixiy tugallanish ulushiga asoslangan taxmin, kafolat emas.</li>
      </ul>
    </div>

    <div class="karta">
      <h2>🩺 Nimadir ishlamasa</h2>
      <p class="mayda"><b>Tizim holati</b> ni oching va <b>Tekshirish</b> ni bosing.
        U bazani, botni, webhookni va AI ni haqiqatan chaqirib ko‘radi va
        qaysi biri ishlamayotganini aniq xato matni bilan ko‘rsatadi.</p>
    </div>

    <div class="karta">
      <h2>🔑 Kirish</h2>
      <p class="mayda">Admin panelga <b>Telegram orqali</b> kirasiz — parol kerak emas.
        Yangi admin qo‘shish: <b>Sozlamalar → Adminlar</b> bo‘limiga uning Telegram ID sini kiriting
        (u avval botga <code>/start</code> yozgan bo‘lishi kerak).</p>
      <p class="mayda">Parol bilan kirish ham qoldirilgan — Railway’dagi
        <code>ADMIN_LOGIN</code> va <code>ADMIN_PASSWORD</code>.</p>
    </div>`;
}

boshla();
})();
