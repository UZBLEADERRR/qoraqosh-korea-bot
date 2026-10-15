// MAKIYAJ RANG TAHLILI — «Mening rangim».
//
// AI rasmdan teri osti tusi, chuqurlik, rang tipi va yuz shaklini aniqlaydi.
// Teri RANGINING O'ZI (hex) bu yerda emas — server yonoq piksellaridan o'lchaydi
// (src/rasm/teri-rangi.js): model rangni raqam bilan aytishda adashadi.
// Mos ton va mahsulotlar AI emas, src/lib/makiyaj.js qoidalari bilan tanlanadi.
import { aiJson, rasmPart, aiBormi } from './index.js';
import { RAD_SABABLARI, yuzQutiTozala } from './faceAnalysis.js';

const SXEMA = {
  type: 'object',
  properties: {
    sifat: {
      type: 'object',
      properties: {
        yaroqli: { type: 'boolean' },
        sabab: { type: 'string', enum: ['yaroqli', ...Object.keys(RAD_SABABLARI)] },
        ishonch: { type: 'integer' },
        izoh: { type: 'string' },
      },
      required: ['yaroqli', 'sabab', 'ishonch', 'izoh'],
      propertyOrdering: ['yaroqli', 'sabab', 'ishonch', 'izoh'],
    },
    yuz: {
      type: 'object',
      properties: { ymin: { type: 'integer' }, xmin: { type: 'integer' }, ymax: { type: 'integer' }, xmax: { type: 'integer' } },
      required: ['ymin', 'xmin', 'ymax', 'xmax'],
    },
    yoruglik: { type: 'string', enum: ['kunduzgi', 'iliq_chiroq', 'sovuq_chiroq', 'qorongi'] },
    tus: { type: 'string', enum: ['iliq', 'sovuq', 'neytral', 'zaytun'] },
    tus_ishonch: { type: 'integer' },
    chuqurlik: { type: 'integer' },
    rang_tipi: { type: 'string', enum: ['bahor', 'yoz', 'kuz', 'qish'] },
    kontrast: { type: 'string', enum: ['past', 'orta', 'yuqori'] },
    yuz_shakli: { type: 'string', enum: ['oval', 'dumaloq', 'kvadrat', 'yurak', 'uzunchoq', 'olmos'] },
    kozlar: { type: 'string', enum: ['bodom', 'dumaloq', 'osilgan', 'monolid', 'chuqur', 'ensiz'] },
    lab: { type: 'string', enum: ['yupqa', 'orta', 'tola'] },
    izoh: { type: 'string' },
    maslahat: {
      type: 'object',
      properties: {
        ton: { type: 'string' }, konsiler: { type: 'string' }, qosh: { type: 'string' },
        kozlar: { type: 'string' }, rumyana: { type: 'string' }, lab: { type: 'string' }, kontur: { type: 'string' },
      },
      required: ['ton', 'konsiler', 'qosh', 'kozlar', 'rumyana', 'lab', 'kontur'],
    },
  },
  required: ['sifat', 'yuz', 'yoruglik', 'tus', 'tus_ishonch', 'chuqurlik', 'rang_tipi', 'kontrast',
    'yuz_shakli', 'kozlar', 'lab', 'izoh', 'maslahat'],
  propertyOrdering: ['sifat', 'yuz', 'yoruglik', 'tus', 'tus_ishonch', 'chuqurlik', 'rang_tipi', 'kontrast',
    'yuz_shakli', 'kozlar', 'lab', 'izoh', 'maslahat'],
};

const KORSATMA = `Sen — professional vizajist (makiyaj ustasi). Ayolning selfisidan unga mos
makiyaj ranglarini aniqlaysan.

QADAM 1 — SIFAT. Rasm yaroqsiz bo'lsa (yuz yo'q, xira, juda qorong'i, yuz yopiq,
bir nechta odam, sun'iy/AI rasm, ekrandan olingan) — sifat.yaroqli=false, mos sabab,
qolgan maydonlarni bo'sh/0 qoldir. QALIN tonal krem yoki filtr teri rangini butunlay
yashirsa — sabab "pardoz". Yengil pardoz (qosh, kiprik) — yaroqli.

QADAM 2 — yuz: yuz chegarasi rasm koordinatalarida 0..1000 (ymin peshona tepasi, ymax iyak).

yoruglik — rasm qanday yorug'likda: "kunduzgi" (deraza, tabiiy), "iliq_chiroq"
  (sariq xona chirog'i — teri sarg'ish ko'rinadi), "sovuq_chiroq" (ko'kish LED),
  "qorongi". Iliq chiroqda teri haqiqatdan ham iliqroq ko'rinadi — buni hisobga olib,
  tusni chiroqqa emas, terining O'ZIGA qarab aniqla.

tus — teri OSTI tusi (teri rangi emas!):
  iliq   — sarg'ish, oltin, shaftoli tagi; oltin taqinchoq yarashadi
  sovuq  — pushti, qizg'ish, ko'kimtir tagi; kumush yarashadi
  neytral — ikkalasi aralash, aniq ustunligi yo'q
  zaytun — yashil-kulrang, zaytun tagi (O'rta Osiyoda ko'p uchraydi)
tus_ishonch — 0-100. Yorug'lik iliq/sovuq chiroq bo'lsa — pastroq.

chuqurlik — teri yorug'ligi 1-6 (Koreya kushon tonlari bilan):
  1 juda och, chinni (13-tonga yaqin) · 2 och (17-19) · 3 och-o'rta (21) ·
  4 o'rta (23) · 5 qoramtir (25-27) · 6 to'q (29 va undan to'q)
  Yorug'lik yoki yaltirash emas — yonoq va bo'yindagi asosiy rangga qara.

rang_tipi — mavsumiy rang tipi: tus + soch, ko'z va teri orasidagi kontrast:
  bahor — iliq, yorug', yumshoq kontrast · yoz — sovuq, yumshoq, past kontrast ·
  kuz — iliq, chuqur, boy · qish — sovuq, yuqori kontrast (to'q soch, och/tiniq teri)
kontrast — soch/qosh va teri orasidagi farq: past | orta | yuqori.

yuz_shakli, kozlar, lab — ko'rinishiga qarab bitta qiymat.

izoh — «RASMDA NIMA KO'RDIM», 1 jumla, neytral: yorug'lik, soch rangi, yuz burilishi.
  Masalan: «Kunduzgi yorug'likda, sochi to'q jigarrang, yuz to'g'ridan olingan.»

maslahat — har biriga 1 qisqa, AMALIY jumla, aynan SHU odam uchun:
  ton — qanday ton va qanday qoplama (mat / tabiiy / yaltiroq) mos
  konsiler — qayerga va qanday tusdagi (masalan shaftoli tusli — ko'k qoralikka)
  qosh — yuz shakliga mos qosh shakli
  kozlar — ko'z shakliga mos texnika va qaysi tuslar
  rumyana — yuz shakliga qarab QAYERGA surtish
  lab — rang tipiga mos tuslar
  kontur — yuz shakliga qarab qayerga soya va qayerga yorug'lik

QAT'IY TAQIQ: odamning tashqi ko'rinishiga baho berma (chiroyli, xunuk, semiz,
ozg'in, «kamchilik»). Go'zallik balli QO'YMA. Odamni tanima, millat/irq haqida
gapirma. Faqat makiyaj uchun foydali, hurmatli va ijobiy til.

Butun javob o'zbek tilida (lotin alifbosida). Faqat JSON qaytar.`;

const SIFAT_CHEGARASI = 45;

/**
 * @returns {Promise<{yaroqli:boolean, sabab?:string, izoh?:string, natija?:object}>}
 */
export async function rangniTahlilQil(base64, mime) {
  if (!aiBormi()) throw new Error('AI hozir ishlamayapti — birozdan keyin urinib ko‘ring.');
  const javob = await aiJson([{ text: KORSATMA }, rasmPart(base64, mime)], SXEMA,
    { temperature: 0.2, maxTokens: 2500, qayerda: 'makiyaj' });
  const s = javob?.sifat || {};
  if (!s.yaroqli || (Number.isFinite(Number(s.ishonch)) && Number(s.ishonch) < SIFAT_CHEGARASI)) {
    return { yaroqli: false, sabab: RAD_SABABLARI[s.sabab] ? s.sabab : 'xira', izoh: String(s.izoh || '').slice(0, 300) };
  }
  const bir = (v, ruxsat, zaxira) => (ruxsat.includes(v) ? v : zaxira);
  const m = javob.maslahat || {};
  const qisqa = (x) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  return {
    yaroqli: true,
    natija: {
      yuz_quti: yuzQutiTozala(javob.yuz),
      yoruglik: bir(javob.yoruglik, ['kunduzgi', 'iliq_chiroq', 'sovuq_chiroq', 'qorongi'], 'kunduzgi'),
      tus: bir(javob.tus, ['iliq', 'sovuq', 'neytral', 'zaytun'], 'neytral'),
      tus_ishonch: Math.min(100, Math.max(0, Number(javob.tus_ishonch) || 60)),
      chuqurlik: Math.min(6, Math.max(1, Math.round(Number(javob.chuqurlik) || 3))),
      rang_tipi: bir(javob.rang_tipi, ['bahor', 'yoz', 'kuz', 'qish'], 'yoz'),
      kontrast: bir(javob.kontrast, ['past', 'orta', 'yuqori'], 'orta'),
      yuz_shakli: bir(javob.yuz_shakli, ['oval', 'dumaloq', 'kvadrat', 'yurak', 'uzunchoq', 'olmos'], 'oval'),
      kozlar: bir(javob.kozlar, ['bodom', 'dumaloq', 'osilgan', 'monolid', 'chuqur', 'ensiz'], 'bodom'),
      lab: bir(javob.lab, ['yupqa', 'orta', 'tola'], 'orta'),
      izoh: qisqa(javob.izoh),
      maslahat: Object.fromEntries(['ton', 'konsiler', 'qosh', 'kozlar', 'rumyana', 'lab', 'kontur'].map((k) => [k, qisqa(m[k])])),
    },
  };
}
