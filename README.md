# 🌸 KiOVO — Koreya kosmetikasi

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
- **Botda faqat IKKI tugma** — «🔬 Yuz skaneri» va «🛍 Do'kon». Buyurtmalar,
  profil, konsultatsiya va yordam Mini App'ning **👤 Profil** bo'limiga
  ko'chirildi: oltita tugma orasida asosiy amal ko'zdan yo'qolardi.
- **Yuz skaneri** — botda ham, Mini App ichida ham ishlaydi.
  **Botdagi javob qisqa:** teri holati, topilgan belgilar (foizi va terining
  qaysi joyida ekani), bitta prognoz va **«💡 Tavsiyani ochish»** tugmasi.
  Sabab, yechim va bosqichma-bosqich parvarish — ILOVADA. Telegramda uzun
  xabar oxirigacha o'qilmaydi va odam tugmagacha yetib bormaydi.
- **Belgilar suratda ko'rsatiladi** — AI har bir muammo uchun uning rasmdagi
  joyini (markazi va radiusi) qaytaradi; ilovada va natija rasmida yuz ustiga
  **raqamlangan doira** chiziladi. Doiradagi raqam pastdagi ro'yxatdagi raqam
  bilan bir xil: odam «bu qayerda ekan?» deb izlamaydi.
- **Namuna surat** — «Yuz skaneri» ochilganda qanday rasm kutilayotgani
  ko'rsatiladi (admin panelidan yuklanadi). Odam ko'rsatmani o'qib emas,
  ko'rib tushunadi.
- **Rasm sifati nazorati — qat'iy.** Uzoq, xira, qorong'i, yuzi yopiq, bir
  nechta odam, qalin pardoz, ekrandan olingan yoki **AI/deepfake** rasm rad
  etiladi. Qoida: **ikkilansa — rad etadi.** Teri TEKSTURASI (teshiklar,
  mayda tuklar, donadorlik) ko'rinmasa rasm xira hisoblanadi — yuz tanilgani
  yetarli emas, biz odamni emas, TERINI ko'rishimiz kerak. Model «yaroqli»
  desa ham ishonchi 70% dan past bo'lsa tahlil qilinmaydi: chala rasmdan
  chiqqan «tahlil» o'ylab topilgan bo'ladi va ishonchni yo'qotadi.
- **Katalog, savat, buyurtma** — Mini App ichida; buyurtma raqami beriladi va
  holati o'zgarganda botga xabar keladi.
- **Savatda yetkazish narxi KO'RSATILMAYDI** — u manzilga (zona, masofa) va
  og'irlikka bog'liq. Savatda taxminiy narxni ko'rsatib, to'lovda boshqasini
  chiqarish mijozni aldashdek tuyuladi, shuning uchun aniq narx faqat
  rasmiylashtirishda, manzil tanlangach chiqadi.
- **Har bir dona uchun chegirma** — admin sozlaydi (masalan har mahsulotga
  5 000 so'm). 6 ta mahsulot olgan mijoz 30 000 so'm chegirma oladi va pochta
  haqi o'zini qoplaydi. Savatda «yana 1 ta olsangiz chegirma oshadi» deb
  ko'rsatiladi. Summa pog'onasi bilan **qo'shiladi**.
- **Minimal buyurtma** — admin sozlaydigan eng kam summa. Kam bo'lsa
  rasmiylashtirish tugmasi ochilmaydi va nechchi so'm yetmayotgani aytiladi.
  Tekshiruv `place_order()` ichida ham bor — klientga ishonilmaydi.
- **Natija RASM bo'lib keladi** — yuqori chap tarafda surat (topilgan
  belgilar raqamlangan doira bilan belgilangan), yonida taxminiy yosh, teri
  turi va rangi hamda 0–100 ball. Statistika **to'q yashil fon** ustida.
  Pastda belgilar ro'yxati va tavsiya etilgan mahsulotlar — **rasmi bilan
  kichik kartochkalarda**, har birida nima uchun kerakligi bir-ikki so'zda
  (Tozalash, Quyoshdan himoya…). **Ism yozilmaydi:** bitta telefondan bir
  necha odam surat yuklashi mumkin. Rasm serverda chiziladi, shuning uchun
  bot va Mini App'da bir xil ko'rinadi.
- **«Rasm qilib olish»** — Mini App'dagi tugma rasmni Telegram chatiga yuboradi.
  (WebView ichida brauzerning yuklab olish va ulashish oynasi ishonchli
  ishlamaydi; chatdan saqlash esa har telefonda ishlaydi.)
- **Yetkazib berish — pochta orqali.** Biz uyigacha o'zimiz eltmaymiz.
  Mijoz ikkitasidan birini tanlaydi:
  **🏤 filialdan olib ketaman** (arzonroq) yoki
  **🏠 manzilimgacha yetkazilsin**. Narx jo'natma OG'IRLIGIGA qarab
  hisoblanadi: mahsulotlar og'irligi + qadoqlash uchun 200 g.
- **Manzil tanlanadi, yozilmaydi** — 14 ta viloyat va 210 ta tuman ro'yxatdan
  qidiruv bilan tanlanadi; qo'lda faqat ko'cha, uy va xonadon yoziladi.
  Server viloyat/tuman juftligini rasmiy ro'yxatga solishtiradi.
- **To'lov faqat karta orqali** — buyurtma tasdiqlangach karta raqami chiqadi,
  mijoz to'lab chek rasmini yuklaydi. Naqd pul yo'q.
- **Eng yaqin ombor** — mahsulot yetib kelganda mijozga aynan qaysi omborga
  kelgani, uning manzili, mo'ljali, telefoni va ish vaqti yuboriladi.
  Ombor avval tuman, topilmasa viloyat bo'yicha tanlanadi.
- **Tahlil bo'limida O'Z suratingiz** — yuklangan surat belgilari bilan
  ko'rinadi, ostida belgilar ro'yxati (sabab va yechim bilan) va tavsiya
  etilgan mahsulotlar **gorizontal lentada**, rasmi va narxi bilan.
- **👤 Profil bo'limi (Mini App)** — ism, telefon, yosh, hudud; nechta tahlil,
  nechta buyurtma va jami qancha xarid qilgani; buyurtmalar tarixi;
  konsultatsiya, yordam, ommaviy oferta va ma'lumotni o'chirish.
- **Buyurtma yo'li ko'rinib turadi** — to'lov tasdiqlandi → Koreyada
  qadoqlanmoqda → Koreyadan jo'natildi → yo'lda → O'zbekiston omborida →
  pochtadan jo'natildi → yetib keldi. Har bosqichda xabar keladi.
- **Majburiy obuna** (ixtiyoriy) — kanalga a'zo bo'lmagan foydalanuvchi
  botdan foydalana olmaydi. Kanal havolasi tugmada ham, matnda ham
  ko'rinadi va bot uni o'zi topadi (pastga qarang).

### Admin uchun (`/admin`)
- **Boshqaruv paneli** — daromad, yalpi foyda va marja, o'rtacha chek,
  foydalanuvchilar, 14 kunlik grafik, voronka (ochgan → ro'yxat → skaner →
  savat → buyurtma), ombor holati.
- **Daromad prognozi** — yo'ldagi buyurtmalar holatiga qarab tortiladi
  (yangi 75%, tasdiqlangan 90%, yo'lda 97%) va tarixiy tugallanish ulushiga
  ko'paytiriladi; oy oxiri prognozi kunlik o'rtachadan chiqariladi.
- **Buyurtmalar** — holatni o'zgartirish, bekor qilishda ombor avtomatik qaytadi.
- **Mahsulotni o'chirish — ikki yo'l.** «📦 Arxivga olish» katalogdan
  yashiradi va qaytarish mumkin; «💥 Butunlay o'chirish» bazadan o'chiradi
  (rasmi va savatlardagi nusxalari bilan) va qaytarib bo'lmaydi. Ikkalasida
  ham **buyurtmalar tarixi butun qoladi**: mahsulot nomi va narxi
  `orders.items` ichida nusxa bo'lib saqlanadi, `products` ga havola emas.
- **Ko'p mahsulotni birdan qo'shish** — bir necha qadoq rasmini *bir vaqtda*
  tanlaysiz (12 tagacha), AI har birini tanib nomi, tarkibi, qo'llash tartibi
  va kimga mosligini to'ldiradi, tanlangan rasm mahsulot rasmi bo'lib qoladi.
  Sizga faqat **narx** qo'yish qoladi. Narxsiz mahsulot saqlanmaydi.
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
- **Sotuvlar va oylik hisobot** — har oy uchun buyurtma soni, mijozlar,
  to'liq tushum, yetkazish, tannarx va **sof foyda** (daromad − chegirma −
  tannarx) hamda marja. Oy ustiga bosib faqat o'sha oyning mahsulotlarini
  ko'rasiz. Har mahsulot bo'yicha dona, daromad, tannarx, foyda, marja.
- **Sotuvlar tarixini tozalash** — sinovdan haqiqiy ishga o'tayotganda:
  buyurtmalar, partiyalar va cheklar o'chadi, raqamlash 1 dan boshlanadi.
  Mahsulotlar, mijozlar va sozlamalar saqlanadi. Tasdiqlash so'zi talab
  qilinadi — tasodifan bosilmaydi.
- **Mijozlar (marketing va cold call)** — «kim qancha savdo qilgan va qachon».
  Filtr: xarid summasi oralig'i, buyurtmalar soni, oxirgi xarid sanasi,
  saralash (ko'p xarid qilgan / ko'p buyurtma bergan / oxirgi xarid / faollik).
  Tayyor segmentlar bir bosishda: **💎 eng ko'p xarid qilganlar**,
  **😴 uxlab qolganlar** (60 kundan beri jim), **🔁 takroriy xaridorlar**,
  **🌱 hali sotib olmaganlar**. Har mijozda buyurtma soni, o'rtacha chek,
  oxirgi xarid («3 oy oldin») va to'g'ridan-to'g'ri **📞 Qo'ng'iroq** /
  **💬 Yozish** tugmalari. Segment bo'yicha jami aylanma ko'rsatiladi.
  **⬇️ CSV** — ro'yxatni Excel'ga yuklab olib qo'ng'iroqqa berish.
- **Omborlar** — filiallarni qo'shish (viloyat, tuman, manzil, mo'ljal, telefon,
  ish vaqti, tartib). Buyurtma «Omborda» holatiga o'tganda mijozga shu ma'lumot
  avtomatik ketadi.
- **Xabar matnlari** — botning har bir javobi admin paneldan tahrirlanadi,
  jonli ko'rinish bilan.
- **Ommaviy oferta matni** — Sozlamalardan tahrirlanadi. Yuristingiz bergan
  matnni qo'yasiz; `# Sarlavha`, `## Bo'lim`, `- ro'yxat` bilan belgilanadi,
  HTML yozish shart emas. Bo'sh qoldirilsa koddagi namunaviy shablon ishlaydi.
- **Skaner namunasi** — «Yuz skaneri» ekranida ko'rsatiladigan namuna surat.
- **Tizim holati** — baza, Telegram bot va webhook, AI provayderi va haqiqiy AI
  chaqiruvi bitta tugma bilan tekshiriladi. Xatolik bo'lsa sababi ko'rsatiladi.
- **Mobil interfeys** — 900px dan tor ekranda pastki menyu, kengroqda yon panel.
  Butun panel telefondan qulay ishlaydi.
- **Telegram orqali kirish** — `ADMIN_TELEGRAM_IDS` ro'yxatidagi ID bilan
  Mini App'dan bir bosishda kiriladi; parol bilan kirish ham qoladi.
  Admin `/start` bosganda menyuda **⚙️ Admin panel** tugmasi chiqadi.
- **Ikkita Telegram kanal** (Sozlamalar → Telegram kanallar):
  **buyurtmalar kanali** — yangi buyurtma, to'lov cheki (rasm + ostida
  mijoz, manzil va summa) va holat o'zgarishi;
  **tahlillar kanali** — tahlil natijasi rasmi va xulosasi.
  Tahlillar kanaliga mijozlarning yuz suratlari tushgani uchun u sukut
  bo'yicha **o'chiq** — admin ataylab yoqishi kerak, kanal esa yopiq bo'lsin.
  «Kanallarni sinash» tugmasi bot kanalga yoza olishini darhol tekshiradi.
- **Brend nomi va logotipi** — Sozlamalardan o'zgartiriladi va bot, Mini App
  hamda rasmlarda birdaniga qo'llanadi. Nomni botdan ham o'zgartirasiz:
  `/brend`.

### Telefondan boshqarish (bot buyruqlari)

Kompyuter oldiga o'tirmasdan, Telegram'dan:

| Buyruq | Nima qiladi |
|---|---|
| `/orders` | **Xarid ro'yxati.** To'langan buyurtmalar mahsulot bo'yicha jamlanadi: «Cleansing Oil — 5 dona». Nomni bossangiz Coupang/Daiso sahifasi ochiladi. «Qabul qilindi» ni bosgach shu buyurtmalar bitta **partiya** ga birlashadi, keyingilari yangi ro'yxatga yig'iladi. |
| `/partiya` | Partiyani tanlab holatini birdaniga surasiz (mijozlarga xabar o'zi ketadi) va **pochta hujjatini** olasiz. |
| `/reklama` | Hamma foydalanuvchiga xabar (matn yoki rasm). Oldindan ko'rasiz, keyin yuboriladi. |
| `/reja` | Kanal agenti — pastga qarang. |
| `/tanitish` | **Mahsulot reklamasi.** Mahsulotni tanlaysiz, AI katalogdagi ma'lumotdan reklama posti yozadi va tasdiqlashga yuboradi. Qidirish: `/tanitish krem`. |
| `/brend` | Brend nomini o'zgartirish. |
| `/panel` | Admin panelni ochish. |

**Ikkita hujjat** (`/partiya` yoki `/orders` ostidagi tugmalardan):

- **📄 Pochta hujjati** — partiyadagi hamma jo'natma bitta `.docx` da:
  umumiy jadval (kimga, manzil, telefon, buyurtma, summa) va har biri uchun
  qirqiladigan «KIMDAN / KIMGA» yorlig'i. Print qilib pochtaga olib borasiz.
- **📘 Parvarish qo'llanmasi** — har mijoz uchun alohida sahifa: u AYNAN
  o'zi olgan mahsulotlarni qaysi tartibda va qanday ishlatishi, faol
  moddalari, ehtiyot choralari. Print qilib har birini o'z qutisiga solasiz.
  Mahsulot to'g'ri ishlatilsa natija ko'rinadi — bu qayta xaridga olib keladi.

### 🎁 Chegirma va minimal buyurtma

Sozlamalarda ikki dastak bor:

**Har mahsulot uchun chegirma.** «Har donaga» maydoniga summa yozasiz
(masalan 5 000) va «nechta donadan boshlab» (masalan 1). Mijoz 6 ta olsa
30 000 so'm chegirma oladi — bu pochta haqini qoplaydi. Savatda mijoz
«yana 1 ta olsangiz chegirma 5 000 so'mga oshadi» degan turtkini ko'radi.
Summa pog'onasi bilan **qo'shiladi**, katta-kichigi tanlanmaydi: «har
mahsulotga 5 000» va'dasi shartsiz bo'lishi kerak.

**Minimal buyurtma.** Shu summadan kam savat bilan buyurtma berilmaydi
(yetkazish hisobga olinmaydi). 0 — cheklov yo'q. Ikkala qoida ham
`place_order()` ichida, bazada tekshiriladi: mijoz yuborgan summa hech
qachon ishonchli emas.

### 🚚 Yetkazib berish narxi

Narx **EMU Express rasmiy tarif kartasi** (Avgust 2025) bo'yicha avtomatik
hisoblanadi. Uch narsaga bog'liq:

1. **Zona (0–4)** — jo'natuvchi va qabul qiluvchi viloyat juftligi.
   14×14 matritsa `src/lib/emu-tarif.js` da, PDF dagi jadvaldan olingan.
   Toshkentdan: Sirdaryo va Toshkent viloyati — 1-zona, Samarqand va
   Farg'ona vodiysi — 2, Buxoro va Surxondaryo — 3,
   Qoraqalpog'iston va Xorazm — 4.
2. **Masofa** — markaziy shahar / markazdan 40 km gacha / undan uzoq.
   Ro'yxatda belgilanmagan tuman «40 km dan uzoq» deb hisoblanadi:
   kam olib zarar ko'rgandan ko'ra ehtiyot bo'lgan yaxshi.
3. **Og'irlik** — mahsulotlar og'irligi + 200 g qadoqlash, to'liq kg ga
   yaxlitlanadi. 20 kg dan keyin stavka arzonlashadi.

Misol (Toshkentdan, 1 kg):

| Qayerga | Zona | 🏤 Filialdan | 🏠 Uygacha |
|---|---|---|---|
| Toshkent shahri | 0 | 22 000 | 32 000 |
| Nurafshon | 1 | 25 000 | 45 000 |
| Samarqand shahri | 2 | 27 000 | 47 000 |
| Samarqand, Urgut tumani | 2 | 37 000 | 62 000 |
| Urganch | 4 | 33 000 | 53 000 |

Sozlamalar → Yetkazib berish da: jo'natuvchi viloyat, qadoqlash og'irligi,
**ustama %** (o'z mehnatingiz) va **QQS %** (EMU narxlari QQS siz).
«🧮 Narxni sinab ko'rish» tugmasi bir necha shahar uchun narxni darhol
ko'rsatadi.

EMU o'rniga o'z narxingizni qo'ymoqchi bo'lsangiz — provayderni
«O'z narxim» ga o'tkazasiz. Pochta xizmatining API si sozlansa
(`yetkazish_api_url`) narx o'shandan olinadi; API javob bermasa
tarifga qaytadi — mijoz buyurtmani baribir tugatadi.

Narx **har doim serverda** hisoblanadi: mijoz yuborgan summa umuman
ishlatilmaydi. Hisob tafsiloti (zona, masofa, kg, ustama) buyurtmaga
yoziladi — keyin «nega shuncha?» degan savolga javob bera olasiz.

### 🤖 Kanal agenti

Bir marta topshiriq berasiz — «har kuni soat 9 da teri parvarishi haqida post
joyla» — agent 30 kunlik mavzular rejasini tuzadi va **har kuni bittadan**
post tayyorlab, avval SIZGA tasdiqlashga yuboradi. Siz tasdiqlamaguningizcha
kanalga hech narsa chiqmaydi. Tugmalar: joylash · o'zim yozaman · AI ga
aytaman · boshqa variant · o'tkazib yuborish.

**👁 Ko'rinishini ochish** — post kanalda qanday chiqishini alohida sahifada
ko'rsatadi: Telegram xabarining taqlidi (rasm + matn), belgilar soni va matn
nusxa olish uchun. Havola imzolangan (HMAC), shuning uchun tasdiqlanmagan
qoralama tarqalib ketmaydi. Rasmli postda matn 1024 belgidan oshsa sahifa
ogohlantiradi — Telegram izohni o'sha yerda kesadi.

**Kuniga bitta post.** Bu shunchaki e'tiborsizlik emas edi: kunlik chegara
`reja_bandlari.created_at` bo'yicha tekshirilardi, lekin u — *reja tuzilgan*
payt, 30 ta band bir vaqtda yaratiladi. Shart reja tuzilgan kuni hammasini
to'sar, ertasiga esa hech qachon ishlamasdi va agent bir kunda o'ttizta
tasdiq so'rovini yuborardi. Endi post *qachon tayyorlangani* alohida
ustunda (`tayyorlandi_at`) turadi va so'rov `distinct on (reja_id)` bilan
har rejadan bittasini oladi.

**Oldi-qochdi gaplar filtri.** Model o'zi bilmagan narsani ishonch bilan
aytib qo'yadi: «tadqiqotlarga ko'ra 87%…», «bir haftada butunlay yo'qoladi»,
«100% kafolat». Bunday post bir marta o'qiladi, keyin brendga ishonch
yo'qoladi. Ko'rsatmada bular taqiqlangan, ustiga yozilgan matn tekshiruvdan
o'tadi: manbasiz foiz, soxta manba, kafolat va'dasi, davolash va'dasi, real
bo'lmagan muddat, asossiz ustunlik. Topilsa post bir marta qayta yozdiriladi;
qolsa adminga xabarda ham, ko'rinish sahifasida ham ogohlantirish chiqadi.

**📣 Mahsulot reklamasi** — `/tanitish` (yoki `/tanitish krem`) mahsulot
ro'yxatini beradi, bittasini tanlaysiz va agent reklama postini yozadi.
Matn **katalogdagi haqiqiy ma'lumotdan** chiqadi (nomi, brendi, tarkibi,
qo'llash tartibi, kimga mos) — model o'zidan xususiyat o'ylab topa olmasligi
uchun unga «faqat shu ma'lumotdan foydalan» deb aytiladi. Rasm sifatida
mahsulotning o'z posteri ishlatiladi. Keyin xuddi oddiy post kabi tasdiqlash
oqimidan o'tadi.

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
  rasm/
    natija-kartochka.js tahlil natijasining SVG ko'rinishi
    chiz.js            SVG -> PNG (resvg + repozitoriyadagi shriftlar)
  api/
    routes.js          Mini App API (initData imzosi bilan)
    admin.js           admin API (JWT bilan), statistika va prognoz
  lib/
    brend.js           brend nomi va logotipi (bitta manba, keshlanadi)
    bosqichlar.js      buyurtma bosqichlari — bot va panel uchun bitta ro'yxat
    emu-tarif.js       EMU rasmiy tarif kartasi: zonalar va narxlar
    docx.js            .docx yozuvchi (ZIP + WordprocessingML), kutubxonasiz
    admin.js           kim admin — bot va admin API uchun bitta javob
    hududlar.js        14 viloyat, 210 tuman — manzil tekshiruvi uchun
    kesh.js            qisqa muddatli kesh (bir vaqtdagi so'rovlarni yig'adi)
    cheklov.js         so'rov cheklagich (sirg'aluvchi oyna)
  services/            tahlil va buyurtma mantiqi (bot ham, API ham ishlatadi)
    partiya.js         xarid partiyalari (/orders)
    yetkazish.js       og'irlik bo'yicha narx (API yoki tarif jadvali)
    pochta-hujjati.js  pochta uchun manzillar hujjati
    qollanma-hujjati.js mijozga qutiga qo'shiladigan parvarish qo'llanmasi
    broadcast.js       reklama yuborish (tezlik cheklovi bilan)
    majburiy-kanal.js  obuna tekshiruvi
    agent.js           kanal rejasi va post yozish
    agent-jadval.js    kunlik jadval (advisory lock bilan)
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
`npm test` — barcha sinovlar (EMU tarifi, bot oqimi, operatsiya, agent).

---

## Muhim texnik qarorlar

**Yetkazish narxi ham serverda.** `place_order()` ga tayyor narx beriladi,
lekin uni SERVER kodi (`src/services/yetkazish.js`) hisoblaydi — mijoz
yuborgan qiymat emas. Shu sababli mijoz `delivery_fee: 0` yuborsa ham
haqiqiy narx qo'yiladi.

**Narx serverda hisoblanadi.** Buyurtma `place_order()` funksiyasi ichida
yaratiladi: mahsulot narxi, ombor qoldig'i va yetkazish summasi bazadan
qaytadan olinadi. Mijoz yuborgan summa umuman ishlatilmaydi.

**AI yo'q muammoni o'ylab topmaydi.** Model har bir muammo uchun `ishonch`
(0–100) beradi va 60 dan pasti ko'rsatilmaydi. Prognoz faqat ro'yxatda
qolgan muammolar uchun beriladi. Kasallik nomlari (psoriaz, ekzema,
rozatsea va h.k.) matndan olib tashlanib, o'rniga dermatologga murojaat
tavsiyasi qo'yiladi — biz kosmetika sotamiz, tashxis qo'ymaymiz.
Model `ishonch` ni umuman qaytarmasa filtr ishlamaydi: hech narsa
ko'rsatmagandan ko'ra, topilganini ko'rsatgan yaxshiroq.

**Natija rasmi SVG dan chiziladi.** `src/rasm/natija-kartochka.js` SVG
yig'adi, `chiz.js` uni resvg bilan PNG ga o'giradi (~170 ms). Tuzilishi:
yuqorida to'q yashil fon — chapda surat, yonida ism va tavsif, ostida
statistika; pastda oq fonda muammolar va mahsulotlar, kichikroq. Shriftlar
`assets/shrift/` dan yuklanadi, tizimdan EMAS — konteynerda shrift
bo'lmasa matn jimgina yo'qolardi. Rasmda emoji ishlatilmaydi: resvg rangli
emoji shriftini chizmaydi, o'rnida bo'sh kvadrat qoladi.

**Bitta AI chaqiruvi.** Modelga katalogning ixcham ro'yxati beriladi, shuning
uchun u mavjud bo'lmagan mahsulotni o'ylab topa olmaydi. Qaytgan `product_id`
lar baribir katalogga solishtiriladi; SPF bosqichi tushib qolsa server o'zi
qo'shadi.

**Word hujjati kutubxonasiz.** `.docx` — bu ZIP ichidagi bir nechta XML.
Word Unicode'ni o'zi biladi, shuning uchun PDF'dagi kabi shrift joylashtirish
kerak emas: o'zbekcha `gʻoʻza` ham, kirill ham to'g'ri chiqadi.
Jadval uchun `<w:tblGrid>` MAJBURIY — usiz Word hujjatni rad etadi.

**Majburiy obuna hech kimni qamab qo'ymaydi.** Kanal havolasi to'rt
manbadan qidiriladi: admin yozgani → `@nom` dan → Telegram'dan
(`getChat`: kanal nomi yoki taklif havolasi) → bot o'zi yaratadi
(`createChatInviteLink`). Havola baribir topilmasa **obuna vaqtincha
o'chadi**: aks holda foydalanuvchi «obuna bo'ling» xabarini ko'rib,
qayerga borishni bilmay botdan umuman foydalana olmay qolardi.
Sozlamalardagi «🔍 Kanalni tekshirish» tugmasi bot admin ekanini va
havola borligini darhol ko'rsatadi.

**Agent hech qachon o'zi post qilmaydi.** Tayyorlangan post avval adminga
boradi. Jadval har 5 daqiqada tekshiradi va `pg_advisory_lock` oladi:
deploy paytida ikkita nusxa ishlab qolsa ham admin ikkita bir xil post
olmaydi.

**Yuz surati saqlanmaydi.** Asl surat tahlil momentida qayta ishlanadi va
tashlanadi. Bazada matnli natija va undan chizilgan **natija rasmi**
saqlanadi — foydalanuvchi keyin «rasm qilib olish» tugmasini bossa uni
qaytadan chizish uchun asl surat kerak bo'lardi, lekin bizda u yo'q.

**Javoblar siqiladi.** 2000 mahsulotli katalog xom holda 640 KB — mobil
internetda bir necha soniya. Brotli/gzip bilan **10 KB** (60 barobar).
Statik js/css/html ham siqiladi. 1 KB dan kichik javob siqilmaydi —
u yerda foyda yo'q.

**Ro'yxat bo'lakma-bo'lak chiziladi.** Hamma mahsulotni birdan DOM ga
qo'yish (2000 karta) telefonda 1,5–3 soniya qotishga olib kelardi.
Endi 24 tadan chiziladi, pastga tushgan sari qo'shiladi
(`IntersectionObserver`). Katalogga qaytish 1620 ms dan **138 ms** ga tushdi.

**Savat optimistik.** Tugma bosilganda server KUTILMAYDI: ekran darhol
yangilanadi, so'rov fonda ketadi. Server rad etsa — o'zgarish orqaga
qaytariladi va sabab aytiladi. Sekin internetda ilova "qotib qolgandek"
tuyulmaydi.

**Pul summalari bigint.** `int4` chegarasi 2,1 mlrd so'm — bu ~6500
buyurtmada tugaydi va boshqaruv paneli "integer out of range" bilan
butunlay yiqilardi. 60 000 buyurtma bilan sinaldi.

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

© KiOVO
