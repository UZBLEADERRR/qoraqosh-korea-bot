// Rasm keshi — xotirada.
//
// Nega kerak. Rasmlar bazada `bytea` bo'lib yotadi, ya'ni har bir
// `<img>` = Supabase'ga bitta so'rov. Do'kon sahifasida yigirmata rasm
// bo'lsa, bitta odam ochganda yigirmata so'rov ketadi; minglab odam
// bo'lsa baza shu bilan band bo'lib qoladi.
//
// Katalog kichik (yuzlab rasm) va rasm HECH QACHON o'zgarmaydi —
// yangisi yangi id oladi. Shuning uchun uni xotirada saqlash xavfsiz:
// birinchi so'rovdan keyin baza umuman bezovta qilinmaydi.
//
// Kesh CHEGARALANGAN: eng kam ishlatilgani birinchi chiqadi (LRU).
// Chegarasiz kesh konteyner xotirasini yeb, jarayonni o'ldirardi.

const MAKS_BAYT = Number(process.env.MEDIA_KESH_MB || 96) * 1024 * 1024;

const xarita = new Map();      // kalit -> { bayt, mime }
let hajm = 0;
let topildi = 0, topilmadi = 0;

/** @returns {{bayt:Buffer, mime:string}|null} */
export function keshdanOl(kalit) {
  const q = xarita.get(kalit);
  if (!q) { topilmadi++; return null; }
  // Map tartibni saqlaydi: qayta qo'yish uni «eng yangi» qiladi
  xarita.delete(kalit);
  xarita.set(kalit, q);
  topildi++;
  return q;
}

export function keshgaQoy(kalit, bayt, mime) {
  // Bitta juda katta rasm butun keshni siqib chiqarmasin
  if (!bayt || bayt.length > MAKS_BAYT / 4) return;
  if (xarita.has(kalit)) hajm -= xarita.get(kalit).bayt.length;
  xarita.set(kalit, { bayt, mime });
  hajm += bayt.length;

  while (hajm > MAKS_BAYT && xarita.size > 1) {
    const eng = xarita.keys().next().value;    // eng eski
    hajm -= xarita.get(eng).bayt.length;
    xarita.delete(eng);
  }
}

/** Rasm o'chirilganda keshdan ham ketsin. */
export function keshdanOchir(id) {
  for (const k of [...xarita.keys()]) {
    if (k.startsWith(`${id}:`)) { hajm -= xarita.get(k).bayt.length; xarita.delete(k); }
  }
}

/** Tizim holati bo'limi uchun. */
export const keshHolati = () => ({
  soni: xarita.size,
  mb: +(hajm / 1024 / 1024).toFixed(1),
  chegara_mb: +(MAKS_BAYT / 1024 / 1024).toFixed(0),
  topildi,
  topilmadi,
  foiz: topildi + topilmadi ? Math.round((topildi / (topildi + topilmadi)) * 100) : 0,
});

export function keshniBoshat() { xarita.clear(); hajm = 0; topildi = 0; topilmadi = 0; }
