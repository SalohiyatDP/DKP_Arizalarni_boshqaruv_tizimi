/**
 * Report.gs - Hisobotni o'qish moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Tayyor hisobot varag'ini qat'iy sxemasiz o'qiydi:
 *  - butun ma'lumot diapazoni BITTA getValues() chaqirig'i bilan olinadi;
 *  - har bir ustunning turi qiymatlardan namuna olib aniqlanadi;
 *  - qatorlar ustun kalitlari bilan tiplangan obyektlarga aylantiriladi;
 *  - ustunlar o'lcham (dimension), ko'rsatkich (measure) va sana turlariga ajratiladi.
 */

/**
 * Hisobot varag'ini olish (konfiguratsiyadagi nom yoki aktiv varaq).
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getReportSheet() {
  var ss = getSpreadsheet();
  var name = getReportConfig().SHEET_NAME;
  if (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      throw new Error('Hisobot varag\'i topilmadi: ' + name);
    }
    return sheet;
  }
  return ss.getActiveSheet();
}

/**
 * Sarlavhalarni tozalash; bo'sh sarlavhalar "Ustun N" bo'ladi.
 * @param {Array} headerRow
 * @returns {Array<string>}
 */
function normalizeHeaders(headerRow) {
  return headerRow.map(function (cell, i) {
    var label = (cell === null || cell === undefined) ? '' : String(cell).trim();
    return label === '' ? 'Ustun ' + (i + 1) : label;
  });
}

/**
 * Sarlavhalardan noyob ustun kalitlarini hosil qilish.
 * @param {Array<string>} labels
 * @returns {Array<string>}
 */
function uniqueColumnKeys(labels) {
  var seen = {};
  return labels.map(function (label) {
    if (seen[label] === undefined) {
      seen[label] = 1;
      return label;
    }
    seen[label] += 1;
    return label + ' (' + seen[label] + ')';
  });
}

/**
 * Namuna qiymatlardan ustun turini aniqlash.
 * @param {Array} samples
 * @returns {string} number | date | string
 */
function detectColumnType(samples) {
  var T = getColumnTypes();
  if (!samples.length) {
    return T.STRING;
  }
  var allNumber = true;
  var allDate = true;
  for (var i = 0; i < samples.length; i++) {
    var v = samples[i];
    if (!(typeof v === 'number' && isFinite(v))) {
      allNumber = false;
    }
    if (!(v instanceof Date && !isNaN(v.getTime()))) {
      allDate = false;
    }
    if (!allNumber && !allDate) {
      return T.STRING;
    }
  }
  if (allNumber) {
    return T.NUMBER;
  }
  if (allDate) {
    return T.DATE;
  }
  return T.STRING;
}

/**
 * Xom katak qiymatini turiga qarab tiplangan qiymatga aylantirish.
 * @param {*} value
 * @param {string} type
 * @returns {*}
 */
function coerceCellValue(value, type) {
  var T = getColumnTypes();
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  if (type === T.NUMBER) {
    var n = typeof value === 'number' ? value : Number(value);
    return isFinite(n) ? n : null;
  }
  if (type === T.DATE) {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return String(value).trim();
}

/**
 * Qator butunlay bo'shmi?
 * @param {Array} row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  for (var i = 0; i < row.length; i++) {
    var v = row[i];
    if (v !== '' && v !== null && v !== undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Ustunlarni o'lcham / ko'rsatkich / sana turlariga ajratish.
 * @param {Array<Object>} columns
 * @param {Array<Object>} records
 * @returns {Object} { dimensions, measures, dateColumns, searchColumns }
 */
function classifyColumns(columns, records) {
  var T = getColumnTypes();
  var maxCard = getReportConfig().MAX_DIMENSION_CARDINALITY;
  var dimensions = [];
  var measures = [];
  var dateColumns = [];
  var searchColumns = [];

  columns.forEach(function (col) {
    if (col.type === T.NUMBER) {
      measures.push(col);
      return;
    }
    if (col.type === T.DATE) {
      dateColumns.push(col);
      return;
    }
    var distinct = {};
    var distinctCount = 0;
    for (var i = 0; i < records.length; i++) {
      var v = records[i][col.key];
      if (v !== null && v !== '') {
        if (!distinct[v]) {
          distinct[v] = true;
          distinctCount++;
          if (distinctCount > maxCard) {
            break;
          }
        }
      }
    }
    var annotated = {
      key: col.key, label: col.label, index: col.index,
      type: col.type, distinctCount: distinctCount
    };
    if (distinctCount > 0 && distinctCount <= maxCard) {
      dimensions.push(annotated);
    } else {
      searchColumns.push(annotated);
    }
  });

  return {
    dimensions: dimensions,
    measures: measures,
    dateColumns: dateColumns,
    searchColumns: searchColumns
  };
}

/**
 * Hisobot varag'ini bir marta o'qib, tiplangan ustun va yozuvlarni qaytaradi.
 * @returns {Object} { columns, records, rowCount, sheetName }
 */
function readReport() {
  var sheet = getReportSheet();
  var values = sheet.getDataRange().getValues();
  var cfg = getReportConfig();
  var headerIdx = cfg.HEADER_ROW - 1;

  if (values.length <= headerIdx) {
    return { columns: [], records: [], rowCount: 0, sheetName: sheet.getName() };
  }

  var labels = normalizeHeaders(values[headerIdx]);
  var keys = uniqueColumnKeys(labels);
  var dataRows = values.slice(headerIdx + 1).filter(function (row) {
    return !isEmptyRow(row);
  });

  var sampleN = Math.min(dataRows.length, cfg.TYPE_SAMPLE_ROWS);
  var columns = keys.map(function (key, i) {
    var samples = [];
    for (var r = 0; r < sampleN; r++) {
      var v = dataRows[r][i];
      if (v !== '' && v !== null && v !== undefined) {
        samples.push(v);
      }
    }
    return { key: key, label: labels[i], index: i, type: detectColumnType(samples) };
  });

  var records = new Array(dataRows.length);
  for (var r2 = 0; r2 < dataRows.length; r2++) {
    var row = dataRows[r2];
    var obj = {};
    for (var c = 0; c < columns.length; c++) {
      obj[columns[c].key] = coerceCellValue(row[c], columns[c].type);
    }
    records[r2] = obj;
  }

  return {
    columns: columns,
    records: records,
    rowCount: records.length,
    sheetName: sheet.getName()
  };
}
