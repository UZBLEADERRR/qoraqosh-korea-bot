// INSTAGRAM DIRECT — AI SUHBATDOSH.
//
// Do'konning Instagram sahifasini yurituvchi jonli sotuvchidek yozadi:
// qisqa, samimiy, mijoz tilida (o'zbek/rus), shablonsiz. Asosiy maqsad —
// odamni bepul yuz tahliliga (rasm yuborish) va Telegram botga olib
// o'tish, narx so'rasa katalogdan ANIQ narx aytish.
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
Uslub: jonli odamdek, qisqa (1–3 gap), samimiy, «siz» deb. Emoji ko'pi bilan 1 ta.
Ro'yxat, sarlavha, uzun matn YOZMA — bu chat. Mijoz qaysi tilda yozsa
(o'zbek lotin/kirill, rus) — o'sha tilda javob ber.

MAQSAD — har suhbatni shu ikkitadan biriga olib bor:
1) BEPUL YUZ TAHLILI: «yuzingizni yorug' joyda, to'g'ri qilib bitta rasm
   yuboring — AI 30 soniyada teringizni tahlil qilib beradi». Teri muammosi,
   «nima mos?», «qaysi krem?» deyishsa — avval rasm so'ra.
2) TELEGRAM: buyurtma, to'liq natija, katalog — {tg_havola} (ilova ham bor).
Narx so'rasa — katalogdan ANIQ narxni ayt (o'ylab topma). Katalogda bo'lmasa —
«hozir yo'q, o'xshashini topib beraman» de va rasm so'ra.
Buyurtmani DM da rasmiylashtirma: Telegram bot/ilova orqali (yetkazish,
to'lov o'sha yerda).

Agar «bot/AI misan?» deb to'g'ridan-to'g'ri so'rashsa — yolg'on gapirma:
«KiOVO'ning AI yordamchisiman, kerak bo'lsa menejerni ulayman» de.
Shikoyat, qaytarish, to'lov muammosi, jahl — admin_kerak=true va
«hozir menejerimiz yozadi» de. Tibbiy tashxis qo'yma, dori tavsiya qilma.`;

const katalogMatni = (r) => r.map((p) =>
  `${p.id}|${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}|${p.price} so'm${p.old_price > p.price ? ` (aksiya, eski ${p.old_price})` : ''}`
  + `${p.dona_soni > 1 ? `|${p.dona_soni} dona` : ''}|${(p.concerns || []).join(',')}${p.stock > 0 ? '' : '|TUGAGAN'}`).join('\n');

/**
 * @param {object} o
 * @param {Array}  o.tarix    [{kim:'mijoz'|'ai'|'admin', matn}] eng eskisi birinchi
 * @param {string} o.korsatma admin yozgan ko'rsatma (bo'sh — standart)
 * @param {Array}  o.mahsulotlar katalog
 * @param {object} o.malumot  {ism, tg_havola, tahlil}
 */
export async function igJavob({ tarix = [], korsatma = '', mahsulotlar = [], malumot = {} }) {
  const oxirgi = [...tarix].reverse().find((x) => x.kim === 'mijoz')?.matn || '';
  const { royxat } = katalogniTanla(mahsulotlar, {
    savol: oxirgi, tarix: tarix.map((x) => ({ kim: x.kim === 'mijoz' ? 'odam' : 'ai', matn: x.matn })), chegara: 25,
  });
  const k = (korsatma || STANDART_KORSATMA).replaceAll('{tg_havola}', malumot.tg_havola || 'Telegram botimiz');
  const suhbat = tarix.slice(-16).map((x) => `${x.kim === 'mijoz' ? 'Mijoz' : 'Siz'}: ${String(x.matn || '').slice(0, 500)}`).join('\n');
  const matn = `${k}

${malumot.ism ? `MIJOZ ISMI: ${malumot.ism}\n` : ''}${malumot.tahlil ? `UNING YUZ TAHLILI (allaqachon qilingan): ${malumot.tahlil}\n` : ''}TELEGRAM HAVOLA: ${malumot.tg_havola || '-'}

KATALOG (id|nom|narx|...):
${katalogMatni(royxat)}

SUHBAT (oxirgisi pastda):
${suhbat}

Endi «Siz» sifatida BITTA qisqa javob yoz (ig_javob). Salomlashishni har
xabarda takrorlama. Oldingi javoblaringni so'zma-so'z qaytarma.`;
  const j = await aiJson([{ text: matn }], SXEMA, { temperature: 0.7, maxTokens: 1024, qayerda: 'instagram' });
  return {
    javob: String(j.ig_javob || '').trim().slice(0, 900),
    niyat: SXEMA.properties.niyat.enum.includes(j.niyat) ? j.niyat : 'boshqa',
    admin_kerak: j.admin_kerak === true,
  };
}

/** Kommentga Direct matni (qoida «dm_ai» bo'lsa): komment savoliga qisqa, aniq javob. */
export async function kommentDmMatni({ komment, korsatma = '', mahsulotlar = [], malumot = {} }) {
  const r = await igJavob({ tarix: [{ kim: 'mijoz', matn: `(Postga komment yozdi) ${komment}` }], korsatma, mahsulotlar,
    malumot: { ...malumot } });
  return r.javob;
}
