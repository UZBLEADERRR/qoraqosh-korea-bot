-- Telegramsiz kirish: telefon raqami + botdan tasdiqlash.
--
-- Nega kerak. Bosh ekranga qo'yilgan yorliq Telegramni ochishga majbur
-- qiladi. Odam esa ilovani xuddi oddiy ilovadek ochmoqchi. Endi u
-- raqamini kiritadi, botga tasdiqlash so'rovi keladi, tasdiqlagach
-- brauzer seansi ochiladi va Chrome'da ham ishlaydi.
--
-- Xavfsizlik: kirish faqat ALLAQACHON botdan ro'yxatdan o'tgan va
-- telefoni tasdiqlangan odam uchun. Tasdiqni Telegramdagi o'sha odam
-- beradi, ya'ni raqamni bilgan begona kira olmaydi.

-- ── Kirish so'rovlari ──
-- Brauzer `kalit` bilan holatni so'rab turadi, bot esa `id` bo'yicha
-- tasdiqlaydi. Kod ikkalasida ham ko'rsatiladi: odam brauzerdagi kod
-- botdagiga mos kelsagina tasdiqlaydi — bu boshqaning so'rovini
-- adashib tasdiqlashdan saqlaydi.
create table if not exists public.kirish_sorovlari (
  id          bigserial primary key,
  kalit       text not null unique,
  user_id     bigint not null references public.users(id) on delete cascade,
  kod         text not null,
  holat       text not null default 'kutilmoqda',   -- kutilmoqda|tasdiqlandi|rad|olindi
  ip          text,
  qurilma     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists kirish_sorovlari_user_idx
  on public.kirish_sorovlari (user_id, created_at desc);
create index if not exists kirish_sorovlari_muddat_idx
  on public.kirish_sorovlari (expires_at);

-- ── Brauzer seanslari ──
-- Token XOM holda saqlanmaydi: baza sizib chiqsa ham u bilan kirib
-- bo'lmasin. Faqat sha256 xesh turadi.
create table if not exists public.ilova_seanslar (
  id          bigserial primary key,
  user_id     bigint not null references public.users(id) on delete cascade,
  token_hash  text not null unique,
  qurilma     text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists ilova_seanslar_user_idx
  on public.ilova_seanslar (user_id, last_seen desc);
create index if not exists ilova_seanslar_muddat_idx
  on public.ilova_seanslar (expires_at);
