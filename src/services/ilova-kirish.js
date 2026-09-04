// Telegramsiz kirish: telefon raqami + botdan tasdiqlash.
//
// Oqim:
//   1. Brauzer raqamni yuboradi        → sorovYarat()
//   2. Botga tasdiqlash tugmalari keladi
//   3. Odam «Ha, bu men» ni bosadi     → sorovniTasdiqla()
//   4. Brauzer holatni so'rab turadi   → sorovHolati() → token
//   5. Keyingi so'rovlar token bilan   → seansdanUser()
//
// Nima uchun SMS emas: SMS pul turadi va o'zbek raqamlariga yetkazish
// ishonchsiz. Telegram esa allaqachon bor — odam botdan ro'yxatdan
// o'tgan, ya'ni raqami tasdiqlangan.
import crypto from 'node:crypto';
import { qator, sorov } from '../db.js';
import { yubor } from '../bot/tg.js';
import { esc } from '../bot/format.js';
import { brendNomi } from '../lib/brend.js';

const SOROV_MS  = 3 * 60_000;              // tasdiqlashga 3 daqiqa
const SEANS_KUN = 60;                      // brauzer seansi 60 kun
const TOZALASH_ORALIQ = 6 * 60 * 60_000;   // eskilarni 6 soatda bir tozalaymiz

const xesh = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/**
 * O'zbek raqamini bir ko'rinishga keltiradi.
 * Odam «90 123 45 67», «+998901234567», «998901234567» deb yozishi
 * mumkin — hammasi bitta raqam.
 */
export function raqamTozala(xom) {
  const r = String(xom || '').replace(/\D/g, '');
  if (!r) return null;
  const oxirgi9 = r.slice(-9);
  return oxirgi9.length === 9 ? `+998${oxirgi9}` : null;
}

/**
 * Ko'rsatish uchun niqoblangan raqam: +998 90 *** ** 67
 *
 * To'liq ko'rsatmaymiz: ekranni birov ko'rib qolsa raqam qo'lga
 * tushmasin. Operator va oxirgi ikki raqam odamning o'z raqamini
 * tanishi uchun yetarli.
 */
export const raqamYashir = (r) => {
  const d = String(r || '').replace(/\D/g, '').slice(-9);
  return d.length === 9 ? `+998 ${d.slice(0, 2)} *** ** ${d.slice(-2)}` : String(r || '');
};

let oxirgiTozalash = 0;
async function eskilarniTozala() {
  if (Date.now() - oxirgiTozalash < TOZALASH_ORALIQ) return;
  oxirgiTozalash = Date.now();
  await sorov(`delete from kirish_sorovlari where expires_at < now() - interval '1 day'`)
    .catch(() => {});
  await sorov(`delete from ilova_seanslar where expires_at < now()`).catch(() => {});
}

/**
 * Kirish so'rovini yaratadi va botga tasdiqlash xabarini yuboradi.
 *
 * @returns {Promise<{xato?: string, kalit?: string, kod?: string,
 *                    raqam?: string, muddat?: number}>}
 */
export async function sorovYarat(xomRaqam, { ip = '', qurilma = '' } = {}) {
  eskilarniTozala().catch(() => {});

  const raqam = raqamTozala(xomRaqam);
  if (!raqam) return { xato: 'Telefon raqamini to‘liq kiriting: +998 90 123 45 67' };

  // Faqat botdan ro'yxatdan o'tganlar. Aks holda begona odam istalgan
  // raqamni kiritib, birovga xabar yog'dirishi mumkin bo'lardi.
  const u = await qator(
    `select id, telegram_id, full_name, is_blocked from users
      where regexp_replace(coalesce(phone, ''), '\\D', '', 'g') like '%' || $1
        and telegram_id is not null
      order by id limit 1`, [raqam.slice(-9)]);

  if (!u || u.is_blocked) {
    // Qaysi raqam ro'yxatda borligini oshkor qilmaymiz — bu raqamlarni
    // tekshirib chiqish uchun ochiq eshik bo'lardi.
    return { xato: 'Bu raqam bilan ro‘yxatdan o‘tilmagan. '
                 + 'Avval botga kiring va telefoningizni yuboring.' };
  }

  // Eski kutayotgan so'rovlar yopiladi: chat tasdiq tugmalariga to'lmasin
  await sorov(
    `update kirish_sorovlari set holat = 'rad'
      where user_id = $1 and holat = 'kutilmoqda'`, [u.id]);

  const kalit = crypto.randomBytes(24).toString('base64url');
  const kod = String(crypto.randomInt(1000, 10000));
  const s = await qator(
    `insert into kirish_sorovlari (kalit, user_id, kod, ip, qurilma, expires_at)
     values ($1,$2,$3,$4,$5, now() + interval '3 minutes') returning id`,
    [kalit, u.id, kod, String(ip).slice(0, 60), String(qurilma).slice(0, 120)]);

  const brend = await brendNomi();
  await yubor(u.telegram_id, [
    `🔐 <b>${esc(brend)} ilovasiga kirish</b>`, ``,
    `Brauzerdan kirishga urinish bo‘ldi.`,
    qurilma ? `Qurilma: <i>${esc(String(qurilma).slice(0, 60))}</i>` : '',
    ``,
    `Ekrandagi kod: <b>${kod}</b>`, ``,
    `Kod mos kelsa — tasdiqlang. Mos kelmasa yoki bu siz bo‘lmasangiz`,
    `<b>«Men emas»</b> ni bosing.`,
  ].filter(Boolean).join('\n'), {
    reply_markup: { inline_keyboard: [[
      { text: '✅ Ha, bu men', callback_data: `kir:ha:${s.id}` },
      { text: '🚫 Men emas', callback_data: `kir:yoq:${s.id}` },
    ]] },
  });

  return { kalit, kod, raqam: raqamYashir(raqam), muddat: SOROV_MS };
}

/**
 * Brauzer holatni so'raydi. Tasdiqlangan bo'lsa TOKEN BIR MARTA
 * qaytariladi va so'rov «olindi» ga o'tadi — takror ishlatib bo'lmaydi.
 */
export async function sorovHolati(kalit, { qurilma = '' } = {}) {
  if (!kalit) return { holat: 'yoq' };
  const s = await qator(
    `select id, user_id, holat, expires_at < now() as otdi
       from kirish_sorovlari where kalit = $1`, [String(kalit).slice(0, 64)]);
  if (!s) return { holat: 'yoq' };
  if (s.holat === 'olindi') return { holat: 'yoq' };
  if (s.otdi && s.holat === 'kutilmoqda') return { holat: 'muddati_otdi' };
  if (s.holat !== 'tasdiqlandi') return { holat: s.holat };

  const { token } = await seansOch(s.user_id, qurilma);
  await sorov(`update kirish_sorovlari set holat = 'olindi' where id = $1`, [s.id]);
  const u = await qator('select id, full_name, phone from users where id = $1', [s.user_id]);
  return { holat: 'tasdiqlandi', token, user: u };
}

/** Botdagi tugma: tasdiqlash yoki rad etish. */
export async function sorovJavobi(id, hami) {
  const s = await qator(
    `update kirish_sorovlari
        set holat = $2
      where id = $1 and holat = 'kutilmoqda' and expires_at > now()
      returning id, kod`, [Number(id), hami ? 'tasdiqlandi' : 'rad']);
  return s || null;
}

/** Yangi brauzer seansi. Token faqat shu yerda ochiq ko'rinadi. */
export async function seansOch(userId, qurilma = '') {
  const token = crypto.randomBytes(32).toString('base64url');
  await sorov(
    `insert into ilova_seanslar (user_id, token_hash, qurilma, expires_at)
     values ($1,$2,$3, now() + ($4 || ' days')::interval)`,
    [userId, xesh(token), String(qurilma).slice(0, 120), String(SEANS_KUN)]);
  return { token };
}

/**
 * Tokendan foydalanuvchini topadi.
 *
 * `last_seen` har so'rovda emas, kuniga bir marta yangilanadi:
 * har sahifa ochilganda yozish bazani bekorga bosadi.
 */
export async function seansdanUser(token) {
  if (!token) return null;
  const u = await qator(
    `update ilova_seanslar s
        set last_seen = now()
      where s.token_hash = $1 and s.expires_at > now()
        and s.last_seen < now() - interval '1 day'
      returning s.user_id`, [xesh(token)]);

  const userId = u?.user_id ?? (await qator(
    `select user_id from ilova_seanslar
      where token_hash = $1 and expires_at > now()`, [xesh(token)]))?.user_id;
  if (!userId) return null;

  const foydalanuvchi = await qator('select * from users where id = $1', [userId]);
  return foydalanuvchi?.is_blocked ? null : foydalanuvchi;
}

/** Chiqish — shu qurilmadagi seans o'chiriladi. */
export const seansniYop = (token) =>
  sorov('delete from ilova_seanslar where token_hash = $1', [xesh(token)]);

/** Profilda ko'rsatish uchun: nechta qurilmadan kirilgan. */
export const seanslarSoni = (userId) => qator(
  `select count(*)::int as n from ilova_seanslar
    where user_id = $1 and expires_at > now()`, [userId]).then((r) => r?.n ?? 0);

/** Boshqa hamma qurilmadan chiqish. */
export const hammaSeansniYop = (userId) =>
  sorov('delete from ilova_seanslar where user_id = $1', [userId]);
