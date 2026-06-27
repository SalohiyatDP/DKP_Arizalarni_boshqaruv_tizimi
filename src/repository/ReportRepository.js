/**
 * @file ReportRepository.js
 * @fileoverview Reads the existing report sheet generically (no fixed schema):
 *   - ONE getValues() call for the whole data range (50k+ rows friendly).
 *   - Detects each column's type (number / date / string) by sampling values.
 *   - Maps rows to typed objects keyed by a unique, human-readable column key.
 *   - Classifies columns into dimensions (filterable categories), measures
 *     (numeric), and date columns.
 *
 * The pure helpers (type inference, key generation, classification) are exposed
 * as static functions and unit-tested in Node. The read() method is Apps Script
 * only.
 */

 

const ReportRepository = (function () {
  const TYPE = (typeof CONFIG !== 'undefined') ? CONFIG.COLUMN_TYPE
    : { NUMBER: 'number', DATE: 'date', STRING: 'string' };

  /**
   * Normalizes a header row into trimmed labels; blanks become "Ustun N".
   * @param {!Array<*>} headerRow Raw header cells.
   * @return {!Array<string>} Labels.
   */
  function normalizeHeaders(headerRow) {
    return headerRow.map(function (cell, i) {
      const label = (cell === null || cell === undefined) ? '' : String(cell).trim();
      return label === '' ? 'Ustun ' + (i + 1) : label;
    });
  }

  /**
   * Produces unique object keys from labels (appends " (n)" on collision).
   * @param {!Array<string>} labels Column labels.
   * @return {!Array<string>} Unique keys aligned to labels.
   */
  function uniqueKeys(labels) {
    const seen = {};
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
   * Infers a column type from a list of non-empty sample values.
   * @param {!Array<*>} samples Non-empty sampled cell values.
   * @return {string} One of COLUMN_TYPE.*
   */
  function inferType(samples) {
    if (!samples.length) {
      return TYPE.STRING;
    }
    let allNumber = true;
    let allDate = true;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      if (!(typeof v === 'number' && isFinite(v))) {
        allNumber = false;
      }
      if (!(v instanceof Date && !isNaN(v.getTime()))) {
        allDate = false;
      }
      if (!allNumber && !allDate) {
        return TYPE.STRING;
      }
    }
    if (allNumber) {
      return TYPE.NUMBER;
    }
    if (allDate) {
      return TYPE.DATE;
    }
    return TYPE.STRING;
  }

  /**
   * Coerces a raw cell value to its typed JS representation.
   * @param {*} value Raw value.
   * @param {string} type Column type.
   * @return {*} Typed value (null when empty/invalid).
   */
  function coerceValue(value, type) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    if (type === TYPE.NUMBER) {
      const n = typeof value === 'number' ? value : Number(value);
      return isFinite(n) ? n : null;
    }
    if (type === TYPE.DATE) {
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
      }
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return String(value).trim();
  }

  /**
   * Returns true if a row is entirely empty.
   * @param {!Array<*>} row Row values.
   * @return {boolean} Whether all cells are empty.
   */
  function isEmptyRow(row) {
    for (let i = 0; i < row.length; i++) {
      const v = row[i];
      if (v !== '' && v !== null && v !== undefined) {
        return false;
      }
    }
    return true;
  }

  /**
   * Classifies columns into dimensions / measures / date columns using their
   * type and (for strings) distinct-value cardinality.
   * @param {!Array<!Object>} columns Column metadata.
   * @param {!Array<!Object>} records Typed records.
   * @return {{dimensions: !Array<!Object>, measures: !Array<!Object>,
   *           dateColumns: !Array<!Object>, searchColumns: !Array<!Object>}}
   *     Classification (each column annotated with distinctCount for strings).
   */
  function classify(columns, records) {
    const maxCard = (typeof CONFIG !== 'undefined')
      ? CONFIG.REPORT.MAX_DIMENSION_CARDINALITY : 300;
    const dimensions = [];
    const measures = [];
    const dateColumns = [];
    const searchColumns = [];

    columns.forEach(function (col) {
      if (col.type === TYPE.NUMBER) {
        measures.push(col);
        return;
      }
      if (col.type === TYPE.DATE) {
        dateColumns.push(col);
        return;
      }
      // string: count distinct to decide dropdown vs free-text search
      const distinct = new Set();
      for (let i = 0; i < records.length; i++) {
        const v = records[i][col.key];
        if (v !== null && v !== '') {
          distinct.add(v);
          if (distinct.size > maxCard) {
            break;
          }
        }
      }
      const annotated = Object.assign({}, col, { distinctCount: distinct.size });
      if (distinct.size > 0 && distinct.size <= maxCard) {
        dimensions.push(annotated);
      } else {
        searchColumns.push(annotated);
      }
    });

    return {
      dimensions: dimensions,
      measures: measures,
      dateColumns: dateColumns,
      searchColumns: searchColumns,
    };
  }

  /**
   * Reads the report sheet once and returns typed columns + records.
   * Apps Script only.
   * @return {{columns: !Array<!Object>, records: !Array<!Object>,
   *           rowCount: number, sheetName: string}} Report payload.
   */
  function read() {
    const sheet = Database.getReportSheet();
    const values = sheet.getDataRange().getValues();
    const headerIdx = CONFIG.REPORT.HEADER_ROW - 1;
    if (values.length <= headerIdx) {
      return { columns: [], records: [], rowCount: 0, sheetName: sheet.getName() };
    }
    const labels = normalizeHeaders(values[headerIdx]);
    const keys = uniqueKeys(labels);
    const dataRows = values.slice(headerIdx + 1).filter(function (row) {
      return !isEmptyRow(row);
    });

    const sampleN = Math.min(dataRows.length, CONFIG.REPORT.TYPE_SAMPLE_ROWS);
    const columns = keys.map(function (key, i) {
      const samples = [];
      for (let r = 0; r < sampleN; r++) {
        const v = dataRows[r][i];
        if (v !== '' && v !== null && v !== undefined) {
          samples.push(v);
        }
      }
      return { key: key, label: labels[i], index: i, type: inferType(samples) };
    });

    const records = new Array(dataRows.length);
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      const obj = {};
      for (let c = 0; c < columns.length; c++) {
        obj[columns[c].key] = coerceValue(row[c], columns[c].type);
      }
      records[r] = obj;
    }

    return {
      columns: columns,
      records: records,
      rowCount: records.length,
      sheetName: sheet.getName(),
    };
  }

  return {
    read: read,
    classify: classify,
    // Exposed pure helpers (testable):
    normalizeHeaders: normalizeHeaders,
    uniqueKeys: uniqueKeys,
    inferType: inferType,
    coerceValue: coerceValue,
    isEmptyRow: isEmptyRow,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReportRepository };
}
