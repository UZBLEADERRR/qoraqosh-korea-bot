// KiOVO — yagona server:
//   /                 -> qo'nish sahifasi
//   /app/             -> Telegram Mini App
//   /admin/           -> admin panel
//   /oferta           -> ommaviy oferta
//   /api/*            -> Mini App API
//   /api/admin/*      -> admin API
//   /tg/<secret>      -> Telegram webhook
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { config } from './config.js';
import { statik, ok, xato, tana, sorovniEsla } from './lib/http.js';
import { apiRoutes } from './api/routes.js';
import { adminRoutes } from './api/admin.js';
import { yangilanish } from './bot/index.js';
import { tg } from './bot/tg.js';
import { ofertaSahifasi } from './lib/oferta.js';
import { postSahifasi, imzoTogrimi } from './lib/post-korinish.js';
import { migratsiyalarniQoll } from './db/migrate.js';
import { agentniIshgaTushir } from './services/agent-jadval.js';
import { vazifaniTiklash } from './services/marketplace-vazifa.js';
import { qator, sozlama, ulanishniTekshir } from './db.js';
import { brendNomi } from './lib/brend.js';
import { verifyAdminToken } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

// Webhook yo'li — tokendan kelib chiqadi, tashqaridan topib bo'lmaydi
const WEBHOOK_YOL = '/tg/' + crypto.createHash('sha256')
  .update(config.botToken + (config.webhookSecret || '')).digest('hex').slice(0, 32);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const yol = decodeURIComponent(url.pathname);
  sorovniEsla(req);        // javob siqilishi uchun Accept-Encoding kerak

  try {
    // ---------- Telegram webhook ----------
    if (yol === WEBHOOK_YOL && req.method === 'POST') {
      if (config.webhookSecret &&
          req.headers['x-telegram-bot-api-secret-token'] !== config.webhookSecret) {
        return xato(res, 403, 'forbidden');
      }
      const upd = await tana(req, 1024 * 1024);
      res.writeHead(200).end('ok');            // Telegram'ni kutdirmaymiz
      yangilanish(upd).catch((e) => console.error('Update xatosi:', e.message));
      return;
    }

    if (yol === '/healthz') return ok(res, { ok: true, vaqt: new Date().toISOString() });

    // ---------- Rasm ----------
    // Posterlar va logotip ochiq. CHEK va TAHLIL NATIJASI faqat admin
    // tokeni bilan: birinchisi mijozning to'lov hujjati, ikkinchisida
    // uning YUZI bor. Havolani bilgan har kim ko'rmasligi kerak.
    if (yol.startsWith('/media/')) {
      const id = yol.slice(7);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound(res);
      const m = await qator('select mime, bayt, tur from media where id = $1', [id]);
      if (!m) return notFound(res);
      if (m.tur === 'chek' || m.tur === 'natija') {
        const token = (url.searchParams.get('t') || '').trim() ||
                      (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (!verifyAdminToken(token)) return xato(res, 403, 'Ruxsat yo‘q');
      }
      res.writeHead(200, {
        'Content-Type': m.mime,
        'Content-Length': m.bayt.length,
        // Rasm hech qachon o'zgarmaydi (yangisi yangi id oladi) — uzoq keshlash xavfsiz
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(m.bayt);
    }

    // ---------- API ----------
    if (yol.startsWith('/api/admin/')) return await adminRoutes(req, res, yol);
    if (yol.startsWith('/api/'))       return await apiRoutes(req, res, yol);

    // ---------- Ommaviy oferta ----------
    if (yol === '/oferta') {
      // Matn admin paneldan olinadi; bo'sh bo'lsa koddagi shablon.
      const [xom, brend] = await Promise.all([
        sozlama('oferta_matni', ''), brendNomi(),
      ]).catch(() => ['', 'KiOVO']);
      const html = ofertaSahifasi(String(xom || '').replace(/^"|"$/g, ''), brend);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(html);
    }

    // ---------- Post ko'rinishi ----------
    // Agent tayyorlagan post kanalda qanday chiqishini oldindan ko'rsatadi.
    // Havola imzolangan: qoralama tarqalib ketmasin.
    const postMos = yol.match(/^\/post\/(\d+)$/);
    if (postMos) {
      const id = Number(postMos[1]);
      const imzo = new URL(req.url, 'http://x').searchParams.get('i') || '';
      if (!imzoTogrimi(id, imzo)) return notFound(res);

      const band = await qator(
        `select b.*, r.nom as reja_nom, r.kanal
           from reja_bandlari b join rejalar r on r.id = b.reja_id
          where b.id = $1`, [id]);
      if (!band) return notFound(res);

      const { oldiQochdiTekshir } = await import('./services/agent.js');
      const html = postSahifasi({
        band, brend: await brendNomi().catch(() => 'KiOVO'),
        ogohlantirish: oldiQochdiTekshir(band.matn || ''),
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }

    // ---------- Statik ----------
    if (yol === '/' )        return statik(res, PUBLIC, 'index.html') || notFound(res);
    if (yol === '/app' )     return redirect(res, '/app/');
    if (yol === '/admin')    return redirect(res, '/admin/');
    if (yol === '/app/')     return statik(res, PUBLIC, 'app/index.html') || notFound(res);
    if (yol === '/admin/')   return statik(res, PUBLIC, 'admin/index.html') || notFound(res);

    if (statik(res, PUBLIC, yol.replace(/^\/+/, ''))) return;
    return notFound(res);
  } catch (e) {
    if (res.headersSent) return res.end();
    // Mijoz yuborgan so'rovning o'zi noto'g'ri bo'lsa — 4xx, server aybi emas
    if (e.message === 'NOTOGRI_JSON') return xato(res, 400, 'So‘rov tanasi noto‘g‘ri JSON.');
    if (e.message === 'TANA_KATTA')   return xato(res, 413, 'So‘rov juda katta.');
    console.error('HTTP xatosi:', e.message);
    xato(res, 500, 'Server xatosi');
  }
});

const notFound = (res) => { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 — topilmadi'); };
const redirect = (res, joy) => { res.writeHead(302, { Location: joy }); res.end(); };

// ============================================================
// Botni ulash: PUBLIC_URL bo'lsa webhook, aks holda long-polling.
// Ikkovi bir vaqtda ishlamaydi — 409 Conflict shu tarzda oldi olinadi.
// ============================================================
async function botniUla() {
  if (config.publicUrl) {
    const url = `${config.publicUrl}${WEBHOOK_YOL}`;
    const r = await tg('setWebhook', {
      url,
      secret_token: config.webhookSecret || undefined,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    });
    console.log(r.ok ? `✅ Webhook ulandi: ${config.publicUrl}${WEBHOOK_YOL.slice(0, 12)}…`
                     : `❌ Webhook xatosi: ${r.description}`);
    return;
  }

  await tg('deleteWebhook', { drop_pending_updates: false });
  console.log('ℹ️  PUBLIC_URL yo‘q — long-polling rejimi (mahalliy ishlab chiqish).');

  let offset = 0;
  for (;;) {
    try {
      const r = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
      if (r.ok) {
        for (const upd of r.result) {
          offset = upd.update_id + 1;
          yangilanish(upd).catch((e) => console.error('Update xatosi:', e.message));
        }
      } else {
        await new Promise((r2) => setTimeout(r2, 5000));
      }
    } catch (e) {
      console.error('Polling:', e.message);
      await new Promise((r2) => setTimeout(r2, 5000));
    }
  }
}

// ============================================================
// Ishga tushish: avval baza tayyorlanadi, keyin port ochiladi.
// Jadvallarni qo'lda yaratish shart emas — migratsiyalar o'zi qo'llanadi.
// ============================================================
async function boshla() {
  console.log('\n🌸 KiOVO');
  try {
    const { baza, versiya } = await ulanishniTekshir();
    console.log(`   Baza: ${baza} (${versiya})`);
  } catch (e) {
    console.error('\n❌ Bazaga ulanib bo‘lmadi:', e.message);
    console.error('   DATABASE_URL ni tekshiring (Supabase → Connect → Session pooler).');
    console.error('   Parolda maxsus belgi bo‘lsa, uni URL-kodlash kerak (@ → %40).\n');
    process.exit(1);
  }

  console.log('   Migratsiyalar:');
  await migratsiyalarniQoll();

  server.listen(config.port, () => {
    const asos = config.publicUrl || `http://localhost:${config.port}`;
    console.log(`\n   Port     : ${config.port}`);
    console.log(`   Mini App : ${asos}/app/`);
    console.log(`   Admin    : ${asos}/admin/\n`);
    botniUla().catch((e) => console.error('Botni ulashda xato:', e.message));
    agentniIshgaTushir();   // kanal rejasi bo'yicha kunlik postlar
    // Yarim qolgan ommaviy import — deploy yoki qayta ishga tushishdan
    // keyin o'zi davom etadi, admin qaytadan boshlamaydi
    vazifaniTiklash()
      .then((v) => v && console.log(`   Import davom etmoqda: #${v.id} (${v.qoshilgan}/${v.maqsad})`))
      .catch((e) => console.error('Importni tiklashda xato:', e.message));
  });
}

boshla().catch((e) => {
  console.error('\n❌ Ishga tushirishda xato:', e.message, '\n');
  process.exit(1);
});

process.on('uncaughtException',  (e) => console.error('Kutilmagan xato:', e));
process.on('unhandledRejection', (e) => console.error('Ushlanmagan rad:', e));
