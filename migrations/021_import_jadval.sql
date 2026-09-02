-- Avtomatik import jadvali va AI rejimi.
--
-- Maqsad: admin hech narsa bosmasin. Jadval yoqilgan bo'lsa server
-- o'zi belgilangan kunlarda qidiradi, filtrlaydi, katalogga qo'shadi
-- va Telegramga qisqa hisobot yuboradi.
insert into settings (key, value) values
  -- yoq | tejamkor | toliq
  ('marketplace_ai', '"tejamkor"'::jsonb),
  ('marketplace_jadval', '{
     "yoqilgan": false,
     "sozlar": ["크림","토너","세럼","클렌징","마스크팩","선크림"],
     "kunlar": 7,
     "soat": 4,
     "maqsad": 40,
     "sahifagacha": 5,
     "avto_tasdiq": true,
     "oxirgi": null
   }'::jsonb)
on conflict (key) do nothing;
