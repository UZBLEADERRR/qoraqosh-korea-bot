// QoraQosh — Telegram bot + Mini App serveri (Node.js, ESM)
// Bitta server: long-polling bot + statik Mini App + API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MAHSULOTLAR, TEGLAR } from './data/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.DOMAIN || 'localhost:3000';
const PROTOCOL = DOMAIN.includes('localhost') ? 'http' : 'https';
const WEBAPP_URL = `${PROTOCOL}://${DOMAIN}`;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const WEBAPP_PATH = path.join(__dirname, 'webapp');
const PORT = process.env.PORT || 3000;

// ---------- Ma'lumotlar bazasi (fayl, atomik yozish) ----------
let db = { offset: 0, analyses: {} };
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) { console.error('DB yuklashda xato:', e.message); }
}
function saveDb() {
  try {
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_PATH);
  } catch (e) { console.error('DB saqlashda xato:', e.message); }
}
loadDb();

// ---------- Yordamchilar ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const narxFmt = (n) => Number(n).toLocaleString('uz-UZ') + " so'm";

// Telegram initData HMAC-SHA256 tekshiruvi (Mini App xavfsizligi)
function verifyInitData(initData) {
  if (!initData || !TOKEN) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    // Doimiy vaqt taqqoslash (timing attack himoyasi)
    return hmac.length === hash.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash));
  } catch { return false; }
}

// ---------- Telegram API ----------
async function tg(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ---------- Gemini AI yuz tahlili ----------
const TEG_KALITLAR = Object.keys(TEGLAR).join(', ');

async function tahlilQil(base64Image, mime = 'image/jpeg') {
  if (!GEMINI_KEY) return fallbackAnaliz();
  try {
    const prompt = `Ushbu yuz rasmini tahlil qiling. Javobni FAQAT quyidagi JSON formatda bering (boshqa hech narsa yozmang):
{"yosh":"taxminiy yosh oralig'i","teri_turi":"teri turi","muammolar":["muammo1","muammo2"],"maslahat":["maslahat1","maslahat2"],"teg":["teg1","teg2"]}
"teg" massivi uchun faqat shu kalitlardan foydalaning: ${TEG_KALITLAR}. 2-4 ta eng mos tegni tanlang.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data: base64Image } }
        ]}]
      })
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    // Har bir maydonni himoyalash
    return {
      yosh: parsed.yosh ?? "noma'lum",
      teri_turi: parsed.teri_turi ?? "noma'lum",
      muammolar: Array.isArray(parsed.muammolar) ? parsed.muammolar : [],
      maslahat: Array.isArray(parsed.maslahat) ? parsed.maslahat : [],
      teg: Array.isArray(parsed.teg) ? parsed.teg.filter(t => TEGLAR[t]) : [],
      namuna: false
    };
  } catch (e) {
    console.error('Gemini xatosi:', e.message);
    return fallbackAnaliz();
  }
}

function fallbackAnaliz() {
  return {
    yosh: "20-25",
    teri_turi: "Aralash",
    muammolar: ["Yengil qizarish", "Namlik yetishmasligi"],
    maslahat: ["Kuniga 2 mahal namlantiring", "Quyoshdan himoya kremi ishlating"],
    teg: ["namlash", "sezgir"],
    namuna: true
  };
}

// Tahlil asosida katalogdan mos mahsulotlarni tanlash
function tavsiyaTop(teglar, limit = 5) {
  return MAHSULOTLAR
    .map(p => ({ ...p, b: (p.teg || []).filter(t => teglar.includes(t)).length }))
    .filter(p => p.b > 0)
    .sort((a, b) => b.b - a.b)
    .slice(0, limit);
}

// ---------- Bot mantiqi ----------
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
    return;
  }

  const isPhoto = Array.isArray(msg.photo) && msg.photo.length > 0;
  const isDocImage = msg.document && String(msg.document.mime_type || '').startsWith('image/');

  if (isPhoto || isDocImage) {
    const fileId = isPhoto ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
    const mime = isDocImage ? msg.document.mime_type : 'image/jpeg';
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });

    const file = await tg('getFile', { file_id: fileId });
    if (!file.ok || !file.result?.file_path) {
      await tg('sendMessage', { chat_id: chatId, text: '⚠️ Rasmni yuklab bo\'lmadi. Qayta yuborib ko\'ring.' });
      return;
    }

    const imgRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${file.result.file_path}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString('base64');

    const analiz = await tahlilQil(base64, mime);
    db.analyses[chatId] = { ...analiz, vaqt: Date.now() };
    saveDb();

    const teglari = analiz.teg || [];
    const tavsiyalar = tavsiyaTop(teglari, 5);

    let text = `🔍 <b>Tahlil natijalari:</b>\n`;
    if (analiz.namuna) text += `⚠️ <i>(AI mavjud emas — namunaviy tahlil ko'rsatilmoqda)</i>\n`;
    text += `\n👤 Yosh: ${esc(analiz.yosh)}`;
    text += `\n✨ Teri turi: ${esc(analiz.teri_turi)}`;
    text += `\n\n📝 <b>Muammolar:</b>\n${(analiz.muammolar || []).map(m => '• ' + esc(m)).join('\n') || "• Aniqlanmadi"}`;
    text += `\n\n💡 <b>Maslahat:</b>\n${(analiz.maslahat || []).map(m => '• ' + esc(m)).join('\n') || "• Parvarishni davom eting"}`;

    if (tavsiyalar.length > 0) {
      text += `\n\n🛍 <b>Sizga mos mahsulotlar:</b>`;
      tavsiyalar.forEach(p => { text += `\n• ${esc(p.nom)} — ${narxFmt(p.narx)}`; });
    }

    await tg('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{
          text: "🛒 Katalogda ko'rish",
          web_app: { url: `${WEBAPP_URL}/?start=tahlil` }
        }]]
      }
    });
    return;
  }

  await tg('sendMessage', { chat_id: chatId, text: "Iltimos, yuz tahlili uchun rasm yuboring. 📸" });
}

// ---------- Long-polling (busy-loop himoyasi bilan) ----------
async function startBot() {
  console.log('Bot long-polling rejimida ishga tushdi...');
  while (true) {
    try {
      const data = await tg('getUpdates', { offset: db.offset, timeout: 30, allowed_updates: ['message'] });
      if (data.ok && Array.isArray(data.result)) {
        for (const upd of data.result) {
          try { await handleUpdate(upd); }
          catch (e) { console.error('handleUpdate xatosi:', e.message); }
          // Offsetni HAR BIR xabardan keyin saqlaymiz (qayta ishlash oldini oladi)
          db.offset = upd.update_id + 1;
          saveDb();
        }
      } else if (!data.ok) {
        console.error('Telegram xatosi:', data.description || JSON.stringify(data));
        await sleep(5000); // busy-loop himoyasi
      }
    } catch (e) {
      console.error('Polling xatosi:', e.message);
      await sleep(5000); // tarmoq xatosida kutish
    }
  }
}

// ---------- HTTP Server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    // API: Mahsulotlar katalogi
    if (pathname === '/api/products') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(MAHSULOTLAR));
    }

    // API: Tahlil natijasi (initData HMAC bilan himoyalangan)
    if (pathname.startsWith('/api/analysis/')) {
      const initData = req.headers['x-tg-init-data'];
      if (!verifyInitData(initData)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ruxsat berilmadi' }));
      }
      const chatId = pathname.split('/').pop();
      if (!Object.hasOwn(db.analyses, chatId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Topilmadi' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(db.analyses[chatId]));
    }

    // Statik fayllar (Mini App)
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(WEBAPP_PATH, rel);

    // Path traversal himoyasi
    if (!filePath.startsWith(WEBAPP_PATH + path.sep)) {
      res.writeHead(403);
      return res.end('Taqiqlangan');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    res.writeHead(404);
    res.end('404 Topilmadi');
  } catch (e) {
    console.error('HTTP xatosi:', e.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('Server xatosi');
  }
});

server.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda. Mini App: ${WEBAPP_URL}`);
  if (TOKEN) startBot();
  else console.warn('BOT_TOKEN topilmadi — bot ishga tushmadi (faqat Mini App xizmat qiladi).');
});

process.on('uncaughtException', (err) => console.error('Kutilmagan xato:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
