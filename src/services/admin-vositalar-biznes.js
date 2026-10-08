// Admin yordamchisining BIZNES vositalari.
//
// Asosiy ro'yxat (admin-vositalar.js) katalog va sozlamalarni
// boshqaradi. Bu yerda — do'kon egasining kundalik savollari:
//   «bugun qancha sotdik, kechagidan ko'pmi?»
//   «nima tugayapti, qancha buyurtma qilay?»
//   «kim tahlil qildi-yu sotib olmadi — ularga nima yozay?»
//   «katalogda nima yetishmaydi?»
// va shu savollardan keyingi AMAL: buyurtma holatini o'zgartirish,
// mijozga yoki segmentga xabar, yangi mahsulot.
//
// Qoida o'sha-o'sha: o'qish erkin, YOZISH faqat admin tasdiqlagach.
// Bu fayl admin-vositalar.js ni import QILMAYDI — u bizni import
// qiladi (aylana import ro'yxat yig'ilayotganda yiqilardi).
import { qator, qatorlar, qiymat, sorov } from '../db.js';
import { HOLATLAR, bosqichNomi } from '../lib/bosqichlar.js';

const son = (v, zaxira = 0) => (Number.isFinite(Number(v)) ? Number(v) : zaxira);
const matn = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const chegara = (v, standart = 30, maks = 200) => Math.min(maks, Math.max(1, son(v, standart)));
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Sotuv hisobida bekor qilingan buyurtma qatnashmaydi
const SOTUV = `status <> 'bekor'`;

/** Davr: bugun | kecha | hafta | oy | kun (N kun). Oldingi teng davr bilan solishtiriladi. */
function davrOl(a) {
  const d = matn(a.davr, 10);
  if (d === 'bugun') return { nom: 'bugun', bosh: `date_trunc('day', now())`, oxir: 'now()',
    oldBosh: `date_trunc('day', now()) - interval '1 day'`, oldOxir: `now() - interval '1 day'` };
  if (d === 'kecha') return { nom: 'kecha', bosh: `date_trunc('day', now()) - interval '1 day'`,
    oxir: `date_trunc('day', now())`, oldBosh: `date_trunc('day', now()) - interval '2 day'`,
    oldOxir: `date_trunc('day', now()) - interval '1 day'` };
  const kun = d === 'hafta' ? 7 : d === 'oy' ? 30 : chegara(a.kun, 7, 365);
  return { nom: `${kun} kun`, bosh: `now() - interval '${kun} days'`, oxir: 'now()',
    oldBosh: `now() - interval '${kun * 2} days'`, oldOxir: `now() - interval '${kun} days'` };
}

const ozgarish = (yangi, eski) => (eski ? Math.round(((yangi - eski) / eski) * 100) : null);

// ─────────────────────────── O'QISH ───────────────────────────

/** Davr hisoboti: daromad, buyurtma, o'rtacha chek, foyda, mijoz, tahlil — oldingi davr bilan. */
export async function hisobot(a = {}) {
  const v = davrOl(a);
  const davr = async (bosh, oxir) => qator(
    `select count(*) filter (where ${SOTUV})::int as buyurtma,
            coalesce(sum(total) filter (where ${SOTUV}),0)::bigint as daromad,
            coalesce(sum(total - delivery_fee + discount - cost_total) filter (where ${SOTUV}),0)::bigint as foyda,
            count(*) filter (where status = 'bekor')::int as bekor,
            (select count(*) from users where created_at >= ${bosh} and created_at < ${oxir})::int as yangi_mijoz,
            (select count(*) from analyses where created_at >= ${bosh} and created_at < ${oxir})::int as tahlil,
            (select count(distinct a.user_id) from analyses a
              where a.created_at >= ${bosh} and a.created_at < ${oxir})::int as tahlilchi,
            (select count(distinct a.user_id) from analyses a
              where a.created_at >= ${bosh} and a.created_at < ${oxir}
                and exists (select 1 from orders x where x.user_id = a.user_id and x.${SOTUV}
                              and x.created_at >= a.created_at))::int as tahlildan_xarid
       from orders where created_at >= ${bosh} and created_at < ${oxir}`);
  const [h, o] = await Promise.all([davr(v.bosh, v.oxir), davr(v.oldBosh, v.oldOxir)]);
  const chek = (x) => (x.buyurtma ? Math.round(Number(x.daromad) / x.buyurtma) : 0);
  const top = await qatorlar(
    `select coalesce(e->>'name','—') as nom, sum((e->>'qty')::int)::int as dona,
            sum((e->>'qty')::int * (e->>'price')::bigint)::bigint as summa
       from orders o cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) e
      where o.created_at >= ${v.bosh} and o.created_at < ${v.oxir} and o.${SOTUV}
      group by 1 order by summa desc limit 5`);
  return {
    davr: v.nom,
    hozir: { ...h, daromad: Number(h.daromad), foyda: Number(h.foyda), ortacha_chek: chek(h) },
    oldingi: { ...o, daromad: Number(o.daromad), foyda: Number(o.foyda), ortacha_chek: chek(o) },
    ozgarish_foiz: {
      daromad: ozgarish(Number(h.daromad), Number(o.daromad)),
      buyurtma: ozgarish(h.buyurtma, o.buyurtma),
      ortacha_chek: ozgarish(chek(h), chek(o)),
      yangi_mijoz: ozgarish(h.yangi_mijoz, o.yangi_mijoz),
      tahlil: ozgarish(h.tahlil, o.tahlil),
    },
    // Tahlildan buyurtmagacha: shu davrda tahlil qilganlarning nechtasi buyurtma berdi
    konversiya_foiz: h.tahlilchi ? Math.round((h.tahlildan_xarid / h.tahlilchi) * 100) : null,
    eng_kop_daromad: top.map((x) => ({ ...x, summa: Number(x.summa) })),
  };
}

/** Kam qolgan va tugaydigan mahsulotlar — sotuv tezligi bo'yicha, qancha buyurtma qilish kerakligi bilan. */
export async function kamQolgan(a = {}) {
  const kun = chegara(a.kun, 30, 180);
  const r = await qatorlar(
    `with sotuv as (
       select (e->>'product_id')::bigint as pid, sum((e->>'qty')::int)::int as dona
         from orders o cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) e
        where o.created_at >= now() - ($1 || ' days')::interval and o.${SOTUV}
          and e ? 'product_id'
        group by 1)
     select p.id, p.name, p.brand, p.stock, p.price, coalesce(s.dona,0) as sotildi
       from products p left join sotuv s on s.pid = p.id
      where p.is_active and (coalesce(s.dona,0) > 0 or coalesce(p.stock,0) <= 3)
      order by p.stock asc nulls first, s.dona desc nulls last
      limit 300`, [kun]);
  const qator_ = r.map((p) => {
    const tezlik = p.sotildi / kun;                       // kuniga necha dona
    const qoldi = tezlik > 0 ? Math.floor((p.stock || 0) / tezlik) : null;
    return { id: p.id, nom: p.name, brend: p.brand, ombor: p.stock || 0, sotildi: p.sotildi,
      kuniga: Math.round(tezlik * 100) / 100,
      necha_kunga_yetadi: qoldi,
      // Keyingi 30 kunga yetadigan qilib: kerakli − bor
      buyurtma_qiling: Math.max(0, Math.ceil(tezlik * 30 - (p.stock || 0))) };
  })
    // Tugagan, 21 kunga yetmaydigan yoki 3 donadan kam qolgan
    .filter((p) => p.ombor <= 0 || (p.necha_kunga_yetadi !== null && p.necha_kunga_yetadi <= 21) || p.ombor <= 3);
  // Avval tugaganlar, keyin eng tez tugaydiganlar
  const kalit = (p) => (p.ombor <= 0 ? -1 : p.necha_kunga_yetadi ?? 900 + p.ombor);
  qator_.sort((x, y) => kalit(x) - kalit(y));
  return {
    davr_kun: kun,
    tugagan: qator_.filter((p) => p.ombor <= 0).length,
    tez_orada_tugaydi: qator_.filter((p) => p.ombor > 0).length,
    mahsulotlar: qator_.slice(0, chegara(a.chegara, 30)),
    izoh: '«buyurtma_qiling» — keyingi 30 kunga yetishi uchun sotuv tezligi bo‘yicha.',
  };
}

/* Segmentlar — ommaviy xabar va lidlar uchun BITTA joyda. SQL faqat
   user id larini qaytaradi; Telegram'ga yetadiganlari alohida sanaladi. */
const SEGMENT_SQL = {
  hammasi: `select id from users where not is_blocked`,
  xaridorlar: `select distinct user_id as id from orders where ${SOTUV}`,
  qayta_xaridorlar: `select user_id as id from orders where ${SOTUV} group by user_id having count(*) >= 2`,
  // Tahlil qilgan, lekin o'shandan keyin buyurtma bermagan — eng issiq lid
  tahlil_xaridsiz: `select distinct a.user_id as id from analyses a
     where a.created_at >= now() - ($1 || ' days')::interval
       and not exists (select 1 from orders o where o.user_id = a.user_id
                        and o.created_at >= a.created_at and o.${SOTUV})`,
  // Savatga solgan, lekin buyurtma bermagan
  savat_tashlab_ketgan: `select distinct c.user_id as id from cart_items c
     where c.added_at >= now() - ($1 || ' days')::interval
       and not exists (select 1 from orders o where o.user_id = c.user_id and o.created_at >= c.added_at)`,
  // Bir paytlar xarid qilgan, oxirgi N kunda yo'q
  faol_emas: `select user_id as id from orders where ${SOTUV} group by user_id
     having max(created_at) < now() - ($1 || ' days')::interval`,
  royxatdan_otib_xaridsiz: `select u.id from users u where u.agreed_at is not null
     and not exists (select 1 from orders o where o.user_id = u.id)`,
};
export const SEGMENTLAR = Object.keys(SEGMENT_SQL);
const kunliSegment = (s) => /\$1/.test(SEGMENT_SQL[s] || '');

/** Segmentdagi foydalanuvchilar id lari (bloklanganlarsiz). */
export async function segmentIdlar(segment, kun = 14) {
  const sql = SEGMENT_SQL[segment];
  if (!sql) return null;
  const r = await qatorlar(
    `select u.id, u.telegram_id from users u where u.id in (${sql}) and not u.is_blocked`,
    kunliSegment(segment) ? [String(chegara(kun, 14, 365))] : []);
  return r;
}
const telegramga = (r) => r.filter((u) => /^[0-9]+$/.test(String(u.telegram_id || ''))).length;

/** Segmentlar hajmi — kimga qancha odamga xabar yetadi. */
export async function segmentlar(a = {}) {
  const kun = chegara(a.kun, 14, 365);
  const natija = {};
  for (const s of SEGMENTLAR) {
    const r = await segmentIdlar(s, kun);
    natija[s] = { jami: r.length, telegramda: telegramga(r) };
  }
  const teri = await qatorlar(`select coalesce(teri_turi,'nomaʼlum') as nom, count(*)::int as soni
     from users group by 1 order by 2 desc limit 8`);
  const hudud = await qatorlar(`select coalesce(viloyat,'nomaʼlum') as nom, count(*)::int as soni
     from users group by 1 order by 2 desc limit 8`);
  const push = son(await qiymat(`select count(distinct user_id)::int from push_obunalar`), 0);
  return { kun, segmentlar: natija, teri_turi: teri, viloyat: hudud, push_obunachilar: push,
    izoh: 'tahlil_xaridsiz va savat_tashlab_ketgan — eng issiq lidlar (oxirgi «kun» kun).' };
}

/** Lidlar ro'yxati: kim tahlil qildi/savatga soldi-yu, sotib olmadi. */
export async function lidlar(a = {}) {
  const kun = chegara(a.kun, 14, 365);
  const tur = ['tahlil', 'savat'].includes(a.tur) ? a.tur : 'hammasi';
  const ch = chegara(a.chegara, 20, 100);
  const natija = { kun };
  if (tur !== 'savat') {
    natija.tahlil_xaridsiz = await qatorlar(
      `select distinct on (a.user_id) a.user_id, u.full_name, u.phone, a.score, a.skin_type,
              a.problems->0->>'nom' as asosiy_muammo, a.created_at
         from analyses a join users u on u.id = a.user_id
        where a.created_at >= now() - ($1 || ' days')::interval and not u.is_blocked
          and not exists (select 1 from orders o where o.user_id = a.user_id
                           and o.created_at >= a.created_at and o.${SOTUV})
        order by a.user_id, a.created_at desc limit $2`, [String(kun), ch]);
  }
  if (tur !== 'tahlil') {
    natija.savat_tashlab_ketgan = await qatorlar(
      `select c.user_id, u.full_name, u.phone, count(*)::int as mahsulot,
              sum(c.quantity * p.price)::bigint as summa, max(c.added_at) as oxirgi
         from cart_items c join users u on u.id = c.user_id join products p on p.id = c.product_id
        where c.added_at >= now() - ($1 || ' days')::interval and not u.is_blocked
          and not exists (select 1 from orders o where o.user_id = c.user_id and o.created_at >= c.added_at)
        group by c.user_id, u.full_name, u.phone order by summa desc limit $2`, [String(kun), ch]);
    natija.savat_tashlab_ketgan.forEach((x) => { x.summa = Number(x.summa); });
  }
  return natija;
}

/** Sharhlar: o'rtacha baho, taqsimot va ro'yxat (yomonlarini topish uchun max_baho). */
export async function sharhlar(a = {}) {
  const p = [], shart = ['1=1'];
  if (a.max_baho) { p.push(son(a.max_baho, 5)); shart.push(`s.baho <= $${p.length}`); }
  if (a.product_id) { p.push(son(a.product_id)); shart.push(`s.product_id = $${p.length}`); }
  if (a.kun) { p.push(String(chegara(a.kun, 30, 3650))); shart.push(`s.created_at >= now() - ($${p.length} || ' days')::interval`); }
  const w = shart.join(' and ');
  const stat = await qator(`select count(*)::int as soni, round(avg(baho)::numeric, 2)::float as ortacha
     from sharhlar s where ${w}`, p);
  const taqsimot = await qatorlar(`select baho, count(*)::int as soni from sharhlar s where ${w}
     group by baho order by baho desc`, p);
  p.push(chegara(a.chegara, 20, 100));
  const royxat = await qatorlar(
    `select s.id, s.baho, s.matn, s.created_at, coalesce(array_length(s.rasmlar,1),0) as rasm,
            pr.id as product_id, pr.name as mahsulot, u.full_name as mijoz
       from sharhlar s join products pr on pr.id = s.product_id left join users u on u.id = s.user_id
      where ${w} order by s.created_at desc limit $${p.length}`, p);
  return { ...stat, taqsimot, sharhlar: royxat };
}

/** Katalog sifati: nima yetishmaydi — rasm, tavsif, o'zbekcha nom, narx xatosi. */
export async function katalogAudit(a = {}) {
  const ch = chegara(a.chegara, 15, 100);
  const TEKSHIR = {
    rasmsiz: `poster_id is null and coalesce(jsonb_array_length(images),0) = 0`,
    tavsifsiz: `coalesce(trim(description),'') = ''`,
    ozbekcha_nomsiz: `coalesce(trim(nom_uz),'') = ''`,
    ishlatish_tartibisiz: `coalesce(trim(usage_text),'') = ''`,
    muammo_belgilanmagan: `coalesce(array_length(concerns,1),0) = 0`,
    teri_turi_belgilanmagan: `coalesce(array_length(skin_types,1),0) = 0`,
    zarariga: `cost_price is not null and cost_price > 0 and price <= cost_price`,
    bolimsiz: `category_id is null`,
    tugagan_lekin_sotuvda: `coalesce(stock,0) <= 0`,
  };
  const natija = {};
  for (const [k, w] of Object.entries(TEKSHIR)) {
    const soni = son(await qiymat(`select count(*)::int from products where is_active and ${w}`), 0);
    const namuna = soni ? await qatorlar(`select id, name from products where is_active and ${w}
      order by id limit $1`, [ch]) : [];
    natija[k] = { soni, namuna };
  }
  const jami = son(await qiymat(`select count(*)::int from products where is_active`), 0);
  const toliq = son(await qiymat(`select count(*)::int from products where is_active and not (
     ${TEKSHIR.rasmsiz} or ${TEKSHIR.tavsifsiz} or ${TEKSHIR.muammo_belgilanmagan})`), 0);
  return { faol_mahsulot: jami, toliq_mahsulot: toliq,
    sifat_foiz: jami ? Math.round((toliq / jami) * 100) : 0, kamchiliklar: natija };
}

/** Bitta mahsulot samaradorligi: sotuv, daromad, foyda, sharh, savatlarda, sevimlilarda. */
export async function mahsulotTahlili(a = {}) {
  let p = null;
  if (a.id) p = await qator(`select * from products where id = $1`, [son(a.id)]);
  if (!p && a.qidiruv) {
    p = await qator(`select * from products where name ilike $1 or nom_uz ilike $1 order by is_active desc, id limit 1`,
      [`%${matn(a.qidiruv, 60)}%`]);
  }
  if (!p) return { xato: 'Mahsulot topilmadi. id yoki qidiruv bering.' };
  const sotuv = async (kun) => qator(
    `select coalesce(sum((e->>'qty')::int),0)::int as dona,
            coalesce(sum((e->>'qty')::int * (e->>'price')::bigint),0)::bigint as summa
       from orders o cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) e
      where (e->>'product_id')::bigint = $1 and o.${SOTUV}
        ${kun ? `and o.created_at >= now() - interval '${kun} days'` : ''}`, [p.id]);
  const [s30, sHammasi] = await Promise.all([sotuv(30), sotuv(0)]);
  const sh = await qator(`select count(*)::int as soni, round(avg(baho)::numeric,2)::float as ortacha
     from sharhlar where product_id = $1`, [p.id]);
  const savatda = son(await qiymat(`select count(distinct user_id)::int from cart_items where product_id = $1`, [p.id]), 0);
  const sevimli = son(await qiymat(`select count(*)::int from sevimlilar where product_id = $1`, [p.id]), 0);
  const tezlik = s30.dona / 30;
  return {
    mahsulot: { id: p.id, nom: p.name, brend: p.brand, narx: p.price, tannarx: p.cost_price,
      ombor: p.stock, faol: p.is_active },
    sotuv_30_kun: { dona: s30.dona, summa: Number(s30.summa) },
    sotuv_hammasi: { dona: sHammasi.dona, summa: Number(sHammasi.summa) },
    bir_dona_foyda: p.cost_price ? p.price - p.cost_price : null,
    marja_foiz: p.cost_price && p.price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : null,
    ombor_necha_kunga: tezlik > 0 ? Math.floor((p.stock || 0) / tezlik) : null,
    sharh: sh, savatda_turgan_mijoz: savatda, sevimlilarda: sevimli,
  };
}

// ─────────────────────────── YOZISH ───────────────────────────

/** Buyurtma(lar) holatini o'zgartiradi — mijozga o'zi xabar ketadi. */
export async function buyurtmaHolati(a = {}) {
  const holat = matn(a.holat, 30);
  if (!HOLATLAR.includes(holat)) {
    return { ozgardi: 0, xabar: `Noto‘g‘ri holat. Mavjudlari: ${HOLATLAR.join(', ')}` };
  }
  const idlar = new Set((Array.isArray(a.idlar) ? a.idlar : a.id ? [a.id] : []).map(Number).filter(Boolean));
  for (const r of (Array.isArray(a.raqamlar) ? a.raqamlar : a.raqam ? [a.raqam] : [])) {
    const o = await qator(`select id from orders where order_no = $1`, [matn(r, 40)]);
    if (o) idlar.add(Number(o.id));
  }
  if (!idlar.size) return { ozgardi: 0, xabar: 'Buyurtma id yoki raqami berilmadi (yoki topilmadi).' };
  // Panel ishlatadigan AYNI funksiya: ombor qaytishi, mijozga xabar, kanal
  const { holatniQoy } = await import('../api/admin.js');
  let ozgardi = 0;
  const yiqilgan = [];
  for (const id of [...idlar].slice(0, 100)) {
    const n = await holatniQoy(id, holat, { reason: matn(a.sabab, 200) }).catch((e) => ({ xato: e.message }));
    if (n.xato) yiqilgan.push({ id, xato: n.xato }); else ozgardi++;
  }
  return { ozgardi, holat: bosqichNomi(holat), yiqilgan };
}

/** Bitta mijozga xabar: Telegram (bo'lsa) va telefoniga bildirishnoma. */
export async function mijozgaXabar(a = {}) {
  const tana = matn(a.matn, 1500);
  if (tana.length < 2) return { yuborildi: 0, xabar: 'Xabar matni bo‘sh.' };
  let u = null;
  if (a.user_id) u = await qator(`select * from users where id = $1`, [son(a.user_id)]);
  if (!u && a.telefon) {
    const r = String(a.telefon).replace(/\D/g, '').slice(-9);
    if (r.length === 9) u = await qator(`select * from users where right(regexp_replace(coalesce(phone,''),'\\D','','g'), 9) = $1 limit 1`, [r]);
  }
  if (!u) return { yuborildi: 0, xabar: 'Mijoz topilmadi (user_id yoki telefon kerak).' };
  const kanallar = [];
  if (/^[0-9]+$/.test(String(u.telegram_id || ''))) {
    const { yubor } = await import('../bot/tg.js');
    const j = await yubor(u.telegram_id, esc(tana)).catch(() => null);
    if (j?.ok) kanallar.push('telegram');
  }
  const { foydalanuvchigaPush } = await import('./push.js');
  const p = await foydalanuvchigaPush(u.id, { sarlavha: 'KiOVO', matn: tana, havola: '/app/' }).catch(() => 0);
  if (p) kanallar.push('push');
  return { yuborildi: kanallar.length ? 1 : 0, kanallar, mijoz: u.full_name || u.id,
    xabar: kanallar.length ? '' : 'Mijozga yetkazib bo‘lmadi: Telegram ham, bildirishnoma ham yo‘q.' };
}

/** Segmentga ommaviy xabar (Telegram). Fonda, xavfsiz tezlikda yuboriladi. */
export async function ommaviyXabar(a = {}) {
  const tana = matn(a.matn, 3500);
  if (tana.length < 5) return { yuborildi: 0, xabar: 'Xabar matni juda qisqa.' };
  const segment = SEGMENTLAR.includes(a.segment) ? a.segment : null;
  if (!segment) return { yuborildi: 0, xabar: `Segment noto‘g‘ri. Mavjudlari: ${SEGMENTLAR.join(', ')}` };
  const r = await segmentIdlar(segment, a.kun);
  const idlar = r.map((x) => x.id);
  if (!idlar.length) return { yuborildi: 0, xabar: 'Bu segmentda hech kim yo‘q.' };
  const { broadcastBoshla } = await import('./broadcast.js');
  const b = await broadcastBoshla({ matn: esc(tana), userIdlar: idlar });
  return { yuborildi: b.jami, bajarildi: true, yuborish_id: b.id,
    natija: `${b.jami} kishiga yuborish boshlandi (fonda, sekundiga ~10 ta).` };
}

/** Yangi mahsulot. Rasm keyin admin paneldan qo'shiladi. */
export async function mahsulotQosh(a = {}) {
  const nom = matn(a.name ?? a.nom, 160);
  const narx = Math.round(son(a.price ?? a.narx, 0));
  if (nom.length < 2 || narx <= 0) return { qoshildi: 0, xabar: 'Nom va narx (0 dan katta) kerak.' };
  let toifa = null;
  if (a.bolim) {
    const b = matn(a.bolim, 60);
    toifa = await qator(`select id from categories where lower(name) = lower($1) or slug = $1 limit 1`, [b])
         || await qator(`select id from categories where name ilike $1 limit 1`, [`%${b}%`]);
    if (!toifa) return { qoshildi: 0, xabar: `«${b}» degan bo‘lim yo‘q.` };
  }
  const p = await qator(
    `insert into products (name, nom_uz, brand, price, cost_price, stock, volume, description,
                           usage_text, category_id, is_active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id, name, price`,
    [nom, matn(a.nom_uz, 160) || null, matn(a.brand ?? a.brend, 80) || null, narx,
     // Tannarx bazada majburiy — noma'lum bo'lsa 0 (keyin panelda kiritiladi)
     Math.max(0, Math.round(son(a.cost_price ?? a.tannarx, 0))), Math.max(0, Math.round(son(a.stock ?? a.ombor, 0))),
     matn(a.volume ?? a.hajm, 40) || null, matn(a.description ?? a.tavsif, 2000) || null,
     matn(a.usage_text, 1500) || null, toifa?.id ?? null, a.yopiq !== true]);
  return { qoshildi: 1, mahsulot: p,
    natija: `#${p.id} qo‘shildi. Rasmni admin panel → Mahsulotlar dan qo‘shing.` };
}

// ─────────────────────────── RO'YXAT ───────────────────────────

export const BIZNES_VOSITALAR = {
  hisobot: {
    oqish: true, ishla: hisobot,
    tavsif: 'DAVR HISOBOTI: daromad, buyurtma, o‘rtacha chek, foyda, yangi mijoz, tahlil — '
          + 'OLDINGI teng davr bilan solishtirib (o‘sish foizi), tahlil→buyurtma konversiyasi, '
          + 'eng ko‘p daromad keltirgan 5 mahsulot. «Bugun qanday?», «haftalik hisobot» uchun.',
    parametrlar: 'davr (bugun|kecha|hafta|oy) yoki kun',
  },
  kam_qolgan: {
    oqish: true, ishla: kamQolgan,
    tavsif: 'Tugagan va TEZ ORADA tugaydigan mahsulotlar: sotuv tezligi, necha kunga yetadi, '
          + 'keyingi 30 kunga QANCHA BUYURTMA qilish kerak. «Nimani olib kelay?» uchun.',
    parametrlar: 'kun (sotuv davri, standart 30), chegara',
  },
  segmentlar: {
    oqish: true, ishla: segmentlar,
    tavsif: 'Mijoz segmentlari hajmi (hammasi, xaridorlar, qayta_xaridorlar, tahlil_xaridsiz, '
          + 'savat_tashlab_ketgan, faol_emas, royxatdan_otib_xaridsiz) va Telegram’da '
          + 'yetadiganlari; teri turi va viloyat taqsimoti. Ommaviy xabardan OLDIN ko‘r.',
    parametrlar: 'kun (lid davri, standart 14)',
  },
  lidlar: {
    oqish: true, ishla: lidlar,
    tavsif: 'ISSIQ LIDLAR ro‘yxati: tahlil qilib sotib olmaganlar (asosiy muammosi bilan) va '
          + 'savatini tashlab ketganlar (summasi bilan). Kimga qo‘ng‘iroq qilish/yozish kerak.',
    parametrlar: 'tur (tahlil|savat|hammasi), kun, chegara',
  },
  sharhlar: {
    oqish: true, ishla: sharhlar,
    tavsif: 'Mijoz sharhlari: o‘rtacha baho, taqsimot, ro‘yxat. Yomon sharhlar uchun max_baho=2.',
    parametrlar: 'max_baho, product_id, kun, chegara',
  },
  katalog_audit: {
    oqish: true, ishla: katalogAudit,
    tavsif: 'KATALOG SIFATI: rasmsiz, tavsifsiz, o‘zbekcha nomsiz, ishlatish tartibisiz, '
          + 'muammo/teri turi belgilanmagan, ZARARIGA sotilayotgan (narx ≤ tannarx), '
          + 'bo‘limsiz, tugagan mahsulotlar — sonlari va namunalar.',
    parametrlar: 'chegara (har biridan nechta namuna)',
  },
  mahsulot_tahlili: {
    oqish: true, ishla: mahsulotTahlili,
    tavsif: 'BITTA mahsulot samaradorligi: 30 kunlik va umumiy sotuv, foyda, marja, '
          + 'ombor necha kunga yetadi, sharhlar, savatda va sevimlilarda nechta odam.',
    parametrlar: 'id yoki qidiruv',
  },
  buyurtma_holati: {
    oqish: false, ishla: buyurtmaHolati,
    tavsif: 'Buyurtma(lar) HOLATINI o‘zgartiradi; mijozga holat xabari O‘ZI ketadi, '
          + '«bekor» da mahsulot omborga qaytadi. Holatlar: ' + HOLATLAR.join(', ') + '.',
    parametrlar: 'holat, + id/idlar YOKI raqam/raqamlar (KQ-…), sabab (bekor uchun)',
  },
  mijozga_xabar: {
    oqish: false, ishla: mijozgaXabar,
    tavsif: 'BITTA mijozga shaxsiy xabar: Telegram’da (bo‘lsa) va telefoniga bildirishnoma. '
          + 'Matnni O‘ZING yoz — samimiy, qisqa, o‘zbekcha.',
    parametrlar: 'user_id yoki telefon, matn',
  },
  ommaviy_xabar: {
    oqish: false, ishla: ommaviyXabar,
    tavsif: 'SEGMENTGA ommaviy Telegram xabari (fonda, xavfsiz tezlikda). Avval «segmentlar» '
          + 'bilan hajmini ko‘r. Matnni o‘zing yoz: shaxsiy, foydali, bitta aniq taklif bilan, spamsiz.',
    parametrlar: 'segment, matn, kun (lid segmentlari uchun)',
  },
  mahsulot_qosh: {
    oqish: false, ishla: mahsulotQosh,
    tavsif: 'YANGI mahsulot qo‘shadi (rasm keyin panelda qo‘shiladi). Rasmdan yoki matndan '
          + 'ma’lumotni o‘zing to‘ldir: nom, brend, hajm, tavsif, ishlatish tartibi.',
    parametrlar: 'name, price, + brand, nom_uz, cost_price, stock, volume, description, '
               + 'usage_text, bolim, yopiq (true — sotuvga chiqarmasdan)',
  },
};

/** Tasdiq kartasi uchun oldindan son. null — bu vosita bizniki emas. */
export async function biznesOldindanSoni(nom, a = {}) {
  if (nom === 'ommaviy_xabar') {
    if (!SEGMENTLAR.includes(a.segment)) return 0;
    return telegramga(await segmentIdlar(a.segment, a.kun));
  }
  if (nom === 'buyurtma_holati') {
    const n = (Array.isArray(a.idlar) ? a.idlar.length : a.id ? 1 : 0)
            + (Array.isArray(a.raqamlar) ? a.raqamlar.length : a.raqam ? 1 : 0);
    return n || 0;
  }
  if (nom === 'mijozga_xabar' || nom === 'mahsulot_qosh') return 1;
  return undefined;
}
