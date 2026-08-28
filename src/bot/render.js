// Bot xabarlari. Tamoyil: BOT QISQA GAPIRADI.
// Batafsil natija — jadval, izohlar, "nega aynan shu" — Mini App'da,
// u yerda joy ko'p va chiroyli ko'rsatish mumkin.
import { esc, narx, shkala, daraja, darajaSoz } from './format.js';
import { RAD_SABABLARI } from '../ai/faceAnalysis.js';

const RAD_EMOJI = {
  yuz_yoq:'🙈', uzoq:'🔭', xira:'🌫', qorongi:'🌑', yopiq:'🧣',
  bir_nechta:'👥', pardoz:'💄', sunday:'🤖', ekran:'📺', yuz_emas:'🖼',
};

/** Rasm rad etilganda — qisqa va aniq. */
export function radXabari(sabab, izoh) {
  const s = RAD_SABABLARI[sabab] || RAD_SABABLARI.xira;
  const q = [`${RAD_EMOJI[sabab] || '🌫'} <b>Bu rasm to‘g‘ri kelmadi</b>`, '', esc(s.matn)];
  if (izoh) q.push(`<i>${esc(izoh)}</i>`);
  q.push('', '☀️ Yorug‘ joyda   🤳 Yaqindan', '👀 To‘g‘riga qarang   🧼 Pardozsiz',
         '', '📸 Yangi rasm yuboring.');
  return q.join('\n');
}

const holatSozi = (b) =>
  b >= 80 ? 'a’lo 👏' : b >= 65 ? 'yaxshi 🙂' : b >= 50 ? "o‘rtacha 😌" : b >= 35 ? "e’tibor kerak 😕" : 'zaif 😟';

/**
 * Tahlil xulosasi — BITTA qisqa xabar.
 * To'liq ro'yxat, prognoz jadvali va "nega aynan shu" Mini App'da.
 */
export function tahlilXabari(a, tavsiyaSoni = 0) {
  const q = [];

  q.push(`🔬 <b>Tahlil tayyor</b>`);
  if (a.oflayn) q.push(`<i>⚠️ AI hozir mavjud emas — bazaviy tavsiya.</i>`);
  q.push('');

  // Umumiy — uch qator, jadvalsiz
  q.push(`👤 ${esc(a.taxminiy_yosh)} yosh · ${esc(a.teri_turi)} teri`);
  if (a.teri_rangi && a.teri_rangi !== '—') q.push(`🎨 ${esc(a.teri_rangi)}`);
  q.push('');
  q.push(`✨ <b>Teri holati: ${a.ball}/100</b> — ${holatSozi(a.ball)}`);
  q.push(shkala(a.ball));

  // Muammolar — eng ko'pi 3 ta, qolgani ilovada
  if (a.muammolar?.length) {
    q.push('');
    q.push(`🔍 <b>Nima topdim</b>`);
    for (const m of a.muammolar.slice(0, 3)) {
      q.push(`${daraja(m.daraja)} ${esc(m.nom)}${m.zona ? ` · <i>${esc(m.zona)}</i>` : ''}`);
    }
    if (a.muammolar.length > 3) q.push(`<i>…va yana ${a.muammolar.length - 3} ta</i>`);
  }

  // Prognoz — faqat eng yuqori ehtimolli bittasi
  const eng = (a.prognoz || []).slice().sort((x, y) => y.ehtimol - x.ehtimol)[0];
  if (eng) {
    q.push('');
    q.push(`⏳ <b>E’tibor bermasangiz</b>`);
    q.push(`${esc(eng.muammo)} — ${eng.ehtimol}% ehtimol, ${esc(eng.muddat)}`);
  }

  if (tavsiyaSoni) {
    q.push('');
    q.push(`💡 Sizga <b>${tavsiyaSoni} ta mahsulot</b> tanladim.`);
    q.push(`Nega aynan shular kerakligini ilovada o‘qing 👇`);
  }

  return q.join('\n');
}

/** PUBLIC_URL bo'lmagan holat uchun zaxira: tavsiyani matnda beramiz. */
export function tavsiyaMatni(tavsiyalar, mahsulotlar) {
  const karta = new Map(mahsulotlar.map((p) => [p.id, p]));
  const BOSQICH = {
    tozalash: '🫧 Tozalash', toner: '💧 Toner', davolash: '🧪 Serum',
    namlash: '🫙 Namlash', himoya: '☀️ SPF', qoshimcha: '🎭 Qo‘shimcha',
  };
  const q = [`💡 <b>Sizga mos parvarish</b>`, ''];
  let jami = 0;
  for (const t of tavsiyalar) {
    const p = karta.get(t.product_id);
    if (!p) continue;
    jami += p.price;
    q.push(`${BOSQICH[t.bosqich] || '•'} — <b>${esc(p.name)}</b>`);
    q.push(`<i>${esc(p.brand || '')}</i> · ${narx(p.price)}`);
    if (t.sabab) q.push(`<blockquote>${esc(t.sabab)}</blockquote>`);
    q.push('');
  }
  if (jami) q.push(`🧾 <b>To‘plam: ${narx(jami)}</b>`);
  return q.join('\n');
}

/** Muammo darajalarining ma'nosi — /yordam uchun. */
export const darajaIzoh = () =>
  ['🟢 yengil', '🟡 o‘rtacha', '🔴 kuchli'].join('   ');

export { darajaSoz };
