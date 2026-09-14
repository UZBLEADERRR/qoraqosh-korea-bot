// Kartochka shabloni KO'RINISHI — admin tasdiqlashdan oldin ochadigan
// sahifa.
//
// Admin yordamchisi (AI) kartochkaning SVG shablonini yozadi, bu
// sahifa esa uni namuna ma'lumot bilan chizib ko'rsatadi. Admin
// ko'radi, yoqmasa yordamchiga «bunday qil» deb aytadi, yoqsa shu
// sahifadagi tugma bilan tasdiqlaydi.
//
// Havola IMZOLANADI: tasdiqlanmagan qoralama havolasi tarqalib
// ketmasin va begona odam tasdiqlay olmasin.
import crypto from 'node:crypto';
import { config } from '../config.js';

export function shablonImzosi(versiya) {
  return crypto.createHmac('sha256', config.adminSecret)
    .update(`shablon:${versiya}`).digest('hex').slice(0, 24);
}

export function shablonImzoTogrimi(versiya, imzo) {
  const kutilgan = shablonImzosi(versiya);
  const a = Buffer.from(String(imzo || ''));
  const b = Buffer.from(kutilgan);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const shablonHavolasi = (versiya) => (config.publicUrl
  ? `${config.publicUrl}/kartochka/${versiya}?i=${shablonImzosi(versiya)}` : null);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Ko'rinish sahifasi.
 *
 * @param {object} d
 * @param {string} d.png      base64 PNG (chizilgan kartochka)
 * @param {string} d.holat    'qoralama' | 'tasdiq'
 * @param {string[]} d.ogoh   tekshiruv ogohlantirishlari
 * @param {string} d.izoh     yordamchining izohi
 */
export function shablonSahifasi({ png, holat, ogoh = [], izoh = '', versiya, imzo,
                                  xato = '', svg = '' }) {
  const tasdiqlangan = holat === 'tasdiq';
  return `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Natija kartochkasi — ko‘rinish</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0b0b0d;color:#f2f2f4;
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    padding:0 16px 40px}
  .ichki{max-width:640px;margin:0 auto}
  header{padding:22px 0 14px}
  h1{margin:0;font-size:21px;letter-spacing:-.02em}
  .holat{display:inline-flex;align-items:center;gap:7px;margin-top:8px;
    padding:6px 12px;border-radius:99px;font-size:12.5px;font-weight:700}
  .holat.q{background:#3a2a10;color:#f0b429}
  .holat.t{background:#102a1c;color:#3dd68c}
  .karta{background:#141417;border:1px solid #26262c;border-radius:16px;
    padding:14px;margin:0 0 14px}
  .karta img{width:100%;display:block;border-radius:10px}
  .izoh{font-size:14px;line-height:1.6;color:#9a9aa6;margin:0 0 14px}
  .ogoh{background:#3a2a10;border:1px solid #6b4d16;color:#f0d9a0;
    border-radius:12px;padding:12px 14px;font-size:13.5px;margin:0 0 14px}
  .ogoh ul{margin:6px 0 0;padding-left:18px}
  .xato{background:#2a1414;border:1px solid #6b2626;color:#ffb9b0;
    border-radius:12px;padding:14px;font-size:14px;margin:0 0 14px}
  button{width:100%;padding:16px;border:0;border-radius:14px;font-size:16px;
    font-weight:700;cursor:pointer;background:#3dd68c;color:#06180f}
  button:disabled{opacity:.5;cursor:default}
  .ikkilamchi{background:transparent;color:#f2f2f4;border:1px solid #26262c;margin-top:9px}
  .natija{margin-top:12px;font-size:14px;text-align:center}
  details{margin-top:14px}
  summary{cursor:pointer;color:#9a9aa6;font-size:13.5px}
  pre{background:#141417;border:1px solid #26262c;border-radius:12px;padding:12px;
    overflow:auto;font-size:12px;line-height:1.5;max-height:340px;color:#c9c9d2}
</style></head><body><div class="ichki">
<header>
  <h1>Natija kartochkasi</h1>
  <span class="holat ${tasdiqlangan ? 't' : 'q'}">
    ${tasdiqlangan ? 'Tasdiqlangan — mijozlarga shu boradi' : 'Qoralama — hali ishlatilmayapti'}</span>
</header>

${xato ? `<div class="xato"><b>Chizib bo‘lmadi</b><br>${esc(xato)}</div>` : ''}
${izoh ? `<p class="izoh">${esc(izoh)}</p>` : ''}
${ogoh.length ? `<div class="ogoh"><b>E’tibor bering</b><ul>${
  ogoh.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}

${png ? `<div class="karta"><img src="data:image/png;base64,${png}" alt="Kartochka"></div>` : ''}

${xato ? '' : `<button id="t" ${tasdiqlangan ? 'disabled' : ''}>
  ${tasdiqlangan ? 'Allaqachon tasdiqlangan' : 'Tasdiqlash — mijozlarga shu ketsin'}</button>`}
<button class="ikkilamchi" onclick="location.reload()">Yangilash</button>
<div class="natija" id="n"></div>

<details><summary>Shablon kodi</summary><pre>${esc(svg)}</pre></details>

<script>
document.getElementById('t')?.addEventListener('click', async (e) => {
  const b = e.currentTarget; b.disabled = true; b.textContent = 'Saqlanmoqda…';
  try {
    const r = await fetch(location.pathname + '/tasdiq' + location.search, { method: 'POST' });
    const j = await r.json();
    document.getElementById('n').textContent = r.ok
      ? '✅ Tasdiqlandi — endi mijozlarga shu kartochka boradi'
      : (j.error || 'Saqlanmadi');
    if (r.ok) { b.textContent = 'Tasdiqlangan'; }
    else { b.disabled = false; b.textContent = 'Qayta urinish'; }
  } catch {
    document.getElementById('n').textContent = 'Tarmoq xatosi';
    b.disabled = false; b.textContent = 'Qayta urinish';
  }
});
</script>
</div></body></html>`;
}
