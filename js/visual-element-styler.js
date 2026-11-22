/**
 * AJAX PROPLAN MES - VISUAL ELEMENT STYLER (CLICK-TO-STYLE INSPECTOR)
 * Cho phép Admin click trực tiếp vào bất kỳ ô chữ, dòng, cột hoặc khung giao diện
 * để tùy biến Phông chữ, Cỡ chữ, Định dạng chữ (Đậm/Nghiêng/Gạch chân/Căn lề/Màu chữ)
 * và Định dạng Màu nền, Viền, Bo góc theo thời gian thực.
 * Lưu trữ bền vững qua LocalStorage và tự động áp dụng lại khi chuyển tab hay cập nhật dữ liệu.
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'AJAX_PROPLAN_ELEMENT_STYLES';
  const STORAGE_KEY_TEXTS = 'AJAX_PROPLAN_ELEMENT_TEXTS';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadStoredStyles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc AJAX_PROPLAN_ELEMENT_STYLES:', e);
    }
    return {};
  }

  function saveStoredStyles(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Lỗi ghi AJAX_PROPLAN_ELEMENT_STYLES:', e);
    }
  }

  function loadStoredTexts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEXTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc AJAX_PROPLAN_ELEMENT_TEXTS:', e);
    }
    return {};
  }

  function saveStoredTexts(data) {
    try {
      localStorage.setItem(STORAGE_KEY_TEXTS, JSON.stringify(data));
    } catch (e) {
      console.warn('Lỗi ghi AJAX_PROPLAN_ELEMENT_TEXTS:', e);
    }
  }

  const VisualElementStyler = {
    isActive: false,
    selectedElement: null,
    hoveredElement: null,
    stylesStore: {}, // { [tabKey]: { [selector]: { ...styles } } }
    textStore: {},   // { [tabKey]: { [selector]: customText } }

    init: function() {
      this.stylesStore = loadStoredStyles();
      this.textStore = loadStoredTexts();
      this.applyAllStyles();
      this.applyAllTexts();
      this.createInspectorUI();
      this.bindGlobalEvents();
      this.setupMutationObserver();
    },

    // Kiểm tra quyền Admin
    isAdmin: function() {
      return true; // Trên Local MES, luôn cho phép thao tác chỉnh sửa giao diện
    },

    getCurrentTabKey: function() {
      try {
        const hash = (window.location.hash || '').replace('#', '');
        if (hash) return hash;
        const activeTab = localStorage.getItem('AJAX_ACTIVE_TAB');
        if (activeTab) return activeTab;
      } catch (e) {}
      const activeNav = document.querySelector('.nav-link.active');
      if (activeNav && activeNav.dataset.tab) return activeNav.dataset.tab;
      return 'datamass';
    },

    // Bật/Tắt chế độ chỉnh sửa trực tiếp
    toggleInspectorMode: function() {
      if (!this.isAdmin()) {
        if (typeof window.showToast === 'function') {
          window.showToast('warning', '⚠️ Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa giao diện trực tiếp!');
        } else {
          alert('Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa giao diện trực tiếp!');
        }
        return;
      }

      this.isActive = !this.isActive;
      const btn = document.getElementById('btnVisualInspectorToggle');
      const bar = document.getElementById('visualInspectorNoticeBar');

      if (this.isActive) {
        document.body.classList.add('visual-inspector-active');
        if (btn) {
          btn.classList.add('active');
          btn.style.background = '#e0f2fe';
          btn.style.borderColor = '#2563eb';
          btn.style.color = '#000000';
          btn.innerHTML = '<span>🟢 Đang Bật Chỉnh Sửa</span>';
        }
        if (bar) bar.style.display = 'flex';
        if (typeof window.showToast === 'function') {
          window.showToast('info', '🖌️ Đã BẬT Chế độ Chỉnh Sửa Trực Tiếp! Hãy click vào ô chữ hoặc khung bạn muốn tùy biến.');
        }
      } else {
        this.deactivateInspector();
      }
    },

    deactivateInspector: function() {
      this.isActive = false;
      document.body.classList.remove('visual-inspector-active');
      this.clearHoverOutline();
      this.clearSelectionOutline();
      this.hidePopover();

      const btn = document.getElementById('btnVisualInspectorToggle');
      if (btn) {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.innerHTML = '<span>🖌️ Chỉnh Sửa Trực Tiếp</span>';
      }

      const bar = document.getElementById('visualInspectorNoticeBar');
      if (bar) bar.style.display = 'none';
    },

    clearHoverOutline: function() {
      if (this.hoveredElement && this.hoveredElement !== this.selectedElement) {
        this.hoveredElement.classList.remove('element-inspector-hover');
        this.hoveredElement = null;
      }
    },

    clearSelectionOutline: function() {
      if (this.selectedElement) {
        this.selectedElement.classList.remove('element-inspector-selected');
        this.selectedElement = null;
      }
    },

    bindGlobalEvents: function() {
      // Hover event in inspector mode
      document.addEventListener('mouseover', (e) => {
        if (!this.isActive) return;
        const target = e.target;
        if (!target || this.isInternalInspectorElement(target)) return;

        if (this.hoveredElement && this.hoveredElement !== target && this.hoveredElement !== this.selectedElement) {
          this.hoveredElement.classList.remove('element-inspector-hover');
        }

        if (target !== this.selectedElement) {
          this.hoveredElement = target;
          target.classList.add('element-inspector-hover');
        }
      }, true);

      // Mouseout event
      document.addEventListener('mouseout', (e) => {
        if (!this.isActive) return;
        const target = e.target;
        if (target && target.classList.contains('element-inspector-hover') && target !== this.selectedElement) {
          target.classList.remove('element-inspector-hover');
        }
      }, true);

      // Click event in inspector mode: intercept click to open styler popover
      document.addEventListener('click', (e) => {
        if (!this.isActive) return;
        const target = e.target;
        if (!target) return;

        // Bỏ qua nếu click bên trong bảng điều khiển Popover hoặc nút toggle
        if (this.isInternalInspectorElement(target)) return;

        // Chặn hành vi mặc định (như click link, button, checkbox, toggle OT)
        e.preventDefault();
        e.stopPropagation();

        this.selectElement(target);
      }, true);

      // Double-click event in inspector mode: gõ trực tiếp ngay trên tiêu đề/chữ
      document.addEventListener('dblclick', (e) => {
        if (!this.isActive) return;
        const target = e.target;
        if (!target || this.isInternalInspectorElement(target)) return;

        e.preventDefault();
        e.stopPropagation();

        this.selectElement(target);
        this.startDirectInlineEdit();
      }, true);

      // Esc key to close popover or exit inspector mode
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.isPopoverVisible()) {
            this.hidePopover();
          } else if (this.isActive) {
            this.deactivateInspector();
          }
        }
      });

      // Tự động áp dụng lại style & custom text khi DOM re-render
      window.addEventListener('hashchange', () => {
        setTimeout(() => {
          this.applyAllStyles();
          this.applyAllTexts();
        }, 100);
      });
    },

    isInternalInspectorElement: function(el) {
      if (!el) return false;
      return !!el.closest('#elementStyleInspectorPopover') || 
             !!el.closest('#visualInspectorNoticeBar') || 
             el.id === 'btnVisualInspectorToggle' || 
             !!el.closest('#tabCustomizerModal');
    },

    selectElement: function(el) {
      this.clearHoverOutline();
      this.clearSelectionOutline();

      this.selectedElement = el;
      el.classList.add('element-inspector-selected');

      this.showPopoverForElement(el);
    },

    // Tạo các phần tử giao diện Inspector và Popover
    createInspectorUI: function() {
      // 1. Thẻ thông báo trên cùng khi bật chế độ
      if (!document.getElementById('visualInspectorNoticeBar')) {
        const bar = document.createElement('div');
        bar.id = 'visualInspectorNoticeBar';
        bar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="font-size: 1.15rem;">🖌️</span>
            <span><strong>Chế độ Chỉnh Sửa Giao Diện Trực Tiếp Đang Bật:</strong> Click chuột vào ô chữ, ô bảng, cột hoặc khung để mở bảng tùy biến!</span>
          </div>
          <button type="button" onclick="window.VisualElementStyler.deactivateInspector()" style="background: #ffffff; border: 1.5px solid #000000; border-radius: 6px; padding: 0.25rem 0.75rem; font-size: 0.775rem; font-weight: 700; color: #000000; cursor: pointer;">
            ✕ Thoát Chế Độ
          </button>
        `;
        document.body.appendChild(bar);
      }

      // 2. Popover bảng điều khiển nổi
      if (!document.getElementById('elementStyleInspectorPopover')) {
        const popover = document.createElement('div');
        popover.id = 'elementStyleInspectorPopover';
        popover.className = 'element-styler-popover';
        popover.style.display = 'none';

        popover.innerHTML = `
          <div class="popover-header">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="font-size: 1.1rem;">🎨</span>
              <div>
                <div class="popover-title" id="popoverElementTagTitle">Tùy Biến Phần Tử</div>
                <div class="popover-subtitle" id="popoverElementPathSub">Đang chọn: element</div>
              </div>
            </div>
            <button type="button" class="btn-popover-close" onclick="window.VisualElementStyler.hidePopover()" title="Đóng">✕</button>
          </div>

          <div class="popover-body">
            
            <!-- 1. CHỈNH SỬA TIÊU ĐỀ & NỘI DUNG CHỮ (MỚI THEO YÊU CẦU) -->
            <div class="styler-field-group styler-content-edit-box" style="background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 0.65rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                <label class="styler-label" style="color: #000000; font-weight: 850; margin-bottom: 0; display: flex; align-items: center; gap: 0.3rem;">
                  <span>✏️</span><span>Chỉnh Sửa Tiêu Đề / Nội Dung Chữ:</span>
                </label>
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.resetTextContentOnly()" style="border-color: #cbd5e1; font-size: 0.7rem; background: #ffffff; color: #000000; font-weight: 700;" title="Khôi phục lại tiêu đề gốc ban đầu">
                  ↺ Gốc
                </button>
              </div>
              <textarea id="stylerTextContent" class="styler-textarea" rows="2" 
                        placeholder="Nhập nội dung tiêu đề hoặc chữ mới..."
                        oninput="window.VisualElementStyler.previewTextChange(this.value)"></textarea>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.35rem; gap: 0.4rem;">
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.startDirectInlineEdit()" style="background: #0284c7; color: #ffffff; border-color: #0284c7; font-weight: 800; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.3rem 0.6rem; border-radius: 6px;" title="Nhấp đúp chuột hoặc click vào đây để gõ trực tiếp lên chữ trên màn hình">
                  <span>✍️ Gõ trực tiếp lên chữ</span>
                </button>
              </div>
            </div>

            <!-- SCOPE SELECTOR -->
            <div class="styler-field-group">
              <label class="styler-label">🎯 Phạm vi áp dụng kiểu dáng:</label>
              <select id="stylerScopeSelect" class="styler-select" onchange="window.VisualElementStyler.onScopeChange()">
                <option value="element">🎯 Chỉ riêng phần tử này</option>
                <option value="column">📊 Toàn bộ Cột này (nếu là ô bảng)</option>
                <option value="row">📋 Toàn bộ Hàng này (nếu là ô bảng)</option>
                <option value="class">🏷️ Tất cả phần tử cùng loại/class trong Tab</option>
              </select>
            </div>

            <!-- FONT FAMILY -->
            <div class="styler-field-group">
              <label class="styler-label">🔤 Phông chữ (Font Family):</label>
              <select id="stylerFontFamily" class="styler-select" onchange="window.VisualElementStyler.previewChange('fontFamily', this.value)">
                <option value='Arial, "Helvetica Neue", Helvetica, sans-serif'>Arial (Mặc định)</option>
                <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
                <option value="'Tahoma', sans-serif">Tahoma</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
              <div class="styler-quick-pills">
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.setControl('fontFamily', 'Arial, Helvetica, sans-serif')">Arial</button>
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.setControl('fontFamily', '\'Plus Jakarta Sans\', sans-serif')">Jakarta</button>
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.setControl('fontFamily', '\'Inter\', sans-serif')">Inter</button>
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.setControl('fontFamily', '\'JetBrains Mono\', monospace')">Mono</button>
              </div>
            </div>

            <!-- FONT SIZE & FORMATTING -->
            <div class="styler-row-2col">
              <div class="styler-field-group">
                <label class="styler-label">📏 Cỡ chữ:</label>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <button type="button" class="btn-step" onclick="window.VisualElementStyler.adjustFontSize(-1)">-</button>
                  <input type="number" id="stylerFontSize" class="styler-input-num" min="9" max="48" step="1" value="14" 
                         onchange="window.VisualElementStyler.previewChange('fontSize', this.value + 'px')">
                  <button type="button" class="btn-step" onclick="window.VisualElementStyler.adjustFontSize(1)">+</button>
                  <span style="font-size: 0.75rem; color: #64748b;">px</span>
                </div>
              </div>

              <!-- TEXT FORMAT BUTTONS -->
              <div class="styler-field-group">
                <label class="styler-label">Định dạng chữ:</label>
                <div class="styler-btn-group">
                  <button type="button" id="btnFormatBold" class="btn-fmt" onclick="window.VisualElementStyler.toggleFormat('bold')" title="In Đậm"><strong>B</strong></button>
                  <button type="button" id="btnFormatItalic" class="btn-fmt" onclick="window.VisualElementStyler.toggleFormat('italic')" title="In Nghiêng"><em>I</em></button>
                  <button type="button" id="btnFormatUnderline" class="btn-fmt" onclick="window.VisualElementStyler.toggleFormat('underline')" title="Gạch Chân"><u>U</u></button>
                </div>
              </div>
            </div>

            <!-- TEXT ALIGN -->
            <div class="styler-field-group">
              <label class="styler-label">Căn lề chữ:</label>
              <div class="styler-btn-group">
                <button type="button" id="btnAlignLeft" class="btn-fmt" onclick="window.VisualElementStyler.setTextAlign('left')" title="Căn Trái">⫷ Trái</button>
                <button type="button" id="btnAlignCenter" class="btn-fmt" onclick="window.VisualElementStyler.setTextAlign('center')" title="Căn Giữa">☰ Giữa</button>
                <button type="button" id="btnAlignRight" class="btn-fmt" onclick="window.VisualElementStyler.setTextAlign('right')" title="Căn Phải">⫸ Phải</button>
              </div>
            </div>

            <!-- TEXT COLOR -->
            <div class="styler-field-group">
              <label class="styler-label">✒️ Màu chữ (Text Color):</label>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <input type="color" id="stylerTextColor" class="styler-color-picker" value="#000000"
                       oninput="window.VisualElementStyler.syncColorInput('stylerTextColor', 'stylerTextColorHex', 'color')">
                <input type="text" id="stylerTextColorHex" class="styler-color-hex" value="#000000"
                       onchange="window.VisualElementStyler.syncHexInput('stylerTextColorHex', 'stylerTextColor', 'color')">
                <div class="styler-swatches">
                  <span class="swatch-dot" style="background: #000000; border: 1px solid #cbd5e1;" onclick="window.VisualElementStyler.setControl('color', '#000000')" title="Đen (#000000)"></span>
                  <span class="swatch-dot" style="background: #ff0000; border: 1px solid #cbd5e1;" onclick="window.VisualElementStyler.setControl('color', '#ff0000')" title="Đỏ (Gap < 0)"></span>
                  <span class="swatch-dot" style="background: #0000ff; border: 1px solid #cbd5e1;" onclick="window.VisualElementStyler.setControl('color', '#0000ff')" title="Xanh (Gap > 0)"></span>
                </div>
              </div>
            </div>

            <!-- BACKGROUND COLOR -->
            <div class="styler-field-group">
              <label class="styler-label">🖌️ Màu nền (Background Color):</label>
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <input type="color" id="stylerBgColor" class="styler-color-picker" value="#ffffff"
                       oninput="window.VisualElementStyler.syncColorInput('stylerBgColor', 'stylerBgColorHex', 'backgroundColor')">
                <input type="text" id="stylerBgColorHex" class="styler-color-hex" value="#ffffff"
                       onchange="window.VisualElementStyler.syncHexInput('stylerBgColorHex', 'stylerBgColor', 'backgroundColor')">
                <button type="button" class="btn-pill-opt" onclick="window.VisualElementStyler.setControl('backgroundColor', 'transparent')" title="Không màu nền">Trong suốt</button>
              </div>
              <div class="styler-swatches" style="margin-top: 0.4rem;">
                <span class="swatch-dot" style="background: #ffffff; border: 1.5px solid #000000;" onclick="window.VisualElementStyler.setControl('backgroundColor', '#ffffff')" title="Trắng (#ffffff)"></span>
                <span class="swatch-dot" style="background: #fff3cc; border: 1.5px solid #000000;" onclick="window.VisualElementStyler.setControl('backgroundColor', '#fff3cc')" title="Vàng Nhạt (#fff3cc)"></span>
                <span class="swatch-dot" style="background: #00ffff; border: 1.5px solid #000000;" onclick="window.VisualElementStyler.setControl('backgroundColor', '#00ffff')" title="Xanh (#00ffff)"></span>
                <span class="swatch-dot" style="background: #fabd05; border: 1.5px solid #000000;" onclick="window.VisualElementStyler.setControl('backgroundColor', '#fabd05')" title="Cam (#fabd05)"></span>
              </div>
            </div>

            <!-- BORDER & RADIUS -->
            <div class="styler-row-2col">
              <div class="styler-field-group">
                <label class="styler-label">🔲 Bo góc (Radius):</label>
                <select id="stylerBorderRadius" class="styler-select" onchange="window.VisualElementStyler.previewChange('borderRadius', this.value)">
                  <option value="0px">0px (Vuông)</option>
                  <option value="4px">4px (Nhẹ)</option>
                  <option value="8px">8px (Vừa)</option>
                  <option value="12px">12px (Lớn)</option>
                  <option value="9999px">Tròn (Pill)</option>
                </select>
              </div>

              <div class="styler-field-group">
                <label class="styler-label">Viền (Border):</label>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <select id="stylerBorderWidth" class="styler-select" style="width: 70px;" onchange="window.VisualElementStyler.updateBorder()">
                    <option value="0px">Không</option>
                    <option value="1px">1px</option>
                    <option value="2px">2px</option>
                  </select>
                  <input type="color" id="stylerBorderColor" class="styler-color-picker" value="#444c56" onchange="window.VisualElementStyler.updateBorder()">
                </div>
              </div>
            </div>

          </div>

          <div class="popover-footer">
            <button type="button" class="btn-popover-reset" onclick="window.VisualElementStyler.resetSelectedElementStyle()" title="Xóa kiểu dáng đã gán và khôi phục giao diện gốc của phần tử này">
              🔄 Khôi Phục Gốc
            </button>
            <div style="display: flex; gap: 0.45rem;">
              <button type="button" class="btn-popover-cancel" onclick="window.VisualElementStyler.hidePopover()">Hủy</button>
              <button type="button" class="btn-popover-save" onclick="window.VisualElementStyler.saveStyleForElement()">💾 Lưu Kiểu Dáng</button>
            </div>
          </div>
        `;

        document.body.appendChild(popover);
      }
    },

    isPopoverVisible: function() {
      const p = document.getElementById('elementStyleInspectorPopover');
      return p && p.style.display !== 'none';
    },

    hidePopover: function() {
      const p = document.getElementById('elementStyleInspectorPopover');
      if (p) p.style.display = 'none';
      this.clearSelectionOutline();
    },

    // Hiển thị Popover cạnh phần tử được click
    showPopoverForElement: function(el) {
      const popover = document.getElementById('elementStyleInspectorPopover');
      if (!popover || !el) return;

      // Đọc thông tin và trạng thái kiểu dáng hiện tại của phần tử
      const comp = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const isCell = tag === 'td' || tag === 'th';

      // Tiêu đề & mô tả
      let desc = tag;
      if (isCell) {
        const colIdx = el.cellIndex !== undefined ? el.cellIndex + 1 : '';
        const row = el.closest('tr');
        const rowIdx = row ? row.rowIndex + 1 : '';
        desc = `Ô bảng [${tag.toUpperCase()}] Cột ${colIdx}${rowIdx ? `, Hàng ${rowIdx}` : ''}`;
      } else if (el.classList.contains('card')) {
        desc = `Khung Thẻ [div.card]`;
      } else if (el.id) {
        desc = `#${el.id}`;
      } else if (el.className && typeof el.className === 'string') {
        const cls = el.className.split(' ').filter(c => !c.startsWith('element-inspector')).slice(0, 2).join('.');
        desc = cls ? `${tag}.${cls}` : tag;
      }

      document.getElementById('popoverElementTagTitle').textContent = `Tùy Biến: ${desc}`;
      document.getElementById('popoverElementPathSub').textContent = `Tab: ${this.getCurrentTabKey()} • Click để đổi định dạng`;

      // Cập nhật các trường trên form với kiểu dáng hiện hành
      const fontSelect = document.getElementById('stylerFontFamily');
      if (fontSelect) {
        fontSelect.value = el.style.fontFamily || comp.fontFamily || 'Arial';
      }

      const sizeInput = document.getElementById('stylerFontSize');
      if (sizeInput) {
        const sizePx = parseInt(el.style.fontSize || comp.fontSize, 10) || 14;
        sizeInput.value = sizePx;
      }

      // Format toggles
      const isBold = (el.style.fontWeight === 'bold' || parseInt(comp.fontWeight, 10) >= 700);
      const isItalic = (el.style.fontStyle === 'italic' || comp.fontStyle === 'italic');
      const isUnderline = (el.style.textDecoration && el.style.textDecoration.includes('underline'));

      this.updateBtnActiveState('btnFormatBold', isBold);
      this.updateBtnActiveState('btnFormatItalic', isItalic);
      this.updateBtnActiveState('btnFormatUnderline', isUnderline);

      // Text align
      const align = el.style.textAlign || comp.textAlign || 'left';
      this.updateTextAlignButtons(align);

      // Colors
      const hexColor = this.rgbToHex(el.style.color || comp.color) || '#000000';
      document.getElementById('stylerTextColor').value = hexColor;
      document.getElementById('stylerTextColorHex').value = hexColor;

      const hexBg = this.rgbToHex(el.style.backgroundColor || comp.backgroundColor) || '#ffffff';
      document.getElementById('stylerBgColor').value = hexBg;
      document.getElementById('stylerBgColorHex').value = hexBg;

      // Border & radius
      const rad = el.style.borderRadius || comp.borderRadius || '0px';
      const radSelect = document.getElementById('stylerBorderRadius');
      if (radSelect) radSelect.value = rad;

      // Điều chỉnh tùy chọn Phạm vi
      const scopeSelect = document.getElementById('stylerScopeSelect');
      if (scopeSelect) {
        const colOpt = scopeSelect.querySelector('option[value="column"]');
        const rowOpt = scopeSelect.querySelector('option[value="row"]');
        if (colOpt) colOpt.disabled = !isCell;
        if (rowOpt) rowOpt.disabled = !isCell;
        scopeSelect.value = 'element';
      }

      // Lưu trữ và nạp nội dung tiêu đề/chữ hiện tại
      if (el.dataset.originalText === undefined) {
        el.dataset.originalText = this.getElementEditableText(el);
      }
      const textInput = document.getElementById('stylerTextContent');
      if (textInput) {
        textInput.value = this.getElementEditableText(el);
      }

      // Định vị Popover thông minh cạnh phần tử
      popover.style.display = 'block';
      this.positionPopoverSmartly(el, popover);
    },

    onScopeChange: function() {
      if (!this.selectedElement) return;
      const scope = document.getElementById('stylerScopeSelect')?.value || 'element';
      const sel = this.buildSelectorForElement(this.selectedElement, scope);
      const sub = document.getElementById('popoverElementPathSub');
      if (sub) {
        sub.textContent = `Tab: ${this.getCurrentTabKey()} • Mục tiêu: ${sel}`;
      }
    },

    // Lấy nội dung text có thể chỉnh sửa của phần tử (giữ an toàn cấu trúc con)
    getElementEditableText: function(el) {
      if (!el) return '';
      // Nếu không có phần tử con, trả về textContent thuần
      if (el.children.length === 0) {
        return (el.textContent || '').trim();
      }
      // Nếu có text node trực tiếp (ví dụ: thẻ h3 chứa icon và text tiêu đề)
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
          return node.nodeValue.trim();
        }
      }
      // Nếu có thẻ span tiêu đề riêng (như .title-text, .card-title, v.v.)
      const titleSpan = el.querySelector('.title-text, .card-title, span:not(.card-icon):not(.badge)');
      if (titleSpan) {
        return (titleSpan.textContent || '').trim();
      }
      return (el.innerText || el.textContent || '').trim();
    },

    // Gán nội dung text mới một cách thông minh (giữ nguyên icon, checkbox, button nếu có)
    setElementSmartText: function(el, newText) {
      if (!el) return;
      const val = String(newText !== undefined && newText !== null ? newText : '');
      
      // Nếu không có thẻ con nào, gán thẳng
      if (el.children.length === 0) {
        el.textContent = val;
        return;
      }

      // Tìm text node trực tiếp để cập nhật (không làm mất các thẻ icon hoặc checkbox)
      let updated = false;
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
          node.nodeValue = ' ' + val.trim() + ' ';
          updated = true;
          break;
        }
      }

      if (!updated) {
        const titleSpan = el.querySelector('.title-text, .card-title, span:not(.card-icon):not(.badge)');
        if (titleSpan) {
          titleSpan.textContent = val;
          updated = true;
        }
      }

      if (!updated) {
        // Nếu trước đó không có text node, thêm một text node mới vào cuối
        el.appendChild(document.createTextNode(' ' + val.trim() + ' '));
      }
    },

    // Preview trực tiếp khi gõ vào ô nhập tiêu đề
    previewTextChange: function(val) {
      if (!this.selectedElement) return;
      this.setElementSmartText(this.selectedElement, val);
    },

    // Khôi phục lại tiêu đề gốc ban đầu
    resetTextContentOnly: function() {
      if (!this.selectedElement) return;
      const el = this.selectedElement;
      const orig = el.dataset.originalText;
      if (orig !== undefined) {
        this.setElementSmartText(el, orig);
        const textInput = document.getElementById('stylerTextContent');
        if (textInput) textInput.value = orig;

        // Xóa trong textStore
        const tabKey = this.getCurrentTabKey();
        const scope = document.getElementById('stylerScopeSelect')?.value || 'element';
        const selector = this.buildSelectorForElement(el, scope);
        if (this.textStore[tabKey] && this.textStore[tabKey][selector]) {
          delete this.textStore[tabKey][selector];
          saveStoredTexts(this.textStore);
        }
        if (typeof window.showToast === 'function') {
          window.showToast('info', '↺ Đã khôi phục tiêu đề gốc ban đầu!');
        }
      }
    },

    // Gõ trực tiếp lên chữ trên màn hình (contentEditable)
    startDirectInlineEdit: function() {
      if (!this.selectedElement) return;
      const el = this.selectedElement;

      // Lưu text gốc nếu chưa lưu
      if (el.dataset.originalText === undefined) {
        el.dataset.originalText = this.getElementEditableText(el);
      }

      // Tạm ẩn Popover để tiện gõ
      const popover = document.getElementById('elementStyleInspectorPopover');
      if (popover) popover.style.display = 'none';

      el.contentEditable = 'true';
      el.classList.add('element-direct-editing');
      el.focus();

      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}

      if (typeof window.showToast === 'function') {
        window.showToast('info', '✍️ Đang gõ trực tiếp: Hãy nhập tiêu đề mới và bấm Enter hoặc click ra ngoài để lưu!');
      }

      const onFinish = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        if (e.type === 'keydown' && e.shiftKey) return; // Cho phép Shift+Enter nếu muốn xuống hàng

        if (e.type === 'keydown') {
          e.preventDefault();
        }

        el.contentEditable = 'false';
        el.classList.remove('element-direct-editing');
        el.removeEventListener('keydown', onFinish);
        el.removeEventListener('blur', onFinish);

        const newText = this.getElementEditableText(el);
        const textInput = document.getElementById('stylerTextContent');
        if (textInput) textInput.value = newText;

        // Lưu vào textStore
        const tabKey = this.getCurrentTabKey();
        const scope = document.getElementById('stylerScopeSelect')?.value || 'element';
        const selector = this.buildSelectorForElement(el, scope);

        if (!this.textStore[tabKey]) this.textStore[tabKey] = {};
        this.textStore[tabKey][selector] = newText;
        saveStoredTexts(this.textStore);

        if (typeof window.showToast === 'function') {
          window.showToast('success', `💾 Đã lưu tiêu đề mới: "${newText}"!`);
        }

        if (this.isActive) {
          this.showPopoverForElement(el);
        }
      };

      el.addEventListener('keydown', onFinish);
      el.addEventListener('blur', onFinish);
    },

    positionPopoverSmartly: function(targetEl, popover) {
      const rect = targetEl.getBoundingClientRect();
      const popW = 340;
      const popH = 500;
      const margin = 12;

      let top = rect.bottom + window.scrollY + margin;
      let left = rect.left + window.scrollX;

      // Tránh tràn viền phải
      if (left + popW > window.innerWidth - margin) {
        left = window.innerWidth - popW - margin;
      }
      if (left < margin) left = margin;

      // Tránh tràn viền đáy (nếu tràn thì đưa lên trên phần tử)
      if (rect.bottom + popH > window.innerHeight && rect.top > popH + margin) {
        top = rect.top + window.scrollY - popH - margin;
      }

      popover.style.top = `${Math.max(window.scrollY + margin, top)}px`;
      popover.style.left = `${left}px`;
    },

    // Helpers cập nhật nút active
    updateBtnActiveState: function(btnId, isActive) {
      const btn = document.getElementById(btnId);
      if (btn) {
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    },

    updateTextAlignButtons: function(align) {
      ['left', 'center', 'right'].forEach(a => {
        const btn = document.getElementById(`btnAlign${a.charAt(0).toUpperCase() + a.slice(1)}`);
        if (btn) {
          if (align === a) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
    },

    // Live preview khi chỉnh trên Popover
    previewChange: function(prop, val) {
      if (!this.selectedElement) return;
      this.applyStyleProperty(this.selectedElement, prop, val);
    },

    setControl: function(prop, val) {
      if (!this.selectedElement) return;
      if (prop === 'fontFamily') {
        const s = document.getElementById('stylerFontFamily');
        if (s) s.value = val;
      } else if (prop === 'color') {
        const p = document.getElementById('stylerTextColor');
        const h = document.getElementById('stylerTextColorHex');
        if (p) p.value = val;
        if (h) h.value = val;
      } else if (prop === 'backgroundColor') {
        const p = document.getElementById('stylerBgColor');
        const h = document.getElementById('stylerBgColorHex');
        if (p) p.value = val;
        if (h) h.value = val;
      }
      this.applyStyleProperty(this.selectedElement, prop, val);
    },

    adjustFontSize: function(delta) {
      const input = document.getElementById('stylerFontSize');
      if (!input) return;
      let val = parseInt(input.value, 10) || 14;
      val = Math.max(9, Math.min(48, val + delta));
      input.value = val;
      this.previewChange('fontSize', `${val}px`);
    },

    toggleFormat: function(type) {
      if (!this.selectedElement) return;
      if (type === 'bold') {
        const isBold = this.selectedElement.style.fontWeight === 'bold' || parseInt(window.getComputedStyle(this.selectedElement).fontWeight, 10) >= 700;
        const newVal = isBold ? 'normal' : 'bold';
        this.applyStyleProperty(this.selectedElement, 'fontWeight', newVal);
        this.updateBtnActiveState('btnFormatBold', !isBold);
      } else if (type === 'italic') {
        const isItalic = this.selectedElement.style.fontStyle === 'italic';
        const newVal = isItalic ? 'normal' : 'italic';
        this.applyStyleProperty(this.selectedElement, 'fontStyle', newVal);
        this.updateBtnActiveState('btnFormatItalic', !isItalic);
      } else if (type === 'underline') {
        const isUnderline = (this.selectedElement.style.textDecoration && this.selectedElement.style.textDecoration.includes('underline'));
        const newVal = isUnderline ? 'none' : 'underline';
        this.applyStyleProperty(this.selectedElement, 'textDecoration', newVal);
        this.updateBtnActiveState('btnFormatUnderline', !isUnderline);
      }
    },

    setTextAlign: function(align) {
      if (!this.selectedElement) return;
      this.applyStyleProperty(this.selectedElement, 'textAlign', align);
      this.updateTextAlignButtons(align);
    },

    syncColorInput: function(srcId, hexId, prop) {
      const src = document.getElementById(srcId);
      const hex = document.getElementById(hexId);
      if (src && hex) {
        hex.value = src.value;
        this.previewChange(prop, src.value);
      }
    },

    syncHexInput: function(hexId, srcId, prop) {
      const hex = document.getElementById(hexId);
      const src = document.getElementById(srcId);
      if (hex && src) {
        src.value = hex.value;
        this.previewChange(prop, hex.value);
      }
    },

    updateBorder: function() {
      if (!this.selectedElement) return;
      const width = document.getElementById('stylerBorderWidth')?.value || '0px';
      const color = document.getElementById('stylerBorderColor')?.value || '#cbd5e1';
      if (width === '0px') {
        this.applyStyleProperty(this.selectedElement, 'border', 'none');
      } else {
        this.applyStyleProperty(this.selectedElement, 'border', `${width} solid ${color}`);
      }
    },

    applyStyleProperty: function(el, prop, val) {
      if (!el || !el.style) return;
      el.style.setProperty(prop, val, 'important');
    },

    // Tạo CSS selector thông minh tùy theo scope
    buildSelectorForElement: function(el, scope) {
      const tabKey = this.getCurrentTabKey();
      const tabScope = `#tab-${tabKey}`;

      if (scope === 'column' && (el.tagName.toLowerCase() === 'td' || el.tagName.toLowerCase() === 'th')) {
        const colIdx = el.cellIndex + 1;
        const table = el.closest('table');
        const tableCls = table ? table.className.split(' ').filter(c => !c.startsWith('element-inspector'))[0] : '';
        const tableSel = tableCls ? `table.${tableCls}` : 'table';
        return `${tabScope} ${tableSel} tr > *:nth-child(${colIdx})`;
      }

      if (scope === 'row' && (el.tagName.toLowerCase() === 'td' || el.tagName.toLowerCase() === 'th')) {
        const row = el.closest('tr');
        if (row && row.className) {
          const rowCls = row.className.split(' ').filter(c => !c.startsWith('element-inspector'))[0];
          if (rowCls) return `${tabScope} tr.${rowCls} > *`;
        }
        const rowIdx = row ? row.rowIndex + 1 : 1;
        return `${tabScope} tr:nth-child(${rowIdx}) > *`;
      }

      if (scope === 'class' && el.className && typeof el.className === 'string') {
        const cleanClasses = el.className.split(' ').filter(c => !c.startsWith('element-inspector') && !c.includes('hover') && !c.includes('selected'));
        if (cleanClasses.length > 0) {
          return `${tabScope} .${cleanClasses.join('.')}`;
        }
      }

      // Fallback: Unique element path
      if (el.id) {
        return `#${el.id}`;
      }

      // Tạo đường dẫn DOM tương đối
      let path = [];
      let cur = el;
      while (cur && cur.id !== `tab-${tabKey}` && cur !== document.body) {
        let tag = cur.tagName.toLowerCase();
        if (cur.parentElement) {
          const siblings = Array.from(cur.parentElement.children).filter(c => c.tagName.toLowerCase() === tag);
          if (siblings.length > 1) {
            const idx = siblings.indexOf(cur) + 1;
            tag += `:nth-of-type(${idx})`;
          }
        }
        path.unshift(tag);
        cur = cur.parentElement;
      }
      return `${tabScope} > ${path.join(' > ')}`;
    },

    // Lưu kiểu dáng vào Store và áp dụng vĩnh viễn
    saveStyleForElement: function() {
      if (!this.selectedElement) return;
      if (!this.isAdmin()) {
        window.showToast('danger', '❌ Bạn không có quyền Admin!');
        return;
      }

      const scope = document.getElementById('stylerScopeSelect')?.value || 'element';
      const selector = this.buildSelectorForElement(this.selectedElement, scope);
      const tabKey = this.getCurrentTabKey();

      const styleObj = {
        fontFamily: document.getElementById('stylerFontFamily')?.value,
        fontSize: (document.getElementById('stylerFontSize')?.value || '14') + 'px',
        fontWeight: document.getElementById('btnFormatBold')?.classList.contains('active') ? 'bold' : 'normal',
        fontStyle: document.getElementById('btnFormatItalic')?.classList.contains('active') ? 'italic' : 'normal',
        textDecoration: document.getElementById('btnFormatUnderline')?.classList.contains('active') ? 'underline' : 'none',
        textAlign: document.getElementById('btnAlignCenter')?.classList.contains('active') ? 'center' : (document.getElementById('btnAlignRight')?.classList.contains('active') ? 'right' : 'left'),
        color: document.getElementById('stylerTextColorHex')?.value || '#000000',
        backgroundColor: document.getElementById('stylerBgColorHex')?.value || '#ffffff',
        borderRadius: document.getElementById('stylerBorderRadius')?.value || '0px'
      };

      const bWidth = document.getElementById('stylerBorderWidth')?.value || '0px';
      const bColor = document.getElementById('stylerBorderColor')?.value || '#cbd5e1';
      if (bWidth !== '0px') {
        styleObj.border = `${bWidth} solid ${bColor}`;
      } else {
        styleObj.border = 'none';
      }

      if (!this.stylesStore[tabKey]) {
        this.stylesStore[tabKey] = {};
      }

      this.stylesStore[tabKey][selector] = styleObj;
      saveStoredStyles(this.stylesStore);
      this.applyAllStyles();

      // Lưu nội dung tiêu đề / chữ mới nếu có nhập
      const textVal = document.getElementById('stylerTextContent')?.value;
      if (textVal !== undefined && textVal !== null) {
        if (!this.textStore[tabKey]) {
          this.textStore[tabKey] = {};
        }
        this.textStore[tabKey][selector] = textVal;
        saveStoredTexts(this.textStore);
        this.applyAllTexts();
      }

      if (typeof window.showToast === 'function') {
        window.showToast('success', `💾 Đã lưu và áp dụng kiểu dáng & tiêu đề cho phần tử (${scope}) thành công!`);
      }

      this.hidePopover();
    },

    // Khôi phục kiểu dáng mặc định của phần tử đang chọn
    resetSelectedElementStyle: function() {
      if (!this.selectedElement) return;
      const tabKey = this.getCurrentTabKey();
      const scope = document.getElementById('stylerScopeSelect')?.value || 'element';
      const selector = this.buildSelectorForElement(this.selectedElement, scope);

      if (this.stylesStore[tabKey] && this.stylesStore[tabKey][selector]) {
        delete this.stylesStore[tabKey][selector];
        saveStoredStyles(this.stylesStore);
      }

      // Xóa lưu trữ nội dung chữ tùy biến
      if (this.textStore[tabKey] && this.textStore[tabKey][selector]) {
        delete this.textStore[tabKey][selector];
        saveStoredTexts(this.textStore);
      }

      // Khôi phục text gốc nếu có
      const el = this.selectedElement;
      if (el.dataset.originalText !== undefined) {
        this.setElementSmartText(el, el.dataset.originalText);
      }

      // Xóa inline styles đã gán
      el.style.fontFamily = '';
      el.style.fontSize = '';
      el.style.fontWeight = '';
      el.style.fontStyle = '';
      el.style.textDecoration = '';
      el.style.textAlign = '';
      el.style.color = '';
      el.style.backgroundColor = '';
      el.style.borderRadius = '';
      el.style.border = '';

      this.applyAllStyles();

      if (typeof window.showToast === 'function') {
        window.showToast('info', '🔄 Đã khôi phục kiểu dáng và tiêu đề gốc của phần tử!');
      }

      this.hidePopover();
    },

    // Áp dụng tất cả các tiêu đề & nội dung chữ tùy biến đã lưu
    applyAllTexts: function() {
      const tabKey = this.getCurrentTabKey();
      const tabTexts = this.textStore[tabKey];
      if (!tabTexts) return;

      Object.keys(tabTexts).forEach(sel => {
        const customText = tabTexts[sel];
        if (customText === undefined || customText === null) return;
        try {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            if (el.dataset.originalText === undefined) {
              el.dataset.originalText = this.getElementEditableText(el);
            }
            this.setElementSmartText(el, customText);
          });
        } catch (e) {
          // Bỏ qua selector không hợp lệ nếu có
        }
      });
    },

    // Theo dõi DOM thay đổi để tự động tái áp dụng style và text
    setupMutationObserver: function() {
      let debounceTimer = null;
      const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        for (let i = 0; i < mutations.length; i++) {
          const target = mutations[i].target;
          if (target && !this.isInternalInspectorElement(target) && !target.classList?.contains('element-direct-editing')) {
            shouldUpdate = true;
            break;
          }
        }
        if (!shouldUpdate) return;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.applyAllStyles();
          this.applyAllTexts();
        }, 150);
      });

      const mainContent = document.getElementById('mainContent') || document.body;
      if (mainContent) {
        observer.observe(mainContent, { childList: true, subtree: true });
      }
    },

    // Sinh CSS toàn cục từ store và đưa vào thẻ style
    applyAllStyles: function() {
      let styleTag = document.getElementById('dynamicVisualElementStyles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamicVisualElementStyles';
        document.head.appendChild(styleTag);
      }

      let css = '/* DYNAMIC IN-PLACE ELEMENT STYLES (SAVED BY ADMIN) */\n';

      Object.keys(this.stylesStore).forEach(tabKey => {
        const tabRules = this.stylesStore[tabKey];
        if (!tabRules) return;

        Object.keys(tabRules).forEach(sel => {
          const s = tabRules[sel];
          css += `${sel} {\n`;
          if (s.fontFamily) css += `  font-family: ${s.fontFamily} !important;\n`;
          if (s.fontSize) css += `  font-size: ${s.fontSize} !important;\n`;
          if (s.fontWeight) css += `  font-weight: ${s.fontWeight} !important;\n`;
          if (s.fontStyle) css += `  font-style: ${s.fontStyle} !important;\n`;
          if (s.textDecoration) css += `  text-decoration: ${s.textDecoration} !important;\n`;
          if (s.textAlign) css += `  text-align: ${s.textAlign} !important;\n`;
          if (s.color) css += `  color: ${s.color} !important;\n`;
          if (s.backgroundColor) css += `  background-color: ${s.backgroundColor} !important;\n`;
          if (s.borderRadius) css += `  border-radius: ${s.borderRadius} !important;\n`;
          if (s.border) css += `  border: ${s.border} !important;\n`;
          css += `}\n`;
        });
      });

      styleTag.textContent = css;
    },

    rgbToHex: function(rgb) {
      if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '';
      if (rgb.startsWith('#')) return rgb;
      const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!match) return '';
      const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  };

  // Expose globally
  window.VisualElementStyler = VisualElementStyler;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VisualElementStyler.init());
  } else {
    VisualElementStyler.init();
  }

})();
