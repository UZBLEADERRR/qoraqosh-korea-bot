// Admin agenti — do'kon haqidagi savolga javob beradi va topshiriqni
// bosqichma-bosqich bajaradi.
//
// Ishlash tartibi. Model bir marta emas, BIR NECHA QADAM ishlaydi:
//   savol → vosita tanlaydi → natijani ko'radi → yana vosita yoki javob.
// Aynan shu «qiyin topshiriqni bo'lib bajarish» degani. Masalan
// «bir xil tovarlarni tozala»:
//   1-qadam: takrorlar() — nima takrorlanganini KO'RADI
//   2-qadam: mahsulot_yop(idlar) — REJA sifatida taklif qiladi
//   3-qadam: admin tasdiqlaydi — shundagina bajariladi.
//
// ENG MUHIM QOIDA: model bazaga o'zi yozmaydi. Yozadigan vosita
// tanlansa u DARROV bajarilmaydi — admin ko'rib tasdiqlaguncha kutadi.
// Sabab oddiy: «o'chir» so'zi noto'g'ri tushunilsa katalog yo'qoladi
// va uni qaytarib bo'lmaydi.
import { aiJson, aiBormi } from './index.js';
import { vositalarMatni } from '../services/admin-vositalar.js';

const SXEMA = {
  type: 'object',
  properties: {
    fikr:      { type: 'string' },
    amal:      { type: 'string', enum: ['vosita', 'javob'] },
    vosita:    { type: 'string' },
    argumentlar_json: { type: 'string' },
    javob:     { type: 'string' },
    reja_izoh: { type: 'string' },
    takliflar: { type: 'array', items: { type: 'string' } },
  },
  required: ['fikr', 'amal', 'vosita', 'argumentlar_json', 'javob', 'reja_izoh', 'takliflar'],
  propertyOrdering: ['fikr', 'amal', 'vosita', 'argumentlar_json', 'javob',
                     'reja_izoh', 'takliflar'],
};

const KORSATMA = () => `Sen — KiOVO Koreya kosmetikasi do'konining admin
yordamchisisan. Do'kon egasi senga savol beradi yoki topshiriq qo'yadi.
Sen bazadan ma'lumot olasan va aniq javob berasan.

═══ VOSITALAR ═══
Bazaga O'ZING SQL yozmaysan. Faqat shu vositalardan foydalanasan:

${vositalarMatni()}

═══ QANDAY ISHLAYSAN ═══
Har qadamda BITTA narsa qilasan:
  amal = "vosita" → vosita nomini va argumentlarini berasan.
      argumentlar_json — JSON obyekt MATN ko'rinishida, masalan
      {"qidiruv":"krem","chegara":20}. Argument kerak bo'lmasa {}.
  amal = "javob"  → ishing tugadi, javobni yozasan.

Vosita natijasini ko'rgach yana vosita chaqirishing yoki javob
berishing mumkin. Ma'lumot yetarli bo'lsa CHO'ZMA — javob ber.

═══ YOZISH VOSITALARI ═══
[YOZISH] deb belgilangan vosita bazani O'ZGARTIRADI. Uni tanlaganingda:
- reja_izoh ga NIMA o'zgarishini aniq yoz: nechta yozuv, qaysilari.
- Bu darrov bajarilmaydi — admin tasdiqlaydi. Shuning uchun taklifing
  TO'LIQ va ANIQ bo'lsin.
- O'chirishdan oldin ALBATTA o'qish vositasi bilan tekshir. Ko'rmasdan
  o'chirish taklif qilma.
- Ikkilansang "mahsulot_ochir" emas, "mahsulot_yop" ni tanla:
  yopilgan mahsulotni qaytarish mumkin, o'chirilganini yo'q.

═══ JAVOB ═══
- O'ZBEK tilida, chatda o'qiladi.
- Raqamlarni ANIQ ayt: "28 ta mahsulot", "3 ta takror guruh".
- Ro'yxat so'ralsa "• " bilan yoz. Uzun ro'yxatni qisqartir va
  nechtasi ko'rsatilganini ayt.
- **qalin** bilan muhim raqamni ajrat.
- HECH NARSA O'YLAB TOPMA. Vosita qaytarmagan raqamni yozma.
  Ma'lumot yo'q bo'lsa "ma'lumot topilmadi" deb ayt.
- takliflar: admin keyin so'rashi mumkin bo'lgan 2-3 ta qisqa savol.

Faqat JSON qaytar.`;

const q = (v, n) => String(v ?? '').slice(0, n);

/**
 * Agentning bitta qadami.
 * @param {string} savol
 * @param {Array} qadamlar  [{vosita, argumentlar, natija}]
 * @param {Array} tarix     [{kim, matn}]
 */
export async function keyingiQadam(savol, qadamlar = [], tarix = []) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });

  const oldingi = tarix.length
    ? '\n\nOLDINGI SUHBAT:\n' + tarix.slice(-6)
        .map((x) => `${x.kim === 'ai' ? 'Yordamchi' : 'Admin'}: ${q(x.matn, 300)}`).join('\n')
    : '';

  // Bajarilgan qadamlar natijasi — modelning «ko'rgani» shu.
  // Natija katta bo'lishi mumkin, shuning uchun qisqartiriladi:
  // to'liq ro'yxat modelga emas, ADMINGA kerak.
  const bajarilgan = qadamlar.length
    ? '\n\nBAJARILGAN QADAMLAR:\n' + qadamlar.map((k, i) =>
        `${i + 1}. ${k.vosita}(${JSON.stringify(k.argumentlar)})\n`
        + `   natija: ${q(JSON.stringify(k.natija), 3000)}`).join('\n')
    : '';

  const j = await aiJson(
    [{ text: `${KORSATMA()}${oldingi}${bajarilgan}\n\nADMIN SAVOLI: ${savol}` }],
    SXEMA,
    { temperature: 0.2, maxTokens: 3072, muhim: true, qayerda: 'admin-agent' },
  );

  let argumentlar = {};
  try {
    const x = JSON.parse(j.argumentlar_json || '{}');
    if (x && typeof x === 'object' && !Array.isArray(x)) argumentlar = x;
  } catch { /* noto'g'ri JSON — bo'sh argument bilan davom etamiz */ }

  return {
    fikr:   q(j.fikr, 300),
    amal:   j.amal === 'vosita' ? 'vosita' : 'javob',
    vosita: q(j.vosita, 40),
    argumentlar,
    javob:  q(j.javob, 2500),
    reja_izoh: q(j.reja_izoh, 600),
    takliflar: (Array.isArray(j.takliflar) ? j.takliflar : [])
      .map((x) => q(x, 50)).filter(Boolean).slice(0, 3),
  };
}
