// QoraQosh — Telegram bot + Mini App serveri (Railway uchun, bitta Node.js jarayon).
// - Telegram long-polling (bot qismi)
// - Gemini API bilan yuz rasmini tahlil qilish
// - Mini App uchun static fayllar va JSON API
// - Fayl-baza: data/db.json (offset + tahlil natijalari)
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAHSULOTLAR, KATEGORIYALAR, mahsulotTop } from './data/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TG = `https://api.telegram.org/bot${TOKEN}`;
const WEBAPP_PATH = path.join(__dirname, 'webapp');
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// ==================== FAYL-BAZA ====================
function loadDb() {
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { offset: 0, analyses: {} };
  }
}
function saveDb(db) {
  try {
    if (!existsSync(path.dirname(DB_PATH))) mkdirSync(path.dirname(DB_PATH), { recursive: true });
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB saqlash xatosi:', e.message);
  }
}
const db = loadDb();

// ==================== TELEGRAM API ====================
async function tg(method, body) {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.error(`TG ${method} xato:`, data.description);
  return data;
}
const sendText = (chat_id, text, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });
const sendAction = (chat_id, action) => tg('sendChatAction', { chat_id, action });

// Rasmni Telegram serveridan yuklab oladi → base64
async function downloadPhoto(fileId) {
  const meta = await tg('getFile', { file_id: fileId });
  const filePath = meta.result?.file_path;
  if (!filePath) throw new Error('file_path topilmadi');
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), mime: 'image/jpeg' };
}

// ==================== GEMINI AI TAHLIL ====================
const AI_PROMPT = `Sen professional dermatolog-kosmetologsan. Rasmdagi inson yuzini tahlil qil.
Faqat quyidagi JSON formatda javob ber (boshqa hech narsa yozma):
{
  "yosh": "taxminiy yosh oralig'i, masalan: 25-30",
  "teri_turi": "bittasi: Normal | Quruq | Yog'li | Aralash | Sezgir",
  "muammolar": ["yuzdagi muammolar, 3-5 ta, o'zbekcha qisqa"],
  "teg": ["quyidagi kalitlardan moslarini tanla: quruq, yogli, sezgir, husnbuzar, dog, ajin, quyuq, namlash, tozalash, quyosh, yallig, ton"],
  "maslahat": ["parvarish bo'yicha 3 ta qisqa maslahat, o'zbekcha"]
}`;

async function geminiAnaliz(base64, mime) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: AI_PROMPT }, { inline_data: { mime_type: mime, data: base64 } }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(data.error?.message || 'Gemini javob bermadi');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// AI ishlamasa (kalit yo'q/xato) — namunaviy tahlil, bot to'xtab qolmasligi uchun.
function fallbackAnaliz() {
  return {
    yosh: '22-28',
    teri_turi: 'Aralash',
    muammolar: ['T-hududda yogʻlanish', 'Yengil qizarish', 'Nem yetishmovchiligi'],
    teg: ['namlash', 'tozalash', 'sezgir'],
    maslahat: [
      'Kuniga 2 marta yumshoq vosita bilan yuving',
      'SPF50+ niqobni har kuni ertalab surting',
      'Haftasiga 2 marta namlash niqobini ishlating',
    ],
    namunaviy: true,
  };
}

// Teglar bo'yicha katalogdan eng mos 5 ta mahsulotni tanlaydi.
function tavsiyaTanla(teglar) {
  const ball = (m) => m.teg.reduce((s, t) => s + (teglar.includes(t) ? 1 : 0), 0);
  return [...MAHSULOTLAR]
    .map((m) => ({ m, b: ball(m) }))
    .sort((a, b) => b.b - a.b)
    .slice(0, 5)
    .map((x) => x.m);
}

function narxFmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
}

// Tahlil natijasini Telegram xabar matniga aylantiradi.
function analizMatn(a, tavsiyalar) {
  let t = `🔍 <b>QoraQosh — Yuz tahlili</b>\n\n`;
  t += `👤 <b>Taxminiy yosh:</b> ${a.yosh}\n`;
  t += `🧬 <b>Teri turi:</b> ${a.teri_turi}\n\n`;
  t += `⚠️ <b>Yuzdagi muammolar:</b>\n` + a.muammolar.map((m) => `  • ${m}`).join('\n') + '\n\n';
  t += `💡 <b>Maslahatlar:</b>\n` + a.maslahat.map((m) => `  • ${m}`).join('\n') + '\n\n';
  t += `🛍️ <b>Sizga tavsiya mahsulotlar:</b>\n`;
  t += tavsiyalar.map((m, i) => `${i + 1}. ${m.emoji} ${m.nom} — <b>${narxFmt(m.narx)}</b>`).join('\n');
  t += `\n\n👇 Tugmani bosing — mini doʻkon ochiladi, tavsiyalar savatga qoʻshilgan boʻladi.`;
  return t;
}

// ==================== BOT LOGIKA ====================
async function rasmniTahlilQil(msg) {
  const chatId = msg.chat.id;
  await sendAction(chatId, 'typing');
  const photo = msg.photo[msg.photo.length - 1];
  let analiz;
  try {
    if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY yoʻq');
    const img = await downloadPhoto(photo.file_id);
    analiz = await geminiAnaliz(img.base64, img.mime);
  } catch (e) {
    console.error('Tahlil xatosi:', e.message);
    analiz = fallbackAnaliz();
  }
  const tavsiyalar = tavsiyaTanla(analiz.teg || []);
  // Natijani bazaga saqlaymiz — Mini App profil bo'limi uchun.
  db.analyses[chatId] = {
    ...analiz,
    tavsiya: tavsiyalar.map((m) => m.id),
    sana: new Date().toISOString(),
  };
  saveDb(db);

  const webappUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || process.env.DOMAIN || `localhost:${PORT}`}/?u=${chatId}`;
  await sendText(chatId, analizMatn(analiz, tavsiyalar), {
    reply_markup: {
      inline_keyboard: [[{ text: '🛍️ Doʻkonni ochish — savat tayyor', web_app: { url: webappUrl } }]],
    },
  });
}

async function handleUpdate(u) {
  const msg = u.message;
  if (!msg?.chat?.id) return;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (msg.photo?.length) return rasmniTahlilQil(msg);

  if (text === '/start') {
    await sendText(
      chatId,
      `🖤 <b>QoraQosh</b>ga xush kelibsiz!\n\n` +
        `Koreya original kosmetikasi — arzon narxda, yetkazish <b>7-14 kun</b>.\n\n` +
        `📸 <b>Yuz tahlili uchun rasmingizni yuboring</b> — AI teringizni tahlil qilib, sizga mos mahsulotlarni tavsiya qiladi.`
    );
    // Shaxsiy chatda menyu tugmasini Mini Appga sozlaymiz.
    if (msg.chat.type === 'private') {
      const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${PORT}`}/?u=${chatId}`;
      await tg('setChatMenuButton', {
        chat_id: chatId,
        menu_button: { type: 'web_app', text: '🛍️ Doʻkon', web_app: { url } },
      }).catch(() => {});
    }
    return;
  }

  if (text === '/yordam') {
    return sendText(
      chatId,
      `📌 <b>Buyruqlar:</b>\n/start — boshlash\n/katalog — doʻkonni ochish\n\n📸 Yuz rasmingizni yuborsangiz — AI tahlil qiladi.`
    );
  }

  if (text === '/katalog') {
    const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || `localhost:${PORT}`}/?u=${chatId}`;
    return sendText(chatId, `🛍️ QoraQosh doʻkoni:`, {
      reply_markup: { inline_keyboard: [[{ text: '🛍️ Katalogni ochish', web_app: { url } }]] },
    });
  }

  await sendText(chatId, `Tushunmadim 🙈 Yuz rasmingizni yuboring yoki /yordam deb yozing.`);
}

async function pollingLoop() {
  console.log('Bot long-polling boshlandi');
  while (true) {
    try {
      const res = await fetch(`${TG}/getUpdates?offset=${db.offset}&timeout=30&allowed_updates=["message"]`);
      const data = await res.json();
      for (const u of data.result ?? []) {
        db.offset = u.update_id + 1;
        saveDb(db);
        await handleUpdate(u).catch((e) => console.error('handleUpdate:', e.message));
      }
    } catch (e) {
      console.error('Polling xato:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ==================== HTTP SERVER (Mini App + API) ====================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function serveStatic(res, urlPath) {
  const p = urlPath === '/' ? '/index.html' : urlPath;
  const full = path.normalize(path.join(WEBAPP_PATH, p));
  if (!full.startsWith(WEBAPP_PATH) || !existsSync(full)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Topilmadi');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  res.end(readFileSync(full));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/health') return json(res, { ok: true, bot: !!TOKEN, ai: !!GEMINI_KEY });
  if (p === '/api/products') return json(res, { kategoriya: KATEGORIYALAR, mahsulotlar: MAHSULOTLAR });
  if (p.startsWith('/api/analysis/')) {
    const id = p.split('/').pop();
    return json(res, db.analyses[id] || null);
  }
  return serveStatic(res, p);
});

server.listen(PORT, () => {
  console.log(`QoraQosh serveri ${PORT}-portda ishlayapti`);
  if (TOKEN) pollingLoop();
  else console.error('BOT_TOKEN yoʻq — bot ishlamaydi (Railway Variables ga qoʻshing)');
});
