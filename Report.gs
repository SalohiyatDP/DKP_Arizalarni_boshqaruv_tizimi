/**
 * Report.gs - Hisobotni o'qish moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Tayyor standart hisobotni qat'iy sxemasiz, lekin uning real tuzilmasiga
 * moslashgan holda o'qiydi:
 *  - butun ma'lumot diapazoni BITTA getValues() chaqirig'i bilan olinadi;
 *  - sarlavha qatori AVTOMATIK aniqlanadi (standart hisobotda sarlavha 1-qatorda
 *    emas: yuqorida hisobot nomi va sana qatorlari bo'ladi);
 *  - sarlavhadan keyingi "ikkilamchi sarlavha" (bo'sh asosiy ustunli) qatorlar
 *    ma'lumot deb hisoblanmaydi;
 *  - har bir ustun turi (number/date/string) namuna olib aniqlanadi (matnli
 *    sanalar ham sana sifatida tan olinadi);
 *  - biznes ustunlari (Turar/Noturar, muddat, SLA, to'lov) qo'shiladi.
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
 * Bir qatorda nechta bo'sh bo'lmagan katak borligi.
 * @param {Array} row
 * @returns {number}
 */
function countFilledCells(row) {
  var n = 0;
  for (var i = 0; i < row.length; i++) {
    var v = row[i];
    if (v !== '' && v !== null && v !== undefined) {
      n++;
    }
  }
  return n;
}

/**
 * Qatordagi sarlavha kalit so'zlari mosligi (ball).
 * @param {Array} row
 * @returns {number}
 */
function headerKeywordScore(row) {
  var keywords = getHeaderKeywords();
  var score = 0;
  for (var i = 0; i < row.length; i++) {
    var cell = row[i];
    if (cell === '' || cell === null || cell === undefined) {
      continue;
    }
    var norm = normalizeLabel(cell);
    for (var k = 0; k < keywords.length; k++) {
      if (norm.indexOf(normalizeLabel(keywords[k])) !== -1) {
        score++;
        break;
      }
    }
  }
  return score;
}

/**
 * Sarlavha qatori indeksini (0-asosli) aniqlash.
 * Avval kalit so'zlar bo'yicha, topilmasa konfiguratsiyadagi HEADER_ROW.
 * @param {Array<Array>} values
 * @returns {number}
 */
function detectHeaderRowIndex(values) {
  var cfg = getReportConfig();
  if (!cfg.AUTO_DETECT_HEADER) {
    return Math.max(0, cfg.HEADER_ROW - 1);
  }
  var scan = Math.min(values.length, cfg.HEADER_SCAN_ROWS);
  var bestRow = -1;
  var bestScore = 0;
  for (var r = 0; r < scan; r++) {
    var score = headerKeywordScore(values[r]);
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  if (bestRow !== -1 && bestScore >= cfg.MIN_HEADER_KEYWORDS) {
    return bestRow;
  }
  return Math.max(0, cfg.HEADER_ROW - 1);
}

/**
 * Sarlavhalardagi bo'sh bo'lmagan dastlabki ustun indekslarini (primary) topish.
 * Ular ma'lumot qatorini ajratishda ishlatiladi (ikkilamchi sarlavhalarni o'tkazib
 * yuborish uchun).
 * @param {Array<string>} rawHeaders
 * @returns {Array<number>}
 */
function findPrimaryColumnIndexes(rawHeaders) {
  var limit = getReportConfig().PRIMARY_COLUMN_COUNT;
  var idxs = [];
  for (var i = 0; i < rawHeaders.length && idxs.length < limit; i++) {
    var v = rawHeaders[i];
    if (v !== '' && v !== null && v !== undefined && String(v).trim() !== '') {
      idxs.push(i);
    }
  }
  return idxs;
}

/**
 * Qator haqiqiy ma'lumot qatori (ikkilamchi sarlavha emas)?
 * @param {Array} row
 * @param {Array<number>} primaryIdxs
 * @returns {boolean}
 */
function isDataRow(row, primaryIdxs) {
  if (!primaryIdxs.length) {
    return !isEmptyRow(row);
  }
  var filled = 0;
  for (var i = 0; i < primaryIdxs.length; i++) {
    var v = row[primaryIdxs[i]];
    if (v !== '' && v !== null && v !== undefined) {
      filled++;
    }
  }
  return filled >= getReportConfig().MIN_PRIMARY_FILLED;
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
 * Namuna qiymatlardan ustun turini aniqlash (matnli sanalar ham sana sifatida).
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
    if (!looksLikeDate(v)) {
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
    var n = typeof value === 'number' ? value : parseFlexibleNumber(value);
    return (n !== null && isFinite(n)) ? n : null;
  }
  if (type === T.DATE) {
    return parseFlexibleDate(value);
  }
  return String(value).trim();
}

/**
 * Qator butunlay bo'shmi?
 * @param {Array} row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  return countFilledCells(row) === 0;
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
      type: col.type, distinctCount: distinctCount, derived: !!col.derived
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
 * Biznes (hosil qilingan) ustunlar ham qo'shiladi.
 * @returns {Object} { columns, records, rowCount, sheetName, headerRow, derivedKeys }
 */
function readReport() {
  var sheet = getReportSheet();
  var values = sheet.getDataRange().getValues();
  var cfg = getReportConfig();

  if (!values.length) {
    return { columns: [], records: [], rowCount: 0, sheetName: sheet.getName(), headerRow: 0, derivedKeys: [] };
  }

  var headerIdx = detectHeaderRowIndex(values);
  if (values.length <= headerIdx + 1) {
    return {
      columns: [], records: [], rowCount: 0,
      sheetName: sheet.getName(), headerRow: headerIdx + 1, derivedKeys: []
    };
  }

  var rawHeaders = values[headerIdx];
  var labels = normalizeHeaders(rawHeaders);
  var keys = uniqueColumnKeys(labels);
  var primaryIdxs = findPrimaryColumnIndexes(rawHeaders);

  var dataRows = values.slice(headerIdx + 1).filter(function (row) {
    return !isEmptyRow(row) && isDataRow(row, primaryIdxs);
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

  var enriched = deriveBusinessColumns(columns, records);

  return {
    columns: enriched.columns,
    records: records,
    rowCount: records.length,
    sheetName: sheet.getName(),
    headerRow: headerIdx + 1,
    derivedKeys: enriched.derivedKeys
  };
}
