# QoraQosh — Koreya Kosmetikasi Bot + Mini App

Koreyadan original kosmetika mahsulotlari brendi uchun Telegram bot va Mini App.

## ✨ Imkoniyatlar
- **AI Yuz Tahlili**: Foydalanuvchi yuborgan rasm Gemini AI orqali tahlil qilinadi (yosh, teri turi, muammolar).
- **Aqlli Tavsiyalar**: Tahlil natijasiga ko'ra katalogdan mos 3-5 ta mahsulot tavsiya qilinadi.
- **Mini App Marketplace**: To'liq katalog, kategoriyalar, qidiruv va mahsulot tafsilotlari (tarkib, hajm).
- **Avtomatik Savat**: Bot tavsiya qilgan mahsulotlar Mini App ochilganda savatga avtomatik qo'shiladi.
- **Buyurtma**: Savatdagi mahsulotlar ro'yxati to'g'ridan-to'g'ri menejer chatiga yuboriladi.

## 🛠 Texnologiyalar
- **Backend**: Node.js (http server, long-polling bot)
- **Frontend**: HTML5, CSS3, Vanilla JS (Telegram WebApp SDK)
- **AI**: Google Gemini 1.5 Flash
- **Baza**: Fayl-baza (`data/db.json`)

## 🚀 O'rnatish

### 1. Muhit o'zgaruvchilari (Environment Variables)
Loyihani ishga tushirish uchun quyidagi kalitlar kerak:
- `BOT_TOKEN`: @BotFather orqali olingan bot tokeni.
- `GEMINI_API_KEY`: Google AI Studio'dan olingan API kalit.
- `GEMINI_MODEL`: (Ixtiyoriy) Gemini model nomi, standart: `gemini-1.5-flash`.
- `RAILWAY_PUBLIC_DOMAIN`: (Ixtiyoriy) Railway'da avtomatik beriladigan domen.

### 2. Mahalliy ishga tushirish
```bash
npm install
node server.js
```

### 3. Deploy (Railway)
Loyiha Railway uchun tayyorlangan. GitHub repozitoriyangizni ulasangiz kifoya.

## 📁 Loyiha tuzilishi
- `server.js` — Bot va API server (asosiy mantiq).
- `data/products.js` — Mahsulotlar katalogi (Backend).
- `webapp/` — Mini App fayllari (Frontend).
- `.github/workflows/` — CI/CD va GitHub Pages build.

## ⚠️ Muhim eslatmalar
- **Xavfsizlik**: Mini App API so'rovlari Telegram `initData` HMAC-SHA256 orqali himoyalangan.
- **Sinxronizatsiya**: `data/products.js` va `webapp/products-data.js` fayllari bir xil bo'lishi shart.
- **Rasm tahlili**: Gemini AI uchun yuz aniq ko'ringan rasm yuborish tavsiya etiladi.

---

© 2024 QoraQosh Korea. Barcha huquqlar himoyalangan.