// AI maslahatchi: /api/maslahat yo'lini haqiqiy marshrutlash bilan sinaydi.
// Soxta AI qasddan katalogda YO'Q id (999) ni ham qaytaradi — u tashlanishi kerak,
// aks holda ilovada bosib bo'lmaydigan mahsulot ko'rinadi.
//
//   DATABASE_URL=postgresql://... node test/maslahat.mjs
import crypto from 'node:crypto';
import { soxtaServer, aiHisobi } from './soxta-server.mjs';

const PORT = 4481;
const srv = await soxtaServer(PORT);

process.env.BOT_TOKEN        = '111111:TEST';
process.env.ADMIN_LOGIN      = 'a';
process.env.ADMIN_PASSWORD   = 'parol12345';
process.env.ADMIN_JWT_SECRET = 'x'.repeat(30);
process.env.TELEGRAM_API     = `http://127.0.0.1:${PORT}`;
process.env.GEMINI_API       = `http://127.0.0.1:${PORT}/models`;
process.env.GEMINI_API_KEY   = 'soxta';
process.env.PUBLIC_URL       = 'https://sinov.example';
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL kerak.'); process.exit(1); }

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, pool } = await import('../src/db.js');
const { apiRoutes } = await import('../src/api/routes.js');
const { Readable } = await import('node:stream');

let ok = 0, xato = 0;
const test = (n, c, i = '') => { c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++)
                                   : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++); };

// --- Haqiqiy initData imzosi (auth.js ni chetlab o'tmaymiz) ---
function initData(id) {
  const p = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id, first_name: 'Sinov' }),
  });
  const tekshir = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const sir = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', sir).update(tekshir).digest('hex'));
  return p.toString();
}

const chaqir = (yol, usul, tana, imzo) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul,
    headers: { 'content-type': 'application/json', 'content-length': String(bayt.length),
               ...(imzo === null ? {} : { 'x-init-data': imzo ?? initData(910001) }) },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const bolaklar = [];
  const javob = {
    statusCode: 200, headersSent: false,
    writeHead(k) { this.statusCode = k; return this; },
    setHeader() {},
    end(x) { if (x) bolaklar.push(x); res({ kod: this.statusCode,
      tana: JSON.parse(Buffer.concat(bolaklar.map(Buffer.from)).toString() || '{}') }); },
  };
  apiRoutes(req, javob, yol).catch((e) => res({ kod: 500, tana: { error: e.message } }));
});

console.log('\n== AI MASLAHATCHI ==');

// Katalogda kamida bitta faol mahsulot bo'lsin (soxta AI id=1 ni tavsiya qiladi)
const bor = await qator(`select id from products where is_active and id = 1`);
if (!bor) {
  await sorov(`insert into products (id, name, brand, price, stock, is_active, step)
    values (1,'Sinov Hydro Serum','KiOVO',89000,10,true,'davolash')
    on conflict (id) do update set is_active = true, stock = 10`);
}

const oldin = aiHisobi.jami;
const r = await chaqir('/api/maslahat', 'POST', { savol: 'Yuzim juda quruq, nima yordam beradi?' });
test('javob 200 keldi', r.kod === 200, `kod=${r.kod} ${r.tana.error || ''}`);
test('AI chaqirildi', aiHisobi.jami > oldin);
test('matnli javob bor', typeof r.tana.javob === 'string' && r.tana.javob.length > 10);
test('turi to‘g‘ri', r.tana.turi === 'tavsiya', r.tana.turi);
test('yo‘q mahsulot (id=999) tashlandi',
  (r.tana.tavsiya || []).every((t) => t.product_id !== 999),
  (r.tana.tavsiya || []).map((t) => t.product_id).join(', '));
test('tavsiyaga to‘liq kartochka qo‘shildi',
  Boolean(r.tana.tavsiya?.[0]?.mahsulot?.name && r.tana.tavsiya[0].mahsulot.price > 0),
  r.tana.tavsiya?.[0]?.mahsulot?.name || '—');
test('sabab bor', Boolean(r.tana.tavsiya?.[0]?.sabab));
test('keyingi savol takliflari bor', (r.tana.takliflar || []).length >= 1,
  (r.tana.takliflar || []).join(' / '));

const bosh = await chaqir('/api/maslahat', 'POST', { savol: 'a' });
test('bo‘sh savol rad etildi', bosh.kod === 400, `kod=${bosh.kod}`);

const imzosiz = await chaqir('/api/maslahat', 'POST', { savol: 'salom' }, null);
test('imzosiz so‘rov rad etildi', imzosiz.kod === 401, `kod=${imzosiz.kod}`);

// Cheklov: 10 daqiqada 12 ta. 13-si to'xtatilishi kerak.
let oxirgiKod = 200;
for (let i = 0; i < 13 && oxirgiKod === 200; i++) {
  oxirgiKod = (await chaqir('/api/maslahat', 'POST', { savol: 'yana bir savol' })).kod;
}
test('cheklov ishlaydi (12 tadan keyin 429)', oxirgiKod === 429, `kod=${oxirgiKod}`);

console.log(`\n${xato ? '✗' : '✓'} ${ok} o‘tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close();
process.exit(xato ? 1 : 0);
