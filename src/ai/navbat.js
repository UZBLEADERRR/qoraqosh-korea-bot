// AI so'rovlari navbati — provayder chegarasini buzmaslik uchun.
//
// Muammo. Hozir har bir foydalanuvchi so'rovi to'g'ridan-to'g'ri
// Gemini/OpenRouter'ga ketadi. Minglab odam bir vaqtda skaner yoki
// maslahatchini ochsa — minglab bir vaqtdagi chaqiruv. Natija:
//   • provayder 429 qaytaradi va HAMMAGA xato chiqadi;
//   • kunlik kvota bir necha daqiqada tugaydi;
//   • 429 kelganda ham urinishda davom etsak, cheklov uzayadi.
//
// Yechim — bitta darvoza:
//   1. BIR VAQTDA nechta chaqiruv ketishi cheklangan;
//   2. DAQIQADA nechta chaqiruv ketishi cheklangan (token-chelak);
//   3. Navbat uzun bo'lsa YANGISI DARROV rad etiladi — odam besh
//      daqiqa aylanani kuzatgandan ko'ra «hozir band, birozdan keyin
//      urinib ko'ring» degan aniq javobni afzal ko'radi;
//   4. Provayder 429 bersa BUTUN navbat pauza qiladi — bu cheklovdan
//      chiqishning yagona yo'li.
//
// Foydalanuvchiga qo'yilgan shaxsiy cheklovlar (kunlik tahlil limiti,
// maslahatchiga 10 daqiqada 20 savol) o'z joyida qoladi: ular BITTA
// odamdan himoya qiladi, bu yerda esa HAMMASIDAN birgalikda.

const son = (nom, zaxira) => {
  const v = Number(process.env[nom]);
  return Number.isFinite(v) && v > 0 ? v : zaxira;
};

// Standart qiymatlar Gemini/OpenRouter'ning odatdagi bepul va arzon
// tariflariga mo'ljallangan. Kvota kattaroq bo'lsa muhitdan oshiriladi.
const BIR_VAQTDA = son('AI_BIR_VAQTDA', 6);      // parallel chaqiruv
const DAQIQADA   = son('AI_DAQIQADA', 60);       // daqiqadagi chaqiruv
const NAVBAT_MAKS = son('AI_NAVBAT_MAKS', 120);  // navbatda kutayotganlar
const KUTISH_MS  = son('AI_KUTISH_MS', 25_000);  // navbatda maksimal kutish

// ── Token-chelak: daqiqada DAQIQADA ta chaqiruv ──
// Chelak tekis to'ladi, ya'ni 60/daqiqa = sekundiga bitta. Shunda
// birdaniga 60 ta yuborilib, keyin 59 soniya jimlik bo'lmaydi.
let tokenlar = DAQIQADA;
let oxirgiToldirish = Date.now();

function tokenOl() {
  const hozir = Date.now();
  tokenlar = Math.min(DAQIQADA, tokenlar + ((hozir - oxirgiToldirish) / 60_000) * DAQIQADA);
  oxirgiToldirish = hozir;
  if (tokenlar >= 1) { tokenlar -= 1; return 0; }
  // Keyingi token qachon tayyor bo'ladi (ms)
  return Math.ceil(((1 - tokenlar) / DAQIQADA) * 60_000);
}

// ── Holat ──
let ishlayotgan = 0;
const navbat = [];
let pauzaGacha = 0;          // 429 dan keyin butun navbat shu vaqtgacha to'xtaydi
const hisob = { jami: 0, radEtilgan: 0, kutgan: 0, pauza: 0 };

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

class NavbatXato extends Error {
  constructor(xabar, turkum) { super(xabar); this.turkum = turkum; }
}

/** Provayder 429 berdi — hamma to'xtaydi. */
export function pauzaQil(soniya = 30) {
  const ms = Math.min(5 * 60_000, Math.max(1000, soniya * 1000));
  pauzaGacha = Math.max(pauzaGacha, Date.now() + ms);
  hisob.pauza += 1;
  console.warn(`AI NAVBATI: provayder cheklovi — ${Math.round(ms / 1000)} s pauza`);
}

/** 429 javobidan «qancha kutish» ni ajratadi. */
export function kutishSoniyasi(xabar) {
  const m = /retry[- ]after[^\d]{0,10}(\d+)/i.exec(String(xabar || ''))
        || /(\d+)\s*(?:soniya|seconds?)/i.exec(String(xabar || ''));
  return m ? Number(m[1]) : 30;
}

function keyingisi() {
  if (!navbat.length) return;
  if (ishlayotgan >= BIR_VAQTDA) return;

  const qoldi = pauzaGacha - Date.now();
  if (qoldi > 0) { setTimeout(keyingisi, Math.min(qoldi + 20, 5000)); return; }

  const kutishMs = tokenOl();
  if (kutishMs > 0) { setTimeout(keyingisi, Math.min(kutishMs + 5, 2000)); return; }

  const ish = navbat.shift();
  if (!ish) return;
  clearTimeout(ish.taymer);
  if (ish.tugadi) { keyingisi(); return; }

  ishlayotgan += 1;
  hisob.jami += 1;
  ish.bajar()
    .then(ish.hal, ish.rad)
    .finally(() => { ishlayotgan -= 1; keyingisi(); });
}

/**
 * Chaqiruvni navbatga qo'yadi.
 *
 * @param {() => Promise<any>} bajar
 * @param {{muhim?: boolean}} [o]  muhim — admin ishi (import, poster),
 *   u navbat oxirida emas, boshida turadi: mijoz kutmaydi, admin esa
 *   qo'lda boshlagan ishining tugashini kutadi.
 */
export function navbatga(bajar, { muhim = false } = {}) {
  return new Promise((hal, rad) => {
    if (navbat.length >= NAVBAT_MAKS) {
      hisob.radEtilgan += 1;
      return rad(new NavbatXato(
        'Hozir juda ko‘p so‘rov bor. Bir daqiqadan keyin urinib ko‘ring.', 'band'));
    }
    const ish = { bajar, hal, rad, tugadi: false, taymer: null };
    ish.taymer = setTimeout(() => {
      ish.tugadi = true;
      hisob.radEtilgan += 1;
      rad(new NavbatXato(
        'Navbat uzayib ketdi. Biroz kutib, qayta urinib ko‘ring.', 'band'));
    }, KUTISH_MS);
    ish.taymer.unref?.();

    if (navbat.length || ishlayotgan >= BIR_VAQTDA) hisob.kutgan += 1;
    if (muhim) navbat.unshift(ish); else navbat.push(ish);
    keyingisi();
  });
}

/** Tizim holati bo'limi uchun. */
export const navbatHolati = () => ({
  ishlayotgan,
  navbatda: navbat.length,
  bir_vaqtda: BIR_VAQTDA,
  daqiqada: DAQIQADA,
  qolgan_token: Math.floor(tokenlar),
  pauza_qoldi: Math.max(0, Math.ceil((pauzaGacha - Date.now()) / 1000)),
  ...hisob,
});

/** Sinov uchun. */
export function navbatniTozala() {
  navbat.length = 0; ishlayotgan = 0; pauzaGacha = 0;
  tokenlar = DAQIQADA; oxirgiToldirish = Date.now();
  hisob.jami = 0; hisob.radEtilgan = 0; hisob.kutgan = 0; hisob.pauza = 0;
}

export { kut };
