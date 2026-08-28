// EMU tarif kartasidagi raqamlar kodda to'g'ri qaytadimi.
// PDF: "Express Mail Universal" MCHJ, EMU Tarif Kartasi, Avgust 2025.
import { zona, masofaTuri, emuNarxi, MARKAZLAR } from '../src/lib/emu-tarif.js';
import { VILOYATLAR, tumanlar } from '../src/lib/hududlar.js';

let ok = 0, xato = 0;
const test = (n, c, i = '') => {
  c ? (console.log(`  ✓ ${n}${i ? ' — ' + i : ''}`), ok++)
    : (console.log(`  ✗ ${n}${i ? ' — ' + i : ''}`), xato++);
};

console.log('\n── ZONALAR (PDF matritsasi) ──');
// Toshkent sh. qatori: 4 2 3 2 3 3 2 2 3 1 1 2 4 0
for (const [v, kutilgan] of [
  ['Toshkent shahri', 0], ['Toshkent viloyati', 1], ['Sirdaryo viloyati', 1],
  ['Andijon viloyati', 2], ['Jizzax viloyati', 2], ['Namangan viloyati', 2],
  ['Samarqand viloyati', 2], ["Farg'ona viloyati", 2],
  ['Buxoro viloyati', 3], ['Qashqadaryo viloyati', 3], ['Navoiy viloyati', 3],
  ['Surxondaryo viloyati', 3],
  ["Qoraqalpog'iston Respublikasi", 4], ['Xorazm viloyati', 4],
]) {
  const z = zona('Toshkent shahri', v);
  test(`Toshkent → ${v}`, z === kutilgan, `zona ${z}`);
}
test('matritsa simmetrik emas (PDF shunday)',
  zona("Qoraqalpog'iston Respublikasi", 'Xorazm viloyati') === 2 &&
  zona('Xorazm viloyati', "Qoraqalpog'iston Respublikasi") === 1,
  `Qrq→Xrz ${zona("Qoraqalpog'iston Respublikasi", 'Xorazm viloyati')}, teskari ${zona('Xorazm viloyati', "Qoraqalpog'iston Respublikasi")}`);
test('noma’lum viloyat → eng uzoq zona', zona('Toshkent shahri', 'Boshqa joy') === 4);

console.log('\n── MASOFA TURI ──');
test('viloyat markazi → shahar',
  masofaTuri('Samarqand viloyati', 'Samarqand') === 'shahar');
test('markaz tumani ham shahar',
  masofaTuri('Samarqand viloyati', 'Samarqand tumani') === 'shahar');
test('Toshkent sh. hamma tumani shahar',
  masofaTuri('Toshkent shahri', 'Chilonzor tumani') === 'shahar');
test('oddiy tuman → uzoq',
  masofaTuri('Samarqand viloyati', 'Urgut tumani') === 'uzoq');
test('sozlangan yaqin tuman → yaqin',
  masofaTuri('Samarqand viloyati', 'Tayloq tumani', ['Tayloq tumani']) === 'yaqin');

console.log('\n── OFISGACHA TARIFI (PDF 2-sahifa) ──');
// Shahar (1 kg): 22000 25000 27000 29000 33000
for (let z = 0; z <= 4; z++) {
  const kutilgan = [22000, 25000, 27000, 29000, 33000][z];
  const n = emuNarxi({ turi: 'ofis', zona: z, masofa: 'shahar', kg: 1 });
  test(`shahar 1 kg, ${z}-zona`, n === kutilgan, `${n}`);
}
// < 40 km (1 kg): 26000 29000 31000 33000 37000
for (let z = 0; z <= 4; z++) {
  const kutilgan = [26000, 29000, 31000, 33000, 37000][z];
  const n = emuNarxi({ turi: 'ofis', zona: z, masofa: 'yaqin', kg: 1 });
  test(`<40 km 1 kg, ${z}-zona`, n === kutilgan, `${n}`);
}
// > 40 km (1 kg): 32000 35000 37000 39000 43000
for (let z = 0; z <= 4; z++) {
  const kutilgan = [32000, 35000, 37000, 39000, 43000][z];
  const n = emuNarxi({ turi: 'ofis', zona: z, masofa: 'uzoq', kg: 1 });
  test(`>40 km 1 kg, ${z}-zona`, n === kutilgan, `${n}`);
}

console.log('\n── UYGACHA TARIFI (PDF 3-sahifa) ──');
for (let z = 0; z <= 4; z++) {
  const kutilgan = [32000, 45000, 47000, 49000, 53000][z];
  const n = emuNarxi({ turi: 'uy', zona: z, masofa: 'shahar', kg: 1 });
  test(`uygacha shahar 1 kg, ${z}-zona`, n === kutilgan, `${n}`);
}
for (let z = 0; z <= 4; z++) {
  const kutilgan = [47000, 60000, 62000, 64000, 68000][z];
  const n = emuNarxi({ turi: 'uy', zona: z, masofa: 'uzoq', kg: 1 });
  test(`uygacha >40 km 1 kg, ${z}-zona`, n === kutilgan, `${n}`);
}

console.log('\n── QO‘SHIMCHA KILOGRAMM ──');
// Shahar keyingi 1 kg: 3000 6000 7000 8000 9000
test('ofis shahar 3 kg, 2-zona',
  emuNarxi({ turi: 'ofis', zona: 2, masofa: 'shahar', kg: 3 }) === 27000 + 2 * 7000,
  `${emuNarxi({ turi: 'ofis', zona: 2, masofa: 'shahar', kg: 3 })} (27000 + 2×7000)`);
// Tuman keyingi 1 kg: 3500 6500 7500 8500 9500
test('ofis >40km 3 kg, 2-zona',
  emuNarxi({ turi: 'ofis', zona: 2, masofa: 'uzoq', kg: 3 }) === 37000 + 2 * 7500,
  `${emuNarxi({ turi: 'ofis', zona: 2, masofa: 'uzoq', kg: 3 })} (37000 + 2×7500)`);
test('uy >40km 2 kg, 4-zona',
  emuNarxi({ turi: 'uy', zona: 4, masofa: 'uzoq', kg: 2 }) === 68000 + 11000,
  `${emuNarxi({ turi: 'uy', zona: 4, masofa: 'uzoq', kg: 2 })}`);
// 20 kg dan keyin arzonlashadi: 2-zona uchun 6000
test('20 kg dan keyin stavka arzonlashadi',
  emuNarxi({ turi: 'ofis', zona: 2, masofa: 'shahar', kg: 22 })
    === 27000 + 19 * 7000 + 2 * 6000,
  `22 kg = ${emuNarxi({ turi: 'ofis', zona: 2, masofa: 'shahar', kg: 22 })}`);

console.log('\n── HAQIQIY MISOLLAR ──');
const misol = (viloyat, tuman, turi, kg) => {
  const z = zona('Toshkent shahri', viloyat);
  const m = masofaTuri(viloyat, tuman);
  return { narx: emuNarxi({ turi, zona: z, masofa: m, kg }), z, m };
};
for (const [v, t, turi, kg] of [
  ['Toshkent shahri', 'Chilonzor tumani', 'ofis', 1],
  ['Toshkent shahri', 'Chilonzor tumani', 'uy', 1],
  ['Samarqand viloyati', 'Samarqand', 'ofis', 1],
  ['Samarqand viloyati', 'Urgut tumani', 'uy', 1],
  ["Qoraqalpog'iston Respublikasi", 'Mo‘ynoq tumani', 'uy', 2],
]) {
  const r = misol(v, t, turi, kg);
  console.log(`  · ${v}, ${t} · ${turi} · ${kg} kg → ` +
    `${r.narx.toLocaleString('ru-RU')} so'm  (zona ${r.z}, ${r.m})`);
}

console.log('\n── MARKAZLAR HUDUDLAR RO‘YXATIDA BORMI ──');
for (const v of VILOYATLAR) {
  if (v === 'Toshkent shahri') continue;
  const m = MARKAZLAR[v];
  const t = tumanlar(v);
  test(v, Boolean(m) && (t.includes(m) || t.includes(m + ' tumani')), m || '—');
}

console.log(`\n${xato ? '❌' : '✅'}  ${ok} o'tdi, ${xato} yiqildi\n`);
process.exit(xato ? 1 : 0);
