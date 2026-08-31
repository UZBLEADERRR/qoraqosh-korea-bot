// QoraQosh Mini App — frontend mantiqi
// Katalog serverdan olinadi (/api/products), ishlamasa fallback (products-data.js) ishlatiladi.

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

const FALLBACK = window.FALLBACK_DATA || { kategoriya: [], mahsulotlar: [] };

let MAHSULOTLAR = [...FALLBACK.mahsulotlar];
let savat = {};
try { savat = JSON.parse(localStorage.getItem('qoraqosh_savat') || '{}'); } catch { savat = {}; }
let tahlil = null;
let joriyKat = 'hammasi';
let joriyTab = 'katalog';
let qidiruv = '';

const esc = (str) => String(str ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const narxFmt = (n) => Number(n).toLocaleString('uz-UZ') + " so'm";

function gradCss(p) {
  if (Array.isArray(p.grad) && p.grad.length >= 2 && p.grad.every(c => /^#[0-9a-fA-F]{3,8}$/.test(c))) {
    return `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`;
  }
  return 'linear-gradient(135deg, #1c1c1e, #2c2c2e)';
}

function savatSaqlash() {
  localStorage.setItem('qoraqosh_savat', JSON.stringify(savat));
  badgeYangila();
}

function savatniTozala() {
  let ozgardi = false;
  for (const id of Object.keys(savat)) {
    if (!MAHSULOTLAR.some(p => p.id == id)) { delete savat[id]; ozgardi = true; }
  }
  if (ozgardi) savatSaqlash();
}

function badgeYangila() {
  const n = Object.values(savat).reduce((a, b) => a + b, 0);
  const b = document.getElementById('cart-badge');
  if (!b) return;
  b.textContent = n;
  b.hidden = n === 0;
}

async function katalogniOlish() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) MAHSULOTLAR = data;
  } catch (e) {
    console.warn('Katalog API dan yuklanmadi, fallback ishlatilmoqda:', e.message);
  }
}

async function tahlilniOlish() {
  const userId = tg?.initDataUnsafe?.user?.id;
  if (!userId) return;
  try {
    const res = await fetch(`/api/analysis/${userId}`, {
      headers: { 'x-tg-init-data': tg.initData || '' }
    });
    if (!res.ok) return;
    tahlil = await res.json();
    tahlilChiz();

    const params = new URLSearchParams(window.location.search);
    if (params.get('start') === 'tahlil') tavsiyalarniSavatgaQoshish();
  } catch (e) { console.warn('Tahlil olishda xato:', e.message); }
}

function tavsiyalarniSavatgaQoshish() {
  if (!tahlil) return;
  const kalit = String(tahlil.vaqt || '');
  if (!kalit || localStorage.getItem('oxirgi_tavsiya') === kalit) return;

  const teglari = Array.isArray(tahlil.teg) ? tahlil.teg : [];
  const mos = MAHSULOTLAR
    .map(p => ({ ...p, b: (p.teg || []).filter(t => teglari.includes(t)).length }))
    .filter(p => p.b > 0)
    .sort((a, b) => b.b - a.b)
    .slice(0, 3);

  if (mos.length === 0) return;
  mos.forEach(p => { if (!savat[p.id]) savat[p.id] = 1; });
  savatSaqlash();
  localStorage.setItem('oxirgi_tavsiya', kalit);
  if (tg?.showAlert) tg.showAlert("Sizga mos mahsulotlar savatga qo'shildi! ✨");
}

function katChiz() {
  const box = document.getElementById('categories');
  if (!box) return;
  box.innerHTML = FALLBACK.kategoriya.map(k =>
    `<button class="cat-btn${k.id === joriyKat ? ' active' : ''}" data-kat="${esc(k.id)}">${esc(k.nom)}</button>`
  ).join('');
  box.querySelectorAll('.cat-btn').forEach(b => {
    b.addEventListener('click', () => katOzgardi(b.dataset.kat));
  });
}

function gridChiz() {
  const container = document.getElementById('product-grid');
  if (!container) return;

  const q = qidiruv.trim().toLowerCase();
  const filtr = MAHSULOTLAR.filter(p =>
    (joriyKat === 'hammasi' || p.kategoriya === joriyKat) &&
    (!q || (p.nom || '').toLowerCase().includes(q) || (p.brend || '').toLowerCase().includes(q)));

  if (filtr.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;padding:30px 0;">Mahsulot topilmadi</p>';
    return;
  }

  container.innerHTML = filtr.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="card-img" style="background:${gradCss(p)}">${esc(p.emoji || '')}</div>
      <div class="card-info">
        <div class="card-title">${esc(p.nom)}</div>
        <div class="card-price">${narxFmt(p.narx)}</div>
        <button class="add-btn" data-add="${p.id}">${savat[p.id] ? 'Savatda ✓' : 'Savatga +'}</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.card').forEach(c => {
    c.addEventListener('click', () => modalOch(Number(c.dataset.id)));
  });
  container.querySelectorAll('[data-add]').forEach(b => {
    b.addEventListener('click', (e) => { e.stopPropagation(); savatga(Number(b.dataset.add)); });
  });
}

function modalOch(id) {
  const p = MAHSULOTLAR.find(x => x.id === id);
  if (!p) return;

  const m = document.getElementById('modal');
  m.querySelector('.modal-img').style.background = gradCss(p);
  m.querySelector('.modal-img').textContent = p.emoji || '';
  m.querySelector('.modal-title').textContent = p.nom;
  m.querySelector('.modal-price').textContent = narxFmt(p.narx);

  m.querySelector('#modal-details').innerHTML = `
    <div class="detail-section">
      <div class="detail-label">Brend</div>
      <div class="detail-value">${esc(p.brend)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Hajmi</div>
      <div class="detail-value">${esc(p.hajm)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Tarkibi</div>
      <div class="detail-value">${esc(p.tarkib)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Qo'llanilishi</div>
      <div class="detail-value">${esc(p.qollanish)}</div>
    </div>
  `;

  const btn = m.querySelector('.modal-add');
  btn.onclick = () => { savatga(id); modalYop(); };
  btn.textContent = savat[id] ? 'Savatda ✓' : "Savatga qo'shish";

  m.classList.add('active');
}

function modalYop() {
  document.getElementById('modal')?.classList.remove('active');
}

function savatga(id) {
  savat[id] = (savat[id] || 0) + 1;
  savatSaqlash();
  gridChiz();
  savatChiz();
}

function savatChiz() {
  const container = document.getElementById('cart-list');
  const empty = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  if (!container) return;

  savatniTozala();
  const ids = Object.keys(savat);

  if (ids.length === 0) {
    container.innerHTML = '';
    empty?.classList.remove('hidden');
    footer?.classList.add('hidden');
    return;
  }

  empty?.classList.add('hidden');
  footer?.classList.remove('hidden');

  let jami = 0;
  container.innerHTML = ids.map(id => {
    const p = MAHSULOTLAR.find(x => x.id == id);
    if (!p) return '';
    const soni = savat[id];
    jami += p.narx * soni;
    return `
      <div class="cart-item">
        <div class="cart-item-img" style="background:${gradCss(p)}">${esc(p.emoji || '')}</div>
        <div class="cart-item-info">
          <div class="cart-item-title">${esc(p.nom)}</div>
          <div class="cart-item-price">${narxFmt(p.narx)}</div>
        </div>
        <div class="counter">
          <button class="count-btn" data-minus="${p.id}">−</button>
          <span>${soni}</span>
          <button class="count-btn" data-plus="${p.id}">+</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-minus]').forEach(b =>
    b.addEventListener('click', () => savatOzgar(Number(b.dataset.minus), -1)));
  container.querySelectorAll('[data-plus]').forEach(b =>
    b.addEventListener('click', () => savatOzgar(Number(b.dataset.plus), 1)));

  const total = document.getElementById('total-price');
  if (total) total.textContent = narxFmt(jami);
}

function savatOzgar(id, delta) {
  savat[id] = (savat[id] || 0) + delta;
  if (savat[id] <= 0) delete savat[id];
  savatSaqlash();
  savatChiz();
  gridChiz();
}

function tahlilChiz() {
  const box = document.getElementById('analysis-result');
  if (!box) return;
  if (!tahlil) {
    box.innerHTML = '<p style="color:#666;">Hali tahlil o\'tkazilmagan. Botga yuz rasmingizni yuboring.</p>';
    return;
  }
  box.innerHTML = `
    <div class="analysis-box">
      <div class="analysis-status">
        ${tahlil.namuna ? '⚠️ Namunaviy tahlil' : '✅ AI Tahlili'}
      </div>
      <div><b>Yosh:</b> ${esc(tahlil.yosh)}</div>
      <div><b>Teri turi:</b> ${esc(tahlil.teri_turi)}</div>
      <div style="margin-top:8px;"><b>Muammolar:</b></div>
      <div class="analysis-dim">${(tahlil.muammolar || []).map(esc).join(', ') || '—'}</div>
      <div style="margin-top:8px;"><b>Maslahat:</b></div>
      <div class="analysis-dim">${(tahlil.maslahat || []).map(esc).join(', ') || '—'}</div>
    </div>
  `;
}

function buyurtmaBer() {
  const ids = Object.keys(savat);
  if (ids.length === 0) return;

  const tasdiqlash = () => {
    let matn = "QoraQosh — Yangi buyurtma:\n\n";
    let jami = 0;
    ids.forEach(id => {
      const p = MAHSULOTLAR.find(x => x.id == id);
      if (!p) return;
      const soni = savat[id];
      matn += `- ${p.nom} (${soni} dona) - ${narxFmt(p.narx * soni)}\n`;
      jami += p.narx * soni;
    });
    matn += `\nJami: ${narxFmt(jami)}`;

    savat = {};
    savatSaqlash();
    savatChiz();
    gridChiz();

    const url = `https://t.me/sarvar_gpt?text=${encodeURIComponent(matn)}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  if (tg?.showConfirm) {
    tg.showConfirm('Buyurtmani yuborasizmi?', (ok) => { if (ok) tasdiqlash(); });
  } else if (confirm('Buyurtmani yuborasizmi?')) {
    tasdiqlash();
  }
}

function tabOzgardi(tab) {
  joriyTab = tab;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('view-katalog')?.classList.toggle('hidden', tab !== 'katalog');
  document.getElementById('view-savat')?.classList.toggle('hidden', tab !== 'savat');
  document.getElementById('view-profil')?.classList.toggle('hidden', tab !== 'profil');
  if (tab === 'savat') savatChiz();
  if (tab === 'profil') tahlilChiz();
}

function katOzgardi(kat) {
  joriyKat = kat;
  document.querySelectorAll('.cat-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.kat === kat));
  gridChiz();
}

async function start() {
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => tabOzgardi(t.dataset.tab)));
  const si = document.getElementById('search-input');
  if (si) si.addEventListener('input', () => { qidiruv = si.value; gridChiz(); });
  document.getElementById('order-btn')?.addEventListener('click', buyurtmaBer);
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') modalYop();
  });
  document.querySelectorAll('[data-close-modal]').forEach(b =>
    b.addEventListener('click', modalYop));

  savatniTozala();
  katChiz();
  badgeYangila();
  gridChiz();

  await katalogniOlish();
  savatniTozala();
  badgeYangila();
  gridChiz();

  await tahlilniOlish();
}

start();