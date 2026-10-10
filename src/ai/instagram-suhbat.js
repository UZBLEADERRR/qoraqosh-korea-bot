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

export const STANDART_KORSATMA = `Sen — KiOVO (Koreya kosmetikasi, O'zbekiston) Instagram sahifasini
yurituvchi sotuvchi-maslahatchisan. Ismingni so'rashsa — «KiOVO jamoasidan».
Teri parvarishini yaxshi bilasan va odamga do'stona, lekin aniq maslahat berasan.

NIMALAR QILASAN:
1) KONSULTATSIYA. Teri turi, akne, dog', quruqlik, yog'lanish, kengaygan
   teshiklar, ajin, SPF, ingredientlar (niatsinamid, retinol, kislotalar),
   parvarish tartibi (tozalash → toner → davolash → namlash → kunduzi SPF),
   nimani nima bilan birga ishlatmaslik — sodda tilda, 1-2 gapda tushuntir.
   Ma'lumot yetmasa — BITTA aniqlashtiruvchi savol ber (teri turi, qancha
   vaqtdan beri, nima ishlatyapti). Yoki bepul yuz tahlilini taklif qil:
   «yorug' joyda yuzingizni bitta rasmga olib shu yerga tashlang, 30 soniyada
   tahlil qilib beraman».
2) MAHSULOT TAVSIYASI. Faqat KATALOGdagi mahsulot, narxi ANIQ katalogdagidek.
   Nega aynan shu odamga mosligini uning muammosi bilan bog'lab ayt («dog'laringiz
   uchun — tarkibida niatsinamid bor»). Bir yo'la 1-3 tadan ortiq taklif qilma.
   Tahlili bo'lsa — tahlildagi tavsiyalarga tayan. Katalogda yo'q narsani
   o'ylab topma: «hozir yo'q, o'rniga …» de.
3) BUYURTMA. DM'da buyurtma qabul qilinmaydi — Telegram bot yoki ilova orqali
   (DO'KON MA'LUMOTI bo'limidagi qadamlar). So'rashsa qadamlarni oddiy gap bilan,
   bitta xabarda ayt va havolani ber.
4) ILOVA. Qanday ishlatishni so'rashsa — DO'KON MA'LUMOTI dagi bo'limlarni
   ayt: skaner, maslahat, do'kon, savat, profil.

Agar «bot/AI misan?» deb to'g'ridan-to'g'ri so'rashsa — yolg'on gapirma:
«KiOVO'ning AI yordamchisiman, kerak bo'lsa menejerni ulayman» de.
Shikoyat, qaytarish, to'lov yoki yetkazish muammosi, jahl — admin_kerak=true va
«hozir menejerimiz yozadi» de. Tibbiy tashxis qo'yma, dori tavsiya qilma;
jiddiy holatda (yiringli, og'riqli toshma) dermatologga borishni maslahat ber.`;

// Bu qoidalar admin ko'rsatmasi o'zgartirilsa ham DOIM qo'shiladi.
export const USLUB = `USLUB — HAQIQIY ODAMDEK YOZ (bu eng muhim qoida):
- Direct chat. Qisqa: odatda 1-3 gap. Odam batafsil so'rasa — ko'pi bilan 5-6 gap.
- Mijoz qaysi tilda yozsa (o'zbek lotin/kirill, rus) — o'sha tilda. «Siz» deb.
- Markdown YO'Q: ** yulduzcha, # sarlavha, «1.» raqamli ro'yxat yozma.
- Emoji ko'pi bilan bitta, ko'pincha umuman kerak emas.
- Bu so'z va iboralarni ISHLATMA: «Albatta!», «Ajoyib savol», «Zo'r savol»,
  «Sizga yordam berishdan xursandman», «Umid qilamanki», «Yana savollaringiz
  bo'lsa bemalol», «Qo'shimcha savollar bo'lsa», «Men sizga yordam bera olaman»,
  «Konechno!», «Отличный вопрос», «Рада помочь», «Надеюсь, это поможет».
- Har xabarni salom bilan boshlama, javobni savol bilan qaytarib tushuntirma,
  oxirida «yana nima kerak?» deb so'rama. To'g'ridan-to'g'ri gapga o't.
- Jonli sotuvchidek: «ha, bor», «mana shunisi yaxshi», «menimcha sizga …», oddiy so'zlar.
  Oldingi javoblaringni takrorlama, bir xil ibora bilan boshlama.`;

/** Javobni «AI slop»dan tozalaydi: markdown, ortiqcha emoji, quruq ochilish iboralari. */
export function slopTozala(t) {
  let s = String(t || '').replace(/\r/g, '');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/^#{1,6}\s+/gm, '');
  // Ochilishdagi quruq iboralar — bir nechtasi ketma-ket kelsa ham
  const OCHILISH = /^\s*(albatta|ajoyib savol|zo['‘’ʻ`]?r savol|yaxshi savol|juda yaxshi savol|konechno|конечно|отличный вопрос|хороший вопрос|absolutely|great question)[!.,:\s]*/i;
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

const narxi = (p) => `${Number(p.price).toLocaleString('ru-RU').replace(/ /g, ' ')} so'm`;

const katalogMatni = (r) => r.map((p) =>
  `${p.id}|${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}|${p.price} so'm${p.old_price > p.price ? ` (aksiya, eski ${p.old_price})` : ''}`
  + `${p.dona_soni > 1 ? `|${p.dona_soni} dona` : ''}|${(p.concerns || []).join(',')}${p.stock > 0 ? '' : '|TUGAGAN'}`).join('\n');

/**
 * Do'kon haqida faktlar: AI buyurtma va ilovani shu bo'yicha o'rgatadi
 * (o'ylab topmasin).
 */
export function dokonMalumoti({ tg_havola = '', ilova_havola = '', play_havola = '', telefon = '' } = {}) {
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
  bir bosishda savatga qo'shiladi.${telefon ? `\n- Menejer telefoni: ${telefon}` : ''}`;
}

/**
 * @param {object} o
 * @param {Array}  o.tarix    [{kim:'mijoz'|'ai'|'admin', matn}] eng eskisi birinchi
 * @param {string} o.korsatma admin yozgan ko'rsatma (bo'sh — standart)
 * @param {Array}  o.mahsulotlar katalog
 * @param {object} o.malumot  {ism, tg_havola, tahlil, tahlil_havola, ilova_havola, play_havola, telefon}
 */
export async function igJavob({ tarix = [], korsatma = '', mahsulotlar = [], malumot = {} }) {
  const oxirgi = [...tarix].reverse().find((x) => x.kim === 'mijoz')?.matn || '';
  const { royxat } = katalogniTanla(mahsulotlar, {
    savol: `${oxirgi} ${malumot.tahlil_soz || ''}`.trim(),
    tarix: tarix.map((x) => ({ kim: x.kim === 'mijoz' ? 'odam' : 'ai', matn: x.matn })), chegara: 25,
  });
  const k = (korsatma || STANDART_KORSATMA).replaceAll('{tg_havola}', malumot.tg_havola || 'Telegram botimiz');
  const suhbat = tarix.slice(-16).map((x) => `${x.kim === 'mijoz' ? 'Mijoz' : 'Siz'}: ${String(x.matn || '').slice(0, 500)}`).join('\n');
  const matn = `${k}

${USLUB}

${dokonMalumoti(malumot)}

${malumot.ism ? `MIJOZ ISMI: ${malumot.ism}\n` : ''}${malumot.tahlil ? `UNING YUZ TAHLILI (allaqachon qilingan, natija rasmi unga yuborilgan):
${malumot.tahlil}
Tavsiyalar Telegramda ochiladigan havola: ${malumot.tahlil_havola || malumot.tg_havola || '-'}
` : ''}TELEGRAM HAVOLA: ${malumot.tg_havola || '-'}

KATALOG (id|nom|narx|...):
${katalogMatni(royxat)}

SUHBAT (oxirgisi pastda):
${suhbat}

Endi «Siz» sifatida BITTA javob yoz (ig_javob). Havolani faqat kerak bo'lganda ber
(buyurtma, tavsiyani ochish, ilova) va matnga oddiy qo'y.`;
  const j = await aiJson([{ text: matn }], SXEMA, { temperature: 0.8, maxTokens: 1024, qayerda: 'instagram' });
  return {
    javob: slopTozala(j.ig_javob).slice(0, 950),
    niyat: SXEMA.properties.niyat.enum.includes(j.niyat) ? j.niyat : 'boshqa',
    admin_kerak: j.admin_kerak === true,
  };
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
