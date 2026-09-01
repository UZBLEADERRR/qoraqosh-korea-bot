-- Do'kon API qoidalari: sahifani emas, do'konning JSON javobini o'qish.
--
-- Manzil KODDA emas, shu yerda — daisomall ichki API si o'zgarsa admin
-- panelidan tuzatiladi va deploy kutilmaydi. Bo'sh massiv = «API kerak
-- emas, faqat HTML o'qilsin».
insert into settings (key, value) values
  ('marketplace_api', '[
    {
      "manba": "daiso",
      "nom": "Daiso Mall",
      "host": "daisomall.co.kr",
      "id_qolip": "(?:pdNo|goodsNo|productNo)=([0-9A-Za-z_-]+)",
      "mahsulot_url": "https://www.daisomall.co.kr/api/pd/pdd/pdDetail?pdNo={id}",
      "sahifa_url": "https://www.daisomall.co.kr/pd/pdd/pdDetail?pdNo={id}",
      "id_kalit": "pdNo",
      "yoq": false
    }
  ]'::jsonb)
on conflict (key) do nothing;
