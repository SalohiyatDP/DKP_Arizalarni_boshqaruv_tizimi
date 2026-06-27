/**
 * @file Schema.js
 * @fileoverview Declarative schema for every database sheet: ordered column
 *               definitions and helpers to build header rows and column-index
 *               maps. The Repository layer reads these definitions so that the
 *               rest of the code never hard-codes column positions.
 *
 * Each sheet schema is: { name, columns: [{ key, header, type }] }
 *   - key:    stable machine identifier used in code (camelCase)
 *   - header: human-readable header written to row 1 of the sheet
 *   - type:   'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'json'
 *
 * IMPORTANT: The DATA sheet columns are a sensible superset for cadastre
 * applications. They MUST be reconciled with the real "standard Excel report"
 * headers before the Import + Business Logic phases are finalized.
 */

 

const SCHEMA = (function buildSchema() {
  const S = CONFIG.SHEETS;

  /** @type {!Object<string, {name: string, columns: !Array<!Object>}>} */
  const defs = {};

  defs[S.LOGIN] = {
    name: S.LOGIN,
    columns: [
      { key: 'username', header: 'Username', type: 'string' },
      { key: 'passwordHash', header: 'PasswordHash', type: 'string' },
      { key: 'salt', header: 'Salt', type: 'string' },
      { key: 'employeeId', header: 'EmployeeID', type: 'string' },
      { key: 'role', header: 'Role', type: 'string' },
      { key: 'status', header: 'Status', type: 'string' },
      { key: 'failedAttempts', header: 'FailedAttempts', type: 'number' },
      { key: 'lockedUntil', header: 'LockedUntil', type: 'datetime' },
      { key: 'lastLogin', header: 'LastLogin', type: 'datetime' },
      { key: 'mustChangePassword', header: 'MustChangePassword', type: 'boolean' },
      { key: 'createdAt', header: 'CreatedAt', type: 'datetime' },
      { key: 'updatedAt', header: 'UpdatedAt', type: 'datetime' },
    ],
  };

  defs[S.EMPLOYEES] = {
    name: S.EMPLOYEES,
    columns: [
      { key: 'employeeId', header: 'EmployeeID', type: 'string' },
      { key: 'fullName', header: 'FullName', type: 'string' },
      { key: 'role', header: 'Role', type: 'string' },
      { key: 'region', header: 'Region', type: 'string' },
      { key: 'district', header: 'District', type: 'string' },
      { key: 'branch', header: 'Branch', type: 'string' },
      { key: 'phone', header: 'Phone', type: 'string' },
      { key: 'active', header: 'Active', type: 'boolean' },
    ],
  };

  defs[S.HOLIDAYS] = {
    name: S.HOLIDAYS,
    columns: [
      { key: 'date', header: 'Date', type: 'date' },
      { key: 'name', header: 'Name', type: 'string' },
      { key: 'recurring', header: 'RecurringYearly', type: 'boolean' },
    ],
  };

  defs[S.SERVICE_RULES] = {
    name: S.SERVICE_RULES,
    columns: [
      { key: 'serviceType', header: 'ServiceType', type: 'string' },
      { key: 'workingDays', header: 'WorkingDays', type: 'number' },
      { key: 'price', header: 'Price', type: 'number' },
      { key: 'active', header: 'Active', type: 'boolean' },
    ],
  };

  defs[S.AREA_RULES] = {
    name: S.AREA_RULES,
    columns: [
      { key: 'region', header: 'Region', type: 'string' },
      { key: 'district', header: 'District', type: 'string' },
      { key: 'branch', header: 'Branch', type: 'string' },
      { key: 'active', header: 'Active', type: 'boolean' },
    ],
  };

  defs[S.SETTINGS] = {
    name: S.SETTINGS,
    columns: [
      { key: 'key', header: 'Key', type: 'string' },
      { key: 'value', header: 'Value', type: 'string' },
      { key: 'description', header: 'Description', type: 'string' },
    ],
  };

  // Raw import buffer — stores the Excel sheet exactly as imported (as JSON row).
  defs[S.RAW_DATA] = {
    name: S.RAW_DATA,
    columns: [
      { key: 'importId', header: 'ImportID', type: 'string' },
      { key: 'rowIndex', header: 'RowIndex', type: 'number' },
      { key: 'payload', header: 'Payload', type: 'json' },
    ],
  };

  // Processed application records (the analytical fact table).
  defs[S.DATA] = {
    name: S.DATA,
    columns: [
      { key: 'applicationNo', header: 'ArizaRaqami', type: 'string' },
      { key: 'transactionId', header: 'Tranzaksiya', type: 'string' },
      { key: 'cadastreNo', header: 'KadastrRaqami', type: 'string' },
      { key: 'pnfl', header: 'PNFL', type: 'string' },
      { key: 'customer', header: 'Buyurtmachi', type: 'string' },
      { key: 'region', header: 'Viloyat', type: 'string' },
      { key: 'district', header: 'Tuman', type: 'string' },
      { key: 'branch', header: 'Filial', type: 'string' },
      { key: 'engineerId', header: 'MuhandisID', type: 'string' },
      { key: 'engineer', header: 'Muhandis', type: 'string' },
      { key: 'serviceType', header: 'ArizaTuri', type: 'string' },
      { key: 'objectType', header: 'ObyektTuri', type: 'string' },
      { key: 'habitability', header: 'TurarNoturar', type: 'string' },
      { key: 'registeredAt', header: 'QabulSanasi', type: 'date' },
      { key: 'slaDays', header: 'MuddatKun', type: 'number' },
      { key: 'dueDate', header: 'TugashSanasi', type: 'date' },
      { key: 'completedAt', header: 'BajarilganSana', type: 'date' },
      { key: 'processStatus', header: 'JarayonHolati', type: 'string' },
      { key: 'remainingDays', header: 'QolganKun', type: 'number' },
      { key: 'overdueDays', header: 'OtganKun', type: 'number' },
      { key: 'slaPercent', header: 'SLAFoiz', type: 'number' },
      { key: 'slaColor', header: 'SLARang', type: 'string' },
      { key: 'amount', header: 'Summa', type: 'number' },
      { key: 'paidAmount', header: 'TolanganSumma', type: 'number' },
      { key: 'paymentStatus', header: 'TolovHolati', type: 'string' },
      { key: 'year', header: 'Yil', type: 'number' },
      { key: 'month', header: 'Oy', type: 'number' },
      { key: 'importId', header: 'ImportID', type: 'string' },
    ],
  };

  defs[S.STATISTICS] = {
    name: S.STATISTICS,
    columns: [
      { key: 'metric', header: 'Metric', type: 'string' },
      { key: 'dimension', header: 'Dimension', type: 'string' },
      { key: 'dimensionValue', header: 'DimensionValue', type: 'string' },
      { key: 'value', header: 'Value', type: 'number' },
      { key: 'computedAt', header: 'ComputedAt', type: 'datetime' },
    ],
  };

  defs[S.MONTHLY_STATS] = {
    name: S.MONTHLY_STATS,
    columns: [
      { key: 'year', header: 'Year', type: 'number' },
      { key: 'month', header: 'Month', type: 'number' },
      { key: 'dimension', header: 'Dimension', type: 'string' },
      { key: 'dimensionValue', header: 'DimensionValue', type: 'string' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'done', header: 'Done', type: 'number' },
      { key: 'overdue', header: 'Overdue', type: 'number' },
      { key: 'revenue', header: 'Revenue', type: 'number' },
    ],
  };

  defs[S.FINANCE] = {
    name: S.FINANCE,
    columns: [
      { key: 'year', header: 'Year', type: 'number' },
      { key: 'month', header: 'Month', type: 'number' },
      { key: 'dimension', header: 'Dimension', type: 'string' },
      { key: 'dimensionValue', header: 'DimensionValue', type: 'string' },
      { key: 'billed', header: 'Billed', type: 'number' },
      { key: 'paid', header: 'Paid', type: 'number' },
      { key: 'pending', header: 'Pending', type: 'number' },
    ],
  };

  defs[S.EXPORT_QUEUE] = {
    name: S.EXPORT_QUEUE,
    columns: [
      { key: 'jobId', header: 'JobID', type: 'string' },
      { key: 'username', header: 'Username', type: 'string' },
      { key: 'format', header: 'Format', type: 'string' },
      { key: 'filters', header: 'Filters', type: 'json' },
      { key: 'status', header: 'Status', type: 'string' },
      { key: 'fileUrl', header: 'FileURL', type: 'string' },
      { key: 'error', header: 'Error', type: 'string' },
      { key: 'createdAt', header: 'CreatedAt', type: 'datetime' },
      { key: 'finishedAt', header: 'FinishedAt', type: 'datetime' },
    ],
  };

  defs[S.LOGIN_LOG] = {
    name: S.LOGIN_LOG,
    columns: [
      { key: 'timestamp', header: 'Timestamp', type: 'datetime' },
      { key: 'username', header: 'Username', type: 'string' },
      { key: 'success', header: 'Success', type: 'boolean' },
      { key: 'ip', header: 'IP', type: 'string' },
      { key: 'userAgent', header: 'UserAgent', type: 'string' },
      { key: 'message', header: 'Message', type: 'string' },
    ],
  };

  defs[S.ACTION_LOG] = {
    name: S.ACTION_LOG,
    columns: [
      { key: 'timestamp', header: 'Timestamp', type: 'datetime' },
      { key: 'type', header: 'Type', type: 'string' },
      { key: 'username', header: 'Username', type: 'string' },
      { key: 'action', header: 'Action', type: 'string' },
      { key: 'details', header: 'Details', type: 'json' },
    ],
  };

  defs[S.IMPORT_LOG] = {
    name: S.IMPORT_LOG,
    columns: [
      { key: 'importId', header: 'ImportID', type: 'string' },
      { key: 'username', header: 'Username', type: 'string' },
      { key: 'fileName', header: 'FileName', type: 'string' },
      { key: 'status', header: 'Status', type: 'string' },
      { key: 'rowCount', header: 'RowCount', type: 'number' },
      { key: 'backupId', header: 'BackupID', type: 'string' },
      { key: 'startedAt', header: 'StartedAt', type: 'datetime' },
      { key: 'finishedAt', header: 'FinishedAt', type: 'datetime' },
      { key: 'message', header: 'Message', type: 'string' },
    ],
  };

  defs[S.BACKUP] = {
    name: S.BACKUP,
    columns: [
      { key: 'backupId', header: 'BackupID', type: 'string' },
      { key: 'importId', header: 'ImportID', type: 'string' },
      { key: 'sheetName', header: 'SheetName', type: 'string' },
      { key: 'rowCount', header: 'RowCount', type: 'number' },
      { key: 'snapshot', header: 'Snapshot', type: 'json' },
      { key: 'createdAt', header: 'CreatedAt', type: 'datetime' },
    ],
  };

  return Object.freeze(defs);
})();

/**
 * Returns the ordered header row (array of header strings) for a sheet.
 * @param {string} sheetName One of CONFIG.SHEETS.*
 * @return {!Array<string>} Header labels in column order.
 */
function getHeaderRow(sheetName) {
  const def = SCHEMA[sheetName];
  if (!def) {
    throw new Error('Unknown sheet schema: ' + sheetName);
  }
  return def.columns.map(function (c) {
    return c.header;
  });
}

/**
 * Builds a map of { columnKey: zeroBasedIndex } for a sheet schema.
 * @param {string} sheetName One of CONFIG.SHEETS.*
 * @return {!Object<string, number>} key -> column index map.
 */
function getColumnIndexMap(sheetName) {
  const def = SCHEMA[sheetName];
  if (!def) {
    throw new Error('Unknown sheet schema: ' + sheetName);
  }
  const map = {};
  def.columns.forEach(function (c, i) {
    map[c.key] = i;
  });
  return map;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHEMA, getHeaderRow, getColumnIndexMap };
}
