/**
 * Google Apps Script - Drive.gs
 * File storage and folder hierarchy management in Google Drive.
 */

var Drive = (function() {

  function getRootFolder() {
    var rootId = Config.getRootDriveFolderId();
    if (!rootId) {
      throw new Error('ROOT_DRIVE_FOLDER_ID ยังไม่ได้ตั้งค่าใน Script Properties');
    }
    return DriveApp.getFolderById(rootId);
  }

  /**
   * Create a dedicated subfolder for a Category under Root Folder
   */
  function createCategoryFolder(categoryTitle) {
    var root = getRootFolder();
    var folderName = categoryTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();
    var newFolder = root.createFolder(folderName);
    
    // Set folder to be accessible with link for asset loading
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn('Could not set public sharing on folder: ' + e.message);
    }

    return newFolder.getId();
  }

  /**
   * Upload and decode student cover image into category folder
   */
  function uploadCoverImage(categoryFolderId, base64Data, originalName, mimeType) {
    if (!base64Data) {
      throw new Error('ไม่พบข้อมูลรูปภาพ (Base64 data is empty)');
    }

    var folder = DriveApp.getFolderById(categoryFolderId);
    var bytes = Utilities.base64Decode(base64Data);
    
    // Normalize filename
    var cleanName = (originalName || 'cover.webp').replace(/[/\\?%*:|"<>]/g, '_');
    var fileName = 'cover_' + new Date().getTime() + '_' + cleanName;

    // Create Blob and File
    var blob = Utilities.newBlob(bytes, mimeType || 'image/webp', fileName);
    var file = folder.createFile(blob);

    // Make file viewable by anyone with link for GitHub Pages rendering
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn('Could not set public sharing on file: ' + e.message);
    }

    var fileId = file.getId();

    // Direct embeddable thumbnail / web link
    // Google Drive direct thumbnail URL format provides reliable cross-origin image rendering
    var coverUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';

    return {
      coverFileId: fileId,
      coverUrl: coverUrl,
      coverOriginalName: originalName || fileName,
      coverMimeType: mimeType || 'image/webp'
    };
  }

  /**
   * Move file to trash (Safe Delete)
   */
  function deleteFile(fileId) {
    if (!fileId) return;
    try {
      var file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch (e) {
      console.warn('Failed to trash Drive file ' + fileId + ': ' + e.message);
    }
  }

  return {
    getRootFolder: getRootFolder,
    createCategoryFolder: createCategoryFolder,
    uploadCoverImage: uploadCoverImage,
    deleteFile: deleteFile
  };
})();
