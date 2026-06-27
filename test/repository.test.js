'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BaseRepository } = require('../src/repository/BaseRepository');

// Only the pure, static coercion helpers are exercised here (no SpreadsheetApp).

test('coerceOut_ converts cell values to typed JS values', () => {
  assert.strictEqual(BaseRepository.coerceOut_('5', 'number'), 5);
  assert.strictEqual(BaseRepository.coerceOut_('', 'number'), 0);
  assert.strictEqual(BaseRepository.coerceOut_('TRUE', 'boolean'), true);
  assert.strictEqual(BaseRepository.coerceOut_('', 'boolean'), false);
  assert.strictEqual(BaseRepository.coerceOut_('text', 'string'), 'text');
  assert.deepStrictEqual(BaseRepository.coerceOut_('{"a":1}', 'json'), { a: 1 });
  assert.strictEqual(BaseRepository.coerceOut_('bad json', 'json'), null);
  assert.strictEqual(BaseRepository.coerceOut_('', 'string'), null);
});

test('coerceIn_ converts typed JS values to cell-writable values', () => {
  assert.strictEqual(BaseRepository.coerceIn_(null, 'string'), '');
  assert.strictEqual(BaseRepository.coerceIn_(undefined, 'number'), '');
  assert.strictEqual(BaseRepository.coerceIn_({ a: 1 }, 'json'), '{"a":1}');
  assert.strictEqual(BaseRepository.coerceIn_('already', 'json'), 'already');
  assert.strictEqual(BaseRepository.coerceIn_('7', 'number'), 7);
  assert.strictEqual(BaseRepository.coerceIn_(true, 'boolean'), true);
});
