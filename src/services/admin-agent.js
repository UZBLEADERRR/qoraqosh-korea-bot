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
import { vositaniBajar, yozishmi, VOSITALAR } from './admin-vositalar.js';

// Bitta savolga nechta qadam. Cheksiz aylana model chalkashsa
// kvotani yeb qo'yadi va admin javobni kutib qoladi.
const MAKS_QADAM = 6;

// Tasdiq kutayotgan rejalar. Xotirada — server qayta ko'tarilsa
// bekor bo'ladi va bu TO'G'RI: eski taklifni ko'r-ko'rona bajarish
// eng xavfli holat.
const rejalar = new Map();
const REJA_MS = 10 * 60_000;

function rejaniSaqla(reja) {
  const token = crypto.randomBytes(18).toString('base64url');
  rejalar.set(token, { ...reja, vaqt: Date.now() });
  // Eskilarini tozalaymiz
  for (const [k, v] of rejalar) if (Date.now() - v.vaqt > REJA_MS) rejalar.delete(k);
  return token;
}

/**
 * Savolga javob beradi yoki reja taklif qiladi.
 *
 * @param {string} savol
 * @param {Array}  tarix  [{kim:'admin'|'ai', matn}]
 * @returns {{javob:string, qadamlar:Array, reja?:object, takliflar:string[]}}
 */
export async function agentJavobi(savol, tarix = []) {
  const qadamlar = [];

  for (let i = 0; i < MAKS_QADAM; i++) {
    const q = await keyingiQadam(savol, qadamlar, tarix);

    if (q.amal === 'javob') {
      return { javob: q.javob, qadamlar: xulosa(qadamlar), takliflar: q.takliflar };
    }

    if (!VOSITALAR[q.vosita]) {
      // Model yo'q vositani tanladi — bu odatda savol noaniq
      // bo'lganini bildiradi. Aylanani cho'zmaymiz.
      qadamlar.push({ vosita: q.vosita, argumentlar: q.argumentlar,
        natija: { xato: 'Bunday vosita yo‘q' } });
      continue;
    }

    // ── YOZISH: bajarmaymiz, tasdiq so'raymiz ──
    if (yozishmi(q.vosita)) {
      const token = rejaniSaqla({ vosita: q.vosita, argumentlar: q.argumentlar });
      return {
        javob: q.javob || q.reja_izoh || 'Quyidagi o‘zgarishni taklif qilaman.',
        qadamlar: xulosa(qadamlar),
        takliflar: q.takliflar,
        reja: {
          token,
          vosita: q.vosita,
          tavsif: VOSITALAR[q.vosita].tavsif,
          izoh: q.reja_izoh,
          argumentlar: q.argumentlar,
          // Nechta yozuvga tegishini oldindan aytamiz — admin
          // «necha dona?» deb so'ramasin
          soni: Array.isArray(q.argumentlar?.idlar) ? q.argumentlar.idlar.length : 1,
          qaytarib_bolmaydi: q.vosita === 'mahsulot_ochir',
        },
      };
    }

    // ── O'QISH: erkin bajariladi ──
    let natija;
    try {
      natija = await vositaniBajar(q.vosita, q.argumentlar);
    } catch (e) {
      natija = { xato: String(e.message).slice(0, 200) };
    }
    qadamlar.push({ vosita: q.vosita, argumentlar: q.argumentlar, natija });
  }

  // Qadamlar tugadi — bor ma'lumot bilan javob beramiz
  return {
    javob: 'Bu topshiriq juda ko‘p qadam talab qildi. Savolni kichikroq '
         + 'bo‘laklarga bo‘lib bering — masalan avval «nechta takror bor?» deb so‘rang.',
    qadamlar: xulosa(qadamlar),
    takliflar: [],
  };
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
    return { ok: false, xabar: 'Taklif eskirdi yoki allaqachon bajarilgan. Qaytadan so‘rang.' };
  }
  rejalar.delete(String(token));
  if (Date.now() - reja.vaqt > REJA_MS) {
    return { ok: false, xabar: 'Taklif eskirdi. Qaytadan so‘rang.' };
  }
  try {
    const natija = await vositaniBajar(reja.vosita, reja.argumentlar);
    return { ok: true, vosita: reja.vosita, natija };
  } catch (e) {
    return { ok: false, xabar: String(e.message).slice(0, 200) };
  }
}

/** Sinov uchun. */
export const rejalarniTozala = () => rejalar.clear();
export const rejaSoni = () => rejalar.size;
