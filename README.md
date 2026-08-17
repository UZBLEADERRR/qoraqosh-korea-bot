# 🖤 QoraQosh — AI Yuz Tahlili & Koreya Kosmetikasi

Telegram bot + Telegram Mini App (Web App) bitta yengil Node.js serverida.

## 🌟 Imkoniyatlar
1. **AI Yuz Tahlili (Gemini Vision)**:
   - Foydalanuvchi `/start` bosadi va yuz rasmini yuboradi.
   - Gemini AI yuzni tahlil qilib: taxminiy yosh, teri turi (quruq/yogʻli/aralash/sezgir), aniqlangan muammolar (akne, pigmentatsiya, quruqlik va h.k.) va doʻkondan mos 2-3 ta mahsulotni tavsiya qiladi.
   - Bot xabarining pastidagi inline tugma bosilganda Mini App ochiladi va tavsiya etilgan mahsulotlar avtomatik savatga qoʻshiladi.
2. **Koreya Kosmetikasi Marketpleysi (Mini App)**:
   - 28+ original Koreya kosmetika mahsulotlari (COSRX, Beauty of Joseon, Anua, Round Lab, Skin1004, Laneige, Some By Mi va h.k.).
   - Kategoriyalar boʻyicha saralash va tezkor qidiruv.
   - Mahsulot tafsilotlari modali (hajmi, tarkibi, foydalanish tartibi).
   - Profil boʻlimida yuz tahlili natijasi saqlanadi.
3. **Tezkor Buyurtma**:
   - Savatdagi mahsulotlarni bitta tugma orqali [@sarvar_gpt](https://t.me/sarvar_gpt) lichkasiga tayyor xabar bilan yoʻllash.
   - Narxlar hamyonbop va yetkazish 7-14 kun (toʻgʻridan-toʻgʻri Koreyadan).

---

## 🚀 Railway orqali ishga tushirish (Deploy)

Barcha funksiyalar (Bot + Mini App + API) bitta Node.js jarayonida ishlaydi, tashqi npm paketlar talab qilinmaydi (Node.js 18+ native modullari).

### 1-qadam: GitHub Repoga yuklash
Ushbu loyihani GitHub repozitoriyangizga push qiling.

### 2-qadam: Railway.app ga ulash
1. [Railway.app](https://railway.app) ga kiring va GitHub akkauntingiz orqali kiring.
2. **"New Project"** -> **"Deploy from GitHub repo"** ni tanlang va ushbu repozitoriyni tanlang.
3. Railway loyihani avtomatik aniqlaydi (`node server.js`).

### 3-qadam: Muhit oʻzgaruvchilarini (Variables) kiritish
Railway boshqaruv panelida **Variables** boʻlimiga kiring va quyidagilarni qoʻshing:

| Oʻzgaruvchi | Tavsif | Namuna |
|-------------|--------|--------|
| `BOT_TOKEN` | @BotFather dan olingan bot tokeni | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) dan olingan kalit | `AIzaSy...` |
| `PORT` | Railway odatda oʻzi beradi (agar boʻlmasa `3000`) | `3000` |
| `WEBAPP_URL` | Railway bergan domen manzili | `https://qoraqosh-production.up.railway.app` |

*Eslatma: Railway loyihangizga bepul domen beradi (Settings -> Domains -> Generate Domain). Shu domenni nusxalab `WEBAPP_URL` ga qoʻying.*

### 4-qadam: Telegram Mini App tugmasini sozlash (Ixtiyoriy lekin tavsiya etiladi)
@BotFather ga kiring:
1. `/mybots` -> Botingizni tanlang.
2. `Bot Settings` -> `Menu Button` -> `Configure menu button`.
3. URL manziliga `https://sizning-domen.up.railway.app` ni kiriting.
4. Tugma nomiga: `🖤 QoraQosh Do'kon` deb yozing.

---

## 🛠 Mahalliy (Local) kompyuterda ishga tushirish

```bash
# Oʻzgaruvchilar bilan ishga tushirish:
BOT_TOKEN="your_token" GEMINI_API_KEY="your_gemini_key" node server.js
```

Brauzerda `http://localhost:3000` manzilini oching.

---

## 📁 Loyiha tuzilishi

```
├── server.js            # Asosiy server: Telegram bot long-polling, Gemini AI Vision tahlil, Mini App statik fayllari va REST API
├── data/
│   └── products.js      # 28 ta original Koreya kosmetikasi bazasi (narxlar, tavsiflar, teglari bilan)
├── webapp/              # Telegram Mini App (Frontend)
│   ├── index.html       # Do'kon, Savat, Profil ekranlari
│   ├── style.css        # QoraQosh qorong'i, premium minimalist uslubi
│   └── app.js           # Savat mantiqi, Telegram WebApp integratsiyasi, @sarvar_gpt buyurtma
└── package.json
```
