-- Instagramdan kelgan OCHIQ skanerlar.
--
-- Reklama oqimi: odam Instagramdagi havolani bosadi → brauzerda yuzini
-- skanerlaydi → qisqa tavsif va biologik yoshni ko'radi → qolgani
-- «xira» (blur) qilib berkitiladi → «To'liq natija Telegramda» tugmasi
-- botga olib boradi. Bot start parametridan aynan SHU tahlilni topadi.
--
-- Nega alohida jadval. Tahlilning o'zi `analyses` da, lekin u
-- foydalanuvchiga bog'langan bo'lishi shart. Shuning uchun ochiq
-- skanerga vaqtinchalik MEHMON foydalanuvchi yaratiladi; odam botga
-- kelib token bilan «da'vo» qilganda tahlil haqiqiy hisobiga
-- ko'chiriladi va mehmon o'chiriladi.
--
-- Token — bir martalik, taxmin qilib bo'lmaydigan 32 belgili satr.
create table if not exists public.ochiq_skan (
  token        text primary key,
  analysis_id  bigint not null references public.analyses(id) on delete cascade,
  mehmon_id    bigint references public.users(id) on delete set null,
  ip_xesh      text,                       -- IP ning xeshi: cheklov uchun, IP ning o'zi saqlanmaydi
  olindi_id    bigint references public.users(id) on delete set null,
  olindi_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ochiq_skan_vaqt_idx on public.ochiq_skan (created_at desc);
create index if not exists ochiq_skan_ip_idx   on public.ochiq_skan (ip_xesh, created_at desc);
