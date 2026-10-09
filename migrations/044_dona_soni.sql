-- TO'PLAMDAGI DONA SONI.
--
-- Ba'zi mahsulotlar bittalab emas, to'plamda sotiladi: 10 ta niqob,
-- 100 ta paxta disk. Ilgari bu faqat nomda («(10 dona)») yoki hajmda
-- («10 x 27 ml») yozilardi — kartada ko'rinmas, skaner esa 100 donali
-- to'plamni oddiy krem kabi tavsiya qilib yuborardi. Endi alohida
-- maydon: kartada «10 dona» belgisi, skaner katta to'plamni faqat
-- boshqa variant bo'lmaganda tanlaydi.
alter table public.products add column if not exists dona_soni integer
  check (dona_soni is null or dona_soni between 1 and 10000);

-- Mavjud mahsulotlar: nom yoki hajmdan o'qiymiz
update public.products set dona_soni = n
  from (
    select id, coalesce(
      substring(lower(name) from '(\d{1,4}) ?(?:dona|ea|pcs|pc|sheets|sheet|pads|pad|шт|매)'),
      substring(lower(coalesce(volume, '')) from '(\d{1,4}) ?(?:dona|ea|pcs|pc|sheets|sheet|pads|pad|шт|매)'),
      substring(lower(coalesce(volume, '')) from '^(\d{1,4}) ?[x×]')
    )::int as n
    from public.products
  ) t
 where t.id = products.id and products.dona_soni is null and t.n >= 2 and t.n <= 10000;
