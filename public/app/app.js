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
  karta: { raqam: '', egasi: '' }, konsultatsiya: '',
  draft: {}, tab: 'katalog',
};

// ---------------- API ----------------
async function api(yol, opt = {}) {
  const res = await fetch(yol, {
    ...opt,
    headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '', ...(opt.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
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

/** Turli yozilishni bir xilga keltiradi: oʻ/o' → o, ғ/gʻ → g */
const meyor = (s) => String(s || '').toLowerCase()
  .replace(/[''`ʻʼ’‘]/g, '')
  .replace(/[^a-z0-9Ѐ-ӿ\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Mahsulotdan qidiriladigan matn tuzadi. */
function indeks(p) {
  const kat = holat.kategoriyalar.find((k) => k.id === p.category_id)?.name || '';
  return meyor([p.name, p.brand, kat, p.step, p.description,
    ...(p.concerns || []), ...(p.skin_types || []), ...(p.actives || [])].join(' '));
}

/** Qidiruvni baholaydi: 0 = mos emas, katta son = yaxshiroq mos. */
function ball(p, sorov) {
  if (!sorov) return 1;
  const sozlar = sorov.split(' ').filter((w) => w.length > 1);
  if (!sozlar.length) return 1;

  const matn = p._indeks;
  const nom  = meyor(`${p.brand || ''} ${p.name}`);
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

// ---------------- Ishga tushirish ----------------
async function boshla() {
  // Statik razmetkadagi <i data-ik> larni chizma ikonga to'ldiramiz
  ikonlarniChiz();
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
    filtrlarniChiz(); mahsulotlarniChiz();
    return;
  }

  kor($('#ilova'), true);
  karuselniChiz();
  namunaniChiz();
  filtrlarniChiz(); mahsulotlarniChiz(); limitniChiz();
  await Promise.all([savatniYangila(), draftniYukla()]);

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
function karuselniChiz() {
  const quti = $('#karusel');
  const chaqiriq = $('#skaner-chaqiriq');
  const rasmlar = (holat.karusel || []).filter(Boolean);

  if (!quti || !rasmlar.length) {
    kor(quti, false);
    kor(chaqiriq, true);
    return;
  }
  kor(chaqiriq, false);
  kor(quti, true);

  const lenta = $('#karusel-lenta');
  lenta.innerHTML = rasmlar
    .map((id) => `<img src="/media/${esc(id)}" alt="" loading="lazy">`).join('');
  $('#karusel-nuqtalar').innerHTML = rasmlar.length > 1
    ? rasmlar.map((_, i) => `<i class="${i ? '' : 'faol'}"></i>`).join('') : '';

  // Rasm ochilmasa (o'chirilgan bo'lsa) karusel ham yopiladi
  lenta.querySelectorAll('img').forEach((im) => {
    im.onerror = () => { if (!lenta.querySelector('img:not([data-xato])')) {
      kor(quti, false); kor(chaqiriq, true); } im.dataset.xato = '1'; im.remove(); };
  });

  let joriy = 0;
  const kor_ = () => {
    lenta.style.transform = `translateX(-${joriy * 100}%)`;
    $$('#karusel-nuqtalar i').forEach((n, i) => n.classList.toggle('faol', i === joriy));
  };
  clearInterval(karuselTaymer);
  if (rasmlar.length > 1) {
    karuselTaymer = setInterval(() => { joriy = (joriy + 1) % rasmlar.length; kor_(); }, 4500);
  }
  // Barmoq bilan surish
  let boshX = 0;
  quti.ontouchstart = (e) => { boshX = e.touches[0].clientX; clearInterval(karuselTaymer); };
  quti.ontouchend = (e) => {
    const farq = e.changedTouches[0].clientX - boshX;
    if (Math.abs(farq) > 40) {
      joriy = (joriy + (farq < 0 ? 1 : rasmlar.length - 1)) % rasmlar.length;
      kor_();
    }
  };
  $('#karusel-tugma').onclick = () => $('[data-tab=skaner]')?.click();
  kor_();
}

/** Skaner ekranidagi namuna surat — admin yuklagan bo'lsa ko'rsatiladi. */
function namunaniChiz() {
  const karta = $('#namuna-karta');
  const rasm = $('#namuna-rasm');
  if (!karta || !rasm) return;
  if (!holat.namuna) return void kor(karta, false);
  rasm.src = `/media/${holat.namuna}`;
  // Rasm ochilmasa (o'chirilgan bo'lsa) bo'sh ramka qolmasin
  rasm.onerror = () => kor(karta, false);
  kor(karta, true);
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
    filtrlarniChiz(); mahsulotlarniChiz(); titra();
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

  const yangila = () => { filtrOyna(); mahsulotlarniChiz(); filtrlarniChiz(); titra(); };
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
    ? `<img src="/media/${esc(p.poster_id)}" alt="${esc(p.name)}" loading="lazy">`
    : ik('shisha', 44);
  return `<div class="rasm" style="${p.poster_id ? '' : fon};${uslub}">${ich}${nishonlar}</div>`;
}

// Bir martada nechta mahsulot chiziladi. Hammasini birdan qo'yish
// (2000 ta karta) telefonda 1,5–3 soniya qotishga olib kelardi —
// pastga tushgan sari qo'shib boramiz.
const SAHIFA = 24;
let kuzatuvchi = null;

function mahsulotlarniChiz() {
  const royxat = saralangan();
  const bosh = royxat.length === 0;
  kor($('#katalog-bosh'), bosh);
  $('#natija-soni').textContent = bosh ? '' :
    (holat.qidiruv ? `${royxat.length} ta topildi` : `${royxat.length} ta mahsulot`);
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

function kartaHtml(p) {
  const nishonlar = [];
  if (p.stock === 0) nishonlar.push('<span class="nishon-kichik yoq">Tugagan</span>');
  else if (p.stock <= 3) nishonlar.push(`<span class="nishon-kichik">Oxirgi ${p.stock} ta</span>`);
  if (p.old_price && p.old_price > p.price) nishonlar.push('<span class="nishon-kichik">Chegirma</span>');
  return `
  <button class="mahsulot" data-id="${p.id}">
    ${rasmHtml(p, '', nishonlar.length ? `<span class="nishonlar">${nishonlar.join('')}</span>` : '')}
    <div class="mtan">
      <div class="mbrend">${esc(p.brand || '')}</div>
      <div class="mnom">${esc(p.name)}</div>
      <div class="mnarx">${qisqaNarx(p.price)} so'm${
        p.old_price && p.old_price > p.price ? `<s>${qisqaNarx(p.old_price)}</s>` : ''}</div>
    </div>
  </button>`;
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
    el.onclick = () => mahsulotOyna(Number(el.dataset.id));
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
  qidiruvTimer = setTimeout(mahsulotlarniChiz, 140);
};
$('#qidiruv-tozala').onclick = () => {
  holat.qidiruv = ''; qidiruvEl.value = '';
  kor($('#qidiruv-tozala'), false); mahsulotlarniChiz();
};
$('#t-filtr-tozala').onclick = () => {
  holat.qidiruv = ''; qidiruvEl.value = '';
  holat.kategoriya = 'hammasi'; holat.narxFiltr = 'hammasi'; holat.saralash = 'ommabop';
  kor($('#qidiruv-tozala'), false);
  filtrlarniChiz(); mahsulotlarniChiz();
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
  $('#modal-tan').innerHTML = `
    ${rasmHtml(p, 'aspect-ratio:1/1;font-size:64px')}
    <div style="padding:18px 18px 0">
      <div class="mbrend">${esc(p.brand || '')}</div>
      <h2 style="margin:5px 0 10px">${esc(p.name)}</h2>
      <div style="font-size:23px;font-weight:700">${narx(p.price)}
        ${p.old_price && p.old_price > p.price ? `<s style="font-size:15px;color:var(--och);font-weight:400">${narx(p.old_price)}</s>` : ''}</div>
      ${p.description ? `<p class="mayda" style="margin-top:12px">${esc(p.description)}</p>` : ''}
      <div style="margin-top:12px">
        ${p.volume    ? qtr('Hajm', esc(p.volume)) : ''}
        ${p.country   ? qtr('Ishlab chiqarilgan', esc(p.country === 'KR' ? 'Koreya' : p.country)) : ''}
        ${p.skin_types?.length ? qtr('Teri turi', p.skin_types.map(esc).join(', ')) : ''}
        ${p.concerns?.length   ? qtr('Yordam beradi', p.concerns.map(esc).join(', ')) : ''}
        ${qtr('Omborda', p.stock > 0 ? `${p.stock} dona` : '<span style="color:var(--qizil)">tugagan</span>')}
      </div>
      ${p.usage_text ? `<div class="ogoh" style="margin-top:14px"><b>Qanday foydalanish</b><br>${esc(p.usage_text)}</div>` : ''}
      ${p.ingredients ? `<div style="margin-top:12px"><h3>Tarkibi</h3>
        <p class="mayda" style="margin-top:5px">${esc(p.ingredients)}</p></div>` : ''}
      ${p.warnings ? `<div class="ogoh" style="margin-top:12px;background:var(--qizil-och);color:var(--qizil)">${esc(p.warnings)}</div>` : ''}
      <button class="asosiy" style="margin-top:18px" id="t-savatga" ${p.stock > 0 ? '' : 'disabled'}>
        ${p.stock > 0 ? (savatda ? `Savatda (${savatda}) · yana qo‘shish` : 'Savatga qo‘shish') : 'Omborda yo‘q'}
      </button>
    </div>`;
  modalOch();
  const t = $('#t-savatga');
  if (t && p.stock > 0) t.onclick = async () => { await savatga(p.id); modalYop(); };
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
  const tavsiyalar = (t.routine || []).map((r) => ({ ...r, p: karta.get(r.product_id) })).filter((r) => r.p);
  const jami = tavsiyalar.reduce((s, r) => s + r.p.price, 0);

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
          ${r.p.poster_id ? `<img src="/media/${esc(r.p.poster_id)}" alt="" loading="lazy">`
                          : ik('shisha', 26)}
          <i class="tk-raqam">${i + 1}</i></span>
        <span class="tk-bosqich">${esc(BOSQICH[r.bosqich] || r.bosqich)}</span>
        <span class="tk-nom">${esc(r.p.name)}</span>
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
    <button class="asosiy" id="t-hammasi" style="margin-top:12px">${ik('savat',18)}Hammasini savatga solish</button>
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
  $('#t-qayta').onclick = () => tabOch('skaner');
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
  const n = $('#savat-nishon');
  n.textContent = soni; kor(n, soni > 0);
  savatniChiz();
}

/** Serverdan haqiqiy holatni olib, ekranni moslashtiradi. */
async function savatniSinxronla() {
  try {
    holat.savat = (await api('/api/cart')).savat || [];
    savatniKorsat();
  } catch { /* keyingi safar */ }
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
  <div class="satr-bosh">
    <span class="mayda">${holat.savat.length} xil mahsulot</span>
    <button class="matn-tugma" id="t-savat-tozala">${ik('ochirish',16)}Savatni tozalash</button>
  </div>
  <div class="karta">
    ${holat.savat.map(({ products: p, quantity }) => `
      <div class="savat-qator">
        <div class="savat-rasm" style="${p.poster_id ? '' :
          `background:linear-gradient(135deg,#3a3330,#6b5d55)`}">
          ${p.poster_id ? `<img src="/media/${esc(p.poster_id)}" alt="">` : ik('shisha', 44)}</div>
        <div class="savat-tan">
          <div class="savat-nom">${esc(p.name)}</div>
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
    <div class="qtr jami"><span class="k">Mahsulotlar jami</span><span class="v">${narx(jami)}</span></div>
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
  $('#profil-ism').textContent = ism || 'Profilim';
  $('#profil-tel').textContent = u.phone || '';

  const m = holat.menejer || {};
  const tgNom = String(holat.konsultatsiya || '').replace(/^@/, '');
  const tel = String(m.telefon || '');

  $('#profil-tan').innerHTML = `
    <div class="karta">
      <div class="profil-raqamlar">
        <div><b>${st.tahlil ?? 0}</b><span>tahlil</span></div>
        <div><b>${st.buyurtma ?? 0}</b><span>buyurtma</span></div>
        <div><b>${qisqaNarx(st.jami_xarid || 0)}</b><span>so‘m xarid</span></div>
      </div>
    </div>

    <div class="karta">
      ${qtr('Ism', esc(ism || '—'))}
      ${qtr('Telefon', esc(u.phone || '—'))}
      ${qtr('Yosh', u.age ? u.age + ' yosh' : '—')}
      ${u.viloyat ? qtr('Hudud', esc([u.viloyat, u.tuman].filter(Boolean).join(', '))) : ''}
    </div>

    <div class="ichki">
      ${tgNom ? `<a class="tanlov-tugma" href="https://t.me/${esc(tgNom)}" target="_blank">
        <span>Konsultatsiya${m.ish_vaqti ? ` · <span class="ozgina">${esc(m.ish_vaqti)}</span>` : ''}</span>
        <span class="oq">›</span></a>` : ''}
      ${tel ? `<a class="tanlov-tugma" href="tel:${esc(tel.replace(/[^+\d]/g, ''))}">
        <span>${esc(tel)}</span><span class="oq">›</span></a>` : ''}
      <button class="tanlov-tugma" id="t-profil-yordam">
        <span>${ik('yordam',17)} Yordam va tez-tez so‘raladigan savollar</span><span class="oq">›</span></button>
      <a class="tanlov-tugma" href="/oferta" target="_blank">
        <span>Ommaviy oferta</span><span class="oq">›</span></a>
      <button class="tanlov-tugma" id="t-profil-ochir">
        <span style="color:var(--qizil)">Ma’lumotlarimni o‘chirish</span><span class="oq">›</span></button>
    </div>`;

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

async function buyurtmalarniChiz({ majburiy = false } = {}) {
  const el = $('#buyurtma-tan');
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
          <div><div style="font-weight:700">${esc(o.order_no)}</div>
            <div class="ozgina">${new Date(o.created_at).toLocaleDateString('uz-UZ')}</div></div>
          <span class="yorliq ${sinf}">${nom}</span>
        </div>
        ${o.items.map((i) => `<div class="qtr"><span class="k">${esc(i.name)} × ${i.qty}</span>
          <span class="v">${qisqaNarx(i.price * i.qty)}</span></div>`).join('')}
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

// ---------------- Tablar ----------------
const TABLAR = ['katalog','skaner','savat','profil','natija'];
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
  if (nom === 'profil') { profilniChiz(); buyurtmalarniChiz(); }
  if (nom === 'natija' && !holat.natijaKesh) natijaniChiz();
  scrollTo({ top: 0 });
}
$$('.menyu button').forEach((b) => b.onclick = () => { tabOch(b.dataset.tab); titra(); });
$('#skaner-chaqiriq').onclick = () => { tabOch('skaner'); titra('medium'); };

boshla();
})();
