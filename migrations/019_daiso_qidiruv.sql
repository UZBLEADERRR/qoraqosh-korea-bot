-- Daiso ning HAQIQIY qidiruv manzili.
--
-- 018 da taxminiy manzil turgan edi (tekshirilmagan). Bu yerda do'konning
-- o'zi ishlatadigan qidiruv manzili qo'yiladi:
--   GET https://prdm.daisomall.co.kr/ssn/search/FindStoreGoods
--       ?searchTerm=<so'z>&cntPerPage=30&pageNum=<sahifa>
-- Javob: resultSet.result[0].resultDocuments[] — har elementda PD_NO,
-- PDNM (nomi), PD_PRC (narxi), BRND_NM (brendi), ATCH_FILE_URL (rasmi).
-- Shuning uchun har mahsulot uchun alohida sahifa ochilmaydi.
--
-- Admin qoidani o'zgartirgan bo'lsa TEGILMAYDI: faqat eski taxminiy
-- qiymat turgan bo'lsa almashtiriladi.
update settings
   set value = '[
    {
      "manba": "daiso",
      "nom": "Daiso Mall — qidiruv",
      "host": "prdm.daisomall.co.kr",
      "royxat_url": "https://prdm.daisomall.co.kr/ssn/search/FindStoreGoods?searchTerm={q}&cntPerPage=30&pageNum={sahifa}",
      "royxat_yoli": "resultSet.result.0.resultDocuments",
      "element_id": "PD_NO",
      "sahifa_url": "https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={id}",
      "id_qolip": "pdNo=([0-9A-Za-z_-]+)",
      "id_kalit": "PD_NO",
      "rasm_almashtir": { "img.daisomall.co.kr": "cdn.daisomall.co.kr" },
      "yoq": false
    }
   ]'::jsonb
 where key = 'marketplace_api'
   and value::text like '%api/pd/pdd/pdDetail%';
