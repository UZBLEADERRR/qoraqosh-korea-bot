// Markazlashgan sozlamalar. Muhim kalitlar yo'q bo'lsa server ishga tushmaydi —
// "default parol" bilan ochiq qolib ketishning oldini oladi.

const need = [];
function req(name) {
  const v = (process.env[name] || '').trim();
  if (!v) need.push(name);
  return v;
}
function opt(name, fallback = '') {
  return (process.env[name] || '').trim() || fallback;
}

/** Vergul, nuqta-vergul yoki yangi qator bilan ajratilgan kalitlar. */
function kalitlar(name) {
  return (process.env[name] || '')
    .split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
}

export const config = {
  botToken:      req('BOT_TOKEN'),
  // Sinovda soxta serverga yo'naltirish uchun; ishlab chiqarishda tegilmaydi
  telegramApi:   opt('TELEGRAM_API', 'https://api.telegram.org'),
  geminiApi:     opt('GEMINI_API', 'https://generativelanguage.googleapis.com/v1beta/models'),
  webhookSecret: opt('WEBHOOK_SECRET', ''),

  // Supabase -> Connect -> Session pooler ulanish satri
  databaseUrl:   req('DATABASE_URL'),
  dbCaCert:      opt('DATABASE_CA_CERT'),
  // Ulanish hovuzi. Supabase session pooler bir vaqtda cheklangan ulanish beradi,
  // shuning uchun ko'paytirishdan oldin Supabase limitini tekshiring.
  dbPoolMax:     Math.max(2, Number(opt('DB_POOL_MAX', '12')) || 12),
  // Osilib qolgan so'rov butun hovuzni band qilmasin
  dbSorovTimeout: Math.max(3000, Number(opt('DB_QUERY_TIMEOUT_MS', '15000')) || 15000),

  // AI kalitlari — BIR NECHTA bo'lishi mumkin, vergul yoki yangi qator
  // bilan ajratiladi. Har kalitning o'z kunlik kvotasi bor: uchta kalit
  // = uch barobar chegara. Biri tugasa yoki yiqilsa keyingisiga
  // o'tiladi, ya'ni bitta kalit tufayli butun ilova to'xtamaydi.
  geminiKeys:      kalitlar('GEMINI_API_KEY'),
  openrouterKeys:  kalitlar('OPENROUTER_API_KEY'),
  // Eskicha nom — kod bo'ylab bitta kalit kutilgan joylar uchun
  geminiKey:     kalitlar('GEMINI_API_KEY')[0] || '',
  openrouterKey: kalitlar('OPENROUTER_API_KEY')[0] || '',
  openrouterApi:   opt('OPENROUTER_API', 'https://openrouter.ai/api/v1'),
  openrouterModel: opt('OPENROUTER_MODEL', 'google/gemini-2.5-flash'),
  // Rasm chizish zaxirasi: Google kalitlari ishlamasa — shu model OpenRouter orqali
  openrouterImageModel: opt('OPENROUTER_IMAGE_MODEL', 'google/gemini-2.5-flash-image'),
  // Instagram (Instagram API with Instagram Login). Token panelda ham kiritiladi.
  instagramApi:    opt('INSTAGRAM_API', 'https://graph.instagram.com/v23.0'),
  instagramToken:  opt('INSTAGRAM_ACCESS_TOKEN', ''),
  instagramSecret: opt('INSTAGRAM_APP_SECRET', ''),
  instagramVerify: opt('INSTAGRAM_VERIFY_TOKEN', ''),
  // Matn/JSON modeli. Standart — eng yangi Flash.
  geminiModel:   opt('GEMINI_MODEL', 'gemini-3.8-flash'),
  // ZAXIRA MODELLAR. Har modelning O'Z kunlik kvotasi bor, shuning
  // uchun asosiysi tugaganda keyingisiga o'tish ilovani tirik saqlaydi
  // — bu kalit qo'shishdan ham tezroq yechim.
  // Tartib: yangidan eskiga. Muhitdan vergul bilan o'zgartirsa bo'ladi.
  geminiModellar: kalitlar('GEMINI_MODELLAR').length
    ? kalitlar('GEMINI_MODELLAR')
    : ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash',
       'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite',
       'gemini-3-flash-preview'],
  // Rasm chizish modeli (poster generatsiyasi)
  geminiImageModel: opt('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image'),

  adminLogin:    req('ADMIN_LOGIN'),
  adminPassword: req('ADMIN_PASSWORD'),
  adminSecret:   req('ADMIN_JWT_SECRET'),
  // Telegram orqali admin panelga kirish huquqi. Vergul bilan: "123456,7891011"
  adminTelegramIds: opt('ADMIN_TELEGRAM_IDS')
    .split(',').map((x) => x.trim()).filter(Boolean),

  publicUrl:     opt('PUBLIC_URL', process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''),
  port:          Number(opt('PORT', '3000')),

  deliveryFee:     Number(opt('DELIVERY_FEE', '25000')),
  freeDeliveryFrom: Number(opt('FREE_DELIVERY_FROM', '500000')),

  agreementVersion: '1.0',

  // ── Ilovaga kirish (Play Store) ──
  // Google bilan kirish: Google Cloud Console → APIs & Services →
  // Credentials → OAuth client ID (Web application). Bo'sh bo'lsa
  // Google tugmasi ko'rsatilmaydi.
  googleClientId: opt('GOOGLE_CLIENT_ID'),
  googleJwks:     opt('GOOGLE_JWKS', 'https://www.googleapis.com/oauth2/v3/certs'),
  // Supabase orqali Google (Gmail) bilan kirish — src/services/supabase-kirish.js.
  // Supabase → Project Settings → API: «Project URL» va «anon public» kalit.
  supabaseUrl:     opt('SUPABASE_URL').replace(/\/+$/, ''),
  supabaseAnonKey: opt('SUPABASE_ANON_KEY'),
  // SMS bilan kirish — Eskiz.uz. Ikkalasi ham bo'lsa SMS yoqiladi.
  eskizEmail:  opt('ESKIZ_EMAIL'),
  eskizParol:  opt('ESKIZ_PAROL'),
  eskizFrom:   opt('ESKIZ_FROM', '4546'),
  eskizApi:    opt('ESKIZ_API', 'https://notify.eskiz.uz/api'),
  // Google Play tekshiruvchisi uchun SINOV hisobi: shu raqamga SMS
  // yuborilmaydi, kod esa qotib turadi. Play Console → App access ga
  // aynan shu raqam va kod yoziladi. Bo'sh bo'lsa o'chiq.
  demoTelefon: opt('DEMO_TELEFON'),
  demoKod:     opt('DEMO_KOD'),
  // Android ilova paketi (Play Store'dagi identifikator). TWA imzo
  // barmoq izlari admin panelda yoki ANDROID_SHA256 da (vergul bilan).
  androidPaket:  opt('ANDROID_PAKET', 'shop.kiovo.app'),
  // Push bildirishnoma kaliti. Bo'sh — ADMIN_JWT_SECRET dan hisoblanadi
  // (src/services/push.js), ya'ni sozlash shart emas.
  vapidKalit:    opt('VAPID_KALIT'),
  // FAQAT sinov uchun: soxta push xizmatining xosti («127.0.0.1:4483»)
  pushSinovXost: opt('PUSH_SINOV_XOST'),
  // Doimiy yuklash kalitining (upload key) barmoq izi — OCHIQ ma'lumot,
  // maxfiy emas. Shu kalit bilan imzolangan APK/AAB saytni darrov tan
  // oladi. Play'dagi «App signing key» izi esa admin panelda qo'shiladi.
  androidSha256: opt('ANDROID_SHA256',
    '4C:9F:81:B6:F7:BF:5F:5F:5E:2F:91:60:07:7E:CF:93:F6:D1:04:6A:A3:04:46:AA:D4:A3:A5:3F:D8:B9:4D:25'),
};

// Saytning ASOSIY manzili — PUBLIC_URL ning o'zi (www.kiovo.shop).
// «www» siz kiovo.shop BOSHQA saytga olib boradi, shuning uchun www hech
// qachon olib tashlanmaydi. Android ilova, assetlinks, sitemap va mijozga
// yuboriladigan havolalar shu manzilda.
config.saytUrl = String(config.publicUrl || '').replace(/\/+$/, '')
  // PUBLIC_URL xato bilan www siz yozilgan bo'lsa ham havolalar to'g'ri
  .replace(/^(https?:\/\/)kiovo\.shop(?=[:/]|$)/i, '$1www.kiovo.shop');
/** Asosiy xost: «www.kiovo.shop». Mahalliyda bo'sh. */
config.asosiyXost = (() => { try { return new URL(config.saytUrl).host.toLowerCase(); } catch { return ''; } })();

if (need.length) {
  console.error('\n❌ Quyidagi muhit o\'zgaruvchilari yo\'q:\n   ' + need.join('\n   '));
  console.error('\n.env.example faylidan nusxa oling yoki Railway → Variables ga qo\'shing.\n');
  process.exit(1);
}

if (config.adminPassword.length < 8) {
  console.error('❌ ADMIN_PASSWORD kamida 8 belgi bo\'lishi kerak.');
  process.exit(1);
}
if (config.adminSecret.length < 24) {
  console.error('❌ ADMIN_JWT_SECRET kamida 24 belgi bo\'lishi kerak (openssl rand -hex 32).');
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(config.databaseUrl)) {
  console.error('❌ DATABASE_URL postgresql://... ko\'rinishida bo\'lishi kerak.');
  console.error('   Supabase → Connect → Session pooler bo\'limidan nusxa oling.');
  process.exit(1);
}
