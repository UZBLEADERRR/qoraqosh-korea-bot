// Soxta Telegram + Gemini — botning haqiqiy yo'lini sinash uchun
import http from 'node:http';
import zlib from 'node:zlib';

export const yuborilgan = [];   // botdan chiqqan xabarlar

function png(w = 400, h = 400) {
  const chunk = (t, d) => {
    const c = Buffer.concat([Buffer.from(t), d]);
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(c) >>> 0);
    return Buffer.concat([len, c, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: h }, (_, y) =>
    Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w * 3 }, (_, i) => (i + y) % 256))])));
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const TAHLIL = {
  sifat: { yaroqli: true, sabab: 'yaroqli', ishonch: 92, izoh: '' },
  umumiy: { taxminiy_yosh: '22–26', teri_rangi: "och bug'doyrang, iliq ton",
            teri_turi: 'aralash', ball: 64, xulosa: 'Teri umuman sog‘lom.' },
  muammolar: [
    { kalit:'teshik', nom:'Kengaygan teshiklar', foiz:71, zona:'Burun qanotlari va peshona',
      izoh:'Teshiklar ko‘rinadi', sabab:'Yog‘ bezlari faol', yechim:'BHA bilan tozalang',
      ogohlantirish:'Siqmang' },
    { kalit:'quruqlik', nom:'Namlik yetishmasligi', foiz:48, zona:'Yonoqlar',
      izoh:'Yengil qipiqlanish', sabab:'To‘siq zaif', yechim:'Gialuron serum', ogohlantirish:'' },
  ],
  prognoz: [{ muammo:'Kengaygan teshiklar', natija:'Kengayadi', ehtimol:66, muddat:'6–12 oy' }],
  tavsiya: [
    { bosqich:'tozalash', product_id:1, sabab:'T-zona uchun mos' },
    { bosqich:'namlash',  product_id:21, sabab:'Yonoqlarni yopadi' },
    { bosqich:'himoya',   product_id:25, sabab:'Dog‘lardan himoya' },
  ],
};

/** Sxemaga qarab mos soxta javob qaytaradi. */
function javobMatni(sxemaMatni) {
  if (sxemaMatni.includes('muammolar')) return JSON.stringify(TAHLIL);
  if (sxemaMatni.includes('goyalar'))   return JSON.stringify({ goyalar: [] });
  if (sxemaMatni.includes('topildi'))   return JSON.stringify({
    topildi: true, ishonch: 88, izoh: '', name: 'Sinov krem', brand: 'TestBrand',
    category: 'krem', step: 'namlash', volume: '50 ml', country: 'KR',
    description: 'Sinov', usage_text: 'Surting', ingredients: 'Aqua',
    actives: [], concerns: [], skin_types: [], warnings: '', emoji: '🧴' });
  // Agent: reja mavzulari
  if (sxemaMatni.includes('mavzular')) return JSON.stringify({
    nom: 'Teri parvarishi',
    mavzular: Array.from({ length: 30 }, (_, i) => `${i + 1}-kun: teri parvarishi maslahati`),
  });
  // Agent: post matni
  if (sxemaMatni.includes('rasm_tavsifi')) return JSON.stringify({
    matn: '<b>Terini to‘g‘ri namlang</b> 💧\n\nKuniga ikki marta namlovchi krem ' +
          'surting — teri yumshoq bo‘ladi. <i>Botdan bepul tahlil oling!</i> 🌸',
    rasm_tavsifi: 'A minimal skincare flatlay on pastel background',
  });
  return JSON.stringify({ ok: true });
}

const tana = (req) => new Promise((r) => { const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => r(Buffer.concat(c).toString())); });

export function soxtaServer(port = 4444) {
  return new Promise((resolve) => {
    const s = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://x');
      const yol = u.pathname;
      const j = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

      // ---- Telegram ----
      if (yol.endsWith('/getFile'))  return j({ ok: true, result: { file_path: 'photos/x.jpg', file_size: 128000 } });
      if (yol.includes('/file/bot')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(png()); }
      if (yol.endsWith('/sendMessage')) {
        const b = JSON.parse(await tana(req) || '{}');
        yuborilgan.push(b);
        return j({ ok: true, result: { message_id: yuborilgan.length, chat: { id: b.chat_id } } });
      }
      // sendPhoto multipart bilan keladi — izohni ajratib olamiz, baytni tashlaymiz
      if (yol.endsWith('/sendPhoto')) {
        const xom = await tana(req);
        const izoh = /name="caption"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const chat = /name="chat_id"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const kb   = /name="reply_markup"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        yuborilgan.push({ rasm: true, chat_id: chat?.[1], text: izoh?.[1] || '', hajm: xom.length,
          reply_markup: kb ? JSON.parse(kb[1]) : undefined });
        return j({ ok: true, result: { message_id: yuborilgan.length, photo: [{ file_id: 'f1' }] } });
      }
      if (yol.endsWith('/sendDocument')) {
        const xom = await tana(req);
        const izoh = /name="caption"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const chat = /name="chat_id"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        yuborilgan.push({ hujjat: true, chat_id: chat?.[1], text: izoh?.[1] || '', hajm: xom.length });
        return j({ ok: true, result: { message_id: yuborilgan.length } });
      }
      if (yol.endsWith('/sendChatAction') || yol.endsWith('/deleteMessage') ||
          yol.endsWith('/editMessageReplyMarkup') || yol.endsWith('/answerCallbackQuery') ||
          yol.endsWith('/setWebhook') || yol.endsWith('/deleteWebhook')) return j({ ok: true, result: true });
      if (yol.endsWith('/getUpdates')) return j({ ok: true, result: [] });
      // Majburiy obuna sinovi: globalThis.AZO bilan boshqariladi
      if (yol.endsWith('/getChatMember')) {
        return j({ ok: true, result: { status: globalThis.AZO ? 'member' : 'left' } });
      }
      if (yol.endsWith('/getMe')) return j({ ok: true, result: { id: 1, username: 'sinov_bot' } });
      // globalThis.KANAL bilan turli holatlarni sinaymiz
      if (yol.endsWith('/getChat')) {
        const k = globalThis.KANAL;
        if (k === 'yoq') return j({ ok: false, description: 'chat not found' });
        if (k === 'ochiq') return j({ ok: true, result: { id: -100, title: 'Meduza', username: 'meduza_kanal' } });
        if (k === 'yopiq_havolali') return j({ ok: true, result: { id: -100, title: 'Meduza',
          invite_link: 'https://t.me/+eskiHavola' } });
        return j({ ok: true, result: { id: -100, title: 'Meduza' } });   // yopiq, havolasiz
      }
      if (yol.endsWith('/createChatInviteLink')) {
        if (globalThis.HAVOLA_YARATILMAYDI) return j({ ok: false, description: 'not enough rights' });
        return j({ ok: true, result: { invite_link: 'https://t.me/+yangiHavola' } });
      }

      // ---- Google Gemini ----
      if (yol.includes(':generateContent')) {
        const b = JSON.parse(await tana(req) || '{}');
        // Rasm chizish so'rovi — JSON sxema bo'lmaydi, rasm qaytariladi
        if (!b.generationConfig?.responseSchema) {
          return j({ candidates: [{ finishReason: 'STOP', content: { parts: [
            { inline_data: { mime_type: 'image/png', data: png().toString('base64') } }] } }] });
        }
        const kichik = (b.generationConfig?.maxOutputTokens || 0) < 512;
        // Haqiqiy hayotdagi kabi: byudjet kichik bo'lsa o'ylash uni yeb qo'yadi
        if (kichik) return j({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] });
        const sxema = JSON.stringify(b.generationConfig?.responseSchema || {});
        return j({ candidates: [{ content: { parts: [{ text: javobMatni(sxema) }] }, finishReason: 'STOP' }] });
      }

      // ---- OpenRouter ----
      if (yol.endsWith('/chat/completions')) {
        const b = JSON.parse(await tana(req) || '{}');
        const sxema = JSON.stringify(b.response_format?.json_schema?.schema || {});
        return j({ choices: [{ message: { content: javobMatni(sxema) }, finish_reason: 'stop' }] });
      }
      j({ ok: false, description: 'noma’lum: ' + yol });
    });
    s.listen(port, () => resolve(s));
  });
}
