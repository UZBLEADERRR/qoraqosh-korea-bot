-- KiOVO: brend nomi, mahsulot soniga qarab chegirma va minimal buyurtma.
--
-- Uchta o'zgarish:
--   1. Do'kon nomi Meduza Cosmetics dan KiOVO ga o'tdi
--   2. Har bir mahsulot uchun qat'iy chegirma (masalan 5 000 so'm).
--      6 ta mahsulot olgan mijoz 30 000 so'm chegirma oladi — bu pochta
--      haqini qoplaydi. Bu "ko'proq olish" uchun eng tushunarli turtki.
--   3. Minimal buyurtma summasi — kichik buyurtma pochta bilan zarar keltiradi

update public.settings
   set value = '"KiOVO"'::jsonb, updated_at = now()
 where key = 'dokon_nomi'
   and value in ('"Meduza Cosmetics"'::jsonb, '"QoraQosh"'::jsonb, '""'::jsonb);

insert into public.settings (key, value) values
  -- Har bir DONA mahsulot uchun chegirma, so'm. 0 — o'chirilgan.
  ('mahsulot_chegirma', '0'::jsonb),
  -- Chegirma boshlanadigan minimal dona soni (masalan 3 tadan boshlab)
  ('mahsulot_chegirma_dan', '1'::jsonb),
  -- Minimal buyurtma summasi (mahsulotlar narxi, yetkazishsiz). 0 — cheklovsiz.
  ('minimal_buyurtma', '0'::jsonb)
on conflict (key) do nothing;

-- Buyurtmada qaysi chegirma qanday chiqqani ko'rinib tursin
alter table public.orders add column if not exists chegirma_izoh jsonb;

-- ══════════ place_order: dona chegirmasi va minimal summa ══════════
-- Ikkalasi ham SERVERDA emas, BAZADA tekshiriladi: mijoz yuborgan summa
-- hech qachon ishonchli emas.
create or replace function public.place_order(
  p_user_id   bigint,
  p_items     jsonb,
  p_name      text,
  p_phone     text,
  p_address   text,
  p_note      text default null,
  p_payment   text default 'karta',
  p_viloyat   text default null,
  p_tuman     text default null,
  p_yetkazish integer default null,
  p_turi      text default 'filial',
  p_ogirlik   integer default 0
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_product public.products%rowtype; v_qty integer;
  v_subtotal integer := 0; v_cost_total integer := 0; v_items jsonb := '[]'::jsonb;
  v_dona integer := 0;
  v_fee integer; v_free_from integer; v_chegirma integer := 0; v_pogona jsonb;
  v_dona_chegirma integer := 0; v_dona_narx integer; v_dona_dan integer;
  v_minimal integer; v_izoh jsonb;
  v_order public.orders; v_no text; v_ombor bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'BOSH_SAVAT'; end if;
  if coalesce(trim(p_phone), '')   = '' then raise exception 'TELEFON_YOQ'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'MANZIL_YOQ'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint and is_active for update;
    if not found then raise exception 'MAHSULOT_TOPILMADI:%', v_item->>'product_id'; end if;
    if v_product.stock < v_qty then
      raise exception 'OMBORDA_YETARLI_EMAS:%:%', v_product.name, v_product.stock;
    end if;

    v_subtotal   := v_subtotal   + v_product.price      * v_qty;
    v_cost_total := v_cost_total + v_product.cost_price * v_qty;
    v_dona       := v_dona + v_qty;
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'brand', v_product.brand,
      'price', v_product.price, 'qty', v_qty);

    update public.products set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
  end loop;

  -- ---- Minimal buyurtma ----
  select coalesce((value)::text::int, 0) into v_minimal
    from public.settings where key = 'minimal_buyurtma';
  v_minimal := coalesce(v_minimal, 0);
  if v_minimal > 0 and v_subtotal < v_minimal then
    raise exception 'MINIMAL_SUMMA:%:%', v_minimal, v_subtotal;
  end if;

  -- ---- Chegirma 1: summa pog'onalari (eng kattasi qo'llanadi) ----
  for v_pogona in select * from jsonb_array_elements(
      coalesce((select value from public.settings where key = 'chegirma_pogonalari'), '[]'::jsonb)) loop
    if v_subtotal >= coalesce((v_pogona->>'dan')::int, 0) then
      v_chegirma := greatest(v_chegirma, coalesce((v_pogona->>'chegirma')::int, 0));
    end if;
  end loop;

  -- ---- Chegirma 2: har bir dona uchun ----
  -- Pog'ona chegirmasi bilan QO'SHILADI: mijoz uchun "har mahsulotga
  -- 5 000" va'dasi shartsiz bo'lishi kerak, aks holda ishonch yo'qoladi.
  select coalesce((value)::text::int, 0) into v_dona_narx
    from public.settings where key = 'mahsulot_chegirma';
  select coalesce((value)::text::int, 1) into v_dona_dan
    from public.settings where key = 'mahsulot_chegirma_dan';
  v_dona_narx := coalesce(v_dona_narx, 0);
  v_dona_dan  := greatest(1, coalesce(v_dona_dan, 1));
  if v_dona_narx > 0 and v_dona >= v_dona_dan then
    v_dona_chegirma := v_dona_narx * v_dona;
  end if;

  v_chegirma := least(v_chegirma + v_dona_chegirma, v_subtotal);

  -- Yetkazish narxi
  if p_yetkazish is not null then
    v_fee := greatest(0, p_yetkazish);
  else
    select (value)::text::int into v_fee from public.settings where key = 'delivery_fee';
    v_fee := coalesce(v_fee, 25000);
  end if;
  select (value)::text::int into v_free_from from public.settings where key = 'free_delivery_from';
  v_free_from := coalesce(v_free_from, 500000);
  if v_subtotal >= v_free_from then v_fee := 0; end if;

  v_izoh := jsonb_build_object(
    'dona', v_dona, 'dona_narx', v_dona_narx, 'dona_chegirma', v_dona_chegirma,
    'pogona_chegirma', least(v_chegirma - v_dona_chegirma, v_subtotal),
    'minimal', v_minimal);

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
    payment_method, payment_status, yetkazish_turi, ogirlik, chegirma_izoh
  ) values (
    v_no, p_user_id, coalesce(nullif(trim(p_name), ''), 'Mijoz'), trim(p_phone), trim(p_address), p_note,
    p_viloyat, p_tuman, v_ombor, v_items, v_subtotal, v_fee, v_chegirma,
    v_subtotal - v_chegirma + v_fee, v_cost_total, 'karta', 'kutilmoqda',
    case when p_turi = 'uy' then 'uy' else 'filial' end, greatest(0, coalesce(p_ogirlik, 0)),
    v_izoh
  ) returning * into v_order;

  return v_order;
end $$;

revoke all on function public.place_order(bigint, jsonb, text, text, text, text, text, text, text, integer, text, integer) from public;

-- ══════════ Mahsulotni butunlay o'chirish ══════════
-- Arxivlash har doim yetarli emas: noto'g'ri qo'shilgan mahsulot katalogda
-- ko'rinmasa ham bazada, qidiruvda va hisobotlarda qolib ketadi.
--
-- Buyurtma tarixi BUZILMAYDI: orders.items ichida mahsulot nomi, brendi va
-- narxi NUSXA qilib saqlanadi, products ga havola emas. Shuning uchun
-- mahsulotni o'chirsak ham eski chek va hisobot butun qoladi.
--
-- cart_items va media (product_id bo'yicha) o'zi kaskad bilan o'chadi.
-- Poster media qatorida product_id bo'lmasligi mumkin — uni alohida olamiz.
create or replace function public.mahsulotni_ochir(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_nom text; v_poster uuid; v_savat integer; v_buyurtma integer;
begin
  select name, poster_id into v_nom, v_poster from public.products where id = p_id;
  if v_nom is null then raise exception 'MAHSULOT_TOPILMADI'; end if;

  select count(*)::int into v_savat from public.cart_items where product_id = p_id;
  -- Nechta buyurtmada uchraganini aytamiz: admin bilib turib o'chirsin
  select count(*)::int into v_buyurtma from public.orders
   where items @> jsonb_build_array(jsonb_build_object('product_id', p_id));

  delete from public.products where id = p_id;
  if v_poster is not null then
    delete from public.media where id = v_poster;
  end if;

  return jsonb_build_object('nom', v_nom, 'savat', v_savat, 'buyurtma', v_buyurtma);
end $$;

revoke all on function public.mahsulotni_ochir(bigint) from public;
