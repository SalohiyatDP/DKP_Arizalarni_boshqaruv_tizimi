/**
 * Utils.gs - Yordamchi funksiyalar moduli
 * DKP - Hisobot tahlili tizimi
 *
 * Standart API javoblari, matn tozalash/escape, formatlash va boshqa
 * qayta ishlatiluvchi yordamchilar.
 */

/**
 * Muvaffaqiyatli API javobi.
 * @param {*} data - Qaytariladigan ma'lumot.
 * @param {string=} message - Ixtiyoriy xabar.
 * @returns {Object} { success: true, data, message }
 */
function successResponse(data, message) {
  return { success: true, data: data, message: message || '' };
}

/**
 * Xatolik API javobi. Xatoni Log ga ham yozadi.
 * @param {string} message - Xatolik xabari.
 * @param {(Error|string)=} error - Ixtiyoriy xato obyekti.
 * @returns {Object} { success: false, message }
 */
function errorResponse(message, error) {
  if (error) {
    Logger.log(message + ' :: ' + (error && error.stack ? error.stack : error));
  }
  return { success: false, message: message };
}

/**
 * HTML maxsus belgilarini xavfsizlashtirish (XSS oldini olish).
 * @param {*} value - Qiymat.
 * @returns {string}
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
 * Erkin matnni tozalash: trim, boshqaruv belgilarini olib tashlash, uzunlikni cheklash.
 * @param {*} value - Qiymat.
 * @param {number=} maxLength - Maksimal uzunlik (standart 500).
 * @returns {string}
 */
function sanitizeText(value, maxLength) {
  var limit = maxLength || 500;
  if (value === null || value === undefined) {
    return '';
  }
  var s = String(value).trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return s.length > limit ? s.substring(0, limit) : s;
}

/**
 * Qiymatni cheklangan diapazonda tutish.
 * @param {number} value - Qiymat.
 * @param {number} min - Minimum.
 * @param {number} max - Maksimum.
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sanani konfiguratsiya formatida (dd.MM.yyyy) matnga aylantirish.
 * @param {Date} date - Sana.
 * @returns {string}
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  var cfg = getSystemConfig();
  return Utilities.formatDate(date, cfg.TIMEZONE, cfg.DATE_FORMAT);
}

/**
 * Jadval katakchasi qiymatini ko'rsatish uchun formatlash.
 * @param {*} value - Qiymat.
 * @param {string} type - Ustun turi.
 * @returns {(string|number)}
 */
function formatCellValue(value, type) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (type === getColumnTypes().DATE && value instanceof Date) {
    return formatDate(value);
  }
  return value;
}

/**
 * JSON ni xavfsiz parse qilish.
 * @param {string} text - JSON matn.
 * @param {*=} fallback - Xatoda qaytariladigan qiymat.
 * @returns {*}
 */
function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return fallback === undefined ? null : fallback;
  }
}
