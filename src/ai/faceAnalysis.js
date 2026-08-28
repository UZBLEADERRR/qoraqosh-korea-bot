// Yuz tahlili: SIFAT NAZORATI -> tahlil -> bosqichma-bosqich tavsiya.
// Bitta Gemini chaqiruvi: modelga katalogning ixcham ro'yxati ham beriladi,
// shuning uchun u mavjud bo'lmagan mahsulotni "o'ylab topa olmaydi".
// Qaytgan id'lar baribir katalogga solishtirib tekshiriladi.
import { aiJson, rasmPart, aiBormi } from './index.js';

export const RAD_SABABLARI = {
  yuz_yoq:      { emoji: '🙈', matn: "Rasmda yuz topilmadi." },
  uzoq:         { emoji: '🔭', matn: "Yuz juda uzoqda — kadrni to'ldirmaydi." },
  xira:         { emoji: '🌫', matn: "Rasm xira yoki qimirlab ketgan." },
  qorongi:      { emoji: '🌑', matn: "Yorug'lik yetarli emas." },
  yopiq:        { emoji: '🧣', matn: "Yuz soch, ko'zoynak yoki qo'l bilan yopilgan." },
  bir_nechta:   { emoji: '👥', matn: "Kadrda bir nechta odam bor." },
  pardoz:       { emoji: '💄', matn: "Qalin pardoz yoki filtr teri holatini yashirmoqda." },
  sunday:       { emoji: '🤖', matn: "Rasm sun'iy (AI yoki deepfake) yaratilganga o'xshaydi." },
  ekran:        { emoji: '📺', matn: "Bu — ekrandan olingan surat yoki boshqa rasmning surati." },
  yuz_emas:     { emoji: '🖼', matn: "Bu odam yuzining surati emas." },
};

const SXEMA = {
  type: 'object',
  properties: {
    sifat: {
      type: 'object',
      properties: {
        yaroqli: { type: 'boolean' },
        sabab: {
          type: 'string',
          enum: ['yaroqli', ...Object.keys(RAD_SABABLARI)],
        },
        ishonch: { type: 'integer' },
        izoh: { type: 'string' },
      },
      required: ['yaroqli', 'sabab', 'ishonch', 'izoh'],
      propertyOrdering: ['yaroqli', 'sabab', 'ishonch', 'izoh'],
    },
    umumiy: {
      type: 'object',
      properties: {
        taxminiy_yosh: { type: 'string' },
        teri_rangi:    { type: 'string' },
        teri_turi:     { type: 'string', enum: ['quruq', 'yogli', 'aralash', 'normal', 'sezgir'] },
        ball:          { type: 'integer' },
        xulosa:        { type: 'string' },
      },
      required: ['taxminiy_yosh', 'teri_rangi', 'teri_turi', 'ball', 'xulosa'],
      propertyOrdering: ['taxminiy_yosh', 'teri_rangi', 'teri_turi', 'ball', 'xulosa'],
    },
    muammolar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kalit:        { type: 'string', enum: ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','qora_doira','shishish'] },
          nom:          { type: 'string' },
          foiz:         { type: 'integer' },
          ishonch:      { type: 'integer' },
          zona:         { type: 'string' },
          izoh:         { type: 'string' },
          sabab:        { type: 'string' },
          yechim:       { type: 'string' },
          ogohlantirish:{ type: 'string' },
        },
        required: ['kalit','nom','foiz','ishonch','zona','izoh','sabab','yechim','ogohlantirish'],
        propertyOrdering: ['kalit','nom','foiz','ishonch','zona','izoh','sabab','yechim','ogohlantirish'],
      },
    },
    prognoz: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          muammo:  { type: 'string' },
          natija:  { type: 'string' },
          ehtimol: { type: 'integer' },
          muddat:  { type: 'string' },
        },
        required: ['muammo', 'natija', 'ehtimol', 'muddat'],
        propertyOrdering: ['muammo', 'natija', 'ehtimol', 'muddat'],
      },
    },
    tavsiya: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bosqich:    { type: 'string', enum: ['tozalash','toner','davolash','namlash','himoya','qoshimcha'] },
          product_id: { type: 'integer' },
          sabab:      { type: 'string' },
        },
        required: ['bosqich', 'product_id', 'sabab'],
        propertyOrdering: ['bosqich', 'product_id', 'sabab'],
      },
    },
  },
  required: ['sifat', 'umumiy', 'muammolar', 'prognoz', 'tavsiya'],
  propertyOrdering: ['sifat', 'umumiy', 'muammolar', 'prognoz', 'tavsiya'],
};

function katalogMatni(products) {
  return products.map((p) =>
    `${p.id}|${p.brand ?? ''} ${p.name}|bosqich:${p.step ?? '-'}|muammo:${(p.concerns || []).join(',') || '-'}|teri:${(p.skin_types || []).join(',') || '-'}|faol:${(p.actives || []).join(',') || '-'}`
  ).join('\n');
}

/**
 * Katalogni har safar boshqa tartibda beramiz.
 * Model ro'yxatning boshidagi mahsulotlarga moyil bo'ladi — tartib doim bir xil
 * bo'lsa, hamma bir xil tavsiya oladi va faqat o'sha 3-4 mahsulot sotiladi.
 */
function aralashtir(royxat) {
  const a = [...royxat];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KORSATMA = `Sen — professional kosmetolog-maslahatchi. Yuborilgan rasmni tahlil qilasan.

QADAM 1 — SIFAT NAZORATI (eng muhim, avval shuni bajar):
Rasmni tahlilga yaroqli deb hisoblash uchun BARCHA shartlar bajarilishi kerak:
  - kadrda aniq bitta odam yuzi bor va u kadrning kamida 25% ini egallaydi;
  - yuz tiniq, fokusda, qimirlab ketmagan;
  - yorug'lik yetarli, yuz xususiyatlari ko'rinadi;
  - yuz soch, qo'l, niqob yoki quyuq ko'zoynak bilan yopilmagan;
  - qalin pardoz yoki go'zallik filtri teri holatini yashirmayapti;
  - rasm haqiqiy fotosurat — sun'iy intellekt chizgan, deepfake yoki boshqa
    ekrandan olingan surat emas.

Sun'iylik belgilari: haddan tashqari silliq, teksturasiz teri; nosimmetrik yoki
g'alati quloq/tish/soch chegaralari; fonning mantiqsiz buzilishi; g'ayritabiiy
mukammal yoritish; barmoqlar yoki aksessuarlarning noto'g'ri shakli; teri
teshiklarining butunlay yo'qligi.

Agar kamida bitta shart bajarilmasa: sifat.yaroqli = false, mos sabab kalitini
qo'y, va qolgan bo'limlarni BO'SH qoldir (muammolar: [], prognoz: [], tavsiya: [],
umumiy maydonlarini bo'sh satr / 0 qilib qo'y). Taxmin qilma.

QADAM 2 — faqat sifat yaroqli bo'lsa tahlil qil:
  umumiy.taxminiy_yosh — oraliq, masalan "24-28"
  umumiy.teri_rangi    — o'zbekcha tavsif, masalan "och bug'doyrang, iliq tonli"
  umumiy.teri_turi     — bitta qiymat
  umumiy.ball          — terining umumiy holati 0-100 (100 = ideal)
  umumiy.xulosa        — 1-2 jumlada umumiy holat

QADAM 3 — muammolar. ENG MUHIM QOIDA:
  FAQAT rasmda O'Z KO'ZING BILAN KO'RIB TURGAN narsani yoz.
  Ko'rinmayotgan muammoni O'YLAB TOPMA. Sog'lom teriga "har kimda bo'ladi"
  degan mulohaza bilan muammo qo'shma. Yoshi yoki jinsi bo'yicha taxmin qilma.
  Ro'yxat to'ldirish uchun muammo qo'shish — QAT'IYAN MAN ETILADI.
  Teri toza bo'lsa muammolar ro'yxati bo'sh [] yoki 1 ta bo'lishi mumkin —
  bu MUTLAQO normal va to'g'ri javob. Ko'pi bilan 5 ta.

  Sen kosmetolog-maslahatchisan, SHIFOKOR EMAS. Hech qachon kasallik
  tashxisini qo'yma va kasallik nomini aytma (masalan psoriaz, ekzema,
  demodekoz, rozatsea, allergiya, gormonal kasallik). Faqat KO'RINISHNI
  tasvirla ("qizargan sohalar", "quruq qipiqlanish"). Agar biror narsa
  jiddiy yoki tushunarsiz ko'rinsa — tashxis qo'yma, ogohlantirishda
  "dermatologga ko'rining" deb yoz.

  Har bir muammo uchun:
  nom     — muammoning o'zbekcha nomi, 2-4 so'z
  foiz    — qanchalik ifodalangan, 0-100. Bu SHU muammoning kuchi:
            15-35 arang sezilarli, 40-65 aniq ko'rinadi, 70-90 kuchli.
            Aniq raqam ber, 50 yoki 70 kabi dumaloq sonlarga yopishma.
  ishonch — SEN shu muammoni rasmda ko'rganingga qanchalik ishonasan, 0-100.
            Ikkilansang past baho ber. 60 dan past bo'lgani ko'rsatilmaydi,
            shuning uchun halol baho ber — past ishonch xato emas.
  zona    — teridagi ANIQ joyi: "burun qanotlari va peshona (T-zona)",
            "yonoqlarning yuqori qismi", "iyak va jag' chizig'i". Umumiy
            "yuz" deb yozma.
  izoh    — nima ko'rinayotgani, 1 jumla
  sabab   — nima uchun paydo bo'lgan bo'lishi mumkin, 1 jumla, sodda tilda
            (masalan "yog' bezlari faol ishlaydi va teshiklar tiqiladi")
  yechim  — nima qilish kerak, 1-2 jumla, AMALIY: qanday modda yoki qanday
            odat yordam beradi (mahsulot nomini yozma — u keyingi qadamda)
  ogohlantirish — shu muammoda odam ko'p qiladigan XATO yoki ehtiyot chorasi,
            1 qisqa jumla. Xato yo'q bo'lsa bo'sh satr qoldir.

QADAM 4 — prognoz: FAQAT QADAM 3 da haqiqatan yozgan muammolaring uchun.
  Muammo yo'q bo'lsa prognoz ham bo'sh [] bo'ladi. Yangi muammo kiritma.
  Kasallik nomini bu yerda ham aytma.
  Har bir jiddiy muammo uchun DAVOLANMASA nima bo'lishi mumkin.
  ehtimol: 0-100 oralig'ida foiz — aniq raqam, dumaloq son emas.
  muddat: masalan "6-12 oy". natija: nima bo'lishi, 1 jumla.
  Bu tibbiy tashxis emas — ehtiyotkor til ishlat ("ehtimoli bor", "kuchayishi mumkin").

QADAM 5 — tavsiya: quyidagi katalogdan mahsulot tanla.
  Muammo topilmagan bo'lsa ham parvarish tavsiya qilinadi — lekin sababda
  yo'q muammoni tilga olma, "terini shu holatda saqlash uchun" deb yoz.
  Tartib QAT'IY shunday: tozalash -> toner -> davolash -> namlash -> himoya -> qoshimcha.
  Har bosqichdan ko'pi bilan 1 ta mahsulot, jami 3-5 ta.
  "himoya" (SPF) bosqichini deyarli har doim qo'sh — bu eng muhim bosqich.
  product_id — FAQAT quyidagi ro'yxatdagi raqam. O'zingdan mahsulot o'ylab TOPMA.
  sabab — nima uchun aynan shu mahsulot aynan SHU odamga kerakligini
  1-2 jumlada tushuntir: qaysi muammosiga, tarkibidagi qaysi modda yordam beradi.

Butun javob o'zbek tilida (lotin alifbosida). Faqat JSON qaytar.

KATALOG (id|nom|bosqich|muammolar|teri turlari|faol moddalar):
`;

/**
 * @returns {{yaroqli:boolean, sabab?:string, izoh?:string, natija?:object}}
 */
export async function yuzniTahlilQil(base64, mime, products, eskiTavsiyalar = []) {
  if (!aiBormi()) return { yaroqli: true, natija: oflaynTahlil(products), oflayn: true };

  const eski = eskiTavsiyalar.length
    ? `\n\nSHU ODAMGA AVVAL TAVSIYA QILINGAN (id): ${eskiTavsiyalar.join(', ')}
Iloji bo'lsa BOSHQA mahsulotni tanla — bir xil narsani qayta-qayta tavsiya qilma.
Faqat boshqa mos variant umuman bo'lmasa, eskisini qoldirishing mumkin.`
    : '';

  const parts = [
    { text: KORSATMA + katalogMatni(aralashtir(products)) + eski },
    rasmPart(base64, mime),
  ];

  const javob = await aiJson(parts, SXEMA, { temperature: 0.3, maxTokens: 3000 });

  const sifat = javob?.sifat || {};
  if (!sifat.yaroqli) {
    const sabab = RAD_SABABLARI[sifat.sabab] ? sifat.sabab : 'xira';
    return { yaroqli: false, sabab, izoh: String(sifat.izoh || '').slice(0, 300) };
  }

  return { yaroqli: true, natija: tozala(javob, products), oflayn: false };
}

// ---------- Modeldan kelgan javobni tozalash va tekshirish ----------
const BOSQICH_TARTIB = ['tozalash', 'toner', 'davolash', 'namlash', 'himoya', 'qoshimcha'];

// Model shu chegaradan past ishonch bilan aytgan muammo ko'rsatilmaydi.
const ISHONCH_CHEGARASI = 60;

/**
 * Biz kosmetika sotamiz, tashxis qo'ymaymiz. Model ko'rsatmaga qaramay
 * kasallik nomini aytib qo'ysa — uni matndan olib tashlaymiz va o'rniga
 * shifokorga murojaat qilish tavsiyasini qoldiramiz.
 */
const KASALLIKLAR = /\b(psoriaz\w*|ekzema\w*|dermatit\w*|rozatsea\w*|rozacea\w*|demodekoz\w*|demodex\w*|vitiligo\w*|melanoma\w*|kandidoz\w*|gribok\w*|zamburug\w*|allergi\w*|gormonal kasallik\w*|infeksiya\w*|virus\w*|saraton\w*|o[‘'’]sma\w*)\b/giu;

function kasallikniOlib(matn) {
  if (!KASALLIKLAR.test(matn)) return matn;
  KASALLIKLAR.lastIndex = 0;
  // Kasallik nomi bor jumlani butunlay almashtiramiz — yarim o'chirilgan
  // jumla ("... bo'lishi mumkin") tushunarsiz bo'lib qoladi.
  return 'Aniq sabab uchun dermatologga ko‘rinishni tavsiya qilamiz.';
}

function tozala(javob, products) {
  const karta = new Map(products.map((p) => [p.id, p]));

  const muammolar = (javob.muammolar || []).slice(0, 6).map((m) => {
    const foiz = Math.min(95, Math.max(5, Number(m.foiz) || 30));
    return {
      kalit:  String(m.kalit || '').slice(0, 24),
      nom:    String(m.nom || '').slice(0, 60),
      foiz,
      // Model ishonchni aytmasa (eski javob yoki sxemasiz provayder) —
      // null qoldiramiz va filtrga tushirmaymiz. Aks holda hech qanday
      // muammo ko'rsatilmay qolardi.
      ishonch: m.ishonch == null || Number.isNaN(Number(m.ishonch))
        ? null : Math.min(100, Math.max(0, Number(m.ishonch))),
      // Daraja foizdan kelib chiqadi — ikkalasi hech qachon qarama-qarshi bo'lmaydi
      daraja: foiz >= 70 ? 3 : foiz >= 40 ? 2 : 1,
      zona:   String(m.zona || '').slice(0, 80),
      izoh:   String(m.izoh || '').slice(0, 200),
      sabab:  String(m.sabab || '').slice(0, 220),
      yechim: kasallikniOlib(String(m.yechim || '')).slice(0, 260),
      ogohlantirish: kasallikniOlib(String(m.ogohlantirish || '')).slice(0, 200),
    };
  })
    // Model ikkilangan narsani ko'rsatmaymiz: yo'q muammoni "bor" deb
    // aytgandan ko'ra, bor muammoni aytmagan yaxshiroq.
    .filter((m) => m.nom && (m.ishonch === null || m.ishonch >= ISHONCH_CHEGARASI))
    .sort((a, b) => b.foiz - a.foiz);   // eng kuchlisi birinchi

  // Prognoz faqat ro'yxatda QOLGAN muammolar uchun. Model filtrdan o'tmagan
  // yoki umuman aytilmagan muammo uchun bashorat bergan bo'lsa — tashlanadi.
  const bor = new Set(muammolar.map((m) => m.nom.toLowerCase()));
  const prognoz = (javob.prognoz || []).slice(0, 5).map((p) => ({
    muammo:  String(p.muammo || '').slice(0, 60),
    natija:  kasallikniOlib(String(p.natija || '')).slice(0, 200),
    ehtimol: Math.min(95, Math.max(5, Number(p.ehtimol) || 30)), // 100% deb va'da bermaymiz
    muddat:  String(p.muddat || '').slice(0, 40),
  })).filter((p) => bor.has(p.muammo.toLowerCase()));

  // Faqat katalogda bor mahsulotlar; har bosqichdan bittadan; to'g'ri tartibda
  const korilgan = new Set();
  let tavsiya = (javob.tavsiya || [])
    .map((t) => {
      const p = karta.get(Number(t.product_id));
      if (!p || korilgan.has(p.step)) return null;
      korilgan.add(p.step);
      return { bosqich: p.step || t.bosqich, product_id: p.id, sabab: String(t.sabab || '').slice(0, 300) };
    })
    .filter(Boolean);

  // SPF tushib qolgan bo'lsa — o'zimiz qo'shamiz, bu bosqich tashlab ketilmasligi kerak
  if (!tavsiya.some((t) => t.bosqich === 'himoya')) {
    // Tasodifiy tanlaymiz — hammaga bir xil SPF tushmasin
    const spflar = products.filter((p) => p.step === 'himoya' && p.stock > 0);
    const spf = spflar[Math.floor(Math.random() * spflar.length)];
    if (spf) {
      tavsiya.push({
        bosqich: 'himoya',
        product_id: spf.id,
        sabab: "Quyosh nuri dog', ajin va qarishning asosiy sababi. SPF — natijani saqlab qoladigan yagona bosqich, uni tashlab bo'lmaydi.",
      });
    }
  }

  tavsiya.sort((a, b) => BOSQICH_TARTIB.indexOf(a.bosqich) - BOSQICH_TARTIB.indexOf(b.bosqich));

  const u = javob.umumiy || {};
  return {
    taxminiy_yosh: String(u.taxminiy_yosh || "noma'lum").slice(0, 20),
    teri_rangi:    String(u.teri_rangi || "aniqlanmadi").slice(0, 60),
    teri_turi:     String(u.teri_turi || 'normal').slice(0, 20),
    ball:          Math.min(100, Math.max(0, Number(u.ball) || 60)),
    xulosa:        String(u.xulosa || '').slice(0, 400),
    muammolar, prognoz, tavsiya: tavsiya.slice(0, 5),
  };
}

// ---------- AI kalitsiz zaxira ----------
// Bot AI ishlamay qolganda ham "buzilmasin" degan tamoyil bilan ishlaydi,
// lekin natija "namunaviy" deb aniq belgilanadi.
function oflaynTahlil(products) {
  const tanla = (step) => products.find((p) => p.step === step && p.stock > 0);
  const tavsiya = [];
  for (const [step, sabab] of [
    ['tozalash', "Har qanday parvarish tozalashdan boshlanadi — qolgan vositalar toza teriga yaxshiroq singadi."],
    ['namlash',  "Namlik yetishmasa teri yog'ni ko'proq ishlab chiqaradi, shuning uchun namlash barcha teri turlariga kerak."],
    ['himoya',   "SPF — dog' va erta ajinlarning oldini oladigan eng samarali bitta qadam."],
  ]) {
    const p = tanla(step);
    if (p) tavsiya.push({ bosqich: step, product_id: p.id, sabab });
  }
  return {
    taxminiy_yosh: '—', teri_rangi: '—', teri_turi: 'normal', ball: 0,
    xulosa: "AI tahlili hozir mavjud emas. Quyida barcha teri turlariga mos bazaviy parvarish ko'rsatilgan.",
    muammolar: [], prognoz: [], tavsiya,
  };
}
