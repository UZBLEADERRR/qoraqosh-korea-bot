// Bot xabarlari. Matnlar bazadagi shablonlardan olinadi (admin panelida
// tahrirlanadi), bu yerda faqat ular qanday to'ldirilishi yozilgan.
import { esc, narx } from './format.js';
import { xabar, shkala, darajaNuqta, darajaFoizdan } from './shablon.js';
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

/** «och bug'doyrang, sovuq ton» -> «Och bug'doyrang · Sovuq ton». */
function rangMatni(xom) {
  const bolaklar = String(xom || '').split(/\s*[,;·]\s*/).filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  return bolaklar.join(' · ');
}

// Telegram rasm izohini 1024 belgida kesadi. Kesilgan HTML teg xabarni
// umuman yubormaslikka olib keladi, shuning uchun chegaraga yaqinlashsak
// muammolarni bittalab kamaytiramiz — matn hech qachon o'rtasidan kesilmaydi.
const IZOH_CHEGARA = 980;

/**
 * Rasm ostidagi izoh — botdagi ASOSIY xabar.
 *
 * Tuzilishi: yosh va teri turi, rangi, ball va shkala, topilgan belgilar
 * (nomi, foizi, zonasi), so'ng ilovaga chaqiriq. Sabab, yechim va
 * bosqichma-bosqich parvarish ILOVADA — bu yerda ataylab yo'q: xabarning
 * vazifasi «Tavsiyani ochish» tugmasini bostirish.
 *
 * @param {object} a            tahlil natijasi
 * @param {number} tavsiyaSoni
 * @param {number} maxMuammo    izohda nechtasi ko'rsatilsin
 */
export async function qisqaIzoh(a, tavsiyaSoni = 0, maxMuammo = 4) {
  const hammasi = a.muammolar || [];

  const qatorlar = [];
  for (const m of hammasi.slice(0, maxMuammo)) {
    const foiz = m.foiz ?? (m.daraja === 3 ? 80 : m.daraja === 2 ? 55 : 25);
    qatorlar.push(await xabar('blok_muammo', {
      nuqta: darajaNuqta(m.daraja || darajaFoizdan(foiz)),
      nom:   esc(m.nom),
      foiz,
      zona:  esc(m.zona || ''),
      shkala: shkala(foiz),
    }, '{nuqta} <b>{nom}</b> — {foiz}%\n📍 {zona}'));
  }

  const yig = async (n) => {
    const korsatilgan = qatorlar.slice(0, n);
    const qolgan = hammasi.length - korsatilgan.length;
    if (qolgan > 0) korsatilgan.push(`<i>…va yana ${qolgan} tasi ilovada</i>`);
    return xabar('xabar_tahlil_qisqa', {
      yosh:       esc(a.taxminiy_yosh || '—'),
      teri_turi:  esc(a.teri_turi || '—'),
      teri_rangi: esc(rangMatni(a.teri_rangi)),
      ball:       a.ball ?? 0,
      shkala:     shkala(a.ball ?? 0),
      muammolar:  korsatilgan.length ? korsatilgan.join('\n\n')
                                     : 'Sezilarli belgi topilmadi 👌',
      tavsiya_soni: tavsiyaSoni,
    }, IZOH_STANDART);
  };

  // Chegaraga sig'maguncha muammolarni kamaytiramiz
  let matn = await yig(qatorlar.length);
  for (let n = qatorlar.length - 1; n >= 0 && matn.length > IZOH_CHEGARA; n--) {
    matn = await yig(n);
  }
  return matn;
}

const IZOH_STANDART =
`🔬 <b>Tahlil natijasi</b>

👤 {yosh} · {teri_turi}
🎨 {teri_rangi}

✨ Teri holati: <b>{ball}/100</b>

{shkala}

🔍 <b>Aniqlangan muammolar</b>

{muammolar}

💡 Siz uchun <b>{tavsiya_soni} ta mahsulot</b> tanlandi

<i>Teri muammolaringizga mos tavsiyalarni ko‘ring</i> 👇

⚕️ <i>AI tahlili tibbiy tashxis emas.</i>`;

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
