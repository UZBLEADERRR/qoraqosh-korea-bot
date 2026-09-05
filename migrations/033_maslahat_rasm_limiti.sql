-- Maslahatchiga yuboriladigan rasmlar uchun KUNLIK chegara.
--
-- Rasm — eng qimmat chaqiruv: matn savoli bir necha yuz token bo'lsa,
-- rasm mingdan ortiq. Chegarasiz qoldirilsa bitta odam bir kunda
-- butun kunlik kvotani yeb qo'yishi mumkin va qolgan mijozlarga
-- skaner ham, maslahatchi ham ishlamaydi.
--
-- Matnli savol chegarasi o'z joyida qoladi (10 daqiqada 20 ta) —
-- bu yerda faqat RASM cheklanadi.
insert into public.settings (key, value) values
  ('limit_maslahat_rasm', '3'::jsonb)
on conflict (key) do nothing;

-- Bugun nechta rasm yuborilgani. Hisob `events` dagi
-- 'maslahat_rasm' yozuvlaridan olinadi — alohida jadval kerak emas.
-- Kun chegarasi Toshkent vaqti bo'yicha, skaner limiti bilan bir xil.
create or replace function public.maslahat_rasm_limiti(p_user_id bigint)
returns table (ishlatilgan integer, limit_soni integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_limit integer;
begin
  select coalesce((value)::text::int, 3) into v_limit
    from settings where key = 'limit_maslahat_rasm';

  return query
    select (select count(*)::int from events
             where user_id = p_user_id
               and type = 'maslahat_rasm'
               and created_at >= (date_trunc('day', now() at time zone 'Asia/Tashkent')
                                  at time zone 'Asia/Tashkent')),
           coalesce(v_limit, 3);
end $$;

revoke all on function public.maslahat_rasm_limiti(bigint) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.maslahat_rasm_limiti(bigint) to service_role;
  end if;
end $$;

-- Kunlik sanash uchun: (user_id, type, created_at)
create index if not exists events_user_type_idx
  on public.events (user_id, type, created_at desc);
