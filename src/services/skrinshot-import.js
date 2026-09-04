// Admin botga skrinshot tashlaydi — mahsulot o'zi katalogga tushadi.
//
// Oqim:
//   1. Admin /qosh yozadi va yuzta skrinshot tashlaydi (yoki albom).
//   2. Har rasm navbatga tushadi. Navbat BITTALAB ishlanadi: yuzta AI
//      chaqiruvini bir vaqtda yuborsak provayder ham, baza ham bo'g'iladi.
//   3. AI rasmni o'qiydi: nomi, brendi, KOREYADAGI NARXI, og'irligi, toifasi.
//   4. Narx qoidasi bo'yicha sotuv narxi hisoblanadi:
//        (KRW × kurs) + (har 100 g uchun pochta) + foyda, yaxlitlanadi.
//   5. Ombor 100 dona qilib belgilanadi va mahsulot katalogga chiqadi.
//   6. Rasm mahsulotning posteri bo'lib saqlanadi.
//
// Havolani (Coupang/Daiso) admin keyinroq panelda qo'yadi — shuning uchun
// panelda "Havolasi yo'q" ro'yxati bor va nomlarni bir bosishda nusxalash
// mumkin.
import { qator, qatorlar, sorov, sozlama } from '../db.js';
import { skrinshotdanMahsulot } from '../ai/skrinshot-mahsulot.js';
import { narxHisobla, qoidaniTozala } from '../lib/narx.js';
import { faylOl, yubor, tahrirla } from '../bot/tg.js';
import { kalitlarniQosh } from './kalit-sozlar.js';
import { keshniTashla } from '../lib/kesh.js';
import { uzumgaMoslab } from './uzum-narx.js';

// Ishonch shundan past bo'lsa katalogga chiqarmaymiz — chala o'qilgan
// mahsulot do'konda turgani eng yomon variant.
const ISHONCH_CHEGARA = 60;
const OMBOR_SONI = 100;

// Har admin uchun bitta navbat. Jarayon qayta ishga tushsa navbat
// yo'qoladi — admin qolgan rasmlarni qayta tashlaydi (100 ta rasmni
// bazaga yozib turish bu ish uchun ortiqcha murakkablik).
const navbatlar = new Map();   // userId -> {royxat, ishlamoqda, xabarId, chatId, hisob}

const bosh = () => ({
  royxat: [], ishlamoqda: false, xabarId: null, chatId: null,
  qoshildi: [], otkazildi: [], xato: 0, jami: 0,
});

export const navbatHolati = (userId) => navbatlar.get(userId) || null;

/** Yangi rasmni navbatga qo'yadi va kerak bo'lsa ishlovchini uyg'otadi. */
export async function skrinshotQabul(user, chatId, fileId) {
  let n = navbatlar.get(user.id);
  if (!n) { n = bosh(); navbatlar.set(user.id, n); }
  n.chatId = chatId;
  n.royxat.push(fileId);
  n.jami += 1;

  if (!n.ishlamoqda) {
    n.ishlamoqda = true;
    const m = await yubor(chatId, holatMatni(n));
    n.xabarId = m?.result?.message_id ?? null;
    // Kutmaymiz: keyingi rasmlar shu orada kelaveradi
    ishlovchi(user, n).catch((e) => console.error('SKRINSHOT NAVBATI', e));
  } else {
    await holatniYangila(n);
  }
  return n;
}

const holatMatni = (n) => {
  const bajarildi = n.qoshildi.length + n.otkazildi.length + n.xato;
  return `📸 <b>Skrinshotdan qo‘shish</b>\n\n`
    + `Qabul qilindi: <b>${n.jami}</b> ta\n`
    + `Ishlandi: <b>${bajarildi}</b> ta\n`
    + `✅ Katalogga tushdi: <b>${n.qoshildi.length}</b>\n`
    + (n.otkazildi.length ? `⏭ O‘tkazildi: <b>${n.otkazildi.length}</b>\n` : '')
    + (n.xato ? `⚠️ Xato: <b>${n.xato}</b>\n` : '')
    + `\nRasm tashlashda davom eting. Tugatish: /tugat`;
};

let oxirgiYangilash = 0;
async function holatniYangila(n, majburiy = false) {
  if (!n.xabarId) return;
  // Telegram tahrirlashni ham cheklaydi — sekundiga bir marta yetadi
  if (!majburiy && Date.now() - oxirgiYangilash < 1200) return;
  oxirgiYangilash = Date.now();
  await tahrirla(n.chatId, n.xabarId, holatMatni(n)).catch(() => {});
}

/** Toifani topadi; mavjud bo'lmasa AI taklif qilganini YARATADI. */
async function toifaniTop(karta) {
  if (karta.category !== 'yangi') {
    const t = await qator('select id from categories where slug = $1', [karta.category]);
    if (t) return t.id;
  }
  const nom = (karta.yangi_toifa || '').trim();
  if (!nom) return null;

  // slug: "Soch parvarishi" -> "soch-parvarishi"
  const slug = nom.toLowerCase()
    .replace(/[''`ʻʼ’‘]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/gi, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40) || 'boshqa';

  const bor = await qator('select id from categories where slug = $1', [slug]);
  if (bor) return bor.id;

  const oxirgi = await qator('select coalesce(max(sort), 0) + 10 as s from categories');
  const yangi = await qator(
    `insert into categories (slug, name, emoji, sort) values ($1,$2,$3,$4)
     on conflict (slug) do update set name = excluded.name returning id`,
    [slug, nom.slice(0, 40), karta.emoji || '🧴', oxirgi?.s ?? 100]);
  console.log(`Yangi toifa yaratildi: ${nom} (${slug})`);
  return yangi.id;
}

/** Rasmni media jadvaliga yozib, poster sifatida bog'laydi. */
async function posterSaqla(base64, productId) {
  const bayt = Buffer.from(base64, 'base64');
  const m = await qator(
    `insert into media (tur, mime, bayt, hajm, product_id)
     values ('poster','image/jpeg',$1,$2,$3) returning id`,
    [bayt, bayt.length, productId]);
  await sorov('update products set poster_id = $1 where id = $2', [m.id, productId]);
  return m.id;
}

/** Bitta skrinshotni mahsulotga aylantiradi. */
export async function bittaSkrinshot(fileId, qoida) {
  const { base64 } = await faylOl(fileId);
  const karta = await skrinshotdanMahsulot(base64, 'image/jpeg');

  if (!karta.kosmetikami) return { holat: 'otkazildi', sabab: 'Kosmetika emas', karta };
  if (!karta.name)        return { holat: 'otkazildi', sabab: 'Nomi o‘qilmadi', karta };
  if (karta.ishonch < ISHONCH_CHEGARA) {
    return { holat: 'otkazildi', sabab: `Ishonch past (${karta.ishonch}%)`, karta };
  }

  // Narx: KRW bo'lsa kursga ko'paytiriladi, UZS bo'lsa tannarx sifatida
  const n = narxHisobla({
    krw:     karta.narx_valyuta === 'KRW' ? karta.narx_qiymat : undefined,
    tannarx: karta.narx_valyuta === 'UZS' ? karta.narx_qiymat : 0,
    gramm:   karta.ogirlik_g,
  }, qoida);

  if (!n.narx) return { holat: 'otkazildi', sabab: 'Narx o‘qilmadi', karta };

  // Uzum'da shu mahsulot bo'lsa — undan ozgina arzon turamiz.
  // Sozlama o'chiq bo'lsa yoki Uzum javob bermasa narx o'zgarmaydi.
  const uz = await uzumgaMoslab(n, karta.name, karta.brand);
  const sotuv = uz.narx;

  const kategoriyaId = await toifaniTop(karta);

  // Nom+brend takrorlanmasin: katalogda bitta mahsulot ikki marta turmasin
  const takror = await qator(
    `select id from products where lower(coalesce(brand,'')) = lower($1)
        and lower(name) = lower($2) limit 1`, [karta.brand || '', karta.name]);
  if (takror) return { holat: 'otkazildi', sabab: 'Katalogda bor', karta };

  const p = await qator(
    `insert into products (name, brand, category_id, step, price, cost_price, stock,
        volume, country, description, usage_text, ingredients, actives, concerns,
        skin_types, warnings, emoji, ogirlik, reyting, sharh_soni, ai_filled, is_active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'KR',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,true)
     returning *`,
    [karta.name, karta.brand || null, kategoriyaId, karta.step,
     sotuv, n.tannarx, OMBOR_SONI,
     karta.volume || null, karta.description || null, karta.usage_text || null,
     karta.ingredients || null, karta.actives, karta.concerns, karta.skin_types,
     karta.warnings || null, karta.emoji, karta.ogirlik_g,
     karta.sharh_soni > 0 ? karta.reyting || null : null,
     karta.sharh_soni]);

  await posterSaqla(base64, p.id);
  // Qidiruv "penka" deb ham topsin
  kalitlarniQosh(p.id).catch(() => {});
  keshniTashla('katalog');

  return { holat: 'qoshildi', mahsulot: p, narx: n, uzum: uz.ozgardi ? uz.uzum : null, karta };
}

async function ishlovchi(user, n) {
  const qoida = qoidaniTozala(await sozlama('narx_qoidasi', {}));

  while (n.royxat.length) {
    const fileId = n.royxat.shift();
    try {
      const r = await bittaSkrinshot(fileId, qoida);
      if (r.holat === 'qoshildi') n.qoshildi.push(r);
      else n.otkazildi.push({ sabab: r.sabab, nom: r.karta?.name || '—' });
    } catch (e) {
      n.xato += 1;
      console.error('SKRINSHOT XATOSI:', e.message?.slice(0, 160));
    }
    await holatniYangila(n);
  }

  n.ishlamoqda = false;
  await holatniYangila(n, true);
}

/** /tugat — natijani yakunlab, hisobotni yuboradi. */
export async function importniTugat(user, chatId) {
  const n = navbatlar.get(user.id);
  navbatlar.delete(user.id);
  if (!n || !n.jami) {
    await yubor(chatId, 'Hozircha rasm yuborilmadi.');
    return null;
  }

  const jamiNarx = n.qoshildi.reduce((s, r) => s + (r.mahsulot?.price || 0), 0);
  const uzumga = n.qoshildi.filter((r) => r.uzum).length;
  const royxat = n.qoshildi.slice(0, 25)
    .map((r, i) => `${i + 1}. <b>${r.mahsulot.name}</b> — ${r.mahsulot.price.toLocaleString('uz-UZ').replace(/,/g, ' ')} so‘m`)
    .join('\n');
  const otkazildi = n.otkazildi.slice(0, 10)
    .map((x) => `• ${x.nom} — ${x.sabab}`).join('\n');

  await yubor(chatId,
    `✅ <b>Tayyor</b>\n\n`
    + `Katalogga qo‘shildi: <b>${n.qoshildi.length}</b> ta\n`
    + `Har biriga ombor: <b>${OMBOR_SONI}</b> dona\n`
    + (jamiNarx ? `O‘rtacha narx: <b>${Math.round(jamiNarx / n.qoshildi.length).toLocaleString('uz-UZ').replace(/,/g, ' ')}</b> so‘m\n` : '')
    + (uzumga ? `Uzum narxiga moslandi: <b>${uzumga}</b> ta\n` : '')
    + (royxat ? `\n${royxat}\n` : '')
    + (n.qoshildi.length > 25 ? `\n…va yana ${n.qoshildi.length - 25} ta\n` : '')
    + (otkazildi ? `\n<b>O‘tkazildi:</b>\n${otkazildi}\n` : '')
    + `\nHavolalarni admin panelda qo‘yasiz: <b>Havolasiz mahsulotlar</b> bo‘limi.`);

  return n;
}

/** Havolasi hali qo'yilmagan mahsulotlar — panel shu ro'yxatni ko'rsatadi. */
export const havolasizlar = (chegara = 200) => qatorlar(
  `select p.id, p.name, p.brand, p.price, p.stock, p.created_at
     from products p
    where p.is_active and coalesce(p.manba_url, '') = ''
    order by p.created_at desc, p.id desc
    limit $1`, [Math.max(1, Math.min(500, chegara))]);
