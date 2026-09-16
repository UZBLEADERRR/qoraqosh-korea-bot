/* kiovo.shop — bosh sahifa.
 *
 * Sahifa ma'lumotsiz ham TO'LIQ ishlaydi: hamma matn HTML da turadi
 * va tugmalar server yo'llariga (`/skan/`, `/app/ochish`) qarab
 * ketadi. Bu skript faqat jonli qismlarni qo'shadi — mahsulot
 * vitrinasi, aloqa ma'lumoti va «ekranga o'rnatish» tugmasi.
 * So'rov yiqilsa hech narsa buzilmaydi, shunchaki o'sha bloklar
 * ko'rinmaydi.
 */
(() => {
  'use strict';

  const $ = (s, o = document) => o.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const narx = (n) => `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} so‘m`;

  // ── Ma'lumot ──
  fetch('/api/ochiq/sayt')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { if (j) { vitrinaChiz(j.mahsulotlar || []); aloqaChiz(j); botniUla(j.bot); } })
    .catch(() => {});

  /** Mahsulot vitrinasi. Bo'sh bo'lsa bo'lim butunlay yashirin qoladi. */
  function vitrinaChiz(royxat) {
    const el = $('#mahsulotlar');
    if (!el || !royxat.length) return;
    el.innerHTML = royxat.map((p) => `
      <a class="mahsulot" href="/app/ochish" data-bot>
        <span class="mahsulot-rasm">${p.rasm
          ? `<img src="${esc(p.rasm)}" alt="" loading="lazy" width="240" height="240">` : ''}</span>
        <span class="mahsulot-ich">
          ${p.brend ? `<span class="mahsulot-brend">${esc(p.brend)}</span>` : ''}
          <span class="mahsulot-nom">${esc(p.nom)}</span>
          <span class="mahsulot-narx">${narx(p.narx)}${
            p.eski_narx > p.narx ? `<s>${narx(p.eski_narx)}</s>` : ''}</span>
        </span>
      </a>`).join('');
    el.hidden = false;
    // Serverdan kelgan kartalar ham boshqalar kabi ko'tarilib
    // chiqadi — ular sahifaga «yopishtirilgandek» tushib qolmasin
    kuzat(el.querySelectorAll('.mahsulot'));
  }

  /** Aloqa: telefon va Telegram. Sozlanmagani umuman chiqmaydi —
   *  bo'sh «Telefon: —» qatori ishonchni yo'qotadi. */
  function aloqaChiz(j) {
    const el = $('#aloqa-royxat');
    if (!el) return;
    const qism = [];
    if (j.telefon) {
      qism.push(`<a class="aloqa-karta" href="tel:${esc(String(j.telefon).replace(/[^\d+]/g, ''))}">
        <b>${esc(j.telefon)}</b><span>${esc(j.ish_vaqti || 'Qo‘ng‘iroq qiling')}</span></a>`);
    }
    if (j.konsultant) {
      qism.push(`<a class="aloqa-karta" href="https://t.me/${esc(j.konsultant)}"
        target="_blank" rel="noopener">
        <b>@${esc(j.konsultant)}</b><span>Telegramda yozing</span></a>`);
    }
    if (j.instagram) {
      qism.push(`<a class="aloqa-karta" href="https://instagram.com/${esc(j.instagram)}"
        target="_blank" rel="noopener">
        <b>@${esc(j.instagram)}</b><span>Instagram sahifamiz</span></a>`);
    }
    // Bot kartasi HTML da allaqachon bor — u har doim turadi
    if (qism.length) el.insertAdjacentHTML('afterbegin', qism.join(''));
  }

  /* ── Ekranga kirganda jonlanish ──
   *
   * `IntersectionObserver` asosiy yo'l: brauzer elementni o'zi
   * kuzatadi va biz har sirilishda hisob-kitob qilmaymiz.
   *
   * Lekin u YETARLI EMAS. Tez sirilganda yoki sahifa fonda
   * turganda hodisa yetib kelmay qolishi mumkin va element
   * BUTUNLAY ko'rinmay qoladi — sahifada bo'sh joy qoladi.
   * Reklama sahifasi uchun bu falokat: odam mahsulotni umuman
   * ko'rmaydi. Shuning uchun sirilishda ham yengil tekshiruv
   * yuradi va qolib ketganini ochadi. Hammasi ochilgach tinglovchi
   * o'chadi, ya'ni doimiy yuk yo'q.
   */
  const kutayotgan = new Set();

  const koching = (el) => {
    el.classList.add('kordi');
    kutayotgan.delete(el);
    if (KUZATUVCHI) KUZATUVCHI.unobserve(el);
    if (!kutayotgan.size) window.removeEventListener('scroll', surilganda);
  };

  const KUZATUVCHI = 'IntersectionObserver' in window
    ? new IntersectionObserver((yozuvlar) => {
        yozuvlar.forEach((y) => { if (y.isIntersecting) koching(y.target); });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' })
    : null;

  /* Tekshiruv ENG PASTKI nuqtaga nisbatan yuritiladi, hozirgi
   * joyga emas. Sahifa tepasiga qaytilsa ham bir marta o'tib
   * ketilgan element ochiq qoladi — aks holda «yuqoriga» tugmasi
   * yoki langar havola sakrab o'tganda blok butunlay ko'rinmay
   * qolardi: brauzer bitta kadr ichida bo'lgan o'tishni umuman
   * sezmaydi. */
  let engPast = 0;
  let rejalashtirilgan = false;
  function surilganda() {
    engPast = Math.max(engPast, window.scrollY || 0);
    if (rejalashtirilgan) return;
    rejalashtirilgan = true;
    requestAnimationFrame(() => {
      rejalashtirilgan = false;
      engPast = Math.max(engPast, window.scrollY || 0);
      const chegara = engPast + window.innerHeight * 0.94;
      [...kutayotgan].forEach((el) => {
        const tepa = el.getBoundingClientRect().top + (window.scrollY || 0);
        if (tepa < chegara) koching(el);
      });
    });
  }

  function kuzat(elementlar) {
    [...elementlar].forEach((el) => {
      el.classList.add('jon');
      kutayotgan.add(el);
      if (KUZATUVCHI) KUZATUVCHI.observe(el);
    });
    if (kutayotgan.size) {
      window.addEventListener('scroll', surilganda, { passive: true });
      window.addEventListener('resize', surilganda, { passive: true });
      surilganda();                 // birinchi ekrandagilar darrov
      // Rasmlar yuklangach balandliklar o'zgaradi va birinchi
      // hisob eskirib qoladi — yana bir marta tekshiramiz
      window.addEventListener('load', surilganda, { once: true });
      setTimeout(surilganda, 1200);
    }
  }

  // Qahramon CSS bilan o'zi jonlanadi (JS ni kutmaydi), qolgani
  // ekranga kirganda
  // `:not(.qahramon .jon)` ni ishlatmaymiz — murakkab `:not()` eski
  // brauzerlarda butun selektorni yaroqsiz qiladi va U PAYT hech
  // narsa ochilmasdi
  kuzat([...document.querySelectorAll('.jon')]
    .filter((el) => !el.closest('.qahramon')));

  /* Bot havolasi.
   *
   * HTML da tugmalar `/app/ochish` ga qaraydi va server ularni
   * Telegramga yo'naltiradi — ya'ni JS o'chiq bo'lsa ham ishlaydi.
   * Havola ma'lum bo'lsa uni to'g'ridan-to'g'ri qo'yamiz: bitta
   * qayta yo'naltirish kam bo'ladi va odam bosishdan oldin manzilni
   * ko'radi. */
  function botniUla(havola) {
    if (!havola) return;
    document.querySelectorAll('[data-bot]').forEach((a) => {
      a.href = havola;
      a.rel = 'noopener';
    });
  }

  /* ── Ekranga o'rnatish ──
   *
   * Android/Chrome `beforeinstallprompt` beradi — tugma shunda
   * paydo bo'ladi. iOS bunday hodisani umuman bermaydi, shuning
   * uchun u yerda qo'lda qilinadigan yo'l yozib qo'yilgan (HTML da).
   * Ilova allaqachon o'rnatilgan bo'lsa butun blok yashiriladi. */
  const tugma = $('#ornat');
  let taklif = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    taklif = e;
    if (tugma) tugma.hidden = false;
  });

  if (tugma) {
    tugma.addEventListener('click', async () => {
      if (!taklif) return;
      tugma.disabled = true;
      taklif.prompt();
      await taklif.userChoice.catch(() => {});
      taklif = null;
      tugma.hidden = true;
      tugma.disabled = false;
    });
  }

  window.addEventListener('appinstalled', () => { ornatilgan(); });
  if (window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone) ornatilgan();

  function ornatilgan() {
    const karta = $('#ornat-karta');
    if (karta) karta.hidden = true;
  }
})();
