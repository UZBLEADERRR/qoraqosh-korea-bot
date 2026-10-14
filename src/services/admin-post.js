// AI YORDAMCHI: POST VA RASMLI XABARLAR, MIJOZ KATEGORIYALARI.
//
// Admin «shu rasmni kanalga post qil», «akne muammosi bor ayollarga
// chegirma haqida rasmli xabar yubor» deydi — yordamchi:
//   1. mijozlarni KATEGORIYA bo'yicha tanlaydi (xatti-harakat, teri,
//      muammo, jins, yosh, hudud, manba) — kimga nima yozish aniqroq;
//   2. chiroyli matn yozadi (Telegram HTML: qalin, kursiv, havola;
//      {ism} — har odamga o'z ismi);
//   3. rasm qo'shadi: admin biriktirgan, mahsulot rasmi yoki AI chizgan;
//   4. tugma qo'shadi («🛍 Do'konni ochish»);
//   5. avval o'zingizga SINOV yuboradi, keyin kanal yoki bot obunachilariga.
import { qator, qatorlar, sozlama } from '../db.js';
import { config } from '../config.js';

const son = (v, z = 0) => (Number.isFinite(Number(v)) ? Number(v) : z);
const matn = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const SOTUV = `status <> 'bekor'`;

// ─────────────────────────── CHIROYLI MATN ───────────────────────────

const RUXSAT = ['b', 'strong', 'i', 'em', 'u', 's', 'code', 'blockquote', 'tg-spoiler'];

/**
 * Telegram HTML — faqat xavfsiz teglar. **qalin** va __kursiv__ ham
 * tushuniladi. Teglar juft bo'lmasa — oddiy matn (Telegram buzuq HTML ni
 * rad etadi va xabar umuman ketmaydi).
 */
export function xavfsizHtml(t) {
  let s = String(t ?? '').replace(/\r/g, '');
  s = s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<i>$1</i>');
  s = s.replace(new RegExp(`&lt;(/?)(${RUXSAT.join('|')})&gt;`, 'g'), '<$1$2>');
  s = s.replace(/&lt;a href=&quot;(https?:\/\/[^\s&]+?)&quot;&gt;(.*?)&lt;\/a&gt;/g, '<a href="$1">$2</a>');
  for (const t2 of RUXSAT) {
    const och = (s.match(new RegExp(`<${t2}>`, 'g')) || []).length;
    const yop = (s.match(new RegExp(`</${t2}>`, 'g')) || []).length;
    if (och !== yop) return s.replace(/<\/?[a-z-]+(?: href="[^"]*")?>/g, '');
  }
  return s.trim();
}

// ─────────────────────────── KATEGORIYALAR ───────────────────────────

/** Xatti-harakat bo'yicha kategoriyalar (bitta odam bir nechtasida bo'lishi mumkin). */
export const KATEGORIYA = {
  hammasi:          { nom: 'Hamma', sql: `select id from users` },
  yangi:            { nom: 'Yangi (7 kun, xaridsiz)', sql: `select u.id from users u where u.created_at > now() - interval '7 days'
                       and not exists (select 1 from orders o where o.user_id = u.id and o.${SOTUV})` },
  faol:             { nom: 'Faol (7 kunda kirgan)', sql: `select id from users where last_active > now() - interval '7 days'` },
  xaridorlar:       { nom: 'Xaridorlar', sql: `select distinct user_id as id from orders where ${SOTUV}` },
  bir_martalik:     { nom: '1 marta sotib olgan', sql: `select user_id as id from orders where ${SOTUV} group by user_id having count(*) = 1` },
  doimiy:           { nom: 'Doimiy (2+ xarid)', sql: `select user_id as id from orders where ${SOTUV} group by user_id having count(*) >= 2` },
  vip:              { nom: 'VIP (1 mln+ xarid)', sql: `select user_id as id from orders where ${SOTUV} group by user_id having sum(total) >= 1000000` },
  tahlil_xaridsiz:  { nom: 'Tahlil qilib sotib olmagan', sql: `select distinct a.user_id as id from analyses a
                       where not exists (select 1 from orders o where o.user_id = a.user_id and o.created_at >= a.created_at and o.${SOTUV})` },
  savat_tashlagan:  { nom: 'Savatini tashlab ketgan', sql: `select distinct c.user_id as id from cart_items c
                       where c.added_at > now() - interval '30 days'
                       and not exists (select 1 from orders o where o.user_id = c.user_id and o.created_at >= c.added_at)` },
  uxlab_qolgan:     { nom: 'Uxlab qolgan (30 kun kirmagan)', sql: `select id from users where last_active < now() - interval '30 days'` },
  qaytmagan:        { nom: 'Xaridor, 45 kun qaytmagan', sql: `select user_id as id from orders where ${SOTUV} group by user_id
                       having max(created_at) < now() - interval '45 days'` },
  royxat_xaridsiz:  { nom: 'Ro‘yxatdan o‘tib xarid qilmagan', sql: `select u.id from users u where u.agreed_at is not null
                       and not exists (select 1 from orders o where o.user_id = u.id)` },
};

/**
 * Filtrlar bo'yicha foydalanuvchilar (bloklanganlarsiz).
 * @param {object} f {kategoriya, teri_turi, muammo, jins, yosh_dan, yosh_gacha, viloyat, manba}
 */
export async function kategoriyaIdlar(f = {}) {
  const k = KATEGORIYA[f.kategoriya] || KATEGORIYA.hammasi;
  const p = [];
  const shart = [`u.id in (${k.sql})`, 'not u.is_blocked', `u.telegram_id !~ '^(mehmon|ochirilgan):'`];
  if (f.teri_turi) { p.push(matn(f.teri_turi, 30)); shart.push(`u.teri_turi = $${p.length}`); }
  if (f.jins) { p.push(f.jins === 'erkak' ? 'erkak' : 'ayol'); shart.push(`u.gender = $${p.length}`); }
  if (son(f.yosh_dan)) { p.push(son(f.yosh_dan)); shart.push(`u.age >= $${p.length}`); }
  if (son(f.yosh_gacha)) { p.push(son(f.yosh_gacha)); shart.push(`u.age <= $${p.length}`); }
  if (f.viloyat) { p.push(`%${matn(f.viloyat, 40)}%`); shart.push(`u.viloyat ilike $${p.length}`); }
  if (f.manba) { p.push(matn(f.manba, 20)); shart.push(`u.manba = $${p.length}`); }
  if (f.muammo) {
    p.push(`%${matn(f.muammo, 40)}%`);
    shart.push(`exists (select 1 from analyses a cross join lateral jsonb_array_elements(coalesce(a.problems, '[]'::jsonb)) e
      where a.user_id = u.id and (e->>'nom' ilike $${p.length} or e->>'kalit' ilike $${p.length}))`);
  }
  return qatorlar(`select u.id, u.telegram_id from users u where ${shart.join(' and ')}`, p);
}

const telegramdaSoni = (r) => r.filter((u) => /^[0-9]+$/.test(String(u.telegram_id || ''))).length;

/** Kategoriyalar xaritasi: har birida nechta odam, Telegramda nechtasi. */
export async function kategoriyalar() {
  const natija = {};
  for (const [k, v] of Object.entries(KATEGORIYA)) {
    const r = await kategoriyaIdlar({ kategoriya: k });
    natija[k] = { nom: v.nom, jami: r.length, telegramda: telegramdaSoni(r) };
  }
  const [teri, jins, yosh, muammo, viloyat, manba] = await Promise.all([
    qatorlar(`select coalesce(teri_turi, 'nomaʼlum') as nom, count(*)::int as soni from users where not is_blocked group by 1 order by 2 desc limit 8`),
    qatorlar(`select coalesce(gender, 'nomaʼlum') as nom, count(*)::int as soni from users where not is_blocked group by 1 order by 2 desc`),
    qatorlar(`select case when age is null then 'nomaʼlum' when age < 18 then '18 gacha' when age < 25 then '18–24'
        when age < 35 then '25–34' when age < 45 then '35–44' else '45+' end as nom, count(*)::int as soni
      from users where not is_blocked group by 1 order by 1`),
    qatorlar(`select e->>'nom' as nom, count(distinct a.user_id)::int as soni from analyses a
        cross join lateral jsonb_array_elements(coalesce(a.problems, '[]'::jsonb)) e
        where e->>'nom' is not null group by 1 order by 2 desc limit 10`),
    qatorlar(`select coalesce(viloyat, 'nomaʼlum') as nom, count(*)::int as soni from users where not is_blocked group by 1 order by 2 desc limit 8`),
    qatorlar(`select coalesce(manba, 'nomaʼlum') as nom, count(*)::int as soni from users where not is_blocked group by 1 order by 2 desc limit 8`),
  ]);
  return { kategoriyalar: natija, teri_turi: teri, jins, yosh, muammolar: muammo, viloyat, manba,
    izoh: 'Filtrlarni birlashtirish mumkin: kategoriya + teri_turi + muammo + jins + yosh + viloyat + manba.' };
}

// ─────────────────────────── RASM ───────────────────────────

/** Rasm manzili (Telegram o'zi yuklab oladi — ochiq media). */
async function rasmManzili(a) {
  const asos = config.saytUrl || config.publicUrl || '';
  if (a.rasm_id && /^[0-9a-f-]{36}$/i.test(String(a.rasm_id))) return `${asos}/media/${a.rasm_id}`;
  if (a.product_id) {
    const p = await qator(`select poster_id from products where id = $1`, [son(a.product_id)]);
    if (p?.poster_id) return `${asos}/media/${p.poster_id}`;
  }
  if (a.rasm_tavsifi) {
    const { postRasmi } = await import('./agent.js');
    const bayt = await postRasmi(matn(a.rasm_tavsifi, 600));
    if (bayt) {
      const m = await qator(`insert into media (tur, mime, bayt, hajm, goya) values ('post', 'image/png', $1, $2, $3) returning id`,
        [bayt, bayt.length, matn(a.rasm_tavsifi, 200)]);
      return `${asos}/media/${m.id}`;
    }
  }
  return null;
}

/** Admin AI suhbatiga biriktirgan rasmlarni saqlaydi — post'da ishlatish uchun. */
export async function biriktirilganniSaqla(rasmlar = []) {
  const idlar = [];
  for (const r of rasmlar.slice(0, 4)) {
    if (!r?.base64) continue;
    const bayt = Buffer.from(r.base64, 'base64');
    if (bayt.length < 500 || bayt.length > 10 * 1024 * 1024) continue;
    const m = await qator(`insert into media (tur, mime, bayt, hajm, goya) values ('post', $1, $2, $3, 'AI suhbatiga biriktirilgan') returning id`,
      [r.mime || 'image/jpeg', bayt, bayt.length]).catch(() => null);
    if (m) idlar.push(m.id);
  }
  return idlar;
}

// ─────────────────────────── YUBORISH ───────────────────────────

async function tugmaYasa(a) {
  if (a.tugma === false || a.tugma_yoq) return null;
  const nom = matn(a.tugma_matn, 40) || '🛍 Do‘konni ochish';
  let havola = matn(a.tugma_havola, 300);
  if (!/^https?:\/\//.test(havola)) {
    const { ilovaHavolasi } = await import('../lib/ilova-havola.js').catch(() => ({}));
    havola = (ilovaHavolasi && await ilovaHavolasi().catch(() => null)) || `${config.saytUrl || ''}/app/`;
  }
  return /^https?:\/\//.test(havola) ? { inline_keyboard: [[{ text: nom, url: havola }]] } : null;
}

async function adminlar() {
  const idlar = new Set((config.adminTelegramIds || []).map(String));
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  return [...idlar];
}

/**
 * Post / rasmli xabar.
 * kimga: 'sinov' (adminlarga ko'rib chiqish uchun) | 'kanal' | 'bot' (obunachilar, kategoriya bilan)
 */
export async function postYubor(a = {}) {
  const kimga = ['sinov', 'kanal', 'bot'].includes(a.kimga) ? a.kimga : 'sinov';
  const tana = xavfsizHtml(matn(a.matn, 3500));
  if (tana.replace(/<[^>]+>/g, '').length < 3) return { yuborildi: 0, xabar: 'Post matni bo‘sh.' };
  const rasm = await rasmManzili(a);
  if (rasm && tana.length > 1024) return { yuborildi: 0, xabar: `Rasm izohi 1024 belgigacha bo‘ladi (hozir ${tana.length}). Matnni qisqartiring.` };
  const tugma = await tugmaYasa(a);
  const { tg } = await import('../bot/tg.js');
  const bitta = (chat) => (rasm
    ? tg('sendPhoto', { chat_id: chat, photo: rasm, caption: tana, parse_mode: 'HTML', ...(tugma ? { reply_markup: tugma } : {}) })
    : tg('sendMessage', { chat_id: chat, text: tana, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
        ...(tugma ? { reply_markup: tugma } : {}) }));

  if (kimga === 'sinov') {
    const r = [];
    for (const id of await adminlar()) {
      const j = await bitta(id).catch((e) => ({ ok: false, description: e.message }));
      r.push(j?.ok ? 'ok' : (j?.description || 'xato'));
    }
    return { yuborildi: r.filter((x) => x === 'ok').length, kimga: 'adminlar (sinov)', rasm: Boolean(rasm),
      xatolar: r.filter((x) => x !== 'ok'), xabar: 'Sinov sizga yuborildi — ko‘rib chiqib, «kanal» yoki «bot» ga yuborishni ayting.' };
  }
  if (kimga === 'kanal') {
    const kanal = matn(a.kanal, 80) || String(await sozlama('majburiy_kanal', '') || '').replace(/"/g, '').trim();
    if (!kanal) return { yuborildi: 0, xabar: 'Kanal ko‘rsatilmagan va majburiy kanal sozlanmagan.' };
    const j = await bitta(kanal).catch((e) => ({ ok: false, description: e.message }));
    return j?.ok ? { yuborildi: 1, kanal, rasm: Boolean(rasm), xabar_id: j.result?.message_id }
      : { yuborildi: 0, kanal, xabar: `Kanalga yuborilmadi: ${j?.description || 'xato'} (bot kanalda admin bo‘lishi kerak).` };
  }
  const r = await kategoriyaIdlar(a);
  const idlar = r.filter((u) => /^[0-9]+$/.test(String(u.telegram_id || ''))).map((x) => x.id);
  if (!idlar.length) return { yuborildi: 0, xabar: 'Bu kategoriyada Telegramda hech kim yo‘q.' };
  const { broadcastBoshla } = await import('./broadcast.js');
  const b = await broadcastBoshla({ matn: tana, fileId: rasm || undefined, userIdlar: idlar, tugma });
  return { yuborildi: b.jami, bajarildi: true, yuborish_id: b.id, rasm: Boolean(rasm),
    natija: `${b.jami} kishiga yuborish boshlandi (fonda, sekundiga ~10 ta).` };
}

/** Tasdiq kartasi uchun: nechta odamga ketadi. */
export async function postSoni(a = {}) {
  if (a.kimga === 'kanal') return 1;
  if (a.kimga !== 'bot') return (await adminlar()).length;
  return telegramdaSoni(await kategoriyaIdlar(a));
}

export const POST_VOSITALAR = {
  mijoz_kategoriyalari: {
    oqish: true,
    ishla: () => kategoriyalar(),
    tavsif: 'MIJOZLAR KATEGORIYALARI: yangi, faol, xaridorlar, 1 martalik, doimiy, VIP, tahlil qilib sotib olmagan, '
          + 'savat tashlagan, uxlab qolgan, qaytmagan, ro‘yxatdan o‘tib xaridsiz — har birida nechta odam (Telegramda nechta); '
          + 'teri turi, jins, yosh guruhi, eng ko‘p muammolar, viloyat va manba taqsimoti. Kimga xabar yozishdan OLDIN ko‘r.',
    parametrlar: '—',
  },
  post_yubor: {
    oqish: false,
    ishla: postYubor,
    tavsif: 'POST yoki RASMLI XABAR: kimga = sinov (avval ADMINLARGA ko‘rib chiqish uchun — standart) | kanal (Telegram '
          + 'kanal, standart — majburiy kanal) | bot (bot obunachilari; kategoriya va filtrlar bilan: kategoriya, teri_turi, '
          + 'muammo, jins, yosh_dan, yosh_gacha, viloyat, manba). Rasm: rasm_id (admin biriktirgan — savolda media_id '
          + 'yozilgan), product_id (mahsulot rasmi) yoki rasm_tavsifi (AI chizadi, inglizcha). Matn — Telegram HTML: <b>, <i>, '
          + '<u>, <a href="…">, <blockquote>; {ism} — har odamga o‘z ismi. Rasm bilan matn 1024 belgigacha. Tugma: tugma_matn, '
          + 'tugma_havola (standart — «🛍 Do‘konni ochish» ilovaga); tugma_yoq: true — tugmasiz.',
    parametrlar: 'kimga, matn, rasm_id | product_id | rasm_tavsifi, kanal, kategoriya + filtrlar, tugma_matn, tugma_havola',
  },
};
