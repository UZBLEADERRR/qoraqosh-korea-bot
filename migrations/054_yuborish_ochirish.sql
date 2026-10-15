-- OMMAVIY XABARNI HAMMADAN O'CHIRISH.
--
-- Telegram bot o'z xabarini faqat message_id bilan (va 48 soat ichida)
-- o'chira oladi. Ilgari id lar saqlanmasdi — noto'g'ri xabar ketsa, uni
-- qaytarib bo'lmasdi. Endi har yetib borgan xabarning id si yoziladi.
create table if not exists public.yuborish_xabarlar (
  yuborish_id bigint not null references public.yuborishlar(id) on delete cascade,
  telegram_id text not null,
  message_id  bigint not null,
  created_at  timestamptz not null default now(),
  primary key (yuborish_id, telegram_id)
);
create index if not exists yuborish_xabarlar_vaqt_idx on public.yuborish_xabarlar (created_at);

alter table public.yuborishlar add column if not exists ochirish_holat text;      -- ketmoqda | tugadi | xato
alter table public.yuborishlar add column if not exists ochirildi integer not null default 0;
alter table public.yuborishlar add column if not exists ochirildi_at timestamptz;
