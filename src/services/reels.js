// KUNLIK REELS — AI har kuni bitta mahsulot videosini yasaydi va Instagram'ga joylaydi.
//
// Oqim: mahsulot tanlanadi (omborda bor, surati bor, oxirgi 30 kunda
// videosi chiqmagan; chegirmadagisi birinchi) → AI ssenariy va izoh yozadi
// (xabar yozish modeli) → Gemini 3.8 TTS ovoz → 1080×1920 MP4 →
// /media/<id> dan Instagram o'zi yuklab oladi → Reels joylanadi.
//
// Rejim (admin panel → «Kunlik Reels»):
//   avto   — o'zi joylaydi, adminga havola keladi;
//   tasdiq — avval adminga Telegramda video keladi: «✅ Joylash / 🔄 Boshqasi».
// Narx AI dan emas, BAZADAN olinadi — videoda noto'g'ri narx chiqmasin.
import { qator, qatorlar, sorov, sozlama, sozlamalarniUnut, pool } from '../db.js';
import { config } from '../config.js';
import { reelsYasa } from '../video/reels.js';
import { ovozYoz, OVOZ_STANDART, ovozModeliMi } from '../video/ovoz.js';
import { jpegQil } from '../rasm/olcham.js';

export const STANDART = { yoqilgan: false, soat: 19, rejim: 'avto', ovozli: true,
  ovoz_model: OVOZ_STANDART.model, ovoz: OVOZ_STANDART.ovoz };
const QULF = 774411;                         // advisory lock — ikki nusxa bir vaqtda yasamasin

export async function sozlamalar() {
  const s = await sozlama('reels', {}).catch(() => ({}));
  const r = { ...STANDART, ...(s && typeof s === 'object' ? s : {}) };
  r.soat = Math.min(23, Math.max(0, Math.round(Number(r.soat)) || 0));
  if (!['avto', 'tasdiq'].includes(r.rejim)) r.rejim = 'avto';
  if (!ovozModeliMi(r.ovoz_model)) r.ovoz_model = OVOZ_STANDART.model;
  return r;
}

// Mahalliy formatlash (toLocaleString) muhitga qarab uzilmas bo'shliq qo'yadi — o'zimiz
const narxMatni = (n) => `${String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;

/** Bugungi video uchun mahsulot. */
export async function mahsulotTanla(productId = null) {
  if (productId) return qator('select * from products where id = $1 and is_active', [productId]);
  return qator(`
    select p.* from products p
     where p.is_active and p.stock > 0 and p.poster_id is not null and p.variant_of is null
     order by (select max(r.created_at) from reels_postlar r
                where r.product_id = p.id and r.holat in ('joylandi', 'tayyor')) asc nulls first,
              (p.old_price is not null and p.old_price > p.price) desc,
              random()
     limit 1`);
}

const SXEMA = {
  type: 'object',
  properties: {
    hook:       { type: 'string' },
    punktlar:   { type: 'array', items: { type: 'string' } },
    ovoz:       { type: 'string' },
    izoh:       { type: 'string' },
    hashtaglar: { type: 'string' },
  },
  required: ['hook', 'punktlar', 'ovoz', 'izoh', 'hashtaglar'],
};

/** AI ssenariy: hook, 3 afzallik, ovoz matni, Instagram izohi. */
export async function ssenariyYoz(p) {
  const { aiJson } = await import('../ai/index.js');
  const chegirma = p.old_price > p.price ? ` (eski narx ${narxMatni(p.old_price)}, CHEGIRMA bor)` : '';
  const j = await aiJson([{ text: `Sen KiOVO (Koreya kosmetikasi, O'zbekiston) Instagram sahifasi uchun 18–25 soniyalik
Reels ssenariysini yozasan. Mahsulot:
- nom: ${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}
- tavsif: ${String(p.description || '').slice(0, 600)}
- faol moddalar: ${(p.actives || []).join(', ') || '—'}
- qaysi muammoga: ${(p.concerns || []).join(', ') || '—'}
- teri turi: ${(p.skin_types || []).join(', ') || '—'}
- qo'llash: ${String(p.usage_text || '').slice(0, 300)}
- narx: ${narxMatni(p.price)}${chegirma}

Qoidalar:
- hook — videoning birinchi soniyasi: mijozning MUAMMOSI yoki qiziq savol, 3–7 so'z. Narx yozma.
- punktlar — ROPPA-ROSA 3 ta qisqa afzallik (har biri 4–9 so'z), tarkib/natija haqida, aniq va halol.
  Kasallikni davolaydi deb va'da berma, «100%», «abadiy» kabi so'z ishlatma.
- ovoz — diktor o'qiydigan matn, 35–55 so'z: hook → afzalliklar → «Izohga plyus yozing — narx va maslahatni Direct'ga yuboramiz».
  Raqamlarni so'z bilan yoz (o'n daqiqa), belgisiz (+, %, — emas).
- izoh — Instagram post matni: 2–4 qisqa abzats, do'stona, 1–3 emoji, oxirida chaqiriq
  «Izohga «+» yozing — narx va maslahatni Direct'ga yuboramiz 💌». Narxni yozma (Direct'da aytiladi).
- hashtaglar — 6–10 ta, # bilan, bo'sh joy bilan ajratilgan (#koreyakosmetikasi #toshkent …).
Butun javob O'ZBEK tilida (lotin). Faqat JSON.` }], SXEMA,
  { temperature: 0.85, maxTokens: 1500, qayerda: 'reels', yozuv: true });
  const toza = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const punktlar = (Array.isArray(j.punktlar) ? j.punktlar : []).map((x) => toza(x, 70)).filter(Boolean).slice(0, 3);
  while (punktlar.length < 3) punktlar.push(['Koreyadan original mahsulot', 'Teriga yumshoq ta’sir qiladi', 'Har kuni qo‘llash uchun qulay'][punktlar.length]);
  return {
    hook: toza(j.hook, 60) || 'Teringizga Koreya sirini sinab ko‘ring',
    punktlar,
    ovoz: toza(j.ovoz, 600),
    izoh: `${String(j.izoh || '').trim().slice(0, 1800)}\n\n${toza(j.hashtaglar, 300)}`.trim(),
  };
}

async function surat(p) {
  const m = p.poster_id ? await qator('select mime, bayt from media where id = $1', [p.poster_id]) : null;
  if (!m?.bayt) return null;
  try {
    const j = await jpegQil(Buffer.from(m.bayt), m.mime, { eni: 1080, sifat: 88 });
    return { rasm: j.bayt.toString('base64'), mime: 'image/jpeg' };
  } catch { return { rasm: Buffer.from(m.bayt).toString('base64'), mime: m.mime }; }
}

/**
 * Video tayyorlaydi (joylamaydi).
 * @returns {Promise<object>} reels_postlar qatori (holat 'tayyor')
 */
export async function videoTayyorla({ productId = null, manba = 'jadval' } = {}) {
  const st = await sozlamalar();
  const p = await mahsulotTanla(productId);
  if (!p) throw Object.assign(new Error('Video uchun mahsulot yo‘q — omborda bor va surati bor mahsulot kerak.'), { turkum: 'reels' });
  const r = await qator(`insert into reels_postlar (product_id, manba) values ($1, $2) returning *`, [p.id, manba]);
  try {
    const s = await ssenariyYoz(p);
    let ovoz = null;
    if (st.ovozli && s.ovoz) {
      ovoz = await ovozYoz(s.ovoz, { model: st.ovoz_model, ovoz: st.ovoz })
        .catch((e) => { console.warn('REELS ovoz yozilmadi:', e.message); return null; });
    }
    const { mp4, soniya } = await reelsYasa({ surat: await surat(p), ovoz, ssenariy: {
      hook: s.hook, punktlar: s.punktlar, nom: p.nom_uz || p.name, brend: p.brand || '',
      narx: narxMatni(p.price), eskiNarx: p.old_price > p.price ? narxMatni(p.old_price) : '',
      chaqiriq: 'Izohga «+» yozing', pastki: 'Narx va maslahat — Direct’da · KiOVO' } });
    const m = await qator(`insert into media (tur, mime, bayt, hajm, goya) values ('video', 'video/mp4', $1, $2, $3) returning id`,
      [mp4, mp4.length, `Reels #${r.id}`]);
    return await qator(`update reels_postlar set holat = 'tayyor', video_id = $1, soniya = $2, izoh = $3,
        ssenariy = $4, ovozli = $5 where id = $6 returning *`,
      [m.id, soniya, s.izoh, JSON.stringify(s), Boolean(ovoz), r.id]);
  } catch (e) {
    await sorov(`update reels_postlar set holat = 'xato', xato = $1 where id = $2`, [String(e.message).slice(0, 500), r.id]);
    throw e;
  }
}

/** Tayyor videoni Instagram'ga joylaydi. */
export async function joyla(id) {
  const r = await qator('select * from reels_postlar where id = $1', [id]);
  if (!r?.video_id) throw new Error('Video topilmadi.');
  if (r.holat === 'joylandi') return r;
  if (!config.publicUrl) throw new Error('PUBLIC_URL sozlanmagan — Instagram videoni yuklab ololmaydi.');
  const ig = await import('./instagram/api.js');
  try {
    const n = await ig.reelsJoyla({ videoUrl: `${config.publicUrl}/media/${r.video_id}`, izoh: r.izoh || '' });
    return await qator(`update reels_postlar set holat = 'joylandi', ig_media_id = $1, permalink = $2,
        joylangan_at = now(), xato = null where id = $3 returning *`, [n.id, n.permalink, id]);
  } catch (e) {
    await sorov(`update reels_postlar set holat = 'xato', xato = $1 where id = $2`, [String(e.message).slice(0, 500), id]);
    throw e;
  }
}

async function adminlar() {
  const idlar = new Set((config.adminTelegramIds || []).map(String));
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  return [...idlar];
}

const qisqaIzoh = (r) => String(r.izoh || '').slice(0, 700);

/** Videoni adminlarga yuboradi (tasdiq tugmalari bilan yoki xabar sifatida). */
export async function adminlargaVideo(r, { tasdiq = false, sarlavha = '' } = {}) {
  const { tgFayl } = await import('../bot/tg.js');
  const m = await qator('select bayt from media where id = $1', [r.video_id]);
  if (!m?.bayt) return 0;
  const bayt = Buffer.from(m.bayt);
  const tugmalar = tasdiq ? { inline_keyboard: [[
    { text: '✅ Instagram’ga joylash', callback_data: `rl_ok:${r.id}` },
    { text: '🔄 Boshqasi', callback_data: 'rl_yangi' }],
    [{ text: '❌ Bekor', callback_data: `rl_bekor:${r.id}` }]] }
    : (r.permalink ? { inline_keyboard: [[{ text: '📲 Instagram’da ochish', url: r.permalink }]] } : undefined);
  let n = 0;
  for (const id of await adminlar()) {
    const j = await tgFayl('sendVideo', {
      chat_id: id, parse_mode: 'HTML', supports_streaming: true,
      caption: `${sarlavha || '🎬 <b>Bugungi Reels</b>'}\n\n${qisqaIzoh(r).replace(/&/g, '&amp;').replace(/</g, '&lt;')}`.slice(0, 1024),
      reply_markup: tugmalar,
    }, { video: { bayt, mime: 'video/mp4', nom: `reels-${r.id}.mp4` } }).catch(() => null);
    if (j?.ok) n++;
  }
  return n;
}

async function adminlargaMatn(matn) {
  const { yubor } = await import('../bot/tg.js');
  for (const id of await adminlar()) await yubor(id, matn).catch(() => {});
}

/** Bitta to'liq ish: yasash → (avto) joylash yoki (tasdiq) adminga yuborish. */
export async function bugungiIsh({ manba = 'jadval', majburiyRejim = null } = {}) {
  const st = await sozlamalar();
  const rejim = majburiyRejim || st.rejim;
  const r = await videoTayyorla({ manba });
  if (rejim === 'tasdiq') {
    await adminlargaVideo(r, { tasdiq: true, sarlavha: '🎬 <b>Bugungi Reels tayyor</b> — joylaymi?' });
    return { holat: 'tasdiq_kutilmoqda', id: r.id };
  }
  const j = await joyla(r.id);
  await adminlargaVideo(j, { sarlavha: '✅ <b>Reels Instagram’ga joylandi</b>' });
  return { holat: 'joylandi', id: j.id, permalink: j.permalink };
}

/**
 * Har 10 daqiqada: yoqilgan, soat kelgan va bugun hali qilinmagan bo'lsa —
 * bugungi Reelsni yasaydi. Advisory lock — ikki server nusxasi takrorlamasin.
 */
export async function kunlikTekshir() {
  const st = await sozlamalar();
  if (!st.yoqilgan) return null;
  const hozir = new Date(Date.now() + 5 * 3600e3);                 // Toshkent (UTC+5)
  const bugun = hozir.toISOString().slice(0, 10);
  if (hozir.getUTCHours() < st.soat) return null;
  if (String(await sozlama('reels_oxirgi', '').catch(() => '')).replace(/"/g, '') === bugun) return null;
  const mijoz = await pool.connect();
  try {
    const { rows: [q] } = await mijoz.query('select pg_try_advisory_lock($1) as olindi', [QULF]);
    if (!q?.olindi) return null;
    try {
      if (String(await sozlama('reels_oxirgi', '').catch(() => '')).replace(/"/g, '') === bugun) return null;
      await sorov(`insert into settings (key, value, updated_at) values ('reels_oxirgi', $1::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(bugun)]);
      sozlamalarniUnut();
      try {
        return await bugungiIsh();
      } catch (e) {
        console.error('REELS:', e.message);
        await adminlargaMatn(`⚠️ <b>Bugungi Reels chiqmadi</b>\n\n${String(e.message).slice(0, 400)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')}\n\n<i>/reels — qayta urinish</i>`);
        return { holat: 'xato', xato: e.message };
      }
    } finally {
      await mijoz.query('select pg_advisory_unlock($1)', [QULF]).catch(() => {});
    }
  } finally { mijoz.release(); }
}

export const oxirgilar = (n = 10) => qatorlar(`select r.id, r.holat, r.soniya, r.permalink, r.xato, r.manba, r.ovozli,
    r.created_at, r.joylangan_at, r.video_id, p.name, p.nom_uz, p.brand
  from reels_postlar r left join products p on p.id = r.product_id order by r.id desc limit $1`, [n]);
