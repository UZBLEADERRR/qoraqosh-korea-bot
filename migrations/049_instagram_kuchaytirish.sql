-- INSTAGRAM BOSHQARUVI — kuchaytirish: mijoz kartasi, hisobot, eslatma, spam.
--
-- · ig_xabarlar.niyat    — AI javob berganda mijoz niyati (narx, buyurtma…) —
--                          hisobotda «nimani ko'p so'rashadi» ko'rinadi;
-- · ig_xabarlar.javob_ms — mijoz yozganidan javobgacha qancha vaqt o'tdi;
-- · ig_suhbatlar.izoh    — menejerning shu mijoz haqidagi eslatmasi;
-- · ig_suhbatlar.eslatma_at — tahlildan keyin Telegramga o'tmagan odamga
--                          bitta yumshoq eslatma ketgan vaqt (takrorlanmasin);
-- · ig_kommentlar.spam   — havola/haqorat bo'lgani uchun avtomatik yashirildi.
alter table public.ig_xabarlar  add column if not exists niyat text;
alter table public.ig_xabarlar  add column if not exists javob_ms integer;
alter table public.ig_suhbatlar add column if not exists izoh text;
alter table public.ig_suhbatlar add column if not exists eslatma_at timestamptz;
alter table public.ig_suhbatlar add column if not exists oxirgi_niyat text;
alter table public.ig_kommentlar add column if not exists spam boolean not null default false;

create index if not exists ig_xabarlar_vaqt_idx on public.ig_xabarlar (created_at desc);
