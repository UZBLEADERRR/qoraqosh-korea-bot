/* Meduza Cosmetics admin — mobil uchun mo'ljallangan boshqaruv paneli. */
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

const KOP_MENYU = ['sotuv', 'ombor', 'sozlama', 'xabar', 'tizim', 'qollanma'];
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
const HOLATLAR = {
  yangi:        ['🆕 Yangi',        'kok'],
  tasdiqlangan: ['✅ Tasdiqlangan', 'urgu'],
  omborda:      ['🏬 Omborda',      'sariq'],
  yolda:        ['🚚 Yo‘lda',       'sariq'],
  yetkazildi:   ['📦 Yetkazildi',   'yashil'],
  bekor:        ['❌ Bekor',        'qizil'],
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
                     namlash:'🫙 Namlash', himoya:'☀️ Quyoshdan himoya', qoshimcha:'🎭 Qo‘shimcha' };
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
      <div style="padding:0 16px 12px;display:flex;gap:8px">
        <button class="tug asos" id="t-skrin" style="flex:1">📷 Skrinshotdan</button>
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
      <div><label>Emoji</label><input id="m-emoji" value="${esc(p?.emoji || '🧴')}" maxlength="4"></div>
    </div>
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
    <button class="tug asos keng" id="m-saqla" style="margin-top:18px">Saqlash</button>`, { keng: true });

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
async function mijozlar(qidiruv = '') {
  try {
    const j = await api('/api/admin/users' + (qidiruv ? `?q=${encodeURIComponent(qidiruv)}` : ''));
    $('#tan').innerHTML = `
      <div class="bosh"><h1>Mijozlar</h1><span class="ozgina">${j.users.length} ta</span></div>
      <div style="padding:0 16px 12px">
        <input id="u-qidiruv" placeholder="🔍 Ism, telefon yoki username" value="${esc(qidiruv)}"></div>
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
            <div class="qator-satr"><span class="k">🎂 Yosh</span><span class="v">${u.age || '—'}</span></div>
            <div class="qator-satr"><span class="k">📍 Hudud</span>
              <span class="v">${esc([u.viloyat, u.tuman].filter(Boolean).join(', ') || '—')}</span></div>
            <div class="qator-satr"><span class="k">📅 Ro‘yxat</span>
              <span class="v">${u.agreed_at ? sana(u.agreed_at) : '—'}</span></div>
          </div>
          <div class="amallar">
            <button class="tug kichik ${u.is_blocked ? '' : 'xavf'}" data-blok="${u.id}"
              data-holat="${u.is_blocked ? 1 : 0}">${u.is_blocked ? '✓ Blokdan chiqarish' : '🚫 Bloklash'}</button>
          </div>
        </div>`).join('') : boshHolat('🔍', 'Topilmadi')}`;

    let t; $('#u-qidiruv').oninput = (e) => {
      clearTimeout(t); const v = e.target.value;
      t = setTimeout(() => { mijozlar(v); setTimeout(() => $('#u-qidiruv')?.focus(), 0); }, 350);
    };
    $$('[data-blok]').forEach((b) => b.onclick = async () => {
      await api('/api/admin/user-block', { method: 'POST',
        body: JSON.stringify({ id: Number(b.dataset.blok), blocked: b.dataset.holat === '0' }) });
      tost('Saqlandi'); mijozlar(qidiruv);
    });
  } catch (e) { xatoChiz(e); }
}

// ═══════════ 6. SOTUVLAR ═══════════
async function sotuvlar() {
  try {
    const j = await api('/api/admin/sales');
    $('#tan').innerHTML = `
      <div class="bosh"><h1>Sotuvlar</h1></div>
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
        </div>`).join('') : boshHolat('💰', 'Hozircha sotuv yo‘q')}`;
  } catch (e) { xatoChiz(e); }
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
    const { settings: st } = await api('/api/admin/settings');
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
        <div class="karta-bosh"><h2>🚚 Yetkazib berish</h2></div>
        <div class="forma-tor">
          <div><label>Narxi (so‘m)</label>
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
        <div class="karta-bosh"><h2>🏷 Brend</h2></div>
        <label>Do‘kon nomi <span class="yordam">bot, ilova va rasmlarda ko‘rinadi</span></label>
        <input id="s-brend" value="${esc(matn('dokon_nomi'))}" placeholder="Meduza Cosmetics">
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
    $('#s-saqla').onclick = sozlamalarniSaqla;
    $('#t-kanal-sina').onclick = kanallarniSina;
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
      konsultatsiya_user: $('#s-konsult').value.trim().replace(/^@/, ''),
      menejer_telefon:    $('#s-tel').value.trim(),
      menejer_ish_vaqti:  $('#s-vaqt').value.trim(),
      limit_yoqilgan:     $('#s-limit-yoq').checked,
      limit_bepul:        Math.max(0, Number($('#s-limit-bepul').value) || 0),
      limit_mijoz:        Math.max(0, Number($('#s-limit-mijoz').value) || 0),
      dokon_nomi:            $('#s-brend').value.trim() || 'Meduza Cosmetics',
      kanal_buyurtma:        $('#s-kanal-buyurtma').value.trim(),
      kanal_tahlil:          $('#s-kanal-tahlil').value.trim(),
      kanal_tahlil_yoqilgan: $('#s-kanal-tahlil-yoq').checked,
    }})});
    holatEl.innerHTML = `<div class="xabar-quti ok" style="margin:0 0 10px">✓ Saqlandi</div>`;
    tost('Sozlamalar saqlandi');
  } catch (e) { holatEl.innerHTML = `<div class="xabar-quti xato" style="margin:0 0 10px">${esc(e.message)}</div>`; }
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
  dokon:'Meduza Cosmetics', ism:'Malika', yosh:'24–28', teri_turi:'aralash',
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
          Tannarxsiz foyda hisoblanmaydi.</li>
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
      <h2>📦 Har kuni</h2>
      <ol style="padding-left:18px;line-height:1.9;margin:10px 0 0" class="mayda">
        <li>Yangi buyurtma kelsa pastdagi <b>📦</b> belgisida son chiqadi.</li>
        <li>Buyurtmani oching → chekni tekshiring → <b>✅ To‘lov tasdiqlandi</b>.</li>
        <li>Holatni ketma-ket suring: <b>Tasdiqlangan → Omborda → Yo‘lda → Yetkazildi</b>.
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
