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
import { sqlOqi, sqlYoz, sxema } from './admin-sql.js';
import { kartochkaSozlamasi, kartochkaniQosh, BLOKLAR, BLOK_NOMI,
         KARTOCHKA_STANDART } from '../lib/kartochka.js';

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
//
// Ilgari o'zgartirsa bo'ladigan kalitlar ro'yxati QAT'IY edi va
// do'kon egasi ro'yxatda yo'q narsani so'raganda «bu yerdan
// o'zgartirib bo'lmaydi» degan javob olardi. Endi qoida boshqacha:
//
//   • kalit BAZADA BOR bo'lishi kerak — yangi kalit yaratib
//     bo'lmaydi (bitta xato harf jimgina o'lik sozlama qoldiradi);
//   • yangi qiymat TURI eskisiga mos bo'lishi kerak — raqam raqam,
//     matn matn bo'lib qoladi;
//   • tuzilmali qiymat (mavzu ranglari, narx qoidasi) bu vosita
//     orqali emas, o'z vositasi orqali o'zgaradi.
//
// Va har qanday holatda admin TASDIQLAYDI.

// Qiymati tuzilma bo'lgan sozlamalar — o'z vositasi bor
const OZ_VOSITASI_BOR = { mavzu: 'mavzu_ozgartir', mavzu_erkak: 'mavzu_ozgartir' };

async function sozlamalar(a) {
  const q = matn(a.qidiruv, 60).toLowerCase();
  const r = await qatorlar(`select key, value, updated_at from settings order by key`);
  const royxat = r
    .filter((x) => !q || x.key.toLowerCase().includes(q))
    .map((x) => ({
      kalit: x.key,
      qiymat: typeof x.value === 'string' ? x.value.slice(0, 300) : x.value,
      ozgartirsa_boladi: !OZ_VOSITASI_BOR[x.key]
                      && (x.value === null || typeof x.value !== 'object'),
      // Xabar shablonlari uchun tushuntirish bor — agent nimaligini bilsin
      izoh: SHABLON_TAVSIF[x.key]?.nom || '',
    }));
  return { jami: royxat.length, sozlamalar: royxat.slice(0, chegara(a.chegara, 60, 200)) };
}

async function sozlamaOzgartir(a) {
  const kalit = matn(a.kalit, 60);
  if (OZ_VOSITASI_BOR[kalit]) {
    return { ozgardi: 0,
      xabar: `«${kalit}» tuzilmali sozlama — uni «${OZ_VOSITASI_BOR[kalit]}» bilan o‘zgartir.` };
  }
  const bor = await qator(`select value from settings where key = $1`, [kalit]);
  if (!bor) {
    return { ozgardi: 0,
      xabar: `«${kalit}» degan sozlama yo‘q. «sozlamalar» vositasi bilan `
           + 'aniq nomini toping — yangi sozlama yaratib bo‘lmaydi.' };
  }
  const eskiQiymat = bor.value;

  // Qiymat turini saqlaymiz: raqam raqam bo'lib, matn matn bo'lib qolsin
  let q = a.qiymat;
  if (typeof q === 'string' && /^-?\d+(\.\d+)?$/.test(q.trim())) q = Number(q.trim());
  if (q === 'true') q = true;
  if (q === 'false') q = false;

  if (eskiQiymat !== null && typeof eskiQiymat === 'object') {
    return { ozgardi: 0,
      xabar: `«${kalit}» tuzilmali (obyekt) sozlama — uni bu vosita orqali `
           + 'o‘zgartirib bo‘lmaydi.' };
  }
  if (eskiQiymat !== null && typeof q !== typeof eskiQiymat) {
    return { ozgardi: 0,
      xabar: `«${kalit}» ${typeof eskiQiymat === 'number' ? 'raqam' : 'matn'} bo‘lishi kerak, `
           + `berilgani: ${typeof q === 'number' ? 'raqam' : typeof q}.` };
  }

  await sorov(
    `insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [kalit, JSON.stringify(q)]);
  return { ozgardi: 1, kalit, qiymat: q, oldingi: eskiQiymat };
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

// ── Bo'limlar (toifalar) ──
// Mahsulot toifasini o'zgartirish uchun avval qaysi bo'limlar borligini
// bilish kerak. Ilgari bu vosita yo'q edi va agent toifani
// o'zgartirolmasdi — lekin «o'zgartirdim» deb yozardi.
async function bolimlar() {
  const r = await qatorlar(
    `select c.id, c.slug, c.name as nom, c.emoji, c.ikon, c.sort as tartib,
            (select count(*)::int from products p where p.category_id = c.id) as mahsulot
       from categories c order by c.sort, c.id`);
  return { jami: r.length, bolimlar: r };
}

/** Nom yoki slug bo'yicha bo'limni topadi. */
async function bolimniTop(nomOrSlug) {
  const t = matn(nomOrSlug, 60);
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    return qator('select id, name as nom, slug from categories where id = $1', [Number(t)]);
  }
  return qator(
    `select id, name as nom, slug from categories
      where lower(slug) = lower($1) or lower(name) = lower($1)
         or name ilike '%' || $1 || '%'
      order by (lower(slug) = lower($1)) desc, (lower(name) = lower($1)) desc
      limit 1`, [t]);
}

async function toifaOzgartir(a) {
  const b = await bolimniTop(a.bolim ?? a.toifa);
  if (!b) {
    const bor = await qatorlar('select name as nom, slug from categories order by sort, id');
    return { ozgardi: 0,
      xabar: `«${matn(a.bolim ?? a.toifa, 40)}» degan bo‘lim yo‘q.`,
      mavjud_bolimlar: bor.map((x) => x.nom) };
  }

  // Ikki xil ishlatish mumkin:
  //   idlar        — aniq mahsulotlar
  //   manba_bolim  — BUTUN bo'limdagi hamma mahsulot
  // Ikkinchisi bo'lmasa agent bo'lim birlashtira olmasdi: u bo'lim
  // nomini biladi, lekin ichidagi yuzta mahsulotning id sini emas.
  if (a.manba_bolim) {
    const m = await bolimniTop(a.manba_bolim);
    if (!m) return { ozgardi: 0, xabar: `«${matn(a.manba_bolim, 40)}» degan bo‘lim yo‘q.` };
    const r = await qatorlar(
      `update products set category_id = $2, updated_at = now()
        where category_id = $1 returning id, name`, [m.id, b.id]);
    return { ozgardi: r.length, manba: m.nom, bolim: b.nom };
  }

  const idlar = (a.idlar || []).map((x) => son(x, 0)).filter((x) => x > 0).slice(0, 500);
  if (!idlar.length) {
    return { ozgardi: 0,
      xabar: 'Mahsulot ID lari ham, manba bo‘lim ham berilmadi. '
           + 'Butun bo‘limni ko‘chirish uchun `manba_bolim` bering.' };
  }
  const r = await qatorlar(
    `update products set category_id = $2, updated_at = now()
      where id = any($1) returning id, name`, [idlar, b.id]);
  return { ozgardi: r.length, bolim: b.nom, mahsulotlar: r };
}

/**
 * Bir nechta bo'limni BITTASIGA jamlaydi.
 *
 * Aynan shu ish so'ralgan edi: «bir xil turdagi tovarlarni bitta
 * bo'limda jamla, keraksiz bo'limlarni o'chir». Ilgari buni bajarib
 * bo'lmasdi — agent bo'lim nomlarini bilardi, lekin ichidagi
 * mahsulotlarning id sini bilmasdi va `toifa_ozgartir` id talab
 * qilardi. Natijada «0 ta yozuv o'zgardi» bo'lardi.
 */
async function bolimBirlashtir(a) {
  const maqsad = await bolimniTop(a.maqsad ?? a.bolim);
  if (!maqsad) {
    const bor = await qatorlar('select name as nom from categories order by sort, id');
    return { ozgardi: 0, xabar: `«${matn(a.maqsad ?? a.bolim, 40)}» degan bo‘lim yo‘q.`,
      mavjud_bolimlar: bor.map((x) => x.nom) };
  }

  const manbalar = Array.isArray(a.manba) ? a.manba : [a.manba].filter(Boolean);
  if (!manbalar.length) return { ozgardi: 0, xabar: 'Qaysi bo‘limlar jamlanishi berilmadi.' };

  let kochdi = 0;
  const kochirilgan = [];
  const topilmadi = [];
  const ochirilgan = [];

  for (const nom of manbalar.slice(0, 30)) {
    const m = await bolimniTop(nom);
    if (!m) { topilmadi.push(String(nom)); continue; }
    if (m.id === maqsad.id) continue;             // o'zini o'ziga ko'chirmaymiz

    const r = await qatorlar(
      `update products set category_id = $2, updated_at = now()
        where category_id = $1 returning id`, [m.id, maqsad.id]);
    kochdi += r.length;
    kochirilgan.push({ bolim: m.nom, mahsulot: r.length });

    // Bo'sh qolgan bo'limni o'chiramiz — «keraksiz bo'limlarni
    // o'chirib yubor» degan ishning ikkinchi yarmi
    if (a.boshlarni_ochir !== false) {
      await sorov('delete from categories where id = $1', [m.id]);
      ochirilgan.push(m.nom);
    }
  }

  return {
    ozgardi: kochdi,
    maqsad: maqsad.nom,
    kochirilgan,
    ochirilgan_bolimlar: ochirilgan,
    topilmadi,
    xabar: kochdi ? '' : 'Hech qanday mahsulot ko‘chmadi — bo‘limlar bo‘sh bo‘lgan bo‘lishi mumkin.',
  };
}

/** Bo'limni o'chiradi. Ichida mahsulot bo'lsa RAD ETADI. */
async function bolimOchir(a) {
  const royxat = Array.isArray(a.bolimlar) ? a.bolimlar : [a.bolimlar ?? a.bolim].filter(Boolean);
  if (!royxat.length) return { ozgardi: 0, xabar: 'Qaysi bo‘lim o‘chirilishi berilmadi.' };

  const ochirildi = [];
  const tegilmadi = [];
  for (const nom of royxat.slice(0, 30)) {
    const b = await bolimniTop(nom);
    if (!b) { tegilmadi.push({ nom: String(nom), sabab: 'topilmadi' }); continue; }
    const soni = await qiymat('select count(*)::int from products where category_id = $1', [b.id]);
    if (soni > 0) {
      // Mahsulotni bo'limsiz qoldirish — do'konni buzish demak.
      // Avval ko'chirilsin, keyin o'chirilsin.
      tegilmadi.push({ nom: b.nom, sabab: `ichida ${soni} ta mahsulot bor — avval ko‘chiring` });
      continue;
    }
    await sorov('delete from categories where id = $1', [b.id]);
    ochirildi.push(b.nom);
  }
  return { ozgardi: ochirildi.length, ochirildi, tegilmadi,
    xabar: ochirildi.length ? '' : 'Hech qanday bo‘lim o‘chirilmadi.' };
}

// ── Narxni OMMAVIY o'zgartirish ──
// `narx_ozgartir` faqat bitta id qabul qilardi. Admin esa odatda
// «Anua narxlarini 10% ko'tar» yoki «tonerlarni 45 000 qil» deydi —
// unda id yo'q. Agent id siz chaqirar va hech nima o'zgarmasdi:
// aynan shu «narxlar o'sha-o'sha turaveryapti» degan holat.
/**
 * Narx o'zgartirish filtri — QAYSI mahsulotlar degan savolga javob.
 * Alohida turadi, chunki bir joyda o'zgartirish uchun, ikkinchi
 * joyda «nechta mahsulotga tegadi» deb OLDINDAN sanash uchun kerak.
 */
async function narxFiltri(a) {
  const shart = ['1=1'];
  const p = [];
  if (Array.isArray(a.idlar) && a.idlar.length) {
    p.push(a.idlar.map((x) => son(x, 0)).filter((x) => x > 0));
    shart.push(`id = any($${p.length})`);
  }
  if (a.brend) { p.push(matn(a.brend, 60)); shart.push(`brand ilike $${p.length}`); }
  if (a.qidiruv) {
    p.push(`%${matn(a.qidiruv, 60)}%`);
    shart.push(`(name ilike $${p.length} or nom_uz ilike $${p.length})`);
  }
  if (a.bolim) {
    const b = await bolimniTop(a.bolim);
    if (!b) return { xato: `«${matn(a.bolim, 40)}» degan bo‘lim yo‘q.` };
    p.push(b.id); shart.push(`category_id = $${p.length}`);
  }
  // Hech qanday filtr berilmasa BUTUN katalog o'zgaradi — bu juda
  // xavfli, shuning uchun ataylab so'raladi
  if (shart.length === 1 && a.hammasi !== true) {
    return { xato: 'Filtr berilmadi. Butun katalogni o‘zgartirmoqchi bo‘lsangiz '
                 + 'hammasi=true qo‘ying.' };
  }
  return { shart, p };
}

async function narxlarniOzgartir(a) {
  const f = await narxFiltri(a);
  if (f.xato) return { ozgardi: 0, xabar: f.xato };
  const { shart, p } = f;

  // Uch xil o'zgartirish: aniq narx, foiz, summa qo'shish
  let ifoda;
  if (a.foiz !== undefined && a.foiz !== null && a.foiz !== '') {
    const foiz = son(a.foiz, 0);
    if (!foiz) return { ozgardi: 0, xabar: 'Foiz noto‘g‘ri.' };
    // 1000 so'mgacha yaxlitlanadi — narxlar chiroyli ko'rinsin
    ifoda = `greatest(0, round(price * ${1 + foiz / 100} / 1000) * 1000)::int`;
  } else if (a.qoshish !== undefined && a.qoshish !== null && a.qoshish !== '') {
    ifoda = `greatest(0, price + ${Math.round(son(a.qoshish, 0))})::int`;
  } else if (a.narx !== undefined && a.narx !== null && a.narx !== '') {
    const n = Math.round(son(a.narx, -1));
    if (n < 0) return { ozgardi: 0, xabar: 'Narx noto‘g‘ri.' };
    ifoda = `${n}::int`;
  } else {
    return { ozgardi: 0, xabar: 'Nima qilish kerakligi berilmadi: narx, foiz yoki qoshish.' };
  }

  const r = await qatorlar(
    `update products set price = ${ifoda}, updated_at = now()
      where ${shart.join(' and ')}
      returning id, name, price`, p);
  return { ozgardi: r.length, mahsulotlar: r.slice(0, 30) };
}

// ─────────────────── NATIJA KARTOCHKASI ───────────────────
// Mijoz qo'liga boradigan yagona hujjat — uni do'kon egasi oddiy so'z
// bilan o'zgartira olishi kerak: «erkaklar kartochkasida parhezni
// olib tashla», «mahsulotni 6 ta qil», «sarlavhani o'zgartir».

async function kartochka() {
  const xom = await sozlama('natija_kartochka', {});
  return {
    hozirgi: {
      umumiy: kartochkaSozlamasi(xom, ''),
      erkak:  kartochkaSozlamasi(xom, 'erkak'),
      ayol:   kartochkaSozlamasi(xom, 'ayol'),
    },
    bloklar: BLOK_NOMI,
    izoh: 'Bloklarni yoqish/o‘chirish, belgi va mahsulot sonini (0-8), '
        + 'sarlavhalarni va pastdagi ogohlantirishni o‘zgartirish mumkin. '
        + '«erkak» yoki «ayol» tanlansa faqat o‘sha jins uchun o‘zgaradi. '
        + 'ai_qoshimcha — tahlil AI siga beriladigan qo‘shimcha ko‘rsatma, '
        + 'u jinsga bo‘linmaydi (jins tahlildan KEYIN ma’lum bo‘ladi).',
  };
}

async function kartochkaOzgartir(a) {
  const kim = ['erkak', 'ayol'].includes(a.kim) ? a.kim : 'umumiy';
  const eski = await sozlama('natija_kartochka', {});

  // Model bloklarni ro'yxat ko'rinishida ham berishi mumkin:
  // {"korsatilsin":["parhez"],"yashirilsin":["xulosa"]}
  const bloklar = { ...(a.bloklar && typeof a.bloklar === 'object' ? a.bloklar : {}) };
  for (const b of (Array.isArray(a.korsatilsin) ? a.korsatilsin : [])) bloklar[b] = true;
  for (const b of (Array.isArray(a.yashirilsin) ? a.yashirilsin : [])) bloklar[b] = false;

  const notogri = Object.keys(bloklar).filter((k) => !BLOKLAR.includes(k));
  if (notogri.length) {
    return { ozgardi: 0,
      xabar: `Bunday blok yo‘q: ${notogri.join(', ')}. Mavjudlari: ${BLOKLAR.join(', ')}.` };
  }

  const { sozlama: yangi, ozgargan } = kartochkaniQosh(eski, { ...a, bloklar }, kim);
  if (!ozgargan.length) {
    return { ozgardi: 0,
      xabar: 'O‘zgartiriladigan narsa berilmadi. Mumkin: bloklar, belgi_soni, '
           + 'mahsulot_soni, sarlavha, izoh, teg, ai_qoshimcha.' };
  }

  await sorov(
    `insert into settings (key, value, updated_at) values ('natija_kartochka', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(yangi)]);
  return { ozgardi: ozgargan.length, kim, ozgargan,
           natija: kartochkaSozlamasi(yangi, kim === 'umumiy' ? '' : kim) };
}

// ─────────────────────────── GRAFIK ───────────────────────────

// Nega grafik kerak. «Qaysi bo'lim ko'p sotilyapti» degan savolga
// o'n qatorli ro'yxat bilan javob berish mumkin, lekin do'kon egasi
// nisbatni bir qarashda ko'rsa tezroq qaror qiladi. Model raqamni
// O'ZI o'ylab topa olmasligi uchun grafik faqat vosita qaytargan
// ma'lumotdan quriladi — chizish alohida qadam.
const GRAFIK_TURLARI = new Set(['ustun', 'chiziq', 'halqa']);

function grafik(a) {
  const tur = GRAFIK_TURLARI.has(a.tur) ? a.tur : 'ustun';
  const xom = Array.isArray(a.qatorlar) ? a.qatorlar : [];
  const qatorlar = xom
    .map((x) => ({
      nom: matn(x?.nom ?? x?.label ?? '', 40),
      qiymat: Number(x?.qiymat ?? x?.value),
    }))
    .filter((x) => x.nom && Number.isFinite(x.qiymat))
    .slice(0, 30);

  if (qatorlar.length < 2) {
    return { xato: 'Grafik uchun kamida 2 ta qator kerak: '
                 + '[{"nom":"Yanvar","qiymat":12}, …]' };
  }
  // Halqa — ulush grafigi. Manfiy ulush degani yo'q.
  if (tur === 'halqa' && qatorlar.some((x) => x.qiymat < 0)) {
    return { xato: 'Halqa grafikda manfiy qiymat bo‘lmaydi — «ustun» ni tanla.' };
  }

  return {
    grafik: {
      tur,
      sarlavha: matn(a.sarlavha, 70),
      birlik: matn(a.birlik, 16),
      qatorlar,
    },
    izoh: 'Grafik adminga ko‘rsatiladi. Javobda barcha raqamni qayta '
        + 'sanab o‘tirma — xulosani yoz.',
  };
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
  bolimlar: {
    oqish: true, ishla: bolimlar,
    tavsif: 'Do‘kon bo‘limlari (toifalari) va har birida nechta mahsulot borligi. '
          + 'Mahsulot toifasini o‘zgartirishdan OLDIN shuni ko‘r.',
    parametrlar: 'yo‘q',
  },
  sozlamalar: {
    oqish: true, ishla: sozlamalar,
    tavsif: 'Ilova sozlamalari va ularning hozirgi qiymati.',
    parametrlar: 'qidiruv, chegara',
  },
  sql: {
    oqish: true,
    ishla: (a) => sqlOqi(a.sql ?? a.sorov, { chegara: a.chegara }),
    tavsif: 'Bazaga to‘g‘ridan-to‘g‘ri SELECT so‘rovi. Tayyor vositalar '
          + 'yetmasa shuni ishlat — istalgan jadval, birlashma, hisob. '
          + 'Faqat o‘qish: baza «read only» rejimda ochiladi.',
    parametrlar: 'sql (SELECT yoki WITH), chegara',
  },
  sxema: {
    oqish: true,
    ishla: async () => ({ jadvallar: await sxema() }),
    tavsif: 'Bazadagi barcha jadvallar va ustunlar. SQL yozishdan OLDIN '
          + 'shuni ko‘r — ustun nomini taxmin qilma.',
    parametrlar: 'yo‘q',
  },
  grafik: {
    oqish: true, ishla: grafik,
    tavsif: 'Javobga GRAFIK qo‘shadi — admin raqamlarni ko‘rib turadi. '
          + 'Turlari: «ustun» (taqqoslash), «chiziq» (vaqt bo‘yicha o‘zgarish), '
          + '«halqa» (ulush). Qiymatlarni O‘YLAB TOPMA — avval o‘qish '
          + 'vositasi yoki «sql» bilan ol, keyin shu yerga ber.',
    parametrlar: 'tur (ustun|chiziq|halqa), sarlavha, birlik, '
               + 'qatorlar ([{nom, qiymat}])',
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
  kartochka: {
    oqish: true, ishla: kartochka,
    tavsif: 'Tahlil NATIJA KARTOCHKASI (mijozga boradigan rasm) sozlamasi: '
          + 'qaysi bo‘lim ko‘rinadi, nechta belgi va mahsulot chiqadi, '
          + 'sarlavhalar. Erkak va ayol uchun alohida. O‘zgartirishdan '
          + 'OLDIN shuni ko‘r.',
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
    tavsif: 'BITTA mahsulot narxini o‘zgartiradi (id kerak). Bir nechtasi '
          + 'uchun «narxlarni_ozgartir» ni ishlat.',
    parametrlar: 'id, narx',
  },
  narxlarni_ozgartir: {
    oqish: false, ishla: narxlarniOzgartir,
    tavsif: 'KO‘P mahsulot narxini birdan o‘zgartiradi: aniq narx qo‘yish, '
          + 'foizga ko‘tarish/tushirish yoki summa qo‘shish. Filtr: id lar, '
          + 'brend, bo‘lim yoki nom bo‘yicha qidiruv.',
    parametrlar: 'narx | foiz | qoshish, + idlar / brend / bolim / qidiruv / hammasi',
  },
  kartochka_ozgartir: {
    oqish: false, ishla: kartochkaOzgartir,
    tavsif: 'Natija kartochkasi ko‘rinishini o‘zgartiradi. Bloklarni '
          + 'yoqadi/o‘chiradi (korsatkichlar, xulosa, belgilar, parhez, '
          + 'mahsulotlar), belgi va mahsulot sonini (0-8), sarlavhalarni, '
          + 'pastdagi ogohlantirishni. «kim» ERKAK yoki AYOL bo‘lsa faqat '
          + 'o‘sha jins uchun. ai_qoshimcha — tahlil AI siga qo‘shimcha '
          + 'ko‘rsatma (jinsga bo‘linmaydi).',
    parametrlar: 'kim (umumiy|erkak|ayol), bloklar {nom: true/false} yoki '
               + 'korsatilsin/yashirilsin (ro‘yxat), belgi_soni, mahsulot_soni, '
               + 'sarlavha {belgilar, parhez, mahsulotlar}, izoh, teg, ai_qoshimcha',
  },
  sql_yoz: {
    oqish: false,
    ishla: (a) => sqlYoz(a.sql ?? a.sorov),
    tavsif: 'Bazaga yozadigan SQL: INSERT, UPDATE, DELETE. Tayyor vosita '
          + 'yetmagan holatlar uchun. Sxemani buzadigan buyruqlar '
          + 'taqiqlangan. Admin tasdiqlaydi.',
    parametrlar: 'sql',
  },
  ombor_ozgartir: {
    oqish: false, ishla: omborOzgartir,
    tavsif: 'Bitta mahsulot ombor sonini o‘zgartiradi.',
    parametrlar: 'id, soni',
  },
  toifa_ozgartir: {
    oqish: false, ishla: toifaOzgartir,
    tavsif: 'Mahsulot(lar)ning BO‘LIMINI o‘zgartiradi. Aniq mahsulotlar uchun '
          + '`idlar`, BUTUN bo‘limni ko‘chirish uchun `manba_bolim`.',
    parametrlar: 'bolim (qayerga), + idlar (ro‘yxat) YOKI manba_bolim (qayerdan)',
  },
  bolim_birlashtir: {
    oqish: false, ishla: bolimBirlashtir,
    tavsif: 'Bir nechta bo‘limni BITTASIGA jamlaydi: mahsulotlar ko‘chadi va '
          + 'bo‘shab qolgan bo‘limlar o‘chiriladi. «Bir xil turdagi tovarlarni '
          + 'bitta bo‘limga jamla» degan ish uchun AYNAN shu vosita.',
    parametrlar: 'maqsad (qaysi bo‘limga), manba (ro‘yxat — qaysi bo‘limlardan), '
               + 'boshlarni_ochir (standart: ha)',
  },
  bolim_ochir: {
    oqish: false, ishla: bolimOchir,
    tavsif: 'Bo‘limni o‘chiradi. Ichida mahsulot bo‘lsa O‘CHIRMAYDI — avval '
          + '«bolim_birlashtir» bilan ko‘chiring.',
    parametrlar: 'bolimlar (ro‘yxat)',
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
    tavsif: 'ISTALGAN sozlamani o‘zgartiradi — limitlar, chegirmalar, menejer '
          + 'telefoni, karta raqami, xabar shablonlari va boshqalar. Kalit '
          + 'bazada bor bo‘lishi va qiymat turi mos kelishi kerak, shuning '
          + 'uchun AVVAL «sozlamalar» bilan aniq nomi va hozirgi qiymatini ko‘r.',
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

/**
 * Amal bajarilishidan OLDIN nechta yozuvga tegishini sanaydi.
 *
 * Tasdiq kartasida «1 ta yozuv» deb turishi va bosgandan keyin 40 ta
 * mahsulot narxi o'zgarib ketishi — adminni aldash. Shuning uchun son
 * TAXMIN qilinmaydi, bazadan sanab olinadi.
 *
 * @returns {Promise<number|null>} null — oldindan bilib bo'lmaydi (xom SQL)
 */
export async function oldindanSoni(nom, a = {}) {
  try {
    if (nom === 'narxlarni_ozgartir') {
      const f = await narxFiltri(a);
      if (f.xato) return 0;
      return son(await qiymat(
        `select count(*) from products where ${f.shart.join(' and ')}`, f.p), 0);
    }
    if (nom === 'toifa_ozgartir' && a.manba_bolim && !(a.idlar || []).length) {
      const b = await bolimniTop(a.manba_bolim);
      if (!b) return 0;
      return son(await qiymat(
        `select count(*) from products where category_id = $1`, [b.id]), 0);
    }
    if (nom === 'bolim_birlashtir') {
      const manba = (Array.isArray(a.manba) ? a.manba : [a.manba]).filter(Boolean);
      let jami = 0;
      for (const m of manba) {
        const b = await bolimniTop(m);
        if (b) jami += son(await qiymat(
          `select count(*) from products where category_id = $1`, [b.id]), 0);
      }
      return jami;
    }
    if (nom === 'bolim_ochir') return (a.bolimlar || []).length || 1;
    // Xom SQL: `update ... where` ni sanab bo'lmaydi — ochiq aytamiz
    if (nom === 'sql_yoz') return null;
    if (Array.isArray(a.idlar)) return a.idlar.length;
    return 1;
  } catch {
    // Sanash yiqilsa amalning o'zi to'xtamasin — noma'lum deb ko'rsatamiz
    return null;
  }
}
