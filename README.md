# DKP Hisobot Tahlili

> Bitta **Google Sheets** fayli + unga **bog'langan (bound) Google Apps Script** loyihasi.
> Faqat `.gs` va `.html` fayllaridan iborat — klassik Apps Script tuzilmasi.

Tizimning maqsadi — varaqdagi **tayyor standart hisobotni** (Arizalar holati) qulay
**filterlash**, biznes qoidalari asosida **muddat / SLA / to'lov** ko'rsatkichlarini
hisoblash va **statistikani** (KPI, grafiklar, reyting, jadval) ko'rsatuvchi interfeys
taqdim etish.

Barcha hisob-kitob **server tomonida JavaScript**da bajariladi — Google Sheets ichida
hech qanday formula (`COUNTIFS`, `SUMIFS`, `VLOOKUP`, `QUERY`, `FILTER` va h.k.) ishlatilmaydi.

---

## Fayllar tuzilmasi

Loyiha to'liq **flat** (papkasiz) — Apps Script muharririga to'g'ridan-to'g'ri mos:

| Fayl | Turi | Vazifa |
|------|------|--------|
| `Code.gs` | server | `doGet` (web app), `onOpen` (menyu), `include`, API endpointlar (`apiGetInitialState`, `apiRunQuery`, `apiExportData`) |
| `Config.gs` | server | Barcha sozlamalar: sarlavha aniqlash, ustun xaritasi, biznes qoidalari (status/turar/to'lov/muddat), SLA, bayramlar |
| `Utils.gs` | server | API javoblari, `escapeHtml`, `sanitizeText`, formatlash, JSON yordamchilari |
| `WorkingDays.gs` | server | Biznes kalendar: ish-kuni hisobi (shanba/yakshanba + bayramlar), `workingDaysBetween` O(1) optimallashtirilgan |
| `BusinessLogic.gs` | server | Moslashuvchan sana/son parser, ustun topish, **hosil qilingan biznes ustunlari** (Turar/Noturar, muddat, SLA, to'lov) |
| `Report.gs` | server | Hisobotni dinamik o'qish: sarlavha qatorini avtomatik aniqlash + ustun turlarini tasniflash |
| `Filter.gs` | server | Server tomonidagi filterlash + cascading variantlar |
| `Statistics.gs` | server | KPI, group-by, top-N, oylik trend, moliyaviy yig'indi, SLA taqsimoti |
| `index.html` | client | Sahifa karkasi (`include('style')`, `include('script')`) |
| `style.html` | client | CSS stillari (Material uslubi, responsive, chop etish stillari) |
| `script.html` | client | Frontend modullari (Loading, Toast, API, Dashboard) |

> `.gs` fayllari Apps Script'da **bitta global scope**ga birlashadi — barcha funksiyalar
> global. `<?!= include('...') ?>` template pattern orqali CSS va JS bosh sahifaga qo'shiladi.

---

## Qanday ishlaydi

1. Apps Script loyihasi Google Sheets fayliga **bog'langan**.
2. Standart hisobot (Excel) varaqqa qo'lda import qilinadi — **yagona ma'lumot manbai**.
3. Faylni ochganda menyuga **DKP Tahlil → Tahlil panelini ochish** qo'shiladi (dialog),
   yoki loyiha **Web App** sifatida deploy qilinadi (`doGet`).
4. Interfeys server'dan hisobotni **bir marta** o'qiydi, sarlavhani aniqlaydi, ustun
   turlarini topadi, biznes ustunlarini hisoblaydi va filtrlarni quradi.
5. Foydalanuvchi filterlaydi/qidiradi → `google.script.run` orqali `apiRunQuery` chaqiriladi,
   server **server tomonida** filterlab, statistika va grafik ma'lumotini JSON qaytaradi.
6. **CSV eksport** faqat filtrlangan natijani server tomonida tayyorlaydi.

```
  Google Sheets (tayyor hisobot)  ──bound──▶  Apps Script (.gs)
        ▲                                          │
        │  index.html + style.html + script.html   │
        └──── google.script.run (apiXxx → JSON) ───┘
```

---

## Standart hisobotni o'qish

Standart hisobotda sarlavha **1-qatorda emas** (yuqorida hisobot nomi va sana qatorlari
bo'ladi). Shu sababli `Report.gs`:

- Sarlavha qatorini **avtomatik aniqlaydi** (`getHeaderKeywords()` kalit so'zlari bo'yicha;
  standart hisobotda bu **3-qator**).
- Sarlavhadan keyingi **ikkilamchi sarlavha** qatorini (asosiy ustunlari bo'sh) ma'lumot
  deb hisoblamaydi.
- Matnli sanalarni (`2026.05.12 12:11`, `2026-06-03 15:19:58.621`, `12.05.2026`) ham
  **sana** sifatida tan oladi (`parseFlexibleDate`).
- Har bir ustunni **number / date / string** turiga ajratadi:
  number → KPI/ko'rsatkich; date → trend/sana oralig'i; string → kam qiymatli bo'lsa filtr
  dropdown, ko'p bo'lsa global qidiruv.

---

## Hosil qilingan (biznes) ustunlar

`BusinessLogic.gs` xom ustunlardan yangi ustunlarni hisoblaydi va ular avtomatik ravishda
filtr / statistika / diagramma quvuriga qo'shiladi:

| Ustun | Tavsifi |
|-------|---------|
| `Turar / Noturar` | Ariza/obyekt turidan aniqlanadi |
| `Ariza holati` | Tizimdagi holatdan: Jarayonda / Bajarilgan / Rad etilgan |
| `Jami hisoblangan summa` | Kadastr + Registratsiya + Manzil to'lov summalari |
| `Jami to'langan summa` | Tegishli to'langan summalar |
| `To'lanmagan (qarz) summa` | hisoblangan − to'langan |
| `To'lov holati (hisoblangan)` | To'langan / Qisman to'langan / To'lov kutilmoqda |
| `O'tgan ish kunlari` | Ariza kelib tushgandan beri ish kunlari |
| `Belgilangan muddat (ish kuni)` | Xizmat qoidasiga ko'ra (`getServiceRules()`) |
| `Qolgan ish kuni` | Muddatga qolgan ish kunlari (manfiy = o'tgan) |
| `SLA foizi` | Qolgan muddat foizi |
| `Muddat holati` | Jarayonda / Bugun tugaydi / Muddati o'tgan / Bajarilgan |
| `SLA holati` | Yashil / Sariq / To'q sariq / Qizil / Qora (rang chegaralari `getSlaConfig()`) |

> Kerakli xom ustun topilmasa, tegishli hosil ustun o'tkazib yuboriladi — tizim boshqa
> hisobotlar bilan ham ishlayveradi.

---

## Imkoniyatlar

- **Cascading filterlar** — har bir kategoriya ustuni uchun ko'p tanlovli (checkbox) dropdown.
- **Sana oralig'i** va **raqamli oraliq (min/max)** filtrlari.
- **Tezkor global qidiruv** (debounce bilan).
- **KPI kartalar** + **Moliyaviy ko'rsatkichlar** (hisoblangan, to'langan, qarz, yig'ilish %).
- **Google Charts** — doiraviy, ustunli, trend (area) va **SLA** doiraviy diagrammasi (rangli).
- **Top 10** reyting, sahifalanadigan/saralanadigan jadval (server-side).
- **CSV eksport** (faqat filtrlangan natija) va **chop etish**.
- Material uslubidagi, responsive interfeys; loading va toast.

---

## Sozlash

Barcha sozlamalar `Config.gs` ichida (funksiya getterlar):

| Funksiya / kalit | Tavsifi |
|------------------|---------|
| `getReportConfig().SHEET_NAME` | Hisobot varag'i nomi. `''` bo'lsa — **aktiv varaq** |
| `getReportConfig().AUTO_DETECT_HEADER` | Sarlavha qatorini avtomatik aniqlash (standart: `true`) |
| `getReportConfig().HEADER_ROW` | Avtomatik aniqlash o'chirilsa — qat'iy sarlavha qatori (standart: 3) |
| `getColumnMap()` | Mantiqiy maydon → ustun nomi kalit so'zlari (hisobot o'zgarsa shu yerni moslang) |
| `getServiceRules()` | Ariza/tranzaksiya turiga ko'ra belgilangan ish kuni |
| `getSlaConfig()` | SLA rang chegaralari va ranglari |
| `getCalendarConfig().HOLIDAYS` | Bayram kunlari (diniy bayramlarni qat'iy sana bilan qo'shing) |
| `getSystemConfig()` | Nom, sarlavha, vaqt mintaqasi, sana formati |

---

## O'rnatish

### A) Tezkor (nusxa ko'chirish)
1. Google Sheets faylini oching va standart hisobotni varaqqa joylang.
2. **Extensions → Apps Script**.
3. Har bir `.gs` va `.html` faylni muharrirda yarating va shu repodagi mazmunni nusxa qiling
   (`.html` fayllar uchun: **File → New → HTML**, nomini `index`, `style`, `script` qiling).
4. Saqlang.

### B) clasp orqali
```bash
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>   # bound loyiha scriptId — Project Settings'dan
# fayllarni shu repodagilar bilan almashtiring
clasp push
```

### Ishga tushirish
- **Varaq ichida:** faylni qayta yuklang → **DKP Tahlil → Tahlil panelini ochish**.
- **Web App:** **Deploy → New deployment → Web app** → URL ochiladi.

---

## Optimizatsiya

- Hisobot **bitta `getValues()`** bilan o'qiladi; filtr/agregatsiya in-memory.
- `workingDaysBetween()` kun-bakun aylanmaydi — hafta kunlari **O(1)** arifmetika, bayramlar
  faqat ro'yxat bo'yicha hisoblanadi (50 000+ yozuv uchun barqaror).
- Jadval **server-side sahifalanadi**; qidiruv **debounce** bilan; eksport faqat filtrlangan
  qatorlarni chiqaradi.
