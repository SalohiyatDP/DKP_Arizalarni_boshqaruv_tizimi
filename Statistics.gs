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


/**
 * Yozuvlarda berilgan kalit mavjudligini tekshirish (hosil ustun bormi?).
 * @param {Array<Object>} records
 * @param {string} key
 * @returns {boolean}
 */
function recordsHaveKey(records, key) {
  return !!(key && records.length && Object.prototype.hasOwnProperty.call(records[0], key));
}

/**
 * Moliyaviy yig'indilar (hosil qilingan summa ustunlari asosida).
 * @param {Array<Object>} records
 * @returns {?Object} { invoice, paid, debt, collectionPercent } yoki null.
 */
function computeFinanceSummary(records) {
  var D = getDerivedLabels();
  if (!recordsHaveKey(records, D.INVOICE_TOTAL) && !recordsHaveKey(records, D.PAID_TOTAL)) {
    return null;
  }
  var invoice = 0;
  var paid = 0;
  for (var i = 0; i < records.length; i++) {
    var inv = records[i][D.INVOICE_TOTAL];
    var pd = records[i][D.PAID_TOTAL];
    if (typeof inv === 'number') {
      invoice += inv;
    }
    if (typeof pd === 'number') {
      paid += pd;
    }
  }
  var debt = Math.max(0, invoice - paid);
  return {
    invoice: invoice,
    paid: paid,
    debt: debt,
    collectionPercent: invoice > 0 ? Math.round((paid / invoice) * 100) : 0
  };
}

/**
 * SLA holati bo'yicha taqsimot (rang bilan). Diagramma uchun tayyor.
 * @param {Array<Object>} records
 * @returns {?Object} { total, items: [{label, value, color}] } yoki null.
 */
function computeSlaSummary(records) {
  var D = getDerivedLabels();
  var key = D.SLA_STATE;
  if (!recordsHaveKey(records, key)) {
    return null;
  }
  var sla = getSlaConfig();
  var colorByLabel = {};
  Object.keys(sla.LABELS).forEach(function (k) {
    colorByLabel[sla.LABELS[k]] = sla.COLORS[k];
  });
  var statusColors = { 'Bajarilgan': '#2e7d32', 'Rad etilgan': '#9e9e9e', 'Sanasiz': '#bdbdbd' };

  var counts = {};
  var order = [];
  for (var i = 0; i < records.length; i++) {
    var label = records[i][key] || 'Sanasiz';
    if (counts[label] === undefined) {
      counts[label] = 0;
      order.push(label);
    }
    counts[label]++;
  }

  var items = order.map(function (label) {
    return {
      label: label,
      value: counts[label],
      color: colorByLabel[label] || statusColors[label] || '#1a73e8'
    };
  });
  items.sort(function (a, b) {
    return b.value - a.value;
  });
  return { total: records.length, items: items };
}
