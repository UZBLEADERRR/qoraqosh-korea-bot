-- Xabar shablonlari uchun joy tayyorlaydi.
--
-- Matnlarning O'ZI bu yerda emas: ular src/bot/shablonlar-standart.js da
-- yashaydi va server ishga tushganda yetishmagani bazaga qo'yiladi.
-- Shunday qilib matn bitta joyda turadi va keyin yangi shablon qo'shilsa,
-- migratsiya yozish shart bo'lmaydi.

comment on column public.analyses.problems is
  'Muammolar: [{kalit,nom,foiz,daraja,zona,izoh,sabab,yechim,ogohlantirish}]';

comment on table public.settings is
  'Sozlamalar va bot xabar shablonlari (xabar_*, blok_*, ogohlantirish_*)';
