'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { StatisticsService } = require('../src/services/StatisticsService');

function records() {
  return [
    { Region: 'T', Amount: 100, D: new Date(2026, 5, 10) },
    { Region: 'S', Amount: 200, D: new Date(2026, 5, 20) },
    { Region: 'T', Amount: 50, D: new Date(2026, 6, 5) },
  ];
}

test('computeKpis totals and per-measure stats', () => {
  const k = StatisticsService.computeKpis(records(), ['Amount']);
  assert.strictEqual(k.totalRecords, 3);
  assert.strictEqual(k.measures[0].sum, 350);
  assert.strictEqual(k.measures[0].count, 3);
  assert.ok(Math.abs(k.measures[0].avg - 116.6667) < 0.001);
});

test('groupBy count sorts descending', () => {
  const g = StatisticsService.groupBy(records(), 'Region', { agg: 'count' });
  assert.deepStrictEqual(g, [{ label: 'T', value: 2 }, { label: 'S', value: 1 }]);
});

test('groupBy sum of a measure', () => {
  const g = StatisticsService.groupBy(records(), 'Region', { agg: 'sum', measureKey: 'Amount' });
  assert.deepStrictEqual(g, [{ label: 'S', value: 200 }, { label: 'T', value: 150 }]);
});

test('groupBy topN with includeOther', () => {
  const g = StatisticsService.groupBy(records(), 'Region', { agg: 'count', topN: 1, includeOther: true });
  assert.deepStrictEqual(g, [{ label: 'T', value: 2 }, { label: 'Boshqalar', value: 1 }]);
});

test('empty dimension value uses placeholder label', () => {
  const g = StatisticsService.groupBy([{ Region: '' }, { Region: null }], 'Region', { agg: 'count' });
  assert.deepStrictEqual(g, [{ label: "(bo'sh)", value: 2 }]);
});

test('timeSeries groups by month chronologically', () => {
  const t = StatisticsService.timeSeries(records(), 'D', { agg: 'count' });
  assert.deepStrictEqual(t, [{ label: '2026-06', value: 2 }, { label: '2026-07', value: 1 }]);
});

test('timeSeries sum of measure', () => {
  const t = StatisticsService.timeSeries(records(), 'D', { agg: 'sum', measureKey: 'Amount' });
  assert.deepStrictEqual(t, [{ label: '2026-06', value: 300 }, { label: '2026-07', value: 50 }]);
});
