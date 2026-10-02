-- PUSH BILDIRISHNOMALAR (Web Push).
--
-- Google yoki telefon bilan kirgan mijozning Telegrami yo'q — bot unga
-- «buyurtmangiz yo'lda» deb yoza olmaydi. Endi ilova (Android ilova
-- ham, brauzer ham) telefonning o'z bildirishnomasini oladi.
--
-- Har qurilma alohida obuna: bitta odam telefon va kompyuterdan
-- kirgan bo'lsa ikkalasiga ham boradi. Brauzer obunani bekor qilsa
-- (404/410) qator o'chiriladi.

create table if not exists public.push_obunalar (
  id          bigserial primary key,
  user_id     bigint not null references public.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  qurilma     text,
  created_at  timestamptz not null default now(),
  oxirgi_marta timestamptz,
  xatolar     int not null default 0
);
create index if not exists push_obunalar_user_idx on public.push_obunalar (user_id);
