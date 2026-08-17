const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

const TEG_NOM = {
  'serum': 'Zardoblar',
  'maska': 'Niqoblar',
  'tozalash': 'Tozalash',
  'toner': 'Tonerlar',
  'krem': 'Kremlar',
  'lab': 'Lab parvarishi',
  'quyosh': 'SPF himoya',
  'aksessuar': 'Aksessuarlar'
};

let MAHSULOTLAR = [];
let savat = JSON.parse(localStorage.getItem('qoraqosh_savat') || '{}');
let tahlil = null;
let joriyKat = 'hammasi';
let joriyTab = 'katalog';

// Yordamchi funksiyalar
const esc = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const narxFmt = (n) => n.toLocaleString('uz-UZ') + ' so\'m';

function savatSaqlash() {
  localStorage.setItem('qoraqosh_savat', JSON.stringify(savat));
  badgeYangila();
}

function badgeYangila() {
  const n = Object.values(savat).reduce((a, b) => a + b, 0);
  const b = document.getElementById('cart-badge');
  if (b) {
    b.textContent = n;
    if (n > 0) b.removeAttribute('hidden');
    else b.setAttribute('hidden', '');
  }
}

// API dan ma'lumot olish
async function katalogniOlish() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      MAHSULOTLAR = await res.json();
    } else {
      throw new Error('API xatosi');
    }
  } catch (e) {
    console.error('Katalog yuklashda xato, fallback ishlatiladi:', e);
    if (typeof FALLBACK_PRODUCTS !== 'undefined') {
      MAHSULOTLAR = FALLBACK_PRODUCTS;
    }
  }
}

async function tahlilniOlish() {
  if (!tg?.initDataUnsafe?.user?.id) return;
  try {
    const res = await fetch(`/api/analysis/${tg.initDataUnsafe.user.id}`, {
      headers: { 'x-tg-init-data': tg.initData }
    });
    if (res.ok) {
      tahlil = await res.json();
      tahlilChiz();
      
      const params = new URLSearchParams(window.location.search);
      if (params.get('start') === 'tahlil' && tahlil.teg) {
        tavsiyalarniSavatgaQoshish();
      }
    }
  } catch (e) { console.error('Tahlil olishda xato:', e); }
}

function tavsiyalarniSavatgaQoshish() {
  const bugun = new Date().toISOString().slice(0, 10);
  const oxirgi = localStorage.getItem('oxirgi_tavsiya_sana');
  
  if (oxirgi === bugun) return;

  const teglari = tahlil?.teg || [];
  const mos = MAHSULOTLAR
    .map(p => ({ ...p, b: p.teglari.filter(t => teglari.includes(t)).length }))
    .filter(p => p.b > 0)
    .sort((a, b) => b.b - a.b)
    .slice(0, 3);

  mos.forEach(p => {
    if (!savat[p.id]) savat[p.id] = 1;
  });
  
  savatSaqlash();
  localStorage.setItem('oxirgi_tavsiya_sana', bugun);
  if (tg) tg.showAlert("Sizga mos mahsulotlar savatga qo'shildi! ✨");
}

function gridChiz() {
  const container = document.getElementById('product-grid');
  if (!container) return;
  
  let html = '';
  const filtr = MAHSULOTLAR.filter(p => joriyKat === 'hammasi' || p.teglari.includes(joriyKat));
  
  filtr.forEach(p => {
    html += `
      <div class="card" onclick="modalOch(${p.id})">
        <div class="card-img" style="background: ${esc(p.grad)}">${esc(p.emoji)}</div>
        <div class="card-info">
          <div class="card-title">${esc(p.nom)}</div>
          <div class="card-price">${narxFmt(p.narx)}</div>
          <button class="add-btn" onclick="event.stopPropagation(); savatga(${p.id})">
            ${savat[p.id] ? 'Savatda ✓' : 'Savatga +'}
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function modalOch(id) {
  const p = MAHSULOTLAR.find(x => x.id === id);
  if (!p) return;
  
  const m = document.getElementById('modal');
  m.querySelector('.modal-img').style.background = p.grad;
  m.querySelector('.modal-img').textContent = p.emoji;
  m.querySelector('.modal-title').textContent = p.nom;
  m.querySelector('.modal-price').textContent = narxFmt(p.narx);
  
  m.querySelector('#modal-details').innerHTML = `
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
  
  const btn = m.querySelector('.footer-btn');
  btn.onclick = () => { savatga(id); modalYop(); };
  btn.textContent = savat[id] ? "Savatda ✓" : "Savatga qo'shish";
  
  m.classList.add('active');
}

function modalYop() {
  document.getElementById('modal').classList.remove('active');
}

function savatga(id) {
  if (savat[id]) delete savat[id];
  else savat[id] = 1;
  savatSaqlash();
  gridChiz();
  savatChiz();
}

function savatChiz() {
  const container = document.getElementById('cart-list');
  const empty = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  
  const ids = Object.keys(savat);
  if (ids.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    footer.classList.add('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  footer.classList.remove('hidden');
  
  let html = '';
  let jami = 0;
  
  ids.forEach(id => {
    const p = MAHSULOTLAR.find(x => x.id == id);
    if (!p) return;
    
    const soni = savat[id];
    jami += p.narx * soni;
    
    html += `
      <div class="cart-item">
        <div class="cart-item-img" style="background: ${esc(p.grad)}">${esc(p.emoji)}</div>
        <div class="cart-item-info">
          <div class="cart-item-title">${esc(p.nom)}</div>
          <div class="cart-item-price">${narxFmt(p.narx)}</div>
        </div>
        <div class="counter">
          <button class="count-btn" onclick="savatOzgar(${p.id}, -1)">-</button>
          <span>${soni}</span>
          <button class="count-btn" onclick="savatOzgar(${p.id}, 1)">+</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  document.getElementById('total-price').textContent = narxFmt(jami);
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
  if (!tahlil) {
    box.innerHTML = '<p style="color: #666">Hali tahlil o\'tkazilmagan. Botga rasm yuboring.</p>';
    return;
  }
  
  box.innerHTML = `
    <div class="analysis-box">
      <div style="font-weight: 700; color: var(--accent); margin-bottom: 8px;">
        ${tahlil.namuna ? '⚠️ Namunaviy tahlil' : '✅ AI Tahlili'}
      </div>
      <div><b>Yosh:</b> ${esc(tahlil.yosh)}</div>
      <div><b>Teri turi:</b> ${esc(tahlil.teri_turi)}</div>
      <div style="margin-top: 8px;"><b>Muammolar:</b></div>
      <div style="font-size: 12px; color: #aaa;">${(tahlil.muammolar || []).map(m => esc(m)).join(', ')}</div>
    </div>
  `;
}

function buyurtmaBer() {
  const ids = Object.keys(savat);
  if (ids.length === 0) return;
  
  let matn = "QoraQosh — Yangi buyurtma:\n\n";
  let jami = 0;
  
  ids.forEach(id => {
    const p = MAHSULOTLAR.find(x => x.id == id);
    if (p) {
      const soni = savat[id];
      matn += `- ${p.nom} (${soni} dona) - ${narxFmt(p.narx * soni)}\n`;
      jami += p.narx * soni;
    }
  });
  
  matn += `\nJami: ${narxFmt(jami)}`;
  
  savat = {};
  savatSaqlash();
  savatChiz();
  gridChiz();
  
  const url = `https://t.me/sarvar_gpt?text=${encodeURIComponent(matn)}`;
  if (tg) {
    tg.openTelegramLink(url);
    tg.close();
  } else {
    window.open(url, '_blank');
  }
}

function tabOzgardi(tab) {
  joriyTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[onclick*="'${tab}'"]`).classList.add('active');
  
  document.getElementById('view-katalog').classList.toggle('hidden', tab !== 'katalog');
  document.getElementById('view-savat').classList.toggle('hidden', tab !== 'savat');
  document.getElementById('view-profil').classList.toggle('hidden', tab !== 'profil');
  
  if (tab === 'savat') savatChiz();
  if (tab === 'profil') tahlilChiz();
}

function katOzgardi(kat) {
  joriyKat = kat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.cat-btn[onclick*="'${kat}'"]`).classList.add('active');
  gridChiz();
}

async function start() {
  await katalogniOlish();
  badgeYangila();
  gridChiz();
  await tahlilniOlish();
}

start();
