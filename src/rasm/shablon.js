// Natija kartochkasi uchun SHABLON motori.
//
// Nega kerak. Kartochkaning ko'rinishi shu paytgacha faqat koddan
// o'zgarardi: do'kon egasi «mana bunday bo'lsin» desa, dasturchi
// kutish kerak edi. Endi admin yordamchisi (AI) kartochkaning
// TO'LIQ ko'rinishini o'zi yozadi, admin ko'rib chiqadi va
// tasdiqlaydi.
//
// Nega JS emas, SHABLON. AI yozgan JavaScript ni serverda bajarish —
// bu botga to'g'ridan-to'g'ri kod yuborish bilan barobar: bitta
// noto'g'ri qadamda baza ham, kalitlar ham ochiq qoladi. Shuning
// uchun AI SVG yozadi, bu yerdagi motor esa unga faqat MA'LUMOTNI
// qo'yib beradi. Hech qanday `eval`, `new Function` yoki modul
// yuklash yo'q — shunchaki matn almashtirish.
//
// Shablon tili ataylab kichik, lekin kartochka uchun yetarli:
//
//   {{ball}}                  — qiymat (HTML/XML uchun ekranlanadi)
//   {{muammo.nom}}            — nuqtali yo'l
//   {{#muammolar}}…{{/}}      — ro'yxat bo'ylab takrorlash
//   {{?xulosa}}…{{/}}         — bor bo'lsa chiqar
//   {{^xulosa}}…{{/}}         — YO'Q bo'lsa chiqar
//   {{@i}} {{@n}} {{@x}} {{@y}} — o'rni (0 dan), tartibi (1 dan),
//                                ustun/qator (setka uchun)
//
// SVG ning o'zi tekshiriladi: `<script>`, `<foreignObject>` va
// tashqi havolalar taqiqlangan — kartochka rasm bo'lib qolishi
// kerak, dastur emas.

/** Shablonda ISHLATSA bo'ladigan maydonlar — AI ga ko'rsatma uchun. */
export const MAYDONLAR = {
  brend: 'do‘kon nomi',
  sana: 'bugungi sana',
  ball: 'umumiy ball (0-100)',
  holat: 'ball so‘z bilan: «Yaxshi holat»',
  ball_rang: 'ballga mos rang (#RRGGBB)',
  yosh: 'taxminiy yosh, masalan «22-26»',
  jins: '«Erkak» / «Ayol» / bo‘sh',
  teri_turi: 'aralash / quruq / yog‘li …',
  teri_rangi: 'teri toni',
  xulosa: 'AI ning bir gaplik xulosasi',
  tavsif: '«rasmda nimani ko‘rdim»',
  yuz: 'foydalanuvchi surati — data URI (xohlasangiz <image href="{{yuz}}">)',
  yuz_bor: 'surat bormi (shart uchun)',
  en: 'kartochka eni (px)',
  muammolar: 'ro‘yxat: nom, zona, foiz, ball, rang, tartib, joy_x, joy_y',
  mahsulotlar: 'ro‘yxat: nom, bosqich, narx, rasm (data URI), tartib, rang',
  foydali: 'ro‘yxat: nom',
  cheklang: 'ro‘yxat: nom',
  prognoz: 'ro‘yxat: muammo, ehtimol, muddat, natija',
};

/** XML uchun xavfsiz matn. */
const x = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** `a.b.c` yo'li bo'yicha qiymat. */
function yol(manba, kalit) {
  if (kalit === '.') return manba;
  let v = manba;
  for (const qism of String(kalit).split('.')) {
    if (v === null || v === undefined) return '';
    v = v[qism];
  }
  return v === null || v === undefined ? '' : v;
}

/**
 * Shablonni ma'lumot bilan to'ldiradi.
 *
 * Rekursiv: `{{#…}}` bloklari ichida yana bloklar bo'lishi mumkin.
 * Blok oxiri `{{/}}` yoki `{{/nom}}` — ikkalasi ham ishlaydi.
 */
export function toldir(shablon, malumot) {
  return blokni(String(shablon ?? ''), [malumot || {}]);
}

const BLOK = /\{\{([#?^])\s*([\w.]+)\s*\}\}/;

function blokni(matn, stek) {
  let natija = '';
  let qolgan = matn;

  for (;;) {
    const m = BLOK.exec(qolgan);
    if (!m) { natija += oddiy(qolgan, stek); break; }

    natija += oddiy(qolgan.slice(0, m.index), stek);
    const [tola, tur, kalit] = m;
    const ich = ichini(qolgan.slice(m.index + tola.length), kalit);
    if (!ich) {                    // yopilmagan blok — matn sifatida qoldiramiz
      natija += oddiy(qolgan.slice(m.index), stek);
      break;
    }
    const qiymat = topilsin(kalit, stek);

    if (tur === '#') {
      const royxat = Array.isArray(qiymat) ? qiymat : (qiymat ? [qiymat] : []);
      royxat.forEach((el, i) => {
        const band = (el && typeof el === 'object') ? el : { '.': el };
        natija += blokni(ich.ichi, stek.concat([{
          ...band, '@i': i, '@n': i + 1,
          '@x': i % 4, '@y': Math.floor(i / 4),
        }]));
      });
    } else if (tur === '?') {
      if (bormi(qiymat)) natija += blokni(ich.ichi, stek);
    } else {
      if (!bormi(qiymat)) natija += blokni(ich.ichi, stek);
    }
    qolgan = ich.keyin;
  }
  return natija;
}

const bormi = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v) || v === 0);

/** Blokning ichi va undan keyingi qismi — ichma-ich bloklarni sanaydi. */
function ichini(matn, kalit) {
  const ochilish = new RegExp(`\\{\\{[#?^]\\s*[\\w.]+\\s*\\}\\}`, 'g');
  const yopilish = new RegExp(`\\{\\{/\\s*(?:${kalit.replace(/\./g, '\\.')})?\\s*\\}\\}`, 'g');
  let chuqur = 1, i = 0;
  for (;;) {
    ochilish.lastIndex = i; yopilish.lastIndex = i;
    const a = ochilish.exec(matn);
    const b = yopilish.exec(matn);
    if (!b) return null;
    if (a && a.index < b.index) { chuqur++; i = a.index + a[0].length; continue; }
    chuqur--;
    if (chuqur === 0) {
      return { ichi: matn.slice(0, b.index), keyin: matn.slice(b.index + b[0].length) };
    }
    i = b.index + b[0].length;
  }
}

/** Stek bo'ylab pastdan yuqoriga qidiradi (ichki blok tashqarini ko'radi). */
function topilsin(kalit, stek) {
  for (let i = stek.length - 1; i >= 0; i--) {
    const v = yol(stek[i], kalit);
    if (v !== '' && v !== undefined) return v;
    if (stek[i] && Object.prototype.hasOwnProperty.call(stek[i], kalit)) return v;
  }
  return '';
}

/* Oddiy `{{kalit}}` almashtirishlari.
 *
 * Ro'yxat ichida SANOQ ustida kichik hisob ham mumkin:
 *
 *   {{@i*60}}       — 0, 60, 120, …   (qator balandligi)
 *   {{@i*60+970}}   — 970, 1030, …    (boshlang'ich siljish bilan)
 *   {{@n*-24}}      — manfiy ham
 *
 * Nega shu kerak. Shablonda ifoda yo'q, lekin kartochkada qatorlarni
 * pastga tushirish SHART: bittasi 970, keyingisi 1030 da turishi
 * kerak. Buni ifodasiz yozib bo'lmaydi.
 *
 * Nega XAVFSIZ. Bu `eval` emas: faqat `@i`/`@n` sanog'i, bitta
 * ko'paytirish va bitta qo'shish. Boshqa hech narsa — o'zgaruvchi
 * ham, funksiya ham — bu yerga tusha olmaydi.
 */
const SANOQ = /^(@[in])\s*(?:\*\s*(-?\d{1,5}))?\s*(?:\+\s*(-?\d{1,6}))?$/;

function oddiy(matn, stek) {
  return matn.replace(/\{\{\s*([\w.@*+\-\s]+?)\s*\}\}/g, (tola, ifoda) => {
    const m = SANOQ.exec(ifoda);
    if (m) {
      const n = Number(topilsin(m[1], stek)) || 0;
      return String(n * (m[2] === undefined ? 1 : Number(m[2]))
                      + (m[3] === undefined ? 0 : Number(m[3])));
    }
    if (!/^[\w.@]+$/.test(ifoda)) return tola;    // tanimadik — tegmaymiz
    const v = topilsin(ifoda, stek);
    return x(typeof v === 'object' ? '' : v);
  });
}

// ──────────────── Xavfsizlik ────────────────

const TAQIQ = [
  [/<\s*script/i,        '<script> ishlatib bo‘lmaydi — kartochka rasm, dastur emas'],
  [/<\s*foreignObject/i, '<foreignObject> ishlatib bo‘lmaydi'],
  [/<\s*iframe/i,        '<iframe> ishlatib bo‘lmaydi'],
  [/\son\w+\s*=/i,       'onclick va shunga o‘xshash hodisalar taqiqlangan'],
  [/javascript:/i,       'javascript: havolasi taqiqlangan'],
  [/<!ENTITY/i,          'ENTITY e’loni taqiqlangan'],
  [/<!DOCTYPE/i,         'DOCTYPE kerak emas'],
];

/** Tashqi manzil: faqat `data:` rasmlar ruxsat etiladi. */
const TASHQI = /(?:href|xlink:href|src)\s*=\s*["'](?!data:|#|\{\{)/i;

/**
 * Shablonni tekshiradi — SAQLASHDAN OLDIN.
 * @returns {{ok:boolean, xato?:string, ogoh:string[]}}
 */
export function tekshir(shablon) {
  const s = String(shablon ?? '');
  const ogoh = [];
  if (s.length < 40) return { ok: false, xato: 'Shablon bo‘sh', ogoh };
  if (s.length > 60_000) return { ok: false, xato: 'Shablon juda uzun (60 KB dan ko‘p)', ogoh };
  if (!/<svg[\s>]/i.test(s)) return { ok: false, xato: '<svg> tegi topilmadi', ogoh };

  for (const [re, izoh] of TAQIQ) if (re.test(s)) return { ok: false, xato: izoh, ogoh };
  if (TASHQI.test(s)) {
    return { ok: false, xato: 'Tashqi manzil (http/https) ishlatib bo‘lmaydi — '
      + 'rasm faqat {{yuz}} yoki {{mahsulot.rasm}} orqali qo‘yiladi', ogoh };
  }
  // Yopilmagan bloklar — chizishda emas, SHU YERDA aytiladi
  const ochiq = (s.match(/\{\{[#?^]/g) || []).length;
  const yopiq = (s.match(/\{\{\//g) || []).length;
  if (ochiq !== yopiq) {
    return { ok: false, ogoh,
      xato: `Bloklar mos emas: ${ochiq} ta ochilgan, ${yopiq} ta yopilgan` };
  }
  if (!/\{\{\s*ball\s*\}\}/.test(s)) ogoh.push('Ballni ko‘rsatmadingiz ({{ball}})');
  if (!/\{\{\s*brend\s*\}\}/.test(s)) ogoh.push('Brend nomi yo‘q ({{brend}})');
  if (!/width\s*=/.test(s) || !/height\s*=/.test(s)) {
    ogoh.push('<svg> da width va height bo‘lishi kerak');
  }
  return { ok: true, ogoh };
}
