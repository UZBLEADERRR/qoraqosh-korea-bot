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

console.log('\n── MARSHRUT (matn) ──');
{
  // Tahlillar — Google (3.8, yiqilsa 3.7); xabar yozish — OpenRouter'dagi yozuv modeli
  const { aiJson } = await import('../src/ai/index.js');
  const { jurnalHolati } = await import('../src/ai/jurnal.js');
  const sx = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };
  const kim = (q) => jurnalHolati().ishlatilgan.find((x) => x.qayerda === q);
  await aiJson([{ text: 'sinov' }], sx, { qayerda: 'sinov-tahlil' });
  test('tahlil — Google · gemini-3.8-flash', kim('sinov-tahlil')?.provayder === 'google'
    && kim('sinov-tahlil')?.model === 'gemini-3.8-flash', JSON.stringify(kim('sinov-tahlil')));
  await aiJson([{ text: 'sinov' }], sx, { qayerda: 'sinov-yozuv', yozuv: true });
  test('xabar yozish — OpenRouter · openai/gpt-5.6-luna', kim('sinov-yozuv')?.provayder === 'openrouter'
    && /gpt-5\.6-luna/.test(kim('sinov-yozuv')?.model || ''), JSON.stringify(kim('sinov-yozuv')));
  globalThis.AI_429_MODELLAR = ['gemini-3.8-flash'];
  await aiJson([{ text: 'sinov' }], sx, { qayerda: 'sinov-zaxira' });
  globalThis.AI_429_MODELLAR = [];
  test('3.8 tugasa — 3.7 javob beradi', kim('sinov-zaxira')?.model === 'gemini-3.7-flash', JSON.stringify(kim('sinov-zaxira')));
  // Ikkala Google modeli ham yiqilsa OpenRouter — lekin HECH QACHON 2.5 flash
  const { config } = await import('../src/config.js');
  const eski = config.openrouterModel;
  config.openrouterModel = 'google/gemini-2.5-flash';           // Railway'da qolib ketgan holat
  globalThis.AI_429_MODELLAR = ['gemini-3.8-flash', 'gemini-3.7-flash'];
  await aiJson([{ text: 'sinov' }], sx, { qayerda: 'sinov-oxirgi' });
  globalThis.AI_429_MODELLAR = [];
  config.openrouterModel = eski;
  test('oxirgi chora OpenRouter ham 2.5 emas — 3.8 Flash', kim('sinov-oxirgi')?.provayder === 'openrouter'
    && !/gemini-2/.test(kim('sinov-oxirgi')?.model || ''), JSON.stringify(kim('sinov-oxirgi')));
}

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
srv.close(); process.exit(xato ? 1 : 0);
