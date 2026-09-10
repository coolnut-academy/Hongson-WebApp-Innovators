/**
 * Admin Management Module
 * Handles admin authentication, session lifecycle, and administration controls.
 */

const AdminApp = {
  TOKEN_KEY: 'ag_admin_token',
  
  /**
   * Check if an admin session is currently active
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!sessionStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Get current admin session token
   * @returns {string|null}
   */
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Initialize admin module event listeners and UI state
   */
  init() {
    this.bindEvents();
    this.updateAdminUI();
  },

  bindEvents() {
    // Admin login button in header
    const loginBtn = document.getElementById('adminLoginNavBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openLoginModal());
    }

    // Admin login modal close
    const loginCloseBtn = document.getElementById('adminLoginModalClose');
    if (loginCloseBtn) {
      loginCloseBtn.addEventListener('click', () => this.closeLoginModal());
    }

    // Admin login form submit
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Admin logout button in admin bar
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Create category button
    const createCatBtn = document.getElementById('adminCreateCategoryBtn');
    if (createCatBtn) {
      createCatBtn.addEventListener('click', () => this.openCreateCategoryModal());
    }

    // Manage rooms button
    const manageRoomsBtn = document.getElementById('adminManageRoomsBtn');
    if (manageRoomsBtn) {
      manageRoomsBtn.addEventListener('click', () => this.openManageRoomsModal());
    }

    // Manage rooms modal close on backdrop click
    const manageRoomsModal = document.getElementById('adminManageRoomsModal');
    if (manageRoomsModal) {
      manageRoomsModal.addEventListener('click', (e) => {
        if (e.target === manageRoomsModal) {
          this.closeManageRoomsModal();
        }
      });
    }

    // Admin login modal close on backdrop click
    const loginModal = document.getElementById('adminLoginModal');
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
          this.closeLoginModal();
        }
      });
    }

    // Create category form
    const createCatForm = document.getElementById('adminCategoryForm');
    if (createCatForm) {
      createCatForm.addEventListener('submit', (e) => this.handleSaveCategory(e));
    }

    // Category modal close on backdrop click
    const catModal = document.getElementById('adminCategoryModal');
    if (catModal) {
      catModal.addEventListener('click', (e) => {
        if (e.target === catModal) {
          this.closeCategoryModal();
        }
      });
    }

    // Diagnostics button
    const diagBtn = document.getElementById('adminDiagBtn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => this.showDiagnostics());
    }
  },

  updateAdminUI() {
    const isAuth = this.isLoggedIn();
    const adminBar = document.getElementById('adminBar');
    const loginBtn = document.getElementById('adminLoginNavBtn');
    
    // Toggle Admin Banner / Toolbar
    if (adminBar) {
      adminBar.classList.toggle('hidden', !isAuth);
    }
    
    // Toggle Nav login button state
    if (loginBtn) {
      if (isAuth) {
        loginBtn.innerHTML = '<span>🔒 โหมดผู้ดูแล (Active)</span>';
        loginBtn.classList.add('admin-active');
      } else {
        loginBtn.innerHTML = '<span>⚙️ ผู้ดูแลระบบ</span>';
        loginBtn.classList.remove('admin-active');
      }
    }

    // Toggle admin action buttons throughout the UI
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.toggle('hidden', !isAuth);
    });
  },

  /* -------------------------------------------------------------
   * LOGIN / LOGOUT
   * ----------------------------------------------------------- */

  openLoginModal() {
    if (this.isLoggedIn()) {
      // If already logged in, show info toast
      UIUtils.showToast('ท่านกำลังอยู่ในโหมดผู้ดูแลระบบ', 'info');
      return;
    }
    const modal = document.getElementById('adminLoginModal');
    const input = document.getElementById('adminPasswordInput');
    const errorEl = document.getElementById('adminLoginError');
    const progressWrap = document.getElementById('adminLoginProgress');
    if (progressWrap) progressWrap.classList.add('hidden');
    if (errorEl) errorEl.textContent = '';
    if (input) input.value = '';
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => input?.focus(), 100);
    }
  },

  closeLoginModal() {
    const modal = document.getElementById('adminLoginModal');
    const progressWrap = document.getElementById('adminLoginProgress');
    if (progressWrap) progressWrap.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
  },

  async handleLogin(e) {
    e.preventDefault();
    const passwordInput = document.getElementById('adminPasswordInput');
    const submitBtn = document.getElementById('adminLoginSubmitBtn');
    const errorEl = document.getElementById('adminLoginError');
    const progressWrap = document.getElementById('adminLoginProgress');
    const progressText = document.getElementById('adminProgressText');
    const progressPercent = document.getElementById('adminProgressPercent');
    const progressBar = document.getElementById('adminProgressBarFill');
    const password = passwordInput?.value?.trim();

    if (!password) {
      if (errorEl) errorEl.textContent = 'กรุณากรอกรหัสผ่านผู้ดูแลระบบ';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';
    if (errorEl) errorEl.textContent = '';

    // Show progress bar with smooth progression
    if (progressWrap) progressWrap.classList.remove('hidden');
    if (progressPercent) progressPercent.textContent = '20%';
    if (progressBar) progressBar.style.width = '20%';
    if (progressText) progressText.textContent = 'กำลังส่งคำขอเข้าสู่ระบบ...';

    let currentPct = 20;
    const progressTimer = setInterval(() => {
      if (currentPct < 85) {
        currentPct += 5;
        if (progressPercent) progressPercent.textContent = `${currentPct}%`;
        if (progressBar) progressBar.style.width = `${currentPct}%`;

        if (currentPct >= 50 && currentPct < 75) {
          if (progressText) progressText.textContent = 'กำลังเชื่อมต่อเซสชันความปลอดภัย Google...';
        } else if (currentPct >= 75) {
          if (progressText) progressText.textContent = 'กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...';
        }
      }
    }, 120);

    try {
      const res = await api.adminLogin(password);
      clearInterval(progressTimer);

      if (res.success && res.data?.token) {
        if (progressPercent) progressPercent.textContent = '100%';
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = 'ยืนยันสิทธิ์สำเร็จ!';

        sessionStorage.setItem(this.TOKEN_KEY, res.data.token);

        setTimeout(() => {
          this.closeLoginModal();
          this.updateAdminUI();
          UIUtils.showToast(res.message || 'เข้าสู่ระบบผู้ดูแลสำเร็จ', 'success');
          // Refresh current view to show admin controls
          window.dispatchEvent(new CustomEvent('adminStateChanged', { detail: { isLoggedIn: true } }));
        }, 300);
      } else {
        if (progressWrap) progressWrap.classList.add('hidden');
        if (errorEl) errorEl.textContent = res.error?.message || 'รหัสผ่านไม่ถูกต้อง';
      }
    } catch (err) {
      clearInterval(progressTimer);
      if (progressWrap) progressWrap.classList.add('hidden');
      if (errorEl) errorEl.textContent = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'เข้าสู่ระบบ';
    }
  },

  async handleLogout() {
    if (confirm('คุณต้องการออกจากโหมดผู้ดูแลระบบใช่หรือไม่?')) {
      const token = this.getToken();
      await api.adminLogout(token);
      sessionStorage.removeItem(this.TOKEN_KEY);
      this.updateAdminUI();
      UIUtils.showToast('ออกจากระบบผู้ดูแลเรียบร้อยแล้ว', 'info');
      window.dispatchEvent(new CustomEvent('adminStateChanged', { detail: { isLoggedIn: false } }));
    }
  },

  /* -------------------------------------------------------------
   * CATEGORY MANAGEMENT
   * ----------------------------------------------------------- */

  openCreateCategoryModal(categoryToEdit = null) {
    const modal = document.getElementById('adminCategoryModal');
    const titleInput = document.getElementById('adminCatTitleInput');
    const descInput = document.getElementById('adminCatDescInput');
    const idInput = document.getElementById('adminCatIdInput');
    const modalTitle = document.getElementById('adminCategoryModalTitle');

    if (!modal) return;

    if (categoryToEdit) {
      modalTitle.textContent = '✏️ แก้ไขหัวข้อการส่งงาน';
      idInput.value = categoryToEdit.categoryId;
      titleInput.value = categoryToEdit.title;
      descInput.value = categoryToEdit.description || '';
    } else {
      modalTitle.textContent = '➕ สร้างหัวข้อการส่งงานใหม่';
      idInput.value = '';
      titleInput.value = '';
      descInput.value = '';
    }

    modal.classList.remove('hidden');
    setTimeout(() => titleInput?.focus(), 100);
  },

  closeCategoryModal() {
    const modal = document.getElementById('adminCategoryModal');
    if (modal) modal.classList.add('hidden');
  },

  /* -------------------------------------------------------------
   * MANAGE & DELETE ROOMS MODAL
   * ----------------------------------------------------------- */

  openManageRoomsModal() {
    const modal = document.getElementById('adminManageRoomsModal');
    if (!modal) return;
    this.renderManageRoomsList();
    modal.classList.remove('hidden');
  },

  closeManageRoomsModal() {
    const modal = document.getElementById('adminManageRoomsModal');
    if (modal) modal.classList.add('hidden');
  },

  async renderManageRoomsList() {
    const container = document.getElementById('adminRoomsListContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-center p-3 text-muted">⏳ กำลังโหลดรายชื่อห้องส่งงาน...</div>';

    let list = (typeof App !== 'undefined' && App.allCategories && App.allCategories.length > 0)
      ? App.allCategories
      : (api.getCachedCategories() || []);

    if (list.length === 0) {
      const res = await api.getCategories();
      if (res.success && res.data) {
        list = res.data;
      }
    }

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-center p-3 text-muted">ไม่มีห้องส่งงานในระบบขณะนี้</div>';
      return;
    }

    let html = '<div class="admin-rooms-table-wrap">';
    html += '<table class="admin-rooms-table">';
    html += '<thead><tr><th>ชื่อห้องส่งงาน</th><th>สถานะ</th><th>จำนวนงาน</th><th>วันที่สร้าง</th><th>การจัดการ</th></tr></thead>';
    html += '<tbody>';

    list.forEach(cat => {
      const statusBadge = cat.isActive
        ? '<span class="badge badge-success">🟢 เปิดรับ</span>'
        : '<span class="badge badge-neutral">🔒 ปิดรับ</span>';
      html += `
        <tr data-cat-id="${cat.categoryId}">
          <td>
            <div class="font-bold">${UIUtils.escapeHtml(cat.title)}</div>
            <div class="text-xs text-muted">${UIUtils.escapeHtml(cat.description || 'ไม่มีคำอธิบาย')}</div>
          </td>
          <td>${statusBadge}</td>
          <td><span class="badge badge-subtle">🚀 ${cat.submissionCount || 0}</span></td>
          <td class="text-xs text-muted">${UIUtils.formatDate(cat.createdAt)}</td>
          <td>
            <div class="admin-table-action-btns">
              <button class="btn btn-xs btn-secondary btn-edit-cat-modal" data-id="${cat.categoryId}">✏️ แก้ไข</button>
              <button class="btn btn-xs btn-danger-solid btn-delete-cat-modal" data-id="${cat.categoryId}" data-count="${cat.submissionCount || 0}" data-title="${UIUtils.escapeHtml(cat.title)}">🗑️ ลบห้องนี้</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Bind action buttons inside modal table
    container.querySelectorAll('.btn-edit-cat-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const cat = list.find(c => c.categoryId === id);
        if (cat) {
          this.closeManageRoomsModal();
          this.openCreateCategoryModal(cat);
        }
      });
    });

    container.querySelectorAll('.btn-delete-cat-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const count = Number(btn.getAttribute('data-count') || 0);
        this.deleteCategory(id, title, count);
      });
    });
  },

  async handleSaveCategory(e) {
    e.preventDefault();
    if (this._isSavingCategory) return;

    const idInput = document.getElementById('adminCatIdInput');
    const titleInput = document.getElementById('adminCatTitleInput');
    const descInput = document.getElementById('adminCatDescInput');
    const submitBtn = document.getElementById('adminCatSubmitBtn');

    const catId = idInput?.value;
    const title = titleInput?.value?.trim();
    const description = descInput?.value?.trim();

    if (!title) {
      alert('กรุณาระบุชื่อหัวข้อ');
      return;
    }

    this._isSavingCategory = true;
    submitBtn.disabled = true;
    submitBtn.textContent = catId ? '⏳ กำลังบันทึกการแก้ไข...' : '⏳ กำลังสร้างโฟลเดอร์ใน Google Drive...';

    // Update status text progressively to keep user informed
    const stepTimer = setTimeout(() => {
      if (this._isSavingCategory && submitBtn) {
        submitBtn.textContent = '💾 กำลังบันทึกหัวข้อลงฐานข้อมูล...';
      }
    }, 3500);

    try {
      const token = this.getToken();
      let res;
      if (catId) {
        // Edit
        res = await api.updateCategory(token, catId, { title, description });
      } else {
        // Create
        res = await api.createCategory(token, { title, description });
      }

      clearTimeout(stepTimer);

      if (res.success) {
        this.closeCategoryModal();
        UIUtils.showToast(res.message || 'บันทึกข้อมูลหัวข้อสำเร็จ', 'success');
        window.dispatchEvent(new CustomEvent('categoriesUpdated', {
          detail: { newCategory: res.data || null, isEdit: !!catId }
        }));
      } else {
        alert(res.error?.message || 'เกิดข้อผิดพลาดในการบันทึกหัวข้อ');
      }
    } catch (err) {
      clearTimeout(stepTimer);
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      this._isSavingCategory = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'บันทึก';
    }
  },

  async toggleCategoryStatus(categoryId, currentIsActive) {
    const newStatus = !currentIsActive;
    const actionText = newStatus ? 'เปิดรับผลงาน' : 'ปิดรับผลงาน';
    
    if (!confirm(`คุณต้องการ ${actionText} สำหรับหัวข้อนี้ใช่หรือไม่?`)) {
      return;
    }

    try {
      const token = this.getToken();
      const res = await api.updateCategory(token, categoryId, { isActive: newStatus });
      if (res.success) {
        UIUtils.showToast(`เปลี่ยนสถานะเป็น "${actionText}" เรียบร้อยแล้ว`, 'success');
        window.dispatchEvent(new CustomEvent('categoriesUpdated'));
      } else {
        alert(res.error?.message || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  async deleteCategory(categoryId, categoryTitle, currentWorkCount = 0) {
    let confirmMsg = `⚠️ ต้องการลบห้องส่งงาน "${categoryTitle}" ใช่หรือไม่?\n\n📁 ระบบจะนำห้องออกจากหน้าเว็บ และย้ายโฟลเดอร์ใน Google Drive ไปที่ถังขยะ`;
    if (currentWorkCount > 0) {
      confirmMsg += `\n\nคำเตือน: ในห้องนี้มีผลงานของนักเรียนอยู่ทั้งหมด ${currentWorkCount} ชิ้นงาน!\nเมื่อลบแล้ว ห้องและผลงานทั้งหมดจะไม่แสดงในหน้ารวม`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      UIUtils.showToast('กำลังลบห้องและย้ายโฟลเดอร์ Google Drive...', 'info');
      const token = this.getToken();
      const res = await api.deleteCategory(token, categoryId);
      if (res.success) {
        UIUtils.showToast(res.message || 'ลบห้องส่งงานและย้ายโฟลเดอร์ Google Drive เรียบร้อยแล้ว', 'success');
        window.dispatchEvent(new CustomEvent('categoryDeleted', { detail: { categoryId } }));

        // Refresh manage rooms modal table if open
        const modal = document.getElementById('adminManageRoomsModal');
        if (modal && !modal.classList.contains('hidden')) {
          this.renderManageRoomsList();
        }
      } else {
        alert(res.error?.message || 'ไม่สามารถลบหัวข้อได้');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  /* -------------------------------------------------------------
   * SUBMISSION MANAGEMENT
   * ----------------------------------------------------------- */

  async deleteSubmission(submissionId, studentName, workTitle) {
    if (!confirm(`ต้องการลบผลงาน "${workTitle}" ของ "${studentName}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      const token = this.getToken();
      const res = await api.deleteSubmission(token, submissionId);
      if (res.success) {
        UIUtils.showToast('ลบผลงานเรียบร้อยแล้ว', 'info');
        window.dispatchEvent(new CustomEvent('submissionsUpdated'));
      } else {
        alert(res.error?.message || 'ไม่สามารถลบผลงานได้');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  /* -------------------------------------------------------------
   * DIAGNOSTICS
   * ----------------------------------------------------------- */

  async showDiagnostics() {
    const res = await api.healthCheck();
    const categoriesRes = await api.getCategories();
    const catCount = categoriesRes.data?.length || 0;

    let msg = `📊 สถานะระบบ (Admin Diagnostics):\n\n`;
    msg += `โหมดการทำงาน: ${api.isMock ? 'Phase 1 Mock Prototype (ยังไม่เชื่อมต่อ Google)' : 'Production (Connected)'}\n`;
    msg += `Google Sheet: ${res.data?.sheetConnected ? '✅ พร้อมใช้งาน' : '❌ ไม่พร้อม'}\n`;
    msg += `Google Drive: ${res.data?.driveConnected ? '✅ พร้อมใช้งาน' : '❌ ไม่พร้อม'}\n`;
    msg += `จำนวนหัวข้อที่เปิดอยู่: ${catCount} หมวด\n`;
    msg += `เวอร์ชันระบบ: ${res.data?.version || '1.0.0'}\n`;
    msg += `เวลาเซิร์ฟเวอร์: ${res.data?.timestamp || new Date().toLocaleString('th-TH')}`;

    alert(msg);
  }
};
