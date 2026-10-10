// KiOVO — yagona server:
//   /                 -> qo'nish sahifasi
//   /app/             -> Telegram Mini App
//   /admin/           -> admin panel
//   /oferta           -> ommaviy oferta
//   /api/*            -> Mini App API
//   /api/admin/*      -> admin API
//   /tg/<secret>      -> Telegram webhook
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { config } from './config.js';
import { statik, ok, xato, tana, sorovniEsla, formaTana, cookieOl } from './lib/http.js';
import { googleBilanKir } from './services/ilova-kirish.js';
import { supabaseYoqilganmi, supabaseKirishManzili } from './services/supabase-kirish.js';
import { apiRoutes } from './api/routes.js';
import { ochiqRoutes } from './api/ochiq.js';
import { adminRoutes } from './api/admin.js';
import { yangilanish } from './bot/index.js';
import { ilovaHavolasi } from './lib/ilova-havola.js';
import { keshdanOl, keshgaQoy } from './lib/media-kesh.js';
import { jpegQil } from './rasm/olcham.js';
import { tg } from './bot/tg.js';
import { ofertaSahifasi } from './lib/oferta.js';
import { sotuvchiMalumoti, maxfiylikSahifasi, hisobniOchirishSahifasi } from './lib/huquqiy.js';
import { postSahifasi, imzoTogrimi } from './lib/post-korinish.js';
import { shablonSahifasi, shablonImzoTogrimi } from './lib/kartochka-korinish.js';
import { eksportOchib } from './lib/eksport-havola.js';
import { svgdanPng } from './rasm/chiz.js';
import { migratsiyalarniQoll } from './db/migrate.js';
import { agentniIshgaTushir } from './services/agent-jadval.js';
import { vazifaniTiklash, jadvalniIshgaTushir } from './services/marketplace-vazifa.js';
import { qator, sorov, sozlama, ulanishniTekshir } from './db.js';
import { brendNomi } from './lib/brend.js';
import { verifyAdminToken } from './lib/auth.js';
import { versiyaOl, versiyalaHtml, versiyalanganmi } from './lib/versiya.js';
import { logoSvg } from './lib/logo.js';
import { havolaBosildi, avtoTashrif, taklifchiNatijasi } from './services/manba.js';
import * as instagram from './services/instagram/index.js';
import { tokenniYangila as igTokenniYangila } from './services/instagram/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

// Mini App va admin panel sahifalari. HTML har safar yangi (no-cache),
// ichidagi css/js esa versiyalangan manzil bilan keladi — shuning uchun
// ularni uzoq keshlash xavfsiz va yangilanish DARROV yetib boradi.
// UMUMIY brend fayli har sahifaning versiyasiga kiradi: u o'zgarsa
// hamma sahifaning versiyasi ham o'zgaradi. Aks holda `brend.css?v=…`
// eski versiya raqami bilan bir yil keshda qolib ketardi.
const UMUMIY = ['../umumiy/brend.css'];
const SAHIFA_FAYL = {
  app:   { yol: 'app/index.html',   papka: 'app',
           fayllar: ['index.html', 'app.js', 'style.css', 'ikon.js', 'hududlar.js',
                     'sifat.js', 'yuz.js', 'qatlam.js', ...UMUMIY] },
  admin: { yol: 'admin/index.html', papka: 'admin',
           fayllar: ['index.html', 'admin.js', 'style.css', ...UMUMIY] },
  skan:  { yol: 'skan/index.html',  papka: 'skan',
           fayllar: ['index.html', 'app.js', 'style.css', ...UMUMIY] },
  // www.kiovo.shop bosh sahifasi
  uy:    { yol: 'uy/index.html',    papka: 'uy',
           fayllar: ['index.html', 'app.js', 'style.css', ...UMUMIY] },
  // Buyurtmalar ish stoli — kompyuterdan ham, telefondan ham
  buyurtma: { yol: 'buyurtma/index.html', papka: 'buyurtma',
              fayllar: ['index.html', 'app.js', 'style.css', ...UMUMIY] },
};

const LOGO_INLINE = logoSvg({ rang: 'currentColor' }).replace('<svg ', '<svg class="logo-svg" ');
const BELGI_INLINE = logoSvg({ tur: 'belgi', rang: 'currentColor' })
  .replace('<svg ', '<svg class="belgi-svg" ');

function sahifa(res, nom) {
  const s = SAHIFA_FAYL[nom];
  const fayl = path.join(PUBLIC, s.yol);
  if (!fs.existsSync(fayl)) return notFound(res);
  const v = versiyaOl(PUBLIC, s.papka, s.fayllar);
  // `__ASOS__` — saytning to'liq manzili. Kanonik havola va og:image
  // MUTLAQ bo'lishi kerak: nisbiy manzilni Telegram ham, qidiruv
  // tizimi ham ochib ko'rsatolmaydi. Manzil sozlamadan keladi,
  // shuning uchun sinov va ishlab chiqarishda o'zi to'g'ri bo'ladi.
  // `__LOGO__` / `__BELGI__` — logotip sahifaga INLINE qo'yiladi:
  // rangi CSS dan (currentColor) keladi va alohida so'rov ketmaydi.
  // Manba bitta — src/lib/logo.js.
  const html = versiyalaHtml(fs.readFileSync(fayl, 'utf8'), v)
    .replaceAll('__ASOS__', config.saytUrl)
    .replaceAll('__LOGO__', LOGO_INLINE)
    .replaceAll('__BELGI__', BELGI_INLINE);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Ilova-Versiya': v,
  });
  return res.end(html);
}

// Webhook yo'li — tokendan kelib chiqadi, tashqaridan topib bo'lmaydi
const WEBHOOK_YOL = '/tg/' + crypto.createHash('sha256')
  .update(config.botToken + (config.webhookSecret || '')).digest('hex').slice(0, 32);

/* XAVFSIZLIK SARLAVHALARI — har javobga.
 *
 * CSP: skript faqat o'zimizdan, Telegram va Google kirish tugmasidan.
 * Biror joyga begona kod kiritib qo'yilsa ham brauzer uni boshqa
 * domendan yuklamaydi. `unsafe-inline` qoladi: sahifalarda kichik
 * ichki skriptlar bor (Telegram yuklovchisi, Google qaytish sahifasi).
 * frame-ancestors — ilova Telegram Web ichida (iframe) ochiladi,
 * boshqa saytlar esa uni o'z sahifasiga joylay olmaydi (clickjacking).
 * Kamera — faqat o'zimizga (yuz skaneri), mikrofon va joylashuv — hech kimga. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://telegram.org https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "font-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
].join('; ');

function xavfsizlikSarlavhalari(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  // Google kirish tugmasi popup ochsa ham ishlashi uchun
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
}

const server = http.createServer(async (req, res) => {
  // Asos QOTIB turadi: Host sarlavhasi mijozdan keladi va buzuq bo'lishi
  // mumkin («www.127.0.0.1» kabi) — u holda `new URL` xato tashlardi va
  // so'rov javobsiz osilib qolardi. Bu yerda faqat yo'l va so'rov kerak.
  let url;
  try { url = new URL(req.url, 'http://ichki'); } catch { return xato(res, 400, 'Noto‘g‘ri so‘rov'); }
  let yol;
  try { yol = decodeURIComponent(url.pathname); } catch { return xato(res, 400, 'Noto‘g‘ri manzil'); }
  sorovniEsla(req);        // javob siqilishi uchun Accept-Encoding kerak
  xavfsizlikSarlavhalari(res);

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

    // ---------- Instagram webhook (Meta) ----------
    // GET — Meta manzilni tasdiqlaydi (hub.challenge); POST — Direct va
    // kommentlar. Javob DARHOL qaytadi: Meta 20 soniyada javob olmasa qayta yuboradi.
    if (yol === '/instagram/webhook') {
      if (req.method === 'GET') {
        const ok2 = url.searchParams.get('hub.mode') === 'subscribe'
          && url.searchParams.get('hub.verify_token') === await instagram.verifyToken();
        res.writeHead(ok2 ? 200 : 403, { 'Content-Type': 'text/plain' });
        return res.end(ok2 ? String(url.searchParams.get('hub.challenge') || '') : 'forbidden');
      }
      if (req.method === 'POST') {
        const xom = await xomTana(req, 2 * 1024 * 1024).catch(() => null);
        if (!xom || !instagram.imzoTogri(xom, req.headers['x-hub-signature-256'])) {
          res.writeHead(403).end('imzo'); return;
        }
        res.writeHead(200).end('ok');
        let body = null;
        try { body = JSON.parse(xom.toString('utf8')); } catch { return; }
        instagram.webhookKeldi(body).catch((e) => console.error('IG webhook:', e.message));
        return;
      }
    }

    // ---------- kiovo.shop → www.kiovo.shop ----------
    // Asosiy manzil www BILAN. Agar «www» siz so'rov qachondir shu serverga
    // kelsa (domen sozlamasi o'zgarsa), u www ga yo'naltiriladi. TESKARI
    // yo'naltirish YO'Q: www siz domen boshqa saytga olib boradi.
    // Faqat GET/HEAD (POST — Telegram webhook — yo'naltirishga ergashmaydi),
    // `/.well-known/` esa hech qachon: Android assetlinks.json ni
    // yo'naltirishsiz o'qishi kerak.
    if (config.asosiyXost.startsWith('www.') && (req.method === 'GET' || req.method === 'HEAD')
        && String(req.headers.host || '').toLowerCase().split(':')[0] === config.asosiyXost.split(':')[0].slice(4)
        && !yol.startsWith('/.well-known/')) {
      res.writeHead(301, { Location: `${config.saytUrl}${req.url}`, 'Cache-Control': 'public, max-age=86400' });
      return res.end();
    }

    // ---------- Android ilova ↔ sayt bog'lanishi (Digital Asset Links) ----------
    // Play'dagi ilova (TWA) saytni brauzer manzil satrisiz ochishi uchun
    // sayt «bu ilova meniki» deb tasdiqlashi kerak. Barmoq izi Play
    // Console → App integrity dan olinadi va admin panelga yoziladi.
    if (yol === '/.well-known/assetlinks.json') {
      const xom = `${String(await sozlama('android_sha256', '').catch(() => '') || '')},${config.androidSha256}`;
      const izlar = [...new Set(xom.split(/[\s,;]+/).map((x) => x.trim().toUpperCase())
        .filter((x) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(x)))];
      const tana_ = izlar.length ? [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: config.androidPaket,
                  sha256_cert_fingerprints: izlar },
      }] : [];
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify(tana_, null, 2));
    }

    // ---------- Rasm ----------
    // Posterlar va logotip ochiq. CHEK va TAHLIL NATIJASI faqat admin
    // tokeni bilan: birinchisi mijozning to'lov hujjati, ikkinchisida
    // uning YUZI bor. Havolani bilgan har kim ko'rmasligi kerak.
    // Rasm. `?w=400` — ekranga mos o'lchamdagi JPEG.
    //
    // Asl poster 1024px PNG, ya'ni 1–2 MB. Kartochka esa telefonda
    // ~150px. Kerak bo'lganidan yigirma barobar ko'p bayt yuborish —
    // ilova «sekin ishlashi»ning asosiy sababi edi. Kichraytirilgan
    // JPEG xotirada keshlanadi: ikkinchi so'rovdan boshlab na baza,
    // na protsessor bezovta qilinadi.
    if (yol.startsWith('/media/')) {
      const id = yol.slice(7);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound(res);

      const wXom = Number(url.searchParams.get('w'));
      const w = RUXSAT_ENI.includes(wXom) ? wXom : 0;
      const kalit = `${id}:${w}`;

      const keshda = keshdanOl(kalit);
      if (keshda) return rasmniBer(res, keshda.bayt, keshda.mime);

      const m = await qator('select mime, bayt, tur from media where id = $1', [id]);
      if (!m) return notFound(res);
      // Chek — mijozning to'lov hujjati, natija — uning YUZI. Bularni
      // havolani bilgan har kim ko'rmasligi kerak.
      if (m.tur === 'chek' || m.tur === 'natija') {
        const token = (url.searchParams.get('t') || '').trim() ||
                      (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (!verifyAdminToken(token)) return xato(res, 403, 'Ruxsat yo‘q');
        return rasmniBer(res, m.bayt, m.mime);      // maxfiy rasm keshlanmaydi
      }

      let bayt = m.bayt, mime = m.mime;
      if (w) {
        try {
          const r = await jpegQil(m.bayt, m.mime, { eni: w });
          bayt = r.bayt; mime = r.mime;
        } catch (e) {
          // Kichraytirib bo'lmasa aslini beramiz — rasm YO'QOLMASIN
          console.warn('MEDIA kichraytirish:', e.message?.slice(0, 80));
        }
      }
      keshgaQoy(kalit, bayt, mime);
      return rasmniBer(res, bayt, mime);
    }

    // ---------- API ----------
    // `/api/ochiq/*` — Telegram initData SIZ ishlaydi: Instagramdan
    // kelgan odam hali bizning mijozimiz emas. Chegaralari o'z ichida.
    if (yol.startsWith('/api/ochiq/')) {
      const j = await ochiqRoutes(req, res, yol);
      if (j !== null) return j;
      return notFound(res);
    }
    if (yol.startsWith('/api/admin/')) return await adminRoutes(req, res, yol);
    if (yol.startsWith('/api/'))       return await apiRoutes(req, res, yol);

    // ---------- Supabase orqali Gmail bilan kirish ----------
    // 1) /kirish/supabase/boshla — Supabase → Google hisob tanlash.
    // 2) Google → Supabase → /kirish/supabase#access_token=… — token
    //    FRAGMENTDA keladi (serverga yetmaydi), sahifa uni o'zi oladi
    //    va /api/kirish/supabase ga yuboradi; u yerda tekshiriladi.
    if (yol === '/kirish/supabase/boshla' && req.method === 'GET') {
      if (!supabaseYoqilganmi()) return redirect(res, '/app/?kirish_xato=1');
      const asos = config.saytUrl || `http://${req.headers.host}`;
      return redirect(res, supabaseKirishManzili(`${asos}/kirish/supabase`));
    }
    if (yol === '/kirish/supabase' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
                           'Referrer-Policy': 'no-referrer' });
      return res.end(supabaseQaytishSahifasi());
    }

    // ---------- Google bilan kirish (qayta yo'naltirish rejimi) ----------
    // Google tugmasi `ux_mode: redirect` da: Google bu manzilga forma
    // yuboradi. Popup o'rniga shu yo'l tanlangan, chunki Play'dagi
    // ilovada (TWA) va bosh ekrandagi yorliqda popup oyna ochilmaydi.
    // CSRF: Google `g_csrf_token` ni ham cookie, ham forma ichida beradi —
    // ikkalasi bir xil bo'lishi kerak.
    if (yol === '/kirish/google' && req.method === 'POST') {
      const f = await formaTana(req);
      const cookieToken = cookieOl(req, 'g_csrf_token');
      const sahifaQayt = (matn) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(matn);
      };
      if (!cookieToken || cookieToken !== f.g_csrf_token) {
        return sahifaQayt(googleJavobSahifasi(null, 'Xavfsizlik tekshiruvidan o‘tmadi. Qayta urining.'));
      }
      const r = await googleBilanKir(f.credential, {
        qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
      return sahifaQayt(googleJavobSahifasi(r.token || null, r.xato || ''));
    }

    // ---------- Huquqiy sahifalar: oferta, maxfiylik, hisobni o'chirish ----------
    // Uchalasi ham Google Play Console'ga yoziladigan OCHIQ manzillar.
    if (yol === '/oferta' || yol === '/maxfiylik' || yol === '/hisobni-ochirish'
        || yol === '/privacy' || yol === '/delete-account') {
      const [xom, brend, sv, tel, tgNom] = await Promise.all([
        sozlama('oferta_matni', ''), brendNomi(), sozlama('sotuvchi', {}),
        sozlama('menejer_telefon', ''), sozlama('konsultatsiya_user', ''),
      ]).catch(() => ['', 'KiOVO', {}, '', '']);
      const s = sotuvchiMalumoti(sv, { brend, telefon: tel, telegram: tgNom });
      const html = yol === '/oferta'
        ? ofertaSahifasi(String(xom || '').replace(/^"|"$/g, ''), s)
        : (yol === '/maxfiylik' || yol === '/privacy')
          ? maxfiylikSahifasi(s) : hisobniOchirishSahifasi(s);
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

    // ---------- Ma'lumotni yuklab olish ----------
    // Yordamchi chatda bergan IMZOLANGAN havola. Brauzer hech qanday
    // sarlavha yubormaydi, shuning uchun ruxsat havolaning o'zida.
    const eksMos = yol.match(/^\/eksport\/([A-Za-z0-9_-]+)\.(json|csv)$/);
    if (eksMos) {
      const h = eksportOchib(eksMos[1], new URL(req.url, 'http://x').searchParams.get('i') || '');
      if (!h.ok) {
        return xato(res, h.sabab === 'muddat' ? 410 : 404,
          h.sabab === 'muddat'
            ? 'Havolaning muddati tugadi — yordamchidan yangisini so‘rang.'
            : 'Havola noto‘g‘ri.');
      }
      const { eksportYig, csvQil, BOLIMLAR } = await import('./services/eksport.js');
      const sana = new Date().toISOString().slice(0, 10);

      if (h.tur === 'csv') {
        const bolim = h.bolimlar[0];
        if (!BOLIMLAR[bolim]) return xato(res, 400, 'Bo‘lim tanlanmadi.');
        const matn = csvQil(await BOLIMLAR[bolim].ol());
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="kiovo-${bolim}-${sana}.csv"`,
          'Cache-Control': 'no-store',
        });
        return res.end(Buffer.from(matn, 'utf8'));
      }

      const nom = h.bolimlar.length === 1 ? h.bolimlar[0] : 'baza';
      const bayt = Buffer.from(JSON.stringify(await eksportYig(h.bolimlar), null, 2), 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="kiovo-${nom}-${sana}.json"`,
        'Cache-Control': 'no-store',
      });
      return res.end(bayt);
    }

    // ---------- Kartochka shabloni ko'rinishi ----------
    // Admin yordamchisi yozgan kartochkani admin ochib ko'radi va
    // shu sahifadagi tugma bilan TASDIQLAYDI. Havola imzolangan.
    const kartMos = yol.match(/^\/kartochka\/([a-z0-9]+)(\/tasdiq)?$/i);
    if (kartMos) {
      const versiya = kartMos[1];
      const tasdiq = Boolean(kartMos[2]);
      const imzo = new URL(req.url, 'http://x').searchParams.get('i') || '';
      if (!shablonImzoTogrimi(versiya, imzo)) return notFound(res);

      const sh = await sozlama('natija_shablon', null);
      if (!sh?.svg || sh.versiya !== versiya) return notFound(res);

      if (tasdiq) {
        if (req.method !== 'POST') return xato(res, 405, 'POST kutilgan');
        await sorov(
          `insert into settings (key, value, updated_at)
           values ('natija_shablon', $1::jsonb, now())
           on conflict (key) do update set value = excluded.value, updated_at = now()`,
          [JSON.stringify({ ...sh, holat: 'tasdiq', tasdiqlangan: new Date().toISOString() })]);
        return ok(res, { ok: true });
      }

      const { toldir, tekshir } = await import('./rasm/shablon.js');
      const { namunaMalumot } = await import('./rasm/shablon-malumot.js');
      const brend = await brendNomi().catch(() => 'KiOVO');
      let png = '', chizXato = '';
      try {
        const bayt = await svgdanPng(toldir(sh.svg, namunaMalumot(brend)), 1080);
        png = Buffer.from(bayt).toString('base64');
      } catch (e) { chizXato = e.message; }

      const html = shablonSahifasi({
        png, holat: sh.holat, versiya, imzo, svg: sh.svg, xato: chizXato,
        izoh: sh.izoh || '', ogoh: tekshir(sh.svg).ogoh,
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }

    // ---------- Statik ----------
    // Bosh sahifa (www.kiovo.shop). `sahifa()` orqali: css/js havolalariga
    // versiya qo'shiladi, aks holda brauzer eski uslubni saqlab qoladi.
    // ---------- Manba havolasi: www.kiovo.shop/h/ig ----------
    // Instagram, TikTok va boshqa joylarga qo'yiladigan qisqa havola.
    // Bosish yoziladi va odam kerakli sahifaga o'tadi (src/services/manba.js).
    if (yol.startsWith('/h/') && (req.method === 'GET' || req.method === 'HEAD')) {
      const joy = await havolaBosildi(req, res, yol.slice(3).replace(/\/+$/, ''));
      res.writeHead(302, { Location: joy, 'Cache-Control': 'no-store' });
      return res.end();
    }

    // ---------- Taklifchining o'z natijasi: /taklif/<kod>?s=<sir> ----------
    // Havola tarqatilgan odam nechta odam olib kelganini O'ZI ko'radi.
    if (yol.startsWith('/taklif/') && req.method === 'GET') {
      const n = await taklifchiNatijasi(yol.slice(8).replace(/\/+$/, ''), url.searchParams.get('s'));
      res.writeHead(n ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex' });
      return res.end(taklifSahifasi(n, config.saytUrl));
    }

    // Havolasiz, lekin Instagram/TikTok ichidan ochilgan tashrif ham sanaladi
    if (yol === '/' || yol === '/skan/' || yol === '/app/') await avtoTashrif(req, res, url);

    if (yol === '/' )        return sahifa(res, 'uy');

    // ---------- Qidiruv tizimlari uchun ----------
    // Admin panel va API indekslanmaydi: ular odamga emas, ishga
    // mo'ljallangan va qidiruv natijasida chiqishi mumkin emas.
    if (yol === '/robots.txt') {
      const asos = config.saytUrl;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' });
      return res.end(['User-agent: *', 'Allow: /', 'Disallow: /admin',
        'Disallow: /buyurtma', 'Disallow: /api/', 'Disallow: /media/',
        'Disallow: /eksport/', 'Disallow: /kartochka/', '',
        asos ? `Sitemap: ${asos}/sitemap.xml` : '', ''].join('\n'));
    }
    if (yol === '/sitemap.xml') {
      const asos = config.saytUrl;
      const sahifalar = [['/', '1.0'], ['/skan/', '0.8'], ['/oferta', '0.3'],
        ['/maxfiylik', '0.3'], ['/hisobni-ochirish', '0.2']];
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' });
      return res.end('<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + sahifalar.map(([u, p]) =>
            `  <url><loc>${asos}${u}</loc><priority>${p}</priority></url>`).join('\n')
        + '\n</urlset>\n');
    }
    if (yol === '/app' )     return redirect(res, '/app/');
    if (yol === '/admin')    return redirect(res, '/admin/');
    // Buyurtmalar ish stoli. `/buyurtmalar` ham shu yerga olib
    // keladi: odam ikkalasini ham yozib ko'radi.
    if (yol === '/buyurtma' || yol === '/buyurtmalar' || yol === '/buyurtmalar/') {
      return redirect(res, '/buyurtma/');
    }
    if (yol === '/buyurtma/') return sahifa(res, 'buyurtma');
    // Mini App va admin panel HTML i: ichidagi css/js havolalariga
    // versiya qo'shiladi. Aks holda Telegram brauzeri eski app.js ni
    // saqlab qoladi va yangi kod umuman ishlamaydi.
    // Service worker: versiya ichiga yoziladi, aks holda fayl bayt-baytga
    // bir xil qolib, brauzer uni qayta o'rnatmaydi va eski kesh qoladi.
    if (yol === '/app/sw.js') {
      const v = versiyaOl(PUBLIC, 'app', SAHIFA_FAYL.app.fayllar);
      const kod = fs.readFileSync(path.join(PUBLIC, 'app/sw.js'), 'utf8')
        .replace('__VERSIYA__', v);
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/app/' });
      return res.end(kod);
    }
    // Bosh ekrandagi yorliq shu manzilga tushadi (manifest start_url).
    // U yerdan Telegram ilovasiga yo'naltiriladi: brauzerda ochilgan
    // Mini App initData siz ishlamaydi, ya'ni yorliq foydasiz bo'lardi.
    if (yol === '/app/ochish') {
      const havola = await ilovaHavolasi().catch(() => null);
      if (havola) return redirect(res, havola);
      return redirect(res, '/app/');
    }
    if (yol === '/app/')     return sahifa(res, 'app');
    if (yol === '/admin/')   return sahifa(res, 'admin');
    // Reklama sahifasi — Instagram bio'siga qo'yiladigan havola
    if (yol === '/skan')     return redirect(res, '/skan/');
    if (yol === '/skan/')    return sahifa(res, 'skan');

    if (statik(res, PUBLIC, yol.replace(/^\/+/, ''), { uzoqKesh: versiyalanganmi(req.url) })) return;
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

// Faqat shu kengliklar: har xil o'lchamni chizaverish protsessorni
// yeydi va keshni behuda to'ldiradi.
const RUXSAT_ENI = [200, 400, 800];

const rasmniBer = (res, bayt, mime) => {
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': bayt.length,
    // Rasm hech qachon o'zgarmaydi (yangisi yangi id oladi) — uzoq keshlash xavfsiz
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(bayt);
};

/** Supabase'dan qaytgan sahifa: tokenni serverda tekshirtiradi, seansni yozadi. */
function supabaseQaytishSahifasi() {
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>KiOVO</title>
<meta name="theme-color" content="#ab0a0c"></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#ab0a0c;
  color:#fff;font:600 16px system-ui,sans-serif;text-align:center;padding:24px">
<p id="m">Kirilmoqda…</p>
<script>
(function () {
  var h = new URLSearchParams(location.hash.slice(1));
  var q = new URLSearchParams(location.search);
  // Token manzil satrida qolmasin (tarix, skrinshot)
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  var t = h.get('access_token');
  var xato = function () {
    document.getElementById('m').textContent = 'Gmail bilan kirib bo‘lmadi. Boshqa usulni tanlang.';
    setTimeout(function () { location.replace('/app/?kirish_xato=1'); }, 2200);
  };
  if (!t || h.get('error') || q.get('error')) return xato();
  fetch('/api/kirish/supabase', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: t }) })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (x) {
      if (!x.ok || !x.j.token) return xato();
      try { localStorage.setItem('kiovo_seans', x.j.token); } catch (e) {}
      location.replace('/app/');
    })
    .catch(xato);
})();
</script></body></html>`;
}

/** Google'dan qaytgan sahifa: seansni qurilmaga yozadi va ilovaga qaytaradi. */
function googleJavobSahifasi(token, xatoMatn) {
  const j = JSON.stringify;
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>KiOVO</title>
<meta name="theme-color" content="#ab0a0c"></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#ab0a0c;
  color:#fff;font:600 16px system-ui,sans-serif;text-align:center;padding:24px">
<p id="m">${token ? 'Kirilmoqda…' : esc(xatoMatn)}</p>
<script>
try { ${token ? `localStorage.setItem('kiovo_seans', ${j(token)});` : ''} } catch (e) {}
${token ? "location.replace('/app/');"
        : "setTimeout(function () { location.replace('/app/?kirish_xato=1'); }, 2500);"}
</script></body></html>`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const notFound = (res) => { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 — topilmadi'); };
/** Taklifchi sahifasi: o'z havolasi va natijasi, boshqa hech narsa. */
function taklifSahifasi(n, asos) {
  const e = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const havola = n ? (n.url.startsWith('http') ? n.url : `${String(asos || '').replace(/\/+$/, '')}${n.url}`) : '';
  const quti = (son, nom) => `<div class="q"><b>${Number(son || 0).toLocaleString('uz-UZ').replace(/,/g, ' ')}</b><span>${nom}</span></div>`;
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Taklif natijasi — KiOVO</title><link rel="stylesheet" href="/umumiy/brend.css">
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:20px;background:#e1edcf;
font-family:var(--k-shrift);color:#1d1514}.k{background:#f0f6e7;border-radius:22px;padding:26px 22px;max-width:420px;width:100%;
box-shadow:0 10px 40px rgba(60,40,20,.12)}.logo{color:#ab0a0c;line-height:0;margin-bottom:14px}.logo svg{height:30px;width:auto}
h1{font-size:22px;margin:0 0 4px}p{margin:0 0 18px;color:#605b52;font-size:14.5px}
.t{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 18px}.q{background:#fff;border-radius:14px;padding:14px 8px;text-align:center}
.q b{display:block;font-size:26px;color:#ab0a0c}.q span{font-size:12.5px;color:#605b52}
.h{display:flex;gap:8px;align-items:center;background:#fff;border-radius:12px;padding:10px 12px;font-weight:700;color:#ab0a0c;
word-break:break-all}.h span{flex:1}button,a.tg{border:0;border-radius:12px;padding:12px 14px;font:inherit;font-weight:700;cursor:pointer}
button{background:#ab0a0c;color:#fff}a.tg{display:block;text-align:center;margin-top:10px;background:#229ed9;color:#fff;text-decoration:none}
.y{font-size:12.5px;color:#605b52;margin-top:14px}</style></head><body><div class="k">
<div class="logo">${LOGO_INLINE}</div>
${n ? `<h1>Salom, ${e(n.nom)}!</h1><p>Sizning taklif havolangiz va natijangiz.</p>
<div class="t">${quti(n.yangi, 'yangi odam')}${quti(n.royxat, 'ro‘yxatdan o‘tdi')}${quti(n.xaridor, 'xarid qildi')}</div>
<div class="h"><span id="h">${e(havola)}</span><button id="n">Nusxa</button></div>
<a class="tg" href="https://t.me/share/url?url=${encodeURIComponent(havola)}&text=${encodeURIComponent('Yuzingizni bepul tahlil qiling — KiOVO')}">Telegramda ulashish</a>
${n.faol ? '' : '<p class="y">Bu havola hozir o‘chirilgan.</p>'}
<p class="y">Havolani do‘stlaringizga yuboring. Kim u orqali ro‘yxatdan o‘tsa — sizning hisobingizga yoziladi.</p>
<script>document.getElementById('n').onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(havola)}).then(function(){document.getElementById('n').textContent='Nusxalandi'})}</script>`
  : '<h1>Havola topilmadi</h1><p>Havola noto‘g‘ri yoki eskirgan. Sizga havola bergan odamdan qayta so‘rang.</p>'}
</div></body></html>`;
}

/** Xom tana (imzo tekshirish uchun bayt-baytga kerak). */
function xomTana(req, maks) {
  return new Promise((hal, rad) => {
    const b = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > maks) { rad(new Error('katta')); req.destroy(); } else b.push(c); });
    req.on('end', () => hal(Buffer.concat(b)));
    req.on('error', rad);
  });
}

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
    jadvalniIshgaTushir();  // avtomatik import (jadval yoqilgan bo'lsa)
    // Instagram tokeni 60 kun yashaydi — kuniga bir marta uzaytiramiz
    setInterval(() => igTokenniYangila().catch((e) => console.error('IG token:', e.message)), 24 * 3600e3).unref();
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
