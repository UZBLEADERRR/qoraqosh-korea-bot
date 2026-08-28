// Tahlil natijasini Telegram xabariga aylantirish.
// Ketma-ketlik qat'iy: umumiy ma'lumot -> muammolar -> davolanmasa nima bo'ladi
// -> bosqichma-bosqich tavsiya (nima uchun tushuntirish bilan).
import { esc, narx, jadval, royxat, shkala, darajaBelgi } from './format.js';
import { RAD_SABABLARI } from '../ai/faceAnalysis.js';

const BOSQICH_NOM = {
  tozalash:  'Tozalash',
  toner:     'Toner / balans',
  davolash:  'Davolash (serum)',
  namlash:   'Namlash',
  himoya:    'Quyoshdan himoya',
  qoshimcha: 'Qo‘shimcha (haftalik)',
};
const RAQAM = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];

const holatSozi = (b) =>
  b >= 80 ? 'a’lo' : b >= 65 ? 'yaxshi' : b >= 50 ? "o‘rtacha" : b >= 35 ? "e’tibor talab qiladi" : 'zaif';

/** Rasm rad etilganda ko'rsatiladigan xabar. */
export function radXabari(sabab, izoh) {
  const s = RAD_SABABLARI[sabab] || RAD_SABABLARI.xira;
  return [
    `${s.emoji} <b>Bu rasmni tahlil qila olmadim</b>`,
    ``,
    `<b>Sabab:</b> ${esc(s.matn)}`,
    izoh ? `<i>${esc(izoh)}</i>` : '',
    ``,
    `<b>Yaxshi natija uchun:</b>`,
    `• Yuzingiz kadrning kamida yarmini egallasin`,
    `• Kunduzgi yorug‘likda yoki oyna oldida turing`,
    `• To‘g‘ridan-to‘g‘ri kameraga qarang`,
    `• Pardozsiz, filtrsiz — teri o‘z holida ko‘rinsin`,
    `• Sochingiz yuzni yopmasin, ko‘zoynakni yeching`,
    ``,
    `📸 Yangi rasm yuboring.`,
  ].filter(Boolean).join('\n');
}

/** 1-xabar: tahlil (umumiy -> muammolar -> prognoz). */
export function tahlilXabari(a) {
  const q = [];
  q.push(`🔬 <b>TERI TAHLILI</b>`);
  if (a.oflayn) q.push(`<i>⚠️ AI hozir mavjud emas — bazaviy tavsiya ko‘rsatilmoqda.</i>`);
  q.push('');

  // ---- 1. Umumiy ma'lumot ----
  q.push(`<b>👤 Umumiy ma’lumot</b>`);
  q.push(royxat([
    ['Taxminiy yosh', a.taxminiy_yosh || '—'],
    ['Teri rangi',    a.teri_rangi || '—'],
    ['Teri turi',     a.teri_turi || '—'],
    ['Umumiy holat',  `${shkala(a.ball)} ${a.ball}/100`],
    ['Baho',          holatSozi(a.ball)],
  ]));
  if (a.xulosa) q.push(`<blockquote>${esc(a.xulosa)}</blockquote>`);

  // ---- 2. Muammolar ----
  if (a.muammolar?.length) {
    q.push('');
    q.push(`<b>📋 Aniqlangan muammolar</b>`);
    q.push(jadval(
      ['Muammo', 'Daraja', 'Joyi'],
      a.muammolar.map((m) => [m.nom, darajaBelgi(m.daraja).replace(/^[▁▄█] /, ''), m.zona || '—']),
    ));
    for (const m of a.muammolar) {
      if (m.izoh) q.push(`• <b>${esc(m.nom)}</b> — ${esc(m.izoh)}`);
    }
  }

  // ---- 3. E'tibor berilmasa nima bo'ladi ----
  if (a.prognoz?.length) {
    q.push('');
    q.push(`<b>⏳ Agar e’tibor berilmasa</b>`);
    q.push(jadval(
      ['Muammo', 'Ehtimol', 'Muddat'],
      a.prognoz.map((p) => [p.muammo, `${p.ehtimol}%`, p.muddat || '—']),
      { ong: [false, true, false] },
    ));
    for (const p of a.prognoz) {
      q.push(`• <b>${esc(p.muammo)}</b> → ${esc(p.natija)}`);
    }
    q.push('');
    q.push(`<i>Bu ehtimollik baholari, tashxis emas. Jiddiy muammoda dermatologga murojaat qiling.</i>`);
  }

  return q.join('\n');
}

/** 2-xabar: bosqichma-bosqich tavsiya + nima uchun. */
export function tavsiyaXabari(tavsiyalar, mahsulotlar) {
  const karta = new Map(mahsulotlar.map((p) => [p.id, p]));
  const q = [];

  q.push(`💡 <b>SIZGA MOS PARVARISH</b>`);
  q.push(`<i>Quyidagi tartibda qo‘llang — ketma-ketlik natijaga ta’sir qiladi.</i>`);
  q.push('');

  let jami = 0;
  let n = 0;
  for (const t of tavsiyalar) {
    const p = karta.get(t.product_id);
    if (!p) continue;
    jami += p.price;

    q.push(`<b>${RAQAM[n++] || '•'} ${BOSQICH_NOM[t.bosqich] || t.bosqich}</b>`);
    q.push(`${p.emoji || '🧴'} <b>${esc(p.name)}</b>`);
    q.push(`<i>${esc(p.brand || '')}${p.volume ? ' · ' + esc(p.volume) : ''}</i> — <b>${narx(p.price)}</b>`);
    if (t.sabab) q.push(`<blockquote>❓ <b>Nega aynan shu:</b> ${esc(t.sabab)}</blockquote>`);
    if (p.usage_text) q.push(`📖 <b>Qanday:</b> ${esc(p.usage_text)}`);
    if (p.warnings) q.push(`⚠️ ${esc(p.warnings)}`);
    q.push('');
  }

  if (!jami) {
    return `💡 Hozircha omborda mos mahsulot yo‘q. Tez orada to‘ldiramiz — /katalog orqali kuzatib boring.`;
  }

  q.push(`<b>To‘liq to‘plam:</b> ${narx(jami)}`);
  q.push(`<i>Hammasini birdan olish shart emas — tozalash, namlash va SPF dan boshlang.</i>`);
  return q.join('\n');
}

/** Tavsiya ostidagi tugmalar. */
export function tavsiyaTugmalari(tavsiyalar, appUrl) {
  const qatorlar = [];
  if (appUrl) {
    qatorlar.push([{ text: '🛒 Hammasini savatga solish', web_app: { url: `${appUrl}/app/?tavsiya=1` } }]);
    qatorlar.push([{ text: '🛍 Katalogni ochish', web_app: { url: `${appUrl}/app/` } }]);
  }
  qatorlar.push([{ text: '🔄 Boshqa rasm bilan qayta tahlil', callback_data: 'skaner' }]);
  return { inline_keyboard: qatorlar };
}
