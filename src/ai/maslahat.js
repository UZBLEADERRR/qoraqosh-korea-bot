// AI maslahatchi — odam o'z so'zi bilan yozadi, katalogdan javob topiladi.
//
// «Yuz skaneri» rasm talab qiladi; bu yerda esa savol matn bilan keladi:
// «akne ko'p», «soqol olgandan keyin achishadi», «tuk oluvchi bormi».
// Model FAQAT katalogdagi mahsulotni tavsiya qiladi — yo'q narsani
// o'ylab topsa, odam buyurtma bera olmaydi va ishonch yo'qoladi.
import { aiJson, aiBormi } from './index.js';

const SXEMA = {
  type: 'object',
  properties: {
    javob:   { type: 'string' },
    turi:    { type: 'string', enum: ['tavsiya', 'yoq', 'tibbiy', 'mavzudan_tashqari'] },
    savol:   { type: 'string' },
    tavsiya: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'integer' },
          sabab:      { type: 'string' },
        },
        required: ['product_id', 'sabab'],
        propertyOrdering: ['product_id', 'sabab'],
      },
    },
    takliflar: { type: 'array', items: { type: 'string' } },
  },
  required: ['javob', 'turi', 'savol', 'tavsiya', 'takliflar'],
  propertyOrdering: ['javob', 'turi', 'savol', 'tavsiya', 'takliflar'],
};

const KORSATMA = `Sen — KiOVO do'konining maslahatchisisan. Odam o'z muammosini
yozadi, sen unga MANA SHU KATALOGDAN mos mahsulot topib berasan.

QOIDALAR:
- Faqat quyidagi ro'yxatdagi mahsulotni tavsiya qil. Ro'yxatda bo'lmagan
  narsani O'YLAB TOPMA. Mos mahsulot yo'q bo'lsa turi = "yoq" va tavsiya
  bo'sh bo'lsin — "bizda hozircha bunday mahsulot yo'q" deb ochiq ayt.
- 1 tadan 4 tagacha mahsulot. Ko'p tavsiya odamni chalg'itadi.
- sabab: NEGA aynan shu mahsulot aynan SHU odamga kerakligi, 1 jumla.
  Tarkibidagi qaysi modda yordam berishini ayt.
- javob: 2-4 jumla, iliq va sodda tilda, "siz" deb murojaat qil.
  Sotuvchi tili emas — do'stona maslahat. Emoji ishlatma.
- takliflar: odam keyin so'rashi mumkin bo'lgan 2-3 ta qisqa savol
  (har biri 4 so'zgacha, masalan "Quruq teriga nima mos?").

SOG'LIQ MASALALARI — ehtiyot bo'l:
- Og'riq, jarohat, yallig'lanish, allergiya, teri kasalligi haqida so'ralsa:
  turi = "tibbiy". Dori tavsiya QILMA va tashxis qo'yma. Shifokorga
  murojaat qilishni ayt. Katalogda parvarish uchun mos narsa bo'lsa
  (masalan tinchlantiruvchi krem) uni "davo emas, parvarish" deb qo'shsang
  bo'ladi; bo'lmasa tavsiyani bo'sh qoldir.
- Kosmetika va parvarishga umuman aloqasi yo'q savol bo'lsa
  (masalan telefon, taksi): turi = "mavzudan_tashqari", muloyim rad et.

Butun javob O'ZBEK tilida (lotin alifbosida). Faqat JSON qaytar.

KATALOG (id|brend nom|bosqich|muammo|teri|faol modda|narx):
`;

const katalogMatni = (products) => products.map((p) =>
  `${p.id}|${p.brand ?? ''} ${p.name}|${p.step ?? '-'}|${(p.concerns || []).join(',') || '-'}`
  + `|${(p.skin_types || []).join(',') || '-'}|${(p.actives || []).join(',') || '-'}|${p.price}`
).join('\n');

/**
 * @param {string} savol            odam yozgani
 * @param {Array}  products         katalog
 * @param {Array}  [tarix]          [{kim:'odam'|'ai', matn}] — oxirgi bir necha xabar
 * @returns {Promise<{javob:string, turi:string, tavsiya:Array, takliflar:Array}>}
 */
export async function maslahatBer(savol, products, tarix = []) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });

  const oldingi = tarix.length
    ? '\n\nOLDINGI SUHBAT (eng oxirgisi pastda):\n'
      + tarix.slice(-6).map((x) => `${x.kim === 'ai' ? 'Maslahatchi' : 'Mijoz'}: ${x.matn}`).join('\n')
    : '';

  const j = await aiJson(
    [{ text: `${KORSATMA}${katalogMatni(products)}${oldingi}\n\nMIJOZ SAVOLI: ${savol}` }],
    SXEMA,
    { temperature: 0.5, maxTokens: 2048 },
  );

  const bor = new Set(products.map((p) => p.id));
  const s = (v, n) => String(v ?? '').slice(0, n);

  return {
    javob: s(j.javob, 700) || 'Savolingizni boshqacharoq yozib ko‘ring.',
    turi: ['tavsiya', 'yoq', 'tibbiy', 'mavzudan_tashqari'].includes(j.turi) ? j.turi : 'tavsiya',
    // Model o'ylab topgan id larni TASHLAYMIZ — savatga solib bo'lmaydigan
    // mahsulotni ko'rsatish eng yomon tajriba
    tavsiya: (Array.isArray(j.tavsiya) ? j.tavsiya : [])
      .filter((t) => bor.has(Number(t.product_id)))
      .map((t) => ({ product_id: Number(t.product_id), sabab: s(t.sabab, 200) }))
      .slice(0, 4),
    takliflar: (Array.isArray(j.takliflar) ? j.takliflar : [])
      .map((x) => s(x, 40)).filter(Boolean).slice(0, 3),
  };
}
