-- QoraQosh — asosiy sxema
-- Supabase SQL Editor'da bir marta ishga tushiring.
--
-- Xavfsizlik modeli: barcha jadvallarda RLS yoqilgan va HECH QANDAY policy yo'q.
-- Ya'ni anon/authenticated kalitlar bilan hech kim hech narsani o'qiy olmaydi.
-- Bazaga faqat Node server service_role kaliti bilan kiradi va har so'rovni
-- Telegram initData imzosi (foydalanuvchi) yoki JWT (admin) bilan tekshiradi.

create extension if not exists pgcrypto;

-- ============================================================
-- FOYDALANUVCHILAR
-- ============================================================
create table if not exists public.users (
  id                bigserial primary key,
  telegram_id       text unique not null,
  username          text,
  full_name         text,
  phone             text,
  age               integer,
  gender            text check (gender in ('ayol','erkak') or gender is null),
  address           text,
  -- Ommaviy oferta roziligi
  agreed_at         timestamptz,
  agreement_version text,
  -- Ro'yxatdan o'tish holati (FSM)
  state             text,
  state_data        jsonb not null default '{}'::jsonb,
  is_blocked        boolean not null default false,
  source            text,
  last_active       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists users_created_idx on public.users (created_at desc);
create index if not exists users_phone_idx   on public.users (phone);

-- ============================================================
-- KATALOG
-- ============================================================
create table if not exists public.categories (
  id     bigserial primary key,
  slug   text unique not null,
  name   text not null,
  emoji  text,
  sort   integer not null default 100
);

-- Parvarish bosqichlari — AI tavsiyani shu tartibda beradi
create table if not exists public.steps (
  slug  text primary key,
  name  text not null,
  sort  integer not null
);
insert into public.steps (slug, name, sort) values
  ('tozalash',  'Tozalash',            1),
  ('toner',     'Toner / balans',      2),
  ('davolash',  'Davolash (serum)',    3),
  ('namlash',   'Namlash',             4),
  ('himoya',    'Quyoshdan himoya',    5),
  ('qoshimcha', 'Qo''shimcha (haftalik)', 6)
on conflict (slug) do nothing;

create table if not exists public.products (
  id           bigserial primary key,
  name         text not null,
  brand        text,
  category_id  bigint references public.categories(id) on delete set null,
  step         text references public.steps(slug),

  price        integer not null check (price >= 0),
  old_price    integer check (old_price is null or old_price >= 0),
  cost_price   integer not null default 0 check (cost_price >= 0), -- tannarx: marja hisobi uchun
  stock        integer not null default 0 check (stock >= 0),

  volume       text,
  country      text default 'KR',
  description  text,          -- nima qiladi
  usage_text   text,          -- qanday foydalanish
  ingredients  text,          -- INCI / tarkib
  actives      text[] not null default '{}',   -- faol moddalar
  concerns     text[] not null default '{}',   -- qaysi muammoga: akne, quruqlik...
  skin_types   text[] not null default '{}',   -- yogli, quruq, aralash, sezgir, normal
  warnings     text,          -- ehtiyot choralari

  images       jsonb not null default '[]'::jsonb,
  emoji        text default '🧴',
  gradient     text[] not null default '{"#1f2937","#4b5563"}',

  ai_filled    boolean not null default false,  -- skrinshotdan AI to'ldirganmi
  ai_note      text,
  is_active    boolean not null default true,
  sold_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Seed va admin qo'shishida dublikatning oldini oladi
create unique index if not exists products_brend_nom_uniq
  on public.products (coalesce(brand, ''), name);
create index if not exists products_active_idx   on public.products (is_active);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_concerns_idx on public.products using gin (concerns);
create index if not exists products_step_idx     on public.products (step);

-- ============================================================
-- AI TAHLIL
-- ============================================================
create table if not exists public.analyses (
  id            bigserial primary key,
  user_id       bigint not null references public.users(id) on delete cascade,

  -- 1-blok: umumiy ko'rsatkichlar
  age_estimate  text,          -- "24-28"
  skin_tone     text,          -- teri rangi / toni
  skin_type     text,          -- quruq / yog'li / aralash / normal / sezgir
  score         integer,       -- 0-100 umumiy holat

  -- 2-blok: muammolar   [{key,name,severity,zone,note}]
  problems      jsonb not null default '[]'::jsonb,
  -- 3-blok: davolanmasa nima bo'lishi mumkin  [{problem,outcome,probability,horizon}]
  forecast      jsonb not null default '[]'::jsonb,
  -- 4-blok: bosqichma-bosqich tavsiya  [{step,product_id,why}]
  routine       jsonb not null default '[]'::jsonb,

  raw           jsonb,
  is_offline    boolean not null default false, -- AI kalitsiz zaxira natija
  created_at    timestamptz not null default now()
);
create index if not exists analyses_user_idx on public.analyses (user_id, created_at desc);

-- ============================================================
-- SAVAT VA BUYURTMA
-- ============================================================
create table if not exists public.cart_items (
  user_id    bigint not null references public.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

do $$ begin
  create type public.order_status as enum
    ('yangi','tasdiqlangan','yolda','yetkazildi','bekor');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id            bigserial primary key,
  order_no      text unique not null,
  user_id       bigint not null references public.users(id) on delete restrict,

  customer_name    text,
  customer_phone   text,
  customer_address text,
  note             text,

  items         jsonb not null,   -- nusxa: [{product_id,name,brand,price,cost_price,qty}]
  subtotal      integer not null,
  delivery_fee  integer not null default 0,
  total         integer not null,
  cost_total    integer not null default 0,  -- marja hisobi uchun

  status        public.order_status not null default 'yangi',
  payment_method text default 'naqd',
  cancel_reason text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_user_idx   on public.orders (user_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- Buyurtma raqami uchun alohida ketma-ketlik: id bilan chalkashmasligi uchun
create sequence if not exists public.order_no_seq;

-- ============================================================
-- VORONKA HODISALARI (konversiya hisobi uchun)
-- ============================================================
create table if not exists public.events (
  id         bigserial primary key,
  user_id    bigint references public.users(id) on delete set null,
  type       text not null,   -- start, register, scan, scan_rejected, view, add_cart, checkout, order
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_type_idx on public.events (type, created_at desc);

-- ============================================================
-- SOZLAMALAR
-- ============================================================
create table if not exists public.settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('delivery_fee',      '25000'::jsonb),
  ('free_delivery_from','500000'::jsonb),
  ('manager_username',  '"qoraqosh_admin"'::jsonb),
  ('agreement_version', '"1.0"'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- BUYURTMANI SERVERDA YARATISH
-- Narx, ombor qoldig'i va yakuniy summa FAQAT shu yerda hisoblanadi.
-- Mijoz yuborgan narx umuman ishlatilmaydi.
-- ============================================================
create or replace function public.place_order(
  p_user_id  bigint,
  p_items    jsonb,     -- [{"product_id":1,"quantity":2}]
  p_name     text,
  p_phone    text,
  p_address  text,
  p_note     text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        jsonb;
  v_product     public.products%rowtype;
  v_qty         integer;
  v_subtotal    integer := 0;
  v_cost_total  integer := 0;
  v_items       jsonb := '[]'::jsonb;
  v_fee         integer;
  v_free_from   integer;
  v_order       public.orders;
  v_no          text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'BOSH_SAVAT';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'TELEFON_YOQ';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));

    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and is_active
      for update;

    if not found then
      raise exception 'MAHSULOT_TOPILMADI:%', v_item->>'product_id';
    end if;
    if v_product.stock < v_qty then
      raise exception 'OMBORDA_YETARLI_EMAS:%:%', v_product.name, v_product.stock;
    end if;

    update public.products
       set stock = stock - v_qty,
           sold_count = sold_count + v_qty,
           updated_at = now()
     where id = v_product.id;

    v_subtotal   := v_subtotal   + v_product.price * v_qty;
    v_cost_total := v_cost_total + v_product.cost_price * v_qty;

    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'name',       v_product.name,
      'brand',      v_product.brand,
      'price',      v_product.price,
      'cost_price', v_product.cost_price,
      'qty',        v_qty
    );
  end loop;

  select (value)::text::int into v_fee       from public.settings where key = 'delivery_fee';
  select (value)::text::int into v_free_from from public.settings where key = 'free_delivery_from';
  v_fee       := coalesce(v_fee, 25000);
  v_free_from := coalesce(v_free_from, 500000);
  if v_subtotal >= v_free_from then v_fee := 0; end if;

  v_no := 'QQ-' || to_char(now(), 'YYMMDD') || '-' ||
          lpad((nextval('public.order_no_seq'))::text, 4, '0');

  insert into public.orders (
    order_no, user_id, customer_name, customer_phone, customer_address, note,
    items, subtotal, delivery_fee, total, cost_total
  ) values (
    v_no, p_user_id, p_name, p_phone, p_address, p_note,
    v_items, v_subtotal, v_fee, v_subtotal + v_fee, v_cost_total
  ) returning * into v_order;

  delete from public.cart_items where user_id = p_user_id;
  insert into public.events (user_id, type, meta)
    values (p_user_id, 'order', jsonb_build_object('order_no', v_no, 'total', v_order.total));

  return v_order;
end $$;

-- Buyurtma bekor qilinsa ombor qaytadi
create or replace function public.restock_order(p_order_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_item jsonb;
begin
  for v_item in select * from jsonb_array_elements((select items from public.orders where id = p_order_id)) loop
    update public.products
       set stock = stock + (v_item->>'qty')::int,
           sold_count = greatest(0, sold_count - (v_item->>'qty')::int)
     where id = (v_item->>'product_id')::bigint;
  end loop;
end $$;

-- ============================================================
-- RLS: hamma jadval yopiq. Policy yo'q => anon kalit hech narsa ko'rmaydi.
-- ============================================================
alter table public.users      enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.analyses   enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders     enable row level security;
alter table public.events     enable row level security;
alter table public.settings   enable row level security;
alter table public.steps      enable row level security;

-- RPC'ni ommaviy chaqiruvdan yopamiz.
-- MUHIM: Postgres har bir funksiyaga sukut bo'yicha PUBLIC ga EXECUTE beradi,
-- va Supabase'dagi anon/authenticated rollari shu PUBLIC grantini meros oladi.
-- Shuning uchun avval PUBLIC dan tortib olamiz — faqat anon'dan tortish yetarli emas.
revoke all on function public.place_order(bigint, jsonb, text, text, text, text) from public;
revoke all on function public.restock_order(bigint) from public;

-- Keyin faqat serverning service_role kalitiga ruxsat beramiz (Supabase'da mavjud).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.place_order(bigint, jsonb, text, text, text, text) to service_role;
    grant execute on function public.restock_order(bigint) to service_role;
  end if;
end $$;
