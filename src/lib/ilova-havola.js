// Mini App ga TO'G'RIDAN-TO'G'RI havola (t.me/<bot>/<qisqa_nom>).
//
// Nega kerak. Telefon bosh ekraniga qo'yilgan yorliq bot suhbatini
// ochib qo'yardi, ilovani emas. Sabab: Telegram yorliqni ilova QANDAY
// ochilganiga qarab yasaydi. `web_app` tugmasidan ochilgan ilova bot
// suhbatiga bog'langan bo'ladi; to'g'ridan-to'g'ri havoladan
// (t.me/bot/app) ochilgani esa ilovaning o'ziga.
//
// Shuning uchun bot tugmalari qisqa nom sozlanganda o'sha havolani
// ishlatadi, brauzerdagi PWA yorlig'i ham shu havolaga olib boradi.
//
// Qisqa nomni faqat egasi qo'ya oladi: BotFather → /mybots → bot →
// Bot Settings → Configure Mini App. Keyin admin panelda yoziladi.
import { config } from '../config.js';
import { sozlama } from '../db.js';
import { tg } from '../bot/tg.js';

let nomKesh = null;
let nomVaqti = 0;
const KESH_MS = 60 * 60 * 1000;

/** Botning @username i. getMe bir marta so'raladi va keshlanadi. */
export async function botNomi() {
  if (nomKesh && Date.now() - nomVaqti < KESH_MS) return nomKesh;
  try {
    const r = await tg('getMe');
    if (r?.ok && r.result?.username) {
      nomKesh = r.result.username;
      nomVaqti = Date.now();
    }
  } catch { /* tarmoq yo'q — pastdagi zaxiraga tushamiz */ }
  return nomKesh || String(await sozlama('bot_username', '') || '') || null;
}

/** Keshni tozalaydi (sinov va sozlama o'zgarganda). */
export const nomniUnut = () => { nomKesh = null; nomVaqti = 0; };

/**
 * Mini App ni ochadigan havola.
 *
 * @param {string} [start]  startapp parametri (masalan mahsulot id si)
 * @returns {Promise<string|null>} qisqa nom ham, bot nomi ham bo'lmasa null
 */
export async function ilovaHavolasi(start = '') {
  const bot = await botNomi();
  if (!bot) return null;
  const qisqa = String(await sozlama('mini_app_nom', '') || '').trim()
    .replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '');
  // Qisqa nom bo'lsa — to'g'ridan-to'g'ri ilova havolasi.
  // Bo'lmasa — «asosiy Mini App» havolasi: u ham ilovani ochadi,
  // lekin BotFather'da Main Mini App belgilangan bo'lishi kerak.
  const s = start ? `?startapp=${encodeURIComponent(start)}` : '';
  return qisqa ? `https://t.me/${bot}/${qisqa}${s}`
               : `https://t.me/${bot}${s || '?startapp=ilova'}`;
}

/**
 * Ilovani ochadigan inline tugma. HAR DOIM `web_app`.
 *
 * Ilgari qisqa nom sozlangan bo'lsa `url` tugmasi qaytarilardi —
 * bosh ekrandagi yorliq ilovaga bog'lansin deb. Lekin qisqa nom
 * BotFather'da haqiqatan ro'yxatdan o'tmagan bo'lsa (yoki xato
 * yozilgan bo'lsa) `t.me/<bot>/<nom>` o'lik havola bo'lib qoladi va
 * DO'KON UMUMAN OCHILMAYDI. Do'kon — asosiy amal, u hech qanday
 * sozlamaga bog'liq bo'lmasligi kerak.
 *
 * `web_app` esa har doim ishlaydi. Qisqa nom o'z ishini `/app/ochish`
 * da bajaradi: brauzerdagi «Telegramda ochish» tugmasi va PWA yorlig'i
 * o'sha manzilga boradi.
 */
export async function ilovaTugmasi(matn, yol = '/app/') {
  return config.publicUrl
    ? { text: matn, web_app: { url: `${config.publicUrl}${yol}` } }
    : null;
}
