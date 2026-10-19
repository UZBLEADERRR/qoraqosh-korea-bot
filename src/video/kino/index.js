// KINO — animatsion hikoya-video (Reels 2.0). Tashqi kirish nuqtasi.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

export { kanvasBormi } from './kanvas.js';
export { SAHNA_TURLARI, MAVZULAR } from './sahnalar.js';
export { QAHRAMONLAR, HISSIYOTLAR, IMOLAR } from './qahramon.js';
export { MUSIQALAR } from './musiqa.js';
export { kadrPng, vaqtJadvali } from './motor.js';

/**
 * Videoni alohida oqimda yasaydi.
 * @param {object} loyiha  motor.videoYasa formati
 * @param {{sifat?: 'toliq'|'orta'|'sinov', vaqtMs?: number}} [o]
 * @returns {Promise<{mp4: Buffer, soniya: number, jadval: object[]}>}
 */
export async function kinoYasa(loyiha, { sifat = 'toliq', vaqtMs = 12 * 60_000 } = {}) {
  const papka = await fs.mkdtemp(path.join(os.tmpdir(), 'kino-w-'));
  const chiqish = path.join(papka, 'video.mp4');
  try {
    const javob = await new Promise((ok, yoq) => {
      const w = new Worker(new URL('./ishchi.js', import.meta.url), { workerData: { loyiha, sifat, chiqish } });
      const t = setTimeout(() => { w.terminate(); yoq(Object.assign(new Error('Video yasash juda uzoq davom etdi'), { turkum: 'kino' })); }, vaqtMs);
      w.once('message', (m) => { clearTimeout(t); ok(m); });
      w.once('error', (e) => { clearTimeout(t); yoq(e); });
      w.once('exit', (kod) => { clearTimeout(t); if (kod) yoq(Object.assign(new Error(`Render oqimi to'xtadi (${kod})`), { turkum: 'kino' })); });
    });
    if (!javob.ok) throw Object.assign(new Error(javob.xato), { turkum: javob.turkum });
    return { mp4: await fs.readFile(chiqish), soniya: javob.soniya, jadval: javob.jadval };
  } finally {
    fs.rm(papka, { recursive: true, force: true }).catch(() => {});
  }
}
