/**
 * @file CacheManager.js
 * @fileoverview Thin wrapper over Apps Script CacheService with JSON
 *               (de)serialization and gzip compression for large payloads.
 *               Reduces SpreadsheetApp round-trips for hot data (stats, filters).
 *               Apps Script only.
 */

 

const CacheManager = (function () {
  const TTL = (typeof CONFIG !== 'undefined')
    ? CONFIG.PERFORMANCE.CACHE_TTL_SECONDS
    : 600;
  // CacheService entries are limited to ~100KB; compress above this threshold.
  const COMPRESS_THRESHOLD_BYTES = 50000;
  const COMPRESSED_PREFIX = 'gz:';

  /**
   * Returns the script-wide cache instance.
   * @return {!Cache} Script cache.
   */
  function cache() {
    return CacheService.getScriptCache();
  }

  /**
   * Stores a JSON-serializable value, compressing large payloads.
   * @param {string} key Cache key.
   * @param {*} value Serializable value.
   * @param {number=} ttlSeconds Optional TTL override.
   */
  function put(key, value, ttlSeconds) {
    const json = JSON.stringify(value);
    let stored = json;
    if (json.length > COMPRESS_THRESHOLD_BYTES) {
      const blob = Utilities.gzip(Utilities.newBlob(json));
      stored = COMPRESSED_PREFIX + Utilities.base64Encode(blob.getBytes());
    }
    cache().put(key, stored, ttlSeconds || TTL);
  }

  /**
   * Retrieves and parses a cached value, decompressing if needed.
   * @param {string} key Cache key.
   * @return {*} Parsed value or null when absent.
   */
  function get(key) {
    const raw = cache().get(key);
    if (raw === null || raw === undefined) {
      return null;
    }
    let json = raw;
    if (raw.indexOf(COMPRESSED_PREFIX) === 0) {
      const bytes = Utilities.base64Decode(raw.substring(COMPRESSED_PREFIX.length));
      const blob = Utilities.ungzip(Utilities.newBlob(bytes, 'application/x-gzip'));
      json = blob.getDataAsString();
    }
    try {
      return JSON.parse(json);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Removes a key from the cache.
   * @param {string} key Cache key.
   */
  function remove(key) {
    cache().remove(key);
  }

  /**
   * Removes multiple keys from the cache.
   * @param {!Array<string>} keys Cache keys.
   */
  function removeAll(keys) {
    cache().removeAll(keys);
  }

  /**
   * Returns a cached value or computes, stores and returns it.
   * @param {string} key Cache key.
   * @param {function():*} producer Function computing the value on a miss.
   * @param {number=} ttlSeconds Optional TTL override.
   * @return {*} Cached or freshly computed value.
   */
  function remember(key, producer, ttlSeconds) {
    const cached = get(key);
    if (cached !== null) {
      return cached;
    }
    const value = producer();
    put(key, value, ttlSeconds);
    return value;
  }

  return {
    put: put,
    get: get,
    remove: remove,
    removeAll: removeAll,
    remember: remember,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheManager };
}
