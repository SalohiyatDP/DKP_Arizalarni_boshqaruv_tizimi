# DKP Hisobot Tahlili

> Bitta **Google Sheets** fayli + unga **bog'langan (bound) Google Apps Script** loyihasi.
> Faqat `.gs` va `.html` fayllaridan iborat — klassik Apps Script tuzilmasi.

Tizimning yagona maqsadi — varaqdagi **tayyor hisobot jadvalini** qulay **filterlash** va
**statistikani** (KPI, grafiklar, reyting, jadval) ko'rsatuvchi interfeys taqdim etish.
Hisobot ustunlari **avtomatik aniqlanadi** (qat'iy sxema yo'q).

---

## Fayllar tuzilmasi

Loyiha to'liq **flat** (papkasiz) — Apps Script muharririga to'g'ridan-to'g'ri mos:

| Fayl | Turi | Vazifa |
|------|------|--------|
| `Code.gs` | server | `doGet` (web app), `onOpen` (menyu), `include`, API endpointlar (`apiGetInitialState`, `apiRunQuery`) |
| `Config.gs` | server | Tizim/hisobot/SLA/kalendar sozlamalari (funksiya getterlar) |
| `Utils.gs` | server | `successResponse`/`errorResponse`, `escapeHtml`, `sanitizeText`, formatlash |
| `WorkingDays.gs` | server | Ish-kuni kalendari (shanba/yakshanba + bayramlar hisobga olinmaydi) |
| `Report.gs` | server | Hisobotni dinamik o'qish + ustun turlarini aniqlash/tasniflash |
| `Filter.gs` | server | Server tomonidagi filterlash + cascading variantlar |
| `Statistics.gs` | server | KPI, group-by, top-N, oylik trend |
| `index.html` | client | Sahifa karkasi (`include('style')`, `include('script')`) |
| `style.html` | client | CSS stillari |
| `script.html` | client | Frontend modullari (Loading, Toast, API, Dashboard) |

> `.gs` fayllari Apps Script'da **bitta global scope**ga birlashadi — barcha funksiyalar
> global. `<?!= include('...') ?>` template pattern orqali CSS va JS bosh sahifaga qo'shiladi.

---

## Qanday ishlaydi

1. Apps Script loyihasi Google Sheets fayliga **bog'langan**.
2. Faylni ochganda menyuga **DKP Tahlil → Tahlil panelini ochish** qo'shiladi (dialog),
   yoki loyiha **Web App** sifatida deploy qilinadi (`doGet`).
3. Interfeys server'dan hisobotni **bir marta** o'qiydi, ustun turlarini aniqlaydi va filtrlarni quradi.
4. Foydalanuvchi filterlaydi/qidiradi → `google.script.run` orqali `apiRunQuery` chaqiriladi,
   server **server tomonida** filterlab, statistika va grafik ma'lumotini JSON ko'rinishda qaytaradi.

```
  Google Sheets (tayyor hisobot)  ──bound──▶  Apps Script (.gs)
        ▲                                          │
        │  index.html + style.html + script.html   │
        └────── google.script.run (apiXxx → JSON) ──┘
```

---

## Imkoniyatlar

- **Cascading filterlar** — har bir kategoriya ustuni uchun ko'p tanlovli (checkbox) dropdown.
- **Sana oralig'i** va **raqamli oraliq (min/max)** filtrlari.
- **Tezkor global qidiruv** (debounce bilan).
- **KPI kartalar**, **Google Charts** (doiraviy, ustunli, trend), **Top 10** reyting.
- **Sahifalanadigan, saralanadigan jadval** (server-side).
- Material uslubidagi, responsive interfeys; loading va toast.

---

## O'rnatish

### A) Tezkor (nusxa ko'chirish)
1. Google Sheets faylini oching (1-qator — sarlavhalar bo'lgan tayyor hisobot).
2. **Extensions → Apps Script**.
3. Har bir `.gs` va `.html` faylni muharrirda yarating va ushbu repodagi mazmunni nusxa qiling
   (`.html` fayllar uchun: **File → New → HTML**, nomini `index`, `style`, `script` qiling).
4. Saqlang.

### B) clasp orqali
```bash
npm install -g @google/clasp
clasp login
# Sheets ichidagi bound loyihaning scriptId sini Project Settings'dan oling
clasp clone <SCRIPT_ID>
# fayllarni shu repodagilar bilan almashtiring
clasp push
```

### Ishga tushirish
- **Varaq ichida:** faylni qayta yuklang → **DKP Tahlil → Tahlil panelini ochish**.
- **Web App:** **Deploy → New deployment → Web app** (Execute as: *Me*, Access: kerakli darajada) → URL ochiladi.

---

## Sozlash

Asosiy sozlamalar `Config.gs` ichida (funksiya getterlar):

| Funksiya / kalit | Tavsifi |
|------------------|---------|
| `getReportConfig().SHEET_NAME` | Hisobot varag'i nomi. `''` bo'lsa — **aktiv varaq** |
| `getReportConfig().HEADER_ROW` | Sarlavha qatori (standart: 1) |
| `getReportConfig().MAX_DIMENSION_CARDINALITY` | Ustun dropdownga aylanishi uchun maks. noyob qiymatlar |
| `getReportConfig().PAGE_SIZE` | Jadval sahifasidagi yozuvlar |
| `getSystemConfig()` | Nom, sarlavha, vaqt mintaqasi, sana formati |
| `getChartPalette()`, `getSlaConfig()` | Grafik ranglari va SLA chegaralari |

---

## Ustunlarni avtomatik aniqlash

`Report.gs` birinchi qatorni sarlavha sifatida oladi va har bir ustun turini namuna olib aniqlaydi:
- **number** → KPI/agregatsiya uchun *ko'rsatkich*;
- **date** → trend va sana oralig'i filtri;
- **string** → *o'lcham*: noyob qiymatlar kam bo'lsa → filtr dropdown, aks holda global qidiruvga kiradi.

Shu sababli maxsus sxema talab qilinmaydi — ustunlar o'zgarsa ham tizim moslashadi.

---

## Eslatma

Barcha hisob-kitob **server tomonida JavaScript**da bajariladi; Google Sheets ichida formula
ishlatilmaydi. Hisobot **bitta `getValues()`** bilan o'qiladi, filtr/agregatsiya in-memory
amalga oshadi, jadval esa server-side sahifalanadi — bu katta hajmli hisobotlarda ham barqaror ishlash uchun.
