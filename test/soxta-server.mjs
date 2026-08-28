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
      if (yol.endsWith('/sendChatAction') || yol.endsWith('/deleteMessage') ||
          yol.endsWith('/editMessageReplyMarkup') || yol.endsWith('/answerCallbackQuery') ||
          yol.endsWith('/setWebhook') || yol.endsWith('/deleteWebhook')) return j({ ok: true, result: true });
      if (yol.endsWith('/getUpdates')) return j({ ok: true, result: [] });

      // ---- Gemini ----
      if (yol.includes(':generateContent')) {
        return j({ candidates: [{ content: { parts: [{ text: JSON.stringify(TAHLIL) }] }, finishReason: 'STOP' }] });
      }
      j({ ok: false, description: 'noma’lum: ' + yol });
    });
    s.listen(port, () => resolve(s));
  });
}
