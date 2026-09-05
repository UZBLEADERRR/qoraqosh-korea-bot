// Maslahatchiga BUTUN katalog emas, KERAKLI qismi yuboriladi.
//
// Muammo. Har savolda butun katalog promptga qo'shilardi. 28 ta
// mahsulotda bu sezilmaydi, 300 tada esa har savol o'n minglab token
// yeydi — kvota tez tugaydi va javob sekinlashadi. Ustiga model uzun
// ro'yxatdan chalg'iydi: kerakli mahsulot o'rtada ko'milib qoladi.
//
// Yechim: savolga aloqador mahsulotlarni tanlaymiz. Tanlash oddiy
// so'z mosligiga asoslangan — AI chaqiruvi EMAS, aks holda tejash
// o'rniga ikkinchi chaqiruv qo'shilardi.
//
// MUHIM: tanlov «qamrov»ni buzmasligi kerak. Model to'plam tuzishi
// uchun har BOSQICHdan (tozalash, toner, serum, krem, himoya) kamida
// bir nechta mahsulot ko'rishi shart — aks holda «akne» so'ragan
// odamga faqat davolovchi vosita chiqadi, tozalagich chiqmaydi.

// Ma'no tashimaydigan so'zlar — moslikda hisobga olinmaydi
const TOXTA = new Set([
  'va', 'yoki', 'uchun', 'bilan', 'men', 'menga', 'meni', 'mening', 'siz',
  'bu', 'shu', 'ular', 'bor', 'yoq', 'yaxshi', 'yomon', 'juda', 'ham',
  'nima', 'qanday', 'qaysi', 'necha', 'qachon', 'kerak', 'mumkin', 'bo', 'lsa',
  'salom', 'rahmat', 'iltimos', 'ayting', 'aytingchi', 'tavsiya', 'qiling',
  'mahsulot', 'vosita', 'krem', 'teri', 'yuz',
  'что', 'как', 'для', 'мне', 'это', 'the', 'for', 'and', 'what', 'how',
]);

/**
 * So'zlarga ajratadi va o'zbek yozuvini bir ko'rinishga keltiradi.
 * «yog'li», «yogli», «yoġli» — bitta so'z bo'lishi kerak.
 */
export function sozlar(matn) {
  return String(matn || '')
    .toLowerCase()
    .replace(/[‘’'`´ʻ]/g, '')          // o'g' → og
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .split(' ')
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !TOXTA.has(s));
}

/** Mahsulotning qidiriladigan matni. */
const mahsulotMatni = (p) => [
  p.nom_uz, p.name, p.brand, p.step,
  ...(p.concerns || []), ...(p.actives || []),
  ...(p.skin_types || []), ...(p.kalit_sozlar || []),
].filter(Boolean).join(' ');

/**
 * Mahsulotni savolga qanchalik mosligini baholaydi.
 * Muammo va faol modda mosligi eng qimmatli: aynan ular «nima
 * kerakligini» hal qiladi. Brend va nom mosligi esa odam aniq
 * mahsulotni so'raganda ishlaydi.
 */
function ball(p, kalitlar, profil) {
  if (!kalitlar.size) return 0;
  let b = 0;
  const tegdi = (royxat, ogirlik) => {
    for (const x of royxat || []) {
      const t = String(x || '').toLowerCase().replace(/[‘’'`´ʻ]/g, '');
      for (const k of kalitlar) if (t.includes(k) || k.includes(t)) { b += ogirlik; break; }
    }
  };
  tegdi(p.concerns, 4);
  tegdi(p.actives, 3);
  tegdi(p.kalit_sozlar, 3);
  tegdi([p.nom_uz, p.name, p.brand], 3);
  tegdi([p.step], 2);
  tegdi(p.skin_types, 1);

  // Profilga mos teri turi — kichik ustunlik
  if (profil?.teri_turi && (p.skin_types || [])
    .some((s) => String(s).toLowerCase().includes(String(profil.teri_turi).toLowerCase()))) b += 2;
  return b;
}

/** Omborda bori va ko'p sotilgani teng ballda ustun turadi. */
const tartib = (a, b) =>
  (b.__ball - a.__ball)
  || ((b.stock > 0) - (a.stock > 0))
  || ((b.sold_count || 0) - (a.sold_count || 0))
  || (a.id - b.id);

/**
 * Savolga mos katalog bo'lagi.
 *
 * @param {Array}  products
 * @param {object} o
 * @param {string} o.savol
 * @param {Array}  [o.tarix]   [{kim, matn}]
 * @param {object} [o.profil]
 * @param {number} [o.chegara] nechta mahsulot yuborilsin
 * @returns {{royxat: Array, jami: number, tanlandi: number}}
 */
export function katalogniTanla(products, { savol, tarix = [], profil, chegara = 60 } = {}) {
  const hammasi = (products || []).filter(Boolean);
  if (hammasi.length <= chegara) {
    return { royxat: hammasi, jami: hammasi.length, tanlandi: hammasi.length };
  }

  // Kalit so'zlar: savol + odamning oxirgi ikkita xabari. AI ning o'z
  // javoblari olinmaydi — ular kalit so'zlarni suyultiradi.
  const kontekst = [savol, ...tarix.filter((x) => x.kim !== 'ai').slice(-2).map((x) => x.matn)];
  const kalitlar = new Set(kontekst.flatMap(sozlar));

  for (const p of hammasi) p.__ball = ball(p, kalitlar, profil);
  const saralangan = [...hammasi].sort(tartib);

  // 1-qadam: eng mos mahsulotlar (ballsizlari emas)
  const tanlangan = [];
  const olingan = new Set();
  for (const p of saralangan) {
    if (tanlangan.length >= Math.floor(chegara * 0.7)) break;
    if (p.__ball <= 0) break;
    tanlangan.push(p); olingan.add(p.id);
  }

  // 2-qadam: QAMROV. Har bosqichdan kamida ikkitadan bo'lsin, aks
  // holda model to'liq parvarish tuza olmaydi.
  const bosqichlar = [...new Set(hammasi.map((p) => p.step).filter(Boolean))];
  for (const bosqich of bosqichlar) {
    const bor = tanlangan.filter((p) => p.step === bosqich).length;
    if (bor >= 2) continue;
    for (const p of saralangan) {
      if (tanlangan.length >= chegara) break;
      if (p.step !== bosqich || olingan.has(p.id)) continue;
      tanlangan.push(p); olingan.add(p.id);
      if (tanlangan.filter((x) => x.step === bosqich).length >= 2) break;
    }
  }

  // 3-qadam: qolgan joyni eng ko'p sotilganlar bilan to'ldiramiz
  for (const p of saralangan) {
    if (tanlangan.length >= chegara) break;
    if (!olingan.has(p.id)) { tanlangan.push(p); olingan.add(p.id); }
  }

  for (const p of hammasi) delete p.__ball;
  return { royxat: tanlangan, jami: hammasi.length, tanlandi: tanlangan.length };
}
