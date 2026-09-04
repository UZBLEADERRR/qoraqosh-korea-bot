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
  **Botdan BITTA xabar keladi:** natija rasmi + izoh + **«💡 Tavsiyani
  ochish»** tugmasi. Izohda: yosh va teri turi, teri rangi, ball va
  shkala, topilgan belgilar (nomi qalin, foizi va 📍 zonasi), so'ng
  ilovaga chaqiriq va tibbiy ogohlantirish kursivda. **Sabab, yechim,
  prognoz va parvarish tartibi bu yerda YO'Q** — ular ilovada, chunki
  xabarning vazifasi tugmani bostirish. Telegram rasm izohini 1024
  belgida kesadi (kesilgan HTML teg xabarni umuman yuborilmaydigan
  qiladi), shuning uchun matn uzayib ketsa muammolar avtomatik
  kamayadi va «…va yana N tasi ilovada» deb yoziladi.
- **Bosh sahifada karusel** — ilova ochilganda eng yuqorida aylanib
  turadigan rasmlar (admin panelidan 10 tagacha yuklanadi), ustida
  **«Yuzni tahlil qilish»** tugmasi — bosilsa skanerga o'tadi. Barmoq
  bilan suriladi. Rasm qo'yilmasa oddiy chaqiriq kartasi ko'rinadi.
- **Namuna surat** — «Yuz skaneri» ochilganda qanday rasm kutilayotgani
  ko'rsatiladi: **botda ham** (ko'rsatma o'sha rasmning izohi bo'lib
  keladi), Mini App'da ham. Admin panelidan yuklanadi; qo'yilmagan
  bo'lsa oddiy matn ketadi. Odam ko'rsatmani o'qib emas, ko'rib
  tushunadi.
- **AI maslahatchi** (pastki menyudagi **Maslahat** bo'limi) — odam o'z
  so'zi bilan yozadi: «oyog'im og'riyapti», «tuk oluvchi bormi», «yuzim
  quruq». AI **faqat katalogdagi** mahsulotni tavsiya qiladi.
  - **U sotuvchi emas, maslahatchi.** «Akne nega chiqadi?», «tonerni
    qachon surtaman?» kabi savolga **mahsulotsiz**, sof javob beradi —
    har savolga mahsulot tiqishtirish ishonchni yo'qotadi. Mahsulot
    faqat odam tanlashda yordam so'raganda yoki muammoni hal qilish
    uchun haqiqatan kerak bo'lganda chiqadi.
  - **Ma'lumot yetmasa TAXMIN QILMAYDI, SAVOL BERADI.** «Krem kerak»
    degan odamdan teri turini so'raydi va tayyor variantlarni tugma
    qilib beradi — odam yozib o'tirmaydi, bosadi. Kerak bo'lsa **rasm
    so'raydi** (toshma, qizarish, dog' — ko'rgan yaxshiroq), odam esa
    chatdagi kamera tugmasi bilan surat biriktiradi.
  - **Bir mahsulot yetmasa TO'PLAM beradi**: «Akne uchun 3 bosqichli
    parvarish» — har mahsulotga tartib raqami, bosqichi (tozalash →
    davolash → namlash), nega kerakligi va qanday ishlatilishi. Pastda
    jami narx va **«Hammasini savatga»** — bitta bosishda hammasi savatga
    tushadi. Tizza og'rig'i kabi bitta narsa yetadigan holatda esa bitta
    mahsulot chiqadi.
  - Javob **formatlangan**: rangli kichik sarlavhalar, nuqtali ro'yxat,
    raqamlangan qadamlar, qalin so'zlar va ajratilgan «diqqat» satri.
    Avval «nega shunday bo'ladi» tushuntiriladi, keyin «nima qilamiz».
  - **Tavsiyalar yig'ilgan holda keladi** — javob uzun bo'lib
    ketmasligi uchun mahsulotlar bitta satrga («2 ta · 265 000 so'm»)
    yig'iladi, bosilganda ochiladi.
  - **Kontekstni saqlaydi** — oxirgi 8 xabar modelga uzatiladi, shuning
    uchun bir savolni ikki marta bermaydi.
  - **Profilni hisobga oladi**: yosh, teri turi, allergiya va kasallik
    (profilda kiritiladi) tavsiyaga ta'sir qiladi.
  - Model o'ylab topgan `product_id` **tashlanadi** — ilovada bosib
    bo'lmaydigan mahsulot ko'rinmasligi kerak.
  - Og'riq, jarohat, allergiya, teri kasalligi haqidagi savol
    **«Sog'liq masalasi»** deb belgilanadi: dori tavsiya qilinmaydi,
    tashxis qo'yilmaydi, shifokorga borish aytiladi.
  - Inputga bosilganda pastki menyu pastga sirg'alib ketadi.
  - Cheklov: bitta odamga 10 daqiqada 20 ta savol.
- **Bosh sahifa** — oq shapka (qizil logotip, qo'ng'iroq, savat va
  qidiruv), banner karuseli, toifa doiralari va toifa bo'yicha
  bo'limlar. Karuselning **birinchi slaydi har doim AI tahlil
  chaqirig'i** — bosh sahifadagi asosiy amal yo'qolmaydi; admin
  yuklagan rasmlar undan keyin aylanadi. **Har bo'lim gorizontal
  siriladi** — ilgari biri gorizontal, keyingisi vertikal to'r edi va
  vertikal bo'lim ustida «Hammasini ko'rish» turardi, holbuki u yerda
  hammasi allaqachon ko'rinardi. Toifasi belgilanmagan mahsulotlar
  **«Boshqa»** bo'limiga tushadi — do'konda ko'rinmay qolgan mahsulot
  yo'qotilgan pul. Oxirida «Barcha mahsulotlar».
- **Bo'lim ikonkalari.** Filtr doiralaridagi ikonka ilgari faqat
  `slug` bo'yicha tanlanardi, shuning uchun AI ochgan yangi bo'limlar
  (masalan «Aksessuar») HAMMASI bir xil ikonka olardi va filtr o'qilmay
  qolardi. Endi ikonka bazada saqlanadi va admin panelning
  **Bo'limlar** bo'limida tanlanadi. Tanlanmagan bo'lsa nomdan
  avtomatik topiladi («soch» → tomchi, «tuk oluvchi» → qalqon), u ham
  topilmasa slug'dan barqaror tanlov qilinadi — hech bo'lmasa bo'limlar
  bir-biridan farq qiladi. Rang ham shunday.
- **Nomlar o'zbekcha.** Katalogdagi asl nom inglizcha yoki koreyscha
  («Heartleaf Pore Deep Cleansing Oil») — mijoz uni o'qiy olmaydi va nima
  ekanini tushunmaydi. Shuning uchun har mahsulotning **ikkita nomi**
  bor: `name` — Koreyadagi ASL nom, `nom_uz` — ilovada ko'rinadigani
  («Heartleaf teshik tozalovchi gidrofil moy»).

  Asl nom hech qachon o'zgartirilmaydi: **buyurtma, xarid ro'yxati
  (`/orders`), pochta hujjati va Koreyadagi qidiruv aynan shunga
  tayanadi** — tarjimaga almashtirsak do'kondan qaysi mahsulot ekanini
  topib bo'lmay qoladi.

  O'zbekcha nomni AI yozadi: brend va mahsulot liniyasi (Heartleaf,
  Vita C, Purple Tone-Up) o'zgarmaydi — ular identifikator; faqat
  vazifani bildiruvchi qism o'giriladi. Yangi mahsulot `/qosh` bilan
  qo'shilganda avtomatik to'ldiriladi, mavjudlari uchun panelda
  **«N ta nomni o'zbekchaga o'girish»** tugmasi bor. Har mahsulotni
  qo'lda ham tahrirlash mumkin. **Qidiruv ikkala nom bo'yicha ham
  ishlaydi** — odam «gidrofil moy» deb ham, «cleansing oil» deb ham
  qidiradi.
- **Mahsulot kartasi** — yurakcha (sevimlilar), ★ reyting, narx,
  moslik yorlig'i va bitta bosishda savatga qo'shadigan «+».
  - **Reyting o'ylab topilmaydi**: u manba do'kondan (skrinshotdagi
    baho) olinadi. Sharh soni nol bo'lsa yulduzcha umuman
    ko'rsatilmaydi — soxta reyting ishonchni eng tez yo'qotadi.
  - **Moslik yorlig'i** ham haqiqiy: oxirgi tahlildagi muammolar va
    profildagi teri turi bilan solishtiriladi. Mos kelmasa yorliq
    chiqmaydi.
- **Sharhlar HAQIQIY.** Sharhni faqat shu mahsulotni **sotib olgan**
  mijoz yozadi — server buyurtmalar ro'yxatidan tekshiradi. Reyting
  qo'lda yozilmaydi: u sharhlardan bazadagi trigger orqali
  hisoblanadi (`reytingni_yangila`). Bir odam bir mahsulotga bitta
  sharh yozadi, keyin uni o'zgartirishi yoki o'chirishi mumkin.
  Ro'yxatda ism qisqartiriladi («Aliyeva Malika» → «Malika A.»).
  Yetkazilgan buyurtma kartasida «Shu mahsulotni baholash» tugmasi
  chiqadi.
  - Koreys do'konidagi baho (skrinshotdan o'qilgani) **alohida**
    ustunda saqlanadi va «Koreyada · 124 sharh» deb belgilanadi —
    u bizning mijozimizning bahosi emas, ikkalasini aralashtirish
    mijozni chalg'itadi.
  - Bizda sharh yo'q bo'lsa kartada yulduzcha umuman ko'rsatilmaydi.
- **Sevimlilar** — katalogdagi yurakcha, profildagi «Sevimlilar»
  bo'limi va statistikadagi hisob.
- **Savatda AI tavsiyasi** — savatdagi mahsulotlar qaysi parvarish
  bosqichlarini qamragani hisoblanadi va YETISHMAYOTGAN bosqichdan
  eng mos mahsulot taklif qilinadi. Hammasi bor bo'lsa taklif
  chiqmaydi.
- **Buyurtma yo'li** — to'rt bosqich (Qabul qilindi → Tayyorlanmoqda →
  Yo'lda → Yetkazildi), joriysi qizil. Ichki texnik holatlar
  («Koreyadan jo'natildi», «omborda») mijozga ko'rinadigan bosqich
  ichiga yig'iladi: o'nta holat emas, to'rtta tushunarli qadam.
- **Skaner** — qadam ko'rsatkichi, yuz ramkasi bilan namuna surat,
  nimalar aniqlanishi (akne, quruqlik, yog'lanish, teshik, dog') va
  bitta tugma.
- **Qidiruv har tilda ishlaydi.** Katalogdagi nom koreyscha yoki
  inglizcha («Perfect Whip», «수분 크림»), odam esa o'z tilida yozadi.
  Har mahsulotga **kalit so'zlar** saqlanadi: `penka`, `пенка`,
  `gel dlya umyvaniya`, `foam cleanser`. Ikki manbadan:
  - **qoida** — toifa, bosqich va muammodan kelib chiqadi, token
    sarflamaydi, AI kaliti bo'lmasa ham ishlaydi;
  - **AI** — mahsulotning o'ziga xos so'zlari, 25 tadan partiyalab.
  Import paytida avtomatik to'ldiriladi; mavjud katalog uchun admin
  panelidan `POST /api/admin/kalit-sozlar`. Klientda kirill→lotin
  translit ham bor, shuning uchun «пенка» va «penka» bir xil natija
  beradi.
- **Ilovani telefonga o'rnatish.** Profildagi **«Ilovani o'rnatish»**
  tugmasi KiOVO ikonkasini telefon bosh ekraniga chiqaradi — Telegramni
  ochish, botni topish, tugmani bosish bosqichlari yo'qoladi. Uch yo'l,
  shu tartibda:
  1. **Telegram** — `addToHomeScreen()` (Bot API 8.0+). Mini App ichida
     eng to'g'ri usul: Telegram o'zi so'raydi va yorliqni qo'yadi.
     `checkHomeScreenStatus()` allaqachon qo'shilganini bilsa tugma
     ko'rsatilmaydi.
  2. **Brauzer PWA** — `beforeinstallprompt` (Telegramdan tashqarida).
  3. Ikkalasi ham bo'lmasa — qo'lda qo'shish yo'riqnomasi.
  Service worker faqat QOBIQNI keshlaydi (HTML/CSS/JS/ikonka) — katalog,
  savat va buyurtma har doim tarmoqdan olinadi, eski narx ko'rsatilmaydi.

  **Telegramsiz ham ishlaydi.** Yorliq bosilganda ilova brauzerda
  ochiladi va telefon raqami so'raladi. Raqam kiritilgach botga
  tasdiqlash so'rovi (✅ Ha, bu men / 🚫 Men emas) va **4 xonali kod**
  keladi — kod ekrandagi bilan mos kelsagina tasdiqlanadi. Tasdiqdan
  keyin brauzerga 60 kunlik seans beriladi va ilova Chrome'da ham,
  bosh ekrandagi yorliqda ham xuddi oddiy ilovadek ishlaydi.

  Parol yo'q: u yo'qoladi, o'g'irlanadi va tiklashni talab qiladi.
  Kirish faqat botdan ro'yxatdan o'tgan va telefoni tasdiqlangan
  odam uchun — raqamni bilgan begona kira olmaydi, chunki tasdiqni
  telefonidagi Telegram beradi. Token bazada XOM saqlanmaydi, faqat
  sha256 xeshi turadi. Bitta IP dan 15 daqiqada 5 ta urinish.

  ⚠️ **Qisqa nom faqat YORLIQ uchun.** Botdagi «Do'kon» tugmasi har
  doim `web_app` bo'lib qoladi va hech qanday sozlamaga bog'liq emas:
  qisqa nom BotFather'da ro'yxatdan o'tmagan bo'lsa `t.me/<bot>/<nom>`
  o'lik havola bo'lib, do'kon umuman ochilmay qolardi. Telegram yorliqni
  ilova QANDAY ochilganiga qarab yasaydi: `web_app` tugmasidan ochilgan
  ilova bot suhbatiga bog'lanadi, shuning uchun yorliq ham bot suhbatini
  ochadi. To'g'ridan-to'g'ri havoladan (`t.me/<bot>/<nom>`) ochilgani
  esa ilovaning o'ziga bog'lanadi. Qisqa nomni BotFather beradi:
  `/mybots` → bot → **Bot Settings** → **Configure Mini App** →
  **Enable**. Keyin uni admin panelning **«Mini App qisqa nomi»**
  bo'limiga yozasiz — botdagi «Do'kon» tugmasi o'sha havolaga aylanadi.

  `/app/ochish` — Telegramdagi ilovaga yo'naltiradigan manzil;
  kirish ekranidagi «Telegramda ochish» tugmasi shuni ishlatadi.
- **Profil** — Telegram avatari, ism va statistika. Bo'limlar YOPIQ
  turadi va bosilganda ochiladi: shaxsiy ma'lumot (tahrirlanadi),
  **terim va sog'liq** (teri turi, allergiya, kasallik — AI shularni
  hisobga oladi), **manzilim** (viloyat, tuman, ko'cha — buyurtmada
  tayyor turadi), buyurtmalar tarixi, aloqa va yordam.
- **Skaner sahifasi sodda**: yuqorida qanday rasm kerakligi KO'RSATILADI,
  ostida bitta qatorlik maslahat, ostida tugma. Ilgari bu yerda to'rtta
  talab va ogohlantirish bor edi — odam o'qimay pastga sirg'ardi.
- **Arzonroq variant.** Tahlil natijasida AI eng MOS mahsulotni beradi,
  lekin u qimmat bo'lishi mumkin. **«Arzonroq variant»** tugmasi har
  bosqichni o'sha bosqichdagi arzonroq (va imkon qadar shu muammoga
  ishlaydigan) mahsulotga almashtiradi va qancha tejalishini ko'rsatadi.
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
- **Natija RASM bo'lib keladi** — rangli sarlavhada surat, yonida taxminiy
  yosh, teri turi va rangi, katta ball va ball halqasi; ostida uchta
  ko'rsatkich (nechta belgi, eng kuchlisi, xavf ehtimoli). Pastda belgilar
  ro'yxati — har biri rangli chiziq, raqam, foiz chizig'i bilan — va tavsiya
  etilgan mahsulotlar **rasmi bilan kichik kartochkalarda**, har birida nima
  uchun kerakligi bir-ikki so'zda (Tozalash, Quyoshdan himoya…).
  Tavsiya soni TERI HOLATIGA qarab: yengil holatda 3-4 ta, ko'p muammo
  topilsa 6-8, og'ir holatda 10 tagacha. Rasmda 6 tasi ikki qatorda
  ko'rinadi, qolgani «va yana N ta — ilovada» deb yoziladi.
  **Ism yozilmaydi:** bitta telefondan bir necha odam surat yuklashi mumkin.
  **Suratga doira chizilmaydi:** belgi qayerdaligi ro'yxatdagi «📍 zona»
  matnida turadi, doira esa suratni bulg'ab, raqamlarni ko'zdan qochirardi.
  Ranglar mavzudan olinadi (pastga qarang).
- **To'lov tasdiqlangach parvarish qo'llanmasi keladi** — ikki ko'rinishda:
  **rasm** (mahsulot surati, qaysi tartibda, qachon — ertalab/kechqurun,
  qanchadan) va **Word hujjati** (to'liq tavsif, tarkib, ehtiyot choralari).
  Odam mahsulotni noto'g'ri ishlatsa natija ko'rmaydi va qaytib kelmaydi;
  qutidagi qog'oz esa yo'qoladi, Telegramdagi doim qo'l ostida turadi.
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
- **Ombor yo'q — pochtadan jo'natiladi.** Mahsulot O'zbekistonga yetib
  kelganda mijozga «bojxonadan o'tdi, jo'natishga tayyorlanmoqda» deb
  xabar boradi va HECH QANDAY manzil va'da qilinmaydi. Jo'natish paytida
  admin buyurtma kartasidagi **«Qayerga jo'natildi?»** maydoniga filial
  manzili yoki kuzatuv raqamini yozadi — o'sha matn mijozga xabar bo'lib
  boradi. Shunday qilib mijoz mavjud bo'lmagan omborga bormaydi.
  Ilgari bu xabar mijozga `{ombor}`, `{manzil}` degan XOM belgilar bilan
  borardi: shablonda o'rin egallovchi bor edi, to'ldiruvchi kod esa yo'q.
  Endi o'rin egallovchilar bitta joyda (`oringaQoy`) to'ldiriladi:
  qiymati yo'q belgi bilan birga butun qator olib tashlanadi, tanilmagan
  belgi esa umuman chiqmaydi.
- **Tahlil bo'limida O'Z suratingiz** ko'rinadi, ostida belgilar ro'yxati
  (sabab va yechim bilan) va tavsiya etilgan mahsulotlar **gorizontal
  lentada**, rasmi va narxi bilan.
- **👤 Profil bo'limi (Mini App)** — ism, telefon, yosh, hudud; nechta tahlil,
  nechta buyurtma va jami qancha xarid qilgani; buyurtmalar tarixi;
  konsultatsiya, yordam, ommaviy oferta va ma'lumotni o'chirish.
- **Buyurtma yo'li ko'rinib turadi** — to'lov tasdiqlandi → Koreyada
  qadoqlanmoqda → Koreyadan jo'natildi → yo'lda → O'zbekistonga yetdi →
  pochtadan jo'natildi → yetib keldi. Har bosqichda xabar keladi.
- **Majburiy obuna** (ixtiyoriy) — kanalga a'zo bo'lmagan foydalanuvchi
  botdan foydalana olmaydi. Kanal havolasi tugmada ham, matnda ham
  ko'rinadi va bot uni o'zi topadi (pastga qarang).

### 📸 Botga skrinshot tashlab mahsulot qo'shish

Admin `/qosh` deb yozadi va Koreya do'konining skrinshotlarini tashlaydi —
bittalab yoki birdaniga yuztasini. Qolganini AI qiladi:

- **nomi, brendi, tavsifi** rasmdan o'qiladi;
- **narxi ham rasmdan** olinadi (`3,200원` → 3200 KRW). Chegirmali narx
  bo'lsa yangisini oladi, narx ko'rinmasa mahsulot o'tkazib yuboriladi —
  o'ylab topilmaydi;
- **og'irligi** hajmdan taxmin qilinadi (100 ml ≈ 120 g);
- **sotuv narxi** narx qoidasi bo'yicha hisoblanadi:
  `KRW × kurs` + `har boshlangan 100 g uchun pochta` + `foyda`,
  1000 so'mgacha yaxlitlanadi. Standart qoidada
  3 200 ₩ va 120 g → 30 400 + 30 000 + foyda ≈ **91 000 so'm**;
- **ombor har biriga 100 dona** qilib belgilanadi;
- mahsulot **mavjud bo'limlarning birortasiga ham tushmasa** (tuk
  oluvchi, pinset, sochiq) — AI **yangi bo'lim ochadi** (`Aksessuar`),
  keyin uni panelda tuzatasiz;
- **poster AI tomonidan avtomatik chiziladi** — import tugagach har
  bir mahsulot uchun skrinshotdan toza studiya posteri yasaladi
  (oq fon, yozuvsiz, 1:1), asl skrinshot esa o'chiriladi. Ya'ni
  do'konda Koreya saytining ekran surati emas, tayyor poster turadi;
- qidiruv kalit so'zlari ham darrov to'ldiriladi.

Navbat **bittalab** ishlanadi (yuzta AI chaqiruvi bir vaqtda ketsa
provayder ham, baza ham bo'g'iladi) va holat xabari yangilanib turadi.
`/tugat` — hisobot: nechtasi qo'shildi, o'rtacha narx, nimalar
o'tkazildi va nima uchun.

Ishonch 60% dan past bo'lsa katalogga chiqarilmaydi: chala o'qilgan
mahsulot do'konda turgani eng yomon variant.

**Uzum Market bilan solishtirish** (ixtiyoriy, `uzum_tekshir`
sozlamasi). Yoqilgan bo'lsa, aynan shu mahsulot Uzum'da topilsa
narxi undan `uzum_arzon_farq` (standart 1 000 so'm) arzon qo'yiladi.
Moslik QAT'IY tekshiriladi — brend va kamida ikkita muhim so'z mos
kelmasa hisobga olinmaydi, chunki noto'g'ri moslik narxni buzadi.
Narx hech qachon tannarx + pochtadan pastga tushmaydi.

**Havolalar keyin.** Skrinshotdan qo'shilgan mahsulotning manba havolasi
yo'q. Admin panelning **«Havolasizlar»** bo'limida nomni bir bosishda
nusxalab (yoki hammasini birdan), do'kondan topib, havolani qo'yasiz —
`/orders` xarid ro'yxati shundan foydalanadi.

**Bo'limlar** — panelning **«Bo'limlar»** bo'limida yangi bo'lim
qo'shiladi, nomi, emojisi va tartibi o'zgartiriladi. AI o'zi ochgan
bo'limlar ham shu yerda ko'rinadi.

### 🧾 Xarid ro'yxati (admin panel)

Botdagi `/orders` BITTA partiyani ko'rsatadi. Paneldagi **Xarid ro'yxati**
esa istalgan oraliq bo'yicha ikkita savolga javob beradi:

- **Mahsulot bo'yicha** — «Koreyadan nimadan nechta olaman». Har qatorda
  nomi, brendi, nechta buyurtmada uchragani, summasi va o'ngda ASOSIY son:
  nechta dona kerak. Qizil nuqta — havolasi yo'q, sariq nuqta — omborda
  yetmaydi. Qatorni bossangiz tannarx, ombor qoldig'i, nomni nusxalash va
  manba sahifasi chiqadi.
- **Viloyat bo'yicha** — «qaysi viloyatga qancha ketadi». Pochtani
  oldindan rejalashtirish uchun. Viloyatni bossangiz ro'yxat o'sha
  viloyatga filtrlanadi.

Filtrlar bitta sirg'aladigan satrda: holat (To'langan / Yangi / Yo'lda /
Yetkazilgan) va davr (7 / 30 / 90 kun / hammasi). Saralash — dona,
buyurtma, summa, ombor yoki nom bo'yicha.

**Eksport — CSV** (Excel'da ochiladi, o'zbekcha harflar buzilmaydi):
- **📨 Telegramga yuborish** — telefonda asosiy yo'l. Telegram WebView
  faylni yuklab ololmaydi, botdan kelgan fayl esa suhbatda qoladi.
- **⬇︎ Yuklab olish** — kompyuterda to'g'ridan-to'g'ri.

Jamlash SQL da bajariladi (`services/xarid-hisobot.js`): buyurtma minglab
bo'lganda ham hammasini xotiraga tortib olib sanamaymiz.

### 🔍 Katalogni tekshirib chiqish

Panelning **Mahsulotlar** bo'limida har karta o'z **posteri** bilan
ko'rinadi va bitta savolga javob beradigan filtrlar bor:

| Filtr | Nimani ko'rsatadi |
|---|---|
| Hali skrinshot | Poster o'rniga Koreya saytining ekran surati turibdi |
| Rasmsiz | Umuman rasm yo'q |
| Nomi inglizcha | O'zbekcha nom yozilmagan |
| Havolasiz | Manba havolasi yo'q — `/orders` uni topolmaydi |
| Omborda yo'q · Sotuvda emas | Mijoz sotib ololmaydi |

«Hali skrinshot» eng muhimi: import paytida AI band bo'lsa yoki yiqilsa
poster chizilmay qoladi va do'konda havaskorona ekran surati turadi.
Bunday kartada **«🎨 Skrinshotdan poster»** tugmasi chiqadi — bir
bosishda qayta chizdiradi.

### Admin uchun (`/admin`)
- **Boshqaruv paneli** — daromad, yalpi foyda va marja, o'rtacha chek,
  foydalanuvchilar, 14 kunlik grafik, voronka (ochgan → ro'yxat → skaner →
  savat → buyurtma), ombor holati.
- **Daromad prognozi** — yo'ldagi buyurtmalar holatiga qarab tortiladi
  (yangi 75%, tasdiqlangan 90%, yo'lda 97%) va tarixiy tugallanish ulushiga
  ko'paytiriladi; oy oxiri prognozi kunlik o'rtachadan chiqariladi.
- **Buyurtmalar** — holatni o'zgartirish, bekor qilishda ombor avtomatik qaytadi.
  «📮 Pochtadan jo'natildi» ni bosganda **qayerga jo'natilgani** so'raladi
  (filial manzili yoki kuzatuv raqami) va mijozga xabar bo'lib boradi.
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
- **🛒 Marketplace** — Daiso va Coupang sahifasidan mahsulotni to'g'ridan-to'g'ri
  olish (pastga qarang). Qo'lda kiritish ham qoladi.
- **Skaner namunasi** — «Yuz skaneri» ekranida ko'rsatiladigan namuna surat.
- **Ilova mavzusi** — ranglarni tanlash (pastga qarang).
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
| `/holat` | **Bot va AI holati — nima yiqilganini ko'rsatadi.** PEER_FLOOD chiqqan bo'lsa qancha qolganini va nima qilish kerakligini aytadi. Pastida AI bo'limi: qaysi provayder, nechta kalit tayyor (dam olayotgani qachon qaytadi), navbat pauzada emasmi, nechta chaqiruv muvaffaqiyatli, va **oxirgi 3 ta xato** — turkumi, qayerda bo'lgani, qachon bo'lgani va aniq matni bilan. Oxirida turkumga qarab **nima qilish kerakligi** yoziladi. Shunday qilib «Xatolik yuz berdi» ning sababini telefonda, Railway loglarini ochmasdan bilib olasiz. |

**Ikkita hujjat** (`/partiya` yoki `/orders` ostidagi tugmalardan):

- **📄 Pochta hujjati** — partiyadagi hamma jo'natma bitta `.docx` da:
  umumiy jadval (kimga, manzil, telefon, buyurtma, summa) va har biri uchun
  qirqiladigan «KIMDAN / KIMGA» yorlig'i. Print qilib pochtaga olib borasiz.
- **📘 Parvarish qo'llanmasi** (`.pdf`) — har mijoz uchun alohida sahifa: u
  AYNAN o'zi olgan mahsulotlarni qaysi tartibda va qanday ishlatishi, faol
  moddalari, ehtiyot choralari — **har biri katta surati bilan**. Print qilib
  har birini o'z qutisiga solasiz. Mahsulot to'g'ri ishlatilsa natija
  ko'rinadi — bu qayta xaridga olib keladi. Mijozga to'lov tasdiqlangach shu
  PDF avtomatik boradi (Word emas: `.docx` ni telefonda hamma ocholmaydi).

### 🎨 Ilova mavzusi (ranglar)

Sozlamalar → **Ilova mavzusi** da ikkita rang tanlanadi: **sarlavha** va
**fon** (uchinchisi — tugmalar uchun urg'u). Tayyor to'plamlar bir bosishda
qo'llanadi (qizil · och yashil, jigarrang · krem, to'q yashil, ko'k,
binafsha, qora), yoki brend kitobingizdagi hex kodni qo'lda kiritasiz.
Jonli ko'rinish darhol ko'rsatib turadi.

Qolgan hamma tuslar — och/to'q variantlar, matn rangi, kartochka foni,
chegara — SHU IKKITASIDAN HISOBLANADI (`src/lib/mavzu.js`). Shuning uchun
admin o'nta rangni qo'lda tanlab, o'qib bo'lmaydigan kombinatsiya yasab
qo'ya olmaydi: matn rangi fon yorqinligiga qarab (WCAG formulasi bilan)
oq yoki qora qilib olinadi.

Bir xil palitra **uch joyda** ishlatiladi: Mini App (CSS o'zgaruvchilari),
tahlil rasmi (SVG) va admin paneldagi ko'rinish — shuning uchun tanlagan
narsangiz aynan shunday chiqadi. Qorong'i rejimda faqat urg'u rangi
o'zgaradi: och fon u yerda ko'zni qamashtiradi.

Muammo darajasining ranglari (qizil / sariq / yashil) mavzuga **bog'liq
emas** — «qizil = yomon» degani hamma joyda bir xil qolishi kerak.

### 🛒 Marketplace — Daiso va Coupang'dan mahsulot olish

Ilgari har bir mahsulot qo'lda kiritilardi. Endi **havolani qo'yasiz** —
server sahifani o'zi o'qiydi, AI kartochkani (nomi, brendi, tarkibi,
qo'llash tartibi, kimga mos, og'irligi, narxi) to'ldiradi, narx qoidaga
ko'ra hisoblanadi va mahsulot **tasdiq navbatiga** tushadi.
**Siz tasdiqlamaguningizcha katalogga tushmaydi.**

#### 🚀 Ommaviy import — yuzlab mahsulot bitta buyruq bilan

Asosiy yo'l shu: **havola qo'yib chiqilmaydi.** Har qatorga **qidiruv
so'zi** yozasiz (koreyscha yaxshiroq topadi: `크림`, `토너`, `세럼`) yoki
bitta bosishda tayyor to'plamni qo'yasiz — **🧴 Kosmetika to'plami**,
**💊 Ichki qabul**. Nechta mahsulot kerakligini aytasiz va
**«Importni boshlash»**. Qolganini server o'zi qiladi: Daiso qidiruvidan
sahifama-sahifa yuradi, har mahsulotni o'qiydi, qoidaga solib ko'radi va
navbatga qo'yadi. Boshqa do'kon uchun bo'lim havolasini qo'ysangiz ham
bo'ladi (sahifalash uchun ichida `{sahifa}`).

- Ish **fonda** ketadi: yuzta mahsulot yarim soatdan ko'p oladi, shuning
  uchun panelni yopsangiz ham to'xtamaydi. Vazifa bazada turadi, **server
  qayta ishga tushsa yarim qolgan joyidan davom etadi**.
- Panelda jonli holat: nechta yig'ildi, nechtasi qoidadan o'tmadi, qaysi
  sahifada, **taxminan qancha vaqt qoldi**. **«To'xtatish»** istalgan
  paytda — topilganlari saqlanib qoladi.
- **Tanaffus** (sukut bo'yicha 1.5 soniya) — do'kon bizni bot deb
  bloklamasligi uchun. Bir vaqtda **bitta** import yuradi.
- Avval olingan mahsulot qayta o'qilmaydi — AI hisobi bekorga yonmaydi.
- **⏰ Avtomatik ishlash.** Jadvalni yoqasiz (qidiruv so'zlari, har necha
  kunda, soat, har safar nechta) — server o'zi qidiradi, filtrlaydi va
  katalogga qo'shadi. Hech narsa bosilmaydi. Ish serverda ketadi va
  qayta ishga tushsa davom etadi.
- **AI rejimi — uchta.** `Tekin`: AI umuman chaqirilmaydi, kartochka
  ro'yxatdagi maydonlardan yig'iladi (nomi, narxi, brendi, rasmi
  tayyor; og'irlik nomdagi `100ml`/`50g` dan; toifa nomdagi koreyscha
  so'zdan: 크림 → krem, 선크림 → quyoshdan himoya). `Tejamkor` (sukut):
  xaritadan chiqmagan mahsulot uchungina AI. `To'liq`: har mahsulotga AI
  — tavsif chiroyliroq, lekin qimmat.
- **AI qachon chaqiriladi.** To'liq rejimda har mahsulot uchun bitta chaqiruv ketadi
  (~1 500 kirish + ~500 chiqish tokeni, Gemini 2.5 Flash). Lekin
  **arzon filtr avval ishlaydi**: narx va sotuvda bor-yo'qligi ro'yxat
  javobida allaqachon bor, shuning uchun narx oralig'idan chiqqani va
  sotuvda yo'g'i **AI'gacha yetmaydi** — ular uchun token sarflanmaydi.
  Panelda «AI chaqiruvi» raqami turadi: nechtasi AI'siz rad etilgani ham
  ko'rinadi. Kosmetikami va og'irligi ro'yxatdan bilinmaydi — ularni
  faqat AI aytadi, shuning uchun bu ikkisi chaqiruvdan keyin tekshiriladi.
- **Har mahsulot uchun alohida so'rov ketmaydi.** Daiso qidiruvi javobida
  nomi, narxi, brendi va rasmi allaqachon bor — yuzta mahsulot yuzta
  so'rov emas, bir necha so'rovda olinadi. Shuning uchun tez va do'kon
  bizni bot deb bloklamaydi. Kartochkada qaysi yo'l ishlagani ko'rinadi:
  **🔎 ro'yxatdan**, **🔌 API** yoki **📄 sahifa**.
- **«Tasdiqni kutmasdan katalogga»** belgisini qo'ysangiz, filtrdan o'tgani
  to'g'ridan-to'g'ri sotuvga tushadi. Qo'ymasangiz navbatda to'planadi va
  **«Navbatdagi N tasini katalogga qo'shish»** tugmasi bilan bir bosishda
  qo'shiladi.

Qo'lda ishlash ham qoladi: **havoladan olish** (20 tagacha havola birdan),
**havolalarni topish** (bo'limdagi havolalarni yig'ib beradi) va
**🤖 agent o'zi yig'sin** (bitta sahifadan 30 tagacha).

Filtr ikki bosqichda: **AI'gacha** — narx oralig'i va sotuv holati
(tekin); **AI'dan keyin** — kosmetikami, og'irligi chegarada-mi va
sahifa qanchalik aniq o'qilgani.

Filtrdan o'tmagani yo'qolmaydi: kosmetika bo'lmagani, og'irligi chegaradan
oshgani va narx oralig'iga tushmagani «rad etildi» bo'lib, **sababi bilan**
ro'yxatda qoladi — ko'pincha muammo mahsulotda emas, chegarada bo'ladi.

**Avval API, keyin sahifa.** Daisomall kabi do'konlar sahifani brauzerda
chizadi — serverga kelgan HTML da mahsulot **yo'q**, u keyin JSON so'rov
bilan tortiladi. Shuning uchun mos qoida bo'lsa avval do'konning **o'z JSON
manzili** so'raladi, u javob bermasa jim sahifaga qaytiladi. Kartochkada
qaysi yo'l ishlagani ko'rinadi: **🔌 API** yoki **📄 sahifa**.

Daiso **rasmiy, hujjatlashtirilgan API bermaydi** — ishlatilayotgani
saytning o'z ichki manzili. Sukut bo'yicha qo'yilgani:

```
GET https://prdm.daisomall.co.kr/ssn/search/FindStoreGoods
    ?searchTerm=<so'z>&cntPerPage=30&pageNum=<sahifa>
```

Javob: `resultSet.result[0].resultDocuments[]`, har elementda `PD_NO`
(raqami), `PDNM` (nomi), `PD_PRC` (narxi), `BRND_NM` (brendi),
`ATCH_FILE_URL` (rasmi). Mahsulot sahifasi:
`https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=<raqam>`.
Eski rasm hosti `img.daisomall.co.kr` avtomatik `cdn.daisomall.co.kr` ga
o'giriladi.

Bu manzil o'zgarishi mumkin, shuning uchun kodda emas,
**Sozlamalar → Do'kon API si** da turadi:

- brauzerda mahsulotni ochib **F12 → Network → Fetch/XHR** da haqiqiy
  manzilni ko'rasiz va qoidaga qo'yasiz — deploy shart emas;
- **«Sinab ko'rish»** tugmasi qaysi manzil chaqirilgani, do'kon nima
  qaytargani va javobning boshini ko'rsatadi;
- qoidada `id_qolip` havoladan mahsulot raqamini ajratadi, `mahsulot_url`
  API manzili (`{id}` o'rniga o'sha raqam qo'yiladi), `sahifa_url` esa
  teskarisi, `id_kalit` — ro'yxat javobida mahsulot id si qaysi kalitda;
- qoidalarni bo'sh massivga aylantirsangiz faqat HTML o'qiladi.

Bo'lim havolasi o'rniga do'konning **ro'yxat API manzilini** bersangiz,
agent mahsulot havolalarini o'sha JSON dan yasaydi — SPA kategoriya
sahifasida havola bo'lmagani uchun bu ko'pincha yagona ishlaydigan yo'l.

Sahifadan o'qiganda ham **CSS selektor ishlatilmaydi**, ma'no o'qiladi:
sarlavha, `og:`/`product:` meta teglari, JSON-LD va ko'rinadigan matn AI ga
beriladi. Do'kon so'rovni rad etsa (HTTP 403 — bot himoyasi), sabab
tushunarli yoziladi va mahsulotni skrinshotdan qo'shish taklif qilinadi.

**Og'irlik chegarasi** (sukut bo'yicha 600 g) va **narx oralig'i** —
Sozlamalardagi maydonlar. Coupang'dan «shu narxdan shu narxgacha» deb
yig'ish uchun oraliqni qo'yib qo'yasiz (0 = cheklovsiz).

### 💰 Narx qoidasi

```
narx = tannarx + yetkazish + sof foyda
```

- **tannarx** — KRW narxi × kurs (sukut bo'yicha 1 KRW = 9.5 so'm);
- **yetkazish** — har **boshlangan 100 g** uchun 15 000 so'm
  (120 g ham, 200 g ham ikki bo'lak);
- **sof foyda** — tannarx va yetkazishdan foizda (35%), lekin **eng kam
  30 000** va **eng ko'p 50 000** so'mdan chiqmaydi. Chegara shuning uchun:
  arzon kichik tovarda foiz mehnatni qoplamaydi, qimmat kremda esa narxni
  haddan oshirib yuboradi.
- natija **1 000 so'mgacha yuqoriga yaxlitlanadi**.

Hamma raqam Sozlamalardan o'zgartiriladi va uchta misol jonli hisoblanib
turadi. Qoida `src/lib/narx.js` da — bitta joyda, chunki u marketplace,
qo'lda qo'shish va tasdiqlashda bir xil ishlatiladi.

### 💊 Ichki qabul mahsulotlari

Kollagen, jenshen, vitamin va shunga o'xshash **ichish uchun** qo'shimchalar
alohida `ichimlik` toifasida va parvarish tartibida alohida **`ichki`**
bosqichda turadi. AI tavsiya berganda **to'liq set** beradi (tozalash →
namlash → himoya, kerak bo'lsa davolash), va **katalogda mos mahsulot bo'lsa
hamda muammo bilan mantiqan bog'lansa** ustiga ichki qabulni qo'shadi.
U hech qachon «davolaydi» deb ko'rsatilmaydi — bu qo'shimcha, dori emas.

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


### Zaxira modellar — bittasi tugasa ikkinchisi ishlaydi

Google'da **har modelning o'z kvotasi bor**. Shuning uchun skaner va
maslahatchi ishlamay qolib, poster generatsiyasi ishlayverishi mumkin:
JSON chaqiruvlar matn modeliga (`gemini-3.8-flash`), rasm chizish esa
rasm modeliga (`gemini-*-image`) ketadi.

Endi matn modeli bitta emas, **ro'yxat**:

```
gemini-3.8-flash → 3.7 → 3.6 → 3.5 → 3.5-flash-lite
                 → 3.1-flash-lite → 3-flash-preview
```

Asosiysi 429 bersa keyingisiga **darrov** o'tiladi va tugagani vaqtincha
chetga qo'yiladi. Bu kalit qo'shishdan ham tez ishlaydi — hech narsa
sozlash kerak emas.

**Ro'yxat admin panelda tanlanadi** (Tizim holati → 🤖 AI modellari):
tartibni ↑↓ bilan o'zgartirasiz, keraksizini ✕ bilan olib tashlaysiz,
yangisini ro'yxatdan yoki qo'lda qo'shasiz. Rasm chizish modeli ham
shu yerda — u alohida kvotada ishlaydi.

Har model yonida **▶ Sinash** tugmasi bor: u HAQIQIY chaqiruv qiladi va
uchta savolga birdan javob beradi — nomi to'g'rimi, kalitga ruxsat
berilganmi, kvota qolganmi. Ro'yxatga qo'shishdan oldin tekshirib
ko'rish uchun. Sinov aynan **shu modelni** tekshiradi va zaxiraga
o'tib ketmaydi, aks holda «ishlayapti» degan javob boshqa modelniki
bo'lib qolardi.

«Standartga qaytarish» ro'yxatni koddagi holatga tiklaydi. Muhit
o'zgaruvchilari (`GEMINI_MODEL`, `GEMINI_MODELLAR`) hamon ishlaydi —
ular admin tanlamagan paytdagi standart bo'lib qoladi.

> Kalit noto'g'ri bo'lsa Google **400** qaytaradi, 401 emas. Shuning
> uchun javob tanasidagi `API_KEY_INVALID` alohida tekshiriladi va
> xato «so'rov xatosi» emas, «kalit noto'g'ri» deb ko'rsatiladi.

429 javobining **tanasi endi o'qiladi**: Google u yerda qaysi kvota
tugaganini (`quotaId`) va qancha kutish kerakligini (`retryDelay`)
yozadi. Ilgari tana tashlab yuborilardi va «Google HTTP 429» dan
boshqa hech nima bilinmasdi.

| Kvota | Nima qilinadi | Mijoz nima ko'radi |
|---|---|---|
| **daqiqalik** | model 70 s dam oladi, keyingisiga o'tiladi | «AI limiti vaqtincha tugadi, 10–15 daqiqada urinib ko'ring» |
| **kunlik** | model 1 soatga chetga, keyingisiga o'tiladi | «Bugungi AI limiti tugadi. Ertaga urinib ko'ring» + do'konga havola |

Model **404** bersa (nomi noto'g'ri yoki kalitga ruxsat yo'q) u
ro'yxatdan butunlay chiqariladi — qayta urinish behuda. Ro'yxat
aylanib qayta boshiga qaytmaydi: hammasi tugagan bo'lsa qo'shimcha
so'rov yuborilmaydi, chunki u ham kvota yeydi.

### «Xatolik yuz berdi» endi chiqmaydi

Ichki xato mijozga tushunarli xabarga aylanadi (`src/lib/xatolar.js`).
Har xato turkumining o'z matni bor va u odamga NIMA QILISHNI aytadi.

Ilgari `kvota` (provayder 429 — kunlik limit tugadi) va `tarmoq`
turkumlari uchun matn yo'q edi, shuning uchun eng ko'p uchraydigan
nosozlik mijozga umumiy «⚠️ Xatolik yuz berdi» bo'lib borardi. Mijoz
aybni rasmdan qidirib qayta-qayta urinardi — bu esa cheklovni yanada
uzaytirardi. Endi u «⏳ AI limiti vaqtincha tugadi. 10–15 daqiqadan
so'ng qayta urinib ko'ring» ni ko'radi.

**Admin** esa o'sha xabarning ostida texnik sababni ham ko'radi
(`Google HTTP 429`) va `/holat` ga yo'naltiriladi. Oxirgi 20 ta AI
xatosi xotirada saqlanadi (`src/ai/jurnal.js`) — bazaga yozilmaydi,
chunki bu diagnostika, tarix emas. Kalit jurnalga hech qachon
tushmaydi: URL dagi `key=…` niqoblanadi.


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
    navbat.js          AI navbati: bir vaqtda va daqiqada nechta chaqiruv
    kalitlar.js        bir nechta API kaliti: navbat, chetga qo'yish
    maslahat.js        AI maslahatchi: savol, to'plam, tavsiya
    skrinshot-mahsulot.js  skrinshotdan mahsulot + narx o'qish
    kalit-sozlar.js    qidiruv kalit so'zlari (partiyalab)
  bot/
    index.js           dispetcher
    render.js          tahlil natijasining Telegram ko'rinishi
    format.js          jadval, shkala, matn kengligi hisobi
    handlers/          ro'yxat, skaner, do'kon
  rasm/
    natija-kartochka.js tahlil natijasining SVG ko'rinishi
    qollanma-kartochka.js mijozga boradigan rasmli parvarish qo'llanmasi
    qollanma-sahifa.js  PDF qo'llanmaning A4 sahifalari
    olcham.js          rasmni ekranga mos o'lchamda JPEG qilish
    poster-tuzat.js    posterni nisbatga kesish va yozuvni o'zimiz yozish
    chiz.js            SVG -> PNG (resvg + repozitoriyadagi shriftlar)
  api/
    routes.js          Mini App API (initData imzosi bilan)
    admin.js           admin API (JWT bilan), statistika va prognoz
  lib/
    brend.js           brend nomi va logotipi (bitta manba, keshlanadi)
    bosqichlar.js      buyurtma bosqichlari — bot va panel uchun bitta ro'yxat
    emu-tarif.js       EMU rasmiy tarif kartasi: zonalar va narxlar
    mavzu.js           ilova ranglari: ikki rangdan to‘liq palitra
    narx.js            sotuv narxi: tannarx + yetkazish + sof foyda
    post-korinish.js   agent posti kanalda qanday chiqishini ko‘rsatuvchi sahifa
    docx.js            .docx yozuvchi (ZIP + WordprocessingML), kutubxonasiz
    admin.js           kim admin — bot va admin API uchun bitta javob
    hududlar.js        14 viloyat, 210 tuman — manzil tekshiruvi uchun
    kesh.js            qisqa muddatli kesh (bir vaqtdagi so'rovlarni yig'adi)
    cheklov.js         so'rov cheklagich (sirg'aluvchi oyna)
  services/            tahlil va buyurtma mantiqi (bot ham, API ham ishlatadi)
    partiya.js         xarid partiyalari (/orders)
    yetkazish.js       og'irlik bo'yicha narx (API yoki tarif jadvali)
    pochta-hujjati.js  pochta uchun manzillar hujjati
    xarid-hisobot.js   xarid ro'yxati: mahsulot va viloyat bo'yicha jamlash
    ilova-kirish.js    telefon + botdan tasdiqlash (Telegramsiz seans)
    nom-uz.js          mahsulot nomini o'zbekchalashtirish
    qollanma-hujjati.js mijozga qutiga qo'shiladigan parvarish qo'llanmasi
    mijoz-qollanma.js  to'lovdan keyin qo'llanmani yuborish (rasm + PDF)
    kalit-sozlar.js    qoida + AI dan kalit so'zlarni to'ldirish
    skrinshot-import.js botga tashlangan skrinshotlar navbati
    uzum-narx.js       Uzum Market narxi bilan solishtirish
    broadcast.js       reklama yuborish (tezlik cheklovi bilan)
    majburiy-kanal.js  obuna tekshiruvi
    marketplace.js     Daiso/Coupang dan mahsulot olish va filtrlash
    marketplace-vazifa.js  ommaviy import: fonda, jadval bo'yicha, uzilsa davom etadi
    mahsulot-xarita.js ro'yxat maydonlaridan AI'siz kartochka yig'ish
    dokon-api.js       do'kon JSON API si: qoidalar, id, rasm, ro'yxat
    agent.js           kanal rejasi va post yozish
    agent-jadval.js    kunlik jadval (advisory lock bilan)
public/
  index.html           qo'nish sahifasi
  app/                 Mini App
    manifest.json      PWA: telefon ekraniga o'rnatish
    sw.js              service worker (faqat qobiqni keshlaydi)
    ikon-*.png         o'rnatilgan ilovaning ikonkasi (scripts/ikon-yarat.mjs)
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
  025_kalit_sozlar…    qidiruv kalit so'zlari + profil (allergiya)
  026_reyting_sevimli  manba reytingi va sevimlilar
  027_mavzu_kiovo      yangi standart mavzu (oq fon, yorqin qizil)
  028_sharhlar         haqiqiy sharhlar + reyting triggeri
  029_ilova_kirish     kirish so'rovlari va brauzer seanslari
  030_nom_uz           mahsulotning o'zbekcha nomi
  031_toifa_ikon       bo'lim ikonkasi (filtr doirasi uchun)
```

Yangi o'zgarish kerak bo'lsa **yangi** migratsiya fayli qo'shing
(`004_...sql`) — qo'llangan faylni tahrirlamang, u qayta bajarilmaydi.

`npm run check` — deploy oldidan fayllar, sxema va koddagi kalitlarni tekshiradi.
`npm test` — barcha sinovlar (EMU tarifi, bot oqimi, operatsiya, agent,
AI maslahatchi, skrinshotdan import).

---

## Muhim texnik qarorlar

### Yangilanish nega ko'rinmasdi (kesh)

`index.html` har safar yangi kelardi, lekin `app.js` va `style.css`
oddiy manzilda turgani uchun **Telegram ichidagi brauzer ularning
eskisini saqlab qolardi**. Natijada yangi HTML eski kod bilan ishlab,
o'zgarishlar umuman ko'rinmasdi.

Endi server fayllar mazmunidan qisqa xesh hisoblaydi va havolaga
qo'shadi: `app.js?v=a89f40c9`. Kod o'zgarsa manzil ham o'zgaradi va
brauzer yangisini majburan oladi:

- versiyalangan manzil — `max-age=31536000, immutable` (bir yil);
- versiyasiz manzil — `no-cache, must-revalidate`;
- `sw.js` ichiga ham versiya yoziladi, shuning uchun har deployda
  service worker qayta o'rnatiladi va eski kesh o'chiriladi.

Deploydan keyin o'zgarish ko'rinmasa — birinchi navbatda javob
sarlavhasidagi `X-Ilova-Versiya` ni tekshiring.

### AI javobi uzilib qolsa

Model javobi `MAX_TOKENS` bilan to'xtasa JSON **yarim** keladi va
albatta buziladi. Ilgari shu yerda darrov xato tashlanardi va mijoz
«🤖 AI javobi tushunarsiz chiqdi» degan xabarni ko'rardi — aslida
shunchaki javob byudjeti yetmagan edi.

Endi `finishReason: MAX_TOKENS` (Google) va `finish_reason: length`
(OpenRouter) alohida ajratiladi: bu «tushunarsiz javob» emas, uzilgan
javob. Har qayta urinishda byudjet **ikki barobar** oshiriladi
(8192 → 16384 → 32768), shuning uchun ikkinchi yoki uchinchi urinish
to'liq javob beradi. Yuz tahlili so'rovining byudjeti ham 3 000 dan
8 000 ga ko'tarildi: tavsiya soni cheklovi olib tashlangach javob
uzayib, eski byudjetga sig'may qolgan edi.

### Boshqa qarorlar

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
yig'adi, `chiz.js` uni resvg bilan PNG ga o'giradi (~170 ms). Ranglar
`src/lib/mavzu.js` palitrasidan keladi — admin panelda tanlangani. Shriftlar
`assets/shrift/` dan yuklanadi, tizimdan EMAS — konteynerda shrift
bo'lmasa matn jimgina yo'qolardi. Rasmda emoji ishlatilmaydi: resvg rangli
emoji shriftini chizmaydi, o'rnida bo'sh kvadrat qoladi.

Rasmning ustki qismida har bir belgi uchun `Sababi:` va `Yechimi:`
satrlari chiqadi — foiz o'zi hech narsa tushuntirmaydi. Pastdagi
mahsulot kartalari esa songa qarab kichrayadi (4 tagacha bitta
qatorga sig'adi, 8 tasi ko'rsatiladi): ikkita katta karta o'rniga
to'liq tavsiya ko'ringani yaxshiroq.

**Bitta AI chaqiruvi.** Modelga katalogning ixcham ro'yxati beriladi, shuning
uchun u mavjud bo'lmagan mahsulotni o'ylab topa olmaydi. Qaytgan `product_id`
lar baribir katalogga solishtiriladi; SPF bosqichi tushib qolsa server o'zi
qo'shadi.

**Qo'llanma PDF i ham kutubxonasiz.** Matnli PDF yozish uchun shriftni
fayl ichiga joylash, CMap va glif jadvallarini qo'lda qurish kerak
bo'lardi — o'zbekcha `oʻ`, `gʻ` belgilarida bu eng tez sinadigan joy.
Shuning uchun sahifani ALLAQACHON bor SVG → PNG quvuri chizadi
(`qollanma-sahifa.js` → resvg), `lib/pdf.js` esa PNG larni PDF ga
o'raydi: PNG ochiladi (zlib), qator filtrlari yechiladi, alfa oq fonga
qo'shiladi va xom RGB qayta siqiladi. Natija — A4, mahsulot suratlari
bilan, brend ranglarida. Matn tanlanmaydi, lekin telefonda o'qiladigan
qo'llanma uchun bu muhim emas.

**Rasmlar bazada, lekin ekranga mos o'lchamda beriladi.** Fayllar
`media` jadvalida `bytea` bo'lib yotadi — alohida saqlash xizmati
(S3) sozlash shart emas, ulanish satridan boshqa hech narsa kerak
emas. Muammosi: AI dan kelgan poster 1024px PNG, ya'ni **1–2 MB**,
kartochka esa telefonda ~150px. Kerak bo'lganidan yigirma barobar
ko'p bayt — ilova «sekin ishlashi»ning asosiy sababi shu edi.

Endi `/media/<id>?w=400` kerakli kenglikdagi **JPEG** qaytaradi:
368 KB → **6.6 KB** (56 barobar). Do'kon sahifasi 7 MB o'rniga
130 KB yuklaydi. Quvur: PNG → resvg bilan kichraytirish → xom RGB
→ JPEG. JPEG kodlovchi `lib/jpeg.js` da — kutubxonasiz, standart
Annex K jadvallari va 4:2:0 subsemplash bilan (Node'da JPEG
kodlovchi yo'q, resvg esa faqat PNG chiqaradi).

Kichraytirilgan rasm **xotirada keshlanadi** (`lib/media-kesh.js`,
LRU, standart 96 MB): birinchi so'rovdan keyin na baza, na protsessor
bezovta qilinadi — ikkinchi so'rov 1 ms. Faqat 200/400/800 px
ruxsat etilgan: har xil o'lchamni chizaverish protsessorni yeydi.
Chek va tahlil natijasi keshlanmaydi — ular maxfiy.

**AI chaqiruvlari bitta navbatdan o'tadi.** Minglab odam bir vaqtda
skaner yoki maslahatchini ochsa, minglab bir vaqtdagi chaqiruv
provayderdan 429 oldiradi va kunlik kvotani bir necha daqiqada
tugatadi. `ai/navbat.js` to'rtta chegara qo'yadi:

| Chegara | Standart | Muhit o'zgaruvchisi |
|---|---|---|
| Bir vaqtda ketadigan chaqiruv | 6 × kalit soni | `AI_BIR_VAQTDA` |
| Daqiqadagi chaqiruv (token-chelak) | 60 × kalit soni | `AI_DAQIQADA` |
| Navbatda kutishi mumkin bo'lganlar | 120 | `AI_NAVBAT_MAKS` |
| Navbatda maksimal kutish | 25 s | `AI_KUTISH_MS` |

**Bir nechta AI kaliti.** `GEMINI_API_KEY` va `OPENROUTER_API_KEY` ga
vergul bilan bir nechta kalit yozish mumkin:
`GEMINI_API_KEY="kalit1,kalit2,kalit3"`. Har kalitning o'z kunlik
kvotasi bor, shuning uchun **chegara kalitlar soniga ko'paytiriladi** —
uchta kalit = uch barobar o'tkazuvchanlik (muhitda aniq son berilgan
bo'lsa u o'zgarmaydi).

Kalitlar NAVBAT bilan ishlatiladi, ya'ni yuk teng taqsimlanadi. Kvotasi
tugagani (`429`) 10 daqiqaga, noto'g'ri kaliti (`401/403`) bir soatga
chetga qo'yiladi va so'rov **darrov keyingi kalit bilan** qaytariladi —
bitta kalit tufayli ilova AI'siz qolmaydi. Hammasi chetda bo'lsa ham
eng erta bo'shaydigani beriladi: «kalit yo'q» deb to'xtagandan ko'ra
urinib ko'rgan yaxshi. Holat admin panelda ko'rinadi, kalitning o'zi
esa hech qachon — faqat oxirgi 4 belgi (`…1234`).

Navbat to'lsa yoki kutish uzaysa so'rov **darrov rad etiladi**
(«⏳ AI hozir band, 1–2 daqiqadan keyin urinib ko'ring») — odam besh
daqiqa aylanani kuzatgandan ko'ra aniq javobni afzal ko'radi.
Provayder 429 bersa BUTUN navbat pauza qiladi: bu cheklovdan
chiqishning yagona yo'li, aks holda navbatdagi yuzta so'rov ketma-ket
urilib uni uzaytiradi. Admin ishlari (import, poster, nom o'girish)
navbat BOSHIGA tushadi — mijoz kutmaydi, admin esa o'zi boshlagan
ishining tugashini kutib turadi.

Foydalanuvchining shaxsiy cheklovlari (kunlik tahlil limiti,
maslahatchiga 10 daqiqada 20 savol) o'z joyida: ular BITTA odamdan
himoya qiladi, navbat esa hammasidan birgalikda. Holat admin
panelning **Tizim holati** bo'limida ko'rinadi.

**Telegramga har so'rov qayta uriniladi.** Railway'dan `api.telegram.org`
ga ulanish uzilib turadi va ilgari bitta `fetch failed` butun buyruqni
yo'q qilardi: admin `/orders` yozsa CHATDA HECH NARSA ko'rinmasdi.
Endi `tg()` uch marta uriniladi (0.4s → 1.2s), 25 soniyalik vaqt
chegarasi bor va **hech qachon istisno tashlamaydi** — chaqiruvchi
`{ ok:false, description:'TARMOQ: …' }` ni ko'radi va o'zi qaror qiladi.

**Uzun xabar bo'linadi.** Telegram 4096 belgidan uzunini rad etadi —
xarid ro'yxati o'sganda admin jim qolardi. `yubor()` matnni qator
chegarasidan bo'ladi, tugmalarni oxirgi bo'lakka qo'yadi. HTML buzilgan
bo'lsa (`can't parse entities`) xabar teglarsiz qayta yuboriladi:
bo'sh chat eng yomon variant.

**PEER_FLOOD — Telegramning bot ustidagi spam cheklovi.** Bu 429 emas:
429 bir necha soniyada o'tadi, PEER_FLOOD esa soatlab turadi va
cheklov paytida YANA URINISH uni uzaytiradi. Shuning uchun
`lib/flood.js` sovish oynasini yuritadi (15 daqiqadan boshlab, har
takrorlanishda ikki barobar, 6 soatgacha): oyna ochiq turganda
ommaviy yuborishlar — reklama, bosqich xabarlari — Telegramga umuman
bormaydi, mijozning savoliga javob esa ketaveradi (odamni javobsiz
qoldirish undan battar).

Cheklovga olib kelgan asosiy sabab tuzatildi: partiya bosqichi
o'zgarganda mijozlarga xabar `for (...) mijozgaBosqich(...)` bilan
HAMMASI BIR VAQTDA ketardi — qirq buyurtmali partiya Telegramga qirqta
bir vaqtdagi so'rov yuborardi. Endi birma-bir, soniyada 10 tadan.
Reklama tezligi ham 20 dan 10 ga tushdi va birinchi PEER_FLOOD da
to'xtaydi (yuborish `toxtatildi` holatida saqlanadi). Admin `/holat`
bilan cheklov bor-yo'qligini va qancha qolganini ko'radi.

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
