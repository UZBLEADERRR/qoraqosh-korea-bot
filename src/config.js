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

export const config = {
  botToken:      req('BOT_TOKEN'),
  webhookSecret: opt('WEBHOOK_SECRET', ''),

  supabaseUrl:   req('SUPABASE_URL'),
  supabaseKey:   req('SUPABASE_SERVICE_KEY'),

  geminiKey:     opt('GEMINI_API_KEY'),
  geminiModel:   opt('GEMINI_MODEL', 'gemini-2.5-flash'),

  adminLogin:    req('ADMIN_LOGIN'),
  adminPassword: req('ADMIN_PASSWORD'),
  adminSecret:   req('ADMIN_JWT_SECRET'),

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
