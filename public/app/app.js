/* KiOVO Mini App */
(() => {
'use strict';

const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
try { tg?.disableVerticalSwipes?.(); } catch {}

const { ik, ikonlarniChiz } = window.IK;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const narx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ') + " so'm";
const qisqaNarx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);
const titra = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred?.(t); } catch {} };
const ogohlantir = (m) => (tg?.showAlert ? tg.showAlert(m) : alert(m));

const holat = {
  mahsulotlar: [], kategoriyalar: [], savat: [], user: null, tahlil: null,
  kategoriya: 'hammasi', qidiruv: '', narxFiltr: 'hammasi', saralash: 'ommabop',
  yetkazish: { narx: 25000, bepul_chegara: 500000 },
  chegirmalar: [], donaChegirma: { narx: 0, dan: 1 }, minimal: 0,
  karta: { raqam: '', egasi: '' }, konsultatsiya: '', suhbat: [],
  sevimlilar: new Set(),
  draft: {}, tab: 'katalog',
};

// ---------------- API ----------------
async function api(yol, opt = {}) {
  const token = seansToken();
  const res = await fetch(yol, {
    ...opt,
    headers: { 'Content-Type': 'application/json',
               'X-Init-Data': tg?.initData || '',
               // Telegramdan tashqarida: botdan tasdiqlangan seans
               ...(token && !tg?.initData ? { Authorization: `Bearer ${token}` } : {}),
               ...(opt.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  // Seans tugagan yoki bekor qilingan — qaytadan kirish so'raymiz
  if (res.status === 401 && token && !tg?.initData) { seansOchir(); kirishEkrani();
    throw new Error(data.error || 'Sessiya tugadi'); }
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

// ================= QIDIRUV LUG'ATI =================
// Odam «quyoshdan himoya krem» deb ham, «Relief Sun» deb ham qidiradi.
// Shu lug'at oddiy so'zlarni katalogdagi teglarga bog'laydi.
// @ bilan boshlangani — parvarish bosqichi, qolgani — muammo (concern).
const SINONIM = {
  // ☀️ quyoshdan himoya
  quyosh:'@himoya', quyoshdan:'@himoya', spf:'@himoya', oftob:'@himoya', uv:'@himoya',
  sun:'@himoya', sunscreen:'@himoya', kuyish:'@himoya', kuyishdan:'@himoya',
  // 🫧 tozalash
  tozalash:'@tozalash', tozalagich:'@tozalash', yuvish:'@tozalash', yuvinish:'@tozalash',
  penka:'@tozalash', kopik:'@tozalash', pardoz:'@tozalash', gidrofil:'@tozalash',
  // 💧 toner
  toner:'@toner', tonik:'@toner',
  // 🧪 serum
  serum:'@davolash', sarum:'@davolash', essensiya:'@davolash', essence:'@davolash',
  // 🫙 namlash
  namlash:'@namlash', namlantiruvchi:'@namlash', krem:'@namlash', moisturizer:'@namlash',
  // 🎭 qo'shimcha
  niqob:'@qoshimcha', maska:'@qoshimcha', mask:'@qoshimcha', skrab:'@qoshimcha',
  // --- muammolar ---
  akne:'akne', husnbuzar:'akne', toshma:'akne', pryshch:'akne', ugri:'akne', chipqon:'akne',
  teshik:'teshik', teshiklar:'teshik', pora:'teshik', qoranuqta:'teshik', komedon:'teshik',
  yogli:'yoglilik', yoglanish:'yoglilik', yog:'yoglilik', yaltirash:'yoglilik',
  quruq:'quruqlik', quruqlik:'quruqlik', qurish:'quruqlik', qipiq:'quruqlik', namlik:'quruqlik',
  qizarish:'qizarish', qizil:'qizarish', yallig:'qizarish', tirnalish:'qizarish',
  dog:'dog', doglar:'dog', pigment:'dog', sepkil:'dog', iz:'dog',
  ajin:'ajin', ajinlar:'ajin', qarish:'ajin', keksayish:'ajin', antiage:'ajin',
  xira:'xiralik', xiralik:'xiralik', rang:'xiralik', oqartirish:'xiralik', yorqinlik:'xiralik',
  sezgir:'sezgirlik', sezgirlik:'sezgirlik', nozik:'sezgirlik', allergiya:'sezgirlik',
};

// Kirilldan lotinga: odam «пенка» deb ham, «penka» deb ham yozadi.
// Ikkalasini bitta ko'rinishga keltirsak, bitta qidiruv ikkalasini topadi.
// O'zbek kirili (ў, қ, ғ, ҳ) ham shu yerda.
const KIRILL = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'j', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sh', ъ:'', ы:'i', ь:'', э:'e', ю:'yu', я:'ya',
  ў:'o', қ:'q', ғ:'g', ҳ:'h', ә:'a', ө:'o', ү:'u', ң:'ng', і:'i', ї:'i', є:'e',
};
const translit = (s) => s.replace(/[\u0400-\u04FF]/g, (c) => KIRILL[c] ?? c);

/** Turli yozilishni bir xilga keltiradi: oʻ/o' → o, ғ/gʻ → g, п → p */
const meyor = (s) => translit(String(s || '').toLowerCase())
  .replace(/[''`ʻʼ’‘]/g, '')
  .replace(/[^a-z0-9\u3130-\u318f\uac00-\ud7a3\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

/**
 * Ilovada KO'RINADIGAN nom.
 *
 * Katalogdagi `name` — Koreyadagi asl nom: mijoz uni o'qiy olmaydi.
 * `nom_uz` esa o'zbekchalashtirilgani. Asl nom o'chirilmaydi:
 * buyurtma, xarid ro'yxati va pochta hujjati aynan shunga tayanadi.
 */
const nomi = (p) => String(p?.nom_uz || '').trim() || String(p?.name || '').trim();

/** Mahsulotdan qidiriladigan matn tuzadi. */
function indeks(p) {
  const kat = holat.kategoriyalar.find((k) => k.id === p.category_id)?.name || '';
  // kalit_sozlar — serverda AI to'ldirgan «odam yozadigan» so'zlar:
  // penka, пенка, gel dlya umyvaniya, foam cleanser…
  // IKKALA nom ham indeksga tushadi: odam «gidrofil moy» deb ham,
  // «cleansing oil» deb ham qidiradi.
  return meyor([p.name, p.nom_uz, p.brand, kat, p.step, p.description,
    ...(p.kalit_sozlar || []),
    ...(p.concerns || []), ...(p.skin_types || []), ...(p.actives || [])].join(' '));
}

/** Qidiruvni baholaydi: 0 = mos emas, katta son = yaxshiroq mos. */
function ball(p, sorov) {
  if (!sorov) return 1;
  const sozlar = sorov.split(' ').filter((w) => w.length > 1);
  if (!sozlar.length) return 1;

  const matn = p._indeks;
  const nom  = meyor(`${p.brand || ''} ${p.name} ${p.nom_uz || ''}`);
  let b = 0;

  for (const soz of sozlar) {
    let topildi = 0;
    if (nom.includes(soz)) topildi += 10;              // nom bo'yicha — eng kuchli
    else if (matn.includes(soz)) topildi += 4;         // tavsif/tarkib

    // Lug'at: «quyoshdan himoya» → @himoya bosqichi
    const teg = SINONIM[soz];
    if (teg) {
      if (teg.startsWith('@')) { if (p.step === teg.slice(1)) topildi += 8; }
      else if ((p.concerns || []).includes(teg)) topildi += 7;
    }
    if (!topildi) return 0;                            // har bir so'z mos kelishi shart
    b += topildi;
  }
  return b;
}

const NARX_FILTR = {
  hammasi: { nom: 'Barcha narx', tekshir: () => true },
  arzon:   { nom: '100 mingacha',   tekshir: (p) => p.price < 100000 },
  orta:    { nom: '100–150 ming',   tekshir: (p) => p.price >= 100000 && p.price <= 150000 },
  qimmat:  { nom: '150 mingdan',    tekshir: (p) => p.price > 150000 },
};
const SARALASH = {
  ommabop:  { nom: 'Ommabop',  cmp: (a, b) => (b.sold_count || 0) - (a.sold_count || 0) },
  arzondan: { nom: 'Arzondan',  cmp: (a, b) => a.price - b.price },
  qimmatdan:{ nom: 'Qimmatdan', cmp: (a, b) => b.price - a.price },
};

// ================= TELEGRAMSIZ KIRISH =================
// Bosh ekrandagi yorliq Telegramni ochishga majbur qilardi. Endi odam
// telefon raqamini kiritadi, botga tasdiqlash so'rovi keladi, tasdiqlagach
// brauzerda ham xuddi oddiy ilovadek ishlaydi.
//
// Parol yo'q — u yo'qoladi, o'g'irlanadi va tiklashni talab qiladi.
// Tasdiq esa allaqachon telefonida turgan Telegramdan keladi.

const TOKEN_KALIT = 'kiovo_seans';
const seansToken = () => { try { return localStorage.getItem(TOKEN_KALIT) || ''; } catch { return ''; } };
const seansSaqla = (t) => { try { localStorage.setItem(TOKEN_KALIT, t); } catch {} };
const seansOchir = () => { try { localStorage.removeItem(TOKEN_KALIT); } catch {} };

/** Raqamni yozilayotgan paytda formatlaydi: +998 90 123 45 67 */
function raqamFormat(xom) {
  const r = String(xom).replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  const b = [r.slice(0, 2), r.slice(2, 5), r.slice(5, 7), r.slice(7, 9)].filter(Boolean);
  return r ? `+998 ${b.join(' ')}` : '';
}

let kirishTimer = null;

function kirishEkrani() {
  clearInterval(kirishTimer);
  document.body.innerHTML = `
    <div class="kirish-fon">
      <div class="kirish-quti" id="kirish-quti"></div>
    </div>`;
  kirishQadam1();
}

function kirishQadam1(xato = '') {
  $('#kirish-quti').innerHTML = `
    <div class="kirish-belgi">KiOVO</div>
    <h2>Telefon raqamingiz</h2>
    <p>Botga tasdiqlash so‘rovi keladi. Parol kerak emas.</p>
    <input id="k-raqam" type="tel" inputmode="numeric" autocomplete="tel"
           placeholder="+998 90 123 45 67" value="+998 ">
    ${xato ? `<div class="kirish-xato">${esc(xato)}</div>` : ''}
    <button class="asosiy" id="k-yubor">Davom etish</button>
    <button class="matnli" id="k-telegram">Telegramda ochish</button>`;

  const inp = $('#k-raqam');
  inp.oninput = () => { inp.value = raqamFormat(inp.value); };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#k-yubor').click(); };
  setTimeout(() => { inp.focus(); inp.setSelectionRange(99, 99); }, 100);

  $('#k-telegram').onclick = () => { location.href = '/app/ochish'; };
  $('#k-yubor').onclick = async () => {
    const t = $('#k-yubor');
    t.disabled = true; t.textContent = 'Yuborilmoqda…';
    try {
      const r = await api('/api/kirish/sorov', { method: 'POST',
        body: JSON.stringify({ telefon: inp.value }) });
      kirishQadam2(r);
    } catch (e) {
      t.disabled = false; t.textContent = 'Davom etish';
      kirishQadam1(e.message);
    }
  };
}

function kirishQadam2({ kalit, kod, raqam, muddat }) {
  const tugash = Date.now() + (muddat || 180000);
  $('#kirish-quti').innerHTML = `
    <div class="kirish-belgi">KiOVO</div>
    <h2>Telegramni oching</h2>
    <p>${esc(raqam || '')} raqamiga bog‘langan Telegramga
       tasdiqlash so‘rovi yuborildi.</p>
    <div class="kirish-kod"><span>Ekrandagi kod</span><b>${esc(kod)}</b></div>
    <p class="kirish-ogoh">Botdagi kod SHU raqamga mos kelsagina tasdiqlang.</p>
    <div class="kirish-kutish"><span class="aylana"></span>
      <span id="k-qoldi">Kutilmoqda…</span></div>
    <button class="matnli" id="k-ortga">Boshqa raqam</button>`;

  $('#k-ortga').onclick = () => { clearInterval(kirishTimer); kirishQadam1(); };

  kirishTimer = setInterval(async () => {
    const qoldi = Math.max(0, Math.ceil((tugash - Date.now()) / 1000));
    const q = $('#k-qoldi');
    if (q) q.textContent = qoldi ? `Kutilmoqda… ${qoldi} s` : 'Muddat tugadi';
    if (!qoldi) { clearInterval(kirishTimer); return kirishQadam1('Muddat tugadi. Qayta urining.'); }
    try {
      const r = await api(`/api/kirish/holat?kalit=${encodeURIComponent(kalit)}`);
      if (r.holat === 'tasdiqlandi' && r.token) {
        clearInterval(kirishTimer);
        seansSaqla(r.token);
        location.reload();
      } else if (r.holat === 'rad') {
        clearInterval(kirishTimer);
        kirishQadam1('Siz rad etdingiz. Bu siz bo‘lsangiz qayta urining.');
      } else if (r.holat === 'muddati_otdi' || r.holat === 'yoq') {
        clearInterval(kirishTimer);
        kirishQadam1('So‘rov muddati tugadi. Qayta urining.');
      }
    } catch { /* tarmoq — keyingi urinishda */ }
  }, 2000);
}

// ---------------- Ishga tushirish ----------------

/**
 * Ilova Telegramdan tashqarida ochilganmi?
 *
 * Bosh ekranga qo'yilgan brauzer yorlig'i bevosita /app/ ni ochsa
 * initData bo'lmaydi va hech narsa yuklanmaydi — odam «ilova
 * ishlamayapti» deb o'ylaydi. Bunday holda Telegramdagi ilovaga
 * yo'naltiramiz.
 */
function telegramdanTashqarida() {
  if (tg?.initData) return false;
  // Seans bor — ilova xuddi Telegram ichidagidek ishlaydi
  if (seansToken()) return false;
  kirishEkrani();
  return true;
}

async function boshla() {
  if (telegramdanTashqarida()) return;
  // Statik razmetkadagi <i data-ik> larni chizma ikonga to'ldiramiz
  ikonlarniChiz();
  suhbatniYukla();
  pwaniUla();
  try {
    const k = await api('/api/catalog');
    holat.kategoriyalar = k.kategoriyalar;
    holat.mahsulotlar   = k.mahsulotlar.map((p) => ({ ...p, _indeks: '' }));
    holat.mahsulotlar.forEach((p) => { p._indeks = indeks(p); });
    holat.yetkazish   = k.yetkazish;
    holat.chegirmalar = k.chegirmalar || [];
    holat.donaChegirma = k.dona_chegirma || { narx: 0, dan: 1 };
    holat.minimal = Number(k.minimal_buyurtma) || 0;
    holat.karta       = k.karta || { raqam: '', egasi: '' };
    holat.konsultatsiya = k.konsultatsiya || '';
    holat.menejer = k.menejer || { telefon: '', ish_vaqti: '' };
    holat.namuna = k.skaner_namuna || '';
    holat.karusel = Array.isArray(k.karusel) ? k.karusel : [];
    mavzuniQoll(k.mavzu);
  } catch (e) { console.error(e); }

  try {
    const me = await api('/api/me');
    holat.user = me.user;
    holat.tahlil = me.oxirgi_tahlil;
    holat.limit = me.limit;
    holat.stat = me.stat || {};
    if (!me.user.royxatdan_otgan) return royxatEkrani();
  } catch {
    kor($('#ilova'), true);              // Telegram tashqarisida — faqat katalog
    karuselniChiz();
    toifalarniChiz(); filtrlarniChiz(); katalogniChiz();
    return;
  }

  kor($('#ilova'), true);
  karuselniChiz();
  namunaniChiz();
  toifalarniChiz(); filtrlarniChiz(); katalogniChiz(); limitniChiz();
  await Promise.all([savatniYangila(), draftniYukla(), xabarlarniYangila(),
                     sevimlilarniYukla()]);

  const p = new URLSearchParams(location.search);
  if (p.get('tavsiya') === '1') await tavsiyaniSavatgaSol();
  const xom = p.get('tab') || sessionStorage.getItem('qq_tab') || 'katalog';
  const boshlangich = TAB_TAQMOQ[xom] || xom;
  if (boshlangich === 'natija' && holat.tahlil) natijaniChiz();
  tabOch(TABLAR.includes(boshlangich) ? boshlangich : 'katalog');
}

// ---------------- Ro'yxatdan o'tish ----------------
function royxatEkrani() {
  kor($('#ekran-royxat'), true);
  // Yozilganini saqlaymiz — chiqib ketsa yo'qolmasin
  ['f-ism','f-tel','f-yosh'].forEach((id) => {
    const el = $('#' + id);
    el.value = localStorage.getItem('qq_' + id) || '';
    el.oninput = () => localStorage.setItem('qq_' + id, el.value);
  });

  $('#t-roziman').onclick = async () => {
    const xato = $('#royxat-xato'); xato.textContent = '';
    const tana = {
      full_name: $('#f-ism').value.trim(),
      phone:     $('#f-tel').value.trim(),
      age:       Number($('#f-yosh').value),
      agreed:    true,           // manzil bu yerda emas — buyurtma paytida so'raladi
    };
    if (tana.full_name.length < 3) return xato.textContent = 'Ismingizni to‘liq yozing.';
    if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, '')))
      return xato.textContent = 'Telefon: +998901234567 ko‘rinishida.';
    if (!tana.age || tana.age < 12 || tana.age > 90)
      return xato.textContent = 'Yoshni 12–90 oralig‘ida kiriting.';

    $('#t-roziman').disabled = true;
    try {
      await api('/api/register', { method: 'POST', body: JSON.stringify(tana) });
      ['f-ism','f-tel','f-yosh'].forEach((id) => localStorage.removeItem('qq_' + id));
      titra('medium');
      location.reload();
    } catch (e) { xato.textContent = e.message; $('#t-roziman').disabled = false; }
  };
}

/**
 * Admin tanlagan ranglarni CSS o'zgaruvchilariga yozadi.
 *
 * Faqat YORUG' rejimda fon almashtiriladi: qorong'i rejimda och yashil fon
 * ko'zni qamashtiradi va matn o'qilmay qoladi — u yerda faqat urg'u rangi
 * o'zgaradi. Ranglar serverda hisoblanadi (src/lib/mavzu.js), shu sababli
 * ilova, natija rasmi va admin ko'rinishi bir xil chiqadi.
 */
function mavzuniQoll(m) {
  if (!m || typeof m !== 'object') return;
  const r = document.documentElement.style;
  const qorongi = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

  if (m.urgu) {
    r.setProperty('--urgu', m.urgu);
    if (m.urguTim) r.setProperty('--urgu-tim', m.urguTim);
    if (m.urguOch && !qorongi) r.setProperty('--urgu-och', m.urguOch);
  }
  if (!qorongi) {
    if (m.fon)    r.setProperty('--fon', m.fon);
    if (m.karta)  r.setProperty('--panel', m.karta);
    if (m.chiziq) r.setProperty('--chiziq', m.chiziq);
    if (m.matn)   r.setProperty('--matn', m.matn);
    if (m.kul)    r.setProperty('--kul', m.kul);
    if (m.och)    r.setProperty('--och', m.och);
  }
  // Telegram sarlavhasi ham mos tushsin
  try {
    tg?.setHeaderColor?.(qorongi ? '#131110' : (m.asosiy || m.fon));
    tg?.setBackgroundColor?.(qorongi ? '#131110' : (m.fon || '#faf9f7'));
  } catch {}
}

/**
 * Bosh sahifadagi karusel.
 *
 * Admin bir nechta rasm yuklaydi — ular avtomatik aylanadi va ustida
 * skanerga olib boruvchi tugma turadi. Rasm YO'Q bo'lsa eski chaqiriq
 * kartasi ko'rinadi: bo'sh joy qolmaydi.
 */
let karuselTaymer = null;

/** Birinchi slayd — AI tahlil chaqirig'i. Admin rasm yuklamasa ham qoladi. */
const aiSlayd = () => `
  <div class="slayd ai-slayd" data-skaner="1">
    <span class="ai-teg">AI SKIN ADVISOR</span>
    <span class="ai-sarlavha">Teringiz uchun mos<br>mahsulotni toping</span>
    <span class="ai-tugma">Yuzimni tahlil qil ${ik('keyingi', 15)}</span>
    <span class="ai-robot">${ik('robot', 52)}</span>
  </div>`;

function karuselniChiz() {
  const quti = $('#karusel');
  if (!quti) return;
  const rasmlar = (holat.karusel || []).filter(Boolean);
  const jami = 1 + rasmlar.length;

  $('#karusel-lenta').innerHTML = aiSlayd()
    + rasmlar.map((id) => `<div class="slayd"><img src="/media/${esc(id)}?w=800" alt="" loading="lazy"></div>`).join('');
  $('#karusel-nuqtalar').innerHTML = jami > 1
    ? Array.from({ length: jami }, (_, i) => `<i class="${i === 0 ? 'faol' : ''}"></i>`).join('') : '';

  const lenta = $('#karusel-lenta');
  const tugma = $('#karusel-tugma');
  let joriy = 0;
  const kor_ = () => {
    lenta.style.transform = `translateX(-${joriy * 100}%)`;
    $$('#karusel-nuqtalar i').forEach((n, i) => n.classList.toggle('faol', i === joriy));
    // AI slaydida o'z tugmasi bor — burchakdagisi faqat rasmlarda
    kor(tugma, joriy > 0);
  };

  clearInterval(karuselTaymer);
  if (jami > 1) {
    karuselTaymer = setInterval(() => { joriy = (joriy + 1) % jami; kor_(); }, 5000);
  }

  let boshX = 0;
  quti.ontouchstart = (e) => { boshX = e.touches[0].clientX; clearInterval(karuselTaymer); };
  quti.ontouchend = (e) => {
    const farq = e.changedTouches[0].clientX - boshX;
    if (Math.abs(farq) > 40 && jami > 1) {
      joriy = (joriy + (farq < 0 ? 1 : jami - 1)) % jami;
      kor_();
    }
  };
  quti.onclick = (e) => {
    if (e.target.closest('[data-skaner]') || e.target.closest('#karusel-tugma')) {
      titra('medium'); tabOch('skaner');
    }
  };
  kor_();
}

/** Skaner ekranidagi namuna surat — admin yuklagan bo'lsa ko'rsatiladi. */
// Skaner nimalarni aniqlashini oldindan ko'rsatamiz — odam nima
// kutayotganini bilsa, rasmni ham jiddiyroq oladi.
const SKAN_BELGI = [
  { ik: 'tozalik', nom: 'Akne',      sinf: 'b-qizil' },
  { ik: 'tomchi',  nom: 'Quruqlik',  sinf: 'b-kok' },
  { ik: 'quyosh',  nom: 'Yog‘lanish', sinf: 'b-sariq' },
  { ik: 'koz',     nom: 'Teshik',    sinf: 'b-yashil' },
  { ik: 'barg',    nom: 'Dog‘',      sinf: 'b-binafsha' },
];

function namunaniChiz() {
  const belgilar = $('#skan-belgilar');
  if (belgilar && !belgilar.innerHTML) {
    belgilar.innerHTML = SKAN_BELGI.map((x) => `
      <div><span class="b ${x.sinf}">${ik(x.ik, 21)}</span>${esc(x.nom)}</div>`).join('');
  }
  const rasm = $('#namuna-rasm');
  const yoq  = $('#namuna-yoq');
  if (!rasm) return;
  const korsat = (bor) => { kor(rasm, bor); kor(yoq, !bor); };
  if (!holat.namuna) return korsat(false);
  rasm.src = `/media/${holat.namuna}?w=800`;
  // Rasm ochilmasa (o'chirilgan bo'lsa) o'rnida ikon qoladi
  rasm.onerror = () => korsat(false);
  rasm.onload = () => {
    korsat(true);
    // Quti nisbati RASMNIKIGA moslashadi: aks holda keng namuna
    // (masalan yonma-yon ikki yuz) qirqiladi yoki chetida bo'sh
    // joy qoladi.
    const quti = rasm.closest('.skaner-namuna');
    if (quti && rasm.naturalWidth && rasm.naturalHeight) {
      quti.style.aspectRatio = `${rasm.naturalWidth} / ${rasm.naturalHeight}`;
      // Yuz ramkasi bitta markazlashgan yuz uchun. Admin qo'ygan
      // namunada ikki yuz bo'lishi mumkin — unda ramka chalg'itadi.
      quti.classList.toggle('ramkasiz', rasm.naturalWidth / rasm.naturalHeight > 1.05);
    }
  };
  korsat(true);
}

// ---------------- Katalog ----------------
/** Faol filtrlar — qidiruv ostida yorliq bo'lib turadi, bosib olib tashlanadi. */
function filtrlarniChiz() {
  const yorliqlar = [];
  if (holat.kategoriya !== 'hammasi') {
    const k = holat.kategoriyalar.find((x) => x.slug === holat.kategoriya);
    yorliqlar.push({ tur: 'kat', matn: `${k?.emoji || ''} ${k?.name || ''}`.trim() });
  }
  if (holat.narxFiltr !== 'hammasi') yorliqlar.push({ tur: 'narx', matn: NARX_FILTR[holat.narxFiltr].nom });
  if (holat.saralash !== 'ommabop')  yorliqlar.push({ tur: 'sara', matn: SARALASH[holat.saralash].nom });

  const el = $('#filtr-satr');
  el.innerHTML = yorliqlar.map((y) =>
    `<span class="filtr-yorliq">${esc(y.matn)}<button data-och="${y.tur}" aria-label="Olib tashlash">${ik('yopish',14)}</button></span>`).join('');
  $$('[data-och]', el).forEach((b) => b.onclick = () => {
    const t = b.dataset.och;
    if (t === 'kat')  holat.kategoriya = 'hammasi';
    if (t === 'narx') holat.narxFiltr = 'hammasi';
    if (t === 'sara') holat.saralash = 'ommabop';
    toifalarniChiz(); filtrlarniChiz(); katalogniChiz(); titra();
  });

  const faol = yorliqlar.length > 0;
  $('#filtr-tugma').classList.toggle('faol', faol);
  kor($('#filtr-belgi'), faol);
}

/** ⋯ tugmasi — filtr oynasi. Ekranni band qilmasin. */
function filtrOyna() {
  const kat = [{ slug:'hammasi', name:'Hammasi' }, ...holat.kategoriyalar];
  $('#modal-tan').innerHTML = `
    <div style="padding:16px 18px 0">
      <div class="karta-bosh"><h2>Filtr va tartib</h2>
        <button class="filtr-yorliq" id="f-tozala" style="border:0;cursor:pointer">Tozalash</button></div>

      <label style="margin-top:6px">Kategoriya</label>
      <div class="lenta" style="padding:2px 0 4px;flex-wrap:wrap;overflow:visible">
        ${kat.map((k) => `<button data-kat="${esc(k.slug)}"
          class="${k.slug === holat.kategoriya ? 'tanlangan' : ''}">${esc(k.emoji || '')} ${esc(k.name)}</button>`).join('')}
      </div>

      <label>Narx</label>
      <div class="lenta" style="padding:2px 0 4px;flex-wrap:wrap;overflow:visible">
        ${Object.entries(NARX_FILTR).map(([k, v]) => `<button data-narx="${k}"
          class="${k === holat.narxFiltr ? 'tanlangan' : ''}">${esc(v.nom)}</button>`).join('')}
      </div>

      <label>Tartib</label>
      <div class="lenta" style="padding:2px 0 4px;flex-wrap:wrap;overflow:visible">
        ${Object.entries(SARALASH).map(([k, v]) => `<button data-sara="${k}"
          class="${k === holat.saralash ? 'tanlangan' : ''}">${esc(v.nom)}</button>`).join('')}
      </div>

      <button class="asosiy" id="f-korish" style="margin-top:18px">Ko‘rish</button>
    </div>`;
  modalOch();

  const yangila = () => { filtrOyna(); katalogniChiz(); filtrlarniChiz(); toifalarniChiz(); titra(); };
  $$('#modal-tan [data-kat]').forEach((b) => b.onclick = () => { holat.kategoriya = b.dataset.kat; yangila(); });
  $$('#modal-tan [data-narx]').forEach((b) => b.onclick = () => { holat.narxFiltr = b.dataset.narx; yangila(); });
  $$('#modal-tan [data-sara]').forEach((b) => b.onclick = () => { holat.saralash = b.dataset.sara; yangila(); });
  $('#f-tozala').onclick = () => {
    holat.kategoriya = 'hammasi'; holat.narxFiltr = 'hammasi'; holat.saralash = 'ommabop'; yangila();
  };
  $('#f-korish').onclick = modalYop;
}

function saralangan() {
  const katId = holat.kategoriyalar.find((k) => k.slug === holat.kategoriya)?.id;
  const q = meyor(holat.qidiruv);
  return holat.mahsulotlar
    .filter((p) => holat.kategoriya === 'hammasi' || p.category_id === katId)
    .filter((p) => NARX_FILTR[holat.narxFiltr].tekshir(p))
    .map((p) => ({ p, b: ball(p, q) }))
    .filter((x) => x.b > 0)
    .sort((x, y) => (q ? y.b - x.b : 0) || SARALASH[holat.saralash].cmp(x.p, y.p))
    .map((x) => x.p);
}

function rasmHtml(p, uslub = '', nishonlar = '') {
  // Rasm yo'q bo'lsa TINCH neytral fon: ilgari har mahsulotga tasodifiy
  // to'q gradient qo'yilardi va katalog rang-barang bo'lib ketardi.
  const fon = '';
  const ich = p.poster_id
    ? `<img src="/media/${esc(p.poster_id)}?w=400" alt="${esc(nomi(p))}" loading="lazy">`
    : ik('shisha', 44);
  return `<div class="rasm" style="${p.poster_id ? '' : fon};${uslub}">${ich}${nishonlar}</div>`;
}

// Bir martada nechta mahsulot chiziladi. Hammasini birdan qo'yish
// (2000 ta karta) telefonda 1,5–3 soniya qotishga olib kelardi —
// pastga tushgan sari qo'shib boramiz.
const SAHIFA = 24;
let kuzatuvchi = null;

// Toifa slugini ikonga bog'laymiz — emoji har telefonda boshqacha
// chiziladi, chizma ikon esa bir xil.
const TOIFA_IKON = {
  hammasi:'dokon', tozalash:'tomchi', toner:'shisha', serum:'pipetka',
  krem:'quti', niqob:'niqob', quyosh:'quyosh', lab:'yurak',
  toplam:'sovga', ichimlik:'ichki',
};

// Nomdan ikonka topish — AI ochgan yangi bo'limlar uchun.
// Ilgari ular hammasi bir xil «shisha» ni olardi va filtr o'qilmay
// qolardi.
const NOM_IKON = [
  [/soch|shampun|balzam/i, 'tomchi'],  [/tuk|epilyat|razor|ustara/i, 'qalqon'],
  [/lab|lip/i, 'yurak'],               [/koz|ko‘z|eye/i, 'koz'],
  [/quyosh|spf|sun/i, 'quyosh'],       [/niqob|maska|mask|patch/i, 'niqob'],
  [/serum|essens|ampul/i, 'pipetka'],  [/krem|cream|namlov/i, 'quti'],
  [/toner|tonik/i, 'shisha'],          [/tozala|yuvish|penka|foam/i, 'tomchi'],
  [/toplam|nabor|set|komplekt/i, 'sovga'],
  [/vitamin|kollagen|ichimlik|ichki/i, 'ichki'],
  [/aksessuar|asbob|vosita|qurilma/i, 'quti'],
  [/tirnoq|nail/i, 'tahrir'],          [/tana|body|qol|oyoq/i, 'profil'],
];

// Moslik topilmasa ham bo'limlar bir-biridan farq qilsin: slug'dan
// barqaror tanlov. Bir xil bo'lim har doim bir xil ikonka oladi.
const ZAXIRA_IKON = ['quti', 'sovga', 'barg', 'tomchi', 'qalqon', 'niqob', 'shisha', 'ichki'];
const xeshRaqam = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};

/** Bo'lim ikonkasi: admin tanlagani → slug → nom → barqaror zaxira. */
function toifaIkon(k) {
  if (k.ikon) return k.ikon;
  if (TOIFA_IKON[k.slug]) return TOIFA_IKON[k.slug];
  const matn = `${k.name || ''} ${k.slug || ''}`;
  for (const [qoida, ikon] of NOM_IKON) if (qoida.test(matn)) return ikon;
  return ZAXIRA_IKON[xeshRaqam(k.slug || k.name || '') % ZAXIRA_IKON.length];
}

// Rang ham shunday: tayyor sinf bo'lmasa slug'dan barqaror tus.
const ZAXIRA_TUS = [
  ['#fdeceb', '#c0392b'], ['#e7f5ee', '#2e7d55'], ['#e8f0fd', '#2563c9'],
  ['#fdf1e0', '#a9741a'], ['#f2ecfb', '#6b46c1'], ['#e6f6f8', '#12707d'],
  ['#fbecf5', '#a02472'], ['#eef2e8', '#5a7a2e'],
];
const TAYYOR_SINF = new Set(Object.keys(TOIFA_IKON));

function toifaUslub(k) {
  if (TAYYOR_SINF.has(k.slug)) return '';
  const [fon, matn] = ZAXIRA_TUS[xeshRaqam(k.slug || k.name || '') % ZAXIRA_TUS.length];
  return `background:${fon};color:${matn}`;
}

/** Yuqoridagi toifa kartalari (rasmdagidek oq, ikonli, siriladigan). */
function toifalarniChiz() {
  const bor = new Set(holat.mahsulotlar.map((p) => p.category_id));
  const royxat = [{ slug:'hammasi', name:'Barchasi' },
                  ...holat.kategoriyalar.filter((k) => bor.has(k.id))];
  $('#toifalar').innerHTML = royxat.map((k) => `
    <button data-toifa="${esc(k.slug)}" class="${k.slug === holat.kategoriya ? 'tanlangan' : ''}">
      <span class="doira t-${esc(k.slug)}" style="${toifaUslub(k)}">${ik(toifaIkon(k), 23)}</span>
      <span>${esc(k.name)}</span>
    </button>`).join('');
  $$('#toifalar [data-toifa]').forEach((b) => b.onclick = () => {
    holat.kategoriya = b.dataset.toifa; titra();
    katalogniChiz(); filtrlarniChiz();
    $('#tab-katalog').scrollIntoView({ block:'start' });
  });
}

/**
 * Bosh sahifa: har toifa alohida bo'lim.
 * Bir bo'lim GORIZONTAL siriladi, keyingisi VERTIKAL to'r bo'lib tushadi —
 * bir xil ritm ekranni zeriktiradi, almashinib turgani esa har bo'limni
 * alohida ko'rsatadi.
 */
function bolimlarniChiz() {
  const quti = $('#bolimlar');
  const tartib = (a, b) => (b.sold_count || 0) - (a.sold_count || 0);
  const bolimlar = holat.kategoriyalar.map((k) => ({
    k,
    royxat: holat.mahsulotlar.filter((p) => p.category_id === k.id).sort(tartib),
  })).filter((x) => x.royxat.length);

  // Bo'limi yo'q mahsulotlar ham ko'rinsin: aks holda ular faqat
  // "Barcha mahsulotlar" ichida qolib, bosh sahifada yo'qoladi.
  const bolimsiz = holat.mahsulotlar.filter((p) => !p.category_id).sort(tartib);
  if (bolimsiz.length) bolimlar.push({ k: { name: 'Boshqa', slug: 'boshqa' }, royxat: bolimsiz });

  // Hamma bo'lim GORIZONTAL siriladi. Ilgari bittasi gorizontal,
  // keyingisi vertikal to'r edi — natijada vertikal bo'lim ustida
  // «Hammasini ko'rish» turardi, holbuki u yerda hammasi allaqachon
  // ko'rinib turardi. Bir xil ko'rinish tushunarliroq: har bo'lim
  // bitta satr, davomi yon tomonda, «Hammasini ko'rish» esa haqiqatan
  // ham sig'magan mahsulotlar uchun.
  quti.innerHTML = bolimlar.map(({ k, royxat }) => {
    const kartalar = royxat.slice(0, 12).map(kartaHtml).join('');
    return `
      <div class="bolim-satr">
        <h2>${esc(k.name)}</h2>
        ${k.slug !== 'boshqa' && royxat.length > 12
          ? `<button data-hammasi="${esc(k.slug)}">Hammasini ko‘rish ${ik('keyingi', 15)}</button>` : ''}
      </div>
      <div class="qator">${kartalar}</div>`;
  }).join('');

  $$('#bolimlar .mahsulot').forEach((el) => el.onclick = (e) => kartaBosildi(e, el));
  $$('#bolimlar [data-hammasi]').forEach((b) => b.onclick = () => {
    holat.kategoriya = b.dataset.hammasi; titra();
    toifalarniChiz(); katalogniChiz(); filtrlarniChiz();
    scrollTo({ top: 0 });
  });
}

/**
 * Katalogni chizadi. Ikki rejim:
 *   uy    — qidiruv va filtr yo'q: toifa bo'limlari + oxirida to'liq ro'yxat
 *   natija — qidiruv yoki filtr bor: faqat mos kelganlar to'ri
 */
function katalogniChiz() {
  const uy = holat.kategoriya === 'hammasi' && !holat.qidiruv
    && holat.narxFiltr === 'hammasi';
  kor($('#bolimlar'), uy);
  if (uy) bolimlarniChiz();
  mahsulotlarniChiz(uy);
}

function mahsulotlarniChiz(uy = false) {
  const royxat = saralangan();
  const bosh = royxat.length === 0;
  kor($('#katalog-bosh'), bosh && !uy);
  kor($('#royxat-holat'), !bosh);

  // Bosh sahifada ro'yxat "Barcha mahsulotlar" bo'limi bo'lib tushadi
  $('#natija-soni').innerHTML = bosh ? '' : (uy
    ? `<div class="bolim-satr" style="padding-left:0;padding-right:0"><h2>Barcha mahsulotlar</h2></div>`
    : (holat.qidiruv ? `${royxat.length} ta topildi` : `${royxat.length} ta mahsulot`));
  $('#natija-soni').className = uy ? 'ichki' : 'ichki ozgina';

  if (bosh) {
    $('#bosh-matn').textContent = holat.qidiruv
      ? `«${holat.qidiruv}» bo‘yicha hech nima topilmadi`
      : 'Bu bo‘limda mahsulot yo‘q';
  }

  const quti = $('#mahsulotlar');
  quti.innerHTML = '';
  kuzatuvchi?.disconnect();
  holat.korsatilgan = 0;
  holat.royxat = royxat;
  yanaChiz();
}

/**
 * Foydalanuvchiga MOSLIK yorlig'i.
 * Soxta emas: oxirgi tahlildagi muammolar va profildagi teri turi bilan
 * solishtiriladi. Mos kelmasa yorliq umuman chiqmaydi.
 */
function moslikTegi(p) {
  const teri = holat.user?.teri_turi || '';
  const muammolar = new Set((holat.tahlil?.problems || []).map((m) => m.kalit).filter(Boolean));
  const pm = (p.concerns || []).filter((c) => muammolar.has(c));
  if (pm.length) {
    const nom = { akne:'Aknega', teshik:'Teshiklarga', yoglilik:'Yog‘lanishga',
      quruqlik:'Quruqlikka', qizarish:'Qizarishga', dog:'Dog‘larga', ajin:'Ajinlarga',
      xiralik:'Yorqinlikka', sezgirlik:'Sezgir teriga', quyosh:'Quyoshdan' }[pm[0]];
    return { matn: `${nom || 'Sizga'} mos`, sinf: 'teg-qizil' };
  }
  if (teri && (p.skin_types || []).includes(teri)) return { matn: 'Sizga mos', sinf: 'teg-yashil' };
  if (teri && (p.skin_types || []).includes('barcha')) return { matn: 'Sizga mos', sinf: 'teg-yashil' };
  return null;
}

/** ★ reyting — FAQAT manba do'kondan kelgan haqiqiy son bo'lsa. */
const reytingHtml = (p) => (p.sharh_soni > 0 && p.reyting > 0)
  ? `<span class="mreyting">${ik('yulduz', 12)}${Number(p.reyting).toFixed(1)}
       <span class="soni">(${p.sharh_soni})</span></span>`
  : '';

function kartaHtml(p) {
  const nishonlar = [];
  if (p.stock === 0) nishonlar.push('<span class="nishon-kichik yoq">Tugagan</span>');
  else if (p.stock <= 3) nishonlar.push(`<span class="nishon-kichik">Oxirgi ${p.stock} ta</span>`);
  const chegirma = p.old_price && p.old_price > p.price
    ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  if (chegirma >= 5) nishonlar.push(`<span class="nishon-kichik chegirma">−${chegirma}%</span>`);

  const sevimli = holat.sevimlilar?.has(p.id);
  const teg = moslikTegi(p);
  const savatda = holat.savat.some((r) => r.products.id === p.id);

  return `
  <button class="mahsulot" data-id="${p.id}">
    ${rasmHtml(p, '', `${nishonlar.length ? `<span class="nishonlar">${nishonlar.join('')}</span>` : ''}
      <i class="yurak ${sevimli ? 'faol' : ''}" data-yurak="${p.id}"
         role="button" aria-label="Sevimlilarga">${ik('yurak', 17)}</i>`)}
    <div class="mtan">
      <div class="mbrend">${esc(p.brand || '')}</div>
      <div class="mnom">${esc(nomi(p))}</div>
      ${reytingHtml(p)}
      <div class="mnarx">${qisqaNarx(p.price)} so‘m${
        p.old_price && p.old_price > p.price ? `<s>${qisqaNarx(p.old_price)}</s>` : ''}</div>
      <div class="mpast">
        ${teg ? `<span class="teg-mos ${teg.sinf}">${esc(teg.matn)}</span>` : '<span></span>'}
        ${p.stock > 0
          ? `<i class="karta-qosh ${savatda ? 'qoshildi' : ''}" data-tez="${p.id}"
               role="button" aria-label="Savatga">${ik(savatda ? 'tasdiq' : 'plyus', 17)}</i>`
          : ''}
      </div>
    </div>
  </button>`;
}

/**
 * Mahsulot kartasi bosildi. Yurakcha va «+» kartani OCHMAYDI —
 * ular karta ichidagi mustaqil amallar.
 */
function kartaBosildi(e, el) {
  const y = e.target.closest('[data-yurak]');
  if (y) { e.stopPropagation(); return sevimliAlmash(Number(y.dataset.yurak)); }
  const t = e.target.closest('[data-tez]');
  if (t) {
    e.stopPropagation();
    const id = Number(t.dataset.tez);
    if (holat.savat.some((r) => r.products.id === id)) return void tabOch('savat');
    t.classList.add('qoshildi'); t.innerHTML = ik('tasdiq', 17);
    return void savatga(id);
  }
  mahsulotOyna(Number(el.dataset.id));
}

/** Sevimlilar — yurakcha. Avval ekranda, keyin serverda. */
async function sevimliAlmash(id) {
  const bor = holat.sevimlilar.has(id);
  if (bor) holat.sevimlilar.delete(id); else holat.sevimlilar.add(id);
  titra();
  $$(`[data-yurak="${id}"]`).forEach((el) => el.classList.toggle('faol', !bor));
  try {
    await api('/api/sevimli', { method: 'POST',
      body: JSON.stringify({ product_id: id, olib_tashla: bor }) });
  } catch {
    // Serverga yetmadi — ekrandagini qaytaramiz
    if (bor) holat.sevimlilar.add(id); else holat.sevimlilar.delete(id);
    $$(`[data-yurak="${id}"]`).forEach((el) => el.classList.toggle('faol', bor));
  }
}

async function sevimlilarniYukla() {
  try {
    const j = await api('/api/sevimli');
    holat.sevimlilar = new Set((j.idlar || []).map(Number));
  } catch { /* keyingi safar */ }
}

/** Keyingi bo'lakni qo'shadi va oxiriga "kuzatgich" qo'yadi. */
function yanaChiz() {
  const quti = $('#mahsulotlar');
  const royxat = holat.royxat || [];
  const bolak = royxat.slice(holat.korsatilgan, holat.korsatilgan + SAHIFA);
  if (!bolak.length) return;

  const vaqtinchalik = document.createElement('div');
  vaqtinchalik.innerHTML = bolak.map(kartaHtml).join('');
  const yangilar = [...vaqtinchalik.children];
  yangilar.forEach((el) => {
    el.onclick = (e) => kartaBosildi(e, el);
    quti.appendChild(el);
  });
  holat.korsatilgan += bolak.length;

  // Eski kuzatgichni olib tashlaymiz
  $('#yana-nishon')?.remove();
  kuzatuvchi?.disconnect();

  if (holat.korsatilgan < royxat.length) {
    const nishon = document.createElement('div');
    nishon.id = 'yana-nishon';
    nishon.className = 'yana-nishon';
    nishon.innerHTML = '<div class="aylana kichik"></div>';
    quti.appendChild(nishon);

    // Ekranga yaqinlashganda keyingi bo'lakni qo'shamiz
    kuzatuvchi = new IntersectionObserver((yozuvlar) => {
      if (yozuvlar.some((y) => y.isIntersecting)) yanaChiz();
    }, { rootMargin: '600px' });
    kuzatuvchi.observe(nishon);
  }
}

// Qidiruv
const qidiruvEl = $('#qidiruv');
let qidiruvTimer;
qidiruvEl.oninput = (e) => {
  holat.qidiruv = e.target.value;
  kor($('#qidiruv-tozala'), Boolean(holat.qidiruv));
  clearTimeout(qidiruvTimer);
  qidiruvTimer = setTimeout(katalogniChiz, 140);
};
$('#qidiruv-tozala').onclick = () => {
  holat.qidiruv = ''; qidiruvEl.value = '';
  kor($('#qidiruv-tozala'), false); katalogniChiz();
};
$('#t-filtr-tozala').onclick = () => {
  holat.qidiruv = ''; qidiruvEl.value = '';
  holat.kategoriya = 'hammasi'; holat.narxFiltr = 'hammasi'; holat.saralash = 'ommabop';
  kor($('#qidiruv-tozala'), false);
  filtrlarniChiz(); katalogniChiz();
};
$('#filtr-tugma').onclick = () => { filtrOyna(); titra(); };
addEventListener('scroll', () => {
  $('#qidiruv-quti')?.classList.toggle('suzuvchi', scrollY > 140);
}, { passive: true });

// ---------------- Mahsulot oynasi ----------------
function mahsulotOyna(id) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  if (!p) return;
  titra();
  const savatda = holat.savat.find((s) => s.products.id === id)?.quantity || 0;

  // Har ma'lumot ALOHIDA rangli plitka: ilgari hammasi bir xil kulrang
  // jadval bo'lib turardi va muhimi ko'zga tashlanmasdi.
  const plitka = (ikon, sarlavha, qiymat, tus) => `
    <div class="plitka ${tus}">
      <span class="plitka-bosh">${ik(ikon, 14)}${sarlavha}</span>
      <span class="plitka-qiymat">${qiymat}</span>
    </div>`;

  $('#modal-tan').innerHTML = `
    ${rasmHtml(p, p.poster_id ? 'aspect-ratio:1/1' : 'aspect-ratio:16/9',
      `<i class="yurak ${holat.sevimlilar?.has(p.id) ? 'faol' : ''}" data-yurak="${p.id}"
          role="button" aria-label="Sevimlilarga">${ik('yurak', 18)}</i>`)}
    <div style="padding:18px 18px 0">
      <div class="mbrend">${esc(p.brand || '')}</div>
      <h2 style="margin:5px 0 8px">${esc(nomi(p))}</h2>

      <!-- Reyting va sotuv soni: ikkalasi ham HAQIQIY ma'lumot bo'lsa chiqadi -->
      <div class="oyna-baho">
        ${(p.sharh_soni > 0 && p.reyting > 0)
          ? `<span class="mreyting">${ik('yulduz', 14)}${Number(p.reyting).toFixed(1)}
               <span class="soni">(${p.sharh_soni} sharh)</span></span>`
          : (p.manba_sharh > 0 && p.manba_reyting > 0)
            ? `<span class="mreyting manba">${ik('yulduz', 14)}${Number(p.manba_reyting).toFixed(1)}
                 <span class="soni">Koreyada · ${p.manba_sharh} sharh</span></span>` : ''}
        ${p.sold_count > 0 ? `<span class="ozgina">${p.sold_count}+ sotildi</span>` : ''}
      </div>

      <div class="narx-satr">
        <span class="narx-katta">${narx(p.price)}</span>
        ${p.old_price && p.old_price > p.price
          ? `<s>${narx(p.old_price)}</s>
             <span class="chegirma-nishon">−${Math.round((1 - p.price / p.old_price) * 100)}%</span>` : ''}
      </div>

      ${(() => {
        const t = moslikTegi(p);
        const teri = holat.user?.teri_turi;
        return (t || teri) ? `<div class="oyna-teglar">
          ${t ? `<span class="teg-mos ${t.sinf}">${esc(t.matn)}</span>` : ''}
          ${teri && (p.skin_types || []).includes(teri)
            ? `<span class="teg-mos teg-yashil">${esc(teri)} teriga</span>` : ''}
        </div>` : '';
      })()}

      ${p.description ? `<p class="tavsif">${esc(p.description)}</p>` : ''}

      <div class="plitkalar">
        ${p.volume  ? plitka('shisha', 'Hajmi', esc(p.volume), 'urgu') : ''}
        ${p.country ? plitka('quti', 'Ishlab chiqarilgan',
            esc(p.country === 'KR' ? 'Koreya' : p.country), 'sariq') : ''}
        ${plitka('quti', 'Omborda', p.stock > 0 ? `${p.stock} dona` : 'tugagan',
            p.stock > 0 ? 'yashil' : 'qizil')}
        ${p.skin_types?.length
          ? plitka('tomchi', 'Teri turi', p.skin_types.map(esc).join(', '), 'kul') : ''}
      </div>

      ${p.concerns?.length ? `
        <div class="bolim">
          <div class="bolim-bosh">${ik('tozalik', 16)}Nimaga yordam beradi</div>
          <div class="teglar">${p.concerns.map((c) => `<span class="teg">${esc(c)}</span>`).join('')}</div>
        </div>` : ''}

      ${p.usage_text ? `
        <div class="bolim quti-urgu">
          <div class="bolim-bosh">${ik('soat', 16)}Qanday foydalanish</div>
          <p>${esc(p.usage_text)}</p>
        </div>` : ''}

      ${p.ingredients ? `
        <div class="bolim quti-yashil">
          <div class="bolim-bosh">${ik('barg', 16)}Tarkibi</div>
          <p>${esc(p.ingredients)}</p>
        </div>` : ''}

      ${p.warnings ? `
        <div class="bolim quti-qizil">
          <div class="bolim-bosh">${ik('ogoh', 16)}Ehtiyot bo‘ling</div>
          <p>${esc(p.warnings)}</p>
        </div>` : ''}

      <div id="sharh-bolim" class="bolim"></div>

      <button class="asosiy" style="margin-top:18px" id="t-savatga" ${p.stock > 0 ? '' : 'disabled'}>
        ${p.stock > 0
          ? `${ik('savat', 18)}${savatda ? `Savatda (${savatda}) · yana qo‘shish` : 'Savatga qo‘shish'}`
          : 'Omborda yo‘q'}
      </button>
    </div>`;
  modalOch();
  sharhlarniYukla(p.id);
  const t = $('#t-savatga');
  if (t && p.stock > 0) t.onclick = async () => { await savatga(p.id); modalYop(); };
  const y = $('#modal-tan [data-yurak]');
  if (y) y.onclick = (e) => { e.stopPropagation(); sevimliAlmash(p.id); };
}
// ================= SHARHLAR =================
// Sharh HAQIQIY: uni faqat shu mahsulotni SOTIB OLGAN odam yozadi
// (serverda tekshiriladi), reyting esa shu sharhlardan hisoblanadi.
// Koreys do'konidagi baho alohida — «Koreyada» yorlig'i bilan.

const YULDUZLAR = (n, olcham = 14) => Array.from({ length: 5 }, (_, i) =>
  `<i class="yld ${i < n ? 'faol' : ''}">${ik('yulduz', olcham)}</i>`).join('');

const sanaQisqa = (t) => new Date(t).toLocaleDateString('uz-UZ',
  { day: 'numeric', month: 'short', year: 'numeric' });

async function sharhlarniYukla(id) {
  const quti = $('#sharh-bolim');
  if (!quti) return;
  quti.innerHTML = `<div class="yuklanmoqda"><div class="aylana"></div></div>`;
  let j;
  try { j = await api(`/api/sharhlar?product_id=${id}`); }
  catch { quti.innerHTML = ''; return; }

  const meniki = j.sharhlar.find((x) => x.meniki);
  const boshqalar = j.sharhlar.filter((x) => !x.meniki);

  quti.innerHTML = `
    <div class="bolim-bosh">${ik('yulduz', 16)}Sharhlar
      <span class="ozgina" style="margin-left:auto">${j.sharhlar.length} ta</span></div>

    ${meniki ? `
      <div class="sharh meniki">
        <div class="sharh-bosh">
          <span class="yulduzlar">${YULDUZLAR(meniki.baho)}</span>
          <span class="ozgina">Sizning sharhingiz</span>
        </div>
        ${meniki.matn ? `<p>${esc(meniki.matn)}</p>` : ''}
        <div class="sharh-amal">
          <button class="matn-tugma" data-sharh-tahrir="1">${ik('tahrir', 15)}O‘zgartirish</button>
          <button class="matn-tugma xavf" data-sharh-ochir="1">${ik('ochirish', 15)}O‘chirish</button>
        </div>
      </div>` : (j.yozsa_boladi ? `
      <button class="ikkilamchi" id="t-sharh-yoz" style="margin-bottom:12px">
        ${ik('tahrir', 17)}Sharh yozish</button>` : `
      <p class="ozgina" style="margin:0 0 12px">
        Sharhni faqat shu mahsulotni sotib olgan mijozlar yozadi.</p>`)}

    ${boshqalar.length ? boshqalar.map((x) => `
      <div class="sharh">
        <div class="sharh-bosh">
          <span class="yulduzlar">${YULDUZLAR(x.baho)}</span>
          <b>${esc(x.ism)}</b>
          <span class="ozgina">${sanaQisqa(x.created_at)}</span>
        </div>
        ${x.matn ? `<p>${esc(x.matn)}</p>` : ''}
      </div>`).join('')
      : (meniki ? '' : `<p class="ozgina" style="margin:0">Hali sharh yo‘q — birinchi bo‘ling.</p>`)}`;

  const yoz = $('#t-sharh-yoz');
  if (yoz) yoz.onclick = () => sharhOyna(id, null);
  const th = $('[data-sharh-tahrir]', quti);
  if (th) th.onclick = () => sharhOyna(id, meniki);
  const oc = $('[data-sharh-ochir]', quti);
  if (oc) oc.onclick = async () => {
    try {
      await api('/api/sharh', { method: 'DELETE', body: JSON.stringify({ product_id: id }) });
      titra(); await katalogniYangila(); sharhlarniYukla(id);
    } catch (e) { ogohlantir(e.message); }
  };
}

/** Sharh yozish oynasi — modal ustiga modal ochmaymiz, o'rnini almashtiramiz. */
function sharhOyna(id, joriy) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  let baho = joriy?.baho || 5;
  const chiz = () => {
    $('#modal-tan').innerHTML = `
      <div style="padding:18px 18px 0">
        <h2 style="margin-bottom:4px">${joriy ? 'Sharhni o‘zgartirish' : 'Sharh yozish'}</h2>
        <p class="ozgina" style="margin-bottom:16px">${esc(nomi(p))}</p>

        <div class="baho-tanlov" id="baho-tanlov">
          ${Array.from({ length: 5 }, (_, i) => `
            <button data-baho="${i + 1}" class="${i < baho ? 'faol' : ''}"
              aria-label="${i + 1} yulduz">${ik('yulduz', 30)}</button>`).join('')}
        </div>
        <div class="baho-matn">${['', 'Yomon', 'Qoniqarli', 'Yaxshi', 'Juda yaxshi', 'Zo‘r'][baho]}</div>

        <label for="sharh-matn">Fikringiz (ixtiyoriy)</label>
        <textarea id="sharh-matn" maxlength="600" rows="4"
          placeholder="Nima yoqdi, nima yoqmadi? Qancha vaqt ishlatdingiz?">${esc(joriy?.matn || '')}</textarea>

        <button class="asosiy" id="t-sharh-saqla" style="margin-top:16px">Yuborish</button>
        <button class="ikkilamchi" id="t-sharh-bekor" style="margin-top:9px">Bekor</button>
      </div>`;
    // Buyurtmalar ro'yxatidan chaqirilganda modal hali ochiq emas
    modalOch();
    $$('#baho-tanlov [data-baho]').forEach((b) => b.onclick = () => {
      baho = Number(b.dataset.baho); titra(); chiz();
    });
    $('#t-sharh-bekor').onclick = () =>
      (holat.mahsulotlar.some((x) => x.id === id) && holat.tab !== 'profil')
        ? mahsulotOyna(id) : modalYop();
    $('#t-sharh-saqla').onclick = async () => {
      try {
        await api('/api/sharh', { method: 'POST', body: JSON.stringify({
          product_id: id, baho, matn: $('#sharh-matn').value }) });
        titra('medium');
        await katalogniYangila();
        if (holat.tab === 'profil') { modalYop(); buyurtmalarniChiz({ majburiy: true }); }
        else mahsulotOyna(id);
      } catch (e) { ogohlantir(e.message); }
    };
  };
  chiz();
}

/** Reyting o'zgargach katalogni yangilaymiz — kartadagi ★ ham yangilansin. */
async function katalogniYangila() {
  try {
    const k = await api('/api/catalog');
    const yangi = new Map(k.mahsulotlar.map((p) => [p.id, p]));
    holat.mahsulotlar.forEach((p) => {
      const y = yangi.get(p.id);
      if (y) { p.reyting = y.reyting; p.sharh_soni = y.sharh_soni; }
    });
  } catch { /* keyingi ochilishda yangilanadi */ }
}

const qtr = (k, v) => `<div class="qtr"><span class="k">${k}</span><span class="v">${v}</span></div>`;
/**
 * Oyna ochish/yopish.
 * Telegram'ning "orqaga" tugmasi ham oynani yopadi — Android'da odam
 * avval o'shani bosadi, aks holda butun ilovadan chiqib ketardi.
 */
function modalOch() {
  kor($('#modal'), true);
  try { tg?.BackButton?.show?.(); } catch {}
}
const modalYop = () => {
  kor($('#modal'), false);
  try { tg?.BackButton?.hide?.(); } catch {}
};
try { tg?.BackButton?.onClick?.(() => modalYop()); } catch {}
$$('[data-yop]').forEach((el) => el.onclick = modalYop);

// ---------------- Skaner ----------------
let tanlanganRasm = null;
let tanlanganMime = 'image/jpeg';
$('#tushirish').onclick = () => $('#fayl').click();
$('#fayl').onchange = async (e) => {
  const fayl = e.target.files?.[0];
  if (!fayl) return;
  if (fayl.size > 20 * 1024 * 1024) return ogohlantir('Rasm juda katta (20 MB dan ortiq).');
  const r = await rasmniTayyorla(fayl);
  if (!r) return ogohlantir('Rasmni o‘qib bo‘lmadi. Boshqa surat tanlang.');
  tanlanganRasm = r.data; tanlanganMime = r.mime;
  $('#oldindan-rasm').src = r.data;
  kor($('#skaner-boshlash'), false); kor($('#skaner-oldindan'), true);
};
$('#t-boshqa').onclick = () => {
  tanlanganRasm = null; $('#fayl').value = '';
  kor($('#skaner-oldindan'), false); kor($('#skaner-boshlash'), true);
};
$('#t-tahlil').onclick = tahlilQil;

/** Skaner ekranida qolgan limitni ko'rsatadi. */
function limitniChiz() {
  const L = holat.limit;
  let el = $('#limit-satr');
  if (!L || !L.yoqilgan) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'limit-satr'; el.className = 'limit-satr';
    $('#tab-skaner').insertBefore(el, $('#skaner-boshlash'));
  }
  el.classList.toggle('tugadi', L.qolgan === 0);
  el.innerHTML = L.qolgan === 0
    ? `<span>Bugungi limit tugadi. ${L.mijoz ? 'Ertaga yana ochiladi.'
        : '<b>Xarid qilsangiz limit oshadi.</b>'}</span>`
    : `<span>Bugun yana <b>${L.qolgan} ta</b> tahlil qilishingiz mumkin
        <span class="ozgina">(${L.ishlatilgan}/${L.limit})</span></span>`;
}

/**
 * Rasmni yuklashga tayyorlaydi.
 * Brauzer formatni o'qiy olsa — kichraytirib JPEG qiladi (tez va yengil).
 * O'qiy olmasa (masalan Android'da iPhone HEIC fayli) — faylni o'z holicha
 * yuboramiz, AI HEIC/HEIF/WebP ni ham qabul qiladi.
 */
function rasmniTayyorla(fayl, max = 1024, sifat = 0.85) {
  return new Promise((res) => {
    const url = URL.createObjectURL(fayl);
    const o = new Image();
    const xom = () => {
      URL.revokeObjectURL(url);
      const fr = new FileReader();
      fr.onload = () => res({ data: fr.result, mime: fayl.type || 'image/jpeg', xom: true });
      fr.onerror = () => res(null);
      fr.readAsDataURL(fayl);
    };
    o.onload = () => {
      try {
        const n = Math.min(1, max / Math.max(o.width, o.height));
        const c = document.createElement('canvas');
        c.width = Math.round(o.width * n); c.height = Math.round(o.height * n);
        c.getContext('2d').drawImage(o, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res({ data: c.toDataURL('image/jpeg', sifat), mime: 'image/jpeg', xom: false });
      } catch { xom(); }
    };
    o.onerror = xom;          // brauzer formatni tanimadi
    o.src = url;
  });
}

/** Eski nom — poster/chek uchun ishlatiladi. */
async function kichiklashtir(fayl, max = 1024, sifat = 0.85) {
  const r = await rasmniTayyorla(fayl, max, sifat);
  if (!r) throw new Error('Rasmni o‘qib bo‘lmadi');
  return r.data;
}

async function tahlilQil() {
  if (!tanlanganRasm) return;
  kor($('#skaner-oldindan'), false); kor($('#skaner-yuklanmoqda'), true);
  try {
    const j = await api('/api/scan', { method: 'POST',
      body: JSON.stringify({ image: tanlanganRasm, mime: tanlanganMime }) });
    kor($('#skaner-yuklanmoqda'), false);
    if (!j.yaroqli) {
      kor($('#skaner-boshlash'), true);
      radOyna(j);
      return;
    }
    holat.tahlil = {
      id: j.analysisId || null,
      age_estimate: j.tahlil.taxminiy_yosh, skin_tone: j.tahlil.teri_rangi,
      skin_type: j.tahlil.teri_turi, score: j.tahlil.ball,
      problems: j.tahlil.muammolar, forecast: j.tahlil.prognoz,
      routine: j.tahlil.tavsiya, raw: { xulosa: j.tahlil.xulosa }, is_offline: j.tahlil.oflayn,
      yuz_rasm_id: j.yuz_rasm_id || null,
    };
    holat.limit = j.limit || holat.limit;
    kor($('#skaner-boshlash'), true);
    tanlanganRasm = null; $('#fayl').value = '';
    holat.natijaKesh = null;
    natijaniChiz(); tabOch('natija'); titra('medium');
    limitniChiz();
  } catch (e) {
    kor($('#skaner-yuklanmoqda'), false); kor($('#skaner-boshlash'), true);
    if (e.limit) { holat.limit = e.limit; limitniChiz(); limitOyna(e.limit); return; }
    ogohlantir(e.message);
  }
}

function limitOyna(L) {
  $('#modal-tan').innerHTML = `
    <div style="padding:28px 22px 0;text-align:center">
      <div style="font-size:52px">⏳</div>
      <h2 style="margin:12px 0 6px">Bugungi limit tugadi</h2>
      <p class="mayda">Bugun ${L.ishlatilgan} ta tahlil qildingiz (kuniga ${L.limit} ta).</p>
      ${L.mijoz ? `<div class="ogoh" style="margin-top:16px;text-align:left">
          Ertaga yana ${L.limit} ta tahlil ochiladi.</div>`
        : `<div class="ogoh yashil" style="margin-top:16px;text-align:left">
          ${ik('sovga',16)} <b>Bizdan xarid qilsangiz</b> kunlik limit oshadi — tahlilni ko‘proq qilasiz.</div>`}
      <button class="asosiy" id="t-limit-dokon" style="margin-top:18px">${ik('dokon',18)}Do‘konga o‘tish</button>
      <button class="ikkilamchi" id="t-limit-yop" style="margin-top:9px">Yopish</button>
    </div>`;
  modalOch();
  $('#t-limit-dokon').onclick = () => { modalYop(); tabOch('katalog'); };
  $('#t-limit-yop').onclick = modalYop;
}

const RAD = {
  yuz_yoq:['Rasmda yuz topilmadi'], uzoq:['Yuz juda uzoqda'],
  xira:['Rasm xira yoki qimirlagan'], qorongi:['Yorug‘lik yetarli emas'],
  yopiq:['Yuz yopilgan'], bir_nechta:['Kadrda bir nechta odam'],
  pardoz:['Qalin pardoz yoki filtr'], sunday:['Rasm sun’iy ko‘rinadi'],
  ekran:['Ekrandan olingan surat'], yuz_emas:['Bu yuz surati emas'],
};
function radOyna(j) {
  const [matn] = RAD[j.sabab] || RAD.xira;
  $('#modal-tan').innerHTML = `
    <div style="padding:24px 18px 0;text-align:center">
      <div style="color:var(--qizil);display:grid;place-items:center">${ik('ogoh', 48)}</div>
      <h2 style="margin:10px 0 6px">Bu rasm to‘g‘ri kelmadi</h2>
      <p style="color:var(--qizil);font-weight:600">${esc(matn)}</p>
      ${j.izoh ? `<p class="mayda">${esc(j.izoh)}</p>` : ''}
      <div style="text-align:left;margin-top:16px">
        <div class="talab"><span class="b">${ik('quyosh',19)}</span><div>Yorug‘ joyda turing</div></div>
        <div class="talab"><span class="b">${ik('selfi',19)}</span><div>Yuz ekranni to‘ldirsin</div></div>
        <div class="talab"><span class="b">${ik('tozalik',19)}</span><div>Pardozsiz, filtrsiz, haqiqiy surat</div></div>
      </div>
      <button class="asosiy" id="t-rad-yop" style="margin-top:18px">${ik('kamera',18)}Boshqa rasm tanlash</button>
    </div>`;
  modalOch();
  $('#t-rad-yop').onclick = () => { modalYop(); $('#fayl').click(); };
}

// ---------------- Tahlil natijasi ----------------
// Daraja rangi CSS dan keladi — emoji har telefonda boshqacha chiziladi
const NUQTA = ['', '<span class="daraja d1"></span>', '<span class="daraja d2"></span>', '<span class="daraja d3"></span>'];
const DARAJA = ['', 'yengil', 'o‘rtacha', 'kuchli'];
const DSINF  = ['', 'yengil', 'ortacha', 'kuchli'];
const BOSQICH = { tozalash:'Tozalash', toner:'Toner', davolash:'Davolash',
                  namlash:'Namlash', himoya:'Quyoshdan himoya', qoshimcha:'Qo‘shimcha',
                  ichki:'Ichki qabul' };

function natijaniChiz() {
  const t = holat.tahlil;
  const el = $('#natija-tan');
  holat.natijaKesh = true;   // qayta chizmaslik uchun belgi
  if (!t) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">${ik('skaner',46)}</div>
      <p>Hali tahlil qilinmagan</p>
      <button class="asosiy" style="max-width:260px;margin:16px auto 0" onclick="document.querySelector('[data-tab=skaner]').click()">
        Yuz skanerini ochish</button></div>`;
    return;
  }
  const karta = new Map(holat.mahsulotlar.map((p) => [p.id, p]));
  const ball = t.score ?? 0;
  const holatSoz = ball >= 80 ? 'a’lo' : ball >= 65 ? 'yaxshi' : ball >= 50 ? 'o‘rtacha'
                 : ball >= 35 ? 'e’tibor kerak' : 'zaif';
  const asl = (t.routine || []).map((r) => ({ ...r, p: karta.get(r.product_id) })).filter((r) => r.p);
  const tavsiyalar = holat.arzon ? asl.map(arzonAlmashtir) : asl;
  const jami    = tavsiyalar.reduce((s, r) => s + r.p.price, 0);
  const aslJami = asl.reduce((s, r) => s + r.p.price, 0);
  // Arzonroq variant umuman bormi — yo'q bo'lsa tugmani ko'rsatmaymiz
  const arzonBor = asl.some((r) => arzonAlmashtir(r).almashdi);
  const tejash = Math.max(0, aslJami - jami);

  el.innerHTML = `
  <div class="bosh"><div class="brend">Tahlil natijasi</div><h1>Sizning teringiz</h1></div>

  ${t.is_offline ? `<div class="karta"><div class="ogoh">AI hozir mavjud emas — bazaviy tavsiya ko‘rsatilmoqda.</div></div>` : ''}

  ${t.yuz_rasm_id ? `
  <div class="karta">
    <div class="yuz-quti"><img src="/media/${esc(t.yuz_rasm_id)}" alt="Tahlil qilingan surat"></div>
  </div>` : ''}

  <div class="karta">
    <div class="karta-bosh"><h2>Umumiy holat</h2></div>
    <div style="display:flex;align-items:baseline;gap:10px">
      <div class="ball">${ball}<small>/100</small></div>
      <div class="mayda">${holatSoz}</div>
    </div>
    <div class="shkala"><i style="width:${ball}%"></i></div>
    <div style="margin-top:16px">
      ${qtr('Taxminiy yosh', esc(t.age_estimate || '—'))}
      ${qtr('Teri rangi',   esc(t.skin_tone || '—'))}
      ${qtr('Teri turi',    esc(t.skin_type || '—'))}
    </div>
    ${t.raw?.xulosa ? `<p class="mayda" style="margin:14px 0 0">${esc(t.raw.xulosa)}</p>` : ''}
  </div>

  ${(t.problems || []).length ? `
  <div class="karta">
    <div class="karta-bosh"><h2>Nima topdim</h2></div>
    ${t.problems.map((m, i) => {
      const foiz = m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25);
      const d = m.daraja || (foiz >= 70 ? 3 : foiz >= 40 ? 2 : 1);
      return `
      <div class="muammo-blok">
        <div class="muammo-bosh">
          <span class="muammo-raqam d${d}">${i + 1}</span>
          <span class="nom">${esc(m.nom)}</span>
          <span class="yorliq ${DSINF[Math.min(3, d)]}">${DARAJA[Math.min(3, d)]}</span>
        </div>
        <div class="olchov">
          <div class="olchov-chiziq"><i class="d${Math.min(3, d)}" style="width:${foiz}%"></i></div>
          <span class="olchov-foiz">${foiz}%</span>
        </div>
        ${m.zona   ? `<div class="satr-izoh"><span>${esc(m.zona)}</span></div>` : ''}
        ${m.izoh   ? `<div class="satr-izoh"><span>${esc(m.izoh)}</span></div>` : ''}
        ${m.sabab  ? `<div class="satr-izoh"><span><b>Sababi:</b> ${esc(m.sabab)}</span></div>` : ''}
        ${m.yechim ? `<div class="yechim"><span><b>Yechimi:</b> ${esc(m.yechim)}</span></div>` : ''}
        ${m.ogohlantirish ? `<div class="diqqat"><span>${esc(m.ogohlantirish)}</span></div>` : ''}
      </div>`; }).join('')}
  </div>` : ''}

  ${(t.forecast || []).length ? `
  <div class="karta">
    <div class="karta-bosh"><h2>E’tibor bermasangiz</h2></div>
    ${[...t.forecast].sort((a, b) => b.ehtimol - a.ehtimol).map((p) => `
      <div class="muammo-blok">
        <div class="muammo-bosh">
          <span class="nom">${esc(p.muammo)}</span>
          <span class="ozgina" style="margin-left:auto;white-space:nowrap">${esc(p.muddat || '')}</span>
        </div>
        <div class="olchov">
          <div class="olchov-chiziq"><i class="prognoz-rang" style="width:${p.ehtimol}%"></i></div>
          <span class="olchov-foiz">${p.ehtimol}%</span>
        </div>
        <div class="satr-izoh"><span>${esc(p.natija)}</span></div>
      </div>`).join('')}
    <div class="ogoh" style="margin-top:12px">
      ${ik('tibbiy',15)} Bu ehtimollik baholari, tibbiy tashxis emas. Jiddiy belgilarda dermatologga murojaat qiling.
    </div>
  </div>` : ''}

  ${tavsiyalar.length ? `
  <div class="satr-bosh"><h2 style="font-size:20px">Sizga mos parvarish</h2>
    <span class="ozgina">${tavsiyalar.length} ta</span></div>
  <p class="ichki ozgina" style="margin:0 0 10px">Shu tartibda qo‘llang — ketma-ketlik natijaga ta’sir qiladi.</p>

  <!-- Gorizontal lenta: kartochkalar kichik, rasmi bilan; ostida
       nima uchun kerakligi 1-2 so'zda (Tozalash, Quyoshdan himoya…) -->
  <div class="tavsiya-lenta">
    ${tavsiyalar.map((r, i) => `
      <button class="tavsiya-karta" data-tavsiya="${r.p.id}">
        <span class="tk-rasm" style="${r.p.poster_id ? '' :
          `background:linear-gradient(135deg,${esc(r.p.gradient?.[0] || '#3a3330')},${esc(r.p.gradient?.[1] || '#6b5d55')})`}">
          ${r.p.poster_id ? `<img src="/media/${esc(r.p.poster_id)}?w=200" alt="" loading="lazy">`
                          : ik('shisha', 26)}
          <i class="tk-raqam">${i + 1}</i></span>
        <span class="tk-bosqich">${esc(BOSQICH[r.bosqich] || r.bosqich)}</span>
        <span class="tk-nom">${esc(nomi(r.p))}</span>
        <span class="tk-brend">${esc(r.p.brand || '')}</span>
        <span class="tk-narx">${narx(r.p.price)}</span>
      </button>`).join('')}
  </div>

  <div class="karta">
    ${tavsiyalar.map((r, i) => r.sabab ? `
      <div class="nega-satr">
        <span class="nega-raqam">${i + 1}</span>
        <span><b>${esc(BOSQICH[r.bosqich] || r.bosqich)}</b> — ${esc(r.sabab)}</span>
      </div>` : '').join('')}
    <div class="qtr jami"><span class="k">To‘liq to‘plam</span><span class="v">${narx(jami)}</span></div>
    ${holat.arzon && tejash ? `<div class="tejash">${ik('tasdiq',15)}
      Arzonroq variantda <b>${narx(tejash)}</b> tejaysiz</div>` : ''}
    <button class="asosiy" id="t-hammasi" style="margin-top:12px">${ik('savat',18)}Hammasini savatga solish</button>
    ${arzonBor || holat.arzon ? `
      <button class="ikkilamchi" id="t-arzon" style="margin-top:9px">
        ${ik('almash',18)}${holat.arzon ? 'Asl tavsiyani ko‘rsatish' : 'Arzonroq variant'}</button>` : ''}
    <p class="ozgina" style="margin:10px 0 0">
      Hammasini birdan olish shart emas — tozalash, namlash va SPF dan boshlang.</p>
  </div>` : ''}

  <div class="karta">
    <button class="asosiy" id="t-ulash" style="margin-bottom:9px">
      ${ik('yuklab',18)}Natijani rasm qilib olish</button>
    <button class="ikkilamchi" id="t-qayta">${ik('kamera',18)}Boshqa rasm bilan qayta tahlil</button>
    ${holat.konsultatsiya ? `<a class="tugma ikkilamchi" style="margin-top:9px;text-decoration:none"
       href="https://t.me/${esc(holat.konsultatsiya)}" target="_blank">Telegramda yozish</a>` : ''}
    ${holat.menejer?.telefon ? `<a class="tugma ikkilamchi" style="margin-top:9px;text-decoration:none"
       href="tel:${esc(String(holat.menejer.telefon).replace(/[^+\d]/g, ''))}">${esc(holat.menejer.telefon)}</a>
       <p class="ozgina" style="margin:8px 0 0;text-align:center">${esc(holat.menejer.ish_vaqti || '')}</p>` : ''}
  </div>`;

  // Tavsiya qilingan mahsulotni bosib ochish
  $$('[data-tavsiya]', el).forEach((b) => b.onclick = (ev) => {
    ev.stopPropagation();
    mahsulotOyna(Number(b.dataset.tavsiya));
  });

  const u = $('#t-ulash');
  if (u) u.onclick = () => natijaniTelegramgaYubor(u);

  const h = $('#t-hammasi');
  if (h) h.onclick = async () => {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam', items: tavsiyalar.map((r) => ({ product_id: r.p.id, quantity: 1 })) })});
    await savatniYangila(); titra('medium'); tabOch('savat');
  };
  const a = $('#t-arzon');
  if (a) a.onclick = () => { holat.arzon = !holat.arzon; titra(); natijaniChiz(); };

  $('#t-qayta').onclick = () => tabOch('skaner');
}

/**
 * Shu bosqichdagi arzonroq mahsulot. AI eng MOSini tanlaydi, lekin
 * u qimmat bo'lishi mumkin — odam boshlash uchun arzonrog'ini olsin.
 * Avval bir xil muammoga ishlaydigani, keyin eng arzoni.
 */
function arzonAlmashtir(r) {
  const muammo = new Set(r.p.concerns || []);
  const mos = (p) => (p.concerns || []).filter((c) => muammo.has(c)).length;
  const nomzod = holat.mahsulotlar
    .filter((p) => p.id !== r.p.id && p.stock > 0 && p.step === r.p.step && p.price < r.p.price)
    .sort((x, y) => mos(y) - mos(x) || x.price - y.price)[0];
  return nomzod ? { ...r, p: nomzod, almashdi: true } : r;
}

async function tavsiyaniSavatgaSol() {
  const t = holat.tahlil?.routine;
  if (!t?.length) return;
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam', items: t.map((x) => ({ product_id: x.product_id, quantity: 1 })) })});
    await savatniYangila();
  } catch {}
}

// ---------------- Natijani rasm qilib olish ----------------
// Rasmni SERVER chizadi va bot orqali yuboradi.
// Sabab: Telegram WebView ichida <a download> ham, navigator.share ham
// ishonchli ishlamaydi — foydalanuvchi tugmani bosardi, hech narsa bo'lmasdi.
// Endi natija to'g'ridan-to'g'ri chatga tushadi: u yerdan saqlash va
// ulashish Telegram'ning o'z vositalari bilan ishlaydi.

async function natijaniTelegramgaYubor(tugma) {
  const eski = tugma.textContent;
  tugma.disabled = true;
  tugma.textContent = 'Yuborilmoqda…';
  try {
    await api('/api/natija-yubor', {
      method: 'POST',
      body: JSON.stringify({ analysis_id: holat.tahlil?.id || null }),
    });
    titra('medium');
    tugma.textContent = 'Chatga yuborildi';
    $('#modal-tan').innerHTML = `
      <div style="padding:18px 18px 0">
        <h2 style="margin-bottom:10px">Natija yuborildi</h2>
        <p style="margin:0 0 12px">Tahlil rasmi Telegram chatingizga tushdi.</p>
        <p class="ozgina" style="margin:0 0 18px">
          Uni o‘sha yerdan galereyaga saqlashingiz yoki do‘stlaringizga
          ulashishingiz mumkin.</p>
        <button class="asosiy" id="t-chatga">${ik('suhbat',18)}Chatni ochish</button>
        <button class="ikkilamchi" id="t-chat-yop" style="margin-top:9px">Yopish</button>
      </div>`;
    modalOch();
    $('#t-chatga').onclick = () => { modalYop(); tg?.close?.(); };
    $('#t-chat-yop').onclick = modalYop;
    setTimeout(() => { tugma.textContent = eski; }, 4000);
  } catch (e) {
    ogohlantir(e.message || 'Yuborib bo‘lmadi.');
    tugma.textContent = eski;
  } finally {
    tugma.disabled = false;
  }
}

// ---------------- Savat ----------------
async function savatniYangila() {
  try { holat.savat = (await api('/api/cart')).savat || []; } catch { holat.savat = []; }
  savatniKorsat();
}

// ═══════════ OPTIMISTIK SAVAT ═══════════
// Tugma bosilganda serverni KUTMAYMIZ: ekranni darhol yangilaymiz,
// so'rovni fonda yuboramiz. Sekin internetda ilova "qotib qolgandek"
// tuyulmaydi. Server rad etsa — orqaga qaytaramiz va sababni aytamiz.

/** Savat nishonini va ro'yxatni darhol qayta chizadi. */
function savatniKorsat() {
  const soni = holat.savat.reduce((s, r) => s + r.quantity, 0);
  for (const id of ['#savat-nishon', '#shapka-savat']) {
    const n = $(id);
    if (n) { n.textContent = soni; kor(n, soni > 0); }
  }
  savatniChiz();
}

/** Serverdan haqiqiy holatni olib, ekranni moslashtiradi. */
// Savatni server bilan tekislash. Har «+» bosilganda darrov emas,
// bosishlar tinchigach BIR MARTA: odam beshta mahsulot qo'shsa beshta
// ortiqcha so'rov ketardi, telefonda esa har so'rov sezilarli.
let sinxronTaymer = null;
function savatniSinxronla() {
  clearTimeout(sinxronTaymer);
  sinxronTaymer = setTimeout(async () => {
    try {
      holat.savat = (await api('/api/cart')).savat || [];
      savatniKorsat();
    } catch { /* keyingi safar */ }
  }, 700);
}

async function savatga(id, soni = 1) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  if (!p) return;

  // 1) Darhol ko'rsatamiz
  const eski = holat.savat.map((r) => ({ ...r }));
  const bor = holat.savat.find((r) => r.products.id === id);
  if (bor) bor.quantity += soni;
  else holat.savat.push({ quantity: soni, products: p });
  savatniKorsat(); titra();

  // 2) Keyin serverga
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: soni }) });
    savatniSinxronla();
  } catch (e) {
    holat.savat = eski; savatniKorsat();
    ogohlantir(e.message);
  }
}

/** Savatdagi jami dona soni (mahsulot xillari emas). */
const donaSoni = () => holat.savat.reduce((s, r) => s + r.quantity, 0);

/**
 * Chegirma: summa pog'onasi + har bir dona uchun qat'iy chegirma.
 * Ikkalasi qo'shiladi — bazadagi place_order ham xuddi shunday hisoblaydi,
 * shuning uchun ekrandagi son to'lov paytida o'zgarmaydi.
 */
function chegirmaHisobla(oraliq, dona = donaSoni()) {
  const pogona = holat.chegirmalar.reduce((m, p) =>
    oraliq >= Number(p.dan) ? Math.max(m, Number(p.chegirma)) : m, 0);
  const d = holat.donaChegirma || { narx: 0, dan: 1 };
  const donaCh = (d.narx > 0 && dona >= (d.dan || 1)) ? d.narx * dona : 0;
  return Math.min(oraliq, pogona + donaCh);
}

/**
 * Savatga qarab QO'SHIMCHA mahsulot taklifi.
 *
 * Soxta emas: savatdagi mahsulotlar qaysi parvarish bosqichlarini
 * qamragani hisoblanadi va YETISHMAYOTGAN bosqichdan eng ommabop
 * mahsulot taklif qilinadi. Hammasi bor bo'lsa taklif chiqmaydi.
 */
const BOSQICH_TARTIB = ['tozalash', 'toner', 'davolash', 'namlash', 'himoya'];
const BOSQICH_TAKLIF = {
  tozalash: 'Pardoz va changni yechmasdan qolgan bosqichlar ishlamaydi',
  toner:    'Toner terini keyingi bosqichga tayyorlaydi',
  davolash: 'Asosiy muammoga ishlaydigan serum yetishmayapti',
  namlash:  'Namlovchi krem ham kerak bo‘lishi mumkin',
  himoya:   'Quyoshdan himoyasiz qolgan bosqichlar bekor bo‘ladi',
};

function qoshimchaTavsiya() {
  if (!holat.savat.length) return null;
  const bor = new Set(holat.savat.map((r) => r.products.step));
  const yetishmagan = BOSQICH_TARTIB.find((b) => !bor.has(b));
  if (!yetishmagan) return null;

  const teri = holat.user?.teri_turi || '';
  const nomzod = holat.mahsulotlar
    .filter((p) => p.step === yetishmagan && p.stock > 0
      && !holat.savat.some((r) => r.products.id === p.id))
    .sort((a, b) => {
      const mos = (p) => (teri && (p.skin_types || []).includes(teri)) ? 1 : 0;
      return mos(b) - mos(a) || (b.sold_count || 0) - (a.sold_count || 0) || a.price - b.price;
    })[0];
  return nomzod ? { p: nomzod, sabab: BOSQICH_TAKLIF[yetishmagan] } : null;
}

function qoshimchaTavsiyaHtml() {
  const t = qoshimchaTavsiya();
  if (!t) return '';
  return `
    <div class="karta ai-taklif">
      <div class="ai-taklif-bosh">${ik('robot', 15)}AI tavsiyasi</div>
      <p>${esc(t.sabab)}.</p>
      <div class="ai-taklif-qator" data-taklif="${t.p.id}">
        <div class="savat-rasm">${t.p.poster_id
          ? `<img src="/media/${esc(t.p.poster_id)}?w=200" alt="" loading="lazy">` : ik('shisha', 26)}</div>
        <div class="savat-tan">
          <div class="savat-brend">${esc(t.p.brand || '')}</div>
          <div class="savat-nom">${esc(nomi(t.p))}</div>
          <div class="savat-narx">${narx(t.p.price)}</div>
        </div>
        <button class="karta-qosh" data-taklif-qosh="${t.p.id}"
          aria-label="Savatga qo‘shish">${ik('plyus', 18)}</button>
      </div>
    </div>`;
}

function savatniChiz() {
  const el = $('#savat-tan');
  $('#yopishqoq-savat')?.remove();

  if (!holat.savat.length) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">${ik('savat',46)}</div>
      <p>Savatingiz bo‘sh</p>
      <button class="asosiy" style="max-width:240px;margin:16px auto 0"
        onclick="document.querySelector('[data-tab=katalog]').click()">Do‘konga o‘tish</button></div>`;
    return;
  }

  const dona     = donaSoni();
  const oraliq   = holat.savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const chegirma = chegirmaHisobla(oraliq, dona);

  // ⚠️ Yetkazish narxi bu yerda KO'RSATILMAYDI.
  // U manzilga (zona, masofa) va og'irlikka bog'liq — savatda taxminiy
  // 25 000 ni ko'rsatib, to'lovda 37 000 chiqarish mijozni aldashdek
  // tuyuladi. Shuning uchun aniq narx faqat manzil tanlangach chiqadi.
  const jami = oraliq - chegirma;

  // Keyingi chegirma pog'onasi
  const keyingi = holat.chegirmalar
    .map((p) => ({ dan: Number(p.dan), ch: Number(p.chegirma) }))
    .filter((p) => oraliq < p.dan).sort((a, b) => a.dan - b.dan)[0];

  // Dona chegirmasi: «yana 2 ta olsangiz yo'l haqi o'zini qoplaydi»
  const d = holat.donaChegirma || { narx: 0, dan: 1 };
  const donaCh = (d.narx > 0 && dona >= (d.dan || 1)) ? d.narx * dona : 0;
  const yetibKelmagan = d.narx > 0 && dona < (d.dan || 1) ? (d.dan || 1) - dona : 0;

  // Minimal buyurtma: yetmasa rasmiylashtirish tugmasi ochilmaydi
  const yetmaydi = holat.minimal > 0 && oraliq < holat.minimal;

  el.innerHTML = `
  <div class="ekran-satr">
    <h2>Savat</h2>
    <button class="belgi-tugma" id="t-savat-tozala" aria-label="Savatni tozalash">
      ${ik('ochirish', 19)}</button>
  </div>
  <div class="karta">
    ${holat.savat.map(({ products: p, quantity }) => `
      <div class="savat-qator">
        <div class="savat-rasm">
          ${p.poster_id ? `<img src="/media/${esc(p.poster_id)}?w=200" alt="" loading="lazy">` : ik('shisha', 28)}</div>
        <div class="savat-tan">
          <div class="savat-nom">${esc(nomi(p))}</div>
          <div class="savat-brend">${esc(p.brand || '')}${p.volume ? ' · ' + esc(p.volume) : ''}</div>
          <div class="savat-past">
            <span class="soni">
              <button data-kam="${p.id}" aria-label="Kamaytirish">−</button>
              <span>${quantity}</span>
              <button data-kop="${p.id}" aria-label="Ko‘paytirish">+</button>
            </span>
            <span class="savat-narx">${qisqaNarx(p.price * quantity)} so'm</span>
          </div>
        </div>
      </div>`).join('')}
  </div>

  <div class="karta">
    ${qtr('Mahsulotlar', narx(oraliq))}
    ${donaCh ? `<div class="qtr"><span class="k">${dona} ta mahsulot uchun
        (${qisqaNarx(d.narx)} × ${dona})</span>
        <span class="v chegirma">−${narx(donaCh)}</span></div>` : ''}
    ${chegirma - donaCh > 0 ? `<div class="qtr"><span class="k">Summa chegirmasi</span>
        <span class="v chegirma">−${narx(chegirma - donaCh)}</span></div>` : ''}
    <div class="qtr jami"><span class="k">Jami</span>
      <span class="v urgu-rang">${narx(jami)}</span></div>
    <p class="ozgina" style="margin:10px 0 0">
      ${ik('yetkazish',15)} Yetkazish narxi manzilingizga qarab hisoblanadi — rasmiylashtirishda ko‘rasiz.</p>
    ${yetibKelmagan ? `<div class="ogoh yashil" style="margin-top:12px">
        ${ik('sovga',15)} Yana <b>${yetibKelmagan} ta</b> mahsulot olsangiz har biriga
        <b>${qisqaNarx(d.narx)} so‘m</b> chegirma boshlanadi</div>`
      : donaCh ? `<div class="ogoh yashil" style="margin-top:12px">
        ${ik('sovga',15)} Yana <b>1 ta</b> mahsulot — chegirma <b>${qisqaNarx(d.narx)} so‘m</b>ga oshadi</div>` : ''}
    ${keyingi ? `<div class="ogoh yashil" style="margin-top:12px">
        ${ik('sovga',15)} Yana <b>${narx(keyingi.dan - oraliq)}</b> qo‘shsangiz
        <b>${narx(keyingi.ch)}</b> chegirma olasiz</div>` : ''}
    ${yetmaydi ? `<div class="ogoh" style="margin-top:12px">
        ${ik('ogoh',15)} Minimal buyurtma — <b>${narx(holat.minimal)}</b>.
        Yana <b>${narx(holat.minimal - oraliq)}</b>lik mahsulot qo‘shing.</div>` : ''}
  </div>

  ${qoshimchaTavsiyaHtml()}

  <div style="height:96px"></div>
  <div class="yopishqoq" id="yopishqoq-savat">
    <div class="satr"><span class="mayda">Mahsulotlar</span><b>${narx(jami)}</b></div>
    <button class="asosiy" id="t-rasmiylashtir" ${yetmaydi ? 'disabled' : ''}>
      ${yetmaydi ? `Minimal ${qisqaNarx(holat.minimal)} so‘m` : 'Buyurtmani rasmiylashtirish'}</button>
  </div>`;

  $$('[data-kam]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kam), -1));
  $$('[data-kop]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kop), +1));
  if (!yetmaydi) $('#t-rasmiylashtir').onclick = () => checkoutOch();

  const tz = $('#t-savat-tozala');
  if (tz) tz.onclick = () => {
    $('#modal-tan').innerHTML = `
      <div style="padding:18px 18px 0">
        <h2 style="margin-bottom:10px">Savatni tozalash</h2>
        <p style="margin:0 0 18px">Savatdagi barcha mahsulotlar olib tashlanadi.</p>
        <button class="asosiy" id="t-tozala-ha">Ha, tozalansin</button>
        <button class="ikkilamchi" id="t-tozala-yoq" style="margin-top:9px">Bekor</button>
      </div>`;
    modalOch();
    $('#t-tozala-ha').onclick = () => { modalYop(); savatniTozala(); };
    $('#t-tozala-yoq').onclick = modalYop;
  };

  // AI taklifi: qo'shish yoki mahsulotni ochish
  const tq = $('[data-taklif-qosh]', el);
  if (tq) tq.onclick = (e) => {
    e.stopPropagation();
    tq.classList.add('qoshildi'); tq.innerHTML = ik('tasdiq', 18);
    savatga(Number(tq.dataset.taklifQosh));
  };
  const tk = $('[data-taklif]', el);
  if (tk) tk.onclick = () => mahsulotOyna(Number(tk.dataset.taklif));
}

async function ozgartir(id, delta) {
  const q = holat.savat.find((r) => r.products.id === id);
  if (!q) return;
  const yangi = q.quantity + delta;

  const eski = holat.savat.map((r) => ({ ...r }));
  if (yangi <= 0) holat.savat = holat.savat.filter((r) => r.products.id !== id);
  else q.quantity = yangi;
  savatniKorsat(); titra();

  try {
    await api('/api/cart', { method: 'POST',
      body: JSON.stringify({ amal: 'ozgartir', product_id: id, quantity: yangi }) });
    savatniSinxronla();
  } catch (e) {
    holat.savat = eski; savatniKorsat();
    ogohlantir(e.message);
  }
}

/** Savatni butunlay bo'shatish. */
async function savatniTozala() {
  if (!holat.savat.length) return;
  const eski = holat.savat.map((r) => ({ ...r }));
  holat.savat = [];
  savatniKorsat(); titra('medium');
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({ amal: 'tozala' }) });
  } catch (e) {
    holat.savat = eski; savatniKorsat();
    ogohlantir(e.message);
  }
}

// ---------------- Buyurtma rasmiylashtirish ----------------
async function draftniYukla() {
  try { holat.draft = (await api('/api/draft')).draft || {}; } catch { holat.draft = {}; }
}
let draftTimer;
function draftniSaqla() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    api('/api/draft', { method: 'POST', body: JSON.stringify(holat.draft) }).catch(() => {});
  }, 500);
}

/**
 * Ko'cha/uy qismi. Viloyat va tuman alohida tanlanadi, shuning uchun ko'cha
 * qoralamada ALOHIDA saqlanadi (`kocha`). Aks holda foydalanuvchi viloyatni
 * o'zgartirsa, eski to'liq manzil ko'cha maydonida qolib ketib,
 * "Samarqand viloyati, Urgut tumani, Toshkent shahri, Chilonzor tumani, …"
 * kabi ikki karra manzil yuborilardi.
 */
function manzilQiymati(d) {
  if (typeof d.kocha === 'string') return d.kocha;

  // Eski foydalanuvchi: bazada faqat to'liq manzil bor. Undan profildagi
  // viloyat/tuman boshlanishini bir marta kesib olamiz.
  const toliq = holat.user?.address || '';
  if (!toliq) return '';
  const qism = [holat.user?.viloyat, holat.user?.tuman].filter(Boolean);
  let qolgan = toliq;
  for (const q of qism) {
    const boshi = qolgan.slice(0, q.length + 2).toLowerCase();
    if (boshi.startsWith(q.toLowerCase())) qolgan = qolgan.slice(q.length).replace(/^\s*,\s*/, '');
  }
  return qolgan.trim();
}

/**
 * Tanlangan viloyat va tuman.
 * Tuman profildagi eski qiymatga faqat viloyat O'SHA-O'SHA bo'lsa qaytadi —
 * aks holda "Buxoro viloyati / Chilonzor tumani" kabi mos kelmaydigan juftlik
 * hosil bo'lib, eng yaqin ombor ham noto'g'ri tanlanardi.
 */
function hududTanlovi() {
  const d = holat.draft || {};
  const viloyat = d.viloyat || holat.user?.viloyat || '';
  const oshaViloyat = !d.viloyat || d.viloyat === holat.user?.viloyat;
  const tuman = d.tuman || (oshaViloyat ? holat.user?.tuman || '' : '');
  // Har ehtimolga qarshi: tuman shu viloyatga tegishlimi?
  const royxat = viloyat && window.tumanlarniOl ? window.tumanlarniOl(viloyat) : [];
  return { viloyat, tuman: royxat.includes(tuman) ? tuman : '' };
}

function checkoutOch() {
  const d = holat.draft || {};
  const { viloyat, tuman } = hududTanlovi();
  const oraliq   = holat.savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const chegirma = chegirmaHisobla(oraliq);
  $('#modal-tan').innerHTML = `
    <div style="padding:16px 18px 0">
      <h2>Buyurtmani rasmiylashtirish</h2>
      <p class="ozgina" style="margin-top:4px">Yozganingiz avtomatik saqlanadi — chiqib ketsangiz ham yo‘qolmaydi.</p>

      <label for="b-ism">Ism-familiya</label>
      <input id="b-ism" value="${esc(d.name || holat.user?.full_name || '')}">

      <label for="b-tel">Telefon</label>
      <input id="b-tel" type="tel" inputmode="tel" value="${esc(d.phone || holat.user?.phone || '')}">

      <label>Viloyat</label>
      <button class="tanlov-tugma" id="b-viloyat-tugma">
        <span id="b-viloyat-matn">${esc(viloyat || 'Tanlang')}</span><span class="oq">›</span></button>

      <label>Tuman</label>
      <button class="tanlov-tugma" id="b-tuman-tugma" ${viloyat ? '' : 'disabled'}>
        <span id="b-tuman-matn">${esc(tuman || (viloyat ? 'Tanlang' : 'Avval viloyatni tanlang'))}</span>
        <span class="oq">›</span></button>

      <label for="b-manzil">Ko‘cha, uy va xonadon
        <span class="yordam">Kuryer topa olishi uchun aniq yozing</span></label>
      <textarea id="b-manzil" placeholder="5-mavze, 12-uy, 34-xonadon">${esc(manzilQiymati(d))}</textarea>

      <label>Yetkazib berish</label>
      <div id="b-yetkazish">
        <p class="ozgina" style="margin:2px 0 0">Manzilni tanlang — narx hisoblanadi.</p>
      </div>

      <label for="b-izoh">Izoh <span class="yordam">Ixtiyoriy</span></label>
      <input id="b-izoh" placeholder="Masalan: kechqurun qo‘ng‘iroq qiling" value="${esc(d.note || '')}">

      <div class="ogoh" style="margin-top:18px">
        ${ik('karta',15)} <b>To‘lov kartaga o‘tkazma orqali.</b> Buyurtmani tasdiqlagach karta raqami
        chiqadi — to‘lab, chek rasmini yuklaysiz.
      </div>

      <div class="karta" id="b-summa" style="margin:16px 0 0;padding:14px"></div>

      <div id="checkout-xato" class="xato-matn"></div>
      <button class="asosiy" id="t-yubor" style="margin-top:16px">${ik('tasdiq',18)}Buyurtmani tasdiqlash</button>
    </div>`;
  modalOch();

  const bogla = (id, kalit) => {
    const el = $('#' + id);
    el.oninput = () => { holat.draft[kalit] = el.value; draftniSaqla(); };
  };
  bogla('b-ism', 'name'); bogla('b-tel', 'phone');
  bogla('b-manzil', 'kocha'); bogla('b-izoh', 'note');

  $('#b-viloyat-tugma').onclick = () => royxatOyna(
    'Viloyatni tanlang', window.VILOYATLAR || [], viloyat,
    (tanlangan) => {
      holat.draft.viloyat = tanlangan;
      holat.draft.tuman = '';       // viloyat o'zgarsa tuman bekor bo'ladi
      draftniSaqla(); checkoutOch();
    });

  $('#b-tuman-tugma').onclick = () => {
    const v = viloyat;
    if (!v) return;
    royxatOyna('Tumanni tanlang', window.tumanlarniOl(v), tuman,
      (tanlangan) => { holat.draft.tuman = tanlangan; draftniSaqla(); checkoutOch(); });
  };

  $('#t-yubor').onclick = buyurtmaYubor;
  yetkazishniHisobla(oraliq, chegirma);
}

/**
 * Yetkazish variantlari va narxi — serverdan.
 * Narx og'irlikka va manzilga bog'liq, shuning uchun har safar so'raymiz.
 */
async function yetkazishniHisobla(oraliq, chegirma) {
  const quti = $('#b-yetkazish');
  const summa = $('#b-summa');
  if (!quti || !summa) return;

  const chiz = (turlar, tanlangan, ogirlik, bepul) => {
    quti.innerHTML = turlar.map((t) => `
      <button class="tanlov-qator ${t.kalit === tanlangan ? 'tanlangan' : ''}" data-yt="${t.kalit}">
        <span class="yt-chap">
          <span class="yt-nom">${t.emoji} ${esc(t.nom)}</span>
          <span class="yt-izoh">${t.kalit === 'filial'
            ? 'Eng yaqin pochta filialidan olasiz'
            : 'Pochta manzilingizgacha yetkazadi'}</span>
        </span>
        <span class="yt-narx">${bepul ? 'bepul' : narx(t.narx)}</span>
      </button>`).join('') +
      `<p class="ozgina" style="margin:8px 0 0">Jo‘natma og‘irligi: ~${(ogirlik / 1000).toFixed(1)} kg
        <span class="yordam">(qadoqlash bilan)</span></p>` +
      (holat.yetkazishIzoh?.manba === 'emu'
        ? `<p class="ozgina" style="margin:4px 0 0">EMU Express tarifi ·
            ${esc(holat.yetkazishIzoh.zona_izoh || '')} ·
            ${esc(holat.yetkazishIzoh.masofa_izoh || '')}</p>`
        : '');

    $$('[data-yt]', quti).forEach((b) => b.onclick = () => {
      holat.draft.yetkazish_turi = b.dataset.yt;
      draftniSaqla();
      const yangi = turlar.find((x) => x.kalit === b.dataset.yt);
      chiz(turlar, b.dataset.yt, ogirlik, bepul);
      summaChiz(bepul ? 0 : yangi.narx);
      titra();
    });
  };

  const summaChiz = (yetkazish) => {
    const jami = oraliq - chegirma + yetkazish;
    summa.innerHTML = `
      ${qtr('Mahsulotlar', narx(oraliq))}
      ${chegirma ? `<div class="qtr"><span class="k">Chegirma</span><span class="v chegirma">−${narx(chegirma)}</span></div>` : ''}
      ${qtr('Yetkazish', yetkazish ? narx(yetkazish) : '<span style="color:var(--yashil)">bepul</span>')}
      <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(jami)}</span></div>`;
  };

  summaChiz(0);
  const { viloyat, tuman } = hududTanlovi();
  if (!viloyat) {
    quti.innerHTML = `<p class="ozgina" style="margin:2px 0 0">
      ${ik('joy',15)} Avval viloyat va tumanni tanlang — narx shundan keyin hisoblanadi.</p>`;
    return;
  }

  quti.innerHTML = `<p class="ozgina" style="margin:2px 0 0">Narx hisoblanmoqda…</p>`;
  try {
    const j = await api('/api/yetkazish', { method: 'POST',
      body: JSON.stringify({ viloyat, tuman }) });
    if (j.bosh) return;
    holat.yetkazishIzoh = j.izoh || null;
    const tanlangan = holat.draft.yetkazish_turi || 'filial';
    holat.draft.yetkazish_turi = tanlangan;
    chiz(j.turlar, tanlangan, j.ogirlik, j.bepul);
    summaChiz(j.bepul ? 0 : (j.turlar.find((t) => t.kalit === tanlangan)?.narx || 0));
  } catch (e) {
    quti.innerHTML = `<p class="ozgina" style="margin:2px 0 0;color:var(--qizil)">
      Narxni hisoblab bo‘lmadi. Menejer bog‘lanib aytadi.</p>`;
  }
}

/**
 * Uzun ro'yxatdan tanlash oynasi (viloyat, tuman).
 * Qidiruv bor — 210 ta tumandan tez topish uchun.
 */
function royxatOyna(sarlavha, royxat, joriy, tanlandi) {
  const chiz = (q = '') => {
    const filtr = q
      ? royxat.filter((x) => x.toLowerCase().includes(q.toLowerCase()))
      : royxat;
    return filtr.length
      ? filtr.map((x) => `<button class="royxat-qator ${x === joriy ? 'tanlangan' : ''}"
          data-tanla="${esc(x)}">${esc(x)}${x === joriy ? '<span class="belgi-ok">✓</span>' : ''}</button>`).join('')
      : `<div class="bosh-holat" style="padding:32px 20px">Topilmadi</div>`;
  };

  $('#modal-tan').innerHTML = `
    <div style="padding:14px 18px 0">
      <div class="karta-bosh"><h2>${esc(sarlavha)}</h2></div>
      <div class="qidiruv" style="margin-bottom:10px">
        ${ik('qidiruv',17)}<input id="r-qidiruv" type="search" placeholder="Qidirish…">
      </div>
      <div class="royxat" id="r-royxat">${chiz()}</div>
    </div>`;
  modalOch();

  const ula = () => $$('#r-royxat [data-tanla]').forEach((b) => b.onclick = () => {
    titra(); modalYop(); tanlandi(b.dataset.tanla);
  });
  ula();
  $('#r-qidiruv').oninput = (e) => { $('#r-royxat').innerHTML = chiz(e.target.value); ula(); };
}

async function buyurtmaYubor() {
  const xato = $('#checkout-xato'); xato.textContent = '';
  const { viloyat, tuman } = hududTanlovi();
  const kocha   = $('#b-manzil').value.trim();
  const tana = {
    name: $('#b-ism').value.trim(), phone: $('#b-tel').value.trim(),
    viloyat, tuman, note: $('#b-izoh').value.trim(),
    yetkazish_turi: holat.draft.yetkazish_turi || 'filial',
    // Bazaga to'liq manzil boradi, lekin ko'cha qoralamada alohida qoladi
    address: [viloyat, tuman, kocha].filter(Boolean).join(', '),
  };
  if (tana.name.length < 3) return xato.textContent = 'Ismni to‘liq yozing.';
  if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, '')))
    return xato.textContent = 'Telefon raqamini tekshiring.';
  if (!viloyat) return xato.textContent = 'Viloyatni tanlang.';
  if (!tuman)   return xato.textContent = 'Tumanni tanlang.';
  if (kocha.length < 5) return xato.textContent = 'Ko‘cha, uy va xonadonni yozing.';

  const t = $('#t-yubor'); t.disabled = true; t.textContent = 'Yuborilmoqda…';
  try {
    const j = await api('/api/order', { method: 'POST', body: JSON.stringify(tana) });
    holat.draft = {}; draftniSaqla();
    await savatniYangila(); titra('medium');
    tolovOyna(j.buyurtma);          // to'lov faqat karta orqali
  } catch (e) {
    xato.textContent = e.message;
    t.disabled = false; t.textContent = 'Buyurtmani tasdiqlash';
  }
}

function tolovOyna(o) {
  $('#modal-tan').innerHTML = `
    <div style="padding:20px 18px 0">
      <div style="text-align:center"><div style="color:var(--urgu)">${ik('karta',46)}</div>
        <h2 style="margin-top:8px">To‘lov qiling</h2>
        <p class="mayda"><b>${esc(o.order_no)}</b> · ${narx(o.total)}</p></div>

      <div class="karta-raqam">
        <div class="ozgina" style="color:rgba(255,255,255,.8)">Karta raqami</div>
        <div class="raqam" id="karta-raqam">${esc(holat.karta.raqam || '—')}</div>
        <div class="egasi">${esc(holat.karta.egasi || '')}</div>
        <button id="t-nusxa">${ik('hujjat',17)}Raqamdan nusxa olish</button>
      </div>

      <div class="ogoh" style="margin-top:14px">
        <b>1.</b> Yuqoridagi kartaga <b>${narx(o.total)}</b> o‘tkazing<br>
        <b>2.</b> To‘lov chekini rasmga oling<br>
        <b>3.</b> Quyidan yuklang — menejer tasdiqlaydi
      </div>

      <input type="file" id="chek-fayl" accept="image/*" hidden>
      <button class="asosiy" id="t-chek" style="margin-top:16px">${ik('kamera',18)}Chek rasmini yuklash</button>
      <button class="ikkilamchi" id="t-keyin" style="margin-top:9px">Keyinroq yuboraman</button>
      <div id="chek-holat" style="margin-top:12px"></div>
    </div>`;
  modalOch();

  $('#t-nusxa').onclick = async () => {
    const raqam = String(holat.karta.raqam || '').replace(/\s/g, '');
    try { await navigator.clipboard.writeText(raqam); } catch {}
    $('#t-nusxa').textContent = 'Nusxa olindi';
    titra('medium');
  };
  $('#t-chek').onclick = () => $('#chek-fayl').click();
  $('#chek-fayl').onchange = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const el = $('#chek-holat');
    el.innerHTML = `<div class="mayda"><span class="aylana" style="width:18px;height:18px;display:inline-block;margin:0 8px -3px 0"></span>Yuborilmoqda…</div>`;
    try {
      const rasm = await kichiklashtir(f, 1400, 0.8);
      await api('/api/receipt', { method: 'POST',
        body: JSON.stringify({ order_no: o.order_no, image: rasm }) });
      titra('medium');
      tayyorOyna(o, true);
    } catch (err) { el.innerHTML = `<div class="xato-matn">${esc(err.message)}</div>`; }
  };
  $('#t-keyin').onclick = () => tayyorOyna(o);
}

function tayyorOyna(o, chekBor = false) {
  $('#modal-tan').innerHTML = `
    <div style="padding:30px 22px 0;text-align:center">
      <div style="color:var(--yashil)">${ik('tasdiq',52)}</div>
      <h2 style="margin:12px 0 6px">Buyurtmangiz qabul qilindi!</h2>
      <p class="mayda">Raqam: <b>${esc(o.order_no)}</b></p>
      <div class="karta" style="margin:18px 0 0;text-align:left">
        ${qtr('Mahsulotlar', narx(o.subtotal))}
        ${o.discount ? `<div class="qtr"><span class="k">Chegirma</span><span class="v chegirma">−${narx(o.discount)}</span></div>` : ''}
        ${qtr('Yetkazish', o.delivery_fee ? narx(o.delivery_fee) : '<span style="color:var(--yashil)">bepul</span>')}
        <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(o.total)}</span></div>
      </div>
      <div class="ogoh ${chekBor ? 'yashil' : ''}" style="margin-top:14px;text-align:left">
        ${chekBor ? 'Chek qabul qilindi. Menejer tekshirib, tasdiqlaydi.'
          : o.payment_method === 'karta'
            ? 'To‘lovni amalga oshirib, chekni «Buyurtmalarim» bo‘limidan yuklang.'
            : 'To‘lov yetkazib berishda naqd pulda.'}<br>
        ${ik('telefon',15)} Menejer tez orada bog‘lanadi.
      </div>
      <button class="asosiy" id="t-tayyor" style="margin-top:18px">Yaxshi</button>
    </div>`;
  modalOch();
  $('#t-tayyor').onclick = () => {
    modalYop(); tabOch('profil'); buyurtmalarniChiz({ majburiy: true });
  };
}

// ---------------- Profil ----------------
// Botdagi menyu ikkita tugmaga qisqardi — qolgan hamma narsa shu yerda.
function profilniChiz() {
  const u = holat.user || {};
  const st = holat.stat || {};
  const ism = (u.full_name || '').trim();
  const tgU = tg?.initDataUnsafe?.user || {};

  // Telegram profil rasmi — initData ichida keladi, alohida so'rov kerak emas
  const bosh = (ism || tgU.first_name || 'K').trim()[0].toUpperCase();
  $('#profil-avatar').innerHTML = tgU.photo_url
    ? `<img src="${esc(tgU.photo_url)}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(bosh)}'))">`
    : esc(bosh);
  $('#profil-ism').textContent = ism || tgU.first_name || 'Profilim';
  $('#profil-tel').textContent = u.phone || (tgU.username ? '@' + tgU.username : '');
  $('#profil-stat').innerHTML = `
    <div><b>${st.tahlil ?? 0}</b><span>AI tahlil</span></div>
    <div data-sevimli="1"><b>${st.sevimli ?? holat.sevimlilar.size}</b><span>sevimlilar</span></div>
    <div><b>${st.buyurtma ?? 0}</b><span>buyurtmalar</span></div>`;

  const m = holat.menejer || {};
  const tgNom = String(holat.konsultatsiya || '').replace(/^@/, '');
  const tel = String(m.telefon || '');
  const teriNom = { quruq:'Quruq', yogli:'Yog‘li', aralash:'Aralash',
                    normal:'Normal', sezgir:'Sezgir' };

  // Har bo'lim YOPIQ: profil sahifasi bir ekranga sig'sin, kerakligini
  // odam o'zi ochsin.
  const yigma = (id, ikon, nom, qiymat, ich) => `
    <details class="yigma" id="${id}">
      <summary><span class="b">${ik(ikon, 18)}</span><span class="nom">${esc(nom)}</span>
        ${qiymat ? `<span class="qiy">${esc(qiymat)}</span>` : ''}
        <span class="oq">${ik('pastga', 18)}</span></summary>
      <div class="yigma-ich">${ich}</div>
    </details>`;

  $('#profil-tan').innerHTML = `
    ${holat.ornatishMumkin ? `
      <button class="ornat" id="t-ornat">
        <span class="b">${ik('ornatish', 19)}</span>
        <span>Ilovani o‘rnatish<small>Telefon ekraniga qo‘shiladi — bir bosishda ochiladi</small></span>
        ${ik('keyingi', 18)}
      </button>` : ''}

    ${yigma('y-shaxsiy', 'profil', 'Shaxsiy ma’lumot', '', `
      <label for="p-ism">Ism familiya</label>
      <input id="p-ism" type="text" value="${esc(ism)}" placeholder="Aliyeva Malika">
      <label for="p-yosh">Yosh</label>
      <input id="p-yosh" type="number" inputmode="numeric" min="12" max="90"
             value="${u.age || ''}" placeholder="24">
      <label>Telefon</label>
      <input type="tel" value="${esc(u.phone || '')}" disabled>
      <div class="ozgina" style="margin-top:6px">Telefonni o‘zgartirish uchun botga yozing.</div>
      <button class="asosiy" id="t-shaxsiy-saqla" style="margin-top:16px">Saqlash</button>`)}

    ${yigma('y-teri', 'tomchi', 'Terim va sog‘liq', teriNom[u.teri_turi] || '', `
      <div class="ozgina">Bu ma’lumot AI tavsiyasiga ta’sir qiladi: sizga
        to‘g‘ri kelmaydigan mahsulot tavsiya qilinmaydi.</div>
      <label>Teri turi</label>
      <div class="tanlov-chiplar" id="p-teri">
        ${['','quruq','yogli','aralash','normal','sezgir'].map((t) => `
          <button data-teri="${t}" class="${(u.teri_turi || '') === t ? 'tanlangan' : ''}">${
            t ? teriNom[t] : 'Bilmayman'}</button>`).join('')}
      </div>
      <label for="p-allergiya">Allergiya</label>
      <textarea id="p-allergiya" placeholder="Masalan: asal, yong‘oq, atir hidi">${esc(u.allergiya || '')}</textarea>
      <label for="p-kasallik">Surunkali kasallik yoki teri kasalligi</label>
      <textarea id="p-kasallik" placeholder="Masalan: ekzema, rozatsea, qalqonsimon bez">${esc(u.kasallik || '')}</textarea>
      <button class="asosiy" id="t-teri-saqla" style="margin-top:16px">Saqlash</button>`)}

    ${yigma('y-sevimli', 'yurak', 'Sevimlilar',
      String(st.sevimli ?? holat.sevimlilar.size), `<div id="sevimli-tan"></div>`)}

    ${yigma('y-manzil', 'joy', 'Manzilim', u.viloyat ? esc(u.viloyat.replace(/ (viloyati|shahri|Respublikasi)$/, '')) : '', `
      <div class="ozgina">Buyurtma berishda shu manzil tayyor turadi.</div>
      <label>Viloyat</label>
      <button class="tanlov-tugma" id="p-viloyat">
        <span>${esc(u.viloyat || 'Tanlang')}</span><span class="oq">${ik('keyingi', 17)}</span></button>
      <label>Tuman</label>
      <button class="tanlov-tugma" id="p-tuman" ${u.viloyat ? '' : 'disabled'}>
        <span>${esc(u.tuman || (u.viloyat ? 'Tanlang' : 'Avval viloyatni tanlang'))}</span>
        <span class="oq">${ik('keyingi', 17)}</span></button>
      <label for="p-kocha">Ko‘cha, uy, xonadon</label>
      <textarea id="p-kocha" placeholder="Bunyodkor ko‘chasi 12-uy, 45-xonadon">${esc(u.address || '')}</textarea>
      <button class="asosiy" id="t-manzil-saqla" style="margin-top:16px">Saqlash</button>`)}

    ${yigma('y-buyurtma', 'quti', 'Buyurtmalarim', String(st.buyurtma ?? 0),
      `<div id="buyurtma-tan"></div>`)}

    ${yigma('y-aloqa', 'suhbat', 'Aloqa va yordam', '', `
      ${tgNom ? `<a class="tanlov-tugma" href="https://t.me/${esc(tgNom)}" target="_blank">
        <span>Konsultatsiya${m.ish_vaqti ? ` · <span class="ozgina">${esc(m.ish_vaqti)}</span>` : ''}</span>
        <span class="oq">${ik('keyingi', 17)}</span></a>` : ''}
      ${tel ? `<a class="tanlov-tugma" href="tel:${esc(tel.replace(/[^+\d]/g, ''))}">
        <span>${esc(tel)}</span><span class="oq">${ik('keyingi', 17)}</span></a>` : ''}
      <button class="tanlov-tugma" id="t-profil-yordam">
        <span>Tez-tez so‘raladigan savollar</span><span class="oq">${ik('keyingi', 17)}</span></button>
      <a class="tanlov-tugma" href="/oferta" target="_blank">
        <span>Ommaviy oferta</span><span class="oq">${ik('keyingi', 17)}</span></a>
      <button class="tanlov-tugma" id="t-profil-ochir">
        <span style="color:var(--qizil)">Ma’lumotlarimni o‘chirish</span>
        <span class="oq">${ik('keyingi', 17)}</span></button>
      ${seansToken() && !tg?.initData ? `
        <button class="tanlov-tugma" id="t-chiqish">
          <span style="color:var(--qizil)">Bu qurilmadan chiqish</span>
          <span class="oq">${ik('keyingi', 17)}</span></button>` : ''}`)}`;

  // --- Ulanishlar ---
  $('#t-ornat') && ($('#t-ornat').onclick = ilovaniOrnat);
  $('#t-chiqish') && ($('#t-chiqish').onclick = async () => {
    try { await api('/api/chiqish', { method: 'POST' }); } catch {}
    seansOchir();
    location.reload();
  });

  const saqla = async (tan) => {
    try {
      const j = await api('/api/profil', { method: 'POST', body: JSON.stringify(tan) });
      holat.user = { ...holat.user, ...j.user };
      titra('medium'); profilniChiz();
      // Ochiq turgan bo'limni yopib qo'ymaymiz
      if (tan.full_name !== undefined) $('#y-shaxsiy').open = true;
      if (tan.teri_turi !== undefined) $('#y-teri').open = true;
      return true;
    } catch (e) { ogohlantir(e.message); return false; }
  };

  $('#t-shaxsiy-saqla').onclick = () => saqla({
    full_name: $('#p-ism').value, age: $('#p-yosh').value });

  let teri = u.teri_turi || '';
  $$('#p-teri [data-teri]').forEach((b) => b.onclick = () => {
    teri = b.dataset.teri;
    $$('#p-teri [data-teri]').forEach((x) => x.classList.toggle('tanlangan', x === b));
    titra();
  });
  $('#t-teri-saqla').onclick = () => saqla({
    teri_turi: teri, allergiya: $('#p-allergiya').value, kasallik: $('#p-kasallik').value });

  // Manzil: viloyat -> tuman -> ko'cha
  const manzilniOch = () => { const y = $('#y-manzil'); if (y) y.open = true; };
  $('#p-viloyat').onclick = () => royxatOyna(
    'Viloyatni tanlang', window.VILOYATLAR || [], u.viloyat || '',
    async (tanlangan) => {
      // Viloyat o'zgarsa tuman bekor bo'ladi: "Buxoro viloyati / Chilonzor
      // tumani" kabi mos kelmaydigan juftlik chiqmasin
      await saqla({ viloyat: tanlangan, tuman: '', address: $('#p-kocha')?.value || '' });
      manzilniOch();
    });
  $('#p-tuman').onclick = () => {
    if (!u.viloyat) return;
    royxatOyna('Tumanni tanlang', window.tumanlarniOl(u.viloyat), u.tuman || '',
      async (tanlangan) => {
        await saqla({ viloyat: u.viloyat, tuman: tanlangan, address: $('#p-kocha')?.value || '' });
        manzilniOch();
      });
  };
  $('#t-manzil-saqla').onclick = async () => {
    await saqla({ viloyat: u.viloyat || '', tuman: u.tuman || '', address: $('#p-kocha').value });
    manzilniOch();
  };

  // Sevimlilar — bo'lim ochilganda chiziladi
  const ys = $('#y-sevimli');
  const sevimliniChiz = () => {
    const q = $('#sevimli-tan');
    if (!q) return;
    const royxat = holat.mahsulotlar.filter((x) => holat.sevimlilar.has(x.id));
    q.innerHTML = royxat.length
      ? `<div class="bolim-tor" style="padding:6px 0">${royxat.map(kartaHtml).join('')}</div>`
      : `<p class="ozgina" style="margin:8px 0 0">Hali sevimli mahsulot yo‘q.
           Katalogda yurakchani bosing.</p>`;
    $$('#sevimli-tan .mahsulot').forEach((el) => el.onclick = (e) => kartaBosildi(e, el));
  };
  ys.ontoggle = () => { if (ys.open) sevimliniChiz(); };
  if (ys.open) sevimliniChiz();
  const ss = $('#profil-stat [data-sevimli]');
  if (ss) ss.onclick = () => { ys.open = true; sevimliniChiz(); ys.scrollIntoView({ block: 'center' }); };

  // Buyurtmalar faqat bo'lim ochilganda yuklanadi
  const yb = $('#y-buyurtma');
  yb.ontoggle = () => { if (yb.open) buyurtmalarniChiz(); };
  if (yb.open) buyurtmalarniChiz();

  $('#t-profil-yordam').onclick = yordamOyna;
  $('#t-profil-ochir').onclick = () => {
    $('#modal-tan').innerHTML = `
      <div style="padding:18px 18px 0">
        <h2 style="margin-bottom:10px">Ma’lumotlarni o‘chirish</h2>
        <p>Tahlillaringiz va savatingiz o‘chiriladi. Buni botda tasdiqlaysiz:
          botga <b>/ochir</b> buyrug‘ini yuboring.</p>
        <p class="ozgina">Buyurtmalar hisobi qonun talabi bilan saqlanadi,
          lekin shaxsiy ma’lumotlarsiz.</p>
        <button class="ikkilamchi" id="t-ochir-yop" style="margin-top:14px">Tushunarli</button>
      </div>`;
    modalOch();
    $('#t-ochir-yop').onclick = modalYop;
  };
}

function yordamOyna() {
  $('#modal-tan').innerHTML = `
    <div style="padding:18px 18px 0">
      <h2 style="margin-bottom:12px">Yordam</h2>
      <div class="karta" style="margin:0 0 12px">
        ${qtr('Yuz skaneri', 'Rasm yuboring — terini tahlil qilamiz')}
        ${qtr('Do‘kon', 'Katalog, qidiruv va narx filtri')}
        ${qtr('Savat', 'Buyurtma berish va chek yuklash')}
        ${qtr('Buyurtmalarim', 'Shu profil sahifasida, pastda')}
      </div>
      <p class="ozgina">Botdagi buyruqlar: /start · /skaner · /qayta · /ochir</p>
      <p class="ozgina">Tahlil — AI bahosi, tibbiy tashxis emas.</p>
      <button class="ikkilamchi" id="t-yordam-yop" style="margin-top:8px">Yopish</button>
    </div>`;
  modalOch();
  $('#t-yordam-yop').onclick = modalYop;
}

// ---------------- Buyurtmalar ----------------
const HOLAT_Y = {
  yangi:['Yangi',''], tasdiqlangan:['Tasdiqlangan','yengil'], yolda:['Yo‘lda','ortacha'],
  yetkazildi:['Yetkazildi','yengil'], bekor:['Bekor qilingan','kuchli'],
};

/**
 * Shapkadagi qo'ng'iroq: yo'ldagi buyurtmalar soni.
 * Bu yerda "xabar" — buyurtma holatining o'zgarishi. Ilova ochilganda
 * odam eng avval shuni bilishni xohlaydi: buyurtmam qayerda.
 */
async function xabarlarniYangila() {
  try {
    const j = await api('/api/orders');
    holat.buyurtmalar = j.buyurtmalar || [];
  } catch { return; }
  const kutayotgan = holat.buyurtmalar.filter(
    (o) => !['yetkazildi', 'bekor'].includes(o.status));
  const n = $('#xabar-nishon');
  n.textContent = kutayotgan.length;
  kor(n, kutayotgan.length > 0);
}

function xabarlarOyna() {
  const royxat = (holat.buyurtmalar || []).slice(0, 10);
  $('#modal-tan').innerHTML = `
    <div style="padding:18px 18px 0">
      <h2 style="margin-bottom:4px">Buyurtmalarim</h2>
      <p class="ozgina" style="margin-bottom:14px">Holati o‘zgarganda botga ham xabar keladi.</p>
      ${royxat.length ? royxat.map((o) => {
        const [nom, sinf] = HOLAT_Y[o.status] || [o.status, ''];
        return `<div class="tanlov-tugma" data-buyurtma="1" style="cursor:default">
          <span><b>${esc(o.order_no)}</b><br>
            <span class="ozgina">${narx(o.total)}</span></span>
          <span class="yorliq ${sinf}">${esc(nom)}</span></div>`;
      }).join('') : `<p class="ozgina">Hozircha buyurtma yo‘q.</p>`}
      <button class="ikkilamchi" id="t-xabar-yop" style="margin-top:16px">Yopish</button>
    </div>`;
  modalOch();
  $('#t-xabar-yop').onclick = modalYop;
}

/**
 * Buyurtma yo'li — to'rt bosqich, joriysi qizil.
 * Bosqichlar mijoz KO'RADIGAN holatlardan olinadi: ichki bosqichlar
 * (Koreyadan jo'natildi, omborda) «Yo'lda» ichiga kiradi — mijozga
 * o'nta texnik holat emas, to'rtta tushunarli qadam kerak.
 */
const YOL_BOSQICH = [
  { ik: 'tasdiq',    nom: 'Qabul qilindi',  holatlar: ['yangi'] },
  { ik: 'quti',      nom: 'Tayyorlanmoqda', holatlar: ['tasdiqlangan', 'qadoqlanmoqda', 'omborda'] },
  { ik: 'yetkazish', nom: 'Yo‘lda',         holatlar: ['yolda'] },
  { ik: 'uy',        nom: 'Yetkazildi',     holatlar: ['yetkazildi'] },
];

function bosqichYoli(status) {
  if (status === 'bekor') return '';
  let joriy = YOL_BOSQICH.findIndex((b) => b.holatlar.includes(status));
  if (joriy < 0) joriy = 1;             // noma'lum ichki holat — tayyorlanmoqda
  return `
    <div class="yol">
      ${YOL_BOSQICH.map((b, i) => `
        <div class="yol-qadam ${i < joriy ? 'otdi' : i === joriy ? 'joriy' : ''}">
          <span class="d">${ik(b.ik, 15)}</span>
          <span class="n">${esc(b.nom)}</span>
        </div>`).join('')}
    </div>`;
}

async function buyurtmalarniChiz({ majburiy = false } = {}) {
  const el = $('#buyurtma-tan');
  if (!el) return;                       // bo'lim hali ochilmagan
  // Keshdan darhol ko'rsatamiz — tab bosilganda kutish bo'lmasin
  if (holat.buyurtmaKesh && !majburiy) {
    el.innerHTML = holat.buyurtmaKesh;
    buyurtmaTugmalariniUla(el);
    buyurtmalarniYangila();          // orqa fonda yangilaymiz
    return;
  }
  if (!el.innerHTML) el.innerHTML = `<div class="yuklanmoqda"><div class="aylana"></div></div>`;
  try {
    const j = await api('/api/orders');
    if (!j.buyurtmalar.length) {
      holat.buyurtmaKesh = `<div class="bosh-holat"><div class="belgi">${ik('hujjat',46)}</div>
        <p>Hozircha buyurtmangiz yo‘q</p></div>`;
      el.innerHTML = holat.buyurtmaKesh;
      return;
    }
    holat.buyurtmaKesh = j.buyurtmalar.map((o) => {
      const [nom, sinf] = HOLAT_Y[o.status] || [o.status, ''];
      const chekKerak = o.payment_method === 'karta' && o.payment_status === 'kutilmoqda' && o.status !== 'bekor';
      return `
      <div class="karta">
        <div class="karta-bosh">
          <div><div style="font-weight:750">${esc(o.order_no)}</div>
            <div class="ozgina">${new Date(o.created_at).toLocaleDateString('uz-UZ')}</div></div>
          <span class="yorliq ${sinf}">${nom}</span>
        </div>
        ${bosqichYoli(o.status)}
        ${o.items.map((i) => `<div class="qtr"><span class="k">${esc(i.name)} × ${i.qty}</span>
          <span class="v">${qisqaNarx(i.price * i.qty)}</span></div>
          ${o.status === 'yetkazildi' && i.product_id ? `
            <button class="matn-tugma" data-baho="${i.product_id}"
              style="margin:2px 0 8px">${ik('yulduz', 15)}Shu mahsulotni baholash</button>` : ''}`).join('')}
        ${o.discount ? `<div class="qtr"><span class="k">Chegirma</span>
          <span class="v chegirma">−${narx(o.discount)}</span></div>` : ''}
        <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(o.total)}</span></div>
        ${o.payment_status === 'chek_yuborilgan' ? `<div class="ogoh yashil" style="margin-top:12px">
          ${ik('tasdiq',15)} Chek yuborildi — menejer tekshirmoqda</div>` : ''}
        ${chekKerak ? `<button class="asosiy" style="margin-top:12px" data-chek="${esc(o.order_no)}"
            data-total="${o.total}">To‘lov qilish va chek yuborish</button>` : ''}
      </div>`;
    }).join('');
    el.innerHTML = holat.buyurtmaKesh;
    buyurtmaTugmalariniUla(el);
  } catch (e) {
    if (!holat.buyurtmaKesh) el.innerHTML = `<div class="bosh-holat"><p>${esc(e.message)}</p></div>`;
  }
}

function buyurtmaTugmalariniUla(el) {
  // Yetkazilgan mahsulotni shu yerdan baholash mumkin
  $$('[data-baho]', el).forEach((b) => b.onclick = () => {
    const id = Number(b.dataset.baho);
    if (holat.mahsulotlar.some((p) => p.id === id)) sharhOyna(id, null);
    else ogohlantir('Bu mahsulot katalogdan olib tashlangan.');
  });
  $$('[data-chek]', el).forEach((b) => b.onclick = () =>
    tolovOyna({ order_no: b.dataset.chek, total: Number(b.dataset.total),
                subtotal: Number(b.dataset.total), discount: 0, delivery_fee: 0,
                payment_method: 'karta' }));
}

/** Orqa fonda yangilash — ko'rinishni almashtirmasdan. */
let yangilashTimer;
function buyurtmalarniYangila() {
  clearTimeout(yangilashTimer);
  yangilashTimer = setTimeout(() => buyurtmalarniChiz({ majburiy: true }), 60);
}

// ================= AI MASLAHATCHI =================
// Odam o'z so'zi bilan yozadi ("oyog'im og'riyapti", "tuk oluvchi bormi"),
// AI katalogdan mos mahsulot topib beradi. Uch xil javob bo'lishi mumkin:
//   savol   — ma'lumot yetmadi, aniqlashtiruvchi savol + tayyor variantlar
//   to'plam — bosqichma-bosqich parvarish, bir necha mahsulot birga
//   bitta   — bitta narsa yetadi (surtma, tuk oluvchi, lab balzami)

const NAMUNA_SAVOL = [
  { ik: 'tomchi', matn: 'Yuzim juda quruq, nima yordam beradi?' },
  { ik: 'tozalik', matn: 'Aknega qarshi to‘liq parvarish tuzing' },
  { ik: 'quyosh', matn: 'Yozda quyoshdan himoya uchun nima olay?' },
  { ik: 'barg',   matn: 'Ichimdan ichadigan kollagen bormi?' },
];

const BOSQICH_NOM = {
  tozalash:'Tozalash', toner:'Toner', davolash:'Davolash',
  namlash:'Namlash', himoya:'Himoya', qoshimcha:'Qo‘shimcha', ichki:'Ichki qabul',
};

function suhbatniYukla() {
  try { holat.suhbat = JSON.parse(sessionStorage.getItem('qq_suhbat') || '[]'); }
  catch { holat.suhbat = []; }
  if (!Array.isArray(holat.suhbat)) holat.suhbat = [];
}
const suhbatniSaqla = () => {
  // Rasmlarni saqlamaymiz — sessionStorage 5 MB, bitta surat shuncha
  try {
    sessionStorage.setItem('qq_suhbat', JSON.stringify(
      holat.suhbat.slice(-20).map((x) => ({ ...x, rasm: undefined }))));
  } catch { /* joy tugadi — suhbat baribir ekranda turibdi */ }
};

/** AI ga yuboriladigan qisqa tarix (server ham 8 tagacha oladi). */
const suhbatTarixi = () => holat.suhbat
  .filter((x) => x.matn && x.kim !== 'kutish')
  .slice(-8)
  .map((x) => ({ kim: x.kim, matn: x.matn }));

/**
 * AI javobining yengil formati. To'liq markdown emas — chatda kerak
 * bo'ladigan uchta narsa: kichik sarlavha, ro'yxat va qalin so'z.
 */
function formatMatn(xom) {
  const qatorlar = String(xom || '').split('\n');
  const chiq = [];
  let royxat = [];
  let tur = 'ul';
  const royxatniYop = () => {
    if (royxat.length) { chiq.push(`<${tur}>${royxat.join('')}</${tur}>`); royxat = []; }
  };
  const qalin = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  for (const xq of qatorlar) {
    const q = xq.trim();
    if (!q) { royxatniYop(); continue; }

    // ## Sarlavha — boshidagi emoji alohida belgi bo'lib chiqadi
    if (q.startsWith('##')) {
      royxatniYop();
      const matn = q.replace(/^#+\s*/, '');
      const e = matn.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
      chiq.push(e
        ? `<h4><span class="h4-belgi">${esc(e[1])}</span>${qalin(e[2])}</h4>`
        : `<h4>${qalin(matn)}</h4>`);
      continue;
    }
    // > Diqqat qilinadigan jumla
    if (q.startsWith('>')) {
      royxatniYop();
      chiq.push(`<div class="diqqat-satr">${ik('ogoh', 15)}<span>${qalin(q.slice(1).trim())}</span></div>`);
      continue;
    }
    // 1. Tartibli qadam
    const raqamli = q.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (raqamli) {
      if (tur !== 'ol') { royxatniYop(); tur = 'ol'; }
      royxat.push(`<li>${qalin(raqamli[2])}</li>`);
      continue;
    }
    // • Ro'yxat bandi
    if (/^[•\-*]\s/.test(q)) {
      if (tur !== 'ul') { royxatniYop(); tur = 'ul'; }
      royxat.push(`<li>${qalin(q.slice(1).trim())}</li>`);
      continue;
    }
    royxatniYop(); tur = 'ul';
    chiq.push(`<p>${qalin(q)}</p>`);
  }
  royxatniYop();
  return chiq.join('');
}

/** Bitta tavsiya kartasi: rasm, nom, narx, «nega» va bitta bosishda savatga. */
function tavsiyaKartasi(t, tartibli = false) {
  const p = t.mahsulot;
  const yoq = !(p.stock > 0);
  const savatda = holat.savat.some((r) => r.products.id === p.id);
  const rasm = p.poster_id
    ? `<img src="/media/${esc(p.poster_id)}?w=200" alt="" loading="lazy">`
    : ik('shisha', 26);
  const eski = p.old_price && p.old_price > p.price ? `<s>${qisqaNarx(p.old_price)}</s>` : '';
  return `
    <div class="t-karta" data-mahsulot="${p.id}">
      <div class="rasm">${rasm}${tartibli ? `<span class="t-tartib">${t.tartib}</span>` : ''}</div>
      <div class="t-ich">
        <div class="t-tepa">
          ${tartibli && t.bosqich
            ? `<span class="t-bosqich">${esc(BOSQICH_NOM[t.bosqich] || t.bosqich)}</span>`
            : (p.brand ? `<span class="t-brend">${esc(p.brand)}</span>` : '')}
        </div>
        <div class="t-nom">${esc(nomi(p))}</div>
        ${t.sabab ? `<div class="t-sabab">${esc(t.sabab)}</div>` : ''}
        ${t.qanday ? `<div class="t-qanday">${ik('soat', 13)}${esc(t.qanday)}</div>` : ''}
        <div class="t-past">
          <span class="t-narx">${narx(p.price)}${eski}</span>
          ${yoq
            ? '<span class="t-yoq">Tugagan</span>'
            : `<button class="t-qosh ${savatda ? 'qoshildi' : ''}" data-qosh="${p.id}"
                 aria-label="Savatga qo‘shish">${ik(savatda ? 'tasdiq' : 'plyus', 19)}</button>`}
        </div>
      </div>
    </div>`;
}

/** To'plam: raqamlangan bosqichlar, jami narx va «hammasini savatga». */
function toplamHtml(j) {
  const jami = j.tavsiya.reduce((s, t) => s + (t.mahsulot?.price || 0), 0);
  const idlar = j.tavsiya.map((t) => t.product_id).join(',');
  const hammasiBor = j.tavsiya.every((t) =>
    holat.savat.some((r) => r.products.id === t.product_id));
  return `
    <div class="toplam">
      ${j.toplam.izoh ? `<div class="toplam-bosh"><p>${esc(j.toplam.izoh)}</p></div>` : ''}
      <div class="toplam-royxat">${j.tavsiya.map((t) => tavsiyaKartasi(t, true)).join('')}</div>
      <div class="toplam-past">
        <div><span class="ozgina">${j.tavsiya.length} ta mahsulot</span>
          <b>${narx(jami)}</b></div>
        <button class="asosiy toplam-tugma ${hammasiBor ? 'qoshildi' : ''}"
          data-toplam="${idlar}" ${hammasiBor ? 'disabled' : ''}>
          ${ik(hammasiBor ? 'tasdiq' : 'savat', 18)}${hammasiBor ? 'Savatda' : 'Hammasini savatga'}</button>
      </div>
    </div>`;
}

/** Bitta AI javobi: matn pufagi + savol / to'plam / mahsulotlar. */
function aiXabarHtml(j) {
  const tibbiy = j.turi === 'tibbiy';
  const belgi = tibbiy
    ? `<div class="pufak-belgi">${ik('tibbiy', 13)}Sog‘liq masalasi</div>` : '';

  let ost = '';
  if (j.savol) {
    ost = `
      <div class="savol-quti">
        <div class="savol-matn">${ik('savol', 15)}${esc(j.savol.matn)}</div>
        <div class="savol-variantlar">
          ${(j.savol.variantlar || []).map((v) =>
            `<button data-savol="${esc(v)}">${esc(v)}</button>`).join('')}
          ${j.savol.rasm_kerak
            ? `<button class="rasmli" data-rasm-sora="1">${ik('kamera', 16)}Rasm yuborish</button>` : ''}
        </div>
      </div>`;
  } else if ((j.tavsiya || []).length) {
    // Mahsulotlar YOPIQ turadi: ochilgan holda javob juda uzayib
    // ketadi va suhbatni o'qib bo'lmaydi. Bosilganda ochiladi.
    const ich = (j.toplam && j.tavsiya.length > 1)
      ? toplamHtml(j)
      : `<div class="tavsiyalar">${j.tavsiya.map((t) => tavsiyaKartasi(t)).join('')}</div>`;
    const jami = j.tavsiya.reduce((s, t) => s + (t.mahsulot?.price || 0), 0);
    ost = `
      <details class="tavsiya-yigma">
        <summary>
          <span class="tav-belgi">${ik('savat', 17)}</span>
          <span class="tav-matn"><b>${j.toplam ? esc(j.toplam.nom) : 'Sizga mos mahsulotlar'}</b>
            <span>${j.tavsiya.length} ta · ${narx(jami)}</span></span>
          <span class="tav-oq">${ik('pastga', 18)}</span>
        </summary>
        <div class="tavsiya-ich">${ich}</div>
      </details>`;
  }

  return `
    <div class="xabar ai">
      <div class="pufak ${tibbiy ? 'tibbiy' : ''}">${belgi}${formatMatn(j.javob)}</div>
      ${ost}
    </div>`;
}

function maslahatniChiz() {
  const oqim = $('#maslahat-oqim');
  kor($('#maslahat-tozala'), holat.suhbat.length > 0);

  if (!holat.suhbat.length) {
    oqim.innerHTML = `
      <div class="suhbat-bosh-ekran">
        <div class="halqa">${ik('robot', 34)}</div>
        <h2>Nima bezovta qilyapti?</h2>
        <p>O‘z so‘zingiz bilan yozing — muammoni tushuntiraman va
          do‘kondagi mahsulotlardan mos kelganini topib beraman.</p>
        <div class="namunalar">
          ${NAMUNA_SAVOL.map((n) => `
            <button data-savol="${esc(n.matn)}">${ik(n.ik, 19)}<span>${esc(n.matn)}</span>
              <span class="strelka">${ik('keyingi', 16)}</span></button>`).join('')}
        </div>
      </div>`;
    $('#maslahat-takliflar').innerHTML = '';
    return;
  }

  oqim.innerHTML = holat.suhbat.map((x) => {
    if (x.kim === 'odam') {
      return `<div class="xabar men">
        ${x.rasm ? `<img class="men-rasm" src="data:${esc(x.mime || 'image/jpeg')};base64,${esc(x.rasm)}" alt="">` : ''}
        ${x.matn ? `<div class="pufak">${esc(x.matn)}</div>` : ''}
      </div>`;
    }
    if (x.kim === 'kutish') {
      return `<div class="xabar ai"><div class="pufak"><div class="nuqtalar">
        <span></span><span></span><span></span></div></div></div>`;
    }
    return aiXabarHtml(x.javob || { javob: x.matn, tavsiya: [] });
  }).join('');

  // Takliflar — faqat oxirgi javobniki, savol berilgan bo'lsa ko'rsatilmaydi
  const oxirgi = [...holat.suhbat].reverse().find((x) => x.kim === 'ai');
  const t = (oxirgi?.javob?.savol ? [] : (oxirgi?.javob?.takliflar || []));
  $('#maslahat-takliflar').innerHTML = holat.suhbat.at(-1)?.kim === 'kutish' ? '' :
    t.map((x) => `<button data-savol="${esc(x)}">${esc(x)}</button>`).join('');
}

const pastgaTush = () => requestAnimationFrame(() =>
  scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));

let maslahatBand = false;
let chatRasm = null;                       // {data, mime} — biriktirilgan surat

async function maslahatYubor(savol) {
  savol = String(savol || '').trim().slice(0, 400);
  if ((!savol && !chatRasm) || maslahatBand) return;
  maslahatBand = true;

  const tarix = suhbatTarixi();
  const rasm = chatRasm; chatRasm = null; rasmOldindaniChiz();
  holat.suhbat.push({ kim: 'odam', matn: savol, rasm: rasm?.data, mime: rasm?.mime });
  holat.suhbat.push({ kim: 'kutish' });
  maslahatniChiz(); suhbatniSaqla(); pastgaTush(); titra();

  const matn = $('#maslahat-matn');
  matn.value = ''; matn.style.height = '40px';
  $('#maslahat-yubor').disabled = true;
  $('#maslahat-holat').textContent = rasm ? 'Rasmni ko‘ryapti…' : 'O‘ylayapti…';
  $('#maslahat-holat').classList.add('oylanmoqda');

  try {
    const j = await api('/api/maslahat', { method: 'POST', body: JSON.stringify({
      savol, tarix, rasm: rasm?.data, mime: rasm?.mime }) });
    holat.suhbat.pop();
    holat.suhbat.push({ kim: 'ai', matn: j.javob, javob: j });
  } catch (e) {
    holat.suhbat.pop();
    holat.suhbat.push({ kim: 'ai', matn: e.message,
      javob: { javob: e.message, turi: 'yoq', tavsiya: [], takliflar: [] } });
  } finally {
    maslahatBand = false;
    $('#maslahat-holat').textContent = 'Har doim shu yerda';
    $('#maslahat-holat').classList.remove('oylanmoqda');
    maslahatniChiz(); suhbatniSaqla(); pastgaTush();
  }
}

/** Biriktirilgan suratning kichik ko'rinishi — yozish panelining ustida. */
function rasmOldindaniChiz() {
  const q = $('#chat-rasm');
  if (!q) return;
  kor(q, Boolean(chatRasm));
  q.innerHTML = chatRasm
    ? `<img src="data:${chatRasm.mime};base64,${chatRasm.data}" alt="">
       <span>Surat biriktirildi</span>
       <button id="chat-rasm-ochir" aria-label="O‘chirish">${ik('yopish', 16)}</button>` : '';
  const o = $('#chat-rasm-ochir');
  if (o) o.onclick = () => { chatRasm = null; rasmOldindaniChiz(); olchamniYangila(); };
  olchamniYangila();
}

let olchamniYangila = () => {};

function maslahatniUla() {
  const matn = $('#maslahat-matn');
  const yubor = $('#maslahat-yubor');
  const fayl = $('#chat-fayl');
  yubor.innerHTML = ik('yuborish', 19);
  yubor.disabled = true;
  $('#chat-biriktir').innerHTML = ik('kamera', 20);

  // Textarea o'zi o'sadi — uzun savol ham to'liq ko'rinsin
  const olcham = () => {
    yubor.disabled = (!matn.value.trim() && !chatRasm) || maslahatBand;
    if (!matn.offsetParent) return;        // ekran yopiq — o'lchamni buzmaymiz
    matn.style.height = 'auto';
    matn.style.height = Math.max(40, Math.min(matn.scrollHeight, 120)) + 'px';
  };
  olchamniYangila = olcham;
  matn.addEventListener('input', olcham);
  matn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); maslahatYubor(matn.value); }
  });
  yubor.onclick = () => maslahatYubor(matn.value);

  // Rasm biriktirish — AI toshma yoki qizarishni ko'rib maslahat beradi
  $('#chat-biriktir').onclick = () => { titra(); fayl.click(); };
  fayl.onchange = async () => {
    const f = fayl.files?.[0];
    fayl.value = '';
    if (!f) return;
    try {
      const r = await rasmniTayyorla(f);
      // rasmniTayyorla data-URL qaytaradi ("data:image/jpeg;base64,…").
      // Prefiksni SHU YERDA ajratamiz: aks holda oldindan ko'rishda
      // "data:...;base64,data:...;base64,…" bo'lib, rasm ochilmaydi.
      const mos = String(r.data).match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
      chatRasm = mos ? { data: mos[2], mime: mos[1] } : { data: r.data, mime: r.mime };
      rasmOldindaniChiz();
      matn.focus();
    } catch (e) { ogohlantir(e.message || 'Rasmni o‘qib bo‘lmadi'); }
  };

  // Input bosilganda pastki menyu berkiladi — klaviatura tepasida
  // faqat yozish paneli qoladi
  matn.addEventListener('focus', () => {
    document.body.classList.add('yozilmoqda');
    setTimeout(pastgaTush, 260);
  });
  matn.addEventListener('blur', () => document.body.classList.remove('yozilmoqda'));

  const savolBos = (e) => {
    const b = e.target.closest('[data-savol]');
    if (b) { titra(); maslahatYubor(b.dataset.savol); }
  };
  $('#maslahat-oqim').addEventListener('click', (e) => {
    if (e.target.closest('[data-savol]')) return savolBos(e);

    // AI rasm so'radi — kamerani ochamiz
    if (e.target.closest('[data-rasm-sora]')) { titra(); return void fayl.click(); }

    // To'plamni bir bosishda savatga
    const tp = e.target.closest('[data-toplam]');
    if (tp) {
      const idlar = tp.dataset.toplam.split(',').map(Number).filter(Boolean);
      tp.disabled = true;
      tp.classList.add('qoshildi');
      tp.innerHTML = ik('tasdiq', 18) + 'Savatda';
      toplamniSavatga(idlar);
      return;
    }

    // Bitta mahsulotni savatga: karta ochilmasin
    const q = e.target.closest('[data-qosh]');
    if (q) {
      e.stopPropagation();
      const id = Number(q.dataset.qosh);
      q.disabled = true; q.classList.add('qoshildi'); q.innerHTML = ik('tasdiq', 19);
      savatga(id);
      return;
    }
    const k = e.target.closest('[data-mahsulot]');
    if (k) mahsulotOyna(Number(k.dataset.mahsulot));
  });
  $('#maslahat-takliflar').addEventListener('click', savolBos);

  $('#maslahat-tozala').onclick = () => {
    holat.suhbat = []; chatRasm = null; rasmOldindaniChiz();
    suhbatniSaqla(); maslahatniChiz(); titra();
  };
}

/** To'plamdagi hamma mahsulotni bitta so'rov bilan savatga soladi. */
async function toplamniSavatga(idlar) {
  const yangi = idlar.filter((id) => !holat.savat.some((r) => r.products.id === id));
  if (!yangi.length) return;
  const eski = holat.savat.map((r) => ({ ...r }));
  for (const id of yangi) {
    const p = holat.mahsulotlar.find((x) => x.id === id);
    if (p) holat.savat.push({ quantity: 1, products: p });
  }
  savatniKorsat(); titra('medium');
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam', items: yangi.map((id) => ({ product_id: id, quantity: 1 })) }) });
    savatniSinxronla();
  } catch (e) {
    holat.savat = eski; savatniKorsat(); ogohlantir(e.message);
  }
}

// ================= ILOVANI O'RNATISH (PWA) =================
// Telegram ichida ilova "mini app" bo'lib ochiladi. Lekin odam uni
// telefon ekraniga chiqarib qo'ysa, KiOVO ikonkasini bosib to'g'ridan
// to'g'ri kiradi — Telegramni ochish, botni topish, tugmani bosish
// bosqichlari yo'qoladi.

let ornatishHodisasi = null;

function pwaniUla() {
  // 1) TELEGRAM yo'li (Bot API 8.0+). Mini App ichida eng to'g'ri usul:
  //    Telegram foydalanuvchidan so'raydi va KiOVO yorlig'ini telefon
  //    bosh ekraniga qo'yadi. Brauzerning PWA taklifi kerak emas.
  if (tg?.addToHomeScreen) {
    holat.ornatishUsuli = 'telegram';
    holat.ornatishMumkin = true;
    // Allaqachon qo'shilgan bo'lsa tugmani ko'rsatmaymiz
    try {
      tg.checkHomeScreenStatus?.((h) => {
        const bor = h === 'added';
        if (bor !== !holat.ornatishMumkin) {
          holat.ornatishMumkin = !bor;
          if (holat.tab === 'profil') profilniChiz();
        }
      });
    } catch { /* eski klient */ }
    tg.onEvent?.('homeScreenAdded', () => {
      holat.ornatishMumkin = false;
      if (holat.tab === 'profil') profilniChiz();
    });
    return;
  }

  // 2) BRAUZER yo'li (PWA). Telegramdan tashqarida ochilganda ishlaydi.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ornatishHodisasi = e;
    holat.ornatishUsuli = 'pwa';
    holat.ornatishMumkin = true;
    if (holat.tab === 'profil') profilniChiz();
  });
  window.addEventListener('appinstalled', () => {
    ornatishHodisasi = null;
    holat.ornatishMumkin = false;
    if (holat.tab === 'profil') profilniChiz();
  });

  // 3) Hech qaysisi bo'lmasa — qo'lda qo'shish yo'riqnomasi.
  const ornatilgan = matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
  if (!ornatilgan) { holat.ornatishMumkin = true; holat.ornatishUsuli ||= 'qolda'; }

  navigator.serviceWorker?.register('/app/sw.js').catch(() => { /* HTTPS yo'q */ });
}

async function ilovaniOrnat() {
  titra('medium');

  // Telegram o'zi so'raydi — bizga yo'riqnoma ham, tugma ham kerak emas
  if (tg?.addToHomeScreen) {
    try { tg.addToHomeScreen(); return; }
    catch { /* qo'llab-quvvatlamadi — pastdagi yo'lga tushamiz */ }
  }

  if (ornatishHodisasi) {
    ornatishHodisasi.prompt();
    const { outcome } = await ornatishHodisasi.userChoice;
    if (outcome === 'accepted') { ornatishHodisasi = null; holat.ornatishMumkin = false; }
    profilniChiz();
    return;
  }

  // Qo'lda o'rnatish yo'riqnomasi
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $('#modal-tan').innerHTML = `
    <div style="padding:18px 18px 0">
      <h2 style="margin-bottom:12px">Ilovani telefonga qo‘shish</h2>
      ${iOS ? `
        <div class="ornat-qadam"><i>1</i><span>Pastdagi <b>Ulashish</b> tugmasini bosing
          (kvadrat ichidan chiqayotgan strelka).</span></div>
        <div class="ornat-qadam"><i>2</i><span><b>Add to Home Screen</b> ni tanlang.</span></div>
        <div class="ornat-qadam"><i>3</i><span><b>Add</b> ni bosing — KiOVO ikonkasi
          ekranda paydo bo‘ladi.</span></div>` : `
        <div class="ornat-qadam"><i>1</i><span>Brauzer menyusini oching — yuqori o‘ngdagi uch nuqta.</span></div>
        <div class="ornat-qadam"><i>2</i><span><b>Ilovani o‘rnatish</b> yoki
          <b>Bosh ekranga qo‘shish</b> ni tanlang.</span></div>
        <div class="ornat-qadam"><i>3</i><span>Tasdiqlang — KiOVO ikonkasi ekranda paydo bo‘ladi.</span></div>`}
      <div class="ozgina" style="margin-top:12px">
        Telegram ilovangiz eski bo‘lsa bu tugma yo‘riqnoma ko‘rsatadi.
        Telegramni yangilasangiz, qo‘shish bir bosishda bo‘ladi.</div>
      <button class="ikkilamchi" id="t-ornat-yop" style="margin-top:16px">Tushunarli</button>
    </div>`;
  modalOch();
  $('#t-ornat-yop').onclick = modalYop;
}

// ---------------- Tablar ----------------
const TABLAR = ['katalog','skaner','maslahat','savat','profil','natija'];
// Eski havolalar (botdagi «?tab=buyurtma») profilga olib boradi —
// buyurtmalar ro'yxati endi shu yerda.
const TAB_TAQMOQ = { buyurtma: 'profil' };
function tabOch(nom) {
  nom = TAB_TAQMOQ[nom] || nom;
  holat.tab = nom;
  sessionStorage.setItem('qq_tab', nom);
  TABLAR.forEach((t) => kor($(`#tab-${t}`), t === nom));
  $$('.menyu button').forEach((b) =>
    b.classList.toggle('tanlangan', b.dataset.tab === nom || (nom === 'natija' && b.dataset.tab === 'skaner')));
  if (nom === 'profil') profilniChiz();   // buyurtmalar bo'lim ochilganda yuklanadi
  if (nom === 'maslahat') maslahatniChiz();
  else document.body.classList.remove('yozilmoqda');
  if (nom === 'natija' && !holat.natijaKesh) natijaniChiz();
  scrollTo({ top: 0 });
}
$$('.menyu button').forEach((b) => b.onclick = () => { tabOch(b.dataset.tab); titra(); });
maslahatniUla();
$('#t-xabarlar').onclick = () => { titra(); xabarlarOyna(); };
$('#t-savatga-otish').onclick = () => { titra(); tabOch('savat'); };
$('#t-qid-skaner').onclick = () => { titra('medium'); tabOch('skaner'); };

boshla();
})();
