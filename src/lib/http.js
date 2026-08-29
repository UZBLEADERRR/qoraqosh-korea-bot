// node:http ustidan minimal router va yordamchilar (tashqi kutubxonasiz).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ── Siqish ────────────────────────────────────────────────────────────────
// Katalog javobi 2000 mahsulotda 600 KB dan oshadi. Siqilmagan holda
// mobil internetda bu bir necha soniya — foydalanuvchi "ilova sekin"
// deb his qiladi. Gzip uni ~10 barobar kichraytiradi.
//
// Kichik javoblarni siqmaymiz: siqish o'zi ham vaqt oladi va 1 KB dan
// kichik narsada foyda yo'q.
const SIQISH_CHEGARASI = 1024;

/** Brauzer nimani qo'llaydi: br (yaxshiroq) yoki gzip. */
function siqishTuri(req) {
  const a = String(req?.headers?.['accept-encoding'] || '').toLowerCase();
  if (a.includes('br')) return 'br';
  if (a.includes('gzip')) return 'gzip';
  return null;
}

const siq = {
  br:   (b) => zlib.brotliCompressSync(b, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },  // tez va yetarli
  }),
  gzip: (b) => zlib.gzipSync(b, { level: 6 }),
};

/**
 * Javobni yuboradi, kerak bo'lsa siqadi.
 * @param {object} req  siqish turini aniqlash uchun (bo'lmasa siqilmaydi)
 */
export function javob(res, kod, bayt, sarlavhalar = {}, req = null) {
  const tur = bayt.length >= SIQISH_CHEGARASI ? siqishTuri(req) : null;
  const tana = tur ? siq[tur](bayt) : bayt;
  res.writeHead(kod, {
    ...sarlavhalar,
    'Content-Length': tana.length,
    ...(tur ? { 'Content-Encoding': tur, Vary: 'Accept-Encoding' } : {}),
  });
  res.end(tana);
}

// Joriy so'rov — json() ni har joyda o'zgartirmaslik uchun.
// Node bitta oqimda ishlaydi va javob so'rov ichida yoziladi, shuning uchun
// bu xavfsiz: ikkita so'rov bir vaqtda YOZMAYDI.
let joriySorov = null;
export const sorovniEsla = (req) => { joriySorov = req; };

export function json(res, kod, data) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  javob(res, kod, body, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  }, joriySorov);
}
export const ok  = (res, data = {}) => json(res, 200, data);
export const xato = (res, kod, xabar) => json(res, kod, { error: xabar });

/** So'rov tanasini o'qiydi (JSON). Hajm cheklangan. */
export function tana(req, maxBayt = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let hajm = 0;
    const bolaklar = [];
    req.on('data', (c) => {
      hajm += c.length;
      if (hajm > maxBayt) { reject(new Error('TANA_KATTA')); req.destroy(); return; }
      bolaklar.push(c);
    });
    req.on('end', () => {
      if (!bolaklar.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(bolaklar).toString('utf8'))); }
      catch { reject(new Error('NOTOGRI_JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/** Statik fayl. Path traversal yopilgan. */
export function statik(res, ildiz, nisbiy) {
  const toza = path.normalize(nisbiy).replace(/^(\.\.[/\\])+/, '');
  const fayl = path.resolve(ildiz, toza);
  if (!fayl.startsWith(path.resolve(ildiz) + path.sep) && fayl !== path.resolve(ildiz)) {
    res.writeHead(403); return res.end('Taqiqlangan');
  }
  if (!fs.existsSync(fayl) || !fs.statSync(fayl).isFile()) return false;

  const kengaytma = path.extname(fayl).toLowerCase();
  const sarlavha = {
    'Content-Type': MIME[kengaytma] || 'application/octet-stream',
    'Cache-Control': kengaytma === '.html' ? 'no-cache' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  };

  // Matnli fayllarni siqamiz (js, css, html, svg). Rasm allaqachon siqilgan —
  // uni qayta siqish faqat vaqt yeydi.
  if (SIQILADI.has(kengaytma)) {
    javob(res, 200, fs.readFileSync(fayl), sarlavha, joriySorov);
  } else {
    res.writeHead(200, sarlavha);
    fs.createReadStream(fayl).pipe(res);
  }
  return true;
}

const SIQILADI = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);

export const ipOl = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket.remoteAddress || 'nomalum';
