// Admin botga skrinshot tashlaydi — AI mahsulotni tanib, katalog
// kartochkasini to'ldiradi VA narxni o'zi hisoblaydi.
//
// Nega alohida modul: productEnrich.js admin panelidagi forma uchun
// ishlaydi va narxni so'ramaydi (admin qo'lda qo'yadi). Bu yerda esa
// odam yuzta skrinshot tashlab ketadi — narx ham, og'irlik ham, toifa
// ham rasmning o'zidan olinishi kerak.
import { aiJson, rasmPart, aiBormi } from './index.js';

const TOIFALAR = ['tozalash','toner','serum','krem','niqob','quyosh','lab','toplam','ichimlik'];
const BOSQICHLAR = ['tozalash','toner','davolash','namlash','himoya','qoshimcha','ichki'];
const MUAMMOLAR = ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','quyosh'];
const TERILAR = ['quruq','yogli','aralash','normal','sezgir','barcha'];

const SXEMA = {
  type: 'object',
  properties: {
    kosmetikami:  { type: 'boolean' },
    ishonch:      { type: 'integer' },
    izoh:         { type: 'string' },
    name:         { type: 'string' },
    brand:        { type: 'string' },
    // Narx skrinshotda ko'rinadi: "3,200원", "₩3200", "12 900 won"
    narx_qiymat:  { type: 'number' },
    narx_valyuta: { type: 'string', enum: ['KRW', 'UZS', 'USD', 'yoq'] },
    ogirlik_g:    { type: 'number' },
    reyting:      { type: 'number' },
    sharh_soni:   { type: 'integer' },
    volume:       { type: 'string' },
    category:     { type: 'string', enum: [...TOIFALAR, 'yangi'] },
    // Mavjud toifalarning birortasi to'g'ri kelmasa — yangisini taklif qiladi
    yangi_toifa:  { type: 'string' },
    step:         { type: 'string', enum: BOSQICHLAR },
    description:  { type: 'string' },
    usage_text:   { type: 'string' },
    ingredients:  { type: 'string' },
    actives:      { type: 'array', items: { type: 'string' } },
    concerns:     { type: 'array', items: { type: 'string', enum: MUAMMOLAR } },
    skin_types:   { type: 'array', items: { type: 'string', enum: TERILAR } },
    warnings:     { type: 'string' },
    emoji:        { type: 'string' },
  },
  required: ['kosmetikami','ishonch','izoh','name','brand','narx_qiymat','narx_valyuta',
             'ogirlik_g','reyting','sharh_soni','volume','category','yangi_toifa','step','description','usage_text',
             'ingredients','actives','concerns','skin_types','warnings','emoji'],
  propertyOrdering: ['kosmetikami','ishonch','izoh','name','brand','narx_qiymat','narx_valyuta',
             'ogirlik_g','volume','category','yangi_toifa','step','description','usage_text',
             'ingredients','actives','concerns','skin_types','warnings','emoji'],
};

const KORSATMA = `Sen — KiOVO do'koni uchun katalog to'ldiruvchisisan. Senga
Koreya do'konining (Daiso, Olive Young, Coupang) SKRINSHOTI beriladi.
Mahsulotni tanib, katalog kartochkasini to'ldir.

NARX — eng muhimi:
- Skrinshotda ko'ringan narxni AYNAN o'qi. Koreys do'konida u "3,200원",
  "₩3200" yoki "3200 won" ko'rinishida bo'ladi → narx_qiymat = 3200,
  narx_valyuta = "KRW".
- Chegirmali narx bo'lsa (eski narx chizilgan) — YANGI, kichik narxni ol.
- Narx umuman ko'rinmasa: narx_qiymat = 0, narx_valyuta = "yoq".
- O'ylab TOPMA. Ko'rinmasa 0 yoz.

REYTING:
- Skrinshotda yulduzcha bahosi va sharhlar soni ko'rinsa o'qi:
  reyting = 4.8, sharh_soni = 124.
- Ko'rinmasa IKKALASI HAM 0 bo'lsin. O'ylab TOPMA — soxta reyting
  ishonchni yo'qotadi, biz uni umuman ko'rsatmaymiz.

OG'IRLIK:
- ogirlik_g — mahsulotning qadoq bilan taxminiy og'irligi, grammda.
  Hajmdan chiqar: 100 ml suyuqlik ≈ 120 g, 50 ml krem ≈ 90 g,
  varaqli niqob ≈ 30 g, 300 ml shampun ≈ 340 g.
- Bu pochta narxiga ta'sir qiladi, shuning uchun kam emas, biroz
  KO'PROQ tomonga xato qilgan ma'qul.

TOIFA:
- Mavjud toifalar: tozalash, toner, serum, krem, niqob, quyosh, lab,
  toplam, ichimlik.
- Mahsulot shulardan BIRORTASIGA ham to'g'ri kelmasa (masalan tuk
  oluvchi, soch qisqichi, pinset, sochiq, oyoq plasteri) —
  category = "yangi" va yangi_toifa ga o'zbekcha qisqa nom yoz
  ("Aksessuar", "Soch parvarishi", "Tana parvarishi", "Asboblar").
  Bir so'zli yoki ikki so'zli bo'lsin.

BOSHQA:
- kosmetikami: bu kosmetika, parvarish yoki go'zallik mahsulotimi.
  Oziq-ovqat, telefon g'ilofi, o'yinchoq bo'lsa false.
- name: inglizcha yoki koreyscha nom, skrinshotdagidek.
- description: 1-2 jumla o'zbekcha, nima qilishi.
- usage_text: qanday ishlatiladi, 1 jumla o'zbekcha.
- Ishonching 60% dan past bo'lsa ishonch ni past qo'y — biz uni
  navbatga olamiz, katalogga chiqarmaymiz.

Faqat JSON qaytar.`;

/**
 * @param {string} base64
 * @param {string} mime
 * @returns {Promise<object>} tozalangan kartochka
 */
export async function skrinshotdanMahsulot(base64, mime = 'image/jpeg') {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });

  const j = await aiJson(
    [{ text: KORSATMA }, rasmPart(base64, mime)],
    SXEMA,
    { temperature: 0.2, maxTokens: 2048, muhim: true },
  );

  const s = (v, n) => String(v ?? '').trim().slice(0, n);
  const son = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const royxat = (v, ruxsat, n) => (Array.isArray(v) ? v : [])
    .map((x) => s(x, 30)).filter((x) => !ruxsat || ruxsat.includes(x)).slice(0, n);

  const toifa = TOIFALAR.includes(j.category) ? j.category
    : (j.category === 'yangi' && s(j.yangi_toifa, 40) ? 'yangi' : 'krem');

  return {
    kosmetikami: j.kosmetikami === true,
    ishonch: Math.max(0, Math.min(100, Math.round(son(j.ishonch)))),
    izoh: s(j.izoh, 200),
    name: s(j.name, 120),
    brand: s(j.brand, 60),
    narx_qiymat: son(j.narx_qiymat),
    narx_valyuta: ['KRW', 'UZS', 'USD'].includes(j.narx_valyuta) ? j.narx_valyuta : 'yoq',
    ogirlik_g: Math.round(son(j.ogirlik_g)),
    reyting: Math.min(5, Math.round(son(j.reyting) * 10) / 10),
    sharh_soni: Math.round(son(j.sharh_soni)),
    volume: s(j.volume, 30),
    category: toifa,
    yangi_toifa: toifa === 'yangi' ? s(j.yangi_toifa, 40) : '',
    step: BOSQICHLAR.includes(j.step) ? j.step : 'qoshimcha',
    description: s(j.description, 900),
    usage_text: s(j.usage_text, 900),
    ingredients: s(j.ingredients, 1200),
    actives: royxat(j.actives, null, 12),
    concerns: royxat(j.concerns, MUAMMOLAR, 10),
    skin_types: royxat(j.skin_types, TERILAR, 8),
    warnings: s(j.warnings, 400),
    emoji: s(j.emoji, 4) || '🧴',
  };
}
