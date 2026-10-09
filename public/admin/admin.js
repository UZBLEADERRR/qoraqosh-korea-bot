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

// ═══════════ IKONLAR ═══════════
// Bitta chiziqli to'plam (24×24, currentColor). Emoji o'rniga: emoji
// har telefonda boshqacha chiziladi va panel «o'yinchoq» ko'rinardi.
const IK = {
  uy: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  quti: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  teg: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  odamlar: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.8 2.5 3 5.2"/>',
  osish: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pastga: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  royxat: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 11h6M9 15h4"/>',
  ombor: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
  globus: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  papka: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  xat: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  sozlama: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  puls: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  kitob: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  chiqish: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  ai: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  qidir: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  yangila: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  menyu: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  yop: '<path d="M6 6l12 12M18 6 6 18"/>',
  orqaga: '<path d="M15 18l-6-6 6-6"/>',
  keyingi: '<path d="M9 18l6-6-6-6"/>',
  yubor: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  klip: '<path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5"/>',
  soat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  karta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  ogoh: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  skaner: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3"/>',
  savat: '<path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  barg: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19c3-3 6-5 9-7"/>',
  yulduz: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  pul: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  hujjat: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  plyus: '<path d="M12 5v14M5 12h14"/>',
  tasdiq: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  magnit: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  nusxa: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  ochir: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  havola: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
const ik = (nom, olcham = 18) => `<svg class="ik" viewBox="0 0 24 24" width="${olcham}" height="${olcham}" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[nom] || IK.info}</svg>`;
/** `<i data-ik="…">` — HTML dagi joy egallovchilarni SVG ga aylantiradi. */
function ikonlarniQoy(ildiz = document) {
  $$('i[data-ik]:not([data-chizildi])', ildiz).forEach((i) => {
    i.innerHTML = ik(i.dataset.ik, Number(i.dataset.olcham) || 18);
    i.dataset.chizildi = '1';
  });
}
ikonlarniQoy();

const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); } catch {}

const holat = { token: localStorage.getItem('qq_admin') || '', bolim: 'boshqaruv', kesh: {} };

/** Qisqa bildirishnoma. */
let tostTimer;
function tost(matn, tur = '') {
  $('.tost')?.remove();
  const el = document.createElement('div');
  el.className = `tost${tur === 'xato' ? ' xato' : ''}`; el.textContent = matn;
  // Xato matni uzun bo'ladi (sabab bilan) — o'qishga vaqt, bosilsa yopiladi
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  clearTimeout(tostTimer);
  tostTimer = setTimeout(() => el.remove(), tur === 'xato' ? Math.min(9000, 3000 + matn.length * 40) : 2600);
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
  xarid:     { nom: 'Xarid ro‘yxati', chiz: () => xarid() },
  mahsulot:  { nom: 'Mahsulotlar',  chiz: () => mahsulotlar() },
  market:    { nom: 'Marketplace',  chiz: () => marketplace() },
  havola:    { nom: 'Havolasizlar', chiz: () => havolasizlar() },
  bolim:     { nom: 'Bo‘limlar',    chiz: () => bolimlar() },
  mijoz:     { nom: 'Mijozlar',     chiz: () => mijozlar() },
  sotuv:     { nom: 'Sotuvlar',     chiz: () => sotuvlar() },
  manba:     { nom: 'Manbalar',     chiz: () => manbalarBolimi() },
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

// Bo'lim ikonlari — menyu, qidiruv va «Menyu» oynasi uchun bitta joy
const BOLIM_IK = { boshqaruv: 'uy', buyurtma: 'quti', xarid: 'royxat', mahsulot: 'teg', market: 'globus',
  havola: 'havola', bolim: 'papka', mijoz: 'odamlar', sotuv: 'osish', manba: 'magnit', ombor: 'ombor', sozlama: 'sozlama',
  xabar: 'xat', tizim: 'puls', qollanma: 'kitob' };
const KOP_MENYU = ['mijoz', 'sotuv', 'manba', 'xarid', 'ombor', 'market', 'bolim', 'havola', 'xabar', 'sozlama', 'tizim', 'qollanma'];
// Telefondagi «Menyu» — ikonli to'r, ro'yxat emas
const kopMenyu = () => modal('Menyu', `
  <button class="ai-banner" id="t-yordamchi"><span>${ik('ai', 22)}</span>
    <b>AI yordamchi<small>Hisobot, xabar, aksiya, katalog — so‘rang, bajaradi</small></b>${ik('keyingi')}</button>
  <div class="menyu-tor">
    ${KOP_MENYU.map((k) => `<button data-kop="${k}"><span>${ik(BOLIM_IK[k], 22)}</span>${esc(BOLIMLAR[k].nom)}</button>`).join('')}
  </div>
  <button class="tug xavf keng" id="t-chiq" style="margin-top:14px">${ik('chiqish')}Chiqish</button>`);
$('#t-kop').onclick = kopMenyu;
$('#t-kop2').onclick = kopMenyu;

// Kompyuterda menyu yig'iladi (faqat ikonlar) — tanlov eslab qolinadi
const yonKichik = (ha) => { document.body.classList.toggle('yon-yigiq', ha);
  try { localStorage.setItem('qq_yon', ha ? '1' : ''); } catch {} };
try { yonKichik(localStorage.getItem('qq_yon') === '1'); } catch {}
$('#t-yon-kichik').onclick = () => yonKichik(!document.body.classList.contains('yon-yigiq'));
// Yig'ilgan menyuda faqat ikon qoladi — nomi ustiga olib borganda chiqadi
$$('.yon-nav button, .yon .chiq, .ai-katta').forEach((b) => { b.title = b.textContent.replace('/', '').trim(); });

// AI tugmalari hamma joyda bitta
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-ai]')) { e.preventDefault(); yordamchiOch(); }
});
$('#t-qidir').onclick = () => qidirOyna();

// Klaviatura: Ctrl/⌘+K — qidiruv, «/» — AI (yozayotgan bo'lmasa)
document.addEventListener('keydown', (e) => {
  if ($('#panel').classList.contains('yashirin')) return;
  const yozmoqda = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qidirOyna(); }
  else if (e.key === '/' && !yozmoqda) { e.preventDefault(); yordamchiOch(); }
  else if (e.key === 'Escape' && !$('#modal').classList.contains('yashirin')) modalYop();
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-kop]');
  if (b) { modalYop(); bolimOch(b.dataset.kop); }
  if (e.target.closest('#t-yordamchi')) { modalYop(); yordamchiOch(); }
  if (e.target.closest('#t-chiq')) { modalYop(); chiqish(); }
});

// ═══════════ KERAKSIZ MAYDA YOZUVLAR ═══════════
// Har kartada tushuntiruvchi xatboshilar bor edi va panel «matn
// devori» bo'lib qolardi. Endi ular YASHIRIN: kartaning sarlavhasida
// kichik ⓘ chiqadi, bosilsa ochiladi. Matnlar o'chirilmagan — kerak
// bo'lganda bir bosishda. Har bo'lim innerHTML bilan chiziladi,
// shuning uchun bitta kuzatuvchi hammasini qamraydi.
function izohlarniYigish(ildiz) {
  $$('.karta', ildiz).forEach((k) => {
    if (k.dataset.izohli) return;
    const izohlar = $$(':scope > p.mayda, :scope > p.ozgina, :scope > div.mayda, :scope > div.ozgina, label .yordam, .izoh', k);
    if (!izohlar.length) return;
    k.dataset.izohli = '1';
    k.classList.add('izoh-yigiq');
    const bosh = $(':scope > .karta-bosh, :scope > .qator-bosh', k) || $(':scope > h2, :scope > h3', k);
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'izoh-tugma'; t.setAttribute('aria-label', 'Izoh');
    t.innerHTML = ik('info', 17);
    t.onclick = (e) => { e.stopPropagation(); k.classList.toggle('izoh-yigiq'); };
    if (bosh?.matches('.karta-bosh, .qator-bosh')) bosh.appendChild(t);
    else if (bosh) bosh.insertAdjacentElement('afterend', t), t.classList.add('suzuvchi');
    else k.prepend(t), t.classList.add('suzuvchi');
  });
}
new MutationObserver(() => izohlarniYigish($('#tan'))).observe($('#tan'), { childList: true, subtree: true });
// Sahifa boshidagi tushuntirish qutisi — bitta qator, bosilsa to'liq
document.addEventListener('click', (e) => e.target.closest('.izoh-quti')?.classList.toggle('ochiq'));

// ═══════════ QIDIRUV / BUYRUQ PANELI (Ctrl+K) ═══════════
// Bitta joydan: bo'limga o'tish, tez amallar, mahsulot va buyurtma
// qidirish — topilmasa savol AI ga ketadi.
const TEZ_AMAL = [
  { nom: 'Haftalik hisobot', ik: 'osish', ai: 'Bu haftaning hisobotini o‘tgan hafta bilan solishtirib tayyorla, grafik bilan.' },
  { nom: 'Nima tugayapti va qancha buyurtma qilay?', ik: 'quti', ai: 'Tugagan va tez orada tugaydigan mahsulotlarni ko‘rsat, har biridan qancha buyurtma qilishni ayt.' },
  { nom: 'Issiq lidlar: tahlil qilib sotib olmaganlar', ik: 'skaner', ai: 'Oxirgi 14 kunda tahlil qilib sotib olmaganlarni ko‘rsat va ularga xabar matnini tayyorla.' },
  { nom: 'Aksiya e’lon qilish', ik: 'teg', ai: 'Qaysi mahsulotlarga aksiya qilish foydali? Taklif qil va chegirma qo‘yishni tayyorla.' },
  { nom: 'Katalog auditi', ik: 'hujjat', ai: 'Katalog auditini qil: nimalar yetishmaydi va qaysilarini birinchi tuzatish kerak?' },
  { nom: 'Yangi mahsulot qo‘shish', ik: 'plyus', bolim: 'mahsulot' },
];
let qidirTimer = null;
let qidirKatalog = null;
function qidirOyna() {
  modal('Qidirish', `
    <div class="qidir-maydon">${ik('qidir')}<input id="q-matn" placeholder="Bo‘lim, mahsulot, buyurtma yoki AI ga savol…"
      autocomplete="off"></div>
    <div id="q-natija" class="qidir-natija"></div>`);
  const inp = $('#q-matn'), quti = $('#q-natija');
  let tanlov = 0;
  const chiz = (mahs = []) => {
    const m = inp.value.trim().toLowerCase();
    const bolim = Object.entries(BOLIMLAR).filter(([, b]) => !m || b.nom.toLowerCase().includes(m))
      .map(([k, b]) => ({ tur: 'bolim', k, nom: b.nom, ik: BOLIM_IK[k] || 'uy' }));
    const amal = TEZ_AMAL.filter((a) => !m || a.nom.toLowerCase().includes(m)).map((a) => ({ tur: 'amal', ...a }));
    const qator = [
      ...(m ? [{ tur: 'ai', nom: `AI dan so‘rash: «${inp.value.trim()}»`, ik: 'ai', ai: inp.value.trim() }] : []),
      ...mahs.map((p) => ({ tur: 'mahs', nom: p.name, izoh: `${p.brand || ''} · ${narx(p.price)} · ${p.stock ?? 0} dona`, ik: 'teg', p })),
      ...amal, ...bolim,
    ];
    tanlov = Math.min(tanlov, Math.max(0, qator.length - 1));
    quti.innerHTML = qator.map((x, i) => `<button class="${i === tanlov ? 'tanlangan' : ''}" data-q="${i}">
      <span class="qi">${ik(x.ik)}</span><span class="qn">${esc(x.nom)}${x.izoh ? `<small>${esc(x.izoh)}</small>` : ''}</span>
      <em>${x.tur === 'bolim' ? 'Bo‘lim' : x.tur === 'mahs' ? 'Mahsulot' : x.tur === 'ai' ? 'Enter' : 'Amal'}</em></button>`).join('')
      || '<p class="bosh-holat" style="padding:24px">Hech narsa topilmadi</p>';
    const bajar = (x) => {
      modalYop();
      if (x.tur === 'bolim') bolimOch(x.k);
      else if (x.tur === 'mahs') { bolimOch('mahsulot'); setTimeout(() => mahsulotOyna(x.p), 600); }
      else if (x.ai) aiSora(x.ai);
      else if (x.bolim) bolimOch(x.bolim);
    };
    $$('[data-q]', quti).forEach((b) => b.onclick = () => bajar(qator[Number(b.dataset.q)]));
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); tanlov = (tanlov + (e.key === 'ArrowDown' ? 1 : -1) + qator.length) % Math.max(1, qator.length); chiz(mahs);
      } else if (e.key === 'Enter' && qator[tanlov]) { e.preventDefault(); bajar(qator[tanlov]); }
    };
  };
  inp.oninput = () => {
    tanlov = 0; chiz();
    clearTimeout(qidirTimer);
    const m = inp.value.trim();
    if (m.length < 2) return;
    qidirTimer = setTimeout(async () => {
      try {
        // Katalog bir marta yuklanadi (1 daqiqa keshda) — har harfda emas
        if (!qidirKatalog || Date.now() - qidirKatalog.vaqt > 60_000) {
          const j = await api('/api/admin/products');
          qidirKatalog = { vaqt: Date.now(), r: j.mahsulotlar || [] };
        }
        const k = m.toLowerCase();
        const r = qidirKatalog.r.filter((p) =>
          `${p.name} ${p.nom_uz || ''} ${p.brand || ''}`.toLowerCase().includes(k)).slice(0, 6);
        if (inp.value.trim() === m) chiz(r);
      } catch { /* qidiruv bo'lmasa ham bo'limlar ishlaydi */ }
    }, 200);
  };
  chiz();
  setTimeout(() => inp.focus(), 50);
}

/** AI ga tayyor topshiriq: panel ochiladi va savol darrov yuboriladi. */
function aiSora(savol) {
  yordamchiOch();
  const m = $('#y-matn');
  if (m) { m.value = savol; yordamchiYubor(); }
}

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
// SaaS uslubi: tepada davr bo'yicha 4 ta asosiy raqam (o'tgan davrga
// nisbatan o'zgarish bilan), keyin «bugun nima qilish kerak» va grafik.
// Hamma narsa bitta qarashda — tushuntiruvchi matnsiz.
const DAVRLAR = [['bugun', 'Bugun'], ['hafta', '7 kun'], ['oy', '30 kun']];
const TAVSIYA_RANG = { xavf: 'qizil', ogoh: 'sariq', imkon: 'yashil', info: 'kok' };

const ozgarishBelgi = (f) => (f === null || f === undefined ? ''
  : `<span class="delta ${f > 0 ? 'osdi' : f < 0 ? 'tushdi' : ''}">${f > 0 ? '↑' : f < 0 ? '↓' : '→'} ${Math.abs(f)}%</span>`);

function kpiKarta(nom, qiymat, f, ikon) {
  return `<div class="kpi"><div class="kpi-bosh"><span>${esc(nom)}</span>${ik(ikon, 16)}</div>
    <div class="v">${qiymat}</div>${ozgarishBelgi(f)}</div>`;
}

function salom() {
  const s = new Date().getHours();
  return s < 5 ? 'Xayrli tun' : s < 12 ? 'Xayrli tong' : s < 18 ? 'Xayrli kun' : 'Xayrli kech';
}

async function boshqaruv() {
  holat.davr = holat.davr || 'hafta';
  try {
    const [d, h, t] = await Promise.all([
      api('/api/admin/dashboard'),
      api(`/api/admin/hisobot?davr=${holat.davr}`),
      api('/api/admin/tavsiyalar').catch(() => ({ tavsiyalar: [] })),
    ]);
    const p = d.prognoz;
    const maxKun = Math.max(1, ...d.kunlar.map((x) => x.daromad));
    const hz = h.hozir, oz = h.ozgarish_foiz;
    // Brauzerlar o'zbekcha hafta kunini bilmaydi («Thu» chiqardi)
    const kunNom = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'][new Date().getDay()];

    $('#tan').innerHTML = `
      <div class="sahifa-bosh">
        <div><h1 class="salom">${salom()}</h1><p class="sana">${bugun()}, ${esc(kunNom)}</p></div>
        <div class="davr" role="tablist">${DAVRLAR.map(([k, n]) =>
          `<button role="tab" data-davr="${k}" class="${holat.davr === k ? 'faol' : ''}">${n}</button>`).join('')}</div>
      </div>

      <div class="kpi-tor">
        ${kpiKarta('Daromad', narx(hz.daromad), oz.daromad, 'pul')}
        ${kpiKarta('Buyurtmalar', som(hz.buyurtma), oz.buyurtma, 'quti')}
        ${kpiKarta('O‘rtacha chek', narx(hz.ortacha_chek), oz.ortacha_chek, 'savat')}
        ${kpiKarta('Yangi mijozlar', som(hz.yangi_mijoz), oz.yangi_mijoz, 'odamlar')}
      </div>

      <div class="ustunlar">
        <section class="karta">
          <div class="karta-bosh"><h2>Bugun nima qilish kerak</h2>
            ${t.tavsiyalar.length ? `<span class="yor kul">${t.tavsiyalar.length}</span>` : ''}</div>
          ${t.tavsiyalar.length ? `<div class="tavsiyalar">${t.tavsiyalar.map((x, i) => `
            <div class="tavsiya">
              <span class="tavsiya-belgi ${TAVSIYA_RANG[x.daraja] || 'kul'}">${ik(x.ikon, 18)}</span>
              <div class="tavsiya-matn"><b>${esc(x.sarlavha)}</b><span>${esc(x.matn)}</span></div>
              <button class="tug kichik ${x.amal.tur === 'ai' ? 'ai-tug' : ''}" data-tavsiya="${i}"
                aria-label="${x.amal.tur === 'ai' ? 'Bajarish' : 'Ochish'}">
                ${x.amal.tur === 'ai' ? `${ik('ai', 15)}<span>Bajarish</span>` : `<span>Ochish</span>${ik('keyingi', 15)}`}</button>
            </div>`).join('')}</div>`
          : `<div class="hammasi-joyida">${ik('tasdiq', 22)}<b>Hammasi joyida</b><span>Shoshilinch ish yo‘q</span></div>`}
        </section>

        <section class="karta">
          <div class="karta-bosh"><h2>Daromad · 14 kun</h2><span class="yor kul">${narx(d.kpi.oy_daromadi)} bu oy</span></div>
          <div class="grafik">${d.kunlar.map((x) => `<div style="--h:${Math.max(2, Math.round(x.daromad / maxKun * 100))}%"
            data-tip="${esc(x.kun.slice(5))} · ${narx(x.daromad)}"></div>`).join('')}</div>
          <div class="grafik-x">${d.kunlar.map((x, i) => `<span>${i % 2 ? '' : x.kun.slice(8)}</span>`).join('')}</div>
          <div class="mini-stat">
            <div><span>Foyda</span><b>${narx(hz.foyda)}</b></div>
            <div><span>Tahlillar</span><b>${som(hz.tahlil)}</b></div>
            <div><span>Konversiya</span><b>${h.konversiya_foiz ?? '—'}${h.konversiya_foiz != null ? '%' : ''}</b></div>
            <div><span>Oy prognozi</span><b>${narx(p.oy_oxiri_prognoz)}</b></div>
          </div>
        </section>
      </div>

      <div class="ustunlar">
        <section class="karta">
          <div class="karta-bosh"><h2>Eng ko‘p sotilgan</h2><span class="yor kul">${esc(h.davr)}</span></div>
          ${h.eng_kop_daromad.length ? `<div class="top-royxat">${h.eng_kop_daromad.map((x, i) => `
            <div><i>${i + 1}</i><span>${esc(x.nom)}</span><em>${som(x.dona)} dona</em><b>${narx(x.summa)}</b></div>`).join('')}</div>`
          : '<p class="bosh-matn">Bu davrda sotuv yo‘q</p>'}
        </section>
        <section class="karta voronka">
          <div class="karta-bosh"><h2>Voronka · 30 kun</h2></div>
          ${voronkaQator('Botni ochgan', d.voronka.start, d.voronka.start)}
          ${voronkaQator('Ro‘yxatdan o‘tgan', d.voronka.register, d.voronka.start)}
          ${voronkaQator('Tahlil qilgan', d.voronka.scan, d.voronka.start)}
          ${voronkaQator('Savatga solgan', d.voronka.add_cart, d.voronka.start)}
          ${voronkaQator('Buyurtma bergan', d.voronka.order, d.voronka.start)}
        </section>
      </div>

      <section class="ai-chaqiriq">
        <div class="ai-chaqiriq-bosh">${ik('ai', 20)}<b>AI dan so‘rang</b></div>
        <div class="ai-chiplar">${TEZ_AMAL.filter((x) => x.ai).map((x, i) =>
          `<button data-tez="${i}">${ik(x.ik, 15)}${esc(x.nom)}</button>`).join('')}</div>
      </section>`;

    $$('[data-davr]').forEach((b) => b.onclick = () => { holat.davr = b.dataset.davr; boshqaruv(); });
    $$('[data-tavsiya]').forEach((b) => b.onclick = () => {
      const x = t.tavsiyalar[Number(b.dataset.tavsiya)];
      if (x.amal.tur === 'ai') aiSora(x.amal.savol); else bolimOch(x.amal.bolim);
    });
    const tezlar = TEZ_AMAL.filter((x) => x.ai);
    $$('[data-tez]').forEach((b) => b.onclick = () => aiSora(tezlar[Number(b.dataset.tez)].ai));
  } catch (e) { xatoChiz(e); }
}

// ═══════════ MANBALAR: Instagram, TikTok… ═══════════
// Qaysi reklama joyi odam olib kelyapti va ulardan nechtasi sotib
// oladi. Har joyga o'z qisqa havolasi: www.kiovo.shop/h/ig.
const MANBA_RANG = { instagram: '#d62976', tiktok: '#111111', telegram: '#229ed9', youtube: '#e62117',
  facebook: '#1877f2', google: '#34a853', boshqa: '#8c8881' };
const MANBA_QISQA = { instagram: 'IG', tiktok: 'TT', telegram: 'TG', youtube: 'YT', facebook: 'FB', google: 'G', boshqa: '•' };
const manbaBelgi = (m) => `<span class="mb-belgi" style="--mb:${MANBA_RANG[m] || MANBA_RANG.boshqa}">${MANBA_QISQA[m] || '•'}</span>`;
const MANBA_DAVR = [[7, '7 kun'], [30, '30 kun'], [90, '90 kun'], [0, 'Hammasi']];

async function manbalarBolimi() {
  holat.mkun = holat.mkun ?? 30;
  try {
    const d = await api(`/api/admin/manbalar?kun=${holat.mkun}`);
    holat.kesh.manba = d;
    const j = d.jami;
    const maxR = Math.max(1, ...d.manbalar.map((x) => Math.max(x.royxat, x.unikal)));
    const kunMax = Math.max(1, ...d.kunlar.map((k) => Object.entries(k).filter(([n]) => n !== 'kun').reduce((a, [, v]) => a + v, 0)));
    $('#tan').innerHTML = `
      <div class="asbob">
        <div class="davr">${MANBA_DAVR.map(([k, n]) =>
          `<button data-mkun="${k}" class="${holat.mkun === k ? 'faol' : ''}">${n}</button>`).join('')}</div>
      </div>

      <div class="kpi-tor">
        ${kpiKarta('Bosishlar', som(j.bosish), null, 'magnit')}
        ${kpiKarta('Ro‘yxatdan o‘tdi', som(j.royxat), null, 'odamlar')}
        ${kpiKarta('Sotib oldi', som(j.xaridor), null, 'savat')}
        ${kpiKarta('Daromad', narx(j.daromad), null, 'pul')}
      </div>

      <div class="ustunlar">
        <section class="karta">
          <div class="karta-bosh"><h2>Qayerdan kelishdi</h2><span class="yor kul">${esc(d.davr)}</span></div>
          ${d.manbalar.length ? `<div class="mb-royxat">${d.manbalar.map((x) => `
            <div class="mb-qator">
              ${manbaBelgi(x.manba)}
              <div class="mb-tan">
                <div class="mb-nom"><b>${esc(x.nom)}</b><span>${som(x.royxat)} ro‘yxat · ${som(x.xaridor)} xarid</span></div>
                <div class="mb-yol"><i style="width:${Math.round(x.unikal / maxR * 100)}%;--mb:${MANBA_RANG[x.manba] || '#888'}"></i>
                  <i class="ichki" style="width:${Math.round(x.royxat / maxR * 100)}%;--mb:${MANBA_RANG[x.manba] || '#888'}"></i></div>
              </div>
              <div class="mb-son"><b>${som(x.unikal)}</b><span>odam</span></div>
            </div>`).join('')}</div>`
          : `<div class="hammasi-joyida">${ik('magnit', 22)}<b>Hali ma’lumot yo‘q</b><span>Pastdagi havolalarni bio va postlarga qo‘ying</span></div>`}
          ${d.manbasi_nomalum_royxat ? `<p class="mb-nomalum">${ik('info', 15)}<span>Manbasi noma’lum: <b>${som(d.manbasi_nomalum_royxat)}</b> ta
            yangi foydalanuvchi — havolasiz kelganlar (masalan botni to‘g‘ridan-to‘g‘ri topganlar).</span></p>` : ''}
        </section>
        <section class="karta">
          <div class="karta-bosh"><h2>Bosishlar · 14 kun</h2></div>
          <div class="grafik">${d.kunlar.map((k) => {
            const jamiK = Object.entries(k).filter(([n]) => n !== 'kun').reduce((a, [, v]) => a + v, 0);
            return `<div style="--h:${Math.max(2, Math.round(jamiK / kunMax * 100))}%" data-tip="${esc(k.kun.slice(5))} · ${jamiK} bosish"></div>`;
          }).join('')}</div>
          <div class="grafik-x">${d.kunlar.map((k, i) => `<span>${i % 2 ? '' : k.kun.slice(8)}</span>`).join('')}</div>
          <div class="mini-stat">
            <div><span>Unikal odam</span><b>${som(j.unikal)}</b></div>
            <div><span>Ro‘yxatga o‘tish</span><b>${j.konversiya_foiz ?? '—'}${j.konversiya_foiz != null ? '%' : ''}</b></div>
            <div><span>Tahlil qildi</span><b>${som(j.tahlil)}</b></div>
            <div><span>Xaridga o‘tish</span><b>${j.xarid_foiz ?? '—'}${j.xarid_foiz != null ? '%' : ''}</b></div>
          </div>
        </section>
      </div>

      <section class="karta">
        <div class="karta-bosh"><h2>Havolalar</h2>
          <button class="tug kichik asos" id="t-havola-yangi">${ik('plyus', 15)}Yangi havola</button></div>
        <div class="hv-royxat">${d.havolalar.map((h) => `
          <div class="hv-qator ${h.faol ? '' : 'ochiq-emas'}">
            ${manbaBelgi(h.manba)}
            <div class="hv-tan">
              <b>${esc(h.nom)}</b>
              <button class="hv-url" data-nusxa="${esc(h.url)}" title="Nusxa olish">${esc(h.url.replace(/^https?:\/\//, ''))}${ik('nusxa', 14)}</button>
              <span class="hv-izoh">${esc(h.maqsad_nom)}${h.faol ? '' : ' · o‘chirilgan'}</span>
            </div>
            <div class="hv-stat">
              <div><b>${som(h.bosish)}</b><span>bosish</span></div>
              <div><b>${som(h.royxat)}</b><span>ro‘yxat</span></div>
              <div><b>${som(h.xaridor)}</b><span>xarid</span></div>
              <div><b>${narx(h.daromad)}</b><span>daromad</span></div>
            </div>
            <button class="ik-tugma" data-havola="${h.id}" aria-label="Sozlash">${ik('sozlama')}</button>
          </div>`).join('')}</div>
      </section>

      <section class="ai-chaqiriq">
        <div class="ai-chaqiriq-bosh">${ik('ai', 20)}<b>AI dan so‘rang</b></div>
        <div class="ai-chiplar">
          <button data-mai="Qaysi manba eng yaxshi ishlayapti? Instagram va TikTokni solishtir: kelgan, ro‘yxatdan o‘tgan, sotib olgan, daromad. Grafik chiz va nima qilishni ayt.">${ik('osish', 15)}Qaysi manba yaxshi ishlayapti?</button>
          <button data-mai="Yangi TikTok videosi uchun alohida havola yarat (bepul tahlilga olib borsin).">${ik('plyus', 15)}TikTok video uchun havola</button>
        </div>
      </section>`;

    $$('[data-mkun]').forEach((b) => b.onclick = () => { holat.mkun = Number(b.dataset.mkun); manbalarBolimi(); });
    $$('[data-mai]').forEach((b) => b.onclick = () => aiSora(b.dataset.mai));
    $$('[data-nusxa]').forEach((b) => b.onclick = () => nusxaOl(b.dataset.nusxa));
    $$('[data-havola]').forEach((b) => b.onclick = () =>
      havolaOyna(d.havolalar.find((h) => h.id === Number(b.dataset.havola))));
    $('#t-havola-yangi').onclick = () => havolaOyna(null);
  } catch (e) { xatoChiz(e); }
}

async function nusxaOl(matn) {
  try { await navigator.clipboard.writeText(matn); tost('Havola nusxalandi'); }
  catch { prompt('Havolani nusxalang:', matn); }
}

function havolaOyna(h) {
  const d = holat.kesh.manba || { turlar: {}, maqsadlar: {} };
  const tanlov = (obj, joriy) => Object.entries(obj).map(([k, n]) =>
    `<option value="${k}" ${k === joriy ? 'selected' : ''}>${esc(n)}</option>`).join('');
  modal(h ? 'Havolani sozlash' : 'Yangi havola', `
    <label>Nomi<span class="yordam">Qayerga qo‘yasiz: «Instagram bio», «TikTok — 12-oktabr video», «Bloger Madina»</span></label>
    <input id="hv-nom" value="${esc(h?.nom || '')}" maxlength="80" placeholder="TikTok — aksiya videosi">
    ${h ? '' : `<label>Manba</label><select id="hv-manba">${tanlov(d.turlar, 'instagram')}</select>`}
    <label>Qayerga olib boradi<span class="yordam">«Bepul yuz tahlili» eng ko‘p lid beradi</span></label>
    <select id="hv-maqsad">${tanlov(d.maqsadlar, h?.maqsad || 'skan')}</select>
    ${h ? `<label class="belgi-qator" style="margin-top:14px"><input type="checkbox" id="hv-faol" ${h.faol ? 'checked' : ''}>Faol</label>`
        : `<label>Qisqa kod (ixtiyoriy)<span class="yordam">www.kiovo.shop/h/<b>kod</b> — bo‘sh qolsa o‘zi yasaladi</span></label>
           <input id="hv-kod" maxlength="32" placeholder="tt-aksiya" autocapitalize="off">`}
    <div id="hv-xato" class="xato"></div>
    <div class="amallar" style="margin-top:16px">
      ${h ? `<button class="tug xavf" id="hv-ochir">${ik('ochir', 16)}O‘chirish</button>` : ''}
      <button class="tug asos" id="hv-saqla">${h ? 'Saqlash' : 'Havola yaratish'}</button>
    </div>`);
  $('#hv-saqla').onclick = async () => {
    try {
      const tana = h
        ? { id: h.id, nom: $('#hv-nom').value, maqsad: $('#hv-maqsad').value, faol: $('#hv-faol').checked }
        : { nom: $('#hv-nom').value, manba: $('#hv-manba').value, maqsad: $('#hv-maqsad').value, kod: $('#hv-kod').value };
      const r = await api('/api/admin/havola', { method: 'POST', body: JSON.stringify(tana) });
      modalYop();
      if (!h && r.havola?.url) { await nusxaOl(r.havola.url); }
      manbalarBolimi();
    } catch (e) { $('#hv-xato').textContent = e.message; }
  };
  if (h) $('#hv-ochir').onclick = () => tasdiqla('Havolani o‘chirish',
    'Havola ishlamay qoladi va uning bosishlar tarixi o‘chadi. Foydalanuvchilarning manbasi (masalan «Instagram») saqlanadi.',
    async () => { await api('/api/admin/havola', { method: 'DELETE', body: JSON.stringify({ id: h.id }) }); modalYop(); manbalarBolimi(); },
    { xavf: true });
}

const voronkaQator = (nom, son, asos) => `
  <div class="q"><div class="nom">${esc(nom)}</div>
    <div class="chiziq"><i style="width:${asos ? Math.min(100, Math.round(son / asos * 100)) : 0}%"></i></div>
    <div class="son">${som(son)}${asos ? ` · ${Math.round(son / asos * 100)}%` : ''}</div></div>`;

// ═══════════ 2. BUYURTMALAR ═══════════
// Koreyadan mijozgacha bo'lgan yo'l. Tartib SHU YERDA — Postgres enum'idagi
// tartib tarixiy sabablarga ko'ra boshqacha (src/lib/bosqichlar.js ga qarang).
/* ═══════════ 2. BUYURTMALAR ═══════════
 *
 * Buyurtmalar endi ALOHIDA ish stolida — `/buyurtma/`.
 *
 * Ilgari ular shu yerda edi va chalkashlik tug'dirardi: filtr faqat
 * bosqich bo'yicha, qidiruv yo'q, holatni o'zgartirish esa
 * to'qqizta tugmadan iborat ro'yxat — operator qaysi biri
 * keyingisi ekanini o'zi eslab qolishi kerak edi.
 *
 * Ikkita joyda ikkita ro'yxat saqlash undan ham yomon bo'lardi,
 * shuning uchun bu bo'lim o'sha ekranga OLIB BORADI. Kirish tokeni
 * bitta (`qq_admin`), ya'ni qayta parol so'ralmaydi.
 */
function buyurtmalar() {
  location.href = '/buyurtma/';
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
    const hammasi = j.mahsulotlar;
    // Ikkala nom bo'yicha ham qidiriladi
    let royxat = q
      ? hammasi.filter((p) =>
          `${p.name} ${p.nom_uz || ''} ${p.brand || ''}`.toLowerCase().includes(q))
      : hammasi;
    royxat = royxat.filter(MAH_FILTR[mf.tur]?.f || (() => true));

    const nomsiz = hammasi.filter((p) => p.is_active && !p.nom_uz).length;
    const sanoq = Object.fromEntries(Object.entries(MAH_FILTR)
      .map(([k, v]) => [k, hammasi.filter(v.f).length]));

    $('#tan').innerHTML = `
      <!-- Asboblar satri: qidiruv + qo'shish. Bitta qatorda, matnsiz -->
      <div class="asbob">
        <label class="qidir-joy">${ik('qidir')}<input id="m-qidiruv" placeholder="Nom yoki brend"
          value="${esc(qidiruv)}" autocomplete="off"><em>${royxat.length}</em></label>
        <div class="asbob-tug">
          <button class="tug" id="t-skrin" title="Bitta rasmdan">${ik('skaner')}<span>Rasmdan</span></button>
          <button class="tug" id="t-toplam" title="Ko‘p rasmdan birdan">${ik('papka')}<span>Ko‘p rasm</span></button>
          <button class="tug asos" id="t-yangi">${ik('plyus')}<span>Qo‘shish</span></button>
        </div>
      </div>
      ${nomsiz ? `<div class="karta ogoh"><div><b>${nomsiz} ta mahsulot nomi inglizcha</b></div>
        <button class="tug kichik" id="t-nomuz">${ik('ai', 15)}O‘zbekchaga o‘girish</button></div>` : ''}
      <!-- Filtr: katalogni ko'z bilan tekshirib chiqish uchun -->
      <div class="chip-satr">
        ${Object.entries(MAH_FILTR).map(([k, v]) => `<button
          class="chip${mf.tur === k ? ' faol' : ''}" data-mf="${k}">${esc(v.n)}<i>${sanoq[k]}</i></button>`).join('')}
      </div>
      ${royxat.length ? `<div class="mah-tor">${royxat.map(mahsulotKarta).join('')}</div>` : boshHolat('🔍', 'Topilmadi')}`;

    let t; $('#m-qidiruv').oninput = (e) => {
      clearTimeout(t); const v = e.target.value;
      t = setTimeout(() => { mahsulotlar(v); setTimeout(() => $('#m-qidiruv')?.focus(), 0); }, 300);
    };
    $('#t-yangi').onclick = () => mahsulotOyna(null);
    $('#t-nomuz') && ($('#t-nomuz').onclick = nomlarniOgir);
    $$('[data-mf]').forEach((b) => b.onclick = () => { mf.tur = b.dataset.mf; mahsulotlar(qidiruv); });
    // Skrinshotdan AI poster. `data-poster` band — u reklama posteri.
    $$('[data-yasa]').forEach((b) => b.onclick = async () => {
      b.disabled = true; b.innerHTML = '<span class="aylana kichik"></span>Chizilmoqda… (≈30 s)';
      try {
        await api('/api/admin/poster-yasa', { method: 'POST',
          body: JSON.stringify({ id: Number(b.dataset.yasa) }) });
        tost('Poster tayyor'); holat.kesh = {}; mahsulotlar(qidiruv);
      } catch (e) {
        tost(e.message, 'xato');
        b.disabled = false; b.innerHTML = `${ik('ai', 15)}Qayta urinish`;
      }
    });
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

// Mahsulot filtrlari — katalogni ko'z bilan tekshirib chiqish uchun.
// Har biri BITTA savolga javob beradi: nimasi tugallanmagan?
const MAH_FILTR = {
  hammasi:  { n: 'Hammasi',       f: () => true },
  skrinshot:{ n: 'Hali skrinshot', f: (p) => p.poster_turi === 'skrinshot' },
  rasmsiz:  { n: 'Rasmsiz',       f: (p) => !p.poster_id },
  nomsiz:   { n: 'Nomi inglizcha', f: (p) => !p.nom_uz },
  havolasiz:{ n: 'Havolasiz',     f: (p) => !p.manba_url },
  tugagan:  { n: 'Omborda yo‘q',  f: (p) => !p.stock },
  yopiq:    { n: 'Sotuvda emas',  f: (p) => !p.is_active },
};
const mf = { tur: 'hammasi' };

/**
 * Katalogdagi hamma nomni o'zbekchaga o'girish.
 *
 * Asl nom O'ZGARMAYDI — u Koreyadan xarid qilish, pochta hujjati va
 * /orders ro'yxati uchun kerak. Faqat ilovada ko'rinadigan nom yoziladi.
 */
async function nomlarniOgir() {
  tasdiqla('Nomlarni o‘zbekchaga o‘girish',
    'AI har mahsulotga o‘zbekcha nom yozadi. Asl nom o‘zgarmaydi — '
    + 'xarid ro‘yxati va pochta hujjati baribir asl nom bilan ketadi. '
    + 'Bir necha daqiqa olishi mumkin.', async () => {
      tost('O‘girilmoqda…');
      try {
        const r = await api('/api/admin/nom-uz', { method: 'POST',
          body: JSON.stringify({ chegara: 500 }) });
        const n = r.natija || {};
        tost(n.sabab || `${n.yozildi || 0} ta nom o‘girildi`);
        holat.kesh = {}; mahsulotlar();
      } catch (e) { tost(e.message, 'xato'); }
    });
}

function mahsulotKarta(p) {
  const marja = p.price ? Math.round((p.price - p.cost_price) / p.price * 100) : 0;
  const omborYor = p.stock === 0 ? 'qizil' : p.stock <= 5 ? 'sariq' : 'yashil';
  return `
  <div class="qator-karta" style="${p.is_active ? '' : 'opacity:.5'}">
    <div class="qator-bosh" data-mah="${p.id}" style="cursor:pointer">
      <div style="display:flex;gap:11px;align-items:flex-start;min-width:0">
        <!-- Poster: katalogni ko'z bilan tekshirish uchun eng kerakli narsa -->
        <span class="mah-rasm">${p.poster_id
          ? `<img src="/media/${esc(p.poster_id)}?w=200" alt="" loading="lazy">`
          : `<i>${esc(p.emoji || '🧴')}</i>`}</span>
        <div style="min-width:0">
          <div class="nom">${esc(p.nom_uz || p.name)}</div>
          ${p.nom_uz ? `<div class="ozgina" style="opacity:.75">${esc(p.name)}</div>` : ''}
          <div class="ozgina">${esc(p.brand || '')}${p.volume ? ' · ' + esc(p.volume) : ''}</div>
          <div class="mah-teglar">
            ${p.ai_filled ? '<span class="yor kok">AI</span>' : ''}
            ${p.poster_turi === 'skrinshot' ? '<span class="yor sariq">hali skrinshot</span>' : ''}
            ${!p.poster_id ? '<span class="yor qizil">rasmsiz</span>' : ''}
            ${!p.nom_uz ? '<span class="yor sariq">nomi inglizcha</span>' : ''}
            ${!p.manba_url ? '<span class="yor kul">havolasiz</span>' : ''}
            ${p.dona_soni > 1 ? `<span class="yor kok">${p.dona_soni} dona to‘plam</span>` : ''}
            ${p.old_price > p.price ? `<span class="yor urgu">aksiya −${Math.round((1 - p.price / p.old_price) * 100)}%</span>` : ''}
            ${p.variant_nom ? `<span class="yor yashil">${p.rang_hex ? `<i class="rang-nuqta" style="background:${esc(p.rang_hex)}"></i>` : ''}${p.variant_of ? 'variant · ' : ''}${esc(p.variant_nom)}</span>` : ''}
          </div>
        </div>
      </div>
      <span class="yor ${omborYor}">${p.stock} dona</span>
    </div>
    <div class="mah-stat">
      <div><span>Narx</span><b>${som(p.price)}${p.old_price > p.price ? ` <s class="eski">${som(p.old_price)}</s>` : ''}</b></div>
      <div><span>Marja</span><b class="${marja >= 35 ? 'yashil' : marja >= 20 ? 'sariq' : 'qizil'}">${marja}%</b></div>
      <div><span>Sotildi</span><b>${som(p.sold_count)}</b></div>
    </div>
    <div class="amallar">
      <button class="tug kichik" data-mah="${p.id}">${ik('hujjat', 15)}Tahrirlash</button>
      <button class="tug kichik" data-poster="${p.id}">${ik('xat', 15)}Poster</button>
      ${p.poster_turi === 'skrinshot' ? `<button class="tug kichik asos"
        data-yasa="${p.id}">${ik('ai', 15)}AI poster</button>` : ''}
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
    <label>Asl nomi *<span class="yordam">Koreyadagi nom — xarid ro‘yxati va
      pochta hujjati shunga tayanadi, o‘zgartirmang</span></label>
    <input id="m-name" value="${esc(p?.name || '')}">
    <label>Ilovadagi nomi<span class="yordam">Mijoz shuni ko‘radi.
      Bo‘sh qoldirsangiz asl nom ko‘rinadi va AI keyin to‘ldiradi.</span></label>
    <input id="m-nomuz" value="${esc(p?.nom_uz || '')}"
           placeholder="Heartleaf teshik tozalovchi gidrofil moy">
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
      <div><label>To‘plamda necha dona
        <span class="yordam">10 ta niqob — 10. Bitta bo‘lsa bo‘sh</span></label>
        <input id="m-dona" type="number" inputmode="numeric" min="0"
          value="${p?.dona_soni || ''}" placeholder="1"></div>
      <div><label>Emoji</label><input id="m-emoji" value="${esc(p?.emoji || '🧴')}" maxlength="4"></div>
    </div>
    ${variantBolimi(p)}
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
  variantniUla(p);

  $('#m-saqla').onclick = async () => {
    const xato = $('#m-xato');
    const tana = {
      id: p?.id || undefined,
      name: $('#m-name').value.trim(), nom_uz: $('#m-nomuz').value.trim(),
      brand: $('#m-brand').value.trim(),
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
      dona_soni: Math.max(0, Number($('#m-dona').value) || 0),
      variant_nom: $('#m-vnom').value.trim(), variant_tur: $('#m-vtur').value,
      rang_hex: $('#m-vtur').value === 'rang' ? $('#m-vrang').value : '',
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

/* ── VARIANTLAR (rang, hajm) ──
   Har variant — alohida mahsulot (o'z narxi va qoldig'i), asosiysiga
   bog'langan. Ilovada faqat asosiysi ko'rinadi, oynasida variant tanlanadi. */
const VARIANT_TUR = { hajm: 'Hajm / o‘lcham', rang: 'Rang', tur: 'Boshqa' };
function variantBolimi(p) {
  const asos = p?.variant_of ? (holat.kesh.mahsulotlar || []).find((x) => x.id === p.variant_of) : null;
  const bolalar = p?.id && !p.variant_of
    ? (holat.kesh.mahsulotlar || []).filter((x) => x.variant_of === p.id) : [];
  const tur = p?.variant_tur || 'hajm';
  return `
    <div class="variant-bolim">
      <h4>🎨 Variantlar <span class="yordam">bir mahsulotning rangi yoki hajmi — har birining o‘z narxi</span></h4>
      ${asos ? `<p class="mayda" style="margin:0 0 8px">Bu <b>${esc(asos.nom_uz || asos.name)}</b> mahsulotining varianti.</p>` : ''}
      <div class="forma-tor">
        <div><label>Shu variantning nomi<span class="yordam">«50 ml», «02 Pushti»</span></label>
          <input id="m-vnom" value="${esc(p?.variant_nom || '')}" placeholder="${tur === 'rang' ? '02 Pushti' : '50 ml'}"></div>
        <div><label>Turi</label><select id="m-vtur">
          ${Object.entries(VARIANT_TUR).map(([k, n]) => `<option value="${k}" ${k === tur ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
        <div id="m-vrang-quti" class="${tur === 'rang' ? '' : 'yashirin'}"><label>Rang</label>
          <input id="m-vrang" type="color" value="${esc(p?.rang_hex || '#d4506a')}"></div>
      </div>
      ${bolalar.length ? `<div class="variant-royxat">${bolalar.map((v) => `
        <button class="variant-qator" data-variant="${v.id}">
          ${v.rang_hex ? `<i class="rang-nuqta" style="background:${esc(v.rang_hex)}"></i>` : ''}
          <b>${esc(v.variant_nom || '—')}</b>
          <span>${narx(v.price)}</span><span class="ozgina">${v.stock} dona</span>
          <span class="ozgina">✏️</span></button>`).join('')}</div>` : ''}
      ${p?.id && !p.variant_of ? `
        <details class="variant-qosh">
          <summary>＋ Variant qo‘shish</summary>
          <div class="forma-tor">
            <div><label>Variant nomi *</label><input id="v-nom" placeholder="${tur === 'rang' ? '03 Qizil' : '100 ml'}"></div>
            <div class="${tur === 'rang' ? '' : 'yashirin'}" id="v-rang-quti"><label>Rang</label>
              <input id="v-rang" type="color" value="#b3263e"></div>
            <div><label>Narx (so‘m) *</label><input id="v-narx" type="number" inputmode="numeric" value="${p.price || ''}"></div>
            <div><label>Tannarx</label><input id="v-tannarx" type="number" inputmode="numeric" value="${p.cost_price || ''}"></div>
            <div><label>Ombor (dona)</label><input id="v-ombor" type="number" inputmode="numeric" value="0"></div>
          </div>
          <p class="mayda">Tavsif, tarkib, rasm va toifa asosiy mahsulotdan ko‘chiriladi —
            keyin variantni alohida tahrirlab, o‘z rasmini qo‘yasiz.</p>
          <div id="v-xato" class="xato"></div>
          <button class="tug asos keng" id="v-qosh">Variantni qo‘shish</button>
        </details>` : ''}
    </div>`;
}
function variantniUla(p) {
  const tur = $('#m-vtur');
  if (!tur) return;
  tur.onchange = () => {
    $('#m-vrang-quti').classList.toggle('yashirin', tur.value !== 'rang');
    const vq = $('#v-rang-quti'); if (vq) vq.classList.toggle('yashirin', tur.value !== 'rang');
  };
  $$('[data-variant]').forEach((b) => b.onclick = () => {
    const v = (holat.kesh.mahsulotlar || []).find((x) => x.id === Number(b.dataset.variant));
    if (v) mahsulotOyna(v);
  });
  const qosh = $('#v-qosh');
  if (qosh) qosh.onclick = async () => {
    const xato = $('#v-xato'); xato.textContent = '';
    const tana = {
      asos_id: p.id, asos_variant_nom: $('#m-vnom').value.trim(),
      asos_rang_hex: tur.value === 'rang' ? $('#m-vrang').value : '',
      variant_nom: $('#v-nom').value.trim(), variant_tur: tur.value,
      rang_hex: tur.value === 'rang' ? $('#v-rang').value : '',
      price: Number($('#v-narx').value), cost_price: Number($('#v-tannarx').value) || 0,
      stock: Number($('#v-ombor').value) || 0,
    };
    if (!tana.variant_nom) return void (xato.textContent = 'Variant nomini yozing.');
    if (!p.variant_nom && !tana.asos_variant_nom) {
      return void (xato.textContent = 'Avval yuqorida SHU mahsulotning variant nomini yozing (masalan «30 ml»).');
    }
    qosh.disabled = true;
    try {
      await api('/api/admin/variant', { method: 'POST', body: JSON.stringify(tana) });
      tost('Variant qo‘shildi');
      holat.kesh.mahsulotlar = null;
      await mahsulotlar();
      const yangi = (holat.kesh.mahsulotlar || []).find((x) => x.id === p.id);
      mahsulotOyna(yangi || p);
    } catch (e) { xato.textContent = e.message; qosh.disabled = false; }
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
      <div class="asbob">
        <label class="qidir-joy">${ik('qidir')}<input id="u-qidiruv" placeholder="Ism, telefon yoki username"
          value="${esc(F.q)}" autocomplete="off"><em>${x.soni ?? 0}</em></label>
        <div class="asbob-tug"><button class="tug" id="u-csv">${ik('hujjat')}<span>CSV</span></button></div>
      </div>

      <div class="segment-lenta">
        ${SEGMENTLAR.map((sg, n) => `<button class="tug kichik" data-seg="${n}"
            title="${esc(sg.izoh)}">${sg.nom}</button>`).join('')}
        <button class="tug kichik" data-seg="tozala">✕ Tozalash</button>
      </div>

      <!-- Filtr yig'ilgan turadi — faqat ishlatilganda ochiq -->
      <details class="karta tor filtr" ${[F.xarid_dan, F.xarid_gacha, F.buyurtma_dan, F.oxirgi_dan, F.oxirgi_gacha, F.xaridor]
        .some(Boolean) ? 'open' : ''}>
        <summary>${ik('sozlama')}<b>Filtr</b>${ik('keyingi', 16)}</summary>
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
        <button class="tug asos keng" id="u-qolla" style="margin-top:12px">Qo‘llash</button>
      </details>

      <div class="kpi-tor">
        ${kpi('Topildi', `${som(x.soni ?? 0)}`)}
        ${kpi('Xaridor', `${som(x.xaridorlar ?? 0)}`)}
        ${kpi('Aylanma', som(x.jami_xarid || 0))}
        ${kpi('O‘rtacha', som(x.ortacha || 0))}
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

// ═══════════ XARID RO'YXATI ═══════════
// Ikkita savolga javob beradi: «Koreyadan nimadan nechta olaman» va
// «qaysi viloyatga qancha ketadi». Telefonda ishlatiladi, shuning
// uchun jadval emas — bosiladigan qatorlar va bitta filtr satri.

const XARID_HOLAT = [
  { k: 'tasdiqlangan', n: 'To‘langan' },
  { k: 'yangi',        n: 'Yangi' },
  { k: 'qadoqlanmoqda',n: 'Yo‘lda' },
  { k: 'yetkazildi',   n: 'Yetkazilgan' },
];
const XARID_DAVR = [
  { k: 7,  n: '7 kun' }, { k: 30, n: '30 kun' },
  { k: 90, n: '90 kun' }, { k: 0,  n: 'Hammasi' },
];
const XARID_SARA = {
  dona:      { n: 'Dona',      f: (a, b) => b.dona - a.dona },
  buyurtma:  { n: 'Buyurtma',  f: (a, b) => b.buyurtma - a.buyurtma },
  summa:     { n: 'Summa',     f: (a, b) => Number(b.summa) - Number(a.summa) },
  ombor:     { n: 'Ombor',     f: (a, b) => a.ombor - b.ombor },
  nom:       { n: 'Nomi',      f: (a, b) => String(a.nom).localeCompare(String(b.nom)) },
};

const xf = { holat: 'tasdiqlangan', kun: 90, sara: 'dona', kor: 'mahsulot', viloyat: '' };

const xaridSorov = () => new URLSearchParams({
  holat: xf.holat, kun: String(xf.kun), ...(xf.viloyat ? { viloyat: xf.viloyat } : {}),
}).toString();

async function xarid() {
  try {
    const j = await api(`/api/admin/xarid?${xaridSorov()}`);
    holat.xarid = j;
    xaridChiz();
  } catch (e) { xatoChiz(e); }
}

function xaridChiz() {
  const j = holat.xarid || { mahsulotlar: [], viloyatlar: [], jami: {} };
  const m = [...j.mahsulotlar].sort(XARID_SARA[xf.sara]?.f || XARID_SARA.dona.f);
  const v = j.viloyatlar || [];
  const jami = j.jami || {};

  $('#tan').innerHTML = `
    <div class="bosh"><h1>Xarid ro‘yxati</h1></div>

    <!-- Filtr: bitta gorizontal satr, telefonda sirg‘aladi -->
    <div class="chip-satr">
      ${XARID_HOLAT.map((h) => `<button class="chip${xf.holat === h.k ? ' faol' : ''}"
        data-xh="${h.k}">${esc(h.n)}</button>`).join('')}
    </div>
    <div class="chip-satr">
      ${XARID_DAVR.map((d) => `<button class="chip${xf.kun === d.k ? ' faol' : ''}"
        data-xd="${d.k}">${esc(d.n)}</button>`).join('')}
    </div>

    <div class="kpi-tor">
      <div class="kpi urgu"><div class="k">Jami dona</div><div class="v">${som(jami.dona)}</div>
        <div class="q">${som(jami.xil)} xil mahsulot</div></div>
      <div class="kpi"><div class="k">Buyurtma</div><div class="v">${som(jami.buyurtma)}</div>
        <div class="q">${som(v.length)} viloyat</div></div>
      <div class="kpi"><div class="k">Summa</div><div class="v">${som(jami.summa)}</div>
        <div class="q">so‘m</div></div>
      <div class="kpi"><div class="k">Tannarx</div><div class="v">${som(jami.tannarx)}</div>
        <div class="q">taxminiy</div></div>
    </div>

    ${xf.viloyat ? `<div class="karta" style="padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="yor urgu">${esc(xf.viloyat)}</span>
        <span class="mayda" style="flex:1">bo‘yicha filtr</span>
        <button class="tug kichik" id="x-viloyat-yop">✕ Olib tashlash</button>
      </div></div>` : ''}

    ${j.havolasiz ? `<div class="karta ogoh">
      <div><b>${j.havolasiz} ta mahsulotning havolasi yo‘q</b>
        <div class="mayda">Xaridga chiqishdan oldin qo‘shing — bo‘lmasa
          do‘kondan qaysi biri ekanini topolmaysiz.</div></div>
      <button class="tug kichik" data-b2="havola">Havolasizlar →</button>
    </div>` : ''}

    <!-- Ko'rinish almashtirgich -->
    <div class="ikkilik">
      <button class="${xf.kor === 'mahsulot' ? 'faol' : ''}" data-xk="mahsulot">
        Mahsulot <i>${m.length}</i></button>
      <button class="${xf.kor === 'viloyat' ? 'faol' : ''}" data-xk="viloyat">
        Viloyat <i>${v.length}</i></button>
    </div>

    ${xf.kor === 'mahsulot' ? `
      <div class="chip-satr sara">
        <span class="chip-yorliq">Saralash</span>
        ${Object.entries(XARID_SARA).map(([k, s]) => `<button
          class="chip${xf.sara === k ? ' faol' : ''}" data-xs="${k}">${esc(s.n)}</button>`).join('')}
      </div>
      <div class="royxat">
        ${m.length ? m.map((x, i) => xaridQator(x, i)).join('')
          : boshHolat('📦', 'Bu oraliqda buyurtma yo‘q.')}
      </div>`
    : `<div class="royxat">
        ${v.length ? v.map((x) => `
          <button class="satr" data-xv="${esc(x.viloyat)}">
            <span class="satr-nom">${esc(x.viloyat)}
              <i>${som(x.dona)} dona · ${som(x.summa)} so‘m</i></span>
            <span class="satr-son katta">${som(x.buyurtma)}<i>buyurtma</i></span>
          </button>`).join('')
        : boshHolat('🗺', 'Bu oraliqda buyurtma yo‘q.')}
      </div>`}

    <div class="karta">
      <div class="karta-bosh"><h2>Eksport</h2></div>
      <p class="mayda" style="margin:0 0 12px">Excel’da ochiladigan CSV.
        Telefonda «Telegramga» tugmasi qulayroq — fayl botdan keladi.</p>
      <div style="display:grid;gap:8px">
        <button class="tug asos keng" id="x-tg">📨 Telegramga yuborish</button>
        <button class="tug keng" id="x-yukla">⬇︎ Yuklab olish (CSV)</button>
      </div>
    </div>`;

  $$('[data-xh]').forEach((b) => b.onclick = () => { xf.holat = b.dataset.xh; yuklanmoqda(); xarid(); });
  $$('[data-xd]').forEach((b) => b.onclick = () => { xf.kun = Number(b.dataset.xd); yuklanmoqda(); xarid(); });
  $$('[data-xs]').forEach((b) => b.onclick = () => { xf.sara = b.dataset.xs; xaridChiz(); });
  $$('[data-xk]').forEach((b) => b.onclick = () => { xf.kor = b.dataset.xk; xaridChiz(); });
  $$('[data-xv]').forEach((b) => b.onclick = () => {
    xf.viloyat = b.dataset.xv === 'Ko‘rsatilmagan' ? '' : b.dataset.xv;
    xf.kor = 'mahsulot'; yuklanmoqda(); xarid();
  });
  const vy = $('#x-viloyat-yop');
  if (vy) vy.onclick = () => { xf.viloyat = ''; yuklanmoqda(); xarid(); };
  $$('[data-b2]').forEach((b) => b.onclick = () => bolimOch(b.dataset.b2));

  // Qatorni bosganda tafsilot
  $$('[data-xm]').forEach((b) => b.onclick = () => {
    const x = m[Number(b.dataset.xm)];
    if (x) xaridTafsilot(x);
  });

  $('#x-tg').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const r = await api('/api/admin/xarid-yubor', { method: 'POST',
        headers: tg?.initData ? { 'X-Init-Data': tg.initData } : {},
        body: JSON.stringify({ tur: xf.kor, sorov: xaridSorov() }) });
      tost(`Yuborildi: ${r.nom}`);
    } catch (err) { tost(err.message, 'xato'); }
    e.target.disabled = false;
  };
  $('#x-yukla').onclick = () => xaridYukla();
}

/**
 * Bitta mahsulot qatori.
 *
 * Telefonda eng qimmat narsa — kenglik. Shuning uchun raqamlar ustunga
 * yoyilmaydi: o'ngda faqat ASOSIY son (nechta dona kerak), qolgani
 * nom ostidagi bitta satrda. Shunda mahsulot nomi to'liq ko'rinadi.
 */
function xaridQator(x, i) {
  const kam = x.ombor < x.dona;
  const izoh = [x.brend, `${som(x.buyurtma)} buyurtma`, som(x.summa)].filter(Boolean).join(' · ');
  return `
    <button class="satr" data-xm="${i}">
      <span class="satr-nom">${esc(x.nom)}<i>${esc(izoh)}</i></span>
      <span class="satr-belgi">
        ${!x.manba_url && x.product_id ? '<i class="nuqta qizil" title="Havola yo‘q"></i>' : ''}
        ${kam ? '<i class="nuqta sariq" title="Omborda yetmaydi"></i>' : ''}
      </span>
      <span class="satr-son katta">${som(x.dona)}<i>dona</i></span>
    </button>`;
}

function xaridTafsilot(x) {
  modal(x.nom, `
    <div class="qator-satr"><span class="k">Brend</span><span class="v">${esc(x.brend || '—')}</span></div>
    <div class="qator-satr"><span class="k">Kerak</span><span class="v">${som(x.dona)} dona</span></div>
    <div class="qator-satr"><span class="k">Buyurtmalar</span><span class="v">${som(x.buyurtma)} ta</span></div>
    <div class="qator-satr"><span class="k">Sotuv summasi</span><span class="v">${narx(x.summa)}</span></div>
    <div class="qator-satr"><span class="k">Taxminiy tannarx</span><span class="v">${narx(x.tannarx)}</span></div>
    <div class="qator-satr"><span class="k">Omborda</span>
      <span class="v" ${x.ombor < x.dona ? 'style="color:var(--qizil)"' : ''}>${som(x.ombor)} dona</span></div>
    <div style="display:grid;gap:8px;margin-top:16px">
      <button class="tug keng" data-nusxa="${esc(`${x.brend ? x.brend + ' ' : ''}${x.nom}`)}">📋 Nomni nusxalash</button>
      ${x.manba_url
        ? `<a class="tug keng" target="_blank" rel="noopener" href="${esc(x.manba_url)}">🔗 Manba sahifasi</a>`
        : `<a class="tug keng" target="_blank" rel="noopener"
             href="https://www.coupang.com/np/search?q=${encodeURIComponent(x.nom)}">Coupang’da qidirish</a>`}
    </div>`);
  $$('[data-nusxa]').forEach((b) => b.onclick = () => nusxala(b.dataset.nusxa));
}

/** Kompyuterda to'g'ridan-to'g'ri yuklab olish (token sarlavhada ketadi). */
async function xaridYukla() {
  try {
    const res = await fetch(`/api/admin/xarid.csv?${xaridSorov()}&tur=${xf.kor}`,
      { headers: { Authorization: `Bearer ${holat.token}` } });
    if (!res.ok) throw new Error(`Xatolik (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1]
      || 'xarid.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    tost('Yuklandi');
  } catch (e) {
    tost('Yuklab bo‘lmadi — «Telegramga» tugmasidan foydalaning', 'xato');
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
    const ikonlar = j.ikonlar || [];
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
          <label>Ilovadagi ikonka<span class="yordam">Filtr doirasida ko‘rinadi.
            Tanlanmasa nomdan avtomatik topiladi.</span></label>
          <select class="bl-i">
            <option value="">— avtomatik —</option>
            ${ikonlar.map((i) => `<option value="${esc(i)}"
              ${x.ikon === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}
          </select>
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
          ikon: k.querySelector('.bl-i').value,
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
          Narx = <b>tannarx</b> + <b>yo‘lkira</b> + <b>sof foyda</b>.
          Yo‘lkira og‘irlikka qarab (qalam, lab bo‘yog‘iga 2–5 ming), eng kami belgilangan.
          Sof foyda faqat tannarxdan foiz: eng kam va eng ko‘p summa bilan, «chegara» esa
          hech bir mahsulotda undan oshirmaydi.</p>
        <div class="forma-tor">
          <div><label>1 KRW necha so‘m</label>
            <input id="mk-kurs" type="number" step="0.1" value="${q.krw_kurs ?? 9.5}"></div>
          <div><label>Har 100 g uchun (so‘m)</label>
            <input id="mk-yetkazish" type="number" value="${q.yetkazish_100g ?? 15000}"></div>
          <div><label>Eng kam yo‘lkira (so‘m)</label>
            <input id="mk-yol-min" type="number" value="${q.yetkazish_min ?? 2000}"></div>
          <div><label>Sof foyda (% tannarxdan)</label>
            <input id="mk-foiz" type="number" value="${q.foyda_foiz ?? 35}"></div>
          <div><label>Foyda chegarasi (%) <span class="yordam">0 = cheklovsiz</span></label>
            <input id="mk-chegara" type="number" value="${q.foyda_chegara_foiz ?? 0}"></div>
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
    ['mk-kurs','mk-yetkazish','mk-foiz','mk-yaxlit','mk-foyda-min','mk-foyda-max','mk-yol-min','mk-chegara']
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
    ['Lab bo‘yog‘i · 2 000 KRW · 15 g', 2000, 15],
    ['Kichik tovar · 3 000 KRW · 50 g', 3000, 50],
    ['Krem · 12 000 KRW · 100 g',       12000, 100],
    ['Katta · 25 000 KRW · 250 g',      25000, 250],
  ];
  try {
    const natijalar = [];
    for (const [nom, krw, gramm] of misollar) {
      const j = await api('/api/admin/marketplace/narx',
        { method: 'POST', body: JSON.stringify({ krw, gramm, ...qoida }) });
      natijalar.push(`${nom} → <b>${som(j.narx.narx)}</b> (yo‘lkira ${som(j.narx.yetkazish)}, foyda ${som(j.narx.foyda)} · ${j.narx.foyda_foiz}%)`);
    }
    el.innerHTML = natijalar.join('<br>');
  } catch { el.innerHTML = ''; }
}

const marketQoida = () => ({
  krw_kurs:       Number($('#mk-kurs')?.value) || 9.5,
  yetkazish_100g: Number($('#mk-yetkazish')?.value) || 0,
  yetkazish_min:  Number($('#mk-yol-min')?.value) || 0,
  foyda_foiz:     Number($('#mk-foiz')?.value) || 0,
  foyda_chegara_foiz: Number($('#mk-chegara')?.value) || 0,
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
      <div class="xabar-quti izoh-quti">
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
    holat.kesh.mavzuErkak = st.mavzu_erkak && typeof st.mavzu_erkak === 'object'
      ? { ...st.mavzu_erkak } : null;
    holat.kesh.mavzuToplamlar = j.mavzu_toplamlar || [];
    const matn = (k, z = '') => String(st[k] ?? z).replace(/^"|"$/g, '');
    // Sotuvchi — obyekt (oferta, maxfiylik va hisobni o‘chirish sahifalari uchun)
    const sv = (st.sotuvchi && typeof st.sotuvchi === 'object') ? st.sotuvchi : {};
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
        <div class="karta-bosh"><h2>⚖️ Sotuvchi (oferta va maxfiylik)</h2></div>
        <p class="mayda" style="margin:0 0 12px">Bu ma’lumot <b>/oferta</b>,
          <b>/maxfiylik</b> va <b>/hisobni-ochirish</b> sahifalarida yoziladi.
          Google Play bu sahifalarni talab qiladi va ularda sotuvchi kimligi
          ko‘rinishi kerak. Jismoniy shaxs bo‘lsangiz — F.I.Sh. yetarli.</p>
        <label>F.I.Sh. yoki tashkilot nomi</label>
        <input id="s-sot-ism" value="${esc(sv.ism || '')}" placeholder="Aliyev Aziz Akmalovich">
        <div class="forma-tor">
          <div><label>Maqomi</label>
            <select id="s-sot-maqom">
              ${[['jismoniy', 'Jismoniy shaxs'], ['ozini_band', 'O‘zini o‘zi band qilgan'],
                 ['yatt', 'YaTT'], ['mchj', 'MChJ']].map(([k, n]) =>
                `<option value="${k}" ${(sv.maqom || 'jismoniy') === k ? 'selected' : ''}>${n}</option>`).join('')}
            </select></div>
          <div><label>STIR / JShShIR <span class="yordam">ixtiyoriy</span></label>
            <input id="s-sot-stir" inputmode="numeric" value="${esc(sv.stir || '')}"></div>
        </div>
        <label>Aloqa emaili <span class="yordam">Play Console’ga ham shu yoziladi</span></label>
        <input id="s-sot-email" type="email" value="${esc(sv.email || '')}" placeholder="kiovo.shop@gmail.com">
        <label>Manzil <span class="yordam">ixtiyoriy</span></label>
        <input id="s-sot-manzil" value="${esc(sv.manzil || '')}" placeholder="Toshkent sh., Yunusobod t.">
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>🤖 Android ilova (Google Play)</h2></div>
        <p class="mayda" style="margin:0 0 12px">Ilova saytni brauzer manzil
          satrisiz ochishi uchun Android imzo barmoq izi kerak (<code>/.well-known/assetlinks.json</code>).
          Uni <b>Play Console → Test and release → App integrity → App signing</b>
          bo‘limidagi <b>SHA-256 certificate fingerprint</b> dan ko‘chiring. Bir nechta
          bo‘lsa (yuklash kaliti va Play kaliti) — har birini yangi qatorga.</p>
        <label>SHA-256 barmoq izlari</label>
        <textarea id="s-android-sha" rows="3" placeholder="AB:CD:12:…">${esc(matn('android_sha256'))}</textarea>
        <label>Play Store havolasi <span class="yordam">chiqqandan keyin — saytda tugma paydo bo‘ladi</span></label>
        <input id="s-play" value="${esc(matn('play_havola'))}"
               placeholder="https://play.google.com/store/apps/details?id=shop.kiovo.app">
      </div>

      <div class="karta tor">
        <div class="karta-bosh"><h2>📱 Mini App qisqa nomi</h2></div>
        <p class="mayda" style="margin:0 0 12px">Telefon bosh ekraniga qo‘yilgan
          yorliq <b>ilovani</b> ochishi uchun kerak — busiz u bot suhbatini ochadi.
          Nomni <b>BotFather</b> beradi: <code>/mybots</code> → botingiz →
          <b>Bot Settings</b> → <b>Configure Mini App</b> → <b>Enable</b>.
          O‘sha yerdagi havoladagi oxirgi so‘zni (<code>t.me/bot/<b>ilova</b></code>)
          shu yerga yozing.</p>
        <label>Qisqa nom <span class="yordam">faqat harf, raqam va _</span></label>
        <input id="s-miniapp" value="${esc(matn('mini_app_nom'))}" placeholder="ilova">
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

        <!-- Erkaklar uchun alohida rang. Pushti-qizil kartochka erkak
             mijozga «o'ziniki emas» bo'lib tuyuladi. -->
        <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--chiziq)">
          <label style="display:flex;align-items:center;gap:9px;cursor:pointer">
            <input type="checkbox" id="s-mv-erkak-yoq" style="width:auto;margin:0">
            <span><b>Erkaklar uchun boshqa rang</b></span>
          </label>
          <p class="mayda" style="margin:6px 0 0">Skaner erkakni aniqlasa
            tahlil rasmi shu rangda chiziladi. O‘chirilgan bo‘lsa hamma
            uchun yuqoridagi mavzu ishlatiladi.</p>
          <div id="mavzu-erkak-quti" hidden style="margin-top:12px">
            <div class="forma-tor">
              <div><label>Sarlavha</label>
                <div class="rang-tanlov">
                  <input type="color" id="s-mve-asosiy">
                  <input type="text" id="s-mve-asosiy-hex" spellcheck="false" maxlength="7">
                </div></div>
              <div><label>Fon</label>
                <div class="rang-tanlov">
                  <input type="color" id="s-mve-fon">
                  <input type="text" id="s-mve-fon-hex" spellcheck="false" maxlength="7">
                </div></div>
              <div><label>Urg‘u</label>
                <div class="rang-tanlov">
                  <input type="color" id="s-mve-urgu">
                  <input type="text" id="s-mve-urgu-hex" spellcheck="false" maxlength="7">
                </div></div>
            </div>
            <div id="mavzu-erkak-namuna" style="margin-top:10px"></div>
          </div>
        </div>
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

  // ── Erkaklar mavzusi ──
  const E = holat.kesh.mavzuErkak;
  const yoq = $('#s-mv-erkak-yoq');
  const quti = $('#mavzu-erkak-quti');
  if (yoq && quti) {
    const STANDART_E = { asosiy: '#123A63', fon: '#E7F0F7', urgu: '#1D6FA5' };
    for (const kalit of ['asosiy', 'fon', 'urgu']) {
      const rang = $('#s-mve-' + kalit);
      const hex  = $('#s-mve-' + kalit + '-hex');
      if (!rang || !hex) continue;
      const q = (E && E[kalit]) || STANDART_E[kalit];
      rang.value = q; hex.value = q;
      rang.oninput = () => { hex.value = rang.value; erkakNamuna(); };
      hex.oninput = () => {
        const v = hex.value.trim();
        if (/^#?[0-9a-fA-F]{6}$/.test(v)) { rang.value = v.startsWith('#') ? v : '#' + v; erkakNamuna(); }
      };
    }
    yoq.checked = Boolean(E);
    quti.hidden = !E;
    yoq.onchange = () => { quti.hidden = !yoq.checked; erkakNamuna(); };
    erkakNamuna();
  }

  $('#t-mavzu-saqla').onclick = mavzuniSaqla;
  mavzuOzgardi();
}

/** Erkaklar rangi qanday ko'rinishini bir qatorda ko'rsatamiz. */
function erkakNamuna() {
  const el = $('#mavzu-erkak-namuna'); if (!el) return;
  const a = $('#s-mve-asosiy')?.value, f = $('#s-mve-fon')?.value, u = $('#s-mve-urgu')?.value;
  if (!a) return;
  el.innerHTML = `
    <div style="border-radius:12px;overflow:hidden;border:1px solid var(--chiziq)">
      <div style="background:${a};color:${kontrastMatn(a)};padding:12px 14px;font-size:13px">
        <b>Teri holati</b> · 24–28 yosh · erkak</div>
      <div style="background:${f};padding:10px 14px">
        <span style="display:inline-block;height:8px;width:60%;border-radius:9px;background:${u}"></span>
      </div>
    </div>`;
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

    // Erkaklar mavzusi alohida saqlanadi (yoki o'chiriladi)
    const yoq = $('#s-mv-erkak-yoq');
    if (yoq) {
      const e = await api('/api/admin/mavzu', { method: 'POST', body: JSON.stringify(
        yoq.checked
          ? { kalit: 'erkak', asosiy: $('#s-mve-asosiy').value,
              fon: $('#s-mve-fon').value, urgu: $('#s-mve-urgu').value }
          : { kalit: 'erkak', ochir: true })});
      holat.kesh.mavzuErkak = e.mavzu || null;
    }

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
      mini_app_nom:       $('#s-miniapp').value.trim().replace(/^@/, '')
                            .replace(/[^A-Za-z0-9_]/g, ''),
      sotuvchi: {
        ism:    $('#s-sot-ism').value.trim(),
        maqom:  $('#s-sot-maqom').value,
        stir:   $('#s-sot-stir').value.replace(/\D/g, ''),
        email:  $('#s-sot-email').value.trim(),
        manzil: $('#s-sot-manzil').value.trim(),
      },
      android_sha256: $('#s-android-sha').value.trim(),
      play_havola:    $('#s-play').value.trim(),
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
      <div class="xabar-quti izoh-quti">
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
      ${t.izoh ? `<p class="ozgina izoh" style="margin:4px 0 0">${esc(t.izoh)}</p>` : ''}
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
    const ai = j.yuklama?.ai || {};
    const rs = j.yuklama?.rasm || {};
    $('#tizim-tan').innerHTML = `
      <div class="xabar-quti ${xatolar.length ? 'xato' : 'ok'}">
        ${xatolar.length ? `⚠️ ${xatolar.length} ta muammo topildi` : '✅ Hammasi joyida'}</div>

      <!-- Yuklama: ilova sekinlashsa sabab shu yerda ko'rinadi -->
      <div class="kpi-tor">
        <div class="kpi${ai.navbatda > 20 ? ' urgu' : ''}">
          <div class="k">AI navbati</div><div class="v">${ai.navbatda ?? 0}</div>
          <div class="q">${ai.ishlayotgan ?? 0} ta ishlamoqda · ${ai.bir_vaqtda ?? 0} gacha</div></div>
        <div class="kpi"><div class="k">Daqiqada</div>
          <div class="v">${ai.qolgan_token ?? 0}<span class="q" style="font-size:13px">
            /${ai.daqiqada ?? 0}</span></div>
          <div class="q">qolgan chaqiruv</div></div>
        <div class="kpi${ai.pauza_qoldi ? ' urgu' : ''}"><div class="k">Pauza</div>
          <div class="v">${ai.pauza_qoldi ? ai.pauza_qoldi + ' s' : 'yo‘q'}</div>
          <div class="q">${ai.radEtilgan ?? 0} ta rad etilgan</div></div>
        <div class="kpi"><div class="k">Rasm keshi</div>
          <div class="v">${rs.foiz ?? 0}%</div>
          <div class="q">${rs.soni ?? 0} ta · ${rs.mb ?? 0}/${rs.chegara_mb ?? 0} MB</div></div>
      </div>
      <div id="model-quti"></div>
      <div id="eksport-quti"></div>
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
    aiModellar();
    eksportChiz();
  } catch (e) {
    $('#tizim-tan').innerHTML = `<div class="xabar-quti xato">${esc(e.message)}</div>`;
  }
}

// ─────────── MA'LUMOTNI YUKLAB OLISH ───────────
// Zaxira, buxgalteriya yoki oddiy tahlil uchun. Fayl serverda
// saqlanmaydi — to'g'ridan-to'g'ri brauzerga oqadi.
async function eksportChiz() {
  const el = $('#eksport-quti'); if (!el) return;
  let j;
  try { j = await api('/api/admin/eksport-hajmi'); } catch { return; }

  const NOM = { mahsulotlar: 'mahsulot', buyurtmalar: 'buyurtma', mijozlar: 'mijoz',
                tahlillar: 'tahlil', sharhlar: 'sharh', sozlamalar: 'sozlama' };
  el.innerHTML = `
    <div class="karta">
      <h3>💾 Ma’lumotni yuklab olish</h3>
      <p class="mayda" style="margin:6px 0 12px">Zaxira yoki tahlil uchun.
        Ichida <b>mijoz telefonlari</b> bor — begonaga bermang.</p>
      <div class="kpi-tor" style="margin-bottom:12px">
        ${Object.entries(j.hajm || {}).map(([k, v]) => `
          <div class="kpi"><div class="k">${esc(NOM[k] || k)}</div>
            <div class="v">${v}</div></div>`).join('')}
      </div>
      <button class="tug asos keng" id="t-eksport-json">Butun bazani JSON qilib olish</button>
      <button class="tug keng" id="t-eksport-mahsulot" style="margin-top:8px">
        Faqat mahsulotlarni JSON qilib olish</button>
      <p class="mayda" style="margin:14px 0 6px">Yoki bitta bo‘limni Excel uchun:</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(j.bolimlar || []).map((b) => `<button class="tug kichik"
          data-csv="${esc(b.kalit)}">${esc(b.nom)} · CSV</button>`).join('')}
      </div>
    </div>`;

  // Yuklab olish tokenli bo'lishi kerak — oddiy havola sarlavha
  // qo'sholmaydi, shuning uchun faylni fetch bilan olib, blob qilamiz
  const yukla = async (yol, nom) => {
    try {
      tost('Tayyorlanmoqda…');
      const r = await fetch(yol, { headers: { Authorization: `Bearer ${holat.token}` } });
      if (!r.ok) throw new Error('Yuklab bo‘lmadi');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nom;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      tost('Yuklandi');
    } catch (e) { tost(e.message, 'xato'); }
  };

  const sana = new Date().toISOString().slice(0, 10);
  $('#t-eksport-json').onclick = () =>
    yukla('/api/admin/eksport', `kiovo-baza-${sana}.json`);
  $('#t-eksport-mahsulot').onclick = () =>
    yukla('/api/admin/eksport?bolimlar=mahsulotlar', `kiovo-mahsulotlar-${sana}.json`);
  $$('[data-csv]').forEach((b) => b.onclick = () =>
    yukla(`/api/admin/eksport?tur=csv&bolimlar=${encodeURIComponent(b.dataset.csv)}`,
      `kiovo-${b.dataset.csv}-${sana}.csv`));
}

// ─────────── AI MODELLARI ───────────
// Google'da HAR MODELNING O'Z KVOTASI bor. Shuning uchun bu yerda
// bitta model emas, RO'YXAT tanlanadi: birinchisi asosiy, qolganlari
// zaxira. Asosiysi kunlik kvotasini tugatsa keyingisiga o'tiladi va
// skaner ishlashda davom etadi.
let mm = { modellar: [], rasm_model: '', tavsiya: [], holatlar: [], standart: true };

async function aiModellar() {
  try { mm = await api('/api/admin/ai-modellar'); } catch { return; }
  modelChiz();
}

function modelBelgi(nom) {
  const h = (mm.holatlar || []).find((x) => x.nom === nom);
  if (!h) return '';
  if (h.yoq) return `<span class="yor qizil">mavjud emas</span>`;
  if (!h.tayyor) {
    return `<span class="yor sariq">${h.sabab === 'kunlik' ? 'kunlik kvota'
      : Math.ceil(h.dam_qoldi / 60) + ' daq'}</span>`;
  }
  return `<span class="yor yashil">tayyor</span>`;
}

function modelChiz() {
  const qolgan = (mm.tavsiya || []).filter((t) => !mm.modellar.includes(t));
  $('#model-quti').innerHTML = `
    <div class="karta">
      <h3>🤖 AI modellari</h3>
      <p class="mayda" style="margin:6px 0 12px">
        Tartib muhim: <b>birinchisi asosiy</b>, qolganlari zaxira.
        Har modelning o‘z kunlik kvotasi bor — asosiysi tugasa
        keyingisiga o‘tiladi va skaner to‘xtamaydi.
        ${mm.standart ? '<br><i>Hozir standart ro‘yxat ishlayapti.</i>' : ''}
      </p>

      <div id="model-royxat">
        ${mm.modellar.map((m, i) => `
          <div style="display:flex;align-items:flex-start;gap:8px;
               padding:10px 0;border-bottom:1px solid var(--chiziq)">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-family:ui-monospace,monospace;
                   overflow-wrap:anywhere;line-height:1.35">
                <b style="font-family:inherit">${i + 1}.</b> ${esc(m)}</div>
              <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap">
                ${i === 0 ? '<span class="yor kok">asosiy</span>' : ''}${modelBelgi(m)}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="tug kichik" data-m-sina="${esc(m)}" title="Sinash">▶</button>
              <button class="tug kichik" data-m-yuq="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="tug kichik" data-m-past="${i}"
                ${i === mm.modellar.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="tug kichik xavf" data-m-ochir="${i}">✕</button>
            </div>
          </div>`).join('') || '<p class="mayda">Ro‘yxat bo‘sh — standart ishlatiladi.</p>'}
      </div>

      ${qolgan.length ? `<p class="mayda" style="margin:14px 0 6px">Qo‘shish:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${qolgan.map((t) => `<button class="tug kichik" data-m-qosh="${esc(t)}"
            style="white-space:nowrap">+ ${esc(t)}</button>`).join('')}
        </div>` : ''}

      <p class="mayda" style="margin:14px 0 6px">Yoki nomini qo‘lda yozing:</p>
      <div style="display:flex;gap:8px">
        <input id="m-yangi" placeholder="gemini-…" style="flex:1">
        <button class="tug" id="t-m-qosh">Qo‘shish</button>
      </div>

      <p class="mayda" style="margin:16px 0 6px">🎨 Rasm chizish modeli
        <i>(poster — alohida kvota)</i></p>
      <div style="display:flex;gap:8px">
        <input id="m-rasm" value="${esc(mm.rasm_model || '')}" placeholder="gemini-…" style="flex:1">
        <button class="tug" data-m-sina-rasm>▶</button>
      </div>

      <div id="m-natija"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="tug asos" id="t-m-saqla" style="flex:1">Saqlash</button>
        <button class="tug" id="t-m-tikla">Standartga qaytarish</button>
      </div>
    </div>`;

  const yangila = () => modelChiz();
  $$('[data-m-yuq]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.mYuq);
    [mm.modellar[i - 1], mm.modellar[i]] = [mm.modellar[i], mm.modellar[i - 1]];
    yangila();
  });
  $$('[data-m-past]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.mPast);
    [mm.modellar[i + 1], mm.modellar[i]] = [mm.modellar[i], mm.modellar[i + 1]];
    yangila();
  });
  $$('[data-m-ochir]').forEach((b) => b.onclick = () => {
    mm.modellar.splice(Number(b.dataset.mOchir), 1); yangila();
  });
  $$('[data-m-qosh]').forEach((b) => b.onclick = () => {
    mm.modellar.push(b.dataset.mQosh); yangila();
  });
  $$('[data-m-sina]').forEach((b) => b.onclick = () => modelSina(b.dataset.mSina));
  const rasmSina = $('[data-m-sina-rasm]');
  if (rasmSina) rasmSina.onclick = () => modelSina($('#m-rasm').value.trim());

  $('#t-m-qosh').onclick = () => {
    const v = $('#m-yangi').value.trim();
    if (!v) return;
    if (mm.modellar.includes(v)) return tost('Bu model allaqachon ro‘yxatda', 'xato');
    mm.modellar.push(v); yangila();
  };

  $('#t-m-saqla').onclick = async () => {
    try {
      mm = { ...mm, ...await api('/api/admin/ai-modellar', { method: 'POST',
        body: JSON.stringify({ modellar: mm.modellar, rasm_model: $('#m-rasm').value.trim() }) }) };
      tost('Modellar saqlandi'); modelChiz();
    } catch (e) { tost(e.message, 'xato'); }
  };

  $('#t-m-tikla').onclick = () => tasdiqla('Standartga qaytarilsinmi?',
    'Ro‘yxat koddagi standart holatga qaytadi.', async () => {
      try {
        await api('/api/admin/ai-modellar', { method: 'POST',
          body: JSON.stringify({ modellar: [], rasm_model: '' }) });
        modalYop(); tost('Standart ro‘yxat tiklandi'); aiModellar();
      } catch (e) { tost(e.message, 'xato'); }
    });
}

// Xato turkumini odam tiliga o'giramiz: «sorov» yoki «kvota_kunlik»
// admin uchun hech nima anglatmaydi.
const MODEL_XATO = {
  model:        'bunday model yo‘q yoki kalitga ruxsat berilmagan',
  kalit:        'API kalit noto‘g‘ri',
  kvota:        'daqiqalik kvota tugagan',
  kvota_kunlik: 'kunlik kvota tugagan',
  sorov:        'so‘rovni qabul qilmadi',
  vaqt:         'javob bermadi (vaqt tugadi)',
  tarmoq:       'ulanib bo‘lmadi',
};

/** Modelni HAQIQIY chaqiruv bilan sinaydi — nomi to'g'rimi, kvota bormi. */
async function modelSina(model) {
  if (!model) return;
  $('#m-natija').innerHTML = `<div class="xabar-quti" style="margin-top:12px">
    <span class="aylana"></span> <code>${esc(model)}</code> sinalmoqda…</div>`;
  try {
    const r = await api('/api/admin/ai-model-sinov', { method: 'POST',
      body: JSON.stringify({ model }) });
    $('#m-natija').innerHTML = r.ok
      ? `<div class="xabar-quti ok" style="margin-top:12px">
           ✅ <code>${esc(model)}</code> ishlayapti — ${r.ms} ms</div>`
      : `<div class="xabar-quti xato" style="margin-top:12px">
           ❌ <code>${esc(model)}</code> — <b>${esc(MODEL_XATO[r.turkum] || r.turkum || '')}</b>
           <div style="margin-top:6px;max-height:96px;overflow:auto;font-weight:400;
                font-size:12px;font-family:ui-monospace,monospace;opacity:.85;
                overflow-wrap:anywhere">${esc(r.xabar || '')}</div></div>`;
    aiModellarHolat();
  } catch (e) {
    $('#m-natija').innerHTML = `<div class="xabar-quti xato" style="margin-top:12px">
      ${esc(e.message)}</div>`;
  }
}

/** Sinovdan keyin holat belgilarini yangilaydi (ro'yxatni buzmasdan). */
async function aiModellarHolat() {
  try {
    const j = await api('/api/admin/ai-modellar');
    mm.holatlar = j.holatlar;
    $$('[data-m-sina]').forEach((b) => {
      const q = b.closest('.qator-satr')?.querySelector('.k');
      if (q) q.innerHTML = q.innerHTML.replace(/<span class="yor (yashil|sariq|qizil)">[^<]*<\/span>/,
        modelBelgi(b.dataset.mSina));
    });
  } catch { /* holat belgisi — muhim emas */ }
}


// ═══════════ ADMIN YORDAMCHISI ═══════════
// Savol yozasiz — u bazadan o'qib javob beradi. Topshiriqni bir necha
// qadamda bajaradi (avval qidiradi, keyin taklif qiladi).
//
// BAZANI O'ZGARTIRADIGAN amal HECH QACHON o'z-o'zidan bajarilmaydi:
// avval «shuni qilaman» degan taklif ko'rsatiladi, siz tasdiqlaysiz.
//
// Nega ALOHIDA EKRAN. Suhbat — uzun matn va o'sib boruvchi ro'yxat.
// Uni oddiy bo'lim ichida chizsak: sahifaning o'zi ham, xabarlar
// ro'yxati ham skroll bo'lib, klaviatura ochilganda ikkalasi bir-biriga
// xalaqit beradi va ekran «o'ynab» ketadi. Shuning uchun yordamchi
// butun ekranni egallaydi: SKROLL FAQAT BITTA joyda — xabarlar
// ro'yxatida, yozish paneli esa pastda qotib turadi.
//
// SUHBAT SAQLANMAYDI. Ekran yopilganda tozalanadi va hech qayerga
// yozilmaydi: bu ish quroli, yozishma emas. Ustiga suhbatda mijoz
// telefoni, buyurtma summasi kabi ma'lumot bo'ladi — uni brauzerda
// qoldirishning hojati yo'q.
// Biriktirilgan suratlar (bir xabarga 4 tagacha — undan ko'pi
// modelning e'tiborini suyultiradi va tokenni behuda yeydi)
let yordamchiRasmlar = [];

/** Faylni kichraytirib base64 qiladi — katta surat behuda token. */
function faylniOqi(fayl) {
  return new Promise((hal, rad) => {
    const o = new FileReader();
    o.onerror = () => rad(new Error('o‘qilmadi'));
    o.onload = () => {
      const img = new Image();
      img.onerror = () => rad(new Error('rasm emas'));
      img.onload = () => {
        // Eng uzun tomoni 900 px — model uchun yetarli, hajmi esa
        // bir necha barobar kichik
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        hal({ data: c.toDataURL('image/jpeg', 0.82), nom: fayl.name });
      };
      img.src = o.result;
    };
    o.readAsDataURL(fayl);
  });
}

function rasmlarniChiz() {
  const q = $('#y-rasmlar'); if (!q) return;
  q.hidden = !yordamchiRasmlar.length;
  q.innerHTML = yordamchiRasmlar.map((r, i) => `
    <div class="y-rasm"><img src="${r.data}" alt="">
      <button data-rasm-ochir="${i}" aria-label="O‘chirish">✕</button></div>`).join('');
  $$('[data-rasm-ochir]').forEach((b) => b.onclick = () => {
    yordamchiRasmlar.splice(Number(b.dataset.rasmOchir), 1); rasmlarniChiz();
  });
}

let yordamchiSuhbat = [];
let yordamchiBand = false;

// Bosh ekrandagi imkoniyatlar — har biri tayyor topshiriq
const YORDAMCHI_NAMUNA = [
  { ik: 'osish', nom: 'Hisobot', savol: 'Bu haftaning hisobotini o‘tgan hafta bilan solishtirib ber.' },
  { ik: 'quti', nom: 'Ombor', savol: 'Nima tugayapti va har biridan qancha buyurtma qilay?' },
  { ik: 'skaner', nom: 'Issiq lidlar', savol: 'Tahlil qilib sotib olmaganlar va savatini tashlab ketganlar kim?' },
  { ik: 'xat', nom: 'Xabar yozish', savol: 'Tahlil qilib sotib olmaganlarga shaxsiy xabar matnini yoz va yuborishni taklif qil.' },
  { ik: 'teg', nom: 'Aksiya', savol: 'Qaysi mahsulotlarga aksiya qilish foydali? Chegirma qo‘yishni taklif qil.' },
  { ik: 'hujjat', nom: 'Katalog auditi', savol: 'Katalog auditini qil va nimani birinchi tuzatishni ayt.' },
  { ik: 'yulduz', nom: 'Sharhlar', savol: 'Mijozlar sharhlarini tahlil qil: nima yoqadi, nima yoqmaydi?' },
  { ik: 'plyus', nom: 'Rasmdan mahsulot', savol: 'Biriktirgan rasmimdagi mahsulotni katalogga qo‘sh.' },
];

// Suhbat sahifa almashganda ham, yangilanganda ham saqlanadi (shu
// brauzer oynasida). «Yangi suhbat» — tozalaydi.
const AI_KALIT = 'qq_ai_suhbat';
function suhbatniSaqla() {
  try {
    sessionStorage.setItem(AI_KALIT, JSON.stringify(yordamchiSuhbat
      .filter((x) => x.kim !== 'kutish').slice(-40)
      .map((x) => ({ ...x, rasmlar: undefined, reja: x.reja ? { ...x.reja, eskirgan: true } : null }))));
  } catch { /* xotira to'lsa — saqlamaymiz */ }
}
function suhbatniOl() {
  try { return JSON.parse(sessionStorage.getItem(AI_KALIT) || '[]'); } catch { return []; }
}
const dokmi = () => matchMedia('(min-width: 1100px)').matches;

function yordamchiOch() {
  if ($('#y-ekran')) { $('#y-matn')?.focus(); return; }
  if (!yordamchiSuhbat.length) yordamchiSuhbat = suhbatniOl();
  const el = document.createElement('aside');
  el.id = 'y-ekran';
  el.className = 'y-ekran';
  el.setAttribute('aria-label', 'AI yordamchi');
  el.innerHTML = `
    <header class="y-tepa">
      <span class="y-belgi">${ik('ai', 20)}</span>
      <div class="y-nom"><b>AI yordamchi</b><span>Do‘koningiz ma’lumotlari bilan ishlaydi</span></div>
      <button class="y-ik" id="t-y-tozala" title="Yangi suhbat" aria-label="Yangi suhbat">${ik('plyus')}</button>
      <button class="y-ik" id="t-y-yop" title="Yopish" aria-label="Yopish">${ik('yop')}</button>
    </header>
    <div class="y-oqim" id="y-oqim"></div>
    <div class="y-rasmlar" id="y-rasmlar" hidden></div>
    <div class="y-yozish">
      <button class="y-biriktir" id="t-y-biriktir" aria-label="Rasm biriktirish">${ik('klip', 20)}</button>
      <textarea id="y-matn" rows="1" placeholder="Topshiriq yoki savol…" autocomplete="off"></textarea>
      <button class="y-yubor" id="t-y-yubor" aria-label="Yuborish">${ik('yubor', 20)}</button>
      <input id="y-fayl" type="file" accept="image/*" multiple hidden>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('y-ochiq');

  $('#t-y-yop').onclick = () => yordamchiYop();
  $('#t-y-tozala').onclick = () => {
    if (yordamchiBand) return;
    yordamchiSuhbat = []; yordamchiRasmlar = []; suhbatniSaqla(); rasmlarniChiz(); yordamchiChiz();
    $('#y-matn')?.focus();
  };
  $('#t-y-yubor').onclick = yordamchiYubor;
  $('#t-y-biriktir').onclick = () => $('#y-fayl').click();
  $('#y-fayl').onchange = async (e) => {
    // Rasmni base64 qilib olamiz. Model uni KO'RADI: «bu qanaqa
    // mahsulot», «shu skrinshotdagi narxni qo'y» kabi ishlar uchun.
    for (const f of [...(e.target.files || [])].slice(0, 4 - yordamchiRasmlar.length)) {
      try { yordamchiRasmlar.push(await faylniOqi(f)); }
      catch { tost('Rasm o‘qilmadi', 'xato'); }
    }
    e.target.value = '';
    rasmlarniChiz();
  };

  const m = $('#y-matn');
  m.oninput = () => {
    // Balandlikni O'ZI bo'yicha o'lchaymiz: avval nolga tushiramiz,
    // aks holda matn qisqarganda maydon kichraymaydi.
    m.style.height = 'auto';
    m.style.height = Math.min(132, m.scrollHeight) + 'px';
  };
  m.onkeydown = (e) => {
    // Enter — yuborish, Shift+Enter — yangi qator. Telefonda
    // klaviatura «yuborish» tugmasi ham shu yo'l bilan ishlaydi.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); yordamchiYubor(); }
    if (e.key === 'Escape') yordamchiYop();
  };

  // Telefonda panel butun ekran: «orqaga» uni yopsin, panelni emas.
  // Kompyuterda u yon panel — tarixga yozilmaydi.
  if (!dokmi()) {
    history.pushState({ yordamchi: true }, '');
    window.addEventListener('popstate', yordamchiOrqaga);
  }

  yordamchiChiz();
  pastga(true);
  if (dokmi()) m.focus();
}

function yordamchiOrqaga() { if ($('#y-ekran')) yordamchiYop(true); }

function yordamchiYop(orqadan = false) {
  const el = $('#y-ekran');
  if (!el) return;
  window.removeEventListener('popstate', yordamchiOrqaga);
  el.remove();
  document.body.classList.remove('y-ochiq');
  // Suhbat SAQLANADI — keyin ochilganda davom etadi
  suhbatniSaqla();
  yordamchiRasmlar = [];
  if (!orqadan && history.state?.yordamchi) history.back();
}

/** Skrollni pastga tushiradi — LEKIN faqat kerak bo'lsa. */
function pastga(majburiy = false) {
  const oqim = $('#y-oqim');
  if (!oqim) return;
  // Odam yuqoriga chiqib eski javobni o'qiyotgan bo'lsa uni pastga
  // tortib tashlamaymiz. «Yaqin» — 120 px.
  const yaqin = oqim.scrollHeight - oqim.scrollTop - oqim.clientHeight < 120;
  if (majburiy || yaqin) {
    requestAnimationFrame(() => { oqim.scrollTop = oqim.scrollHeight; });
  }
}

function yordamchiChiz() {
  const oqim = $('#y-oqim'); if (!oqim) return;
  const tozala = $('#t-y-tozala');
  if (tozala) tozala.hidden = !yordamchiSuhbat.length;

  if (!yordamchiSuhbat.length) {
    oqim.innerHTML = `
      <div class="y-bosh">
        <div class="y-halqa">${ik('ai', 28)}</div>
        <h2>Nima qilamiz?</h2>
        <p>Hisobot, xabar, aksiya, katalog — yozing, bajaraman. O‘zgarishni tasdiqlaganingizdan keyingina qilaman.</p>
        <div class="y-namunalar">
          ${YORDAMCHI_NAMUNA.map((x) => `<button data-y-namuna="${esc(x.savol)}">
            <span class="yn-ik">${ik(x.ik, 18)}</span><span>${esc(x.nom)}</span></button>`).join('')}
        </div>
      </div>`;
    namunalarniUla();
    return;
  }

  oqim.innerHTML = yordamchiSuhbat.map((x) => {
    if (x.kim === 'admin') {
      return `<div class="y-xabar y-men">
        ${(x.rasmlar || []).map((r) => `<img class="y-men-rasm" src="${r}" alt="">`).join('')}
        ${esc(x.matn)}</div>`;
    }
    if (x.kim === 'kutish') {
      // Jonli jarayon: agent AYNAN qaysi ish ustida ekani ko'rinadi
      const bajarilgan = x.qadamlar || [];
      return `<div class="y-xabar y-ai y-jarayon">
        <div class="y-jarayon-bosh">
          <i class="y-kutish"><span></span><span></span><span></span></i>
          <b>${esc(x.joriy || 'O‘ylayapti…')}</b>
        </div>
        ${bajarilgan.length ? `<div class="y-jarayon-oqim">
          ${bajarilgan.map((k) => `<div><code>${esc(k.vosita || '')}</code>
            ${esc(k.matn || '')}</div>`).join('')}
        </div>` : ''}
      </div>`;
    }
    return `
      <div class="y-xabar y-ai">
        ${matnHtml(x.matn)}
        ${(x.grafiklar || []).map(grafikHtml).join('')}
        ${(x.qadamlar || []).length ? `
          <details class="y-qadamlar">
            <summary>${x.qadamlar.length} ta qadam bajarildi</summary>
            ${x.qadamlar.map((k) => `<div>
              <code>${esc(k.vosita)}</code> ${esc(k.qisqa || '')}</div>`).join('')}
          </details>` : ''}
        ${x.reja && !x.reja.eskirgan ? rejaHtml(x.reja) : ''}
        ${x.reja?.eskirgan ? '<p class="y-eski">Bu taklifning muddati o‘tdi — kerak bo‘lsa qayta so‘rang.</p>' : ''}
      </div>
      ${(x.takliflar || []).length ? `
        <div class="y-takliflar">
          ${x.takliflar.map((t) => `<button data-y-namuna="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>` : ''}`;
  }).join('');

  namunalarniUla();
  $$('[data-y-tasdiq]').forEach((b) => b.onclick = () => rejaniTasdiqla(b.dataset.yTasdiq, b));
  $$('[data-y-bekor]').forEach((b) => b.onclick = () => {
    const x = yordamchiSuhbat.find((y) => y.reja?.token === b.dataset.yBekor);
    if (x) { x.reja = null; x.matn += '\n\n<i>Taklif bekor qilindi.</i>'; }
    yordamchiChiz();
  });
  pastga();
  suhbatniSaqla();
}

const namunalarniUla = () => $$('[data-y-namuna]').forEach((b) => b.onclick = () => {
  const m = $('#y-matn');
  m.value = b.dataset.yNamuna;
  // «Rasmdan mahsulot» — avval rasm kerak: tanlash oynasi ochiladi,
  // matn tayyor turadi, admin rasmni tanlab yuboradi
  if (/rasm/i.test(b.dataset.yNamuna) && !yordamchiRasmlar.length) {
    $('#y-fayl')?.click(); m.focus(); tost('Rasmni tanlang va yuboring');
    return;
  }
  yordamchiYubor();
});

/** Taklif kartasi — nima o'zgarishini ANIQ ko'rsatadi. */
function rejaHtml(r) {
  // Reja bir nechta qadamdan iborat bo'lishi mumkin: admin bir
  // xabarda uch ish so'rasa uchalasi ham shu yerda ko'rinadi va
  // BITTA tasdiq bilan bajariladi.
  const qadamlar = r.qadamlar || [{ vosita: r.vosita, izoh: r.izoh, soni: r.soni }];
  return `
    <div class="y-reja ${r.qaytarib_bolmaydi ? 'xavf' : ''}">
      <div class="y-reja-bosh">
        ${r.qaytarib_bolmaydi ? '⚠️ Qaytarib bo‘lmaydi' : '✋ Tasdiq kerak'}
        ${qadamlar.length > 1 ? ` · ${qadamlar.length} ta amal` : ''}</div>
      ${qadamlar.map((q, i) => `
        <div class="y-reja-qadam">
          ${qadamlar.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(q.izoh || q.vosita)}
          <div class="y-reja-tafsil">
            <code>${esc(q.vosita)}</code>
            <span>${q.soni == null ? 'nechta ekani noma’lum' : `${q.soni} ta yozuv`}</span>
            ${q.qaytarib_bolmaydi ? '<span class="yor qizil">qaytmas</span>' : ''}
          </div>
        </div>`).join('')}
      <div class="y-reja-tugma">
        <button class="tug ${r.qaytarib_bolmaydi ? 'xavf' : 'asos'}"
          data-y-tasdiq="${esc(r.token)}">Tasdiqlash</button>
        <button class="tug" data-y-bekor="${esc(r.token)}">Bekor</button>
      </div>
    </div>`;
}

/** Oddiy matn belgilarini HTML ga: **qalin**, "• " ro'yxat, "## " sarlavha. */
function matnHtml(matn) {
  return String(matn || '').split('\n').map((q) => {
    const xom = q.trim();
    if (!xom) return '';
    // <i> va <b> teglari faqat BIZ qo'shganimiz (bekor qilindi,
    // bajarildi kabi) — ular esc dan keyin tiklanadi, model matni esa
    // ekranlangan qoladi. Ilgari faqat <i> tiklanardi va bizning
    // «<b>0</b> ta yozuv» xom matn bo'lib ko'rinardi.
    const s = esc(xom).replace(/&lt;(\/?[ib])&gt;/g, '<$1>');
    const qalin = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (/^##\s/.test(xom)) return `<h4>${qalin.replace(/^##\s/, '')}</h4>`;
    if (/^[•·-]\s/.test(xom)) return `<div class="y-band">${qalin.replace(/^[•·-]\s/, '')}</div>`;
    if (/^\d+\.\s/.test(xom)) return `<div class="y-band y-raqam">${qalin}</div>`;
    return `<p>${qalin}</p>`;
  }).join('');
}

// ═══════════ AGENT GRAFIKLARI ═══════════
// Yordamchi raqamlarni chizib ham ko'rsatadi. Uch shakl yetarli:
//   ustun  — taqqoslash (qaysi bo'lim ko'p sotildi)
//   chiziq — vaqt bo'yicha o'zgarish (oylik savdo)
//   halqa  — ulush (buyurtmalar holati bo'yicha)
// Har grafik ostida JADVAL ham bor: rang ko'rmaydigan yoki
// aniq raqam kerak bo'lgan odam uni ochib o'qiydi.

// Ranglar SINALGAN to'plamdan: qo'shni bo'laklar rang ko'rmaslikda
// ham ajralib turadi. Ketma-ketlik O'ZGARMAYDI — 3-bo'lak har doim
// uchinchi rangda.
const G_RANG = 6;                       // undan ortig'i «Boshqa» ga yig'iladi

const gRaqam = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('ru-RU') : String(x);
};

function grafikHtml(g) {
  if (!g || !Array.isArray(g.qatorlar) || g.qatorlar.length < 2) return '';
  const q = g.qatorlar.map((x) => ({ nom: String(x.nom || ''), qiymat: Number(x.qiymat) || 0 }));
  const birlik = g.birlik ? ` ${esc(g.birlik)}` : '';
  const ichi = g.tur === 'halqa' ? gHalqa(q, birlik)
             : g.tur === 'chiziq' ? gChiziq(q, birlik)
             : gUstun(q, birlik);
  return `<figure class="y-grafik">
    ${g.sarlavha ? `<figcaption>${esc(g.sarlavha)}</figcaption>` : ''}
    ${ichi}
    <details class="g-jadval"><summary>Jadval ko‘rinishi</summary>
      <table>${q.map((x) => `<tr><th>${esc(x.nom)}</th>
        <td>${gRaqam(x.qiymat)}${birlik}</td></tr>`).join('')}</table>
    </details>
  </figure>`;
}

/** Yotiq ustunlar. Nom uzun bo'lsa ham to'qnashmaydi. */
function gUstun(q, birlik) {
  const maks = Math.max(0, ...q.map((x) => x.qiymat));
  const min  = Math.min(0, ...q.map((x) => x.qiymat));
  const en   = (maks - min) || 1;
  const nol  = ((0 - min) / en) * 100;
  return `<div class="g-ustun">
    ${q.map((x) => {
      const p = ((x.qiymat - min) / en) * 100;
      const chap = Math.min(nol, p);
      const kn = Math.max(Math.abs(p - nol), 0.6);   // 0 ham ko'rinsin
      return `<div class="g-qator">
        <span class="g-nom">${esc(x.nom)}</span>
        <span class="g-yol"><i class="${x.qiymat < 0 ? 'manfiy' : ''}"
          style="left:${chap.toFixed(2)}%;width:${kn.toFixed(2)}%"></i></span>
        <b class="g-son">${gRaqam(x.qiymat)}${birlik}</b>
      </div>`;
    }).join('')}
  </div>`;
}

/** Vaqt bo'yicha chiziq. Faqat birinchi va oxirgi nuqta belgilanadi. */
function gChiziq(q, birlik) {
  const V = q.map((x) => x.qiymat);
  const maks = Math.max(...V);
  const min  = Math.min(...V);
  const farq = (maks - min) || 1;
  const W = 320, H = 120, P = 14, PAST = 8;      // PAST — o'q chizig'iga bo'sh joy
  const x = (i) => P + (i * (W - P * 2)) / (q.length - 1);
  const y = (v) => H - P - PAST - ((v - min) / farq) * (H - P * 2 - PAST);
  const nuqtalar = q.map((s, i) => `${x(i).toFixed(1)},${y(s.qiymat).toFixed(1)}`).join(' ');
  const oxir = q.length - 1;
  const belgi = q.length <= 12
    ? q.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(s.qiymat).toFixed(1)}"
        r="4" class="g-nuqta"/>`).join('')
    : '';
  // Yorliq chiziqning USTIGA tushib qolmasin: nuqta qo'shnisidan
  // pastda bo'lsa yorliq ham pastga yoziladi
  const yorliqY = (i, qoshni) => (V[i] >= V[qoshni] ? y(V[i]) - 9 : y(V[i]) + 15).toFixed(1);
  return `<svg class="g-chiziq" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(q[0].nom)} dan ${esc(q[oxir].nom)} gacha">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="g-oq"/>
    <polyline points="${nuqtalar}" class="g-yoy"/>
    ${belgi}
    <text x="${P}" y="${yorliqY(0, 1)}" class="g-yorliq">${gRaqam(V[0])}</text>
    <text x="${W - P}" y="${yorliqY(oxir, oxir - 1)}" text-anchor="end"
      class="g-yorliq">${gRaqam(V[oxir])}${birlik}</text>
  </svg>
  <div class="g-oralik"><span>${esc(q[0].nom)}</span><span>${esc(q[oxir].nom)}</span></div>`;
}

/** Ulush halqasi. Nomi va foizi YOZILADI — faqat rangga tayanmaydi. */
function gHalqa(qatorlar, birlik) {
  const tartib = [...qatorlar].sort((a, b) => b.qiymat - a.qiymat);
  const q = tartib.slice(0, G_RANG);
  const qolgan = tartib.slice(G_RANG);
  if (qolgan.length) {
    q.push({ nom: 'Boshqa', qiymat: qolgan.reduce((s, x) => s + x.qiymat, 0) });
  }
  const jami = q.reduce((s, x) => s + x.qiymat, 0) || 1;

  const R = 54, C = 2 * Math.PI * R;
  let siljish = 0;
  const bolaklar = q.map((x, i) => {
    const uzunlik = Math.max((x.qiymat / jami) * C - 2, 0);   // 2px oraliq
    const s = `<circle cx="70" cy="70" r="${R}" class="g-bolak r${i}"
      stroke-dasharray="${uzunlik.toFixed(2)} ${(C - uzunlik).toFixed(2)}"
      stroke-dashoffset="${(-siljish).toFixed(2)}"/>`;
    siljish += (x.qiymat / jami) * C;
    return s;
  }).join('');

  return `<div class="g-halqa">
    <svg viewBox="0 0 140 140" role="img" aria-label="Ulushlar">
      <g transform="rotate(-90 70 70)">${bolaklar}</g>
    </svg>
    <ul class="g-izoh">
      ${q.map((x, i) => `<li><i class="r${i}"></i>
        <span>${esc(x.nom)}</span>
        <b>${gRaqam(x.qiymat)}${birlik} · ${Math.round((x.qiymat / jami) * 100)}%</b>
      </li>`).join('')}
    </ul>
  </div>`;
}

async function yordamchiYubor() {
  if (yordamchiBand) return;
  const m = $('#y-matn');
  const savol = (m?.value || '').trim();
  if (savol.length < 2) return;

  yordamchiBand = true;
  m.value = ''; m.style.height = 'auto';
  $('#t-y-yubor').disabled = true;

  // Tarixga faqat matn ketadi — qadamlar va rejalar modelga kerak emas
  const tarix = yordamchiSuhbat.filter((x) => x.matn)
    .map((x) => ({ kim: x.kim === 'admin' ? 'admin' : 'ai', matn: x.matn }));
  const rasmlar = yordamchiRasmlar.map((r) => r.data);
  yordamchiSuhbat.push({ kim: 'admin', matn: savol, rasmlar });
  yordamchiRasmlar = []; rasmlarniChiz();
  yordamchiSuhbat.push({ kim: 'kutish' });
  yordamchiChiz();
  pastga(true);            // o'z savolini albatta ko'rsin

  try {
    // Agent orqada ishlaydi: so'rov darrov ish raqamini qaytaradi,
    // biz esa holatini so'rab turib jarayonni jonli ko'rsatamiz.
    const { ish } = await api('/api/admin/agent', { method: 'POST',
      body: JSON.stringify({ savol, tarix, rasmlar, bolim: BOLIMLAR[holat.bolim]?.nom || '' }) });
    const j = await agentniKuzat(ish);
    yordamchiSuhbat.pop();
    yordamchiSuhbat.push({ kim: 'ai', matn: j.javob, qadamlar: j.qadamlar,
      grafiklar: j.grafiklar || [],
      reja: j.reja || null, takliflar: j.takliflar || [] });
  } catch (e) {
    yordamchiSuhbat.pop();
    yordamchiSuhbat.push({ kim: 'ai', matn: e.message });
  } finally {
    yordamchiBand = false;
    const t = $('#t-y-yubor'); if (t) t.disabled = false;
    yordamchiChiz();
  }
}

/**
 * Fon ishini kuzatadi: har yarim soniyada holatini so'raydi va
 * kutish pufagini yangilaydi. Natija tayyor bo'lganda qaytaradi.
 */
async function agentniKuzat(ish) {
  const boshlandi = Date.now();
  const kutish = yordamchiSuhbat[yordamchiSuhbat.length - 1];
  for (;;) {
    await uxla(600);
    if (Date.now() - boshlandi > 6 * 60_000) {
      throw new Error('Juda uzoq davom etdi — qaytadan urinib ko‘ring.');
    }
    let h;
    try {
      h = await api(`/api/admin/agent-holat?ish=${encodeURIComponent(ish)}`);
    } catch (e) {
      // Tarmoq uzilishi — qayta so'raymiz; ish yo'qolgan bo'lsagina to'xtaymiz
      if (/topilmadi/i.test(e.message)) throw e;
      continue;
    }
    if (h.holat === 'ishlamoqda') {
      if (kutish && kutish.kim === 'kutish') {
        kutish.joriy = h.joriy?.matn || 'O‘ylayapti…';
        kutish.qadamlar = h.qadamlar || [];
        yordamchiChiz();
      }
      continue;
    }
    if (h.holat === 'xato') throw new Error(h.xato || 'Xatolik yuz berdi.');
    return h.natija || { javob: 'Javob bo‘sh qaytdi.' };
  }
}

const uxla = (ms) => new Promise((r) => setTimeout(r, ms));

async function rejaniTasdiqla(token, tugma) {
  tugma.disabled = true; tugma.textContent = 'Bajarilmoqda…';
  try {
    const j = await api('/api/admin/agent-tasdiq', { method: 'POST',
      body: JSON.stringify({ token }) });
    const x = yordamchiSuhbat.find((y) => y.reja?.token === token);
    if (x) {
      x.reja = null;
      // NATIJA ko'rsatiladi, da'vo emas: nechta yozuv haqiqatan
      // o'zgardi va qaysi qadam yiqildi
      const qadamlar = j.qadamlar || [];
      const yiqilgan = qadamlar.filter((q) => !q.ok);
      const soni = j.ozgardi ?? 0;

      // Vosita natijasida IZOH yoki HAVOLA bo'lsa ular ham
      // ko'rsatiladi. Ilgari ular yo'qolib ketardi: kartochka
      // shabloni saqlanib, ko'rinish havolasi qaytardi, lekin admin
      // uni umuman ko'rmasdi va «ish bo'lmadi» deb o'ylardi.
      const foydali = qadamlar.filter((q) => q.ok).map((q) => {
        const n = q.natija || {};
        const izoh = n.natija || n.xabar || '';
        const havola = n.korinish || n.havola || '';
        if (!izoh && !havola) return '';
        return `• <b>${q.vosita}</b>${izoh ? ` — ${izoh}` : ''}`
          + (havola ? `\n  <a href="${havola}" target="_blank" rel="noopener">${havola}</a>` : '');
      }).filter(Boolean);

      x.matn = `${x.matn}\n\n`
        + (soni
          ? `✅ Bajarildi — <b>${soni}</b> ta o‘zgarish.`
          : `⚠️ Hech narsa o‘zgarmadi.`)
        + (foydali.length ? `\n\n${foydali.join('\n')}` : '')
        + (yiqilgan.length
          ? `\n\nBajarilmagan amallar:\n`
            + yiqilgan.map((q) => `• <b>${q.vosita}</b> — ${q.xato}`).join('\n')
          : '');
    }
    tost(j.ozgardi ? `Bajarildi — ${j.ozgardi} ta o‘zgarish`
                   : 'Hech narsa o‘zgarmadi', j.ozgardi ? '' : 'xato');
    holat.kesh = {};          // katalog o'zgargan bo'lishi mumkin
    yordamchiChiz();
  } catch (e) {
    tost(e.message, 'xato');
    tugma.disabled = false; tugma.textContent = 'Tasdiqlash';
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
