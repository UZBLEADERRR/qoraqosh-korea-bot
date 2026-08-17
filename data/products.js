// QoraQosh — Koreya original kosmetikasi katalogi.
// Har bir mahsulot: id, nom, brend, kategoriya, narx (so'm), teg (teri muammolari),
// emoji va gradient — mini ilovada rasm o'rnida ko'rsatiladi (CDN kerak emas).

export const KATEGORIYALAR = [
  { id: 'hammasi', nom: 'Hammasi', emoji: '✨' },
  { id: 'tozalash', nom: 'Tozalash', emoji: '🫧' },
  { id: 'toner', nom: 'Toner', emoji: '💧' },
  { id: 'serum', nom: 'Serum', emoji: '🧪' },
  { id: 'krem', nom: 'Krem', emoji: '🫙' },
  { id: 'niqob', nom: 'Niqob', emoji: '🎭' },
  { id: 'quyosh', nom: 'SPF himoya', emoji: '☀️' },
  { id: 'lab', nom: 'Lab parvarishi', emoji: '💋' },
  { id: 'aksessuar', nom: 'Aksessuar', emoji: '🧴' },
];

// Teglar — AI tahlil natijasiga qarab mahsulot tanlash uchun kalit so'zlar.
export const TEGLAR = {
  quruq: 'Quruq teri',
  yogli: "Yog'li teri",
  sezgir: 'Sezgir teri',
  husnbuzar: 'Husnbuzar',
  dog: 'Dogʻ va izlar',
  ajin: 'Ajinlar',
  quyuq: "Qo'ng'ir dog'lar",
  namlash: 'Namlash',
  tozalash: 'Chuqur tozalash',
  quyosh: 'Quyoshdan himoya',
  yallig: 'Yalligʻlanish',
  ton: 'Tenni tekislash',
};

export const MAHSULOTLAR = [
  // ---------- TOZALASH ----------
  { id: 1, nom: 'Low pH Good Morning Gel Cleanser', brend: 'COSRX', kategoriya: 'tozalash', narx: 89000, teg: ['sezgir', 'yogli', 'tozalash'], emoji: '🫧', grad: ['#1a2a3a', '#2d5a6b'] },
  { id: 2, nom: 'Green Tea Foam Cleanser', brend: 'Innisfree', kategoriya: 'tozalash', narx: 75000, teg: ['yogli', 'tozalash', 'namlash'], emoji: '🍵', grad: ['#14301f', '#2e6b45'] },
  { id: 3, nom: 'A.C Control Cleansing Foam', brend: 'Some By Mi', kategoriya: 'tozalash', narx: 82000, teg: ['husnbuzar', 'yogli', 'tozalash'], emoji: '🌿', grad: ['#1c2b1a', '#4a6b2d'] },
  { id: 4, nom: 'Super Aqua Ultra Hyaluron Cleansing Oil', brend: 'Missha', kategoriya: 'tozalash', narx: 118000, teg: ['quruq', 'tozalash', 'namlash'], emoji: '💦', grad: ['#152238', '#2d4a7a'] },
  { id: 5, nom: 'Heartleaf Pore Deep Cleansing Oil', brend: 'Anua', kategoriya: 'tozalash', narx: 135000, teg: ['husnbuzar', 'tozalash', 'sezgir'], emoji: '🖤', grad: ['#1a1a22', '#3d3d52'] },
  // ---------- TONER ----------
  { id: 6, nom: 'AHA BHA PHA 30 Days Miracle Toner', brend: 'Some By Mi', kategoriya: 'toner', narx: 125000, teg: ['husnbuzar', 'yogli', 'ton'], emoji: '🧴', grad: ['#221a2e', '#5a3d6b'] },
  { id: 7, nom: 'Green Tea Seed Skin', brend: 'Innisfree', kategoriya: 'toner', narx: 110000, teg: ['namlash', 'sezgir', 'yogli'], emoji: '🌱', grad: ['#12281a', '#3d7a4f'] },
  { id: 8, nom: 'Glow Deep Serum Toner', brend: 'Beauty of Joseon', kategoriya: 'toner', narx: 128000, teg: ['dog', 'quyuq', 'ton'], emoji: '🌾', grad: ['#2e2415', '#7a5f2d'] },
  { id: 9, nom: 'Dokdo Toner', brend: 'Round Lab', kategoriya: 'toner', narx: 119000, teg: ['sezgir', 'namlash', 'ton'], emoji: '🌊', grad: ['#12222e', '#2d5f7a'] },
  { id: 10, nom: 'Supple Preparation Facial Toner', brend: 'Klairs', kategoriya: 'toner', narx: 132000, teg: ['sezgir', 'quruq', 'namlash'], emoji: '💜', grad: ['#221a2e', '#6b3d8a'] },
  // ---------- SERUM ----------
  { id: 11, nom: 'Snail 96 Mucin Power Essence', brend: 'COSRX', kategoriya: 'serum', narx: 145000, teg: ['dog', 'namlash', 'ajin'], emoji: '🐌', grad: ['#2e2a1a', '#8a7a3d'] },
  { id: 12, nom: 'Vitamin C 23 Serum', brend: 'Klairs', kategoriya: 'serum', narx: 155000, teg: ['quyuq', 'ton', 'dog'], emoji: '🍊', grad: ['#2e1c12', '#b3641f'] },
  { id: 13, nom: 'Niacinamide 10% + Zinc 1%', brend: 'Beauty of Joseon', kategoriya: 'serum', narx: 118000, teg: ['husnbuzar', 'yogli', 'dog'], emoji: '🤍', grad: ['#1e2226', '#5c6b7a'] },
  { id: 14, nom: 'Ginseng Essence Water', brend: 'Beauty of Joseon', kategoriya: 'serum', narx: 148000, teg: ['ajin', 'quruq', 'ton'], emoji: '🫚', grad: ['#2a1c14', '#8a5a3d'] },
  { id: 15, nom: 'Green Tea Seed Serum', brend: 'Innisfree', kategoriya: 'serum', narx: 139000, teg: ['namlash', 'yogli', 'sezgir'], emoji: '🍃', grad: ['#102a18', '#2d8a4f'] },
  { id: 16, nom: 'Hyaluronic Acid Hydra Serum', brend: 'Purito', kategoriya: 'serum', narx: 142000, teg: ['quruq', 'namlash', 'sezgir'], emoji: '💧', grad: ['#12202e', '#3d6b9a'] },
  // ---------- KREM ----------
  { id: 17, nom: 'Water Sleeping Mask EX', brend: 'Laneige', kategoriya: 'krem', narx: 185000, teg: ['quruq', 'namlash', 'ton'], emoji: '🌙', grad: ['#141a30', '#3d4f9a'] },
  { id: 18, nom: 'Moisturizing Cream Deep Type', brend: 'Pyunkang Yul', kategoriya: 'krem', narx: 138000, teg: ['quruq', 'sezgir', 'namlash'], emoji: '🤎', grad: ['#261a12', '#7a4f2d'] },
  { id: 19, nom: 'Aloe Soothing Gel', brend: 'Nature Republic', kategoriya: 'krem', narx: 65000, teg: ['yallig', 'sezgir', 'namlash'], emoji: '🌵', grad: ['#12301a', '#3d9a5a'] },
  { id: 20, nom: 'Snail Repair Eye Cream', brend: 'Mizon', kategoriya: 'krem', narx: 125000, teg: ['ajin', 'quruq', 'dog'], emoji: '👁️', grad: ['#221e2e', '#5a4f7a'] },
  { id: 21, nom: 'Birch Juice Moisturizing Cream', brend: 'Round Lab', kategoriya: 'krem', narx: 149000, teg: ['quruq', 'namlash', 'sezgir'], emoji: '🌳', grad: ['#1a2418', '#4f6b3d'] },
  // ---------- NIQOB ----------
  { id: 22, nom: 'N.M.F Aquaring Mask (10 dona)', brend: 'Mediheal', kategoriya: 'niqob', narx: 95000, teg: ['namlash', 'quruq', 'ton'], emoji: '🎭', grad: ['#12222e', '#2d6b8a'] },
  { id: 23, nom: 'Real Nature Mask Set (10 dona)', brend: 'The Face Shop', kategoriya: 'niqob', narx: 88000, teg: ['namlash', 'ton', 'sezgir'], emoji: '🌸', grad: ['#2e1a22', '#8a3d5a'] },
  { id: 24, nom: 'Super Volcanic Clay Mask', brend: 'Innisfree', kategoriya: 'niqob', narx: 105000, teg: ['yogli', 'tozalash', 'husnbuzar'], emoji: '🌋', grad: ['#241e1a', '#6b4f3d'] },
  // ---------- QUYOSH ----------
  { id: 25, nom: 'Relief Sun Rice+Probiotics SPF50+', brend: 'Beauty of Joseon', kategoriya: 'quyosh', narx: 135000, teg: ['quyosh', 'ton', 'namlash'], emoji: '☀️', grad: ['#2e2612', '#b3941f'] },
  { id: 26, nom: 'Intensive Triple Shield SPF50+', brend: 'Round Lab', kategoriya: 'quyosh', narx: 129000, teg: ['quyosh', 'sezgir', 'yogli'], emoji: '🛡️', grad: ['#12222e', '#3d5f8a'] },
  // ---------- LAB ----------
  { id: 27, nom: 'Lip Sleeping Mask Berry', brend: 'Laneige', kategoriya: 'lab', narx: 115000, teg: ['quruq', 'namlash'], emoji: '🍓', grad: ['#2e1220', '#9a2d5a'] },
  // ---------- AKSESSUAR ----------
  { id: 28, nom: 'Soonjung pH 5.5 Barrier Kit', brend: 'Etude House', kategoriya: 'aksessuar', narx: 165000, teg: ['sezgir', 'yallig', 'namlash'], emoji: '🎁', grad: ['#1e2226', '#4f5c6b'] },
];

export function mahsulotTop(id) {
  return MAHSULOTLAR.find((m) => m.id === Number(id));
}
