/**
 * @file Security.js
 * @fileoverview Security primitives: salted password hashing, session & CSRF
 *               token generation, HTML escaping and input sanitization.
 *               Pure string helpers are testable in Node; crypto/token helpers
 *               rely on the Apps Script Utilities service.
 */

 

const Security = (function () {
  const SEC = (typeof CONFIG !== 'undefined') ? CONFIG.SECURITY : {
    HASH_ALGORITHM: 'SHA_256',
    SALT_BYTE_LENGTH: 16,
    SESSION_TOKEN_BYTE_LENGTH: 32,
    CSRF_TOKEN_BYTE_LENGTH: 24,
    PASSWORD_MIN_LENGTH: 8,
  };

  /**
   * Converts a byte array to a lowercase hex string.
   * @param {!Array<number>} bytes Signed byte array (GAS digest output).
   * @return {string} Hex string.
   */
  function bytesToHex(bytes) {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      // Convert signed byte (-128..127) to unsigned (0..255).
      const b = (bytes[i] + 256) % 256;
      hex += (b < 16 ? '0' : '') + b.toString(16);
    }
    return hex;
  }

  /**
   * Generates `length` random bytes encoded as hex. Apps Script only.
   * @param {number} length Number of random bytes.
   * @return {string} Hex-encoded random string.
   */
  function randomHex(length) {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(Math.random() * 256));
    }
    // Mix in a UUID-derived digest for stronger entropy on the server.
    const uuid = Utilities.getUuid();
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      uuid + bytes.join(','),
    );
    return bytesToHex(digest).substring(0, length * 2);
  }

  /**
   * Generates a cryptographic salt. Apps Script only.
   * @return {string} Hex salt.
   */
  function generateSalt() {
    return randomHex(SEC.SALT_BYTE_LENGTH);
  }

  /**
   * Computes a salted SHA-256 hash of a password. Apps Script only.
   * @param {string} password Plain password.
   * @param {string} salt Per-user salt.
   * @return {string} Hex hash.
   */
  function hashPassword(password, salt) {
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm[SEC.HASH_ALGORITHM],
      salt + ':' + password,
      Utilities.Charset.UTF_8,
    );
    return bytesToHex(digest);
  }

  /**
   * Constant-time-ish comparison of two hex strings.
   * @param {string} a First string.
   * @param {string} b Second string.
   * @return {boolean} Whether they are equal.
   */
  function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' ||
        a.length !== b.length) {
      return false;
    }
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }

  /**
   * Verifies a password against a stored salted hash. Apps Script only.
   * @param {string} password Plain password.
   * @param {string} salt Stored salt.
   * @param {string} expectedHash Stored hash.
   * @return {boolean} Whether the password matches.
   */
  function verifyPassword(password, salt, expectedHash) {
    return safeEqual(hashPassword(password, salt), expectedHash);
  }

  /**
   * Generates an opaque session token. Apps Script only.
   * @return {string} Session token.
   */
  function generateSessionToken() {
    return randomHex(SEC.SESSION_TOKEN_BYTE_LENGTH);
  }

  /**
   * Generates a CSRF token. Apps Script only.
   * @return {string} CSRF token.
   */
  function generateCsrfToken() {
    return randomHex(SEC.CSRF_TOKEN_BYTE_LENGTH);
  }

  /**
   * Escapes HTML special characters to prevent XSS when rendering.
   * @param {*} value Any value; coerced to string.
   * @return {string} Escaped string.
   */
  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Sanitizes a free-text input: trims, removes control chars, caps length.
   * @param {*} value Input value.
   * @param {number=} maxLength Optional maximum length (default 500).
   * @return {string} Sanitized string.
   */
  function sanitizeText(value, maxLength) {
    const limit = maxLength || 500;
    if (value === null || value === undefined) {
      return '';
    }
    let s = String(value).trim();
    // Strip ASCII control characters except tab/newline.
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (s.length > limit) {
      s = s.substring(0, limit);
    }
    return s;
  }

  /**
   * Checks whether a password meets the minimum strength policy.
   * @param {string} password Candidate password.
   * @return {{valid: boolean, reason: string}} Result.
   */
  function validatePasswordStrength(password) {
    const min = SEC.PASSWORD_MIN_LENGTH;
    if (typeof password !== 'string' || password.length < min) {
      return { valid: false, reason: 'Parol kamida ' + min + ' belgidan iborat bo\'lishi kerak' };
    }
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return { valid: false, reason: 'Parol harf va raqamlardan iborat bo\'lishi kerak' };
    }
    return { valid: true, reason: '' };
  }

  return {
    bytesToHex: bytesToHex,
    randomHex: randomHex,
    generateSalt: generateSalt,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    safeEqual: safeEqual,
    generateSessionToken: generateSessionToken,
    generateCsrfToken: generateCsrfToken,
    escapeHtml: escapeHtml,
    sanitizeText: sanitizeText,
    validatePasswordStrength: validatePasswordStrength,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Security };
}
