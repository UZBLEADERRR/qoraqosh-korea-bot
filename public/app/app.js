/* QoraQosh Mini App */
(() => {
'use strict';

const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
try { tg?.disableVerticalSwipes?.(); } catch {}

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
  chegirmalar: [], karta: { raqam: '', egasi: '' }, konsultatsiya: '',
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
  hammasi: { nom: '💰 Barcha narx', tekshir: () => true },
  arzon:   { nom: '100 mingacha',   tekshir: (p) => p.price < 100000 },
  orta:    { nom: '100–150 ming',   tekshir: (p) => p.price >= 100000 && p.price <= 150000 },
  qimmat:  { nom: '150 mingdan',    tekshir: (p) => p.price > 150000 },
};
const SARALASH = {
  ommabop:  { nom: '🔥 Ommabop',  cmp: (a, b) => (b.sold_count || 0) - (a.sold_count || 0) },
  arzondan: { nom: '↑ Arzondan',  cmp: (a, b) => a.price - b.price },
  qimmatdan:{ nom: '↓ Qimmatdan', cmp: (a, b) => b.price - a.price },
};

// ---------------- Ishga tushirish ----------------
async function boshla() {
  try {
    const k = await api('/api/catalog');
    holat.kategoriyalar = k.kategoriyalar;
    holat.mahsulotlar   = k.mahsulotlar.map((p) => ({ ...p, _indeks: '' }));
    holat.mahsulotlar.forEach((p) => { p._indeks = indeks(p); });
    holat.yetkazish   = k.yetkazish;
    holat.chegirmalar = k.chegirmalar || [];
    holat.karta       = k.karta || { raqam: '', egasi: '' };
    holat.konsultatsiya = k.konsultatsiya || '';
  } catch (e) { console.error(e); }

  try {
    const me = await api('/api/me');
    holat.user = me.user;
    holat.tahlil = me.oxirgi_tahlil;
    if (!me.user.royxatdan_otgan) return royxatEkrani();
  } catch {
    kor($('#ilova'), true);              // Telegram tashqarisida — faqat katalog
    kategoriyalarniChiz(); filtrlarniChiz(); mahsulotlarniChiz();
    return;
  }

  kor($('#ilova'), true);
  kor($('#skaner-chaqiriq'), true);
  kategoriyalarniChiz(); filtrlarniChiz(); mahsulotlarniChiz();
  await Promise.all([savatniYangila(), draftniYukla()]);

  const p = new URLSearchParams(location.search);
  if (p.get('tavsiya') === '1') await tavsiyaniSavatgaSol();
  const boshlangich = p.get('tab') || sessionStorage.getItem('qq_tab') || 'katalog';
  if (boshlangich === 'natija' && holat.tahlil) natijaniChiz();
  tabOch(['katalog','skaner','savat','buyurtma','natija'].includes(boshlangich) ? boshlangich : 'katalog');
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
    if (tana.full_name.length < 3) return xato.textContent = '✍️ Ismingizni to‘liq yozing.';
    if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, '')))
      return xato.textContent = '📱 Telefon: +998901234567 ko‘rinishida.';
    if (!tana.age || tana.age < 12 || tana.age > 90)
      return xato.textContent = '🎂 Yoshni 12–90 oralig‘ida kiriting.';

    $('#t-roziman').disabled = true;
    try {
      await api('/api/register', { method: 'POST', body: JSON.stringify(tana) });
      ['f-ism','f-tel','f-yosh'].forEach((id) => localStorage.removeItem('qq_' + id));
      titra('medium');
      location.reload();
    } catch (e) { xato.textContent = e.message; $('#t-roziman').disabled = false; }
  };
}

// ---------------- Katalog ----------------
function kategoriyalarniChiz() {
  const el = $('#kategoriyalar');
  const hammasi = [{ slug:'hammasi', name:'Hammasi', emoji:'✨' }, ...holat.kategoriyalar];
  el.innerHTML = hammasi.map((k) =>
    `<button data-kat="${esc(k.slug)}" class="${k.slug === holat.kategoriya ? 'tanlangan' : ''}">${esc(k.emoji || '')} ${esc(k.name)}</button>`).join('');
  $$('button', el).forEach((b) => b.onclick = () => {
    holat.kategoriya = b.dataset.kat; kategoriyalarniChiz(); mahsulotlarniChiz(); titra();
  });
}

function filtrlarniChiz() {
  const el = $('#filtrlar');
  el.innerHTML =
    Object.entries(NARX_FILTR).map(([k, v]) =>
      `<button data-narx="${k}" class="${k === holat.narxFiltr ? 'tanlangan' : ''}">${esc(v.nom)}</button>`).join('') +
    `<span style="flex:0 0 8px"></span>` +
    Object.entries(SARALASH).map(([k, v]) =>
      `<button data-sara="${k}" class="${k === holat.saralash ? 'tanlangan' : ''}">${esc(v.nom)}</button>`).join('');
  $$('[data-narx]', el).forEach((b) => b.onclick = () => {
    holat.narxFiltr = b.dataset.narx; filtrlarniChiz(); mahsulotlarniChiz(); titra();
  });
  $$('[data-sara]', el).forEach((b) => b.onclick = () => {
    holat.saralash = b.dataset.sara; filtrlarniChiz(); mahsulotlarniChiz(); titra();
  });
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
  const fon = `background:linear-gradient(135deg,${esc(p.gradient?.[0] || '#333')},${esc(p.gradient?.[1] || '#666')})`;
  const ich = p.poster_id
    ? `<img src="/media/${esc(p.poster_id)}" alt="${esc(p.name)}" loading="lazy">`
    : esc(p.emoji || '🧴');
  return `<div class="rasm" style="${p.poster_id ? '' : fon};${uslub}">${ich}${nishonlar}</div>`;
}

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

  $('#mahsulotlar').innerHTML = royxat.map((p) => {
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
  }).join('');
  $$('.mahsulot', $('#mahsulotlar')).forEach((el) =>
    el.onclick = () => mahsulotOyna(Number(el.dataset.id)));
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
  holat.qidiruv = ''; qidiruvEl.value = ''; holat.kategoriya = 'hammasi'; holat.narxFiltr = 'hammasi';
  kor($('#qidiruv-tozala'), false);
  kategoriyalarniChiz(); filtrlarniChiz(); mahsulotlarniChiz();
};
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
        ${p.volume    ? qtr('📏 Hajm', esc(p.volume)) : ''}
        ${p.country   ? qtr('🌏 Ishlab chiqarilgan', esc(p.country === 'KR' ? 'Koreya 🇰🇷' : p.country)) : ''}
        ${p.skin_types?.length ? qtr('🧴 Teri turi', p.skin_types.map(esc).join(', ')) : ''}
        ${p.concerns?.length   ? qtr('🎯 Yordam beradi', p.concerns.map(esc).join(', ')) : ''}
        ${qtr('📦 Omborda', p.stock > 0 ? `${p.stock} dona` : '<span style="color:var(--qizil)">tugagan</span>')}
      </div>
      ${p.usage_text ? `<div class="ogoh" style="margin-top:14px">📖 <b>Qanday foydalanish</b><br>${esc(p.usage_text)}</div>` : ''}
      ${p.ingredients ? `<div style="margin-top:12px"><h3>🧪 Tarkibi</h3>
        <p class="mayda" style="margin-top:5px">${esc(p.ingredients)}</p></div>` : ''}
      ${p.warnings ? `<div class="ogoh" style="margin-top:12px;background:var(--qizil-och);color:var(--qizil)">⚠️ ${esc(p.warnings)}</div>` : ''}
      <button class="asosiy" style="margin-top:18px" id="t-savatga" ${p.stock > 0 ? '' : 'disabled'}>
        ${p.stock > 0 ? (savatda ? `🛒 Savatda (${savatda}) · yana qo‘shish` : '🛒 Savatga qo‘shish') : '😔 Omborda yo‘q'}
      </button>
    </div>`;
  kor($('#modal'), true);
  const t = $('#t-savatga');
  if (t && p.stock > 0) t.onclick = async () => { await savatga(p.id); modalYop(); };
}
const qtr = (k, v) => `<div class="qtr"><span class="k">${k}</span><span class="v">${v}</span></div>`;
const modalYop = () => kor($('#modal'), false);
$$('[data-yop]').forEach((el) => el.onclick = modalYop);

// ---------------- Skaner ----------------
let tanlanganRasm = null;
$('#tushirish').onclick = () => $('#fayl').click();
$('#fayl').onchange = async (e) => {
  const fayl = e.target.files?.[0];
  if (!fayl) return;
  try {
    tanlanganRasm = await kichiklashtir(fayl);
    $('#oldindan-rasm').src = tanlanganRasm;
    kor($('#skaner-boshlash'), false); kor($('#skaner-oldindan'), true);
  } catch { ogohlantir('Rasmni o‘qib bo‘lmadi.'); }
};
$('#t-boshqa').onclick = () => {
  tanlanganRasm = null; $('#fayl').value = '';
  kor($('#skaner-oldindan'), false); kor($('#skaner-boshlash'), true);
};
$('#t-tahlil').onclick = tahlilQil;

function kichiklashtir(fayl, max = 1024, sifat = 0.85) {
  return new Promise((res, rej) => {
    const o = new Image();
    o.onload = () => {
      const n = Math.min(1, max / Math.max(o.width, o.height));
      const c = document.createElement('canvas');
      c.width = Math.round(o.width * n); c.height = Math.round(o.height * n);
      c.getContext('2d').drawImage(o, 0, 0, c.width, c.height);
      URL.revokeObjectURL(o.src);
      res(c.toDataURL('image/jpeg', sifat));
    };
    o.onerror = rej; o.src = URL.createObjectURL(fayl);
  });
}

async function tahlilQil() {
  if (!tanlanganRasm) return;
  kor($('#skaner-oldindan'), false); kor($('#skaner-yuklanmoqda'), true);
  try {
    const j = await api('/api/scan', { method: 'POST',
      body: JSON.stringify({ image: tanlanganRasm, mime: 'image/jpeg' }) });
    kor($('#skaner-yuklanmoqda'), false);
    if (!j.yaroqli) {
      kor($('#skaner-boshlash'), true);
      radOyna(j);
      return;
    }
    holat.tahlil = {
      age_estimate: j.tahlil.taxminiy_yosh, skin_tone: j.tahlil.teri_rangi,
      skin_type: j.tahlil.teri_turi, score: j.tahlil.ball,
      problems: j.tahlil.muammolar, forecast: j.tahlil.prognoz,
      routine: j.tahlil.tavsiya, raw: { xulosa: j.tahlil.xulosa }, is_offline: j.tahlil.oflayn,
    };
    kor($('#skaner-boshlash'), true);
    tanlanganRasm = null; $('#fayl').value = '';
    natijaniChiz(); tabOch('natija'); titra('medium');
  } catch (e) {
    kor($('#skaner-yuklanmoqda'), false); kor($('#skaner-boshlash'), true);
    ogohlantir(e.message);
  }
}

const RAD = {
  yuz_yoq:['🙈','Rasmda yuz topilmadi'], uzoq:['🔭','Yuz juda uzoqda'],
  xira:['🌫','Rasm xira yoki qimirlagan'], qorongi:['🌑','Yorug‘lik yetarli emas'],
  yopiq:['🧣','Yuz yopilgan'], bir_nechta:['👥','Kadrda bir nechta odam'],
  pardoz:['💄','Qalin pardoz yoki filtr'], sunday:['🤖','Rasm sun’iy ko‘rinadi'],
  ekran:['📺','Ekrandan olingan surat'], yuz_emas:['🖼','Bu yuz surati emas'],
};
function radOyna(j) {
  const [em, matn] = RAD[j.sabab] || RAD.xira;
  $('#modal-tan').innerHTML = `
    <div style="padding:24px 18px 0;text-align:center">
      <div style="font-size:54px">${em}</div>
      <h2 style="margin:10px 0 6px">Bu rasm to‘g‘ri kelmadi</h2>
      <p style="color:var(--qizil);font-weight:600">${esc(matn)}</p>
      ${j.izoh ? `<p class="mayda">${esc(j.izoh)}</p>` : ''}
      <div style="text-align:left;margin-top:16px">
        <div class="talab"><span class="b">☀️</span><div>Yorug‘ joyda turing</div></div>
        <div class="talab"><span class="b">🤳</span><div>Yuz ekranni to‘ldirsin</div></div>
        <div class="talab"><span class="b">🧼</span><div>Pardozsiz, filtrsiz, haqiqiy surat</div></div>
      </div>
      <button class="asosiy" id="t-rad-yop" style="margin-top:18px">📸 Boshqa rasm tanlash</button>
    </div>`;
  kor($('#modal'), true);
  $('#t-rad-yop').onclick = () => { modalYop(); $('#fayl').click(); };
}

// ---------------- Tahlil natijasi ----------------
const NUQTA = ['', '🟢', '🟡', '🔴'];
const DARAJA = ['', 'yengil', 'o‘rtacha', 'kuchli'];
const DSINF  = ['', 'yengil', 'ortacha', 'kuchli'];
const BOSQICH = { tozalash:'🫧 Tozalash', toner:'💧 Toner', davolash:'🧪 Davolash',
                  namlash:'🫙 Namlash', himoya:'☀️ Quyoshdan himoya', qoshimcha:'🎭 Qo‘shimcha' };

function natijaniChiz() {
  const t = holat.tahlil;
  const el = $('#natija-tan');
  if (!t) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">🔬</div>
      <p>Hali tahlil qilinmagan</p>
      <button class="asosiy" style="max-width:260px;margin:16px auto 0" onclick="document.querySelector('[data-tab=skaner]').click()">
        Yuz skanerini ochish</button></div>`;
    return;
  }
  const karta = new Map(holat.mahsulotlar.map((p) => [p.id, p]));
  const ball = t.score ?? 0;
  const holatSoz = ball >= 80 ? 'a’lo 👏' : ball >= 65 ? 'yaxshi 🙂' : ball >= 50 ? 'o‘rtacha 😌'
                 : ball >= 35 ? 'e’tibor kerak 😕' : 'zaif 😟';
  const tavsiyalar = (t.routine || []).map((r) => ({ ...r, p: karta.get(r.product_id) })).filter((r) => r.p);
  const jami = tavsiyalar.reduce((s, r) => s + r.p.price, 0);

  el.innerHTML = `
  <div class="bosh"><div class="brend">🔬 Tahlil natijasi</div><h1>Sizning teringiz</h1></div>

  ${t.is_offline ? `<div class="karta"><div class="ogoh">⚠️ AI hozir mavjud emas — bazaviy tavsiya ko‘rsatilmoqda.</div></div>` : ''}

  <div class="karta">
    <div class="karta-bosh"><h2>✨ Umumiy holat</h2></div>
    <div style="display:flex;align-items:baseline;gap:10px">
      <div class="ball">${ball}<small>/100</small></div>
      <div class="mayda">${holatSoz}</div>
    </div>
    <div class="shkala"><i style="width:${ball}%"></i></div>
    <div style="margin-top:16px">
      ${qtr('👤 Taxminiy yosh', esc(t.age_estimate || '—'))}
      ${qtr('🎨 Teri rangi',   esc(t.skin_tone || '—'))}
      ${qtr('🧴 Teri turi',    esc(t.skin_type || '—'))}
    </div>
    ${t.raw?.xulosa ? `<p class="mayda" style="margin:14px 0 0">${esc(t.raw.xulosa)}</p>` : ''}
  </div>

  ${(t.problems || []).length ? `
  <div class="karta">
    <div class="karta-bosh"><h2>🔍 Nima topdim</h2></div>
    ${t.problems.map((m) => {
      const foiz = m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25);
      const d = m.daraja || (foiz >= 70 ? 3 : foiz >= 40 ? 2 : 1);
      return `
      <div class="muammo-blok">
        <div class="muammo-bosh">
          <span class="nuqta">${NUQTA[Math.min(3, d)]}</span>
          <span class="nom">${esc(m.nom)}</span>
          <span class="yorliq ${DSINF[Math.min(3, d)]}">${DARAJA[Math.min(3, d)]}</span>
        </div>
        <div class="olchov">
          <div class="olchov-chiziq"><i class="d${Math.min(3, d)}" style="width:${foiz}%"></i></div>
          <span class="olchov-foiz">${foiz}%</span>
        </div>
        ${m.zona   ? `<div class="satr-izoh">📍 <span>${esc(m.zona)}</span></div>` : ''}
        ${m.izoh   ? `<div class="satr-izoh">👁 <span>${esc(m.izoh)}</span></div>` : ''}
        ${m.sabab  ? `<div class="satr-izoh">🔎 <span><b>Sababi:</b> ${esc(m.sabab)}</span></div>` : ''}
        ${m.yechim ? `<div class="yechim">✅ <span><b>Yechimi:</b> ${esc(m.yechim)}</span></div>` : ''}
        ${m.ogohlantirish ? `<div class="diqqat">⚠️ <span>${esc(m.ogohlantirish)}</span></div>` : ''}
      </div>`; }).join('')}
  </div>` : ''}

  ${(t.forecast || []).length ? `
  <div class="karta">
    <div class="karta-bosh"><h2>⏳ E’tibor bermasangiz</h2></div>
    ${[...t.forecast].sort((a, b) => b.ehtimol - a.ehtimol).map((p) => `
      <div class="muammo-blok">
        <div class="muammo-bosh">
          <span class="nom">${esc(p.muammo)}</span>
          <span class="ozgina" style="margin-left:auto;white-space:nowrap">⏱ ${esc(p.muddat || '')}</span>
        </div>
        <div class="olchov">
          <div class="olchov-chiziq"><i class="prognoz-rang" style="width:${p.ehtimol}%"></i></div>
          <span class="olchov-foiz">${p.ehtimol}%</span>
        </div>
        <div class="satr-izoh">→ <span>${esc(p.natija)}</span></div>
      </div>`).join('')}
    <div class="ogoh" style="margin-top:12px">
      ⚕️ Bu ehtimollik baholari, tibbiy tashxis emas. Jiddiy belgilarda dermatologga murojaat qiling.
    </div>
  </div>` : ''}

  ${tavsiyalar.length ? `
  <div class="karta">
    <div class="karta-bosh"><h2>💡 Sizga mos parvarish</h2></div>
    <p class="mayda" style="margin-bottom:2px">Shu tartibda qo‘llang — ketma-ketlik natijaga ta’sir qiladi.</p>
    ${tavsiyalar.map((r, i) => `
      <div class="bosqich">
        <div class="raqam">${i + 1}</div>
        <div style="flex:1;min-width:0">
          <div class="qadam">${esc(BOSQICH[r.bosqich] || r.bosqich)}</div>
          <div class="bnom">${esc(r.p.name)}</div>
          <div class="bbrend">${esc(r.p.brand || '')}${r.p.volume ? ' · ' + esc(r.p.volume) : ''} — <b style="color:var(--matn)">${narx(r.p.price)}</b></div>
          ${r.sabab ? `<div class="nega"><b>❓ Nega aynan shu:</b> ${esc(r.sabab)}</div>` : ''}
          ${r.p.usage_text ? `<div class="qollash">📖 ${esc(r.p.usage_text)}</div>` : ''}
        </div>
      </div>`).join('')}
    <div class="qtr jami"><span class="k">🧾 To‘liq to‘plam</span><span class="v">${narx(jami)}</span></div>
    <button class="asosiy" id="t-hammasi" style="margin-top:12px">🛒 Hammasini savatga solish</button>
    <p class="ozgina" style="margin:10px 0 0">
      Hammasini birdan olish shart emas — tozalash, namlash va SPF dan boshlang.</p>
  </div>` : ''}

  <div class="karta">
    <button class="ikkilamchi" id="t-qayta">🔄 Boshqa rasm bilan qayta tahlil</button>
    ${holat.konsultatsiya ? `<a class="tugma ikkilamchi" style="margin-top:9px;text-decoration:none"
       href="https://t.me/${esc(holat.konsultatsiya)}" target="_blank">💬 Menejerdan maslahat so‘rash</a>` : ''}
  </div>`;

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

// ---------------- Savat ----------------
async function savatniYangila() {
  try { holat.savat = (await api('/api/cart')).savat || []; } catch { holat.savat = []; }
  const soni = holat.savat.reduce((s, r) => s + r.quantity, 0);
  const n = $('#savat-nishon');
  n.textContent = soni; kor(n, soni > 0);
  savatniChiz();
}

async function savatga(id, soni = 1) {
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: soni }) });
    await savatniYangila(); titra();
  } catch (e) { ogohlantir(e.message); }
}

const chegirmaHisobla = (oraliq) =>
  Math.min(oraliq, holat.chegirmalar.reduce((m, p) =>
    oraliq >= Number(p.dan) ? Math.max(m, Number(p.chegirma)) : m, 0));

function savatniChiz() {
  const el = $('#savat-tan');
  $('#yopishqoq-savat')?.remove();

  if (!holat.savat.length) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">🛒</div>
      <p>Savatingiz bo‘sh</p>
      <button class="asosiy" style="max-width:240px;margin:16px auto 0"
        onclick="document.querySelector('[data-tab=katalog]').click()">🛍 Do‘konga o‘tish</button></div>`;
    return;
  }

  const oraliq   = holat.savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const chegirma = chegirmaHisobla(oraliq);
  const yetkazish = oraliq >= holat.yetkazish.bepul_chegara ? 0 : holat.yetkazish.narx;
  const jami = oraliq - chegirma + yetkazish;

  // Keyingi chegirma pog'onasi
  const keyingi = holat.chegirmalar
    .map((p) => ({ dan: Number(p.dan), ch: Number(p.chegirma) }))
    .filter((p) => oraliq < p.dan).sort((a, b) => a.dan - b.dan)[0];

  el.innerHTML = `
  <div class="karta">
    ${holat.savat.map(({ products: p, quantity }) => `
      <div class="savat-qator">
        <div class="savat-rasm" style="${p.poster_id ? '' :
          `background:linear-gradient(135deg,#3a3330,#6b5d55)`}">
          ${p.poster_id ? `<img src="/media/${esc(p.poster_id)}" alt="">` : esc(p.emoji || '🧴')}</div>
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
    ${qtr('🧾 Mahsulotlar', narx(oraliq))}
    ${chegirma ? `<div class="qtr"><span class="k">🎁 Chegirma</span>
        <span class="v chegirma">−${narx(chegirma)}</span></div>` : ''}
    ${qtr('🚚 Yetkazib berish', yetkazish ? narx(yetkazish)
        : '<span style="color:var(--yashil)">bepul</span>')}
    <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(jami)}</span></div>
    ${keyingi ? `<div class="ogoh yashil" style="margin-top:12px">
        🎁 Yana <b>${narx(keyingi.dan - oraliq)}</b> qo‘shsangiz
        <b>${narx(keyingi.ch)}</b> chegirma olasiz</div>` : ''}
    ${yetkazish && oraliq < holat.yetkazish.bepul_chegara ? `<p class="ozgina" style="margin:10px 0 0">
      🚚 ${narx(holat.yetkazish.bepul_chegara - oraliq)} qo‘shsangiz yetkazish bepul</p>` : ''}
  </div>

  <div style="height:96px"></div>
  <div class="yopishqoq" id="yopishqoq-savat">
    <div class="satr"><span class="mayda">To‘lash uchun</span><b>${narx(jami)}</b></div>
    <button class="asosiy" id="t-rasmiylashtir">Buyurtmani rasmiylashtirish →</button>
  </div>`;

  $$('[data-kam]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kam), -1));
  $$('[data-kop]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kop), +1));
  $('#t-rasmiylashtir').onclick = () => checkoutOch();
}

async function ozgartir(id, delta) {
  const q = holat.savat.find((r) => r.products.id === id);
  if (!q) return;
  await api('/api/cart', { method: 'POST',
    body: JSON.stringify({ amal: 'ozgartir', product_id: id, quantity: q.quantity + delta }) });
  await savatniYangila(); titra();
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

/** Qoralamadagi manzil, bo'lmasa profilda saqlangani. */
function manzilQiymati(d) {
  return d.address || holat.user?.address || '';
}

function checkoutOch() {
  const d = holat.draft || {};
  const oraliq   = holat.savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const chegirma = chegirmaHisobla(oraliq);
  const yetkazish = oraliq >= holat.yetkazish.bepul_chegara ? 0 : holat.yetkazish.narx;
  const jami = oraliq - chegirma + yetkazish;
  const usul = d.payment === 'karta' ? 'karta' : 'naqd';

  $('#modal-tan').innerHTML = `
    <div style="padding:16px 18px 0">
      <h2>📦 Buyurtmani rasmiylashtirish</h2>
      <p class="ozgina" style="margin-top:4px">Yozganingiz avtomatik saqlanadi — chiqib ketsangiz ham yo‘qolmaydi.</p>

      <label for="b-ism">👤 Ism-familiya</label>
      <input id="b-ism" value="${esc(d.name || holat.user?.full_name || '')}">

      <label for="b-tel">📱 Telefon</label>
      <input id="b-tel" type="tel" inputmode="tel" value="${esc(d.phone || holat.user?.phone || '')}">

      <label for="b-manzil">📍 Yetkazib berish manzili
        <span class="yordam">Shahar, tuman, ko‘cha, uy va xonadon</span></label>
      <textarea id="b-manzil" placeholder="Toshkent sh., Chilonzor tumani, 5-mavze, 12-uy, 34-xonadon">${esc(manzilQiymati(d))}</textarea>

      <label for="b-izoh">💬 Izoh <span class="yordam">Ixtiyoriy</span></label>
      <input id="b-izoh" placeholder="Masalan: kechqurun qo‘ng‘iroq qiling" value="${esc(d.note || '')}">

      <label>💳 To‘lov usuli</label>
      <div class="tanlov" id="tolov-tanlov">
        <button data-usul="naqd" class="${usul === 'naqd' ? 'tanlangan' : ''}">
          <span class="belgi">💵</span><span><b>Yetkazishda naqd</b>
          <small>Kuryerga qo‘lma-qo‘l to‘laysiz</small></span></button>
        <button data-usul="karta" class="${usul === 'karta' ? 'tanlangan' : ''}">
          <span class="belgi">💳</span><span><b>Kartaga o‘tkazma</b>
          <small>Karta raqami keyingi qadamda chiqadi</small></span></button>
      </div>

      <div class="karta" style="margin:16px 0 0;padding:14px">
        ${qtr('Mahsulotlar', narx(oraliq))}
        ${chegirma ? `<div class="qtr"><span class="k">Chegirma</span><span class="v chegirma">−${narx(chegirma)}</span></div>` : ''}
        ${qtr('Yetkazish', yetkazish ? narx(yetkazish) : '<span style="color:var(--yashil)">bepul</span>')}
        <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(jami)}</span></div>
      </div>

      <div id="checkout-xato" class="xato-matn"></div>
      <button class="asosiy" id="t-yubor" style="margin-top:16px">✅ Buyurtmani tasdiqlash</button>
    </div>`;
  kor($('#modal'), true);

  const bogla = (id, kalit) => {
    const el = $('#' + id);
    el.oninput = () => { holat.draft[kalit] = el.value; draftniSaqla(); };
  };
  bogla('b-ism', 'name'); bogla('b-tel', 'phone');
  bogla('b-manzil', 'address'); bogla('b-izoh', 'note');

  $$('#tolov-tanlov button').forEach((b) => b.onclick = () => {
    holat.draft.payment = b.dataset.usul;
    $$('#tolov-tanlov button').forEach((x) => x.classList.toggle('tanlangan', x === b));
    draftniSaqla(); titra();
  });

  $('#t-yubor').onclick = buyurtmaYubor;
}

async function buyurtmaYubor() {
  const xato = $('#checkout-xato'); xato.textContent = '';
  const tana = {
    name: $('#b-ism').value.trim(), phone: $('#b-tel').value.trim(),
    address: $('#b-manzil').value.trim(), note: $('#b-izoh').value.trim(),
    payment: holat.draft.payment === 'karta' ? 'karta' : 'naqd',
  };
  if (tana.name.length < 3) return xato.textContent = '✍️ Ismni to‘liq yozing.';
  if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, '')))
    return xato.textContent = '📱 Telefon raqamini tekshiring.';
  if (tana.address.length < 10) return xato.textContent = '📍 Manzilni to‘liqroq yozing.';

  const t = $('#t-yubor'); t.disabled = true; t.textContent = 'Yuborilmoqda…';
  try {
    const j = await api('/api/order', { method: 'POST', body: JSON.stringify(tana) });
    holat.draft = {}; draftniSaqla();
    await savatniYangila(); titra('medium');
    if (tana.payment === 'karta') tolovOyna(j.buyurtma);
    else tayyorOyna(j.buyurtma);
  } catch (e) {
    xato.textContent = e.message;
    t.disabled = false; t.textContent = '✅ Buyurtmani tasdiqlash';
  }
}

function tolovOyna(o) {
  $('#modal-tan').innerHTML = `
    <div style="padding:20px 18px 0">
      <div style="text-align:center"><div style="font-size:50px">💳</div>
        <h2 style="margin-top:8px">To‘lov qiling</h2>
        <p class="mayda"><b>${esc(o.order_no)}</b> · ${narx(o.total)}</p></div>

      <div class="karta-raqam">
        <div class="ozgina" style="color:rgba(255,255,255,.8)">Karta raqami</div>
        <div class="raqam" id="karta-raqam">${esc(holat.karta.raqam || '—')}</div>
        <div class="egasi">${esc(holat.karta.egasi || '')}</div>
        <button id="t-nusxa">📋 Raqamdan nusxa olish</button>
      </div>

      <div class="ogoh" style="margin-top:14px">
        1️⃣ Yuqoridagi kartaga <b>${narx(o.total)}</b> o‘tkazing<br>
        2️⃣ To‘lov chekini rasmga oling<br>
        3️⃣ Quyidan yuklang — menejer tasdiqlaydi
      </div>

      <input type="file" id="chek-fayl" accept="image/*" hidden>
      <button class="asosiy" id="t-chek" style="margin-top:16px">📸 Chek rasmini yuklash</button>
      <button class="ikkilamchi" id="t-keyin" style="margin-top:9px">Keyinroq yuboraman</button>
      <div id="chek-holat" style="margin-top:12px"></div>
    </div>`;
  kor($('#modal'), true);

  $('#t-nusxa').onclick = async () => {
    const raqam = String(holat.karta.raqam || '').replace(/\s/g, '');
    try { await navigator.clipboard.writeText(raqam); } catch {}
    $('#t-nusxa').textContent = '✅ Nusxa olindi';
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
      <div style="font-size:56px">🎉</div>
      <h2 style="margin:12px 0 6px">Buyurtmangiz qabul qilindi!</h2>
      <p class="mayda">Raqam: <b>${esc(o.order_no)}</b></p>
      <div class="karta" style="margin:18px 0 0;text-align:left">
        ${qtr('🧾 Mahsulotlar', narx(o.subtotal))}
        ${o.discount ? `<div class="qtr"><span class="k">🎁 Chegirma</span><span class="v chegirma">−${narx(o.discount)}</span></div>` : ''}
        ${qtr('🚚 Yetkazish', o.delivery_fee ? narx(o.delivery_fee) : '<span style="color:var(--yashil)">bepul</span>')}
        <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(o.total)}</span></div>
      </div>
      <div class="ogoh ${chekBor ? 'yashil' : ''}" style="margin-top:14px;text-align:left">
        ${chekBor ? '✅ Chek qabul qilindi. Menejer tekshirib, tasdiqlaydi.'
          : o.payment_method === 'karta'
            ? '💳 To‘lovni amalga oshirib, chekni «Buyurtmalarim» bo‘limidan yuklang.'
            : '💵 To‘lov yetkazib berishda naqd pulda.'}<br>
        📞 Menejer tez orada bog‘lanadi.
      </div>
      <button class="asosiy" id="t-tayyor" style="margin-top:18px">Yaxshi</button>
    </div>`;
  kor($('#modal'), true);
  $('#t-tayyor').onclick = () => { modalYop(); tabOch('buyurtma'); buyurtmalarniChiz(); };
}

// ---------------- Buyurtmalar ----------------
const HOLAT_Y = {
  yangi:['🆕 Yangi',''], tasdiqlangan:['✅ Tasdiqlangan','yengil'], yolda:['🚚 Yo‘lda','ortacha'],
  yetkazildi:['📦 Yetkazildi','yengil'], bekor:['❌ Bekor qilingan','kuchli'],
};

async function buyurtmalarniChiz() {
  const el = $('#buyurtma-tan');
  el.innerHTML = `<div class="yuklanmoqda"><div class="aylana"></div></div>`;
  try {
    const j = await api('/api/orders');
    if (!j.buyurtmalar.length) {
      el.innerHTML = `<div class="bosh-holat"><div class="belgi">📋</div>
        <p>Hozircha buyurtmangiz yo‘q</p></div>`;
      return;
    }
    el.innerHTML = j.buyurtmalar.map((o) => {
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
        ${o.discount ? `<div class="qtr"><span class="k">🎁 Chegirma</span>
          <span class="v chegirma">−${narx(o.discount)}</span></div>` : ''}
        <div class="qtr jami"><span class="k">Jami</span><span class="v">${narx(o.total)}</span></div>
        ${o.payment_status === 'chek_yuborilgan' ? `<div class="ogoh yashil" style="margin-top:12px">
          ✅ Chek yuborildi — menejer tekshirmoqda</div>` : ''}
        ${chekKerak ? `<button class="asosiy" style="margin-top:12px" data-chek="${esc(o.order_no)}"
            data-total="${o.total}">💳 To‘lov qilish va chek yuborish</button>` : ''}
      </div>`;
    }).join('');

    $$('[data-chek]', el).forEach((b) => b.onclick = () =>
      tolovOyna({ order_no: b.dataset.chek, total: Number(b.dataset.total),
                  subtotal: Number(b.dataset.total), discount: 0, delivery_fee: 0,
                  payment_method: 'karta' }));
  } catch (e) {
    el.innerHTML = `<div class="bosh-holat"><p>${esc(e.message)}</p></div>`;
  }
}

// ---------------- Tablar ----------------
const TABLAR = ['katalog','skaner','savat','buyurtma','natija'];
function tabOch(nom) {
  holat.tab = nom;
  sessionStorage.setItem('qq_tab', nom);
  TABLAR.forEach((t) => kor($(`#tab-${t}`), t === nom));
  $$('.menyu button').forEach((b) =>
    b.classList.toggle('tanlangan', b.dataset.tab === nom || (nom === 'natija' && b.dataset.tab === 'skaner')));
  if (nom === 'buyurtma') buyurtmalarniChiz();
  if (nom === 'natija')   natijaniChiz();
  scrollTo({ top: 0 });
}
$$('.menyu button').forEach((b) => b.onclick = () => { tabOch(b.dataset.tab); titra(); });
$('#skaner-chaqiriq').onclick = () => { tabOch('skaner'); titra('medium'); };

boshla();
})();
