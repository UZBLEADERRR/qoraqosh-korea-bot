-- Ilova foni: och yashil biroz TO'QROQ (#EDF5E1 → #E1EDCF).
--
-- Kartalar endi oq emas — fonning ochroq tusi (src/lib/mavzu.js →
-- palitra.karta). Faqat standart qiymat turgan bo'lsa yangilanadi:
-- admin o'zi boshqa fon tanlagan bo'lsa, unga tegilmaydi.
update public.settings
   set value = jsonb_set(value, '{fon}', '"#E1EDCF"'), updated_at = now()
 where key = 'mavzu'
   and lower(coalesce(value->>'fon', '')) in ('#edf5e1', '');
