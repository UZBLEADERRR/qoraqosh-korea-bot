// Soxta Telegram + Gemini — botning haqiqiy yo'lini sinash uchun
import http from 'node:http';
import zlib from 'node:zlib';

export const yuborilgan = [];   // botdan chiqqan xabarlar
let mahsulotHisobi = 0;         // soxta AI qaytaradigan mahsulot nomlari uchun
// AI necha marta chaqirilgani — «arzon filtr token tejaydimi» degan
// savolni faqat shu bilan tekshirib bo'ladi
export const aiHisobi = { marketplace: 0, jami: 0 };
// Telegramdagi kabi haqiqiy message_id: ro'yxat tozalansa ham takrorlanmaydi,
// shunda deleteMessage aynan o'sha xabarni topadi.
let xabarId = 0;
/** Foydalanuvchi CHATIDA qolgan xabarlar — o'chirilganlari hisobga olinmaydi. */
export const korinadigan = () => yuborilgan.filter((x) => !x.ochirilgan);

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
  aiHisobi.jami += 1;
  if (sxemaMatni.includes('kosmetikami')) aiHisobi.marketplace += 1;
  if (sxemaMatni.includes('muammolar')) return JSON.stringify(TAHLIL);
  if (sxemaMatni.includes('goyalar'))   return JSON.stringify({ goyalar: [] });
  // Marketplace: do'kon sahifasidan mahsulot o'qish
  if (sxemaMatni.includes('kosmetikami')) return JSON.stringify({
    kosmetikami: true, ishonch: 90, izoh: '',
    // Har mahsulot boshqacha nomlanadi: katalogda nom+brend yagona bo'lishi
    // kerak va ommaviy import shuni sinaydi
    name: `Soothing Aloe Gel Cream ${++mahsulotHisobi}`, brand: 'Daiso',
    narx_qiymat: 5000, narx_valyuta: 'KRW',
    ogirlik_g: 120, volume: '100 ml',
    category: 'krem', step: 'namlash',
    description: 'Yengil gel-krem, terini tinchlantiradi.',
    usage_text: 'Toza teriga ertalab va kechqurun surting.',
    ingredients: 'Aloe Barbadensis Leaf Extract, Glycerin',
    actives: ['aloe'], concerns: ['quruqlik'], skin_types: ['barcha'],
    warnings: '', emoji: '🧴' });
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
        b.id = ++xabarId;
        yuborilgan.push(b);
        return j({ ok: true, result: { message_id: b.id, chat: { id: b.chat_id } } });
      }
      // sendPhoto multipart bilan keladi — izohni ajratib olamiz, baytni tashlaymiz
      if (yol.endsWith('/sendPhoto')) {
        const xom = await tana(req);
        const izoh = /name="caption"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const chat = /name="chat_id"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const kb   = /name="reply_markup"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        yuborilgan.push({ id: ++xabarId, rasm: true, chat_id: chat?.[1], text: izoh?.[1] || '',
          hajm: xom.length, reply_markup: kb ? JSON.parse(kb[1]) : undefined });
        return j({ ok: true, result: { message_id: xabarId, photo: [{ file_id: 'f1' }] } });
      }
      if (yol.endsWith('/sendDocument')) {
        const xom = await tana(req);
        const izoh = /name="caption"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        const chat = /name="chat_id"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(xom);
        yuborilgan.push({ id: ++xabarId, hujjat: true, chat_id: chat?.[1],
          text: izoh?.[1] || '', hajm: xom.length });
        return j({ ok: true, result: { message_id: xabarId } });
      }
      // O'chirilgan xabar chatda qolmaydi — sinov aynan foydalanuvchi
      // ko'radigan holatni tekshirishi uchun belgilab qo'yamiz.
      if (yol.endsWith('/deleteMessage')) {
        const b = JSON.parse(await tana(req) || '{}');
        const x = yuborilgan.find((y) => y.id === Number(b.message_id));
        if (x) x.ochirilgan = true;
        return j({ ok: true, result: true });
      }
      if (yol.endsWith('/sendChatAction') ||
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
      // ── Soxta do'kon sahifasi (marketplace sinovi uchun) ──
      // Soxta do'kon API si: daisomall kabi SPA — sahifada mahsulot yo'q,
      // u JSON so'rov bilan keladi.
      if (yol.startsWith('/api/pd/')) {
        const id = u.searchParams.get('pdNo') || '1';
        if (id === 'yoq') { res.writeHead(404); return res.end('{"error":"not found"}'); }
        if (id === 'html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          return res.end('<html><body>Xato sahifa</body></html>');
        }
        return j({ result: {
          pdNo: id,
          pdNm: 'Soothing Aloe Gel Cream 100ml',
          brndNm: 'Daiso',
          salePrc: 5000,
          currency: 'KRW',
          wt: '120g',
          pdImgUrl: `http://127.0.0.1:${port}/rasm/api-mahsulot.png`,
          pdDesc: '알로에 성분이 피부를 진정시켜 줍니다. 100ml',
        } });
      }
      // Daiso qidiruvining shakli: javobda mahsulot to'liq keladi
      // (nom, narx, brend, rasm) — alohida sahifa ochish shart emas.
      if (yol.startsWith('/ssn/search/FindStoreGoods')) {
        const sahifa = Number(u.searchParams.get('pageNum') || 1);
        const soz = u.searchParams.get('searchTerm') || '';
        const soni = Number(u.searchParams.get('cntPerPage') || 30);
        const hujjatlar = sahifa > 2 ? [] : Array.from({ length: Math.min(4, soni) }, (_, i) => ({
          PD_NO: `${soz}-${sahifa}-${i + 1}`,
          PDNM: `수분 크림 ${sahifa}${i + 1} 100ml`,
          PD_PRC: '5000',
          BRND_NM: 'Daiso',
          ATCH_FILE_URL: `http://127.0.0.1:${port}/rasm/qidiruv.png`,
          SOLD_OUT_YN: 'N',
        }));
        return j({ resultSet: { result: [{ totalSize: 8, resultDocuments: hujjatlar }] } });
      }

      // Bo'lim (kategoriya) API si — sahifalanadigan ro'yxat
      if (yol.startsWith('/api/list')) {
        const sahifa = Number(u.searchParams.get('page') || 1);
        // Uchinchi sahifadan keyin mahsulot tugaydi — import ham to'xtashi kerak
        const items = sahifa > 3 ? []
          : Array.from({ length: 5 }, (_, i) => ({ pdNo: `p${sahifa}_${i + 1}` }));
        return j({ result: { items } });
      }

      if (yol.startsWith('/dokon/')) {
        const yoq = yol.includes('yoq');
        if (yoq) { res.writeHead(403); return res.end('Forbidden'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<!doctype html><html><head>
<title>Soothing Aloe Gel Cream 100ml | Daiso</title>
<meta property="og:title" content="Soothing Aloe Gel Cream 100ml">
<meta property="og:image" content="http://127.0.0.1:${port}/rasm/mahsulot.png">
<meta property="product:price:amount" content="5000">
<meta property="product:price:currency" content="KRW">
<script type="application/ld+json">
{"@type":"Product","name":"Soothing Aloe Gel Cream","brand":{"name":"Daiso"},
 "offers":{"@type":"Offer","price":"5000","priceCurrency":"KRW"},
 "weight":"120g"}
</script>
</head><body>
<h1>Soothing Aloe Gel Cream 100ml</h1>
<div class="price">5,000원</div>
<p>알로에 성분이 피부를 진정시켜 줍니다. 100ml</p>
<a href="/dokon/product/boshqa-1">Boshqa mahsulot</a>
<a href="/dokon/product/boshqa-2">Yana bitta</a>
<a href="/dokon/category/kremlar">Kremlar</a>
<a href="https://tashqi.example/reklama">Reklama</a>
</body></html>`);
      }

      // Soxta mahsulot rasmi
      if (yol.startsWith('/rasm/')) {
        // 1x1 shaffof PNG
        const png = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64');
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length });
        return res.end(png);
      }

      if (yol.includes(':generateContent')) {
        const b = JSON.parse(await tana(req) || '{}');
        // Google ba'zi sozlamalarni qabul qilmay 400 qaytaradi. Server
        // so'rovni SODDALASHTIRIB qayta urinishi kerak — shuni sinaymiz.
        if (globalThis.AI_400 > 0) {
          globalThis.AI_400 -= 1;
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: { code: 400,
            message: 'Invalid JSON payload received. Unknown name "thinkingConfig".' } }));
        }
        // Rasm chizish so'rovi — responseModalities: ['IMAGE'] bilan keladi.
        // (Sxema yo'qligiga qarab bo'lmaydi: server 400 dan keyin sxemani
        // promptga ko'chirib, sxemasiz ham JSON so'raydi.)
        if ((b.generationConfig?.responseModalities || []).includes('IMAGE')) {
          return j({ candidates: [{ finishReason: 'STOP', content: { parts: [
            { inline_data: { mime_type: 'image/png', data: png().toString('base64') } }] } }] });
        }
        const kichik = (b.generationConfig?.maxOutputTokens || 0) < 512;
        // Haqiqiy hayotdagi kabi: byudjet kichik bo'lsa o'ylash uni yeb qo'yadi
        if (kichik) return j({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] });
        // Sxema so'rovda bo'lmasa promptdan qidiramiz — soddalashtirilgan
        // rejimda u matn bo'lib yuboriladi
        const sxema = b.generationConfig?.responseSchema
          ? JSON.stringify(b.generationConfig.responseSchema)
          : (b.contents?.[0]?.parts || []).map((x) => x.text || '').join(' ');
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
