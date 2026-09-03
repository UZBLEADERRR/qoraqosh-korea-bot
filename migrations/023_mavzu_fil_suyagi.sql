-- Ilova foni och yashildan issiq fil suyagiga o'tdi (premium ko'rinish).
-- Admin o'zi rang tanlagan bo'lsa TEGILMAYDI: faqat eski standart qiymat
-- turgan bo'lsa yangilanadi.
update settings
   set value = '{"asosiy":"#B3161C","fon":"#FBF8F3","urgu":"#B3161C"}'::jsonb,
       updated_at = now()
 where key = 'mavzu'
   and value->>'fon' = '#EAF3D9'
   and value->>'asosiy' = '#B3161C';
