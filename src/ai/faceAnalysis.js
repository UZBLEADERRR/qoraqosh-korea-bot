// Yuz tahlili: SIFAT NAZORATI -> tahlil -> bosqichma-bosqich tavsiya.
// Bitta Gemini chaqiruvi: modelga katalogning ixcham ro'yxati ham beriladi,
// shuning uchun u mavjud bo'lmagan mahsulotni "o'ylab topa olmaydi".
// Qaytgan id'lar baribir katalogga solishtirib tekshiriladi.
import { aiJson, rasmPart, aiBormi } from './index.js';
import { OLCHOV_KALITLARI, olchovlarniTozala } from '../lib/olchov.js';

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
        jins:          { type: 'string', enum: ['erkak', 'ayol', 'nomalum'] },
        teri_rangi:    { type: 'string' },
        teri_turi:     { type: 'string', enum: ['quruq', 'yogli', 'aralash', 'normal', 'sezgir'] },
        ball:          { type: 'integer' },
        // «Men rasmda nimani ko'rdim» — odam o'z suratini tanishi uchun
        tavsif:        { type: 'string' },
        xulosa:        { type: 'string' },
      },
      required: ['taxminiy_yosh', 'jins', 'teri_rangi', 'teri_turi', 'ball', 'tavsif', 'xulosa'],
      propertyOrdering: ['taxminiy_yosh', 'jins', 'teri_rangi', 'teri_turi', 'ball',
                         'tavsif', 'xulosa'],
    },
    // YETTITA O'LCHOV — har tahlilda to'liq, muammo bor-yo'qligidan
    // qat'i nazar. Ilgari ko'rsatkichlar topilgan muammolardan
    // yasalardi: terisi toza odam bitta ham ko'rsatkich ko'rmasdi va
    // ikki tahlilni solishtirib bo'lmasdi.
    olchovlar: {
      type: 'object',
      properties: Object.fromEntries(
        OLCHOV_KALITLARI.map((k) => [k, { type: 'integer' }])),
      required: [...OLCHOV_KALITLARI],
      propertyOrdering: [...OLCHOV_KALITLARI],
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
          bosqich:    { type: 'string', enum: ['tozalash','toner','davolash','namlash','himoya','qoshimcha','ichki'] },
          product_id: { type: 'integer' },
          sabab:      { type: 'string' },
        },
        required: ['bosqich', 'product_id', 'sabab'],
        propertyOrdering: ['bosqich', 'product_id', 'sabab'],
      },
    },
    // Ovqatlanish — teri holatiga tashqi parvarishdan kam ta'sir
    // qilmaydi, lekin mijoz buni hech qayerda o'qimaydi. Kartochkada
    // ikki ustun bo'lib chiqadi: nima foydali, nimani cheklash kerak.
    parhez: {
      type: 'object',
      properties: {
        foydali:  { type: 'array', items: { type: 'string' } },
        cheklang: { type: 'array', items: { type: 'string' } },
        izoh:     { type: 'string' },
      },
      required: ['foydali', 'cheklang', 'izoh'],
      propertyOrdering: ['foydali', 'cheklang', 'izoh'],
    },
  },
  required: ['sifat', 'umumiy', 'olchovlar', 'muammolar', 'prognoz', 'tavsiya', 'parhez'],
  propertyOrdering: ['sifat', 'umumiy', 'olchovlar', 'muammolar', 'prognoz',
                     'tavsiya', 'parhez'],
};

function katalogMatni(products) {
  return products.map((p) =>
    `${p.id}|${p.brand ?? ''} ${p.nom_uz || p.name}|bosqich:${p.step ?? '-'}|muammo:${(p.concerns || []).join(',') || '-'}|teri:${(p.skin_types || []).join(',') || '-'}|faol:${(p.actives || []).join(',') || '-'}`
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

QADAM 1 — SIFAT NAZORATI (eng muhim, avval shuni bajar).

ASOSIY QOIDA: IKKILANSANG — RAD ET. Yaroqsiz rasmni tahlil qilgandan ko'ra,
yaxshi rasmni qayta so'ragan ming marta afzal: xira rasmdan chiqqan "tahlil"
o'ylab topilgan bo'ladi va odam bizga boshqa ishonmaydi.

Rasmni tahlilga yaroqli deb hisoblash uchun BARCHA shartlar bajarilishi kerak:
  - kadrda aniq bitta odam yuzi bor va u kadrning kamida 25% ini egallaydi;
  - yuz tiniq, fokusda, qimirlab ketmagan;
  - yorug'lik yetarli, yuz xususiyatlari ko'rinadi;
  - yuz soch, qo'l, niqob yoki quyuq ko'zoynak bilan yopilmagan;
  - qalin pardoz yoki go'zallik filtri teri holatini yashirmayapti;
  - rasm haqiqiy fotosurat — sun'iy intellekt chizgan, deepfake yoki boshqa
    ekrandan olingan surat emas.

XIRALIK — eng ko'p uchraydigan sabab. Teri TEKSTURASI ko'rinmasa rasm xira
hisoblanadi. Tekshir: teri teshiklari, mayda tuklar, ajin chiziqlari va teri
donadorligi ajralib turadimi? Ko'z kiprigi va qosh tuklari alohida-alohida
ko'rinadimi? Agar yo'q bo'lsa — sabab "xira", yaroqli = false. Yuz umumiy
tanilsa ham bu yetarli EMAS: biz odamni emas, TERINI ko'rishimiz kerak.
Rasm kichik (masalan 400 pikseldan tor) yoki kuchli siqilgan bo'lsa ham xira.

SUN'IYLIK (AI, deepfake, filtr) belgilari: haddan tashqari silliq, teksturasiz
teri; teri teshiklarining butunlay yo'qligi; g'alati yoki nosimmetrik
quloq/tish/soch/ko'z chegaralari; fonning mantiqsiz buzilishi; g'ayritabiiy
mukammal yoritish va soyalarning mos kelmasligi; barmoqlar yoki aksessuarlarning
noto'g'ri shakli; plastikdek yaltiroq yuz; ko'zlarning bir xil aks etishi;
sochning fonga "erib" ketishi. IKKITA yoki undan ko'p belgi bo'lsa — "sunday".
Bitta kuchli belgi (masalan teri teshiklari umuman yo'q) ham yetarli.

ishonch — rasm YAROQLI ekaniga qanchalik ishonasan, 0-100. Ikkilansang past ber.

Agar kamida bitta shart bajarilmasa: sifat.yaroqli = false, mos sabab kalitini
qo'y, va qolgan bo'limlarni BO'SH qoldir (muammolar: [], prognoz: [], tavsiya: [],
umumiy maydonlarini bo'sh satr / 0 qilib qo'y). Taxmin qilma.

QADAM 2 — faqat sifat yaroqli bo'lsa tahlil qil:
  umumiy.taxminiy_yosh — oraliq, masalan "24-28"
  umumiy.jins          — "erkak", "ayol" yoki "nomalum".
                         TAXMIN, aniq hukm emas. Ishonching bo'lmasa
                         "nomalum" qo'y — noto'g'ri aytgandan ko'ra
                         aytmagan yaxshi. Bu faqat parvarishni
                         moslashtirish uchun: erkak terisi qalinroq,
                         yog' ko'proq ishlab chiqadi va soqol olish
                         qirilishi (aftershave qichishishi, ichkariga
                         o'sgan tuk) qo'shimcha muammo bo'ladi.
  umumiy.teri_rangi    — o'zbekcha tavsif, masalan "och bug'doyrang, iliq tonli"
  umumiy.teri_turi     — bitta qiymat
  umumiy.ball          — terining umumiy holati 0-100 (100 = ideal)
  umumiy.tavsif        — «MEN RASMDA NIMA KO'RYAPMAN», 1-2 qisqa jumla.
                         Odam o'z suratini tanishi uchun: bu tahlil
                         AYNAN uning rasmidan chiqqaniga ishonch hosil
                         qilsin. KO'ZGA TASHLANADIGAN belgilarni ayt:
                         ko'zoynak, zirak, quloqchin, soqol, soch
                         turmagi, bosh kiyim, yuz burilishi, yoritish.
                         Masalan: «Ko'zoynak taqqan, qulog'ida simsiz
                         quloqchin bor yigit. Yuz yarim burilgan, tabiiy
                         yorug'likda olingan surat.»
                         TAQIQ: odamni TANIMA va ismini aytma, mashhur
                         odamga o'xshatma, millat/irq/din haqida gapirma,
                         tashqi ko'rinishiga baho berma (chiroyli,
                         xunuk). Faqat KO'RINAYOTGAN, neytral tafsilot.

QADAM 2b — O'LCHOVLAR. Yettita ko'rsatkichning HAMMASIGA baho ber,
  muammo bor-yo'qligidan qat'i nazar. Bu qism HECH QACHON bo'sh
  qolmaydi (sifat yaroqsiz bo'lgan holdan tashqari).

  olchovlar.pora     — teri teshiklarining holati
  olchovlar.ajin     — ajin va elastiklik
  olchovlar.pigment  — dog', pigment, ton tekisligi
  olchovlar.qizarish — qizarish va sezgirlik
  olchovlar.tekstura — teri yuzasining silliqligi, relef
  olchovlar.namlik   — namlanganlik darajasi
  olchovlar.yoglilik — yog' muvozanati

  HAR BIRI 0-100 va QANCHA YUQORI BO'LSA SHUNCHA YAXSHI:
  100 — muammo umuman yo'q, 85 — a'lo, 70 — yaxshi, 55 — o'rtacha,
  40 — e'tibor kerak, 25 — zaif. Ya'ni «yog'lilik 30» degani teri
  JUDA YOG'LI degani, «yog'lilik 85» esa yog' muvozanati yaxshi.

  Aniq raqam ber — 50, 60, 70 kabi dumaloq sonlardan qoch.
  Hamma ko'rsatkichga bir xil raqam qo'yma: teri hech qachon hamma
  o'lchovda bir xil bo'lmaydi.

  MUHIM: o'lchov QADAM 3 dagi muammolar bilan ZIDDIYATSIZ bo'lsin.
  Kuchli akne yozib «tekstura: 90» deb qo'yma. Aksincha ham: o'lchovi
  past bo'lsa (masalan pora 35), rasmda haqiqatan ko'rinayotgan
  bo'lsa, uni QADAM 3 da muammo qilib ham yoz.

QADAM 3 — muammolar. ENG MUHIM QOIDA:
  FAQAT rasmda O'Z KO'ZING BILAN KO'RIB TURGAN narsani yoz.
  Ko'rinmayotgan muammoni O'YLAB TOPMA. Sog'lom teriga "har kimda bo'ladi"
  degan mulohaza bilan muammo qo'shma. «Shu yoshda odatda…» yoki
  «erkaklarda ko'pincha…» deb MUAMMO qo'shma — faqat ko'rinayotgani.
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
  Tartib QAT'IY shunday: tozalash -> toner -> davolash -> namlash -> himoya
  -> qoshimcha -> ichki.

  TO'LIQ TO'PLAM ber. Katalogda mos mahsulot bo'lsa quyidagi TO'RT bosqich
  har doim bo'lishi kerak: tozalash, namlash, himoya va muammoga qarab
  davolash. Yarim to'plam parvarish emas — odam nimadan boshlashni
  bilmay qoladi.
  SONI TERI HOLATIGA QARAB bo'lsin, oldindan belgilangan emas: yengil
  holatda 3-4 ta yetadi, ko'p muammo topilsa 6-8, og'ir holatda 10 tagacha.
  Kam qilib qisqartirma — odam yetishmagan bosqichni o'zi topa olmaydi.
  Bir bosqichda ikkita mahsulot faqat ular BIR-BIRINI TO'LDIRSA bo'ladi
  (masalan kunduzgi va kechki krem, yoki nuqtaviy vosita + umumiy krem);
  bir xil vazifani bajaradigan ikkita mahsulotni qo'shma.
  "himoya" (SPF) bosqichini deyarli har doim qo'sh — bu eng muhim bosqich.

  "ichki" — ICHKI QABUL qilinadigan qo'shimcha (kollagen, jenshen, vitamin,
  biotin). U tashqi parvarish tartibiga kirmaydi va MAJBURIY EMAS. Faqat
  shu shartlar bajarilganda qo'sh:
    - katalogda "ichki" bosqichdagi mahsulot bor;
    - topilgan muammo unga mantiqan bog'liq (ajin va elastiklik yo'qolishi
      — kollagen; xiralik va charchoq — vitamin; quruqlik — ichimlik rejimi).
  Bir nechta ichki qabul mahsuloti mos kelsa, ikkitasigacha qo'shsa bo'ladi.
  Bog'lanmasa qo'shma. Va sababda uni DAVO deb atama: "parvarishni ichkaridan
  qo'llab-quvvatlaydi" degan ma'noda yoz — biz shifokor emasmiz.

  product_id — FAQAT quyidagi ro'yxatdagi raqam. O'zingdan mahsulot o'ylab TOPMA.
  sabab — nima uchun aynan shu mahsulot aynan SHU odamga kerakligini
  1-2 jumlada tushuntir: qaysi muammosiga, tarkibidagi qaysi modda yordam beradi.

QADAM 6 — parhez: OVQATLANISH tavsiyasi.
  Teri holatiga ovqat ham ta'sir qiladi, lekin mijoz buni hech qayerda
  o'qimaydi. Aynan SHU odamning topilgan muammolariga bog'lab yoz.
  Muammo topilmagan bo'lsa ham terini shu holatda saqlaydigan
  ovqatlanishni yoz.

  parhez.foydali  — 3-5 ta band. Har biri QISQA: 3-6 so'z, mahsulot
                    yoki odat + qavs ichida nima berishi. Masalan
                    "Yog'li baliq (omega-3, yallig'lanishni kamaytiradi)".
  parhez.cheklang — 3-5 ta band, xuddi shu ko'rinishda. Masalan
                    "Shirin ichimlik (yog' bezlarini kuchaytiradi)".
  parhez.izoh     — 1 jumla umumiy maslahat (masalan suv rejimi).

  QAT'IY MAN: parhez emas, DAVO buyurma. Dori, vitamin dozasi,
  "shuni ichsangiz tuzaladi" degan gap yozma. Ochlik yoki qattiq
  cheklov (kaloriya, ochlik kunlari) tavsiya qilma — biz shifokor
  emasmiz. Faqat oddiy, xavfsiz, kundalik ovqatlanish maslahati.

Butun javob o'zbek tilida (lotin alifbosida). Faqat JSON qaytar.
`;

// Katalog sarlavhasi ALOHIDA: do'kon egasining qo'shimcha ko'rsatmasi
// undan OLDIN qo'yiladi. Uzun mahsulot ro'yxatidan keyin yozilgan gap
// modelning ko'zidan qochadi.
const KATALOG_SARLAVHA = '\nKATALOG (id|nom|bosqich|muammolar|teri turlari|faol moddalar):\n';

/**
 * @returns {{yaroqli:boolean, sabab?:string, izoh?:string, natija?:object}}
 */
export async function yuzniTahlilQil(base64, mime, products, eskiTavsiyalar = [],
                                    qoshimcha = '') {
  if (!aiBormi()) return { yaroqli: true, natija: oflaynTahlil(products), oflayn: true };

  const eski = eskiTavsiyalar.length
    ? `\n\nSHU ODAMGA AVVAL TAVSIYA QILINGAN (id): ${eskiTavsiyalar.join(', ')}
Iloji bo'lsa BOSHQA mahsulotni tanla — bir xil narsani qayta-qayta tavsiya qilma.
Faqat boshqa mos variant umuman bo'lmasa, eskisini qoldirishing mumkin.`
    : '';

  // Do'kon egasi admin paneldan qo'shimcha ko'rsatma bergan bo'lsa u
  // katalogdan OLDIN qo'yiladi: uzun katalog ro'yxatidan keyin
  // yozilgan gap modelning ko'zidan qochadi.
  const qosh = String(qoshimcha || '').trim()
    ? `\nDO'KON EGASINING QO'SHIMCHA KO'RSATMASI (yuqoridagi qoidalarni
BUZMAYDI — ular kuchda qoladi):\n${String(qoshimcha).trim().slice(0, 1200)}\n`
    : '';

  const parts = [
    { text: KORSATMA + qosh + KATALOG_SARLAVHA + katalogMatni(aralashtir(products)) + eski },
    rasmPart(base64, mime),
  ];

  const javob = await aiJson(parts, SXEMA, { temperature: 0.3, maxTokens: 8000, qayerda: 'skaner' });

  const sifat = javob?.sifat || {};
  if (!sifat.yaroqli) {
    const sabab = RAD_SABABLARI[sifat.sabab] ? sifat.sabab : 'xira';
    return { yaroqli: false, sabab, izoh: String(sifat.izoh || '').slice(0, 300) };
  }
  // Model "yaroqli" desa ham ikkilanib turgan bo'lsa qabul qilmaymiz.
  // Chala rasmdan chiqqan tahlil ishonchni yo'qotadi — qayta so'ragan afzal.
  const sifatIshonch = Number(sifat.ishonch);
  if (Number.isFinite(sifatIshonch) && sifatIshonch < SIFAT_CHEGARASI) {
    return { yaroqli: false, sabab: 'xira',
             izoh: String(sifat.izoh || '').slice(0, 300) };
  }

  return { yaroqli: true, natija: tozala(javob, products), oflayn: false };
}

// ---------- Modeldan kelgan javobni tozalash va tekshirish ----------
// «ichki» eng oxirida: u parvarish tartibining bir qismi emas, qo'shimcha
const BOSQICH_TARTIB = ['tozalash', 'toner', 'davolash', 'namlash', 'himoya', 'qoshimcha', 'ichki'];

// Model shu chegaradan past ishonch bilan aytgan muammo ko'rsatilmaydi.
const ISHONCH_CHEGARASI = 60;

// Rasm sifatiga shundan past ishonch bo'lsa tahlil qilinmaydi.
const SIFAT_CHEGARASI = 70;

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

  const muammolar = (javob.muammolar || []).slice(0, 8).map((m) => {
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

  // Parhez: qisqa bandlar, dori-darmon va ochlik maslahatisiz
  const parhezBand = (r) => (Array.isArray(r) ? r : [])
    .map((x) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, 60))
    .filter(Boolean)
    .filter((x) => !PARHEZ_TAQIQ.test(x))
    .slice(0, 5);
  const parhez = {
    foydali:  parhezBand(javob.parhez?.foydali),
    cheklang: parhezBand(javob.parhez?.cheklang),
    izoh:     String(javob.parhez?.izoh || '').slice(0, 160),
  };

  const u = javob.umumiy || {};
  return {
    // Yettita o'lchov. Model bermasa null — keyin muammolardan
    // hisoblanadi (`olchovlarniHisobla`), shuning uchun ekranda
    // baribir to'liq yettitasi chiqadi.
    olchovlar: olchovlarniTozala(javob.olchovlar),
    taxminiy_yosh: String(u.taxminiy_yosh || "noma'lum").slice(0, 20),
    jins: ['erkak', 'ayol'].includes(u.jins) ? u.jins : 'nomalum',
    teri_rangi:    String(u.teri_rangi || "aniqlanmadi").slice(0, 60),
    teri_turi:     String(u.teri_turi || 'normal').slice(0, 20),
    ball:          Math.min(100, Math.max(0, Number(u.ball) || 60)),
    tavsif:        kasallikniOlib(String(u.tavsif || '')).slice(0, 240),
    xulosa:        String(u.xulosa || '').slice(0, 400),
    // Tavsiya soni TERI HOLATIGA qarab: 10 tagacha to'liq to'plam
    muammolar, prognoz, tavsiya: tavsiya.slice(0, 10), parhez,
  };
}

// Parhez bandida bo'lmasligi kerak bo'lgan gaplar: biz shifokor
// emasmiz va dori yoki ochlik buyurmaymiz.
const PARHEZ_TAQIQ = /\b(dori|tabletka|antibiotik|retinoid|izotretinoin|dozas|mg\b|ochlik|och qol|kaloriyani keskin|davolay|shifobaxsh dori)/i;

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
    taxminiy_yosh: '—', jins: 'nomalum', teri_rangi: '—', teri_turi: 'normal', ball: 0,
    tavsif: '',
    xulosa: "AI tahlili hozir mavjud emas. Quyida barcha teri turlariga mos bazaviy parvarish ko'rsatilgan.",
    olchovlar: null, muammolar: [], prognoz: [], tavsiya,
    parhez: { foydali: [], cheklang: [], izoh: '' },
  };
}
