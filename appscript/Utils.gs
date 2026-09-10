/**
 * Google Apps Script - Utils.gs
 * Helper functions for UUID, response envelopes, sanitization, and logging.
 */

var Utils = (function() {

  /**
   * Generate UUID v4
   */
  function generateUUID() {
    return Utilities.getUuid();
  }

  /**
   * ISO 8601 current timestamp
   */
  function getIsoTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Sanitize text against Google Sheets Formula Injection (CSV/Formula injection)
   * If input begins with =, +, -, @, or tab/carriage return, prepend with single quote
   */
  function sanitizeForSheet(value) {
    if (value === null || value === undefined) return '';
    var str = String(value).trim();
    if (str.length > 0) {
      var firstChar = str.charAt(0);
      if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
        return "'" + str;
      }
    }
    return str;
  }

  /**
   * Validate that URL is strictly HTTP or HTTPS
   */
  function isValidHttpUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var trimmed = url.trim();
    return /^https?:\/\/.+/i.test(trimmed);
  }

  /**
   * Build consistent Success JSON Response for Web App
   */
  function buildSuccessResponse(data, message) {
    var output = {
      success: true,
      data: data || {},
      message: message || ''
    };
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * Build consistent Error JSON Response for Web App
   */
  function buildErrorResponse(code, message) {
    var output = {
      success: false,
      error: {
        code: code || 'UNKNOWN_ERROR',
        message: message || 'เกิดข้อผิดพลาดในการประมวลผล'
      }
    };
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * Append audit trail to AdminLog sheet
   */
  function logAdminAction(action, targetType, targetId, detail) {
    try {
      var ssId = Config.getSpreadsheetId();
      if (!ssId) return;
      var ss = SpreadsheetApp.openById(ssId);
      var logSheet = ss.getSheetByName(Config.SHEET_ADMIN_LOG);
      if (!logSheet) return;

      logSheet.appendRow([
        generateUUID(),
        getIsoTimestamp(),
        action || '',
        targetType || '',
        targetId || '',
        typeof detail === 'object' ? JSON.stringify(detail) : String(detail || '')
      ]);
    } catch (e) {
      console.error('Failed to log admin action: ' + e.message);
    }
  }

  return {
    generateUUID: generateUUID,
    getIsoTimestamp: getIsoTimestamp,
    sanitizeForSheet: sanitizeForSheet,
    isValidHttpUrl: isValidHttpUrl,
    buildSuccessResponse: buildSuccessResponse,
    buildErrorResponse: buildErrorResponse,
    logAdminAction: logAdminAction
  };
})();
