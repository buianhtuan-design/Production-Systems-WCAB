/**
 * Ajax ProPlan MES - PRODUCT REPAIR & LIFECYCLE HISTORY MODULE (QR CODE)
 * ======================================================================
 * Phân hệ Quản Lý Lịch Sử Sản Phẩm & Sửa Chữa qua mã QR Code
 * - Mobile QR Scanner: Quét mã QR bằng Camera điện thoại di động (Beep + Rung).
 * - Tự động mở form nhập lỗi: Công đoạn, Workcell, Line, Ca, Lỗi, Nguyên nhân, Cách xử lý.
 * - Quick touch chips: Nút bấm to 1 chạm dành riêng cho thao tác trên điện thoại.
 * - Phân quyền người dùng: Chỉ User được đăng ký (Admin / KTV Sửa Chữa) mới được nhập data.
 * - Tổng hợp & Phân tích (Analytics Dashboard): Dành cho Admin và các user khác phân tích dữ liệu.
 * - Export sang sheet "Repair history" trong file Google Sheets (CSV BOM + Copy TSV).
 */

(function() {
  'use strict';

  // Seed data mặc định khởi tạo chuẩn concept
  const DEFAULT_SEED_RECORDS = [
  {
    "id": "PRH_20261127_001",
    "qrCode": "device 31c0794b142",
    "stage": "HARD TEST",
    "workcell": "WCA",
    "date": "2026-11-27",
    "shift": "DAY",
    "shiftName": "Ca Ngày",
    "line": "Line 1A",
    "model": "Ajax Hub 2 Plus (8EU/ECG) WL Standard white (напівфабрикат)",
    "modelGroup": "Hub 2 Plus",
    "repairer": "Bùi Anh Tuấn (Admin)",
    "defectDesc": "Không lên đèn",
    "rootCause": "PCB NG",
    "action": "Chạy lại Hardtest",
    "result": "OK",
    "status": "Input Line",
    "note": "Kiểm tra nguồn 3.3V bình thường, đã nạp test block 1A đạt yêu cầu",
    "timestamp": "2026-11-27 08:45:00",
    "createdAt": "2026-11-27T08:45:00+07:00"
  },
  {
    "id": "PRH_20261127_002",
    "qrCode": "device 98a1204d551",
    "stage": "ASSEMBLY",
    "workcell": "WCA",
    "date": "2026-11-27",
    "shift": "DAY",
    "shiftName": "Ca Ngày",
    "line": "Line 1C",
    "model": "Ajax MotionCam Outdoor (PhOD) Jeweller (8EU) white (напівфабрикат)",
    "modelGroup": "MotionCam Outdoor (PhOD) Jeweller",
    "repairer": "Nguyễn Văn Hùng",
    "defectDesc": "Mất tín hiệu RF 868MHz",
    "rootCause": "Hở chân tiếp xúc anten AT1",
    "action": "Hàn lại chân anten & gia cố keo UV",
    "result": "OK",
    "status": "Input Line",
    "note": "Đo RSSI kiểm tra đạt -42dBm, đủ tiêu chuẩn phát sóng",
    "timestamp": "2026-11-27 09:15:30",
    "createdAt": "2026-11-27T09:15:30+07:00"
  },
  {
    "id": "PRH_20261127_003",
    "qrCode": "device 44e7812c990",
    "stage": "HARD TEST",
    "workcell": "WCA",
    "date": "2026-11-27",
    "shift": "NIGHT",
    "shiftName": "Ca Đêm",
    "line": "Line 2A",
    "model": "Ajax WaterStop (8EU) white (напівфабрикат)",
    "modelGroup": "WaterStop (8EU)",
    "repairer": "Trần Minh Đức",
    "defectDesc": "Kẹt motor khóa van",
    "rootCause": "Cụm bánh răng truyền động lệch khớp",
    "action": "Căn chỉnh lại cơ cấu giảm tốc bánh răng",
    "result": "OK",
    "status": "Input Line",
    "note": "Test đóng/mở 5 chu kỳ liên tiếp trơn tru, không kẹt",
    "timestamp": "2026-11-27 02:10:00",
    "createdAt": "2026-11-27T02:10:00+07:00"
  },
  {
    "id": "PRH_20261127_004",
    "qrCode": "device 77f0931a224",
    "stage": "SMD",
    "workcell": "WCB",
    "date": "2026-11-26",
    "shift": "DAY",
    "shiftName": "Ca Ngày",
    "line": "Line 2C",
    "model": "Ajax DoorProtect Plus white EU (напівфабрикат)",
    "modelGroup": "DoorProtect Plus v5 8xx",
    "repairer": "Lê Hoàng Nam",
    "defectDesc": "Chập đường nguồn VCC 3.0V",
    "rootCause": "Thiếc hàn lem chân tụ C14",
    "action": "Hút bớt thiếc lem và làm sạch bề mặt board",
    "result": "OK",
    "status": "Input Line",
    "note": "Đo trở kháng nguồn VCC đạt 120kΩ, không còn chập",
    "timestamp": "2026-11-26 14:20:00",
    "createdAt": "2026-11-26T14:20:00+07:00"
  },
  {
    "id": "PRH_20261127_005",
    "qrCode": "device 52b8901c338",
    "stage": "ASSEMBLY",
    "workcell": "WCB",
    "date": "2026-11-26",
    "shift": "NIGHT",
    "shiftName": "Ca Đêm",
    "line": "Line 3A",
    "model": "Ajax Keypad white EU (напівфабрикат)",
    "modelGroup": "Keypad (8xx)",
    "repairer": "Phạm Quốc Tuấn",
    "defectDesc": "Liệt phím bấm số 5",
    "rootCause": "Màng than silicon tiếp điểm bị rách",
    "action": "Chờ xuất kho màng phím silicon thay thế",
    "result": "Chờ linh kiện",
    "status": "Đang sửa",
    "note": "Đã tạo đề xuất xuất kho linh kiện màng phím Keypad",
    "timestamp": "2026-11-26 23:45:00",
    "createdAt": "2026-11-26T23:45:00+07:00"
  },
  {
    "id": "PRH_20261127_006",
    "qrCode": "device 31c0794b142",
    "stage": "ASSEMBLY",
    "workcell": "WCA",
    "date": "2026-11-27",
    "shift": "DAY",
    "shiftName": "Ca Ngày",
    "line": "Line 1A",
    "model": "Ajax Hub 2 Plus (8EU/ECG) WL Standard white (напівфабрикат)",
    "modelGroup": "Hub 2 Plus",
    "repairer": "Bùi Anh Tuấn (Admin)",
    "defectDesc": "Kẹt lẫy ngàm vỏ sau",
    "rootCause": "Bavia mép ép nhựa vỏ lưng",
    "action": "Gọt bavia & lắp ráp hoàn chỉnh",
    "result": "OK",
    "status": "Input Line",
    "note": "Lần sửa chữa thứ 2 sau khi test Hardtest - Sẵn sàng Input Line",
    "timestamp": "2026-11-27 11:20:00",
    "createdAt": "2026-11-27T11:20:00+07:00"
  }
];

  let initialRecords = DEFAULT_SEED_RECORDS;
  try {
    const cached = localStorage.getItem('AJAX_PRODUCT_REPAIR_HISTORY');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) initialRecords = parsed;
    }
  } catch (e) {}

  // Khởi tạo State của Module Quản Lý Lịch Sử Sản Phẩm
  window.ProductHistoryState = {
    records: initialRecords,
    selectedStage: 'ALL',
    selectedWorkcell: 'ALL',
    selectedDate: '',
    selectedShift: 'ALL',
    selectedLine: 'ALL',
    selectedModel: 'ALL',
    selectedRepairer: 'ALL',
    selectedResult: 'ALL',
    selectedStatus: 'ALL',
    searchKeyword: '',
    scannedQrFilter: '',
    isCameraScanning: false,
    mediaStream: null,
    editingRecordId: null,
    showAnalytics: true // Hiển thị khối tổng hợp phân tích data
  };

  const STAGE_OPTIONS = [
    { value: 'HARD TEST', label: '🔬 HARD TEST' },
    { value: 'ASSEMBLY', label: '🔧 ASSEMBLY' },
    { value: 'SMD', label: '⚡ SMD' },
    { value: 'DIP', label: '🔌 DIP' },
    { value: 'OPTICS ASM', label: '🔭 OPTICS ASM' },
    { value: 'FOCUS', label: '🎯 FOCUS' },
    { value: 'LONG TEST', label: '⏱️ LONG TEST' },
    { value: 'QC', label: '🔍 QC' }
  ];

  const LINE_OPTIONS = [
    'Line 1A', 'Line 1B', 'Line 1C',
    'Line 2A', 'Line 2B', 'Line 2C',
    'Line 3A', 'Line 3B', 'Line 3C',
    'Chuyền Thử Nghiệm'
  ];

  // Gợi ý nhanh các lỗi nhà xưởng phổ biến (1 chạm trên Mobile)
  const COMMON_DEFECTS = [
    'Không lên đèn / nguồn',
    'Lỗi sóng RF 868MHz',
    'Kẹt nút nhấn Tamper',
    'Kẹt motor van WaterStop',
    'Chập nguồn VCC / chạm tụ',
    'Hàn kênh chân IC',
    'Liệt phím bấm / rách màng phím',
    'Lỗi cảm biến rung / gia tốc',
    'Lỗi cảm biến PIR hồng ngoại',
    'Nứt vỡ ngàm nhựa vỏ sau'
  ];

  const COMMON_CAUSES = [
    'PCB NG',
    'Hở chân tiếp xúc IC / Anten',
    'Lệch khớp bánh răng giảm tốc',
    'Thiếc lem chân tụ / chập mạch',
    'Bavia mép ép nhựa vỏ lưng',
    'Linh kiện kho cấp bị lỗi',
    'Lắp lệch vị trí switch tamper',
    'Màng than silicon rách tiếp điểm'
  ];

  const COMMON_ACTIONS = [
    'Chạy lại Hardtest',
    'Hàn lại chân & gia cố keo UV',
    'Căn chỉnh cơ cấu bánh răng',
    'Hút thiếc lem & vệ sinh board',
    'Gọt bavia & lắp ráp hoàn chỉnh',
    'Thay linh kiện mới từ kho',
    'Calibrate lại cảm biến gia tốc',
    'Thay màng phím silicon mới'
  ];

  // ==========================================
  // HỆ THỐNG PHÂN QUYỀN (USER PERMISSION CHECK)
  // ==========================================
  function getCurrentUserRole() {
    if (window.UserAuth && typeof window.UserAuth.getCurrentRole === 'function') {
      return window.UserAuth.getCurrentRole();
    }
    return localStorage.getItem('AJAX_USER_ROLE') || 'viewer';
  }

  function getCurrentUserName() {
    const planner = localStorage.getItem('AJAX_SIM_PLANNER_NAME');
    if (planner && planner.trim()) return planner.trim();
    if (window.AppStore && window.AppStore.currentUser && window.AppStore.currentUser.fullName) {
      return window.AppStore.currentUser.fullName;
    }
    const role = getCurrentUserRole();
    if (role === 'admin') return 'Bùi Anh Tuấn (Admin)';
    if (role === 'editor') return 'KTV Sửa Chữa (Editor)';
    return 'Khách (Chỉ xem)';
  }

  function canUserInputData() {
    const role = getCurrentUserRole();
    return (role === 'admin' || role === 'editor');
  }

  function showRequireAuthModal() {
    const modal = document.getElementById('authRequireModal');
    if (modal) {
      modal.style.display = 'flex';
      return;
    }
    // Fallback trigger modal đăng nhập hệ thống
    const overlay = document.getElementById('authLockOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
    if (window.showToast) {
      window.showToast('warning', '🔒 Bạn cần đăng nhập tài khoản KTV hoặc Admin để nhập dữ liệu sửa chữa!');
    }
  }

  // Hiệu ứng âm thanh Beep & Rung trên Mobile
  function playBeepSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  function triggerVibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {}
  }

  function getAvailableModelOptions() {
    const modelsSet = new Set();
    if (window.AppStore && Array.isArray(window.AppStore.dataMassRows)) {
      window.AppStore.dataMassRows.forEach(r => {
        if (r.model) modelsSet.add(r.model);
        if (r.modelGroup) modelsSet.add(r.modelGroup);
      });
    }
    // Thêm từ records hiện tại
    window.ProductHistoryState.records.forEach(r => {
      if (r.model) modelsSet.add(r.model);
    });
    return Array.from(modelsSet).sort();
  }

  // ==========================================
  // API TẢI / LƯU / XÓA DỮ LIỆU
  // ==========================================
  async function loadProductRepairHistory() {
    try {
      const res = await fetch('/api/product-repair-history?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.records) && data.records.length > 0) {
          window.ProductHistoryState.records = data.records;
          localStorage.setItem('AJAX_PRODUCT_REPAIR_HISTORY', JSON.stringify(data.records));
          if (document.getElementById('tab-product-qr-history')?.classList.contains('active')) {
            window.renderProductHistoryView();
          }
          return data.records;
        }
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem('AJAX_PRODUCT_REPAIR_HISTORY');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.ProductHistoryState.records = parsed;
          return parsed;
        }
      }
    } catch (e) {}

    return window.ProductHistoryState.records;
  }

  async function saveProductRepairRecord(record) {
    if (!record.id) {
      record.id = 'PRH_' + Date.now();
    }
    if (!record.createdAt) {
      record.createdAt = new Date().toISOString();
    }
    if (!record.timestamp) {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      record.timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    const state = window.ProductHistoryState;
    const existingIdx = state.records.findIndex(r => r.id === record.id);
    if (existingIdx >= 0) {
      state.records[existingIdx] = record;
    } else {
      state.records.unshift(record);
    }

    // Lưu LocalStorage
    try {
      localStorage.setItem('AJAX_PRODUCT_REPAIR_HISTORY', JSON.stringify(state.records));
    } catch (e) {}

    // Lưu Backend API
    try {
      await fetch('/api/product-repair-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', record })
      });
    } catch (e) {}

    window.renderProductHistoryView();
  }

  async function deleteProductRepairRecord(recordId) {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi sửa chữa này không?')) return;
    const state = window.ProductHistoryState;
    state.records = state.records.filter(r => r.id !== recordId);
    try {
      localStorage.setItem('AJAX_PRODUCT_REPAIR_HISTORY', JSON.stringify(state.records));
    } catch (e) {}
    try {
      await fetch('/api/product-repair-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: recordId })
      });
    } catch (e) {}
    if (window.showToast) window.showToast('info', 'Đã xóa bản ghi sửa chữa');
    window.renderProductHistoryView();
  }

  function getFilteredRecords() {
    const s = window.ProductHistoryState;
    const factoryFilter = (window.AppStore && window.AppStore.factoryFilter) || 'ALL';

    return (s.records || []).filter(r => {
      const effectiveWcFilter = (s.selectedWorkcell !== 'ALL') ? s.selectedWorkcell : (factoryFilter !== 'ALL' ? factoryFilter : 'ALL');
      if (effectiveWcFilter !== 'ALL') {
        const itemWc = (r.workcell || 'WCB').toUpperCase();
        if (itemWc !== effectiveWcFilter) return false;
      }
      if (s.selectedStage !== 'ALL') {
        if ((r.stage || '').toUpperCase() !== s.selectedStage.toUpperCase()) return false;
      }
      if (s.selectedDate) {
        if (r.date !== s.selectedDate) return false;
      }
      if (s.selectedShift !== 'ALL') {
        if (r.shift !== s.selectedShift) return false;
      }
      if (s.selectedLine !== 'ALL') {
        if (r.line !== s.selectedLine) return false;
      }
      if (s.selectedModel !== 'ALL') {
        const mKey = (r.model || r.modelGroup || '').toLowerCase();
        if (!mKey.includes(s.selectedModel.toLowerCase())) return false;
      }
      if (s.selectedRepairer !== 'ALL') {
        if (r.repairer !== s.selectedRepairer) return false;
      }
      if (s.selectedResult !== 'ALL') {
        if (r.result !== s.selectedResult) return false;
      }
      if (s.selectedStatus !== 'ALL') {
        if (r.status !== s.selectedStatus) return false;
      }
      if (s.scannedQrFilter) {
        const qSearch = s.scannedQrFilter.trim().toLowerCase();
        if (!(r.qrCode || '').toLowerCase().includes(qSearch)) return false;
      }
      if (s.searchKeyword) {
        const kw = s.searchKeyword.trim().toLowerCase();
        const match = (r.qrCode || '').toLowerCase().includes(kw)
          || (r.model || '').toLowerCase().includes(kw)
          || (r.defectDesc || '').toLowerCase().includes(kw)
          || (r.rootCause || '').toLowerCase().includes(kw)
          || (r.action || '').toLowerCase().includes(kw)
          || (r.repairer || '').toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });
  }

  function computeSummaryKpis(records) {
    const total = records.length;
    const uniqueQrs = new Set(records.map(r => (r.qrCode || '').trim()).filter(Boolean)).size;
    const okCount = records.filter(r => r.result === 'OK' || r.status === 'Input Line').length;
    const pendingCount = records.filter(r => r.result === 'Chờ linh kiện' || r.status === 'Đang sửa' || r.status === 'Chờ test lại').length;
    const ngCount = records.filter(r => r.result === 'NG' || r.result === 'Hủy (Scrap)').length;
    const passRate = total > 0 ? Math.round((okCount / total) * 100) : 100;
    return { total, uniqueQrs, okCount, pendingCount, ngCount, passRate };
  }

  // Tính toán dữ liệu phân tích (Analytics & Pareto)
  function computeAnalyticsData(records) {
    // 1. Phân bổ theo công đoạn
    const stageMap = {};
    records.forEach(r => {
      const st = r.stage || 'Chưa gán';
      stageMap[st] = (stageMap[st] || 0) + 1;
    });

    // 2. Top lỗi phổ biến nhất
    const defectMap = {};
    records.forEach(r => {
      const d = (r.defectDesc || 'Khác').trim();
      defectMap[d] = (defectMap[d] || 0) + 1;
    });
    const topDefects = Object.entries(defectMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Phân bổ theo Workcell (V01)
    const wcaCount = records.filter(r => (r.workcell || '').toUpperCase() === 'WCA').length;
    const wcbCount = records.filter(r => (r.workcell || '').toUpperCase() === 'WCB').length;

    // 4. Phân bổ theo KTV
    const repairerMap = {};
    records.forEach(r => {
      const rep = r.repairer || 'Chưa ghi';
      repairerMap[rep] = (repairerMap[rep] || 0) + 1;
    });

    return { stageMap, topDefects, wcaCount, wcbCount, repairerMap };
  }

  // ==========================================
  // GIAO DIỆN CHÍNH (RENDER VIEW)
  // ==========================================
  window.renderProductHistoryView = function(containerId = 'productHistoryContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = window.ProductHistoryState;
    const filtered = getFilteredRecords();
    const kpi = computeSummaryKpis(filtered);
    const analytics = computeAnalyticsData(filtered);
    const activeVer = (window.AppStore && window.AppStore.appVersion) || 'V01';
    const factoryFilter = (window.AppStore && window.AppStore.factoryFilter) || 'ALL';

    const currentUserRole = getCurrentUserRole();
    const currentUserName = getCurrentUserName();
    const isAuthorized = canUserInputData();

    const repairersList = Array.from(new Set(s.records.map(r => r.repairer).filter(Boolean))).sort();
    const modelOptions = getAvailableModelOptions();

    let qrHistoryHint = '';
    if (s.scannedQrFilter) {
      const qrMatches = s.records.filter(r => (r.qrCode || '').trim().toLowerCase() === s.scannedQrFilter.trim().toLowerCase());
      if (qrMatches.length > 0) {
        qrHistoryHint = `
          <div style="margin-top: 0.65rem; padding: 0.6rem 0.85rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 8px; font-size: 0.825rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
            <div>
              <span style="font-weight: 800; color: #38bdf8;">🔍 Mã QR [${s.scannedQrFilter}]:</span>
              <span style="color: #cbd5e1; margin-left: 0.4rem;">Đã ghi nhận <strong>${qrMatches.length} lần sửa chữa</strong>. Trạng thái gần nhất: <strong style="color: #34d399;">${qrMatches[0].status || 'OK'}</strong></span>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn btn-xs" onclick="window.handleOpenQrLifecycleModal('${encodeURIComponent(s.scannedQrFilter)}')" style="background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.6); font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 4px; cursor: pointer;">
                👁️ Xem Dòng Thời Gian Lịch Sử
              </button>
              <button type="button" class="btn btn-xs" onclick="window.handleClearQrFilter()" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.4); padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">
                ❌ Bỏ lọc QR
              </button>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <style>
@keyframes scanLaserAnim {
  0% { transform: translateY(-120px); opacity: 0.3; }
  50% { transform: translateY(0px); opacity: 1; }
  100% { transform: translateY(120px); opacity: 0.3; }
}
</style>
<div class="product-history-module" style="padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- HEADER VÀ QUYỀN ĐĂNG NHẬP -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; background: var(--bg-surface, #1e293b); padding: 0.85rem 1.15rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div>
            <div style="font-weight: 800; font-size: 1.1rem; color: #f8fafc; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span>📱 QUẢN LÝ LỊCH SỬ SỬA CHỮA & VÒNG ĐỜI SẢN PHẨM (QR CODE)</span>
              <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800;">
                Phiên bản ${activeVer}
              </span>
              ${isAuthorized ? `
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700;">
                  👤 ${currentUserName} (${currentUserRole.toUpperCase()})
                </span>
              ` : `
                <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700;">
                  🔒 Khách (Chỉ Xem • Cần đăng nhập KTV để nhập lỗi)
                </span>
              `}
            </div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">
              Dùng điện thoại quét mã QR sản phẩm phát sinh lỗi -> Nhập nội dung lỗi, nguyên nhân, cách xử lý -> Tự động lưu & export sang sheet Repair history.
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="window.handleOpenAddRepairModal()" style="font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.95rem; border-radius: 6px; background: #3b82f6; color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);">
              <span>➕ Ghi Nhận Lỗi Mới</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.handleToggleCameraScanner()" style="font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.95rem; border-radius: 6px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.55); cursor: pointer;">
              <span>📷 Quét Bằng Camera (Mobile)</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.handleExportRepairCsv()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); cursor: pointer;" title="Xuất file CSV chuẩn format sheet Repair history">
              <span>📤 Xuất Sheet 'Repair history'</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.handleCopyRepairClipboard()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.45); cursor: pointer;" title="Copy dữ liệu để mở Google Sheets và dán vào sheet Repair history">
              <span>📋 Copy Cho Sheet Repair history</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.handleToggleAnalytics()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border-radius: 6px; background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.4); cursor: pointer;">
              <span>📊 ${s.showAnalytics ? 'Ẩn Phân Tích' : 'Hiện Phân Tích'}</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.handleReloadProductHistory()" title="Tải lại dữ liệu từ máy chủ" style="padding: 0.5rem 0.75rem; border-radius: 6px; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.35); cursor: pointer;">
              <span>🔄 Làm mới</span>
            </button>
          </div>
        </div>

        <!-- CAMERA SCANNER VIEWPORT (TỐI ƯU CHO ĐIỆN THOẠI DI ĐỘNG) -->
        ${s.isCameraScanning ? `
          <div id="mobileCameraScannerBox" style="background: #0f172a; border: 2px solid #38bdf8; border-radius: 12px; padding: 1.25rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.6); position: relative;">
            <div style="font-size: 0.9rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span>📱 ĐANG QUÉT MÃ QR BẰNG CAMERA ĐIỆN THOẠI</span>
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">(Đưa mã QR vào khung viền)</span>
            </div>
            
            <div style="position: relative; width: 100%; max-width: 420px; height: 320px; margin: 0 auto; overflow: hidden; border-radius: 12px; border: 3px solid #34d399; background: #000; box-shadow: 0 0 25px rgba(52, 211, 153, 0.35);">
              <video id="qrCameraVideo" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
              
              <!-- Khung ngắm quét laser chuyển động -->
              <div style="position: absolute; inset: 20px; border: 2px dashed rgba(56, 189, 248, 0.85); border-radius: 12px; pointer-events: none; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #34d399, transparent); box-shadow: 0 0 12px #34d399; animation: scanLaserAnim 1.8s infinite ease-in-out;"></div>
                <div style="margin-top: auto; margin-bottom: 10px; font-size: 0.75rem; font-weight: 700; color: #34d399; background: rgba(0,0,0,0.6); padding: 0.2rem 0.6rem; border-radius: 4px;">
                  Sẵn sàng nhận diện mã QR
                </div>
              </div>
            </div>

            <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary" onclick="window.handleStopCameraScanner()" style="padding: 0.45rem 1rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; font-weight: 700; cursor: pointer;">
                ✕ Đóng Camera
              </button>
              <label class="btn btn-secondary" style="padding: 0.45rem 1rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; font-weight: 700; cursor: pointer;">
                📁 Chọn ảnh chụp QR
                <input type="file" accept="image/*" capture="environment" onchange="window.handleUploadQrImage(event)" style="display: none;">
              </label>
            </div>
          </div>
        ` : ''}

        <!-- Ô SCAN QR CODE LỚN TRUNG TÂM -->
        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98)); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 1rem 1.15rem; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px;">
              📷
            </div>
            <div style="flex: 1; min-width: 260px;">
              <input
                type="text"
                id="qrFastScanInput"
                class="font-mono"
                placeholder="Quét hoặc nhập mã QR Code sản phẩm (VD: device 31c0794b142) rồi bấm Enter..."
                value="${s.scannedQrFilter}"
                onkeydown="if(event.key === 'Enter') { window.handleQrFastScan(this.value); }"
                style="width: 100%; padding: 0.6rem 0.85rem; font-size: 0.925rem; font-weight: 600; background: #0b1329; color: #38bdf8; border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 6px; outline: none; box-sizing: border-box;"
              />
            </div>
            <button
              type="button"
              class="btn btn-primary"
              onclick="window.handleQrFastScan(document.getElementById('qrFastScanInput').value)"
              style="padding: 0.6rem 1.15rem; font-weight: 800; font-size: 0.85rem; background: #0284c7; color: #fff; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;"
            >
              🔍 Quét / Tra Cứu
            </button>
            <button
              type="button"
              class="btn btn-success"
              onclick="window.handleQuickAddNewForQr()"
              style="padding: 0.6rem 1.15rem; font-weight: 800; font-size: 0.85rem; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.5); border-radius: 6px; cursor: pointer; white-space: nowrap;"
            >
              ➕ Thêm lỗi cho QR này
            </button>
          </div>

          ${qrHistoryHint}
        </div>

        <!-- THẺ KPI TỔNG QUAN -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">TỔNG LƯỢT SỬA CHỮA</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #38bdf8; margin-top: 0.2rem;">
              ${kpi.total} <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">lượt</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">SỐ SẢN PHẨM (UNIQUE QR)</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #a78bfa; margin-top: 0.2rem;">
              ${kpi.uniqueQrs} <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">mã QR</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">ĐÃ XỬ LÝ OK / INPUT LINE</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #34d399; margin-top: 0.2rem;">
              ${kpi.okCount} <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">máy</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">ĐANG SỬA / CHỜ LINH KIỆN</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #fbbf24; margin-top: 0.2rem;">
              ${kpi.pendingCount} <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">máy</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">TỈ LỆ SỬA THÀNH CÔNG</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: ${kpi.passRate >= 90 ? '#34d399' : '#fbbf24'}; margin-top: 0.2rem;">
              ${kpi.passRate}%
            </div>
          </div>
        </div>

        <!-- KHỐI TỔNG HỢP & PHÂN TÍCH DATA DÀNH CHO ADMIN VÀ USER KHÁC -->
        ${s.showAnalytics ? `
          <div style="background: var(--bg-surface, #1e293b); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 8px; padding: 1rem 1.15rem;">
            <div style="font-size: 0.85rem; font-weight: 800; color: #a78bfa; text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
              <span>📊 TỔNG HỢP & PHÂN TÍCH DỮ LIỆU SỬA CHỮA (ANALYTICS & SUMMARY)</span>
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Dành cho Admin & Quản lý chất lượng</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
              <!-- 1. Phân bổ theo Công Đoạn -->
              <div style="background: #0f172a; padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 0.78rem; font-weight: 700; color: #38bdf8; margin-bottom: 0.6rem;">🔬 Phân Bổ Theo Công Đoạn:</div>
                <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                  ${Object.entries(analytics.stageMap).map(([st, cnt]) => {
                    const pct = kpi.total > 0 ? Math.round((cnt / kpi.total) * 100) : 0;
                    return `
                      <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.15rem;">
                          <span style="color: #cbd5e1; font-weight: 600;">${st}</span>
                          <span style="color: #38bdf8; font-weight: 700;">${cnt} máy (${pct}%)</span>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                          <div style="height: 100%; width: ${pct}%; background: #38bdf8; border-radius: 3px;"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 2. Top 5 Lỗi Phổ Biến (Pareto) -->
              <div style="background: #0f172a; padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 0.78rem; font-weight: 700; color: #f87171; margin-bottom: 0.6rem;">⚠️ Top 5 Lỗi Xuất Hiện Nhiều Nhất:</div>
                <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                  ${analytics.topDefects.map((td, idx) => {
                    const pct = kpi.total > 0 ? Math.round((td.count / kpi.total) * 100) : 0;
                    return `
                      <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.15rem;">
                          <span style="color: #cbd5e1; font-weight: 600;">#${idx+1} ${td.name}</span>
                          <span style="color: #f87171; font-weight: 700;">${td.count} lượt (${pct}%)</span>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                          <div style="height: 100%; width: ${pct}%; background: #f87171; border-radius: 3px;"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 3. Phân bổ theo Workcell & Năng suất KTV -->
              <div style="background: #0f172a; padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 0.78rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.6rem;">🏢 So Sánh Workcell (V01) & KTV:</div>
                <div style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem;">
                  <div style="flex: 1; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 4px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                    <div style="font-size: 0.7rem; color: #94a3b8;">XƯỞNG WCA</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: #38bdf8;">${analytics.wcaCount} <span style="font-size: 0.75rem;">máy</span></div>
                  </div>
                  <div style="flex: 1; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 4px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                    <div style="font-size: 0.7rem; color: #94a3b8;">XƯỞNG WCB</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: #fbbf24;">${analytics.wcbCount} <span style="font-size: 0.75rem;">máy</span></div>
                  </div>
                </div>

                <div style="font-size: 0.725rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.35rem;">KTV Sửa Chữa Đang Tham Gia:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                  ${Object.entries(analytics.repairerMap).map(([rep, cnt]) => `
                    <span style="font-size: 0.725rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.15rem 0.45rem; border-radius: 4px;">
                      👤 ${rep}: <strong>${cnt}</strong>
                    </span>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- KHỐI BỘ LỌC CHÍNH (THEO CONCEPT ẢNH 1: CÔNG ĐOẠN / NGÀY / CA / LINE / MODEL / KTV) -->
        <div style="background: var(--bg-surface, #1e293b); padding: 1rem 1.15rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.825rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
            <span>🔍 Bộ Lọc Dữ Liệu Lịch Sử Sửa Chữa (Concept Ảnh 1)</span>
            <button type="button" class="btn btn-xs" onclick="window.handleResetProductHistoryFilters()" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; cursor: pointer;">
              🔄 Xóa bộ lọc
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; align-items: end;">
            <!-- 1. Công Đoạn -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Công Đoạn :</label>
              <select id="prhStageFilter" class="select-filter" onchange="window.handleFilterChange('selectedStage', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedStage === 'ALL' ? 'selected' : ''}>-- Tất cả công đoạn --</option>
                ${STAGE_OPTIONS.map(opt => `<option value="${opt.value}" ${s.selectedStage === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>

            <!-- 2. Workcell (V01) -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Workcell (Xưởng) :</label>
              <select id="prhWorkcellFilter" class="select-filter" onchange="window.handleFilterChange('selectedWorkcell', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedWorkcell === 'ALL' ? 'selected' : ''}>⭐ Tất cả xưởng</option>
                <option value="WCA" ${s.selectedWorkcell === 'WCA' ? 'selected' : ''}>🏢 Xưởng WCA</option>
                <option value="WCB" ${s.selectedWorkcell === 'WCB' ? 'selected' : ''}>🏭 Xưởng WCB</option>
              </select>
            </div>

            <!-- 3. Ngày -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Ngày :</label>
              <input type="date" id="prhDateFilter" value="${s.selectedDate}" onchange="window.handleFilterChange('selectedDate', this.value)" style="width: 100%; padding: 0.38rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
            </div>

            <!-- 4. Ca -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Ca :</label>
              <select id="prhShiftFilter" class="select-filter" onchange="window.handleFilterChange('selectedShift', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedShift === 'ALL' ? 'selected' : ''}>-- Cả 2 Ca --</option>
                <option value="DAY" ${s.selectedShift === 'DAY' ? 'selected' : ''}>☀️ Ca Ngày</option>
                <option value="NIGHT" ${s.selectedShift === 'NIGHT' ? 'selected' : ''}>🌙 Ca Đêm</option>
              </select>
            </div>

            <!-- 5. Line -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Line :</label>
              <select id="prhLineFilter" class="select-filter" onchange="window.handleFilterChange('selectedLine', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedLine === 'ALL' ? 'selected' : ''}>-- Tất cả các Line --</option>
                ${LINE_OPTIONS.map(l => `<option value="${l}" ${s.selectedLine === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>

            <!-- 6. Model -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Model :</label>
              <input type="text" id="prhModelFilter" placeholder="Tìm theo Model..." value="${s.selectedModel === 'ALL' ? '' : s.selectedModel}" oninput="window.handleFilterChange('selectedModel', this.value || 'ALL')" style="width: 100%; padding: 0.38rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
            </div>

            <!-- 7. Người Sửa Chữa -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Người Sửa Chữa :</label>
              <select id="prhRepairerFilter" class="select-filter" onchange="window.handleFilterChange('selectedRepairer', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedRepairer === 'ALL' ? 'selected' : ''}>-- Tất cả KTV --</option>
                ${repairersList.map(rep => `<option value="${rep}" ${s.selectedRepairer === rep ? 'selected' : ''}>${rep}</option>`).join('')}
              </select>
            </div>

            <!-- 8. Kết Quả -->
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #94a3b8); margin-bottom: 0.3rem;">Kết Quả :</label>
              <select id="prhResultFilter" class="select-filter" onchange="window.handleFilterChange('selectedResult', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedResult === 'ALL' ? 'selected' : ''}>-- Tất cả kết quả --</option>
                <option value="OK" ${s.selectedResult === 'OK' ? 'selected' : ''}>✅ OK (Đạt)</option>
                <option value="Chờ linh kiện" ${s.selectedResult === 'Chờ linh kiện' ? 'selected' : ''}>⏳ Chờ linh kiện</option>
                <option value="NG" ${s.selectedResult === 'NG' ? 'selected' : ''}>❌ NG</option>
                <option value="Hủy (Scrap)" ${s.selectedResult === 'Hủy (Scrap)' ? 'selected' : ''}>🗑️ Hủy (Scrap)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- BẢNG DỮ LIỆU DANH SÁCH LỊCH SỬ (CONCEPT ẢNH 1) -->
        <div style="background: var(--bg-surface, #1e293b); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.9rem; color: #f8fafc; display: flex; align-items: center; gap: 0.45rem;">
              <span>📋 BẢNG LỊCH SỬ SỬA CHỮA CHI TIẾT</span>
              <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">
                Hiển thị ${filtered.length} bản ghi
              </span>
            </div>
            <div>
              <input type="text" placeholder="Tìm nhanh trong bảng..." value="${s.searchKeyword}" oninput="window.handleFilterChange('searchKeyword', this.value)" style="padding: 0.35rem 0.75rem; font-size: 0.775rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; min-width: 240px;">
            </div>
          </div>

          <div style="overflow-x: auto; max-height: 620px;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
              <thead style="background: #0f172a; position: sticky; top: 0; z-index: 10; border-bottom: 1.5px solid rgba(255,255,255,0.15);">
                <tr>
                  <th style="padding: 0.6rem 0.45rem; text-align: center; width: 45px; color: #94a3b8;">STT</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 200px; color: #f8fafc;">Model</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 175px; color: #38bdf8;">QR Code</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 160px; color: #f87171;">Nội Dung Lỗi</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 160px; color: #fbbf24;">Nguyên Nhân</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 170px; color: #38bdf8;">Cách Xử Lý</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 90px; color: #34d399;">Kết Quả</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 100px; color: #38bdf8;">Hiện trạng</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 100px; color: #cbd5e1;">Công Đoạn</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 75px; color: #fbbf24;">Workcell</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 80px; color: #cbd5e1;">Line</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 110px; color: #cbd5e1;">Ngày / Ca</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 120px; color: #f8fafc;">Người Sửa Chữa</th>
                  <th style="padding: 0.6rem 0.45rem; text-align: center; min-width: 90px; color: #94a3b8;">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="14" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                      <div>Không tìm thấy bản ghi sửa chữa nào phù hợp</div>
                      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">Thử điều chỉnh lại bộ lọc hoặc quét mã QR Code để bắt đầu ghi nhận</div>
                    </td>
                  </tr>
                ` : filtered.map((r, idx) => {
                  const isOk = r.result === 'OK' || r.status === 'Input Line';
                  const isPending = r.result === 'Chờ linh kiện' || r.status === 'Đang sửa';
                  const resBg = isOk ? 'rgba(16, 185, 129, 0.15)' : (isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');
                  const resColor = isOk ? '#34d399' : (isPending ? '#fbbf24' : '#f87171');
                  const wc = (r.workcell || 'WCA').toUpperCase();
                  const wcBg = wc === 'WCA' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                  const wcColor = wc === 'WCA' ? '#38bdf8' : '#fbbf24';

                  return `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 0.55rem 0.45rem; text-align: center; color: #94a3b8; font-weight: 700;">${idx + 1}</td>
                      
                      <td style="padding: 0.55rem 0.55rem; color: #f8fafc; font-weight: 600;">
                        <div>${r.model || 'Chưa chọn Model'}</div>
                        ${r.modelGroup ? `<div style="font-size: 0.7rem; color: #94a3b8;">Nhóm: ${r.modelGroup}</div>` : ''}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; font-family: monospace; font-size: 0.8rem;">
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                          <span style="color: #38bdf8; font-weight: 700; background: rgba(56, 189, 248, 0.12); padding: 0.2rem 0.45rem; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.3);">${r.qrCode || 'N/A'}</span>
                          <button type="button" title="Xem dòng thời gian của mã QR này" onclick="window.handleOpenQrLifecycleModal('${encodeURIComponent(r.qrCode)}')" style="background: none; border: none; color: #38bdf8; cursor: pointer; padding: 0.15rem 0.3rem;">
                            🔄
                          </button>
                        </div>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; color: #f87171; font-weight: 600;">${r.defectDesc || '--'}</td>
                      <td style="padding: 0.55rem 0.55rem; color: #fbbf24;">${r.rootCause || '--'}</td>
                      <td style="padding: 0.55rem 0.55rem; color: #cbd5e1;">${r.action || '--'}</td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span class="badge" style="background: ${resBg}; color: ${resColor}; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.75rem;">
                          ${r.result || 'OK'}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span class="badge" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">
                          ${r.status || 'Input Line'}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.725rem; font-weight: 700;">
                          ${r.stage || 'ASSEMBLY'}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span class="badge" style="background: ${wcBg}; color: ${wcColor}; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800; font-size: 0.725rem;">
                          ${wc}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; color: #cbd5e1; font-weight: 600;">
                        ${r.line || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; font-size: 0.725rem; color: #94a3b8;">
                        <div>${r.date || '--'}</div>
                        <div style="color: ${r.shift === 'DAY' ? '#fbbf24' : '#60a5fa'}; font-weight: 700;">${r.shiftName || (r.shift === 'DAY' ? '☀️ Ca Ngày' : '🌙 Ca Đêm')}</div>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; font-weight: 600; color: #f8fafc;">
                        ${r.repairer || 'N/A'}
                      </td>

                      <td style="padding: 0.55rem 0.45rem; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
                          <button type="button" title="Chỉnh sửa bản ghi này" onclick="window.handleEditRepairRecord('${r.id}')" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; border-radius: 4px; padding: 0.2rem 0.45rem; cursor: pointer;">
                            ✏️
                          </button>
                          <button type="button" title="Xóa bản ghi này" onclick="window.handleDeleteRepairRecord('${r.id}')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 4px; padding: 0.2rem 0.45rem; cursor: pointer;">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ========================================== -->
      <!-- MODAL 1: THÊM / CHỈNH SỬA BẢN GHI SỬA CHỮA -->
      <!-- TỐI ƯU CỰC TỐT CHO ĐIỆN THOẠI DI ĐỘNG        -->
      <!-- ========================================== -->
      <div id="repairRecordModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 0.75rem;">
        <div class="modal-card" style="background: #1e293b; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto; box-shadow: 0 15px 35px rgba(0,0,0,0.6); padding: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="font-weight: 800; font-size: 1.05rem; color: #f8fafc; display: flex; align-items: center; gap: 0.4rem;">
              <span id="repairModalTitleIcon">➕</span>
              <span id="repairModalTitleText">Ghi Nhận Lỗi & Lịch Sử Sửa Chữa Mới</span>
            </div>
            <button type="button" onclick="window.handleCloseRepairModal()" style="background: none; border: none; font-size: 1.4rem; color: #94a3b8; cursor: pointer;">✕</button>
          </div>

          <form id="repairRecordForm" onsubmit="window.handleSaveRepairForm(event)">
            <input type="hidden" id="modalRecordId" value="">

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 0.85rem;">
              <!-- Mã QR Code -->
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.3rem;">Mã QR Code Sản Phẩm (*):</label>
                <input type="text" id="modalQrCode" required placeholder="VD: device 31c0794b142" style="width: 100%; padding: 0.55rem; font-size: 0.9rem; font-family: monospace; font-weight: 700; background: #0f172a; color: #38bdf8; border: 1.5px solid rgba(56, 189, 248, 0.6); border-radius: 6px; box-sizing: border-box;">
              </div>

              <!-- Model Sản Phẩm -->
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.3rem;">Model Sản Phẩm (*):</label>
                <input list="modalModelList" id="modalModel" required placeholder="Chọn hoặc nhập Model..." style="width: 100%; padding: 0.55rem; font-size: 0.85rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box;">
                <datalist id="modalModelList">
                  ${modelOptions.map(m => `<option value="${m}">`).join('')}
                </datalist>
              </div>
            </div>

            <!-- Công Đoạn, Workcell, Line -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Công Đoạn (*):</label>
                <select id="modalStage" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  ${STAGE_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Workcell (*):</label>
                <select id="modalWorkcell" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  <option value="WCA">🏢 Xưởng WCA</option>
                  <option value="WCB">🏭 Xưởng WCB</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Line Sản Xuất (*):</label>
                <select id="modalLine" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  ${LINE_OPTIONS.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Ngày, Ca, Người Sửa Chữa -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Ngày Sửa (*):</label>
                <input type="date" id="modalDate" required value="2026-11-27" style="width: 100%; padding: 0.48rem; font-size: 0.825rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box;">
              </div>

              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Ca Làm Việc (*):</label>
                <select id="modalShift" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  <option value="DAY">☀️ Ca Ngày</option>
                  <option value="NIGHT">🌙 Ca Đêm</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Người Sửa Chữa (*):</label>
                <input type="text" id="modalRepairer" required value="${currentUserName}" placeholder="Tên KTV..." style="width: 100%; padding: 0.48rem; font-size: 0.825rem; background: #0f172a; color: #34d399; font-weight: 700; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box;">
              </div>
            </div>

            <!-- NỘI DUNG LỖI + CHIPS GỢI Ý NHANH -->
            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #f87171; margin-bottom: 0.3rem;">Nội Dung Lỗi (*):</label>
              <input type="text" id="modalDefectDesc" required placeholder="VD: Không lên đèn / kẹt nút..." style="width: 100%; padding: 0.55rem; font-size: 0.85rem; background: #0f172a; color: #f87171; font-weight: 700; border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 6px; box-sizing: border-box;">
              <!-- Quick touch chips -->
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem;">
                <span style="font-size: 0.7rem; color: #94a3b8; align-self: center;">💡 Chạm nhanh:</span>
                ${COMMON_DEFECTS.map(d => `
                  <button type="button" onclick="document.getElementById('modalDefectDesc').value='${d}'" style="font-size: 0.725rem; background: rgba(248, 113, 113, 0.12); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 4px; padding: 0.18rem 0.45rem; cursor: pointer;">
                    ${d}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- NGUYÊN NHÂN + CHIPS GỢI Ý NHANH -->
            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.3rem;">Nguyên Nhân (*):</label>
              <input type="text" id="modalRootCause" required placeholder="VD: PCB NG / Bavia nhựa..." style="width: 100%; padding: 0.55rem; font-size: 0.85rem; background: #0f172a; color: #fbbf24; font-weight: 700; border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 6px; box-sizing: border-box;">
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem;">
                <span style="font-size: 0.7rem; color: #94a3b8; align-self: center;">💡 Chạm nhanh:</span>
                ${COMMON_CAUSES.map(c => `
                  <button type="button" onclick="document.getElementById('modalRootCause').value='${c}'" style="font-size: 0.725rem; background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 4px; padding: 0.18rem 0.45rem; cursor: pointer;">
                    ${c}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- CÁCH XỬ LÝ + CHIPS GỢI Ý NHANH -->
            <div style="margin-bottom: 0.85rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.3rem;">Cách Xử Lý (*):</label>
              <input type="text" id="modalAction" required placeholder="VD: Chạy lại Hardtest / Hàn lại chân..." style="width: 100%; padding: 0.55rem; font-size: 0.85rem; background: #0f172a; color: #38bdf8; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; box-sizing: border-box;">
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem;">
                <span style="font-size: 0.7rem; color: #94a3b8; align-self: center;">💡 Chạm nhanh:</span>
                ${COMMON_ACTIONS.map(a => `
                  <button type="button" onclick="document.getElementById('modalAction').value='${a}'" style="font-size: 0.725rem; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 0.18rem 0.45rem; cursor: pointer;">
                    ${a}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- KẾT QUẢ & HIỆN TRẠNG -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Kết Quả (*):</label>
                <select id="modalResult" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #34d399; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  <option value="OK">✅ OK (Đã sửa xong)</option>
                  <option value="Chờ linh kiện">⏳ Chờ linh kiện thay thế</option>
                  <option value="NG">❌ NG (Chưa khắc phục được)</option>
                  <option value="Hủy (Scrap)">🗑️ Hủy (Scrap)</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Hiện Trạng Tiếp Theo (*):</label>
                <select id="modalStatus" required style="width: 100%; padding: 0.5rem; font-size: 0.85rem; background: #0f172a; color: #38bdf8; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;">
                  <option value="Input Line">🚀 Input Line (Đã quay lại chuyền)</option>
                  <option value="Đang sửa">🔧 Đang sửa chữa tại bàn</option>
                  <option value="Chờ test lại">🔬 Chờ chạy lại trạm test</option>
                  <option value="Đã hủy">🗑️ Đã hủy linh kiện</option>
                </select>
              </div>
            </div>

            <!-- GHI CHÚ -->
            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.3rem;">Ghi Chú Chi Tiết:</label>
              <textarea id="modalNote" rows="2" placeholder="Ghi chú thêm thông số kiểm tra, kết quả đo đạc..." style="width: 100%; padding: 0.5rem; font-size: 0.825rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box; resize: vertical;"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
              <button type="button" class="btn btn-secondary" onclick="window.handleCloseRepairModal()" style="padding: 0.55rem 1.15rem; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 6px; cursor: pointer; font-weight: 700;">
                Hủy bỏ
              </button>
              <button type="submit" class="btn btn-primary" style="padding: 0.55rem 1.25rem; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem;">
                💾 Lưu Bản Ghi Sửa Chữa
              </button>
              <button type="button" class="btn btn-success" onclick="window.handleSaveAndScanNext(event)" style="padding: 0.55rem 1.25rem; background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.6); border-radius: 6px; cursor: pointer; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem;">
                📷 Lưu & Quét Tiếp Máy Khác
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL 2: DÒNG THỜI GIAN VÒNG ĐỜI MÃ QR   -->
      <!-- ========================================== -->
      <div id="qrLifecycleModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10001; align-items: center; justify-content: center; padding: 1rem;">
        <div class="modal-card" style="background: #1e293b; border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 12px; width: 100%; max-width: 620px; max-height: 88vh; overflow-y: auto; padding: 1.25rem; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="font-weight: 800; font-size: 1rem; color: #38bdf8;">
              🔍 LỊCH SỬ VÒNG ĐỜI SẢN PHẨM: <span id="lifecycleQrCodeText" class="font-mono" style="color: #f8fafc;"></span>
            </div>
            <button type="button" onclick="window.handleCloseQrLifecycleModal()" style="background: none; border: none; font-size: 1.4rem; color: #94a3b8; cursor: pointer;">✕</button>
          </div>
          <div id="lifecycleContent"></div>
          <div style="margin-top: 1rem; text-align: right; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="window.handleCloseQrLifecycleModal()" style="padding: 0.4rem 1rem; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 6px; cursor: pointer;">Đóng</button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL 3: YÊU CẦU ĐĂNG NHẬP (PERMISSION)    -->
      <!-- ========================================== -->
      <div id="authRequireModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10002; align-items: center; justify-content: center; padding: 1rem;">
        <div class="modal-card" style="background: #1e293b; border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 12px; width: 100%; max-width: 460px; padding: 1.5rem; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.7);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔒</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.5rem;">
            YÊU CẦU ĐĂNG NHẬP TÀI KHOẢN KTV / ADMIN
          </div>
          <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 1.25rem;">
            Bạn đang truy cập với vai trò <strong>Khách (Chỉ Xem)</strong>. Để scan mã QR và ghi nhận dữ liệu sửa chữa sản phẩm, vui lòng đăng nhập tài khoản KTV hoặc Admin được cấp quyền.
          </div>
          <div style="display: flex; justify-content: center; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('authRequireModal').style.display='none'" style="padding: 0.5rem 1rem; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 6px; cursor: pointer;">
              Để sau
            </button>
            <button type="button" class="btn btn-primary" onclick="window.handleOpenLoginFromDefect()" style="padding: 0.5rem 1.25rem; background: #3b82f6; color: #fff; border: none; border-radius: 6px; font-weight: 800; cursor: pointer;">
              🔑 Đăng Nhập Ngay
            </button>
          </div>
        </div>
      </div>
    `;

    // Khởi tạo video stream nếu camera đang mở
    if (s.isCameraScanning) {
      startCameraVideoStreaming();
    }
  };

  // ==========================================
  // XỬ LÝ CAMERA STREAMING & TỰ ĐỘNG BẬT FORM
  // ==========================================
  async function startCameraVideoStreaming() {
    const s = window.ProductHistoryState;
    const videoElem = document.getElementById('qrCameraVideo');
    if (!videoElem) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      s.mediaStream = stream;
      videoElem.srcObject = stream;

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix'] });
        const scanLoop = async () => {
          if (!s.isCameraScanning) return;
          try {
            const barcodes = await barcodeDetector.detect(videoElem);
            if (barcodes.length > 0) {
              const rawValue = (barcodes[0].rawValue || '').trim();
              if (rawValue) {
                playBeepSound();
                triggerVibrate();
                window.handleStopCameraScanner();
                if (window.showToast) window.showToast('success', `📱 Đã nhận diện QR: ${rawValue}`);
                window.handleOpenAddRepairModalForScannedQr(rawValue);
                return;
              }
            }
          } catch (err) {}
          if (s.isCameraScanning) requestAnimationFrame(scanLoop);
        };
        videoElem.onloadedmetadata = () => scanLoop();
      } else {
        if (window.showToast) window.showToast('info', 'Đã bật camera. Nhập mã QR hoặc chụp ảnh để nhận diện.');
      }
    } catch (err) {
      s.isCameraScanning = false;
      window.renderProductHistoryView();
      alert('Không thể mở Camera: ' + (err.message || 'Thiết bị không có Camera hoặc bị chặn quyền.'));
    }
  }

  window.handleToggleCameraScanner = function() {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }
    const s = window.ProductHistoryState;
    if (s.isCameraScanning) {
      window.handleStopCameraScanner();
      return;
    }
    s.isCameraScanning = true;
    window.renderProductHistoryView();
  };

  window.handleStopCameraScanner = function() {
    const s = window.ProductHistoryState;
    s.isCameraScanning = false;
    if (s.mediaStream) {
      s.mediaStream.getTracks().forEach(t => t.stop());
      s.mediaStream = null;
    }
    window.renderProductHistoryView();
  };

  // Xử lý ảnh chụp QR tải lên từ điện thoại
  window.handleUploadQrImage = async function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'data_matrix'] });
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
          try {
            const codes = await barcodeDetector.detect(img);
            if (codes && codes.length > 0) {
              const rawVal = codes[0].rawValue;
              playBeepSound();
              triggerVibrate();
              window.handleStopCameraScanner();
              if (window.showToast) window.showToast('success', `📱 Đã nhận diện ảnh QR: ${rawVal}`);
              window.handleOpenAddRepairModalForScannedQr(rawVal);
            } else {
              alert('Không tìm thấy mã QR trong ảnh vừa chọn. Vui lòng thử chụp góc rõ hơn.');
            }
          } catch (e) {
            alert('Lỗi phân tích ảnh QR: ' + e.message);
          }
        };
      } catch (e) {
        alert('Trình duyệt chưa hỗ trợ quét ảnh QR: ' + e.message);
      }
    } else {
      alert('Vui lòng nhập trực tiếp mã QR vào ô tìm kiếm.');
    }
  };

  window.handleOpenAddRepairModalForScannedQr = function(scannedQr) {
    window.handleOpenAddRepairModal();
    const qrInput = document.getElementById('modalQrCode');
    if (qrInput) qrInput.value = scannedQr;

    // Tự động tìm model nếu mã này đã từng xuất hiện trước đây
    const existing = window.ProductHistoryState.records.find(r => (r.qrCode || '').toLowerCase() === scannedQr.toLowerCase());
    if (existing) {
      const modelInput = document.getElementById('modalModel');
      if (modelInput && existing.model) modelInput.value = existing.model;
      const stageInput = document.getElementById('modalStage');
      if (stageInput && existing.stage) stageInput.value = existing.stage;
      const workcellInput = document.getElementById('modalWorkcell');
      if (workcellInput && existing.workcell) workcellInput.value = existing.workcell;
      const lineInput = document.getElementById('modalLine');
      if (lineInput && existing.line) lineInput.value = existing.line;
    }
  };

  // ==========================================
  // HÀNH ĐỘNG FORM THÊM / SỬA / XÓA
  // ==========================================
  window.handleOpenAddRepairModal = function() {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }

    window.ProductHistoryState.editingRecordId = null;
    const modal = document.getElementById('repairRecordModal');
    if (!modal) return;

    document.getElementById('repairModalTitleIcon').textContent = '➕';
    document.getElementById('repairModalTitleText').textContent = 'Ghi Nhận Lỗi & Lịch Sử Sửa Chữa Mới';
    document.getElementById('modalRecordId').value = '';
    document.getElementById('modalQrCode').value = window.ProductHistoryState.scannedQrFilter || '';
    document.getElementById('modalModel').value = '';
    document.getElementById('modalStage').value = 'HARD TEST';
    document.getElementById('modalWorkcell').value = (window.AppStore && window.AppStore.factoryFilter === 'WCA') ? 'WCA' : 'WCB';
    document.getElementById('modalLine').value = 'Line 1A';
    document.getElementById('modalDate').value = '2026-11-27';
    document.getElementById('modalShift').value = 'DAY';
    document.getElementById('modalRepairer').value = getCurrentUserName();
    document.getElementById('modalDefectDesc').value = '';
    document.getElementById('modalRootCause').value = '';
    document.getElementById('modalAction').value = '';
    document.getElementById('modalResult').value = 'OK';
    document.getElementById('modalStatus').value = 'Input Line';
    document.getElementById('modalNote').value = '';

    modal.style.display = 'flex';
  };

  window.handleQuickAddNewForQr = function() {
    window.handleOpenAddRepairModal();
    const qrVal = document.getElementById('qrFastScanInput')?.value || window.ProductHistoryState.scannedQrFilter;
    if (qrVal) {
      document.getElementById('modalQrCode').value = qrVal;
    }
  };

  window.handleEditRepairRecord = function(recordId) {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }

    const r = window.ProductHistoryState.records.find(item => item.id === recordId);
    if (!r) return;

    window.ProductHistoryState.editingRecordId = recordId;
    const modal = document.getElementById('repairRecordModal');
    if (!modal) return;

    document.getElementById('repairModalTitleIcon').textContent = '✏️';
    document.getElementById('repairModalTitleText').textContent = 'Chỉnh Sửa Bản Ghi Lỗi Sửa Chữa';
    document.getElementById('modalRecordId').value = r.id;
    document.getElementById('modalQrCode').value = r.qrCode || '';
    document.getElementById('modalModel').value = r.model || '';
    document.getElementById('modalStage').value = r.stage || 'HARD TEST';
    document.getElementById('modalWorkcell').value = (r.workcell || 'WCA').toUpperCase();
    document.getElementById('modalLine').value = r.line || 'Line 1A';
    document.getElementById('modalDate').value = r.date || '2026-11-27';
    document.getElementById('modalShift').value = r.shift || 'DAY';
    document.getElementById('modalRepairer').value = r.repairer || getCurrentUserName();
    document.getElementById('modalDefectDesc').value = r.defectDesc || '';
    document.getElementById('modalRootCause').value = r.rootCause || '';
    document.getElementById('modalAction').value = r.action || '';
    document.getElementById('modalResult').value = r.result || 'OK';
    document.getElementById('modalStatus').value = r.status || 'Input Line';
    document.getElementById('modalNote').value = r.note || '';

    modal.style.display = 'flex';
  };

  window.handleCloseRepairModal = function() {
    const modal = document.getElementById('repairRecordModal');
    if (modal) modal.style.display = 'none';
  };

  window.handleSaveRepairForm = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }

    const id = document.getElementById('modalRecordId').value.trim();
    const qrCode = document.getElementById('modalQrCode').value.trim();
    const model = document.getElementById('modalModel').value.trim();
    const stage = document.getElementById('modalStage').value;
    const workcell = document.getElementById('modalWorkcell').value;
    const line = document.getElementById('modalLine').value;
    const date = document.getElementById('modalDate').value;
    const shift = document.getElementById('modalShift').value;
    const repairer = document.getElementById('modalRepairer').value.trim();
    const defectDesc = document.getElementById('modalDefectDesc').value.trim();
    const rootCause = document.getElementById('modalRootCause').value.trim();
    const action = document.getElementById('modalAction').value.trim();
    const result = document.getElementById('modalResult').value;
    const status = document.getElementById('modalStatus').value;
    const note = document.getElementById('modalNote').value.trim();

    if (!qrCode || !defectDesc) {
      alert('Vui lòng điền đầy đủ Mã QR Code và Nội Dung Lỗi!');
      return;
    }

    const shiftName = shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm';
    const record = {
      id: id || ('PRH_' + Date.now()),
      qrCode,
      model: model || 'Ajax Model',
      stage,
      workcell,
      line,
      date,
      shift,
      shiftName,
      repairer: repairer || getCurrentUserName(),
      defectDesc,
      rootCause: rootCause || 'Chưa xác định',
      action: action || 'Đã kiểm tra',
      result,
      status,
      note
    };

    await saveProductRepairRecord(record);
    window.handleCloseRepairModal();
    if (window.showToast) window.showToast('success', `💾 Đã lưu thành công lịch sử lỗi cho QR: ${qrCode}`);
  };

  window.handleSaveAndScanNext = async function(e) {
    await window.handleSaveRepairForm(e);
    // Tự động mở lại camera để KTV quét máy tiếp theo
    setTimeout(() => {
      window.handleToggleCameraScanner();
    }, 350);
  };

  window.handleDeleteRepairRecord = function(recordId) {
    deleteProductRepairRecord(recordId);
  };

  // ==========================================
  // BỘ LỌC VÀ TÌM KIẾM
  // ==========================================
  window.handleFilterChange = function(field, value) {
    window.ProductHistoryState[field] = value;
    window.renderProductHistoryView();
  };

  window.handleResetProductHistoryFilters = function() {
    const s = window.ProductHistoryState;
    s.selectedStage = 'ALL';
    s.selectedWorkcell = 'ALL';
    s.selectedDate = '';
    s.selectedShift = 'ALL';
    s.selectedLine = 'ALL';
    s.selectedModel = 'ALL';
    s.selectedRepairer = 'ALL';
    s.selectedResult = 'ALL';
    s.selectedStatus = 'ALL';
    s.searchKeyword = '';
    s.scannedQrFilter = '';
    window.renderProductHistoryView();
    if (window.showToast) window.showToast('info', 'Đã đặt lại toàn bộ bộ lọc');
  };

  window.handleQrFastScan = function(qrValue) {
    const val = (qrValue || '').trim();
    if (!val) {
      window.ProductHistoryState.scannedQrFilter = '';
      window.renderProductHistoryView();
      return;
    }

    window.ProductHistoryState.scannedQrFilter = val;
    window.renderProductHistoryView();

    const matches = window.ProductHistoryState.records.filter(r => (r.qrCode || '').toLowerCase().includes(val.toLowerCase()));
    if (matches.length > 0) {
      if (window.showToast) window.showToast('success', `✅ Đã tìm thấy ${matches.length} lần sửa chữa của mã QR: ${val}`);
    } else {
      if (window.showToast) window.showToast('warning', `⚠️ Chưa có dữ liệu lỗi cho mã QR: ${val}. Bấm "Thêm lỗi cho QR này" để ghi nhận mới.`);
    }
  };

  window.handleClearQrFilter = function() {
    window.ProductHistoryState.scannedQrFilter = '';
    const input = document.getElementById('qrFastScanInput');
    if (input) input.value = '';
    window.renderProductHistoryView();
  };

  window.handleToggleAnalytics = function() {
    window.ProductHistoryState.showAnalytics = !window.ProductHistoryState.showAnalytics;
    window.renderProductHistoryView();
  };

  window.handleOpenLoginFromDefect = function() {
    document.getElementById('authRequireModal').style.display = 'none';
    const overlay = document.getElementById('authLockOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
  };

  // ==========================================
  // DÒNG THỜI GIAN VÒNG ĐỜI SẢN PHẨM (TIMELINE)
  // ==========================================
  window.handleOpenQrLifecycleModal = function(encodedQr) {
    const qrCode = decodeURIComponent(encodedQr);
    const modal = document.getElementById('qrLifecycleModal');
    const qrText = document.getElementById('lifecycleQrCodeText');
    const content = document.getElementById('lifecycleContent');
    if (!modal || !content) return;

    qrText.textContent = qrCode;
    const matches = window.ProductHistoryState.records
      .filter(r => (r.qrCode || '').trim().toLowerCase() === qrCode.trim().toLowerCase())
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    if (matches.length === 0) {
      content.innerHTML = `<div style="text-align: center; padding: 2rem; color: #94a3b8;">Chưa có lịch sử sửa chữa cho mã QR này.</div>`;
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 1rem; background: rgba(15, 23, 42, 0.7); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; color: #f8fafc;">${matches[0].model || 'Model'}</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">Tổng số lần phát sinh lỗi / sửa chữa: <strong style="color: #38bdf8;">${matches.length} lần</strong></div>
          </div>
          <div>
            <span class="badge" style="font-size: 0.8rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">
              Hiện trạng: ${matches[0].status || 'OK'}
            </span>
          </div>
        </div>

        <div class="timeline-container" style="position: relative; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: rgba(56, 189, 248, 0.3);"></div>
          
          ${matches.map((m, idx) => `
            <div style="position: relative;">
              <div style="position: absolute; left: -1.5rem; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #38bdf8; border: 3px solid #0f172a; box-shadow: 0 0 8px #38bdf8;"></div>
              
              <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.4rem;">
                  <span style="font-weight: 800; color: #38bdf8; font-size: 0.85rem;">
                    Lần ${matches.length - idx}: ${m.stage || 'STAGE'} • ${m.line || 'Line'} (${m.workcell || 'WCA'})
                  </span>
                  <span style="font-size: 0.725rem; color: #94a3b8;">${m.timestamp || m.date} • ${m.shiftName || m.shift}</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.4rem; font-size: 0.775rem; margin-bottom: 0.45rem;">
                  <div><strong style="color: #f87171;">Lỗi:</strong> <span style="color: #cbd5e1;">${m.defectDesc || '--'}</span></div>
                  <div><strong style="color: #fbbf24;">Nguyên nhân:</strong> <span style="color: #cbd5e1;">${m.rootCause || '--'}</span></div>
                  <div style="grid-column: 1 / -1;"><strong style="color: #38bdf8;">Cách xử lý:</strong> <span style="color: #f8fafc;">${m.action || '--'}</span></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.725rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem; color: #94a3b8;">
                  <span>KTV: <strong style="color: #f8fafc;">${m.repairer || 'N/A'}</strong></span>
                  <span>Kết quả: <strong style="color: #34d399;">${m.result || 'OK'}</strong> • Hướng đi: <strong style="color: #38bdf8;">${m.status || 'Input Line'}</strong></span>
                </div>

                ${m.note ? `<div style="margin-top: 0.4rem; font-size: 0.725rem; color: #94a3b8; font-style: italic; background: rgba(0,0,0,0.3); padding: 0.3rem 0.5rem; border-radius: 4px;">Ghi chú: ${m.note}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    modal.style.display = 'flex';
  };

  window.handleCloseQrLifecycleModal = function() {
    const modal = document.getElementById('qrLifecycleModal');
    if (modal) modal.style.display = 'none';
  };

  // ==========================================
  // XUẤT RA SHEET "Repair history" GOOGLE SHEETS
  // ==========================================
  window.handleExportRepairCsv = function() {
    // Gọi tải trực tiếp từ endpoint backend chuẩn BOM UTF-8
    const link = document.createElement('a');
    link.href = '/api/export-repair-history-sheet';
    link.download = 'Repair_history_export_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) {
      window.showToast('success', '📥 Đã xuất file CSV chuẩn định dạng sheet "Repair history" trong Google Sheets!');
    }
  };

  window.handleCopyRepairClipboard = function() {
    const rows = getFilteredRecords();
    const headers = [
      'STT', 'Model', 'QR Code', 'Nội Dung Lỗi', 'Nguyên Nhân',
      'Cách Xử Lý', 'Kết Quả', 'Hiện trạng', 'Công Đoạn',
      'Workcell', 'Line', 'Ngày', 'Ca', 'Người Sửa Chữa', 'Ghi Chú', 'Thời Gian Ghi Nhận'
    ];

    const tsvRows = [headers.join('\t')];
    rows.forEach((r, idx) => {
      tsvRows.push([
        idx + 1,
        r.model || '',
        r.qrCode || '',
        r.defectDesc || '',
        r.rootCause || '',
        r.action || '',
        r.result || '',
        r.status || '',
        r.stage || '',
        r.workcell || 'WCA',
        r.line || '',
        r.date || '',
        r.shiftName || (r.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'),
        r.repairer || '',
        r.note || '',
        r.timestamp || ''
      ].join('\t'));
    });

    navigator.clipboard.writeText(tsvRows.join('\r\n')).then(() => {
      if (window.showToast) {
        window.showToast('success', `📋 Đã sao chép ${rows.length} bản ghi! Mở file Google Sheets, vào sheet 'Repair history' và bấm Ctrl+V tại ô A1 để dán.`);
      }
    }).catch(() => {
      alert('Không thể sao chép vào bộ nhớ tạm. Hãy thử sử dụng nút Xuất Sheet CSV.');
    });
  };

  window.handleReloadProductHistory = async function() {
    await loadProductRepairHistory();
    window.renderProductHistoryView();
    if (window.showToast) window.showToast('success', '🔄 Đã làm mới dữ liệu lịch sử sản phẩm');
  };

  // Khởi động module khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    loadProductRepairHistory();
  });

})();
