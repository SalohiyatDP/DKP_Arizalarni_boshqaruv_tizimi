/**
 * @file Code.js
 * @fileoverview Apps Script controller for the bound (integrated) environment.
 *               Adds the spreadsheet menu, opens the analysis dialog, and
 *               exposes the server API consumed by the dashboard via
 *               google.script.run. Orchestrates ReportRepository + FilterService
 *               + StatisticsService; contains no business math itself.
 *
 * Apps Script only.
 */

/* eslint-disable no-unused-vars */

/**
 * Adds the custom menu when the spreadsheet opens.
 * @param {!Object=} e onOpen event (unused).
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu(CONFIG.APP.MENU_TITLE)
    .addItem('Tahlil panelini ochish', 'showDashboard')
    .addToUi();
}

/**
 * Opens the dashboard as a large modal dialog inside the sheet.
 */
function showDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(CONFIG.UI.DIALOG_WIDTH)
    .setHeight(CONFIG.UI.DIALOG_HEIGHT)
    .setTitle(CONFIG.APP.NAME);
  SpreadsheetApp.getUi().showModalDialog(html, CONFIG.APP.NAME);
}

/**
 * Picks sensible default chart controls from the column classification.
 * @param {!Object} cls Classification from ReportRepository.classify.
 * @return {{groupDim: ?string, measureKey: ?string, dateKey: ?string,
 *           agg: string}} Defaults.
 */
function pickDefaults_(cls) {
  const groupDim = cls.dimensions.length ? cls.dimensions[0].key : null;
  const measureKey = cls.measures.length ? cls.measures[0].key : null;
  const dateKey = cls.dateColumns.length ? cls.dateColumns[0].key : null;
  return {
    groupDim: groupDim,
    measureKey: measureKey,
    dateKey: dateKey,
    agg: measureKey ? CONFIG.AGG.SUM : CONFIG.AGG.COUNT,
  };
}

/**
 * Normalizes a client query payload, applying defaults and clamping.
 * @param {!Object} payload Raw client payload.
 * @param {!Object} cls Column classification.
 * @return {!Object} Normalized payload.
 */
function normalizePayload_(payload, cls) {
  const p = payload || {};
  const measureKeys = cls.measures.map(function (c) { return c.key; });
  const dimKeys = cls.dimensions.map(function (c) { return c.key; });
  const dateKeys = cls.dateColumns.map(function (c) { return c.key; });
  const defaults = pickDefaults_(cls);

  const measureKey = measureKeys.indexOf(p.measureKey) !== -1 ? p.measureKey : null;
  let agg = p.agg;
  if ([CONFIG.AGG.COUNT, CONFIG.AGG.SUM, CONFIG.AGG.AVG].indexOf(agg) === -1) {
    agg = measureKey ? CONFIG.AGG.SUM : CONFIG.AGG.COUNT;
  }
  if (!measureKey) {
    agg = CONFIG.AGG.COUNT;
  }
  const pageSize = Math.min(
    Math.max(parseInt(p.pageSize, 10) || CONFIG.PERFORMANCE.PAGE_SIZE, 10),
    CONFIG.PERFORMANCE.PAGE_SIZE * 4);

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
    sortDir: p.sortDir === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Formats a single cell value for table display.
 * @param {*} value Typed value.
 * @param {string} type Column type.
 * @return {(string|number)} Display value.
 */
function formatCell_(value, type) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (type === CONFIG.COLUMN_TYPE.DATE && value instanceof Date) {
    return Utilities.formatDate(value, CONFIG.APP.TIMEZONE, CONFIG.APP.DATE_FORMAT);
  }
  return value;
}

/**
 * Sorts records by a key with type awareness; nulls sort last.
 * @param {!Array<!Object>} records Records.
 * @param {string} sortKey Column key (empty = no sort).
 * @param {string} sortDir 'asc' | 'desc'.
 * @return {!Array<!Object>} Sorted copy.
 */
function sortRecords_(records, sortKey, sortDir) {
  if (!sortKey) {
    return records;
  }
  const dir = sortDir === 'desc' ? -1 : 1;
  const copy = records.slice();
  copy.sort(function (a, b) {
    const av = a[sortKey];
    const bv = b[sortKey];
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
 * Builds the full query result (filters/options/kpis/charts/table).
 * @param {!Object} data Read result from ReportRepository.
 * @param {!Object} cls Column classification.
 * @param {!Object} p Normalized payload.
 * @return {!Object} Query result for the client.
 */
function buildQueryResult_(data, cls, p) {
  const dimKeys = cls.dimensions.map(function (c) { return c.key; });

  // Compose the effective filter set, including the global search.
  const filters = {};
  Object.keys(p.filters).forEach(function (k) {
    filters[k] = p.filters[k];
  });
  if (p.search) {
    const searchCols = cls.searchColumns.concat(cls.dimensions)
      .map(function (c) { return c.key; });
    filters.__search = { type: 'search', term: p.search, columns: searchCols };
  }

  const filtered = FilterService.applyFilters(data.records, filters);
  const options = FilterService.getFilterOptions(data.records, dimKeys, filters);
  const kpis = StatisticsService.computeKpis(
    filtered, cls.measures.map(function (c) { return c.key; }));

  const category = p.groupDim
    ? StatisticsService.groupBy(filtered, p.groupDim,
      { agg: p.agg, measureKey: p.measureKey, topN: 12, includeOther: true })
    : [];
  const ranking = p.groupDim
    ? StatisticsService.topN(filtered, p.groupDim, 10) : [];
  const trend = p.dateKey
    ? StatisticsService.timeSeries(filtered, p.dateKey,
      { agg: p.agg, measureKey: p.measureKey }) : [];

  const sorted = sortRecords_(filtered, p.sortKey, p.sortDir);
  const total = sorted.length;
  const start = (p.page - 1) * p.pageSize;
  const pageRecords = sorted.slice(start, start + p.pageSize);
  const rows = pageRecords.map(function (r) {
    return data.columns.map(function (c) {
      return formatCell_(r[c.key], c.type);
    });
  });

  // Echo filters without the internal search key.
  const echoFilters = {};
  Object.keys(p.filters).forEach(function (k) {
    echoFilters[k] = p.filters[k];
  });

  return {
    total: total,
    options: options,
    filters: echoFilters,
    kpis: kpis,
    category: {
      dim: p.groupDim, agg: p.agg, measureKey: p.measureKey || null, data: category,
    },
    ranking: { dim: p.groupDim, data: ranking },
    trend: { dateKey: p.dateKey, agg: p.agg, data: trend },
    table: {
      columns: data.columns.map(function (c) {
        return { key: c.key, label: c.label, type: c.type };
      }),
      rows: rows,
      page: p.page,
      pageSize: p.pageSize,
      total: total,
    },
    controls: {
      groupDim: p.groupDim, measureKey: p.measureKey, agg: p.agg,
      dateKey: p.dateKey, search: p.search, sortKey: p.sortKey, sortDir: p.sortDir,
    },
  };
}

/**
 * Server API: initial dashboard state (metadata + unfiltered query).
 * @return {!Object} Initial state.
 */
function getInitialState() {
  return Database.withLock(function () {
    const data = ReportRepository.read();
    const cls = ReportRepository.classify(data.columns, data.records);
    const defaults = pickDefaults_(cls);
    const query = buildQueryResult_(data, cls, normalizePayload_({
      filters: {}, groupDim: defaults.groupDim, measureKey: defaults.measureKey,
      agg: defaults.agg, dateKey: defaults.dateKey, page: 1,
    }, cls));
    return {
      app: {
        name: CONFIG.APP.NAME,
        locale: CONFIG.APP.LOCALE,
        dateFormat: CONFIG.APP.DATE_FORMAT,
      },
      sheetName: data.sheetName,
      rowCount: data.rowCount,
      columns: data.columns,
      dimensions: cls.dimensions,
      measures: cls.measures,
      dateColumns: cls.dateColumns,
      searchColumns: cls.searchColumns,
      palette: CONFIG.CHART_PALETTE,
      defaults: defaults,
      query: query,
    };
  });
}

/**
 * Server API: run a filtered/aggregated query.
 * @param {!Object} payload Client query payload.
 * @return {!Object} Query result.
 */
function runQuery(payload) {
  return Database.withLock(function () {
    const data = ReportRepository.read();
    const cls = ReportRepository.classify(data.columns, data.records);
    return buildQueryResult_(data, cls, normalizePayload_(payload, cls));
  });
}
