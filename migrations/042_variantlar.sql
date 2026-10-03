-- MAHSULOT VARIANTLARI: bir mahsulotning har xil rangi yoki hajmi.
--
-- Har variant — ALOHIDA mahsulot qatori (o'z narxi, qoldig'i, rasmi),
-- asosiy mahsulotga `variant_of` bilan bog'langan. Shu sababli savat,
-- buyurtma (place_order), ombor qoldig'i, qaytarish va sharhlar
-- o'zgarishsiz ishlaydi: ular allaqachon mahsulot qatori bilan ishlaydi.
-- Do'konda faqat asosiy mahsulot ko'rinadi, oynasida esa variant tanlanadi.
--
-- Bir daraja: variantning o'z varianti bo'lmaydi (API tekshiradi).
alter table public.products add column if not exists variant_of bigint
  references public.products(id) on delete set null;
-- Variant nomi: «50 ml», «02 Pushti», «Mat». Asosiy mahsulotda ham bo'ladi.
alter table public.products add column if not exists variant_nom text;
-- Tanlov ko'rinishi: hajm (tugmalar) yoki rang (doirachalar)
alter table public.products add column if not exists variant_tur text;
alter table public.products add column if not exists rang_hex text;
create index if not exists products_variant_idx on public.products (variant_of) where variant_of is not null;

-- Nom + brend takrorlanmasin degan qoida endi variant nomini ham hisobga
-- oladi: «Lip Tint · 01» va «Lip Tint · 02» — ikki xil qator.
drop index if exists public.products_brend_nom_uniq;
create unique index if not exists products_brend_nom_uniq
  on public.products (coalesce(brand, ''), name, coalesce(variant_nom, ''));
