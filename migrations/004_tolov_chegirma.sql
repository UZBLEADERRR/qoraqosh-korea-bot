-- Chegirma pog'onalari, karta bilan to'lov, buyurtma qoralamasi.

-- ---------- Sozlamalar ----------
insert into public.settings (key, value) values
  -- Pog'onali chegirma: summa "dan" oshsa "chegirma" so'm ayiriladi.
  -- Admin panelidan tahrirlanadi. Eng yuqori mos pog'ona qo'llanadi.
  ('chegirma_pogonalari', '[{"dan":300000,"chegirma":15000},{"dan":600000,"chegirma":45000}]'::jsonb),
  ('karta_raqami',        '"8600 0000 0000 0000"'::jsonb),
  ('karta_egasi',         '"QoraQosh"'::jsonb),
  ('konsultatsiya_user',  '"qoraqosh_admin"'::jsonb),
  ('dokon_nomi',          '"QoraQosh"'::jsonb)
on conflict (key) do nothing;

-- ---------- Buyurtma ----------
alter table public.orders add column if not exists discount        integer not null default 0;
alter table public.orders add column if not exists receipt_id      uuid;
alter table public.orders add column if not exists payment_status  text not null default 'kutilmoqda';
-- kutilmoqda | chek_yuborilgan | tolangan | naqd

-- Chek rasmi media jadvalida yashaydi
do $$ begin
  alter table public.orders
    add constraint orders_receipt_fk foreign key (receipt_id)
    references public.media(id) on delete set null;
exception when duplicate_object then null; end $$;

-- media.tur endi 'chek' ham bo'ladi; product_id majburiy emas (allaqachon nullable)

-- ---------- Buyurtma qoralamasi ----------
-- Mijoz to'lov oynasining yarmida chiqib ketsa, qaytganda hammasi joyida turadi.
alter table public.users add column if not exists checkout_draft jsonb not null default '{}'::jsonb;

-- ---------- place_order: chegirma bilan ----------
create or replace function public.place_order(
  p_user_id  bigint,
  p_items    jsonb,
  p_name     text,
  p_phone    text,
  p_address  text,
  p_note     text default null,
  p_payment  text default 'naqd'
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_qty        integer;
  v_subtotal   integer := 0;
  v_cost_total integer := 0;
  v_items      jsonb := '[]'::jsonb;
  v_fee        integer;
  v_free_from  integer;
  v_chegirma   integer := 0;
  v_pogona     jsonb;
  v_order      public.orders;
  v_no         text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'BOSH_SAVAT'; end if;
  if coalesce(trim(p_phone), '')   = '' then raise exception 'TELEFON_YOQ'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'MANZIL_YOQ';  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));

    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and is_active
      for update;

    if not found then raise exception 'MAHSULOT_TOPILMADI:%', v_item->>'product_id'; end if;
    if v_product.stock < v_qty then
      raise exception 'OMBORDA_YETARLI_EMAS:%:%', v_product.name, v_product.stock;
    end if;

    update public.products
       set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
     where id = v_product.id;

    v_subtotal   := v_subtotal   + v_product.price * v_qty;
    v_cost_total := v_cost_total + v_product.cost_price * v_qty;

    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'brand', v_product.brand,
      'price', v_product.price, 'cost_price', v_product.cost_price, 'qty', v_qty);
  end loop;

  -- Chegirma: eng yuqori mos pog'ona
  for v_pogona in
    select * from jsonb_array_elements(
      coalesce((select value from public.settings where key = 'chegirma_pogonalari'), '[]'::jsonb))
  loop
    if v_subtotal >= (v_pogona->>'dan')::int then
      v_chegirma := greatest(v_chegirma, (v_pogona->>'chegirma')::int);
    end if;
  end loop;
  v_chegirma := least(v_chegirma, v_subtotal);   -- chegirma summadan oshmasin

  select (value)::text::int into v_fee       from public.settings where key = 'delivery_fee';
  select (value)::text::int into v_free_from from public.settings where key = 'free_delivery_from';
  v_fee       := coalesce(v_fee, 25000);
  v_free_from := coalesce(v_free_from, 500000);
  if v_subtotal >= v_free_from then v_fee := 0; end if;

  v_no := 'QQ-' || to_char(now(), 'YYMMDD') || '-' ||
          lpad((nextval('public.order_no_seq'))::text, 4, '0');

  insert into public.orders (
    order_no, user_id, customer_name, customer_phone, customer_address, note,
    items, subtotal, delivery_fee, discount, total, cost_total,
    payment_method, payment_status
  ) values (
    v_no, p_user_id, p_name, p_phone, p_address, p_note,
    v_items, v_subtotal, v_fee, v_chegirma, v_subtotal - v_chegirma + v_fee, v_cost_total,
    coalesce(p_payment, 'naqd'),
    case when p_payment = 'karta' then 'kutilmoqda' else 'naqd' end
  ) returning * into v_order;

  delete from public.cart_items where user_id = p_user_id;
  update public.users set checkout_draft = '{}'::jsonb where id = p_user_id;
  insert into public.events (user_id, type, meta)
    values (p_user_id, 'order', jsonb_build_object('order_no', v_no, 'total', v_order.total));

  return v_order;
end $$;

revoke all on function public.place_order(bigint, jsonb, text, text, text, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.place_order(bigint, jsonb, text, text, text, text, text) to service_role;
  end if;
end $$;

-- Eski 6 argumentli variantni olib tashlaymiz (chalkashmasin)
drop function if exists public.place_order(bigint, jsonb, text, text, text, text);

-- ---------- Chegirmani oldindan hisoblash (Mini App savatida ko'rsatish uchun) ----------
create or replace function public.chegirma_hisobla(p_subtotal integer)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_pogona jsonb; v_ch integer := 0;
begin
  for v_pogona in
    select * from jsonb_array_elements(
      coalesce((select value from public.settings where key = 'chegirma_pogonalari'), '[]'::jsonb))
  loop
    if p_subtotal >= (v_pogona->>'dan')::int then
      v_ch := greatest(v_ch, (v_pogona->>'chegirma')::int);
    end if;
  end loop;
  return least(v_ch, p_subtotal);
end $$;
revoke all on function public.chegirma_hisobla(integer) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.chegirma_hisobla(integer) to service_role;
  end if;
end $$;
