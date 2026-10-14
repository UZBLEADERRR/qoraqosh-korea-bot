-- TELEGRAM BUSINESS va KONTENT TAVSIYALARI.
--
-- ig_suhbatlar.platforma — suhbat qayerda: Instagram Direct yoki Telegram
-- (Telegram Business: bot do'kon egasining SHAXSIY akkauntiga kelgan
-- xabarlarga uning nomidan javob beradi). Telegram suhbatida igsid =
-- 'tg:<chat_id>'.
-- kontent_tavsiyalar — har kuni adminga ketgan Instagram kontent g'oyalari:
-- keyingi kunlarda TAKRORLANMASLIGI uchun.
alter table public.ig_suhbatlar add column if not exists platforma text not null default 'instagram';
create index if not exists ig_suhbatlar_platforma_idx on public.ig_suhbatlar (platforma);

create table if not exists public.kontent_tavsiyalar (
  id         bigserial primary key,
  mavzu      text not null,
  format     text,
  tafsilot   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists kontent_tavsiyalar_vaqt_idx on public.kontent_tavsiyalar (created_at desc);
