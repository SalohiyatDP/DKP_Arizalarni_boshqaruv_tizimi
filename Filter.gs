/**
 * Filter.gs - Server tomonidagi filterlash moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Yozuvlar (in-memory massiv) ustida filterlash. Filtr spetsifikatsiyasi —
 * ustun kaliti bo'yicha obyekt, plus ixtiyoriy '__search':
 *   { "<key>": { type: 'in',          values: ["A","B"] } }
 *   { "<key>": { type: 'dateRange',   from: "2026-06-01", to: "2026-06-30" } }
 *   { "<key>": { type: 'numberRange', min: 0, max: 1000 } }
 *   { "__search": { type: 'search', term: "abc", columns: ["k1","k2"] } }
 *
 * getFilterOptions cascading: har bir o'lcham uchun variantlar boshqa BARCHA
 * faol filtrlarga mos yozuvlardan hisoblanadi.
 */

/**
 * Qiymatni Date ga (yoki null) aylantirish (nusxa qaytaradi).
 * @param {*} v
 * @returns {Date}
 */
function filterToDate(v) {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : new Date(v.getTime());
  }
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Qiymatni songa (yoki null) aylantirish.
 * @param {*} v
 * @returns {number}
 */
function filterToNumber(v) {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  var n = typeof v === 'number' ? v : Number(v);
  return isFinite(n) ? n : null;
}

/**
 * Bitta yozuv bitta filtr spetsifikatsiyasiga mos keladimi?
 * @param {Object} record
 * @param {string} key
 * @param {Object} spec
 * @returns {boolean}
 */
function recordMatchesFilter(record, key, spec) {
  if (!spec || !spec.type) {
    return true;
  }
  if (spec.type === 'in') {
    if (!spec.values || !spec.values.length) {
      return true;
    }
    var v = record[key];
    var target = (v === null || v === undefined) ? '' : String(v);
    for (var i = 0; i < spec.values.length; i++) {
      if (String(spec.values[i]) === target) {
        return true;
      }
    }
    return false;
  }
  if (spec.type === 'dateRange') {
    var dv = record[key];
    if (!(dv instanceof Date)) {
      return false;
    }
    var from = filterToDate(spec.from);
    var to = filterToDate(spec.to);
    if (from && dv.getTime() < from.setHours(0, 0, 0, 0)) {
      return false;
    }
    if (to && dv.getTime() > to.setHours(23, 59, 59, 999)) {
      return false;
    }
    return true;
  }
  if (spec.type === 'numberRange') {
    var nv = record[key];
    if (typeof nv !== 'number') {
      return false;
    }
    var min = filterToNumber(spec.min);
    var max = filterToNumber(spec.max);
    if (min !== null && nv < min) {
      return false;
    }
    if (max !== null && nv > max) {
      return false;
    }
    return true;
  }
  if (spec.type === 'search') {
    var term = String(spec.term || '').toLowerCase().trim();
    if (!term) {
      return true;
    }
    var cols = (spec.columns && spec.columns.length) ? spec.columns : Object.keys(record);
    for (var c = 0; c < cols.length; c++) {
      var val = record[cols[c]];
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
 * Yozuv barcha filtrlarga mos keladimi (bittasini chiqarib qoldirish mumkin).
 * @param {Object} record
 * @param {Object} filters
 * @param {?string} exceptKey
 * @returns {boolean}
 */
function matchesAllFilters(record, filters, exceptKey) {
  var keys = Object.keys(filters || {});
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === exceptKey) {
      continue;
    }
    if (!recordMatchesFilter(record, key, filters[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Barcha faol filtrlarga mos yozuvlarni qaytarish.
 * @param {Array<Object>} records
 * @param {Object} filters
 * @returns {Array<Object>}
 */
function applyFilters(records, filters) {
  if (!filters || !Object.keys(filters).length) {
    return records.slice();
  }
  var out = [];
  for (var i = 0; i < records.length; i++) {
    if (matchesAllFilters(records[i], filters, null)) {
      out.push(records[i]);
    }
  }
  return out;
}

/**
 * Variant qiymatlarini saralash komparatori.
 * @param {*} a
 * @param {*} b
 * @returns {number}
 */
function compareFilterValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

/**
 * Har bir o'lcham uchun cascading dropdown variantlarini hisoblash.
 * @param {Array<Object>} records
 * @param {Array<string>} dimensionKeys
 * @param {Object} filters
 * @returns {Object} key -> saralangan noyob qiymatlar massivi
 */
function getFilterOptions(records, dimensionKeys, filters) {
  var maxOptions = getReportConfig().MAX_FILTER_OPTIONS;
  var result = {};
  dimensionKeys.forEach(function (key) {
    var seen = {};
    var arr = [];
    for (var i = 0; i < records.length; i++) {
      if (matchesAllFilters(records[i], filters, key)) {
        var v = records[i][key];
        if (v !== null && v !== '' && !seen[v]) {
          seen[v] = true;
          arr.push(v);
        }
      }
    }
    arr.sort(compareFilterValues);
    if (arr.length > maxOptions) {
      arr = arr.slice(0, maxOptions);
    }
    result[key] = arr;
  });
  return result;
}
