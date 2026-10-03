-- Ilova foni: krem o'rniga OCH YASHIL (logotipning ikkinchi rangi).
--
-- Mavzu bazada saqlanadi (admin panel → Mavzu) va ilova uni CSS dan
-- ustun qo'yadi. 037 brend krem fonini yozgan edi — faqat O'SHA standart
-- qiymat turgan bo'lsa yangilanadi: admin o'zi boshqa fon tanlagan
-- bo'lsa, unga tegilmaydi.
update public.settings
   set value = jsonb_set(value, '{fon}', '"#EDF5E1"'), updated_at = now()
 where key = 'mavzu'
   and lower(coalesce(value->>'fon', '')) in ('#fbf8f3', '');
