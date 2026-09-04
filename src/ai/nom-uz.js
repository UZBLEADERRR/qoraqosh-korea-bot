// Mahsulotning o'zbekcha nomi.
//
// «Heartleaf Pore Deep Cleansing Oil» — mijoz buni o'qiy olmaydi va
// nima ekanini tushunmaydi. «Anua Heartleaf teshik tozalovchi moy»
// esa darrov tushunarli.
//
// MUHIM: bu TARJIMA emas, MOSLASHTIRISH. Brend va mahsulot liniyasi
// (Heartleaf, Vita C, Purple Tone-Up) — bu identifikator, ular
// o'zgarmaydi. Faqat vazifani bildiruvchi qism o'zbekchaga o'giriladi.
// Aks holda mijoz qutidagi flakonni ilovadagi mahsulot bilan
// bog'lay olmaydi.
//
// Bir chaqiruvda 20 tagacha mahsulot: bittalab so'rash token va
// vaqtni behuda sarflaydi.
import { aiJson, aiBormi } from './index.js';

const SXEMA = {
  type: 'object',
  properties: {
    natijalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:  { type: 'integer' },
          nom: { type: 'string' },
        },
        required: ['id', 'nom'],
        propertyOrdering: ['id', 'nom'],
      },
    },
  },
  required: ['natijalar'],
  propertyOrdering: ['natijalar'],
};

const KORSATMA = `Sen — O'zbekistondagi Koreya kosmetikasi do'konining
matn muharririsan. Har mahsulotga O'ZBEKCHA nom yoz.

BU TARJIMA EMAS, MOSLASHTIRISH:
- BREND nomi o'zgarmaydi va nomga KIRMAYDI (u alohida ko'rsatiladi).
- Mahsulot LINIYASI nomi o'zgarmaydi: "Heartleaf", "Vita C",
  "Purple Tone-Up", "Snail Mucin", "Centella" — bular identifikator.
- Faqat VAZIFANI bildiruvchi qism o'zbekchaga o'giriladi:
  cleansing oil → gidrofil moy
  foam cleanser → yuvish ko‘pigi
  toner         → toner
  serum/essence → serum
  moisturizer / cream → namlovchi krem
  sun cream / sunscreen → quyoshdan himoya krem
  sheet mask    → niqob
  lip balm      → lab balzami
  eye cream     → ko‘z atrofi kremi
  peeling/scrub → pilling / skrab
  pore          → teshik
  deep          → chuqur
  hydrating / moisture → namlovchi
  soothing      → tinchlantiruvchi
  brightening   → yorituvchi
  anti-aging    → yoshartiruvchi
  acne / blemish → akneka qarshi

QOIDALAR:
- SPF50+, PA++++, 50 ml kabi belgilar O'ZGARMAYDI.
- Nom 45 belgidan oshmasin — kartochkada ikki qatorga sig'sin.
- Birinchi harf katta, qolgani odatdagidek. HAMMASI KATTA HARF EMAS.
- O'zbek lotin alifbosi: "o‘", "g‘", "sh", "ch" to‘g‘ri yozilsin.
- Ruscha yoki inglizcha jumla yozma.
- Mahsulot nima ekani noaniq bo'lsa — asl nomni o'zgartirmay qaytar.
- HECH NARSA O'YLAB TOPMA: nomda yo'q xususiyatni qo'shma.
- Faqat JSON qaytar.

Namunalar:
  "Heartleaf Pore Deep Cleansing Oil" (Anua, tozalash)
    → "Heartleaf teshik tozalovchi gidrofil moy"
  "UV SKIN+ Purple Tone-Up Sun Cream SPF50+ PA++++" (The Face Shop, himoya)
    → "Purple Tone-Up quyoshdan himoya krem SPF50+"
  "Vita C Sun Essence" (Boncept, himoya)
    → "Vita C quyoshdan himoya serumi"
  "Green Tea Foam Cleanser" (Daiso, tozalash)
    → "Yashil choy yuvish ko‘pigi"

MAHSULOTLAR (id | asl nom | brend | bosqich | hajm):
`;

const satr = (p) => [
  p.id,
  p.name,
  p.brand || '-',
  p.step || '-',
  p.volume || '-',
].join(' | ');

/**
 * Bir partiya mahsulot uchun o'zbekcha nom.
 * @param {Array} products [{id, name, brand, step, volume}]
 * @returns {Promise<Map<number,string>>}
 */
export async function nomUzAI(products) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });
  if (!products.length) return new Map();

  const j = await aiJson(
    [{ text: KORSATMA + products.map(satr).join('\n') }],
    SXEMA,
    { temperature: 0.2, maxTokens: 4096 },
  );

  const bor = new Map(products.map((p) => [p.id, p]));
  const xarita = new Map();
  for (const n of (Array.isArray(j.natijalar) ? j.natijalar : [])) {
    const id = Number(n.id);
    if (!bor.has(id)) continue;                    // o'ylab topilgan id
    const nom = tozala(n.nom);
    // Bo'sh yoki asl nom bilan bir xil bo'lsa saqlashning ma'nosi yo'q
    if (nom && nom.toLowerCase() !== String(bor.get(id).name || '').toLowerCase()) {
      xarita.set(id, nom);
    }
  }
  return xarita;
}

/** AI qaytargan nomni ishonchli holga keltiradi. */
export function tozala(xom) {
  let s = String(xom || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // Ba'zan model nomni qo'shtirnoqqa oladi
  s = s.replace(/^["'«»]+|["'«»]+$/g, '').trim();
  // HAMMASI KATTA HARF bo'lsa kartochkada qichqirayotgandek ko'rinadi
  if (s.length > 6 && s === s.toUpperCase() && /[A-ZА-Я]/.test(s)) {
    s = s.charAt(0) + s.slice(1).toLowerCase();
  }
  if (s.length > 70) s = s.slice(0, 69).replace(/\s+\S*$/, '') + '…';
  return s;
}
