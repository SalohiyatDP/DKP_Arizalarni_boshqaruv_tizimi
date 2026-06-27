/**
 * WorkingDays.gs - Biznes kalendar moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Ish kuni hisob-kitobi: Shanba va Yakshanba hisoblanmaydi, bayram kunlari ham
 * hisoblanmaydi. SLA / muddat tahlili shu modul orqali bajariladi.
 *
 * "holidaySet" — buildHolidaySet() qaytaradigan obyekt:
 *   { fixed: {yyyy-MM-dd: true}, recurring: {MM-dd: true} }
 */

/**
 * Sananing vaqtini olib tashlab, mahalliy yarim tundagi nusxasini qaytaradi.
 * @param {Date} date
 * @returns {Date}
 */
function wdStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 2 xonali to'ldirish.
 * @param {number} n
 * @returns {string}
 */
function wdPad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Sanani 'yyyy-MM-dd' kalit ko'rinishida.
 * @param {Date} date
 * @returns {string}
 */
function wdDateKey(date) {
  return date.getFullYear() + '-' + wdPad2(date.getMonth() + 1) + '-' + wdPad2(date.getDate());
}

/**
 * Sanani 'MM-dd' (takrorlanuvchi bayram) kalit ko'rinishida.
 * @param {Date} date
 * @returns {string}
 */
function wdMonthDayKey(date) {
  return wdPad2(date.getMonth() + 1) + '-' + wdPad2(date.getDate());
}

/**
 * Sanaga kun qo'shilgan yangi nusxa.
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function wdAddDays(date, days) {
  var d = wdStartOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Bayram kunlari ro'yxatidan tez qidiruv obyekti tuzish.
 * @param {Array<Object>} rows - { date: (Date|string), recurring: boolean }
 * @returns {Object} { fixed, recurring }
 */
function buildHolidaySet(rows) {
  var fixed = {};
  var recurring = {};
  (rows || []).forEach(function (row) {
    if (!row || !row.date) {
      return;
    }
    var d = (row.date instanceof Date) ? row.date : new Date(row.date);
    if (isNaN(d.getTime())) {
      return;
    }
    if (row.recurring) {
      recurring[wdMonthDayKey(d)] = true;
    } else {
      fixed[wdDateKey(d)] = true;
    }
  });
  return { fixed: fixed, recurring: recurring };
}

/**
 * Sana dam olish kunimi (shanba/yakshanba)?
 * @param {Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  return getCalendarConfig().WEEKEND_DAYS.indexOf(date.getDay()) !== -1;
}

/**
 * Sana bayram kunimi?
 * @param {Date} date
 * @param {Object=} holidays
 * @returns {boolean}
 */
function isHoliday(date, holidays) {
  var h = holidays || { fixed: {}, recurring: {} };
  return !!h.fixed[wdDateKey(date)] || !!h.recurring[wdMonthDayKey(date)];
}

/**
 * Sana ish kunimi (dam olish emas va bayram emas)?
 * @param {Date} date
 * @param {Object=} holidays
 * @returns {boolean}
 */
function isWorkingDay(date, holidays) {
  return !isWeekend(date) && !isHoliday(date, holidays);
}

/**
 * Berilgan sanadan keyingi navbatdagi ish kuni.
 * @param {Date} date
 * @param {Object=} holidays
 * @returns {Date}
 */
function nextWorkingDay(date, holidays) {
  var maxScan = getCalendarConfig().MAX_DAY_SCAN;
  var cursor = wdAddDays(date, 1);
  var guard = 0;
  while (!isWorkingDay(cursor, holidays) && guard < maxScan) {
    cursor = wdAddDays(cursor, 1);
    guard++;
  }
  return cursor;
}

/**
 * Boshlang'ich sanaga n ta ish kuni qo'shadi (boshlang'ich kun hisobga olinmaydi).
 * Manfiy n orqaga yuradi.
 * @param {Date} startDate
 * @param {number} n
 * @param {Object=} holidays
 * @returns {Date}
 */
function addWorkingDays(startDate, n, holidays) {
  var maxScan = getCalendarConfig().MAX_DAY_SCAN;
  var remaining = Math.abs(n);
  var step = n < 0 ? -1 : 1;
  var cursor = wdStartOfDay(startDate);
  var guard = 0;
  while (remaining > 0 && guard < maxScan) {
    cursor = wdAddDays(cursor, step);
    if (isWorkingDay(cursor, holidays)) {
      remaining--;
    }
    guard++;
  }
  return cursor;
}

/**
 * Ikki sana orasidagi ish kunlari (boshi chiqarib, oxiri kiritib). Tartibga bog'liq emas.
 * @param {Date} start
 * @param {Date} end
 * @param {Object=} holidays
 * @returns {number}
 */
function workingDaysBetween(start, end, holidays) {
  var maxScan = getCalendarConfig().MAX_DAY_SCAN;
  var from = wdStartOfDay(start);
  var to = wdStartOfDay(end);
  if (from.getTime() === to.getTime()) {
    return 0;
  }
  if (from.getTime() > to.getTime()) {
    var tmp = from;
    from = to;
    to = tmp;
  }
  var count = 0;
  var cursor = wdAddDays(from, 1);
  var guard = 0;
  while (cursor.getTime() <= to.getTime() && guard < maxScan) {
    if (isWorkingDay(cursor, holidays)) {
      count++;
    }
    cursor = wdAddDays(cursor, 1);
    guard++;
  }
  return count;
}

/**
 * fromDate dan dueDate gacha qolgan ish kunlari (muddat o'tgan bo'lsa manfiy).
 * @param {Date} fromDate
 * @param {Date} dueDate
 * @param {Object=} holidays
 * @returns {number}
 */
function remainingWorkingDays(fromDate, dueDate, holidays) {
  var from = wdStartOfDay(fromDate);
  var due = wdStartOfDay(dueDate);
  if (due.getTime() >= from.getTime()) {
    return workingDaysBetween(from, due, holidays);
  }
  return -workingDaysBetween(due, from, holidays);
}
