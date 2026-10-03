-- SHARH RASMLARI: mijoz baholaganda mahsulotning o'z suratini qo'sha oladi
-- (3 tagacha). Rasmlar `media` jadvalida, tur = 'sharh' — ochiq, chunki
-- sharhni hamma o'qiydi. Sharh o'chirilganda rasmlar ham o'chiriladi
-- (src/api/routes.js va src/services/hisob.js).
alter table public.sharhlar add column if not exists rasmlar uuid[] not null default '{}';
