/**
 * @file BaseRepository.js
 * @fileoverview Generic, schema-driven repository implementing the bulk
 *               read/write contract required for 50k+ rows:
 *
 *   - readAll(): exactly ONE getValues() call for the whole data range.
 *   - replaceAll()/append(): exactly ONE setValues() call.
 *   - No cell-by-cell access. No spreadsheet formulas.
 *   - Object <-> row mapping is driven entirely by SCHEMA, with per-column
 *     type coercion on the way in and out.
 *   - indexBy() builds an in-memory Map for O(1) joins instead of nested loops.
 *
 * Apps Script only (depends on Database + SpreadsheetApp ranges).
 */

 

const BaseRepository = (function () {
  const HEADER_ROWS = 1;

  /**
   * Coerces a stored cell value into the typed JS value for `type`.
   * @param {*} value Raw cell value.
   * @param {string} type Column type.
   * @return {*} Coerced value.
   */
  function coerceOut_(value, type) {
    if (value === '' || value === null || value === undefined) {
      return type === 'number' ? 0 : (type === 'boolean' ? false : null);
    }
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'boolean':
        return value === true || value === 'TRUE' || value === 'true' || value === 1;
      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (_e) {
            return null;
          }
        }
        return value;
      case 'date':
      case 'datetime':
        return value instanceof Date ? value : new Date(value);
      default:
        return String(value);
    }
  }

  /**
   * Coerces a typed JS value into a cell-writable value for `type`.
   * @param {*} value JS value.
   * @param {string} type Column type.
   * @return {*} Cell-writable value.
   */
  function coerceIn_(value, type) {
    if (value === null || value === undefined) {
      return '';
    }
    switch (type) {
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      case 'number':
        return typeof value === 'number' ? value : Number(value) || 0;
      case 'boolean':
        return value === true || value === 'true' || value === 1;
      default:
        return value;
    }
  }

  /**
   * @constructor
   * @param {string} sheetName One of CONFIG.SHEETS.*
   */
  function Repository(sheetName) {
    this.sheetName = sheetName;
    this.columns = SCHEMA[sheetName].columns;
    this.indexMap = getColumnIndexMap(sheetName);
    this.width = this.columns.length;
  }

  /**
   * @return {!Sheet} Backing sheet.
   */
  Repository.prototype.sheet = function () {
    return Database.getSheet(this.sheetName);
  };

  /**
   * Number of data rows (excluding header).
   * @return {number} Row count.
   */
  Repository.prototype.count = function () {
    return Math.max(0, this.sheet().getLastRow() - HEADER_ROWS);
  };

  /**
   * Reads all data rows in a single getValues() call and maps each to a typed
   * object keyed by the schema's column keys.
   * @return {!Array<!Object>} Array of record objects.
   */
  Repository.prototype.readAll = function () {
    const sheet = this.sheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= HEADER_ROWS) {
      return [];
    }
    const values = sheet
      .getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, this.width)
      .getValues();
    const cols = this.columns;
    const out = new Array(values.length);
    for (let r = 0; r < values.length; r++) {
      const row = values[r];
      const obj = {};
      for (let c = 0; c < cols.length; c++) {
        obj[cols[c].key] = coerceOut_(row[c], cols[c].type);
      }
      out[r] = obj;
    }
    return out;
  };

  /**
   * Maps a record object to a row array in schema column order.
   * @param {!Object} obj Record object.
   * @return {!Array<*>} Row array.
   */
  Repository.prototype.toRow = function (obj) {
    const cols = this.columns;
    const row = new Array(cols.length);
    for (let c = 0; c < cols.length; c++) {
      row[c] = coerceIn_(obj[cols[c].key], cols[c].type);
    }
    return row;
  };

  /**
   * Maps many objects to a 2D row array.
   * @param {!Array<!Object>} objects Records.
   * @return {!Array<!Array<*>>} 2D rows.
   */
  Repository.prototype.toRows = function (objects) {
    const rows = new Array(objects.length);
    for (let i = 0; i < objects.length; i++) {
      rows[i] = this.toRow(objects[i]);
    }
    return rows;
  };

  /**
   * Appends records using a single setValues() call.
   * @param {!Array<!Object>} objects Records to append.
   */
  Repository.prototype.append = function (objects) {
    if (!objects || objects.length === 0) {
      return;
    }
    const sheet = this.sheet();
    const startRow = sheet.getLastRow() + 1;
    const rows = this.toRows(objects);
    sheet.getRange(startRow, 1, rows.length, this.width).setValues(rows);
  };

  /**
   * Deletes all data rows, preserving the header.
   */
  Repository.prototype.clearData = function () {
    const sheet = this.sheet();
    const lastRow = sheet.getLastRow();
    if (lastRow > HEADER_ROWS) {
      sheet.getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, this.width)
        .clearContent();
    }
  };

  /**
   * Replaces ALL data with the given records using a single clear + single
   * setValues() write.
   * @param {!Array<!Object>} objects New full dataset.
   */
  Repository.prototype.replaceAll = function (objects) {
    this.clearData();
    this.append(objects);
  };

  /**
   * Builds a Map index for O(1) joins, keyed by `keyField`.
   * @param {string} keyField Column key to index by.
   * @param {!Array<!Object>=} records Optional pre-read records.
   * @return {!Map<*, !Object>} key -> record map (last write wins on dupes).
   */
  Repository.prototype.indexBy = function (keyField, records) {
    const list = records || this.readAll();
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
      map.set(list[i][keyField], list[i]);
    }
    return map;
  };

  /**
   * Returns records matching a predicate (in-memory, single read).
   * @param {function(!Object):boolean} predicate Filter predicate.
   * @param {!Array<!Object>=} records Optional pre-read records.
   * @return {!Array<!Object>} Matching records.
   */
  Repository.prototype.findWhere = function (predicate, records) {
    const list = records || this.readAll();
    return list.filter(predicate);
  };

  // Expose coercion helpers for testing.
  Repository.coerceOut_ = coerceOut_;
  Repository.coerceIn_ = coerceIn_;

  return Repository;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaseRepository };
}
