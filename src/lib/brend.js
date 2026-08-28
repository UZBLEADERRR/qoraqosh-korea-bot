// Brend nomi bitta joydan olinadi: admin uni `dokon_nomi` sozlamasidan
// o'zgartirsa, bot, Mini App va rasmlar birdaniga yangi nom bilan ishlaydi.
import { qator, sozlama } from '../db.js';
import { kesh } from './kesh.js';

export const BREND_STANDART = 'Meduza Cosmetics';

/** Har xabarda bazaga bormaslik uchun 60 soniya keshlanadi. */
export const brendNomi = () =>
  kesh('brend', 60_000, async () => {
    const n = String(await sozlama('dokon_nomi', BREND_STANDART) || '').replace(/"/g, '').trim();
    return n || BREND_STANDART;
  });

/**
 * Brend logotipi (base64). Sozlanmagan bo'lsa null.
 * Rasm chizishda ishlatiladi, shuning uchun keshlanadi — har tahlilda
 * bazadan bayt tortib o'tirmaymiz.
 */
export const brendLogosi = () =>
  kesh('brend-logo', 5 * 60_000, async () => {
    const id = String(await sozlama('brend_rasm_id', '') || '').replace(/"/g, '').trim();
    if (!id) return null;
    const m = await qator('select bayt, mime from media where id = $1', [id]);
    if (!m?.bayt) return null;
    return { base64: Buffer.from(m.bayt).toString('base64'), mime: m.mime || 'image/png' };
  });
