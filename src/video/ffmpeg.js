// FFMPEG — video yig'ish uchun. Binar `ffmpeg-static` paketidan keladi
// (Railway konteynerida tizim ffmpeg'i yo'q). FFMPEG_PATH bilan
// boshqasini ko'rsatsa bo'ladi.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

let yol = null;
/** ffmpeg binari manzili (topilmasa null). */
export function ffmpegYoli() {
  if (yol !== null) return yol || null;
  if (process.env.FFMPEG_PATH) return (yol = process.env.FFMPEG_PATH);
  try { yol = createRequire(import.meta.url)('ffmpeg-static') || ''; } catch { yol = ''; }
  return yol || null;
}

/**
 * ffmpeg ni ishga tushiradi. Xato bo'lsa stderr oxiri bilan tashlaydi.
 * @param {string[]} args
 * @param {{ vaqtMs?: number }} [o]
 */
export function ffmpeg(args, { vaqtMs = 6 * 60_000 } = {}) {
  const bin = ffmpegYoli();
  if (!bin) return Promise.reject(Object.assign(new Error('ffmpeg topilmadi (ffmpeg-static o‘rnatilmagan)'), { turkum: 'ffmpeg' }));
  return new Promise((ok, yoq) => {
    if (process.env.FFMPEG_LOG) console.error('FFMPEG', JSON.stringify(args));
    const p = spawn(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let xato = '';
    p.stderr.on('data', (d) => { xato = (xato + d).slice(-4000); });
    const t = setTimeout(() => { p.kill('SIGKILL'); }, vaqtMs);
    p.on('error', (e) => { clearTimeout(t); yoq(e); });
    p.on('close', (kod) => {
      clearTimeout(t);
      if (kod === 0) ok();
      else yoq(Object.assign(new Error(`ffmpeg xatosi (${kod}): ${xato.trim().split('\n').slice(-3).join(' | ')}`), { turkum: 'ffmpeg' }));
    });
  });
}

/**
 * Kadrlarni oqim bilan qabul qiladigan ffmpeg (stdin → video).
 * @returns {{ yoz: (buf: Buffer) => Promise<void>, tugat: () => Promise<void> }}
 */
export function ffmpegOqim(args, { vaqtMs = 15 * 60_000 } = {}) {
  const bin = ffmpegYoli();
  if (!bin) throw Object.assign(new Error('ffmpeg topilmadi (ffmpeg-static o‘rnatilmagan)'), { turkum: 'ffmpeg' });
  if (process.env.FFMPEG_LOG) console.error('FFMPEG', JSON.stringify(args));
  const p = spawn(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'ignore', 'pipe'] });
  let xato = '', yopildi = false;
  p.stderr.on('data', (d) => { xato = (xato + d).slice(-4000); });
  const t = setTimeout(() => { p.kill('SIGKILL'); }, vaqtMs);
  const tugadi = new Promise((ok, yoq) => {
    p.on('error', (e) => { yopildi = true; clearTimeout(t); yoq(e); });
    p.on('close', (kod) => {
      yopildi = true; clearTimeout(t);
      if (kod === 0) ok();
      else yoq(Object.assign(new Error(`ffmpeg xatosi (${kod}): ${xato.trim().split('\n').slice(-3).join(' | ')}`), { turkum: 'ffmpeg' }));
    });
  });
  tugadi.catch(() => {});
  p.stdin.on('error', () => {});
  return {
    yoz: (buf) => new Promise((ok, yoq) => {
      if (yopildi) return tugadi.then(() => yoq(new Error('ffmpeg erta yopildi')), yoq);
      if (p.stdin.write(buf)) ok(); else p.stdin.once('drain', ok);
    }),
    tugat: () => { p.stdin.end(); return tugadi; },
  };
}
