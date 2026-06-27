'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { FilterService } = require('../src/services/FilterService');

function records() {
  return [
    { Region: 'T', Amount: 100, D: new Date(2026, 5, 10), Name: 'Ali' },
    { Region: 'S', Amount: 200, D: new Date(2026, 5, 20), Name: 'Vali' },
    { Region: 'T', Amount: 50, D: new Date(2026, 6, 5), Name: 'Hasan' },
  ];
}

test('applyFilters: in', () => {
  const out = FilterService.applyFilters(records(), { Region: { type: 'in', values: ['T'] } });
  assert.deepStrictEqual(out.map((r) => r.Name), ['Ali', 'Hasan']);
});

test('applyFilters: numberRange', () => {
  const out = FilterService.applyFilters(records(), { Amount: { type: 'numberRange', min: 80 } });
  assert.deepStrictEqual(out.map((r) => r.Name), ['Ali', 'Vali']);
});

test('applyFilters: dateRange (inclusive, by day)', () => {
  const out = FilterService.applyFilters(records(), {
    D: { type: 'dateRange', from: '2026-06-01', to: '2026-06-30' },
  });
  assert.deepStrictEqual(out.map((r) => r.Name), ['Ali', 'Vali']);
});

test('applyFilters: search over specific columns', () => {
  const out = FilterService.applyFilters(records(), {
    __search: { type: 'search', term: 'has', columns: ['Name'] },
  });
  assert.deepStrictEqual(out.map((r) => r.Name), ['Hasan']);
});

test('applyFilters: combined filters are ANDed', () => {
  const out = FilterService.applyFilters(records(), {
    Region: { type: 'in', values: ['T'] },
    Amount: { type: 'numberRange', min: 80 },
  });
  assert.deepStrictEqual(out.map((r) => r.Name), ['Ali']);
});

test('getFilterOptions is cascading (excludes own filter)', () => {
  const filters = { Region: { type: 'in', values: ['T'] } };
  const opts = FilterService.getFilterOptions(records(), ['Region', 'Name'], filters);
  // Region options ignore the Region filter -> both regions
  assert.deepStrictEqual(opts.Region, ['S', 'T']);
  // Name options respect the Region=T filter
  assert.deepStrictEqual(opts.Name.sort(), ['Ali', 'Hasan']);
});

test('empty filters return a copy of all records', () => {
  const recs = records();
  const out = FilterService.applyFilters(recs, {});
  assert.strictEqual(out.length, 3);
  assert.notStrictEqual(out, recs);
});
