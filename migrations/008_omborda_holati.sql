-- "Omborga yetib keldi" holati va unga tegishli xabar.

do $$ begin
  alter type public.order_status add value if not exists 'omborda' after 'tasdiqlangan';
exception when others then null; end $$;

insert into public.settings (key, value) values
  ('xabar_holat_omborda', to_jsonb($$📦 <b>{raqam}</b> buyurtmangiz omborga yetib keldi!

📍 <b>{ombor}</b>
{manzil}
{mo_ljal}

📞 {telefon}
🕘 {ish_vaqti}

<i>Olib ketishingiz yoki kuryer yetkazishini kutishingiz mumkin.</i>$$::text))
on conflict (key) do nothing;
