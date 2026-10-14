-- «BOTNI BLOKLAGAN» va «ADMIN BLOKLAGAN» — ikki xil narsa.
--
-- Ilgari ommaviy xabar «bot was blocked / chat not found» qaytarsa
-- foydalanuvchi `is_blocked = true` qilinardi. Lekin `is_blocked` — admin
-- panelidagi taqiq: bot bunday odamga UMUMAN javob bermaydi. Natijada
-- botni bir marta bloklab (yoki chatni o'chirib) keyin qaytgan odam
-- /start bossa ham bot abadiy jim turardi.
--
-- Endi: `bot_bloklagan_at` — Telegram «bloklagan» degan vaqt (faqat
-- ommaviy yuborishdan chetlatish uchun). Odam botga yana yozsa yoki
-- blokdan chiqarsa — tozalanadi. `is_blocked` faqat admin taqiqi.
alter table public.users add column if not exists bot_bloklagan_at timestamptz;

-- Mavjud belgilarni ajratib bo'lmaydi (qaysi biri admin, qaysi biri
-- ommaviy yuborishdan). Ommaviy yuborishdagi belgi juda ko'p, admin taqiqi
-- esa kamdan-kam — shuning uchun hammasi «botni bloklagan» ga o'tkaziladi.
-- Admin kimnidir ataylab bloklagan bo'lsa, panelda qayta bloklaydi.
update public.users set bot_bloklagan_at = coalesce(bot_bloklagan_at, now()), is_blocked = false
  where is_blocked;
