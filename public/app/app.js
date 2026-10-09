/* KiOVO Mini App */
// Ilova Telegram skriptini KUTADI — u faqat Telegram ichida yuklanadi
// (index.html). Play'dagi ilova va brauzerda va'da darrov bajariladi.
(window.__tgTayyor || Promise.resolve()).then(() => {
'use strict';

const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
try { tg?.disableVerticalSwipes?.(); } catch {}

const { ik, ikonlarniChiz } = window.IK;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const narx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ') + ' so‘m';
/* Tutuq belgisi. Bazada «To'plam», «yog'li» oddiy ' bilan yozilgan, ilova
   matnida esa ‘ — yonma-yon turganda bir xil ko'rinmasdi. o' va g' →
   o‘ / g‘, qolgan apostrof → ’ («ma’lumot», «L’Oréal»). Qidiruv bunga
   bog'liq emas: `meyor` hamma tutuqni olib tashlaydi. */
const tutuq = (s) => (s == null ? s : String(s)
  .replace(/([oOgG])['`ʻ‘’]/g, '$1‘').replace(/['`ʼ]/g, '’'));
const qisqaNarx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);
const titra = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred?.(t); } catch {} };
const ogohlantir = (m) => (tg?.showAlert ? tg.showAlert(m) : alert(m));
/** Ha/yo'q savoli — Telegram ichida uning o'z oynasi. */
const tasdiqla = (m) => new Promise((ok) => {
  try { if (tg?.showConfirm && tg.initData) return tg.showConfirm(m, (ha) => ok(Boolean(ha))); } catch {}
  ok(confirm(m));
});

const holat = {
  mahsulotlar: [], kategoriyalar: [], savat: [], user: null, tahlil: null,
  kategoriya: 'hammasi', qidiruv: '', narxFiltr: 'hammasi', saralash: 'ommabop',
  yetkazish: { narx: 25000, bepul_chegara: 500000 },
  chegirmalar: [], donaChegirma: { narx: 0, dan: 1 }, minimal: 0,
  karta: { raqam: '', egasi: '' }, konsultatsiya: '', suhbat: [],
  sevimlilar: new Set(),
  draft: {}, tab: 'katalog',
};

// ---------------- MANBA ----------------
// Odam qayerdan keldi (Instagram, TikTok…): www.kiovo.shop/h/ig havolasi
// `?h=ig` bilan ochadi, Telegram ilovasi esa `startapp=h_ig` bilan.
// Belgi 7 kun eslab qolinadi va so'rovlar bilan ketadi — ro'yxatdan
// o'tilgach server uni yangi hisobga yozadi (src/services/manba.js).
const MANBA_KALIT = 'kiovo_manba';
(() => {
  try {
    const q = new URLSearchParams(location.search).get('h');
    const sp = tg?.initDataUnsafe?.start_param || '';
    const ck = (document.cookie.match(/(?:^|;\s*)kq_h=([a-z0-9-]{2,40})/) || [])[1];
    const b = q || (/^h_[a-z0-9-]{2,32}$/i.test(sp) ? sp.slice(2) : '') || ck || '';
    if (/^[a-z0-9-]{2,40}$/i.test(b) && !localStorage.getItem(MANBA_KALIT)) {
      localStorage.setItem(MANBA_KALIT, JSON.stringify({ b, t: Date.now() }));
    }
  } catch { /* xotira yo'q — manba yozilmaydi, ilova ishlayveradi */ }
})();
function manbaBelgisi() {
  try {
    const m = JSON.parse(localStorage.getItem(MANBA_KALIT) || 'null');
    return m && Date.now() - m.t < 7 * 864e5 ? m.b : '';
  } catch { return ''; }
}

// ---------------- API ----------------
async function api(yol, opt = {}) {
  const token = seansToken();
  let res;
  try { res = await fetch(yol, {
    ...opt,
    headers: { 'Content-Type': 'application/json',
               'X-Init-Data': tg?.initData || '',
               ...(manbaBelgisi() ? { 'X-Manba': manbaBelgisi() } : {}),
               // Telegramdan tashqarida: botdan tasdiqlangan seans
               ...(token && !tg?.initData ? { Authorization: `Bearer ${token}` } : {}),
               ...(opt.headers || {}) },
  }); } catch {
    // Server javob bermadi — internet yo'q. Buni server xatosidan
    // ajratamiz: oflaynda ilova qurilmadagi nusxa bilan ochiladi.
    throw Object.assign(new Error('Internet aloqasi yo‘q. Ulanishni tekshiring.'), { tarmoq: true });
  }
  const data = await res.json().catch(() => ({}));
  // Seans tugagan yoki bekor qilingan — qaytadan kirish so'raymiz
  if (res.status === 401 && token && !tg?.initData) { seansOchir(); kirishEkrani();
    throw new Error(data.error || 'Sessiya tugadi'); }
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

// ================= QURILMADAGI NUSXA (JSON) =================
// Asosiy manba — server: buyurtma, to'lov va admin ishi shunga
// bog'liq. Lekin profil, oxirgi tahlil va limitning JSON nusxasi
// telefonda ham turadi: internet yo'q yoki sekin bo'lsa ilova bo'sh
// ekran o'rniga oxirgi ma'lumot bilan ochiladi. Katalogning oflayn
// nusxasini service worker saqlaydi. Chiqish va hisobni o'chirishda
// nusxa ham o'chadi.
const MENIKI = 'kiovo_meniki';
function menikiSaqla() {
  try {
    localStorage.setItem(MENIKI, JSON.stringify({ v: 1, vaqt: Date.now(),
      user: holat.user, stat: holat.stat, tahlil: holat.tahlil, limit: holat.limit,
      sevimlilar: [...(holat.sevimlilar || [])] }));
  } catch { /* xotira to'la — nusxasiz ishlayveradi */ }
}
function menikiOl() {
  try {
    const j = JSON.parse(localStorage.getItem(MENIKI) || 'null');
    return j?.v === 1 && j.user ? j : null;
  } catch { return null; }
}
const menikiOchir = () => { try { localStorage.removeItem(MENIKI); } catch {} };

/** Oflayn banner — internet qaytsa o'zi yangilanadi. */
function oflaynBanner(vaqt) {
  if ($('#oflayn')) return;
  const el = document.createElement('div');
  el.id = 'oflayn'; el.className = 'oflayn-banner'; el.setAttribute('role', 'status');
  const qachon = vaqt ? new Date(vaqt).toLocaleString('uz-UZ', { day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  el.innerHTML = `${ik('ogoh', 16)}<span>Internet yo‘q — ${qachon
    ? `${esc(qachon)} dagi` : 'oxirgi'} saqlangan ma’lumot</span>`;
  document.body.appendChild(el);
  addEventListener('online', () => location.reload(), { once: true });
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

/* VARIANTLAR. Har variant (rang, hajm) — alohida mahsulot, asosiysiga
   `variant_of` bilan bog'langan. Do'kon ro'yxatlarida FAQAT asosiysi
   («vitrina»), oynasida esa guruhning hammasi tanlov bo'lib chiqadi. */
const vitrina = () => holat.mahsulotlar.filter((p) => !p.variant_of);
function guruh(p) {
  if (!p) return [];
  const asosId = p.variant_of || p.id;
  const g = holat.mahsulotlar.filter((x) => x.id === asosId || x.variant_of === asosId);
  // Arzonidan qimmatiga: hajmlar tabiiy tartibda (30 → 200 → 400 ml)
  return g.length > 1 ? g.sort((a, b) => a.price - b.price || a.id - b.id) : [p];
}

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

// ═══════════ KO'RINISH: KUNDUZGI / TUNGI ═══════════
// Uchta holat bor: «tizim» (telefon sozlamasiga ergashadi), «kunduzgi»
// va «tungi». Tanlov FAQAT shu qurilmada saqlanadi — odam ishda oq,
// uyda qora ko'rinishni afzal ko'rishi mumkin va buni serverga
// bog'lash noqulaylik tug'diradi.
//
// CSS tomonda: `prefers-color-scheme` bloklari
// `:not([data-mavzu="kunduzgi"])` bilan himoyalangan, tungi tokenlar
// esa `[data-mavzu="tungi"]` uchun takrorlangan. Shunda tanlov
// telefon sozlamasidan ustun turadi.
// Admin bergan do'kon ranglari. Yuqorida e'lon qilinadi, chunki
// `mavzuniQoy` sahifa chizilishidan OLDIN chaqiriladi va u shu
// qiymatga murojaat qiladi.
let oxirgiMavzu = null;

const MAVZU_KALIT = 'kiovo_korinish';
const MAVZULAR = [
  { kalit: 'tizim',    nom: 'Tizim',    ik: 'ekran' },
  { kalit: 'kunduzgi', nom: 'Kunduzgi', ik: 'quyosh' },
  { kalit: 'tungi',    nom: 'Tungi',    ik: 'oy' },
];

// Standart — KUNDUZGI (och yashil fon). Tungi va «Tizim» profilda
// tanlanadi. Ilgari standart «Tizim» edi: telefoni tungi rejimdagi
// odam brendning och yashil ilovasini umuman ko'rmasdi.
const mavzuOqi = () => {
  try { return localStorage.getItem(MAVZU_KALIT) || 'kunduzgi'; } catch { return 'kunduzgi'; }
};

/**
 * Hozir qorong'i ko'rinishdami?
 *
 * MUHIM: bu savolga `prefers-color-scheme` bilan javob berib
 * bo'lmaydi. Odam telefonini kunduzgi rejimda ushlab, ilovada
 * «Tungi» ni tanlashi mumkin — o'shanda media so'rov «yorug'»
 * deydi, ilova esa qorong'i bo'lishi kerak. Tanlov birinchi,
 * telefon sozlamasi esa faqat «Tizim» da.
 */
const qorongimi = () => {
  const k = mavzuOqi();
  if (k === 'tungi') return true;
  if (k === 'kunduzgi') return false;
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
};

function mavzuniQoy(kalit) {
  const k = MAVZULAR.some((x) => x.kalit === kalit) ? kalit : 'tizim';
  try { localStorage.setItem(MAVZU_KALIT, k); } catch {}
  // «tizim» da atribut umuman qo'yilmaydi — shunda media so'rov ishlaydi
  if (k === 'tizim') document.documentElement.removeAttribute('data-mavzu');
  else document.documentElement.setAttribute('data-mavzu', k);
  // Do'kon ranglari QAYTA qo'llanadi. Busiz kunduzgi rejimda qo'yilgan
  // inline ranglar (`--fon`, `--matn`…) joyida qolar va tungiga
  // o'tganda ekran deyarli o'zgarmasdi — inline uslub har qanday CSS
  // qoidasidan kuchli.
  mavzuniQoll(oxirgiMavzu);
  // Telefonning yuqori paneli — sarlavha rangida (qizil): sarlavha
  // ekranning eng tepasigacha davom etgandek ko'rinadi
  const fon = getComputedStyle(document.documentElement)
    .getPropertyValue('--asosiy').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && fon) meta.setAttribute('content', fon);
}

// «Tizim» tanlangan bo'lsa telefon kunduzgidan tungiga o'tganda ham
// ranglar darrov moslashsin
try {
  window.matchMedia?.('(prefers-color-scheme: dark)')
    ?.addEventListener?.('change', () => {
      if (mavzuOqi() === 'tizim') mavzuniQoy('tizim');
    });
} catch { /* eski brauzer — muhim emas */ }

// Sahifa chizilishidan OLDIN qo'llanadi, aks holda oq ekran bir
// lahzaga ko'rinib «miltillash» bo'ladi
mavzuniQoy(mavzuOqi());

const TOKEN_KALIT = 'kiovo_seans';
const seansToken = () => { try { return localStorage.getItem(TOKEN_KALIT) || ''; } catch { return ''; } };
const seansSaqla = (t) => { try { localStorage.setItem(TOKEN_KALIT, t); } catch {} };
const seansOchir = () => { try { localStorage.removeItem(TOKEN_KALIT); } catch {} };

/* ── TELEFON RAQAMI — XALQARO ──
 * Nusxasi `src/lib/telefon.js` da; sinov ikkalasini solishtiradi.
 * Ilgari bu yerda faqat O'zbekiston raqami tan olinardi va Koreyada
 * yoki Rossiyada yashovchi mijoz ro'yxatdan umuman o'tolmasdi. */
const TEL_KOD = '998';          // kodsiz yozilgan raqam shunga tegishli
const TEL_UZUN = 9;
const TEL_ENG_KAM = 8, TEL_ENG_KOP = 15;   // E.164
const TEL_KODLAR = ['998','996','995','994','993','992','971','966','380',
  '375','374','90','86','82','81','49','44','7','1'];

const telXalqaro = (x) => {
  const t = String(x ?? '').trim();
  return t.startsWith('+') || /^00\d/.test(t);
};
const telRaqam = (x) => String(x ?? '').replace(/\D/g, '');
const telKod = (r) => TEL_KODLAR.find((k) => telRaqam(r).startsWith(k)) || null;

/** `+998901234567` yoki null. */
function raqamTozala(xom) {
  const s = String(xom ?? '').trim();
  if (!s) return null;
  const xalqaro = telXalqaro(s);
  const r = telRaqam(s.replace(/^00/, ''));
  if (!r) return null;
  if (xalqaro) return r.length >= TEL_ENG_KAM && r.length <= TEL_ENG_KOP ? `+${r}` : null;
  if (r.length === TEL_UZUN) return `+${TEL_KOD}${r}`;
  if (r.startsWith(TEL_KOD) && r.length === TEL_KOD.length + TEL_UZUN) return `+${r}`;
  return null;
}

/* Yozilayotgan paytda bo'laklaydi.
 * MUHIM: mamlakat kodi faqat `+` bilan yozilganda qidiriladi —
 * aks holda mahalliy «90 123 45 67» Turkiya kodi (+90) deb tanilib,
 * eng ko'p uchraydigan kiritish usuli buzilardi. */
function raqamFormat(xom) {
  const xalqaro = telXalqaro(xom);
  const r = telRaqam(String(xom ?? '').trim().replace(/^00/, '')).slice(0, TEL_ENG_KOP);
  if (!r) return xalqaro ? '+' : '';
  if (!xalqaro) {
    const q = (r.startsWith(TEL_KOD) ? r.slice(TEL_KOD.length) : r).slice(0, TEL_UZUN);
    const b = [q.slice(0, 2), q.slice(2, 5), q.slice(5, 7), q.slice(7, 9)];
    return `+${TEL_KOD} ${b.filter(Boolean).join(' ')}`.trim();
  }
  const kod = telKod(r);
  if (!kod) return `+${r}`;
  const q = r.slice(kod.length);
  const b = kod === TEL_KOD
    ? [q.slice(0, 2), q.slice(2, 5), q.slice(5, 7), q.slice(7, 9)]
    : [q.slice(0, 3), q.slice(3, 7), q.slice(7, 11), q.slice(11)];
  return `+${kod} ${b.filter(Boolean).join(' ')}`.trim();
}

let kirishTimer = null;

/* ================= KIRISH (Telegramdan tashqarida) =================
 *
 * Uchta yo'l: Google (Gmail), telefon (SMS kod) va Telegram. Play
 * Store'dan yuklagan odamda bot hisobi bo'lmasligi mumkin — ilgari u
 * ilovaga umuman kira olmasdi. Server qaysi usul yoqilganini aytadi
 * (/api/kirish/usullar): sozlanmagani ko'rsatilmaydi.
 *
 * Logotip va tabassum <template> dan OLDINDAN olinadi: ekran
 * `document.body` ni almashtiradi va shablonlar yo'qolib ketadi. */
let kirishShakllari = null;

function kirishEkrani() {
  clearInterval(kirishTimer);
  kirishShakllari ||= { logo: $('#t-logo')?.innerHTML || 'KiOVO' };
  document.body.innerHTML = `
    <div class="kirish-fon">
      <header class="kirish-tepa">
        <div class="kirish-logo">${kirishShakllari.logo}</div>
        <p class="kirish-shior">Teringiz o‘zi gapirsin</p>
      </header>
      <main class="kirish-quti" id="kirish-quti"></main>
    </div>`;
  kirishUsullariniYukla();
}

async function kirishUsullariniYukla() {
  let u = { google: '', sms: false, telegram: true };
  try { u = await api('/api/kirish/usullar'); } catch { /* tarmoq — standart */ }
  holat.kirishUsul = u;
  const xato = new URLSearchParams(location.search).get('kirish_xato')
    ? 'Google (Gmail) bilan kirib bo‘lmadi. Qayta urining yoki boshqa usulni tanlang.' : '';
  kirishQadam1(xato);
}

/** Google «G» belgisi — rasmiy to'rt rang (Supabase orqali kirish tugmasi uchun). */
const GOOGLE_G = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.4 6.9-17.7z"/>
  <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/>
  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
</svg>`;

/** Google tugmasi — Google'ning o'z tugmasi (brend qoidasi shuni talab qiladi). */
function googleTugmasi(clientId) {
  const joy = $('#g-tugma');
  if (!joy || !clientId) return;
  const chiz = () => {
    try {
      // `redirect` rejimi: Play'dagi ilovada (TWA) popup oyna ochilmaydi
      google.accounts.id.initialize({ client_id: clientId, ux_mode: 'redirect',
        login_uri: `${location.origin}/kirish/google`, auto_select: false });
      google.accounts.id.renderButton(joy, { type: 'standard', theme: 'outline',
        size: 'large', text: 'continue_with', shape: 'pill', locale: 'uz',
        logo_alignment: 'center', width: Math.min(360, joy.offsetWidth || 320) });
    } catch { joy.remove(); }
  };
  if (window.google?.accounts?.id) return chiz();
  const sc = document.createElement('script');
  sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
  sc.onload = chiz;
  sc.onerror = () => joy.remove();
  document.head.appendChild(sc);
}

function kirishQadam1(xato = '') {
  clearInterval(kirishTimer);
  const u = holat.kirishUsul || {};
  const smsBor = Boolean(u.sms);
  $('#kirish-quti').innerHTML = `
    <h1>Xush kelibsiz</h1>
    <p class="kirish-izoh">Kirish usulini tanlang — parol kerak emas.</p>
    ${xato ? `<div class="kirish-xato" role="alert">${esc(xato)}</div>` : ''}

    <div class="kirish-usullar">
      ${u.supabase ? `<a class="kirish-usul google" id="k-gmail" href="/kirish/supabase/boshla">
        <span class="kirish-usul-belgi g">${GOOGLE_G}</span>Google (Gmail) bilan kirish</a>`
        : u.google ? '<div id="g-tugma" class="g-tugma"></div>' : ''}
      ${u.telegram ? `<button class="kirish-usul" id="k-telegram">
        <span class="kirish-usul-belgi tg">${ik('telegram', 20)}</span>Telegram orqali kirish</button>` : ''}
    </div>

    <div class="kirish-ajratgich"><span>yoki telefon raqami</span></div>
    <label class="yashirin-yorliq" for="k-raqam">Telefon raqami</label>
    <input id="k-raqam" type="tel" inputmode="tel" autocomplete="tel"
           placeholder="+998 90 123 45 67" value="+998 ">
    <p class="kirish-mayda">Chet elda bo‘lsangiz mamlakat kodi bilan — masalan
      <b>+82</b> (Koreya), <b>+7</b> (Rossiya).</p>
    <button class="asosiy" id="k-yubor">${smsBor ? 'Kod olish' : 'Davom etish'}</button>

    <p class="kirish-shart">Davom etib, <a href="/oferta" target="_blank" rel="noopener">ommaviy
      oferta</a> va <a href="/maxfiylik" target="_blank" rel="noopener">maxfiylik
      siyosati</a>ga rozilik bildirasiz.</p>`;

  const inp = $('#k-raqam');
  inp.oninput = () => { inp.value = raqamFormat(inp.value); };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#k-yubor').click(); };

  if (!u.supabase) googleTugmasi(u.google);
  const gm = $('#k-gmail');
  if (gm) gm.onclick = () => { gm.classList.add('yuklanmoqda'); titra(); };
  $('#k-telegram') && ($('#k-telegram').onclick = kirishTelegram);

  $('#k-yubor').onclick = async () => {
    const t = $('#k-yubor');
    t.disabled = true; t.textContent = 'Yuborilmoqda…';
    try {
      if (smsBor) {
        const r = await api('/api/kirish/sms', { method: 'POST',
          body: JSON.stringify({ telefon: inp.value }) });
        kirishSmsKod(r);
      } else {
        // SMS sozlanmagan: botdan tasdiqlash (botda ro'yxatdan o'tganlar uchun)
        const r = await api('/api/kirish/sorov', { method: 'POST',
          body: JSON.stringify({ telefon: inp.value }) });
        kirishQadam2(r);
      }
    } catch (e) {
      kirishQadam1(e.message);
    }
  };
}

/** Telegram orqali: havola ochiladi, ilova botdagi tasdiqni kutadi. */
async function kirishTelegram() {
  const t = $('#k-telegram');
  if (t) t.disabled = true;
  let r;
  try { r = await api('/api/kirish/telegram', { method: 'POST' }); }
  catch (e) { return kirishQadam1(e.message); }

  const tugash = Date.now() + (r.muddat || 300000);
  $('#kirish-quti').innerHTML = `
    <div class="kirish-belgi-katta tg">${ik('telegram', 34)}</div>
    <h1>Telegramni oching</h1>
    <p class="kirish-izoh">Botda <b>«Start»</b> ni bosing — ilova shu zahoti ochiladi.
      Botda ro‘yxatdan o‘tgan bo‘lishingiz shart emas.</p>
    <a class="asosiy tugma-havola" id="k-tg-och" href="${esc(r.havola)}" target="_blank"
       rel="noopener">${ik('telegram', 19)}Telegramda ochish</a>
    <div class="kirish-kutish"><span class="aylana"></span>
      <span id="k-qoldi">Kutilmoqda…</span></div>
    <button class="matnli" id="k-ortga">Boshqa usul</button>`;
  $('#k-ortga').onclick = () => kirishQadam1();
  // Birinchi urinishda havola o'zi ochiladi; to'sib qo'yilsa tugma bor
  try { window.open(r.havola, '_blank', 'noopener'); } catch { /* tugma qoladi */ }
  kirishniKut(r.kalit, tugash);
}

/** SMS kodi: 6 ta raqam, telefon o'zi taklif qiladi (one-time-code). */
function kirishSmsKod({ kalit, raqam, muddat }) {
  const tugash = Date.now() + (muddat || 300000);
  const qaytaGacha = Date.now() + 60_000;
  $('#kirish-quti').innerHTML = `
    <div class="kirish-belgi-katta">${ik('sms', 34)}</div>
    <h1>Kodni kiriting</h1>
    <p class="kirish-izoh"><b>${esc(raqam || '')}</b> raqamiga 6 xonali kod yuborildi.</p>
    <label class="yashirin-yorliq" for="k-kod">SMS kodi</label>
    <input id="k-kod" class="kirish-kod-maydon" type="text" inputmode="numeric"
           autocomplete="one-time-code" maxlength="6" placeholder="••••••">
    <div class="kirish-xato" id="k-xato" role="alert" hidden></div>
    <button class="asosiy" id="k-tasdiq" disabled>Kirish</button>
    <button class="matnli" id="k-qayta" disabled>Qayta yuborish</button>
    <button class="matnli" id="k-ortga">Boshqa raqam</button>`;

  const inp = $('#k-kod'), tasdiq = $('#k-tasdiq'), qayta = $('#k-qayta');
  setTimeout(() => inp.focus(), 80);
  const yubor = async () => {
    tasdiq.disabled = true; tasdiq.textContent = 'Tekshirilmoqda…';
    try {
      const r = await api('/api/kirish/sms/tasdiq', { method: 'POST',
        body: JSON.stringify({ kalit, kod: inp.value }) });
      clearInterval(kirishTimer);
      seansSaqla(r.token); titra('medium');
      location.replace('/app/');
    } catch (e) {
      const x = $('#k-xato'); x.hidden = false; x.textContent = e.message;
      tasdiq.disabled = false; tasdiq.textContent = 'Kirish';
      inp.select();
    }
  };
  inp.oninput = () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
    tasdiq.disabled = inp.value.length !== 6;
    if (inp.value.length === 6) yubor();      // oxirgi raqam — o'zi yuboradi
  };
  tasdiq.onclick = yubor;
  qayta.onclick = () => kirishQadam1();
  $('#k-ortga').onclick = () => kirishQadam1();

  clearInterval(kirishTimer);
  kirishTimer = setInterval(() => {
    const q = Math.ceil((qaytaGacha - Date.now()) / 1000);
    qayta.disabled = q > 0;
    qayta.textContent = q > 0 ? `Qayta yuborish · ${q} s` : 'Qayta yuborish';
    if (Date.now() > tugash) { clearInterval(kirishTimer); kirishQadam1('Kodning muddati tugadi. Qayta so‘rang.'); }
  }, 1000);
}

/** Bot tasdig'ini kutadi (telefon + bot va Telegram havolasi uchun umumiy). */
function kirishniKut(kalit, tugash, { radMatni = 'Siz rad etdingiz. Bu siz bo‘lsangiz qayta urining.' } = {}) {
  clearInterval(kirishTimer);
  kirishTimer = setInterval(async () => {
    const qoldi = Math.max(0, Math.ceil((tugash - Date.now()) / 1000));
    const q = $('#k-qoldi');
    if (q) q.textContent = qoldi ? `Kutilmoqda… ${qoldi} s` : 'Muddat tugadi';
    if (!qoldi) { clearInterval(kirishTimer); return kirishQadam1('Muddat tugadi. Qayta urining.'); }
    try {
      const r = await api(`/api/kirish/holat?kalit=${encodeURIComponent(kalit)}`);
      if (r.holat === 'tasdiqlandi' && r.token) {
        clearInterval(kirishTimer);
        seansSaqla(r.token); titra('medium');
        location.replace('/app/');
      } else if (r.holat === 'rad') {
        clearInterval(kirishTimer); kirishQadam1(radMatni);
      } else if (r.holat === 'muddati_otdi' || r.holat === 'yoq') {
        clearInterval(kirishTimer); kirishQadam1('So‘rov muddati tugadi. Qayta urining.');
      }
    } catch { /* tarmoq — keyingi urinishda */ }
  }, 2000);
}

/** Telefon + botdan tasdiqlash (SMS sozlanmagan bo'lsa). */
function kirishQadam2({ kalit, kod, raqam, muddat }) {
  const tugash = Date.now() + (muddat || 180000);
  $('#kirish-quti').innerHTML = `
    <div class="kirish-belgi-katta tg">${ik('telegram', 34)}</div>
    <h1>Telegramni oching</h1>
    <p class="kirish-izoh">${esc(raqam || '')} raqamiga bog‘langan Telegramga
       tasdiqlash so‘rovi yuborildi.</p>
    <div class="kirish-kod"><span>Ekrandagi kod</span><b>${esc(kod)}</b></div>
    <p class="kirish-mayda">Botdagi kod SHU kodga mos kelsagina tasdiqlang.</p>
    <div class="kirish-kutish"><span class="aylana"></span>
      <span id="k-qoldi">Kutilmoqda…</span></div>
    <button class="matnli" id="k-ortga">Boshqa raqam</button>`;
  $('#k-ortga').onclick = () => kirishQadam1();
  kirishniKut(kalit, tugash);
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
  // Service worker KIRISH EKRANIDA ham ro'yxatdan o'tadi. Brauzerdan
  // o'rnatilgan yorliq to'g'ri shu yerga tushadi: qobiq keshlanmasa
  // ilova har safar noldan yuklanadi va tarmoq sekin bo'lganda oq
  // ekran ko'rinadi.
  navigator.serviceWorker?.register('/app/sw.js').catch(() => { /* HTTPS yo'q */ });
  if (telegramdanTashqarida()) return;
  // Statik razmetkadagi <i data-ik> larni chizma ikonga to'ldiramiz
  ikonlarniChiz();
  suhbatniYukla();
  pwaniUla();
  try {
    const k = await api('/api/catalog');
    holat.kategoriyalar = (k.kategoriyalar || []).map((x) => ({ ...x, name: tutuq(x.name) }));
    holat.mahsulotlar   = k.mahsulotlar.map((p) => ({ ...p,
      name: tutuq(p.name), nom_uz: tutuq(p.nom_uz), description: tutuq(p.description),
      usage_text: tutuq(p.usage_text), warnings: tutuq(p.warnings), _indeks: '' }));
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
    menikiSaqla();
  } catch (e) {
    // Seans tugagan — kirish ekrani allaqachon chizildi, ilova qismi yo'q
    if (!$('#toifalar')) return;
    const nusxa = e.tarmoq ? menikiOl() : null;
    if (nusxa) {
      // Oflayn: oxirgi saqlangan profil va tahlil bilan ochiladi
      Object.assign(holat, { user: nusxa.user, stat: nusxa.stat || {},
        tahlil: nusxa.tahlil, limit: nusxa.limit, sevimlilar: new Set(nusxa.sevimlilar || []) });
      kor($('#ilova'), true);
      karuselniChiz(); namunaniChiz();
      toifalarniChiz(); filtrlarniChiz(); katalogniChiz();
      oflaynBanner(nusxa.vaqt);
      return tabOch('katalog');
    }
    kor($('#ilova'), true);              // Telegram tashqarisida — faqat katalog
    karuselniChiz();
    toifalarniChiz(); filtrlarniChiz(); katalogniChiz();
    if (e.tarmoq) oflaynBanner();
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
  // kiovo.shop/hisobni-ochirish sahifasidagi havola: profil va o'chirish oynasi
  if (p.get('ochir') === '1') { tabOch('profil'); return hisobniOchirOyna(); }
  const xom = p.get('tab') || sessionStorage.getItem('qq_tab') || 'katalog';
  const boshlangich = TAB_TAQMOQ[xom] || xom;
  if (boshlangich === 'natija' && holat.tahlil) natijaniChiz();
  tabOch(TABLAR.includes(boshlangich) ? boshlangich : 'katalog');
  // Bildirishnoma yoki yorliqdan kelganda — kerakli bo'limni ochamiz
  if (p.get('bolim')) havolaniOch(location.search);
  pushniYangila();
}

// ---------------- Ro'yxatdan o'tish ----------------
function royxatEkrani() {
  kor($('#ekran-royxat'), true);
  // Yozilganini saqlaymiz — chiqib ketsa yo'qolmasin
  // Google'dan kelgan ism va SMS bilan tasdiqlangan raqam o'zi
  // to'ldiriladi — odam bir narsani ikki marta yozmasin
  const u = holat.user || {};
  const bor = { 'f-ism': u.full_name || '', 'f-tel': u.phone ? raqamFormat(u.phone) : '',
                'f-yosh': u.age || '' };
  ['f-ism','f-tel','f-yosh'].forEach((id) => {
    const el = $('#' + id);
    el.value = localStorage.getItem('qq_' + id) || bor[id] || '';
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
    const telToza = raqamTozala(tana.phone);
    if (!telToza) {
      return xato.textContent = 'Telefon raqamini tekshiring. Chet el raqami '
                              + 'bo‘lsa mamlakat kodi bilan: +82 10 1234 5678';
    }
    tana.phone = telToza;
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
// Kunduzgi rejimda inline qo'yiladigan tokenlar. Tungiga o'tilganda
// ular BUTUNLAY olib tashlanadi, aks holda qorong'i palitrani bosib
// turaveradi.
const MAVZU_TOKEN = ['--fon', '--panel', '--chiziq', '--matn', '--kul', '--och', '--urgu-och'];

function mavzuniQoll(m) {
  if (m && typeof m === 'object') oxirgiMavzu = m;
  else m = oxirgiMavzu;
  if (!m || typeof m !== 'object') return;
  const r = document.documentElement.style;
  const qorongi = qorongimi();

  if (qorongi) {
    // Qorong'ida do'kon foni ISHLATILMAYDI: och yashil yoki krem fon
    // ko'zni qamashtiradi va matn o'qilmay qoladi. Faqat urg'u rangi
    // qoladi — u ham qorong'i fon uchun YORITILGAN variantda
    // (serverda kontrast hisoblab tanlanadi), aks holda to'q qizil
    // qora fonda ko'rinmaydi.
    MAVZU_TOKEN.forEach((t) => r.removeProperty(t));
    if (m.urguTungi) {
      r.setProperty('--urgu', m.urguTungi);
      r.setProperty('--urgu-tim', m.urguTungiTim || m.urguTungi);
      if (m.urguTungiOch) r.setProperty('--urgu-och', m.urguTungiOch);
    } else if (m.urgu) {
      // Eski konfig — tungi variant yo'q, standart CSS rangi qolsin
      r.removeProperty('--urgu'); r.removeProperty('--urgu-tim');
    }
  } else {
    if (m.urgu) {
      r.setProperty('--urgu', m.urgu);
      if (m.urguTim) r.setProperty('--urgu-tim', m.urguTim);
    }
    if (m.urguOch) r.setProperty('--urgu-och', m.urguOch);
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
/* Brend tabassumi — server index.html ga qo'ygan <template> dan.
   Logotipning o'zi, chizma ikon emas: banner do'kon belgisi bilan
   gapiradi. Ko'zlari vaqti-vaqti bilan «pirpiraydi» (CSS). */
const BELGI = () => $('#t-belgi')?.innerHTML || '';

const aiSlayd = () => `
  <div class="slayd ai-slayd" data-skaner="1">
    <span class="ai-teg">${ik('skaner', 13)}AI teri tahlili</span>
    <span class="ai-sarlavha">Teringizga <em>aynan mos</em><br>parvarishni toping</span>
    <span class="ai-tugma">Yuzimni tahlil qil ${ik('keyingi', 15)}</span>
    <span class="ai-belgi" aria-hidden="true">${BELGI()}</span>
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
  const korsat = (bor) => { kor(rasm, bor); kor(yoq, !bor);
    // Namunasiz quti — brend tabassumi va uzuq-uzuq yuz ramkasi
    rasm.closest('.skaner-namuna')?.classList.toggle('rasmli', bor); };
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
  return vitrina()
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

// Toifa RANGI yo'q: barcha toifa bir xil brend uslubida (CSS). Ilgari
// har biriga ko'k, binafsha, sariq pastel berilardi va bosh sahifa
// kamalakka aylanib, qizil–yashil brend yo'qolib qolardi.

/** Yuqoridagi toifa kartalari (rasmdagidek oq, ikonli, siriladigan). */
function toifalarniChiz() {
  const bor = new Set(holat.mahsulotlar.map((p) => p.category_id));
  const royxat = [{ slug:'hammasi', name:'Barchasi' },
                  ...holat.kategoriyalar.filter((k) => bor.has(k.id))];
  $('#toifalar').innerHTML = royxat.map((k) => `
    <button data-toifa="${esc(k.slug)}" class="${k.slug === holat.kategoriya ? 'tanlangan' : ''}">
      <span class="doira">${ik(toifaIkon(k), 23)}</span>
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
    royxat: vitrina().filter((p) => p.category_id === k.id).sort(tartib),
  })).filter((x) => x.royxat.length);

  // Bo'limi yo'q mahsulotlar ham ko'rinsin: aks holda ular faqat
  // "Barcha mahsulotlar" ichida qolib, bosh sahifada yo'qoladi.
  const bolimsiz = vitrina().filter((p) => !p.category_id).sort(tartib);
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
/** Teri turi kaliti → yorliq. Ilgari ekranda «yogli, aralash» turardi. */
const TERI_NOM = { quruq: 'Quruq', yogli: 'Yog‘li', aralash: 'Aralash',
  normal: 'Normal', sezgir: 'Sezgir', barcha: 'Barcha turdagi' };
const teriNomi = (k) => TERI_NOM[k] || tutuq(String(k || ''));

/** Mahsulot yordam beradigan muammo — «teshik akne» emas, to'liq nom. */
const YORDAM_NOM = { akne: 'Toshmalar', teshik: 'Kengaygan teshiklar',
  yoglilik: 'Yog‘lanish', quruqlik: 'Quruqlik', qizarish: 'Qizarish',
  dog: 'Dog‘lar', ajin: 'Ajinlar', xiralik: 'Xiralik', sezgirlik: 'Sezgir teri',
  qora_doira: 'Ko‘z ostidagi soya', shishish: 'Shishish', quyosh: 'Quyoshdan himoya' };
const yordamNomi = (k) => YORDAM_NOM[k]
  || (s0 => s0.charAt(0).toUpperCase() + s0.slice(1))(tutuq(String(k || '')).replace(/_/g, ' '));

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

/** Chegirmadagi mahsulot: eski (asl) narx ustidan chizilgan holda. */
const eskiNarx = (p) => (p?.old_price && p.old_price > p.price ? ` <s class="eski-narx">${narx(p.old_price)}</s>` : '');

function kartaHtml(p) {
  const nishonlar = [];
  if (p.stock === 0) nishonlar.push('<span class="nishon-kichik yoq">Tugagan</span>');
  else if (p.stock <= 3) nishonlar.push(`<span class="nishon-kichik">Oxirgi ${p.stock} ta</span>`);
  const chegirma = p.old_price && p.old_price > p.price
    ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  if (chegirma >= 5) nishonlar.push(`<span class="nishon-kichik chegirma">−${chegirma}%</span>`);
  // To'plam: 10 ta niqob bitta kartada — odam «bitta narxi shumi?» deb o'ylamasin
  if (p.dona_soni > 1) nishonlar.push(`<span class="nishon-kichik dona">${p.dona_soni} dona</span>`);

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
      ${(() => {
        const g = guruh(p);
        if (g.length < 2) return '';
        const ranglar = g.filter((x) => x.rang_hex).slice(0, 5);
        return `<span class="m-variant">${ranglar.length
          ? ranglar.map((x) => `<i style="background:${esc(x.rang_hex)}"></i>`).join('') + `<b>${g.length} rang</b>`
          : `<b>${g.length} ${p.variant_tur === 'hajm' ? 'hajm' : 'xil'}</b>`}</span>`;
      })()}
      ${teg ? `<span class="teg-mos ${teg.sinf}">${esc(teg.matn)}</span>` : ''}
      <!-- Narx va «+» BIR qatorda: ilgari «+» o'z qatorida yolg'iz turardi -->
      <div class="mpast">
        <div class="mnarx">${guruh(p).some((x) => x.price !== p.price)
          ? `${qisqaNarx(Math.min(...guruh(p).map((x) => x.price)))} so‘m<small>dan boshlab</small>` : `${qisqaNarx(p.price)} so‘m`}${
          p.old_price && p.old_price > p.price ? `<s>${qisqaNarx(p.old_price)}</s>` : ''}</div>
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

  // Rasm KATTA va kvadrat: odam mahsulotni shu yerda ko'rib tanlaydi.
  // Ilgari rasmsiz mahsulotda bu joy 90px li tor chiziqqa siqilib,
  // yurakcha bilan yopish tugmasi uning ustiga chiqib qolardi.
  const yurak = `<i class="yurak ${holat.sevimlilar?.has(p.id) ? 'faol' : ''}" data-yurak="${p.id}"
          role="button" aria-label="Sevimlilarga">${ik('yurak', 19)}</i>`;
  $('#modal-tan').innerHTML = `
    ${p.poster_id
      ? `<div class="oyna-rasm"><img src="/media/${esc(p.poster_id)}?w=800"
           alt="${esc(nomi(p))}" decoding="async">${yurak}</div>`
      : `<div class="oyna-rasm bosh">${ik('shisha', 64)}${yurak}</div>`}
    <div style="padding:18px 18px 0">
      <div class="mbrend">${esc(p.brand || '')}</div>
      <h2 style="margin:5px 0 8px">${esc(nomi(p))}</h2>

      <!-- Reyting: yulduzlar bosilsa sharhlar O'Z ekranida ochiladi -->
      <div class="oyna-baho" id="oyna-baho">${bahoQatori(p)}</div>

      ${(() => {
        const g = guruh(p);
        if (g.length < 2) return '';
        const rangli = g.some((x) => x.rang_hex);
        return `<div class="variant-tanlov">
          <div class="variant-sarlavha">${rangli ? 'Rang' : 'Variant'}: <b>${esc(p.variant_nom || '')}</b></div>
          <div class="variantlar ${rangli ? 'rangli' : ''}">${g.map((x) => `
            <button data-variant-id="${x.id}" class="${x.id === p.id ? 'tanlangan' : ''} ${x.stock > 0 ? '' : 'tugagan'}"
              aria-label="${esc(x.variant_nom || '')}">
              ${x.rang_hex ? `<i style="background:${esc(x.rang_hex)}"></i>` : ''}
              <span>${esc(x.variant_nom || '—')}</span>
              ${x.price !== p.price ? `<small>${qisqaNarx(x.price)}</small>` : ''}
            </button>`).join('')}</div>
        </div>`;
      })()}

      <div class="narx-satr">
        <span class="narx-katta">${narx(p.price)}</span>
        ${p.old_price && p.old_price > p.price
          ? `<s>${narx(p.old_price)}</s>
             <span class="chegirma-nishon">−${Math.round((1 - p.price / p.old_price) * 100)}%</span>` : ''}
      </div>
      ${p.dona_soni > 1 ? `<div class="dona-satr">${ik('savat', 15)}To‘plamda <b>${p.dona_soni} dona</b>
        <span>· 1 donasi ≈ ${narx(Math.round(p.price / p.dona_soni / 100) * 100)}</span></div>` : ''}

      ${(() => {
        const t = moslikTegi(p);
        const teri = holat.user?.teri_turi;
        return (t || teri) ? `<div class="oyna-teglar">
          ${t ? `<span class="teg-mos ${t.sinf}">${esc(t.matn)}</span>` : ''}
          ${teri && (p.skin_types || []).includes(teri)
            ? `<span class="teg-mos teg-yashil">${esc(teriNomi(teri))} teriga</span>` : ''}
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
          ? plitka('tomchi', 'Teri turi', p.skin_types.map((t) => esc(teriNomi(t))).join(', '), 'kul') : ''}
      </div>

      ${p.concerns?.length ? `
        <div class="bolim">
          <div class="bolim-bosh">${ik('tozalik', 16)}Nimaga yordam beradi</div>
          <div class="teglar">${p.concerns.map((c) => `<span class="teg">${esc(yordamNomi(c))}</span>`).join('')}</div>
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

      <button class="sharh-havola" data-sharhlar="${p.id}">
        <span class="b">${ik('yulduz', 18)}</span>
        <span><b>Mijozlar sharhlari</b>
          <small>${p.sharh_soni > 0 ? `${p.sharh_soni} ta sharh · suratlar bilan` : 'Xaridorlar fikri va suratlari'}</small></span>
        ${ik('keyingi', 18)}
      </button>
    </div>

    <!-- Savatga tugmasi DOIM ko'rinib turadi: odam uni topish uchun
         tavsif, tarkib va ogohlantirishlarni oxirigacha surmasin -->
    <div class="oyna-pastki${narx(p.price).length > 12 ? ' uzun' : ''}">
      <div class="oyna-pastki-narx">
        <b>${narx(p.price)}</b>
        ${p.old_price && p.old_price > p.price ? `<s>${narx(p.old_price)}</s>`
          : `<small>${esc(p.dona_soni > 1 ? `${p.dona_soni} dona` : p.volume || '')}</small>`}
      </div>
      <button class="asosiy" id="t-savatga" ${p.stock > 0 ? '' : 'disabled'}>
        ${p.stock > 0
          ? `${ik('savat', 18)}<span class="toliq">${savatda ? `Savatda ${savatda} · yana` : 'Savatga qo‘shish'}</span><span class="qisqa">${savatda ? `Yana (${savatda})` : 'Savatga'}</span>`
          : 'Omborda yo‘q'}
      </button>
    </div>`;
  modalOch();
  $('#modal .oyna').classList.add('pastli');
  $$('#modal-tan [data-sharhlar]').forEach((b) => b.onclick = () => sharhlarSahifa(p.id));
  const t = $('#t-savatga');
  if (t && p.stock > 0) t.onclick = async () => { await savatga(p.id); modalYop(); };
  const y = $('#modal-tan [data-yurak]');
  if (y) y.onclick = (e) => { e.stopPropagation(); sevimliAlmash(p.id); };
  // Variant tanlansa — o'sha variantning narxi, rasmi va qoldig'i
  $$('#modal-tan [data-variant-id]').forEach((b) => b.onclick = () => {
    const vid = Number(b.dataset.variantId);
    if (vid !== p.id) mahsulotOyna(vid);
  });
}
// ================= SHARHLAR =================
// Sharh HAQIQIY: uni faqat shu mahsulotni SOTIB OLGAN odam yozadi
// (serverda tekshiriladi), reyting esa shu sharhlardan hisoblanadi.
// Koreys do'konidagi baho alohida — «Koreyada» yorlig'i bilan.

const YULDUZLAR = (n, olcham = 14) => Array.from({ length: 5 }, (_, i) =>
  `<i class="yld ${i < n ? 'faol' : ''}">${ik('yulduz', olcham)}</i>`).join('');

const sanaQisqa = (t) => new Date(t).toLocaleDateString('uz-UZ',
  { day: 'numeric', month: 'short', year: 'numeric' });

/** Mahsulot oynasining tepasidagi reyting — bosiladigan tugma. */
function bahoQatori(p) {
  const bizda = p.sharh_soni > 0 && p.reyting > 0;
  const manba = !bizda && p.manba_sharh > 0 && p.manba_reyting > 0;
  const r = bizda ? Number(p.reyting) : manba ? Number(p.manba_reyting) : 0;
  return `
    <button class="baho-tugma ${bizda ? '' : manba ? 'manba' : 'bosh'}" data-sharhlar="${p.id}"
      aria-label="Sharhlarni ko‘rish">
      <span class="yulduzlar">${YULDUZLAR(Math.round(r), 15)}</span>
      ${r ? `<b>${r.toFixed(1)}</b>` : ''}
      <span class="soni">${bizda ? `${p.sharh_soni} ta sharh`
        : manba ? `Koreyada · ${p.manba_sharh} sharh` : 'Sharh yo‘q'}</span>
      ${ik('keyingi', 15, 2)}
    </button>
    ${p.sold_count > 0 ? `<span class="ozgina">${p.sold_count}+ sotildi</span>` : ''}`;
}

/** Ism bosh harfi va rangi — har mijozning o'z doirachasi. */
const ismBelgi = (ism) => {
  const s = String(ism || 'M').trim();
  let h = 0;
  for (const c of s) h = (h * 31 + c.codePointAt(0)) % 360;
  return `<span class="sharh-avatar" style="--h:${h}">${esc(s[0]?.toUpperCase() || 'M')}</span>`;
};

/**
 * SHARHLAR EKRANI — mahsulotning hamma sharhlari, har mijozniki alohida
 * kartada: ism, sana, baho, matn va suratlar. Tepada umumiy baho va
 * yulduzlar taqsimoti.
 */
function sharhlarSahifa(id) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  sahifaOch({
    sarlavha: 'Sharhlar', izoh: p ? nomi(p) : '', sinf: 'sharh-sahifa',
    html: `<div class="yuklanmoqda"><div class="aylana"></div></div>`,
    ula: (tan) => sharhlarniYukla(id, tan),
  });
}

async function sharhlarniYukla(id, quti) {
  if (!quti) return;
  let j;
  try { j = await api(`/api/sharhlar?product_id=${id}`); }
  catch (e) { quti.innerHTML = `<div class="bosh-holat"><p>${esc(e.message)}</p></div>`; return; }
  const p = holat.mahsulotlar.find((x) => x.id === id) || {};

  const meniki = j.sharhlar.find((x) => x.meniki);
  const boshqalar = j.sharhlar.filter((x) => !x.meniki);
  const hammaRasm = j.sharhlar.flatMap((x) => x.rasmlar || []);
  const rasmlarHtml = (r) => r?.length ? `<div class="sharh-rasmlar">${r.map((rid) =>
    `<button class="sharh-rasm" data-rasm-kor="${esc(rid)}" aria-label="Rasmni ko‘rish">
       <img src="/media/${esc(rid)}?w=240" alt="" loading="lazy"></button>`).join('')}</div>` : '';
  const n = j.sharhlar.length;
  const ortacha = n ? j.sharhlar.reduce((a, x) => a + x.baho, 0) / n : 0;
  const taqsim = [5, 4, 3, 2, 1].map((b) => ({ b, soni: j.sharhlar.filter((x) => x.baho === b).length }));
  const sharhKarta = (x, men = false) => `
    <article class="sharh ${men ? 'meniki' : ''}">
      <div class="sharh-bosh">
        ${ismBelgi(men ? (holat.user?.full_name || 'Siz') : x.ism)}
        <div class="sharh-kim">
          <b>${men ? 'Sizning sharhingiz' : esc(x.ism)}</b>
          <span><span class="yulduzlar">${YULDUZLAR(x.baho, 13)}</span>${sanaQisqa(x.created_at)}</span>
        </div>
        <span class="sharh-tasdiq">${ik('tasdiq', 13)}Xaridor</span>
      </div>
      ${x.matn ? `<p>${esc(x.matn)}</p>` : ''}
      ${rasmlarHtml(x.rasmlar)}
      ${men ? `<div class="sharh-amal">
        <button class="matn-tugma" data-sharh-tahrir="1">${ik('tahrir', 15)}O‘zgartirish</button>
        <button class="matn-tugma xavf" data-sharh-ochir="1">${ik('ochirish', 15)}O‘chirish</button>
      </div>` : ''}
    </article>`;

  quti.innerHTML = `
    <section class="sharh-xulosa-katta">
      <div class="sharh-ball">
        <b>${n ? ortacha.toFixed(1) : '—'}</b>
        <span class="yulduzlar">${YULDUZLAR(Math.round(ortacha), 17)}</span>
        <small>${n ? `${n} ta haqiqiy xaridor` : 'Hali baho yo‘q'}</small>
      </div>
      <div class="sharh-taqsim">${taqsim.map((t) => `
        <div><span>${t.b}</span>${ik('yulduz', 11)}
          <i><em style="width:${n ? Math.round((t.soni / n) * 100) : 0}%"></em></i>
          <small>${t.soni}</small></div>`).join('')}</div>
    </section>
    ${(p.manba_sharh > 0 && p.manba_reyting > 0) ? `
      <div class="sharh-manba">${ik('yulduz', 14)}Koreya do‘konlarida
        <b>${Number(p.manba_reyting).toFixed(1)}</b> · ${p.manba_sharh} ta baho</div>` : ''}

    ${!meniki && j.yozsa_boladi ? `
      <button class="asosiy" id="t-sharh-yoz">${ik('tahrir', 18)}Sharh yozish</button>` : ''}
    ${!meniki && !j.yozsa_boladi ? `
      <p class="sharh-qoida">${ik('qalqon', 15)}Sharhni faqat shu mahsulotni sotib olgan mijozlar yozadi —
        shuning uchun har biri haqiqiy.</p>` : ''}

    ${hammaRasm.length ? `
      <h3 class="sharh-bolim-nom">${ik('rasm', 16)}Mijozlar suratlari <small>${hammaRasm.length}</small></h3>
      <div class="sharh-galereya">${hammaRasm.map((rid) =>
        `<button class="sharh-rasm katta" data-rasm-kor="${esc(rid)}" aria-label="Rasmni ko‘rish">
           <img src="/media/${esc(rid)}?w=400" alt="" loading="lazy"></button>`).join('')}</div>` : ''}

    ${n ? `<h3 class="sharh-bolim-nom">${ik('suhbat', 16)}Barcha sharhlar <small>${n}</small></h3>` : ''}
    ${meniki ? sharhKarta(meniki, true) : ''}
    ${boshqalar.map((x) => sharhKarta(x)).join('')}
    ${!n ? `<div class="bosh-holat sharh-bosh-holat"><div class="belgi">${ik('yulduz', 40)}</div>
      <p>Hali sharh yo‘q</p><span class="ozgina">Birinchi bo‘lib fikr bildiring.</span></div>` : ''}`;

  const yangila = async () => {
    await katalogniYangila();
    const yangi = holat.mahsulotlar.find((x) => x.id === id);
    const bq = $('#oyna-baho');
    if (bq && yangi) {
      bq.innerHTML = bahoQatori(yangi);
      $$('[data-sharhlar]', bq).forEach((b) => b.onclick = () => sharhlarSahifa(id));
    }
    sharhlarniYukla(id, quti);
  };
  $$('[data-rasm-kor]', quti).forEach((b) => b.onclick = () => rasmKorish(b.dataset.rasmKor));
  const yoz = $('#t-sharh-yoz', quti);
  if (yoz) yoz.onclick = () => sharhOyna(id, null, yangila);
  const th = $('[data-sharh-tahrir]', quti);
  if (th) th.onclick = () => sharhOyna(id, meniki, yangila);
  const oc = $('[data-sharh-ochir]', quti);
  if (oc) oc.onclick = async () => {
    if (!(await tasdiqla('Sharhingiz o‘chirilsinmi?'))) return;
    try {
      await api('/api/sharh', { method: 'DELETE', body: JSON.stringify({ product_id: id }) });
      titra(); yangila();
    } catch (e) { ogohlantir(e.message); }
  };
}

/** Sharh yozish — o'z ekranida. `tugadi` — saqlangach chaqiriladi. */
function sharhOyna(id, joriy, tugadi) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  let baho = joriy?.baho || 5;
  // Rasmlar: eskisi {id} yoki yangisi {data} (telefonning o'zida kichraytiriladi)
  let rasmlar = (joriy?.rasmlar || []).map((x) => ({ id: x }));
  const MAKS = 3;
  let tan = null, ekran = null;
  const chiz = () => {
    const matnEski = $('#sharh-matn', tan)?.value;
    tan.innerHTML = `
      <div class="sharh-yoz">
        ${p ? `<div class="sharh-yoz-mahsulot">
          ${p.poster_id ? `<img src="/media/${esc(p.poster_id)}?w=160" alt="">` : `<span>${ik('shisha', 26)}</span>`}
          <div><small>${esc(p.brand || '')}</small><b>${esc(nomi(p))}</b></div></div>` : ''}

        <div class="baho-tanlov" id="baho-tanlov">
          ${Array.from({ length: 5 }, (_, i) => `
            <button data-baho="${i + 1}" class="${i < baho ? 'faol' : ''}"
              aria-label="${i + 1} yulduz">${ik('yulduz', 34)}</button>`).join('')}
        </div>
        <div class="baho-matn">${['', 'Yomon', 'Qoniqarli', 'Yaxshi', 'Juda yaxshi', 'Zo‘r'][baho]}</div>

        <label for="sharh-matn">Fikringiz (ixtiyoriy)</label>
        <textarea id="sharh-matn" maxlength="600" rows="5"
          placeholder="Nima yoqdi, nima yoqmadi? Qancha vaqt ishlatdingiz?">${esc(matnEski ?? joriy?.matn ?? '')}</textarea>

        <label>Rasm <span class="yordam">Mahsulotni yoki natijani ko‘rsating — ${MAKS} tagacha</span></label>
        <div class="sharh-yuklash">
          ${rasmlar.map((r, i) => `
            <span class="sharh-yuk-rasm">
              <img src="${r.id ? `/media/${esc(r.id)}?w=200` : esc(r.data)}" alt="">
              <button data-rasm-olib="${i}" aria-label="Olib tashlash">${ik('yopish', 14)}</button>
            </span>`).join('')}
          ${rasmlar.length < MAKS ? `
            <button class="sharh-yuk-qosh" id="t-sharh-rasm">${ik('kamera', 22)}<span>Qo‘shish</span></button>` : ''}
        </div>
        <input id="sharh-fayl" type="file" accept="image/*" multiple hidden>
      </div>
      <div class="sahifa-pastki">
        <button class="asosiy" id="t-sharh-saqla">${ik('yuborish', 18)}Yuborish</button>
      </div>`;
    $$('#baho-tanlov [data-baho]', tan).forEach((b) => b.onclick = () => {
      baho = Number(b.dataset.baho); titra(); chiz();
    });
    const qosh = $('#t-sharh-rasm', tan);
    if (qosh) qosh.onclick = () => $('#sharh-fayl', tan).click();
    $('#sharh-fayl', tan).onchange = async (e) => {
      const fayllar = [...(e.target.files || [])].slice(0, MAKS - rasmlar.length);
      for (const f of fayllar) {
        try { rasmlar.push({ data: await kichiklashtir(f, 1280, 0.82) }); }
        catch (err) { ogohlantir(err.message); }
      }
      titra(); chiz();
    };
    $$('[data-rasm-olib]', tan).forEach((b) => b.onclick = () => {
      rasmlar.splice(Number(b.dataset.rasmOlib), 1); titra(); chiz();
    });
    $('#t-sharh-saqla', tan).onclick = async () => {
      const t = $('#t-sharh-saqla', tan);
      try {
        t.disabled = true; t.innerHTML = `<span class="aylana kichik"></span>Yuborilmoqda…`;
        await api('/api/sharh', { method: 'POST', body: JSON.stringify({
          product_id: id, baho, matn: $('#sharh-matn', tan).value,
          rasmlar: rasmlar.map((r) => (r.id ? { id: r.id } : { data: r.data })) }) });
        titra('medium');
        if (sahifalar[sahifalar.length - 1] === ekran) sahifaYop();
        if (tugadi) tugadi();
        else { await katalogniYangila(); if (holat.tab === 'profil') buyurtmalarniChiz({ majburiy: true }); }
      } catch (e) {
        ogohlantir(e.message);
        t.disabled = false; t.innerHTML = `${ik('yuborish', 18)}Yuborish`;
      }
    };
  };
  ekran = sahifaOch({
    sarlavha: joriy ? 'Sharhni o‘zgartirish' : 'Sharh yozish', html: '',
    ula: (t) => { tan = t; chiz(); },
  });
}

/** Rasmni butun ekranda ko'rish — bosilsa yopiladi. */
function rasmKorish(id) {
  const q = document.createElement('div');
  q.className = 'rasm-korish';
  q.innerHTML = `<img src="/media/${esc(id)}" alt="">
    <button aria-label="Yopish">${ik('yopish', 20)}</button>`;
  const yop = () => { q.classList.add('ketdi'); setTimeout(() => q.remove(), 180); };
  q.onclick = yop;
  document.body.appendChild(q);
  titra();
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
  // Mahsulot oynasidagi doimiy pastki tugma faqat o'sha oynada
  $('#modal .oyna')?.classList.remove('pastli');
  kor($('#modal'), true);
  try { tg?.BackButton?.show?.(); } catch {}
  // Android «orqaga» tugmasi oynani yopsin — ilovadan chiqib ketmasin
  if (TARIX && !history.state?.modal) tarixga({ tab: holat.tab, modal: 1 }, true);
}
const modalYop = () => {
  kor($('#modal'), false);
  try { if (!sahifalar.length) tg?.BackButton?.hide?.(); } catch {}
  // Oyna tugma bilan yopildi — tarixdagi yozuvi oddiy yozuvga aylanadi
  // (orqaga bosilganda takroriy yozuv o'tkazib yuboriladi, pastga qarang)
  if (TARIX && history.state?.modal) tarixga({ tab: holat.tab });
};
try { tg?.BackButton?.onClick?.(() => (ustkiQatlam() === 'sahifa' ? sahifaYop() : modalYop())); } catch {}
$$('[data-yop]').forEach((el) => el.onclick = modalYop);

// ================= ALOHIDA EKRANLAR =================
// Sozlamalar, sharhlar, sharh yozish — har biri O'Z ekranida ochiladi:
// o'ngdan suriladi, tepada «orqaga» tugmasi va sarlavha. Ilgari ular
// joyida ochilib-yopiladigan yig'malar edi va ilova o'yinchoqdek
// ko'rinardi. Ekranlar ustma-ust turadi (sharhlar → sharh yozish),
// Android «orqaga» tugmasi eng ustidagisini yopadi.
const sahifalar = [];
const modalOchiqmi = () => !$('#modal').classList.contains('yashirin');
// Ekran mahsulot oynasidan ochilsa (sharhlar) — oyna USTIDA, profildan
// ochilsa — oynalar (tasdiq, ro'yxat) uning ustida chiqishi uchun OSTIDA
const ustkiQatlam = () => {
  const s = sahifalar[sahifalar.length - 1];
  if (modalOchiqmi() && (!s || Number(s.style.zIndex) < 60)) return 'modal';
  return s ? 'sahifa' : modalOchiqmi() ? 'modal' : '';
};

/**
 * @param {object} o
 * @param {string} o.sarlavha
 * @param {string} o.html        ekran tanasi
 * @param {(tan:HTMLElement, s:HTMLElement)=>void} [o.ula]  tugmalarni ulash
 * @param {()=>void} [o.yopilganda]
 * @param {string} [o.sinf]      qo'shimcha sinf (masalan to'q natija ekrani)
 */
function sahifaOch({ sarlavha, html, ula, yopilganda, sinf = '', izoh = '' }) {
  const s = document.createElement('section');
  s.className = `sahifa ${sinf}`;
  s.style.zIndex = modalOchiqmi() ? 65 + sahifalar.length : 55 + sahifalar.length;
  s.setAttribute('role', 'dialog');
  s.setAttribute('aria-label', sarlavha);
  s.innerHTML = `
    <header class="sahifa-bosh">
      <button class="sahifa-orqa" aria-label="Orqaga">${ik('orqaga', 22, 2)}</button>
      <div class="sahifa-nom"><h2>${esc(sarlavha)}</h2>${izoh ? `<small>${esc(izoh)}</small>` : ''}</div>
    </header>
    <div class="sahifa-tan"></div>`;
  const tan = s.querySelector('.sahifa-tan');
  tan.innerHTML = html;
  s._yopilganda = yopilganda;
  document.body.appendChild(s);
  sahifalar.push(s);
  document.body.classList.add('sahifa-ochiq');
  titra();
  s.querySelector('.sahifa-orqa').onclick = () => sahifaYop();
  if (TARIX) tarixga({ ...(history.state || { tab: holat.tab }), sahifa: sahifalar.length }, true);
  try { tg?.BackButton?.show?.(); } catch {}
  ula?.(tan, s);
  return s;
}

/** Eng ustidagi ekranni yopadi. `tarixdan` — «orqaga» tugmasidan kelgan. */
function sahifaYop({ tarixdan = false } = {}) {
  const s = sahifalar[sahifalar.length - 1];
  if (!s) return;
  // Tugma bilan yopilsa tarix yozuvi ham olinadi — popstate qayta shu yerga keladi
  if (TARIX && !tarixdan && history.state?.sahifa === sahifalar.length) { history.back(); return; }
  sahifalar.pop();
  s.classList.add('ketdi');
  setTimeout(() => s.remove(), 260);
  if (!sahifalar.length) document.body.classList.remove('sahifa-ochiq');
  try { if (!sahifalar.length && !modalOchiqmi()) tg?.BackButton?.hide?.(); } catch {}
  s._yopilganda?.();
}

/** Ochiq ekranning tanasini qayta chizish (masalan saqlangandan keyin). */
const sahifaTani = (s) => s?.querySelector('.sahifa-tan');

// ---------------- Skaner ----------------
let tanlanganRasm = null;
let tanlanganMime = 'image/jpeg';
$('#tushirish').onclick = kameraniYoq;
$('#t-telefon-kamera').onclick = () => $('#fayl').click();
$('#t-galereya').onclick = () => $('#fayl-galereya').click();
$('#t-kam-yop').onclick = kameraniYop;
$('#t-kam-ol').onclick = kamSuratOl;

const faylTanlandi = async (e) => {
  const fayl = e.target.files?.[0];
  if (!fayl) return;
  if (fayl.size > 20 * 1024 * 1024) return ogohlantir('Rasm juda katta (20 MB dan ortiq).');
  // Skaner uchun 1600 px: 1024 px da teri teksturasi (teshiklar, mayda
  // tuklar) yo'qoladi va AI rasmni XIRA deb rad etadi — aynan shu
  // «negadir xira oladi» degan shikoyatning sababi edi.
  const r = await rasmniTayyorla(fayl, KAM_MAKS, KAM_SIFAT);
  if (!r) return ogohlantir('Rasmni o‘qib bo‘lmadi. Boshqa surat tanlang.');
  tanlanganRasm = r.data; tanlanganMime = r.mime;
  $('#oldindan-rasm').src = r.data;
  kor($('#skaner-boshlash'), false); kor($('#skaner-oldindan'), true);
  rasmSifatiniTekshir(await faylSifati(r.data));
};
$('#fayl').onchange = faylTanlandi;
$('#fayl-galereya').onchange = faylTanlandi;

$('#t-boshqa').onclick = () => {
  tanlanganRasm = null; $('#fayl').value = ''; $('#fayl-galereya').value = '';
  $('#oldindan-ogoh')?.remove();
  kor($('#skaner-oldindan'), false); kor($('#skaner-boshlash'), true);
};
$('#t-tahlil').onclick = tahlilQil;

// ═══════════ JONLI KAMERA VA SIFAT NAZORATI ═══════════
//
// Muammo. Odam suratga olar, yuborar va bir necha soniyadan keyin
// «rasm xira» degan javob olardi: kvota yonar, vaqt ketar, u esa
// nima noto'g'ri ekanini bilmasdi. Ustiga noutbukning veb-kamerasi
// yoki past sifatli oldingi kamera 640x480 beradi — bunday kadrda
// teri teksturasi umuman ko'rinmaydi va tahlil chinakam ishonchsiz
// bo'ladi.
//
// Yechim uch qismdan iborat:
//   1. Kadr KAMERADA turganida o'lchanadi (sifat.js) va odamga
//      AYNAN nima qilish kerakligi aytiladi.
//   2. Tushirishda BIR NECHA kadr olinadi va eng tiniqi tanlanadi —
//      qo'l titrasa ham yaxshi kadr ilinib qoladi.
//   3. Kamera eng yuqori o'lchamda so'raladi; qurilma past sifat
//      bersa, telefonning O'Z kamerasiga yo'naltiriladi.
//
// LIDAR EMAS. Brauzerda chuqurlik sensori yo'q. Ekrandagi to'r —
// haqiqiy o'lchov ko'rinishi: har katak o'sha joydagi tiniqlik
// bo'yicha rangga kiradi, tugunlar esa yorug'lik bo'yicha siljiydi.
// Shuning uchun u «bezak» emas, lekin uni 3D skaner deb atash ham
// noto'g'ri bo'lardi.

let kamOqim = null;            // MediaStream
let kamHalqa = 0;              // o'lchov taymeri
let kamOldingi = null;         // oldingi kadrning kulrangi
let kamOxirgi = null;          // oxirgi o'lchov natijasi
let kamYaxshiKetma = 0;        // ketma-ket nechta yaxshi kadr

const KAM_OLCHOV_ENI = 240;    // tiniqlik/yorug'lik shu kenglikda o'lchanadi
// Yuz aniqlash KENGROQ kadrda bajariladi. 240 px da yuz 60-70
// pikselga tushib qoladi va kaskad ba'zan ko'zoynak atrofinigina
// «yuz» deb topadi — quti siljib ketadi. 288 px da xato yo'qoladi,
// hisob esa atigi ~20 ms ga uzayadi (uchtadan bir kadrda).
const KAM_YUZ_ENI = 288;
const KAM_MAKS = 1600;         // yuboriladigan rasmning eng katta tomoni
const KAM_SIFAT = 0.92;

/** Kamera umuman bormi (Telegram WebView da bo'lmasligi mumkin). */
const kameraBormi = () => Boolean(navigator.mediaDevices?.getUserMedia);

async function kameraniYoq() {
  if (!kameraBormi()) {
    ogohlantir('Bu qurilmada brauzer kamerasi ishlamaydi — telefon kamerasidan foydalaning.');
    $('#fayl').click();
    return;
  }
  kor($('#skaner-boshlash'), false);
  kor($('#skaner-kamera'), true);
  $('#kam-maslahat').textContent = 'Kamera yoqilmoqda…';
  kaskadniYukla();
  halqaChiroq(true);
  yuzOxirgi = null; yuzNuqta = null; yuzSanoq = 0; yuzYoq = 0;

  try {
    // Eng yuqori o'lcham so'raladi. `ideal` — «iloji bo'lsa shuncha»:
    // `exact` qo'yilsa kamera umuman ochilmay qolishi mumkin.
    kamOqim = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width:  { ideal: 1920 },
        height: { ideal: 1440 },
        frameRate: { ideal: 30 },
      },
    });
  } catch (e) {
    kameraniYop();
    // Ruxsat berilmagan bo'lsa aytamiz, aks holda telefon kamerasiga
    const rad = /NotAllowed|Permission/i.test(e.name || e.message || '');
    ogohlantir(rad
      ? 'Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki telefon kamerasidan foydalaning.'
      : 'Kamera ochilmadi — telefon kamerasidan foydalaning.');
    if (!rad) $('#fayl').click();
    return;
  }

  const video = $('#kam-video');
  video.srcObject = kamOqim;
  try { await video.play(); } catch { /* avtomatik o'ynash bloklandi */ }

  // Avtofokusni doimiy rejimga o'tkazishga urinamiz — qo'llab-quvvatlanmasa
  // xato tashlamaydi, shunchaki e'tiborsiz qoladi
  const yol = kamOqim.getVideoTracks()[0];
  try { await yol.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch {}

  // Kamera past o'lchamda ochilgan bo'lsa — ogohlantiramiz. 640x480 da
  // (noutbuk veb-kamerasining odatdagi o'lchami) teri teshiklari va
  // mayda tuklar umuman ko'rinmaydi, tahlil esa aynan shularga
  // tayanadi. Bu — «negadir xira oladi» degan shikoyatning ikkinchi
  // sababi: kamera emas, uning O'LCHAMI past edi.
  const olchov = yol.getSettings?.() || {};
  const past = (olchov.width || 0) < 720;
  const ogoh = $('#kam-ogoh');
  kor(ogoh, past);
  if (past) {
    ogoh.innerHTML = `<b>Kamera sifati past —
      ${olchov.width || '?'}×${olchov.height || '?'}</b>
      <span>Bunday kadrda teri teksturasi ko‘rinmaydi. Aniqroq natija
      uchun telefonning o‘z kamerasidan foydalaning.</span>
      <button class="ikkilamchi" id="t-kam-telefon">Telefon kamerasiga o‘tish</button>`;
    const t = $('#t-kam-telefon');
    if (t) t.onclick = () => { kameraniYop(); $('#fayl').click(); };
  }

  kamOldingi = null; kamYaxshiKetma = 0;
  clearInterval(kamHalqa);
  // 8 kadr/soniya yetadi: ko'proq o'lchash telefonni qizdiradi va
  // batareyani yeydi, odamga esa foydasi yo'q
  kamHalqa = setInterval(kamOlch, 125);
}

/* Ekranni CHIROQQA aylantirish.
 *
 * Telefonda old kamera yonida chiroq yo'q va brauzerdan yorqinlikni
 * ko'tarib bo'lmaydi. Lekin ekranning o'zi — katta oq yuza: sahifani
 * oqartirsak, yuzga haqiqiy nur tushadi. Telegram sarlavhasi ham
 * oqaradi, aks holda tepada qora yo'l qolib, nur «yarim» bo'lardi.
 *
 * `wakeLock` — ekran so'nib qolmasin: so'nsa chiroq ham o'chadi.
 */
let ekranQulfi = null;

function halqaChiroq(yoq) {
  document.body.classList.toggle('kam-yorug', yoq);
  if (!yoq) document.body.classList.remove('kam-nur-kuchli');
  try {
    if (yoq) {
      tg?.setHeaderColor?.('#ffffff');
      tg?.setBackgroundColor?.('#ffffff');
    } else {
      mavzuniQoll(oxirgiMavzu);
      // Mavzu hali yuklanmagan bo'lsa `mavzuniQoll` hech nima
      // qilmaydi — sarlavha oq bo'lib qolmasin uchun o'zimiz
      // hozirgi fon rangini qaytaramiz
      if (!oxirgiMavzu) {
        const fon = getComputedStyle(document.body).backgroundColor;
        tg?.setHeaderColor?.(fon); tg?.setBackgroundColor?.(fon);
      }
    }
  } catch {}
  if (yoq) {
    navigator.wakeLock?.request?.('screen')
      .then((q) => { ekranQulfi = q; }).catch(() => {});
  } else {
    try { ekranQulfi?.release?.(); } catch {}
    ekranQulfi = null;
  }
}

function kameraniYop() {
  avtoSanoqBekor();
  halqaChiroq(false);
  clearInterval(kamHalqa); kamHalqa = 0;
  try { kamOqim?.getTracks().forEach((t) => t.stop()); } catch {}
  kamOqim = null; kamOldingi = null; kamOxirgi = null;
  const v = $('#kam-video'); if (v) v.srcObject = null;
  kor($('#skaner-kamera'), false);
  kor($('#skaner-boshlash'), true);
}

/** O'lchov uchun kichik kanvas — har kadrda qayta yaratilmaydi. */
const kamKanvas = (() => {
  let c = null;
  return (en, boy) => {
    if (!c) c = document.createElement('canvas');
    if (c.width !== en || c.height !== boy) { c.width = en; c.height = boy; }
    return c;
  };
})();

/* ── YUZ ANIQLASH ──────────────────────────────────────────────
 *
 * Kaskad fayli ~270 KB. Uni bosh sahifada yuklash ahmoqlik bo'lardi:
 * odamlarning ko'pchiligi skanerga umuman kirmaydi. Shuning uchun
 * fayl FAQAT skaner ochilganda, bir marta yuklanadi.
 */
let kaskadHolat = 'yoq';            // yoq | yuklanmoqda | tayyor | xato

function kaskadniYukla() {
  if (kaskadHolat === 'tayyor' || kaskadHolat === 'yuklanmoqda') return;
  kaskadHolat = 'yuklanmoqda';
  const sc = document.createElement('script');
  // Versiyani O'ZIMIZNING <script> manzilimizdan olamiz — server uni
  // HTML ga qo'yib beradi ("app.js?v=a1b2c3")
  const meniki = document.querySelector('script[src*="app.js"]');
  const v = (meniki?.src.match(/[?&]v=([0-9a-f]+)/) || [])[1];
  sc.src = v ? `yuz-kaskad.js?v=${v}` : 'yuz-kaskad.js';
  sc.async = true;
  sc.onload = () => { kaskadHolat = window.YUZ_KASKAD ? 'tayyor' : 'xato'; };
  // Yuklanmasa ilova to'xtamaydi — teri rangi bo'yicha chamalashga
  // qaytamiz, shunchaki aniqligi pastroq bo'ladi
  sc.onerror = () => { kaskadHolat = 'xato'; };
  document.head.appendChild(sc);
}

// Aniqlash har kadrda emas: 240px kadrda ~50 ms ketadi, bu esa
// 8 kadr/soniya oqimning yarmini yeb qo'yardi. Yuz kadrdan kadrga
// sakramaydi, shuning uchun uchtadan bir marta qidirish kifoya.
let yuzOxirgi = null;               // oxirgi topilgan quti
let yuzNuqta = null;                // oxirgi anatomik nuqtalar
let yuzSanoq = 0;
let yuzYoq = 0;                     // ketma-ket nechta kadrda topilmadi
const YUZ_HAR = 3;

/**
 * Kadrdan yuzni topadi va qutini SILLIQLAYDI.
 *
 * Silliqlash shart: har o'lchovda quti bir necha piksel siljiydi va
 * ekrandagi chiziqlar titrab turadi. O'rtacha olsak — tinch turadi.
 */
function yuzniAniqla(video, en, boy) {
  if (kaskadHolat !== 'tayyor' || !window.Yuz) return null;
  if (yuzSanoq++ % YUZ_HAR !== 0 && yuzOxirgi) return yuzOxirgi;

  let q = null;
  try {
    // Aniqlash o'z kadrida — kengroq, shuning uchun aniqroq
    const ye = KAM_YUZ_ENI;
    const yb = Math.round(ye * video.videoHeight / video.videoWidth);
    const yc = yuzKanvas(ye, yb);
    const yx = yc.getContext('2d', { willReadFrequently: true });
    yx.drawImage(video, 0, 0, ye, yb);
    const gd = yx.getImageData(0, 0, ye, yb);
    q = Yuz.yuzniTop(Sifat.kulrang(gd.data, ye, yb), ye, yb, window.YUZ_KASKAD);
    // O'lchov kadrining koordinatasiga qaytaramiz
    if (q) {
      const k = en / ye;
      q = { x: q.x * k, y: q.y * k, en: q.en * k, boy: q.boy * k };
    }
  } catch { return yuzOxirgi; }

  if (!q) {
    // Bir-ikki kadrda yo'qolib qolishi normal (ko'z qisildi, bosh
    // burildi). Faqat uzoq yo'qolsa haqiqatan yo'q deymiz.
    if (++yuzYoq >= 4) { yuzOxirgi = null; yuzNuqta = null; }
    return yuzOxirgi;
  }
  yuzYoq = 0;

  if (yuzOxirgi) {
    const a = 0.45;                  // yangi o'lchovning ulushi
    q = {
      x: yuzOxirgi.x + (q.x - yuzOxirgi.x) * a,
      y: yuzOxirgi.y + (q.y - yuzOxirgi.y) * a,
      en: yuzOxirgi.en + (q.en - yuzOxirgi.en) * a,
      boy: yuzOxirgi.boy + (q.boy - yuzOxirgi.boy) * a,
    };
  }
  yuzOxirgi = q;
  return q;
}

/** Aniqlash uchun alohida kanvas — har kadrda qayta yaratilmaydi. */
const yuzKanvas = (() => {
  let c = null;
  return (en, boy) => {
    if (!c) c = document.createElement('canvas');
    if (c.width !== en || c.height !== boy) { c.width = en; c.height = boy; }
    return c;
  };
})();

function kamOlch() {
  const video = $('#kam-video');
  if (!video || !video.videoWidth || video.paused) return;

  const en = KAM_OLCHOV_ENI;
  const boy = Math.round(en * video.videoHeight / video.videoWidth);
  const c = kamKanvas(en, boy);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(video, 0, 0, en, boy);

  let n;
  try {
    const yuzQuti = yuzniAniqla(video, en, boy);
    n = Sifat.kadrniOlch(x.getImageData(0, 0, en, boy), kamOldingi, yuzQuti);
    // Ko'zlar — o'lchov kadrida qidiriladi (yuz qutisi ichida,
    // shuning uchun arzon). Belgilar shundan joylashadi.
    if (yuzQuti && n.kulrang) {
      try {
        yuzNuqta = Yuz.nuqtalar(yuzQuti,
          Yuz.kozlarniTop(n.kulrang, en, boy, yuzQuti, window.KOZ_KASKAD));
      } catch { yuzNuqta = Yuz.nuqtalar(yuzQuti, null); }
    } else { yuzNuqta = null; }
  } catch { return; }                    // kadr hali tayyor emas
  kamOldingi = n.kulrang;
  kamOxirgi = n;

  kamChiz(n, en, boy);

  $('#kam-maslahat').textContent = n.maslahat;
  $('#kam-holat').dataset.holat = n.holat;
  chiziq('#kam-tiniq', n.tiniqlik, Sifat.CHEGARA.tiniqlik);
  chiziq('#kam-yorug', Math.min(100, Math.round(n.yoruglik.ora / 1.6)),
    Math.round(Sifat.CHEGARA.yoruglik_past / 1.6));
  // «Yuz» chizig'i: haqiqiy yuz topilganda bo'y bo'yicha, teri
  // chamasida esa maydon bo'yicha o'lchanadi
  chiziq('#kam-yuz',
    n.manba === 'yuz' ? Math.round((n.boy_ulush / Sifat.CHEGARA.yuz_boy_maks) * 100)
                      : Math.round(n.yuz_ulush * 100),
    n.manba === 'yuz' ? Math.round((Sifat.CHEGARA.yuz_boy / Sifat.CHEGARA.yuz_boy_maks) * 100)
                      : Math.round(Sifat.CHEGARA.yuz_ulush * 100));

  // Tugma faqat kadr YAXSHI bo'lganda ochiladi, lekin ketma-ket
  // ikki kadr kerak: bitta tasodifiy yaxshi kadr aldab qo'ymasin
  kamYaxshiKetma = n.tayyor ? kamYaxshiKetma + 1 : 0;
  $('#t-kam-ol').disabled = kamYaxshiKetma < 2;

  // Yuz uzoq yoki qorong'i bo'lsa nur kuchayadi: kadr kichrayadi,
  // oq maydon kengayadi va halqa nafas oladi — odam beixtiyor
  // yaqinroq keladi
  document.body.classList.toggle('kam-nur-kuchli',
    n.masofa === 'uzoq' || n.masofa === 'yoq'
      || n.yoruglik.ora < Sifat.CHEGARA.yoruglik_past);

  // Kadr ketma-ket yaxshi chiqsa — o'zi oladi
  if (kamYaxshiKetma >= KAM_AVTO_KETMA) avtoSanoqBoshla();
  else if (!n.tayyor) avtoSanoqBekor();
}

function chiziq(tanlov, qiymat, chegara) {
  const el = $(tanlov);
  if (!el) return;
  el.style.width = `${Math.max(3, Math.min(100, qiymat))}%`;
  el.className = qiymat >= chegara ? 'yaxshi' : qiymat >= chegara * 0.6 ? 'orta' : 'yomon';
}

/* ── SKANER KO'RINISHI ────────────────────────────────────────
 *
 * Ekranda FAQAT o'lchangan narsa ko'rsatiladi va har biri o'z
 * joyida turadi, chunki joylar taxmin emas — yuz aniqlagichdan
 * keladi:
 *
 *   kontur    — topilgan yuzning ovali, rangi umumiy sifatdan
 *   to'lqin   — oval bo'ylab yurgan nuqtalar: yuzga moslashadi
 *   skaner    — pastga tushadigan yo'g'on chiziq va uning izi
 *   ko'z      — bodom shaklida, qorachig'i bilan
 *   belgilar  — burun, lab, iyak, yonoq: yumshoq halqalar
 *   qavslar   — «nishonga olindi»: yuz topilganda yopiladi
 *
 * Chiziqlar ATAYLAB yo'g'on: telefonni cho'zilgan qo'lda tutgan
 * odam ingichka chiziqni umuman ko'rmaydi.
 */

/** Yuzning ovali: markaz va yarim o'qlar. */
function yuzOvali(q) {
  // Haar qutisi peshonadan iyakkacha; haqiqiy bosh biroz uzunroq
  // va torroq — oval shunga moslanadi
  return { mx: q.x + q.en / 2, my: q.y + q.boy * 0.52,
           rx: q.en * 0.44, ry: q.boy * 0.58 };
}

/* To'lqin nuqtalari — birlik doirada, uch halqa bo'lib.
 * Bir marta hisoblanadi: har kadrda qayta yaratish telefonni
 * bejizga qizdiradi. Ular yuz ovaliga cho'ziladi, ya'ni yuz
 * qayerga qimirlasa — nuqtalar ham o'sha yerda. */
const TOLQIN_NUQTA = (() => {
  const n = [];
  for (let halqa = 1; halqa <= 3; halqa++) {
    const r = 0.34 + halqa * 0.22;
    const soni = 12 + halqa * 5;
    for (let i = 0; i < soni; i++) {
      const a = (i / soni) * Math.PI * 2 + halqa * 0.7;
      n.push({ u: Math.cos(a) * r, v: Math.sin(a) * r });
    }
  }
  return n;
})();

/** Bodom shaklidagi ko'z — «+» dan ancha chiroyliroq. */
function kozBelgisi(x, cx, cy, r, burchak, rang, alfa, qalin) {
  x.save();
  x.translate(cx, cy); x.rotate(burchak);
  x.strokeStyle = `rgba(${rang},${alfa.toFixed(3)})`;
  x.lineWidth = qalin;
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(-r, 0);
  x.quadraticCurveTo(0, -r * 0.66, r, 0);
  x.quadraticCurveTo(0, r * 0.66, -r, 0);
  x.closePath();
  x.stroke();
  // Qorachiq
  x.beginPath();
  x.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  x.stroke();
  x.restore();
}

/** Yumshoq halqa — burun, lab, iyak va yonoq uchun. */
function halqaBelgisi(x, cx, cy, r, rang, alfa, qalin) {
  x.strokeStyle = `rgba(${rang},${alfa.toFixed(3)})`;
  x.lineWidth = qalin;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.fillStyle = `rgba(${rang},${(alfa * 0.9).toFixed(3)})`;
  x.beginPath(); x.arc(cx, cy, Math.max(1, r * 0.22), 0, Math.PI * 2); x.fill();
}

function kamChiz(n, olchovEni, olchovBoyi) {
  const c = $('#kam-tor');
  const quti = c.getBoundingClientRect();
  const en = Math.round(quti.width), boy = Math.round(quti.height);
  if (!en || !boy) return;
  if (c.width !== en || c.height !== boy) { c.width = en; c.height = boy; }
  const x = c.getContext('2d');
  x.clearRect(0, 0, en, boy);

  // O'lchov kanvasi «object-fit: cover» bilan ko'rsatiladi; video esa
  // ko'zguga o'girilgan — chiziqlar ham shunday bo'lishi kerak
  const k = Math.max(en / olchovEni, boy / olchovBoyi);
  const siljishX = (en - olchovEni * k) / 2;
  const siljishY = (boy - olchovBoyi * k) / 2;
  const K = (px) => en - (siljishX + px * k);
  const Y = (py) => siljishY + py * k;

  if (!n.quti) {
    // Yuz topilmadi — faqat ko'rsatma ovali, sokin puls bilan
    const p = 0.45 + 0.2 * Math.sin(Date.now() / 520);
    x.strokeStyle = `rgba(255,255,255,${p.toFixed(3)})`;
    x.lineWidth = 3;
    x.setLineDash([12, 14]);
    x.beginPath();
    x.ellipse(en / 2, boy * 0.46, en * 0.29, boy * 0.33, 0, 0, Math.PI * 2);
    x.stroke(); x.setLineDash([]);
    return;
  }

  const q = n.quti;
  const o = yuzOvali(q);
  // Umumiy rang — ENG zaif ko'rsatkich bo'yicha, ya'ni maslahat
  // bilan bir xil narsani aytadi
  const rang = n.tayyor ? '86,230,170' : n.ball >= 55 ? '250,205,110' : '250,120,120';

  const ox = K(o.mx), oy = Y(o.my), orx = o.rx * k, ory = o.ry * k;
  const vaqt = Date.now() / 1000;
  const sweep = (Date.now() % 2400) / 2400;
  const sy = oy - ory + 2 * ory * sweep;

  // ── 1. Kontur (yo'g'on — quyoshda ham ko'rinsin)
  x.save();
  x.beginPath();
  x.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2);
  x.strokeStyle = `rgba(${rang},.6)`;
  x.lineWidth = 3;
  x.shadowColor = `rgba(${rang},.7)`;
  x.shadowBlur = 16;
  x.stroke();
  x.restore();

  // ── 2. To'lqin nuqtalari: oval bo'ylab yuqoridan pastga yuguradi
  for (const p of TOLQIN_NUQTA) {
    const px = ox + p.u * orx, py = oy + p.v * ory;
    // To'lqin — nuqtaning BALANDLIGIGA bog'liq, shuning uchun u
    // yuz bo'ylab pastga oqayotgandek ko'rinadi
    const t = Math.sin(p.v * 3.4 - vaqt * 2.3);
    const kuch = 0.5 + 0.5 * t;
    const r = 1.4 + kuch * 1.9;
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fillStyle = `rgba(${rang},${(0.22 + 0.45 * kuch).toFixed(3)})`;
    x.fill();
  }

  // ── 3. Skaner chizig'i: konturning ichida yuradi
  const t = (sy - oy) / ory;
  const yarimEn = orx * Math.sqrt(Math.max(0, 1 - t * t));
  if (yarimEn > 2) {
    const iz = x.createLinearGradient(0, sy - ory * 0.34, 0, sy);
    iz.addColorStop(0, `rgba(${rang},0)`);
    iz.addColorStop(1, `rgba(${rang},.22)`);
    x.fillStyle = iz;
    x.save();
    x.beginPath(); x.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2); x.clip();
    x.fillRect(ox - orx, sy - ory * 0.34, orx * 2, ory * 0.34);
    x.restore();

    x.save();
    x.beginPath();
    x.moveTo(ox - yarimEn, sy); x.lineTo(ox + yarimEn, sy);
    x.strokeStyle = `rgba(${rang},.95)`;
    x.lineWidth = 3.5;
    x.lineCap = 'round';
    x.shadowColor = `rgba(${rang},.9)`;
    x.shadowBlur = 12;
    x.stroke();
    x.restore();
  }

  // ── 4. Anatomik belgilar
  const nq = yuzNuqta;
  if (nq) {
    const yaqinlik = (py) => Math.max(0, 1 - Math.abs(py - sy) / (ory * 0.3));
    // Ko'zgu tufayli ekrandagi burchak teskari bo'ladi
    const burchak = -(nq.burchak || 0);
    const kozR = Math.max(7, nq.oraliq * k * 0.30);
    for (const koz of [nq.koz_chap, nq.koz_ong]) {
      if (!koz) continue;
      const px = K(koz.x), py = Y(koz.y);
      kozBelgisi(x, px, py, kozR * (1 + yaqinlik(py) * 0.16), burchak,
        rang, 0.75 + yaqinlik(py) * 0.25, 2.4);
    }
    for (const p of [nq.burun, nq.lab, nq.iyak, nq.yonoq_chap, nq.yonoq_ong]) {
      if (!p) continue;
      const px = K(p.x), py = Y(p.y);
      const ya = yaqinlik(py);
      halqaBelgisi(x, px, py, 4.5 + ya * 3.5, rang, 0.55 + ya * 0.4, 2.2);
    }
  }

  // ── 5. Burchak qavslari: yuz topilganda ichkariga «yopiladi»
  const bx = K(q.x + q.en), by = Y(q.y), bEn = q.en * k, bBoy = q.boy * k;
  const uz = Math.min(bEn, bBoy) * 0.17;
  x.strokeStyle = `rgba(255,255,255,${n.tayyor ? '.95' : '.66'})`;
  x.lineWidth = 3.5; x.lineCap = 'round';
  for (const [sx2, sy2, dx, dy] of [
    [bx, by, 1, 1], [bx + bEn, by, -1, 1],
    [bx, by + bBoy, 1, -1], [bx + bEn, by + bBoy, -1, -1]]) {
    x.beginPath();
    x.moveTo(sx2 + dx * uz, sy2); x.lineTo(sx2, sy2); x.lineTo(sx2, sy2 + dy * uz);
    x.stroke();
  }
}

/* ── AVTOMATIK SURAT ──────────────────────────────────────────
 *
 * Kadr ketma-ket yaxshi chiqsa ilova o'zi oladi. Sabab oddiy:
 * tugmani qidirib barmoq ekranga borganda telefon qimirlaydi va
 * aynan o'sha kadr xira chiqadi. Sanoq ko'rinadi, ya'ni odam
 * nima bo'layotganini biladi va xohlasa qimirlab to'xtatadi.
 */
let kamSanoq = 0;               // qolgan sekundlar (0 — sanoq yo'q)
let kamSanoqTaymer = 0;
const KAM_AVTO_KETMA = 4;       // shuncha ketma-ket yaxshi kadrdan keyin

function avtoSanoqBoshla() {
  if (kamSanoq || !kamOqim) return;
  kamSanoq = 3;
  kor($('#kam-sanoq'), true);
  sanoqniChiz();
  kamSanoqTaymer = setInterval(() => {
    kamSanoq--;
    if (kamSanoq <= 0) { avtoSanoqBekor(); kamSuratOl(); return; }
    sanoqniChiz();
  }, 700);
}

function sanoqniChiz() {
  const el = $('#kam-sanoq-son');
  if (!el) return;
  el.textContent = String(kamSanoq);
  // Animatsiya qayta ishga tushsin
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  titra();
}

function avtoSanoqBekor() {
  clearInterval(kamSanoqTaymer); kamSanoqTaymer = 0; kamSanoq = 0;
  kor($('#kam-sanoq'), false);
}

/**
 * Suratga oladi.
 *
 * Bitta kadr YETMAYDI: qo'l titrasa aynan o'sha kadr xira chiqishi
 * mumkin. Shuning uchun bir necha kadr olinadi va eng TINIQI
 * tanlanadi — bu telefon kameralaridagi «seriya» rejimining
 * soddalashtirilgan ko'rinishi.
 */
async function kamSuratOl() {
  const video = $('#kam-video');
  if (!video?.videoWidth) return;
  avtoSanoqBekor();
  // O'lchov halqasini ham to'xtatamiz: surat olinayotgan 350 ms
  // ichida u yana «yaxshi kadr» deb sanoqni qaytadan boshlab
  // yuborardi va ekranda «3» bir lahza chaqnab ketardi
  clearInterval(kamHalqa); kamHalqa = 0;
  $('#t-kam-ol').disabled = true;
  $('#kam-maslahat').textContent = 'Olinmoqda — qimirlamang…';
  titra('medium');

  const kadrlar = [];
  for (let i = 0; i < 5; i++) {
    kadrlar.push(kadrniOl(video));
    await uxlaQisqa(70);
  }
  // Eng tiniq kadrni tanlaymiz
  let eng = kadrlar[0], engBall = -1;
  for (const k of kadrlar) {
    const b = kadrTiniqligi(k);
    if (b > engBall) { engBall = b; eng = k; }
  }

  const data = eng.toDataURL('image/jpeg', KAM_SIFAT);
  kameraniYop();

  tanlanganRasm = data; tanlanganMime = 'image/jpeg';
  $('#oldindan-rasm').src = data;
  kor($('#skaner-boshlash'), false); kor($('#skaner-oldindan'), true);
  rasmSifatiniTekshir(engBall);
}

const uxlaQisqa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Videodan bitta kadr — KAM_MAKS gacha kichraytirib. */
function kadrniOl(video) {
  const n = Math.min(1, KAM_MAKS / Math.max(video.videoWidth, video.videoHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(video.videoWidth * n);
  c.height = Math.round(video.videoHeight * n);
  const x = c.getContext('2d');
  // KO'ZGU. Odam ekranda o'zini ko'zguda ko'radi va aynan o'sha
  // ko'rinishga qarab turadi. Kadrni ko'zgusiz saqlasak, tushirilgan
  // surat «teskari» chiqadi — sochning oldi, kiyimning yoqasi,
  // yuzdagi xol boshqa tomonda bo'lib qoladi va odam «bu men
  // emasman» deydi. Shuning uchun SAQLANADIGAN rasm ham ko'zguda.
  x.save();
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(video, 0, 0, c.width, c.height);
  x.restore();
  return c;
}

/** Kanvasdagi rasmning tiniqlik balli. */
function kadrTiniqligi(c) {
  const en = 480;
  const boy = Math.round(en * c.height / c.width);
  const k = document.createElement('canvas');
  k.width = en; k.height = boy;
  const x = k.getContext('2d', { willReadFrequently: true });
  x.drawImage(c, 0, 0, en, boy);
  try {
    const d = x.getImageData(0, 0, en, boy);
    const g = Sifat.kulrang(d.data, en, boy);
    // Tiniqlik aynan YUZ ustida o'lchanadi. Teri qutisi bo'yin va
    // fonni ham qamrab olar, natijada yuzi xira rasm ham «tiniq»
    // bo'lib chiqardi.
    let quti = null;
    if (kaskadHolat === 'tayyor' && window.Yuz) {
      try { quti = Yuz.yuzniTop(g, en, boy, window.YUZ_KASKAD); } catch {}
    }
    if (!quti) quti = Sifat.teriQutisi(d.data, en, boy);
    return Sifat.tiniqlik(g, en, boy, quti);
  } catch { return 0; }
}

/**
 * Tanlangan rasmni YUBORISHDAN OLDIN tekshiradi.
 * Xira bo'lsa ogohlantiramiz, lekin taqiqlamaymiz: o'lchov taxminiy,
 * oxirgi qarorni odam o'zi qiladi.
 */
function rasmSifatiniTekshir(ball) {
  const el = $('#skaner-oldindan');
  let ogoh = $('#oldindan-ogoh');
  if (!ogoh) {
    ogoh = document.createElement('div');
    ogoh.id = 'oldindan-ogoh'; ogoh.className = 'oldindan-ogoh';
    el.insertBefore(ogoh, el.querySelector('.ichki'));
  }
  if (ball >= Sifat.CHEGARA.tiniqlik) {
    ogoh.className = 'oldindan-ogoh yaxshi';
    ogoh.innerHTML = `<b>Rasm tiniq</b><span>Tahlilga tayyor</span>`;
  } else {
    ogoh.className = 'oldindan-ogoh yomon';
    ogoh.innerHTML = `<b>Rasm xira ko‘rinmoqda</b>
      <span>Yorug‘roq joyda, telefonni qimirlatmay qayta oling —
      xira suratdan chiqqan tahlil ishonchsiz bo‘ladi.</span>`;
  }
}

/** Tanlangan faylning sifatini ham shu tarzda tekshiramiz. */
function faylSifati(dataUrl) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      try { res(kadrTiniqligi(c)); } catch { res(100); }
    };
    im.onerror = () => res(100);        // o'qib bo'lmasa — to'smaymiz
    im.src = dataUrl;
  });
}

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
    : `<span>Bugun yana <b>${L.qolgan} ta</b> bepul tahlil</span>
       <span class="limit-nuqtalar" aria-label="${L.ishlatilgan} / ${L.limit} ishlatildi">${
         Array.from({ length: Math.min(10, L.limit || 0) }, (_, i) =>
           `<i class="${i < L.ishlatilgan ? 'ishlatildi' : ''}"></i>`).join('')}</span>`;
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
      age_estimate: j.tahlil.taxminiy_yosh, jins: j.tahlil.jins,
      skin_tone: j.tahlil.teri_rangi,
      skin_type: j.tahlil.teri_turi, score: j.tahlil.ball,
      problems: j.tahlil.muammolar, forecast: j.tahlil.prognoz,
      routine: j.tahlil.tavsiya, is_offline: j.tahlil.oflayn,
      // MUHIM: parhez va tavsif ham ko'chiriladi. Ilgari faqat xulosa
      // olinardi va shu sababli skanerdan keyin «Dieta» bo'limi
      // BO'SH chiqardi — ma'lumot serverdan kelgan, lekin yo'lda
      // tashlab ketilgan edi. Sahifa yangilangach (/api/me) paydo
      // bo'lardi, ya'ni xato faqat birinchi ko'rishda bilinardi.
      raw: { xulosa: j.tahlil.xulosa, parhez: j.tahlil.parhez,
             tavsif: j.tahlil.tavsif, olchovlar: j.tahlil.olchovlar || null,
             yuz_quti: j.tahlil.yuz_quti || null },
      yuz_rasm_id: j.yuz_rasm_id || null,
      // O'sish — oldingi tahlildan farq (endi bu oxirgisi bo'ldi)
      oldingi_ball: holat.tahlil?.score ?? null,
    };
    holat.natijaKorish = null;
    holat.limit = j.limit || holat.limit;
    menikiSaqla();                        // yangi tahlil qurilmada ham tursin
    kor($('#skaner-boshlash'), true);
    tanlanganRasm = null; $('#fayl').value = '';
    holat.natijaKesh = null;
    tabSurish.natija = 0;          // yangi natija BOSHIDAN ko'rinsin
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
const BOSQICH = { tozalash:'Tozalash', toner:'Toner', davolash:'Davolash',
                  namlash:'Namlash', himoya:'Quyoshdan himoya', qoshimcha:'Qo‘shimcha',
                  ichki:'Ichki qabul' };

// Jins TAXMIN qilinadi. Ishonch bo'lmasa AI «nomalum» qaytaradi va
// biz qatorni umuman ko'rsatmaymiz — «noma'lum» deb yozish odamga
// hech nima bermaydi, faqat xato taassurot qoldiradi.
const JINS = { erkak: 'Erkak', ayol: 'Ayol' };

// ═══════════ TAHLIL NATIJASI ═══════════
//
// Natija — ilovaning eng muhim ekrani: odam shu yerda o'zi haqida
// birinchi marta narsa biladi va shu yerda sotib olishga qaror
// qiladi.
//
// O'lchov oddiy: BUNI 7 YOSHLI BOLA HAM TUSHUNISHI KERAK. Shuning
// uchun har bo'lim bitta savolga javob beradi va javob RAQAM yoki
// RANG bilan aytiladi, uzun matn bilan emas:
//
//   1. Suratda muammolar RAQAMLANGAN nishon bilan belgilanadi
//      (①②③) — pastdagi ro'yxatdagi raqam bilan bir xil. Odam
//      nishonga qaraydi, ro'yxatdan o'sha raqamni topadi.
//   2. Umumiy ball — bitta katta son va bitta so'z.
//   3. Ko'rsatkichlar — bir qatorda, har biri son va rangli chiziq.
//   4. Muammolar ro'yxati — raqam, nom, foiz, chiziq.
//   5. Ovqat — ikki qarama-qarshi panel: yashil «mumkin», qizil «yo'q».
//   6. Mahsulotlar — tartib raqami bilan, yon tomonga siriladi.
//
// RANG QOIDASI butun ekranda bitta: yashil — yaxshi, sariq —
// e'tibor bering, qizil — muammo. Fon ranglari esa bo'limni
// AJRATADI: ovqat yashil/qizil, parvarish ko'k, prognoz sariq.
//
// MATN QOIDASI: asosiy matn oq (--matn), ikkinchi darajali kulrang
// (--kul). Uchinchi darajali matn umuman yozilmaydi — ilgari ekran
// shunday mayda izohlarga to'lib ketgan va hech kim o'qimagan edi.

const KALIT_NOM = {
  akne: 'Toshmalar', teshik: 'Poralar', yoglilik: 'Yog‘lilik',
  quruqlik: 'Namlik', qizarish: 'Qizarish', dog: 'Pigmentatsiya',
  ajin: 'Ajinlar', xiralik: 'Yorqinlik', sezgirlik: 'Sezgirlik',
  qora_doira: 'Ko‘z ostidagi soya', shishish: 'Shishish',
};

/**
 * Zona MATNIDAN yuzdagi taxminiy joyni topadi (foizda).
 *
 * AI koordinata bermaydi — u «yonoqlarning yuqori qismi» deb yozadi.
 * Shu matndan joyni chamalaymiz. Aniq emas, lekin belgi TAXMINIY
 * joyda turgani ham odamga «qayerga qarash kerak» degan ma'lumot
 * beradi; noto'g'ri joyga qo'yilgan belgidan ko'ra buni ochiq
 * aytgan yaxshi.
 */
/* Yuzdagi zonalar — YUZ QUTISIGA nisbatan foizda.
 *
 * Ilgari bu sonlar butun RASMGA nisbatan edi va shu sababli
 * telefonda «peshona» belgisi sochga, «iyak» esa ko'ylakka tushib
 * qolardi: rasmda yuz hech qachon aniq o'rtada va aniq shu
 * kattalikda turmaydi.
 *
 * Endi ular yuz qutisi ICHIDAGI joy: 0 — qutining tepasi
 * (peshona), 100 — iyak. Quti `Yuz` aniqlagichidan keladi;
 * topilmasa quyidagi TAXMIN ishlatiladi.
 */
const ZONA_JOY = [
  [/peshona|peshana/i,            50, 15],
  [/t-?zona/i,                    50, 35],
  [/burun/i,                      50, 51],
  [/chakka/i,                      8, 27],
  [/qosh/i,                       32, 27],
  [/ko[‘'`ʻ]?z\s*ost|qora\s*doira/i, 28, 44],
  [/ko[‘'`ʻ]?z|qovoq/i,           28, 39],
  [/yonoq|yuz\s*yon/i,           16, 56],
  [/lab|og[‘'`ʻ]?iz|dahan/i,      50, 81],
  [/iyak|jag[‘'`ʻ]?|engak/i,      50, 91],
  [/bo[‘'`ʻ]?yin/i,               50, 109],
];

// Yuz topilmaganda: o'rtacha selfida yuz taxminan shu joyda turadi
// (rasm foizida). Aniqlagich ishlasa bu qiymat almashtiriladi.
const YUZ_TAXMIN = { x: 12, y: 5, en: 76, boy: 80 };

/**
 * Zona matnidan yuzdagi joyni topadi.
 * @param {{x:number,y:number,en:number,boy:number}} [yuz] quti RASM FOIZIDA
 * @returns {{x:number,y:number}} rasm foizida
 */
function zonaJoyi(matn, tartib, yuz) {
  const s = String(matn || '');
  let joy = null;
  for (const [re, x, y] of ZONA_JOY) if (re.test(s)) { joy = { x, y }; break; }
  if (!joy) joy = { x: 50, y: 45 + (tartib % 3) * 17 };     // aniqlanmadi — markaz
  // «chap»/«o'ng» aytilgan bo'lsa shu tomonga, aytilmasa navbat bilan
  if (joy.x !== 50) {
    const ong = /o[‘'`ʻ]?ng/i.test(s) || (!/chap/i.test(s) && tartib % 2 === 1);
    joy = { x: ong ? 100 - joy.x : joy.x, y: joy.y };
  }
  const q = yuz || YUZ_TAXMIN;
  return {
    x: Math.round(Math.max(3, Math.min(97, q.x + (joy.x / 100) * q.en))),
    y: Math.round(Math.max(3, Math.min(97, q.y + (joy.y / 100) * q.boy))),
  };
}

/** Ko'rsatkich rangi: MA'NO anglatadi, bezak emas. */
const ballRang = (b) => (b >= 70 ? 'yaxshi' : b >= 45 ? 'orta' : 'yomon');

/* BAHO DARAJALARI — BITTA JADVAL, BITTA CHEGARA.
 * `src/lib/olchov.js` dagi DARAJALAR bilan AYNAN bir xil.
 *
 * Ilgari rang `ball/20` bo'yicha, yozuv esa 35/50/65/80 bo'yicha
 * bo'linardi va ikkalasi zid chiqardi: 60 ball «O'rtacha» deb
 * yozilib, chizig'i «yaxshi» rangida turardi. Endi ikkalasi ham
 * shu jadvaldan oladi. */
const DARAJALAR = [
  { kalit: 'zaif',   nom: 'Zaif',          dan: 0 },
  { kalit: 'past',   nom: 'E’tibor kerak', dan: 35 },
  { kalit: 'orta',   nom: 'O‘rtacha',      dan: 50 },
  { kalit: 'yaxshi', nom: 'Yaxshi',        dan: 65 },
  { kalit: 'alo',    nom: 'A’lo',          dan: 80 },
];
const BESH = DARAJALAR.map((d) => d.kalit);
function olchovDaraja(ball) {
  const b = Math.min(100, Math.max(0, Math.round(Number(ball) || 0)));
  let i = 0;
  while (i + 1 < DARAJALAR.length && b >= DARAJALAR[i + 1].dan) i += 1;
  return i;
}
const beshRang = (b) => DARAJALAR[olchovDaraja(b)].kalit;
const olchovBahosi = (b) => DARAJALAR[olchovDaraja(b)].nom;

/** Ball halqasi — SVG, har qanday ekranga cho'ziladi. */
// Har halqaning O'Z gradienti: umumiy id yashirin bo'limda (display:none)
// qolsa, Chrome uni boshqa joyda chizmaydi — profil ro'yxatidagi
// halqalar yoysiz chiqardi.
let halqaSoni = 0;
function ballHalqa(ball, olcham = 132) {
  const r = 54, c = 2 * Math.PI * r;
  const gid = `n-ball-grad-${++halqaSoni}`;
  const to = (c * Math.max(0, Math.min(100, ball))) / 100;
  // Yoy GRADIENT: qizil → sariq → yashil — qaysi tomonga borish kerakligi
  // halqaning o'zida ko'rinib turadi
  return `<svg class="n-halqa" viewBox="0 0 128 128" width="${olcham}" height="${olcham}"
      role="img" aria-label="Umumiy ball ${ball}">
    <defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e52648"/><stop offset="60%" stop-color="#f6a338"/>
      <stop offset="100%" stop-color="#3cd88b"/></linearGradient></defs>
    <circle cx="64" cy="64" r="${r}" class="n-halqa-fon"/>
    <circle cx="64" cy="64" r="${r}" class="n-halqa-yoy ${ballRang(ball)}" style="stroke:url(#${gid})"
      stroke-dasharray="${to.toFixed(1)} ${(c - to).toFixed(1)}"
      transform="rotate(-90 64 64)"/>
    <text x="64" y="66" class="n-halqa-son">${ball}</text>
    <text x="64" y="86" class="n-halqa-mayda">/ 100</text>
  </svg>`;
}

const OYLAR_UZ = ['yanvar','fevral','mart','aprel','may','iyun',
                  'iyul','avgust','sentabr','oktabr','noyabr','dekabr'];

/** Ko'rsatkich nishoni — har ko'rsatkichning o'z belgisi. */
const KALIT_IKON = {
  akne: 'tomchi', teshik: 'tozalik', yoglilik: 'tomchi', quruqlik: 'tomchi',
  qizarish: 'yurak', dog: 'quyosh', ajin: 'soat', xiralik: 'quyosh',
  sezgirlik: 'yurak', qora_doira: 'oy', shishish: 'tomchi',
};

/** Ovqat bandini ikkiga bo'ladi: nomi va qavs ichidagi sababi.
 *  Ro'yxatda faqat NOMI qoladi — qavs ichidagi izoh mayda matn
 *  bo'lib ekranni to'ldirar va hech kim o'qimasdi. */
function ovqatBandi(matn) {
  const s = String(matn || '').trim();
  // Qavs yopilmagan bo'lsa ham (eski, kesilgan javob) — sabab alohida
  const m = s.match(/^(.+?)\s*[（(]\s*(.+?)\s*[)）]?\s*$/);
  return m ? { nom: m[1], sabab: m[2] } : { nom: s, sabab: '' };
}

/* Teri «rentgeni» — bitta suratdan to'rt xil ko'rinish.
 *
 * Hech narsa o'ylab topilmaydi: bu odamning O'Z surati, faqat
 * boshqa kanalda ko'rsatilgan. Qizarish uchun rang to'yinganligi
 * ko'tariladi, yog'lilik uchun yorug'lik cho'qqilari ajratiladi,
 * tekstura uchun rang olib tashlanib kontrast oshiriladi.
 *
 * Nima uchun kerak: AI ba'zan muammoni aniq joyga bog'lay olmaydi
 * («butun yuz bo'ylab»). Shunda ham odam o'z terisini boshqacha
 * ko'radi va tahlil quruq matn bo'lib qolmaydi.
 */
/* TAHLIL QATLAMLARI — klinik skaner (VISIA) ko'rinishida.
 *
 * Har qatlam suratning PIKSELLARIDAN shu telefonda hisoblanadi
 * (public/app/qatlam.js — server natija rasmida ham AYNAN shu fayl).
 * AI ham, server ham ishlatilmaydi — pul ketmaydi. Hisoblanguncha
 * eskizda CSS filtri turadi. */
const QATLAM_CSS = {
  pigment:   'sepia(1) contrast(1.4) brightness(1.05)',
  qizarish:  'sepia(1) hue-rotate(-38deg) saturate(4) contrast(1.1)',
  bakteriya: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(6) brightness(.8)',
  uv:        'grayscale(1) sepia(1) hue-rotate(185deg) saturate(5) brightness(.8)',
  tekstura:  'grayscale(1) contrast(2) brightness(1.05)',
};
const RENTGEN = [
  { kalit: 'asl', nom: 'Asl', izoh: 'filtrsiz', css: 'none' },
  ...((window.Qatlam?.QATLAMLAR) || []).map((q) => ({ ...q, css: QATLAM_CSS[q.kalit] || 'none' })),
];

const qatlamKesh = new Map();       // rasm manzili → {kalit: dataURL}

/**
 * Hamma qatlamni bir marta hisoblaydi. ~640 px: telefonda bitta qatlam
 * o'nlab millisekund. Bo'laklab ishlaydi — ekran qotmaydi.
 * @param {HTMLImageElement} im
 * @param {{x,y,en,boy}|null} yuz  yuz qutisi rasm foizida
 * @param {(kalit:string, url:string)=>void} tayyor  har qatlam tayyor bo'lganda
 */
function qatlamlarniYasa(im, yuz, tayyor) {
  const kalitM = im.currentSrc || im.src;
  const bor = qatlamKesh.get(kalitM);
  if (bor) { Object.entries(bor).forEach(([k, u]) => tayyor(k, u)); return; }
  const natija = {};
  qatlamKesh.set(kalitM, natija);
  let W, H, tayyor_;
  try {
    const k = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight));
    W = Math.max(1, Math.round(im.naturalWidth * k)); H = Math.max(1, Math.round(im.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, W, H);
    tayyor_ = Qatlam.tayyorla(x.getImageData(0, 0, W, H).data, W, H, yuz);
  } catch { return; }                  // rasm o'qilmadi — CSS filtr qoladi

  const qatlamlar = RENTGEN.filter((r) => r.q);
  let n = 0;
  const keyingi = () => {
    const r = qatlamlar[n++];
    if (!r) return;
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      const o = x.createImageData(W, H);
      o.data.set(tayyor_.chiz(r.kalit));
      x.putImageData(o, 0, 0);
      natija[r.kalit] = c.toDataURL('image/jpeg', 0.88);
      tayyor(r.kalit, natija[r.kalit]);
    } catch {}
    setTimeout(keyingi, 16);           // har qatlamdan keyin ekran nafas oladi
  };
  setTimeout(keyingi, 30);
}

/** Katakka sig'adigan qisqa nom (to'liq nomi ro'yxatda qoladi). */
const KALIT_QISQA = {
  qora_doira: 'Ko‘z soyasi', dog: 'Pigment', xiralik: 'Yorqinlik',
  sezgirlik: 'Sezgirlik', shishish: 'Shishish', quruqlik: 'Namlik',
};
const kalitQisqa = (m) =>
  KALIT_QISQA[m.kalit] || KALIT_NOM[m.kalit] || m.nom;

/* ── YETTITA O'LCHOV ──
 * Nusxasi `src/lib/olchov.js` da — server natija rasmini SHU
 * jadval bo'yicha chizadi. Sinov ikkalasini solishtirib turadi,
 * shuning uchun ular ajralib ketmaydi.
 *
 * Nega doimiy yettita: ilgari ko'rsatkichlar TOPILGAN
 * MUAMMOLARDAN yasalardi — terisi toza odam bitta ham ko'rsatkich
 * ko'rmasdi, ikki odamnikini esa solishtirib bo'lmasdi.
 * Ball qancha YUQORI bo'lsa shuncha YAXSHI (100 — ideal). */
const OLCHOVLAR = [
  { kalit: 'pora',     nom: 'Teshiklar', ikon: 'tozalik' },
  { kalit: 'ajin',     nom: 'Ajinlar',   ikon: 'soat' },
  { kalit: 'pigment',  nom: 'Pigment',   ikon: 'quyosh' },
  { kalit: 'qizarish', nom: 'Qizarish',  ikon: 'yurak' },
  { kalit: 'tekstura', nom: 'Tekstura',  ikon: 'qalqon' },
  { kalit: 'namlik',   nom: 'Namlik',    ikon: 'tomchi' },
  { kalit: 'yoglilik', nom: 'Yog‘lilik', ikon: 'tomchi' },
];
const MUAMMO_OLCHOVI = {
  teshik: 'pora', akne: 'tekstura', xiralik: 'tekstura', ajin: 'ajin',
  dog: 'pigment', qora_doira: 'pigment', qizarish: 'qizarish',
  sezgirlik: 'qizarish', quruqlik: 'namlik', shishish: 'namlik',
  yoglilik: 'yoglilik',
};
// 100 EMAS: hech kimning terisi ideal emas va «100/100» yozuv
// ishonchni yo'qotadi — odam «demak o'lchamagan» deb o'ylaydi.
const MUAMMOSIZ = 82;

function olchovlarniHisobla(muammolar, xom) {
  const eng = {};
  (muammolar || []).forEach((m) => {
    const k = MUAMMO_OLCHOVI[m.kalit];
    if (!k) return;
    if (!eng[k] || (m.foiz || 0) > (eng[k].foiz || 0)) eng[k] = m;
  });
  return OLCHOVLAR.map((o) => {
    const m = eng[o.kalit];
    const xomBall = Number(xom?.[o.kalit]);
    // AI bergan ball ustun — u rasmni ko'rgan. Bermagan bo'lsa
    // muammodan hisoblaymiz, u ham bo'lmasa «muammo ko'rinmadi».
    const ball = Number.isFinite(xomBall)
      ? Math.min(100, Math.max(0, Math.round(xomBall)))
      : m ? Math.max(5, 100 - (m.foiz || 0)) : MUAMMOSIZ;
    return { ...o, ball, baho: olchovBahosi(ball),
             // Izoh O'YLAB TOPILMAYDI: faqat haqiqatan topilgan
             // muammoning izohi, aks holda bo'sh
             izoh: m ? (m.izoh || '') : '', muammo: m || null };
  });
}

const natijaKorildi = new Set();
function natijaniChiz() {
  // Profildagi «Natijalarim» dan eski tahlil ochilgan bo'lsa — o'sha
  const t = holat.natijaKorish || holat.tahlil;
  const el = $('#natija-tan');
  holat.natijaKesh = true;   // qayta chizmaslik uchun belgi
  if (!t) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">${ik('skaner',46)}</div>
      <p>Hali tahlil qilinmagan</p>
      <button class="asosiy" style="max-width:260px;margin:16px auto 0" id="t-skanerga">
        Yuz skanerini ochish</button></div>`;
    const b0 = $('#t-skanerga'); if (b0) b0.onclick = () => tabOch('skaner');
    return;
  }
  const karta = new Map(holat.mahsulotlar.map((p) => [p.id, p]));
  const ball = t.score ?? 0;
  const holatSoz = ball >= 80 ? 'A’lo' : ball >= 65 ? 'Yaxshi'
                 : ball >= 50 ? 'O‘rtacha' : ball >= 35 ? 'E’tibor kerak' : 'Zaif';
  const asl = (t.routine || []).map((r) => ({ ...r, p: karta.get(r.product_id) })).filter((r) => r.p);
  const tavsiyalar = holat.arzon ? asl.map(arzonAlmashtir) : asl;
  const jami    = tavsiyalar.reduce((s, r) => s + r.p.price, 0);
  const aslJami = asl.reduce((s, r) => s + r.p.price, 0);
  const arzonBor = asl.some((r) => arzonAlmashtir(r).almashdi);
  const tejash = Math.max(0, aslJami - jami);

  // Muammolar — ENG OG'IRI birinchi. Raqamlar shu tartibda beriladi
  // va suratdagi nishon bilan ro'yxatdagi qator bir xil raqamni
  // oladi: bola ham «① yerda nima bor?» deb topa oladi.
  const muammolar = (t.problems || [])
    .map((m) => ({ ...m, foiz: m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25) }))
    .sort((x, y) => y.foiz - x.foiz)
    // Joy: AI rasmda ko'rsatgan aniq nuqta (bo'lsa), aks holda zona
    // matnidan — AI bergan yuz qutisi bo'yicha
    .map((m, i) => ({ ...m, tartib: i + 1, ballHolat: 100 - m.foiz,
                      joy: (m.nuqta && Number.isFinite(m.nuqta.x)) ? { x: m.nuqta.x, y: m.nuqta.y }
                        : zonaJoyi(m.zona || m.nom, i, t.raw?.yuz_quti || undefined) }));
  // Suratda HAMMASI belgilanadi (ilgari faqat 4 tasi edi — odam
  // «nega yonog'im belgilanmagan?» deb so'rardi)
  const belgili = muammolar.slice(0, 8);
  // Yettitasi HAM chiqadi — muammo topilmaganlari ham. Shu bilan
  // ikki tahlilni bir oydan keyin solishtirish mumkin bo'ladi.
  const olchovlar = olchovlarniHisobla(t.problems || [], t.raw?.olchovlar);
  const parhez = t.raw?.parhez || {};
  const d = t.created_at ? new Date(t.created_at) : new Date();
  const sana = `${d.getDate()}-${OYLAR_UZ[d.getMonth()]}`;
  const ism = (holat.user?.full_name || '').trim().split(/\s+/)[0];

  // Skaner intro-si har tahlil uchun BIR marta: qaytib kelganda takrorlanmaydi
  const intro = !natijaKorildi.has(String(t.id ?? 'yangi'));
  natijaKorildi.add(String(t.id ?? 'yangi'));

  const delta = t.oldingi_ball != null && Number.isFinite(Number(t.oldingi_ball))
    ? ball - Number(t.oldingi_ball) : null;
  const DARAJA_NOM = { 1: 'Yengil', 2: 'O‘rtacha', 3: 'Kuchli' };

  el.innerHTML = `
  <header class="n-shapka">
    <div class="n-logo">K<i>i</i>OVO<small>Teri tahlili · ${sana}</small></div>
    ${ism ? `<span class="n-salom">${esc(ism)}</span>` : ''}
  </header>

  ${holat.natijaKorish ? `
    <div class="n-eski">${ik('soat', 16)}<span>Eski natija · ${sana}</span>
      <button id="t-oxirgiga">Oxirgisi</button></div>` : ''}

  ${t.is_offline ? `<div class="n-karta"><div class="ogoh">AI hozir mavjud emas — bazaviy tavsiya ko‘rsatilmoqda.</div></div>` : ''}

  <!-- ══ QAHRAMON: surat, ball va yorliqlar bitta kartada ══
       Namunadagidek: rasm 4:3, ustida raqamli nishonlar, pastida
       o'ng burchakda qaysi qatlam yoqilgani yozib turadi. -->
  <section class="n-hero">
    ${t.yuz_rasm_id ? `
    <div class="n-yuz${intro ? ' intro' : ''}" data-yuz='${t.raw?.yuz_quti ? esc(JSON.stringify(t.raw.yuz_quti)) : ''}'>
      <div class="n-yuz-media" id="n-yuz-media">
        <img src="/media/${esc(t.yuz_rasm_id)}" alt="Tahlil qilingan surat">
        <!-- Tanlangan qatlam asl surat USTIDA: ajratgichni surib solishtiriladi -->
        <img class="n-qatlam-ust" alt="" hidden>
      </div>
      <div class="n-ajratgich" hidden role="slider" aria-label="Asl surat bilan solishtirish"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" tabindex="0">
        <i></i><span>${ik('almash', 15)}</span>
        <em class="chap">Asl</em><em class="ong"></em>
      </div>
      <!-- SKANER QATLAMI: to'r, lazer chizig'i, yuz ramkasi va o'lchov
           yozuvlari. Hammasi bezak (aria-hidden), lekin yozuvlar HAQIQIY:
           o'lchovlar nomi va topilgan belgilar soni shu tahlildan. -->
      <div class="n-skan" aria-hidden="true">
        <i class="n-skan-tor"></i><i class="n-skan-chiziq"></i><i class="n-skan-nur"></i>
      </div>
      <div class="n-ramka" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="n-hud" aria-hidden="true">
        ${olchovlar.slice(0, 4).map((o, i) => `<span style="--k:${i}">${esc(o.nom)}<b>✓</b></span>`).join('')}
        <span class="n-hud-jami" style="--k:4">${belgili.length ? `${belgili.length} ta belgi` : 'Toza teri'}</span>
      </div>
      ${belgili.map((m, i) => `
        <button class="n-nishon d${Math.min(3, m.daraja || 1)}" data-nishon="${m.tartib}"
          data-x="${m.joy.x}" data-y="${m.joy.y}" style="left:${m.joy.x}%;top:${m.joy.y}%;--k:${i}"
          title="${esc(KALIT_NOM[m.kalit] || m.nom)}"><span>${m.tartib}</span></button>`).join('')}
      <div class="n-yorliq" id="n-yorliq" aria-live="polite"></div>
      <div class="n-qatlam-teg" id="n-qatlam-teg">Asl <span>· filtrsiz</span></div>
    </div>` : ''}

    <div class="n-ball">
      ${ballHalqa(ball, 92)}
      <div>
        <h2 class="${ballRang(ball)}">${holatSoz} holat</h2>
        <p>${esc(t.raw?.xulosa || 'Teri holati baholandi.')}</p>
        ${delta !== null ? `<span class="n-delta ${delta >= 0 ? 'osdi' : 'tushdi'}">
          <i>${delta >= 0 ? '↗' : '↘'}</i><b>${delta > 0 ? '+' : ''}${delta}</b>
          oldingi tahlilga nisbatan</span>` : ''}
      </div>
    </div>

    <div class="n-teglar">
      ${t.age_estimate ? `<span>${esc(t.age_estimate)} yosh</span>` : ''}
      ${JINS[t.jins] ? `<span>${JINS[t.jins]}</span>` : ''}
      ${t.skin_type ? `<span class="hot">${esc(t.skin_type)} teri</span>` : ''}
      ${t.skin_tone ? `<span>${esc(String(t.skin_tone).split(/[,;(]/)[0].trim())}</span>` : ''}
    </div>
  </section>

  ${t.raw?.tavsif ? `
    <div class="n-tavsif"><i>${ik('koz', 16)}</i>
      <span>${esc(t.raw.tavsif)}</span></div>` : ''}

  ${t.yuz_rasm_id ? `
  <!-- ══ TAHLIL QATLAMLARI ══
       Hammasi SHU suratdan chiqadi: rang kanallari boshqacha
       aralashtiriladi, xuddi dermatolog lampasi ostida ko'rgandek. -->
  <section class="n-bolim n-qatlam-bolim">
    <div class="n-bolim-bosh"><h3>Tahlil qatlamlari</h3>
      <span class="n-bolim-izoh">bosing — suratda ochiladi</span></div>
    <div class="n-qatlamlar" role="tablist">
      ${RENTGEN.map((r, i) => `
        <button role="tab" class="n-qatlam${i === 0 ? ' tanlangan' : ''}" style="--k:${i}"
          data-filtr="${r.kalit}" aria-selected="${i === 0}">
          <span class="n-qatlam-rasm${r.q ? ' hisoblanmoqda' : ''}">
            <img src="/media/${esc(t.yuz_rasm_id)}" alt="" loading="lazy"
              style="filter:${r.css}" data-qatlam-rasm="${r.kalit}"></span>
          <b>${r.nom}</b><small>${esc(r.izoh)}</small>
        </button>`).join('')}
    </div>
    <p class="n-qatlam-izoh">${ik('ogoh', 13)}Qatlamlar suratingizdan telefonda hisoblanadi —
      bu vizualizatsiya, UV apparat tekshiruvi emas.</p>
  </section>` : ''}

  <section class="n-bolim">
    <div class="n-bolim-bosh"><h3>Teri ko‘rsatkichlari</h3>
      <span class="n-bolim-izoh">7 o‘lchov · 100 = ideal</span></div>
    <div class="n-olchamlar">
      ${olchovlar.map((o) => `
        <div class="n-olch">
          <span class="n-olch-belgi ${beshRang(o.ball)}">${ik(o.ikon || 'tomchi', 15)}</span>
          <div class="n-olch-tepa">
            <span>${esc(o.nom)}</span>
            <b>${o.ball}<i>/100</i></b>
          </div>
          <div class="n-chiziq"><i class="${beshRang(o.ball)}"
            style="width:${Math.max(5, o.ball)}%"></i></div>
          <em class="${beshRang(o.ball)}">${esc(o.baho)}</em>
        </div>`).join('')}
    </div>
  </section>

  <!-- Umid beruvchi xulosa: odam natijadan qo'rqib ketmasin, yo'l ko'rsin -->
  <section class="n-banner">
    <span class="n-banner-belgi">${ik('barg', 22)}</span>
    <div class="n-banner-matn">
      <b>${ball >= 65 ? 'Teringiz potensiali yuqori!' : 'Teringizni tiklash mumkin!'}</b>
      <span>To‘g‘ri parvarish bilan yanada yaxshilanadi.</span>
    </div>
    <div class="n-banner-trend">
      <svg viewBox="0 0 36 36" width="30" height="30" aria-hidden="true">
        <rect x="2" y="24" width="6" height="10" rx="2" fill="#bbf7d0"/>
        <rect x="11" y="18" width="6" height="16" rx="2" fill="#86efac"/>
        <rect x="20" y="11" width="6" height="23" rx="2" fill="#4ade80"/>
        <path d="M5 18 L15 10 L23 14 L33 4" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M27 4 H33 V10" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>28 kun ichida<br>ko‘rinadigan natija</span>
    </div>
  </section>

  ${muammolar.length ? `
  <section class="n-bolim">
    <div class="n-bolim-bosh">
      <h3>Aniqlangan muammolar</h3>
      <span class="n-bolim-izoh n-muammo-izoh">bosing — tafsiloti</span>
      <button id="t-hammasini-och">Hammasi</button>
    </div>
    ${muammolar.map((m, i) => `
      <details class="n-muammo" id="muammo-${m.tartib}" data-muammo="${m.tartib}">
        <summary>
          <span class="n-raqam d${Math.min(3, m.daraja || 1)}">${m.tartib}</span>
          <span class="n-muammo-nom">${esc(KALIT_NOM[m.kalit] || m.nom)}
            <span class="n-daraja d${Math.min(3, m.daraja || 1)}">${DARAJA_NOM[Math.min(3, m.daraja || 1)]}</span>
            ${m.zona ? `<em>${esc(m.zona)}</em>` : ''}</span>
          <span class="n-muammo-foiz ${ballRang(m.ballHolat)}">${m.foiz}%</span>
          <i class="n-ochish" aria-hidden="true"></i>
        </summary>
        <div class="n-muammo-ich">
          <div class="n-chiziq"><i class="${ballRang(m.ballHolat)}"
            style="width:${Math.max(5, m.foiz)}%"></i></div>
          ${t.yuz_rasm_id ? `<span class="n-kesim" data-kesim="${m.tartib}"
            data-x="${m.joy.x}" data-y="${m.joy.y}"
            style="background-image:url(/media/${esc(t.yuz_rasm_id)})"></span>` : ''}
          ${m.sabab ? `<div class="n-satr"><span>Sababi</span><p>${esc(m.sabab)}</p></div>` : ''}
          ${m.yechim ? `<div class="n-satr"><span>Tavsiya</span><p>${esc(m.yechim)}</p></div>` : ''}
          ${m.ogohlantirish ? `<div class="n-satr diqqat"><span>Diqqat</span>
            <p>${esc(m.ogohlantirish)}</p></div>` : ''}
        </div>
      </details>`).join('')}
  </section>` : `
  <section class="n-karta n-toza">${ik('tasdiq', 22)}
    <b>Sezilarli muammo topilmadi</b>
    <span>Terini shu holatda saqlash uchun quyidagi parvarish yetarli.</span>
  </section>`}

  ${natijaTavsiya(tavsiyalar, jami, tejash, arzonBor)}
  ${natijaParvarish(tavsiyalar)}
  ${natijaPrognoz(t)}

  <div class="n-chaqiriq">
    <div><b>Natijani saqlab qo‘ying</b>
      <span>Bir oydan keyin solishtirasiz</span></div>
    <div class="n-chaqiriq-tugmalar">
      ${navigator.share && !tg?.initData ? `<button id="t-natija-ulash" class="ulash" aria-label="Ulashish">${ik('yuborish', 17)}</button>` : ''}
      <button id="t-ulash2">${ik('yuklab',17)}Saqlash</button>
    </div>
  </div>

  <div class="n-karta n-oxir">
    <button class="ikkilamchi" id="t-qayta">${ik('kamera',18)}Qayta tahlil qilish</button>
  </div>

  <!-- Ovqatlanish — ENG PASTDA, bitta kartada -->
  ${natijaOvqat(parhez)}

  <p class="n-eslatma">Bu tibbiy tashxis emas — kosmetologik tavsiya.<br>
    KiOVO · Better Skin, Brighter You</p>`;

  // ── Ulanishlar ──

  // Suratdagi nishonni bosish — pastdagi o'sha muammoni ochadi va
  // ko'rsatadi. «Qayerini aytyapti?» degan savol shu bilan yopiladi.
  const nishonBelgila = (tartib) => {
    $$('[data-nishon]', el).forEach((x) =>
      x.classList.toggle('tanlangan', x.dataset.nishon === String(tartib)));
    // Tanlangan belgining yonida nomi — «bu nuqta nima?» degan savol qolmasin
    const yor = $('#n-yorliq', el);
    const nq = $(`[data-nishon="${tartib}"]`, el);
    const m = muammolar.find((x) => String(x.tartib) === String(tartib));
    if (!yor || !nq || !m) { if (yor) yor.classList.remove('kor'); return; }
    // Yorliq rasmning PASTIDA turadi: belgining yonida u yuzni
    // (aynan ko'rsatilayotgan joyni) yopib qo'yardi
    yor.innerHTML = `<i class="d${Math.min(3, m.daraja || 1)}">${m.tartib}</i>
      <span><b>${esc(KALIT_NOM[m.kalit] || m.nom)}</b>${m.zona ? `<em>${esc(m.zona)}</em>` : ''}</span>`;
    yor.classList.remove('kor'); void yor.offsetWidth;
    yor.classList.add('kor');
  };
  $$('[data-nishon]', el).forEach((b) => b.onclick = () => {
    const nom = b.dataset.nishon;
    $$('details.n-muammo', el).forEach((d) => { d.open = d.dataset.muammo === nom; });
    nishonBelgila(nom);
    $(`#muammo-${nom}`, el)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titra();
  });
  $$('details.n-muammo', el).forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) nishonBelgila(d.dataset.muammo);
  }));
  nishonBelgila(1);
  el.addEventListener('belgi-kochdi', (e) => nishonBelgila(e.detail));

  const hammasi = $('#t-hammasini-och');
  if (hammasi) hammasi.onclick = () => {
    const yopiq = $$('details.n-muammo', el).some((d) => !d.open);
    $$('details.n-muammo', el).forEach((d) => { d.open = yopiq; });
    hammasi.textContent = yopiq ? 'Yopish' : 'Hammasi';
    titra();
  };

  // Qatlamlar: suratdan hisoblanadi, tayyor bo'lgani darhol ko'rinadi
  const qatlamUrl = {};
  const ust = $('.n-qatlam-ust', el), ajr = $('.n-ajratgich', el);
  const asosRasm = $('#n-yuz-media img', el);
  let tanlanganQatlam = 'asl';
  const ustniQoy = (r) => {
    if (!ust || !ajr) return;
    if (r.kalit === 'asl') { ust.hidden = true; ajr.hidden = true; return; }
    ust.hidden = false; ajr.hidden = false;
    if (qatlamUrl[r.kalit]) { ust.src = qatlamUrl[r.kalit]; ust.style.filter = ''; }
    else { ust.src = asosRasm.src; ust.style.filter = r.css; }
    $('.ong', ajr).textContent = r.nom;
  };
  if (asosRasm) {
    const boshla = () => qatlamlarniYasa(asosRasm, t.raw?.yuz_quti || null, (kalit, url) => {
      qatlamUrl[kalit] = url;
      const im = el.querySelector(`[data-qatlam-rasm="${kalit}"]`);
      if (im) { im.src = url; im.style.filter = ''; im.parentElement.classList.remove('hisoblanmoqda'); }
      if (kalit === tanlanganQatlam) ustniQoy(RENTGEN.find((x) => x.kalit === kalit));
    });
    if (asosRasm.complete && asosRasm.naturalWidth) boshla();
    else asosRasm.addEventListener('load', boshla, { once: true });
  }
  // Ajratgich: chapda asl surat, o'ngda qatlam — barmoq bilan suriladi
  const ajratQoy = (foiz) => {
    const f = Math.max(0, Math.min(100, foiz));
    if (ust) ust.style.clipPath = `inset(0 0 0 ${f}%)`;
    if (ajr) { ajr.style.left = `${f}%`; ajr.setAttribute('aria-valuenow', String(Math.round(f))); }
  };
  if (ajr) {
    ajratQoy(50);
    const quti = $('.n-yuz', el);
    const sur = (e) => {
      const q = quti.getBoundingClientRect();
      ajratQoy(((e.clientX - q.left) / q.width) * 100);
    };
    ajr.addEventListener('pointerdown', (e) => {
      e.preventDefault(); ajr.setPointerCapture(e.pointerId); ajr.classList.add('surilmoqda');
      const qimir = (ev) => sur(ev);
      const tug = () => { ajr.classList.remove('surilmoqda'); ajr.removeEventListener('pointermove', qimir); };
      ajr.addEventListener('pointermove', qimir);
      ajr.addEventListener('pointerup', tug, { once: true });
      ajr.addEventListener('pointercancel', tug, { once: true });
    });
    ajr.addEventListener('keydown', (e) => {
      const f = parseFloat(ajr.style.left) || 50;
      if (e.key === 'ArrowLeft') ajratQoy(f - 5);
      if (e.key === 'ArrowRight') ajratQoy(f + 5);
    });
  }

  $$('[data-filtr]', el).forEach((b) => b.onclick = () => {
    const r = RENTGEN.find((x) => x.kalit === b.dataset.filtr);
    if (!r) return;
    tanlanganQatlam = r.kalit;
    ustniQoy(r);
    // Yangi qatlam ochilganda ajratgich chapdan o'rtaga «ochiladi»
    if (r.kalit !== 'asl' && ust) {
      ust.animate?.([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 50%)' }],
        { duration: 650, easing: 'cubic-bezier(.3,.7,.3,1)' });
      ajratQoy(50);
    }
    // Surat ko'rinib tursin — qatlam pastda tanlanadi, natija tepada
    $('.n-yuz', el)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Qatlam almashganda lazer yana bir o'tadi — «qayta skanerlandi»
    const qt = $('.n-yuz', el);
    if (qt) { qt.classList.remove('qayta'); void qt.offsetWidth; qt.classList.add('qayta'); }
    const teg = $('#n-qatlam-teg', el);
    if (teg) teg.innerHTML = `${esc(r.nom)} <span>· ${esc(r.izoh)}</span>`;
    $$('[data-filtr]', el).forEach((x) => {
      x.classList.toggle('tanlangan', x === b);
      x.setAttribute('aria-selected', String(x === b));
    });
    titra();
  });

  $$('[data-tavsiya]', el).forEach((b) => b.onclick = (ev) => {
    ev.stopPropagation(); mahsulotOyna(Number(b.dataset.tavsiya));
  });
  const sq = $('#t-ulash2');
  if (sq) sq.onclick = () => natijaniSaqla(sq, t.id);
  const ul = $('#t-natija-ulash');
  if (ul) ul.onclick = () => natijaniUlash(ul, t.id);
  const h = $('#t-hammasi');
  if (h) h.onclick = async () => {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam', items: tavsiyalar.map((r) => ({ product_id: r.p.id, quantity: 1 })) })});
    await savatniYangila(); titra('medium'); tabOch('savat');
  };
  const a = $('#t-arzon');
  if (a) a.onclick = () => { holat.arzon = !holat.arzon; titra(); natijaniChiz(); };
  $('#t-qayta').onclick = () => { holat.natijaKorish = null; tabOch('skaner'); };
  const oxirgiga = $('#t-oxirgiga');
  if (oxirgiga) oxirgiga.onclick = () => { holat.natijaKorish = null; titra(); natijaniChiz(); scrollTo({ top: 0 }); };

  // Belgilar avval TAXMINIY joyga qo'yildi. Endi rasmda yuzni
  // haqiqatan topib, ularni o'z joyiga suramiz.
  belgilarniYuzgaQoy(el, belgili);
  nishonlarniJoyla(el);
  if (intro) ballniSana(el);
}

/** Ball 0 dan sanab chiqadi — o'lchov endi tugagandek. */
function ballniSana(el) {
  const son = el.querySelector('.n-ball .n-halqa-son');
  if (!son || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const oxir = Number(son.textContent) || 0;
  const t0 = performance.now(), dav = 1500;
  const qadam = (t) => {
    const k = Math.min(1, (t - t0) / dav);
    son.textContent = String(Math.round(oxir * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(qadam);
  };
  son.textContent = '0';
  requestAnimationFrame(qadam);
}

/* RASM KOORDINATASI → EKRAN KOORDINATASI.
 *
 * Belgilar RASMNING o'zi bo'yicha foizda keladi (AI ham, yuz aniqlagich
 * ham rasmni ko'radi). Ekranda esa surat `object-fit:cover` bilan
 * qutiga to'ldiriladi: tik selfi 4:3 qutida tepasi va pasti kesilardi,
 * belgi esa rasm foizida qo'yilgani uchun peshonadagi nuqta qoshga,
 * iyakdagi lablarga tushardi — «boshqa joyni ko'rsatyapti» degan
 * shikoyatning asosiy sababi shu edi. Endi:
 *   1. quti suratning O'Z nisbatini oladi (3:4 dan 4:3 gacha);
 *   2. har belgi kesilishni hisobga olib qutiga ko'chiriladi.
 */
function qoplamaJoy(x, y, rEn, rBoy, qEn, qBoy) {
  const k = Math.max(qEn / rEn, qBoy / rBoy);
  const w = rEn * k, h = rBoy * k;
  return {
    x: (((qEn - w) / 2 + (x / 100) * w) / qEn) * 100,
    y: (((qBoy - h) / 2 + (y / 100) * h) / qBoy) * 100,
  };
}

function nishonlarniJoyla(el) {
  const quti = el.querySelector('.n-yuz');
  const im = el.querySelector('.n-yuz-media img');
  if (!quti || !im) return;
  let tortildi = false;
  const ishla = () => {
    const rEn = im.naturalWidth, rBoy = im.naturalHeight;
    if (!rEn || !rBoy) return;
    if (!tortildi) { tortildi = true; terigaTort(im, quti, el); }
    quti.style.aspectRatio = String(Math.min(4 / 3, Math.max(3 / 4, rEn / rBoy)));
    const { width: qEn, height: qBoy } = quti.getBoundingClientRect();
    if (!qEn || !qBoy) return;
    $$('.n-nishon', quti).forEach((nq) => {
      const p = qoplamaJoy(Number(nq.dataset.x), Number(nq.dataset.y), rEn, rBoy, qEn, qBoy);
      const y = Math.max(4, Math.min(96, p.y));
      nq.style.left = `${Math.max(4, Math.min(96, p.x)).toFixed(2)}%`;
      nq.style.top = `${y.toFixed(2)}%`;
      // Lazer chizig'i shu joydan o'tganda belgi «topiladi»
      nq.style.setProperty('--kech', `${(0.35 + (y / 100) * 1.9).toFixed(2)}s`);
    });
    // Yuz ramkasi — AI bergan yuz qutisi (bo'lmasa taxminiy)
    let yq = null;
    try { yq = quti.dataset.yuz ? JSON.parse(quti.dataset.yuz) : null; } catch {}
    const q = yq || YUZ_TAXMIN;
    const a = qoplamaJoy(q.x, q.y, rEn, rBoy, qEn, qBoy);
    const b = qoplamaJoy(q.x + q.en, q.y + q.boy, rEn, rBoy, qEn, qBoy);
    const ramka = $('.n-ramka', quti);
    if (ramka) Object.assign(ramka.style, {
      left: `${Math.max(1, a.x)}%`, top: `${Math.max(1, a.y)}%`,
      width: `${Math.min(98, b.x) - Math.max(1, a.x)}%`, height: `${Math.min(98, b.y) - Math.max(1, a.y)}%`,
    });
    // Ro'yxatdagi kattalashtirilgan bo'lak: AYNAN o'sha nuqta markazda
    $$('[data-kesim]', el).forEach((k) => {
      const T = k.offsetWidth || 64, Z = 3.4;
      const W = rEn >= rBoy ? T * Z * (rEn / rBoy) : T * Z;
      const H = rEn >= rBoy ? T * Z : T * Z * (rBoy / rEn);
      const bx = Math.min(0, Math.max(T - W, T / 2 - (Number(k.dataset.x) / 100) * W));
      const by = Math.min(0, Math.max(T - H, T / 2 - (Number(k.dataset.y) / 100) * H));
      k.style.backgroundSize = `${W.toFixed(1)}px ${H.toFixed(1)}px`;
      k.style.backgroundPosition = `${bx.toFixed(1)}px ${by.toFixed(1)}px`;
    });
    quti.classList.add('joylandi');
  };
  el._joyla = ishla;
  if (im.complete && im.naturalWidth) ishla();
  else im.addEventListener('load', ishla, { once: true });
  // Kesim bo'laklari yopiq <details> ichida — ochilganda o'lchami bor
  $$('details.n-muammo', el).forEach((d) => d.addEventListener('toggle', () => d.open && ishla()));
}
window.addEventListener('resize', () => $('#natija-tan')?._joyla?.());

/* BELGI TERIDA BO'LSIN.
 *
 * AI nuqtasi ba'zan bir necha foizga adashadi va sochga, ko'zga yoki
 * fonga tushadi. Rasmning o'zidan teri rangini (YCbCr oralig'i) tekshirib,
 * teri bo'lmagan joydagi belgini YUZ ICHIDAGI eng yaqin teri nuqtasiga
 * suramiz. Fondagi devor ham teri rangida bo'lishi mumkin — shuning uchun
 * qidiruv yuz qutisi bilan cheklangan.
 */
function terigaTort(im, quti, el) {
  let yuz = null;
  try { yuz = quti.dataset.yuz ? JSON.parse(quti.dataset.yuz) : null; } catch {}
  let d, EN, BOY;
  try {
    EN = 220; BOY = Math.max(1, Math.round(im.naturalHeight * EN / im.naturalWidth));
    const c = document.createElement('canvas');
    c.width = EN; c.height = BOY;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, EN, BOY);
    d = x.getImageData(0, 0, EN, BOY).data;
  } catch { return; }
  const teri = (px, py) => {
    let n = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const X = Math.min(EN - 1, Math.max(0, px + ox)), Y = Math.min(BOY - 1, Math.max(0, py + oy));
      const i = (Y * EN + X) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      const yy = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      if (yy > 45 && yy < 245 && cr >= 135 && cr <= 180 && cb >= 80 && cb <= 130) n++;
    }
    return n >= 6;
  };
  // Qidiruv chegarasi: yuz qutisi (+zaxira) yoki nuqta atrofi
  const ch = yuz ? {
    x0: (yuz.x - yuz.en * 0.04) / 100 * EN, x1: (yuz.x + yuz.en * 1.04) / 100 * EN,
    y0: (yuz.y) / 100 * BOY, y1: (yuz.y + yuz.boy * 1.02) / 100 * BOY,
  } : null;
  const R = Math.round(EN * (yuz ? 0.09 : 0.05));
  let kochdi = false;
  $$('.n-nishon', quti).forEach((nq) => {
    const px = Math.round(Number(nq.dataset.x) / 100 * EN), py = Math.round(Number(nq.dataset.y) / 100 * BOY);
    if (!Number.isFinite(px) || !Number.isFinite(py) || teri(px, py)) return;
    let eng = null;
    for (let r = 2; r <= R && !eng; r += 2) {
      for (let a = 0; a < 16; a++) {
        const qx = Math.round(px + Math.cos(a / 16 * Math.PI * 2) * r);
        const qy = Math.round(py + Math.sin(a / 16 * Math.PI * 2) * r);
        if (ch && (qx < ch.x0 || qx > ch.x1 || qy < ch.y0 || qy > ch.y1)) continue;
        if (qx < 0 || qy < 0 || qx >= EN || qy >= BOY) continue;
        if (teri(qx, qy)) { eng = { x: qx, y: qy }; break; }
      }
    }
    if (!eng) return;                       // teri topilmadi — joyida qoladi
    const nx = Math.round(eng.x / EN * 1000) / 10, ny = Math.round(eng.y / BOY * 1000) / 10;
    nq.dataset.x = nx; nq.dataset.y = ny;
    const kes = el.querySelector(`[data-kesim="${nq.dataset.nishon}"]`);
    if (kes) { kes.dataset.x = nx; kes.dataset.y = ny; }
    kochdi = true;
  });
  return kochdi;
}

/* Muammo belgilarini RASMDAGI yuzga moslashtirish.
 *
 * Shikoyat aniq edi: «diagnoz qo'yganda sochimni belgilayapti».
 * Sabab — belgilar rasmning o'rtasiga nisbatan qo'yilardi, yuzga
 * emas. Rasm serverda saqlanadi va ilova uni qayta o'lchay oladi,
 * shuning uchun tahlil ESKI bo'lsa ham belgilar to'g'rilanadi.
 *
 * Yuz topilmasa hech narsa o'zgarmaydi — taxminiy joy qoladi.
 */
function belgilarniYuzgaQoy(el, belgilar) {
  const im = el.querySelector('.n-yuz-media img');
  if (!im || !belgilar.length) return;
  kaskadniYukla();

  // Hammasining aniq nuqtasi bo'lsa — yuzni qidirish ham shart emas
  if (belgilar.every((m) => m.nuqta && Number.isFinite(m.nuqta.x))) return;
  const ishla = () => {
    if (kaskadHolat === 'yuklanmoqda') { setTimeout(ishla, 150); return; }
    if (kaskadHolat !== 'tayyor' || !window.Yuz || !im.naturalWidth) return;

    let q = null;
    try {
      const EN = 300;
      const BOY = Math.max(1, Math.round(im.naturalHeight * EN / im.naturalWidth));
      const c = document.createElement('canvas');
      c.width = EN; c.height = BOY;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0, EN, BOY);
      const d = x.getImageData(0, 0, EN, BOY);
      const yuz = Yuz.yuzniTop(Sifat.kulrang(d.data, EN, BOY), EN, BOY, window.YUZ_KASKAD);
      if (yuz) {
        q = { x: (yuz.x / EN) * 100, y: (yuz.y / BOY) * 100,
              en: (yuz.en / EN) * 100, boy: (yuz.boy / BOY) * 100 };
      }
    } catch { return; }                  // boshqa domendagi rasm — o'qib bo'lmaydi
    if (!q) return;

    const nishonlar = el.querySelectorAll('.n-nishon');
    const olingan = [];
    belgilar.forEach((m, i) => {
      // AI o'zi aniq nuqta bergan bo'lsa — u rasmni ko'rgan, tegilmaydi
      if (m.nuqta && Number.isFinite(m.nuqta.x)) { olingan.push(m.joy); return; }
      let joy = zonaJoyi(m.zona || m.nom, i, q);
      // Ikki belgi bir joyga tushsa biri ko'rinmay qoladi — ularni
      // ajratamiz, aks holda odam bittasini butunlay ko'rmaydi
      joy = joyniAjrat(joy, olingan);
      olingan.push(joy);
      m.joy = joy;
      const nq = nishonlar[i];
      if (nq) { nq.dataset.x = joy.x; nq.dataset.y = joy.y; }
      // Ro'yxatdagi kattalashtirilgan bo'lak ham o'sha joyga qarasin
      const kes = el.querySelector(`[data-kesim="${m.tartib}"]`);
      if (kes) { kes.dataset.x = joy.x; kes.dataset.y = joy.y; }
    });
    el._joyla?.();
    const tanl = el.querySelector('.n-nishon.tanlangan');
    if (tanl) el.dispatchEvent(new CustomEvent('belgi-kochdi', { detail: tanl.dataset.nishon }));
  };

  if (im.complete && im.naturalWidth) ishla();
  else im.addEventListener('load', ishla, { once: true });
}

/**
 * Ustma-ust tushgan belgilarni ajratadi.
 *
 * AI ba'zan ikki muammoni bir zonaga bog'laydi («yonoq» va «yonoq
 * yuqorisi»). Belgilar bir nuqtaga tushsa, ikkinchisi birinchisining
 * tagida qolib ketadi va odam uni umuman ko'rmaydi. Shuning uchun
 * band joyga tushgan belgi kichik doira bo'ylab siljitiladi.
 */
function joyniAjrat(joy, olingan, eng_kam = 9) {
  const uzoqmi = (p) => olingan.every((o) =>
    Math.hypot(o.x - p.x, o.y - p.y) >= eng_kam);
  if (uzoqmi(joy)) return joy;
  for (let halqa = 1; halqa <= 3; halqa++) {
    const r = eng_kam * halqa;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + halqa;
      const p = {
        x: Math.max(6, Math.min(94, Math.round(joy.x + Math.cos(a) * r))),
        y: Math.max(6, Math.min(94, Math.round(joy.y + Math.sin(a) * r * 0.8))),
      };
      if (uzoqmi(p)) return p;
    }
  }
  return joy;
}

/** Ovqat: ikki qarama-qarshi panel — yashil «mumkin», qizil «yo'q». */
/**
 * Yig'ma natija kartasi — sarlavha qatori ko'rinadi, ichi bosilganda
 * ochiladi. Natija sahifasi uzun edi: hamma bo'lim ochiq turgani uchun
 * odam eng muhimini (ko'rsatkichlar, muammolar) topish uchun uzoq surardi.
 */
const yigmaKarta = (sinf, ikon, sarlavha, izoh, ich) => `
  <details class="n-yigma ${sinf}">
    <summary>
      <span class="n-yigma-belgi">${ik(ikon, 18)}</span>
      <span class="n-yigma-nom"><b>${sarlavha}</b>${izoh ? `<small>${izoh}</small>` : ''}</span>
      <i class="n-ochish" aria-hidden="true"></i>
    </summary>
    <div class="n-yigma-ich">${ich}</div>
  </details>`;

/** Ovqatlanish — BITTA karta, eng pastda: tepada «yeng», ostida «kamaytiring». */
function natijaOvqat(parhez) {
  const foydali = (parhez.foydali || []).slice(0, 5);
  const cheklang = (parhez.cheklang || []).slice(0, 5);
  if (!foydali.length && !cheklang.length) return '';
  const qism = (band, tur, sarlavha, belgi) => band.length ? `
    <div class="n-ovqat ${tur}">
      <h4>${ik(belgi, 16)}${sarlavha}</h4>
      <ul>${band.map((b) => {
        const o = ovqatBandi(b);
        return `<li><i>${ik(tur === 'yaxshi' ? 'tasdiq' : 'yopish', 13)}</i>
          <span><b>${esc(o.nom)}</b>${o.sabab ? `<small>${esc(o.sabab)}</small>` : ''}</span></li>`;
      }).join('')}</ul>
    </div>` : '';
  return yigmaKarta('n-ovqat-karta', 'barg', 'Ovqatlanish',
    `${foydali.length} ta foydali · ${cheklang.length} ta cheklang`, `
    ${qism(foydali, 'yaxshi', 'Ko‘proq yeng', 'tasdiq')}
    ${qism(cheklang, 'yomon', 'Kamaytiring', 'ogoh')}
    ${parhez.izoh ? `<p class="n-ovqat-izoh">${ik('tomchi', 14)}${esc(parhez.izoh)}</p>` : ''}`);
}

/** Mahsulotlar: tartib raqami bilan, yon tomonga siriladi. */
function natijaTavsiya(tavsiyalar, jami, tejash, arzonBor) {
  if (!tavsiyalar.length) return '';
  return `
  <section class="n-karta">
    <h3 class="n-karta-bosh">Sizga mos mahsulotlar
      <span class="n-izoh">${tavsiyalar.length} ta</span></h3>
    <div class="n-mahsulotlar">
      ${tavsiyalar.map((r, i) => `
        <button class="n-mahsulot" data-tavsiya="${r.p.id}">
          <span class="n-raqam bosqich">${i + 1}</span>
          <span class="nm-rasm">
            ${r.p.poster_id ? `<img src="/media/${esc(r.p.poster_id)}?w=240" alt="" loading="lazy">`
                            : ik('shisha', 30)}
          </span>
          <span class="nm-bosqich">${esc(BOSQICH[r.bosqich] || r.bosqich)}</span>
          <span class="nm-nom">${esc(nomi(r.p))}${r.p.dona_soni > 1 ? ` <em class="nm-dona">${r.p.dona_soni} dona</em>` : ''}</span>
          <span class="nm-narx">${narx(r.p.price)}${eskiNarx(r.p)}</span>
        </button>`).join('')}
    </div>
    <div class="n-jami"><span>To‘liq to‘plam</span><b>${narx(jami)}</b></div>
    ${holat.arzon && tejash ? `<div class="n-tejash">${ik('tasdiq',15)}
      <b>${narx(tejash)}</b> tejaysiz</div>` : ''}
    <button class="asosiy" id="t-hammasi" style="margin-top:12px">
      ${ik('savat',18)}Hammasini savatga solish</button>
    ${arzonBor || holat.arzon ? `
      <button class="ikkilamchi" id="t-arzon" style="margin-top:9px">
        ${ik('almash',18)}${holat.arzon ? 'Asl tavsiyani ko‘rsatish' : 'Arzonroq variant'}</button>` : ''}
  </section>`;
}

/** Kundalik tartib — ertalab va kechqurun, ko'k panelda. */
const ERTALAB  = new Set(['tozalash', 'toner', 'namlash', 'himoya']);
const KECHASI  = new Set(['tozalash', 'toner', 'davolash', 'namlash', 'qoshimcha']);

function natijaParvarish(tavsiyalar) {
  if (!tavsiyalar.length) return '';
  const ustun = (kimlar, nom, belgi) => {
    const royxat = tavsiyalar.filter((r) => kimlar.has(r.bosqich));
    if (!royxat.length) return '';
    return `<div class="n-vaqt">
      <h4>${belgi}${nom}</h4>
      <ol>${royxat.map((r) => `<li><b>${esc(BOSQICH[r.bosqich] || r.bosqich)}</b>
        <span>${esc(nomi(r.p))}</span></li>`).join('')}</ol>
    </div>`;
  };
  return yigmaKarta('n-kok', 'soat', 'Har kuni shunday qiling', 'ertalab va kechqurun tartibi', `
    <div class="n-vaqtlar">
      ${ustun(ERTALAB, 'Ertalab', ik('quyosh', 16))}
      ${ustun(KECHASI, 'Kechqurun', ik('oy', 16))}
    </div>
    <p class="n-oyoq">Natija 4-8 haftada ko‘rinadi.</p>`);
}

/** E'tibor bermasangiz nima bo'ladi — sariq panel. */
function natijaPrognoz(t) {
  const prognoz = [...(t.forecast || [])].sort((a, b) => b.ehtimol - a.ehtimol).slice(0, 3);
  if (!prognoz.length) return '';
  return yigmaKarta('n-sariq', 'ogoh', 'E’tibor bermasangiz', `${prognoz.length} ta ehtimol`, `
    ${prognoz.map((p) => `
      <div class="n-prognoz">
        <span class="n-prognoz-nom">${esc(p.muammo)}</span>
        <b>${p.ehtimol}%</b>
        <span class="n-chiziq"><i class="yomon" style="width:${p.ehtimol}%"></i></span>
        <em>${esc(p.muddat || '')}${p.muddat ? ' — ' : ''}${esc(p.natija)}</em>
      </div>`).join('')}
    <p class="n-oyoq">Bu ehtimollik bahosi, tibbiy tashxis emas.</p>`);
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

/**
 * «Saqlash» — natija rasmi telefon GALEREYASIGA tushadi.
 *
 * Android ilovada va brauzerda — oddiy fayl yuklash: Android uni
 * «Download» albomiga qo'yadi, galereya darhol ko'rsatadi. Telegram
 * ichida yangi mijozlarda `downloadFile` (Telegram o'zi so'raydi va
 * saqlaydi), eskilarida — rasm chatga yuboriladi.
 */
async function natijaniSaqla(tugma, analysisId) {
  // downloadFile Telegram 8.0 dan: eski mijozda funksiya bor, lekin ishlamaydi
  const tgYuklay = typeof tg?.downloadFile === 'function' && tg?.isVersionAtLeast?.('8.0');
  if (tg?.initData && !tgYuklay) return natijaniTelegramgaYubor(tugma, analysisId);
  const eski = tugma.innerHTML;
  tugma.disabled = true;
  tugma.innerHTML = `<span class="aylana kichik"></span>Tayyorlanmoqda…`;
  try {
    const { url, fayl } = await api('/api/natija-havola', {
      method: 'POST', body: JSON.stringify({ analysis_id: analysisId || null }) });
    const toliq = new URL(url, location.origin).href;
    if (tg?.initData) {
      tg.downloadFile({ url: toliq, file_name: fayl }, (ok) => { if (ok) tost('Rasm saqlanmoqda'); });
    } else {
      const a = document.createElement('a');
      a.href = toliq; a.download = fayl; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      tost('Galereyaga saqlandi');
    }
    titra('medium');
    tugma.innerHTML = `${ik('tasdiq', 17)}Saqlandi`;
    setTimeout(() => { tugma.innerHTML = eski; }, 3500);
  } catch (e) {
    ogohlantir(e.message || 'Saqlab bo‘lmadi.');
    tugma.innerHTML = eski;
  } finally {
    tugma.disabled = false;
  }
}

/** Ulashish: rasm FAYL bo'lib boradi (Instagram, Telegram, galereya). */
async function natijaniUlash(tugma, analysisId) {
  tugma.disabled = true;
  try {
    const { url, fayl } = await api('/api/natija-havola', {
      method: 'POST', body: JSON.stringify({ analysis_id: analysisId || null }) });
    const blob = await (await fetch(url)).blob();
    const f = new File([blob], fayl, { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'Teri tahlilim — KiOVO' });
    else await navigator.share({ title: 'Teri tahlilim — KiOVO', url: location.origin + '/' });
  } catch (e) {
    if (e?.name !== 'AbortError') ogohlantir(e.message || 'Ulashib bo‘lmadi.');
  } finally { tugma.disabled = false; }
}

async function natijaniTelegramgaYubor(tugma, analysisId) {
  const eski = tugma.textContent;
  tugma.disabled = true;
  tugma.textContent = 'Yuborilmoqda…';
  try {
    await api('/api/natija-yubor', {
      method: 'POST',
      body: JSON.stringify({ analysis_id: analysisId || holat.tahlil?.id || null }),
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
          <div class="savat-narx">${narx(t.p.price)}${eskiNarx(t.p)}</div>
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
          ${p.variant_nom ? `<span class="savat-variant">${p.rang_hex ? `<i style="background:${esc(p.rang_hex)}"></i>` : ''}${esc(p.variant_nom)}</span>` : ''}
          <div class="savat-brend">${esc(p.brand || '')}${p.volume && p.variant_tur !== 'hajm' ? ' · ' + esc(p.volume) : ''}${
            p.dona_soni > 1 ? ` · ${p.dona_soni} dona` : ''}</div>
          <div class="savat-past">
            <span class="soni">
              <button data-kam="${p.id}" aria-label="Kamaytirish">−</button>
              <span>${quantity}</span>
              <button data-kop="${p.id}" aria-label="Ko‘paytirish">+</button>
            </span>
            <span class="savat-narx">${qisqaNarx(p.price * quantity)} so‘m${p.old_price > p.price
              ? `<s class="eski-narx">${qisqaNarx(p.old_price * quantity)}</s>` : ''}</span>
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
      <input id="b-tel" type="tel" inputmode="tel" placeholder="+998 90 123 45 67"
        value="${esc(d.phone || holat.user?.phone || '')}">

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
  const telTozalangan = raqamTozala(tana.phone);
  if (!telTozalangan) {
    return xato.textContent = 'Telefon raqamini tekshiring. Chet el raqami '
                            + 'bo‘lsa mamlakat kodi bilan: +82 10 1234 5678';
  }
  tana.phone = telTozalangan;
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
      ${pushBormi() && Notification.permission === 'default' ? `
        <div class="push-taklif" id="push-taklif">
          <span class="b">${ik('qongiroq', 20)}</span>
          <span><b>Holatini o‘tkazib yubormang</b>
            <small>To‘lov tasdiqlansa va buyurtma yo‘lga chiqsa — telefoningizga xabar</small></span>
          <button class="ikkilamchi" id="t-push-yoq">Yoqish</button>
        </div>` : ''}
      <button class="asosiy" id="t-tayyor" style="margin-top:18px">Yaxshi</button>
    </div>`;
  modalOch();
  $('#t-push-yoq') && ($('#t-push-yoq').onclick = async () => {
    try {
      await pushniYoq();
      $('#push-taklif').innerHTML = `<span class="b">${ik('tasdiq', 20)}</span>
        <span><b>Yoqildi</b><small>Buyurtma holati telefoningizga keladi</small></span>`;
      titra('medium');
    } catch (e) { ogohlantir(e.message); }
  });
  $('#t-tayyor').onclick = () => {
    modalYop(); tabOch('profil'); profilBolimOch('buyurtma');
  };
}

// ---------------- Bildirishnomalar (push) ----------------
// Google yoki telefon bilan kirgan odamning Telegrami yo'q: buyurtma
// holatini u faqat shu yo'l bilan biladi. Telegram ichida ko'rsatilmaydi
// — u yerda xabarni bot yuboradi.
const pushBormi = () => !tg?.initData && 'serviceWorker' in navigator
  && 'PushManager' in window && 'Notification' in window;
const pushYoqiqmi = () => pushBormi() && Notification.permission === 'granted'
  && localStorage.getItem('kiovo_push') === '1';

const kalitBayt = (b64) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64.length % 4) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const swTayyor = () => Promise.race([navigator.serviceWorker.ready,
  new Promise((_, rad) => setTimeout(() => rad(new Error('Ilova hali yuklanmoqda — birozdan keyin urining.')), 8000))]);

/** Obuna — server kaliti o'zgargan bo'lsa yangisi olinadi. */
async function pushObuna({ sinov = false } = {}) {
  const { kalit } = await api('/api/push/kalit');
  const r = await swTayyor();
  let ob = await r.pushManager.getSubscription();
  const bor = ob?.options?.applicationServerKey;
  if (ob && bor && new Uint8Array(bor).join() !== kalitBayt(kalit).join()) { await ob.unsubscribe(); ob = null; }
  if (!ob) ob = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kalitBayt(kalit) });
  await api('/api/push/obuna', { method: 'POST', body: JSON.stringify({ obuna: ob.toJSON(), sinov }) });
  try { localStorage.setItem('kiovo_push', '1'); } catch {}
}

async function pushniYoq() {
  const ruxsat = await Notification.requestPermission();
  if (ruxsat !== 'granted') {
    throw new Error(ruxsat === 'denied'
      ? 'Bildirishnomalar telefon sozlamalarida o‘chirilgan: Sozlamalar → Ilovalar → KiOVO → Bildirishnomalar.'
      : 'Ruxsat berilmadi.');
  }
  await pushObuna({ sinov: true });
}

async function pushniOchir() {
  try { localStorage.removeItem('kiovo_push'); } catch {}
  if (!pushBormi()) return;
  const ob = await (await swTayyor()).pushManager.getSubscription().catch(() => null);
  if (!ob) return;
  await api('/api/push/bekor', { method: 'POST', body: JSON.stringify({ endpoint: ob.endpoint }) }).catch(() => {});
  await ob.unsubscribe().catch(() => {});
}

/** Har ochilishda jimgina: obuna serverda borligini tasdiqlaydi. */
function pushniYangila() {
  if (pushYoqiqmi()) pushObuna().catch(() => {});
}

/** Bildirishnoma bosilganda yoki yorliqdan: `?tab=…&bolim=…` ni ochadi. */
function havolaniOch(havola) {
  let p;
  try { p = new URL(havola, location.origin).searchParams; } catch { return; }
  modalYop();
  tabOch(p.get('tab') || 'katalog');
  const bolim = p.get('bolim');
  // Profil bo'limi o'z ekranida ochiladi (buyurtmalar, natijalar...)
  if (bolim && (p.get('tab') || '') === 'profil') requestAnimationFrame(() => {
    if (!profilBolimlar[bolim]) profilniChiz();
    if (profilBolimlar[bolim]) profilBolimOch(bolim);
  });
}
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.tur === 'bildirishnoma') havolaniOch(e.data.havola);
});

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
  $('#profil-tel').textContent = u.phone ? raqamFormat(u.phone)
    : (u.email || (tgU.username ? '@' + tgU.username : ''));
  $('#profil-stat').innerHTML = `
    <div data-natijalar="1"><b>${st.tahlil ?? 0}</b><span>AI tahlil</span></div>
    <div data-sevimli="1"><b>${st.sevimli ?? holat.sevimlilar.size}</b><span>Sevimlilar</span></div>
    <div data-buyurtmalar="1"><b>${st.buyurtma ?? 0}</b><span>Buyurtmalar</span></div>`;

  const m = holat.menejer || {};
  const tgNom = String(holat.konsultatsiya || '').replace(/^@/, '');
  const tel = String(m.telefon || '');
  const teriNom = TERI_NOM;

  // Har bo'lim — ro'yxatdagi QATOR. Bosilganda o'z ekranida ochiladi
  // (haqiqiy ilovalardagidek), joyida ochilib-yopilmaydi.
  profilBolimlar = {};
  const qator = (id, ikon, nom, qiymat, ich, ula, { xavf = false } = {}) => {
    profilBolimlar[id] = { nom, ich, ula };
    return `
    <button class="sozlama-qator${xavf ? ' xavf' : ''}" data-bolim="${id}">
      <span class="b">${ik(ikon, 19)}</span><span class="nom">${esc(nom)}</span>
      ${qiymat ? `<span class="qiy">${esc(qiymat)}</span>` : ''}
      <span class="oq">${ik('keyingi', 17, 2)}</span>
    </button>`;
  };
  const sozGuruh = (sarlavha, qatorlar) => `
    <div class="sozlama-guruh"><h3>${esc(sarlavha)}</h3><div class="sozlama-ro">${qatorlar}</div></div>`;

  // Saqlash: server → holat → ro'yxat qayta chiziladi, ekran yopiladi
  const saqla = async (tan, { yop = true } = {}) => {
    try {
      const j = await api('/api/profil', { method: 'POST', body: JSON.stringify(tan) });
      holat.user = { ...holat.user, ...j.user };
      menikiSaqla();
      titra('medium'); profilniChiz();
      if (yop) { tost('Saqlandi'); sahifaYop(); }
      return true;
    } catch (e) { ogohlantir(e.message); return false; }
  };

  const shaxsiy = qator('shaxsiy', 'profil', 'Shaxsiy ma’lumot', ism || '', () => `
    <div class="sahifa-karta">
      <label for="p-ism">Ism familiya</label>
      <input id="p-ism" type="text" value="${esc((holat.user?.full_name || '').trim())}" placeholder="Aliyeva Malika">
      <label for="p-yosh">Yosh</label>
      <input id="p-yosh" type="number" inputmode="numeric" min="12" max="90"
             value="${holat.user?.age || ''}" placeholder="24">
      <label>Telefon</label>
      <input type="tel" value="${esc(holat.user?.phone || '')}" disabled>
      <div class="ozgina" style="margin-top:6px">Telefonni o‘zgartirish uchun botga yozing.</div>
    </div>
    <div class="sahifa-pastki"><button class="asosiy" id="t-shaxsiy-saqla">Saqlash</button></div>`,
  (t) => { $('#t-shaxsiy-saqla', t).onclick = () => saqla({
    full_name: $('#p-ism', t).value, age: $('#p-yosh', t).value }); });

  const teriB = qator('teri', 'tomchi', 'Terim va sog‘liq', teriNom[u.teri_turi] || '', () => `
    <div class="sahifa-izoh">${ik('qalqon', 16)}Bu ma’lumot AI tavsiyasiga ta’sir qiladi: sizga
      to‘g‘ri kelmaydigan mahsulot tavsiya qilinmaydi.</div>
    <div class="sahifa-karta">
      <label>Teri turi</label>
      <div class="tanlov-chiplar" id="p-teri">
        ${['','quruq','yogli','aralash','normal','sezgir'].map((x) => `
          <button data-teri="${x}" class="${(holat.user?.teri_turi || '') === x ? 'tanlangan' : ''}">${
            x ? teriNom[x] : 'Bilmayman'}</button>`).join('')}
      </div>
      <label for="p-allergiya">Allergiya</label>
      <textarea id="p-allergiya" placeholder="Masalan: asal, yong‘oq, atir hidi">${esc(holat.user?.allergiya || '')}</textarea>
      <label for="p-kasallik">Surunkali kasallik yoki teri kasalligi</label>
      <textarea id="p-kasallik" placeholder="Masalan: ekzema, rozatsea, qalqonsimon bez">${esc(holat.user?.kasallik || '')}</textarea>
    </div>
    <div class="sahifa-pastki"><button class="asosiy" id="t-teri-saqla">Saqlash</button></div>`,
  (t) => {
    let teri = holat.user?.teri_turi || '';
    $$('#p-teri [data-teri]', t).forEach((b) => b.onclick = () => {
      teri = b.dataset.teri;
      $$('#p-teri [data-teri]', t).forEach((x) => x.classList.toggle('tanlangan', x === b));
      titra();
    });
    $('#t-teri-saqla', t).onclick = () => saqla({
      teri_turi: teri, allergiya: $('#p-allergiya', t).value, kasallik: $('#p-kasallik', t).value });
  });

  const manzilIch = () => {
    const x = holat.user || {};
    return `
    <div class="sahifa-izoh">${ik('joy', 16)}Buyurtma berishda shu manzil tayyor turadi.</div>
    <div class="sahifa-karta">
      <label>Viloyat</label>
      <button class="tanlov-tugma" id="p-viloyat">
        <span>${esc(x.viloyat || 'Tanlang')}</span><span class="oq">${ik('keyingi', 17)}</span></button>
      <label>Tuman</label>
      <button class="tanlov-tugma" id="p-tuman" ${x.viloyat ? '' : 'disabled'}>
        <span>${esc(x.tuman || (x.viloyat ? 'Tanlang' : 'Avval viloyatni tanlang'))}</span>
        <span class="oq">${ik('keyingi', 17)}</span></button>
      <label for="p-kocha">Ko‘cha, uy, xonadon</label>
      <textarea id="p-kocha" placeholder="Bunyodkor ko‘chasi 12-uy, 45-xonadon">${esc(x.address || '')}</textarea>
    </div>
    <div class="sahifa-pastki"><button class="asosiy" id="t-manzil-saqla">Saqlash</button></div>`;
  };
  const manzilUla = (t) => {
    const x = () => holat.user || {};
    // Viloyat/tuman tanlansa ekran joyida yangilanadi (yopilmaydi)
    const qayta = () => { t.innerHTML = manzilIch(); manzilUla(t); };
    $('#p-viloyat', t).onclick = () => royxatOyna(
      'Viloyatni tanlang', window.VILOYATLAR || [], x().viloyat || '',
      async (tanlangan) => {
        // Viloyat o'zgarsa tuman bekor bo'ladi: "Buxoro viloyati / Chilonzor
        // tumani" kabi mos kelmaydigan juftlik chiqmasin
        if (await saqla({ viloyat: tanlangan, tuman: '', address: $('#p-kocha', t)?.value || '' }, { yop: false })) qayta();
      });
    $('#p-tuman', t).onclick = () => {
      if (!x().viloyat) return;
      royxatOyna('Tumanni tanlang', window.tumanlarniOl(x().viloyat), x().tuman || '',
        async (tanlangan) => {
          if (await saqla({ viloyat: x().viloyat, tuman: tanlangan, address: $('#p-kocha', t)?.value || '' }, { yop: false })) qayta();
        });
    };
    $('#t-manzil-saqla', t).onclick = () =>
      saqla({ viloyat: x().viloyat || '', tuman: x().tuman || '', address: $('#p-kocha', t).value });
  };
  const manzil = qator('manzil', 'joy', 'Manzilim',
    u.viloyat ? u.viloyat.replace(/ (viloyati|shahri|Respublikasi)$/, '') : '', manzilIch, manzilUla);

  const sevimli = qator('sevimli', 'yurak', 'Sevimlilar', String(st.sevimli ?? holat.sevimlilar.size),
    () => `<div id="sevimli-tan"></div>`,
    (t) => {
      const q = $('#sevimli-tan', t);
      const royxat = holat.mahsulotlar.filter((x) => holat.sevimlilar.has(x.id));
      q.innerHTML = royxat.length
        ? `<div class="sevimli-tor">${royxat.map(kartaHtml).join('')}</div>`
        : `<div class="bosh-holat"><div class="belgi">${ik('yurak', 40)}</div>
             <p>Hali sevimli mahsulot yo‘q</p><span class="ozgina">Katalogda yurakchani bosing.</span></div>`;
      $$('.mahsulot', q).forEach((el) => el.onclick = (e) => kartaBosildi(e, el));
    });

  const natijalar = qator('natijalar', 'skaner', 'Natijalarim', String(st.tahlil ?? 0),
    () => `<div id="natija-tarix"></div>`, () => natijaTarixiniChiz());

  const buyurtmalar = qator('buyurtma', 'quti', 'Buyurtmalarim', String(st.buyurtma ?? 0),
    () => `<div id="buyurtma-tan"></div>`, () => buyurtmalarniChiz());

  const bildirish = pushBormi() ? qator('bildirish', 'qongiroq', 'Bildirishnomalar',
    pushYoqiqmi() ? 'Yoqiq' : 'O‘chiq', () => `
    <div class="sahifa-karta sozlama-almash">
      <div><b>Buyurtma holati</b>
        <span>To‘landi, yo‘lga chiqdi, yetib keldi — telefoningizga keladi. Reklama yuborilmaydi.</span></div>
      <button class="almash ${pushYoqiqmi() ? 'yoqiq' : ''}" id="t-push" role="switch"
        aria-checked="${pushYoqiqmi()}" aria-label="Bildirishnomalar"><i></i></button>
    </div>`,
    (t) => { $('#t-push', t).onclick = async () => {
      const b = $('#t-push', t); b.disabled = true;
      try {
        if (pushYoqiqmi()) await pushniOchir(); else await pushniYoq();
        titra('medium');
      } catch (e) { ogohlantir(e.message); }
      b.disabled = false;
      b.classList.toggle('yoqiq', pushYoqiqmi());
      b.setAttribute('aria-checked', String(pushYoqiqmi()));
      profilniChiz();
    }; }) : '';

  const korinish = qator('korinish', 'quyosh', 'Ko‘rinish',
    MAVZULAR.find((x) => x.kalit === mavzuOqi())?.nom || 'Tizim', () => `
    <div class="sahifa-izoh">${ik('oy', 16)}Tungi ko‘rinish kechqurun ko‘zni charchatmaydi.
      «Tizim» telefon sozlamasiga ergashadi.</div>
    <div class="korinish-tanlov" id="p-korinish">
      ${MAVZULAR.map((x) => `
        <button data-mavzu="${x.kalit}" class="${mavzuOqi() === x.kalit ? 'tanlangan' : ''}">
          ${ik(x.ik, 22)}<span>${esc(x.nom)}</span></button>`).join('')}
    </div>`,
    (t) => $$('#p-korinish [data-mavzu]', t).forEach((b) => b.onclick = () => {
      mavzuniQoy(b.dataset.mavzu);
      $$('#p-korinish [data-mavzu]', t).forEach((x) => x.classList.toggle('tanlangan', x === b));
      profilniChiz();
      titra();
    }));

  const aloqa = qator('aloqa', 'suhbat', 'Aloqa va yordam', '', () => `
    <div class="sozlama-ro">
      ${tgNom ? `<a class="sozlama-qator" href="https://t.me/${esc(tgNom)}" target="_blank">
        <span class="b">${ik('telegram', 19)}</span><span class="nom">Konsultatsiya
        ${m.ish_vaqti ? `<small>${esc(m.ish_vaqti)}</small>` : ''}</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></a>` : ''}
      ${tel ? `<a class="sozlama-qator" href="tel:${esc(tel.replace(/[^+\d]/g, ''))}">
        <span class="b">${ik('telefon', 19)}</span><span class="nom">${esc(tel)}</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></a>` : ''}
      <button class="sozlama-qator" id="t-profil-yordam">
        <span class="b">${ik('savol', 19)}</span><span class="nom">Tez-tez so‘raladigan savollar</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></button>
      <a class="sozlama-qator" href="/oferta" target="_blank">
        <span class="b">${ik('hujjat', 19)}</span><span class="nom">Ommaviy oferta</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></a>
      <a class="sozlama-qator" href="/maxfiylik" target="_blank">
        <span class="b">${ik('qulf', 19)}</span><span class="nom">Maxfiylik siyosati</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></a>
    </div>`,
    (t) => { $('#t-profil-yordam', t).onclick = yordamOyna; });

  const hisob = qator('hisob', 'qulf', 'Hisob va ma’lumotlarim', '', () => `
    <div class="sahifa-izoh">${ik('qalqon', 16)}Ma’lumotlaringiz sizniki: istalgan
      payt yuklab olasiz yoki butunlay o‘chirasiz.</div>
    <div class="sozlama-ro">
      <button class="sozlama-qator" id="t-eksport">
        <span class="b">${ik('yuklab', 19)}</span>
        <span class="nom">Ma’lumotlarimni yuklab olish <small>JSON fayl</small></span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></button>
      ${seansToken() && !tg?.initData ? `
        <button class="sozlama-qator" id="t-chiqish">
          <span class="b">${ik('chiqish', 19)}</span><span class="nom">Bu qurilmadan chiqish</span>
          <span class="oq">${ik('keyingi', 17, 2)}</span></button>` : ''}
      <button class="sozlama-qator xavf" id="t-profil-ochir">
        <span class="b">${ik('ochirish', 19)}</span><span class="nom">Hisobni o‘chirish</span>
        <span class="oq">${ik('keyingi', 17, 2)}</span></button>
    </div>`,
    (t) => {
      $('#t-eksport', t).onclick = malumotlarimniYukla;
      $('#t-profil-ochir', t).onclick = hisobniOchirOyna;
      const ch = $('#t-chiqish', t);
      if (ch) ch.onclick = async () => {
        if (!(await tasdiqla('Bu qurilmadan chiqasizmi?'))) return;
        // Bu qurilmaga endi bu hisobning bildirishnomasi kelmasin
        await pushniOchir().catch(() => {});
        try { await api('/api/chiqish', { method: 'POST' }); } catch {}
        seansOchir(); menikiOchir();
        location.reload();
      };
    });

  $('#profil-tan').innerHTML = `
    ${holat.ornatishMumkin ? `
      <button class="ornat" id="t-ornat">
        <span class="b">${ik('ornatish', 19)}</span>
        <span>Ilovani o‘rnatish<small>Telefon ekraniga qo‘shiladi — bir bosishda ochiladi</small></span>
        ${ik('keyingi', 18)}
      </button>` : ''}
    ${sozGuruh('Mening faoliyatim', natijalar + buyurtmalar + sevimli)}
    ${sozGuruh('Hisobim', shaxsiy + teriB + manzil)}
    ${sozGuruh('Ilova', bildirish + korinish)}
    ${sozGuruh('Yordam', aloqa + hisob)}`;

  // --- Ulanishlar ---
  $$('#profil-tan [data-bolim]').forEach((b) => b.onclick = () => profilBolimOch(b.dataset.bolim));
  $('#t-ornat') && ($('#t-ornat').onclick = ilovaniOrnat);
  const ss = $('#profil-stat [data-sevimli]');
  if (ss) ss.onclick = () => profilBolimOch('sevimli');
  const sn = $('#profil-stat [data-natijalar]');
  if (sn) sn.onclick = () => profilBolimOch('natijalar');
  const sb = $('#profil-stat [data-buyurtmalar]');
  if (sb) sb.onclick = () => profilBolimOch('buyurtma');
}

/** Profil bo'limlari — har biri o'z ekranida. */
let profilBolimlar = {};
function profilBolimOch(id) {
  if (!profilBolimlar[id]) profilniChiz();
  const b = profilBolimlar[id];
  if (!b) return;
  sahifaOch({ sarlavha: b.nom, html: b.ich(), ula: (tan) => b.ula?.(tan) });
}

/** Qisqa tasdiq xabari pastda («Saqlandi»). */
function tost(matn) {
  $('.tost')?.remove();
  const t = document.createElement('div');
  t.className = 'tost';
  t.innerHTML = `${ik('tasdiq', 17)}<span>${esc(matn)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('ketdi'); setTimeout(() => t.remove(), 300); }, 1800);
}

/**
 * «Natijalarim» — har yuz tahlili saqlanadi va shu yerda turadi.
 * Surat emas, natija: sana, ball, teri turi, eng og'ir belgilar va
 * oldingisiga nisbatan o'zgarish. Bosilganda to'liq natija ochiladi.
 */
async function natijaTarixiniChiz() {
  const q = $('#natija-tarix');
  if (!q) return;
  q.innerHTML = '<div class="tarix-yukl"><span class="aylana"></span></div>';
  let r;
  try { r = (await api('/api/tahlillar')).tahlillar || []; }
  catch (e) { q.innerHTML = `<p class="ozgina">${esc(e.message)}</p>`; return; }
  if (!r.length) {
    q.innerHTML = `<div class="tarix-bosh">${ik('skaner', 26)}
      <p>Hali tahlil yo‘q. Birinchi skanerdan keyin natijalar shu yerda saqlanadi.</p>
      <button class="asosiy" id="t-tarix-skan">${ik('kamera', 17)}Yuzni tahlil qilish</button></div>`;
    $('#t-tarix-skan').onclick = () => tabOch('skaner');
    return;
  }
  q.innerHTML = `<div class="tarix">${r.map((x) => {
    const d = new Date(x.created_at);
    const sana = `${d.getDate()}-${OYLAR_UZ[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const fark = x.oldingi_ball != null ? (x.score ?? 0) - Number(x.oldingi_ball) : null;
    return `
      <button class="tarix-qator" data-tahlil="${esc(x.id)}">
        ${ballHalqa(x.score ?? 0, 54)}
        <span class="tarix-tan">
          <b>${esc(sana)}</b>
          <span>${[x.skin_type ? `${esc(x.skin_type)} teri` : '', x.age_estimate ? `${esc(x.age_estimate)} yosh` : '']
            .filter(Boolean).join(' · ') || 'Teri tahlili'}</span>
          ${x.belgilar?.length ? `<span class="tarix-belgilar">${x.belgilar.map((m) =>
            `<i>${esc(KALIT_NOM[m.kalit] || m.nom || '')}</i>`).join('')}</span>` : ''}
        </span>
        ${fark !== null ? `<span class="tarix-fark ${fark >= 0 ? 'osdi' : 'tushdi'}">${fark > 0 ? '+' : ''}${fark}</span>` : ''}
        <span class="oq">${ik('keyingi', 16)}</span>
      </button>`;
  }).join('')}</div>`;
  $$('.tarix-qator', q).forEach((b) => b.onclick = async () => {
    titra();
    b.disabled = true;
    try {
      const { tahlil } = await api(`/api/tahlil?id=${encodeURIComponent(b.dataset.tahlil)}`);
      // Oxirgi tahlil bo'lsa — oddiy holat, aks holda «eski natija»
      holat.natijaKorish = String(tahlil.id) === String(holat.tahlil?.id) ? null : tahlil;
      holat.natijaKesh = false;
      tabOch('natija');
      natijaniChiz();
      scrollTo({ top: 0 });
    } catch (e) { ogohlantir(e.message); }
    b.disabled = false;
  });
}

/**
 * Ma'lumotlarni JSON qilib yuklab olish. Fayl QURILMAGA saqlanadi —
 * odam o'z ma'lumotini ko'radi, boshqa joyga ko'chira oladi.
 */
async function malumotlarimniYukla() {
  const t = $('#t-eksport');
  t.disabled = true;
  try {
    const j = await api('/api/hisob/eksport');
    const blob = new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kiovo-malumotlarim-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    titra('medium');
  } catch (e) { ogohlantir(e.message); }
  t.disabled = false;
}

/**
 * Hisobni o'chirish — Google Play talabi: ilovaning O'ZIDA bo'lishi shart.
 * Ikki qadam: nima o'chishini o'qiydi, «tushundim» ni belgilaydi.
 */
function hisobniOchirOyna() {
  $('#modal-tan').innerHTML = `
    <div class="ochir-oyna">
      <div class="ochir-belgi">${ik('ochirish', 30)}</div>
      <h2>Hisobni o‘chirasizmi?</h2>
      <ul class="ochir-royxat">
        <li><b>O‘chadi:</b> yuz suratlaringiz, tahlil natijalari, savat,
          sevimlilar, sharhlar, ism, telefon, email va manzil.</li>
        <li><b>Saqlanadi:</b> buyurtmalar hisobi (qonun talabi) —
          lekin ism, telefon va manzilsiz.</li>
        <li>Buni <b>qaytarib bo‘lmaydi</b>. Kerak bo‘lsa avval
          ma’lumotlaringizni yuklab oling.</li>
      </ul>
      <label class="ochir-tasdiq"><input type="checkbox" id="ochir-tushundim">
        Tushundim, hisobim butunlay o‘chsin</label>
      <div class="kirish-xato" id="ochir-xato" hidden></div>
      <button class="asosiy xavfli" id="t-ochir-ha" disabled>Hisobni o‘chirish</button>
      <button class="ikkilamchi" id="t-ochir-yoq" style="margin-top:9px">Bekor qilish</button>
    </div>`;
  modalOch();
  const ha = $('#t-ochir-ha');
  $('#ochir-tushundim').onchange = (e) => { ha.disabled = !e.target.checked; };
  $('#t-ochir-yoq').onclick = modalYop;
  ha.onclick = async () => {
    ha.disabled = true; ha.textContent = 'O‘chirilmoqda…';
    try {
      await api('/api/hisob/ochir', { method: 'POST', body: JSON.stringify({ tasdiq: true }) });
      // Qurilmadagi nusxalar ham: seans, qoralamalar, keshlangan ma'lumot
      try {
        Object.keys(localStorage).filter((k) => /^(kiovo_|qq_)/.test(k))
          .forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch {}
      document.body.innerHTML = `
        <div class="kirish-fon"><main class="kirish-quti" style="margin-top:auto">
          <div class="kirish-belgi-katta">${ik('tasdiq', 34)}</div>
          <h1>Hisobingiz o‘chirildi</h1>
          <p class="kirish-izoh">Ma’lumotlaringiz o‘chirildi. KiOVO’dan foydalanganingiz
            uchun rahmat — istalgan payt qaytishingiz mumkin.</p>
          <a class="asosiy tugma-havola" href="/app/">Bosh sahifa</a>
        </main></div>`;
    } catch (e) {
      const x = $('#ochir-xato'); x.hidden = false; x.textContent = e.message;
      ha.disabled = false; ha.textContent = 'Hisobni o‘chirish';
    }
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

// Namuna savollar QISQA: har biri bitta qatorga sig'adi. Ilgari
// ular ikki qatordan edi va bo'sh ekran matnga to'lib ketardi —
// odam o'qishga erinib, hech qaysisini bosmasdi.
// `sorov` — bosilganda AI ga ketadigan to'liq savol; ko'rinishda esa
// faqat qisqa nomi turadi.
const NAMUNA_SAVOL = [
  { ik: 'tomchi',  matn: 'Terim quruq',       sorov: 'Yuzim juda quruq, nima yordam beradi?' },
  { ik: 'tozalik', matn: 'Akne bor',          sorov: 'Aknega qarshi to‘liq parvarish tuzing' },
  { ik: 'quyosh',  matn: 'Quyoshdan himoya',  sorov: 'Yozda quyoshdan himoya uchun nima olay?' },
];

const BOSQICH_NOM = {
  tozalash:'Tozalash', toner:'Toner', davolash:'Davolash',
  namlash:'Namlash', himoya:'Himoya', qoshimcha:'Qo‘shimcha', ichki:'Ichki qabul',
};

// Suhbat o'zgargan sanog'i. Tabdan tabga o'tganda chat QAYTA
// chizilmasligi kerak: `innerHTML` ni qayta yozish rasmlarni qaytadan
// yuklaydi, animatsiyani noldan boshlaydi va odam o'qib turgan joyini
// yo'qotadi — «yangilanib ketdi» degani shu.
let suhbatV = 0;
let suhbatChizilgan = -1;
const suhbatOzgardi = () => { suhbatV += 1; };

function suhbatniYukla() {
  try { holat.suhbat = JSON.parse(sessionStorage.getItem('qq_suhbat') || '[]'); }
  catch { holat.suhbat = []; }
  if (!Array.isArray(holat.suhbat)) holat.suhbat = [];
  suhbatOzgardi();
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
 * AI javobi — SHABLON bo'yicha chiziladi, oddiy matn emas.
 *
 * AI (src/ai/maslahat.js) javobni yengil belgilar bilan yozadi:
 * birinchi jumlalar — muammoning mohiyati, «## Sarlavha», «1. qadam»,
 * «• band», «> diqqat». Ilgari bularning hammasi bitta pufak ichida
 * mayda matn bo'lib chiqardi. Endi har biri o'z ko'rinishida:
 *   · mohiyat  — katta, o'qishli «lid» matn;
 *   · sarlavha — belgili alohida bo'lim kartasi;
 *   · qadamlar — raqamli vaqt chizig'i;
 *   · bandlar  — belgichali qatorlar;
 *   · diqqat   — rangli ogohlantirish kartasi.
 */
function formatMatn(xom) {
  const qatorlar = String(xom || '').split('\n');
  const chiq = [];
  let royxat = [];
  let tur = 'ul';
  let bolimOchiq = false;
  let lidBor = false;
  const qalin = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const royxatniYop = () => {
    if (!royxat.length) return;
    chiq.push(tur === 'ol'
      ? `<ol class="ai-qadamlar">${royxat.join('')}</ol>`
      : `<ul class="ai-bandlar">${royxat.join('')}</ul>`);
    royxat = [];
  };
  const bolimniYop = () => { royxatniYop(); if (bolimOchiq) { chiq.push('</section>'); bolimOchiq = false; } };

  for (const xq of qatorlar) {
    const q = xq.trim();
    if (!q) { royxatniYop(); continue; }

    // ## Sarlavha — yangi bo'lim kartasi; boshidagi emoji belgi bo'ladi
    if (q.startsWith('##')) {
      bolimniYop();
      const matn = q.replace(/^#+\s*/, '');
      const e = matn.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
      chiq.push(`<section class="ai-bolim"><h4>${e
        ? `<span class="ai-bolim-belgi">${esc(e[1])}</span>${qalin(e[2])}`
        : `<span class="ai-bolim-belgi">${ik('tasdiq', 15)}</span>${qalin(matn)}`}</h4>`);
      bolimOchiq = true;
      continue;
    }
    // > Diqqat qilinadigan jumla
    if (q.startsWith('>')) {
      royxatniYop();
      chiq.push(`<div class="ai-diqqat"><span class="ai-diqqat-belgi">${ik('ogoh', 17)}</span>
        <span>${qalin(q.slice(1).trim())}</span></div>`);
      continue;
    }
    // 1. Tartibli qadam
    const raqamli = q.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (raqamli) {
      if (tur !== 'ol') { royxatniYop(); tur = 'ol'; }
      royxat.push(`<li><i>${esc(raqamli[1])}</i><span>${qalin(raqamli[2])}</span></li>`);
      continue;
    }
    // • Ro'yxat bandi
    if (/^[•\-*]\s/.test(q)) {
      if (tur !== 'ul') { royxatniYop(); tur = 'ul'; }
      royxat.push(`<li><i>${ik('tasdiq', 13)}</i><span>${qalin(q.slice(1).trim())}</span></li>`);
      continue;
    }
    royxatniYop(); tur = 'ul';
    // Birinchi xatboshi (bo'limdan oldin) — mohiyat, kattaroq
    if (!bolimOchiq && !lidBor) { chiq.push(`<p class="ai-lid">${qalin(q)}</p>`); lidBor = true; }
    else chiq.push(`<p>${qalin(q)}</p>`);
  }
  bolimniYop();
  return chiq.join('');
}

const TUR_NOM = {
  javob: ['Maslahat', 'tomchi'], tavsiya: ['Tavsiya', 'savat'], savol: ['Aniqlashtirish', 'savol'],
  tibbiy: ['Sog‘liq', 'tibbiy'], yoq: ['Javob', 'suhbat'], mavzudan_tashqari: ['Javob', 'suhbat'],
};

/**
 * Tavsiya qilingan mahsulot — gorizontal lentadagi KARTA: katta rasm,
 * bosqich va tartib raqami, nom, asosiy ma'lumot (hajm, reyting),
 * «nega aynan shu», qanday ishlatish, narx va «Savatga» tugmasi.
 */
function tavsiyaKartasi(t, tartibli = false) {
  const p = t.mahsulot;
  const yoq = !(p.stock > 0);
  const savatda = holat.savat.some((r) => r.products.id === p.id);
  const rasm = p.poster_id
    ? `<img src="/media/${esc(p.poster_id)}?w=400" alt="" loading="lazy">`
    : `<span class="ai-m-bosh">${ik('shisha', 34)}</span>`;
  const eski = p.old_price && p.old_price > p.price ? `<s>${qisqaNarx(p.old_price)}</s>` : '';
  const chiplar = [
    p.volume ? `<span>${ik('tomchi', 12)}${esc(p.volume)}</span>` : '',
    p.dona_soni > 1 ? `<span class="ai-m-dona">${p.dona_soni} dona</span>` : '',
    Number(p.reyting) > 0 ? `<span>${ik('yulduz', 12)}${Number(p.reyting).toFixed(1)}</span>` : '',
  ].join('');
  return `
    <article class="ai-m" data-mahsulot="${p.id}">
      <div class="ai-m-rasm">${rasm}
        ${tartibli ? `<span class="ai-m-tartib">${t.tartib}</span>` : ''}
        ${tartibli && t.bosqich ? `<span class="ai-m-bosqich">${esc(BOSQICH_NOM[t.bosqich] || t.bosqich)}</span>` : ''}
      </div>
      <div class="ai-m-tan">
        ${p.brand ? `<span class="ai-m-brend">${esc(p.brand)}</span>` : ''}
        <b class="ai-m-nom">${esc(nomi(p))}</b>
        ${chiplar ? `<div class="ai-m-chiplar">${chiplar}</div>` : ''}
        ${t.sabab ? `<p class="ai-m-sabab">${esc(t.sabab)}</p>` : ''}
        ${t.qanday ? `<p class="ai-m-qanday">${ik('soat', 13)}<span>${esc(t.qanday)}</span></p>` : ''}
        <div class="ai-m-past">
          <span class="ai-m-narx">${narx(p.price)}${eski}</span>
          ${yoq
            ? '<span class="ai-m-yoq">Tugagan</span>'
            : `<button class="ai-m-qosh ${savatda ? 'qoshildi' : ''}" data-qosh="${p.id}"
                 aria-label="Savatga qo‘shish">${savatda ? `${ik('tasdiq', 16)}Savatda` : `${ik('plyus', 16)}Savatga`}</button>`}
        </div>
      </div>
    </article>`;
}

/** Tavsiyalar bloki: sarlavha, gorizontal lenta, jami va «hammasini savatga». */
function tavsiyaBloki(j) {
  const toplam = Boolean(j.toplam && j.tavsiya.length > 1);
  const jami = j.tavsiya.reduce((s, t) => s + (t.mahsulot?.price || 0), 0);
  const idlar = j.tavsiya.map((t) => t.product_id).join(',');
  const hammasiBor = j.tavsiya.every((t) =>
    holat.savat.some((r) => r.products.id === t.product_id));
  const n = j.tavsiya.length;
  return `
    <div class="ai-tavsiya">
      <div class="ai-tavsiya-bosh">
        <span class="ai-tavsiya-belgi">${ik(toplam ? 'sovga' : 'savat', 18)}</span>
        <div><b>${toplam ? esc(j.toplam.nom) : 'Sizga mos mahsulotlar'}</b>
          <span>${n} ta mahsulot${n > 1 ? ' · suring' : ''}</span></div>
      </div>
      ${toplam && j.toplam.izoh ? `<p class="ai-tavsiya-izoh">${esc(j.toplam.izoh)}</p>` : ''}
      <div class="ai-mahsulotlar">${j.tavsiya.map((t) => tavsiyaKartasi(t, toplam)).join('')}</div>
      ${n > 1 ? `
        <div class="ai-tavsiya-past">
          <div><span>${n} ta mahsulot</span><b>${narx(jami)}</b></div>
          <button class="asosiy ai-toplam-tugma ${hammasiBor ? 'qoshildi' : ''}"
            data-toplam="${idlar}" ${hammasiBor ? 'disabled' : ''}>
            ${ik(hammasiBor ? 'tasdiq' : 'savat', 18)}${hammasiBor ? 'Savatda' : 'Hammasini savatga'}</button>
        </div>` : ''}
    </div>`;
}

/** Bitta AI javobi: shablonli karta + savol / mahsulotlar. */
function aiXabarHtml(j) {
  const tibbiy = j.turi === 'tibbiy';
  const [turNom, turIk] = TUR_NOM[j.savol ? 'savol' : j.turi] || TUR_NOM.javob;

  let ost = '';
  if (j.savol) {
    ost = `
      <div class="savol-quti">
        <div class="savol-matn">${ik('savol', 17)}<span>${esc(j.savol.matn)}</span></div>
        <div class="savol-variantlar">
          ${(j.savol.variantlar || []).map((v) =>
            `<button data-savol="${esc(v)}">${esc(v)}</button>`).join('')}
          ${j.savol.rasm_kerak
            ? `<button class="rasmli" data-rasm-sora="1">${ik('kamera', 16)}Rasm yuborish</button>` : ''}
        </div>
      </div>`;
  } else if ((j.tavsiya || []).length) {
    ost = tavsiyaBloki(j);
  }

  return `
    <div class="xabar ai">
      <div class="ai-javob ${tibbiy ? 'tibbiy' : ''}">
        <div class="ai-javob-bosh">
          <span class="ai-avatar">${BELGI()}</span>
          <b>KiOVO AI</b>
          <span class="ai-tur">${ik(turIk, 13)}${esc(turNom)}</span>
        </div>
        <div class="ai-javob-tan">${formatMatn(j.javob)}</div>
      </div>
      ${ost}
    </div>`;
}

function maslahatniChiz() {
  const oqim = $('#maslahat-oqim');
  // Hech nima o'zgarmagan bo'lsa DOM ga umuman tegmaymiz
  if (suhbatChizilgan === suhbatV && oqim.childElementCount) return;
  suhbatChizilgan = suhbatV;
  kor($('#maslahat-tozala'), holat.suhbat.length > 0);

  if (!holat.suhbat.length) {
    oqim.innerHTML = `
      <div class="suhbat-bosh-ekran">
        <div class="halqa">${BELGI()}</div>
        <h2>Nima bezovta qilyapti?</h2>
        <p>O‘z so‘zingiz bilan yozing — mos mahsulotni topib beraman.</p>
        <div class="namunalar">
          ${NAMUNA_SAVOL.map((n) => `
            <button data-savol="${esc(n.sorov || n.matn)}">${ik(n.ik, 19)}<span>${esc(n.matn)}</span>
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
    // Tizim eslatmasi (masalan rasm chegarasi) — javob emas, shuning
    // uchun pufaksiz va so'niqroq ko'rinadi
    if (x.tizim) return `<div class="chat-eslatma">${esc(x.matn)}</div>`;
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
  suhbatOzgardi(); maslahatniChiz(); suhbatniSaqla(); pastgaTush(); titra();

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
    // Rasm chegarasi: qolgani ozayganda ogohlantiramiz, tugaganda
    // esa rasm O'QILMAGANINI aytamiz — odam javobni surat asosida
    // deb o'ylab yurmasin.
    if (j.rasm_otkazildi) {
      holat.suhbat.push({ kim: 'ai', tizim: true,
        matn: `📷 Bugungi rasm chegarangiz tugadi (${j.rasm_limit?.limit || 3} ta). `
            + 'Bu javob faqat matningizga asoslangan. Ertaga rasm yana ishlaydi.' });
    } else if (j.rasm_limit && j.rasm_limit.qolgan <= 1) {
      holat.suhbat.push({ kim: 'ai', tizim: true,
        matn: j.rasm_limit.qolgan === 0
          ? '📷 Bugun rasm chegarangiz tugadi. Ertaga yana mumkin.'
          : '📷 Bugun yana 1 ta rasm yuborishingiz mumkin.' });
    }
  } catch (e) {
    holat.suhbat.pop();
    holat.suhbat.push({ kim: 'ai', matn: e.message,
      javob: { javob: e.message, turi: 'yoq', tavsiya: [], takliflar: [] } });
  } finally {
    maslahatBand = false;
    $('#maslahat-holat').textContent = 'Har doim shu yerda';
    $('#maslahat-holat').classList.remove('oylanmoqda');
    suhbatOzgardi(); maslahatniChiz(); suhbatniSaqla(); pastgaTush();
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

/* KLAVIATURA.
 *
 * Android Chrome (Play'dagi ilova ham shu) klaviatura ochilganda faqat
 * KO'RINADIGAN qismni kichraytiradi — sahifaning o'zi o'zgarmaydi, va
 * pastga yopishgan yozish paneli klaviatura ORTIDA qolib ketardi.
 * Ikki himoya: index.html dagi `interactive-widget=resizes-content`
 * (Chrome sahifani kichraytiradi) va shu yerda o'lchov — klaviatura
 * balandligi `--klav` ga yoziladi, panel shuncha yuqoriga ko'tariladi.
 *
 * Ikkinchi muammo: klaviaturani Android'ning «orqaga» strelkasi bilan
 * yopsa, input fokusda QOLADI — `blur` kelmaydi, pastki menyu esa
 * yashirinligicha qolardi. Endi klaviatura yopilganini balandlikdan
 * bilamiz. */
function klaviaturaniKuzat(yopildi, ochildi) {
  const vv = window.visualViewport;
  if (!vv) return;
  const yozuvdami = () => /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
  let tayanch = Math.max(window.innerHeight, vv.height);
  let ochiq = false;
  const olchov = () => {
    // Klaviatura yo'q paytdagi balandlik — taqqoslash uchun
    if (!yozuvdami()) tayanch = Math.max(window.innerHeight, vv.height);
    const ostki = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--klav', `${ostki}px`);
    const endi = tayanch - vv.height > 140;
    if (ochiq && !endi) yopildi();
    if (!ochiq && endi) ochildi?.();
    ochiq = endi;
  };
  vv.addEventListener('resize', olchov);
  vv.addEventListener('scroll', olchov);
  window.addEventListener('orientationchange', () => setTimeout(() => {
    tayanch = Math.max(window.innerHeight, vv.height); olchov();
  }, 400));
}

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
  // faqat yozish paneli qoladi. Klaviatura qanday yopilmasin (Android
  // «orqaga» strelkasi inputdan fokusni OLMAYDI) — `klaviaturaniKuzat`
  // buni sezib menyuni qaytaradi.
  matn.addEventListener('focus', () => {
    document.body.classList.add('yozilmoqda');
    setTimeout(pastgaTush, 260);
  });
  matn.addEventListener('blur', () => document.body.classList.remove('yozilmoqda'));
  klaviaturaniKuzat(() => {
    document.body.classList.remove('yozilmoqda');
    if (document.activeElement === matn) matn.blur();
  }, () => { if (document.activeElement === matn) pastgaTush(); });

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
      q.disabled = true; q.classList.add('qoshildi');
      q.innerHTML = q.classList.contains('ai-m-qosh') ? `${ik('tasdiq', 16)}Savatda` : ik('tasdiq', 19);
      savatga(id);
      return;
    }
    const k = e.target.closest('[data-mahsulot]');
    if (k) mahsulotOyna(Number(k.dataset.mahsulot));
  });
  $('#maslahat-takliflar').addEventListener('click', savolBos);

  $('#maslahat-tozala').onclick = () => {
    holat.suhbat = []; chatRasm = null; rasmOldindaniChiz();
    tabSurish.maslahat = 0;
    suhbatOzgardi(); suhbatniSaqla(); maslahatniChiz(); titra();
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

/**
 * Ilovani telefonga qo'shish.
 *
 * MUHIM FARQ — ikki xil yorliq bor va ular BOSHQACHA ishlaydi:
 *
 *   1. Telegram yorlig'i (`tg.addToHomeScreen`). Uni Telegramning o'zi
 *      yasaydi va u HAR DOIM TELEGRAMNI ochadi — ichida mini ilovani
 *      ko'rsatadi. Bu Telegram API sining ishlash usuli, sozlab
 *      bo'lmaydi. Odam «ilova» kutayotgan bo'lsa bu uni chalg'itadi.
 *
 *   2. Haqiqiy ilova (PWA). Uni BRAUZER yasaydi va u to'g'ridan-to'g'ri
 *      do'konni ochadi — Telegramsiz, alohida oyna bo'lib. Buning
 *      uchun sahifa brauzerda (Chrome/Safari) ochilgan bo'lishi shart.
 *
 * Shuning uchun Telegram ichida turganda TANLOV beramiz, jimgina
 * Telegram yorlig'ini yasab qo'ymaymiz.
 */
async function ilovaniOrnat() {
  titra('medium');

  // ── Brauzerda: haqiqiy o'rnatish taklifi bo'lsa darrov ishlatamiz
  if (!tg?.initData && ornatishHodisasi) {
    ornatishHodisasi.prompt();
    const { outcome } = await ornatishHodisasi.userChoice;
    if (outcome === 'accepted') { ornatishHodisasi = null; holat.ornatishMumkin = false; }
    profilniChiz();
    return;
  }

  // ── Telegram ichida: ikki yo'lni ochiq aytamiz
  if (tg?.initData) {
    const havola = location.origin + '/app/';
    $('#modal-tan').innerHTML = `
      <div style="padding:18px 18px 0">
        <h2 style="margin-bottom:6px">Ilovani qo‘shish</h2>
        <p class="ozgina" style="margin-bottom:16px">Ikki xil yorliq bor —
          qaysi biri kerakligini tanlang.</p>

        <div class="ornat-tanlov">
          <b>📱 Haqiqiy ilova</b>
          <span>Telegramsiz, alohida oyna bo‘lib ochiladi. Buning uchun
            havolani <b>Chrome</b> yoki <b>Safari</b> da oching va
            menyudan «Ekranga qo‘shish» ni bosing.</span>
          <div class="ornat-havola" id="ornat-havola">${esc(havola)}</div>
          <button class="asosiy" id="t-havola-nusxa">Havoladan nusxa olish</button>
        </div>

        <div class="ornat-tanlov ikkilamchi-quti">
          <b>💬 Telegram yorlig‘i</b>
          <span>Tez qo‘shiladi, lekin bosilganda <b>Telegram ochiladi</b>
            va ilova uning ichida ko‘rinadi.</span>
          <button class="ikkilamchi" id="t-tg-yorliq">Telegramga qo‘shish</button>
        </div>

        <button class="ikkilamchi" id="t-ornat-yop"
          style="margin-top:4px;width:100%">Yopish</button>
      </div>`;
    modalOch();

    $('#t-havola-nusxa').onclick = async () => {
      try {
        await navigator.clipboard.writeText(havola);
        $('#t-havola-nusxa').textContent = '✓ Nusxa olindi';
      } catch {
        // Clipboard ishlamasa havolani belgilab beramiz — qo'lda nusxa olsin
        const el = $('#ornat-havola');
        const r = document.createRange(); r.selectNodeContents(el);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        $('#t-havola-nusxa').textContent = 'Belgilandi — nusxa oling';
      }
      titra();
    };
    $('#t-tg-yorliq').onclick = () => {
      try { tg.addToHomeScreen(); } catch { ogohlantir('Telegramni yangilang.'); }
      modalYop();
    };
    $('#t-ornat-yop').onclick = modalYop;
    return;
  }

  // ── Brauzerda, lekin avtomatik taklif yo'q — qo'lda yo'riqnoma
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
/**
 * O'zgarishni ANIMATSIYASIZ bajaradi.
 *
 * Yozish paneli `position:fixed` va uning `bottom` i klaviatura
 * ochilganda siljiydi — buning uchun `transition` qo'yilgan. Lekin
 * tab almashganda ham o'sha `bottom` o'zgaradi va panel bo'sh joyda
 * sirg'alib, miltillab ko'rinadi. Bu yerda o'zgarish bir kadrga
 * animatsiyasiz qilinadi: brauzer to'g'ridan-to'g'ri oxirgi holatni
 * chizadi.
 */
function animatsiyasiz(ozgartir) {
  document.body.classList.add('tez');
  ozgartir();
  // Ikki kadr: birinchisida brauzer yangi holatni hisoblaydi,
  // ikkinchisida animatsiyani qaytaramiz
  requestAnimationFrame(() => requestAnimationFrame(
    () => document.body.classList.remove('tez')));
}

// Har bo'limning o'z surilish joyi. Ilgari tab almashganda sahifa
// har safar tepaga otilardi: uzun natijani yoki chatni o'qib turib
// savatga kirib qaytgan odam yana boshidan qidirishga majbur edi.
const tabSurish = {};

/* ANDROID «ORQAGA» TUGMASI.
 *
 * Ilova (Play'dagi ham, brauzerdagi ham) bitta sahifa: tarix yozuvi
 * bo'lmasa «orqaga» butun ilovani yopardi — mahsulot oynasini ochib
 * orqaga bosgan odam ilovadan chiqib ketardi. Endi tartib oddiy ilova
 * kabi: avval oyna yopiladi, keyin do'kon bo'limiga qaytadi, do'konda
 * esa ilovadan chiqadi.
 *
 * Tarix: [do'kon] → [boshqa bo'lim] → [oyna]. Boshqa bo'limlar orasida
 * o'tish yozuvni ALMASHTIRADI (profil → savat → orqaga = do'kon).
 * Telegram ichida bu ishlatilmaydi — u yerda Telegram'ning o'z tugmasi. */
const TARIX = !tg?.initData;
function tarixga(h, yangi = false) {
  try { yangi ? history.pushState(h, '') : history.replaceState(h, ''); } catch {}
}
if (TARIX) {
  window.addEventListener('popstate', (e) => {
    const h = e.state || {};
    const ustki = ustkiQatlam();
    if (ustki === 'sahifa') return sahifaYop({ tarixdan: true });
    if (ustki === 'modal') return modalYop();
    const tab = h.tab || 'katalog';
    if (tab !== holat.tab) return tabOch(tab, { tarixsiz: true });
    // Takroriy yozuv (oyna tugma bilan yopilgan edi) — bittasini o'tkazamiz
    history.back();
  });
}

function tabOch(nom, { tarixsiz = false } = {}) {
  nom = TAB_TAQMOQ[nom] || nom;
  // Ekran ichidan boshqa bo'limga o'tilsa (natijalar → natija) ekranlar yopiladi
  while (sahifalar.length) sahifaYop({ tarixdan: true });
  // Tarixdan ochilgan eski natija faqat o'sha safar ko'rinadi — keyingi
  // safar «Natija» yana oxirgi tahlilni ko'rsatadi
  if (nom !== 'natija' && holat.natijaKorish) { holat.natijaKorish = null; holat.natijaKesh = false; }
  if (TARIX && !tarixsiz && holat.tab !== nom) {
    const joriy = history.state?.tab;
    if (nom === 'katalog') tarixga({ tab: nom });
    else tarixga({ tab: nom }, !joriy || joriy === 'katalog');
  }
  // Ketayotgan bo'limning joyini eslab qolamiz
  if (holat.tab && holat.tab !== nom) tabSurish[holat.tab] = window.scrollY || 0;
  const oldingi = holat.tab;
  holat.tab = nom;
  sessionStorage.setItem('qq_tab', nom);
  // Butun almashuv ANIMATSIYASIZ: yozish paneli `position:fixed` va
  // uning `bottom` i klaviatura uchun animatsiyalangan. Tab
  // almashganda o'sha animatsiya ishga tushib, panel bo'sh joyda
  // sirg'alardi — «qimirlab, yo'q bo'lib paydo bo'lardi».
  animatsiyasiz(() => {
    TABLAR.forEach((t) => kor($(`#tab-${t}`), t === nom));
    $$('.menyu button').forEach((b) =>
      b.classList.toggle('tanlangan',
        b.dataset.tab === nom || (nom === 'natija' && b.dataset.tab === 'skaner')));
    if (nom !== 'maslahat') document.body.classList.remove('yozilmoqda');
    // Boshqa bo'limga o'tilsa kamera o'chadi: yonib turgan kamera
    // batareyani yeydi va odam uni ko'rmay qoladi
    if (nom !== 'skaner' && kamOqim) kameraniYop();
  });
  // Kaskad ~270 KB — skaner bo'limi ochilishi bilan yuklab qo'yamiz,
  // kamera bosilganda kutib turmasin
  if (nom === 'skaner') kaskadniYukla();
  if (nom === 'profil') profilniChiz();   // buyurtmalar bo'lim ochilganda yuklanadi
  if (nom === 'maslahat') maslahatniChiz();
  if (nom === 'natija' && !holat.natijaKesh) natijaniChiz();
  // Qaytib kelganda o'sha joyidan davom etadi; birinchi marta
  // ochilayotgan bo'lim esa tepadan boshlanadi
  const joy = oldingi === nom ? window.scrollY : (tabSurish[nom] || 0);
  requestAnimationFrame(() => scrollTo({ top: joy }));
}
$$('.menyu button').forEach((b) => b.onclick = () => { tabOch(b.dataset.tab); titra(); });
maslahatniUla();
$('#t-xabarlar').onclick = () => { titra(); xabarlarOyna(); };
$('#t-savatga-otish').onclick = () => { titra(); tabOch('savat'); };
$('#t-qid-skaner').onclick = () => { titra('medium'); tabOch('skaner'); };

boshla();
});
