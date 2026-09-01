-- Ommaviy import vazifasi.
--
-- Admin bitta bo'lim havolasini beradi va «100 ta mahsulot» deydi —
-- qolganini server FONDA qiladi: sahifama-sahifa yuradi, har mahsulotni
-- o'qiydi, filtrlaydi va navbatga qo'yadi. Vazifa bazada turadi, chunki
-- yuzta mahsulot yarim soat davom etadi: brauzer yopilsa ham, server
-- qayta ishga tushsa ham davom etishi kerak.
create table if not exists public.marketplace_vazifa (
  id           bigserial primary key,
  havolalar    jsonb  not null default '[]'::jsonb,  -- boshlang'ich (qolipli) havolalar
  sahifadan    int    not null default 1,
  sahifagacha  int    not null default 1,
  maqsad       int    not null default 100,          -- nechta mahsulot kerak
  kechikish_ms int    not null default 1500,         -- so'rovlar orasidagi tanaffus
  avto_tasdiq  boolean not null default false,       -- topilgani to'g'ri katalogga
  holat        text   not null default 'ishlamoqda',
  sahifa       int    not null default 0,            -- qayerga yetdi
  navbat       jsonb  not null default '[]'::jsonb,  -- o'qilmagan havolalar
  korilgan     int    not null default 0,
  qoshilgan    int    not null default 0,
  rad_etilgan  int    not null default 0,
  xato         int    not null default 0,
  takror       int    not null default 0,
  sabab        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.marketplace_vazifa enable row level security;

create index if not exists marketplace_vazifa_holat_idx
  on public.marketplace_vazifa (holat, created_at desc);
