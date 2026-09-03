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
- matn_bosh: posterdagi ASOSIY yozuv, o'zbekcha, 2-5 so'z, kuchli
- matn_qosh: kichik qo'shimcha yozuv, o'zbekcha, 4-8 so'z
- nisbat: qaysi o'lcham eng mos (1:1, 3:4, 4:3, 9:16, 16:9).
  Katalog kartochkasi uchun 1:1 yoki 3:4 ni tanla.
- prompt: rasm chizuvchi modelga INGLIZ tilida batafsil ko'rsatma.
  Muhim qoidalar prompt uchun:
    * mahsulot qadog'i tayanch rasmdagidek AYNAN saqlansin (shakl, rang, etiketka)
    * yoritish, fon, kompozitsiya, rang palitrasi aniq tasvirlansin
    * professional mahsulot fotosurati sifatida, reklama darajasida
    * agar uslub "muammo-yechim" bo'lsa: real, o'rtacha darajadagi teri
      muammosi ko'rsatilsin — qo'rqinchli yoki tibbiy sahna EMAS, hurmatli va
      chiroyli tarzda; odam yuzi ko'rsatilsa u aniq bir shaxsga o'xshamasin
    * posterda yozuv bo'lsa, u aynan matn_bosh va matn_qosh matnini
      o'zbek lotin alifbosida, xatosiz ko'rsatsin

Faqat JSON qaytar.`;

/** Skrinshot + mahsulot ma'lumoti -> 4 ta poster g'oyasi. */
export async function posterGoyalari(base64, mime, mahsulot) {
  if (!aiBormi()) throw new Error('GEMINI_KALIT_YOQ');

  const j = await aiJson(
    [{ text: GOYA_KORSATMA(mahsulot || {}) }, rasmPart(base64, mime)],
    GOYA_SXEMA,
    { temperature: 0.9, maxTokens: 3000 },
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
    nisbat:    NISBATLAR[g.nisbat] ? g.nisbat : '3:4',
    prompt:    s(g.prompt, 1800),
  }));
}

/**
 * Tanlangan g'oyani chizadi. Tayanch rasm mahsulot qadog'ini saqlash uchun.
 *
 * MATNNI MODEL YOZMAYDI. U o'zbekcha yozuvni doim buzadi ("Tabiatdan
 * ilhom" o'rniga tanib bo'lmaydigan harflar) — bu brendni arzonlashtiradi.
 * Shuning uchun rasm YOZUVSIZ chiziladi, sarlavhani esa ustiga o'zimiz
 * qo'yamiz (repozitoriyadagi shrift bilan, imlo har doim to'g'ri).
 */
export async function posterChiz({ base64, mime, prompt, nisbat, matn_bosh, matn_qosh }) {
  const nis = NISBATLAR[nisbat] ? nisbat : '3:4';

  const yozuv = (matn_bosh || matn_qosh)
    ? `\n\nDo NOT render any text, letters, numbers, logos or watermarks in the
image. Leave the lower third visually calm and uncluttered — a caption will
be placed there afterwards.`
    : '\n\nDo not render any text on the image.';

  const toliq = `${prompt}

The product in the reference image must be reproduced faithfully — same bottle
shape, same colours, same label layout. This is a commercial advertising poster:
professional studio lighting, sharp focus on the product, magazine quality.
Aspect ratio ${nis} — the artwork must FILL the whole frame edge to edge.
Never add black bars, white borders, letterboxing, framing or padding of any
kind: no part of the canvas may be left empty.${yozuv}`;

  const parts = base64
    ? [{ text: toliq }, rasmPart(base64, mime || 'image/jpeg')]
    : [{ text: toliq }];

  const rasm = await aiRasm(parts, { nisbat: nis });

  // Model nisbatni har doim ham hurmat qilmaydi — o'zimiz kesamiz,
  // va yozuvni ham o'zimiz qo'yamiz
  try {
    return await posterniTuzat({
      base64: rasm.base64, mime: rasm.mime, nisbat: nis,
      matnBosh: matn_bosh || '', matnQosh: matn_qosh || '',
    });
  } catch (e) {
    // Tuzatib bo'lmasa (motor yo'q) — model bergani baribir qaytadi
    console.error('Posterni tuzatib bo‘lmadi:', e.message);
    return rasm;
  }
}
