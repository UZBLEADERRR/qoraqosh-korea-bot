// Reklama xabarini hamma foydalanuvchiga yuborish.
//
// Telegram sekundiga ~30 xabarga ruxsat beradi; undan tez yuborsak 429
// qaytadi va bot vaqtincha bloklanadi. Shuning uchun ataylab sekin
// yuboramiz va 429 kelsa kutamiz.
//
// PEER_FLOOD boshqacha: bu 429 emas, BOTGA qo'yilgan spam cheklovi va
// soatlab turadi. Kelgan zahoti yuborishni TO'XTATAMIZ — qolgan mingta
// odamga urinish cheklovni faqat uzaytiradi. Yuborish «to'xtatildi»
// holatida saqlanadi, admin keyin qayta boshlaydi.
//
// Yuborish fonda ketadi: minglab foydalanuvchi bo'lsa bu daqiqalar oladi,
// admin esa javobni darhol olishi kerak.
import { qator, qatorlar, sorov } from '../db.js';
import { yubor, tg } from '../bot/tg.js';
import { floodmi, floodKutilmoqda, floodQolgan } from '../lib/flood.js';

const SEKUNDIGA = 10;                 // xavfsiz tezlik (ilgari 20 edi)
const ORALIQ = Math.ceil(1000 / SEKUNDIGA);

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @returns {Promise<{id:number, jami:number}>}
 */
export async function broadcastBoshla({ matn, fileId, adminId, chatId }) {
  const oluvchilar = await qatorlar(
    `select telegram_id from users
      where not is_blocked and telegram_id is not null order by id`);

  const y = await qator(
    `insert into yuborishlar (matn, holat, jami, created_by)
     values ($1, 'ketmoqda', $2, $3) returning id`,
    [matn || '', oluvchilar.length, adminId ?? null]);

  // Fonda yuboramiz — admin kutib turmaydi
  yuborishniBajar(y.id, oluvchilar, { matn, fileId }, chatId)
    .catch((e) => console.error('BROADCAST:', e.message));

  return { id: y.id, jami: oluvchilar.length };
}

async function yuborishniBajar(id, oluvchilar, { matn, fileId }, hisobotChat) {
  let yuborildi = 0, xato = 0, bloklangan = 0, toxtadi = false;

  for (const u of oluvchilar) {
    if (floodKutilmoqda()) { toxtadi = true; break; }
    const javob = fileId
      ? await tg('sendPhoto', { chat_id: u.telegram_id, photo: fileId,
          caption: matn, parse_mode: 'HTML' }, { ommaviy: true })
      : await tg('sendMessage', { chat_id: u.telegram_id, text: matn,
          parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
          { ommaviy: true });

    if (javob?.ok) {
      yuborildi++;
    } else {
      xato++;
      const sabab = String(javob?.description || '');
      // Cheklov boshlandi — qolganini yubormaymiz
      if (floodmi(sabab) || sabab === 'PEER_FLOOD_KUTISH') { toxtadi = true; break; }
      // Foydalanuvchi botni bloklagan — qayta urinishdan foyda yo'q,
      // uni belgilab qo'yamiz, keyingi yuborishlarda vaqt ketmaydi.
      if (/bot was blocked|user is deactivated|chat not found/i.test(sabab)) {
        bloklangan++;
        await sorov('update users set is_blocked = true where telegram_id = $1', [u.telegram_id])
          .catch(() => {});
      }
      // Tezlik cheklovi — Telegram qancha kutishni o'zi aytadi
      const kutish = /retry after (\d+)/i.exec(sabab);
      if (kutish) await kut((Number(kutish[1]) + 1) * 1000);
    }

    if ((yuborildi + xato) % 25 === 0) {
      await sorov('update yuborishlar set yuborildi = $1, xato = $2 where id = $3',
        [yuborildi, xato, id]).catch(() => {});
    }
    await kut(ORALIQ);
  }

  await sorov(
    `update yuborishlar set holat = $4, yuborildi = $1, xato = $2, tugadi_at = now()
      where id = $3`, [yuborildi, xato, id, toxtadi ? 'toxtatildi' : 'tugadi']);

  if (hisobotChat) {
    const qolgan = oluvchilar.length - yuborildi - xato;
    await yubor(hisobotChat, [
      toxtadi ? `🚫 <b>Yuborish to‘xtatildi</b>` : `📊 <b>Yuborish tugadi</b>`, ``,
      `✅ Yetib bordi: <b>${yuborildi}</b>`,
      xato ? `⚠️ Yetmadi: ${xato}` : '',
      bloklangan ? `🚫 Botni bloklaganlar: ${bloklangan}` : '',
      toxtadi ? `\n<b>Telegram botni vaqtincha chekladi (PEER_FLOOD).</b>`
        + `\nQolgan ${qolgan} ta odamga yuborilmadi — davom etsak cheklov uzayadi.`
        + `\nTaxminan <b>${Math.ceil(floodQolgan() / 60)} daqiqadan</b> keyin qayta urinib ko‘ring.` : '',
    ].filter(Boolean).join('\n')).catch(() => {});
  }
}

export const broadcastHolati = (id) => qator('select * from yuborishlar where id = $1', [id]);
