// Buyurtma bosqichlari — bitta manba.
//
// Postgres enum'idagi TARTIB tarixiy ('omborda' 'yolda' dan oldin qo'shilgan),
// lekin haqiqiy yo'l boshqacha. Enum tartibini o'zgartirish uchun ustunni
// qayta qurish kerak bo'lardi — buning o'rniga ko'rsatiladigan tartib shu
// yerda yozilgan. Admin paneli ham, mijozga ko'rinadigan jarayon ham
// SHU ro'yxatdan oladi.

export const BOSQICHLAR = [
  { kalit: 'yangi',            nom: 'Yangi',                  emoji: '🆕',
    izoh: 'Buyurtma tushdi, to‘lov kutilmoqda' },
  { kalit: 'tasdiqlangan',     nom: 'To‘lov tasdiqlandi',     emoji: '✅',
    izoh: 'Chek tekshirildi, xaridga qo‘yildi' },
  { kalit: 'qadoqlanmoqda',    nom: 'Koreyada qadoqlanmoqda', emoji: '📦',
    izoh: 'Mahsulot olindi va qadoqlanmoqda' },
  { kalit: 'korea_jonatildi',  nom: 'Koreyadan jo‘natildi',   emoji: '✈️',
    izoh: 'O‘zbekistonga yo‘lga chiqdi' },
  { kalit: 'yolda',            nom: 'Yo‘lda',                 emoji: '🌍',
    izoh: 'Xalqaro yetkazib berishda' },
  { kalit: 'omborda',          nom: 'O‘zbekiston omborida',   emoji: '🏢',
    izoh: 'Bojxonadan o‘tdi, omborga yetib keldi' },
  { kalit: 'pochta_jonatildi', nom: 'Pochtadan jo‘natildi',   emoji: '📮',
    izoh: 'Mijoz manziliga jo‘natildi' },
  { kalit: 'yetkazildi',       nom: 'Yetib keldi',            emoji: '🎉',
    izoh: 'Mijoz qo‘liga tegdi' },
];

/** Bekor qilish har qanday bosqichda mumkin — u yo'lning bir qismi emas. */
export const BEKOR = { kalit: 'bekor', nom: 'Bekor qilindi', emoji: '❌', izoh: '' };

export const HOLATLAR = [...BOSQICHLAR.map((b) => b.kalit), BEKOR.kalit];

const KARTA = new Map([...BOSQICHLAR, BEKOR].map((b) => [b.kalit, b]));

export const bosqich = (kalit) => KARTA.get(kalit) || BEKOR;
export const bosqichNomi = (kalit) => bosqich(kalit).nom;
export const bosqichEmoji = (kalit) => bosqich(kalit).emoji;

/** Yo'ldagi o'rni (0 dan). Bekor bo'lsa -1. */
export const tartib = (kalit) => BOSQICHLAR.findIndex((b) => b.kalit === kalit);

/** Shu bosqichdan keyin keladigani. Oxirgisi bo'lsa null. */
export function keyingi(kalit) {
  const i = tartib(kalit);
  return i >= 0 && i < BOSQICHLAR.length - 1 ? BOSQICHLAR[i + 1] : null;
}

/**
 * Mijozga ko'rinadigan jarayon: o'tilgan bosqichlar ✅, joriysi 🔵, qolgani ⚪.
 * @param {string} joriy
 * @returns {string} HTML
 */
export function jarayonMatni(joriy) {
  if (joriy === 'bekor') return `❌ <b>Bekor qilindi</b>`;
  const n = tartib(joriy);
  return BOSQICHLAR.map((b, i) => {
    if (i < n)  return `✅ <s>${b.nom}</s>`;
    if (i === n) return `🔵 <b>${b.nom}</b>`;
    return `⚪️ <i>${b.nom}</i>`;
  }).join('\n');
}
