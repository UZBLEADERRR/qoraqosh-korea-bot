// AI ZAXIRASI: bitta Gemini kalitida kredit tugasa (402) boshqa kalitga,
// hammasi ishlamasa OpenRouter'ga o'tiladi — poster chizish to'xtamasin.
import { soxtaServer } from './soxta-server.mjs';
const PORT = 4481; const srv = await soxtaServer(PORT);
Object.assign(process.env, {
  BOT_TOKEN: '111111:TEST', ADMIN_LOGIN: 'a', ADMIN_PASSWORD: 'parol12345', ADMIN_JWT_SECRET: 'x'.repeat(30),
  TELEGRAM_API: `http://127.0.0.1:${PORT}`, GEMINI_API: `http://127.0.0.1:${PORT}/models`,
  OPENROUTER_API: `http://127.0.0.1:${PORT}`,
  GEMINI_API_KEY: 'g1,g2,g3', OPENROUTER_API_KEY: 'or1',
});
const { aiRasm, kalitHolati } = await import('../src/ai/index.js');
const { sabab } = await import('../src/ai/kalitlar.js');
const { xatoniTushuntir } = await import('../src/lib/xatolar.js');

let ok = 0, xato = 0;
const test = (n, c, i = '') => { c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++) : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++); };
const parts = [{ text: 'poster' }, { inline_data: { mime_type: 'image/png', data: 'AAAA' } }];

console.log('\n── AI ZAXIRASI (rasm) ──');
test('402 «kredit tugadi» — alohida sabab', sabab(new Error('Google HTTP 402: Your prepayment credits are depleted')) === 'pul');

globalThis.AI_RASM_402_KALITLAR = ['g1']; globalThis.RASM_KALITLAR = [];
const r1 = await aiRasm(parts, { nisbat: '1:1' });
test('1-kalitda kredit tugagan — 2-kalit bilan chizildi', Boolean(r1.base64) && globalThis.RASM_KALITLAR.join() === 'g1,g2',
  globalThis.RASM_KALITLAR.join());
test('OpenRouter kerak bo‘lmadi', !globalThis.OR_RASM);
const h = kalitHolati().google.find((x) => x.nom === '…g1'.slice(-5));
test('kreditsiz kalit dam olishga qo‘yildi', h && h.tayyor === false && h.dam_qoldi > 600, JSON.stringify(h));

globalThis.RASM_KALITLAR = [];
await aiRasm(parts, { nisbat: '1:1' });
test('keyingi chaqiruvda kreditsiz kalitga urilmaydi', !globalThis.RASM_KALITLAR.includes('g1'), globalThis.RASM_KALITLAR.join());

globalThis.AI_RASM_402_KALITLAR = ['g1', 'g2', 'g3']; globalThis.RASM_KALITLAR = [];
const r2 = await aiRasm(parts, { nisbat: '1:1' });
test('hamma Google kalitida kredit yo‘q — OpenRouter chizdi', Boolean(r2.base64) && globalThis.OR_RASM === 1 && r2.mime === 'image/png');
test('OpenRouter ga rasm rejimi va nisbat yuborildi', globalThis.OR_RASM_SOROV?.modalities?.includes('image')
  && globalThis.OR_RASM_SOROV?.image_config?.aspect_ratio === '1:1'
  && /gemini.*image/.test(globalThis.OR_RASM_SOROV?.model || ''), globalThis.OR_RASM_SOROV?.model);
test('mahsulot rasmi OpenRouter ga ham borgan', JSON.stringify(globalThis.OR_RASM_SOROV?.messages || []).includes('data:image/png;base64,AAAA'));

globalThis.OR_RASM_402 = true;
let e3 = null;
try { await aiRasm(parts, { nisbat: '1:1' }); } catch (e) { e3 = e; }
test('ikkalasi ham kreditsiz — tushunarli sabab', e3 && e3.turkum === 'hisob' && /Google:/.test(e3.message), e3?.message?.slice(0, 120));
test('«kutilmagan xatolik» emas', !/Kutilmagan/.test(xatoniTushuntir(e3).matn) || e3.turkum === 'hisob');

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
srv.close(); process.exit(xato ? 1 : 0);
