/**
 * WorkingDays.gs - Biznes kalendar moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Ish kuni hisob-kitobi: Shanba va Yakshanba hisoblanmaydi, bayram kunlari ham
 * hisoblanmaydi. SLA / muddat tahlili shu modul orqali bajariladi.
 *
 * Optimizatsiya: workingDaysBetween() kun-bakun aylanmaydi — hafta kunlari O(1)
 * arifmetika bilan, bayramlar esa faqat ro'yxat bo'yicha hisoblanadi. Bu 50 000+
 * yozuv uchun ham tez ishlashni ta'minlaydi.
 *
 * "holidays" — buildHolidaySet() qaytaradigan obyekt:
 *   { fixed: {yyyy-MM-dd:true}, recurring: {MM-dd:true},
 *     fixedList: [Date...], recurringList: ['MM-dd'...] }
 */

var WD_MS_PER_DAY = 24 * 60 * 60 * 1000;

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
 * @returns {Object} { fixed, recurring, fixedList, recurringList }
 */
function buildHolidaySet(rows) {
  var fixed = {};
  var recurring = {};
  var fixedList = [];
  var recurringList = [];
  (rows || []).forEach(function (row) {
    if (!row || !row.date) {
      return;
    }
    var d = (row.date instanceof Date) ? row.date : new Date(row.date);
    if (isNaN(d.getTime())) {
      return;
    }
    if (row.recurring) {
      var md = wdMonthDayKey(d);
      if (!recurring[md]) {
        recurring[md] = true;
        recurringList.push(md);
      }
    } else {
      var key = wdDateKey(d);
      if (!fixed[key]) {
        fixed[key] = true;
        fixedList.push(wdStartOfDay(d));
      }
    }
  });
  return { fixed: fixed, recurring: recurring, fixedList: fixedList, recurringList: recurringList };
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
 * Hafta kuni (dam olish emas)mi?
 * @param {Date} date
 * @returns {boolean}
 */
function wdIsWeekday(date) {
  return !isWeekend(date);
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
 * [lo, hi] (ikkalasi ham kiritilgan) oralig'idagi hafta kunlari soni — O(1).
 * @param {Date} lo - boshlang'ich (yarim tun)
 * @param {Date} hi - oxirgi (yarim tun)
 * @returns {number}
 */
function wdWeekdaysInclusive(lo, hi) {
  if (hi.getTime() < lo.getTime()) {
    return 0;
  }
  var total = Math.round((hi.getTime() - lo.getTime()) / WD_MS_PER_DAY) + 1;
  var fullWeeks = Math.floor(total / 7);
  var weekdays = fullWeeks * 5;
  var remainder = total - fullWeeks * 7;
  var dow = lo.getDay();
  for (var i = 0; i < remainder; i++) {
    var d = (dow + i) % 7;
    if (d !== 0 && d !== 6) {
      weekdays++;
    }
  }
  return weekdays;
}

/**
 * (lo, hi] oralig'iga (lo chiqarib, hi kiritib) tushadigan bayram-hafta kunlari soni.
 * Faqat bayramlar ro'yxati bo'yicha aylanadi (O(bayramlar soni)).
 * @param {Date} lo
 * @param {Date} hi
 * @param {Object} holidays
 * @returns {number}
 */
function wdHolidaysInRange(lo, hi, holidays) {
  if (!holidays || hi.getTime() <= lo.getTime()) {
    return 0;
  }
  var counted = {};
  var count = 0;

  function consider(date) {
    if (!wdIsWeekday(date)) {
      return;
    }
    var t = date.getTime();
    if (t <= lo.getTime() || t > hi.getTime()) {
      return;
    }
    var key = wdDateKey(date);
    if (!counted[key]) {
      counted[key] = true;
      count++;
    }
  }

  (holidays.fixedList || []).forEach(function (d) {
    consider(wdStartOfDay(d));
  });

  var startYear = lo.getFullYear();
  var endYear = hi.getFullYear();
  (holidays.recurringList || []).forEach(function (md) {
    var parts = md.split('-');
    var month = parseInt(parts[0], 10) - 1;
    var day = parseInt(parts[1], 10);
    for (var y = startYear; y <= endYear; y++) {
      consider(new Date(y, month, day));
    }
  });

  return count;
}

/**
 * Ikki sana orasidagi ish kunlari (boshi chiqarib, oxiri kiritib). Tartibga bog'liq emas.
 * @param {Date} start
 * @param {Date} end
 * @param {Object=} holidays
 * @returns {number}
 */
function workingDaysBetween(start, end, holidays) {
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
  var firstAfter = wdAddDays(from, 1);
  var weekdays = wdWeekdaysInclusive(firstAfter, to);
  var holidayCount = wdHolidaysInRange(from, to, holidays);
  var result = weekdays - holidayCount;
  return result < 0 ? 0 : result;
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
