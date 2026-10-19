-- KUNLIK REELS: AI har kuni mahsulot videosini yasaydi va Instagram'ga joylaydi.
-- holat: tayyorlanmoqda → tayyor → joylandi | xato | bekor
create table if not exists public.reels_postlar (
  id           bigserial primary key,
  product_id   bigint references public.products(id) on delete set null,
  holat        text not null default 'tayyorlanmoqda',
  video_id     uuid references public.media(id) on delete set null,
  soniya       numeric(6,2),
  izoh         text,                 -- Instagram caption
  ssenariy     jsonb not null default '{}'::jsonb,
  ovozli       boolean not null default false,
  ig_media_id  text,
  permalink    text,
  xato         text,
  manba        text not null default 'jadval',   -- jadval | qolda
  created_at   timestamptz not null default now(),
  joylangan_at timestamptz
);
create index if not exists reels_postlar_vaqt_idx on public.reels_postlar (created_at desc);
create index if not exists reels_postlar_mahsulot_idx on public.reels_postlar (product_id, created_at desc);
