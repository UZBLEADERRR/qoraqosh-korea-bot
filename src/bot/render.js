// Bot xabarlari. Matnlar bazadagi shablonlardan olinadi (admin panelida
// tahrirlanadi), bu yerda faqat ular qanday to'ldirilishi yozilgan.
import { esc, narx } from './format.js';
import { xabar, shkala, darajaNuqta } from './shablon.js';
import { RAD_SABABLARI } from '../ai/faceAnalysis.js';
import { brendNomi } from '../lib/brend.js';

const RAD_EMOJI = {
  yuz_yoq:'🙈', uzoq:'🔭', xira:'🌫', qorongi:'🌑', yopiq:'🧣',
  bir_nechta:'👥', pardoz:'💄', sunday:'🤖', ekran:'📺', yuz_emas:'🖼',
};


export async function radXabari(sabab, izoh) {
  const s = RAD_SABABLARI[sabab] || RAD_SABABLARI.xira;
  const matn = await xabar('xabar_rad', {
    emoji: RAD_EMOJI[sabab] || '🌫',
    sabab: esc(s.matn) + (izoh ? `\n<i>${esc(izoh)}</i>` : ''),
  }, '{emoji} <b>Bu rasm to‘g‘ri kelmadi</b>\n\n{sabab}\n\n📸 Yangi rasm yuboring.');
  return matn;
}

const holatSozi = (b) =>
  b >= 80 ? 'a’lo 👏' : b >= 65 ? 'yaxshi 🙂' : b >= 50 ? "o‘rtacha 😌"
  : b >= 35 ? "e’tibor kerak 😕" : 'zaif 😟';

/**
 * Rasm ostidagi qisqa izoh — botdagi ASOSIY xabar.
 *
 * Ilgari bot ikkita xabar yuborardi: rasm + uzun matn. Matn rasmda
 * ko'ringan narsani takrorlardi va chat to'lib ketardi. Endi bitta xabar:
 * rasm, ostida bir necha qator va tugmalar. Tafsilot rasmda, to'liq
 * ma'lumot ilovada.
 *
 * @param {object} a            tahlil natijasi
 * @param {number} tavsiyaSoni
 */
export async function qisqaIzoh(a, tavsiyaSoni = 0) {
  const muammolar = a.muammolar || [];
  const eng = muammolar.slice().sort((x, y) => (y.foiz ?? 0) - (x.foiz ?? 0))[0];

  return xabar('xabar_tahlil_qisqa', {
    ball:        a.ball ?? 0,
    yosh:        esc(a.taxminiy_yosh || ''),
    teri_turi:   esc(a.teri_turi || ''),
    muammo_soni: muammolar.length,
    // Bitta ham belgi topilmasa «eng kuchlisi» degan qism umuman chiqmaydi
    eng_kuchli:  eng ? ` — eng kuchlisi: <b>${esc(eng.nom)}</b> (${eng.foiz ?? 0}%)` : '',
    tavsiya_soni: tavsiyaSoni,
  }, '🔬 <b>Tahlil tayyor</b>\n\n✨ Teri holati: <b>{ball}/100</b>\n'
   + '🔍 {muammo_soni} ta belgi topildi{eng_kuchli}\n\n'
   + '💡 Siz uchun <b>{tavsiya_soni} ta mahsulot</b> tanlandi\nTavsiyalarni ko‘ring 👇\n\n'
   + '⚕️ <i>AI tahlili tibbiy tashxis emas.</i>');
}

/**
 * TO'LIQ matnli tahlil — faqat RASM CHIZILMAGANDA ishlatiladi.
 *
 * Botda faqat: teri holati, topilgan belgilar (nomi, foizi va zonasi) va
 * ilovaga chaqiriq. Sabab, yechim, prognoz va to'liq tavsiya ILOVADA —
 * «Tavsiyani ochish» tugmasi ostida. Telegramda uzun xabar o'qilmaydi va
 * odam tugmagacha yetib bormaydi.
 *
 * @param {object} a            tahlil natijasi
 * @param {number} tavsiyaSoni
 * @param {number} maxMuammo    botda nechtasini ko'rsatish (qolgani ilovada)
 */
export async function tahlilXabari(a, tavsiyaSoni = 0, maxMuammo = 4) {
  const bolaklar = [];

  bolaklar.push(await xabar('xabar_tahlil_bosh', {
    yosh:       esc(a.taxminiy_yosh || '—'),
    teri_turi:  esc(a.teri_turi || '—'),
    teri_rangi: esc(a.teri_rangi || ''),
    ball:       a.ball ?? 0,
    baho:       holatSozi(a.ball ?? 0),
    shkala:     shkala(a.ball ?? 0),
    dokon:      esc(await brendNomi()),
  }));

  if (a.oflayn) bolaklar.push('<i>⚠️ AI hozir mavjud emas — bazaviy tavsiya.</i>');

  // ---- Muammolar: bittasi bitta qator ----
  const muammolar = (a.muammolar || []).slice(0, maxMuammo);
  if (muammolar.length) {
    // Har bir muammo ALOHIDA bo'lak: Telegramda bo'sh qator bilan
    // ajratilgani o'qishni ancha osonlashtiradi
    bolaklar.push(await xabar('xabar_muammolar_sarlavha', {}, '🔍 <b>Aniqlangan muammolar</b>'));
    const qatorlar = [];

    for (const m of muammolar) {
      const foiz = m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25);
      qatorlar.push(await xabar('blok_muammo', {
        nuqta:  darajaNuqta(m.daraja),
        nom:    esc(m.nom),
        foiz,
        shkala: shkala(foiz),
        zona:   esc(m.zona || ''),
        izoh:   esc(m.izoh || ''),
        sabab:  esc(m.sabab || ''),
        yechim: esc(m.yechim || ''),
      }, '{nuqta} <b>{nom}</b> · {foiz}%'));
    }

    const qolgan = (a.muammolar || []).length - muammolar.length;
    if (qolgan > 0) qatorlar.push(`<i>…va yana ${qolgan} tasi ilovada</i>`);
    bolaklar.push(qatorlar.join('\n\n'));
  }

  // Tugmaga chaqiriq HAR DOIM bo'ladi — botdagi xabarning butun maqsadi
  // shu: odamni ilovaga olib kirish. Tavsiya chiqmagan holatda ham
  // sabab va yechim o'sha yerda.
  bolaklar.push(tavsiyaSoni
    ? await xabar('xabar_tahlil_yakun', { tavsiya_soni: tavsiyaSoni },
        '💡 <b>Siz uchun {tavsiya_soni} ta mahsulot tanlandi</b>\n\n'
        + 'Teri muammolaringizga mos tavsiyalarni ko‘ring 👇')
    : '💡 Har bir belgining sababi va yechimi ilovada 👇');
  bolaklar.push(await xabar('ogohlantirish_tibbiy', {}, ''));

  return bolaklar.filter(Boolean).join('\n\n');
}

/** PUBLIC_URL bo'lmagan holat uchun zaxira: tavsiyani matnda beramiz. */
export function tavsiyaMatni(tavsiyalar, mahsulotlar) {
  const karta = new Map(mahsulotlar.map((p) => [p.id, p]));
  const BOSQICH = {
    tozalash:'🫧 Tozalash', toner:'💧 Toner', davolash:'🧪 Serum',
    namlash:'🫙 Namlash', himoya:'☀️ SPF', qoshimcha:'🎭 Qo‘shimcha',
    ichki:'💊 Ichki qabul',
  };
  const q = ['💡 <b>Sizga mos parvarish</b>', ''];
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
