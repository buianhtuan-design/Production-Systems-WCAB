/**
 * AJAX PROPLAN MES - TAB THEME CUSTOMIZER (ADMIN ONLY)
 * Cho phép Quản Trị Viên (Admin) tùy biến phông chữ, cỡ chữ, màu chữ và màu nền cho từng Tab độc lập.
 * Lưu trữ trạng thái bền vững qua LocalStorage và áp dụng tức thì mà không ảnh hưởng logic tính toán.
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'AJAX_PROPLAN_TAB_THEMES';

  const DEFAULT_THEME = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
    fontSize: '15.5px',
    textColor: '#000000',
    bgColor: '#ffffff',
    cardBgColor: '#ffffff',
    thBgColor: '#fff3cc'
  };

  const TAB_NAMES = {
    'datamass': '📅 Kế Hoạch Tổng Thể (Data_Mass)',
    'capacity': '⚡ Năng Lực & Định Mức (Capacity / Assembly)',
    'wip': '📦 Kiểm Soát Tồn Chuyền (WIP Control)',
    'clips-all-plan': '🔗 Tra Cứu Clips All Plan',
    'kpi-result': '📊 Báo Cáo KPI Kết Quả',
    'prod-history': '⚖️ Lịch Sử Sản Xuất',
    'plan-fact-check': '🔍 Check Plan / Fact',
    'dashboard': '📊 Tổng Quan (Dashboard)',
    'all': '🌐 Tất Cả Các Tab (Áp dụng chung)'
  };

  // Safe localStorage helper
  function loadStoredThemes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc AJAX_PROPLAN_TAB_THEMES:', e);
    }
    return {};
  }

  function saveStoredThemes(themes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
      console.warn('Lỗi ghi AJAX_PROPLAN_TAB_THEMES:', e);
    }
  }

  const TabThemeCustomizer = {
    themes: {},

    init: function() {
      this.themes = loadStoredThemes();
      this.applyAllThemes();
      this.bindEvents();
    },

    bindEvents: function() {
      // Tự động cập nhật lại CSS khi hash/tab thay đổi
      window.addEventListener('hashchange', () => {
        this.applyAllThemes();
      });
    },

    getTabConfig: function(tabKey) {
      const tab = tabKey || 'all';
      if (this.themes[tab]) {
        return Object.assign({}, DEFAULT_THEME, this.themes[tab]);
      }
      if (this.themes['all']) {
        return Object.assign({}, DEFAULT_THEME, this.themes['all']);
      }
      return Object.assign({}, DEFAULT_THEME);
    },

    hasCustomConfig: function(tabKey) {
      return !!(this.themes && this.themes[tabKey]);
    },

    // Kiểm tra quyền Admin
    isAdmin: function() {
      return true; // Trên Local MES, luôn cho phép thao tác chỉnh sửa giao diện
    },

    // Áp dụng CSS động qua style tag
    applyAllThemes: function() {
      let styleTag = document.getElementById('dynamicTabThemeStyles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamicTabThemeStyles';
        document.head.appendChild(styleTag);
      }

      // CHỈ ÁP DỤNG TÙY BIẾN KHI Ở GIAO DIỆN SÁNG (DATA-THEME="LIGHT")
      // Giao diện Tối được bảo toàn 100% nguyên gốc không bị can thiệp
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      if (currentTheme !== 'light') {
        styleTag.textContent = '';
        return;
      }

      let css = '/* DYNAMIC TAB THEMES APPLIED VIA ADMIN CUSTOMIZER */\n';

      // 1. Nếu có cấu hình "all"
      if (this.themes['all']) {
        const c = Object.assign({}, DEFAULT_THEME, this.themes['all']);
        css += `
          .page-view .tab-content {
            font-family: ${c.fontFamily} !important;
            font-size: ${c.fontSize} !important;
            background-color: ${c.bgColor} !important;
          }
          .page-view .tab-content *,
          .page-view .tab-content input,
          .page-view .tab-content select,
          .page-view .tab-content button {
            font-family: ${c.fontFamily} !important;
          }
          .page-view .tab-content .card,
          .page-view .tab-content .manpower-chart-card,
          .page-view .tab-content .table-container,
          .page-view .tab-content .data-table tbody td {
            background-color: ${c.cardBgColor} !important;
          }
          .page-view .tab-content .data-table thead th,
          .page-view .tab-content table thead th,
          .page-view .tab-content .table-sticky-header th {
            background-color: ${c.thBgColor} !important;
          }
          .page-view .tab-content p,
          .page-view .tab-content span:not(.text-danger):not(.text-success):not([class*="diff"]):not([class*="gap"]):not(.badge-red):not(.badge-green):not(.shortage-val):not(.surplus-val):not(.td-concl-ng):not(.td-concl-ok),
          .page-view .tab-content td:not(.diff-neg):not(.diff-pos):not(.gap-neg):not(.gap-pos):not(.shortage-val):not(.surplus-val),
          .page-view .tab-content strong:not(.diff-neg):not(.diff-pos):not(.gap-neg):not(.gap-pos),
          .page-view .tab-content label {
            color: ${c.textColor};
          }
        \n`;
      }

      // 2. Từng tab riêng biệt (Ưu tiên cao hơn cấu hình chung)
      Object.keys(this.themes).forEach(tabKey => {
        if (tabKey === 'all') return;
        const c = Object.assign({}, DEFAULT_THEME, this.themes[tabKey]);
        const sel = `#tab-${tabKey}`;
        css += `
          /* Tab Specific Theme: ${tabKey} */
          ${sel} {
            font-family: ${c.fontFamily} !important;
            font-size: ${c.fontSize} !important;
            background-color: ${c.bgColor} !important;
          }
          ${sel} *,
          ${sel} input,
          ${sel} select,
          ${sel} button {
            font-family: ${c.fontFamily} !important;
          }
          ${sel} .card,
          ${sel} .manpower-chart-card,
          ${sel} .table-container,
          ${sel} .data-table tbody td,
          ${sel} .sim-table-wrap table tbody td,
          ${sel} .adj-overtime-table-wrap tbody td {
            background-color: ${c.cardBgColor} !important;
          }
          ${sel} .data-table thead th,
          ${sel} table thead th,
          ${sel} .table-sticky-header th,
          ${sel} .sim-table-wrap thead th,
          ${sel} .adj-overtime-table-wrap thead th {
            background-color: ${c.thBgColor} !important;
          }
          ${sel} p,
          ${sel} span:not(.text-danger):not(.text-success):not([class*="diff"]):not([class*="gap"]):not(.badge-red):not(.badge-green):not(.shortage-val):not(.surplus-val):not(.td-concl-ng):not(.td-concl-ok),
          ${sel} td:not(.diff-neg):not(.diff-pos):not(.gap-neg):not(.gap-pos):not(.shortage-val):not(.surplus-val),
          ${sel} strong:not(.diff-neg):not(.diff-pos):not(.gap-neg):not(.gap-pos),
          ${sel} label {
            color: ${c.textColor};
          }
          /* Bảo tồn giá trị âm đỏ, dương xanh lá */
          ${sel} .text-danger, ${sel} .diff-neg, ${sel} .gap-neg, ${sel} .shortage-val, ${sel} .td-concl-ng {
            color: #ff0000 !important; font-weight: 700 !important;
          }
          ${sel} .text-success, ${sel} .diff-pos, ${sel} .gap-pos, ${sel} .surplus-val, ${sel} .td-concl-ok {
            color: #0000ff !important; font-weight: 700 !important;
          }
          /* Bảo tồn ô Line OT vàng nhạt */
          ${sel} .cell-ot, ${sel} .adj-cell-ot, ${sel} [data-is-ot="true"], ${sel} .badge-mp-ot {
            background-color: #fabd05 !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
        \n`;
      });

      styleTag.textContent = css;
    },

    // Mở modal (chỉ Admin)
    openModal: function(requestedTabKey) {
      if (!this.isAdmin()) {
        if (typeof window.showToast === 'function') {
          window.showToast('warning', '⚠️ Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa giao diện phân hệ!');
        } else {
          alert('Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa giao diện phân hệ!');
        }
        return;
      }

      const modal = document.getElementById('tabCustomizerModal');
      if (!modal) return;

      // Xác định tab đang xem nếu không truyền tham số
      let activeTab = requestedTabKey;
      if (!activeTab) {
        try {
          const hash = (window.location.hash || '').replace('#', '');
          activeTab = hash || localStorage.getItem('AJAX_ACTIVE_TAB') || 'datamass';
        } catch (e) {
          activeTab = 'datamass';
        }
      }

      // Đặt giá trị cho dropdown chọn Tab
      const tabSelect = document.getElementById('tabCustomizerSelect');
      if (tabSelect) {
        tabSelect.value = TAB_NAMES[activeTab] ? activeTab : 'datamass';
      }

      this.populateModalControls(tabSelect ? tabSelect.value : activeTab);
      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeModal: function() {
      const modal = document.getElementById('tabCustomizerModal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // Đổ dữ liệu cấu hình của tab vào các control
    populateModalControls: function(tabKey) {
      const config = this.getTabConfig(tabKey);
      const isCustom = this.hasCustomConfig(tabKey);

      // Phông chữ
      const fontSelect = document.getElementById('customizerFontFamily');
      if (fontSelect) fontSelect.value = config.fontFamily;

      // Cỡ chữ
      const sizeInput = document.getElementById('customizerFontSize');
      const sizeVal = document.getElementById('customizerFontSizeVal');
      const cleanSize = parseInt(config.fontSize, 10) || 14;
      if (sizeInput) sizeInput.value = cleanSize;
      if (sizeVal) sizeVal.textContent = `${cleanSize}px`;

      // Màu chữ
      const textColorPicker = document.getElementById('customizerTextColor');
      const textColorHex = document.getElementById('customizerTextColorHex');
      if (textColorPicker) textColorPicker.value = config.textColor || '#000000';
      if (textColorHex) textColorHex.value = config.textColor || '#000000';

      // Màu nền nội dung tab
      const bgPicker = document.getElementById('customizerBgColor');
      const bgHex = document.getElementById('customizerBgColorHex');
      if (bgPicker) bgPicker.value = config.bgColor || '#ffffff';
      if (bgHex) bgHex.value = config.bgColor || '#ffffff';

      // Màu nền thẻ card / ô dữ liệu
      const cardBgPicker = document.getElementById('customizerCardBgColor');
      const cardBgHex = document.getElementById('customizerCardBgColorHex');
      if (cardBgPicker) cardBgPicker.value = config.cardBgColor || '#ffffff';
      if (cardBgHex) cardBgHex.value = config.cardBgColor || '#ffffff';

      // Màu nền Header bảng
      const thBgPicker = document.getElementById('customizerThBgColor');
      const thBgHex = document.getElementById('customizerThBgColorHex');
      if (thBgPicker) thBgPicker.value = config.thBgColor || '#fff3cc';
      if (thBgHex) thBgHex.value = config.thBgColor || '#fff3cc';

      // Huy hiệu trạng thái
      const statusBadge = document.getElementById('customizerTabStatusBadge');
      if (statusBadge) {
        if (isCustom) {
          statusBadge.innerHTML = '<span style="color: #57ab5a; font-weight: 700;">🟢 Đang dùng cấu hình tùy chỉnh riêng</span>';
        } else {
          statusBadge.innerHTML = '<span style="color: #768390; font-weight: 600;">⚪ Đang dùng cấu hình mặc định (4 Màu Chuẩn: Trắng, Vàng Nhạt, Xanh, Cam)</span>';
        }
      }

      this.updateLivePreview();
    },

    // Cập nhật khung xem trước trực tiếp
    updateLivePreview: function() {
      const previewCard = document.getElementById('customizerLivePreviewCard');
      const previewTh = document.getElementById('customizerLivePreviewTh');
      const previewTd = document.getElementById('customizerLivePreviewTd');
      const previewText = document.getElementById('customizerLivePreviewText');

      if (!previewCard) return;

      const font = document.getElementById('customizerFontFamily')?.value || DEFAULT_THEME.fontFamily;
      const size = (document.getElementById('customizerFontSize')?.value || '14.5') + 'px';
      const textColor = document.getElementById('customizerTextColorHex')?.value || '#adbac7';
      const bgColor = document.getElementById('customizerBgColorHex')?.value || '#22272e';
      const cardBgColor = document.getElementById('customizerCardBgColorHex')?.value || '#2d333b';
      const thBgColor = document.getElementById('customizerThBgColorHex')?.value || '#1c2128';

      // Áp dụng lên preview box
      const wrap = document.getElementById('customizerPreviewWrap');
      if (wrap) wrap.style.backgroundColor = bgColor;

      previewCard.style.fontFamily = font;
      previewCard.style.fontSize = size;
      previewCard.style.backgroundColor = cardBgColor;
      previewCard.style.color = textColor;

      if (previewTh) {
        previewTh.style.backgroundColor = thBgColor;
        previewTh.style.color = textColor;
      }
      if (previewTd) {
        previewTd.style.backgroundColor = cardBgColor;
        previewTd.style.color = textColor;
      }
      if (previewText) {
        previewText.style.color = textColor;
      }
    },

    // Handlers chọn nhanh
    setQuickFont: function(font) {
      const select = document.getElementById('customizerFontFamily');
      if (select) {
        select.value = font;
        this.updateLivePreview();
      }
    },

    setQuickSize: function(sizePx) {
      const input = document.getElementById('customizerFontSize');
      const val = document.getElementById('customizerFontSizeVal');
      if (input) {
        input.value = sizePx;
        if (val) val.textContent = `${sizePx}px`;
        this.updateLivePreview();
      }
    },

    setQuickColor: function(type, hex) {
      if (type === 'text') {
        const p = document.getElementById('customizerTextColor');
        const h = document.getElementById('customizerTextColorHex');
        if (p) p.value = hex;
        if (h) h.value = hex;
      } else if (type === 'bg') {
        const p = document.getElementById('customizerBgColor');
        const h = document.getElementById('customizerBgColorHex');
        if (p) p.value = hex;
        if (h) h.value = hex;
      } else if (type === 'cardBg') {
        const p = document.getElementById('customizerCardBgColor');
        const h = document.getElementById('customizerCardBgColorHex');
        if (p) p.value = hex;
        if (h) h.value = hex;
      } else if (type === 'thBg') {
        const p = document.getElementById('customizerThBgColor');
        const h = document.getElementById('customizerThBgColorHex');
        if (p) p.value = hex;
        if (h) h.value = hex;
      }
      this.updateLivePreview();
    },

    syncColorHex: function(sourceId, targetId) {
      const src = document.getElementById(sourceId);
      const tgt = document.getElementById(targetId);
      if (src && tgt) {
        tgt.value = src.value;
        this.updateLivePreview();
      }
    },

    onTabSelectChange: function() {
      const tabSelect = document.getElementById('tabCustomizerSelect');
      if (!tabSelect) return;
      this.populateModalControls(tabSelect.value);
    },

    // Lưu cấu hình cho Tab hiện tại
    saveCurrentTabTheme: function() {
      if (!this.isAdmin()) {
        window.showToast('danger', '❌ Bạn không có quyền Admin để thực hiện thao tác này!');
        return;
      }

      const tabSelect = document.getElementById('tabCustomizerSelect');
      const tabKey = tabSelect ? tabSelect.value : 'datamass';

      const config = {
        fontFamily: document.getElementById('customizerFontFamily')?.value || DEFAULT_THEME.fontFamily,
        fontSize: (document.getElementById('customizerFontSize')?.value || '14.5') + 'px',
        textColor: document.getElementById('customizerTextColorHex')?.value || DEFAULT_THEME.textColor,
        bgColor: document.getElementById('customizerBgColorHex')?.value || DEFAULT_THEME.bgColor,
        cardBgColor: document.getElementById('customizerCardBgColorHex')?.value || DEFAULT_THEME.cardBgColor,
        thBgColor: document.getElementById('customizerThBgColorHex')?.value || DEFAULT_THEME.thBgColor
      };

      this.themes[tabKey] = config;
      saveStoredThemes(this.themes);
      this.applyAllThemes();
      this.populateModalControls(tabKey);

      const tabName = TAB_NAMES[tabKey] || tabKey;
      if (typeof window.showToast === 'function') {
        window.showToast('success', `💾 Đã lưu và áp dụng giao diện thành công cho: ${tabName}!`);
      }
    },

    // Khôi phục mặc định tab hiện tại
    resetCurrentTabTheme: function() {
      if (!this.isAdmin()) {
        window.showToast('danger', '❌ Bạn không có quyền Admin!');
        return;
      }

      const tabSelect = document.getElementById('tabCustomizerSelect');
      const tabKey = tabSelect ? tabSelect.value : 'datamass';

      delete this.themes[tabKey];
      saveStoredThemes(this.themes);
      this.applyAllThemes();
      this.populateModalControls(tabKey);

      const tabName = TAB_NAMES[tabKey] || tabKey;
      if (typeof window.showToast === 'function') {
        window.showToast('info', `🔄 Đã khôi phục giao diện mặc định cho: ${tabName}!`);
      }
    },

    // Khôi phục mặc định toàn bộ các tab
    resetAllTabsTheme: function() {
      if (!this.isAdmin()) {
        window.showToast('danger', '❌ Bạn không có quyền Admin!');
        return;
      }

      if (!confirm('Bạn có chắc chắn muốn khôi phục toàn bộ các Tab về giao diện mặc định ban đầu không?')) {
        return;
      }

      this.themes = {};
      saveStoredThemes(this.themes);
      this.applyAllThemes();

      const tabSelect = document.getElementById('tabCustomizerSelect');
      const currentTab = tabSelect ? tabSelect.value : 'datamass';
      this.populateModalControls(currentTab);

      if (typeof window.showToast === 'function') {
        window.showToast('info', '🔄 Đã khôi phục toàn bộ các Tab về giao diện chuẩn thành công!');
      }
    }
  };

  // Expose globally
  window.TabThemeCustomizer = TabThemeCustomizer;
  window.openTabCustomizerModal = function(tabKey) {
    TabThemeCustomizer.openModal(tabKey);
  };
  window.closeTabCustomizerModal = function() {
    TabThemeCustomizer.closeModal();
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TabThemeCustomizer.init());
  } else {
    TabThemeCustomizer.init();
  }

})();
