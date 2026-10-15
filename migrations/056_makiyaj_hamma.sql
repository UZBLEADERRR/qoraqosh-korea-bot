-- Makiyaj bo'limi endi hammaga (erkaklarga — o'z tartibi bilan).
-- Erkaklar soch pomadasi/vosk ham qo'shiladi — buning uchun «soch» bosqichi.
insert into public.steps (slug, name, sort) values
  ('soch', 'Makiyaj: soch turmagi (pomada, vosk)', 29)
on conflict (slug) do nothing;
