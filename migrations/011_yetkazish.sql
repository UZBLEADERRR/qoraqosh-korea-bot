-- Yetkazib berish: og'irlik bo'yicha hisoblash, filialdan olish yoki uygacha.
--
-- Biz mijozning uyigacha O'ZIMIZ eltmaymiz. Jo'natma pochta orqali ketadi:
--   • filial  — mijoz eng yaqin pochta filialidan olib ketadi (arzonroq)
--   • uy      — pochta mijozning manziligacha yetkazadi
-- Narx og'irlikka qarab hisoblanadi, qadoqlash uchun ustiga 200 g qo'shiladi.

-- ══════════ 1. Mahsulot og'irligi ══════════
-- Gramm. 0 bo'lsa standart qiymat ishlatiladi (sozlamadan).
alter table public.products add column if not exists ogirlik integer not null default 0;

-- ══════════ 2. Buyurtmada yetkazish ══════════
alter table public.orders add column if not exists yetkazish_turi text not null default 'filial';
alter table public.orders add column if not exists ogirlik integer not null default 0;

-- ══════════ 3. Sozlamalar ══════════
insert into public.settings (key, value) values
  -- Qaysi xizmat: emu | bts | jadval (o'z tarifingiz)
  ('yetkazish_provayder', '"emu"'::jsonb),
  -- API sozlanmagan bo'lsa shu jadval ishlaydi (EMU ning e'lon qilingan tarifi)
  ('tarif_filial_1kg',    '7000'::jsonb),    -- filialdan filialga, 1 kg gacha
  ('tarif_uy_1kg',        '15000'::jsonb),   -- filialdan mijoz manziligacha
  ('tarif_qoshimcha_kg',  '5000'::jsonb),    -- har keyingi kg uchun
  ('qadoq_ogirlik',       '200'::jsonb),     -- qadoqlash uchun qo'shiladigan gramm
  ('standart_ogirlik',    '150'::jsonb),     -- mahsulot og'irligi kiritilmagan bo'lsa
  -- Haqiqiy API bo'lsa shu yerga yoziladi (bo'sh bo'lsa jadval ishlatiladi)
  ('yetkazish_api_url',   '""'::jsonb),
  ('yetkazish_api_kalit', '""'::jsonb),
  ('jonatuvchi_viloyat',  '"Toshkent shahri"'::jsonb)
on conflict (key) do nothing;

-- ══════════ 4. place_order: yetkazish narxi tashqaridan ══════════
-- Narx server kodida (src/services/yetkazish.js) hisoblanadi va shu yerga
-- beriladi. Mijoz yuborgan summa emas — server hisoblagani.
-- p_yetkazish null bo'lsa eski xatti-harakat: settings dagi qat'iy narx.
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
  v_fee integer; v_free_from integer; v_chegirma integer := 0; v_pogona jsonb;
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
    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'brand', v_product.brand,
      'price', v_product.price, 'qty', v_qty);

    update public.products set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
  end loop;

  -- Chegirma pog'onalari: eng kattasi qo'llanadi
  for v_pogona in select * from jsonb_array_elements(
      coalesce((select value from public.settings where key = 'chegirma_pogonalari'), '[]'::jsonb)) loop
    if v_subtotal >= coalesce((v_pogona->>'dan')::int, 0) then
      v_chegirma := greatest(v_chegirma, coalesce((v_pogona->>'chegirma')::int, 0));
    end if;
  end loop;
  v_chegirma := least(v_chegirma, v_subtotal);

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
    payment_method, payment_status, yetkazish_turi, ogirlik
  ) values (
    v_no, p_user_id, coalesce(nullif(trim(p_name), ''), 'Mijoz'), trim(p_phone), trim(p_address), p_note,
    p_viloyat, p_tuman, v_ombor, v_items, v_subtotal, v_fee, v_chegirma,
    v_subtotal - v_chegirma + v_fee, v_cost_total, 'karta', 'kutilmoqda',
    case when p_turi = 'uy' then 'uy' else 'filial' end, greatest(0, coalesce(p_ogirlik, 0))
  ) returning * into v_order;

  return v_order;
end $$;

-- Postgres funksiyaga EXECUTE ni sukut bo'yicha PUBLIC ga beradi va anon
-- shuni meros qilib oladi. Faqat server (postgres roli) chaqira olsin.
revoke all on function public.place_order(bigint, jsonb, text, text, text, text, text, text, text, integer, text, integer) from public;

-- Eski 9 argumentli variant endi kerak emas — chalkashmasin
drop function if exists public.place_order(bigint, jsonb, text, text, text, text, text, text, text);
