/**
 * @file Config.js
 * @fileoverview Central, deeply-frozen configuration for the DKP report
 *               analytics environment. Single source of truth — no magic
 *               numbers elsewhere.
 *
 * Scope: a single Google Sheets file with an Apps Script bound (integrated)
 * environment. The add-on reads the existing report sheet, lets the user filter
 * it conveniently and shows statistics. Column structure is detected
 * dynamically, so the only report-specific setting is which sheet to read.
 */

 

/**
 * Recursively freezes an object and all nested objects/arrays.
 * @param {!Object} obj Object to freeze.
 * @return {!Object} The same object, deeply frozen.
 */
function deepFreeze_(obj) {
  Object.keys(obj).forEach(function (key) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze_(value);
    }
  });
  return Object.freeze(obj);
}

const CONFIG = deepFreeze_({
  /** Application metadata. */
  APP: {
    NAME: 'DKP Hisobot Tahlili',
    MENU_TITLE: '📊 DKP Tahlil',
    VERSION: '0.2.0',
    TIMEZONE: 'Asia/Tashkent',
    LOCALE: 'uz-UZ',
    DATE_FORMAT: 'dd.MM.yyyy',
  },

  /**
   * Which sheet holds the ready report and how to read it.
   * SHEET_NAME = '' means "use the active sheet" (auto-detect).
   */
  REPORT: {
    SHEET_NAME: '',
    HEADER_ROW: 1,
    /** Rows sampled to infer each column's data type. */
    TYPE_SAMPLE_ROWS: 300,
    /** A column is offered as a filter dropdown only if its distinct value
     *  count is at or below this threshold (otherwise it is free-text search). */
    MAX_DIMENSION_CARDINALITY: 300,
    /** Hard cap on options returned per filter to keep payloads small. */
    MAX_FILTER_OPTIONS: 500,
  },

  /** Column-type identifiers produced by dynamic detection. */
  COLUMN_TYPE: {
    NUMBER: 'number',
    DATE: 'date',
    STRING: 'string',
  },

  /** Filter operators understood by FilterService. */
  FILTER_TYPE: {
    IN: 'in',
    DATE_RANGE: 'dateRange',
    NUMBER_RANGE: 'numberRange',
    SEARCH: 'search',
  },

  /** Aggregation modes for StatisticsService. */
  AGG: {
    COUNT: 'count',
    SUM: 'sum',
    AVG: 'avg',
  },

  /**
   * SLA color thresholds based on remaining-time percentage. Used only when the
   * report exposes a deadline/remaining column the user maps to SLA.
   * BLACK is reserved for overdue (percent < 0).
   */
  SLA: {
    COLORS: {
      GREEN: '#2e7d32',
      YELLOW: '#f9a825',
      ORANGE: '#ef6c00',
      RED: '#c62828',
      BLACK: '#212121',
    },
    THRESHOLDS: [
      { key: 'GREEN', minPercent: 60 },
      { key: 'YELLOW', minPercent: 40 },
      { key: 'ORANGE', minPercent: 20 },
      { key: 'RED', minPercent: 0 },
      { key: 'BLACK', minPercent: -Infinity },
    ],
  },

  /** Chart palette (Material colors) for the dashboard. */
  CHART_PALETTE: [
    '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
    '#00acc1', '#ff7043', '#5e35b1', '#43a047', '#fb8c00',
  ],

  /** Business calendar configuration. */
  CALENDAR: {
    /** JS getDay() values that are always non-working (0=Sun, 6=Sat). */
    WEEKEND_DAYS: [0, 6],
    /** Maximum iterations guard when scanning forward for working days. */
    MAX_DAY_SCAN: 3650,
  },

  /** Performance parameters. */
  PERFORMANCE: {
    PAGE_SIZE: 50,
    CACHE_TTL_SECONDS: 300,
    SEARCH_DEBOUNCE_MS: 300,
    /** Max rows sent to the client table at once (table is paginated). */
    MAX_TABLE_ROWS: 5000,
  },

  /** UI dialog dimensions (pixels). */
  UI: {
    DIALOG_WIDTH: 1200,
    DIALOG_HEIGHT: 800,
  },

  /** Cache key prefixes. */
  CACHE_KEYS: {
    META_PREFIX: 'meta_',
    RECORDS_PREFIX: 'rec_',
  },
});

// Node/test interop: harmless no-op inside the Apps Script runtime.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, deepFreeze_ };
}
