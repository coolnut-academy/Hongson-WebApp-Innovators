/**
 * Google Apps Script - Config.gs
 * Reads environment variables from Script Properties.
 * 
 * SCRIPT PROPERTIES REQUIRED:
 * - SPREADSHEET_ID: The Google Spreadsheet ID
 * - ROOT_DRIVE_FOLDER_ID: The Google Drive Root Folder ID for Hongson Student Innovators
 * - ADMIN_PASSWORD: The administrative master password
 * - ALLOWED_FRONTEND_ORIGIN: GitHub Pages URL or '*' for development (e.g. https://username.github.io)
 */

var Config = (function() {
  var props = PropertiesService.getScriptProperties();

  function extractId(val, pattern) {
    if (!val) return '';
    var str = String(val).trim();
    if (pattern && pattern.test(str)) {
      var match = str.match(pattern);
      if (match && match[1]) return match[1];
    }
    return str;
  }

  return {
    getSpreadsheetId: function() {
      var raw = props.getProperty('SPREADSHEET_ID') || '';
      return extractId(raw, /\/d\/([a-zA-Z0-9-_]+)/);
    },
    getRootDriveFolderId: function() {
      var raw = props.getProperty('ROOT_DRIVE_FOLDER_ID') || '';
      return extractId(raw, /\/folders\/([a-zA-Z0-9-_]+)/);
    },
    getAdminPassword: function() {
      return (props.getProperty('ADMIN_PASSWORD') || '').trim();
    },
    getAllowedOrigin: function() {
      return (props.getProperty('ALLOWED_FRONTEND_ORIGIN') || '*').trim();
    },
    
    // Sheet tab names
    SHEET_CATEGORIES: 'Categories',
    SHEET_SUBMISSIONS: 'Submissions',
    SHEET_ADMIN_LOG: 'AdminLog',
    
    // Admin session duration (seconds)
    ADMIN_SESSION_TTL_SECONDS: 3600, // 60 minutes
    
    // Lock timeout (milliseconds)
    LOCK_TIMEOUT_MS: 30000 // 30 seconds
  };
})();
