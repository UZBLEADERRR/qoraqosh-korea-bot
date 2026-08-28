// Kanal agenti.
//
// Admin bir marta topshiriq beradi ("har kuni soat 9 da teri parvarishi
// haqida post joyla"). Agent:
//   1. Topshiriqdan MAVZULAR ro'yxatini tuzadi (reja bandlari)
//   2. Har kuni belgilangan soatda bittasini oladi va post tayyorlaydi
//      (matn + rasm)
//   3. Avval ADMINGA yuboradi. Admin tasdiqlamaguncha kanalga hech narsa
//      chiqmaydi.
//   4. Tasdiqlangach kanalga joylaydi va bandni bajarilgan deb belgilaydi.
import { qator, qatorlar, sorov } from '../db.js';
import { aiJson, aiRasm, aiBormi } from '../ai/index.js';
import { brendNomi } from '../lib/brend.js';

// ══════════ Reja tuzish ══════════

const REJA_SXEMA = {
  type: 'object',
  properties: {
    nom: { type: 'string' },
    mavzular: { type: 'array', items: { type: 'string' } },
  },
  required: ['nom', 'mavzular'],
  propertyOrdering: ['nom', 'mavzular'],
};

/**
 * Admin topshirig'idan mavzular ro'yxatini tuzadi.
 * @param {string} topshiriq
 * @param {number} kunlar
 */
export async function rejaTuz(topshiriq, kunlar = 30) {
  const brend = await brendNomi();
  const javob = await aiJson([{ text:
`Sen — "${brend}" Koreya kosmetikasi do'konining SMM menejerisan.
Egasi shunday topshiriq berdi:

"""${topshiriq}"""

Shu topshiriq bo'yicha ${kunlar} KUNLIK kontent rejasini tuz.

Qoidalar:
- Har kunga BITTA aniq mavzu. Mavzu 4-10 so'z.
- Mavzular takrorlanmasin va bir-birini davom ettirsin.
- O'zbek tilida (lotin alifbosida).
- Faqat foydali va sotuvga xizmat qiladigan mavzular: teri parvarishi
  maslahatlari, mahsulot foydasi, mijoz savollari, mavsumiy tavsiyalar.
- Tibbiy tashxis yoki kasallik nomlari BO'LMASIN.
- "nom" — rejaning qisqa nomi (2-4 so'z).` }],
    REJA_SXEMA, { temperature: 0.8, maxTokens: 4096 });

  return {
    nom: String(javob?.nom || 'Kanal rejasi').slice(0, 60),
    mavzular: (javob?.mavzular || []).map((m) => String(m).slice(0, 150))
      .filter(Boolean).slice(0, kunlar),
  };
}

/** Rejani va uning bandlarini bazaga yozadi. */
export async function rejaniSaqla({ nom, topshiriq, kanal, soat, mavzular, rasmli, adminId }) {
  const r = await qator(
    `insert into rejalar (nom, topshiriq, kanal, soat, rasmli, created_by)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [nom, topshiriq, kanal || '', soat, rasmli !== false, adminId ?? null]);

  for (let i = 0; i < mavzular.length; i++) {
    await sorov('insert into reja_bandlari (reja_id, tartib, mavzu) values ($1,$2,$3)',
      [r.id, i, mavzular[i]]);
  }
  return r;
}

// ══════════ Post tayyorlash ══════════

const POST_SXEMA = {
  type: 'object',
  properties: {
    matn:       { type: 'string' },
    rasm_tavsifi: { type: 'string' },
  },
  required: ['matn', 'rasm_tavsifi'],
  propertyOrdering: ['matn', 'rasm_tavsifi'],
};

/**
 * Bitta post tayyorlaydi.
 * @param {object} reja
 * @param {string} mavzu
 * @param {string} [tuzatish]  admin "shuni to'g'rila" degan bo'lsa
 * @param {string} [eskiMatn]
 */
export async function postYoz(reja, mavzu, tuzatish = '', eskiMatn = '') {
  const brend = await brendNomi();
  const tuzatishBlok = tuzatish
    ? `\n\nAVVALGI VARIANT:\n"""${eskiMatn}"""\n\nEGASINING IZOHI: "${tuzatish}"\nShu izohga qarab QAYTA yoz.`
    : '';

  const javob = await aiJson([{ text:
`Sen — "${brend}" Koreya kosmetikasi do'konining SMM menejerisan.
Telegram kanaliga post yozasan.

UMUMIY TOPSHIRIQ: ${reja.topshiriq}
BUGUNGI MAVZU: ${mavzu}

Post qoidalari:
- O'zbek tilida (lotin alifbosida), sodda va samimiy til.
- 60-140 so'z. Uzun bo'lmasin — odam telefonda o'qiydi.
- Telegram HTML: <b>qalin</b>, <i>kursiv</i>. Boshqa teg ISHLATMA.
  <br> yoki <p> YO'Q — oddiy qator tashlash ishlat.
- Emoji ishlat, lekin me'yorida (4-8 ta).
- Boshida diqqatni tortadigan bitta qator.
- Oxirida yumshoq harakatga chaqiriq (botga o'tish yoki savol berish).
- Tibbiy tashxis qo'yma, kasallik nomini aytma.
- Narx yozma — u o'zgaradi.

"rasm_tavsifi" — shu post uchun rasm qanday bo'lishini INGLIZ TILIDA yoz
(1-2 jumla). Rasm toza, yorug', kosmetika brendiga mos, minimalistik
bo'lsin. Rasmda MATN bo'lmasin.${tuzatishBlok}` }],
    POST_SXEMA, { temperature: 0.9, maxTokens: 2048 });

  return {
    matn: tozalaHtml(String(javob?.matn || '').trim()),
    rasmTavsifi: String(javob?.rasm_tavsifi || '').trim(),
  };
}

/**
 * Telegram faqat sanoqli teglarni tushunadi. Model boshqasini yozib
 * qo'ysa post umuman yuborilmaydi (400 xatosi), shuning uchun tozalaymiz.
 */
export function tozalaHtml(matn) {
  return String(matn)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<(?!\/?(b|strong|i|em|u|s|code|pre|a|blockquote)\b)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1024);   // rasm izohi cheklovi
}

/** Post uchun rasm chizadi. Rasm chizish modeli yo'q bo'lsa null. */
export async function postRasmi(tavsif) {
  if (!tavsif) return null;
  try {
    // aiRasm Gemini "parts" massivini kutadi
    const r = await aiRasm([{ text:
      `${tavsif}\n\nStyle: clean, bright, minimal, professional product photography ` +
      `for a Korean skincare brand. Soft natural light, pastel palette. ` +
      `Aspect ratio 1:1. Do not render any text, words or letters on the image.` }],
      { nisbat: '1:1' });
    return r?.base64 ? Buffer.from(r.base64, 'base64') : null;
  } catch (e) {
    console.error('AGENT RASM:', e.message);
    return null;   // rasm bo'lmasa post matn bilan ketaveradi
  }
}

// ══════════ Navbat ══════════

/** Bugun tayyorlanishi kerak bo'lgan bandlar. */
export async function bugungiBandlar() {
  if (!aiBormi()) return [];
  const soat = Number(new Date().toLocaleString('en-US',
    { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));

  return qatorlar(
    `select b.*, r.topshiriq, r.kanal, r.soat, r.rasmli, r.nom as reja_nom, r.created_by
       from reja_bandlari b
       join rejalar r on r.id = b.reja_id
      where r.faol and b.holat = 'rejada' and r.soat <= $1
        -- Shu rejadan bugun allaqachon post tayyorlangan bo'lsa, ikkinchisi kerak emas
        and not exists (
          select 1 from reja_bandlari x
           where x.reja_id = b.reja_id
             and x.holat in ('tasdiq_kutilmoqda', 'joylandi')
             and x.created_at::date = (now() at time zone 'Asia/Tashkent')::date
        )
      order by b.reja_id, b.tartib`, [soat]);
}

export const bandniOl = (id) => qator(
  `select b.*, r.topshiriq, r.kanal, r.rasmli, r.nom as reja_nom, r.created_by
     from reja_bandlari b join rejalar r on r.id = b.reja_id where b.id = $1`, [id]);

export const bandHolati = (id, holat, qoshimcha = {}) => sorov(
  `update reja_bandlari
      set holat = $1,
          matn = coalesce($2, matn),
          rasm_id = coalesce($3, rasm_id),
          tasdiq_msg = coalesce($4, tasdiq_msg),
          tasdiq_chat = coalesce($5, tasdiq_chat),
          joylandi_at = case when $1 = 'joylandi' then now() else joylandi_at end
    where id = $6`,
  [holat, qoshimcha.matn ?? null, qoshimcha.rasmId ?? null,
   qoshimcha.msgId ?? null, qoshimcha.chatId ?? null, id]);

export const rejalarniOl = () => qatorlar(
  `select r.*,
          count(b.id)::int as jami,
          count(b.id) filter (where b.holat = 'joylandi')::int as joylandi,
          count(b.id) filter (where b.holat = 'rejada')::int as qolgan
     from rejalar r left join reja_bandlari b on b.reja_id = r.id
    group by r.id order by r.created_at desc`);

export const rejaniOchir = (id) => sorov('delete from rejalar where id = $1', [id]);
export const rejaniYoq  = (id, faol) => sorov('update rejalar set faol = $1 where id = $2', [faol, id]);
