// Ikonlar — bitta uslub: 24×24 to'r, 1.5px chiziq, yumaloq uchlar, to'ldirishsiz.
//
// Nega emoji emas: emoji har telefonda BOSHQACHA chiziladi (Samsung, iOS,
// Telegram Desktop — uchtasi uch xil), rangni olmaydi va o'lchamda
// sakraydi. Shu sababli ilova arzon ko'rinardi. SVG esa rangni
// currentColor dan oladi va har joyda bir xil.
//
// Qo'shish: pastdagi ro'yxatga bitta qator — nomi va yo'llari.

(() => {
'use strict';

const YOL = {
  dokon:      '<path d="M5.5 8h13l1 12H4.5z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  skaner:     '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5"/><path d="M20 8.5V6a2 2 0 0 0-2-2h-2.5"/><path d="M4 15.5V18a2 2 0 0 0 2 2h2.5"/><path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5"/><circle cx="12" cy="12" r="3.2"/>',
  savat:      '<path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M8.5 7 12 3l3.5 4"/>',
  profil:     '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.7-3.6 3.6-5.6 7-5.6s6.3 2 7 5.6"/>',
  qidiruv:    '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 20 20"/>',
  filtr:      '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.1"/><circle cx="10" cy="17" r="2.1"/>',
  yurak:      '<path d="M12 20.5s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8.7a3.9 3.9 0 0 1 7 2.6c0 4.8-7 9.2-7 9.2z"/>',
  kamera:     '<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.4-2h6.2l1.4 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.4"/>',
  quyosh:     '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"/>',
  selfi:      '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 5.5h3"/><circle cx="12" cy="13" r="3"/>',
  koz:        '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  tozalik:    '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z"/><path d="M18.5 16.5l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z"/>',
  tomchi:     '<path d="M12 3.5c3.4 2.7 5.5 5.3 5.5 8.4a5.5 5.5 0 1 1-11 0c0-3.1 2.1-5.7 5.5-8.4z"/>',
  qalqon:     '<path d="M12 3.5 19 6.5v5c0 4.4-2.9 8.3-7 9.5-4.1-1.2-7-5.1-7-9.5v-5z"/>',
  barg:       '<path d="M12 20c-4 0-7-2.6-7-6.4C5 9 8.5 5.5 12 4c3.5 1.5 7 5 7 9.6 0 3.8-3 6.4-7 6.4z"/><path d="M12 20V9.5"/>',
  soat:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  joy:        '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
  yetkazish:  '<rect x="2.5" y="7" width="13" height="10" rx="2"/><path d="M15.5 10.5h3.2l2.8 3.2V17h-6z"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/>',
  quti:       '<path d="M3.5 8 12 4l8.5 4-8.5 4z"/><path d="M3.5 8v8l8.5 4 8.5-4V8"/><path d="M12 12v8"/>',
  karta:      '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.5h18"/>',
  ogoh:       '<path d="M12 8.5v4.5"/><path d="M12 16.5h.01"/><circle cx="12" cy="12" r="8.5"/>',
  tasdiq:     '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.5 2.5 4.7-5"/>',
  keyingi:    '<path d="M9 5l7 7-7 7"/>',
  orqaga:     '<path d="M15 5l-7 7 7 7"/>',
  yopish:     '<path d="M6 6l12 12M18 6 6 18"/>',
  plyus:      '<path d="M12 5v14M5 12h14"/>',
  minus:      '<path d="M5 12h14"/>',
  ochirish:   '<path d="M6 7.5h12"/><path d="M9.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 6v1.5"/><path d="M7.6 7.5l.8 11.4a1.6 1.6 0 0 0 1.6 1.6h4a1.6 1.6 0 0 0 1.6-1.6l.8-11.4"/>',
  tahrir:     '<path d="m14.6 5.4 4 4L9 19H5v-4z"/><path d="M13 7 17 11"/>',
  yuklab:     '<path d="M12 4v11"/><path d="M8 11.5 12 15.5l4-4"/><path d="M5 19h14"/>',
  suhbat:     '<path d="M4.5 5.5h15v10h-9l-4 3.5z"/>',
  yuborish:   '<path d="M20.5 3.5 3.5 10.2l6.6 2.6 2.6 6.6z"/><path d="M10.1 12.8 20.5 3.5"/>',
  yordam:     '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.3"/><path d="M12 16.8h.01"/>',
  hujjat:     '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
  telefon:    '<path d="M6.5 4h3l1.5 4-2 1.4a11 11 0 0 0 5.6 5.6L16 13l4 1.5v3a2 2 0 0 1-2.2 2C10.6 18.8 5.2 13.4 4.5 6.2A2 2 0 0 1 6.5 4z"/>',
  mobil:      '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  uy:         '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5v-6h5v6"/>',
  tuman:      '<path d="M3.5 20.5V9l6-4 6 4v11.5"/><path d="M15.5 12.5h5v8"/><path d="M7 12h2M7 16h2"/>',
  tugilgan:   '<path d="M4.5 12.5h15v7a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M6.5 12.5V9h11v3.5"/><path d="M12 9V6"/><path d="M12 3.5c1 .8 1.2 1.8 0 2.5-1.2-.7-1-1.7 0-2.5z"/>',
  qulf:       '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  sovga:      '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V13"/><path d="M12 9v12"/><path d="M12 9C10 9 8 8.5 8 6.8 8 5.5 9 4.6 10.2 5 11.2 5.3 12 7 12 9zM12 9c2 0 4-.5 4-2.2 0-1.3-1-2.2-2.2-1.8C12.8 5.3 12 7 12 9z"/>',
  pul:        '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.6 0-2.6.8-2.6 1.9 0 2.7 5.4 1.3 5.4 4.1 0 1.2-1.1 2-2.8 2-1.2 0-2.2-.5-2.7-1.3"/><path d="M12 6.4v11.2"/>',
  tibbiy:     '<path d="M12 3.5v17"/><path d="M8.5 7h7"/><path d="M9 20.5h6"/><circle cx="12" cy="12" r="3"/>',
  robot:      '<rect x="4.5" y="7.5" width="15" height="12" rx="3"/><path d="M12 7.5V4.5"/><circle cx="12" cy="3.5" r="1.2"/><path d="M9 12.5v2M15 12.5v2"/>',
  brend:      '<path d="M12 4.5c1.9 0 3 1.4 3 3s-1.1 3-3 3-3-1.4-3-3 1.1-3 3-3z"/><path d="M17.6 8.6c1.5 1.1 1.7 2.9.8 4.2-.9 1.2-2.7 1.5-4.2.4"/><path d="M15.5 15.2c.6 1.8-.2 3.4-1.7 3.9-1.5.5-3-.4-3.6-2.2"/><path d="M9.8 16.9c-1.5 1.1-3.3.8-4.2-.4-.9-1.3-.7-3.1.8-4.2"/><path d="M6.4 8.6C7.9 7.5 9.7 7.8 10.6 9c.9 1.3.7 3.1-.8 4.2"/>',
  ichki:      '<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.6 9.6 14.4 14.4"/>',
  shisha:     '<path d="M10 3.5h4v3.2l2.5 3.4V20a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20V10.1L10 6.7z"/><path d="M7.5 13h9"/>',
  pipetka:    '<path d="M13.5 4.5 19.5 10.5"/><path d="M16.5 1.5 22.5 7.5"/><path d="M15.5 6.5 6 16v2H4v2h2v-2l10-9.5"/><path d="M4.5 20.5h5"/>',
  niqob:      '<path d="M4.5 7.5c2.5-1 4.8-1.5 7.5-1.5s5 .5 7.5 1.5v4c0 4.4-3.2 8.2-7.5 9-4.3-.8-7.5-4.6-7.5-9z"/><path d="M9 12.5h.01M15 12.5h.01"/>',
  qongiroq:   '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z"/><path d="M10.2 19a2 2 0 0 0 3.6 0"/>',
  pastga:     '<path d="M6 9.5 12 15.5l6-6"/>',
  almash:     '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  ornatish:   '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7.5v6.5M9.2 11.2 12 14l2.8-2.8"/>',
  rasm:       '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4.5 16.5 9 12.5l3.5 3 3-2.5 4 4"/>',
  savol:      '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4"/><path d="M12 17.2v.01"/>',
  chiqish:    '<path d="M14 8V5.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V16"/><path d="M10 12h10l-3-3M20 12l-3 3"/>',
    yulduz:     '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z"/>',
};

/**
 * Ikon SVG matni.
 * @param {string} nom     YOL dagi kalit
 * @param {number} [olcham] px
 * @param {number} [qalin]  chiziq qalinligi
 */
function ik(nom, olcham = 20, qalin = 1.5) {
  const yol = YOL[nom];
  if (!yol) return '';
  return `<svg class="ik" width="${olcham}" height="${olcham}" viewBox="0 0 24 24"`
       + ` fill="none" stroke="currentColor" stroke-width="${qalin}"`
       + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${yol}</svg>`;
}

/** HTML dagi <i data-ik="nom"> larni to'ldiradi (statik razmetka uchun). */
function ikonlarniChiz(ildiz = document) {
  ildiz.querySelectorAll('[data-ik]').forEach((el) => {
    if (el.dataset.ikTayyor) return;
    el.innerHTML = ik(el.dataset.ik, Number(el.dataset.ikOlcham) || 20);
    el.dataset.ikTayyor = '1';
  });
}

// Global: app.js IIFE ichidan shu orqali oladi
window.IK = { ik, ikonlarniChiz, nomlar: Object.keys(YOL) };
})();
