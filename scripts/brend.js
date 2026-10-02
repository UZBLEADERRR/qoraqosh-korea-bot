// Brend fayllarini logotipning YAGONA manbasidan (src/lib/logo.js) yasaydi:
//
//   public/umumiy/logo*.svg, belgi*.svg  — sahifalar ishlatadigan vektorlar
//   public/favicon.svg                   — brauzer yorlig'i (faqat tabassum)
//   public/app/ikon-*.png                — PWA ikonkalari
//   android/app/src/main/res/…           — Android ikonkasi va splash
//   store/ikon-512.png                   — Google Play uchun ikonka
//
// Ishga tushirish:  node scripts/brend.js
// Logotip o'zgarsa SHU skript qayta ishga tushiriladi — fayllarni qo'lda
// tahrirlash kerak emas. Sinov (test/operatsiya.mjs) fayllar manbadan
// yasalganini tekshiradi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { logoSvg, BREND } from '../src/lib/logo.js';

const ILDIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const yoz = (nisbiy, mazmun) => {
  const p = path.join(ILDIZ, nisbiy);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, mazmun);
  return nisbiy;
};
const png = (svg, eni) => new Resvg(svg, { fitTo: { mode: 'width', value: eni } }).render().asPng();

/* Ulushlar — logotip kvadratning qancha kengligini egallaydi.
 *
 * Oddiy ikonka 0.72: asl rasmdagi nisbat.
 * Maskable 0.62: Android ikonkani doira, kvadrat yoki «tomchi» shaklida
 *   kesadi. Xavfsiz hudud — markazdan 40% radius. Logotipning eng uzoq
 *   nuqtasi (K harfining pastki burchagi) shu hududda qolishi kerak.
 * Adaptive 0.54: Android 8+ ikonkasi 108dp, ko'rinadigan qismi esa
 *   markazdagi 66dp doira — yon tomonlari harakat effekti uchun kesiladi. */
const ULUSH = { oddiy: 0.72, maska: 0.62, adaptiv: 0.54 };

export const FAYLLAR = {
  // Vektorlar
  'public/umumiy/logo.svg':        () => logoSvg({ rang: BREND.lime }),
  'public/umumiy/logo-qizil.svg':  () => logoSvg({ rang: BREND.qizil }),
  'public/umumiy/belgi.svg':       () => logoSvg({ tur: 'belgi', rang: BREND.lime }),
  'public/umumiy/belgi-qizil.svg': () => logoSvg({ tur: 'belgi', rang: BREND.qizil }),
  // Kichik o'lchamda «KiOVO» yozuvi o'qilmaydi — yorliqda faqat tabassum
  'public/favicon.svg': () => logoSvg({ tur: 'belgi', rang: BREND.lime, fon: BREND.qizil,
                                        burchak: 0.22, ulush: 0.7 }),
};

const kvadrat = (ulush, { burchak = 0 } = {}) =>
  logoSvg({ rang: BREND.lime, fon: BREND.qizil, ulush, burchak });
const shaffof = (ulush) => logoSvg({ rang: BREND.lime, ulush });

export const RASMLAR = [
  // PWA. Burchak YO'Q: telefon o'zi yumaloqlaydi, aks holda ikki
  // marta yumaloqlangan, burchagida oq chiziq qolgan ikonka chiqadi.
  ['public/app/ikon-192.png', () => kvadrat(ULUSH.oddiy), 192],
  ['public/app/ikon-512.png', () => kvadrat(ULUSH.oddiy), 512],
  ['public/app/ikon-maska.png', () => kvadrat(ULUSH.maska), 512],
  // iPhone bosh ekrani
  ['public/app/ikon-180.png', () => kvadrat(ULUSH.oddiy), 180],
  // Google Play: 512×512, burchaksiz — Play o'zi yumaloqlaydi
  ['store/ikon-512.png', () => kvadrat(ULUSH.oddiy), 512],
];

// Android ikonkalari: zichlik → o'lcham (dp × koeffitsient)
const ZICHLIK = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const RES = 'android/app/src/main/res';
for (const [z, k] of Object.entries(ZICHLIK)) {
  // Eski Android (7 va undan past) — tayyor yumaloq kvadrat
  RASMLAR.push([`${RES}/mipmap-${z}/ic_launcher.png`, () => kvadrat(ULUSH.oddiy, { burchak: 0.18 }), 48 * k]);
  // Android 8+ — faqat oldingi qatlam, fon rangi XML da
  RASMLAR.push([`${RES}/mipmap-${z}/ic_launcher_foreground.png`, () => shaffof(ULUSH.adaptiv), 108 * k]);
}
// Ochilish ekrani: qizil fonda logotip (fon rangi colors.xml da)
RASMLAR.push([`${RES}/drawable-nodpi/splash.png`, () => shaffof(0.9), 480]);

// Bildirishnoma belgisi: Android uni FAQAT shakli bo'yicha chizadi (rang
// tizimdan) — shuning uchun oq, shaffof fonda, faqat tabassum
const oqBelgi = () => logoSvg({ tur: 'belgi', rang: '#FFFFFF', ulush: 0.86 });
RASMLAR.push(['public/app/bildirishnoma.png', oqBelgi, 96]);
for (const [z, k] of Object.entries(ZICHLIK)) {
  RASMLAR.push([`${RES}/drawable-${z}/ic_bildirishnoma.png`, oqBelgi, 24 * k]);
}

/* Yorliqlar (ikonkani bosib turganda chiqadigan menyu): Skaner, Savat,
 * Buyurtmalarim. Belgi ilovadagi ikonlar bilan bir xil (public/app/ikon.js),
 * qizil doirada och yashil. */
const IKON_YOL = {
  skaner: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5"/><path d="M20 8.5V6a2 2 0 0 0-2-2h-2.5"/><path d="M4 15.5V18a2 2 0 0 0 2 2h2.5"/><path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5"/><circle cx="12" cy="12" r="3.2"/>',
  savat:  '<path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M8.5 7 12 3l3.5 4"/>',
  quti:   '<path d="M3.5 8 12 4l8.5 4-8.5 4z"/><path d="M3.5 8v8l8.5 4 8.5-4V8"/><path d="M12 12v8"/>',
};
export const yorliqSvg = (nom) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="24" fill="${BREND.qizil}"/>
  <g transform="translate(12 12)" fill="none" stroke="${BREND.lime}" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round">${IKON_YOL[nom]}</g></svg>`;
for (const nom of Object.keys(IKON_YOL)) {
  RASMLAR.push([`${RES}/drawable-xxxhdpi/yorliq_${nom}.png`, () => yorliqSvg(nom), 192]);
  // Brauzerdan o'rnatilgan ilova uchun ham (manifest.json → shortcuts)
  RASMLAR.push([`public/app/yorliq-${nom}.png`, () => yorliqSvg(nom), 96]);
}

export function hammasiniYasa() {
  const yasalgan = [];
  for (const [f, mazmun] of Object.entries(FAYLLAR)) yasalgan.push(yoz(f, mazmun() + '\n'));
  for (const [f, svg, eni] of RASMLAR) yasalgan.push(yoz(f, png(svg(), eni)));
  return yasalgan;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = hammasiniYasa();
  console.log(`✅ ${r.length} ta brend fayli yasaldi:`);
  r.forEach((f) => console.log('   ' + f));
}
