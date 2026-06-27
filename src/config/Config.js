/**
 * @file Config.js
 * @fileoverview Central configuration for the DKP Applications Management System.
 *               Single source of truth for every constant, enum, sheet name,
 *               role, SLA color and system parameter. No magic numbers are
 *               allowed anywhere else in the codebase — reference CONFIG instead.
 *
 * NOTE: This object is deeply frozen so runtime code cannot mutate configuration.
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
    NAME: 'DKP Arizalarni Boshqaruv Tizimi',
    SHORT_NAME: 'DKP',
    VERSION: '0.1.0',
    TIMEZONE: 'Asia/Tashkent',
    LOCALE: 'uz-UZ',
    DATE_FORMAT: 'dd.MM.yyyy',
    DATETIME_FORMAT: 'dd.MM.yyyy HH:mm:ss',
  },

  /** Every sheet (tab) name used as the database layer. */
  SHEETS: {
    LOGIN: 'LOGIN',
    EMPLOYEES: 'EMPLOYEES',
    HOLIDAYS: 'HOLIDAYS',
    SERVICE_RULES: 'SERVICE_RULES',
    AREA_RULES: 'AREA_RULES',
    SETTINGS: 'SETTINGS',
    RAW_DATA: 'RAW_DATA',
    DATA: 'DATA',
    STATISTICS: 'STATISTICS',
    MONTHLY_STATS: 'MONTHLY_STATS',
    FINANCE: 'FINANCE',
    EXPORT_QUEUE: 'EXPORT_QUEUE',
    LOGIN_LOG: 'LOGIN_LOG',
    ACTION_LOG: 'ACTION_LOG',
    IMPORT_LOG: 'IMPORT_LOG',
    BACKUP: 'BACKUP',
  },

  /** User roles. Lower LEVEL == broader authority. */
  ROLES: {
    ADMIN: 'ADMIN',
    REGION: 'REGION',
    DISTRICT: 'DISTRICT',
    ENGINEER: 'ENGINEER',
  },

  /** Hierarchy level per role; used for permission scoping. */
  ROLE_LEVEL: {
    ADMIN: 0,
    REGION: 1,
    DISTRICT: 2,
    ENGINEER: 3,
  },

  /** Account status values for the LOGIN sheet. */
  USER_STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
  },

  /** Application processing status (computed by business logic). */
  PROCESS_STATUS: {
    IN_PROGRESS: 'JARAYONDA',
    DONE: 'BAJARILGAN',
    OVERDUE: 'MUDDATI_OTGAN',
    DUE_TODAY: 'BUGUN_TUGAYDI',
  },

  /** Payment status. */
  PAYMENT_STATUS: {
    PAID: 'TOLANGAN',
    PENDING: 'TOLOV_KUTILMOQDA',
  },

  /** Object habitability classification. */
  OBJECT_TYPE: {
    RESIDENTIAL: 'TURAR',
    NON_RESIDENTIAL: 'NOTURAR',
  },

  /**
   * SLA color thresholds based on remaining-time percentage.
   * `minPercent` is inclusive lower bound of remaining time.
   * BLACK is reserved for overdue applications (percent < 0).
   */
  SLA: {
    COLORS: {
      GREEN: '#2e7d32',
      YELLOW: '#f9a825',
      ORANGE: '#ef6c00',
      RED: '#c62828',
      BLACK: '#000000',
    },
    THRESHOLDS: [
      { key: 'GREEN', minPercent: 60 },
      { key: 'YELLOW', minPercent: 40 },
      { key: 'ORANGE', minPercent: 20 },
      { key: 'RED', minPercent: 0 },
      { key: 'BLACK', minPercent: -Infinity },
    ],
  },

  /** Business calendar configuration. */
  CALENDAR: {
    /** JS getDay() values that are always non-working (0=Sun, 6=Sat). */
    WEEKEND_DAYS: [0, 6],
    /** Maximum iterations guard when scanning forward for working days. */
    MAX_DAY_SCAN: 3650,
  },

  /** Security parameters. */
  SECURITY: {
    HASH_ALGORITHM: 'SHA_256',
    SALT_BYTE_LENGTH: 16,
    SESSION_TOKEN_BYTE_LENGTH: 32,
    SESSION_TTL_MINUTES: 120,
    MAX_FAILED_LOGINS: 5,
    LOCKOUT_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 8,
    CSRF_TOKEN_BYTE_LENGTH: 24,
  },

  /** Performance / batching parameters for 50k+ rows. */
  PERFORMANCE: {
    CHUNK_SIZE: 5000,
    PAGE_SIZE: 50,
    CACHE_TTL_SECONDS: 600,
    LOCK_WAIT_MS: 30000,
    SEARCH_DEBOUNCE_MS: 300,
    MAX_EXPORT_ROWS_SYNC: 2000,
  },

  /** PropertiesService keys. */
  PROP_KEYS: {
    SPREADSHEET_ID: 'DKP_SPREADSHEET_ID',
    SCHEMA_VERSION: 'DKP_SCHEMA_VERSION',
    LAST_IMPORT_ID: 'DKP_LAST_IMPORT_ID',
  },

  /** Cache key prefixes. */
  CACHE_KEYS: {
    SESSION_PREFIX: 'sess_',
    STATS_PREFIX: 'stats_',
    FILTER_PREFIX: 'filter_',
  },

  /** Export formats. */
  EXPORT_FORMATS: {
    EXCEL: 'XLSX',
    PDF: 'PDF',
    CSV: 'CSV',
  },

  /** Export queue job status. */
  EXPORT_STATUS: {
    QUEUED: 'QUEUED',
    PROCESSING: 'PROCESSING',
    DONE: 'DONE',
    FAILED: 'FAILED',
  },

  /** Log categories for the ACTION_LOG sheet. */
  LOG_TYPES: {
    LOGIN: 'LOGIN',
    ACTION: 'ACTION',
    IMPORT: 'IMPORT',
    EXPORT: 'EXPORT',
    ERROR: 'ERROR',
  },

  /** Import transaction states (for rollback support). */
  IMPORT_STATUS: {
    STARTED: 'STARTED',
    BACKED_UP: 'BACKED_UP',
    ARCHIVED: 'ARCHIVED',
    LOADED: 'LOADED',
    PROCESSED: 'PROCESSED',
    COMPLETED: 'COMPLETED',
    ROLLED_BACK: 'ROLLED_BACK',
    FAILED: 'FAILED',
  },
});

// Node/test interop: harmless no-op inside the Apps Script runtime.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, deepFreeze_ };
}
