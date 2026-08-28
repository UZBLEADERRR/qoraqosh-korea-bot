// Agentning bot tomoni: reja yaratish, postni tasdiqlashga yuborish,
// admin javobiga qarab kanalga joylash yoki qayta yozdirish.
import { qator, qatorlar, sorov, sozlama } from '../../db.js';
import { yubor, tg, tgFayl, javobBer, rasmYubor, harakat } from '../tg.js';
import { esc } from '../format.js';
import { config } from '../../config.js';
import {
  rejaTuz, rejaniSaqla, postYoz, postRasmi, bandniOl, bandHolati,
  rejalarniOl, rejaniOchir, rejaniYoq, tozalaHtml,
} from '../../services/agent.js';

export const HOLAT = {
  TOPSHIRIQ: 'admin_agent_topshiriq',
  KANAL:     'admin_agent_kanal',
  SOAT:      'admin_agent_soat',
  TAHRIR:    'admin_agent_tahrir',   // postni qo'lda qayta yozish
  TUZATISH:  'admin_agent_tuzatish', // AI ga "shuni to'g'rila" deyish
};

const holatSaqla = (userId, holat, data = {}) => sorov(
  'update users set state = $1, state_data = $2 where id = $3',
  [holat, JSON.stringify(data), userId]);
const holatTozala = (userId) => sorov(
  `update users set state = null, state_data = '{}'::jsonb where id = $1`, [userId]);
const holatData = async (userId) =>
  (await qator('select state_data from users where id = $1', [userId]))?.state_data || {};

// ══════════ /reja ══════════

export async function rejaMenyusi(chatId) {
  const rejalar = await rejalarniOl();
  const kb = rejalar.map((r) => [{
    text: `${r.faol ? '🟢' : '⏸'} ${r.nom} · ${r.joylandi}/${r.jami}`,
    callback_data: `rj:${r.id}`,
  }]);
  kb.push([{ text: '➕ Yangi reja', callback_data: 'rj_yangi' }]);

  return yubor(chatId, [
    `🤖 <b>Kanal agenti</b>`, ``,
    rejalar.length
      ? `Agent har kuni belgilangan soatda post tayyorlaydi va sizga\ntasdiqlashga yuboradi. Siz tasdiqlamaguncha kanalga chiqmaydi.`
      : `Hali reja yo‘q.\n\nMenga topshiriq bering — masalan «har kuni soat 9 da\nteri parvarishi haqida post joyla» — men 30 kunlik reja tuzaman\nva har kuni bittadan tayyorlab, sizga tasdiqlashga yuboraman.`,
  ].join('\n'), { reply_markup: { inline_keyboard: kb } });
}

export async function rejaYangiBoshla(chatId, user) {
  await holatSaqla(user.id, HOLAT.TOPSHIRIQ);
  return yubor(chatId, [
    `🤖 <b>Yangi reja</b>`, ``,
    `Topshiriqni o‘z so‘zingiz bilan yozing. Masalan:`, ``,
    `<i>«Har kuni teri parvarishi bo‘yicha foydali maslahat ber,`,
    `qish mavsumiga mos bo‘lsin»</i>`, ``,
    `<i>«Bir oy davomida Koreya kosmetikasi haqida ta’lim beruvchi`,
    `postlar — bosqichlar, moddalar, xatolar»</i>`, ``,
    `<i>Bekor qilish: /bekor</i>`,
  ].join('\n'));
}

/** Topshiriq keldi — AI reja tuzadi. */
export async function topshiriqQabul(msg, user) {
  const topshiriq = (msg.text || '').trim();
  if (topshiriq.length < 10) {
    return yubor(msg.chat.id, 'Topshiriqni biroz batafsilroq yozing.');
  }
  await harakat(msg.chat.id);
  const kutish = await yubor(msg.chat.id, '🤖 <b>Reja tuzilmoqda…</b>\n<i>10–20 soniya</i>');

  try {
    const reja = await rejaTuz(topshiriq, 30);
    if (!reja.mavzular.length) throw new Error('Mavzular chiqmadi');

    await holatSaqla(user.id, HOLAT.KANAL, { topshiriq, ...reja });

    const oldi = reja.mavzular.slice(0, 5).map((m, i) => `${i + 1}. ${esc(m)}`).join('\n');
    await yubor(msg.chat.id, [
      `✅ <b>${esc(reja.nom)}</b> — ${reja.mavzular.length} kunlik reja tayyor`, ``,
      `<b>Birinchi kunlar:</b>`, oldi,
      `<i>…va yana ${Math.max(0, reja.mavzular.length - 5)} ta mavzu</i>`, ``,
      `📢 Endi <b>kanal</b> ni yozing (@nom yoki -100…).`,
      `Botni o‘sha kanalga admin qilib qo‘shishni unutmang.`,
    ].join('\n'));
  } catch (e) {
    console.error('REJA:', e.message);
    await holatTozala(user.id);
    await yubor(msg.chat.id, `❌ Reja tuzilmadi: ${esc(e.message)}\n\nQaytadan: /reja`);
  } finally {
    if (kutish?.result?.message_id) {
      await tg('deleteMessage', { chat_id: msg.chat.id, message_id: kutish.result.message_id });
    }
  }
  return true;
}

export async function kanalQabul(msg, user) {
  const kanal = (msg.text || '').trim();
  if (!/^@[\w]{3,}$|^-?\d{5,}$/.test(kanal)) {
    return yubor(msg.chat.id, 'Kanalni @nom yoki -100… ko‘rinishida yozing.');
  }
  const d = await holatData(user.id);
  await holatSaqla(user.id, HOLAT.SOAT, { ...d, kanal });

  const kb = [[9, 10, 12], [15, 18, 20]].map((qator) =>
    qator.map((s) => ({ text: `${s}:00`, callback_data: `rj_soat:${s}` })));
  return yubor(msg.chat.id,
    `🕘 <b>Qaysi soatda post tayyorlansin?</b>\n\n<i>Toshkent vaqti bilan.</i>`,
    { reply_markup: { inline_keyboard: kb } });
}

export async function soatTanlandi(cq, user) {
  const soat = Number(cq.data.split(':')[1]);
  const d = await holatData(user.id);
  if (!d.mavzular?.length) return javobBer(cq.id, 'Reja topilmadi, qaytadan: /reja', true);

  const r = await rejaniSaqla({ ...d, soat, adminId: user.id });
  await holatTozala(user.id);
  await javobBer(cq.id, '✅ Saqlandi');

  return yubor(cq.message.chat.id, [
    `✅ <b>${esc(r.nom)}</b> ishga tushdi`, ``,
    `📢 Kanal: <code>${esc(r.kanal)}</code>`,
    `🕘 Har kuni soat <b>${soat}:00</b> da`,
    `📝 ${d.mavzular.length} kunlik reja`, ``,
    `Har kuni post tayyorlab sizga yuboraman.`,
    `<b>Siz tasdiqlamaguncha kanalga hech narsa chiqmaydi.</b>`, ``,
    `<i>Boshqarish: /reja</i>`,
  ].join('\n'));
}

// ══════════ Postni tasdiqlashga yuborish ══════════

/** Bandni tayyorlab, adminga tasdiqlashga yuboradi. */
export async function postniTayyorla(band, adminChatId, tuzatish = '') {
  await bandHolati(band.id, 'tayyorlanmoqda');

  // Avvalgi variant rasmi endi kerak emas. Buni o'chirmasak har «Boshqa
  // variant» bosilganda bazada yetim rasm qolib ketardi.
  if (band.rasm_id) {
    await sorov('update reja_bandlari set rasm_id = null where id = $1', [band.id]);
    await sorov('delete from media where id = $1', [band.rasm_id]).catch(() => {});
  }

  const { matn, rasmTavsifi } = await postYoz(band, band.mavzu, tuzatish, band.matn || '');
  let rasmId = null;
  let bayt = null;

  if (band.rasmli) {
    bayt = await postRasmi(rasmTavsifi);
    if (bayt) {
      const m = await qator(
        `insert into media (tur, mime, bayt, hajm, goya)
         values ('post', 'image/png', $1, $2, $3) returning id`,
        [bayt, bayt.length, band.mavzu.slice(0, 200)]);
      rasmId = m.id;
    }
  }

  const kb = { inline_keyboard: [
    [{ text: '✅ Kanalga joylash', callback_data: `pj:${band.id}` }],
    [{ text: '✏️ O‘zim yozaman', callback_data: `pt:${band.id}` },
     { text: '🤖 AI ga aytaman',  callback_data: `pf:${band.id}` }],
    [{ text: '🔄 Boshqa variant', callback_data: `pb:${band.id}` },
     { text: '⏭ O‘tkazib yuborish', callback_data: `po:${band.id}` }],
  ] };

  const bosh = `🤖 <b>${esc(band.reja_nom)}</b> · ${esc(band.mavzu)}\n` +
               `<i>Tasdiqlasangiz kanalga chiqadi.</i>\n\n${'─'.repeat(16)}\n\n`;

  let javob;
  if (bayt) {
    javob = await tgFayl('sendPhoto', {
      chat_id: adminChatId, caption: (bosh + matn).slice(0, 1024),
      parse_mode: 'HTML', reply_markup: kb,
    }, { photo: { bayt, mime: 'image/png', nom: 'post.png' } });
  } else {
    javob = await yubor(adminChatId, bosh + matn, { reply_markup: kb });
  }

  await bandHolati(band.id, 'tasdiq_kutilmoqda', {
    matn, rasmId, msgId: javob?.result?.message_id ?? null, chatId: String(adminChatId),
  });
  return javob;
}

/** Kanalga joylash. */
export async function postniJoylash(cq, user) {
  const id = Number(cq.data.split(':')[1]);
  const band = await bandniOl(id);
  if (!band) return javobBer(cq.id, 'Post topilmadi', true);
  if (band.holat === 'joylandi') return javobBer(cq.id, 'Bu post allaqachon joylangan', true);

  await javobBer(cq.id, 'Joylanmoqda…');

  const kanal = band.kanal;
  let natija;
  if (band.rasm_id) {
    const m = await qator('select bayt from media where id = $1', [band.rasm_id]);
    natija = m?.bayt
      ? await rasmYubor(kanal, Buffer.from(m.bayt), band.matn)
      : await yubor(kanal, band.matn);
  } else {
    natija = await yubor(kanal, band.matn);
  }

  if (!natija?.ok) {
    return yubor(cq.message.chat.id,
      `❌ Kanalga joylab bo‘lmadi: <i>${esc(natija?.description || 'nomaʼlum')}</i>\n\n` +
      `Botni kanalga admin qilib qo‘shganingizni tekshiring.`);
  }

  await bandHolati(id, 'joylandi');
  await tugmalarniOchir(cq, '✅ Joylandi');

  // Bajarilgan band rasmi endi kerak emas — bazani shishirmaymiz
  if (band.rasm_id) await sorov('delete from media where id = $1', [band.rasm_id]).catch(() => {});

  const qolgan = await qator(
    `select count(*)::int n from reja_bandlari where reja_id = $1 and holat = 'rejada'`,
    [band.reja_id]);
  return yubor(cq.message.chat.id,
    `✅ <b>Kanalga joylandi.</b>\n\n📝 Rejada yana ${qolgan.n} ta mavzu qoldi.`);
}

/** Boshqa variant — AI qayta yozadi. */
export async function postniQaytaYoz(cq, user, tuzatish = '') {
  const id = Number(cq.data.split(':')[1]);
  const band = await bandniOl(id);
  if (!band) return javobBer(cq.id, 'Post topilmadi', true);

  await javobBer(cq.id, 'Qayta yozilmoqda…');
  await tugmalarniOchir(cq, '🔄 Yangi variant tayyorlanmoqda…');
  await harakat(cq.message.chat.id);
  try {
    await postniTayyorla(band, cq.message.chat.id, tuzatish);
  } catch (e) {
    await yubor(cq.message.chat.id, `❌ Qayta yozilmadi: ${esc(e.message)}`);
  }
}

/** O'tkazib yuborish. */
export async function postniOtkaz(cq) {
  const id = Number(cq.data.split(':')[1]);
  await bandHolati(id, 'otkazildi');
  await javobBer(cq.id, 'O‘tkazib yuborildi');
  await tugmalarniOchir(cq, '⏭ O‘tkazib yuborildi');
}

/** «O'zim yozaman» — admin matnni qo'lda yuboradi. */
export async function tahrirBoshla(cq, user) {
  const id = Number(cq.data.split(':')[1]);
  const band = await bandniOl(id);
  if (!band) return javobBer(cq.id, 'Post topilmadi', true);
  await javobBer(cq.id);
  await holatSaqla(user.id, HOLAT.TAHRIR, { bandId: id });
  return yubor(cq.message.chat.id, [
    `✏️ <b>Post matnini yuboring</b>`, ``,
    `Hozirgi matn:`, ``, band.matn || '—', ``,
    `<i>Rasm o‘zgarmaydi. Bekor qilish: /bekor</i>`,
  ].join('\n'));
}

export async function tahrirQabul(msg, user) {
  const d = await holatData(user.id);
  const matn = tozalaHtml((msg.text || '').trim());
  if (!matn) return yubor(msg.chat.id, 'Matn bo‘sh. Qaytadan yozing yoki /bekor.');
  await bandHolati(d.bandId, 'tasdiq_kutilmoqda', { matn });
  await holatTozala(user.id);

  const band = await bandniOl(d.bandId);
  const kb = { inline_keyboard: [
    [{ text: '✅ Kanalga joylash', callback_data: `pj:${band.id}` }],
    [{ text: '✏️ Yana tahrirlash', callback_data: `pt:${band.id}` }],
  ] };
  await yubor(msg.chat.id, `👀 <b>Shunday ketadi:</b>\n\n${'─'.repeat(16)}\n\n${matn}`,
    { reply_markup: kb });
  return true;
}

/** «AI ga aytaman» — kamchilikni tushuntirasiz, AI tuzatadi. */
export async function tuzatishBoshla(cq, user) {
  const id = Number(cq.data.split(':')[1]);
  await javobBer(cq.id);
  await holatSaqla(user.id, HOLAT.TUZATISH, { bandId: id });
  return yubor(cq.message.chat.id, [
    `🤖 <b>Nimani to‘g‘rilay?</b>`, ``,
    `O‘z so‘zingiz bilan yozing. Masalan:`,
    `<i>«juda uzun, qisqartir»</i>`,
    `<i>«narx haqida gapirma, faqat foydasini ayt»</i>`,
    `<i>«yoshlarga mos qilib yoz, emoji ko‘proq»</i>`, ``,
    `<i>Bekor qilish: /bekor</i>`,
  ].join('\n'));
}

export async function tuzatishQabul(msg, user) {
  const d = await holatData(user.id);
  const izoh = (msg.text || '').trim();
  if (!izoh) return yubor(msg.chat.id, 'Izoh bo‘sh.');
  const band = await bandniOl(d.bandId);
  if (!band) { await holatTozala(user.id); return yubor(msg.chat.id, 'Post topilmadi.'); }

  await holatTozala(user.id);
  await harakat(msg.chat.id);
  const kutish = await yubor(msg.chat.id, '🤖 <b>Tuzatilmoqda…</b>');
  try {
    await postniTayyorla(band, msg.chat.id, izoh);
  } catch (e) {
    await yubor(msg.chat.id, `❌ Tuzatilmadi: ${esc(e.message)}`);
  } finally {
    if (kutish?.result?.message_id) {
      await tg('deleteMessage', { chat_id: msg.chat.id, message_id: kutish.result.message_id });
    }
  }
  return true;
}

// ══════════ Reja kartochkasi ══════════

export async function rejaKarta(cq) {
  const id = Number(cq.data.split(':')[1]);
  const rejalar = await rejalarniOl();
  const r = rejalar.find((x) => Number(x.id) === id);
  if (!r) return javobBer(cq.id, 'Reja topilmadi', true);
  await javobBer(cq.id);

  const keyingi = await qatorlar(
    `select mavzu from reja_bandlari where reja_id = $1 and holat = 'rejada'
      order by tartib limit 3`, [id]);

  return yubor(cq.message.chat.id, [
    `🤖 <b>${esc(r.nom)}</b>`, ``,
    `📢 Kanal: <code>${esc(r.kanal)}</code>`,
    `🕘 Soat ${r.soat}:00`,
    `📝 ${r.joylandi}/${r.jami} joylandi · ${r.qolgan} qoldi`,
    `${r.faol ? '🟢 Ishlayapti' : '⏸ To‘xtatilgan'}`, ``,
    keyingi.length ? `<b>Keyingi mavzular:</b>\n${keyingi.map((x) => `• ${esc(x.mavzu)}`).join('\n')}` : '',
  ].filter(Boolean).join('\n'), { reply_markup: { inline_keyboard: [
    [{ text: '▶️ Hozir bitta tayyorla', callback_data: `rj_hozir:${id}` }],
    [{ text: r.faol ? '⏸ To‘xtatish' : '▶️ Davom ettirish', callback_data: `rj_yoq:${id}:${r.faol ? 0 : 1}` }],
    [{ text: '🗑 Rejani o‘chirish', callback_data: `rj_och:${id}` }],
  ] } });
}

export async function rejaHozir(cq) {
  const id = Number(cq.data.split(':')[1]);
  const band = await qator(
    `select b.*, r.topshiriq, r.kanal, r.rasmli, r.nom as reja_nom
       from reja_bandlari b join rejalar r on r.id = b.reja_id
      where b.reja_id = $1 and b.holat = 'rejada' order by b.tartib limit 1`, [id]);
  if (!band) return javobBer(cq.id, 'Rejada tayyorlanmagan mavzu qolmadi', true);

  await javobBer(cq.id, 'Tayyorlanmoqda…');
  await harakat(cq.message.chat.id);
  try {
    await postniTayyorla(band, cq.message.chat.id);
  } catch (e) {
    await yubor(cq.message.chat.id, `❌ Tayyorlanmadi: ${esc(e.message)}`);
  }
}

// ══════════ Yordamchi ══════════

async function tugmalarniOchir(cq, matn) {
  if (!cq.message) return;
  await tg('editMessageReplyMarkup', {
    chat_id: cq.message.chat.id, message_id: cq.message.message_id,
    reply_markup: { inline_keyboard: matn ? [[{ text: matn, callback_data: 'yoq' }]] : [] },
  }).catch(() => {});
}

/** Agent callback'lari. */
export async function agentCallback(cq, user) {
  const d = cq.data || '';
  if (d === 'rj_yangi')        { await javobBer(cq.id); await rejaYangiBoshla(cq.message.chat.id, user); return true; }
  if (d.startsWith('rj_soat:')) { await soatTanlandi(cq, user); return true; }
  if (d.startsWith('rj_hozir:')) { await rejaHozir(cq); return true; }
  if (d.startsWith('rj_yoq:'))  {
    const [, id, faol] = d.split(':');
    await rejaniYoq(Number(id), faol === '1');
    await javobBer(cq.id, faol === '1' ? '▶️ Davom etadi' : '⏸ To‘xtatildi');
    await rejaMenyusi(cq.message.chat.id); return true;
  }
  if (d.startsWith('rj_och:')) {
    await rejaniOchir(Number(d.split(':')[1]));
    await javobBer(cq.id, '🗑 O‘chirildi');
    await rejaMenyusi(cq.message.chat.id); return true;
  }
  if (d.startsWith('rj:'))  { await rejaKarta(cq); return true; }
  if (d.startsWith('pj:'))  { await postniJoylash(cq, user); return true; }
  if (d.startsWith('pb:'))  { await postniQaytaYoz(cq, user); return true; }
  if (d.startsWith('po:'))  { await postniOtkaz(cq); return true; }
  if (d.startsWith('pt:'))  { await tahrirBoshla(cq, user); return true; }
  if (d.startsWith('pf:'))  { await tuzatishBoshla(cq, user); return true; }
  if (d === 'yoq')          { await javobBer(cq.id); return true; }
  return false;
}

/** Agent holatlari. */
export async function agentHolati(msg, user) {
  switch (user.state) {
    case HOLAT.TOPSHIRIQ: return Boolean(await topshiriqQabul(msg, user));
    case HOLAT.KANAL:     await kanalQabul(msg, user); return true;
    case HOLAT.TAHRIR:    return Boolean(await tahrirQabul(msg, user));
    case HOLAT.TUZATISH:  return Boolean(await tuzatishQabul(msg, user));
    default: return false;
  }
}
