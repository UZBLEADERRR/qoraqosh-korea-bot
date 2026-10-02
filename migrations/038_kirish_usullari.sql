-- KIRISH USULLARI: Google (Gmail), telefon (SMS) va Telegram.
--
-- Play Store'dan yuklagan odamda Telegram bo'lmasligi mumkin. Ilgari
-- ilovaga faqat botda oldindan ro'yxatdan o'tganlar kira olardi —
-- yangi mijoz ham, Google tekshiruvchisi ham ilovani ocha olmasdi.
--
-- Telegramsiz foydalanuvchi uchun `telegram_id` sun'iy: `google:<sub>`
-- yoki `tel:+998…`. Ochiq skanerdagi mehmon (`mehmon:<token>`) bilan
-- bir xil yondashuv: kod bo'ylab `telegram_id` bilan ishlaydigan joylar
-- buzilmaydi, botga xabar yuborish esa bunday id uchun o'tkazib
-- yuboriladi (src/bot/tg.js).

alter table public.users add column if not exists email text;
alter table public.users add column if not exists google_sub text;
create unique index if not exists users_google_sub_uq
  on public.users (google_sub) where google_sub is not null;
create index if not exists users_email_idx on public.users (lower(email));

-- Telegram orqali kirishda so'rov yaratilganda foydalanuvchi hali
-- noma'lum: uni bot aniqlaydi (kim /start bosgan bo'lsa).
alter table public.kirish_sorovlari alter column user_id drop not null;
-- telefon — botdan tasdiqlash (eski yo'l), telegram — deep link, sms — kod
alter table public.kirish_sorovlari add column if not exists tur text not null default 'telefon';
alter table public.kirish_sorovlari add column if not exists telefon text;
-- Noto'g'ri kod urinishlari — 5 tadan keyin so'rov yopiladi
alter table public.kirish_sorovlari add column if not exists urinish int not null default 0;
create index if not exists kirish_sorovlari_telefon_idx
  on public.kirish_sorovlari (telefon, created_at desc) where telefon is not null;
