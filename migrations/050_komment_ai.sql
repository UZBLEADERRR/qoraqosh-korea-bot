-- Har kommentga AI javob: qaysi javobni AI yozgani (hisobot va panel uchun).
alter table public.ig_kommentlar add column if not exists ai boolean not null default false;
