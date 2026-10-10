-- INSTAGRAM BOSHQARUVI: Direct (AI suhbatdosh) va kommentlar.
--
-- Suhbat — bitta Instagram foydalanuvchisi bilan yozishma (IGSID bo'yicha).
-- AI javob beradi; admin panel orqali yoki Instagram ilovasidan admin
-- o'zi yozsa, AI shu suhbatda vaqtincha jim turadi.
create table if not exists public.ig_suhbatlar (
  id              bigserial primary key,
  igsid           text not null unique,          -- Instagram foydalanuvchi id (shu sahifa uchun)
  username        text,
  ism             text,
  rasm_url        text,
  ai_yoqiq        boolean not null default true, -- shu suhbatda AI javob beradimi
  ai_pauza_gacha  timestamptz,                   -- admin qo'lda yozdi — AI shu vaqtgacha jim
  admin_kerak     boolean not null default false,-- AI odam aralashuvini so'radi
  oqilmagan       integer not null default 0,
  oxirgi_matn     text,
  oxirgi_kiruvchi timestamptz,                   -- 24 soatlik oyna shundan hisoblanadi
  oxirgi_at       timestamptz not null default now(),
  tahlil_token    text,                          -- yuz tahlili → Telegram havolasi (ochiq_skan.token)
  teglar          text[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists ig_suhbatlar_oxirgi_idx on public.ig_suhbatlar (oxirgi_at desc);

create table if not exists public.ig_xabarlar (
  id         bigserial primary key,
  suhbat_id  bigint not null references public.ig_suhbatlar(id) on delete cascade,
  yonalish   text not null check (yonalish in ('kiruvchi', 'chiquvchi')),
  kim        text not null,                      -- mijoz | ai | admin | ilova | qoida | tahlil
  matn       text,
  rasm_url   text,
  mid        text unique,                        -- Instagram xabar id (takror yozilmasin)
  xato       text,
  created_at timestamptz not null default now()
);
create index if not exists ig_xabarlar_suhbat_idx on public.ig_xabarlar (suhbat_id, created_at);

-- Kommentga avtomatik javob qoidalari: «+» qoldirganlarga Direct va hokazo
create table if not exists public.ig_qoidalar (
  id          bigserial primary key,
  nom         text not null,
  faol        boolean not null default true,
  tartib      integer not null default 100,
  kalitlar    text[] not null default '{}',      -- «+», «narx», «qancha»…
  aniq        boolean not null default false,    -- true — komment AYNAN shu so'z bo'lsa
  media_id    text,                              -- null — hamma postlar
  javoblar    text[] not null default '{}',      -- ochiq javob variantlari (biri tasodifiy)
  dm_matn     text,                              -- Direct ga yuboriladigan xabar
  dm_ai       boolean not null default false,    -- Direct matnini AI kommentga qarab yozadi
  ishladi     integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.ig_kommentlar (
  id          text primary key,                  -- Instagram komment id
  media_id    text,
  parent_id   text,
  matn        text,
  username    text,
  from_id     text,
  javob       text,                              -- biz yozgan ochiq javob
  dm_yuborildi boolean not null default false,
  yashirildi  boolean not null default false,
  qoida_id    bigint references public.ig_qoidalar(id) on delete set null,
  xato        text,
  created_at  timestamptz not null default now()
);
create index if not exists ig_kommentlar_vaqt_idx on public.ig_kommentlar (created_at desc);

-- Tayyor qoidalar
insert into public.ig_qoidalar (nom, tartib, kalitlar, aniq, javoblar, dm_matn, dm_ai)
select * from (values
  ('«+» qoldirganlarga Direct', 10, array['+','++','+++','➕'], true,
   array['Direct''ga yozdik 💌','Direct''ni tekshiring ✨','Yubordik — Direct''da 🌿'],
   E'Salom{ism}! 🌿 Va''da qilgan ma''lumotni yubordik.\n\nYuzingiz rasmini shu yerga tashlang — AI 30 soniyada teringizni bepul tahlil qilib beradi.\nYoki Telegram''da: {tg_havola}',
   false),
  ('Narx so''raganlar', 20, array['narx','qancha','necha pul','narxi','price','сколько','цена'], false,
   array['Narxini Direct''ga yozdik 💌','Direct''ga yubordik ✨'],
   null, true)
) as v(nom, tartib, kalitlar, aniq, javoblar, dm_matn, dm_ai)
where not exists (select 1 from public.ig_qoidalar);

-- Manba: Instagram Direct va kommentdan kelganlar alohida sanalsin
insert into public.havolalar (kod, nom, manba, maqsad) values
  ('ig-direct', 'Instagram Direct (AI)', 'instagram', 'bot'),
  ('ig-komment', 'Instagram komment', 'instagram', 'bot')
on conflict (kod) do nothing;
