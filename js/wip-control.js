/**
 * =========================================================================
 * AJAX PROPLAN MES - WIP CONTROL (WORK IN PROGRESS & STOCK 1C) MODULE
 * =========================================================================
 * Quản lý và kiểm soát tồn kho 1C (Stock 1C) và luồng bán thành phẩm theo ngày:
 * - Cột: Công Đoạn ➔ Group Model ➔ Product Name 1C ➔ Norm Key ➔ Last Step ➔ Kế Hoạch ➔ Thực Tế ➔ Chênh Lệch ➔ Stock 1C ➔ Trạng Thái
 * - Nhập & theo dõi tồn kho 1C theo từng ngày kiểm kê
 * - KPI tập trung vào Tồn kho 1C, Kế hoạch, Thực tế, Chênh lệch và Cảnh báo thiếu hụt
 * =========================================================================
 */

(function() {
  'use strict';

  function getTodayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Tính toán khoảng ngày mặc định: từ ngày đầu tiên bắt đầu tuần (Thứ 5) đến ngày hiện tại
   * Ví dụ cụ thể: từ 29/10/2026 (Thứ 5) đến 03/11/2026 (Hôm nay / Thứ 3)
   */
  function getDefaultWipDateRange() {
    if (window.AppStore && typeof window.AppStore.getFactoryWeekRange === 'function') {
      const r = window.AppStore.getFactoryWeekRange();
      return { fromDate: r.fromDate, toDate: r.toDate };
    }
    if (typeof window.getFactoryWeekRange === 'function') {
      const r = window.getFactoryWeekRange();
      return { fromDate: r.fromDate, toDate: r.toDate };
    }
    let todayStr = getTodayIsoDate();
    let todayObj = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(todayStr) : new Date(todayStr);
    if (!todayObj || isNaN(todayObj.getTime())) {
      todayObj = new Date('2026-11-04');
      todayStr = '2026-11-04';
    }

    // Chu kỳ tuần nhà máy: bắt đầu từ Thứ 5 và kết thúc vào hết Thứ 4 tuần tiếp theo (7 ngày)
    // Cài đặt mặc định: từ Thứ 5 đến Ngày Hiện Tại (today)
    const dayOfWeek = todayObj.getDay();
    const diffToThursday = (dayOfWeek - 4 + 7) % 7;

    const startOfWeek = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate() - diffToThursday);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6); // Hết Thứ 4 tuần tiếp theo

    const pad = n => String(n).padStart(2, '0');
    const fromDate = `${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`;
    const toDate = todayStr; // Mặc định đến ngày hiện tại
    const weekEndDate = `${endOfWeek.getFullYear()}-${pad(endOfWeek.getMonth() + 1)}-${pad(endOfWeek.getDate())}`;

    return { fromDate, toDate, weekEndDate };
  }

  function toIsoDate(str) {
    const def = getDefaultWipDateRange();
    if (!str) return def.fromDate;
    if (typeof str === 'string' && str.includes('-') && str.split('-')[0].length === 4) return str;
    const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(str) : new Date(str);
    if (isNaN(d.getTime())) return def.fromDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function toVnDate(str) {
    if (!str) return '';
    const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(str) : new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  const defaultWipRange = getDefaultWipDateRange();

  // Định nghĩa danh mục kho Stock 1C hỗ trợ mở rộng cột linh hoạt
  const STOCK_WAREHOUSES_DEF = [
    { id: 'all', key: 'ALL', label: 'Tổng Kho', icon: '🌐', shortName: '🌐 Tổng Kho', title: 'Tổng tồn cuối tất cả kho trong sheet Inventory 1C', color: '#6ee7b7' },
    { id: 'whAssembly', key: 'WH ASSEMBLY_VTP', label: 'WH ASSEMBLY_VTP', icon: '🏭', shortName: '🏭 WH ASM', title: 'Kho WH ASSEMBLY_VTP', color: '#a7f3d0' },
    { id: 'whPkg', key: 'PKG_VTP', label: 'PKG_VTP', icon: '📦', shortName: '📦 PKG', title: 'Kho PKG_VTP', color: '#a7f3d0' },
    { id: 'whRepairSemi', key: 'Repair of semi-finished products_VTP', label: 'Repair Semi-FG', icon: '🔧', shortName: '🔧 Repair Semi', title: 'Kho Repair of semi-finished products_VTP (Bán thành phẩm sửa chữa)', color: '#a7f3d0' },
    { id: 'whRepairBoard', key: 'Repair of board_VTP', label: 'Repair Board', icon: '📟', shortName: '📟 Repair Board', title: 'Kho Repair of board_VTP (Bo mạch sửa chữa)', color: '#a7f3d0' },
    { id: 'whHardTest', key: 'WH of Hard Test_VTP', label: 'WH of Hard Test_VTP', icon: '⚡', shortName: '⚡ Hard Test', title: 'Kho WH of Hard Test_VTP (Khu vực Hard Test)', color: '#fde047' }
  ];

  function getInitialActiveStockWarehouses() {
    try {
      const saved = localStorage.getItem('AJAX_WIP_ACTIVE_STOCK_WHS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    // Mặc định ban đầu hiển thị 5 kho cơ bản
    return ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
  }

  const WIP_STORAGE_KEY = 'AJAX_WIP_STORE_STATE';

  function saveWipStoreState() {
    try {
      if (!window.WipStore) return;
      const s = {
        activeSubView: window.WipStore.activeSubView,
        showSfgColumns: window.WipStore.showSfgColumns,
        stageFilter: window.WipStore.stageFilter,
        modelFilter: window.WipStore.modelFilter,
        lastStepFilter: window.WipStore.lastStepFilter,
        statusFilter: window.WipStore.statusFilter,
        gapFilter: window.WipStore.gapFilter,
        sortBy: window.WipStore.sortBy,
        warehouseFilter: window.WipStore.warehouseFilter,
        search: window.WipStore.search,
        sfgSearch: window.WipStore.sfgSearch,
        sfgStageFilter: window.WipStore.sfgStageFilter,
        sfgGapFilter: window.WipStore.sfgGapFilter,
        sfgSortBy: window.WipStore.sfgSortBy,
        pageIndex: window.WipStore.pageIndex,
        pageSize: window.WipStore.pageSize,
        fromDate: window.WipStore.fromDate,
        toDate: window.WipStore.toDate,
        date: window.WipStore.date
      };
      localStorage.setItem(WIP_STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function getInitialWipStoreState() {
    const defaultState = {
      activeSubView: 'TABLE', // 'TABLE' | 'SFG_LOOKUP'
      showSfgColumns: true,   // Hiển thị nhóm cột Tra cứu SFG (Công đoạn trước, Kế hoạch, Thực tế, Gap) cạnh cột Catagory
      stageFilter: 'ASSEMBLY', // Mặc định lọc trước với công đoạn Assembly
      modelFilter: 'ALL',
      lastStepFilter: 'ALL',
      statusFilter: 'ALL',
      gapFilter: 'HAS_GAP', // Mặc định chỉ lấy các mã có GAP (≠ 0)
      sortBy: 'GAP_ASC', // Mặc định âm nhiều nhất lên đầu
      warehouseFilter: 'ALL', // Bộ lọc kho 1C: ALL, WH ASSEMBLY_VTP, PKG_VTP, WH of Hard Test_VTP...
      activeStockWarehouses: getInitialActiveStockWarehouses(), // Danh sách cột kho đang mở rộng hiển thị
      search: '',
      sfgSearch: '',          // Từ khóa tìm kiếm trong phần Tra cứu SFG
      sfgStageFilter: 'ALL',  // Công đoạn nguồn trong phần Tra cứu SFG
      sfgGapFilter: 'HAS_GAP',// Bộ lọc GAP trong phần Tra cứu SFG
      sfgSortBy: 'GAP_ASC',   // Sắp xếp trong phần Tra cứu SFG
      pageIndex: 0,
      pageSize: 50,
      fromDate: defaultWipRange.fromDate, // Mặc định từ ngày đầu tuần
      toDate: defaultWipRange.toDate,     // Mặc định đến ngày hiện tại
      date: defaultWipRange.toDate        // Mặc định là mốc kết thúc kế hoạch & tồn kho
    };
    try {
      const saved = localStorage.getItem(WIP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...defaultState,
            ...parsed,
            activeStockWarehouses: getInitialActiveStockWarehouses()
          };
        }
      }
    } catch (e) {}
    return defaultState;
  }

  // Khởi tạo State lưu trữ bộ lọc của WIP Control (Phục hồi từ localStorage nếu có để bảo toàn bộ lọc khi auto-refresh)
  window.WipStore = getInitialWipStoreState();

  /**
   * Sinh màu sắc đặc trưng cho từng công đoạn
   */
  function getStageBadgeStyle(stage) {
    const s = (stage || '').toUpperCase();
    if (s.includes('SMD')) return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', color: '#60a5fa', icon: '⚡' };
    if (s.includes('DIP')) return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24', icon: '🔌' };
    if (s.includes('HARD TEST') || s.includes('HT')) return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#34d399', icon: '🔬' };
    if (s.includes('ASSEMBLY') || s.includes('ASM')) return { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)', color: '#c084fc', icon: '🔧' };
    if (s.includes('LAQ')) return { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)', color: '#22d3ee', icon: '💧' };
    if (s.includes('PKG') || s.includes('PACK')) return { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)', color: '#f472b6', icon: '📦' };
    if (s.includes('QC') || s.includes('TEST')) return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', color: '#d8b4fe', icon: '⭐' };
    return { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)', color: '#94a3b8', icon: '🏭' };
  }

  /**
   * Sinh badge trạng thái WIP
   */
  function getWipStatusBadge(status) {
    if (status === 'COMPLETED') {
      return '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">✓ Đạt KH</span>';
    } else if (status === 'IN_PROGRESS') {
      return '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">⏳ Đang chạy</span>';
    } else if (status === 'PENDING') {
      return '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">⌛ Chờ chạy</span>';
    } else if (status === 'UNPLANNED') {
      return '<span class="badge" style="background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3);">+ Ngoài KH</span>';
    }
    return '<span class="badge" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.25);">Cân đối</span>';
  }

  /**
   * Tra cứu số lượng tồn kho của từng nguyên vật liệu từ cột Final Balance trong Sheet Inventory 1C (window.INVENTORY_1C_MASTER_DATA)
   * Tách chính xác theo từng kho: ALL, WH ASSEMBLY_VTP, PKG_VTP...
   */
  function getMaterialStock1CInfo(nomenclature, materialCode, selectedWarehouse) {
    if (!window.INVENTORY_1C_MASTER_DATA) return { val: 0, text: '—', tooltip: 'Chưa nạp dữ liệu Inventory 1C', hasStock: false };
    const invMap = window.INVENTORY_1C_MASTER_DATA;
    let rec = null;

    // 1. Ưu tiên tra cứu theo Mã Code (Material Code)
    if (materialCode) {
      const codeStr = String(materialCode).trim();
      const codeClean = codeStr.replace(/^0+/, '');
      const codePad9 = codeClean ? codeClean.padStart(9, '0') : '';
      if (invMap[codeStr]) rec = invMap[codeStr];
      else if (codeClean && invMap[codeClean]) rec = invMap[codeClean];
      else if (codePad9 && invMap[codePad9]) rec = invMap[codePad9];
    }

    // 2. Tra cứu theo Tên Nomenclature
    if (!rec && nomenclature) {
      if (invMap[nomenclature]) {
        rec = invMap[nomenclature];
      } else {
        const cleanNom = nomenclature.trim().toLowerCase();
        for (const [k, v] of Object.entries(invMap)) {
          if (k.trim().toLowerCase() === cleanNom) {
            rec = v;
            break;
          }
        }
      }
    }

    // 3. Fallback tìm kiếm substring
    if (!rec && materialCode) {
      const codeStr = String(materialCode).trim();
      for (const [k, v] of Object.entries(invMap)) {
        if (k.includes(codeStr)) {
          rec = v;
          break;
        }
      }
    }

    if (rec) {
      const whMode = selectedWarehouse || (window.WipStore && window.WipStore.warehouseFilter) || 'ALL';
      let val = 0;
      let whTitle = 'Tất cả kho (Tổng hợp)';

      if (whMode === 'WH ASSEMBLY_VTP') {
        val = rec.whAssembly !== undefined ? rec.whAssembly : ((rec.warehouses && rec.warehouses['WH ASSEMBLY_VTP']) || 0);
        whTitle = 'Kho WH ASSEMBLY_VTP';
      } else if (whMode === 'PKG_VTP') {
        val = rec.whPkg !== undefined ? rec.whPkg : ((rec.warehouses && rec.warehouses['PKG_VTP']) || 0);
        whTitle = 'Kho PKG_VTP';
      } else if (whMode === 'Repair of semi-finished products_VTP') {
        val = rec.whRepairSemi !== undefined ? rec.whRepairSemi : ((rec.warehouses && rec.warehouses['Repair of semi-finished products_VTP']) || 0);
        whTitle = 'Kho Repair semi-finished (Bán thành phẩm sửa chữa)';
      } else if (whMode === 'Repair of board_VTP') {
        val = rec.whRepairBoard !== undefined ? rec.whRepairBoard : ((rec.warehouses && rec.warehouses['Repair of board_VTP']) || 0);
        whTitle = 'Kho Repair of board (Bo mạch sửa chữa)';
      } else if (whMode === 'WH of Hard Test_VTP') {
        val = rec.whHardTest !== undefined ? rec.whHardTest : ((rec.warehouses && rec.warehouses['WH of Hard Test_VTP']) || 0);
        whTitle = 'Kho WH of Hard Test_VTP (Hard Test)';
      } else {
        val = typeof rec.total === 'number' ? rec.total : 0;
        whTitle = 'Tất cả kho (Tổng hợp)';
      }

      const whLines = [];
      if (rec.warehouses) {
        for (const [wName, qty] of Object.entries(rec.warehouses)) {
          if (qty > 0) whLines.push(`• ${wName}: ${Number(qty).toLocaleString('vi-VN')} pcs`);
        }
      }

      const tooltip = `[${whTitle}] Tồn cuối Final Balance: ${Number(val).toLocaleString('vi-VN')} pcs\n` + 
        (whLines.length > 0 ? `Chi tiết theo từng kho trong sheet Inventory 1C:\n${whLines.join('\n')}` : '');

      return {
        val,
        text: val > 0 ? val.toLocaleString('vi-VN') : '0',
        tooltip,
        hasStock: val > 0,
        warehouses: rec.warehouses || {}
      };
    }

    return { val: 0, text: '—', tooltip: `Chưa có dữ liệu Final Balance trong Sheet Inventory 1C: ${nomenclature || materialCode || ''}`, hasStock: false, warehouses: {} };
  }

  /**
   * Sắp xếp danh sách nguyên vật liệu của mỗi sản phẩm:
   * Các SFG (linh kiện có Nomenclature bắt đầu bằng chữ 'Ajax') luôn được đưa lên trên đầu
   */
  function sortMaterialsSfgFirst(materials) {
    if (!materials || !Array.isArray(materials) || materials.length <= 1) return materials || [];
    return [...materials].sort((a, b) => {
      const isSfgA = String(a.nomenclature || a.specSub || a.spec || '').trim().toLowerCase().startsWith('ajax');
      const isSfgB = String(b.nomenclature || b.specSub || b.spec || '').trim().toLowerCase().startsWith('ajax');
      if (isSfgA && !isSfgB) return -1;
      if (!isSfgA && isSfgB) return 1;
      return 0;
    });
  }

  /**
   * Lấy tồn kho đồng thời của tất cả các nhóm kho chính trong Sheet Inventory 1C cho 1 nguyên vật liệu hoặc thành phẩm:
   * 1. Tổng tất cả kho (ALL)
   * 2. WH ASSEMBLY_VTP
   * 3. PKG_VTP
   * 4. Repair of semi-finished products_VTP
   * 5. Repair of board_VTP
   * 6. WH of Hard Test_VTP (Mới)
   */
  function getMaterialStocksGroup(nomenclature, materialCode) {
    const emptyResult = {
      all: 0,
      whAssembly: 0,
      whPkg: 0,
      whRepairSemi: 0,
      whRepairBoard: 0,
      whHardTest: 0,
      warehouses: {},
      hasStock: false
    };

    if (!window.INVENTORY_1C_MASTER_DATA) return emptyResult;
    const invMap = window.INVENTORY_1C_MASTER_DATA;
    let rec = null;

    // 1. Tìm theo mã linh kiện
    if (materialCode) {
      const codeClean = String(materialCode).trim().replace(/^0+/, '');
      const codePad9 = codeClean.padStart(9, '0');
      const rawCode = String(materialCode).trim();
      rec = invMap[rawCode] || invMap[codeClean] || invMap[codePad9] || null;
    }

    // 2. Tìm theo tên
    if (!rec && nomenclature) {
      if (invMap[nomenclature]) {
        rec = invMap[nomenclature];
      } else {
        const cleanNom = nomenclature.trim().toLowerCase();
        for (const [k, v] of Object.entries(invMap)) {
          if (k.trim().toLowerCase() === cleanNom) {
            rec = v;
            break;
          }
        }
      }
    }

    // 3. Fallback tìm kiếm substring
    if (!rec && materialCode) {
      const codeStr = String(materialCode).trim();
      for (const [k, v] of Object.entries(invMap)) {
        if (k.includes(codeStr)) {
          rec = v;
          break;
        }
      }
    }

    if (rec) {
      const whs = rec.warehouses || {};
      const allVal = typeof rec.total === 'number' ? rec.total : 0;
      const whAsmVal = rec.whAssembly !== undefined ? rec.whAssembly : (whs['WH ASSEMBLY_VTP'] || 0);
      const whPkgVal = rec.whPkg !== undefined ? rec.whPkg : (whs['PKG_VTP'] || 0);
      const whRepairSemiVal = rec.whRepairSemi !== undefined ? rec.whRepairSemi : (whs['Repair of semi-finished products_VTP'] || 0);
      const whRepairBoardVal = rec.whRepairBoard !== undefined ? rec.whRepairBoard : (whs['Repair of board_VTP'] || 0);
      const whHardTestVal = rec.whHardTest !== undefined ? rec.whHardTest : (whs['WH of Hard Test_VTP'] || 0);

      const hasStock = allVal > 0 || whAsmVal > 0 || whPkgVal > 0 || whRepairSemiVal > 0 || whRepairBoardVal > 0 || whHardTestVal > 0;

      return {
        all: allVal,
        whAssembly: whAsmVal,
        whPkg: whPkgVal,
        whRepairSemi: whRepairSemiVal,
        whRepairBoard: whRepairBoardVal,
        whHardTest: whHardTestVal,
        warehouses: whs,
        hasStock: hasStock
      };
    }

    return emptyResult;
  }

  /**
   * =========================================================================
   * SFG UPSTREAM LOOKUP ENGINE (TRA CỨU KẾ HOẠCH - THỰC TẾ - GAP CÔNG ĐOẠN TRƯỚC)
   * =========================================================================
   */
  const STAGE_FLOW_ORDER = {
    'CUTTING': 5,
    'UF PRINT': 8,
    'SMD': 10,
    'LACQUERING': 20,
    'LAQ.LINE': 22,
    'DIP. SELECTIV.PRE': 30,
    'DIP. SELECTIV': 32,
    'DIP. SELECTIV.POST': 34,
    'DIP': 36,
    'A IMP ASM': 42,
    'OPTICS ASM': 44,
    'FOCUS': 46,
    'CALIBRATION': 48,
    'CALIB CO': 49,
    'HARD TEST': 50,
    'GRAVING ASM': 58,
    'ASSEMBLY': 60,
    'LONG TEST': 70,
    'TEST ROOM': 80,
    'GRAVING QC': 88,
    'QC': 90,
    'COM PKG': 95,
    'COM PKG AUTO': 96,
    'PKG': 100,
    'MB': 110
  };

  function getStageFlowRank(stage) {
    const u = String(stage || '').trim().toUpperCase();
    if (!u) return 999;
    if (STAGE_FLOW_ORDER[u] !== undefined) return STAGE_FLOW_ORDER[u];
    if (u.includes('SMD')) return 10;
    if (u.includes('LAQ')) return 22;
    if (u.includes('SELECTIV.PRE')) return 30;
    if (u.includes('SELECTIV.POST')) return 34;
    if (u.includes('SELECTIV')) return 32;
    if (u.includes('DIP')) return 36;
    if (u.includes('HARD TEST')) return 50;
    if (u.includes('ASSEMBLY')) return 60;
    if (u.includes('LONG TEST')) return 70;
    if (u.includes('TEST ROOM')) return 80;
    if (u.includes('QC')) return 90;
    if (u.includes('COM PKG')) return 95;
    if (u.includes('PKG')) return 100;
    if (u === 'MB') return 110;
    return 999;
  }

  function normalizeSfgName(str) {
    return String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function escapeWipHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractBomMaterialsForWipItem(rawSpecCode, fallbackMaterials) {
    let materials = fallbackMaterials;
    const rawCode = String(rawSpecCode || '').trim();
    let displaySpec = rawCode;
    if (rawCode && /^\d+$/.test(rawCode)) {
      displaySpec = rawCode.replace(/^0+/, '') || '0';
    }
    if ((!materials || materials.length === 0) && window.BOM_MASTER_DATA && (rawCode || displaySpec)) {
      const padCode = rawCode.padStart(9, '0');
      const b = window.BOM_MASTER_DATA[displaySpec] || window.BOM_MASTER_DATA[rawCode] || window.BOM_MASTER_DATA[padCode];
      if (b && b.materials) materials = b.materials;
    }
    return sortMaterialsSfgFirst(materials);
  }

  function getWipActiveDateSet(fromDate, toDate, curDate) {
    if (!window.AppStore || typeof window.AppStore.getDatesInRange !== 'function') return new Set();
    let dates = [];
    if (fromDate && toDate) {
      dates = window.AppStore.getDatesInRange(fromDate, toDate) || [];
      if (dates.length === 0 && fromDate === toDate && typeof window.AppStore.parseDate === 'function') {
        const t = window.AppStore.parseDate(fromDate).getTime();
        dates = (window.AppStore.getAllDates() || []).filter(d => window.AppStore.parseDate(d).getTime() === t);
      }
    } else if (curDate) {
      dates = window.AppStore.getDatesInRange(curDate, curDate) || [];
      if (dates.length === 0 && typeof window.AppStore.parseDate === 'function') {
        const t = window.AppStore.parseDate(curDate).getTime();
        dates = (window.AppStore.getAllDates() || []).filter(d => window.AppStore.parseDate(d).getTime() === t);
      }
    }
    return new Set(dates);
  }

  /**
   * Lập chỉ mục Plan / Fact / Gap theo (productName1C chuẩn hoá -> danh sách bucket từng Công Đoạn)
   * dùng chung cho cả cột Tra cứu SFG cạnh Catagory và tab Tra cứu SFG đa cấp.
   */
  function buildSfgDataMassLookup(dateSet) {
    const rawItems = (window.AppStore && window.AppStore.dataMass && Array.isArray(window.AppStore.dataMass.items))
      ? window.AppStore.dataMass.items
      : [];
    const bucketMap = new Map();

    rawItems.forEach(it => {
      const normName = normalizeSfgName(it.productName1C);
      const stage = String(it.stage || '').trim();
      if (!normName || !stage) return;

      let pQty = 0;
      let fQty = 0;
      if (it.plan) {
        for (const [d, v] of Object.entries(it.plan)) {
          if (!dateSet || dateSet.size === 0 || dateSet.has(d)) pQty += (Number(v) || 0);
        }
      }
      if (it.fact) {
        for (const [d, v] of Object.entries(it.fact)) {
          if (!dateSet || dateSet.size === 0 || dateSet.has(d)) fQty += (Number(v) || 0);
        }
      }

      const key = `${normName}|||${stage.toUpperCase()}`;
      let bucket = bucketMap.get(key);
      if (!bucket) {
        bucket = {
          stage,
          rank: getStageFlowRank(stage),
          normName,
          productName1C: String(it.productName1C || '').trim(),
          model: String(it.model || '').trim(),
          specCode: String(it.specCode || '').trim(),
          lastStep: String(it.lastStep || '').trim(),
          planQty: 0,
          factQty: 0,
          gapQty: 0,
          bomMaterials: []
        };
        bucketMap.set(key, bucket);
      }

      bucket.planQty += pQty;
      bucket.factQty += fQty;
      bucket.gapQty = bucket.factQty - bucket.planQty;

      // Ưu tiên giữ Spec Code & LastStep của dòng có kế hoạch/thực tế hoặc chưa có Spec Code
      const curSpec = String(it.specCode || '').trim();
      const mats = extractBomMaterialsForWipItem(curSpec, null);
      if ((pQty > 0 || fQty > 0 || bucket.bomMaterials.length === 0) && mats.length > 0) {
        bucket.specCode = curSpec || bucket.specCode;
        bucket.bomMaterials = mats;
      } else if (!bucket.specCode && curSpec) {
        bucket.specCode = curSpec;
      }
      if (!bucket.lastStep && it.lastStep) {
        bucket.lastStep = String(it.lastStep).trim();
      }
    });

    const byNormName = new Map();
    bucketMap.forEach(bucket => {
      if (bucket.bomMaterials.length === 0 && bucket.specCode) {
        bucket.bomMaterials = extractBomMaterialsForWipItem(bucket.specCode, null);
      }
      let arr = byNormName.get(bucket.normName);
      if (!arr) {
        arr = [];
        byNormName.set(bucket.normName, arr);
      }
      arr.push(bucket);
    });

    return byNormName;
  }

  function lastStepMatchesStage(lastStep, parentStage) {
    const ls = String(lastStep || '').trim().toUpperCase();
    const ps = String(parentStage || '').trim().toUpperCase();
    if (!ls || !ps) return false;
    if (ls === ps) return true;
    if ((ls === 'ASM' || ls === 'ASSEMBLY') && ps.includes('ASSEMBLY')) return true;
    if ((ls === 'HT' || ls === 'HRD' || ls.includes('HARD TEST')) && ps.includes('HARD TEST')) return true;
    if (ls === 'DIP' && ps === 'DIP') return true;
    if (ls === 'PKG' && ps === 'PKG') return true;
    return false;
  }

  /**
   * Truy xuất công đoạn ngay trước đó của 1 mã SFG (Ví dụ: Assembly -> Hardtest, Hardtest -> DIP)
   */
  function resolveUpstreamSfgEntry(sfgNomenclature, parentStage, sfgLookupIndex, parentProductName1C = '') {
    if (!sfgLookupIndex || !sfgNomenclature) return null;
    const targetNorm = normalizeSfgName(sfgNomenclature);
    if (!targetNorm) return null;

    const candidates = sfgLookupIndex.get(targetNorm);
    if (!candidates || candidates.length === 0) return null;

    const parentRank = getStageFlowRank(parentStage);
    const parentStageUp = String(parentStage || '').trim().toUpperCase();
    const parentNameNorm = normalizeSfgName(parentProductName1C);

    const nonSelf = candidates.filter(c => !(c.stage.toUpperCase() === parentStageUp && c.normName === parentNameNorm));
    if (nonSelf.length === 0) return null;

    const strictlyUpstream = nonSelf.filter(c => c.rank < parentRank);
    const pool = strictlyUpstream.length > 0
      ? strictlyUpstream
      : nonSelf.filter(c => c.rank <= parentRank);
    const activePool = pool.length > 0 ? pool : nonSelf;

    const sorted = [...activePool].sort((a, b) => {
      // Ưu tiên công đoạn gần nhất ngay trước công đoạn cha (VD: trước Hardtest -> chọn DIP trước DIP. Selectiv)
      if (b.rank !== a.rank) return b.rank - a.rank;
      const activeA = (a.planQty > 0 || a.factQty > 0) ? 1 : 0;
      const activeB = (b.planQty > 0 || b.factQty > 0) ? 1 : 0;
      if (activeB !== activeA) return activeB - activeA;
      const hintA = lastStepMatchesStage(a.lastStep, parentStage) ? 1 : 0;
      const hintB = lastStepMatchesStage(b.lastStep, parentStage) ? 1 : 0;
      return hintB - hintA;
    });

    const best = sorted[0];
    const otherStages = nonSelf.filter(c => c !== best);

    return {
      found: true,
      stage: best.stage,
      rank: best.rank,
      model: best.model,
      productName1C: best.productName1C,
      specCode: best.specCode,
      lastStep: best.lastStep,
      bomMaterials: best.bomMaterials || [],
      planQty: best.planQty,
      factQty: best.factQty,
      gapQty: best.gapQty,
      otherStages
    };
  }

  /**
   * Truy vết đa cấp toàn bộ chuỗi SFG phía trước cho 1 sản phẩm gốc (Cấp 0 -> Cấp 1 -> Cấp 2 -> ...)
   */
  function traceSfgUpstreamChain(rootItem, sfgLookupIndex, maxDepth = 6) {
    const chainRows = [];
    const rootMaterials = extractBomMaterialsForWipItem(rootItem.specCode || rootItem.rawSpecCode, rootItem.bomMaterials);
    const rootSfgMats = rootMaterials.filter(m => String(m.nomenclature || m.specSub || m.spec || '').trim().toLowerCase().startsWith('ajax'));

    const visited = new Set();
    const rootKey = `${String(rootItem.stage || '').toUpperCase()}|||${normalizeSfgName(rootItem.productName1C)}`;
    visited.add(rootKey);

    const walk = (materials, parentStage, parentName, depth, branchVisited) => {
      if (depth > maxDepth || !materials || materials.length === 0) return;
      const sfgMats = materials.filter(m => String(m.nomenclature || m.specSub || m.spec || '').trim().toLowerCase().startsWith('ajax'));
      sfgMats.forEach(mat => {
        const cleanNom = String(mat.nomenclature || mat.specSub || mat.spec || '').trim();
        const qtyVal = (mat.quantity !== undefined && mat.quantity !== null) ? mat.quantity : (mat.qty !== undefined && mat.qty !== null ? mat.qty : 1);
        const resolved = resolveUpstreamSfgEntry(cleanNom, parentStage, sfgLookupIndex, parentName);
        const childKey = resolved
          ? `${resolved.stage.toUpperCase()}|||${normalizeSfgName(resolved.productName1C)}`
          : `UNMATCHED|||${normalizeSfgName(cleanNom)}`;

        const isCycle = branchVisited.has(childKey);
        chainRows.push({
          depth,
          materialCode: mat.materialCode || '',
          nomenclature: cleanNom,
          qtyPerUnit: qtyVal,
          parentStage,
          resolved,
          isCycle
        });

        if (resolved && !isCycle && resolved.bomMaterials && resolved.bomMaterials.length > 0) {
          const nextVisited = new Set(branchVisited);
          nextVisited.add(childKey);
          walk(resolved.bomMaterials, resolved.stage, resolved.productName1C, depth + 1, nextVisited);
        }
      });
    };

    walk(rootSfgMats, rootItem.stage, rootItem.productName1C, 1, visited);
    return chainRows;
  }

  /**
   * Bật / Tắt mở rộng hiển thị từng cột kho trong nhóm Tồn Kho 1C
   */
  window.toggleWipStockWarehouse = function(whId) {
    if (!window.WipStore.activeStockWarehouses) {
      window.WipStore.activeStockWarehouses = ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
    }
    const idx = window.WipStore.activeStockWarehouses.indexOf(whId);
    if (idx !== -1) {
      if (window.WipStore.activeStockWarehouses.length <= 1) {
        if (window.showToast) window.showToast('warning', 'Cần giữ ít nhất 1 cột kho hiển thị!');
        return;
      }
      window.WipStore.activeStockWarehouses.splice(idx, 1);
    } else {
      window.WipStore.activeStockWarehouses.push(whId);
    }
    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}
    if (window.renderWipControlView) window.renderWipControlView('wipContainer');
  };

  /**
   * Bật toàn bộ tất cả các kho (bao gồm cả Hard Test) hoặc thu gọn về chỉ Tổng Kho
   */
  window.setAllWipStockWarehouses = function(enableAll = true) {
    if (enableAll) {
      window.WipStore.activeStockWarehouses = STOCK_WAREHOUSES_DEF.map(w => w.id);
    } else {
      window.WipStore.activeStockWarehouses = ['all'];
    }
    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}
    if (window.renderWipControlView) window.renderWipControlView('wipContainer');
  };

  function captureWipSearchFocus() {
    if (typeof document === 'undefined' || !document.activeElement) return null;
    const el = document.activeElement;
    if (el && (el.id === 'wipSearchInput' || el.id === 'wipSfgSearchInput')) {
      return {
        id: el.id,
        start: typeof el.selectionStart === 'number' ? el.selectionStart : (el.value || '').length,
        end: typeof el.selectionEnd === 'number' ? el.selectionEnd : (el.value || '').length
      };
    }
    return null;
  }

  function restoreWipSearchFocus(focusState) {
    if (!focusState || typeof document === 'undefined') return;
    const el = document.getElementById(focusState.id);
    if (el && typeof el.focus === 'function') {
      el.focus();
      try {
        if (typeof el.setSelectionRange === 'function') {
          el.setSelectionRange(focusState.start, focusState.end);
        }
      } catch (e) {}
    }
  }

  function renderWipSubtabSwitcherHtml(activeSubView) {
    const isTable = activeSubView !== 'SFG_LOOKUP';
    return `
      <div class="wip-subtab-bar" role="tablist" aria-label="Chế độ WIP Control">
        <button type="button"
          class="wip-subtab-btn ${isTable ? 'active' : ''}"
          onclick="window.setWipSubView('TABLE')"
          title="Bảng Kiểm Soát Tồn Kho 1C & BOM (kèm 4 cột Tra cứu SFG công đoạn trước cạnh Catagory)">
          <span>📦</span>
          <span>Bảng Kiểm Soát WIP &amp; BOM</span>
        </button>
        <button type="button"
          class="wip-subtab-btn is-sfg ${!isTable ? 'active' : ''}"
          onclick="window.setWipSubView('SFG_LOOKUP')"
          title="Tra cứu SFG đa cấp: xem Kế hoạch - Thực tế - Gap toàn chuỗi công đoạn trước (Assembly ➔ Hardtest ➔ DIP ➔ SMD)">
          <span>🔍</span>
          <span>Tra cứu SFG</span>
        </button>
      </div>
    `;
  }

  function renderWipDateRangeBoxHtml(curFromDate, curToDate) {
    return `
      <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: rgba(15, 23, 42, 0.4); padding: 0.35rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.3);">
        <span style="font-size: 0.75rem; font-weight: 800; color: #60a5fa; display: flex; align-items: center; gap: 0.25rem;">
          📅 Kế Hoạch:
        </span>
        <span style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600;">Từ</span>
        <input type="date"
          id="wipFromDate"
          class="select-filter font-mono font-bold"
          value="${curFromDate}"
          style="padding: 0.25rem 0.45rem; font-size: 0.775rem; min-width: 125px; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(15, 23, 42, 0.6); color: #f8fafc;"
          onchange="window.handleWipDateRangeChange()"
          title="Ngày bắt đầu khoảng kế hoạch">
        <span style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600;">Đến</span>
        <input type="date"
          id="wipToDate"
          class="select-filter font-mono font-bold"
          value="${curToDate}"
          style="padding: 0.25rem 0.45rem; font-size: 0.775rem; min-width: 125px; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(15, 23, 42, 0.6); color: #f8fafc;"
          onchange="window.handleWipDateRangeChange()"
          title="Ngày kết thúc khoảng kế hoạch (mốc kiểm kê tồn kho)">
        <button type="button"
          id="btnWipLoadData"
          class="btn btn-sm btn-primary"
          onclick="window.handleWipLoadData()"
          title="Tra cứu kế hoạch và tải lại dữ liệu tồn kho WIP theo khoảng ngày đã chọn"
          style="font-size: 0.75rem; padding: 0.3rem 0.7rem; font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: 1px solid rgba(59, 130, 246, 0.5); border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25); margin-left: 0.25rem;">
          <span id="wipLoadIcon" style="display: inline-block;">📥</span>
          <span id="wipLoadText">Tra Cứu</span>
        </button>
      </div>
    `;
  }

  /**
   * Thu thập dữ liệu cho phần mới "Tra cứu SFG" (Truy vết chuỗi công đoạn đa cấp)
   */
  function collectSfgLookupChains(curFromDate, curToDate, curDate) {
    const stageFilter = window.WipStore.sfgStageFilter || 'ALL';
    const gapFilter = window.WipStore.sfgGapFilter || 'HAS_GAP';
    const sortBy = window.WipStore.sfgSortBy || 'GAP_ASC';
    const search = window.WipStore.sfgSearch || '';

    const dataResult = window.AppStore.getWipControlData({
      stageFilter,
      modelFilter: 'ALL',
      lastStepFilter: 'ALL',
      statusFilter: 'ALL',
      gapFilter: 'ALL',
      sortBy: 'DEFAULT',
      search: '',
      fromDate: curFromDate,
      toDate: curToDate,
      date: curDate,
      pageIndex: 0,
      pageSize: 999999
    });

    const dateSet = getWipActiveDateSet(curFromDate, curToDate, curDate);
    const sfgLookupIndex = buildSfgDataMassLookup(dateSet);
    const searchLow = normalizeSfgName(search);

    const results = [];
    (dataResult.items || []).forEach(it => {
      const chain = traceSfgUpstreamChain(it, sfgLookupIndex, 6);
      if (chain.length === 0) return; // Chỉ lấy các Model có SFG trong BOM để truy vết chuỗi

      // Lọc theo GAP của Model gốc (Cấp 0)
      if (gapFilter === 'NEGATIVE' && it.gapQty >= 0) return;
      if (gapFilter === 'POSITIVE' && it.gapQty <= 0) return;
      if (gapFilter === 'ZERO' && it.gapQty !== 0) return;
      if (gapFilter === 'HAS_GAP' && it.gapQty === 0) return;

      // Tìm kiếm đồng thời trên Model gốc lẫn toàn bộ SFG trong chuỗi (VD: tìm tên Assembly hoặc mã Hardtest / DIP)
      if (searchLow) {
        const rootText = `${it.stage} ${it.model} ${it.productName1C} ${it.specCode} ${it.rawSpecCode}`;
        const chainText = chain.map(c => {
          const r = c.resolved;
          return `${c.materialCode} ${c.nomenclature} ${r ? `${r.stage} ${r.productName1C} ${r.specCode}` : ''}`;
        }).join(' ');
        if (!normalizeSfgName(`${rootText} ${chainText}`).includes(searchLow)) return;
      }

      const deficientSteps = chain.filter(c => c.resolved && c.resolved.gapQty < 0).length;
      const maxDepth = chain.reduce((mx, c) => Math.max(mx, c.depth), 0);
      results.push({ root: it, chain, deficientSteps, maxDepth });
    });

    if (sortBy === 'GAP_ASC') {
      results.sort((a, b) => a.root.gapQty - b.root.gapQty);
    } else if (sortBy === 'GAP_DESC') {
      results.sort((a, b) => b.root.gapQty - a.root.gapQty);
    } else if (sortBy === 'PLAN_DESC') {
      results.sort((a, b) => b.root.planQty - a.root.planQty);
    } else if (sortBy === 'DEPTH_DESC') {
      results.sort((a, b) => (b.maxDepth - a.maxDepth) || (a.root.gapQty - b.root.gapQty));
    }

    return { results, sfgLookupIndex, datesCount: dataResult.activeDates ? dataResult.activeDates.length : 7 };
  }

  /**
   * Render giao diện phần mới "Tra cứu SFG" trong Tab WIP Control
   */
  function renderSfgLookupView(container, curFromDate, curToDate, curDate) {
    saveWipStoreState();
    const existingTableWrap = container.querySelector('.table-container');
    const savedTableScrollTop = existingTableWrap ? existingTableWrap.scrollTop : 0;
    const savedTableScrollLeft = existingTableWrap ? existingTableWrap.scrollLeft : 0;
    const savedWindowScrollY = (typeof window !== 'undefined') ? window.scrollY : 0;
    const focusState = captureWipSearchFocus();
    const { results, datesCount } = collectSfgLookupChains(curFromDate, curToDate, curDate);
    const distinctStages = window.AppStore.getWipDistinctStages();
    const sfgStageFilter = window.WipStore.sfgStageFilter || 'ALL';
    const sfgGapFilter = window.WipStore.sfgGapFilter || 'HAS_GAP';
    const sfgSortBy = window.WipStore.sfgSortBy || 'GAP_ASC';
    const sfgSearch = window.WipStore.sfgSearch || '';

    const totalNegRoots = results.filter(r => r.root.gapQty < 0).length;
    const totalDeficientSfgSteps = results.reduce((sum, r) => sum + r.deficientSteps, 0);
    const maxChainDepth = results.reduce((mx, r) => Math.max(mx, r.maxDepth), 0);

    const rowsHtml = results.slice(0, 80).map((entry, idx) => {
      const it = entry.root;
      const stStyle = getStageBadgeStyle(it.stage);
      const rawCode = String(it.specCode || it.rawSpecCode || '').trim();
      const dispSpec = (rawCode && /^\d+$/.test(rawCode)) ? (rawCode.replace(/^0+/, '') || '0') : rawCode;
      const rootGapColor = it.gapQty < 0 ? '#f87171' : (it.gapQty > 0 ? '#34d399' : '#94a3b8');
      const rootStock = getMaterialStocksGroup(it.productName1C, it.specCode);

      const rootRow = `
        <tr class="wip-sfg-chain-root">
          <td style="text-align: center; font-weight: 800; color: #94a3b8; font-size: 0.775rem;">${idx + 1}</td>
          <td style="white-space: nowrap;">
            <span class="badge" style="background: rgba(56, 189, 248, 0.16); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 0.7rem; font-weight: 800;">
              Cấp 0 (Gốc)
            </span>
          </td>
          <td style="white-space: nowrap;">
            <span class="badge" style="background: ${stStyle.bg}; border: 1px solid ${stStyle.border}; color: ${stStyle.color}; font-weight: 800; font-size: 0.725rem;">
              ${stStyle.icon} ${escapeWipHtml(it.stage)}
            </span>
          </td>
          <td style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">
            <div>${escapeWipHtml(it.productName1C)}</div>
            <div style="font-size: 0.7rem; color: #38bdf8; margin-top: 0.12rem;">Group: ${escapeWipHtml(it.model || '—')}</div>
          </td>
          <td class="font-mono" style="white-space: nowrap; font-size: 0.75rem; color: #3b82f6; font-weight: 700;">
            ${escapeWipHtml(dispSpec || '—')}
          </td>
          <td class="font-mono" style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #2563eb; font-size: 0.825rem;">${it.planQty.toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: var(--text-primary); font-size: 0.825rem;">${it.factQty.toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${rootGapColor}; font-size: 0.825rem;">${it.gapQty > 0 ? '+' : ''}${it.gapQty.toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #10b981; font-size: 0.775rem;">${rootStock.all > 0 ? rootStock.all.toLocaleString('vi-VN') : '—'}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button type="button" class="btn btn-xs btn-secondary wip-sfg-action-btn is-back"
              onclick="window.openWipTableFromSfgChain(decodeURIComponent('${encodeURIComponent(it.stage || '')}'), decodeURIComponent('${encodeURIComponent(it.productName1C || '')}'))"
              title="Mở Model này trong Bảng Kiểm Soát WIP & BOM">
              📦 Bảng WIP
            </button>
          </td>
        </tr>
      `;

      const childRows = entry.chain.map(step => {
        const res = step.resolved;
        const depthClass = `is-depth-${Math.min(step.depth, 3)}`;
        const indentPx = Math.max(0, (step.depth - 1) * 14);
        const prefixArrow = `${'↳'.repeat(step.depth)} Cấp ${step.depth}`;
        const stInfo = getMaterialStocksGroup(step.nomenclature, step.materialCode);
        const stgStyle = res ? getStageBadgeStyle(res.stage) : { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', color: '#94a3b8', icon: '❓' };

        const childRawSpec = res ? String(res.specCode || '').trim() : '';
        const childSpec = (childRawSpec && /^\d+$/.test(childRawSpec)) ? (childRawSpec.replace(/^0+/, '') || '0') : childRawSpec;
        const planHtml = res ? res.planQty.toLocaleString('vi-VN') : '—';
        const factHtml = res ? res.factQty.toLocaleString('vi-VN') : '—';
        const gapVal = res ? res.gapQty : null;
        const gapHtml = res ? `${gapVal > 0 ? '+' : ''}${gapVal.toLocaleString('vi-VN')}` : '—';
        const gapColor = res ? (gapVal < 0 ? '#f87171' : (gapVal > 0 ? '#34d399' : '#94a3b8')) : '#64748b';
        const otherHint = (res && res.otherStages && res.otherStages.length > 0)
          ? ` • Cũng xuất hiện ở: ${res.otherStages.map(o => `${o.stage} (KH ${o.planQty.toLocaleString('vi-VN')} / TT ${o.factQty.toLocaleString('vi-VN')} / Gap ${o.gapQty.toLocaleString('vi-VN')})`).join(', ')}`
          : '';

        return `
          <tr class="wip-sfg-chain-child ${depthClass}">
            <td style="text-align: center; color: #64748b; font-size: 0.725rem;">•</td>
            <td style="white-space: nowrap;">
              <span class="badge wip-sfg-level-badge" style="margin-left: ${indentPx}px;">
                ${prefixArrow}
              </span>
            </td>
            <td style="white-space: nowrap;" title="${escapeWipHtml(res ? `Công đoạn trước của ${step.parentStage}${otherHint}` : 'Chưa có kế hoạch trong Data_Mass')}">
              ${res ? `
                <span class="badge" style="background: ${stgStyle.bg}; border: 1px solid ${stgStyle.border}; color: ${stgStyle.color}; font-weight: 800; font-size: 0.725rem;">
                  ${stgStyle.icon} ${escapeWipHtml(res.stage)}
                </span>
              ` : `
                <span class="badge" style="background: rgba(148,163,184,0.12); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); font-size: 0.7rem;">Chưa có ĐM</span>
              `}
            </td>
            <td class="wip-sfg-child-name" style="font-size: 0.785rem;">
              <div style="padding-left: ${indentPx}px;">
                <span>${escapeWipHtml(step.nomenclature)}</span>
                ${step.isCycle ? `<span class="badge" style="margin-left: 0.35rem; font-size: 0.65rem; background: rgba(148,163,184,0.2); color: var(--text-secondary);">Đã hiển thị ở trên</span>` : ''}
                ${otherHint ? `<div style="font-size: 0.675rem; color: var(--text-muted); font-weight: 500; margin-top: 0.15rem;">${escapeWipHtml(otherHint.replace(/^ • /, ''))}</div>` : ''}
              </div>
            </td>
            <td class="font-mono wip-sfg-child-mat" style="white-space: nowrap; font-size: 0.75rem;">
              <div>${escapeWipHtml(step.materialCode || '—')}</div>
              ${childSpec ? `<div style="font-size: 0.675rem; color: #3b82f6;">Spec: ${escapeWipHtml(childSpec)}</div>` : ''}
            </td>
            <td class="font-mono font-bold" style="text-align: right; color: #d97706; font-size: 0.785rem;">${step.qtyPerUnit}</td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: #2563eb; font-size: 0.825rem;">${planHtml}</td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: var(--text-primary); font-size: 0.825rem;">${factHtml}</td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: ${gapColor}; font-size: 0.825rem;">${gapHtml}</td>
            <td class="font-mono" style="text-align: right; font-weight: 700; color: #10b981; font-size: 0.775rem;" title="WH ASM: ${stInfo.whAssembly.toLocaleString('vi-VN')} | WH HT: ${stInfo.whHardTest.toLocaleString('vi-VN')}">
              ${stInfo.all > 0 ? stInfo.all.toLocaleString('vi-VN') : '—'}
            </td>
            <td style="text-align: center; white-space: nowrap;">
              ${res ? `
                <button type="button" class="btn btn-xs btn-secondary wip-sfg-action-btn is-stage"
                  onclick="window.openWipTableFromSfgChain(decodeURIComponent('${encodeURIComponent(res.stage)}'), decodeURIComponent('${encodeURIComponent(res.productName1C)}'))"
                  title="Xem dòng SFG này tại công đoạn ${escapeWipHtml(res.stage)} trong Bảng WIP">
                  📦 Xem ${escapeWipHtml(res.stage)}
                </button>
              ` : '—'}
            </td>
          </tr>
        `;
      }).join('');

      return rootRow + childRows;
    }).join('');

    container.innerHTML = `
      <div class="wip-control-root" style="display: flex; flex-direction: column; gap: 1.15rem;">
        <!-- 1. HEADER BANNER -->
        <div class="card-glass" style="padding: 1.15rem 1.5rem; border-radius: var(--radius-lg); border: 1px solid rgba(245, 158, 11, 0.35); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(30, 41, 59, 0.45) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="section-icon-badge" style="background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-size: 1.25rem;">
                  🔍
                </div>
                <div>
                  <h1 style="font-size: 1.35rem; font-weight: 800; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    TRA CỨU SFG — TRUY VẾT CÔNG ĐOẠN TRƯỚC
                    <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.45); font-size: 0.725rem;">
                      ĐA CẤP (ASSEMBLY ➔ HARDTEST ➔ DIP)
                    </span>
                  </h1>
                  <p style="font-size: 0.8rem; color: #94a3b8; margin: 0.2rem 0 0 0;">
                    Xem trực tiếp <strong>Kế Hoạch • Thực Tế • Gap</strong> của mã SFG ở từng công đoạn trước trong BOM (VD: <strong>Assembly</strong> ➔ <strong>Hardtest</strong> ➔ <strong>DIP</strong>)
                  </p>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem;">
              ${renderWipSubtabSwitcherHtml('SFG_LOOKUP')}
              <button type="button" class="btn btn-sm btn-primary" onclick="window.handleCopySfgChainForGoogleSheet()"
                style="background: linear-gradient(135deg, #d97706, #b45309); border-color: rgba(245, 158, 11, 0.55); color: #fff; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; font-size: 0.775rem;">
                <span>📋</span>
                <span>Copy Chuỗi SFG</span>
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.handleWipSfgReset()" style="padding: 0.35rem 0.75rem; font-size: 0.775rem;">
                <span>↺ Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 2. FILTER BAR -->
        <div class="card-glass" style="padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.85rem;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #c084fc;">🏭 Công Đoạn gốc:</span>
                <select id="wipSfgStageFilter" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipSfgStageChange(this.value)">
                  <option value="ALL" ${sfgStageFilter === 'ALL' ? 'selected' : ''}>Tất cả công đoạn</option>
                  ${distinctStages.map(st => `<option value="${escapeWipHtml(st)}" ${sfgStageFilter === st ? 'selected' : ''}>${escapeWipHtml(st)}</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #f87171;">⚖️ Chênh Lệch gốc:</span>
                <select id="wipSfgGapFilter" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipSfgGapChange(this.value)">
                  <option value="HAS_GAP" ${sfgGapFilter === 'HAS_GAP' ? 'selected' : ''}>⚡ Chỉ Mã Có GAP (≠ 0)</option>
                  <option value="NEGATIVE" ${sfgGapFilter === 'NEGATIVE' ? 'selected' : ''}>🔴 Model âm (&lt; 0)</option>
                  <option value="POSITIVE" ${sfgGapFilter === 'POSITIVE' ? 'selected' : ''}>🟢 Model dương (&gt; 0)</option>
                  <option value="ALL" ${sfgGapFilter === 'ALL' ? 'selected' : ''}>Tất cả (Kể cả = 0)</option>
                </select>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">🔃 Sắp Xếp:</span>
                <select id="wipSfgSortBy" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipSfgSortChange(this.value)">
                  <option value="GAP_ASC" ${sfgSortBy === 'GAP_ASC' ? 'selected' : ''}>🔴 Âm nhiều nhất lên đầu</option>
                  <option value="GAP_DESC" ${sfgSortBy === 'GAP_DESC' ? 'selected' : ''}>🟢 Dương nhiều nhất lên đầu</option>
                  <option value="PLAN_DESC" ${sfgSortBy === 'PLAN_DESC' ? 'selected' : ''}>📊 Kế hoạch cao nhất</option>
                  <option value="DEPTH_DESC" ${sfgSortBy === 'DEPTH_DESC' ? 'selected' : ''}>🧬 Chuỗi SFG sâu nhất</option>
                </select>
              </div>
              <div class="search-wrap" style="flex: 1; min-width: 240px; max-width: 420px;">
                <span class="search-icon">🔍</span>
                <input type="text" id="wipSfgSearchInput" class="input-search"
                  placeholder="Tìm Model, Mã SFG (VD: MotionProtect white EU, MP.002...)"
                  value="${escapeWipHtml(sfgSearch)}"
                  oninput="window.handleWipSfgSearch(this.value)">
              </div>
            </div>
            ${renderWipDateRangeBoxHtml(curFromDate, curToDate)}
          </div>
        </div>

        <!-- 3. KPI SUMMARY STRIP -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem;">
          <div class="card-glass" style="padding: 0.75rem 1rem; border-radius: var(--radius-md); border-left: 3px solid #38bdf8;">
            <div style="font-size: 0.725rem; color: #94a3b8; font-weight: 700;">MODEL CÓ CHUỖI SFG ĐANG LỌC</div>
            <div class="font-mono" style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin-top: 0.2rem;">${results.length.toLocaleString('vi-VN')} <span style="font-size: 0.75rem; color: #94a3b8;">Model (${datesCount} ngày)</span></div>
          </div>
          <div class="card-glass" style="padding: 0.75rem 1rem; border-radius: var(--radius-md); border-left: 3px solid #f87171;">
            <div style="font-size: 0.725rem; color: #94a3b8; font-weight: 700;">MODEL GỐC ĐANG ÂM / MẮT XÍCH SFG ÂM</div>
            <div class="font-mono" style="font-size: 1.25rem; font-weight: 800; color: #f87171; margin-top: 0.2rem;">${totalNegRoots.toLocaleString('vi-VN')} <span style="font-size: 0.75rem; color: #94a3b8;">Model gốc •</span> ${totalDeficientSfgSteps.toLocaleString('vi-VN')} <span style="font-size: 0.75rem; color: #94a3b8;">cấp SFG âm</span></div>
          </div>
          <div class="card-glass" style="padding: 0.75rem 1rem; border-radius: var(--radius-md); border-left: 3px solid #fbbf24;">
            <div style="font-size: 0.725rem; color: #94a3b8; font-weight: 700;">ĐỘ SÂU CHUỖI SFG TỐI ĐA</div>
            <div class="font-mono" style="font-size: 1.25rem; font-weight: 800; color: #fbbf24; margin-top: 0.2rem;">${maxChainDepth} <span style="font-size: 0.75rem; color: #94a3b8;">cấp công đoạn trước</span></div>
          </div>
        </div>

        <!-- 4. MULTI-LEVEL SFG TRACE TABLE -->
        <div class="card-glass" style="border-radius: var(--radius-md); border: 1px solid var(--border-glass); overflow: hidden;">
          <div class="table-container" style="max-height: 700px; overflow-y: auto;">
            <table class="datamass-table wip-sfg-chain-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center;">STT</th>
                  <th style="width: 120px; text-align: left;">Cấp Truy Vết</th>
                  <th style="width: 135px; text-align: left;">Công Đoạn</th>
                  <th style="min-width: 280px; text-align: left;">Model / Mã SFG (1C)</th>
                  <th style="width: 125px; text-align: left;">Mã NL / Spec</th>
                  <th style="width: 75px; text-align: right; color: #fbbf24;">Định Mức</th>
                  <th style="width: 95px; text-align: right; color: #60a5fa;">KẾ HOẠCH<br><span style="font-size: 0.65rem;">(PLAN)</span></th>
                  <th style="width: 95px; text-align: right; color: #34d399;">THỰC TẾ<br><span style="font-size: 0.65rem;">(FACT)</span></th>
                  <th style="width: 100px; text-align: right; color: #f87171;">CHÊNH LỆCH<br><span style="font-size: 0.65rem;">(GAP)</span></th>
                  <th style="width: 100px; text-align: right; color: #34d399;">TỔNG TỒN 1C</th>
                  <th style="width: 115px; text-align: center;">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                ${results.length === 0 ? `
                  <tr>
                    <td colspan="11" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                      <strong>Không tìm thấy chuỗi SFG nào phù hợp với bộ lọc hiện tại.</strong>
                      <div style="margin-top: 0.5rem; font-size: 0.8rem;">Thử chuyển bộ lọc Chênh Lệch sang <strong>Tất cả</strong> hoặc nhập từ khóa khác.</div>
                    </td>
                  </tr>
                ` : rowsHtml}
              </tbody>
            </table>
          </div>
          ${results.length > 80 ? `
            <div style="padding: 0.65rem 1.25rem; font-size: 0.775rem; color: #94a3b8; border-top: 1px solid var(--border-glass); background: var(--surface-card);">
              Đang hiển thị 80 chuỗi đầu tiên trong tổng số <strong>${results.length.toLocaleString('vi-VN')}</strong> chuỗi Model khớp bộ lọc. Nhập thêm từ khóa tìm kiếm để thu hẹp.
            </div>
          ` : ''}
        </div>
      </div>
    `;
    const newTableWrap = container.querySelector('.table-container');
    if (newTableWrap && (savedTableScrollTop > 0 || savedTableScrollLeft > 0)) {
      newTableWrap.scrollTop = savedTableScrollTop;
      newTableWrap.scrollLeft = savedTableScrollLeft;
    }
    if (savedWindowScrollY > 0) {
      window.scrollTo({ top: savedWindowScrollY, behavior: 'instant' });
    }
    restoreWipSearchFocus(focusState);
  }

  /**
   * Render chính toàn bộ Tab WIP Control
   */
  window.renderWipControlView = function(containerId = 'wipContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.AppStore || typeof window.AppStore.getWipControlData !== 'function') {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">⚠️</div>
          <h3>Đang khởi tạo dữ liệu WIP Control...</h3>
          <p style="color: var(--text-secondary);">Vui lòng chờ trong giây lát hoặc làm mới lại trang.</p>
        </div>
      `;
      return;
    }

    // Ngày kiểm kê tồn kho & khoảng kế hoạch (mặc định từ ngày đầu tuần Thứ 5 đến ngày hiện tại)
    const defaultRange = getDefaultWipDateRange();
    const curFromDate = window.WipStore.fromDate || defaultRange.fromDate;
    const curToDate = window.WipStore.toDate || defaultRange.toDate;
    const curDate = curToDate || window.WipStore.date || defaultRange.toDate;

    if (window.WipStore.activeSubView === 'SFG_LOOKUP') {
      renderSfgLookupView(container, curFromDate, curToDate, curDate);
      return;
    }

    saveWipStoreState();
    const existingTableWrap = container.querySelector('.table-container');
    const savedTableScrollTop = existingTableWrap ? existingTableWrap.scrollTop : 0;
    const savedTableScrollLeft = existingTableWrap ? existingTableWrap.scrollLeft : 0;
    const savedWindowScrollY = (typeof window !== 'undefined') ? window.scrollY : 0;
    const focusState = captureWipSearchFocus();
    const showSfgCols = window.WipStore.showSfgColumns !== false;
    const activeDateSet = getWipActiveDateSet(curFromDate, curToDate, curDate);
    const sfgLookupIndex = showSfgCols ? buildSfgDataMassLookup(activeDateSet) : null;

    const dataResult = window.AppStore.getWipControlData({
      stageFilter: window.WipStore.stageFilter,
      modelFilter: window.WipStore.modelFilter,
      lastStepFilter: window.WipStore.lastStepFilter,
      statusFilter: window.WipStore.statusFilter,
      gapFilter: window.WipStore.gapFilter || 'ALL',
      sortBy: window.WipStore.sortBy || 'DEFAULT',
      search: window.WipStore.search,
      fromDate: curFromDate,
      toDate: curToDate,
      date: curDate,
      pageIndex: window.WipStore.pageIndex,
      pageSize: window.WipStore.pageSize
    });

    const activeWhKeys = window.WipStore.activeStockWarehouses || ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
    const activeWhList = STOCK_WAREHOUSES_DEF.filter(w => activeWhKeys.includes(w.id));
    const totalCols = 9 + 4 + (showSfgCols ? 4 : 0) + activeWhList.length;

    const distinctStages = window.AppStore.getWipDistinctStages();
    const distinctModels = window.AppStore.getWipDistinctModels(window.WipStore.stageFilter);
    const distinctLastSteps = window.AppStore.getWipDistinctLastSteps(window.WipStore.stageFilter);

    const isStageSelected = (st) => {
      if (!window.WipStore.stageFilter || window.WipStore.stageFilter === 'ALL') return true;
      if (Array.isArray(window.WipStore.stageFilter)) {
        return window.WipStore.stageFilter.includes('ALL') || window.WipStore.stageFilter.includes(st);
      }
      return window.WipStore.stageFilter === st;
    };

    const getSelectedStageList = () => {
      if (!window.WipStore.stageFilter || window.WipStore.stageFilter === 'ALL') return distinctStages;
      if (Array.isArray(window.WipStore.stageFilter)) {
        if (window.WipStore.stageFilter.includes('ALL')) return distinctStages;
        return window.WipStore.stageFilter;
      }
      return [window.WipStore.stageFilter];
    };

    const selectedStagesList = getSelectedStageList();
    const isAllStagesSelected = (!window.WipStore.stageFilter || window.WipStore.stageFilter === 'ALL' || selectedStagesList.length === distinctStages.length);

    let stageTriggerLabelHtml = '';
    if (isAllStagesSelected) {
      stageTriggerLabelHtml = `<span>🏭 Tất cả Công Đoạn (${distinctStages.length})</span>`;
    } else if (selectedStagesList.length === 0) {
      stageTriggerLabelHtml = `<span style="color: #94a3b8;">⚠️ Chưa chọn công đoạn (0/${distinctStages.length})</span>`;
    } else if (selectedStagesList.length === 1) {
      const st = selectedStagesList[0];
      const stStyle = getStageBadgeStyle(st);
      stageTriggerLabelHtml = `<span class="badge" style="background: ${stStyle.bg}; border: 1px solid ${stStyle.border}; color: ${stStyle.color}; font-size: 0.75rem; padding: 0.15rem 0.45rem;">${stStyle.icon} ${st}</span>`;
    } else {
      stageTriggerLabelHtml = `<span class="badge badge-purple" style="font-size: 0.75rem; font-weight: 800; padding: 0.15rem 0.5rem;">🏭 Đã chọn ${selectedStagesList.length} / ${distinctStages.length} Công Đoạn</span>`;
    }

    const stageCheckboxItems = distinctStages.map(st => {
      const isChecked = isStageSelected(st);
      const stStyle = getStageBadgeStyle(st);
      return `
        <label class="wip-stage-option-row" data-stage="${st.toLowerCase()}" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s ease; user-select: none; background: ${isChecked ? 'rgba(168, 85, 247, 0.12)' : 'transparent'};">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" class="wip-stage-checkbox" value="${st}" ${isChecked ? 'checked' : ''} onchange="window.handleWipStageToggle('${st}', this.checked, event)" style="cursor: pointer; width: 15px; height: 15px; accent-color: #a855f7;">
            <span class="badge" style="background: ${stStyle.bg}; border: 1px solid ${stStyle.border}; color: ${stStyle.color}; font-size: 0.725rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
              <span>${stStyle.icon}</span>
              <span>${st}</span>
            </span>
          </div>
        </label>
      `;
    }).join('');

    // Checkbox list cho bộ lọc kho hiển thị (Tối giản thông tin theo yêu cầu Ảnh số 2)
    const warehouseCheckboxItems = STOCK_WAREHOUSES_DEF.map(w => {
      const isChecked = activeWhKeys.includes(w.id);
      return `
        <label class="wip-wh-option-row" data-wh="${w.label.toLowerCase()} ${w.shortName.toLowerCase()}" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.45rem 0.65rem; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease; user-select: none; background: ${isChecked ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.02)'}; border: 1px solid ${isChecked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.06)'};">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <input type="checkbox" class="wip-wh-checkbox" value="${w.id}" ${isChecked ? 'checked' : ''} onchange="window.handleWipWarehouseToggle('${w.id}', this.checked, event)" style="cursor: pointer; width: 16px; height: 16px; accent-color: #10b981;">
            <span style="font-size: 0.8rem; font-weight: 700; color: ${isChecked ? w.color : '#cbd5e1'}; display: inline-flex; align-items: center; gap: 0.4rem;">
              <span style="font-size: 0.95rem;">${w.icon}</span>
              <span>${w.label}</span>
            </span>
          </div>
          <span class="badge" style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); color: #94a3b8; font-size: 0.675rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 4px;">
            ${w.shortName.replace(/^[^\w\s]+\s*/, '')}
          </span>
        </label>
      `;
    }).join('');

    const stats = dataResult.stats;
    const items = dataResult.items;
    const datesCount = dataResult.activeDates ? dataResult.activeDates.length : 7;

    // Build HTML Layout
    let html = `
      <div class="wip-control-root" style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- ========================================== -->
        <!-- 1. HEADER BANNER                           -->
        <!-- ========================================== -->
        <div class="card-glass" style="padding: 1.15rem 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-glass); background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(30, 41, 59, 0.4) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="section-icon-badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 1.25rem;">
                  📦
                </div>
                <div>
                  <h1 style="font-size: 1.35rem; font-weight: 800; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    KIỂM SOÁT TỒN KHO 1C THEO NGÀY (WIP CONTROL)
                    <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.725rem;">
                      SHEET INVENTORY 1C
                    </span>
                  </h1>
                  <p style="font-size: 0.8rem; color: #94a3b8; margin: 0.2rem 0 0 0;">
                    Lấy dữ liệu WIP từ Sheet <strong>Inventory 1C</strong> &amp; Định mức Sheet <strong>BOM</strong>: <strong>Công Đoạn</strong> • <strong>Group Model</strong> • <strong>Product Name 1C</strong> • <strong>Specification Code (0000...)</strong> • <strong>BOM Nguyên Liệu</strong> • <strong>Stock 1C</strong>
                  </p>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <!-- Chuyển nhanh Bảng WIP & phần mới Tra cứu SFG -->
              ${renderWipSubtabSwitcherHtml('TABLE')}

              <!-- Bật/tắt 4 cột Tra cứu SFG cạnh Catagory -->
              <button type="button"
                id="btnToggleWipSfgCols"
                class="btn btn-sm"
                onclick="window.toggleWipSfgColumns()"
                title="Bật / Tắt 4 cột Tra cứu SFG (Công đoạn trước, Kế hoạch, Thực tế, Gap) ngay cạnh cột Catagory"
                style="padding: 0.35rem 0.75rem; font-size: 0.775rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; ${showSfgCols ? 'background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.55); color: #fde047;' : 'background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8;'}">
                <span>🔍</span>
                <span>Cột Tra cứu SFG: ${showSfgCols ? 'Bật' : 'Tắt'}</span>
              </button>

              <!-- Nút Copy cho Google Sheet -->
              <button type="button" 
                id="btnWipCopyGoogleSheet"
                class="btn btn-sm btn-primary" 
                onclick="window.handleCopyForGoogleSheet()" 
                title="Sao chép toàn bộ bảng dữ liệu WIP ra Clipboard theo định dạng TSV để dán trực tiếp (Ctrl+V / Cmd+V) vào Google Sheets"
                style="background: linear-gradient(135deg, #059669, #047857); border-color: rgba(16, 185, 129, 0.5); color: #fff; font-weight: 700; box-shadow: 0 2px 5px rgba(5, 150, 105, 0.25); display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; font-size: 0.775rem;">
                <span>📋</span>
                <span>Copy cho Google Sheet</span>
              </button>

              <!-- Nút Xuất File Google Sheet -->
              <button type="button" 
                id="btnWipExportGoogleSheet"
                class="btn btn-sm btn-secondary" 
                onclick="window.handleExportWipGoogleSheet()" 
                title="Tải xuống toàn bộ bảng dữ liệu WIP (kèm Specification Code) ra file CSV chuẩn UTF-8 để Import vào Google Sheets hoặc Excel"
                style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.8rem; font-size: 0.775rem; font-weight: 600;">
                <span>📊</span>
                <span>Xuất File Google Sheet</span>
              </button>

              <!-- Nút Đặt lại bộ lọc -->
              <button type="button" 
                class="btn btn-sm btn-secondary" 
                onclick="window.handleResetWipFilters()" 
                title="Khôi phục toàn bộ bộ lọc về mặc định"
                style="padding: 0.35rem 0.75rem; font-size: 0.775rem;">
                <span>↺ Đặt lại bộ lọc</span>
              </button>

              <!-- Phân Nhóm Nút Lọc Nhanh Kho 1C (Tất cả kho / WH ASSEMBLY_VTP / PKG_VTP / Repair semi-finished / Repair of board) -->
              <div style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.45rem; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: var(--radius-sm); margin-left: 0.35rem; flex-wrap: wrap;">
                <span style="font-size: 0.725rem; font-weight: 800; color: #34d399; margin-right: 0.2rem;">📦 Kho 1C:</span>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('ALL')" 
                  class="btn btn-xs" 
                  title="Xem tổng tồn cuối của tất cả các kho"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'ALL' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  Tất cả kho
                </button>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('WH ASSEMBLY_VTP')" 
                  class="btn btn-xs" 
                  title="Chỉ xem tồn cuối của kho WH ASSEMBLY_VTP"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'WH ASSEMBLY_VTP' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  🏭 WH ASSEMBLY_VTP
                </button>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('PKG_VTP')" 
                  class="btn btn-xs" 
                  title="Chỉ xem tồn cuối của kho PKG_VTP"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'PKG_VTP' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  📦 PKG_VTP
                </button>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('Repair of semi-finished products_VTP')" 
                  class="btn btn-xs" 
                  title="Chỉ xem tồn cuối của kho Repair of semi-finished products_VTP (Bán thành phẩm sửa chữa)"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'Repair of semi-finished products_VTP' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  🔧 Repair Semi-FG
                </button>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('Repair of board_VTP')" 
                  class="btn btn-xs" 
                  title="Chỉ xem tồn cuối của kho Repair of board_VTP (Bo mạch sửa chữa)"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'Repair of board_VTP' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  📟 Repair Board
                </button>
                <button type="button" 
                  onclick="window.handleWipWarehouseChange('WH of Hard Test_VTP')" 
                  class="btn btn-xs" 
                  title="Chỉ xem tồn cuối của kho WH of Hard Test_VTP (Khu vực Hard Test)"
                  style="font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; ${window.WipStore.warehouseFilter === 'WH of Hard Test_VTP' ? 'background: #059669; color: #fff; border: 1px solid #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);' : 'background: rgba(30, 41, 59, 0.6); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);'}">
                  ⚡ WH Hard Test
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 2. FILTER CONTROLS TOOLBAR                 -->
        <!-- ========================================== -->
        <div class="card-glass" style="padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <!-- Row 1: Dropdown Filters -->
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
              <!-- 1. Multi-Select Stage Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem; position: relative;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #c084fc;">🏭 Công Đoạn:</span>
                
                <div class="stage-multiselect-container" id="wipStageMultiSelectContainer" style="position: relative; display: inline-block;">
                  <button type="button" 
                    id="wipStageMultiSelectTrigger" 
                    class="stage-multiselect-trigger" 
                    onclick="window.toggleWipStageMultiSelect(event)" 
                    title="Nhấn để chọn 1 hoặc nhiều công đoạn kiểm soát tồn kho" 
                    style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.35rem 0.65rem; min-width: 210px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: var(--radius-sm); color: #f8fafc; font-size: 0.775rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">
                    <span id="wipStageMultiSelectLabel" style="display: flex; align-items: center; gap: 0.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                      ${stageTriggerLabelHtml}
                    </span>
                    <span style="font-size: 0.65rem; color: #c084fc;">▼</span>
                  </button>

                  <!-- Popover Menu -->
                  <div id="wipStageMultiSelectMenu" class="stage-multiselect-menu" onclick="event.stopPropagation()" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; z-index: 1000; width: 350px; max-width: 90vw; background: #0f172a; border: 1px solid rgba(168, 85, 247, 0.5); border-radius: var(--radius-md); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6); padding: 0.75rem; backdrop-filter: blur(12px);">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                      <span style="font-size: 0.775rem; font-weight: 800; color: #c4b5fd; display: flex; align-items: center; gap: 0.35rem;">
                        🏭 BỘ LỌC CÔNG ĐOẠN (${distinctStages.length})
                      </span>
                      <div style="display: flex; gap: 0.3rem;">
                        <button type="button" class="btn btn-xs btn-outline" onclick="window.handleWipStageSelectAll(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); color: #d8b4fe; border-radius: 3px; cursor: pointer;">✓ Chọn Hết</button>
                        <button type="button" class="btn btn-xs btn-outline" onclick="window.handleWipStageClearAll(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #94a3b8; border-radius: 3px; cursor: pointer;">✗ Bỏ Chọn</button>
                        <button type="button" class="btn btn-xs btn-outline" onclick="window.closeWipStageMultiSelect(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; border-radius: 3px; cursor: pointer;">✕</button>
                      </div>
                    </div>

                    <!-- Quick Search input inside stage popover -->
                    <div style="margin-bottom: 0.5rem; position: relative;">
                      <input type="text" id="wipStageSearchInput" placeholder="Tìm nhanh công đoạn..." oninput="window.filterWipStageList(this.value)" style="width: 100%; box-sizing: border-box; padding: 0.3rem 0.6rem; font-size: 0.75rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: var(--radius-sm); color: #f8fafc;">
                    </div>

                    <!-- Quick Bundle Shortcuts -->
                    <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.65rem; padding-bottom: 0.5rem; border-bottom: 1px dashed rgba(255, 255, 255, 0.1);">
                      <button type="button" onclick="window.setWipStageBundle(['ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'], event)" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd; border-radius: 3px; cursor: pointer;" title="Chọn nhóm SFPD: Assembly, Hard Test, Optics, A Imp, Focus">
                        ⭐ Cụm SFPD (5 c/đ)
                      </button>
                      <button type="button" onclick="window.setWipStageBundle(['LONG TEST', 'TEST ROOM', 'QC', 'PKG'], event)" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); color: #fde68a; border-radius: 3px; cursor: pointer;" title="Chọn nhóm FPD: Long Test, Test Room, QC, PKG">
                        📦 Cụm FPD (4 c/đ)
                      </button>
                      <button type="button" onclick="window.setWipStageBundle(['COM PKG', 'COM PKG AUTO', 'MB'], event)" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: rgba(6, 182, 212, 0.2); border: 1px solid rgba(6, 182, 212, 0.4); color: #a5f3fc; border-radius: 3px; cursor: pointer;" title="Chọn nhóm Masterbox: COM PKG, COM PKG AUTO, MB">
                        💻 MasterBox (3 c/đ)
                      </button>
                      <button type="button" onclick="window.setWipStageBundle(['SMD', 'DIP', 'DIP. Selectiv', 'DIP. Selectiv.post', 'DIP. Selectiv.pre'], event)" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd; border-radius: 3px; cursor: pointer;" title="Chọn nhóm Bo Mạch: SMD & DIP">
                        ⚡ SMD &amp; DIP
                      </button>
                    </div>

                    <!-- Scrollable Checkbox List -->
                    <div id="wipStageItemsList" style="max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem;">
                      ${stageCheckboxItems}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Group Model Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">📋 Group Model:</span>
                <select id="wipModelFilter" class="select-filter font-bold" style="min-width: 170px; padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipModelChange(this.value)">
                  <option value="ALL">Tất cả Model (${distinctModels.length})</option>
                  ${distinctModels.map(m => `<option value="${m}" ${m === window.WipStore.modelFilter ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>

              <!-- Last Step Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #fbbf24;">🔄 Last Step:</span>
                <select id="wipLastStepFilter" class="select-filter font-bold" style="min-width: 160px; padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipLastStepChange(this.value)">
                  <option value="ALL">Tất cả Last Step</option>
                  <option value="__EMPTY__" ${window.WipStore.lastStepFilter === '__EMPTY__' ? 'selected' : ''}>-- Chưa gán Last Step --</option>
                  ${distinctLastSteps.map(ls => `<option value="${ls}" ${ls === window.WipStore.lastStepFilter ? 'selected' : ''}>${ls}</option>`).join('')}
                </select>
              </div>

              <!-- Status Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #34d399;">🏷️ Trạng Thái:</span>
                <select id="wipStatusFilter" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipStatusChange(this.value)">
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="COMPLETED" ${window.WipStore.statusFilter === 'COMPLETED' ? 'selected' : ''}>✓ Đạt Kế Hoạch</option>
                  <option value="IN_PROGRESS" ${window.WipStore.statusFilter === 'IN_PROGRESS' ? 'selected' : ''}>⏳ Đang Chạy (Còn Thiếu)</option>
                  <option value="PENDING" ${window.WipStore.statusFilter === 'PENDING' ? 'selected' : ''}>⌛ Chờ Sản Xuất</option>
                  <option value="UNPLANNED" ${window.WipStore.statusFilter === 'UNPLANNED' ? 'selected' : ''}>+ Phát Sinh Ngoài KH</option>
                </select>
              </div>

              <!-- Gap Filter (< 0, All, > 0, = 0, HAS_GAP) -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #f87171;">⚖️ Chênh Lệch:</span>
                <select id="wipGapFilter" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem; border-color: ${window.WipStore.gapFilter === 'HAS_GAP' || window.WipStore.gapFilter === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.6)' : 'var(--border-glass)'}; background: ${window.WipStore.gapFilter === 'HAS_GAP' || window.WipStore.gapFilter === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-card)'};" onchange="window.handleWipGapFilterChange(this.value)">
                  <option value="HAS_GAP" ${window.WipStore.gapFilter === 'HAS_GAP' ? 'selected' : ''}>⚡ Chỉ Mã Có GAP (≠ 0)</option>
                  <option value="ALL" ${window.WipStore.gapFilter === 'ALL' ? 'selected' : ''}>Tất cả (Kể cả = 0)</option>
                  <option value="NEGATIVE" ${window.WipStore.gapFilter === 'NEGATIVE' ? 'selected' : ''}>🔴 Model âm (&lt; 0) - Thiếu Hụt</option>
                  <option value="POSITIVE" ${window.WipStore.gapFilter === 'POSITIVE' ? 'selected' : ''}>🟢 Model dương (&gt; 0) - Vượt KH</option>
                  <option value="ZERO" ${window.WipStore.gapFilter === 'ZERO' ? 'selected' : ''}>⚪ Cân đối (= 0)</option>
                </select>
              </div>

              <!-- Sort By Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">🔃 Sắp Xếp:</span>
                <select id="wipSortBy" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem;" onchange="window.handleWipSortChange(this.value)">
                  <option value="DEFAULT" ${window.WipStore.sortBy === 'DEFAULT' ? 'selected' : ''}>Mặc định danh mục</option>
                  <option value="GAP_ASC" ${window.WipStore.sortBy === 'GAP_ASC' ? 'selected' : ''}>🔴 Âm nhiều nhất lên đầu</option>
                  <option value="GAP_DESC" ${window.WipStore.sortBy === 'GAP_DESC' ? 'selected' : ''}>🟢 Dương nhiều nhất lên đầu</option>
                  <option value="PLAN_DESC" ${window.WipStore.sortBy === 'PLAN_DESC' ? 'selected' : ''}>📊 Kế hoạch cao nhất</option>
                  <option value="STOCK_DESC" ${window.WipStore.sortBy === 'STOCK_DESC' ? 'selected' : ''}>📦 Tồn kho 1C cao nhất</option>
                </select>
              </div>

              <!-- Warehouse 1C Filter (Tách theo từng kho trong sheet Inventory 1C) -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #34d399;">📦 Kho 1C:</span>
                <select id="wipWarehouseFilter" class="select-filter font-bold" style="padding: 0.3rem 0.55rem; font-size: 0.775rem; border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1); color: #34d399;" onchange="window.handleWipWarehouseChange(this.value)" title="Chọn kho để tra cứu tồn kho Final Balance từ Sheet Inventory 1C">
                  <option value="ALL" ${window.WipStore.warehouseFilter === 'ALL' ? 'selected' : ''}>📦 Tất cả kho (Tổng hợp)</option>
                  <option value="WH ASSEMBLY_VTP" ${window.WipStore.warehouseFilter === 'WH ASSEMBLY_VTP' ? 'selected' : ''}>🏭 WH ASSEMBLY_VTP</option>
                  <option value="PKG_VTP" ${window.WipStore.warehouseFilter === 'PKG_VTP' ? 'selected' : ''}>📦 PKG_VTP</option>
                  <option value="Repair of semi-finished products_VTP" ${window.WipStore.warehouseFilter === 'Repair of semi-finished products_VTP' ? 'selected' : ''}>🔧 Repair of semi-finished products_VTP</option>
                  <option value="Repair of board_VTP" ${window.WipStore.warehouseFilter === 'Repair of board_VTP' ? 'selected' : ''}>📟 Repair of board_VTP</option>
                  <option value="WH of Hard Test_VTP" ${window.WipStore.warehouseFilter === 'WH of Hard Test_VTP' ? 'selected' : ''}>⚡ WH of Hard Test_VTP</option>
                </select>
              </div>
            </div>

            <!-- Row 2: Search, Quick Filter Buttons & Date Range Query Tool -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.85rem;">
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; flex: 1; max-width: 620px;">
                <div class="search-wrap" style="flex: 1; min-width: 240px;">
                  <span class="search-icon">🔍</span>
                  <input type="text" id="wipSearchInput" class="input-search" placeholder="Tìm theo Tên 1C, Model, Norm Key, Công Đoạn..." value="${window.WipStore.search}" oninput="window.handleWipSearch(this.value)">
                </div>

                <!-- Quick Filter Pill: Model < 0 -->
                <button type="button" 
                  class="btn btn-sm" 
                  onclick="window.toggleWipNegativeGapFilter()" 
                  style="font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid ${window.WipStore.gapFilter === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.3)'}; background: ${window.WipStore.gapFilter === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.08)'}; color: #fca5a5; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; transition: all 0.2s ease;"
                  title="Bật/Tắt nhanh chế độ chỉ hiển thị các model âm (< 0) và sắp xếp âm nhiều nhất lên đầu">
                  <span>🔥</span>
                  <span>${window.WipStore.gapFilter === 'NEGATIVE' ? 'Đang lọc: Model < 0' : 'Lọc nhanh: Model < 0'}</span>
                </button>
              </div>

              <!-- Date Range Tool: Từ ngày -> Đến ngày -->
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: rgba(15, 23, 42, 0.4); padding: 0.35rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.3);">
                <span style="font-size: 0.75rem; font-weight: 800; color: #60a5fa; display: flex; align-items: center; gap: 0.25rem;">
                  📅 Kế Hoạch:
                </span>
                <span style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600;">Từ</span>
                <input type="date" 
                  id="wipFromDate" 
                  class="select-filter font-mono font-bold" 
                  value="${curFromDate}" 
                  style="padding: 0.25rem 0.45rem; font-size: 0.775rem; min-width: 125px; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(15, 23, 42, 0.6); color: #f8fafc;" 
                  onchange="window.handleWipDateRangeChange()" 
                  title="Ngày bắt đầu khoảng kế hoạch">
                <span style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600;">Đến</span>
                <input type="date" 
                  id="wipToDate" 
                  class="select-filter font-mono font-bold" 
                  value="${curToDate}" 
                  style="padding: 0.25rem 0.45rem; font-size: 0.775rem; min-width: 125px; border-radius: var(--radius-sm); border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(15, 23, 42, 0.6); color: #f8fafc;" 
                  onchange="window.handleWipDateRangeChange()" 
                  title="Ngày kết thúc khoảng kế hoạch (mốc kiểm kê tồn kho)">


                <button type="button" 
                  id="btnWipLoadData" 
                  class="btn btn-sm btn-primary" 
                  onclick="window.handleWipLoadData()" 
                  title="Tra cứu kế hoạch và tải lại dữ liệu tồn kho WIP theo khoảng ngày đã chọn" 
                  style="font-size: 0.75rem; padding: 0.3rem 0.7rem; font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: 1px solid rgba(59, 130, 246, 0.5); border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25); margin-left: 0.25rem;">
                  <span id="wipLoadIcon" style="display: inline-block;">📥</span>
                  <span id="wipLoadText">Tra Cứu</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 3. WIP DATA TABLE WITH STOCK 1C            -->
        <!-- ========================================== -->
        <div class="card-glass" style="border-radius: var(--radius-md); border: 1px solid var(--border-glass); overflow: hidden;">
          <div class="table-container" style="max-height: 720px; overflow-y: auto;">
            <table class="datamass-table wip-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
              <thead>
                <tr class="wip-header-group-row">
                  <th rowspan="2" class="sticky-col-1" style="width: 45px; text-align: center;">STT</th>
                  <th rowspan="2" class="sticky-col-2" style="width: 110px; text-align: left;">Công Đoạn</th>
                  <th rowspan="2" style="width: 125px; text-align: left;">Group Model</th>
                  <th rowspan="2" style="width: 260px; text-align: left;">Model (Mã 1C)</th>
                  <th rowspan="2" style="width: 95px; text-align: right; color: #60a5fa;" title="Kế hoạch sản xuất (${datesCount} ng)">
                    KẾ HOẠCH<br><span style="font-size: 0.65rem; font-weight: 600;">(PLAN)</span>
                  </th>
                  <th rowspan="2" style="width: 95px; text-align: right; color: #34d399;" title="Thực tế sản xuất (${datesCount} ng)">
                    THỰC TẾ<br><span style="font-size: 0.65rem; font-weight: 600;">(FACT)</span>
                  </th>
                  <th rowspan="2" style="width: 105px; text-align: right; cursor: pointer; user-select: none;" onclick="window.toggleWipGapSort()" title="Bấm để đảo chiều sắp xếp chênh lệch (Âm nhiều nhất ➔ Dương nhiều nhất ➔ Mặc định)">
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem;">
                      <span style="color: ${window.WipStore.sortBy === 'GAP_ASC' ? '#f87171' : (window.WipStore.sortBy === 'GAP_DESC' ? '#34d399' : '#f8fafc')};">
                        CHÊNH LỆCH<br><span style="font-size: 0.65rem; font-weight: 600;">(GAP)</span>
                      </span>
                      <span style="font-size: 0.75rem;">
                        ${window.WipStore.sortBy === 'GAP_ASC' ? '▲' : (window.WipStore.sortBy === 'GAP_DESC' ? '▼' : '↕')}
                      </span>
                    </div>
                  </th>
                  <th rowspan="2" style="width: 125px; text-align: left; background: rgba(59, 130, 246, 0.04);">Specification Code</th>
                  <th rowspan="2" style="width: 80px; text-align: center; background: rgba(245, 158, 11, 0.04); color: #fbbf24;">Last Step</th>
                  <!-- 4 CỘT DỮ LIỆU BOM TỪ SHEET BOM-PLAN -->
                  <th rowspan="2" style="width: 115px; text-align: left; background: rgba(245, 158, 11, 0.05); color: #fbbf24;">Material_Code</th>
                  <th rowspan="2" style="width: 290px; text-align: left; background: rgba(245, 158, 11, 0.05); color: #fbbf24;">Nomenclature</th>
                  <th rowspan="2" style="width: 70px; text-align: right; background: rgba(245, 158, 11, 0.05); color: #fbbf24;">Quantity</th>
                  <th rowspan="2" style="width: 80px; text-align: center; background: rgba(245, 158, 11, 0.05); color: #fbbf24;">Catagory</th>
                  ${showSfgCols ? `
                    <!-- NHÓM CỘT MỚI: TRA CỨU SFG NGAY BÊN CẠNH CỘT CATAGORY -->
                    <th colspan="4" class="wip-sfg-group-header" style="text-align: center; background: #1f1708 !important; color: #fbbf24; font-weight: 800; font-size: 0.775rem; border-left: 2px solid #f59e0b; border-bottom: 1px solid rgba(245, 158, 11, 0.45); padding: 0.35rem 0.65rem; letter-spacing: 0.03em; position: sticky !important; top: 0 !important; z-index: 30 !important; height: 42px; box-sizing: border-box;">
                      <span>🔍 TRA CỨU SFG (CÔNG ĐOẠN TRƯỚC)</span>
                    </th>
                  ` : ''}
                  <!-- NHÓM CỘT TỒN KHO 1C GROUP THEO CÁC KHO ĐƯỢC CHỌN HIỂN THỊ (ĐÓNG BĂNG TIÊU ĐỀ CHUẨN XÁC) -->
                  <th colspan="${activeWhList.length}" class="wip-stock-group-header" style="text-align: center; background: #0c182a !important; color: #34d399; font-weight: 800; font-size: 0.775rem; border-left: 2px solid #10b981; border-bottom: 1px solid rgba(16, 185, 129, 0.4); padding: 0.35rem 0.65rem; letter-spacing: 0.03em; position: sticky !important; top: 0 !important; z-index: 30 !important; height: 42px; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 0.45rem;">
                        <span style="font-size: 0.8rem; font-weight: 800;">📦 TỒN KHO 1C THEO KHO (STOCK 1C GROUP)</span>
                        <span style="font-size: 0.675rem; font-weight: 800; background: rgba(16, 185, 129, 0.25); color: #a7f3d0; padding: 0.1rem 0.45rem; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">
                          ${activeWhList.length}/${STOCK_WAREHOUSES_DEF.length} kho
                        </span>
                      </div>
                      
                      <!-- Trigger Button & Popover Menu (Dạng chuẩn Ảnh số 2) -->
                      <div class="wh-multiselect-container" id="wipWhMultiSelectContainer" style="position: relative; display: inline-block;">
                        <button type="button" 
                          id="wipWhMultiSelectTrigger" 
                          class="stage-multiselect-trigger" 
                          onclick="window.toggleWipWarehouseMultiSelect(event)" 
                          title="Nhấn để mở Bộ lọc kho 1C" 
                          style="display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.25rem 0.65rem; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(16, 185, 129, 0.5); border-radius: var(--radius-sm); color: #6ee7b7; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">
                          <span>👁️ Mở rộng kho:</span>
                          <span style="background: #059669; color: #ffffff; padding: 0.05rem 0.4rem; border-radius: 3px; font-size: 0.7rem; font-weight: 800;">
                            ${activeWhList.length}/${STOCK_WAREHOUSES_DEF.length}
                          </span>
                          <span style="font-size: 0.6rem; color: #34d399;">▼</span>
                        </button>

                        <!-- Popover Menu Bộ Lọc Kho 1C thiết kế tối giản chuẩn theo Ảnh số 2 -->
                        <div id="wipWhMultiSelectMenu" class="stage-multiselect-menu" onclick="event.stopPropagation()" style="display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 1000; width: 320px; max-width: 90vw; background: #0f172a; border: 1px solid rgba(16, 185, 129, 0.5); border-radius: var(--radius-md); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.85), 0 8px 10px -6px rgba(0, 0, 0, 0.6); padding: 0.75rem; backdrop-filter: blur(12px); text-align: left;">
                          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <span style="font-size: 0.775rem; font-weight: 800; color: #a7f3d0; display: flex; align-items: center; gap: 0.35rem;">
                              📦 BỘ LỌC KHO 1C (${STOCK_WAREHOUSES_DEF.length})
                            </span>
                            <div style="display: flex; gap: 0.3rem;">
                              <button type="button" class="btn btn-xs btn-outline" onclick="window.handleWipWarehouseSelectAll(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.35); color: #6ee7b7; border-radius: 3px; cursor: pointer;">✓ Chọn Hết</button>
                              <button type="button" class="btn btn-xs btn-outline" onclick="window.handleWipWarehouseClearAll(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #94a3b8; border-radius: 3px; cursor: pointer;">✗ Bỏ Chọn</button>
                              <button type="button" class="btn btn-xs btn-outline" onclick="window.closeWipWarehouseMultiSelect(event)" style="font-size: 0.675rem; padding: 0.15rem 0.45rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; border-radius: 3px; cursor: pointer;">✕</button>
                            </div>
                          </div>

                          <!-- Quick Search input inside warehouse popover -->
                          <div style="margin-bottom: 0.5rem; position: relative;">
                            <input type="text" id="wipWhSearchInput" placeholder="Tìm nhanh kho..." oninput="window.filterWipWarehouseList(this.value)" style="width: 100%; box-sizing: border-box; padding: 0.35rem 0.6rem; font-size: 0.75rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(16, 185, 129, 0.5); border-radius: var(--radius-sm); color: #f8fafc; outline: none; box-shadow: 0 0 6px rgba(16, 185, 129, 0.3);">
                          </div>

                          <!-- Scrollable Checkbox List tối giản theo Ảnh 2 -->
                          <div id="wipWhItemsList" style="max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem;">
                            ${warehouseCheckboxItems}
                          </div>
                        </div>
                      </div>
                    </div>
                  </th>
                </tr>
                <tr class="wip-header-subrow">
                  ${showSfgCols ? `
                    <th class="wip-sfg-sub-header" style="width: 118px; min-width: 118px; text-align: center; background: #1a140b !important; color: #fbbf24; border-left: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b !important; font-size: 0.7rem; font-weight: 800; position: sticky !important; top: 42px !important; z-index: 29 !important; height: 34px; box-sizing: border-box; white-space: nowrap; padding: 0.25rem 0.45rem;" title="Công đoạn trước sản xuất trực tiếp mã SFG này (VD: Hardtest cho Assembly, DIP cho Hardtest)">CÔNG ĐOẠN</th>
                    <th class="wip-sfg-sub-header" style="width: 90px; min-width: 90px; text-align: right; background: #1a140b !important; color: #60a5fa; border-bottom: 2px solid #f59e0b !important; font-size: 0.7rem; font-weight: 800; position: sticky !important; top: 42px !important; z-index: 29 !important; height: 34px; box-sizing: border-box; white-space: nowrap; padding: 0.25rem 0.45rem;" title="Tổng Kế hoạch (Plan) của mã SFG ở công đoạn trước trong kỳ đang chọn">KẾ HOẠCH</th>
                    <th class="wip-sfg-sub-header" style="width: 90px; min-width: 90px; text-align: right; background: #1a140b !important; color: #34d399; border-bottom: 2px solid #f59e0b !important; font-size: 0.7rem; font-weight: 800; position: sticky !important; top: 42px !important; z-index: 29 !important; height: 34px; box-sizing: border-box; white-space: nowrap; padding: 0.25rem 0.45rem;" title="Tổng Thực tế (Fact) của mã SFG ở công đoạn trước trong kỳ đang chọn">THỰC TẾ</th>
                    <th class="wip-sfg-sub-header" style="width: 90px; min-width: 90px; text-align: right; background: #1a140b !important; color: #f87171; border-bottom: 2px solid #f59e0b !important; font-size: 0.7rem; font-weight: 800; position: sticky !important; top: 42px !important; z-index: 29 !important; height: 34px; box-sizing: border-box; white-space: nowrap; padding: 0.25rem 0.45rem;" title="Chênh lệch (Gap = Thực tế - Kế hoạch) của mã SFG ở công đoạn trước">GAP</th>
                  ` : ''}
                  ${activeWhList.map((w, wIdx) => {
                    const subBg = w.id === 'all' ? '#0f2e47' : (w.id === 'whHardTest' ? '#252412' : '#0e2438');
                    const minW = w.id === 'all' ? '105px' : (w.id === 'whHardTest' ? '115px' : '95px');
                    return `
                      <th class="wip-stock-sub-header" style="width: ${minW}; min-width: ${minW}; text-align: right; background: ${subBg} !important; color: ${w.color}; ${wIdx === 0 ? 'border-left: 2px solid #10b981;' : ''} border-bottom: 2px solid #10b981 !important; font-size: 0.725rem; font-weight: 800; position: sticky !important; top: 42px !important; z-index: 29 !important; height: 34px; box-sizing: border-box; white-space: nowrap; padding: 0.25rem 0.55rem;" title="${w.title}">
                        ${w.shortName}
                      </th>
                    `;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${items.length === 0 ? `
                  <tr>
                    <td colspan="${totalCols}" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                      <strong>Không tìm thấy bản ghi bán thành phẩm nào phù hợp với bộ lọc hiện tại.</strong>
                      <div style="margin-top: 0.5rem; font-size: 0.8rem;">Hãy thử chuyển bộ lọc Chênh Lệch hoặc tìm kiếm với từ khóa khác.</div>
                    </td>
                  </tr>
                ` : items.map((it, idx) => {
                  const pSize = dataResult.pageSize || window.WipStore.pageSize || 50;
                  const stt = ((dataResult.currentPage || 0) * pSize) + idx + 1;
                  const stageStyle = getStageBadgeStyle(it.stage);
                  const isGapNeg = it.gapQty < 0;
                  const isGapPos = it.gapQty > 0;
                  const gapColor = isGapNeg ? '#f87171' : (isGapPos ? '#34d399' : '#94a3b8');

                  // Kiểm tra tồn kho Stock 1C của thành phẩm theo kho đang chọn (dùng khi sản phẩm không có BOM)
                  const fgStockInfo = getMaterialStock1CInfo(it.productName1C, it.specCode, window.WipStore.warehouseFilter);
                  const stockVal = fgStockInfo.val || it.stock1C || 0;

                  // Chuẩn hóa Specification Code: bỏ các số 0 ở đầu theo yêu cầu mới nhất (ví dụ 000061999 -> 61999)
                  const rawCode = (it.specCode || it.rawSpecCode || '').trim();
                  let displaySpecCode = rawCode;
                  if (rawCode && /^\d+$/.test(rawCode)) {
                    displaySpecCode = rawCode.replace(/^0+/, '') || '0';
                  }

                  // Lấy danh sách nguyên vật liệu từ Sheet BOM-Plan mới (kết hợp Sheet BOM)
                  let materials = it.bomMaterials;
                  if ((!materials || materials.length === 0) && window.BOM_MASTER_DATA) {
                    const padCode = rawCode.padStart(9, '0');
                    const b = window.BOM_MASTER_DATA[displaySpecCode] || window.BOM_MASTER_DATA[rawCode] || window.BOM_MASTER_DATA[padCode];
                    if (b && b.materials) materials = b.materials;
                  }
                  materials = sortMaterialsSfgFirst(materials);

                  const hasBom = materials.length > 0;
                  const lastStepVal = (it.lastStep && it.lastStep !== '-' ? it.lastStep : (it.lastStepVal || '')).trim();

                  // Render 4 cell BOM + 4 cell Tra cứu SFG (nếu bật) + N cell Nhóm Tồn Kho (Stock 1C Group)
                  const renderBomCells = (mat) => {
                    const emptySfgCells = showSfgCols ? `
                      <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem; border-left: 2px solid rgba(245, 158, 11, 0.35);">—</td>
                      <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                      <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                      <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                    ` : '';
                    if (!mat) {
                      return `
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        ${emptySfgCells}
                        ${activeWhList.map((w, wIdx) => `
                          <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem; ${wIdx === 0 ? 'border-left: 2px solid rgba(16, 185, 129, 0.4);' : ''}">—</td>
                        `).join('')}
                      `;
                    }

                    // Quy tắc chuẩn: Cột Nomenclature có chữ "Ajax" ở đầu thì đó mới là SFG!
                    const cleanNomen = String(mat.nomenclature || mat.specSub || mat.spec || '').trim();
                    const isSfg = cleanNomen.toLowerCase().startsWith('ajax');

                    const sfgCellStyle = isSfg 
                      ? 'background: #facc15 !important; color: #0f172a !important; font-weight: 700;' 
                      : '';
                    const sfgCodeStyle = isSfg 
                      ? 'color: #0f172a !important; font-weight: 800;' 
                      : 'color: #60a5fa; font-weight: 700;';
                    const sfgTextStyle = isSfg 
                      ? 'color: #0f172a !important; font-weight: 700;' 
                      : 'color: #cbd5e1;';

                    const qtyVal = mat.quantity !== undefined && mat.quantity !== null 
                      ? mat.quantity 
                      : (mat.qty !== undefined && mat.qty !== null ? mat.qty : 1);

                    // Lấy tồn kho của các nhóm kho từ Sheet Inventory 1C
                    const st = getMaterialStocksGroup(cleanNomen, mat.materialCode);

                    // Style riêng cho các ô tồn kho của nhóm kho
                    const sfgStockStyle = isSfg
                      ? 'background: #facc15 !important; color: #0f172a !important; font-weight: 800; font-size: 0.8rem; text-align: right;'
                      : 'text-align: right; background: rgba(16, 185, 129, 0.04); font-family: monospace; font-size: 0.775rem; font-weight: 700;';

                    const renderStockVal = (v) => {
                      if (v > 0) {
                        const col = isSfg ? '#0f172a' : '#34d399';
                        return `<span class="font-mono" style="color: ${col}; font-weight: 800;">${v.toLocaleString('vi-VN')}</span>`;
                      }
                      return `<span style="color: ${isSfg ? 'rgba(15, 23, 42, 0.45)' : '#64748b'};">—</span>`;
                    };

                    const stockCellsHtml = activeWhList.map((w, wIdx) => {
                      let val = 0;
                      if (w.id === 'all') val = st.all;
                      else if (w.id === 'whAssembly') val = st.whAssembly;
                      else if (w.id === 'whPkg') val = st.whPkg;
                      else if (w.id === 'whRepairSemi') val = st.whRepairSemi;
                      else if (w.id === 'whRepairBoard') val = st.whRepairBoard;
                      else if (w.id === 'whHardTest') val = st.whHardTest;

                      const borderStyle = wIdx === 0 ? 'border-left: 2px solid rgba(16, 185, 129, 0.4);' : '';
                      const minW = w.id === 'all' ? '105px' : (w.id === 'whHardTest' ? '115px' : '95px');
                      return `
                        <td style="${sfgStockStyle} white-space: nowrap; width: ${minW}; min-width: ${minW}; ${borderStyle}" title="${w.label}: ${Number(val).toLocaleString('vi-VN')} pcs">
                          ${renderStockVal(val)}
                        </td>
                      `;
                    }).join('');

                    return `
                      <!-- 10. Material_Code -->
                      <td style="${sfgCellStyle} white-space: nowrap;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.35rem;">
                          <span class="font-mono" style="font-size: 0.775rem; ${sfgCodeStyle} letter-spacing: 0.02em;" title="Material Code: ${mat.materialCode}">
                            ${mat.materialCode}
                          </span>
                          <button type="button" class="btn-copy-mini" onclick="window.copyToClipboard('${mat.materialCode}', 'Đã copy Material Code: ${mat.materialCode}')" title="Sao chép Material Code" style="background: transparent; border: none; cursor: pointer; opacity: ${isSfg ? '0.85' : '0.6'}; padding: 1px 3px; font-size: 0.7rem; transition: opacity 0.15s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${isSfg ? '0.85' : '0.6'}'">
                            📋
                          </button>
                        </div>
                      </td>

                      <!-- 11. Nomenclature -->
                      <td style="${sfgCellStyle} font-size: 0.775rem; ${sfgTextStyle} line-height: 1.3;" title="${cleanNomen}">
                        ${cleanNomen}
                      </td>

                      <!-- 12. Quantity -->
                      <td class="font-mono font-bold" style="${sfgCellStyle} text-align: right; font-size: 0.8rem; ${sfgCodeStyle}">
                        ${qtyVal}
                      </td>

                      <!-- 13. Catagory (SFG / Material) -->
                      <td style="${sfgCellStyle} text-align: center; white-space: nowrap;">
                        ${isSfg ? `
                          <span class="badge" style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(0, 0, 0, 0.4); color: #000000; font-weight: 900; font-size: 0.725rem; padding: 0.15rem 0.5rem; letter-spacing: 0.03em;">
                            SFG
                          </span>
                        ` : `
                          <span class="badge" style="background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.25); color: #94a3b8; font-size: 0.7rem; padding: 0.12rem 0.4rem;">
                            Material
                          </span>
                        `}
                      </td>

                      ${showSfgCols ? (() => {
                        if (!isSfg) {
                          return `
                            <td style="text-align: center; color: var(--text-muted); font-size: 0.72rem; border-left: 2px solid rgba(245, 158, 11, 0.22);">—</td>
                            <td style="text-align: right; color: var(--text-muted); font-size: 0.72rem;">—</td>
                            <td style="text-align: right; color: var(--text-muted); font-size: 0.72rem;">—</td>
                            <td style="text-align: right; color: var(--text-muted); font-size: 0.72rem;">—</td>
                          `;
                        }
                        const upstream = resolveUpstreamSfgEntry(cleanNomen, it.stage, sfgLookupIndex, it.productName1C);
                        if (!upstream) {
                          return `
                            <td style="${sfgCellStyle} text-align: center; border-left: 2px solid rgba(180, 83, 9, 0.45); font-size: 0.72rem; color: #78350f; font-weight: 700;" title="Không tìm thấy mã SFG này trong Data_Mass trong khoảng ngày đang lọc">Chưa có</td>
                            <td style="${sfgCellStyle} text-align: right; color: #78350f; font-weight: 700;">—</td>
                            <td style="${sfgCellStyle} text-align: right; color: #78350f; font-weight: 700;">—</td>
                            <td style="${sfgCellStyle} text-align: right; color: #78350f; font-weight: 700;">—</td>
                          `;
                        }
                        const sPlanStr = Math.round(upstream.planQty).toLocaleString('vi-VN');
                        const sFactStr = Math.round(upstream.factQty).toLocaleString('vi-VN');
                        const sGapVal = Math.round(upstream.gapQty);
                        const sGapStr = (sGapVal > 0 ? '+' : '') + sGapVal.toLocaleString('vi-VN');
                        const sGapColor = sGapVal < 0 ? '#b91c1c' : (sGapVal > 0 ? '#047857' : '#0f172a');
                        const encNomen = encodeURIComponent(cleanNomen);
                        const encUpStage = encodeURIComponent(upstream.stage);
                        return `
                          <td style="${sfgCellStyle} text-align: center; white-space: nowrap; border-left: 2px solid rgba(180, 83, 9, 0.55);">
                            <button type="button" class="wip-sfg-trace-btn" onclick="window.openSfgLookupFromRow(decodeURIComponent('${encNomen}'), decodeURIComponent('${encUpStage}'))" title="Xem chuỗi công đoạn trước của ${escapeWipHtml(upstream.productName1C || cleanNomen)}">
                              🔍 ${escapeWipHtml(upstream.stage)}
                            </button>
                          </td>
                          <td style="${sfgCellStyle} text-align: right; font-weight: 800; color: #1d4ed8; font-variant-numeric: tabular-nums;">${sPlanStr}</td>
                          <td style="${sfgCellStyle} text-align: right; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">${sFactStr}</td>
                          <td style="${sfgCellStyle} text-align: right; font-weight: 900; color: ${sGapColor}; font-variant-numeric: tabular-nums;">${sGapStr}</td>
                        `;
                      })() : ''}

                      <!-- CÁC Ô TỒN KHO THEO DANH SÁCH KHO ĐANG ĐƯỢC CHỌN -->
                      ${stockCellsHtml}
                    `;
                  };

                  // Tồn kho thành phẩm theo các kho đang active (dùng khi sản phẩm không có BOM)
                  const fgStocks = getMaterialStocksGroup(it.productName1C, it.specCode);

                  // Render dòng sản phẩm chính (9 ô sản phẩm bên trái + 4 ô BOM rỗng + N ô kho rỗng)
                  const mainRowHtml = `
                    <tr class="wip-row wip-prod-header-row" style="background: rgba(30, 41, 59, 0.4); border-top: 2px solid rgba(59, 130, 246, 0.4); transition: background 0.15s ease;">
                      <!-- 1. STT -->
                      <td style="text-align: center; font-size: 0.775rem; color: #94a3b8; font-weight: 700; position: sticky; left: 0; background: var(--surface-card); border-right: 1px solid var(--border-glass);">
                        ${stt}
                      </td>

                      <!-- 2. Công Đoạn -->
                      <td style="position: sticky; left: 45px; background: var(--surface-card); border-right: 1px solid var(--border-glass); white-space: nowrap;">
                        <span class="badge" style="background: ${stageStyle.bg}; border: 1px solid ${stageStyle.border}; color: ${stageStyle.color}; font-weight: 700; font-size: 0.725rem; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;" onclick="window.setWipStageQuickFilter('${it.stage}')" title="Bấm để chỉ lọc công đoạn ${it.stage}">
                          <span>${stageStyle.icon}</span>
                          <span>${it.stage}</span>
                        </span>
                      </td>

                      <!-- 3. Group Model -->
                      <td style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; white-space: nowrap;">
                        <span style="cursor: pointer; text-decoration: underline dotted;" onclick="window.setWipModelQuickFilter('${it.model}')" title="Bấm để lọc Model: ${it.model}">
                          ${it.model}
                        </span>
                      </td>

                      <!-- 4. Model (Mã 1C) -->
                      <td style="font-size: 0.8rem; font-weight: 600; color: #f8fafc; line-height: 1.35;" title="${it.productName1C}">
                        ${it.productName1C}
                      </td>

                      <!-- 5. KẾ HOẠCH (PLAN) -->
                      <td style="text-align: right; font-size: 0.825rem; font-weight: 700; color: #38bdf8; font-family: monospace;">
                        ${it.planQty > 0 ? it.planQty.toLocaleString('vi-VN') : '0'}
                      </td>

                      <!-- 6. THỰC TẾ (FACT) -->
                      <td style="text-align: right; font-size: 0.825rem; font-weight: 700; color: #f8fafc; font-family: monospace;">
                        ${it.factQty > 0 ? it.factQty.toLocaleString('vi-VN') : '0'}
                      </td>

                      <!-- 7. CHÊNH LỆCH (GAP) -->
                      <td style="text-align: right; font-size: 0.825rem; font-weight: 700; color: ${gapColor}; font-family: monospace;">
                        ${it.gapQty > 0 ? '+' : ''}${it.gapQty.toLocaleString('vi-VN')}
                      </td>

                      <!-- 8. Specification Code -->
                      <td style="white-space: nowrap;">
                        ${displaySpecCode ? `
                          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.35rem;">
                            <span class="font-mono font-bold" style="font-size: 0.775rem; color: #60a5fa; letter-spacing: 0.02em;" title="Specification Code: ${displaySpecCode}">
                              ${displaySpecCode}
                            </span>
                            <button type="button" class="btn-copy-mini" onclick="window.copyToClipboard('${displaySpecCode}', 'Đã copy Spec Code: ${displaySpecCode}')" title="Sao chép Specification Code" style="background: transparent; border: none; cursor: pointer; opacity: 0.6; padding: 1px 3px; font-size: 0.7rem; transition: opacity 0.15s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                              📋
                            </button>
                          </div>
                        ` : `
                          <span style="color: var(--text-muted); font-size: 0.775rem;">—</span>
                        `}
                      </td>

                      <!-- 9. Last Step -->
                      <td style="text-align: center; white-space: nowrap; font-weight: 700; color: #fbbf24; font-size: 0.775rem;">
                        ${lastStepVal || '—'}
                      </td>

                      <!-- DẢI CỘT BÊN PHẢI CỦA DÒNG SẢN PHẨM: Dải màu xám đậm rỗng nếu có BOM, hoặc hiển thị tồn kho nếu không có BOM -->
                      ${hasBom ? `
                        <td style="background: #475569 !important; border: 1px solid #64748b; height: 26px;"></td>
                        <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                        <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                        <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                        ${showSfgCols ? `
                          <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                          <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                          <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                          <td style="background: #475569 !important; border: 1px solid #64748b;"></td>
                        ` : ''}
                        ${activeWhList.map((w, wIdx) => {
                          const minW = w.id === 'all' ? '105px' : (w.id === 'whHardTest' ? '115px' : '95px');
                          return `
                            <td style="background: #475569 !important; border: 1px solid #64748b; width: ${minW}; min-width: ${minW}; ${wIdx === 0 ? 'border-left: 2px solid rgba(16, 185, 129, 0.4);' : ''}"></td>
                          `;
                        }).join('')}
                      ` : `
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        ${showSfgCols ? `
                          <td style="text-align: center; color: var(--text-muted); font-size: 0.775rem; border-left: 2px solid rgba(245, 158, 11, 0.22);">—</td>
                          <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                          <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                          <td style="text-align: right; color: var(--text-muted); font-size: 0.775rem;">—</td>
                        ` : ''}
                        ${activeWhList.map((w, wIdx) => {
                          let val = 0;
                          if (w.id === 'all') val = fgStocks.all;
                          else if (w.id === 'whAssembly') val = fgStocks.whAssembly;
                          else if (w.id === 'whPkg') val = fgStocks.whPkg;
                          else if (w.id === 'whRepairSemi') val = fgStocks.whRepairSemi;
                          else if (w.id === 'whRepairBoard') val = fgStocks.whRepairBoard;
                          else if (w.id === 'whHardTest') val = fgStocks.whHardTest;

                          const borderStyle = wIdx === 0 ? 'border-left: 2px solid rgba(16, 185, 129, 0.35);' : '';
                          const col = w.id === 'whHardTest' ? '#fde047' : '#34d399';
                          const minW = w.id === 'all' ? '105px' : (w.id === 'whHardTest' ? '115px' : '95px');
                          return `
                            <td style="text-align: right; background: rgba(16, 185, 129, 0.05); white-space: nowrap; width: ${minW}; min-width: ${minW}; ${borderStyle}">
                              <span class="font-mono font-bold" style="color: ${col};">${val > 0 ? val.toLocaleString('vi-VN') : '—'}</span>
                            </td>
                          `;
                        }).join('')}
                      `}
                    </tr>
                  `;

                  // Render các dòng nguyên vật liệu bên dưới dòng sản phẩm: 9 ô bên trái để trống, 9 ô bên phải là dữ liệu NVL & 5 kho
                  let subRowsHtml = '';
                  if (hasBom) {
                    subRowsHtml = materials.map(mat => `
                      <tr class="wip-row wip-bom-subrow" style="transition: background 0.15s ease;">
                        <!-- 9 ô trống bên trái theo đúng bảng concept Excel -->
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05); background: var(--surface-card); position: sticky; left: 0;"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05); background: var(--surface-card); position: sticky; left: 45px;"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.05);"></td>
                        <!-- 9 ô nguyên vật liệu & nhóm 5 kho bên phải -->
                        ${renderBomCells(mat)}
                      </tr>
                    `).join('');
                  }

                  return mainRowHtml + subRowsHtml;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- ========================================== -->
          <!-- 4. PAGINATION FOOTER BAR                   -->
          <!-- ========================================== -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; padding: 0.85rem 1.25rem; background: var(--surface-card); border-top: 1px solid var(--border-glass); gap: 0.75rem;">
            <div style="font-size: 0.775rem; color: var(--text-secondary);">
              Hiển thị từ <strong>${items.length === 0 ? 0 : (dataResult.currentPage * dataResult.pageSize + 1)}</strong> đến <strong>${Math.min(dataResult.totalItems, (dataResult.currentPage + 1) * dataResult.pageSize)}</strong> trong tổng số <strong>${dataResult.totalItems.toLocaleString('vi-VN')}</strong> bản ghi
              <span style="margin-left: 0.5rem; color: var(--text-muted); font-size: 0.725rem;">(Ngày kiểm kê: ${dataResult.dateRangeText || curDate})</span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.setWipPage(0)" ${dataResult.currentPage === 0 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                ⏮ Đầu
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.setWipPage(${dataResult.currentPage - 1})" ${dataResult.currentPage === 0 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                ◀ Trước
              </button>
              
              <span style="font-size: 0.775rem; font-weight: 700; color: #f8fafc; padding: 0.2rem 0.5rem;">
                Trang ${dataResult.currentPage + 1} / ${dataResult.totalPages}
              </span>

              <button class="btn btn-secondary btn-sm" onclick="window.setWipPage(${dataResult.currentPage + 1})" ${dataResult.currentPage >= dataResult.totalPages - 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                Sau ▶
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.setWipPage(${dataResult.totalPages - 1})" ${dataResult.currentPage >= dataResult.totalPages - 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                Cuối ⏭
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    const newTableWrap = container.querySelector('.table-container');
    if (newTableWrap && (savedTableScrollTop > 0 || savedTableScrollLeft > 0)) {
      newTableWrap.scrollTop = savedTableScrollTop;
      newTableWrap.scrollLeft = savedTableScrollLeft;
    }
    if (savedWindowScrollY > 0) {
      window.scrollTo({ top: savedWindowScrollY, behavior: 'instant' });
    }
    if (typeof focusState !== 'undefined') restoreWipSearchFocus(focusState);

    // Đảm bảo vị trí sticky top của Tầng 2 (tên các kho & cột Tra cứu SFG) luôn khớp chuẩn xác tuyệt đối với Tầng 1
    const updateStickySubrowTop = () => {
      try {
        const groupTh = container.querySelector('.wip-stock-group-header') || container.querySelector('.wip-sfg-group-header');
        const subThs = container.querySelectorAll('.wip-stock-sub-header, .wip-sfg-sub-header');
        if (groupTh && subThs.length > 0) {
          const h1 = groupTh.offsetHeight || 42;
          subThs.forEach(th => {
            th.style.setProperty('top', h1 + 'px', 'important');
          });
        }
      } catch (e) {}
    };
    updateStickySubrowTop();
    setTimeout(updateStickySubrowTop, 60);
  };

  /**
   * Cập nhật số lượng tồn kho Stock 1C cho 1 bản ghi
   */
  window.handleUpdateStock1C = function(itemKey, value) {
    if (!window.AppStore || typeof window.AppStore.setStock1C !== 'function') return;

    // Kiểm tra quyền người dùng: nếu là viewer thì không cho chỉnh sửa
    const userRole = localStorage.getItem('AJAX_PROPLAN_USER_ROLE') || 'admin';
    if (userRole === 'viewer') {
      if (window.showToast) window.showToast('warning', 'Quyền Viewer chỉ được xem, không thể thay đổi Stock 1C!');
      window.renderWipControlView();
      return;
    }

    const curDate = window.WipStore.toDate || window.WipStore.fromDate || window.AppStore.toDate || '2026-10-26';
    const num = window.AppStore.setStock1C(itemKey, curDate, value);

    if (window.showToast) {
      window.showToast('success', `Đã lưu tồn kho Stock 1C: ${num.toLocaleString('vi-VN')} pcs (Ngày ${curDate})`);
    }

    // Cập nhật lại chỉ số KPI trên cùng mà không làm mất focus nếu người dùng đang nhập
    window.renderWipControlView();
  };

  /**
   * Action Handlers
   */

  // --- Multi-Select Stage Filter Handlers ---

  window.toggleWipStageMultiSelect = function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (!menu) return;
    const isHidden = (menu.style.display === 'none' || !menu.style.display);
    menu.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const input = document.getElementById('wipStageSearchInput');
      if (input) {
        input.value = '';
        window.filterWipStageList('');
        setTimeout(() => input.focus(), 60);
      }
    }
  };

  window.closeWipStageMultiSelect = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (menu) menu.style.display = 'none';
  };

  window.handleWipStageToggle = function(stage, isChecked, event) {
    if (event) event.stopPropagation();
    const searchInputBefore = document.getElementById('wipStageSearchInput');
    const prevSearchVal = searchInputBefore ? searchInputBefore.value : '';

    const distinctStages = (window.AppStore && typeof window.AppStore.getWipDistinctStages === 'function') 
      ? window.AppStore.getWipDistinctStages() 
      : [];
    
    let currentList = [];
    if (!window.WipStore.stageFilter || window.WipStore.stageFilter === 'ALL') {
      currentList = [...distinctStages];
    } else if (Array.isArray(window.WipStore.stageFilter)) {
      currentList = [...window.WipStore.stageFilter];
    } else {
      currentList = [window.WipStore.stageFilter];
    }

    if (isChecked) {
      if (!currentList.includes(stage)) currentList.push(stage);
    } else {
      currentList = currentList.filter(s => s !== stage);
    }

    // Nếu chọn tất cả thì đưa về 'ALL'
    if (currentList.length >= distinctStages.length) {
      window.WipStore.stageFilter = 'ALL';
    } else {
      window.WipStore.stageFilter = currentList;
    }

    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.pageIndex = 0;
    
    window.renderWipControlView();

    // Giữ popover mở để user chọn nhiều công đoạn liên tiếp thuận tiện
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (menu) {
      menu.style.display = 'block';
      if (prevSearchVal) {
        const searchInputAfter = document.getElementById('wipStageSearchInput');
        if (searchInputAfter) {
          searchInputAfter.value = prevSearchVal;
          window.filterWipStageList(prevSearchVal);
        }
      }
    }
  };

  window.handleWipStageSelectAll = function(event) {
    if (event) event.stopPropagation();
    window.WipStore.stageFilter = 'ALL';
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.handleWipStageClearAll = function(event) {
    if (event) event.stopPropagation();
    window.WipStore.stageFilter = []; // Rỗng: không chọn công đoạn nào
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.setWipStageBundle = function(stages, event) {
    if (event) event.stopPropagation();
    window.WipStore.stageFilter = Array.isArray(stages) ? [...stages] : [stages];
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    const menu = document.getElementById('wipStageMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.filterWipStageList = function(kw) {
    const q = (kw || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.wip-stage-option-row');
    rows.forEach(r => {
      const stageName = r.getAttribute('data-stage') || '';
      if (!q || stageName.includes(q)) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  };

  // --- Multi-Select Stock Warehouses Popover Handlers (Ảnh số 2) ---

  window.toggleWipWarehouseMultiSelect = function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (!menu) return;
    const isHidden = (menu.style.display === 'none' || !menu.style.display);
    menu.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const input = document.getElementById('wipWhSearchInput');
      if (input) {
        input.value = '';
        window.filterWipWarehouseList('');
        setTimeout(() => input.focus(), 60);
      }
    }
  };

  window.closeWipWarehouseMultiSelect = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (menu) menu.style.display = 'none';
  };

  window.handleWipWarehouseToggle = function(whId, isChecked, event) {
    if (event) event.stopPropagation();
    const searchInputBefore = document.getElementById('wipWhSearchInput');
    const prevSearchVal = searchInputBefore ? searchInputBefore.value : '';

    if (!window.WipStore.activeStockWarehouses) {
      window.WipStore.activeStockWarehouses = ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
    }

    if (isChecked) {
      if (!window.WipStore.activeStockWarehouses.includes(whId)) {
        window.WipStore.activeStockWarehouses.push(whId);
      }
    } else {
      if (window.WipStore.activeStockWarehouses.length <= 1) {
        if (window.showToast) window.showToast('warning', 'Cần giữ ít nhất 1 cột kho hiển thị!');
        return;
      }
      window.WipStore.activeStockWarehouses = window.WipStore.activeStockWarehouses.filter(id => id !== whId);
    }

    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}

    window.renderWipControlView();

    // Giữ popover mở để user có thể click chọn tiếp các kho thuận tiện
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (menu) {
      menu.style.display = 'block';
      if (prevSearchVal) {
        const searchInputAfter = document.getElementById('wipWhSearchInput');
        if (searchInputAfter) {
          searchInputAfter.value = prevSearchVal;
          window.filterWipWarehouseList(prevSearchVal);
        }
      }
    }
  };

  window.handleWipWarehouseSelectAll = function(event) {
    if (event) event.stopPropagation();
    window.WipStore.activeStockWarehouses = STOCK_WAREHOUSES_DEF.map(w => w.id);
    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}
    window.renderWipControlView();
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.handleWipWarehouseClearAll = function(event) {
    if (event) event.stopPropagation();
    window.WipStore.activeStockWarehouses = ['all']; // Thu gọn về chỉ Tổng Kho
    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}
    window.renderWipControlView();
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.setWipWarehouseBundle = function(whIds, event) {
    if (event) event.stopPropagation();
    if (!whIds || whIds.length === 0) whIds = ['all'];
    window.WipStore.activeStockWarehouses = [...whIds];
    try {
      localStorage.setItem('AJAX_WIP_ACTIVE_STOCK_WHS', JSON.stringify(window.WipStore.activeStockWarehouses));
    } catch(e) {}
    window.renderWipControlView();
    const menu = document.getElementById('wipWhMultiSelectMenu');
    if (menu) menu.style.display = 'block';
  };

  window.filterWipWarehouseList = function(kw) {
    const q = (kw || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.wip-wh-option-row');
    rows.forEach(r => {
      const data = (r.getAttribute('data-wh') || '').toLowerCase();
      if (!q || data.includes(q)) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  };

  // Giữ nguyên handler cũ cho tương thích với click badge đơn lẻ
  window.handleWipStageChange = function(stage) {
    window.WipStore.stageFilter = stage;
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  // --- Date Range Handlers ---

  window.handleWipDateRangeChange = function() {
    const fromEl = document.getElementById('wipFromDate');
    const toEl = document.getElementById('wipToDate');
    if (fromEl && fromEl.value) {
      const prevFrom = window.WipStore.fromDate;
      window.WipStore.fromDate = fromEl.value;
      // Quy tắc chu kỳ tuần: Nếu người dùng thay đổi ngày bắt đầu và ngày bắt đầu là Thứ 5,
      // tự động tính ngày kết thúc là hết Thứ 4 tuần tiếp theo (+6 ngày)
      const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(fromEl.value) : new Date(fromEl.value);
      if (d && !isNaN(d.getTime()) && d.getDay() === 4 && prevFrom !== fromEl.value) {
        const endWed = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
        const pad = n => String(n).padStart(2, '0');
        const toVal = `${endWed.getFullYear()}-${pad(endWed.getMonth() + 1)}-${pad(endWed.getDate())}`;
        window.WipStore.toDate = toVal;
        if (toEl) toEl.value = toVal;
      }
    }
    if (toEl && toEl.value) window.WipStore.toDate = toEl.value;

    // Đảm bảo toDate không nhỏ hơn fromDate
    if (window.WipStore.fromDate && window.WipStore.toDate && window.WipStore.fromDate > window.WipStore.toDate) {
      window.WipStore.toDate = window.WipStore.fromDate;
      if (toEl) toEl.value = window.WipStore.fromDate;
    }

    window.WipStore.date = window.WipStore.toDate || window.WipStore.fromDate;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.setWipQuickDateRange = function(type) {
    if (type === '7DAYS') {
      const def = getDefaultWipDateRange();
      window.WipStore.fromDate = def.fromDate;
      window.WipStore.toDate = def.toDate;
    } else if (type === 'ALL_PERIOD') {
      window.WipStore.fromDate = '2026-10-22';
      window.WipStore.toDate = '2026-11-04';
    }
    window.WipStore.date = window.WipStore.toDate;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    if (window.showToast) {
      window.showToast('info', `Đã chọn kỳ kế hoạch: ${toVnDate(window.WipStore.fromDate)} → ${toVnDate(window.WipStore.toDate)}`);
    }
  };

  window.handleWipDateChange = function(val) {
    window.WipStore.date = val || getTodayIsoDate();
  };

  // --- Other Filters & Actions ---

  window.handleWipModelChange = function(model) {
    window.WipStore.modelFilter = model;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.handleWipLastStepChange = function(lastStep) {
    window.WipStore.lastStepFilter = lastStep;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.handleWipStatusChange = function(status) {
    window.WipStore.statusFilter = status;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.handleWipGapFilterChange = function(val) {
    window.WipStore.gapFilter = val;
    if (val === 'NEGATIVE' && window.WipStore.sortBy === 'DEFAULT') {
      window.WipStore.sortBy = 'GAP_ASC'; // tự động sắp xếp âm nhiều nhất lên đầu
    }
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.toggleWipNegativeGapFilter = function() {
    if (window.WipStore.gapFilter === 'NEGATIVE') {
      window.WipStore.gapFilter = 'ALL';
      window.WipStore.sortBy = 'DEFAULT';
    } else {
      window.WipStore.gapFilter = 'NEGATIVE';
      window.WipStore.sortBy = 'GAP_ASC'; // tự động xếp âm nhiều nhất lên đầu
    }
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.handleWipSortChange = function(val) {
    window.WipStore.sortBy = val;
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  window.toggleWipGapSort = function() {
    if (window.WipStore.sortBy === 'GAP_ASC') {
      window.WipStore.sortBy = 'GAP_DESC';
    } else if (window.WipStore.sortBy === 'GAP_DESC') {
      window.WipStore.sortBy = 'DEFAULT';
    } else {
      window.WipStore.sortBy = 'GAP_ASC';
    }
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
  };

  let wipSearchDebounceTimer = null;
  window.handleWipSearch = function(val) {
    window.WipStore.search = val || '';
    window.WipStore.pageIndex = 0;
    saveWipStoreState();
    clearTimeout(wipSearchDebounceTimer);
    wipSearchDebounceTimer = setTimeout(() => {
      window.renderWipControlView();
    }, 220);
  };

  function reloadWipScriptTag(basePath) {
    if (window.SyncService && typeof window.SyncService.reloadScriptFile === 'function') {
      return window.SyncService.reloadScriptFile(basePath);
    }
    return new Promise((resolve) => {
      if (typeof document === 'undefined') { resolve(false); return; }
      const oldScript = document.querySelector(`script[src*="${basePath}"]`);
      const newScript = document.createElement('script');
      newScript.src = `${basePath}?t=${Date.now()}`;
      newScript.onload = () => resolve(true);
      newScript.onerror = () => resolve(false);
      if (oldScript && oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      } else {
        document.head.appendChild(newScript);
      }
    });
  }

  window.handleWipLoadData = async function() {
    const fromEl = document.getElementById('wipFromDate');
    const toEl = document.getElementById('wipToDate');
    if (fromEl && fromEl.value) window.WipStore.fromDate = fromEl.value;
    if (toEl && toEl.value) window.WipStore.toDate = toEl.value;
    window.WipStore.date = window.WipStore.toDate || window.WipStore.fromDate;
    window.WipStore.pageIndex = 0;

    const btn = document.getElementById('btnWipLoadData');
    const icon = document.getElementById('wipLoadIcon');
    const text = document.getElementById('wipLoadText');
    if (btn) btn.disabled = true;
    if (icon) {
      icon.textContent = '🔄';
      icon.style.display = 'inline-block';
      icon.style.animation = 'spin 0.8s linear infinite';
    }
    if (text) text.textContent = 'Đang tải...';

    let syncMeta = null;
    try {
      if (typeof fetch === 'function') {
        const resp = await fetch('/api/sync?t=' + Date.now(), { method: 'GET', cache: 'no-cache' });
        if (resp && resp.ok) {
          syncMeta = await resp.json();
          if (syncMeta && syncMeta.success && typeof document !== 'undefined') {
            // Nạp lại đồng thời dữ liệu mới nhất: Inventory 1C, BOM, Mass-History và Data_Mass
            await Promise.all([
              reloadWipScriptTag('js/inventory-1c-data.js'),
              reloadWipScriptTag('js/bom-data.js'),
              reloadWipScriptTag('js/mass-history-data.js'),
              reloadWipScriptTag('js/datamass-data.js')
            ]);

            // Cập nhật trực tiếp vào AppStore để getWipControlData() tính đúng Plan/Fact/Stock1C mới nhất
            if (window.AppStore && window.DEFAULT_DATAMASS_DATA && Array.isArray(window.DEFAULT_DATAMASS_DATA.items)) {
              if (typeof window.AppStore.updateDataMassData === 'function') {
                window.AppStore.updateDataMassData(window.DEFAULT_DATAMASS_DATA);
              } else {
                window.AppStore.dataMass = window.DEFAULT_DATAMASS_DATA;
                window.AppStore._normalizedWeeks = null;
              }
            }

            if (window.SyncService) {
              window.SyncService.lastSyncTime = new Date();
              try {
                localStorage.setItem('AJAX_PROPLAN_LAST_SYNC', window.SyncService.lastSyncTime.toISOString());
              } catch (e) {}
              if (typeof window.SyncService.updateStatusUI === 'function') {
                window.SyncService.updateStatusUI('online', `Đã đồng bộ ${window.SyncService.formatTime(window.SyncService.lastSyncTime)}`);
              }
            }
          }
        } else if (window.SyncService && typeof window.SyncService.fetchLiveData === 'function') {
          await window.SyncService.fetchLiveData(true);
        }
      }
    } catch (err) {
      console.log('Chế độ cục bộ / fallback live CSV:', err);
      if (window.SyncService && typeof window.SyncService.fetchLiveData === 'function') {
        try { await window.SyncService.fetchLiveData(true); } catch (e2) {}
      }
    } finally {
      if (btn) btn.disabled = false;
      if (icon) {
        icon.textContent = '📥';
        icon.style.animation = 'none';
      }
      if (text) text.textContent = 'Tra Cứu';

      window.renderWipControlView();

      if (window.showToast) {
        if (syncMeta && syncMeta.success) {
          window.showToast(
            'success',
            `Đã đồng bộ & tra cứu dữ liệu mới nhất (${syncMeta.inventory_items_count || 0} mã 1C • ${syncMeta.items_count || 0} models) từ ${toVnDate(window.WipStore.fromDate)} → ${toVnDate(window.WipStore.toDate)}!`
          );
        } else {
          window.showToast('success', `Đã tra cứu dữ liệu WIP từ ${toVnDate(window.WipStore.fromDate)} đến ${toVnDate(window.WipStore.toDate)} thành công!`);
        }
      }
    }
  };

  window.setWipTodayDate = function() {
    window.WipStore.date = getTodayIsoDate();
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    if (window.showToast) window.showToast('info', 'Đã chuyển ngày kiểm kê về hôm nay!');
  };

  window.handleWipWarehouseChange = function(wh) {
    window.WipStore.warehouseFilter = wh || 'ALL';
    window.renderWipControlView();
    if (window.showToast) {
      let whLabel = 'Tất cả kho';
      if (wh === 'WH ASSEMBLY_VTP') whLabel = 'WH ASSEMBLY_VTP';
      else if (wh === 'PKG_VTP') whLabel = 'PKG_VTP';
      else if (wh === 'Repair of semi-finished products_VTP') whLabel = 'Repair semi-finished';
      else if (wh === 'Repair of board_VTP') whLabel = 'Repair of board';
      window.showToast('info', `Đã chuyển lọc tồn kho: ${whLabel}`);
    }
  };

  window.handleResetWipFilters = function() {
    try { localStorage.removeItem(WIP_STORAGE_KEY); } catch (e) {}
    const defaultRange = getDefaultWipDateRange();
    window.WipStore.stageFilter = 'ASSEMBLY';
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.statusFilter = 'ALL';
    window.WipStore.gapFilter = 'HAS_GAP';
    window.WipStore.sortBy = 'GAP_ASC';
    window.WipStore.warehouseFilter = 'ALL';
    window.WipStore.showSfgColumns = true;
    window.WipStore.search = '';
    window.WipStore.fromDate = defaultRange.fromDate;
    window.WipStore.toDate = defaultRange.toDate;
    window.WipStore.date = defaultRange.toDate;
    window.WipStore.pageIndex = 0;
    saveWipStoreState();
    window.renderWipControlView();
    if (window.showToast) window.showToast('info', 'Đã đặt lại bộ lọc WIP Control về mặc định (Công đoạn Assembly, chỉ lấy mã có GAP)!');
  };

  window.setWipPage = function(page) {
    window.WipStore.pageIndex = page;
    window.renderWipControlView();
    const tableWrap = document.querySelector('.wip-table');
    if (tableWrap) tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.setWipStageQuickFilter = function(stage) {
    window.handleWipStageChange(stage);
  };

  window.setWipModelQuickFilter = function(model) {
    window.handleWipModelChange(model);
  };

  window.setWipLastStepQuickFilter = function(lastStep) {
    window.handleWipLastStepChange(lastStep);
  };

  /**
   * Sao chép toàn bộ bảng dữ liệu WIP ra Clipboard theo định dạng TSV chuẩn cho Google Sheets / Excel
   * (Format 14 cột chính xác theo concept ảnh mới: Thêm cột Last Step, 5 cột sau ở dòng SP để trống, các dòng NVL có Stock 1C từ Sheet Inventory 1C)
   */
  window.handleCopyForGoogleSheet = function() {
    if (!window.AppStore || typeof window.AppStore.getWipControlData !== 'function') return;

    const defaultRange = getDefaultWipDateRange();
    const fromDate = window.WipStore.fromDate || defaultRange.fromDate;
    const toDate = window.WipStore.toDate || defaultRange.toDate;
    const curDate = window.WipStore.date || toDate;

    // Lấy toàn bộ dữ liệu đang được lọc (không bị giới hạn bởi phân trang)
    const result = window.AppStore.getWipControlData({
      stageFilter: window.WipStore.stageFilter,
      modelFilter: window.WipStore.modelFilter,
      lastStepFilter: window.WipStore.lastStepFilter,
      statusFilter: window.WipStore.statusFilter,
      gapFilter: window.WipStore.gapFilter || 'ALL',
      sortBy: window.WipStore.sortBy || 'DEFAULT',
      search: window.WipStore.search,
      fromDate: fromDate,
      toDate: toDate,
      date: curDate,
      pageIndex: 0,
      pageSize: 999999
    });

    if (!result.items || result.items.length === 0) {
      if (window.showToast) window.showToast('warning', 'Không có dữ liệu WIP để sao chép!');
      return;
    }

    const activeWhKeys = window.WipStore.activeStockWarehouses || ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
    const activeWhList = STOCK_WAREHOUSES_DEF.filter(w => activeWhKeys.includes(w.id));
    const showSfgCols = window.WipStore.showSfgColumns !== false;
    const activeDateSet = showSfgCols ? getWipActiveDateSet(fromDate, toDate) : null;
    const sfgLookupIndex = showSfgCols ? buildSfgDataMassLookup(activeDateSet) : {};

    // Tiêu đề cột chuẩn TSV (gồm nhóm Tra cứu SFG + nhóm các cột tồn kho đang mở rộng hiển thị)
    const headers = [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Model (Mã 1C)',
      'KẾ HOẠCH (PLAN)',
      'THỰC TẾ (FACT)',
      'CHÊNH LỆCH (GAP)',
      'Specification Code',
      'Last Step',
      'Material_Code',
      'Nomenclature',
      'Quantity',
      'Catagory',
      ...(showSfgCols ? ['Công Đoạn (SFG)', 'Kế Hoạch (SFG)', 'Thực Tế (SFG)', 'Gap (SFG)'] : []),
      ...activeWhList.map(w => `Stock 1C (${w.label})`)
    ];

    const rows = [headers.join('\t')];
    let rowCount = 0;

    result.items.forEach((it, idx) => {
      const clean = (val) => String(val || '').replace(/[\t\r\n]/g, ' ').trim();

      // Chuẩn hóa Specification Code: bỏ các số 0 ở đầu theo yêu cầu mới nhất (ví dụ 000061999 -> 61999)
      const rawCode = (it.specCode || it.rawSpecCode || '').trim();
      let displaySpecCode = rawCode;
      if (rawCode && /^\d+$/.test(rawCode)) {
        displaySpecCode = rawCode.replace(/^0+/, '') || '0';
      }

      const lastStepVal = (it.lastStep && it.lastStep !== '-' ? it.lastStep : (it.lastStepVal || '')).trim();

      // Lấy BOM materials từ Sheet BOM-Plan mới (kết hợp Sheet BOM)
      let materials = it.bomMaterials;
      if ((!materials || materials.length === 0) && window.BOM_MASTER_DATA) {
        const padCode = rawCode.padStart(9, '0');
        const b = window.BOM_MASTER_DATA[displaySpecCode] || window.BOM_MASTER_DATA[rawCode] || window.BOM_MASTER_DATA[padCode];
        if (b && b.materials) materials = b.materials;
      }
      materials = sortMaterialsSfgFirst(materials);

      if (materials.length > 0) {
        // Dòng 1: Sản phẩm (9 cột đầu có dữ liệu sản phẩm, các cột sau để trống như dải xám trong bảng)
        rowCount++;
        const prodRow = [
          idx + 1,
          clean(it.stage),
          clean(it.model),
          clean(it.productName1C),
          it.planQty || 0,
          it.factQty || 0,
          it.gapQty || 0,
          clean(displaySpecCode),
          clean(lastStepVal),
          '',
          '',
          '',
          '',
          ...(showSfgCols ? ['', '', '', ''] : []),
          ...activeWhList.map(() => '')
        ];
        rows.push(prodRow.join('\t'));

        // Các dòng tiếp theo: từng nguyên vật liệu (9 cột đầu để trống, 4 cột BOM + 4 cột SFG nếu bật + N cột Tồn Kho Group)
        materials.forEach(mat => {
          rowCount++;
          const cleanNom = clean(mat.nomenclature || mat.specSub || mat.spec);
          const isSfg = cleanNom.toLowerCase().startsWith('ajax');
          const cat = isSfg ? 'SFG' : 'Material';

          const qtyVal = mat.quantity !== undefined && mat.quantity !== null 
            ? mat.quantity 
            : (mat.qty !== undefined && mat.qty !== null ? mat.qty : 1);
          
          const st = getMaterialStocksGroup(cleanNom, mat.materialCode);

          const stockVals = activeWhList.map(w => {
            let v = 0;
            if (w.id === 'all') v = st.all;
            else if (w.id === 'whAssembly') v = st.whAssembly;
            else if (w.id === 'whPkg') v = st.whPkg;
            else if (w.id === 'whRepairSemi') v = st.whRepairSemi;
            else if (w.id === 'whRepairBoard') v = st.whRepairBoard;
            else if (w.id === 'whHardTest') v = st.whHardTest;
            return v > 0 ? v : 0;
          });

          const sfgVals = !showSfgCols ? [] : (() => {
            if (!isSfg) return ['', '', '', ''];
            const up = resolveUpstreamSfgEntry(cleanNom, it.stage, sfgLookupIndex, it.productName1C);
            if (!up) return ['Chưa có', '', '', ''];
            return [clean(up.stage), Math.round(up.planQty), Math.round(up.factQty), Math.round(up.gapQty)];
          })();

          const matRow = [
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            clean(mat.materialCode),
            cleanNom,
            qtyVal,
            cat,
            ...sfgVals,
            ...stockVals
          ];
          rows.push(matRow.join('\t'));
        });
      } else {
        rowCount++;
        const fgSt = getMaterialStocksGroup(it.productName1C, it.specCode);
        const fgStockVals = activeWhList.map(w => {
          let v = 0;
          if (w.id === 'all') v = fgSt.all > 0 ? fgSt.all : (it.stock1C || 0);
          else if (w.id === 'whAssembly') v = fgSt.whAssembly;
          else if (w.id === 'whPkg') v = fgSt.whPkg;
          else if (w.id === 'whRepairSemi') v = fgSt.whRepairSemi;
          else if (w.id === 'whRepairBoard') v = fgSt.whRepairBoard;
          else if (w.id === 'whHardTest') v = fgSt.whHardTest;
          return v > 0 ? v : 0;
        });

        const row = [
          idx + 1,
          clean(it.stage),
          clean(it.model),
          clean(it.productName1C),
          it.planQty || 0,
          it.factQty || 0,
          it.gapQty || 0,
          clean(displaySpecCode),
          clean(lastStepVal),
          '',
          '',
          '',
          '',
          ...(showSfgCols ? ['', '', '', ''] : []),
          ...fgStockVals
        ];
        rows.push(row.join('\t'));
      }
    });

    const tsvContent = rows.join('\n');

    const successMessage = `📋 Đã copy ${result.items.length.toLocaleString('vi-VN')} Model (${rowCount.toLocaleString('vi-VN')} dòng BOM & ${activeWhList.length} Cột Kho Stock 1C) kỳ ${toVnDate(fromDate)} → ${toVnDate(toDate)}! Mở Google Sheet và bấm Ctrl + V (Cmd + V) để dán.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent).then(() => {
        if (window.showToast) window.showToast('success', successMessage);
      }).catch(err => {
        console.warn('Lỗi navigator.clipboard, chuyển sang legacyCopy:', err);
        legacyCopy(tsvContent, successMessage);
      });
    } else {
      legacyCopy(tsvContent, successMessage);
    }
  };

  /**
   * Xuất file CSV định dạng chuẩn UTF-8 tương thích 100% với Google Sheets và Excel
   * (Format 18 cột theo đúng concept ảnh mới, gồm nhóm 5 cột tồn kho)
   */
  window.handleExportWipGoogleSheet = function() {
    if (!window.AppStore || typeof window.AppStore.getWipControlData !== 'function') return;

    const defaultRange = getDefaultWipDateRange();
    const fromDate = window.WipStore.fromDate || defaultRange.fromDate;
    const toDate = window.WipStore.toDate || defaultRange.toDate;
    const curDate = window.WipStore.date || toDate;

    const result = window.AppStore.getWipControlData({
      stageFilter: window.WipStore.stageFilter,
      modelFilter: window.WipStore.modelFilter,
      lastStepFilter: window.WipStore.lastStepFilter,
      statusFilter: window.WipStore.statusFilter,
      gapFilter: window.WipStore.gapFilter || 'ALL',
      sortBy: window.WipStore.sortBy || 'DEFAULT',
      search: window.WipStore.search,
      fromDate: fromDate,
      toDate: toDate,
      date: curDate,
      pageIndex: 0,
      pageSize: 999999
    });

    if (!result.items || result.items.length === 0) {
      if (window.showToast) window.showToast('warning', 'Không có dữ liệu WIP để xuất file!');
      return;
    }

    const activeWhKeys = window.WipStore.activeStockWarehouses || ['all', 'whAssembly', 'whPkg', 'whRepairSemi', 'whRepairBoard'];
    const activeWhList = STOCK_WAREHOUSES_DEF.filter(w => activeWhKeys.includes(w.id));
    const showSfgCols = window.WipStore.showSfgColumns !== false;
    const activeDateSet = showSfgCols ? getWipActiveDateSet(fromDate, toDate) : null;
    const sfgLookupIndex = showSfgCols ? buildSfgDataMassLookup(activeDateSet) : {};

    let csv = '\uFEFF'; // UTF-8 BOM để Google Sheets & Excel hiển thị tiếng Việt chuẩn 100%
    const escapeCsv = (s) => `"${String(s || '').replace(/"/g, '""')}"`;

    csv += [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Model (Mã 1C)',
      'KẾ HOẠCH (PLAN)',
      'THỰC TẾ (FACT)',
      'CHÊNH LỆCH (GAP)',
      'Specification Code',
      'Last Step',
      'Material_Code',
      'Nomenclature',
      'Quantity',
      'Catagory',
      ...(showSfgCols ? ['Công Đoạn (SFG)', 'Kế Hoạch (SFG)', 'Thực Tế (SFG)', 'Gap (SFG)'] : []),
      ...activeWhList.map(w => `Stock 1C (${w.label})`)
    ].map(escapeCsv).join(',') + '\n';

    result.items.forEach((it, idx) => {
      // Chuẩn hóa Specification Code: bỏ các số 0 ở đầu theo yêu cầu mới nhất (ví dụ 000061999 -> 61999)
      const rawCode = (it.specCode || it.rawSpecCode || '').trim();
      let displaySpecCode = rawCode;
      if (rawCode && /^\d+$/.test(rawCode)) {
        displaySpecCode = rawCode.replace(/^0+/, '') || '0';
      }

      const lastStepVal = (it.lastStep && it.lastStep !== '-' ? it.lastStep : (it.lastStepVal || '')).trim();

      // Lấy BOM materials từ Sheet BOM-Plan mới (kết hợp Sheet BOM)
      let materials = it.bomMaterials;
      if ((!materials || materials.length === 0) && window.BOM_MASTER_DATA) {
        const padCode = rawCode.padStart(9, '0');
        const b = window.BOM_MASTER_DATA[displaySpecCode] || window.BOM_MASTER_DATA[rawCode] || window.BOM_MASTER_DATA[padCode];
        if (b && b.materials) materials = b.materials;
      }
      materials = sortMaterialsSfgFirst(materials);

      if (materials.length > 0) {
        // Dòng sản phẩm (9 ô có dữ liệu, các ô sau để trống)
        csv += [
          idx + 1,
          escapeCsv(it.stage),
          escapeCsv(it.model),
          escapeCsv(it.productName1C),
          it.planQty || 0,
          it.factQty || 0,
          it.gapQty || 0,
          escapeCsv(displaySpecCode),
          escapeCsv(lastStepVal),
          '',
          '',
          '',
          '',
          ...(showSfgCols ? ['', '', '', ''] : []),
          ...activeWhList.map(() => '')
        ].join(',') + '\n';

        // Từng dòng nguyên vật liệu (4 ô BOM + 4 ô SFG nếu bật + N ô tồn kho nhóm)
        materials.forEach(mat => {
          const cleanNom = String(mat.nomenclature || mat.specSub || mat.spec || '').trim();
          const isSfg = cleanNom.toLowerCase().startsWith('ajax');
          const cat = isSfg ? 'SFG' : 'Material';

          const qtyVal = mat.quantity !== undefined && mat.quantity !== null 
            ? mat.quantity 
            : (mat.qty !== undefined && mat.qty !== null ? mat.qty : 1);
          
          const st = getMaterialStocksGroup(cleanNom, mat.materialCode);

          const stockVals = activeWhList.map(w => {
            let v = 0;
            if (w.id === 'all') v = st.all;
            else if (w.id === 'whAssembly') v = st.whAssembly;
            else if (w.id === 'whPkg') v = st.whPkg;
            else if (w.id === 'whRepairSemi') v = st.whRepairSemi;
            else if (w.id === 'whRepairBoard') v = st.whRepairBoard;
            else if (w.id === 'whHardTest') v = st.whHardTest;
            return v > 0 ? v : 0;
          });

          const sfgVals = !showSfgCols ? [] : (() => {
            if (!isSfg) return ['', '', '', ''];
            const up = resolveUpstreamSfgEntry(cleanNom, it.stage, sfgLookupIndex, it.productName1C);
            if (!up) return [escapeCsv('Chưa có'), '', '', ''];
            return [escapeCsv(up.stage), Math.round(up.planQty), Math.round(up.factQty), Math.round(up.gapQty)];
          })();

          csv += [
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            escapeCsv(mat.materialCode),
            escapeCsv(cleanNom),
            qtyVal,
            escapeCsv(cat),
            ...sfgVals,
            ...stockVals
          ].join(',') + '\n';
        });
      } else {
        const fgSt = getMaterialStocksGroup(it.productName1C, it.specCode);
        const fgStockVals = activeWhList.map(w => {
          let v = 0;
          if (w.id === 'all') v = fgSt.all > 0 ? fgSt.all : (it.stock1C || 0);
          else if (w.id === 'whAssembly') v = fgSt.whAssembly;
          else if (w.id === 'whPkg') v = fgSt.whPkg;
          else if (w.id === 'whRepairSemi') v = fgSt.whRepairSemi;
          else if (w.id === 'whRepairBoard') v = fgSt.whRepairBoard;
          else if (w.id === 'whHardTest') v = fgSt.whHardTest;
          return v > 0 ? v : 0;
        });

        csv += [
          idx + 1,
          escapeCsv(it.stage),
          escapeCsv(it.model),
          escapeCsv(it.productName1C),
          it.planQty || 0,
          it.factQty || 0,
          it.gapQty || 0,
          escapeCsv(displaySpecCode),
          escapeCsv(lastStepVal),
          '',
          '',
          '',
          '',
          ...(showSfgCols ? ['', '', '', ''] : []),
          ...fgStockVals
        ].join(',') + '\n';
      }
    });

    const fromClean = fromDate.replace(/-/g, '');
    const toClean = toDate.replace(/-/g, '');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WIP_Control_BOM_${fromClean}_to_${toClean}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.showToast) {
      window.showToast('success', `📊 Đã xuất ${result.items.length.toLocaleString('vi-VN')} bản ghi WIP & BOM (${toVnDate(fromDate)} → ${toVnDate(toDate)}) ra file Google Sheets CSV!`);
    }
  };

  // Giữ alias cho tương thích ngược
  window.handleExportWipCSV = window.handleExportWipGoogleSheet;

  // Lắng nghe click bên ngoài để tự động đóng dropdown chọn công đoạn & chọn kho
  if (typeof document !== 'undefined' && !window.__wipClickOutsideBound) {
    window.__wipClickOutsideBound = true;
    document.addEventListener('click', function(e) {
      const stageContainer = document.getElementById('wipStageMultiSelectContainer');
      const stageMenu = document.getElementById('wipStageMultiSelectMenu');
      if (stageMenu && stageMenu.style.display === 'block') {
        if (stageContainer && !stageContainer.contains(e.target)) {
          stageMenu.style.display = 'none';
        }
      }

      const whContainer = document.getElementById('wipWhMultiSelectContainer');
      const whMenu = document.getElementById('wipWhMultiSelectMenu');
      if (whMenu && whMenu.style.display === 'block') {
        if (whContainer && !whContainer.contains(e.target)) {
          whMenu.style.display = 'none';
        }
      }
    });
  }

  // ==========================================
  // HANDLERS CHO CHẾ ĐỘ "TRA CỨU SFG" & CỘT SFG
  // ==========================================

  window.setWipSubView = function(view) {
    window.WipStore.activeSubView = view === 'SFG_LOOKUP' ? 'SFG_LOOKUP' : 'TABLE';
    window.renderWipControlView();
  };

  window.toggleWipSfgColumns = function() {
    window.WipStore.showSfgColumns = !(window.WipStore.showSfgColumns !== false);
    window.renderWipControlView();
    if (window.showToast) {
      window.showToast(
        'info',
        window.WipStore.showSfgColumns
          ? 'Đã bật 4 cột Tra cứu SFG (Công Đoạn - Kế Hoạch - Thực Tế - Gap) bên cạnh cột Catagory.'
          : 'Đã ẩn 4 cột Tra cứu SFG trong bảng WIP.'
      );
    }
  };

  window.openSfgLookupFromRow = function(sfgNomen, upstreamStage) {
    window.WipStore.activeSubView = 'SFG_LOOKUP';
    window.WipStore.sfgStageFilter = 'ALL';
    window.WipStore.sfgGapFilter = 'ALL';
    window.WipStore.sfgSearch = String(sfgNomen || '').trim();
    window.renderWipControlView();
    if (window.showToast) {
      window.showToast('info', `Đang truy vết chuỗi SFG cho "${window.WipStore.sfgSearch}" (${upstreamStage || 'Công đoạn trước'}).`);
    }
  };

  window.openWipTableFromSfgChain = function(stage, productName1C) {
    window.WipStore.activeSubView = 'TABLE';
    window.WipStore.stageFilter = stage || 'ALL';
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.statusFilter = 'ALL';
    window.WipStore.gapFilter = 'ALL';
    window.WipStore.search = String(productName1C || '').trim();
    window.WipStore.pageIndex = 0;
    window.renderWipControlView();
    const container = document.getElementById('wipContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.handleWipSfgStageChange = function(val) {
    window.WipStore.sfgStageFilter = val || 'ALL';
    window.renderWipControlView();
  };

  window.handleWipSfgGapChange = function(val) {
    window.WipStore.sfgGapFilter = val || 'ALL';
    window.renderWipControlView();
  };

  window.handleWipSfgSortChange = function(val) {
    window.WipStore.sfgSortBy = val || 'GAP_ASC';
    window.renderWipControlView();
  };

  let wipSfgSearchDebounceTimer = null;
  window.handleWipSfgSearch = function(val) {
    window.WipStore.sfgSearch = val || '';
    saveWipStoreState();
    clearTimeout(wipSfgSearchDebounceTimer);
    wipSfgSearchDebounceTimer = setTimeout(() => {
      window.renderWipControlView();
    }, 220);
  };

  window.handleWipSfgReset = function() {
    const defaultRange = getDefaultWipDateRange();
    window.WipStore.sfgStageFilter = 'ALL';
    window.WipStore.sfgGapFilter = 'HAS_GAP';
    window.WipStore.sfgSortBy = 'GAP_ASC';
    window.WipStore.sfgSearch = '';
    window.WipStore.fromDate = defaultRange.fromDate;
    window.WipStore.toDate = defaultRange.toDate;
    window.WipStore.date = defaultRange.toDate;
    saveWipStoreState();
    window.renderWipControlView();
    if (window.showToast) window.showToast('info', 'Đã đặt lại bộ lọc Tra cứu SFG về mặc định!');
  };

  window.handleCopySfgChainForGoogleSheet = function() {
    if (!window.AppStore || typeof window.AppStore.getWipControlData !== 'function') return;
    const defaultRange = getDefaultWipDateRange();
    const curFromDate = window.WipStore.fromDate || defaultRange.fromDate;
    const curToDate = window.WipStore.toDate || defaultRange.toDate;
    const curDate = window.WipStore.date || curToDate;

    const { results } = collectSfgLookupChains(curFromDate, curToDate, curDate);
    if (!results || results.length === 0) {
      if (window.showToast) window.showToast('warning', 'Không có chuỗi SFG nào để sao chép!');
      return;
    }

    const clean = (v) => String(v || '').replace(/[\t\r\n]/g, ' ').trim();
    const headers = [
      'STT',
      'Cấp Truy Vết',
      'Công Đoạn',
      'Model / Mã SFG (1C)',
      'Mã NL / Spec',
      'Định Mức',
      'KẾ HOẠCH (PLAN)',
      'THỰC TẾ (FACT)',
      'CHÊNH LỆCH (GAP)',
      'TỔNG TỒN 1C'
    ];
    const rows = [headers.join('\t')];
    let totalLines = 0;

    results.forEach((entry, idx) => {
      const it = entry.root;
      const rootSpec = (it.specCode || it.rawSpecCode || '').replace(/^0+/, '') || '—';
      const fgSt = getMaterialStocksGroup(it.productName1C, it.specCode);
      const fgStockAll = fgSt.all > 0 ? fgSt.all : (it.stock1C || 0);
      totalLines++;
      rows.push([
        idx + 1,
        'Cấp 0 (Gốc)',
        clean(it.stage),
        clean(it.productName1C),
        clean(rootSpec),
        1,
        Math.round(it.planQty || 0),
        Math.round(it.factQty || 0),
        Math.round(it.gapQty || 0),
        Math.round(fgStockAll)
      ].join('\t'));

      (entry.chain || []).forEach(step => {
        const res = step.resolved;
        const stInfo = getMaterialStocksGroup(step.nomenclature, step.materialCode);
        const childSpec = res && (res.specCode || res.rawSpecCode) ? (res.specCode || res.rawSpecCode).replace(/^0+/, '') : '';
        totalLines++;
        rows.push([
          '',
          `Cấp ${step.depth} (Trước ${clean(step.parentStage)})`,
          res ? clean(res.stage) : 'Chưa có ĐM',
          clean(step.nomenclature),
          clean(step.materialCode || childSpec || '—'),
          step.qtyPerUnit || 1,
          res ? Math.round(res.planQty || 0) : '',
          res ? Math.round(res.factQty || 0) : '',
          res ? Math.round(res.gapQty || 0) : '',
          Math.round(stInfo.all || 0)
        ].join('\t'));
      });
    });

    const tsvContent = rows.join('\n');
    const msg = `📋 Đã copy ${results.length.toLocaleString('vi-VN')} chuỗi SFG (${totalLines.toLocaleString('vi-VN')} dòng truy vết)! Mở Google Sheet và nhấn Ctrl+V (Cmd+V).`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent).then(() => {
        if (window.showToast) window.showToast('success', msg);
      }).catch(() => legacyCopy(tsvContent, msg));
    } else {
      legacyCopy(tsvContent, msg);
    }
  };

  /**
   * Helper copy to clipboard
   */
  window.copyToClipboard = function(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
    if (!text || text === '-') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast('success', successMsg);
      }).catch(() => {
        legacyCopy(text, successMsg);
      });
    } else {
      legacyCopy(text, successMsg);
    }
  };

  function legacyCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (window.showToast) window.showToast('success', successMsg);
    } catch (e) {}
    document.body.removeChild(ta);
  }

})();
