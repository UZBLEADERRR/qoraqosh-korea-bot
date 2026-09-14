// OCHIQ (autentifikatsiyasiz) yo'llar — Instagram reklamasi uchun.
//
// Bu yerdagi hamma narsa TASHQARIDAN chaqiriladi: Telegram initData
// ham, admin tokeni ham yo'q. Shuning uchun har bir yo'l o'z
// chegarasini o'zi qo'yadi va javobda faqat OCHIQ ma'lumot bo'ladi.
import { ok, xato, json, tana, ipOl } from '../lib/http.js';
import { brendNomi } from '../lib/brend.js';
import { ilovaHavolasi } from '../lib/ilova-havola.js';
import { ochiqSkan, chegaraHolati, IP_KUNLIK } from '../services/ochiq-skan.js';
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

/** `t.me/<bot>?start=n_<token>` — bot tokenni tanib oladi. */
async function botStartHavolasi(token) {
  const { botNomi } = await import('../lib/ilova-havola.js');
  const bot = await botNomi().catch(() => null);
  return bot ? `https://t.me/${bot}?start=n_${token}` : null;
}
