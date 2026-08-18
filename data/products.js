// Backend katalogi: brauzer katalogi bilan bitta manbadan foydalanadi.
import '../products-data.js';

const katalog = globalThis.FALLBACK_DATA ?? {};

export const MAHSULOTLAR = Array.isArray(katalog.mahsulotlar)
  ? katalog.mahsulotlar
  : [];

export const KATEGORIYALAR = Array.isArray(katalog.kategoriya)
  ? katalog.kategoriya
  : [];

export const TEGLAR = Object.fromEntries(
  [...new Set(MAHSULOTLAR.flatMap((p) => Array.isArray(p.teg) ? p.teg : []))]
    .map((tag) => [tag, tag])
);

export function mahsulotTop(id) {
  return MAHSULOTLAR.find((m) => m.id === Number(id));
}
