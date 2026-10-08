// BOSHQARUV PANELIDAGI TAVSIYALAR — «bugun nima qilish kerak».
//
// SaaS panellaridagi «insights» kabi: bazadan HISOBLANADI (AI emas —
// pul ketmaydi, darrov ochiladi). Har tavsiyada bitta aniq amal:
//   bolim — admin panelning o'sha bo'limini ochadi;
//   ai    — AI yordamchiga tayyor topshiriq beradi (u bajaradi,
//           yozish bo'lsa tasdiq so'raydi).
import { qator, qiymat } from '../db.js';
import { kamQolgan, segmentIdlar, katalogAudit } from './admin-vositalar-biznes.js';

const son = (v) => Number(v) || 0;
const TARTIB = { xavf: 0, ogoh: 1, imkon: 2, info: 3 };

export async function tavsiyalar() {
  const t = [];
  const qosh = (x) => { if (x) t.push(x); };

  // ── Buyurtmalar ──
  const b = await qator(
    `select count(*) filter (where status = 'yangi')::int as yangi,
            count(*) filter (where status = 'yangi' and created_at < now() - interval '24 hours')::int as eski,
            count(*) filter (where payment_status = 'chek_yuborilgan')::int as chek
       from orders`);
  if (b.eski) qosh({ kalit: 'eski_buyurtma', daraja: 'xavf', ikon: 'soat', son: b.eski,
    sarlavha: `${b.eski} ta buyurtma 24 soatdan beri kutmoqda`,
    matn: 'Mijoz javob kutyapti — kechiksa bekor qilishi mumkin.', amal: { tur: 'bolim', bolim: 'buyurtma' } });
  else if (b.yangi) qosh({ kalit: 'yangi_buyurtma', daraja: 'ogoh', ikon: 'quti', son: b.yangi,
    sarlavha: `${b.yangi} ta yangi buyurtma`, matn: 'Ko‘rib chiqing va holatini yangilang.',
    amal: { tur: 'bolim', bolim: 'buyurtma' } });
  if (b.chek) qosh({ kalit: 'chek', daraja: 'xavf', ikon: 'karta', son: b.chek,
    sarlavha: `${b.chek} ta to‘lov cheki tekshirilmagan`, matn: 'Tasdiqlansa buyurtma xaridga o‘tadi.',
    amal: { tur: 'bolim', bolim: 'buyurtma' } });

  // ── Ombor ──
  const k = await kamQolgan({ kun: 30, chegara: 50 }).catch(() => null);
  const sotiladiganTugagan = (k?.mahsulotlar || []).filter((p) => p.ombor <= 0 && p.sotildi > 0).length;
  if (sotiladiganTugagan) qosh({ kalit: 'tugagan', daraja: 'xavf', ikon: 'ogoh', son: sotiladiganTugagan,
    sarlavha: `${sotiladiganTugagan} ta sotiladigan mahsulot tugagan`,
    matn: 'Mijoz bu mahsulotlarni sotib ololmayapti.',
    amal: { tur: 'ai', savol: 'Tugagan va tez orada tugaydigan mahsulotlarni ko‘rsat, har biridan qancha buyurtma qilishni ayt.' } });
  else if (k?.tez_orada_tugaydi) qosh({ kalit: 'tugaydi', daraja: 'ogoh', ikon: 'quti', son: k.tez_orada_tugaydi,
    sarlavha: `${k.tez_orada_tugaydi} ta mahsulot 3 haftada tugaydi`, matn: 'Hozir buyurtma qilsangiz uzilish bo‘lmaydi.',
    amal: { tur: 'ai', savol: 'Tez orada tugaydigan mahsulotlar uchun xarid rejasini tuz.' } });

  // ── Lidlar ──
  const lid = await segmentIdlar('tahlil_xaridsiz', 14).catch(() => []);
  if (lid.length) qosh({ kalit: 'lid_tahlil', daraja: 'imkon', ikon: 'skaner', son: lid.length,
    sarlavha: `${lid.length} kishi tahlil qildi, lekin sotib olmadi`,
    matn: 'Eng issiq mijozlar — mos mahsulot bilan shaxsiy xabar yozing.',
    amal: { tur: 'ai', savol: 'Oxirgi 14 kunda tahlil qilib sotib olmaganlarga shaxsiy xabar matnini yoz va yuborishni taklif qil.' } });
  const savat = await segmentIdlar('savat_tashlab_ketgan', 7).catch(() => []);
  if (savat.length) qosh({ kalit: 'lid_savat', daraja: 'imkon', ikon: 'savat', son: savat.length,
    sarlavha: `${savat.length} ta savat tashlab ketilgan`, matn: 'Yumshoq eslatma ko‘pincha xaridni qaytaradi.',
    amal: { tur: 'ai', savol: 'Savatini tashlab ketgan mijozlarga eslatma xabarini yoz va yuborishni taklif qil.' } });

  // ── Sotuv trendi ──
  const tr = await qator(
    `select coalesce(sum(total) filter (where created_at >= now() - interval '7 days'),0)::bigint as bu,
            coalesce(sum(total) filter (where created_at >= now() - interval '14 days'
                                          and created_at < now() - interval '7 days'),0)::bigint as otgan
       from orders where status <> 'bekor'`);
  if (son(tr.otgan) > 0) {
    const f = Math.round(((son(tr.bu) - son(tr.otgan)) / son(tr.otgan)) * 100);
    if (Math.abs(f) >= 15) qosh({ kalit: 'trend', daraja: f < 0 ? 'ogoh' : 'info', ikon: f < 0 ? 'pastga' : 'osish',
      son: `${f > 0 ? '+' : ''}${f}%`, sarlavha: f < 0 ? `Sotuv o‘tgan haftadan ${-f}% kam` : `Sotuv o‘tgan haftadan ${f}% ko‘p`,
      matn: f < 0 ? 'Sababini va nima qilish kerakligini AI tahlil qilsin.' : 'Nima ishlaganini bilib, takrorlang.',
      amal: { tur: 'ai', savol: 'Bu haftani o‘tgan hafta bilan solishtir: nima o‘zgardi, sababi nima, nima qilish kerak?' } });
  }

  // ── Talab va katalog: eng ko'p uchragan muammo uchun mahsulot yetarlimi ──
  const m = await qator(
    `select e->>'kalit' as kalit, coalesce(max(e->>'nom'), e->>'kalit') as nom, count(*)::int as soni
       from analyses a cross join lateral jsonb_array_elements(coalesce(a.problems,'[]'::jsonb)) e
      where a.created_at >= now() - interval '30 days' and e ? 'kalit'
      group by e->>'kalit' order by soni desc limit 1`).catch(() => null);
  if (m?.soni >= 3) {
    const bor = son(await qiymat(`select count(*)::int from products where is_active and $1 = any(concerns)`, [m.kalit]));
    if (bor < 4) qosh({ kalit: 'talab', daraja: 'imkon', ikon: 'barg', son: m.soni,
      sarlavha: `«${m.nom}» — eng ko‘p uchragan muammo`,
      matn: `${m.soni} ta tahlilda topildi, katalogda unga atigi ${bor} ta mahsulot bor.`,
      amal: { tur: 'ai', savol: `«${m.nom}» muammosi uchun katalogga qanday mahsulotlar qo‘shish kerak? Mavjudlarini va bo‘shliqni ko‘rsat.` } });
  }

  // ── Sharhlar ──
  const yomon = son(await qiymat(`select count(*)::int from sharhlar where baho <= 2
      and created_at >= now() - interval '30 days'`).catch(() => 0));
  if (yomon) qosh({ kalit: 'sharh', daraja: 'ogoh', ikon: 'yulduz', son: yomon,
    sarlavha: `${yomon} ta past baholi sharh (30 kun)`, matn: 'Mijoz bilan bog‘lanish obro‘ni saqlaydi.',
    amal: { tur: 'ai', savol: 'Oxirgi 30 kundagi past baholi sharhlarni ko‘rsat va har biriga chora taklif qil.' } });

  // ── Katalog sifati ──
  const au = await katalogAudit({ chegara: 1 }).catch(() => null);
  if (au) {
    const zarar = au.kamchiliklar.zarariga.soni;
    if (zarar) qosh({ kalit: 'zarar', daraja: 'xavf', ikon: 'pul', son: zarar,
      sarlavha: `${zarar} ta mahsulot zarariga sotilmoqda`, matn: 'Narxi tannarxdan past yoki teng.',
      amal: { tur: 'ai', savol: 'Zarariga sotilayotgan mahsulotlarni ko‘rsat va 25% marja bilan yangi narx taklif qil.' } });
    if (au.faol_mahsulot && au.sifat_foiz < 85) qosh({ kalit: 'katalog', daraja: 'imkon', ikon: 'hujjat',
      son: `${au.sifat_foiz}%`, sarlavha: 'Katalog to‘liq emas',
      matn: `Rasmsiz ${au.kamchiliklar.rasmsiz.soni}, tavsifsiz ${au.kamchiliklar.tavsifsiz.soni}, `
          + `muammosi belgilanmagan ${au.kamchiliklar.muammo_belgilanmagan.soni} ta.`,
      amal: { tur: 'ai', savol: 'Katalog auditini qil va tavsifi yoki ishlatish tartibi yo‘q mahsulotlarga matn yozib, saqlashni taklif qil.' } });
  }

  t.sort((x, y) => TARTIB[x.daraja] - TARTIB[y.daraja]);
  return { tavsiyalar: t, vaqt: new Date().toISOString() };
}
