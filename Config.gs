/**
 * Config.gs - Konfiguratsiya moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Barcha tizim sozlamalari shu modulda markazlashtirilgan holda saqlanadi.
 * Hisobot ustunlari dinamik aniqlangani uchun bu yerda qat'iy sxema yo'q —
 * faqat qaysi varaqni o'qish, sarlavhani aniqlash va biznes qoidalari belgilanadi.
 *
 * Hech qaysi qiymat kodga "magic number" sifatida yozilmagan — barchasi shu yerda.
 */

/**
 * Aktiv (bog'langan) spreadsheet obyektini olish.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Tizim konfiguratsiyasi.
 * @returns {Object} Tizim sozlamalari.
 */
function getSystemConfig() {
  return {
    APP_NAME: 'DKP Hisobot Tahlili',
    APP_SUBTITLE: 'Tayyor hisobotni filterlash va statistika',
    MENU_TITLE: 'DKP Tahlil',
    VERSION: '2.0.0',
    TIMEZONE: 'Asia/Tashkent',
    LOCALE: 'uz-UZ',
    DATE_FORMAT: 'dd.MM.yyyy',
    CACHE_SECONDS: 300
  };
}

/**
 * Hisobotni o'qish konfiguratsiyasi.
 *  - SHEET_NAME: '' bo'lsa aktiv varaq ishlatiladi.
 *  - HEADER_ROW: agar AUTO_DETECT_HEADER=false bo'lsa, qat'iy sarlavha qatori.
 *  - AUTO_DETECT_HEADER: standart hisobotda sarlavha 1-qatorda emas (sarlavha/sana
 *    qatorlari bor) — shuning uchun sarlavha qatori avtomatik topiladi.
 * @returns {Object} Hisobot sozlamalari.
 */
function getReportConfig() {
  return {
    SHEET_NAME: '',
    AUTO_DETECT_HEADER: true,
    HEADER_ROW: 3,
    HEADER_SCAN_ROWS: 12,
    MIN_HEADER_KEYWORDS: 2,
    PRIMARY_COLUMN_COUNT: 5,
    MIN_PRIMARY_FILLED: 2,
    TYPE_SAMPLE_ROWS: 300,
    MAX_DIMENSION_CARDINALITY: 300,
    MAX_FILTER_OPTIONS: 500,
    PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200,
    MAX_EXPORT_ROWS: 100000
  };
}

/**
 * Standart hisobotni tanib olish uchun sarlavha kalit so'zlari (normallashtirilgan,
 * kichik harf). Sarlavha qatori shu so'zlardan eng ko'pini o'z ichiga olgan qator.
 * @returns {Array<string>}
 */
function getHeaderKeywords() {
  return [
    'viloyat', 'tuman', 'obyekt turi', 'ariza turi', 'ariza raqami',
    'kadastr raqami', 'tranzaksiya', 'buyurtmachi', 'pnfl',
    'ariza kelib tushgan', 'to\'lov holati', 'ijrochi muhandis'
  ];
}

/**
 * Ustun turlari identifikatorlari.
 * @returns {Object}
 */
function getColumnTypes() {
  return { NUMBER: 'number', DATE: 'date', STRING: 'string' };
}

/**
 * Hisobotning ma'lum ustunlarini topish uchun kalit so'zlar (label ichida qidiriladi).
 * Har bir mantiqiy maydon bir nechta ehtimoliy nomga ega bo'lishi mumkin.
 * Hisobot ustunlari o'zgarsa — shu yerni moslang.
 * @returns {Object}
 */
function getColumnMap() {
  return {
    region: ['viloyat'],
    district: ['tuman'],
    objectType: ['obyekt turi'],
    applicationType: ['ariza turi'],
    systemStatus: ['tizimdagi holati'],
    paymentStatus: ['to\'lov holati'],
    startDate: ['ariza kelib tushgan sana'],
    invoiceDate: ['to\'lovga chiqarilgan sana'],
    paidDate: ['to\'langan sana'],
    lastProcessDate: ['oxirgi jarayon sana'],
    transactionType: ['tranzaksiya turi'],
    engineer: ['ijrochi muhandis'],
    rejectReason: ['rad sababi'],
    // Moliyaviy: invoys (hisoblangan) va to'langan summalar
    invoiceSums: ['kadastr to\'lov summasi', 'registratsiya to\'lov summasi', 'manzil to\'lov summasi'],
    paidSums: ['kadastr to\'langan summasi', 'registratsiya to\'langan summasi', 'manzil to\'langan summasi']
  };
}

/**
 * Hosil qilinadigan (derived) ustunlar nomlari — bitta joyda.
 * @returns {Object}
 */
function getDerivedLabels() {
  return {
    RESIDENTIAL: 'Turar / Noturar',
    APP_STATUS: 'Ariza holati',
    PAYMENT_STATE: 'To\'lov holati (hisoblangan)',
    DEADLINE_STATE: 'Muddat holati',
    SLA_STATE: 'SLA holati',
    INVOICE_TOTAL: 'Jami hisoblangan summa',
    PAID_TOTAL: 'Jami to\'langan summa',
    DEBT_TOTAL: 'To\'lanmagan (qarz) summa',
    ELAPSED_WD: 'O\'tgan ish kunlari',
    ALLOWED_WD: 'Belgilangan muddat (ish kuni)',
    REMAINING_WD: 'Qolgan ish kuni',
    SLA_PERCENT: 'SLA foizi'
  };
}

/**
 * Ariza holatini aniqlash kalit so'zlari (Tizimdagi holati ustuni asosida).
 * Tartib muhim: avval "rad", keyin "bajarilgan".
 * @returns {Object}
 */
function getStatusRules() {
  return {
    DONE: { label: 'Bajarilgan', keywords: ['bajar', 'yakun', 'tugat', 'tasdiqlan', 'tayyor', 'berildi', 'topshir'] },
    REJECTED: { label: 'Rad etilgan', keywords: ['rad', 'bekor', 'qaytar'] },
    IN_PROGRESS: { label: 'Jarayonda', keywords: [] }
  };
}

/**
 * Turar/Noturar aniqlash kalit so'zlari.
 * @returns {Object}
 */
function getResidentialRules() {
  return {
    RESIDENTIAL: { label: 'Turar', keywords: ['turar joy', 'turar-joy', 'turarjoy', 'turar'] },
    NON_RESIDENTIAL: { label: 'Noturar', keywords: ['noturar', 'no turar', 'turar bo\'lmagan'] },
    UNKNOWN: { label: 'Aniqlanmagan' }
  };
}

/**
 * Hisoblangan to'lov holati nomlari.
 * @returns {Object}
 */
function getPaymentStateLabels() {
  return {
    PAID: 'To\'langan',
    PARTIAL: 'Qisman to\'langan',
    PENDING: 'To\'lov kutilmoqda',
    NONE: 'To\'lovsiz'
  };
}

/**
 * Xizmat (muddat) qoidalari: ariza/tranzaksiya turiga qarab belgilangan ish kuni.
 * "rules" massivi yuqoridan pastga tekshiriladi (label ichida "match" bo'lsa).
 * Mos kelmasa DEFAULT_WORKING_DAYS ishlatiladi.
 * @returns {Object}
 */
function getServiceRules() {
  return {
    DEFAULT_WORKING_DAYS: 15,
    RULES: [
      { match: 'kadastr pasport', days: 15 },
      { match: 'ro\'yxatdan o\'tkazish', days: 7 },
      { match: 'manzil', days: 5 },
      { match: 'o\'zgartirish', days: 10 }
    ]
  };
}

/**
 * SLA (muddat) rang chegaralari — qolgan muddat foiziga qarab.
 * minPercent: shu foizdan yuqori (yoki teng) bo'lsa shu rang.
 * @returns {Object}
 */
function getSlaConfig() {
  return {
    LABELS: {
      GREEN: 'Yashil (xavfsiz)',
      YELLOW: 'Sariq (e\'tibor)',
      ORANGE: 'To\'q sariq (ogohlantirish)',
      RED: 'Qizil (kritik)',
      BLACK: 'Qora (muddati o\'tgan)'
    },
    COLORS: {
      GREEN: '#2e7d32',
      YELLOW: '#f9a825',
      ORANGE: '#ef6c00',
      RED: '#c62828',
      BLACK: '#212121'
    },
    THRESHOLDS: [
      { key: 'GREEN', minPercent: 60 },
      { key: 'YELLOW', minPercent: 40 },
      { key: 'ORANGE', minPercent: 20 },
      { key: 'RED', minPercent: 0 },
      { key: 'BLACK', minPercent: -Infinity }
    ]
  };
}

/**
 * Diagrammalar uchun rang palitrasi.
 * @returns {Array<string>}
 */
function getChartPalette() {
  return [
    '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
    '#00acc1', '#ff7043', '#5e35b1', '#43a047', '#fb8c00'
  ];
}

/**
 * Biznes kalendar sozlamalari (dam olish kunlari va bayramlar).
 * HOLIDAYS: takrorlanuvchi (recurring=true → har yili MM-dd) yoki qat'iy sana.
 * Diniy bayramlar (Ramazon/Qurbon hayit) har yili o'zgaradi — kerak bo'lsa
 * shu ro'yxatga qat'iy sana sifatida qo'shing.
 * @returns {Object}
 */
function getCalendarConfig() {
  return {
    WEEKEND_DAYS: [0, 6],
    MAX_DAY_SCAN: 3650,
    HOLIDAYS: [
      { date: '2026-01-01', recurring: true, name: 'Yangi yil' },
      { date: '2026-03-08', recurring: true, name: 'Xotin-qizlar kuni' },
      { date: '2026-03-21', recurring: true, name: 'Navro\'z bayrami' },
      { date: '2026-05-09', recurring: true, name: 'Xotira va qadrlash kuni' },
      { date: '2026-09-01', recurring: true, name: 'Mustaqillik kuni' },
      { date: '2026-12-08', recurring: true, name: 'Konstitutsiya kuni' }
    ]
  };
}
