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
import { raqamTozala, raqamYashir, qidiruvNomzodlari } from '../lib/telefon.js';
import { config } from '../config.js';
import { botNomi } from '../lib/ilova-havola.js';
import { smsYoqilganmi, smsGaYaroqlimi, smsYubor, KIRISH_MATNI } from './sms.js';
import { googleTokeniniTekshir } from './google-kirish.js';

const SOROV_MS  = 3 * 60_000;              // tasdiqlashga 3 daqiqa
const SEANS_KUN = 60;                      // brauzer seansi 60 kun
const TOZALASH_ORALIQ = 6 * 60 * 60_000;   // eskilarni 6 soatda bir tozalaymiz

const xesh = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// Raqam bilan ishlash BITTA joyda — `src/lib/telefon.js`. Ilgari bu
// yerda o'z nusxasi turardi va u faqat O'zbekiston raqamini bilardi.
export { raqamTozala, raqamYashir } from '../lib/telefon.js';

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
  if (!raqam) {
    return { xato: 'Telefon raqamini to‘liq kiriting. Chet el raqami bo‘lsa '
                 + 'mamlakat kodi bilan: +82 10 1234 5678' };
  }

  // Faqat botdan ro'yxatdan o'tganlar. Aks holda begona odam istalgan
  // raqamni kiritib, birovga xabar yog'dirishi mumkin bo'lardi.
  // TO'LIQ moslik bo'yicha qidiramiz. Ilgari oxirgi 9 raqam bo'yicha
  // `like '%…'` turardi: xorijiy raqamlar qo'shilgach bu boshqa
  // davlatning butunlay boshqa raqamiga tasodifan mos kelib,
  // begonaga tasdiqlash so'rovi yuborilishi mumkin edi.
  // `qidiruvNomzodlari` eski yozuvlarni ham hisobga oladi.
  const u = await qator(
    `select id, telegram_id, full_name, is_blocked from users
      where regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = any($1)
        and telegram_id ~ '^[0-9]+$'
      order by id limit 1`, [qidiruvNomzodlari(raqam)]);

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

/**
 * Botdagi tugma: tasdiqlash yoki rad etish.
 * Faqat so'rov EGASI javob bera oladi — tugma boshqa birovga yetib
 * qolsa ham (yoki kimdir callback ma'lumotini o'zi yasasa) begona
 * odam kirishni tasdiqlay olmaydi.
 */
export async function sorovJavobi(id, hami, userId) {
  const s = await qator(
    `update kirish_sorovlari
        set holat = $2
      where id = $1 and user_id = $3 and tur = 'telefon'
        and holat = 'kutilmoqda' and expires_at > now()
      returning id, kod`, [Number(id), hami ? 'tasdiqlandi' : 'rad', userId]);
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

// ══════════════════ YANGI KIRISH YO'LLARI ══════════════════
//
// Play Store'dan yuklagan odamda bot hisobi bo'lmasligi mumkin.
// Ilgari kirish faqat «botda ro'yxatdan o'tgan raqam + botdan
// tasdiqlash» edi: yangi mijoz ham, Google tekshiruvchisi ham ilovani
// ocha olmasdi. Endi uchta yo'l bor:
//
//   Google  — Gmail hisobi, bir bosish
//   Telefon — SMS kod (Eskiz sozlangan bo'lsa)
//   Telegram — bot havolasi; oldindan ro'yxatdan o'tish SHART EMAS

const SMS_MS = 5 * 60_000;          // kod 5 daqiqa amal qiladi
const SMS_URINISH = 5;              // noto'g'ri kod — 5 marta
const SMS_RAQAMGA = 3;              // bitta raqamga 10 daqiqada 3 ta SMS
const TELEGRAM_MS = 5 * 60_000;

const kodXesh = (kalit, kod) => xesh(`${kalit}:${kod}`);
const tengmi = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Demo raqammi — Google Play tekshiruvchisi uchun. */
export const demoRaqammi = (e164) => Boolean(config.demoTelefon && config.demoKod
  && e164 && raqamTozala(config.demoTelefon) === e164);

/** Ilova kirish ekrani qaysi tugmalarni ko'rsatadi. */
export async function kirishUsullari() {
  const bot = await botNomi().catch(() => null);
  return {
    google: config.googleClientId || '',
    sms: smsYoqilganmi() || Boolean(config.demoTelefon && config.demoKod),
    telegram: Boolean(bot),
  };
}

// ── Telegram ──

/**
 * Brauzer «Telegram orqali kirish» ni bosdi. So'rov foydalanuvchisiz
 * yaratiladi — kim ekanini bot aniqlaydi (havolani kim ochsa).
 */
export async function telegramSorovYarat({ ip = '', qurilma = '' } = {}) {
  eskilarniTozala().catch(() => {});
  const bot = await botNomi();
  if (!bot) return { xato: 'Telegram bot hozircha ulanmagan. Boshqa usul bilan kiring.' };
  const kalit = crypto.randomBytes(24).toString('base64url');
  await sorov(
    `insert into kirish_sorovlari (kalit, user_id, kod, tur, ip, qurilma, expires_at)
     values ($1, null, '-', 'telegram', $2, $3, now() + interval '5 minutes')`,
    [kalit, String(ip).slice(0, 60), String(qurilma).slice(0, 120)]);
  return { kalit, havola: `https://t.me/${bot}?start=kir_${kalit}`, muddat: TELEGRAM_MS };
}

/**
 * Botda `/start kir_<kalit>` bosildi. So'rov SHU Telegram foydalanuvchisiga
 * bog'lanadi va tasdiqlanadi.
 *
 * @returns {Promise<boolean>} so'rov topildi va tasdiqlandi
 */
export async function telegramKirishniTasdiqla(kalit, user) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(kalit || '')) || !user?.id) return false;
  const r = await qator(
    `update kirish_sorovlari set user_id = $2, holat = 'tasdiqlandi'
      where kalit = $1 and tur = 'telegram' and holat = 'kutilmoqda'
        and expires_at > now()
      returning id`, [kalit, user.id]);
  return Boolean(r);
}

// ── SMS ──

/**
 * Telefon raqamiga kod yuboradi.
 * @returns {Promise<{xato?:string, kalit?:string, raqam?:string, muddat?:number}>}
 */
export async function smsSorovYarat(xomRaqam, { ip = '', qurilma = '' } = {}) {
  eskilarniTozala().catch(() => {});
  const raqam = raqamTozala(xomRaqam);
  if (!raqam) return { xato: 'Telefon raqamini to‘liq kiriting: +998 90 123 45 67' };

  const demo = demoRaqammi(raqam);
  if (!demo) {
    if (!smsYoqilganmi()) return { xato: 'SMS orqali kirish hozircha yoqilmagan. Google yoki Telegram bilan kiring.' };
    if (!smsGaYaroqlimi(raqam)) {
      return { xato: 'SMS faqat O‘zbekiston raqamiga yuboriladi. Chet el raqami bo‘lsa Google yoki Telegram bilan kiring.' };
    }
    // Bitta raqamga SMS yog'dirib bo'lmasin (va SMS puli behuda ketmasin)
    const n = await qator(
      `select count(*)::int as n from kirish_sorovlari
        where telefon = $1 and tur = 'sms' and created_at > now() - interval '10 minutes'`, [raqam]);
    if ((n?.n ?? 0) >= SMS_RAQAMGA) return { xato: 'Bu raqamga kod ko‘p so‘raldi. 10 daqiqadan keyin urining.' };
  }

  const kalit = crypto.randomBytes(24).toString('base64url');
  const kod = demo ? String(config.demoKod) : String(crypto.randomInt(100000, 1000000));
  await sorov(
    `insert into kirish_sorovlari (kalit, user_id, kod, tur, telefon, ip, qurilma, expires_at)
     values ($1, null, $2, 'sms', $3, $4, $5, now() + interval '5 minutes')`,
    [kalit, kodXesh(kalit, kod), raqam, String(ip).slice(0, 60), String(qurilma).slice(0, 120)]);

  if (!demo) {
    const r = await smsYubor(raqam, KIRISH_MATNI(kod));
    if (!r.ok) {
      await sorov(`update kirish_sorovlari set holat = 'rad' where kalit = $1`, [kalit]);
      return { xato: 'SMS yuborib bo‘lmadi. Birozdan keyin urining yoki boshqa usulni tanlang.' };
    }
  }
  return { kalit, raqam: raqamYashir(raqam), muddat: SMS_MS };
}

/**
 * SMS kodini tekshiradi. To'g'ri bo'lsa — raqam egasi topiladi yoki
 * yangi foydalanuvchi yaratiladi va seans ochiladi.
 */
export async function smsTasdiqla(kalit, kod, { qurilma = '' } = {}) {
  const s = await qator(
    `select id, kod, telefon, holat, urinish, expires_at < now() as otdi
       from kirish_sorovlari where kalit = $1 and tur = 'sms'`, [String(kalit || '').slice(0, 64)]);
  if (!s || s.holat !== 'kutilmoqda') return { xato: 'So‘rov topilmadi. Kodni qayta so‘rang.' };
  if (s.otdi) return { xato: 'Kodning muddati tugadi. Qayta so‘rang.' };
  if (s.urinish >= SMS_URINISH) return { xato: 'Urinishlar tugadi. Kodni qayta so‘rang.' };

  const toza = String(kod || '').replace(/\D/g, '');
  if (!tengmi(kodXesh(kalit, toza), s.kod)) {
    await sorov(`update kirish_sorovlari set urinish = urinish + 1 where id = $1`, [s.id]);
    const qoldi = SMS_URINISH - s.urinish - 1;
    return { xato: qoldi > 0 ? `Kod noto‘g‘ri. Yana ${qoldi} ta urinish.` : 'Urinishlar tugadi. Kodni qayta so‘rang.' };
  }

  // Raqam egasi — mavjud foydalanuvchi (botdan ro'yxatdan o'tgan bo'lishi
  // ham mumkin: unda o'sha hisobga kiradi va buyurtmalari ko'rinadi)
  let u = await qator(
    `select * from users
      where regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = any($1)
      order by (telegram_id ~ '^[0-9]+$') desc, id limit 1`, [qidiruvNomzodlari(s.telefon)]);
  if (u?.is_blocked) return { xato: 'Bu hisob bloklangan.' };
  if (!u) {
    u = await qator(
      `insert into users (telegram_id, phone, source) values ($1, $2, 'ilova')
       on conflict (telegram_id) do update set phone = excluded.phone
       returning *`, [`tel:${s.telefon}`, s.telefon]);
  }
  await sorov(`update kirish_sorovlari set holat = 'olindi', user_id = $2 where id = $1`, [s.id, u.id]);
  const { token } = await seansOch(u.id, qurilma);
  return { token, user: { id: u.id, full_name: u.full_name, phone: u.phone } };
}

// ── Google ──

/**
 * Google ID token bilan kirish. Hisob `google_sub` bo'yicha topiladi;
 * topilmasa — tasdiqlangan email bo'yicha (shu email bilan oldin
 * ro'yxatdan o'tgan bo'lsa), aks holda yangi foydalanuvchi.
 */
export async function googleBilanKir(credential, { qurilma = '', tekshir = googleTokeniniTekshir } = {}) {
  let g;
  try { g = await tekshir(credential); }
  catch (e) { return { xato: 'Google hisobini tasdiqlab bo‘lmadi. Qayta urining.', sabab: e.message }; }

  let u = await qator('select * from users where google_sub = $1', [g.sub]);
  if (!u && g.email) {
    u = await qator(
      `update users set google_sub = $1
        where id = (select id from users where lower(email) = $2 and google_sub is null
                     order by id limit 1)
        returning *`, [g.sub, g.email]);
  }
  if (u?.is_blocked) return { xato: 'Bu hisob bloklangan.' };
  if (!u) {
    u = await qator(
      `insert into users (telegram_id, google_sub, email, full_name, source)
       values ($1, $2, $3, $4, 'google')
       on conflict (telegram_id) do update set google_sub = excluded.google_sub
       returning *`, [`google:${g.sub}`, g.sub, g.email || null, g.ism || null]);
  } else if (g.email && !u.email) {
    await sorov('update users set email = $1 where id = $2', [g.email, u.id]);
  }
  const { token } = await seansOch(u.id, qurilma);
  return { token, user: { id: u.id, full_name: u.full_name, phone: u.phone } };
}
