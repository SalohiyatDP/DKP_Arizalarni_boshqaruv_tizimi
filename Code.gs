/**
 * Code.gs - Asosiy modul va API yo'naltiruvchi
 * DKP - Hisobot tahlili tizimi
 *
 * doGet      - Web App bosh sahifasi
 * onOpen     - Spreadsheet menyusi (integratsiyalashgan muhit)
 * include    - HTML fayllarni qo'shish (template pattern)
 * apiXxx     - Frontend google.script.run so'rovlari (JSON qaytaradi)
 */

/**
 * Web App bosh sahifasi.
 * @param {Object} e - So'rov parametrlari.
 * @returns {HtmlOutput}
 */
function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('index');
    var output = template.evaluate();
    output.setTitle(getSystemConfig().APP_NAME);
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    return output;
  } catch (error) {
    Logger.log('doGet xatosi: ' + error.message);
    return HtmlService.createHtmlOutput('<h3>Xatolik: ' + error.message + '</h3>');
  }
}

/**
 * Spreadsheet ochilganda menyu qo'shish.
 * @param {Object=} e
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu(getSystemConfig().MENU_TITLE)
    .addItem('Tahlil panelini ochish', 'showDashboard')
    .addToUi();
}

/**
 * Tahlil panelini katta dialog ko'rinishida ochish (varaq ichida).
 */
function showDashboard() {
  var html = HtmlService.createTemplateFromFile('index').evaluate()
    .setWidth(1200)
    .setHeight(800)
    .setTitle(getSystemConfig().APP_NAME);
  SpreadsheetApp.getUi().showModalDialog(html, getSystemConfig().APP_NAME);
}

/**
 * HTML faylni qo'shish (include pattern).
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Web App ning haqiqiy /exec URL manzili.
 * @returns {string}
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

// ============================================================
// Ichki yordamchilar (server)
// ============================================================

/**
 * Ustun tasnifidan standart diagramma boshqaruvlarini tanlash.
 * @param {Object} cls
 * @returns {Object}
 */
function pickDefaults(cls) {
  var groupDim = cls.dimensions.length ? cls.dimensions[0].key : null;
  var measureKey = cls.measures.length ? cls.measures[0].key : null;
  var dateKey = cls.dateColumns.length ? cls.dateColumns[0].key : null;
  return {
    groupDim: groupDim,
    measureKey: measureKey,
    dateKey: dateKey,
    agg: measureKey ? 'sum' : 'count'
  };
}

/**
 * Mijoz payload ini normallashtirish (standartlar + cheklovlar).
 * @param {Object} payload
 * @param {Object} cls
 * @returns {Object}
 */
function normalizePayload(payload, cls) {
  var p = payload || {};
  var cfg = getReportConfig();
  var measureKeys = cls.measures.map(function (c) { return c.key; });
  var dimKeys = cls.dimensions.map(function (c) { return c.key; });
  var dateKeys = cls.dateColumns.map(function (c) { return c.key; });
  var defaults = pickDefaults(cls);

  var measureKey = measureKeys.indexOf(p.measureKey) !== -1 ? p.measureKey : null;
  var agg = p.agg;
  if (['count', 'sum', 'avg'].indexOf(agg) === -1) {
    agg = measureKey ? 'sum' : 'count';
  }
  if (!measureKey) {
    agg = 'count';
  }
  var pageSize = clamp(parseInt(p.pageSize, 10) || cfg.PAGE_SIZE, 10, cfg.MAX_PAGE_SIZE);

  return {
    filters: (p.filters && typeof p.filters === 'object') ? p.filters : {},
    search: typeof p.search === 'string' ? p.search : '',
    groupDim: dimKeys.indexOf(p.groupDim) !== -1 ? p.groupDim : defaults.groupDim,
    measureKey: measureKey,
    agg: agg,
    dateKey: dateKeys.indexOf(p.dateKey) !== -1 ? p.dateKey : defaults.dateKey,
    page: Math.max(parseInt(p.page, 10) || 1, 1),
    pageSize: pageSize,
    sortKey: typeof p.sortKey === 'string' ? p.sortKey : '',
    sortDir: p.sortDir === 'desc' ? 'desc' : 'asc'
  };
}

/**
 * Yozuvlarni kalit bo'yicha (tur hisobga olib) saralash; bo'shlar oxirda.
 * @param {Array<Object>} records
 * @param {string} sortKey
 * @param {string} sortDir
 * @returns {Array<Object>}
 */
function sortRecords(records, sortKey, sortDir) {
  if (!sortKey) {
    return records;
  }
  var dir = sortDir === 'desc' ? -1 : 1;
  var copy = records.slice();
  copy.sort(function (a, b) {
    var av = a[sortKey];
    var bv = b[sortKey];
    if (av === null || av === undefined || av === '') {
      return 1;
    }
    if (bv === null || bv === undefined || bv === '') {
      return -1;
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }
    if (av instanceof Date && bv instanceof Date) {
      return (av.getTime() - bv.getTime()) * dir;
    }
    return String(av).localeCompare(String(bv)) * dir;
  });
  return copy;
}

/**
 * To'liq so'rov natijasini tuzish (filtrlar/variantlar/KPI/diagramma/jadval).
 * @param {Object} data - readReport() natijasi.
 * @param {Object} cls - classifyColumns() natijasi.
 * @param {Object} p - normallashtirilgan payload.
 * @returns {Object}
 */
function buildQueryResult(data, cls, p) {
  var dimKeys = cls.dimensions.map(function (c) { return c.key; });

  var filters = {};
  Object.keys(p.filters).forEach(function (k) { filters[k] = p.filters[k]; });
  if (p.search) {
    var searchCols = cls.searchColumns.concat(cls.dimensions).map(function (c) { return c.key; });
    filters.__search = { type: 'search', term: p.search, columns: searchCols };
  }

  var filtered = applyFilters(data.records, filters);
  var options = getFilterOptions(data.records, dimKeys, filters);
  var kpis = computeKpis(filtered, cls.measures.map(function (c) { return c.key; }));
  var finance = computeFinanceSummary(filtered);
  var sla = computeSlaSummary(filtered);

  var category = p.groupDim
    ? groupByDimension(filtered, p.groupDim, { agg: p.agg, measureKey: p.measureKey, topN: 12, includeOther: true })
    : [];
  var ranking = p.groupDim ? topNDimension(filtered, p.groupDim, 10) : [];
  var trend = p.dateKey
    ? monthlyTimeSeries(filtered, p.dateKey, { agg: p.agg, measureKey: p.measureKey })
    : [];

  var sorted = sortRecords(filtered, p.sortKey, p.sortDir);
  var total = sorted.length;
  var start = (p.page - 1) * p.pageSize;
  var pageRecords = sorted.slice(start, start + p.pageSize);
  var rows = pageRecords.map(function (r) {
    return data.columns.map(function (c) {
      return formatCellValue(r[c.key], c.type);
    });
  });

  var echoFilters = {};
  Object.keys(p.filters).forEach(function (k) { echoFilters[k] = p.filters[k]; });

  return {
    total: total,
    options: options,
    filters: echoFilters,
    kpis: kpis,
    finance: finance,
    sla: sla,
    category: { dim: p.groupDim, agg: p.agg, measureKey: p.measureKey || null, data: category },
    ranking: { dim: p.groupDim, data: ranking },
    trend: { dateKey: p.dateKey, agg: p.agg, data: trend },
    table: {
      columns: data.columns.map(function (c) {
        return { key: c.key, label: c.label, type: c.type };
      }),
      rows: rows, page: p.page, pageSize: p.pageSize, total: total
    },
    controls: {
      groupDim: p.groupDim, measureKey: p.measureKey, agg: p.agg,
      dateKey: p.dateKey, search: p.search, sortKey: p.sortKey, sortDir: p.sortDir
    }
  };
}

// ============================================================
// API ENDPOINTS - Frontend google.script.run so'rovlari
// ============================================================

/**
 * Boshlang'ich holat (metadata + filtrsiz so'rov natijasi).
 * @returns {string} JSON
 */
function apiGetInitialState() {
  try {
    var data = readReport();
    var cls = classifyColumns(data.columns, data.records);
    var defaults = pickDefaults(cls);
    var query = buildQueryResult(data, cls, normalizePayload({
      filters: {}, groupDim: defaults.groupDim, measureKey: defaults.measureKey,
      agg: defaults.agg, dateKey: defaults.dateKey, page: 1
    }, cls));

    var sys = getSystemConfig();
    return JSON.stringify(successResponse({
      app: { name: sys.APP_NAME, subtitle: sys.APP_SUBTITLE, locale: sys.LOCALE, dateFormat: sys.DATE_FORMAT },
      sheetName: data.sheetName,
      rowCount: data.rowCount,
      columns: data.columns,
      dimensions: cls.dimensions,
      measures: cls.measures,
      dateColumns: cls.dateColumns,
      searchColumns: cls.searchColumns,
      palette: getChartPalette(),
      sla: getSlaConfig(),
      defaults: defaults,
      query: query
    }));
  } catch (error) {
    return JSON.stringify(errorResponse('Boshlang\'ich holatni yuklashda xatolik: ' + error.message, error));
  }
}

/**
 * Filterlangan/agregatlangan so'rovni bajarish.
 * @param {Object} payload
 * @returns {string} JSON
 */
function apiRunQuery(payload) {
  try {
    var data = readReport();
    var cls = classifyColumns(data.columns, data.records);
    return JSON.stringify(successResponse(buildQueryResult(data, cls, normalizePayload(payload, cls))));
  } catch (error) {
    return JSON.stringify(errorResponse('So\'rovni bajarishda xatolik: ' + error.message, error));
  }
}


/**
 * Bitta CSV katak qiymatini xavfsiz ekran qilish (RFC 4180).
 * @param {*} value
 * @returns {string}
 */
function csvEscape(value) {
  if (value === null || value === undefined) {
    return '';
  }
  var s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Filterlangan yozuvlardan CSV matn tuzish (faqat ko'rinadigan ustunlar).
 * @param {Array<Object>} columns
 * @param {Array<Object>} records
 * @returns {string}
 */
function buildCsv(columns, records) {
  var header = columns.map(function (c) {
    return csvEscape(c.label);
  }).join(',');
  var lines = [header];
  for (var i = 0; i < records.length; i++) {
    var row = columns.map(function (c) {
      return csvEscape(formatCellValue(records[i][c.key], c.type));
    });
    lines.push(row.join(','));
  }
  return lines.join('\r\n');
}

/**
 * Filterlangan natijani CSV sifatida eksport qilish (faqat filtrlangan qatorlar).
 * Eksport server tomonida tayyorlanadi; mijoz uni faylga yuklab oladi.
 * @param {Object} payload
 * @returns {string} JSON { filename, mimeType, content }
 */
function apiExportData(payload) {
  try {
    var data = readReport();
    var cls = classifyColumns(data.columns, data.records);
    var p = normalizePayload(payload, cls);

    var filters = {};
    Object.keys(p.filters).forEach(function (k) { filters[k] = p.filters[k]; });
    if (p.search) {
      var searchCols = cls.searchColumns.concat(cls.dimensions).map(function (c) { return c.key; });
      filters.__search = { type: 'search', term: p.search, columns: searchCols };
    }

    var filtered = applyFilters(data.records, filters);
    var sorted = sortRecords(filtered, p.sortKey, p.sortDir);
    var max = getReportConfig().MAX_EXPORT_ROWS;
    if (sorted.length > max) {
      sorted = sorted.slice(0, max);
    }

    var csv = buildCsv(data.columns, sorted);
    var stamp = Utilities.formatDate(new Date(), getSystemConfig().TIMEZONE, 'yyyyMMdd_HHmm');
    return JSON.stringify(successResponse({
      filename: 'DKP_hisobot_' + stamp + '.csv',
      mimeType: 'text/csv;charset=utf-8',
      rowCount: sorted.length,
      content: csv
    }));
  } catch (error) {
    return JSON.stringify(errorResponse('Eksport xatosi: ' + error.message, error));
  }
}
