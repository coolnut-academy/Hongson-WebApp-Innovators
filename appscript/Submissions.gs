/**
 * Google Apps Script - Submissions.gs
 * Student submission processing, image upload, formula injection protection, and atomic transactions.
 */

var Submissions = (function() {

  /**
   * Get all active submissions for a category
   */
  function getByCategory(categoryId) {
    var rows = Sheets.getRowsAsObjects(Config.SHEET_SUBMISSIONS);
    var filtered = [];

    rows.forEach(function(row) {
      if (String(row.categoryId) === String(categoryId) && !row.deletedAt) {
        filtered.push({
          submissionId: row.submissionId,
          categoryId: row.categoryId,
          studentName: row.studentName,
          className: row.className,
          studentNo: Number(row.studentNo),
          studyProgram: row.studyProgram || '',
          workTitle: row.workTitle,
          workUrl: row.workUrl,
          coverFileId: row.coverFileId,
          coverUrl: row.coverUrl,
          coverOriginalName: row.coverOriginalName,
          coverMimeType: row.coverMimeType,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
      }
    });

    return filtered;
  }

  /**
   * Public Student Submission Handler
   */
  function submit(payload) {
    // 1. Validation
    if (!payload.categoryId) {
      throw new Error('กรุณาระบุหัวข้อการส่งงาน (categoryId is required)');
    }
    if (!payload.studentName || !String(payload.studentName).trim()) {
      throw new Error('กรุณาระบุชื่อ-นามสกุล');
    }
    if (!payload.className || !String(payload.className).trim()) {
      throw new Error('กรุณาระบุชั้น');
    }
    if (!payload.studentNo || isNaN(Number(payload.studentNo)) || Number(payload.studentNo) <= 0) {
      throw new Error('กรุณาระบุเลขที่เป็นจำนวนเต็มบวก');
    }
    if (!payload.workTitle || !String(payload.workTitle).trim()) {
      throw new Error('กรุณาระบุชื่อผลงาน / ชื่อเว็บแอป');
    }
    if (!payload.workUrl || !Utils.isValidHttpUrl(payload.workUrl)) {
      throw new Error('URL ของผลงานต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น');
    }
    if (!payload.coverBase64) {
      throw new Error('กรุณาอัปโหลดรูปภาพหน้าปก');
    }

    // 2. Category Check
    var category = Categories.getById(payload.categoryId);
    if (!category) {
      throw new Error('ไม่พบหัวข้อการส่งงานนี้');
    }
    if (!category.isActive) {
      throw new Error('หัวข้อนี้ปิดรับผลงานแล้ว ไม่สามารถส่งงานได้');
    }

    var uploadedFileId = null;

    try {
      // 3. Upload Cover Image to Google Drive OUTSIDE of script lock!
      // Image base64 decoding and Drive file creation take 3-8s.
      // Doing this outside lock ensures students do not block teacher admin operations.
      var coverInfo = Drive.uploadCoverImage(
        category.driveFolderId,
        payload.coverBase64,
        payload.coverName,
        payload.coverMimeType
      );
      uploadedFileId = coverInfo.coverFileId;

      // 4. Lock ONLY for the atomic Google Sheets appendRow (~0.1-0.2s)
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(Config.LOCK_TIMEOUT_MS);

        var submissionId = Utils.generateUUID();
        var now = Utils.getIsoTimestamp();
        var ss = Sheets.getSpreadsheet();
        var sheet = ss.getSheetByName(Config.SHEET_SUBMISSIONS);

        var newRow = [
          submissionId,
          payload.categoryId,
          Utils.sanitizeForSheet(payload.studentName),
          Utils.sanitizeForSheet(payload.className),
          Number(payload.studentNo),
          Utils.sanitizeForSheet(payload.studyProgram || ''),
          Utils.sanitizeForSheet(payload.workTitle),
          payload.workUrl.trim(),
          coverInfo.coverFileId,
          coverInfo.coverUrl,
          coverInfo.coverOriginalName,
          coverInfo.coverMimeType,
          now,
          now,
          '' // deletedAt
        ];

        sheet.appendRow(newRow);
      } finally {
        lock.releaseLock();
      }

      // Invalidate categories cache so submission count is immediately refreshed
      Categories.clearCache();

      return {
        submissionId: submissionId,
        categoryId: payload.categoryId,
        studentName: String(payload.studentName).trim(),
        className: String(payload.className).trim(),
        studentNo: Number(payload.studentNo),
        studyProgram: String(payload.studyProgram || '').trim(),
        workTitle: String(payload.workTitle).trim(),
        workUrl: payload.workUrl.trim(),
        coverFileId: coverInfo.coverFileId,
        coverUrl: coverInfo.coverUrl,
        createdAt: now
      };
    } catch (e) {
      // If writing to Sheet failed after file upload, clean up orphan Drive file
      if (uploadedFileId) {
        Drive.deleteFile(uploadedFileId);
      }
      throw e;
    }
  }

  /**
   * Soft delete submission (Admin only)
   */
  function remove(token, submissionId) {
    Auth.requireAdmin(token);

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(Config.LOCK_TIMEOUT_MS);

      var ss = Sheets.getSpreadsheet();
      var sheet = ss.getSheetByName(Config.SHEET_SUBMISSIONS);
      var rowIndex = Sheets.findRowIndexByUuid(Config.SHEET_SUBMISSIONS, 1, submissionId);

      if (rowIndex === -1) {
        throw new Error('ไม่พบผลงานที่ต้องการลบ');
      }

      var now = Utils.getIsoTimestamp();
      // Column 15 is deletedAt
      sheet.getRange(rowIndex, 15).setValue(now);

      // Optionally get coverFileId (Column 9) and trash it
      var coverFileId = sheet.getRange(rowIndex, 9).getValue();
      if (coverFileId) {
        Drive.deleteFile(coverFileId);
      }

      Utils.logAdminAction('DELETE_SUBMISSION', 'SUBMISSION', submissionId, 'Soft deleted submission');
    } finally {
      lock.releaseLock();
    }

    Categories.clearCache();
    return { success: true };
  }

  return {
    getByCategory: getByCategory,
    submit: submit,
    remove: remove
  };
})();
