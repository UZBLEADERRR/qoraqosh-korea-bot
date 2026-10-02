-- KiOVO BRENDI: qizil (#AB0A0C) + och yashil (#BDDB7D).
--
-- Do'kon egasi brendni qat'iy belgiladi: logotipdagi qizil va och
-- yashil. Bazada esa eski mavzu turishi mumkin (yorqin #E0242B yoki
-- boshqa to'plam) — u ilovani logotipdan boshqa rangga bo'yab
-- qo'yardi. Shuning uchun mavzu brendga qaytariladi.
--
-- Erkaklar uchun alohida mavzu ham olib tashlanadi: brend bitta
-- bo'lishi kerak. Admin keyin xohlasa yana tanlay oladi.
insert into public.settings (key, value, updated_at)
values ('mavzu', '{"asosiy":"#ab0a0c","fon":"#fbf8f3","urgu":"#ab0a0c"}'::jsonb, now())
on conflict (key) do update set value = excluded.value, updated_at = now();

delete from public.settings where key = 'mavzu_erkak';
