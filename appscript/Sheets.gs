/**
 * Google Apps Script - Sheets.gs
 * Database management for Google Sheets.
 */

var Sheets = (function() {
  var _cachedSs = null;

  function getSpreadsheet() {
    if (_cachedSs) {
      return _cachedSs;
    }
    var ssId = Config.getSpreadsheetId();
    if (!ssId) {
      throw new Error('ยังไม่ได้ระบุ SPREADSHEET_ID ใน Script Properties (ไปที่ไอคอนฟันเฟือง Project Settings ➔ Script Properties)');
    }
    try {
      _cachedSs = SpreadsheetApp.openById(ssId);
      return _cachedSs;
    } catch (e) {
      throw new Error('ไม่สามารถเปิด Google Spreadsheet ได้ (ID: ' + ssId + ') ตรวจสอบว่า ID ถูกต้องและบัญชีนี้มีสิทธิ์เข้าถึง: ' + e.message);
    }
  }

  /**
   * Idempotent Database Setup
   * Creates required sheets, headers, and formatting if missing. Safe to run repeatedly.
   */
  function setupDatabase() {
    var ss = getSpreadsheet();
    var results = {
      spreadsheetTitle: ss.getName(),
      sheetsCreated: [],
      sheetsExisting: []
    };

    var sheetDefs = [
      {
        name: Config.SHEET_CATEGORIES,
        headers: ['categoryId', 'title', 'description', 'driveFolderId', 'isActive', 'createdAt', 'updatedAt', 'deletedAt']
      },
      {
        name: Config.SHEET_SUBMISSIONS,
        headers: [
          'submissionId', 'categoryId', 'studentName', 'className', 'studentNo', 
          'studyProgram', 'workTitle', 'workUrl', 'coverFileId', 'coverUrl', 
          'coverOriginalName', 'coverMimeType', 'createdAt', 'updatedAt', 'deletedAt'
        ]
      },
      {
        name: Config.SHEET_ADMIN_LOG,
        headers: ['logId', 'timestamp', 'action', 'targetType', 'targetId', 'detail']
      }
    ];

    sheetDefs.forEach(function(def) {
      var sheet = ss.getSheetByName(def.name);
      if (!sheet) {
        sheet = ss.insertSheet(def.name);
        // Add headers
        sheet.appendRow(def.headers);
        formatHeaderRow(sheet, def.headers.length);
        results.sheetsCreated.push(def.name);
      } else {
        results.sheetsExisting.push(def.name);
        // Ensure header exists if sheet is empty
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(def.headers);
          formatHeaderRow(sheet, def.headers.length);
        }
      }
    });

    // Remove default "Sheet1" or "แผ่นงาน1" if other sheets exist and it's empty
    var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่นงาน1');
    if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (e) {
        // Ignore if unable to delete
      }
    }

    Utils.logAdminAction('SETUP_DATABASE', 'SYSTEM', ss.getId(), 'Idempotent setup executed');
    return results;
  }

  function formatHeaderRow(sheet, numColumns) {
    var range = sheet.getRange(1, 1, 1, numColumns);
    range.setFontWeight('bold');
    range.setBackground('#312e81'); // Dark Indigo
    range.setFontColor('#ffffff');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }

  /**
   * Read sheet rows as an array of JavaScript objects mapped by header names
   */
  function getRowsAsObjects(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return [];

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var records = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var obj = { _rowIndex: i + 1 };
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        obj[key] = row[c];
      }
      records.push(obj);
    }
    return records;
  }

  /**
   * Find row index by UUID in a given column (1-indexed)
   */
  function findRowIndexByUuid(sheetName, idColumnIndex, uuid) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return -1;

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return -1;

    var idValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
    for (var i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0]) === String(uuid)) {
        return i + 2; // +2 because 1-indexed and header is row 1
      }
    }
    return -1;
  }

  return {
    getSpreadsheet: getSpreadsheet,
    setupDatabase: setupDatabase,
    getRowsAsObjects: getRowsAsObjects,
    findRowIndexByUuid: findRowIndexByUuid
  };
})();
