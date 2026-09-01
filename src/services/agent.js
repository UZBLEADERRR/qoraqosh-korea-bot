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
 * Postda ISHLATILMAYDIGAN gaplar.
 *
 * Model o'zi bilmagan narsani ishonch bilan aytib qo'yadi: «tadqiqotlarga
 * ko'ra 87% ayol...», «shifokorlar tasdiqlagan», «bir haftada butunlay
 * yo'qoladi». Bunday post bir marta o'qiladi, keyin brendga ishonch
 * yo'qoladi. Shuning uchun tekshiruvdan o'tkazamiz.
 */
const OLDI_QOCHDI = [
  { qolip: /\b\d{1,3}\s*%/g,                       sabab: 'manbasiz foiz' },
  { qolip: /\b(tadqiqot|olim|mutaxassis|shifokor|dermatolog|statistik)\w*\s+(ko[‘'’]ra|aytishicha|aniqlashicha|tasdiqla\w*|isbotla\w*)/gi,
    sabab: 'soxta manba' },
  { qolip: /\b(100|yuz)\s*foiz\b|\bkafolatla\w*|\balbatta yordam berad\w*/gi,
    sabab: 'kafolat va’dasi' },
  { qolip: /\b(butunlay|to[‘'’]liq)\s+(yo[‘'’]qol\w*|davola\w*|tuzat\w*)/gi,
    sabab: 'davolash va’dasi' },
  { qolip: /\b(bir\s+(kun|hafta)da|[1-7]\s+kunda)\s+\S*\s*\w*(natija|yo[‘'’]qol|tuzal|toza)/gi,
    sabab: 'real bo‘lmagan muddat' },
  { qolip: /\b(eng yaxshi|dunyodagi eng|raqobatchisiz|№\s*1|no\.?\s*1)\b/gi,
    sabab: 'asossiz ustunlik' },
];

/** Postda oldi-qochdi gap bormi. @returns {string[]} topilgan sabablar */
export function oldiQochdiTekshir(matn) {
  const t = String(matn || '');
  const topildi = new Set();
  for (const { qolip, sabab } of OLDI_QOCHDI) {
    qolip.lastIndex = 0;
    if (qolip.test(t)) topildi.add(sabab);
  }
  return [...topildi];
}

const QOIDALAR = `Post qoidalari:
- O'zbek tilida (lotin alifbosida), sodda va samimiy til.
- 60-140 so'z. Uzun bo'lmasin — odam telefonda o'qiydi.
- Telegram HTML: <b>qalin</b>, <i>kursiv</i>. Boshqa teg ISHLATMA.
  <br> yoki <p> YO'Q — oddiy qator tashlash ishlat.
- Emoji ishlat, lekin me'yorida (4-8 ta).
- Boshida diqqatni tortadigan bitta qator.
- Oxirida yumshoq harakatga chaqiriq (botga o'tish yoki savol berish).

FAKT QOIDALARI — eng muhimi. Bularni buzgan post KERAK EMAS:
- RAQAM O'YLAB TOPMA. «Tadqiqotlarga ko'ra 87%...», «olimlar aniqlashicha»,
  «mutaxassislar tasdiqlagan» kabi soxta manbalarni YOZMA. Sen tadqiqot
  o'qimagansan — bilganingni manbasiz, oddiy tilda ayt.
- FOIZ ISHLATMA. Umuman. Hech qanday «30% ko'proq», «2 barobar samarali» yo'q.
- KAFOLAT BERMA: «albatta yordam beradi», «100% natija», «butunlay yo'qoladi»
  degan gaplar yolg'on va qonunan ham xavfli.
- MUDDAT VA'DA QILMA: «bir haftada tuzaladi» yozma. Parvarish sekin ishlaydi.
- TIBBIY TASHXIS QO'YMA, kasallik nomini aytma (akne, ekzema, psoriaz...).
  Teri HOLATI haqida yoz: quruqlik, yog'lanish, xiralik, sezgirlik.
- «Eng yaxshi», «dunyoda birinchi» kabi asossiz ustunlik da'volari yo'q.
- Narx yozma — u o'zgaradi.

BUNING O'RNIGA aniq va foydali yoz: nima qilish kerak, qaysi tartibda,
nega shunday. Masalan «tozalagichni iliq suv bilan 30 soniya aylantirib
ishlating» — bu tekshirib bo'ladigan, foydali maslahat.`;

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

  const sorov = (qoshimcha = '') => aiJson([{ text:
`Sen — "${brend}" Koreya kosmetikasi do'konining SMM menejerisan.
Telegram kanaliga post yozasan.

UMUMIY TOPSHIRIQ: ${reja.topshiriq}
BUGUNGI MAVZU: ${mavzu}

${QOIDALAR}

"rasm_tavsifi" — shu post uchun rasm qanday bo'lishini INGLIZ TILIDA yoz
(1-2 jumla). Rasm toza, yorug', kosmetika brendiga mos, minimalistik
bo'lsin. Rasmda MATN bo'lmasin.${tuzatishBlok}${qoshimcha}` }],
    POST_SXEMA, { temperature: 0.9, maxTokens: 2048 });

  let javob = await sorov();
  let matn = tozalaHtml(String(javob?.matn || '').trim());

  // Tekshiruv: qoidani buzsa BIR MARTA qayta yozdiramiz.
  // Ikkinchi marta ham buzsa — admin baribir ko'radi va tuzatadi;
  // cheksiz urinish AI kvotasini yeb qo'yadi.
  const muammo = oldiQochdiTekshir(matn);
  if (muammo.length) {
    console.warn('AGENT: post qoidani buzdi —', muammo.join(', '), '· qayta yozilmoqda');
    javob = await sorov(
      `\n\nDIQQAT: avvalgi urinishingda quyidagi xato bor edi: ${muammo.join(', ')}.` +
      `\nShu xatosiz, faqat tekshirib bo'ladigan aniq maslahat bilan qayta yoz.`);
    matn = tozalaHtml(String(javob?.matn || '').trim());
  }

  return {
    matn,
    rasmTavsifi: String(javob?.rasm_tavsifi || '').trim(),
    ogohlantirish: oldiQochdiTekshir(matn),
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

// ══════════ Mahsulot reklamasi ══════════

/**
 * Mahsulot uchun reklama posti.
 *
 * Oddiy postdan farqi: matn KATALOGDAGI HAQIQIY ma'lumotdan yoziladi —
 * nomi, brendi, tarkibi, qanday foydalanish, qaysi muammoga yordam berishi.
 * Model o'zidan mahsulot xususiyati o'ylab topa olmasligi uchun unga
 * "faqat quyidagi ma'lumotdan foydalan" deb aytiladi.
 */
export async function reklamaPostiYoz(mahsulot, tuzatish = '', eskiMatn = '') {
  const brend = await brendNomi();
  const p = mahsulot;

  const malumot = [
    `Nomi: ${p.name}`,
    p.brand        ? `Brendi: ${p.brand}` : '',
    p.volume       ? `Hajmi: ${p.volume}` : '',
    p.step         ? `Parvarish bosqichi: ${p.step}` : '',
    p.description  ? `Tavsifi: ${p.description}` : '',
    p.usage_text   ? `Qanday foydalaniladi: ${p.usage_text}` : '',
    p.actives?.length    ? `Faol moddalari: ${p.actives.join(', ')}` : '',
    p.concerns?.length   ? `Qaysi muammoga: ${p.concerns.join(', ')}` : '',
    p.skin_types?.length ? `Kimga mos: ${p.skin_types.join(', ')}` : '',
    p.warnings     ? `Ehtiyot choralari: ${p.warnings}` : '',
  ].filter(Boolean).join('\n');

  const tuzatishBlok = tuzatish
    ? `\n\nAVVALGI VARIANT:\n"""${eskiMatn}"""\n\nEGASINING IZOHI: "${tuzatish}"\nShu izohga qarab QAYTA yoz.`
    : '';

  const sorov = (qoshimcha = '') => aiJson([{ text:
`Sen — "${brend}" Koreya kosmetikasi do'konining SMM menejerisan.
Telegram kanaliga BITTA MAHSULOT haqida reklama posti yozasan.

MAHSULOT MA'LUMOTI (faqat shundan foydalan):
"""
${malumot}
"""

MUHIM: mahsulot haqida bu yerda YO'Q narsani yozma. Tarkibida nima borligini,
nimaga yordam berishini o'zingdan qo'shma — yuqoridagi ma'lumotdan foydalan.
Ma'lumot kam bo'lsa post ham qisqa bo'lsin: yolg'on to'ldirgandan yaxshi.

${QOIDALAR}

Reklama posti qo'shimcha qoidalari:
- Mahsulot nomini va brendini aniq yoz.
- Kimga mos kelishini va qaysi bosqichda ishlatilishini ayt.
- Qanday foydalanishni bitta aniq jumlada ber.
- Oxirida botga o'tishga chaqir (mahsulot ilovada).
- NARX YOZMA — u o'zgaradi va ilovada turadi.

"rasm_tavsifi" — mahsulot rasmi bo'lmasa ishlatiladi: mahsulot uchun
INGLIZ TILIDA 1-2 jumlalik toza, minimalistik sahna tavsifi. Rasmda MATN
bo'lmasin.${tuzatishBlok}${qoshimcha}` }],
    POST_SXEMA, { temperature: 0.8, maxTokens: 2048 });

  let javob = await sorov();
  let matn = tozalaHtml(String(javob?.matn || '').trim());

  const muammo = oldiQochdiTekshir(matn);
  if (muammo.length) {
    console.warn('AGENT REKLAMA: qoidani buzdi —', muammo.join(', '), '· qayta yozilmoqda');
    javob = await sorov(
      `\n\nDIQQAT: avvalgi urinishingda quyidagi xato bor edi: ${muammo.join(', ')}.` +
      `\nShu xatosiz qayta yoz.`);
    matn = tozalaHtml(String(javob?.matn || '').trim());
  }

  return {
    matn,
    rasmTavsifi: String(javob?.rasm_tavsifi || '').trim(),
    ogohlantirish: oldiQochdiTekshir(matn),
  };
}

/**
 * Reklama uchun bir martalik "reja" va uning yagona bandini yaratadi.
 * Shu tarzda reklama posti oddiy post bilan bir xil tasdiqlash oqimidan
 * o'tadi — alohida kod yozish shart emas.
 */
export async function reklamaBandiYarat({ mahsulot, kanal, adminId }) {
  const r = await qator(
    `insert into rejalar (nom, topshiriq, kanal, soat, rasmli, created_by, faol, turi)
     values ($1, $2, $3, 0, true, $4, false, 'reklama') returning *`,
    [`Reklama · ${mahsulot.name}`.slice(0, 60),
     `${mahsulot.name} mahsuloti uchun reklama posti`,
     kanal || '', adminId ?? null]);

  const band = await qator(
    `insert into reja_bandlari (reja_id, tartib, mavzu, mahsulot_id, holat)
     values ($1, 0, $2, $3, 'rejada') returning *`,
    [r.id, `Reklama: ${mahsulot.name}`.slice(0, 150), mahsulot.id]);

  return { ...band, reja_nom: r.nom, kanal: r.kanal, rasmli: true, topshiriq: r.topshiriq };
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

/**
 * Bugun tayyorlanishi kerak bo'lgan bandlar.
 *
 * HAR REJADAN KUNIGA BITTA — `distinct on (b.reja_id)`.
 * Bu shart bo'lmasa 30 kunlik rejaning O'TTIZ TA bandi bir vaqtda qaytardi:
 * `not exists` sharti so'rov boshida bir marta baholanadi, birinchi post
 * «tasdiq_kutilmoqda» ga o'tguncha esa qolgan 29 tasi ham ro'yxatda turadi.
 * Natijada admin bir kunda o'ttizta tasdiq so'rovini olardi.
 */
export async function bugungiBandlar() {
  if (!aiBormi()) return [];
  const soat = Number(new Date().toLocaleString('en-US',
    { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));

  return qatorlar(
    `select distinct on (b.reja_id)
            b.*, r.topshiriq, r.kanal, r.soat, r.rasmli, r.nom as reja_nom, r.created_by
       from reja_bandlari b
       join rejalar r on r.id = b.reja_id
      where r.faol and b.holat = 'rejada' and r.soat <= $1
        -- Shu rejadan bugun allaqachon post tayyorlangan bo'lsa, ikkinchisi kerak emas
        and not exists (
          select 1 from reja_bandlari x
           where x.reja_id = b.reja_id
             and x.holat in ('tayyorlanmoqda', 'tasdiq_kutilmoqda', 'joylandi')
             -- created_at EMAS: u reja tuzilgan payt, 30 ta band bir vaqtda
             -- yaratiladi. Post QACHON TAYYORLANGANI kerak.
             -- IKKALASI ham Toshkent vaqtida: aks holda UTC sanasi Toshkent
             -- sanasi bilan solishtirilib, kuniga 5 soat noto'g'ri ishlardi
             and x.tayyorlandi_at is not null
             and (x.tayyorlandi_at at time zone 'Asia/Tashkent')::date
                 = (now() at time zone 'Asia/Tashkent')::date
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
          joylandi_at = case when $1 = 'joylandi' then now() else joylandi_at end,
          -- Kunlik chegara shu ustunga tayanadi: post birinchi marta
          -- tayyorlana boshlagan payt yoziladi va keyin o'zgarmaydi
          -- («Boshqa variant» bosilsa ham o'sha kun hisoblanadi).
          tayyorlandi_at = case
            when $1 in ('tayyorlanmoqda', 'tasdiq_kutilmoqda')
              then coalesce(tayyorlandi_at, now())
            else tayyorlandi_at end
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
