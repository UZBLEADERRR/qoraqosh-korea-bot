# 🌸 QoraQosh — Koreya kosmetikasi

Telegram bot + Mini App + admin panel. AI yuz tahlili asosida mahsulot tavsiya
qiladi va buyurtmani boshidan oxirigacha olib boradi.

**Stek:** Node.js 20 (bitta bog'liqlik — `pg`) · Supabase Postgres (session pooler) ·
Google Gemini · Railway.

---

## Nima qiladi

### Mijoz uchun
- **Ro'yxatdan o'tish** — telefon (Telegram kontakti orqali), ism, yosh, manzil,
  so'ng ommaviy oferta va «Barchasiga roziman».
- **Yuz skaneri** — botda ham, Mini App ichida ham ishlaydi. Natija qat'iy
  tartibda beriladi:
  1. **Umumiy ko'rsatkichlar** — taxminiy yosh, teri rangi, teri turi, 0–100 ball
  2. **Aniqlangan muammolar** — jadval: muammo, darajasi, joyi
  3. **Agar e'tibor berilmasa** — jadval: ehtimol (%) va muddat, izohlar bilan
  4. **Bosqichma-bosqich parvarish** — tozalash → toner → davolash → namlash →
     SPF, har biri uchun **nega aynan shu mahsulot** degan tushuntirish
- **Rasm sifati nazorati** — uzoq, xira, qorong'i, yuzi yopiq, bir nechta odam,
  qalin pardoz, ekrandan olingan yoki **AI/deepfake** rasm rad etiladi va nima
  qilish kerakligi aytiladi. Yaroqsiz rasm hech qachon tahlil qilinmaydi.
- **Katalog, savat, buyurtma** — Mini App ichida; buyurtma raqami beriladi va
  holati o'zgarganda botga xabar keladi.

### Admin uchun (`/admin`)
- **Boshqaruv paneli** — daromad, yalpi foyda va marja, o'rtacha chek,
  foydalanuvchilar, 14 kunlik grafik, voronka (ochgan → ro'yxat → skaner →
  savat → buyurtma), ombor holati.
- **Daromad prognozi** — yo'ldagi buyurtmalar holatiga qarab tortiladi
  (yangi 75%, tasdiqlangan 90%, yo'lda 97%) va tarixiy tugallanish ulushiga
  ko'paytiriladi; oy oxiri prognozi kunlik o'rtachadan chiqariladi.
- **Buyurtmalar** — holatni o'zgartirish, bekor qilishda ombor avtomatik qaytadi.
- **Mahsulotlar** — narx, **tannarx**, marja, ombor. **Skrinshotdan qo'shish:**
  qadoq yoki do'kon suratini yuklaysiz, AI mahsulotni tanib nomi, tarkibi,
  **qanday foydalanish**, kimga mos — hammasini to'ldiradi, siz tekshirib
  narx qo'yasiz.
- **Reklama posteri (📢)** — mahsulot rasmini yuklaysiz, AI 4 ta poster
  g'oyasini taklif qiladi (masalan davolovchi krem uchun «muammoli teri va
  natija» sahnasi), har biriga uslub, auditoriya, posterdagi yozuv va mos
  o'lchamni yozadi. Bittasini bosasiz — Gemini uni chizadi. Siz prompt
  yozmaysiz. Tanlangan poster katalogda mahsulot rasmi bo'lib chiqadi.
  O'lchamlar: 1:1 (katalog), 4:5 (Instagram), 9:16 (story), 16:9 (banner).
- **Sotuvlar** — har mahsulot bo'yicha dona, daromad, tannarx, foyda, marja.
- **Foydalanuvchilar** — qidiruv, jami xarid summasi, rozilik sanasi, bloklash.

---

## Ishga tushirish

### 1. Supabase — faqat ulanish satri

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Nom, kuchli **Database Password** (saqlab qo'ying) va yaqin region tanlang
3. Loyiha tayyor bo'lgach yuqoridagi **Connect** tugmasi →
   **Session pooler** bo'limidagi satrni nusxa oling:

```
postgresql://postgres.<ref>:[PAROL]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

4. `[PAROL]` o'rniga o'z parolingizni qo'ying va uni `DATABASE_URL` ga yozing.

**Jadvallarni qo'lda yaratish shart emas.** Server har ishga tushganda
`migrations/*.sql` fayllarini tekshiradi va hali qo'llanmaganini o'zi
bajaradi. Birinchi ishga tushishda bo'sh bazada jadvallar, `place_order()`
funksiyasi va 28 ta boshlang'ich mahsulot avtomatik paydo bo'ladi.

> Parolda `@ # ? /` kabi belgi bo'lsa, uni URL-kodlash kerak
> (`@` → `%40`), aks holda ulanish satri buziladi.

> **Xavfsizlik modeli.** Barcha jadvallarda RLS yoqilgan va bironta ham policy
> yo'q — ya'ni `anon` kalit bilan hech kim hech narsani o'qiy olmaydi. Bazaga
> faqat shu server ulanish satri bilan kiradi va har so'rovni Telegram
> `initData` imzosi (mijoz) yoki JWT (admin) bilan tekshiradi.

### 2. Muhit o'zgaruvchilari

`.env.example` dan nusxa oling. **Barchasi majburiy** — biror kalit yetishmasa
server ishga tushmaydi (default parol bilan ochiq qolib ketmasligi uchun):

| O'zgaruvchi | Nima |
|---|---|
| `BOT_TOKEN` | @BotFather dan |
| `DATABASE_URL` | Supabase → Connect → **Session pooler** satri |
| `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com/apikey) — bo'lmasa skaner zaxira rejimda, poster esa umuman ishlamaydi |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | Admin panel (parol ≥ 8 belgi) |
| `ADMIN_JWT_SECRET` | ≥ 24 belgi: `openssl rand -hex 32` |
| `PUBLIC_URL` | Railway avtomatik beradi. Bo'sh bo'lsa long-polling |
| `WEBHOOK_SECRET` | Ixtiyoriy, lekin tavsiya etiladi |

### 3. Railway

GitHub repozitoriyani ulang, yuqoridagi o'zgaruvchilarni **Variables** ga
qo'shing. `railway.json` qolganini o'zi qiladi.

`PUBLIC_URL` bo'lsa bot **webhook** rejimida ishlaydi — long-polling bilan
409 Conflict chiqmaydi.

### 4. Telegram sozlamalari

@BotFather da:
- `/setmenubutton` → Mini App: `https://<domen>/app/`
- `/setdescription`, `/setabouttext` — ixtiyoriy

### 5. Mahalliy ishlab chiqish

```bash
npm install
cp .env.example .env    # to'ldiring (PUBLIC_URL ni bo'sh qoldiring)
npm start
```

---

## Tuzilma

```
src/
  server.js            HTTP server, webhook, marshrutlar, /media
  config.js            kalitlarni tekshiradi, yetishmasa to'xtatadi
  db.js                Postgres pool va SQL yordamchilari
  db/migrate.js        migratsiyalarni avtomatik qo'llash
  ai/
    gemini.js          JSON sxema bilan majburlangan chaqiruv + rasm chizish
    faceAnalysis.js    sifat nazorati + tahlil + tavsiya (bitta chaqiruv)
    productEnrich.js   skrinshotdan mahsulotni tanish
    poster.js          poster g'oyalari va generatsiyasi
  bot/
    index.js           dispetcher
    render.js          tahlil natijasining Telegram ko'rinishi
    format.js          jadval, shkala, matn kengligi hisobi
    handlers/          ro'yxat, skaner, do'kon
  api/
    routes.js          Mini App API (initData imzosi bilan)
    admin.js           admin API (JWT bilan), statistika va prognoz
  services/            tahlil va buyurtma mantiqi (bot ham, API ham ishlatadi)
public/
  index.html           qo'nish sahifasi
  app/                 Mini App
  admin/               admin panel
migrations/
  001_schema.sql       jadvallar, RLS, place_order()
  002_katalog.sql      28 ta boshlang'ich mahsulot
  003_media.sql        posterlar
```

Yangi o'zgarish kerak bo'lsa **yangi** migratsiya fayli qo'shing
(`004_...sql`) — qo'llangan faylni tahrirlamang, u qayta bajarilmaydi.

`npm run check` — deploy oldidan fayllar, sxema va koddagi kalitlarni tekshiradi.

---

## Muhim texnik qarorlar

**Narx serverda hisoblanadi.** Buyurtma `place_order()` funksiyasi ichida
yaratiladi: mahsulot narxi, ombor qoldig'i va yetkazish summasi bazadan
qaytadan olinadi. Mijoz yuborgan summa umuman ishlatilmaydi.

**Bitta AI chaqiruvi.** Modelga katalogning ixcham ro'yxati beriladi, shuning
uchun u mavjud bo'lmagan mahsulotni o'ylab topa olmaydi. Qaytgan `product_id`
lar baribir katalogga solishtiriladi; SPF bosqichi tushib qolsa server o'zi
qo'shadi.

**Yuz surati saqlanmaydi.** Tahlil momentida qayta ishlanadi va tashlanadi;
bazada faqat matnli natija qoladi.

**Bot va Mini App bitta xizmatdan foydalanadi** (`src/services/`), shuning
uchun ikkala kanalda natija bir xil bo'ladi.

**Posterlar bazada saqlanadi** (`media.bayt`) va `/media/<id>` orqali
beriladi. Alohida saqlash xizmati sozlash shart emas. Supabase bepul tarifi
500 MB — bitta poster ~200-400 KB, ya'ni mingga yaqin poster sig'adi.
Undan oshsa eski posterlarni o'chiring (har mahsulotda oxirgi 12 tasi
avtomatik saqlanadi).

**bigint raqam sifatida o'qiladi.** `pg` sukut bo'yicha `int8` ni satr qilib
qaytaradi; `db.js` da tur o'girgichi qo'yilgan, aks holda `p.id === 5`
solishtirishlari jimgina buziladi.

---

## Ishga tushirishdan oldin ⚠️

1. **`src/lib/oferta.js`** — ommaviy oferta shabloni. `[KVADRAT QAVSDAGI]`
   joylarni (nom, STIR, manzil, telefon) to'ldiring va **yuristga
   ko'rsating**. Hozirgi holida bu huquqiy hujjat emas, shablon.
2. **Sertifikat.** Kosmetika importi uchun muvofiqlik hujjatlari kerak.
3. **Shaxsiy ma'lumotlar.** Yuz surati biometrik ma'lumot hisoblanadi va
   Gemini'ga uzatiladi. Oferta bunga alohida rozilik oladi, lekin
   O'zbekiston qonunchiligi bo'yicha yuristdan tasdiq oling.

---

## Cheklovlar

- **Deepfake aniqlash evristik.** Gemini rasm sun'iyligini vizual belgilariga
  qarab baholaydi — bu kriminalistik tahlil emas. Sifatli deepfake o'tib
  ketishi mumkin, haqiqiy rasm esa noto'g'ri rad etilishi mumkin.
- **AI tahlili tibbiy tashxis emas** — interfeysning har joyida shunday
  yozilgan.
- **To'lov integratsiyasi yo'q.** Hozircha yetkazishda naqd. Click/Payme
  keyingi qadam.
- **Poster generatsiyasi uchun Gemini kaliti shart.** Kalitsiz g'oyalar ham,
  rasm ham chizilmaydi — admin maydonlarni qo'lda to'ldiradi.
- **AI chizgan posterdagi yozuv har doim ham benuqson chiqmaydi.** Chizilgan
  posterni katalogga qo'yishdan oldin ko'zdan kechiring; yozuv xato bo'lsa
  boshqa g'oyani tanlang yoki qayta chizdiring.

---

© QoraQosh
