// Admin agentining VOSITALARI.
//
// Agent bazaga to'g'ridan-to'g'ri SQL yozmaydi. Buning ikkita sababi
// bor va ikkalasi ham jiddiy:
//   1. Model o'ylab topgan SQL jonli do'konni buzishi mumkin —
//      «o'chirish» so'zi noto'g'ri tushunilsa butun katalog ketadi.
//   2. Erkin SQL ni tekshirib bo'lmaydi: nima qilishini oldindan
//      aytib berolmaysiz, ya'ni adminga «shuni qilaman» deb aniq
//      ko'rsatib ham bo'lmaydi.
//
// Shuning uchun VOSITA RO'YXATI qat'iy. Har vosita:
//   • nomi va tavsifi — model shundan tanlaydi;
//   • parametrlari — boshqa hech nima qabul qilinmaydi;
//   • `oqish` bayrog'i — o'qish erkin bajariladi, YOZISH esa admin
//     tasdiqlamaguncha bajarilmaydi.
import { qator, qatorlar, qiymat, sorov, sozlama } from '../db.js';
import { HOLATLAR } from '../lib/bosqichlar.js';
import { palitra, rangTozala, kontrast, MAVZU_STANDART } from '../lib/mavzu.js';
import { TAVSIF as SHABLON_TAVSIF } from '../bot/shablonlar-standart.js';
import { eksportHajmi, BOLIMLAR as EKSPORT_BOLIMLAR } from './eksport.js';

const son = (v, zaxira = 0) => (Number.isFinite(Number(v)) ? Number(v) : zaxira);
const matn = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const chegara = (v, standart = 50, maks = 300) =>
  Math.min(maks, Math.max(1, son(v, standart)));

/** Nomni taqqoslash uchun soddalashtiradi. */
export const nomKaliti = (nom, brend = '') => `${brend} ${nom}`
  .toLowerCase()
  .replace(/[‘’'`´ʻ]/g, '')
  .replace(/[^a-z0-9а-яё]+/gi, ' ')
  .trim();

// ─────────────────────────── O'QISH ───────────────────────────

async function mahsulotlar(a) {
  const shart = ['1=1'];
  const p = [];
  if (a.qidiruv) {
    p.push(`%${matn(a.qidiruv, 60)}%`);
    shart.push(`(p.name ilike $${p.length} or p.nom_uz ilike $${p.length}
                or p.brand ilike $${p.length})`);
  }
  if (a.brend) { p.push(matn(a.brend, 60)); shart.push(`p.brand ilike $${p.length}`); }
  if (a.faqat_tugagan) shart.push('coalesce(p.stock,0) <= 0');
  if (a.faqat_yopiq)   shart.push('p.is_active = false');
  if (a.faqat_faol)    shart.push('p.is_active = true');
  p.push(chegara(a.chegara, 50));

  const r = await qatorlar(
    `select p.id, p.name, p.nom_uz, p.brand, p.price, p.cost_price, p.stock,
            p.is_active, p.step, p.created_at
       from products p where ${shart.join(' and ')}
      order by p.id limit $${p.length}`, p);
  const jami = await qiymat(`select count(*)::int from products p where ${shart.join(' and ')}`,
    p.slice(0, -1));
  return { jami, korsatilgan: r.length, mahsulotlar: r };
}

/**
 * Bir xil mahsulotlarni topadi.
 *
 * «Bir xil» — nomi va brendi soddalashtirilganda ustma-ust tushadigan
 * yozuvlar. Aynan shu ommaviy import paytida paydo bo'ladi: bitta
 * mahsulot ikki marta skrinshotdan o'qilsa ikkita yozuv qoladi.
 *
 * Qaysi biri QOLISHI ham shu yerda hal qilinadi va bu qaror MODELGA
 * qoldirilmaydi: eng ko'p sotilgani, keyin ombori ko'pi, keyin eng
 * eskisi qoladi. Sotuv tarixi bog'langan yozuvni o'chirish hisobotni
 * buzadi.
 */
async function takrorlar(a) {
  const r = await qatorlar(
    `select p.id, p.name, p.nom_uz, p.brand, p.price, p.stock, p.is_active,
            p.created_at, coalesce(p.sold_count, 0) as sotilgan,
            -- Buyurtma tarkibi alohida jadval emas, orders.items jsonb'da
            (select count(*)::int from orders o
              cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) e
              where (e->>'product_id')::bigint = p.id) as buyurtmada
       from products p order by p.id`);

  const guruh = new Map();
  for (const p of r) {
    const k = nomKaliti(p.name, p.brand);
    if (!k) continue;
    if (!guruh.has(k)) guruh.set(k, []);
    guruh.get(k).push(p);
  }

  const natija = [];
  for (const [kalit, royxat] of guruh) {
    if (royxat.length < 2) continue;
    // Qoladigani: sotuvi ko'p → ombori ko'p → eng eski
    const tartib = [...royxat].sort((x, y) =>
      (y.buyurtmada - x.buyurtmada)
      || (y.sotilgan - x.sotilgan)
      || ((y.stock || 0) - (x.stock || 0))
      || (new Date(x.created_at) - new Date(y.created_at)));
    natija.push({
      kalit,
      qoladi: tartib[0],
      ortiqcha: tartib.slice(1),
    });
  }
  natija.sort((a2, b2) => b2.ortiqcha.length - a2.ortiqcha.length);
  return {
    guruh_soni: natija.length,
    ortiqcha_jami: natija.reduce((s, g) => s + g.ortiqcha.length, 0),
    guruhlar: natija.slice(0, chegara(a.chegara, 30)),
  };
}

async function buyurtmalar(a) {
  const shart = ['1=1'];
  const p = [];
  if (a.holat && HOLATLAR.includes(a.holat)) { p.push(a.holat); shart.push(`o.status = $${p.length}`); }
  if (a.kun) { p.push(son(a.kun, 30)); shart.push(`o.created_at >= now() - ($${p.length} || ' days')::interval`); }
  if (a.raqam) { p.push(`%${matn(a.raqam, 40)}%`); shart.push(`o.order_no ilike $${p.length}`); }
  if (a.telefon) { p.push(`%${matn(a.telefon, 30)}%`); shart.push(`o.customer_phone ilike $${p.length}`); }
  p.push(chegara(a.chegara, 30, 200));

  const r = await qatorlar(
    `select o.id, o.order_no, o.status, o.payment_status, o.total, o.created_at,
            o.customer_name, o.customer_phone, o.viloyat, o.tuman,
            jsonb_array_length(coalesce(o.items,'[]'::jsonb)) as mahsulot_soni
       from orders o where ${shart.join(' and ')}
      order by o.created_at desc limit $${p.length}`, p);
  const j = await qator(
    `select count(*)::int as soni, coalesce(sum(o.total),0)::bigint as summa
       from orders o where ${shart.join(' and ')}`, p.slice(0, -1));
  return { jami: j.soni, summa: Number(j.summa), korsatilgan: r.length, buyurtmalar: r };
}

async function buyurtmaTafsiloti(a) {
  const o = await qator(
    `select o.*, u.telegram_id, u.username from orders o
       join users u on u.id = o.user_id
      where o.id = $1 or o.order_no = $2 limit 1`,
    [son(a.id, -1), matn(a.raqam, 40)]);
  if (!o) return { topilmadi: true };
  return {
    buyurtma: {
      id: o.id, raqam: o.order_no, holat: o.status, tolov: o.payment_status,
      mijoz: o.customer_name, telefon: o.customer_phone,
      manzil: [o.viloyat, o.tuman, o.customer_address].filter(Boolean).join(', '),
      yetkazish: o.yetkazish_turi, pochta_izoh: o.pochta_izoh,
      jami: o.total, chegirma: o.discount, yetkazish_narxi: o.delivery_fee,
      tannarx: o.cost_total, yaratilgan: o.created_at,
      mahsulotlar: o.items || [],
    },
  };
}

async function statistika(a) {
  const kun = son(a.kun, 30);
  const u = await qator(
    `select count(*)::int as buyurtma,
            coalesce(sum(total),0)::bigint as daromad,
            coalesce(sum(total - delivery_fee + discount - cost_total),0)::bigint as foyda,
            count(*) filter (where status = 'bekor')::int as bekor
       from orders where created_at >= now() - ($1 || ' days')::interval`, [kun]);
  const m = await qatorlar(
    `select coalesce(e->>'name', '—') as name,
            coalesce(e->>'brand', '') as brand,
            sum((e->>'qty')::int)::int as dona,
            sum((e->>'qty')::int * (e->>'price')::bigint)::bigint as summa
       from orders o
       cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) e
      where o.created_at >= now() - ($1 || ' days')::interval and o.status <> 'bekor'
      group by 1, 2 order by dona desc limit 10`, [kun]);
  const mijoz = await qator(
    `select count(*)::int as jami,
            count(*) filter (where created_at >= now() - ($1 || ' days')::interval)::int as yangi
       from users`, [kun]);
  return { kun, umumiy: u, eng_kop_sotilgan: m, mijozlar: mijoz };
}

async function mijozlar(a) {
  const shart = ['1=1'];
  const p = [];
  if (a.qidiruv) {
    p.push(`%${matn(a.qidiruv, 60)}%`);
    shart.push(`(u.full_name ilike $${p.length} or u.phone ilike $${p.length}
                 or u.username ilike $${p.length})`);
  }
  if (a.faqat_xaridorlar) shart.push(`exists (select 1 from orders o
    where o.user_id = u.id and o.status <> 'bekor')`);
  p.push(chegara(a.chegara, 30, 200));
  const r = await qatorlar(
    `select u.id, u.full_name, u.phone, u.username, u.viloyat, u.created_at,
            (select count(*)::int from orders o where o.user_id = u.id and o.status <> 'bekor') as buyurtma
       from users u where ${shart.join(' and ')}
      order by u.created_at desc limit $${p.length}`, p);
  const jami = await qiymat(`select count(*)::int from users u where ${shart.join(' and ')}`,
    p.slice(0, -1));
  return { jami, korsatilgan: r.length, mijozlar: r };
}

// ─────────────────────────── YOZISH ───────────────────────────
// Bularning hech biri tasdiqsiz bajarilmaydi.

async function mahsulotYop(a) {
  const idlar = (a.idlar || []).map((x) => son(x, 0)).filter((x) => x > 0).slice(0, 200);
  if (!idlar.length) return { ozgardi: 0, xabar: 'ID berilmadi' };
  const r = await qatorlar(
    `update products set is_active = false, updated_at = now()
      where id = any($1) returning id, name`, [idlar]);
  return { ozgardi: r.length, mahsulotlar: r };
}

async function mahsulotOchir(a) {
  const idlar = (a.idlar || []).map((x) => son(x, 0)).filter((x) => x > 0).slice(0, 200);
  if (!idlar.length) return { ochirildi: 0, xabar: 'ID berilmadi' };
  const natija = [];
  for (const id of idlar) {
    try {
      const r = await qiymat('select mahsulotni_ochir($1)', [id]);
      natija.push({ id, ok: true, ...r });
    } catch (e) {
      natija.push({ id, ok: false, xato: String(e.message).slice(0, 120) });
    }
  }
  return { ochirildi: natija.filter((x) => x.ok).length, natija };
}

async function narxOzgartir(a) {
  const id = son(a.id, 0);
  const narx = son(a.narx, -1);
  if (!id || narx < 0) return { ozgardi: 0, xabar: 'ID yoki narx noto‘g‘ri' };
  const r = await qator(
    `update products set price = $2, updated_at = now()
      where id = $1 returning id, name, price`, [id, Math.round(narx)]);
  return r ? { ozgardi: 1, mahsulot: r } : { ozgardi: 0, xabar: 'Topilmadi' };
}

async function omborOzgartir(a) {
  const id = son(a.id, 0);
  const soni = son(a.soni, -1);
  if (!id || soni < 0) return { ozgardi: 0, xabar: 'ID yoki son noto‘g‘ri' };
  const r = await qator(
    `update products set stock = $2, updated_at = now()
      where id = $1 returning id, name, stock`, [id, Math.round(soni)]);
  return r ? { ozgardi: 1, mahsulot: r } : { ozgardi: 0, xabar: 'Topilmadi' };
}

// ── Sozlamalar ──
// Agent sozlamalarni O'QIY oladi va o'zgartirishni TAKLIF qila oladi.
// Hamma kalit emas: ro'yxat qat'iy, chunki noto'g'ri kalitga yozish
// ilovani jimgina buzadi (masalan narx qoidasi yoki mavzu).
const OZGARTIRSA_BOLADI = new Set([
  'limit_bepul', 'limit_mijoz', 'limit_yoqilgan', 'limit_maslahat_rasm',
  'minimal_buyurtma', 'mahsulot_chegirma', 'free_delivery_from',
  'dona_chegirma', 'dona_chegirma_dan',
  'menejer_telefon', 'menejer_ish_vaqti',
  'karta_raqam', 'karta_egasi',
  'skrinshot_poster', 'brend_nomi',
  'kanal_post_soati', 'kanal_kunlik_post',
]);

async function sozlamalar(a) {
  const q = matn(a.qidiruv, 60).toLowerCase();
  const r = await qatorlar(`select key, value, updated_at from settings order by key`);
  const royxat = r
    .filter((x) => !q || x.key.toLowerCase().includes(q))
    .map((x) => ({
      kalit: x.key,
      qiymat: typeof x.value === 'string' ? x.value.slice(0, 300) : x.value,
      ozgartirsa_boladi: OZGARTIRSA_BOLADI.has(x.key),
      // Xabar shablonlari uchun tushuntirish bor — agent nimaligini bilsin
      izoh: SHABLON_TAVSIF[x.key]?.nom || '',
    }));
  return { jami: royxat.length, sozlamalar: royxat.slice(0, chegara(a.chegara, 60, 200)) };
}

async function sozlamaOzgartir(a) {
  const kalit = matn(a.kalit, 60);
  if (!OZGARTIRSA_BOLADI.has(kalit)) {
    return { ozgardi: 0, xabar: `«${kalit}» ni bu yerdan o‘zgartirib bo‘lmaydi.` };
  }
  // Qiymat turini saqlaymiz: raqam raqam bo'lib, matn matn bo'lib qolsin
  let q = a.qiymat;
  if (typeof q === 'string' && /^-?\d+$/.test(q.trim())) q = Number(q.trim());
  if (q === 'true') q = true;
  if (q === 'false') q = false;
  await sorov(
    `insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [kalit, JSON.stringify(q)]);
  return { ozgardi: 1, kalit, qiymat: q };
}

// ── Mavzu: hozirgi ranglar va ULARNING O'QILISHI ──
// Agent «yaxshi ko'rinadi» deb taxmin qilmasin: kontrast HISOBLANADI
// (WCAG nisbiy yorqinligi) va raqam bilan beriladi.
async function mavzuHolati() {
  const [xom, erkak] = await Promise.all([sozlama('mavzu', {}), sozlama('mavzu_erkak', null)]);
  const baho = (m) => {
    const p = palitra(m && typeof m === 'object' ? m : {});
    const kSarlavha = kontrast(p.asosiy, p.asosiyMatn);
    const kFon = kontrast(p.fon, p.matn);
    return {
      ranglar: { asosiy: p.asosiy, fon: p.fon, urgu: p.urgu },
      sarlavha_kontrasti: Number(kSarlavha.toFixed(2)),
      fon_kontrasti: Number(kFon.toFixed(2)),
      // WCAG AA: oddiy matn uchun 4.5, yirik matn uchun 3
      sarlavha_okiladi: kSarlavha >= 4.5,
      fon_okiladi: kFon >= 4.5,
    };
  };
  return {
    umumiy: baho(xom),
    erkaklar: erkak && typeof erkak === 'object' ? baho(erkak) : null,
    izoh: 'Kontrast 4.5 dan past bo‘lsa matn qiyin o‘qiladi (WCAG AA).',
  };
}

async function mavzuOzgartir(a) {
  const kalit = a.kim === 'erkak' ? 'mavzu_erkak' : 'mavzu';
  const toza = {
    asosiy: rangTozala(a.asosiy, MAVZU_STANDART.asosiy),
    fon:    rangTozala(a.fon,    MAVZU_STANDART.fon),
    urgu:   rangTozala(a.urgu,   a.asosiy || MAVZU_STANDART.urgu),
  };
  await sorov(
    `insert into settings (key, value, updated_at) values ($2, $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(toza), kalit]);
  const p = palitra(toza);
  return { ozgardi: 1, kim: kalit, ranglar: toza,
    sarlavha_kontrasti: Number(kontrast(p.asosiy, p.asosiyMatn).toFixed(2)) };
}

// ── Mijozlarda qaysi muammo ko'p uchraydi ──
// Tahlil natijasi `analyses.problems` da jsonb massiv bo'lib turadi.
// Bu do'kon uchun eng qimmatli raqam: nimani ko'proq olib kelish kerak.
async function muammoStatistikasi(a) {
  const kun = son(a.kun, 90);
  const r = await qatorlar(
    `select coalesce(e->>'nom', e->>'kalit', '—') as muammo,
            count(*)::int as odam,
            round(avg((e->>'foiz')::numeric))::int as ortacha_foiz
       from analyses an
       cross join lateral jsonb_array_elements(coalesce(an.problems,'[]'::jsonb)) e
      where an.created_at >= now() - ($1 || ' days')::interval
      group by 1 order by odam desc limit 20`, [kun]);

  const jami = await qator(
    `select count(*)::int as tahlil,
            count(distinct user_id)::int as odam,
            round(avg(score))::int as ortacha_ball
       from analyses where created_at >= now() - ($1 || ' days')::interval`, [kun]);

  const teri = await qatorlar(
    `select coalesce(skin_type,'—') as turi, count(*)::int as soni
       from analyses where created_at >= now() - ($1 || ' days')::interval
      group by 1 order by soni desc`, [kun]);

  const jins = await qatorlar(
    `select coalesce(jins,'nomalum') as jins, count(*)::int as soni
       from analyses where created_at >= now() - ($1 || ' days')::interval
      group by 1 order by soni desc`, [kun]);

  return { kun, umumiy: jami, eng_kop_muammolar: r, teri_turlari: teri, jins };
}

// ── Mahsulotni tahrirlash ──
const TAHRIR_MAYDON = {
  name: 'text', nom_uz: 'text', brand: 'text', description: 'text',
  usage_text: 'text', warnings: 'text', volume: 'text', emoji: 'text',
  manba_url: 'text', step: 'text',
  price: 'int', cost_price: 'int', old_price: 'int', stock: 'int',
  is_active: 'bool',
};

async function mahsulotTahrir(a) {
  const id = son(a.id, 0);
  if (!id) return { ozgardi: 0, xabar: 'ID berilmadi' };
  const qoy = [];
  const p = [id];
  for (const [maydon, tur] of Object.entries(TAHRIR_MAYDON)) {
    if (a[maydon] === undefined) continue;
    let v = a[maydon];
    if (tur === 'int')  v = Math.max(0, Math.round(son(v, 0)));
    if (tur === 'bool') v = v === true || v === 'true';
    if (tur === 'text') v = matn(v, 2000) || null;
    p.push(v);
    qoy.push(`${maydon} = $${p.length}`);
  }
  if (!qoy.length) return { ozgardi: 0, xabar: 'O‘zgartiriladigan maydon berilmadi' };
  const r = await qator(
    `update products set ${qoy.join(', ')}, updated_at = now()
      where id = $1 returning id, name, nom_uz, brand, price, stock, is_active`, p);
  return r ? { ozgardi: 1, mahsulot: r } : { ozgardi: 0, xabar: 'Topilmadi' };
}

// ─────────────────────────── RO'YXAT ───────────────────────────

export const VOSITALAR = {
  mahsulotlar: {
    oqish: true, ishla: mahsulotlar,
    tavsif: 'Do‘kondagi mahsulotlar ro‘yxati. Nomlarni so‘rashsa shuni ishlat.',
    parametrlar: 'qidiruv (nom/brend bo‘yicha), brend, faqat_tugagan, faqat_yopiq, faqat_faol, chegara',
  },
  takrorlar: {
    oqish: true, ishla: takrorlar,
    tavsif: 'BIR XIL (takrorlangan) mahsulotlarni topadi va qaysi biri qolishi '
          + 'kerakligini aytadi. «Bir xil tovarlarni tozala» degan topshiriq shundan boshlanadi.',
    parametrlar: 'chegara',
  },
  buyurtmalar: {
    oqish: true, ishla: buyurtmalar,
    tavsif: 'Buyurtmalar ro‘yxati va umumiy summasi.',
    parametrlar: 'holat, kun (oxirgi necha kun), raqam, telefon, chegara',
  },
  buyurtma: {
    oqish: true, ishla: buyurtmaTafsiloti,
    tavsif: 'Bitta buyurtmaning to‘liq ma’lumoti: mijoz, manzil, mahsulotlar, summa.',
    parametrlar: 'id yoki raqam',
  },
  statistika: {
    oqish: true, ishla: statistika,
    tavsif: 'Sotuv, daromad, foyda, eng ko‘p sotilgan mahsulotlar, yangi mijozlar.',
    parametrlar: 'kun',
  },
  mijozlar: {
    oqish: true, ishla: mijozlar,
    tavsif: 'Mijozlar ro‘yxati.',
    parametrlar: 'qidiruv, faqat_xaridorlar, chegara',
  },
  muammo_statistikasi: {
    oqish: true, ishla: muammoStatistikasi,
    tavsif: 'Mijozlarda QAYSI MUAMMO ko‘p uchraydi: teri muammolari reytingi, '
          + 'teri turlari, jins taqsimoti, o‘rtacha ball. «Nimani olib kelaylik» '
          + 'degan savolga javob shu yerda.',
    parametrlar: 'kun',
  },
  sozlamalar: {
    oqish: true, ishla: sozlamalar,
    tavsif: 'Ilova sozlamalari va ularning hozirgi qiymati.',
    parametrlar: 'qidiruv, chegara',
  },
  eksport: {
    oqish: true,
    ishla: async () => ({
      hajm: await eksportHajmi(),
      bolimlar: Object.keys(EKSPORT_BOLIMLAR),
      // Agent faylni o'zi yasay olmaydi — havolani beradi, admin bosadi
      havola: '/api/admin/eksport',
      izoh: 'Admin panel → Tizim holati → «Ma’lumotni yuklab olish» tugmasi. '
          + 'Yoki bo‘limni tanlab CSV: /api/admin/eksport?tur=csv&bolimlar=<bolim>',
    }),
    tavsif: 'Ma’lumotni faylga saqlash: nechta yozuv borligi va qanday '
          + 'yuklab olish. JSON — hammasi, CSV — bitta bo‘lim (Excel uchun).',
    parametrlar: 'yo‘q',
  },
  mavzu: {
    oqish: true, ishla: mavzuHolati,
    tavsif: 'Ilova ranglari va ularning KONTRASTI (o‘qiladimi). '
          + 'Rang haqida maslahat berishdan oldin shuni ko‘r — taxmin qilma.',
    parametrlar: 'yo‘q',
  },

  mahsulot_yop: {
    oqish: false, ishla: mahsulotYop,
    tavsif: 'Mahsulotni SOTUVDAN OLADI (o‘chirmaydi). Takrorni tozalashda '
          + 'eng xavfsiz yo‘l — yozuv va sotuv tarixi joyida qoladi.',
    parametrlar: 'idlar (ro‘yxat)',
  },
  mahsulot_ochir: {
    oqish: false, ishla: mahsulotOchir,
    tavsif: 'Mahsulotni BUTUNLAY o‘chiradi. Qaytarib bo‘lmaydi. '
          + 'Sotuv tarixi bor mahsulotga ishlatma — «mahsulot_yop» ni tanla.',
    parametrlar: 'idlar (ro‘yxat)',
  },
  narx_ozgartir: {
    oqish: false, ishla: narxOzgartir,
    tavsif: 'Bitta mahsulot narxini o‘zgartiradi.',
    parametrlar: 'id, narx',
  },
  ombor_ozgartir: {
    oqish: false, ishla: omborOzgartir,
    tavsif: 'Bitta mahsulot ombor sonini o‘zgartiradi.',
    parametrlar: 'id, soni',
  },
  mahsulot_tahrir: {
    oqish: false, ishla: mahsulotTahrir,
    tavsif: 'Mahsulot maydonlarini tahrirlaydi: nomi, o‘zbekcha nomi, brendi, '
          + 'tavsifi, ishlatish tartibi, hajmi, havolasi, narxi, ombori.',
    parametrlar: 'id + o‘zgartiriladigan maydonlar (name, nom_uz, brand, '
               + 'description, usage_text, volume, manba_url, price, stock…)',
  },
  sozlama_ozgartir: {
    oqish: false, ishla: sozlamaOzgartir,
    tavsif: 'Sozlamani o‘zgartiradi (limitlar, chegirmalar, menejer telefoni, '
          + 'karta raqami kabi). Avval «sozlamalar» bilan hozirgisini ko‘r.',
    parametrlar: 'kalit, qiymat',
  },
  mavzu_ozgartir: {
    oqish: false, ishla: mavzuOzgartir,
    tavsif: 'Ilova ranglarini o‘zgartiradi. Avval «mavzu» bilan kontrastni '
          + 'tekshir — o‘qilmaydigan rang taklif qilma.',
    parametrlar: 'asosiy, fon, urgu, kim (umumiy | erkak)',
  },
};

/** Model uchun vositalar ro'yxati matni. */
export const vositalarMatni = () => Object.entries(VOSITALAR)
  .map(([nom, v]) => `${nom} [${v.oqish ? 'o‘qish' : 'YOZISH'}] — ${v.tavsif}\n    parametrlar: ${v.parametrlar}`)
  .join('\n');

/** Vositani bajaradi. Noma'lum vosita — xato, taxmin qilinmaydi. */
export async function vositaniBajar(nom, argumentlar = {}) {
  const v = VOSITALAR[nom];
  if (!v) throw Object.assign(new Error(`Noma'lum vosita: ${nom}`), { turkum: 'vosita' });
  return v.ishla(argumentlar || {});
}

export const yozishmi = (nom) => Boolean(VOSITALAR[nom]) && !VOSITALAR[nom].oqish;
