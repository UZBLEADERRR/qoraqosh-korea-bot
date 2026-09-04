// Qidiruv kalit so'zlari.
//
// Muammo: katalogdagi nom inglizcha yoki koreyscha ("Perfect Whip",
// "수분 크림"), odam esa o'z tilida qidiradi — "penka", "пенка",
// "yuz yuvish uchun ko'pik". Nom bo'yicha qidiruv hech narsa topmaydi.
//
// Yechim: har mahsulotga odam YOZISHI MUMKIN bo'lgan so'zlar ro'yxati
// saqlanadi. Bir chaqiruvda 25 tagacha mahsulot ishlanadi — bittalab
// so'rash token va vaqtni behuda sarflaydi.
import { aiJson, aiBormi } from './index.js';

const SXEMA = {
  type: 'object',
  properties: {
    natijalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:     { type: 'integer' },
          sozlar: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'sozlar'],
        propertyOrdering: ['id', 'sozlar'],
      },
    },
  },
  required: ['natijalar'],
  propertyOrdering: ['natijalar'],
};

const KORSATMA = `Sen — O'zbekistondagi Koreya kosmetikasi do'konining qidiruv
muhandisisan. Har mahsulot uchun ODAM QIDIRUVGA YOZISHI MUMKIN bo'lgan
so'zlarni ro'yxat qilib ber.

Har mahsulotga 8 tadan 16 tagacha so'z, SHU TILLARDA:
- o'zbekcha (lotin): "ko'pik", "yuvish geli", "namlovchi krem"
- ruscha KIRILL: "пенка", "гель для умывания", "крем"
- ruscha LOTIN yozuvi: "penka", "gel dlya umyvaniya", "krem"
- inglizcha: "foam cleanser", "moisturizer"
- koreyscha bo'lsa foydali: "크림"

Shuningdek qo'sh: mahsulot turi (penka, toner, serum, krem, maska,
patch, spf, skrab, balzam, tonik...), qaysi muammoga ishlashi
(akne, prishchi, прыщи, quruqlik, sukhost, morshchiny, ajin, dog,
pigmentatsiya), va odamlar ishlatadigan qisqa nomlar.

QOIDA:
- Har so'z KICHIK harfda, 1-3 so'zdan iborat.
- Mahsulot nomini yoki brendni QAYTA yozma — ular allaqachon qidiriladi.
- O'ylab topma: mahsulot krem bo'lsa "shampun" deb yozma.
- Faqat JSON qaytar.

MAHSULOTLAR (id | brend nom | toifa | bosqich | muammo | tavsif):
`;

const satr = (p) => [
  p.id,
  `${p.brand || ''} ${p.name}`.trim(),
  p.toifa || '-',
  p.step || '-',
  (p.concerns || []).join(',') || '-',
  String(p.description || '').slice(0, 120) || '-',
].join(' | ');

/**
 * Bir partiya mahsulot uchun kalit so'zlar.
 * @param {Array} products [{id,name,brand,toifa,step,concerns,description}]
 * @returns {Promise<Map<number,string[]>>}
 */
export async function kalitSozlarAI(products) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });
  if (!products.length) return new Map();

  const j = await aiJson(
    [{ text: KORSATMA + products.map(satr).join('\n') }],
    SXEMA,
    { temperature: 0.3, maxTokens: 4096, muhim: true },
  );

  const bor = new Set(products.map((p) => p.id));
  const xarita = new Map();
  for (const n of (Array.isArray(j.natijalar) ? j.natijalar : [])) {
    const id = Number(n.id);
    if (!bor.has(id)) continue;                       // o'ylab topilgan id
    const sozlar = (Array.isArray(n.sozlar) ? n.sozlar : [])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter((s) => s.length > 1 && s.length <= 40)
      .slice(0, 24);
    if (sozlar.length) xarita.set(id, [...new Set(sozlar)]);
  }
  return xarita;
}
