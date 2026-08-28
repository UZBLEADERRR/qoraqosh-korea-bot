-- Reklama posterlari va mahsulot rasmlari.
-- Fayllar bazada saqlanadi: alohida saqlash xizmati (S3/Storage) kerak emas,
-- ulanish satridan boshqa hech narsa sozlanmaydi. O'lcham nazorat qilinadi.

create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  tur         text not null default 'poster',   -- poster | mahsulot
  mime        text not null default 'image/jpeg',
  bayt        bytea not null,
  hajm        integer not null,
  eni         integer,
  boyi        integer,
  nisbat      text,                             -- '1:1' | '4:5' | '9:16' | '16:9'
  product_id  bigint references public.products(id) on delete cascade,
  prompt      text,                             -- qaysi so'rov bilan chizilgan
  goya        text,                             -- g'oya sarlavhasi
  created_at  timestamptz not null default now()
);
create index if not exists media_product_idx on public.media (product_id, created_at desc);

alter table public.products
  add column if not exists poster_id uuid references public.media(id) on delete set null;

alter table public.media enable row level security;

-- Bitta mahsulotga cheksiz poster to'planib ketmasin: 12 tadan ko'pi o'chadi
create or replace function public.media_tozalash() returns trigger
language plpgsql as $$
begin
  delete from public.media
   where product_id = new.product_id
     and product_id is not null
     and id not in (
       select id from public.media
        where product_id = new.product_id
        order by created_at desc
        limit 12
     );
  return null;
end $$;

drop trigger if exists media_tozalash_trg on public.media;
create trigger media_tozalash_trg
  after insert on public.media
  for each row execute function public.media_tozalash();
