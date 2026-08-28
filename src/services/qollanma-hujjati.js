// Mijozga qutiga qo'shib yuboriladigan qo'llanma (.docx).
//
// Har buyurtma uchun alohida: mijoz aynan O'ZI olgan mahsulotlarni
// qanday tartibda va qanday ishlatishini o'qiydi. Bu shikoyatni kamaytiradi
// va qayta xaridga olib keladi — odam mahsulotni to'g'ri ishlatsa natija
// ko'radi.
import { qatorlar } from '../db.js';
import { docx } from '../lib/docx.js';
import { sozlama } from '../db.js';
import { brendNomi } from '../lib/brend.js';

// Parvarish tartibi — qutidagi mahsulotlar SHU tartibda joylashtiriladi
const BOSQICH_TARTIB = ['tozalash', 'toner', 'davolash', 'namlash', 'himoya', 'qoshimcha'];
const BOSQICH_NOM = {
  tozalash: '1-qadam · Tozalash',
  toner:    '2-qadam · Toner',
  davolash: '3-qadam · Davolash (serum)',
  namlash:  '4-qadam · Namlash',
  himoya:   '5-qadam · Quyoshdan himoya',
  qoshimcha:'Qo‘shimcha',
};
const BOSQICH_IZOH = {
  tozalash: 'Yuzni iliq suv bilan ho‘llang, vositani qo‘lda ko‘piklantirib, '
          + 'aylanma harakatlar bilan 30–60 soniya massaj qiling va yuving.',
  toner:    'Toza paxta yoki kaftga oling va nam teriga yengil urib singdiring. '
          + 'Ishqalamang.',
  davolash: 'Bir necha tomchi oling, muammoli sohalarga surting. '
          + 'Singishini kuting, keyin keyingi bosqichga o‘ting.',
  namlash:  'Teri hali nam turganda surting — namlik ichkarida qulflanadi.',
  himoya:   'Ertalabki parvarishning ENG OXIRGI bosqichi. Har 2–3 soatda '
          + 'yangilang, bulutli kunda ham qo‘llang.',
  qoshimcha:'Haftasiga 1–2 marta, asosiy parvarishdan keyin.',
};

/** Bitta buyurtma uchun bloklar. Faylga o'ralmagan — qayta ishlatiladi. */
async function buyurtmaBloklari(buyurtma, birinchimi) {
  const idlar = (buyurtma.items || []).map((i) => Number(i.product_id)).filter(Boolean);
  const mahsulotlar = idlar.length
    ? await qatorlar(
        `select id, name, brand, step, volume, description, usage_text,
                ingredients, warnings, actives, skin_types
           from products where id = any($1)`, [idlar])
    : [];

  const [brend, tel, konsult] = await Promise.all([
    brendNomi(),
    sozlama('menejer_telefon', ''),
    sozlama('konsultatsiya_user', ''),
  ]);
  const toza = (v) => String(v ?? '').replace(/"/g, '').trim();

  // Bosqich bo'yicha tartiblaymiz — mijoz ketma-ketlikni ko'rsin
  const tartib = (p) => {
    const i = BOSQICH_TARTIB.indexOf(String(p.step || 'qoshimcha'));
    return i < 0 ? 99 : i;
  };
  const royxat = [...mahsulotlar].sort((a, b) => tartib(a) - tartib(b));

  const bloklar = [];
  if (!birinchimi) bloklar.push({ tur: 'sahifa' });
  bloklar.push(
    { tur: 'sarlavha', matn: `${brend} — parvarish qo‘llanmasi` },
    { tur: 'kichik',   matn: `Buyurtma ${buyurtma.order_no || '—'} · ${royxat.length} ta mahsulot`
      + (buyurtma.customer_name ? `  ·  ${buyurtma.customer_name}` : '') },
    { tur: 'bosh' },
    { tur: 'matn', matn:
      'Xaridingiz uchun rahmat! Quyida siz olgan mahsulotlarni QANDAY TARTIBDA '
      + 'va qanday ishlatish yozilgan. Tartibni buzmang — har bosqich '
      + 'keyingisining ta’sirini kuchaytiradi.' },
    { tur: 'bosh' },
  );

  // Qisqacha ketma-ketlik jadvali
  if (royxat.length) {
    bloklar.push({ tur: 'jadval',
      sarlavhalar: ['Tartib', 'Bosqich', 'Mahsulot'],
      enlar: [900, 2600, 6000],
      satrlar: royxat.map((p, i) => [
        String(i + 1),
        (BOSQICH_NOM[p.step] || 'Qo‘shimcha').replace(/^\d+-qadam · /, ''),
        `${p.brand ? p.brand + ' ' : ''}${p.name}`,
      ]),
    });
    bloklar.push({ tur: 'bosh' });
  }

  // Har mahsulot uchun batafsil
  for (const p of royxat) {
    bloklar.push({ tur: 'sahifa' });
    bloklar.push({ tur: 'sarlavha', matn: `${p.brand ? p.brand + ' · ' : ''}${p.name}` });
    bloklar.push({ tur: 'kichik', matn:
      [BOSQICH_NOM[p.step] || 'Qo‘shimcha', p.volume].filter(Boolean).join('  ·  ') });
    bloklar.push({ tur: 'bosh' });

    if (p.description) {
      bloklar.push({ tur: 'matn', matn: `NIMA QILADI\n${p.description}` });
      bloklar.push({ tur: 'bosh' });
    }

    // Mahsulotning o'z ko'rsatmasi bo'lsa o'shani, bo'lmasa bosqich ko'rsatmasi
    const qanday = p.usage_text || BOSQICH_IZOH[p.step] || '';
    if (qanday) {
      bloklar.push({ tur: 'matn', matn: `QANDAY ISHLATILADI\n${qanday}` });
      bloklar.push({ tur: 'bosh' });
    }

    if (p.actives?.length) {
      bloklar.push({ tur: 'kichik', matn: `Faol moddalar: ${p.actives.join(', ')}` });
    }
    if (p.skin_types?.length) {
      bloklar.push({ tur: 'kichik', matn: `Kimga mos: ${p.skin_types.join(', ')} teri` });
    }
    if (p.warnings) {
      bloklar.push({ tur: 'bosh' });
      bloklar.push({ tur: 'matn', matn: `EHTIYOT BO‘LING\n${p.warnings}` });
    }
    if (p.ingredients) {
      bloklar.push({ tur: 'bosh' });
      bloklar.push({ tur: 'kichik', matn: `Tarkibi: ${p.ingredients}` });
    }
  }

  // Umumiy maslahatlar
  bloklar.push({ tur: 'sahifa' });
  bloklar.push({ tur: 'sarlavha', matn: 'Umumiy qoidalar' });
  bloklar.push({ tur: 'bosh' });
  for (const q of [
    'Yangi mahsulotni birdaniga hammasini boshlamang — 2–3 kunda bittadan qo‘shing. '
    + 'Shunda teri qaysi vositaga qanday javob berayotganini bilasiz.',
    'Har doim ENG SUYUQ vositadan eng quyuqiga qarab boring: toner → serum → krem.',
    'Quyoshdan himoya (SPF) — eng muhim bosqich. Usiz qolgan parvarishning '
    + 'yarim foydasi yo‘qoladi.',
    'Natija 4–8 haftada ko‘rinadi. Birinchi haftada o‘zgarish bo‘lmasa — bu normal.',
    'Yangi vositani birinchi marta ishlatishdan oldin bilak ichiga oz miqdorda '
    + 'surtib, 24 soat kuting.',
  ]) {
    bloklar.push({ tur: 'matn', matn: `•  ${q}` });
    bloklar.push({ tur: 'bosh' });
  }

  bloklar.push({ tur: 'bosh' });
  bloklar.push({ tur: 'matn', matn: 'SAVOLINGIZ BORMI?' });
  if (toza(tel)) bloklar.push({ tur: 'kichik', matn: `Telefon: ${toza(tel)}` });
  if (toza(konsult)) bloklar.push({ tur: 'kichik', matn: `Telegram: @${toza(konsult)}` });
  bloklar.push({ tur: 'bosh' });
  bloklar.push({ tur: 'kichik', matn:
    'Bu qo‘llanma kosmetologik tavsiya — tibbiy tashxis emas. '
    + 'Teri kasalligi shubhasi bo‘lsa dermatologga murojaat qiling.' });

  return bloklar;
}

/** Bitta buyurtma uchun qo'llanma. */
export async function qollanmaHujjati(buyurtma) {
  return {
    bayt: docx(await buyurtmaBloklari(buyurtma, true)),
    nom: `qollanma-${buyurtma.order_no || 'buyurtma'}.docx`,
  };
}

/**
 * Butun partiya uchun BITTA fayl: har buyurtmaning qo'llanmasi yangi
 * sahifadan boshlanadi. Admin hammasini birdan print qilib, har birini
 * o'z qutisiga soladi.
 */
export async function partiyaQollanmasi(partiya, buyurtmalar) {
  const bloklar = [];
  for (let i = 0; i < buyurtmalar.length; i++) {
    bloklar.push(...await buyurtmaBloklari(buyurtmalar[i], i === 0));
  }
  return {
    bayt: docx(bloklar),
    nom: `qollanma-${partiya?.raqam || 'partiya'}.docx`,
    soni: buyurtmalar.length,
  };
}
