/**
 * Statistics.gs - Statistika moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Filterlangan yozuvlardan KPI raqamlari va diagrammaga tayyor qatorlar hosil qiladi.
 */

/**
 * 2 xonali to'ldirish.
 * @param {number} n
 * @returns {string}
 */
function statPad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Yuqori darajadagi KPI: jami yozuvlar va har bir ko'rsatkich bo'yicha yig'indi/o'rtacha.
 * @param {Array<Object>} records
 * @param {Array<string>} measureKeys
 * @returns {Object} { totalRecords, measures: [{key, sum, count, avg}] }
 */
function computeKpis(records, measureKeys) {
  var out = { totalRecords: records.length, measures: [] };
  (measureKeys || []).forEach(function (key) {
    var sum = 0;
    var count = 0;
    for (var i = 0; i < records.length; i++) {
      var v = records[i][key];
      if (typeof v === 'number') {
        sum += v;
        count++;
      }
    }
    out.measures.push({ key: key, sum: sum, count: count, avg: count ? sum / count : 0 });
  });
  return out;
}

/**
 * Yozuvlarni o'lcham bo'yicha guruhlab, qiymatni agregatlash.
 * @param {Array<Object>} records
 * @param {string} dimKey
 * @param {Object=} options - { agg: 'count'|'sum'|'avg', measureKey, topN, includeOther }
 * @returns {Array<Object>} kamayish tartibida [{label, value}]
 */
function groupByDimension(records, dimKey, options) {
  var opts = options || {};
  var agg = opts.agg || 'count';
  var measureKey = opts.measureKey;
  var EMPTY_LABEL = '(bo\'sh)';
  var OTHER_LABEL = 'Boshqalar';
  var map = {};
  var order = [];

  for (var i = 0; i < records.length; i++) {
    var raw = records[i][dimKey];
    var label = (raw === null || raw === undefined || raw === '') ? EMPTY_LABEL : String(raw);
    if (!map[label]) {
      map[label] = { count: 0, sum: 0 };
      order.push(label);
    }
    map[label].count++;
    if (measureKey) {
      var v = records[i][measureKey];
      if (typeof v === 'number') {
        map[label].sum += v;
      }
    }
  }

  var arr = order.map(function (label) {
    var b = map[label];
    var value = b.count;
    if (agg === 'sum') {
      value = b.sum;
    } else if (agg === 'avg') {
      value = b.count ? b.sum / b.count : 0;
    }
    return { label: label, value: value };
  });
  arr.sort(function (a, b) {
    return b.value - a.value;
  });

  if (opts.topN && arr.length > opts.topN) {
    var top = arr.slice(0, opts.topN);
    if (opts.includeOther) {
      var rest = 0;
      for (var j = opts.topN; j < arr.length; j++) {
        rest += arr[j].value;
      }
      top.push({ label: OTHER_LABEL, value: rest });
    }
    arr = top;
  }
  return arr;
}

/**
 * O'lcham bo'yicha yozuvlar soni reytingi (top-N).
 * @param {Array<Object>} records
 * @param {string} dimKey
 * @param {number} n
 * @returns {Array<Object>}
 */
function topNDimension(records, dimKey, n) {
  return groupByDimension(records, dimKey, { agg: 'count', topN: n });
}

/**
 * Sana ustuni bo'yicha oylik vaqt qatori.
 * @param {Array<Object>} records
 * @param {string} dateKey
 * @param {Object=} options - { agg, measureKey }
 * @returns {Array<Object>} xronologik [{label, value}]
 */
function monthlyTimeSeries(records, dateKey, options) {
  var opts = options || {};
  var agg = opts.agg || 'count';
  var measureKey = opts.measureKey;
  var map = {};
  var keys = [];

  for (var i = 0; i < records.length; i++) {
    var d = records[i][dateKey];
    if (!(d instanceof Date)) {
      continue;
    }
    var key = d.getFullYear() + '-' + statPad2(d.getMonth() + 1);
    if (!map[key]) {
      map[key] = { count: 0, sum: 0 };
      keys.push(key);
    }
    map[key].count++;
    if (measureKey) {
      var v = records[i][measureKey];
      if (typeof v === 'number') {
        map[key].sum += v;
      }
    }
  }

  keys.sort();
  return keys.map(function (key) {
    var b = map[key];
    var value = b.count;
    if (agg === 'sum') {
      value = b.sum;
    } else if (agg === 'avg') {
      value = b.count ? b.sum / b.count : 0;
    }
    return { label: key, value: value };
  });
}
