'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Security } = require('../src/utils/Security');

test('escapeHtml neutralizes XSS-relevant characters', () => {
  assert.strictEqual(
    Security.escapeHtml('<script>alert("x&y")</script>'),
    '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;',
  );
  assert.strictEqual(Security.escapeHtml(null), '');
  assert.strictEqual(Security.escapeHtml(undefined), '');
  assert.strictEqual(Security.escapeHtml(42), '42');
});

test('sanitizeText trims, strips control chars and caps length', () => {
  assert.strictEqual(Security.sanitizeText('  hello  '), 'hello');
  assert.strictEqual(Security.sanitizeText('a\u0000b\u0007c'), 'abc');
  assert.strictEqual(Security.sanitizeText('abcdef', 3), 'abc');
  assert.strictEqual(Security.sanitizeText(null), '');
});

test('bytesToHex converts signed bytes correctly', () => {
  // -1 -> 255 -> 'ff', 0 -> '00', 16 -> '10'
  assert.strictEqual(Security.bytesToHex([0, 16, -1, 127, -128]), '0010ff7f80');
});

test('safeEqual compares strings', () => {
  assert.strictEqual(Security.safeEqual('abc', 'abc'), true);
  assert.strictEqual(Security.safeEqual('abc', 'abd'), false);
  assert.strictEqual(Security.safeEqual('abc', 'ab'), false);
  assert.strictEqual(Security.safeEqual('abc', null), false);
});

test('validatePasswordStrength enforces length + complexity', () => {
  assert.strictEqual(Security.validatePasswordStrength('short1').valid, false);
  assert.strictEqual(Security.validatePasswordStrength('alllettersonly').valid, false);
  assert.strictEqual(Security.validatePasswordStrength('12345678').valid, false);
  assert.strictEqual(Security.validatePasswordStrength('Password1').valid, true);
});
