// HUQUQIY SAHIFALAR: oferta, maxfiylik siyosati, hisobni o'chirish.
//
// Google Play uchun uchtasi ham OCHIQ manzilda turishi shart:
//   /maxfiylik          — Play Console → «Privacy policy»
//   /hisobni-ochirish   — Play Console → «Delete account URL»
//   /oferta             — xarid shartlari
//
// Sotuvchi ma'lumoti (ism, maqom, aloqa) admin panelda kiritiladi —
// `settings.sotuvchi`. Ilgari shablonda «[MCHJ / YaTT TO‘LIQ NOMI]»
// kabi kvadrat qavslar to'g'ridan-to'g'ri ochiq sahifada turardi.
// Endi ma'lumot kiritilmagan bo'lsa ham sahifada qavs CHIQMAYDI: brend
// nomi va menejer aloqasi yoziladi, admin panel esa ogohlantiradi.
import { logoSvg } from './logo.js';

export const MAQOMLAR = {
  jismoniy:   'jismoniy shaxs',
  ozini_band: 'o‘zini o‘zi band qilgan shaxs',
  yatt:       'yakka tartibdagi tadbirkor (YaTT)',
  mchj:       'mas’uliyati cheklangan jamiyat (MChJ)',
};

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Sotuvchi haqidagi ma'lumot — sahifada qanday yozilishi.
 * @param {object} xom    settings.sotuvchi
 * @param {object} zaxira {brend, telefon, telegram}
 */
export function sotuvchiMalumoti(xom = {}, zaxira = {}) {
  const x = xom && typeof xom === 'object' ? xom : {};
  const ism = String(x.ism || '').trim();
  const maqom = MAQOMLAR[x.maqom] ? x.maqom : 'jismoniy';
  return {
    toliqmi: Boolean(ism),
    ism,
    maqom,
    maqomNomi: MAQOMLAR[maqom],
    stir: String(x.stir || '').trim(),
    manzil: String(x.manzil || '').trim(),
    telefon: String(x.telefon || zaxira.telefon || '').trim(),
    email: String(x.email || '').trim(),
    telegram: String(zaxira.telegram || '').replace(/^@/, '').trim(),
    brend: String(zaxira.brend || 'KiOVO'),
  };
}

/** «Sotuvchi: Aliyev Aziz, jismoniy shaxs» — yoki ism bo'lmasa brend. */
const sotuvchiQatori = (s) => s.ism
  ? `${esc(s.ism)}, ${esc(s.maqomNomi)}${s.stir ? ` (STIR/JShShIR ${esc(s.stir)})` : ''}`
  : `${esc(s.brend)} do‘koni`;

function aloqaHtml(s) {
  const q = [];
  if (s.telefon) q.push(`Telefon: <a href="tel:${esc(s.telefon.replace(/[^+\d]/g, ''))}">${esc(s.telefon)}</a>`);
  if (s.email) q.push(`Email: <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`);
  if (s.telegram) q.push(`Telegram: <a href="https://t.me/${esc(s.telegram)}">@${esc(s.telegram)}</a>`);
  if (s.manzil) q.push(`Manzil: ${esc(s.manzil)}`);
  return q.length ? q.join('<br>') : 'Aloqa ma’lumoti ilovadagi «Profil → Aloqa va yordam» bo‘limida.';
}

/** Umumiy qobiq — brend ranglari, logotip, sahifalar orasida havola. */
export function huquqiyQobiq({ sarlavha, sana = '', ichi, s, faol = '' }) {
  const havola = (yol, nom) => `<a href="${yol}"${faol === yol ? ' aria-current="page"' : ''}>${nom}</a>`;
  return `<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(sarlavha)} — ${esc(s.brend)}</title>
<meta name="theme-color" content="#ab0a0c">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/umumiy/brend.css">
<style>
  :root{--fon:#fbf8f3;--panel:#fff;--matn:#1d1514;--kul:#5e5451;--chiziq:#ece5dc;--urgu:#ab0a0c;--urgu-och:#fbe9e9}
  @media (prefers-color-scheme:dark){:root{--fon:#120b0b;--panel:#1c1414;--matn:#f6efed;--kul:#b6aaa7;--chiziq:#2f2423;--urgu:#f0575a;--urgu-och:#2c1516}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--fon);color:var(--matn);font:16px/1.7 var(--k-shrift)}
  header{background:var(--k-qizil);color:var(--k-lime);padding:22px 20px 26px;border-radius:0 0 24px 24px}
  header .ich{max-width:720px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
  header a.logo{color:inherit;line-height:0}
  header svg{height:38px;width:auto}
  nav{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  nav a{color:#fff;text-decoration:none;font-size:13.5px;font-weight:700;padding:8px 12px;border-radius:99px;
    background:rgba(255,255,255,.12)}
  nav a[aria-current]{background:var(--k-lime);color:#3b0304}
  main{max-width:720px;margin:0 auto;padding:30px 20px 64px}
  h1{font-size:30px;line-height:1.2;letter-spacing:-.02em;margin:0 0 6px}
  .sana{color:var(--kul);font-size:14px;margin-bottom:26px}
  h2{font-size:18px;margin:34px 0 10px;padding-top:20px;border-top:1px solid var(--chiziq);letter-spacing:-.01em}
  h3{font-size:16px;margin:20px 0 6px}
  ul{padding-left:20px} li{margin:6px 0}
  a{color:var(--urgu)}
  .esl{background:var(--urgu-och);border-left:3px solid var(--urgu);padding:14px 16px;
    border-radius:0 12px 12px 0;margin:20px 0;font-size:15px}
  .qadam{background:var(--panel);border:1px solid var(--chiziq);border-radius:16px;padding:16px 18px;margin:12px 0}
  .tugma{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;
    border-radius:16px;background:var(--k-qizil);color:#fff;font-weight:800;text-decoration:none;margin:8px 0}
  table{width:100%;border-collapse:collapse;font-size:14.5px;margin:12px 0}
  th,td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--chiziq)}
  th{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--kul)}
  footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--chiziq);color:var(--kul);font-size:14px}
  @media (max-width:520px){header .ich{flex-direction:column;align-items:flex-start}nav{justify-content:flex-start}}
</style></head><body>
<header><div class="ich">
  <a class="logo" href="/" aria-label="${esc(s.brend)} bosh sahifa">${logoSvg({ rang: 'currentColor' })}</a>
  <nav>${havola('/oferta', 'Oferta')}${havola('/maxfiylik', 'Maxfiylik')}${havola('/hisobni-ochirish', 'Hisobni o‘chirish')}</nav>
</div></header>
<main>
<h1>${esc(sarlavha)}</h1>
${sana ? `<div class="sana">${esc(sana)}</div>` : ''}
${ichi}
<footer>${sotuvchiQatori(s)}<br>${aloqaHtml(s)}</footer>
</main></body></html>`;
}

// ═══════════════ MAXFIYLIK SIYOSATI ═══════════════
export function maxfiylikSahifasi(s) {
  const b = (t) => `<strong>${t}</strong>`;
  const ichi = `
<p>Ushbu siyosat ${b(esc(s.brend))} ilovasi, Telegram boti va
<b>kiovo.shop</b> sayti (keyingi o‘rinlarda — «Xizmat») qanday ma’lumot
yig‘ishini, nima uchun ishlatishini va siz uni qanday boshqarishingizni
tushuntiradi. Ma’lumot egasi va uni qayta ishlovchi — ${sotuvchiQatori(s)}.</p>

<div class="esl">Qisqasi: yuz suratingiz ${b('faqat sizning tahlilingiz')} uchun
ishlatiladi, reklamada ishlatilmaydi va sotilmaydi. Istalgan payt ilovada
${b('Profil → Hisob va ma’lumotlarim')} bo‘limidan ma’lumotlaringizni yuklab olasiz
yoki hisobingizni butunlay o‘chirasiz.</div>

<h2>1. Qanday ma’lumot yig‘iladi</h2>
<table>
<tr><th>Ma’lumot</th><th>Nima uchun</th></tr>
<tr><td>Ism, telefon raqami, yosh</td><td>Hisob, buyurtma va yetkazib berish, siz bilan bog‘lanish</td></tr>
<tr><td>Email va Google hisob identifikatori (Google bilan kirsangiz)</td><td>Hisobga kirish</td></tr>
<tr><td>Telegram identifikatori va foydalanuvchi nomi (Telegram bilan kirsangiz)</td><td>Hisobga kirish, buyurtma holati haqida xabar</td></tr>
<tr><td>Yetkazib berish manzili (viloyat, tuman, ko‘cha)</td><td>Buyurtmani yetkazish</td></tr>
<tr><td>Yuz surati va uning tahlil natijasi</td><td>Teri holatini tahlil qilish, mos parvarish tavsiya qilish</td></tr>
<tr><td>Teri turi, allergiya va boshqa ixtiyoriy profil ma’lumotlari</td><td>Sizga mos kelmaydigan mahsulot tavsiya qilmaslik</td></tr>
<tr><td>Buyurtmalar, savat, sevimlilar, mahsulot sharhlari</td><td>Do‘kon xizmati</td></tr>
<tr><td>To‘lov cheki (skrinshot)</td><td>To‘lovni tasdiqlash</td></tr>
<tr><td>AI maslahatchiga yozgan savollaringiz va yuborgan rasmlaringiz</td><td>Savolingizga javob berish</td></tr>
<tr><td>Bildirishnoma obunasi (siz yoqsangiz): qurilmangizning push manzili</td><td>Buyurtma holati haqida telefoningizga xabar. Profil → Bildirishnomalar’da o‘chiriladi</td></tr>
<tr><td>IP manzil, qurilma turi, kirish vaqti</td><td>Xavfsizlik: begona kirishdan va suiiste’moldan himoya</td></tr>
</table>
<p>Biz bank karta raqamingizni ${b('yig‘maymiz')}: to‘lov sizning bankingiz
ilovasi orqali o‘tkaziladi.</p>

<h2>2. Yuz surati</h2>
<ul>
  <li>Surat tahlil uchun sun’iy intellekt xizmatiga — ${b('Google LLC (Gemini)')} —
      uzatiladi va natija sizga qaytariladi. Google bu ma’lumotdan o‘z
      shartlari doirasida faqat xizmat ko‘rsatish uchun foydalanadi.</li>
  <li>Surat va natija sizning hisobingizga bog‘lanadi, boshqa foydalanuvchilarga
      ko‘rinmaydi va reklamada ishlatilmaydi.</li>
  <li>Siz uni istalgan payt o‘chirasiz (pastga qarang). Do‘kon suratlarni
      saqlashni umuman o‘chirib qo‘yishi ham mumkin — u holda faqat natija qoladi.</li>
  <li>Tahlil ${b('tibbiy tashxis emas')} — u kosmetik parvarish tanlashga yordam beradi.</li>
</ul>

<h2>3. Ma’lumot kimga beriladi</h2>
<p>Ma’lumotlaringiz ${b('sotilmaydi')}. Faqat xizmat ishlashi uchun zarur hajmda
quyidagilarga uzatiladi:</p>
<ul>
  <li>${b('Google LLC')} — yuz surati tahlili (Gemini) va Google bilan kirish;</li>
  <li>${b('Telegram')} — bot orqali xabarlar (agar Telegram bilan foydalansangiz);</li>
  <li>${b('Eskiz.uz')} — telefon raqamingizga kirish kodi SMS yuborish;</li>
  <li>${b('Brauzer push xizmati')} (Android’da Google Firebase) — bildirishnomani
    qurilmangizga yetkazish; xabar matni shifrlangan holda o‘tadi;</li>
  <li>${b('Pochta / kuryer xizmati')} — buyurtmani yetkazish uchun ism, telefon va manzil;</li>
  <li>${b('Bulutli server va baza')} (Railway, Supabase) — ma’lumotlar shu yerda saqlanadi.</li>
</ul>
<p>Qonun talab qilganda — vakolatli davlat organlariga.</p>

<h2>4. Qancha saqlanadi</h2>
<ul>
  <li>Profil, tahlillar va suratlar — siz hisobni o‘chirguningizcha.</li>
  <li>Ilovaga kirish seansi — 60 kun (keyin qayta kirasiz).</li>
  <li>Qurilmangizda — profil va oxirgi tahlilning nusxasi (ilova internetsiz
      ham ochilishi uchun). U faqat sizning telefoningizda turadi va ilovadan
      chiqqaningizda yoki hisobni o‘chirganingizda o‘chadi.</li>
  <li>SMS va Telegram orqali kirish so‘rovlari — 1 kungacha.</li>
  <li>Buyurtmalar hisobi — qonunda belgilangan muddat; hisob o‘chirilganda ism,
      telefon va manzil buyurtmadan olib tashlanadi.</li>
</ul>

<h2>5. Sizning huquqlaringiz</h2>
<ul>
  <li>${b('Ko‘rish va yuklab olish')} — ilovada «Profil → Hisob va ma’lumotlarim →
      Ma’lumotlarimni yuklab olish». Fayl JSON ko‘rinishida qurilmangizga saqlanadi.</li>
  <li>${b('Tuzatish')} — «Profil» bo‘limida.</li>
  <li>${b('O‘chirish')} — «Profil → Hisob va ma’lumotlarim → Hisobni o‘chirish»,
      Telegram botda <code>/ochir</code> yoki <a href="/hisobni-ochirish">shu sahifa</a> orqali.</li>
  <li>${b('Rozilikni qaytarib olish')} — skanerdan foydalanmasangiz yuz surati yig‘ilmaydi;
      do‘konning qolgan qismi shusiz ishlaydi.</li>
</ul>

<h2>6. Xavfsizlik</h2>
<p>Ulanish shifrlangan (HTTPS). Kirish tokenlari va SMS kodlari bazada ochiq
holda emas, xesh ko‘rinishida saqlanadi. Yuz suratlari va to‘lov cheklari faqat
sizga va do‘kon xodimlariga ochiladi.</p>

<h2>7. Bolalar</h2>
<p>Xizmat 18 yoshdan katta foydalanuvchilar uchun mo‘ljallangan. 18 yoshgacha
bo‘lganlar ota-ona yoki qonuniy vakil roziligi bilan foydalanadi.</p>

<h2>8. O‘zgarishlar va aloqa</h2>
<p>Siyosat o‘zgarsa, yangi tahrir shu sahifada e’lon qilinadi. Savollar bo‘yicha
pastdagi aloqa orqali murojaat qiling.</p>

<h2 lang="en">Summary in English</h2>
<div lang="en">
<p>${esc(s.brend)} (operated by ${s.ism ? esc(s.ism) : `the ${esc(s.brend)} store`}) collects your name,
phone number, age, delivery address, optional email / Google account ID or
Telegram ID (for sign-in), orders, and — only if you use the skin scanner —
your face photo and its analysis. Face photos are sent to Google (Gemini) solely
to produce your skin analysis, are visible only to you and store staff, are
never used for advertising and never sold. Data is shared only with service
providers needed to run the service (Google, Telegram, Eskiz.uz SMS, the delivery
service, Railway/Supabase hosting). You can download your data as JSON or delete
your account at any time in the app: <em>Profile → Account &amp; my data</em>,
or via <a href="/hisobni-ochirish">this page</a>. Order records are kept for
accounting with personal details removed. The service is intended for users
aged 18 and over.</p>
</div>`;
  return huquqiyQobiq({ sarlavha: 'Maxfiylik siyosati', sana: 'Tahrir 1.0 · 2026-yil oktabr',
    ichi, s, faol: '/maxfiylik' });
}

// ═══════════════ HISOBNI O'CHIRISH ═══════════════
// Google Play: «ilovani o'rnatmasdan ham hisobni o'chirishni SO'RASH
// mumkin bo'lgan» ochiq sahifa bo'lishi shart.
export function hisobniOchirishSahifasi(s) {
  const ichi = `
<p>${esc(s.brend)} hisobingizni va unga bog‘liq ma’lumotlarni istalgan payt
o‘chirishingiz mumkin. Uch yo‘l bor:</p>

<div class="qadam">
  <h3>1. Ilovada (eng tezi)</h3>
  <p>Ilovani oching → <b>Profil</b> → <b>Hisob va ma’lumotlarim</b> →
     <b>Hisobni o‘chirish</b> → tasdiqlang.</p>
  <a class="tugma" href="/app/?ochir=1">Ilovada o‘chirish</a>
</div>

<div class="qadam">
  <h3>2. Telegram botda</h3>
  <p>Botga <code>/ochir</code> buyrug‘ini yuboring.</p>
</div>

<div class="qadam">
  <h3>3. Bizga yozing</h3>
  <p>Ilovaga kira olmasangiz — hisobingizga bog‘langan telefon raqamini
     yozib murojaat qiling, 3 ish kuni ichida o‘chiramiz.</p>
  <p>${aloqaHtml(s)}</p>
</div>

<h2>Nima o‘chadi</h2>
<ul>
  <li>yuz suratlari va barcha tahlil natijalari;</li>
  <li>ism, telefon, email, yosh, manzil va profildagi boshqa ma’lumotlar;</li>
  <li>savat, sevimlilar, sharhlar va ilovaga kirish seanslari.</li>
</ul>
<h2>Nima saqlanadi</h2>
<p>Buyurtmalar hisobi (mahsulot, summa, sana) qonun talabi bilan saqlanadi,
lekin ism, telefon va manzil undan olib tashlanadi. Faol (to‘langan, yo‘ldagi)
buyurtma bo‘lsa, hisob u yetkazilgandan keyin o‘chiriladi.</p>`;
  return huquqiyQobiq({ sarlavha: 'Hisobni o‘chirish', ichi, s, faol: '/hisobni-ochirish' });
}

// ═══════════════ OMMAVIY OFERTA (standart) ═══════════════
export function ofertaStandart(s) {
  const b = (t) => `<strong>${t}</strong>`;
  const ichi = `
<p>Ushbu hujjat ${sotuvchiQatori(s)} (keyingi o‘rinlarda — «Sotuvchi») tomonidan
noma’lum shaxslar doirasiga qaratilgan ommaviy taklif (oferta) hisoblanadi.
Ilovada «Roziman, boshladik» yoki Telegram botda «Barchasiga roziman»
tugmasini bosish, yoxud buyurtma berish — ushbu shartlarni to‘liq va so‘zsiz
qabul qilish (aksept) deb hisoblanadi.</p>

<h2>1. Umumiy qoidalar</h2>
<ul>
  <li>Sotuvchi: ${sotuvchiQatori(s)}.</li>
  <li>Xizmat: Koreya kosmetikasi mahsulotlarini chakana sotish va sun’iy
      intellekt yordamida teri holatini axborot maqsadida tahlil qilish.</li>
  <li>Xaridor — ushbu ofertani qabul qilgan 18 yoshdan katta jismoniy shaxs.
      18 yoshgacha — qonuniy vakil roziligi bilan.</li>
</ul>

<h2>2. AI tahlili haqida muhim ogohlantirish</h2>
<div class="esl">Teri tahlili — ${b('tibbiy xizmat emas')} va ${b('tashxis hisoblanmaydi')}.
Natija axborot-maslahat xarakteriga ega bo‘lib, kosmetik parvarish tanlashga
yordam beradi. U shifokor ko‘rigi o‘rnini bosmaydi. Teridagi jiddiy yoki tez
o‘zgarayotgan belgilarda dermatologga murojaat qiling.</div>

<h2>3. Shaxsiy ma’lumotlar</h2>
<p>Ma’lumotlar <a href="/maxfiylik">Maxfiylik siyosati</a>ga muvofiq qayta
ishlanadi. Ofertani qabul qilish bilan Xaridor yuz suratini tahlil uchun
Google LLC ning Gemini xizmatiga (chegaradan tashqariga) uzatilishiga alohida
rozilik bildiradi. Rozilik bermaslik uchun skanerdan foydalanmang — do‘konning
qolgan qismi shusiz ham ishlaydi. Hisob va ma’lumotlarni o‘chirish:
<a href="/hisobni-ochirish">kiovo.shop/hisobni-ochirish</a>.</p>

<h2>4. Buyurtma va to‘lov</h2>
<ul>
  <li>Buyurtma ilova, Telegram bot yoki sayt orqali rasmiylashtiriladi.</li>
  <li>Narx buyurtma berilgan paytdagi narx bo‘yicha qat’iylashadi.</li>
  <li>To‘lov: Sotuvchining bank kartasiga o‘tkazma; to‘lov cheki ilovaga
      yuklanadi. Buyurtma to‘lov tasdiqlangach bajariladi.</li>
  <li>Mahsulotlar Janubiy Koreyadan olib kelinadi. Taxminiy muddat va
      yetkazib berish narxi buyurtmani rasmiylashtirishda ko‘rsatiladi.</li>
</ul>

<h2>5. Mahsulot sifati va qaytarish</h2>
<ul>
  <li>Barcha mahsulotlar original.</li>
  <li>Ochilmagan va butligi buzilmagan mahsulotni qabul qilingandan keyin
      ${b('10 kun')} ichida qaytarish mumkin.</li>
  <li>Gigiyena talablari sababli ochilgan kosmetika almashtirilmaydi va
      qaytarilmaydi — nuqsonli yoki muddati o‘tgan holatlar bundan mustasno.</li>
  <li>Individual allergik reaksiya mahsulot nuqsoni hisoblanmaydi. Yangi
      vositani avval qo‘l terisida sinab ko‘rish tavsiya etiladi.</li>
</ul>

<h2>6. Javobgarlik</h2>
<p>Sotuvchi mahsulotning originalligi, sifati va o‘z vaqtida yetkazilishi uchun
javob beradi. Sotuvchi mahsulotni yo‘riqnomaga zid ishlatish, shuningdek
Xaridorning individual sog‘liq holati bilan bog‘liq oqibatlar uchun javobgar emas.</p>

<h2>7. Yakuniy qoidalar</h2>
<p>Oferta shartlari bir tomonlama o‘zgartirilishi mumkin; yangi tahrir shu sahifada
e’lon qilinadi. Nizolar muzokara yo‘li bilan, kelishuvga erishilmasa —
O‘zbekiston Respublikasi qonunchiligiga muvofiq hal etiladi.</p>`;
  return huquqiyQobiq({ sarlavha: 'Ommaviy oferta', sana: `${s.brend} — Koreya kosmetikasi · Tahrir 2.0`,
    ichi, s, faol: '/oferta' });
}
