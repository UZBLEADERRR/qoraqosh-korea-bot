// INSTAGRAM DIRECT — AI SUHBATDOSH.
//
// Do'konning Instagram sahifasini yurituvchi jonli sotuvchi-maslahatchi:
// teri bo'yicha konsultatsiya beradi, mos mahsulot tavsiya qiladi,
// qanday buyurtma qilishni va ilovadan foydalanishni o'rgatadi. Narxni
// katalogdan ANIQ aytadi.
//
// USLUB — eng muhimi. Odam Direct'da «AI matni»ni darrov sezadi
// («Albatta! Ajoyib savol! 🌟✨ Mana sizga 5 ta maslahat:») va ketadi.
// Shuning uchun uslub qoidalari admin ko'rsatmasidan QAT'I NAZAR doim
// qo'shiladi, javob esa yuborishdan oldin «slop»dan tozalanadi.
//
// HALOLLIK: «bot/AI misan?» deb to'g'ridan-to'g'ri so'rashsa — yolg'on
// gapirmaydi: KiOVO yordamchisi ekanini aytadi, kerak bo'lsa menejerni
// chaqiradi. Odamga o'xshab yozish — uslub, odam deb aldash emas.
import { aiJson } from './index.js';
import { katalogniTanla } from './katalog-tanlov.js';

const SXEMA = {
  type: 'object',
  properties: {
    ig_javob:    { type: 'string' },
    niyat:       { type: 'string', enum: ['salom', 'savol', 'narx', 'tahlil', 'buyurtma', 'shikoyat', 'boshqa'] },
    admin_kerak: { type: 'boolean' },
  },
  required: ['ig_javob', 'niyat', 'admin_kerak'],
  propertyOrdering: ['ig_javob', 'niyat', 'admin_kerak'],
};

export const STANDART_KORSATMA = `Sen KiOVO do'konining Instagram sahifasini yuritadigan odamsan (sotuvchi-maslahatchi).
KiOVO — O'zbekistondagi Koreya kosmetikasi do'koni: Telegram bot, ilova (sayt va Android),
bepul AI yuz skaneri va teri bo'yicha maslahat. Teri parvarishini yaxshi bilasan.
Ismingni so'rashsa — «KiOVO jamoasidanman» de.

NIMALAR QILASAN:
1) KONSULTATSIYA. Teri turi, akne, dog', quruqlik, yog'lanish, teshiklar, ajin, SPF,
   tarkiblar (niatsinamid, retinol, kislotalar), tartib (tozalash → toner → davolash →
   namlash → kunduzi SPF), nimani nima bilan birga surtmaslik. Sodda tilda, qisqa.
   Ma'lumot yetmasa — bitta savol ber yoki bepul tahlilni taklif qil: yuzini yorug' joyda
   bitta rasmga olib shu yerga tashlasa, 30 soniyada tahlil qilib beriladi.
2) MAHSULOT. Faqat KATALOGdagi mahsulot, narxi aniq katalogdagidek. Nega aynan unga
   mosligini uning muammosiga bog'lab ayt. Bir yo'la 1-2 tadan ko'p taklif qilma.
   Katalogda yo'q bo'lsa o'ylab topma: «hozir yo'q, o'rniga …» de.
3) BUYURTMA. Direct'da buyurtma olinmaydi — Telegram bot yoki ilova orqali
   (DO'KON MA'LUMOTI dagi qadamlar). So'rashsa oddiy qilib tushuntir va havolani ber.
4) ILOVA. Qanday ishlatishni so'rashsa — bo'limlarini ayt.
5) BILMASANG o'ylab topma (yetkazish muddati, kafolat, manzil…): BILIM va DO'KON
   MA'LUMOTI da bo'lmasa «aniqlab aytaman» de va admin_kerak=true.

«Bot/AI misan?» deb to'g'ridan-to'g'ri so'rashsa — yolg'on gapirma: «KiOVO'ning AI
yordamchisiman, xohlasangiz menejerni ulab beraman» de.
Shikoyat, qaytarish, to'lov yoki yetkazish muammosi, jahl — admin_kerak=true va
«hozir menejerimiz yozadi» de. Tibbiy tashxis qo'yma, dori tavsiya qilma; jiddiy holatda
(yiringli, og'riqli toshma) dermatologga borishni maslahat ber.`;

// Bu qoidalar admin ko'rsatmasi o'zgartirilsa ham DOIM qo'shiladi.
export const USLUB = `USLUB — HAQIQIY ODAMDEK, TELEFONDA YOZGANDEK (eng muhim qoida):
- Instagram chat. Har fikr — alohida qisqa xabar. 2-3 xabarga bo'lsang orasini BO'SH QATOR
  bilan ajrat (har biri alohida yuboriladi). Bitta xabar odatda 3-12 so'z.
- Gap oxirida nuqta qo'yma. Vergul kam. Gapni kichik harf bilan boshlasang ham bo'ladi.
- Tire (—), «qo'shtirnoq», nuqtali vergul, ro'yxat, ** yulduzcha YO'Q.
- Narxni odamcha yoz: «185 ming», «1 mln 200 ming».
- Emoji kam: ko'pincha umuman yo'q, ba'zan bitta 🙂 😊 🙏
- Mijoz qisqa yozsa sen ham qisqa. Uning gapini takrorlama, har xabarni salom bilan boshlama,
  o'zingni tanishtirib o'tirma, oxirida «yana savol bo'lsa…» dema.
- Rasmiy iboralar YO'Q: «Hurmatli mijoz», «Albatta!», «Ajoyib savol», «Sizga yordam
  berishdan mamnunman», «Umid qilamanki», «Qo'shimcha savollar bo'lsa», «Konechno»,
  «Отличный вопрос», «Рада помочь».
- Mijoz qaysi tilda yozsa (o'zbek lotin/kirill, rus) o'sha tilda. «Siz» deb, lekin samimiy.
- Ovozli xabar kelsa: hozir eshita olmasligingni ayt, yozib yuborishini so'ra.
  Story'da belgilasa — samimiy rahmat ayt. Post ulashsa — nima qiziqtirganini so'ra.

MISOLLAR (xuddi shu ohangda yoz, so'zma-so'z ko'chirma):
Mijoz: Assalomu alaykum
Siz: va alaykum assalom, eshitaman

Mijoz: akne uchun nima bor
Siz: bor, lekin avval teringizni bilsam yaxshi bo'lardi

Siz: yuzingizni yorug' joyda bitta rasmga olib shu yerga tashlang, qarab aytaman qaysi biri mos

Mijoz: centella ampula narxi qancha
Siz: 227 ming

Siz: hozir aksiyada, oldin 260 edi

Mijoz: dostavka bormi
Siz: ha, butun o'zbekiston bo'ylab pochta orqali jo'natamiz

Siz: narxi og'irlikka qarab, buyurtma paytida o'zi hisoblanadi

Mijoz: qanday buyurtma qilaman
Siz: telegram botimizdan, oson

Siz: do'kon bo'limidan tanlab savatga qo'shasiz, manzilni yozasiz, kartaga to'lab chekni tashlaysiz tamom

Mijoz: Здравствуйте, есть солнцезащитный крем?
Siz: здравствуйте, да есть

Siz: для какой кожи? жирная или сухая

Mijoz: rahmat
Siz: arzimaydi 😊`;

/** Javobni «AI slop»dan tozalaydi: markdown, ortiqcha emoji, quruq ochilish iboralari. */
export function slopTozala(t) {
  let s = String(t || '').replace(/\r/g, '');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/^#{1,6}\s+/gm, '')
       .replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm, '');
  // Ochilishdagi quruq iboralar — bir nechtasi ketma-ket kelsa ham
  const OCHILISH = /^\s*(albatta|ajoyib savol|zo['‘’ʻ`]?r savol|yaxshi savol|juda yaxshi savol|hurmatli mijoz|konechno|конечно|отличный вопрос|хороший вопрос|absolutely|great question)[!.,:\s]*/i;
  for (let i = 0; i < 3 && OCHILISH.test(s); i++) s = s.replace(OCHILISH, '');
  // Oxiridagi «yana savol bo'lsa…» dumi
  s = s.replace(/\s*(yana|qo['‘’ʻ`]?shimcha)\s+savol(lar)?ingiz\s+bo['‘’ʻ`]?lsa[^.!?\n]*[.!?]?\s*$/i, '')
       .replace(/\s*(если|если у вас)\s+(будут|остались|есть)\s+(ещё\s+)?вопросы[^.!?\n]*[.!?]?\s*$/i, '')
       .replace(/\s*umid qilamanki[^.!?\n]*[.!?]?\s*$/i, '');
  // Emoji: birinchisi qoladi, qolgani olib tashlanadi
  let bor = false;
  s = s.replace(/\p{Extended_Pictographic}️?/gu, (e) => (bor ? '' : ((bor = true), e)));
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?])/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Suhbatga bog'liq barqaror «qo'l uslubi»: bir odam butun suhbatda bir xil yozadi. */
export function uslubUrugi(kalit) {
  let h = 0;
  for (const c of String(kalit || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const ming = (n, rus) => {
  if (n >= 1e6) {
    const mln = Math.floor(n / 1e6), q = Math.round((n % 1e6) / 1000);
    return rus ? `${mln} млн${q ? ` ${q} тыс` : ''}` : `${mln} mln${q ? ` ${q} ming` : ''}`;
  }
  return n % 1000 === 0 ? (rus ? `${n / 1000} тыс` : `${n / 1000} ming`) : `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ${rus ? 'сум' : "so'm"}`;
};

/**
 * Matnni telefonda yozilgandek qiladi: egri tutuq belgilari, tire va
 * qo'shtirnoqlar (AI belgisi) olib tashlanadi, oxirgi nuqta tushadi,
 * narx «185 ming» bo'ladi. Havolalarga tegilmaydi.
 */
export function insonlashtir(t, urug = 0) {
  const havolalar = [];
  let s = String(t || '').replace(/https?:\/\/\S+?(?=[.,!?)]*(?:\s|$))/g, (h) => `\u0000${havolalar.push(h) - 1}\u0000`);
  const rus = /[а-яё]/i.test(s) && !/[a-z]{3}/i.test(s.replace(/\u0000\d+\u0000/g, ''));
  s = s.replace(/[‘’ʻʼ`´]/g, "'")
       .replace(/[«»“”„]/g, '')
       .replace(/\s+[—–]\s+/g, ' ').replace(/[—–]/g, '-')
       .replace(/;/g, ',')
       .replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?')
       .replace(/\.{4,}/g, '...');
  s = s.replace(/(\d{1,3}(?:[  .,]\d{3})+|\d{4,})\s*(?:so['‘’ʻ]?m|сум|sum|uzs)(?![\p{L}])/giu, (_, r) => {
    const n = Number(String(r).replace(/[  .,]/g, ''));
    return Number.isFinite(n) && n > 0 ? ming(n, rus) : _;
  });
  s = s.split('\n').map((q) => q.replace(/(?<!\.)\.\s*$/, '').replace(/\s+$/, '')).join('\n');
  // Ba'zi odamlar gapni kichik harf bilan boshlaydi — suhbat bo'yi bir xil
  if (urug % 2 === 0) {
    s = s.replace(/(^|\n)([A-ZА-ЯЁ])(?=[a-zа-яё'])/g, (_, b, h) => b + h.toLowerCase());
  }
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,!?])/g, '$1').trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => havolalar[Number(i)]);
}

/** Javobni alohida yuboriladigan qisqa xabarlarga bo'ladi (ko'pi bilan 3 ta). */
export function qismlarga(t, chegara = 3) {
  let q = String(t || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (q.length === 1 && q[0].length > 170 && !/\n/.test(q[0])) {
    const m = q[0];
    const yarim = m.length / 2;
    let eng = -1;
    for (const x of m.matchAll(/[.!?](\s+)(?=\S)/g)) {
      if (eng < 0 || Math.abs(x.index - yarim) < Math.abs(eng - yarim)) eng = x.index;
    }
    if (eng > 30 && eng < m.length - 20) q = [m.slice(0, eng + 1).trim(), m.slice(eng + 1).trim()];
  }
  if (q.length > chegara) q = [...q.slice(0, chegara - 1), q.slice(chegara - 1).join('\n')];
  return q;
}

/**
 * Bitta xabarni «yozish» vaqti (ms): odam o'qiydi, o'ylaydi, keyin yozadi.
 * tezlik: 'tabiiy' | 'sekin' | 'tez'
 */
export function yozishVaqti(matn, { birinchi = false, tezlik = 'tabiiy', tasodif = Math.random } = {}) {
  const T = { tez: [1.5, 12, 600, 3000], tabiiy: [3.5, 5, 1500, 14000], sekin: [7, 3.2, 3000, 26000] }[tezlik] || [3.5, 5, 1500, 14000];
  const [oqish, belgiSoniya, min, maks] = T;
  const uzun = String(matn || '').replace(/https?:\/\/\S+/g, 'havola').length;
  const ms = (birinchi ? oqish * 1000 * (0.4 + tasodif() * 0.6) : 600 + tasodif() * 1400)
    + (uzun / belgiSoniya) * 1000 * (0.8 + tasodif() * 0.4);
  return Math.round(Math.max(min, Math.min(maks, ms)));
}

const narxi = (p) => `${Number(p.price).toLocaleString('ru-RU').replace(/ /g, ' ')} so'm`;

const katalogMatni = (r) => r.map((p) =>
  `${p.id}|${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}|${p.price} so'm${p.old_price > p.price ? ` (aksiya, eski ${p.old_price})` : ''}`
  + `${p.dona_soni > 1 ? `|${p.dona_soni} dona` : ''}|${(p.concerns || []).join(',')}${p.stock > 0 ? '' : '|TUGAGAN'}`).join('\n');

/**
 * Do'kon haqida faktlar: AI buyurtma va ilovani shu bo'yicha o'rgatadi
 * (o'ylab topmasin). `dokon` — bazadan yig'ilgan qisqa bilim (brendlar,
 * toifalar, aksiya, ko'p sotilganlar, yetkazish tarifi), `bilim` — admin
 * yozgan FAQ (manzil, muddat, kafolat…).
 */
export function dokonMalumoti({ tg_havola = '', ilova_havola = '', play_havola = '', telefon = '', dokon = '', bilim = '' } = {}) {
  return `DO'KON MA'LUMOTI (faqat shularga tayan):
- Buyurtma qadamlari: Telegram botni oching (${tg_havola || 'Telegram bot'}) → telefon raqam va ism bilan
  30 soniyada ro'yxatdan o'tasiz → «🛍 Do'kon» → mahsulotni tanlab «Savatga» → Savat →
  «Rasmiylashtirish»: viloyat, tuman, manzil va yetkazish turi (pochta filialidan olib ketish
  yoki uygacha) → narx og'irlikka qarab o'zi hisoblanadi → «Buyurtmani tasdiqlash».
- To'lov: kartaga o'tkazma. Tasdiqlagach karta raqami chiqadi, to'lab chek rasmini
  yuklaysiz, menejer tasdiqlaydi. Jo'natma O'zbekiston bo'ylab pochta orqali ketadi.
- Ilova: ${ilova_havola || 'Telegram botdagi «Do‘kon» tugmasi'}${play_havola ? `, Android: ${play_havola}` : ''}.
  Bo'limlari: «Skaner» — yuzni tahlil qiladi va mos parvarish tuzadi; «Maslahat» — AI'ga
  teri haqida yozib so'raysiz; «Do'kon» — katalog, qidiruv, aksiyalar; «Savat»; «Profil» —
  buyurtmalar holati va tahlillar tarixi.
- Yuz tahlili natijasi va tavsiya qilingan mahsulotlar Telegramda ochiladi: o'sha yerdan
  bir bosishda savatga qo'shiladi.${telefon ? `\n- Menejer telefoni: ${telefon}` : ''}${dokon ? `\n${dokon}` : ''}${bilim ? `

BILIM (do'kon egasi yozgan — aniq fakt, shunga tayan):
${String(bilim).slice(0, 3000)}` : ''}`;
}

/**
 * @param {object} o
 * @param {Array}  o.tarix    [{kim:'mijoz'|'ai'|'admin', matn}] eng eskisi birinchi
 * @param {string} o.korsatma admin yozgan ko'rsatma (bo'sh — standart)
 * @param {Array}  o.mahsulotlar katalog
 * @param {object} o.malumot  {ism, tg_havola, tahlil, tahlil_havola, ilova_havola, play_havola, telefon, dokon, bilim, urug}
 */
export async function igJavob({ tarix = [], korsatma = '', mahsulotlar = [], malumot = {} }) {
  const oxirgi = [...tarix].reverse().find((x) => x.kim === 'mijoz')?.matn || '';
  const { royxat } = katalogniTanla(mahsulotlar, {
    savol: `${oxirgi} ${malumot.tahlil_soz || ''}`.trim(),
    tarix: tarix.map((x) => ({ kim: x.kim === 'mijoz' ? 'odam' : 'ai', matn: x.matn })), chegara: 25,
  });
  const k = (korsatma || STANDART_KORSATMA).replaceAll('{tg_havola}', malumot.tg_havola || 'Telegram botimiz');
  const suhbat = tarix.slice(-20).map((x) => `${x.kim === 'mijoz' ? 'Mijoz' : 'Siz'}: ${String(x.matn || '').slice(0, 500)}`).join('\n');
  const matn = `${k}

${USLUB}

${dokonMalumoti(malumot)}

${malumot.ism ? `MIJOZ ISMI: ${malumot.ism}\n` : ''}${malumot.izoh ? `MENEJER ESLATMASI: ${malumot.izoh}\n` : ''}${malumot.tahlil ? `UNING YUZ TAHLILI (allaqachon qilingan, natija rasmi unga yuborilgan):
${malumot.tahlil}
Tavsiyalar Telegramda ochiladigan havola: ${malumot.tahlil_havola || malumot.tg_havola || '-'}
` : ''}TELEGRAM HAVOLA: ${malumot.tg_havola || '-'}

KATALOG (id|nom|narx|...):
${katalogMatni(royxat)}

SUHBAT (oxirgisi pastda):
${suhbat}

Endi «Siz» sifatida javob yoz (ig_javob): 1-3 qisqa xabar, oralari bo'sh qator bilan.
Havolani faqat kerak bo'lganda ber (buyurtma, tavsiyani ochish, ilova), alohida xabarda.`;
  const j = await aiJson([{ text: matn }], SXEMA, { temperature: 0.85, maxTokens: 1024, qayerda: 'instagram' });
  const toza = slopTozala(j.ig_javob).slice(0, 950);
  return {
    javob: insonlashtir(toza, malumot.urug ?? 1),
    niyat: SXEMA.properties.niyat.enum.includes(j.niyat) ? j.niyat : 'boshqa',
    admin_kerak: j.admin_kerak === true,
  };
}

/** Rasm tahlilidan keyin — faqat qisqa, odamcha bir-ikki gap va havola. */
export function tahlilQisqa({ havola = '', urug = 0, rus = false } = {}) {
  const V = rus
    ? [['вот ваш результат', `подробно и что вам подойдёт можно открыть в телеграме\n${havola}`],
       ['готово, вот анализ', `полный разбор и уход под вашу кожу тут\n${havola}`]]
    : [['mana natijangiz', `batafsili va sizga mos parvarish telegramda ochiladi\n${havola}`],
       ['tayyor, mana tahlil', `to'liq tushuntirish va nima surtish kerakligi shu yerda\n${havola}`],
       ['natija chiqdi', `qaysi birini qachon surtish kerakligigacha telegramda yozilgan\n${havola}`]];
  return V[urug % V.length];
}

/**
 * Tahlildan keyingi xabar: «mana shular sizga kerak» — odamning o'z
 * muammosi bilan bog'langan, ishonarli, lekin sotuvchi baqirig'isiz.
 * AI ishlamasa — tayyor andoza (hech qachon bo'sh qolmaydi).
 *
 * @param {object} o
 * @param {object} o.tahlil   {ball, tavsif, teri_turi, muammolar:[{nom,foiz}]}
 * @param {Array}  o.tavsiya  [{nom, brend, narx, eski_narx, bosqich, sabab}]
 * @param {string} o.havola   Telegramda tavsiyani ochadigan havola
 */
export async function tahlilXabari({ tahlil = {}, tavsiya = [], havola = '', ism = '', korsatma = '' }) {
  const asosiy = tavsiya.slice(0, 4);
  let body = '';
  try {
    const j = await aiJson([{ text: `${korsatma || STANDART_KORSATMA}

${USLUB}

VAZIFA: mijoz Instagram Direct'ga yuzining rasmini yubordi, tahlil tayyor va natija rasmi
unga hozirgina yuborildi. Endi uning o'ziga qaratilgan BITTA xabar yoz:
- avval 1 gapda eng muhim topilmani odamcha ayt (ball emas, ko'rgan narsang: «yonoqlarda
  quruqlik va bir oz dog' bor» kabi);
- keyin tavsiya qilingan mahsulotlardan 2-4 tasini ayt: har biri alohida qatorda, oddiy
  ko'rinishda «nom — narx, nega aynan sizga» (qisqa). Raqamli ro'yxat va yulduzcha yo'q;
- oxirida bir gap: to'liq tavsiya va tartib Telegramda ochiladi, o'sha yerdan savatga qo'shsa bo'ladi.
  Havolani O'ZING yozma — u xabar oxiriga avtomatik qo'shiladi.
Ishonarli bo'lsin, lekin baland so'zsiz («mo'jiza», «100% natija» yo'q). Jami 450 belgidan oshmasin.

${ism ? `MIJOZ ISMI: ${ism}\n` : ''}TAHLIL: ball ${tahlil.ball ?? '?'}/100, ${tahlil.teri_turi || ''} teri. ${tahlil.tavsif || ''}
MUAMMOLAR: ${(tahlil.muammolar || []).map((m) => `${m.nom}${m.foiz ? ` ${m.foiz}%` : ''}`).join(', ') || 'jiddiy muammo yo‘q'}
TAVSIYA QILINGAN MAHSULOTLAR (faqat shulardan, narx shu):
${asosiy.map((p) => `${p.brend ? p.brend + ' ' : ''}${p.nom} | ${narxi({ price: p.narx })}${p.eski_narx > p.narx ? ` (aksiya, eski ${narxi({ price: p.eski_narx })})` : ''} | ${p.bosqich || ''} | ${p.sabab || ''}`).join('\n') || '-'}` }],
    SXEMA, { temperature: 0.8, maxTokens: 800, qayerda: 'instagram' });
    body = slopTozala(j.ig_javob);
  } catch { /* andozaga tushamiz */ }
  if (!body || body.length < 20) body = tahlilAndozasi({ tahlil, tavsiya: asosiy, ism });
  // Havola AI yozgan matnda bo'lsa — takrorlanmasin; Instagram 1000 belgida kesadi
  body = body.replace(/https?:\/\/t\.me\/\S+/g, '').replace(/[ \t]+\n/g, '\n').trim();
  return `${body.slice(0, 1000 - havola.length - 2)}\n\n${havola}`.trim();
}

const kichik = (t) => (t && !/^[A-ZА-Я]{2}/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

/** AI ishlamasa — odamcha andoza (har safar bir xil bo'lmasin). */
export function tahlilAndozasi({ tahlil = {}, tavsiya = [], ism = '' }) {
  const m = (tahlil.muammolar || []).slice(0, 2).map((x) => String(x.nom || '').toLowerCase()).filter(Boolean);
  const bosh = [
    `Ko‘rib chiqdim${ism ? `, ${ism}` : ''}.`,
    `Mana natijangiz${ism ? `, ${ism}` : ''}.`,
    `Tayyor${ism ? `, ${ism}` : ''}.`,
  ][Math.floor(Math.random() * 3)];
  const topilma = m.length
    ? ` Asosiy narsa — ${m.join(' va ')}, shunga qarab parvarish tanladim:`
    : ' Teringiz yaxshi holatda, uni shunday saqlash uchun mana bular yetadi:';
  const qator = tavsiya.slice(0, 4).map((p) =>
    `${p.brend ? p.brend + ' ' : ''}${p.nom} — ${narxi({ price: p.narx })}${p.sabab ? `, ${kichik(String(p.sabab).replace(/\.$/, '').slice(0, 90))}` : ''}`);
  return `${bosh}${qator.length ? topilma : ''}\n${qator.join('\n')}\n\nQaysi birini qachon surtish va to‘liq tartib Telegramda ochiladi, o‘sha yerdan bir bosishda savatga qo‘shasiz:`.trim();
}

/** Kommentga Direct matni (qoida «dm_ai» bo'lsa): komment savoliga qisqa, aniq javob. */
export async function kommentDmMatni({ komment, korsatma = '', mahsulotlar = [], malumot = {} }) {
  const r = await igJavob({ tarix: [{ kim: 'mijoz', matn: `(Postga komment yozdi) ${komment}` }], korsatma, mahsulotlar,
    malumot: { ...malumot } });
  return r.javob;
}
