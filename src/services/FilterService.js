/**
 * @file FilterService.js
 * @fileoverview Server-side filtering over in-memory report records. All
 *               functions are pure (operate on arrays/objects, no SpreadsheetApp)
 *               and therefore unit-testable.
 *
 * Filter specification (object keyed by column key, plus optional '__search'):
 *   { "<colKey>": { type: 'in',          values: ["A","B"] } }
 *   { "<colKey>": { type: 'dateRange',   from: "2026-06-01", to: "2026-06-30" } }
 *   { "<colKey>": { type: 'numberRange', min: 0, max: 1000 } }
 *   { "__search": { type: 'search', term: "abc", columns: ["<k1>","<k2>"] } }
 *
 * Cascading: getFilterOptions computes the options for each dimension over the
 * records that match every OTHER active filter, so dropdowns stay consistent.
 */

 

const FilterService = (function () {
  const MAX_OPTIONS = (typeof CONFIG !== 'undefined')
    ? CONFIG.REPORT.MAX_FILTER_OPTIONS : 500;

  /**
   * Parses a value into a Date or null.
   * @param {*} v Value.
   * @return {Date} Date or null.
   */
  function toDate(v) {
    if (v === null || v === undefined || v === '') {
      return null;
    }
    if (v instanceof Date) {
      return isNaN(v.getTime()) ? null : new Date(v.getTime());
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Parses a value into a finite number or null.
   * @param {*} v Value.
   * @return {number} Number or null.
   */
  function toNumber(v) {
    if (v === null || v === undefined || v === '') {
      return null;
    }
    const n = typeof v === 'number' ? v : Number(v);
    return isFinite(n) ? n : null;
  }

  /**
   * Tests whether a single record satisfies one filter spec.
   * @param {!Object} record Report record.
   * @param {string} key Column key the spec is attached to.
   * @param {!Object} spec Filter spec.
   * @return {boolean} Whether it matches.
   */
  function recordMatches(record, key, spec) {
    if (!spec || !spec.type) {
      return true;
    }
    if (spec.type === 'in') {
      if (!spec.values || !spec.values.length) {
        return true;
      }
      const v = record[key];
      const target = (v === null || v === undefined) ? '' : String(v);
      for (let i = 0; i < spec.values.length; i++) {
        if (String(spec.values[i]) === target) {
          return true;
        }
      }
      return false;
    }
    if (spec.type === 'dateRange') {
      const v = record[key];
      if (!(v instanceof Date)) {
        return false;
      }
      const from = toDate(spec.from);
      const to = toDate(spec.to);
      if (from && v.getTime() < from.setHours(0, 0, 0, 0)) {
        return false;
      }
      if (to && v.getTime() > to.setHours(23, 59, 59, 999)) {
        return false;
      }
      return true;
    }
    if (spec.type === 'numberRange') {
      const v = record[key];
      if (typeof v !== 'number') {
        return false;
      }
      const min = toNumber(spec.min);
      const max = toNumber(spec.max);
      if (min !== null && v < min) {
        return false;
      }
      if (max !== null && v > max) {
        return false;
      }
      return true;
    }
    if (spec.type === 'search') {
      const term = String(spec.term || '').toLowerCase().trim();
      if (!term) {
        return true;
      }
      const cols = (spec.columns && spec.columns.length)
        ? spec.columns : Object.keys(record);
      for (let i = 0; i < cols.length; i++) {
        const val = record[cols[i]];
        if (val !== null && val !== undefined &&
            String(val).toLowerCase().indexOf(term) !== -1) {
          return true;
        }
      }
      return false;
    }
    return true;
  }

  /**
   * Tests whether a record satisfies all filters except one (for cascading).
   * @param {!Object} record Report record.
   * @param {!Object} filters Filter spec map.
   * @param {?string} exceptKey Key to skip (or null to apply all).
   * @return {boolean} Whether it matches the remaining filters.
   */
  function matchesAll(record, filters, exceptKey) {
    const keys = Object.keys(filters || {});
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === exceptKey) {
        continue;
      }
      if (!recordMatches(record, key, filters[key])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns records matching every active filter.
   * @param {!Array<!Object>} records Report records.
   * @param {!Object} filters Filter spec map.
   * @return {!Array<!Object>} Filtered records.
   */
  function applyFilters(records, filters) {
    if (!filters || !Object.keys(filters).length) {
      return records.slice();
    }
    const out = [];
    for (let i = 0; i < records.length; i++) {
      if (matchesAll(records[i], filters, null)) {
        out.push(records[i]);
      }
    }
    return out;
  }

  /**
   * Comparator for sorting option values (numbers numerically, else by string).
   * @param {*} a First value.
   * @param {*} b Second value.
   * @return {number} Sort order.
   */
  function compareValues(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  }

  /**
   * Computes cascading dropdown options for each dimension key.
   * @param {!Array<!Object>} records Report records.
   * @param {!Array<string>} dimensionKeys Keys to build options for.
   * @param {!Object} filters Active filter spec map.
   * @return {!Object<string, !Array>} Map of key -> sorted distinct values.
   */
  function getFilterOptions(records, dimensionKeys, filters) {
    const result = {};
    dimensionKeys.forEach(function (key) {
      const set = new Set();
      for (let i = 0; i < records.length; i++) {
        if (matchesAll(records[i], filters, key)) {
          const v = records[i][key];
          if (v !== null && v !== '') {
            set.add(v);
          }
        }
      }
      let arr = Array.from(set).sort(compareValues);
      if (arr.length > MAX_OPTIONS) {
        arr = arr.slice(0, MAX_OPTIONS);
      }
      result[key] = arr;
    });
    return result;
  }

  return {
    applyFilters: applyFilters,
    getFilterOptions: getFilterOptions,
    matchesAll: matchesAll,
    recordMatches: recordMatches,
    compareValues: compareValues,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FilterService };
}
