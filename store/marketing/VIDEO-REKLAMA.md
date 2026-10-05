# KiOVO — video reklama: tayyor video, promptlar va reja

Maqsad — **lead**: odam reklamadan to'g'ri **bepul AI teri tahlili**ga
kirsin. Tahlil — eng kuchli «lid magnit»: bepul, 30 soniya, natija
shaxsiy va chiroyli (qatlamlar, ball). Tahlildan keyin ilova o'zi mos
mahsulotni taklif qiladi — sotuv shu yerda bo'ladi.

**Har videoda 4 qoida:**
1. **1-soniyada ilgak** — savol yoki og'riq: «Kremlar ishlamayaptimi?»
2. **Ovozsiz ham tushunarli** — Reels/TikTok'ning ~80% ovozsiz ko'riladi,
   shuning uchun hamma gap ekranda katta yozuv bilan.
3. **«Vau» kadr** — klinik qatlamlar (jigarrang / yashil / ko'k) va
   lazer skan. Odam to'xtab qoladi va «menikini ham ko'rsat» deydi.
4. **Bitta aniq CTA** — «Bepul teri tahlili → www.kiovo.shop».

Halollik: «tibbiy tashxis emas» yozuvi qoladi; «100% aniq», «davolaydi»
kabi va'dalar yozilmaydi (Meta va TikTok bunday reklamani rad etadi).

---

## 1. Tayyor video (25 s, 9:16, 1080×1920)

| Vaqt | Ekranda | Ovoz (ixtiyoriy) |
|---|---|---|
| 0–3 s | «Kremlar **ishlamayaptimi?**» — kremlar «?» bilan titraydi · «Ehtimol, ular sizning teringizga mos emas.» | «Kremlar ishlamayaptimi? Balki ular sizga mos emasdir.» |
| 3–6 s | Telefon chiqadi: «AI teringizni **30 soniyada** tahlil qiladi», ramka, 3-2-1 | «KiOVO teringizni o'ttiz soniyada tahlil qiladi.» |
| 6–10 s | To'r, lazer, «Teshiklar ✓ Pigment ✓…», belgilar chiqadi: «Muammolar — **aniq joyida**» | «Sepkil, akne, teshiklar — hammasi aniq joyida.» |
| 10–14 s | Qatlamlar ajratgich bilan: Pigment → Qizarish → Bakteriya → UV → Tekstura | «Teringizni klinik qatlamlarda ko'rasiz.» |
| 14–18 s | Ball 0→78, ko'rsatkichlar to'ladi: «Natija — **aniq raqamlarda**» | «Natija — aniq raqamlarda.» |
| 18–21 s | 3 ta mahsulot, barmoq «Savatga» bosadi: «Teringizga mos **Koreya kosmetikasi**» | «Va teringizga mos Koreya kosmetikasi.» |
| 21–25 s | Logo, «**BEPUL teri tahlili**», «Hozir sinab ko'ring →», www.kiovo.shop | «Bepul tahlil — kiovo.shop.» |

Musiqa: Reels/TikTok'ning o'z kutubxonasidan **trenddagi** qo'shiqni
qo'ying — platforma trend ovozli videoni ko'proq ko'rsatadi. Ovozsiz
videoga musiqa qo'shish bitta tugma.

**Post matni (Instagram / TikTok):**
```
Kremlar ishlamayaptimi? 🤔 Balki ular SIZNING teringizga mos emasdir.

KiOVO AI yuzingizni 30 soniyada tahlil qiladi:
✓ teshiklar, pigment, qizarish, namlik
✓ klinik qatlamlar — xuddi kosmetolog apparatidek
✓ teringizga mos Koreya kosmetikasi

👉 BEPUL tahlil: www.kiovo.shop (havola profilda)
Tibbiy tashxis emas — kosmetologik tavsiya.

#kosmetika #koreyakosmetikasi #teriparvarishi #skincare #toshkent #kbeauty
```

---

## 2. Veo (Gemini API) uchun promptlar — 3 ta konsepsiya

Veo **inglizcha** promptni eng yaxshi tushunadi, shuning uchun prompt
inglizcha. Ekrandagi yozuv va ovozni **keyin** o'zbekcha qo'shing: video
modellari o'zbekcha matnni rasmda xato yozadi. Har sahna — alohida 8
soniyalik klip, keyin CapCut'da ulanadi.

### A. «Ko'zgu va AI» — 3D animatsiya (Pixar uslubi), 24 s

```
Scene 1 (8s): Stylized 3D animated short, Pixar-like look, warm soft lighting.
A young Central Asian woman (early 20s, long dark hair) stands in front of a
bathroom mirror at night, surrounded by a mountain of half-used skincare jars
and bottles. She sighs and shrugs at her reflection, frustrated. Cozy pastel
bathroom, shallow depth of field, gentle camera push-in. Vertical 9:16.
No text on screen.

Scene 2 (8s): Same character and style. She picks up her smartphone; the
phone emits a soft lime-green holographic scanning grid that sweeps over her
face from forehead to chin, with glowing circular markers appearing on her
cheeks and nose. Deep wine-red and lime-green color palette, magical but
clean, camera orbits slowly around her. Vertical 9:16. No text on screen.

Scene 3 (8s): Same character and style. Holographic panels float around her
showing her face in different clinical skin-imaging styles: brown pigment map
on white, green fluorescent map on black, electric blue UV map. A score ring
fills up and glows green. She smiles, delighted, and a few Korean skincare
bottles float gently into her hands. Confident hero shot, sparkles,
vertical 9:16. No text on screen.
```

### B. «Kremlar tog'i» — claymation (stop-motion), 16 s — kulgili

```
Scene 1 (8s): Claymation stop-motion style. A tiny clay girl climbs a huge
mountain of skincare jars and tubes like a mountaineer, sweating, jars
rolling down. At the top she plants a little red flag that says nothing.
Playful, handmade texture, soft studio lighting, vertical 9:16, no text.

Scene 2 (8s): Same clay style. A friendly clay smartphone with a cute smiley
face (two dots and a curved smile, lime green on red) scans her face with a
green light beam; the mountain of jars collapses into just three neat
bottles that hop into a small basket. She cheers. Vertical 9:16, no text.
```

### C. «Dugonalar» — 2D animatsiya, dialog bilan, 15 s (UGC uslubi)

```
Flat 2D animation, bold outlines, modern Instagram illustration style,
vertical 9:16. Two young women friends in a cafe. Friend A looks at Friend
B's glowing skin in surprise, points at her face. Friend B shows her phone
screen with a face scan and colorful skin layers, then a short list of
three skincare products. Friend A immediately grabs her own phone, excited.
Warm cafe colors with accents of deep red and lime green. No text on screen.
```

**Dialog (o'zbekcha, ovoz yoki subtitr):**
— «Voy, teringga nima bo'ldi? Juda chiroyli!»
— «Telefonda yuzimni tahlil qildim. Qaysi krem mosligini o'zi aytdi.»
— «Qayerda?! Menga ham tashla!»
— Ekranda: **«Bepul teri tahlili — www.kiovo.shop»**

---

## 3. Ovoz (Gemini TTS) va musiqa (Lyria) uchun promptlar

**Ovoz — uslub prompti** (matn: 1-bo'limdagi «Ovoz» ustuni):
```
Say in a warm, friendly, confident young female voice, like a beauty
blogger talking to a friend; medium pace, smiling tone, clear diction:
```
Ovoz nomi: `Kore` yoki `Aoede` (yumshoq ayol ovozi).
⚠️ O'zbek tili Gemini TTS'da rasmiy qo'llab-quvvatlanmasligi mumkin —
avval bitta jumla bilan sinang. Talaffuz yomon bo'lsa — ovozni o'zingiz
(yoki tanishingiz) telefonda yozing: tabiiy ovoz reklamada ko'pincha
yaxshiroq ishlaydi.

**Musiqa (Lyria)** — 25 s fon:
```
Upbeat modern K-pop inspired instrumental, bright synth plucks, soft
four-on-the-floor beat, 112 BPM, feel-good and fresh, builds up gently
and lands on a satisfying final chord at 22 seconds. No vocals.
```

**Muqova / thumbnail (Imagen / Gemini image):**
```
Vertical 9:16 poster. Close-up of a young woman's face split vertically in
half: left half natural glowing skin, right half a clinical skin-analysis
view in green fluorescent tones with small glowing circular markers.
Deep wine-red background with a soft lime-green glow. Clean, premium beauty
advertising photography, high detail. Leave empty space at the top for a
headline. No text.
```
Muqovaga yozuv (o'zingiz qo'shasiz): **«Teringiz sizga nimani aytmoqda?»**

---

## 4. Ilgaklar — A/B sinov uchun 10 ta birinchi jumla

1. Kremlar ishlamayaptimi?
2. Qaysi krem menga mos — 30 soniyada bilib oldim.
3. Telefon yuzimni kosmetologdan aniqroq ko'rdi 😳
4. Teringiz sizga nimani aytmoqda?
5. Sepkil, akne, teshiklar — yuzingizda nima bor?
6. Bu yashil rasm — mening yuzim. Mana nima uchun ↓
7. Kosmetikaga pul sovurishni to'xtating.
8. Dugonam so'radi: «teringga nima qilding?»
9. 1 ta selfi = to'liq teri tahlili.
10. Koreys qizlari terisining siri — to'g'ri tartib.

Bitta videoni 3–4 xil ilgak bilan chiqaring (faqat birinchi 2 soniya
farq qiladi) — qaysi biri arzonroq lid bersa, byudjetni o'shanga bering.

---

## 5. Reklamani qo'yish — lid uchun

- **Manzil:** reklama havolasi to'g'ri skanerga olib borsin:
  `https://www.kiovo.shop/app/?tab=skaner&utm_source=instagram&utm_campaign=reels1`
  (har reklamaga o'z `utm_campaign` — qaysi biri ishlaganini bilasiz).
- **Instagram/Facebook (Meta Ads):** maqsad *Leads* yoki *Traffic →
  Landing page views*; auditoriya — ayollar 18–35, Toshkent va viloyat
  markazlari, qiziqishlar: skincare, K-beauty, kosmetika, Korean drama.
  Boshida kuniga 5–10 $ dan 3 xil ilgak, 3 kundan keyin yutganiga
  byudjet.
- **TikTok:** shu video + trend musiqa; organik post kuniga 1 ta.
- **Telegram:** go'zallik va ayollar kanallariga reklama posti (video +
  «Bepul tahlil» tugmasi bot havolasi bilan).
- **Retargeting:** saytga kirib tahlil qilgan, lekin xarid qilmaganlarga
  — mahsulot videolari va chegirma.
