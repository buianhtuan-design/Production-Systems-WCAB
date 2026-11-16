/**
 * ====================================================================
 * KẾ HOẠCH ĐIỀU CHỈNH OVERTIME (ĐA CÔNG ĐOẠN - MULTI-PROCESS OVERTIME PLANNING)
 * ====================================================================
 * - Đồng bộ 100% với dữ liệu phần "1. TÌNH TRẠNG NHÂN LỰC & CÂN ĐỐI CA"
 * - Hỗ trợ lập kế hoạch điều chỉnh làm thêm (OT) cho tất cả các công đoạn:
 *   + ASSEMBLY (12 Lines: 1A, 2A, 3A, 1B, 2B, 3B, 1C, 2C, 3C, 1D, 2D, 3D)
 *   + HARD TEST (8 Lines: 1A, 2A, 1B, 2B, 1C, 2C, 1D, 2D)
 *   + OPTICS ASM, A IMP ASM, FOCUS, LONG TEST, TEST ROOM, QC, PKG, COM PKG, COM PKG AUTO, MB
 * - BỐ TRÍ THỨ TỰ BẢNG TỐI ƯU THEO YÊU CẦU:
 *   + Đưa 4 hàng chỉ số (Chênh Lệch / Ca, Chênh Lệch / Ngày, Số Line OT, Số Người OT) lên trên,
 *     ngay bên dưới hàng "2b. Thực Tế Có Số Line"
 *   + Các dòng Line chi tiết hiển thị bên dưới khối chỉ tiêu tổng quan
 * - CHỨC NĂNG CHỌN CÔNG ĐOẠN LINH HOẠT TRỰC TIẾP TRÊN THANH TIÊU ĐỀ
 * - ĐỊNH MỨC & CẤU HÌNH:
 *   + Số người từng Line lấy theo dữ liệu "Cấu Hình Line & Định Mức Nhân Lực" (window.MANPOWER_MASTER_DATA)
 *   + Đồng bộ Line Hành Chính (3D) theo cấu hình workShift (Ca Ngày) và workingDays (T2-T6)
 * - QUY TẮC AN TOÀN LAO ĐỘNG: 1 Line không được làm việc liên tục > 5 ngày (Bao gồm ca chính + ca OT)
 * - TÍCH HỢP CỘT TỔNG CỘNG Ở BÊN TRÁI (Cạnh Cột 1):
 *   + Hiển thị "OT X" (Ví dụ: OT 1, OT 2), nếu 0 OT thì để trống
 * - HEADER ĐƠN GIẢN CHUẨN CONCEPT (KÍP VÀNG / NGÀY / CA DAY-NIGHT)
 *   + Đóng băng từ hàng CA trở xuống và đóng băng cột TỔNG
 * - CHỨC NĂNG LẬP KẾ HOẠCH & ĐỒNG BỘ ĐA NGƯỜI DÙNG:
 *   + Người lập Plan, Ngày lập Plan, Lưu Tạm, Hoàn Thành, Đồng Bộ Plan, Lịch Sử Plan
 */

(function() {
  'use strict';

  // ====================================================================
  // 1. CẤU HÌNH CÁC CÔNG ĐOẠN SẢN XUẤT (STAGE CONFIGURATIONS)
  // ====================================================================
  const STAGE_CONFIGS = {
    'ASSEMBLY': {
      id: 'ASSEMBLY',
      name: '🔧 ASSEMBLY',
      shortName: 'Assembly',
      lines: [
        '1A', '2A', '3A',
        '1B', '2B', '3B',
        '1C', '2C', '3C',
        '1D', '2D', '3D'
      ],
      standardStaffing: 14.0,
      standardTotal: 19.0,
      hasHcLine: true,
      hcLineId: '3D'
    },
    'HARD TEST': {
      id: 'HARD TEST',
      name: '🔬 HARD TEST',
      shortName: 'Hard Test',
      lines: ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D'],
      standardStaffing: 12.0,
      standardTotal: 13.0,
      hasHcLine: false
    },
    'OPTICS ASM': {
      id: 'OPTICS ASM',
      name: '🔭 OPTICS ASM',
      shortName: 'Optics ASM',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 3.0,
      hasHcLine: false
    },
    'A IMP ASM': {
      id: 'A IMP ASM',
      name: '⚙️ A IMP ASM',
      shortName: 'A Imp ASM',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 2.0,
      standardTotal: 2.0,
      hasHcLine: false
    },
    'FOCUS': {
      id: 'FOCUS',
      name: '🎯 FOCUS',
      shortName: 'Focus',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 3.0,
      hasHcLine: false
    },
    'LONG TEST': {
      id: 'LONG TEST',
      name: '⏱️ LONG TEST',
      shortName: 'Long Test',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 3.0,
      hasHcLine: false
    },
    'TEST ROOM': {
      id: 'TEST ROOM',
      name: '🌡️ TEST ROOM',
      shortName: 'Test Room',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 3.0,
      hasHcLine: false
    },
    'QC': {
      id: 'QC',
      name: '🔍 QC',
      shortName: 'QC',
      lines: ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D'],
      standardStaffing: 7.0,
      standardTotal: 8.0,
      hasHcLine: false
    },
    'PKG': {
      id: 'PKG',
      name: '📦 PKG',
      shortName: 'PKG',
      lines: ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D'],
      standardStaffing: 9.0,
      standardTotal: 10.0,
      hasHcLine: false
    },
    'COM PKG': {
      id: 'COM PKG',
      name: '📦 COM PKG',
      shortName: 'COM PKG',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 4.0,
      standardTotal: 5.0,
      hasHcLine: false
    },
    'COM PKG AUTO': {
      id: 'COM PKG AUTO',
      name: '🤖 COM PKG AUTO',
      shortName: 'COM PKG AUTO',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 4.0,
      hasHcLine: false
    },
    'MB': {
      id: 'MB',
      name: '💻 MB',
      shortName: 'MB',
      lines: ['1A', '1B', '1C', '1D'],
      standardStaffing: 3.0,
      standardTotal: 3.0,
      hasHcLine: false
    }
  };

  const DEFAULT_STAGE = 'ASSEMBLY';
  const SELECTED_STAGE_KEY = 'AJAX_OVERTIME_ADJ_SELECTED_STAGE';
  const COLLAPSED_KEY = 'AJAX_ASSEMBLY_ADJUSTMENT_COLLAPSED';
  const DATE_VIEW_KEY = 'AJAX_ASSEMBLY_ADJUSTMENT_DATE_VIEW';
  const PLANNER_KEY = 'AJAX_ASSEMBLY_ADJ_PLANNER';
  const PLAN_DATE_KEY = 'AJAX_ASSEMBLY_ADJ_DATE';
  const HISTORY_KEY = 'AJAX_ASSEMBLY_ADJ_HISTORY';
  const LATEST_SYNC_KEY = 'AJAX_ASSEMBLY_ADJ_LATEST_SYNC';

  function getTodayFormatted() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function getStageStorageKey(stage) {
    const s = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    return (s === 'ASSEMBLY') ? 'AJAX_ASSEMBLY_ADJUSTMENT_PLAN' : `AJAX_OVERTIME_ADJ_${s}`;
  }

  // Dữ liệu mẫu khởi tạo ban đầu cho Assembly khớp 100% Concept người dùng (17/11 - 19/11/2026)
  function getSampleDefaultOtMap(stage) {
    const s = stage || DEFAULT_STAGE;
    if (s === 'ASSEMBLY') {
      return {
        '11/18/2026_Night': ['1C', '3C'],
        '2026-11-18_Night': ['1C', '3C'],
        '11/19/2026_Day': ['1D', '2D'],
        '2026-11-19_Day': ['1D', '2D'],
        '11/19/2026_Night': ['2C'],
        '2026-11-19_Night': ['2C']
      };
    }
    return {};
  }

  function loadStoredOtMap(stage) {
    const s = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const key = getStageStorageKey(s);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return getSampleDefaultOtMap(s);
  }

  function saveStoredOtMap(map, stage) {
    const s = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const key = getStageStorageKey(s);
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {}
  }

  function loadHistoryPlans() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  function saveHistoryPlans(hist) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch (e) {}
  }

  // Khởi tạo Stage đã chọn từ Storage hoặc default
  const initialStage = localStorage.getItem(SELECTED_STAGE_KEY) || DEFAULT_STAGE;
  const validStage = STAGE_CONFIGS[initialStage] ? initialStage : DEFAULT_STAGE;

  // Store toàn cục quản lý Kế Hoạch Điều Chỉnh Overtime
  window.AssemblyAdjustmentStore = {
    selectedStage: validStage,
    otMap: loadStoredOtMap(validStage),
    isCollapsed: localStorage.getItem(COLLAPSED_KEY) === 'true',
    dateViewMode: localStorage.getItem(DATE_VIEW_KEY) || 'ACTIVE_SCHEDULE',
    plannerName: localStorage.getItem(PLANNER_KEY) || (window.AppStore?.simPlannerName || 'Lê Ngọc Duy GLD'),
    planDate: localStorage.getItem(PLAN_DATE_KEY) || getTodayFormatted(),
    history: loadHistoryPlans()
  };

  // BroadcastChannel cho phép đồng bộ thời gian thực giữa các tab / user
  let adjSyncChannel = null;
  try {
    adjSyncChannel = new BroadcastChannel('AJAX_ASSEMBLY_ADJUSTMENT_SYNC');
    adjSyncChannel.onmessage = function(ev) {
      if (ev && ev.data && ev.data.type === 'ADJUSTMENT_PLAN_COMPLETED' && ev.data.plan) {
        handleIncomingAdjPlan(ev.data.plan, false);
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported for adjustment sync:', e);
  }

  // Cross-tab fallback qua localStorage storage event
  window.addEventListener('storage', (ev) => {
    if (ev && ev.key === LATEST_SYNC_KEY && ev.newValue) {
      try {
        const payload = JSON.parse(ev.newValue);
        if (payload && payload.plan) {
          handleIncomingAdjPlan(payload.plan, false);
        }
      } catch (e) {}
    }
  });

  const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/buianhtuan-design/Production-Systems-WCAB/main/';

  async function safeFetchJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res || !res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function fetchRemoteOvertimeBundle() {
    const bust = Date.now();
    const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    
    // 1. Thử gọi API server local (/api/overtime-adjustment) nếu không phải GitHub Pages
    const apiPromise = !isGh
      ? safeFetchJson('/api/overtime-adjustment?t=' + bust)
      : Promise.resolve(null);
    
    // 2. Thử đọc static files ./overtime_adjustment_latest.json & history
    const staticLatestPromise = safeFetchJson('./overtime_adjustment_latest.json?t=' + bust);
    const staticHistPromise = safeFetchJson('./overtime_adjustment_history.json?t=' + bust);
    
    // 3. Fallback raw GitHub nếu trên GitHub Pages hoặc static bị miss
    const rawLatestPromise = isGh
      ? safeFetchJson(RAW_GITHUB_BASE + 'overtime_adjustment_latest.json?t=' + bust)
      : Promise.resolve(null);
    const rawHistPromise = isGh
      ? safeFetchJson(RAW_GITHUB_BASE + 'overtime_adjustment_history.json?t=' + bust)
      : Promise.resolve(null);

    const [apiData, staticLatest, staticHist, rawLatest, rawHist] = await Promise.all([
      apiPromise, staticLatestPromise, staticHistPromise, rawLatestPromise, rawHistPromise
    ]);

    let latestPlan = null;
    let historyList = [];

    if (apiData && apiData.success) {
      if (apiData.latestPlan && apiData.latestPlan.id) latestPlan = apiData.latestPlan;
      if (Array.isArray(apiData.history)) historyList = apiData.history;
    }

    const candidates = [latestPlan, staticLatest, rawLatest].filter(p => p && p.id);
    if (candidates.length > 0) {
      candidates.sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
      latestPlan = candidates[0];
    }

    const histMap = new Map();
    [historyList, staticHist, rawHist].forEach(list => {
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (item && item.id) histMap.set(item.id, item);
        });
      }
    });
    if (latestPlan && latestPlan.id) {
      histMap.set(latestPlan.id, latestPlan);
    }
    const mergedHistory = Array.from(histMap.values()).sort(
      (a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0)
    );

    return {
      success: !!latestPlan,
      latestPlan,
      history: mergedHistory
    };
  }

  function handleIncomingAdjPlan(remotePlan, isManual, optionalHistory) {
    if (!remotePlan) return;
    const store = window.AssemblyAdjustmentStore;

    // 1. Cập nhật tất cả các công đoạn nếu remotePlan có allStagesOtMap
    if (remotePlan.allStagesOtMap && typeof remotePlan.allStagesOtMap === 'object') {
      Object.keys(remotePlan.allStagesOtMap).forEach(stg => {
        const m = remotePlan.allStagesOtMap[stg];
        if (m && typeof m === 'object') {
          saveStoredOtMap(m, stg);
        }
      });
    }

    const incomingStage = remotePlan.stage || store.selectedStage || DEFAULT_STAGE;
    if (remotePlan.otMap && typeof remotePlan.otMap === 'object') {
      saveStoredOtMap(remotePlan.otMap, incomingStage);
    }

    // Nếu người dùng đang xem đúng công đoạn này
    if (store.selectedStage === incomingStage && remotePlan.otMap) {
      store.otMap = { ...remotePlan.otMap };
    } else {
      store.otMap = loadStoredOtMap(store.selectedStage);
    }

    if (remotePlan.planner) {
      store.plannerName = remotePlan.planner;
      localStorage.setItem(PLANNER_KEY, remotePlan.planner);
    }
    if (remotePlan.planDate) {
      store.planDate = remotePlan.planDate;
      localStorage.setItem(PLAN_DATE_KEY, remotePlan.planDate);
    }

    // Cập nhật Lịch Sử
    if (Array.isArray(optionalHistory) && optionalHistory.length > 0) {
      store.history = optionalHistory;
      saveHistoryPlans(store.history);
    } else if (remotePlan.id) {
      if (!Array.isArray(store.history)) store.history = [];
      if (!store.history.find(h => h.id === remotePlan.id)) {
        store.history.unshift(remotePlan);
        if (store.history.length > 30) store.history = store.history.slice(0, 30);
        saveHistoryPlans(store.history);
      }
    }

    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
    if (window.showToast && !isManual) {
      const stageName = STAGE_CONFIGS[incomingStage]?.name || incomingStage;
      window.showToast('info', `🔔 Đã đồng bộ Kế Hoạch Điều Chỉnh [${stageName}] từ [${remotePlan.planner || 'User'}] (${remotePlan.planDate || ''})!`);
    }
  }

  /**
   * Lấy cấu hình Master Manpower từ window.MANPOWER_MASTER_DATA hoặc default
   */
  function getMasterManpowerConfig() {
    if (window.MANPOWER_MASTER_DATA && typeof window.MANPOWER_MASTER_DATA === 'object') {
      return window.MANPOWER_MASTER_DATA;
    }
    if (typeof window.getStandardManpowerDefaults === 'function') {
      return window.getStandardManpowerDefaults();
    }
    return {};
  }

  /**
   * Lấy định mức nhân lực của từng Line từ Cấu Hình Line & Định Mức Nhân Lực
   * @param {string} lineName - Mã line (ví dụ: '1A', '2B', '3D'...)
   * @param {string} stage - Mã công đoạn (ASSEMBLY, HARD TEST...)
   * @returns { direct: number, total: number, owningKip: string }
   */
  function getLineStaffingConfig(lineName, stage) {
    const stageId = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const master = getMasterManpowerConfig();

    if (stageId === 'ASSEMBLY') {
      for (const code of ['A', 'B', 'C', 'D', 'HC']) {
        const k = master[code];
        if (!k) continue;

        if (k.assyLinesDirect && k.assyLinesDirect[lineName] !== undefined) {
          const d = parseFloat(k.assyLinesDirect[lineName]) || 14.0;
          const t = (k.assyLinesTotal && k.assyLinesTotal[lineName] !== undefined)
            ? (parseFloat(k.assyLinesTotal[lineName]) || 19.0)
            : 19.0;
          return { owningKip: code, direct: d, total: t };
        }

        if (Array.isArray(k.lines) && k.lines.includes(lineName)) {
          const d = (k.assyLinesDirect && k.assyLinesDirect[lineName] !== undefined)
            ? (parseFloat(k.assyLinesDirect[lineName]) || 14.0)
            : 14.0;
          const t = (k.assyLinesTotal && k.assyLinesTotal[lineName] !== undefined)
            ? (parseFloat(k.assyLinesTotal[lineName]) || 19.0)
            : 19.0;
          return { owningKip: code, direct: d, total: t };
        }
      }

      // Fallback Assembly
      let owningKip = 'A';
      if (lineName.endsWith('B')) owningKip = 'B';
      else if (lineName.endsWith('C')) owningKip = 'C';
      else if (lineName.endsWith('D')) owningKip = (lineName === '3D') ? 'HC' : 'D';

      const defaultDirect = (lineName === '3D') ? 13.0 : 14.0;
      const defaultTotal = (lineName === '3D') ? 18.0 : 19.0;
      return { owningKip, direct: defaultDirect, total: defaultTotal };
    }

    if (stageId === 'HARD TEST') {
      let owningKip = 'A';
      if (lineName.endsWith('B')) owningKip = 'B';
      else if (lineName.endsWith('C')) owningKip = 'C';
      else if (lineName.endsWith('D')) owningKip = 'D';

      const k = master[owningKip] || {};
      const htDir = parseFloat(k.htDirect) || 24.0;
      const htTot = parseFloat(k.htTotal) || 26.0;
      // Hard Test chia 2 line mỗi kíp (1A/2A, 1B/2B, 1C/2C, 1D/2D)
      const d = Math.round((htDir / 2.0) * 10) / 10;
      const t = Math.round((htTot / 2.0) * 10) / 10;
      return { owningKip, direct: d, total: t };
    }

    // Các công đoạn khác
    const cfg = STAGE_CONFIGS[stageId] || STAGE_CONFIGS[DEFAULT_STAGE];
    let owningKip = 'A';
    if (lineName.endsWith('B')) owningKip = 'B';
    else if (lineName.endsWith('C')) owningKip = 'C';
    else if (lineName.endsWith('D')) owningKip = 'D';

    const d = cfg.standardStaffing || 3.0;
    const t = cfg.standardTotal || (d + 1.0);
    return { owningKip, direct: d, total: t };
  }

  /**
   * Chuẩn hóa khóa ngày dạng YYYY-MM-DD
   */
  function normalizeDateKey(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        let [m, d, y] = parts;
        if (m.length === 4) { [y, m, d] = parts; }
        return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return s;
  }

  /**
   * Định dạng ngày hiển thị DD/MM/YYYY
   */
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const norm = normalizeDateKey(dateStr);
    const parts = norm.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Dịch chuyển ngày dạng YYYY-MM-DD theo số ngày offset (+/-)
   */
  function shiftDateStr(dateStr, offsetDays) {
    const norm = normalizeDateKey(dateStr);
    const parts = norm.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d + offsetDays);
    const rY = dt.getFullYear();
    const rM = String(dt.getMonth() + 1).padStart(2, '0');
    const rD = String(dt.getDate()).padStart(2, '0');
    return `${rY}-${rM}-${rD}`;
  }

  /**
   * Xác định danh sách các Line hoạt động chính thức (tiêu chuẩn) cho 1 ca theo từng công đoạn
   */
  function getStandardWorkingLines(dateStr, shift, stage) {
    const stageId = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const rot = (typeof window.getShiftRotation === 'function') 
      ? window.getShiftRotation(dateStr) 
      : { day: 'A', night: 'B' };
    
    const kip = (shift === 'Night') ? rot.night : rot.day;

    if (stageId === 'ASSEMBLY') {
      const master = getMasterManpowerConfig();
      const kipConfig = master[kip];
      let workingLines = [];

      // 1. Line theo Kíp trực on-duty
      if (kipConfig && kipConfig.assyLinesDirect) {
        workingLines = Object.keys(kipConfig.assyLinesDirect);
      } else if (kipConfig && Array.isArray(kipConfig.lines)) {
        workingLines = [...kipConfig.lines];
      } else {
        if (kip === 'A') workingLines = ['1A', '2A', '3A'];
        else if (kip === 'B') workingLines = ['1B', '2B'];
        else if (kip === 'C') workingLines = ['1C', '2C', '3C'];
        else if (kip === 'D') workingLines = ['1D', '2D'];
      }

      // 2. Line Hành Chính (HC, mặc định Line 3D):
      const hcConfig = master.HC || {};
      const hcLines = (hcConfig.assyLinesDirect ? Object.keys(hcConfig.assyLinesDirect) : (hcConfig.lines || ['3D']));
      const hcShift = hcConfig.workShift || 'Day';
      const hcDays = hcConfig.workingDays || 'Mon-Fri';

      const normDate = normalizeDateKey(dateStr);
      const parts = normDate.split('-');
      if (parts.length === 3) {
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayOfWeek = dObj.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
        
        let isHcWorkDay = false;
        if (hcDays === 'Mon-Fri') isHcWorkDay = (dayOfWeek >= 1 && dayOfWeek <= 5);
        else if (hcDays === 'Mon-Sat') isHcWorkDay = (dayOfWeek >= 1 && dayOfWeek <= 6);
        else isHcWorkDay = true;

        if (shift === hcShift && isHcWorkDay) {
          hcLines.forEach(lId => {
            if (!workingLines.includes(lId)) {
              workingLines.push(lId);
            }
          });
        }
      }

      return { kip, workingLines };
    }

    // Các công đoạn khác: lấy line có hậu tố kíp on-duty
    const cfg = STAGE_CONFIGS[stageId] || STAGE_CONFIGS[DEFAULT_STAGE];
    const allLines = cfg.lines || [];
    const workingLines = allLines.filter(l => l.endsWith(kip));
    return { kip, workingLines };
  }

  /**
   * Lấy danh sách line OT đã phân bổ cho 1 ca theo công đoạn
   */
  function getAssignedOtLines(dateStr, shift, stage, customOtMap) {
    const store = window.AssemblyAdjustmentStore;
    const stageId = stage || store.selectedStage || DEFAULT_STAGE;
    const map = customOtMap || store.otMap || {};
    const norm = normalizeDateKey(dateStr);
    const raw = String(dateStr).trim();
    
    const key1 = `${norm}_${shift}`;
    const key2 = `${raw}_${shift}`;
    
    const list = map[key1] || map[key2] || [];
    return Array.isArray(list) ? [...list] : [];
  }

  /**
   * Kiểm tra xem 1 Line có làm việc (chính thức hoặc OT) trong ngày dateStr hay không
   */
  function isLineWorkingOnCalendarDate(lineName, dateStr, otMap, stage) {
    const stageId = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    // 1. Ca Ngày chính thức
    const dayStd = getStandardWorkingLines(dateStr, 'Day', stageId);
    if (dayStd.workingLines.includes(lineName)) return true;

    // 2. Ca Đêm chính thức
    const nightStd = getStandardWorkingLines(dateStr, 'Night', stageId);
    if (nightStd.workingLines.includes(lineName)) return true;

    // 3. Ca Ngày OT
    const otDay = getAssignedOtLines(dateStr, 'Day', stageId, otMap);
    if (otDay.includes(lineName)) return true;

    // 4. Ca Đêm OT
    const otNight = getAssignedOtLines(dateStr, 'Night', stageId, otMap);
    if (otNight.includes(lineName)) return true;

    return false;
  }

  /**
   * QUY TẮC AN TOÀN: 1 LINE KHÔNG ĐƯỢC LÀM VIỆC LIÊN TỤC > 5 NGÀY
   */
  function checkConsecutiveWorkingDays(lineName, targetDateStr, targetShift, currentOtMap, stage) {
    const stageId = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const normTarget = normalizeDateKey(targetDateStr);
    
    // Tạo bản đồ OT thử nghiệm khi thêm target OT
    const testOtMap = JSON.parse(JSON.stringify(currentOtMap || {}));
    const targetKey = `${normTarget}_${targetShift}`;
    if (!Array.isArray(testOtMap[targetKey])) testOtMap[targetKey] = [];
    if (!testOtMap[targetKey].includes(lineName)) {
      testOtMap[targetKey].push(lineName);
    }

    // Đếm số ngày làm việc liên tục ngay trước ngày mục tiêu
    let streakBefore = 0;
    let firstDate = normTarget;
    for (let i = 1; i <= 14; i++) {
      const prevDate = shiftDateStr(normTarget, -i);
      if (isLineWorkingOnCalendarDate(lineName, prevDate, testOtMap, stageId)) {
        streakBefore++;
        firstDate = prevDate;
      } else {
        break;
      }
    }

    // Đếm số ngày làm việc liên tục ngay sau ngày mục tiêu
    let streakAfter = 0;
    let lastDate = normTarget;
    for (let i = 1; i <= 14; i++) {
      const nextDate = shiftDateStr(normTarget, i);
      if (isLineWorkingOnCalendarDate(lineName, nextDate, testOtMap, stageId)) {
        streakAfter++;
        lastDate = nextDate;
      } else {
        break;
      }
    }

    const totalConsecutive = streakBefore + 1 + streakAfter;
    if (totalConsecutive > 5) {
      return {
        allowed: false,
        consecutiveDays: totalConsecutive,
        firstDate: formatDateDisplay(firstDate),
        lastDate: formatDateDisplay(lastDate)
      };
    }

    return {
      allowed: true,
      consecutiveDays: totalConsecutive,
      firstDate: formatDateDisplay(firstDate),
      lastDate: formatDateDisplay(lastDate)
    };
  }

  /**
   * Helper tìm giá trị manpower trong object daily với nhiều biến thể định dạng ngày
   */
  function getDailyManpowerValue(dailyObj, dateStr, suffix) {
    if (!dailyObj || typeof dailyObj !== 'object') return undefined;
    const norm = normalizeDateKey(dateStr); // YYYY-MM-DD
    const raw = String(dateStr).trim();
    const parts = norm.split('-');
    const mNum = parseInt(parts[1], 10);
    const dNum = parseInt(parts[2], 10);
    const y = parts[0];
    const mdy1 = `${mNum}/${dNum}/${y}`;
    const mdy2 = `${parts[1]}/${parts[2]}/${y}`;

    const variants = [
      `${raw}${suffix}`,
      `${mdy1}${suffix}`,
      `${mdy2}${suffix}`,
      `${norm}${suffix}`
    ];

    for (const k of variants) {
      if (dailyObj[k] !== undefined && dailyObj[k] !== null && dailyObj[k] !== '') {
        const num = parseFloat(dailyObj[k]);
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  }

  /**
   * Lấy dữ liệu Kế Hoạch Nhân Lực cho 1 ngày cụ thể theo từng công đoạn
   * Đồng bộ 100% với Bảng 1 "TÌNH TRẠNG NHÂN LỰC & CÂN ĐỐI CA"
   */
  function getStagePlanForDate(stageName, dateStr, stageDailyMap) {
    const norm = normalizeDateKey(dateStr);
    const raw = String(dateStr).trim();

    if (stageDailyMap) {
      if (stageDailyMap[norm]) return stageDailyMap[norm];
      if (stageDailyMap[raw]) return stageDailyMap[raw];
    }

    const matchStage = (s) => {
      if (!s) return false;
      if (s.stage === stageName || s.saveStage === stageName) return true;
      if (stageName === 'HARD TEST' && (s.isHardtestGroup || s.stage === 'SUM HARDTEST' || s.saveStage === 'HARDTEST_TOTAL')) return true;
      return false;
    };

    const stages = window.__LATEST_MP_STAGES__ || [];
    const foundStage = stages.find(matchStage);
    if (foundStage && Array.isArray(foundStage.daily)) {
      const found = foundStage.daily.find(d => normalizeDateKey(d.date) === norm || d.date === raw);
      if (found) {
        const planDay = (typeof found.peopleDay === 'number') ? found.peopleDay : Math.round((found.people || 0) * 0.6 * 10) / 10;
        const planNight = (typeof found.peopleNight === 'number') ? found.peopleNight : Math.round(((found.people || 0) - planDay) * 10) / 10;
        return {
          total: Math.round(((found.people || (planDay + planNight)) || 0) * 10) / 10,
          planDay: Math.round(planDay * 10) / 10,
          planNight: Math.round(planNight * 10) / 10
        };
      }
    }

    const sched = window.__LATEST_SCHEDULE__;
    if (sched && Array.isArray(sched.stageSummaries)) {
      const sTarget = sched.stageSummaries.find(matchStage);
      if (sTarget && Array.isArray(sTarget.daily)) {
        const found = sTarget.daily.find(d => normalizeDateKey(d.date) === norm || d.date === raw);
        if (found) {
          const planDay = (typeof found.peopleDay === 'number') ? found.peopleDay : Math.round((found.people || 0) * 0.6 * 10) / 10;
          const planNight = (typeof found.peopleNight === 'number') ? found.peopleNight : Math.round(((found.people || 0) - planDay) * 10) / 10;
          return {
            total: Math.round(((found.people || (planDay + planNight)) || 0) * 10) / 10,
            planDay: Math.round(planDay * 10) / 10,
            planNight: Math.round(planNight * 10) / 10
          };
        }
      }
    }

    const mpSource = (window.AppStore && window.AppStore.dataMass && window.AppStore.dataMass.manpower)
      ? window.AppStore.dataMass.manpower
      : (window.DEFAULT_DATAMASS_DATA ? window.DEFAULT_DATAMASS_DATA.manpower : null);

    if (Array.isArray(mpSource)) {
      const targetMp = mpSource.find(m => (m.stage === stageName || (stageName === 'HARD TEST' && m.stage === 'SUM HARDTEST')) && m.metric === 'People');
      if (targetMp && targetMp.daily) {
        const valDay = getDailyManpowerValue(targetMp.daily, dateStr, '_Day');
        const valNight = getDailyManpowerValue(targetMp.daily, dateStr, '_Night');
        const valTotal = getDailyManpowerValue(targetMp.daily, dateStr, '');

        if (valDay !== undefined || valNight !== undefined || valTotal !== undefined) {
          const pDay = valDay !== undefined ? valDay : Math.round((valTotal || 0) * 0.6 * 10) / 10;
          const pNight = valNight !== undefined ? valNight : Math.round(((valTotal || 0) - pDay) * 10) / 10;
          return {
            total: Math.round(((valTotal !== undefined ? valTotal : (pDay + pNight)) || 0) * 10) / 10,
            planDay: Math.round(pDay * 10) / 10,
            planNight: Math.round(pNight * 10) / 10
          };
        }
      }
    }

    return { total: 0, planDay: 0, planNight: 0 };
  }

  /**
   * Tính toán toàn bộ các chỉ tiêu của 1 cột (Ngày & Ca)
   */
  function calculateShiftAdjustmentMetrics(dateStr, shift, stageDailyMap, stage) {
    const stageId = stage || window.AssemblyAdjustmentStore?.selectedStage || DEFAULT_STAGE;
    const stageConfig = STAGE_CONFIGS[stageId] || STAGE_CONFIGS[DEFAULT_STAGE];
    const activeLines = stageConfig.lines || STAGE_CONFIGS[DEFAULT_STAGE].lines;

    const { kip, workingLines } = getStandardWorkingLines(dateStr, shift, stageId);
    const assignedOt = getAssignedOtLines(dateStr, shift, stageId);
    
    // Loại bỏ line OT nếu line đó trùng với line đang làm việc chính thức
    const validOtLines = assignedOt.filter(l => !workingLines.includes(l));

    const planData = getStagePlanForDate(stageId, dateStr, stageDailyMap);
    const planValue = (shift === 'Day') ? planData.planDay : planData.planNight;
    const standardDivisor = stageConfig.standardStaffing || 14.0;
    const planLines = Math.round((planValue / standardDivisor) * 10) / 10;

    const normalCount = workingLines.length;
    const otCount = validOtLines.length;
    const totalLines = normalCount + otCount; // 2b. Thực Tế Có Số Line
    const diffLines = Math.round((totalLines - planLines) * 10) / 10; // Chênh Lệch Sau Điều Chỉnh / Ca

    let otPeople = 0;
    validOtLines.forEach(lName => {
      const cfg = getLineStaffingConfig(lName, stageId);
      otPeople += cfg.total;
    });
    otPeople = Math.round(otPeople * 10) / 10;

    const linesStatus = {};
    activeLines.forEach(lineName => {
      const lineCfg = getLineStaffingConfig(lineName, stageId);
      if (workingLines.includes(lineName)) {
        linesStatus[lineName] = { 
          status: 'NORMAL', 
          text: String(Math.round(lineCfg.direct)), 
          directVal: lineCfg.direct,
          totalVal: lineCfg.total,
          isOt: false, 
          isWorking: true 
        };
      } else if (validOtLines.includes(lineName)) {
        linesStatus[lineName] = { 
          status: 'OT', 
          text: 'OT', 
          directVal: lineCfg.direct,
          totalVal: lineCfg.total,
          isOt: true, 
          isWorking: false 
        };
      } else {
        linesStatus[lineName] = { 
          status: 'OFF', 
          text: '', 
          directVal: lineCfg.direct,
          totalVal: lineCfg.total,
          isOt: false, 
          isWorking: false 
        };
      }
    });

    return {
      dateStr,
      shift,
      kip,
      planValue,
      planLines,
      normalCount,
      otCount,
      totalLines,
      diffLines,
      otPeople,
      validOtLines,
      workingLines,
      linesStatus
    };
  }

  /**
   * Xác định danh sách ngày cần hiển thị trong bảng điều chỉnh
   */
  function resolveAdjustmentDates(schedule) {
    const store = window.AssemblyAdjustmentStore;
    const mode = store.dateViewMode || 'ACTIVE_SCHEDULE';

    if (mode === 'ACTIVE_SCHEDULE') {
      if (schedule && Array.isArray(schedule.selectedDates) && schedule.selectedDates.length > 0) {
        return schedule.selectedDates;
      }
      if (schedule && Array.isArray(schedule.dates) && schedule.dates.length > 0) {
        return schedule.dates.slice(0, 7);
      }
    }

    if (mode === 'CONCEPT_WEEK') {
      return [
        '11/17/2026',
        '11/18/2026',
        '11/19/2026',
        '11/20/2026',
        '11/21/2026',
        '11/22/2026',
        '11/23/2026'
      ];
    }

    if (schedule && Array.isArray(schedule.selectedDates) && schedule.selectedDates.length > 0) {
      return schedule.selectedDates;
    }
    return [
      '11/17/2026',
      '11/18/2026',
      '11/19/2026',
      '11/20/2026',
      '11/21/2026',
      '11/22/2026',
      '11/23/2026'
    ];
  }

  /**
   * Chuyển đổi công đoạn cần lập kế hoạch điều chỉnh
   */
  window.handleAdjustmentStageChange = function(newStage) {
    if (!newStage || !STAGE_CONFIGS[newStage]) return;
    const store = window.AssemblyAdjustmentStore;
    store.selectedStage = newStage;
    localStorage.setItem(SELECTED_STAGE_KEY, newStage);
    store.otMap = loadStoredOtMap(newStage);
    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
    if (window.showToast) {
      window.showToast('info', `Đã chuyển Kế Hoạch Điều Chỉnh Overtime sang công đoạn: ${STAGE_CONFIGS[newStage].name}`);
    }
  };

  /**
   * RENDER CHÍNH: KẾ HOẠCH ĐIỀU CHỈNH OVERTIME BÊN DƯỚI BIỂU ĐỒ
   */
  window.renderAssemblyAdjustmentPlan = function(schedule, stagesForManpower) {
    const container = document.getElementById('datamassAssemblyAdjustmentPlanContainer');
    if (!container) return;

    // Lưu vị trí cuộn trước khi re-render để không bị giật / nhảy trang
    const prevWinY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const prevWinX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const prevScrollWrap = container.querySelector('.assembly-adj-scroll-wrap');
    const prevWrapTop = prevScrollWrap ? prevScrollWrap.scrollTop : null;
    const prevWrapLeft = prevScrollWrap ? prevScrollWrap.scrollLeft : null;

    const store = window.AssemblyAdjustmentStore;
    const isCollapsed = Boolean(store.isCollapsed);
    const activeSched = schedule || window.__LATEST_SCHEDULE__;
    const dates = resolveAdjustmentDates(activeSched);

    const activeStageId = store.selectedStage || DEFAULT_STAGE;
    const activeStageConfig = STAGE_CONFIGS[activeStageId] || STAGE_CONFIGS[DEFAULT_STAGE];
    const activeLines = activeStageConfig.lines || STAGE_CONFIGS[DEFAULT_STAGE].lines;

    // Xây dựng bản đồ stageDailyMap
    const stageDailyMap = {};
    const stages = window.__LATEST_MP_STAGES__ || [];
    const matchStage = (s) => {
      if (!s) return false;
      if (s.stage === activeStageId || s.saveStage === activeStageId) return true;
      if (activeStageId === 'HARD TEST' && (s.isHardtestGroup || s.stage === 'SUM HARDTEST' || s.saveStage === 'HARDTEST_TOTAL')) return true;
      return false;
    };

    const currentStageSum = (stagesForManpower || []).find(matchStage)
      || stages.find(matchStage)
      || (activeSched && activeSched.stageSummaries ? activeSched.stageSummaries.find(matchStage) : null);

    if (currentStageSum && Array.isArray(currentStageSum.daily)) {
      currentStageSum.daily.forEach(d => {
        const planDay = (typeof d.peopleDay === 'number') ? d.peopleDay : Math.round((d.people || 0) * 0.6 * 10) / 10;
        const planNight = (typeof d.peopleNight === 'number') ? d.peopleNight : Math.round(((d.people || 0) - planDay) * 10) / 10;
        const entry = {
          total: Math.round(((d.people || (planDay + planNight)) || 0) * 10) / 10,
          planDay: Math.round(planDay * 10) / 10,
          planNight: Math.round(planNight * 10) / 10
        };
        stageDailyMap[normalizeDateKey(d.date)] = entry;
        stageDailyMap[String(d.date).trim()] = entry;
      });
    }

    const columns = [];
    dates.forEach(dStr => {
      columns.push({ dateStr: dStr, shift: 'Day' });
      columns.push({ dateStr: dStr, shift: 'Night' });
    });

    const colsData = columns.map(col => calculateShiftAdjustmentMetrics(col.dateStr, col.shift, stageDailyMap, activeStageId));

    // ====================================================================
    // TÍNH TOÁN CỘT TỔNG CỘNG (SUMMARY COLUMN) - ĐƯỢC CHUYỂN SANG BÊN TRÁI
    // ====================================================================
    const summary = {
      totalPlanValue: colsData.reduce((acc, c) => acc + c.planValue, 0),
      totalPlanLines: Math.round(colsData.reduce((acc, c) => acc + c.planLines, 0) * 10) / 10,
      totalActualLines: colsData.reduce((acc, c) => acc + c.totalLines, 0),
      totalDiffLines: 0,
      totalOtLinesCount: colsData.reduce((acc, c) => acc + c.otCount, 0),
      totalOtPeopleCount: Math.round(colsData.reduce((acc, c) => acc + c.otPeople, 0) * 10) / 10,
      totalShortageShifts: colsData.filter(c => c.diffLines < 0).length,
      linesSummary: {}
    };
    summary.totalDiffLines = Math.round((summary.totalActualLines - summary.totalPlanLines) * 10) / 10;

    activeLines.forEach(lineName => {
      const lineCfg = getLineStaffingConfig(lineName, activeStageId);
      let otShifts = 0;
      let normalShifts = 0;

      colsData.forEach(c => {
        if (c.validOtLines.includes(lineName)) otShifts++;
        if (c.workingLines.includes(lineName)) normalShifts++;
      });

      const totalLineOtPeople = Math.round(otShifts * lineCfg.total * 10) / 10;
      summary.linesSummary[lineName] = {
        otShifts,
        normalShifts,
        totalLineOtPeople,
        direct: lineCfg.direct,
        total: lineCfg.total,
        owningKip: lineCfg.owningKip
      };
    });

    const historyCount = (store.history || []).length;

    let html = `
      <div class="section-card assembly-adjustment-card" id="assemblyAdjustmentSectionCard" style="border: 1px solid rgba(245, 158, 11, 0.35); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);">
        <!-- Header Row: Tiêu đề sửa thành KẾ HOẠCH ĐIỀU CHỈNH OVERTIME + Chọn công đoạn bên cạnh -->
        <div class="section-header-row" style="flex-wrap: wrap; gap: 0.65rem; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass, rgba(255, 255, 255, 0.08)); padding-bottom: 0.75rem;">
          <div class="section-title-wrap" style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="section-icon-badge" style="background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.45); color: #fbbf24; font-size: 1.25rem;">
              ⚡
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                <h2 style="font-size: 1.05rem; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: -0.01em;">
                  📋 KẾ HOẠCH ĐIỀU CHỈNH OVERTIME
                </h2>

                <!-- CHỨC NĂNG CHỌN CÔNG ĐOẠN BÊN CẠNH -->
                <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(15, 23, 42, 0.85); padding: 0.18rem 0.5rem; border-radius: 6px; border: 1px solid rgba(167, 139, 250, 0.45);">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #c4b5fd;">Công đoạn:</span>
                  <select id="adjStageSelect" class="select-filter" onchange="window.handleAdjustmentStageChange(this.value)" style="padding: 0.2rem 0.55rem; font-size: 0.775rem; font-weight: 800; border-radius: 4px; background: #1e1b4b; border: 1px solid #8b5cf6; color: #fde047; cursor: pointer; outline: none;" title="Chọn công đoạn để lập kế hoạch điều chỉnh Overtime">
                    ${Object.keys(STAGE_CONFIGS).map(stKey => `
                      <option value="${stKey}" ${stKey === activeStageId ? 'selected' : ''}>${STAGE_CONFIGS[stKey].name}</option>
                    `).join('')}
                  </select>
                </div>

                <button type="button" class="btn-filter-toggle" onclick="window.toggleAssemblyAdjustmentCollapse()" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;" title="Thu gọn hoặc Mở rộng Bảng Điều Chỉnh">
                  ${isCollapsed ? '🔽 Mở rộng' : '🔼 Thu gọn'}
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons Toolbar -->
          <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
            <!-- Người lập Plan -->
            <button type="button" class="btn btn-secondary sim-btn-planner" onclick="window.handleEditAssemblyAdjPlannerName()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); cursor: pointer;" title="Bấm để cập nhật tên Người lập Plan">
              <span>👤 Người lập: <strong id="adjPlannerBadgeName" style="color: #fbbf24;">${escapeHtml(store.plannerName)}</strong></span>
              <span style="font-size: 0.65rem; opacity: 0.8;">✏️</span>
            </button>

            <!-- Ngày lập Plan -->
            <button type="button" class="btn btn-secondary" onclick="window.handleEditAssemblyAdjPlanDate()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); cursor: pointer;" title="Bấm để chỉnh sửa Ngày lập Plan">
              <span>📅 Ngày lập: <strong id="adjPlanDateBadge" style="color: #38bdf8;">${escapeHtml(store.planDate)}</strong></span>
              <span style="font-size: 0.65rem; opacity: 0.8;">✏️</span>
            </button>

            <!-- Lưu Tạm -->
            <button type="button" class="btn btn-secondary" onclick="window.handleSaveAssemblyAdjDraft()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(56, 189, 248, 0.12); cursor: pointer;" title="Lưu tạm tiến độ Kế Hoạch Điều Chỉnh">
              <span>💾 Lưu Tạm</span>
            </button>

            <!-- Hoàn Thành -->
            <button type="button" class="btn btn-primary" onclick="window.handleCompleteAssemblyAdjPlan()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-color: #10b981; display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); cursor: pointer;" title="Hoàn thành Kế Hoạch Điều Chỉnh, lưu lịch sử và đồng bộ cho tất cả User">
              <span>✅ Hoàn Thành</span>
            </button>

            <!-- Đồng Bộ Plan -->
            <button type="button" class="btn btn-secondary" onclick="window.handleForceSyncAssemblyAdjPlan()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #34d399; border-color: rgba(52, 211, 153, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(52, 211, 153, 0.1); cursor: pointer;" title="Đồng bộ ngay lập tức bản Kế Hoạch Điều Chỉnh mới nhất giữa các User / Tabs">
              <span>🔄 Đồng Bộ Plan</span>
            </button>

            <!-- Lịch Sử Plan -->
            <button type="button" class="btn btn-secondary" onclick="window.handleOpenAssemblyAdjHistoryModal()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #fbbf24; border-color: rgba(251, 191, 36, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(251, 191, 36, 0.1); cursor: pointer;" title="Xem lịch sử các bản Kế Hoạch Điều Chỉnh đã hoàn thành">
              <span>📜 Lịch Sử Plan</span>
              <span id="adjHistoryBadge" style="background: rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 0.05rem 0.35rem; border-radius: 9999px; font-size: 0.65rem; font-weight: 800;">${historyCount}</span>
            </button>

            <!-- Reset -->
            <button type="button" class="btn btn-secondary" onclick="window.handleResetAssemblyAdjustmentPlan()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #f87171; border-color: rgba(248, 113, 113, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(248, 113, 113, 0.12); cursor: pointer;" title="Đặt lại toàn bộ Line OT của công đoạn này về mặc định">
              <span>🔄 Reset</span>
            </button>

            <!-- Cấu Hình Line Kíp -->
            <button type="button" class="btn btn-secondary" onclick="window.openKipLineConfigModal()" style="font-size: 0.725rem; padding: 0.2rem 0.55rem;" title="Mở modal Cấu Hình Line & Định Mức Nhân Lực">
              <span>⚙️ Cấu Hình Line Kíp</span>
            </button>

            <!-- Copy Cho Sheet -->
            <button type="button" class="btn btn-sheet-copy" onclick="window.handleCopyAssemblyAdjustmentTable()" style="font-size: 0.725rem; padding: 0.2rem 0.55rem;" title="Sao chép bảng Kế Hoạch Điều Chỉnh cho Google Sheets / Excel">
              <span>📋 Copy Cho Sheet</span>
            </button>

            <!-- Xuất CSV -->
            <button type="button" class="btn btn-sheet-export" onclick="window.handleExportAssemblyAdjustmentCSV()" style="font-size: 0.725rem; padding: 0.2rem 0.55rem;" title="Tải file CSV UTF-8">
              <span>📥 Xuất CSV</span>
            </button>

            <!-- Áp Dụng Bảng 1 -->
            <button type="button" class="btn btn-primary" onclick="window.handleApplyAssemblyAdjustmentToTable1()" style="font-size: 0.725rem; padding: 0.2rem 0.55rem; background: linear-gradient(135deg, #059669, #10b981); border: none;" title="Đưa số người làm thêm (Số Người OT) vào dòng Thực Tế Bổ Sung của Bảng 1">
              <span>👥 Áp Dụng Bảng 1</span>
            </button>
          </div>
        </div>

        <!-- Body Container (Hỗ trợ thu gọn/mở rộng) -->
        <div id="assemblyAdjustmentTableBodyWrap" style="${isCollapsed ? 'display: none;' : 'margin-top: 0.75rem;'}">
          <div class="table-container assembly-adj-scroll-wrap" style="overflow-x: auto; max-height: 720px; border: 1px solid var(--border-glass, #334155); border-radius: 8px;">
            <table class="data-table assembly-adj-table" id="assemblyAdjustmentTable" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem;">
              <thead>
                <!-- TẦNG HEADER 1: KÍP (Nền vàng nổi bật chuẩn Concept) -->
                <tr class="adj-header-kip-row" style="background: #fde047;">
                  <th class="sticky-col-header" style="position: sticky; left: 0; z-index: 15; background: #fde047; color: #000000; font-weight: 900; border-right: 1px solid rgba(0,0,0,0.2); border-bottom: 1px solid rgba(0,0,0,0.2); text-align: left; padding: 0.4rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; height: 34px; box-sizing: border-box;">
                    KÍP
                  </th>
                  <!-- CỘT TỔNG CỘNG: CỐ ĐỊNH BÊN TRÁI CẠNH CỘT 1 -->
                  <th class="sticky-col-summary-header" style="position: sticky; left: 220px; z-index: 14; background: #fde047; color: #000000; font-weight: 900; font-size: 0.88rem; text-align: center; border-right: 2px solid rgba(0,0,0,0.3); border-bottom: 1px solid rgba(0,0,0,0.2); padding: 0.4rem 0.45rem; min-width: 75px; max-width: 75px; width: 75px; height: 34px; box-sizing: border-box; box-shadow: 4px 0 10px rgba(0,0,0,0.25);">
                    TỔNG
                  </th>
                  ${colsData.map(cd => `
                    <th style="background: #fde047; color: #000000; font-weight: 900; font-size: 0.95rem; text-align: center; border-right: 1px solid rgba(0,0,0,0.15); border-bottom: 1px solid rgba(0,0,0,0.2); padding: 0.4rem 0.5rem; min-width: 80px; height: 34px; box-sizing: border-box;">
                      ${cd.kip}
                    </th>
                  `).join('')}
                </tr>

                <!-- TẦNG HEADER 2: NGÀY (DATE) -->
                <tr class="adj-header-date-row" style="background: var(--bg-card-header, #0f172a);">
                  <th class="sticky-col-header" style="position: sticky; left: 0; z-index: 15; background: var(--bg-card-header, #0f172a); color: var(--text-primary, #f8fafc); font-weight: 700; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); text-align: left; padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; height: 28px; box-sizing: border-box;">
                    NGÀY
                  </th>
                  <!-- CỘT TỔNG CỘNG: HEADER 2 -->
                  <th class="sticky-col-summary-header" style="position: sticky; left: 220px; z-index: 14; background: #1e293b; color: #fbbf24; font-weight: 800; font-size: 0.76rem; text-align: center; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.45rem; min-width: 75px; max-width: 75px; width: 75px; height: 28px; box-sizing: border-box; box-shadow: 4px 0 10px rgba(0,0,0,0.25); white-space: nowrap;">
                    KỲ CHỌN
                  </th>
                  ${colsData.map(cd => `
                    <th style="background: var(--bg-card-header, #0f172a); color: var(--text-primary, #f8fafc); font-weight: 700; font-size: 0.78rem; text-align: center; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.45rem; white-space: nowrap; height: 28px; box-sizing: border-box;">
                      ${formatDateDisplay(cd.dateStr)}
                    </th>
                  `).join('')}
                </tr>

                <!-- TẦNG HEADER 3: CA (SHIFT: DAY / NIGHT) - ĐÓNG BĂNG TỪ HÀNG CA -->
                <tr class="adj-header-shift-row" style="background: var(--bg-card-solid, #1e293b);">
                  <th class="sticky-col-header" style="position: sticky; top: 0; left: 0; z-index: 35; background: var(--bg-card-solid, #1e293b); color: var(--text-secondary, #cbd5e1); font-weight: 700; border-right: 1px solid var(--border-glass, #334155); border-bottom: 2px solid var(--border-glass, #475569); text-align: left; padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; height: 28px; box-sizing: border-box;">
                    CA
                  </th>
                  <!-- CỘT TỔNG CỘNG: HEADER 3 -->
                  <th class="sticky-col-summary-header" style="position: sticky; top: 0; left: 220px; z-index: 34; background: #0f172a; color: #f8fafc; font-weight: 800; font-size: 0.76rem; text-align: center; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 2px solid var(--border-glass, #475569); padding: 0.35rem 0.45rem; min-width: 75px; max-width: 75px; width: 75px; height: 28px; box-sizing: border-box; box-shadow: 4px 0 10px rgba(0,0,0,0.25);">
                    ${colsData.length} CA
                  </th>
                  ${colsData.map(cd => {
                    const isDay = cd.shift === 'Day';
                    return `
                      <th style="position: sticky; top: 0; z-index: 20; background: var(--bg-card-solid, #1e293b); color: ${isDay ? '#fbbf24' : '#c084fc'}; font-weight: 800; font-size: 0.78rem; text-align: center; border-right: 1px solid var(--border-glass, #334155); border-bottom: 2px solid var(--border-glass, #475569); padding: 0.35rem 0.45rem; height: 28px; box-sizing: border-box;">
                        ${cd.shift}
                      </th>
                    `;
                  }).join('')}
                </tr>
              </thead>

              <tbody>
                <!-- 1. KẾ HOẠCH CẦN (PLAN) -->
                <tr class="adj-row-plan" style="background: rgba(59, 130, 246, 0.08);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #0f1a30; font-weight: 700; color: #93c5fd; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                    👷 1. Kế Hoạch Cần (Plan)
                  </td>
                  <!-- TỔNG CỘNG PLAN (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; color: #93c5fd; font-size: 0.85rem; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.5rem; background: #0b1329; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${summary.totalPlanValue.toFixed(1)}
                  </td>
                  ${colsData.map(cd => `
                    <td style="text-align: right; font-weight: 700; color: #93c5fd; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem;">
                      ${cd.planValue.toFixed(1)}
                    </td>
                  `).join('')}
                </tr>

                <!-- 1B. KẾ HOẠCH CẦN SỐ LINE -->
                <tr class="adj-row-plan-lines" style="background: rgba(147, 51, 234, 0.06);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #16122c; font-weight: 700; color: #c084fc; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                    🏭 1b. Kế Hoạch Cần Số Line
                  </td>
                  <!-- TỔNG CỘNG LINE CẦN (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; color: #c084fc; font-size: 0.85rem; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.5rem; background: #0b1329; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${summary.totalPlanLines.toFixed(1)}
                  </td>
                  ${colsData.map(cd => `
                    <td style="text-align: right; font-weight: 800; color: #c084fc; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem;">
                      ${cd.planLines.toFixed(1)}
                    </td>
                  `).join('')}
                </tr>

                <!-- 2B. THỰC TẾ CÓ SỐ LINE -->
                <tr class="adj-row-act-lines" style="background: rgba(16, 185, 129, 0.08); border-bottom: 1px solid var(--border-glass, #334155);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #0c1e1c; font-weight: 800; color: #34d399; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                    🏭 2b. Thực Tế Có Số Line
                  </td>
                  <!-- TỔNG CỘNG LINE THỰC TẾ (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; color: #34d399; font-size: 0.95rem; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.5rem; background: #0b1329; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${summary.totalActualLines}
                  </td>
                  ${colsData.map(cd => `
                    <td style="text-align: right; font-weight: 900; color: #34d399; font-size: 0.95rem; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem;">
                      ${cd.totalLines}
                    </td>
                  `).join('')}
                </tr>

                <!-- ======================================================== -->
                <!-- 4 HÀNG CHỈ TIÊU ĐƯỢC ĐƯA LÊN TRÊN, BÊN DƯỚI HÀNG 2B      -->
                <!-- ======================================================== -->

                <!-- HÀNG 1: CHÊNH LỆCH / CA -->
                <tr class="adj-row-diff" style="background: rgba(15, 23, 42, 0.85); border-bottom: 1px solid var(--border-glass, #334155);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #0b1329; font-weight: 900; color: #f8fafc; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;" title="Chênh lệch giữa số line thực tế có và số line kế hoạch cần của từng ca">
                    ⚖️ Chênh Lệch / Ca
                  </td>
                  <!-- TỔNG CỘNG CHÊNH LỆCH THEO CA (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; font-size: 0.95rem; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.5rem; background: ${summary.totalDiffLines >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}; color: ${summary.totalDiffLines >= 0 ? '#4ade80' : '#f87171'}; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${(summary.totalDiffLines > 0 ? '+' : '') + summary.totalDiffLines.toFixed(1)}
                  </td>
                  ${colsData.map(cd => {
                    const isNeg = cd.diffLines < 0;
                    const diffText = (cd.diffLines > 0 ? '+' : '') + cd.diffLines.toFixed(1);
                    return `
                      <td style="text-align: right; font-weight: 900; font-size: 0.95rem; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; background: ${isNeg ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)'}; color: ${isNeg ? '#f87171' : '#34d399'};" title="${isNeg ? 'Thiếu line so với kế hoạch cần' : 'Đạt / vượt số line yêu cầu'} (Ca ${cd.shift})">
                        ${diffText}
                      </td>
                    `;
                  }).join('')}
                </tr>

                <!-- HÀNG 2: CHÊNH LỆCH / NGÀY (GỒM CẢ CA NGÀY VÀ CA ĐÊM) -->
                <tr class="adj-row-diff-daily" style="background: rgba(30, 41, 59, 0.95); border-bottom: 1px solid var(--border-glass, #334155);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #070d1e; font-weight: 900; color: #38bdf8; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;" title="Tổng chênh lệch sau điều chỉnh theo từng ngày (gồm cả Ca Ngày + Ca Đêm)">
                    📅 Chênh Lệch / Ngày
                  </td>
                  <!-- TỔNG CỘNG CHÊNH LỆCH THEO NGÀY (TOÀN KỲ) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; font-size: 0.95rem; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.5rem; background: ${summary.totalDiffLines >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; color: ${summary.totalDiffLines >= 0 ? '#34d399' : '#f87171'}; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${(summary.totalDiffLines > 0 ? '+' : '') + summary.totalDiffLines.toFixed(1)}
                  </td>
                  ${dates.map(dStr => {
                    const dayCol = colsData.find(c => c.dateStr === dStr && c.shift === 'Day');
                    const nightCol = colsData.find(c => c.dateStr === dStr && c.shift === 'Night');
                    const dayDiff = dayCol ? dayCol.diffLines : 0;
                    const nightDiff = nightCol ? nightCol.diffLines : 0;
                    const dailyDiff = Math.round((dayDiff + nightDiff) * 10) / 10;
                    const isNeg = dailyDiff < 0;
                    const diffText = (dailyDiff > 0 ? '+' : '') + dailyDiff.toFixed(1);
                    return `
                      <td colspan="2" style="text-align: center; font-weight: 900; font-size: 0.95rem; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; background: ${isNeg ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isNeg ? '#f87171' : '#34d399'};" title="Tổng chênh lệch ngày ${formatDateDisplay(dStr)}: ${diffText} line (Ca Ngày: ${dayDiff > 0 ? '+' : ''}${dayDiff} | Ca Đêm: ${nightDiff > 0 ? '+' : ''}${nightDiff})">
                        ${diffText}
                      </td>
                    `;
                  }).join('')}
                </tr>

                <!-- HÀNG 3: SỐ LINE OT -->
                <tr class="adj-row-ot-lines" style="background: rgba(245, 158, 11, 0.05); border-bottom: 1px solid var(--border-glass, #334155);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #1c1911; font-weight: 700; color: #facc15; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                    ⚡ Số Line OT
                  </td>
                  <!-- TỔNG SỐ LINE OT (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; color: #000000; background: #fde047; border-right: 2px solid #d97706; border-bottom: 1px solid rgba(0,0,0,0.15); padding: 0.35rem 0.5rem; font-size: 0.88rem; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${summary.totalOtLinesCount > 0 ? summary.totalOtLinesCount : ''}
                  </td>
                  ${colsData.map(cd => `
                    <td style="text-align: right; font-weight: 800; color: #facc15; border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem;">
                      ${cd.otCount > 0 ? cd.otCount : ''}
                    </td>
                  `).join('')}
                </tr>

                <!-- HÀNG 4: SỐ NGƯỜI OT (CÓ BORDER DÀY PHÂN TÁCH VỚI KHỐI LINE) -->
                <tr class="adj-row-ot-people" style="background: rgba(245, 158, 11, 0.08); border-bottom: 2px solid var(--border-glass, #475569);">
                  <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: #1f1b0e; font-weight: 800; color: #fbbf24; border-right: 1px solid var(--border-glass, #334155); border-bottom: 2px solid var(--border-glass, #475569); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                    👥 Số Người OT
                  </td>
                  <!-- TỔNG SỐ NGƯỜI OT (BÊN TRÁI) -->
                  <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: right; font-weight: 900; color: #000000; background: #fde047; border-right: 2px solid #d97706; border-bottom: 2px solid var(--border-glass, #475569); padding: 0.35rem 0.5rem; font-size: 0.88rem; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                    ${summary.totalOtPeopleCount > 0 ? summary.totalOtPeopleCount : ''}
                  </td>
                  ${colsData.map(cd => `
                    <td style="text-align: right; font-weight: 900; color: #fbbf24; font-size: 0.88rem; border-right: 1px solid var(--border-glass, #334155); border-bottom: 2px solid var(--border-glass, #475569); padding: 0.35rem 0.55rem;">
                      ${cd.otPeople > 0 ? cd.otPeople : ''}
                    </td>
                  `).join('')}
                </tr>

                <!-- ======================================================== -->
                <!-- CÁC DÒNG LINE CHI TIẾT CỦA CÔNG ĐOẠN ĐANG CHỌN           -->
                <!-- ======================================================== -->
                ${activeLines.map(lineName => {
                  const lineSum = summary.linesSummary[lineName] || { otShifts: 0, direct: 14, total: 19 };
                  const otCount = lineSum.otShifts;
                  const lineDisplayName = activeStageConfig.id === 'ASSEMBLY' ? `Line ${lineName}` : `${activeStageConfig.id} ${lineName}`;
                  return `
                    <tr class="adj-row-line hover-row" data-line="${lineName}">
                      <td class="sticky-col-cell" style="position: sticky; left: 0; z-index: 10; background: var(--bg-card-solid, #1e293b); font-weight: 800; color: var(--text-primary, #f8fafc); border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.55rem; min-width: 220px; max-width: 220px; width: 220px; box-sizing: border-box; white-space: nowrap;">
                        ${lineDisplayName}
                        <small style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal; margin-left: 0.35rem;">
                          (${lineSum.direct}ng / ${lineSum.total}ng)
                        </small>
                      </td>

                      <!-- CỘT TỔNG CỘNG CHO TỪNG LINE (CHỈ HIỂN THỊ "OT X", NẾU 0 OT THÌ ĐỂ TRỐNG) -->
                      <td class="sticky-col-summary-cell" style="position: sticky; left: 220px; z-index: 9; text-align: center; border-right: 2px solid rgba(245, 158, 11, 0.5); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.3rem 0.35rem; background: #0b1329; box-shadow: 4px 0 10px rgba(0,0,0,0.25); min-width: 75px; max-width: 75px; width: 75px; box-sizing: border-box;">
                        ${otCount > 0 ? `
                          <div style="text-align: center;">
                            <span style="background: #fde047; color: #000000; font-weight: 900; font-size: 0.76rem; padding: 0.15rem 0.5rem; border-radius: 4px; display: inline-block;" title="${lineDisplayName} có ${otCount} ca làm thêm (OT)">
                              OT ${otCount}
                            </span>
                          </div>
                        ` : ''}
                      </td>

                      <!-- CÁC Ô THEO TỪNG CA -->
                      ${colsData.map(cd => {
                        const st = cd.linesStatus[lineName];
                        if (!st) return '<td></td>';
                        if (st.status === 'NORMAL') {
                          return `
                            <td style="text-align: center; font-weight: 700; color: var(--text-primary, #f8fafc); border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.4rem; background: rgba(255, 255, 255, 0.02);" title="Line chính thức của Kíp ${cd.kip} (${st.text} người trực tiếp theo Cấu Hình Line &amp; Định Mức)">
                              ${st.text}
                            </td>
                          `;
                        } else if (st.status === 'OT') {
                          return `
                            <td class="adj-cell-ot" onclick="window.toggleAssemblyLineOt('${cd.dateStr}', '${cd.shift}', '${lineName}')" 
                                style="text-align: center; font-weight: 900; background: #fde047; color: #000000; border-right: 1px solid rgba(0,0,0,0.12); border-bottom: 1px solid rgba(0,0,0,0.15); padding: 0.35rem 0.4rem; cursor: pointer; transition: transform 0.1s ease;"
                                title="Line làm thêm (OT): ${st.totalVal} người • Click để HỦY chọn">
                              <span style="display: inline-block; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 900;">
                                OT
                              </span>
                            </td>
                          `;
                        } else {
                          return `
                            <td class="adj-cell-empty" onclick="window.toggleAssemblyLineOt('${cd.dateStr}', '${cd.shift}', '${lineName}')" 
                                style="text-align: center; color: var(--text-muted, #64748b); border-right: 1px solid var(--border-glass, #334155); border-bottom: 1px solid var(--border-glass, #334155); padding: 0.35rem 0.4rem; cursor: pointer;"
                                title="Line đang nghỉ (${st.totalVal} người) • Click để BẬT làm thêm (OT)">
                              <span class="adj-hover-plus" style="opacity: 0.15; font-size: 0.7rem; font-weight: 700;">+</span>
                            </td>
                          `;
                        }
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Legend -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.55rem; padding: 0.4rem 0.75rem; background: rgba(15, 23, 42, 0.4); border-radius: 6px; font-size: 0.75rem; color: var(--text-muted, #94a3b8);">
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
              <span>💡 <strong>Hướng dẫn:</strong> Bấm ô Line nghỉ để bật <strong style="color: #fde047;">OT</strong>. Bấm ô <strong style="color: #fde047;">OT</strong> để hủy.</span>
              <span style="color: #fbbf24; font-weight: 700;">🛡️ Giới hạn an toàn: 1 Line không được làm liên tục quá 5 ngày.</span>
            </div>
            <div>
              <span>Đồng bộ 100% <strong>Bảng Nhân Lực &amp; Cân Đối Ca</strong> • Công đoạn: <strong style="color: #fde047;">${activeStageConfig.name}</strong> • Định mức theo <strong>Cấu Hình Line Kíp</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Khôi phục lại vị trí cuộn mượt mà
    const restoreScroll = () => {
      if (prevWinY > 0 || prevWinX > 0) {
        window.scrollTo(prevWinX, prevWinY);
      }
      const newWrap = container.querySelector('.assembly-adj-scroll-wrap');
      if (newWrap && prevWrapTop !== null) {
        newWrap.scrollTop = prevWrapTop;
        newWrap.scrollLeft = prevWrapLeft;
      }
    };
    restoreScroll();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(restoreScroll);
    }
  };

  /**
   * Bật / Tắt một Line OT (Kèm kiểm tra quy định an toàn không làm việc liên tục > 5 ngày)
   */
  window.toggleAssemblyLineOt = function(dateStr, shift, lineName) {
    const store = window.AssemblyAdjustmentStore;
    const currentStage = store.selectedStage || DEFAULT_STAGE;
    const norm = normalizeDateKey(dateStr);
    const raw = String(dateStr).trim();
    
    const key = `${norm}_${shift}`;
    const rawKey = `${raw}_${shift}`;

    let currentList = store.otMap[key] || store.otMap[rawKey] || [];
    if (!Array.isArray(currentList)) currentList = [];

    const existingIdx = currentList.indexOf(lineName);
    if (existingIdx !== -1) {
      // HỦY CHỌN OT: Không bao giờ vi phạm an toàn vì số ngày liên tục giảm xuống
      currentList.splice(existingIdx, 1);
      store.otMap[key] = currentList;
      if (rawKey !== key) delete store.otMap[rawKey];
      saveStoredOtMap(store.otMap, currentStage);
      window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
      if (window.showToast) {
        window.showToast('info', `🗑️ Đã hủy Line ${lineName} làm thêm cho ${shift === 'Day' ? 'Ca Ngày' : 'Ca Đêm'} ${formatDateDisplay(dateStr)}!`);
      }
    } else {
      // BẬT CHỌN OT: Kiểm tra nguyên tắc an toàn lao động không được làm liên tục > 5 ngày
      const safetyCheck = checkConsecutiveWorkingDays(lineName, dateStr, shift, store.otMap, currentStage);
      if (!safetyCheck.allowed) {
        const warnMsg = `⚠️ VI PHẠM NGUYÊN TẮC AN TOÀN: Line ${lineName} không được làm việc liên tục quá 5 ngày! (Hiện tại nếu thêm ca này sẽ là ${safetyCheck.consecutiveDays} ngày làm việc liên tục từ ${safetyCheck.firstDate} đến ${safetyCheck.lastDate}). Vui lòng bố trí Line khác!`;
        if (window.showToast) {
          window.showToast('danger', warnMsg);
        } else {
          alert(warnMsg);
        }
        return;
      }

      currentList.push(lineName);
      store.otMap[key] = currentList;
      if (rawKey !== key) delete store.otMap[rawKey];
      saveStoredOtMap(store.otMap, currentStage);
      window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
      const lineStaff = getLineStaffingConfig(lineName, currentStage);
      if (window.showToast) {
        window.showToast('info', `⚡ Đã bật Line ${lineName} làm thêm (${lineStaff.total} người OT) cho ${shift === 'Day' ? 'Ca Ngày' : 'Ca Đêm'} ${formatDateDisplay(dateStr)}!`);
      }
    }
  };

  /**
   * Chỉnh sửa tên Người lập Plan
   */
  window.handleEditAssemblyAdjPlannerName = function() {
    const store = window.AssemblyAdjustmentStore;
    const current = store.plannerName || 'Lê Ngọc Duy GLD';
    const newName = window.prompt('Nhập họ tên Người lập Plan (Kế hoạch Điều Chỉnh Line OT):', current);
    if (newName !== null) {
      const clean = newName.trim();
      const finalName = clean || 'Lê Ngọc Duy GLD';
      store.plannerName = finalName;
      localStorage.setItem(PLANNER_KEY, finalName);
      window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
      if (window.showToast) {
        window.showToast('success', `👤 Đã cập nhật Người lập Plan: ${finalName}`);
      }
    }
  };

  /**
   * Chỉnh sửa Ngày lập Plan
   */
  window.handleEditAssemblyAdjPlanDate = function() {
    const store = window.AssemblyAdjustmentStore;
    const current = store.planDate || getTodayFormatted();
    const newDate = window.prompt('Nhập Ngày lập Plan (DD/MM/YYYY):', current);
    if (newDate !== null) {
      const clean = newDate.trim();
      const finalDate = clean || getTodayFormatted();
      store.planDate = finalDate;
      localStorage.setItem(PLAN_DATE_KEY, finalDate);
      window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
      if (window.showToast) {
        window.showToast('success', `📅 Đã cập nhật Ngày lập Plan: ${finalDate}`);
      }
    }
  };

  /**
   * Lưu Tạm Kế Hoạch Điều Chỉnh
   */
  window.handleSaveAssemblyAdjDraft = function() {
    const store = window.AssemblyAdjustmentStore;
    saveStoredOtMap(store.otMap, store.selectedStage);
    localStorage.setItem(PLANNER_KEY, store.plannerName || 'Lê Ngọc Duy GLD');
    localStorage.setItem(PLAN_DATE_KEY, store.planDate || getTodayFormatted());
    if (window.showToast) {
      window.showToast('success', '💾 Đã lưu tạm thành công Kế Hoạch Điều Chỉnh Line OT!');
    }
  };

  /**
   * Hoàn Thành Kế Hoạch Điều Chỉnh & Đồng bộ đa người dùng
   */
  window.handleCompleteAssemblyAdjPlan = async function() {
    const store = window.AssemblyAdjustmentStore;
    const currentStage = store.selectedStage || DEFAULT_STAGE;
    const now = new Date();
    const planId = 'ADJ_' + now.getTime();
    
    // 1. Lưu lại map của công đoạn hiện tại vào storage
    saveStoredOtMap(store.otMap, currentStage);

    // 2. Thu thập toàn bộ OT map của TẤT CẢ các công đoạn
    const allStagesOtMap = {};
    let totalOtCountAllStages = 0;
    Object.keys(STAGE_CONFIGS).forEach(stgKey => {
      const map = (stgKey === currentStage) ? (store.otMap || {}) : loadStoredOtMap(stgKey);
      let count = 0;
      Object.values(map || {}).forEach(arr => {
        if (Array.isArray(arr)) count += arr.length;
      });
      if (count > 0 || stgKey === currentStage) {
        allStagesOtMap[stgKey] = JSON.parse(JSON.stringify(map || {}));
        totalOtCountAllStages += count;
      }
    });

    // Đếm tổng số ca OT công đoạn hiện tại
    let otCount = 0;
    Object.values(store.otMap || {}).forEach(arr => {
      if (Array.isArray(arr)) otCount += arr.length;
    });

    const record = {
      id: planId,
      stage: currentStage,
      stageName: STAGE_CONFIGS[currentStage]?.name || currentStage,
      planner: store.plannerName || 'Lê Ngọc Duy GLD',
      planDate: store.planDate || getTodayFormatted(),
      completedAt: now.toISOString(),
      timeStr: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      dateStr: now.toLocaleDateString('vi-VN'),
      otCount,
      otMap: JSON.parse(JSON.stringify(store.otMap || {})),
      allStagesOtMap,
      totalOtCountAllStages
    };

    if (!Array.isArray(store.history)) store.history = [];
    store.history.unshift(record);
    if (store.history.length > 30) store.history = store.history.slice(0, 30);
    saveHistoryPlans(store.history);

    // Phát broadcast đồng bộ tới tất cả tabs & browsers trên cùng máy
    if (adjSyncChannel) {
      try {
        adjSyncChannel.postMessage({ type: 'ADJUSTMENT_PLAN_COMPLETED', plan: record });
      } catch (e) {}
    }
    try {
      localStorage.setItem(LATEST_SYNC_KEY, JSON.stringify({ plan: record, ts: Date.now() }));
    } catch (e) {}

    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);

    // Gửi lên Server API /api/overtime-adjustment để lưu file JSON & kích hoạt GitHub Auto-push
    let serverSyncSuccess = false;
    try {
      const res = await fetch('/api/overtime-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: record })
      });
      if (res && res.ok) {
        serverSyncSuccess = true;
      }
    } catch (e) {}

    if (window.showToast) {
      const syncNote = serverSyncSuccess
        ? ' • Đã lưu lên máy chủ & tự động đồng bộ GitHub cho tất cả User!'
        : ' • Đã lưu thành công và sẵn sàng đồng bộ cho tất cả User!';
      window.showToast('success', `✅ ĐÃ HOÀN THÀNH KẾ HOẠCH ĐIỀU CHỈNH [${record.stageName}]! Người lập: ${record.planner}${syncNote}`);
    }
  };

  /**
   * Đồng Bộ Ngay Lập Tức Kế Hoạch Mới Nhất (Đa Nguồn: Server LAN, Static JSON, GitHub Raw, Cloud)
   */
  window.handleForceSyncAssemblyAdjPlan = async function() {
    if (window.showToast) {
      window.showToast('info', '⏳ Đang kiểm tra và tải kế hoạch điều chỉnh Overtime mới nhất từ máy chủ / GitHub...');
    }

    try {
      const bundle = await fetchRemoteOvertimeBundle();
      if (bundle && bundle.latestPlan) {
        const plan = bundle.latestPlan;
        handleIncomingAdjPlan(plan, true, bundle.history);
        if (window.showToast) {
          const stgName = STAGE_CONFIGS[plan.stage]?.name || plan.stage || 'ASSEMBLY';
          window.showToast('success', `🔄 ĐÃ ĐỒNG BỘ THÀNH CÔNG: Kế hoạch điều chỉnh [${stgName}] từ [${plan.planner || 'User'}] (${plan.planDate || plan.dateStr || ''} lúc ${plan.timeStr || ''} • ${plan.otCount || 0} ca OT)!`);
        }
        return;
      }
    } catch (e) {
      console.warn('Lỗi khi fetch remote overtime bundle:', e);
    }

    // Fallback: Kiểm tra LATEST_SYNC_KEY trong localStorage nếu không gọi được mạng
    try {
      const syncStr = localStorage.getItem(LATEST_SYNC_KEY);
      if (syncStr) {
        const payload = JSON.parse(syncStr);
        if (payload && payload.plan) {
          handleIncomingAdjPlan(payload.plan, true);
          if (window.showToast) {
            window.showToast('success', `🔄 ĐÃ ĐỒNG BỘ: Kế hoạch điều chỉnh từ [${payload.plan.planner || 'User'}]!`);
          }
          return;
        }
      }
    } catch (e) {}

    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
    if (window.showToast) {
      window.showToast('info', '✅ Kế Hoạch Điều Chỉnh hiện tại đã là bản mới nhất!');
    }
  };

  /**
   * Mở modal Lịch Sử Plan Điều Chỉnh
   */
  window.handleOpenAssemblyAdjHistoryModal = function() {
    const store = window.AssemblyAdjustmentStore;
    const history = store.history || [];

    let modal = document.getElementById('assemblyAdjHistoryModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'assemblyAdjHistoryModal';
      modal.className = 'modal-backdrop';
      modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card" style="background: var(--bg-card-solid, #1e293b); border: 1px solid var(--border-glass, #334155); border-radius: 12px; width: 92%; max-width: 680px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-glass, #334155); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">📜</span>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #f8fafc;">
              LỊCH SỬ KẾ HOẠCH ĐIỀU CHỈNH OVERTIME (${history.length} bản ghi)
            </h3>
          </div>
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('assemblyAdjHistoryModal').style.display='none'" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">
            ✕ Đóng
          </button>
        </div>

        <div style="padding: 1rem; overflow-y: auto; flex: 1;">
          ${history.length === 0 ? `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted, #94a3b8);">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📭</div>
              <strong>Chưa có bản ghi lịch sử nào.</strong>
              <div style="font-size: 0.8rem; margin-top: 0.25rem;">Khi bạn bấm nút <strong style="color: #10b981;">✅ Hoàn Thành</strong>, hệ thống sẽ tự động lưu một bản ghi lịch sử tại đây.</div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              ${history.map((h, idx) => `
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-glass, #334155); border-radius: 8px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 800; font-size: 0.72rem;">#${history.length - idx}</span>
                      <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-weight: 700; font-size: 0.72rem;">${escapeHtml(h.stageName || h.stage || 'ASSEMBLY')}</span>
                      <strong style="color: #fbbf24; font-size: 0.88rem;">👤 ${escapeHtml(h.planner || 'User')}</strong>
                      <span style="color: var(--text-muted); font-size: 0.78rem;">📅 ${escapeHtml(h.planDate || h.dateStr)} lúc ${h.timeStr || ''}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.25rem;">
                      ⚡ Tổng cộng: <strong style="color: #fde047;">${h.otCount || 0} ca OT</strong> đã bố trí
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.35rem;">
                    <button type="button" class="btn btn-primary" onclick="window.handleRestoreAssemblyAdjHistory('${h.id}')" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; background: #0284c7; border-color: #0284c7;">
                      🔄 Khôi Phục
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.handleDeleteAssemblyAdjHistory('${h.id}')" style="font-size: 0.75rem; padding: 0.3rem 0.5rem; color: #f87171;">
                      🗑️
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  };

  /**
   * Khôi phục 1 bản Kế hoạch Điều Chỉnh từ Lịch Sử
   */
  window.handleRestoreAssemblyAdjHistory = function(planId) {
    const store = window.AssemblyAdjustmentStore;
    const found = (store.history || []).find(h => h.id === planId);
    if (!found) return;

    if (!confirm(`Bạn có chắc chắn muốn khôi phục bản kế hoạch của [${found.planner}] lập ngày ${found.planDate || found.dateStr}?`)) return;

    const restoredStage = found.stage || DEFAULT_STAGE;
    store.selectedStage = restoredStage;
    localStorage.setItem(SELECTED_STAGE_KEY, restoredStage);

    // Khôi phục tất cả công đoạn nếu bản ghi có allStagesOtMap
    if (found.allStagesOtMap && typeof found.allStagesOtMap === 'object') {
      Object.keys(found.allStagesOtMap).forEach(stg => {
        const m = found.allStagesOtMap[stg];
        if (m && typeof m === 'object') {
          saveStoredOtMap(m, stg);
        }
      });
    }

    store.otMap = JSON.parse(JSON.stringify(found.otMap || {}));
    saveStoredOtMap(store.otMap, restoredStage);
    store.plannerName = found.planner;
    localStorage.setItem(PLANNER_KEY, found.planner);
    if (found.planDate) {
      store.planDate = found.planDate;
      localStorage.setItem(PLAN_DATE_KEY, found.planDate);
    }

    const modal = document.getElementById('assemblyAdjHistoryModal');
    if (modal) modal.style.display = 'none';

    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
    if (window.showToast) {
      window.showToast('success', `🔄 Đã khôi phục thành công Kế Hoạch Điều Chỉnh của [${found.planner}]!`);
    }
  };

  /**
   * Xóa 1 bản ghi lịch sử
   */
  window.handleDeleteAssemblyAdjHistory = function(planId) {
    const store = window.AssemblyAdjustmentStore;
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử này?')) return;
    store.history = (store.history || []).filter(h => h.id !== planId);
    saveHistoryPlans(store.history);
    window.handleOpenAssemblyAdjHistoryModal();
  };

  /**
   * Thu gọn / Mở rộng Section Kế Hoạch Điều Chỉnh
   */
  window.toggleAssemblyAdjustmentCollapse = function(forceCollapse) {
    const store = window.AssemblyAdjustmentStore;
    const body = document.getElementById('assemblyAdjustmentTableBodyWrap');
    if (!body) return;

    const currentHidden = (body.style.display === 'none');
    const shouldHide = (typeof forceCollapse === 'boolean') ? forceCollapse : !currentHidden;

    store.isCollapsed = shouldHide;
    localStorage.setItem(COLLAPSED_KEY, shouldHide ? 'true' : 'false');
    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
  };

  /**
   * Đặt lại toàn bộ Line OT đã chọn về mặc định của công đoạn hiện tại
   */
  window.handleResetAssemblyAdjustmentPlan = function() {
    const store = window.AssemblyAdjustmentStore;
    const currentStage = store.selectedStage || DEFAULT_STAGE;
    const stageName = STAGE_CONFIGS[currentStage]?.name || currentStage;
    if (!confirm(`Bạn có chắc chắn muốn đặt lại tất cả Line Overtime của công đoạn [${stageName}] về mặc định ban đầu không?`)) return;
    store.otMap = getSampleDefaultOtMap(currentStage);
    saveStoredOtMap(store.otMap, currentStage);
    window.renderAssemblyAdjustmentPlan(window.__LATEST_SCHEDULE__, window.__LATEST_MP_STAGES__);
    if (window.showToast) {
      window.showToast('success', `Đã đặt lại Kế Hoạch Điều Chỉnh Overtime công đoạn [${stageName}] về mặc định!`);
    }
  };

  /**
   * Đưa số người làm thêm (Số Người OT) vào dòng Thực Tế Bổ Sung của Bảng 1 Tình Trạng Nhân Lực
   */
  window.handleApplyAssemblyAdjustmentToTable1 = function() {
    const store = window.AssemblyAdjustmentStore;
    const currentStage = store.selectedStage || DEFAULT_STAGE;
    const dates = resolveAdjustmentDates(window.__LATEST_SCHEDULE__);
    let appliedCount = 0;

    const targetSaveStage = (currentStage === 'HARD TEST' || currentStage === 'SUM HARDTEST') ? 'HARDTEST_TOTAL' : currentStage;

    dates.forEach(dStr => {
      ['Day', 'Night'].forEach(shift => {
        const metrics = calculateShiftAdjustmentMetrics(dStr, shift, null, currentStage);
        if (metrics.otPeople > 0) {
          if (window.AppStore && typeof window.AppStore.setActualSupplement === 'function') {
            window.AppStore.setActualSupplement(dStr, shift, targetSaveStage, metrics.otPeople);
            appliedCount++;
          }
        }
      });
    });

    if (typeof renderDataMassView === 'function') {
      renderDataMassView();
    }

    if (window.showToast) {
      window.showToast('success', `Đã áp dụng thành công Số Người OT của ${appliedCount} ca công đoạn [${STAGE_CONFIGS[currentStage]?.name || currentStage}] vào Bảng 1 (Tình Trạng Nhân Lực & Cân Đối Ca)!`);
    }
  };

  /**
   * Sao chép toàn bộ bảng Kế Hoạch Điều Chỉnh (kèm Cột Tổng Cộng) cho Google Sheets & Excel
   */
  window.handleCopyAssemblyAdjustmentTable = function() {
    const table = document.getElementById('assemblyAdjustmentTable');
    if (!table) return;

    let tsv = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      const cells = r.querySelectorAll('th, td');
      const rowVals = [];
      cells.forEach(c => {
        let txt = (c.innerText || '').trim().replace(/\r?\n/g, ' ');
        rowVals.push(txt);
        const span = c.colSpan || 1;
        for (let s = 1; s < span; s++) {
          rowVals.push('');
        }
      });
      tsv += rowVals.join('\t') + '\r\n';
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        if (window.showToast) window.showToast('success', '📋 Đã sao chép Bảng Kế Hoạch Điều Chỉnh (kèm Cột Tổng Cộng)! Bạn có thể dán (Ctrl+V) ngay vào Google Sheets hoặc Excel.');
      }).catch(() => {
        fallbackCopyText(tsv);
      });
    } else {
      fallbackCopyText(tsv);
    }
  };

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (window.showToast) window.showToast('success', '📋 Đã sao chép Bảng Kế Hoạch Điều Chỉnh cho Google Sheets!');
    } catch (e) {}
    document.body.removeChild(ta);
  }

  /**
   * Xuất file CSV bảng Kế Hoạch Điều Chỉnh chuẩn UTF-8 có BOM (kèm Cột Tổng Cộng)
   */
  window.handleExportAssemblyAdjustmentCSV = function() {
    const table = document.getElementById('assemblyAdjustmentTable');
    if (!table) return;

    const store = window.AssemblyAdjustmentStore;
    const currentStage = store.selectedStage || DEFAULT_STAGE;

    let csv = '\uFEFF';
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      const cells = r.querySelectorAll('th, td');
      const rowVals = [];
      cells.forEach(c => {
        let txt = (c.innerText || '').trim().replace(/"/g, '""');
        rowVals.push(`"${txt}"`);
        const span = c.colSpan || 1;
        for (let s = 1; s < span; s++) {
          rowVals.push('""');
        }
      });
      csv += rowVals.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ke_Hoach_Dieu_Chinh_Overtime_${currentStage}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('success', '📥 Đã tải xuống file CSV Kế Hoạch Điều Chỉnh (kèm Cột Tổng Cộng)!');
  };

  // Tự động kiểm tra và đồng bộ kế hoạch Overtime mới nhất khi khởi động trang
  async function initOvertimeSyncOnLoad() {
    try {
      const bundle = await fetchRemoteOvertimeBundle();
      if (bundle && bundle.latestPlan) {
        const remotePlan = bundle.latestPlan;
        const store = window.AssemblyAdjustmentStore;

        const localLatestTime = (store.history && store.history[0] && store.history[0].completedAt)
          ? new Date(store.history[0].completedAt).getTime()
          : 0;
        const remoteTime = new Date(remotePlan.completedAt || remotePlan.createdAt || 0).getTime();

        if (remoteTime >= localLatestTime || !store.history || store.history.length === 0) {
          handleIncomingAdjPlan(remotePlan, false, bundle.history);
          console.log('[Overtime Auto-Sync] ✅ Đã tự động nạp kế hoạch Overtime mới nhất:', remotePlan.id);
        }
      }
    } catch (e) {
      console.warn('[Overtime Auto-Sync] Lỗi nạp khởi đầu:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initOvertimeSyncOnLoad, 600));
  } else {
    setTimeout(initOvertimeSyncOnLoad, 600);
  }

})();
