/**
 * =========================================================================
 * AJAX PROPLAN MES - CHECK TỔNG THỂ PLAN / FACT (TRUY VẾT ÂM / DƯƠNG THEO NGÀY & CA)
 * =========================================================================
 * Mục đích:
 * - Khi kết thúc tuần trong Data_Mass, số lượng Gap của các Model được đẩy sang kế hoạch tuần tiếp theo.
 * - Công cụ này giúp Planner & Quản lý MES tra cứu chi tiết:
 *     1. Số lượng âm (hoặc dương) của từng mã model phát sinh từ ngày nào? Ca nào (Ngày / Đêm)?
 *     2. Line sản xuất nào ghi nhận chênh lệch?
 *     3. Nguyên nhân, lý do thiếu hụt (Cập nhật trực tiếp từ Sheet Mass-History) và tình trạng giải trình.
 *     4. Hỗ trợ tra cứu toàn diện cả > 0 (vượt kế hoạch), < 0 (thiếu hụt), và = 0 (cân bằng).
 * - Cung cấp 2 chế độ hiển thị:
 *     Chế độ 1: Tổng Hợp Theo Model (Kèm chi tiết các ca & nguyên nhân dạng thẻ như concept ảnh số 1)
 *     Chế độ 2: Chi Tiết Từng Ngày & Ca (Nhật ký sản xuất / Flat log table)
 * - Tương thích 100% với Google Sheets (Copy TSV) và Xuất file CSV UTF-8.
 * =========================================================================
 */

(function() {
  'use strict';

  // Khởi tạo Store quản lý trạng thái của tab Check Tổng Thể Plan / Fact
  window.PlanFactCheckStore = {
    activeViewMode: 'MODEL_SUMMARY', // 'MODEL_SUMMARY' (Tổng hợp theo Model như ảnh 1) | 'SHIFT_LOG' (Chi tiết từng ca)
    stageFilter: 'ALL',              // 'ALL', 'ASSEMBLY', 'HARD TEST', 'PKG', 'DIP', 'SMD', etc.
    groupFilter: 'ALL',              // 'ALL' hoặc Tên Group Model cụ thể
    gapFilter: 'ALL',                // 'ALL' (bao gồm cả >0 và <0) | 'NEGATIVE' (<0) | 'POSITIVE' (>0) | 'BALANCED' (=0)
    shiftFilter: 'ALL',              // 'ALL' | 'DAY' (☀️ Ca ngày) | 'NIGHT' (🌙 Ca đêm)
    reasonFilter: 'ALL',             // 'ALL' | 'HAS_REASON' (Có lý do) | 'NO_REASON' (Chưa có lý do)
    fromDate: '2026-11-05',          // Kỳ sản xuất hiện tại (05/11/2026)
    toDate: '2026-11-12',            // Đến ngày hiện tại
    search: '',                      // Tìm kiếm theo Model, mã 1C, Line, hoặc từ khóa lý do
    sortBy: 'GAP_ASC',               // 'GAP_ASC' (Âm nhiều nhất lên đầu) | 'GAP_DESC' | 'PLAN_DESC' | 'MODEL_ASC'
    pageIndex: 0,
    pageSize: 25,
    expandedModelKeys: {},           // Ghi nhớ các Model đang mở rộng xem chi tiết tất cả các ca
    expandedTimelineKeys: {},        // Ghi nhớ các Model đang mở rộng Drawer xem diễn biến lũy kế các ngày (Data_Mass)
    modelTimelineMode: {},           // Chế độ xem timeline: 'ACTIVE' (mặc định các ngày có SX) | 'ALL' (toàn bộ ngày từ 22/09/2025)
    modalModelData: null,            // Dữ liệu model đang mở trong Popup Modal
    modalActiveTab: 'TIMELINE'       // 'TIMELINE' (Tiến trình lũy kế ngày Data_Mass) | 'SHIFTS' (Danh sách ca Mass-History)
  };

  /**
   * Cấu hình badge và icon nhận diện từng công đoạn
   */
  const STAGE_STYLES = {
    'ASSEMBLY': { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.45)', color: '#38bdf8', icon: '🔧' },
    'HARD TEST': { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.45)', color: '#c084fc', icon: '⚡' },
    'OPTICS ASM': { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.45)', color: '#fbbf24', icon: '🔬' },
    'FOCUS': { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.45)', color: '#34d399', icon: '🎯' },
    'A IMP ASM': { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.45)', color: '#60a5fa', icon: '⚙️' },
    'PKG': { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.45)', color: '#f59e0b', icon: '📦' },
    'COM PKG': { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.45)', color: '#fb923c', icon: '📦' },
    'COM PKG AUTO': { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.45)', color: '#fb923c', icon: '🤖' },
    'DIP': { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.45)', color: '#22d3ee', icon: '🔌' },
    'DIP. SELECTIV': { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.45)', color: '#22d3ee', icon: '🎛️' },
    'Selective': { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.45)', color: '#22d3ee', icon: '🎛️' },
    'THT': { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.45)', color: '#2dd4bf', icon: '⚙️' },
    'SMD': { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.45)', color: '#f472b6', icon: '🖨️' },
    'LONG TEST': { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.45)', color: '#34d399', icon: '⏱️' },
    'TEST ROOM': { bg: 'rgba(132, 204, 22, 0.15)', border: 'rgba(132, 204, 22, 0.45)', color: '#a3e635', icon: '🔬' },
    'LACQUERING': { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.45)', color: '#38bdf8', icon: '💧' },
    'QC': { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.45)', color: '#facc15', icon: '🔍' },
    'MB': { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.45)', color: '#818cf8', icon: '📟' }
  };

  function getPfcStageStyle(stage) {
    const s = String(stage || '').toUpperCase().trim();
    return STAGE_STYLES[s] || { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)', color: '#94a3b8', icon: '🏷️' };
  }

  function escapePfcHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizePfcText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\r\n\t_.,/\\-]+/g, ' ')
      .trim();
  }

  function formatPfcDate(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    }
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) {
        const m = p[0].padStart(2, '0');
        const d = p[1].padStart(2, '0');
        return `${d}/${m}/${p[2]}`;
      }
    }
    return s;
  }

  function formatPfcDateShort(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}`;
    }
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) return `${p[1].padStart(2, '0')}/${p[0].padStart(2, '0')}`;
    }
    return s;
  }

  function getDatesInRangeList(fromDate, toDate) {
    if (!fromDate || !toDate) return [];
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();
    if (isNaN(fromTime) || isNaN(toTime)) return [];

    const dates = [];
    let cur = new Date(fromTime);
    const end = new Date(toTime);
    cur.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  function toPfcDateInt(str) {
    if (!str) return 0;
    const s = String(str).trim();
    if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) return parseInt(p[0], 10) * 10000 + parseInt(p[1], 10) * 100 + parseInt(p[2], 10);
    }
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) return parseInt(p[2], 10) * 10000 + parseInt(p[0], 10) * 100 + parseInt(p[1], 10);
    }
    return 0;
  }

  function getPfcDayOfWeek(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    let d;
    if (s.includes('-')) {
      const p = s.split('-');
      if (p.length === 3) d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    } else if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) d = new Date(parseInt(p[2], 10), parseInt(p[0], 10) - 1, parseInt(p[1], 10));
    }
    if (!d || isNaN(d.getTime())) return '';
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[d.getDay()] || '';
  }

  function escapePfcAttr(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  /**
   * Thu thập và tính toán dữ liệu tổng hợp cho toàn bộ Model và chi tiết các ca
   */
  function collectPlanFactCheckData() {
    const store = window.PlanFactCheckStore;
    const fromDate = store.fromDate || '2026-11-05';
    const toDate = store.toDate || '2026-11-12';

    // 1. Khoảng ngày được người dùng chọn (để tính tổng Kế Hoạch, Thực Tế, Chênh Lệch của kỳ)
    const activeDates = getDatesInRangeList(fromDate, toDate);
    const activeDateIsoSet = new Set(activeDates);
    const activeDateSlashSet = new Set(activeDates.map(d => {
      const p = d.split('-');
      return `${parseInt(p[1], 10)}/${parseInt(p[2], 10)}/${p[0]}`;
    }));

    // 2. Mốc bắt đầu sản xuất tuyệt đối (22/09/2025) dùng để truy vết toàn bộ lịch sử ngày phát sinh Gap
    const ABSOLUTE_START_DATE = '2025-09-22';
    const historyDates = getDatesInRangeList(ABSOLUTE_START_DATE, toDate);
    const historyDateIsoSet = new Set(historyDates);
    const historyDateSlashSet = new Set(historyDates.map(d => {
      const p = d.split('-');
      return `${parseInt(p[1], 10)}/${parseInt(p[2], 10)}/${p[0]}`;
    }));

    const dmItems = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA.items)
      || (window.AppStore && window.AppStore.dataMass && window.AppStore.dataMass.items) || [];
    const massHistory = window.MASS_HISTORY_DATA || (window.AppStore && window.AppStore.massHistory) || [];

    // 3. Chỉ mục hóa Mass History:
    // - allFilteredLogs: Chỉ lấy các ca trong khoảng [fromDate, toDate] cho Tab 2 (Nhật ký ca)
    // - historyByModelMap & historyBySpecMap: Lưu toàn bộ ca từ 22/09/2025 để map vào Timeline chi tiết của Model
    const historyByModelMap = new Map();
    const historyBySpecMap = new Map();
    const allFilteredLogs = [];

    massHistory.forEach((rec, recIdx) => {
      const recDate = rec.date || '';
      const recRawDate = rec.rawDate || '';
      const inHistoryRange = historyDateIsoSet.has(recDate) || historyDateSlashSet.has(recRawDate) ||
        (recDate >= ABSOLUTE_START_DATE && recDate <= toDate);
      if (!inHistoryRange) return;

      const normM = normalizePfcText(rec.model);
      const spec = (rec.specCode || '').trim();
      const recShift = String(rec.shift || '').toLowerCase();
      const gapVal = parseFloat(rec.gap || 0);

      const inSelectedPeriod = activeDateIsoSet.has(recDate) || activeDateSlashSet.has(recRawDate) ||
        (recDate >= fromDate && recDate <= toDate);

      // Thêm ID định danh bản ghi
      const enrichedRec = {
        ...rec,
        _id: recIdx,
        _gapVal: gapVal,
        _planVal: parseFloat(rec.plan || 0),
        _factVal: parseFloat(rec.fact || 0),
        _shiftNorm: (recShift === 'day' || recShift === '☀️ ngày') ? 'day' : 'night',
        _hasReason: Boolean(rec.reason && rec.reason.trim()),
        _inSelectedPeriod: inSelectedPeriod
      };

      if (inSelectedPeriod) {
        allFilteredLogs.push(enrichedRec);
      }

      if (normM) {
        if (!historyByModelMap.has(normM)) historyByModelMap.set(normM, []);
        historyByModelMap.get(normM).push(enrichedRec);
      }
      if (spec) {
        if (!historyBySpecMap.has(spec)) historyBySpecMap.set(spec, []);
        historyBySpecMap.get(spec).push(enrichedRec);
      }
    });

    // 2. Tổng hợp theo từng Model từ Data_Mass
    const modelEntries = [];
    const stageSet = new Set();
    const groupSet = new Set();

    dmItems.forEach((it, itIdx) => {
      const stage = (it.stage || '').toUpperCase().trim();
      const groupModel = (it.model || '').trim();
      const p1c = (it.productName1C || '').trim();
      const specCode = (it.specCode || '').trim();
      if (!p1c && !groupModel) return;

      if (stage) stageSet.add(stage);
      if (groupModel) groupSet.add(groupModel);

      // 1. Tính tổng Kế Hoạch & Thực Tế kỳ chọn [fromDate, toDate]
      // VÀ truy vết toàn bộ chuỗi tiến trình chi tiết từ ngày bắt đầu sản xuất (22/09/2025) đến toDate
      let planTotal = 0;
      let factTotal = 0;
      let hasSelectedPeriodActivity = false;

      let allTimePlanTotal = 0;
      let allTimeFactTotal = 0;
      const dailyTimeline = [];
      let runningCumGap = 0;
      let firstProdDate = null;
      let firstGapDate = null;
      let firstDeficitDate = null;
      let firstDeficitGap = 0;
      let firstCumDeficitDate = null;
      let firstCumDeficitAmount = 0;
      let deficitDaysCount = 0;

      historyDates.forEach(dIso => {
        const p = dIso.split('-');
        const slashD = `${parseInt(p[1], 10)}/${parseInt(p[2], 10)}/${p[0]}`;

        const pVal = (it.plan && (it.plan[dIso] !== undefined ? it.plan[dIso] : it.plan[slashD])) || 0;
        const fVal = (it.fact && (it.fact[dIso] !== undefined ? it.fact[dIso] : it.fact[slashD])) || 0;

        allTimePlanTotal += pVal;
        allTimeFactTotal += fVal;

        if (pVal > 0 || fVal > 0) {
          if (!firstProdDate) firstProdDate = dIso;
        }

        const dGap = Math.round(fVal - pVal);
        runningCumGap += dGap;

        if (dGap !== 0 && !firstGapDate) firstGapDate = dIso;
        if (dGap < 0) {
          deficitDaysCount++;
          if (!firstDeficitDate) {
            firstDeficitDate = dIso;
            firstDeficitGap = dGap;
          }
        }
        if (runningCumGap < 0 && !firstCumDeficitDate) {
          firstCumDeficitDate = dIso;
          firstCumDeficitAmount = runningCumGap;
        }

        // Kiểm tra xem ngày này có thuộc khoảng thời gian người dùng đang chọn không
        const isSelectedPeriod = activeDateIsoSet.has(dIso) || (dIso >= fromDate && dIso <= toDate);
        if (isSelectedPeriod) {
          planTotal += pVal;
          factTotal += fVal;
          if (pVal > 0 || fVal > 0) {
            hasSelectedPeriodActivity = true;
          }
        }

        dailyTimeline.push({
          dateIso: dIso,
          dateSlash: slashD,
          dateFormatted: formatPfcDate(dIso),
          dateShort: formatPfcDateShort(dIso),
          dayOfWeek: getPfcDayOfWeek(dIso),
          plan: Math.round(pVal),
          fact: Math.round(fVal),
          gap: dGap,
          cumGap: runningCumGap,
          inSelectedPeriod: isSelectedPeriod,
          shifts: [], // Sẽ gán sau khi matchedShifts được xác định
          hasActivity: pVal > 0 || fVal > 0
        });
      });

      // Tìm các bản ghi ca trong Mass History tương ứng với Model này (toàn bộ từ 22/09/2025)
      const normP1c = normalizePfcText(p1c);
      const normGroup = normalizePfcText(groupModel);
      let matchedShifts = [];

      if (normP1c && historyByModelMap.has(normP1c)) {
        matchedShifts = historyByModelMap.get(normP1c);
      } else if (specCode && historyBySpecMap.has(specCode)) {
        matchedShifts = historyBySpecMap.get(specCode);
      } else if (normP1c) {
        // Fallback: Tìm đối chiếu mờ (fuzzy substring) nếu tên dài > 10 ký tự
        for (const [k, list] of historyByModelMap.entries()) {
          if (k.length > 12 && (k.includes(normP1c) || normP1c.includes(k))) {
            matchedShifts = list;
            break;
          }
        }
      }

      // Lọc lại các bản ghi ca khớp công đoạn (nếu có thông tin process / workcell)
      if (matchedShifts.length > 0 && stage) {
        const stageMatches = matchedShifts.filter(s => {
          const wp = (s.workcell || s.process || '').toUpperCase().trim();
          if (!wp) return true;
          if (stage === 'ASSEMBLY') return wp === 'ASSEMBLY';
          if (stage.includes('HARD')) return wp.includes('HARD') || wp.includes('FOCUS');
          return wp === stage || wp.includes(stage) || stage.includes(wp);
        });
        if (stageMatches.length > 0) matchedShifts = stageMatches;
      }

      // Sắp xếp các ca theo ngày tăng dần, ca ngày trước ca đêm
      matchedShifts.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a._shiftNorm !== b._shiftNorm) return a._shiftNorm === 'day' ? -1 : 1;
        return (a.line || '').localeCompare(b.line || '');
      });

      const gapTotal = Math.round(factTotal - planTotal);
      const allTimeTotalGap = Math.round(allTimeFactTotal - allTimePlanTotal);
      const shiftGapSum = matchedShifts.reduce((acc, s) => acc + s._gapVal, 0);
      const shiftsWithReasons = matchedShifts.filter(s => s._hasReason);
      const negShiftsCount = matchedShifts.filter(s => s._gapVal < 0).length;
      const posShiftsCount = matchedShifts.filter(s => s._gapVal > 0).length;

      // Gán các ca sản xuất phát sinh trong ngày vào dailyTimeline (từ 22/09/2025)
      dailyTimeline.forEach(t => {
        t.shifts = matchedShifts.filter(s => s.date === t.dateIso || s.rawDate === t.dateSlash);
        if (t.shifts.length > 0) t.hasActivity = true;
      });

      // Lọc chuỗi ngày có hoạt động thực tế (có plan, có fact, có gap, hoặc có ca sản xuất) từ 22/09/2025
      const activeDailyTimeline = dailyTimeline.filter(t => t.hasActivity || t.gap !== 0 || (t.shifts && t.shifts.length > 0));
      if (!firstProdDate && activeDailyTimeline.length > 0) {
        firstProdDate = activeDailyTimeline[0].dateIso;
      }

      // 2. Tính số lượng âm/dương tồn từ trước kỳ lọc (Prior Deficit / Surplus Carry-over từ Data_Mass)
      const fromCutoff = toPfcDateInt(fromDate);
      let priorPlan = 0;
      let priorFact = 0;
      const pMap = it.plan || {};
      const fMap = it.fact || {};
      const checkedKeys = new Set();
      const allKeys = Object.keys(pMap).concat(Object.keys(fMap));

      for (let i = 0; i < allKeys.length; i++) {
        const k = allKeys[i];
        if (checkedKeys.has(k)) continue;
        checkedKeys.add(k);
        if (toPfcDateInt(k) < fromCutoff) {
          priorPlan += (pMap[k] || 0);
          priorFact += (fMap[k] || 0);
        }
      }
      const priorGap = Math.round(priorFact - priorPlan);
      const hasPriorDeficit = priorGap < 0;

      // Bỏ qua nếu model hoàn toàn không có hoạt động trong kỳ chọn, không có thiếu hụt lịch sử, và không có ca nào
      const hasAnyActivity = hasSelectedPeriodActivity || planTotal > 0 || factTotal > 0 ||
        hasPriorDeficit || (firstDeficitDate !== null) || (allTimeTotalGap !== 0) || matchedShifts.length > 0 ||
        activeDailyTimeline.length > 0;
      if (!hasAnyActivity) {
        return;
      }

      // 3. Tính số ngày kéo dài kể từ khi bắt đầu âm
      let daysSinceFirstDeficit = 0;
      if (firstDeficitDate) {
        const p1 = firstDeficitDate.split('-');
        const p2 = toDate.split('-');
        const dt1 = new Date(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10));
        const dt2 = new Date(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10));
        daysSinceFirstDeficit = Math.max(1, Math.round((dt2 - dt1) / 86400000) + 1);
      }

      const modelKey = `${stage}_${specCode}_${p1c}`;

      modelEntries.push({
        _idx: itIdx,
        modelKey,
        stage,
        groupModel,
        productName1C: p1c,
        specCode,
        // Số liệu Kế hoạch, Thực tế, Chênh lệch của kỳ chọn [fromDate, toDate]
        planTotal: Math.round(planTotal),
        factTotal: Math.round(factTotal),
        gapTotal,
        // Số liệu toàn kỳ từ 22/09/2025
        allTimePlanTotal: Math.round(allTimePlanTotal),
        allTimeFactTotal: Math.round(allTimeFactTotal),
        allTimeTotalGap,
        priorPlan: Math.round(priorPlan),
        priorFact: Math.round(priorFact),
        priorGap,
        hasPriorDeficit,
        // Chi tiết các ca
        shifts: matchedShifts,
        shiftsCount: matchedShifts.length,
        shiftsWithReasonsCount: shiftsWithReasons.length,
        negShiftsCount,
        posShiftsCount,
        shiftGapSum,
        hasShifts: matchedShifts.length > 0,
        // Tiến trình lũy kế & Truy vết ngày bắt đầu Gap (Data_Mass từ 22/09/2025)
        dailyTimeline,
        activeDailyTimeline,
        activeDaysCount: activeDailyTimeline.length,
        firstProdDate,
        firstGapDate,
        firstDeficitDate,
        firstDeficitGap,
        firstCumDeficitDate,
        firstCumDeficitAmount,
        deficitDaysCount,
        daysSinceFirstDeficit
      });
    });

    // 3. Áp dụng các bộ lọc của người dùng
    const stageF = store.stageFilter;
    const groupF = store.groupFilter;
    const gapF = store.gapFilter;
    const shiftF = store.shiftFilter;
    const reasonF = store.reasonFilter;
    const searchLow = normalizePfcText(store.search);

    const filteredModels = modelEntries.filter(m => {
      // Lọc Công Đoạn
      if (stageF !== 'ALL' && m.stage !== stageF) return false;

      // Lọc Group Model
      if (groupF !== 'ALL' && m.groupModel !== groupF) return false;

      // Lọc Chênh Lệch (Gap): Hỗ trợ cả >0 và <0 đúng theo yêu cầu user
      if (gapF === 'NEGATIVE' && m.gapTotal >= 0) return false;
      if (gapF === 'POSITIVE' && m.gapTotal <= 0) return false;
      if (gapF === 'BALANCED' && m.gapTotal !== 0) return false;

      // Lọc Ca Làm Việc
      if (shiftF !== 'ALL') {
        const targetShift = shiftF === 'DAY' ? 'day' : 'night';
        const hasMatchingShift = m.shifts.some(s => s._shiftNorm === targetShift);
        if (!hasMatchingShift && m.shifts.length > 0) return false;
      }

      // Lọc Tình Trạng Lý Do / Giải Trình
      if (reasonF === 'HAS_REASON' && m.shiftsWithReasonsCount === 0) return false;
      if (reasonF === 'NO_REASON' && m.shiftsWithReasonsCount > 0) return false;

      // Tìm kiếm đa năng: Tên Model, mã 1C, Group, tên Line, từ khóa lý do
      if (searchLow) {
        const mText = `${m.stage} ${m.groupModel} ${m.productName1C} ${m.specCode}`;
        const shiftText = m.shifts.map(s => `${s.line || ''} ${s.reason || ''} ${s.qualityIssue || ''} ${s.correctiveAction || ''}`).join(' ');
        const fullSearchText = normalizePfcText(`${mText} ${shiftText}`);
        if (!fullSearchText.includes(searchLow)) return false;
      }

      return true;
    });

    // 4. Sắp xếp danh sách Model
    const sortBy = store.sortBy;
    filteredModels.sort((a, b) => {
      if (sortBy === 'GAP_ASC') return a.gapTotal - b.gapTotal;
      if (sortBy === 'GAP_DESC') return b.gapTotal - a.gapTotal;
      if (sortBy === 'PLAN_DESC') return b.planTotal - a.planTotal;
      if (sortBy === 'FACT_DESC') return b.factTotal - a.factTotal;
      if (sortBy === 'MODEL_ASC') return a.productName1C.localeCompare(b.productName1C);
      if (sortBy === 'SHIFTS_DESC') return b.shiftsCount - a.shiftsCount;
      return a.gapTotal - b.gapTotal;
    });

    // 5. Lọc danh sách nhật ký ca (Shift Log View)
    const filteredLogs = allFilteredLogs.filter(log => {
      const logStage = (log.workcell || log.process || '').toUpperCase().trim();
      if (stageF !== 'ALL' && logStage && logStage !== stageF) return false;

      if (gapF === 'NEGATIVE' && log._gapVal >= 0) return false;
      if (gapF === 'POSITIVE' && log._gapVal <= 0) return false;
      if (gapF === 'BALANCED' && log._gapVal !== 0) return false;

      if (shiftF !== 'ALL') {
        const targetShift = shiftF === 'DAY' ? 'day' : 'night';
        if (log._shiftNorm !== targetShift) return false;
      }

      if (reasonF === 'HAS_REASON' && !log._hasReason) return false;
      if (reasonF === 'NO_REASON' && log._hasReason) return false;

      if (searchLow) {
        const logText = `${logStage} ${log.model || ''} ${log.line || ''} ${log.reason || ''} ${log.qualityIssue || ''} ${log.correctiveAction || ''}`;
        if (!normalizePfcText(logText).includes(searchLow)) return false;
      }

      return true;
    });

    filteredLogs.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date); // Mới nhất lên đầu
      return a._gapVal - b._gapVal; // Âm nhiều nhất lên đầu
    });

    // 6. Tính toán các chỉ số KPI tổng quan
    const kpiTotalModels = filteredModels.length;
    const kpiTotalPlan = filteredModels.reduce((acc, m) => acc + m.planTotal, 0);
    const kpiTotalFact = filteredModels.reduce((acc, m) => acc + m.factTotal, 0);
    const kpiTotalGap = kpiTotalFact - kpiTotalPlan;
    const kpiDeficitModels = filteredModels.filter(m => m.gapTotal < 0).length;
    const kpiSurplusModels = filteredModels.filter(m => m.gapTotal > 0).length;
    const kpiBalancedModels = filteredModels.filter(m => m.gapTotal === 0).length;
    const kpiExplainedModels = filteredModels.filter(m => m.gapTotal < 0 && m.shiftsWithReasonsCount > 0).length;
    const kpiTotalShifts = filteredModels.reduce((acc, m) => acc + m.shiftsCount, 0);

    return {
      models: filteredModels,
      logs: filteredLogs,
      activeDates,
      stages: Array.from(stageSet).sort(),
      groups: Array.from(groupSet).sort(),
      kpi: {
        totalModels: kpiTotalModels,
        totalPlan: kpiTotalPlan,
        totalFact: kpiTotalFact,
        totalGap: kpiTotalGap,
        deficitModels: kpiDeficitModels,
        surplusModels: kpiSurplusModels,
        balancedModels: kpiBalancedModels,
        explainedModels: kpiExplainedModels,
        totalShifts: kpiTotalShifts
      }
    };
  }

  /**
   * Render nội dung 1 thẻ ca sản xuất (Shift Card)
   */
  function renderPfcShiftCardHtml(s) {
    const isNeg = s._gapVal < 0;
    const isPos = s._gapVal > 0;
    const cardBorderColor = isNeg ? '#ef4444' : (isPos ? '#10b981' : '#64748b');
    const cardBg = isNeg ? 'rgba(239, 68, 68, 0.08)' : (isPos ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)');
    const gapColor = isNeg ? '#f87171' : (isPos ? '#34d399' : '#94a3b8');
    const gapSign = isPos ? '+' : '';
    const gapStr = s._gapVal !== 0 ? `(${gapSign}${Math.round(s._gapVal).toLocaleString('vi-VN')})` : '(0)';
    const shiftLabel = s._shiftNorm === 'day' ? '☀️ Ngày' : '🌙 Đêm';
    const dateLabel = formatPfcDateShort(s.date || s.rawDate);
    const lineLabel = s.line ? ` [${escapePfcHtml(s.line)}]` : '';

    return `
      <div class="pfc-shift-card" style="padding: 0.35rem 0.6rem; border-radius: 6px; background: ${cardBg}; border-left: 3px solid ${cardBorderColor}; margin-bottom: 0.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; margin-bottom: 0.15rem;">
          <span style="font-weight: 800; font-size: 0.72rem; color: ${isNeg ? '#fca5a5' : (isPos ? '#6ee7b7' : '#cbd5e1')};">
            📅 ${dateLabel} • ${shiftLabel}${lineLabel}
          </span>
          <span class="font-mono" style="font-weight: 800; font-size: 0.75rem; color: ${gapColor};">
            ${gapStr}
          </span>
        </div>
        <div style="font-size: 0.735rem; color: var(--text-primary, #f1f5f9); line-height: 1.4; word-break: break-word;">
          ${s.reason ? escapePfcHtml(s.reason) : '<span style="color: var(--text-muted, #64748b); font-style: italic;">Chưa có lý do chi tiết</span>'}
        </div>
        ${s.qualityIssue ? `<div style="font-size: 0.675rem; color: #fbbf24; margin-top: 0.1rem;">⚠️ ${escapePfcHtml(s.qualityIssue)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render ô Nguyên Nhân / Chi Tiết Ca trong Bảng Tổng Hợp Theo Model (giống concept ảnh số 1)
   */
  function renderPfcModelReasonsCellHtml(m) {
    const shifts = m.shifts || [];
    const isExpanded = Boolean(window.PlanFactCheckStore.expandedModelKeys[m.modelKey]);
    const encModel = encodeURIComponent(m.productName1C);
    const encStage = encodeURIComponent(m.stage);
    const encSpec = encodeURIComponent(m.specCode);

    // TH 1: Không có bản ghi ca nào trong Mass History
    if (shifts.length === 0) {
      if (m.gapTotal < 0) {
        return `
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; font-size: 0.72rem; padding: 0.25rem 0.6rem; font-weight: 800;">
              ⚠️ Thiếu hụt — Chưa cập nhật ca & lý do
            </span>
          </div>
        `;
      }
      if (m.gapTotal > 0) {
        return `<div style="color: #34d399; font-size: 0.75rem; font-style: italic;">✅ Vượt kế hoạch (+${m.gapTotal.toLocaleString('vi-VN')}) — Không ghi nhận âm</div>`;
      }
      return `<div style="color: var(--text-muted, #64748b); font-size: 0.75rem;">— (Cân bằng kế hoạch)</div>`;
    }

    // TH 2: Có các bản ghi ca
    const visibleCount = isExpanded ? shifts.length : Math.min(2, shifts.length);
    const topShifts = shifts.slice(0, visibleCount);
    const hiddenCount = shifts.length - 2;

    return `
      <div class="pfc-shift-wrap" style="display: flex; flex-direction: column; gap: 0.15rem; min-width: 290px; max-width: 440px;">
        <div style="font-size: 0.7rem; color: var(--text-muted, #94a3b8); font-weight: 800; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; margin-bottom: 0.15rem;">
          <span>📋 Tổng hợp ${shifts.length} ca có phát sinh &amp; ghi nhận:</span>
          <button type="button" class="btn-link"
            onclick="window.openPlanFactCheckShiftModal(decodeURIComponent('${encModel}'), decodeURIComponent('${encStage}'), decodeURIComponent('${encSpec}'))"
            title="Mở bảng chi tiết tất cả các ca (Popup Modal)"
            style="color: #38bdf8; font-size: 0.7rem; font-weight: 800; cursor: pointer; text-decoration: underline; background: none; border: none; padding: 0;">
            Bảng chi tiết ↗
          </button>
        </div>

        ${topShifts.map(renderPfcShiftCardHtml).join('')}

        ${(shifts.length > 2 && !isExpanded) ? `
          <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
            <button type="button" class="btn btn-xs btn-secondary"
              onclick="window.togglePlanFactCheckModelExpand('${m.modelKey}')"
              style="font-size: 0.68rem; padding: 0.15rem 0.5rem; background: rgba(147, 51, 234, 0.16); border: 1px dashed rgba(168, 85, 247, 0.5); color: #c084fc; font-weight: 800;">
              🔍 Xem thêm +${hiddenCount} ca khác trong kỳ...
            </button>
            <button type="button" class="btn btn-xs btn-secondary"
              onclick="window.openPlanFactCheckShiftModal(decodeURIComponent('${encModel}'), decodeURIComponent('${encStage}'), decodeURIComponent('${encSpec}'))"
              style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 800;">
              📋 Popup ↗
            </button>
          </div>
        ` : ''}

        ${(shifts.length > 2 && isExpanded) ? `
          <div style="margin-top: 0.15rem;">
            <button type="button" class="btn btn-xs btn-secondary"
              onclick="window.togglePlanFactCheckModelExpand('${m.modelKey}')"
              style="font-size: 0.68rem; padding: 0.15rem 0.5rem; color: #94a3b8;">
              ▲ Thu gọn danh sách ca
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render ô Ngày Bắt Đầu Phát Sinh Gap & Nút xem Tiến trình Lũy kế (Data_Mass)
   */
  function renderPfcStartGapCellHtml(m) {
    const isExpanded = Boolean(window.PlanFactCheckStore.expandedTimelineKeys[m.modelKey]);
    let startBadge = '';

    const prodStartHtml = m.firstProdDate ? `
      <div style="font-size: 0.68rem; color: #38bdf8; margin-bottom: 0.2rem; font-weight: 700;">
        📅 Bắt đầu SX: <strong>${formatPfcDateShort(m.firstProdDate)}</strong>
      </div>
    ` : '';

    if (m.firstDeficitDate) {
      const dateShort = formatPfcDateShort(m.firstDeficitDate);
      const firstGapStr = Math.abs(m.firstDeficitGap).toLocaleString('vi-VN');

      let periodGapHtml = '';
      if (m.gapTotal < 0) {
        periodGapHtml = `<span style="color: #f87171; font-weight: 700;">⚠️ Kỳ chọn: ${m.gapTotal.toLocaleString('vi-VN')} pcs</span>`;
      } else if (m.gapTotal > 0) {
        periodGapHtml = `<span style="color: #34d399; font-weight: 700;">🟢 Kỳ chọn bù: +${m.gapTotal.toLocaleString('vi-VN')} pcs</span>`;
      } else {
        periodGapHtml = `<span style="color: #94a3b8;">Kỳ chọn: 0 pcs</span>`;
      }

      startBadge = `
        ${prodStartHtml}
        <div style="margin-bottom: 0.25rem;">
          <span class="badge" style="background: rgba(239, 68, 68, 0.18); border: 1px solid #ef4444; color: #fca5a5; font-weight: 800; font-size: 0.72rem; padding: 0.15rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">
            <span>🚨 Bắt đầu âm:</span>
            <span style="color: #ffffff; text-decoration: underline;">${dateShort}</span>
            <span>(-${firstGapStr})</span>
          </span>
        </div>
        <div style="font-size: 0.675rem; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.2rem;">
          <span>⏳ Kéo dài <strong>${m.daysSinceFirstDeficit} ngày</strong></span>
          <span>•</span>
          <span style="color: #f87171; font-weight: 700;">${m.deficitDaysCount} ngày bị âm</span>
        </div>
        ${m.hasPriorDeficit ? `
          <div style="margin-bottom: 0.25rem; font-size: 0.675rem; color: #fbbf24; background: rgba(245, 158, 11, 0.1); border-left: 2px solid #f59e0b; padding: 0.1rem 0.35rem; border-radius: 2px;">
            <span>⚠️ Tuần trước đẩy sang: <strong>-${Math.abs(m.priorGap).toLocaleString('vi-VN')}</strong> pcs</span>
          </div>
        ` : ''}
        <div style="font-size: 0.68rem; margin-bottom: 0.25rem;">
          ${periodGapHtml}
        </div>
      `;
    } else if (m.gapTotal > 0) {
      const firstGapObj = m.dailyTimeline.find(t => t.gap > 0);
      const dateShort = firstGapObj ? firstGapObj.dateShort : (m.firstGapDate ? formatPfcDateShort(m.firstGapDate) : '—');
      startBadge = `
        ${prodStartHtml}
        <div style="margin-bottom: 0.25rem;">
          <span class="badge" style="background: rgba(16, 185, 129, 0.18); border: 1px solid #10b981; color: #6ee7b7; font-weight: 800; font-size: 0.72rem; padding: 0.15rem 0.5rem;">
            🟢 Bắt đầu vượt: ${dateShort}
          </span>
        </div>
        <div style="font-size: 0.675rem; color: #34d399; font-weight: 700; margin-bottom: 0.25rem;">
          Vượt ${m.gapTotal.toLocaleString('vi-VN')} pcs
        </div>
      `;
    } else {
      startBadge = `
        ${prodStartHtml}
        <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 600; margin-bottom: 0.25rem;">
          ✓ Cân bằng kế hoạch
        </div>
      `;
    }

    const activeCnt = (m.activeDailyTimeline && m.activeDailyTimeline.length) || m.dailyTimeline.length;
    const btnLabel = isExpanded ? 'Thu gọn lũy kế ▲' : `Xem lũy kế (${activeCnt} ngày) ▾`;
    const btnClass = isExpanded ? 'btn-primary' : 'btn-secondary';

    return `
      <div>
        ${startBadge}
        <div style="margin-top: 0.35rem;">
          <button type="button" class="btn btn-xs ${btnClass}"
            onclick="window.handleToggleModelDailyTimeline('${escapePfcAttr(m.modelKey)}')"
            style="font-size: 0.68rem; padding: 0.2rem 0.45rem; font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
            <span>📈</span><span>${btnLabel}</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render hàng Drawer mở rộng hiển thị Bảng Tiến Trình Lũy Kế Theo Từng Ngày (Data_Mass)
   */
  function renderPfcModelTimelineDrawerHtml(m, datesCount) {
    const encModel = encodeURIComponent(m.productName1C);
    const encStage = encodeURIComponent(m.stage);
    const encSpec = encodeURIComponent(m.specCode);

    const modelMode = (window.PlanFactCheckStore.modelTimelineMode && window.PlanFactCheckStore.modelTimelineMode[m.modelKey]) || 'ACTIVE';
    const isAllMode = modelMode === 'ALL';
    const targetTimeline = isAllMode ? m.dailyTimeline : ((m.activeDailyTimeline && m.activeDailyTimeline.length > 0) ? m.activeDailyTimeline : m.dailyTimeline);
    const activeCount = (m.activeDailyTimeline && m.activeDailyTimeline.length) || 0;

    const rowsHtml = targetTimeline.map((t, idx) => {
      const isNeg = t.gap < 0;
      const isPos = t.gap > 0;
      const isZero = t.gap === 0;

      const gapColor = isNeg ? '#f87171' : (isPos ? '#34d399' : 'var(--text-muted, #94a3b8)');
      const gapSign = isPos ? '+' : '';
      const gapText = isZero ? '0' : `${gapSign}${t.gap.toLocaleString('vi-VN')}`;

      const cumColor = t.cumGap < 0 ? '#f87171' : (t.cumGap > 0 ? '#34d399' : '#94a3b8');
      const cumSign = t.cumGap > 0 ? '+' : '';
      const cumText = t.cumGap === 0 ? '0' : `${cumSign}${t.cumGap.toLocaleString('vi-VN')}`;

      // Xác định diễn biến và trạng thái của ngày này
      let statusBadge = '';
      if (t.dateIso === m.firstDeficitDate) {
        statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-weight: 800; font-size: 0.72rem;">🚨 Bắt đầu thiếu hụt (${gapText})</span>`;
      } else if (t.dateIso === m.firstCumDeficitDate && m.firstCumDeficitDate !== m.firstDeficitDate) {
        statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); border: 1px dashed #ef4444; color: #fca5a5; font-weight: 800; font-size: 0.72rem;">📉 Lũy kế chuyển sang âm (${cumText})</span>`;
      } else if (isNeg) {
        statusBadge = `<span style="color: #f87171; font-weight: 700; font-size: 0.735rem;">📉 Thiếu ${Math.abs(t.gap).toLocaleString('vi-VN')} pcs</span>`;
      } else if (isPos) {
        if (t.cumGap < 0) {
          statusBadge = `<span style="color: #34d399; font-weight: 700; font-size: 0.735rem;">📈 Chạy bù +${t.gap.toLocaleString('vi-VN')} (Thu hẹp âm)</span>`;
        } else {
          statusBadge = `<span style="color: #34d399; font-weight: 700; font-size: 0.735rem;">🟢 Vượt +${t.gap.toLocaleString('vi-VN')} pcs</span>`;
        }
      } else {
        if (t.plan > 0) {
          statusBadge = `<span style="color: #60a5fa; font-size: 0.735rem;">✓ Đúng kế hoạch</span>`;
        } else {
          statusBadge = `<span style="color: #64748b; font-size: 0.72rem;">— Không có plan</span>`;
        }
      }

      // Các ca sản xuất phát sinh trong ngày
      let shiftsHtml = '—';
      if (t.shifts && t.shifts.length > 0) {
        shiftsHtml = t.shifts.map(s => {
          const shIcon = s._shiftNorm === 'day' ? '☀️ Ngày' : '🌙 Đêm';
          const sGapSign = s._gapVal > 0 ? '+' : '';
          const sGapColor = s._gapVal < 0 ? '#f87171' : (s._gapVal > 0 ? '#34d399' : '#94a3b8');
          return `
            <div style="margin-bottom: 0.2rem; font-size: 0.72rem; line-height: 1.35;">
              <strong style="color: var(--text-muted, #cbd5e1);">[${escapePfcHtml(s.line || 'Line')}] ${shIcon}:</strong>
              <span class="font-mono font-bold" style="color: ${sGapColor};">(${sGapSign}${Math.round(s._gapVal).toLocaleString('vi-VN')})</span>
              ${s.reason ? `<span style="color: var(--text-primary, #f1f5f9);"> — ${escapePfcHtml(s.reason)}</span>` : ''}
            </div>
          `;
        }).join('');
      }

      const rowBg = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
      const isHighlight = t.dateIso === m.firstDeficitDate;

      return `
        <tr style="background: ${isHighlight ? 'rgba(239, 68, 68, 0.08)' : rowBg}; ${isHighlight ? 'border-left: 3px solid #ef4444;' : ''}">
          <td style="text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.725rem;">${idx + 1}</td>
          <td class="font-mono font-bold" style="text-align: center; white-space: nowrap; color: var(--text-primary, #f8fafc); font-size: 0.775rem;">
            ${t.dateFormatted}
          </td>
          <td style="text-align: center; font-size: 0.75rem; color: #94a3b8; font-weight: 700;">
            ${t.dayOfWeek}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #60a5fa; font-size: 0.8rem;">
            ${t.plan.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.8rem;">
            ${t.fact.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${gapColor}; font-size: 0.825rem;">
            ${gapText}
          </td>
          <td class="font-mono font-bold" style="text-align: right; color: ${cumColor}; font-size: 0.85rem; background: rgba(255, 255, 255, 0.03);">
            ${cumText}
          </td>
          <td style="vertical-align: middle; padding: 0.35rem 0.6rem;">
            ${statusBadge}
          </td>
          <td style="vertical-align: middle; padding: 0.35rem 0.6rem;">
            ${shiftsHtml}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pfc-timeline-drawer-content">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <span style="font-size: 1.15rem;">📈</span>
              <strong style="color: #38bdf8; font-size: 0.95rem;">
                DIỄN BIẾN LŨY KẾ GAP THEO NGÀY (DATA_MASS) — ${escapePfcHtml(m.productName1C)}
              </strong>
              <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.7rem;">
                ${escapePfcHtml(m.stage)}
              </span>
              ${m.specCode ? `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; font-size: 0.7rem;">Spec: ${escapePfcHtml(m.specCode)}</span>` : ''}
            </div>
            <div style="margin-top: 0.3rem; font-size: 0.775rem; color: #94a3b8; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <span style="color: #38bdf8; font-weight: 700;">
                📅 Bắt đầu SX: <strong>${m.firstProdDate ? formatPfcDate(m.firstProdDate) : '22/09/2025'}</strong>
              </span>
              <span>•</span>
              ${m.firstDeficitDate ? `
                <span style="color: #fca5a5; font-weight: 700;">
                  🚨 Ngày bắt đầu phát sinh âm: <strong>${formatPfcDate(m.firstDeficitDate)} (${getPfcDayOfWeek(m.firstDeficitDate)})</strong> (${m.firstDeficitGap > 0 ? '+' : ''}${m.firstDeficitGap.toLocaleString('vi-VN')} pcs)
                </span>
              ` : `<span style="color: #34d399;">✓ Không phát sinh ngày nào bị âm</span>`}
              ${m.firstCumDeficitDate && m.firstCumDeficitDate !== m.firstDeficitDate ? `
                <span>•</span>
                <span style="color: #f87171; font-weight: 700;">
                  📉 Lũy kế chuyển sang âm từ: <strong>${formatPfcDate(m.firstCumDeficitDate)}</strong> (${m.firstCumDeficitAmount.toLocaleString('vi-VN')} pcs)
                </span>
              ` : ''}
              ${m.hasPriorDeficit ? `
                <span>•</span>
                <span style="color: #fbbf24; font-weight: 700;">
                  ⚠️ Tuần trước đẩy sang: <strong>-${Math.abs(m.priorGap).toLocaleString('vi-VN')}</strong> pcs
                </span>
              ` : ''}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <!-- Chuyển chế độ xem -->
            <div style="display: flex; align-items: center; gap: 0.25rem; background: rgba(15, 23, 42, 0.6); padding: 0.18rem 0.35rem; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <button type="button" class="btn btn-xs ${!isAllMode ? 'btn-primary' : 'btn-secondary'}"
                onclick="window.handleTogglePfcTimelineMode('${escapePfcAttr(m.modelKey)}', 'ACTIVE')"
                style="font-size: 0.68rem; padding: 0.18rem 0.45rem; font-weight: 700;">
                🎯 Chỉ ngày có SX / Gap (${activeCount} ngày)
              </button>
              <button type="button" class="btn btn-xs ${isAllMode ? 'btn-primary' : 'btn-secondary'}"
                onclick="window.handleTogglePfcTimelineMode('${escapePfcAttr(m.modelKey)}', 'ALL')"
                style="font-size: 0.68rem; padding: 0.18rem 0.45rem; font-weight: 700;">
                📅 Toàn bộ ${m.dailyTimeline.length} ngày (từ 22/09/2025)
              </button>
            </div>

            <button type="button" class="btn btn-xs btn-primary"
              onclick="window.handleCopySingleModelTimelineGoogleSheet('${escapePfcAttr(m.modelKey)}')"
              style="font-size: 0.72rem; padding: 0.3rem 0.7rem; font-weight: 800;">
              📋 Copy Cho Google Sheet
            </button>
            <button type="button" class="btn btn-xs btn-secondary"
              onclick="window.openPlanFactCheckShiftModal(decodeURIComponent('${encModel}'), decodeURIComponent('${encStage}'), decodeURIComponent('${encSpec}'))"
              style="font-size: 0.72rem; padding: 0.3rem 0.6rem; font-weight: 700;">
              🔍 Xem Modal Chi Tiết
            </button>
            <button type="button" class="btn btn-xs btn-secondary"
              onclick="window.handleToggleModelDailyTimeline('${escapePfcAttr(m.modelKey)}')"
              style="font-size: 0.72rem; padding: 0.3rem 0.6rem;">
              ✕ Đóng
            </button>
          </div>
        </div>

        <!-- Bảng chi tiết từng ngày -->
        <div style="max-height: 480px; overflow-y: auto; overflow-x: auto; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;">
          <table class="datamass-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.775rem;">
            <thead>
              <tr style="position: sticky; top: 0; z-index: 10; background: #1e293b;">
                <th style="width: 40px; text-align: center;">STT</th>
                <th style="width: 110px; text-align: center;">Ngày SX</th>
                <th style="width: 80px; text-align: center;">Thứ</th>
                <th style="width: 95px; text-align: right; color: #60a5fa;">KH (Plan)</th>
                <th style="width: 95px; text-align: right; color: #34d399;">TT (Fact)</th>
                <th style="width: 110px; text-align: right; color: #f87171;">Gap Ngày</th>
                <th style="width: 125px; text-align: right; color: #fbbf24; background: rgba(245, 158, 11, 0.1);">GAP LŨY KẾ</th>
                <th style="min-width: 180px; text-align: left;">Diễn Biến &amp; Đánh Giá</th>
                <th style="min-width: 240px; text-align: left;">Ca &amp; Line Sản Xuất Trong Ngày (Mass-History)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="position: sticky; bottom: 0; z-index: 10; background: rgba(15, 23, 42, 0.98); font-weight: 800; border-top: 2px solid #3b82f6;">
                <td colspan="3" style="text-align: right; padding: 0.5rem 0.75rem; color: #f8fafc;">TỔNG KỲ SẢN XUẤT (TỪ 22/09/2025):</td>
                <td class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.85rem;">${m.allTimePlanTotal.toLocaleString('vi-VN')}</td>
                <td class="font-mono" style="text-align: right; color: #34d399; font-size: 0.85rem;">${m.allTimeFactTotal.toLocaleString('vi-VN')}</td>
                <td class="font-mono" style="text-align: right; color: ${m.allTimeTotalGap < 0 ? '#f87171' : (m.allTimeTotalGap > 0 ? '#34d399' : '#94a3b8')}; font-size: 0.875rem;">
                  ${m.allTimeTotalGap > 0 ? '+' : ''}${m.allTimeTotalGap.toLocaleString('vi-VN')}
                </td>
                <td class="font-mono font-bold" style="text-align: right; color: ${m.allTimeTotalGap < 0 ? '#f87171' : (m.allTimeTotalGap > 0 ? '#34d399' : '#94a3b8')}; font-size: 0.9rem; background: rgba(245, 158, 11, 0.1);">
                  ${m.allTimeTotalGap > 0 ? '+' : ''}${m.allTimeTotalGap.toLocaleString('vi-VN')}
                </td>
                <td colspan="2" style="padding: 0.5rem 0.75rem; font-size: 0.775rem;">
                  <span style="color: ${m.allTimeTotalGap < 0 ? '#fca5a5' : '#6ee7b7'}; font-weight: 700;">
                    ${m.allTimeTotalGap < 0 ? `⚠️ Tổng thiếu hụt lũy kế: ${m.allTimeTotalGap.toLocaleString('vi-VN')} pcs` : `✓ Lũy kế cân bằng / đạt kế hoạch`}
                  </span>
                  ${m.gapTotal !== m.allTimeTotalGap ? `
                    <span style="color: #94a3b8; margin-left: 0.5rem; font-size: 0.72rem;">(Kỳ chọn: ${m.gapTotal > 0 ? '+' : ''}${m.gapTotal.toLocaleString('vi-VN')} pcs)</span>
                  ` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }


  /**
   * Render cột Đánh Giá (Tiến độ & Trạng thái)
   */
  function renderPfcEvaluationCellHtml(m) {
    let badgeHtml = '';
    let subHtml = '';

    if (m.gapTotal < 0) {
      badgeHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.6rem;">⚠️ Thiếu ${Math.abs(m.gapTotal).toLocaleString('vi-VN')}</span>`;
      if (m.shiftsWithReasonsCount > 0) {
        subHtml = `
          <div style="font-size: 0.675rem; color: #38bdf8; font-weight: 800; margin-top: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
            <span>✓ Đã giải trình</span>
            <span style="background: rgba(56, 189, 248, 0.2); padding: 0.05rem 0.35rem; border-radius: 9999px;">${m.shiftsWithReasonsCount}</span>
          </div>
        `;
      } else {
        subHtml = `<div style="font-size: 0.675rem; color: #fbbf24; font-weight: 800; margin-top: 0.25rem;">⚡ Cần giải trình</div>`;
      }
    } else if (m.gapTotal > 0) {
      badgeHtml = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.6rem;">✅ Vượt +${m.gapTotal.toLocaleString('vi-VN')}</span>`;
      subHtml = `<div style="font-size: 0.675rem; color: #34d399; font-weight: 700; margin-top: 0.25rem;">Vượt tiến độ</div>`;
    } else {
      if (m.planTotal > 0) {
        badgeHtml = `<span class="badge" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.6rem;">✓ Đạt 100%</span>`;
        subHtml = `<div style="font-size: 0.675rem; color: #60a5fa; font-weight: 700; margin-top: 0.25rem;">Cân bằng kế hoạch</div>`;
      } else {
        badgeHtml = `<span class="badge" style="background: rgba(148, 163, 184, 0.12); color: #94a3b8; font-size: 0.72rem;">Chưa triển khai</span>`;
        subHtml = `<div style="font-size: 0.675rem; color: #64748b; margin-top: 0.25rem;">Không có plan</div>`;
      }
    }

    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
        ${badgeHtml}
        ${subHtml}
      </div>
    `;
  }

  /**
   * Main render function cho phân hệ Check Tổng Thể Plan / Fact
   */
  window.renderPlanFactCheckView = function(containerId = 'planFactCheckContainer') {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    const store = window.PlanFactCheckStore;
    const { models, logs, activeDates, stages, groups, kpi } = collectPlanFactCheckData();

    const isSummaryView = store.activeViewMode === 'MODEL_SUMMARY';
    const datesCount = activeDates.length;
    const fromFormatted = formatPfcDate(store.fromDate);
    const toFormatted = formatPfcDate(store.toDate);

    // Phân trang
    const pageIndex = store.pageIndex || 0;
    const pageSize = store.pageSize || 25;
    const targetList = isSummaryView ? models : logs;
    const totalRecords = targetList.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePageIndex = Math.min(pageIndex, totalPages - 1);
    const pagedItems = targetList.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
    const startIdx = safePageIndex * pageSize;

    // Render bảng Chế độ 1: Tổng Hợp Theo Model
    let table1RowsHtml = '';
    if (isSummaryView) {
      if (pagedItems.length === 0) {
        table1RowsHtml = `
          <tr>
            <td colspan="11" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted, #94a3b8);">
              <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">🔍</div>
              <strong style="font-size: 1rem; color: var(--text-primary, #f8fafc);">Không tìm thấy Model nào phù hợp với bộ lọc hiện tại.</strong>
              <div style="margin-top: 0.4rem; font-size: 0.8rem;">Thử chuyển bộ lọc Chênh Lệch sang <strong>"Tất cả (Bao gồm cả >0 và <0)"</strong> hoặc chọn khoảng ngày khác.</div>
            </td>
          </tr>
        `;
      } else {
        table1RowsHtml = pagedItems.map((m, idx) => {
          const rowNum = startIdx + idx + 1;
          const stg = getPfcStageStyle(m.stage);
          const gapColor = m.gapTotal < 0 ? '#f87171' : (m.gapTotal > 0 ? '#34d399' : 'var(--text-muted, #94a3b8)');
          const gapSign = m.gapTotal > 0 ? '+' : '';
          const gapStr = m.gapTotal !== 0 ? `${gapSign}${m.gapTotal.toLocaleString('vi-VN')}` : '0';
          const encModel = encodeURIComponent(m.productName1C);
          const encStage = encodeURIComponent(m.stage);
          const encSpec = encodeURIComponent(m.specCode);

          return `
            <tr class="hover-row">
              <td style="text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.75rem; font-weight: 700;">${rowNum}</td>
              <td style="text-align: center; white-space: nowrap;">
                <span class="badge" style="background: ${stg.bg}; border: 1px solid ${stg.border}; color: ${stg.color}; font-weight: 800; font-size: 0.725rem; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>${stg.icon}</span><span>${escapePfcHtml(m.stage)}</span>
                </span>
              </td>
              <td style="white-space: nowrap; font-weight: 800; color: var(--text-primary, #f8fafc); font-size: 0.85rem;">
                ${escapePfcHtml(m.groupModel || '—')}
              </td>
              <td style="min-width: 260px; max-width: 380px;">
                <div class="font-mono font-bold" style="font-size: 0.775rem; color: #93c5fd; word-break: break-all; line-height: 1.45;">
                  ${escapePfcHtml(m.productName1C)}
                </div>
                ${m.specCode ? `<div style="font-size: 0.675rem; color: #38bdf8; margin-top: 0.1rem;">Spec: ${escapePfcHtml(m.specCode.replace(/^0+/, '') || m.specCode)}</div>` : ''}
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 800; color: #60a5fa; font-size: 0.875rem;">
                ${m.planTotal.toLocaleString('vi-VN')}
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.875rem;">
                ${m.factTotal.toLocaleString('vi-VN')}
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 900; color: ${gapColor}; font-size: 0.9rem;">
                ${gapStr}
              </td>
              <td style="vertical-align: middle; padding: 0.4rem 0.65rem; min-width: 175px;">
                ${renderPfcStartGapCellHtml(m)}
              </td>
              <td style="vertical-align: middle; padding: 0.4rem 0.65rem;">
                ${renderPfcModelReasonsCellHtml(m)}
              </td>
              <td style="text-align: center; vertical-align: middle; padding: 0.4rem 0.5rem;">
                ${renderPfcEvaluationCellHtml(m)}
              </td>
              <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn btn-xs btn-primary"
                  onclick="window.openPlanFactCheckShiftModal(decodeURIComponent('${encModel}'), decodeURIComponent('${encStage}'), decodeURIComponent('${encSpec}'))"
                  style="font-size: 0.7rem; padding: 0.22rem 0.55rem; font-weight: 700;"
                  title="Xem toàn bộ lịch sử ca của Model này">
                  🔍 Chi Tiết Ca
                </button>
              </td>
            </tr>
            ${Boolean(window.PlanFactCheckStore.expandedTimelineKeys[m.modelKey]) ? `
              <tr class="pfc-timeline-drawer-row">
                <td colspan="11" style="background: rgba(15, 23, 42, 0.95); padding: 0.9rem 1.15rem; border-top: 1px solid rgba(56, 189, 248, 0.4); border-bottom: 2px solid #3b82f6;">
                  ${renderPfcModelTimelineDrawerHtml(m, datesCount)}
                </td>
              </tr>
            ` : ''}
          `;
        }).join('');
      }
    }

    // Render bảng Chế độ 2: Chi Tiết Từng Ngày & Ca (Shift Log View)
    let table2RowsHtml = '';
    if (!isSummaryView) {
      if (pagedItems.length === 0) {
        table2RowsHtml = `
          <tr>
            <td colspan="11" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted, #94a3b8);">
              <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">📋</div>
              <strong style="font-size: 1rem; color: var(--text-primary, #f8fafc);">Không tìm thấy bản ghi ca sản xuất nào khớp bộ lọc.</strong>
            </td>
          </tr>
        `;
      } else {
        table2RowsHtml = pagedItems.map((log, idx) => {
          const rowNum = startIdx + idx + 1;
          const stg = getPfcStageStyle(log.workcell || log.process);
          const gapVal = log._gapVal;
          const gapColor = gapVal < 0 ? '#f87171' : (gapVal > 0 ? '#34d399' : 'var(--text-muted, #94a3b8)');
          const gapSign = gapVal > 0 ? '+' : '';
          const shiftBadge = log._shiftNorm === 'day' ?
            `<span class="badge" style="background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 800; font-size: 0.7rem;">☀️ Ngày</span>` :
            `<span class="badge" style="background: rgba(168, 85, 247, 0.16); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 800; font-size: 0.7rem;">🌙 Đêm</span>`;

          return `
            <tr class="hover-row">
              <td style="text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.75rem;">${rowNum}</td>
              <td class="font-mono font-bold" style="text-align: center; white-space: nowrap; color: var(--text-primary, #f8fafc); font-size: 0.785rem;">
                ${formatPfcDate(log.date || log.rawDate)}
              </td>
              <td style="text-align: center; white-space: nowrap;">${shiftBadge}</td>
              <td style="text-align: center; white-space: nowrap;">
                <span class="badge" style="background: ${stg.bg}; border: 1px solid ${stg.border}; color: ${stg.color}; font-weight: 800; font-size: 0.72rem;">
                  ${stg.icon} ${escapePfcHtml(log.workcell || log.process || '—')}
                </span>
              </td>
              <td style="text-align: center; white-space: nowrap; font-weight: 800; color: #38bdf8; font-size: 0.785rem;">
                ${escapePfcHtml(log.line || '—')}
              </td>
              <td style="min-width: 250px;">
                <div class="font-mono font-bold" style="font-size: 0.775rem; color: #93c5fd; word-break: break-all;">
                  ${escapePfcHtml(log.model || '—')}
                </div>
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 800; color: #60a5fa; font-size: 0.825rem;">
                ${Math.round(log._planVal).toLocaleString('vi-VN')}
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 800; color: #34d399; font-size: 0.825rem;">
                ${Math.round(log._factVal).toLocaleString('vi-VN')}
              </td>
              <td class="font-mono" style="text-align: right; font-weight: 900; color: ${gapColor}; font-size: 0.85rem;">
                ${gapSign}${Math.round(gapVal).toLocaleString('vi-VN')}
              </td>
              <td style="font-size: 0.75rem; color: var(--text-primary, #f1f5f9); line-height: 1.4; min-width: 220px; max-width: 360px;">
                ${log.reason ? `⚠️ <b>${escapePfcHtml(log.reason)}</b>` : '<span style="color: var(--text-muted, #64748b); font-style: italic;">Chưa ghi nhận nguyên nhân</span>'}
              </td>
              <td style="font-size: 0.72rem; color: #fbbf24; min-width: 140px;">
                ${escapePfcHtml(log.qualityIssue || log.correctiveAction || '—')}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Modal popup chi tiết ca của 1 Model
    let modalHtml = '';
    if (store.modalModelData) {
      const md = store.modalModelData;
      const stg = getPfcStageStyle(md.stage);
      const encMdModel = encodeURIComponent(md.productName1C);
      modalHtml = `
        <div id="pfcShiftModal" class="pfc-modal-overlay" onclick="if(event.target === this) window.closePlanFactCheckShiftModal()">
          <div class="pfc-modal-card">
            <div class="pfc-modal-header">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="badge" style="background: ${stg.bg}; border: 1px solid ${stg.border}; color: ${stg.color}; font-weight: 800; font-size: 0.775rem;">
                  ${stg.icon} ${escapePfcHtml(md.stage)}
                </span>
                <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary, #f8fafc);">
                  ${escapePfcHtml(md.productName1C)}
                </span>
                ${md.specCode ? `<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.72rem;">Spec: ${escapePfcHtml(md.specCode)}</span>` : ''}
              </div>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.closePlanFactCheckShiftModal()" style="padding: 0.25rem 0.6rem; font-weight: 800;">
                ✕ Đóng
              </button>
            </div>

            <div class="pfc-modal-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.6rem; margin-bottom: 0.85rem;">
                <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">TỔNG KH (TỪ 22/09)</div>
                  <div class="font-mono font-bold" style="font-size: 1.05rem; color: #60a5fa; margin-top: 0.15rem;">${(md.allTimePlanTotal || md.planTotal).toLocaleString('vi-VN')} pcs</div>
                </div>
                <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">TỔNG TT (TỪ 22/09)</div>
                  <div class="font-mono font-bold" style="font-size: 1.05rem; color: #34d399; margin-top: 0.15rem;">${(md.allTimeFactTotal || md.factTotal).toLocaleString('vi-VN')} pcs</div>
                </div>
                <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">CHÊNH LỆCH LŨY KẾ</div>
                  <div class="font-mono font-bold" style="font-size: 1.05rem; color: ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) < 0 ? '#f87171' : ((md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '#34d399' : '#94a3b8')}; margin-top: 0.15rem;">
                    ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '+' : ''}${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal).toLocaleString('vi-VN')} pcs
                  </div>
                </div>
                <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">GAP KỲ CHỌN</div>
                  <div class="font-mono font-bold" style="font-size: 1.05rem; color: ${md.gapTotal < 0 ? '#f87171' : (md.gapTotal > 0 ? '#34d399' : '#94a3b8')}; margin-top: 0.15rem;">
                    ${md.gapTotal > 0 ? '+' : ''}${md.gapTotal.toLocaleString('vi-VN')} pcs
                  </div>
                </div>
                <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px;">
                  <div style="font-size: 0.68rem; color: #94a3b8; font-weight: 700;">BẮT ĐẦU ÂM (DATA_MASS)</div>
                  <div class="font-mono font-bold" style="font-size: 0.95rem; color: ${md.firstDeficitDate ? '#f87171' : '#34d399'}; margin-top: 0.15rem;">
                    ${md.firstDeficitDate ? `${formatPfcDateShort(md.firstDeficitDate)} (${md.firstDeficitGap})` : 'Không âm'}
                  </div>
                </div>
                ${md.hasPriorDeficit ? `
                  <div class="card-glass" style="padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 0.68rem; color: #fbbf24; font-weight: 700;">TỒN TRƯỚC KỲ CHỌN</div>
                    <div class="font-mono font-bold" style="font-size: 1.05rem; color: #fbbf24; margin-top: 0.15rem;">-${Math.abs(md.priorGap).toLocaleString('vi-VN')} pcs</div>
                  </div>
                ` : ''}
              </div>

              <!-- Thanh chuyển đổi Tab trong Modal: Tiến trình Lũy Kế Ngày vs Danh Sách Ca -->
              <div class="pfc-subtab-bar" style="margin-bottom: 0.85rem;">
                <button type="button" class="pfc-subtab-btn ${store.modalActiveTab !== 'SHIFTS' ? 'active' : ''}"
                  onclick="window.handlePlanFactCheckModalTab('TIMELINE')">
                  📈 1. Tiến Trình Lũy Kế Theo Ngày (Data_Mass — ${(md.activeDailyTimeline && md.activeDailyTimeline.length) || md.dailyTimeline.length} ngày SX)
                </button>
                <button type="button" class="pfc-subtab-btn ${store.modalActiveTab === 'SHIFTS' ? 'active' : ''}"
                  onclick="window.handlePlanFactCheckModalTab('SHIFTS')">
                  📋 2. Chi Tiết Lịch Sử Ca Sản Xuất (Mass-History — ${md.shifts.length} ca)
                </button>
              </div>

              ${store.modalActiveTab !== 'SHIFTS' ? `
                <!-- TAB 1: BẢNG TIẾN TRÌNH LŨY KẾ THEO NGÀY (DATA_MASS) -->
                <div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-size: 0.8rem; font-weight: 800; color: #38bdf8;">
                    📈 DIỄN BIẾN LŨY KẾ TỪNG NGÀY TRONG KỲ (${fromFormatted} ➜ ${toFormatted})
                  </span>
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                    <!-- Chuyển chế độ xem -->
                    <div style="display: flex; align-items: center; gap: 0.2rem; background: rgba(15, 23, 42, 0.6); padding: 0.15rem 0.3rem; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);">
                      <button type="button" class="btn btn-xs ${!((store.modelTimelineMode && store.modelTimelineMode[md.modelKey]) === 'ALL') ? 'btn-primary' : 'btn-secondary'}"
                        onclick="window.handleTogglePfcTimelineMode('${escapePfcAttr(md.modelKey)}', 'ACTIVE')"
                        style="font-size: 0.68rem; padding: 0.15rem 0.4rem; font-weight: 700;">
                        🎯 Chỉ ngày có SX (${(md.activeDailyTimeline && md.activeDailyTimeline.length) || 0} ngày)
                      </button>
                      <button type="button" class="btn btn-xs ${((store.modelTimelineMode && store.modelTimelineMode[md.modelKey]) === 'ALL') ? 'btn-primary' : 'btn-secondary'}"
                        onclick="window.handleTogglePfcTimelineMode('${escapePfcAttr(md.modelKey)}', 'ALL')"
                        style="font-size: 0.68rem; padding: 0.15rem 0.4rem; font-weight: 700;">
                        📅 Toàn bộ ${md.dailyTimeline.length} ngày (từ 22/09/2025)
                      </button>
                    </div>

                    <button type="button" class="btn btn-xs btn-primary"
                      onclick="window.handleCopySingleModelTimelineGoogleSheet('${escapePfcAttr(md.modelKey)}')"
                      style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">
                      📋 Copy Bảng Này Cho Google Sheet
                    </button>
                  </div>
                </div>

                <div style="max-height: 440px; overflow-y: auto; border: 1px solid var(--border-glass, #334155); border-radius: 8px;">
                  <table class="datamass-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.785rem;">
                    <thead>
                      <tr style="position: sticky; top: 0; z-index: 10; background: rgba(30, 41, 59, 0.98);">
                        <th style="width: 40px; text-align: center;">STT</th>
                        <th style="width: 105px; text-align: center;">Ngày SX</th>
                        <th style="width: 75px; text-align: center;">Thứ</th>
                        <th style="width: 85px; text-align: right; color: #60a5fa;">KH (Plan)</th>
                        <th style="width: 85px; text-align: right; color: #34d399;">TT (Fact)</th>
                        <th style="width: 95px; text-align: right; color: #f87171;">Gap Ngày</th>
                        <th style="width: 110px; text-align: right; color: #fbbf24; background: rgba(245, 158, 11, 0.1);">GAP LŨY KẾ</th>
                        <th style="min-width: 170px; text-align: left;">Diễn Biến &amp; Trạng Thái</th>
                        <th style="min-width: 200px; text-align: left;">Ca &amp; Line Trong Ngày (Mass-History)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(((store.modelTimelineMode && store.modelTimelineMode[md.modelKey]) === 'ALL') ? md.dailyTimeline : ((md.activeDailyTimeline && md.activeDailyTimeline.length > 0) ? md.activeDailyTimeline : md.dailyTimeline)).map((t, tIdx) => {
                        const isNeg = t.gap < 0;
                        const isPos = t.gap > 0;
                        const isZero = t.gap === 0;
                        const gapColor = isNeg ? '#f87171' : (isPos ? '#34d399' : '#94a3b8');
                        const gapSign = isPos ? '+' : '';
                        const gapText = isZero ? '0' : `${gapSign}${t.gap.toLocaleString('vi-VN')}`;
                        const cumColor = t.cumGap < 0 ? '#f87171' : (t.cumGap > 0 ? '#34d399' : '#94a3b8');
                        const cumSign = t.cumGap > 0 ? '+' : '';
                        const cumText = t.cumGap === 0 ? '0' : `${cumSign}${t.cumGap.toLocaleString('vi-VN')}`;

                        let statusDesc = '✓ Đúng kế hoạch';
                        if (t.dateIso === md.firstDeficitDate) {
                          statusDesc = `<span class="badge" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-weight: 800; font-size: 0.72rem;">🚨 Bắt đầu thiếu hụt (${gapText})</span>`;
                        } else if (t.dateIso === md.firstCumDeficitDate && md.firstCumDeficitDate !== md.firstDeficitDate) {
                          statusDesc = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); border: 1px dashed #ef4444; color: #fca5a5; font-weight: 800; font-size: 0.72rem;">📉 Lũy kế chuyển sang âm (${cumText})</span>`;
                        } else if (isNeg) {
                          statusDesc = `<span style="color: #f87171; font-weight: 700;">📉 Thiếu ${Math.abs(t.gap).toLocaleString('vi-VN')} pcs</span>`;
                        } else if (isPos) {
                          statusDesc = t.cumGap < 0 ?
                            `<span style="color: #34d399; font-weight: 700;">📈 Chạy bù +${t.gap.toLocaleString('vi-VN')}</span>` :
                            `<span style="color: #34d399; font-weight: 700;">🟢 Vượt +${t.gap.toLocaleString('vi-VN')} pcs</span>`;
                        } else if (t.plan === 0 && t.fact === 0) {
                          statusDesc = `<span style="color: #64748b;">— Không có plan</span>`;
                        }

                        let shiftsText = '—';
                        if (t.shifts && t.shifts.length > 0) {
                          shiftsText = t.shifts.map(s => {
                            const shIcon = s._shiftNorm === 'day' ? '☀️ Ngày' : '🌙 Đêm';
                            const sGapColor = s._gapVal < 0 ? '#f87171' : (s._gapVal > 0 ? '#34d399' : '#94a3b8');
                            const sGapSign = s._gapVal > 0 ? '+' : '';
                            return `<div><strong>[${escapePfcHtml(s.line || 'Line')}] ${shIcon}:</strong> <span class="font-mono font-bold" style="color: ${sGapColor};">(${sGapSign}${Math.round(s._gapVal).toLocaleString('vi-VN')})</span>${s.reason ? ` — ${escapePfcHtml(s.reason)}` : ''}</div>`;
                          }).join('');
                        }

                        return `
                          <tr class="hover-row">
                            <td style="text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.725rem;">${tIdx + 1}</td>
                            <td class="font-mono font-bold" style="text-align: center; white-space: nowrap; font-size: 0.775rem;">${t.dateFormatted}</td>
                            <td style="text-align: center; font-size: 0.75rem; font-weight: 700; color: #94a3b8;">${t.dayOfWeek}</td>
                            <td class="font-mono" style="text-align: right; color: #60a5fa; font-weight: 800;">${t.plan.toLocaleString('vi-VN')}</td>
                            <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800;">${t.fact.toLocaleString('vi-VN')}</td>
                            <td class="font-mono font-bold" style="text-align: right; color: ${gapColor};">${gapText}</td>
                            <td class="font-mono font-bold" style="text-align: right; color: ${cumColor}; background: rgba(255, 255, 255, 0.03);">${cumText}</td>
                            <td style="vertical-align: middle;">${statusDesc}</td>
                            <td style="vertical-align: middle; font-size: 0.72rem;">${shiftsText}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="position: sticky; bottom: 0; z-index: 10; background: rgba(15, 23, 42, 0.98); font-weight: 800; border-top: 2px solid #3b82f6;">
                        <td colspan="3" style="text-align: right; padding: 0.5rem 0.75rem;">TỔNG KỲ SẢN XUẤT (TỪ 22/09/2025):</td>
                        <td class="font-mono" style="text-align: right; color: #60a5fa;">${(md.allTimePlanTotal || md.planTotal).toLocaleString('vi-VN')}</td>
                        <td class="font-mono" style="text-align: right; color: #34d399;">${(md.allTimeFactTotal || md.factTotal).toLocaleString('vi-VN')}</td>
                        <td class="font-mono" style="text-align: right; color: ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) < 0 ? '#f87171' : ((md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '#34d399' : '#94a3b8')};">
                          ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '+' : ''}${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal).toLocaleString('vi-VN')}
                        </td>
                        <td class="font-mono font-bold" style="text-align: right; color: ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) < 0 ? '#f87171' : ((md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '#34d399' : '#94a3b8')}; background: rgba(245, 158, 11, 0.1);">
                          ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) > 0 ? '+' : ''}${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal).toLocaleString('vi-VN')}
                        </td>
                        <td colspan="2" style="padding: 0.5rem 0.75rem; font-size: 0.775rem;">
                          <span style="color: ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) < 0 ? '#fca5a5' : '#6ee7b7'}; font-weight: 700;">
                            ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal) < 0 ? `⚠️ Tổng thiếu hụt lũy kế: ${(md.allTimeTotalGap !== undefined ? md.allTimeTotalGap : md.gapTotal).toLocaleString('vi-VN')} pcs` : `✓ Lũy kế cân bằng / đạt kế hoạch`}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ` : `
                <!-- TAB 2: BẢNG LỊCH SỬ TỪNG CA (MASS-HISTORY) -->

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="font-size: 0.8rem; font-weight: 800; color: #38bdf8;">
                  📋 BẢNG LỊCH SỬ TỪNG CA (KỲ ${fromFormatted} ➜ ${toFormatted})
                </span>
                <button type="button" class="btn btn-xs btn-primary" onclick="window.handleCopyModelShiftModalGoogleSheet()" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">
                  📋 Copy Bảng Này Cho Google Sheet
                </button>
              </div>

              <div style="max-height: 420px; overflow-y: auto; border: 1px solid var(--border-glass, #334155); border-radius: 8px;">
                <table class="datamass-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.785rem;">
                  <thead>
                    <tr>
                      <th style="width: 45px; text-align: center;">STT</th>
                      <th style="width: 95px; text-align: center;">Ngày Làm</th>
                      <th style="width: 80px; text-align: center;">Ca</th>
                      <th style="width: 90px; text-align: center;">Line SX</th>
                      <th style="width: 85px; text-align: right; color: #60a5fa;">KH (Plan)</th>
                      <th style="width: 85px; text-align: right; color: #34d399;">TT (Fact)</th>
                      <th style="width: 90px; text-align: right; color: #f87171;">Chênh Lệch</th>
                      <th style="text-align: left; min-width: 240px;">Nguyên Nhân Cụ Thể (Mass-History)</th>
                      <th style="text-align: left; width: 140px;">Chất Lượng / Khắc Phục</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${md.shifts.length === 0 ? `
                      <tr>
                        <td colspan="9" style="text-align: center; padding: 2rem; color: #94a3b8;">
                          Không có bản ghi ca chi tiết nào trong Sheet Mass-History cho Model này trong khoảng ngày đang lọc.
                        </td>
                      </tr>
                    ` : md.shifts.map((s, sIdx) => {
                      const isNeg = s._gapVal < 0;
                      const isPos = s._gapVal > 0;
                      const sGapColor = isNeg ? '#f87171' : (isPos ? '#34d399' : '#94a3b8');
                      const sGapSign = isPos ? '+' : '';
                      const shiftBadge = s._shiftNorm === 'day' ?
                        `<span class="badge" style="background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 800; font-size: 0.7rem;">☀️ Ngày</span>` :
                        `<span class="badge" style="background: rgba(168, 85, 247, 0.16); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-weight: 800; font-size: 0.7rem;">🌙 Đêm</span>`;

                      return `
                        <tr class="hover-row">
                          <td style="text-align: center; color: #94a3b8;">${sIdx + 1}</td>
                          <td class="font-mono font-bold" style="text-align: center;">${formatPfcDate(s.date || s.rawDate)}</td>
                          <td style="text-align: center;">${shiftBadge}</td>
                          <td style="text-align: center; font-weight: 800; color: #38bdf8;">${escapePfcHtml(s.line || '—')}</td>
                          <td class="font-mono" style="text-align: right; color: #60a5fa; font-weight: 800;">${Math.round(s._planVal).toLocaleString('vi-VN')}</td>
                          <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800;">${Math.round(s._factVal).toLocaleString('vi-VN')}</td>
                          <td class="font-mono" style="text-align: right; font-weight: 900; color: ${sGapColor};">
                            ${sGapSign}${Math.round(s._gapVal).toLocaleString('vi-VN')}
                          </td>
                          <td style="color: var(--text-primary, #f1f5f9); line-height: 1.4;">
                            ${s.reason ? `⚠️ <b>${escapePfcHtml(s.reason)}</b>` : '<span style="color: #64748b; font-style: italic;">Chưa có ghi chú lý do</span>'}
                          </td>
                          <td style="color: #fbbf24; font-size: 0.72rem;">
                            ${escapePfcHtml(s.qualityIssue || s.correctiveAction || '—')}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
              `}
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="pfc-container" style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0.25rem 2rem 0.25rem;">

        <!-- 1. HEADER BANNER & VIEW SWITCHER -->
        <div class="card-glass" style="padding: 1rem 1.25rem; border-radius: var(--radius-md); border-left: 4px solid #10b981;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 1.4rem;">📋</span>
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-primary, #f8fafc); letter-spacing: -0.01em;">
                  CHECK TỔNG THỂ PLAN / FACT (TRUY VẾT ÂM / DƯƠNG THEO NGÀY &amp; CA)
                </h2>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 0.7rem; font-weight: 800;">
                  Data_Mass &amp; Mass-History
                </span>
              </div>
            </div>

            <!-- Nút thao tác nhanh -->
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-primary" onclick="window.handleCopyPlanFactCheckGoogleSheet()"
                style="font-size: 0.775rem; padding: 0.4rem 0.85rem; font-weight: 800;">
                📋 Copy cho Google Sheet
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.handleExportPlanFactCheckCsv()"
                style="font-size: 0.775rem; padding: 0.4rem 0.85rem; font-weight: 700;">
                📊 Xuất File CSV
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.handleResetPlanFactCheckFilters()"
                style="font-size: 0.775rem; padding: 0.4rem 0.75rem;">
                ↺ Đặt lại bộ lọc
              </button>
            </div>
          </div>

          <!-- Thanh chuyển chế độ xem (Subtab switcher) -->
          <div class="pfc-subtab-bar" style="margin-top: 0.9rem; display: flex; align-items: center; gap: 0.5rem; border-top: 1px solid var(--border-glass, rgba(255, 255, 255, 0.08)); padding-top: 0.75rem;">
            <button type="button" class="pfc-subtab-btn ${isSummaryView ? 'active' : ''}" onclick="window.handlePlanFactCheckViewMode('MODEL_SUMMARY')">
              📊 1. Tổng Hợp Theo Model (Kèm Chi Tiết Ca &amp; Nguyên Nhân)
            </button>
            <button type="button" class="pfc-subtab-btn ${!isSummaryView ? 'active' : ''}" onclick="window.handlePlanFactCheckViewMode('SHIFT_LOG')">
              📋 2. Chi Tiết Từng Ngày &amp; Ca (Nhật Ký Sản Xuất - ${logs.length.toLocaleString('vi-VN')} ca)
            </button>
          </div>
        </div>

        <!-- 2. DATE PICKER BAR -->
        <div class="card-glass" style="padding: 0.65rem 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <span style="font-size: 0.785rem; color: #38bdf8; font-weight: 800; display: flex; align-items: center; gap: 0.35rem;">
              <span>📅</span> KHOẢNG THỜI GIAN THEO DÕI:
            </span>
            <div style="display: flex; align-items: center; gap: 0.45rem; background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border-glass, #334155); padding: 0.25rem 0.65rem; border-radius: 8px;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Từ:</span>
              <input type="date" id="pfcFromDate" class="input-filter" value="${store.fromDate}"
                onchange="window.handlePlanFactCheckDateChange()" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Đến:</span>
              <input type="date" id="pfcToDate" class="input-filter" value="${store.toDate}"
                onchange="window.handlePlanFactCheckDateChange()" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.75rem; color: #94a3b8;">Đang hiển thị <strong>${targetList.length.toLocaleString('vi-VN')}</strong> ${isSummaryView ? 'Model' : 'Ca'}</span>
          </div>
        </div>

        <!-- 4. FILTER CONTROLS BAR -->
        <div class="card-glass" style="padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.65rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <!-- Công đoạn -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Công Đoạn:</span>
              <select class="select-filter font-bold" style="padding: 0.32rem 0.65rem; font-size: 0.775rem;"
                onchange="window.handlePlanFactCheckStageChange(this.value)">
                <option value="ALL" ${store.stageFilter === 'ALL' ? 'selected' : ''}>Tất cả Công Đoạn (${stages.length})</option>
                ${stages.map(st => `<option value="${st}" ${store.stageFilter === st ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>

            <!-- Chênh lệch (Gap): Hỗ trợ cả >0 và <0 đúng theo yêu cầu user -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Chênh Lệch:</span>
              <select class="select-filter font-bold" style="padding: 0.32rem 0.65rem; font-size: 0.775rem;"
                onchange="window.handlePlanFactCheckGapChange(this.value)">
                <option value="ALL" ${store.gapFilter === 'ALL' ? 'selected' : ''}>⚡ Tất cả (Bao gồm cả &gt;0 và &lt;0)</option>
                <option value="NEGATIVE" ${store.gapFilter === 'NEGATIVE' ? 'selected' : ''}>⚠️ Chỉ mã Thiếu Hụt (Gap &lt; 0)</option>
                <option value="POSITIVE" ${store.gapFilter === 'POSITIVE' ? 'selected' : ''}>🚀 Chỉ mã Vượt Kế Hoạch (Gap &gt; 0)</option>
                <option value="BALANCED" ${store.gapFilter === 'BALANCED' ? 'selected' : ''}>✅ Chỉ mã Cân Bằng (Gap = 0)</option>
              </select>
            </div>

            <!-- Group Model -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Group Model:</span>
              <select class="select-filter" style="padding: 0.32rem 0.65rem; font-size: 0.775rem; max-width: 200px;"
                onchange="window.handlePlanFactCheckGroupChange(this.value)">
                <option value="ALL" ${store.groupFilter === 'ALL' ? 'selected' : ''}>Tất cả Group Model (${groups.length})</option>
                ${groups.map(g => `<option value="${escapePfcHtml(g)}" ${store.groupFilter === g ? 'selected' : ''}>${escapePfcHtml(g)}</option>`).join('')}
              </select>
            </div>

            <!-- Ca làm việc -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Ca:</span>
              <select class="select-filter" style="padding: 0.32rem 0.65rem; font-size: 0.775rem;"
                onchange="window.handlePlanFactCheckShiftChange(this.value)">
                <option value="ALL" ${store.shiftFilter === 'ALL' ? 'selected' : ''}>Tất cả các ca</option>
                <option value="DAY" ${store.shiftFilter === 'DAY' ? 'selected' : ''}>☀️ Ca Ngày</option>
                <option value="NIGHT" ${store.shiftFilter === 'NIGHT' ? 'selected' : ''}>🌙 Ca Đêm</option>
              </select>
            </div>

            <!-- Giải trình / Lý do -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Giải Trình:</span>
              <select class="select-filter" style="padding: 0.32rem 0.65rem; font-size: 0.775rem;"
                onchange="window.handlePlanFactCheckReasonChange(this.value)">
                <option value="ALL" ${store.reasonFilter === 'ALL' ? 'selected' : ''}>Tất cả trạng thái</option>
                <option value="HAS_REASON" ${store.reasonFilter === 'HAS_REASON' ? 'selected' : ''}>✓ Đã có ghi chú lý do</option>
                <option value="NO_REASON" ${store.reasonFilter === 'NO_REASON' ? 'selected' : ''}>⚡ Chưa có ghi chú lý do</option>
              </select>
            </div>

            <!-- Sắp xếp -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">Sắp xếp:</span>
              <select class="select-filter font-bold" style="padding: 0.32rem 0.65rem; font-size: 0.775rem;"
                onchange="window.handlePlanFactCheckSortChange(this.value)">
                <option value="GAP_ASC" ${store.sortBy === 'GAP_ASC' ? 'selected' : ''}>🔴 Âm nhiều nhất lên đầu</option>
                <option value="GAP_DESC" ${store.sortBy === 'GAP_DESC' ? 'selected' : ''}>🟢 Dương nhiều nhất lên đầu</option>
                <option value="PLAN_DESC" ${store.sortBy === 'PLAN_DESC' ? 'selected' : ''}>📦 Kế hoạch lớn nhất</option>
                <option value="SHIFTS_DESC" ${store.sortBy === 'SHIFTS_DESC' ? 'selected' : ''}>📋 Nhiều ca phát sinh nhất</option>
                <option value="MODEL_ASC" ${store.sortBy === 'MODEL_ASC' ? 'selected' : ''}>🔤 Tên Model (A ➜ Z)</option>
              </select>
            </div>
          </div>

          <!-- Ô tìm kiếm tức thời -->
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="flex: 1; position: relative;">
              <input type="text" id="pfcSearchInput" class="input-filter" value="${escapePfcHtml(store.search)}"
                placeholder="🔍 Tìm nhanh theo Tên Model, mã 1C, Line (Assy 1B, 3D...), hoặc từ khóa lý do (Ramup, thiếu mạch, OSB, calib...)..."
                oninput="window.handlePlanFactCheckSearch(this.value)"
                style="width: 100%; padding: 0.45rem 0.85rem; font-size: 0.825rem; border-radius: 8px;">
            </div>
            ${store.search ? `
              <button type="button" class="btn btn-xs btn-secondary" onclick="window.handlePlanFactCheckSearch('')" style="padding: 0.45rem 0.65rem; font-size: 0.75rem;">
                ✕ Xóa tìm kiếm
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 5. BẢNG DỮ LIỆU CHÍNH -->
        <div class="card-glass" style="border-radius: var(--radius-md); border: 1px solid var(--border-glass, #334155); overflow: hidden;">
          <div class="table-container" style="max-height: 720px; overflow-y: auto; overflow-x: auto;">

            ${isSummaryView ? `
              <!-- CHẾ ĐỘ 1: BẢNG TỔNG HỢP THEO MODEL (ĐÚNG CONCEPT ẢNH 1) -->
              <table class="datamass-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">STT</th>
                    <th style="width: 120px; text-align: center;">CÔNG ĐOẠN</th>
                    <th style="min-width: 140px; text-align: left;">GROUP MODEL</th>
                    <th style="min-width: 270px; text-align: left;">MODEL (MÃ 1C)</th>
                    <th style="width: 125px; text-align: right; color: #60a5fa;">
                      KẾ HOẠCH (PLAN)<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #cbd5e1;">(${fromFormatted} ➜ ${toFormatted})</span>
                    </th>
                    <th style="width: 125px; text-align: right; color: #34d399;">
                      THỰC TẾ (FACT)<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #cbd5e1;">(${fromFormatted} ➜ ${toFormatted})</span>
                    </th>
                    <th style="width: 130px; text-align: right; color: #f87171;">
                      CHÊNH LỆCH (GAP)<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #cbd5e1;">(Kỳ đã chọn)</span>
                    </th>
                    <th style="min-width: 185px; max-width: 230px; text-align: left; background: rgba(245, 158, 11, 0.12); border-left: 1px solid rgba(245, 158, 11, 0.3);">
                      NGÀY BẮT ĐẦU GAP &amp; LŨY KẾ<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #fbbf24;">(Lịch sử từ 22/09/2025)</span>
                    </th>
                    <th style="min-width: 320px; max-width: 440px; text-align: left; background: rgba(239, 68, 68, 0.12); border-left: 2px solid #ef4444;">
                      NGUYÊN NHÂN ÂM (THEO CA &amp; NGÀY)<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #fca5a5;">(Cập nhật từ Sheet Mass-History)</span>
                    </th>
                    <th style="width: 145px; text-align: center; background: rgba(56, 189, 248, 0.12); border-left: 1px solid rgba(56, 189, 248, 0.3);">
                      ĐÁNH GIÁ<br>
                      <span style="font-size: 0.68rem; font-weight: 600; color: #7dd3fc;">(Tiến độ &amp; Trạng thái)</span>
                    </th>
                    <th style="width: 105px; text-align: center;">Thao Tác</th>
                  </tr>

                  <!-- HÀNG TỔNG CỘNG ĐÓNG BĂNG TRÊN ĐẦU BẢNG -->
                  <tr class="sticky-grand-total-row" style="position: sticky; top: 41px; z-index: 20; background: #0f172a; border-bottom: 2px solid #3b82f6;">
                    <th colspan="4" style="text-align: right; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 800; color: #f8fafc;">
                      TỔNG CỘNG (${models.length.toLocaleString('vi-VN')} MODEL KHỚP LỌC):
                    </th>
                    <th class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.95rem; font-weight: 900;">
                      ${kpi.totalPlan.toLocaleString('vi-VN')}
                    </th>
                    <th class="font-mono" style="text-align: right; color: #34d399; font-size: 0.95rem; font-weight: 900;">
                      ${kpi.totalFact.toLocaleString('vi-VN')}
                    </th>
                    <th class="font-mono" style="text-align: right; font-size: 0.95rem; font-weight: 900; color: ${kpi.totalGap < 0 ? '#f87171' : (kpi.totalGap > 0 ? '#34d399' : '#94a3b8')};">
                      ${kpi.totalGap > 0 ? '+' : ''}${kpi.totalGap.toLocaleString('vi-VN')}
                    </th>
                    <th style="text-align: left; font-size: 0.72rem; color: #fbbf24; padding: 0.45rem 0.65rem;">
                      📈 ${kpi.deficitModels} model có gap âm
                    </th>
                    <th style="text-align: left; font-size: 0.775rem; color: #94a3b8; padding: 0.45rem 0.75rem; font-weight: 700;">
                      ${kpi.deficitModels > 0 ?
                        `<span style="color: #fca5a5; font-weight: 800;">⚠️ ${kpi.deficitModels} Model thiếu hụt</span> (${kpi.explainedModels} đã có lý do)` :
                        `<span style="color: #34d399; font-weight: 800;">✅ Tất cả đạt tiến độ</span>`}
                    </th>
                    <th style="text-align: center;">
                      <span class="badge ${kpi.totalGap < 0 ? 'badge-red' : 'badge-green'}" style="font-weight: 800; font-size: 0.725rem;">
                        ${kpi.totalGap < 0 ? `⚠️ Thiếu ${Math.abs(kpi.totalGap).toLocaleString('vi-VN')}` : `✅ Đạt ${kpi.totalPlan > 0 ? Math.round(kpi.totalFact / kpi.totalPlan * 100) + '%' : '100%'}`}
                      </span>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${table1RowsHtml}
                </tbody>
              </table>
            ` : `
              <!-- CHẾ ĐỘ 2: BẢNG CHI TIẾT TỪNG NGÀY & CA (NHẬT KÝ SẢN XUẤT) -->
              <table class="datamass-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.785rem;">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">STT</th>
                    <th style="width: 95px; text-align: center;">Ngày Làm</th>
                    <th style="width: 75px; text-align: center;">Ca</th>
                    <th style="width: 110px; text-align: center;">Công Đoạn</th>
                    <th style="width: 85px; text-align: center;">Line SX</th>
                    <th style="min-width: 260px; text-align: left;">Model (Mã 1C)</th>
                    <th style="width: 85px; text-align: right; color: #60a5fa;">KH (Plan)</th>
                    <th style="width: 85px; text-align: right; color: #34d399;">TT (Fact)</th>
                    <th style="width: 90px; text-align: right; color: #f87171;">Chênh Lệch</th>
                    <th style="min-width: 260px; text-align: left;">Nguyên Nhân Cụ Thể (Mass-History)</th>
                    <th style="min-width: 140px; text-align: left;">Chất Lượng / Khắc Phục</th>
                  </tr>
                </thead>
                <tbody>
                  ${table2RowsHtml}
                </tbody>
              </table>
            `}
          </div>

          <!-- 6. PHÂN TRANG -->
          ${totalPages > 1 ? `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-glass, #334155); background: var(--surface-card, rgba(15, 23, 42, 0.6)); flex-wrap: wrap; gap: 0.5rem;">
              <div style="font-size: 0.78rem; color: #94a3b8;">
                Hiển thị <strong>${startIdx + 1}</strong> - <strong>${Math.min(totalRecords, startIdx + pageSize)}</strong> trong tổng số <strong>${totalRecords.toLocaleString('vi-VN')}</strong> ${isSummaryView ? 'Model' : 'bản ghi ca'}.
              </div>

              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <button type="button" class="btn btn-xs btn-secondary" onclick="window.setPlanFactCheckPage(0)" ${safePageIndex === 0 ? 'disabled' : ''}>
                  « Đầu
                </button>
                <button type="button" class="btn btn-xs btn-secondary" onclick="window.setPlanFactCheckPage(${safePageIndex - 1})" ${safePageIndex === 0 ? 'disabled' : ''}>
                  ‹ Trước
                </button>
                <span style="font-size: 0.78rem; color: #f8fafc; font-weight: 700; padding: 0 0.4rem;">
                  Trang ${safePageIndex + 1} / ${totalPages}
                </span>
                <button type="button" class="btn btn-xs btn-secondary" onclick="window.setPlanFactCheckPage(${safePageIndex + 1})" ${safePageIndex >= totalPages - 1 ? 'disabled' : ''}>
                  Sau ›
                </button>
                <button type="button" class="btn btn-xs btn-secondary" onclick="window.setPlanFactCheckPage(${totalPages - 1})" ${safePageIndex >= totalPages - 1 ? 'disabled' : ''}>
                  Cuối »
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        ${modalHtml}
      </div>
    `;
  };

  // ==========================================
  // CÁC HÀM XỬ LÝ SỰ KIỆN (EVENT HANDLERS)
  // ==========================================

  window.handlePlanFactCheckViewMode = function(mode) {
    window.PlanFactCheckStore.activeViewMode = mode;
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckDatePreset = function(preset) {
    const store = window.PlanFactCheckStore;
    if (preset === 'WEEK_CURRENT') {
      store.fromDate = '2026-11-05';
      store.toDate = '2026-11-11';
    } else if (preset === 'TODAY') {
      store.fromDate = '2026-11-12';
      store.toDate = '2026-11-12';
    } else if (preset === 'WEEK_PREV') {
      store.fromDate = '2026-10-29';
      store.toDate = '2026-11-04';
    } else if (preset === 'TWO_WEEKS') {
      store.fromDate = '2026-10-29';
      store.toDate = '2026-11-11';
    } else if (preset === 'ALL_TIME') {
      store.fromDate = '2026-09-21';
      store.toDate = '2026-11-12';
    }
    store.pageIndex = 0;
    window.renderPlanFactCheckView();
    if (window.showToast) {
      window.showToast('info', `Đã chuyển khoảng thời gian: ${formatPfcDate(store.fromDate)} ➜ ${formatPfcDate(store.toDate)}`);
    }
  };

  window.handlePlanFactCheckDateChange = function() {
    const fromEl = document.getElementById('pfcFromDate');
    const toEl = document.getElementById('pfcToDate');
    if (!fromEl || !toEl) return;
    const fVal = fromEl.value;
    const tVal = toEl.value;
    if (fVal && tVal) {
      if (fVal > tVal) {
        if (window.showToast) window.showToast('warning', 'Từ ngày không thể lớn hơn Đến ngày!');
        return;
      }
      window.PlanFactCheckStore.fromDate = fVal;
      window.PlanFactCheckStore.toDate = tVal;
      window.PlanFactCheckStore.pageIndex = 0;
      window.renderPlanFactCheckView();
    }
  };

  window.handlePlanFactCheckStageChange = function(val) {
    window.PlanFactCheckStore.stageFilter = val || 'ALL';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckGapChange = function(val) {
    window.PlanFactCheckStore.gapFilter = val || 'ALL';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckGroupChange = function(val) {
    window.PlanFactCheckStore.groupFilter = val || 'ALL';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckShiftChange = function(val) {
    window.PlanFactCheckStore.shiftFilter = val || 'ALL';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckReasonChange = function(val) {
    window.PlanFactCheckStore.reasonFilter = val || 'ALL';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckSortChange = function(val) {
    window.PlanFactCheckStore.sortBy = val || 'GAP_ASC';
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckSearch = function(val) {
    window.PlanFactCheckStore.search = val || '';
    window.PlanFactCheckStore.pageIndex = 0;
    window.renderPlanFactCheckView();
  };

  window.handleResetPlanFactCheckFilters = function() {
    window.PlanFactCheckStore.stageFilter = 'ALL';
    window.PlanFactCheckStore.groupFilter = 'ALL';
    window.PlanFactCheckStore.gapFilter = 'ALL';
    window.PlanFactCheckStore.shiftFilter = 'ALL';
    window.PlanFactCheckStore.reasonFilter = 'ALL';
    window.PlanFactCheckStore.fromDate = '2025-09-22';
    window.PlanFactCheckStore.toDate = '2026-11-12';
    window.PlanFactCheckStore.search = '';
    window.PlanFactCheckStore.sortBy = 'GAP_ASC';
    window.PlanFactCheckStore.pageIndex = 0;
    window.PlanFactCheckStore.expandedModelKeys = {};
    window.PlanFactCheckStore.expandedTimelineKeys = {};
    window.PlanFactCheckStore.modelTimelineMode = {};
    window.renderPlanFactCheckView();
    if (window.showToast) window.showToast('info', 'Đã đặt lại bộ lọc về mặc định (22/09/2025 ➜ Hiện tại)!');
  };

  window.setPlanFactCheckPage = function(p) {
    window.PlanFactCheckStore.pageIndex = Math.max(0, p);
    window.renderPlanFactCheckView();
  };

  window.togglePlanFactCheckModelExpand = function(modelKey) {
    if (!modelKey) return;
    const exp = window.PlanFactCheckStore.expandedModelKeys;
    exp[modelKey] = !exp[modelKey];
    window.renderPlanFactCheckView();
  };

  /**
   * Mở rộng / Thu gọn Drawer xem tiến trình lũy kế của 1 Model
   */
  window.handleToggleModelDailyTimeline = function(modelKey) {
    if (!modelKey) return;
    const exp = window.PlanFactCheckStore.expandedTimelineKeys || {};
    exp[modelKey] = !exp[modelKey];
    window.PlanFactCheckStore.expandedTimelineKeys = exp;
    window.renderPlanFactCheckView();
  };

  /**
   * Chuyển chế độ xem timeline của 1 Model: 'ACTIVE' (chỉ ngày có SX) vs 'ALL' (toàn bộ ngày từ 22/09/2025)
   */
  window.handleTogglePfcTimelineMode = function(modelKey, mode) {
    if (!modelKey) return;
    if (!window.PlanFactCheckStore.modelTimelineMode) {
      window.PlanFactCheckStore.modelTimelineMode = {};
    }
    window.PlanFactCheckStore.modelTimelineMode[modelKey] = mode;
    window.renderPlanFactCheckView();
  };

  window.handlePlanFactCheckModalTab = function(tabName) {
    window.PlanFactCheckStore.modalActiveTab = tabName === 'SHIFTS' ? 'SHIFTS' : 'TIMELINE';
    window.renderPlanFactCheckView();
  };

  window.handleCopySingleModelTimelineGoogleSheet = function(modelKey) {
    const { models } = collectPlanFactCheckData();
    const target = models.find(m => m.modelKey === modelKey);
    if (!target || !target.dailyTimeline || target.dailyTimeline.length === 0) {
      if (window.showToast) window.showToast('warning', 'Không có dữ liệu tiến trình lũy kế cho Model này!');
      return;
    }

    const isAll = (window.PlanFactCheckStore.modelTimelineMode && window.PlanFactCheckStore.modelTimelineMode[modelKey]) === 'ALL';
    const targetList = isAll ? target.dailyTimeline : ((target.activeDailyTimeline && target.activeDailyTimeline.length > 0) ? target.activeDailyTimeline : target.dailyTimeline);

    const headers = [
      'STT',
      'Ngày SX',
      'Thứ',
      'Kế Hoạch Ngày (Plan)',
      'Thực Tế Ngày (Fact)',
      'Gap Phát Sinh Ngày',
      'GAP LŨY KẾ (DATA_MASS)',
      'Diễn Biến & Đánh Giá',
      'Ca & Line Sản Xuất Trong Ngày (Mass-History)'
    ];

    const rows = [headers.join('\t')];
    targetList.forEach((t, idx) => {
      const shiftSummary = (t.shifts || []).map(s => {
        const sh = s._shiftNorm === 'day' ? 'Ngày' : 'Đêm';
        const g = s._gapVal > 0 ? `+${s._gapVal}` : `${s._gapVal}`;
        const r = s.reason ? ` - ${s.reason}` : '';
        return `[${s.line || 'Line'}] ${sh} (${g})${r}`;
      }).join('; ');

      let statusDesc = 'Cân bằng';
      if (t.gap < 0) {
        statusDesc = t.dateIso === target.firstDeficitDate ? `Bắt đầu thiếu hụt (${t.gap})` : `Thiếu hụt (${t.gap})`;
      } else if (t.gap > 0) {
        statusDesc = t.cumGap < 0 ? `Chạy bù (+${t.gap}) - Thu hẹp âm` : `Vượt (+${t.gap})`;
      }

      rows.push([
        idx + 1,
        t.dateFormatted,
        t.dayOfWeek,
        t.plan,
        t.fact,
        t.gap,
        t.cumGap,
        statusDesc,
        shiftSummary || '—'
      ].join('\t'));
    });

    const tsv = rows.join('\n');
    const msg = `📋 Đã copy Tiến Trình Lũy Kế Ngày của Model "${target.productName1C}" cho Google Sheet! Mở Sheet và nhấn Ctrl+V.`;
    copyPfcToClipboard(tsv, msg);
  };

  window.openPlanFactCheckShiftModal = function(productName1C, stage, specCode) {
    const { models } = collectPlanFactCheckData();
    const cleanP = String(productName1C || '').trim().toLowerCase();
    const cleanStg = String(stage || '').trim().toUpperCase();

    const targetModel = models.find(m => {
      const matchP = m.productName1C.trim().toLowerCase() === cleanP;
      const matchStg = !cleanStg || m.stage === cleanStg;
      return matchP && matchStg;
    });

    if (!targetModel) {
      if (window.showToast) window.showToast('warning', 'Không tìm thấy dữ liệu ca chi tiết cho Model này!');
      return;
    }

    window.PlanFactCheckStore.modalModelData = targetModel;
    window.renderPlanFactCheckView();
    if (typeof document !== 'undefined' && document.body) document.body.style.overflow = 'hidden';
  };

  window.closePlanFactCheckShiftModal = function() {
    window.PlanFactCheckStore.modalModelData = null;
    window.renderPlanFactCheckView();
    if (typeof document !== 'undefined' && document.body) document.body.style.overflow = '';
  };

  /**
   * Copy toàn bộ dữ liệu bảng ra Clipboard theo chuẩn TSV cho Google Sheets & Excel
   */
  window.handleCopyPlanFactCheckGoogleSheet = function() {
    const store = window.PlanFactCheckStore;
    const isSummaryView = store.activeViewMode === 'MODEL_SUMMARY';
    const { models, logs, activeDates } = collectPlanFactCheckData();
    const clean = (v) => String(v || '').replace(/[\t\r\n]/g, ' ').trim();

    if (isSummaryView) {
      if (!models || models.length === 0) {
        if (window.showToast) window.showToast('warning', 'Không có dữ liệu Model để sao chép!');
        return;
      }

      const headers = [
        'STT',
        'Công Đoạn',
        'Group Model',
        'Model (Mã 1C)',
        'Specification Code',
        `KẾ HOẠCH (${activeDates.length} ngày)`,
        `THỰC TẾ (${activeDates.length} ngày)`,
        'CHÊNH LỆCH (GAP)',
        'Ngày Bắt Đầu Phát Sinh Gap (Data_Mass)',
        'Tồn Tuần Trước Đẩy Sang',
        'Diễn Biến Lũy Kế Từng Ngày (Data_Mass)',
        'Số Ca Ghi Nhận',
        'Chi Tiết Các Ca & Nguyên Nhân (Mass-History)'
      ];

      const rows = [headers.join('\t')];
      models.forEach((m, idx) => {
        const shiftsSummary = m.shifts.map(s => {
          const dStr = formatPfcDateShort(s.date || s.rawDate);
          const shStr = s._shiftNorm === 'day' ? 'Ngày' : 'Đêm';
          const lineStr = s.line ? `[${s.line}]` : '';
          const gapStr = s._gapVal > 0 ? `+${s._gapVal}` : `${s._gapVal}`;
          const rStr = s.reason ? ` - ${s.reason}` : '';
          return `${dStr} ${shStr} ${lineStr} (${gapStr})${rStr}`;
        }).join('; ');

        const startGapDesc = m.firstDeficitDate ?
          `${formatPfcDate(m.firstDeficitDate)} (${m.firstDeficitGap} pcs)` :
          (m.firstGapDate ? `${formatPfcDate(m.firstGapDate)} (lệch)` : 'Không có gap');

        const priorGapDesc = m.hasPriorDeficit ? m.priorGap : 0;

        const timelineSummary = ((m.activeDailyTimeline && m.activeDailyTimeline.length > 0) ? m.activeDailyTimeline : m.dailyTimeline).map(t => {
          const sign = t.gap > 0 ? '+' : '';
          return `${t.dateShort}: P=${t.plan}, F=${t.fact}, G=${sign}${t.gap}, LK=${t.cumGap}`;
        }).join('; ');

        rows.push([
          idx + 1,
          clean(m.stage),
          clean(m.groupModel),
          clean(m.productName1C),
          clean(m.specCode),
          m.planTotal,
          m.factTotal,
          m.gapTotal,
          clean(startGapDesc),
          priorGapDesc,
          clean(timelineSummary),
          m.shifts.length,
          clean(shiftsSummary || 'Không ghi nhận âm')
        ].join('\t'));
      });

      const tsvContent = rows.join('\n');
      const msg = `📋 Đã copy ${models.length.toLocaleString('vi-VN')} Model Check Plan / Fact kỳ ${formatPfcDate(store.fromDate)} ➜ ${formatPfcDate(store.toDate)}! Mở Google Sheet và nhấn Ctrl+V.`;
      copyPfcToClipboard(tsvContent, msg);
    } else {
      if (!logs || logs.length === 0) {
        if (window.showToast) window.showToast('warning', 'Không có nhật ký ca nào để sao chép!');
        return;
      }

      const headers = [
        'STT',
        'Ngày Làm',
        'Ca',
        'Công Đoạn',
        'Line SX',
        'Model (Mã 1C)',
        'KH (Plan)',
        'TT (Fact)',
        'Chênh Lệch',
        'Nguyên Nhân / Lý Do (Mass-History)',
        'Chất Lượng / Khắc Phục'
      ];

      const rows = [headers.join('\t')];
      logs.forEach((s, idx) => {
        rows.push([
          idx + 1,
          formatPfcDate(s.date || s.rawDate),
          s._shiftNorm === 'day' ? 'Ca Ngày' : 'Ca Đêm',
          clean(s.workcell || s.process),
          clean(s.line),
          clean(s.model),
          Math.round(s._planVal),
          Math.round(s._factVal),
          Math.round(s._gapVal),
          clean(s.reason),
          clean(s.qualityIssue || s.correctiveAction)
        ].join('\t'));
      });

      const tsvContent = rows.join('\n');
      const msg = `📋 Đã copy ${logs.length.toLocaleString('vi-VN')} bản ghi nhật ký ca! Mở Google Sheet và nhấn Ctrl+V.`;
      copyPfcToClipboard(tsvContent, msg);
    }
  };

  /**
   * Copy bảng chi tiết ca của 1 Model trong Popup Modal ra Clipboard
   */
  window.handleCopyModelShiftModalGoogleSheet = function() {
    const md = window.PlanFactCheckStore.modalModelData;
    if (!md || !md.shifts || md.shifts.length === 0) {
      if (window.showToast) window.showToast('warning', 'Không có ca chi tiết nào để copy!');
      return;
    }

    const clean = (v) => String(v || '').replace(/[\t\r\n]/g, ' ').trim();
    const headers = [
      'STT',
      'Model (Mã 1C)',
      'Công Đoạn',
      'Ngày Làm',
      'Ca',
      'Line SX',
      'KH (Plan)',
      'TT (Fact)',
      'Chênh Lệch',
      'Nguyên Nhân Cụ Thể (Mass-History)',
      'Chất Lượng / Khắc Phục'
    ];

    const rows = [headers.join('\t')];
    md.shifts.forEach((s, idx) => {
      rows.push([
        idx + 1,
        clean(md.productName1C),
        clean(md.stage),
        formatPfcDate(s.date || s.rawDate),
        s._shiftNorm === 'day' ? 'Ca Ngày' : 'Ca Đêm',
        clean(s.line),
        Math.round(s._planVal),
        Math.round(s._factVal),
        Math.round(s._gapVal),
        clean(s.reason),
        clean(s.qualityIssue || s.correctiveAction)
      ].join('\t'));
    });

    const tsvContent = rows.join('\n');
    const msg = `📋 Đã copy ${md.shifts.length} ca của model ${md.productName1C}! Mở Google Sheet và nhấn Ctrl+V.`;
    copyPfcToClipboard(tsvContent, msg);
  };

  /**
   * Xuất file CSV UTF-8 BOM
   */
  window.handleExportPlanFactCheckCsv = function() {
    const store = window.PlanFactCheckStore;
    const isSummaryView = store.activeViewMode === 'MODEL_SUMMARY';
    const { models, logs, activeDates } = collectPlanFactCheckData();
    const escapeCsv = (s) => `"${String(s || '').replace(/"/g, '""')}"`;

    let csv = '\uFEFF'; // UTF-8 BOM

    if (isSummaryView) {
      if (!models || models.length === 0) {
        if (window.showToast) window.showToast('warning', 'Không có dữ liệu Model để xuất file!');
        return;
      }

      csv += [
        'STT',
        'Công Đoạn',
        'Group Model',
        'Model (Mã 1C)',
        'Specification Code',
        `KẾ HOẠCH (${activeDates.length} ngày)`,
        `THỰC TẾ (${activeDates.length} ngày)`,
        'CHÊNH LỆCH (GAP)',
        'Ngày Bắt Đầu Phát Sinh Gap (Data_Mass)',
        'Tồn Tuần Trước Đẩy Sang',
        'Diễn Biến Lũy Kế Từng Ngày (Data_Mass)',
        'Số Ca Ghi Nhận',
        'Chi Tiết Các Ca & Nguyên Nhân (Mass-History)'
      ].map(escapeCsv).join(',') + '\n';

      models.forEach((m, idx) => {
        const shiftsSummary = m.shifts.map(s => {
          const dStr = formatPfcDateShort(s.date || s.rawDate);
          const shStr = s._shiftNorm === 'day' ? 'Ngày' : 'Đêm';
          const lineStr = s.line ? `[${s.line}]` : '';
          const gapStr = s._gapVal > 0 ? `+${s._gapVal}` : `${s._gapVal}`;
          const rStr = s.reason ? ` - ${s.reason}` : '';
          return `${dStr} ${shStr} ${lineStr} (${gapStr})${rStr}`;
        }).join('; ');

        const startGapDesc = m.firstDeficitDate ?
          `${formatPfcDate(m.firstDeficitDate)} (${m.firstDeficitGap} pcs)` :
          (m.firstGapDate ? `${formatPfcDate(m.firstGapDate)} (lệch)` : 'Không có gap');

        const priorGapDesc = m.hasPriorDeficit ? m.priorGap : 0;

        const timelineSummary = ((m.activeDailyTimeline && m.activeDailyTimeline.length > 0) ? m.activeDailyTimeline : m.dailyTimeline).map(t => {
          const sign = t.gap > 0 ? '+' : '';
          return `${t.dateShort}: P=${t.plan}, F=${t.fact}, G=${sign}${t.gap}, LK=${t.cumGap}`;
        }).join('; ');

        csv += [
          idx + 1,
          escapeCsv(m.stage),
          escapeCsv(m.groupModel),
          escapeCsv(m.productName1C),
          escapeCsv(m.specCode),
          m.planTotal,
          m.factTotal,
          m.gapTotal,
          escapeCsv(startGapDesc),
          priorGapDesc,
          escapeCsv(timelineSummary),
          m.shifts.length,
          escapeCsv(shiftsSummary || 'Không ghi nhận âm')
        ].join(',') + '\n';
      });

      downloadPfcCsv(csv, `Check_Plan_Fact_${store.fromDate}_to_${store.toDate}.csv`);
    } else {
      if (!logs || logs.length === 0) {
        if (window.showToast) window.showToast('warning', 'Không có dữ liệu nhật ký ca để xuất file!');
        return;
      }

      csv += [
        'STT',
        'Ngày Làm',
        'Ca',
        'Công Đoạn',
        'Line SX',
        'Model (Mã 1C)',
        'KH (Plan)',
        'TT (Fact)',
        'Chênh Lệch',
        'Nguyên Nhân / Lý Do (Mass-History)',
        'Chất Lượng / Khắc Phục'
      ].map(escapeCsv).join(',') + '\n';

      logs.forEach((s, idx) => {
        csv += [
          idx + 1,
          escapeCsv(formatPfcDate(s.date || s.rawDate)),
          escapeCsv(s._shiftNorm === 'day' ? 'Ca Ngày' : 'Ca Đêm'),
          escapeCsv(s.workcell || s.process),
          escapeCsv(s.line),
          escapeCsv(s.model),
          Math.round(s._planVal),
          Math.round(s._factVal),
          Math.round(s._gapVal),
          escapeCsv(s.reason),
          escapeCsv(s.qualityIssue || s.correctiveAction)
        ].join(',') + '\n';
      });

      downloadPfcCsv(csv, `Nhat_Ky_Ca_Plan_Fact_${store.fromDate}_to_${store.toDate}.csv`);
    }

    if (window.showToast) {
      window.showToast('success', `📊 Đã xuất dữ liệu ra file CSV tương thích Google Sheets & Excel!`);
    }
  };

  function copyPfcToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast('success', successMsg);
      }).catch(() => legacyPfcCopy(text, successMsg));
    } else {
      legacyPfcCopy(text, successMsg);
    }
  }

  function legacyPfcCopy(text, successMsg) {
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

  function downloadPfcCsv(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();
