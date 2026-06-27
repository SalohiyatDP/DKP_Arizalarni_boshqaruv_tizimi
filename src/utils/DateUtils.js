/**
 * @file DateUtils.js
 * @fileoverview Business calendar utilities. All date math for SLA / deadlines
 *               flows through here. Pure (no SpreadsheetApp calls) so it is
 *               fully unit-testable and reusable on client and server.
 *
 * Rules (per specification):
 *   - Saturday (getDay()===6) is NOT a working day.
 *   - Sunday   (getDay()===0) is NOT a working day.
 *   - Any date present in the HOLIDAYS table is NOT a working day.
 *
 * A "HolidaySet" is an object produced by buildHolidaySet():
 *   { fixed: Set<'yyyy-MM-dd'>, recurring: Set<'MM-dd'> }
 */

 

const DateUtils = (function () {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const WEEKEND = (typeof CONFIG !== 'undefined')
    ? CONFIG.CALENDAR.WEEKEND_DAYS
    : [0, 6];
  const MAX_SCAN = (typeof CONFIG !== 'undefined')
    ? CONFIG.CALENDAR.MAX_DAY_SCAN
    : 3650;

  /**
   * Strips the time component, returning a new Date at local midnight.
   * @param {!Date} date Input date.
   * @return {!Date} New date at 00:00:00.000.
   */
  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Pads a number to 2 digits.
   * @param {number} n Number.
   * @return {string} Zero-padded string.
   */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /**
   * Formats a date as 'yyyy-MM-dd' (calendar key, timezone-stable for local).
   * @param {!Date} date Input date.
   * @return {string} ISO calendar-date key.
   */
  function toDateKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' +
      pad2(date.getDate());
  }

  /**
   * Formats a date as 'MM-dd' (recurring-holiday key).
   * @param {!Date} date Input date.
   * @return {string} Month-day key.
   */
  function toMonthDayKey(date) {
    return pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /**
   * Returns a copy of `date` advanced by `days` calendar days.
   * @param {!Date} date Input date.
   * @param {number} days Days to add (may be negative).
   * @return {!Date} New date.
   */
  function addDays(date, days) {
    const d = startOfDay(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Builds a HolidaySet from HOLIDAYS rows.
   * @param {!Array<{date: (Date|string), recurring: (boolean|undefined)}>} rows
   *     Holiday rows; `date` may be a Date or a parseable date string.
   * @return {{fixed: !Set<string>, recurring: !Set<string>}} Holiday lookup.
   */
  function buildHolidaySet(rows) {
    const fixed = new Set();
    const recurring = new Set();
    (rows || []).forEach(function (row) {
      if (!row || !row.date) {
        return;
      }
      const d = (row.date instanceof Date) ? row.date : new Date(row.date);
      if (isNaN(d.getTime())) {
        return;
      }
      if (row.recurring) {
        recurring.add(toMonthDayKey(d));
      } else {
        fixed.add(toDateKey(d));
      }
    });
    return { fixed: fixed, recurring: recurring };
  }

  /** Empty holiday set used when none is provided. */
  const EMPTY_HOLIDAYS = { fixed: new Set(), recurring: new Set() };

  /**
   * Returns true if `date` falls on a configured weekend day.
   * @param {!Date} date Input date.
   * @return {boolean} Whether it is a weekend.
   */
  function isWeekend(date) {
    return WEEKEND.indexOf(date.getDay()) !== -1;
  }

  /**
   * Returns true if `date` is a holiday in the given set.
   * @param {!Date} date Input date.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {boolean} Whether it is a holiday.
   */
  function isHoliday(date, holidays) {
    const h = holidays || EMPTY_HOLIDAYS;
    return h.fixed.has(toDateKey(date)) || h.recurring.has(toMonthDayKey(date));
  }

  /**
   * Returns true if `date` is a working day (not weekend, not holiday).
   * @param {!Date} date Input date.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {boolean} Whether it is a working day.
   */
  function isWorkingDay(date, holidays) {
    return !isWeekend(date) && !isHoliday(date, holidays);
  }

  /**
   * Returns the next working day strictly after `date`.
   * @param {!Date} date Input date.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {!Date} Next working day.
   */
  function nextWorkingDay(date, holidays) {
    let cursor = addDays(date, 1);
    let guard = 0;
    while (!isWorkingDay(cursor, holidays) && guard < MAX_SCAN) {
      cursor = addDays(cursor, 1);
      guard++;
    }
    return cursor;
  }

  /**
   * Adds `n` working days to `startDate`. The start date itself is not counted;
   * counting begins from the next day. Negative `n` walks backwards.
   * @param {!Date} startDate Anchor date.
   * @param {number} n Number of working days to add.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {!Date} Resulting working day.
   */
  function addWorkingDays(startDate, n, holidays) {
    let remaining = Math.abs(n);
    const step = n < 0 ? -1 : 1;
    let cursor = startOfDay(startDate);
    let guard = 0;
    while (remaining > 0 && guard < MAX_SCAN) {
      cursor = addDays(cursor, step);
      if (isWorkingDay(cursor, holidays)) {
        remaining--;
      }
      guard++;
    }
    return cursor;
  }

  /**
   * Counts working days between two dates. The start day is excluded and the
   * end day is included (matching SLA "elapsed working days" semantics).
   * Returns a positive count regardless of argument order.
   * @param {!Date} start Range start.
   * @param {!Date} end Range end.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {number} Number of working days in (start, end].
   */
  function workingDaysBetween(start, end, holidays) {
    let from = startOfDay(start);
    let to = startOfDay(end);
    if (from.getTime() === to.getTime()) {
      return 0;
    }
    if (from.getTime() > to.getTime()) {
      const tmp = from;
      from = to;
      to = tmp;
    }
    let count = 0;
    let cursor = addDays(from, 1);
    let guard = 0;
    while (cursor.getTime() <= to.getTime() && guard < MAX_SCAN) {
      if (isWorkingDay(cursor, holidays)) {
        count++;
      }
      cursor = addDays(cursor, 1);
      guard++;
    }
    return count;
  }

  /**
   * Working days remaining from `fromDate` until `dueDate` (inclusive of due).
   * Negative result means the deadline is in the past (overdue).
   * @param {!Date} fromDate Reference "today".
   * @param {!Date} dueDate Deadline.
   * @param {{fixed: !Set<string>, recurring: !Set<string>}=} holidays Set.
   * @return {number} Signed remaining working days.
   */
  function remainingWorkingDays(fromDate, dueDate, holidays) {
    const from = startOfDay(fromDate);
    const due = startOfDay(dueDate);
    if (due.getTime() >= from.getTime()) {
      return workingDaysBetween(from, due, holidays);
    }
    return -workingDaysBetween(due, from, holidays);
  }

  return {
    MS_PER_DAY: MS_PER_DAY,
    startOfDay: startOfDay,
    toDateKey: toDateKey,
    toMonthDayKey: toMonthDayKey,
    addDays: addDays,
    buildHolidaySet: buildHolidaySet,
    isWeekend: isWeekend,
    isHoliday: isHoliday,
    isWorkingDay: isWorkingDay,
    nextWorkingDay: nextWorkingDay,
    addWorkingDays: addWorkingDays,
    workingDaysBetween: workingDaysBetween,
    remainingWorkingDays: remainingWorkingDays,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DateUtils };
}
