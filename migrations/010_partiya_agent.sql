-- Xarid partiyalari, yangi bosqichlar, broadcast, majburiy kanal va agent.

-- ══════════ 1. Mahsulot manbasi ══════════
-- Admin mahsulotni qayerdan olishini yozib qo'yadi: /orders ro'yxatida
-- mahsulot nomi shu havolaga bosiladigan bo'ladi va xodim to'g'ri sahifaga
-- o'tadi — qidirib o'tirmaydi.
alter table public.products add column if not exists manba_url text;
alter table public.products add column if not exists manba     text;   -- coupang | daiso | boshqa

-- ══════════ 2. Bosqichlar ══════════
-- Koreyadan O'zbekistonga yetib borish yo'li. Mavjud qiymatlar saqlanadi:
--   tasdiqlangan  — to'lov tekshirildi
--   omborda       — O'zbekiston omborida
--   yolda         — yo'lda
-- Enumdagi TARTIB o'zgartirilmaydi (buning uchun ustunni qayta qurish kerak
-- bo'lardi) — ko'rsatiladigan tartib kodda: src/lib/bosqichlar.js
alter type public.order_status add value if not exists 'qadoqlanmoqda';
alter type public.order_status add value if not exists 'korea_jonatildi';
alter type public.order_status add value if not exists 'pochta_jonatildi';

-- ══════════ 3. Xarid partiyalari ══════════
-- Buyurtmalar to'planadi; admin /orders bilan ro'yxatni oladi va
-- «Qabul qilindi» ni bosadi — partiya yopiladi, keyingi buyurtmalar
-- yangi partiyaga tushadi.
create table if not exists public.partiyalar (
  id          bigserial primary key,
  raqam       text unique not null,
  holat       text not null default 'ochiq',   -- ochiq | qabul_qilingan | jonatilgan
  izoh        text,
  qabul_sana  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists partiyalar_holat_idx on public.partiyalar (holat, created_at desc);

alter table public.orders
  add column if not exists partiya_id bigint references public.partiyalar(id) on delete set null;
create index if not exists orders_partiya_idx on public.orders (partiya_id);

-- Partiya raqami: P-260828-01
create sequence if not exists public.partiya_seq;

-- ══════════ 4. Broadcast ══════════
create table if not exists public.yuborishlar (
  id         bigserial primary key,
  matn       text not null,
  rasm_id    uuid references public.media(id) on delete set null,
  tugmalar   jsonb not null default '[]'::jsonb,
  holat      text not null default 'tayyorlanmoqda', -- tayyorlanmoqda | ketmoqda | tugadi | bekor
  jami       integer not null default 0,
  yuborildi  integer not null default 0,
  xato       integer not null default 0,
  created_by bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  tugadi_at  timestamptz
);
create index if not exists yuborishlar_holat_idx on public.yuborishlar (holat, created_at desc);

-- ══════════ 5. Agent: kanal rejasi ══════════
-- Admin topshiriq beradi ("har kuni soat 9 da teri parvarishi haqida post").
-- Agent har kuni bitta band tayyorlaydi, adminga tasdiqlashga yuboradi.
create table if not exists public.rejalar (
  id          bigserial primary key,
  nom         text not null,
  topshiriq   text not null,             -- admin bergan ko'rsatma
  kanal       text not null default '',  -- qaysi kanalga
  soat        integer not null default 9,-- Toshkent vaqti bilan
  faol        boolean not null default true,
  rasmli      boolean not null default true,
  created_by  bigint references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.reja_bandlari (
  id          bigserial primary key,
  reja_id     bigint not null references public.rejalar(id) on delete cascade,
  tartib      integer not null default 0,
  mavzu       text not null,
  matn        text,
  rasm_id     uuid references public.media(id) on delete set null,
  holat       text not null default 'rejada',
    -- rejada | tayyorlanmoqda | tasdiq_kutilmoqda | joylandi | otkazildi
  tasdiq_msg  bigint,                    -- admindagi xabar id (tugmalarni o'chirish uchun)
  tasdiq_chat text,
  joylandi_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reja_bandlari_idx on public.reja_bandlari (reja_id, holat, tartib);

-- ══════════ 6. Sozlamalar ══════════
insert into public.settings (key, value) values
  ('majburiy_kanal',        '""'::jsonb),   -- @kanal yoki -100...; bo'sh = tekshirilmaydi
  ('majburiy_kanal_havola', '""'::jsonb),   -- ko'rinadigan havola (yopiq kanal uchun)
  ('brend_rasm_id',         '""'::jsonb),   -- logotip (media.id)
  ('xarid_kanal',           '""'::jsonb),   -- /orders ro'yxati tushadigan kanal
  ('chek_saqlansin',        'false'::jsonb) -- chek tekshirilgach o'chiriladi
on conflict (key) do nothing;

-- ══════════ 7. Bosqich xabarlari ══════════
insert into public.settings (key, value) values
  ('xabar_holat_qadoqlanmoqda',
   '"📦 <b>{raqam}</b> — buyurtmangiz Koreyada qadoqlanmoqda."'::jsonb),
  ('xabar_holat_korea_jonatildi',
   '"✈️ <b>{raqam}</b> — buyurtmangiz Koreyadan O‘zbekistonga jo‘natildi."'::jsonb),
  ('xabar_holat_pochta_jonatildi',
   '"📮 <b>{raqam}</b> — buyurtmangiz pochta orqali jo‘natildi. Tez orada yetib boradi."'::jsonb)
on conflict (key) do nothing;
