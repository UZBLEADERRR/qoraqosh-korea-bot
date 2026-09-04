// PEER_FLOOD — Telegram botni vaqtincha cheklab qo'yganini bildiradi.
//
// U 429 «Too Many Requests» dan boshqa narsa: 429 bir necha soniyada
// o'tadi, PEER_FLOOD esa BOTNING O'ZIGA qo'yilgan spam cheklovi va
// soatlab turadi. Sabablari: qisqa vaqtda ko'p odamga xabar yuborish,
// botni bloklaganlarga qayta yozish, shikoyat.
//
// Eng muhim qoida: cheklov paytida yana urinish uni CHUQURLASHTIRADI.
// Shuning uchun bu yerda umumiy «sovish» oynasi turadi — ommaviy
// yuborishlar shu tugaguncha to'xtaydi. Odam botga yozgan bo'lsa javob
// baribir ketaveradi: suhbat ichidagi javob cheklovga tushmaydi va
// mijozni javobsiz qoldirish undan battar.

const BOSHLANGICH_MS = 15 * 60_000;      // birinchi cheklovda 15 daqiqa
const MAKS_MS        = 6 * 60 * 60_000;  // ketma-ket kelsa 6 soatgacha

let gacha = 0;         // shu vaqtgacha ommaviy yuborish yo'q
let oraliq = 0;        // joriy sovish oynasi
let soni = 0;          // umumiy nechta PEER_FLOOD ko'rildi
let oxirgi = null;     // oxirgi holat (jurnal va admin uchun)

/** Javob matni PEER_FLOOD mi? */
export const floodmi = (sabab) => /PEER_FLOOD/i.test(String(sabab || ''));

/**
 * PEER_FLOOD ko'rindi — sovish oynasini uzaytiramiz.
 * Har takrorlanishda oyna ikki barobar oshadi.
 */
export function floodBelgila(meta = {}) {
  soni++;
  oraliq = oraliq ? Math.min(oraliq * 2, MAKS_MS) : BOSHLANGICH_MS;
  gacha = Date.now() + oraliq;
  oxirgi = { vaqt: new Date().toISOString(), ...meta, oraliq_ms: oraliq };
  // Har xatoni jurnalga bosmaymiz — oynani uzaytirgandagina yozamiz
  console.error(`TELEGRAM CHEKLOVI (PEER_FLOOD): ommaviy yuborish `
    + `${Math.round(oraliq / 60_000)} daqiqaga to‘xtatildi`
    + `${meta.usul ? ` · ${meta.usul}` : ''}${meta.chat ? ` · chat ${meta.chat}` : ''}`);
}

/** Ommaviy yuborish hozir mumkinmi? */
export const floodKutilmoqda = () => Date.now() < gacha;

/** Necha soniya qolgani — adminga aytish uchun. */
export const floodQolgan = () => Math.max(0, Math.ceil((gacha - Date.now()) / 1000));

/** Cheklov o'tgan bo'lsa hisobni noldan boshlaymiz. */
export function floodTekshir() {
  if (gacha && Date.now() >= gacha && oraliq >= MAKS_MS) { oraliq = 0; }
  return { cheklangan: floodKutilmoqda(), qolgan: floodQolgan(), soni, oxirgi };
}

/** Sinov uchun: holatni tozalash. */
export function floodTozala() { gacha = 0; oraliq = 0; soni = 0; oxirgi = null; }
