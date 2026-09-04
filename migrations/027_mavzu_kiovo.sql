-- Yangi standart mavzu: neytral oq fon va yorqinroq qizil.
--
-- Shablonlar `on conflict do nothing` bilan qo'yilgani uchun koddagi
-- standart o'zgarsa ham bazadagi eski qiymat qolib ketadi. Shuning
-- uchun FAQAT admin o'zgartirmagan (hali ham eski standart turgan)
-- holatda yangilaymiz.
update settings
   set value = jsonb_build_object('asosiy', '#e0242b', 'fon', '#f6f6f7', 'urgu', '#e0242b')
 where key = 'mavzu'
   and lower(coalesce(value->>'asosiy', '')) = '#b3161c'
   and lower(coalesce(value->>'fon', ''))    = '#fbf8f3';
