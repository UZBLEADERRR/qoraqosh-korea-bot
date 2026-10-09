-- TAKLIF HAVOLALARI: havolani ko'p odamga tarqatib, kim nechta odam
-- olib kelganini bilish (ambassador, bloger, sotuvchi, do'st).
--
-- Bir urinishda yuzlab havola yaratiladi: har odamga o'z havolasi.
-- `guruh` — qaysi tarqatishga tegishli («Oktabr ambassadorlari»),
-- `sir` — taklifchining o'z natijasini ko'radigan sahifasi uchun kalit
-- (www.kiovo.shop/taklif/<kod>?s=<sir>): boshqalarning raqamini ko'ra olmaydi.
alter table public.havolalar add column if not exists guruh text;
alter table public.havolalar add column if not exists telefon text;
alter table public.havolalar add column if not exists sir text;
update public.havolalar set sir = substr(md5(random()::text || id::text), 1, 12) where sir is null;
alter table public.havolalar alter column sir set default substr(md5(random()::text || clock_timestamp()::text), 1, 12);
create index if not exists havolalar_guruh_idx on public.havolalar (guruh);
