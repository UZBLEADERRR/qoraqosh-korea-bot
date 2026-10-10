// INSTAGRAM BOSHQARUVCHI: Direct (AI), yuz rasmi → to'liq natija + tavsiya + Telegram,
// komment qoidalari («+»), admin aralashuvi, AI yordamchi vositalari.
// Haqiqiy Meta o'rniga soxta server (test/soxta-server.mjs → /ig/...).
import crypto from 'node:crypto';
import { soxtaServer, yuborilgan } from './soxta-server.mjs';
const PORT = 4482; const srv = await soxtaServer(PORT);
Object.assign(process.env, {
  BOT_TOKEN: '111111:TEST', ADMIN_LOGIN: 'a', ADMIN_PASSWORD: 'parol12345', ADMIN_JWT_SECRET: 'x'.repeat(30),
  TELEGRAM_API: `http://127.0.0.1:${PORT}`, GEMINI_API: `http://127.0.0.1:${PORT}/models`, GEMINI_API_KEY: 'soxta',
  INSTAGRAM_API: `http://127.0.0.1:${PORT}/ig`, INSTAGRAM_APP_SECRET: 'meta-sir', PUBLIC_URL: 'https://www.kiovo.shop',
  ADMIN_TELEGRAM_IDS: '700001',
});
globalThis.IG_KECHIKISH_MS = 0;

const { migratsiyalarniQoll } = await import('../src/db/migrate.js');
await migratsiyalarniQoll();
const { sorov, qator, qatorlar, qiymat, pool, sozlamalarniUnut } = await import('../src/db.js');
const ig = await import('../src/services/instagram/index.js');
const igApi = await import('../src/services/instagram/api.js');
const { adminRoutes } = await import('../src/api/admin.js');
const { issueAdminToken } = await import('../src/lib/auth.js');
const { Readable } = await import('node:stream');

let ok = 0, xato = 0;
const test = (n, c, i = '') => { c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++) : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++); };
const adminToken = issueAdminToken({ rol: 'admin' });
const chaqir = (yol, usul = 'GET', tana) => new Promise((res) => {
  const bayt = Buffer.from(JSON.stringify(tana ?? {}));
  const req = Object.assign(new Readable({ read() { this.push(bayt); this.push(null); } }), {
    url: yol, method: usul, socket: { remoteAddress: '127.0.0.1' },
    headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json', 'content-length': String(bayt.length) } });
  const b = [];
  adminRoutes(req, { statusCode: 200, writeHead(k) { this.statusCode = k; return this; }, setHeader() {},
    end(x) { if (x) b.push(x); res({ kod: this.statusCode, tana: JSON.parse(Buffer.concat(b.map(Buffer.from)).toString() || '{}') }); } },
  yol.split('?')[0]).catch((e) => res({ kod: 500, tana: { error: e.message } }));
});
const yuborildi = () => globalThis.IG_YUBORILGAN || [];
const tozala = () => { globalThis.IG_YUBORILGAN = []; };
const AKK = '17841400000000001';
const dm = (igsid, mid, message) => ig.webhookKeldi({ object: 'instagram', entry: [{ id: AKK, time: Date.now(),
  messaging: [{ sender: { id: igsid }, recipient: { id: AKK }, timestamp: Date.now(), message: { mid, ...message } }] }] });
const komment = (id, text, from = { id: '700777', username: 'zarina_k' }, media = 'media1') => ig.webhookKeldi({ object: 'instagram',
  entry: [{ id: AKK, time: Date.now(), changes: [{ field: 'comments', value: { id, text, from, media: { id: media } } }] }] });

// Toza boshlash
await sorov(`delete from ig_xabarlar; delete from ig_suhbatlar; delete from ig_kommentlar`);
await sorov(`delete from settings where key in ('instagram', 'instagram_ulanish')`);
sozlamalarniUnut(); igApi.ulanishniUnut();

console.log('\n── ULANISH ──');
test('token yo‘q — tushunarli xato', await igApi.ig('/me').then(() => false, (e) => /ulanmagan/.test(e.message)));
const ul = await igApi.tokenniSaqla('IGAA' + 'x'.repeat(40));
test('panelda token saqlandi, akkaunt aniqlandi', ul.username === 'kiovo.uz' && ul.akkaunt_id === AKK, JSON.stringify(ul));
test('eskirgan token — aniq sabab', await igApi.ig('/me', { token: 'eskirgan' }).then(() => false, (e) => /eskirgan yoki noto/.test(e.message)));
const xom = Buffer.from('{"object":"instagram"}');
test('Meta imzosi to‘g‘ri — qabul', ig.imzoTogri(xom, 'sha256=' + crypto.createHmac('sha256', 'meta-sir').update(xom).digest('hex')));
test('soxta imzo — rad', !ig.imzoTogri(xom, 'sha256=' + 'a'.repeat(64)) && !ig.imzoTogri(xom, ''));
const vt = await ig.verifyToken();
test('verify token bir marta yasaladi va saqlanadi', /^[0-9a-f]{24}$/.test(vt) && vt === await ig.verifyToken());

console.log('\n── DIRECT: AI SUHBATDOSH ──');
tozala();
await dm('900200', 'mid-1', { text: 'Salom, akne uchun nima bor?' });
const javob1 = yuborildi().find((x) => x.recipient?.id === '900200' && x.message?.text);
test('AI javob yubordi', Boolean(javob1), javob1?.message?.text);
test('«yozmoqda…» belgisi', yuborildi().some((x) => x.sender_action === 'typing_on'));
const s1 = await qator(`select * from ig_suhbatlar where igsid = '900200'`);
test('suhbat va xabarlar yozildi', s1 && Number(await qiymat(`select count(*) from ig_xabarlar where suhbat_id = $1`, [s1.id])) === 2);
test('AI ga katalog va narx berildi', /KATALOG \(id\|nom\|narx/.test(globalThis.OXIRGI_IG_PROMPT || '') && /so'm/.test(globalThis.OXIRGI_IG_PROMPT));
test('AI ga halollik qoidasi: «bot misan» ga yolg‘on gapirmaydi', /yolg'on gapirma/.test(globalThis.OXIRGI_IG_PROMPT));
test('AI ga Direct havolasi (manba ig-direct)', /start=h_ig-direct/.test(globalThis.OXIRGI_IG_PROMPT));
await new Promise((r) => setTimeout(r, 200));
test('profil (username) olindi', (await qator(`select username from ig_suhbatlar where id = $1`, [s1.id])).username === 'madina_uz');

tozala();
await dm('900200', 'mid-1', { text: 'Salom, akne uchun nima bor?' });
test('takroriy webhook — ikkinchi javob yo‘q', !yuborildi().some((x) => x.message?.text));

// Admin o'zi yozdi — AI jim
const qy = await chaqir('/api/admin/ig/yubor', 'POST', { id: s1.id, matn: 'Assalomu alaykum, men menejer Dilnoza.' });
test('paneldan qo‘lda yuborish', qy.kod === 200 && yuborildi().some((x) => /menejer Dilnoza/.test(x.message?.text || '')));
tozala();
await dm('900200', 'mid-2', { text: 'Narxi qancha?' });
test('admin yozgandan keyin AI jim (pauza)', !yuborildi().some((x) => x.message?.text));
const ch = await chaqir('/api/admin/ig/suhbat', 'POST', { id: s1.id, pauza_olib: true });
test('pauzani olib tashlash', ch.kod === 200 && ch.tana.suhbat?.ai_pauza_gacha === null);
const aj = await chaqir('/api/admin/ig/ai-javob', 'POST', { id: s1.id });
test('«AI hozir javob yozsin» tugmasi', aj.kod === 200 && aj.tana.natija?.javob);

// Echo: admin Instagram ilovasidan yozdi
tozala();
await ig.webhookKeldi({ object: 'instagram', entry: [{ id: AKK, messaging: [{ sender: { id: AKK }, recipient: { id: '900300' },
  message: { mid: 'mid-echo-1', text: 'Telefondan yozdim', is_echo: true } }] }] });
const s3 = await qator(`select * from ig_suhbatlar where igsid = '900300'`);
test('Instagram ilovasidan yozilgani ham ko‘rinadi va AI jim', s3 && s3.ai_pauza_gacha
  && (await qator(`select kim from ig_xabarlar where mid = 'mid-echo-1'`)).kim === 'ilova');

// Echo: O'ZIMIZ yuborgan xabar API javobidan oldin qaytsa ham AI jim qolmasin
const oxirgiAi = await qiymat(`select matn from ig_xabarlar where suhbat_id = $1 and kim = 'ai' and matn is not null order by id desc limit 1`, [s1.id]);
await ig.webhookKeldi({ object: 'instagram', entry: [{ id: AKK, messaging: [{ sender: { id: AKK }, recipient: { id: '900200' },
  message: { mid: 'mid-echo-ai-oldin', text: oxirgiAi, is_echo: true } }] }] });
const s1e = await qator(`select ai_pauza_gacha from ig_suhbatlar where id = $1`, [s1.id]);
test('o‘z AI xabarimiz echo’si — AI jim qilinmaydi', oxirgiAi && s1e.ai_pauza_gacha === null
  && !(await qator(`select 1 from ig_xabarlar where mid = 'mid-echo-ai-oldin'`)));
await igApi.kommentgaDm('c_echo_1', 'Salom! Chegirma kodingiz: KIOVO10');
await ig.webhookKeldi({ object: 'instagram', entry: [{ id: AKK, messaging: [{ sender: { id: AKK }, recipient: { id: '900350' },
  message: { mid: 'mid-echo-komment', text: 'Salom! Chegirma kodingiz: KIOVO10', is_echo: true } }] }] });
const s35 = await qator(`select ai_pauza_gacha from ig_suhbatlar where igsid = '900350'`);
test('komment DM echo’si — keyin mijoz yozsa AI javob beradi', !s35 || s35.ai_pauza_gacha === null);
tozala();
await dm('900350', 'mid-k-javob', { text: 'Rahmat, qanday buyurtma qilaman?' });
test('komment DM dan keyin Direct’da AI javob berdi', yuborildi().some((x) => x.recipient?.id === '900350' && x.message?.text));

// AI ishlamasa — mijoz jim qolmaydi, menejer chaqiriladi
tozala(); yuborilgan.length = 0;
globalThis.IG_AI_XATO = true;
await dm('900360', 'mid-ai-xato', { text: 'Salom, centella bormi?' });
delete globalThis.IG_AI_XATO;
const s36 = await qator(`select * from ig_suhbatlar where igsid = '900360'`);
test('AI yiqildi — mijozga «menejer javob beradi»', yuborildi().some((x) => x.recipient?.id === '900360' && /menejerimiz/.test(x.message?.text || '')));
test('AI yiqildi — menejer kerak + adminga Telegram', s36.admin_kerak === true && yuborilgan.some((x) => /AI .*javob bera olmadi/.test(x.text || '')));

// Menejer kerak
tozala(); yuborilgan.length = 0;
globalThis.IG_AI_JAVOB = { ig_javob: 'Tushunaman, hozir menejerimiz yozadi 🙏', niyat: 'shikoyat', admin_kerak: true };
await dm('900400', 'mid-3', { text: 'Buyurtmam 2 haftadan beri kelmadi!!!' });
delete globalThis.IG_AI_JAVOB;
test('shikoyat — menejer kerak belgisi', (await qator(`select admin_kerak from ig_suhbatlar where igsid = '900400'`)).admin_kerak === true);
test('adminga Telegramda xabar', yuborilgan.some((x) => /Instagram/.test(x.text || '') && /menejer kerak/.test(x.text || '')));

// 24 soatlik oyna
globalThis.IG_OYNA_YOPIQ = true;
const yop = await ig.qoldaYubor(s1.id, 'Salom');
globalThis.IG_OYNA_YOPIQ = false;
test('24 soat oynasi yopiq — tushunarli sabab', /24 soatdan beri yozmagan/.test(yop.xato || ''), yop.xato);

console.log('\n── YUZ RASMI → TO‘LIQ NATIJA + TAVSIYA + TELEGRAM ──');
tozala();
const RASMCHI = `9005${Date.now() % 1e6}`;   // tahlil limiti bir kishiga kuniga 3 ta — har sinovda yangi odam
globalThis.IG_AI_JAVOB = { ig_javob: '', niyat: 'tahlil', admin_kerak: false };   // AI bo'sh qaytarsa — andoza ishlaydi
await dm(RASMCHI, `mid-rasm-${RASMCHI}`, { attachments: [{ type: 'image', payload: { url: `http://127.0.0.1:${PORT}/ig-cdn/yuz.png` } }] });
delete globalThis.IG_AI_JAVOB;
const ys = yuborildi();
test('rasm keldi — darhol odamcha javob', ys.some((x) => /kuting|Bir daqiqa|vaqt bering/.test(x.message?.text || '')));
const rasm = ys.find((x) => x.message?.attachment?.type === 'image');
test('to‘liq natija rasmi yuborildi', rasm && /^https:\/\/www\.kiovo\.shop\/media\/[0-9a-f-]{36}$/.test(rasm.message.attachment.payload.url),
  rasm?.message?.attachment?.payload?.url);
const rasmId = rasm?.message?.attachment?.payload?.url.split('/').pop();
const rasmTur = rasmId ? await qiymat(`select tur from media where id = $1`, [rasmId]) : null;
test('natija xira emas (ig_natija, ochiq nusxa)', rasmTur === 'ig_natija', rasmTur);
const serverKod = (await import('node:fs')).readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
test('natija rasmi Instagram uchun ochiq (himoyali turlar ro‘yxatida emas)', /m\.tur === 'chek' \|\| m\.tur === 'natija'\)/.test(serverKod) && rasmTur !== 'natija');
const s5 = await qator(`select * from ig_suhbatlar where igsid = $1`, [RASMCHI]);
const tgMatn = ys.map((x) => x.message?.text || '').find((t) => /start=n_/.test(t)) || '';
test('Telegramda tavsiyani ochadigan havola (n_token) oxirida', s5.tahlil_token && tgMatn.trim().endsWith(`start=n_${s5.tahlil_token}`), tgMatn.slice(-80));
const tavsiyaNomlari = (await qatorlar(`select coalesce(nom_uz, name) as nom from products where id = any($1)`, [[1, 21, 25]])).map((x) => x.nom);
test('xabarda tavsiya qilingan mahsulotlar va narx', tavsiyaNomlari.length && tavsiyaNomlari.some((n) => tgMatn.includes(n)) && /so'm/.test(tgMatn), tgMatn.slice(0, 200));
test('«yashirin / 🔒» yo‘q — natija to‘liq', !/🔒|yashirin/.test(tgMatn));
test('AI ga tahlil va tavsiya berildi', /TAVSIYA QILINGAN MAHSULOTLAR/.test(globalThis.OXIRGI_IG_PROMPT || '') && /T-zona uchun mos/.test(globalThis.OXIRGI_IG_PROMPT));
const mehmon = await qator(`select u.manba, h.kod from ochiq_skan o join users u on u.id = o.mehmon_id left join havolalar h on h.id = u.havola_id where o.token = $1`, [s5.tahlil_token]);
test('manba: Instagram Direct (botga o‘tsa sanaladi)', mehmon?.manba === 'instagram' && mehmon?.kod === 'ig-direct', JSON.stringify(mehmon));

// Tahlildan keyin odam savol beradi — AI uning natijasini biladi va buyurtmani o'rgatadi
tozala();
await dm(RASMCHI, `mid-rasm-sav-${RASMCHI}`, { text: 'Qanday buyurtma qilaman?' });
const pr = globalThis.OXIRGI_IG_PROMPT || '';
test('suhbatda AI tahlilni biladi (muammolar + tavsiyalar)', /UNING YUZ TAHLILI/.test(pr) && /Tavsiya qilingan mahsulotlar/.test(pr) && /Dog‘lardan himoya/.test(pr));
test('AI buyurtma qadamlari va to‘lovni biladi', /Buyurtma qadamlari/.test(pr) && /kartaga o'tkazma/.test(pr) && /Savatga/.test(pr));
test('AI ilova bo‘limlarini biladi', /«Skaner»/.test(pr) && /«Maslahat»/.test(pr) && /kiovo\.shop\/app\//.test(pr));
test('AI konsultatsiya beradi', /KONSULTATSIYA/.test(pr));
test('uslub qoidalari doim (anti-slop)', /HAQIQIY ODAMDEK/.test(pr) && /Ajoyib savol/.test(pr));
test('tavsiyani ochish havolasi AI da', s5.tahlil_token && pr.includes(`start=n_${s5.tahlil_token}`));

// Eski «xira» rejim — sozlamada yoqilsa
await ig.sozlamaniSaqla({ xira: true });
tozala();
const XIRACHI = `9006${Date.now() % 1e6}`;
await dm(XIRACHI, `mid-xira-${XIRACHI}`, { attachments: [{ type: 'image', payload: { url: `http://127.0.0.1:${PORT}/ig-cdn/yuz.png` } }] });
const xRasm = yuborildi().find((x) => x.message?.attachment?.type === 'image');
const xTur = xRasm ? await qiymat(`select tur from media where id = $1`, [xRasm.message.attachment.payload.url.split('/').pop()]) : null;
test('xira=true — eski xira rejim ishlaydi', xTur === 'ig_xira', xTur);
await ig.sozlamaniSaqla({ xira: false });

console.log('\n── ODAMDEK USLUB (AI SLOP TOZALASH) ──');
const { slopTozala, tahlilAndozasi } = await import('../src/ai/instagram-suhbat.js');
test('«Albatta! Ajoyib savol!» olib tashlanadi', slopTozala('Albatta! Ajoyib savol! Niatsinamid dog‘ga yaxshi.') === 'Niatsinamid dog‘ga yaxshi.');
test('markdown yulduzchalar olib tashlanadi', slopTozala('**COSRX** krem — 185 000 so‘m') === 'COSRX krem — 185 000 so‘m');
test('emoji ko‘pi bilan bitta', [...slopTozala('Zo‘r tanlov ✨🌟😊').matchAll(/\p{Extended_Pictographic}/gu)].length === 1);
test('«yana savollaringiz bo‘lsa…» dumi kesiladi', slopTozala('Kremni kechqurun surting. Yana savollaringiz bo‘lsa, bemalol yozing!') === 'Kremni kechqurun surting.');
test('rus tilida ham: «Отличный вопрос!»', slopTozala('Отличный вопрос! Подойдёт крем с центеллой.') === 'Подойдёт крем с центеллой.');
const and = tahlilAndozasi({ tahlil: { muammolar: [{ nom: 'Dog‘lar' }] }, tavsiya: [{ nom: 'Krem', brend: 'COSRX', narx: 185000, sabab: 'Namlaydi.' }] });
test('andoza: muammo + mahsulot + narx', /dog‘lar/.test(and) && /COSRX Krem — 185 000 so'm/.test(and) && /Telegramda ochiladi/.test(and), and);

console.log('\n── KOMMENTLAR VA QOIDALAR ──');
const qoidalar = await ig.qoidalar();
test('tayyor qoidalar: «+» va narx', qoidalar.some((q) => q.kalitlar.includes('+') && q.aniq) && qoidalar.some((q) => q.dm_ai));
test('«+» aniq mos keladi', ig.qoidaTop(qoidalar, ' + ', 'media1')?.kalitlar.includes('+'));
test('«+» so‘z ichida — aniq qoida emas', ig.qoidaTop(qoidalar.filter((q) => q.aniq), 'zo‘r +1 do‘st', 'media1') === null);
test('«narxi qancha» — narx qoidasi', ig.qoidaTop(qoidalar, 'Narxi qancha?', 'media1')?.dm_ai === true);

tozala();
await komment('c-plus-1', '+');
const ys2 = yuborildi();
const kdm = ys2.find((x) => x.recipient?.comment_id === 'c-plus-1');
test('«+» — Direct ga shaxsiy xabar (comment_id orqali)', kdm && /start=h_ig-komment/.test(kdm.message.text), kdm?.message?.text?.slice(0, 60));
test('{ism} o‘rniga username', /Salom zarina_k!/.test(kdm?.message?.text || ''));
const ochiqJavob = ys2.find((x) => /c-plus-1\/replies$/.test(x.yol));
test('ochiq javob @username bilan (variantlardan biri)', /^@zarina_k /.test(ochiqJavob?.message || '')
  && qoidalar.find((q) => q.kalitlar.includes('+')).javoblar.includes(ochiqJavob.message.replace('@zarina_k ', '')), ochiqJavob?.message);
const k1 = await qator(`select * from ig_kommentlar where id = 'c-plus-1'`);
test('komment belgilandi: qoida, Direct ketdi', k1.qoida_id && k1.dm_yuborildi && k1.javob);
test('Direct suhbati ochildi (mijoz javob yozsa AI davom etadi)', Number(await qiymat(
  `select count(*) from ig_xabarlar x join ig_suhbatlar s on s.id = x.suhbat_id where s.igsid = '900100' and x.kim = 'qoida'`)) === 1);

tozala();
globalThis.IG_AI_JAVOB = { ig_javob: 'Centella ampula 227 000 so‘m. Teringizga mosligini bilish uchun yuz rasmingizni yuboring 🌿', niyat: 'narx', admin_kerak: false };
await komment('c-narx-1', 'Narxi qancha?', { id: '700778', username: 'aziza' });
delete globalThis.IG_AI_JAVOB;
test('«narx» — Direct ni AI yozdi', yuborildi().some((x) => x.recipient?.comment_id === 'c-narx-1' && /227 000/.test(x.message?.text || '')));

tozala();
await komment('c-oddiy-1', 'Zo‘r mahsulotlar!');
test('mos qoida yo‘q — hech narsa yuborilmaydi', !yuborildi().length);
await komment('c-ozim-1', 'Rahmat!', { id: AKK, username: 'kiovo.uz' });
test('o‘zimizning kommentimiz e’tiborsiz', !(await qator(`select 1 from ig_kommentlar where id = 'c-ozim-1'`)));
const ish = (await ig.qoidalar()).find((q) => q.kalitlar.includes('+'));
test('qoida necha marta ishlagani sanaldi', ish.ishladi >= 1);

const yashir = await chaqir('/api/admin/ig/komment', 'POST', { id: 'c-oddiy-1', amal: 'yashir' });
test('kommentni yashirish', yashir.kod === 200 && (await qator(`select yashirildi from ig_kommentlar where id = 'c-oddiy-1'`)).yashirildi);
const kjav = await chaqir('/api/admin/ig/komment', 'POST', { id: 'c-oddiy-1', amal: 'javob', matn: 'Rahmat! 💚' });
test('kommentga qo‘lda javob', kjav.kod === 200 && yuborildi().some((x) => x.message === 'Rahmat! 💚'));
const yq = await chaqir('/api/admin/ig/qoida', 'POST', { nom: 'Chegirma kodi', kalitlar: 'kod, chegirma', javoblar: 'Kodni Direct’ga yubordik 🎁',
  dm_matn: 'Salom{ism}! Kodingiz: KIOVO10' });
test('yangi qoida (paneldan)', yq.kod === 200 && yq.tana.qoida?.kalitlar?.join() === 'kod,chegirma');
test('kalitsiz qoida — rad', (await chaqir('/api/admin/ig/qoida', 'POST', { nom: 'Bo‘sh', javoblar: 'x' })).kod === 400);
await sorov(`delete from ig_qoidalar where nom = 'Chegirma kodi'`);

const sx = await chaqir('/api/admin/ig/sinxron', 'POST', {});
test('postlardan kommentlarni olib kelish (o‘zinikisiz)', sx.kod === 200 && sx.tana.yangi_komment === 1 && sx.tana.postlar.length === 1);

console.log('\n── ADMIN PANEL VA AI YORDAMCHI ──');
const h = await chaqir('/api/admin/ig/holat');
test('holat: ulangan, webhook manzili, statistika', h.kod === 200 && h.tana.ulangan && h.tana.webhook_url === 'https://www.kiovo.shop/instagram/webhook'
  && h.tana.bugun.kiruvchi >= 3 && h.tana.standart_korsatma.length > 200);
const sl = await chaqir('/api/admin/ig/suhbatlar?filtr=admin');
test('«menejer kerak» filtri', sl.kod === 200 && sl.tana.suhbatlar.some((x) => x.igsid === '900400') && sl.tana.suhbatlar.every((x) => x.admin_kerak));
const sx2 = await chaqir(`/api/admin/ig/suhbat?id=${s1.id}`);
test('suhbat xabarlari + o‘qildi', sx2.kod === 200 && sx2.tana.xabarlar.length >= 4
  && (await qator(`select oqilmagan from ig_suhbatlar where id = $1`, [s1.id])).oqilmagan === 0);
const sv = await chaqir('/api/admin/ig/sinov', 'POST', { matn: 'Yetkazib berasizmi?', korsatma: 'Faqat rus tilida javob ber.' });
test('sinov: yubormasdan AI javobi', sv.kod === 200 && sv.tana.javob && /Faqat rus tilida/.test(globalThis.OXIRGI_IG_PROMPT));
const sz = await chaqir('/api/admin/ig/sozlama', 'POST', { ai_yoqiq: false, korsatma: 'Qisqa yoz.', boshqa: 'x' });
test('sozlama saqlandi (notanish maydon tashlandi)', sz.kod === 200 && sz.tana.sozlamalar.ai_yoqiq === false && !('boshqa' in sz.tana.sozlamalar));
tozala();
await dm('900600', 'mid-4', { text: 'Salom' });
test('AI umuman o‘chiq — javob yo‘q, xabar saqlanadi', !yuborildi().some((x) => x.message?.text)
  && Boolean(await qator(`select 1 from ig_xabarlar where mid = 'mid-4'`)));
await ig.sozlamaniSaqla({ ai_yoqiq: true, korsatma: '' });

const { VOSITALAR, yozishmi } = await import('../src/services/admin-vositalar.js');
const kerak = ['instagram_holat', 'instagram_sinov', 'instagram_sozla', 'instagram_qoida', 'instagram_qoida_ochir', 'instagram_suhbatlar', 'instagram_yubor', 'instagram_kommentlar'];
test('AI yordamchida Instagram vositalari', kerak.every((n) => VOSITALAR[n]), kerak.filter((n) => !VOSITALAR[n]).join());
test('o‘zgartiruvchilar tasdiq bilan', ['instagram_sozla', 'instagram_qoida', 'instagram_yubor', 'instagram_qoida_ochir'].every(yozishmi)
  && !yozishmi('instagram_holat') && !yozishmi('instagram_sinov'));
const fs = await import('node:fs');
const prompt = fs.readFileSync('src/ai/admin-agent.js', 'utf8');
test('AI yordamchiga Instagram o‘rgatilgan', /═══ INSTAGRAM BOSHQARUVCHI ═══/.test(prompt) && /instagram_sinov/.test(prompt));
const adm = fs.readFileSync('public/admin/admin.js', 'utf8');
test('panel: Instagram bo‘limi (Direct, Kommentlar, Qoidalar, Sozlamalar)', /instagram: \{ nom: 'Instagram'/.test(adm)
  && /function igDirect/.test(adm) && /function igKommentlar/.test(adm) && /function igQoidalar/.test(adm) && /function igSozlama/.test(adm));
const srvKod = fs.readFileSync('src/server.js', 'utf8');
test('server: webhook (GET tasdiq + POST imzo bilan)', /\/instagram\/webhook/.test(srvKod) && /imzoTogri\(xom/.test(srvKod) && /hub\.challenge/.test(srvKod));

console.log('\n── TEKSHIRUV (javob yo‘q bo‘lsa sabab) ──');
const SIR2 = 'ab'.repeat(16);
test('panel: noto‘g‘ri sir rad etiladi', Boolean((await chaqir('/api/admin/ig/sir', 'POST', { sir: 'qisqa' })).tana.error));
test('panel: App secret saqlandi', (await chaqir('/api/admin/ig/sir', 'POST', { sir: SIR2 })).kod === 200);
const xom2 = Buffer.from('{"object":"instagram","entry":[]}');
const imzo = (sir) => 'sha256=' + crypto.createHmac('sha256', sir).update(xom2).digest('hex');
test('imzo: paneldagi sir ham, env dagi ham qabul qilinadi', ig.imzoTogri(xom2, imzo(SIR2)) && ig.imzoTogri(xom2, imzo('meta-sir')));
const diagM = await import('../src/services/instagram/diag.js');
await diagM.belgila('imzo_xato', 'imzo mos kelmadi');
let tk = await chaqir('/api/admin/ig/tekshir');
const qt = (nom) => tk.tana.qatorlar?.find((x) => x.nom.startsWith(nom));
test('tekshiruv: token va webhook obunasi ok', tk.kod === 200 && qt('Token')?.holat === 'ok' && qt('Webhook obunasi')?.holat === 'ok', JSON.stringify(tk.tana.qatorlar?.map((x) => x.nom + ':' + x.holat)));
test('tekshiruv: imzo xatosi ko‘rsatiladi va yechim yozilgan', qt('Imzo')?.holat === 'xato' && /Instagram app secret/.test(qt('Imzo').izoh));
test('tekshiruv: webhooklar kelgani ko‘rinadi', qt('Meta')?.holat === 'ok');
test('tekshiruv: AI xatosi ko‘rinadi', tk.tana.diag.ai_xato_soni >= 1, JSON.stringify(tk.tana.diag));
await ig.webhookKeldi({ object: 'instagram', entry: [] });
globalThis.IG_OBUNA = [];
tk = await chaqir('/api/admin/ig/tekshir');
delete globalThis.IG_OBUNA;
test('tekshiruv: messages obunasi yo‘q — xato va yechim', qt('Webhook obunasi')?.holat === 'xato' && /ulash/.test(qt('Webhook obunasi').izoh));
test('tekshiruv: imzo yangi webhookdan keyin ok', qt('Imzo')?.holat === 'ok');
await sorov(`update ig_suhbatlar set ai_pauza_gacha = now() + interval '1 hour' where igsid = '900200'`);
const po = await chaqir('/api/admin/ig/pauza-och', 'POST', {});
test('jim suhbatlarni ochish', po.kod === 200 && po.tana.ochildi >= 1);
test('AI yordamchida instagram_tekshir va instagram_pauza_och', VOSITALAR.instagram_tekshir?.oqish === true && VOSITALAR.instagram_pauza_och?.oqish === false);
await chaqir('/api/admin/ig/sir', 'POST', { sir: '' });

const { xiraNatija } = await import('../src/rasm/xira.js');
const sinovPng = await (await fetch(`http://127.0.0.1:${PORT}/ig-cdn/yuz.png`)).arrayBuffer();
const xr = await xiraNatija(Buffer.from(sinovPng), { soni: 2 });
test('xira natija PNG chiziladi', xr.length > 1000 && xr.readUInt32BE(0) === 0x89504e47);

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
await pool.end(); srv.close(); process.exit(xato ? 1 : 0);
