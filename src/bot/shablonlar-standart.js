// Botning barcha matnlari — STANDART qiymatlari.
// Bu yagona manba: server ishga tushganda yetishmagan shablonlar shu yerdan
// bazaga qo'yiladi, admin panelidagi «Standartga qaytarish» ham shu yerdan oladi.
// Admin bazadagi qiymatni o'zgartirsa, bu fayl unga tegmaydi.

export const GURUHLAR = [
  {
    nom: '🔬 Tahlil natijasi',
    izoh: 'Yuz skanerlangandan keyin botda chiqadigan xabar.',
    kalitlar: ['xabar_tahlil_qisqa', 'xabar_tahlil_bosh', 'xabar_muammolar_sarlavha', 'blok_muammo',
               'blok_ogohlantirish', 'xabar_prognoz_sarlavha', 'blok_prognoz',
               'xabar_tahlil_yakun', 'ogohlantirish_tibbiy'],
  },
  {
    nom: '👋 Tanishuv',
    izoh: 'Birinchi uchrashuv va ro‘yxatdan o‘tish.',
    kalitlar: ['xabar_start', 'xabar_royxat_tugadi', 'xabar_skaner', 'xabar_rad'],
  },
  {
    nom: '📦 Buyurtma holatlari',
    izoh: 'Admin panelda holatni o‘zgartirganingizda mijozga boradigan xabar.',
    kalitlar: ['xabar_holat_tasdiqlangan', 'xabar_holat_omborda',
               'xabar_holat_pochta_jonatildi', 'xabar_holat_yolda',
               'xabar_holat_yetkazildi', 'xabar_holat_bekor', 'xabar_tolov_tasdiq'],
  },
  {
    nom: '💬 Boshqa bo‘limlar',
    izoh: 'Menyudagi tugmalar ostidagi matnlar.',
    kalitlar: ['xabar_konsultatsiya', 'xabar_yordam'],
  },
];

/** Har bir shablon: nomi, tushuntirishi va ishlatsa bo'ladigan o'rin egallovchilar. */
export const TAVSIF = {
  xabar_tahlil_qisqa: {
    nom: 'Rasm ostidagi izoh',
    izoh: 'ASOSIY xabar: tahlil rasmi bilan birga ketadi. Qisqa bo‘lsin — '
        + 'teri ma’lumoti va nechta belgi topilgani yetadi, qolgani ilovada. '
        + '{muammolar} qo‘ysangiz ro‘yxat ham chiqadi (Telegram izohni 1024 '
        + 'belgida kesadi, shuning uchun u avtomatik qisqaradi).',
    orin: ['yosh', 'teri_turi', 'teri_rangi', 'ball', 'shkala', 'muammo_soni',
           'eng_kuchli', 'tavsiya_soni', 'muammolar'],
  },
  xabar_tahlil_bosh: {
    nom: 'Tahlil sarlavhasi (zaxira)',
    izoh: 'Rasm chizilmagan holatda ishlatiladigan to‘liq matnning boshi.',
    orin: ['yosh', 'teri_turi', 'teri_rangi', 'ball', 'baho', 'shkala', 'dokon'],
  },
  xabar_muammolar_sarlavha: { nom: 'Muammolar sarlavhasi', izoh: 'Ro‘yxat oldidan chiqadi.', orin: [] },
  blok_muammo: {
    nom: 'Bitta muammo bloki',
    izoh: 'HAR BIR muammo uchun takrorlanadi. Botda qisqa — sabab va yechim ilovada ko‘rinadi.',
    orin: ['nuqta', 'nom', 'foiz', 'shkala', 'zona', 'izoh', 'sabab', 'yechim'],
  },
  blok_ogohlantirish: {
    nom: 'Muammo ogohlantirishi',
    izoh: 'Muammo blokiga qo‘shiladi — faqat AI ogohlantirish topsa.',
    orin: ['ogohlantirish'],
  },
  xabar_prognoz_sarlavha: { nom: 'Prognoz sarlavhasi', izoh: '«Agar e’tibor bermasangiz» qismi.', orin: [] },
  blok_prognoz: {
    nom: 'Bitta prognoz bloki',
    izoh: 'Har bir prognoz uchun takrorlanadi.',
    orin: ['muammo', 'natija', 'ehtimol', 'muddat', 'shkala'],
  },
  xabar_tahlil_yakun: { nom: 'Tahlil yakuni', izoh: 'Tugmadan oldingi oxirgi jumla — qiziqtirib qo‘yadi.', orin: ['tavsiya_soni'] },
  ogohlantirish_tibbiy: { nom: 'Tibbiy ogohlantirish', izoh: 'Tahlil va yordam oxirida. Olib tashlamang — huquqiy himoya.', orin: [] },

  xabar_start:          { nom: '/start xabari', izoh: 'Bot bilan birinchi uchrashuv.', orin: ['dokon'] },
  xabar_royxat_tugadi:  { nom: 'Ro‘yxat tugadi', izoh: 'Rozilik berilgandan keyin.', orin: ['ism'] },
  xabar_skaner:         { nom: 'Skaner ko‘rsatmasi', izoh: '«Yuz skaneri» bosilganda.', orin: [] },
  xabar_rad:            { nom: 'Rasm rad etildi', izoh: 'Rasm sifati talabga javob bermasa.', orin: ['emoji', 'sabab'] },

  xabar_holat_tasdiqlangan: { nom: 'Tasdiqlandi', izoh: '', orin: ['raqam'] },
  xabar_holat_omborda:      { nom: 'O‘zbekistonga yetib keldi',
    izoh: 'Bojxonadan o‘tdi. Manzil VA’DA QILINMAYDI — u keyingi bosqichda aytiladi.',
    orin: ['raqam'] },
  xabar_holat_pochta_jonatildi: { nom: 'Pochtadan jo‘natildi',
    izoh: 'Qayerga jo‘natilgani buyurtma kartasidagi «Pochta izohi» dan olinadi.',
    orin: ['raqam', 'yetkazish', 'manzil', 'pochta_izoh', 'telefon', 'ish_vaqti'] },
  xabar_holat_yolda:        { nom: 'Yo‘lda',      izoh: '', orin: ['raqam'] },
  xabar_holat_yetkazildi:   { nom: 'Yetkazildi',  izoh: '', orin: ['raqam'] },
  xabar_holat_bekor:        { nom: 'Bekor qilindi', izoh: 'Sabab yozsangiz {sabab} ga tushadi.', orin: ['raqam', 'sabab'] },
  xabar_tolov_tasdiq:       { nom: 'To‘lov tasdiqlandi', izoh: 'Chek qabul qilinganda.', orin: ['raqam'] },

  xabar_konsultatsiya: { nom: 'Konsultatsiya', izoh: 'Telefon va ish vaqti sozlamalardan olinadi.', orin: ['telefon', 'ish_vaqti'] },
  xabar_yordam:        { nom: 'Yordam',        izoh: '', orin: [] },
};

export const STANDART = {
  xabar_start:
`✨ <b>{dokon}</b>

AI bilan terini tekshirib, sizga mos parvarishni tuzib beraman.

<b>1/3</b> · Telefon raqamingiz 👇`,

  xabar_royxat_tugadi:
`🎉 <b>Tayyor, {ism}!</b>

<b>🔬 Yuz skaneri</b> ni bosing va yuzingiz aniq ko‘ringan surat yuboring.`,

  xabar_skaner:
`🔬 <b>Yuz skaneri</b>

Suratingizni yuboring 📸
☀️ Yorug‘ joyda · 🤳 Yaqindan · 🧼 Pardozsiz

<i>Xira yoki uzoqdan olingan rasm qabul qilinmaydi — terining o‘zi ko‘rinishi kerak.</i>`,

  xabar_tahlil_bosh:
`🔬 <b>Tahlil natijasi</b>

👤 {yosh} yosh · {teri_turi} teri
🎨 {teri_rangi}

✨ <b>Teri holati: {ball}/100</b>

{shkala}`,

  // Botda RASM bilan birga ketadigan qisqa izoh — asosiy xabar shu.
  // Batafsili rasmda ko'rinadi, to'liq tafsilot ilovada.
  xabar_tahlil_qisqa:
`🔬 <b>Tahlil natijasi</b>

👤 {yosh} · {teri_turi}
🎨 {teri_rangi}

✨ Teri holati: <b>{ball}/100</b>
{shkala}

🔍 <b>{muammo_soni} ta belgi</b> aniqlandi{eng_kuchli}
💡 Sizga <b>{tavsiya_soni} ta mahsulot</b> tanlandi

<i>Muammolar, sabablari va yechimi — ilovada.
Pastdagi tugmani bosing</i> 👇

⚕️ <i>AI tahlili tibbiy tashxis emas.</i>`,

  xabar_muammolar_sarlavha: `🔍 <b>Aniqlangan muammolar</b>`,

  // Botda faqat NIMA topilgani va QAYERDA. Sababi, yechimi va tavsiya —
  // ilovada: bot xabarining maqsadi odamni ilovaga olib kirish.
  blok_muammo: `{nuqta} <b>{nom}</b> — {foiz}%\n📍 {zona}`,

  blok_ogohlantirish: `⚠️ <i>{ogohlantirish}</i>`,

  xabar_prognoz_sarlavha: `⏳ <b>Hozir e’tibor bermasangiz</b>`,

  blok_prognoz:
`<b>{muammo}</b> → {natija}
<i>{muddat} ichida · {ehtimol}% ehtimol</i>`,

  xabar_tahlil_yakun:
`💡 <b>Siz uchun {tavsiya_soni} ta mahsulot tanlandi</b>

Teri muammolaringizga mos tavsiyalarni ko‘ring 👇`,

  ogohlantirish_tibbiy:
`⚕️ <i>AI tahlili tibbiy tashxis emas.</i>`,

  xabar_rad:
`{emoji} <b>Bu rasm to‘g‘ri kelmadi</b>

{sabab}

📸 Yorug‘ joyda, yaqindan va pardozsiz yangi rasm yuboring —
teri teshiklari va mayda tuklar ko‘rinib tursin.`,

  xabar_konsultatsiya:
`💬 <b>Konsultatsiya</b>

Savolingiz bo‘lsa menejerimiz javob beradi.

📞 {telefon}
🕘 {ish_vaqti}`,

  xabar_yordam:
`ℹ️ <b>Yordam</b>

🔬 <b>Yuz skaneri</b> — rasm yuboring, terini tahlil qilaman
🛍 <b>Do‘kon</b> — katalog, savat, buyurtmalar va profil

<b>Buyruqlar</b>
/start — boshlash
/skaner — yuz tahlili
/qayta — ma’lumotni yangilash
/ochir — ma’lumotimni o‘chirish`,

  xabar_holat_tasdiqlangan: `✅ <b>{raqam}</b> buyurtmangiz tasdiqlandi. Tayyorlanmoqda.`,
  // Bizda OMBOR YO'Q — mahsulot eng yaqin pochtadan jo'natiladi.
  // Aniq joy keyinroq ma'lum bo'ladi, shuning uchun bu xabarda manzil
  // va'da qilinmaydi.
  xabar_holat_omborda:
`📦 <b>{raqam}</b> buyurtmangiz O‘zbekistonga yetib keldi!

Bojxonadan o‘tdi va jo‘natishga tayyorlanmoqda.

<i>Qayerdan olishingizni — eng yaqin pochta filialidanmi yoki
uyingizgami — keyingi xabarda aytamiz.</i>`,
  xabar_holat_pochta_jonatildi:
`📮 <b>{raqam}</b> buyurtmangiz jo‘natildi!

📍 <b>{yetkazish}</b>
{manzil}
{pochta_izoh}

📞 {telefon}
🕘 {ish_vaqti}`,
  xabar_holat_yolda:        `🚚 <b>{raqam}</b> buyurtmangiz yo‘lga chiqdi. Kuryer bog‘lanadi.`,
  xabar_holat_yetkazildi:   `📦 <b>{raqam}</b> yetkazildi. Xaridingiz uchun rahmat! ✨`,
  xabar_holat_bekor:        `❌ <b>{raqam}</b> bekor qilindi.{sabab}`,
  xabar_tolov_tasdiq:       `✅ <b>{raqam}</b> — to‘lovingiz tasdiqlandi. Rahmat! ✨`,
};
