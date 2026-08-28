// Brend nomi bitta joydan olinadi: admin uni `dokon_nomi` sozlamasidan
// o'zgartirsa, bot, Mini App va rasmlar birdaniga yangi nom bilan ishlaydi.
import { sozlama } from '../db.js';
import { kesh } from './kesh.js';

export const BREND_STANDART = 'Meduza Cosmetics';

/** Har xabarda bazaga bormaslik uchun 60 soniya keshlanadi. */
export const brendNomi = () =>
  kesh('brend', 60_000, async () => {
    const n = String(await sozlama('dokon_nomi', BREND_STANDART) || '').replace(/"/g, '').trim();
    return n || BREND_STANDART;
  });
