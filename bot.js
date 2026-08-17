// Telegram bot — GitHub Actions har 5 daqiqada ishga tushiradi.
// BOT_TOKEN repozitoriy Secrets'ida saqlanadi.
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('BOT_TOKEN yoʻq — repo Settings > Secrets ga qoʻshing');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

function loadState() {
  try {
    return JSON.parse(readFileSync('state.json', 'utf8'));
  } catch {
    return { offset: 0 };
  }
}

async function send(chatId, text) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

/** Bitta xabarga javob matnini tayyorlaydi. */
function reply(text) {
  const t = (text || '').trim().toLowerCase();
  if (t === '/start') return 'Salom! Men Daho Code yasagan botman. /yordam deb yozing.';
  if (t === '/yordam') return 'Buyruqlar:\n/start — boshlash\n/vaqt — hozirgi vaqt';
  if (t === '/vaqt') return 'Hozir: ' + new Date().toLocaleString('uz-UZ');
  return 'Tushunmadim. /yordam deb yozing.';
}

const state = loadState();
const res = await fetch(`${API}/getUpdates?offset=${state.offset}&timeout=0`);
const data = await res.json();

for (const update of data.result ?? []) {
  state.offset = update.update_id + 1;
  const message = update.message;
  if (!message?.chat?.id) continue;
  await send(message.chat.id, reply(message.text));
}

writeFileSync('state.json', JSON.stringify(state, null, 2));
console.log('Qayta ishlandi:', (data.result ?? []).length, 'ta yangilanish');
