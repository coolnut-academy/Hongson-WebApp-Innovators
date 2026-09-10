/**
 * Google Apps Script - Categories.gs
 * Category CRUD operations, Drive folder bindings, and concurrency protection.
 */

var Categories = (function() {

  /**
   * Get all active categories with submission counts
   */
  function getAll() {
    var categories = Sheets.getRowsAsObjects(Config.SHEET_CATEGORIES);
    var submissions = Sheets.getRowsAsObjects(Config.SHEET_SUBMISSIONS);

    // Build submission count map in O(M) instead of O(N * M)
    var countMap = {};
    submissions.forEach(function(s) {
      if (!s.deletedAt) {
        var cid = String(s.categoryId);
        countMap[cid] = (countMap[cid] || 0) + 1;
      }
    });

    var result = [];
    categories.forEach(function(cat) {
      if (!cat.deletedAt) {
        var count = countMap[String(cat.categoryId)] || 0;

        result.push({
          categoryId: cat.categoryId,
          title: cat.title,
          description: cat.description || '',
          driveFolderId: cat.driveFolderId,
          isActive: cat.isActive === true || String(cat.isActive).toUpperCase() === 'TRUE',
          submissionCount: count,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt
        });
      }
    });

    return result;
  }

  /**
   * Get single category by UUID
   */
  function getById(categoryId) {
    var categories = getAll();
    for (var i = 0; i < categories.length; i++) {
      if (String(categories[i].categoryId) === String(categoryId)) {
        return categories[i];
      }
    }
    return null;
  }

  /**
   * Create new Category (Admin only)
   */
  function create(token, title, description) {
    Auth.requireAdmin(token);

    if (!title || !String(title).trim()) {
      throw new Error('กรุณาระบุชื่อหัวข้อ');
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);
      
      var categoryId = Utils.generateUUID();
      var cleanTitle = String(title).trim();
      var cleanDesc = String(description || '').trim();
      
      // 1. Create Folder on Google Drive
      var driveFolderId = Drive.createCategoryFolder(cleanTitle);

      // 2. Append to Sheet
      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_CATEGORIES);
      var now = Utils.getIsoTimestamp();

      sheet.appendRow([
        categoryId,
        Utils.sanitizeForSheet(cleanTitle),
        Utils.sanitizeForSheet(cleanDesc),
        driveFolderId,
        true, // isActive
        now,
        now,
        '' // deletedAt
      ]);

      Utils.logAdminAction('CREATE_CATEGORY', 'CATEGORY', categoryId, { title: cleanTitle, folderId: driveFolderId });

      return {
        categoryId: categoryId,
        title: cleanTitle,
        description: cleanDesc,
        driveFolderId: driveFolderId,
        isActive: true,
        submissionCount: 0,
        createdAt: now,
        updatedAt: now
      };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Update category title, description, or isActive status (Admin only)
   */
  function update(token, categoryId, updateData) {
    Auth.requireAdmin(token);

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);

      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_CATEGORIES);
      var rowIndex = Sheets.findRowIndexByUuid(Config.SHEET_CATEGORIES, 1, categoryId);

      if (rowIndex === -1) {
        throw new Error('ไม่พบหัวข้อที่ต้องการแก้ไข');
      }

      var now = Utils.getIsoTimestamp();
      // Columns: 1:categoryId, 2:title, 3:description, 4:driveFolderId, 5:isActive, 6:createdAt, 7:updatedAt, 8:deletedAt
      if (updateData.title !== undefined) {
        sheet.getRange(rowIndex, 2).setValue(Utils.sanitizeForSheet(updateData.title));
      }
      if (updateData.description !== undefined) {
        sheet.getRange(rowIndex, 3).setValue(Utils.sanitizeForSheet(updateData.description));
      }
      if (updateData.isActive !== undefined) {
        sheet.getRange(rowIndex, 5).setValue(updateData.isActive);
      }
      sheet.getRange(rowIndex, 7).setValue(now);

      Utils.logAdminAction('UPDATE_CATEGORY', 'CATEGORY', categoryId, updateData);
      return getById(categoryId);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Soft delete category (Admin only)
   */
  function remove(token, categoryId) {
    Auth.requireAdmin(token);

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);

      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_CATEGORIES);
      var rowIndex = Sheets.findRowIndexByUuid(Config.SHEET_CATEGORIES, 1, categoryId);

      if (rowIndex === -1) {
        throw new Error('ไม่พบหัวข้อที่ต้องการลบ');
      }

      var now = Utils.getIsoTimestamp();
      sheet.getRange(rowIndex, 8).setValue(now); // Set deletedAt
      sheet.getRange(rowIndex, 5).setValue(false); // Also deactivate

      Utils.logAdminAction('DELETE_CATEGORY', 'CATEGORY', categoryId, 'Soft deleted category');
      return { success: true };
    } finally {
      lock.releaseLock();
    }
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    remove: remove
  };
})();
