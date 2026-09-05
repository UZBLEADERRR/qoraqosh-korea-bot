-- Tahlilda jins (taxminiy).
--
-- Nima uchun kerak: erkak terisi qalinroq, yog' bezlari faolroq va
-- soqol olish qirilishi — aftershave qichishishi, ichkariga o'sgan
-- tuk — ayollarda umuman uchramaydigan muammo. Bularni bilmasdan
-- berilgan tavsiya erkaklar uchun deyarli har doim noto'g'ri chiqadi.
--
-- Bu TAXMIN: AI ishonchi bo'lmasa 'nomalum' qaytaradi va ilovada ham
-- shunday ko'rsatiladi. Hech qanday cheklovga asos bo'lmaydi.
alter table public.analyses
  add column if not exists jins text;

-- Erkaklar uchun natija kartochkasining rangi. Bo'sh bo'lsa ilovaning
-- umumiy mavzusi ishlatiladi — ya'ni sozlanmaganda hech nima
-- o'zgarmaydi.
insert into public.settings (key, value) values
  ('mavzu_erkak', '{"asosiy":"#123A63","fon":"#E7F0F7","urgu":"#1D6FA5"}'::jsonb)
on conflict (key) do nothing;
