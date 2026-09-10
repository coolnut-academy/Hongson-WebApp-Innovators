/**
 * Google Apps Script - Categories.gs
 * Category CRUD operations, Drive folder bindings, and concurrency protection.
 */

var Categories = (function() {
  var CACHE_KEY = 'all_categories_json';
  var CACHE_TTL_SEC = 300; // 5 minutes

  function clearCache() {
    try {
      CacheService.getScriptCache().remove(CACHE_KEY);
    } catch (e) {
      console.warn('Failed to clear categories cache: ' + e.message);
    }
  }

  /**
   * Get all active categories with submission counts (Cached for high performance)
   */
  function getAll(forceRefresh) {
    var cache = CacheService.getScriptCache();
    if (!forceRefresh) {
      try {
        var cached = cache.get(CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        // Cache read failed, proceed to fetch from Sheets
      }
    }

    var categories = Sheets.getRowsAsObjects(Config.SHEET_CATEGORIES);
    var ss = Sheets.getSpreadsheet();
    var subSheet = ss ? ss.getSheetByName(Config.SHEET_SUBMISSIONS) : null;

    // Build submission count map efficiently without reading all 15 columns of data
    var countMap = {};
    if (subSheet) {
      var lastRow = subSheet.getLastRow();
      if (lastRow > 1) {
        // Column 2 = categoryId, Column 15 = deletedAt
        var catIdRange = subSheet.getRange(2, 2, lastRow - 1, 1).getValues();
        var delRange = subSheet.getRange(2, 15, lastRow - 1, 1).getValues();
        for (var i = 0; i < catIdRange.length; i++) {
          if (!delRange[i][0]) {
            var cid = String(catIdRange[i][0]);
            countMap[cid] = (countMap[cid] || 0) + 1;
          }
        }
      }
    }

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

    // Store in Server-Side Cache for instant subsequent reads
    try {
      cache.put(CACHE_KEY, JSON.stringify(result), CACHE_TTL_SEC);
    } catch (e) {
      console.warn('Could not store categories in cache (payload size limit?): ' + e.message);
    }

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

    var cleanTitle = String(title).trim();
    var cleanDesc = String(description || '').trim();
    var categoryId = Utils.generateUUID();
    var now = Utils.getIsoTimestamp();

    // 1. Create Folder on Google Drive OUTSIDE of script lock!
    // Drive API can take 2-8s; holding script lock during Drive calls blocks all other requests.
    var driveFolderId = Drive.createCategoryFolder(cleanTitle);

    // 2. Acquire lock ONLY for the lightweight Sheet appendRow (takes ~0.2s)
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);

      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_CATEGORIES);

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
    } finally {
      lock.releaseLock();
    }

    // 3. Clear cache so getCategories immediately serves the fresh category
    clearCache();

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
    } finally {
      lock.releaseLock();
    }

    clearCache();
    return getById(categoryId);
  }

  /**
   * Soft delete category and trash corresponding Drive folder (Admin only)
   */
  function remove(token, categoryId) {
    Auth.requireAdmin(token);

    var driveFolderIdToTrash = null;
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);

      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_CATEGORIES);
      var rowIndex = Sheets.findRowIndexByUuid(Config.SHEET_CATEGORIES, 1, categoryId);

      if (rowIndex === -1) {
        throw new Error('ไม่พบหัวข้อที่ต้องการลบ');
      }

      // Column 4 is driveFolderId
      driveFolderIdToTrash = sheet.getRange(rowIndex, 4).getValue();

      var now = Utils.getIsoTimestamp();
      sheet.getRange(rowIndex, 8).setValue(now); // Set deletedAt
      sheet.getRange(rowIndex, 5).setValue(false); // Also deactivate

      Utils.logAdminAction('DELETE_CATEGORY', 'CATEGORY', categoryId, {
        message: 'Soft deleted category and trashed Drive folder',
        driveFolderId: driveFolderIdToTrash
      });
    } finally {
      lock.releaseLock();
    }

    // Move Google Drive category folder to trash outside of script lock
    if (driveFolderIdToTrash) {
      Drive.deleteFolder(driveFolderIdToTrash);
    }

    clearCache();
    return {
      success: true,
      message: 'ลบห้องส่งงานและย้ายโฟลเดอร์ Google Drive ไปยังถังขยะเรียบร้อยแล้ว'
    };
  }

  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    clearCache: clearCache
  };
})();
