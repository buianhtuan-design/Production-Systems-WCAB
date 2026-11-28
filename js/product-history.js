/**
 * Ajax ProPlan MES - PRODUCT REPAIR & LIFECYCLE HISTORY MODULE (QR CODE)
 * ======================================================================
 * Phân hệ Quản Lý Lịch Sử Sản Phẩm & Sửa Chữa qua mã QR Code
 * - Dữ liệu lấy từ data input từ các user (product_repair_history.json & API).
 * - Tách thành 2 chức năng riêng biệt:
 *   1. Chức năng cho người nhập data (Tối ưu điện thoại di động):
 *      - CHỈ hiển thị phần Quét QR Camera + Form nhập lỗi siêu tốc 1 chạm (Quick Touch Chips).
 *      - Không hiển thị bảng chi tiết hay biểu đồ rườm rà.
 *      - Chế độ "Lưu & Quét Tiếp" liên tục trên dây chuyền sản xuất.
 *   2. Chức năng cho Admin và Viewer:
 *      - CHỈ show data được tổng hợp: KPIs, Biểu đồ Pareto Top 5 lỗi, Phân bổ Công đoạn / Workcell (WCA vs WCB),
 *        Bộ lọc đa chiều và Bảng lịch sử sửa chữa chi tiết.
 *      - Tích hợp xuất CSV và Copy TSV chuẩn format sheet "Repair history" trong Google Sheets.
 */

(function() {
  'use strict';

  // Seed data mặc định
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

  // Lấy ngày hiện tại định dạng yyyy-mm-dd
  function getTodayDateString() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Khởi tạo chế độ ban đầu (SubView): 'input' hoặc 'summary'
  function getInitialSubView() {
    try {
      const hash = window.location.hash || '';
      if (hash.includes('product-qr-history/input')) return 'input';
      if (hash.includes('product-qr-history/summary')) return 'summary';
      const saved = localStorage.getItem('AJAX_PRH_ACTIVE_SUBVIEW');
      if (saved === 'input' || saved === 'summary') return saved;
      // Nếu là màn hình điện thoại (<= 768px), ưu tiên chế độ nhập data
      if (window.innerWidth <= 768) return 'input';
    } catch (e) {}
    return 'summary';
  }

  // State Quản Lý Lịch Sử Sản Phẩm
  window.ProductHistoryState = {
    records: initialRecords,
    activeSubView: getInitialSubView(), // 'input' hoặc 'summary'
    
    // Draft form nhập data trên Mobile
    mobileDraft: {
      recordId: '',
      qrCode: '',
      model: '',
      stage: 'HARD TEST',
      workcell: 'WCA',
      line: 'Line 1A',
      date: getTodayDateString(),
      shift: 'DAY',
      repairer: '',
      defectDesc: '',
      rootCause: '',
      action: '',
      result: 'OK',
      status: 'Input Line',
      note: ''
    },

    // Bộ lọc cho chế độ Tổng hợp (Admin & Viewer)
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

    // Camera scanner
    isCameraScanning: false,
    mediaStream: null,
    editingRecordId: null
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

  // Gợi ý nhanh các lỗi phổ biến (Quick Touch Chips 1 chạm cho điện thoại)
  const COMMON_DEFECTS = [
    'Không lên đèn / nguồn',
    'Mất sóng RF 868MHz',
    'Kẹt nút nhấn Tamper',
    'Kẹt motor van WaterStop',
    'Chập nguồn VCC 3.0V',
    'Hàn kênh chân IC',
    'Liệt phím bấm số',
    'Lỗi cảm biến rung / gia tốc',
    'Lỗi cảm biến PIR hồng ngoại',
    'Kẹt lẫy ngàm vỏ sau'
  ];

  const COMMON_CAUSES = [
    'PCB NG',
    'Hở chân tiếp xúc IC / Anten',
    'Lệch khớp bánh răng giảm tốc',
    'Thiếc lem chân tụ / chập mạch',
    'Bavia mép ép nhựa vỏ lưng',
    'Linh kiện kho cấp bị lỗi',
    'Màng than silicon rách tiếp điểm',
    'Lắp lệch vị trí switch tamper'
  ];

  const COMMON_ACTIONS = [
    'Chạy lại Hardtest',
    'Hàn lại chân & gia cố keo UV',
    'Căn chỉnh cơ cấu bánh răng',
    'Hút thiếc lem & vệ sinh board',
    'Gọt bavia & lắp ráp hoàn chỉnh',
    'Thay linh kiện mới từ kho',
    'Thay màng phím silicon mới',
    'Calibrate lại cảm biến'
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
    const overlay = document.getElementById('authLockOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }
    if (window.showToast) {
      window.showToast('warning', '🔒 Bạn cần đăng nhập tài khoản KTV hoặc Admin để lưu dữ liệu sửa chữa!');
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

    try {
      localStorage.setItem('AJAX_PRODUCT_REPAIR_HISTORY', JSON.stringify(state.records));
    } catch (e) {}

    try {
      await fetch('/api/product-repair-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', record })
      });
    } catch (e) {}

    if (document.getElementById('tab-product-qr-history')?.classList.contains('active')) {
      window.renderProductHistoryView();
    }
    return record;
  }

  async function deleteProductRepairRecord(recordId) {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử sửa chữa này không?')) return;

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

    if (window.showToast) window.showToast('success', '🗑️ Đã xóa bản ghi sửa chữa');
    window.renderProductHistoryView();
  }

  // ==========================================
  // TÍNH TOÁN FILTER & KPIs TỔNG HỢP (CHO ADMIN & VIEWER)
  // ==========================================
  function getFilteredRecords() {
    const s = window.ProductHistoryState;
    return s.records.filter(r => {
      if (s.selectedStage !== 'ALL' && (r.stage || '') !== s.selectedStage) return false;
      if (s.selectedWorkcell !== 'ALL' && (r.workcell || '').toUpperCase() !== s.selectedWorkcell.toUpperCase()) return false;
      if (s.selectedDate && (r.date || '') !== s.selectedDate) return false;
      if (s.selectedShift !== 'ALL' && (r.shift || '') !== s.selectedShift) return false;
      if (s.selectedLine !== 'ALL' && (r.line || '') !== s.selectedLine) return false;
      if (s.selectedModel !== 'ALL' && !(r.model || '').toLowerCase().includes(s.selectedModel.toLowerCase())) return false;
      if (s.selectedRepairer !== 'ALL' && (r.repairer || '') !== s.selectedRepairer) return false;
      if (s.selectedResult !== 'ALL' && (r.result || '') !== s.selectedResult) return false;
      if (s.selectedStatus !== 'ALL' && (r.status || '') !== s.selectedStatus) return false;

      if (s.scannedQrFilter) {
        const qrMatch = (r.qrCode || '').toLowerCase().includes(s.scannedQrFilter.toLowerCase());
        if (!qrMatch) return false;
      }

      if (s.searchKeyword) {
        const kw = s.searchKeyword.toLowerCase();
        const match = (r.model || '').toLowerCase().includes(kw)
          || (r.qrCode || '').toLowerCase().includes(kw)
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

  function computeAnalyticsData(records) {
    const stageMap = {};
    records.forEach(r => {
      const st = r.stage || 'Chưa gán';
      stageMap[st] = (stageMap[st] || 0) + 1;
    });

    const defectMap = {};
    records.forEach(r => {
      const d = (r.defectDesc || 'Khác').trim();
      defectMap[d] = (defectMap[d] || 0) + 1;
    });
    const topDefects = Object.entries(defectMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const wcaCount = records.filter(r => (r.workcell || '').toUpperCase() === 'WCA').length;
    const wcbCount = records.filter(r => (r.workcell || '').toUpperCase() === 'WCB').length;

    const repairerMap = {};
    records.forEach(r => {
      const rep = r.repairer || 'Chưa ghi';
      repairerMap[rep] = (repairerMap[rep] || 0) + 1;
    });

    return { stageMap, topDefects, wcaCount, wcbCount, repairerMap };
  }

  // Chuyển đổi giữa 2 chức năng (Chế độ Người nhập data vs Admin & Viewer)
  window.switchProductHistorySubView = function(viewName) {
    if (viewName !== 'input' && viewName !== 'summary') viewName = 'summary';
    window.ProductHistoryState.activeSubView = viewName;
    try {
      localStorage.setItem('AJAX_PRH_ACTIVE_SUBVIEW', viewName);
      if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
        history.replaceState(null, '', '#product-qr-history/' + viewName);
      }
    } catch (e) {}

    // Nếu chuyển sang chế độ khác, dừng camera đang chạy nếu có
    if (window.ProductHistoryState.isCameraScanning) {
      window.handleStopCameraScanner();
    }

    window.renderProductHistoryView();
  };

  // ==========================================
  // RENDER MAIN CONTAINER
  // ==========================================
  window.renderProductHistoryView = function(containerId = 'productHistoryContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = window.ProductHistoryState;
    const activeSubView = s.activeSubView || 'summary';
    const isAuthorized = canUserInputData();
    const currentUserRole = getCurrentUserRole();
    const currentUserName = getCurrentUserName();
    const activeVer = (window.AppStore && window.AppStore.appVersion) || 'V01';

    // Đảm bảo tên người sửa chữa mặc định được cập nhật
    if (!s.mobileDraft.repairer) {
      s.mobileDraft.repairer = currentUserName;
    }

    container.innerHTML = `
      <style>
        @keyframes scanLaserAnim {
          0% { transform: translateY(-110px); opacity: 0.3; }
          50% { transform: translateY(0px); opacity: 1; }
          100% { transform: translateY(110px); opacity: 0.3; }
        }
        .prh-quick-chip {
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 0.35rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          user-select: none;
        }
        .prh-quick-chip:hover {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          color: #fff;
          transform: translateY(-1px);
        }
        .prh-quick-chip.active {
          background: #0284c7;
          border-color: #38bdf8;
          color: #fff;
          font-weight: 800;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
        }
        .prh-quick-chip-danger.active {
          background: #dc2626 !important;
          border-color: #f87171 !important;
          color: #fff !important;
        }
        .prh-quick-chip-warning.active {
          background: #d97706 !important;
          border-color: #fbbf24 !important;
          color: #fff !important;
        }
        .prh-quick-chip-success.active {
          background: #059669 !important;
          border-color: #34d399 !important;
          color: #fff !important;
        }
      </style>

      <div class="product-history-module" style="padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.85rem; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

        <!-- BỘ CHUYỂN ĐỔI 2 CHỨC NĂNG RIÊNG BIỆT (SUB-TABS SWITCHER) -->
        <div style="display: flex; gap: 0.5rem; background: #0f172a; padding: 0.4rem; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.12); box-shadow: 0 6px 16px rgba(0,0,0,0.4); flex-wrap: wrap;">
          
          <!-- 1. CHỨC NĂNG DÀNH CHO NGƯỜI NHẬP DATA (TỐI ƯU MOBILE) -->
          <button
            type="button"
            onclick="window.switchProductHistorySubView('input')"
            style="flex: 1; min-width: 260px; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.65rem; transition: all 0.2s; border: ${activeSubView === 'input' ? '1.5px solid #38bdf8' : '1px solid transparent'}; background: ${activeSubView === 'input' ? 'linear-gradient(135deg, #0369a1, #0284c7)' : 'transparent'}; color: ${activeSubView === 'input' ? '#fff' : '#94a3b8'}; box-shadow: ${activeSubView === 'input' ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none'};"
          >
            <span style="font-size: 1.45rem; line-height: 1;">📱</span>
            <div style="text-align: left;">
              <div style="font-size: 0.95rem; font-weight: 900; letter-spacing: 0.3px;">1. NGƯỜI NHẬP DATA (ĐIỆN THOẠI)</div>
              <div style="font-size: 0.72rem; font-weight: 500; opacity: 0.9; margin-top: 0.1rem;">Chỉ để phần Quét QR &amp; Nhập lỗi nhanh • Không hiện bảng rườm rà</div>
            </div>
            ${activeSubView === 'input' ? '<span style="margin-left: auto; background: #fff; color: #0284c7; font-size: 0.7rem; font-weight: 900; padding: 0.15rem 0.5rem; border-radius: 20px;">ĐANG CHỌN</span>' : ''}
          </button>

          <!-- 2. CHỨC NĂNG DÀNH CHO ADMIN & VIEWER (TỔNG HỢP & BÁO CÁO) -->
          <button
            type="button"
            onclick="window.switchProductHistorySubView('summary')"
            style="flex: 1; min-width: 260px; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.65rem; transition: all 0.2s; border: ${activeSubView === 'summary' ? '1.5px solid #a78bfa' : '1px solid transparent'}; background: ${activeSubView === 'summary' ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'transparent'}; color: ${activeSubView === 'summary' ? '#fff' : '#94a3b8'}; box-shadow: ${activeSubView === 'summary' ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none'};"
          >
            <span style="font-size: 1.45rem; line-height: 1;">📊</span>
            <div style="text-align: left;">
              <div style="font-size: 0.95rem; font-weight: 900; letter-spacing: 0.3px;">2. ADMIN &amp; VIEWER (TỔNG HỢP DATA)</div>
              <div style="font-size: 0.72rem; font-weight: 500; opacity: 0.9; margin-top: 0.1rem;">Chỉ show data tổng hợp: KPIs, Biểu đồ Pareto, Bảng chi tiết &amp; Export Sheet</div>
            </div>
            ${activeSubView === 'summary' ? '<span style="margin-left: auto; background: #fff; color: #7c3aed; font-size: 0.7rem; font-weight: 900; padding: 0.15rem 0.5rem; border-radius: 20px;">ĐANG CHỌN</span>' : ''}
          </button>
        </div>

        <!-- HIỂN THỊ NỘI DUNG TƯƠNG ỨNG VỚI 1 TRONG 2 CHỨC NĂNG -->
        ${activeSubView === 'input' ? renderDataInputView(s, isAuthorized, currentUserName, currentUserRole) : renderAggregatedSummaryView(s, activeVer, isAuthorized, currentUserName, currentUserRole)}

      </div>

      <!-- MODAL XEM DÒNG THỜI GIAN VÒNG ĐỜI (TIMELINE LIFECYCLE) -->
      <div id="qrLifecycleModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center; padding: 0.75rem;">
        <div class="modal-card" style="background: #1e293b; border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 12px; width: 100%; max-width: 600px; max-height: 85vh; overflow-y: auto; box-shadow: 0 15px 35px rgba(0,0,0,0.6); padding: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="font-weight: 800; font-size: 1rem; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;">
              <span>🕒 DÒNG THỜI GIAN SỬA CHỮA:</span>
              <span id="lifecycleQrCodeText" class="font-mono" style="color: #f8fafc; background: #0f172a; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.3);"></span>
            </div>
            <button type="button" onclick="window.handleCloseQrLifecycleModal()" style="background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; padding: 0.2rem 0.5rem;">✕</button>
          </div>
          <div id="lifecycleContent"></div>
          <div style="margin-top: 1rem; text-align: right;">
            <button type="button" class="btn btn-secondary" onclick="window.handleCloseQrLifecycleModal()" style="padding: 0.45rem 1rem; border-radius: 6px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;">Đóng</button>
          </div>
        </div>
      </div>

      <!-- MODAL CẢNH BÁO YÊU CẦU ĐĂNG NHẬP CHO VIEWER -->
      <div id="authRequireModal" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10001; align-items: center; justify-content: center; padding: 1rem;">
        <div style="background: #1e293b; border: 2px solid #fbbf24; border-radius: 12px; width: 100%; max-width: 440px; padding: 1.5rem; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
          <div style="font-weight: 800; font-size: 1.15rem; color: #f8fafc; margin-bottom: 0.5rem;">Yêu Cầu Tài Khoản Kỹ Thuật Viên</div>
          <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 1.25rem;">
            Chức năng nhập dữ liệu sửa chữa chỉ dành cho <strong>Kỹ Thuật Viên (Editor)</strong> hoặc <strong>Admin</strong> được phân quyền. Bạn đang ở tài khoản Khách (Viewer).
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('authRequireModal').style.display='none'" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">Đóng</button>
            <button type="button" class="btn btn-primary" onclick="window.handleOpenLoginFromDefect()" style="padding: 0.5rem 1.25rem; background: #f59e0b; color: #000; font-weight: 800; border: none; border-radius: 6px; cursor: pointer;">🔑 Đăng Nhập KTV</button>
          </div>
        </div>
      </div>
    `;

    // Khởi tạo các event sau khi HTML mount
    setupMobileInputEvents();
  };

  // =========================================================================
  // CHỨC NĂNG 1: DÀNH CHO NGƯỜI NHẬP DATA (CHỈ HIỂN THỊ PHẦN NHẬP DATA MOBILE)
  // =========================================================================
  function renderDataInputView(s, isAuthorized, currentUserName, currentUserRole) {
    const draft = s.mobileDraft;
    const modelOptions = getAvailableModelOptions();

    // Kiểm tra lịch sử QR đã từng sửa chưa
    let qrHistoryBadge = '';
    if (draft.qrCode && draft.qrCode.trim()) {
      const existingMatches = s.records.filter(r => (r.qrCode || '').trim().toLowerCase() === draft.qrCode.trim().toLowerCase());
      if (existingMatches.length > 0) {
        const last = existingMatches[0];
        qrHistoryBadge = `
          <div style="background: rgba(56, 189, 248, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 8px; padding: 0.65rem 0.85rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;">
            <div>
              <div style="font-weight: 800; color: #38bdf8; font-size: 0.825rem;">🔍 MÃ QR ĐÃ TỪNG SỬA CHỮA: ${existingMatches.length} LẦN</div>
              <div style="font-size: 0.75rem; color: #cbd5e1; margin-top: 0.15rem;">
                Model: <strong>${last.model || '--'}</strong> • Gần nhất: <span style="color: #34d399; font-weight: 700;">${last.status || 'Input Line'}</span> (${last.timestamp || last.date})
              </div>
            </div>
            <button type="button" onclick="window.handleOpenQrLifecycleModal('${encodeURIComponent(draft.qrCode)}')" style="background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.6); font-weight: 700; font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 6px; cursor: pointer;">
              👁️ Xem Lịch Sử Cũ
            </button>
          </div>
        `;
      }
    }

    // Danh sách 3 máy vừa nhập hôm nay của KTV (để đối chiếu nhanh)
    const todayStr = getTodayDateString();
    const myRecentToday = s.records.filter(r => (r.date === todayStr || (r.timestamp && r.timestamp.startsWith(todayStr)))).slice(0, 4);

    return `
      <div style="display: flex; flex-direction: column; gap: 0.85rem; max-width: 760px; margin: 0 auto; width: 100%;">
        
        <!-- HEADER NHẬP DATA TỐI GIẢN -->
        <div style="background: var(--bg-surface, #1e293b); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 900; font-size: 1rem; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;">
              <span>📱 NHẬP DỮ LIỆU SỬA CHỮA (MOBILE)</span>
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.15rem;">
              Quét mã QR sản phẩm -> Bấm chọn nhanh 1 chạm -> Lưu và quét tiếp máy khác
            </div>
          </div>
          <div>
            ${isAuthorized ? `
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700;">
                👤 ${currentUserName}
              </span>
            ` : `
              <button type="button" onclick="window.handleOpenLoginFromDefect()" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 0.75rem; padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 800; cursor: pointer;">
                🔑 Đăng nhập KTV
              </button>
            `}
          </div>
        </div>

        <!-- KHU VỰC QUÉT QR CODE (CAMERA SCANNER HOẶC CHỌN ẢNH) -->
        <div style="background: #0f172a; border: 2px solid ${s.isCameraScanning ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}; border-radius: 12px; padding: 0.9rem; box-shadow: 0 6px 20px rgba(0,0,0,0.5);">
          
          ${s.isCameraScanning ? `
            <!-- KHUNG CAMERA HOẠT ĐỘNG TRỰC TIẾP TRÊN MOBILE -->
            <div style="text-align: center;">
              <div style="font-size: 0.85rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                <span class="pulse-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>
                <span>ĐANG BẬT CAMERA QUÉT MÃ QR...</span>
              </div>

              <div style="position: relative; width: 100%; max-width: 420px; height: 260px; margin: 0 auto; background: #000; border-radius: 10px; overflow: hidden; border: 2px solid #38bdf8;">
                <video id="mobileCameraVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
                
                <!-- Laser scan animation -->
                <div style="position: absolute; inset: 15px; border: 2px dashed rgba(56, 189, 248, 0.85); border-radius: 10px; pointer-events: none; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                  <div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #34d399, transparent); box-shadow: 0 0 12px #34d399; animation: scanLaserAnim 1.8s infinite ease-in-out;"></div>
                  <div style="margin-top: auto; margin-bottom: 8px; font-size: 0.72rem; font-weight: 700; color: #34d399; background: rgba(0,0,0,0.65); padding: 0.15rem 0.5rem; border-radius: 4px;">
                    Hướng camera về mã QR trên sản phẩm
                  </div>
                </div>
              </div>

              <div style="margin-top: 0.75rem; display: flex; justify-content: center; gap: 0.5rem;">
                <button type="button" class="btn" onclick="window.handleStopCameraScanner()" style="padding: 0.45rem 1.15rem; background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; font-weight: 700; cursor: pointer;">
                  ✕ Đóng Camera
                </button>
              </div>
            </div>
          ` : `
            <!-- KHUNG KÍCH HOẠT CAMERA & Ô NHẬP QR CODE -->
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn"
                  onclick="window.handleStartCameraForMobileInput()"
                  style="flex: 2; min-width: 180px; padding: 0.65rem 1rem; border-radius: 8px; background: #0284c7; color: #fff; font-weight: 900; font-size: 0.9rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);"
                >
                  <span style="font-size: 1.15rem;">📷</span>
                  <span>BẬT CAMERA QUÉT QR</span>
                </button>

                <label
                  class="btn"
                  style="flex: 1; min-width: 140px; padding: 0.65rem 0.85rem; border-radius: 8px; background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); font-weight: 700; font-size: 0.825rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;"
                >
                  <span>📁</span>
                  <span>Chọn Ảnh QR</span>
                  <input type="file" accept="image/*" capture="environment" onchange="window.handleUploadQrImageForMobile(event)" style="display: none;">
                </label>
              </div>

              <!-- Ô NHẬP MÃ QR CODE TRỰC TIẾP -->
              <div>
                <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; margin-bottom: 0.25rem;">
                  MÃ QR CODE SẢN PHẨM (BẮT BUỘC):
                </div>
                <div style="display: flex; gap: 0.4rem;">
                  <input
                    type="text"
                    id="mobileInputQrCode"
                    class="font-mono"
                    placeholder="Quét hoặc gõ mã QR (VD: device 31c0794b142)..."
                    value="${draft.qrCode}"
                    oninput="window.handleMobileDraftChange('qrCode', this.value)"
                    onkeydown="if(event.key === 'Enter') { window.handleCheckQrInputHistory(); }"
                    style="flex: 1; padding: 0.65rem 0.85rem; font-size: 1rem; font-weight: 700; background: #0b1329; color: #38bdf8; border: 2px solid #38bdf8; border-radius: 8px; outline: none; box-sizing: border-box;"
                  />
                  ${draft.qrCode ? `
                    <button type="button" onclick="window.handleClearMobileQr()" style="padding: 0 0.75rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; font-weight: 800; cursor: pointer;">
                      ✕
                    </button>
                  ` : ''}
                </div>
              </div>

              ${qrHistoryBadge}
            </div>
          `}
        </div>

        <!-- FORM NHẬP CHI TIẾT SỬA CHỮA (TỐI ƯU GIAO DIỆN CHẠM TRÊN ĐIỆN THOẠI) -->
        <div style="background: var(--bg-surface, #1e293b); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
          
          <!-- 1. MODEL SẢN PHẨM -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #cbd5e1; margin-bottom: 0.35rem;">
              1. MODEL SẢN PHẨM:
            </label>
            <input
              type="text"
              id="mobileInputModel"
              list="mobileModelDatalist"
              placeholder="Chọn hoặc nhập tên Model (VD: Ajax Hub 2 Plus, MotionCam...)"
              value="${draft.model}"
              oninput="window.handleMobileDraftChange('model', this.value)"
              style="width: 100%; padding: 0.55rem 0.75rem; font-size: 0.9rem; font-weight: 600; background: #0f172a; color: #f8fafc; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 6px; box-sizing: border-box;"
            />
            <datalist id="mobileModelDatalist">
              ${modelOptions.map(m => `<option value="${m}">`).join('')}
            </datalist>
          </div>

          <!-- 2. CÔNG ĐOẠN PHÁT SINH LỖI (CHIPS 1 CHẠM) -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.35rem;">
              2. CÔNG ĐOẠN PHÁT SINH LỖI:
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${STAGE_OPTIONS.map(opt => `
                <button
                  type="button"
                  class="prh-quick-chip ${draft.stage === opt.value ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('stage', '${opt.value}')"
                >
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 3. WORKCELL (XƯỞNG WCA & WCB) & LINE -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <!-- Workcell -->
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.35rem;">
                3. WORKCELL:
              </label>
              <div style="display: flex; gap: 0.4rem;">
                <button
                  type="button"
                  class="prh-quick-chip ${draft.workcell === 'WCA' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('workcell', 'WCA')"
                  style="flex: 1; justify-content: center; padding: 0.5rem 0.25rem; font-weight: 800;"
                >
                  🏢 WCA
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.workcell === 'WCB' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('workcell', 'WCB')"
                  style="flex: 1; justify-content: center; padding: 0.5rem 0.25rem; font-weight: 800;"
                >
                  🏭 WCB
                </button>
              </div>
            </div>

            <!-- Ca làm việc -->
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #cbd5e1; margin-bottom: 0.35rem;">
                CA LÀM VIỆC:
              </label>
              <div style="display: flex; gap: 0.4rem;">
                <button
                  type="button"
                  class="prh-quick-chip ${draft.shift === 'DAY' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('shift', 'DAY')"
                  style="flex: 1; justify-content: center; padding: 0.5rem 0.25rem; font-weight: 800;"
                >
                  ☀️ Ca Ngày
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.shift === 'NIGHT' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('shift', 'NIGHT')"
                  style="flex: 1; justify-content: center; padding: 0.5rem 0.25rem; font-weight: 800;"
                >
                  🌙 Ca Đêm
                </button>
              </div>
            </div>
          </div>

          <!-- 4. CHỌN LINE SẢN XUẤT -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #cbd5e1; margin-bottom: 0.35rem;">
              4. LINE SẢN XUẤT:
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${LINE_OPTIONS.map(l => `
                <button
                  type="button"
                  class="prh-quick-chip ${draft.line === l ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('line', '${l}')"
                  style="font-size: 0.75rem; padding: 0.3rem 0.55rem;"
                >
                  ${l}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 5. NỘI DUNG LỖI PHÁT SINH (QUICK CHIPS 1 CHẠM) -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #f87171; margin-bottom: 0.35rem;">
              5. NỘI DUNG LỖI (CHỌN NHANH HOẶC NHẬP):
            </label>
            <input
              type="text"
              id="mobileInputDefectDesc"
              placeholder="Nhập nội dung lỗi hoặc bấm nút chọn nhanh bên dưới..."
              value="${draft.defectDesc}"
              oninput="window.handleMobileDraftChange('defectDesc', this.value)"
              style="width: 100%; padding: 0.6rem 0.75rem; font-size: 0.9rem; font-weight: 700; background: #0f172a; color: #f87171; border: 1.5px solid rgba(248, 113, 113, 0.4); border-radius: 6px; box-sizing: border-box; margin-bottom: 0.4rem;"
            />
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${COMMON_DEFECTS.map(d => `
                <button
                  type="button"
                  class="prh-quick-chip ${draft.defectDesc === d ? 'active prh-quick-chip-danger' : ''}"
                  onclick="window.handleMobileQuickSelect('defectDesc', '${d.replace(/'/g, "\\'")}')"
                  style="font-size: 0.74rem;"
                >
                  ⚠️ ${d}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 6. NGUYÊN NHÂN LỖI (QUICK CHIPS 1 CHẠM) -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.35rem;">
              6. NGUYÊN NHÂN GÂY LỖI:
            </label>
            <input
              type="text"
              id="mobileInputRootCause"
              placeholder="Nhập nguyên nhân hoặc bấm chọn nhanh bên dưới..."
              value="${draft.rootCause}"
              oninput="window.handleMobileDraftChange('rootCause', this.value)"
              style="width: 100%; padding: 0.55rem 0.75rem; font-size: 0.85rem; font-weight: 600; background: #0f172a; color: #fbbf24; border: 1.5px solid rgba(251, 191, 36, 0.4); border-radius: 6px; box-sizing: border-box; margin-bottom: 0.4rem;"
            />
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${COMMON_CAUSES.map(c => `
                <button
                  type="button"
                  class="prh-quick-chip ${draft.rootCause === c ? 'active prh-quick-chip-warning' : ''}"
                  onclick="window.handleMobileQuickSelect('rootCause', '${c.replace(/'/g, "\\'")}')"
                  style="font-size: 0.74rem;"
                >
                  🔍 ${c}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 7. CÁCH XỬ LÝ / KHẮC PHỤC (QUICK CHIPS 1 CHẠM) -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.35rem;">
              7. CÁCH XỬ LÝ (GIẢI PHÁP SỬA CHỮA):
            </label>
            <input
              type="text"
              id="mobileInputAction"
              placeholder="Nhập giải pháp hoặc bấm chọn nhanh bên dưới..."
              value="${draft.action}"
              oninput="window.handleMobileDraftChange('action', this.value)"
              style="width: 100%; padding: 0.55rem 0.75rem; font-size: 0.85rem; font-weight: 600; background: #0f172a; color: #38bdf8; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 6px; box-sizing: border-box; margin-bottom: 0.4rem;"
            />
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${COMMON_ACTIONS.map(a => `
                <button
                  type="button"
                  class="prh-quick-chip ${draft.action === a ? 'active' : ''}"
                  onclick="window.handleMobileQuickSelect('action', '${a.replace(/'/g, "\\'")}')"
                  style="font-size: 0.74rem;"
                >
                  🔧 ${a}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 8. KẾT QUẢ & HIỆN TRẠNG TIẾP THEO -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <!-- Kết quả -->
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #34d399; margin-bottom: 0.35rem;">
                8. KẾT QUẢ:
              </label>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <button
                  type="button"
                  class="prh-quick-chip ${draft.result === 'OK' ? 'active prh-quick-chip-success' : ''}"
                  onclick="window.handleMobileDraftChange('result', 'OK'); window.handleMobileDraftChange('status', 'Input Line');"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  ✅ OK (Đạt)
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.result === 'Chờ linh kiện' ? 'active prh-quick-chip-warning' : ''}"
                  onclick="window.handleMobileDraftChange('result', 'Chờ linh kiện'); window.handleMobileDraftChange('status', 'Đang sửa');"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  ⏳ Chờ linh kiện
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.result === 'NG' ? 'active prh-quick-chip-danger' : ''}"
                  onclick="window.handleMobileDraftChange('result', 'NG');"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  ❌ NG (Không đạt)
                </button>
              </div>
            </div>

            <!-- Hiện trạng tiếp theo -->
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 0.35rem;">
                HIỆN TRẠNG:
              </label>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <button
                  type="button"
                  class="prh-quick-chip ${draft.status === 'Input Line' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('status', 'Input Line')"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  ➡️ Input Line
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.status === 'Đang sửa' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('status', 'Đang sửa')"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  🔧 Đang sửa
                </button>
                <button
                  type="button"
                  class="prh-quick-chip ${draft.status === 'Chờ test lại' ? 'active' : ''}"
                  onclick="window.handleMobileDraftChange('status', 'Chờ test lại')"
                  style="justify-content: center; padding: 0.45rem;"
                >
                  🧪 Chờ test lại
                </button>
              </div>
            </div>
          </div>

          <!-- 9. NGƯỜI SỬA CHỮA & GHI CHÚ -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.25rem;">Người sửa chữa (KTV):</label>
              <input
                type="text"
                value="${draft.repairer || currentUserName}"
                oninput="window.handleMobileDraftChange('repairer', this.value)"
                style="width: 100%; padding: 0.45rem 0.65rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; box-sizing: border-box;"
              />
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.25rem;">Ngày sửa chữa:</label>
              <input
                type="date"
                value="${draft.date}"
                oninput="window.handleMobileDraftChange('date', this.value)"
                style="width: 100%; padding: 0.45rem 0.65rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; box-sizing: border-box;"
              />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.25rem;">Ghi chú thêm (Tùy chọn):</label>
            <input
              type="text"
              placeholder="Ghi chú thêm linh kiện thay thế, thông số đo..."
              value="${draft.note}"
              oninput="window.handleMobileDraftChange('note', this.value)"
              style="width: 100%; padding: 0.45rem 0.65rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; box-sizing: border-box;"
            />
          </div>

          <!-- CÁC NÚT BẤM HÀNH ĐỘNG TO BẢN (ACTION BUTTONS CHO MOBILE) -->
          <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
            
            <button
              type="button"
              onclick="window.handleSaveMobileDraft(false)"
              style="width: 100%; padding: 0.85rem 1rem; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-size: 1rem; font-weight: 900; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);"
            >
              <span>💾</span>
              <span>LƯU DỮ LIỆU SỬA CHỮA</span>
            </button>

            <button
              type="button"
              onclick="window.handleSaveMobileDraft(true)"
              style="width: 100%; padding: 0.85rem 1rem; border-radius: 8px; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 1rem; font-weight: 900; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);"
            >
              <span>📷</span>
              <span>LƯU &amp; QUÉT TIẾP MÁY KHÁC (LIÊN TỤC)</span>
            </button>

            <button
              type="button"
              onclick="window.handleResetMobileDraft()"
              style="padding: 0.5rem; background: transparent; color: #94a3b8; border: 1px dashed rgba(255,255,255,0.2); border-radius: 6px; font-size: 0.8rem; cursor: pointer;"
            >
              🔄 Xóa trắng form / Nhập lại từ đầu
            </button>
          </div>

        </div>

        <!-- MỤC GẬP MỞ NHANH: CÁC SẢN PHẨM VỪA NHẬP HÔM NAY (ĐỐI CHIẾU NHANH) -->
        ${myRecentToday.length > 0 ? `
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.75rem 0.85rem;">
            <div style="font-size: 0.78rem; font-weight: 800; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span>📋 BẠN VỪA NHẬP HÔM NAY (${myRecentToday.length} MÁY GẦN NHẤT)</span>
              <span style="font-size: 0.7rem; color: #64748b;">Chỉ hiện 4 máy gần đây</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${myRecentToday.map((r, idx) => `
                <div style="background: #1e293b; padding: 0.5rem 0.65rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; gap: 0.5rem;">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span style="color: #38bdf8; font-weight: 800; font-family: monospace;">${r.qrCode}</span>
                    <span style="color: #cbd5e1; margin-left: 0.35rem;">${r.model || ''}</span>
                    <span style="color: #f87171; margin-left: 0.35rem;">(${r.defectDesc || ''})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                    <span style="font-weight: 800; color: ${r.result === 'OK' ? '#34d399' : '#fbbf24'};">${r.result || 'OK'}</span>
                    <button type="button" onclick="window.handleEditInMobileDraft('${r.id}')" title="Sửa lại" style="background: none; border: none; color: #38bdf8; cursor: pointer; font-size: 0.85rem;">✏️</button>
                    <button type="button" onclick="window.handleDeleteRepairRecord('${r.id}')" title="Xóa" style="background: none; border: none; color: #f87171; cursor: pointer; font-size: 0.85rem;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // =========================================================================
  // CHỨC NĂNG 2: DÀNH CHO ADMIN & VIEWER (CHỈ SHOW DATA TỔNG HỢP & BÁO CÁO)
  // =========================================================================
  function renderAggregatedSummaryView(s, activeVer, isAuthorized, currentUserName, currentUserRole) {
    const filtered = getFilteredRecords();
    const kpi = computeSummaryKpis(filtered);
    const analytics = computeAnalyticsData(filtered);
    const repairersList = Array.from(new Set(s.records.map(r => r.repairer).filter(Boolean))).sort();

    return `
      <div style="display: flex; flex-direction: column; gap: 0.85rem;">

        <!-- HEADER VÀ CÁC NÚT XUẤT BÁO CÁO -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; background: var(--bg-surface, #1e293b); padding: 0.85rem 1.15rem; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.35);">
          <div>
            <div style="font-weight: 900; font-size: 1.05rem; color: #a78bfa; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span>📊 TỔNG HỢP &amp; PHÂN TÍCH LỊCH SỬ SỬA CHỮA (ADMIN &amp; VIEWER)</span>
              <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); font-size: 0.725rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800;">
                Phiên bản ${activeVer}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 0.2rem;">
              Dữ liệu được thu thập từ các lượt quét mã QR &amp; ghi nhận lỗi của các user -> Tự động tổng hợp và sẵn sàng export sheet Repair history.
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button
              type="button"
              class="btn btn-secondary"
              onclick="window.handleExportRepairCsv()"
              style="font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); cursor: pointer;"
              title="Xuất file CSV chuẩn format sheet Repair history"
            >
              <span>📤 Xuất Sheet 'Repair history'</span>
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              onclick="window.handleCopyRepairClipboard()"
              style="font-weight: 800; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.45); cursor: pointer;"
              title="Copy dữ liệu để mở Google Sheets và dán vào sheet Repair history"
            >
              <span>📋 Copy Cho Sheet Repair history</span>
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              onclick="window.handleReloadProductHistory()"
              title="Tải lại dữ liệu mới nhất từ máy chủ"
              style="padding: 0.5rem 0.75rem; border-radius: 6px; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.35); cursor: pointer;"
            >
              <span>🔄 Làm mới</span>
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onclick="window.switchProductHistorySubView('input')"
              style="font-weight: 800; padding: 0.5rem 0.85rem; border-radius: 6px; background: #0284c7; color: #fff; border: none; cursor: pointer;"
            >
              <span>📱 Mở Màn Hình Nhập Data</span>
            </button>
          </div>
        </div>

        <!-- THẺ KPI TỔNG QUAN -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.65rem;">
          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">TỔNG LƯỢT SỬA CHỮA</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #38bdf8; margin-top: 0.2rem;">
              ${kpi.total} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">lượt</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">MÃ QR SẢN PHẨM DUY NHẤT</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #a78bfa; margin-top: 0.2rem;">
              ${kpi.uniqueQrs} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">mã</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">SỬA THÀNH CÔNG (OK / INPUT LINE)</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #34d399; margin-top: 0.2rem;">
              ${kpi.okCount} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">máy</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">ĐANG SỬA / CHỜ LINH KIỆN</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: #fbbf24; margin-top: 0.2rem;">
              ${kpi.pendingCount} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">máy</span>
            </div>
          </div>

          <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">TỈ LỆ SỬA THÀNH CÔNG</div>
            <div style="font-size: 1.65rem; font-weight: 900; color: ${kpi.passRate >= 90 ? '#34d399' : '#fbbf24'}; margin-top: 0.2rem;">
              ${kpi.passRate}%
            </div>
          </div>
        </div>

        <!-- KHỐI TỔNG HỢP & PHÂN TÍCH DATA (ANALYTICS & PARETO) -->
        <div style="background: var(--bg-surface, #1e293b); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 1rem 1.15rem;">
          <div style="font-size: 0.825rem; font-weight: 800; color: #a78bfa; text-transform: uppercase; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
            <span>📊 PHÂN TÍCH PHÂN BỔ DỮ LIỆU SỬA CHỮA (ANALYTICS &amp; SUMMARY)</span>
            <span style="font-size: 0.725rem; color: #94a3b8; font-weight: 500;">Dành cho Admin &amp; Quản lý chất lượng</span>
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
                      <div style="display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 0.15rem;">
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
                      <div style="display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 0.15rem;">
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

            <!-- 3. Phân bổ theo Workcell & KTV -->
            <div style="background: #0f172a; padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 0.78rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.6rem;">🏢 So Sánh Workcell (V01) &amp; KTV:</div>
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

              <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 0.3rem;">KTV Sửa Chữa Đang Tham Gia:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${Object.entries(analytics.repairerMap).map(([rep, cnt]) => `
                  <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.15rem 0.45rem; border-radius: 4px;">
                    👤 ${rep}: <strong>${cnt}</strong>
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- BỘ LỌC DỮ LIỆU ĐA CHIỀU (FILTERS) -->
        <div style="background: var(--bg-surface, #1e293b); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.8rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; margin-bottom: 0.65rem; display: flex; align-items: center; justify-content: space-between;">
            <span>🔍 Bộ Lọc Dữ Liệu Tổng Hợp (Công Đoạn / Ngày / Ca / Line / Model / KTV)</span>
            <button type="button" class="btn btn-xs" onclick="window.handleResetProductHistoryFilters()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; cursor: pointer;">
              🔄 Xóa bộ lọc
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; align-items: end;">
            <!-- Công Đoạn -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Công Đoạn :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedStage', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedStage === 'ALL' ? 'selected' : ''}>-- Tất cả công đoạn --</option>
                ${STAGE_OPTIONS.map(opt => `<option value="${opt.value}" ${s.selectedStage === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
              </select>
            </div>

            <!-- Workcell -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Workcell :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedWorkcell', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedWorkcell === 'ALL' ? 'selected' : ''}>⭐ Tất cả xưởng</option>
                <option value="WCA" ${s.selectedWorkcell === 'WCA' ? 'selected' : ''}>🏢 Xưởng WCA</option>
                <option value="WCB" ${s.selectedWorkcell === 'WCB' ? 'selected' : ''}>🏭 Xưởng WCB</option>
              </select>
            </div>

            <!-- Ngày -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Ngày :</label>
              <input type="date" value="${s.selectedDate}" onchange="window.handleFilterChange('selectedDate', this.value)" style="width: 100%; padding: 0.38rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
            </div>

            <!-- Ca -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Ca :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedShift', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedShift === 'ALL' ? 'selected' : ''}>-- Cả 2 Ca --</option>
                <option value="DAY" ${s.selectedShift === 'DAY' ? 'selected' : ''}>☀️ Ca Ngày</option>
                <option value="NIGHT" ${s.selectedShift === 'NIGHT' ? 'selected' : ''}>🌙 Ca Đêm</option>
              </select>
            </div>

            <!-- Line -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Line :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedLine', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedLine === 'ALL' ? 'selected' : ''}>-- Tất cả các Line --</option>
                ${LINE_OPTIONS.map(l => `<option value="${l}" ${s.selectedLine === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>

            <!-- Model -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Model :</label>
              <input type="text" placeholder="Tìm theo Model..." value="${s.selectedModel === 'ALL' ? '' : s.selectedModel}" oninput="window.handleFilterChange('selectedModel', this.value || 'ALL')" style="width: 100%; padding: 0.38rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
            </div>

            <!-- Người Sửa Chữa -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Người Sửa Chữa :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedRepairer', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedRepairer === 'ALL' ? 'selected' : ''}>-- Tất cả KTV --</option>
                ${repairersList.map(rep => `<option value="${rep}" ${s.selectedRepairer === rep ? 'selected' : ''}>${rep}</option>`).join('')}
              </select>
            </div>

            <!-- Kết Quả -->
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.25rem;">Kết Quả :</label>
              <select class="select-filter" onchange="window.handleFilterChange('selectedResult', this.value)" style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">
                <option value="ALL" ${s.selectedResult === 'ALL' ? 'selected' : ''}>-- Tất cả kết quả --</option>
                <option value="OK" ${s.selectedResult === 'OK' ? 'selected' : ''}>✅ OK (Đạt)</option>
                <option value="Chờ linh kiện" ${s.selectedResult === 'Chờ linh kiện' ? 'selected' : ''}>⏳ Chờ linh kiện</option>
                <option value="NG" ${s.selectedResult === 'NG' ? 'selected' : ''}>❌ NG</option>
                <option value="Hủy (Scrap)" ${s.selectedResult === 'Hủy (Scrap)' ? 'selected' : ''}>🗑️ Hủy (Scrap)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- BẢNG LỊCH SỬ SỬA CHỮA CHI TIẾT (TỔNG HỢP) -->
        <div style="background: var(--bg-surface, #1e293b); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-weight: 800; font-size: 0.9rem; color: #f8fafc; display: flex; align-items: center; gap: 0.45rem;">
              <span>📋 BẢNG LỊCH SỬ SỬA CHỮA CHI TIẾT</span>
              <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">
                Hiển thị ${filtered.length} bản ghi
              </span>
            </div>
            <div>
              <input
                type="text"
                placeholder="Tìm nhanh trong bảng..."
                value="${s.searchKeyword}"
                oninput="window.handleFilterChange('searchKeyword', this.value)"
                style="padding: 0.35rem 0.75rem; font-size: 0.775rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; min-width: 240px;"
              />
            </div>
          </div>

          <div style="overflow-x: auto; max-height: 640px;">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
              <thead style="background: #0f172a; position: sticky; top: 0; z-index: 10; border-bottom: 1.5px solid rgba(255,255,255,0.15);">
                <tr>
                  <th style="padding: 0.6rem 0.45rem; text-align: center; width: 45px; color: #94a3b8;">STT</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 190px; color: #f8fafc;">Model</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 175px; color: #38bdf8;">QR Code</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 155px; color: #f87171;">Nội Dung Lỗi</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 155px; color: #fbbf24;">Nguyên Nhân</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: left; min-width: 165px; color: #38bdf8;">Cách Xử Lý</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 90px; color: #34d399;">Kết Quả</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 95px; color: #38bdf8;">Hiện trạng</th>
                  <th style="padding: 0.6rem 0.55rem; text-align: center; min-width: 95px; color: #cbd5e1;">Công Đoạn</th>
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
                      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">Thử điều chỉnh lại bộ lọc hoặc chuyển sang tab "Người Nhập Data" để ghi nhận mới</div>
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

                      <td style="padding: 0.55rem 0.55rem;">
                        <button
                          type="button"
                          class="btn btn-xs"
                          onclick="window.handleOpenQrLifecycleModal('${encodeURIComponent(r.qrCode || '')}')"
                          style="font-family: monospace; font-size: 0.775rem; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.2rem 0.45rem; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;"
                          title="Bấm để xem toàn bộ lịch sử các lần sửa của mã QR này"
                        >
                          <span>${r.qrCode || '--'}</span>
                          <span style="font-size: 0.7rem; opacity: 0.8;">🕒</span>
                        </button>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; color: #f87171; font-weight: 600;">
                        ${r.defectDesc || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; color: #fbbf24;">
                        ${r.rootCause || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; color: #38bdf8;">
                        ${r.action || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span style="display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; font-size: 0.725rem; background: ${resBg}; color: ${resColor}; border: 1px solid ${resColor}55;">
                          ${r.result || 'OK'}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span style="display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.725rem; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">
                          ${r.status || 'Input Line'}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; color: #cbd5e1; font-weight: 600;">
                        ${r.stage || 'STAGE'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center;">
                        <span style="display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.725rem; font-weight: 800; background: ${wcBg}; color: ${wcColor}; border: 1px solid ${wcColor}55;">
                          ${wc}
                        </span>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; color: #cbd5e1;">
                        ${r.line || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; font-size: 0.725rem;">
                        <div>${r.date || '--'}</div>
                        <div style="color: #fbbf24; font-weight: 600;">${r.shiftName || (r.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm')}</div>
                      </td>

                      <td style="padding: 0.55rem 0.55rem; text-align: center; font-weight: 600; color: #f8fafc;">
                        ${r.repairer || '--'}
                      </td>

                      <td style="padding: 0.55rem 0.45rem; text-align: center;">
                        <div style="display: inline-flex; gap: 0.25rem;">
                          <button
                            type="button"
                            class="btn btn-xs"
                            onclick="window.handleEditInMobileDraft('${r.id}')"
                            style="padding: 0.2rem 0.45rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 4px; cursor: pointer;"
                            title="Chỉnh sửa bản ghi này"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            class="btn btn-xs"
                            onclick="window.handleDeleteRepairRecord('${r.id}')"
                            style="padding: 0.2rem 0.45rem; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; cursor: pointer;"
                            title="Xóa bản ghi này"
                          >
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
    `;
  }

  // ==========================================
  // XỬ LÝ FORM NHẬP DATA TRÊN MOBILE (HANDLERS)
  // ==========================================
  function setupMobileInputEvents() {
    // Không cần gắn listener phức tạp, các hàm onclick in-line đã trực tiếp gọi các handler
  }

  window.handleMobileDraftChange = function(field, value) {
    window.ProductHistoryState.mobileDraft[field] = value;
    // Nếu thay đổi mã QR, kiểm tra model tương ứng từ lịch sử
    if (field === 'qrCode') {
      const qrTrim = (value || '').trim().toLowerCase();
      if (qrTrim) {
        const found = window.ProductHistoryState.records.find(r => (r.qrCode || '').trim().toLowerCase() === qrTrim);
        if (found && found.model && !window.ProductHistoryState.mobileDraft.model) {
          window.ProductHistoryState.mobileDraft.model = found.model;
          const modelInp = document.getElementById('mobileInputModel');
          if (modelInp) modelInp.value = found.model;
        }
      }
    }
  };

  window.handleMobileQuickSelect = function(field, value) {
    window.ProductHistoryState.mobileDraft[field] = value;
    if (field === 'defectDesc') {
      const el = document.getElementById('mobileInputDefectDesc');
      if (el) el.value = value;
    } else if (field === 'rootCause') {
      const el = document.getElementById('mobileInputRootCause');
      if (el) el.value = value;
    } else if (field === 'action') {
      const el = document.getElementById('mobileInputAction');
      if (el) el.value = value;
    }
    // Re-render để cập nhật trạng thái active của chips
    window.renderProductHistoryView();
  };

  window.handleClearMobileQr = function() {
    window.ProductHistoryState.mobileDraft.qrCode = '';
    const inp = document.getElementById('mobileInputQrCode');
    if (inp) inp.value = '';
    window.renderProductHistoryView();
  };

  window.handleCheckQrInputHistory = function() {
    const qrVal = (window.ProductHistoryState.mobileDraft.qrCode || '').trim();
    if (!qrVal) return;
    const matches = window.ProductHistoryState.records.filter(r => (r.qrCode || '').toLowerCase().includes(qrVal.toLowerCase()));
    if (matches.length > 0) {
      if (window.showToast) window.showToast('info', `🔍 Tìm thấy ${matches.length} lần sửa chữa trước đây của mã QR: ${qrVal}`);
    } else {
      if (window.showToast) window.showToast('info', `Mã QR mới: ${qrVal}`);
    }
    window.renderProductHistoryView();
  };

  window.handleResetMobileDraft = function() {
    const curRep = getCurrentUserName();
    window.ProductHistoryState.mobileDraft = {
      recordId: '',
      qrCode: '',
      model: '',
      stage: 'HARD TEST',
      workcell: 'WCA',
      line: 'Line 1A',
      date: getTodayDateString(),
      shift: 'DAY',
      repairer: curRep,
      defectDesc: '',
      rootCause: '',
      action: '',
      result: 'OK',
      status: 'Input Line',
      note: ''
    };
    window.renderProductHistoryView();
    if (window.showToast) window.showToast('info', 'Đã đặt lại form nhập dữ liệu');
  };

  window.handleEditInMobileDraft = function(recordId) {
    const r = window.ProductHistoryState.records.find(item => item.id === recordId);
    if (!r) return;

    window.ProductHistoryState.mobileDraft = {
      recordId: r.id,
      qrCode: r.qrCode || '',
      model: r.model || '',
      stage: r.stage || 'HARD TEST',
      workcell: (r.workcell || 'WCA').toUpperCase(),
      line: r.line || 'Line 1A',
      date: r.date || getTodayDateString(),
      shift: r.shift || 'DAY',
      repairer: r.repairer || getCurrentUserName(),
      defectDesc: r.defectDesc || '',
      rootCause: r.rootCause || '',
      action: r.action || '',
      result: r.result || 'OK',
      status: r.status || 'Input Line',
      note: r.note || ''
    };

    window.ProductHistoryState.activeSubView = 'input';
    window.renderProductHistoryView();
    if (window.showToast) window.showToast('info', `✏️ Đã tải bản ghi [${r.qrCode}] lên form sửa`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.handleSaveMobileDraft = async function(scanNext = false) {
    if (!canUserInputData()) {
      showRequireAuthModal();
      return;
    }

    const d = window.ProductHistoryState.mobileDraft;
    const qrCode = (d.qrCode || '').trim();
    const defectDesc = (d.defectDesc || '').trim();

    if (!qrCode) {
      alert('Vui lòng quét hoặc nhập Mã QR Code sản phẩm!');
      const inp = document.getElementById('mobileInputQrCode');
      if (inp) inp.focus();
      return;
    }

    if (!defectDesc) {
      alert('Vui lòng chọn hoặc nhập Nội Dung Lỗi phát sinh!');
      const inp = document.getElementById('mobileInputDefectDesc');
      if (inp) inp.focus();
      return;
    }

    const shiftName = d.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const record = {
      id: d.recordId || ('PRH_' + Date.now()),
      qrCode,
      model: d.model || 'Ajax Model',
      stage: d.stage || 'HARD TEST',
      workcell: d.workcell || 'WCA',
      line: d.line || 'Line 1A',
      date: d.date || getTodayDateString(),
      shift: d.shift || 'DAY',
      shiftName,
      repairer: d.repairer || getCurrentUserName(),
      defectDesc,
      rootCause: d.rootCause || 'PCB NG',
      action: d.action || 'Chạy lại Hardtest',
      result: d.result || 'OK',
      status: d.status || 'Input Line',
      note: d.note || '',
      timestamp,
      createdAt: new Date().toISOString()
    };

    await saveProductRepairRecord(record);

    if (window.showToast) {
      window.showToast('success', `💾 ĐÃ LƯU THÀNH CÔNG: QR [${qrCode}] - ${defectDesc}`);
    }

    // Làm mới lại draft để sẵn sàng cho máy tiếp theo
    const keepStage = d.stage;
    const keepWc = d.workcell;
    const keepLine = d.line;
    const keepShift = d.shift;
    const keepRep = d.repairer;

    window.ProductHistoryState.mobileDraft = {
      recordId: '',
      qrCode: '',
      model: '',
      stage: keepStage,
      workcell: keepWc,
      line: keepLine,
      date: getTodayDateString(),
      shift: keepShift,
      repairer: keepRep,
      defectDesc: '',
      rootCause: '',
      action: '',
      result: 'OK',
      status: 'Input Line',
      note: ''
    };

    if (scanNext) {
      window.renderProductHistoryView();
      setTimeout(() => {
        window.handleStartCameraForMobileInput();
      }, 350);
    } else {
      window.renderProductHistoryView();
    }
  };

  // ==========================================
  // CAMERA SCANNER FOR MOBILE INPUT
  // ==========================================
  window.handleStartCameraForMobileInput = async function() {
    const s = window.ProductHistoryState;
    if (s.isCameraScanning) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Trình duyệt không hỗ trợ truy cập Camera trực tiếp. Vui lòng sử dụng nút "Chọn Ảnh QR" hoặc nhập trực tiếp mã.');
        return;
      }

      s.isCameraScanning = true;
      window.renderProductHistoryView();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      s.mediaStream = stream;

      setTimeout(() => {
        const video = document.getElementById('mobileCameraVideo');
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.play().then(() => {
            startScanningLoop(video);
          }).catch(err => {
            console.warn('Video play error:', err);
          });
        }
      }, 100);

    } catch (err) {
      console.error('Lỗi mở camera:', err);
      s.isCameraScanning = false;
      window.renderProductHistoryView();
      alert('Không thể mở Camera: ' + err.message + '. Hãy cấp quyền Camera cho trình duyệt hoặc dùng nút "Chọn Ảnh QR".');
    }
  };

  window.handleStopCameraScanner = function() {
    const s = window.ProductHistoryState;
    s.isCameraScanning = false;
    if (s.mediaStream) {
      try {
        s.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      s.mediaStream = null;
    }
    window.renderProductHistoryView();
  };

  function startScanningLoop(video) {
    const s = window.ProductHistoryState;
    let detector = null;
    if (window.BarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
      } catch (e) {}
    }

    async function scanLoop() {
      if (!s.isCameraScanning || !video || video.paused || video.ended) return;

      try {
        if (detector && video.readyState === video.HAVE_ENOUGH_DATA) {
          const codes = await detector.detect(video);
          if (codes && codes.length > 0) {
            const rawValue = codes[0].rawValue;
            if (rawValue) {
              playBeepSound();
              triggerVibrate();
              window.handleStopCameraScanner();
              if (window.showToast) window.showToast('success', `📱 ĐÃ NHẬN DIỆN QR: ${rawValue}`);
              
              // Gán vào draft
              s.mobileDraft.qrCode = rawValue;
              
              // Tự động tìm model nếu mã này đã từng sửa
              const existing = s.records.find(r => (r.qrCode || '').trim().toLowerCase() === rawValue.trim().toLowerCase());
              if (existing) {
                if (existing.model) s.mobileDraft.model = existing.model;
                if (existing.workcell) s.mobileDraft.workcell = existing.workcell;
                if (existing.line) s.mobileDraft.line = existing.line;
              }
              
              window.renderProductHistoryView();
              return;
            }
          }
        }
      } catch (err) {}

      if (s.isCameraScanning) {
        requestAnimationFrame(scanLoop);
      }
    }

    requestAnimationFrame(scanLoop);
  }

  window.handleUploadQrImageForMobile = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      if (!window.BarcodeDetector) {
        const manualCode = prompt('Trình duyệt chưa hỗ trợ quét ảnh QR trực tiếp. Vui lòng nhập mã thiết bị từ ảnh vừa chụp:', file.name.replace(/\.[^/.]+$/, ''));
        if (manualCode) {
          window.ProductHistoryState.mobileDraft.qrCode = manualCode.trim();
          window.renderProductHistoryView();
        }
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
          const codes = await detector.detect(img);
          if (codes && codes.length > 0) {
            const rawVal = codes[0].rawValue;
            playBeepSound();
            triggerVibrate();
            if (window.showToast) window.showToast('success', `📱 Đã nhận diện ảnh QR: ${rawVal}`);
            window.ProductHistoryState.mobileDraft.qrCode = rawVal;
            
            const existing = window.ProductHistoryState.records.find(r => (r.qrCode || '').trim().toLowerCase() === rawVal.trim().toLowerCase());
            if (existing && existing.model) {
              window.ProductHistoryState.mobileDraft.model = existing.model;
            }
            window.renderProductHistoryView();
          } else {
            alert('Không tìm thấy mã QR trong ảnh vừa chọn. Vui lòng thử chụp lại góc thẳng và rõ nét hơn.');
          }
        } catch (e) {
          alert('Lỗi phân tích ảnh QR: ' + e.message);
        }
      };
    } catch (err) {
      alert('Không thể đọc ảnh: ' + err.message);
    }
  };

  // ==========================================
  // BỘ LỌC VÀ TÌM KIẾM CHO ADMIN & VIEWER
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

  window.handleDeleteRepairRecord = function(recordId) {
    deleteProductRepairRecord(recordId);
  };

  window.handleOpenLoginFromDefect = function() {
    const authModal = document.getElementById('authRequireModal');
    if (authModal) authModal.style.display = 'none';
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
        window.showToast('success', `📋 Đã sao chép ${rows.length} bản ghi! Mở Google Sheets -> sheet 'Repair history' -> bấm Ctrl+V tại ô A1 để dán.`);
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

  // Tự động tải dữ liệu khi trang khởi động
  document.addEventListener('DOMContentLoaded', () => {
    loadProductRepairHistory();
  });

})();
