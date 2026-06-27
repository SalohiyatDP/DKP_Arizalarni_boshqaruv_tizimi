'use strict';

/**
 * Flat ESLint configuration (ESLint v9+).
 * Server code is Apps Script (V8 runtime, global script scope); the cross-file
 * globals and Apps Script services are declared as read/writable globals.
 */
module.exports = [
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        // Apps Script services
        SpreadsheetApp: 'readonly',
        PropertiesService: 'readonly',
        CacheService: 'readonly',
        LockService: 'readonly',
        Utilities: 'readonly',
        HtmlService: 'readonly',
        ScriptApp: 'readonly',
        Session: 'readonly',
        DriveApp: 'readonly',
        UrlFetchApp: 'readonly',
        Logger: 'readonly',
        console: 'readonly',
        // Node/test interop
        module: 'writable',
        require: 'readonly',
        // Cross-file application globals
        CONFIG: 'readonly',
        SCHEMA: 'readonly',
        getHeaderRow: 'readonly',
        getColumnIndexMap: 'readonly',
        DateUtils: 'writable',
        Security: 'writable',
        Validator: 'writable',
        CacheManager: 'writable',
        AppLogger: 'writable',
        BaseRepository: 'writable',
        Database: 'writable',
        deepFreeze_: 'writable',
      },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-unused-vars': ['warn', { args: 'none', caughtErrorsIgnorePattern: '^_' }],
    },
  },
];
