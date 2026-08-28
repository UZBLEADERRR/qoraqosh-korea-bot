// Migratsiyalarni serversiz, qo'lda ishga tushirish (ixtiyoriy).
// Odatda kerak emas — server ishga tushganda o'zi qo'llaydi.
import { migratsiyalarniQoll } from '../src/db/migrate.js';
import { ulanishniTekshir, pool } from '../src/db.js';

const { baza, versiya } = await ulanishniTekshir();
console.log(`Baza: ${baza} (${versiya})`);
await migratsiyalarniQoll();
await pool.end();
