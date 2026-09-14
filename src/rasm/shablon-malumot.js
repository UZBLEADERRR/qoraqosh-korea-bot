// Shablonga beriladigan MA'LUMOT.
//
// AI yozgan shablon shu obyektning maydonlarini ishlatadi. Bu yerda
// hamma narsa OLDINDAN hisoblanadi: rang, foiz, tartib raqami, yuzdagi
// joy. Shablonda hisob-kitob yo'q — u faqat joylashtiradi.
import { joylarniHisobla } from '../lib/zona.js';

const SHKALA = ['#FF6B5A', '#FF9A5A', '#F0B429', '#4AA3FF', '#3DD68C'];
export const beshRang = (b) => SHKALA[Math.max(0, Math.min(4, Math.floor(b / 20)))];
const TARTIB = ['#FF4D4D', '#FF8A3D', '#F0B429', '#3DD68C', '#4AA3FF', '#A78BFA'];

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sana(d = new Date()) {
  const t = new Date(d.getTime() + 5 * 3600 * 1000);   // Toshkent
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const JINS = { erkak: 'Erkak', ayol: 'Ayol' };

/**
 * @param {object} d  natijaSvg ga keladigan ma'lumot
 * @returns {object}  shablon uchun tayyor obyekt
 */
export function shablonMalumoti({ tahlil = {}, tavsiyalar = [], brend = 'KiOVO',
                                  rasmBase64 = null, mime = 'image/jpeg',
                                  logoBase64 = null, logoMime = 'image/png',
                                  en = 1080 } = {}) {
  const t = tahlil || {};
  const ball = Math.round(Number(t.ball ?? t.score ?? 0));
  const muammolar = joylarniHisobla(t.muammolar || t.problems || []);
  const parhez = t.parhez || {};

  return {
    brend,
    sana: sana(),
    en,
    ball,
    holat: ball >= 80 ? 'A’lo holat' : ball >= 65 ? 'Yaxshi holat'
         : ball >= 50 ? 'O‘rtacha holat' : ball >= 35 ? 'E’tibor kerak' : 'Zaif holat',
    ball_rang: beshRang(ball),
    yosh: t.taxminiy_yosh || t.age_estimate || '',
    jins: JINS[t.jins] || '',
    teri_turi: t.teri_turi || t.skin_type || '',
    teri_rangi: String(t.teri_rangi || t.skin_tone || '').split(/[,;(]/)[0].trim(),
    xulosa: t.xulosa || t.summary || '',
    tavsif: t.tavsif || '',

    yuz: rasmBase64 ? `data:${mime};base64,${rasmBase64}` : '',
    yuz_bor: Boolean(rasmBase64),
    logo: logoBase64 ? `data:${logoMime};base64,${logoBase64}` : '',

    muammolar: muammolar.map((m, i) => ({
      nom: m.nom || '',
      zona: m.zona || '',
      foiz: m.foiz,
      ball: 100 - m.foiz,
      rang: m.foiz >= 60 ? '#FF6B5A' : m.foiz >= 35 ? '#F0B429' : '#3DD68C',
      shkala_rang: beshRang(100 - m.foiz),
      tartib: i + 1,
      joy_x: m.joy?.x ?? 50,
      joy_y: m.joy?.y ?? 50,
      sabab: m.sabab || m.izoh || '',
      yechim: m.yechim || '',
    })),
    muammo_soni: muammolar.length,

    mahsulotlar: (tavsiyalar || []).map((r, i) => ({
      nom: r.nom || '',
      bosqich: r.bosqich || '',
      narx: r.narx || '',
      rasm: r.rasmBase64 ? `data:${r.rasmMime || 'image/png'};base64,${r.rasmBase64}` : '',
      rasm_bor: Boolean(r.rasmBase64),
      tartib: i + 1,
      rang: TARTIB[i % TARTIB.length],
    })),

    foydali:  (parhez.foydali  || []).map((b) => ({ nom: tozaBand(b) })),
    cheklang: (parhez.cheklang || []).map((b) => ({ nom: tozaBand(b) })),
    parhez_izoh: parhez.izoh || '',

    prognoz: (t.prognoz || t.forecast || [])
      .slice().sort((a, b) => (b.ehtimol ?? 0) - (a.ehtimol ?? 0))
      .map((p) => ({
        muammo: p.muammo || '', ehtimol: Math.round(Number(p.ehtimol ?? 0)),
        muddat: p.muddat || '', natija: p.natija || '',
      })),
  };
}

/** Qavs ichidagi izohsiz nom — kartochkada faqat nomi kerak. */
const tozaBand = (b) => String(b).replace(/\s*[（(].*?[)）]\s*$/, '').trim();

/** Namuna ma'lumot — shablonni sinash va ko'rish uchun. */
export function namunaMalumot(brend = 'KiOVO') {
  return shablonMalumoti({
    brend,
    tahlil: {
      ball: 68, taxminiy_yosh: '22-26', jins: 'erkak', teri_turi: 'aralash',
      teri_rangi: 'och bug‘doyrang, iliq tonli',
      xulosa: 'Teringizda yog‘lanish, kengaygan teshiklar va yallig‘langan '
            + 'toshmalar mavjud. To‘g‘ri parvarish tartibini yo‘lga qo‘yish kerak.',
      tavsif: 'Ko‘zoynak taqqan yigit, tabiiy yorug‘likda olingan surat.',
      muammolar: [
        { nom: 'Yallig‘langan toshmalar', foiz: 65, zona: 'chap yonoq va iyak',
          sabab: 'Yog‘ bezlarining faolligi.', yechim: 'Salitsil kislotasi.' },
        { nom: 'Kengaygan poralar', foiz: 60, zona: 'burun va peshona (T-zona)' },
        { nom: 'Qizargan sohalar', foiz: 50, zona: 'o‘ng yonoq' },
        { nom: 'Pigmentatsiya', foiz: 40, zona: 'peshona' },
        { nom: 'Ko‘z ostidagi soya', foiz: 32, zona: 'ko‘z ostida' },
      ],
      prognoz: [{ muammo: 'Akne izlari', ehtimol: 66, muddat: '3-6 oy',
                  natija: 'Izlar chuqurlashishi mumkin' }],
      parhez: {
        foydali: ['Yog‘li baliq (omega-3)', 'Ko‘k choy', 'Yangi sabzavotlar', 'Toza suv'],
        cheklang: ['Shirin ichimlik', 'Fast-food', 'Sut mahsulotlari', 'O‘tkir taom'],
        izoh: 'Miqdorini kamaytirish kifoya.',
      },
    },
    tavsiyalar: [
      { bosqich: 'Tozalash', nom: '2% Salicylic Acid gel', narx: '80 000 so‘m' },
      { bosqich: 'Toner', nom: 'Chestnut BHA toner 200ml', narx: '80 000 so‘m' },
      { bosqich: 'Davolash', nom: 'Tea Tree serum 8ml', narx: '95 000 so‘m' },
      { bosqich: 'Namlash', nom: 'Akneka cream 30ml', narx: '76 000 so‘m' },
      { bosqich: 'Himoya', nom: 'Aqua Air Fit SPF50', narx: '75 000 so‘m' },
    ],
  });
}
