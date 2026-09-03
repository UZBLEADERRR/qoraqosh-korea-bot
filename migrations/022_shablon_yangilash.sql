-- Bazadagi ESKI tahlil izohini yangi ko'rinishga o'tkazish.
--
-- Shablonlar `on conflict do nothing` bilan qo'yiladi (admin tahririga
-- tegmaslik uchun). Shuning uchun koddagi standart matn o'zgarganda
-- ishlab turgan bazada ESKISI qolib ketardi — bot eski javobni
-- yuboraverardi. Bu yerda faqat ESKI STANDART matn turgan bo'lsa
-- yangilanadi: admin o'zi yozgan matn saqlanib qoladi.
update settings
   set value = to_jsonb($shablon$🔬 <b>Tahlil natijasi</b>

👤 {yosh} · {teri_turi}
🎨 {teri_rangi}

✨ Teri holati: <b>{ball}/100</b>

{shkala}

🔍 <b>Aniqlangan muammolar</b>

{muammolar}

💡 Siz uchun <b>{tavsiya_soni} ta mahsulot</b> tanlandi

<i>Teri muammolaringizga mos tavsiyalarni ko‘ring</i> 👇

⚕️ <i>AI tahlili tibbiy tashxis emas.</i>$shablon$::text),
       updated_at = now()
 where key = 'xabar_tahlil_qisqa'
   -- Eski standart matnlarning belgisi: «Tahlil tayyor» yoki
   -- «{muammo_soni} ta belgi topildi»
   and (value::text like '%Tahlil tayyor%' or value::text like '%muammo_soni%');
