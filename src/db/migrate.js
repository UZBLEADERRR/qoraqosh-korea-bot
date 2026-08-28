// Migratsiyalarni avtomatik qo'llash.
// Server har ishga tushganda migrations/*.sql ni tartib bilan tekshiradi va
// hali qo'llanmaganini bajaradi. Har biri o'z tranzaksiyasida — yarim
// qo'llanган holat qolmaydi. Qo'lda hech narsa qilish shart emas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const KATALOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

export async function migratsiyalarniQoll() {
  const mijoz = await pool.connect();
  try {
    // Bir vaqtda ikkita nusxa (Railway qayta deploy paytida) urinmasin
    await mijoz.query(`
      create table if not exists _migratsiya (
        nom        text primary key,
        xesh       text not null,
        qollangan  timestamptz not null default now()
      )`);
    await mijoz.query('select pg_advisory_lock($1)', [887401]);

    const qollangan = new Map(
      (await mijoz.query('select nom, xesh from _migratsiya')).rows.map((r) => [r.nom, r.xesh]),
    );

    const fayllar = fs.existsSync(KATALOG)
      ? fs.readdirSync(KATALOG).filter((f) => f.endsWith('.sql')).sort()
      : [];

    let yangi = 0;
    for (const nom of fayllar) {
      const matn = fs.readFileSync(path.join(KATALOG, nom), 'utf8');
      const xesh = crypto.createHash('sha256').update(matn).digest('hex').slice(0, 16);

      if (qollangan.has(nom)) {
        if (qollangan.get(nom) !== xesh) {
          console.warn(`⚠️  ${nom} qo'llangandan keyin o'zgargan. Eski holat bazada qoladi — o'zgarishni yangi migratsiya fayli sifatida qo'shing.`);
        }
        continue;
      }

      process.stdout.write(`   ${nom} … `);
      try {
        await mijoz.query('begin');
        await mijoz.query(matn);
        await mijoz.query('insert into _migratsiya (nom, xesh) values ($1,$2)', [nom, xesh]);
        await mijoz.query('commit');
        console.log('✓');
        yangi++;
      } catch (e) {
        await mijoz.query('rollback').catch(() => {});
        console.log('✗');
        throw new Error(`Migratsiya ${nom} bajarilmadi: ${e.message}`);
      }
    }

    console.log(yangi
      ? `✅ ${yangi} ta migratsiya qo'llandi (jami ${fayllar.length})`
      : `✅ Baza tayyor (${fayllar.length} ta migratsiya allaqachon qo'llangan)`);
  } finally {
    await mijoz.query('select pg_advisory_unlock($1)', [887401]).catch(() => {});
    mijoz.release();
  }
}
