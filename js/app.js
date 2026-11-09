/* ====================================================================
   AJAX PROPLAN MES - MAIN APPLICATION CONTROLLER
   Tab Navigation, Reactive Rendering, UI Events & Export
   ==================================================================== */

/* ====================================================================
   ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY MODULE
   Roles:
   1. ADMIN: Full access (All operations, Cloud Sync, Reset Data, User Management)
   2. EDITOR: Data entry & planning (Day/Night Lines, Line Support, Simulator, Export CSV)
   3. VIEWER: Read-only access (Browse, filter, view capacity, export CSV)
   ==================================================================== */
const AUTH_PASSWORD_HASH = 'e458fa44f126ab2c97a7b61bad25a3165368ef188ece750b1ba46f70dcd8dceb';
const AUTH_PLAIN_FALLBACK = '1!2@3#4$5%';

window.USER_ROLES = {
  ADMIN: {
    id: 'admin',
    name: 'Quản Trị Viên (Admin)',
    shortName: 'Admin',
    roleTag: 'Toàn quyền',
    icon: '👑',
    passwords: ['1!2@3#4$5%', 'admin123', 'admin@ajax'],
    canEdit: true,
    canReset: true,
    canSync: true,
    canManageUsers: true,
    desc: 'Toàn quyền cấu hình, đồng bộ Google Sheets, khôi phục dữ liệu gốc, phân bổ và điều độ chuyền.'
  },
  EDITOR: {
    id: 'editor',
    name: 'Chỉnh Sửa / Nhập Data',
    shortName: 'Chỉnh Sửa',
    roleTag: 'Nhập data',
    icon: '✍️',
    passwords: ['editor123', 'nhaplieu123', 'edit123', 'editor@ajax'],
    canEdit: true,
    canReset: false,
    canSync: true,
    canManageUsers: false,
    desc: 'Được nhập dữ liệu, điều chỉnh Line Ca Ngày / Ca Đêm, chọn Line Support (1, 2, 3), chạy Simulator, xuất CSV.'
  },
  VIEWER: {
    id: 'viewer',
    name: 'Chỉ Xem (Viewer)',
    shortName: 'Chỉ Xem',
    roleTag: 'Viewer',
    icon: '👁️',
    passwords: ['viewer123', 'xem123', 'guest', 'viewer@ajax', ''],
    canEdit: false,
    canReset: false,
    canSync: false,
    canManageUsers: false,
    desc: 'Được tra cứu, lọc kế hoạch, xem bảng năng lực sản xuất, thứ tự chuyền, xuất CSV. Khóa chức năng chỉnh sửa.'
  }
};

async function computeSha256(str) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch(e) {}
  return null;
}

window.UserAuth = {
  getRole: function() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramRole = (urlParams.get('role') || '').toLowerCase();
      if (paramRole && (paramRole === 'admin' || paramRole === 'editor' || paramRole === 'viewer')) {
        return paramRole;
      }
    } catch(e) {}
    const r = localStorage.getItem('AJAX_USER_ROLE') || sessionStorage.getItem('AJAX_USER_ROLE');
    if (r && (r === 'admin' || r === 'editor' || r === 'viewer')) return r;
    // Backward compatibility with previous single password session
    if (localStorage.getItem('AJAX_PROPLAN_AUTH') === AUTH_PASSWORD_HASH || 
        sessionStorage.getItem('AJAX_PROPLAN_AUTH') === AUTH_PASSWORD_HASH) {
      return 'admin';
    }
    return null;
  },

  getCurrentRole: function() {
    return this.getRole() || 'viewer';
  },

  getRoleMeta: function(roleKey) {
    const key = (roleKey || this.getCurrentRole()).toUpperCase();
    return window.USER_ROLES[key] || window.USER_ROLES.VIEWER;
  },

  canEdit: function() {
    return !!this.getRoleMeta().canEdit;
  },

  canReset: function() {
    return !!this.getRoleMeta().canReset;
  },

  canSync: function() {
    return !!this.getRoleMeta().canSync;
  },

  isAdmin: function() {
    return this.getCurrentRole() === 'admin';
  },

  setRole: function(roleKey, remember) {
    const r = (roleKey || 'viewer').toLowerCase();
    if (remember) {
      localStorage.setItem('AJAX_USER_ROLE', r);
      if (r === 'admin') localStorage.setItem('AJAX_PROPLAN_AUTH', AUTH_PASSWORD_HASH);
    } else {
      sessionStorage.setItem('AJAX_USER_ROLE', r);
      if (r === 'admin') sessionStorage.setItem('AJAX_PROPLAN_AUTH', AUTH_PASSWORD_HASH);
    }
    this.applyRoleToUI();
  },

  logout: function() {
    localStorage.removeItem('AJAX_USER_ROLE');
    sessionStorage.removeItem('AJAX_USER_ROLE');
    localStorage.removeItem('AJAX_PROPLAN_AUTH');
    sessionStorage.removeItem('AJAX_PROPLAN_AUTH');
    document.body.removeAttribute('data-user-role');
    const overlay = document.getElementById('authLockOverlay');
    const roleModal = document.getElementById('roleSwitchModal');
    if (roleModal) roleModal.style.display = 'none';

    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
      const inputEl = document.getElementById('authPasswordInput');
      if (inputEl) {
        inputEl.value = '';
        setTimeout(() => inputEl.focus(), 150);
      }
    }
    if (window.showToast) {
      window.showToast('info', '🔒 Đã khóa màn hình bảo mật!');
    }
  },

  applyRoleToUI: function() {
    const role = this.getCurrentRole();
    const meta = this.getRoleMeta(role);
    document.body.setAttribute('data-user-role', role);

    // Update Top Navigation Role Badge
    const badge = document.getElementById('topNavRoleBadge');
    if (badge) {
      badge.className = `top-nav-role-badge role-${role}`;
      badge.innerHTML = `
        <span class="role-icon">${meta.icon}</span>
        <div class="role-text-wrap">
          <span class="role-name">${meta.shortName}</span>
          <span class="role-tag">${meta.roleTag}</span>
        </div>
        <span class="role-arrow">▾</span>
      `;
      badge.title = `Vai trò hiện tại: ${meta.name} (${meta.desc}) — Bấm để đổi vai trò`;
    }

    // Toggle Reset Data Button (Admin only)
    const resetBtn = document.getElementById('btnResetDefaultData') || document.querySelector('button[onclick="handleResetDefaultData()"]');
    if (resetBtn) {
      if (role === 'admin') {
        resetBtn.style.display = 'inline-flex';
        if (typeof resetBtn.removeAttribute === 'function') {
          resetBtn.removeAttribute('disabled');
        }
      } else {
        resetBtn.style.display = 'none';
      }
    }

    // Toggle Auto Assign Button
    const autoAssignBtn = document.getElementById('btnAutoAssignAll') || document.querySelector('button[onclick="handleAutoAssignAll()"]');
    if (autoAssignBtn) {
      if (role === 'viewer') {
        autoAssignBtn.style.opacity = '0.5';
        autoAssignBtn.style.cursor = 'not-allowed';
        autoAssignBtn.title = 'Chức năng bị khóa ở chế độ Viewer (Chỉ xem)';
      } else {
        autoAssignBtn.style.opacity = '1';
        autoAssignBtn.style.cursor = 'pointer';
        autoAssignBtn.title = 'Tự động phân bổ chuyền năng suất cao nhất';
      }
    }

    // Toggle Cloud Sync Button
    const cloudSyncBtn = document.getElementById('btnCloudSync') || document.querySelector('button[onclick="window.SyncService.fetchLiveData()"]');
    if (cloudSyncBtn) {
      if (role === 'viewer') {
        cloudSyncBtn.style.opacity = '0.5';
        cloudSyncBtn.style.cursor = 'not-allowed';
        cloudSyncBtn.title = 'Chức năng bị khóa ở chế độ Viewer (Chỉ xem)';
      } else {
        cloudSyncBtn.style.opacity = '1';
        cloudSyncBtn.style.cursor = 'pointer';
        cloudSyncBtn.title = 'Đồng bộ ngay với Google Sheets';
      }
    }

    // Re-render Simulator in Tab 2 if active to update disabled states
    const activeTab = document.querySelector('.nav-link.active')?.getAttribute('data-tab');
    if (activeTab === 'capacity' && typeof window.renderCapacityPlanningSimulatorView === 'function') {
      window.renderCapacityPlanningSimulatorView();
    }
  }
};

window.selectedAuthRole = 'admin';

window.selectAuthRole = function(role) {
  window.selectedAuthRole = role;
  document.querySelectorAll('.auth-role-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-role') === role);
  });

  const descBox = document.getElementById('authRoleDescBox');
  const pwdLabel = document.getElementById('authPasswordLabel');
  const pwdInput = document.getElementById('authPasswordInput');
  const errorEl = document.getElementById('authErrorMessage');
  if (errorEl) errorEl.style.display = 'none';

  if (role === 'admin') {
    if (descBox) descBox.innerHTML = '<strong>👑 Quyền Admin:</strong> Toàn quyền quản trị hệ thống, đồng bộ Google Sheets, khôi phục dữ liệu gốc, phân bổ và điều chỉnh mọi kế hoạch.';
    if (pwdLabel) pwdLabel.innerText = 'Mật khẩu truy cập Admin:';
    if (pwdInput) { pwdInput.placeholder = 'Nhập mật khẩu Admin (mặc định: 1!2@3#4$5% hoặc admin123)...'; pwdInput.focus(); }
  } else if (role === 'editor') {
    if (descBox) descBox.innerHTML = '<strong>✍️ Quyền Chỉnh Sửa / Nhập Data:</strong> Được nhập số liệu, chọn Line Ca Ngày/Đêm, chọn Line Support (1, 2, 3), chạy Simulator, xuất CSV.';
    if (pwdLabel) pwdLabel.innerText = 'Mật khẩu Chỉnh Sửa / Nhập Data:';
    if (pwdInput) { pwdInput.placeholder = 'Nhập mật khẩu Chỉnh Sửa (mặc định: editor123)...'; pwdInput.focus(); }
  } else {
    if (descBox) descBox.innerHTML = '<strong>👁️ Quyền Chỉ Xem (Viewer):</strong> Xem toàn bộ kế hoạch và năng lực sản xuất, tra cứu, xuất CSV. Khóa chức năng chỉnh sửa dữ liệu.';
    if (pwdLabel) pwdLabel.innerText = 'Mật khẩu Viewer (hoặc bấm nút Vào Xem Nhanh):';
    if (pwdInput) { pwdInput.placeholder = 'Nhập mật khẩu Viewer (mặc định: viewer123)...'; pwdInput.focus(); }
  }
};

window.handleQuickViewerLogin = function() {
  const rememberEl = document.getElementById('authRememberDevice');
  const isRemember = rememberEl ? rememberEl.checked : true;
  window.UserAuth.setRole('viewer', isRemember);

  const overlay = document.getElementById('authLockOverlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
    }, 250);
  }

  if (window.showToast) {
    window.showToast('success', '👁️ Chào mừng bạn! Bạn đang xem hệ thống với quyền Viewer (Chỉ xem).');
  }
};

window.initSecurityLock = function() {
  const overlay = document.getElementById('authLockOverlay');
  if (!overlay) return;

  const currentRole = window.UserAuth.getRole();
  if (currentRole) {
    overlay.style.display = 'none';
    window.UserAuth.applyRoleToUI();
  } else {
    overlay.style.display = 'flex';
    window.selectAuthRole('admin');
    setTimeout(() => {
      document.getElementById('authPasswordInput')?.focus();
    }, 150);
  }
};

window.handleAuthSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inputEl = document.getElementById('authPasswordInput');
  const cardEl = document.getElementById('authLockCard');
  const errorEl = document.getElementById('authErrorMessage');
  const rememberEl = document.getElementById('authRememberDevice');
  const overlay = document.getElementById('authLockOverlay');

  if (!inputEl) return;
  const val = inputEl.value.trim();
  const selectedRole = window.selectedAuthRole || 'admin';
  const isRemember = rememberEl ? rememberEl.checked : true;

  function doUnlock(roleToAssign) {
    if (errorEl) errorEl.style.display = 'none';
    window.UserAuth.setRole(roleToAssign, isRemember);

    if (overlay) {
      overlay.style.transition = 'opacity 0.25s ease-out';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
      }, 250);
    }
    const meta = window.UserAuth.getRoleMeta(roleToAssign);
    if (window.showToast) {
      window.showToast('success', `${meta.icon} Mở khóa thành công! Bạn đang đăng nhập vai trò: ${meta.name}`);
    }
  }

  function doFail(msg) {
    if (errorEl) {
      errorEl.innerText = msg || '⚠️ Mật khẩu không chính xác cho vai trò này. Vui lòng thử lại!';
      errorEl.style.display = 'block';
    }
    if (cardEl) {
      cardEl.classList.remove('auth-card-shake');
      void cardEl.offsetWidth;
      cardEl.classList.add('auth-card-shake');
    }
    inputEl.focus();
    inputEl.select();
  }

  // 1. Direct role match with selected role
  const targetMeta = window.UserAuth.getRoleMeta(selectedRole);
  if (targetMeta.passwords.includes(val) || (selectedRole === 'admin' && val === AUTH_PLAIN_FALLBACK)) {
    doUnlock(selectedRole);
    return;
  }

  // 2. Fallback SHA-256 for admin
  if (selectedRole === 'admin') {
    const hash = await computeSha256(val);
    if (hash === AUTH_PASSWORD_HASH) {
      doUnlock('admin');
      return;
    }
  }

  // 3. Smart role detection: If user entered another valid role's password, log them into that role!
  for (const [rKey, rMeta] of Object.entries(window.USER_ROLES)) {
    if (rMeta.passwords && rMeta.passwords.includes(val)) {
      doUnlock(rMeta.id);
      return;
    }
  }

  // 4. Server-configured users detection from /api/users
  try {
    let usersList = window._serverUsersList;
    if (!usersList || !Array.isArray(usersList) || usersList.length === 0) {
      const res = await fetch('/api/users?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          usersList = data.users;
          window._serverUsersList = usersList;
        }
      }
    }
    if (Array.isArray(usersList)) {
      const matchedUser = usersList.find(u => {
        if (!u || !u.password) return false;
        if (u.password === val) return true;
        // Also support format "username:password"
        if (`${u.username}:${u.password}` === val) return true;
        return false;
      });
      if (matchedUser) {
        if (matchedUser.fullName) {
          try {
            localStorage.setItem('AJAX_SIM_PLANNER_NAME', matchedUser.fullName);
            sessionStorage.setItem('AJAX_SIM_PLANNER_NAME', matchedUser.fullName);
            if (window.AppStore) window.AppStore.simPlannerName = matchedUser.fullName;
          } catch (e) {}
        }
        doUnlock(matchedUser.role || 'viewer');
        return;
      }
    }
  } catch (err) {
    console.warn('[Auth] Server users check error:', err);
  }

  doFail();
};

// Modal Role Switcher Controller
window.modalTargetRole = 'admin';

window.openRoleSwitchModal = function() {
  const modal = document.getElementById('roleSwitchModal');
  if (!modal) return;

  const currentRole = window.UserAuth.getCurrentRole();
  const currentMeta = window.UserAuth.getRoleMeta(currentRole);

  const avatar = document.getElementById('modalRoleAvatar');
  const title = document.getElementById('modalRoleTitle');
  const desc = document.getElementById('modalRoleDesc');
  if (avatar) avatar.innerText = currentMeta.icon;
  if (title) title.innerText = currentMeta.name;
  if (desc) desc.innerText = currentMeta.desc;

  window.selectModalTargetRole(currentRole === 'viewer' ? 'editor' : 'viewer');
  modal.style.display = 'flex';
};

window.closeRoleSwitchModal = function() {
  const modal = document.getElementById('roleSwitchModal');
  if (modal) modal.style.display = 'none';
};

window.selectModalTargetRole = function(role) {
  window.modalTargetRole = role;
  document.querySelectorAll('.role-card-opt').forEach(card => {
    card.classList.toggle('selected', card.getAttribute('data-role') === role);
  });

  const pwdGroup = document.getElementById('roleSwitchPwdGroup');
  const pwdLabel = document.getElementById('roleSwitchPwdLabel');
  const pwdInput = document.getElementById('roleSwitchPasswordInput');
  const errorMsg = document.getElementById('roleSwitchErrorMsg');
  if (errorMsg) errorMsg.style.display = 'none';

  if (role === 'viewer') {
    if (pwdGroup) pwdGroup.style.display = 'none';
  } else {
    if (pwdGroup) pwdGroup.style.display = 'block';
    if (pwdLabel) {
      pwdLabel.innerText = role === 'admin' 
        ? 'Nhập mật khẩu Admin (mặc định: 1!2@3#4$5% hoặc admin123):' 
        : 'Nhập mật khẩu Chỉnh Sửa (mặc định: editor123):';
    }
    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 100);
    }
  }
};

window.handleRoleSwitchSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const targetRole = window.modalTargetRole || 'viewer';
  const pwdInput = document.getElementById('roleSwitchPasswordInput');
  const errorMsg = document.getElementById('roleSwitchErrorMsg');
  const val = (pwdInput?.value || '').trim();

  function doSwitch() {
    window.UserAuth.setRole(targetRole, true);
    window.closeRoleSwitchModal();
    const meta = window.UserAuth.getRoleMeta(targetRole);
    if (window.showToast) {
      window.showToast('success', `${meta.icon} Đã chuyển sang vai trò: ${meta.name}`);
    }
  }

  function doFail(msg) {
    if (errorMsg) {
      errorMsg.innerText = msg || '⚠️ Mật khẩu không chính xác cho vai trò này!';
      errorMsg.style.display = 'block';
    }
    if (pwdInput) {
      pwdInput.focus();
      pwdInput.select();
    }
  }

  if (targetRole === 'viewer') {
    doSwitch();
    return;
  }

  const targetMeta = window.UserAuth.getRoleMeta(targetRole);
  if (targetMeta.passwords.includes(val) || (targetRole === 'admin' && val === AUTH_PLAIN_FALLBACK)) {
    doSwitch();
    return;
  }

  if (targetRole === 'admin') {
    const hash = await computeSha256(val);
    if (hash === AUTH_PASSWORD_HASH) {
      doSwitch();
      return;
    }
  }

  doFail();
};

window.handleAppLock = function() {
  window.UserAuth.logout();
};

window.toggleAuthPasswordVisibility = function() {
  const input = document.getElementById('authPasswordInput');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

// ====================================================================
// MACBOOK M5 ADAPTIVE & RESPONSIVE AUTO-FIT CONTROLLER
// ====================================================================

window.currentAppScale = localStorage.getItem('ajax_app_scale') || 'auto';
window.isSidebarCollapsed = localStorage.getItem('ajax_sidebar_collapsed') === 'true';
window.isFilterCollapsed = localStorage.getItem('ajax_filter_collapsed') === 'true';
window.isMacBookCompactMode = localStorage.getItem('ajax_macbook_compact') !== 'false'; // default true for MacBook!

window.toggleSidebarCollapse = function() {
  const sidebar = document.querySelector('.sidebar');
  const wrapper = document.querySelector('.content-wrapper');
  const icon = document.getElementById('sidebarToggleIcon');
  if (!sidebar) return;

  window.isSidebarCollapsed = !window.isSidebarCollapsed;
  localStorage.setItem('ajax_sidebar_collapsed', window.isSidebarCollapsed);

  if (window.isSidebarCollapsed) {
    sidebar.classList.add('collapsed');
    if (wrapper) wrapper.classList.add('sidebar-collapsed');
    if (icon) icon.textContent = '▶';
  } else {
    sidebar.classList.remove('collapsed');
    if (wrapper) wrapper.classList.remove('sidebar-collapsed');
    if (icon) icon.textContent = '◀';
  }

  // Recalculate auto scale if active
  if (window.currentAppScale === 'auto') {
    window.applyAutoAppScale();
  }
};

window.applyAutoAppScale = function() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Tự động tối ưu riêng cho điện thoại di động:
    // 1. Giữ tỉ lệ chuẩn 1.0 (không zoom co cụm làm mờ chữ, cho phép giao diện tự co giãn theo viewport)
    // 2. Kích hoạt class 'is-mobile-screen' để kích hoạt hệ thống CSS responsive chuyên sâu
    document.body.classList.add('is-mobile-screen');
    document.documentElement.style.setProperty('--app-scale', '1');
    const wrapper = document.querySelector('.content-wrapper');
    if (wrapper) wrapper.style.zoom = '1';
    const pageView = document.querySelector('.page-view');
    if (pageView) {
      pageView.style.zoom = '1';
    }
    if (typeof window.applyAutoFontScale === 'function') {
      window.applyAutoFontScale();
    }
    return;
  }

  // Giao diện Máy tính & Laptop:
  document.body.classList.remove('is-mobile-screen');
  const sidebarW = window.isSidebarCollapsed ? 62 : 260;
  const availW = window.innerWidth - sidebarW - 20;

  // Smart responsive scale: prioritize readability, never shrink text below clear threshold
  let scale = 1.0;
  if (availW >= 1420) {
    scale = 1.0;
  } else if (availW >= 1220) {
    scale = 0.94;
  } else if (availW >= 1050) {
    scale = 0.90;
  } else {
    scale = Math.max(0.85, Math.round((availW / 1200) * 100) / 100);
  }

  document.documentElement.style.setProperty('--app-scale', scale);
  const wrapper = document.querySelector('.content-wrapper');
  if (wrapper) wrapper.style.zoom = '1';
  const pageView = document.querySelector('.page-view');
  if (pageView) {
    pageView.style.zoom = scale;
  }

  if (typeof window.applyAutoFontScale === 'function') {
    window.applyAutoFontScale();
  }
};

window.currentFontScale = localStorage.getItem('ajax_font_scale') || 'auto';

window.setFontScale = function(scaleMode) {
  window.currentFontScale = scaleMode;
  localStorage.setItem('ajax_font_scale', scaleMode);

  // Update font scale buttons in UI
  document.querySelectorAll('.btn-font-opt').forEach(btn => {
    if (btn.dataset.font === scaleMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (scaleMode === 'auto') {
    window.applyAutoFontScale();
    if (window.showToast) window.showToast('info', '🔤 Đã bật Auto Chữ: Tự động tối ưu theo độ phân giải màn hình');
  } else {
    document.documentElement.setAttribute('data-font-size', scaleMode);
    let scaleNum = 1.0;
    if (scaleMode === 'large') scaleNum = 1.15;
    else if (scaleMode === 'xlarge') scaleNum = 1.30;
    document.documentElement.style.setProperty('--font-scale', scaleNum);
    if (window.showToast) {
      const label = scaleMode === 'large' ? 'Lớn (+15%)' : scaleMode === 'xlarge' ? 'Rất Lớn (+30%)' : 'Vừa (100%)';
      window.showToast('info', `🔤 Đã đổi cỡ chữ: ${label}`);
    }
  }
};

window.applyAutoFontScale = function() {
  if (window.currentFontScale !== 'auto') return;
  const w = window.innerWidth;
  let fontScale = 1.0;
  if (w <= 768) {
    fontScale = 0.95; // Cỡ chữ chuẩn, sắc nét và dễ đọc trên màn hình điện thoại
  } else if (w >= 1680) {
    fontScale = 1.08;
  } else if (w >= 1400) {
    fontScale = 1.02;
  } else {
    fontScale = 1.0;
  }
  document.documentElement.setAttribute('data-font-size', 'auto');
  document.documentElement.style.setProperty('--font-scale', fontScale);
};

window.setAppScale = function(scaleVal) {
  window.currentAppScale = scaleVal;
  localStorage.setItem('ajax_app_scale', scaleVal);

  // Update scale buttons UI
  document.querySelectorAll('.btn-scale-opt').forEach(btn => {
    const val = btn.dataset.scale;
    if (String(val) === String(scaleVal)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const wrapper = document.querySelector('.content-wrapper');
  if (wrapper) wrapper.style.zoom = '1';
  const pageView = document.querySelector('.page-view');

  if (scaleVal === 'auto') {
    window.applyAutoAppScale();
    if (window.showToast) window.showToast('info', '⚡ Đã bật Auto Fit: Tự động vừa vặn màn hình');
  } else {
    const num = parseFloat(scaleVal) || 1.0;
    document.documentElement.style.setProperty('--app-scale', num);
    if (pageView) {
      pageView.style.zoom = num;
    }
    if (window.showToast) window.showToast('info', `🖥️ Đã chỉnh tỉ lệ: ${Math.round(num * 100)}%`);
  }

  // Ensure all tables stay anchored to the left (scrollLeft = 0)
  document.querySelectorAll('.table-container').forEach(c => {
    c.scrollLeft = 0;
  });
};

window.toggleFilterCollapse = function() {
  const card = document.getElementById('datamassFilterCard');
  const btn = document.getElementById('btnFilterToggle');
  if (!card) return;
  window.isFilterCollapsed = !window.isFilterCollapsed;
  localStorage.setItem('ajax_filter_collapsed', window.isFilterCollapsed);

  if (window.isFilterCollapsed) {
    card.classList.add('is-collapsed');
    if (btn) btn.textContent = '🔽 Mở rộng bộ lọc';
  } else {
    card.classList.remove('is-collapsed');
    if (btn) btn.textContent = '🔼 Thu gọn bộ lọc';
  }
  window.updateFilterCompactSummary();
};

window.toggleMacBookCompactMode = function() {
  window.isMacBookCompactMode = !window.isMacBookCompactMode;
  localStorage.setItem('ajax_macbook_compact', window.isMacBookCompactMode);
  document.body.classList.toggle('macbook-mode', window.isMacBookCompactMode);
  const btn = document.getElementById('btnMacBookCompactToggle');
  if (btn) {
    btn.textContent = window.isMacBookCompactMode ? '📐 Gọn (MacBook)' : '📐 Tiêu Chuẩn';
  }
};

window.toggleKpiTableCollapse = function() {
  const body = document.getElementById('datamassKpiTableBody');
  const btn = document.getElementById('btnKpiTableToggle');
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? '' : 'none';
  if (btn) btn.textContent = isHidden ? '🔼 Thu gọn' : '🔽 Mở rộng';
};

window.setManpowerCompactMode = function(isCompact) {
  if (!window.AppStore) window.AppStore = {};
  window.AppStore.manpowerTableMode = isCompact ? 'COMPACT' : 'EXPANDED';
  localStorage.setItem('AJAX_PROPLAN_MP_MODE', window.AppStore.manpowerTableMode);
  renderDataMassView();
  window.showToast('info', isCompact ? '🔼 Đã chuyển sang chế độ Thu gọn (Trọng tâm Line & Nhân lực)' : '🔽 Đã chuyển sang chế độ Mở rộng (Đầy đủ tất cả chỉ tiêu)');
};

window.toggleManpowerSectionCollapse = function(forceCollapse) {
  const body = document.getElementById('datamassManpowerBodyWrap');
  const toolbar = document.getElementById('datamassManpowerHeaderToolbar');
  const btn = document.getElementById('btnToggleManpowerSection');
  const subtitle = document.getElementById('datamassManpowerSubtitle');
  if (!body) return;
  const isCurrentlyHidden = (body.style.display === 'none');
  const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !isCurrentlyHidden;

  body.style.display = shouldHide ? 'none' : '';
  if (toolbar) toolbar.style.display = shouldHide ? 'none' : 'flex';
  if (btn) {
    btn.textContent = shouldHide ? '🔽 Mở rộng' : '🔼 Thu gọn';
    btn.classList.toggle('is-collapsed', shouldHide);
  }
  if (subtitle) {
    subtitle.textContent = shouldHide 
      ? '(Đang thu gọn — Bấm "Mở rộng" để xem bảng cân đối ca & nhân lực)'
      : 'Kế hoạch nhân lực cần (Plan People), Nhân lực có mặt (Nhập trực tiếp theo ngày), Chênh lệch thừa/thiếu, Số người cần bổ sung và Số giờ OT cần bù';
  }
  localStorage.setItem('AJAX_PROPLAN_MP_SECTION_COLLAPSED', shouldHide ? 'true' : 'false');
};

window.toggleStageSummarySectionCollapse = function(forceCollapse) {
  const container = document.getElementById('datamassStageSummaryContainer');
  const btn = document.getElementById('btnToggleStageSummarySection');
  const subtitle = document.getElementById('datamassStageSummarySubtitle');
  if (!container) return;
  const isCurrentlyHidden = (container.style.display === 'none');
  const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !isCurrentlyHidden;

  container.style.display = shouldHide ? 'none' : '';
  if (btn) {
    btn.textContent = shouldHide ? '🔽 Mở rộng' : '🔼 Thu gọn';
    btn.classList.toggle('is-collapsed', shouldHide);
  }
  if (subtitle) {
    subtitle.textContent = shouldHide
      ? '(Đang thu gọn — Bấm "Mở rộng" để xem bảng kế hoạch sản xuất tổng theo công đoạn)'
      : 'Tổng hợp kế hoạch sản xuất cần (Plan pcs), thực tế đạt (Fact pcs), chênh lệch sản lượng và giờ chuẩn theo từng ngày';
  }
  localStorage.setItem('AJAX_PROPLAN_STAGE_SUMMARY_COLLAPSED', shouldHide ? 'true' : 'false');
};

window.toggleTable2SectionCollapse = function(forceCollapse) {
  const body = document.getElementById('datamassTable2BodyWrap');
  const btn = document.getElementById('btnToggleTable2Section');
  const subtitle = document.getElementById('datamassTable2Subtitle');
  if (!body) return;
  const isCurrentlyHidden = (body.style.display === 'none');
  const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !isCurrentlyHidden;

  body.style.display = shouldHide ? 'none' : '';
  if (btn) {
    btn.textContent = shouldHide ? '🔽 Mở rộng' : '🔼 Thu gọn';
    btn.classList.toggle('is-collapsed', shouldHide);
  }
  if (subtitle) {
    subtitle.textContent = shouldHide
      ? '(Đang thu gọn — Bấm "Mở rộng" để xem bảng chi tiết model & tiến độ sản lượng)'
      : 'Theo dõi số lượng Kế hoạch (Plan), Thực tế (Fact) và Chênh lệch (Gap) chi tiết theo ngày hoặc tổng lũy kế';
  }
  localStorage.setItem('AJAX_PROPLAN_TABLE2_COLLAPSED', shouldHide ? 'true' : 'false');
};

window.toggleAttentionSectionCollapse = function(forceCollapse) {
  const body = document.getElementById('datamassAttentionPointsBody');
  const btn = document.getElementById('btnToggleAttentionSection');
  const subtitle = document.getElementById('datamassAttentionSubtitle');
  if (!body) return;
  const isCurrentlyHidden = (body.style.display === 'none');
  const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !isCurrentlyHidden;

  body.style.display = shouldHide ? 'none' : '';
  if (btn) {
    btn.textContent = shouldHide ? '🔽 Mở rộng' : '🔼 Thu gọn';
    btn.classList.toggle('is-collapsed', shouldHide);
  }
  if (subtitle) {
    subtitle.textContent = shouldHide
      ? '(Đang thu gọn — Bấm "Mở rộng" để xem các điểm chú ý & cảnh báo Model mới)'
      : 'Tự động cảnh báo thời gian phát hiện thay đổi kế hoạch từ Sheet Data_Mass & Phân loại Model Mới theo lịch sử sản xuất';
  }
  localStorage.setItem('AJAX_PROPLAN_ATTENTION_COLLAPSED', shouldHide ? 'true' : 'false');
};

window.toggleTable2FilterCollapse = function(forceCollapse) {
  const bar = document.getElementById('datamassTable2FilterBar');
  const compact = document.getElementById('datamassTable2FilterCompactSummary');
  const btnHeader = document.getElementById('btnToggleTable2Filter');
  if (!bar) return;
  const isCurrentlyHidden = (bar.style.display === 'none');
  const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !isCurrentlyHidden;

  bar.style.display = shouldHide ? 'none' : 'flex';
  if (compact) compact.style.display = shouldHide ? 'flex' : 'none';
  if (btnHeader) {
    btnHeader.textContent = shouldHide ? '🔽 Mở rộng bộ lọc' : '🔼 Thu gọn bộ lọc';
    btnHeader.classList.toggle('is-collapsed', shouldHide);
  }
  if (shouldHide && window.updateTable2CompactSummary) {
    window.updateTable2CompactSummary();
  }
  localStorage.setItem('AJAX_PROPLAN_TABLE2_FILTER_COLLAPSED', shouldHide ? 'true' : 'false');
};

window.updateTable2CompactSummary = function() {
  const container = document.getElementById('datamassTable2CompactBadges');
  if (!container) return;

  const viewMode = (window.AppStore && window.AppStore.table2ViewMode === 'DAILY') ? '📊 Chi tiết ngày' : '📈 Tổng lũy kế';
  const stageSelect = document.getElementById('datamassTableStageSelect');
  const stageVal = stageSelect ? stageSelect.value : 'ALL';
  const stageText = stageVal === 'ALL' ? 'Tất cả C/Đ' : stageVal;

  const modelSelect = document.getElementById('datamassModelSelect');
  const modelVal = modelSelect ? modelSelect.value : 'ALL';
  const modelText = modelVal === 'ALL' ? 'Tất cả Group' : modelVal;

  const planStatusSelect = document.getElementById('datamassPlanStatusSelect');
  const planStatusText = planStatusSelect ? (planStatusSelect.options[planStatusSelect.selectedIndex]?.text || '') : '';

  const countElem = document.getElementById('datamassModelItemCount');
  const countText = countElem ? countElem.innerText.trim() : '';

  container.innerHTML = `
    <span class="badge badge-purple" style="font-weight: 700;">👁️ ${viewMode}</span>
    <span class="badge badge-blue">🏭 ${stageText}</span>
    <span class="badge badge-cyan">🏷️ ${modelText}</span>
    ${planStatusText ? `<span class="badge badge-amber">📊 ${planStatusText}</span>` : ''}
    ${countText ? `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary);">${countText}</span>` : ''}
  `;
};

window.restoreSectionCollapseStates = function() {
  if (localStorage.getItem('AJAX_PROPLAN_MP_SECTION_COLLAPSED') === 'true') {
    window.toggleManpowerSectionCollapse(true);
  }
  if (localStorage.getItem('AJAX_PROPLAN_STAGE_SUMMARY_COLLAPSED') === 'true') {
    window.toggleStageSummarySectionCollapse(true);
  }
  if (localStorage.getItem('AJAX_PROPLAN_TABLE2_COLLAPSED') === 'true') {
    window.toggleTable2SectionCollapse(true);
  }
  if (localStorage.getItem('AJAX_PROPLAN_TABLE2_FILTER_COLLAPSED') === 'true') {
    window.toggleTable2FilterCollapse(true);
  }
  if (localStorage.getItem('AJAX_PROPLAN_ATTENTION_COLLAPSED') === 'true') {
    window.toggleAttentionSectionCollapse(true);
  }
};

window.updateFilterCompactSummary = function() {
  const summaryElem = document.getElementById('datamassFilterCompactSummary');
  if (!summaryElem || !window.AppStore) return;
  const from = window.AppStore.fromDate || '22/10/2026';
  const to = window.AppStore.toDate || '28/10/2026';
  const stage = window.AppStore.selectedStageFilter || 'HARDTEST_AND_ASSEMBLY';
  const stageText = stage === 'HARDTEST_AND_ASSEMBLY' ? '🚀 Tổng SFPD' : (stage === 'HARDTEST_TOTAL' ? '⭐ Total Hard Test' : (stage === 'ASSEMBLY' ? '🔧 ASSEMBLY' : stage));
  const shiftText = window.AppStore.currentShiftFilter === 'SPLIT' ? '🔄 Phân Tách 2 Ca' : (window.AppStore.currentShiftFilter === 'DAY' ? '☀️ Ca Ngày' : (window.AppStore.currentShiftFilter === 'NIGHT' ? '🌙 Ca Đêm' : '🌟 Cả 2 Ca'));

  summaryElem.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
      <span class="badge badge-blue">📅 ${from} → ${to}</span>
      <span class="badge badge-purple">${stageText}</span>
      <span class="badge badge-amber">${shiftText}</span>
    </div>
    <button type="button" class="btn-filter-toggle" onclick="toggleFilterCollapse()" style="background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); color: #60a5fa;">
      ✏️ Mở rộng bộ lọc
    </button>
  `;
};

window.dismissDayNightBanner = function() {
  const banner = document.getElementById('datamassDayNightBanner');
  if (banner) banner.style.display = 'none';
  localStorage.setItem('ajax_daynight_banner_dismissed', 'true');
};

function initMacBookAdaptiveSystem() {
  // 1. Sidebar initial state
  const sidebar = document.querySelector('.sidebar');
  const wrapper = document.querySelector('.content-wrapper');
  const icon = document.getElementById('sidebarToggleIcon');
  if (window.isSidebarCollapsed) {
    if (sidebar) sidebar.classList.add('collapsed');
    if (wrapper) wrapper.classList.add('sidebar-collapsed');
    if (icon) icon.textContent = '▶';
  }

  // 2. Compact mode
  if (window.isMacBookCompactMode) {
    document.body.classList.add('macbook-mode');
  }

  // 3. Filter collapsed state
  const filterCard = document.getElementById('datamassFilterCard');
  const btnFilter = document.getElementById('btnFilterToggle');
  if (filterCard && window.isFilterCollapsed) {
    filterCard.classList.add('is-collapsed');
    if (btnFilter) btnFilter.textContent = '🔽 Mở rộng bộ lọc';
  }
  window.updateFilterCompactSummary();

  // 4. Day/Night banner dismissed?
  if (localStorage.getItem('ajax_daynight_banner_dismissed') === 'true') {
    const banner = document.getElementById('datamassDayNightBanner');
    if (banner) banner.style.display = 'none';
  }

  // 5. Initial App Scale & Font Scale
  window.setAppScale(window.currentAppScale);
  window.setFontScale(window.currentFontScale);

  // 6. Window resize & orientationchange listener for responsive scaling
  const triggerAppAutoScaling = () => {
    if (window.currentAppScale === 'auto') {
      window.applyAutoAppScale();
    }
    if (window.currentFontScale === 'auto') {
      window.applyAutoFontScale();
    }
  };
  window.addEventListener('resize', triggerAppAutoScaling);
  window.addEventListener('orientationchange', () => {
    setTimeout(triggerAppAutoScaling, 150);
  });

  // 7. Add data-title to sidebar links for nice tooltips when collapsed
  document.querySelectorAll('.nav-link').forEach(link => {
    if (!link.getAttribute('data-title')) {
      const textElem = link.querySelector('.nav-label-main') || link.querySelector('span');
      if (textElem) {
        link.setAttribute('data-title', textElem.textContent.trim());
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Security Lock
  window.initSecurityLock();

  // Initialize Services
  window.SyncService.init();

  // Initial Render
  initNavigation();
  initTheme();
  renderAllViews();
  initMacBookAdaptiveSystem();
  if (typeof window.restoreSectionCollapseStates === 'function') {
    window.restoreSectionCollapseStates();
  }

  // Load live manpower json if available
  fetch('manpower_data.json')
    .then(r => r.ok ? r.json() : null)
    .then(mpJson => {
      if (mpJson && mpJson.A) {
        window.MANPOWER_MASTER_DATA = mpJson;
        if (window.AppStore && typeof window.AppStore.notify === 'function') {
          window.AppStore.notify();
        }
      }
    })
    .catch(() => {});

  // Subscribe Store to Re-render on changes
  window.AppStore.subscribe(() => {
    renderAllViews();
    if (typeof window.updateFilterCompactSummary === 'function') {
      window.updateFilterCompactSummary();
    }
  });

  // Cloud sync is triggered manually via 'Đồng Bộ Cloud' button

  // Khởi động đồng bộ kế hoạch sản xuất giữa các User ngay khi tải trang
  if (typeof window.initPlanSyncWatcher === 'function') {
    window.initPlanSyncWatcher();
  }
  if (typeof window.handleAutoCheckLatestCompletedPlanOnLoad === 'function') {
    window.handleAutoCheckLatestCompletedPlanOnLoad();
  }

  // Auto-scroll to section if requested via query param (e.g. ?scroll=attention)
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('scroll') === 'attention') {
      setTimeout(() => {
        const card = document.getElementById('datamassAttentionCard');
        const main = document.querySelector('.main-content');
        if (main && card) main.scrollTop = card.offsetTop - 30;
      }, 500);
    }
  } catch(e) {}
});

// Toast notification function
window.showToast = function(type, message) {
  const container = document.getElementById('toastBox');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast && typeof toast.remove === 'function') toast.remove();
    }, 300);
  }, 3500);
};

// Navigation Tab Switcher & Dev Section Handling
window.toggleDevModules = function(forceOpen) {
  const sublist = document.getElementById('devNavSublist');
  const arrow = document.getElementById('devNavArrow');
  if (!sublist) return;

  const isCurrentlyOpen = sublist.style.display !== 'none';
  const shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : !isCurrentlyOpen;

  sublist.style.display = shouldOpen ? 'flex' : 'none';
  if (arrow) {
    arrow.textContent = shouldOpen ? '▲' : '▼';
  }
  try {
    localStorage.setItem('AJAX_PROPLAN_DEV_NAV_OPEN', shouldOpen ? '1' : '0');
  } catch (e) {}
};

window.switchToTab = function(tabId) {
  const targetLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  if (targetLink) {
    if (targetLink.classList.contains('nav-link-dev')) {
      window.toggleDevModules(true);
    }
    targetLink.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

function updateHeaderViewTitle(tabKey, linkElem) {
  const titleElem = document.getElementById('viewTitle');
  if (!titleElem) return;

  if (tabKey === 'datamass') {
    titleElem.innerHTML = 'Kế Hoạch Tổng Thể (Data_Mass) <span class="badge-status-inuse">🟢 ĐANG SỬ DỤNG</span>';
  } else if (tabKey === 'capacity') {
    titleElem.innerHTML = 'Năng Lực &amp; Định Mức Sản Xuất (Capacity Planning) <span class="badge-status-inuse" style="background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.35);">⚡ CÔNG ĐOẠN ASSEMBLY</span>';
  } else if (tabKey === 'wip') {
    titleElem.innerHTML = 'Kiểm Soát Tồn Chuyền (WIP Control) <span class="badge-status-inuse" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);">📦 TOÀN BỘ CÔNG ĐOẠN</span>';
  } else if (tabKey === 'clips-all-plan') {
    titleElem.innerHTML = 'Tra Cứu Clips All Plan <span class="badge-status-inuse" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35);">🔗 CLIPS ALL</span>';
  } else if (tabKey === 'kpi-result') {
    titleElem.innerHTML = 'Báo Cáo KPI Kết Quả (KPI Result) <span class="badge-status-inuse" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35);">📊 8 CHỈ SỐ VẬN HÀNH</span>';
  } else if (tabKey === 'prod-history') {
    titleElem.innerHTML = 'Tra Cứu Lịch Sử Sản Xuất <span class="badge-status-inuse" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);">⚖️ SO SÁNH CÔNG ĐOẠN</span>';
  } else {
    const rawText = linkElem ? (linkElem.getAttribute('data-title') || linkElem.querySelector('span')?.textContent || 'Phân Hệ') : 'Phân Hệ';
    titleElem.innerHTML = `${rawText} <span class="badge-status-dev">🚧 Đang phát triển</span>`;
  }
}

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const tabs = document.querySelectorAll('.tab-content');

  // Restore Dev Nav state if previously open
  try {
    const savedDevNavOpen = localStorage.getItem('AJAX_PROPLAN_DEV_NAV_OPEN') === '1';
    if (savedDevNavOpen) {
      window.toggleDevModules(true);
    }
  } catch (e) {}

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.dataset.tab;

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabs.forEach(t => {
        if (t.id === `tab-${targetTab}`) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });

      if (targetTab === 'capacity' && window.renderCapacityView) {
        window.renderCapacityView('capacityContainer');
      } else if (targetTab === 'wip' && window.renderWipControlView) {
        window.renderWipControlView('wipContainer');
      } else if (targetTab === 'clips-all-plan' && window.renderClipsAllPlanView) {
        window.renderClipsAllPlanView('clipsAllPlanContainer');
      } else if (targetTab === 'kpi-result' && window.renderKpiResultView) {
        window.renderKpiResultView('kpiResultContainer');
      } else if (targetTab === 'prod-history' && window.renderProdHistoryView) {
        window.renderProdHistoryView('prodHistoryContainer');
      } else if (targetTab === 'settings' && typeof window.handleFetchUsersList === 'function') {
        window.handleFetchUsersList();
      }

      updateHeaderViewTitle(targetTab, link);
    });
  });

  // Activate tab based on URL hash if provided (defaulting to datamass)
  const initialHash = (window.location.hash || '').replace('#', '') || 'datamass';
  const matchingLink = document.querySelector(`.nav-link[data-tab="${initialHash}"]`);
  if (matchingLink) {
    if (matchingLink.classList.contains('nav-link-dev')) {
      window.toggleDevModules(true);
    }
    matchingLink.click();
  } else {
    const datamassLink = document.querySelector('.nav-link[data-tab="datamass"]');
    if (datamassLink) datamassLink.click();
  }
}

// Theme Switcher (Dark / Light)
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('AJAX_PROPLAN_THEME') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('AJAX_PROPLAN_THEME', next);
      updateThemeIcon(next);
      window.showToast('info', `Đã chuyển sang chế độ ${next === 'dark' ? 'Tối' : 'Sáng'}`);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  if (text) {
    text.textContent = theme === 'dark' ? 'Nền Sáng' : 'Nền Tối';
  }
}

// Render Master UI
function renderAllViews() {
  renderDashboard();
  renderDataMassView();
  renderAsTable();
  renderHtTable();
  renderMatrixTable();
  renderFttTable();
  renderLineScheduler();
  renderSettingsForm();
  if (window.updateAttendanceHistoryBadge) window.updateAttendanceHistoryBadge();
  if (document.getElementById('tab-wip')?.classList.contains('active') && window.renderWipControlView) {
    window.renderWipControlView('wipContainer');
  }
  if (document.getElementById('tab-clips-all-plan')?.classList.contains('active') && window.renderClipsAllPlanView) {
    window.renderClipsAllPlanView('clipsAllPlanContainer');
  }
  if (document.getElementById('tab-kpi-result')?.classList.contains('active') && window.renderKpiResultView) {
    window.renderKpiResultView('kpiResultContainer');
  }
  if (document.getElementById('tab-prod-history')?.classList.contains('active') && window.renderProdHistoryView) {
    window.renderProdHistoryView('prodHistoryContainer');
  }
}

// ==========================================
// 1. DASHBOARD & KPIS
// ==========================================
function renderDashboard() {
  const kpis = window.AppStore.getDashboardKPIs();

  const elPlan = document.getElementById('kpiPlanQty');
  const elFact = document.getElementById('kpiFactQty');
  const elGap = document.getElementById('kpiGapQty');
  const elRate = document.getElementById('kpiRate');
  const elHours = document.getElementById('kpiHoursActual');
  const elFtt = document.getElementById('kpiAvgFtt');

  if (elPlan) elPlan.textContent = kpis.totalPlanAs.toLocaleString('vi-VN');
  if (elFact) elFact.textContent = kpis.totalFactAs.toLocaleString('vi-VN');
  if (elGap) {
    elGap.textContent = kpis.totalGapAs.toLocaleString('vi-VN');
    elGap.style.color = kpis.totalGapAs < 0 ? 'var(--danger)' : 'var(--success)';
  }
  if (elRate) elRate.textContent = `${kpis.completionRate}%`;
  if (elHours) elHours.textContent = `${kpis.totalActualHours.toLocaleString('vi-VN')} h`;
  if (elFtt) elFtt.textContent = `${kpis.avgFtt}%`;

  // Render Line Capacity Bar Chart in Dashboard
  const lineContainer = document.getElementById('dashboardLineList');
  if (lineContainer) {
    const lines = Object.entries(kpis.lineLoadMap);
    lineContainer.innerHTML = lines.map(([lineId, info]) => {
      // Assuming 1 shift = 10.83h, max standard load per shift ~20h for 2 shifts
      const pct = Math.min(150, Math.round((info.hours / 21.66) * 100));
      const colorClass = pct > 100 ? 'badge-red' : pct > 75 ? 'badge-amber' : 'badge-green';

      return `
        <div style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: var(--radius-md); margin-bottom: 0.6rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.85rem;">
            <strong style="color: var(--text-primary);">${info.name}</strong>
            <span class="badge ${colorClass}">${info.hours.toFixed(1)} h (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, pct)}%; background: ${pct > 100 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--success)'}; border-radius: var(--radius-full);"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ==========================================
// 2. ASSEMBLY PLANNING TABLE (As Form)
// ==========================================
function renderAsTable() {
  const tbody = document.getElementById('asTableBody');
  if (!tbody) return;

  const data = window.AppStore.asPlan;
  const lines = window.MatrixService ? window.MatrixService.getLines() : [];
  const search = (document.getElementById('asSearchInput')?.value || '').toLowerCase();
  const filterLine = document.getElementById('asLineFilter')?.value || 'ALL';

  const filtered = data.filter(item => {
    const matchSearch = item.modelName.toLowerCase().includes(search) ||
                        item.normingGroup.toLowerCase().includes(search) ||
                        item.productName1C.toLowerCase().includes(search);
    const matchLine = filterLine === 'ALL' || item.assignedLine === filterLine;
    return matchSearch && matchLine;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem; color: var(--text-muted);">Không tìm thấy dữ liệu phù hợp</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    // Generate dropdown options for lines
    const lineOptions = lines.map(l => {
      const prod = window.MatrixService.getProductivity(item.normingGroup, l.id);
      const prodText = prod !== null ? `(${prod}%)` : '(x)';
      return `<option value="${l.id}" ${item.assignedLine === l.id ? 'selected' : ''}>${l.id} ${prodText}</option>`;
    }).join('');

    const prodColor = item.productivity >= 100 ? 'badge-green' : item.productivity >= 80 ? 'badge-blue' : item.productivity >= 60 ? 'badge-amber' : item.productivity > 0 ? 'badge-red' : 'badge-amber';

    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">${item.normingGroup}</div>
          <div style="font-size: 0.725rem; color: var(--text-muted);">${item.modelName}</div>
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 600;">${item.planQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right; font-weight: 600;">${item.factQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono gap-negative" style="text-align: right;">${item.gapQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: center;">${item.ctNorm}s</td>
        <td class="font-mono" style="text-align: right;">${item.hoursPlan.toFixed(2)}h</td>
        <td>
          <select class="line-select-cell" onchange="handleLineChange('${item.id}', this.value)">
            <option value="">-- Chưa gán --</option>
            ${lineOptions}
          </select>
        </td>
        <td style="text-align: center;">
          <span class="badge ${prodColor}">${item.productivity > 0 ? item.productivity + '%' : '--'}</span>
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">
          ${item.hoursActual.toFixed(2)}h
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="handleAutoAssignSingle('${item.id}')" title="Tự động chọn Line năng suất cao nhất">
            ⚡ Gợi ý Line
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.handleLineChange = function(id, newLine) {
  window.AppStore.updateAsItemLine(id, newLine);
  window.showToast('info', `Đã cập nhật Line ${newLine || 'Trống'} và tính lại số giờ!`);
};

window.handleAutoAssignSingle = function(id) {
  const item = window.AppStore.asPlan.find(i => i.id === id);
  if (!item) return;

  const best = window.MatrixService.getBestLine(item.normingGroup);
  if (best && best.line) {
    window.AppStore.updateAsItemLine(id, best.line);
    window.showToast('success', `Đã tự động gán Line ${best.line} với năng suất cao nhất ${best.productivity}%!`);
  } else {
    window.showToast('warning', `Chưa có Line tối ưu cho dòng sản phẩm này`);
  }
};

window.handleAutoAssignAll = function() {
  if (window.UserAuth && !window.UserAuth.canEdit()) {
    if (window.showToast) window.showToast('warning', '⚠️ Tài khoản ở chế độ Chỉ xem (Viewer). Bạn không có quyền chạy Tự động gán Line!');
    return;
  }
  const count = window.AppStore.autoAssignAllBestLines();
  window.showToast('success', `Đã tự động tối ưu hóa phân bổ cho toàn bộ ${count} đơn hàng!`);
};

// ==========================================
// 3. HOAN THIEN & TESTING (HT Form)
// ==========================================
function renderHtTable() {
  const tbody = document.getElementById('htTableBody');
  if (!tbody) return;

  const data = window.AppStore.htPlan;
  const search = (document.getElementById('htSearchInput')?.value || '').toLowerCase();

  const filtered = data.filter(item => {
    return item.modelName.toLowerCase().includes(search) ||
           item.board.toLowerCase().includes(search) ||
           item.productName1C.toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">Không tìm thấy dữ liệu phù hợp</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">${item.board}</div>
          <div style="font-size: 0.725rem; color: var(--text-muted);">${item.modelName}</div>
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 600;">${item.planQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right; font-weight: 600;">${item.factQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono gap-negative" style="text-align: right;">${item.gapQty.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: center;">${item.ctNorm}s</td>
        <td class="font-mono" style="text-align: right;">${item.hoursActual.toFixed(1)}h</td>
        <td style="text-align: center;">
          <span class="badge badge-purple">${item.testBlocks} TB</span>
        </td>
        <td class="font-mono" style="text-align: right; color: var(--success); font-weight: 600;">
          ${item.targetOutputDay.toLocaleString('vi-VN')}
        </td>
        <td class="font-mono" style="text-align: right; color: #60a5fa; font-weight: 600;">
          ${item.targetOutputNight.toLocaleString('vi-VN')}
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 4. PRODUCTIVITY MATRIX VIEW
// ==========================================
function renderMatrixTable() {
  const container = document.getElementById('matrixTableContainer');
  if (!container) return;

  const lines = window.MatrixService.getLines();
  const matrix = window.MatrixService.getMatrix();
  const models = Object.keys(matrix);

  const headerHtml = `
    <tr>
      <th style="position: sticky; left: 0; background: var(--bg-card); z-index: 10;">Model Group</th>
      ${lines.map(l => `<th style="text-align: center;">${l.name}</th>`).join('')}
    </tr>
  `;

  const rowsHtml = models.map(model => {
    const lineMap = matrix[model] || {};
    return `
      <tr>
        <td style="position: sticky; left: 0; background: var(--bg-card); z-index: 5; font-weight: 700;">${model}</td>
        ${lines.map(l => {
          const val = lineMap[l.id];
          if (val === undefined || val === null) {
            return `<td class="matrix-cell matrix-empty">--</td>`;
          }
          const cls = val >= 100 ? 'matrix-100' : val >= 80 ? 'matrix-85' : val >= 60 ? 'matrix-med' : 'matrix-low';
          return `<td class="matrix-cell ${cls}">${val}%</td>`;
        }).join('')}
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead>${headerHtml}</thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

// ==========================================
// 5. QUALITY & FTT REPORT
// ==========================================
function renderFttTable() {
  const tbody = document.getElementById('fttTableBody');
  if (!tbody) return;

  const data = window.AppStore.fttStats;
  tbody.innerHTML = data.map((item, idx) => {
    const fttNum = parseFloat(item.fttPct.replace('%', '')) || 0;
    const retestNum = parseFloat(item.retestPct.replace('%', '')) || 0;

    const fttClass = fttNum >= 95 ? 'badge-green' : fttNum >= 85 ? 'badge-blue' : 'badge-red';
    const retestClass = retestNum > 20 ? 'badge-red' : retestNum > 10 ? 'badge-amber' : 'badge-green';

    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
        <td style="font-weight: 700;">${item.productName}</td>
        <td class="font-mono" style="text-align: right;">${item.allDevices.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right;">${item.ftt.toLocaleString('vi-VN')}</td>
        <td style="text-align: center;"><span class="badge ${fttClass}">${item.fttPct}</span></td>
        <td class="font-mono" style="text-align: right;">${item.allTest.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right; color: var(--success);">${item.finOK.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right; color: var(--danger);">${item.finNOK.toLocaleString('vi-VN')}</td>
        <td class="font-mono" style="text-align: right;">${item.retest.toLocaleString('vi-VN')}</td>
        <td style="text-align: center;"><span class="badge ${retestClass}">${item.retestPct}</span></td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 6. INTERACTIVE LINE SCHEDULER
// ==========================================
function renderLineScheduler() {
  const container = document.getElementById('schedulerContainer');
  if (!container) return;

  const lines = window.MatrixService.getLines();
  const asPlan = window.AppStore.asPlan;

  container.innerHTML = lines.map(line => {
    const assignedItems = asPlan.filter(i => i.assignedLine === line.id);
    const totalHours = assignedItems.reduce((s, i) => s + i.hoursActual, 0);
    const maxCapacityHours = 21.66; // 2 shifts
    const loadPct = Math.round((totalHours / maxCapacityHours) * 100);
    const badgeColor = loadPct > 100 ? 'badge-red' : loadPct >= 70 ? 'badge-green' : 'badge-blue';

    return `
      <div class="card" style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 800; display: inline-block; margin-right: 0.6rem;">${line.name}</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Quản lý: <strong>${line.leader}</strong> ${line.startDate ? '• Bắt đầu: ' + line.startDate : ''}</span>
          </div>
          <span class="badge ${badgeColor}">${totalHours.toFixed(1)}h / 21.66h (${loadPct}% tải)</span>
        </div>

        <div style="width: 100%; height: 6px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 1rem;">
          <div style="height: 100%; width: ${Math.min(100, loadPct)}%; background: ${loadPct > 100 ? 'var(--danger)' : loadPct > 70 ? 'var(--success)' : 'var(--primary)'}; border-radius: var(--radius-full);"></div>
        </div>

        ${assignedItems.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${assignedItems.map(item => `
              <div style="padding: 0.4rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); font-size: 0.775rem;">
                <strong>${item.normingGroup}</strong>
                <span style="color: #60a5fa; margin-left: 0.4rem;">${item.hoursActual.toFixed(1)}h</span>
                <span style="color: var(--text-muted); font-size: 0.7rem; margin-left: 0.2rem;">(Gap: ${Math.abs(item.gapQty)})</span>
              </div>
            `).join('')}
          </div>
        ` : `<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Chưa có đơn hàng nào gán vào chuyền này</div>`}
      </div>
    `;
  }).join('');
}

// ==========================================
// 7. SETTINGS & CLOUD CONFIG
// ==========================================
function renderSettingsForm() {
  const cfg = window.SyncService.config;
  const inputSheet = document.getElementById('cfgSheetId');
  const inputAsGid = document.getElementById('cfgAsGid');
  const inputHtGid = document.getElementById('cfgHtGid');
  const inputFttGid = document.getElementById('cfgFttGid');
  const inputDataMassGid = document.getElementById('cfgDataMassGid');
  const inputInterval = document.getElementById('cfgSyncInterval');

  if (inputSheet) inputSheet.value = cfg.sheetId || '';
  if (inputAsGid) inputAsGid.value = cfg.asGid || '';
  if (inputHtGid) inputHtGid.value = cfg.htGid || '';
  if (inputFttGid) inputFttGid.value = cfg.fttGid || '';
  if (inputDataMassGid) inputDataMassGid.value = cfg.dataMassGid || '';
  if (inputInterval) inputInterval.value = cfg.autoSyncMinutes || 5;
}

window.handleSaveSettings = function(e) {
  if (e) e.preventDefault();
  const newConfig = {
    sheetId: document.getElementById('cfgSheetId')?.value.trim(),
    asGid: document.getElementById('cfgAsGid')?.value.trim(),
    htGid: document.getElementById('cfgHtGid')?.value.trim(),
    fttGid: document.getElementById('cfgFttGid')?.value.trim(),
    dataMassGid: document.getElementById('cfgDataMassGid')?.value.trim(),
    autoSyncMinutes: parseInt(document.getElementById('cfgSyncInterval')?.value) || 5
  };
  window.SyncService.saveConfig(newConfig);
  window.showToast('success', 'Đã lưu cấu hình kết nối Google Sheets!');
  window.SyncService.fetchLiveData();
};

// Handled by window.handleResetDefaultData in datamass view handler below

// Export to CSV
window.handleExportCSV = function() {
  const data = window.AppStore.asPlan;
  let csv = 'norming group,model name,plan qty,fact qty,gap qty,ct norm,hours plan,assigned line,productivity,hours actual\n';
  data.forEach(i => {
    csv += `"${i.normingGroup}","${i.modelName}",${i.planQty},${i.factQty},${i.gapQty},${i.ctNorm},${i.hoursPlan},"${i.assignedLine}","${i.productivity}%",${i.hoursActual}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ke_Hoach_San_Xuat_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast('success', 'Đã tải xuống file kế hoạch CSV!');
};

// ==========================================
// 8. MASTER PRODUCTION SCHEDULE (Data_Mass)
// ==========================================

function getDayOfWeekName(dateStr) {
  const d = window.AppStore.parseDate(dateStr);
  const day = d.getDay();
  const map = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return map[day] || '';
}

/**
 * Tính kíp làm việc (Shift A/B/C/D) theo quy chuẩn nhà máy:
 * - 4 shift: A, B, C, D (2 shift làm việc / 2 shift nghỉ)
 * - Chu kỳ xoay ca: 3 ngày đổi kíp, sau đó đổi ca Ngày <-> Đêm
 * Mốc chuẩn:
 * - 18/10 -> 20/10/2026: Ca Ngày: Shift A | Ca Đêm: Shift B | Nghỉ: Shift C, D
 * - 21/10 -> 23/10/2026: Ca Ngày: Shift C | Ca Đêm: Shift D | Nghỉ: Shift A, B
 * - 24/10 -> 26/10/2026: Ca Ngày: Shift B | Ca Đêm: Shift A | Nghỉ: Shift C, D (hoán đổi ngày/đêm)
 * - 27/10 -> 29/10/2026: Ca Ngày: Shift D | Ca Đêm: Shift C | Nghỉ: Shift A, B (hoán đổi ngày/đêm)
 */
window.getShiftRotation = function(dateStr) {
  if (!dateStr) return { day: 'A', night: 'B', off: ['C', 'D'], label: 'Kíp A / Kíp B' };
  const d = window.AppStore ? window.AppStore.parseDate(dateStr) : new Date(dateStr);
  const baseDate = new Date(2026, 9, 18, 0, 0, 0, 0); // 18/10/2026 (Tháng 10 là 9)
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  
  const diffDays = Math.round((targetDate.getTime() - baseDate.getTime()) / (86400 * 1000));
  let blockIdx = Math.floor(diffDays / 3) % 4;
  if (blockIdx < 0) blockIdx += 4;
  
  const blocks = [
    { day: 'A', night: 'B', off: ['C', 'D'], label: 'Kíp A / Kíp B' }, // 18 - 20/10
    { day: 'C', night: 'D', off: ['A', 'B'], label: 'Kíp C / Kíp D' }, // 21 - 23/10
    { day: 'B', night: 'A', off: ['C', 'D'], label: 'Kíp B / Kíp A' }, // 24 - 26/10
    { day: 'D', night: 'C', off: ['A', 'B'], label: 'Kíp D / Kíp C' }, // 27 - 29/10
  ];
  
  return blocks[blockIdx];
};

function renderDataMassView() {
  const container = document.getElementById('datamassTableContainer');
  const stageSummaryContainer = document.getElementById('datamassStageSummaryContainer');
  if (!container && !stageSummaryContainer) return;

  const stages = window.AppStore.getDataMassStages();

  // 1. Populate & Sync Stage Dropdown & Multi-Select Trigger
  const stageSelect = document.getElementById('datamassStageSelect');
  const curStage = window.AppStore.selectedStageFilter || 'HARDTEST_TOTAL';
  if (stageSelect) {
    const HARDTEST_SUB = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
    const ORDERED_PRIMARY = ['HARDTEST_TOTAL', 'ASSEMBLY', 'HARDTEST_AND_ASSEMBLY', 'FPD_TOTAL', 'MASTERBOX_TOTAL', 'LONG TEST', 'TEST ROOM', 'QC', 'PKG', 'COM PKG', 'COM PKG AUTO', 'MB', 'ALL'];
    const otherStages = stages.filter(st => !HARDTEST_SUB.includes(st) && !ORDERED_PRIMARY.includes(st) && st !== 'SUM HARDTEST');

    if (!stageSelect.querySelector('option[value="FPD_TOTAL"]')) {
      let html = `
        <optgroup label="── CÁC CỤM TỔNG HỢP ──">
          <option value="HARDTEST_TOTAL" ${curStage === 'HARDTEST_TOTAL' ? 'selected' : ''}>⭐ Total Hard Test</option>
          <option value="ASSEMBLY" ${curStage === 'ASSEMBLY' ? 'selected' : ''}>🔧 ASSEMBLY</option>
          <option value="HARDTEST_AND_ASSEMBLY" ${curStage === 'HARDTEST_AND_ASSEMBLY' ? 'selected' : ''}>🚀 Tổng SFPD</option>
          <option value="FPD_TOTAL" ${curStage === 'FPD_TOTAL' ? 'selected' : ''}>📦 Tổng FPD (4 Công Đoạn)</option>
          <option value="MASTERBOX_TOTAL" ${curStage === 'MASTERBOX_TOTAL' ? 'selected' : ''}>💻 Tổng MasterBox (3 Công Đoạn)</option>
          <option value="ALL" ${curStage === 'ALL' ? 'selected' : ''}>🏭 Tất cả công đoạn (Toàn Nhà Máy - ALL)</option>
        </optgroup>
        <optgroup label="── CÁC CÔNG ĐOẠN SẢN XUẤT (THEO TIẾN ĐỘ) ──">
          <option value="ASSEMBLY" ${curStage === 'ASSEMBLY' ? 'selected' : ''}>🔧 ASSEMBLY</option>
          <option value="HARD TEST" ${curStage === 'HARD TEST' ? 'selected' : ''}>🔬 HARD TEST</option>
          <option value="OPTICS ASM" ${curStage === 'OPTICS ASM' ? 'selected' : ''}>🔭 OPTICS ASM</option>
          <option value="A IMP ASM" ${curStage === 'A IMP ASM' ? 'selected' : ''}>⚙️ A IMP ASM</option>
          <option value="FOCUS" ${curStage === 'FOCUS' ? 'selected' : ''}>🎯 FOCUS</option>
          <option value="LONG TEST" ${curStage === 'LONG TEST' ? 'selected' : ''}>⏱️ LONG TEST</option>
          <option value="TEST ROOM" ${curStage === 'TEST ROOM' ? 'selected' : ''}>🌡️ TEST ROOM</option>
          <option value="QC" ${curStage === 'QC' ? 'selected' : ''}>🔍 QC</option>
          <option value="PKG" ${curStage === 'PKG' ? 'selected' : ''}>📦 PKG</option>
          <option value="COM PKG" ${curStage === 'COM PKG' ? 'selected' : ''}>📦 COM PKG</option>
          <option value="COM PKG AUTO" ${curStage === 'COM PKG AUTO' ? 'selected' : ''}>🤖 COM PKG AUTO</option>
          <option value="MB" ${curStage === 'MB' ? 'selected' : ''}>💻 MB</option>
        </optgroup>
      `;
      if (otherStages.length > 0) {
        html += `<optgroup label="── Các Công Đoạn Khác Trong Nhà Máy ──">`;
        otherStages.forEach(st => {
          html += `<option value="${st}" ${curStage === st ? 'selected' : ''}>${st}</option>`;
        });
        html += `</optgroup>`;
      }
      stageSelect.innerHTML = html;
    }
    if (typeof curStage === 'string') stageSelect.value = curStage;
  }

  // Sync Multi-Select Dropdown Trigger Label & Badge
  const selectedStage = curStage;
  const triggerLabel = document.getElementById('stageMultiSelectLabel');
  if (triggerLabel) {
    let labelHtml = '';
    if (selectedStage === 'HARDTEST_TOTAL' || selectedStage === 'SUM HARDTEST') {
      labelHtml = `<span>⭐ Total Hard Test</span>`;
    } else if (selectedStage === 'ASSEMBLY') {
      labelHtml = `<span>🔧 ASSEMBLY</span>`;
    } else if (selectedStage === 'HARDTEST_AND_ASSEMBLY') {
      labelHtml = `<span>🚀 Tổng SFPD</span>`;
    } else if (selectedStage === 'FPD_TOTAL' || selectedStage === 'SUM_FPD') {
      labelHtml = `<span>📦 Tổng FPD</span>`;
    } else if (selectedStage === 'MASTERBOX_TOTAL' || selectedStage === 'SUM_MB') {
      labelHtml = `<span>💻 Tổng MasterBox</span>`;
    } else if (selectedStage === 'ALL') {
      labelHtml = `<span>🏭 Toàn Bộ Nhà Máy</span>`;
    } else if (Array.isArray(selectedStage)) {
      if (selectedStage.length === 1) {
        labelHtml = `<span>🎯 ${selectedStage[0]}</span>`;
      } else {
        labelHtml = `<span>🎯 Đã chọn ${selectedStage.length} c/đ</span> <span class="badge badge-purple" style="font-size: 0.65rem; padding: 1px 5px; margin-left: 2px;">${selectedStage.length}</span>`;
      }
    } else {
      const icon = selectedStage === 'LONG TEST' ? '⏱️ '
        : selectedStage === 'TEST ROOM' ? '🌡️ '
        : selectedStage === 'QC' ? '🔍 '
        : selectedStage === 'PKG' || selectedStage === 'COM PKG' ? '📦 '
        : selectedStage === 'COM PKG AUTO' ? '🤖 '
        : selectedStage === 'MB' ? '💻 ' : '🔬 ';
      labelHtml = `<span>${icon}${selectedStage}</span>`;
    }
    triggerLabel.innerHTML = labelHtml;
  }

  // Sync Quick Stage Pill Buttons
  const activePillSet = (window.AppStore && window.AppStore.resolveActiveStageSet)
    ? window.AppStore.resolveActiveStageSet(selectedStage)
    : new Set([selectedStage]);

  document.querySelectorAll('#stageQuickPillsGroup .btn-quick-stage').forEach(btn => {
    const stKey = btn.dataset.stage;
    let isActive = false;
    if (selectedStage === stKey) {
      isActive = true;
    } else if (Array.isArray(selectedStage) && selectedStage.includes(stKey)) {
      isActive = true;
    } else if (stKey === 'ALL' && activePillSet.has('ALL')) {
      isActive = true;
    } else if (stKey === 'HARDTEST_TOTAL' && (selectedStage === 'HARDTEST_TOTAL' || selectedStage === 'SUM HARDTEST')) {
      isActive = true;
    } else if (stKey === 'FPD_TOTAL' && (selectedStage === 'FPD_TOTAL' || selectedStage === 'SUM_FPD')) {
      isActive = true;
    } else if (stKey === 'MASTERBOX_TOTAL' && (selectedStage === 'MASTERBOX_TOTAL' || selectedStage === 'SUM_MB')) {
      isActive = true;
    } else if (activePillSet.has(stKey) && !['HARDTEST_TOTAL', 'HARDTEST_AND_ASSEMBLY', 'FPD_TOTAL', 'MASTERBOX_TOTAL', 'ALL'].includes(selectedStage)) {
      isActive = true;
    }

    if (isActive) {
      btn.classList.add('active');
      if (window.innerWidth <= 768 && btn.offsetParent !== null) {
        try {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch(e) {}
      }
    } else {
      btn.classList.remove('active');
    }
  });

  // Sync Checklist in multi-select dropdown if open
  if (typeof window.renderStageCheckboxList === 'function') {
    const menuEl = document.getElementById('stageMultiSelectMenu');
    if (menuEl && menuEl.classList.contains('open')) {
      window.renderStageCheckboxList();
    }
  }

  // 2. Populate & Sync Table 2 Cascading Filters (Công Đoạn -> Group Model -> Model 1C)
  // 2a. Table Stage Filter
  const tableStageSelect = document.getElementById('datamassTableStageSelect');
  const availableTableStages = window.AppStore.getTableStages(selectedStage);
  const curTableStage = window.AppStore.selectedTableStageFilter || 'ALL';
  if (tableStageSelect) {
    const stageOpts = [`<option value="ALL">Tất cả Công Đoạn (${availableTableStages.length})</option>`].concat(
      availableTableStages.map(st => `<option value="${st}" ${st === curTableStage ? 'selected' : ''}>${st}</option>`)
    );
    tableStageSelect.innerHTML = stageOpts.join('');
    if (curTableStage !== 'ALL' && !availableTableStages.includes(curTableStage)) {
      window.AppStore.selectedTableStageFilter = 'ALL';
      tableStageSelect.value = 'ALL';
    } else {
      tableStageSelect.value = curTableStage;
    }
  }

  // Effective stage for Table 2 items
  const effectiveStageForTable = (window.AppStore.selectedTableStageFilter && window.AppStore.selectedTableStageFilter !== 'ALL')
    ? window.AppStore.selectedTableStageFilter
    : selectedStage;

  // 2b. Group Model Filter
  const modelSelect = document.getElementById('datamassModelSelect');
  const distinctModels = window.AppStore.getDistinctModels(effectiveStageForTable);
  const curModel = window.AppStore.selectedModelFilter || 'ALL';
  if (modelSelect) {
    const modelOpts = [`<option value="ALL">Tất cả Group Model (${distinctModels.length})</option>`].concat(
      distinctModels.map(m => `<option value="${m}" ${m === curModel ? 'selected' : ''}>${m}</option>`)
    );
    modelSelect.innerHTML = modelOpts.join('');
    if (curModel !== 'ALL' && !distinctModels.includes(curModel)) {
      window.AppStore.selectedModelFilter = 'ALL';
      modelSelect.value = 'ALL';
    } else {
      modelSelect.value = curModel;
    }
  }

  // 2c. Model (Mã 1C) Filter
  const effectiveModel = window.AppStore.selectedModelFilter || 'ALL';
  const product1CSelect = document.getElementById('datamassProduct1CSelect');
  const distinct1C = window.AppStore.getDistinctProducts1C(effectiveStageForTable, effectiveModel);
  const curProduct1C = window.AppStore.selectedProduct1CFilter || 'ALL';
  if (product1CSelect) {
    const p1cOpts = [`<option value="ALL">Tất cả Model (${distinct1C.length} mã 1C)</option>`].concat(
      distinct1C.map(p => `<option value="${p}" ${p === curProduct1C ? 'selected' : ''} title="${p}">${p}</option>`)
    );
    product1CSelect.innerHTML = p1cOpts.join('');
    if (curProduct1C !== 'ALL' && !distinct1C.includes(curProduct1C)) {
      window.AppStore.selectedProduct1CFilter = 'ALL';
      product1CSelect.value = 'ALL';
    } else {
      product1CSelect.value = curProduct1C;
    }
  }

  // 3. Sync Plan Status Dropdown
  const planStatusSelect = document.getElementById('datamassPlanStatusSelect');
  if (planStatusSelect) {
    planStatusSelect.value = window.AppStore.selectedPlanStatusFilter || 'GAP_NEGATIVE';
  }

  // 4. Sync Input Dates & Selects
  const inputFrom = document.getElementById('datamassFromDate');
  const inputTo = document.getElementById('datamassToDate');
  if (inputFrom && window.AppStore.fromDate && inputFrom.value !== window.AppStore.fromDate) {
    inputFrom.value = window.AppStore.fromDate;
  }
  if (inputTo && window.AppStore.toDate && inputTo.value !== window.AppStore.toDate) {
    inputTo.value = window.AppStore.toDate;
  }

  const curFrom = inputFrom ? inputFrom.value : window.AppStore.fromDate;
  const curTo = inputTo ? inputTo.value : window.AppStore.toDate;
  const curDateKey = `${curFrom}|${curTo}`;

  const weekSelect = document.getElementById('datamassWeekSelect');
  if (weekSelect) {
    let weekMatched = false;
    for (let i = 0; i < weekSelect.options.length; i++) {
      if (weekSelect.options[i].value === curDateKey) {
        weekSelect.selectedIndex = i;
        weekMatched = true;
        break;
      }
    }
    if (!weekMatched) weekSelect.value = '';
  }

  const monthSelect = document.getElementById('datamassMonthSelect');
  if (monthSelect) {
    let monthMatched = false;
    for (let i = 0; i < monthSelect.options.length; i++) {
      if (monthSelect.options[i].value === curDateKey) {
        monthSelect.selectedIndex = i;
        monthMatched = true;
        break;
      }
    }
    if (!monthMatched) monthSelect.value = '';
  }

  if (window.updateDateInputsWeekdayTag) window.updateDateInputsWeekdayTag();

  const _defW = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
  const fromDate = inputFrom ? inputFrom.value : (window.AppStore.fromDate || (_defW ? _defW.fromDate : '2026-11-05'));
  const toDate = inputTo ? inputTo.value : (window.AppStore.toDate || (_defW ? _defW.toDate : '2026-11-05'));
  const shiftFilter = window.AppStore.currentShiftFilter || 'ALL';
  const tableStageFilter = window.AppStore.selectedTableStageFilter || 'ALL';
  const modelFilter = window.AppStore.selectedModelFilter || 'ALL';
  const product1CFilter = window.AppStore.selectedProduct1CFilter || 'ALL';
  const planStatusFilter = window.AppStore.selectedPlanStatusFilter || 'GAP_NEGATIVE';
  const search1C = (document.getElementById('datamassSearchInput')?.value || '').trim();
  const viewMode = window.AppStore.dataMassViewMode || 'PLAN_FACT';

  // Sync View Mode Buttons
  document.querySelectorAll('.btn-group .btn-mode[data-mode]').forEach(btn => {
    if (btn.dataset.mode === viewMode) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Handle SFPD dedicated container
  const sfpdContainer = document.getElementById('datamassSfpdContainer');
  if (sfpdContainer) {
    if (viewMode === 'SFPD') {
      sfpdContainer.style.display = 'block';
      renderSfpdReportView();
    } else {
      sfpdContainer.style.display = 'none';
    }
  }

  // Sync Shift Filter Button Active State
  document.querySelectorAll('#shiftFilterGroup .btn-mode').forEach(btn => {
    if (btn.dataset.shift === shiftFilter) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Query Master Schedule with Stage, Table Stage, Model, Product 1C, and Plan Status Filters
  const schedule = window.AppStore.getDetailedSchedule({
    fromDate,
    toDate,
    shiftFilter,
    stageFilter: selectedStage,
    tableStageFilter,
    modelFilter,
    product1CFilter,
    planStatusFilter,
    search1C,
  });

  window.__LATEST_SCHEDULE_ITEMS__ = schedule.items;
  if (window.AppStore) window.AppStore.latestScheduleItems = schedule.items;

  const selCount = schedule.kpis.selectedDaysCount;
  const totCount = schedule.kpis.totalDaysCount;
  const isSplit = shiftFilter === 'SPLIT';
  const shiftTitle = shiftFilter === 'DAY' ? 'Ca Ngày (Day)' : shiftFilter === 'NIGHT' ? 'Ca Đêm (Night)' : shiftFilter === 'SPLIT' ? 'Phân Tách 2 Ca' : 'Cả 2 Ca (Day + Night)';

  // Render Day Selection Toolbar (Đã ẩn theo yêu cầu người dùng)
  const daySelectorToolbar = document.getElementById('datamassDaySelectorToolbar');
  if (daySelectorToolbar) {
    daySelectorToolbar.innerHTML = '';
    daySelectorToolbar.style.display = 'none';
  }

  // Determine stage list to render for Production (Table 2)
  const listToRender = [];
  const isHardtest = selectedStage === 'HARDTEST_TOTAL' || selectedStage === 'SUM HARDTEST';
  const isBoth = selectedStage === 'HARDTEST_AND_ASSEMBLY';
  const isFpd = selectedStage === 'FPD_TOTAL' || selectedStage === 'SUM_FPD';
  const isMb = selectedStage === 'MASTERBOX_TOTAL' || selectedStage === 'SUM_MB';
  const isMultiStage = Array.isArray(selectedStage) || (typeof selectedStage === 'string' && selectedStage.includes(','));

  if (isBoth || isHardtest || isFpd || isMb || selectedStage === 'ALL' || isMultiStage || (schedule.stageSummaries && schedule.stageSummaries.length > 1)) {
    if (schedule.stageTotalSummary) listToRender.push(schedule.stageTotalSummary);
    if (schedule.stageSummaries && schedule.stageSummaries.length > 0) {
      schedule.stageSummaries.filter(s => s.stage !== 'ALL').forEach(s => listToRender.push(s));
    }
  } else {
    const single = (schedule.stageSummaries || []).find(s => s.stage === selectedStage && s.stage !== 'ALL') || (schedule.stageSummaries ? schedule.stageSummaries.find(s => s.stage !== 'ALL') : null);
    if (single) listToRender.push(single);
  }

  // Danh sách công đoạn cho Khối 1: TÌNH TRẠNG NHÂN LỰC
  const mpListToRender = [];
  if (isBoth) {
    if (schedule.stageTotalSummary) mpListToRender.push(schedule.stageTotalSummary);
    const assy = (schedule.stageSummaries || []).find(s => s.stage === 'ASSEMBLY');
    if (assy) mpListToRender.push(assy);
    if (schedule.hardtestGroupSummary) {
      mpListToRender.push(schedule.hardtestGroupSummary);
    } else {
      const ht = (schedule.stageSummaries || []).find(s => s.stage === 'HARD TEST' || s.stage === 'SUM HARDTEST');
      if (ht) mpListToRender.push(ht);
    }
  } else if (isHardtest) {
    if (schedule.stageTotalSummary) {
      mpListToRender.push(schedule.stageTotalSummary);
    } else if (schedule.hardtestGroupSummary) {
      mpListToRender.push(schedule.hardtestGroupSummary);
    }
  } else if (isFpd) {
    if (schedule.stageTotalSummary) mpListToRender.push(schedule.stageTotalSummary);
    const FPD_ORDER = ['LONG TEST', 'TEST ROOM', 'QC', 'PKG'];
    FPD_ORDER.forEach(st => {
      const found = (schedule.stageSummaries || []).find(s => s.stage === st);
      if (found) mpListToRender.push(found);
    });
  } else if (isMb) {
    if (schedule.stageTotalSummary) mpListToRender.push(schedule.stageTotalSummary);
    const MB_ORDER = ['COM PKG', 'COM PKG AUTO', 'MB'];
    MB_ORDER.forEach(st => {
      const found = (schedule.stageSummaries || []).find(s => s.stage === st);
      if (found) mpListToRender.push(found);
    });
  } else if (selectedStage === 'ALL') {
    if (schedule.stageTotalSummary) mpListToRender.push(schedule.stageTotalSummary);
    const PRIMARY_ORDER = ['ASSEMBLY', 'HARD TEST', 'LONG TEST', 'TEST ROOM', 'QC', 'PKG', 'COM PKG', 'COM PKG AUTO', 'MB'];
    PRIMARY_ORDER.forEach(st => {
      if (st === 'HARD TEST' && schedule.hardtestGroupSummary) {
        mpListToRender.push(schedule.hardtestGroupSummary);
      } else {
        const found = (schedule.stageSummaries || []).find(s => s.stage === st);
        if (found) mpListToRender.push(found);
      }
    });
  } else if (schedule.stageSummaries && schedule.stageSummaries.length > 1) {
    if (schedule.stageTotalSummary) mpListToRender.push(schedule.stageTotalSummary);
    schedule.stageSummaries.forEach(s => mpListToRender.push(s));
  } else {
    if (selectedStage === 'ASSEMBLY' || selectedStage === 'HARD TEST' || selectedStage === 'SUM HARDTEST' || selectedStage === 'HARDTEST_TOTAL') {
      const single = (schedule.stageSummaries || []).find(s => s.stage === selectedStage) || schedule.hardtestGroupSummary || (schedule.stageSummaries ? schedule.stageSummaries[0] : null);
      if (single) mpListToRender.push(single);
    } else {
      const single = (schedule.stageSummaries || []).find(s => s.stage === selectedStage) || (schedule.stageSummaries ? schedule.stageSummaries[0] : null);
      if (single) mpListToRender.push(single);
    }
  }

  // Primary stage for top Manpower KPIs
  const primaryStage = mpListToRender.length > 0 ? mpListToRender[0] : (listToRender.length > 0 ? listToRender[0] : null);

  // Lưu biến phục vụ chức năng Copy & Xuất Google Sheets chuẩn sạch không emoji
  window.__LATEST_SCHEDULE__ = schedule;
  window.__LATEST_MP_STAGES__ = (mpListToRender && mpListToRender.length > 0) ? mpListToRender : listToRender;
  window.__LATEST_PROD_STAGES__ = listToRender;
  window.__LATEST_SCHEDULE_ITEMS__ = schedule.items;

  // Dynamic Day Header Columns with Weekend Highlighting (Thứ 7 - Chủ Nhật)
  const dayHeaders = schedule.dates.map(dateStr => {
    const isChecked = schedule.selectedDates.includes(dateStr);
    const dayName = getDayOfWeekName(dateStr);
    const dObj = window.AppStore ? window.AppStore.parseDate(dateStr) : new Date(dateStr);
    const dayOfWeek = dObj.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // 0 = Chủ Nhật, 6 = Thứ 7
    const colSpan = isSplit ? 'colspan="2"' : '';
    const rot = window.getShiftRotation(dateStr);

    const weekendClass = isWeekend ? 'weekend-header' : '';
    const weekendBadge = '';
    const weekendNameColor = isWeekend ? 'color: #fbbf24; font-weight: 800;' : 'color: var(--text-primary);';

    return `
      <th class="day-header ${weekendClass} ${isChecked ? '' : 'day-col-inactive'}" ${colSpan}>
        <label class="day-checkbox-label" title="${isWeekend ? '⚠️ Ngày nghỉ cuối tuần (' + dayName + '). ' : ''}Tick chọn để tính vào lũy kế. Kíp trực: Ca Ngày Kíp ${rot.day} • Ca Đêm Kíp ${rot.night} • Nghỉ: Kíp ${rot.off.join(', ')}">
          <input type="checkbox" class="day-checkbox" ${isChecked ? 'checked' : ''} onchange="handleToggleScheduleDay('${dateStr}', this.checked)">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.35rem; flex-wrap: wrap;">
            <span class="day-name" style="${weekendNameColor}">${dayName}</span>
            <span class="badge-shift-pair" title="Ca Ngày Kíp ${rot.day} / Ca Đêm Kíp ${rot.night}">
              ${rot.day}/${rot.night}
            </span>
          </div>
          <span class="day-date" style="${isWeekend ? 'color: #fde68a; font-weight: 700;' : ''}">${dateStr}</span>
        </label>
      </th>
    `;
  }).join('');

  // Subheader row for SPLIT shift mode
  const splitSubHeader = isSplit ? `
    <tr class="split-shift-row">
      <th class="sticky-col-stt" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-col-prod" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-col-metric" style="border-top: 1px solid var(--border-glass);"></th>
      ${schedule.dates.map(d => {
        const rot = window.getShiftRotation(d);
        return `
          <th style="text-align: center; padding: 0.35rem 0.2rem;">
            <div class="badge-day-sub" title="Ca Ngày: Kíp ${rot.day} trực (Nghỉ: Kíp ${rot.off.join(', ')})">
              ☀️ Ngày <span class="badge-shift-pill shift-${rot.day.toLowerCase()}">Kíp ${rot.day}</span>
            </div>
          </th>
          <th style="text-align: center; padding: 0.35rem 0.2rem;">
            <div class="badge-night-sub" title="Ca Đêm: Kíp ${rot.night} trực (Nghỉ: Kíp ${rot.off.join(', ')})">
              🌙 Đêm <span class="badge-shift-pill shift-${rot.night.toLowerCase()}">Kíp ${rot.night}</span>
            </div>
          </th>
        `;
      }).join('')}
      <th style="border-top: 1px solid var(--border-glass);"></th>
      <th class="week-summary-col" style="border-top: 1px solid var(--border-glass);"></th>
      <th style="border-top: 1px solid var(--border-glass);"></th>
    </tr>
  ` : '';

  // ========================================================
  // 1. TÍNH TOÁN & RENDER KHỐI 1: TÌNH TRẠNG NHÂN LỰC
  // ========================================================
  const manpowerContainer = document.getElementById('datamassManpowerTableContainer');
  let topPlanMp = 0, topActMp = 0, topShortage = 0, topSupplement = 0, topOtHours = 0, topSelDays = 0;

  const isCompact = (window.AppStore && window.AppStore.manpowerTableMode === 'COMPACT');
  const btnExp = document.getElementById('btnMpModeExpanded');
  const btnCmp = document.getElementById('btnMpModeCompact');
  if (btnExp && btnCmp) {
    if (isCompact) {
      btnExp.classList.remove('active');
      btnCmp.classList.add('active');
    } else {
      btnExp.classList.add('active');
      btnCmp.classList.remove('active');
    }
  }

  // Khối 1: TÌNH TRẠNG NHÂN LỰC
  // Nguyên tắc: Chỉ quản lý nhân lực cho ASSEMBLY và TỔNG HARD TEST (Không có nhân lực cho Focus, OPTICS...)
  const stagesForManpower = (mpListToRender && mpListToRender.length > 0) ? mpListToRender : listToRender;

  if (manpowerContainer && stagesForManpower.length > 0) {
    const mpTableRows = stagesForManpower.map((sum, sIdx) => {
      const isGrand = sum.isGrandTotal;
      const stageName = sum.stage;
      const stageCls = isGrand ? 'row-stage-total' : '';
      const targetSaveStage = sum.saveStage || (sum.isMajorComposite || (isGrand && !sum.isHardtestGroup) ? 'major_composite' : (sum.isHardtestGroup ? 'HARDTEST_TOTAL' : (stageName === 'ASSEMBLY' ? 'ASSEMBLY' : stageName)));
      const isAssembly = Boolean(stageName === 'ASSEMBLY' || targetSaveStage === 'ASSEMBLY' || sum.saveStage === 'ASSEMBLY');
      const rowSpanCount = isCompact ? (isAssembly ? 5 : 3) : (isAssembly ? 6 : 4);
      // Chỉ dòng tổng hợp 2 cụm là tự động cộng dồn (Auto-Sum). Assembly và Tổng Hard Test cho phép điền / hiển thị đúng nhân lực có mặt theo kíp trực
      const isAutoSumRow = Boolean(sum.isMajorComposite || (isGrand && !sum.isHardtestGroup && !stageName.includes('Plan HT Total') && !stageName.includes('HARD TEST')));

      let stageBadgeHtml = '';
      if (sum.saveStage === 'FPD_TOTAL' || stageName.includes('TỔNG FPD')) {
        stageBadgeHtml = `<span class="badge" style="font-size: 0.775rem; font-weight: 800; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fbbf24;">📦 TỔNG FPD</span>`;
      } else if (sum.saveStage === 'MASTERBOX_TOTAL' || stageName.includes('MASTERBOX')) {
        stageBadgeHtml = `<span class="badge" style="font-size: 0.775rem; font-weight: 800; background: rgba(6, 182, 212, 0.2); border: 1px solid rgba(6, 182, 212, 0.5); color: #22d3ee;">💻 TỔNG MASTERBOX</span>`;
      } else if (sum.saveStage === 'custom_composite' || (stageName.includes('TỔNG HỢP') && !stageName.includes('SFPD'))) {
        stageBadgeHtml = `<span class="badge badge-purple" style="font-size: 0.775rem; font-weight: 800;">🎯 ${stageName}</span>`;
      } else if (sum.saveStage === 'ALL' || stageName.includes('TOÀN NHÀ MÁY')) {
        stageBadgeHtml = `<span class="badge badge-blue" style="font-size: 0.775rem; font-weight: 800;">🏭 TỔNG TOÀN NHÀ MÁY</span>`;
      } else if (sum.isMajorComposite || (isGrand && !sum.isHardtestGroup) || stageName.includes('SFPD')) {
        stageBadgeHtml = ''; // Bỏ badge '🎯 🚀 TỔNG HỢP 2 CỤM TRỌNG ĐIỂM (HARDTEST + ASSEMBLY)' theo chỉ đạo của người dùng
      } else if (sum.isHardtestGroup || stageName.includes('Plan HT Total') || stageName.includes('HARD TEST')) {
        stageBadgeHtml = ''; // Hiển thị tên TỔNG HARD TEST rõ ràng, không trùng lặp
      } else if (stageName === 'ASSEMBLY') {
        stageBadgeHtml = '';
      } else {
        const badgeClass = stageName === 'OPTICS ASM' ? 'badge-amber'
          : stageName === 'A IMP ASM' ? 'badge-blue'
          : stageName === 'FOCUS' ? 'badge-green'
          : stageName === 'LONG TEST' ? 'badge-amber'
          : stageName === 'TEST ROOM' ? 'badge-cyan'
          : stageName === 'QC' ? 'badge-green'
          : stageName === 'PKG' || stageName === 'COM PKG' ? 'badge-purple'
          : stageName === 'COM PKG AUTO' ? 'badge-indigo'
          : stageName === 'MB' ? 'badge-pink' : 'badge-purple';
        const icon = stageName === 'OPTICS ASM' ? '🔭 '
          : stageName === 'A IMP ASM' ? '⚙️ '
          : stageName === 'FOCUS' ? '🎯 '
          : stageName === 'LONG TEST' ? '⏱️ '
          : stageName === 'TEST ROOM' ? '🌡️ '
          : stageName === 'QC' ? '🔍 '
          : stageName === 'PKG' || stageName === 'COM PKG' ? '📦 '
          : stageName === 'COM PKG AUTO' ? '🤖 '
          : stageName === 'MB' ? '💻 ' : '';
        stageBadgeHtml = `<span class="badge ${badgeClass}" style="font-size: 0.75rem;">${icon}${stageName}</span>`;
      }

      // Compute daily items
      let cumPlan = 0, cumAct = 0, cumShortage = 0, cumSupp = 0, cumOt = 0, selDays = 0;

      const dailyMetrics = sum.daily.map(d => {
        let planVal = 0, planDay = 0, planNight = 0;
        let actVal = 0, actDay = 0, actNight = 0;
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const dayOfWeek = dObj.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        if (isSplit) {
          planDay = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
          planNight = d.peopleNight || Math.round(((d.people || 0) - planDay) * 10) / 10;

          actDay = window.AppStore.getActualAttendance(d.date, 'Day', targetSaveStage);
          actNight = window.AppStore.getActualAttendance(d.date, 'Night', targetSaveStage);

          const balDay = Math.round((actDay - planDay) * 10) / 10;
          const balNight = Math.round((actNight - planNight) * 10) / 10;
          const shortDay = balDay < 0 ? Math.abs(balDay) : 0;
          const shortNight = balNight < 0 ? Math.abs(balNight) : 0;

          // Thực tế số người bổ sung
          const storedSuppDay = window.AppStore.getActualSupplement ? window.AppStore.getActualSupplement(d.date, 'Day', targetSaveStage) : null;
          const suppDay = storedSuppDay !== null ? storedSuppDay : shortDay;

          const storedSuppNight = window.AppStore.getActualSupplement ? window.AppStore.getActualSupplement(d.date, 'Night', targetSaveStage) : null;
          const suppNight = storedSuppNight !== null ? storedSuppNight : shortNight;

          // Quy chuẩn tính OT: 1 người bổ sung = 12h OT
          // Số giờ OT tương ứng với số người bổ sung
          const otDay = Math.round(suppDay * 12.0 * 10) / 10;
          const otNight = Math.round(suppNight * 12.0 * 10) / 10;

          if (d.isSelected) {
            cumPlan += (planDay + planNight);
            cumAct += (actDay + actNight);
            cumShortage += (shortDay + shortNight);
            cumSupp += (suppDay + suppNight);
            cumOt += (otDay + otNight);
            selDays++;
          }

          return {
            date: d.date,
            isSelected: d.isSelected,
            isWeekend,
            planDay, planNight,
            actDay, actNight,
            balDay, balNight,
            shortDay, shortNight,
            suppDay, suppNight,
            storedSuppDay, storedSuppNight,
            otDay, otNight
          };
        } else {
          // Single shift view (ALL, DAY, or NIGHT)
          if (shiftFilter === 'DAY') {
            planVal = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
            actVal = window.AppStore.getActualAttendance(d.date, 'Day', targetSaveStage);
          } else if (shiftFilter === 'NIGHT') {
            planVal = d.peopleNight || Math.round(((d.people || 0) - Math.round((d.people || 0) * 0.6 * 10) / 10) * 10) / 10;
            actVal = window.AppStore.getActualAttendance(d.date, 'Night', targetSaveStage);
          } else {
            // ALL
            planVal = d.people || (d.peopleDay + d.peopleNight) || 0;
            actVal = window.AppStore.getActualAttendance(d.date, 'ALL', targetSaveStage);
          }

          const bal = Math.round((actVal - planVal) * 10) / 10;
          const short = bal < 0 ? Math.abs(bal) : 0;

          // Thực tế số người bổ sung
          const storedSupp = window.AppStore.getActualSupplement ? window.AppStore.getActualSupplement(d.date, shiftFilter, targetSaveStage) : null;
          const supp = storedSupp !== null ? storedSupp : short;

          const shiftHour = 12.0; // Quy chuẩn: 1 người bổ sung = 12h OT
          // Số giờ OT tương ứng với số người bổ sung
          const ot = Math.round(supp * shiftHour * 10) / 10;

          if (d.isSelected) {
            cumPlan += planVal;
            cumAct += actVal;
            cumShortage += short;
            cumSupp += supp;
            cumOt += ot;
            selDays++;
          }

          return {
            date: d.date,
            isSelected: d.isSelected,
            isWeekend,
            planVal,
            actVal,
            bal,
            short,
            supp,
            storedSupp,
            ot
          };
        }
      });

      // Accumulate top KPIs from first item (grand total or main stage)
      if (sIdx === 0) {
        topPlanMp = cumPlan;
        topActMp = cumAct;
        topShortage = cumShortage;
        topSupplement = cumSupp;
        topOtHours = cumOt;
        topSelDays = selDays;
      }

      // Build Row 1: Kế Hoạch Nhân Lực Cần (Plan People)
      const planCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.8rem;" title="Plan Ca Ngày: ${d.planDay}">
              ${d.planDay > 0 ? d.planDay.toFixed(1) : '0'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #f59e0b; font-size: 0.8rem;" title="Plan Ca Đêm: ${d.planNight}">
              ${d.planNight > 0 ? d.planNight.toFixed(1) : '0'}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.85rem;" title="Plan Ngày: ${d.planVal}">
            ${d.planVal > 0 ? d.planVal.toFixed(1) : '0'}
          </td>
        `;
      }).join('');

      // Build Row 2: Nhân Lực Có (Actual Attendance - Auto-Sum or Editable)
      const actualCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          if (isAutoSumRow) {
            return `
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
                <span class="badge-auto-sum" title="Tự động tính tổng từ các công đoạn con (Ca Ngày: ${d.actDay})">
                  ${d.actDay > 0 ? d.actDay.toFixed(1) : '0.0'}
                </span>
              </td>
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
                <span class="badge-auto-sum" title="Tự động tính tổng từ các công đoạn con (Ca Đêm: ${d.actNight})">
                  ${d.actNight > 0 ? d.actNight.toFixed(1) : '0.0'}
                </span>
              </td>
            `;
          }
          const dayDetail = window.AppStore.getManpowerDetailText ? window.AppStore.getManpowerDetailText(d.date, 'Day', targetSaveStage) : '';
          const nightDetail = window.AppStore.getManpowerDetailText ? window.AppStore.getManpowerDetailText(d.date, 'Night', targetSaveStage) : '';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
              <input type="number" step="0.5" class="input-manpower-actual" style="width: 52px; font-size: 0.775rem;" 
                     value="${d.actDay > 0 ? d.actDay : ''}" placeholder="${d.planDay || '0'}" 
                     title="${dayDetail}" 
                     onchange="handleActualAttendanceEdit('${d.date}', 'Day', '${targetSaveStage}', this.value, this)" />
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
              <input type="number" step="0.5" class="input-manpower-actual" style="width: 52px; font-size: 0.775rem;" 
                     value="${d.actNight > 0 ? d.actNight : ''}" placeholder="${d.planNight || '0'}" 
                     title="${nightDetail}" 
                     onchange="handleActualAttendanceEdit('${d.date}', 'Night', '${targetSaveStage}', this.value, this)" />
            </td>
          `;
        }

        if (isAutoSumRow) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.45rem;">
              <span class="badge-auto-sum" title="Tự động tính tổng từ các công đoạn con (${d.actVal})">
                ${d.actVal > 0 ? d.actVal.toFixed(1) : '0.0'}
              </span>
            </td>
          `;
        }
        const singleDetail = window.AppStore.getManpowerDetailText ? window.AppStore.getManpowerDetailText(d.date, shiftFilter, targetSaveStage) : '';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.3rem;">
            <input type="number" step="0.5" class="input-manpower-actual" 
                   value="${d.actVal > 0 ? d.actVal : ''}" placeholder="${d.planVal || '0'}" 
                   title="${singleDetail || `Nhập nhân lực có ${targetSaveStage} ngày ${d.date}`}" 
                   onchange="handleActualAttendanceEdit('${d.date}', '${shiftFilter}', '${targetSaveStage}', this.value, this)" />
          </td>
        `;
      }).join('');

      // Build Row 3: Chênh Lệch Nhân Lực (Balance = Có - Cần)
      const balanceCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          const clsDay = d.balDay < 0 ? 'color: #ef4444; font-weight: 800; background: rgba(239, 68, 68, 0.05);' : 'color: #10b981; font-weight: 800;';
          const clsNight = d.balNight < 0 ? 'color: #ef4444; font-weight: 800; background: rgba(239, 68, 68, 0.05);' : 'color: #10b981; font-weight: 800;';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; ${clsDay}">
              ${d.balDay.toFixed(1)}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; ${clsNight}">
              ${d.balNight.toFixed(1)}
            </td>
          `;
        }
        const cls = d.bal < 0 ? 'color: #ef4444; font-weight: 800; background: rgba(239, 68, 68, 0.05);' : 'color: #10b981; font-weight: 800;';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.85rem; ${cls}">
            ${d.bal.toFixed(1)}
          </td>
        `;
      }).join('');

      // Build Row 4: Số Người Cần Bổ Sung (Shortage Headcount)
      const shortageCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.775rem;">
              ${d.shortDay > 0 ? `<span class="badge-mp-shortage" title="Ca Ngày thiếu: ${d.shortDay}">${d.shortDay.toFixed(1)}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0</span>`}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.775rem;">
              ${d.shortNight > 0 ? `<span class="badge-mp-shortage" title="Ca Đêm thiếu: ${d.shortNight}">${d.shortNight.toFixed(1)}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0</span>`}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.825rem;">
            ${d.short > 0 ? `<span class="badge-mp-shortage" title="Thiếu: ${d.short}">${d.short.toFixed(1)}</span>` : `<span class="badge-mp-ok">0</span>`}
          </td>
        `;
      }).join('');

      // Build Row 5: Thực Tế Số Người Bổ Sung (Actual Supplement - Editable hoặc Auto-Sum)
      const supplementCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          if (isAutoSumRow) {
            return `
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
                <span class="badge-auto-sum" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Tự động tính tổng từ các công đoạn con (Ca Ngày bổ sung: ${d.suppDay})">
                  ${d.suppDay > 0 ? d.suppDay.toFixed(1) : '0.0'}
                </span>
              </td>
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
                <span class="badge-auto-sum" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Tự động tính tổng từ các công đoạn con (Ca Đêm bổ sung: ${d.suppNight})">
                  ${d.suppNight > 0 ? d.suppNight.toFixed(1) : '0.0'}
                </span>
              </td>
            `;
          }
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
              <input type="number" step="0.5" class="input-manpower-supplement" style="width: 52px; font-size: 0.775rem;" 
                     value="${d.storedSuppDay !== null ? d.storedSuppDay : ''}" 
                     placeholder="${d.shortDay > 0 ? d.shortDay : '0'}" 
                     title="Thực tế số người bổ sung ${targetSaveStage} Ca Ngày: ${d.date}" 
                     onchange="handleSupplementEdit('${d.date}', 'Day', '${targetSaveStage}', this.value, this)" />
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
              <input type="number" step="0.5" class="input-manpower-supplement" style="width: 52px; font-size: 0.775rem;" 
                     value="${d.storedSuppNight !== null ? d.storedSuppNight : ''}" 
                     placeholder="${d.shortNight > 0 ? d.shortNight : '0'}" 
                     title="Thực tế số người bổ sung ${targetSaveStage} Ca Đêm: ${d.date}" 
                     onchange="handleSupplementEdit('${d.date}', 'Night', '${targetSaveStage}', this.value, this)" />
            </td>
          `;
        }

        if (isAutoSumRow) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.45rem;">
              <span class="badge-auto-sum" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Tự động tính tổng từ các công đoạn con (${d.supp})">
                ${d.supp > 0 ? d.supp.toFixed(1) : '0.0'}
              </span>
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.3rem;">
            <input type="number" step="0.5" class="input-manpower-supplement" 
                   value="${d.storedSupp !== null ? d.storedSupp : ''}" 
                   placeholder="${d.short > 0 ? d.short : '0'}" 
                   title="Nhập thực tế số người bổ sung ${targetSaveStage} ngày ${d.date}" 
                   onchange="handleSupplementEdit('${d.date}', '${shiftFilter}', '${targetSaveStage}', this.value, this)" />
          </td>
        `;
      }).join('');

      // Build Row 6: Số Giờ OT Cần Bù (Quy chuẩn: 1 người bổ sung = 12h OT)
      const otCells = dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.775rem;">
              ${d.otDay > 0 ? `<span class="badge-mp-ot" title="Ca Ngày cần OT: ${d.otDay}h">${d.otDay.toFixed(1)}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0</span>`}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.775rem;">
              ${d.otNight > 0 ? `<span class="badge-mp-ot" title="Ca Đêm cần OT: ${d.otNight}h">${d.otNight.toFixed(1)}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0</span>`}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: center; font-size: 0.825rem;">
            ${d.ot > 0 ? `<span class="badge-mp-ot" title="Cần OT: ${d.ot}h">${d.ot.toFixed(1)}</span>` : `<span style="color: var(--text-muted); font-size: 0.8rem;">0</span>`}
          </td>
        `;
      }).join('');

      const avgPlanVal = selDays > 0 ? Math.round((cumPlan / selDays) * 10) / 10 : 0;
      const avgActVal = selDays > 0 ? Math.round((cumAct / selDays) * 10) / 10 : 0;
      const avgBalVal = Math.round((avgActVal - avgPlanVal) * 10) / 10;
      const avgShortVal = selDays > 0 ? Math.round((cumShortage / selDays) * 10) / 10 : 0;
      const avgSuppVal = selDays > 0 ? Math.round((cumSupp / selDays) * 10) / 10 : 0;
      const avgOtVal = selDays > 0 ? Math.round((cumOt / selDays) * 10) / 10 : 0;

      // Build Row 1b (ASSEMBLY): Kế Hoạch Cần Số Line (1 Line = 14 người)
      const planLineCells = isAssembly ? dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          const lDay = d.planDay > 0 ? (d.planDay / 14).toFixed(1) : '0';
          const lNight = d.planNight > 0 ? (d.planNight / 14).toFixed(1) : '0';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #fbbf24; font-size: 0.8rem; background: rgba(245, 158, 11, 0.04);" title="Plan Ca Ngày: ${d.planDay} ng ÷ 14 = ${lDay} Line">
              ${lDay}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #f59e0b; font-size: 0.8rem; background: rgba(245, 158, 11, 0.04);" title="Plan Ca Đêm: ${d.planNight} ng ÷ 14 = ${lNight} Line">
              ${lNight}
            </td>
          `;
        }
        const lVal = d.planVal > 0 ? (d.planVal / 14).toFixed(1) : '0';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #fbbf24; font-size: 0.85rem; background: rgba(245, 158, 11, 0.04);" title="Plan Ngày: ${d.planVal} ng ÷ 14 = ${lVal} Line">
            ${lVal}
          </td>
        `;
      }).join('') : '';

      // Build Row 2b (ASSEMBLY): Thực Tế Có Số Line (1 Line = 14 người)
      const actualLineCells = isAssembly ? dailyMetrics.map(d => {
        const wkCls = d.isWeekend ? 'weekend-cell' : '';
        if (isSplit) {
          const lDay = d.actDay > 0 ? (d.actDay / 14).toFixed(1) : '0';
          const lNight = d.actNight > 0 ? (d.actNight / 14).toFixed(1) : '0';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.8rem; background: rgba(16, 185, 129, 0.04);" title="Thực tế Ca Ngày: ${d.actDay} ng ÷ 14 = ${lDay} Line">
              ${lDay}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.8rem; background: rgba(16, 185, 129, 0.04);" title="Thực tế Ca Đêm: ${d.actNight} ng ÷ 14 = ${lNight} Line">
              ${lNight}
            </td>
          `;
        }
        const lVal = d.actVal > 0 ? (d.actVal / 14).toFixed(1) : '0';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.85rem; background: rgba(16, 185, 129, 0.04);" title="Thực tế Ngày: ${d.actVal} ng ÷ 14 = ${lVal} Line">
            ${lVal}
          </td>
        `;
      }).join('') : '';

      const cumPlanLines = (cumPlan / 14).toFixed(1);
      const avgPlanLines = (avgPlanVal / 14).toFixed(1);

      const cumActLines = (cumAct / 14).toFixed(1);
      const avgActLines = (avgActVal / 14).toFixed(1);
      const lineDiff = Math.round(((avgActVal - avgPlanVal) / 14) * 10) / 10;

      const evalHtml = cumShortage > 0 
        ? `<div style="margin-top: 0.35rem;">
             <span class="badge-mp-shortage" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">
               🚨 Thiếu: <strong>${cumShortage.toFixed(1)}</strong> lượt ng
             </span>
           </div>`
        : `<div style="margin-top: 0.35rem;">
             <span class="badge-mp-ok" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">
               ✅ Đủ nhân sự
             </span>
           </div>`;

      return `
        <!-- Hàng 1: Kế Hoạch Nhân Lực Cần -->
        <tr class="${stageCls} row-manpower-plan" style="border-top: ${sIdx > 0 ? '2px solid var(--border-glass)' : 'none'};">
          <td rowspan="${rowSpanCount}" class="sticky-col-stt" style="vertical-align: top; padding-top: 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">
            ${sIdx + 1}
          </td>
          <td rowspan="${rowSpanCount}" class="sticky-col-prod" style="vertical-align: top; padding-top: 0.85rem; max-width: 300px; overflow: hidden;">
            ${stageBadgeHtml ? `<div style="margin-bottom: 0.35rem;">${stageBadgeHtml}</div>` : ''}
            <div style="font-weight: 800; color: var(--text-primary); font-size: 0.925rem; line-height: 1.35; margin-bottom: 0.35rem; word-break: break-word;">${stageName}</div>
            <div style="margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed rgba(255, 255, 255, 0.08);">
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;">Trạng thái:</span>
              ${evalHtml}
            </div>
          </td>
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill metric-manpower" title="Kế hoạch nhân lực cần lấy trực tiếp từ dòng Product name 1C: People">
              👷 1. Kế Hoạch Cần (Plan)
            </span>
          </td>
          ${planCells}
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #fbbf24; font-size: 0.875rem;">
            ${cumPlan.toFixed(1)}
          </td>
          <td class="font-mono week-summary-col" style="font-weight: 800; color: #fbbf24; font-size: 0.875rem; text-align: right;">
            ${avgPlanVal.toFixed(1)}
          </td>
          <td style="text-align: center; font-size: 0.775rem; color: var(--text-secondary);">
            Kế hoạch định biên
          </td>
        </tr>

        ${isAssembly ? `
          <!-- Hàng 1b: Kế Hoạch Cần Số Line (14 ng/Line) -->
          <tr class="${stageCls} row-manpower-plan-lines">
            <td class="sticky-col-metric" style="text-align: center;">
              <span class="metric-pill" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.35);" title="Số Line cần theo kế hoạch định biên (1 Line = 14 người)">
                🏭 1b. Kế Hoạch Cần Số Line
              </span>
            </td>
            ${planLineCells}
            <td class="font-mono" style="text-align: right; font-weight: 800; color: #fbbf24; font-size: 0.875rem;">
              ${cumPlanLines}
            </td>
            <td class="font-mono week-summary-col" style="font-weight: 800; color: #fbbf24; font-size: 0.875rem; text-align: right;">
              ${avgPlanLines}
            </td>
            <td style="text-align: center; font-size: 0.775rem; color: #fbbf24; font-weight: 600;">
              Định biên: 14 ng/Line
            </td>
          </tr>
        ` : ''}

        <!-- Hàng 2: Nhân Lực Có Mặt (Thực Tế - Editable hoặc Auto-Sum) -->
        <tr class="${stageCls} row-manpower-actual">
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);" title="Nhập số người thực tế đi làm từng ngày">
              👥 2. Nhân Lực Có (Thực Tế)
            </span>
          </td>
          ${actualCells}
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.875rem;">
            ${cumAct.toFixed(1)}
          </td>
          <td class="font-mono week-summary-col" style="font-weight: 800; color: #34d399; font-size: 0.875rem; text-align: right;">
            ${avgActVal.toFixed(1)}
          </td>
          <td style="text-align: center; font-size: 0.775rem; color: #34d399; font-weight: 700;">
            ${isAutoSumRow ? '⚡ Tự động tính tổng (Auto-Sum)' : 'Điền trực tiếp từng ngày'}
          </td>
        </tr>

        ${isAssembly ? `
          <!-- Hàng 2b: Thực Tế Có Số Line (14 ng/Line) -->
          <tr class="${stageCls} row-manpower-actual-lines">
            <td class="sticky-col-metric" style="text-align: center;">
              <span class="metric-pill" style="background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);" title="Số Line thực tế có thể chạy tương ứng với nhân lực có mặt (1 Line = 14 người)">
                🏭 2b. Thực Tế Có Số Line
              </span>
            </td>
            ${actualLineCells}
            <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.875rem;">
              ${cumActLines}
            </td>
            <td class="font-mono week-summary-col" style="font-weight: 800; color: #34d399; font-size: 0.875rem; text-align: right;">
              ${avgActLines}
            </td>
            <td style="text-align: center; font-size: 0.775rem;">
              ${lineDiff >= 0 
                ? `<span class="badge-mp-ok" style="font-size: 0.75rem;">✅ Đủ số Line (${avgActLines} Line)</span>` 
                : `<span class="badge-mp-shortage" style="font-size: 0.75rem;">⚠️ Hụt ${Math.abs(lineDiff).toFixed(1)} Line</span>`}
            </td>
          </tr>
        ` : ''}

        <!-- Hàng 3: Chênh Lệch Nhân Lực (Balance = Có - Cần) -->
        <tr class="${stageCls} row-manpower-balance" style="${isCompact ? 'border-bottom: 2px solid var(--border-glass);' : ''}">
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill" style="background: rgba(96, 165, 250, 0.15); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.35);" title="Chênh lệch = Nhân Lực Có - Kế Hoạch Cần">
              ⚖️ 3. Chênh Lệch (Balance)
            </span>
          </td>
          ${balanceCells}
          <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.875rem; ${cumAct - cumPlan < 0 ? 'color: #ef4444;' : 'color: #10b981;'}">
            ${(cumAct - cumPlan).toFixed(1)}
          </td>
          <td class="font-mono week-summary-col" style="font-weight: 900; font-size: 0.875rem; text-align: right; ${avgBalVal < 0 ? 'color: #ef4444;' : 'color: #10b981;'}">
            ${avgBalVal.toFixed(1)}
          </td>
          <td style="text-align: center; font-size: 0.775rem; ${cumAct - cumPlan < 0 ? 'color: #ef4444; font-weight: 700;' : 'color: #10b981; font-weight: 700;'}">
            ${cumAct - cumPlan < 0 ? 'Thiếu hụt (-)' : 'Cân đối đủ (+)'}
          </td>
        </tr>

        ${!isCompact ? `
          <!-- Hàng 4: Số Người Cần Bổ Sung (Thiếu hụt) -->
          <tr class="${stageCls} row-manpower-shortage" style="border-bottom: 2px solid var(--border-glass);">
            <td class="sticky-col-metric" style="text-align: center;">
              <span class="metric-pill" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35);" title="Số người cần bổ sung khi chênh lệch âm">
                🚨 4. Người Cần Bổ Sung
              </span>
            </td>
            ${shortageCells}
            <td class="font-mono" style="text-align: right; font-weight: 800; font-size: 0.875rem; color: ${cumShortage > 0 ? '#f87171' : '#34d399'};">
              ${cumShortage.toFixed(1)}
            </td>
            <td class="font-mono week-summary-col" style="font-weight: 800; font-size: 0.875rem; text-align: right; color: ${avgShortVal > 0 ? '#f87171' : 'var(--text-muted)'};">
              ${avgShortVal.toFixed(1)}
            </td>
            <td style="text-align: center; font-size: 0.75rem;">
              ${cumShortage > 0 ? '<span class="badge-mp-shortage">Cần tuyển / điều động</span>' : '<span class="badge-mp-ok">Đạt chuẩn</span>'}
            </td>
          </tr>
        ` : ''}
      `;
    }).join('');

    const bannersHtml = isCompact ? `
      <div style="margin-bottom: 0.5rem; display: flex; justify-content: flex-end; align-items: center; padding: 0.2rem 0.5rem; gap: 0.4rem;">
        <button class="btn btn-sm btn-primary" style="font-size: 0.7rem; padding: 0.2rem 0.6rem; font-weight: 700;" onclick="window.openKipLineConfigModal()" title="Mở công cụ cấu hình Line theo từng Kíp &amp; Hành Chính">
          ⚙️ Cấu Hình Line Kíp
        </button>
        <button class="btn btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.55rem; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: #c4b5fd; cursor: pointer; border-radius: var(--radius-sm);" onclick="window.applyStandardManpowerToAll()" title="Áp dụng lại 100% định mức chuẩn từ Sheet Manpower theo lịch xoay ca cho toàn bộ các ngày">
          🔄 Đặt lại định mức chuẩn
        </button>
      </div>
    ` : `
      <div class="shift-schedule-banner">
        <div class="shift-schedule-banner-title">
          <span>🔄 LỊCH PHÂN CA 4 KÍP A/B/C/D (2 TRỰC / 2 NGHỈ — XOAY CA 3 NGÀY):</span>
        </div>
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; align-items: center;">
          <span class="shift-cycle-item" title="18/10 - 20/10: Ca Ngày Kíp A • Ca Đêm Kíp B • Nghỉ Kíp C/D">
            <strong>18/10 - 20/10:</strong> ☀️ <span class="badge-shift-pill shift-a">Kíp A</span> • 🌙 <span class="badge-shift-pill shift-b">Kíp B</span> <small style="color:var(--text-muted);">(Nghỉ C/D)</small>
          </span>
          <span class="shift-cycle-item" title="21/10 - 23/10: Ca Ngày Kíp C • Ca Đêm Kíp D • Nghỉ Kíp A/B">
            <strong>21/10 - 23/10:</strong> ☀️ <span class="badge-shift-pill shift-c">Kíp C</span> • 🌙 <span class="badge-shift-pill shift-d">Kíp D</span> <small style="color:var(--text-muted);">(Nghỉ A/B)</small>
          </span>
          <span class="shift-cycle-item" title="24/10 - 26/10: Ca Ngày Kíp B • Ca Đêm Kíp A • Nghỉ Kíp C/D (Hoán đổi Ngày/Đêm)">
            <strong>24/10 - 26/10:</strong> ☀️ <span class="badge-shift-pill shift-b">Kíp B</span> • 🌙 <span class="badge-shift-pill shift-a">Kíp A</span> <small style="color:var(--text-muted);">(Nghỉ C/D)</small>
          </span>
          <span class="shift-cycle-item" title="27/10 - 29/10: Ca Ngày Kíp D • Ca Đêm Kíp C • Nghỉ Kíp A/B (Hoán đổi Ngày/Đêm)">
            <strong>27/10 - 29/10:</strong> ☀️ <span class="badge-shift-pill shift-d">Kíp D</span> • 🌙 <span class="badge-shift-pill shift-c">Kíp C</span> <small style="color:var(--text-muted);">(Nghỉ A/B)</small>
          </span>
        </div>
      </div>
      <div class="manpower-sheet-summary-bar">
        <div class="manpower-summary-tag">
          <span>👥 NHÂN LỰC HIỆN CÓ:</span>
        </div>
        ${(() => {
          const mp = window.MANPOWER_MASTER_DATA || {};
          const getTag = (sCode, pillClass) => {
            const s = mp[sCode] || {};
            const lines = s.assyLinesDirect ? Object.entries(s.assyLinesDirect).map(([k,v]) => `${k} (${v})`).join(' + ') : '';
            const lineCount = s.assyLinesDirect ? Object.keys(s.assyLinesDirect).length : 0;
            const dir = s.assyDirect || 0;
            const ht = s.htDirect || 0;
            const gross = s.assyTotal || 0;
            const htGross = s.htTotal || 0;
            return `
              <span class="mp-tag" title="Lines: ${lines} = ${dir} ng; Hard Test: ${ht} ng (Tổng gross: Assy ${gross}, HT ${htGross})">
                <span class="badge-shift-pill ${pillClass}">Kíp ${sCode}</span> Assy <strong>${dir}</strong> ng (${lineCount} Line) • HT <strong>${ht}</strong> ng
              </span>
            `;
          };
          const hc = mp['HC'] || { assyDirect: 11, assyTotal: 16, lines: ['3D'] };
          const hcDirect = hc.assyDirect || 11;
          const hcTotal = hc.assyTotal || 16;
          const hcLines = hc.lines ? hc.lines.join(', ') : '3D';
          return `
            <div class="manpower-shift-tags">
              ${getTag('A', 'shift-a')}
              ${getTag('B', 'shift-b')}
              ${getTag('C', 'shift-c')}
              ${getTag('D', 'shift-d')}
              <span class="mp-tag" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.08);" title="Line ${hcLines}: Trực tiếp ${hcDirect} ng, Gross ${hcTotal} ng. Làm việc Ca Ngày từ Thứ 2 đến Thứ 6. Tự động nghỉ T7-CN.">
                <span class="badge-shift-pill" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">🏢 Hành Chính</span> Line <strong>${hcLines}</strong> (<strong>${hcDirect}</strong> ng) • Ca Ngày (T2-T6)
              </span>
            </div>
          `;
        })()}
        <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" style="font-size: 0.725rem; padding: 0.25rem 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);" onclick="window.openKipLineConfigModal()" title="Mở công cụ tự cấu hình, thêm/sửa/xóa Line và định mức nhân lực theo từng Kíp A, B, C, D và Hành Chính">
            ⚙️ Cấu Hình Line Kíp
          </button>
          <button class="btn btn-sm" style="font-size: 0.725rem; padding: 0.25rem 0.65rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd; cursor: pointer; border-radius: var(--radius-sm);" onclick="window.applyStandardManpowerToAll()" title="Áp dụng lại 100% định mức chuẩn từ Sheet Manpower theo lịch xoay ca cho toàn bộ các ngày">
            🔄 Đặt lại định mức Sheet Manpower
          </button>
        </div>
      </div>
    `;

    const bannersContainer = document.getElementById('datamassManpowerBanners');
    if (bannersContainer) {
      bannersContainer.innerHTML = bannersHtml;
      manpowerContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th class="sticky-col-stt">STT</th>
              <th class="sticky-col-prod">Công Đoạn (Stage)</th>
              <th class="sticky-col-metric" style="text-align: center; width: 175px;">Chỉ Tiêu Nhân Lực</th>
              ${dayHeaders}
              <th style="text-align: right; min-width: 120px;">
                TỔNG LŨY KẾ<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày)</span>
              </th>
              <th class="week-summary-header" style="text-align: right; min-width: 110px;">
                TRUNG BÌNH / NGÀY<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(Bình quân mỗi ngày)</span>
              </th>
              <th style="text-align: center; min-width: 130px;">
                ĐÁNH GIÁ &amp; KHUYẾN NGHỊ
              </th>
            </tr>
            ${isSplit ? splitSubHeader : ''}
          </thead>
          <tbody>${mpTableRows}</tbody>
        </table>
      `;
    } else {
      manpowerContainer.innerHTML = `
        ${bannersHtml}
        <table class="data-table">
          <thead>
            <tr>
              <th class="sticky-col-stt">STT</th>
              <th class="sticky-col-prod">Công Đoạn (Stage)</th>
              <th class="sticky-col-metric" style="text-align: center; width: 175px;">Chỉ Tiêu Nhân Lực</th>
              ${dayHeaders}
              <th style="text-align: right; min-width: 120px;">
                TỔNG LŨY KẾ<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày)</span>
              </th>
              <th class="week-summary-header" style="text-align: right; min-width: 110px;">
                TRUNG BÌNH / NGÀY<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(Bình quân mỗi ngày)</span>
              </th>
              <th style="text-align: center; min-width: 130px;">
                ĐÁNH GIÁ &amp; KHUYẾN NGHỊ
              </th>
            </tr>
            ${isSplit ? splitSubHeader : ''}
          </thead>
          <tbody>${mpTableRows}</tbody>
        </table>
      `;
    }

    // Populate Top Manpower KPI Cards with CUMULATIVE TOTALS (Tổng Lũy Kế)
    const cumDiffTop = Math.round((topActMp - topPlanMp) * 10) / 10;
    const avgTopPlan = topSelDays > 0 ? Math.round((topPlanMp / topSelDays) * 10) / 10 : 0;
    const avgTopAct = topSelDays > 0 ? Math.round((topActMp / topSelDays) * 10) / 10 : 0;
    const diffTop = Math.round((avgTopAct - avgTopPlan) * 10) / 10;
    const avgTopShortage = topSelDays > 0 ? Math.round((topShortage / topSelDays) * 10) / 10 : 0;
    const avgTopSupplement = topSelDays > 0 ? Math.round((topSupplement / topSelDays) * 10) / 10 : 0;
    const avgTopOt = topSelDays > 0 ? Math.round((topOtHours / topSelDays) * 10) / 10 : 0;

    const elMpPlan = document.getElementById('dmMpKpiPlan');
    const elMpActual = document.getElementById('dmMpKpiActual');
    const elMpBalance = document.getElementById('dmMpKpiBalance');
    const elMpShortage = document.getElementById('dmMpKpiShortage');
    const elMpSupplement = document.getElementById('dmMpKpiSupplement');
    const elMpOtHours = document.getElementById('dmMpKpiOtHours');

    // 1. Kế hoạch nhân lực cần: Hiển thị TỔNG LŨY KẾ
    if (elMpPlan) {
      elMpPlan.textContent = `${topPlanMp.toFixed(1)} lượt ng`;
    }
    // 2. Nhân lực có mặt thực tế: Hiển thị TỔNG LŨY KẾ
    if (elMpActual) {
      elMpActual.textContent = `${topActMp.toFixed(1)} lượt ng`;
    }
    // 3. Chênh lệch nhân lực: Hiển thị TỔNG LŨY KẾ (Có - Cần)
    if (elMpBalance) {
      elMpBalance.textContent = (cumDiffTop > 0 ? '+' : '') + cumDiffTop.toFixed(1) + ' lượt ng';
      elMpBalance.style.color = cumDiffTop < 0 ? '#ef4444' : '#10b981';
    }
    // 4. Số người cần bổ sung: Hiển thị TỔNG LŨY KẾ lượt người thiếu
    if (elMpShortage) {
      elMpShortage.textContent = topShortage > 0 ? `${topShortage.toFixed(1)} lượt ng` : '0 lượt ng (Đủ)';
      elMpShortage.style.color = topShortage > 0 ? '#ef4444' : '#34d399';
    }
    // 5. Thực tế số người bổ sung: Hiển thị TỔNG LŨY KẾ
    if (elMpSupplement) {
      elMpSupplement.textContent = `${topSupplement.toFixed(1)} lượt ng`;
      elMpSupplement.style.color = topSupplement >= topShortage ? '#c084fc' : '#f87171';
    }
    // 6. Số giờ OT cần bù: Hiển thị TỔNG LŨY KẾ giờ OT tương ứng số người bổ sung (Quy chuẩn 1 người bổ sung = 12h OT)
    if (elMpOtHours) {
      elMpOtHours.textContent = `${topOtHours.toFixed(1)} h OT`;
      elMpOtHours.style.color = topOtHours > 0 ? '#fbbf24' : '#34d399';
    }

    const subMpPlan = document.getElementById('dmMpSubPlan');
    const subMpActual = document.getElementById('dmMpSubActual');
    const subMpBalance = document.getElementById('dmMpSubBalance');
    const subMpShortage = document.getElementById('dmMpSubShortage');
    const subMpSupplement = document.getElementById('dmMpSubSupplement');
    const subMpOtHours = document.getElementById('dmMpSubOtHours');

    if (subMpPlan) subMpPlan.textContent = `Trung bình: ${avgTopPlan.toFixed(1)} ng/ngày (${topSelDays} ngày chọn)`;
    if (subMpActual) subMpActual.textContent = `Trung bình: ${avgTopAct.toFixed(1)} ng/ngày có mặt`;
    if (subMpBalance) subMpBalance.textContent = `Trung bình: ${(diffTop > 0 ? '+' : '')}${diffTop.toFixed(1)} ng/ngày ${cumDiffTop < 0 ? '(Thiếu hụt)' : '(Cân đối đủ)'}`;
    if (subMpShortage) subMpShortage.textContent = topShortage > 0 ? `Trung bình thiếu: ${avgTopShortage.toFixed(1)} ng/ngày` : 'Không có ca nào thiếu hụt';
    if (subMpSupplement) subMpSupplement.textContent = `Trung bình bổ sung: ${avgTopSupplement.toFixed(1)} ng/ngày`;
    if (subMpOtHours) subMpOtHours.textContent = `Trung bình: ${avgTopOt.toFixed(1)} h OT/ngày (Quy chuẩn: 12h OT/người)`;

    // Render Biểu Đồ Tỉ Lệ Loading Plan = Kế Hoạch Cần (Plan) / Nhân Lực Có (Thực Tế)
    if (typeof window.renderManpowerLoadingPlanChart === 'function') {
      window.renderManpowerLoadingPlanChart(schedule, stagesForManpower, isSplit, shiftFilter);
    }
  }

  // ========================================================
  // 2. TÍNH TOÁN & RENDER KHỐI 2: KẾ HOẠCH SẢN XUẤT TỔNG
  // ========================================================
  // Update Production KPI Cards
  const elPlan = document.getElementById('dmKpiWeekPlan');
  const elFact = document.getElementById('dmKpiWeekFact');
  const elGap = document.getElementById('dmKpiWeekGap');
  const elPlanHours = document.getElementById('dmKpiPlanHours');
  const elRate = document.getElementById('dmKpiWeekRate');
  const elSubPlan = document.getElementById('dmSubPlan');
  const elSubFact = document.getElementById('dmSubFact');
  const elSubGap = document.getElementById('dmSubGap');
  const elSubPlanHours = document.getElementById('dmSubPlanHours');
  const elSubRate = document.getElementById('dmSubRate');

  if (elPlan) elPlan.textContent = schedule.kpis.cumPlanQty.toLocaleString('vi-VN');
  if (elFact) elFact.textContent = schedule.kpis.cumFactQty.toLocaleString('vi-VN');
  if (elGap) {
    elGap.textContent = (schedule.kpis.cumGapQty > 0 ? '+' : '') + schedule.kpis.cumGapQty.toLocaleString('vi-VN');
    elGap.style.color = schedule.kpis.cumGapQty < 0 ? 'var(--danger)' : 'var(--success)';
  }
  if (elPlanHours) elPlanHours.textContent = `${schedule.kpis.cumPlanHours.toLocaleString('vi-VN')} h`;
  if (elRate) elRate.textContent = `${schedule.kpis.cumRate}%`;

  if (elSubPlan) elSubPlan.textContent = `Lũy kế ${selCount}/${totCount} ngày đã chọn`;
  if (elSubFact) elSubFact.textContent = `Đang lọc: ${shiftTitle}`;
  if (elSubGap) elSubGap.textContent = schedule.kpis.cumGapQty < 0 ? `Đang thiếu hụt so với kế hoạch` : `Đạt / Vượt kế hoạch`;
  if (elSubPlanHours) elSubPlanHours.textContent = `Tổng giờ chuẩn định mức (Norm-h)`;
  if (elSubRate) elSubRate.textContent = `Fact Qty / Plan Qty`;

  // Render Production Summary Table
  if (stageSummaryContainer && listToRender.length > 0) {
    const prodTableRows = listToRender.map((sum, sIdx) => {
      const isGrand = sum.isGrandTotal;
      const stageName = sum.stage;
      const stageCls = isGrand ? 'row-stage-total' : '';

      let stageBadgeHtml = '';
      if (isGrand) {
        if (sum.saveStage === 'FPD_TOTAL' || stageName.includes('TỔNG FPD')) {
          stageBadgeHtml = `<span class="badge" style="font-size: 0.775rem; font-weight: 800; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fbbf24;">📦 TỔNG FPD</span>`;
        } else if (sum.saveStage === 'MASTERBOX_TOTAL' || stageName.includes('MASTERBOX')) {
          stageBadgeHtml = `<span class="badge" style="font-size: 0.775rem; font-weight: 800; background: rgba(6, 182, 212, 0.2); border: 1px solid rgba(6, 182, 212, 0.5); color: #22d3ee;">💻 TỔNG MASTERBOX</span>`;
        } else if (sum.saveStage === 'custom_composite' || (stageName.includes('TỔNG HỢP') && !stageName.includes('SFPD'))) {
          stageBadgeHtml = `<span class="badge badge-purple" style="font-size: 0.775rem; font-weight: 800;">🎯 ${stageName}</span>`;
        } else if (sum.isMajorComposite || stageName.includes('SFPD')) {
          stageBadgeHtml = '';
        } else if (sum.isHardtestGroup || stageName.includes('HARD TEST')) {
          stageBadgeHtml = '';
        } else {
          stageBadgeHtml = `<span class="badge badge-blue" style="font-size: 0.775rem; font-weight: 800;">🏭 TOÀN NHÀ MÁY</span>`;
        }
      } else {
        const badgeClass = stageName === 'ASSEMBLY' ? 'badge-blue'
          : stageName === 'HARD TEST' ? 'badge-purple' 
          : stageName === 'OPTICS ASM' ? 'badge-amber'
          : stageName === 'A IMP ASM' ? 'badge-blue'
          : stageName === 'FOCUS' ? 'badge-green'
          : stageName === 'LONG TEST' ? 'badge-amber'
          : stageName === 'TEST ROOM' ? 'badge-cyan'
          : stageName === 'QC' ? 'badge-green'
          : stageName === 'PKG' || stageName === 'COM PKG' ? 'badge-purple'
          : stageName === 'COM PKG AUTO' ? 'badge-indigo'
          : stageName === 'MB' ? 'badge-pink' : 'badge-purple';
        const icon = stageName === 'ASSEMBLY' ? '🔧 '
          : stageName === 'HARD TEST' ? '🔬 '
          : stageName === 'OPTICS ASM' ? '🔭 '
          : stageName === 'A IMP ASM' ? '⚙️ '
          : stageName === 'FOCUS' ? '🎯 '
          : stageName === 'LONG TEST' ? '⏱️ '
          : stageName === 'TEST ROOM' ? '🌡️ '
          : stageName === 'QC' ? '🔍 '
          : stageName === 'PKG' || stageName === 'COM PKG' ? '📦 '
          : stageName === 'COM PKG AUTO' ? '🤖 '
          : stageName === 'MB' ? '💻 ' : '';
        stageBadgeHtml = `<span class="badge ${badgeClass}" style="font-size: 0.75rem;">${icon}${stageName}</span>`;
      }

      // Row 1: Plan Qty
      const planCells = sum.daily.map(d => {
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
        const wkCls = isWk ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #60a5fa; font-size: 0.8rem;" title="Plan Ca Ngày: ${d.planDay}">
              ${d.planDay > 0 ? d.planDay.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #93c5fd; font-size: 0.8rem;" title="Plan Ca Đêm: ${d.planNight}">
              ${d.planNight > 0 ? d.planNight.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #60a5fa; font-size: 0.85rem;">
            ${d.plan > 0 ? d.plan.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
          </td>
        `;
      }).join('');

      // Row 2: Fact Qty
      const factCells = sum.daily.map(d => {
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
        const wkCls = isWk ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #34d399; font-size: 0.8rem;" title="Fact Ca Ngày: ${d.factDay}">
              ${d.factDay > 0 ? d.factDay.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #6ee7b7; font-size: 0.8rem;" title="Fact Ca Đêm: ${d.factNight}">
              ${d.factNight > 0 ? d.factNight.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-weight: 700; color: #34d399; font-size: 0.85rem;">
            ${d.fact > 0 ? d.fact.toLocaleString('vi-VN') : '<span style="color: var(--text-muted);">--</span>'}
          </td>
        `;
      }).join('');

      // Row 3: Gap Qty
      const gapCells = sum.daily.map(d => {
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
        const wkCls = isWk ? 'weekend-cell' : '';
        if (isSplit) {
          const gapDay = (d.factDay || 0) - (d.planDay || 0);
          const gapNight = (d.factNight || 0) - (d.planNight || 0);
          const clsDay = gapDay < 0 ? 'color: var(--danger); font-weight: 700;' : gapDay > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';
          const clsNight = gapNight < 0 ? 'color: var(--danger); font-weight: 700;' : gapNight > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; ${clsDay}">
              ${gapDay !== 0 ? (gapDay > 0 ? '+' : '') + gapDay.toLocaleString('vi-VN') : '0'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; ${clsNight}">
              ${gapNight !== 0 ? (gapNight > 0 ? '+' : '') + gapNight.toLocaleString('vi-VN') : '0'}
            </td>
          `;
        }
        if (d.plan === 0 && d.fact === 0) {
          return `<td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; color: var(--text-muted); font-size: 0.8rem;">--</td>`;
        }
        const cls = d.gap < 0 ? 'color: var(--danger); font-weight: 700;' : d.gap > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; ${cls}">
            ${d.gap !== 0 ? (d.gap > 0 ? '+' : '') + d.gap.toLocaleString('vi-VN') : '0'}
          </td>
        `;
      }).join('');

      // Row 4: Standard Hours (Norm-h)
      const hourCells = sum.daily.map(d => {
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
        const wkCls = isWk ? 'weekend-cell' : '';
        if (isSplit) {
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; color: #22d3ee;" title="Giờ chuẩn Ca Ngày">
              ${d.stdHoursDay > 0 ? d.stdHoursDay + 'h' : '--'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; color: #c084fc;" title="Giờ chuẩn Ca Đêm">
              ${d.stdHoursNight > 0 ? d.stdHoursNight + 'h' : '--'}
            </td>
          `;
        }
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; color: #22d3ee;" title="Giờ chuẩn: ${d.stdHours}h">
            ${d.stdHours > 0 ? d.stdHours + 'h' : '--'}
          </td>
        `;
      }).join('');

      // Row 5: Rate Cells (%)
      const rateCells = sum.daily.map(d => {
        const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
        const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
        const wkCls = isWk ? 'weekend-cell' : '';
        if (isSplit) {
          const rDay = (d.planDay || 0) > 0 ? Math.round(((d.factDay || 0) / d.planDay) * 100) : ((d.factDay || 0) > 0 ? 100 : 0);
          const rNight = (d.planNight || 0) > 0 ? Math.round(((d.factNight || 0) / d.planNight) * 100) : ((d.factNight || 0) > 0 ? 100 : 0);
          const clsDay = rDay >= 100 ? 'color: #34d399;' : rDay >= 80 ? 'color: #60a5fa;' : 'color: #f87171;';
          const clsNight = rNight >= 100 ? 'color: #34d399;' : rNight >= 80 ? 'color: #60a5fa;' : 'color: #f87171;';
          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; font-weight: 700; ${clsDay}">
              ${d.planDay > 0 || d.factDay > 0 ? rDay + '%' : '--'}
            </td>
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.775rem; font-weight: 700; ${clsNight}">
              ${d.planNight > 0 || d.factNight > 0 ? rNight + '%' : '--'}
            </td>
          `;
        }
        const r = d.plan > 0 ? Math.round((d.fact / d.plan) * 100) : (d.fact > 0 ? 100 : 0);
        const cls = r >= 100 ? 'color: #34d399;' : r >= 80 ? 'color: #60a5fa;' : 'color: #f87171;';
        return `
          <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; font-weight: 700; ${cls}">
            ${d.plan > 0 || d.fact > 0 ? r + '%' : '--'}
          </td>
        `;
      }).join('');

      return `
        <!-- Hàng 1: Kế Hoạch Cần -->
        <tr class="${stageCls}" style="border-top: ${sIdx > 0 ? '2px solid var(--border-glass)' : 'none'};">
          <td rowspan="4" class="sticky-col-stt" style="vertical-align: top; padding-top: 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">
            ${sIdx + 1}
          </td>
          <td rowspan="4" class="sticky-col-prod" style="vertical-align: top; padding-top: 0.85rem;">
            <div style="margin-bottom: 0.4rem;">${stageBadgeHtml}</div>
            <div style="font-weight: 800; color: var(--text-primary); font-size: 0.95rem;">${stageName}</div>
            <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Tiến độ: <strong style="color: ${sum.rate >= 100 ? '#34d399' : sum.rate >= 80 ? '#60a5fa' : '#f87171'};">${sum.rate}%</strong>
            </div>
          </td>
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill metric-plan">📋 Kế Hoạch Cần</span>
          </td>
          ${planCells}
          <td class="font-mono week-summary-col" style="font-weight: 800; color: #60a5fa; font-size: 0.9rem; text-align: right;">
            ${sum.cumPlan.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">
            ${sum.avgPlan.toLocaleString('vi-VN')} pcs/ng
          </td>
        </tr>

        <!-- Hàng 2: Thực Tế Đạt -->
        <tr class="${stageCls}">
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill metric-fact">🏭 Thực Tế Đạt</span>
          </td>
          ${factCells}
          <td class="font-mono week-summary-col" style="font-weight: 800; color: #34d399; font-size: 0.9rem; text-align: right;">
            ${sum.cumFact.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #34d399;">
            ${sum.avgFact.toLocaleString('vi-VN')} pcs/ng
          </td>
        </tr>

        <!-- Hàng 3: Chênh Lệch -->
        <tr class="${stageCls}">
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill metric-gap">📉 Chênh Lệch</span>
          </td>
          ${gapCells}
          <td class="font-mono week-summary-col" style="font-weight: 800; font-size: 0.9rem; text-align: right; ${sum.cumGap < 0 ? 'color: var(--danger);' : 'color: var(--success);'}">
            ${sum.cumGap !== 0 ? (sum.cumGap > 0 ? '+' : '') + sum.cumGap.toLocaleString('vi-VN') : '0'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; ${sum.cumGap < 0 ? 'color: var(--danger);' : 'color: var(--success);'}">
            ${sum.cumGap < 0 ? 'Thiếu ' + Math.abs(sum.cumGap).toLocaleString('vi-VN') : 'Đạt'}
          </td>
        </tr>

        <!-- Hàng 4: Tỷ Lệ Đạt (%) -->
        <tr class="${stageCls}" style="border-bottom: 2px solid var(--border-glass);">
          <td class="sticky-col-metric" style="text-align: center;">
            <span class="metric-pill" style="background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.35);">🎯 % Hoàn Thành</span>
          </td>
          ${rateCells}
          <td class="font-mono week-summary-col" style="font-weight: 800; font-size: 0.85rem; text-align: right; color: ${sum.rate >= 100 ? '#34d399' : sum.rate >= 80 ? '#60a5fa' : '#f87171'};">
            ${sum.rate}%
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: ${sum.rate >= 100 ? '#34d399' : sum.rate >= 80 ? '#60a5fa' : '#f87171'};">
            ${sum.rate >= 100 ? '✅ Hoàn thành' : (sum.rate >= 80 ? '⚡ Tiến độ tốt' : '⚠️ Cần đẩy mạnh')}
          </td>
        </tr>
      `;
    }).join('');

    stageSummaryContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th class="sticky-col-stt">STT</th>
            <th class="sticky-col-prod">Công Đoạn (Stage)</th>
            <th class="sticky-col-metric" style="text-align: center; width: 140px;">Chỉ Tiêu / Ngày</th>
            ${dayHeaders}
            <th class="week-summary-header" style="text-align: right; min-width: 120px;">
              TỔNG LŨY KẾ<br>
              <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày)</span>
            </th>
            <th style="text-align: right; min-width: 120px;">
              BÌNH QUÂN / NGÀY<br>
              <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(Mỗi ngày)</span>
            </th>
          </tr>
          ${isSplit ? splitSubHeader : ''}
        </thead>
        <tbody>${prodTableRows}</tbody>
      </table>
    `;
  }

  // ========================================================
  // RENDER BẢNG 2: CHI TIẾT CÁC MODEL THEO TỪNG CÔNG ĐOẠN
  // ========================================================
  const itemCountEl = document.getElementById('datamassModelItemCount');
  if (itemCountEl) {
    itemCountEl.innerHTML = `Đang hiển thị <strong>${schedule.items.length}</strong> Model (Mã 1C) ${selectedStage !== 'ALL' ? 'thuộc <strong>' + selectedStage + '</strong>' : ''} <span class="badge badge-amber" style="font-size: 0.725rem; margin-left: 0.5rem; font-weight: 600;" title="Kế hoạch nhân lực cần được lấy từ dòng Product name 1C = People trong sheet Data_Mass">👷 Kế hoạch nhân lực: lấy từ dòng 1C = People (${schedule.kpis.avgManpower.toLocaleString('vi-VN')} người/ng)</span>`;
    if (window.updateTable2CompactSummary) window.updateTable2CompactSummary();
  }

  // Update view mode toggle active class
  const table2ViewMode = window.AppStore.table2ViewMode || 'CUMULATIVE';
  const btnDaily = document.getElementById('btnTable2Daily');
  const btnCumulative = document.getElementById('btnTable2Cumulative');
  if (btnDaily && btnCumulative) {
    if (table2ViewMode === 'CUMULATIVE') {
      btnDaily.classList.remove('active');
      btnCumulative.classList.add('active');
    } else {
      btnDaily.classList.add('active');
      btnCumulative.classList.remove('active');
    }
  }

  // Subheader row for SPLIT shift mode (5 columns before dates: STT, Công Đoạn, Group Model, Model 1C, Loại; 1 column after dates: Tổng Lũy Kế)
  const splitSubHeaderRow = isSplit ? `
    <tr class="split-shift-row">
      <th class="sticky-t2-stt" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-t2-stage" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-t2-group" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-t2-model" style="border-top: 1px solid var(--border-glass);"></th>
      <th class="sticky-t2-type" style="border-top: 1px solid var(--border-glass);"></th>
      ${schedule.dates.map(d => {
        const rot = window.getShiftRotation(d);
        return `
          <th style="text-align: center; padding: 0.35rem 0.2rem;">
            <div class="badge-day-sub" title="Ca Ngày: Kíp ${rot.day} trực">
              ☀️ Day <span class="badge-shift-pill shift-${rot.day.toLowerCase()}">${rot.day}</span>
            </div>
          </th>
          <th style="text-align: center; padding: 0.35rem 0.2rem;">
            <div class="badge-night-sub" title="Ca Đêm: Kíp ${rot.night} trực">
              🌙 Night <span class="badge-shift-pill shift-${rot.night.toLowerCase()}">${rot.night}</span>
            </div>
          </th>
        `;
      }).join('')}
      <th class="week-summary-col" style="border-top: 1px solid var(--border-glass);"></th>
      <th style="border-top: 1px solid var(--border-glass);"></th>
      <th style="border-top: 1px solid var(--border-glass);"></th>
    </tr>
  ` : '';

  if (viewMode === 'MANPOWER') {
    // Manpower Matrix Table
    if (schedule.manpower.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Không tìm thấy dữ liệu nhân lực cho công đoạn này</div>`;
      return;
    }

    const tableRows = schedule.manpower.map((mp, idx) => {
      const isTotal = mp.stage === 'ALL' || mp.stage.startsWith('SUM');
      const rowStyle = isTotal ? 'font-weight: 800; background: rgba(59, 130, 246, 0.08);' : '';
      return `
        <tr style="${rowStyle}">
          <td class="sticky-col-stt" style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
          <td class="sticky-col-prod">
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">${mp.stage}</div>
          </td>
          <td style="text-align: center;">--</td>
          <td style="text-align: center;">
            <span class="badge ${mp.metric === 'People' ? 'badge-blue' : 'badge-purple'}">${mp.metric === 'People' ? '👷 Nhân Lực' : '⏱️ Số Giờ'}</span>
          </td>
          ${mp.daily.map(d => `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'}" style="text-align: right; padding: 0.25rem 0.35rem;">
              <input type="number" 
                     class="daily-edit-input input-plan" 
                     value="${d.val || ''}" 
                     placeholder="0" 
                     step="0.1" 
                     title="Sửa ${mp.metric} ngày ${d.date}" 
                     onchange="handleDailyManpowerEdit('${encodeURIComponent(mp.stage)}', '${encodeURIComponent(mp.metric)}', '${d.date}', this.value, this)"
              />
            </td>
          `).join('')}
          <td class="font-mono" style="text-align: right; font-weight: 700;">
            ${mp.cumSum.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono week-summary-col" style="font-weight: 800; color: #60a5fa;">
            ${mp.cumAvg.toLocaleString('vi-VN')} ${mp.metric === 'People' ? 'người' : 'h'}
          </td>
          <td style="text-align: center;">--</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th class="sticky-col-stt">STT</th>
            <th class="sticky-col-prod">Công Đoạn (Stage)</th>
            <th style="text-align: center; width: 80px;">Norm (s)</th>
            <th style="text-align: center; width: 100px;">Chỉ Tiêu</th>
            ${dayHeaders}
            <th style="text-align: right;">TỔNG LŨY KẾ</th>
            <th class="week-summary-header">TRUNG BÌNH / NGÀY<br><span style="font-size: 0.65rem; color: #94a3b8; font-weight: normal;">(${selCount} ngày chọn)</span></th>
            <th style="text-align: center;">--</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  } else {
    // Model Details Table with Norm and Inline Plan/Fact Edits
    if (schedule.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">Không tìm thấy sản phẩm hoặc Model phù hợp</div>
          <div style="font-size: 0.85rem;">Thử đổi bộ lọc <strong>Model</strong>, chuyển bộ lọc <strong>Kế hoạch</strong> sang <em>"Tất cả Model"</em>, hoặc xóa từ khóa tìm kiếm.</div>
        </div>
      `;
      return;
    }

    // Pagination
    const pageSize = window.AppStore.datamassPageSize || 50;
    const totalItems = schedule.items.length;
    const maxPage = pageSize === 0 ? 0 : Math.max(0, Math.ceil(totalItems / pageSize) - 1);
    const currentPage = Math.min(window.AppStore.datamassPageIndex || 0, maxPage);
    const startIndex = pageSize === 0 ? 0 : currentPage * pageSize;
    const endIndex = pageSize === 0 ? totalItems : Math.min(startIndex + pageSize, totalItems);
    const pagedItems = pageSize === 0 ? schedule.items : schedule.items.slice(startIndex, endIndex);

    // Pagination Component
    const paginationHtml = `
      <div class="pagination-container">
        <div class="pagination-info">
          Hiển thị từ <strong>${totalItems > 0 ? startIndex + 1 : 0}</strong> - <strong>${endIndex}</strong> trên tổng số <strong>${totalItems}</strong> Model (Mã 1C)
        </div>

        <div class="pagination-controls">
          <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} onclick="handleDataMassPageChange(0)" title="Trang đầu">&laquo;</button>
          <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} onclick="handleDataMassPageChange(${currentPage - 1})" title="Trang trước">&lsaquo; Trước</button>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin: 0 0.5rem;">
            Trang ${currentPage + 1} / ${maxPage + 1}
          </span>
          <button class="pagination-btn" ${currentPage >= maxPage ? 'disabled' : ''} onclick="handleDataMassPageChange(${currentPage + 1})" title="Trang sau">Sau &rsaquo;</button>
          <button class="pagination-btn" ${currentPage >= maxPage ? 'disabled' : ''} onclick="handleDataMassPageChange(${maxPage})" title="Trang cuối">&raquo;</button>
        </div>

        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="font-size: 0.775rem; color: var(--text-muted);">Hiển thị:</span>
          <select class="select-filter font-mono" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onchange="handleDataMassPageSizeChange(this.value)">
            <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 dòng</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 dòng</option>
            <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 dòng</option>
            <option value="0" ${pageSize === 0 ? 'selected' : ''}>Tất cả (${totalItems})</option>
          </select>
        </div>
      </div>
    `;

    // Helper: Fast unique hash for element id
    const getShortageListId = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 'sr_list_' + Math.abs(hash).toString(36);
    };

    // Helper: Render chi tiết nguyên nhân thiếu hụt sản lượng từ Mass-History
    const renderShortageReasonsCell = (it) => {
      const sr = it.shortageReasons || { items: [], uniqueReasons: [], totalGap: 0, hasReasons: false };
      const isDeficit = (it.cumGapQty < 0);

      // Trường hợp 1: Không bị thiếu hụt (Gap >= 0)
      if (!isDeficit) {
        if (it.cumPlanQty > 0 && it.cumFactQty >= it.cumPlanQty) {
          return `<div style="color: #64748b; font-size: 0.75rem; font-style: italic;">— (Đạt / Vượt kế hoạch)</div>`;
        }
        if (it.cumPlanQty === 0 && it.cumFactQty > 0) {
          return `<div style="color: #60a5fa; font-size: 0.75rem; font-style: italic;">⚡ Sản xuất ngoài kế hoạch</div>`;
        }
        return `<div style="color: #64748b; font-size: 0.75rem;">—</div>`;
      }

      // Trường hợp 2: Có thiếu hụt (Gap < 0)
      if (!sr.hasReasons && sr.items.length === 0) {
        return `
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span class="badge" style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; font-size: 0.72rem; padding: 0.2rem 0.5rem; font-weight: 700;">
              ⚠️ Thiếu hụt — Chưa cập nhật lý do
            </span>
          </div>
        `;
      }

      // Lọc các bản ghi có lý do hoặc chênh lệch âm
      const reasonItems = sr.items.filter(r => r.reason && r.reason.trim());
      const displayItems = reasonItems.length > 0 ? reasonItems : sr.items;
      const visibleCount = Math.min(2, displayItems.length);
      const hiddenCount = displayItems.length - visibleCount;

      const renderReasonCard = (r) => {
        let dateLabel = r.rawDate || r.date;
        if (r.date && r.date.includes('-')) {
          const p = r.date.split('-');
          dateLabel = `${p[2]}/${p[1]}`;
        }
        const shiftLabel = (r.shift === 'day' || r.shift === 'Day') ? '☀️ Ngày' : '🌙 Đêm';
        const gapVal = r.gap !== undefined ? r.gap : (r.gapQty || 0);
        const gapStr = (gapVal < 0) ? ` (${gapVal.toLocaleString('vi-VN')})` : (gapVal > 0 ? ` (+${gapVal.toLocaleString('vi-VN')})` : '');
        const lineStr = r.line ? ` [${r.line}]` : '';

        return `
          <div class="shortage-reason-item" style="font-size: 0.735rem; line-height: 1.35; padding: 0.25rem 0.5rem; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; color: #fca5a5; margin-bottom: 0.2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; margin-bottom: 0.1rem;">
              <span style="font-weight: 700; color: #f87171; font-size: 0.7rem;">
                📅 ${dateLabel} · ${shiftLabel}${lineStr}
              </span>
              <span style="font-family: monospace; font-weight: 800; color: #ef4444; font-size: 0.72rem;">
                ${gapStr}
              </span>
            </div>
            <div style="color: #f1f5f9; font-size: 0.735rem; word-break: break-word;">
              ${r.reason || 'Chưa có ghi chú chi tiết'}
            </div>
          </div>
        `;
      };

      const topItemsHtml = displayItems.slice(0, visibleCount).map(renderReasonCard).join('');
      const hiddenItemsHtml = hiddenCount > 0 ? displayItems.slice(visibleCount).map(renderReasonCard).join('') : '';
      const listId = getShortageListId((it.productName1C || '') + '_' + (it.stage || ''));

      return `
        <div class="shortage-reasons-wrap" style="display: flex; flex-direction: column; gap: 0.2rem; min-width: 270px; max-width: 380px;">
          ${displayItems.length > 1 ? `
            <div style="font-size: 0.675rem; color: #94a3b8; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; margin-bottom: 0.05rem;">
              <span>📋 Tổng hợp ${displayItems.length} ca có ghi nhận lý do:</span>
              <button type="button" 
                      onclick="openModelShortageHistoryModal('${encodeURIComponent(it.productName1C)}', '${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.specCode || '')}')" 
                      title="Mở toàn bộ danh sách ở dạng bảng chi tiết (Popup Modal)"
                      style="background: transparent; border: none; color: #38bdf8; font-size: 0.675rem; font-weight: 700; cursor: pointer; padding: 0; text-decoration: underline;">
                Bảng chi tiết ↗
              </button>
            </div>
          ` : ''}
          ${topItemsHtml}
          ${hiddenCount > 0 ? `
            <div id="${listId}" class="more-shortage-list" style="display: none; max-height: 280px; overflow-y: auto; padding-right: 4px; border-top: 1px dashed rgba(239, 68, 68, 0.35); padding-top: 0.3rem; margin-top: 0.1rem;">
              ${hiddenItemsHtml}
            </div>
            <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem; flex-wrap: wrap;">
              <button type="button" 
                      id="btn-toggle-${listId}"
                      class="btn-more-reasons" 
                      onclick="toggleShortageReasonsList('${listId}', ${hiddenCount})" 
                      style="background: rgba(147, 51, 234, 0.15); border: 1px dashed rgba(147, 51, 234, 0.5); color: #c084fc; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; text-align: left; transition: all 0.2s ease;">
                🔍 Xem thêm +${hiddenCount} lý do khác trong kỳ...
              </button>
              <button type="button" 
                      onclick="openModelShortageHistoryModal('${encodeURIComponent(it.productName1C)}', '${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.specCode || '')}')" 
                      title="Mở toàn bộ danh sách ở dạng bảng chi tiết (Popup Modal)"
                      style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 0.675rem; font-weight: 700; padding: 0.2rem 0.45rem; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                📋 Popup ↗
              </button>
            </div>
          ` : ''}
        </div>
      `;
    };

    // Helper: Render cột Đánh giá tiến độ & trạng thái
    const renderEvaluationCell = (it) => {
      const sr = it.shortageReasons || { items: [], uniqueReasons: [], totalGap: 0, hasReasons: false };
      let statusBadge = '';
      let subTag = '';

      if (it.cumGapQty < 0) {
        statusBadge = `<span class="badge badge-red" style="font-weight: 800; font-size: 0.75rem;">⚠️ Thiếu ${Math.abs(it.cumGapQty).toLocaleString('vi-VN')}</span>`;
        if (sr.hasReasons) {
          subTag = `<div style="font-size: 0.675rem; color: #38bdf8; margin-top: 0.25rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.2rem;">
            <span>✓ Đã giải trình</span> <span style="background: rgba(56, 189, 248, 0.2); padding: 0.05rem 0.3rem; border-radius: 9999px;">${sr.uniqueReasons.length}</span>
          </div>`;
        } else {
          subTag = `<div style="font-size: 0.675rem; color: #f59e0b; margin-top: 0.25rem; font-weight: 700;">
            ⚡ Cần giải trình
          </div>`;
        }
      } else if (it.cumPlanQty > 0 && it.cumFactQty >= it.cumPlanQty) {
        statusBadge = `<span class="badge badge-green" style="font-weight: 800; font-size: 0.75rem;">✅ Đạt ${it.cumGapQty > 0 ? '(+' + it.cumGapQty.toLocaleString('vi-VN') + ')' : '100%'}</span>`;
        subTag = `<div style="font-size: 0.675rem; color: #34d399; margin-top: 0.25rem; font-weight: 600;">Đạt tiến độ</div>`;
      } else if (it.cumPlanQty === 0 && it.cumFactQty > 0) {
        statusBadge = `<span class="badge badge-blue" style="font-weight: 800; font-size: 0.75rem;">⚡ Ngoài KH (+${it.cumFactQty.toLocaleString('vi-VN')})</span>`;
        subTag = `<div style="font-size: 0.675rem; color: #60a5fa; margin-top: 0.25rem; font-weight: 600;">Sản xuất thêm</div>`;
      } else {
        statusBadge = `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted); font-size: 0.75rem;">Chưa sản xuất</span>`;
        subTag = `<div style="font-size: 0.675rem; color: #64748b; margin-top: 0.25rem;">Chờ triển khai</div>`;
      }

      return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          ${statusBadge}
          ${subTag}
        </div>
      `;
    };

    window.toggleShortageReasonsList = function(listId, hiddenCount) {
      const listEl = document.getElementById(listId);
      const btnEl = document.getElementById(`btn-toggle-${listId}`);
      if (!listEl) return;
      const isHidden = listEl.style.display === 'none' || !listEl.style.display;
      listEl.style.display = isHidden ? 'block' : 'none';
      if (btnEl) {
        btnEl.innerHTML = isHidden ? `🔼 Thu gọn (${hiddenCount} lý do)` : `🔍 Xem thêm +${hiddenCount} lý do khác trong kỳ...`;
      }
    };

    window.openModelShortageHistoryModal = function(encodedModel, encodedStage, encodedSpecCode) {
      const model = decodeURIComponent(encodedModel || '');
      const stage = decodeURIComponent(encodedStage || '');
      const specCode = encodedSpecCode ? decodeURIComponent(encodedSpecCode) : '';
      const modal = document.getElementById('shortageHistoryModal');
      if (!modal) return;

      const titleSub = document.getElementById('shortageModalSubTitle');
      const badge = document.getElementById('shortageModalBadge');
      const content = document.getElementById('shortageModalContent');

      if (titleSub) {
        titleSub.textContent = `Model: ${model}${stage ? ' (' + stage + ')' : ''}${specCode ? ' - ' + specCode : ''}`;
      }

      let historyList = [];
      const selectedDates = (window.AppStore && window.AppStore.selectedDates) ? window.AppStore.selectedDates : [];
      if (window.productionDataService && typeof window.productionDataService.getShortageReasons === 'function') {
        const srObj = window.productionDataService.getShortageReasons({
          stage,
          model,
          productName1C: model,
          specCode,
          dates: selectedDates,
          shift: (window.AppStore && window.AppStore.shiftFilter) || 'ALL'
        });
        if (srObj && srObj.items && srObj.items.length > 0) {
          historyList = srObj.items.slice();
        }
      }

      if (historyList.length === 0) {
        const cleanModel = (model || '').toLowerCase().trim();
        const allHist = window.MASS_HISTORY_DATA || (window.AppStore && window.AppStore.massHistory) || [];
        historyList = allHist.filter(h => {
          const hp = (h.productName1C || '').toLowerCase().trim();
          const hm = (h.modelName || '').toLowerCase().trim();
          const matchModel = (hp && (hp === cleanModel || cleanModel.includes(hp) || hp.includes(cleanModel))) ||
                             (hm && (hm === cleanModel || cleanModel.includes(hm) || hm.includes(cleanModel)));
          return matchModel && (h.gapQty < 0 || (h.shortageReason && h.shortageReason.trim() !== ''));
        });
      }

      if (badge) {
        badge.textContent = `${historyList.length} ca có ghi nhận`;
      }

      if (historyList.length === 0) {
        content.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">ℹ️</div>
            <div>Không có bản ghi thiếu hụt cụ thể nào trong Sheet Mass-History cho Model này.</div>
          </div>
        `;
      } else {
        // Sort by date desc
        historyList.sort((a, b) => new Date(b.date) - new Date(a.date));

        let html = `
          <table class="data-table" style="width: 100%; font-size: 0.8rem;">
            <thead>
              <tr>
                <th style="width: 95px; text-align: center;">Ngày Làm</th>
                <th style="width: 75px; text-align: center;">Ca</th>
                <th style="width: 80px; text-align: center;">Line</th>
                <th style="width: 80px; text-align: right;">KH (Plan)</th>
                <th style="width: 80px; text-align: right;">TT (Fact)</th>
                <th style="width: 80px; text-align: right;">Thiếu Hụt</th>
                <th style="text-align: left;">Nguyên Nhân Cụ Thể (Mass-History)</th>
              </tr>
            </thead>
            <tbody>
        `;

        historyList.forEach(item => {
          const shiftName = (item.shift === 'Day' || item.shift === 'DAY') ? '☀️ Ngày' : '🌙 Đêm';
          const gapColor = (item.gapQty || 0) < 0 ? '#f87171' : '#34d399';
          html += `
            <tr>
              <td style="text-align: center; font-weight: 600;">${item.date || '-'}</td>
              <td style="text-align: center;"><span class="badge ${item.shift === 'Day' || item.shift === 'DAY' ? 'badge-amber' : 'badge-purple'}">${shiftName}</span></td>
              <td style="text-align: center; font-weight: 600; color: #38bdf8;">${item.line || '-'}</td>
              <td style="text-align: right; font-family: monospace;">${(item.planQty || 0).toLocaleString('vi-VN')}</td>
              <td style="text-align: right; font-family: monospace;">${(item.factQty || 0).toLocaleString('vi-VN')}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: ${gapColor};">
                ${(item.gapQty || 0) < 0 ? (item.gapQty || 0).toLocaleString('vi-VN') : '+' + (item.gapQty || 0).toLocaleString('vi-VN')}
              </td>
              <td style="text-align: left; color: #fecdd3; line-height: 1.4;">
                ${item.shortageReason ? `⚠️ <b>${item.shortageReason}</b>` : '<span style="color: #64748b; font-style: italic;">Chưa ghi nhận nguyên nhân</span>'}
              </td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;

        content.innerHTML = html;
      }

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    window.closeModelShortageHistoryModal = function() {
      const modal = document.getElementById('shortageHistoryModal');
      if (modal) modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };

    if (table2ViewMode === 'CUMULATIVE') {
      // ========================================================
      // CHẾ ĐỘ 1: CHỈ XEM TỔNG LŨY KẾ (THEO CÁC NGÀY ĐÃ CHỌN)
      // ========================================================
      const grandPlan = schedule.items.reduce((acc, it) => acc + (it.cumPlanQty || 0), 0);
      const grandFact = schedule.items.reduce((acc, it) => acc + (it.cumFactQty || 0), 0);
      const grandGap = grandFact - grandPlan;
      const totalDeficitModels = schedule.items.filter(it => it.cumGapQty < 0).length;
      const totalExplainedModels = schedule.items.filter(it => it.cumGapQty < 0 && it.shortageReasons && it.shortageReasons.hasReasons).length;

      const tableRows = pagedItems.map((it, pIdx) => {
        const idx = startIndex + pIdx;
        const stageBadgeClass = it.stage === 'ASSEMBLY' ? 'badge-blue' :
                                it.stage === 'HARD TEST' ? 'badge-purple' :
                                it.stage === 'OPTICS ASM' ? 'badge-amber' :
                                it.stage === 'A IMP ASM' ? 'badge-blue' :
                                it.stage === 'FOCUS' ? 'badge-green' : 'badge-purple';

        const stageIcon = it.stage === 'ASSEMBLY' ? '🔧 ' :
                          it.stage === 'HARD TEST' ? '⚡ ' :
                          it.stage === 'OPTICS ASM' ? '🔬 ' :
                          it.stage === 'FOCUS' ? '🎯 ' :
                          it.stage === 'A IMP ASM' ? '⚙️ ' : '';

        const shortageCellHtml = renderShortageReasonsCell(it);
        const evalCellHtml = renderEvaluationCell(it);
        const gapColor = it.cumGapQty < 0 ? 'color: var(--danger);' : it.cumGapQty > 0 ? 'color: var(--success);' : 'color: var(--text-muted);';

        return `
          <tr class="hover-row">
            <td class="sticky-t2-stt" style="color: var(--text-muted); font-size: 0.75rem; text-align: center;">${idx + 1}</td>
            <td class="sticky-t2-stage" style="text-align: center; white-space: nowrap;">
              <span class="badge ${stageBadgeClass}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                <span>${stageIcon}</span><span>${it.stage}</span>
              </span>
            </td>
            <td class="sticky-t2-group" style="white-space: nowrap;">
              <div style="font-weight: 800; color: #f8fafc; font-size: 0.875rem;">
                ${it.model || '--'}
              </div>
            </td>
            <td class="sticky-t2-model sticky-t2-model-end" style="min-width: 260px;">
              <div style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.775rem; font-weight: 600; color: #93c5fd; word-break: break-all; line-height: 1.45;">
                ${it.productName1C}
              </div>
            </td>
            <td class="font-mono week-summary-col" style="text-align: right; font-weight: 700; color: #60a5fa; font-size: 0.9rem;">
              ${it.cumPlanQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono week-summary-col" style="text-align: right; font-weight: 700; color: #34d399; font-size: 0.9rem;">
              ${it.cumFactQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono week-summary-col" style="text-align: right; font-weight: 800; font-size: 0.9rem; ${gapColor}">
              ${it.cumGapQty !== 0 ? (it.cumGapQty > 0 ? '+' : '') + it.cumGapQty.toLocaleString('vi-VN') : '0'}
            </td>
            <td style="vertical-align: middle; padding: 0.4rem 0.6rem;">
              ${shortageCellHtml}
            </td>
            <td style="text-align: center; vertical-align: middle; padding: 0.4rem 0.5rem;">
              ${evalCellHtml}
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th class="sticky-t2-stt" style="width: 45px; text-align: center;">STT</th>
              <th class="sticky-t2-stage" style="text-align: center; min-width: 110px;">Công Đoạn</th>
              <th class="sticky-t2-group" style="min-width: 130px;">Group Model</th>
              <th class="sticky-t2-model sticky-t2-model-end" style="min-width: 260px;">Model (Mã 1C)</th>
              <th class="week-summary-header" style="text-align: right; min-width: 125px; color: #60a5fa;">
                KẾ HOẠCH (PLAN)<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày chọn)</span>
              </th>
              <th class="week-summary-header" style="text-align: right; min-width: 125px; color: #34d399;">
                THỰC TẾ (FACT)<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày chọn)</span>
              </th>
              <th class="week-summary-header" style="text-align: right; min-width: 125px;">
                CHÊNH LỆCH (GAP)<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(Fact - Plan)</span>
              </th>
              <th style="text-align: left; min-width: 280px; max-width: 380px; background: rgba(239, 68, 68, 0.12); border-left: 2px solid #ef4444;">
                NGUYÊN NHÂN ÂM (THEO CA & NGÀY)<br>
                <span style="font-size: 0.75rem; font-weight: 600; color: #fca5a5;">(Cập nhật từ Sheet Mass-History)</span>
              </th>
              <th style="text-align: center; min-width: 145px; background: rgba(56, 189, 248, 0.12); border-left: 1px solid rgba(56, 189, 248, 0.3);">
                ĐÁNH GIÁ<br>
                <span style="font-size: 0.75rem; font-weight: 600; color: #7dd3fc;">(Tiến độ & Trạng thái)</span>
              </th>
            </tr>
            <!-- HÀNG TỔNG CỘNG CHUYỂN LÊN TRÊN & ĐÓNG BĂNG CÙNG TIÊU ĐỀ -->
            <tr class="sticky-grand-total-row">
              <th colspan="4" class="sticky-grand-total-label" style="text-align: right; padding: 0.65rem 1rem;">
                TỔNG CỘNG (${schedule.items.length} MODEL):
              </th>
              <th class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.95rem; font-weight: 800;">
                ${grandPlan.toLocaleString('vi-VN')}
              </th>
              <th class="font-mono" style="text-align: right; color: #34d399; font-size: 0.95rem; font-weight: 800;">
                ${grandFact.toLocaleString('vi-VN')}
              </th>
              <th class="font-mono" style="text-align: right; font-size: 0.95rem; font-weight: 800; ${grandGap < 0 ? 'color: var(--danger);' : grandGap > 0 ? 'color: var(--success);' : 'color: var(--text-muted);'}">
                ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'}
              </th>
              <th style="text-align: left; font-size: 0.8rem; color: #94a3b8; padding: 0.5rem 0.75rem; font-weight: 700;">
                ${totalDeficitModels > 0 ? `<span style="color: #fca5a5; font-weight: 700;">⚠️ ${totalDeficitModels} Model thiếu hụt</span> (${totalExplainedModels} đã ghi nhận lý do)` : `<span style="color: #34d399; font-weight: 700;">✅ Tất cả đạt tiến độ</span>`}
              </th>
              <th style="text-align: center;">
                <span class="badge ${grandGap < 0 ? 'badge-red' : 'badge-green'}" style="font-weight: 800;">
                  ${grandGap < 0 ? `⚠️ Thiếu ${Math.abs(grandGap).toLocaleString('vi-VN')}` : `✅ Đạt ${grandPlan > 0 ? Math.round(grandFact/grandPlan*100) + '%' : '100%'}`}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ${paginationHtml}
      `;
    } else {
      // ========================================================
      // CHẾ ĐỘ 2: CHI TIẾT THEO NGÀY (PLAN, FACT, GAP)
      // ========================================================
      const tableRows = pagedItems.map((it, pIdx) => {
        const idx = startIndex + pIdx;

        // 1. Plan Cells
        const planCells = it.daily.map(d => {
          const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
          const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
          const wkCls = isWk ? 'weekend-cell' : '';
          if (isSplit) {
            return `
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
                <input type="number" 
                       class="daily-edit-input input-plan" 
                       style="width: 60px; font-size: 0.775rem;"
                       value="${d.planDay || ''}" 
                       placeholder="0" 
                       min="0"
                       title="Plan Ca Ngày: ${d.date}" 
                       onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'plan', '${d.date}', 'DAY', this.value, this)"
                />
              </td>
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
                <input type="number" 
                       class="daily-edit-input input-plan" 
                       style="width: 60px; font-size: 0.775rem;"
                       value="${d.planNight || ''}" 
                       placeholder="0" 
                       min="0"
                       title="Plan Ca Đêm: ${d.date}" 
                       onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'plan', '${d.date}', 'NIGHT', this.value, this)"
                />
              </td>
            `;
          }

          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
              <input type="number" 
                     class="daily-edit-input input-plan" 
                     value="${d.plan || ''}" 
                     placeholder="0" 
                     min="0"
                     title="Kế hoạch ngày ${d.date} (${shiftFilter})" 
                     onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'plan', '${d.date}', '${shiftFilter}', this.value, this)"
              />
            </td>
          `;
        }).join('');

        // 2. Fact Cells
        const factCells = it.daily.map(d => {
          const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
          const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
          const wkCls = isWk ? 'weekend-cell' : '';
          if (isSplit) {
            return `
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
                <input type="number" 
                       class="daily-edit-input input-fact" 
                       style="width: 60px; font-size: 0.775rem;"
                       value="${d.factDay || ''}" 
                       placeholder="0" 
                       min="0"
                       title="Fact Ca Ngày: ${d.date}" 
                       onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'fact', '${d.date}', 'DAY', this.value, this)"
                />
              </td>
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.2rem 0.25rem;">
                <input type="number" 
                       class="daily-edit-input input-fact" 
                       style="width: 60px; font-size: 0.775rem;"
                       value="${d.factNight || ''}" 
                       placeholder="0" 
                       min="0"
                       title="Fact Ca Đêm: ${d.date}" 
                       onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'fact', '${d.date}', 'NIGHT', this.value, this)"
                />
              </td>
            `;
          }

          return `
            <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; padding: 0.25rem 0.35rem;">
              <input type="number" 
                     class="daily-edit-input input-fact" 
                     value="${d.fact || ''}" 
                     placeholder="0" 
                     min="0"
                     title="Thực tế ngày ${d.date} (${shiftFilter})" 
                     onchange="handleDailyCellEdit('${encodeURIComponent(it.stage)}', '${encodeURIComponent(it.model)}', '${encodeURIComponent(it.productName1C)}', 'fact', '${d.date}', '${shiftFilter}', this.value, this)"
              />
            </td>
          `;
        }).join('');

        // 3. Gap Cells
        const gapCells = it.daily.map(d => {
          const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
          const isWk = (dObj.getDay() === 0 || dObj.getDay() === 6);
          const wkCls = isWk ? 'weekend-cell' : '';
          if (isSplit) {
            const gapDay = (d.factDay || 0) - (d.planDay || 0);
            const gapNight = (d.factNight || 0) - (d.planNight || 0);
            const clsDay = gapDay < 0 ? 'color: var(--danger); font-weight: 700;' : gapDay > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';
            const clsNight = gapNight < 0 ? 'color: var(--danger); font-weight: 700;' : gapNight > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';

            return `
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.75rem; ${clsDay}">
                ${gapDay !== 0 ? (gapDay > 0 ? '+' : '') + gapDay.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.75rem; ${clsNight}">
                ${gapNight !== 0 ? (gapNight > 0 ? '+' : '') + gapNight.toLocaleString('vi-VN') : '0'}
              </td>
            `;
          }

          if (d.plan === 0 && d.fact === 0) {
            return `<td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; color: var(--text-muted); font-size: 0.8rem;">--</td>`;
          }
          const cls = d.gap < 0 ? 'color: var(--danger); font-weight: 700;' : d.gap > 0 ? 'color: var(--success); font-weight: 700;' : 'color: var(--text-muted);';
          return `<td class="font-mono ${d.isSelected ? '' : 'day-col-inactive'} ${wkCls}" style="text-align: right; font-size: 0.8rem; ${cls}">${d.gap !== 0 ? (d.gap > 0 ? '+' : '') + d.gap.toLocaleString('vi-VN') : '0'}</td>`;
        }).join('');

        const stageBadgeClass = it.stage === 'ASSEMBLY' ? 'badge-blue' :
                                it.stage === 'HARD TEST' ? 'badge-purple' :
                                it.stage === 'OPTICS ASM' ? 'badge-amber' :
                                it.stage === 'A IMP ASM' ? 'badge-blue' :
                                it.stage === 'FOCUS' ? 'badge-green' : 'badge-purple';

        const stageIcon = it.stage === 'ASSEMBLY' ? '🔧 ' :
                          it.stage === 'HARD TEST' ? '⚡ ' :
                          it.stage === 'OPTICS ASM' ? '🔬 ' :
                          it.stage === 'FOCUS' ? '🎯 ' :
                          it.stage === 'A IMP ASM' ? '⚙️ ' : '';

        return `
          <!-- Row 1: Plan Qty -->
          <tr class="row-plan">
            <td rowspan="3" class="sticky-t2-stt" style="color: var(--text-muted); font-size: 0.75rem; vertical-align: top; padding-top: 0.85rem; border-bottom: 2px solid var(--border-glass);">${idx + 1}</td>
            
            <!-- Cột 1: Công Đoạn -->
            <td rowspan="3" class="sticky-t2-stage" style="text-align: center; vertical-align: top; padding-top: 0.85rem; border-bottom: 2px solid var(--border-glass); white-space: nowrap;">
              <span class="badge ${stageBadgeClass}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                <span>${stageIcon}</span><span>${it.stage}</span>
              </span>
            </td>

            <!-- Cột 2: Group Model -->
            <td rowspan="3" class="sticky-t2-group" style="vertical-align: top; padding-top: 0.85rem; border-bottom: 2px solid var(--border-glass); white-space: nowrap;">
              <div style="font-weight: 800; color: #f8fafc; font-size: 0.875rem; letter-spacing: -0.01em;">
                ${it.model || '--'}
              </div>
            </td>

            <!-- Cột 3: Model (Mã 1C) -->
            <td rowspan="3" class="sticky-t2-model" style="vertical-align: top; padding-top: 0.85rem; border-bottom: 2px solid var(--border-glass); min-width: 260px;">
              <div style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.775rem; font-weight: 600; color: #93c5fd; word-break: break-all; line-height: 1.45;">
                ${it.productName1C}
              </div>
            </td>

            <td class="sticky-t2-type" style="text-align: center;"><span class="type-indicator type-plan">Plan</span></td>
            ${planCells}
            <td class="font-mono week-summary-col" style="font-weight: 700; color: #60a5fa; font-size: 0.9rem; text-align: right;">
              ${it.cumPlanQty.toLocaleString('vi-VN')}
            </td>
            <td rowspan="3" style="vertical-align: middle; padding: 0.4rem 0.6rem; border-bottom: 2px solid var(--border-glass);">
              ${renderShortageReasonsCell(it)}
            </td>
            <td rowspan="3" style="text-align: center; vertical-align: middle; padding: 0.4rem 0.5rem; border-bottom: 2px solid var(--border-glass);">
              ${renderEvaluationCell(it)}
            </td>
          </tr>

          <!-- Row 2: Fact Qty -->
          <tr class="row-fact">
            <td class="sticky-t2-type" style="text-align: center;"><span class="type-indicator type-fact">Fact</span></td>
            ${factCells}
            <td class="font-mono week-summary-col" style="font-weight: 700; color: #34d399; font-size: 0.9rem; text-align: right;">
              ${it.cumFactQty.toLocaleString('vi-VN')}
            </td>
          </tr>

          <!-- Row 3: Gap Qty -->
          <tr class="row-gap">
            <td class="sticky-t2-type" style="text-align: center;"><span class="type-indicator type-gap">Gap</span></td>
            ${gapCells}
            <td class="font-mono week-summary-col" style="font-weight: 800; font-size: 0.9rem; text-align: right; ${it.cumGapQty < 0 ? 'color: var(--danger);' : it.cumGapQty > 0 ? 'color: var(--success);' : 'color: var(--text-muted);'}">
              ${it.cumGapQty !== 0 ? (it.cumGapQty > 0 ? '+' : '') + it.cumGapQty.toLocaleString('vi-VN') : '0'}
            </td>
          </tr>
        `;
      }).join('');

      // Compute Grand Totals for Table 2 Daily View
      const grandPlan = schedule.items.reduce((acc, it) => acc + (it.cumPlanQty || 0), 0);
      const grandFact = schedule.items.reduce((acc, it) => acc + (it.cumFactQty || 0), 0);
      const grandGap = grandFact - grandPlan;
      const totalDeficitModels = schedule.items.filter(it => it.cumGapQty < 0).length;
      const totalExplainedModels = schedule.items.filter(it => it.cumGapQty < 0 && it.shortageReasons && it.shortageReasons.hasReasons).length;

      const dailyGrandCells = schedule.dates.map(dateStr => {
        let pTot = 0, pDay = 0, pNight = 0;
        schedule.items.forEach(it => {
          const dItem = (it.daily || []).find(d => d.date === dateStr);
          if (dItem) {
            if (isSplit) {
              pDay += (dItem.planDay || 0);
              pNight += (dItem.planNight || 0);
            } else {
              pTot += (dItem.plan || 0);
            }
          }
        });
        const dObj = window.AppStore ? window.AppStore.parseDate(dateStr) : new Date(dateStr);
        const isWk = dObj.getDay() % 6 === 0;
        const wkCls = isWk ? 'weekend-cell' : '';

        if (isSplit) {
          return `
            <th class="font-mono ${wkCls}" style="text-align: right; color: #60a5fa; font-size: 0.775rem; font-weight: 800;">
              ${pDay > 0 ? pDay.toLocaleString('vi-VN') : '--'}
            </th>
            <th class="font-mono ${wkCls}" style="text-align: right; color: #60a5fa; font-size: 0.775rem; font-weight: 800;">
              ${pNight > 0 ? pNight.toLocaleString('vi-VN') : '--'}
            </th>
          `;
        }
        return `
          <th class="font-mono ${wkCls}" style="text-align: right; color: #60a5fa; font-size: 0.85rem; font-weight: 800;">
            ${pTot > 0 ? pTot.toLocaleString('vi-VN') : '--'}
          </th>
        `;
      }).join('');

      container.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th class="sticky-t2-stt">STT</th>
              <th class="sticky-t2-stage" style="text-align: center; min-width: 110px;">Công Đoạn</th>
              <th class="sticky-t2-group" style="min-width: 130px;">Group Model</th>
              <th class="sticky-t2-model" style="min-width: 260px;">Model (Mã 1C)</th>
              <th class="sticky-t2-type" style="text-align: center; width: 65px;">Loại</th>
              ${dayHeaders}
              <th class="week-summary-header" style="text-align: right; min-width: 120px;">
                TỔNG LŨY KẾ<br>
                <span style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">(${selCount}/${totCount} ngày)</span>
              </th>
              <th style="text-align: left; min-width: 280px; max-width: 380px; background: rgba(239, 68, 68, 0.12); border-left: 2px solid #ef4444;">
                NGUYÊN NHÂN ÂM (THEO CA & NGÀY)<br>
                <span style="font-size: 0.72rem; font-weight: 600; color: #fca5a5;">(Sheet Mass-History)</span>
              </th>
              <th style="text-align: center; min-width: 145px; background: rgba(56, 189, 248, 0.12); border-left: 1px solid rgba(56, 189, 248, 0.3);">
                ĐÁNH GIÁ<br>
                <span style="font-size: 0.72rem; font-weight: 600; color: #7dd3fc;">(Tiến độ & Trạng thái)</span>
              </th>
            </tr>
            ${splitSubHeaderRow}
            <!-- HÀNG TỔNG CỘNG CHUYỂN LÊN TRÊN & ĐÓNG BĂNG CHO DAILY VIEW -->
            <tr class="sticky-grand-total-row">
              <th colspan="5" class="sticky-grand-total-label" style="text-align: right; padding: 0.65rem 1rem;">
                TỔNG CỘNG (${schedule.items.length} MODEL):
              </th>
              ${dailyGrandCells}
              <th class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.95rem; font-weight: 800;">
                ${grandPlan.toLocaleString('vi-VN')}
              </th>
              <th style="text-align: left; font-size: 0.8rem; color: #94a3b8; padding: 0.5rem 0.75rem; font-weight: 700;">
                ${totalDeficitModels > 0 ? `<span style="color: #fca5a5; font-weight: 700;">⚠️ ${totalDeficitModels} Model thiếu</span>` : `<span style="color: #34d399; font-weight: 700;">✅ Tất cả đạt</span>`}
              </th>
              <th style="text-align: center;">
                <span class="badge ${grandGap < 0 ? 'badge-red' : 'badge-green'}" style="font-weight: 800;">
                  ${grandGap < 0 ? `⚠️ Thiếu ${Math.abs(grandGap).toLocaleString('vi-VN')}` : `✅ Đạt`}
                </span>
              </th>
            </tr>
          </thead>
                    <tbody>${tableRows}</tbody>
        </table>
        ${paginationHtml}
      `;
    }
  }

  // 4. Render Section 3: CÁC ĐIỂM CHÚ Ý & CẢNH BÁO MODEL MỚI SẢN XUẤT
  if (typeof renderAttentionPointsSection === 'function') {
    renderAttentionPointsSection(schedule);
  }
}

// =========================================================================
// 1b. BIỂU ĐỒ TỈ LỆ LOADING PLAN NHÂN LỰC (KẾ HOẠCH CẦN / THỰC TẾ CÓ)
// =========================================================================
window.ManpowerChartStore = window.ManpowerChartStore || {
  selectedStageIdx: 0,
  onlySelectedDays: false,
  splitShiftView: 'ALL', // 'ALL' | 'DAY' | 'NIGHT'
  viewMode: (function() {
    try {
      return localStorage.getItem('AJAX_PROPLAN_MP_CHART_VIEW_MODE') || 'EXPAND';
    } catch(e) { return 'EXPAND'; }
  })(), // 'EXPAND' (Mở rộng cuộn ngang 30 ngày) | 'FIT' (Thu hẹp vừa khung màn hình)
  isCollapsed: (function() {
    try {
      return localStorage.getItem('AJAX_PROPLAN_MP_CHART_COLLAPSED') === 'true';
    } catch(e) { return false; }
  })()
};

window.handleSelectManpowerChartStage = function(idx) {
  window.ManpowerChartStore.selectedStageIdx = idx;
  renderDataMassView();
};

window.handleToggleManpowerChartDays = function(onlySelected) {
  window.ManpowerChartStore.onlySelectedDays = onlySelected;
  renderDataMassView();
};

window.handleToggleManpowerChartSplit = function(splitView) {
  window.ManpowerChartStore.splitShiftView = splitView;
  renderDataMassView();
};

window.handleToggleManpowerChartViewMode = function(mode) {
  window.ManpowerChartStore.viewMode = mode;
  try {
    localStorage.setItem('AJAX_PROPLAN_MP_CHART_VIEW_MODE', mode);
  } catch (e) {}
  renderDataMassView();
  window.showToast('info', mode === 'EXPAND' ? '↔️ Đã chuyển chế độ Mở rộng (Cuộn ngang xem trọn 30 ngày)' : '📱 Đã chuyển chế độ Thu hẹp (Vừa vặn khung màn hình)');
};

window.handleToggleManpowerChartCollapse = function() {
  const current = !!window.ManpowerChartStore.isCollapsed;
  const next = !current;
  window.ManpowerChartStore.isCollapsed = next;
  try {
    localStorage.setItem('AJAX_PROPLAN_MP_CHART_COLLAPSED', next ? 'true' : 'false');
  } catch (e) {}
  renderDataMassView();
  window.showToast('info', next ? '🔼 Đã thu gọn khung biểu đồ' : '🔽 Đã mở rộng khung biểu đồ');
};

window.renderManpowerLoadingPlanChart = function(schedule, stagesForManpower, isSplit, shiftFilter) {
  const container = document.getElementById('datamassManpowerChartContainer');
  if (!container) return;

  if (!stagesForManpower || stagesForManpower.length === 0 || !schedule || !schedule.dates || schedule.dates.length === 0) {
    container.innerHTML = '';
    return;
  }

  const store = window.ManpowerChartStore;
  if (store.selectedStageIdx >= stagesForManpower.length) {
    store.selectedStageIdx = 0;
  }

  const curStage = stagesForManpower[store.selectedStageIdx] || stagesForManpower[0];
  const stageName = curStage.stage || 'TỔNG HỢP';
  const targetSaveStage = curStage.saveStage || (curStage.isMajorComposite || (curStage.isGrandTotal && !curStage.isHardtestGroup) ? 'major_composite' : (curStage.isHardtestGroup ? 'HARDTEST_TOTAL' : (stageName === 'ASSEMBLY' ? 'ASSEMBLY' : stageName)));

  // Clean label for current stage
  let stageCleanLabel = stageName;
  if (curStage.isMajorComposite || (curStage.isGrandTotal && !curStage.isHardtestGroup)) {
    stageCleanLabel = 'TỔNG HỢP 2 CỤM (HARDTEST + ASSEMBLY)';
  } else if (curStage.isHardtestGroup || stageName.includes('Plan HT Total') || stageName.includes('HARD TEST')) {
    stageCleanLabel = 'TỔNG HARD TEST';
  } else if (stageName === 'ASSEMBLY') {
    stageCleanLabel = 'ASSEMBLY (LẮP RÁP)';
  }

  // Stage Selector Pills
  const stagePillsHtml = stagesForManpower.map((st, idx) => {
    let name = st.stage;
    if (st.isMajorComposite || (st.isGrandTotal && !st.isHardtestGroup)) name = '🎯 Tổng Hợp 2 Cụm';
    else if (st.isHardtestGroup || name.includes('Plan HT Total') || name.includes('HARD TEST')) name = '🔬 Tổng Hard Test';
    else if (name === 'ASSEMBLY') name = '🔧 Assembly';
    else if (name.includes('FPD')) name = '📦 Tổng FPD';
    else if (name.includes('MASTERBOX')) name = '💻 Tổng MasterBox';
    else name = `📌 ${name}`;

    const isActive = (idx === store.selectedStageIdx);
    return `
      <button type="button" class="manpower-chart-pill-btn ${isActive ? 'active' : ''}" 
              onclick="window.handleSelectManpowerChartStage(${idx})" 
              title="Xem biểu đồ Loading Plan của: ${st.stage}">
        ${name}
      </button>
    `;
  }).join('');

  // Extract Daily Data
  const rawDaily = curStage.daily || [];
  const processedDays = rawDaily.map(d => {
    let planVal = 0, actVal = 0;
    if (isSplit) {
      const planDay = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
      const planNight = d.peopleNight || Math.round(((d.people || 0) - planDay) * 10) / 10;
      const actDay = window.AppStore.getActualAttendance(d.date, 'Day', targetSaveStage);
      const actNight = window.AppStore.getActualAttendance(d.date, 'Night', targetSaveStage);

      if (store.splitShiftView === 'DAY') {
        planVal = planDay;
        actVal = actDay;
      } else if (store.splitShiftView === 'NIGHT') {
        planVal = planNight;
        actVal = actNight;
      } else {
        planVal = planDay + planNight;
        actVal = actDay + actNight;
      }
    } else {
      if (shiftFilter === 'DAY') {
        planVal = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
        actVal = window.AppStore.getActualAttendance(d.date, 'Day', targetSaveStage);
      } else if (shiftFilter === 'NIGHT') {
        planVal = d.peopleNight || Math.round(((d.people || 0) - Math.round((d.people || 0) * 0.6 * 10) / 10) * 10) / 10;
        actVal = window.AppStore.getActualAttendance(d.date, 'Night', targetSaveStage);
      } else {
        planVal = d.people || (d.peopleDay + d.peopleNight) || 0;
        actVal = window.AppStore.getActualAttendance(d.date, 'ALL', targetSaveStage);
      }
    }

    planVal = Math.round(planVal * 10) / 10;
    actVal = Math.round(actVal * 10) / 10;
    const bal = Math.round((actVal - planVal) * 10) / 10;

    // Loading Plan = Kế Hoạch Cần (Plan) / Nhân Lực Có (Thực Tế)
    let loadingPct = 0;
    let hasActual = (actVal > 0);
    if (hasActual) {
      loadingPct = Math.round((planVal / actVal) * 1000) / 10;
    } else if (planVal === 0 && actVal === 0) {
      loadingPct = 100.0;
    } else {
      loadingPct = 0;
    }

    const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
    const dayOfWeek = dObj.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const dayName = getDayOfWeekName ? getDayOfWeekName(d.date) : '';
    const rot = window.getShiftRotation ? window.getShiftRotation(d.date) : { day: 'A', night: 'B' };
    const isSelected = schedule.selectedDates.includes(d.date);

    return {
      date: d.date,
      dayName,
      isWeekend,
      isSelected,
      rot,
      planVal,
      actVal,
      bal,
      hasActual,
      loadingPct
    };
  });

  const displayDays = store.onlySelectedDays ? processedDays.filter(d => d.isSelected) : processedDays;
  const daysToRender = displayDays.length > 0 ? displayDays : processedDays;

  // Compute Overall Totals for the Scope
  let cumPlan = 0, cumAct = 0, validDays = 0;
  daysToRender.forEach(d => {
    cumPlan += d.planVal;
    cumAct += d.actVal;
    if (d.isSelected || !store.onlySelectedDays) validDays++;
  });
  cumPlan = Math.round(cumPlan * 10) / 10;
  cumAct = Math.round(cumAct * 10) / 10;
  const cumDiff = Math.round((cumAct - cumPlan) * 10) / 10;
  const avgPlan = validDays > 0 ? (cumPlan / validDays).toFixed(1) : '0.0';
  const avgAct = validDays > 0 ? (cumAct / validDays).toFixed(1) : '0.0';
  const overallLoadingRate = cumAct > 0 ? (Math.round((cumPlan / cumAct) * 1000) / 10) : 0;

  // Status Evaluation
  let rateColor = '#10b981';
  let statusTagBg = 'rgba(16, 185, 129, 0.2)';
  let statusTagText = '#6ee7b7';
  let statusTagLabel = '✅ Đạt chuẩn';

  if (cumAct === 0) {
    rateColor = '#fbbf24';
    statusTagBg = 'rgba(245, 158, 11, 0.2)';
    statusTagText = '#fbbf24';
    statusTagLabel = '⚠️ Chưa có thực tế';
  } else if (overallLoadingRate > 105) {
    rateColor = '#ef4444';
    statusTagBg = 'rgba(239, 68, 68, 0.2)';
    statusTagText = '#fca5a5';
    statusTagLabel = '🚨 Quá tải';
  } else if (overallLoadingRate < 90) {
    rateColor = '#06b6d4';
    statusTagBg = 'rgba(6, 182, 212, 0.2)';
    statusTagText = '#67e8f9';
    statusTagLabel = '⚡ Dưới tải';
  }

  // If card is collapsed, render minimal header with summary
  if (store.isCollapsed) {
    container.innerHTML = `
      <div class="manpower-chart-card is-card-collapsed">
        <div class="manpower-chart-header" style="margin-bottom: 0;">
          <div class="manpower-chart-title-wrap">
            <div class="manpower-chart-icon-badge" style="width: 36px; height: 36px; font-size: 1.2rem;">📈</div>
            <div>
              <div class="manpower-chart-title" style="font-size: 0.95rem;">
                <span>BIỂU ĐỒ TỈ LỆ LOADING PLAN NHÂN LỰC</span>
                <span class="manpower-chart-formula-badge" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">
                  📐 Plan ÷ Thực Tế × 100%
                </span>
              </div>
              <div style="font-size: 0.775rem; color: #94a3b8; margin-top: 0.2rem;">
                Công đoạn: <strong style="color: #38bdf8;">${stageCleanLabel}</strong> • Loading TB: <strong style="color: ${rateColor};">${cumAct > 0 ? `${overallLoadingRate.toFixed(1)}%` : '--%'}</strong> • Cần: <strong style="color: #fbbf24;">${cumPlan.toLocaleString('vi-VN')}</strong> • Có: <strong style="color: #34d399;">${cumAct.toLocaleString('vi-VN')}</strong> • Cân đối: <strong style="color: ${cumDiff < 0 ? '#f87171' : '#34d399'};">${cumDiff > 0 ? '+' : ''}${cumDiff.toFixed(1)}</strong> ng
              </div>
            </div>
          </div>

          <div class="manpower-chart-controls">
            <div class="manpower-chart-pills">
              ${stagePillsHtml}
            </div>
            <button type="button" class="btn-filter-toggle is-collapsed" onclick="window.handleToggleManpowerChartCollapse()" title="Mở rộng biểu đồ Loading Plan" style="font-size: 0.76rem; padding: 0.35rem 0.75rem;">
              🔽 Mở rộng
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // SVG Geometry Calculation (Hỗ trợ Mở Rộng Cuộn Ngang 30 ngày & Thu Hẹp Vừa Màn Hình)
  const isExpanded = (store.viewMode === 'EXPAND');
  const N = daysToRender.length;

  const padLeft = 60;
  const padRight = 65;
  const padTop = 50;
  const padBottom = 95;
  const svgHeight = 405;
  const plotH = svgHeight - padTop - padBottom; // 260
  const yBase = padTop + plotH; // 310

  // Expanded: each day slot is at least 52px, horizontal scrollable
  // Fit: fits within 1000px coordinate space
  const slotW = isExpanded ? Math.max(52, Math.floor(960 / Math.max(1, N))) : (1000 - padLeft - padRight) / Math.max(1, N);
  const plotW = slotW * N;
  const svgWidth = isExpanded ? (padLeft + plotW + padRight) : 1000;
  const barW = isExpanded ? Math.max(12, Math.min(17, slotW * 0.32)) : Math.max(7, Math.min(10, slotW * 0.30));

  const maxMpRaw = Math.max(15, ...daysToRender.map(d => Math.max(d.planVal, d.actVal)));
  const maxMp = Math.ceil((maxMpRaw * 1.25) / 10) * 10;

  const maxPctRaw = Math.max(130, ...daysToRender.map(d => d.hasActual ? d.loadingPct : 100));
  const maxPct = Math.ceil(((maxPctRaw + 20) * 1.15) / 20) * 20;

  const yFromMp = (val) => yBase - (Math.min(maxMp, val) / maxMp) * plotH;
  const yFromPct = (pct) => yBase - (Math.min(maxPct, pct) / maxPct) * plotH;

  const y100 = yFromPct(100);

  // Grid Lines (Horizontal)
  const gridSteps = [0.25, 0.5, 0.75, 1.0];
  const gridLinesHtml = gridSteps.map(st => {
    const y = yBase - st * plotH;
    const mpVal = Math.round(st * maxMp);
    const pctVal = Math.round(st * maxPct);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${svgWidth - padRight}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="${padLeft - 8}" y="${y + 4}" fill="#64748b" font-size="9.5" font-family="monospace" text-anchor="end">${mpVal}</text>
      <text x="${svgWidth - padRight + 8}" y="${y + 4}" fill="#64748b" font-size="9.5" font-family="monospace" text-anchor="start">${pctVal}%</text>
    `;
  }).join('');

  // 100% Target Baseline Line
  const baseline100Html = `
    <line x1="${padLeft}" y1="${y100}" x2="${svgWidth - padRight}" y2="${y100}" 
          stroke="#38bdf8" stroke-dasharray="6 4" stroke-width="1.6" opacity="0.85" />
    <rect x="${svgWidth - padRight - 84}" y="${y100 - 9}" width="80" height="17" rx="4" fill="rgba(8, 14, 29, 0.9)" stroke="rgba(56, 189, 248, 0.6)" stroke-width="1.2" />
    <text x="${svgWidth - padRight - 44}" y="${y100 + 2.5}" fill="#38bdf8" font-size="9" font-weight="800" text-anchor="middle">🎯 100% Chuẩn</text>
  `;

  // Bars, Points, Badges, and Hover areas
  let barsHtml = '';
  let trendPoints = [];
  let badgesHtml = '';
  let hoverAreasHtml = '';
  let lastBadgeY = null;

  daysToRender.forEach((d, i) => {
    const cx = padLeft + (i + 0.5) * slotW;
    const xPlan = cx - barW - 1.5;
    const hPlan = Math.max(3, (d.planVal / maxMp) * plotH);
    const yPlan = yBase - hPlan;

    const xAct = cx + 1.5;
    const hAct = Math.max(3, (d.actVal / maxMp) * plotH);
    const yAct = yBase - hAct;

    const barOpacity = d.isSelected ? '1' : '0.45';

    // Tính trạng thái Over & số người thiếu của ngày
    const isOver = (d.hasActual && (d.loadingPct > 100 || d.planVal > d.actVal));
    const shortage = Math.max(0, Math.round((d.planVal - d.actVal) * 10) / 10);

    // Plan Bar (Màu Xanh) & Actual Bar (Màu Cam) + Hiển thị số người ở chân biểu đồ
    const cxPlan = xPlan + barW / 2;
    const cxAct = xAct + barW / 2;
    const planValStr = d.planVal > 0 ? (d.planVal % 1 === 0 ? d.planVal.toFixed(0) : d.planVal.toFixed(1)) : '0';
    const actValStr = d.actVal > 0 ? (d.actVal % 1 === 0 ? d.actVal.toFixed(0) : d.actVal.toFixed(1)) : '0';
    const numFontSize = isExpanded ? 8.5 : 7.2;

    // Số người Kế hoạch ở chân cột (Xanh)
    let planFootLabelHtml = '';
    if (d.planVal > 0) {
      if (hPlan >= 15) {
        planFootLabelHtml = `<text x="${cxPlan}" y="${yBase - 4}" fill="#ffffff" font-size="${numFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle" style="paint-order: stroke; stroke: rgba(2,132,199,0.9); stroke-width: 2px;">${planValStr}</text>`;
      } else {
        planFootLabelHtml = `<text x="${cxPlan}" y="${yPlan - 3}" fill="#38bdf8" font-size="${numFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle">${planValStr}</text>`;
      }
    }

    // Số người Nhân lực có ở chân cột (Cam)
    let actFootLabelHtml = '';
    if (d.actVal > 0) {
      if (hAct >= 15) {
        actFootLabelHtml = `<text x="${cxAct}" y="${yBase - 4}" fill="#ffffff" font-size="${numFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle" style="paint-order: stroke; stroke: rgba(234,88,12,0.9); stroke-width: 2px;">${actValStr}</text>`;
      } else {
        actFootLabelHtml = `<text x="${cxAct}" y="${yAct - 3}" fill="#fb923c" font-size="${numFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle">${actValStr}</text>`;
      }
    } else if (d.planVal > 0) {
      actFootLabelHtml = `<text x="${cxAct}" y="${yBase - 4}" fill="#fca5a5" font-size="${numFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle">0</text>`;
    }

    barsHtml += `
      <g class="chart-day-bar-group" data-day-index="${i}">
        <!-- Cột Kế Hoạch Cần (Màu Xanh) -->
        <rect x="${xPlan}" y="${yPlan}" width="${barW}" height="${hPlan}" rx="2.5" 
              fill="url(#gradPlanBar)" opacity="${barOpacity}">
          <title>Plan ${d.date}: ${d.planVal} người</title>
        </rect>
        ${planFootLabelHtml}

        <!-- Cột Nhân Lực Có (Màu Cam) -->
        <rect x="${xAct}" y="${yAct}" width="${barW}" height="${hAct}" rx="2.5" 
              fill="url(#gradActBar)" opacity="${barOpacity}">
          <title>Nhân lực có ${d.date}: ${d.actVal} người</title>
        </rect>
        ${actFootLabelHtml}
      </g>
    `;

    // Trendline point & % Badge on top (Nền solid rực rỡ, chữ to rõ nét, không bị rối)
    if (d.hasActual) {
      const yPct = yFromPct(d.loadingPct);
      trendPoints.push({ cx, yPct, pct: d.loadingPct });

      // Nền solid độ tương phản cao, chữ trắng rõ nét
      let badgeBorder = '#34d399';
      let badgeBg = '#059669'; // Xanh lá đậm chuẩn nét
      let badgeText = '#ffffff';

      if (isOver) {
        badgeBorder = '#fca5a5';
        badgeBg = '#dc2626'; // Đỏ tươi rực rỡ nổi bật
        badgeText = '#ffffff';
      } else if (d.loadingPct < 90) {
        badgeBorder = '#7dd3fc';
        badgeBg = '#0284c7'; // Xanh dương tươi sáng
        badgeText = '#ffffff';
      }

      // Kích thước badge và cỡ chữ to rõ
      const isStaggered = (i % 2 === 1);
      const badgeH = isExpanded ? 20 : 17;
      const badgeW = isExpanded ? 44 : 33;
      const fontSize = isExpanded ? 11.5 : 9.5;

      const minBadgeY = isExpanded ? 20 : 16;
      let badgeY = isStaggered 
        ? Math.max(minBadgeY, yPct - (isExpanded ? 34 : 26)) 
        : Math.max(minBadgeY, yPct - (isExpanded ? 20 : 16));

      // Đảm bảo khoảng cách dọc tối thiểu 14px giữa 2 badge liên tiếp
      if (lastBadgeY !== null && Math.abs(badgeY - lastBadgeY) < 14) {
        badgeY = isStaggered 
          ? Math.max(minBadgeY, lastBadgeY - 16) 
          : Math.min(yBase - 30, lastBadgeY + 16);
      }
      lastBadgeY = badgeY;

      // Đường connector nối từ điểm đồ thị lên badge
      let connectorHtml = '';
      if (yPct - badgeY > badgeH) {
        const connectorColor = isOver ? 'rgba(239, 68, 68, 0.65)' : 'rgba(168, 85, 247, 0.45)';
        connectorHtml = `<line x1="${cx}" y1="${yPct - 4}" x2="${cx}" y2="${badgeY + badgeH}" stroke="${connectorColor}" stroke-dasharray="2 2" stroke-width="1.2" />`;
      }

      const circleFill = isOver ? '#ef4444' : '#a855f7';
      badgesHtml += `
        <g class="chart-badge-node" style="cursor: pointer;">
          ${connectorHtml}
          <!-- Node Circle -->
          <circle cx="${cx}" cy="${yPct}" r="${isExpanded ? 4.5 : 3.5}" fill="${circleFill}" stroke="#ffffff" stroke-width="2" />
          <!-- % Loading Pill trên đỉnh đường xu hướng -->
          <rect x="${cx - badgeW / 2}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" 
                fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.2" filter="url(#badgeShadow)" />
          <text x="${cx}" y="${badgeY + (badgeH * 0.71)}" fill="${badgeText}" font-size="${fontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle">
            ${d.loadingPct.toFixed(0)}%
          </text>
        </g>
      `;
    } else if (d.planVal > 0 && d.actVal === 0) {
      badgesHtml += `
        <g class="chart-badge-node" style="cursor: pointer;">
          <rect x="${cx - 19}" y="${yBase - 22}" width="38" height="16" rx="5" 
                fill="#d97706" stroke="#fbbf24" stroke-width="1.2" filter="url(#badgeShadow)" />
          <text x="${cx}" y="${yBase - 10}" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">
            0 ng
          </text>
        </g>
      `;
    }

    // X-Axis Date labels (DD/MM, Thứ CN/T2...T7, Kíp trực A/B)
    const dObj = window.AppStore ? window.AppStore.parseDate(d.date) : new Date(d.date);
    const dNum = dObj.getDate();
    const mNum = dObj.getMonth() + 1;
    const shortDate = `${String(dNum).padStart(2, '0')}/${String(mNum).padStart(2, '0')}`;
    const dayOfWeekMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const shortDayName = dayOfWeekMap[dObj.getDay()] || '';
    const dayColor = d.isWeekend ? '#fbbf24' : (d.isSelected ? '#ffffff' : '#94a3b8');
    const dayWeight = (d.isWeekend || d.isSelected) ? '800' : '600';
    const rotText = d.rot ? `${d.rot.day}/${d.rot.night}` : '';

    // Badge báo số người thiếu chuyển xuống dưới sát chân biểu đồ (Chỉ để dạng -0.8 theo chỉ đạo)
    let shortageFootBadgeHtml = '';
    if (isOver && shortage > 0) {
      const shortageStr = (shortage % 1 === 0) ? shortage.toFixed(0) : shortage.toFixed(1);
      const shortageH = isExpanded ? 16 : 13.5;
      const shortageText = `-${shortageStr}`;
      const shortageFontSize = isExpanded ? 9 : 7.8;
      const isStaggerShortage = (!isExpanded && (i % 2 === 1));
      const shortageW = Math.max(isExpanded ? 32 : 25, shortageText.length * (isExpanded ? 6.5 : 5.5) + 8);
      const shortageY = isExpanded ? (yBase + 48) : (yBase + (isStaggerShortage ? 61 : 47));

      shortageFootBadgeHtml = `
        <g class="chart-shortage-foot" style="cursor: pointer;">
          <rect x="${cx - shortageW / 2}" y="${shortageY}" width="${shortageW}" height="${shortageH}" rx="${shortageH / 2}" 
                fill="#dc2626" stroke="#fca5a5" stroke-width="1.2" filter="url(#badgeShadow)">
            <title>Ngày ${d.date}: Quá tải (${d.loadingPct.toFixed(0)}%) - Thiếu ${shortageStr} người so với kế hoạch</title>
          </rect>
          <text x="${cx}" y="${shortageY + shortageH * 0.72}" fill="#ffffff" font-size="${shortageFontSize}" font-weight="900" font-family="'JetBrains Mono', monospace" text-anchor="middle">
            ${shortageText}
          </text>
        </g>
      `;
    }

    barsHtml += `
      <g class="chart-xaxis-label">
        <text x="${cx}" y="${yBase + 16}" fill="${dayColor}" font-size="${isExpanded ? '10' : '8.5'}" font-weight="${dayWeight}" font-family="monospace" text-anchor="middle">
          ${shortDate}
        </text>
        <text x="${cx}" y="${yBase + 28}" fill="${d.isWeekend ? '#f59e0b' : '#64748b'}" font-size="${isExpanded ? '9.5' : '8'}" font-weight="700" text-anchor="middle">
          ${shortDayName}
        </text>
        <text x="${cx}" y="${yBase + 39}" fill="#38bdf8" font-size="${isExpanded ? '8.5' : '7.5'}" font-weight="700" text-anchor="middle">
          ${rotText}
        </text>
        ${shortageFootBadgeHtml}
      </g>
    `;

    // Invisible hover hitboxes
    const payload = encodeURIComponent(JSON.stringify({
      date: d.date,
      dayName: d.dayName,
      isWeekend: d.isWeekend,
      rot: d.rot,
      planVal: d.planVal,
      actVal: d.actVal,
      bal: d.bal,
      loadingPct: d.hasActual ? d.loadingPct : null,
      stage: stageCleanLabel
    }));

    hoverAreasHtml += `
      <rect x="${padLeft + i * slotW}" y="${padTop}" width="${slotW}" height="${plotH + 85}" 
            fill="transparent" style="cursor: pointer;"
            onmouseenter="window.showManpowerLoadingTooltip(event, '${payload}')"
            onmouseleave="window.hideManpowerLoadingTooltip()" />
    `;
  });

  // Polyline & Area Curve
  let trendlineHtml = '';
  if (trendPoints.length > 1) {
    const pathD = trendPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.cx.toFixed(1)} ${pt.yPct.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${trendPoints[trendPoints.length - 1].cx.toFixed(1)} ${yBase} L ${trendPoints[0].cx.toFixed(1)} ${yBase} Z`;

    trendlineHtml = `
      <path d="${areaD}" fill="url(#loadingAreaGradient)" opacity="0.14" />
      <path d="${pathD}" fill="none" stroke="url(#loadingLineGradient)" stroke-width="${isExpanded ? 3 : 2.5}" 
            stroke-linecap="round" stroke-linejoin="round" />
    `;
  }

  const svgStyle = isExpanded 
    ? `min-width: ${svgWidth}px; width: ${svgWidth}px; height: ${svgHeight}px;`
    : `min-width: 100%; width: 100%; height: auto;`;

  // Assemble Complete Card HTML (Không còn ảnh 2 và ảnh 3)
  container.innerHTML = `
    <div class="manpower-chart-card">
      <!-- Header -->
      <div class="manpower-chart-header">
        <div class="manpower-chart-title-wrap">
          <div class="manpower-chart-icon-badge">📈</div>
          <div>
            <div class="manpower-chart-title">
              <span>BIỂU ĐỒ TỈ LỆ LOADING PLAN NHÂN LỰC</span>
              <span class="manpower-chart-formula-badge">
                📐 Loading Plan (%) = 👷 Kế Hoạch Cần ÷ 👥 Nhân Lực Có × 100%
              </span>
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.2rem;">
              Đang xem công đoạn: <strong style="color: #38bdf8;">${stageCleanLabel}</strong> • Đơn vị: <strong>Lượt người</strong> &amp; <strong>% Tải Kế Hoạch</strong>
            </div>
          </div>
        </div>

        <div class="manpower-chart-controls">
          <!-- Stage Selector Pills -->
          <div class="manpower-chart-pills">
            ${stagePillsHtml}
          </div>

          <!-- View Mode Switch: Mở rộng (Cuộn ngang 30 ngày) vs Thu hẹp (Vừa màn hình) -->
          <div class="manpower-chart-view-mode-group">
            <button type="button" 
                    class="manpower-chart-pill-btn ${store.viewMode === 'EXPAND' ? 'active' : ''}" 
                    onclick="window.handleToggleManpowerChartViewMode('EXPAND')" 
                    title="Chế độ Mở rộng: Cuộn ngang để xem trọn 30 ngày rõ nét từng ngày, không bị đè chữ">
              ↔️ Mở rộng
            </button>
            <button type="button" 
                    class="manpower-chart-pill-btn ${store.viewMode === 'FIT' ? 'active' : ''}" 
                    onclick="window.handleToggleManpowerChartViewMode('FIT')" 
                    title="Chế độ Thu hẹp: Vừa vặn 100% khung màn hình">
              📱 Thu hẹp
            </button>
          </div>

          <!-- Date Scope Filter -->
          <button type="button" 
                  class="day-pill-btn ${store.onlySelectedDays ? 'active' : ''}" 
                  onclick="window.handleToggleManpowerChartDays(${!store.onlySelectedDays})" 
                  style="font-size: 0.74rem; padding: 0.35rem 0.7rem;"
                  title="Chuyển đổi: Xem toàn bộ các ngày trong kỳ hoặc chỉ xem những ngày đã tick chọn trong toolbar">
            ${store.onlySelectedDays ? `✅ Chỉ ${validDays} ngày chọn` : `📅 Tất cả ${daysToRender.length} ngày`}
          </button>

          <!-- Section Collapse/Expand Button -->
          <button type="button" class="btn-filter-toggle" onclick="window.handleToggleManpowerChartCollapse()" title="Thu gọn biểu đồ Loading Plan" style="font-size: 0.76rem; padding: 0.35rem 0.75rem;">
            🔼 Thu gọn
          </button>
        </div>
      </div>

      <!-- Inline Summary & Legend Strip (Gọn gàng thay thế toàn bộ ảnh 2 và ảnh 3) -->
      <div class="manpower-chart-inline-strip">
        <div class="manpower-strip-kpis">
          <span class="manpower-strip-item" style="border-left: 2.5px solid ${rateColor};">
            📊 Loading TB: <strong style="color: ${rateColor}; font-size: 0.95rem;">${cumAct > 0 ? `${overallLoadingRate.toFixed(1)}%` : '--%'}</strong>
            <span class="manpower-strip-tag" style="background: ${statusTagBg}; color: ${statusTagText};">${statusTagLabel}</span>
          </span>
          <span class="manpower-strip-item" style="border-left: 2.5px solid #38bdf8;">
            👷 Kế Hoạch Cần: <strong style="color: #38bdf8;">${cumPlan.toLocaleString('vi-VN')}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(BQ: ${avgPlan}/ng)</span>
          </span>
          <span class="manpower-strip-item" style="border-left: 2.5px solid #fb923c;">
            👥 Nhân Lực Có: <strong style="color: #fb923c;">${cumAct.toLocaleString('vi-VN')}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(BQ: ${avgAct}/ng)</span>
          </span>
          <span class="manpower-strip-item" style="border-left: 2.5px solid ${cumDiff < 0 ? '#ef4444' : '#10b981'};">
            ⚖️ Cân Đối: <strong style="color: ${cumDiff < 0 ? '#f87171' : '#34d399'};">${cumDiff > 0 ? '+' : ''}${cumDiff.toFixed(1)}</strong> ng
          </span>
        </div>
        <div class="manpower-strip-legend">
          <span class="strip-legend-item"><span class="strip-legend-dot" style="background: #38bdf8;"></span> Plan (người)</span>
          <span class="strip-legend-item"><span class="strip-legend-dot" style="background: #fb923c;"></span> Nhân Lực Có (người)</span>
          <span class="strip-legend-item"><span class="strip-legend-line" style="background: linear-gradient(90deg, #c084fc, #38bdf8);"></span> % Loading</span>
          <span class="strip-legend-item"><span class="strip-legend-dot" style="background: #dc2626; border-radius: 2px;"></span> Over (Thiếu ng)</span>
          <span class="strip-legend-item"><span class="strip-legend-dash"></span> 100% Chuẩn</span>
        </div>
      </div>

      <!-- SVG Chart Canvas Container -->
      <div class="manpower-svg-wrap">
        <svg class="manpower-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" style="${svgStyle}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <!-- Drop Shadow Filter for Badges -->
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.65" />
            </filter>

            <linearGradient id="gradPlanBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95" />
              <stop offset="100%" stop-color="#0284c7" stop-opacity="0.8" />
            </linearGradient>

            <linearGradient id="gradActBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fb923c" stop-opacity="0.95" />
              <stop offset="100%" stop-color="#ea580c" stop-opacity="0.8" />
            </linearGradient>

            <linearGradient id="loadingLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#c084fc" />
              <stop offset="50%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>

            <linearGradient id="loadingAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a855f7" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          <g class="chart-grid">${gridLinesHtml}</g>

          <!-- 100% Benchmark Line -->
          <g class="chart-baseline">${baseline100Html}</g>

          <!-- Bars for each day -->
          <g class="chart-bars">${barsHtml}</g>

          <!-- Trendline & Area -->
          <g class="chart-trendline">${trendlineHtml}</g>

          <!-- % Loading Pill Badges on top -->
          <g class="chart-badges">${badgesHtml}</g>

          <!-- Interactive Hover Hitboxes -->
          <g class="chart-hover-layer">${hoverAreasHtml}</g>
        </svg>

        <!-- Floating Tooltip Container -->
        <div id="manpowerLoadingChartTooltip" 
             style="position: absolute; display: none; pointer-events: none; z-index: 50; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.5); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.775rem; color: #fff; min-width: 200px; backdrop-filter: blur(8px);">
        </div>
      </div>
    </div>
  `;
};

// Tooltip Handlers
window.showManpowerLoadingTooltip = function(event, encodedPayload) {
  const tooltip = document.getElementById('manpowerLoadingChartTooltip');
  if (!tooltip) return;
  try {
    const data = JSON.parse(decodeURIComponent(encodedPayload));
    const rateText = data.loadingPct !== null ? `${data.loadingPct.toFixed(1)}%` : 'Chưa có thực tế';
    const rateColor = data.loadingPct > 105 ? '#f87171' : (data.loadingPct < 90 ? '#38bdf8' : '#34d399');
    const balColor = data.bal < 0 ? '#ef4444' : '#10b981';

    tooltip.innerHTML = `
      <div style="font-weight: 800; font-size: 0.85rem; color: #fff; margin-bottom: 0.35rem; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3rem;">
        <span>📅 ${data.date} (${data.dayName})</span>
        <span style="color: #38bdf8;">Kíp ${data.rot ? `${data.rot.day}/${data.rot.night}` : ''}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.775rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Công đoạn:</span>
          <strong style="color: #93c5fd;">${data.stage}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">👷 1. Kế Hoạch Cần:</span>
          <strong style="color: #38bdf8;">${data.planVal.toFixed(1)} người</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">👥 2. Nhân Lực Có:</span>
          <strong style="color: #fb923c;">${data.actVal.toFixed(1)} người</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">⚖️ 3. Chênh Lệch:</span>
          <strong style="color: ${balColor};">${data.bal > 0 ? '+' : ''}${data.bal.toFixed(1)} người</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; padding-top: 0.25rem; border-top: 1px dashed rgba(255,255,255,0.1);">
          <span style="color: #c084fc; font-weight: 700;">📊 Tỉ Lệ Loading Plan:</span>
          <strong style="color: ${rateColor}; font-size: 0.85rem;">${rateText}</strong>
        </div>
      </div>
    `;

    tooltip.style.display = 'block';
    const container = tooltip.parentElement;
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let posX = mouseX + 15;
    let posY = mouseY - 40;
    if (posX + 230 > rect.width) posX = mouseX - 240;
    if (posY < 10) posY = 10;

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  } catch(e) {}
};

window.hideManpowerLoadingTooltip = function() {
  const tooltip = document.getElementById('manpowerLoadingChartTooltip');
  if (tooltip) tooltip.style.display = 'none';
};

// Handler for Table 2 View Mode Switcher (Chi tiết theo ngày vs Chỉ xem tổng lũy kế)
window.handleTable2ViewMode = function(mode) {
  window.AppStore.table2ViewMode = mode;
  try {
    localStorage.setItem('AJAX_PROPLAN_TABLE2_VIEW_MODE', mode);
  } catch (e) {}
  renderDataMassView();
  window.showToast('info', mode === 'CUMULATIVE' ? 'Đã chuyển sang: Chỉ xem tổng lũy kế' : 'Đã chuyển sang: Chi tiết theo ngày');
};

window.scrollToTable2Reasons = function() {
  const container = document.getElementById('datamassTableContainer');
  if (container) {
    container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    window.showToast('info', 'Đã cuộn đến 2 cột: Nguyên Nhân Âm & Đánh Giá');
  }
};

// ====================================================================
// SECTION 3: CÁC ĐIỂM CHÚ Ý & CẢNH BÁO MODEL MỚI SẢN XUẤT (NEW MODELS)
// ====================================================================

window.__NEW_MODELS_SELECTED_STAGES__ = [];
window.__NEW_MODELS_SEARCH__ = '';
window.__NEW_MODELS_PAGE__ = 1;
const NEW_MODELS_PAGE_SIZE = 20;

/**
 * Logic nhận diện New Model:
 * "Nếu như Model đó đã có Plan và Fact thì đồng nghĩa với việc Model đó đã làm, 
 * Nếu Model đó chưa có Plan và Fact trong quá khứ và có plan trong thời gian sắp tới thì đó là New Model."
 */
window.findNewModels = function(refDateStr = null) {
  const allItems = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA.items) 
    || (window.AppStore && window.AppStore.dataMass && window.AppStore.dataMass.items) || [];
  const massHistory = window.MASS_HISTORY_DATA || (window.AppStore && window.AppStore.massHistory) || [];

  // Build set of models with past plan or fact in massHistory
  const historyModelSet = new Set();
  massHistory.forEach(r => {
    const p = parseFloat(r.plan || 0);
    const f = parseFloat(r.fact || 0);
    if ((p > 0 || f > 0) && r.model) {
      historyModelSet.add(r.model.trim().toLowerCase());
    }
  });

  // Reference date: default to first date of current schedule range
  let refDate;
  if (refDateStr) {
    refDate = window.AppStore.parseDate(refDateStr);
  } else {
    const dates = (window.__LATEST_SCHEDULE__ && window.__LATEST_SCHEDULE__.dates) || [];
    refDate = dates.length > 0 ? window.AppStore.parseDate(dates[0]) : new Date(2026, 9, 29);
  }

  const newModels = [];

  allItems.forEach(it => {
    const modelName = (it.model || '').trim();
    const p1c = (it.productName1C || it.productName || '').trim();
    const stage = it.stage || '';
    const planDict = it.plan || {};
    const factDict = it.fact || {};

    // 1. Check history in Sheet Mass-History
    let inHistory = false;
    if (modelName && historyModelSet.has(modelName.toLowerCase())) inHistory = true;
    if (p1c && historyModelSet.has(p1c.toLowerCase())) inHistory = true;

    // 2. Check if had plan or fact in dates prior to refDate
    let hadPastPlan = false;
    let hadPastFact = false;

    for (const [dStr, qty] of Object.entries(planDict)) {
      const dObj = window.AppStore ? window.AppStore.parseDate(dStr) : new Date(dStr);
      if (dObj < refDate && parseFloat(qty) > 0) {
        hadPastPlan = true;
        break;
      }
    }

    if (!hadPastPlan) {
      for (const [dStr, qty] of Object.entries(factDict)) {
        const dObj = window.AppStore ? window.AppStore.parseDate(dStr) : new Date(dStr);
        if (dObj < refDate && parseFloat(qty) > 0) {
          hadPastFact = true;
          break;
        }
      }
    }

    const hadPastProduction = inHistory || hadPastPlan || hadPastFact;

    // 3. Check upcoming plan (>= refDate)
    const upcoming = [];
    for (const [dStr, qty] of Object.entries(planDict)) {
      const q = parseFloat(qty) || 0;
      if (q > 0) {
        const dObj = window.AppStore ? window.AppStore.parseDate(dStr) : new Date(dStr);
        if (dObj >= refDate) {
          upcoming.push({ dateStr: dStr, dateObj: dObj, qty: q });
        }
      }
    }

    // Logic user: chưa từng có Plan và Fact trong quá khứ VÀ có plan trong thời gian sắp tới -> New Model!
    if (!hadPastProduction && upcoming.length > 0) {
      upcoming.sort((a, b) => a.dateObj - b.dateObj);
      const firstPlan = upcoming[0];
      const totalUpcoming = upcoming.reduce((acc, u) => acc + u.qty, 0);

      const upcomingFormattedList = upcoming.map(u => ({
        dateStr: u.dateStr,
        dateFormatted: formatStandardDate(u.dateStr),
        dayName: getDayOfWeekName ? getDayOfWeekName(u.dateStr) : '',
        qty: u.qty
      }));

      newModels.push({
        stage,
        model: modelName,
        productName1C: p1c,
        firstPlanDate: firstPlan.dateStr,
        firstPlanDateFormatted: formatStandardDate(firstPlan.dateStr),
        firstPlanDayName: getDayOfWeekName ? getDayOfWeekName(firstPlan.dateStr) : '',
        firstPlanQty: firstPlan.qty,
        totalUpcomingPlan: totalUpcoming,
        upcomingDaysCount: upcoming.length,
        upcomingPlans: upcomingFormattedList,
        upcomingPlansSummary: upcomingFormattedList.map(u => `${u.dateFormatted}: ${u.qty.toLocaleString('vi-VN')} pcs`).join('; '),
        notes: 'New Model - Chuẩn bị Jig, linh kiện, SOP & theo dõi Ramp-up'
      });
    }
  });

  // Sort by first plan date ascending, then total plan descending
  newModels.sort((a, b) => {
    const da = window.AppStore ? window.AppStore.parseDate(a.firstPlanDate) : new Date(a.firstPlanDate);
    const db = window.AppStore ? window.AppStore.parseDate(b.firstPlanDate) : new Date(b.firstPlanDate);
    if (da - db !== 0) return da - db;
    return b.totalUpcomingPlan - a.totalUpcomingPlan;
  });

  return newModels;
};
// Helper to normalize any date string to YYYY-MM-DD
function toIsoDateStr(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  } else if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return s;
}

// Shared filter for New Models (Stages, Keyword, Date Range)
function filterNewModelsList(newModelsAll) {
  if (!Array.isArray(newModelsAll)) return [];

  if (!Array.isArray(window.__NEW_MODELS_SELECTED_STAGES__)) {
    if (window.__NEW_MODELS_STAGE_FILTER__ && window.__NEW_MODELS_STAGE_FILTER__ !== 'ALL') {
      window.__NEW_MODELS_SELECTED_STAGES__ = [window.__NEW_MODELS_STAGE_FILTER__];
    } else {
      window.__NEW_MODELS_SELECTED_STAGES__ = [];
    }
  }
  const selectedStages = window.__NEW_MODELS_SELECTED_STAGES__;
  const isAllSelected = selectedStages.length === 0;
  const searchKw = (window.__NEW_MODELS_SEARCH__ || '').toLowerCase().trim();
  const fromDate = toIsoDateStr(window.__NEW_MODELS_FROM_DATE__ || '');
  const toDate = toIsoDateStr(window.__NEW_MODELS_TO_DATE__ || '');

  return newModelsAll.filter(m => {
    // 1. Stage filter
    if (!isAllSelected && !selectedStages.includes(m.stage)) return false;

    // 2. Keyword filter (model, product name 1C, stage, or date text)
    if (searchKw) {
      const matchName = (m.model || '').toLowerCase().includes(searchKw);
      const match1C = (m.productName1C || '').toLowerCase().includes(searchKw);
      const matchStage = (m.stage || '').toLowerCase().includes(searchKw);
      const matchDate = (m.firstPlanDateFormatted || '').includes(searchKw) || (m.firstPlanDate || '').includes(searchKw);
      if (!matchName && !match1C && !matchStage && !matchDate) return false;
    }

    // 3. Date range filter (Tìm kiếm theo thời gian kế hoạch)
    if (fromDate || toDate) {
      let inRange = false;
      const isoFirst = toIsoDateStr(m.firstPlanDate);
      if (isoFirst) {
        const okFrom = !fromDate || isoFirst >= fromDate;
        const okTo = !toDate || isoFirst <= toDate;
        if (okFrom && okTo) inRange = true;
      }
      if (!inRange && Array.isArray(m.upcomingPlans)) {
        for (const p of m.upcomingPlans) {
          const isoP = toIsoDateStr(p.dateStr);
          const okFrom = !fromDate || isoP >= fromDate;
          const okTo = !toDate || isoP <= toDate;
          if (okFrom && okTo && (parseFloat(p.qty) || 0) > 0) {
            inRange = true;
            break;
          }
        }
      }
      if (!inRange) return false;
    }

    return true;
  });
}

window.renderAttentionPointsSection = function(schedule) {
  const container = document.getElementById('datamassAttentionPointsBody');
  const countBadge = document.getElementById('badgeAttentionNewModelsCount');
  if (!container) return;

  const newModelsAll = window.findNewModels();
  if (countBadge) {
    countBadge.textContent = `${newModelsAll.length} Model Mới`;
  }

  try {
    const urlP = new URLSearchParams(window.location.search);
    if (urlP.get('filterFrom') !== null && window.__NEW_MODELS_FROM_DATE__ === undefined) {
      window.__NEW_MODELS_FROM_DATE__ = urlP.get('filterFrom');
    }
    if (urlP.get('filterTo') !== null && window.__NEW_MODELS_TO_DATE__ === undefined) {
      window.__NEW_MODELS_TO_DATE__ = urlP.get('filterTo');
    }
  } catch(e) {}

  // 1. Multi-stage Filter state
  if (!Array.isArray(window.__NEW_MODELS_SELECTED_STAGES__)) {
    if (window.__NEW_MODELS_STAGE_FILTER__ && window.__NEW_MODELS_STAGE_FILTER__ !== 'ALL') {
      window.__NEW_MODELS_SELECTED_STAGES__ = [window.__NEW_MODELS_STAGE_FILTER__];
    } else {
      window.__NEW_MODELS_SELECTED_STAGES__ = [];
    }
  }
  const selectedStages = window.__NEW_MODELS_SELECTED_STAGES__;
  const isAllSelected = selectedStages.length === 0;
  const searchKw = (window.__NEW_MODELS_SEARCH__ || '').toLowerCase().trim();
  const fromDate = window.__NEW_MODELS_FROM_DATE__ || '';
  const toDate = window.__NEW_MODELS_TO_DATE__ || '';

  // Filter New Models by multi-stage selection, keyword & date range
  const filtered = filterNewModelsList(newModelsAll);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / NEW_MODELS_PAGE_SIZE) || 1;
  let currentPage = window.__NEW_MODELS_PAGE__ || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  window.__NEW_MODELS_PAGE__ = currentPage;

  const startIdx = (currentPage - 1) * NEW_MODELS_PAGE_SIZE;
  const pagedItems = filtered.slice(startIdx, startIdx + NEW_MODELS_PAGE_SIZE);

  // Stage list for filtering
  const stageCounts = {};
  newModelsAll.forEach(m => {
    stageCounts[m.stage] = (stageCounts[m.stage] || 0) + 1;
  });
  const stageList = Object.keys(stageCounts).sort();

  // Render Table Rows
  const tableRowsHtml = pagedItems.map((m, idx) => {
    const rowIdx = startIdx + idx + 1;
    const stageBadgeClass = m.stage === 'ASSEMBLY' ? 'badge-blue' :
                            m.stage === 'HARD TEST' ? 'badge-purple' :
                            m.stage === 'OPTICS ASM' ? 'badge-amber' :
                            m.stage === 'LONG TEST' ? 'badge-green' :
                            m.stage === 'QC' ? 'badge-blue' :
                            m.stage === 'PKG' ? 'badge-purple' : 'badge-amber';

    const stageIcon = m.stage === 'ASSEMBLY' ? '🔧' :
                      m.stage === 'HARD TEST' ? '⚡' :
                      m.stage === 'LONG TEST' ? '⏱️' :
                      m.stage === 'QC' ? '✅' :
                      m.stage === 'PKG' ? '📦' : '⚙️';

    const dayName = m.firstPlanDayName || (getDayOfWeekName ? getDayOfWeekName(m.firstPlanDate) : '');
    const dateFormatted = `${m.firstPlanDateFormatted}${dayName ? ` (${dayName})` : ''}`;

    return `
      <tr class="hover-row">
        <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${rowIdx}</td>
        <td style="text-align: center; white-space: nowrap;">
          <span class="badge ${stageBadgeClass}" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; font-weight: 700;">
            ${stageIcon} ${m.stage}
          </span>
        </td>
        <td style="white-space: nowrap; font-weight: 800; color: #f8fafc; font-size: 0.85rem;">
          ${m.model || '--'}
        </td>
        <td style="min-width: 250px;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.775rem; font-weight: 600; color: #93c5fd; word-break: break-all;">
            ${m.productName1C}
          </div>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <span class="badge badge-amber" style="font-weight: 800; font-size: 0.8rem; padding: 0.25rem 0.6rem;">
            📅 ${dateFormatted}
          </span>
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 800; color: #38bdf8; font-size: 0.9rem;">
          ${m.firstPlanQty.toLocaleString('vi-VN')}
        </td>
        <td style="text-align: right; min-width: 155px; vertical-align: middle;">
          <div class="font-mono" style="font-weight: 800; color: #34d399; font-size: 0.925rem;">
            ${m.totalUpcomingPlan.toLocaleString('vi-VN')} <span style="font-size: 0.72rem; font-weight: 600; color: #94a3b8;">pcs</span>
          </div>
          <div style="font-size: 0.72rem; color: #fbbf24; margin-top: 3px; font-weight: 700; display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 0.25rem;">
            <span>⚡ Ngày gần nhất:</span>
            <span style="color: #fef08a;">${m.firstPlanDateFormatted}</span>
            <span style="color: #38bdf8;">(${m.firstPlanQty.toLocaleString('vi-VN')} pcs)</span>
          </div>
          ${m.upcomingDaysCount > 1 ? `
            <div style="font-size: 0.685rem; color: #94a3b8; margin-top: 2px;">
              (${m.upcomingDaysCount} đợt có kế hoạch)
            </div>
          ` : ''}
        </td>
        <td style="font-size: 0.775rem; color: #cbd5e1; vertical-align: middle;">
          <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #fef08a; font-weight: 700;">
            🚀 New Model
          </span>
          <span style="color: #94a3b8; margin-left: 0.35rem;">(Chuẩn bị Jig, NVL, SOP & theo dõi Ramp-up)</span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- KHỐI: CẢNH BÁO MODEL MỚI SẢN XUẤT (NEW MODELS) -->
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
        <div>
          <h3 style="font-size: 1rem; font-weight: 800; color: #fbbf24; display: flex; align-items: center; gap: 0.5rem; margin: 0; flex-wrap: wrap;">
            <span>🚀 CẢNH BÁO MODEL MỚI SẢN XUẤT (NEW MODELS)</span>
            <span class="badge badge-amber" style="font-size: 0.75rem; font-weight: 800;">
              ${filtered.length} / ${newModelsAll.length} Model
            </span>
            ${!isAllSelected ? `
              <span class="badge badge-blue" style="font-size: 0.75rem; font-weight: 700;">
                Đã chọn ${selectedStages.length} công đoạn
              </span>
            ` : ''}
            ${(fromDate || toDate) ? `
              <span class="badge badge-purple" style="font-size: 0.75rem; font-weight: 700;">
                📅 Kế hoạch: ${fromDate ? formatStandardDate(fromDate) : '...'} → ${toDate ? formatStandardDate(toDate) : '...'}
              </span>
            ` : ''}
          </h3>
          <p style="font-size: 0.75rem; color: #94a3b8; margin: 0.35rem 0 0 0;">
            💡 <em>Nguyên tắc phân loại: Model chưa từng có Plan và Fact trong quá khứ (cả Sheet Mass-History lẫn các kỳ trước) nhưng có kế hoạch (Plan &gt; 0) trong thời gian sắp tới.</em>
          </p>
        </div>
      </div>

      <!-- Toolbar Lọc & Tìm Kiếm Model Mới (Công Đoạn, Thời Gian, Từ Khóa) -->
      <div class="new-models-toolbar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding: 0.65rem 0.85rem; background: rgba(30, 41, 59, 0.45); border-radius: var(--radius-md); border: 1px solid var(--border-glass); margin-bottom: 0.85rem;">
        <!-- Left: Lọc Công Đoạn -->
        <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-right: 0.2rem;">Lọc Công Đoạn:</span>
          <button type="button" class="stage-pill-btn ${isAllSelected ? 'all-active' : ''}" 
                  onclick="handleFilterNewModelsStage('ALL')"
                  title="Hiển thị tất cả công đoạn">
            ${isAllSelected ? '✓ ' : ''}Tất cả
          </button>
          ${stageList.map(st => {
            const isSelected = !isAllSelected && selectedStages.includes(st);
            return `
              <button type="button" class="stage-pill-btn ${isSelected ? 'active' : ''}" 
                      onclick="handleFilterNewModelsStage('${st}')"
                      title="${isSelected ? 'Bỏ chọn công đoạn ' + st : 'Chọn công đoạn ' + st}">
                ${isSelected ? '<span style="font-weight:900;">✓</span> ' : ''}${st}
              </button>
            `;
          }).join('')}
          ${!isAllSelected ? `
            <button type="button" onclick="handleFilterNewModelsStage('ALL')" 
                    style="background: none; border: none; color: #94a3b8; font-size: 0.72rem; text-decoration: underline; cursor: pointer; padding: 0.2rem 0.4rem; margin-left: 0.3rem;"
                    title="Xóa bộ lọc công đoạn">
              ✕ Bỏ lọc
            </button>
          ` : ''}
        </div>

        <!-- Right: Tìm kiếm theo thời gian & Từ khóa -->
        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <!-- Tìm kiếm theo thời gian -->
          <div style="display: flex; align-items: center; gap: 0.35rem; background: rgba(15, 23, 42, 0.65); padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid var(--border-glass);">
            <span style="font-size: 0.75rem; font-weight: 700; color: #fbbf24; display: flex; align-items: center; gap: 0.25rem;">
              📅 Kế hoạch từ:
            </span>
            <input type="date" id="filterNewModelsFromDate" value="${fromDate || ''}" 
                   onchange="handleFilterNewModelsDateRange(this.value, document.getElementById('filterNewModelsToDate') ? document.getElementById('filterNewModelsToDate').value : '')"
                   title="Lọc Model Mới có kế hoạch từ ngày này"
                   style="background: rgba(30, 41, 59, 0.85); border: 1px solid var(--border-glass); border-radius: 4px; padding: 0.25rem 0.45rem; color: #f8fafc; font-size: 0.75rem; outline: none; font-family: monospace;" />
            <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8;">đến:</span>
            <input type="date" id="filterNewModelsToDate" value="${toDate || ''}" 
                   onchange="handleFilterNewModelsDateRange(document.getElementById('filterNewModelsFromDate') ? document.getElementById('filterNewModelsFromDate').value : '', this.value)"
                   title="Lọc Model Mới có kế hoạch đến ngày này"
                   style="background: rgba(30, 41, 59, 0.85); border: 1px solid var(--border-glass); border-radius: 4px; padding: 0.25rem 0.45rem; color: #f8fafc; font-size: 0.75rem; outline: none; font-family: monospace;" />
            ${(fromDate || toDate) ? `
              <button type="button" onclick="handleResetNewModelsDateFilter()" 
                      style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 0.2rem 0.45rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;"
                      title="Xóa bộ lọc theo thời gian">
                ✕ Xóa lọc
              </button>
            ` : ''}
          </div>

          <!-- Tìm Model / Mã 1C -->
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <input type="text" placeholder="🔍 Tìm Model / Mã 1C..." value="${searchKw}" 
                   oninput="handleSearchNewModels(this.value)"
                   style="background: rgba(30, 41, 59, 0.85); border: 1px solid var(--border-glass); border-radius: 6px; padding: 0.35rem 0.65rem; color: #f8fafc; font-size: 0.775rem; min-width: 175px;" />
          </div>
        </div>
      </div>

      <!-- Bảng Danh Sách Model Mới -->
      <div class="table-container" style="max-height: 480px; overflow: auto; border-radius: var(--radius-md);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">STT</th>
              <th style="text-align: center; min-width: 105px;">Công Đoạn</th>
              <th style="min-width: 120px;">Group Model</th>
              <th style="min-width: 230px;">Model (Mã 1C)</th>
              <th style="text-align: center; min-width: 135px; color: #fbbf24;">
                NGÀY GẦN NHẤT CÓ PLAN
              </th>
              <th style="text-align: right; min-width: 115px; color: #38bdf8;">
                PLAN NGÀY ĐẦU (PCS)
              </th>
              <th style="text-align: right; min-width: 155px; color: #34d399;">
                TỔNG KẾ HOẠCH ĐỢT TỚI
              </th>
              <th style="text-align: left; min-width: 190px;">
                ĐÁNH GIÁ &amp; LƯU Ý CHUẨN BỊ
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || `
              <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                  Không tìm thấy Model Mới nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Pagination for New Models Table -->
      ${totalPages > 1 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.775rem; color: var(--text-secondary);">
          <div>Hiển thị ${startIdx + 1} - ${Math.min(startIdx + NEW_MODELS_PAGE_SIZE, totalItems)} / ${totalItems} Model Mới</div>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline" style="font-size: 0.725rem; padding: 0.2rem 0.5rem;" ${currentPage <= 1 ? 'disabled' : ''} onclick="handleNewModelsPage(${currentPage - 1})">◀ Trang trước</button>
            <span style="padding: 0.2rem 0.5rem; font-weight: 700; color: #38bdf8;">${currentPage} / ${totalPages}</span>
            <button class="btn btn-outline" style="font-size: 0.725rem; padding: 0.2rem 0.5rem;" ${currentPage >= totalPages ? 'disabled' : ''} onclick="handleNewModelsPage(${currentPage + 1})">Trang sau ▶</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Duy trì trạng thái thu gọn nếu người dùng đã thu gọn trước đó
  if (localStorage.getItem('AJAX_PROPLAN_ATTENTION_COLLAPSED') === 'true') {
    window.toggleAttentionSectionCollapse(true);
  }

  // Hỗ trợ chụp ảnh bằng chứng nếu có tham số ?scroll=attention
  try {
    if (new URLSearchParams(window.location.search).get('scroll') === 'attention') {
      const card = document.getElementById('datamassAttentionCard');
      const tab = document.getElementById('tab-datamass');
      if (card && tab && tab.firstElementChild !== card) {
        tab.insertBefore(card, tab.firstElementChild);
      }
    }
  } catch(e) {}
};

window.handleFilterNewModelsStage = function(stage) {
  if (!Array.isArray(window.__NEW_MODELS_SELECTED_STAGES__)) {
    window.__NEW_MODELS_SELECTED_STAGES__ = [];
  }

  if (stage === 'ALL') {
    // Reset to All
    window.__NEW_MODELS_SELECTED_STAGES__ = [];
  } else {
    const idx = window.__NEW_MODELS_SELECTED_STAGES__.indexOf(stage);
    if (idx > -1) {
      // Toggle off
      window.__NEW_MODELS_SELECTED_STAGES__.splice(idx, 1);
    } else {
      // Toggle on (multi-selection)
      window.__NEW_MODELS_SELECTED_STAGES__.push(stage);
    }
  }

  window.__NEW_MODELS_PAGE__ = 1;
  window.renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
};

window.handleSearchNewModels = function(text) {
  window.__NEW_MODELS_SEARCH__ = text;
  window.__NEW_MODELS_PAGE__ = 1;
  window.renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
};

window.handleNewModelsPage = function(page) {
  window.__NEW_MODELS_PAGE__ = page;
  window.renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
};

window.handleFilterNewModelsDateRange = function(from, to) {
  window.__NEW_MODELS_FROM_DATE__ = from ? toIsoDateStr(from) : '';
  window.__NEW_MODELS_TO_DATE__ = to ? toIsoDateStr(to) : '';
  window.__NEW_MODELS_PAGE__ = 1;
  window.renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
};

window.handleResetNewModelsDateFilter = function() {
  window.__NEW_MODELS_FROM_DATE__ = '';
  window.__NEW_MODELS_TO_DATE__ = '';
  window.__NEW_MODELS_PAGE__ = 1;
  window.renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
};

window.handleCopyNewModelsTable = function() {
  const newModelsAll = window.findNewModels();
  if (!newModelsAll || newModelsAll.length === 0) {
    window.showToast('warning', 'Không tìm thấy Model Mới nào để sao chép!');
    return;
  }

  // Respect current filter (stages, keyword, date range)
  const newModels = filterNewModelsList(newModelsAll);

  if (newModels.length === 0) {
    window.showToast('warning', 'Không có Model Mới nào phù hợp với bộ lọc hiện tại để sao chép!');
    return;
  }

  const matrix = [
    [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Model (Mã 1C)',
      'Ngày Gần Nhất Có Kế Hoạch (DD/MM/YYYY)',
      'Kế Hoạch Ngày Gần Nhất (pcs)',
      'Tổng Kế Hoạch Đợt Tới (pcs)',
      'Cụ Thể Ngày Gần Nhất (DD/MM/YYYY - pcs)',
      'Số Đợt Có Kế Hoạch (đợt)',
      'Chi Tiết Các Đợt Kế Hoạch',
      'Lưu Ý Chuẩn Bị & Triển Khai'
    ]
  ];

  newModels.forEach((m, idx) => {
    const nearestDetail = `${m.firstPlanDateFormatted} (${m.firstPlanQty} pcs)`;

    matrix.push([
      idx + 1,
      stripEmojis(m.stage || ''),
      m.model || '',
      m.productName1C || '',
      m.firstPlanDateFormatted || formatStandardDate(m.firstPlanDate),
      m.firstPlanQty || 0,
      m.totalUpcomingPlan || 0,
      nearestDetail,
      m.upcomingDaysCount || 0,
      m.upcomingPlansSummary || '',
      stripEmojis(m.notes || 'New Model - Chuẩn bị Jig, linh kiện, SOP & theo dõi Ramp-up')
    ]);
  });

  const tsv = matrixToTsv(matrix);
  copyToClipboardUtil(tsv, `📋 Đã sao chép ${newModels.length} Model Mới vào clipboard! Đầy đủ số liệu thuần túy, ngày gần nhất và tổng kế hoạch.`);
};

window.handleExportNewModelsCSV = function() {
  const newModelsAll = window.findNewModels();
  if (!newModelsAll || newModelsAll.length === 0) {
    window.showToast('warning', 'Không tìm thấy Model Mới nào để xuất file!');
    return;
  }

  // Respect current filter (stages, keyword, date range)
  const newModels = filterNewModelsList(newModelsAll);

  if (newModels.length === 0) {
    window.showToast('warning', 'Không có Model Mới nào phù hợp với bộ lọc hiện tại để xuất file!');
    return;
  }

  const matrix = [
    [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Model (Mã 1C)',
      'Ngày Gần Nhất Có Kế Hoạch (DD/MM/YYYY)',
      'Kế Hoạch Ngày Gần Nhất (pcs)',
      'Tổng Kế Hoạch Đợt Tới (pcs)',
      'Cụ Thể Ngày Gần Nhất (DD/MM/YYYY - pcs)',
      'Số Đợt Có Kế Hoạch (đợt)',
      'Chi Tiết Các Đợt Kế Hoạch',
      'Lưu Ý Chuẩn Bị & Triển Khai'
    ]
  ];

  newModels.forEach((m, idx) => {
    const nearestDetail = `${m.firstPlanDateFormatted} (${m.firstPlanQty} pcs)`;

    matrix.push([
      idx + 1,
      stripEmojis(m.stage || ''),
      m.model || '',
      m.productName1C || '',
      m.firstPlanDateFormatted || formatStandardDate(m.firstPlanDate),
      m.firstPlanQty || 0,
      m.totalUpcomingPlan || 0,
      nearestDetail,
      m.upcomingDaysCount || 0,
      m.upcomingPlansSummary || '',
      stripEmojis(m.notes || 'New Model - Chuẩn bị Jig, linh kiện, SOP & theo dõi Ramp-up')
    ]);
  });

  const csv = matrixToCsv(matrix);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  downloadCsvUtil(csv, `Danh_Sach_Model_Moi_San_Xuat_${dateStr}.csv`);
  window.showToast('success', `📥 Đã xuất file CSV ${newModels.length} Model Mới chuẩn Google Sheets!`);
};


// Handlers for Table 2 Cascading Filters (Công Đoạn -> Group Model -> Model 1C)
window.handleDataMassTableStageChange = function(stage) {
  window.AppStore.selectedTableStageFilter = stage;
  window.AppStore.selectedModelFilter = 'ALL';
  window.AppStore.selectedProduct1CFilter = 'ALL';
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
  window.showToast('info', `Đã lọc Công Đoạn: ${stage === 'ALL' ? 'Tất cả' : stage}`);
};

window.handleDataMassModelChange = function(model) {
  window.AppStore.selectedModelFilter = model;
  window.AppStore.selectedProduct1CFilter = 'ALL';
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
  window.showToast('info', `Đã lọc Group Model: ${model === 'ALL' ? 'Tất cả' : model}`);
};

window.handleDataMassProduct1CChange = function(p1c) {
  window.AppStore.selectedProduct1CFilter = p1c;
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
  window.showToast('info', `Đã lọc Model (1C): ${p1c === 'ALL' ? 'Tất cả' : p1c}`);
};

window.handleResetTable2Filters = function() {
  window.AppStore.selectedTableStageFilter = 'ALL';
  window.AppStore.selectedModelFilter = 'ALL';
  window.AppStore.selectedProduct1CFilter = 'ALL';
  window.AppStore.selectedPlanStatusFilter = 'GAP_NEGATIVE';
  window.AppStore.table2ViewMode = 'CUMULATIVE';
  const planStatusSelect = document.getElementById('datamassPlanStatusSelect');
  if (planStatusSelect) planStatusSelect.value = 'GAP_NEGATIVE';
  const sInput = document.getElementById('datamassSearchInput');
  if (sInput) sInput.value = '';
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
  window.showToast('success', 'Đã đặt lại bộ lọc Bảng 2 về mặc định (Chỉ xem tổng lũy kế, Đang thiếu hụt < 0)!');
};

window.handleDataMassPlanStatusChange = function(status) {
  window.AppStore.selectedPlanStatusFilter = status;
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
  const labelMap = {
    'HAS_PLAN': 'Có Kế Hoạch (Plan > 0)',
    'ALL': 'Tất cả Model',
    'GAP_NEGATIVE': 'Đang Thiếu Hụt (Gap < 0)',
    'COMPLETED': 'Đã Hoàn Thành (Fact >= Plan)',
    'NO_PLAN': 'Chưa Có Kế Hoạch'
  };
  window.showToast('info', `Đã lọc Kế hoạch: ${labelMap[status] || status}`);
};

const ALL_INDIVIDUAL_STAGES = [
  { id: 'ASSEMBLY', name: '🔧 ASSEMBLY', desc: 'Lắp ráp cụm chi tiết' },
  { id: 'HARD TEST', name: '🔬 HARD TEST', desc: 'Kiểm tra mạch chức năng' },
  { id: 'OPTICS ASM', name: '🔭 OPTICS ASM', desc: 'Lắp ráp quang học' },
  { id: 'A IMP ASM', name: '⚙️ A IMP ASM', desc: 'Lắp ráp A IMP' },
  { id: 'FOCUS', name: '🎯 FOCUS', desc: 'Căn chỉnh tiêu cự' },
  { id: 'LONG TEST', name: '⏱️ LONG TEST', desc: 'Chạy thử kiểm tra dài' },
  { id: 'TEST ROOM', name: '🌡️ TEST ROOM', desc: 'Phòng test nhiệt/môi trường' },
  { id: 'QC', name: '🔍 QC', desc: 'Kiểm tra chất lượng' },
  { id: 'PKG', name: '📦 PKG', desc: 'Đóng gói bao bì' },
  { id: 'COM PKG', name: '📦 COM PKG', desc: 'Đóng gói cụm COM' },
  { id: 'COM PKG AUTO', name: '🤖 COM PKG AUTO', desc: 'Đóng gói tự động' },
  { id: 'MB', name: '💻 MB', desc: 'Đóng thùng MasterBox' }
];

window.toggleStageMultiSelectDropdown = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const menu = document.getElementById('stageMultiSelectMenu');
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    window.closeStageMultiSelectDropdown();
  } else {
    // If mobile, append menu to body so it breaks out of parent stacking contexts and transforms
    if (window.innerWidth <= 768) {
      if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
      }
    } else {
      const container = document.getElementById('stageMultiSelectContainer');
      if (container && menu.parentElement !== container) {
        container.appendChild(menu);
      }
    }

    window.renderStageCheckboxList();
    menu.classList.add('open');
    menu.style.display = 'flex';

    // If on mobile device, manage backdrop
    let backdrop = document.getElementById('stageMultiSelectBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'stageMultiSelectBackdrop';
      backdrop.className = 'stage-menu-backdrop';
      backdrop.onclick = function(ev) {
        window.closeStageMultiSelectDropdown(ev);
      };
      document.body.appendChild(backdrop);
    }
    if (window.innerWidth <= 768) {
      backdrop.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }
};

window.closeStageMultiSelectDropdown = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const menu = document.getElementById('stageMultiSelectMenu');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
    if (window.innerWidth > 768) {
      const container = document.getElementById('stageMultiSelectContainer');
      if (container && menu.parentElement !== container) {
        container.appendChild(menu);
      }
    }
  }
  const backdrop = document.getElementById('stageMultiSelectBackdrop');
  if (backdrop) {
    backdrop.style.display = 'none';
  }
  document.body.style.overflow = '';
};

window.renderStageCheckboxList = function() {
  const listEl = document.getElementById('stageCheckboxList');
  if (!listEl) return;

  const curFilter = window.AppStore.selectedStageFilter || 'HARDTEST_TOTAL';
  const activeSet = window.AppStore.resolveActiveStageSet ? window.AppStore.resolveActiveStageSet(curFilter) : new Set();
  const isAll = activeSet.has('ALL');

  let html = '';
  ALL_INDIVIDUAL_STAGES.forEach(st => {
    const isChecked = isAll || activeSet.has(st.id);
    html += `
      <div class="stage-checkbox-row ${isChecked ? 'checked' : ''}" onclick="window.handleStageRowClick('${st.id}', event)">
        <div class="stage-checkbox-main">
          <div class="stage-checkbox-custom">${isChecked ? '✓' : ''}</div>
          <div>
            <div style="font-weight: 700; color: #f1f5f9;">${st.name}</div>
            <div style="font-size: 0.63rem; color: #94a3b8;">${st.desc}</div>
          </div>
        </div>
        <button type="button" class="btn-stage-only" onclick="window.handleStageSelectOnly('${st.id}', event)" title="Chỉ chọn công đoạn này">
          Chỉ chọn
        </button>
      </div>
    `;
  });
  listEl.innerHTML = html;

  // Highlight active bundle card if matches
  document.querySelectorAll('.stage-quick-bundles .bundle-item').forEach(b => {
    const bundleKey = b.dataset.bundle;
    if (bundleKey === curFilter) b.classList.add('active');
    else b.classList.remove('active');
  });

  // Update footer text
  const countText = document.getElementById('stageSelectedCountText');
  if (countText) {
    if (curFilter === 'HARDTEST_TOTAL') countText.textContent = 'Đang chọn: ⭐ Total Hard Test (4 c/đ)';
    else if (curFilter === 'ASSEMBLY') countText.textContent = 'Đang chọn: 🔧 ASSEMBLY';
    else if (curFilter === 'HARDTEST_AND_ASSEMBLY') countText.textContent = 'Đang chọn: 🚀 Tổng SFPD (5 c/đ)';
    else if (curFilter === 'FPD_TOTAL') countText.textContent = 'Đang chọn: 📦 Tổng FPD (4 c/đ)';
    else if (curFilter === 'MASTERBOX_TOTAL') countText.textContent = 'Đang chọn: 💻 Tổng MasterBox (3 c/đ)';
    else if (curFilter === 'ALL' || isAll) countText.textContent = 'Đang chọn: 🏭 Toàn Bộ Nhà Máy (12 c/đ)';
    else if (Array.isArray(curFilter)) countText.textContent = `Đang chọn: ${curFilter.length} công đoạn (${curFilter.join(', ')})`;
    else countText.textContent = `Đang chọn: ${curFilter}`;
  }
};

window.handleStageGroupSelect = function(groupKey, e) {
  if (e) e.stopPropagation();
  window.handleDataMassStageChange(groupKey);
  window.renderStageCheckboxList();
};

window.handleStageRowClick = function(stageId, e) {
  if (e) e.stopPropagation();
  const curFilter = window.AppStore.selectedStageFilter || 'HARDTEST_TOTAL';
  let curList = [];

  if (curFilter === 'ALL') {
    curList = ALL_INDIVIDUAL_STAGES.map(s => s.id);
  } else if (curFilter === 'HARDTEST_TOTAL') {
    curList = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
  } else if (curFilter === 'HARDTEST_AND_ASSEMBLY') {
    curList = ['ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
  } else if (curFilter === 'FPD_TOTAL') {
    curList = ['LONG TEST', 'TEST ROOM', 'QC', 'PKG'];
  } else if (curFilter === 'MASTERBOX_TOTAL') {
    curList = ['COM PKG', 'COM PKG AUTO', 'MB'];
  } else if (Array.isArray(curFilter)) {
    curList = [...curFilter];
  } else if (typeof curFilter === 'string' && curFilter.includes(',')) {
    curList = curFilter.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    curList = [curFilter];
  }

  const idx = curList.indexOf(stageId);
  if (idx >= 0) {
    if (curList.length <= 1) {
      window.showToast('warning', 'Phải giữ lại ít nhất 1 công đoạn!');
      return;
    }
    curList.splice(idx, 1);
  } else {
    curList.push(stageId);
  }

  // Check if matches entire factory
  if (curList.length === ALL_INDIVIDUAL_STAGES.length) {
    window.handleDataMassStageChange('ALL');
  } else if (curList.length === 1) {
    window.handleDataMassStageChange(curList[0]);
  } else {
    const fpdOrder = ['LONG TEST', 'TEST ROOM', 'QC', 'PKG'];
    const mbOrder = ['COM PKG', 'COM PKG AUTO', 'MB'];
    const htOrder = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
    if (curList.length === 4 && fpdOrder.every(s => curList.includes(s))) {
      window.handleDataMassStageChange('FPD_TOTAL');
    } else if (curList.length === 3 && mbOrder.every(s => curList.includes(s))) {
      window.handleDataMassStageChange('MASTERBOX_TOTAL');
    } else if (curList.length === 4 && htOrder.every(s => curList.includes(s))) {
      window.handleDataMassStageChange('HARDTEST_TOTAL');
    } else {
      window.handleDataMassStageChange(curList);
    }
  }

  window.renderStageCheckboxList();
};

window.handleStageSelectOnly = function(stageId, e) {
  if (e) e.stopPropagation();
  window.handleDataMassStageChange(stageId);
  window.renderStageCheckboxList();
};

window.handleStageSelectAll = function(e) {
  if (e) e.stopPropagation();
  window.handleDataMassStageChange('ALL');
  window.renderStageCheckboxList();
};

window.handleStageClearAll = function(e) {
  if (e) e.stopPropagation();
  window.handleDataMassStageChange('HARDTEST_TOTAL');
  window.renderStageCheckboxList();
};

// Global click outside listener
if (!window._stageMultiSelectListenerAttached) {
  document.addEventListener('click', function(e) {
    const container = document.getElementById('stageMultiSelectContainer');
    const menu = document.getElementById('stageMultiSelectMenu');
    if (menu && menu.classList.contains('open') && container && !container.contains(e.target) && !menu.contains(e.target)) {
      window.closeStageMultiSelectDropdown(e);
    }
  });
  window._stageMultiSelectListenerAttached = true;
}

window.handleDataMassStageChange = function(stage) {
  window.AppStore.selectedStageFilter = stage;
  window.AppStore.selectedTableStageFilter = 'ALL'; // Reset table stage filter when top stage changes
  window.AppStore.selectedModelFilter = 'ALL'; // Reset model filter when stage changes
  window.AppStore.selectedProduct1CFilter = 'ALL'; // Reset product 1C filter when stage changes
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();

  let label = stage;
  if (stage === 'ALL') label = 'Toàn Nhà Máy';
  else if (stage === 'HARDTEST_TOTAL') label = 'Total Hard Test';
  else if (stage === 'HARDTEST_AND_ASSEMBLY') label = 'Tổng SFPD';
  else if (stage === 'FPD_TOTAL') label = 'Tổng FPD (4 Công Đoạn)';
  else if (stage === 'MASTERBOX_TOTAL') label = 'Tổng MasterBox (3 Công Đoạn)';
  else if (Array.isArray(stage)) label = `${stage.length} công đoạn (${stage.join(', ')})`;
  window.showToast('info', `Đã chọn: ${label}`);
};

window.handleDataMassViewMode = function(mode) {
  if (mode === 'CAPACITY') {
    window.switchToTab('capacity');
    return;
  }
  window.AppStore.dataMassViewMode = mode;
  document.querySelectorAll('.btn-mode[data-mode]').forEach(btn => {
    if (btn.dataset.mode === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderDataMassView();
};

window.handleActualAttendanceEdit = function(dateStr, shift, stage, value, inputEl) {
  const log = window.AppStore.saveActualAttendance(dateStr, shift, stage, value);
  if (inputEl) {
    inputEl.style.outline = '2px solid #10b981';
    setTimeout(() => { if (inputEl) inputEl.style.outline = 'none'; }, 800);
  }
  renderDataMassView();

  const shiftLabel = shift === 'Day' ? 'Ca Ngày' : shift === 'Night' ? 'Ca Đêm' : 'Cả 2 Ca';
  const otMsg = (log && log.otHours > 0) ? ` • Cần bù ${log.otHours}h OT` : '';
  window.showToast('success', `💾 Đã lưu & ghi lịch sử: ${stage} (${dateStr} - ${shiftLabel}) = ${value} người${otMsg}`);
  window.updateAttendanceHistoryBadge();
};

window.applyStandardManpowerToAll = function() {
  if (confirm('Khôi phục toàn bộ số nhân lực có mặt theo đúng định mức của Sheet Manpower (Assy 14ng/line, HT tổng theo kíp trực)?')) {
    localStorage.removeItem('AJAX_PROPLAN_ACTUAL_ATTENDANCE');
    if (window.AppStore) {
      window.AppStore.actualAttendance = {};
    }
    window.showToast('success', '✅ Đã khôi phục toàn bộ nhân lực theo đúng Sheet Manpower & lịch xoay ca!');
    renderDataMassView();
  }
};

window.handleSupplementEdit = function(dateStr, shift, stage, value, inputEl) {
  const log = window.AppStore.saveActualSupplement(dateStr, shift, stage, value);
  if (inputEl) {
    inputEl.style.outline = '2px solid #a855f7';
    setTimeout(() => { if (inputEl) inputEl.style.outline = 'none'; }, 800);
  }
  renderDataMassView();

  const shiftLabel = shift === 'Day' ? 'Ca Ngày' : shift === 'Night' ? 'Ca Đêm' : 'Cả 2 Ca';
  const valStr = (value === '' || value === null) ? 'Mặc định thiếu hụt' : `${value} người`;
  const otMsg = (log && log.otHours > 0) ? ` -> Cần ${log.otHours}h OT (12h OT/người)` : '';
  window.showToast('success', `💾 Đã lưu thực tế bổ sung: ${stage} (${dateStr} - ${shiftLabel}) = ${valStr}${otMsg}`);
  window.updateAttendanceHistoryBadge();
};

window.updateAttendanceHistoryBadge = function() {
  const badge = document.getElementById('historyCountBadge');
  if (badge && window.AppStore && window.AppStore.attendanceLog) {
    badge.textContent = window.AppStore.attendanceLog.length;
  }
};

window.handleSaveAllManpower = function() {
  try {
    localStorage.setItem('AJAX_PROPLAN_ACTUAL_ATTENDANCE', JSON.stringify(window.AppStore.actualAttendance));
    localStorage.setItem('AJAX_PROPLAN_ACTUAL_SUPPLEMENT', JSON.stringify(window.AppStore.actualSupplement));
    localStorage.setItem('AJAX_PROPLAN_ATTENDANCE_LOG', JSON.stringify(window.AppStore.attendanceLog));
    window.showToast('success', '💾 Đã lưu toàn bộ dữ liệu nhân lực, bổ sung & lịch sử kiểm toán vào bộ nhớ!');
  } catch(e) {
    window.showToast('info', 'Dữ liệu nhân lực đã được đồng bộ trong phiên làm việc');
  }
};

window.openAttendanceHistoryModal = function() {
  const modal = document.getElementById('attendanceHistoryModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Populate dynamic date filter options from logs & dates
  const dateSelect = document.getElementById('historyFilterDate');
  if (dateSelect) {
    const dates = new Set();
    (window.AppStore.attendanceLog || []).forEach(l => { if (l.date) dates.add(l.date); });
    (window.AppStore.getAllDates ? window.AppStore.getAllDates() : []).forEach(d => dates.add(d));
    const sortedDates = Array.from(dates).sort((a,b) => new Date(b) - new Date(a));
    
    let html = '<option value="ALL">📅 Tất cả các ngày</option>';
    sortedDates.forEach(d => {
      html += `<option value="${d}">${d}</option>`;
    });
    dateSelect.innerHTML = html;
  }

  window.renderAttendanceHistoryTable();
};

window.closeAttendanceHistoryModal = function() {
  const modal = document.getElementById('attendanceHistoryModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = 'auto';
};

window.handleAttendanceHistoryFilterChange = function() {
  window.renderAttendanceHistoryTable();
};

window.renderAttendanceHistoryTable = function() {
  const container = document.getElementById('historyTableBody');
  const countSpan = document.getElementById('historyModalTotalCount');
  if (!container) return;

  const filterDate = document.getElementById('historyFilterDate') ? document.getElementById('historyFilterDate').value : 'ALL';
  const filterStage = document.getElementById('historyFilterStage') ? document.getElementById('historyFilterStage').value : 'ALL';
  const filterShift = document.getElementById('historyFilterShift') ? document.getElementById('historyFilterShift').value : 'ALL';
  const search = document.getElementById('historySearch') ? document.getElementById('historySearch').value.trim() : '';

  const logs = window.AppStore.getAttendanceHistory({ filterDate, filterStage, filterShift, search });

  if (countSpan) countSpan.textContent = `${logs.length} bản ghi`;
  window.updateAttendanceHistoryBadge();

  if (logs.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 0.25rem;">
            Không tìm thấy bản ghi lịch sử nào phù hợp
          </div>
          <div style="font-size: 0.8rem;">
            Hãy thử đổi bộ lọc hoặc nhập nhân lực thực tế ở bảng trên để hệ thống tự động ghi nhật ký.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = logs.map((item, idx) => {
    const shiftBadge = (item.shift === 'Day' || item.shift === 'DAY')
      ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.725rem;">☀️ Ca Ngày</span>`
      : (item.shift === 'Night' || item.shift === 'NIGHT')
      ? `<span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.725rem;">🌙 Ca Đêm</span>`
      : `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.725rem;">🌐 Cả 2 Ca</span>`;

    const stageNorm = window.AppStore._normalizeStageKey(item.stage);
    const stageColor = stageNorm.includes('hard_test') ? '#c084fc'
      : stageNorm.includes('optics') ? '#fbbf24'
      : stageNorm.includes('focus') ? '#34d399'
      : stageNorm.includes('a_imp') ? '#60a5fa'
      : stageNorm.includes('assembly') ? '#38bdf8' : '#e2e8f0';

    const balVal = item.balance !== undefined ? item.balance : (item.newValue - (item.planValue || 0));
    const isShort = balVal < 0;
    const balColor = isShort ? '#ef4444' : '#10b981';
    const balSign = balVal > 0 ? '+' : '';

    const otDisplay = item.otHours > 0
      ? `<span class="badge-mp-ot" style="font-size: 0.725rem;">⏰ ${item.otHours.toFixed(1)} h</span>`
      : `<span style="color: var(--text-muted); font-size: 0.75rem;">0h</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-glass); transition: background 0.15s ease;">
        <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
        <td class="font-mono" style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap;">
          ${item.timestamp || '--'}
        </td>
        <td class="font-mono" style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; white-space: nowrap;">
          📅 ${item.date || '--'}
        </td>
        <td style="white-space: nowrap;">${shiftBadge}</td>
        <td>
          <span style="font-weight: 700; color: ${stageColor}; font-size: 0.825rem;">
            ${item.stage || '--'}
          </span>
        </td>
        <td class="font-mono" style="text-align: right; color: #fbbf24; font-weight: 700; font-size: 0.825rem;">
          ${item.planValue !== undefined && item.planValue > 0 ? item.planValue.toFixed(1) : '--'}
        </td>
        <td class="font-mono" style="text-align: right; color: var(--text-muted); font-size: 0.825rem;">
          ${item.oldValue !== undefined ? item.oldValue.toFixed(1) : '--'}
        </td>
        <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800; font-size: 0.9rem; background: rgba(16, 185, 129, 0.08);">
          ${item.newValue !== undefined ? item.newValue.toFixed(1) : '--'} ng
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 800; color: ${balColor}; font-size: 0.825rem;">
          ${balSign}${balVal.toFixed(1)}
        </td>
        <td style="text-align: center;">${otDisplay}</td>
        <td style="font-size: 0.75rem; color: var(--text-secondary); max-width: 220px; word-break: break-word;">
          ${item.note || '--'}
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-secondary" style="padding: 0.2rem 0.55rem; font-size: 0.7rem; border-radius: 4px;"
                  onclick="handleRestoreAttendanceHistory('${item.id}')"
                  title="Khôi phục lại giá trị thực tế cũ (${item.oldValue || 0} ng) trước lần sửa này">
            ↩️ Khôi phục
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.handleRestoreAttendanceHistory = function(logId) {
  const success = window.AppStore.restoreAttendanceHistoryItem(logId);
  if (success) {
    window.renderAttendanceHistoryTable();
    renderDataMassView();
    window.showToast('success', '✅ Đã khôi phục giá trị nhân lực thành công từ bản ghi lịch sử!');
  } else {
    window.showToast('error', 'Không tìm thấy bản ghi để khôi phục');
  }
};

window.handleClearAttendanceHistory = function() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nhập liệu nhân lực không?\nThao tác này sẽ xóa sạch nhật ký kiểm toán nhưng giữ nguyên số liệu thực tế hiện tại.')) {
    window.AppStore.clearAttendanceHistory();
    window.renderAttendanceHistoryTable();
    window.showToast('info', 'Đã xóa toàn bộ lịch sử nhập liệu nhân lực');
  }
};

window.handleExportAttendanceHistoryCsv = function() {
  const logs = window.AppStore.attendanceLog || [];
  if (logs.length === 0) {
    window.showToast('warning', 'Chưa có bản ghi lịch sử nào để xuất file!');
    return;
  }

  let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  csv += 'STT,Thoi Gian Luu,Ngay Lam Viec,Ca Lam Viec,Dinh Muc Gio Ca (h),Cong Doan,Ke Hoach (ng),Thuc Te Cu (ng),Thuc Te Moi (ng),Chenh Lech (ng),So Nguoi Thieu (ng),Gio OT Can Bu (h),Ghi Chu\n';

  logs.forEach((l, idx) => {
    const shiftHours = l.shiftHour || 12.0;
    const shortage = l.shortage || (l.balance < 0 ? Math.abs(l.balance) : 0);
    const otHours = l.otHours || Math.round(shortage * shiftHours * 10) / 10;
    const cleanNote = (l.note || '').replace(/"/g, '""');

    csv += `"${idx + 1}","${l.timestamp || ''}","${l.date || ''}","${l.shift || ''}","${shiftHours}","${l.stage || ''}","${l.planValue || 0}","${l.oldValue || 0}","${l.newValue || 0}","${l.balance || 0}","${shortage}","${otHours}","${cleanNote}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  a.download = `Lich_su_nhap_nhan_luc_AJAX_PROPLAN_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  window.showToast('success', `📥 Đã xuất file CSV lịch sử (${logs.length} bản ghi)!`);
};

// ====================================================================
// GOOGLE SHEETS COPY & EXPORT FUNCTIONS (TAB 1, TAB 2 & BẢNG 2)
// CHUẨN DỮ LIỆU: PURE NUMBER, ĐƠN VỊ TÍNH Ở HẠNG MỤC, KHÔNG CÓ EMOJI,
// HIỆN ĐỦ NGÀY THÁNG CHUẨN, CHI TIẾT NGUYÊN NHÂN ÂM TỪ MASS HISTORY
// ====================================================================

/**
 * Xóa sạch toàn bộ emoji và biểu tượng trang trí
 */
function stripEmojis(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[☀️🌙⏱️⚡⚠️✅📦💻🔬🔭⚙️🤖🎯🚀🔧⭐📋🏭📉👥👷👨🤝⚖️💡]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Định dạng ngày chuẩn dạng DD/MM/YYYY cho Google Sheets & Excel
 */
function formatStandardDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${d}/${m}/${y}`;
    }
  } else if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
  }
  return s;
}

/**
 * Tiện ích sao chép văn bản vào Clipboard (với fallback cho trình duyệt chặn hoặc HTTP)
 */
function copyToClipboardUtil(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast('success', successMsg);
    }).catch(() => {
      fallbackCopyToClipboard(text, successMsg);
    });
  } else {
    fallbackCopyToClipboard(text, successMsg);
  }
}

function fallbackCopyToClipboard(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    if (ok) {
      window.showToast('success', successMsg);
    } else {
      window.showToast('warning', 'Không thể tự động copy, vui lòng thử lại.');
    }
  } catch (e) {
    window.showToast('danger', 'Trình duyệt chặn sao chép clipboard.');
  }
  document.body.removeChild(ta);
}

/**
 * Tiện ích tải file CSV chuẩn UTF-8 (BOM \uFEFF) cho Google Sheets & Excel
 */
function downloadCsvUtil(csvString, filename) {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Chuyển đổi Ma trận 2D thành chuỗi TSV (phân cách \t) để dán Ctrl+V trực tiếp vào Google Sheets
 */
function matrixToTsv(matrix) {
  return matrix.map(row => {
    return row.map(val => {
      let str = (val === null || val === undefined) ? '' : String(val).trim();
      if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join('\t');
  }).join('\n');
}

/**
 * Chuyển đổi Ma trận 2D thành chuỗi CSV (phân cách dấu phẩy ,) để mở trên Google Sheets / Excel
 */
function matrixToCsv(matrix) {
  return matrix.map(row => {
    return row.map(val => {
      let str = (val === null || val === undefined) ? '' : String(val).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  }).join('\r\n');
}

// -------------------------------------------------------------
// 1. TÌNH TRẠNG NHÂN LỰC & CÂN ĐỐI CA (TAB 1)
// -------------------------------------------------------------
function buildManpowerMatrixClean() {
  const schedule = window.__LATEST_SCHEDULE__;
  const stages = window.__LATEST_MP_STAGES__;
  if (!schedule || !stages || stages.length === 0) {
    return [];
  }

  const shiftFilter = window.AppStore ? (window.AppStore.currentShiftFilter || 'ALL') : 'ALL';
  const isSplit = shiftFilter === 'SPLIT';
  const dates = schedule.dates || [];
  const selectedDateSet = new Set(schedule.selectedDates || dates);
  const isCompact = (window.AppStore && window.AppStore.manpowerTableMode === 'COMPACT');

  // Header
  const header = ['STT', 'Công Đoạn', 'Hạng Mục Chỉ Tiêu'];
  dates.forEach(d => {
    const stdDate = formatStandardDate(d);
    const dayName = getDayOfWeekName ? getDayOfWeekName(d) : '';
    const dateTitle = dayName ? `${stdDate} (${dayName})` : stdDate;
    if (isSplit) {
      header.push(`${dateTitle} [Ca Ngày]`, `${dateTitle} [Ca Đêm]`);
    } else {
      header.push(dateTitle);
    }
  });
  header.push('Tổng Lũy Kế', 'Trung Bình / Ngày', 'Đánh Giá & Khuyến Nghị');

  const matrix = [header];

  stages.forEach((sum, idx) => {
    const rawStageName = sum.stage || '';
    const stageClean = stripEmojis(rawStageName);
    const isGrand = sum.isGrandTotal;
    const targetSaveStage = sum.saveStage || (sum.isMajorComposite || (isGrand && !sum.isHardtestGroup) ? 'major_composite' : (sum.isHardtestGroup ? 'HARDTEST_TOTAL' : (rawStageName === 'ASSEMBLY' ? 'ASSEMBLY' : rawStageName)));
    const isAssembly = Boolean(rawStageName === 'ASSEMBLY' || targetSaveStage === 'ASSEMBLY' || sum.saveStage === 'ASSEMBLY');
    const isAutoSum = Boolean(sum.isMajorComposite || (isGrand && !sum.isHardtestGroup && !rawStageName.includes('Plan HT Total') && !rawStageName.includes('HARD TEST')));

    const getDomAttendance = (date, shift) => {
      const input = document.querySelector(`input.mp-edit-input[data-stage="${targetSaveStage}"][data-date="${date}"][data-shift="${shift}"]`);
      if (input && input.value !== undefined && input.value.trim() !== '') {
        const parsed = parseFloat(input.value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return window.AppStore.getActualAttendance(date, shift, targetSaveStage);
    };

    const getDomSupplement = (date, shift) => {
      const input = document.querySelector(`input.supp-edit-input[data-stage="${targetSaveStage}"][data-date="${date}"][data-shift="${shift}"]`);
      if (input && input.value !== undefined && input.value.trim() !== '') {
        const parsed = parseFloat(input.value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return window.AppStore.getActualSupplement ? window.AppStore.getActualSupplement(date, shift, targetSaveStage) : null;
    };

    let cumPlan = 0, cumAct = 0, cumShortage = 0, cumSupp = 0, cumOt = 0, selDays = 0;
    let cumPlanLines = 0, cumActLines = 0;

    const rowPlan = [idx + 1, stageClean, '1. Kế Hoạch Cần (người)'];
    const rowPlanLines = isAssembly ? [idx + 1, stageClean, '1b. Kế Hoạch Cần Số Line (Line)'] : null;
    const rowAct = [idx + 1, stageClean, '2. Nhân Lực Có Mặt (người)'];
    const rowActLines = isAssembly ? [idx + 1, stageClean, '2b. Thực Tế Có Số Line (Line)'] : null;
    const rowDiff = [idx + 1, stageClean, '3. Chênh Lệch Thừa/Thiếu (người)'];
    const rowSuppNeed = !isCompact ? [idx + 1, stageClean, '4. Số Người Cần Bổ Sung (người)'] : null;
    const rowSuppAct = !isCompact ? [idx + 1, stageClean, '5. Thực Tế Bổ Sung (người)'] : null;
    const rowOt = !isCompact ? [idx + 1, stageClean, '6. Số Giờ OT Cần Bù (giờ)'] : null;

    sum.daily.forEach(d => {
      const isSel = selectedDateSet.has(d.date);
      if (isSplit) {
        const planDay = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
        const planNight = d.peopleNight || Math.round(((d.people || 0) - planDay) * 10) / 10;

        const actDay = isAutoSum ? (d.peopleDay || planDay) : getDomAttendance(d.date, 'Day');
        const actNight = isAutoSum ? (d.peopleNight || planNight) : getDomAttendance(d.date, 'Night');

        const balDay = Math.round((actDay - planDay) * 10) / 10;
        const balNight = Math.round((actNight - planNight) * 10) / 10;

        const shortDay = balDay < 0 ? Math.abs(balDay) : 0;
        const shortNight = balNight < 0 ? Math.abs(balNight) : 0;

        const rawSuppDay = getDomSupplement(d.date, 'Day');
        const suppDay = rawSuppDay !== null ? rawSuppDay : shortDay;
        const rawSuppNight = getDomSupplement(d.date, 'Night');
        const suppNight = rawSuppNight !== null ? rawSuppNight : shortNight;

        const otDay = Math.round(suppDay * 12.0 * 10) / 10;
        const otNight = Math.round(suppNight * 12.0 * 10) / 10;

        rowPlan.push(planDay, planNight);
        rowAct.push(actDay, actNight);
        rowDiff.push(balDay, balNight);
        if (rowSuppNeed) rowSuppNeed.push(shortDay, shortNight);
        if (rowSuppAct) rowSuppAct.push(suppDay, suppNight);
        if (rowOt) rowOt.push(otDay, otNight);

        if (isAssembly) {
          const pLineDay = Math.round((planDay / 14) * 10) / 10;
          const pLineNight = Math.round((planNight / 14) * 10) / 10;
          const aLineDay = Math.round((actDay / 14) * 10) / 10;
          const aLineNight = Math.round((actNight / 14) * 10) / 10;
          rowPlanLines.push(pLineDay, pLineNight);
          rowActLines.push(aLineDay, aLineNight);
          if (isSel) {
            cumPlanLines += (pLineDay + pLineNight);
            cumActLines += (aLineDay + aLineNight);
          }
        }

        if (isSel) {
          cumPlan += (planDay + planNight);
          cumAct += (actDay + actNight);
          cumShortage += (shortDay + shortNight);
          cumSupp += (suppDay + suppNight);
          cumOt += (otDay + otNight);
          selDays++;
        }
      } else {
        let planVal = 0;
        if (shiftFilter === 'DAY') {
          planVal = d.peopleDay || Math.round((d.people || 0) * 0.6 * 10) / 10;
        } else if (shiftFilter === 'NIGHT') {
          planVal = d.peopleNight || Math.round(((d.people || 0) - Math.round((d.people || 0) * 0.6 * 10) / 10) * 10) / 10;
        } else {
          planVal = d.people || (d.peopleDay + d.peopleNight) || 0;
        }

        const actVal = isAutoSum 
          ? (d.people || planVal)
          : getDomAttendance(d.date, shiftFilter);

        const bal = Math.round((actVal - planVal) * 10) / 10;
        const short = bal < 0 ? Math.abs(bal) : 0;
        const rawSupp = getDomSupplement(d.date, shiftFilter);
        const supp = rawSupp !== null ? rawSupp : short;
        const ot = Math.round(supp * 12.0 * 10) / 10;

        rowPlan.push(planVal);
        rowAct.push(actVal);
        rowDiff.push(bal);
        if (rowSuppNeed) rowSuppNeed.push(short);
        if (rowSuppAct) rowSuppAct.push(supp);
        if (rowOt) rowOt.push(ot);

        if (isAssembly) {
          const pLine = Math.round((planVal / 14) * 10) / 10;
          const aLine = Math.round((actVal / 14) * 10) / 10;
          rowPlanLines.push(pLine);
          rowActLines.push(aLine);
          if (isSel) {
            cumPlanLines += pLine;
            cumActLines += aLine;
          }
        }

        if (isSel) {
          cumPlan += planVal;
          cumAct += actVal;
          cumShortage += short;
          cumSupp += supp;
          cumOt += ot;
          selDays++;
        }
      }
    });

    const avgPlan = selDays > 0 ? Math.round((cumPlan / selDays) * 10) / 10 : 0;
    const avgAct = selDays > 0 ? Math.round((cumAct / selDays) * 10) / 10 : 0;
    const cumDiff = Math.round((cumAct - cumPlan) * 10) / 10;
    const avgDiff = Math.round((avgAct - avgPlan) * 10) / 10;
    const avgShort = selDays > 0 ? Math.round((cumShortage / selDays) * 10) / 10 : 0;
    const avgSupp = selDays > 0 ? Math.round((cumSupp / selDays) * 10) / 10 : 0;
    const avgOt = selDays > 0 ? Math.round((cumOt / selDays) * 10) / 10 : 0;

    const evalText = cumDiff >= 0 ? 'Đủ nhân sự (Cân đối tốt)' : `Thiếu nhân sự (${Math.abs(cumDiff)} ng)`;

    rowPlan.push(Math.round(cumPlan * 10) / 10, avgPlan, 'Kế hoạch định biên');
    if (rowPlanLines) {
      const avgPLine = selDays > 0 ? Math.round((cumPlanLines / selDays) * 10) / 10 : 0;
      rowPlanLines.push(Math.round(cumPlanLines * 10) / 10, avgPLine, 'Định biên: 14 ng/Line');
    }

    rowAct.push(Math.round(cumAct * 10) / 10, avgAct, isAutoSum ? 'Tự động tính tổng' : 'Điền thực tế theo ngày');
    if (rowActLines) {
      const avgALine = selDays > 0 ? Math.round((cumActLines / selDays) * 10) / 10 : 0;
      rowActLines.push(Math.round(cumActLines * 10) / 10, avgALine, 'Số Line thực tế đi làm');
    }

    rowDiff.push(cumDiff, avgDiff, evalText);
    if (rowSuppNeed) rowSuppNeed.push(Math.round(cumShortage * 10) / 10, avgShort, cumShortage === 0 ? 'Đạt chuẩn' : 'Cần bổ sung');
    if (rowSuppAct) rowSuppAct.push(Math.round(cumSupp * 10) / 10, avgSupp, 'Thực tế điều động bổ sung');
    if (rowOt) rowOt.push(Math.round(cumOt * 10) / 10, avgOt, cumOt === 0 ? '0h OT' : `${cumOt}h OT`);

    matrix.push(rowPlan);
    if (rowPlanLines) matrix.push(rowPlanLines);
    matrix.push(rowAct);
    if (rowActLines) matrix.push(rowActLines);
    matrix.push(rowDiff);
    if (rowSuppNeed) matrix.push(rowSuppNeed);
    if (rowSuppAct) matrix.push(rowSuppAct);
    if (rowOt) matrix.push(rowOt);
  });

  return matrix;
}

window.handleCopyManpowerTable = function() {
  const matrix = buildManpowerMatrixClean();
  if (!matrix || matrix.length === 0) {
    window.showToast('warning', 'Dữ liệu bảng nhân lực đang trống!');
    return;
  }
  const tsv = matrixToTsv(matrix);
  copyToClipboardUtil(tsv, '📋 Đã sao chép "1. Tình Trạng Nhân Lực & Cân Đối Ca" vào clipboard! Bạn có thể dán (Ctrl+V) ngay vào Google Sheets.');
};

window.handleExportManpowerTable = function() {
  const matrix = buildManpowerMatrixClean();
  if (!matrix || matrix.length === 0) {
    window.showToast('warning', 'Dữ liệu bảng nhân lực đang trống!');
    return;
  }
  const csv = matrixToCsv(matrix);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  downloadCsvUtil(csv, `1_Tinh_Trang_Nhan_Luc_Can_Doi_Ca_${dateStr}.csv`);
  window.showToast('success', '📥 Đã xuất file CSV "1. Tình Trạng Nhân Lực & Cân Đối Ca" chuẩn Google Sheets!');
};

// -------------------------------------------------------------
// 2. KẾ HOẠCH SẢN XUẤT TỔNG THEO CÔNG ĐOẠN (TAB 2)
// -------------------------------------------------------------
function buildProductionSummaryMatrixClean() {
  const schedule = window.__LATEST_SCHEDULE__;
  const stages = window.__LATEST_PROD_STAGES__;
  if (!schedule || !stages || stages.length === 0) {
    return [];
  }

  const shiftFilter = window.AppStore ? (window.AppStore.currentShiftFilter || 'ALL') : 'ALL';
  const isSplit = shiftFilter === 'SPLIT';
  const dates = schedule.dates || [];

  // Header
  const header = ['STT', 'Công Đoạn', 'Hạng Mục'];
  dates.forEach(d => {
    const stdDate = formatStandardDate(d);
    const dayName = getDayOfWeekName ? getDayOfWeekName(d) : '';
    const dateTitle = dayName ? `${stdDate} (${dayName})` : stdDate;
    if (isSplit) {
      header.push(`${dateTitle} [Ca Ngày]`, `${dateTitle} [Ca Đêm]`);
    } else {
      header.push(dateTitle);
    }
  });
  header.push('Tổng Lũy Kế', 'Bình Quân / Ngày');

  const matrix = [header];

  stages.forEach((sum, idx) => {
    const stageClean = stripEmojis(sum.stage || '');

    const rowPlan = [idx + 1, stageClean, 'Kế Hoạch (Plan) (pcs)'];
    const rowFact = [idx + 1, stageClean, 'Thực Tế (Fact) (pcs)'];
    const rowGap = [idx + 1, stageClean, 'Chênh Lệch (Gap) (pcs)'];
    const rowNorm = [idx + 1, stageClean, 'Giờ Chuẩn (Norm-h) (giờ)'];
    const rowRate = [idx + 1, stageClean, '% Hoàn Thành (%)'];

    sum.daily.forEach(d => {
      if (isSplit) {
        rowPlan.push(d.planDay || 0, d.planNight || 0);
        rowFact.push(d.factDay || 0, d.factNight || 0);
        const gapDay = (d.factDay || 0) - (d.planDay || 0);
        const gapNight = (d.factNight || 0) - (d.planNight || 0);
        rowGap.push(gapDay, gapNight);
        rowNorm.push(d.normHoursDay || 0, d.normHoursNight || 0);
        const rateDay = d.planDay > 0 ? Math.round(((d.factDay || 0) / d.planDay) * 1000) / 10 : 0;
        const rateNight = d.planNight > 0 ? Math.round(((d.factNight || 0) / d.planNight) * 1000) / 10 : 0;
        rowRate.push(rateDay, rateNight);
      } else {
        rowPlan.push(d.plan || 0);
        rowFact.push(d.fact || 0);
        rowGap.push(d.gap || 0);
        rowNorm.push(d.normHours || 0);
        rowRate.push(d.rate || 0);
      }
    });

    rowPlan.push(sum.cumPlan || 0, sum.avgPlan || 0);
    rowFact.push(sum.cumFact || 0, sum.avgFact || 0);
    rowGap.push(sum.cumGap || 0, sum.avgGap || 0);
    rowNorm.push(sum.cumNormHours || 0, sum.avgNormHours || 0);
    const rateText = sum.rate >= 100 ? 'Hoàn thành' : (sum.rate >= 80 ? 'Tiến độ tốt' : 'Cần đẩy mạnh');
    rowRate.push(sum.rate || 0, rateText);

    matrix.push(rowPlan);
    matrix.push(rowFact);
    matrix.push(rowGap);
    matrix.push(rowNorm);
    matrix.push(rowRate);
  });

  return matrix;
}

window.handleCopyProductionSummaryTable = function() {
  const matrix = buildProductionSummaryMatrixClean();
  if (!matrix || matrix.length === 0) {
    window.showToast('warning', 'Dữ liệu bảng sản xuất tổng đang trống!');
    return;
  }
  const tsv = matrixToTsv(matrix);
  copyToClipboardUtil(tsv, '📋 Đã sao chép "2. Kế Hoạch Sản Xuất Tổng Theo Công Đoạn" vào clipboard! Bạn có thể dán (Ctrl+V) ngay vào Google Sheets.');
};

window.handleExportProductionSummaryTable = function() {
  const matrix = buildProductionSummaryMatrixClean();
  if (!matrix || matrix.length === 0) {
    window.showToast('warning', 'Dữ liệu bảng sản xuất tổng đang trống!');
    return;
  }
  const csv = matrixToCsv(matrix);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  downloadCsvUtil(csv, `2_Ke_Hoach_San_Xuat_Tong_Theo_Cong_Doan_${dateStr}.csv`);
  window.showToast('success', '📥 Đã xuất file CSV "2. Kế Hoạch Sản Xuất Tổng" chuẩn Google Sheets!');
};

// -------------------------------------------------------------
// 3. BẢNG 2: TIẾN ĐỘ SẢN LƯỢNG THEO MODEL & CÔNG ĐOẠN (TAB 3)
// -------------------------------------------------------------
function formatShortageReasonsClean(it) {
  if (it.cumGapQty >= 0) {
    if (it.cumPlanQty > 0 && it.cumFactQty >= it.cumPlanQty) return 'Đạt kế hoạch';
    if (it.cumPlanQty === 0 && it.cumFactQty > 0) return 'Sản xuất ngoài kế hoạch';
    return '—';
  }

  const sr = it.shortageReasons;
  if (!sr) return 'Không có lý do ghi nhận';

  if (sr.items && Array.isArray(sr.items) && sr.items.length > 0) {
    const list = sr.items.filter(r => (r.reason && r.reason.trim()) || (r.shortageReason && r.shortageReason.trim()));
    if (list.length > 0) {
      return list.map(r => {
        let dateLabel = r.rawDate || r.date || '';
        if (dateLabel) {
          const std = formatStandardDate(dateLabel);
          const parts = std.split('/');
          dateLabel = parts.length === 3 ? `${parts[0]}/${parts[1]}` : std;
        }
        const shiftLabel = (r.shift === 'day' || r.shift === 'Day') ? 'Ngày' : ((r.shift === 'night' || r.shift === 'Night') ? 'Đêm' : (r.shift || ''));
        const lineStr = r.line ? `Line ${r.line}` : '';
        const gapVal = r.gap !== undefined ? r.gap : (r.gapQty || 0);
        const gapStr = gapVal !== 0 ? `(${gapVal > 0 ? '+' : ''}${gapVal})` : '';
        const reasonText = (r.reason || r.shortageReason || '').trim();

        const tag = [dateLabel, shiftLabel, lineStr].filter(Boolean).join(' ');
        return tag ? `${tag}: ${reasonText} ${gapStr}`.trim() : `${reasonText} ${gapStr}`.trim();
      }).join('; ');
    }
  }

  if (sr.uniqueReasons && Array.isArray(sr.uniqueReasons) && sr.uniqueReasons.length > 0) {
    const cleanList = sr.uniqueReasons.filter(Boolean).map(s => stripEmojis(s));
    if (cleanList.length > 0) return cleanList.join('; ');
  }

  return 'Không có lý do ghi nhận';
}

function formatEvaluationClean(it) {
  if (it.cumGapQty < 0) {
    const sr = it.shortageReasons;
    const count = (sr && sr.uniqueReasons) ? sr.uniqueReasons.length : 0;
    return `Thiếu ${Math.abs(it.cumGapQty)} (${count > 0 ? `Đã giải trình ${count} ca` : 'Cần giải trình'})`;
  } else if (it.cumPlanQty > 0 && it.cumFactQty >= it.cumPlanQty) {
    return `Đạt tiến độ (${it.cumFactQty}/${it.cumPlanQty})`;
  } else if (it.cumPlanQty === 0 && it.cumFactQty > 0) {
    return `Ngoài KH (+${it.cumFactQty})`;
  }
  return 'Chưa sản xuất';
}

function buildTable2MatrixFromData(items, scheduleDates = [], isSplit = false, viewMode = 'CUMULATIVE') {
  const matrix = [];
  if (!items || !Array.isArray(items) || items.length === 0) return matrix;

  if (!scheduleDates || scheduleDates.length === 0) {
    scheduleDates = (items[0] && items[0].daily) ? items[0].daily.map(d => d.date) : [];
  }

  const dateSpanText = (scheduleDates && scheduleDates.length > 0)
    ? (scheduleDates.length === 1 ? formatStandardDate(scheduleDates[0]) : `${formatStandardDate(scheduleDates[0])} - ${formatStandardDate(scheduleDates[scheduleDates.length - 1])}`)
    : '';

  if (viewMode === 'CUMULATIVE') {
    const planHeader = dateSpanText ? `Kế Hoạch (Plan) (${dateSpanText}) (pcs)` : 'Kế Hoạch (Plan) (pcs)';
    const factHeader = dateSpanText ? `Thực Tế (Fact) (${dateSpanText}) (pcs)` : 'Thực Tế (Fact) (pcs)';
    const gapHeader = dateSpanText ? `Chênh Lệch (Gap) (${dateSpanText}) (pcs)` : 'Chênh Lệch (Gap) (pcs)';

    matrix.push([
      'STT',
      'Công Đoạn',
      'Group Model',
      'Model (Mã 1C)',
      planHeader,
      factHeader,
      gapHeader,
      'Nguyên Nhân Âm (Sheet Mass-History)',
      'Đánh Giá Tiến Độ'
    ]);

    items.forEach((it, idx) => {
      matrix.push([
        idx + 1,
        stripEmojis(it.stage || ''),
        it.model || '',
        it.productName1C || '',
        it.cumPlanQty || 0,
        it.cumFactQty || 0,
        it.cumGapQty || 0,
        formatShortageReasonsClean(it),
        formatEvaluationClean(it)
      ]);
    });
  } else {
    // DAILY VIEW
    const headerRow = ['STT', 'Công Đoạn', 'Group Model', 'Model (Mã 1C)', 'Hạng Mục (pcs)'];

    scheduleDates.forEach(d => {
      const stdDate = formatStandardDate(d);
      const dayName = getDayOfWeekName ? getDayOfWeekName(d) : '';
      const dateTitle = dayName ? `${stdDate} (${dayName})` : stdDate;
      if (isSplit) {
        headerRow.push(`${dateTitle} [Ca Ngày]`, `${dateTitle} [Ca Đêm]`);
      } else {
        headerRow.push(dateTitle);
      }
    });

    headerRow.push('Tổng Lũy Kế (pcs)', 'Nguyên Nhân Âm (Sheet Mass-History)', 'Đánh Giá Tiến Độ');
    matrix.push(headerRow);

    items.forEach((it, idx) => {
      const stageClean = stripEmojis(it.stage || '');
      const shortageReason = formatShortageReasonsClean(it);
      const evalText = formatEvaluationClean(it);

      // Row 1: Plan
      const planRow = [idx + 1, stageClean, it.model || '', it.productName1C || '', 'Plan'];
      it.daily.forEach(d => {
        if (isSplit) {
          planRow.push(d.planDay || 0, d.planNight || 0);
        } else {
          planRow.push(d.plan || 0);
        }
      });
      planRow.push(it.cumPlanQty || 0, shortageReason, evalText);
      matrix.push(planRow);

      // Row 2: Fact
      const factRow = [idx + 1, stageClean, it.model || '', it.productName1C || '', 'Fact'];
      it.daily.forEach(d => {
        if (isSplit) {
          factRow.push(d.factDay || 0, d.factNight || 0);
        } else {
          factRow.push(d.fact || 0);
        }
      });
      factRow.push(it.cumFactQty || 0, '', '');
      matrix.push(factRow);

      // Row 3: Gap
      const gapRow = [idx + 1, stageClean, it.model || '', it.productName1C || '', 'Gap'];
      it.daily.forEach(d => {
        if (isSplit) {
          const gDay = (d.factDay || 0) - (d.planDay || 0);
          const gNight = (d.factNight || 0) - (d.planNight || 0);
          gapRow.push(gDay, gNight);
        } else {
          gapRow.push(d.gap || 0);
        }
      });
      gapRow.push(it.cumGapQty || 0, '', '');
      matrix.push(gapRow);
    });
  }

  return matrix;
}

window.handleCopyTable2Detailed = function() {
  const allItems = window.__LATEST_SCHEDULE_ITEMS__ || (window.AppStore && window.AppStore.latestScheduleItems) || [];
  if (!allItems || allItems.length === 0) {
    window.showToast('warning', 'Không tìm thấy dữ liệu Bảng 2 để sao chép!');
    return;
  }
  const shiftFilter = window.AppStore ? (window.AppStore.currentShiftFilter || 'ALL') : 'ALL';
  const isSplit = shiftFilter === 'SPLIT';
  const viewMode = window.AppStore ? (window.AppStore.table2ViewMode || 'CUMULATIVE') : 'CUMULATIVE';
  const dates = (allItems[0] && allItems[0].daily) ? allItems[0].daily.map(d => d.date) : [];
  const matrix = buildTable2MatrixFromData(allItems, dates, isSplit, viewMode);

  const tsv = matrixToTsv(matrix);
  copyToClipboardUtil(tsv, `📋 Đã sao chép "Bảng 2: Tiến Độ Sản Lượng" (${allItems.length} Model) vào clipboard! Bạn có thể dán (Ctrl+V) ngay vào Google Sheets.`);
};

window.handleExportTable2Detailed = function() {
  const allItems = window.__LATEST_SCHEDULE_ITEMS__ || (window.AppStore && window.AppStore.latestScheduleItems) || [];
  if (!allItems || allItems.length === 0) {
    window.showToast('warning', 'Không tìm thấy dữ liệu Bảng 2 để xuất file!');
    return;
  }
  const shiftFilter = window.AppStore ? (window.AppStore.currentShiftFilter || 'ALL') : 'ALL';
  const isSplit = shiftFilter === 'SPLIT';
  const viewMode = window.AppStore ? (window.AppStore.table2ViewMode || 'CUMULATIVE') : 'CUMULATIVE';
  const dates = (allItems[0] && allItems[0].daily) ? allItems[0].daily.map(d => d.date) : [];
  const matrix = buildTable2MatrixFromData(allItems, dates, isSplit, viewMode);

  const csv = matrixToCsv(matrix);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  downloadCsvUtil(csv, `Bang_2_Tien_Do_San_Luong_Model_Cong_Doan_${dateStr}.csv`);
  window.showToast('success', `📥 Đã xuất file CSV Bảng 2 (${allItems.length} Model) chuẩn Google Sheets!`);
};

window.handleToggleScheduleDay = function(dateStr, isChecked) {
  window.AppStore.toggleActiveDate(dateStr, isChecked);
  renderDataMassView();
};

window.handleSelectAllDays = function(selectAll) {
  if (selectAll) {
    window.AppStore.selectAllActiveDates();
    window.showToast('info', 'Đã chọn toàn bộ ngày trong kỳ để tính lũy kế!');
  } else {
    window.AppStore.deselectAllActiveDates();
    window.showToast('info', 'Đã bỏ chọn toàn bộ ngày!');
  }
  renderDataMassView();
};

window.handleSelectDayCount = function(count) {
  const dates = window.AppStore.getDatesInRange(window.AppStore.fromDate, window.AppStore.toDate);
  const take = dates.slice(0, Math.min(count, dates.length));
  window.AppStore.activeSelectedDates = [...take];
  renderDataMassView();
  window.showToast('info', `Đã chọn ${take.length} ngày đầu để tính lũy kế!`);
};

window.handleDataMassPageChange = function(newPageIndex) {
  window.AppStore.datamassPageIndex = parseInt(newPageIndex) || 0;
  renderDataMassView();
};

window.handleDataMassPageSizeChange = function(newSize) {
  window.AppStore.datamassPageSize = parseInt(newSize);
  window.AppStore.datamassPageIndex = 0;
  renderDataMassView();
};

window.handleDailyCellEdit = function(stageEnc, modelEnc, productName1CEnc, type, date, shift, value, el) {
  const stage = decodeURIComponent(stageEnc);
  const model = decodeURIComponent(modelEnc);
  const productName1C = decodeURIComponent(productName1CEnc);
  
  const updatedNum = window.AppStore.updateDailyItemValue(stage, model, productName1C, type, date, shift, value);
  if (el) {
    el.classList.add('cell-updated');
    setTimeout(() => el.classList.remove('cell-updated'), 600);
  }

  // Instant re-render of cumulative and Standard Hours
  renderDataMassView();
  window.showToast('success', `Đã lưu ${model} (${type.toUpperCase()}${shift !== 'ALL' ? ' - ' + shift : ''}) ngày ${date}: ${updatedNum.toLocaleString('vi-VN')}`);
};

window.handleDailyManpowerEdit = function(stageEnc, metricEnc, date, value, el) {
  const stage = decodeURIComponent(stageEnc);
  const metric = decodeURIComponent(metricEnc);

  const updatedNum = window.AppStore.updateDailyManpowerValue(stage, metric, date, value);
  if (el) {
    el.classList.add('cell-updated');
    setTimeout(() => el.classList.remove('cell-updated'), 600);
  }

  renderDataMassView();
  window.showToast('success', `Đã lưu nhân lực ${stage} (${metric}) ngày ${date}: ${updatedNum}`);
};

window.handleShiftFilterChange = function(shift) {
  window.AppStore.currentShiftFilter = shift;
  document.querySelectorAll('#shiftFilterGroup .btn-mode').forEach(btn => {
    if (btn.dataset.shift === shift) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderDataMassView();
  const map = {
    'ALL': '🌟 Cả 2 Ca (Day + Night)',
    'DAY': '☀️ Ca Ngày (Day)',
    'NIGHT': '🌙 Ca Đêm (Night)',
    'SPLIT': '🔄 Phân Tách 2 Ca (Day & Night)'
  };
  window.showToast('info', `Đã chuyển chế độ: ${map[shift] || shift}`);
};

window.updateDateInputsWeekdayTag = function() {
  const tag = document.getElementById('datamassWeekdayTag');
  if (tag) {
    tag.innerHTML = '';
  }
};

window.renderDataMassView = renderDataMassView;

window.handleResetDefaultData = function() {
  if (window.UserAuth && !window.UserAuth.isAdmin()) {
    if (window.showToast) window.showToast('warning', '⚠️ Chỉ Quản trị viên (Admin) mới có quyền Khôi phục Dữ liệu gốc!');
    return;
  }
  window.AppStore.resetToDefault();
  window.handlePresetDateSelect('THU_WED_OCT_W4');
  if (typeof renderDataMassView === 'function') {
    renderDataMassView();
  }
  if (window.showToast) {
    window.showToast('success', 'Đã khôi phục toàn bộ kế hoạch gốc từ 15/10 đến 28/10!');
  }
};

window.handleWeekFilterChange = function(val) {
  if (!val) return;
  const parts = val.split('|');
  if (parts.length !== 2) return;
  const [from, to] = parts;

  window.AppStore.fromDate = from;
  window.AppStore.toDate = to;
  window.AppStore.activeSelectedDates = null;
  window.AppStore.datamassPageIndex = 0;

  if (window.AppStore.dataMassViewMode === 'SFPD') {
    window.AppStore.dataMassViewMode = 'PLAN_FACT';
  }

  const elFrom = document.getElementById('datamassFromDate');
  const elTo = document.getElementById('datamassToDate');
  if (elFrom) elFrom.value = from;
  if (elTo) elTo.value = to;

  // Reset month select
  const monthSelect = document.getElementById('datamassMonthSelect');
  if (monthSelect) monthSelect.value = '';

  renderDataMassView();
  const weekSelect = document.getElementById('datamassWeekSelect');
  const selectedText = weekSelect ? weekSelect.options[weekSelect.selectedIndex]?.text : val;
  if (window.showToast) window.showToast('info', `Đã chọn: ${selectedText}`);
};

window.handleMonthFilterChange = function(val) {
  if (!val) return;
  const parts = val.split('|');
  if (parts.length !== 2) return;
  const [from, to] = parts;

  window.AppStore.fromDate = from;
  window.AppStore.toDate = to;
  window.AppStore.activeSelectedDates = null;
  window.AppStore.datamassPageIndex = 0;

  if (window.AppStore.dataMassViewMode === 'SFPD') {
    window.AppStore.dataMassViewMode = 'PLAN_FACT';
  }

  const elFrom = document.getElementById('datamassFromDate');
  const elTo = document.getElementById('datamassToDate');
  if (elFrom) elFrom.value = from;
  if (elTo) elTo.value = to;

  // Reset week select
  const weekSelect = document.getElementById('datamassWeekSelect');
  if (weekSelect) weekSelect.value = '';

  renderDataMassView();
  const monthSelect = document.getElementById('datamassMonthSelect');
  const selectedText = monthSelect ? monthSelect.options[monthSelect.selectedIndex]?.text : val;
  if (window.showToast) window.showToast('info', `Đã chọn: ${selectedText}`);
};

window.handleDateRangeInputsChange = function() {
  const elFrom = document.getElementById('datamassFromDate');
  const elTo = document.getElementById('datamassToDate');
  if (!elFrom || !elFrom.value) return;
  let from = elFrom.value;
  let to = elTo ? elTo.value : '';

  // Quy tắc chu kỳ tuần: Nếu người dùng thay đổi ngày bắt đầu và ngày bắt đầu là Thứ 5 (d.getDay() === 4),
  // tự động tính ngày kết thúc là hết Thứ 4 tuần tiếp theo (+6 ngày)
  if (from && window.AppStore.fromDate !== from) {
    const dFrom = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(from) : new Date(from);
    if (dFrom && !isNaN(dFrom.getTime()) && dFrom.getDay() === 4) {
      const endWed = new Date(dFrom.getFullYear(), dFrom.getMonth(), dFrom.getDate() + 6);
      const pad = n => String(n).padStart(2, '0');
      to = `${endWed.getFullYear()}-${pad(endWed.getMonth() + 1)}-${pad(endWed.getDate())}`;
      if (elTo) elTo.value = to;
    }
  }

  if (!to) return;
  window.AppStore.fromDate = from;
  window.AppStore.toDate = to;
  window.AppStore.activeSelectedDates = null;
  window.AppStore.datamassPageIndex = 0;

  // Return to standard Plan & Model view if previously in SFPD view
  if (window.AppStore.dataMassViewMode === 'SFPD') {
    window.AppStore.dataMassViewMode = 'PLAN_FACT';
  }

  // Sync Week and Month select values
  const dateKey = `${from}|${to}`;
  const weekSelect = document.getElementById('datamassWeekSelect');
  if (weekSelect) {
    let weekMatched = false;
    for (let i = 0; i < weekSelect.options.length; i++) {
      if (weekSelect.options[i].value === dateKey) {
        weekSelect.selectedIndex = i;
        weekMatched = true;
        break;
      }
    }
    if (!weekMatched) weekSelect.value = '';
  }

  const monthSelect = document.getElementById('datamassMonthSelect');
  if (monthSelect) {
    let monthMatched = false;
    for (let i = 0; i < monthSelect.options.length; i++) {
      if (monthSelect.options[i].value === dateKey) {
        monthSelect.selectedIndex = i;
        monthMatched = true;
        break;
      }
    }
    if (!monthMatched) monthSelect.value = '';
  }

  renderDataMassView();
};

window.handlePresetDateSelect = function(presetKey) {
  const presetMap = {
    'THU_WED_OCT_W4': { from: '2026-10-22', to: '2026-10-28' },
    'THU_WED_OCT_W3': { from: '2026-10-15', to: '2026-10-21' },
    'THU_WED_OCT_END': { from: '2026-10-29', to: '2026-11-04' },
    'THU_WED_OCT_W2': { from: '2026-10-08', to: '2026-10-14' },
    'THU_WED_OCT_W1': { from: '2026-10-01', to: '2026-10-07' },
    'OCT_FULL': { from: '2026-10-01', to: '2026-10-31' },
    'SEP_FULL': { from: '2026-09-03', to: '2026-09-30' },
    'ALL_DAY_NIGHT': { from: '2026-09-03', to: '2026-10-31' }
  };

  const item = presetMap[presetKey] || presetMap['THU_WED_OCT_W4'];
  if (!item) return;

  const elFrom = document.getElementById('datamassFromDate');
  const elTo = document.getElementById('datamassToDate');
  if (elFrom) elFrom.value = item.from;
  if (elTo) elTo.value = item.to;

  window.handleDateRangeInputsChange();
};

// ========================================================
// RENDER DEDICATED SFPD REPORT VIEW (CHUẨN THEO ẢNH MẪU)
// ========================================================
function renderSfpdReportView() {
  const container = document.getElementById('datamassSfpdContainer');
  if (!container) return;

  const fromDate = document.getElementById('datamassFromDate')?.value || window.AppStore.fromDate;
  const toDate = document.getElementById('datamassToDate')?.value || window.AppStore.toDate;

  const sfpd = window.AppStore.getSfpdReportData({ fromDate, toDate });
  const sfpdDates = sfpd.dates;

  // 1. Render Table A: MANPOWER BALANCE
  let tableAHtml = `
    <div class="sfpd-report-card">
      <div class="sfpd-header-banner">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.5rem;">📋</div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #fbbf24;">
              SFPD — BÁO CÁO CÂN ĐỐI NHÂN LỰC THEO CA (MANPOWER BALANCE REPORT)
            </h3>
            <span style="font-size: 0.775rem; color: var(--text-secondary);">
              Chuẩn báo cáo SFPD nhà máy: Plan HT Total (Hàng 16 Vàng) = Tổng 4 công đoạn Hardtest | Actual (Hàng 21/40) = Thực tế đi làm | Balance (Hàng 22/42 Cam) = Actual - Plan
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-amber" style="font-size: 0.75rem; font-weight: 700;">
            📅 ${sfpdDates.length} ngày (${sfpdDates[0]} → ${sfpdDates[sfpdDates.length - 1]})
          </span>
        </div>
      </div>

      <div class="table-container" style="overflow-x: auto;">
        <table class="sfpd-table">
          <thead>
            <tr>
              <th rowspan="2" class="sfpd-code-col">Code</th>
              <th rowspan="2" style="min-width: 80px; text-align: center;">SFPD</th>
              <th rowspan="2" style="min-width: 170px; text-align: left; padding-left: 0.8rem;">Process</th>
              <th rowspan="2" style="min-width: 80px; text-align: center;">Items</th>
              ${sfpdDates.map(d => `
                <th colspan="2" style="text-align: center; border-bottom: 1px solid #475569; font-size: 0.85rem;">
                  ${d}
                </th>
              `).join('')}
            </tr>
            <tr>
              ${sfpdDates.map(d => `
                <th class="sfpd-header-day" style="width: 75px;">☀️ Day</th>
                <th class="sfpd-header-night" style="width: 75px;">🌙 Night</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Row 12: SUM HARDTEST -->
            <tr>
              <td class="sfpd-code-col">12</td>
              <td style="text-align: center; color: var(--text-muted);">--</td>
              <td style="font-weight: 700; color: #f8fafc;">SUM HARDTEST</td>
              <td style="text-align: center; color: #94a3b8;">People</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">${mp.sumHt.day > 0 ? mp.sumHt.day.toFixed(1) : '0.0'}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #93c5fd;">${mp.sumHt.night > 0 ? mp.sumHt.night.toFixed(1) : '0.0'}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 13: OPTICS ASM -->
            <tr>
              <td class="sfpd-code-col">13</td>
              <td style="text-align: center; color: var(--text-muted);">--</td>
              <td style="font-weight: 700; color: #f8fafc;">OPTICS ASM</td>
              <td style="text-align: center; color: #94a3b8;">People</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">${mp.optics.day > 0 ? mp.optics.day.toFixed(1) : '0.0'}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #93c5fd;">${mp.optics.night > 0 ? mp.optics.night.toFixed(1) : '0.0'}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 14: A IMP ASM -->
            <tr>
              <td class="sfpd-code-col">14</td>
              <td style="text-align: center; color: var(--text-muted);">--</td>
              <td style="font-weight: 700; color: #f8fafc;">A IMP ASM</td>
              <td style="text-align: center; color: #94a3b8;">People</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">${mp.aimp.day > 0 ? mp.aimp.day.toFixed(1) : '0.0'}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 700; color: #93c5fd;">${mp.aimp.night > 0 ? mp.aimp.night.toFixed(1) : '0.0'}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 15: FOCUS (Tách riêng, không tính vào HT Total) -->
            <tr style="opacity: 0.65;">
              <td class="sfpd-code-col">15</td>
              <td style="text-align: center; color: var(--text-muted);">--</td>
              <td style="font-weight: 600; color: #cbd5e1;">FOCUS <span style="font-size: 0.72rem; color: #f59e0b; font-weight: normal;">(Tách riêng, không tính vào Total)</span></td>
              <td style="text-align: center; color: #94a3b8;">People</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 600; color: #94a3b8;">${mp.focus.day > 0 ? mp.focus.day.toFixed(1) : '0.0'}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 600; color: #94a3b8;">${mp.focus.night > 0 ? mp.focus.night.toFixed(1) : '0.0'}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 16: Plan HT Total (HÀNG VÀNG RỰC RỠ: SUM HT + OPTICS + A IMP) -->
            <tr class="sfpd-row-yellow">
              <td class="sfpd-code-col" style="color: #0f172a; font-weight: 800;">16</td>
              <td style="text-align: center; font-weight: 900; color: #0f172a;">Plan</td>
              <td style="font-weight: 900; color: #0f172a;">HT Total (SUM HT + OPTICS + A IMP)</td>
              <td style="text-align: center; color: #0f172a; font-weight: 700;">--</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #0f172a;">${mp.planHt.day.toFixed(1)}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #0f172a;">${mp.planHt.night.toFixed(1)}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 21: Actual Total Hard Test -->
            <tr style="background: rgba(255, 255, 255, 0.03);">
              <td class="sfpd-code-col">21</td>
              <td style="text-align: center; font-weight: 800; color: #34d399;">Actual</td>
              <td style="font-weight: 800; color: #f8fafc;">Total Hard Test</td>
              <td style="text-align: center; font-family: monospace; color: #94a3b8;">
                ${sfpdDates.reduce((acc, d) => acc + (sfpd.manpowerDaily[d].actHt.day || 0) + (sfpd.manpowerDaily[d].actHt.night || 0), 0) || 92}
              </td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td style="text-align: right; padding: 0.2rem 0.3rem;">
                    <input type="number" step="0.5" class="input-attendance" 
                           value="${mp.actHt.day || ''}" placeholder="23" title="Nhập thực tế đi làm Hardtest Ca Ngày: ${d}"
                           onchange="handleActualAttendanceEdit('${d}', 'Day', 'HARDTEST', this.value, this)" />
                  </td>
                  <td style="text-align: right; padding: 0.2rem 0.3rem;">
                    <input type="number" step="0.5" class="input-attendance" 
                           value="${mp.actHt.night || ''}" placeholder="23" title="Nhập thực tế đi làm Hardtest Ca Đêm: ${d}"
                           onchange="handleActualAttendanceEdit('${d}', 'Night', 'HARDTEST', this.value, this)" />
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- Row 22: Balance HT (HÀNG CAM ĐẶC TRƯNG) -->
            <tr class="sfpd-row-orange">
              <td class="sfpd-code-col" style="color: #7c2d12; font-weight: 800;">22</td>
              <td style="text-align: center; font-weight: 700; color: #7c2d12;">Balance</td>
              <td style="font-weight: 900; color: #7c2d12;">Balance HT</td>
              <td style="text-align: center; color: #7c2d12;">--</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #7c2d12;">
                    ${(mp.balHt.day > 0 ? '+' : '') + mp.balHt.day.toFixed(1)}
                  </td>
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #7c2d12;">
                    ${(mp.balHt.night > 0 ? '+' : '') + mp.balHt.night.toFixed(1)}
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- Spacer Row -->
            <tr style="height: 10px; background: rgba(0,0,0,0.2);">
              <td colspan="${4 + sfpdDates.length * 2}" style="padding: 2px;"></td>
            </tr>

            <!-- Row 40: Actual Total ASSY -->
            <tr style="background: rgba(255, 255, 255, 0.03);">
              <td class="sfpd-code-col">40</td>
              <td style="text-align: center; font-weight: 800; color: #34d399;">Actual</td>
              <td style="font-weight: 800; color: #f8fafc;">Total ASSY</td>
              <td style="text-align: center; font-family: monospace; color: #94a3b8;">
                ${sfpdDates.reduce((acc, d) => acc + (sfpd.manpowerDaily[d].actAssy.day || 0) + (sfpd.manpowerDaily[d].actAssy.night || 0), 0) || 236}
              </td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td style="text-align: right; padding: 0.2rem 0.3rem;">
                    <input type="number" step="0.5" class="input-attendance" 
                           value="${mp.actAssy.day || ''}" placeholder="42" title="Nhập thực tế đi làm Assembly Ca Ngày: ${d}"
                           onchange="handleActualAttendanceEdit('${d}', 'Day', 'ASSEMBLY', this.value, this)" />
                  </td>
                  <td style="text-align: right; padding: 0.2rem 0.3rem;">
                    <input type="number" step="0.5" class="input-attendance" 
                           value="${mp.actAssy.night || ''}" placeholder="28" title="Nhập thực tế đi làm Assembly Ca Đêm: ${d}"
                           onchange="handleActualAttendanceEdit('${d}', 'Night', 'ASSEMBLY', this.value, this)" />
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- Row 41: Plan ASSEMBLY People -->
            <tr>
              <td class="sfpd-code-col">41</td>
              <td style="text-align: center; font-weight: 800; color: #60a5fa;">Plan</td>
              <td style="font-weight: 800; color: #f8fafc;">ASSEMBLY</td>
              <td style="text-align: center; color: #fbbf24; font-weight: 700;">People</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 800; color: #fbbf24; font-size: 0.9rem;">${mp.planAssy.day.toFixed(1)}</td>
                  <td class="font-mono" style="text-align: right; font-weight: 800; color: #f59e0b; font-size: 0.9rem;">${mp.planAssy.night.toFixed(1)}</td>
                `;
              }).join('')}
            </tr>

            <!-- Row 42: Balance ASSY (HÀNG CAM) -->
            <tr class="sfpd-row-orange">
              <td class="sfpd-code-col" style="color: #7c2d12; font-weight: 800;">42</td>
              <td style="text-align: center; font-weight: 700; color: #7c2d12;">Balance</td>
              <td style="font-weight: 900; color: #7c2d12;">Balance ASSY</td>
              <td style="text-align: center; color: #7c2d12;">--</td>
              ${sfpdDates.map(d => {
                const mp = sfpd.manpowerDaily[d];
                return `
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #7c2d12;">
                    ${(mp.balAssy.day > 0 ? '+' : '') + mp.balAssy.day.toFixed(1)}
                  </td>
                  <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.95rem; color: #7c2d12;">
                    ${(mp.balAssy.night > 0 ? '+' : '') + mp.balAssy.night.toFixed(1)}
                  </td>
                `;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 2. Render Table B: PRODUCTION OUTPUT (SẢN LƯỢNG SẢN XUẤT THEO CÔNG ĐOẠN)
  let tableBHtml = `
    <div class="sfpd-report-card" style="border: 1px solid rgba(59, 130, 246, 0.4);">
      <div class="sfpd-header-banner" style="background: linear-gradient(90deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12)); border-color: rgba(59, 130, 246, 0.3);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.5rem;">🏭</div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #60a5fa;">
              SFPD — BÁO CÁO SẢN LƯỢNG SẢN XUẤT THEO CA (PROCESS OUTPUT: PLAN / FACT / GAP)
            </h3>
            <span style="font-size: 0.775rem; color: var(--text-secondary);">
              Chi tiết sản lượng theo từng công đoạn: HARD TEST, OPTICS ASM, FOCUS, ASSEMBLY chia Ca Day &amp; Night. (Các ô hụt kế hoạch được tô cảnh báo đỏ nhạt theo chuẩn nhà máy)
            </span>
          </div>
        </div>
      </div>

      <div class="table-container" style="overflow-x: auto;">
        <table class="sfpd-table">
          <thead>
            <tr>
              <th rowspan="2" class="sfpd-sticky-col-stage" style="min-width: 170px; text-align: left; padding-left: 0.8rem;">Công Đoạn (Process)</th>
              <th rowspan="2" class="sfpd-sticky-col-metric" style="min-width: 90px; text-align: center;">Chỉ Tiêu</th>
              ${sfpdDates.map(d => `
                <th colspan="2" style="text-align: center; border-bottom: 1px solid #475569; font-size: 0.85rem;">
                  ${d}
                </th>
              `).join('')}
            </tr>
            <tr>
              ${sfpdDates.map(d => {
                const rot = window.getShiftRotation(d);
                return `
                  <th class="sfpd-header-day" style="width: 85px;" title="Ca Ngày: Kíp ${rot.day} trực (Nghỉ: Kíp ${rot.off.join(', ')})">
                    ☀️ Day <span class="badge-shift-pill shift-${rot.day.toLowerCase()}">${rot.day}</span>
                  </th>
                  <th class="sfpd-header-night" style="width: 85px;" title="Ca Đêm: Kíp ${rot.night} trực (Nghỉ: Kíp ${rot.off.join(', ')})">
                    🌙 Night <span class="badge-shift-pill shift-${rot.night.toLowerCase()}">${rot.night}</span>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
  `;

  const stages = ['HARD TEST', 'OPTICS ASM', 'FOCUS', 'ASSEMBLY'];
  stages.forEach((st, sIdx) => {
    const stData = sfpd.outputDaily[st];
    tableBHtml += `
      <!-- Stage: ${st} -->
      <!-- Plan Row -->
      <tr style="border-top: ${sIdx > 0 ? '2px solid #64748b' : 'none'};">
        <td rowspan="3" class="sfpd-sticky-col-stage" style="font-weight: 800; color: #f8fafc; vertical-align: middle; padding-left: 0.8rem; background: #0f172a;">
          ${st === 'HARD TEST' ? '🔬 HARD TEST' : st === 'OPTICS ASM' ? '🔭 OPTICS ASM' : st === 'FOCUS' ? '🎯 FOCUS' : '🔧 ASSEMBLY'}
        </td>
        <td class="sfpd-sticky-col-metric" style="text-align: center; font-weight: 700; color: #60a5fa;">plan</td>
        ${sfpdDates.map(d => {
          const rec = stData[d] || { planDay: 0, planNight: 0 };
          return `
            <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">${rec.planDay > 0 ? rec.planDay.toLocaleString('vi-VN') : '--'}</td>
            <td class="font-mono" style="text-align: right; font-weight: 700; color: #93c5fd;">${rec.planNight > 0 ? rec.planNight.toLocaleString('vi-VN') : '--'}</td>
          `;
        }).join('')}
      </tr>

      <!-- Fact Row -->
      <tr>
        <td class="sfpd-sticky-col-metric" style="text-align: center; font-weight: 700; color: #34d399;">fact</td>
        ${sfpdDates.map(d => {
          const rec = stData[d] || { factDay: 0, factNight: 0 };
          return `
            <td class="font-mono" style="text-align: right; font-weight: 700; color: #34d399;">${rec.factDay > 0 ? rec.factDay.toLocaleString('vi-VN') : '--'}</td>
            <td class="font-mono" style="text-align: right; font-weight: 700; color: #6ee7b7;">${rec.factNight > 0 ? rec.factNight.toLocaleString('vi-VN') : '--'}</td>
          `;
        }).join('')}
      </tr>

      <!-- Gap Row (highlighted negative in pink/red) -->
      <tr style="border-bottom: 2px solid #475569;">
        <td class="sfpd-sticky-col-metric" style="text-align: center; font-weight: 800; color: #f87171;">Gap</td>
        ${sfpdDates.map(d => {
          const rec = stData[d] || { gapDay: 0, gapNight: 0 };
          const clsDay = rec.gapDay < 0 ? 'sfpd-cell-gap-neg' : rec.gapDay > 0 ? 'sfpd-cell-gap-pos' : '';
          const clsNight = rec.gapNight < 0 ? 'sfpd-cell-gap-neg' : rec.gapNight > 0 ? 'sfpd-cell-gap-pos' : '';
          return `
            <td class="font-mono ${clsDay}" style="text-align: right;">
              ${rec.gapDay !== 0 ? (rec.gapDay > 0 ? '+' : '') + rec.gapDay.toLocaleString('vi-VN') : '0'}
            </td>
            <td class="font-mono ${clsNight}" style="text-align: right;">
              ${rec.gapNight !== 0 ? (rec.gapNight > 0 ? '+' : '') + rec.gapNight.toLocaleString('vi-VN') : '0'}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  });

  tableBHtml += `
          </tbody>
        </table>
      </div>
    </div>
  `;

    const tableCHtml = renderSfpdModelBreakdownSection();
  container.innerHTML = tableAHtml + tableBHtml + tableCHtml;
}


// Global state variables for SFPD Model Breakdown
window.sfpdModelStage = window.sfpdModelStage || 'ALL'; // 'ALL' | 'HARD TEST' | 'ASSEMBLY'
window.sfpdModelSearch = window.sfpdModelSearch || '';
window.sfpdModelStatus = window.sfpdModelStatus || 'ALL'; // 'ALL' | 'OVER' | 'MET' | 'UNDER' | 'ZERO'
window.sfpdModelSort = window.sfpdModelSort || 'GAP'; // 'GAP' | 'PLAN' | 'FACT' | 'RATE' | 'MODEL' | 'TIME_PLAN' | 'TIME_FACT'
window.sfpdModelSortDir = window.sfpdModelSortDir || 'ASC'; // 'ASC' | 'DESC'

window.handleSfpdModelStage = function(stage) {
  window.sfpdModelStage = stage;
  updateSfpdModelSection();
};

window.handleSfpdModelSearch = function(val) {
  window.sfpdModelSearch = val;
  updateSfpdModelSection();
};

window.handleSfpdModelStatus = function(val) {
  window.sfpdModelStatus = val;
  updateSfpdModelSection();
};

window.handleSfpdModelSort = function(val) {
  if (window.sfpdModelSort === val) {
    window.sfpdModelSortDir = window.sfpdModelSortDir === 'ASC' ? 'DESC' : 'ASC';
  } else {
    window.sfpdModelSort = val;
    window.sfpdModelSortDir = (val === 'MODEL') ? 'ASC' : 'DESC';
  }
  updateSfpdModelSection();
};

window.toggleSfpdModelSortDir = function() {
  window.sfpdModelSortDir = window.sfpdModelSortDir === 'ASC' ? 'DESC' : 'ASC';
  updateSfpdModelSection();
};

window.handleSfpdModelReset = function() {
  window.sfpdModelStage = 'ALL';
  window.sfpdModelSearch = '';
  window.sfpdModelStatus = 'ALL';
  window.sfpdModelSort = 'GAP';
  window.sfpdModelSortDir = 'ASC';
  updateSfpdModelSection();
};

function updateSfpdModelSection() {
  const wrapper = document.getElementById('sfpdModelBreakdownWrapper');
  if (wrapper) {
    wrapper.outerHTML = renderSfpdModelBreakdownSection();
    const searchInput = document.getElementById('sfpdModelSearchInput');
    if (searchInput && window.sfpdModelSearch) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  }
}

function renderSfpdModelBreakdownSection() {
  const stage = window.sfpdModelStage || 'ALL';
  const res = window.AppStore.getOfficialModels1022({
    stage: stage,
    filterStatus: window.sfpdModelStatus || 'ALL',
    searchQuery: window.sfpdModelSearch || '',
    sortBy: window.sfpdModelSort || 'GAP',
    sortDir: window.sfpdModelSortDir || 'ASC'
  });

  const items = res.items;
  const kpis = res.kpis;

  const tableRows = items.map((m, idx) => {
    const isHardtest = m.process === 'HARD TEST';
    const procBadge = isHardtest 
      ? '<span class="badge-proc-ht">🔬 HARD TEST</span>' 
      : '<span class="badge-proc-assy">🔧 ASSEMBLY</span>';

    const gapVal = m.gapQty;
    const gapCls = gapVal < 0 ? 'sfpd-cell-gap-neg' : gapVal > 0 ? 'sfpd-cell-gap-pos' : '';
    const gapFormatted = (gapVal > 0 ? '+' : '') + gapVal.toLocaleString('vi-VN');

    // Progress bar for completion rate
    const rate = m.completionRate;
    const fillWidth = Math.min(100, Math.max(0, rate));
    const fillGrad = rate >= 100 
      ? 'linear-gradient(90deg, #10b981, #059669)' 
      : rate >= 70 
        ? 'linear-gradient(90deg, #3b82f6, #2563eb)' 
        : rate > 0 
          ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
          : 'rgba(148, 163, 184, 0.3)';

    // Status badge
    let statusBadge = '';
    if (m.status === 'ZERO') {
      statusBadge = '<span class="badge-status-zero">⏳ Chưa chạy</span>';
    } else if (m.status === 'OVER') {
      statusBadge = '<span class="badge-status-over">🚀 Vượt KH</span>';
    } else if (m.status === 'MET') {
      statusBadge = '<span class="badge-status-met">🎯 Đạt 100%</span>';
    } else {
      statusBadge = '<span class="badge-status-under">⚠️ Hụt KH</span>';
    }

    const gapTime = Math.round((m.factTime - m.planTime) * 100) / 100;
    const gapTimeFormatted = (gapTime > 0 ? '+' : '') + gapTime.toFixed(2);
    const gapTimeColor = gapTime > 0 ? '#34d399' : gapTime < 0 ? '#fb7185' : '#94a3b8';

    return `
      <tr>
        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem; font-family: 'JetBrains Mono', monospace;">${idx + 1}</td>
        <td style="text-align: center;">${procBadge}</td>
        <td style="font-weight: 700; color: #f8fafc; font-size: 0.85rem; max-width: 320px; word-break: break-word;">
          ${m.model}
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa;">
          ${m.planQty > 0 ? m.planQty.toLocaleString('vi-VN') : '--'}
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399;">
          ${m.factQty > 0 ? m.factQty.toLocaleString('vi-VN') : '<span style="color: #64748b;">0</span>'}
        </td>
        <td class="font-mono ${gapCls}" style="text-align: right; font-weight: 800;">
          ${gapFormatted}
        </td>
        <td>
          <div class="sfpd-prog-wrapper">
            <div class="sfpd-prog-track">
              <div class="sfpd-prog-fill" style="width: ${fillWidth}%; background: ${fillGrad};"></div>
            </div>
            <span class="font-mono" style="font-size: 0.775rem; font-weight: 800; min-width: 48px; text-align: right; color: ${rate >= 100 ? '#34d399' : rate >= 70 ? '#60a5fa' : rate > 0 ? '#fbbf24' : '#64748b'};">
              ${rate}%
            </span>
          </div>
        </td>
        <td class="font-mono" style="text-align: right; color: #94a3b8;">
          ${m.planTime.toFixed(2)}h
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 700; color: #cbd5e1;">
          ${m.factTime.toFixed(2)}h
        </td>
        <td class="font-mono" style="text-align: right; font-weight: 700; color: ${gapTimeColor}; font-size: 0.8rem;">
          ${gapTimeFormatted}h
        </td>
        <td class="font-mono" style="text-align: center; color: #c084fc; font-size: 0.775rem;">
          ${m.norm > 0 ? m.norm.toFixed(1) + 's' : '--'}
        </td>
        <td style="text-align: center;">
          ${statusBadge}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div id="sfpdModelBreakdownWrapper" class="sfpd-report-card" style="border: 1px solid rgba(139, 92, 246, 0.45); margin-top: 1.5rem;">
      <!-- Banner -->
      <div class="sfpd-header-banner" style="background: linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15)); border-color: rgba(139, 92, 246, 0.35);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.5rem;">🔍</div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #c084fc;">
              SFPD — BÁO CÁO CHI TIẾT SẢN LƯỢNG &amp; GIỜ CHUẨN THEO TỪNG MODEL (10/22/2026)
            </h3>
            <span style="font-size: 0.775rem; color: var(--text-secondary);">
              Bảng dữ liệu chi tiết 32 Model công đoạn HARD TEST &amp; 53 Model công đoạn ASSEMBLY. Khớp 100% với báo cáo sản lượng ca SFPD: Hard Test 18,376 pcs | Assembly 16,922 pcs.
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge badge-purple" style="font-size: 0.775rem; font-weight: 700;">
            📦 85 Model Đã Đối Soát Chuẩn
          </span>
        </div>
      </div>

      <div style="padding: 1.25rem 1.25rem 0.5rem;">
        <!-- Stage Filter Pills -->
        <div class="sfpd-model-tabs">
          <button class="sfpd-model-tab ${stage === 'ALL' ? 'active-all' : ''}" onclick="window.handleSfpdModelStage('ALL')">
            🌟 TẤT CẢ MODEL (${items.length === 85 ? '85' : items.length + '/85'})
          </button>
          <button class="sfpd-model-tab ${stage === 'HARD TEST' ? 'active-ht' : ''}" onclick="window.handleSfpdModelStage('HARD TEST')">
            🔬 HARD TEST (32 Model) — Plan: 21,249 | Fact: 18,376 (86.5%)
          </button>
          <button class="sfpd-model-tab ${stage === 'ASSEMBLY' ? 'active-assy' : ''}" onclick="window.handleSfpdModelStage('ASSEMBLY')">
            🔧 ASSEMBLY (53 Model) — Plan: 13,218 | Fact: 16,922 (128.0%)
          </button>
        </div>

        <!-- KPI Mini Grid -->
        <div class="sfpd-kpi-grid">
          <div class="sfpd-kpi-card">
            <span class="sfpd-kpi-label">Tổng Kế Hoạch (Plan)</span>
            <span class="sfpd-kpi-val" style="color: #60a5fa;">${kpis.totalPlanQty.toLocaleString('vi-VN')}</span>
            <span class="sfpd-kpi-sub">Sản lượng mục tiêu (${kpis.totalModels} model)</span>
          </div>

          <div class="sfpd-kpi-card emerald">
            <span class="sfpd-kpi-label">Tổng Thực Tế (Fact)</span>
            <span class="sfpd-kpi-val" style="color: #34d399;">${kpis.totalFactQty.toLocaleString('vi-VN')}</span>
            <span class="sfpd-kpi-sub">Hoàn thành đạt <strong>${kpis.avgRate}%</strong></span>
          </div>

          <div class="sfpd-kpi-card ${kpis.totalGapQty >= 0 ? 'emerald' : 'rose'}">
            <span class="sfpd-kpi-label">Chênh Lệch (Gap Qty)</span>
            <span class="sfpd-kpi-val" style="color: ${kpis.totalGapQty >= 0 ? '#34d399' : '#fb7185'};">
              ${(kpis.totalGapQty > 0 ? '+' : '') + kpis.totalGapQty.toLocaleString('vi-VN')}
            </span>
            <span class="sfpd-kpi-sub">${kpis.totalGapQty >= 0 ? 'Thặng dư sản xuất vượt KH' : 'Hụt kế hoạch sản lượng'}</span>
          </div>

          <div class="sfpd-kpi-card amber">
            <span class="sfpd-kpi-label">Giờ Chuẩn (Plan vs Fact)</span>
            <span class="sfpd-kpi-val" style="color: #fbbf24; font-size: 1.25rem;">
              ${kpis.totalPlanTime.toFixed(1)}h → ${kpis.totalFactTime.toFixed(1)}h
            </span>
            <span class="sfpd-kpi-sub">Chênh lệch giờ: ${(kpis.totalFactTime - kpis.totalPlanTime > 0 ? '+' : '') + (kpis.totalFactTime - kpis.totalPlanTime).toFixed(1)}h</span>
          </div>

          <div class="sfpd-kpi-card purple">
            <span class="sfpd-kpi-label">Phân Bổ Tiến Độ</span>
            <span class="sfpd-kpi-val" style="font-size: 1.15rem; color: #c084fc;">
              ${kpis.overCount + kpis.metCount} / ${kpis.totalModels}
            </span>
            <span class="sfpd-kpi-sub">🚀 ${kpis.overCount} Vượt | 🎯 ${kpis.metCount} Đạt | ⚠️ ${kpis.underCount} Hụt | ⏳ ${kpis.zeroCount} Chưa chạy</span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="sfpd-filter-bar">
          <div class="sfpd-search-box">
            <span class="sfpd-search-icon">🔍</span>
            <input type="text" 
                   id="sfpdModelSearchInput" 
                   value="${window.sfpdModelSearch || ''}" 
                   placeholder="Tìm kiếm theo tên model, mã sản phẩm..."
                   oninput="window.handleSfpdModelSearch(this.value)" />
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.775rem; color: var(--text-muted); font-weight: 600;">Trạng thái:</label>
            <select class="sfpd-select" onchange="window.handleSfpdModelStatus(this.value)">
              <option value="ALL" ${window.sfpdModelStatus === 'ALL' ? 'selected' : ''}>Tất cả trạng thái (${kpis.totalModels})</option>
              <option value="OVER" ${window.sfpdModelStatus === 'OVER' ? 'selected' : ''}>🚀 Vượt kế hoạch (${kpis.overCount})</option>
              <option value="MET" ${window.sfpdModelStatus === 'MET' ? 'selected' : ''}>🎯 Đạt 100% (${kpis.metCount})</option>
              <option value="UNDER" ${window.sfpdModelStatus === 'UNDER' ? 'selected' : ''}>⚠️ Chưa đạt kế hoạch (${kpis.underCount})</option>
              <option value="ZERO" ${window.sfpdModelStatus === 'ZERO' ? 'selected' : ''}>⏳ Chưa chạy (0 Fact) (${kpis.zeroCount})</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.775rem; color: var(--text-muted); font-weight: 600;">Sắp xếp:</label>
            <select class="sfpd-select" onchange="window.handleSfpdModelSort(this.value)">
              <option value="GAP" ${window.sfpdModelSort === 'GAP' ? 'selected' : ''}>Chênh lệch Gap Qty</option>
              <option value="PLAN" ${window.sfpdModelSort === 'PLAN' ? 'selected' : ''}>Kế hoạch (Plan Qty)</option>
              <option value="FACT" ${window.sfpdModelSort === 'FACT' ? 'selected' : ''}>Thực tế (Fact Qty)</option>
              <option value="RATE" ${window.sfpdModelSort === 'RATE' ? 'selected' : ''}>Tỷ lệ hoàn thành (%)</option>
              <option value="TIME_PLAN" ${window.sfpdModelSort === 'TIME_PLAN' ? 'selected' : ''}>Giờ chuẩn Plan (h)</option>
              <option value="TIME_FACT" ${window.sfpdModelSort === 'TIME_FACT' ? 'selected' : ''}>Giờ chuẩn Fact (h)</option>
              <option value="MODEL" ${window.sfpdModelSort === 'MODEL' ? 'selected' : ''}>Tên Model (A-Z)</option>
            </select>
            <button class="btn btn-secondary" style="padding: 0.45rem 0.75rem; font-size: 0.775rem;" onclick="window.toggleSfpdModelSortDir()">
              ${window.sfpdModelSortDir === 'ASC' ? '⬆️ Tăng dần' : '⬇️ Giảm dần'}
            </button>
          </div>

          ${(window.sfpdModelSearch || window.sfpdModelStatus !== 'ALL' || window.sfpdModelSort !== 'GAP' || stage !== 'ALL') ? `
            <button class="btn btn-secondary" style="padding: 0.45rem 0.75rem; font-size: 0.775rem; margin-left: auto;" onclick="window.handleSfpdModelReset()">
              🔄 Đặt lại bộ lọc
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Data Table -->
      <div class="table-container" style="overflow-x: auto; max-height: 650px;">
        <table class="sfpd-table">
          <thead style="position: sticky; top: 0; z-index: 10; background: #0f172a;">
            <tr>
              <th style="width: 45px; text-align: center;">STT</th>
              <th style="width: 120px; text-align: center;">Công Đoạn</th>
              <th style="min-width: 250px; text-align: left; padding-left: 0.8rem;">Tên Model / Sản Phẩm (1C)</th>
              <th style="width: 100px; text-align: right;">Plan Qty</th>
              <th style="width: 100px; text-align: right;">Fact Qty</th>
              <th style="width: 110px; text-align: right;">Chênh Lệch</th>
              <th style="width: 140px; text-align: center;">Tiến Độ / Đạt</th>
              <th style="width: 95px; text-align: right;">Plan Time</th>
              <th style="width: 95px; text-align: right;">Fact Time</th>
              <th style="width: 95px; text-align: right;">Gap Time</th>
              <th style="width: 90px; text-align: center;">Norm (s)</th>
              <th style="width: 110px; text-align: center;">Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? tableRows : `
              <tr>
                <td colspan="12" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                  <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🔍</div>
                  <div style="font-weight: 700; color: var(--text-primary);">Không tìm thấy Model phù hợp với bộ lọc hiện tại</div>
                  <div style="font-size: 0.8rem;">Hãy thử đổi từ khóa tìm kiếm hoặc bấm "Đặt lại bộ lọc"</div>
                </td>
              </tr>
            `}
          </tbody>
          ${items.length > 0 ? `
            <tfoot style="position: sticky; bottom: 0; z-index: 9; background: #0f172a; border-top: 2px solid #334155; font-weight: 800;">
              <tr style="background: rgba(15, 23, 42, 0.95);">
                <td colspan="3" style="text-align: right; padding-right: 1rem; color: #f8fafc;">
                  TỔNG CỘNG (${items.length} Model):
                </td>
                <td class="font-mono" style="text-align: right; color: #60a5fa;">
                  ${kpis.totalPlanQty.toLocaleString('vi-VN')}
                </td>
                <td class="font-mono" style="text-align: right; color: #34d399;">
                  ${kpis.totalFactQty.toLocaleString('vi-VN')}
                </td>
                <td class="font-mono ${kpis.totalGapQty < 0 ? 'sfpd-cell-gap-neg' : kpis.totalGapQty > 0 ? 'sfpd-cell-gap-pos' : ''}" style="text-align: right;">
                  ${(kpis.totalGapQty > 0 ? '+' : '') + kpis.totalGapQty.toLocaleString('vi-VN')}
                </td>
                <td class="font-mono" style="text-align: center; color: ${kpis.avgRate >= 100 ? '#34d399' : '#60a5fa'}; font-weight: 900;">
                  ${kpis.avgRate}%
                </td>
                <td class="font-mono" style="text-align: right; color: #94a3b8;">
                  ${kpis.totalPlanTime.toFixed(1)}h
                </td>
                <td class="font-mono" style="text-align: right; color: #cbd5e1;">
                  ${kpis.totalFactTime.toFixed(1)}h
                </td>
                <td class="font-mono" style="text-align: right; color: ${kpis.totalFactTime - kpis.totalPlanTime > 0 ? '#34d399' : '#fb7185'};">
                  ${(kpis.totalFactTime - kpis.totalPlanTime > 0 ? '+' : '') + (kpis.totalFactTime - kpis.totalPlanTime).toFixed(1)}h
                </td>
                <td style="text-align: center; color: #94a3b8;">--</td>
                <td style="text-align: center; font-size: 0.775rem; color: #fbbf24;">
                  ${kpis.overCount + kpis.metCount} Đạt / ${kpis.totalModels}
                </td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

/* ====================================================================
   KÍP LINE CONFIGURATION TOOL (MODAL & LOGIC)
   Cho phép người dùng tự input/sửa/xóa Line và định mức theo từng KÍP A, B, C, D và Hành Chính
   ==================================================================== */
window.activeKipConfigTab = 'A';
window.tempKipConfig = null;

window.getStandardManpowerDefaults = function() {
  return {
    'A': {
      shift: 'A', name: 'Shift A',
      assyDirect: 43.0, assyTotal: 58.0,
      assyLinesDirect: { '1A': 15.0, '2A': 14.0, '3A': 14.0 },
      assyLinesTotal: { '1A': 20.0, '2A': 19.0, '3A': 19.0 },
      htDirect: 21.0, htTotal: 23.0,
      htBreakdown: { cleanroom: 3.0, operator: 18.0, feeder: 1.0, leader: 1.0 }
    },
    'B': {
      shift: 'B', name: 'Shift B',
      assyDirect: 29.0, assyTotal: 39.0,
      assyLinesDirect: { '1B': 14.0, '2B': 15.0 },
      assyLinesTotal: { '1B': 19.0, '2B': 20.0 },
      htDirect: 23.0, htTotal: 25.0,
      htBreakdown: { cleanroom: 4.0, operator: 19.0, feeder: 1.0, leader: 1.0 }
    },
    'C': {
      shift: 'C', name: 'Shift C',
      assyDirect: 41.0, assyTotal: 56.0,
      assyLinesDirect: { '1C': 14.0, '2C': 14.0, '3C': 13.0 },
      assyLinesTotal: { '1C': 19.0, '2C': 19.0, '3C': 18.0 },
      htDirect: 23.0, htTotal: 25.0,
      htBreakdown: { cleanroom: 2.0, operator: 21.0, feeder: 1.0, leader: 1.0 }
    },
    'D': {
      shift: 'D', name: 'Shift D',
      assyDirect: 27.0, assyTotal: 37.0,
      assyLinesDirect: { '1D': 14.0, '2D': 13.0 },
      assyLinesTotal: { '1D': 19.0, '2D': 18.0 },
      htDirect: 23.0, htTotal: 25.0,
      htBreakdown: { cleanroom: 4.0, operator: 19.0, feeder: 1.0, leader: 1.0 }
    },
    'HC': {
      shift: 'HC', name: 'Hành Chính',
      lines: ['3D'],
      assyDirect: 11.0, assyTotal: 16.0,
      assyLinesDirect: { '3D': 11.0 },
      assyLinesTotal: { '3D': 16.0 },
      htDirect: 0.0, htTotal: 0.0,
      htBreakdown: { cleanroom: 0.0, operator: 0.0, feeder: 0.0, leader: 0.0 },
      workShift: 'Day',
      workingDays: 'Mon-Fri'
    }
  };
};

window.openKipLineConfigModal = function() {
  const modal = document.getElementById('kipLineConfigModal');
  if (!modal) return;

  // Khởi tạo bản sao cấu hình đang chạy
  const defaults = window.getStandardManpowerDefaults();
  const current = window.MANPOWER_MASTER_DATA || {};
  window.tempKipConfig = JSON.parse(JSON.stringify(Object.assign({}, defaults, current)));

  // Đảm bảo cấu trúc đầy đủ
  ['A', 'B', 'C', 'D', 'HC'].forEach(code => {
    if (!window.tempKipConfig[code]) {
      window.tempKipConfig[code] = JSON.parse(JSON.stringify(defaults[code]));
    }
  });

  modal.style.display = 'flex';
  window.switchKipConfigTab(window.activeKipConfigTab || 'A');
};

window.closeKipLineConfigModal = function() {
  const modal = document.getElementById('kipLineConfigModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.switchKipConfigTab = function(kipCode) {
  window.activeKipConfigTab = kipCode;
  const tabs = document.querySelectorAll('.kip-config-tabs-bar .btn-kip-tab');
  tabs.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-kip') === kipCode);
  });
  window.renderKipConfigTab(kipCode);
};

window.renderKipConfigTab = function(kipCode) {
  const container = document.getElementById('kipConfigModalBody');
  if (!container || !window.tempKipConfig) return;

  const k = window.tempKipConfig[kipCode];
  if (!k) return;

  if (kipCode === 'HC') {
    // ==========================================
    // TAB HÀNH CHÍNH
    // ==========================================
    const directMap = k.assyLinesDirect || { '3D': 11.0 };
    const totalMap = k.assyLinesTotal || { '3D': 16.0 };
    const lineEntries = Object.keys(directMap);

    container.innerHTML = `
      <div class="kip-config-card" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.04);">
        <div class="kip-config-card-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.3rem;">🏢</span>
            <div>
              <div style="font-weight: 700; color: #34d399; font-size: 1rem;">Nhóm Hành Chính (Line 3D)</div>
              <div style="font-size: 0.775rem; color: #94a3b8; margin-top: 0.15rem;">
                Tự động bổ sung nhân lực vào Ca Ngày công đoạn ASSEMBLY từ Thứ 2 đến Thứ 6 (Nghỉ Thứ 7 &amp; Chủ Nhật)
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
            <span class="kip-stat-pill" style="color: #34d399; border-color: rgba(16, 185, 129, 0.4);">
              ☀️ Ca Ngày (Day Shift)
            </span>
            <span class="kip-stat-pill" style="color: #60a5fa; border-color: rgba(96, 165, 250, 0.4);">
              📅 Thứ 2 đến Thứ 6 (Mon-Fri)
            </span>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 1rem;">
          Theo quy định sản xuất, nhân sự Hành Chính chỉ làm việc vào <strong>Ca Ngày từ Thứ 2 đến Thứ 6</strong>. Vào các ngày cuối tuần (Thứ 7 &amp; Chủ Nhật) hoặc các Ca Đêm, hệ thống sẽ tự động không tính nhân lực hành chính.
        </div>

        <!-- Bảng danh sách Line Hành Chính -->
        <div style="margin-top: 0.75rem;">
          <table class="data-table" style="font-size: 0.825rem;">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">STT</th>
                <th style="text-align: left;">Mã Line Hành Chính</th>
                <th style="text-align: center;">Thời Gian Làm Việc</th>
                <th style="text-align: right; width: 140px;">Nhân Lực Trực Tiếp (ng)</th>
                <th style="text-align: right; width: 140px;">Tổng Nhân Lực (ng)</th>
                <th style="text-align: right; width: 100px;">Gián Tiếp</th>
                <th style="text-align: center; width: 80px;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${lineEntries.map((lineId, idx) => {
                const dVal = directMap[lineId] || 0;
                const tVal = totalMap[lineId] || 0;
                const indirect = Math.max(0, tVal - dVal);
                return `
                  <tr>
                    <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
                    <td style="font-weight: 700; color: #fff;">
                      <span class="badge-shift-pill" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); margin-right: 0.4rem;">Line ${lineId}</span>
                      ${lineId === '3D' ? 'Assembly 3D (Hành Chính)' : 'Line Hành Chính Mở Rộng'}
                    </td>
                    <td style="text-align: center; color: #cbd5e1; font-size: 0.75rem;">
                      ☀️ Ca Ngày • Thứ 2 - Thứ 6
                    </td>
                    <td style="text-align: right;">
                      <input type="number" class="kip-table-input" min="0" max="100" step="1" value="${dVal}" onchange="window.updateKipLineVal('HC', '${lineId}', 'direct', this.value)">
                    </td>
                    <td style="text-align: right;">
                      <input type="number" class="kip-table-input" min="0" max="100" step="1" value="${tVal}" onchange="window.updateKipLineVal('HC', '${lineId}', 'total', this.value)">
                    </td>
                    <td style="text-align: right; color: #94a3b8; font-family: monospace;">
                      ${indirect} ng
                    </td>
                    <td style="text-align: center;">
                      ${lineEntries.length > 1 ? `
                        <button type="button" class="btn-del-line" onclick="window.removeLineFromKip('HC', '${lineId}')" title="Xóa Line này">✕</button>
                      ` : `
                        <span style="color: #64748b; font-size: 0.75rem;">Mặc định</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: rgba(15, 23, 42, 0.6); font-weight: 700;">
                <td colspan="3" style="text-align: right; color: #34d399;">TỔNG HÀNH CHÍNH (CA NGÀY T2-T6):</td>
                <td style="text-align: right; color: #34d399; font-family: monospace; font-size: 0.95rem;">${k.assyDirect} ng</td>
                <td style="text-align: right; color: #cbd5e1; font-family: monospace; font-size: 0.95rem;">${k.assyTotal} ng</td>
                <td style="text-align: right; color: #94a3b8; font-family: monospace;">${Math.max(0, k.assyTotal - k.assyDirect)} ng</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Thêm Line Hành chính mở rộng nếu cần -->
        <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          <span style="font-size: 0.8rem; font-weight: 600; color: #cbd5e1;">➕ Thêm Line Hành Chính Mới:</span>
          <input type="text" id="newKipLineId" placeholder="VD: 3E..." style="width: 100px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
          <input type="number" id="newKipLineDirect" placeholder="Trực tiếp" value="11" min="0" style="width: 90px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
          <input type="number" id="newKipLineTotal" placeholder="Tổng gross" value="16" min="0" style="width: 90px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
          <button type="button" class="btn btn-sm btn-primary" onclick="window.addNewLineToKip('HC')" style="font-size: 0.775rem; padding: 0.35rem 0.85rem;">
            ➕ Thêm Vào Hành Chính
          </button>
        </div>
      </div>
    `;
    return;
  }

  // ==========================================
  // TAB KÍP A, B, C, D
  // ==========================================
  const shiftColors = { 'A': '#60a5fa', 'B': '#34d399', 'C': '#f59e0b', 'D': '#c084fc' };
  const shiftPills = { 'A': 'shift-a', 'B': 'shift-b', 'C': 'shift-c', 'D': 'shift-d' };
  const shiftColor = shiftColors[kipCode] || '#6366f1';
  const shiftPill = shiftPills[kipCode] || 'shift-a';

  const directMap = k.assyLinesDirect || {};
  const totalMap = k.assyLinesTotal || {};
  const lineEntries = Object.keys(directMap);
  const ht = k.htBreakdown || { cleanroom: 3, operator: 18, feeder: 1, leader: 1 };

  container.innerHTML = `
    <!-- Thống kê Kíp -->
    <div class="kip-config-card" style="border-left: 4px solid ${shiftColor};">
      <div class="kip-config-card-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="badge-shift-pill ${shiftPill}" style="font-size: 0.9rem; padding: 0.3rem 0.75rem;">KÍP ${kipCode}</span>
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 1rem;">Cấu Hình Line Assembly &amp; Hard Test — Kíp ${kipCode}</div>
            <div style="font-size: 0.775rem; color: #94a3b8; margin-top: 0.15rem;">
              Chỉnh sửa số người từng Line, thêm Line mới hoặc xóa bớt Line theo thực tế sản xuất
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <span class="kip-stat-pill">
            Số Line: <strong style="color:#fff;">${lineEntries.length}</strong>
          </span>
          <span class="kip-stat-pill" style="color: #34d399;">
            Assy Trực Tiếp: <strong style="color:#34d399;">${k.assyDirect}</strong> ng
          </span>
          <span class="kip-stat-pill" style="color: #cbd5e1;">
            Assy Gross: <strong style="color:#cbd5e1;">${k.assyTotal}</strong> ng
          </span>
          <span class="kip-stat-pill" style="color: #60a5fa;">
            Tổng Hard Test: <strong style="color:#60a5fa;">${k.htDirect}</strong> ng
          </span>
        </div>
      </div>

      <!-- BẢNG DANH SÁCH LINE ASSEMBLY TRONG KÍP -->
      <div style="margin-top: 0.5rem;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>📦 DANH SÁCH LINE ASSEMBLY TRỰC THUỘC KÍP ${kipCode}:</span>
          <small style="color: #94a3b8; font-weight: 400;">(Nhập trực tiếp số người vào ô, số liệu tự động tính lại tổng)</small>
        </div>

        <table class="data-table" style="font-size: 0.825rem;">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">STT</th>
              <th style="text-align: left;">Mã Line</th>
              <th style="text-align: left;">Tên Line / Trưởng Line</th>
              <th style="text-align: right; width: 140px;">Nhân Lực Trực Tiếp (ng)</th>
              <th style="text-align: right; width: 140px;">Tổng Nhân Lực (ng)</th>
              <th style="text-align: right; width: 100px;">Gián Tiếp</th>
              <th style="text-align: center; width: 80px;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${lineEntries.map((lineId, idx) => {
              const dVal = directMap[lineId] || 0;
              const tVal = totalMap[lineId] || 0;
              const indirect = Math.max(0, tVal - dVal);
              return `
                <tr>
                  <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
                  <td style="font-weight: 700; color: #fff;">
                    <span class="badge-shift-pill ${shiftPill}" style="margin-right: 0.4rem;">Line ${lineId}</span>
                  </td>
                  <td style="color: #cbd5e1;">
                    Assembly Line ${lineId} (Kíp ${kipCode})
                  </td>
                  <td style="text-align: right;">
                    <input type="number" class="kip-table-input" min="0" max="100" step="1" value="${dVal}" onchange="window.updateKipLineVal('${kipCode}', '${lineId}', 'direct', this.value)">
                  </td>
                  <td style="text-align: right;">
                    <input type="number" class="kip-table-input" min="0" max="100" step="1" value="${tVal}" onchange="window.updateKipLineVal('${kipCode}', '${lineId}', 'total', this.value)">
                  </td>
                  <td style="text-align: right; color: #94a3b8; font-family: monospace;">
                    ${indirect} ng
                  </td>
                  <td style="text-align: center;">
                    <button type="button" class="btn-del-line" onclick="window.removeLineFromKip('${kipCode}', '${lineId}')" title="Xóa Line ${lineId} khỏi Kíp ${kipCode}">✕</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: rgba(15, 23, 42, 0.6); font-weight: 700;">
              <td colspan="3" style="text-align: right; color: #34d399;">TỔNG ASSEMBLY KÍP ${kipCode}:</td>
              <td style="text-align: right; color: #34d399; font-family: monospace; font-size: 0.95rem;">${k.assyDirect} ng</td>
              <td style="text-align: right; color: #cbd5e1; font-family: monospace; font-size: 0.95rem;">${k.assyTotal} ng</td>
              <td style="text-align: right; color: #94a3b8; font-family: monospace;">${Math.max(0, k.assyTotal - k.assyDirect)} ng</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- FORM THÊM LINE MỚI VÀO KÍP -->
      <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(30, 41, 59, 0.5); border-radius: 8px; display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; font-weight: 600; color: #cbd5e1;">➕ Thêm Line Mới Vào Kíp ${kipCode}:</span>
        <input type="text" id="newKipLineId" placeholder="VD: 3C, 4A, Supp..." style="width: 120px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
        <input type="number" id="newKipLineDirect" placeholder="Trực tiếp" value="14" min="0" style="width: 90px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
        <input type="number" id="newKipLineTotal" placeholder="Tổng gross" value="19" min="0" style="width: 90px; padding: 0.35rem 0.6rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; font-size: 0.8rem;">
        <button type="button" class="btn btn-sm btn-primary" onclick="window.addNewLineToKip('${kipCode}')" style="font-size: 0.775rem; padding: 0.35rem 0.85rem;">
          ➕ Thêm Line Vào Kíp
        </button>
      </div>
    </div>

    <!-- KHỐI ĐỊNH MỨC HARD TEST CHO KÍP NÀY -->
    <div class="kip-config-card" style="border-left: 4px solid #8b5cf6;">
      <div class="kip-config-card-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.25rem;">🔬</span>
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">Định Mức Nhân Lực Hard Test — Kíp ${kipCode}</div>
            <div style="font-size: 0.775rem; color: #94a3b8; margin-top: 0.15rem;">
              Bóc tách theo Cleanroom, Operator, Feeder và Leader của Kíp
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.45rem;">
          <span class="kip-stat-pill" style="color: #a78bfa;">
            Trực Tiếp: <strong>${k.htDirect}</strong> ng
          </span>
          <span class="kip-stat-pill" style="color: #cbd5e1;">
            Tổng Gross: <strong>${k.htTotal}</strong> ng
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; margin-top: 0.5rem;">
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.35rem;">Cleanroom Operator:</div>
          <input type="number" class="kip-table-input" style="width: 100%;" min="0" max="50" step="1" value="${ht.cleanroom || 0}" onchange="window.updateKipHtVal('${kipCode}', 'cleanroom', this.value)">
        </div>
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.35rem;">Hard Test Operator:</div>
          <input type="number" class="kip-table-input" style="width: 100%;" min="0" max="50" step="1" value="${ht.operator || 0}" onchange="window.updateKipHtVal('${kipCode}', 'operator', this.value)">
        </div>
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.35rem;">Hard Test Feeder:</div>
          <input type="number" class="kip-table-input" style="width: 100%;" min="0" max="50" step="1" value="${ht.feeder || 0}" onchange="window.updateKipHtVal('${kipCode}', 'feeder', this.value)">
        </div>
        <div style="background: rgba(15, 23, 42, 0.6); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.35rem;">Hard Test Leader:</div>
          <input type="number" class="kip-table-input" style="width: 100%;" min="0" max="50" step="1" value="${ht.leader || 0}" onchange="window.updateKipHtVal('${kipCode}', 'leader', this.value)">
        </div>
      </div>
    </div>
  `;
};

window.updateKipLineVal = function(kipCode, lineId, field, val) {
  if (!window.tempKipConfig || !window.tempKipConfig[kipCode]) return;
  const num = Math.max(0, parseFloat(val) || 0);
  const k = window.tempKipConfig[kipCode];

  if (field === 'direct') {
    if (!k.assyLinesDirect) k.assyLinesDirect = {};
    k.assyLinesDirect[lineId] = num;
  } else if (field === 'total') {
    if (!k.assyLinesTotal) k.assyLinesTotal = {};
    k.assyLinesTotal[lineId] = num;
  }

  // Tự động tính lại tổng direct và total của Kíp
  k.assyDirect = Math.round(Object.values(k.assyLinesDirect || {}).reduce((a, b) => a + b, 0) * 10) / 10;
  k.assyTotal = Math.round(Object.values(k.assyLinesTotal || {}).reduce((a, b) => a + b, 0) * 10) / 10;

  window.renderKipConfigTab(kipCode);
};

window.removeLineFromKip = function(kipCode, lineId) {
  if (!window.tempKipConfig || !window.tempKipConfig[kipCode]) return;
  if (!confirm(`Xác nhận xóa Line ${lineId} khỏi cấu hình của Kíp ${kipCode}?`)) return;

  const k = window.tempKipConfig[kipCode];
  if (k.assyLinesDirect) delete k.assyLinesDirect[lineId];
  if (k.assyLinesTotal) delete k.assyLinesTotal[lineId];
  if (Array.isArray(k.lines)) {
    k.lines = k.lines.filter(l => l !== lineId);
  }

  k.assyDirect = Math.round(Object.values(k.assyLinesDirect || {}).reduce((a, b) => a + b, 0) * 10) / 10;
  k.assyTotal = Math.round(Object.values(k.assyLinesTotal || {}).reduce((a, b) => a + b, 0) * 10) / 10;

  window.renderKipConfigTab(kipCode);
  window.showToast('info', `🗑️ Đã xóa Line ${lineId} khỏi Kíp ${kipCode}`);
};

window.addNewLineToKip = function(kipCode) {
  if (!window.tempKipConfig || !window.tempKipConfig[kipCode]) return;
  const inputId = document.getElementById('newKipLineId');
  const inputDirect = document.getElementById('newKipLineDirect');
  const inputTotal = document.getElementById('newKipLineTotal');
  if (!inputId) return;

  const lineId = String(inputId.value || '').trim();
  if (!lineId) {
    alert('Vui lòng nhập mã Line (Ví dụ: 3C, 4A, Support...)');
    inputId.focus();
    return;
  }

  const dVal = Math.max(0, parseFloat(inputDirect?.value) || 0);
  const tVal = Math.max(0, parseFloat(inputTotal?.value) || 0);

  const k = window.tempKipConfig[kipCode];
  if (!k.assyLinesDirect) k.assyLinesDirect = {};
  if (!k.assyLinesTotal) k.assyLinesTotal = {};

  k.assyLinesDirect[lineId] = dVal;
  k.assyLinesTotal[lineId] = tVal;
  if (Array.isArray(k.lines) && !k.lines.includes(lineId)) {
    k.lines.push(lineId);
  }

  k.assyDirect = Math.round(Object.values(k.assyLinesDirect || {}).reduce((a, b) => a + b, 0) * 10) / 10;
  k.assyTotal = Math.round(Object.values(k.assyLinesTotal || {}).reduce((a, b) => a + b, 0) * 10) / 10;

  window.renderKipConfigTab(kipCode);
  window.showToast('success', `➕ Đã thêm Line ${lineId} (${dVal} ng trực tiếp) vào Kíp ${kipCode}`);
};

window.updateKipHtVal = function(kipCode, field, val) {
  if (!window.tempKipConfig || !window.tempKipConfig[kipCode]) return;
  const k = window.tempKipConfig[kipCode];
  if (!k.htBreakdown) k.htBreakdown = { cleanroom: 0, operator: 0, feeder: 0, leader: 0 };

  const num = Math.max(0, parseFloat(val) || 0);
  k.htBreakdown[field] = num;

  k.htDirect = (k.htBreakdown.cleanroom || 0) + (k.htBreakdown.operator || 0);
  k.htTotal = k.htDirect + (k.htBreakdown.feeder || 0) + (k.htBreakdown.leader || 0);

  window.renderKipConfigTab(kipCode);
};

window.saveKipLineConfig = function() {
  if (!window.tempKipConfig) return;

  try {
    localStorage.setItem('ajax_kip_line_config', JSON.stringify(window.tempKipConfig));
  } catch (e) {
    console.warn('Lỗi lưu ajax_kip_line_config vào localStorage:', e);
  }

  window.MANPOWER_MASTER_DATA = JSON.parse(JSON.stringify(window.tempKipConfig));

  // Đồng bộ danh sách Line vào bộ lọc select #asLineFilter nếu có Line mới
  const selectFilter = document.getElementById('asLineFilter');
  if (selectFilter) {
    const existingValues = new Set(Array.from(selectFilter.options).map(o => o.value));
    ['A', 'B', 'C', 'D', 'HC'].forEach(code => {
      const k = window.MANPOWER_MASTER_DATA[code];
      if (k && k.assyLinesDirect) {
        Object.keys(k.assyLinesDirect).forEach(lineId => {
          if (!existingValues.has(lineId)) {
            const opt = document.createElement('option');
            opt.value = lineId;
            opt.textContent = `Line ${lineId} (${k.name || code})`;
            selectFilter.appendChild(opt);
            existingValues.add(lineId);
          }
        });
      }
    });
  }

  // Tự động render lại toàn bộ các view dữ liệu ngay lập tức
  if (typeof renderDataMassView === 'function') {
    renderDataMassView();
  }
  if (typeof renderAsTable === 'function') {
    renderAsTable();
  }

  window.closeKipLineConfigModal();
  window.showToast('success', '💾 Đã lưu và áp dụng cấu hình Line theo Kíp thành công! Toàn bộ bảng tính và biểu đồ đã được cập nhật.');
};

window.resetKipConfigToDefault = function() {
  if (!confirm('Khôi phục toàn bộ cấu hình Line của Kíp A, B, C, D và Hành Chính về mặc định theo đúng Sheet Manpower?')) return;

  try {
    localStorage.removeItem('ajax_kip_line_config');
  } catch (e) {}

  window.tempKipConfig = window.getStandardManpowerDefaults();
  window.MANPOWER_MASTER_DATA = JSON.parse(JSON.stringify(window.tempKipConfig));

  if (typeof renderDataMassView === 'function') {
    renderDataMassView();
  }
  if (typeof renderAsTable === 'function') {
    renderAsTable();
  }

  window.renderKipConfigTab(window.activeKipConfigTab || 'A');
  window.showToast('success', '🔄 Đã khôi phục cấu hình Kíp Line về mặc định gốc của Sheet Manpower!');
};

/* ====================================================================
   USER MANAGEMENT & ROLE-BASED ACCESS CONTROL CONTROLLER (SETTINGS TAB)
   ==================================================================== */

window.handleToggleAddUserForm = function(forceShow) {
  const formWrap = document.getElementById('addUserFormWrap');
  if (!formWrap) return;
  const isCurrentlyOpen = formWrap.style.display !== 'none';
  const shouldOpen = (forceShow !== undefined) ? forceShow : !isCurrentlyOpen;

  formWrap.style.display = shouldOpen ? 'block' : 'none';
  if (shouldOpen) {
    const input = document.getElementById('newUsername');
    if (input) setTimeout(() => input.focus(), 100);
  } else {
    const form = document.getElementById('formAddNewUser');
    if (form) form.reset();
  }
};

window.handleFetchUsersList = async function() {
  const tbody = document.getElementById('userManagementTableBody');
  if (!tbody) return;

  try {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
          ⏳ Đang tải danh sách người dùng từ máy chủ...
        </td>
      </tr>
    `;

    const res = await fetch('/api/users?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const users = Array.isArray(data.users) ? data.users : [];
    window._serverUsersList = users;

    // Synchronize passwords into local user roles
    users.forEach(u => {
      if (u.role && u.password) {
        const roleKey = u.role.toUpperCase();
        if (window.USER_ROLES[roleKey] && Array.isArray(window.USER_ROLES[roleKey].passwords)) {
          if (!window.USER_ROLES[roleKey].passwords.includes(u.password)) {
            window.USER_ROLES[roleKey].passwords.push(u.password);
          }
        }
      }
    });

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            Chưa có người dùng nào. Hãy bấm "➕ Thêm Người Dùng" để tạo tài khoản mới.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    users.forEach((u, idx) => {
      const isSystemAdmin = u.username === 'admin';
      const role = (u.role || 'viewer').toLowerCase();

      let badgeClass = 'badge-role-viewer';
      let roleLabel = '👁️ Chỉ xem';
      if (role === 'admin') {
        badgeClass = 'badge-role-admin';
        roleLabel = '👑 Admin';
      } else if (role === 'editor') {
        badgeClass = 'badge-role-editor';
        roleLabel = '✍️ Nhập data';
      }

      const maskedPass = u.password ? '••••••••' : '(Trống)';
      const rawPass = (u.password || '').replace(/"/g, '&quot;');

      html += `
        <tr data-username="${u.username}">
          <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span class="font-mono" style="font-weight: 800; color: var(--text-primary); font-size: 0.85rem;">${u.username}</span>
              ${isSystemAdmin ? '<span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 1px 5px; border-radius: 4px; font-weight: 800;">ROOT</span>' : ''}
            </div>
          </td>
          <td>
            <div style="font-weight: 700; color: #38bdf8; font-size: 0.85rem;">${u.fullName || u.username}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span class="${badgeClass}">${roleLabel}</span>
              ${!isSystemAdmin ? `
                <select class="form-control" onchange="handleUpdateUserRole('${u.username}', this.value)" style="font-size: 0.7rem; padding: 0.2rem 0.4rem; width: auto; background: var(--bg-card); color: var(--text-primary); cursor: pointer; border-radius: 4px;">
                  <option value="editor" ${role === 'editor' ? 'selected' : ''}>✍️ Nhập data</option>
                  <option value="admin" ${role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                  <option value="viewer" ${role === 'viewer' ? 'selected' : ''}>👁️ Chỉ xem</option>
                </select>
              ` : ''}
            </div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span id="passText_${idx}" class="font-mono" style="font-size: 0.8rem; color: var(--text-muted);">${maskedPass}</span>
              <button type="button" class="btn btn-secondary" onclick="toggleUserPasswordDisplay(${idx}, '${rawPass}')" style="padding: 2px 6px; font-size: 0.65rem;" title="Bật/Tắt xem mật khẩu">
                <span id="passEye_${idx}">👁️</span>
              </button>
            </div>
          </td>
          <td style="color: var(--text-secondary); font-size: 0.8rem;">
            ${u.description || '<span style="color: var(--text-muted); font-style: italic;">Không có</span>'}
          </td>
          <td style="text-align: center;">
            ${!isSystemAdmin ? `
              <button type="button" class="btn btn-secondary" onclick="handleDeleteUser('${u.username}')" style="font-size: 0.725rem; padding: 0.25rem 0.55rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" title="Xóa tài khoản này">
                🗑️ Xóa
              </button>
            ` : `
              <span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Mặc định</span>
            `}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (err) {
    console.error('handleFetchUsersList failed:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 1.5rem; color: #ef4444;">
          ⚠️ Không thể tải danh sách người dùng từ máy chủ: ${err.message}.
          <div style="margin-top: 0.5rem;">
            <button type="button" class="btn btn-secondary" onclick="handleFetchUsersList()" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
              Thử Lại
            </button>
          </div>
        </td>
      </tr>
    `;
  }
};

window.toggleUserPasswordDisplay = function(idx, rawPass) {
  const textEl = document.getElementById(`passText_${idx}`);
  const eyeEl = document.getElementById(`passEye_${idx}`);
  if (!textEl || !eyeEl) return;

  if (textEl.getAttribute('data-shown') === '1') {
    textEl.innerText = '••••••••';
    textEl.removeAttribute('data-shown');
    eyeEl.innerText = '👁️';
  } else {
    textEl.innerText = rawPass;
    textEl.setAttribute('data-shown', '1');
    eyeEl.innerText = '🙈';
  }
};

window.handleCreateNewUserSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const usernameInput = document.getElementById('newUsername');
  const fullNameInput = document.getElementById('newUserFullName');
  const passwordInput = document.getElementById('newUserPassword');
  const roleSelect = document.getElementById('newUserRole');
  const descInput = document.getElementById('newUserDesc');

  if (!usernameInput || !fullNameInput || !passwordInput || !roleSelect) return;

  const rawUsername = usernameInput.value.trim();
  const username = rawUsername.replace(/\s+/g, ' '); // Chuẩn hóa khoảng trắng kép, giữ nguyên chữ hoa/thường
  const fullName = (fullNameInput.value.trim() || username);
  const password = passwordInput.value.trim();
  const role = roleSelect.value;
  const description = descInput ? descInput.value.trim() : '';

  if (!username || username.length < 2) {
    if (window.showToast) {
      window.showToast('danger', '⚠️ Vui lòng nhập Tên đăng nhập (tối thiểu 2 ký tự)!');
    } else {
      window.alert('Vui lòng nhập Tên đăng nhập (tối thiểu 2 ký tự)!');
    }
    usernameInput.focus();
    return;
  }

  if (!password || password.length < 2) {
    if (window.showToast) {
      window.showToast('danger', '⚠️ Vui lòng nhập Mật khẩu đăng nhập (tối thiểu 2 ký tự)!');
    } else {
      window.alert('Vui lòng nhập Mật khẩu đăng nhập (tối thiểu 2 ký tự)!');
    }
    passwordInput.focus();
    return;
  }

  try {
    const payload = {
      action: 'create',
      user: {
        username,
        fullName,
        password,
        role,
        description
      }
    };

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Không thể tạo người dùng');
    }

    if (window.showToast) {
      window.showToast('success', `🎉 Đã tạo thành công người dùng "${fullName}" với vai trò: ${role.toUpperCase()}!`);
    }

    // Reset and hide form
    handleToggleAddUserForm(false);

    // Refresh users table
    await handleFetchUsersList();
  } catch (err) {
    console.error('handleCreateNewUserSubmit error:', err);
    if (window.showToast) {
      window.showToast('danger', '⚠️ Lỗi tạo người dùng: ' + err.message);
    } else {
      window.alert('Lỗi tạo người dùng: ' + err.message);
    }
  }
};

window.handleDeleteUser = async function(username) {
  if (!username || username === 'admin') {
    window.alert('Không được phép xóa tài khoản Admin mặc định!');
    return;
  }

  if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"? Thao tác này không thể hoàn tác!`)) {
    return;
  }

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', username })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Lỗi khi xóa người dùng');
    }

    if (window.showToast) {
      window.showToast('success', `🗑️ Đã xóa người dùng "${username}" thành công!`);
    }
    await handleFetchUsersList();
  } catch (err) {
    console.error('handleDeleteUser error:', err);
    window.alert('Lỗi khi xóa người dùng: ' + err.message);
  }
};

window.handleUpdateUserRole = async function(username, newRole) {
  if (!username) return;

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        user: { username, role: newRole }
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Lỗi cập nhật vai trò');
    }

    if (window.showToast) {
      window.showToast('success', `🔄 Đã cập nhật vai trò của "${username}" thành "${newRole.toUpperCase()}"!`);
    }
    await handleFetchUsersList();
  } catch (err) {
    console.error('handleUpdateUserRole error:', err);
    window.alert('Lỗi cập nhật vai trò: ' + err.message);
  }
};
