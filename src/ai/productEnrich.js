// Admin mahsulot skrinshotini yuklaydi -> AI mahsulotni taniydi va
// katalog kartochkasini to'ldiradi (nomi, tarkibi, qanday foydalanish, kimga mos).
// Natija darhol saqlanmaydi: admin panelida forma to'ldiriladi, admin tekshiradi.
import { geminiJson, rasmPart, geminiBormi } from './gemini.js';

const SXEMA = {
  type: 'object',
  properties: {
    topildi:    { type: 'boolean' },
    ishonch:    { type: 'integer' },
    izoh:       { type: 'string' },
    name:       { type: 'string' },
    brand:      { type: 'string' },
    category:   { type: 'string', enum: ['tozalash','toner','serum','krem','niqob','quyosh','lab','toplam'] },
    step:       { type: 'string', enum: ['tozalash','toner','davolash','namlash','himoya','qoshimcha'] },
    volume:     { type: 'string' },
    country:    { type: 'string' },
    description:{ type: 'string' },
    usage_text: { type: 'string' },
    ingredients:{ type: 'string' },
    actives:    { type: 'array', items: { type: 'string' } },
    concerns:   { type: 'array', items: { type: 'string', enum: ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','quyosh'] } },
    skin_types: { type: 'array', items: { type: 'string', enum: ['quruq','yogli','aralash','normal','sezgir','barcha'] } },
    warnings:   { type: 'string' },
    emoji:      { type: 'string' },
  },
  required: ['topildi','ishonch','izoh','name','brand','category','step','volume','country',
             'description','usage_text','ingredients','actives','concerns','skin_types','warnings','emoji'],
  propertyOrdering: ['topildi','ishonch','izoh','name','brand','category','step','volume','country',
             'description','usage_text','ingredients','actives','concerns','skin_types','warnings','emoji'],
};

const KORSATMA = `Sen — kosmetika katalogi muharriri. Rasmda kosmetika mahsuloti
(qadoq, etiketka yoki do'kon skrinshoti) tasvirlangan. Uni tanib, do'kon
kartochkasini to'ldir.

Qoidalar:
- Avval mahsulotni aniqla: brend va to'liq nomi. Etiketkani diqqat bilan o'qi.
- Aniq tanib bo'lmasa: topildi = false, ishonch past, izohda nima
  ko'rinayotganini yoz. Nomni O'YLAB TOPMA.
- ishonch: 0-100. Etiketka aniq o'qilsa yuqori, taxmin bo'lsa past.
- description: mahsulot nima qilishi, 2-3 jumla, sotuvchi tilida emas — foydali.
- usage_text: qanday foydalanish — aniq ketma-ketlik, qachon (ertalab/kechqurun),
  qancha miqdorda. Bu maydon mijoz uchun eng muhimi.
- ingredients: asosiy tarkib (INCI). Faqat etiketkada ko'ringanini yoz;
  ko'rinmasa mahsulot haqida ishonchli bilganingni yoz, bilmasang bo'sh qoldir.
- concerns: qaysi muammoga yordam beradi. skin_types: kimga mos.
- warnings: ehtiyot choralari (masalan "kunduzi SPF bilan", "homiladorlikda
  tavsiya etilmaydi", "sezgir teri sinov qilib ko'rsin"). Bo'lmasa bo'sh satr.
- emoji: mahsulotga mos bitta emoji.
- Narx yozma — uni admin o'zi qo'yadi.

Butun javob o'zbek tilida (lotin alifbosida). Faqat JSON qaytar.`;

export async function mahsulotniTani(base64, mime) {
  if (!geminiBormi()) {
    const e = new Error('GEMINI_KALIT_YOQ');
    e.foydalanuvchiga = "AI kaliti sozlanmagan — maydonlarni qo'lda to'ldiring.";
    throw e;
  }

  const j = await geminiJson([{ text: KORSATMA }, rasmPart(base64, mime)], SXEMA, {
    temperature: 0.2, maxTokens: 2048,
  });

  const s = (v, n) => String(v ?? '').slice(0, n);
  const arr = (v, n) => (Array.isArray(v) ? v : []).map((x) => s(x, 40)).filter(Boolean).slice(0, n);

  return {
    topildi:  Boolean(j.topildi),
    ishonch:  Math.min(100, Math.max(0, Number(j.ishonch) || 0)),
    izoh:     s(j.izoh, 300),
    name:     s(j.name, 120),
    brand:    s(j.brand, 60),
    category: s(j.category, 20) || 'krem',
    step:     s(j.step, 20) || 'namlash',
    volume:   s(j.volume, 30),
    country:  s(j.country, 4) || 'KR',
    description: s(j.description, 600),
    usage_text:  s(j.usage_text, 600),
    ingredients: s(j.ingredients, 900),
    actives:    arr(j.actives, 10),
    concerns:   arr(j.concerns, 8),
    skin_types: arr(j.skin_types, 6),
    warnings:   s(j.warnings, 300),
    emoji:      s(j.emoji, 4) || '🧴',
  };
}
