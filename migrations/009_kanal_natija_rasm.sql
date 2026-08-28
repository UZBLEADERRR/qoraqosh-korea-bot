-- Brend nomi, ikkita Telegram kanal va tahlil natijasining rasmi.

-- ── Brend ────────────────────────────────────────────────────────────────
-- dokon_nomi allaqachon bor (005). Eski standart qiymatni yangisiga o'giramiz,
-- lekin admin o'zi boshqa nom qo'ygan bo'lsa TEGMAYMIZ.
update public.settings
   set value = '"Meduza Cosmetics"'::jsonb, updated_at = now()
 where key = 'dokon_nomi' and value in ('"QoraQosh"'::jsonb, '""'::jsonb);

insert into public.settings (key, value) values
  ('dokon_nomi', '"Meduza Cosmetics"'::jsonb)
on conflict (key) do nothing;

-- ── Kanallar ─────────────────────────────────────────────────────────────
-- Bo'sh bo'lsa hech narsa yuborilmaydi. Kanal ID'si "-100..." ko'rinishida
-- yoki "@kanalnomi" bo'lishi mumkin. Bot kanalga admin qilib qo'shilishi shart.
insert into public.settings (key, value) values
  ('kanal_buyurtma',      '""'::jsonb),   -- yangi buyurtmalar + chek rasmi
  ('kanal_tahlil',        '""'::jsonb),   -- tahlil natijalari (rasm bilan)
  ('kanal_tahlil_yoqilgan', 'false'::jsonb)  -- yuz surati ketadi: ataylab o'chiq
on conflict (key) do nothing;

-- ── Tahlil natijasining rasmi ────────────────────────────────────────────
-- Rasm bir marta chiziladi va saqlanadi: foydalanuvchi keyin "yuklab olish"
-- bosganda qaytadan chizish uchun asl surat kerak bo'lardi, lekin biz asl
-- suratni saqlamaymiz.
alter table public.analyses
  add column if not exists natija_rasm_id uuid references public.media(id) on delete set null;

-- media.tur endi 'natija' ham bo'lishi mumkin (ustun matn, cheklov yo'q).
create index if not exists media_tur_idx on public.media (tur, created_at desc);
