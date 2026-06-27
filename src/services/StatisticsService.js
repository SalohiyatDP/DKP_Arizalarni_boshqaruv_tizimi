/**
 * @file StatisticsService.js
 * @fileoverview Pure aggregation helpers that turn filtered report records into
 *               KPI numbers and chart-ready series. No SpreadsheetApp — fully
 *               unit-testable.
 */

 

const StatisticsService = (function () {
  const EMPTY_LABEL = '(bo\'sh)';
  const OTHER_LABEL = 'Boshqalar';

  /**
   * Pads a number to two digits.
   * @param {number} n Number.
   * @return {string} Padded string.
   */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /**
   * Computes top-level KPIs: total record count and per-measure sum/avg/count.
   * @param {!Array<!Object>} records Filtered records.
   * @param {!Array<string>} measureKeys Numeric column keys to summarize.
   * @return {{totalRecords: number, measures: !Array<!Object>}} KPI payload.
   */
  function computeKpis(records, measureKeys) {
    const out = { totalRecords: records.length, measures: [] };
    (measureKeys || []).forEach(function (key) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < records.length; i++) {
        const v = records[i][key];
        if (typeof v === 'number') {
          sum += v;
          count += 1;
        }
      }
      out.measures.push({
        key: key,
        sum: sum,
        count: count,
        avg: count ? sum / count : 0,
      });
    });
    return out;
  }

  /**
   * Groups records by a dimension and aggregates a value per group.
   * @param {!Array<!Object>} records Filtered records.
   * @param {string} dimKey Dimension column key.
   * @param {{agg: (string|undefined), measureKey: (string|undefined),
   *          topN: (number|undefined), includeOther: (boolean|undefined)}=} options
   *     Aggregation options (agg: 'count'|'sum'|'avg').
   * @return {!Array<{label: string, value: number}>} Sorted groups (desc).
   */
  function groupBy(records, dimKey, options) {
    const opts = options || {};
    const agg = opts.agg || 'count';
    const measureKey = opts.measureKey;
    const map = new Map();

    for (let i = 0; i < records.length; i++) {
      const raw = records[i][dimKey];
      const label = (raw === null || raw === undefined || raw === '')
        ? EMPTY_LABEL : String(raw);
      let bucket = map.get(label);
      if (!bucket) {
        bucket = { count: 0, sum: 0 };
        map.set(label, bucket);
      }
      bucket.count += 1;
      if (measureKey) {
        const v = records[i][measureKey];
        if (typeof v === 'number') {
          bucket.sum += v;
        }
      }
    }

    let arr = [];
    map.forEach(function (b, label) {
      let value = b.count;
      if (agg === 'sum') {
        value = b.sum;
      } else if (agg === 'avg') {
        value = b.count ? b.sum / b.count : 0;
      }
      arr.push({ label: label, value: value });
    });
    arr.sort(function (a, b) {
      return b.value - a.value;
    });

    if (opts.topN && arr.length > opts.topN) {
      const top = arr.slice(0, opts.topN);
      if (opts.includeOther) {
        let rest = 0;
        for (let i = opts.topN; i < arr.length; i++) {
          rest += arr[i].value;
        }
        top.push({ label: OTHER_LABEL, value: rest });
      }
      arr = top;
    }
    return arr;
  }

  /**
   * Convenience: top-N groups by count for a dimension.
   * @param {!Array<!Object>} records Records.
   * @param {string} dimKey Dimension key.
   * @param {number} n How many.
   * @return {!Array<{label: string, value: number}>} Ranking.
   */
  function topN(records, dimKey, n) {
    return groupBy(records, dimKey, { agg: 'count', topN: n });
  }

  /**
   * Builds a monthly time series from a date column.
   * @param {!Array<!Object>} records Records.
   * @param {string} dateKey Date column key.
   * @param {{agg: (string|undefined), measureKey: (string|undefined)}=} options
   *     Aggregation options.
   * @return {!Array<{label: string, value: number}>} Chronological series.
   */
  function timeSeries(records, dateKey, options) {
    const opts = options || {};
    const agg = opts.agg || 'count';
    const measureKey = opts.measureKey;
    const map = new Map();

    for (let i = 0; i < records.length; i++) {
      const d = records[i][dateKey];
      if (!(d instanceof Date)) {
        continue;
      }
      const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { count: 0, sum: 0 };
        map.set(key, bucket);
      }
      bucket.count += 1;
      if (measureKey) {
        const v = records[i][measureKey];
        if (typeof v === 'number') {
          bucket.sum += v;
        }
      }
    }

    return Array.from(map.keys()).sort().map(function (key) {
      const b = map.get(key);
      let value = b.count;
      if (agg === 'sum') {
        value = b.sum;
      } else if (agg === 'avg') {
        value = b.count ? b.sum / b.count : 0;
      }
      return { label: key, value: value };
    });
  }

  return {
    computeKpis: computeKpis,
    groupBy: groupBy,
    topN: topN,
    timeSeries: timeSeries,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StatisticsService };
}
