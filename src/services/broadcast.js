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
import { config } from '../config.js';

const SEKUNDIGA = 10;                 // xavfsiz tezlik (ilgari 20 edi)
const ORALIQ = Math.ceil(1000 / SEKUNDIGA);

const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @returns {Promise<{id:number, jami:number}>}
 */
export async function broadcastBoshla({ matn, fileId, adminId, chatId, userIdlar = null, tugma = null }) {
  // `userIdlar` — faqat shu segmentga (AI yordamchi «tahlil qilib sotib
  // olmaganlarga yoz» deganda). Berilmasa — hammaga.
  const segment = Array.isArray(userIdlar);
  const oluvchilar = await qatorlar(
    // Faqat HAQIQIY Telegram id (raqam). Google/telefon bilan kirganlar,
    // ochiq skaner mehmonlari va o'chirilgan hisoblar (`google:…`,
    // `tel:…`, `mehmon:…`, `ochirilgan:…`) botdan xabar ola olmaydi —
    // ular «xato» bo'lib sanalib, yuborishni sekinlatardi.
    `select telegram_id, full_name from users
      where not is_blocked and bot_bloklagan_at is null and telegram_id ~ '^[0-9]+$'
        ${segment ? 'and id = any($1::bigint[])' : ''} order by id`,
    segment ? [userIdlar.map(Number).filter(Number.isFinite)] : []);

  // 48 soatdan eski id lar keraksiz — Telegram ularni baribir o'chirmaydi
  sorov(`delete from yuborish_xabarlar where created_at < now() - interval '3 days'`).catch(() => {});

  const y = await qator(
    `insert into yuborishlar (matn, holat, jami, created_by)
     values ($1, 'ketmoqda', $2, $3) returning id`,
    [matn || '', oluvchilar.length, adminId ?? null]);

  // Fonda yuboramiz — admin kutib turmaydi
  yuborishniBajar(y.id, oluvchilar, { matn, fileId, tugma }, chatId)
    .catch((e) => console.error('BROADCAST:', e.message));

  return { id: y.id, jami: oluvchilar.length };
}

async function yuborishniBajar(id, oluvchilar, { matn, fileId, tugma }, hisobotChat) {
  let yuborildi = 0, xato = 0, bloklangan = 0, toxtadi = false;
  // {ism} — har odamga o'z ismi bilan («Salom, Malika!»)
  const ismli = /\{ism\}/.test(matn || '');
  const ismi = (u) => String(u.full_name || '').trim().split(/\s+/)[0]
    .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const qoshimcha = tugma ? { reply_markup: tugma } : {};

  for (const u of oluvchilar) {
    if (floodKutilmoqda()) { toxtadi = true; break; }
    const m = ismli ? String(matn).replace(/\{ism\}/g, ismi(u) || 'do‘stim').replace(/,\s*do‘stim!/, ', do‘stim!') : matn;
    const javob = fileId
      ? await tg('sendPhoto', { chat_id: u.telegram_id, photo: fileId,
          caption: m, parse_mode: 'HTML', ...qoshimcha }, { ommaviy: true })
      : await tg('sendMessage', { chat_id: u.telegram_id, text: m,
          parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...qoshimcha },
          { ommaviy: true });

    if (javob?.ok) {
      yuborildi++;
      // id — keyin «hammadan o'chirish» uchun (Telegram faqat id bilan o'chiradi)
      if (javob.result?.message_id) {
        await sorov(`insert into yuborish_xabarlar (yuborish_id, telegram_id, message_id) values ($1, $2, $3)
          on conflict do nothing`, [id, String(u.telegram_id), javob.result.message_id]).catch(() => {});
      }
    } else {
      xato++;
      const sabab = String(javob?.description || '');
      // Cheklov boshlandi — qolganini yubormaymiz
      if (floodmi(sabab) || sabab === 'PEER_FLOOD_KUTISH') { toxtadi = true; break; }
      // Foydalanuvchi botni bloklagan — qayta urinishdan foyda yo'q,
      // uni belgilab qo'yamiz, keyingi yuborishlarda vaqt ketmaydi.
      // `is_blocked` EMAS: u admin taqiqi va bot bunday odamga umuman
      // javob bermaydi. Bu belgi odam qaytib yozganda o'zi tozalanadi.
      if (/bot was blocked|user is deactivated|chat not found/i.test(sabab)) {
        bloklangan++;
        await sorov('update users set bot_bloklagan_at = now() where telegram_id = $1', [u.telegram_id])
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
    ].filter(Boolean).join('\n'), yuborildi ? {
      reply_markup: { inline_keyboard: [[{ text: '🗑 Noto‘g‘ri ketdi — hammadan o‘chirish', callback_data: `yo:${id}` }]] },
    } : {}).catch(() => {});
  }
}

export const broadcastHolati = (id) => qator('select * from yuborishlar where id = $1', [id]);

// ─────────────── YUBORILGAN XABARNI HAMMADAN O'CHIRISH ───────────────
//
// Telegram bot o'z xabarini message_id bilan va yuborilganidan keyin
// 48 SOAT ichida o'chira oladi. Ikki yo'l:
//   1. id lar saqlangan (yangi yuborishlar) — to'g'ridan-to'g'ri o'chiramiz;
//   2. id saqlanmagan (eski yuborish yoki boshqa joydan ketgan xabar) —
//      har chatda oxirgi xabarlarni ko'rib, MATNI MOS va BOT yuborganini
//      topamiz. Xabarni o'qishning yagona yo'li — uni adminning chatiga
//      forward qilish (darhol o'chiriladi). Odamning o'z xabariga tegmaymiz.

const OCHIR_ORALIQ = globalThis.OCHIR_ORALIQ ?? 45;   // ~20 so'rov/sekund — Telegram chegarasidan past
const CHUQUR = 15;                    // har chatda nechta oxirgi xabarga qaraymiz

/** 429 bo'lsa Telegram aytgan vaqt kutib qayta uradi. */
async function chaqir(usul, tana) {
  for (let u = 0; u < 3; u++) {
    const r = await tg(usul, tana);
    const k = /retry after (\d+)/i.exec(String(r?.description || ''));
    if (!k) return r;
    await kut((Number(k[1]) + 1) * 1000);
  }
  return { ok: false, description: 'retry' };
}

const oddiy = (h) => String(h || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

/**
 * Matn namunasidan tekshiruvchi: HTML olib tashlanadi, {ism} har qanday
 * ism bo'lishi mumkin, boshidagi ~120 belgi solishtiriladi.
 */
export function moslovchi(namuna) {
  const t = oddiy(String(namuna || '').replace(/\{ism\}/g, '\u0000')).slice(0, 120).replace(/\u0000?$/, '');
  if (t.replace(/\u0000/g, '').length < 4) return null;
  const rx = new RegExp('^' + t.split('\u0000').map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.{0,60}?'), 'i');
  return (matn) => rx.test(oddiy(matn));
}

export async function adminChati(berilgan) {
  if (berilgan) return berilgan;
  const ids = String(config.adminTelegramIds || '').split(/[,\s]+/).filter((x) => /^\d+$/.test(x));
  if (ids[0]) return ids[0];
  const a = await qator(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$' order by id limit 1`);
  return a?.telegram_id || null;
}

/** Oxirgi yuborishlar — qaysi birini o'chirishni tanlash uchun. */
export const oxirgiYuborishlar = (n = 5) => qatorlar(
  `select y.id, left(y.matn, 160) as matn, y.holat, y.jami, y.yuborildi, y.created_at, y.tugadi_at,
          y.ochirish_holat, y.ochirildi,
          (select count(*)::int from yuborish_xabarlar x where x.yuborish_id = y.id) as idli
     from yuborishlar y order by y.id desc limit $1`, [Math.min(20, Math.max(1, Number(n) || 5))]);

/**
 * @param {{id?:number, namuna?:string, dan?:string|Date, hisobotChat?:string|number, adminChat?:string|number}} o
 *   id — yuborish (berilmasa oxirgisi); YOKI namuna — xabar matnining boshi
 *   (yuborishlar jadvalida yo'q xabar uchun) va dan — qachondan beri.
 */
export async function yuborishniOchir(o = {}) {
  let y = null;
  if (o.id) y = await qator('select * from yuborishlar where id = $1', [Number(o.id)]);
  else if (!o.namuna) y = await qator('select * from yuborishlar order by id desc limit 1');
  if ((o.id || !o.namuna) && !y) return { xato: 'Bunday yuborish topilmadi.' };

  const bosh = y ? new Date(y.created_at) : new Date(o.dan || Date.now() - 6 * 3600e3);
  if (Date.now() - bosh.getTime() > 48 * 3600e3) {
    return { xato: 'Xabar 48 soatdan oldin yuborilgan — Telegram bot xabarini bunchalik kech o‘chirishga ruxsat bermaydi.' };
  }
  if (y?.ochirish_holat === 'ketmoqda') return { xato: 'Bu xabar hozir o‘chirilmoqda — tugashini kuting.' };

  const tekshir = moslovchi(o.namuna || y?.matn || '');
  const idlar = y ? await qatorlar('select telegram_id, message_id from yuborish_xabarlar where yuborish_id = $1', [y.id]) : [];
  if (!idlar.length && !tekshir) return { xato: 'Xabar matni yo‘q — qaysi xabarni o‘chirishni aniqlab bo‘lmaydi. Matnning boshini yozing.' };

  const admin = idlar.length ? null : await adminChati(o.adminChat);
  if (!idlar.length && !admin) return { xato: 'Admin Telegram chati topilmadi (ADMIN_TELEGRAM_IDS).' };

  if (y) await sorov(`update yuborishlar set ochirish_holat = 'ketmoqda' where id = $1`, [y.id]);
  const oxir = y?.tugadi_at ? new Date(y.tugadi_at).getTime() + 120e3 : Date.now() + 60e3;
  const ish = idlar.length
    ? idBilanOchir(idlar)
    : qidiribOchir({ tekshir, admin, dan: bosh.getTime() - 60e3, gacha: oxir });

  ish.then(async (r) => {
    if (y) await sorov(`update yuborishlar set ochirish_holat = 'tugadi', ochirildi = $2, ochirildi_at = now() where id = $1`, [y.id, r.ochirildi]);
    if (y && idlar.length) await sorov('delete from yuborish_xabarlar where yuborish_id = $1', [y.id]).catch(() => {});
    if (o.hisobotChat) {
      await yubor(o.hisobotChat, [
        `🗑 <b>Xabar o‘chirildi</b>`, ``,
        `✅ O‘chirildi: <b>${r.ochirildi}</b> ta chatdan`,
        r.topilmadi ? `ℹ️ Topilmadi yoki allaqachon yo‘q: ${r.topilmadi}` : '',
        r.xato ? `⚠️ O‘chirib bo‘lmadi: ${r.xato}` : '',
      ].filter(Boolean).join('\n')).catch(() => {});
    }
  }).catch(async (e) => {
    console.error('YUBORISH O‘CHIRISH:', e.message);
    if (y) await sorov(`update yuborishlar set ochirish_holat = 'xato' where id = $1`, [y.id]).catch(() => {});
    if (o.hisobotChat) await yubor(o.hisobotChat, `⚠️ O‘chirish to‘xtadi: ${e.message}`).catch(() => {});
  });

  return { boshlandi: true, yuborish_id: y?.id || null, usul: idlar.length ? 'id' : 'qidiruv',
    jami: idlar.length || null };
}

async function idBilanOchir(idlar) {
  let ochirildi = 0, topilmadi = 0, xato = 0;
  for (const x of idlar) {
    const r = await chaqir('deleteMessage', { chat_id: x.telegram_id, message_id: Number(x.message_id) });
    if (r?.ok) ochirildi++;
    else if (/not found|can't be deleted|chat not found|blocked/i.test(String(r?.description || ''))) topilmadi++;
    else xato++;
    await kut(OCHIR_ORALIQ);
  }
  return { ochirildi, topilmadi, xato };
}

async function qidiribOchir({ tekshir, admin, dan, gacha }) {
  let ochirildi = 0, topilmadi = 0, xato = 0;
  const odamlar = await qatorlar(
    `select telegram_id from users where telegram_id ~ '^[0-9]+$' and not is_blocked and bot_bloklagan_at is null
       and created_at <= to_timestamp($1 / 1000.0) order by id`, [gacha]);
  for (const { telegram_id: tid } of odamlar) {
    // Chatdagi eng oxirgi id ni bilish uchun jim «·» yuboramiz va darhol o'chiramiz
    const p = await chaqir('sendMessage', { chat_id: tid, text: '·', disable_notification: true });
    if (!p?.ok) { topilmadi++; await kut(OCHIR_ORALIQ); continue; }
    const P = p.result.message_id;
    await chaqir('deleteMessage', { chat_id: tid, message_id: P });
    let topildi = false;
    for (let k = 1; k <= CHUQUR && P - k > 0; k++) {
      await kut(OCHIR_ORALIQ);
      const f = await chaqir('forwardMessage', { chat_id: admin, from_chat_id: tid, message_id: P - k, disable_notification: true });
      if (!f?.ok) continue;                       // o'chirilgan yoki xizmat xabari
      await chaqir('deleteMessage', { chat_id: admin, message_id: f.result.message_id });
      const m = f.result, kelib = m.forward_origin || {};
      const vaqt = (kelib.date || m.forward_date || 0) * 1000;
      if (vaqt && vaqt < dan) break;              // yuborishdan eski xabarlarga yetdik
      const botdan = kelib.type === 'user' ? Boolean(kelib.sender_user?.is_bot) : Boolean(m.forward_from?.is_bot);
      if (!botdan || (vaqt && vaqt > gacha)) continue;
      if (!tekshir(m.text || m.caption || '')) continue;
      const d = await chaqir('deleteMessage', { chat_id: tid, message_id: P - k });
      if (d?.ok) { ochirildi++; topildi = true; } else xato++;
      break;
    }
    if (!topildi) topilmadi++;
    await kut(OCHIR_ORALIQ);
  }
  return { ochirildi, topilmadi, xato };
}
