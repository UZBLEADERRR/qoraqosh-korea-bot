// Telegram kanallariga xabar berish.
//
// Ikkita kanal bor:
//   kanal_buyurtma — yangi buyurtma va to'lov cheki
//   kanal_tahlil   — tahlil natijalari (natija-rasm.js dan yuboriladi)
//
// Kanal ID'si bo'sh bo'lsa hech narsa yuborilmaydi. Kanalga yuborish hech
// qachon asosiy oqimni to'xtatmaydi: mijoz buyurtmasi kanal ishlamagani
// uchun yo'qolmasligi kerak.
import { qator, sozlama } from '../db.js';
import { yubor, rasmYubor } from '../bot/tg.js';
import { esc, narx } from '../bot/format.js';
import { brendNomi } from '../lib/brend.js';

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function vaqt(d = new Date()) {
  const t = new Date(d.getTime() + 5 * 3600 * 1000);   // Toshkent
  const ikki = (n) => String(n).padStart(2, '0');
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]}, ${ikki(t.getUTCHours())}:${ikki(t.getUTCMinutes())}`;
}

/** Buyurtma haqidagi to'liq matn — chek rasmi ostida ham shu ketadi. */
async function buyurtmaMatni(o, user, sarlavha) {
  const qatorlar = (o.items || [])
    .map((i) => `• ${esc(i.name)} × ${i.qty} — ${narx(i.price * i.qty)}`).join('\n');

  return [
    sarlavha,
    ``,
    `🧾 <b>${esc(o.order_no)}</b>`,
    `🕐 ${vaqt(o.created_at ? new Date(o.created_at) : new Date())}`,
    ``,
    `👤 ${esc(o.customer_name || user?.full_name || '—')}`,
    `📱 <code>${esc(o.customer_phone || user?.phone || '—')}</code>`,
    user?.username ? `💬 @${esc(user.username)}` : '',
    ``,
    `📍 ${esc(o.customer_address || '—')}`,
    o.note ? `💬 Izoh: ${esc(o.note)}` : '',
    ``,
    `<b>Mahsulotlar:</b>`,
    qatorlar || '—',
    ``,
    o.discount ? `🎁 Chegirma: −${narx(o.discount)}` : '',
    `🚚 Yetkazish: ${o.delivery_fee ? narx(o.delivery_fee) : 'bepul'}`,
    `<b>💰 Jami: ${narx(o.total)}</b>`,
    o.cost_total ? `📈 Foyda: ${narx(Number(o.total) - Number(o.delivery_fee || 0) - Number(o.cost_total))}` : '',
  ].filter((x) => x !== undefined && x !== null && x !== '').join('\n');
}

/** Yangi buyurtma — chek hali yo'q. */
export async function kanalgaBuyurtma(buyurtma, user) {
  const kanal = String(await sozlama('kanal_buyurtma', '') || '');
  if (!kanal) return;
  try {
    const matn = await buyurtmaMatni(buyurtma, user, `🛒 <b>YANGI BUYURTMA</b>`);
    await yubor(kanal, matn);
  } catch (e) {
    console.error('BUYURTMA KANALI:', e.message);
  }
}

/**
 * To'lov cheki keldi — kanalga CHEK RASMI, ostida buyurtma ma'lumotlari.
 * Foydalanuvchi so'ragan ko'rinish shu: "Chek va pastida malumotlar ham keladi".
 */
export async function kanalgaChek(orderId) {
  const kanal = String(await sozlama('kanal_buyurtma', '') || '');
  if (!kanal) return;
  try {
    const o = await qator(
      `select o.*, m.bayt as chek_bayt, m.mime as chek_mime,
              u.full_name, u.username, u.phone
         from orders o
         left join media m on m.id = o.receipt_id
         left join users u on u.id = o.user_id
        where o.id = $1`, [orderId]);
    if (!o) return;

    const matn = await buyurtmaMatni(o, o, `💳 <b>TO‘LOV CHEKI KELDI</b>`);

    if (o.chek_bayt) {
      // Telegram izohi 1024 belgi bilan cheklangan. Uzun bo'lsa rasm izohsiz
      // ketadi va matn keyingi xabarda — hech narsa qirqilmaydi.
      if (matn.length <= 1024) {
        await rasmYubor(kanal, Buffer.from(o.chek_bayt), matn);
      } else {
        await rasmYubor(kanal, Buffer.from(o.chek_bayt), `💳 <b>To‘lov cheki</b> · ${esc(o.order_no)}`);
        await yubor(kanal, matn);
      }
    } else {
      await yubor(kanal, matn);
    }
  } catch (e) {
    console.error('CHEK KANALI:', e.message);
  }
}

/** Buyurtma holati o'zgardi — kanalga qisqa qator. */
export async function kanalgaHolat(orderNo, holat, kim = '') {
  const kanal = String(await sozlama('kanal_buyurtma', '') || '');
  if (!kanal) return;
  try {
    await yubor(kanal, `🔄 <b>${esc(orderNo)}</b> → <b>${esc(holat)}</b>${kim ? ` · ${esc(kim)}` : ''}`);
  } catch (e) {
    console.error('HOLAT KANALI:', e.message);
  }
}

/** Kanal sozlanganmi va bot unga yoza oladimi — tizim tekshiruvi uchun. */
export async function kanalniSina(kalit) {
  const kanal = String(await sozlama(kalit, '') || '');
  if (!kanal) return { holat: 'yoq', xabar: 'Kanal sozlanmagan' };
  const brend = await brendNomi();
  const r = await yubor(kanal, `✅ <i>${esc(brend)} — kanal ulanishi tekshirildi.</i>`);
  return r?.ok
    ? { holat: 'ok', xabar: `Kanalga yozildi (${kanal})` }
    : { holat: 'xato', xabar: r?.description || 'Yozib bo‘lmadi' };
}
