// Pochta uchun manzillar hujjati (.docx).
//
// Bitta partiyadagi hamma jo'natma bitta faylda: print qilib pochtaga
// olib borish uchun. Ikki qismdan iborat:
//   1) Umumiy jadval — pochta xodimi ro'yxatni bir qarashda ko'radi
//   2) Har jo'natma uchun alohida yorliq — quticha ustiga yopishtirish uchun
import { docx } from '../lib/docx.js';
import { sozlama } from '../db.js';
import { brendNomi } from '../lib/brend.js';

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function sana(d = new Date()) {
  const t = new Date(d.getTime() + 5 * 3600 * 1000);
  return `${t.getUTCDate()}-${OYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const som = (n) => Number(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ') + ' so‘m';

/** Manzilni pochta tartibida: viloyat, tuman, ko'cha. */
function toliqManzil(o) {
  const bor = [o.viloyat, o.tuman].filter(Boolean);
  const manzil = String(o.customer_address || '');
  // Manzil allaqachon viloyat/tuman bilan boshlansa takrorlamaymiz
  if (bor.length && manzil.toLowerCase().startsWith(String(bor[0]).toLowerCase())) return manzil;
  return [...bor, manzil].filter(Boolean).join(', ');
}

/**
 * @param {object} partiya
 * @param {object[]} buyurtmalar
 * @returns {Promise<{bayt:Buffer, nom:string}>}
 */
export async function pochtaHujjati(partiya, buyurtmalar) {
  const [brend, tel, manzil] = await Promise.all([
    brendNomi(),
    sozlama('menejer_telefon', ''),
    sozlama('jonatuvchi_manzil', ''),
  ]);
  const jonatuvchi = String(manzil || '').replace(/"/g, '') || 'Toshkent shahri';
  const jonatuvchiTel = String(tel || '').replace(/"/g, '');

  const bloklar = [
    { tur: 'sarlavha', matn: `${brend} — pochta ro‘yxati` },
    { tur: 'kichik', matn:
      `Partiya ${partiya?.raqam || '—'}  ·  ${sana()}  ·  ${buyurtmalar.length} ta jo‘natma` },
    { tur: 'kichik', matn:
      `Jo‘natuvchi: ${brend}, ${jonatuvchi}${jonatuvchiTel ? `, tel: ${jonatuvchiTel}` : ''}` },
    { tur: 'bosh' },
    { tur: 'jadval',
      sarlavhalar: ['№', 'Qabul qiluvchi', 'Manzil', 'Telefon', 'Buyurtma', 'Summa'],
      enlar: [420, 1900, 3500, 1500, 1450, 1130],
      satrlar: buyurtmalar.map((o, i) => [
        String(i + 1),
        String(o.customer_name || '—'),
        toliqManzil(o),
        String(o.customer_phone || '—'),
        String(o.order_no || '—'),
        som(o.total),
      ]),
    },
    { tur: 'bosh' },
    { tur: 'kichik', matn:
      `Jami: ${buyurtmalar.length} ta jo‘natma, ` +
      `${som(buyurtmalar.reduce((s, o) => s + Number(o.total || 0), 0))}` },
    { tur: 'bosh' },
    { tur: 'kichik', matn: 'Topshirdi: ______________________     Qabul qildi: ______________________' },
  ];

  // ── Yorliqlar: har jo'natma uchun alohida, qutiga yopishtirish uchun ──
  if (buyurtmalar.length) {
    bloklar.push({ tur: 'sahifa' });
    bloklar.push({ tur: 'sarlavha', matn: 'Jo‘natma yorliqlari' });
    bloklar.push({ tur: 'kichik', matn: 'Qirqib, quticha ustiga yopishtiring.' });
    bloklar.push({ tur: 'bosh' });

    for (const o of buyurtmalar) {
      bloklar.push({ tur: 'jadval',
        sarlavhalar: ['KIMDAN', 'KIMGA'],
        enlar: [4400, 5500],
        satrlar: [[
          `${brend}\n${jonatuvchi}${jonatuvchiTel ? `\nTel: ${jonatuvchiTel}` : ''}`,
          `${o.customer_name || '—'}\n${toliqManzil(o)}\nTel: ${o.customer_phone || '—'}\n` +
          `Buyurtma: ${o.order_no}`,
        ]],
      });
      bloklar.push({ tur: 'bosh' });
    }
  }

  return {
    bayt: docx(bloklar),
    nom: `pochta-${partiya?.raqam || 'royxat'}.docx`,
  };
}
