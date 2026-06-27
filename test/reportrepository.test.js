'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ReportRepository } = require('../src/repository/ReportRepository');

test('normalizeHeaders trims and fills blanks', () => {
  assert.deepStrictEqual(
    ReportRepository.normalizeHeaders(['', '  X ', null, 'Y']),
    ['Ustun 1', 'X', 'Ustun 3', 'Y'],
  );
});

test('uniqueKeys disambiguates duplicates', () => {
  assert.deepStrictEqual(
    ReportRepository.uniqueKeys(['A', 'A', 'B', 'A']),
    ['A', 'A (2)', 'B', 'A (3)'],
  );
});

test('inferType detects number/date/string', () => {
  assert.strictEqual(ReportRepository.inferType([1, 2, 3]), 'number');
  assert.strictEqual(ReportRepository.inferType([new Date(), new Date()]), 'date');
  assert.strictEqual(ReportRepository.inferType(['a', 'b']), 'string');
  assert.strictEqual(ReportRepository.inferType([1, 'a']), 'string');
  assert.strictEqual(ReportRepository.inferType([]), 'string');
});

test('coerceValue converts per type', () => {
  assert.strictEqual(ReportRepository.coerceValue('5', 'number'), 5);
  assert.strictEqual(ReportRepository.coerceValue('abc', 'number'), null);
  assert.strictEqual(ReportRepository.coerceValue('', 'number'), null);
  assert.strictEqual(ReportRepository.coerceValue('  x  ', 'string'), 'x');
  const d = ReportRepository.coerceValue('2026-06-29', 'date');
  assert.ok(d instanceof Date && !isNaN(d.getTime()));
  assert.strictEqual(ReportRepository.coerceValue('not-a-date', 'date'), null);
});

test('classify splits dimensions / measures / dates', () => {
  const columns = [
    { key: 'Region', label: 'Region', index: 0, type: 'string' },
    { key: 'Amount', label: 'Amount', index: 1, type: 'number' },
    { key: 'D', label: 'D', index: 2, type: 'date' },
  ];
  const records = [
    { Region: 'T', Amount: 100, D: new Date(2026, 5, 10) },
    { Region: 'S', Amount: 200, D: new Date(2026, 5, 20) },
  ];
  const cls = ReportRepository.classify(columns, records);
  assert.deepStrictEqual(cls.dimensions.map((c) => c.key), ['Region']);
  assert.deepStrictEqual(cls.measures.map((c) => c.key), ['Amount']);
  assert.deepStrictEqual(cls.dateColumns.map((c) => c.key), ['D']);
  assert.strictEqual(cls.dimensions[0].distinctCount, 2);
});
