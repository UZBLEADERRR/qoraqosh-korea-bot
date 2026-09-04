-- Jo'natma qayerga ketgani.
--
-- Bizda OMBOR YO'Q: mahsulot O'zbekistonga yetib kelgach eng yaqin
-- pochtadan mijozning manziliga jo'natiladi — filialga yoki uyiga.
-- Aniq joy va kuzatuv raqami keyinroq ma'lum bo'ladi, shuning uchun
-- admin uni buyurtmaga yozadi va mijozga bot orqali boradi.
alter table public.orders
  add column if not exists pochta_izoh text;

-- ══════════ Eski shablonlarni to'g'rilash ══════════
-- «Omborga yetib keldi» xabarida ombor manzili, mo'ljal, telefon va
-- ish vaqti o'rin egallovchilari bor edi — ular HECH QACHON
-- to'ldirilmasdi va mijozga «{ombor}», «{manzil}» bo'lib borardi.
-- Ustiga bizda ombor yo'q: «olib ketishingiz mumkin» degan va'da
-- noto'g'ri.
--
-- Faqat ESKI STANDART matn turgan bo'lsa yangilaymiz — admin o'zi
-- yozgan matnga tegilmaydi.
update settings
   set value = to_jsonb($yangi$📦 <b>{raqam}</b> buyurtmangiz O‘zbekistonga yetib keldi!

Bojxonadan o‘tdi va jo‘natishga tayyorlanmoqda.

<i>Qayerdan olishingizni — eng yaqin pochta filialidanmi yoki
uyingizgami — keyingi xabarda aytamiz.</i>$yangi$::text),
       updated_at = now()
 where key = 'xabar_holat_omborda'
   and value::text like '%{ombor}%';

-- «Pochtadan jo'natildi» — endi bu xabar ENG MUHIMI: mijoz aynan shu
-- yerda posilkasi qayerga ketganini biladi. Eski matnda («tez orada
-- yetib boradi») hech qanday ma'lumot yo'q edi.
--
-- Faqat 010-migratsiyadagi standart matn turgan bo'lsa yangilaymiz.
update settings
   set value = to_jsonb($yangi$📮 <b>{raqam}</b> buyurtmangiz jo‘natildi!

📍 <b>{yetkazish}</b>
{manzil}
{pochta_izoh}

📞 {telefon}
🕘 {ish_vaqti}$yangi$::text),
       updated_at = now()
 where key = 'xabar_holat_pochta_jonatildi'
   and value::text like '%Tez orada yetib boradi%';
