-- Import qancha AI chaqiruvi sarflaganini ko'rsatish.
--
-- AI chaqiruvi pul turadi va yuzta mahsulot importida bu sezilarli summa.
-- Admin qancha token ketganini ko'rib turishi kerak: narx chegarasi
-- to'g'ri qo'yilgan bo'lsa, rad etilganlar AI'gacha yetmaydi va bu
-- raqam «ko'rilgan» dan ancha kam bo'ladi.
alter table public.marketplace_vazifa
  add column if not exists ai_soni int not null default 0;
