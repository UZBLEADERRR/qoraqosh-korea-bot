-- Ilova mavzusi — ranglar admin paneldan tanlanadi.
--
-- Ikkita rang saqlanadi: SARLAVHA foni va ILOVA foni. Qolgan tuslar
-- (och/to'q variantlar, matn rangi, chegara) koddagi `palitra()` da
-- HISOBLANADI — admin o'nta rangni qo'lda tanlab, o'qib bo'lmaydigan
-- kombinatsiya yasab qo'ymasligi uchun.
--
-- Bir xil palitra uch joyda ishlatiladi: Mini App, natija rasmi va
-- admin paneldagi jonli ko'rinish.
insert into public.settings (key, value) values
  ('mavzu', '{"asosiy":"#B3161C","fon":"#EAF3D9","urgu":"#C0392B"}'::jsonb)
on conflict (key) do nothing;
