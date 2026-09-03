// Adminlar uchun bot buyruqlari.
// Kompyuter oldiga o'tirmasdan, telefondan boshqarish uchun.
import { qator, qatorlar, sorov, sozlama } from '../../db.js';
import { yubor, tg, tgFayl, javobBer, harakat } from '../tg.js';
import { esc, narx } from '../format.js';
import { adminmi } from '../../lib/admin.js';
import { config } from '../../config.js';
import { brendNomi } from '../../lib/brend.js';
import { xabar } from '../shablon.js';
import { keshniTashla } from '../../lib/kesh.js';
import { BOSQICHLAR, bosqich, keyingi } from '../../lib/bosqichlar.js';
import {
  ochiqPartiya, xaridRoyxati, xaridMatni, partiyaniQabulQil,
  partiyaBuyurtmalari, partiyaniOl, oxirgiPartiyalar, partiyaHolati,
} from '../../services/partiya.js';
import { pochtaHujjati } from '../../services/pochta-hujjati.js';
import { partiyaQollanmasi } from '../../services/qollanma-hujjati.js';
import { qollanmaYubor } from '../../services/mijoz-qollanma.js';
import { broadcastBoshla } from '../../services/broadcast.js';
import { agentCallback, agentHolati, rejaMenyusi, tanitishBoshla } from './agent-oqim.js';

export const BUYRUQLAR = [
  ['/orders',   'Xarid ro‘yxati (Coupang/Daiso)'],
  ['/partiya',  'Partiyalar va pochta hujjati'],
  ['/reklama',  'Hammaga xabar yuborish'],
  ['/reja',     'Kanal rejasi (agent)'],
  ['/tanitish', 'Mahsulotni kanalda reklama qilish'],
  ['/brend',    'Brend nomini o‘zgartirish'],
  ['/panel',    'Admin panelni ochish'],
];

/** Admin holati — ko'p qadamli buyruqlar uchun (users.state ustunida). */
export const HOLAT = {
  REKLAMA_MATN: 'admin_reklama_matn',
  BREND_NOM:    'admin_brend_nom',
  REJA_TOPSHIRIQ: 'admin_reja_topshiriq',
  REJA_SOAT:      'admin_reja_soat',
};

const holatSaqla = (userId, holat, data = {}) => sorov(
  'update users set state = $1, state_data = $2 where id = $3',
  [holat, JSON.stringify(data), userId]);

const holatTozala = (userId) => sorov(
  `update users set state = null, state_data = '{}'::jsonb where id = $1`, [userId]);

// ══════════════════ /orders — XARID RO'YXATI ══════════════════

export async function xaridRoyxatiniYubor(chatId, user) {
  await harakat(chatId);
  const p = await ochiqPartiya();
  const royxat = p ? await xaridRoyxati(p.id) : { qatorlar: [], buyurtmalar: [], jami: 0 };

  if (!p || !royxat.qatorlar.length) {
    return yubor(chatId,
      '✅ <b>Xarid ro‘yxati bo‘sh</b>\n\n' +
      'To‘lovi tasdiqlangan yangi buyurtma yo‘q.\n' +
      '<i>Chek kelganda uni admin panelda tasdiqlang — buyurtma shu ro‘yxatga tushadi.</i>');
  }

  const matn = xaridMatni(royxat, `🧾 <b>XARID RO‘YXATI</b> · ${esc(p.raqam)}`);
  const kb = {
    inline_keyboard: [
      [{ text: `✅ Qabul qilindi (${royxat.buyurtmalar.length} ta buyurtma)`, callback_data: `pq:${p.id}` }],
      [{ text: '📄 Pochta hujjati', callback_data: `pd:${p.id}` },
       { text: '📘 Qo‘llanma', callback_data: `pk:${p.id}` }],
      [{ text: '🔄 Yangilash', callback_data: 'orders' }],
    ],
  };

  // Xarid kanali sozlangan bo'lsa ro'yxat o'sha yerga ham tushadi —
  // jamoa a'zolari bir joydan ishlaydi.
  const kanal = String(await sozlama('xarid_kanal', '') || '');
  if (kanal) {
    await tg('sendMessage', { chat_id: kanal, text: matn, parse_mode: 'HTML',
      reply_markup: kb, link_preview_options: { is_disabled: true } });
  }
  return yubor(chatId, matn, { reply_markup: kb });
}

async function qabulQilindi(cq, user) {
  const id = Number(cq.data.split(':')[1]);
  const natija = await partiyaniQabulQil(id);
  if (!natija) return javobBer(cq.id, 'Bu partiya allaqachon qabul qilingan', true);

  await javobBer(cq.id, `✅ ${natija.soni} ta buyurtma qadoqlashga o‘tdi`);

  // Tugmalarni olib tashlaymiz — ikkinchi marta bosilmasin
  if (cq.message) {
    await tg('editMessageReplyMarkup', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      reply_markup: { inline_keyboard: [[
        { text: `📦 Partiya ${natija.partiya.raqam}`, callback_data: `p:${id}` }]] },
    });
  }
  await yubor(cq.message.chat.id, [
    `✅ <b>${esc(natija.partiya.raqam)} qabul qilindi</b>`, ``,
    `${natija.soni} ta buyurtma «Koreyada qadoqlanmoqda» holatiga o‘tdi.`,
    `Mijozlarga xabar berildi.`, ``,
    `Keyingi buyurtmalar yangi ro‘yxatga yig‘iladi.`,
  ].join('\n'), { reply_markup: { inline_keyboard: [[
    { text: '📦 Partiyani boshqarish', callback_data: `p:${id}` }]] } });

  // Mijozlarga xabar
  const buyurtmalar = await partiyaBuyurtmalari(id);
  for (const o of buyurtmalar) mijozgaBosqich(o, 'qadoqlanmoqda').catch(() => {});
}

// ══════════════════ Kanaldan to'lovni tasdiqlash ══════════════════

/**
 * Kanaldagi buyurtma xabari ostidagi tugma.
 * Panelga kirmasdan, kanalning o'zidan tasdiqlash uchun.
 */
async function tolovTasdiq(cq, user, tasdiqmi) {
  const id = Number(cq.data.split(':')[1]);
  const o = await qator(
    `select o.*, u.telegram_id from orders o join users u on u.id = o.user_id where o.id = $1`, [id]);
  if (!o) return javobBer(cq.id, 'Buyurtma topilmadi', true);

  if (!tasdiqmi) {
    await sorov(`update orders set payment_status = 'kutilmoqda', updated_at = now() where id = $1`, [id]);
    await javobBer(cq.id, 'To‘lov kutilmoqda deb belgilandi');
    return tugmalarniAlmashtir(cq, `⏳ To‘lov kutilmoqda · ${o.order_no}`);
  }

  if (o.payment_status === 'tolangan') return javobBer(cq.id, 'Bu to‘lov allaqachon tasdiqlangan', true);

  await sorov(`update orders set payment_status = 'tolangan', updated_at = now() where id = $1`, [id]);
  // To'langan buyurtma darhol xarid ro'yxatiga tushishi kerak
  await sorov(
    `update orders set status = 'tasdiqlangan', updated_at = now()
      where id = $1 and status = 'yangi'`, [id]);

  // Chek endi kerak emas — tekshirildi
  if (!(await sozlama('chek_saqlansin', false)) && o.receipt_id) {
    await sorov('update orders set receipt_id = null where id = $1', [id]);
    await sorov('delete from media where id = $1', [o.receipt_id]).catch(() => {});
  }

  await javobBer(cq.id, '✅ Tasdiqlandi');
  await tugmalarniAlmashtir(cq, `✅ To‘lov tasdiqlandi · ${o.order_no}`);

  if (o.telegram_id) {
    const m = await xabar('xabar_tolov_tasdiq', { raqam: esc(o.order_no) },
      '✅ <b>{raqam}</b> — to‘lovingiz tasdiqlandi.');
    await yubor(o.telegram_id, m).catch(() => {});
    // Qo'llanma: rasm (tartib, qachon, qanchadan) + to'liq Word hujjati
    qollanmaYubor(o, o.telegram_id)
      .catch((e) => console.error('Qo‘llanma yuborilmadi:', e.message));
  }

  // Kanalga eslatma: endi /orders da chiqadi
  await yubor(cq.message.chat.id,
    `✅ <b>${esc(o.order_no)}</b> to‘lovi tasdiqlandi va xarid ro‘yxatiga tushdi.\n` +
    `<i>Ro‘yxatni ko‘rish: /orders</i>`).catch(() => {});
}

async function tugmalarniAlmashtir(cq, matn) {
  if (!cq.message) return;
  await tg('editMessageReplyMarkup', {
    chat_id: cq.message.chat.id, message_id: cq.message.message_id,
    reply_markup: { inline_keyboard: [[{ text: matn, callback_data: 'yoq' }]] },
  }).catch(() => {});
}

// ══════════════════ /partiya — PARTIYALAR ══════════════════

export async function partiyalarniKorsat(chatId) {
  const royxat = await oxirgiPartiyalar(10);
  if (!royxat.length) {
    return yubor(chatId, '📦 Hali partiya yo‘q.\n\n/orders — birinchi xarid ro‘yxatini oling.');
  }
  const HOLAT_NOM = { ochiq: '🟡 Ochiq', qabul_qilingan: '🟢 Qabul qilingan', jonatilgan: '✈️ Jo‘natilgan' };
  const kb = royxat.map((p) => [{
    text: `${p.raqam} · ${p.buyurtma_soni} ta · ${HOLAT_NOM[p.holat] || p.holat}`,
    callback_data: `p:${p.id}`,
  }]);
  return yubor(chatId, '📦 <b>Partiyalar</b>\n\nBirini tanlang:',
    { reply_markup: { inline_keyboard: kb } });
}

async function partiyaKarta(cq) {
  const id = Number(cq.data.split(':')[1]);
  const p = await partiyaniOl(id);
  if (!p) return javobBer(cq.id, 'Partiya topilmadi', true);
  const buyurtmalar = await partiyaBuyurtmalari(id);
  await javobBer(cq.id);

  // Partiyadagi buyurtmalar qaysi bosqichda
  const holatlar = new Map();
  for (const o of buyurtmalar) holatlar.set(o.status, (holatlar.get(o.status) || 0) + 1);
  const holatMatn = [...holatlar].map(([h, n]) => `${bosqich(h).emoji} ${bosqich(h).nom} — ${n} ta`).join('\n');

  const eng = buyurtmalar[0]?.status || 'qadoqlanmoqda';
  const kel = keyingi(eng);

  const kb = [];
  if (kel) kb.push([{ text: `➡️ Hammasini «${kel.nom}» ga o‘tkazish`, callback_data: `ph:${id}:${kel.kalit}` }]);
  kb.push([{ text: '📄 Pochta hujjati', callback_data: `pd:${id}` },
           { text: '📘 Qo‘llanma', callback_data: `pk:${id}` }]);
  kb.push([{ text: '📋 Buyurtmalar ro‘yxati', callback_data: `pl:${id}` }]);

  return yubor(cq.message.chat.id, [
    `📦 <b>${esc(p.raqam)}</b>`, ``,
    `${buyurtmalar.length} ta buyurtma · ${narx(buyurtmalar.reduce((s, o) => s + Number(o.total || 0), 0))}`, ``,
    holatMatn || '—',
  ].join('\n'), { reply_markup: { inline_keyboard: kb } });
}

async function partiyaBosqichi(cq) {
  const [, id, holat] = cq.data.split(':');
  const b = bosqich(holat);
  await partiyaHolati(Number(id), holat);
  await javobBer(cq.id, `${b.emoji} ${b.nom}`);

  const buyurtmalar = await partiyaBuyurtmalari(Number(id));
  for (const o of buyurtmalar) mijozgaBosqich(o, holat).catch(() => {});

  const kel = keyingi(holat);
  const kb = [];
  if (kel) kb.push([{ text: `➡️ Keyingisi: ${kel.nom}`, callback_data: `ph:${id}:${kel.kalit}` }]);
  kb.push([{ text: '📄 Pochta hujjati', callback_data: `pd:${id}` },
           { text: '📘 Qo‘llanma', callback_data: `pk:${id}` }]);

  return yubor(cq.message.chat.id,
    `${b.emoji} <b>${esc(b.nom)}</b>\n\n${buyurtmalar.length} ta buyurtma o‘tkazildi va mijozlarga xabar berildi.`,
    { reply_markup: { inline_keyboard: kb } });
}

async function pochtaFayli(cq) {
  const id = Number(cq.data.split(':')[1]);
  await javobBer(cq.id, 'Tayyorlanmoqda…');
  const p = await partiyaniOl(id);
  const buyurtmalar = await partiyaBuyurtmalari(id);
  if (!buyurtmalar.length) return yubor(cq.message.chat.id, 'Bu partiyada buyurtma yo‘q.');

  await harakat(cq.message.chat.id, 'upload_document');
  const { bayt, nom } = await pochtaHujjati(p, buyurtmalar);
  return tgFayl('sendDocument', {
    chat_id: cq.message.chat.id,
    caption: `📄 <b>${esc(p.raqam)}</b> — ${buyurtmalar.length} ta jo‘natma\n` +
             `<i>Print qilib pochtaga olib boring. Ikkinchi sahifada yorliqlar.</i>`,
    parse_mode: 'HTML',
  }, { document: { bayt, nom, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
}

async function qollanmaFayli(cq) {
  const id = Number(cq.data.split(':')[1]);
  await javobBer(cq.id, 'Tayyorlanmoqda…');
  const p = await partiyaniOl(id);
  const buyurtmalar = await partiyaBuyurtmalari(id);
  if (!buyurtmalar.length) return yubor(cq.message.chat.id, 'Bu partiyada buyurtma yo‘q.');

  await harakat(cq.message.chat.id, 'upload_document');
  const { bayt, nom, soni } = await partiyaQollanmasi(p, buyurtmalar);
  return tgFayl('sendDocument', {
    chat_id: cq.message.chat.id,
    caption: `📘 <b>Parvarish qo‘llanmasi</b> · ${esc(p.raqam)}\n` +
             `${soni} ta buyurtma uchun, har biri yangi sahifadan.\n` +
             `<i>Print qilib har birini o‘z qutisiga soling.</i>`,
    parse_mode: 'HTML',
  }, { document: { bayt, nom, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
}

async function partiyaRoyxati(cq) {
  const id = Number(cq.data.split(':')[1]);
  await javobBer(cq.id);
  const buyurtmalar = await partiyaBuyurtmalari(id);
  const satr = buyurtmalar.map((o, i) =>
    `${i + 1}. <code>${esc(o.order_no)}</code> — ${esc(o.customer_name || '')}\n` +
    `    ${esc(o.viloyat || '')}${o.tuman ? ', ' + esc(o.tuman) : ''} · ${narx(o.total)}`).join('\n');
  return yubor(cq.message.chat.id, `📋 <b>Buyurtmalar</b>\n\n${satr || '—'}`);
}

/** Bosqich o'zgarganda mijozga xabar. */
async function mijozgaBosqich(buyurtma, holat) {
  const u = await qator('select telegram_id from users where id = $1', [buyurtma.user_id]);
  if (!u?.telegram_id) return;
  const b = bosqich(holat);
  const shablon = await sozlama(`xabar_holat_${holat}`, '');
  const matn = String(shablon || '').replace(/"/g, '')
    || `${b.emoji} <b>{raqam}</b> — ${b.nom}`;
  await yubor(u.telegram_id, matn.replace(/\{raqam\}/g, esc(buyurtma.order_no)));
}

// ══════════════════ /reklama — BROADCAST ══════════════════

export async function reklamaBoshla(chatId, user) {
  const soni = await qator(`select count(*)::int as n from users where not is_blocked and phone is not null`);
  await holatSaqla(user.id, HOLAT.REKLAMA_MATN);
  return yubor(chatId, [
    `📢 <b>Reklama xabari</b>`, ``,
    `Yubormoqchi bo‘lgan xabaringizni yozing.`,
    `Rasm bilan yubormoqchi bo‘lsangiz — rasmni izoh (caption) bilan yuboring.`, ``,
    `👥 Qabul qiluvchilar: <b>${soni.n} ta</b> foydalanuvchi`, ``,
    `<i>Bekor qilish uchun /bekor</i>`,
  ].join('\n'));
}

/** Reklama matni/rasmi keldi — tasdiqlashga beramiz. */
export async function reklamaMatni(msg, user) {
  const foto = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;
  const matn = (msg.caption || msg.text || '').trim();
  if (!matn && !foto) {
    return yubor(msg.chat.id, 'Matn yoki rasm yuboring. Bekor qilish: /bekor');
  }
  await holatSaqla(user.id, HOLAT.REKLAMA_MATN, { matn, file_id: foto?.file_id || null, tasdiq: true });

  const kb = { inline_keyboard: [
    [{ text: '📤 Hammaga yuborish', callback_data: 'rek_yubor' }],
    [{ text: '✏️ Qayta yozish', callback_data: 'rek_qayta' },
     { text: '❌ Bekor', callback_data: 'rek_bekor' }],
  ] };

  await yubor(msg.chat.id, '👀 <b>Shunday ko‘rinadi:</b>');
  if (foto) {
    await tg('sendPhoto', { chat_id: msg.chat.id, photo: foto.file_id,
      caption: matn, parse_mode: 'HTML', reply_markup: kb });
  } else {
    await yubor(msg.chat.id, matn, { reply_markup: kb });
  }
  return true;
}

async function reklamaniYubor(cq, user) {
  const u = await qator('select state_data from users where id = $1', [user.id]);
  const d = u?.state_data || {};
  if (!d.matn && !d.file_id) return javobBer(cq.id, 'Xabar topilmadi', true);

  await javobBer(cq.id, 'Yuborish boshlandi');
  await holatTozala(user.id);
  await tg('editMessageReplyMarkup', {
    chat_id: cq.message.chat.id, message_id: cq.message.message_id,
    reply_markup: { inline_keyboard: [] },
  }).catch(() => {});

  const yuborish = await broadcastBoshla({
    matn: d.matn || '', fileId: d.file_id || null, adminId: user.id, chatId: cq.message.chat.id,
  });
  return yubor(cq.message.chat.id,
    `📤 <b>Yuborilmoqda…</b>\n\n${yuborish.jami} ta foydalanuvchiga.\n` +
    `<i>Tugagach hisobot yuboraman.</i>`);
}

// ══════════════════ /brend ══════════════════

export async function brendBoshla(chatId, user, argument) {
  if (argument) return brendSaqla(chatId, user, argument);
  const hozir = await brendNomi();
  await holatSaqla(user.id, HOLAT.BREND_NOM);
  return yubor(chatId, [
    `🏷 <b>Brend nomi</b>`, ``,
    `Hozirgi nom: <b>${esc(hozir)}</b>`, ``,
    `Yangi nomni yozing. U bot, ilova va tahlil rasmlarida ko‘rinadi.`, ``,
    `<i>Bekor qilish: /bekor</i>`,
  ].join('\n'));
}

export async function brendSaqla(chatId, user, nom) {
  const toza = String(nom || '').trim().slice(0, 60);
  if (toza.length < 2) return yubor(chatId, 'Nom juda qisqa. Qaytadan yozing.');
  await sorov(
    `insert into settings (key, value, updated_at) values ('dokon_nomi', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(toza)]);
  keshniTashla('brend');
  keshniTashla('katalog');
  await holatTozala(user.id);
  return yubor(chatId, `✅ Brend nomi <b>${esc(toza)}</b> ga o‘zgartirildi.`);
}

async function panelHavolasi(chatId) {
  const url = config.publicUrl ? `${config.publicUrl}/admin/` : null;
  if (!url) return yubor(chatId, 'PUBLIC_URL sozlanmagan — panel havolasi yo‘q.');
  return yubor(chatId, '⚙️ <b>Admin panel</b>',
    { reply_markup: { inline_keyboard: [[{ text: 'Panelni ochish', web_app: { url } }]] } });
}

// ══════════════════ Dispetcher ══════════════════

/** Admin buyrug'i bo'lsa bajaradi va true qaytaradi. */
export async function adminBuyrugi(msg, user) {
  if (!adminmi(user)) return false;
  const matn = (msg.text || '').trim();
  const chatId = msg.chat.id;
  const [buyruq, ...qolgan] = matn.split(/\s+/);
  const argument = qolgan.join(' ');

  switch (buyruq) {
    case '/orders':  await xaridRoyxatiniYubor(chatId, user); return true;
    case '/partiya': await partiyalarniKorsat(chatId); return true;
    case '/reklama': await reklamaBoshla(chatId, user); return true;
    case '/reja':    await rejaMenyusi(chatId); return true;
    case '/tanitish': await tanitishBoshla(chatId, argument); return true;
    case '/panel':   await panelHavolasi(chatId); return true;
    case '/brend':   await brendBoshla(chatId, user, argument); return true;
    case '/bekor':   await holatTozala(user.id); await yubor(chatId, '❌ Bekor qilindi.'); return true;
    case '/admin':
      await yubor(chatId, [
        `⚙️ <b>Admin buyruqlari</b>`, ``,
        ...BUYRUQLAR.map(([b, i]) => `${b} — ${i}`),
      ].join('\n'));
      return true;
    default: return false;
  }
}

/** Admin ko'p qadamli holatda — javobini qabul qilamiz. */
export async function adminHolati(msg, user) {
  if (!adminmi(user) || !user.state?.startsWith('admin_')) return false;
  const matn = (msg.text || '').trim();
  // Har qanday buyruq holatdan chiqaradi: aks holda admin /start yozsa
  // u brend nomi bo'lib saqlanib qolardi.
  if (matn.startsWith('/')) {
    await holatTozala(user.id);
    if (matn === '/bekor') { await yubor(msg.chat.id, '❌ Bekor qilindi.'); return true; }
    return false;                        // buyruqning o'zi odatdagidek ishlasin
  }
  if (user.state === HOLAT.REKLAMA_MATN) return Boolean(await reklamaMatni(msg, user));
  if (user.state === HOLAT.BREND_NOM)    { await brendSaqla(msg.chat.id, user, matn); return true; }
  return await agentHolati(msg, user);
}

/** Admin inline tugmasi. */
export async function adminCallback(cq, user) {
  if (!adminmi(user)) return false;
  const d = cq.data || '';

  if (d === 'orders')       { await javobBer(cq.id); await xaridRoyxatiniYubor(cq.message.chat.id, user); return true; }
  if (d.startsWith('tt:'))  { await tolovTasdiq(cq, user, true); return true; }
  if (d.startsWith('tr:'))  { await tolovTasdiq(cq, user, false); return true; }
  if (d.startsWith('pq:'))  { await qabulQilindi(cq, user); return true; }
  if (d.startsWith('ph:'))  { await partiyaBosqichi(cq); return true; }
  if (d.startsWith('pd:'))  { await pochtaFayli(cq); return true; }
  if (d.startsWith('pk:'))  { await qollanmaFayli(cq); return true; }
  if (d.startsWith('pl:'))  { await partiyaRoyxati(cq); return true; }
  if (d.startsWith('p:'))   { await partiyaKarta(cq); return true; }
  if (d === 'rek_yubor')    { await reklamaniYubor(cq, user); return true; }
  if (d === 'rek_qayta')    { await javobBer(cq.id); await reklamaBoshla(cq.message.chat.id, user); return true; }
  if (d === 'rek_bekor')    { await javobBer(cq.id); await holatTozala(user.id);
                              await yubor(cq.message.chat.id, '❌ Bekor qilindi.'); return true; }
  return await agentCallback(cq, user);
}
