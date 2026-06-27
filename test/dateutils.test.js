'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { DateUtils } = require('../src/utils/DateUtils');

// Reference dates (2026):
//   2026-06-26 = Friday
//   2026-06-27 = Saturday
//   2026-06-28 = Sunday
//   2026-06-29 = Monday
//   2026-07-04 = Saturday
const FRI = new Date(2026, 5, 26);
const SAT = new Date(2026, 5, 27);
const SUN = new Date(2026, 5, 28);
const MON = new Date(2026, 5, 29);

test('isWeekend identifies Saturday and Sunday', () => {
  assert.strictEqual(DateUtils.isWeekend(SAT), true);
  assert.strictEqual(DateUtils.isWeekend(SUN), true);
  assert.strictEqual(DateUtils.isWeekend(FRI), false);
  assert.strictEqual(DateUtils.isWeekend(MON), false);
});

test('isWorkingDay excludes weekends with empty holidays', () => {
  assert.strictEqual(DateUtils.isWorkingDay(FRI), true);
  assert.strictEqual(DateUtils.isWorkingDay(SAT), false);
  assert.strictEqual(DateUtils.isWorkingDay(SUN), false);
  assert.strictEqual(DateUtils.isWorkingDay(MON), true);
});

test('buildHolidaySet + isHoliday handle fixed and recurring dates', () => {
  const holidays = DateUtils.buildHolidaySet([
    { date: new Date(2026, 5, 29), recurring: false }, // Mon Jun 29 fixed
    { date: new Date(2020, 2, 21), recurring: true },  // recurring Mar 21
  ]);
  assert.strictEqual(DateUtils.isHoliday(MON, holidays), true);
  assert.strictEqual(DateUtils.isWorkingDay(MON, holidays), false);
  // Recurring matches any year on Mar 21.
  assert.strictEqual(DateUtils.isHoliday(new Date(2030, 2, 21), holidays), true);
  assert.strictEqual(DateUtils.isHoliday(new Date(2026, 2, 20), holidays), false);
});

test('nextWorkingDay skips weekends', () => {
  // Friday -> Monday (skip Sat/Sun)
  assert.strictEqual(DateUtils.toDateKey(DateUtils.nextWorkingDay(FRI)), '2026-06-29');
  // Monday -> Tuesday
  assert.strictEqual(DateUtils.toDateKey(DateUtils.nextWorkingDay(MON)), '2026-06-30');
});

test('addWorkingDays does not count the start day and skips weekends', () => {
  // Friday + 1 working day = Monday
  assert.strictEqual(DateUtils.toDateKey(DateUtils.addWorkingDays(FRI, 1)), '2026-06-29');
  // Monday + 5 working days = next Monday (Jul 6), skipping Jul 4/5 weekend
  assert.strictEqual(DateUtils.toDateKey(DateUtils.addWorkingDays(MON, 5)), '2026-07-06');
  // Negative direction: Monday - 1 working day = Friday
  assert.strictEqual(DateUtils.toDateKey(DateUtils.addWorkingDays(MON, -1)), '2026-06-26');
});

test('addWorkingDays respects holidays', () => {
  // Tue Jun 30 is a holiday -> Monday + 1 working day should land on Wed Jul 1
  const holidays = DateUtils.buildHolidaySet([
    { date: new Date(2026, 5, 30), recurring: false },
  ]);
  assert.strictEqual(
    DateUtils.toDateKey(DateUtils.addWorkingDays(MON, 1, holidays)),
    '2026-07-01',
  );
});

test('workingDaysBetween excludes start, includes end', () => {
  const fri3 = new Date(2026, 6, 3); // Friday Jul 3
  // (Mon Jun29, Fri Jul3] -> Tue,Wed,Thu,Fri = 4
  assert.strictEqual(DateUtils.workingDaysBetween(MON, fri3), 4);
  // Order independent
  assert.strictEqual(DateUtils.workingDaysBetween(fri3, MON), 4);
  // Same day -> 0
  assert.strictEqual(DateUtils.workingDaysBetween(MON, MON), 0);
  // Across a weekend: Fri Jun26 -> Mon Jun29 = 1 (only Monday counts)
  assert.strictEqual(DateUtils.workingDaysBetween(FRI, MON), 1);
});

test('workingDaysBetween subtracts holidays', () => {
  const fri3 = new Date(2026, 6, 3);
  const holidays = DateUtils.buildHolidaySet([
    { date: new Date(2026, 6, 1), recurring: false }, // Wed Jul 1
  ]);
  // 4 working days minus 1 holiday = 3
  assert.strictEqual(DateUtils.workingDaysBetween(MON, fri3, holidays), 3);
});

test('remainingWorkingDays is signed (negative when overdue)', () => {
  const fri3 = new Date(2026, 6, 3);
  assert.strictEqual(DateUtils.remainingWorkingDays(MON, fri3), 4);
  // Due in the past -> negative
  assert.strictEqual(DateUtils.remainingWorkingDays(fri3, MON), -4);
  // Due today -> 0
  assert.strictEqual(DateUtils.remainingWorkingDays(MON, MON), 0);
});
