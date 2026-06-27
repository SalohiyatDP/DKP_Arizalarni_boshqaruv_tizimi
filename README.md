# DKP Hisobot Tahlili

> Bitta **Google Sheets** fayli ichida, **Google Apps Script** bilan integratsiyalashgan tahlil muhiti.

Tizimning yagona maqsadi — varaqdagi **tayyor hisobot jadvalini** qulay **filterlash** va
**statistikani** (KPI, grafiklar, reyting, jadval) ko'rsatuvchi interfeys taqdim etish.

Hisobot ustunlari **avtomatik aniqlanadi** (qat'iy sxema yo'q), shuning uchun tizim deyarli
istalgan ustunli tayyor hisobot bilan ishlaydi.

---

## Mundarija

- [Qanday ishlaydi](#qanday-ishlaydi)
- [Imkoniyatlar](#imkoniyatlar)
- [Arxitektura](#arxitektura)
- [Loyiha tuzilmasi](#loyiha-tuzilmasi)
- [Ustunlarni avtomatik aniqlash](#ustunlarni-avtomatik-aniqlash)
- [O'rnatish (Apps Script + Google Sheets)](#ornatish-apps-script--google-sheets)
- [Sozlash](#sozlash)
- [Lokal ishlab chiqish (lint va test)](#lokal-ishlab-chiqish-lint-va-test)
- [Optimizatsiya](#optimizatsiya)

---

## Qanday ishlaydi

1. Apps Script loyihasi Google Sheets fayliga **bog'langan (bound)**.
2. Faylni ochganda menyuga **📊 DKP Tahlil → Tahlil panelini ochish** qo'shiladi.
3. Panel (modal dialog) ochiladi: server hisobot varag'ini **bir marta o'qiydi**, ustun turlarini
   aniqlaydi va filterlash uchun interfeys quradi.
4. Foydalanuvchi filterlaydi/qidiradi → server **server tomonida** filterlab, statistika va
   grafiklar uchun ma'lumotni qaytaradi.

```
  Google Sheets (tayyor hisobot)
        │  (bound)
        ▼
  Apps Script  ──onOpen──▶  Menyu  ──▶  Modal dialog (Index.html)
        │                                     │  google.script.run
        └────────── server API ◀──────────────┘
           getInitialState() / runQuery(payload)
```

---

## Imkoniyatlar

- **Cascading filterlar** — har bir kategoriya ustuni uchun ko'p tanlovli (checkbox) dropdown;
  variantlar boshqa faol filterlarga moslab yangilanadi.
- **Sana oralig'i** filtri (ixtiyoriy sana ustuni bo'yicha).
- **Raqamli oraliq** (min/max) filtrlari har bir raqamli ustun uchun.
- **Tezkor global qidiruv** (debounce bilan).
- **KPI kartalar** — jami yozuvlar va har bir raqamli ustun bo'yicha yig'indi/o'rtacha.
- **Grafiklar** (Google Charts): doiraviy (ulush), ustunli (o'lcham bo'yicha), maydon/chiziqli (trend).
- **Top 10 reyting** tanlangan o'lcham bo'yicha.
- **Sahifalangan, saralanadigan jadval** (server-side pagination & sort).
- **Material dizayn**, responsive layout, loading animatsiya.

---

## Arxitektura

Qatlamli, qat'iy bog'liqlik yo'nalishi bilan. Barcha hisob-kitob **server tomonida** (JavaScript),
Google Sheets ichida **formula ishlatilmaydi**.

| Qatlam | Fayl | Vazifa |
|--------|------|--------|
| **Config** | `src/config/Config.js` | Deep-frozen `CONFIG` — yagona konfiguratsiya manbai |
| **Utils** | `src/utils/DateUtils.js`, `Validator.js` | Ish-kuni kalendari, input validatsiya (sof funksiyalar) |
| **Repository** | `src/repository/Database.js`, `ReportRepository.js` | Bound spreadsheet + hisobotni dinamik o'qish/turlarni aniqlash |
| **Service** | `src/services/FilterService.js`, `StatisticsService.js` | Server-side filterlash va agregatsiya (sof funksiyalar) |
| **Controller** | `src/Code.js` | `onOpen`, dialog, server API (`getInitialState`, `runQuery`) |
| **UI** | `Index.html` | Filtrlar + KPI + grafiklar + jadval (HtmlService) |

> Sof mantiqiy modullar (kalendar, filter, statistika, ustun aniqlash) Node muhitida **unit test**
> qilinadi; har bir server fayli `typeof module` himoyasiga ega.

---

## Loyiha tuzilmasi

```
DKP_Arizalarni_boshqaruv_tizimi/
├── appsscript.json              # Apps Script manifesti (V8, Asia/Tashkent)
├── .clasp.json.example          # clasp konfiguratsiyasi namunasi
├── eslint.config.js             # ESLint (flat config)
├── package.json                 # lint/test/push skriptlari
├── Index.html                   # Dashboard UI (filtrlar + statistika)
│
├── src/
│   ├── Code.js                  # Controller: menyu, dialog, server API
│   ├── config/
│   │   └── Config.js            # CONFIG — konstanta va parametrlar
│   ├── utils/
│   │   ├── DateUtils.js         # Ish-kuni kalendari (SLA/sana mantiqi)
│   │   └── Validator.js         # Input validatsiya
│   ├── repository/
│   │   ├── Database.js          # Bound (aktiv) spreadsheet kirish
│   │   └── ReportRepository.js  # Hisobotni dinamik o'qish + turlarni aniqlash
│   └── services/
│       ├── FilterService.js     # Server-side filterlash (cascading)
│       └── StatisticsService.js # KPI, group-by, top-N, time series
│
└── test/                        # Node unit testlar (sof mantiq)
    ├── dateutils.test.js
    ├── validator.test.js
    ├── reportrepository.test.js
    ├── filterservice.test.js
    └── statisticsservice.test.js
```

---

## Ustunlarni avtomatik aniqlash

`ReportRepository` hisobot varag'ining birinchi qatorini sarlavha sifatida oladi va har bir
ustunning turini **qiymatlarni namuna olish** orqali aniqlaydi:

- **number** → KPI va agregatsiya uchun *ko'rsatkich (measure)*;
- **date** → trend grafigi va sana oralig'i filtri uchun;
- **string** → *o'lcham (dimension)*:
  - agar noyob qiymatlar soni `MAX_DIMENSION_CARDINALITY` dan kam bo'lsa → filtr dropdown;
  - aks holda → faqat global qidiruvga kiradi.

Shuning uchun maxsus sxema talab qilinmaydi — ustunlar o'zgarsa ham tizim moslashadi.

---

## O'rnatish (Apps Script + Google Sheets)

### 1. Talablar
- [Node.js](https://nodejs.org/) (lokal lint/test uchun)
- [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`

### 2. Hisobot faylini tayyorlash
Tayyor hisobot jadvali joylashgan Google Sheets faylini oching (1-qator — sarlavhalar).

### 3. Bog'langan Apps Script loyihasini ulash
Sheets ichida **Extensions → Apps Script** orqali bound loyiha oching va uning `scriptId` sini oling
(Project Settings’dan). So'ng:

```bash
cp .clasp.json.example .clasp.json
# .clasp.json ichidagi scriptId ni bound loyihangiznikiga almashtiring
clasp push        # yoki: npm run push
```

### 4. Ishga tushirish
Sheets faylini qayta yuklang → menyuda **📊 DKP Tahlil → Tahlil panelini ochish**.

---

## Sozlash

Asosiy sozlamalar `src/config/Config.js` → `CONFIG` ichida:

| Sozlama | Tavsifi |
|---------|---------|
| `REPORT.SHEET_NAME` | Hisobot varag'i nomi. `''` bo'lsa — **aktiv varaq** ishlatiladi |
| `REPORT.HEADER_ROW` | Sarlavha qatori raqami (standart: 1) |
| `REPORT.TYPE_SAMPLE_ROWS` | Tur aniqlash uchun namuna olinadigan qatorlar soni |
| `REPORT.MAX_DIMENSION_CARDINALITY` | Ustun dropdownga aylanishi uchun maks. noyob qiymatlar |
| `PERFORMANCE.PAGE_SIZE` | Jadval sahifasidagi yozuvlar soni |
| `UI.DIALOG_WIDTH/HEIGHT` | Dialog o'lchami |
| `SLA.*`, `CALENDAR.*` | SLA ranglari va ish-kuni qoidalari (ixtiyoriy tahlil uchun) |

---

## Lokal ishlab chiqish (lint va test)

```bash
npm run lint    # ESLint
npm test        # Node unit testlar
```

Joriy holatda **34 ta test** mavjud va barchasi o'tadi; ESLint **0 ta muammo** qaytaradi.

---

## Optimizatsiya

- Hisobot **bitta `getValues()`** chaqirig'i bilan o'qiladi (50 000+ qator uchun mos).
- Filterlash, agregatsiya va saralash **in-memory** `Map`/massivlar bilan bajariladi
  (Google Sheets formulalarisiz).
- Jadval **server-side pagination** orqali sahifalanadi — katta natijalar brauzerga to'liq yuborilmaydi.
- Qidiruv **debounce** bilan; dialog uchun ma'lumotlar faqat kerakli hajmda uzatiladi.
- `LockService` orqali bir vaqtdagi murojaatlar tartibga solinadi.
