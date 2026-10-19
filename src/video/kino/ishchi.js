// Render alohida oqimda (worker thread): kadr chizish sinxron va og'ir —
// asosiy oqimda bajarilsa bot va sayt bir daqiqa «qotib» qoladi.
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs/promises';
import { videoYasa } from './motor.js';

try {
  const { loyiha, sifat, chiqish } = workerData;
  const r = await videoYasa(loyiha, { sifat, chiqish });
  await fs.writeFile(chiqish, r.mp4);
  parentPort.postMessage({ ok: true, soniya: r.soniya, jadval: r.jadval });
} catch (e) {
  parentPort.postMessage({ ok: false, xato: e.message, turkum: e.turkum || 'kino' });
}
