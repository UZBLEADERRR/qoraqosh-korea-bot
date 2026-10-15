-- Makiyaj natijasida odamning o'z surati ko'rinadi (ilovada va kartochkada).
-- Teri tahlilidagi kabi: admin `yuz_rasm_saqlansin` ni o'chirsa saqlanmaydi,
-- hisob o'chirilganda surat ham o'chadi (src/services/hisob.js).
alter table public.makiyaj_profillar
  add column if not exists yuz_rasm_id uuid references public.media(id) on delete set null;
