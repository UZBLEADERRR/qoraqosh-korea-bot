-- Omborlar/filiallar, manzil tuzilishi, Telegram orqali admin kirishi
-- va yuklamaga chidamlilik uchun indekslar.

-- ============ ADMIN ============
-- Telegram orqali kirish: shu bayroq bo'lgan foydalanuvchi admin panelga kiradi.
alter table public.users add column if not exists is_admin boolean not null default false;
create index if not exists users_admin_idx on public.users (is_admin) where is_admin;

-- ============ MANZIL ============
-- Manzil endi tuzilgan: viloyat + tuman + qolgani matn.
alter table public.users  add column if not exists viloyat text;
alter table public.users  add column if not exists tuman   text;
alter table public.orders add column if not exists viloyat text;
alter table public.orders add column if not exists tuman   text;

-- ============ OMBOR / FILIAL ============
create table if not exists public.omborlar (
  id          bigserial primary key,
  nom         text not null,
  viloyat     text not null,
  tuman       text,
  manzil      text,
  telefon     text,
  ish_vaqti   text,
  mo_ljal     text,                       -- "Metro yonida", "3-qavat"
  faol        boolean not null default true,
  tartib      integer not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists omborlar_viloyat_idx on public.omborlar (viloyat) where faol;

alter table public.orders add column if not exists ombor_id bigint
  references public.omborlar(id) on delete set null;

-- ============ TO'LOV: faqat karta ============
update public.orders set payment_method = 'karta' where payment_method = 'naqd';
update public.orders set payment_status = 'kutilmoqda' where payment_status = 'naqd';
alter table public.orders alter column payment_method set default 'karta';

-- place_order: naqd yo'q, manzil tuzilgan, ombor tanlanadi
create or replace function public.place_order(
  p_user_id  bigint,
  p_items    jsonb,
  p_name     text,
  p_phone    text,
  p_address  text,
  p_note     text default null,
  p_payment  text default 'karta',
  p_viloyat  text default null,
  p_tuman    text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_product public.products%rowtype; v_qty integer;
  v_subtotal integer := 0; v_cost_total integer := 0; v_items jsonb := '[]'::jsonb;
  v_fee integer; v_free_from integer; v_chegirma integer := 0; v_pogona jsonb;
  v_order public.orders; v_no text; v_ombor bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'BOSH_SAVAT'; end if;
  if coalesce(trim(p_phone), '')   = '' then raise exception 'TELEFON_YOQ'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'MANZIL_YOQ';  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and is_active for update;
    if not found then raise exception 'MAHSULOT_TOPILMADI:%', v_item->>'product_id'; end if;
    if v_product.stock < v_qty then
      raise exception 'OMBORDA_YETARLI_EMAS:%:%', v_product.name, v_product.stock;
    end if;
    update public.products set stock = stock - v_qty, sold_count = sold_count + v_qty,
           updated_at = now() where id = v_product.id;
    v_subtotal   := v_subtotal   + v_product.price * v_qty;
    v_cost_total := v_cost_total + v_product.cost_price * v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'brand', v_product.brand,
      'price', v_product.price, 'cost_price', v_product.cost_price, 'qty', v_qty);
  end loop;

  for v_pogona in select * from jsonb_array_elements(
      coalesce((select value from public.settings where key = 'chegirma_pogonalari'), '[]'::jsonb)) loop
    if v_subtotal >= (v_pogona->>'dan')::int then
      v_chegirma := greatest(v_chegirma, (v_pogona->>'chegirma')::int);
    end if;
  end loop;
  v_chegirma := least(v_chegirma, v_subtotal);

  select (value)::text::int into v_fee       from public.settings where key = 'delivery_fee';
  select (value)::text::int into v_free_from from public.settings where key = 'free_delivery_from';
  v_fee := coalesce(v_fee, 25000); v_free_from := coalesce(v_free_from, 500000);
  if v_subtotal >= v_free_from then v_fee := 0; end if;

  -- Eng yaqin ombor: avval tuman, keyin viloyat bo'yicha
  select id into v_ombor from public.omborlar
   where faol and (tuman = p_tuman and viloyat = p_viloyat) order by tartib limit 1;
  if v_ombor is null then
    select id into v_ombor from public.omborlar
     where faol and viloyat = p_viloyat order by tartib limit 1;
  end if;

  v_no := 'QQ-' || to_char(now(), 'YYMMDD') || '-' ||
          lpad((nextval('public.order_no_seq'))::text, 4, '0');

  insert into public.orders (
    order_no, user_id, customer_name, customer_phone, customer_address, note,
    viloyat, tuman, ombor_id, items, subtotal, delivery_fee, discount, total, cost_total,
    payment_method, payment_status
  ) values (
    v_no, p_user_id, p_name, p_phone, p_address, p_note,
    p_viloyat, p_tuman, v_ombor, v_items, v_subtotal, v_fee, v_chegirma,
    v_subtotal - v_chegirma + v_fee, v_cost_total, 'karta', 'kutilmoqda'
  ) returning * into v_order;

  delete from public.cart_items where user_id = p_user_id;
  update public.users set checkout_draft = '{}'::jsonb,
         viloyat = coalesce(p_viloyat, viloyat), tuman = coalesce(p_tuman, tuman)
   where id = p_user_id;
  insert into public.events (user_id, type, meta)
    values (p_user_id, 'order', jsonb_build_object('order_no', v_no, 'total', v_order.total));
  return v_order;
end $$;

drop function if exists public.place_order(bigint, jsonb, text, text, text, text, text);
revoke all on function public.place_order(bigint, jsonb, text, text, text, text, text, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.place_order(bigint, jsonb, text, text, text, text, text, text, text) to service_role;
  end if;
end $$;

-- ============ SOZLAMALAR ============
insert into public.settings (key, value) values
  ('ombor_xabari_yoqilgan', 'true'::jsonb)
on conflict (key) do nothing;

-- ============ YUKLAMAGA CHIDAMLILIK ============
-- Kunlik minglab foydalanuvchi uchun eng ko'p ishlatiladigan yo'llar
create index if not exists users_telegram_idx      on public.users (telegram_id);
create index if not exists orders_user_holat_idx   on public.orders (user_id, status);
create index if not exists events_user_vaqt_idx    on public.events (user_id, created_at desc);
create index if not exists cart_user_idx           on public.cart_items (user_id);
create index if not exists products_faol_step_idx  on public.products (is_active, step) where is_active;
-- Statistika uchun: bekor qilinmagan buyurtmalar
create index if not exists orders_faol_vaqt_idx    on public.orders (created_at desc)
  where status <> 'bekor';
