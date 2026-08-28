// Botning barcha matnlari — STANDART qiymatlari.
// Bu yagona manba: server ishga tushganda yetishmagan shablonlar shu yerdan
// bazaga qo'yiladi, admin panelidagi «Standartga qaytarish» ham shu yerdan oladi.
// Admin bazadagi qiymatni o'zgartirsa, bu fayl unga tegmaydi.

export const GURUHLAR = [
  {
    nom: '🔬 Tahlil natijasi',
    izoh: 'Yuz skanerlangandan keyin botda chiqadigan xabar.',
    kalitlar: ['xabar_tahlil_bosh', 'xabar_muammolar_sarlavha', 'blok_muammo',
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
    kalitlar: ['xabar_holat_tasdiqlangan', 'xabar_holat_yolda',
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
  xabar_tahlil_bosh: {
    nom: 'Tahlil sarlavhasi',
    izoh: 'Xabarning eng boshi: yosh, teri turi va umumiy ball.',
    orin: ['yosh', 'teri_turi', 'teri_rangi', 'ball', 'baho', 'shkala', 'dokon'],
  },
  xabar_muammolar_sarlavha: { nom: 'Muammolar sarlavhasi', izoh: 'Ro‘yxat oldidan chiqadi.', orin: [] },
  blok_muammo: {
    nom: 'Bitta muammo bloki',
    izoh: 'HAR BIR topilgan muammo uchun takrorlanadi. Eng muhim shablon.',
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
  xabar_tahlil_yakun: { nom: 'Tahlil yakuni', izoh: 'Tavsiyalarga o‘tishdan oldingi jumla.', orin: ['tavsiya_soni'] },
  ogohlantirish_tibbiy: { nom: 'Tibbiy ogohlantirish', izoh: 'Tahlil va yordam oxirida. Olib tashlamang — huquqiy himoya.', orin: [] },

  xabar_start:          { nom: '/start xabari', izoh: 'Bot bilan birinchi uchrashuv.', orin: ['dokon'] },
  xabar_royxat_tugadi:  { nom: 'Ro‘yxat tugadi', izoh: 'Rozilik berilgandan keyin.', orin: ['ism'] },
  xabar_skaner:         { nom: 'Skaner ko‘rsatmasi', izoh: '«Yuz skaneri» bosilganda.', orin: [] },
  xabar_rad:            { nom: 'Rasm rad etildi', izoh: 'Rasm sifati talabga javob bermasa.', orin: ['emoji', 'sabab'] },

  xabar_holat_tasdiqlangan: { nom: 'Tasdiqlandi', izoh: '', orin: ['raqam'] },
  xabar_holat_yolda:        { nom: 'Yo‘lda',      izoh: '', orin: ['raqam'] },
  xabar_holat_yetkazildi:   { nom: 'Yetkazildi',  izoh: '', orin: ['raqam'] },
  xabar_holat_bekor:        { nom: 'Bekor qilindi', izoh: 'Sabab yozsangiz {sabab} ga tushadi.', orin: ['raqam', 'sabab'] },
  xabar_tolov_tasdiq:       { nom: 'To‘lov tasdiqlandi', izoh: 'Chek qabul qilinganda.', orin: ['raqam'] },

  xabar_konsultatsiya: { nom: 'Konsultatsiya', izoh: '', orin: [] },
  xabar_yordam:        { nom: 'Yordam',        izoh: '', orin: [] },
};

export const STANDART = {
  xabar_start:
`👋 <b>{dokon}</b> — Koreya kosmetikasi

Yuzingizni AI bilan tekshirib, aynan sizga mos parvarishni tuzib beraman.

Avval qisqa tanishamiz — <b>3 ta savol</b>, yarim daqiqa.

<b>1/3</b> · Telefon raqamingizni ulashing 👇`,

  xabar_royxat_tugadi:
`🎉 <b>Tayyor, {ism}!</b>

Endi <b>🔬 Yuz skaneri</b> ni bosing va yuzingiz aniq ko‘ringan surat yuboring.

Men aytib beraman:
👤 taxminiy yosh va teri turingizni
🔍 qanday muammolar borligini va qanchalik kuchliligini
⏳ e’tibor bermasangiz nima bo‘lishini
💡 qaysi mahsulot, qaysi tartibda va nega kerakligini`,

  xabar_skaner:
`🔬 <b>Yuz skaneri</b>

Yuzingiz aniq ko‘ringan surat yuboring 📸

☀️ Yorug‘ joyda — deraza oldida
🤳 Yaqindan — yuz kadrni to‘ldirsin
👀 To‘g‘riga qarang
🧼 Pardozsiz va filtrsiz

<i>Xira, uzoq, ekrandan olingan yoki AI chizgan rasm qabul qilinmaydi.</i>`,

  xabar_tahlil_bosh:
`🔬 <b>Tahlil tayyor</b>

👤 {yosh} yosh · {teri_turi} teri
🎨 {teri_rangi}

✨ <b>Teri holati: {ball}/100</b> — {baho}
{shkala}`,

  xabar_muammolar_sarlavha: `🔍 <b>Nima topdim</b>`,

  blok_muammo:
`{nuqta} <b>{nom}</b>
{shkala} {foiz}%
📍 {zona}
🔎 <i>Sababi:</i> {sabab}
✅ <i>Yechimi:</i> {yechim}`,

  blok_ogohlantirish: `⚠️ <i>{ogohlantirish}</i>`,

  xabar_prognoz_sarlavha: `⏳ <b>Agar e’tibor bermasangiz</b>`,

  blok_prognoz:
`{shkala} {ehtimol}% · {muddat}
<b>{muammo}</b> → {natija}`,

  xabar_tahlil_yakun:
`💡 Sizga <b>{tavsiya_soni} ta mahsulot</b> tanladim.
Nega aynan shular kerakligini ilovada o‘qing 👇`,

  ogohlantirish_tibbiy:
`⚕️ <i>Bu AI bahosi, tibbiy tashxis emas. Jiddiy yoki tez o‘zgarayotgan belgilarda dermatologga murojaat qiling.</i>`,

  xabar_rad:
`{emoji} <b>Bu rasm to‘g‘ri kelmadi</b>

{sabab}

☀️ Yorug‘ joyda   🤳 Yaqindan
👀 To‘g‘riga qarang   🧼 Pardozsiz

📸 Yangi rasm yuboring.`,

  xabar_konsultatsiya:
`💬 <b>Konsultatsiya</b>

Savolingiz bormi? Menejerimiz javob beradi:

🧴 qaysi mahsulot sizga mos
🔄 mahsulotlarni birga ishlatsa bo‘ladimi
🚚 yetkazib berish va to‘lov
↩️ almashtirish va qaytarish

<i>Odatda 1 soat ichida javob beramiz.</i>`,

  xabar_yordam:
`ℹ️ <b>Yordam</b>

🔬 <b>Yuz skaneri</b> — rasm yuboring, teri holatini tahlil qilaman
🛍 <b>Do‘kon</b> — katalog, qidiruv va narx bo‘yicha filtr
🛒 <b>Savat</b> — buyurtma berish
💬 <b>Konsultatsiya</b> — menejer bilan bog‘lanish

<b>Buyruqlar</b>
/start — boshlash
/skaner — yuz tahlili
/qayta — ma’lumotni yangilash
/ochir — ma’lumotimni o‘chirish`,

  xabar_holat_tasdiqlangan: `✅ <b>{raqam}</b> buyurtmangiz tasdiqlandi. Tayyorlanmoqda.`,
  xabar_holat_yolda:        `🚚 <b>{raqam}</b> buyurtmangiz yo‘lga chiqdi. Kuryer bog‘lanadi.`,
  xabar_holat_yetkazildi:   `📦 <b>{raqam}</b> yetkazildi. Xaridingiz uchun rahmat! 🌸`,
  xabar_holat_bekor:        `❌ <b>{raqam}</b> bekor qilindi.{sabab}`,
  xabar_tolov_tasdiq:       `✅ <b>{raqam}</b> — to‘lovingiz tasdiqlandi. Rahmat! 🌸`,
};
