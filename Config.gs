/**
 * Config.gs - Konfiguratsiya moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Barcha tizim sozlamalari shu modulda markazlashtirilgan holda saqlanadi.
 * Hisobot ustunlari dinamik aniqlangani uchun bu yerda qat'iy sxema yo'q —
 * faqat qaysi varaqni o'qish va tahlil parametrlari belgilanadi.
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
    VERSION: '1.0.0',
    TIMEZONE: 'Asia/Tashkent',
    LOCALE: 'uz-UZ',
    DATE_FORMAT: 'dd.MM.yyyy'
  };
}

/**
 * Hisobotni o'qish konfiguratsiyasi.
 *  - SHEET_NAME: '' bo'lsa aktiv varaq ishlatiladi.
 * @returns {Object} Hisobot sozlamalari.
 */
function getReportConfig() {
  return {
    SHEET_NAME: '',
    HEADER_ROW: 1,
    TYPE_SAMPLE_ROWS: 300,
    MAX_DIMENSION_CARDINALITY: 300,
    MAX_FILTER_OPTIONS: 500,
    PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200
  };
}

/**
 * Ustun turlari identifikatorlari.
 * @returns {Object}
 */
function getColumnTypes() {
  return { NUMBER: 'number', DATE: 'date', STRING: 'string' };
}

/**
 * SLA (muddat) rang chegaralari — agar hisobotda qolgan kun/foiz ustuni bo'lsa.
 * @returns {Object}
 */
function getSlaConfig() {
  return {
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
 * Biznes kalendar sozlamalari.
 * @returns {Object}
 */
function getCalendarConfig() {
  return {
    WEEKEND_DAYS: [0, 6],
    MAX_DAY_SCAN: 3650
  };
}
