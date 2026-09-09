-- Natija kartochkasining ko'rinishi.
--
-- Kartochka — mijoz qo'liga boradigan yagona hujjat: uni skrinshot
-- qiladi, do'stiga yuboradi, saqlab qo'yadi. Ilgari uning ko'rinishi
-- faqat koddan o'zgarardi. Endi do'kon egasi admin yordamchisiga
-- oddiy so'z bilan aytadi: «erkaklar kartochkasida parhezni olib
-- tashla», «mahsulotni 6 ta qil», «sarlavhani o'zgartir».
--
-- Tuzilishi (src/lib/kartochka.js dagi standart bilan bir xil):
--   bloklar        — qaysi bo'lim ko'rinadi
--   belgi_soni     — nechta belgi ro'yxatda chiqadi (0-8)
--   mahsulot_soni  — nechta mahsulot chiqadi (0-8)
--   sarlavha       — bo'lim sarlavhalari
--   izoh, teg      — pastdagi ogohlantirish va o'ng yuqoridagi yozuv
--   ai_qoshimcha   — tahlil AI siga qo'shimcha ko'rsatma
--   erkak / ayol   — faqat FARQLAR yoziladi, qolgani umumiydan olinadi
insert into public.settings (key, value) values
  ('natija_kartochka', '{
     "bloklar": {"korsatkichlar": true, "xulosa": true, "belgilar": true,
                 "parhez": true, "mahsulotlar": true},
     "belgi_soni": 5,
     "mahsulot_soni": 8,
     "sarlavha": {"belgilar": "Suratda topilgan belgilar",
                  "parhez": "Ovqatlanish tavsiyasi",
                  "mahsulotlar": "Sizga mos parvarish"},
     "izoh": "Bu tibbiy tashxis emas — kosmetologik tavsiya.",
     "teg": "Teri tahlili",
     "ai_qoshimcha": "",
     "erkak": {},
     "ayol": {}
   }'::jsonb)
on conflict (key) do nothing;
