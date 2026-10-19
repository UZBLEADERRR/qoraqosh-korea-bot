// OVOZ — Gemini TTS: matn → WAV (24 kHz, mono, 16-bit).
//
// Model qoidasi (egasining talabi): faqat Gemini 3 va yangisi —
// gemini-2.x TTS ishlatilmaydi. Model va ovoz nomi admin panelda
// (Kunlik Reels sozlamasi) o'zgaradi.
import { config } from '../config.js';

export const OVOZ_STANDART = { model: 'gemini-3.8-flash-tts', ovoz: 'Kore' };

/** TTS modeli ruxsatmi: gemini-3+ va nomida «tts» bor. */
export function ovozModeliMi(nom) {
  const n = String(nom || '').toLowerCase();
  const m = /gemini-(\d+)/.exec(n);
  return Boolean(m && Number(m[1]) >= 3 && /tts/.test(n));
}

/** 16-bit PCM → WAV sarlavhasi bilan. */
export function pcmdanWav(pcm, tezlik = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(tezlik, 24); h.writeUInt32LE(tezlik * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/**
 * @param {string} matn  o'qiladigan matn (o'zbekcha)
 * @returns {Promise<{wav: Buffer, soniya: number, model: string}>}
 */
export async function ovozYoz(matn, { model = OVOZ_STANDART.model, ovoz = OVOZ_STANDART.ovoz } = {}) {
  if (!ovozModeliMi(model)) throw Object.assign(new Error(`«${model}» ovoz uchun ruxsat etilmagan — faqat Gemini 3+ TTS`), { turkum: 'model' });
  const kalitlar = config.geminiKeys || [];
  if (!kalitlar.length) throw Object.assign(new Error('GEMINI_API_KEY yo‘q — ovoz yozib bo‘lmaydi'), { turkum: 'kalit' });
  const tana = {
    contents: [{ parts: [{ text: `Speak warmly and energetically, like a friendly young woman presenting a Korean skincare product in a short Instagram Reel. Read in Uzbek, exactly this text:\n${matn}` }] }],
    generationConfig: { responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: ovoz } } } },
  };
  let oxirgi = null;
  for (const kalit of kalitlar) {
    try {
      const r = await fetch(`${config.geminiApi}/${model}:generateContent?key=${kalit}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tana),
        signal: AbortSignal.timeout(90_000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { oxirgi = new Error(`TTS HTTP ${r.status}: ${String(j?.error?.message || '').slice(0, 160)}`); continue; }
      const q = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      const d = q?.inlineData || q?.inline_data;
      if (!d?.data) { oxirgi = new Error('TTS bo‘sh javob qaytardi'); continue; }
      const tezlik = Number(/rate=(\d+)/.exec(d.mimeType || d.mime_type || '')?.[1]) || 24000;
      const pcm = Buffer.from(d.data, 'base64');
      return { wav: pcmdanWav(pcm, tezlik), soniya: pcm.length / 2 / tezlik, model };
    } catch (e) { oxirgi = e; }
  }
  throw Object.assign(oxirgi || new Error('TTS ishlamadi'), { turkum: 'ovoz' });
}
