// Eng kichik .docx yozuvchi — tashqi kutubxonasiz.
//
// .docx bu oddiy ZIP: ichida bir nechta XML fayl. Word Unicode'ni o'zi
// biladi, shuning uchun PDF'dagi kabi shrift joylashtirish kerak emas —
// o'zbekcha "gʻoʻza" ham, ruscha ham, koreyscha ham to'g'ri chiqadi.
//
// ZIP ni "deflate" bilan yozamiz (zlib Node'da bor). Faqat kerakli
// maydonlar to'ldiriladi: Word va LibreOffice shuni kutadi.
import zlib from 'node:zlib';

// ── ZIP ───────────────────────────────────────────────────────────────────
function zip(fayllar) {
  const bolaklar = [];
  const markaz = [];
  let ofset = 0;

  for (const { nom, tana } of fayllar) {
    const nomB = Buffer.from(nom, 'utf8');
    const xom  = Buffer.isBuffer(tana) ? tana : Buffer.from(tana, 'utf8');
    const siq  = zlib.deflateRawSync(xom, { level: 9 });
    const crc  = zlib.crc32(xom) >>> 0;

    const bosh = Buffer.alloc(30);
    bosh.writeUInt32LE(0x04034b50, 0);   // imzo
    bosh.writeUInt16LE(20, 4);           // kerakli versiya
    bosh.writeUInt16LE(0x0800, 6);       // bayroq: nom UTF-8
    bosh.writeUInt16LE(8, 8);            // deflate
    bosh.writeUInt16LE(0, 10);           // vaqt
    bosh.writeUInt16LE(0x21, 12);        // sana (1980-01-01 emas, muhim emas)
    bosh.writeUInt32LE(crc, 14);
    bosh.writeUInt32LE(siq.length, 18);
    bosh.writeUInt32LE(xom.length, 22);
    bosh.writeUInt16LE(nomB.length, 26);
    bosh.writeUInt16LE(0, 28);
    bolaklar.push(bosh, nomB, siq);

    const m = Buffer.alloc(46);
    m.writeUInt32LE(0x02014b50, 0);
    m.writeUInt16LE(20, 4); m.writeUInt16LE(20, 6);
    m.writeUInt16LE(0x0800, 8); m.writeUInt16LE(8, 10);
    m.writeUInt16LE(0, 12); m.writeUInt16LE(0x21, 14);
    m.writeUInt32LE(crc, 16);
    m.writeUInt32LE(siq.length, 20);
    m.writeUInt32LE(xom.length, 24);
    m.writeUInt16LE(nomB.length, 28);
    m.writeUInt32LE(ofset, 42);
    markaz.push(Buffer.concat([m, nomB]));

    ofset += bosh.length + nomB.length + siq.length;
  }

  const m = Buffer.concat(markaz);
  const oxir = Buffer.alloc(22);
  oxir.writeUInt32LE(0x06054b50, 0);
  oxir.writeUInt16LE(fayllar.length, 8);
  oxir.writeUInt16LE(fayllar.length, 10);
  oxir.writeUInt32LE(m.length, 12);
  oxir.writeUInt32LE(ofset, 16);
  return Buffer.concat([...bolaklar, m, oxir]);
}

// ── XML ───────────────────────────────────────────────────────────────────
export const xml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const matn = (s, { qalin = false, olcham = 20, markaz = false } = {}) => {
  // olcham — yarim punktda (Word shunday o'lchaydi): 20 = 10pt
  const qatorlar = String(s ?? '').split('\n');
  const ichi = qatorlar.map((q, i) =>
    `<w:r><w:rPr>${qalin ? '<w:b/>' : ''}<w:sz w:val="${olcham}"/></w:rPr>` +
    `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(q)}</w:t></w:r>`).join('');
  return `<w:p><w:pPr>${markaz ? '<w:jc w:val="center"/>' : ''}` +
    `<w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${ichi}</w:p>`;
};

const katak = (ichi, en) =>
  `<w:tc><w:tcPr><w:tcW w:w="${en}" w:type="dxa"/>` +
  `<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>` +
  `<w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>` +
  `</w:tcPr>${ichi}</w:tc>`;

/**
 * Jadval yasaydi.
 * @param {string[]} sarlavhalar
 * @param {string[][]} satrlar
 * @param {number[]} enlar  ustun kengliklari (dxa; A4 ichi ≈ 9600)
 */
function jadval(sarlavhalar, satrlar, enlar) {
  const chegara = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((x) => `<w:${x} w:val="single" w:sz="6" w:color="999999"/>`).join('')}</w:tblBorders>`;

  const bosh = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${
    sarlavhalar.map((s, i) => katak(matn(s, { qalin: true, olcham: 18 }), enlar[i])).join('')}</w:tr>`;

  const tana = satrlar.map((r) => `<w:tr>${
    r.map((c, i) => katak(matn(c, { olcham: 18 }), enlar[i])).join('')}</w:tr>`).join('');

  // <w:tblGrid> MAJBURIY: usiz Word ham, python-docx ham jadvalni rad etadi
  // ("required <w:tblGrid> child element not present").
  const setka = `<w:tblGrid>${enlar.map((e) => `<w:gridCol w:w="${e}"/>`).join('')}</w:tblGrid>`;

  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${chegara}</w:tblPr>${setka}${bosh}${tana}</w:tbl>`;
}

/**
 * Hujjat yasaydi.
 * @param {Array} bloklar  [{tur:'sarlavha'|'matn'|'jadval'|'bosh', ...}]
 * @returns {Buffer} .docx
 */
export function docx(bloklar) {
  const tana = bloklar.map((b) => {
    if (b.tur === 'sarlavha') return matn(b.matn, { qalin: true, olcham: 32 });
    if (b.tur === 'kichik')   return matn(b.matn, { olcham: 18 });
    if (b.tur === 'matn')     return matn(b.matn, { olcham: 22 });
    if (b.tur === 'bosh')     return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
    if (b.tur === 'sahifa')   return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    if (b.tur === 'jadval')   return jadval(b.sarlavhalar, b.satrlar, b.enlar);
    return '';
  }).join('');

  const hujjat = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${tana}
<w:sectPr>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"
           w:header="0" w:footer="0" w:gutter="0"/>
</w:sectPr></w:body></w:document>`;

  return zip([
    { nom: '[Content_Types].xml', tana: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>` },
    { nom: '_rels/.rels', tana: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>` },
    // Word ham, LibreOffice ham bu faylni TALAB qiladi — bo'sh bo'lsa ham.
    // U bo'lmasa hujjat "ochib bo'lmadi" deb rad etiladi.
    { nom: 'word/_rels/document.xml.rels', tana: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>` },
    { nom: 'word/document.xml', tana: hujjat },
  ]);
}
