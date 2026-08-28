-- Kunlik skaner limiti va menejer aloqasi.

insert into public.settings (key, value) values
  -- Kunlik yuz skaneri limiti
  ('limit_bepul',  '3'::jsonb),      -- hali xarid qilmagan foydalanuvchi
  ('limit_mijoz',  '10'::jsonb),     -- kamida bitta buyurtmasi bor
  ('limit_yoqilgan', 'true'::jsonb), -- umuman limit ishlaydimi
  -- Menejer aloqasi
  ('menejer_telefon', '""'::jsonb),
  ('menejer_ish_vaqti', '"Har kuni 9:00 – 21:00"'::jsonb)
on conflict (key) do nothing;

-- Kunlik sanash uchun analyses_user_idx (user_id, created_at desc) yetarli —
-- oraliq bo'yicha qidiriladi. created_at::date indeks ifodasi bo'la olmaydi
-- (u vaqt mintaqasiga bog'liq, ya'ni IMMUTABLE emas).

-- Foydalanuvchining bugungi skanerlari va limiti.
-- Mijoz = kamida bitta bekor qilinmagan buyurtmasi bor.
create or replace function public.skaner_limiti(p_user_id bigint)
returns table (ishlatilgan integer, limit_soni integer, mijozmi boolean, yoqilganmi boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_mijoz   boolean;
  v_bepul   integer;
  v_mijozL  integer;
  v_yoqilgan boolean;
begin
  select exists (select 1 from orders where user_id = p_user_id and status <> 'bekor')
    into v_mijoz;

  select coalesce((value)::text::int, 3)  into v_bepul  from settings where key = 'limit_bepul';
  select coalesce((value)::text::int, 10) into v_mijozL from settings where key = 'limit_mijoz';
  select coalesce((value)::text::boolean, true) into v_yoqilgan from settings where key = 'limit_yoqilgan';

  -- Kun chegarasi Toshkent vaqti bo'yicha: mijoz uchun "bugun" shu.
  return query
    select (select count(*)::int from analyses
             where user_id = p_user_id
               and created_at >= (date_trunc('day', now() at time zone 'Asia/Tashkent')
                                  at time zone 'Asia/Tashkent')),
           case when v_mijoz then coalesce(v_mijozL, 10) else coalesce(v_bepul, 3) end,
           v_mijoz,
           coalesce(v_yoqilgan, true);
end $$;

revoke all on function public.skaner_limiti(bigint) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.skaner_limiti(bigint) to service_role;
  end if;
end $$;
