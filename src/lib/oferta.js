// Ommaviy oferta sahifasi.
// ⚠️ Bu — SHABLON. Ishga tushirishdan oldin yurist ko'rib chiqishi va
// [KVADRAT QAVSDAGI] joylar to'ldirilishi shart.
const T = {
  nom: '[MCHJ / YaTT TO‘LIQ NOMI]',
  stir: '[STIR]',
  manzil: '[YURIDIK MANZIL]',
  telefon: '[+998 __ ___ __ __]',
  epochta: '[email@example.uz]',
};

export function ofertaSahifasi() {
  const b = (s) => `<strong>${s}</strong>`;
  return `<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ommaviy oferta — KiOVO</title>
<style>
  :root{--fon:#fbfaf9;--matn:#1c1a19;--kul:#6b6663;--chiziq:#e6e1dd;--urgu:#8a5a3d}
  @media (prefers-color-scheme:dark){:root{--fon:#151312;--matn:#eceae8;--kul:#9b9490;--chiziq:#2c2826;--urgu:#c99a72}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--fon);color:var(--matn);
       font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       padding:32px 20px 64px}
  main{max-width:680px;margin:0 auto}
  h1{font-size:26px;line-height:1.25;margin:0 0 6px}
  .sana{color:var(--kul);font-size:14px;margin-bottom:28px}
  h2{font-size:17px;margin:34px 0 10px;padding-top:18px;border-top:1px solid var(--chiziq)}
  p,li{color:var(--matn)}
  ul{padding-left:20px}
  li{margin:6px 0}
  .esl{background:color-mix(in srgb,var(--urgu) 10%,transparent);
       border-left:3px solid var(--urgu);padding:14px 16px;border-radius:0 8px 8px 0;margin:22px 0;font-size:15px}
  strong{font-weight:600}
  footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--chiziq);color:var(--kul);font-size:14px}
</style></head><body><main>

<h1>Ommaviy oferta</h1>
<div class="sana">KiOVO — Koreya kosmetikasi · Tahrir 1.0</div>

<p>Ushbu hujjat ${b(T.nom)} (keyingi o‘rinlarda — «Sotuvchi») tomonidan
noma’lum shaxslar doirasiga qaratilgan ommaviy taklif (oferta) hisoblanadi.
Telegram botda «Barchasiga roziman» tugmasini bosish — ushbu shartlarni
to‘liq va so‘zsiz qabul qilish (aksept) deb hisoblanadi.</p>

<h2>1. Umumiy qoidalar</h2>
<ul>
  <li>Sotuvchi: ${b(T.nom)}, STIR ${T.stir}, manzil: ${T.manzil}.</li>
  <li>Xizmat: Koreya kosmetikasi mahsulotlarini chakana sotish va AI yordamida
      teri holatini axborot maqsadida tahlil qilish.</li>
  <li>Xaridor — ushbu ofertani qabul qilgan 18 yoshdan katta jismoniy shaxs.
      18 yoshgacha — qonuniy vakil roziligi bilan.</li>
</ul>

<h2>2. AI tahlili haqida muhim ogohlantirish</h2>
<div class="esl">
  Bot taqdim etadigan teri tahlili — ${b('tibbiy xizmat emas')} va
  ${b('tashxis hisoblanmaydi')}. Natija axborot-maslahat xarakteriga ega
  bo‘lib, kosmetik parvarish tanlashga yordam berish uchun mo‘ljallangan.
  U shifokor ko‘rigi o‘rnini bosmaydi. Teridagi jiddiy yoki tez o‘zgarayotgan
  belgilarda dermatologga murojaat qiling. Sotuvchi tahlil natijalariga
  asoslangan qarorlar uchun tibbiy javobgarlik olmaydi.
</div>

<h2>3. Shaxsiy ma’lumotlar</h2>
<p>Ofertani qabul qilish bilan Xaridor quyidagi ma’lumotlarni qayta ishlashga
rozilik bildiradi:</p>
<ul>
  <li>ism-familiya, telefon raqami, yosh, yetkazib berish manzili;</li>
  <li>Telegram identifikatori va foydalanuvchi nomi;</li>
  <li>buyurtmalar tarixi;</li>
  <li>yuz surati — ${b('faqat tahlil momentida')}.</li>
</ul>
<p>${b('Yuz surati serverda saqlanmaydi.')} Surat tahlil uchun qayta ishlanadi
va darhol o‘chiriladi; bazada faqat tahlilning matnli natijasi (teri turi,
aniqlangan muammolar, tavsiyalar) qoladi.</p>
<p>Tahlil uchun surat Google LLC ning Gemini xizmatiga uzatiladi. Bu —
ma’lumotlarning chegaradan tashqariga uzatilishi bo‘lib, Xaridor ofertani
qabul qilish orqali bunga alohida rozilik bildiradi. Rozilik bermaslik uchun
skanerdan foydalanmang — do‘konning qolgan qismi shusiz ham ishlaydi.</p>
<p>Maqsadi: buyurtmani rasmiylashtirish, yetkazib berish, mijozga xizmat
ko‘rsatish va tavsiyalarni shakllantirish. Ma’lumotlar uchinchi shaxslarga
sotilmaydi; faqat yetkazib berish xizmatiga zarur hajmda beriladi.</p>
<p>Xaridor istalgan vaqtda botda <code>/ochir</code> buyrug‘i orqali o‘z
ma’lumotlarini o‘chirishi mumkin. Buyurtmalar to‘g‘risidagi hisob hujjatlari
qonun talab qilgan muddat davomida saqlanadi.</p>

<h2>4. Buyurtma va to‘lov</h2>
<ul>
  <li>Buyurtma bot yoki Mini App orqali rasmiylashtiriladi.</li>
  <li>Narx buyurtma berilgan paytdagi narx bo‘yicha qat’iylashadi.</li>
  <li>To‘lov: yetkazib berishda naqd yoki kelishilgan boshqa usulda.</li>
  <li>Yetkazib berish narxi va muddati buyurtma tasdiqlanganda ma’lum qilinadi.</li>
</ul>

<h2>5. Mahsulot sifati va qaytarish</h2>
<ul>
  <li>Barcha mahsulotlar original bo‘lib, muvofiqlik hujjatlariga ega.</li>
  <li>Ochilmagan va butligi buzilmagan mahsulotni qabul qilingandan keyin
      ${b('10 kun')} ichida qaytarish mumkin.</li>
  <li>Gigiyena talablari sababli ochilgan kosmetika almashtirilmaydi va
      qaytarilmaydi — nuqsonli yoki muddati o‘tgan holatlar bundan mustasno.</li>
  <li>Individual allergik reaksiya mahsulot nuqsoni hisoblanmaydi. Yangi
      vositani avval qo‘l terisida sinab ko‘rish tavsiya etiladi.</li>
</ul>

<h2>6. Javobgarlik</h2>
<p>Sotuvchi mahsulotning originalligi, sifati va o‘z vaqtida yetkazilishi
uchun javob beradi. Sotuvchi tavsiya etilgan mahsulotlarni yo‘riqnomaga
zid ishlatish, shuningdek Xaridorning individual sog‘liq holati bilan
bog‘liq oqibatlar uchun javobgar emas.</p>

<h2>7. Yakuniy qoidalar</h2>
<p>Oferta shartlari bir tomonlama o‘zgartirilishi mumkin; yangi tahrir shu
sahifada e’lon qilinadi. Nizolar muzokara yo‘li bilan, kelishuvga
erishilmasa — O‘zbekiston Respublikasi qonunchiligiga muvofiq hal etiladi.</p>

<footer>
  ${b(T.nom)}<br>
  STIR: ${T.stir} · ${T.manzil}<br>
  Tel: ${T.telefon} · ${T.epochta}
</footer>

</main></body></html>`;
}
