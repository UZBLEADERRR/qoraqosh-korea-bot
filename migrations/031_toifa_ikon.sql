-- Bo'lim ikonkasi.
--
-- Muammo: ilovadagi filtr doiralarida ikonka `slug` bo'yicha tanlanardi.
-- AI yangi bo'lim ochsa (masalan «Aksessuar») uning slug'i ro'yxatda
-- yo'q va HAMMASI bir xil «shisha» ikonkasini oladi — filtr o'qilmay
-- qoladi.
--
-- Endi ikonka bazada saqlanadi: admin panelda tanlanadi, tanlanmagan
-- bo'lsa nom bo'yicha avtomatik topiladi.
alter table public.categories
  add column if not exists ikon text;

-- Mavjud bo'limlarga ilovadagi eski moslikni ko'chiramiz, shunda
-- ko'rinish o'zgarmaydi.
update public.categories set ikon = case slug
  when 'tozalash' then 'tomchi'
  when 'toner'    then 'shisha'
  when 'serum'    then 'pipetka'
  when 'krem'     then 'quti'
  when 'niqob'    then 'niqob'
  when 'quyosh'   then 'quyosh'
  when 'lab'      then 'yurak'
  when 'toplam'   then 'sovga'
  when 'ichimlik' then 'ichki'
  else null end
where ikon is null;
