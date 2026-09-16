// OCHIQ (autentifikatsiyasiz) yo'llar — Instagram reklamasi uchun.
//
// Bu yerdagi hamma narsa TASHQARIDAN chaqiriladi: Telegram initData
// ham, admin tokeni ham yo'q. Shuning uchun har bir yo'l o'z
// chegarasini o'zi qo'yadi va javobda faqat OCHIQ ma'lumot bo'ladi.
import { ok, xato, json, tana, ipOl } from '../lib/http.js';
import { brendNomi } from '../lib/brend.js';
import { ilovaHavolasi } from '../lib/ilova-havola.js';
import { ochiqSkan, chegaraHolati, IP_KUNLIK } from '../services/ochiq-skan.js';
import { qatorlar } from '../db.js';
import { sozlama } from '../db.js';
import { xatoniTushuntir } from '../lib/xatolar.js';

const OCHILADI = new Set(['image/jpeg', 'image/png', 'image/webp']);
const tozaMime = (m) => (OCHILADI.has(String(m || '').toLowerCase())
  ? String(m).toLowerCase() : 'image/jpeg');


export async function ochiqRoutes(req, res, yol) {
  // ── Sahifa ochilganda: brend nomi va qolgan bepul urinishlar ──
  if (yol === '/api/ochiq/holat' && req.method === 'GET') {
    const [brend, chegara] = await Promise.all([
      brendNomi().catch(() => 'KiOVO'),
      chegaraHolati(ipOl(req)).catch(() => ({ qolgan: IP_KUNLIK })),
    ]);
    return ok(res, { brend, qolgan: chegara.qolgan, kunlik: IP_KUNLIK });
  }

  // ── Bosh sahifa (kiovo.shop) uchun ma'lumot ──
  //
  // Sayt AUTENTIFIKATSIYASIZ ochiladi, shuning uchun bu yerdan faqat
  // vitrinaga chiqadigan narsa beriladi: brend nomi, aloqa va sotuvda
  // turgan mahsulotlarning ko'rinadigan qismi. Ombor qoldig'i,
  // tannarx, mijoz ma'lumoti — hech biri bu javobga tushmaydi.
  if (yol === '/api/ochiq/sayt' && req.method === 'GET') {
    const [brend, telefon, ishVaqti, konsultant, instagram, bot, mahsulotlar] =
      await Promise.all([
        brendNomi().catch(() => 'KiOVO'),
        sozlama('menejer_telefon', '').catch(() => ''),
        sozlama('menejer_ish_vaqti', '').catch(() => ''),
        sozlama('konsultatsiya_user', '').catch(() => ''),
        sozlama('sayt_instagram', '').catch(() => ''),
        ilovaHavolasi().catch(() => null),
        vitrina().catch(() => []),
      ]);
    return ok(res, { brend, telefon, ish_vaqti: ishVaqti,
      konsultant: String(konsultant || '').replace(/^@/, ''),
      instagram: String(instagram || '').replace(/^@/, ''),
      bot: bot || null, mahsulotlar });
  }

  // ── Skaner ──
  if (yol === '/api/ochiq/skan' && req.method === 'POST') {
    const b = await tana(req, 16 * 1024 * 1024);
    const base64 = String(b.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!base64 || base64.length < 1000)  return xato(res, 400, 'Rasm yuborilmadi.');
    if (base64.length > 12 * 1024 * 1024) return xato(res, 413, 'Rasm juda katta.');

    try {
      const natija = await ochiqSkan({ base64, mime: tozaMime(b.mime), ip: ipOl(req) });
      if (!natija.yaroqli) return ok(res, natija);
      // Botga havola: start parametrida TOKEN ketadi, bot esa aynan
      // shu tahlilni topib beradi
      const havola = await ilovaHavolasi().catch(() => null);
      const bot = await botStartHavolasi(natija.token);
      return ok(res, { ...natija, havola: bot || havola });
    } catch (e) {
      if (e.message === 'CHEGARA') {
        return json(res, 429, {
          error: `Bugungi bepul limit tugadi (${IP_KUNLIK} ta). Ertaga qayta urinib ko‘ring.`,
          chegara: e.chegara,
        });
      }
      if (e.message === 'LIMIT_TUGADI') {
        return json(res, 429, { error: 'Hozir navbat ko‘p — bir necha daqiqadan keyin urinib ko‘ring.' });
      }
      const x = xatoniTushuntir(e);
      console.error('OCHIQ SKAN XATOSI', x.log);
      return xato(res, 502, x.matn);
    }
  }

  return null;                  // bu yo'l bizniki emas
}

/* Vitrina: sotuvda turgan, rasmi bor mahsulotlar.
 *
 * `stock > 0` SHART: saytda ko'ringan narsa do'konda bo'lishi kerak,
 * aks holda odam ilovaga o'tib «yo'q ekan» deb qaytib ketadi. Tartib
 * sotilgani bo'yicha — eng ko'p olingani birinchi ko'rinadi. */
async function vitrina() {
  const r = await qatorlar(
    `select id, coalesce(nullif(nom_uz, ''), name) as nom, brand, price, old_price,
            step, poster_id, volume
       from products
      where is_active and stock > 0 and poster_id is not null
      order by sold_count desc nulls last, id
      limit 8`);
  return r.map((p) => ({
    id: p.id, nom: p.nom, brend: p.brand || '', narx: Number(p.price) || 0,
    eski_narx: Number(p.old_price) || 0, bosqich: p.step || '',
    hajm: p.volume || '', rasm: p.poster_id ? `/media/${p.poster_id}?w=480` : null,
  }));
}

/** `t.me/<bot>?start=n_<token>` — bot tokenni tanib oladi. */
async function botStartHavolasi(token) {
  const { botNomi } = await import('../lib/ilova-havola.js');
  const bot = await botNomi().catch(() => null);
  return bot ? `https://t.me/${bot}?start=n_${token}` : null;
}
