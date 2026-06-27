/**
 * @file Logger.js
 * @fileoverview Application logger. Writes structured entries to the LOGIN_LOG,
 *               ACTION_LOG and IMPORT_LOG sheets and mirrors to Stackdriver via
 *               console. Each log write is a single-row append (the only place
 *               a single-row write is acceptable). Apps Script only.
 */

const AppLogger = (function () {
  /**
   * Lazily builds a repository for a log sheet.
   * @param {string} sheetName Sheet name.
   * @return {!Object} Repository instance.
   */
  function repo(sheetName) {
    return new BaseRepository(sheetName);
  }

  /**
   * Records a login attempt.
   * @param {{username: string, success: boolean, ip: (string|undefined),
   *          userAgent: (string|undefined), message: (string|undefined)}} entry
   *     Login log entry.
   */
  function logLogin(entry) {
    try {
      repo(CONFIG.SHEETS.LOGIN_LOG).append([{
        timestamp: new Date(),
        username: entry.username || '',
        success: !!entry.success,
        ip: entry.ip || '',
        userAgent: entry.userAgent || '',
        message: entry.message || '',
      }]);
    } catch (e) {
      console.error('logLogin failed: ' + e);
    }
  }

  /**
   * Records a user action.
   * @param {string} username Acting user.
   * @param {string} action Action name.
   * @param {!Object=} details Arbitrary detail payload.
   * @param {string=} type One of CONFIG.LOG_TYPES.* (default ACTION).
   */
  function logAction(username, action, details, type) {
    try {
      repo(CONFIG.SHEETS.ACTION_LOG).append([{
        timestamp: new Date(),
        type: type || CONFIG.LOG_TYPES.ACTION,
        username: username || '',
        action: action || '',
        details: details || {},
      }]);
    } catch (e) {
      console.error('logAction failed: ' + e);
    }
  }

  /**
   * Records an error to the ACTION_LOG with ERROR type and to Stackdriver.
   * @param {string} username Acting user (may be empty).
   * @param {string} context Where the error occurred.
   * @param {!Error|string} error Error object or message.
   */
  function logError(username, context, error) {
    const message = (error && error.stack) ? error.stack : String(error);
    console.error('[' + context + '] ' + message);
    try {
      repo(CONFIG.SHEETS.ACTION_LOG).append([{
        timestamp: new Date(),
        type: CONFIG.LOG_TYPES.ERROR,
        username: username || '',
        action: context || '',
        details: { error: message },
      }]);
    } catch (e) {
      console.error('logError failed: ' + e);
    }
  }

  /**
   * Writes/updates an import-lifecycle entry in IMPORT_LOG.
   * @param {!Object} entry Import log record (matches IMPORT_LOG schema keys).
   */
  function logImport(entry) {
    try {
      repo(CONFIG.SHEETS.IMPORT_LOG).append([entry]);
    } catch (e) {
      console.error('logImport failed: ' + e);
    }
  }

  return {
    logLogin: logLogin,
    logAction: logAction,
    logError: logError,
    logImport: logImport,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppLogger };
}
