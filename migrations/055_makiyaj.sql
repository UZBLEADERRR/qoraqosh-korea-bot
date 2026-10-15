-- MAKIYAJ — «Mening rangim» (faqat ayollarga).
--
-- users.makiyaj — odamning o'z tanlovi (profil sozlamasi): null — avtomatik
-- (jins bo'yicha), true/false — o'zi yoqqan/o'chirgan. AI jinsni adashtirsa
-- ham ayol bo'limni o'zi yoqib oladi.
alter table public.users add column if not exists makiyaj boolean;

-- Rang tahlili natijasi: teri osti tusi, chuqurlik, rang tipi, yuz shakli…
create table if not exists public.makiyaj_profillar (
  id          bigserial primary key,
  user_id     bigint not null references public.users(id) on delete cascade,
  tus         text,            -- iliq | sovuq | neytral | zaytun
  chuqurlik   smallint,        -- 1 (juda och) … 6 (to'q)
  rang_tipi   text,            -- bahor | yoz | kuz | qish
  yuz_shakli  text,
  kozlar      text,
  teri_hex    text,            -- yonoqdan o'lchangan o'rtacha rang
  natija      jsonb not null default '{}'::jsonb,   -- maslahatlar, tavsiya, izoh
  created_at  timestamptz not null default now()
);
create index if not exists makiyaj_profillar_user_idx on public.makiyaj_profillar (user_id, created_at desc);

-- Makiyaj bosqichlari — products.step shu jadvalga bog'langan (FK).
-- Tartib — qo'llash ketma-ketligi (src/lib/makiyaj.js bilan bir xil).
insert into public.steps (slug, name, sort) values
  ('baza', 'Makiyaj: baza (praymer)', 20), ('ton', 'Makiyaj: ton (kushon / tonal krem)', 21),
  ('konsiler', 'Makiyaj: konsiler', 22), ('pudra', 'Makiyaj: pudra', 23), ('qosh', 'Makiyaj: qosh', 24),
  ('kozlar', 'Makiyaj: ko''z (soya, tush, qalam)', 25), ('rumyana', 'Makiyaj: rumyana / kontur', 26),
  ('lab', 'Makiyaj: lab (bo''yoq, tint)', 27), ('fiksator', 'Makiyaj: fiksator', 28)
  on conflict (slug) do nothing;

-- Makiyaj kategoriyasi — mahsulotlar shu yerga qo'shiladi
insert into public.categories (slug, name, emoji, sort, ikon)
  values ('makiyaj', 'Makiyaj', '💄', 85, 'yurak')
  on conflict (slug) do nothing;

-- Jins hech qayerda yozilmasdi: oxirgi yuz tahlilidagi AI xulosasidan to'ldiramiz
update public.users u set gender = a.jins
  from (select distinct on (user_id) user_id, jins from public.analyses
         where jins in ('ayol', 'erkak') order by user_id, created_at desc) a
 where u.id = a.user_id and u.gender is null;
