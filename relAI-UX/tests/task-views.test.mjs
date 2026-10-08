import test from 'node:test';
import assert from 'node:assert/strict';
import {addTaskDays, shiftTaskPeriod, taskWeekDates, taskMonthDates} from '../src/task-views.js';

test('month navigation clamps the selected day across short and leap months', () => {
  assert.equal(shiftTaskPeriod('2027-01-31', 'month', 1), '2027-02-28');
  assert.equal(shiftTaskPeriod('2028-01-31', 'month', 1), '2028-02-29');
  assert.equal(shiftTaskPeriod('2026-03-31', 'month', -1), '2026-02-28');
  assert.equal(shiftTaskPeriod('2026-12-15', 'month', 1), '2027-01-15');
});

test('daily and weekly navigation keep local calendar dates through year and DST boundaries', () => {
  assert.equal(addTaskDays('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftTaskPeriod('2026-03-28', 'day', 1), '2026-03-29');
  assert.equal(shiftTaskPeriod('2026-03-29', 'week', 1), '2026-04-05');
  assert.equal(shiftTaskPeriod('2026-10-26', 'day', -1), '2026-10-25');
});

test('week and month grids start Monday and contain every day without duplicates', () => {
  assert.deepEqual(taskWeekDates('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  const month = taskMonthDates('2026-03-31');
  assert.equal(month.length, 42);
  assert.equal(month[0], '2026-02-23');
  assert.equal(month.at(-1), '2026-04-05');
  assert.equal(new Set(month).size, month.length);
  assert.equal(month.filter(date => date.startsWith('2026-03')).length, 31);
  assert.equal(taskMonthDates('2027-02-20').length, 28);
});
