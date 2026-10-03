// Mini App API. Har bir so'rov Telegram initData imzosi bilan tekshiriladi.
import { qator, qatorlar, sorov, hodisa, sozlama } from '../db.js';
import { verifyInitData } from '../lib/auth.js';
import { sorovYarat, sorovHolati, seansdanUser, seansniYop, seanslarSoni,
         kirishUsullari, telegramSorovYarat, smsSorovYarat, smsTasdiqla, googleBilanKir }
  from '../services/ilova-kirish.js';
import { raqamTozala } from '../lib/telefon.js';
import { ok, xato, tana, json, ipOl } from '../lib/http.js';
import { faolMahsulotlar, tahlilQil, oxirgiTahlil, limitHolati, rasmLimiti,
         tahlillarTarixi, tahlilniOl } from '../services/analysis.js';
import { xatoniTushuntir } from '../lib/xatolar.js';
import { maslahatBer } from '../ai/maslahat.js';
import { savatniOl, savatgaQosh, savatOzgartir, savatniTozala, buyurtmaYarat } from '../services/orders.js';
import { yubor } from '../bot/tg.js';
import { esc, narx } from '../bot/format.js';
import { kesh, keshniTashla } from '../lib/kesh.js';
import { cheklov } from '../lib/cheklov.js';
import { VILOYATLAR, tumanlar } from '../lib/hududlar.js';
import { palitra } from '../lib/mavzu.js';
import { kanalgaBuyurtma, kanalgaChek } from '../services/kanal.js';
import { variantlar, TURLAR, turTozala, bepulChegara } from '../services/yetkazish.js';
import { natijaRasminiYarat, saqlanganRasm, kanalgaTahlil, yuzniSaqla } from '../services/natija-rasm.js';
import { rasmYubor } from '../bot/tg.js';
import { hisobniOchir, meningMalumotlarim } from '../services/hisob.js';
import { ochiqKalit, obunaSaqla, obunaOchir, foydalanuvchigaPush } from '../services/push.js';

// Kuniga minglab foydalanuvchi bo'lganda katalog eng ko'p so'raladigan yo'l.
// 30 soniyalik kesh bazaga ketadigan bir xil so'rovlarni yig'ib bitta qiladi.
const KATALOG_KESH_MS = 30_000;

/**
 * So'rov kimdan kelganini aniqlaydi. Ikki yo'l:
 *
 *   1. Telegram Mini App — initData imzosi (asosiy yo'l);
 *   2. Brauzer seansi — telefon raqami botdan tasdiqlangach berilgan
 *      token. Shu tufayli ilova Chrome'da ham, bosh ekrandagi PWA
 *      yorlig'idan ham Telegramsiz ishlaydi.
 */
async function kim(req) {
  const tgUser = verifyInitData(req.headers['x-init-data']);
  if (tgUser) {
    const bor = await qator('select * from users where telegram_id = $1', [String(tgUser.id)]);
    if (bor) return bor.is_blocked ? null : bor;
    return await qator(
      `insert into users (telegram_id, username, source) values ($1,$2,'miniapp') returning *`,
      [String(tgUser.id), tgUser.username || null]);
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token ? seansdanUser(token) : null;
}

// ── Sharh rasmlari ──
const SHARH_RASM_MAKS = 3;
const SHARH_RASM_BAYT = 2 * 1024 * 1024;
const RASM_IMZO = {                       // faylning birinchi baytlari
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/png':  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
};
/** Yangi sharh rasmini tekshiradi: turi va hajmi, va u HAQIQATAN rasmmi. */
function sharhRasminiTekshir(r) {
  const xom = String(r?.data || '');
  const mos = xom.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  const mime = String(mos ? mos[1] : r?.mime || 'image/jpeg').toLowerCase();
  const tekshir = RASM_IMZO[mime];
  if (!tekshir) return { xato: 'Faqat JPG, PNG yoki WEBP rasm.' };
  const bayt = Buffer.from(mos ? mos[2] : xom, 'base64');
  if (bayt.length < 60) return { xato: 'Rasm o‘qilmadi.' };
  if (bayt.length > SHARH_RASM_BAYT) return { xato: 'Rasm juda katta (2 MB gacha).' };
  if (!tekshir(bayt)) return { xato: 'Bu fayl rasm emas.' };
  return { mime, bayt };
}

export async function apiRoutes(req, res, yol) {
  // --- Ochiq: katalog ---
  if (yol === '/api/catalog' && req.method === 'GET') {
    // Ochiq yo'l — IP bo'yicha cheklaymiz, aks holda bitta bot bazani bosadi
    const c = cheklov('kat:' + ipOl(req), 90, 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Biroz kuting.' });

    return ok(res, await kesh('katalog', KATALOG_KESH_MS, katalogniYig));
  }

  // --- Telegramsiz kirish: telefon + botdan tasdiqlash ---
  // Bu yo'llar imzosiz, chunki imzo aynan shu yerda olinadi.
  if (yol === '/api/kirish/sorov' && req.method === 'POST') {
    const ip = ipOl(req);
    // Bitta IP dan 15 daqiqada 5 ta: birovning Telegramiga xabar
    // yog'dirish uchun ishlatib bo'lmasin
    const c = cheklov('kir:' + ip, 5, 15 * 60_000);
    if (!c.ruxsat) {
      return json(res, 429, { error: 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urining.' });
    }
    const b = await tana(req);
    const r = await sorovYarat(b.telefon, {
      ip, qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
    if (r.xato) return xato(res, 400, r.xato);
    return ok(res, r);
  }

  if (yol === '/api/kirish/holat' && req.method === 'GET') {
    const kalit = new URL(req.url, 'http://x').searchParams.get('kalit');
    // So'rab turish tez-tez bo'ladi (2 soniyada bir) — cheklov keng
    const c = cheklov('kirh:' + ipOl(req), 200, 10 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov.' });
    return ok(res, await sorovHolati(kalit, {
      qurilma: String(req.headers['user-agent'] || '').slice(0, 120) }));
  }

  // --- Kirish ekrani: qaysi usullar yoqilgan ---
  if (yol === '/api/kirish/usullar' && req.method === 'GET') {
    return ok(res, await kirishUsullari());
  }

  // --- Telegram orqali (deep link). Oldindan ro'yxatdan o'tish shart emas ---
  if (yol === '/api/kirish/telegram' && req.method === 'POST') {
    const c = cheklov('kirtg:' + ipOl(req), 10, 15 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p urinish. Birozdan keyin qayta urining.' });
    const r = await telegramSorovYarat({ ip: ipOl(req),
      qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
    if (r.xato) return xato(res, 400, r.xato);
    return ok(res, r);
  }

  // --- Telefon: SMS kod ---
  if (yol === '/api/kirish/sms' && req.method === 'POST') {
    // SMS pul turadi: IP bo'yicha qattiq chegara
    const c = cheklov('kirsms:' + ipOl(req), 5, 15 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urining.' });
    const b = await tana(req);
    const r = await smsSorovYarat(b.telefon, { ip: ipOl(req),
      qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
    if (r.xato) return xato(res, 400, r.xato);
    return ok(res, r);
  }
  if (yol === '/api/kirish/sms/tasdiq' && req.method === 'POST') {
    const c = cheklov('kirsmst:' + ipOl(req), 20, 15 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p urinish. Birozdan keyin qayta urining.' });
    const b = await tana(req);
    const r = await smsTasdiqla(b.kalit, b.kod, {
      qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
    if (r.xato) return xato(res, 400, r.xato);
    return ok(res, r);
  }

  // --- Google (popup rejimi — JSON). Qayta yo'naltirish rejimi server.js da ---
  if (yol === '/api/kirish/google' && req.method === 'POST') {
    const c = cheklov('kirg:' + ipOl(req), 20, 15 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p urinish. Birozdan keyin qayta urining.' });
    const b = await tana(req);
    const r = await googleBilanKir(b.credential, {
      qurilma: String(req.headers['user-agent'] || '').slice(0, 120) });
    if (r.xato) return xato(res, 400, r.xato);
    return ok(res, r);
  }

  // --- Bundan keyingi hammasi imzo talab qiladi ---
  const user = await kim(req);
  if (!user) return xato(res, 401, 'Ruxsat yo‘q. Ilovaga qayta kiring.');

  // Umumiy tinchlantirgich: normal ishlatishda hech qachon urilmaydi,
  // lekin buzilgan klient yoki skript tizimni bosib qo'yolmaydi.
  const umumiy = cheklov('api:' + user.id, 180, 60_000);
  if (!umumiy.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Biroz kuting.' });

  // --- Hisob: ma'lumotlarni yuklab olish va o'chirish (Google Play talabi) ---
  if (yol === '/api/hisob/eksport' && req.method === 'GET') {
    const c = cheklov('eksport:' + user.id, 10, 60 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Bir soatdan keyin urining.' });
    return ok(res, await meningMalumotlarim(user.id));
  }
  if (yol === '/api/hisob/ochir' && req.method === 'POST') {
    const b = await tana(req);
    if (b.tasdiq !== true) return xato(res, 400, 'O‘chirish tasdiqlanmadi.');
    const r = await hisobniOchir(user.id);
    if (!r.ok) {
      return xato(res, 409, `Sizda faol buyurtma bor (${r.buyurtmalar.join(', ')}). `
        + 'U yetkazilgach hisobni o‘chirishingiz mumkin — yoki biz bilan bog‘laning.');
    }
    return ok(res, { ok: true });
  }

  // --- Push bildirishnoma (buyurtma holati telefonga keladi) ---
  if (yol === '/api/push/kalit' && req.method === 'GET') {
    return ok(res, { kalit: ochiqKalit() });
  }
  if (yol === '/api/push/obuna' && req.method === 'POST') {
    const c = cheklov('push:' + user.id, 20, 60 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Juda ko‘p so‘rov. Biroz kuting.' });
    const b = await tana(req);
    const r = await obunaSaqla(user.id, b.obuna || {},
      String(req.headers['user-agent'] || '').slice(0, 120));
    if (r.xato) return xato(res, 400, r.xato);
    // Birinchi bildirishnoma darrov: odam ishlayotganiga ishonch hosil qiladi
    if (b.sinov) {
      foydalanuvchigaPush(user.id, { sarlavha: 'KiOVO', teg: 'sinov',
        matn: 'Bildirishnomalar yoqildi. Buyurtmangiz holati shu yerga keladi.' }).catch(() => {});
    }
    return ok(res, { ok: true });
  }
  if (yol === '/api/push/bekor' && req.method === 'POST') {
    const b = await tana(req);
    await obunaOchir(user.id, b.endpoint);
    return ok(res, { ok: true });
  }

  if (yol === '/api/limit' && req.method === 'GET') {
    return ok(res, { limit: await limitHolati(user.id) });
  }

  // --- Tahlillar tarixi: profilda eski natijalar ---
  if (yol === '/api/tahlillar' && req.method === 'GET') {
    return ok(res, { tahlillar: await tahlillarTarixi(user.id) });
  }
  if (yol === '/api/tahlil' && req.method === 'GET') {
    const id = Number(new URL(req.url, 'http://ichki').searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) return xato(res, 400, 'Tahlil raqami noto‘g‘ri.');
    const t = await tahlilniOl(user.id, id);
    if (!t) return xato(res, 404, 'Tahlil topilmadi.');
    return ok(res, { tahlil: t });
  }

  if (yol === '/api/me' && req.method === 'GET') {
    // Profil bo'limi uchun: nechta tahlil, nechta buyurtma, qancha xarid
    const stat = await qator(
      `select (select count(*)::int from analyses where user_id = $1) as tahlil,
              (select count(*)::int from orders   where user_id = $1
                 and status <> 'bekor')            as buyurtma,
              (select coalesce(sum(total), 0)::bigint from orders where user_id = $1
                 and status <> 'bekor')            as jami_xarid,
              (select count(*)::int from sevimlilar where user_id = $1) as sevimli`, [user.id]);
    return ok(res, {
      limit: await limitHolati(user.id),
      stat: { tahlil: stat?.tahlil ?? 0, buyurtma: stat?.buyurtma ?? 0,
              jami_xarid: Number(stat?.jami_xarid ?? 0), sevimli: stat?.sevimli ?? 0 },
      user: {
        id: user.id, full_name: user.full_name, phone: user.phone,
        email: user.email || '',
        // Qaysi yo'l bilan kirgan: Telegram, Google yoki telefon (SMS).
        // Profilda shu ko'rsatiladi, Telegramsizlarga bot buyruqlari aytilmaydi.
        kirish: /^google:/.test(user.telegram_id) ? 'google'
          : /^tel:/.test(user.telegram_id) ? 'telefon' : 'telegram',
        age: user.age, address: user.address || '',
        viloyat: user.viloyat, tuman: user.tuman,
        // Profildagi tahrirlanadigan qismlar. Allergiya va kasallik AI
        // tavsiyasiga ta'sir qiladi — mos kelmaydigan mahsulot berilmasin.
        teri_turi: user.teri_turi || '', allergiya: user.allergiya || '',
        kasallik: user.kasallik || '',
        royxatdan_otgan: Boolean(user.phone && user.full_name && user.agreed_at),
      },
      oxirgi_tahlil: await oxirgiTahlil(user.id),
    });
  }

  if (yol === '/api/register' && req.method === 'POST') {
    const b = await tana(req);
    // Manzil bu yerda so'ralmaydi — u buyurtma rasmiylashtirishda olinadi.
    // Raqam XALQARO: mijozlarning bir qismi Koreyada va Rossiyada.
    const tel = raqamTozala(b.phone);
    if (!tel) {
      return xato(res, 400, 'Telefon raqami noto‘g‘ri. Chet el raqami bo‘lsa '
                          + 'mamlakat kodi bilan yozing: +82 10 1234 5678');
    }
    if (String(b.full_name || '').trim().length < 3) return xato(res, 400, 'Ism to‘liq emas.');
    if (!b.agreed)                                   return xato(res, 400, 'Ofertaga rozilik kerak.');

    await sorov(
      `update users set phone=$1, full_name=$2, age=$3, address=$4,
              agreed_at=now(), agreement_version='1.0', state=null
        where id=$5`,
      [tel,
       String(b.full_name).trim().slice(0, 70),
       Math.min(90, Math.max(12, Number(b.age) || 0)) || null,
       String(b.address || '').trim().slice(0, 300) || null,
       user.id]);
    await hodisa(user.id, 'register', { kanal: 'miniapp' });
    return ok(res, { ok: true });
  }

  if (yol === '/api/scan' && req.method === 'POST') {
    // Kunlik limitdan tashqari — qisqa oynadagi cheklov. Skan eng qimmat amal:
    // AI chaqiruvi sekin, shuning uchun bitta odam navbatni band qilmasin.
    const c = cheklov('skan:' + user.id, 6, 5 * 60_000);
    if (!c.ruxsat) {
      return json(res, 429, { error: `Juda tez-tez skanerlayapsiz. ${c.kutish} soniyadan keyin urinib ko‘ring.` });
    }
    const b = await tana(req);
    const base64 = String(b.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!base64 || base64.length < 1000)      return xato(res, 400, 'Rasm yuborilmadi.');
    if (base64.length > 12 * 1024 * 1024)     return xato(res, 413, 'Rasm juda katta.');
    try {
      const mime = tozaMime(b.mime);
      const natija = await tahlilQil(user, base64, mime);

      // Natija rasmini SHU YERDA chizamiz — asl suratni saqlamaymiz, keyin
      // qayta chizib bo'lmaydi. Chizish ~170 ms, AI chaqiruvi yonida sezilmaydi.
      if (natija.yaroqli) {
        const rasm = await natijaRasminiYarat({
          analysisId: natija.analysisId, userId: user.id,
          rasmBase64: base64, mime, tahlil: natija.tahlil, mahsulotlar: natija.mahsulotlar,
        });
        natija.rasm_bor = Boolean(rasm);
        // Surat ilovadagi tahlil bo'limida belgilar bilan ko'rsatiladi
        natija.yuz_rasm_id = await yuzniSaqla({
          analysisId: natija.analysisId, rasmBase64: base64, mime });
        if (rasm) {
          kanalgaTahlil(rasm.bayt, user, natija.tahlil, 'ilova').catch(() => {});
          // Natija rasmi BOTGA ham o'zi keladi. Ilgari odam «Saqlash»
          // tugmasini bosishi kerak edi va ko'pchilik bosmasdi — natija
          // ilova yopilishi bilan yo'qolardi. Endi u Telegram
          // suhbatida turadi: istalgan vaqtda ochadi, do'stiga yuboradi.
          rasmYubor(user.telegram_id, rasm.bayt,
            '📸 <b>Teri tahlilingiz tayyor</b>\n\n'
            + 'Rasmni bosib turib saqlang yoki do‘stlaringizga ulashing.')
            .then((r) => { if (r?.ok) hodisa(user.id, 'natija_yuborildi',
              { analysis_id: natija.analysisId, avto: true }); })
            .catch(() => {});
        }
      }
      return ok(res, natija);
    } catch (e) {
      if (e.message === 'LIMIT_TUGADI') {
        return json(res, 429, { error: 'Bugungi limit tugadi.', limit: e.limit });
      }
      const x = xatoniTushuntir(e);
      console.error('SKAN XATOSI', x.log);
      return xato(res, 502, x.matn);
    }
  }

  // --- AI maslahatchi: odam savol yozadi, katalogdan javob topiladi ---
  if (yol === '/api/maslahat' && req.method === 'POST') {
    // AI chaqiruvi pul turadi — bitta odam kuniga cheksiz yozolmasin
    const c = cheklov('maslahat:' + user.id, 20, 10 * 60_000);
    if (!c.ruxsat) {
      return json(res, 429,
        { error: `Biroz sekinroq — ${Math.ceil(c.kutish / 60)} daqiqadan keyin davom etamiz.` });
    }

    const b = await tana(req);
    const savol = String(b.savol || '').trim().slice(0, 400);

    // Klient rasmni data-URL ko'rinishida yuboradi ("data:image/jpeg;base64,…").
    // Prefiksni olib tashlamasak model uni base64 deb o'qiy olmaydi va
    // butun so'rovni 400 bilan rad etadi.
    const xomRasm = String(b.rasm || '');
    const mos = xomRasm.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
    const rasm = mos ? mos[2] : (xomRasm.length > 100 ? xomRasm.replace(/\s/g, '') : null);
    const rasmMime = mos ? mos[1] : String(b.mime || 'image/jpeg');
    if (savol.length < 2 && !rasm) return xato(res, 400, 'Savolingizni yozing.');

    // Rasm — eng qimmat chaqiruv, shuning uchun uning KUNLIK chegarasi
    // alohida. Chegara tugasa savolning o'zi baribir ishlaydi: odamni
    // butunlay to'xtatib qo'ymaymiz, faqat rasmini olmaymiz.
    let rasmHolati = null;
    let rasmniOl = rasm;
    if (rasm) {
      rasmHolati = await rasmLimiti(user.id);
      if (rasmHolati.tugadi) {
        rasmniOl = null;
        if (savol.length < 2) {
          return json(res, 429, {
            error: `Bugun ${rasmHolati.limit} ta rasm yuborib bo‘ldingiz. `
                 + 'Ertaga yana mumkin — hozir savolingizni matn bilan yozing.',
            rasm_limit: rasmHolati,
          });
        }
      }
    }

    // Kontekst: oldingi 8 xabar. Modelning "allaqachon so'radim" ni
    // bilishi uchun shart — aks holda bir savolni ikki marta beradi.
    const tarix = (Array.isArray(b.tarix) ? b.tarix : []).slice(-8).map((x) => ({
      kim: x?.kim === 'ai' ? 'ai' : 'odam',
      matn: String(x?.matn || '').slice(0, 400),
    })).filter((x) => x.matn);

    try {
      const katalog = await kesh('katalog', KATALOG_KESH_MS, katalogniYig);
      const j = await maslahatBer(savol || 'Mana shu rasmga qarab maslahat bering',
        katalog.mahsulotlar || [], {
          tarix,
          rasm: rasmniOl, mime: rasmMime,
          // Yosh, teri turi, allergiya — tavsiya shularga moslashadi
          profil: { age: user.age, teri_turi: user.teri_turi,
                    allergiya: user.allergiya, kasallik: user.kasallik },
        });

      // Mahsulotning to'liq kartochkasini qaytaramiz — klient katalogdan
      // qidirib o'tirmasin (u sahifalab yuklanadi, mahsulot hali kelmagan
      // bo'lishi mumkin)
      // Rasm HAQIQATAN yuborilgan bo'lsagina hisobga olamiz — chegara
      // tugagach rasmsiz ketgan savol kunlik hisobni oshirmasin.
      if (rasmniOl) {
        await hodisa(user.id, 'maslahat_rasm', {});
        rasmHolati = await rasmLimiti(user.id);
      }

      const karta = new Map((katalog.mahsulotlar || []).map((p) => [p.id, p]));
      return ok(res, {
        ...j,
        // Chegara tugagani uchun rasm o'qilmagan bo'lsa odam buni bilsin
        rasm_otkazildi: Boolean(rasm && !rasmniOl),
        rasm_limit: rasmHolati,
        tavsiya: j.tavsiya
          .map((t) => ({ ...t, mahsulot: karta.get(t.product_id) }))
          .filter((t) => t.mahsulot),
      });
    } catch (e) {
      const x = xatoniTushuntir(e);
      console.error('MASLAHAT XATOSI', x.log);
      return xato(res, 502, x.matn);
    }
  }

  // --- Sharhlar ---
  // Sharh HAQIQIY: faqat shu mahsulotni SOTIB OLGAN odam yoza oladi.
  // Aks holda reyting bir kechada soxta bahoga to'lib ketadi.
  if (yol === '/api/sharhlar' && req.method === 'GET') {
    const id = Number(new URL(req.url, 'http://x').searchParams.get('product_id'));
    if (!id) return xato(res, 400, 'Mahsulot tanlanmadi.');
    const royxat = await qatorlar(
      `select s.id, s.baho, s.matn, s.created_at, s.user_id, s.rasmlar,
              coalesce(u.full_name, '') as ism
         from sharhlar s join users u on u.id = s.user_id
        where s.product_id = $1
        order by s.created_at desc limit 50`, [id]);
    // Familiyani to'liq ko'rsatmaymiz: "Aliyeva Malika" -> "Malika A."
    const qisqaIsm = (t) => {
      const q = String(t || '').trim().split(/\s+/).filter(Boolean);
      if (!q.length) return 'Mijoz';
      if (q.length === 1) return q[0];
      return `${q[q.length - 1]} ${q[0][0]}.`;
    };
    return ok(res, {
      sharhlar: royxat.map((r) => ({
        id: r.id, baho: r.baho, matn: r.matn || '', created_at: r.created_at,
        rasmlar: (r.rasmlar || []).map(String),
        ism: qisqaIsm(r.ism), meniki: Number(r.user_id) === Number(user.id),
      })),
      // Shu odam sharh yozishi mumkinmi
      yozsa_boladi: Boolean(await qator(
        `select 1 from orders o
          where o.user_id = $1 and o.status <> 'bekor'
            and exists (select 1 from jsonb_array_elements(o.items) it
                         where (it->>'product_id')::bigint = $2)
          limit 1`, [user.id, id])),
    });
  }

  if (yol === '/api/sharh' && req.method === 'POST') {
    const b = await tana(req);
    const id = Number(b.product_id);
    const baho = Math.round(Number(b.baho));
    if (!id) return xato(res, 400, 'Mahsulot tanlanmadi.');
    if (!(baho >= 1 && baho <= 5)) return xato(res, 400, 'Bahoni 1 dan 5 gacha tanlang.');

    const sotibOlgan = await qator(
      `select 1 from orders o
        where o.user_id = $1 and o.status <> 'bekor'
          and exists (select 1 from jsonb_array_elements(o.items) it
                       where (it->>'product_id')::bigint = $2)
        limit 1`, [user.id, id]);
    if (!sotibOlgan) {
      return xato(res, 403, 'Sharhni faqat shu mahsulotni sotib olgan mijoz yoza oladi.');
    }

    // Rasmlar: eskisidan qoldirilganlari ({id}) va yangilari ({data, mime}).
    // Ko'pi bilan 3 ta. Yangilari tekshiriladi: haqiqiy rasm, 2 MB gacha.
    const eski = await qator('select rasmlar from sharhlar where user_id = $1 and product_id = $2', [user.id, id]);
    const eskiIdlar = (eski?.rasmlar || []).map(String);
    const kelgan = Array.isArray(b.rasmlar) ? b.rasmlar.slice(0, SHARH_RASM_MAKS + 1) : null;
    if (kelgan && kelgan.length > SHARH_RASM_MAKS) return xato(res, 400, `Ko‘pi bilan ${SHARH_RASM_MAKS} ta rasm.`);
    let rasmlar = eskiIdlar;
    if (kelgan) {
      const yangiRasm = [];
      for (const r of kelgan) {
        if (r && typeof r.id === 'string') {
          if (eskiIdlar.includes(r.id)) yangiRasm.push({ id: r.id });   // faqat O'ZINIKI qoladi
          continue;
        }
        const t = sharhRasminiTekshir(r);
        if (t.xato) return xato(res, 400, t.xato);
        yangiRasm.push(t);
      }
      rasmlar = [];
      for (const r of yangiRasm) {
        if (r.id) { rasmlar.push(r.id); continue; }
        const m = await qator(
          `insert into media (tur, mime, bayt, hajm, product_id, goya)
           values ('sharh', $1, $2, $3, $4, 'Mijoz sharhi') returning id`,
          [r.mime, r.bayt, r.bayt.length, id]);
        rasmlar.push(String(m.id));
      }
      const olib = eskiIdlar.filter((x) => !rasmlar.includes(x));
      if (olib.length) await sorov(`delete from media where id = any($1::uuid[]) and tur = 'sharh'`, [olib]);
    }

    const s = await qator(
      `insert into sharhlar (user_id, product_id, baho, matn, rasmlar)
       values ($1,$2,$3,$4,$5::uuid[])
       on conflict (user_id, product_id) do update
         set baho = excluded.baho, matn = excluded.matn, rasmlar = excluded.rasmlar,
             updated_at = now()
       returning *`,
      [user.id, id, baho, String(b.matn || '').trim().slice(0, 600) || null, rasmlar]);
    keshniTashla('katalog');
    const p = await qator('select reyting, sharh_soni from products where id = $1', [id]);
    return ok(res, { sharh: { id: s.id, baho: s.baho, matn: s.matn || '', rasmlar: (s.rasmlar || []).map(String) },
                     reyting: p?.reyting ?? null, sharh_soni: p?.sharh_soni ?? 0 });
  }

  if (yol === '/api/sharh' && req.method === 'DELETE') {
    const id = Number((await tana(req)).product_id);
    if (!id) return xato(res, 400, 'Mahsulot tanlanmadi.');
    const sh = await qator('select rasmlar from sharhlar where user_id = $1 and product_id = $2', [user.id, id]);
    await sorov('delete from sharhlar where user_id = $1 and product_id = $2', [user.id, id]);
    if (sh?.rasmlar?.length) await sorov(`delete from media where id = any($1::uuid[]) and tur = 'sharh'`, [sh.rasmlar]);
    keshniTashla('katalog');
    return ok(res, { ochirildi: true });
  }

  // Yetkazilgan, lekin hali baholanmagan mahsulotlar — profilda so'raymiz
  if (yol === '/api/sharh-kutilmoqda' && req.method === 'GET') {
    return ok(res, { mahsulotlar: await qatorlar(
      `select distinct (it->>'product_id')::bigint as product_id,
              it->>'name' as nom
         from orders o, jsonb_array_elements(o.items) it
        where o.user_id = $1 and o.status = 'yetkazildi'
          and not exists (select 1 from sharhlar s
                           where s.user_id = o.user_id
                             and s.product_id = (it->>'product_id')::bigint)
        limit 20`, [user.id]) });
  }

  // --- Sevimlilar: ilovadagi yurakcha ---
  if (yol === '/api/sevimli' && req.method === 'GET') {
    return ok(res, { idlar: (await qatorlar(
      'select product_id from sevimlilar where user_id = $1 order by created_at desc',
      [user.id])).map((x) => Number(x.product_id)) });
  }
  if (yol === '/api/sevimli' && req.method === 'POST') {
    const b = await tana(req);
    const id = Number(b.product_id);
    if (!id) return xato(res, 400, 'Mahsulot tanlanmadi.');
    if (b.olib_tashla) {
      await sorov('delete from sevimlilar where user_id = $1 and product_id = $2', [user.id, id]);
      return ok(res, { sevimli: false });
    }
    await sorov(
      `insert into sevimlilar (user_id, product_id) values ($1,$2)
       on conflict do nothing`, [user.id, id]);
    return ok(res, { sevimli: true });
  }

  // --- Profilni tahrirlash ---
  // Brauzer seansidan chiqish. Telegram ichida ma'nosi yo'q —
  // u yerda seans yo'q, imzo har safar yangidan keladi.
  if (yol === '/api/chiqish' && req.method === 'POST') {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) await seansniYop(token);
    return ok(res, { chiqildi: true });
  }

  if (yol === '/api/seanslar' && req.method === 'GET') {
    return ok(res, { soni: await seanslarSoni(user.id) });
  }

  if (yol === '/api/profil' && req.method === 'POST') {
    const b = await tana(req);
    const matn = (v, n) => String(v ?? '').trim().slice(0, n) || null;
    const yosh = Number(b.age);
    // Faqat yuborilgan maydonlar yangilanadi: profil bir necha bo'limdan
    // saqlanadi (shaxsiy, teri, manzil) va biri ikkinchisini o'chirmasin.
    const bor = (k) => Object.prototype.hasOwnProperty.call(b, k);
    const u = await qator(
      `update users set
          full_name = coalesce($2, full_name),
          age       = coalesce($3, age),
          teri_turi = case when $4 then $5  else teri_turi end,
          allergiya = case when $4 then $6  else allergiya end,
          kasallik  = case when $4 then $7  else kasallik  end,
          viloyat   = case when $8 then $9  else viloyat   end,
          tuman     = case when $8 then $10 else tuman     end,
          address   = case when $8 then $11 else address   end
        where id = $1 returning *`,
      [user.id,
       matn(b.full_name, 80),
       Number.isFinite(yosh) && yosh >= 12 && yosh <= 90 ? Math.round(yosh) : null,
       bor('teri_turi') || bor('allergiya') || bor('kasallik'),
       matn(b.teri_turi, 20), matn(b.allergiya, 300), matn(b.kasallik, 300),
       bor('viloyat') || bor('tuman') || bor('address'),
       matn(b.viloyat, 60), matn(b.tuman, 60), matn(b.address, 300)]);
    return ok(res, { user: {
      full_name: u.full_name, phone: u.phone, age: u.age,
      viloyat: u.viloyat || '', tuman: u.tuman || '', address: u.address || '',
      teri_turi: u.teri_turi || '', allergiya: u.allergiya || '', kasallik: u.kasallik || '',
      royxatdan_otgan: Boolean(u.phone && u.full_name && u.agreed_at),
    } });
  }

  if (yol === '/api/cart' && req.method === 'GET') {
    return ok(res, { savat: await savatniOl(user.id) });
  }
  if (yol === '/api/cart' && req.method === 'POST') {
    const b = await tana(req);
    if (b.amal === 'tozala') { await savatniTozala(user.id); return ok(res, { savat: [] }); }
    if (b.amal === 'toplam' && Array.isArray(b.items)) {
      for (const it of b.items.slice(0, 20)) await savatgaQosh(user.id, Number(it.product_id), Number(it.quantity) || 1);
      await hodisa(user.id, 'add_cart', { toplam: b.items.length });
      return ok(res, { savat: await savatniOl(user.id) });
    }
    const id = Number(b.product_id);
    if (!id) return xato(res, 400, 'product_id kerak.');
    if (b.amal === 'ozgartir') await savatOzgartir(user.id, id, Number(b.quantity) || 0);
    else { await savatgaQosh(user.id, id, Number(b.quantity) || 1); await hodisa(user.id, 'add_cart', { id }); }
    return ok(res, { savat: await savatniOl(user.id) });
  }

  if (yol === '/api/order' && req.method === 'POST') {
    const b = await tana(req);
    const savat = await savatniOl(user.id);
    if (!savat.length) return xato(res, 400, 'Savat bo‘sh.');

    // Manzilni shu yerda tekshiramiz: profildagi eski qiymat bo'sh manzilni
    // yashirib yubormasligi kerak.
    const manzil = String(b.address ?? user.address ?? '').trim();
    if (manzil.length < 10) return xato(res, 400, 'Yetkazib berish manzilini to‘liq kiriting.');
    const tel = raqamTozala(b.phone ?? user.phone);
    if (!tel) {
      return xato(res, 400, 'Telefon raqamini tekshiring. Chet el raqami bo‘lsa '
                          + 'mamlakat kodi bilan: +82 10 1234 5678');
    }
    try {
      // Hududni ro'yxatga solishtiramiz. Mos kelmasa buyurtmani RAD ETMAYMIZ —
      // shunchaki noto'g'ri qismini tashlaymiz, aks holda eng yaqin ombor
      // xato tanlanadi (masalan "Buxoro viloyati / Chilonzor tumani").
      const { viloyat, tuman } = hududniTekshir(b.viloyat, b.tuman);

      const buyurtma = await buyurtmaYarat(
        user,
        savat.map((s) => ({ product_id: s.products.id, quantity: s.quantity })),
        { name: b.name, phone: tel, address: manzil, note: b.note, viloyat, tuman,
          yetkazishTuri: b.yetkazish_turi });

      // Manzilni keyingi safar uchun eslab qolamiz
      await sorov(
      `update users set address = $1, viloyat = coalesce($2, viloyat), tuman = coalesce($3, tuman)
        where id = $4`,
      [manzil, viloyat, tuman, user.id]);
      xabarYubor(user, buyurtma).catch(() => {});
      kanalgaBuyurtma(buyurtma, user).catch(() => {});
      return ok(res, { buyurtma });
    } catch (e) {
      return xato(res, 400, e.message);
    }
  }

  // --- Yetkazish narxi (savatga va manzilga qarab) ---
  // Mijoz filialdan olish yoki uygacha yetkazishni tanlaydi — ikkalasining
  // narxini ham ko'rsatamiz.
  if (yol === '/api/yetkazish' && req.method === 'POST') {
    const b = await tana(req);
    const savat = await savatniOl(user.id);
    if (!savat.length) return ok(res, { bosh: true });

    const items = savat.map((s) => ({ product_id: s.products.id, quantity: s.quantity }));
    const oraliq = savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
    const { viloyat, tuman } = hududniTekshir(b.viloyat, b.tuman);

    const v = await variantlar({ items, viloyat, tuman });
    const chegara = await bepulChegara();
    const bepul = oraliq >= chegara;

    return ok(res, {
      ogirlik: v.gramm, kilo: v.kilo, bepul, bepul_chegara: chegara,
      izoh: v.filial.izoh || null,
      turlar: [
        { ...TURLAR.filial, narx: bepul ? 0 : v.filial.narx },
        { ...TURLAR.uy,     narx: bepul ? 0 : v.uy.narx },
      ],
    });
  }

  // --- Buyurtma qoralamasi: yarim yo'lda chiqib ketsa yo'qolmasin ---
  if (yol === '/api/draft' && req.method === 'GET') {
    const r = await qator('select checkout_draft from users where id = $1', [user.id]);
    return ok(res, { draft: r?.checkout_draft || {} });
  }
  if (yol === '/api/draft' && req.method === 'POST') {
    const b = await tana(req);
    const toza = {
      name:    String(b.name    || '').slice(0, 70),
      phone:   String(b.phone   || '').slice(0, 20),
      address: String(b.address || '').slice(0, 300),
      kocha:   String(b.kocha   || '').slice(0, 200),
      note:    String(b.note    || '').slice(0, 200),
      viloyat: String(b.viloyat || '').slice(0, 60),
      tuman:   String(b.tuman   || '').slice(0, 60),
      qadam:   String(b.qadam   || '').slice(0, 20),
      yetkazish_turi: turTozala(b.yetkazish_turi),
    };
    await sorov('update users set checkout_draft = $1 where id = $2', [JSON.stringify(toza), user.id]);
    return ok(res, { ok: true });
  }

  // --- To'lov cheki ---
  if (yol === '/api/receipt' && req.method === 'POST') {
    const b = await tana(req);
    const xom = String(b.image || '');
    const mos = xom.match(/^data:(image\/\w+);base64,(.+)$/s);
    const base64 = mos ? mos[2] : xom;
    if (!base64 || base64.length < 500)        return xato(res, 400, 'Chek rasmi yuborilmadi.');
    if (base64.length > 8 * 1024 * 1024)       return xato(res, 413, 'Rasm juda katta.');

    const buyurtma = await qator(
      'select id, order_no from orders where order_no = $1 and user_id = $2', [b.order_no, user.id]);
    if (!buyurtma) return xato(res, 404, 'Buyurtma topilmadi.');

    const bayt = Buffer.from(base64, 'base64');
    const media = await qator(
      `insert into media (tur, mime, bayt, hajm, goya)
       values ('chek', $1, $2, $3, $4) returning id`,
      [mos ? mos[1] : 'image/jpeg', bayt, bayt.length, `Chek · ${buyurtma.order_no}`]);

    await sorov(
      `update orders set receipt_id = $1, payment_status = 'chek_yuborilgan', updated_at = now()
        where id = $2`, [media.id, buyurtma.id]);
    await hodisa(user.id, 'receipt', { order_no: buyurtma.order_no });
    kanalgaChek(buyurtma.id).catch(() => {});
    return ok(res, { ok: true });
  }

  // --- Natija rasmini Telegram orqali yuborish ---
  // Telegram WebView ichida <a download> va navigator.share ishlamaydi,
  // shuning uchun rasmni foydalanuvchining o'z chatiga yuboramiz.
  if (yol === '/api/natija-yubor' && req.method === 'POST') {
    const c = cheklov('natija:' + user.id, 8, 10 * 60_000);
    if (!c.ruxsat) return json(res, 429, { error: 'Biroz kuting va qayta urinib ko‘ring.' });

    const b = await tana(req);
    const oxirgi = b.analysis_id
      ? await qator('select id from analyses where id = $1 and user_id = $2', [Number(b.analysis_id), user.id])
      : await qator('select id from analyses where user_id = $1 order by created_at desc limit 1', [user.id]);
    if (!oxirgi) return xato(res, 404, 'Tahlil topilmadi.');

    const bayt = await saqlanganRasm(oxirgi.id, user.id);
    if (!bayt) return xato(res, 404, 'Bu tahlilning rasmi saqlanmagan. Yangi skaner qiling.');

    const r = await rasmYubor(user.telegram_id, bayt,
      '📸 <b>Teri tahlilingiz</b>\n\nRasmni bosib turib saqlashingiz yoki do‘stlaringizga ulashishingiz mumkin.');
    if (!r?.ok) return xato(res, 502, 'Telegram orqali yuborib bo‘lmadi. Botni bloklamaganingizni tekshiring.');
    await hodisa(user.id, 'natija_yuborildi', { analysis_id: oxirgi.id });
    return ok(res, { ok: true });
  }

  if (yol === '/api/orders' && req.method === 'GET') {
    return ok(res, {
      buyurtmalar: await qatorlar(
        `select order_no, subtotal, discount, delivery_fee, total, status, created_at,
                items, payment_method, payment_status, receipt_id
           from orders where user_id=$1 order by created_at desc limit 20`, [user.id]),
    });
  }

  return xato(res, 404, 'Topilmadi');
}

/** Viloyat/tuman juftligini rasmiy ro'yxatga solishtiradi. */
function hududniTekshir(xomViloyat, xomTuman) {
  const viloyat = String(xomViloyat || '').trim().slice(0, 60);
  const tuman   = String(xomTuman   || '').trim().slice(0, 60);
  if (!VILOYATLAR.includes(viloyat)) return { viloyat: null, tuman: null };
  return { viloyat, tuman: tumanlar(viloyat).includes(tuman) ? tuman : null };
}

/** Katalog ma'lumotini bir marta yig'adi — kesh shu funksiyani chaqiradi. */
async function katalogniYig() {
  const [mahsulotlar, kategoriyalar, fee, bepul, pogonalar, karta, egasi, konsult,
         menejerTel, ishVaqti, donaChegirma, donaDan, minimal, namunaId, karusel, mavzu] =
    await Promise.all([
      faolMahsulotlar(),
      qatorlar('select * from categories order by sort'),
      sozlama('delivery_fee', 25000),
      sozlama('free_delivery_from', 500000),
      sozlama('chegirma_pogonalari', []),
      sozlama('karta_raqami', ''),
      sozlama('karta_egasi', ''),
      sozlama('konsultatsiya_user', ''),
      sozlama('menejer_telefon', ''),
      sozlama('menejer_ish_vaqti', ''),
      sozlama('mahsulot_chegirma', 0),
      sozlama('mahsulot_chegirma_dan', 1),
      sozlama('minimal_buyurtma', 0),
      sozlama('skaner_namuna_id', ''),
      sozlama('karusel_rasmlar', []),
      sozlama('mavzu', {}),
    ]);
  const son = (v) => {
    const n = Number(String(v ?? '').replace(/"/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    mahsulotlar, kategoriyalar,
    yetkazish: { narx: Number(fee), bepul_chegara: Number(bepul) },
    chegirmalar: Array.isArray(pogonalar) ? pogonalar : [],
    // Har DONA uchun chegirma: 6 ta mahsulot × 5 000 = 30 000 = pochta haqi
    dona_chegirma: { narx: son(donaChegirma), dan: Math.max(1, son(donaDan) || 1) },
    minimal_buyurtma: son(minimal),
    karta: { raqam: String(karta || ''), egasi: String(egasi || '') },
    konsultatsiya: String(konsult || ''),
    menejer: { telefon: String(menejerTel || ''), ish_vaqti: String(ishVaqti || '') },
    // «Yuz skaneri» ekranidagi namuna surat (bo'sh bo'lsa matnli ko'rsatma)
    skaner_namuna: String(namunaId || '').replace(/"/g, ''),
    // Bosh sahifadagi karusel: admin yuklagan rasmlar (media id lari)
    karusel: (Array.isArray(karusel) ? karusel : [])
      .map((x) => String(x || '').replace(/"/g, '').trim()).filter(Boolean).slice(0, 10),
    // Ilova ranglari — admin panelda tanlanadi
    mavzu: palitra((mavzu && typeof mavzu === 'object') ? mavzu : {}),
  };
}

// Gemini qo'llab-quvvatlaydigan rasm turlari. iPhone HEIC, Android WebP yuboradi.
const MIME_RUYXAT = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
]);
const tozaMime = (m) => (MIME_RUYXAT.has(String(m || '').toLowerCase()) ? String(m).toLowerCase() : 'image/jpeg');

async function xabarYubor(user, o) {
  const qatorlarMatn = o.items.map((i) => `• ${esc(i.name)} × ${i.qty} — ${narx(i.price * i.qty)}`).join('\n');
  await yubor(user.telegram_id, [
    `✅ <b>Buyurtmangiz qabul qilindi!</b>`, ``,
    `<b>Raqam:</b> <code>${esc(o.order_no)}</code>`, ``,
    qatorlarMatn, ``,
    o.discount ? `🎁 Chegirma: −${narx(o.discount)}` : '',
    `🚚 Yetkazish: ${o.delivery_fee ? narx(o.delivery_fee) : 'bepul'}`,
    `<b>💰 Jami: ${narx(o.total)}</b>`, ``,
    `💳 To‘lovni amalga oshirib, chek rasmini ilovada yuklang.`,
    `📞 Menejer tez orada bog‘lanadi.`,
  ].filter((x) => x !== '').join('\n'));
}
