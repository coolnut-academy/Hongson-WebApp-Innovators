/**
 * API Transport Layer
 * Centralized API Client abstraction for GitHub Pages frontend.
 * 
 * In Phase 1: Operates using high-fidelity in-browser Mock Storage when APP_CONFIG.API_URL is empty.
 * In Phase 4: Seamlessly switches to Google Apps Script Web App HTTPS requests.
 */

class ApiClient {
  constructor() {
    this.apiUrl = APP_CONFIG.API_URL || '';
    this.isMock = !this.apiUrl;
    this._cache = new Map();

    if (this.isMock) {
      console.info('ℹ️ [ApiClient] Running in Phase 1 Mock Mode. Google API_URL is empty.');
      this._initMockStorage();
    }
  }

  /* -------------------------------------------------------------
   * PUBLIC API METHODS
   * ----------------------------------------------------------- */

  /**
   * Check backend health status
   */
  async healthCheck() {
    if (this.isMock) {
      return {
        success: true,
        data: {
          status: 'mock_active',
          sheetConnected: true,
          driveConnected: true,
          version: '1.0.0-phase1-prototype',
          timestamp: new Date().toISOString()
        }
      };
    }

    return this._fetchJson(`${this.apiUrl}?action=healthCheck`);
  }

  clearCache(key = null) {
    if (key) {
      this._cache.delete(key);
    } else {
      this._cache.clear();
    }
  }

  /**
   * Fetch all active categories (Cached for 30 seconds for instant clicks)
   */
  async getCategories(forceRefresh = false) {
    if (this.isMock) {
      const categories = this._getMockCategories().filter(c => !c.deletedAt);
      const submissions = this._getMockSubmissions().filter(s => !s.deletedAt);
      const withCounts = categories.map(cat => ({
        ...cat,
        submissionCount: submissions.filter(s => s.categoryId === cat.categoryId).length
      }));
      return { success: true, data: withCounts };
    }

    const cacheKey = 'categories';
    const cached = this._cache.get(cacheKey);
    const now = Date.now();

    // If cached within 30s and not force refresh, return instantly!
    if (!forceRefresh && cached && (now - cached.timestamp < 30000)) {
      return { success: true, data: cached.data, fromCache: true };
    }

    const res = await this._fetchJson(`${this.apiUrl}?action=getCategories`);
    if (res.success && res.data) {
      this._cache.set(cacheKey, { data: res.data, timestamp: now });
    }
    return res;
  }

  /**
   * Fetch a single category by UUID
   */
  async getCategory(categoryId) {
    if (this.isMock) {
      const cat = this._getMockCategories().find(c => c.categoryId === categoryId && !c.deletedAt);
      if (!cat) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบหัวข้อการส่งงานนี้' } };
      }
      return { success: true, data: cat };
    }

    // Check categories cache first for instant detail header render
    const cachedCats = this._cache.get('categories');
    if (cachedCats && cachedCats.data) {
      const found = cachedCats.data.find(c => String(c.categoryId) === String(categoryId));
      if (found) {
        return { success: true, data: found, fromCache: true };
      }
    }

    return this._fetchJson(`${this.apiUrl}?action=getCategory&categoryId=${encodeURIComponent(categoryId)}`);
  }

  /**
   * Fetch submissions for a specific category (Cached for 30s for instant clicks)
   */
  async getSubmissions(categoryId, forceRefresh = false) {
    if (this.isMock) {
      const all = this._getMockSubmissions();
      const filtered = all.filter(s => s.categoryId === categoryId && !s.deletedAt);
      return { success: true, data: filtered };
    }

    const cacheKey = 'submissions_' + categoryId;
    const cached = this._cache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp < 30000)) {
      return { success: true, data: cached.data, fromCache: true };
    }

    const res = await this._fetchJson(`${this.apiUrl}?action=getSubmissions&categoryId=${encodeURIComponent(categoryId)}`);
    if (res.success && res.data) {
      this._cache.set(cacheKey, { data: res.data, timestamp: now });
    }
    return res;
  }

  /**
   * Submit student game
   * @param {Object} payload
   */
  async submitWork(payload) {
    if (this.isMock) {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 600));

      const categories = this._getMockCategories();
      const cat = categories.find(c => c.categoryId === payload.categoryId);
      if (!cat) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบหัวข้อนี้' } };
      }
      if (!cat.isActive) {
        return { success: false, error: { code: 'CLOSED', message: 'หัวข้อนี้ปิดรับผลงานแล้ว' } };
      }

      // Basic server-side style validation
      if (!payload.studentName || !payload.className || !payload.studentNo || !payload.workTitle || !payload.workUrl) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' } };
      }

      const submissions = this._getMockSubmissions();
      const newSubmission = {
        submissionId: 'sub_' + Math.random().toString(36).substring(2, 10),
        categoryId: payload.categoryId,
        studentName: payload.studentName.trim(),
        className: payload.className.trim(),
        studentNo: Number(payload.studentNo),
        studyProgram: (payload.studyProgram || '').trim(),
        workTitle: payload.workTitle.trim(),
        workUrl: payload.workUrl.trim(),
        coverFileId: 'mock_drive_file_' + Date.now(),
        coverUrl: payload.coverDataUrl || APP_CONFIG.PLACEHOLDER_COVER,
        coverOriginalName: payload.coverName || 'cover.webp',
        coverMimeType: payload.coverMimeType || 'image/webp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };

      submissions.push(newSubmission);
      this._saveMockSubmissions(submissions);

      return {
        success: true,
        data: newSubmission,
        message: 'ส่งผลงาน Web App สำเร็จเรียบร้อยแล้ว!'
      };
    }

    const res = await this._postJson({ action: 'submitWork', ...payload });
    if (res.success) {
      this.clearCache('submissions_' + payload.categoryId);
      this.clearCache('categories');
    }
    return res;
  }

  /* -------------------------------------------------------------
   * ADMIN API METHODS
   * ----------------------------------------------------------- */

  /**
   * Admin Login
   * @param {string} password
   */
  async adminLogin(password) {
    if (this.isMock) {
      await new Promise(r => setTimeout(r, 400));
      // In Phase 1 mock mode, accept 'admin1234' for local UI testing
      if (password === 'admin1234') {
        const mockToken = 'mock_tok_' + Math.random().toString(36).substring(2, 15);
        return {
          success: true,
          data: {
            token: mockToken,
            expiresInSeconds: 3600
          },
          message: 'เข้าสู่ระบบผู้ดูแลเรียบร้อย (Mock Phase 1 Mode)'
        };
      } else {
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (ในโหมดทดสอบ Phase 1 ให้ใช้: admin1234)' }
        };
      }
    }

    return this._postJson({ action: 'adminLogin', password });
  }

  /**
   * Admin Logout
   */
  async adminLogout(token) {
    if (this.isMock) {
      return { success: true, message: 'ออกจากระบบเรียบร้อย' };
    }
    return this._postJson({ action: 'adminLogout', token });
  }

  /**
   * Create a new category
   */
  async createCategory(token, { title, description }) {
    if (this.isMock) {
      if (!title) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'กรุณาระบุชื่อหัวข้อ' } };
      }
      const categories = this._getMockCategories();
      const newCat = {
        categoryId: 'cat_' + Math.random().toString(36).substring(2, 10),
        title: title.trim(),
        description: (description || '').trim(),
        driveFolderId: 'mock_drive_folder_' + Date.now(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      categories.unshift(newCat);
      this._saveMockCategories(categories);
      return { success: true, data: newCat, message: 'สร้างหัวข้อการส่งงานเรียบร้อยแล้ว' };
    }

    const res = await this._postJson({ action: 'createCategory', token, title, description });
    if (res.success) {
      this.clearCache('categories');
    }
    return res;
  }

  /**
   * Update category
   */
  async updateCategory(token, categoryId, data) {
    if (this.isMock) {
      const categories = this._getMockCategories();
      const idx = categories.findIndex(c => c.categoryId === categoryId);
      if (idx === -1) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบหัวข้อที่ต้องการแก้ไข' } };
      }
      categories[idx] = {
        ...categories[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
      this._saveMockCategories(categories);
      return { success: true, data: categories[idx], message: 'แก้ไขหัวข้อเรียบร้อยแล้ว' };
    }

    const res = await this._postJson({ action: 'updateCategory', token, categoryId, ...data });
    if (res.success) {
      this.clearCache('categories');
    }
    return res;
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(token, categoryId) {
    if (this.isMock) {
      const categories = this._getMockCategories();
      const idx = categories.findIndex(c => c.categoryId === categoryId);
      if (idx === -1) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบหัวข้อที่ต้องการลบ' } };
      }
      categories[idx].deletedAt = new Date().toISOString();
      this._saveMockCategories(categories);
      return { success: true, message: 'ลบหัวข้อเรียบร้อยแล้ว' };
    }

    const res = await this._postJson({ action: 'deleteCategory', token, categoryId });
    if (res.success) {
      this.clearCache();
    }
    return res;
  }

  /**
   * Delete submission (soft delete)
   */
  async deleteSubmission(token, submissionId) {
    if (this.isMock) {
      const submissions = this._getMockSubmissions();
      const idx = submissions.findIndex(s => s.submissionId === submissionId);
      if (idx === -1) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบผลงานที่ต้องการลบ' } };
      }
      submissions[idx].deletedAt = new Date().toISOString();
      this._saveMockSubmissions(submissions);
      return { success: true, message: 'ลบผลงานเรียบร้อยแล้ว' };
    }

    const res = await this._postJson({ action: 'deleteSubmission', token, submissionId });
    if (res.success) {
      this.clearCache();
    }
    return res;
  }

  /* -------------------------------------------------------------
   * PRIVATE HTTP & FETCH HELPERS
   * ----------------------------------------------------------- */

  async _fetchJson(url, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', err);
      let message = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + err.message;
      if (err.name === 'AbortError') {
        message = 'การเชื่อมต่อหมดเวลา (Request Timeout 30s) กรุณาลองใหม่อีกครั้ง';
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        message = 'ไม่สามารถติดต่อ Google Apps Script ได้ (อาจเกิดจากข้อจำกัด CORS หรืออินเทอร์เน็ตขัดข้อง)';
      }
      return {
        success: false,
        error: { code: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', message }
      };
    }
  }

  async _postJson(payload, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // POST to Apps Script Web App
      // Using text/plain to avoid aggressive preflight OPTIONS issues on script.google.com
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Post error:', err);
      let message = 'เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message;
      if (err.name === 'AbortError') {
        message = 'การส่งข้อมูลหมดเวลา (Request Timeout 30s) กรุณาลองใหม่อีกครั้ง';
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        message = 'ไม่สามารถส่งข้อมูลไปยัง Google Apps Script ได้ กรุณาตรวจสอบการตั้งค่า URL';
      }
      return {
        success: false,
        error: { code: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', message }
      };
    }
  }

  /* -------------------------------------------------------------
   * MOCK DATA INITIALIZATION & STORAGE (PHASE 1)
   * ----------------------------------------------------------- */

  _initMockStorage() {
    if (!sessionStorage.getItem('ag_mock_categories')) {
      const initialCategories = [
        {
          categoryId: 'cat_astronomy_arts_cn',
          title: 'เว็บแอปนวัตกรรมและการเรียนรู้ ศิลป์-จีน',
          description: 'ผลงานเว็บแอปพลิเคชันเพื่อการศึกษา สื่อ Interactive และเกมจำลองดวงดาวด้วยภาษาจีน',
          driveFolderId: 'mock_folder_01',
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          deletedAt: null
        },
        {
          categoryId: 'cat_physics_forces_m4',
          title: 'เว็บแอปจำลองและคำนวณฟิสิกส์ ม.4',
          description: 'เว็บแอปพลิเคชันช่วยคำนวณและจำลองการทดลองเรื่องแรงและการเคลื่อนที่ของนิวตัน',
          driveFolderId: 'mock_folder_02',
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          deletedAt: null
        },
        {
          categoryId: 'cat_biology_ecosystem_m5',
          title: 'เว็บแอปส่งเสริมสุขภาพและสิ่งแวดล้อม ม.5 (ปิดรับ)',
          description: 'โครงงาน Web App คำนวณสุขภาพ บันทึกโภชนาการ และการอนุรักษ์ธรรมชาติแม่ฮ่องสอน',
          driveFolderId: 'mock_folder_03',
          isActive: false, // Closed submission test
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          deletedAt: null
        }
      ];
      this._saveMockCategories(initialCategories);
    }

    if (!sessionStorage.getItem('ag_mock_submissions')) {
      // Submissions specifically designed to test:
      // 1. Numeric student number sorting: 2, 5, 5, 7, 10
      // 2. Thai alphabetical tie-breaker on number 5: "กนกวรรณ" vs "สมชาย"
      const initialSubmissions = [
        {
          submissionId: 'sub_001',
          categoryId: 'cat_astronomy_arts_cn',
          studentName: 'ธนภัทร สุขเกษม',
          className: 'ม.4/3',
          studentNo: 10,
          studyProgram: 'ศิลป์-จีน',
          workTitle: 'เว็บแอปดาราศาสตร์ 28 นักษัตรจีน Interactive',
          workUrl: 'https://example.com/apps/astronomy-stars',
          coverFileId: 'mock_img_001',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'space_app.png',
          coverMimeType: 'image/png',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          deletedAt: null
        },
        {
          submissionId: 'sub_002',
          categoryId: 'cat_astronomy_arts_cn',
          studentName: 'สมชาย รักเรียน',
          className: 'ม.4/3',
          studentNo: 5, // Same number 5 (Tie-break test: 'ส')
          studyProgram: 'ศิลป์-จีน',
          workTitle: 'สุริยุปราคาและปฏิทินดาราศาสตร์ราชวงศ์หมิง',
          workUrl: 'https://example.com/apps/eclipse-calendar',
          coverFileId: 'mock_img_002',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'eclipse.jpg',
          coverMimeType: 'image/jpeg',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          deletedAt: null
        },
        {
          submissionId: 'sub_003',
          categoryId: 'cat_astronomy_arts_cn',
          studentName: 'กนกวรรณ แก้วมณี',
          className: 'ม.4/3',
          studentNo: 5, // Same number 5 (Tie-break test: 'ก' comes BEFORE 'ส')
          studyProgram: 'ศิลป์-จีน',
          workTitle: 'แอปคำศัพท์และฝึกออกเสียงภาษาจีน AI Coach',
          workUrl: 'https://example.com/apps/chinese-ai-coach',
          coverFileId: 'mock_img_003',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'chinese_app.webp',
          coverMimeType: 'image/webp',
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          deletedAt: null
        },
        {
          submissionId: 'sub_004',
          categoryId: 'cat_astronomy_arts_cn',
          studentName: 'จิรวัฒน์ มั่นคง',
          className: 'ม.4/3',
          studentNo: 2,
          studyProgram: 'ศิลป์-จีน',
          workTitle: 'ยานสำรวจฉางเอ๋อ 6 ผจญภัย 3D WebApp',
          workUrl: 'https://example.com/apps/change6-3d',
          coverFileId: 'mock_img_004',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'moon_lander.png',
          coverMimeType: 'image/png',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          deletedAt: null
        },
        {
          submissionId: 'sub_005',
          categoryId: 'cat_astronomy_arts_cn',
          studentName: 'ปิยะดา รุ่งเรือง',
          className: 'ม.4/3',
          studentNo: 7,
          studyProgram: 'ศิลป์-จีน',
          workTitle: 'แผนที่ดาวและระบบคำนวณพิกัดท้องฟ้า',
          workUrl: 'https://example.com/apps/ancient-starmap',
          coverFileId: 'mock_img_005',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'starmap.jpg',
          coverMimeType: 'image/jpeg',
          createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          deletedAt: null
        },
        // Physics category submissions
        {
          submissionId: 'sub_006',
          categoryId: 'cat_physics_forces_m4',
          studentName: 'อภิสิทธิ์ วงศ์วิวัฒน์',
          className: 'ม.4/1',
          studentNo: 1,
          studyProgram: 'วิทย์-คอมฯ',
          workTitle: 'Newton Physics Lab: โปรแกรมจำลองแรง 2D',
          workUrl: 'https://example.com/apps/newton-lab-2d',
          coverFileId: 'mock_img_006',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'car_physics.png',
          coverMimeType: 'image/png',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          deletedAt: null
        },
        {
          submissionId: 'sub_007',
          categoryId: 'cat_physics_forces_m4',
          studentName: 'วิภาดา วรศิลป์',
          className: 'ม.4/1',
          studentNo: 4,
          studyProgram: 'วิทย์พิเศษฯ',
          workTitle: 'Gravity Lab: เครื่องคิดเลขคำนวณแรงโน้มถ่วง',
          workUrl: 'https://example.com/apps/gravity-calculator',
          coverFileId: 'mock_img_007',
          coverUrl: APP_CONFIG.PLACEHOLDER_COVER,
          coverOriginalName: 'gravity.webp',
          coverMimeType: 'image/webp',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          deletedAt: null
        }
      ];
      this._saveMockSubmissions(initialSubmissions);
    }
  }

  _getMockCategories() {
    try {
      return JSON.parse(sessionStorage.getItem('ag_mock_categories') || '[]');
    } catch {
      return [];
    }
  }

  _saveMockCategories(cats) {
    sessionStorage.setItem('ag_mock_categories', JSON.stringify(cats));
  }

  _getMockSubmissions() {
    try {
      return JSON.parse(sessionStorage.getItem('ag_mock_submissions') || '[]');
    } catch {
      return [];
    }
  }

  _saveMockSubmissions(subs) {
    sessionStorage.setItem('ag_mock_submissions', JSON.stringify(subs));
  }
}

// Global API instance
const api = new ApiClient();
