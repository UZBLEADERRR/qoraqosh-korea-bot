// KUNLIK KONTENT TAVSIYALARI — Instagram uchun.
//
// Har kuni (sozlangan soatda, Toshkent vaqti) adminga Telegramda 5 ta
// tayyor g'oya keladi: mavzu, format (Reels / karusel / post / story),
// birinchi qator (hook), nima suratga olish, tayyor izoh va hashtaglar.
//
// G'oyalar TAKRORLANMAYDI: Instagram'dagi oxirgi postlar va oldin
// yuborilgan g'oyalar AI ga beriladi — u faqat hali yoritilmagan
// mavzularni taklif qiladi. Asos — do'konning o'zi: aksiyalar, yangi va
// ko'p sotilgan mahsulotlar, mijozlar Direct'da nimani ko'p so'rashi,
// tahlillarda eng ko'p chiqqan teri muammolari va mavsum.
import { qatorlar, sorov, sozlama, sozlamalarniUnut } from '../db.js';
import { config } from '../config.js';

const SXEMA = {
  type: 'object',
  properties: {
    goyalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mavzu:      { type: 'string' },
          format:     { type: 'string', enum: ['reels', 'karusel', 'post', 'story'] },
          hook:       { type: 'string' },
          ssenariy:   { type: 'string' },
          izoh:       { type: 'string' },
          hashtaglar: { type: 'string' },
          mahsulot:   { type: 'string' },
          nega:       { type: 'string' },
        },
        required: ['mavzu', 'format', 'hook', 'ssenariy', 'izoh', 'hashtaglar', 'mahsulot', 'nega'],
        propertyOrdering: ['mavzu', 'format', 'hook', 'ssenariy', 'izoh', 'hashtaglar', 'mahsulot', 'nega'],
      },
    },
  },
  required: ['goyalar'],
  propertyOrdering: ['goyalar'],
};

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** AI uchun kontekst: nima joylangan, nima bor, mijozlar nimani so'raydi. */
async function kontekst() {
  const [postlar, oldingi, aksiya, yangi, top, muammo, savollar] = await Promise.all([
    (async () => {
      try {
        const api = await import('./instagram/api.js');
        if (!(await api.ulanganmi())) return [];
        const r = await api.postlar(30);
        return (r?.data || []).map((p) => String(p.caption || '').replace(/\s+/g, ' ').slice(0, 160)).filter(Boolean);
      } catch { return []; }
    })(),
    qatorlar(`select mavzu from kontent_tavsiyalar where created_at > now() - interval '60 days' order by created_at desc limit 80`).catch(() => []),
    qatorlar(`select coalesce(nom_uz, name) as nom, brand, price, old_price from products
      where is_active and stock > 0 and old_price > price order by (old_price - price) desc limit 6`).catch(() => []),
    qatorlar(`select coalesce(nom_uz, name) as nom, brand, price from products
      where is_active and stock > 0 order by created_at desc limit 6`).catch(() => []),
    qatorlar(`select coalesce(nom_uz, name) as nom, brand, price from products
      where is_active and stock > 0 order by sold_count desc nulls last limit 6`).catch(() => []),
    qatorlar(`select e->>'nom' as nom, count(*)::int as soni from analyses a
      cross join lateral jsonb_array_elements(coalesce(a.problems, '[]'::jsonb)) e
      where a.created_at > now() - interval '30 days' and e->>'nom' is not null group by 1 order by 2 desc limit 8`).catch(() => []),
    qatorlar(`select matn from ig_xabarlar where yonalish = 'kiruvchi' and matn is not null and length(matn) > 12
      and matn not like '(%' and created_at > now() - interval '14 days' order by random() limit 25`).catch(() => []),
  ]);
  const nom = (x) => `${x.brand ? x.brand + ' ' : ''}${x.nom}`;
  return { postlar, oldingi: oldingi.map((x) => x.mavzu), aksiya: aksiya.map((x) => `${nom(x)} ${x.price} (eski ${x.old_price})`),
    yangi: yangi.map(nom), top: top.map(nom), muammo: muammo.map((x) => `${x.nom} (${x.soni})`), savollar: savollar.map((x) => x.matn.slice(0, 140)) };
}

/** 5 ta yangi g'oya (hali joylanmagan va oldin taklif qilinmagan mavzular). */
export async function kontentGoyalari({ soni = 5 } = {}) {
  const { aiJson } = await import('../ai/index.js');
  const k = await kontekst();
  const oy = OYLAR[new Date(Date.now() + 5 * 3600e3).getUTCMonth()];
  const ro = (x) => (x.length ? x.map((y) => `- ${y}`).join('\n') : '- (yo‘q)');
  const j = await aiJson([{ text: `Sen KiOVO (Koreya kosmetikasi, O'zbekiston) Instagram sahifasi uchun kontent strategisan.
Asoschi — Nigina, Koreyada o'qigan qiz; sahifa uning ovozida, samimiy va foydali.
Bugun uchun ${soni} ta YANGI kontent g'oyasi ber — o'zbek tilida, O'zbekiston auditoriyasi uchun.

QOIDALAR:
- Quyidagi JOYLANGAN POSTLAR va OLDIN TAKLIF QILINGAN mavzulardan FARQLI mavzular (takror yo'q).
- Har biri boshqa format va maqsadda: ta'lim (teri haqida), mahsulot (aksiya/yangi), ishonch
  (Nigina va Koreya, sharhlar, ortidagi jarayon), ko'ngilochar/trend, sotuv (bepul yuz tahlili, chegirma).
- Mavsumni hisobga ol (hozir ${oy}).
- hook — videoning/postning birinchi 1-2 soniyasi uchun qisqa, qiziqtiradigan gap.
- ssenariy — nima suratga olinadi, 3-5 qisqa qadam (kadr bo'yicha).
- izoh — tayyor caption (2-4 qator, oxirida chaqiriq: «yuzingiz rasmini Direct'ga tashlang — bepul tahlil»
  yoki «havola profilda»), emoji me'yorida.
- hashtaglar — 6-10 ta, o'zbekcha va inglizcha aralash.
- mahsulot — qaysi mahsulot(lar) ko'rsatiladi (quyidagi ro'yxatdan) yoki «—».
- nega — nima uchun aynan hozir (1 gap: mijozlar so'rayapti, aksiya, mavsum…).

JOYLANGAN POSTLAR (oxirgilari):
${ro(k.postlar.slice(0, 20))}

OLDIN TAKLIF QILINGAN MAVZULAR:
${ro(k.oldingi.slice(0, 50))}

AKSIYALAR:
${ro(k.aksiya)}
YANGI MAHSULOTLAR:
${ro(k.yangi)}
KO'P SOTILGANLAR:
${ro(k.top)}
TAHLILLARDA KO'P CHIQQAN MUAMMOLAR (30 kun):
${ro(k.muammo)}
MIJOZLAR DIRECT'DA SO'RAGANLARI (namuna):
${ro(k.savollar)}` }], SXEMA, { temperature: 0.9, maxTokens: 3000, qayerda: 'kontent' });
  const goyalar = (Array.isArray(j.goyalar) ? j.goyalar : []).slice(0, soni).map((g) => ({
    mavzu: String(g.mavzu || '').trim().slice(0, 160), format: g.format || 'post', hook: String(g.hook || '').trim().slice(0, 240),
    ssenariy: String(g.ssenariy || '').trim().slice(0, 900), izoh: String(g.izoh || '').trim().slice(0, 1200),
    hashtaglar: String(g.hashtaglar || '').trim().slice(0, 300), mahsulot: String(g.mahsulot || '').trim().slice(0, 200),
    nega: String(g.nega || '').trim().slice(0, 240),
  })).filter((g) => g.mavzu);
  return { goyalar, joylangan_postlar: k.postlar.length };
}

const FORMAT = { reels: '🎬 Reels', karusel: '🖼 Karusel', post: '📸 Post', story: '⏳ Story' };
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** G'oyalarni Telegram xabarlariga aylantiradi (har g'oya — alohida, nusxalash oson). */
export function goyaXabarlari(goyalar) {
  return goyalar.map((g, i) => [
    `<b>${i + 1}. ${esc(g.mavzu)}</b>`,
    `${FORMAT[g.format] || '📸 Post'}${g.mahsulot && g.mahsulot !== '—' ? ` · ${esc(g.mahsulot)}` : ''}`,
    g.nega ? `<i>${esc(g.nega)}</i>` : '',
    '',
    `🎯 <b>Boshlanishi:</b> ${esc(g.hook)}`,
    `🎥 <b>Nima suratga olinadi:</b>\n${esc(g.ssenariy)}`,
    '',
    `✍️ <b>Tayyor izoh:</b>\n<blockquote>${esc(g.izoh)}\n\n${esc(g.hashtaglar)}</blockquote>`,
  ].filter((x) => x !== null).join('\n').replace(/\n{3,}/g, '\n\n'));
}

async function adminlar() {
  const idlar = new Set((config.adminTelegramIds || []).map(String));
  for (const u of await qatorlar(`select telegram_id from users where is_admin and telegram_id ~ '^[0-9]+$'`)) idlar.add(u.telegram_id);
  return [...idlar];
}

/** G'oyalarni yasab adminlarga yuboradi va eslab qoladi (takrorlanmasin). */
export async function kontentYubor({ soni = 5 } = {}) {
  const { goyalar, joylangan_postlar } = await kontentGoyalari({ soni });
  if (!goyalar.length) return { yuborildi: 0, xabar: 'AI g‘oya bera olmadi.' };
  for (const g of goyalar) {
    await sorov(`insert into kontent_tavsiyalar (mavzu, format, tafsilot) values ($1, $2, $3)`, [g.mavzu, g.format, JSON.stringify(g)]).catch(() => {});
  }
  const { yubor } = await import('../bot/tg.js');
  const sana = new Date().toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' });
  const bosh = `💡 <b>Bugungi Instagram g‘oyalari</b> · ${esc(sana)}\n`
    + `${joylangan_postlar ? `Instagram’dagi oxirgi ${joylangan_postlar} ta post hisobga olindi — ` : ''}faqat hali yoritilmagan mavzular.`;
  let yuborildi = 0;
  for (const id of await adminlar()) {
    const j = await yubor(id, bosh).catch(() => null);
    if (j?.ok) yuborildi++;
    for (const m of goyaXabarlari(goyalar)) await yubor(id, m).catch(() => {});
  }
  return { yuborildi, goyalar: goyalar.map((g) => `${g.mavzu} (${g.format})`) };
}

/**
 * Har 10 daqiqada chaqiriladi: sozlangan soat kelgan va bugun hali
 * yuborilmagan bo'lsa — yuboradi.
 */
export async function kunlikTekshir() {
  const st = await sozlama('instagram', {}).catch(() => ({}));
  if (st?.kontent_tavsiya === false) return null;
  const soat = Number.isFinite(Number(st?.kontent_soat)) ? Number(st.kontent_soat) : 9;
  const hozir = new Date(Date.now() + 5 * 3600e3);                 // Toshkent (UTC+5)
  const bugun = hozir.toISOString().slice(0, 10);
  if (hozir.getUTCHours() < soat) return null;
  if (String(await sozlama('kontent_oxirgi', '').catch(() => '')).replace(/"/g, '') === bugun) return null;
  await sorov(`insert into settings (key, value, updated_at) values ('kontent_oxirgi', $1::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(bugun)]);
  sozlamalarniUnut();
  return kontentYubor();
}

export const KONTENT_VOSITALAR = {
  kontent_goyalari: {
    oqish: true,
    ishla: (a = {}) => kontentGoyalari({ soni: Math.min(10, Math.max(1, Number(a.soni) || 5)) }),
    tavsif: 'INSTAGRAM KONTENT G‘OYALARI: hali joylanmagan va oldin taklif qilinmagan mavzular bo‘yicha tayyor g‘oyalar — '
          + 'format, hook, nima suratga olish, tayyor izoh va hashtaglar (aksiya, yangi mahsulot, Direct savollari, mavsum asosida). '
          + 'Har kuni o‘zi ham keladi (Instagram sozlamalari: kontent_tavsiya, kontent_soat).',
    parametrlar: 'soni (standart 5)',
  },
};

export const _sinov = { kontekst };
