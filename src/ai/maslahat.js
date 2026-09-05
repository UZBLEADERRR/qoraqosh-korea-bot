// AI maslahatchi — odam o'z so'zi bilan yozadi, katalogdan javob topiladi.
//
// «Yuz skaneri» rasm talab qiladi; bu yerda esa savol matn bilan keladi:
// «akne ko'p», «soqol olgandan keyin achishadi», «tuk oluvchi bormi».
//
// Uchta narsa muhim:
//  1. Model FAQAT katalogdagi mahsulotni tavsiya qiladi — yo'q narsani
//     o'ylab topsa, odam buyurtma bera olmaydi va ishonch yo'qoladi.
//  2. Ma'lumot yetmasa TAXMIN QILMAYDI, savol beradi. «Krem kerak» degan
//     odamga teri turini bilmay krem tanlash — tavakkal.
//  3. Muammo bosqichma-bosqich parvarish talab qilsa BITTA mahsulot emas,
//     TO'PLAM beradi (tozalash → davolash → namlash). Tizza og'rig'i kabi
//     bitta narsa yetadigan holatda esa bitta mahsulot.
import { aiJson, rasmPart, aiBormi } from './index.js';
import { katalogniTanla } from './katalog-tanlov.js';

const TURLAR = ['javob', 'tavsiya', 'savol', 'yoq', 'tibbiy', 'mavzudan_tashqari'];

// Sxema ataylab YASSI: ichma-ich obyekt va null qiymatlar qat'iy
// json_schema rejimida provayderdan provayderga turlicha ishlaydi.
const SXEMA = {
  type: 'object',
  properties: {
    javob:            { type: 'string' },
    turi:             { type: 'string', enum: TURLAR },
    savol_matn:       { type: 'string' },
    savol_variantlar: { type: 'array', items: { type: 'string' } },
    rasm_kerak:       { type: 'boolean' },
    toplam_nom:       { type: 'string' },
    toplam_izoh:      { type: 'string' },
    tavsiya: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'integer' },
          tartib:     { type: 'integer' },
          bosqich:    { type: 'string' },
          sabab:      { type: 'string' },
          qanday:     { type: 'string' },
        },
        required: ['product_id', 'tartib', 'bosqich', 'sabab', 'qanday'],
        propertyOrdering: ['product_id', 'tartib', 'bosqich', 'sabab', 'qanday'],
      },
    },
    takliflar: { type: 'array', items: { type: 'string' } },
  },
  required: ['javob', 'turi', 'savol_matn', 'savol_variantlar', 'rasm_kerak',
             'toplam_nom', 'toplam_izoh', 'tavsiya', 'takliflar'],
  propertyOrdering: ['javob', 'turi', 'savol_matn', 'savol_variantlar', 'rasm_kerak',
                     'toplam_nom', 'toplam_izoh', 'tavsiya', 'takliflar'],
};

const KORSATMA = `Sen — KiOVO do'konining maslahatchisisan. Odam o'z muammosini
yozadi, sen unga MANA SHU KATALOGDAN mos mahsulot topib berasan va NIMA
QILISH kerakligini tushuntirasan.

═══ QACHON SAVOL BERASAN ═══
Ma'lumot yetmasa TAXMIN QILMA — turi = "savol" qil, savol_matn ga BITTA
aniq savol yoz, savol_variantlar ga 2-4 ta tayyor javob qo'y (odam yozib
o'tirmasin, bosib javob bersin).
Savol berasan, agar bilmasang:
- teri turi (quruq / yog'li / aralash / sezgir) — krem yoki tozalagich so'ralsa
- muammo qayerda va qachon boshlangani — toshma, qichishish, og'riq
- yosh oralig'i — qarishga qarshi vositalarda
- avval nima ishlatgani — allergiya bo'lgan bo'lsa
Rasmdan ko'rish osonroq bo'lsa (toshma, qizarish, dog') rasm_kerak = true
qil va savol_matn da suratga olishni so'ra.
BIR VAQTDA BITTA savol. Uchta savolni ketma-ket bermaysan.
Savol berayotganda tavsiya BO'SH bo'ladi.

═══ ENG MUHIMI: SEN SOTUVCHI EMAS, MASLAHATCHISAN ═══
Har savolga mahsulot tavsiya qilish — eng katta xato. Odam ko'pincha
BILMOQCHI, sotib olmoqchi emas.

turi = "javob" qil va tavsiyani BO'SH qoldir, agar odam so'rasa:
- "nima uchun shunday bo'ladi" (akne nega chiqadi, teri nega quriydi)
- "qanday qilish kerak" (tartib qanday, qaysi bosqich avval)
- "shu mahsulotni qanday ishlataman", "kuniga necha marta"
- "shu ikkitasini birga ishlatsam bo'ladimi"
- "necha kunda natija ko'rinadi"
- "bu tarkib nima qiladi"
- odatlar, ovqat, uyqu, suv haqida
Bunday savolga MAHSULOTSIZ, to'liq va foydali javob ber. Odam
so'ramagan narsani tiqishtirma.

turi = "tavsiya" faqat shunda:
- odam ochiq "nima olay", "tavsiya qiling", "qaysi biri yaxshi",
  "menga nima kerak" desa;
- yoki muammoni aytib, uni HAL QILADIGAN vosita kerakligi aniq bo'lsa
  ("tuk oluvchi bormi", "aknega qarshi nimadir kerak").
Ikkilansang — "javob" qil va oxirida "Xohlasangiz mos mahsulot
tanlab beraman" deb SO'RA, o'zing tiqishtirma.

═══ QACHON TO'PLAM BERASAN ═══
Muammo bosqichma-bosqich parvarish talab qilsa (akne, quruqlik, dog',
ajin, teshiklar) — BITTA mahsulot yetmaydi. To'plam ber:
toplam_nom = "Akne uchun 3 bosqichli parvarish" kabi,
toplam_izoh = 1 jumla nima uchun aynan shu ketma-ketlik,
tavsiya ichida har mahsulotga tartib (1, 2, 3…) va bosqich
(tozalash / toner / davolash / namlash / himoya / qo'shimcha).
Bitta narsa yetadigan holatda (tizza og'rig'iga surtma, tuk oluvchi,
lab balzami) toplam_nom BO'SH qoldiriladi va 1 ta mahsulot beriladi.

═══ TAVSIYA QOIDALARI ═══
- Faqat ro'yxatdagi mahsulot. Ro'yxatda bo'lmagan narsani O'YLAB TOPMA.
  Mos mahsulot yo'q bo'lsa turi = "yoq", tavsiya bo'sh, ochiq ayt.
- 1 tadan 5 tagacha mahsulot.
- sabab: NEGA aynan shu mahsulot aynan SHU odamga, 1 jumla, tarkibidagi
  qaysi modda yordam berishini ayt.
- qanday: qachon va qanday ishlatiladi, 1 qisqa jumla
  ("Ertalab va kechqurun, ho'l yuzga aylantirib surting").

═══ JAVOB MATNI (javob maydoni) ═══
Chatda o'qiladi. Shu belgilardan foydalan:
- "## Sarlavha" — kichik bo'lim sarlavhasi (2 tadan ko'p bo'lmasin)
- "• " bilan boshlangan qator — ro'yxat bandi
- "1. " bilan boshlangan qator — tartibli qadam
- **qalin** — muhim so'z yoki modda nomi
- "> " bilan boshlangan qator — DIQQAT qilinadigan bitta jumla
- Emoji: har sarlavhaga BITTA, matn ichida ishlatma.

Tuzilishi:
1) 1-2 jumla — muammoning MOHIYATI (nega shunday bo'ladi).
2) "## Nima qilish kerak" — aniq qadamlar, ro'yxat bilan.
3) Kerak bo'lsa "> " bilan bitta ogohlantirish yoki muhim eslatma.

Uzunlik: turi = "javob" bo'lsa 150 so'zgacha (batafsil tushuntir),
turi = "tavsiya" bo'lsa 70 so'zgacha (mahsulotlar o'zi gapiradi).
Sotuvchi tili emas — do'stona, "siz" deb murojaat qil.

═══ SOG'LIQ ═══
Og'riq, jarohat, yallig'lanish, allergiya, teri kasalligi haqida so'ralsa
turi = "tibbiy". Dori tavsiya QILMA, tashxis qo'yma, shifokorga borishni
ayt. Katalogda parvarish uchun mos narsa bo'lsa "davo emas, parvarish"
deb qo'shsang bo'ladi.
Foydalanuvchining allergiyasi yoki kasalligi ko'rsatilgan bo'lsa — unga
to'g'ri kelmaydigan tarkibli mahsulotni TAVSIYA QILMA.

Kosmetika va parvarishga umuman aloqasi yo'q savol (telefon, taksi):
turi = "mavzudan_tashqari", muloyim rad et.

takliflar: odam keyin bosishi mumkin bo'lgan 2-3 ta qisqa savol
(har biri 5 so'zgacha).

Butun javob O'ZBEK tilida (lotin alifbosida). Faqat JSON qaytar.

KATALOG (id|brend nom|bosqich|muammo|teri|faol modda|narx):
`;

// Bo'sh maydonga «-» yozish behuda: modelga hech nima bermaydi,
// lekin har qatorda bir necha belgi yeydi. Ustun O'RNI saqlanadi —
// bo'sh joy shunchaki bo'sh qoladi, aks holda ustunlar surilib
// ketadi va model muammoni teri turi deb o'qiydi.
const katalogMatni = (products) => products.map((p) => [
  p.id,
  `${p.brand ? p.brand + ' ' : ''}${p.nom_uz || p.name}`,
  p.step || '',
  (p.concerns || []).join(','),
  (p.skin_types || []).join(','),
  (p.actives || []).join(','),
  p.price,
].join('|')).join('\n');

/** Foydalanuvchi haqida bilganimiz — tavsiya shunga moslashadi. */
function profilMatni(profil = {}) {
  const q = [];
  if (profil.age) q.push(`yosh: ${profil.age}`);
  if (profil.teri_turi) q.push(`teri turi: ${profil.teri_turi}`);
  if (profil.allergiya) q.push(`ALLERGIYA: ${profil.allergiya}`);
  if (profil.kasallik) q.push(`kasallik: ${profil.kasallik}`);
  return q.length ? `\n\nMIJOZ HAQIDA (shuni hisobga ol): ${q.join('; ')}` : '';
}

// Nechta mahsulot yuboriladi. Katalog shundan kichik bo'lsa hammasi
// ketadi — tanlash faqat katta katalogda ma'noga ega.
const KATALOG_CHEGARA = Number(process.env.MASLAHAT_KATALOG) > 0
  ? Number(process.env.MASLAHAT_KATALOG) : 60;

// Suhbat tarixi ham promptga kiradi va u BIR TEKIS o'sib boradi:
// yigirmanchi xabarda tarix katalogdan uzunroq bo'lib qolishi mumkin.
// Shuning uchun ikki tomondan cheklaymiz — nechta xabar va jami
// qancha belgi. Eng oxirgi xabarlar to'liq qoladi: kontekst uchun
// aynan ular kerak.
const TARIX_XABAR = 8;
const TARIX_BELGI = 1400;

function tarixMatni(tarix) {
  if (!tarix.length) return '';
  const olingan = [];
  let jami = 0;
  for (const x of tarix.slice(-TARIX_XABAR).reverse()) {
    const matn = String(x.matn || '').slice(0, 300);
    if (!matn) continue;
    if (jami + matn.length > TARIX_BELGI && olingan.length >= 2) break;
    jami += matn.length;
    olingan.unshift(`${x.kim === 'ai' ? 'Maslahatchi' : 'Mijoz'}: ${matn}`);
  }
  if (!olingan.length) return '';
  return '\n\nOLDINGI SUHBAT (eng oxirgisi pastda — kontekstni saqla, '
    + 'allaqachon so‘ralgan narsani qayta so‘rama):\n' + olingan.join('\n');
}

/**
 * @param {string} savol      odam yozgani
 * @param {Array}  products   katalog
 * @param {object} [o]
 * @param {Array}  [o.tarix]  [{kim:'odam'|'ai', matn}] — oldingi suhbat
 * @param {object} [o.profil] {age, teri_turi, allergiya, kasallik}
 * @param {string} [o.rasm]   base64 surat (odam chatga rasm biriktirsa)
 * @param {string} [o.mime]
 */
export async function maslahatBer(savol, products, o = {}) {
  if (!aiBormi()) throw Object.assign(new Error('AI kaliti yo‘q'), { turkum: 'kalit' });

  const tarix = Array.isArray(o.tarix) ? o.tarix : [];
  const oldingi = tarixMatni(tarix);

  // Butun katalog emas, savolga MOS qismi. Kichik katalogda hammasi
  // ketaveradi, kattasida esa faqat kerakli qismi — token va vaqt
  // shunda tejaladi.
  const { royxat, jami, tanlandi } = katalogniTanla(products, {
    savol, tarix, profil: o.profil, chegara: o.katalogChegarasi ?? KATALOG_CHEGARA,
  });

  const parts = [{
    text: `${KORSATMA}${katalogMatni(royxat)}${profilMatni(o.profil)}${oldingi}`
        + `\n\nMIJOZ SAVOLI: ${savol}`,
  }];
  if (o.rasm) parts.push(rasmPart(o.rasm, o.mime || 'image/jpeg'));

  // Tejash o'lchanadigan bo'lsin: nima yuborilgani logga tushadi
  const belgi = parts[0].text.length;
  if (tanlandi < jami) {
    console.log(`Maslahat: katalogdan ${tanlandi}/${jami} ta yuborildi (${belgi} belgi)`);
  }

  const j = await aiJson(parts, SXEMA, { temperature: 0.5, maxTokens: 3072, qayerda: 'maslahat' });

  const bor = new Map(products.map((p) => [p.id, p]));
  const s = (v, n) => String(v ?? '').slice(0, n);
  const turi = TURLAR.includes(j.turi) ? j.turi : 'tavsiya';

  // Model o'ylab topgan id larni TASHLAYMIZ — savatga solib bo'lmaydigan
  // mahsulotni ko'rsatish eng yomon tajriba
  const tavsiya = (Array.isArray(j.tavsiya) ? j.tavsiya : [])
    .filter((t) => bor.has(Number(t.product_id)))
    .map((t, i) => ({
      product_id: Number(t.product_id),
      tartib:  Number.isFinite(Number(t.tartib)) ? Number(t.tartib) : i + 1,
      bosqich: s(t.bosqich, 20),
      sabab:   s(t.sabab, 220),
      qanday:  s(t.qanday, 220),
    }))
    .sort((a, b) => a.tartib - b.tartib)
    .slice(0, 5);

  const variantlar = (Array.isArray(j.savol_variantlar) ? j.savol_variantlar : [])
    .map((x) => s(x, 40)).filter(Boolean).slice(0, 4);

  return {
    javob: s(j.javob, 1400) || 'Savolingizni boshqacharoq yozib ko‘ring.',
    turi,
    // Savol bo'lsa tavsiya ko'rsatilmaydi: odam avval javob bersin
    savol: turi === 'savol'
      ? { matn: s(j.savol_matn, 220), variantlar, rasm_kerak: j.rasm_kerak === true }
      : null,
    // To'plam faqat bir nechta mahsulot bo'lganda ma'noga ega
    toplam: (j.toplam_nom && tavsiya.length > 1)
      ? { nom: s(j.toplam_nom, 80), izoh: s(j.toplam_izoh, 220) }
      : null,
    // "javob" — sof maslahat: mahsulot ko'rsatilmaydi, aks holda har
    // savol sotuvga aylanadi va maslahatchiga ishonch qolmaydi
    tavsiya: (turi === 'savol' || turi === 'javob') ? [] : tavsiya,
    takliflar: (Array.isArray(j.takliflar) ? j.takliflar : [])
      .map((x) => s(x, 44)).filter(Boolean).slice(0, 3),
  };
}
