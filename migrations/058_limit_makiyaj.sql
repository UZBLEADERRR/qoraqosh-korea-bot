-- Kunlik skaner limiti endi makiyaj rang tahlilini HAM hisoblaydi.
-- Ilgari makiyaj o'z alohida chegarasi (kuniga 6) bilan ishlardi va
-- teri limiti 3 bo'lsa ham odam kuniga 9 ta rasm tahlil qildira olardi.
create or replace function public.skaner_limiti(p_user_id bigint)
returns table (ishlatilgan integer, limit_soni integer, mijozmi boolean, yoqilganmi boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_mijoz   boolean;
  v_bepul   integer;
  v_mijozL  integer;
  v_yoqilgan boolean;
  v_bugun   timestamptz := date_trunc('day', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent';
begin
  select exists (select 1 from orders where user_id = p_user_id and status <> 'bekor')
    into v_mijoz;

  select coalesce((value)::text::int, 3)  into v_bepul  from settings where key = 'limit_bepul';
  select coalesce((value)::text::int, 10) into v_mijozL from settings where key = 'limit_mijoz';
  select coalesce((value)::text::boolean, true) into v_yoqilgan from settings where key = 'limit_yoqilgan';

  return query
    select ((select count(*) from analyses where user_id = p_user_id and created_at >= v_bugun)
          + (select count(*) from makiyaj_profillar where user_id = p_user_id and created_at >= v_bugun))::int,
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
