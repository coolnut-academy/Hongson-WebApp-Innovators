/**
 * Google Apps Script - Code.gs
 * Web App HTTP Entry Points (doGet, doPost) and Request Router.
 */

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    e = e || { parameter: {} };
    var action = e.parameter.action;

    // Optional: Serve Bridge.html if requested for iframe transport fallback
    if (e.parameter.view === 'bridge') {
      var template = HtmlService.createTemplateFromFile('Bridge');
      template.allowedOrigin = Config.getAllowedOrigin();
      return template.evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    switch (action) {
      case 'healthCheck':
        var sheetOk = false;
        var driveOk = false;
        try {
          sheetOk = !!Sheets.getSpreadsheet();
        } catch (err) {
          console.warn('Sheet healthCheck error: ' + err.message);
        }
        try {
          driveOk = !!Drive.getRootFolder();
        } catch (err) {
          console.warn('Drive healthCheck error: ' + err.message);
        }

        return Utils.buildSuccessResponse({
          sheetConnected: sheetOk,
          driveConnected: driveOk,
          version: '1.0.0-production',
          timestamp: Utils.getIsoTimestamp()
        }, 'Health check completed');

      case 'setupDatabase':
        var setupResult = Sheets.setupDatabase();
        return Utils.buildSuccessResponse(setupResult, 'Database initialized successfully');

      case 'getCategories':
        var categories = Categories.getAll();
        return Utils.buildSuccessResponse(categories);

      case 'getCategory':
        var catId = e.parameter.categoryId;
        if (!catId) {
          return Utils.buildErrorResponse('MISSING_PARAM', 'กรุณาระบุ categoryId');
        }
        var category = Categories.getById(catId);
        if (!category) {
          return Utils.buildErrorResponse('NOT_FOUND', 'ไม่พบหัวข้อการส่งงานนี้');
        }
        return Utils.buildSuccessResponse(category);

      case 'getSubmissions':
        var categoryId = e.parameter.categoryId;
        if (!categoryId) {
          return Utils.buildErrorResponse('MISSING_PARAM', 'กรุณาระบุ categoryId');
        }
        var submissions = Submissions.getByCategory(categoryId);
        return Utils.buildSuccessResponse(submissions);

      default:
        return Utils.buildSuccessResponse({
          service: 'Hongson Student Innovators Web App API',
          status: 'online',
          timestamp: Utils.getIsoTimestamp()
        }, 'API is ready');
    }
  } catch (error) {
    console.error('doGet Error: ' + error.stack);
    return Utils.buildErrorResponse('SERVER_ERROR', error.message);
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return Utils.buildErrorResponse('EMPTY_BODY', 'No payload provided');
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return Utils.buildErrorResponse('INVALID_JSON', 'Payload must be valid JSON: ' + parseErr.message);
    }

    var action = payload.action;

    switch (action) {
      case 'submitWork':
        var newSubmission = Submissions.submit(payload);
        return Utils.buildSuccessResponse(newSubmission, 'ส่งผลงาน Web App สำเร็จเรียบร้อยแล้ว!');

      case 'adminLogin':
        var loginResult = Auth.login(payload.password);
        if (!loginResult.success) {
          return Utils.buildErrorResponse(loginResult.error.code, loginResult.error.message);
        }
        return Utils.buildSuccessResponse(loginResult.data, loginResult.message);

      case 'adminLogout':
        var logoutResult = Auth.logout(payload.token);
        return Utils.buildSuccessResponse(null, logoutResult.message);

      case 'createCategory':
        var createdCategory = Categories.create(payload.token, payload.title, payload.description);
        return Utils.buildSuccessResponse(createdCategory, 'สร้างหัวข้อการส่งงานเรียบร้อยแล้ว');

      case 'updateCategory':
        var updatedCategory = Categories.update(payload.token, payload.categoryId, payload);
        return Utils.buildSuccessResponse(updatedCategory, 'แก้ไขหัวข้อเรียบร้อยแล้ว');

      case 'deleteCategory':
        var deleteCatResult = Categories.remove(payload.token, payload.categoryId);
        return Utils.buildSuccessResponse(deleteCatResult, 'ลบหัวข้อเรียบร้อยแล้ว');

      case 'deleteSubmission':
        var deleteSubResult = Submissions.remove(payload.token, payload.submissionId);
        return Utils.buildSuccessResponse(deleteSubResult, 'ลบผลงานเรียบร้อยแล้ว');

      default:
        return Utils.buildErrorResponse('UNKNOWN_ACTION', 'Action "' + action + '" is not recognized');
    }
  } catch (error) {
    console.error('doPost Error: ' + error.stack);
    return Utils.buildErrorResponse('OPERATION_FAILED', error.message);
  }
}

/**
 * Dispatcher for Bridge.html iframe requests via google.script.run
 */
function dispatchBridgeRequest(jsonString) {
  var output = doPost({
    postData: { contents: jsonString }
  });
  return output.getContent();
}

/**
 * Run this function directly from the editor toolbar to initialize the database
 */
function setupDatabase() {
  try {
    var result = Sheets.setupDatabase();
    console.log('setupDatabase result:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('setupDatabase error:', err.message);
    throw err;
  }
}
