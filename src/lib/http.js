// node:http ustidan minimal router va yordamchilar (tashqi kutubxonasiz).
import fs from 'node:fs';
import path from 'node:path';

export function json(res, kod, data) {
  const body = JSON.stringify(data);
  res.writeHead(kod, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
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
  res.writeHead(200, {
    'Content-Type': MIME[kengaytma] || 'application/octet-stream',
    'Cache-Control': kengaytma === '.html' ? 'no-cache' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(fayl).pipe(res);
  return true;
}

export const ipOl = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket.remoteAddress || 'nomalum';
