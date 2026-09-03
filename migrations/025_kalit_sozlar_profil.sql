-- Qidiruv kalit so'zlari va kengaytirilgan profil.
--
-- Kalit so'zlar: odam "penka" deb ham, "пенка" deb ham, "foam cleanser"
-- deb ham qidiradi. Mahsulot nomi esa koreyscha yoki inglizcha. Shu
-- ustun har mahsulotga o'sha odam yozishi mumkin bo'lgan so'zlarni
-- saqlaydi — AI import paytida to'ldiradi, keyin qidiruv shu bo'yicha
-- ham ishlaydi.
alter table products add column if not exists kalit_sozlar text[] not null default '{}';
create index if not exists products_kalit_idx on products using gin (kalit_sozlar);

-- Profil: odam o'zi haqida aytgan narsalar. Allergiya va kasallik AI
-- tavsiyasiga ta'sir qiladi — mos kelmaydigan mahsulot tavsiya
-- qilinmasligi kerak.
alter table users add column if not exists avatar_url  text;
alter table users add column if not exists teri_turi   text;
alter table users add column if not exists allergiya   text;
alter table users add column if not exists kasallik    text;
