// Ichki xatoni mijozga tushunarli xabarga aylantiradi.
// Maqsad: "Xatolik yuz berdi" o'rniga odam nima qilishini bilsin,
// admin esa Railway loglaridan aniq sababni topsin.

const TURKUM_MATNI = {
  kalit:       '🔑 AI kaliti sozlanmagan yoki noto‘g‘ri. Administratorga xabar bering.',
  model:       '🤖 AI modeli mavjud emas. Administratorga xabar bering.',
  xavfsizlik:  '🛡 AI bu rasmni tahlil qilishdan bosh tortdi. Boshqa surat yuboring — yuz aniq va yorug‘ ko‘rinsin.',
  band:        '⏳ AI hozir band. 1–2 daqiqadan so‘ng qayta urinib ko‘ring.',
  vaqt:        '⏳ Tahlil juda uzoq davom etdi. Qayta urinib ko‘ring.',
  json:        '🤖 AI javobi tushunarsiz chiqdi. Qayta urinib ko‘ring.',
  bosh:        '🤖 AI javob qaytarmadi. Qayta urinib ko‘ring.',
  uzilgan:     '🤖 AI javobi uzilib qoldi. Qayta urinib ko‘ring.',
  // 400 — deyarli har doim SO'ROV sozlamasida, rasmda emas. Mijozga
  // "JPG yuboring" deb aytish noto'g'ri: u rasmni almashtirib ovora
  // bo'ladi, muammo esa serverda. Aniq sabab logga yoziladi.
  sorov:       '🤖 AI so‘rovni qabul qilmadi. Bir daqiqadan so‘ng qayta urinib ko‘ring — '
             + 'takrorlansa administratorga xabar bering.',
  fayl:        '📥 Rasmni yuklab bo‘lmadi. Qayta yuboring.',
  fayl_katta:  '📦 Rasm juda katta. Kichikroq surat yuboring.',
  baza:        '🗄 Ma’lumotlar bazasiga ulanib bo‘lmadi. Bir ozdan so‘ng urinib ko‘ring.',
};

/**
 * @returns {{matn:string, turkum:string, log:string}}
 */
export function xatoniTushuntir(e) {
  let turkum = e?.turkum;

  if (!turkum) {
    const m = String(e?.message || '');
    if (m === 'FAYL_KATTA')                       turkum = 'fayl_katta';
    else if (/FAYL_(OLINMADI|YUKLANMADI)/.test(m)) turkum = 'fayl';
    else if (m === 'GEMINI_KALIT_YOQ')             turkum = 'kalit';
    else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|terminated/i.test(m)) turkum = 'baza';
  }

  return {
    turkum: turkum || 'nomalum',
    matn: TURKUM_MATNI[turkum] || '⚠️ Xatolik yuz berdi. Bir ozdan so‘ng qayta urinib ko‘ring.',
    log: `[${turkum || 'nomalum'}] ${String(e?.message || e).slice(0, 500)}`,
  };
}
