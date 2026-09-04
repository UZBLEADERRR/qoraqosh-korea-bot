-- Mahsulotning o'zbekcha nomi.
--
-- Muammo: katalogdagi nom inglizcha yoki koreyscha — «Heartleaf Pore
-- Deep Cleansing Oil». Mijoz uni o'qiy olmaydi va nima ekanini
-- tushunmaydi, ya'ni sotib olmaydi.
--
-- Yechim: `name` ASL nom bo'lib qoladi (Koreyadan xarid qilish,
-- pochta hujjati va /orders ro'yxati shunga tayanadi), `nom_uz` esa
-- ilovada ko'rsatiladi. Ikkalasi ALOHIDA: asl nomni tarjimaga
-- almashtirib yuborsak, do'kondan qaysi mahsulot ekanini topib
-- bo'lmay qoladi.
alter table public.products
  add column if not exists nom_uz text;

-- Qidiruv ikkala nom bo'yicha ham ishlashi kerak: odam «gidrofil moy»
-- deb ham, «cleansing oil» deb ham qidiradi.
create index if not exists products_nom_uz_idx
  on public.products (lower(nom_uz));
