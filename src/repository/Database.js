/**
 * @file Database.js
 * @fileoverview Thin access layer over the bound spreadsheet. Because the
 *               Apps Script project is bound to a single Google Sheets file,
 *               the spreadsheet is simply the active one. Handles are memoized
 *               per execution. Apps Script only.
 */

const Database = (function () {
  /** @type {Spreadsheet} */
  let ssCache = null;

  /**
   * Returns the bound (active) spreadsheet.
   * @return {!Spreadsheet} The spreadsheet.
   */
  function getSpreadsheet() {
    if (!ssCache) {
      ssCache = SpreadsheetApp.getActiveSpreadsheet();
    }
    return ssCache;
  }

  /**
   * Resolves the report sheet: the configured sheet name, or the active sheet
   * when no name is configured.
   * @return {!Sheet} The report sheet.
   */
  function getReportSheet() {
    const ss = getSpreadsheet();
    const name = CONFIG.REPORT.SHEET_NAME;
    if (name) {
      const sheet = ss.getSheetByName(name);
      if (!sheet) {
        throw new Error('Hisobot varag\'i topilmadi: ' + name);
      }
      return sheet;
    }
    return ss.getActiveSheet();
  }

  /**
   * Lists user-visible sheet names (for letting the user pick the report tab).
   * @return {!Array<string>} Sheet names.
   */
  function listSheetNames() {
    return getSpreadsheet().getSheets().map(function (s) {
      return s.getName();
    });
  }

  /**
   * Runs `fn` inside a document lock (serializes concurrent access).
   * @param {function():T} fn Critical-section function.
   * @return {T} The function's return value.
   * @template T
   */
  function withLock(fn) {
    const lock = LockService.getDocumentLock();
    lock.waitLock(20000);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }

  /** Clears memoized handles. */
  function resetCache() {
    ssCache = null;
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getReportSheet: getReportSheet,
    listSheetNames: listSheetNames,
    withLock: withLock,
    resetCache: resetCache,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Database };
}
