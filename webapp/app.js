// QoraQosh — Mini App mantiqi.
// Katalog + qidiruv, savat (localStorage), buyurtma (@sarvar_gpt ga oʻtish),
// profil boʻlimida AI yuz tahlili natijasi.

// ==================== SOZLAMALAR ====================
const OWNER_TG = 'sarvar_gpt'; // buyurtma shu chatga tushadi
const TEG_NOM = {
  quruq: 'Quruq teri', yogli: "Yog'li teri", sezgir: 'Sezgir teri',
  husnbuzar: 'Husnbuzar', dog: 'Dogʻ va izlar', ajin: 'Ajinlar',
  quyuq: "Qo'ng'ir dog'lar", namlash: 'Namlash', tozalash: 'Chuqur tozalash',
  quyosh: 'SPF himoya', yallig: 'Yalligʻlanish', ton: 'Tenni tekislash',
};

// ==================== TELEGRAM WEBAPP ====================
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor('#0c0c0f');
    tg.setBackgroundColor('#0c0c0f');
  } catch {}
}

// ==================== HOLAT ====================
let KATALOG = [];      // mahsulotlar massivi
let KATEGORIYALAR = [];
let aktivKat = 'hammasi';
let qidiruvMatn = '';
let savat = {};        // { mahsulot_id: soni }
let tahlil = null;     // profil uchun AI natijasi

// ==================== YORDAMCHI ====================
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const narxFmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// Foydalanuvchi ID: Telegram WebApp dan yoki ?u= parametrdan
function userIdTop() {
  const u = new URLSearchParams(location.search).get('u');
  return tg?.initDataUnsafe?.user?.id || u || '';
}

// ==================== SAVAT (localStorage) ====================
function savatSaqla() {
  localStorage.setItem('qq_savat', JSON.stringify(savat));
}
function savatOqi() {
  try { savat = JSON.parse(localStorage.getItem('qq_savat')) || {}; } catch { savat = {}; }
}
function savatSoni() {
  return Object.values(savat).reduce((s, n) => s + n, 0);
}
function savatJami() {
  return Object.entries(savat).reduce((s, [id, n]) => {
    const m = KATALOG.find((x) => x.id === Number(id));
    return s + (m ? m.narx * n : 0);
  }, 0);
}
function savatgaQosh(id, soni = 1) {
  savat[id] = (savat[id] || 0) + soni;
  savatSaqla();
  badgeYangila();
}
function savatdanOlib(id) {
  if (!savat[id]) return;
  savat[id]--;
  if (savat[id] <= 0) delete savat[id];
  savatSaqla();
  badgeYangila();
}

function badgeYangila() {
  const n = savatSoni();
  const b = $('cartBadge');
  b.hidden = n === 0;
  b.textContent = n;
}

// ==================== MAʼLUMOTNI OLISH ====================
async function katalogniOlish() {
  // Avval oʻrnatilgan maʼlumotlar bilan toʻldiramiz (darhol koʻrinishi uchun)
  if (window.QORAQOSH_DATA) {
    KATEGORIYALAR = window.QORAQOSH_DATA.kategoriyalar || [];
    KATALOG = window.QORAQOSH_DATA.mahsulotlar || [];
  }

  // Keyin serverdagi eng soʻnggi narxlar/mahsulotlarni yangilaymiz
  try {
    const r = await fetch('/api/products');
    if (r.ok) {
      const d = await r.json();
      if (d.kategoriya?.length) KATEGORIYALAR = d.kategoriya;
      if (d.mahsulotlar?.length) KATALOG = d.mahsulotlar;
    }
  } catch {}
}

async function tahlilniOlish() {
  const uid = userIdTop();
  if (!uid) return null;
  try {
    const r = await fetch(`/api/analysis/${uid}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ==================== CHIZISH: DOʻKON ====================
function chiplarChiz() {
  $('chips').innerHTML = KATEGORIYALAR.map((k) =>
    `<button class="chip ${k.id === aktivKat ? 'active' : ''}" data-kat="${k.id}">${k.emoji} ${esc(k.nom)}</button>`
  ).join('');
}

function kartochka(m) {
  const grad = `linear-gradient(135deg, ${m.grad?.[0] || '#1a1a21'}, ${m.grad?.[1] || '#22222b'})`;
  return `
  <div class="card" data-id="${m.id}">
    <div class="card-img" style="background:${grad}">
      ${m.emoji || '🧴'}
      <span class="card-tag">${esc(m.brend)}</span>
    </div>
    <div class="card-body">
      <div class="card-name">${esc(m.nom)}</div>
      <div class="card-row">
        <span class="card-price">${narxFmt(m.narx)}</span>
        <button class="add-btn" data-add="${m.id}" aria-label="Savatga qo'shish">+</button>
      </div>
    </div>
  </div>`;
}

function gridChiz() {
  const q = qidiruvMatn.trim().toLowerCase();
  let roy = KATALOG.filter((m) =>
    (aktivKat === 'hammasi' || m.kategoriya === aktivKat) &&
    (!q || m.nom.toLowerCase().includes(q) || m.brend.toLowerCase().includes(q))
  );
  $('grid').innerHTML = roy.map(kartochka).join('');
  $('emptyShop').hidden = roy.length > 0;
}

// ==================== CHIZISH: SAVAT ====================
function savatChiz() {
  const ids = Object.keys(savat);
  $('emptyCart').hidden = ids.length > 0;
  $('cartFooter').hidden = ids.length === 0;
  if (!ids.length) { $('cartList').innerHTML = ''; return; }

  $('cartList').innerHTML = ids.map((id) => {
    const m = KATALOG.find((x) => x.id === Number(id));
    if (!m) return '';
    const grad = `linear-gradient(135deg, ${m.grad?.[0] || '#1a1a21'}, ${m.grad?.[1] || '#22222b'})`;
    return `
    <div class="cart-item">
      <div class="cart-thumb" style="background:${grad}">${m.emoji || '🧴'}</div>
      <div class="cart-info">
        <div class="cart-name">${esc(m.nom)}</div>
        <div class="cart-price">${narxFmt(m.narx)} × ${savat[id]}</div>
      </div>
      <div class="qty">
        <button data-minus="${id}">−</button>
        <span>${savat[id]}</span>
        <button data-plus="${id}">+</button>
      </div>
    </div>`;
  }).join('');

  $('cartTotal').textContent = narxFmt(savatJami());
}

// Buyurtma matnini tuzib, @sarvar_gpt chatiga oʻtadi (text param).
function buyurtmaBer() {
  const ids = Object.keys(savat);
  if (!ids.length) return;
  let t = `🛍️ *QoraQosh — buyurtma*\n\n`;
  ids.forEach((id, i) => {
    const m = KATALOG.find((x) => x.id === Number(id));
    if (!m) return;
    t += `${i + 1}) ${m.emoji} ${m.nom} (${m.brend})\n   ${savat[id]} dona × ${narxFmt(m.narx)} = ${narxFmt(m.narx * savat[id])}\n`;
  });
  t += `\n💰 Jami: ${narxFmt(savatJami())}`;
  t += `\n🚚 Yetkazish: 7–14 kun`;
  const link = `https://t.me/${OWNER_TG}?text=${encodeURIComponent(t)}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(link);
  else window.open(link, '_blank');
}

// ==================== CHIZISH: PROFIL ====================
function profilChiz() {
  const box = $('profileBox');
  const user = tg?.initDataUnsafe?.user;

  if (!tahlil) {
    box.innerHTML = `
      <div class="profile-card">
        <div class="profile-title">👤 Profil</div>
        ${user ? `<div class="p-row"><span class="k">Ism</span><span class="v">${esc(user.first_name || '')}</span></div>` : ''}
        <div class="empty" style="padding:30px 10px">
          <div class="empty-ico">📸</div>
          Yuz tahlili hali yoʻq<br />
          <span class="muted">Botga yuz rasmingizni yuboring — AI tahlil qilib beradi</span>
        </div>
      </div>`;
    return;
  }

  const a = tahlil;
  const sana = a.sana ? new Date(a.sana).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const tavsiyalar = (a.tavsiya || [])
    .map((id) => KATALOG.find((m) => m.id === Number(id)))
    .filter(Boolean);

  box.innerHTML = `
    <div class="profile-card">
      <div class="profile-title">🔍 Yuz tahlili natijasi</div>
      <div class="p-row"><span class="k">Taxminiy yosh</span><span class="v">${esc(a.yosh)}</span></div>
      <div class="p-row"><span class="k">Teri turi</span><span class="v">${esc(a.teri_turi)}</span></div>
      ${a.namunaviy ? `<div class="p-date">⚠️ Namunaviy tahlil (AI ulanmagan)</div>` : ''}
    </div>

    <div class="profile-card">
      <div class="profile-title">⚠️ Yuzdagi muammolar</div>
      <ul class="p-list">${(a.muammolar || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    </div>

    <div class="profile-card">
      <div class="profile-title">💡 Maslahatlar</div>
      <ul class="p-list">${(a.maslahat || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    </div>

    ${tavsiyalar.length ? `
    <div class="profile-card">
      <div class="profile-title">🛍️ Tavsiya mahsulotlar</div>
      ${tavsiyalar.map((m) => `<span class="rec-chip" data-id="${m.id}">${m.emoji} ${esc(m.nom)}</span>`).join('')}
    </div>` : ''}

    ${sana ? `<div class="p-date">Tahlil sanasi: ${sana}</div>` : ''}
  `;
}

// ==================== MODAL ====================
function modalOch(id) {
  const m = KATALOG.find((x) => x.id === Number(id));
  if (!m) return;
  const grad = `linear-gradient(135deg, ${m.grad?.[0] || '#1a1a21'}, ${m.grad?.[1] || '#22222b'})`;
  const kat = KATEGORIYALAR.find((k) => k.id === m.kategoriya);
  $('modalCard').innerHTML = `
    <div class="modal-hero" style="background:${grad}">${m.emoji || '🧴'}</div>
    <div class="modal-brand">${esc(m.brend)}</div>
    <div class="modal-name">${esc(m.nom)}</div>
    <div class="modal-price">${narxFmt(m.narx)}</div>
    <div class="modal-tags">
      ${kat ? `<span class="modal-tag">${kat.emoji} ${esc(kat.nom)}</span>` : ''}
      ${(m.teg || []).map((t) => `<span class="modal-tag">${esc(TEG_NOM[t] || t)}</span>`).join('')}
    </div>
    <button class="btn btn-primary" data-add="${m.id}">🛒 Savatga qoʻshish</button>
  `;
  $('modal').classList.add('open');
}
function modalYop() {
  $('modal').classList.remove('open');
}

// ==================== SAHIFALAR ====================
function sahifaOch(nom) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  $(`page-${nom}`).classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.page === nom));
  // Doʻkondan boshqa sahifada qidiruv va chiplarni yashiramiz
  const dokon = nom === 'shop';
  $('searchWrap').style.display = dokon ? '' : 'none';
  $('chips').style.display = dokon ? '' : 'none';
  if (nom === 'cart') savatChiz();
  if (nom === 'profile') profilYangila();
}

async function profilYangila() {
  tahlil = await tahlilniOlish();
  profilChiz();
}

// ==================== HODISALAR ====================
function hodisalarniUla() {
  // Pastki navigatsiya
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => sahifaOch(t.dataset.page))
  );

  // Qidiruv
  $('search').addEventListener('input', (e) => {
    qidiruvMatn = e.target.value;
    gridChiz();
  });

  // Kategoriya chiplari
  $('chips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    aktivKat = c.dataset.kat;
    chiplarChiz();
    gridChiz();
  });

  // Kartochka bosilsa modal, + bosilsa savatga
  $('grid').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      savatgaQosh(Number(add.dataset.add));
      toast('🛒 Savatga qoʻshildi');
      return;
    }
    const card = e.target.closest('.card');
    if (card) modalOch(card.dataset.id);
  });

  // Savat +/−
  $('cartList').addEventListener('click', (e) => {
    const plus = e.target.closest('[data-plus]');
    const minus = e.target.closest('[data-minus]');
    if (plus) { savatgaQosh(Number(plus.dataset.plus)); savatChiz(); }
    if (minus) { savatdanOlib(Number(minus.dataset.minus)); savatChiz(); }
  });

  // Buyurtma
  $('orderBtn').addEventListener('click', buyurtmaBer);

  // Modal
  $('modalBack').addEventListener('click', modalYop);
  $('modalCard').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      savatgaQosh(Number(add.dataset.add));
      toast('🛒 Savatga qoʻshildi');
      modalYop();
    }
  });

  // Profildagi tavsiya chip bosilsa — modal
  $('profileBox').addEventListener('click', (e) => {
    const chip = e.target.closest('.rec-chip');
    if (chip) modalOch(chip.dataset.id);
  });
}

// ==================== TAVSIYALARNI SAVATGA QOʻSHISH ====================
// Bot tugmasi orqali ochilganda: tahlildagi tavsiyalar savatga avtomatik qoʻshiladi.
async function tavsiyalarniQosh() {
  const a = await tahlilniOlish();
  tahlil = a;
  if (!a?.tavsiya?.length) return;
  const kalit = `qq_tav_${userIdTop()}_${(a.sana || '').slice(0, 10)}`;
  if (localStorage.getItem(kalit)) return; // bir marta qoʻshilgan
  let qoshildi = 0;
  a.tavsiya.forEach((id) => {
    if (!savat[id] && KATALOG.some((m) => m.id === Number(id))) {
      savat[id] = 1;
      qoshildi++;
    }
  });
  if (qoshildi) {
    savatSaqla();
    badgeYangila();
    toast(`✨ ${qoshildi} ta tavsiya savatga qoʻshildi`);
  }
  localStorage.setItem(kalit, '1');
}

// ==================== ISHGA TUSHIRISH ====================
async function start() {
  savatOqi();
  await katalogniOlish();
  chiplarChiz();
  gridChiz();
  badgeYangila();
  hodisalarniUla();
  await tavsiyalarniQosh();
}

start();
