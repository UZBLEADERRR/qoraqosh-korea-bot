// O'zbekcha nomlarni to'ldirish.
//
// Ilovada mijoz o'zbekcha nomni ko'radi, buyurtma va xarid ro'yxati
// esa ASL nom bilan ketadi — Koreyadan aynan shu mahsulotni topish
// kerak. Shuning uchun `name` hech qachon o'zgartirilmaydi.
import { sorov, qatorlar } from '../db.js';
import { nomUzAI, tozala } from '../ai/nom-uz.js';
import { aiBormi } from '../ai/index.js';
import { keshniTashla } from '../lib/kesh.js';

const PARTIYA = 20;

const TANLOV = `select id, name, brand, step, volume from products`;

/**
 * O'zbekcha nomi yo'q mahsulotlarni to'ldiradi.
 *
 * @param {object}  o
 * @param {boolean} [o.hammasi]  mavjudlari ham qayta yoziladi
 * @param {number}  [o.chegara]  bir yurishda nechta mahsulot
 * @returns {Promise<{jami:number, yozildi:number, xato:number}>}
 */
export async function nomlarniToldir({ hammasi = false, chegara = 300 } = {}) {
  if (!aiBormi()) return { jami: 0, yozildi: 0, xato: 0, sabab: 'AI kaliti yo‘q' };

  const royxat = await qatorlar(
    `${TANLOV}
      where is_active ${hammasi ? '' : `and coalesce(nullif(trim(nom_uz), ''), null) is null`}
      order by id limit $1`, [Math.max(1, Math.min(2000, chegara))]);
  if (!royxat.length) return { jami: 0, yozildi: 0, xato: 0 };

  let yozildi = 0, xato = 0;
  for (let i = 0; i < royxat.length; i += PARTIYA) {
    const bolak = royxat.slice(i, i + PARTIYA);
    try {
      const xarita = await nomUzAI(bolak);
      for (const [id, nom] of xarita) {
        await saqla(id, nom);
        yozildi++;
      }
    } catch (e) {
      // Bir partiya yiqilsa qolganini davom ettiramiz: yarim
      // o'zbekchalashtirilgan katalog umuman o'zbekchasizdan yaxshi
      xato += bolak.length;
      console.warn('NOM_UZ AI xatosi:', e.message?.slice(0, 140));
    }
  }
  if (yozildi) keshniTashla('katalog');
  return { jami: royxat.length, yozildi, xato };
}

/** Bitta mahsulot uchun (import oxirida chaqiriladi). */
export async function nomniQosh(id) {
  if (!aiBormi()) return null;
  const [p] = await qatorlar(`${TANLOV} where id = $1`, [id]);
  if (!p) return null;
  try {
    const nom = (await nomUzAI([p])).get(p.id);
    if (nom) { await saqla(p.id, nom); return nom; }
  } catch { /* asl nom bilan qolaveradi — do'kon ishlashda davom etadi */ }
  return null;
}

/** Admin qo'lda tahrirlaganda ham shu yerdan o'tadi. */
export async function saqla(id, xom) {
  const nom = tozala(xom);
  await sorov(
    `update products set nom_uz = nullif($2, ''), updated_at = now() where id = $1`,
    [id, nom]);
  keshniTashla('katalog');
  return nom;
}

/** Ilovada ko'rsatiladigan nom. Asl nom — zaxira. */
export const korinadiganNom = (p) =>
  String(p?.nom_uz || '').trim() || String(p?.name || '').trim();

/** Nechtasida o'zbekcha nom yo'q — panelda ogohlantirish uchun. */
export const nomsizSoni = () => qatorlar(
  `select count(*)::int as n from products
    where is_active and coalesce(nullif(trim(nom_uz), ''), null) is null`)
  .then((r) => r[0]?.n ?? 0);
