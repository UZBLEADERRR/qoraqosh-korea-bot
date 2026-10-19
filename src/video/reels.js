// REELS VIDEO — sahnalar + ovoz + musiqa → 1080×1920 MP4 (Instagram Reels talabi:
// H.264, yuv420p, 30 fps, AAC 48 kHz, moov boshida).
//
// Harakat: fon sekin yaqinlashadi (Ken Burns), matn qatlami paydo bo'lib
// pastdan siljib chiqadi, sahnalar orasida silliq o'tish (xfade).
// Ovoz bo'lmasa (TTS ishlamasa) — faqat yumshoq fon musiqasi.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { svgdanPng } from '../rasm/chiz.js';
import { ffmpeg } from './ffmpeg.js';
import { W, H, fonSvg, hookSvg, punktSvg, ctaSvg } from './reels-sahna.js';

const FPS = 30;
const OTISH = 0.45;                 // sahnalar orasidagi o'tish (soniya)

/** Sahna davomiyliklari — ovoz uzunligiga moslanadi. */
export function davomiyliklar(ovozSoniya = 0, punktSoni = 3) {
  const hook = 3.2;
  const kerak = Math.max(18, (ovozSoniya || 0) + 1.6);            // ovoz tugagach biroz turadi
  const otishlar = OTISH * (punktSoni + 1);
  const punkt = Math.min(9, Math.max(3.4, (kerak - hook - 4.6 + otishlar) / punktSoni));
  // Ovoz uzun bo'lsa qolgani oxirgi sahnaga — ovoz HECH QACHON kesilmasin
  const cta = Math.max(4.6, kerak - hook - punkt * punktSoni + otishlar);
  return [hook, ...Array(punktSoni).fill(+punkt.toFixed(2)), +cta.toFixed(2)];
}

/**
 * @param {object} d
 * @param {{rasm?:string, mime?:string}} d.surat    mahsulot surati (base64)
 * @param {object} d.ssenariy   {hook, punktlar[], nom, brend, narx, eskiNarx, chaqiriq, pastki}
 * @param {{wav:Buffer, soniya:number}|null} [d.ovoz]
 * @returns {Promise<{mp4: Buffer, soniya: number}>}
 */
export async function reelsYasa({ surat, ssenariy: s, ovoz = null }) {
  const papka = await fs.mkdtemp(path.join(os.tmpdir(), 'reels-'));
  try {
    const punktlar = (s.punktlar || []).slice(0, 3);
    const sahnalar = [
      { fon: fonSvg(surat, 'katta'), matn: hookSvg(s.hook) },
      ...punktlar.map((p, i) => ({ fon: fonSvg(surat, 'kichik'), matn: punktSvg(i + 1, p, s.nom) })),
      { fon: fonSvg(surat, 'kichik'), matn: ctaSvg(s) },
    ];
    const d = davomiyliklar(ovoz?.soniya || 0, punktlar.length);
    const kirish = [];
    for (let i = 0; i < sahnalar.length; i++) {
      const fonY = path.join(papka, `f${i}.png`), matnY = path.join(papka, `m${i}.png`);
      await fs.writeFile(fonY, await svgdanPng(sahnalar[i].fon, W));
      await fs.writeFile(matnY, await svgdanPng(sahnalar[i].matn, W, { fon: null }));
      kirish.push('-loop', '1', '-framerate', String(FPS), '-t', String(d[i]), '-i', fonY,
                  '-loop', '1', '-framerate', String(FPS), '-t', String(d[i]), '-i', matnY);
    }
    const jami = d.reduce((a, b) => a + b, 0) - OTISH * (d.length - 1);

    // ── Video grafi ──
    const f = [];
    for (let i = 0; i < sahnalar.length; i++) {
      const n = Math.round(d[i] * FPS);
      // Fon: kattalashtirib keyin zoompan — titramasin
      f.push(`[${2 * i}:v]scale=${W * 1.5}:${H * 1.5},zoompan=z='1+0.07*on/${n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},setsar=1[b${i}]`);
      f.push(`[${2 * i + 1}:v]format=rgba,fade=in:st=0.15:d=0.5:alpha=1[t${i}]`);
      f.push(`[b${i}][t${i}]overlay=x=0:y='if(lt(t,0.7),70*(1-t/0.7),0)':format=auto,setpts=PTS-STARTPTS,fps=${FPS},settb=1/${FPS},format=yuv420p[v${i}]`);
    }
    let oldingi = 'v0', ofset = 0;
    const otishlar = ['slideleft', 'fade', 'slideup', 'smoothleft', 'fade'];
    for (let i = 1; i < sahnalar.length; i++) {
      ofset += d[i - 1] - OTISH;
      const chiq = i === sahnalar.length - 1 ? 'vid' : `x${i}`;
      f.push(`[${oldingi}][v${i}]xfade=transition=${otishlar[(i - 1) % otishlar.length]}:duration=${OTISH}:offset=${ofset.toFixed(3)}[${chiq}]`);
      oldingi = chiq;
    }

    // ── Audio: yumshoq akkord (musiqa o'rnida) + ovoz ──
    const audioKirish = sahnalar.length * 2;
    const musiqa = `aevalsrc='0.05*(sin(2*PI*220*t)+0.8*sin(2*PI*277.18*t)+0.7*sin(2*PI*329.63*t)+0.5*sin(2*PI*440*t))*(0.65+0.35*sin(2*PI*0.2*t))':s=48000:d=${jami.toFixed(2)}`;
    kirish.push('-f', 'lavfi', '-i', musiqa);
    let ovozYoli = null;
    if (ovoz?.wav) {
      ovozYoli = path.join(papka, 'ovoz.wav');
      await fs.writeFile(ovozYoli, ovoz.wav);
      kirish.push('-i', ovozYoli);
    }
    const ochish = `afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, jami - 1.2).toFixed(2)}:d=1.2`;
    if (ovozYoli) {
      f.push(`[${audioKirish}:a]lowpass=f=1800,volume=0.55,${ochish}[mus]`);
      f.push(`[${audioKirish + 1}:a]aresample=48000,adelay=350:all=1,volume=0.95[ovz]`);
      // limiter — ovoz va musiqa qo'shilganda cho'qqi 0 dB dan oshib xirillamasin
      f.push(`[mus][ovz]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89,aformat=channel_layouts=stereo[aud]`);
    } else {
      f.push(`[${audioKirish}:a]lowpass=f=1800,volume=1.2,${ochish},aformat=channel_layouts=stereo[aud]`);
    }

    const chiqish = path.join(papka, 'reels.mp4');
    await ffmpeg([...kirish, '-filter_complex', f.join(';'), '-map', '[vid]', '-map', '[aud]',
      '-t', jami.toFixed(2), '-r', String(FPS),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', chiqish]);
    return { mp4: await fs.readFile(chiqish), soniya: +jami.toFixed(2) };
  } finally {
    fs.rm(papka, { recursive: true, force: true }).catch(() => {});
  }
}
