const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MAHSULOTLAR, TEG_NOM } = require('./data/products');

const TOKEN = process.env.BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.DOMAIN || 'localhost:3000';
const PROTOCOL = DOMAIN.includes('localhost') ? 'http' : 'https';
const WEBAPP_URL = `${PROTOCOL}://${DOMAIN}`;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const WEBAPP_PATH = path.join(__dirname, 'webapp');

// Ma'lumotlar bazasi
let db = { offset: 0, analyses: {} };
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) { console.error('DB yuklashda xato:', e); }
}
function saveDb() {
  try {
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_PATH);
  } catch (e) { console.error('DB saqlashda xato:', e); }
}
loadDb();

// Yordamchi funksiyalar
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const narxFmt = (n) => n.toLocaleString('uz-UZ') + ' so\'m';

// Telegram initData tekshiruvi
function verifyInitData(initData) {
  if (!initData || !TOKEN) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
  } catch (e) { return false; }
}

// Telegram API
async function tg(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// Gemini AI tahlili
async function tahlilQil(photoUrl) {
  if (!GEMINI_KEY) return fallbackAnaliz();
  try {
    const prompt = `Ushbu yuz rasmini tahlil qiling. Faqat quyidagi JSON formatda javob bering:
    {"yosh": "taxminiy yosh", "teri_turi": "turi", "muammolar": ["muammo1", "muammo2"], "maslahat": ["maslahat1"], "teg": ["serum", "maska"]}`;
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: photoUrl } }
        ]}]
      })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Gemini xatosi:', e);
    return fallbackAnaliz();
  }
}

function fallbackAnaliz() {
  return {
    yosh: "20-25",
    teri_turi: "Aralash",
    muammolar: ["Yengil qizarish", "Namlik yetishmasligi"],
    maslahat: ["Kuniga 2 mahal namlantiring", "Quyoshdan himoya kremi ishlating"],
    teg: ["serum", "maska"],
    namuna: true
  };
}

// Bot mantiqi
async function handleUpdate(upd) {
  const msg = upd.message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;

  if (msg.text === '/start') {
    await tg('sendMessage', {
      chat_id: chatId,
      text: `👋 <b>QoraQosh Korea</b> botiga xush kelibsiz!\n\nKoreyaning original kosmetikasi. Yuzingizni tahlil qilishimiz uchun <b>yuzingiz aniq ko'ringan rasm</b> yuboring.`,
      parse_mode: 'HTML'
    });
  } else if (msg.photo || msg.document?.mime_type?.startsWith('image/')) {
    const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    
    const file = await tg('getFile', { file_id: fileId });
    if (!file.ok) return;

    const imgRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.result.file_path}`);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const analiz = await tahlilQil(base64);
    db.analyses[chatId] = { ...analiz, vaqt: Date.now() };
    saveDb();

    // Tavsiyalar
    const teglari = analiz.teg || [];
    const tavsiyalar = MAHSULOTLAR
      .map(p => ({ ...p, b: p.teglari.filter(t => teglari.includes(t)).length }))
      .filter(p => p.b > 0)
      .sort((a, b) => b.b - a.b)
      .slice(0, 5);

    let text = `🔍 <b>Tahlil natijalari:</b>\n`;
    if (analiz.namuna) text += `⚠️ <i>(Server bandligi sababli namunaviy tahlil)</i>\n`;
    text += `\n👤 Yosh: ${esc(analiz.yosh)}`;
    text += `\n✨ Teri turi: ${esc(analiz.teri_turi)}`;
    text += `\n\n📝 <b>Muammolar:</b>\n${(analiz.muammolar || []).map(m => "• " + esc(m)).join('\n')}`;
    text += `\n\n💡 <b>Maslahat:</b>\n${(analiz.maslahat || []).map(m => "• " + esc(m)).join('\n')}`;
    
    if (tavsiyalar.length > 0) {
      text += `\n\n🛍 <b>Sizga mos mahsulotlar:</b>\n`;
      tavsiyalar.forEach(p => {
        text += `\n- ${esc(p.nom)} (${narxFmt(p.narx)})`;
      });
    }

    await tg('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{
          text: "🛒 Katalogda ko'rish",
          web_app: { url: `${WEBAPP_URL}?start=tahlil` }
        }]]
      }
    });
  } else {
    await tg('sendMessage', { chat_id: chatId, text: "Iltimos, yuz tahlili uchun rasm yuboring." });
  }
}

// Polling
async function startBot() {
  console.log('Bot ishga tushdi...');
  while (true) {
    try {
      const data = await tg('getUpdates', { offset: db.offset, timeout: 30, allowed_updates: ["message"] });
      if (data.ok && data.result.length > 0) {
        for (const upd of data.result) {
          await handleUpdate(upd);
          db.offset = upd.update_id + 1;
          saveDb();
        }
      } else if (!data.ok) {
        console.error('Telegram xatosi:', data);
        await sleep(5000);
      }
    } catch (e) {
      console.error('Polling xatosi:', e);
      await sleep(5000);
    }
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // API: Mahsulotlar
  if (pathname === '/api/products') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(MAHSULOTLAR));
  }

  // API: Tahlil natijasi
  if (pathname.startsWith('/api/analysis/')) {
    const chatId = pathname.split('/').pop();
    const initData = req.headers['x-tg-init-data'];

    if (!Object.hasOwn(db.analyses, chatId)) {
      res.writeHead(404);
      return res.end('Topilmadi');
    }

    if (!verifyInitData(initData)) {
      res.writeHead(403);
      return res.end('Ruxsat berilmadi');
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.analyses[chatId]));
  }

  // Statik fayllar
  let filePath = path.join(WEBAPP_PATH, pathname === '/' ? 'index.html' : pathname);
  
  // Path traversal himoyasi
  if (!filePath.startsWith(WEBAPP_PATH + path.sep) && filePath !== WEBAPP_PATH) {
    res.writeHead(403);
    return res.end('Taqiqlangan');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=3600'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404);
  res.end('404 Topilmadi');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda`);
  if (TOKEN) startBot();
  else console.warn('BOT_TOKEN topilmadi, bot ishga tushmadi.');
});

process.on('uncaughtException', (err) => console.error('Kutilmagan xato:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
