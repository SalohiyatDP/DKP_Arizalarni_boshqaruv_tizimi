/**
 * BusinessLogic.gs - Biznes mantiq moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Standart hisobotning xom ustunlaridan biznes qoidalari asosida YANGI
 * (hosil qilingan) ustunlarni hisoblaydi. Barcha hisob-kitob server tomonida
 * JavaScript orqali bajariladi — Google Sheets ichida formula ishlatilmaydi.
 *
 * Hosil qilinadigan ustunlar mavjud filtr/statistika/diagramma quvuriga
 * avtomatik qo'shiladi (DRY): string ustunlar — o'lcham (filtr), raqamli
 * ustunlar — ko'rsatkich (KPI/agregatsiya).
 *
 * Mustahkamlik: agar kerakli xom ustun topilmasa, tegishli hosil ustun
 * o'tkazib yuboriladi — boshqa hisobotlar bilan ham tizim ishlayveradi.
 */

/**
 * Sarlavha/qiymatni taqqoslash uchun normallashtirish:
 * kichik harf, apostroflarni olib tashlash, ortiqcha bo'shliqlarni siqish.
 * @param {*} value
 * @returns {string}
 */
function normalizeLabel(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bb\u02bc'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Moslashuvchan son parser: bo'shliq/ajratuvchilarni tozalaydi, vergulni nuqtaga
 * aylantiradi. Son bo'lmasa null.
 * @param {*} value
 * @returns {?number}
 */
function parseFlexibleNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }
  var s = String(value).replace(/\u00a0/g, ' ').trim();
  if (s === '' || s === '-') {
    return null;
  }
  s = s.replace(/[^0-9.,\-]/g, '');
  if (s === '' || s === '-') {
    return null;
  }
  var hasComma = s.indexOf(',') !== -1;
  var hasDot = s.indexOf('.') !== -1;
  if (hasComma && hasDot) {
    // Vergul — minglik ajratuvchi
    s = s.replace(/,/g, '');
  } else if (hasComma) {
    var commaCount = (s.match(/,/g) || []).length;
    var afterComma = s.split(',').pop();
    if (commaCount === 1 && afterComma.length !== 3) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }
  var n = Number(s);
  return isFinite(n) ? n : null;
}

/**
 * Moslashuvchan sana parser. Standart hisobotda sanalar matn ko'rinishida va
 * turli formatlarda keladi:
 *   "2026.05.12 12:11", "2026-06-03 15:19:58.621", "12.05.2026", ISO va h.k.
 * @param {*} value
 * @returns {?Date}
 */
function parseFlexibleDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    return null;
  }
  var s = String(value).trim();
  if (s === '' || s === '-') {
    return null;
  }
  var m;
  // Yil-oldin: yyyy[.-/]MM[.-/]dd [HH:mm[:ss]]
  m = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return makeDate(m[1], m[2], m[3], m[4], m[5], m[6]);
  }
  // Kun-oldin: dd[.-/]MM[.-/]yyyy [HH:mm[:ss]]
  m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return makeDate(m[3], m[2], m[1], m[4], m[5], m[6]);
  }
  return null;
}

/**
 * Sana qismlaridan haqiqiy Date yasash (komponentlar matn).
 * @param {string} y
 * @param {string} mo
 * @param {string} d
 * @param {string=} h
 * @param {string=} mi
 * @param {string=} se
 * @returns {?Date}
 */
function makeDate(y, mo, d, h, mi, se) {
  var year = parseInt(y, 10);
  var month = parseInt(mo, 10) - 1;
  var day = parseInt(d, 10);
  var hour = h ? parseInt(h, 10) : 0;
  var minute = mi ? parseInt(mi, 10) : 0;
  var second = se ? parseInt(se, 10) : 0;
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  var date = new Date(year, month, day, hour, minute, second);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Qiymat sana ko'rinishidami (tur aniqlash uchun)?
 * @param {*} value
 * @returns {boolean}
 */
function looksLikeDate(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    return parseFlexibleDate(value) !== null;
  }
  return false;
}

/**
 * Berilgan label kalit so'zlarga mos keladimi (normallashtirilgan "contains").
 * @param {string} label
 * @param {Array<string>} keywords
 * @returns {boolean}
 */
function labelMatches(label, keywords) {
  var norm = normalizeLabel(label);
  for (var i = 0; i < keywords.length; i++) {
    if (norm.indexOf(normalizeLabel(keywords[i])) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Ustunlar ichidan kalit so'zlarga mos birinchi ustun kalitini topish.
 * @param {Array<Object>} columns
 * @param {Array<string>} keywords
 * @returns {?string}
 */
function findColumnKey(columns, keywords) {
  for (var i = 0; i < columns.length; i++) {
    if (labelMatches(columns[i].label, keywords)) {
      return columns[i].key;
    }
  }
  return null;
}

/**
 * Kalit so'zlarga mos BARCHA ustun kalitlarini topish (masalan, summa ustunlari).
 * @param {Array<Object>} columns
 * @param {Array<string>} keywordsList - har biri uchun bitta ustun.
 * @returns {Array<string>}
 */
function findColumnKeys(columns, keywordsList) {
  var keys = [];
  keywordsList.forEach(function (kw) {
    var key = findColumnKey(columns, [kw]);
    if (key && keys.indexOf(key) === -1) {
      keys.push(key);
    }
  });
  return keys;
}

/**
 * Mantiqiy maydon -> ustun kaliti indeksini tuzish.
 * @param {Array<Object>} columns
 * @returns {Object}
 */
function buildColumnIndex(columns) {
  var map = getColumnMap();
  var idx = {};
  Object.keys(map).forEach(function (logical) {
    if (logical === 'invoiceSums' || logical === 'paidSums') {
      idx[logical] = findColumnKeys(columns, map[logical]);
    } else {
      idx[logical] = findColumnKey(columns, map[logical]);
    }
  });
  return idx;
}

/**
 * Bir nechta summa ustunini qo'shish (matn yoki son bo'lsa ham).
 * @param {Object} record
 * @param {Array<string>} keys
 * @returns {number}
 */
function sumColumns(record, keys) {
  var total = 0;
  for (var i = 0; i < keys.length; i++) {
    var n = parseFlexibleNumber(record[keys[i]]);
    if (n !== null) {
      total += n;
    }
  }
  return total;
}

/**
 * Matnni qoidalar to'plamiga (keywords) ko'ra tasniflash; mos kelmasa fallback.
 * @param {string} text
 * @param {Array<Object>} rules - [{label, keywords}]
 * @param {string} fallback
 * @returns {string}
 */
function classifyByKeywords(text, rules, fallback) {
  var norm = normalizeLabel(text);
  if (norm === '') {
    return fallback;
  }
  for (var i = 0; i < rules.length; i++) {
    var kws = rules[i].keywords || [];
    for (var j = 0; j < kws.length; j++) {
      if (norm.indexOf(normalizeLabel(kws[j])) !== -1) {
        return rules[i].label;
      }
    }
  }
  return fallback;
}

/**
 * Ariza turi / obyekt turidan Turar/Noturar aniqlash.
 * @param {string} appType
 * @param {string} objectType
 * @returns {string}
 */
function deriveResidential(appType, objectType) {
  var r = getResidentialRules();
  var rules = [
    { label: r.NON_RESIDENTIAL.label, keywords: r.NON_RESIDENTIAL.keywords },
    { label: r.RESIDENTIAL.label, keywords: r.RESIDENTIAL.keywords }
  ];
  var fromApp = classifyByKeywords(appType, rules, '');
  if (fromApp) {
    return fromApp;
  }
  var fromObj = classifyByKeywords(objectType, rules, '');
  return fromObj || r.UNKNOWN.label;
}

/**
 * Tizimdagi holatdan ariza holatini aniqlash (Bajarilgan/Rad/Jarayonda).
 * @param {string} systemStatus
 * @returns {string}
 */
function deriveAppStatus(systemStatus) {
  var s = getStatusRules();
  return classifyByKeywords(systemStatus, [
    { label: s.REJECTED.label, keywords: s.REJECTED.keywords },
    { label: s.DONE.label, keywords: s.DONE.keywords }
  ], s.IN_PROGRESS.label);
}

/**
 * Hisoblangan to'lov holati (invoys va to'langan summalar asosida).
 * @param {number} invoiceTotal
 * @param {number} paidTotal
 * @returns {string}
 */
function derivePaymentState(invoiceTotal, paidTotal) {
  var L = getPaymentStateLabels();
  if (invoiceTotal <= 0) {
    return paidTotal > 0 ? L.PAID : L.NONE;
  }
  if (paidTotal >= invoiceTotal) {
    return L.PAID;
  }
  if (paidTotal > 0) {
    return L.PARTIAL;
  }
  return L.PENDING;
}

/**
 * Ariza/tranzaksiya turiga ko'ra belgilangan muddat (ish kuni).
 * @param {string} appType
 * @param {string} transactionType
 * @returns {number}
 */
function serviceWorkingDays(appType, transactionType) {
  var cfg = getServiceRules();
  var hay = normalizeLabel(appType) + ' ' + normalizeLabel(transactionType);
  for (var i = 0; i < cfg.RULES.length; i++) {
    if (hay.indexOf(normalizeLabel(cfg.RULES[i].match)) !== -1) {
      return cfg.RULES[i].days;
    }
  }
  return cfg.DEFAULT_WORKING_DAYS;
}

/**
 * SLA foiziga qarab rang holatini (label) tanlash.
 * @param {number} percent
 * @returns {Object} { key, label, color }
 */
function slaStateFromPercent(percent) {
  var cfg = getSlaConfig();
  for (var i = 0; i < cfg.THRESHOLDS.length; i++) {
    if (percent >= cfg.THRESHOLDS[i].minPercent) {
      var key = cfg.THRESHOLDS[i].key;
      return { key: key, label: cfg.LABELS[key], color: cfg.COLORS[key] };
    }
  }
  var last = cfg.THRESHOLDS[cfg.THRESHOLDS.length - 1].key;
  return { key: last, label: cfg.LABELS[last], color: cfg.COLORS[last] };
}

/**
 * Konfiguratsiyadagi bayramlar ro'yxatini olish (Date ko'rinishida).
 * @returns {Array<Object>}
 */
function getHolidayList() {
  return (getCalendarConfig().HOLIDAYS || []).map(function (h) {
    return { date: parseFlexibleDate(h.date) || new Date(h.date), recurring: !!h.recurring, name: h.name || '' };
  }).filter(function (h) {
    return h.date instanceof Date && !isNaN(h.date.getTime());
  });
}

/**
 * Hosil qilinadigan ustun ta'rifi.
 * @param {string} key
 * @param {string} type
 * @param {number} index
 * @returns {Object}
 */
function makeDerivedColumn(key, type, index) {
  return { key: key, label: key, index: index, type: type, derived: true };
}

/**
 * Xom ustunlardan biznes ustunlarini hisoblab, columns/records ga qo'shadi.
 * Yozuvlar joyida (in-place) boyitiladi.
 * @param {Array<Object>} columns
 * @param {Array<Object>} records
 * @returns {Object} { columns, derivedKeys }
 */
function deriveBusinessColumns(columns, records) {
  var ci = buildColumnIndex(columns);
  var D = getDerivedLabels();
  var T = getColumnTypes();
  var holidays = buildHolidaySet(getHolidayList());
  var today = wdStartOfDay(new Date());

  var hasFinance = (ci.invoiceSums && ci.invoiceSums.length) || (ci.paidSums && ci.paidSums.length);
  var hasStart = !!ci.startDate;
  var derived = [];
  var nextIndex = columns.length;

  function register(label, type) {
    var col = makeDerivedColumn(label, type, nextIndex++);
    derived.push(col);
    return label;
  }

  // Qaysi ustunlarni hosil qila olamiz?
  var kResidential = (ci.applicationType || ci.objectType) ? register(D.RESIDENTIAL, T.STRING) : null;
  var kAppStatus = ci.systemStatus ? register(D.APP_STATUS, T.STRING) : null;
  var kInvoiceTotal = hasFinance ? register(D.INVOICE_TOTAL, T.NUMBER) : null;
  var kPaidTotal = hasFinance ? register(D.PAID_TOTAL, T.NUMBER) : null;
  var kDebtTotal = hasFinance ? register(D.DEBT_TOTAL, T.NUMBER) : null;
  var kPayState = hasFinance ? register(D.PAYMENT_STATE, T.STRING) : null;
  var kElapsed = hasStart ? register(D.ELAPSED_WD, T.NUMBER) : null;
  var kAllowed = hasStart ? register(D.ALLOWED_WD, T.NUMBER) : null;
  var kRemaining = hasStart ? register(D.REMAINING_WD, T.NUMBER) : null;
  var kSlaPercent = hasStart ? register(D.SLA_PERCENT, T.NUMBER) : null;
  var kDeadlineState = hasStart ? register(D.DEADLINE_STATE, T.STRING) : null;
  var kSlaState = hasStart ? register(D.SLA_STATE, T.STRING) : null;

  var statusRules = getStatusRules();

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];

    var appStatus = kAppStatus ? deriveAppStatus(rec[ci.systemStatus]) : null;
    if (kAppStatus) {
      rec[kAppStatus] = appStatus;
    }
    if (kResidential) {
      rec[kResidential] = deriveResidential(
        ci.applicationType ? rec[ci.applicationType] : '',
        ci.objectType ? rec[ci.objectType] : ''
      );
    }

    if (hasFinance) {
      var invoiceTotal = sumColumns(rec, ci.invoiceSums || []);
      var paidTotal = sumColumns(rec, ci.paidSums || []);
      rec[kInvoiceTotal] = invoiceTotal;
      rec[kPaidTotal] = paidTotal;
      rec[kDebtTotal] = Math.max(0, invoiceTotal - paidTotal);
      rec[kPayState] = derivePaymentState(invoiceTotal, paidTotal);
    }

    if (hasStart) {
      var start = parseFlexibleDate(rec[ci.startDate]);
      var allowed = serviceWorkingDays(
        ci.applicationType ? rec[ci.applicationType] : '',
        ci.transactionType ? rec[ci.transactionType] : ''
      );
      rec[kAllowed] = allowed;

      var isDone = appStatus === statusRules.DONE.label;
      var isRejected = appStatus === statusRules.REJECTED.label;

      if (start) {
        var endRef = today;
        if (isDone || isRejected) {
          var doneDate = (ci.lastProcessDate && parseFlexibleDate(rec[ci.lastProcessDate])) ||
            (ci.paidDate && parseFlexibleDate(rec[ci.paidDate])) || today;
          endRef = doneDate;
        }
        rec[kElapsed] = workingDaysBetween(start, endRef, holidays);

        var due = addWorkingDays(start, allowed, holidays);
        var remaining = remainingWorkingDays(today, due, holidays);
        var percent = allowed > 0 ? Math.round((remaining / allowed) * 100) : 0;
        rec[kRemaining] = remaining;
        rec[kSlaPercent] = percent;

        if (isDone) {
          rec[kDeadlineState] = statusRules.DONE.label;
          rec[kSlaState] = statusRules.DONE.label;
        } else if (isRejected) {
          rec[kDeadlineState] = statusRules.REJECTED.label;
          rec[kSlaState] = statusRules.REJECTED.label;
        } else if (remaining < 0) {
          rec[kDeadlineState] = 'Muddati o\'tgan';
          rec[kSlaState] = slaStateFromPercent(remaining).label;
        } else if (remaining === 0) {
          rec[kDeadlineState] = 'Bugun tugaydi';
          rec[kSlaState] = slaStateFromPercent(percent).label;
        } else {
          rec[kDeadlineState] = 'Jarayonda';
          rec[kSlaState] = slaStateFromPercent(percent).label;
        }
      } else {
        rec[kElapsed] = null;
        rec[kRemaining] = null;
        rec[kSlaPercent] = null;
        rec[kDeadlineState] = 'Sanasiz';
        rec[kSlaState] = 'Sanasiz';
      }
    }
  }

  return {
    columns: columns.concat(derived),
    derivedKeys: derived.map(function (c) { return c.key; })
  };
}
