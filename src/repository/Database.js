/**
 * @file Database.js
 * @fileoverview Spreadsheet bootstrap layer. Resolves the backing spreadsheet,
 *               lazily creates sheets from SCHEMA, and exposes low-level sheet
 *               access. Apps Script only.
 *
 * Optimization principles enforced here:
 *   - The Spreadsheet handle is memoized per execution.
 *   - Sheet handles are memoized in a per-execution Map.
 *   - Header rows are written exactly once on creation.
 */

 

const Database = (function () {
  /** @type {Spreadsheet} */
  let ssCache = null;
  /** @type {!Object<string, Sheet>} */
  const sheetCache = {};

  /**
   * Resolves the backing spreadsheet. Prefers an explicit ID stored in
   * PropertiesService, otherwise falls back to the bound active spreadsheet.
   * @return {!Spreadsheet} The spreadsheet.
   */
  function getSpreadsheet() {
    if (ssCache) {
      return ssCache;
    }
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty(CONFIG.PROP_KEYS.SPREADSHEET_ID);
    ssCache = id
      ? SpreadsheetApp.openById(id)
      : SpreadsheetApp.getActiveSpreadsheet();
    if (!ssCache) {
      throw new Error('Spreadsheet topilmadi. ' +
        CONFIG.PROP_KEYS.SPREADSHEET_ID + ' Script Property o\'rnatilmagan.');
    }
    return ssCache;
  }

  /**
   * Returns a sheet by name, creating and initializing it from SCHEMA when it
   * does not yet exist.
   * @param {string} sheetName One of CONFIG.SHEETS.*
   * @return {!Sheet} The sheet.
   */
  function getSheet(sheetName) {
    if (sheetCache[sheetName]) {
      return sheetCache[sheetName];
    }
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = createSheet_(ss, sheetName);
    }
    sheetCache[sheetName] = sheet;
    return sheet;
  }

  /**
   * Creates a sheet and writes its frozen header row from SCHEMA.
   * @param {!Spreadsheet} ss Spreadsheet.
   * @param {string} sheetName Sheet name.
   * @return {!Sheet} The created sheet.
   */
  function createSheet_(ss, sheetName) {
    const sheet = ss.insertSheet(sheetName);
    const headers = getHeaderRow(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }

  /**
   * Ensures every sheet defined in SCHEMA exists. Idempotent. Run once during
   * installation/setup.
   * @return {!Array<string>} Names of sheets that were created.
   */
  function setupAll() {
    const ss = getSpreadsheet();
    const created = [];
    Object.keys(SCHEMA).forEach(function (sheetName) {
      if (!ss.getSheetByName(sheetName)) {
        createSheet_(ss, sheetName);
        created.push(sheetName);
      }
    });
    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.PROP_KEYS.SCHEMA_VERSION, CONFIG.APP.VERSION);
    return created;
  }

  /**
   * Acquires the script lock for the duration of `fn`, then releases it.
   * Serializes mutating operations (import, writes) across concurrent users.
   * @param {function():T} fn Critical-section function.
   * @return {T} The function's return value.
   * @template T
   */
  function withLock(fn) {
    const lock = LockService.getScriptLock();
    lock.waitLock(CONFIG.PERFORMANCE.LOCK_WAIT_MS);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Clears memoized handles (useful in tests or after structural changes).
   */
  function resetCache() {
    ssCache = null;
    Object.keys(sheetCache).forEach(function (k) {
      delete sheetCache[k];
    });
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    setupAll: setupAll,
    withLock: withLock,
    resetCache: resetCache,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Database };
}
