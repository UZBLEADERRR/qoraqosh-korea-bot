# 🌸 QoraQosh — Koreya kosmetikasi

Telegram bot + Mini App + admin panel. AI yuz tahlili asosida mahsulot tavsiya
qiladi va buyurtmani boshidan oxirigacha olib boradi.

**Stek:** Node.js 20 (bitta bog'liqlik — `pg`) · Supabase Postgres (session pooler) ·
Google Gemini · Railway.

---

## Nima qiladi

### Mijoz uchun
- **Ro'yxatdan o'tish** — telefon (Telegram kontakti orqali), ism, yosh,
  so'ng ommaviy oferta va «Barchasiga roziman». **Manzil bu yerda so'ralmaydi** —
  u buyurtma rasmiylashtirishda olinadi.
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
- **Manzil tanlanadi, yozilmaydi** — 14 ta viloyat va 210 ta tuman ro'yxatdan
  qidiruv bilan tanlanadi; qo'lda faqat ko'cha, uy va xonadon yoziladi.
  Server viloyat/tuman juftligini rasmiy ro'yxatga solishtiradi.
- **To'lov faqat karta orqali** — buyurtma tasdiqlangach karta raqami chiqadi,
  mijoz to'lab chek rasmini yuklaydi. Naqd pul yo'q.
- **Eng yaqin ombor** — mahsulot yetib kelganda mijozga aynan qaysi omborga
  kelgani, uning manzili, mo'ljali, telefoni va ish vaqti yuboriladi.
  Ombor avval tuman, topilmasa viloyat bo'yicha tanlanadi.

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
- **Omborlar** — filiallarni qo'shish (viloyat, tuman, manzil, mo'ljal, telefon,
  ish vaqti, tartib). Buyurtma «Omborda» holatiga o'tganda mijozga shu ma'lumot
  avtomatik ketadi.
- **Xabar matnlari** — botning har bir javobi admin paneldan tahrirlanadi,
  jonli ko'rinish bilan.
- **Tizim holati** — baza, Telegram bot va webhook, AI provayderi va haqiqiy AI
  chaqiruvi bitta tugma bilan tekshiriladi. Xatolik bo'lsa sababi ko'rsatiladi.
- **Mobil interfeys** — 900px dan tor ekranda pastki menyu, kengroqda yon panel.
  Butun panel telefondan qulay ishlaydi.
- **Telegram orqali kirish** — `ADMIN_TELEGRAM_IDS` ro'yxatidagi ID bilan
  Mini App'dan bir bosishda kiriladi; parol bilan kirish ham qoladi.

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

Ixtiyoriy o'zgaruvchilar:

| O'zgaruvchi | Nima | Standart |
|---|---|---|
| `OPENROUTER_API_KEY` | Gemini'ni OpenRouter orqali chaqirish. Berilsa **asosiy** provayder shu bo'ladi, Google zaxiraga tushadi | — |
| `OPENROUTER_MODEL` | OpenRouter'dagi model nomi | `google/gemini-2.5-flash` |
| `GEMINI_MODEL` | To'g'ridan-to'g'ri Google modeli | `gemini-2.5-flash` |
| `GEMINI_IMAGE_MODEL` | Poster chizadigan model (faqat Google) | `gemini-2.5-flash-image` |
| `ADMIN_TELEGRAM_IDS` | Telegram orqali admin panelga kira oladigan ID'lar, vergul bilan: `123456,7891011` | — |
| `DB_POOL_MAX` | Baza ulanish hovuzi hajmi. Oshirishdan oldin Supabase limitini tekshiring | `12` |
| `DB_QUERY_TIMEOUT_MS` | Bitta so'rovning eng uzun vaqti — osilgan so'rov hovuzni band qilmasin | `15000` |
| `SLOW_QUERY_MS` | Shundan sekin so'rovlar logga yoziladi | `1000` |

**AI provayderi qanday tanlanadi.** `OPENROUTER_API_KEY` bo'lsa matn tahlili
OpenRouter orqali ketadi, xato bo'lsa avtomatik Google'ga o'tadi.
Poster chizish faqat Google'da ishlaydi — poster kerak bo'lsa
`GEMINI_API_KEY` ham qo'ying. Ikkalasi ham bo'lmasa skaner zaxira rejimda
ishlaydi. Qaysi provayder ishlayotganini admin paneldagi **Tizim holati**
sahifasi ko'rsatadi.

### 3. Railway

GitHub repozitoriyani ulang, yuqoridagi o'zgaruvchilarni **Variables** ga
qo'shing. `railway.json` qolganini o'zi qiladi.

`PUBLIC_URL` bo'lsa bot **webhook** rejimida ishlaydi — long-polling bilan
409 Conflict chiqmaydi.

### 4. Telegram sozlamalari

@BotFather da:
- `/setmenubutton` → Mini App: `https://<domen>/app/`
- `/setdescription`, `/setabouttext` — ixtiyoriy

Admin panelga telefondan kirish uchun `ADMIN_TELEGRAM_IDS` ga o'z Telegram
ID'ingizni yozing (ID'ni [@userinfobot](https://t.me/userinfobot) aytadi),
so'ng `https://<domen>/admin/` ni Telegram ichida oching — parol so'ralmaydi.
Keyingi adminlarni panelning **Sozlamalar → Adminlar** bo'limidan qo'shasiz.

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
    index.js           provayder tanlash: OpenRouter asosiy, Google zaxira
    google.js          Google AI Studio: JSON sxema + rasm chizish
    openrouter.js      OpenRouter orqali o'sha modellar
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
  lib/
    hududlar.js        14 viloyat, 210 tuman — manzil tekshiruvi uchun
    kesh.js            qisqa muddatli kesh (bir vaqtdagi so'rovlarni yig'adi)
    cheklov.js         so'rov cheklagich (sirg'aluvchi oyna)
  services/            tahlil va buyurtma mantiqi (bot ham, API ham ishlatadi)
public/
  index.html           qo'nish sahifasi
  app/                 Mini App
  admin/               admin panel
migrations/
  001_schema.sql       jadvallar, RLS, place_order()
  002_katalog.sql      28 ta boshlang'ich mahsulot
  003_media.sql        posterlar
  004_tolov_chegirma…  karta to'lovi, chegirma pog'onalari, qoralama
  005_xabar_shablon…   bot matnlari settings jadvalida
  006_limit_aloqa.sql  kunlik skan limiti, menejer aloqasi
  007_ombor_admin.sql  omborlar, viloyat/tuman, Telegram admin
  008_omborda_holati…  «Omborda» holati va uning xabari
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

**Kuniga minglab foydalanuvchiga tayyorlik.** Katalog — eng ko'p so'raladigan
yo'l — 30 soniyalik keshda turadi va bir vaqtda kelgan so'rovlar bitta baza
so'roviga yig'iladi (o'lchandi: 50 ta parallel so'rov → 2 ta tranzaksiya).
Admin narx yoki sozlamani o'zgartirsa kesh darhol bekor qilinadi.
Har bir foydalanuvchi uchun so'rov cheklovi bor (umumiy 180/daqiqa,
skaner 6/5 daqiqa), ochiq katalog esa IP bo'yicha 90/daqiqa.
Bazada `statement_timeout` bor — osilib qolgan so'rov hovuzni band qilmaydi;
migratsiya esa alohida, cheklovsiz ulanishda bajariladi.

**«Thinking» modellari va MAX_TOKENS.** `gemini-2.5-*` o'ylash tokenlarini
`maxOutputTokens` dan yeydi — byudjet o'ylashga ketib, javob bo'sh qaytishi
mumkin. Shuning uchun `thinkingConfig.thinkingBudget = 0` qo'yiladi va javob
uzilib qolsa byudjet har urinishda ikki barobar oshiriladi.

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
