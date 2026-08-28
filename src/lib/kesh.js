// Xotiradagi qisqa muddatli kesh.
// Katalog eng ko'p so'raladigan ma'lumot: kuniga minglab foydalanuvchi bo'lsa
// har ochilishda bazaga borish keraksiz. 30 soniyalik kesh yukni keskin kamaytiradi,
// lekin admin o'zgartirgan narx yarim daqiqadan keyin baribir ko'rinadi.
const saqlangan = new Map();

/**
 * @param {string} kalit
 * @param {number} ttlMs
 * @param {Function} olish  — qiymat yo'q bo'lsa chaqiriladi
 */
export async function kesh(kalit, ttlMs, olish) {
  const bor = saqlangan.get(kalit);
  if (bor && Date.now() < bor.muddat) return bor.qiymat;

  // Bir vaqtda ko'p so'rov kelsa — bittasi oladi, qolgani kutadi
  if (bor?.kutilmoqda) return bor.kutilmoqda;

  const vada = (async () => {
    const qiymat = await olish();
    saqlangan.set(kalit, { qiymat, muddat: Date.now() + ttlMs });
    return qiymat;
  })();
  saqlangan.set(kalit, { ...bor, kutilmoqda: vada });
  try { return await vada; }
  catch (e) { saqlangan.delete(kalit); throw e; }
}

export const keshniTashla = (kalit) => {
  if (kalit) saqlangan.delete(kalit); else saqlangan.clear();
};
