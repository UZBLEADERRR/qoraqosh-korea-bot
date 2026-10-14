// Majburiy obuna: foydalanuvchi kanalga a'zo bo'lmasa botdan foydalana olmaydi.
//
// Tekshirish getChatMember orqali. Har xabarda Telegram'ga so'rov yubormaslik
// uchun natija qisqa vaqt keshlanadi — a'zo bo'lgan odam qayta-qayta
// tekshirilmaydi.
import { sozlama, sorov, qator, qatorlar } from '../db.js';
import { tg } from '../bot/tg.js';
import { kesh } from '../lib/kesh.js';
import { adminmi } from '../lib/admin.js';

// A'zolikni 10 daqiqa eslab turamiz. Chiqib ketgan odam eng ko'pi bilan
// 10 daqiqa ortiqcha foydalanadi — bu Telegram'ni so'rovga ko'mgandan yaxshi.
const KESH_MS = 10 * 60_000;

const AZO = new Set(['creator', 'administrator', 'member']);
/** «restricted» bo'lsa ham kanalda turgan bo'lishi mumkin — is_member shuni aytadi. */
const azomi = (m) => Boolean(m && (AZO.has(m.status) || (m.status === 'restricted' && m.is_member)));

/**
 * @returns {Promise<{kerak:boolean, azo:boolean, kanal:string, havola:string}>}
 */
export async function obunaHolati(telegramId, user) {
  const [kanal, havola] = await Promise.all([
    sozlama('majburiy_kanal', ''),
    sozlama('majburiy_kanal_havola', ''),
  ]);
  const k = String(kanal || '').replace(/"/g, '').trim();
  if (!k) return { kerak: false, azo: true, kanal: '', havola: '' };

  // Adminlar hech qachon to'silmaydi — aks holda kanal noto'g'ri
  // sozlanganda o'z botiga kira olmay qolishardi.
  if (adminmi(user)) return { kerak: false, azo: true, kanal: k, havola: '' };

  const h = await havolaniTop(k, havola);

  // HAVOLA YO'Q — to'smaymiz.
  // Admin kanal ID sini yozib, havolani unutgan bo'lsa foydalanuvchi
  // "obuna bo'ling" xabarini ko'radi, lekin qayerga borishni bilmaydi va
  // botdan UMUMAN foydalana olmay qoladi. Bunday sozlama biznesni
  // to'xtatgandan ko'ra, obunani vaqtincha talab qilmagan yaxshi.
  if (!h) {
    console.error('MAJBURIY KANAL: havola topilmadi —', k,
      '· botni kanalga admin qiling yoki havolani sozlamalarga yozing');
    return { kerak: false, azo: true, kanal: k, havola: '' };
  }

  const azo = await kesh(`obuna:${telegramId}`, KESH_MS, async () => {
    const r = await tg('getChatMember', { chat_id: k, user_id: Number(telegramId) });
    // Bot kanalga qo'shilmagan yoki kanal noto'g'ri bo'lsa — hammani
    // to'sib qo'ymaymiz. Noto'g'ri sozlama butun botni o'ldirmasligi kerak.
    if (!r?.ok) {
      console.error('MAJBURIY KANAL:', r?.description);
      return true;
    }
    const a = azomi(r.result);
    await azolikniYoz(telegramId, a).catch(() => {});
    return a;
  });

  return { kerak: !azo, azo, kanal: k, havola: h };
}

/**
 * Admin yozgan havolani Telegram tugmasi qabul qiladigan ko'rinishga keltiradi.
 * `@kiovo_shop`, `kiovo_shop`, `t.me/kiovo_shop` → `https://t.me/kiovo_shop`.
 * Tugmaga faqat http(s) manzil qo'yiladi: aks holda Telegram BUTUN xabarni
 * rad etadi («Wrong HTTP URL») va obuna so'rovi odamga umuman yetmaydi —
 * bot jim qolgandek ko'rinadi.
 * @returns {string} to'g'ri havola yoki '' (yaroqsiz)
 */
export function havolaTozala(x) {
  let h = String(x || '').replace(/["']/g, '').trim();
  if (!h || /\s/.test(h)) return '';
  if (/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/.test(h)) return `https://t.me/${h.replace(/^@/, '')}`;
  if (/^(t\.me|telegram\.me|www\.t\.me)\//i.test(h)) h = `https://${h}`;
  if (/^http:\/\/(t\.me|telegram\.me)\//i.test(h)) h = h.replace(/^http:/i, 'https:');
  return /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(h) ? h : '';
}

/**
 * Kanalga kirish havolasi.
 *
 * Tartib:
 *   1. Admin qo'lda yozgan havola
 *   2. @nom bo'lsa — t.me/nom
 *   3. Telegram'dan so'raymiz: kanalning ochiq nomi yoki taklif havolasi
 *   4. Yopiq kanalda taklif havolasi yo'q bo'lsa — o'zimiz yaratamiz
 *
 * Natija keshlanadi: har xabarda Telegram'ga so'rov yubormaymiz.
 */
async function havolaniTop(kanal, qoldaYozilgan) {
  const qolda = havolaTozala(qoldaYozilgan);
  if (qolda) return qolda;
  if (String(qoldaYozilgan || '').replace(/"/g, '').trim()) {
    console.error('MAJBURIY KANAL: havola yaroqsiz —', qoldaYozilgan, '· https://t.me/... ko‘rinishida yozing');
  }
  if (kanal.startsWith('@')) return `https://t.me/${kanal.slice(1)}`;

  return kesh(`obuna-havola:${kanal}`, 30 * 60_000, async () => {
    const r = await tg('getChat', { chat_id: kanal });
    if (!r?.ok) {
      console.error('MAJBURIY KANAL getChat:', r?.description);
      return '';
    }
    const c = r.result || {};
    if (c.username) return `https://t.me/${c.username}`;
    if (c.invite_link) return c.invite_link;

    // Yopiq kanal va asosiy taklif havolasi hali yaratilmagan
    const y = await tg('createChatInviteLink', {
      chat_id: kanal, name: 'Bot orqali obuna', creates_join_request: false,
    });
    if (y?.ok && y.result?.invite_link) return y.result.invite_link;

    console.error('MAJBURIY KANAL: taklif havolasi yaratilmadi —', y?.description);
    return '';
  });
}

/** Havola keshini tashlash — admin sozlamani o'zgartirganda. */
export const havolaKeshiniTashla = (kanal) =>
  import('../lib/kesh.js').then(({ keshniTashla }) =>
    keshniTashla(kanal ? `obuna-havola:${kanal}` : undefined));

/**
 * A'zo bo'lmaganga ko'rsatiladigan xabar — matn admin panelda
 * (Xabarlar → Majburiy obuna) o'zgartiriladi.
 */
export async function obunaXabari(havola, brend, kanal = '') {
  const { xabar } = await import('../bot/shablon.js');
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const [matn, tugma, tekshir] = await Promise.all([
    xabar('xabar_obuna', { dokon: esc(brend), havola: esc(havola || kanal || ''), kanal: esc(kanal) }, ''),
    xabar('xabar_obuna_tugma', {}, '📢 Kanalga obuna bo‘lish'),
    xabar('xabar_obuna_tekshir', {}, '✅ Obuna bo‘ldim'),
  ]);
  const kb = [];
  havola = havolaTozala(havola);
  if (havola) kb.push([{ text: String(tugma || '📢 Kanalga obuna bo‘lish').replace(/<[^>]+>/g, '').slice(0, 60), url: havola }]);
  kb.push([{ text: String(tekshir || '✅ Obuna bo‘ldim').replace(/<[^>]+>/g, '').slice(0, 60), callback_data: 'obuna_tekshir' }]);
  // Havolani MATNDA ham beramiz: tugma ba'zi klientlarda ochilmaydi va
  // odam qayerga borishni bilmay qoladi. Admin {havola} ni olib tashlagan
  // bo'lsa ham — pastga qo'shiladi.
  let m = matn || `🔒 <b>Avval kanalimizga obuna bo‘ling</b>\n\n${esc(brend)} botidan foydalanish uchun kanalimizga a'zo bo‘ling.`;
  if (havola && !m.includes(esc(havola))) m += `\n\n👉 ${esc(havola)}`;
  return { matn: m, reply_markup: { inline_keyboard: kb } };
}

/** «Obuna bo'ldim» bosilganda keshni tashlab qayta tekshiramiz. */
export function obunaniUnut(telegramId) {
  // kesh moduli kalit bo'yicha o'chiradi
  return import('../lib/kesh.js').then(({ keshniTashla }) => keshniTashla(`obuna:${telegramId}`));
}


// ─────────────── KIM QAYERDAN KELIB QO'SHILDI ───────────────

/**
 * Bot a'zolikni tekshirgan har safar (10 daqiqada ko'pi bilan bir marta):
 * a'zo emas — «so'raldi» belgisi; a'zo — birinchi tasdiq vaqti. Shu ikkisi
 * bilan «bot orqali qo'shildi» va «avvaldan a'zo edi» ajratiladi.
 */
export async function azolikniYoz(telegramId, azo) {
  const id = String(telegramId);
  if (azo) {
    await sorov(`update users set kanal_azo_at = now(), kanal_chiqdi_at = null
                  where telegram_id = $1 and kanal_azo_at is null`, [id]);
  } else {
    await sorov(`update users set kanal_soraldi_at = coalesce(kanal_soraldi_at, now()),
                   kanal_chiqdi_at = case when kanal_azo_at is not null then now() else kanal_chiqdi_at end,
                   kanal_azo_at = null
                  where telegram_id = $1`, [id]);
  }
}

/** Kanal sozlamadagi kanalmi (@nom yoki -100… id). */
async function bizningKanalmi(chat) {
  const k = String(await sozlama('majburiy_kanal', '') || '').replace(/"/g, '').trim();
  if (!k || !chat) return false;
  if (k.startsWith('@')) return String(chat.username || '').toLowerCase() === k.slice(1).toLowerCase();
  return String(chat.id) === k;
}

/**
 * Telegram «chat_member» xabari: kimdir kanalga qo'shildi yoki chiqdi.
 * Bot kanalda ADMIN bo'lsa keladi. Botdan foydalanmaganlar ham yoziladi.
 */
export async function kanalHarakati(cm) {
  if (!cm?.chat || !(await bizningKanalmi(cm.chat))) return null;
  const edi = azomi(cm.old_chat_member), boldi = azomi(cm.new_chat_member);
  if (edi === boldi) return null;
  const u = cm.new_chat_member?.user || cm.from || {};
  if (u.is_bot) return null;
  const tid = String(u.id);
  const user = await qator(`select id from users where telegram_id = $1`, [tid]);
  await sorov(`insert into kanal_harakatlar (kanal, telegram_id, user_id, ism, username, holat, havola_nomi)
               values ($1,$2,$3,$4,$5,$6,$7)`,
    [String(cm.chat.username ? '@' + cm.chat.username : cm.chat.id), tid, user?.id || null,
     [u.first_name, u.last_name].filter(Boolean).join(' ') || null, u.username || null,
     boldi ? 'qoshildi' : 'chiqdi', cm.invite_link?.name || (cm.invite_link ? 'taklif havolasi' : null)]);
  if (user) await azolikniYoz(tid, boldi);
  const { keshniTashla } = await import('../lib/kesh.js');
  keshniTashla(`obuna:${tid}`);
  return { holat: boldi ? 'qoshildi' : 'chiqdi' };
}

/**
 * Hisobot: kanalda nechta odam, bot orqali nechtasi qo'shildi, qaysi
 * manbadan (Instagram, TikTok, taklif havolasi…) va oxirgi qo'shilganlar.
 */
export async function kanalHisoboti({ kun = 30 } = {}) {
  const k = String(await sozlama('majburiy_kanal', '') || '').replace(/"/g, '').trim();
  const d = Math.max(1, Math.min(3650, Math.round(Number(kun) || 30)));
  const dan = `now() - interval '${d} days'`;
  const [soni, umumiy, davr, manbalar, songgi, harakat] = await Promise.all([
    k ? kesh(`kanal-soni:${k}`, 5 * 60_000, async () => {
      const r = await tg('getChatMemberCount', { chat_id: k }).catch(() => null);
      return r?.ok ? r.result : null;
    }) : null,
    qator(`select
        count(*) filter (where telegram_id ~ '^[0-9]+$')::int as bot_foydalanuvchi,
        count(*) filter (where kanal_azo_at is not null)::int as azo,
        count(*) filter (where kanal_soraldi_at is not null and kanal_azo_at is not null)::int as bot_orqali,
        count(*) filter (where kanal_soraldi_at is null and kanal_azo_at is not null)::int as avvaldan,
        count(*) filter (where kanal_soraldi_at is not null and kanal_azo_at is null)::int as qoshilmagan,
        count(*) filter (where kanal_chiqdi_at is not null)::int as chiqdi
      from users`),
    qator(`select
        count(*) filter (where kanal_soraldi_at >= ${dan})::int as soraldi,
        count(*) filter (where kanal_azo_at >= ${dan} and kanal_soraldi_at is not null)::int as qoshildi,
        count(*) filter (where kanal_chiqdi_at >= ${dan})::int as chiqdi
      from users`),
    qatorlar(`select coalesce(h.nom, h.kod, u.manba, 'nomalum') as nom, coalesce(u.manba, 'nomalum') as manba, h.kod,
        count(*) filter (where u.kanal_soraldi_at is not null)::int as soraldi,
        count(*) filter (where u.kanal_soraldi_at is not null and u.kanal_azo_at is not null)::int as qoshildi,
        count(*) filter (where u.kanal_azo_at is not null)::int as azo
      from users u left join havolalar h on h.id = u.havola_id
      where u.telegram_id ~ '^[0-9]+$' and (u.kanal_soraldi_at >= ${dan} or u.kanal_azo_at >= ${dan})
      group by 1, 2, 3 order by qoshildi desc, soraldi desc limit 30`),
    qatorlar(`select u.id, u.full_name as ism, u.username, u.manba, h.nom as havola, h.kod,
        u.kanal_azo_at, u.kanal_soraldi_at, u.created_at
      from users u left join havolalar h on h.id = u.havola_id
      where u.kanal_azo_at is not null order by u.kanal_azo_at desc limit 40`),
    qatorlar(`select k.holat, k.ism, k.username, k.havola_nomi, k.created_at, u.manba, h.nom as havola
      from kanal_harakatlar k left join users u on u.id = k.user_id left join havolalar h on h.id = u.havola_id
      order by k.created_at desc limit 40`).catch(() => []),
  ]);
  return { kanal: k, azolar_soni: soni, kun: d, umumiy, davr, manbalar, songgi, harakatlar: harakat };
}
