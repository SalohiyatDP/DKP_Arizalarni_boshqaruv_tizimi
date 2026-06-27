/**
 * @file Validator.js
 * @fileoverview Input validation helpers used by controllers/services for
 *               server-side validation. Pure functions — Node-testable.
 */

 

const Validator = (function () {
  /**
   * Returns true when value is a non-empty string after trimming.
   * @param {*} value Value to check.
   * @return {boolean} Whether non-empty.
   */
  function isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validates an Uzbekistan PNFL (14 numeric digits).
   * @param {*} value Candidate PNFL.
   * @return {boolean} Whether valid.
   */
  function isValidPnfl(value) {
    return /^\d{14}$/.test(String(value || '').trim());
  }

  /**
   * Validates a cadastre number (non-empty, alphanumeric with separators).
   * @param {*} value Candidate cadastre number.
   * @return {boolean} Whether valid.
   */
  function isValidCadastre(value) {
    return /^[0-9A-Za-z:./-]{3,40}$/.test(String(value || '').trim());
  }

  /**
   * Validates that value is a finite number (or numeric string).
   * @param {*} value Candidate.
   * @return {boolean} Whether numeric.
   */
  function isNumeric(value) {
    if (typeof value === 'number') {
      return isFinite(value);
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return isFinite(Number(value));
    }
    return false;
  }

  /**
   * Validates that value is a real Date or parseable date string.
   * @param {*} value Candidate.
   * @return {boolean} Whether a valid date.
   */
  function isValidDate(value) {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return !isNaN(new Date(value).getTime());
    }
    return false;
  }

  /**
   * Checks membership in an allowed-values set.
   * @param {*} value Candidate value.
   * @param {!Object|!Array} allowed Enum object or array of allowed values.
   * @return {boolean} Whether allowed.
   */
  function isOneOf(value, allowed) {
    const list = Array.isArray(allowed) ? allowed : Object.keys(allowed).map(function (k) {
      return allowed[k];
    });
    return list.indexOf(value) !== -1;
  }

  /**
   * Validates an object against a schema of rules.
   * @param {!Object} obj Object to validate.
   * @param {!Object<string, function(*):boolean>} rules Map of field -> predicate.
   * @return {{valid: boolean, errors: !Array<string>}} Validation result.
   */
  function validateObject(obj, rules) {
    const errors = [];
    Object.keys(rules).forEach(function (field) {
      if (!rules[field](obj ? obj[field] : undefined)) {
        errors.push(field);
      }
    });
    return { valid: errors.length === 0, errors: errors };
  }

  return {
    isNonEmpty: isNonEmpty,
    isValidPnfl: isValidPnfl,
    isValidCadastre: isValidCadastre,
    isNumeric: isNumeric,
    isValidDate: isValidDate,
    isOneOf: isOneOf,
    validateObject: validateObject,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Validator };
}
