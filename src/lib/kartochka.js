// Natija kartochkasining SOZLAMASI.
//
// Kartochka — mijoz qo'liga boradigan yagona hujjat: uni skrinshot
// qiladi, do'stiga yuboradi, saqlab qo'yadi. Shuning uchun do'kon
// egasi uni o'zgartira olishi kerak: qaysi bo'lim ko'rinsin, nechta
// belgi va mahsulot chiqsin, sarlavhalar qanday yozilsin.
//
// Sozlama `settings.natija_kartochka` da turadi va admin yordamchisi
// (agent) uni oddiy so'z bilan o'zgartira oladi: «erkaklar
// kartochkasida parhezni olib tashla», «mahsulotni 6 ta qil».
//
// ERKAK va AYOL uchun alohida. Ustma-ust qo'yiladi: avval umumiy
// sozlama, ustiga jinsga tegishli farqlar. Ya'ni «erkak» bo'limida
// faqat FARQ yoziladi, hamma narsani qayta yozish shart emas.

export const BLOKLAR = ['korsatkichlar', 'xulosa', 'belgilar', 'parhez', 'mahsulotlar'];

export const BLOK_NOMI = {
  korsatkichlar: 'Sarlavha ostidagi uchta ko‘rsatkich',
  xulosa:        'Umumiy xulosa (bir-ikki jumla)',
  belgilar:      'Suratda topilgan belgilar ro‘yxati',
  parhez:        'Ovqatlanish tavsiyasi (nima foydali, nimani cheklash)',
  mahsulotlar:   'Tavsiya etilgan mahsulotlar',
};

export const KARTOCHKA_STANDART = {
  bloklar: {
    korsatkichlar: true,
    xulosa: true,
    belgilar: true,
    parhez: true,
    mahsulotlar: true,
  },
  // Nechta belgi va mahsulot ko'rsatiladi
  belgi_soni: 5,
  mahsulot_soni: 8,
  sarlavha: {
    belgilar:    'Suratda topilgan belgilar',
    parhez:      'Ovqatlanish tavsiyasi',
    mahsulotlar: 'Sizga mos parvarish',
  },
  // Pastdagi ogohlantirish. Bo'sh bo'lsa chizilmaydi.
  izoh: 'Bu tibbiy tashxis emas — kosmetologik tavsiya.',
  // Sarlavhadagi o'ng yozuv
  teg: 'Teri tahlili',
  // Tahlil AI siga qo'shimcha ko'rsatma. JINSGA BOG'LIQ EMAS: jins
  // tahlildan KEYIN ma'lum bo'ladi, ko'rsatma esa undan oldin ketadi.
  ai_qoshimcha: '',
  // Jinsga qarab farqlar — faqat farq yoziladi
  erkak: {},
  ayol: {},
};

const son = (v, standart, min, maks) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return standart;
  return Math.min(maks, Math.max(min, n));
};

const matn = (v, standart, uzunlik) =>
  (typeof v === 'string' ? v.slice(0, uzunlik) : standart);

/**
 * Xom sozlamani (agent yozgani yoki bazadagisi) ishonchli ko'rinishga
 * keltiradi va jinsga moslaydi.
 *
 * @param {object} xom   settings.natija_kartochka
 * @param {string} jins  'erkak' | 'ayol' | ''
 */
export function kartochkaSozlamasi(xom = {}, jins = '') {
  const x = (xom && typeof xom === 'object') ? xom : {};
  const j = (jins === 'erkak' || jins === 'ayol') && x[jins] && typeof x[jins] === 'object'
    ? x[jins] : {};

  // Jins bo'limi UMUMIYning ustiga qo'yiladi
  const ol = (kalit) => (j[kalit] !== undefined ? j[kalit] : x[kalit]);

  const bloklar = {};
  for (const b of BLOKLAR) {
    const umumiy = x.bloklar?.[b];
    const jinsli = j.bloklar?.[b];
    const v = jinsli !== undefined ? jinsli : umumiy;
    bloklar[b] = v === undefined ? KARTOCHKA_STANDART.bloklar[b] : Boolean(v);
  }

  const sarlavha = {};
  for (const k of Object.keys(KARTOCHKA_STANDART.sarlavha)) {
    const v = j.sarlavha?.[k] !== undefined ? j.sarlavha[k] : x.sarlavha?.[k];
    sarlavha[k] = matn(v, KARTOCHKA_STANDART.sarlavha[k], 40) || KARTOCHKA_STANDART.sarlavha[k];
  }

  return {
    bloklar,
    sarlavha,
    // Chegaralar dizayndan kelib chiqadi: 8 tadan ortiq mahsulot
    // bitta qatorga sig'maydi, 8 tadan ortiq belgi rasmni cho'zib
    // yuboradi va hech kim oxirigacha o'qimaydi.
    belgi_soni:    son(ol('belgi_soni'), KARTOCHKA_STANDART.belgi_soni, 0, 8),
    mahsulot_soni: son(ol('mahsulot_soni'), KARTOCHKA_STANDART.mahsulot_soni, 0, 8),
    izoh: matn(ol('izoh'), KARTOCHKA_STANDART.izoh, 160),
    teg:  matn(ol('teg'), KARTOCHKA_STANDART.teg, 30),
    ai_qoshimcha: matn(x.ai_qoshimcha, '', 1200),
  };
}

/**
 * Agent bergan o'zgarishni bazadagi sozlamaga qo'shadi.
 * FAQAT tanish kalitlar o'tadi — model o'ylab topgan maydon
 * sozlamani axlatga to'ldirmasin.
 *
 * @param {object} eski   bazadagisi
 * @param {object} yangi  agent bergani
 * @param {string} kim    'umumiy' | 'erkak' | 'ayol'
 */
export function kartochkaniQosh(eski = {}, yangi = {}, kim = 'umumiy') {
  const asos = (eski && typeof eski === 'object') ? { ...eski } : {};
  const joy = kim === 'erkak' || kim === 'ayol'
    ? { ...(asos[kim] && typeof asos[kim] === 'object' ? asos[kim] : {}) }
    : asos;

  const ozgargan = [];

  if (yangi.bloklar && typeof yangi.bloklar === 'object') {
    joy.bloklar = { ...(joy.bloklar || {}) };
    for (const [k, v] of Object.entries(yangi.bloklar)) {
      if (!BLOKLAR.includes(k)) continue;
      joy.bloklar[k] = Boolean(v);
      ozgargan.push(`${k}: ${v ? 'ko‘rinadi' : 'yashirildi'}`);
    }
  }
  if (yangi.sarlavha && typeof yangi.sarlavha === 'object') {
    joy.sarlavha = { ...(joy.sarlavha || {}) };
    for (const [k, v] of Object.entries(yangi.sarlavha)) {
      if (!(k in KARTOCHKA_STANDART.sarlavha) || typeof v !== 'string') continue;
      joy.sarlavha[k] = v.slice(0, 40);
      ozgargan.push(`sarlavha.${k}: «${joy.sarlavha[k]}»`);
    }
  }
  for (const k of ['belgi_soni', 'mahsulot_soni']) {
    if (yangi[k] === undefined || yangi[k] === null || yangi[k] === '') continue;
    joy[k] = son(yangi[k], KARTOCHKA_STANDART[k], 0, 8);
    ozgargan.push(`${k}: ${joy[k]}`);
  }
  for (const [k, uzun] of [['izoh', 160], ['teg', 30]]) {
    if (typeof yangi[k] !== 'string') continue;
    joy[k] = yangi[k].slice(0, uzun);
    ozgargan.push(`${k}: «${joy[k]}»`);
  }
  // AI ko'rsatmasi FAQAT umumiy bo'ladi — sabab yuqorida yozilgan
  if (typeof yangi.ai_qoshimcha === 'string') {
    asos.ai_qoshimcha = yangi.ai_qoshimcha.slice(0, 1200);
    ozgargan.push(asos.ai_qoshimcha
      ? `AI ko‘rsatmasi: ${asos.ai_qoshimcha.length} belgi`
      : 'AI ko‘rsatmasi tozalandi');
  }

  if (kim === 'erkak' || kim === 'ayol') asos[kim] = joy;
  return { sozlama: asos, ozgargan };
}
