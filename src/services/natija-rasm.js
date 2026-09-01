// Tahlil natijasining rasmini chizadi, saqlaydi va yuboradi.
// Bot ham, Mini App ham shu yerdan foydalanadi — natija ikkalasida bir xil.
import { qator, qatorlar, sorov, sozlama } from '../db.js';
import { natijaSvg } from '../rasm/natija-kartochka.js';
import { svgdanPng, rasmOlchami } from '../rasm/chiz.js';
import { rasmYubor } from '../bot/tg.js';
import { brendNomi, brendLogosi } from '../lib/brend.js';

const BOSQICH_NOMI = {
  tozalash: 'Tozalash', toner: 'Toner', davolash: 'Davolash',
  namlash: 'Namlash', himoya: 'Himoya', qoshimcha: 'Qo‘shimcha',
};

/** Tahlildagi product_id larni katalogdagi nom/brend bilan bog'laydi. */
export function tavsiyaRoyxati(tahlil, mahsulotlar = []) {
  const karta = new Map(mahsulotlar.map((p) => [Number(p.id), p]));
  return (tahlil?.tavsiya || tahlil?.routine || [])
    .map((r) => {
      const p = karta.get(Number(r.product_id));
      if (!p) return null;
      return {
        bosqich: BOSQICH_NOMI[r.bosqich] || r.bosqich || '',
        nom: p.name, brend: p.brand || '', poster_id: p.poster_id || null,
      };
    })
    .filter(Boolean);
}

/**
 * Tavsiyalarga mahsulot rasmini qo'shadi.
 * Rasmsiz kartochka bo'sh ko'rinadi — odam nimani sotib olayotganini
 * ko'rmaydi. Bir so'rovda hammasini olamiz.
 */
async function tavsiyaRasmlari(tavsiyalar) {
  const idlar = tavsiyalar.map((r) => r.poster_id).filter(Boolean);
  if (!idlar.length) return tavsiyalar;

  const m = await qatorlar(
    'select id, mime, bayt from media where id = any($1::uuid[])', [idlar]);
  const karta = new Map(m.map((r) => [String(r.id), r]));

  return tavsiyalar.map((r) => {
    const rasm = r.poster_id ? karta.get(String(r.poster_id)) : null;
    if (!rasm?.bayt || !OCHILADI.has(String(rasm.mime || '').toLowerCase())) return r;
    return { ...r, rasmBase64: Buffer.from(rasm.bayt).toString('base64'), rasmMime: rasm.mime };
  });
}

// resvg <image> ichida faqat shu turlarni ocha oladi. iPhone HEIC yuborsa
// rasm o'rniga bo'sh joy qolmasin — suratsiz ko'rinishga o'tamiz.
const OCHILADI = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif']);

/**
 * Rasmni chizadi va media jadvaliga saqlaydi.
 * @returns {Promise<{bayt:Buffer, mediaId:string}|null>} motor yo'q bo'lsa null
 */
export async function natijaRasminiYarat({ analysisId, userId, rasmBase64, mime, tahlil, mahsulotlar }) {
  const mos = OCHILADI.has(String(mime || '').toLowerCase());
  const [brend, logo, tavsiyalar] = await Promise.all([
    brendNomi(), brendLogosi(),
    tavsiyaRasmlari(tavsiyaRoyxati(tahlil, mahsulotlar)),
  ]);

  // Muammo doiralarini yuzning to'g'ri joyiga qo'yish uchun asl surat
  // o'lchami kerak: surat kvadrat ramkaga qirqib joylanadi.
  const olcham = mos && rasmBase64
    ? rasmOlchami(Buffer.from(rasmBase64, 'base64').subarray(0, 65536))
    : null;

  const svg = natijaSvg({
    rasmBase64: mos ? rasmBase64 : null,
    mime: mos ? mime : 'image/jpeg',
    rasmOlchami: olcham,
    tahlil,
    tavsiyalar,
    brend,
    logoBase64: logo && OCHILADI.has(logo.mime) ? logo.base64 : null,
    logoMime: logo?.mime || 'image/png',
  });

  let bayt;
  try {
    bayt = await svgdanPng(svg, 1080);
  } catch (e) {
    // Rasm chizilmasa tahlil baribir matn bilan yetkaziladi — to'xtatmaymiz
    console.error('NATIJA RASMI CHIZILMADI:', e.message);
    return null;
  }

  const m = await qator(
    `insert into media (tur, mime, bayt, hajm, eni, goya)
     values ('natija', 'image/png', $1, $2, 1080, $3) returning id`,
    [bayt, bayt.length, `Tahlil #${analysisId ?? '-'}`]);

  if (analysisId) {
    await sorov('update analyses set natija_rasm_id = $1 where id = $2', [m.id, analysisId])
      .catch(() => {});
  }
  return { bayt, mediaId: m.id };
}

/**
 * Foydalanuvchi suratini saqlaydi — ILOVADA ko'rsatish uchun.
 *
 * Surat faqat shu odamning o'z tahliliga bog'lanadi va /ochir bilan
 * tahlillar bilan birga o'chadi. Admin `yuz_rasm_saqlansin` ni o'chirsa
 * umuman saqlanmaydi (u holda ilovada surat o'rniga natija kartochkasi
 * ko'rinadi). Surat qayta kodlanmaydi: klient allaqachon 1024 px gacha
 * kichraytirib yuboradi.
 */
export async function yuzniSaqla({ analysisId, rasmBase64, mime }) {
  if (!analysisId || !rasmBase64) return null;
  if (!OCHILADI.has(String(mime || '').toLowerCase())) return null;
  if (!(await sozlama('yuz_rasm_saqlansin', true))) return null;

  try {
    const bayt = Buffer.from(rasmBase64, 'base64');
    // Juda katta suratni saqlamaymiz — bazani shishirmaslik uchun
    if (bayt.length > 3 * 1024 * 1024) return null;

    const m = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('yuz', $1, $2, $3, $4) returning id`,
      [mime, bayt, bayt.length, `Tahlil #${analysisId}`]);
    await sorov('update analyses set yuz_rasm_id = $1 where id = $2', [m.id, analysisId]);
    return m.id;
  } catch (e) {
    // Surat saqlanmasa tahlil baribir ishlaydi — to'xtatmaymiz
    console.error('YUZ RASMI SAQLANMADI:', e.message);
    return null;
  }
}

/** Saqlangan natija rasmini oladi. */
export async function saqlanganRasm(analysisId, userId) {
  const r = await qator(
    `select m.bayt from analyses a
       join media m on m.id = a.natija_rasm_id
      where a.id = $1 and a.user_id = $2`, [analysisId, userId]);
  return r?.bayt ? Buffer.from(r.bayt) : null;
}

/** Foydalanuvchiga natija rasmini yuboradi. */
export const rasmniMijozgaYubor = (telegramId, bayt, izoh, extra) =>
  rasmYubor(telegramId, bayt, izoh, extra);

// ══════════════════ KANALLAR ══════════════════

/**
 * Tahlil natijasini tahlillar kanaliga yuboradi.
 * Kanalga yuz surati ketadi, shuning uchun ATAYLAB o'chiq turadi —
 * admin `kanal_tahlil_yoqilgan` ni ochmaguncha hech narsa yuborilmaydi.
 */
export async function kanalgaTahlil(bayt, user, tahlil) {
  const [kanal, yoqilgan] = await Promise.all([
    sozlama('kanal_tahlil', ''),
    sozlama('kanal_tahlil_yoqilgan', false),
  ]);
  if (!kanal || !yoqilgan || !bayt) return;

  const muammolar = (tahlil?.muammolar || []).slice(0, 3)
    .map((m) => `• ${m.nom} — ${m.foiz}%`).join('\n');

  const izoh = [
    `🔬 <b>Yangi tahlil</b>`,
    ``,
    `👤 ${esc(user?.full_name || 'Mijoz')}${user?.username ? ` (@${esc(user.username)})` : ''}`,
    `📊 Ball: <b>${tahlil?.ball ?? '-'}/100</b> · ${esc(tahlil?.teri_turi || '')} teri`,
    tahlil?.taxminiy_yosh ? `🎂 Taxminiy yosh: ${esc(tahlil.taxminiy_yosh)}` : '',
    muammolar ? `\n<b>Muammolar:</b>\n${esc(muammolar)}` : '',
  ].filter(Boolean).join('\n');

  await rasmYubor(kanal, bayt, izoh).catch((e) =>
    console.error('TAHLIL KANALI:', e.message));
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
