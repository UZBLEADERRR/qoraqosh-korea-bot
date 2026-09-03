-- Botdagi izoh yana qisqardi: teri ma'lumoti va nechta belgi topilgani
-- qoladi, muammolar ro'yxati esa ILOVAGA o'tadi (u yerda sabab va yechim
-- ham bor). Maqsad — odam tugmani bossin.
--
-- Faqat ESKI STANDART matn turgan bo'lsa yangilanadi: admin o'zi yozgan
-- matnga tegilmaydi.
update settings
   set value = to_jsonb($shablon$🔬 <b>Tahlil natijasi</b>

👤 {yosh} · {teri_turi}
🎨 {teri_rangi}

✨ Teri holati: <b>{ball}/100</b>
{shkala}

🔍 <b>{muammo_soni} ta belgi</b> aniqlandi{eng_kuchli}
💡 Sizga <b>{tavsiya_soni} ta mahsulot</b> tanlandi

<i>Muammolar, sabablari va yechimi — ilovada.
Pastdagi tugmani bosing</i> 👇

⚕️ <i>AI tahlili tibbiy tashxis emas.</i>$shablon$::text),
       updated_at = now()
 where key = 'xabar_tahlil_qisqa'
   and value::text like '%Teri muammolaringizga mos tavsiyalarni%';
