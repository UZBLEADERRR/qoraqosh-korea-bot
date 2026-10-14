-- MAJBURIY KANAL: kim qayerdan kelib kanalga qo'shildi.
--
-- users.kanal_soraldi_at — bot birinchi marta «avval kanalga obuna bo'ling»
--                          degan payt (u kanal a'zosi emas edi);
-- users.kanal_azo_at     — a'zoligi birinchi tasdiqlangan payt. Soraldi bor,
--                          azo bor — bot orqali qo'shilgan; soraldi yo'q,
--                          azo bor — avvaldan a'zo edi;
-- users.kanal_chiqdi_at  — kanaldan chiqib ketgan payt.
-- kanal_harakatlar       — Telegram «chat_member» xabarlari: botdan
--                          foydalanmaganlar ham ko'rinadi (qaysi taklif
--                          havolasi orqali kelgani bilan).
alter table public.users add column if not exists kanal_soraldi_at timestamptz;
alter table public.users add column if not exists kanal_azo_at timestamptz;
alter table public.users add column if not exists kanal_chiqdi_at timestamptz;
create index if not exists users_kanal_azo_idx on public.users (kanal_azo_at) where kanal_azo_at is not null;

create table if not exists public.kanal_harakatlar (
  id          bigserial primary key,
  kanal       text,
  telegram_id text not null,
  user_id     bigint references public.users(id) on delete set null,
  ism         text,
  username    text,
  holat       text not null check (holat in ('qoshildi', 'chiqdi')),
  havola_nomi text,
  created_at  timestamptz not null default now()
);
create index if not exists kanal_harakatlar_vaqt_idx on public.kanal_harakatlar (created_at desc);
create index if not exists kanal_harakatlar_tg_idx on public.kanal_harakatlar (telegram_id);
