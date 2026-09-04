// AI chaqiruvlari jurnali — «nima bo'ldi?» degan savolga javob.
//
// Muammo. Skaner yiqilganda mijoz «⚠️ Xatolik yuz berdi» ni ko'radi,
// admin esa Railway loglarini ochmaguncha sababni bilmaydi. Yarim
// kechada telefonda log o'qib bo'lmaydi, natijada nosozlik soatlab
// aniqlanmay qoladi.
//
// Yechim — oxirgi chaqiruvlarni XOTIRADA saqlaymiz va /holat buyrug'i
// bilan telefonda ko'rsatamiz. Bazaga yozmaymiz: bu diagnostika,
// tarix emas; server qayta ko'tarilsa boshidan boshlanadi.

const MAKS = 20;          // oxirgi 20 ta xato yetarli
const xatolar = [];       // eng yangisi boshida
const hisob = { jami: 0, muvaffaq: 0, xato: 0 };
// Turkum bo'yicha nechta xato — qaysi nosozlik ustunligi darrov ko'rinsin
const turkumlar = new Map();

/** Muvaffaqiyatli chaqiruv. */
export function yaxshi() { hisob.jami += 1; hisob.muvaffaq += 1; }

/**
 * Yiqilgan chaqiruv.
 * @param {Error} e
 * @param {string} qayerda  'skaner', 'maslahat', 'poster'…
 */
export function yomon(e, qayerda = '') {
  hisob.jami += 1; hisob.xato += 1;
  const turkum = e?.turkum || 'nomalum';
  turkumlar.set(turkum, (turkumlar.get(turkum) || 0) + 1);
  xatolar.unshift({
    vaqt: Date.now(),
    turkum,
    qayerda,
    // Kalit URL da ketadi — xabarda qolib ketmasin
    xabar: String(e?.message || e).replace(/key=[\w-]+/gi, 'key=…').slice(0, 200),
  });
  if (xatolar.length > MAKS) xatolar.length = MAKS;
}

/** Oxirgi n ta xato (eng yangisi birinchi). */
export const oxirgiXatolar = (n = 5) => xatolar.slice(0, n);

/** Umumiy hisob — /holat va admin panel uchun. */
export const jurnalHolati = () => ({
  ...hisob,
  turkumlar: [...turkumlar.entries()]
    .sort((a, b) => b[1] - a[1]).map(([nom, soni]) => ({ nom, soni })),
  oxirgi: oxirgiXatolar(5),
});

/** Sinov uchun. */
export function jurnalniTozala() {
  xatolar.length = 0; turkumlar.clear();
  hisob.jami = 0; hisob.muvaffaq = 0; hisob.xato = 0;
}
