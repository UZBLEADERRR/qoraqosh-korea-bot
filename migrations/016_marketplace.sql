-- Marketplace: Daiso / Coupang dan mahsulotlarni to'g'ridan-to'g'ri olish.
--
-- Oqim: admin havola beradi (yoki agentga topshiriq) -> server sahifani
-- o'qiydi -> AI kartochkani to'ldiradi -> narx QOIDA bo'yicha hisoblanadi ->
-- admin ko'rib chiqadi va tasdiqlaydi -> mahsulot katalogga tushadi.
--
-- Tasdiqlanmagan narsa katalogga TUSHMAYDI: AI sahifani noto'g'ri o'qishi,
-- narx valyutasi almashishi yoki umuman kosmetika bo'lmagan mahsulot
-- kelib qolishi mumkin.

create table if not exists public.marketplace_topilgan (
  id          bigserial primary key,
  manba       text not null,               -- daiso | coupang | boshqa
  manba_url   text not null,
  -- AI o'qigan xom ma'lumot (nom, brend, tarkib, og'irlik...)
  malumot     jsonb not null default '{}'::jsonb,
  -- Narx hisobi: tannarx, yetkazish, foyda, yakuniy narx
  narx_izoh   jsonb not null default '{}'::jsonb,
  rasm_id     uuid references public.media(id) on delete set null,
  -- kutilmoqda | tasdiqlandi | rad_etildi | xato
  holat       text not null default 'kutilmoqda',
  sabab       text,                        -- rad etilgan yoki xato bo'lsa
  product_id  bigint references public.products(id) on delete set null,
  created_by  bigint references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bir havolani ikki marta olib kelmaslik uchun
create unique index if not exists marketplace_url_uniq
  on public.marketplace_topilgan (manba_url);
create index if not exists marketplace_holat_idx
  on public.marketplace_topilgan (holat, created_at desc);

-- ══════════ Narx qoidasi ══════════
-- Sotuv narxi = tannarx + yetkazish + sof foyda
--   tannarx    — Koreyadagi narx (KRW) kursga ko'paytiriladi
--   yetkazish  — har 100 gramm uchun belgilangan summa
--   sof foyda  — (tannarx + yetkazish) dan foiz, min va max bilan cheklangan
--
-- Min/max shuning uchun kerak: kichik va arzon tovarda foiz juda kam
-- chiqadi (mehnat qoplanmaydi), qimmat kremda esa haddan tashqari ko'p.
insert into public.settings (key, value) values
  ('narx_qoidasi', jsonb_build_object(
     'krw_kurs',       9.5,      -- 1 KRW necha so'm
     'yetkazish_100g', 15000,    -- har 100 g uchun, so'm
     'foyda_foiz',     35,       -- tannarx+yetkazishdan foiz
     'foyda_min',      30000,    -- kichik tovarlar uchun eng kam sof foyda
     'foyda_max',      50000,    -- krem va shunga o'xshashlar uchun eng ko'p
     'yaxlitlash',     1000      -- yakuniy narx shu songacha yaxlitlanadi
   )),
  -- Marketplace'dan olinadigan eng og'ir mahsulot (gramm).
  -- Og'ir tovar pochta haqini yeb qo'yadi.
  ('marketplace_maks_ogirlik', '600'::jsonb),
  -- Faqat shu narx oralig'idagi mahsulotlar olinadi (so'mda, sotuv narxi).
  -- 0 = cheklov yo'q.
  ('marketplace_narx_dan',   '0'::jsonb),
  ('marketplace_narx_gacha', '0'::jsonb)
on conflict (key) do nothing;

-- ══════════ Ichki qabul mahsulotlari ══════════
-- Kollagen, jenshen, vitamin — teriga ICHKARIDAN ta'sir qiladi.
-- Alohida bosqich: parvarish tartibiga qo'shilmaydi, qo'shimcha bo'lib
-- tavsiya etiladi.
insert into public.categories (slug, name, emoji, sort) values
  ('ichimlik', 'Ichki qabul', '💊', 90)
on conflict (slug) do nothing;

-- Yangi parvarish bosqichi. Tartib raqami 7 — hamma tashqi bosqichdan
-- KEYIN turadi, chunki bu parvarish tartibining bir qismi emas.
insert into public.steps (slug, name, sort) values
  ('ichki', 'Ichki qabul (kollagen, vitamin)', 7)
on conflict (slug) do nothing;
