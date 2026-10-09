// AI YORDAMCHI — BUTUN KATALOG NARXINI MARJA BO'YICHA QAYTA QO'YISH.
//
// Admin aytadi: «marjani 30 ga tushir», «hech bir mahsulotda foyda
// 30% dan oshmasin, kelasi safar ham shunday», «aksiya qilib 25%
// marjaga tushir». Ilgari agent bunga faqat «hamma narxni 10% kamaytir»
// kabi ko'r-ko'rona foiz bilan javob berardi: qalam ham, 300 grammlik
// krem ham bir xil foizga tushardi, yo'l haqi esa foydaga aralashib
// ketardi.
//
// Endi har mahsulot uchun ALOHIDA hisob (src/lib/narx.js):
//   sof foyda = narx − tannarx − yo'lkira
//   yo'lkira  = og'irlikka mutanosib (qalam, lab bo'yog'iga 2–5 ming)
// va foiz SOF FOYDAGA qo'llanadi, yo'lkiraga emas.
//
// Ikki usul:
//   narx     — narx to'g'ridan-to'g'ri o'zgaradi (eski chegirma yo'qoladi);
//   chegirma — asl narx «eski narx» bo'lib qoladi va ilovada ustidan
//              chiziladi, yangi arzon narx yonida turadi. Faqat narx
//              TUSHADIGAN mahsulotlarga qo'llanadi.
//
// Ish ikki bosqichda: `marja_rejasi` — o'qish (nima o'zgaradi, misollar,
// tannarxi yoki og'irligi yo'qlar), `marja_qoy` — tasdiqdan keyin yozish.
// Ikkalasi BIR xil hisobni ishlatadi, shuning uchun tasdiq kartasidagi
// son va natija farq qilmaydi.
import { qator, qatorlar, sozlama, sorov, sozlamalarniUnut } from '../db.js';
import { NARX_QOIDASI, qoidaniTozala, yolkira, ogirlikTaxmini, narxHisobla } from '../lib/narx.js';

const son = (v, zaxira = 0) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : zaxira);
const matn = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const CHEKSIZ = 1e9;

/** Saqlangan qoida (sozlamadan, yetishmagan qiymatlar standartdan). */
export async function joriyQoida() {
  const x = await sozlama('narx_qoidasi', {});
  return qoidaniTozala(x && typeof x === 'object' ? x : {});
}

/** Qaysi mahsulotlar: filtrsiz chaqirilsa BUTUN katalog uchun hammasi=true kerak. */
async function mahsulotlar(a) {
  const shart = ['1=1'];
  const p = [];
  if (Array.isArray(a.idlar) && a.idlar.length) {
    p.push(a.idlar.map((x) => son(x, 0)).filter((x) => x > 0));
    shart.push(`p.id = any($${p.length})`);
  }
  if (a.brend) { p.push(matn(a.brend, 60)); shart.push(`p.brand ilike $${p.length}`); }
  if (a.qidiruv) {
    p.push(`%${matn(a.qidiruv, 60)}%`);
    shart.push(`(p.name ilike $${p.length} or p.nom_uz ilike $${p.length})`);
  }
  if (a.bolim) {
    const b = matn(a.bolim, 60);
    const t = await qator(`select id from categories where lower(slug) = lower($1) or lower(name) = lower($1)
        or name ilike '%' || $1 || '%' order by (lower(name) = lower($1)) desc limit 1`, [b]);
    if (!t) return { xato: `«${b}» degan bo‘lim yo‘q.` };
    p.push(t.id); shart.push(`p.category_id = $${p.length}`);
  }
  if (a.max_gramm) { p.push(son(a.max_gramm)); shart.push(`coalesce(p.ogirlik, 0) between 1 and $${p.length}`); }
  if (a.faqat_faol) shart.push('p.is_active');
  if (a.faqat_chegirmadagilar) shart.push('p.old_price is not null');
  if (shart.length === 1 && a.hammasi !== true) {
    return { xato: 'Filtr berilmadi. Butun katalog uchun hammasi=true qo‘ying.' };
  }
  const r = await qatorlar(
    `select p.id, p.name, p.nom_uz, p.brand, p.price, p.old_price, p.cost_price, p.ogirlik,
            p.volume, p.dona_soni, p.is_active
       from products p where ${shart.join(' and ')} order by p.id`, p);
  return { r };
}

/**
 * Shu ishga qo'llanadigan qoida. `foiz` berilsa — sof foyda AYNAN shu
 * foiz bo'ladi (eng kam/eng ko'p summa aralashmaydi, faqat admin o'zi
 * aytgan bo'lsa), chegara ham shu foiz: hech biri undan oshmaydi.
 */
function ishQoidasi(asos, a) {
  const q = { ...asos };
  if (a.yetkazish_100g != null) q.yetkazish_100g = son(a.yetkazish_100g, q.yetkazish_100g);
  if (a.yetkazish_min != null) q.yetkazish_min = son(a.yetkazish_min, q.yetkazish_min);
  if (a.foiz != null) {
    const f = Math.max(0, Math.min(300, son(a.foiz)));
    q.foyda_foiz = f;
    q.foyda_chegara_foiz = f;
    q.foyda_min = a.foyda_min != null ? son(a.foyda_min) : 0;
    q.foyda_max = a.foyda_max != null ? son(a.foyda_max, CHEKSIZ) : CHEKSIZ;
  } else {
    if (a.foyda_min != null) q.foyda_min = son(a.foyda_min);
    if (a.foyda_max != null) q.foyda_max = son(a.foyda_max);
  }
  return qoidaniTozala(q);
}

/** Bitta mahsulot: hozirgi va yangi narx, sababi bilan. */
function mahsulotHisobi(p, q, a) {
  const usul = a.usul === 'chegirma' ? 'chegirma' : 'narx';
  const rejim = ['faqat_tushir', 'faqat_oshir'].includes(a.rejim) ? a.rejim : 'aniq';
  const nom = p.nom_uz || p.name;
  const tannarx = son(p.cost_price);
  if (!tannarx) return { id: p.id, nom, holat: 'tannarxsiz' };

  const ogirlikManba = p.ogirlik > 0 ? 'aniq' : ogirlikTaxmini(p.volume) ? 'hajmdan' : 'taxmin';
  const gramm = p.ogirlik > 0 ? p.ogirlik : ogirlikTaxmini(p.volume);
  const yol = yolkira(gramm, q);
  const h = narxHisobla({ tannarx, gramm }, q);

  // «Asl» narx: chegirmadagi mahsulotda — chizilgan eski narx
  const asl = p.old_price > p.price ? p.old_price : p.price;
  const joriyFoyda = p.price - tannarx - yol;
  const joriyFoiz = Math.round((joriyFoyda / tannarx) * 1000) / 10;
  const yangi = h.narx;
  const umumiy = { id: p.id, nom, tannarx, gramm: gramm || null, ogirlik: ogirlikManba, yolkira: yol,
    narx: p.price, eski_narx: p.old_price || null, joriy_foiz: joriyFoiz, yangi_narx: yangi,
    yangi_foyda: h.foyda, yangi_foiz: h.foyda_foiz };

  if (rejim === 'faqat_tushir' && yangi >= p.price) return { ...umumiy, holat: 'ozgarmaydi' };
  if (rejim === 'faqat_oshir' && yangi <= p.price) return { ...umumiy, holat: 'ozgarmaydi' };

  if (usul === 'chegirma') {
    // Chegirma faqat narxni TUSHIRADI; asl narx chizilgan bo'lib qoladi
    if (yangi >= asl) return { ...umumiy, holat: 'chegirma_bolmaydi' };
    if (yangi === p.price && p.old_price === asl) return { ...umumiy, holat: 'ozgarmaydi' };
    return { ...umumiy, holat: 'ozgaradi', yangi_eski: asl };
  }
  if (yangi === p.price && !p.old_price) return { ...umumiy, holat: 'ozgarmaydi' };
  return { ...umumiy, holat: 'ozgaradi', yangi_eski: null };
}

async function hisobla(a = {}) {
  const asos = await joriyQoida();
  const q = ishQoidasi(asos, a);
  const m = await mahsulotlar(a);
  if (m.xato) return { xato: m.xato };
  const qatorlarHisob = m.r.map((p) => mahsulotHisobi(p, q, a));
  return { q, asos, qatorlarHisob };
}

const ortacha = (r, k) => (r.length ? Math.round((r.reduce((s, x) => s + son(x[k]), 0) / r.length) * 10) / 10 : null);

function xulosa({ q, qatorlarHisob }, a) {
  const oz = qatorlarHisob.filter((x) => x.holat === 'ozgaradi');
  const hisoblangan = qatorlarHisob.filter((x) => x.holat !== 'tannarxsiz');
  const tannarxsiz = qatorlarHisob.filter((x) => x.holat === 'tannarxsiz');
  const yengil = hisoblangan.filter((x) => x.gramm && x.gramm <= 40);
  return {
    usul: a.usul === 'chegirma' ? 'chegirma (eski narx chizilgan holda)' : 'narx',
    rejim: a.rejim || 'aniq',
    qoida: {
      sof_foyda_foiz: q.foyda_foiz, chegara_foiz: q.foyda_chegara_foiz || null,
      foyda_min: q.foyda_min, foyda_max: q.foyda_max >= CHEKSIZ ? null : q.foyda_max,
      yolkira_100g: q.yetkazish_100g, yolkira_min: q.yetkazish_min, yaxlitlash: q.yaxlitlash,
    },
    jami: qatorlarHisob.length,
    ozgaradi: oz.length,
    tushadi: oz.filter((x) => x.yangi_narx < x.narx).length,
    oshadi: oz.filter((x) => x.yangi_narx > x.narx).length,
    ozgarmaydi: qatorlarHisob.filter((x) => x.holat === 'ozgarmaydi').length,
    chegirma_bolmaydi: qatorlarHisob.filter((x) => x.holat === 'chegirma_bolmaydi').length,
    tannarxsiz: { soni: tannarxsiz.length, namunalar: tannarxsiz.slice(0, 8).map((x) => `#${x.id} ${x.nom}`) },
    ogirlik: {
      aniq: hisoblangan.filter((x) => x.ogirlik === 'aniq').length,
      hajmdan_taxmin: hisoblangan.filter((x) => x.ogirlik === 'hajmdan').length,
      nomalum_100g_deb: hisoblangan.filter((x) => x.ogirlik === 'taxmin').length,
    },
    ortacha_sof_foyda_foiz: { hozir: ortacha(hisoblangan, 'joriy_foiz'),
      keyin: ortacha(hisoblangan.map((x) => (x.holat === 'ozgaradi' ? { f: x.yangi_foiz } : { f: x.joriy_foiz })), 'f') },
    eng_yuqori_hozir: [...hisoblangan].sort((x, y) => y.joriy_foiz - x.joriy_foiz).slice(0, 5)
      .map((x) => ({ id: x.id, nom: x.nom, narx: x.narx, sof_foyda_foiz: x.joriy_foiz })),
    yengil_tovarlar: { soni: yengil.length,
      yolkira_oraligi: yengil.length ? [Math.min(...yengil.map((x) => x.yolkira)), Math.max(...yengil.map((x) => x.yolkira))] : null },
    // Eng katta o'zgarishlar — admin ko'z bilan tekshirsin
    namunalar: [...oz].sort((x, y) => Math.abs(y.yangi_narx - y.narx) - Math.abs(x.yangi_narx - x.narx))
      .slice(0, son(a.namuna, 12)).map((x) => ({
        id: x.id, nom: x.nom, tannarx: x.tannarx, gramm: x.gramm, yolkira: x.yolkira,
        hozir: x.narx, hozir_foiz: x.joriy_foiz, yangi: x.yangi_narx, yangi_foiz: x.yangi_foiz,
        ...(x.yangi_eski ? { chizilgan_eski_narx: x.yangi_eski } : {}),
      })),
  };
}

/** O'QISH: nima o'zgarishini ko'rsatadi, hech narsa yozmaydi. */
export async function marjaRejasi(a = {}) {
  const h = await hisobla(a);
  if (h.xato) return { xabar: h.xato };
  return xulosa(h, a);
}

/** YOZISH: hisobni qo'llaydi (tasdiqdan keyin). */
export async function marjaQoy(a = {}) {
  const h = await hisobla(a);
  if (h.xato) return { ozgardi: 0, xabar: h.xato };
  const oz = h.qatorlarHisob.filter((x) => x.holat === 'ozgaradi');
  // Bo'laklab yoziladi: ming mahsulot bitta ulkan so'rovda emas
  for (let i = 0; i < oz.length; i += 300) {
    const b = oz.slice(i, i + 300);
    await sorov(
      `update products p set price = v.narx, old_price = v.eski, updated_at = now()
         from unnest($1::bigint[], $2::int[], $3::int[]) as v(id, narx, eski)
        where p.id = v.id`,
      [b.map((x) => x.id), b.map((x) => x.yangi_narx), b.map((x) => x.yangi_eski)]);
  }
  let saqlandi = null;
  if (a.saqla === true) saqlandi = await qoidaniSaqla(qoidaFarqi(h.q, a));
  const x = xulosa(h, a);
  return { ...x, ozgardi: oz.length, bajarildi: true,
    ...(saqlandi ? { qoida_saqlandi: saqlandi, izoh: 'Yangi qo‘shiladigan mahsulotlar ham shu qoida bilan narxlanadi.' } : {}) };
}

/** Ishda ishlatilgan qoidadan saqlanadigan qismi. */
function qoidaFarqi(q, a) {
  const f = {};
  if (a.foiz != null) {
    f.foyda_foiz = q.foyda_foiz;
    f.foyda_chegara_foiz = q.foyda_chegara_foiz;
    f.foyda_min = q.foyda_min;
    f.foyda_max = q.foyda_max >= CHEKSIZ ? CHEKSIZ : q.foyda_max;
  }
  for (const k of ['yetkazish_100g', 'yetkazish_min']) if (a[k] != null) f[k] = q[k];
  for (const k of ['foyda_min', 'foyda_max']) if (a[k] != null) f[k] = q[k];
  return f;
}

async function qoidaniSaqla(qism) {
  const yangi = qoidaniTozala({ ...(await joriyQoida()), ...qism });
  await sorov(
    `insert into settings (key, value, updated_at) values ('narx_qoidasi', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(yangi)]);
  sozlamalarniUnut();
  return yangi;
}

const MISOLLAR = [
  ['Qalam · 8 g', 25000, 8], ['Lab bo‘yog‘i · 15 g', 40000, 15],
  ['Krem · 60 g', 90000, 60], ['Katta krem · 250 g', 180000, 250],
];

/** O'QISH: doimiy narx qoidasi va u bilan misollar. */
export async function narxQoidasi() {
  const q = await joriyQoida();
  return {
    qoida: { ...q, foyda_max: q.foyda_max >= CHEKSIZ ? 'cheksiz' : q.foyda_max },
    formula: 'narx = tannarx + yo‘lkira + sof foyda; yo‘lkira = gramm × (yetkazish_100g/100), eng kami '
           + 'yetkazish_min; sof foyda = tannarx × foyda_foiz% (min/max bilan), foyda_chegara_foiz dan oshmaydi.',
    misollar: MISOLLAR.map(([nom, tannarx, gramm]) => ({ nom, tannarx, ...narxHisobla({ tannarx, gramm }, q) })),
  };
}

/** YOZISH: doimiy qoidani o'zgartiradi — keyingi importlar va qo'shishlar shunga bo'ysunadi. */
export async function narxQoidasiniSaqla(a = {}) {
  const qism = {};
  for (const k of Object.keys(NARX_QOIDASI)) if (a[k] != null && a[k] !== '') qism[k] = son(a[k]);
  if (a.foyda_max === 'cheksiz' || a.foyda_max === null) qism.foyda_max = CHEKSIZ;
  if (!Object.keys(qism).length) return { ozgardi: 0, xabar: 'O‘zgartiriladigan qiymat berilmadi.' };
  const q = await qoidaniSaqla(qism);
  return { ozgardi: 1, qoida: q, misollar: (await narxQoidasi()).misollar };
}

export const MARJA_VOSITALAR = {
  narx_qoidasi: {
    oqish: true, ishla: narxQoidasi,
    tavsif: 'DOIMIY NARX QOIDASI: kurs, yo‘lkira stavkasi (100 g uchun) va eng kami, sof foyda foizi, '
          + 'eng kam/ko‘p foyda, foyda chegarasi — va 4 ta misol (qalam, lab bo‘yog‘i, krem). Import va '
          + 'yangi mahsulot narxi shu bilan hisoblanadi.',
    parametrlar: '—',
  },
  narx_qoidasi_saqla: {
    oqish: false, ishla: narxQoidasiniSaqla,
    tavsif: 'Doimiy narx qoidasini o‘zgartiradi («kelasi safar ham foyda 30% dan oshmasin»). Mavjud '
          + 'narxlarga TEGMAYDI — ular uchun marja_qoy.',
    parametrlar: 'foyda_foiz, foyda_chegara_foiz (0 — cheksiz), foyda_min, foyda_max, yetkazish_100g, '
               + 'yetkazish_min, krw_kurs, yaxlitlash',
  },
  marja_rejasi: {
    oqish: true, ishla: marjaRejasi,
    tavsif: 'MARJA REJASI (hech narsa yozmaydi): har mahsulotga yo‘lkirani og‘irligidan ALOHIDA hisoblab, '
          + 'berilgan sof foyda foizi bilan yangi narxni chiqaradi. Nechta tushadi/oshadi, tannarxi yo‘qlar, '
          + 'og‘irligi taxminlar, o‘rtacha foyda hozir/keyin, eng katta o‘zgarishlar. marja_qoy dan OLDIN ishlat.',
    parametrlar: 'foiz (sof foyda %, tannarxdan, yo‘lkirasiz), usul (narx|chegirma), rejim (aniq|faqat_tushir|'
               + 'faqat_oshir), filtr: hammasi=true | idlar | brend | qidiruv | bolim | max_gramm | faqat_faol; '
               + 'ixtiyoriy: yetkazish_100g, yetkazish_min, foyda_min, foyda_max, namuna',
  },
  marja_qoy: {
    oqish: false, ishla: marjaQoy,
    tavsif: 'MARJANI QO‘YADI — marja_rejasi bilan AYNAN bir xil hisob, butun katalogga ham. usul=chegirma: '
          + 'asl narx chizilgan eski narx bo‘lib qoladi, yangi arzon narx yonida (aksiya). saqla=true — '
          + 'shu foiz doimiy qoidaga ham yoziladi (keyingi mahsulotlar ham shunday narxlanadi).',
    parametrlar: 'marja_rejasi bilan bir xil + saqla (true|false)',
  },
};

/** Tasdiq kartasi uchun: AYNAN nechta mahsulot narxi o'zgaradi. */
export async function marjaOldindanSoni(nom, a = {}) {
  if (nom === 'marja_qoy') {
    const h = await hisobla(a);
    return h.xato ? 0 : h.qatorlarHisob.filter((x) => x.holat === 'ozgaradi').length;
  }
  if (nom === 'narx_qoidasi_saqla') return 1;
  return undefined;
}
