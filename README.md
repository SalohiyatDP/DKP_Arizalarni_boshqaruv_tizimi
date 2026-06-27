# DKP Arizalarni Boshqaruv Tizimi

> Davlat kadastri uchun **Google Apps Script Web App** asosida ishlab chiqilgan professional analitik platforma.

Platforma har kuni keladigan standart Excel hisobotini avtomatik import qiladi, barcha biznes
qoidalari asosida qayta ishlaydi, muddatlarni ish kuni hisob-kitobiga ko'ra hisoblaydi,
statistikalarni shakllantiradi va rollarga asoslangan zamonaviy Dashboard taqdim etadi.

---

## Mundarija

- [Texnologiyalar](#texnologiyalar)
- [Asosiy tamoyillar](#asosiy-tamoyillar)
- [Arxitektura](#arxitektura)
- [Loyiha tuzilmasi](#loyiha-tuzilmasi)
- [Ma'lumotlar bazasi (Google Sheets)](#malumotlar-bazasi-google-sheets)
- [Rollar va ruxsatlar](#rollar-va-ruxsatlar)
- [Biznes kalendar (ish kuni hisobi)](#biznes-kalendar-ish-kuni-hisobi)
- [SLA va rang holati](#sla-va-rang-holati)
- [O'rnatish va deploy (Google Apps Script)](#ornatish-va-deploy-google-apps-script)
- [Lokal ishlab chiqish (lint va test)](#lokal-ishlab-chiqish-lint-va-test)
- [Xavfsizlik](#xavfsizlik)
- [Optimizatsiya (50 000+ yozuv)](#optimizatsiya-50000-yozuv)
- [Loyiha holati va Roadmap](#loyiha-holati-va-roadmap)
- [Litsenziya](#litsenziya)

---

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Runtime | **Google Apps Script (V8)** |
| Web ilova | **Google Apps Script Web App** (`HtmlService`, `doGet`) |
| Frontend | HTML5, CSS3, JavaScript ES2023 |
| Ma'lumotlar bazasi | **Google Sheets** |
| Grafiklar | Google Charts |
| Server hisob-kitoblari | JavaScript (Apps Script server-side) |
| Tooling | clasp, ESLint, Node test runner |

> **Eslatma:** Tizim Google Apps Script Web App sifatida ishlaydi. Kodning bajarilishi
> Google serverlarida (`script.google.com`) amalga oshiriladi; lokal muhitda faqat **lint**
> va sof mantiqiy funksiyalar uchun **unit testlar** yuritiladi.

---

## Asosiy tamoyillar

- ✅ **Standart Excel fayli — yagona ma'lumot manbai.**
- ✅ **Barcha hisob-kitoblar Apps Script server tomonida** bajariladi.
- ✅ **Google Sheets ichida formula ishlatilmaydi** — `COUNTIFS`, `SUMIFS`, `VLOOKUP`, `INDEX`,
  `MATCH`, `FILTER`, `QUERY` kabilar **mutlaqo qo'llanilmaydi**. Barcha hisob-kitoblar JavaScript
  orqali, in-memory `Map`/`Object` indekslari yordamida bajariladi.
- ✅ **Server tomonida ruxsat (permission) tekshiruvi majburiy** — frontenddagi yashirish bilan
  cheklanilmaydi.
- ✅ **Modulli arxitektura**: MVC, Service Layer, Repository Layer, Utils Layer.
- ✅ **SOLID, DRY, KISS, Clean Code** tamoyillari; **Magic Number** ishlatilmaydi (barchasi `CONFIG`).

---

## Arxitektura

Tizim qatlamli (layered) arxitekturaga asoslanadi. Pastdan yuqoriga bog'liqlik yo'nalishi:

```
            ┌──────────────────────────────────────────┐
            │   UI (HtmlService: HTML + CSS + JS)        │   <- Web App ko'rinishi
            └──────────────────────────────────────────┘
                              │ google.script.run
            ┌──────────────────────────────────────────┐
            │   Controllers (doGet, API endpointlar)     │   <- so'rovlarni qabul qilish
            └──────────────────────────────────────────┘
                              │
            ┌──────────────────────────────────────────┐
            │   Services (Auth, Import, BusinessLogic,    │   <- biznes mantiq
            │   Statistics, Finance, Export)              │
            └──────────────────────────────────────────┘
                              │
            ┌──────────────────────────────────────────┐
            │   Repository (BaseRepository, Database)     │   <- ma'lumotga kirish
            └──────────────────────────────────────────┘
                              │
            ┌──────────────────────────────────────────┐
            │   Utils (DateUtils, Security, Validator,    │   <- qayta ishlatiluvchi yordamchilar
            │   CacheManager, Logger)                     │
            └──────────────────────────────────────────┘
                              │
            ┌──────────────────────────────────────────┐
            │   Config (CONFIG) + Schema (SCHEMA)         │   <- yagona konfiguratsiya manbai
            └──────────────────────────────────────────┘
```

Har bir server moduli fayl oxirida `typeof module` himoyasiga ega:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ... };
}
```

Bu Apps Script global scope'ida zararsiz (`module` aniqlanmagan), lekin Node muhitida sof
mantiqni **unit test** qilish imkonini beradi.

---

## Loyiha tuzilmasi

```
DKP_Arizalarni_boshqaruv_tizimi/
├── appsscript.json              # Apps Script manifesti (V8, Asia/Tashkent, Web App)
├── .clasp.json.example          # clasp konfiguratsiyasi namunasi (scriptId shu yerda)
├── eslint.config.js             # ESLint (flat config)
├── package.json                 # lint/test/push skriptlari
├── .gitignore
├── README.md
│
├── src/
│   ├── config/
│   │   ├── Config.js            # CONFIG — barcha konstanta, enum, sheet nomlari, SLA, parametrlar
│   │   └── Schema.js            # SCHEMA — har bir sheet ustunlari + header/index helperlari
│   │
│   ├── utils/
│   │   ├── DateUtils.js         # Biznes kalendar (ish kuni hisobi)
│   │   ├── Security.js          # Hash, token, escape, sanitize, validatsiya
│   │   ├── Validator.js         # Input validatsiya (PNFL, kadastr, son, sana, enum)
│   │   ├── CacheManager.js      # CacheService + gzip JSON kesh
│   │   └── Logger.js            # AppLogger — LOGIN_LOG / ACTION_LOG / IMPORT_LOG
│   │
│   └── repository/
│       ├── Database.js          # Spreadsheet bootstrap, setupAll(), withLock()
│       └── BaseRepository.js    # Schema-driven CRUD (bitta getValues/setValues, Map index)
│
│   └── setup/
│       └── SeedData.js          # seedSampleData() — sheetlarni yaratib demo data bilan to'ldiradi
│
├── samples/
│   └── DKP_Namuna.xlsx          # Drive'ga yuklash uchun tayyor namuna (16 tab + demo data)
│
├── tools/
│   └── build_sample_xlsx.py     # Namuna .xlsx ni qayta yaratuvchi skript (dependency-free)
│
└── test/                        # Node unit testlar (sof mantiq)
    ├── dateutils.test.js
    ├── security.test.js
    ├── validator.test.js
    └── repository.test.js
```

> Apps Script'da papkalar bo'lmaydi — `clasp push` fayllarni `src/config/Config` kabi to'liq yo'l
> bilan nomlaydi va yuklaydi. `.clasp.json` ichidagi `filePushOrder` yuklash tartibini ta'minlaydi.

---

## Ma'lumotlar bazasi (Google Sheets)

Tizim 16 ta sheet (jadval) bilan ishlaydi. Har bir jadvalning ustunlari `src/config/Schema.js`
ichida deklarativ tarzda belgilangan, kod hech qachon ustun pozitsiyasini "qotirib" yozmaydi.

| Sheet | Vazifasi |
|-------|----------|
| `LOGIN` | Foydalanuvchilar, parol hash + salt, status, sessiya bilan bog'liq maydonlar |
| `EMPLOYEES` | Xodimlar (muhandislar), viloyat/tuman/filial taqsimoti |
| `HOLIDAYS` | Bayram kunlari (fixed va har yili takrorlanuvchi) |
| `SERVICE_RULES` | Xizmat turi bo'yicha muddat (ish kuni) va narx |
| `AREA_RULES` | Viloyat/Tuman/Filial hududiy qoidalari |
| `SETTINGS` | Tizim parametrlari (key/value) |
| `RAW_DATA` | Import qilingan Excel ma'lumotining xom nusxasi (JSON) |
| `DATA` | Qayta ishlangan arizalar (analitik fakt jadvali) |
| `STATISTICS` | Hisoblangan statistik ko'rsatkichlar |
| `MONTHLY_STATS` | Oylik kesimdagi statistika |
| `FINANCE` | Moliyaviy ko'rsatkichlar (billed/paid/pending) |
| `EXPORT_QUEUE` | Eksport navbati (background queue) |
| `LOGIN_LOG` | Kirish urinishlari jurnali |
| `ACTION_LOG` | Foydalanuvchi amallari va xatoliklar jurnali |
| `IMPORT_LOG` | Import jarayoni jurnali (transaction holatlari) |
| `BACKUP` | Har import oldidan zaxira nusxa (rollback uchun) |

Barcha jadvallarni bir marta yaratish uchun: `Database.setupAll()`.

---

## Rollar va ruxsatlar

| Rol | Kod | Daraja | Ko'rish doirasi |
|-----|-----|--------|-----------------|
| Administrator | `ADMIN` | 0 | Barcha ma'lumotlar |
| Viloyat | `REGION` | 1 | O'z viloyati doirasidagi ma'lumotlar |
| Tuman (Bosh muhandis) | `DISTRICT` | 2 | O'z tumani doirasidagi ma'lumotlar |
| Kadastr muhandisi | `ENGINEER` | 3 | Faqat o'ziga biriktirilgan arizalar |

Har bir foydalanuvchi **faqat o'z vakolati doirasidagi** ma'lumotlarni ko'radi. Ruxsat tekshiruvi
**server tomonida** (Service qatlamida) majburiy amalga oshiriladi.

---

## Biznes kalendar (ish kuni hisobi)

Barcha muddat hisob-kitoblari `src/utils/DateUtils.js` orqali o'tadi. Qoidalar:

- **Shanba** (`getDay() === 6`) — ish kuni emas.
- **Yakshanba** (`getDay() === 0`) — ish kuni emas.
- **`HOLIDAYS` jadvalidagi** har qanday sana — ish kuni emas (fixed yoki takrorlanuvchi).

Funksiyalar:

| Funksiya | Tavsifi |
|----------|---------|
| `isWorkingDay(date, holidays)` | Sana ish kunimi? |
| `nextWorkingDay(date, holidays)` | Berilgan sanadan keyingi navbatdagi ish kuni |
| `addWorkingDays(start, n, holidays)` | `n` ta ish kunini qo'shadi (boshlang'ich kun hisobga olinmaydi; manfiy `n` orqaga) |
| `workingDaysBetween(a, b, holidays)` | Ikki sana orasidagi ish kunlari (boshini chiqarib, oxirini kiritib) |
| `remainingWorkingDays(from, due, holidays)` | Qolgan ish kunlari (muddat o'tgan bo'lsa **manfiy**) |
| `buildHolidaySet(rows)` | `HOLIDAYS` qatorlaridan tez qidiruv uchun `Set` tuzadi |

---

## SLA va rang holati

Har bir ariza uchun qolgan vaqt foizi (`slaPercent`) hisoblanadi va rang holati beriladi:

| Holat | Rang | Shart (qolgan vaqt %) |
|-------|------|------------------------|
| 🟢 GREEN | `#2e7d32` | ≥ 60% |
| 🟡 YELLOW | `#f9a825` | ≥ 40% |
| 🟠 ORANGE | `#ef6c00` | ≥ 20% |
| 🔴 RED | `#c62828` | ≥ 0% |
| ⚫ BLACK | `#000000` | < 0% (muddati o'tgan) |

Rang chegaralari `CONFIG.SLA.THRESHOLDS` ichida saqlanadi.

---

## O'rnatish va deploy (Google Apps Script)

### 0. Dastlabki Google Sheets namunasi (Drive'ga yuklash uchun)

`samples/DKP_Namuna.xlsx` — barcha **16 ta tab**, to'g'ri header'lar va real demo
ma'lumotlar bilan tayyor namuna fayl.

1. Faylni [Google Drive](https://drive.google.com/drive) ga yuklang.
2. O'ng tugma → **Open with → Google Sheets** (yoki Drive sozlamasida "Convert uploads"
   yoqilgan bo'lsa avtomatik Google Sheets'ga aylanadi).
3. Hosil bo'lgan Google Sheets faylining ID sini (`/d/<ID>/edit`) `DKP_SPREADSHEET_ID`
   Script Property sifatida kiriting (4-bandga qarang).

Namunadagi **demo hisoblar** (parollar):

| Username | Parol | Rol |
|----------|-------|-----|
| `admin` | `Admin@123` | ADMIN |
| `region` | `Region@123` | REGION |
| `district` | `District@123` | DISTRICT |
| `engineer` | `Engineer@123` | ENGINEER |

> Parol hash'lari `Security.hashPassword` algoritmi (`SHA-256(salt + ':' + parol)`) bilan
> hisoblangan, shuning uchun bu hisoblar AuthService tayyor bo'lgach to'g'ridan-to'g'ri ishlaydi.
> **Birinchi kirishdan so'ng parollarni almashtirish tavsiya etiladi** (`MustChangePassword = TRUE`).

Namunani qayta yaratish (ma'lumotni o'zgartirgandan keyin):

```bash
python3 tools/build_sample_xlsx.py   # -> samples/DKP_Namuna.xlsx
```

**Muqobil yo'l (GAS-native):** Excel yuklash o'rniga, kodni deploy qilib bo'lgach Apps Script
muharririda `seedSampleData()` funksiyasini bir marta ishga tushiring — u barcha sheetlarni yaratadi
va aynan shu demo ma'lumotlar bilan to'ldiradi (`src/setup/SeedData.js`).

### 1. Talablar
- [Node.js](https://nodejs.org/) (lokal tooling uchun)
- [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
- Google hisob qaydnomasi va yangi yoki mavjud Google Sheets fayli

### 2. clasp orqali ulanish

```bash
# Google hisobiga kirish
clasp login

# Yangi Apps Script loyihasini Google Sheets'ga bog'lab yaratish (yoki mavjudini ulash)
clasp create --type sheets --title "DKP Arizalarni Boshqaruv Tizimi"
```

`.clasp.json.example` faylidan nusxa oling va `scriptId` ni kiriting:

```bash
cp .clasp.json.example .clasp.json
# .clasp.json ichidagi scriptId ni o'z loyihangiznikiga almashtiring
```

### 3. Kodni yuklash

```bash
clasp push          # yoki: npm run push
```

### 4. Sozlash

Apps Script muharririda **Script Properties** ga spreadsheet ID sini qo'shing:

| Property | Qiymat |
|----------|--------|
| `DKP_SPREADSHEET_ID` | Google Sheets fayli ID si |

So'ngra **bir marta** quyidagini ishga tushiring (barcha sheetlarni yaratadi):

```js
Database.setupAll();
```

### 5. Web App sifatida deploy qilish

Apps Script muharririda: **Deploy → New deployment → Web app**.

`appsscript.json` da quyidagi sozlamalar oldindan belgilangan:

```json
{
  "timeZone": "Asia/Tashkent",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

Deploy tugagach Web App URL hosil bo'ladi — foydalanuvchilar shu havola orqali tizimga kiradi.

---

## Lokal ishlab chiqish (lint va test)

> Kod Google serverlarida ishlaydi, ammo sof mantiqiy modullar (kalendar, security, validator)
> lokal muhitda tekshiriladi.

```bash
# Linting (ESLint)
npm run lint

# Unit testlar (Node built-in test runner)
npm test
```

Joriy holatda **22 ta test** mavjud va barchasi muvaffaqiyatli o'tadi; ESLint **0 ta muammo**
qaytaradi.

---

## Xavfsizlik

- **Parol hash**: salt + `SHA-256` (`Security.hashPassword`).
- **Sessiya tokeni** va **CSRF tokeni** generatsiyasi.
- **Server validatsiyasi** va **rol tekshiruvi** — majburiy.
- **HTML escape** (`Security.escapeHtml`) — XSS oldini olish.
- **Input sanitization** (`Security.sanitizeText`) — boshqaruv belgilarini tozalash, uzunlik chegarasi.
- **Parol siyosati** (`Security.validatePasswordStrength`) — minimal uzunlik + harf/raqam.
- **Bloklash**: muvaffaqiyatsiz kirishlar soni va vaqtinchalik lockout (`CONFIG.SECURITY`).

---

## Optimizatsiya (50 000+ yozuv)

Tizim katta hajmdagi ma'lumot bilan barqaror ishlashi uchun qat'iy qoidalar joriy etilgan:

- `SpreadsheetApp` chaqiriqlari **minimal**; sheet va spreadsheet handle'lari memoizatsiya qilinadi.
- `getValues()` — **bitta** chaqiriq; `setValues()` — **bitta** chaqiriq (`BaseRepository`).
- **Cell-by-cell yozish taqiqlanadi** (faqat jurnal qatorlari bundan mustasno).
- **Batch / Array processing**, in-memory **`Map` indekslari** (nested loop o'rniga).
- **Server-side filtering** (client-side emas).
- **`CacheService`** (gzip bilan), **`PropertiesService`**, **`LockService`**.
- Reja: Pagination, Lazy Loading, Virtual Table, Debounce Search, Chunk/Async processing,
  Trigger Queue (eksport uchun).

---

## Loyiha holati va Roadmap

| Faza | Tarkib | Holat |
|------|--------|-------|
| **1. Foundation** | Config, Schema, Biznes kalendar, Security, Repository, Utils, testlar | ✅ **Bajarildi** |
| 2. Auth | `AuthService`, login/logout, sessiya, parol almashtirish | ⏳ Rejada |
| 3. Import | Backup → archive → load → process → stats, transaction + rollback | ⏳ Rejada |
| 4. Business Logic | Kalendar + service/area qoidalari → status, muddat, SLA %/rang | ⏳ Rejada |
| 5. Statistics + Finance | Statistik va moliyaviy ko'rsatkichlar | ⏳ Rejada |
| 6. Dashboard | Rollarga oid dashboardlar, KPI, Charts, Top 10, Ranking | ⏳ Rejada |
| 7. Filtrlar | Cascading filterlar (viloyat→tuman→filial...) | ⏳ Rejada |
| 8. Export | Excel/PDF/CSV/Print, background queue | ⏳ Rejada |
| 9. UI | Material Design, Dark/Light, responsive, toast, shortcuts | ⏳ Rejada |

> ⚠️ **Muhim:** Import va Business Logic fazalari standart Excel hisobotining **aniq ustun
> tuzilmasiga** bog'liq. `DATA` jadvalidagi joriy ustunlar — vaqtinchalik (placeholder) bo'lib,
> haqiqiy Excel header'lari bilan moslashtirilishi kerak.

---

## Litsenziya

UNLICENSED — ichki foydalanish uchun (Davlat kadastri).
