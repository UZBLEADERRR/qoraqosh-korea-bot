-- Reyting va sevimlilar.
--
-- Reyting O'YLAB TOPILMAYDI: u manba do'kondan (Coupang, Olive Young,
-- Daiso) olinadi — skrinshotda ko'rinadi va AI o'qiydi. Sharh soni
-- nol bo'lsa yulduzcha umuman ko'rsatilmaydi: soxta reyting eng tez
-- ishonchni yo'qotadigan narsa.
alter table products add column if not exists reyting     numeric(2,1);
alter table products add column if not exists sharh_soni  integer not null default 0;

-- Sevimlilar: ilovadagi yurakcha
create table if not exists sevimlilar (
  user_id    bigint not null references users(id)    on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists sevimlilar_user_idx on sevimlilar (user_id, created_at desc);
