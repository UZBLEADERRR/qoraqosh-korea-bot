// AI YORDAMCHI → INSTAGRAM BOSHQARUVCHI.
//
// Admin oddiy tilda aytadi: «Direct'da qisqaroq yoz, narxni doim ayt»,
// «"+" qoldirganlarga chegirma kodini yubor», «kommentlarga @ siz javob
// ber». Yordamchi Instagram AI sining ko'rsatmasi, qoidalari va
// sozlamalarini o'zgartiradi (tasdiq bilan), «instagram_sinov» bilan esa
// yangi ko'rsatma qanday javob berishini OLDINDAN ko'rsatadi.
import * as ig from './instagram/index.js';

const ixcham = (r) => r.map((x) => ({ ...x, rasm_url: undefined }));

export const IG_VOSITALAR = {
  instagram_holat: {
    oqish: true,
    ishla: async () => ({ ...(await ig.igHolat()), qoidalar: await ig.qoidalar() }),
    tavsif: 'INSTAGRAM holati: ulanganmi, akkaunt, bugungi xabarlar/AI javoblar/tahlillar/kommentlar, '
          + 'Telegramga o‘tganlar, AI sozlamalari (ko‘rsatma, yoqilgan/o‘chirilgan) va komment qoidalari.',
    parametrlar: '—',
  },
  instagram_sinov: {
    oqish: true,
    ishla: async (a = {}) => {
      const { igJavob } = await import('../ai/instagram-suhbat.js');
      const { faolMahsulotlar } = await import('./analysis.js');
      const st = await ig.igSozlamalari();
      return igJavob({ tarix: [{ kim: 'mijoz', matn: String(a.matn || 'Salom, narxi qancha?').slice(0, 500) }],
        korsatma: a.korsatma ?? st.korsatma, mahsulotlar: await faolMahsulotlar(), malumot: { tg_havola: 'https://t.me/...' } });
    },
    tavsif: 'Instagram AI mijozning shu xabariga QANDAY javob berishini ko‘rsatadi (hech kimga yubormaydi). '
          + 'Yangi ko‘rsatmani saqlashdan OLDIN sinash uchun «korsatma» ham berish mumkin.',
    parametrlar: 'matn (mijoz xabari), korsatma (ixtiyoriy — sinab ko‘rish uchun)',
  },
  instagram_sozla: {
    oqish: false,
    ishla: async (a = {}) => ({ sozlamalar: await ig.sozlamaniSaqla(a) }),
    tavsif: 'Instagram boshqaruvchi sozlamalari: ai_yoqiq (Direct ga AI javob), korsatma (AI uslubi va qoidalari — '
          + 'TO‘LIQ matn, eskisini o‘zgartirib qayta yoz), yuz_tahlil, xira (true — natijaning muhim qismi xira, '
          + 'standart false — to‘liq natija), komment_qoidalar, komment_mention, kechikish_soniya, qolda_pauza_daqiqa, '
          + 'tahlil_matni (bo‘sh — AI har odamga o‘zi yozadi; andoza: {ball},{tavsif},{soni},{mahsulotlar},{havola}).',
    parametrlar: 'o‘zgaradigan maydonlar',
  },
  instagram_qoida: {
    oqish: false,
    ishla: (a = {}) => ig.qoidaSaqla(a),
    tavsif: 'Komment QOIDASI yaratish yoki o‘zgartirish (id bilan): kalitlar («+», «narx»…), aniq (komment aynan shu '
          + 'so‘z bo‘lsa), javoblar (ochiq javob variantlari), dm_matn (Direct; {ism}, {tg_havola}), dm_ai (Direct ni AI '
          + 'yozsin), media_id (bitta post uchun), faol, tartib.',
    parametrlar: 'id (o‘zgartirishda), nom, kalitlar, aniq, javoblar, dm_matn, dm_ai, media_id, faol, tartib',
  },
  instagram_qoida_ochir: {
    oqish: false, ishla: (a = {}) => ig.qoidaOchir(a.id),
    tavsif: 'Komment qoidasini o‘chiradi (vaqtincha to‘xtatish uchun instagram_qoida faol=false yaxshiroq).',
    parametrlar: 'id',
  },
  instagram_suhbatlar: {
    oqish: true,
    ishla: async (a = {}) => (a.id ? ig.suhbatXabarlari(a.id, { oqildi: false })
      : { suhbatlar: ixcham(await ig.suhbatlar({ q: a.qidiruv || '', filtr: a.filtr || '', chegara: a.chegara || 20 })) }),
    tavsif: 'Instagram Direct suhbatlari (oxirgilari) yoki bitta suhbatning xabarlari (id bilan). '
          + 'filtr: oqilmagan | admin (menejer kerak) | tahlil.',
    parametrlar: 'id YOKI filtr, qidiruv, chegara',
  },
  instagram_yubor: {
    oqish: false, ishla: (a = {}) => ig.qoldaYubor(a.id, a.matn),
    tavsif: 'Instagram Direct suhbatiga admin nomidan xabar yuboradi (AI shu suhbatda vaqtincha jim turadi). '
          + 'Mijoz 24 soatdan beri yozmagan bo‘lsa Instagram ruxsat bermaydi.',
    parametrlar: 'id (suhbat), matn',
  },
  instagram_kommentlar: {
    oqish: true, ishla: async (a = {}) => ({ kommentlar: await ig.kommentlar({ filtr: a.filtr || '', chegara: a.chegara || 40 }) }),
    tavsif: 'Oxirgi Instagram kommentlari: qaysi qoida ishladi, Direct ketdimi, javob. filtr: javobsiz | qoida.',
    parametrlar: 'filtr, chegara',
  },
};
