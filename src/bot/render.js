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
 * Tahlil xulosasi. Har muammo: foiz shkalasi, aniq joyi, sababi va yechimi.
 * @param {object} a            tahlil natijasi
 * @param {number} tavsiyaSoni
 * @param {number} maxMuammo    botda nechtasini ko'rsatish (qolgani ilovada)
 */
export async function tahlilXabari(a, tavsiyaSoni = 0, maxMuammo = 3) {
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

  // ---- Muammolar: har biri o'z bloki ----
  const muammolar = (a.muammolar || []).slice(0, maxMuammo);
  if (muammolar.length) {
    bolaklar.push(await xabar('xabar_muammolar_sarlavha', {}, '🔍 <b>Nima topdim</b>'));

    for (const m of muammolar) {
      const foiz = m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25);
      let blok = await xabar('blok_muammo', {
        nuqta:  darajaNuqta(m.daraja),
        nom:    esc(m.nom),
        foiz,
        shkala: shkala(foiz),
        zona:   esc(m.zona || ''),
        izoh:   esc(m.izoh || ''),
        sabab:  esc(m.sabab || ''),
        yechim: esc(m.yechim || ''),
      }, '{nuqta} <b>{nom}</b>\n{shkala} {foiz}%\n📍 {zona}');

      if (m.ogohlantirish) {
        blok += '\n' + await xabar('blok_ogohlantirish',
          { ogohlantirish: esc(m.ogohlantirish) }, '⚠️ <i>{ogohlantirish}</i>');
      }
      bolaklar.push(blok);
    }

    const qolgan = (a.muammolar || []).length - muammolar.length;
    if (qolgan > 0) bolaklar.push(`<i>…va yana ${qolgan} ta — ilovada ko‘ring</i>`);
  }

  // ---- Prognoz ----
  const prognoz = (a.prognoz || []).slice().sort((x, y) => y.ehtimol - x.ehtimol).slice(0, 2);
  if (prognoz.length) {
    bolaklar.push(await xabar('xabar_prognoz_sarlavha', {}, '⏳ <b>Agar e’tibor bermasangiz</b>'));
    for (const p of prognoz) {
      bolaklar.push(await xabar('blok_prognoz', {
        muammo:  esc(p.muammo),
        natija:  esc(p.natija || ''),
        ehtimol: p.ehtimol,
        muddat:  esc(p.muddat || ''),
        shkala:  shkala(p.ehtimol),
      }, '{shkala} {ehtimol}% · {muddat}\n<b>{muammo}</b> → {natija}'));
    }
  }

  if (tavsiyaSoni) {
    bolaklar.push(await xabar('xabar_tahlil_yakun', { tavsiya_soni: tavsiyaSoni },
      '💡 Sizga <b>{tavsiya_soni} ta mahsulot</b> tanladim.'));
  }
  bolaklar.push(await xabar('ogohlantirish_tibbiy', {}, ''));

  return bolaklar.filter(Boolean).join('\n\n');
}

/** PUBLIC_URL bo'lmagan holat uchun zaxira: tavsiyani matnda beramiz. */
export function tavsiyaMatni(tavsiyalar, mahsulotlar) {
  const karta = new Map(mahsulotlar.map((p) => [p.id, p]));
  const BOSQICH = {
    tozalash:'🫧 Tozalash', toner:'💧 Toner', davolash:'🧪 Serum',
    namlash:'🫙 Namlash', himoya:'☀️ SPF', qoshimcha:'🎭 Qo‘shimcha',
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
