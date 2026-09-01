-- Tahlil rasmi, oferta matni, skaner namunasi va agent tuzatishlari.

-- ══════════ 1. Foydalanuvchi surati ══════════
-- Ilovadagi tahlil bo'limida odam O'Z suratini, muammolar doira bilan
-- belgilangan holda ko'radi. Buning uchun surat saqlanishi kerak.
--
-- DIQQAT: bu maxfiylik qarori. Surat faqat SHU foydalanuvchining tahliliga
-- bog'lanadi, /ochir bilan tahlillar bilan birga o'chadi va admin
-- `yuz_rasm_saqlansin` ni o'chirsa umuman saqlanmaydi (u holda ilovada
-- surat ko'rinmaydi).
alter table public.analyses
  add column if not exists yuz_rasm_id uuid references public.media(id) on delete set null;

-- ══════════ 2. Reklama posti uchun mahsulot ══════════
-- Agent buyruq bilan mahsulot reklamasini tayyorlaganda qaysi mahsulot
-- ekani shu yerda turadi: post rasmi mahsulot posteridan olinadi.
alter table public.reja_bandlari
  add column if not exists mahsulot_id bigint references public.products(id) on delete set null;

-- Reja turi: kunlik kontent yoki bir martalik reklama
alter table public.rejalar
  add column if not exists turi text not null default 'kontent';

-- ══════════ 3. «Bugun tayyorlanganmi» ══════════
-- Kunlik chegara reja_bandlari.created_at bo'yicha tekshirilardi, lekin u —
-- REJA TUZILGAN payt: 30 ta band bir vaqtda yaratiladi. Natijada shart
-- reja tuzilgan kuni hammasini to'sib qo'yar, ertasiga esa hech qachon
-- ishlamasdi va agent bir kunda o'ttizta postni tasdiqlashga yuborardi.
-- Endi post QACHON TAYYORLANGANI alohida ustunda turadi.
alter table public.reja_bandlari
  add column if not exists tayyorlandi_at timestamptz;

-- Eski yozuvlar uchun: joylangan bo'lsa o'sha sana, aks holda yaratilgan sana
update public.reja_bandlari
   set tayyorlandi_at = coalesce(joylandi_at, created_at)
 where tayyorlandi_at is null
   and holat in ('tasdiq_kutilmoqda', 'joylandi', 'otkazildi');

create index if not exists reja_bandlari_tayyor_idx
  on public.reja_bandlari (reja_id, tayyorlandi_at desc);

insert into public.settings (key, value) values
  -- Ommaviy oferta matni. Bo'sh bo'lsa koddagi standart matn ko'rsatiladi.
  ('oferta_matni', '""'::jsonb),
  -- «Yuz skaneri» bosilganda ko'rsatiladigan namuna surat (media id)
  ('skaner_namuna_id', '""'::jsonb),
  -- Foydalanuvchi surati saqlansinmi (ilovada ko'rsatish uchun)
  ('yuz_rasm_saqlansin', 'true'::jsonb)
on conflict (key) do nothing;

-- Eski tahlillarda surat yo'q — bu normal, ilova o'rniga natija
-- kartochkasini ko'rsatadi.
create index if not exists analyses_yuz_rasm_idx on public.analyses (yuz_rasm_id)
  where yuz_rasm_id is not null;
