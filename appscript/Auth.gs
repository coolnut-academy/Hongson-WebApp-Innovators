/**
 * Google Apps Script - Auth.gs
 * Secure server-side admin authentication and CacheService session token management.
 */

var Auth = (function() {

  /**
   * Verify admin password and issue short-lived session token
   */
  function login(password) {
    var masterPassword = Config.getAdminPassword();
    if (!masterPassword) {
      throw new Error('ADMIN_PASSWORD ยังไม่ได้ตั้งค่าใน Script Properties ของโปรเจกต์');
    }

    if (!password || String(password) !== String(masterPassword)) {
      Utils.logAdminAction('LOGIN_FAILED', 'AUTH', '', 'Incorrect password attempt');
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' }
      };
    }

    // Generate secure session token
    var token = Utils.generateUUID();
    var cache = CacheService.getScriptCache();
    var ttl = Config.ADMIN_SESSION_TTL_SECONDS || 3600;

    // Store in cache
    cache.put('admin_token_' + token, 'valid', ttl);

    Utils.logAdminAction('LOGIN_SUCCESS', 'AUTH', '', 'Admin logged in successfully');

    return {
      success: true,
      data: {
        token: token,
        expiresInSeconds: ttl
      },
      message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ'
    };
  }

  /**
   * Invalidate session token
   */
  function logout(token) {
    if (token) {
      var cache = CacheService.getScriptCache();
      cache.remove('admin_token_' + token);
      Utils.logAdminAction('LOGOUT', 'AUTH', '', 'Admin logged out');
    }
    return { success: true, message: 'ออกจากระบบเรียบร้อย' };
  }

  /**
   * Guard function: Ensures caller holds a valid admin session token
   */
  function verifyToken(token) {
    if (!token) return false;
    var cache = CacheService.getScriptCache();
    var cached = cache.get('admin_token_' + token);
    return cached === 'valid';
  }

  /**
   * Guard that throws error if unauthorized
   */
  function requireAdmin(token) {
    if (!verifyToken(token)) {
      throw new Error('UNAUTHORIZED: เซสชันผู้ดูแลระบบหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }
  }

  return {
    login: login,
    logout: logout,
    verifyToken: verifyToken,
    requireAdmin: requireAdmin
  };
})();
