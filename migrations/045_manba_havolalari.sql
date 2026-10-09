-- MANBA HAVOLALARI: odam qayerdan keldi — Instagram, TikTok, Telegram…
--
-- Har reklama joyiga o'z qisqa havolasi: www.kiovo.shop/h/ig (Instagram
-- bio), /h/tt (TikTok bio), /h/tt-aksiya (bitta video). Havola bosilganda
-- bosish yoziladi va odam kerakli sahifaga o'tadi; keyin ro'yxatdan
-- o'tsa, foydalanuvchiga shu manba yoziladi — shuning uchun «nechta odam
-- keldi» bilan birga «nechtasi sotib oldi va qancha pul keltirdi» ham
-- ko'rinadi.
create table if not exists public.havolalar (
  id         bigserial primary key,
  kod        text not null unique check (kod ~ '^[a-z0-9-]{2,32}$'),
  nom        text not null,
  manba      text not null,                  -- instagram | tiktok | telegram | youtube | facebook | google | boshqa
  maqsad     text not null default 'skan',   -- skan | sayt | ilova | bot | miniapp
  faol       boolean not null default true,
  created_at timestamptz not null default now()
);

-- Har bosish (yoki havolasiz, lekin Instagram/TikTok ichidan kelgan tashrif)
create table if not exists public.havola_bosishlar (
  id         bigserial primary key,
  havola_id  bigint references public.havolalar(id) on delete cascade,
  manba      text not null,
  mehmon     text,                           -- brauzer belgisi: «unikal odam» sanash uchun
  qurilma    text,                           -- android | ios | kompyuter
  created_at timestamptz not null default now()
);
create index if not exists havola_bosishlar_vaqt_idx on public.havola_bosishlar (created_at);
create index if not exists havola_bosishlar_havola_idx on public.havola_bosishlar (havola_id, created_at);

-- Foydalanuvchining birinchi manbasi (keyingi bosishlar uni almashtirmaydi)
alter table public.users add column if not exists manba text;
alter table public.users add column if not exists havola_id bigint
  references public.havolalar(id) on delete set null;
create index if not exists users_manba_idx on public.users (manba, created_at) where manba is not null;

-- Tayyor havolalar: bio uchun. Admin xohlasa nomini/manzilini o'zgartiradi.
insert into public.havolalar (kod, nom, manba, maqsad) values
  ('ig', 'Instagram bio', 'instagram', 'skan'),
  ('tt', 'TikTok bio',    'tiktok',    'skan'),
  ('tg', 'Telegram kanal', 'telegram', 'bot')
on conflict (kod) do nothing;
