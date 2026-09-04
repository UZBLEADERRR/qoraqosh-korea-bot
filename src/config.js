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
  geminiModel:   opt('GEMINI_MODEL', 'gemini-2.5-flash'),
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
};

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
