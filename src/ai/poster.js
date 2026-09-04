// Skrinshotdan reklama posteri.
// Ikki bosqich: (1) AI bir necha g'oya taklif qiladi, (2) admin tanlaganini chizadi.
// Admin hech qanday "prompt" yozmaydi — faqat g'oyani tanlaydi.
import { aiJson, aiRasm, rasmPart, aiBormi } from './index.js';
import { posterniTuzat } from '../rasm/poster-tuzat.js';

/**
 * Joylashuvga qarab o'lchamlar.
 *
 * FAQAT model qo'llab-quvvatlaydigan nisbatlar. Ilgari 4:5 ham bor edi —
 * model uni tanimay, rasmni o'z o'lchamida chizib, yon tomonlariga QORA
 * chiziq qo'shib qaytarardi. Katalogda ana shu qora yo'l ko'rinardi.
 */
export const NISBATLAR = {
  '1:1':  { nom: 'Kvadrat',    joy: 'Katalog kartochkasi, Instagram post', px: '1024×1024' },
  '3:4':  { nom: 'Vertikal',   joy: 'Instagram lentasi, mahsulot kartochkasi', px: '1024×1365' },
  '4:3':  { nom: 'Albom',      joy: 'Karusel va banner', px: '1365×1024' },
  '9:16': { nom: 'Story',      joy: 'Instagram/Telegram story, Reels', px: '1024×1820' },
  '16:9': { nom: 'Gorizontal', joy: 'Telegram kanal banneri, sayt sarlavhasi', px: '1820×1024' },
};

const GOYA_SXEMA = {
  type: 'object',
  properties: {
    goyalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sarlavha:  { type: 'string' },
          uslub:     { type: 'string', enum: ['muammo-yechim','minimalist','tabiiy','klinik','lifestyle','aksiya'] },
          tavsif:    { type: 'string' },
          kimga:     { type: 'string' },
          matn_bosh: { type: 'string' },
          matn_qosh: { type: 'string' },
          nisbat:    { type: 'string', enum: ['1:1','3:4','4:3','9:16','16:9'] },
          prompt:    { type: 'string' },
        },
        required: ['sarlavha','uslub','tavsif','kimga','matn_bosh','matn_qosh','nisbat','prompt'],
        propertyOrdering: ['sarlavha','uslub','tavsif','kimga','matn_bosh','matn_qosh','nisbat','prompt'],
      },
    },
  },
  required: ['goyalar'],
};

const GOYA_KORSATMA = (m) => `Sen — kosmetika brendi uchun ijodiy direktor. Rasmda
"${m.brand || ''} ${m.name || ''}" mahsuloti tasvirlangan.

Mahsulot haqida:
- Nima qiladi: ${m.description || "noma'lum"}
- Qaysi muammoga: ${(m.concerns || []).join(', ') || "noma'lum"}
- Kimga mos: ${(m.skin_types || []).join(', ') || 'barcha'}
- Asosiy moddalar: ${(m.actives || []).join(', ') || "noma'lum"}

Shu mahsulot uchun 4 ta TURLI reklama posteri g'oyasini taklif qil. Har biri
boshqa auditoriyaga va boshqa joyga mo'ljallangan bo'lsin.

Har bir g'oya uchun:
- sarlavha: g'oyaning qisqa nomi (o'zbekcha, 2-4 so'z)
- uslub: quyidagilardan biri
    muammo-yechim — muammoli teri va natija yonma-yon (davolovchi vositalar uchun)
    minimalist    — sof fon, faqat mahsulot, ko'p bo'sh joy
    tabiiy        — o'simlik, suv, tabiiy materiallar bilan
    klinik        — toza, oq, ilmiy, ishonchli
    lifestyle     — kundalik hayot sahnasida
    aksiya        — chegirma va narxga urg'u
- tavsif: poster nimani ko'rsatishi, 1-2 jumla o'zbekcha
- kimga: qaysi auditoriyaga (masalan "18-25 yosh, akneli teri")
- matn_bosh: XABAR uchun asosiy sarlavha, o'zbekcha, 2-5 so'z, kuchli.
  DIQQAT: bu rasm USTIGA yozilmaydi — Telegram xabarining matni bo'ladi.
- matn_qosh: xabar uchun kichik qo'shimcha yozuv, o'zbekcha, 4-8 so'z
- nisbat: deyarli har doim "1:1" (katalog va mahsulot sahifasi kvadrat
  ko'rsatadi). Faqat kanal uchun keng banner kerak bo'lsa "4:3".
- prompt: rasm chizuvchi modelga INGLIZ tilida batafsil ko'rsatma.
  Muhim qoidalar prompt uchun:
    * mahsulot qadog'i tayanch rasmdagidek AYNAN saqlansin (shakl, rang, etiketka)
    * yoritish, fon, kompozitsiya, rang palitrasi aniq tasvirlansin
    * professional mahsulot fotosurati sifatida, reklama darajasida
    * agar uslub "muammo-yechim" bo'lsa: real, o'rtacha darajadagi teri
      muammosi ko'rsatilsin — qo'rqinchli yoki tibbiy sahna EMAS, hurmatli va
      chiroyli tarzda; odam yuzi ko'rsatilsa u aniq bir shaxsga o'xshamasin
    * promptda YOZUV so'ralmasin: rasmda hech qanday matn, sarlavha,
      narx yorlig'i yoki logotip bo'lmasligi kerak (mahsulot etiketkasidan
      tashqari). Model o'zbekcha matnni doim buzib yozadi.

Faqat JSON qaytar.`;

/** Skrinshot + mahsulot ma'lumoti -> 4 ta poster g'oyasi. */
export async function posterGoyalari(base64, mime, mahsulot) {
  if (!aiBormi()) throw new Error('GEMINI_KALIT_YOQ');

  const j = await aiJson(
    [{ text: GOYA_KORSATMA(mahsulot || {}) }, rasmPart(base64, mime)],
    GOYA_SXEMA,
    { temperature: 0.9, maxTokens: 3000, muhim: true },
  );

  const s = (v, n) => String(v ?? '').slice(0, n);
  return (j.goyalar || []).slice(0, 5).map((g, i) => ({
    id:        `g${i + 1}`,
    sarlavha:  s(g.sarlavha, 60),
    uslub:     s(g.uslub, 20),
    tavsif:    s(g.tavsif, 300),
    kimga:     s(g.kimga, 80),
    matn_bosh: s(g.matn_bosh, 60),
    matn_qosh: s(g.matn_qosh, 120),
    nisbat:    NISBATLAR[g.nisbat] ? g.nisbat : '1:1',
    prompt:    s(g.prompt, 1800),
  }));
}

/**
 * Tanlangan g'oyani chizadi. Tayanch rasm mahsulot qadog'ini saqlash uchun.
 *
 * RASMDA YOZUV BO'LMAYDI. Model o'zbekcha matnni doim buzadi
 * ("tozalaydi" o'rniga "tozalb") — bu brendni arzonlashtiradi. Ilgari
 * yozuvni ustiga O'ZIMIZ qo'yardik, lekin model ham yozib qo'yaverdi va
 * ikkita matn ustma-ust tushdi. Endi rasm butunlay toza: sarlavha
 * Telegram xabarining matnida qoladi.
 */
export async function posterChiz({ base64, mime, prompt, nisbat }) {
  // Kvadrat — sukut bo'yicha: katalog kartasi ham, mahsulot sahifasi ham
  // 1:1 ko'rsatadi. Boshqa nisbatda rasmning tepasi yoki pasti kesiladi.
  const nis = NISBATLAR[nisbat] ? nisbat : '1:1';

  // HECH QANDAY YOZUV. Model o'zbekcha matnni xato yozadi ("tozalb"),
  // ustiga biz ham yozsak — ikkita matn ustma-ust tushadi. Yozuv
  // Telegram xabarining o'zida qoladi, rasmda emas.
  const toliq = `${prompt}

The product in the reference image must be reproduced faithfully — same bottle
shape, same colours, same label layout. This is a commercial advertising poster:
professional studio lighting, sharp focus on the product, magazine quality.
Aspect ratio ${nis} — the artwork must FILL the whole frame edge to edge.
Never add black bars, white borders, letterboxing, framing or padding of any
kind: no part of the canvas may be left empty.

ABSOLUTELY NO TEXT. Do not render any words, letters, numbers, captions,
slogans, price tags, badges, stickers, logos or watermarks anywhere in the
image. The only text allowed is the text already printed on the physical
product label in the reference photo. If you are about to add a headline or
caption, do not — leave that area as clean background instead.`;

  const parts = base64
    ? [{ text: toliq }, rasmPart(base64, mime || 'image/jpeg')]
    : [{ text: toliq }];

  const rasm = await aiRasm(parts, { nisbat: nis, muhim: true, qayerda: 'poster' });

  // Model nisbatni har doim ham hurmat qilmaydi — o'zimiz markazdan kesamiz.
  // Yozuv qo'shmaymiz: rasm toza qoladi.
  try {
    return await posterniTuzat({
      base64: rasm.base64, mime: rasm.mime, nisbat: nis,
      matnBosh: '', matnQosh: '',
    });
  } catch (e) {
    // Tuzatib bo'lmasa (motor yo'q) — model bergani baribir qaytadi
    console.error('Posterni tuzatib bo‘lmadi:', e.message);
    return rasm;
  }
}
