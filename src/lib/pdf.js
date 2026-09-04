// Kutubxonasiz PDF: har sahifa — bitta to'la sahifali rasm.
//
// Nega shunday. Mijozga boradigan qo'llanmada MAHSULOT RASMI bo'lishi
// kerak — odam qutidagi qaysi flakon ekanini ko'rib turishi shart.
// Matnli PDF yozish uchun esa shriftni ichkariga joylash, CMap va glif
// jadvallarini qo'lda qurish kerak bo'lardi — o'zbekcha «oʻ», «gʻ»
// belgilarida u eng tez sinadigan joy.
//
// Shuning uchun sahifani ALLAQACHON bor SVG → PNG quvuri chizadi
// (resvg, shriftlar assets/shrift dan) va bu yerda PNG lar PDF ga
// o'raladi. Dizayn ilovadagi bilan bir xil chiqadi, shrift muammosi
// umuman yo'q, mahsulot suratlari o'z joyida turadi.
import zlib from 'node:zlib';

const A4_ENI  = 595.28;      // punkt
const A4_BOYI = 841.89;

/**
 * PNG ni xom RGB ga ochadi.
 *
 * PDF FlateDecode oqimida PNG ning qator boshidagi «filtr» bayti
 * bo'lmasligi kerak, shuning uchun uni o'zimiz yechamiz.
 * resvg 8-bitli RGBA (colorType 6) beradi; RGB (2) ham qabul qilinadi.
 */
export function pngdanRgb(png) {
  if (png.length < 8 || png.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('PNG emas');
  }
  let eni = 0, boyi = 0, rang = 6, bit = 8, interleys = 0;
  const idat = [];

  for (let p = 8; p + 8 <= png.length;) {
    const uzunlik = png.readUInt32BE(p);
    const nom = png.toString('latin1', p + 4, p + 8);
    const tana = png.subarray(p + 8, p + 8 + uzunlik);
    if (nom === 'IHDR') {
      eni = tana.readUInt32BE(0); boyi = tana.readUInt32BE(4);
      bit = tana[8]; rang = tana[9]; interleys = tana[12];
    } else if (nom === 'IDAT') idat.push(tana);
    else if (nom === 'IEND') break;
    p += 12 + uzunlik;                     // uzunlik + nom + tana + crc
  }
  if (bit !== 8 || interleys !== 0 || (rang !== 6 && rang !== 2)) {
    throw new Error(`PNG turi qo‘llanmaydi (bit=${bit} rang=${rang})`);
  }

  const kanal = rang === 6 ? 4 : 3;
  const xom = zlib.inflateSync(Buffer.concat(idat));
  const qatorBayt = eni * kanal;
  const chiqish = Buffer.allocUnsafe(eni * boyi * 3);
  const oldingi = Buffer.alloc(qatorBayt);
  const joriy = Buffer.allocUnsafe(qatorBayt);

  for (let y = 0, o = 0, c = 0; y < boyi; y++) {
    const filtr = xom[o++];
    xom.copy(joriy, 0, o, o + qatorBayt);
    o += qatorBayt;

    // PNG filtrlari — spetsifikatsiyadagi tartibda
    for (let i = 0; i < qatorBayt; i++) {
      const a = i >= kanal ? joriy[i - kanal] : 0;   // chapdagi
      const b = oldingi[i];                          // yuqoridagi
      const c2 = i >= kanal ? oldingi[i - kanal] : 0; // chap-yuqori
      let v = joriy[i];
      if (filtr === 1) v += a;
      else if (filtr === 2) v += b;
      else if (filtr === 3) v += (a + b) >> 1;
      else if (filtr === 4) {
        const p2 = a + b - c2;
        const pa = Math.abs(p2 - a), pb = Math.abs(p2 - b), pc = Math.abs(p2 - c2);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c2);
      }
      joriy[i] = v & 0xff;
    }
    joriy.copy(oldingi);

    // Alfa oq fonga qo'shiladi: PDF da alfa alohida maska talab qiladi,
    // qo'llanmada esa shaffoflik kerak emas.
    for (let xx = 0; xx < eni; xx++) {
      const s = xx * kanal;
      if (kanal === 3) {
        chiqish[c++] = joriy[s]; chiqish[c++] = joriy[s + 1]; chiqish[c++] = joriy[s + 2];
      } else {
        const al = joriy[s + 3] / 255;
        chiqish[c++] = Math.round(joriy[s]     * al + 255 * (1 - al));
        chiqish[c++] = Math.round(joriy[s + 1] * al + 255 * (1 - al));
        chiqish[c++] = Math.round(joriy[s + 2] * al + 255 * (1 - al));
      }
    }
  }
  return { eni, boyi, rgb: chiqish };
}

/**
 * PNG sahifalardan PDF yig'adi.
 *
 * @param {Buffer[]} sahifalar  har biri bitta sahifa (PNG)
 * @returns {Buffer}
 */
export function pdfRasmlardan(sahifalar) {
  if (!sahifalar.length) throw new Error('Sahifa yo‘q');

  const obyektlar = [];                    // 1-dan boshlanadi
  const qosh = (tana) => { obyektlar.push(tana); return obyektlar.length; };

  // 1 — katalog, 2 — sahifalar ro'yxati. Ikkalasi ham keyin to'ldiriladi.
  qosh(null); qosh(null);

  const sahifaIdlar = [];
  for (const png of sahifalar) {
    const { eni, boyi, rgb } = pngdanRgb(png);
    const siqilgan = zlib.deflateSync(rgb, { level: 9 });

    const rasmId = qosh(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${eni} /Height ${boyi}`
        + ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode`
        + ` /Length ${siqilgan.length} >>\nstream\n`),
      siqilgan, Buffer.from('\nendstream'),
    ]));

    // Sahifa A4, rasm nisbatini saqlab markazga joylanadi
    const olcham = Math.min(A4_ENI / eni, A4_BOYI / boyi);
    const rEni = eni * olcham, rBoyi = boyi * olcham;
    const chapga = (A4_ENI - rEni) / 2, pastdan = (A4_BOYI - rBoyi) / 2;
    const oqim = `q ${rEni.toFixed(2)} 0 0 ${rBoyi.toFixed(2)} `
      + `${chapga.toFixed(2)} ${pastdan.toFixed(2)} cm /Im0 Do Q`;
    const oqimId = qosh(Buffer.from(
      `<< /Length ${Buffer.byteLength(oqim)} >>\nstream\n${oqim}\nendstream`));

    sahifaIdlar.push(qosh(Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_ENI} ${A4_BOYI}]`
      + ` /Resources << /XObject << /Im0 ${rasmId} 0 R >> >>`
      + ` /Contents ${oqimId} 0 R >>`)));
  }

  obyektlar[0] = Buffer.from('<< /Type /Catalog /Pages 2 0 R >>');
  obyektlar[1] = Buffer.from(`<< /Type /Pages /Kids [${
    sahifaIdlar.map((id) => `${id} 0 R`).join(' ')}] /Count ${sahifaIdlar.length} >>`);

  const bolaklar = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let joy = bolaklar[0].length;
  const oriflar = [];
  obyektlar.forEach((tana, i) => {
    oriflar.push(joy);
    const bosh = Buffer.from(`${i + 1} 0 obj\n`);
    const oxir = Buffer.from('\nendobj\n');
    bolaklar.push(bosh, tana, oxir);
    joy += bosh.length + tana.length + oxir.length;
  });

  // xref jadvali: har yozuv ANIQ 20 bayt bo'lishi shart
  const xref = [`xref\n0 ${obyektlar.length + 1}\n`, '0000000000 65535 f \n'];
  for (const o of oriflar) xref.push(`${String(o).padStart(10, '0')} 00000 n \n`);
  bolaklar.push(Buffer.from(xref.join('')));
  bolaklar.push(Buffer.from(
    `trailer\n<< /Size ${obyektlar.length + 1} /Root 1 0 R >>\nstartxref\n${joy}\n%%EOF\n`));

  return Buffer.concat(bolaklar);
}
