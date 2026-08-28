-- EMU Express rasmiy tarif kartasi bo'yicha avtomatik hisoblash.
--
-- Narx endi qat'iy jadvaldan emas, EMU ning zona × masofa × og'irlik
-- tarifidan chiqadi (src/lib/emu-tarif.js). Bu yerda faqat sozlanadigan
-- qismlar: qayerdan jo'natamiz, qaysi tumanlar markazga yaqin, ustama.

insert into public.settings (key, value) values
  -- Yaqin tumanlar: viloyat markazidan 40 km gacha. Bu yerda yo'q tuman
  -- "40 km dan uzoq" deb hisoblanadi — kam olib zarar ko'rmaslik uchun.
  -- Ko'rinishi: {"Samarqand viloyati": ["Tayloq tumani", "Jomboy tumani"]}
  ('emu_yaqin_tumanlar', '{}'::jsonb),
  -- EMU narxlari QQS siz. Shartnomangizga qarab qo'shiladi.
  ('yetkazish_qqs_foiz', '0'::jsonb),
  -- Do'kon ustamasi (qadoqlash mehnati va h.k.) — foizda
  ('yetkazish_ustama_foiz', '0'::jsonb)
on conflict (key) do nothing;

-- Provayderni EMU tarifiga o'tkazamiz (admin boshqasini tanlamagan bo'lsa)
update public.settings
   set value = '"emu"'::jsonb, updated_at = now()
 where key = 'yetkazish_provayder' and value in ('"emu"'::jsonb, '""'::jsonb);

-- Jo'natuvchi viloyati — zona shundan hisoblanadi
insert into public.settings (key, value) values
  ('jonatuvchi_viloyat', '"Toshkent shahri"'::jsonb)
on conflict (key) do nothing;

-- Buyurtmada hisob tafsilotini saqlaymiz: keyin "nega shuncha?" degan
-- savolga javob bera olishimiz kerak.
alter table public.orders add column if not exists yetkazish_izoh jsonb;
