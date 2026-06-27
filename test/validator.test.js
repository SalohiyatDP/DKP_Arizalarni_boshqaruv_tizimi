'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Validator } = require('../src/utils/Validator');

test('isNonEmpty', () => {
  assert.strictEqual(Validator.isNonEmpty('x'), true);
  assert.strictEqual(Validator.isNonEmpty('   '), false);
  assert.strictEqual(Validator.isNonEmpty(''), false);
  assert.strictEqual(Validator.isNonEmpty(5), false);
});

test('isValidPnfl requires exactly 14 digits', () => {
  assert.strictEqual(Validator.isValidPnfl('12345678901234'), true);
  assert.strictEqual(Validator.isValidPnfl('1234567890123'), false);
  assert.strictEqual(Validator.isValidPnfl('1234567890123a'), false);
});

test('isNumeric', () => {
  assert.strictEqual(Validator.isNumeric(3.14), true);
  assert.strictEqual(Validator.isNumeric('42'), true);
  assert.strictEqual(Validator.isNumeric('abc'), false);
  assert.strictEqual(Validator.isNumeric(''), false);
  assert.strictEqual(Validator.isNumeric(Infinity), false);
});

test('isValidDate', () => {
  assert.strictEqual(Validator.isValidDate(new Date()), true);
  assert.strictEqual(Validator.isValidDate('2026-06-29'), true);
  assert.strictEqual(Validator.isValidDate('not-a-date'), false);
  assert.strictEqual(Validator.isValidDate(new Date('bad')), false);
});

test('isOneOf works with enum object and array', () => {
  assert.strictEqual(Validator.isOneOf('ADMIN', { A: 'ADMIN', B: 'REGION' }), true);
  assert.strictEqual(Validator.isOneOf('NOPE', { A: 'ADMIN' }), false);
  assert.strictEqual(Validator.isOneOf(2, [1, 2, 3]), true);
});

test('validateObject reports invalid fields', () => {
  const result = Validator.validateObject(
    { pnfl: '123', amount: 'x' },
    { pnfl: Validator.isValidPnfl, amount: Validator.isNumeric },
  );
  assert.strictEqual(result.valid, false);
  assert.deepStrictEqual(result.errors.sort(), ['amount', 'pnfl']);
});
