/* QoraQosh Mini App */
(() => {
'use strict';

const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const narx = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ') + " so'm";
const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);

const holat = {
  mahsulotlar: [], kategoriyalar: [], savat: [], kategoriya: 'hammasi',
  qidiruv: '', yetkazish: { narx: 25000, bepul_chegara: 500000 }, user: null,
};

// ---------------- API ----------------
async function api(yol, opt = {}) {
  const res = await fetch(yol, {
    ...opt,
    headers: {
      'Content-Type': 'application/json',
      'X-Init-Data': tg?.initData || '',
      ...(opt.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

const ogohlantir = (matn) => tg?.showAlert ? tg.showAlert(matn) : alert(matn);
const titra = (t = 'light') => tg?.HapticFeedback?.impactOccurred?.(t);

// ---------------- Ishga tushirish ----------------
async function boshla() {
  try {
    const katalog = await api('/api/catalog');
    holat.mahsulotlar = katalog.mahsulotlar;
    holat.kategoriyalar = katalog.kategoriyalar;
    holat.yetkazish = katalog.yetkazish;
  } catch (e) { console.error(e); }

  try {
    const me = await api('/api/me');
    holat.user = me.user;
    if (!me.user.royxatdan_otgan) return royxatEkrani();
  } catch {
    // Telegram tashqarisida ochilgan — faqat katalogni ko'rsatamiz
    kor($('#ilova'), true);
    kategoriyalarniChiz(); mahsulotlarniChiz();
    return;
  }

  kor($('#ilova'), true);
  kategoriyalarniChiz();
  mahsulotlarniChiz();
  await savatniYangila();

  const p = new URLSearchParams(location.search);
  if (p.get('tavsiya') === '1') await tavsiyaniSavatgaSol();
  if (p.get('tab')) tabOch(p.get('tab'));
}

// ---------------- Ro'yxatdan o'tish ----------------
function royxatEkrani() {
  kor($('#ekran-royxat'), true);
  $('#t-roziman').onclick = async () => {
    const xato = $('#royxat-xato');
    xato.textContent = '';
    const tana = {
      full_name: $('#f-ism').value.trim(),
      phone:     $('#f-tel').value.trim(),
      age:       Number($('#f-yosh').value),
      address:   $('#f-manzil').value.trim(),
      agreed:    true,
    };
    if (tana.full_name.length < 3)  return xato.textContent = 'Ism-familiyani to‘liq yozing.';
    if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, ''))) return xato.textContent = 'Telefon: +998901234567 ko‘rinishida.';
    if (!tana.age || tana.age < 12 || tana.age > 90) return xato.textContent = 'Yoshni 12–90 oralig‘ida kiriting.';
    if (tana.address.length < 10)   return xato.textContent = 'Manzilni to‘liqroq yozing.';

    $('#t-roziman').disabled = true;
    try {
      await api('/api/register', { method: 'POST', body: JSON.stringify(tana) });
      titra('medium');
      kor($('#ekran-royxat'), false);
      location.reload();
    } catch (e) {
      xato.textContent = e.message;
      $('#t-roziman').disabled = false;
    }
  };
}

// ---------------- Katalog ----------------
function kategoriyalarniChiz() {
  const el = $('#kategoriyalar');
  const hammasi = [{ slug: 'hammasi', name: 'Hammasi', emoji: '✨' }, ...holat.kategoriyalar];
  el.innerHTML = hammasi.map((k) =>
    `<button data-kat="${esc(k.slug)}" class="${k.slug === holat.kategoriya ? 'tanlangan' : ''}">${esc(k.emoji || '')} ${esc(k.name)}</button>`
  ).join('');
  $$('button', el).forEach((b) => b.onclick = () => {
    holat.kategoriya = b.dataset.kat;
    kategoriyalarniChiz(); mahsulotlarniChiz(); titra();
  });
}

function saralangan() {
  const katId = holat.kategoriyalar.find((k) => k.slug === holat.kategoriya)?.id;
  const q = holat.qidiruv.toLowerCase();
  return holat.mahsulotlar.filter((p) =>
    (holat.kategoriya === 'hammasi' || p.category_id === katId) &&
    (!q || `${p.name} ${p.brand || ''}`.toLowerCase().includes(q))
  );
}

function mahsulotlarniChiz() {
  const royxat = saralangan();
  kor($('#katalog-bosh'), royxat.length === 0);
  $('#mahsulotlar').innerHTML = royxat.map((p) => `
    <div class="mahsulot" data-id="${p.id}">
      <div class="rasm" style="background:linear-gradient(135deg,${esc(p.gradient?.[0] || '#333')},${esc(p.gradient?.[1] || '#666')})">${esc(p.emoji || '🧴')}</div>
      <div class="tan">
        <div class="brend">${esc(p.brand || '')}</div>
        <div class="nom">${esc(p.name)}</div>
        ${p.stock > 0 ? `<div class="narx">${narx(p.price)}</div>` : `<div class="yoq">Omborda yo‘q</div>`}
      </div>
    </div>`).join('');
  $$('.mahsulot', $('#mahsulotlar')).forEach((el) =>
    el.onclick = () => mahsulotOyna(Number(el.dataset.id)));
}

$('#qidiruv').oninput = (e) => { holat.qidiruv = e.target.value; mahsulotlarniChiz(); };

// ---------------- Mahsulot oynasi ----------------
function mahsulotOyna(id) {
  const p = holat.mahsulotlar.find((x) => x.id === id);
  if (!p) return;
  titra();
  $('#modal-tan').innerHTML = `
    <div class="rasm" style="height:120px;border-radius:12px;display:grid;place-items:center;font-size:46px;
         background:linear-gradient(135deg,${esc(p.gradient?.[0] || '#333')},${esc(p.gradient?.[1] || '#666')})">${esc(p.emoji || '🧴')}</div>
    <div style="margin-top:14px">
      <div class="brend" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--och-kul)">${esc(p.brand || '')}</div>
      <h2 style="margin:4px 0 8px">${esc(p.name)}</h2>
      <div style="font-size:19px;font-weight:600">${narx(p.price)}</div>
    </div>
    ${p.description ? `<p style="margin-top:12px;color:var(--kul)">${esc(p.description)}</p>` : ''}
    <div class="karta" style="margin-top:14px;box-shadow:none">
      ${p.volume ? qator('Hajm', esc(p.volume)) : ''}
      ${p.country ? qator('Ishlab chiqarilgan', esc(p.country === 'KR' ? '🇰🇷 Koreya' : p.country)) : ''}
      ${p.skin_types?.length ? qator('Teri turi', p.skin_types.map(esc).join(', ')) : ''}
      ${p.concerns?.length ? qator('Nimaga yordam beradi', p.concerns.map(esc).join(', ')) : ''}
      ${qator('Omborda', p.stock > 0 ? `${p.stock} dona` : '<span style="color:var(--qizil)">yo‘q</span>')}
    </div>
    ${p.usage_text ? `<div class="karta" style="box-shadow:none"><h3>📖 Qanday foydalanish</h3><p style="margin:0;color:var(--kul)">${esc(p.usage_text)}</p></div>` : ''}
    ${p.ingredients ? `<div class="karta" style="box-shadow:none"><h3>🧪 Tarkibi</h3><p style="margin:0;color:var(--kul);font-size:13.5px">${esc(p.ingredients)}</p></div>` : ''}
    ${p.warnings ? `<div class="ogoh">⚠️ ${esc(p.warnings)}</div>` : ''}
    <button class="asosiy" style="margin-top:16px" id="t-savatga" ${p.stock > 0 ? '' : 'disabled'}>
      ${p.stock > 0 ? '🛒 Savatga qo‘shish' : 'Omborda yo‘q'}
    </button>`;
  kor($('#modal'), true);
  const t = $('#t-savatga');
  if (t) t.onclick = async () => { await savatga(p.id); modalYop(); };
}

const qator = (k, v) => `<div class="qator"><span class="k">${k}</span><span class="v">${v}</span></div>`;
const modalYop = () => kor($('#modal'), false);
$$('[data-yop]').forEach((el) => el.onclick = modalYop);

// ---------------- Skaner ----------------
let tanlanganRasm = null;

$('#tushirish').onclick = () => $('#fayl').click();
$('#fayl').onchange = async (e) => {
  const fayl = e.target.files?.[0];
  if (!fayl) return;
  try {
    tanlanganRasm = await rasmniKichiklashtir(fayl);
    $('#oldindan-rasm').src = tanlanganRasm;
    kor($('#skaner-boshlash'), false);
    kor($('#skaner-natija'), false);
    kor($('#skaner-oldindan'), true);
  } catch { ogohlantir('Rasmni o‘qib bo‘lmadi.'); }
};
$('#t-boshqa').onclick = () => {
  tanlanganRasm = null; $('#fayl').value = '';
  kor($('#skaner-oldindan'), false); kor($('#skaner-boshlash'), true);
};
$('#t-tahlil').onclick = tahlilQil;

/** Yuklashdan oldin rasmni 1024px gacha kichraytiramiz — tez va ishonchli. */
function rasmniKichiklashtir(fayl, maxOlcham = 1024, sifat = 0.85) {
  return new Promise((resolve, reject) => {
    const o = new Image();
    o.onload = () => {
      const nisbat = Math.min(1, maxOlcham / Math.max(o.width, o.height));
      const c = document.createElement('canvas');
      c.width = Math.round(o.width * nisbat);
      c.height = Math.round(o.height * nisbat);
      c.getContext('2d').drawImage(o, 0, 0, c.width, c.height);
      URL.revokeObjectURL(o.src);
      resolve(c.toDataURL('image/jpeg', sifat));
    };
    o.onerror = reject;
    o.src = URL.createObjectURL(fayl);
  });
}

async function tahlilQil() {
  if (!tanlanganRasm) return;
  kor($('#skaner-oldindan'), false);
  kor($('#skaner-yuklanmoqda'), true);
  try {
    const j = await api('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ image: tanlanganRasm, mime: 'image/jpeg' }),
    });
    kor($('#skaner-yuklanmoqda'), false);
    kor($('#skaner-natija'), true);
    $('#skaner-natija').innerHTML = j.yaroqli ? natijaHtml(j) : radHtml(j);
    tugmalarniUla(j);
    titra('medium');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    kor($('#skaner-yuklanmoqda'), false);
    kor($('#skaner-boshlash'), true);
    ogohlantir(e.message);
  }
}

const RAD = {
  yuz_yoq:'Rasmda yuz topilmadi.', uzoq:'Yuz juda uzoqda — kadrni to‘ldirmaydi.',
  xira:'Rasm xira yoki qimirlab ketgan.', qorongi:'Yorug‘lik yetarli emas.',
  yopiq:'Yuz soch, ko‘zoynak yoki qo‘l bilan yopilgan.', bir_nechta:'Kadrda bir nechta odam bor.',
  pardoz:'Qalin pardoz yoki filtr teri holatini yashirmoqda.',
  sunday:'Rasm sun’iy (AI yoki deepfake) yaratilganga o‘xshaydi.',
  ekran:'Bu — ekrandan olingan surat.', yuz_emas:'Bu odam yuzining surati emas.',
};

function radHtml(j) {
  return `
  <div class="karta">
    <h2>Bu rasmni tahlil qila olmadim</h2>
    <p style="color:var(--qizil);font-weight:500;margin-top:8px">${esc(RAD[j.sabab] || RAD.xira)}</p>
    ${j.izoh ? `<p style="color:var(--kul);font-size:13.5px">${esc(j.izoh)}</p>` : ''}
    <div style="margin-top:14px">
      <div class="talab">✅ <div>Yuz kadrning kamida yarmini egallasin</div></div>
      <div class="talab">✅ <div>Kunduzgi yorug‘likda, to‘g‘ridan-to‘g‘ri kameraga</div></div>
      <div class="talab">✅ <div>Pardozsiz, filtrsiz, haqiqiy surat</div></div>
    </div>
    <button class="asosiy" id="t-qayta" style="margin-top:14px">📸 Boshqa rasm yuborish</button>
  </div>`;
}

// ---------- Tahlil natijasi: umumiy → muammolar → prognoz → tavsiya ----------
function natijaHtml(j) {
  const a = j.tahlil;
  const karta = new Map(holat.mahsulotlar.map((p) => [p.id, p]));
  const daraja = (d) => ['', 'yengil', 'o‘rtacha', 'kuchli'][Math.min(3, d)] || 'yengil';
  const darajaSinf = (d) => ['', 'yengil', 'ortacha', 'kuchli'][Math.min(3, d)] || 'yengil';
  const BOSQICH = { tozalash:'Tozalash', toner:'Toner / balans', davolash:'Davolash (serum)',
                    namlash:'Namlash', himoya:'Quyoshdan himoya', qoshimcha:'Qo‘shimcha' };

  let h = '';

  if (a.oflayn) h += `<div class="ogoh" style="margin-bottom:12px">⚠️ AI hozir mavjud emas — bazaviy tavsiya ko‘rsatilmoqda.</div>`;

  // 1. Umumiy ma'lumot
  h += `
  <div class="karta">
    <div class="karta-sarlavha"><h2>Umumiy ko‘rsatkichlar</h2></div>
    <div style="display:flex;align-items:baseline;gap:8px">
      <div class="ball">${a.ball}<small>/100</small></div>
      <div style="color:var(--kul);font-size:13px">terining umumiy holati</div>
    </div>
    <div class="shkala"><i style="width:${a.ball}%"></i></div>
    <div style="margin-top:16px">
      ${qator('Taxminiy yosh', esc(a.taxminiy_yosh))}
      ${qator('Teri rangi',   esc(a.teri_rangi))}
      ${qator('Teri turi',    esc(a.teri_turi))}
    </div>
    ${a.xulosa ? `<p style="margin:14px 0 0;color:var(--kul)">${esc(a.xulosa)}</p>` : ''}
  </div>`;

  // 2. Muammolar
  if (a.muammolar?.length) {
    h += `
    <div class="karta">
      <div class="karta-sarlavha"><h2>Aniqlangan muammolar</h2></div>
      <div class="jadval-orash"><table>
        <thead><tr><th>Muammo</th><th>Daraja</th><th>Joyi</th></tr></thead>
        <tbody>${a.muammolar.map((m) => `
          <tr>
            <td class="kuchli">${esc(m.nom)}</td>
            <td><span class="yorliq ${darajaSinf(m.daraja)}">${daraja(m.daraja)}</span></td>
            <td>${esc(m.zona || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div style="margin-top:12px">
        ${a.muammolar.filter((m) => m.izoh).map((m) =>
          `<p style="margin:0 0 8px;font-size:13.5px;color:var(--kul)"><b style="color:var(--matn)">${esc(m.nom)}</b> — ${esc(m.izoh)}</p>`).join('')}
      </div>
    </div>`;
  }

  // 3. Agar e'tibor berilmasa
  if (a.prognoz?.length) {
    h += `
    <div class="karta">
      <div class="karta-sarlavha"><h2>Agar e’tibor berilmasa</h2></div>
      <div class="jadval-orash"><table>
        <thead><tr><th>Muammo</th><th class="ong">Ehtimol</th><th class="ong">Muddat</th></tr></thead>
        <tbody>${a.prognoz.map((p) => `
          <tr>
            <td class="kuchli">${esc(p.muammo)}</td>
            <td class="ong">${p.ehtimol}%</td>
            <td class="ong">${esc(p.muddat || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div style="margin-top:12px">
        ${a.prognoz.map((p) =>
          `<p style="margin:0 0 8px;font-size:13.5px;color:var(--kul)"><b style="color:var(--matn)">${esc(p.muammo)}</b> → ${esc(p.natija)}</p>`).join('')}
      </div>
      <div class="ogoh" style="margin-top:10px">
        Bu ehtimollik baholari, tibbiy tashxis emas. Jiddiy yoki tez o‘zgarayotgan
        belgilarda dermatologga murojaat qiling.
      </div>
    </div>`;
  }

  // 4. Bosqichma-bosqich tavsiya
  const tavsiyalar = (a.tavsiya || []).map((t) => ({ ...t, p: karta.get(t.product_id) })).filter((t) => t.p);
  if (tavsiyalar.length) {
    const jami = tavsiyalar.reduce((s, t) => s + t.p.price, 0);
    h += `
    <div class="karta">
      <div class="karta-sarlavha"><h2>Sizga mos parvarish</h2></div>
      <p style="color:var(--kul);font-size:13.5px;margin-bottom:4px">
        Quyidagi tartibda qo‘llang — ketma-ketlik natijaga ta’sir qiladi.
      </p>
      ${tavsiyalar.map((t, i) => `
        <div class="bosqich">
          <div class="raqam">${i + 1}</div>
          <div class="tan">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--och-kul)">${esc(BOSQICH[t.bosqich] || t.bosqich)}</div>
            <div class="nom">${esc(t.p.emoji || '🧴')} ${esc(t.p.name)}</div>
            <div class="brend">${esc(t.p.brand || '')}${t.p.volume ? ' · ' + esc(t.p.volume) : ''} — <b style="color:var(--matn)">${narx(t.p.price)}</b></div>
            ${t.sabab ? `<div class="nega"><b>Nega aynan shu:</b> ${esc(t.sabab)}</div>` : ''}
            ${t.p.usage_text ? `<div class="qollash">📖 ${esc(t.p.usage_text)}</div>` : ''}
            ${t.p.warnings ? `<div class="qollash" style="color:var(--qizil)">⚠️ ${esc(t.p.warnings)}</div>` : ''}
          </div>
        </div>`).join('')}
      <div class="qator" style="margin-top:8px;border-top:1px solid var(--chiziq);border-bottom:0;padding-top:12px">
        <span class="k">To‘liq to‘plam</span><span class="v" style="font-size:17px">${narx(jami)}</span>
      </div>
      <button class="asosiy" id="t-hammasi" style="margin-top:12px">🛒 Hammasini savatga solish</button>
      <p style="color:var(--kul);font-size:12.5px;margin:10px 0 0">
        Hammasini birdan olish shart emas — tozalash, namlash va SPF dan boshlang.
      </p>
    </div>`;
  }

  h += `<button class="ikkilamchi" id="t-qayta" style="margin-bottom:12px">🔄 Boshqa rasm bilan qayta tahlil</button>`;
  return h;
}

function tugmalarniUla(j) {
  const qayta = $('#t-qayta');
  if (qayta) qayta.onclick = () => {
    tanlanganRasm = null; $('#fayl').value = '';
    kor($('#skaner-natija'), false); kor($('#skaner-boshlash'), true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const hammasi = $('#t-hammasi');
  if (hammasi && j.tahlil) hammasi.onclick = async () => {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam',
      items: j.tahlil.tavsiya.map((t) => ({ product_id: t.product_id, quantity: 1 })),
    })});
    await savatniYangila();
    titra('medium');
    ogohlantir('Tavsiya etilgan mahsulotlar savatga qo‘shildi ✨');
    tabOch('savat');
  };
}

async function tavsiyaniSavatgaSol() {
  try {
    const me = await api('/api/me');
    const t = me.oxirgi_tahlil?.routine;
    if (!t?.length) return;
    await api('/api/cart', { method: 'POST', body: JSON.stringify({
      amal: 'toplam', items: t.map((x) => ({ product_id: x.product_id, quantity: 1 })),
    })});
    await savatniYangila();
    tabOch('savat');
  } catch { /* jim */ }
}

// ---------------- Savat ----------------
async function savatniYangila() {
  try {
    const j = await api('/api/cart');
    holat.savat = j.savat || [];
  } catch { holat.savat = []; }
  const soni = holat.savat.reduce((s, r) => s + r.quantity, 0);
  const nishon = $('#savat-nishon');
  nishon.textContent = soni;
  kor(nishon, soni > 0);
  savatniChiz();
}

async function savatga(id, soni = 1) {
  try {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: soni }) });
    await savatniYangila();
    titra();
  } catch (e) { ogohlantir(e.message); }
}

function savatniChiz() {
  const el = $('#savat-tan');
  if (!holat.savat.length) {
    el.innerHTML = `<div class="bosh-holat"><div class="belgi">🛒</div>
      <p>Savatingiz bo‘sh</p>
      <button class="ikkilamchi" style="max-width:220px;margin:14px auto 0" onclick="document.querySelector('[data-tab=katalog]').click()">Katalogga o‘tish</button></div>`;
    return;
  }
  const oraliq = holat.savat.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const yetkazish = oraliq >= holat.yetkazish.bepul_chegara ? 0 : holat.yetkazish.narx;

  el.innerHTML = `
  <div class="karta">
    <div class="jadval-orash"><table>
      <thead><tr><th>Mahsulot</th><th class="ong">Soni</th><th class="ong">Summa</th></tr></thead>
      <tbody>${holat.savat.map(({ products: p, quantity }) => `
        <tr>
          <td><div class="kuchli">${esc(p.name)}</div>
              <div style="color:var(--och-kul);font-size:12px">${esc(p.brand || '')} · ${narx(p.price)}</div></td>
          <td class="ong">
            <button class="kichik ikkilamchi" data-kam="${p.id}" style="width:auto;padding:3px 9px">−</button>
            <span style="display:inline-block;min-width:22px;text-align:center">${quantity}</span>
            <button class="kichik ikkilamchi" data-kop="${p.id}" style="width:auto;padding:3px 9px">+</button>
          </td>
          <td class="ong kuchli">${narx(p.price * quantity)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>

  <div class="karta">
    ${qator('Mahsulotlar', narx(oraliq))}
    ${qator('Yetkazib berish', yetkazish ? narx(yetkazish) : '<span style="color:var(--yashil)">bepul</span>')}
    <div class="qator" style="border-bottom:0;padding-top:12px">
      <span class="k" style="font-weight:600;color:var(--matn)">Jami</span>
      <span class="v" style="font-size:19px">${narx(oraliq + yetkazish)}</span>
    </div>
    ${yetkazish ? `<p style="color:var(--kul);font-size:12.5px;margin:6px 0 0">
      Yana ${narx(holat.yetkazish.bepul_chegara - oraliq)} qo‘shsangiz yetkazish bepul.</p>` : ''}
  </div>

  <div class="karta">
    <h3>Yetkazib berish ma’lumotlari</h3>
    <label for="b-ism">Ism-familiya</label>
    <input id="b-ism" value="${esc(holat.user?.full_name || '')}">
    <label for="b-tel">Telefon</label>
    <input id="b-tel" type="tel" value="${esc(holat.user?.phone || '')}">
    <label for="b-manzil">Manzil</label>
    <textarea id="b-manzil">${esc(holat.user?.address || '')}</textarea>
    <label for="b-izoh">Izoh (ixtiyoriy)</label>
    <input id="b-izoh" placeholder="Masalan: kechqurun qo‘ng‘iroq qiling">
    <div id="buyurtma-xato" class="xato-matn"></div>
    <button class="asosiy" id="t-buyurtma" style="margin-top:14px">Buyurtmani rasmiylashtirish</button>
    <p style="color:var(--kul);font-size:12.5px;margin:10px 0 0">
      To‘lov yetkazib berishda naqd pulda. Menejer tasdiqlash uchun bog‘lanadi.
    </p>
  </div>`;

  $$('[data-kam]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kam), -1));
  $$('[data-kop]', el).forEach((b) => b.onclick = () => ozgartir(Number(b.dataset.kop), +1));
  $('#t-buyurtma').onclick = buyurtmaBer;
}

async function ozgartir(id, delta) {
  const qator = holat.savat.find((r) => r.products.id === id);
  if (!qator) return;
  await api('/api/cart', { method: 'POST', body: JSON.stringify({
    amal: 'ozgartir', product_id: id, quantity: qator.quantity + delta,
  })});
  await savatniYangila();
  titra();
}

async function buyurtmaBer() {
  const xato = $('#buyurtma-xato');
  xato.textContent = '';
  const tana = {
    name: $('#b-ism').value.trim(),
    phone: $('#b-tel').value.trim(),
    address: $('#b-manzil').value.trim(),
    note: $('#b-izoh').value.trim(),
  };
  if (tana.name.length < 3) return xato.textContent = 'Ismni to‘liq yozing.';
  if (!/^\+?998\d{9}$/.test(tana.phone.replace(/[\s()-]/g, ''))) return xato.textContent = 'Telefon raqamini tekshiring.';
  if (tana.address.length < 10) return xato.textContent = 'Manzilni to‘liqroq yozing.';

  const t = $('#t-buyurtma');
  t.disabled = true; t.textContent = 'Yuborilmoqda…';
  try {
    const j = await api('/api/order', { method: 'POST', body: JSON.stringify(tana) });
    await savatniYangila();
    titra('medium');
    ogohlantir(`✅ Buyurtmangiz qabul qilindi!\n\nRaqam: ${j.buyurtma.order_no}\nJami: ${narx(j.buyurtma.total)}\n\nMenejer tez orada bog‘lanadi.`);
    tabOch('buyurtma');
    buyurtmalarniChiz();
  } catch (e) {
    xato.textContent = e.message;
  } finally {
    t.disabled = false; t.textContent = 'Buyurtmani rasmiylashtirish';
  }
}

// ---------------- Buyurtmalar ----------------
const HOLAT_YORLIQ = {
  yangi: ['Yangi', ''], tasdiqlangan: ['Tasdiqlangan', 'yengil'], yolda: ['Yo‘lda', 'ortacha'],
  yetkazildi: ['Yetkazildi', 'yengil'], bekor: ['Bekor qilingan', 'kuchli'],
};

async function buyurtmalarniChiz() {
  const el = $('#buyurtma-tan');
  el.innerHTML = `<div class="yuklanmoqda"><div class="aylana"></div></div>`;
  try {
    const j = await api('/api/orders');
    if (!j.buyurtmalar.length) {
      el.innerHTML = `<div class="bosh-holat"><div class="belgi">📋</div><p>Hozircha buyurtmangiz yo‘q</p></div>`;
      return;
    }
    el.innerHTML = j.buyurtmalar.map((o) => {
      const [nom, sinf] = HOLAT_YORLIQ[o.status] || [o.status, ''];
      return `
      <div class="karta">
        <div class="karta-sarlavha">
          <div>
            <div style="font-weight:600">${esc(o.order_no)}</div>
            <div style="color:var(--och-kul);font-size:12.5px">${new Date(o.created_at).toLocaleDateString('uz-UZ')}</div>
          </div>
          <span class="yorliq ${sinf}">${nom}</span>
        </div>
        <div class="jadval-orash"><table><tbody>
          ${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="ong">${i.qty} ×</td><td class="ong">${narx(i.price * i.qty)}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="qator" style="border-bottom:0"><span class="k">Jami</span><span class="v" style="font-size:16px">${narx(o.total)}</span></div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div class="bosh-holat"><p>${esc(e.message)}</p></div>`;
  }
}

// ---------------- Tablar ----------------
function tabOch(nom) {
  ['katalog', 'skaner', 'savat', 'buyurtma'].forEach((t) => kor($(`#tab-${t}`), t === nom));
  $$('.menyu button').forEach((b) => b.classList.toggle('tanlangan', b.dataset.tab === nom));
  if (nom === 'buyurtma') buyurtmalarniChiz();
  window.scrollTo({ top: 0 });
}
$$('.menyu button').forEach((b) => b.onclick = () => { tabOch(b.dataset.tab); titra(); });

boshla();
})();
