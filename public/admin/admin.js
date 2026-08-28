/* QoraQosh admin panel */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const kor = (el, ha) => el && el.classList.toggle('yashirin', !ha);
const som = (n) => Number(n || 0).toLocaleString('uz-UZ').replace(/,/g, ' ');
const narx = (n) => som(n) + " so'm";
const sana = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' });
const vaqt = (d) => new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

let token = localStorage.getItem('qq_admin') || '';
let kesh = {};

// ---------------- API ----------------
async function api(yol, opt = {}) {
  const res = await fetch(yol, {
    ...opt,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opt.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { chiqish(); throw new Error(data.error || 'Sessiya tugadi'); }
  if (!res.ok) throw new Error(data.error || 'Xatolik');
  return data;
}

// ---------------- Kirish ----------------
$('#kirish-forma').onsubmit = async (e) => {
  e.preventDefault();
  const xato = $('#kirish-xato');
  xato.textContent = '';
  try {
    const j = await (await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: $('#k-login').value, password: $('#k-parol').value }),
    })).json();
    if (!j.token) throw new Error(j.error || 'Kirish rad etildi');
    token = j.token;
    localStorage.setItem('qq_admin', token);
    ochil();
  } catch (err) { xato.textContent = err.message; }
};

function chiqish() {
  token = ''; localStorage.removeItem('qq_admin');
  kor($('#panel'), false); kor($('#kirish'), true);
}
$('#t-chiq').onclick = chiqish;

function ochil() {
  kor($('#kirish'), false); kor($('#panel'), true);
  bolimOch('boshqaruv');
}

$$('aside button[data-b]').forEach((b) => b.onclick = () => bolimOch(b.dataset.b));

// Bo'lim kaliti -> uni chizadigan funksiya. Kalit HTML dagi #b-<kalit> va
// yon menyudagi data-b bilan bir xil.
const BOLIMLAR = {
  qollanma:  () => qollanma(),
  boshqaruv: () => boshqaruv(),
  buyurtma:  () => buyurtmalar(),
  mahsulot:  () => mahsulotlar(),
  sotuv:     () => sotuvlar(),
  user:      () => foydalanuvchilar(),
  sozlama:   () => sozlamalar(),
};

function bolimOch(nom) {
  if (!BOLIMLAR[nom]) nom = 'boshqaruv';
  $$('aside button[data-b]').forEach((b) => b.classList.toggle('faol', b.dataset.b === nom));
  Object.keys(BOLIMLAR).forEach((k) => kor($(`#b-${k}`), k === nom));
  BOLIMLAR[nom]();
}

const yuklanmoqda = (el) => el.innerHTML = `<div class="bosh-holat"><div class="aylana"></div></div>`;
const xatoChiz = (el, e) => el.innerHTML = `<div class="karta"><div class="xato">${esc(e.message)}</div></div>`;

// ================= 1. BOSHQARUV =================
async function boshqaruv() {
  const el = $('#b-boshqaruv');
  yuklanmoqda(el);
  try {
    const d = await api('/api/admin/dashboard');
    const k = d.kpi, p = d.prognoz;
    const maxKun = Math.max(1, ...d.kunlar.map((x) => x.daromad));

    el.innerHTML = `
    <div class="bosh"><h1>Boshqaruv paneli</h1>
      <span class="mayda">${new Date().toLocaleDateString('uz-UZ', { day:'numeric', month:'long', year:'numeric' })}</span></div>

    <div class="kpi-tor">
      ${kpi('Jami daromad', narx(k.jami_daromad), `${k.buyurtma_soni} ta buyurtma`)}
      ${kpi('Yalpi foyda', narx(k.yalpi_foyda), `marja ${k.marja_foiz}%`)}
      ${kpi("O‘rtacha chek", narx(k.ortacha_chek))}
      ${kpi('Bu oy', narx(k.oy_daromadi), `kuniga ~${som(p.kunlik_ortacha)}`)}
      ${kpi('Foydalanuvchilar', som(k.foydalanuvchi), `${som(k.royxatdan_otgan)} ro‘yxatdan o‘tgan`)}
      ${kpi('Yangi buyurtma', som(k.yangi_buyurtma), 'ko‘rib chiqilmagan')}
    </div>

    <div class="karta">
      <div class="karta-bosh"><h2>Daromad prognozi</h2>
        <span class="yor kok">${p.tugallanish_ehtimoli}% tugallanish</span></div>
      <div class="kpi-tor" style="margin:0">
        ${kpi('Yo‘lda (kutilayotgan)', narx(p.kutilayotgan_summa), `${p.kutilayotgan_soni} ta buyurtma`)}
        ${kpi('Shundan kutilma', narx(p.kutilayotgan_kutilma), 'ehtimolga tuzatilgan', true)}
        ${kpi('Oy oxiri prognozi', narx(p.oy_oxiri_prognoz), `${p.qolgan_kunlar} kun qoldi`, true)}
      </div>
      <p class="mayda" style="margin:12px 0 0">
        Hisob: yo‘ldagi buyurtmalar holatiga qarab (yangi 75%, tasdiqlangan 90%, yo‘lda 97%)
        tarixiy tugallanish ulushiga ko‘paytiriladi; oy oxiri prognozi kunlik o‘rtachaga asoslanadi.
        ${esc(p.izoh)}
      </p>
    </div>

    <div class="karta">
      <div class="karta-bosh"><h2>So‘nggi 14 kun</h2><span class="mayda">eng yuqori: ${narx(maxKun)}</span></div>
      <div class="grafik">
        ${d.kunlar.map((x) => `<div style="height:${Math.round((x.daromad / maxKun) * 100)}%"
            title="${x.kun}: ${narx(x.daromad)} (${x.soni} ta)"></div>`).join('')}
      </div>
      <div class="grafik-x">${d.kunlar.map((x) => `<span>${x.kun.slice(8)}</span>`).join('')}</div>
    </div>

    <div class="karta voronka">
      <div class="karta-bosh"><h2>Voronka (30 kun)</h2></div>
      ${voronkaQator('Botni ochgan', d.voronka.start, d.voronka.start)}
      ${voronkaQator('Ro‘yxatdan o‘tgan', d.voronka.register, d.voronka.start)}
      ${voronkaQator('Skaner ishlatgan', d.voronka.scan, d.voronka.start)}
      ${voronkaQator('Savatga qo‘shgan', d.voronka.add_cart, d.voronka.start)}
      ${voronkaQator('Buyurtma bergan', d.voronka.order, d.voronka.start)}
      <p class="mayda" style="margin-top:10px">
        Rad etilgan skanerlar: ${som(d.voronka.scan_rejected)} ta
        ${d.voronka.scan ? `(${Math.round(d.voronka.scan_rejected / (d.voronka.scan + d.voronka.scan_rejected) * 100)}%)` : ''}
        — rasm sifati talabga javob bermagan.
      </p>
    </div>

    <div class="karta">
      <div class="karta-bosh"><h2>Ombor</h2></div>
      <div class="kpi-tor" style="margin:0">
        ${kpi('Faol mahsulot', som(d.ombor.jami))}
        ${kpi('Tugagan', som(d.ombor.tugagan), d.ombor.tugagan ? 'to‘ldirish kerak' : '')}
        ${kpi('Kam qolgan', som(d.ombor.kam), '5 donadan kam')}
        ${kpi('Ombor qiymati', narx(d.ombor.qiymat), 'tannarx bo‘yicha')}
      </div>
    </div>`;
  } catch (e) { xatoChiz(el, e); }
}

const kpi = (k, v, q = '', urgu = false) =>
  `<div class="kpi${urgu ? ' urgu' : ''}"><div class="k">${esc(k)}</div><div class="v">${v}</div>${q ? `<div class="q">${esc(q)}</div>` : ''}</div>`;

const voronkaQator = (nom, son, asos) => `
  <div class="q">
    <div class="nom">${esc(nom)}</div>
    <div class="chiziq"><i style="width:${asos ? Math.round((son / asos) * 100) : 0}%"></i></div>
    <div class="son">${som(son)}${asos ? ` · ${Math.round((son / asos) * 100)}%` : ''}</div>
  </div>`;

// ================= 2. BUYURTMALAR =================
const HOLATLAR = {
  yangi:['Yangi','kok'], tasdiqlangan:['Tasdiqlangan','sariq'], yolda:['Yo‘lda','sariq'],
  yetkazildi:['Yetkazildi','yashil'], bekor:['Bekor','qizil'],
};

async function buyurtmalar(holat = '') {
  const el = $('#b-buyurtma');
  yuklanmoqda(el);
  try {
    const j = await api('/api/admin/orders' + (holat ? `?status=${holat}` : ''));
    el.innerHTML = `
    <div class="bosh"><h1>Buyurtmalar</h1>
      <select id="f-holat" style="width:auto">
        <option value="">Barchasi</option>
        ${Object.entries(HOLATLAR).map(([k, [n]]) => `<option value="${k}" ${k === holat ? 'selected' : ''}>${n}</option>`).join('')}
      </select></div>
    <div class="karta"><div class="jad"><table>
      <thead><tr><th>Raqam</th><th>Mijoz</th><th>Mahsulotlar</th><th class="ong">Summa</th>
        <th>To‘lov</th><th>Holat</th><th></th></tr></thead>
      <tbody>${j.buyurtmalar.map((o) => {
        const [nom, sinf] = HOLATLAR[o.status] || [o.status, 'kul'];
        return `<tr>
          <td><div class="kuchli">${esc(o.order_no)}</div><div class="mayda">${vaqt(o.created_at)}</div></td>
          <td><div>${esc(o.customer_name || '—')}</div>
              <div class="mayda">${esc(o.customer_phone || '')}</div>
              <div class="mayda">${esc((o.customer_address || '').slice(0, 44))}</div></td>
          <td class="mayda">${o.items.map((i) => `${esc(i.name)} ×${i.qty}`).join('<br>')}</td>
          <td class="ong"><div class="kuchli">${narx(o.total)}</div>
              ${o.discount ? `<div class="mayda">chegirma −${som(o.discount)}</div>` : ''}
              <div class="mayda">foyda ${som(o.total - o.delivery_fee + o.discount - o.cost_total)}</div></td>
          <td>${tolovKatak(o)}</td>
          <td><span class="yor ${sinf}">${nom}</span></td>
          <td class="ong">
            <select data-id="${o.id}" class="holat-tanla" style="width:auto;padding:4px 6px;font-size:12px">
              ${Object.entries(HOLATLAR).map(([k, [n]]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${n}</option>`).join('')}
            </select></td>
        </tr>`; }).join('') || `<tr><td colspan="7" class="bosh-holat">Buyurtma yo‘q</td></tr>`}
      </tbody></table></div></div>`;

    $('#f-holat').onchange = (e) => buyurtmalar(e.target.value);
    $$('[data-chek]', el).forEach((b) => b.onclick = () => chekOyna(b.dataset.chek, Number(b.dataset.oid)));
    $$('.holat-tanla', el).forEach((s) => s.onchange = async () => {
      const yangi = s.value;
      let sabab = null;
      if (yangi === 'bekor') {
        sabab = prompt('Bekor qilish sababi (mijozga yuboriladi):');
        if (sabab === null) return buyurtmalar(holat);
      }
      s.disabled = true;
      try {
        await api('/api/admin/order-status', { method: 'POST',
          body: JSON.stringify({ id: Number(s.dataset.id), status: yangi, reason: sabab }) });
        buyurtmalar(holat);
      } catch (e) { alert(e.message); s.disabled = false; }
    });
  } catch (e) { xatoChiz(el, e); }
}

const TOLOV_YOR = {
  kutilmoqda:      ['⏳ Kutilmoqda', 'sariq'],
  chek_yuborilgan: ['📄 Chek keldi',  'kok'],
  tolangan:        ['✅ To‘langan',   'yashil'],
  naqd:            ['💵 Naqd',        'kul'],
};

function tolovKatak(o) {
  const [nom, sinf] = TOLOV_YOR[o.payment_status] || ['—', 'kul'];
  const chek = o.receipt_id
    ? `<div style="margin-top:5px"><button class="tug kichik" data-chek="${o.receipt_id}" data-oid="${o.id}">📄 Chekni ko‘rish</button></div>`
    : '';
  return `<span class="yor ${sinf}">${nom}</span>${chek}`;
}

/** Chek rasmi + to'lovni tasdiqlash. */
function chekOyna(mediaId, orderId) {
  modal(`
    <h2>To‘lov cheki</h2>
    <img src="/media/${esc(mediaId)}?t=${encodeURIComponent(token)}" alt="Chek"
         style="width:100%;border-radius:10px;margin-top:12px;background:var(--fon)">
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="tug asos" id="c-tasdiq" style="flex:1">✅ To‘lov tasdiqlandi</button>
      <button class="tug" id="c-rad">↩︎ Qayta so‘rash</button>
    </div>
    <p class="mayda" style="margin-top:10px">
      Tasdiqlasangiz mijozga botda xabar boradi. «Qayta so‘rash» — chek noto‘g‘ri bo‘lsa.</p>`);
  $('#c-tasdiq').onclick = async () => {
    await api('/api/admin/payment-status', { method: 'POST',
      body: JSON.stringify({ id: orderId, payment_status: 'tolangan' }) });
    modalYop(); buyurtmalar();
  };
  $('#c-rad').onclick = async () => {
    await api('/api/admin/payment-status', { method: 'POST',
      body: JSON.stringify({ id: orderId, payment_status: 'kutilmoqda' }) });
    modalYop(); buyurtmalar();
  };
}

// ================= 3. MAHSULOTLAR =================
async function mahsulotlar() {
  const el = $('#b-mahsulot');
  yuklanmoqda(el);
  try {
    const j = await api('/api/admin/products');
    kesh.kategoriyalar = j.kategoriyalar;
    el.innerHTML = `
    <div class="bosh"><h1>Mahsulotlar</h1>
      <div style="display:flex;gap:8px">
        <button class="tug" id="t-yangi">+ Qo‘lda qo‘shish</button>
        <button class="tug asos" id="t-skrin">📷 Skrinshotdan qo‘shish</button>
      </div></div>
    <div class="karta"><div class="jad"><table>
      <thead><tr><th>Mahsulot</th><th class="ong">Narx</th><th class="ong">Tannarx</th>
        <th class="ong">Marja</th><th class="ong">Ombor</th><th class="ong">Sotilgan</th><th></th></tr></thead>
      <tbody>${j.mahsulotlar.map((p) => {
        const marja = p.price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
        return `<tr style="${p.is_active ? '' : 'opacity:.45'}">
          <td><div class="kuchli">${esc(p.emoji || '')} ${esc(p.name)}</div>
              <div class="mayda">${esc(p.brand || '')} ${p.volume ? '· ' + esc(p.volume) : ''}
              ${p.ai_filled ? '<span class="yor kok" style="margin-left:4px">AI</span>' : ''}</div></td>
          <td class="ong kuchli">${som(p.price)}</td>
          <td class="ong">${som(p.cost_price)}</td>
          <td class="ong"><span class="yor ${marja >= 35 ? 'yashil' : marja >= 20 ? 'sariq' : 'qizil'}">${marja}%</span></td>
          <td class="ong">${p.stock === 0 ? '<span class="yor qizil">0</span>' : p.stock <= 5 ? `<span class="yor sariq">${p.stock}</span>` : p.stock}</td>
          <td class="ong">${p.sold_count}</td>
          <td class="ong" style="white-space:nowrap">
            <button class="tug kichik" data-poster="${p.id}" title="Reklama posteri">📢</button>
            <button class="tug kichik" data-tahrir="${p.id}">Tahrir</button></td>
        </tr>`; }).join('')}
      </tbody></table></div></div>`;

    kesh.mahsulotlar = j.mahsulotlar;
    $('#t-yangi').onclick = () => mahsulotOyna(null);
    $('#t-skrin').onclick = skrinshotOyna;
    $$('[data-tahrir]', el).forEach((b) => b.onclick = () =>
      mahsulotOyna(kesh.mahsulotlar.find((p) => p.id === Number(b.dataset.tahrir))));
    $$('[data-poster]', el).forEach((b) => b.onclick = () =>
      posterOyna(kesh.mahsulotlar.find((p) => p.id === Number(b.dataset.poster))));
  } catch (e) { xatoChiz(el, e); }
}

// ---------- Skrinshotdan tanish ----------
function skrinshotOyna() {
  modal(`
    <h2>Skrinshotdan mahsulot qo‘shish</h2>
    <p class="mayda" style="margin:6px 0 14px">
      Mahsulot qadog‘i, etiketkasi yoki do‘kon skrinshotini yuklang.
      AI mahsulotni tanib, kartochkani to‘ldiradi — siz tekshirib, narx qo‘yasiz.</p>
    <div class="tushirish" id="t-tushir">📷 Rasm tanlang</div>
    <input type="file" id="f-skrin" accept="image/*" hidden>
    <div id="skrin-holat" style="margin-top:14px"></div>`);

  $('#t-tushir').onclick = () => $('#f-skrin').click();
  $('#f-skrin').onchange = async (e) => {
    const fayl = e.target.files?.[0];
    if (!fayl) return;
    const holat = $('#skrin-holat');
    holat.innerHTML = `<div class="aylana"></div> <span class="mayda">AI mahsulotni o‘rganmoqda…</span>`;
    try {
      const rasm = await kichiklashtir(fayl);
      const j = await api('/api/admin/recognize', { method: 'POST', body: JSON.stringify({ image: rasm }) });
      if (!j.topildi || j.ishonch < 35) {
        holat.innerHTML = `<div class="xato">AI aniq tanimadi (ishonch ${j.ishonch}%).
          ${esc(j.izoh)}<br>Quyidagi forma taxminiy to‘ldirildi — tekshirib chiqing.</div>`;
        setTimeout(() => mahsulotOyna({ ...j, id: null, ai_filled: true }), 1400);
      } else {
        holat.innerHTML = `<div class="ok">✓ Tanildi: <b>${esc(j.brand)} ${esc(j.name)}</b> (ishonch ${j.ishonch}%)</div>`;
        setTimeout(() => mahsulotOyna({ ...j, id: null, ai_filled: true }), 700);
      }
    } catch (err) {
      holat.innerHTML = `<div class="xato">${esc(err.message)}</div>`;
    }
  };
}

function kichiklashtir(fayl, max = 1024, sifat = 0.85) {
  return new Promise((res, rej) => {
    const o = new Image();
    o.onload = () => {
      const n = Math.min(1, max / Math.max(o.width, o.height));
      const c = document.createElement('canvas');
      c.width = Math.round(o.width * n); c.height = Math.round(o.height * n);
      c.getContext('2d').drawImage(o, 0, 0, c.width, c.height);
      URL.revokeObjectURL(o.src);
      res(c.toDataURL('image/jpeg', sifat));
    };
    o.onerror = rej; o.src = URL.createObjectURL(fayl);
  });
}

// ---------- Mahsulot formasi ----------
const BOSQICHLAR = { tozalash:'Tozalash', toner:'Toner', davolash:'Davolash (serum)',
                     namlash:'Namlash', himoya:'Quyoshdan himoya', qoshimcha:'Qo‘shimcha' };
const MUAMMOLAR = ['akne','teshik','yoglilik','quruqlik','qizarish','dog','ajin','xiralik','sezgirlik','quyosh'];
const TERILAR = ['quruq','yogli','aralash','normal','sezgir','barcha'];

function mahsulotOyna(p) {
  const yangi = !p?.id;
  const katId = p?.category_id ?? kesh.kategoriyalar?.find((c) => c.slug === p?.category)?.id ?? '';
  const belgi = (royxat, tanlangan, nom) => royxat.map((v) =>
    `<label style="display:inline-flex;align-items:center;gap:5px;margin:0 12px 6px 0;font-size:13px;color:var(--matn)">
       <input type="checkbox" name="${nom}" value="${v}" style="width:auto" ${(tanlangan || []).includes(v) ? 'checked' : ''}>${v}</label>`).join('');

  modal(`
    <h2>${yangi ? 'Yangi mahsulot' : 'Mahsulotni tahrirlash'}</h2>
    ${p?.ai_filled && yangi ? `<div class="yor kok" style="margin-top:8px">AI to‘ldirdi — tekshiring</div>` : ''}
    <div class="forma-tor">
      <div><label>Nomi *</label><input id="m-name" value="${esc(p?.name || '')}"></div>
      <div><label>Brend</label><input id="m-brand" value="${esc(p?.brand || '')}"></div>
      <div><label>Kategoriya</label><select id="m-cat">
        ${(kesh.kategoriyalar || []).map((c) => `<option value="${c.id}" ${c.id === katId ? 'selected' : ''}>${esc(c.emoji || '')} ${esc(c.name)}</option>`).join('')}
      </select></div>
      <div><label>Parvarish bosqichi</label><select id="m-step">
        ${Object.entries(BOSQICHLAR).map(([k, n]) => `<option value="${k}" ${k === p?.step ? 'selected' : ''}>${n}</option>`).join('')}
      </select></div>
      <div><label>Narx (so‘m) *</label><input id="m-price" type="number" value="${p?.price || ''}"></div>
      <div><label>Tannarx (so‘m)</label><input id="m-cost" type="number" value="${p?.cost_price || ''}"></div>
      <div><label>Ombor (dona)</label><input id="m-stock" type="number" value="${p?.stock ?? 0}"></div>
      <div><label>Hajm</label><input id="m-volume" value="${esc(p?.volume || '')}"></div>
      <div><label>Davlat</label><input id="m-country" value="${esc(p?.country || 'KR')}" maxlength="4"></div>
      <div><label>Emoji</label><input id="m-emoji" value="${esc(p?.emoji || '🧴')}" maxlength="4"></div>
    </div>
    <label>Tavsif — nima qiladi</label><textarea id="m-desc">${esc(p?.description || '')}</textarea>
    <label>Qanday foydalanish</label><textarea id="m-usage">${esc(p?.usage_text || '')}</textarea>
    <label>Tarkibi (INCI)</label><textarea id="m-ing">${esc(p?.ingredients || '')}</textarea>
    <label>Ehtiyot choralari</label><input id="m-warn" value="${esc(p?.warnings || '')}">
    <label>Faol moddalar (vergul bilan)</label><input id="m-act" value="${esc((p?.actives || []).join(', '))}">
    <label>Qaysi muammoga yordam beradi</label><div>${belgi(MUAMMOLAR, p?.concerns, 'concern')}</div>
    <label>Kimga mos (teri turi)</label><div>${belgi(TERILAR, p?.skin_types, 'skin')}</div>
    <label style="display:inline-flex;align-items:center;gap:6px;color:var(--matn)">
      <input type="checkbox" id="m-faol" style="width:auto" ${p?.is_active !== false ? 'checked' : ''}> Katalogda ko‘rinsin</label>
    <div id="m-xato" class="xato"></div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="tug asos" id="m-saqla" style="flex:1">Saqlash</button>
      <button class="tug" data-yop>Bekor</button>
    </div>`);

  $('#m-saqla').onclick = async () => {
    const xato = $('#m-xato');
    const tana = {
      id: p?.id || undefined,
      name: $('#m-name').value.trim(), brand: $('#m-brand').value.trim(),
      category_id: Number($('#m-cat').value) || null, step: $('#m-step').value,
      price: Number($('#m-price').value), cost_price: Number($('#m-cost').value) || 0,
      stock: Number($('#m-stock').value) || 0, volume: $('#m-volume').value.trim(),
      country: $('#m-country').value.trim(), emoji: $('#m-emoji').value.trim(),
      description: $('#m-desc').value.trim(), usage_text: $('#m-usage').value.trim(),
      ingredients: $('#m-ing').value.trim(), warnings: $('#m-warn').value.trim(),
      actives: $('#m-act').value.split(',').map((s) => s.trim()).filter(Boolean),
      concerns: $$('input[name=concern]:checked').map((i) => i.value),
      skin_types: $$('input[name=skin]:checked').map((i) => i.value),
      is_active: $('#m-faol').checked, ai_filled: Boolean(p?.ai_filled),
    };
    if (!tana.name)  return xato.textContent = 'Nomi kerak.';
    if (!tana.price) return xato.textContent = 'Narx kerak.';
    $('#m-saqla').disabled = true;
    try { await api('/api/admin/product', { method: 'POST', body: JSON.stringify(tana) });
          modalYop(); mahsulotlar(); }
    catch (e) { xato.textContent = e.message; $('#m-saqla').disabled = false; }
  };
}

// ================= 4. SOTUVLAR =================
async function sotuvlar() {
  const el = $('#b-sotuv');
  yuklanmoqda(el);
  try {
    const j = await api('/api/admin/sales');
    el.innerHTML = `
    <div class="bosh"><h1>Sotilgan mahsulotlar</h1></div>
    <div class="kpi-tor">
      ${kpi('Sotilgan dona', som(j.jami.soni))}
      ${kpi('Daromad', narx(j.jami.daromad))}
      ${kpi('Yalpi foyda', narx(j.jami.foyda), j.jami.daromad ? `marja ${Math.round(j.jami.foyda / j.jami.daromad * 100)}%` : '', true)}
    </div>
    <div class="karta"><div class="jad"><table>
      <thead><tr><th>#</th><th>Mahsulot</th><th class="ong">Dona</th><th class="ong">Daromad</th>
        <th class="ong">Tannarx</th><th class="ong">Foyda</th><th class="ong">Marja</th></tr></thead>
      <tbody>${j.sotuvlar.map((r, i) => `
        <tr>
          <td class="mayda">${i + 1}</td>
          <td><div class="kuchli">${esc(r.name)}</div><div class="mayda">${esc(r.brand || '')}</div></td>
          <td class="ong kuchli">${r.soni}</td>
          <td class="ong">${som(r.daromad)}</td>
          <td class="ong mayda">${som(r.tannarx)}</td>
          <td class="ong kuchli">${som(r.foyda)}</td>
          <td class="ong"><span class="yor ${r.marja >= 35 ? 'yashil' : r.marja >= 20 ? 'sariq' : 'qizil'}">${r.marja}%</span></td>
        </tr>`).join('') || `<tr><td colspan="7" class="bosh-holat">Hozircha sotuv yo‘q</td></tr>`}
      </tbody></table></div></div>`;
  } catch (e) { xatoChiz(el, e); }
}

// ================= 5. FOYDALANUVCHILAR =================
async function foydalanuvchilar(qidiruv = '') {
  const el = $('#b-user');
  yuklanmoqda(el);
  try {
    const j = await api('/api/admin/users' + (qidiruv ? `?q=${encodeURIComponent(qidiruv)}` : ''));
    el.innerHTML = `
    <div class="bosh"><h1>Foydalanuvchilar</h1>
      <input id="f-qidir" placeholder="Ism, telefon yoki username" value="${esc(qidiruv)}" style="width:250px"></div>
    <div class="karta"><div class="jad"><table>
      <thead><tr><th>Foydalanuvchi</th><th>Telefon</th><th class="ong">Yosh</th><th>Manzil</th>
        <th class="ong">Xarid</th><th>Ro‘yxat</th><th></th></tr></thead>
      <tbody>${j.users.map((u) => `
        <tr style="${u.is_blocked ? 'opacity:.45' : ''}">
          <td><div class="kuchli">${esc(u.full_name || '—')}</div>
              <div class="mayda">${u.username ? '@' + esc(u.username) : 'ID ' + esc(u.telegram_id)}</div></td>
          <td>${esc(u.phone || '—')}</td>
          <td class="ong">${u.age || '—'}</td>
          <td class="mayda">${esc((u.address || '—').slice(0, 40))}</td>
          <td class="ong kuchli">${som(u.jami_xarid)}</td>
          <td>${u.agreed_at ? `<span class="yor yashil">✓ ${sana(u.agreed_at)}</span>` : '<span class="yor kul">yo‘q</span>'}</td>
          <td class="ong"><button class="tug kichik" data-blok="${u.id}" data-holat="${u.is_blocked ? 1 : 0}">
            ${u.is_blocked ? 'Ochish' : 'Bloklash'}</button></td>
        </tr>`).join('') || `<tr><td colspan="7" class="bosh-holat">Topilmadi</td></tr>`}
      </tbody></table></div></div>`;

    let vaqtchi;
    $('#f-qidir').oninput = (e) => {
      clearTimeout(vaqtchi);
      vaqtchi = setTimeout(() => foydalanuvchilar(e.target.value), 350);
    };
    $$('[data-blok]', el).forEach((b) => b.onclick = async () => {
      await api('/api/admin/user-block', { method: 'POST',
        body: JSON.stringify({ id: Number(b.dataset.blok), blocked: b.dataset.holat === '0' }) });
      foydalanuvchilar(qidiruv);
    });
  } catch (e) { xatoChiz(el, e); }
}

// ================= 6. SOZLAMALAR =================
async function sozlamalar() {
  const el = $('#b-sozlama');
  yuklanmoqda(el);
  try {
    const { settings: st } = await api('/api/admin/settings');
    const matn = (k, z = '') => String(st[k] ?? z).replace(/^"|"$/g, '');
    kesh.pogonalar = Array.isArray(st.chegirma_pogonalari) ? [...st.chegirma_pogonalari] : [];

    el.innerHTML = `
    <div class="bosh"><h1>Sozlamalar</h1></div>

    <div class="karta" style="max-width:560px">
      <div class="karta-bosh"><h2>🎁 Chegirma pog‘onalari</h2></div>
      <p class="mayda" style="margin:0 0 12px">
        Savat summasi ko‘rsatilgan chegaradan oshsa, mijoz shu chegirmani oladi.
        Bir nechta pog‘ona mos kelsa — eng kattasi qo‘llanadi.</p>
      <div id="pogonalar"></div>
      <button class="tug" id="p-qosh" style="margin-top:10px">+ Pog‘ona qo‘shish</button>
      <div id="p-namuna" class="mayda" style="margin-top:12px"></div>
    </div>

    <div class="karta" style="max-width:560px">
      <div class="karta-bosh"><h2>💳 To‘lov kartasi</h2></div>
      <p class="mayda" style="margin:0 0 10px">Mijoz «Kartaga o‘tkazma» ni tanlaganda shu raqam chiqadi.</p>
      <label>Karta raqami</label>
      <input id="s-karta" value="${esc(matn('karta_raqami'))}" placeholder="8600 0000 0000 0000">
      <label>Karta egasining ismi</label>
      <input id="s-egasi" value="${esc(matn('karta_egasi'))}" placeholder="ALIYEV ALI">
    </div>

    <div class="karta" style="max-width:560px">
      <div class="karta-bosh"><h2>🚚 Yetkazib berish</h2></div>
      <label>Yetkazib berish narxi (so‘m)</label>
      <input id="s-fee" type="number" value="${Number(st.delivery_fee) || 25000}">
      <label>Qaysi summadan bepul</label>
      <input id="s-free" type="number" value="${Number(st.free_delivery_from) || 500000}">
    </div>

    <div class="karta" style="max-width:560px">
      <div class="karta-bosh"><h2>💬 Konsultatsiya</h2></div>
      <label>Menejer Telegram username (@ siz)</label>
      <input id="s-konsult" value="${esc(matn('konsultatsiya_user'))}" placeholder="qoraqosh_admin">
      <p class="mayda" style="margin-top:8px">
        Botdagi va ilovadagi «Konsultatsiya» tugmasi shu hisobga olib boradi.</p>
    </div>

    <div style="max-width:560px">
      <div id="s-holat"></div>
      <button class="tug asos" id="s-saqla" style="margin-top:6px;width:100%">Barcha sozlamalarni saqlash</button>
    </div>`;

    pogonalarniChiz();
    $('#p-qosh').onclick = () => { kesh.pogonalar.push({ dan: 0, chegirma: 0 }); pogonalarniChiz(); };
    $('#s-saqla').onclick = sozlamalarniSaqla;
  } catch (e) { xatoChiz(el, e); }
}

function pogonalarniChiz() {
  const el = $('#pogonalar');
  if (!kesh.pogonalar.length) {
    el.innerHTML = `<p class="mayda">Pog‘ona yo‘q — chegirma berilmaydi.</p>`;
  } else {
    el.innerHTML = kesh.pogonalar.map((p, i) => `
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px">
        <div style="flex:1"><label style="margin-top:0">Summa shundan oshsa</label>
          <input type="number" data-dan="${i}" value="${Number(p.dan) || 0}"></div>
        <div style="flex:1"><label style="margin-top:0">Chegirma (so‘m)</label>
          <input type="number" data-ch="${i}" value="${Number(p.chegirma) || 0}"></div>
        <button class="tug kichik" data-och="${i}" style="height:38px">🗑</button>
      </div>`).join('');
  }
  $$('[data-dan]', el).forEach((i) => i.oninput = () => {
    kesh.pogonalar[Number(i.dataset.dan)].dan = Number(i.value) || 0; namunaChiz(); });
  $$('[data-ch]', el).forEach((i) => i.oninput = () => {
    kesh.pogonalar[Number(i.dataset.ch)].chegirma = Number(i.value) || 0; namunaChiz(); });
  $$('[data-och]', el).forEach((b) => b.onclick = () => {
    kesh.pogonalar.splice(Number(b.dataset.och), 1); pogonalarniChiz(); });
  namunaChiz();
}

/** Sozlamani odam tilida ko'rsatadi — xato qo'yishning oldini oladi. */
function namunaChiz() {
  const el = $('#p-namuna');
  if (!el) return;
  const p = [...kesh.pogonalar].filter((x) => x.dan > 0 && x.chegirma > 0).sort((a, b) => a.dan - b.dan);
  if (!p.length) { el.innerHTML = ''; return; }
  const sinov = [200000, 350000, 550000, 800000];
  el.innerHTML = `<b>Qanday ishlaydi:</b><br>` + p.map((x) =>
    `• ${som(x.dan)} so‘mdan yuqori savdoga <b>${som(x.chegirma)} so‘m</b> chegirma`).join('<br>') +
    `<br><br><b>Misol:</b> ` + sinov.map((sum) => {
      const ch = p.reduce((m, x) => (sum >= x.dan ? Math.max(m, x.chegirma) : m), 0);
      return `${som(sum)} → ${ch ? `−${som(ch)}` : 'chegirmasiz'}`;
    }).join(' · ');
}

async function sozlamalarniSaqla() {
  const holat = $('#s-holat');
  const pogonalar = kesh.pogonalar
    .filter((p) => Number(p.dan) > 0 && Number(p.chegirma) > 0)
    .map((p) => ({ dan: Number(p.dan), chegirma: Number(p.chegirma) }))
    .sort((a, b) => a.dan - b.dan);

  // Mantiqiy xato: kattaroq savdoga kichikroq chegirma
  for (let i = 1; i < pogonalar.length; i++) {
    if (pogonalar[i].chegirma < pogonalar[i - 1].chegirma) {
      holat.innerHTML = `<div class="xato">${som(pogonalar[i].dan)} so‘mlik pog‘onada chegirma
        oldingisidan kam. Kattaroq savdoga kattaroq chegirma bo‘lishi kerak.</div>`;
      return;
    }
  }
  try {
    await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ settings: {
      chegirma_pogonalari: pogonalar,
      karta_raqami:       $('#s-karta').value.trim(),
      karta_egasi:        $('#s-egasi').value.trim(),
      delivery_fee:       Number($('#s-fee').value) || 0,
      free_delivery_from: Number($('#s-free').value) || 0,
      konsultatsiya_user: $('#s-konsult').value.trim().replace(/^@/, ''),
    }})});
    holat.innerHTML = `<div class="ok">✓ Saqlandi — o‘zgarish darhol kuchga kirdi</div>`;
  } catch (e) { holat.innerHTML = `<div class="xato">${esc(e.message)}</div>`; }
}

// ================= 7. QO'LLANMA =================
function qollanma() {
  const el = $('#b-qollanma');
  el.innerHTML = `
  <div class="bosh"><h1>Qanday ishlataman</h1></div>

  <div class="karta" style="max-width:720px">
    <h2>🚀 Birinchi kun: nimadan boshlash</h2>
    <ol style="padding-left:20px;line-height:1.9;margin:12px 0 0">
      <li><b>Sozlamalar</b> → karta raqami, yetkazib berish narxi va menejer username’ini kiriting.</li>
      <li><b>Mahsulotlar</b> → katalogdagi 28 ta mahsulotning <b>narx va tannarxini</b> o‘zingiznikiga moslang.
        Tannarxsiz foyda hisoblanmaydi.</li>
      <li>Har mahsulotning <b>ombor</b> sonini kiriting — 0 bo‘lsa mijoz sotib ololmaydi.</li>
      <li><b>Sozlamalar</b> → chegirma pog‘onalarini qo‘ying (masalan 300 000 dan 15 000).</li>
    </ol>
  </div>

  <div class="karta" style="max-width:720px">
    <h2>📦 Har kuni: buyurtmalar</h2>
    <p class="mayda">Yangi buyurtma kelganda <b>Buyurtmalar</b> bo‘limida <span class="yor kok">🆕 Yangi</span> bo‘lib turadi.</p>
    <ol style="padding-left:20px;line-height:1.9">
      <li>Mijozning telefoni va manzilini tekshiring.</li>
      <li>Karta bilan to‘lagan bo‘lsa — <b>📄 Chekni ko‘rish</b> tugmasi chiqadi.
        Chekni ochib, summani solishtiring va <b>✅ To‘lov tasdiqlandi</b> ni bosing
        (mijozga botda avtomatik xabar boradi).</li>
      <li>Holatni ketma-ket o‘zgartiring:
        <b>Tasdiqlangan → Yo‘lda → Yetkazildi</b>. Har o‘zgarishda mijozga xabar boradi.</li>
      <li><b>Bekor</b> qilsangiz — sabab so‘raladi va mahsulotlar omborga qaytadi.</li>
    </ol>
  </div>

  <div class="karta" style="max-width:720px">
    <h2>🛍 Mahsulot qo‘shish</h2>
    <p class="mayda">Ikki yo‘l bor:</p>
    <ul style="padding-left:20px;line-height:1.9">
      <li><b>📷 Skrinshotdan</b> — mahsulot qadog‘i yoki do‘kon skrinshotini yuklaysiz,
        AI nomi, tarkibi va qanday foydalanishni o‘zi to‘ldiradi. Siz faqat
        <b>narx, tannarx va ombor</b> ni qo‘yasiz.</li>
      <li><b>Qo‘lda</b> — barcha maydonni o‘zingiz to‘ldirasiz.</li>
    </ul>
    <p class="mayda"><b>Muhim:</b> «Parvarish bosqichi» ni to‘g‘ri tanlang —
      AI tavsiya berayotganda mahsulotni shu bo‘yicha tartibga soladi.
      «Qaysi muammoga yordam beradi» esa qidiruvda ishlaydi.</p>
  </div>

  <div class="karta" style="max-width:720px">
    <h2>📢 Reklama posteri</h2>
    <p class="mayda">Mahsulot yonidagi <b>📢</b> tugmasi:
      rasm yuklaysiz → AI 4 ta g‘oya beradi → bittasini tanlaysiz → poster chiziladi →
      «Katalogda ishlatish» bossangiz, u mahsulot rasmi bo‘lib chiqadi.</p>
  </div>

  <div class="karta" style="max-width:720px">
    <h2>📊 Raqamlarni qanday o‘qish</h2>
    <ul style="padding-left:20px;line-height:1.9">
      <li><b>Yalpi foyda</b> = daromad − tannarx. Kuryer va reklama bu yerga kirmaydi.</li>
      <li><b>Marja</b> 35% dan past bo‘lsa — narx past yoki tannarx yuqori.</li>
      <li><b>Voronka</b> — qayerda odam yo‘qotayotganingizni ko‘rsatadi.
        Masalan skaner ko‘p, buyurtma kam bo‘lsa — narx yoki ishonch muammosi.</li>
      <li><b>Daromad prognozi</b> — yo‘ldagi buyurtmalarning qanchasi haqiqatda
        yetkaziladi degan tarixiy ulushga asoslangan taxmin, kafolat emas.</li>
      <li><b>Ombor qiymati</b> — omborda turgan pulingiz (tannarx bo‘yicha).</li>
    </ul>
  </div>

  <div class="karta" style="max-width:720px">
    <h2>🔐 Xavfsizlik</h2>
    <p class="mayda">
      Login va parol Railway → Variables ichida (<code>ADMIN_LOGIN</code>,
      <code>ADMIN_PASSWORD</code>, <code>ADMIN_JWT_SECRET</code>). O‘zgartirish uchun
      Railway’da qiymatni yangilang va servisni qayta ishga tushiring.
      Sessiya 8 soatdan keyin avtomatik tugaydi. Parolni 5 marta xato kiritishga
      urinilsa, 15 daqiqaga bloklanadi.
    </p>
  </div>`;
}

// ================= Modal =================
function modal(html) { $('#modal-tan').innerHTML = html; kor($('#modal'), true); ulaYopish(); }
function modalYop() { kor($('#modal'), false); }
function ulaYopish() { $$('[data-yop]').forEach((el) => el.onclick = modalYop); }
ulaYopish();

// ================= Boshlash =================
if (token) api('/api/admin/dashboard').then(ochil).catch(chiqish);
})();
