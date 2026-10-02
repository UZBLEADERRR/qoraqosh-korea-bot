# KiOVO — Google Play'ga chiqarish

Bu papkada Play Console'ga yuklanadigan hamma narsa bor. Quyidagi
tartibda bajaring — har bir qadam keyingisiga kerak.

| Fayl | Play Console'da qayerga |
|---|---|
| `ikon-512.png` | Main store listing → **App icon** (512×512) |
| `grafika-1024x500.png` | Main store listing → **Feature graphic** |
| `skrinshot-1-skaner.png` … `skrinshot-5-profil.png` | Main store listing → **Phone screenshots** (1080×1920) |

> Skrinshotlarga **do'kon ekrani** qo'shilmagan: sinov bazasidagi
> mahsulotlarda rasm yo'q edi. Ilova Play'ga chiqqach, telefoningizda
> haqiqiy mahsulotlar bilan do'kon ekranini skrinshot qilib, 2-o'ringa
> qo'shing (Play 2 tadan 8 tagacha rasm qabul qiladi).

---

## 0. Oldindan: domen va server sozlamalari

### Domen: kiovo.shop (www emas)

Ilova, Google kirish va Play hammasi **`kiovo.shop`** ga bog'langan.
`www.kiovo.shop` ham ishlaydi — u `kiovo.shop` ga yo'naltiriladi. Bu
to'g'ri va Play uchun muammo emas: Play'da domen umuman so'ralmaydi,
faqat ilova qaysi saytni ochishi muhim, u esa `https://kiovo.shop/app/`.

Tekshiring:
- Railway → Settings → **Networking → Custom Domain**: `kiovo.shop`
  qo'shilgan bo'lsin. `www.kiovo.shop` ni ham qo'shsangiz, yo'naltirishni
  serverning o'zi qiladi (301). Domen sotuvchisida (registrator)
  «forwarding» qilingan bo'lsa ham bo'ladi.
- `PUBLIC_URL` = `https://kiovo.shop` (www **siz**). www bilan yozilgan
  bo'lsa ham server havolalarni o'zi www siz qiladi.
- Brauzerda https://kiovo.shop/.well-known/assetlinks.json ochilib, JSON
  ko'rinishi kerak (yo'naltirishsiz).

### Railway → Variables (to'liq ro'yxat `.env.example` da):

| O'zgaruvchi | Nima uchun |
|---|---|
| `GOOGLE_CLIENT_ID` | «Google bilan kirish» tugmasi (1-bo'lim) |
| `ESKIZ_EMAIL`, `ESKIZ_PAROL` | SMS kod bilan kirish (2-bo'lim) |
| `DEMO_TELEFON`, `DEMO_KOD` | Google tekshiruvchisi uchun sinov raqami (7-bo'lim) |

Admin panel → **Sozlamalar**:

- **⚖️ Sotuvchi** — ism-familiya, maqom (jismoniy shaxs), email, manzil.
  Oferta va maxfiylik siyosati shu ma'lumot bilan avtomatik to'ldiriladi.
  **Email majburiy** — Play uni do'kon sahifasida ko'rsatadi.
- **🤖 Android ilova** — SHA-256 barmoq izlari (5-bo'lim).

Tekshirish: https://kiovo.shop/maxfiylik va https://kiovo.shop/oferta
ochilib, sizning ismingiz yozilgan bo'lishi kerak.

## 1. Google bilan kirish (OAuth)

1. https://console.cloud.google.com → yangi loyiha «KiOVO».
2. **APIs & Services → OAuth consent screen**: External; ilova nomi
   «KiOVO», logotip `ikon-512.png`, support email; *Authorized domains*:
   `kiovo.shop`; havolalar: `https://kiovo.shop/maxfiylik`,
   `https://kiovo.shop/oferta`. Scope'lar: faqat `email`, `profile`,
   `openid` (tekshiruv talab qilinmaydi). **Publish app** bosing.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `https://kiovo.shop`
   - Authorized redirect URIs: `https://kiovo.shop/kirish/google`
4. Chiqqan **Client ID** ni Railway'da `GOOGLE_CLIENT_ID` ga qo'ying.

## 2. SMS (Eskiz.uz)

1. my.eskiz.uz da ro'yxatdan o'ting, balansni to'ldiring.
2. **Shablonlar** → yangi shablon, matni aynan shunday:
   `KiOVO ilovasiga kirish kodi: 123456. Kodni hech kimga bermang.`
   Tasdiqlanmagan matnli SMS **yuborilmaydi**.
3. Railway: `ESKIZ_EMAIL`, `ESKIZ_PAROL` (kerak bo'lsa `ESKIZ_FROM`).

SMS sozlanmaguncha ilova telefon raqamini Telegram orqali tasdiqlaydi,
Google va Telegram bilan kirish esa ishlayveradi.

## 3. Play Console hisobi

https://play.google.com/console → **Personal** (shaxsiy) hisob, $25
bir martalik. Pasport bilan shaxsni tasdiqlash so'raladi.

⚠️ **Shaxsiy hisob uchun qoida:** ilovani hammaga chiqarishdan oldin
**kamida 12 kishi 14 kun uzluksiz** yopiq sinovda (closed testing)
qatnashishi shart. 12 ta tanishingizning Gmail manzilini oldindan
yig'ib qo'ying (8-bo'lim).

## 4. Ilova yaratish

Create app → nomi **KiOVO**, til: O'zbekcha, *App* (o'yin emas),
*Free* (bepul).

## 5. Imzo kaliti va AAB

1. Sizga yuborilgan `kiovo-upload.jks` va yo'riqnomadagi parolni GitHub →
   repo → **Settings → Secrets and variables → Actions** ga qo'ying:
   `KIOVO_KEYSTORE_B64`, `KIOVO_KEYSTORE_PAROL`, `KIOVO_KALIT_NOMI`,
   `KIOVO_KALIT_PAROL`.
2. GitHub → **Actions → Android ilova → Run workflow**. 5–8 daqiqada
   tayyor bo'ladi; **Artifacts → kiovo-android** ichida:
   - `app-release.aab` — Play'ga yuklanadi;
   - `app-release.apk` — telefonga to'g'ridan-to'g'ri o'rnatib sinash uchun;
   - `sha256.txt` — kalit barmoq izi.
3. Play Console → **Test and release → App signing**: *Play App Signing*
   yoqilgan bo'lsin (standart). U yerdagi **App signing key certificate →
   SHA-256** ni nusxalang.
4. Admin → Sozlamalar → **Android ilova → SHA-256** maydoniga Play'dagi
   *App signing key* SHA-256 ni yozing. Yuklash kalitiningki
   (`4C:9F:81:B6:…:4D:25`) serverda **allaqachon bor** — GitHub'da
   yig'ilgan APK darrov to'liq ekranda ochiladi.

   ⚠️ **«Ilova shunchaki saytni ochyapti» degan holat shu yerdan.** Agar
   ilovaning tepasida **manzil satri** (kiovo.shop yozuvi) ko'rinsa —
   Android ilovani sayt egasi deb tan olmagan: imzo barmoq izi
   `assetlinks.json` da yo'q. Vaqtinchalik kalit bilan yig'ilgan APK
   (Secrets qo'yilmaganda) har doim shunday ochiladi. Doimiy kalit bilan
   yig'ilgan APK/AAB da manzil satri bo'lmaydi.
   Tekshirish: https://kiovo.shop/.well-known/assetlinks.json ikkala
   barmoq izini ko'rsatishi kerak.

Har safar `android/` o'zgarsa yoki qo'lda ishga tushirilsa yangi versiya
raqami avtomatik oshadi — Play bir xil raqamni ikki marta qabul qilmaydi.
Ilovaning **ichidagi** dizayn va funksiyalar saytdan keladi: ular uchun
yangi AAB kerak emas, server yangilansa ilova ham yangilanadi.

## 6. Do'kon sahifasi (Main store listing)

**Kategoriya:** Beauty (Go'zallik). **Teglar:** Beauty, Shopping.
**Kontakt:** email (sotuvchi email), sayt `https://kiovo.shop`.
**Privacy policy:** `https://kiovo.shop/maxfiylik`

### O'zbekcha (asosiy)

**Nomi** (30 belgigacha):
```
KiOVO: AI teri tahlili
```

**Qisqa tavsif** (80 belgigacha):
```
Yuzingizni 30 soniyada tahlil qiling — teringizga mos Koreya kosmetikasi
```

**To'liq tavsif:**
```
KiOVO — teringizni tushunadigan Koreya kosmetikasi do'koni.

📸 AI TERI TAHLILI — 30 SONIYADA
Telefon kamerasi bilan yuzingizni suratga oling. Sun'iy intellekt 7 ta
ko'rsatkichni o'lchaydi: teshiklar, ajinlar, pigment, qizarish, tekstura,
namlik va yog'lilik. Natija — umumiy ball, teri turi va topilgan
belgilar, har birining sababi bilan.

🧴 SIZGA AYNAN MOS PARVARISH
Tahlil asosida tozalash, toner, serum, krem va quyoshdan himoya —
bosqichma-bosqich tayyor parvarish tartibi. Faqat sizning teringizga
to'g'ri keladigan mahsulotlar.

💬 SHAXSIY MASLAHATCHI
«Terim quruq», «akne bor» — muammoingizni o'z so'zingiz bilan yozing,
maslahatchi mos mahsulotni topib beradi.

🇰🇷 ASL KOREYA KOSMETIKASI
Mahsulotlar Koreyadan olib kelinadi. Buyurtma holatini ilovada kuzatib
borasiz, O'zbekiston bo'ylab yetkazib beriladi.

🔐 MA'LUMOTLARINGIZ — O'ZINGIZNIKI
Telegram, Google yoki telefon raqami bilan parolsiz kirasiz. Istalgan
payt ma'lumotlaringizni yuklab olishingiz yoki hisobni butunlay
o'chirishingiz mumkin. Yuz suratingiz reklamada ishlatilmaydi va
sotilmaydi.

AI tahlili kosmetologik tavsiya, tibbiy tashxis emas. Teri kasalligi
bo'lsa dermatologga murojaat qiling.
```

### Русский

**Название:**
```
KiOVO: AI анализ кожи
```

**Краткое описание:**
```
Анализ кожи лица за 30 секунд и корейская косметика, подобранная под вас
```

**Полное описание:**
```
KiOVO — магазин корейской косметики, который понимает вашу кожу.

📸 AI-АНАЛИЗ КОЖИ ЗА 30 СЕКУНД
Сфотографируйте лицо камерой телефона. Искусственный интеллект оценит
7 показателей: поры, морщины, пигментация, покраснения, текстура,
увлажнённость и жирность. Результат — общий балл, тип кожи и найденные
признаки с объяснением причин.

🧴 УХОД, ПОДОБРАННЫЙ ИМЕННО ВАМ
Очищение, тонер, сыворотка, крем и защита от солнца — готовая пошаговая
схема ухода на основе анализа.

💬 ЛИЧНЫЙ КОНСУЛЬТАНТ
Опишите проблему своими словами — «сухая кожа», «акне» — и консультант
подберёт подходящее средство.

🇰🇷 ОРИГИНАЛЬНАЯ КОРЕЙСКАЯ КОСМЕТИКА
Товары привозятся из Кореи. Статус заказа виден в приложении, доставка
по всему Узбекистану.

🔐 ВАШИ ДАННЫЕ ПРИНАДЛЕЖАТ ВАМ
Вход без пароля — через Telegram, Google или номер телефона. Данные
можно скачать или полностью удалить аккаунт в любой момент. Фото лица
не используется в рекламе и не продаётся.

AI-анализ — косметологическая рекомендация, а не медицинский диагноз.
```

### English

**Title:**
```
KiOVO: AI Skin Analysis
```

**Short description:**
```
Analyze your skin in 30 seconds and get Korean skincare matched to you
```

**Full description:**
```
KiOVO is a Korean skincare store that understands your skin.

📸 AI SKIN ANALYSIS IN 30 SECONDS
Take a selfie with your phone camera. AI measures 7 indicators: pores,
wrinkles, pigmentation, redness, texture, hydration and oiliness. You get
an overall score, your skin type and detected signs with their causes.

🧴 A ROUTINE MADE FOR YOU
Cleanser, toner, serum, cream and sunscreen — a step-by-step routine
built from your analysis, with products that suit your skin.

💬 PERSONAL ADVISER
Describe your concern in your own words and the adviser finds the right
product.

🇰🇷 AUTHENTIC KOREAN COSMETICS
Products are imported from Korea. Track your order in the app; delivery
across Uzbekistan.

🔐 YOUR DATA IS YOURS
Sign in without a password via Telegram, Google or phone number. Download
your data or delete your account at any time. Your face photo is never
used for advertising and never sold.

The AI analysis is cosmetic advice, not a medical diagnosis.
```

## 7. App content (Policy → App content)

**App access** → *All or some functionality is restricted* → Add
instructions:
```
Open the app → "Telefon raqami" field → enter the demo number
+998 XX XXX XX XX (DEMO_TELEFON) → tap "Kod olish" → enter code XXXXXX
(DEMO_KOD). No SMS is sent to this number; the code is fixed.
Alternatively tap "Google bilan kirish" with any Google account.
```
(`DEMO_TELEFON` va `DEMO_KOD` ni Railway'da qo'ying va shu yerga aynan
o'shalarni yozing. Haqiqiy mijoz raqamini ishlatmang.)

**Ads:** No, my app does not contain ads.

**Content rating** (IARC so'rovnomasi): kategoriya *All other app types*.
Zo'ravonlik, qo'rqinchli, jinsiy, so'kinish, qimor, giyohvand — hammasi
**No**. *Users can interact / exchange content?* — **No** (maslahatchi
bilan suhbat foydalanuvchilar o'rtasida emas). *Shares user location?* —
**No**. *Digital purchases?* — **No** (jismoniy mahsulot). Kutilgan
natija: 3+ / Everyone.

**Target audience:** **18 and over** (oferta va maxfiylik siyosatida
shunday yozilgan). *Appeals to children?* — No.

**News app:** No. **COVID-19:** Not a publicly available COVID app.
**Government app:** No. **Financial features:** None.

**Health apps:** ilova tibbiy emas. Agar so'rasa — *Health & fitness*
belgilanmaydi; tavsifda «tibbiy tashxis emas» deb yozilgan.

**Data deletion:** *Yes, users can request deletion*. URL:
`https://kiovo.shop/hisobni-ochirish`

### Data safety (Ma'lumot xavfsizligi)

Umumiy savollar:

| Savol | Javob |
|---|---|
| Does your app collect or share user data? | **Yes** |
| Is all data encrypted in transit? | **Yes** (HTTPS) |
| Do you provide a way to request deletion? | **Yes** — ilovada Profil → Hisob va ma'lumotlarim, hamda yuqoridagi URL |

To'planadigan ma'lumotlar (hammasi **Collected**, **Not shared** —
Gemini, Eskiz, Supabase, Railway xizmat ko'rsatuvchi hisoblanadi va
Play qoidasi bo'yicha «sharing» emas; **Processed ephemerally: No**):

| Play turi | Bizda nima | Majburiy? | Maqsad |
|---|---|---|---|
| Personal info → **Name** | Ism | Required | App functionality, Account management |
| Personal info → **Email address** | Google bilan kirganda | Optional | Account management |
| Personal info → **Phone number** | Telefon | Required | App functionality, Account management |
| Personal info → **Address** | Yetkazish manzili | Optional | App functionality |
| Personal info → **Other info** | Yosh | Optional | App functionality, Personalization |
| Health and fitness → **Health info** | Teri turi, allergiya | Optional | App functionality, Personalization |
| Photos and videos → **Photos** | Yuz surati (tahlil), to'lov cheki | Optional | App functionality |
| Financial info → **Purchase history** | Buyurtmalar | Optional | App functionality |
| Messages → **Other in-app messages** | Maslahatchiga yozilgan savollar | Optional | App functionality |
| App activity → **App interactions** | Qaysi bo'lim ochilgani (statistika) | Required | Analytics |
| Device or other IDs → **Device or other IDs** | Bildirishnoma manzili (push obunasi) | Optional | App functionality |

**Collected EMAS:** joylashuv, kontaktlar, kalendar, fayllar, audio,
reklama ID, brauzer tarixi, kredit karta raqami (to'lov
chek rasmi orqali, karta raqami saqlanmaydi).

### Ilova «faqat sayt» emasligi (Minimum functionality)

Google Play sayt nusxasidan iborat ilovalarni rad etishi mumkin. KiOVO
ilovasida telefonning o'z imkoniyatlari ishlatiladi — tekshiruvchiga
yozish uchun («Notes for review» / App access ichida):

```
KiOVO is a native-feeling store app (Trusted Web Activity):
- camera skin analysis (on-device face detection + AI analysis);
- push notifications for order status (Android notification permission);
- launcher shortcuts: Scanner, Cart, My orders (long-press the icon);
- works offline (cached catalog and profile);
- full-screen UI with its own back-button navigation, no browser bar;
- in-app account deletion and data export.
```

## 8. Yopiq sinov (Closed testing) — 14 kun

1. **Test and release → Testing → Closed testing → Create track**.
2. **Testers** → yangi email ro'yxati, 12+ Gmail manzil qo'shing.
3. **Create release** → `app-release.aab` ni yuklang → Release notes:
   `Birinchi versiya` → Review → **Start rollout**.
4. Google tekshiradi (odatda 1–3 kun, birinchi marta 7 kungacha).
5. Testerlarga **opt-in havolasi**ni yuboring: ular havolani ochib
   «Become a tester» bosadi va ilovani Play'dan o'rnatadi.
   **14 kun davomida o'chirib yubormasliklari kerak.**
6. 14 kun o'tgach: **Dashboard → Apply for production**. Bir nechta
   savol (sinov qanday o'tdi, nimani tuzatdingiz) — halol yozing.
7. Ruxsat kelgach: **Production → Create release** → o'sha AAB → rollout.

## 9. Chiqqandan keyin

- Admin → Sozlamalar → Android ilova → **Google Play havolasi**:
  `https://play.google.com/store/apps/details?id=shop.kiovo.app`.
  Saytda «Google Play'dan yuklab olish» nishoni avtomatik chiqadi.
- Sharhlarga javob bering — reyting shundan o'sadi.
- Play Console → **Android vitals** da ilova qulashi yoki sekinligi
  ko'rinadi.
