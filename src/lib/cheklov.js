// Oddiy so'rov cheklagich (sirg'aluvchi oyna).
// Bitta foydalanuvchi yoki IP tizimni bosib qo'ymasin.
const oynalar = new Map();

/**
 * @param {string} kalit   kim (user id yoki IP)
 * @param {number} chegara oynada nechta so'rovga ruxsat
 * @param {number} oynaMs  oyna uzunligi
 * @returns {{ruxsat:boolean, qolgan:number, kutish:number}}
 */
export function cheklov(kalit, chegara, oynaMs) {
  const hozir = Date.now();
  let q = oynalar.get(kalit);
  if (!q || hozir > q.tugash) {
    q = { soni: 0, tugash: hozir + oynaMs };
    oynalar.set(kalit, q);
  }
  q.soni += 1;
  return {
    ruxsat: q.soni <= chegara,
    qolgan: Math.max(0, chegara - q.soni),
    kutish: Math.max(0, Math.ceil((q.tugash - hozir) / 1000)),
  };
}

// Eskirgan yozuvlarni tozalab turamiz — xotira o'smasin
setInterval(() => {
  const hozir = Date.now();
  for (const [k, v] of oynalar) if (hozir > v.tugash) oynalar.delete(k);
}, 60_000).unref?.();
