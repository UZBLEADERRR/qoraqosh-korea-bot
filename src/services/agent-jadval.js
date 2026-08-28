// Agent jadvali — har 5 daqiqada tekshiradi.
//
// Nega cron emas: Railway'da alohida jarayon ochish shart emas, bot allaqachon
// doim ishlab turadi. 5 daqiqalik oraliq yetarli — post soati aniq daqiqagacha
// muhim emas.
//
// Bir nechta nusxa (deploy paytida ikkita konteyner) bir vaqtda ishlab
// ketmasligi uchun bazadagi advisory lock ishlatiladi: post ikki marta
// tayyorlanib, admin ikkita bir xil xabar olmaydi.
import { qator, qatorlar, pool } from '../db.js';
import { bugungiBandlar } from './agent.js';
import { postniTayyorla } from '../bot/handlers/agent-oqim.js';
import { config } from '../config.js';

const ORALIQ_MS = 5 * 60_000;
const QULF = 887402;               // migratsiya qulfidan boshqa raqam

let taymer = null;

async function bir() {
  const mijoz = await pool.connect();
  try {
    // Faqat bitta nusxa ishlasin
    const { rows: [q] } = await mijoz.query('select pg_try_advisory_lock($1) as olindi', [QULF]);
    if (!q.olindi) return;

    try {
      const bandlar = await bugungiBandlar();
      for (const band of bandlar) {
        const chat = await adminChati(band.created_by);
        if (!chat) {
          console.warn('AGENT: tasdiqlash uchun admin topilmadi, band', band.id);
          continue;
        }
        try {
          await postniTayyorla(band, chat);
        } catch (e) {
          console.error('AGENT post:', band.id, e.message);
        }
      }
    } finally {
      await mijoz.query('select pg_advisory_unlock($1)', [QULF]).catch(() => {});
    }
  } catch (e) {
    console.error('AGENT jadval:', e.message);
  } finally {
    mijoz.release();
  }
}

/** Post kimga tasdiqlashga boradi: rejani yaratgan admin, bo'lmasa birinchi admin. */
async function adminChati(createdBy) {
  if (createdBy) {
    const u = await qator('select telegram_id from users where id = $1', [createdBy]);
    if (u?.telegram_id) return u.telegram_id;
  }
  const u = await qator(
    `select telegram_id from users where is_admin and telegram_id is not null order by id limit 1`);
  return u?.telegram_id || config.adminTelegramIds[0] || null;
}

export function agentniIshgaTushir() {
  if (taymer) return;
  // Server ko'tarilishi bilan emas, biroz keyin: migratsiya va webhook
  // o'rnatilishi tugasin.
  setTimeout(() => { bir().catch(() => {}); }, 30_000).unref?.();
  taymer = setInterval(() => { bir().catch(() => {}); }, ORALIQ_MS);
  taymer.unref?.();
}

export function agentniToxtat() {
  if (taymer) { clearInterval(taymer); taymer = null; }
}

/** Sinov uchun: darhol bir marta bajarish. */
export const agentBirMarta = bir;
