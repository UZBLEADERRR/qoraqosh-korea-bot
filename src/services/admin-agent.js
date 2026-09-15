// Admin agentining boshqaruvchisi.
//
// Model qadam tanlaydi, biz bajaramiz, natijani qaytaramiz — shu
// aylanada. Aylana ikki joyda to'xtaydi:
//   • model «javob» desa — ish tugadi;
//   • YOZISH vositasi tanlansa — bajarmaymiz, adminga TAKLIF
//     ko'rsatamiz va tasdiq kutamiz.
//
// Nega tasdiq shart. Bu agent jonli do'konni boshqaradi: bitta
// noto'g'ri tushunilgan jumla katalogni yo'q qilishi mumkin. Tasdiq —
// modelga ishonchsizlik emas, qaytarib bo'lmaydigan amal oldidagi
// oddiy ehtiyot. O'qish esa erkin: undan zarar yo'q.
import crypto from 'node:crypto';
import { keyingiQadam } from '../ai/admin-agent.js';
import { vositaniBajar, yozishmi, oldindanSoni, VOSITALAR } from './admin-vositalar.js';

// Bitta savolga nechta qadam. Cheksiz aylana model chalkashsa
// kvotani yeb qo'yadi va admin javobni kutib qoladi. Lekin chegara
// KICHIK bo'lsa ham yomon: admin bir xabarda uchta ish so'rasa
// («toifasini o'zgartir, takrorlarni tozala, narxni ko'tar») agent
// birinchisidayoq to'xtab qolardi.
const MAKS_QADAM = 12;

// Tasdiq kutayotgan rejalar. Xotirada — server qayta ko'tarilsa
// bekor bo'ladi va bu TO'G'RI: eski taklifni ko'r-ko'rona bajarish
// eng xavfli holat.
const rejalar = new Map();
const REJA_MS = 10 * 60_000;

function rejaniSaqla(qadamlar) {
  const token = crypto.randomBytes(18).toString('base64url');
  rejalar.set(token, { qadamlar, vaqt: Date.now() });
  for (const [k, v] of rejalar) if (Date.now() - v.vaqt > REJA_MS) rejalar.delete(k);
  return token;
}

/**
 * Model «qildim» deb yozdimi?
 *
 * Model matn yozadi, biz esa amalni bajaramiz. Ikkalasi bir narsa
 * emas: model «takrorlarni o'chirdim» deb yozishi, lekin hech qanday
 * yozish vositasini tanlamagan bo'lishi mumkin. Admin javobga ishonib
 * ketadi, mahsulot esa joyida turaveradi — aynan shu bo'lgan.
 * Shuning uchun DA'VO tekshiriladi.
 */
const DAVO = /(o[‘'`ʻ]?chir|yop|o[‘'`ʻ]?zgartir|bajar|qo[‘'`ʻ]?sh|saqla|tozala|tahrirla)(dim|ldi|di|ndi)\b/i;

/**
 * Savolga javob beradi yoki reja taklif qiladi.
 *
 * @param {string} savol
 * @param {Array}  tarix  [{kim:'admin'|'ai', matn}]
 * @param {Array}  [rasmlar] [{base64, mime}] — admin biriktirgan suratlar
 */
export async function agentJavobi(savol, tarix = [], rasmlar = [], kuzat = null) {
  // `kuzat` — har qadamda chaqiriladi. Admin agent NIMA ustida
  // ishlayotganini jonli ko'rsin: ilgari u faqat aylanayotgan
  // nuqtalarni ko'rar va necha soniya kutishini bilmasdi.
  const xabarBer = (holat) => { try { kuzat?.(holat); } catch { /* jim */ } };
  const qadamlar = [];
  // Yozish vositalari DARROV bajarilmaydi — shu yerga yig'iladi va
  // oxirida BITTA taklif bo'lib ko'rsatiladi. Shunda admin bir
  // xabarda bir necha ish so'rasa ham hammasi bajariladi.
  const yoziladigan = [];
  // Grafiklar — model chizishni so'ragan, biz esa javob bilan birga
  // adminga uzatamiz
  const grafiklar = [];
  let javob = null;
  let takliflar = [];

  for (let i = 0; i < MAKS_QADAM; i++) {
    xabarBer({ qadam: i + 1, holat: 'oylayapti', matn: 'O‘ylayapti…' });
    const q = await keyingiQadam(savol, qadamlar, tarix, rasmlar);

    if (q.amal === 'javob') { javob = q.javob; takliflar = q.takliflar; break; }

    // Model o'z fikrini yozadi — admin uni ko'rsa nima bo'layotgani
    // tushunarli bo'ladi
    xabarBer({ qadam: i + 1, holat: 'ishlayapti', vosita: q.vosita,
      matn: q.fikr || `${q.vosita} bajarilmoqda…` });

    if (!VOSITALAR[q.vosita]) {
      qadamlar.push({ vosita: q.vosita, argumentlar: q.argumentlar,
        natija: { xato: `Bunday vosita yo‘q. Mavjudlari: ${Object.keys(VOSITALAR).join(', ')}` } });
      continue;
    }

    // ── YOZISH: navbatga qo'yamiz va ISHNI DAVOM ETTIRAMIZ ──
    if (yozishmi(q.vosita)) {
      yoziladigan.push({
        vosita: q.vosita,
        argumentlar: q.argumentlar,
        izoh: q.reja_izoh || VOSITALAR[q.vosita].tavsif,
        // Son TAXMIN qilinmaydi — bazadan sanaladi. Ilgari har qanday
        // ommaviy amal «1 ta yozuv» bo'lib ko'rinardi.
        soni: await oldindanSoni(q.vosita, q.argumentlar),
        qaytarib_bolmaydi: q.vosita === 'mahsulot_ochir',
      });
      // Modelga aytamiz: bu HALI bajarilmadi, davom et
      qadamlar.push({
        vosita: q.vosita, argumentlar: q.argumentlar,
        natija: { holat: 'tasdiq_kutmoqda',
          eslatma: 'Bu amal navbatga qo‘yildi va admin tasdiqlagach bajariladi. '
                 + 'Sen uni BAJARILDI deb yozma. Boshqa ish qolgan bo‘lsa davom et.' },
      });
      continue;
    }

    // ── O'QISH: erkin bajariladi ──
    let natija;
    try {
      natija = await vositaniBajar(q.vosita, q.argumentlar);
    } catch (e) {
      natija = { xato: String(e.message).slice(0, 200) };
    }
    if (q.vosita === 'grafik' && natija?.grafik) grafiklar.push(natija.grafik);
    qadamlar.push({ vosita: q.vosita, argumentlar: q.argumentlar, natija });
  }

  if (javob === null) {
    javob = yoziladigan.length
      ? 'Quyidagi o‘zgarishlarni taklif qilaman.'
      : 'Bu topshiriq juda ko‘p qadam talab qildi. Savolni kichikroq '
        + 'bo‘laklarga bo‘lib bering.';
  }

  // ── DA'VONI TEKSHIRAMIZ ──
  // Hech narsa bajarilmagan bo'lsa-yu, model «o'chirdim» deb yozgan
  // bo'lsa — bu yolg'on. Adminni chalg'itmaslik uchun ochiq aytamiz.
  const yolgon = !yoziladigan.length && DAVO.test(javob);
  if (yolgon) {
    javob = 'Bu ishni bajara olmadim — hech qanday o‘zgarish qilinmadi.\n\n'
      + 'Nima kerakligini aniqroq yozing (masalan «12 va 15-mahsulotni yop»), '
      + 'yoki admin panelning tegishli bo‘limidan qo‘lda bajaring.';
  }
  if (yoziladigan.length && DAVO.test(javob)) {
    // Taklif bor, lekin model uni bajarilgandek yozgan
    javob = 'Quyidagi o‘zgarishlarni taklif qilaman — tasdiqlashingizni kutaman.';
  }

  const natija = { javob, qadamlar: xulosa(qadamlar), takliflar,
                   grafiklar: grafiklar.slice(0, 4) };

  if (yoziladigan.length) {
    natija.reja = {
      token: rejaniSaqla(yoziladigan),
      qadamlar: yoziladigan.map((x) => ({
        vosita: x.vosita, izoh: x.izoh, soni: x.soni,
        qaytarib_bolmaydi: x.qaytarib_bolmaydi,
      })),
      soni: yoziladigan.reduce((s, x) => s + (Number(x.soni) || 0), 0),
      qaytarib_bolmaydi: yoziladigan.some((x) => x.qaytarib_bolmaydi),
    };
  }
  return natija;
}

/** Adminga ko'rsatiladigan qisqa qadam bayoni. */
const xulosa = (qadamlar) => qadamlar.map((k) => ({
  vosita: k.vosita,
  argumentlar: k.argumentlar,
  // To'liq natija chatda kerak emas — u juda uzun bo'lishi mumkin
  qisqa: qisqaNatija(k.natija),
}));

function qisqaNatija(n) {
  if (!n || typeof n !== 'object') return '';
  if (n.xato) return `xato: ${n.xato}`;
  const q = [];
  for (const [k, v] of Object.entries(n)) {
    if (typeof v === 'number') q.push(`${k}: ${v}`);
    else if (Array.isArray(v)) q.push(`${k}: ${v.length} ta`);
  }
  return q.join(' · ');
}

/**
 * Tasdiqlangan rejani bajaradi.
 * Token bir martalik: qayta yuborilsa ikkinchi marta bajarilmaydi.
 */
export async function rejaniBajar(token) {
  const reja = rejalar.get(String(token || ''));
  if (!reja) {
    // Token yaroqsiz — bu SO'ROV xatosi, ish natijasi emas
    return { topilmadi: true,
      xabar: 'Taklif eskirdi yoki allaqachon bajarilgan. Qaytadan so‘rang.' };
  }
  rejalar.delete(String(token));
  if (Date.now() - reja.vaqt > REJA_MS) {
    return { topilmadi: true, xabar: 'Taklif eskirdi. Qaytadan so‘rang.' };
  }

  // Qadamlar KETMA-KET bajariladi. Bittasi yiqilsa qolganlari
  // baribir bajariladi va hisobotda qaysi biri yiqilgani ko'rinadi —
  // «hammasi yiqildi» deb qaytarish adminni chalg'itadi.
  const natijalar = [];
  for (const q of reja.qadamlar) {
    try {
      const n = await vositaniBajar(q.vosita, q.argumentlar);
      // MUHIM: vosita xato TASHLAMAY ham ishni bajarmagan bo'lishi
      // mumkin — masalan «Mahsulot ID lari berilmadi». Ilgari bunday
      // qadam «ok» hisoblanardi va admin faqat «0 ta yozuv o'zgardi»
      // degan raqamni ko'rardi, SABABINI esa ko'rmasdi.
      const ozgardi = ozgarishSoni(n);
      const bajarilmadi = ozgardi === 0 && (n?.xabar || n?.xato);
      natijalar.push(bajarilmadi
        ? { vosita: q.vosita, ok: false, xato: String(n.xabar || n.xato).slice(0, 200), natija: n }
        : { vosita: q.vosita, ok: true, natija: n });
    } catch (e) {
      natijalar.push({ vosita: q.vosita, ok: false, xato: String(e.message).slice(0, 200) });
    }
  }

  // Nechta yozuv HAQIQATAN o'zgardi — da'vo emas, natija
  const ozgardi = natijalar.reduce((s, x) => s + ozgarishSoni(x.natija), 0);

  const yiqilgan = natijalar.filter((x) => !x.ok);
  return {
    // Hech nima o'zgarmagan bo'lsa bu MUVAFFAQIYAT emas
    ok: ozgardi > 0 || natijalar.some((x) => x.ok),
    qadamlar: natijalar,
    ozgardi,
    xabar: yiqilgan.length
      ? `${natijalar.length - yiqilgan.length}/${natijalar.length} qadam bajarildi`
      : '',
  };
}

/* Vosita ISHNI BAJARDIMI — bitta joyda hal qilinadi.
 *
 * Yozuvchi vositalar `ozgardi` (nechta yozuv o'zgardi) qaytaradi.
 * Lekin hamma ish yozuv bilan o'lchanmaydi: kartochka shabloni
 * saqlanishi, rasm chizilishi, fayl tayyorlanishi ham natija.
 * Shuning uchun bu yerda TO'RT belgi qabul qilinadi.
 *
 * Nega muhim. Ilgari faqat `ozgardi` qaralardi va yangi vosita
 * boshqacha javob qaytarsa admin «⚠️ Hech narsa o'zgarmadi»
 * degan xabarni ko'rardi — ish esa bajarilgan bo'lardi. Aynan shu
 * xato kartochka shabloni bilan yuz berdi.
 */
function ozgarishSoni(n) {
  if (!n || typeof n !== 'object') return 0;
  const son = Number(n.ozgardi) || Number(n.ochirildi)
           || Number(n.qoshildi) || Number(n.yuborildi) || 0;
  if (son) return son;
  // Mantiqiy belgilar: `true` — bitta ish bajarildi
  if (n.ozgardi === true || n.ochirildi === true || n.saqlandi === true
      || n.bajarildi === true || n.tayyor === true) return 1;
  return 0;
}

/** Sinov uchun. */
export const vositaOzgarishi = ozgarishSoni;
export const rejalarniTozala = () => rejalar.clear();
export const rejaSoni = () => rejalar.size;

// ═══════════ FONDAGI ISHLAR ═══════════
// Agent bir necha qadam bajaradi va bu 10–30 soniya olishi mumkin.
// Ilgari HTTP so'rovi shuncha vaqt osilib turardi: admin faqat
// aylanayotgan nuqtalarni ko'rar, nima bo'layotganini bilmasdi va
// so'rov uzilib ketishi ham mumkin edi.
//
// Endi ish fonda ketadi, panel esa holatni so'rab turadi va agent
// AYNAN NIMA qilayotganini ko'rsatadi.
const ishlar = new Map();
const ISH_MS = 10 * 60_000;

export function ishBoshla() {
  const id = crypto.randomBytes(9).toString('base64url');
  ishlar.set(id, { holat: 'ishlamoqda', qadamlar: [], vaqt: Date.now() });
  for (const [k, v] of ishlar) if (Date.now() - v.vaqt > ISH_MS) ishlar.delete(k);
  return id;
}

export function ishYangila(id, xabar) {
  const i = ishlar.get(id);
  if (!i) return;
  i.joriy = xabar;
  // Bajarilgan qadamlar tarixi — admin nima qilinganini ko'radi
  if (xabar?.holat === 'ishlayapti') {
    i.qadamlar.push({ vosita: xabar.vosita, matn: xabar.matn });
  }
}

export function ishTugat(id, { natija, xato } = {}) {
  const i = ishlar.get(id);
  if (!i) return;
  i.holat = xato ? 'xato' : 'tayyor';
  i.natija = natija;
  i.xato = xato;
  i.joriy = null;
  i.vaqt = Date.now();
}

export function ishHolati(id) {
  const i = ishlar.get(String(id || ''));
  if (!i) return null;
  // Tugagan ish bir marta olinadi va tozalanadi — xotira to'lmasin
  if (i.holat !== 'ishlamoqda') ishlar.delete(String(id));
  return { holat: i.holat, joriy: i.joriy, qadamlar: i.qadamlar,
           natija: i.natija, xato: i.xato };
}

/** Sinov uchun. */
export const ishlarniTozala = () => ishlar.clear();
