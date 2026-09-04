// To'lov tasdiqlangach mijozga boradigan qo'llanma.
//
// Nega kerak: odam mahsulotni NOTO'G'RI ishlatsa natija ko'rmaydi va
// «yordam bermadi» deb qaytib kelmaydi. Qutiga qog'oz solish yetarli
// emas — u yo'qoladi; Telegramda esa doim qo'l ostida turadi.
//
// Ikki ko'rinishda yuboriladi:
//   1. RASM — bir qarashda: tartib, qachon, qanchadan, mahsulot rasmi bilan;
//   2. PDF — har mahsulot uchun alohida sahifa: katta surat, tavsif,
//      tarkib va ehtiyot choralari. Word emas: .docx ni telefonda hamma
//      ham ocholmaydi, PDF esa Telegram ichida darrov ko'rinadi.
import { qatorlar, qator, sozlama } from '../db.js';
import { brendNomi } from '../lib/brend.js';
import { qollanmaSvg } from '../rasm/qollanma-kartochka.js';
import { svgdanPng } from '../rasm/chiz.js';
import { qollanmaPdf } from './qollanma-hujjati.js';
import { rasmYubor, tgFayl } from '../bot/tg.js';

const BOSQICH_TARTIB = ['tozalash', 'toner', 'davolash', 'namlash', 'himoya', 'qoshimcha', 'ichki'];
const PDF_MIME = 'application/pdf';

/** Buyurtmadagi mahsulotlar — parvarish tartibida, rasmi bilan. */
export async function buyurtmaMahsulotlari(buyurtma) {
  const idlar = [...new Set((buyurtma.items || [])
    .map((i) => Number(i.product_id)).filter(Boolean))];
  if (!idlar.length) return [];

  const p = await qatorlar(
    `select id, name, brand, step, volume, poster_id, usage_text
       from products where id = any($1)`, [idlar]);

  // Rasmlarni bittada olamiz — har mahsulot uchun alohida so'rov shart emas
  const rasmIdlar = p.map((r) => r.poster_id).filter(Boolean);
  const rasmlar = rasmIdlar.length
    ? await qatorlar('select id, bayt, mime from media where id = any($1)', [rasmIdlar])
    : [];
  const karta = new Map(rasmlar.map((m) => [m.id, m]));

  const tartib = (r) => {
    const i = BOSQICH_TARTIB.indexOf(String(r.step || 'qoshimcha'));
    return i < 0 ? 99 : i;
  };
  return [...p].sort((a, b) => tartib(a) - tartib(b)).map((r) => {
    const m = karta.get(r.poster_id);
    return {
      nom: r.name, brend: r.brand, bosqich: r.step || 'qoshimcha', hajm: r.volume,
      qanday: r.usage_text || '',
      rasmBase64: m?.bayt ? Buffer.from(m.bayt).toString('base64') : null,
      rasmMime: m?.mime || 'image/png',
    };
  });
}

/**
 * Mijozga qo'llanmani yuboradi (rasm + Word).
 *
 * Xatolar YUTILADI: qo'llanma yuborilmagani uchun to'lov tasdig'i
 * to'xtab qolmasligi kerak.
 *
 * @param {number|object} buyurtma  id yoki qatorning o'zi
 * @param {number|string} chatId    mijozning telegram_id si
 */
export async function qollanmaYubor(buyurtma, chatId) {
  if (!chatId) return { yuborildi: false, sabab: 'chat yo‘q' };
  const o = typeof buyurtma === 'object' ? buyurtma
    : await qator('select * from orders where id = $1', [buyurtma]);
  if (!o) return { yuborildi: false, sabab: 'buyurtma yo‘q' };

  const mahsulotlar = await buyurtmaMahsulotlari(o);
  if (!mahsulotlar.length) return { yuborildi: false, sabab: 'mahsulot yo‘q' };

  const brend = await brendNomi();
  const mavzu = await sozlama('mavzu', {});
  const izoh = `📘 <b>Parvarish qo‘llanmangiz</b>\n`
    + `${o.order_no ? `Buyurtma <b>${o.order_no}</b> · ` : ''}${mahsulotlar.length} ta mahsulot\n\n`
    + `<i>Tartibni buzmang — har bosqich keyingisining ta’sirini kuchaytiradi.</i>`;

  let rasmYuborildi = false;
  try {
    const png = await svgdanPng(qollanmaSvg({
      mahsulotlar, brend, buyurtma: o.order_no || '',
      mavzu: (mavzu && typeof mavzu === 'object') ? mavzu : {},
    }));
    await rasmYubor(chatId, png, izoh);
    rasmYuborildi = true;
  } catch (e) {
    console.error('Qo‘llanma rasmi chizilmadi:', e.message);
  }

  let hujjatYuborildi = false;
  try {
    const { bayt, nom } = await qollanmaPdf(o);
    await tgFayl('sendDocument', {
      chat_id: chatId,
      caption: rasmYuborildi
        ? '📄 To‘liq qo‘llanma (PDF) — har mahsulot rasmi, tarkibi va '
          + 'ehtiyot choralari bilan.'
        : izoh,
      parse_mode: 'HTML',
    }, { document: { bayt, nom, mime: PDF_MIME } });
    hujjatYuborildi = true;
  } catch (e) {
    console.error('Qo‘llanma hujjati yuborilmadi:', e.message);
  }

  return { yuborildi: rasmYuborildi || hujjatYuborildi, rasmYuborildi, hujjatYuborildi,
           soni: mahsulotlar.length };
}
