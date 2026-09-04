-- HAQIQIY sharhlar.
--
-- Ilgari products.reyting va sharh_soni ga manba do'kondagi (Coupang,
-- Daiso) baho yozilardi. U bizning mijozimizning bahosi EMAS — ikkalasini
-- bir ustunda saqlash mijozni chalg'itadi. Endi:
--   reyting / sharh_soni  — BIZNING mijozlarimiz qoldirgan sharhlardan
--                           hisoblanadi (sharhlar jadvalidan);
--   manba_reyting / manba_sharh — koreys do'konidagi baho, alohida va
--                           "Koreyada shunday baholangan" deb ko'rsatiladi.
alter table products add column if not exists manba_reyting numeric(2,1);
alter table products add column if not exists manba_sharh   integer not null default 0;

-- Import qilingan qiymatlarni o'z joyiga ko'chiramiz
update products
   set manba_reyting = reyting, manba_sharh = sharh_soni
 where sharh_soni > 0 and manba_sharh = 0;
update products set reyting = null, sharh_soni = 0;

create table if not exists sharhlar (
  id         bigserial primary key,
  user_id    bigint not null references users(id)    on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  baho       smallint not null check (baho between 1 and 5),
  matn       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Bir odam bir mahsulotga BITTA sharh yozadi (tahrirlashi mumkin)
  unique (user_id, product_id)
);
create index if not exists sharhlar_product_idx on sharhlar (product_id, created_at desc);

-- Reyting sharhlardan hisoblanadi: qo'lda yozib qo'yib bo'lmaydi
create or replace function public.reytingni_yangila(p_product_id bigint)
returns void language sql as $$
  update public.products p
     set reyting = (select round(avg(s.baho)::numeric, 1) from public.sharhlar s
                     where s.product_id = p_product_id),
         sharh_soni = (select count(*)::int from public.sharhlar s
                        where s.product_id = p_product_id)
   where p.id = p_product_id;
$$;

create or replace function public.sharh_ozgardi()
returns trigger language plpgsql as $$
begin
  perform public.reytingni_yangila(coalesce(new.product_id, old.product_id));
  return null;
end $$;

drop trigger if exists sharh_ozgardi_trg on sharhlar;
create trigger sharh_ozgardi_trg
after insert or update or delete on sharhlar
for each row execute function public.sharh_ozgardi();
