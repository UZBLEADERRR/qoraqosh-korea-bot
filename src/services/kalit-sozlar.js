// Mahsulot qidiruvining kalit so'zlari.
//
// Ikki manba:
//  1) QOIDA — toifa, bosqich va muammodan kelib chiqadigan so'zlar.
//     AI kaliti bo'lmasa ham ishlaydi, token sarflamaydi, bir zumda.
//  2) AI    — mahsulotning o'ziga xos so'zlari (partiyalab, arzon).
// Ikkalasi qo'shiladi: qoida "poyabzal", AI esa "aynan shu tuflining"
// so'zlarini beradi.
import { sorov, qatorlar } from '../db.js';
import { kalitSozlarAI } from '../ai/kalit-sozlar.js';
import { aiBormi } from '../ai/index.js';

// ---------- 1) Qoidaga asoslangan so'zlar ----------
// Har toifa uchun: o'zbekcha, ruscha (kirill), ruscha (lotin), inglizcha.
// Odam qaysi birini yozsa ham topsin.
const TOIFA_SOZ = {
  tozalash: ['penka', 'пенка', 'kopik', 'ko‘pik', 'yuvish geli', 'гель для умывания',
             'gel dlya umyvaniya', 'tozalagich', 'очищающее', 'foam cleanser', 'cleanser',
             'umyvanie', 'умывание', 'gidrofil moy', 'гидрофильное масло', 'cleansing oil'],
  toner:    ['toner', 'тонер', 'tonik', 'тоник', 'lotion'],
  serum:    ['serum', 'сыворотка', 'syvorotka', 'sivorotka', 'essensiya', 'эссенция', 'essence',
             'ampula', 'ампула', 'serumi'],
  krem:     ['krem', 'крем', 'cream', 'namlovchi krem', 'увлажняющий крем',
             'uvlazhnyayushiy krem', 'moisturizer', 'emulsiya', 'эмульсия'],
  niqob:    ['maska', 'маска', 'niqob', 'mask', 'patch', 'патчи', 'patchi',
             'skrab', 'скраб', 'scrub', 'pilling', 'пилинг'],
  quyosh:   ['spf', 'спф', 'quyoshdan himoya', 'солнцезащитный крем', 'solntsezashitnyy',
             'sunscreen', 'sanskrin', 'санскрин', 'krem ot solnca'],
  lab:      ['lab balzam', 'бальзам для губ', 'balzam dlya gub', 'lip balm', 'lab uchun'],
  toplam:   ['toplam', 'набор', 'nabor', 'set', 'komplekt', 'комплект'],
  ichimlik: ['kollagen', 'коллаген', 'collagen', 'vitamin', 'витамин', 'ichimlik',
             'напиток', 'napitok', 'ichki qabul', 'бад'],
};

const BOSQICH_SOZ = {
  tozalash: TOIFA_SOZ.tozalash,
  toner:    TOIFA_SOZ.toner,
  davolash: TOIFA_SOZ.serum,
  namlash:  TOIFA_SOZ.krem,
  himoya:   TOIFA_SOZ.quyosh,
  qoshimcha: TOIFA_SOZ.niqob,
  ichki:    TOIFA_SOZ.ichimlik,
};

const MUAMMO_SOZ = {
  akne:      ['akne', 'акне', 'prishi', 'прыщи', 'prishchi', 'husnbuzar', 'ugri', 'угри', 'acne'],
  teshik:    ['teshik', 'pora', 'поры', 'qora nuqta', 'черные точки', 'blackhead'],
  yoglilik:  ['yogli teri', 'жирная кожа', 'jirnaya koja', 'oily skin', 'yaltirash'],
  quruqlik:  ['quruq teri', 'сухая кожа', 'suhaya koja', 'dry skin', 'namlash',
              'увлажнение', 'uvlajnenie', 'uvlazhnenie'],
  qizarish:  ['qizarish', 'покраснение', 'pokrasnenie', 'redness', 'yalliglanish'],
  dog:       ['dog', 'пигментация', 'pigmentaciya', 'pigmentatsiya', 'пятна', 'pyatna', 'dark spot', 'sepkil'],
  ajin:      ['ajin', 'морщины', 'morshiny', 'morshini', 'morshchiny', 'wrinkle', 'anti age', 'антивозрастной'],
  xiralik:   ['yorqinlik', 'сияние', 'siyanie', 'brightening', 'oqartirish', 'отбеливание'],
  sezgirlik: ['sezgir teri', 'чувствительная кожа', 'chuvstvitelnaya koja', 'sensitive'],
  quyosh:    ['quyoshdan', 'от солнца', 'ot solnca', 'uv'],
};

/** AI'siz ham ishlaydigan asosiy so'zlar. */
export function qoidadanSozlar(p) {
  const s = new Set();
  const qosh = (r) => (r || []).forEach((x) => s.add(x));
  qosh(TOIFA_SOZ[p.toifa]);
  qosh(BOSQICH_SOZ[p.step]);
  for (const c of (p.concerns || [])) qosh(MUAMMO_SOZ[c]);
  for (const a of (p.actives || [])) if (a) s.add(String(a).toLowerCase());
  return [...s];
}

// ---------- 2) To'ldirish ----------
const PARTIYA = 25;

async function saqla(id, sozlar) {
  await sorov(`update products set kalit_sozlar = $2, updated_at = now() where id = $1`,
    [id, sozlar.slice(0, 40)]);
}

/**
 * Kalit so'zi yo'q mahsulotlarni to'ldiradi.
 * @param {object}  o
 * @param {boolean} [o.hammasi]  true bo'lsa mavjudlari ham qayta yoziladi
 * @param {number}  [o.chegara]  bir yurishda nechta mahsulot
 * @param {boolean} [o.aiSiz]    faqat qoida bo'yicha (token sarflamaydi)
 */
export async function kalitlarniToldir({ hammasi = false, chegara = 300, aiSiz = false } = {}) {
  const royxat = await qatorlar(
    `select p.id, p.name, p.brand, p.step, p.concerns, p.actives, p.description,
            c.slug as toifa
       from products p
       left join categories c on c.id = p.category_id
      where p.is_active ${hammasi ? '' : 'and coalesce(array_length(p.kalit_sozlar,1),0) = 0'}
      order by p.id
      limit $1`, [Math.max(1, Math.min(2000, chegara))]);

  if (!royxat.length) return { jami: 0, ai: 0, qoida: 0 };

  // Avval qoida — AI yiqilsa ham qidiruv ishlaydigan bo'lib qoladi
  const qoida = new Map(royxat.map((p) => [p.id, qoidadanSozlar(p)]));

  let aiSoni = 0;
  if (!aiSiz && aiBormi()) {
    for (let i = 0; i < royxat.length; i += PARTIYA) {
      const bolak = royxat.slice(i, i + PARTIYA);
      try {
        const xarita = await kalitSozlarAI(bolak);
        for (const [id, sozlar] of xarita) {
          qoida.set(id, [...new Set([...(qoida.get(id) || []), ...sozlar])]);
          aiSoni += 1;
        }
      } catch (e) {
        // Bir partiya yiqilsa qolganini davom ettiramiz: yarim to'ldirilgan
        // qidiruv umuman to'ldirilmaganidan yaxshi
        console.warn('KALIT SO‘ZLAR AI xatosi:', e.message?.slice(0, 140));
      }
    }
  }

  for (const [id, sozlar] of qoida) await saqla(id, sozlar);
  return { jami: royxat.length, ai: aiSoni, qoida: royxat.length - aiSoni };
}

/** Bitta mahsulot uchun (import oxirida chaqiriladi). */
export async function kalitlarniQosh(id) {
  const [p] = await qatorlar(
    `select p.id, p.name, p.brand, p.step, p.concerns, p.actives, p.description,
            c.slug as toifa
       from products p left join categories c on c.id = p.category_id
      where p.id = $1`, [id]);
  if (!p) return;
  let sozlar = qoidadanSozlar(p);
  if (aiBormi()) {
    try {
      const x = await kalitSozlarAI([p]);
      sozlar = [...new Set([...sozlar, ...(x.get(p.id) || [])])];
    } catch { /* qoida yetarli */ }
  }
  await saqla(p.id, sozlar);
}
