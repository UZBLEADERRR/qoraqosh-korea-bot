/* TELEFON RAQAMI — XALQARO.
 *
 * Ilgari hamma joyda `/^\+?998\d{9}$/` turardi va boshqa davlat
 * raqami butunlay rad etilardi. Bu noto'g'ri edi: mijozlarning bir
 * qismi Koreyada, Rossiyada yoki Qozog'istonda yashaydi va ular
 * ro'yxatdan ham o'tolmasdi, kirolmasdi ham.
 *
 * Endi qoida E.164 bo'yicha: `+` va 8-15 raqam. Mamlakat kodi
 * berilmagan bo'lsa O'zbekiston deb olinadi — mahalliy mijozlar
 * uchun eski odat (`90 123 45 67`) ishlayveradi.
 *
 * Kutubxona QO'SHILMAYDI: to'liq mamlakat bazasi (libphonenumber)
 * 500 KB dan oshadi va ilovani og'irlashtiradi. Bizga raqamning
 * to'g'ri kelishi va bir xil ko'rinishga tushishi yetarli — operator
 * kodini mamlakat ichida tekshirish do'kon ishi emas.
 */

/** E.164: eng ko'pi 15 raqam. 8 dan kami hech qaysi davlatda yo'q. */
const ENG_KAM = 8;
const ENG_KOP = 15;

/** Standart mamlakat — kodsiz yozilgan raqam shunga tegishli deb olinadi. */
export const STANDART_KOD = '998';
const STANDART_UZUNLIK = 9;          // O'zbekistonda operator + raqam

/* Mamlakat kodlari — FAQAT ko'rsatish uchun (niqoblash va bo'laklash).
 * Ro'yxatda yo'q davlat ham qabul qilinadi: bu tekshiruv emas, bezak.
 * Tartib muhim — uzunroq kod oldin turadi, aks holda `7` (Rossiya)
 * `7…` bilan boshlanadigan hamma narsani o'ziga olib qo'yadi. */
export const KODLAR = [
  '998', // O'zbekiston
  '996', // Qirg'iziston
  '995', // Gruziya
  '994', // Ozarbayjon
  '993', // Turkmaniston
  '992', // Tojikiston
  '971', // BAA
  '966', // Saudiya Arabistoni
  '380', // Ukraina
  '375', // Belarus
  '374', // Armaniston
  '90',  // Turkiya
  '86',  // Xitoy
  '82',  // Janubiy Koreya
  '81',  // Yaponiya
  '49',  // Germaniya
  '44',  // Buyuk Britaniya
  '7',   // Rossiya va Qozog'iston
  '1',   // AQSh va Kanada
];

/**
 * Raqamni bitta ko'rinishga keltiradi: `+998901234567`.
 *
 * Qabul qilinadi:
 *   «90 123 45 67»      → +998901234567  (kodsiz — O'zbekiston)
 *   «998901234567»      → +998901234567
 *   «+998 90 123 45 67» → +998901234567
 *   «+82 10 1234 5678»  → +821012345678
 *   «0082101234 5678»   → +821012345678  (00 — xalqaro prefiks)
 *
 * Mamlakat kodisiz XORIJIY raqam qabul qilinmaydi: `01012345678`
 * qaysi davlatniki ekanini bilib bo'lmaydi va taxmin qilish
 * mijozning raqamini buzib yuboradi.
 *
 * @returns {string|null} `+<raqamlar>` yoki null
 */
/** Kiritilgan matn XALQARO ko'rinishdami (`+` yoki `00` bilan)? */
export const xalqaroYozilgan = (xom) => {
  const s = String(xom ?? '').trim();
  return s.startsWith('+') || /^00\d/.test(s);
};

export function raqamTozala(xom) {
  let s = String(xom ?? '').trim();
  if (!s) return null;

  // `00` — xalqaro prefiks, `+` ning eski ko'rinishi
  const xalqaro = xalqaroYozilgan(s);
  s = s.replace(/^00/, '');

  const r = s.replace(/\D/g, '');
  if (!r) return null;

  if (xalqaro) {
    return r.length >= ENG_KAM && r.length <= ENG_KOP ? `+${r}` : null;
  }

  // Kodsiz yozilgan: faqat standart mamlakat
  if (r.length === STANDART_UZUNLIK) return `+${STANDART_KOD}${r}`;
  if (r.startsWith(STANDART_KOD)
      && r.length === STANDART_KOD.length + STANDART_UZUNLIK) return `+${r}`;
  return null;
}

/** Raqam yaroqlimi (tozalab ko'radi). */
export const raqamTogrimi = (xom) => raqamTozala(xom) !== null;

/** Faqat raqamlar — bazada solishtirish uchun. */
export const faqatRaqam = (xom) => String(xom ?? '').replace(/\D/g, '');

/** Raqamdagi mamlakat kodi. Topilmasa null. */
export function kodniTop(e164) {
  const r = faqatRaqam(e164);
  for (const k of KODLAR) if (r.startsWith(k)) return k;
  return null;
}

/**
 * Ko'rsatish uchun niqoblangan raqam: `+998 90 *** ** 67`.
 *
 * To'liq ko'rsatmaymiz: ekranni birov ko'rib qolsa raqam qo'lga
 * tushmasin. Mamlakat kodi va oxirgi ikki raqam odamning o'z
 * raqamini tanishi uchun yetarli.
 */
export function raqamYashir(xom) {
  const e164 = raqamTozala(xom);
  if (!e164) return String(xom ?? '');
  const r = faqatRaqam(e164);
  const kod = kodniTop(r) ?? '';
  const qolgan = r.slice(kod.length);
  if (qolgan.length < 4) return `+${r}`;
  // Yulduzlar uchtadan bo'linadi: `*********` bir tutam bo'lib
  // qolsa raqam nechta ekani ham bilinmaydi va yozuv o'qilmaydi
  const yulduz = ('*'.repeat(Math.max(1, qolgan.length - 4))
    .match(/.{1,3}/g) || []).join(' ');
  return `+${kod} ${qolgan.slice(0, 2)} ${yulduz} ${qolgan.slice(-2)}`;
}

/**
 * Bazada qidirish uchun nomzod raqamlar.
 *
 * Eski yozuvlarda O'zbekiston raqami kodsiz (`901234567`) turgan
 * bo'lishi mumkin, shuning uchun u ham ro'yxatga qo'shiladi.
 * XORIJIY raqamda faqat to'liq moslik: oxirgi 9 raqam bo'yicha
 * qidirsak, boshqa davlatning butunlay boshqa raqami tasodifan
 * mos kelib qolishi mumkin edi.
 */
export function qidiruvNomzodlari(xom) {
  const e164 = raqamTozala(xom);
  if (!e164) return [];
  const r = faqatRaqam(e164);
  const nomzod = [r];
  if (r.startsWith(STANDART_KOD)) nomzod.push(r.slice(STANDART_KOD.length));
  return nomzod;
}

/**
 * Yozilayotgan paytda bo'laklab ko'rsatish: `+998 90 123 45 67`.
 *
 * MUHIM: mamlakat kodi faqat `+` (yoki `00`) bilan yozilganda
 * qidiriladi. Aks holda mahalliy `90 123 45 67` raqami Turkiya
 * kodi (+90) deb tanilib, `+90 123 4567` bo'lib buzilardi — eng
 * ko'p uchraydigan kiritish usuli aynan shu.
 */
export function raqamFormat(xom) {
  const xalqaro = xalqaroYozilgan(xom);
  let r = faqatRaqam(String(xom ?? '').trim().replace(/^00/, '')).slice(0, ENG_KOP);
  if (!r) return xalqaro ? '+' : '';

  if (!xalqaro) {
    // Mahalliy: kodsiz yoziladi, 998 yozilgan bo'lsa tashlanadi
    const q = (r.startsWith(STANDART_KOD) ? r.slice(STANDART_KOD.length) : r)
      .slice(0, STANDART_UZUNLIK);
    const b = [q.slice(0, 2), q.slice(2, 5), q.slice(5, 7), q.slice(7, 9)];
    return `+${STANDART_KOD} ${b.filter(Boolean).join(' ')}`.trim();
  }

  const kod = kodniTop(r);
  if (!kod) return `+${r}`;
  const q = r.slice(kod.length);
  const b = kod === STANDART_KOD
    ? [q.slice(0, 2), q.slice(2, 5), q.slice(5, 7), q.slice(7, 9)]
    : [q.slice(0, 3), q.slice(3, 7), q.slice(7, 11), q.slice(11)];
  return `+${kod} ${b.filter(Boolean).join(' ')}`.trim();
}
