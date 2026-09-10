/**
 * Main Application Logic
 * Hongson Student Innovators WebApp
 * 
 * Implements:
 * - SPA URL routing (?category=UUID)
 * - Numeric student number sorting with Thai alphabetical tie-breaker
 * - Responsive Game Gallery and Submission Summary Table
 * - Student Submission Form with image compression and validation
 * - Empty states, loading skeletons, and Toast feedback
 */

// Global UI Utilities
const UIUtils = {
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatDate(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  }
};

const App = {
  currentCategoryId: null,
  currentCategory: null,
  allCategories: [],
  currentSubmissions: [],
  searchQuery: '',
  thaiCollator: new Intl.Collator('th', { sensitivity: 'base' }),

  init() {
    this.bindEvents();
    this.handleRoute();
    AdminApp.init();

    // Listen to custom admin events
    window.addEventListener('adminStateChanged', () => this.refreshCurrentView());
    window.addEventListener('categoriesUpdated', () => this.loadCategories());
    window.addEventListener('categoryDeleted', (e) => {
      if (this.currentCategoryId === e.detail?.categoryId) {
        this.navigateToHome();
      } else {
        this.loadCategories();
      }
    });
    window.addEventListener('submissionsUpdated', () => {
      if (this.currentCategoryId) {
        this.loadCategoryDetail(this.currentCategoryId);
      }
    });

    // Handle browser Back / Forward buttons
    window.addEventListener('popstate', () => this.handleRoute());
  },

  bindEvents() {
    // Back to home button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToHome();
      });
    }

    // Logo click goes home
    const brandLogo = document.getElementById('brandLogo');
    if (brandLogo) {
      brandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToHome();
      });
    }

    // Open submission modal button
    const openSubmitBtn = document.getElementById('openSubmitModalBtn');
    if (openSubmitBtn) {
      openSubmitBtn.addEventListener('click', () => this.openSubmissionModal());
    }

    // Close submission modal
    const closeSubmitBtn = document.getElementById('closeSubmitModalBtn');
    if (closeSubmitBtn) {
      closeSubmitBtn.addEventListener('click', () => this.closeSubmissionModal());
    }

    // Close submission modal on backdrop click
    const submissionModal = document.getElementById('submissionModal');
    if (submissionModal) {
      submissionModal.addEventListener('click', (e) => {
        if (e.target === submissionModal) {
          this.closeSubmissionModal();
        }
      });
    }

    // Submission form submit
    const submitForm = document.getElementById('studentSubmissionForm');
    if (submitForm) {
      submitForm.addEventListener('submit', (e) => this.handleStudentSubmission(e));
    }

    // Auto-prepend https:// on URL input blur if missing
    const workUrlInput = document.getElementById('inputWorkUrl');
    if (workUrlInput) {
      workUrlInput.addEventListener('blur', (e) => {
        let val = e.target.value.trim();
        if (val && !/^https?:\/\//i.test(val)) {
          e.target.value = 'https://' + val;
        }
      });
    }

    // Cover image file input change (trigger client-side compression)
    const coverInput = document.getElementById('submitCoverInput');
    if (coverInput) {
      coverInput.addEventListener('change', (e) => this.handleCoverFileSelected(e));
    }

    // Search input with debounce for smooth UI performance
    const searchInput = document.getElementById('gallerySearchInput');
    let searchDebounceTimer = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const val = e.target.value.toLowerCase().trim();
        searchDebounceTimer = setTimeout(() => {
          this.searchQuery = val;
          this.renderSubmissions();
        }, 150);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('gallerySortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.renderSubmissions());
    }
  },

  /* -------------------------------------------------------------
   * ROUTING
   * ----------------------------------------------------------- */

  handleRoute() {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('category');

    if (categoryId) {
      this.loadCategoryDetail(categoryId);
    } else {
      this.loadCategories();
    }
  },

  navigateToHome() {
    window.history.pushState({}, '', window.location.pathname);
    this.currentCategoryId = null;
    this.currentCategory = null;
    this.loadCategories();
  },

  navigateToCategory(categoryId) {
    window.history.pushState({}, '', `?category=${encodeURIComponent(categoryId)}`);
    this.loadCategoryDetail(categoryId);
  },

  refreshCurrentView() {
    if (this.currentCategoryId) {
      this.loadCategoryDetail(this.currentCategoryId);
    } else {
      this.loadCategories();
    }
  },

  /* -------------------------------------------------------------
   * HOME VIEW: CATEGORIES
   * ----------------------------------------------------------- */

  async loadCategories() {
    this.currentCategoryId = null;
    const homeView = document.getElementById('homeView');
    const categoryDetailView = document.getElementById('categoryDetailView');
    const container = document.getElementById('categoryCardsGrid');
    const skeleton = document.getElementById('categoriesLoadingSkeleton');
    const emptyState = document.getElementById('categoriesEmptyState');

    if (homeView) homeView.classList.remove('hidden');
    if (categoryDetailView) categoryDetailView.classList.add('hidden');
    if (skeleton) skeleton.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (container) container.innerHTML = '';

    try {
      const res = await api.getCategories();
      if (res.success) {
        this.allCategories = res.data || [];
        this.renderCategories();
      } else {
        UIUtils.showToast(res.error?.message || 'ไม่สามารถโหลดข้อมูลหัวข้อได้', 'error');
      }
    } catch (err) {
      UIUtils.showToast('เกิดข้อผิดพลาดในการโหลดหัวข้อ: ' + err.message, 'error');
    } finally {
      if (skeleton) skeleton.classList.add('hidden');
    }
  },

  renderCategories() {
    const container = document.getElementById('categoryCardsGrid');
    const emptyState = document.getElementById('categoriesEmptyState');
    if (!container) return;

    container.innerHTML = '';

    if (!this.allCategories || this.allCategories.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    const isAdmin = AdminApp.isLoggedIn();

    this.allCategories.forEach(cat => {
      const card = document.createElement('div');
      card.className = `category-card ${cat.isActive ? 'is-active' : 'is-closed'}`;
      card.setAttribute('data-id', cat.categoryId);

      const statusBadge = cat.isActive
        ? `<span class="badge badge-success">🟢 เปิดรับผลงาน</span>`
        : `<span class="badge badge-neutral">🔒 ปิดรับผลงาน</span>`;

      card.innerHTML = `
        <div class="cat-card-header">
          <div class="cat-card-badges">
            ${statusBadge}
            <span class="badge badge-subtle">🚀 ${cat.submissionCount || 0} ผลงาน</span>
          </div>
          ${isAdmin ? `
            <div class="cat-admin-dropdown" onclick="event.stopPropagation()">
              <button class="btn btn-icon btn-sm" title="จัดการหัวข้อ">⚙️</button>
              <div class="cat-admin-menu">
                <button class="btn-toggle-status" data-id="${cat.categoryId}" data-active="${cat.isActive}">
                  ${cat.isActive ? '🔒 ปิดรับผลงาน' : '🟢 เปิดรับผลงาน'}
                </button>
                <button class="btn-edit-cat" data-id="${cat.categoryId}">✏️ แก้ไขหัวข้อ</button>
                <button class="btn-delete-cat text-danger" data-id="${cat.categoryId}" data-count="${cat.submissionCount || 0}" data-title="${UIUtils.escapeHtml(cat.title)}">🗑️ ลบหัวข้อ</button>
              </div>
            </div>
          ` : ''}
        </div>
        <h3 class="cat-card-title">${UIUtils.escapeHtml(cat.title)}</h3>
        <p class="cat-card-desc">${UIUtils.escapeHtml(cat.description || 'ไม่มีคำอธิบายเพิ่มเติม')}</p>
        <div class="cat-card-footer">
          <span class="cat-card-date">สร้างเมื่อ ${UIUtils.formatDate(cat.createdAt)}</span>
          <span class="cat-card-action">เข้าชมผลงาน &rarr;</span>
        </div>
      `;

      // Click card to open category detail
      card.addEventListener('click', (e) => {
        // Prevent if clicked admin dropdown
        if (e.target.closest('.cat-admin-dropdown')) return;
        this.navigateToCategory(cat.categoryId);
      });

      // Bind admin dropdown buttons inside card
      if (isAdmin) {
        const toggleBtn = card.querySelector('.btn-toggle-status');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            AdminApp.toggleCategoryStatus(cat.categoryId, cat.isActive);
          });
        }
        const editBtn = card.querySelector('.btn-edit-cat');
        if (editBtn) {
          editBtn.addEventListener('click', () => {
            AdminApp.openCreateCategoryModal(cat);
          });
        }
        const delBtn = card.querySelector('.btn-delete-cat');
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            AdminApp.deleteCategory(cat.categoryId, cat.title, cat.submissionCount || 0);
          });
        }
      }

      container.appendChild(card);
    });
  },

  /* -------------------------------------------------------------
   * CATEGORY DETAIL VIEW: GALLERY & SUMMARY
   * ----------------------------------------------------------- */

  async loadCategoryDetail(categoryId) {
    this.currentCategoryId = categoryId;
    const homeView = document.getElementById('homeView');
    const categoryDetailView = document.getElementById('categoryDetailView');
    const skeleton = document.getElementById('submissionsLoadingSkeleton');
    const galleryGrid = document.getElementById('gameGalleryGrid');

    if (homeView) homeView.classList.add('hidden');
    if (categoryDetailView) categoryDetailView.classList.remove('hidden');
    if (skeleton) skeleton.classList.remove('hidden');
    if (galleryGrid) galleryGrid.innerHTML = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // 1. Fetch category metadata
      const catRes = await api.getCategory(categoryId);
      if (!catRes.success) {
        UIUtils.showToast('ไม่พบหัวข้อที่ระบุ กำลังกลับหน้าหลัก...', 'error');
        setTimeout(() => this.navigateToHome(), 1500);
        return;
      }
      this.currentCategory = catRes.data;
      this.renderCategoryHeader();

      // 2. Fetch submissions for this category
      const subRes = await api.getSubmissions(categoryId);
      if (subRes.success) {
        this.currentSubmissions = subRes.data || [];
        this.renderSubmissions();
      } else {
        UIUtils.showToast(subRes.error?.message || 'ไม่สามารถโหลดผลงานได้', 'error');
      }
    } catch (err) {
      UIUtils.showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียด: ' + err.message, 'error');
    } finally {
      if (skeleton) skeleton.classList.add('hidden');
    }
  },

  renderCategoryHeader() {
    const cat = this.currentCategory;
    if (!cat) return;

    const titleEl = document.getElementById('categoryDetailTitle');
    const descEl = document.getElementById('categoryDetailDesc');
    const statusBadge = document.getElementById('categoryStatusBadge');
    const countBadge = document.getElementById('categorySubmissionsCountBadge');
    const openSubmitBtn = document.getElementById('openSubmitModalBtn');
    const adminToolbar = document.getElementById('categoryAdminToolbar');

    if (titleEl) titleEl.textContent = cat.title;
    if (descEl) descEl.textContent = cat.description || 'ไม่มีคำอธิบายเพิ่มเติม';

    if (statusBadge) {
      statusBadge.className = `badge ${cat.isActive ? 'badge-success' : 'badge-neutral'}`;
      statusBadge.textContent = cat.isActive ? '🟢 เปิดรับผลงาน' : '🔒 ปิดรับผลงานแล้ว';
    }

    if (countBadge) {
      countBadge.textContent = `🚀 ${this.currentSubmissions.length} ผลงาน`;
    }

    // Toggle submit button state if closed
    if (openSubmitBtn) {
      if (cat.isActive) {
        openSubmitBtn.disabled = false;
        openSubmitBtn.innerHTML = '<span>➕ เพิ่มผลงานของฉัน</span>';
        openSubmitBtn.classList.remove('btn-disabled');
      } else {
        openSubmitBtn.disabled = true;
        openSubmitBtn.innerHTML = '<span>🔒 ปิดรับผลงานแล้ว</span>';
        openSubmitBtn.classList.add('btn-disabled');
      }
    }

    // Admin toolbar inside category view
    if (adminToolbar) {
      const isAdmin = AdminApp.isLoggedIn();
      adminToolbar.classList.toggle('hidden', !isAdmin);
      if (isAdmin) {
        adminToolbar.innerHTML = `
          <button class="btn btn-sm btn-secondary" id="adminCatHeaderToggleBtn">
            ${cat.isActive ? '🔒 ปิดรับผลงาน' : '🟢 เปิดรับผลงาน'}
          </button>
          <button class="btn btn-sm btn-secondary" id="adminCatHeaderEditBtn">
            ✏️ แก้ไขหัวข้อ
          </button>
          <button class="btn btn-sm btn-danger-outline" id="adminCatHeaderDeleteBtn">
            🗑️ ลบหัวข้อนี้
          </button>
        `;

        document.getElementById('adminCatHeaderToggleBtn')?.addEventListener('click', () => {
          AdminApp.toggleCategoryStatus(cat.categoryId, cat.isActive);
        });
        document.getElementById('adminCatHeaderEditBtn')?.addEventListener('click', () => {
          AdminApp.openCreateCategoryModal(cat);
        });
        document.getElementById('adminCatHeaderDeleteBtn')?.addEventListener('click', () => {
          AdminApp.deleteCategory(cat.categoryId, cat.title, this.currentSubmissions.length);
        });
      }
    }
  },

  /* -------------------------------------------------------------
   * SORTING ALGORITHM (CRITICAL RULE)
   * Primary: Number(studentNo) ascending
   * Secondary: Thai alphabet ก-ฮ via Intl.Collator('th')
   * ----------------------------------------------------------- */

  getSortedSubmissions() {
    const list = [...this.currentSubmissions];
    const sortSelect = document.getElementById('gallerySortSelect');
    const sortMode = sortSelect?.value || 'studentNoAsc';

    if (sortMode === 'latest') {
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Default & Standard sorting rule:
    return list.sort((a, b) => {
      const numA = Number(a.studentNo);
      const numB = Number(b.studentNo);
      const numberDiff = numA - numB;

      if (numberDiff !== 0) {
        return numberDiff;
      }

      // Tie-breaker: Thai alphabetical sorting ก-ฮ
      return this.thaiCollator.compare(a.studentName || '', b.studentName || '');
    });
  },

  getFilteredSubmissions() {
    const sorted = this.getSortedSubmissions();
    if (!this.searchQuery) return sorted;

    const q = this.searchQuery;
    return sorted.filter(s => {
      return (
        (s.workTitle && s.workTitle.toLowerCase().includes(q)) ||
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        (s.className && s.className.toLowerCase().includes(q)) ||
        (String(s.studentNo).includes(q)) ||
        (s.studyProgram && s.studyProgram.toLowerCase().includes(q))
      );
    });
  },

  renderSubmissions() {
    const filtered = this.getFilteredSubmissions();
    const galleryGrid = document.getElementById('gameGalleryGrid');
    const emptyState = document.getElementById('submissionsEmptyState');
    const countBadge = document.getElementById('categorySubmissionsCountBadge');
    const summaryCountBadge = document.getElementById('summaryTotalCountBadge');

    if (countBadge) {
      countBadge.textContent = `🚀 ${this.currentSubmissions.length} ผลงาน`;
    }
    if (summaryCountBadge) {
      summaryCountBadge.textContent = `${this.currentSubmissions.length} ผลงาน`;
    }

    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
        if (this.searchQuery) {
          emptyState.querySelector('p').textContent = `ไม่พบผลงานที่ตรงกับการค้นหา "${this.searchQuery}"`;
        } else {
          emptyState.querySelector('p').textContent = 'ยังไม่มีผลงานในหัวข้อนี้ เป็นคนแรกที่ส่งผลงาน Web App ของคุณได้เลย 🚀';
        }
      }
    } else {
      if (emptyState) emptyState.classList.add('hidden');
    }

    const isAdmin = AdminApp.isLoggedIn();

    // 1. Render Gallery Cards
    filtered.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.setAttribute('data-id', sub.submissionId);

      const coverSrc = sub.coverUrl || APP_CONFIG.PLACEHOLDER_COVER;

      card.innerHTML = `
        <div class="game-card-cover-wrap">
          <img 
            src="${coverSrc}" 
            alt="ภาพหน้าปก ${UIUtils.escapeHtml(sub.workTitle)}" 
            class="game-card-cover" 
            loading="lazy"
            onerror="this.onerror=null; this.src='${APP_CONFIG.PLACEHOLDER_COVER}';"
          />
          <div class="game-card-badge-no">เลขที่ ${sub.studentNo}</div>
          ${isAdmin ? `
            <button class="btn btn-sm btn-danger game-card-admin-del" title="ลบผลงาน">
              🗑️
            </button>
          ` : ''}
        </div>
        <div class="game-card-body">
          <h4 class="game-card-title" title="${UIUtils.escapeHtml(sub.workTitle)}">
            ${UIUtils.escapeHtml(sub.workTitle)}
          </h4>
          <div class="game-card-creator">
            <span class="creator-name">👤 ${UIUtils.escapeHtml(sub.studentName)}</span>
          </div>
          <div class="game-card-meta">
            <span class="badge badge-subtle">ชั้น ${UIUtils.escapeHtml(sub.className)}</span>
            <span class="badge badge-subtle">${UIUtils.escapeHtml(sub.studyProgram || 'ทั่วไป')}</span>
          </div>
          <div class="game-card-actions">
            <a 
              href="${UIUtils.escapeHtml(sub.workUrl)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="btn btn-launch btn-play"
              onclick="event.stopPropagation()"
            >
              🚀 เปิดเว็บแอป
            </a>
          </div>
        </div>
      `;

      // Entire card clickable to open game URL
      card.addEventListener('click', () => {
        if (sub.workUrl) {
          window.open(sub.workUrl, '_blank', 'noopener,noreferrer');
        }
      });

      // Admin delete button
      if (isAdmin) {
        const delBtn = card.querySelector('.game-card-admin-del');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            AdminApp.deleteSubmission(sub.submissionId, sub.studentName, sub.workTitle);
          });
        }
      }

      galleryGrid.appendChild(card);
    });

    // 2. Render Summary Table
    this.renderSummaryTable();
  },

  renderSummaryTable() {
    const tbody = document.getElementById('submissionSummaryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Summary table ALWAYS sorted by studentNo asc, then Thai name ก-ฮ
    const standardSorted = [...this.currentSubmissions].sort((a, b) => {
      const numA = Number(a.studentNo);
      const numB = Number(b.studentNo);
      const diff = numA - numB;
      if (diff !== 0) return diff;
      return this.thaiCollator.compare(a.studentName || '', b.studentName || '');
    });

    const isAdmin = AdminApp.isLoggedIn();

    standardSorted.forEach((sub, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center text-muted">${index + 1}</td>
        <td class="text-center font-bold font-mono">${sub.studentNo}</td>
        <td class="font-medium">${UIUtils.escapeHtml(sub.studentName)}</td>
        <td class="text-center">${UIUtils.escapeHtml(sub.className)}</td>
        <td>${UIUtils.escapeHtml(sub.studyProgram || '-')}</td>
        <td>
          <a href="${UIUtils.escapeHtml(sub.workUrl)}" target="_blank" rel="noopener noreferrer" class="link-subtle">
            ${UIUtils.escapeHtml(sub.workTitle)} ↗
          </a>
        </td>
        <td class="text-muted text-sm">${UIUtils.formatDate(sub.createdAt)}</td>
        ${isAdmin ? `
          <td class="text-center">
            <button class="btn btn-sm btn-icon text-danger summary-row-del-btn" title="ลบผลงาน">
              🗑️
            </button>
          </td>
        ` : ''}
      `;

      if (isAdmin) {
        tr.querySelector('.summary-row-del-btn')?.addEventListener('click', () => {
          AdminApp.deleteSubmission(sub.submissionId, sub.studentName, sub.workTitle);
        });
      }

      tbody.appendChild(tr);
    });
  },

  /* -------------------------------------------------------------
   * STUDENT SUBMISSION MODAL
   * ----------------------------------------------------------- */

  processedCover: null,

  openSubmissionModal() {
    if (!this.currentCategory) return;
    if (!this.currentCategory.isActive) {
      UIUtils.showToast('หัวข้อนี้ปิดรับผลงานแล้ว ไม่สามารถส่งผลงานเพิ่มได้', 'error');
      return;
    }

    const modal = document.getElementById('submissionModal');
    const form = document.getElementById('studentSubmissionForm');
    const catTitleLabel = document.getElementById('modalCategoryNameLabel');
    const previewContainer = document.getElementById('coverPreviewContainer');
    const fileInput = document.getElementById('submitCoverInput');

    if (form) form.reset();
    this.processedCover = null;
    if (previewContainer) previewContainer.classList.add('hidden');
    if (fileInput) fileInput.value = '';
    if (catTitleLabel) catTitleLabel.textContent = this.currentCategory.title;
    const uploadLabel = document.getElementById('uploadBoxLabel');
    if (uploadLabel) uploadLabel.textContent = '📸 คลิกเพื่อเลือกรูปภาพหน้าปก';

    if (modal) {
      modal.classList.remove('hidden');
      document.getElementById('inputStudentName')?.focus();
    }
  },

  closeSubmissionModal() {
    const modal = document.getElementById('submissionModal');
    if (modal) modal.classList.add('hidden');
    this.processedCover = null;
  },

  async handleCoverFileSelected(e) {
    const file = e.target.files?.[0];
    const previewContainer = document.getElementById('coverPreviewContainer');
    const previewImg = document.getElementById('coverPreviewImg');
    const previewStats = document.getElementById('coverPreviewStats');
    const uploadLabel = document.getElementById('uploadBoxLabel');

    if (!file) {
      this.processedCover = null;
      if (previewContainer) previewContainer.classList.add('hidden');
      if (uploadLabel) uploadLabel.textContent = '📸 คลิกเพื่อเลือกรูปภาพหน้าปก';
      return;
    }

    try {
      if (previewStats) previewStats.textContent = 'กำลังปรับขนาดและบีบอัดรูปภาพ...';
      if (previewContainer) previewContainer.classList.remove('hidden');

      const result = await ImageUtils.processCoverImage(file);
      this.processedCover = result;

      if (previewImg) previewImg.src = result.dataUrl;
      if (uploadLabel) uploadLabel.textContent = '🔄 คลิกเพื่อเปลี่ยนรูปภาพหน้าปก';
      if (previewStats) {
        const origKB = (result.originalSize / 1024).toFixed(0);
        const compKB = (result.compressedSize / 1024).toFixed(0);
        previewStats.textContent = `ขนาดเดิม: ${origKB} KB ➔ บีบอัดแล้ว: ${compKB} KB (${result.width}x${result.height}px)`;
      }
    } catch (err) {
      alert(err.message);
      e.target.value = '';
      this.processedCover = null;
      if (previewContainer) previewContainer.classList.add('hidden');
      if (uploadLabel) uploadLabel.textContent = '📸 คลิกเพื่อเลือกรูปภาพหน้าปก';
    }
  },

  async handleStudentSubmission(e) {
    e.preventDefault();

    // Honeypot spam check
    const honeypot = document.getElementById('inputHoneypot')?.value;
    if (honeypot) {
      console.warn('Bot detected by honeypot field');
      return;
    }

    const studentName = document.getElementById('inputStudentName')?.value?.trim();
    const className = document.getElementById('inputClassName')?.value?.trim();
    const studentNoVal = document.getElementById('inputStudentNo')?.value?.trim();
    const studyProgram = document.getElementById('inputStudyProgram')?.value?.trim();
    const workTitle = document.getElementById('inputWorkTitle')?.value?.trim();
    let workUrl = document.getElementById('inputWorkUrl')?.value?.trim() || '';
    const submitBtn = document.getElementById('submitFormBtn');

    // Auto prepend https:// if missing
    if (workUrl && !/^https?:\/\//i.test(workUrl)) {
      workUrl = 'https://' + workUrl;
      const urlInput = document.getElementById('inputWorkUrl');
      if (urlInput) urlInput.value = workUrl;
    }

    // Basic Validation
    if (!studentName || !className || !studentNoVal || !studyProgram || !workTitle || !workUrl) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนทุกช่อง');
      return;
    }

    const studentNo = parseInt(studentNoVal, 10);
    if (isNaN(studentNo) || studentNo <= 0) {
      alert('เลขที่ต้องเป็นเลขจำนวนเต็มบวกเท่านั้น');
      return;
    }

    // Dangerous protocols rejection
    if (/^(javascript|data|file):/i.test(workUrl)) {
      alert('URL ของผลงานไม่ถูกต้อง กรุณาระบุเป็นเว็บลิงก์ปกติ');
      return;
    }

    // Duplicate submission warning check (friendly prompt)
    const duplicate = this.currentSubmissions.find(s => 
      s.studentNo === studentNo && 
      s.className.toLowerCase() === className.toLowerCase() &&
      s.studentName.toLowerCase() === studentName.toLowerCase()
    );

    if (duplicate) {
      const confirmDup = confirm(
        `⚠️ พบข้อมูลที่อาจเป็นผลงานของนักเรียนคนเดียวกัน:\n\n` +
        `ชื่อ: ${studentName} (ชั้น ${className} เลขที่ ${studentNo})\n` +
        `ผลงานที่เคยส่งไว้: "${duplicate.workTitle}"\n\n` +
        `คุณต้องการส่งผลงานชิ้นใหม่นี้เพิ่มเติมใช่หรือไม่?`
      );
      if (!confirmDup) return;
    }

    // UI Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ กำลังส่งผลงาน...</span>';

    try {
      const payload = {
        categoryId: this.currentCategoryId,
        studentName,
        className,
        studentNo,
        studyProgram,
        workTitle,
        workUrl,
        coverDataUrl: this.processedCover ? this.processedCover.dataUrl : APP_CONFIG.PLACEHOLDER_COVER,
        coverBase64: this.processedCover ? this.processedCover.base64 : '',
        coverName: this.processedCover ? this.processedCover.name : 'cover.webp',
        coverMimeType: this.processedCover ? this.processedCover.mimeType : 'image/webp'
      };

      const res = await api.submitWork(payload);
      if (res.success) {
        this.closeSubmissionModal();
        UIUtils.showToast(res.message || 'ส่งผลงาน Web App เรียบร้อยแล้ว! 🎉', 'success');
        
        // Reload submissions
        await this.loadCategoryDetail(this.currentCategoryId);

        // Highlight new card
        setTimeout(() => {
          const newCard = document.querySelector(`.game-card[data-id="${res.data?.submissionId}"]`);
          if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newCard.classList.add('card-highlight');
            setTimeout(() => newCard.classList.remove('card-highlight'), 3000);
          }
        }, 300);
      } else {
        alert(res.error?.message || 'เกิดข้อผิดพลาดในการส่งผลงาน');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 ส่งผลงาน</span>';
    }
  }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
