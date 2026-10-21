// INSTAGRAM DIAGNOSTIKA — «instadan yozsam javob yo'q» bo'lganda sababni ko'rsatadi.
//
// Har webhook, imzo xatosi, kelgan xabar, AI yoki yuborish xatosi shu
// yerda belgilanadi (bazada `instagram_diag` sozlamasi — qayta ishga
// tushganda ham qoladi). Admin panel shu ma'lumotdan tekshiruv ro'yxatini
// tuzadi: webhook umuman kelyaptimi, imzo to'g'rimi, yuborish nega yiqildi.
import { sorov, sozlama } from '../../db.js';

let joriy = null;
let saqlashTimer = null;

async function ol() {
  if (!joriy) joriy = { ...((await sozlama('instagram_diag', {}).catch(() => ({}))) || {}) };
  return joriy;
}

function saqla() {
  clearTimeout(saqlashTimer);
  saqlashTimer = setTimeout(() => {
    sorov(`insert into settings (key, value, updated_at) values ('instagram_diag', $1::jsonb, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(joriy)]).catch(() => {});
  }, globalThis.IG_KECHIKISH_MS === 0 ? 0 : 1500);
}

/**
 * @param {'webhook'|'imzo_xato'|'xabar'|'komment'|'echo'|'yuborildi'|'yuborish_xato'|'ai_xato'|'begona_akkaunt'} tur
 * @param {object} [qoshimcha] — diagnostikaga qo'shiladigan maydonlar (kimga, qaysi akkaunt…)
 * @param {string} [izoh]
 */
export async function belgila(tur, izoh = '', qoshimcha = null) {
  const d = await ol();
  if (qoshimcha) Object.assign(d, qoshimcha);
  const hozir = new Date().toISOString();
  d[`${tur}_oxirgi`] = hozir;
  d[`${tur}_soni`] = (d[`${tur}_soni`] || 0) + 1;
  if (izoh) d[`${tur}_izoh`] = String(izoh).slice(0, 300);
  saqla();
}

export async function diagnostika() {
  return { ...(await ol()) };
}

export async function tozala() {
  joriy = {};
  saqla();
}
