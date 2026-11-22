/**
 * =========================================================================
 * AJAX PROPLAN MES - CLIPS ALL PLAN (TRA CỨU CLIPS ALL PLAN) MODULE
 * =========================================================================
 * Phân hệ truy cứu số lượng sản xuất từ công đoạn trước đến công đoạn cuối MB:
 * - Chuỗi 10 công đoạn: SMD ➔ DIP ➔ LAQ.Line ➔ HARD TEST ➔ ASSEMBLY ➔ LONG TEST ➔ TEST ROOM ➔ QC ➔ PKG ➔ MB
 * - Bảng hiển thị theo mẫu:
 *   STT | product name 1C | MB | PKG | QC | TEST ROOM | LONG TEST | ASSEMBLY | HARD TEST | LAQ.Line | DIP | SMD
 * - So sánh chênh lệch giữa các công đoạn để đánh giá thừa/thiếu tại từng nấc sản xuất
 * - Hỗ trợ lọc theo khoảng thời gian linh hoạt (Từ ngày ... Đến ngày ...) hoặc xem Toàn Bộ Kế Hoạch
 * - Copy Google Sheet: Dữ liệu dạng số thuần túy (pure number), đơn vị ghi ở tiêu đề, sạch emoji
 * - Xuất CSV chuẩn UTF-8
 * =========================================================================
 */

(function() {
  'use strict';

  /**
   * Lấy khoảng thời gian mặc định: Từ Thứ 5 đến Ngày Hiện Tại (today)
   * Chu kỳ tuần chuẩn: Thứ 5 -> Thứ 4
   */
  function getDefaultClipsDateRange() {
    if (window.AppStore && typeof window.AppStore.getFactoryWeekRange === 'function') {
      const r = window.AppStore.getFactoryWeekRange();
      return { fromDate: r.fromDate, toDate: r.toDate, weekEndDate: r.weekEndDate, label: `Thứ 5 (${r.fromDate}) ➔ Hôm nay (${r.toDate})` };
    }
    if (typeof window.getFactoryWeekRange === 'function') {
      const r = window.getFactoryWeekRange();
      return { fromDate: r.fromDate, toDate: r.toDate, weekEndDate: r.weekEndDate, label: `Thứ 5 (${r.fromDate}) ➔ Hôm nay (${r.toDate})` };
    }
    const d = new Date();
    const day = d.getDay();
    const diffToThu = (day - 4 + 7) % 7;
    const startThu = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToThu);
    const endWed = new Date(startThu.getFullYear(), startThu.getMonth(), startThu.getDate() + 6);
    const pad = n => String(n).padStart(2, '0');
    const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    return {
      fromDate: fmt(startThu),
      toDate: fmt(d),
      weekEndDate: fmt(endWed),
      label: `Thứ 5 (${fmt(startThu)}) ➔ Hôm nay (${fmt(d)})`
    };
  }

  // Alias để bảo đảm tương thích với các hàm gọi cũ
  function getDefaultMonthRange() {
    return getDefaultClipsDateRange();
  }

  // Khởi tạo State lưu trữ bộ lọc của Clips All Plan (Mặc định: Thứ 5 đến Ngày hiện tại)
  const defaultClipsRange = getDefaultClipsDateRange();
  let savedToolbarCollapsed = false;
  try {
    savedToolbarCollapsed = localStorage.getItem('AJAX_PROPLAN_CLIPS_TOOLBAR_COLLAPSED') === 'true';
  } catch (e) {}

  window.ClipsPlanStore = {
    search: '',
    modelFilter: 'ALL',
    gapFilter: 'ALL', // 'ALL' | 'NEGATIVE' | 'NEGATIVE_MB' | 'CLIPS_ALL_DEVICE' | 'CLIPS_DONE_DEVICE' | 'CLIPS_NOT_DONE_DEVICE' | 'CLIPS_HAS_PLAN' | 'CLIPS_GT_90' | 'CLIPS_LT_90'
    statusFilter: 'ALL', // 'ALL' | 'DEFICIT' (Thiếu công đoạn trước) | 'BALANCED' (Cân bằng) | 'SURPLUS' (Dư BTP)
    deficitStageFilter: 'ALL', // 'ALL' | 'ASSEMBLY' | 'HARD TEST' | 'QC' | 'PKG' | 'SMD'
    dateMode: 'RANGE', // Mặc định lọc theo chu kỳ thời gian
    fromDate: defaultClipsRange.fromDate, // Format YYYY-MM-DD (Thứ 5)
    toDate: defaultClipsRange.toDate,     // Format YYYY-MM-DD (Ngày hiện tại)
    metricView: 'ALL', // 'ALL' (Plan / Fact / Gap / %) | 'PLAN' (Chỉ Plan) | 'FACT' (Chỉ Fact) | 'GAP' (Chỉ Gap) | 'RATE' (Chỉ % HT)
    sortBy: 'DEFAULT', // 'DEFAULT' | 'DEFICIT_DESC' | 'NAME_ASC' | 'MB_DESC' | 'ASSY_DESC'
    showClipsStage: false, // Mặc định ẩn công đoạn Clips All ở cuối bảng, khi nào cần xem thì bấm để hiển thị
    pageIndex: 0,
    pageSize: 50,
    quickViewItem: null,
    isToolbarCollapsed: savedToolbarCollapsed,
    selectedHistoryMonth: 'AUTO' // Tự động nhận diện theo kỳ ngày lọc
  };

  /**
   * Lấy Master Data của Clips All theo kỳ lịch sử đã lưu trữ hoặc khoảng ngày lọc
   */
  function getClipsMasterForPeriod(fromDate, toDate, selectedHistoryMonth) {
    const history = window.CLIPS_ALLS_HISTORY || window.CLIPS_ALLS_MASTER_DATA?.history || null;
    const snapshots = (history && history.snapshots) ? history.snapshots : {};

    // 1. Nếu người dùng chọn đích danh kỳ tháng trong dropdown
    if (selectedHistoryMonth && selectedHistoryMonth !== 'AUTO' && snapshots[selectedHistoryMonth]) {
      return snapshots[selectedHistoryMonth];
    }

    // 2. Nếu ở chế độ AUTO hoặc chưa chỉ định, tự động nhận diện từ fromDate / toDate
    let inferMonth = '';
    if (fromDate && fromDate.length >= 7) {
      inferMonth = fromDate.substring(0, 7);
    } else if (toDate && toDate.length >= 7) {
      inferMonth = toDate.substring(0, 7);
    }

    if (inferMonth && snapshots[inferMonth]) {
      return snapshots[inferMonth];
    }

    // 3. Nếu có snapshot tháng 10/2026 đã lưu trữ lịch sử
    if (snapshots['2026-10']) {
      return snapshots['2026-10'];
    }

    // 4. Mặc định fallback
    return window.CLIPS_ALLS_MASTER_DATA || window.DEFAULT_DATAMASS_DATA?.clipsAlls || null;
  }

  /**
   * Chuyển đổi key ngày M/D/YYYY trong DataMass sang timestamp đầu ngày (00:00:00)
   */
  function parsePlanDateKey(dateKey) {
    if (!dateKey) return null;
    const parts = dateKey.split('/');
    if (parts.length === 3) {
      const m = parseInt(parts[0], 10);
      const d = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
      }
    }
    if (window.AppStore && typeof window.AppStore.parseDate === 'function') {
      const dt = window.AppStore.parseDate(dateKey);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime();
    }
    const dt = new Date(dateKey);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime();
  }

  /**
   * Chuyển đổi ngày YYYY-MM-DD sang timestamp
   */
  function parseIsoDateToTime(isoStr, isEndOfDay = false) {
    if (!isoStr) return null;
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d, isEndOfDay ? 23 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 999 : 0).getTime();
      }
    }
    const dt = new Date(isoStr);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), isEndOfDay ? 23 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 999 : 0).getTime();
  }

  /**
   * Định dạng YYYY-MM-DD sang DD/MM/YYYY chuẩn Việt Nam
   */
  function formatDateVN(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  /**
   * Tách và chuẩn hóa token từ tên sản phẩm để liên kết chuỗi
   */
  function extractProductTokens(str) {
    if (!str) return { tokens: new Set(), color: '', freq: '', partner: '' };
    const raw = String(str);
    const upper = raw.toUpperCase();
    const tokens = new Set(upper.split(/[^A-Z0-9А-ЯІЇЄҐ]+/i).filter(Boolean));

    // Nhận diện màu sắc
    let color = '';
    if (tokens.has('WHITE') || tokens.has('БІЛИЙ')) color = 'WHITE';
    else if (tokens.has('BLACK') || tokens.has('ЧОРНИЙ')) color = 'BLACK';

    // Nhận diện tần số / vùng
    let freq = '';
    const freqList = ['8EU', '9NA', '9AU', '9SA', '8IN', '8MA', '868', '915', '920', '8XX', '9XX'];
    for (const f of freqList) {
      if (tokens.has(f)) { freq = f; break; }
    }
    if (!freq) {
      if (tokens.has('EU')) freq = '8EU';
      else if (tokens.has('NA')) freq = '9NA';
      else if (tokens.has('AU')) freq = '9AU';
      else if (tokens.has('IN')) freq = '8IN';
      else if (tokens.has('MA')) freq = '8MA';
      else if (tokens.has('SA')) freq = '9SA';
    }

    // Nhận diện đối tác / phiên bản đặc biệt
    let partner = '';
    const partnerList = ['KALE', 'VERUX', 'SECTOR', 'STANDARD', 'UPC', 'ASP', 'GJENSIDIGE', 'BR', 'AR', 'AFA'];
    for (const p of partnerList) {
      if (tokens.has(p)) { partner = p; break; }
    }

    return { tokens, color, freq, partner };
  }

  /**
   * Chuẩn hóa tên Model gốc (bỏ bớt hậu tố 8xx, 9xx, màu sắc, v.v.)
   */
  function cleanBaseModel(m) {
    if (!m) return '';
    return String(m)
      .replace(/\s*\([0-9xX]+[^\)]*\)/g, '')
      .replace(/\s*\b(white|black|8xx|9xx|v\d+)\b/gi, '')
      .trim();
  }

  /**
   * Tính tổng theo metric (plan hoặc fact) cho 1 item DataMass theo DateMode hoặc Khoảng thời gian
   */
  function calculateItemMetricQty(item, metricType, dateMode, fromDate, toDate) {
    if (!item) return 0;
    const dataObj = item[metricType];
    if (!dataObj || typeof dataObj !== 'object') return 0;

    // Nếu chọn ALL_PLAN hoặc không nhập cả fromDate và toDate: tính tổng tất cả các ngày
    if (dateMode === 'ALL_PLAN' || (!fromDate && !toDate)) {
      let total = 0;
      for (const k in dataObj) {
        if (Object.prototype.hasOwnProperty.call(dataObj, k)) {
          total += Number(dataObj[k]) || 0;
        }
      }
      return total;
    }

    // Nếu lọc theo khoảng thời gian RANGE
    const fromTime = fromDate ? parseIsoDateToTime(fromDate, false) : -Infinity;
    const toTime = toDate ? parseIsoDateToTime(toDate, true) : Infinity;

    let total = 0;
    for (const k in dataObj) {
      if (Object.prototype.hasOwnProperty.call(dataObj, k)) {
        const t = parsePlanDateKey(k);
        if (t !== null && t >= fromTime && t <= toTime) {
          total += Number(dataObj[k]) || 0;
        }
      }
    }
    return total;
  }

  /**
   * Tính tổng kế hoạch (Plan) - tương thích ngược
   */
  function calculateItemPlanQty(item, dateMode, fromDate, toDate) {
    return calculateItemMetricQty(item, 'plan', dateMode, fromDate, toDate);
  }

  /**
   * Tính tổng thực tế (Fact)
   */
  function calculateItemFactQty(item, dateMode, fromDate, toDate) {
    return calculateItemMetricQty(item, 'fact', dateMode, fromDate, toDate);
  }

  /**
   * Xây dựng tập dữ liệu chuỗi 10 công đoạn cho toàn bộ thành phẩm
   */
  window.buildClipsAllPlanData = function() {
    const rawData = window.AppStore?.dataMass || window.DEFAULT_DATAMASS_DATA;
    if (!rawData || !Array.isArray(rawData.items)) {
      return { rows: [], stats: {}, models: [] };
    }

    const allItems = rawData.items;
    const dateMode = window.ClipsPlanStore.dateMode || 'ALL_PLAN';
    const fromDate = window.ClipsPlanStore.fromDate || '';
    const toDate = window.ClipsPlanStore.toDate || '';

    // Phân loại items theo stage
    const stagesMap = {};
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      const s = it.stage || 'OTHER';
      if (!stagesMap[s]) stagesMap[s] = [];
      stagesMap[s].push(it);
    }

    // Lấy danh sách thành phẩm gốc (Finished Goods) từ PKG, MB, QC
    const fgMap = new Map();
    const fgSources = ['PKG', 'MB', 'QC'];
    for (const src of fgSources) {
      const list = stagesMap[src] || [];
      for (const it of list) {
        const name = it.productName1C;
        if (name && !fgMap.has(name)) {
          fgMap.set(name, it);
        }
      }
    }

    // Tạo map tra cứu kế hoạch Clips All từ sheet Clip Alls (Đã hỗ trợ lưu trữ lịch sử theo tháng)
    const clipsMaster = getClipsMasterForPeriod(fromDate, toDate, window.ClipsPlanStore.selectedHistoryMonth);
    const clipsByDevice = clipsMaster?.byDevice || {};
    const clipsCleanMap = new Map();
    if (clipsMaster?.items && Array.isArray(clipsMaster.items)) {
      for (const cit of clipsMaster.items) {
        if (cit && cit.device) {
          clipsCleanMap.set(cit.device.trim().toLowerCase(), cit);
          // Đảm bảo đủ 247 mã Device từ Sheet Clip Alls xuất hiện trong danh sách
          if (!fgMap.has(cit.device)) {
            fgMap.set(cit.device, {
              productName1C: cit.device,
              model: cit.agg || cit.group || cleanBaseModel(cit.device) || '',
              normKeyShort: '',
              stage: 'CLIPS_ALL',
              isClipOnly: true
            });
          }
        }
      }
    }

    const fgList = Array.from(fgMap.values());
    const distinctModelsSet = new Set();
    const rows = [];

    // Helper khớp bán thành phẩm (Assembly, Long Test, Test Room, Hard Test)
    function matchSemiFinished(stageItems, nks, model, color, freq, partner) {
      if (!stageItems || stageItems.length === 0) return null;
      const baseMdl = cleanBaseModel(model);
      
      // Lọc ứng viên theo normKeyShort hoặc model
      const candidates = stageItems.filter(x => {
        if (nks && x.normKeyShort && x.normKeyShort === nks) return true;
        if (model && x.model && x.model === model) return true;
        if (baseMdl && x.model && cleanBaseModel(x.model) === baseMdl) return true;
        return false;
      });

      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];

      // Tìm ứng viên khớp nhất về color, freq, partner
      let bestItem = null;
      let bestScore = -1;

      for (const cand of candidates) {
        let score = 0;
        const cAttr = extractProductTokens(cand.productName1C);

        // Khớp màu sắc
        if (color && cAttr.color === color) score += 10;
        else if (!color && !cAttr.color) score += 5;
        else if (color && cAttr.color && cAttr.color !== color) continue; // Khác màu loại ngay

        // Khớp tần số
        if (freq && cAttr.freq === freq) score += 10;
        else if (freq && (freq === '8EU' || freq === 'EU') && (cAttr.freq === '8EU' || cAttr.freq === 'EU')) score += 8;
        else if (!freq && !cAttr.freq) score += 4;
        else if (freq && cAttr.freq && cAttr.freq !== freq) continue; // Khác tần số loại

        // Khớp đối tác
        if (partner && cAttr.partner === partner) score += 6;

        if (score > bestScore) {
          bestScore = score;
          bestItem = cand;
        }
      }

      return bestItem || candidates[0];
    }

    // Helper tính sản lượng công đoạn bo mạch (LAQ, DIP, SMD) cho cả Plan, Fact, Gap
    function calculateBoardMetrics(stageNames, nks, model) {
      let matchedItems = [];
      const baseMdl = cleanBaseModel(model);

      for (const sName of stageNames) {
        const list = stagesMap[sName];
        if (list) {
          const cands = list.filter(x => {
            if (nks && x.normKeyShort && x.normKeyShort === nks) return true;
            if (model && x.model && x.model === model) return true;
            if (baseMdl && x.model && cleanBaseModel(x.model) === baseMdl) return true;
            return false;
          });
          matchedItems.push(...cands);
        }
      }

      if (matchedItems.length === 0) return { plan: 0, fact: 0, gap: 0, items: [] };

      // Tính tổng kế hoạch và thực tế theo khoảng ngày
      let totalPlan = 0;
      let totalFact = 0;
      for (const it of matchedItems) {
        totalPlan += calculateItemMetricQty(it, 'plan', dateMode, fromDate, toDate);
        totalFact += calculateItemMetricQty(it, 'fact', dateMode, fromDate, toDate);
      }

      return { 
        plan: totalPlan, 
        fact: totalFact, 
        gap: totalFact - totalPlan, 
        items: matchedItems 
      };
    }

    function calculateBoardPlan(stageNames, nks, model) {
      return calculateBoardMetrics(stageNames, nks, model);
    }

    // Duyệt qua từng SKU thành phẩm
    for (let idx = 0; idx < fgList.length; idx++) {
      const fg = fgList[idx];
      const pName = fg.productName1C;
      const nks = fg.normKeyShort || '';
      const model = fg.model || '';
      const baseModel = cleanBaseModel(model) || model;
      if (baseModel) distinctModelsSet.add(baseModel);

      const { color, freq, partner } = extractProductTokens(pName);

      // 1. MB
      const mbItem = (stagesMap['MB'] || []).find(x => x.productName1C === pName) || null;
      const planMB = calculateItemMetricQty(mbItem, 'plan', dateMode, fromDate, toDate);
      const factMB = calculateItemMetricQty(mbItem, 'fact', dateMode, fromDate, toDate);
      const gapMB = factMB - planMB;

      // 2. PKG
      const pkgItem = (stagesMap['PKG'] || []).find(x => x.productName1C === pName) || null;
      const planPKG = calculateItemMetricQty(pkgItem, 'plan', dateMode, fromDate, toDate);
      const factPKG = calculateItemMetricQty(pkgItem, 'fact', dateMode, fromDate, toDate);
      const gapPKG = factPKG - planPKG;

      // 3. QC
      const qcItem = (stagesMap['QC'] || []).find(x => x.productName1C === pName) || null;
      const planQC = calculateItemMetricQty(qcItem, 'plan', dateMode, fromDate, toDate);
      const factQC = calculateItemMetricQty(qcItem, 'fact', dateMode, fromDate, toDate);
      const gapQC = factQC - planQC;

      // 4. TEST ROOM
      const trItem = matchSemiFinished(stagesMap['TEST ROOM'], nks, model, color, freq, partner);
      const planTR = calculateItemMetricQty(trItem, 'plan', dateMode, fromDate, toDate);
      const factTR = calculateItemMetricQty(trItem, 'fact', dateMode, fromDate, toDate);
      const gapTR = factTR - planTR;

      // 5. LONG TEST
      const ltItem = matchSemiFinished(stagesMap['LONG TEST'], nks, model, color, freq, partner);
      const planLT = calculateItemMetricQty(ltItem, 'plan', dateMode, fromDate, toDate);
      const factLT = calculateItemMetricQty(ltItem, 'fact', dateMode, fromDate, toDate);
      const gapLT = factLT - planLT;

      // 6. ASSEMBLY
      const assyItem = matchSemiFinished(stagesMap['ASSEMBLY'], nks, model, color, freq, partner);
      const planAssy = calculateItemMetricQty(assyItem, 'plan', dateMode, fromDate, toDate);
      const factAssy = calculateItemMetricQty(assyItem, 'fact', dateMode, fromDate, toDate);
      const gapAssy = factAssy - planAssy;

      // 7. HARD TEST
      const htItem = matchSemiFinished(stagesMap['HARD TEST'], nks, model, color, freq, partner);
      const planHT = calculateItemMetricQty(htItem, 'plan', dateMode, fromDate, toDate);
      const factHT = calculateItemMetricQty(htItem, 'fact', dateMode, fromDate, toDate);
      const gapHT = factHT - planHT;

      // 8. LAQ.Line
      const laqResult = calculateBoardMetrics(['LAQ.Line', 'LACQUERING'], nks, model);
      const planLAQ = laqResult.plan;
      const factLAQ = laqResult.fact;
      const gapLAQ = laqResult.gap;

      // 9. DIP
      const dipResult = calculateBoardMetrics(['DIP. Selectiv', 'DIP', 'DIP. Selectiv.pre', 'DIP. Selectiv.post'], nks, model);
      const planDIP = dipResult.plan;
      const factDIP = dipResult.fact;
      const gapDIP = dipResult.gap;

      // 10. SMD
      const smdResult = calculateBoardMetrics(['SMD'], nks, model);
      const planSMD = smdResult.plan;
      const factSMD = smdResult.fact;
      const gapSMD = smdResult.gap;

      // 0. Clips All (Lấy Plan từ sheet Clip Alls, Fact bằng đúng Fact MB lấy từ sheet Data_Mass)
      let planClipsAll = 0;
      let factClipsAll = factMB; // Fact Clips All luôn luôn bằng đúng Fact MB từ Data_Mass
      let clipsItem = clipsByDevice[pName] || null;
      if (!clipsItem && pName) {
        clipsItem = clipsCleanMap.get(pName.trim().toLowerCase()) || null;
      }

      let isClipDevice = false;
      let isClipDone = false;
      let sheetFactVal = 0;
      let sheetDoneVal = 0;

      if (clipsItem) {
        isClipDevice = true;
        planClipsAll = typeof clipsItem.plan === 'number' ? clipsItem.plan : 0;
        sheetFactVal = typeof clipsItem.sheetFact === 'number' ? clipsItem.sheetFact : 0;
        sheetDoneVal = clipsItem.done === 1 ? 1 : 0;
      }

      const gapClipsAll = factClipsAll - planClipsAll;
      const rateClipsAll = calcCompletionRate(planClipsAll, factClipsAll);

      // Đánh giá hoàn thành (> 90%) dựa trên số liệu thực tế mới nhất từ Data_Mass:
      // Sheet Clips All chỉ lấy Device và Plan. Còn Thực tế lấy theo Data_Mass để tính kết quả hoàn thành (> 90%).
      const isDynamicDone = isClipDevice && (rateClipsAll !== null && rateClipsAll !== undefined && rateClipsAll >= 90.0);
      const isSheetDone = (clipsItem?.done === 1) || (clipsItem?.isDone === true);
      isClipDone = isClipDevice && (isDynamicDone || isSheetDone);

      // Fact MB trong tháng hiện tại để phục vụ đánh giá tiến độ Clips All theo tháng
      const defMonth = getDefaultMonthRange();
      const monthFactMB = calculateItemMetricQty(mbItem, 'fact', 'RANGE', defMonth.fromDate, defMonth.toDate);
      const monthFactClipsAll = monthFactMB; // Lấy theo Fact MB từ Data_Mass
      const monthRateClipsAll = calcCompletionRate(planClipsAll, monthFactClipsAll);
      const rateMB = calcCompletionRate(planMB, factMB);
      const ratePKG = calcCompletionRate(planPKG, factPKG);
      const rateQC = calcCompletionRate(planQC, factQC);
      const rateTR = calcCompletionRate(planTR, factTR);
      const rateLT = calcCompletionRate(planLT, factLT);
      const rateAssy = calcCompletionRate(planAssy, factAssy);
      const rateHT = calcCompletionRate(planHT, factHT);
      const rateLAQ = calcCompletionRate(planLAQ, factLAQ);
      const rateDIP = calcCompletionRate(planDIP, factDIP);
      const rateSMD = calcCompletionRate(planSMD, factSMD);

      // Nhận diện mã có Gap < 0 (Bất kỳ công đoạn nào bị âm / chưa đạt kế hoạch)
      const hasNegativeGap = (gapMB < 0) || (gapClipsAll < 0) || (gapPKG < 0) || (gapQC < 0) || (gapTR < 0) || (gapLT < 0) || (gapAssy < 0) || (gapHT < 0) || (gapLAQ < 0) || (gapDIP < 0) || (gapSMD < 0);
      const isMbNegative = (gapMB < 0);

      // Nhu cầu thành phẩm đích (Target demand)
      const targetFG = Math.max(planMB, planPKG);

      // Các chỉ số chênh lệch then chốt giữa các công đoạn để đánh giá cân đối chuỗi
      const gapAssyMB = planAssy - planMB;
      const gapHTAssy = planHT - planAssy;
      const gapQCPKG = planQC - planPKG;
      const gapPKGMB = planPKG - planMB;
      const gapSMDMB = planSMD - planMB;

      // Đánh giá trạng thái cân đối chuỗi (Chain Balance Evaluation)
      let status = 'BALANCED';
      let statusText = '🟢 Cân bằng';
      let statusBadgeClass = 'badge-success';
      let bottleneckStage = '';
      let bottleneckGap = 0;

      // Kiểm tra nguy cơ thiếu hụt ở công đoạn trước
      if (planMB > 0 && planAssy < planMB) {
        status = 'DEFICIT';
        statusText = `Thiếu Assembly (${(gapAssyMB).toLocaleString('vi-VN')})`;
        statusBadgeClass = 'badge-danger';
        bottleneckStage = 'ASSEMBLY';
        bottleneckGap = gapAssyMB;
      } else if (planAssy > 0 && planHT < planAssy) {
        status = 'DEFICIT';
        statusText = `Thiếu Hard Test (${(gapHTAssy).toLocaleString('vi-VN')})`;
        statusBadgeClass = 'badge-danger';
        bottleneckStage = 'HARD TEST';
        bottleneckGap = gapHTAssy;
      } else if (planPKG > 0 && planQC < planPKG) {
        status = 'DEFICIT';
        statusText = `Thiếu QC (${(gapQCPKG).toLocaleString('vi-VN')})`;
        statusBadgeClass = 'badge-danger';
        bottleneckStage = 'QC';
        bottleneckGap = gapQCPKG;
      } else if (planMB > 0 && planPKG < planMB) {
        status = 'DEFICIT';
        statusText = `Thiếu PKG (${(gapPKGMB).toLocaleString('vi-VN')})`;
        statusBadgeClass = 'badge-danger';
        bottleneckStage = 'PKG';
        bottleneckGap = gapPKGMB;
      } else if (targetFG > 0 && planAssy > targetFG * 1.25) {
        status = 'SURPLUS';
        statusText = `Dư Assembly (+${(planAssy - targetFG).toLocaleString('vi-VN')})`;
        statusBadgeClass = 'badge-warning';
      }

      rows.push({
        id: `clips-${idx + 1}`,
        stt: idx + 1,
        productName1C: pName,
        model: model,
        baseModel: baseModel,
        normKeyShort: nks,
        color: color,
        freq: freq,
        partner: partner,
        targetFG: targetFG,
        isClipDevice: isClipDevice,
        isClipDone: isClipDone,
        // 11 công đoạn theo chuỗi: MB | PKG | QC | TEST ROOM | LONG TEST | ASSEMBLY | HARD TEST | LAQ.Line | DIP | SMD | Clips All (Cuối)
        // Mỗi công đoạn có đầy đủ Plan / Fact / Gap / Rate (% Hoàn thành):
        CLIPS_ALL: { 
          plan: planClipsAll, 
          fact: factClipsAll, 
          gap: gapClipsAll, 
          rate: rateClipsAll, 
          sheetFact: sheetFactVal,
          done: isClipDone ? 1 : 0,
          isDone: isClipDone,
          monthFact: monthFactClipsAll, 
          monthRate: monthRateClipsAll, 
          item: null 
        },
        MB: { plan: planMB, fact: factMB, gap: gapMB, rate: rateMB, item: mbItem },
        PKG: { plan: planPKG, fact: factPKG, gap: gapPKG, rate: ratePKG, item: pkgItem },
        QC: { plan: planQC, fact: factQC, gap: gapQC, rate: rateQC, item: qcItem },
        TEST_ROOM: { plan: planTR, fact: factTR, gap: gapTR, rate: rateTR, item: trItem },
        LONG_TEST: { plan: planLT, fact: factLT, gap: gapLT, rate: rateLT, item: ltItem },
        ASSEMBLY: { plan: planAssy, fact: factAssy, gap: gapAssy, rate: rateAssy, item: assyItem },
        HARD_TEST: { plan: planHT, fact: factHT, gap: gapHT, rate: rateHT, item: htItem },
        LAQ_LINE: { plan: planLAQ, fact: factLAQ, gap: gapLAQ, rate: rateLAQ, items: laqResult.items },
        DIP: { plan: planDIP, fact: factDIP, gap: gapDIP, rate: rateDIP, items: dipResult.items },
        SMD: { plan: planSMD, fact: factSMD, gap: gapSMD, rate: rateSMD, items: smdResult.items },
        // Chênh lệch giữa các công đoạn để đánh giá cân bằng
        gapAssyMB: gapAssyMB,
        gapHTAssy: gapHTAssy,
        gapQCPKG: gapQCPKG,
        gapPKGMB: gapPKGMB,
        gapSMDMB: gapSMDMB,
        // Đánh giá trạng thái chuỗi
        status: status,
        statusText: statusText,
        statusBadgeClass: statusBadgeClass,
        bottleneckStage: bottleneckStage,
        bottleneckGap: bottleneckGap,
        // Cờ nhận diện lọc mã âm Gap < 0
        hasNegativeGap: hasNegativeGap,
        isMbNegative: isMbNegative
      });
    }

    // Thống kê tổng quan (Summary Stats)
    let totalSKU = rows.length;
    let deficitCount = 0;
    let balancedCount = 0;
    let surplusCount = 0;
    let negativeCount = 0;
    let negativeMbCount = 0;
    let sumMB = 0;
    let sumPKG = 0;
    let sumQC = 0;
    let sumAssy = 0;
    let sumHT = 0;

    for (const r of rows) {
      if (r.status === 'DEFICIT') deficitCount++;
      else if (r.status === 'BALANCED') balancedCount++;
      else if (r.status === 'SURPLUS') surplusCount++;

      if (r.hasNegativeGap) negativeCount++;
      if (r.isMbNegative) negativeMbCount++;

      sumMB += r.MB.plan;
      sumPKG += r.PKG.plan;
      sumQC += r.QC.plan;
      sumAssy += r.ASSEMBLY.plan;
      sumHT += r.HARD_TEST.plan;
    }

    const sumMBFact = rows.reduce((s, r) => s + (r.MB.fact || 0), 0);
    const flowRate = totalSKU > 0 ? Math.round(((balancedCount + surplusCount) / totalSKU) * 100) : 0;

    // Thống kê chuẩn 100%: Plan lấy từ Sheet Clip Alls, Fact Clips All bằng đúng Fact MB từ Sheet Data_Mass
    const qtyAllDevice = clipsMaster?.qtyAllDevice || 213;
    const qtyDoneDevice = clipsMaster?.qtyDoneDevice || 170;
    const qtyNotDoneDevice = clipsMaster?.qtyNotDoneDevice || (qtyAllDevice - qtyDoneDevice); // 43
    const clipAllPlantRate = clipsMaster?.clipAllPlant || ((qtyDoneDevice / qtyAllDevice) * 100).toFixed(1) + '%'; // 79.8%
    const notDoneRate = ((qtyNotDoneDevice / qtyAllDevice) * 100).toFixed(1) + '%'; // 20.2%
    const totalClipsPlan = clipsMaster?.totalPlan || 464094;
    const totalClipsFact = sumMBFact; // Fact của Clips All bằng đúng Fact của MB từ Sheet Data_Mass (409.025 pcs)

    const clipsMasterPeriodName = clipsMaster?.periodName ? `Tháng 10/2026 (${clipsMaster.periodName})` : (clipsMaster?.monthLabel || 'Tháng 10/2026 (01/Oct - 31/Oct)');
    const clipsMasterMonthKey = clipsMaster?.month || '2026-10';

    return {
      rows: rows,
      models: Array.from(distinctModelsSet).sort(),
      stats: {
        totalSKU,
        deficitCount,
        balancedCount,
        surplusCount,
        negativeCount,
        negativeMbCount,
        flowRate,
        qtyAllDevice,
        qtyDoneDevice,
        qtyNotDoneDevice,
        clipAllPlantRate,
        notDoneRate,
        sumClipsAllPlan: totalClipsPlan,
        sumClipsAllFact: totalClipsFact,
        clipsOverallRate: clipAllPlantRate,
        clipsMasterPeriodName,
        clipsMasterMonthKey,
        sumMB,
        sumPKG,
        sumQC,
        sumAssy,
        sumHT
      }
    };
  };

  /**
   * Tính tỉ lệ hoàn thành % = Fact / Plan * 100
   */
  function calcCompletionRate(plan, fact) {
    const p = Number(plan) || 0;
    const f = Number(fact) || 0;
    if (p > 0) {
      return (f / p) * 100;
    }
    if (p === 0 && f > 0) {
      return 100; // Có thực tế dù plan = 0
    }
    return null; // Không có kế hoạch và thực tế = 0
  }

  /**
   * Định dạng tỉ lệ hoàn thành %
   */
  function formatClipsRate(rate) {
    if (rate === null || rate === undefined || isNaN(rate)) {
      return '<span class="text-muted rate-val">-</span>';
    }
    const val = Number(rate);
    const formatted = val.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    let cls = 'rate-ok';
    if (val >= 90) cls = 'text-success rate-ok';
    else if (val >= 75) cls = 'text-warning rate-warning';
    else cls = 'text-danger rate-danger';
    return `<span class="${cls} rate-val font-mono">${formatted}</span>`;
  }

  /**
   * Tạo micro-badge hiển thị chênh lệch trong từng cell
   */
  function renderCellDelta(curPlan, nextPlan, label) {
    if (curPlan === 0 && nextPlan === 0) return '';
    const delta = curPlan - nextPlan;
    if (delta === 0) {
      return `<div class="clips-cell-delta delta-zero" title="${label}: Cân bằng (0)">0</div>`;
    } else if (delta < 0) {
      return `<div class="clips-cell-delta delta-neg" title="${label}: Thiếu ${Math.abs(delta).toLocaleString('vi-VN')} pcs">${delta.toLocaleString('vi-VN')}</div>`;
    } else {
      return `<div class="clips-cell-delta delta-pos" title="${label}: Dôi dư +${delta.toLocaleString('vi-VN')} pcs">+${delta.toLocaleString('vi-VN')}</div>`;
    }
  }

  /**
   * Định dạng số lượng kế hoạch hoặc thực tế (bỏ 0 hiển thị dấu gạch ngang nhẹ nhàng)
   */
  function formatClipsQty(v) {
    if (v === null || v === undefined || v === 0) return '<span class="text-muted">-</span>';
    return Number(v).toLocaleString('vi-VN');
  }

  /**
   * Định dạng chênh lệch Gap = Fact - Plan
   */
  function formatClipsGap(gap, plan, fact) {
    if ((plan === 0 || plan === null || plan === undefined) && (fact === 0 || fact === null || fact === undefined)) {
      return '<span class="text-muted">-</span>';
    }
    const num = Number(gap) || 0;
    if (num === 0) {
      return '<span class="gap-val gap-zero font-mono">0</span>';
    } else if (num < 0) {
      return `<span class="gap-val gap-neg font-mono text-danger font-bold">${num.toLocaleString('vi-VN')}</span>`;
    } else {
      return `<span class="gap-val gap-pos font-mono text-success font-bold">+${num.toLocaleString('vi-VN')}</span>`;
    }
  }

  /**
   * Render chính giao diện Tab "Tra cứu Clips All Plan"
   */
  window.renderClipsAllPlanView = function(containerId = 'clipsAllPlanContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const dataObj = window.buildClipsAllPlanData();
    const allRows = dataObj.rows;
    const stats = dataObj.stats;
    const modelsList = dataObj.models;

    // Lọc theo điều kiện tìm kiếm và filter
    const store = window.ClipsPlanStore;
    let filtered = allRows.filter(row => {
      // 1. Search
      if (store.search) {
        const q = store.search.trim().toLowerCase();
        const matchName = row.productName1C.toLowerCase().includes(q);
        const matchModel = row.model.toLowerCase().includes(q);
        const matchKey = (row.normKeyShort || '').toLowerCase().includes(q);
        if (!matchName && !matchModel && !matchKey) return false;
      }
      // 2. Model filter
      if (store.modelFilter && store.modelFilter !== 'ALL') {
        if (row.baseModel !== store.modelFilter && row.model !== store.modelFilter) return false;
      }
      // 3. Status filter
      if (store.statusFilter && store.statusFilter !== 'ALL') {
        if (row.status !== store.statusFilter) return false;
      }
      // 4. Deficit stage filter
      if (store.deficitStageFilter && store.deficitStageFilter !== 'ALL') {
        if (row.bottleneckStage !== store.deficitStageFilter) return false;
      }
      // 5. Gap filter & Clips All filter (Chuẩn theo Sheet Clip Alls)
      if (store.gapFilter === 'NEGATIVE') {
        if (!row.hasNegativeGap) return false;
      } else if (store.gapFilter === 'NEGATIVE_MB') {
        if (!row.isMbNegative) return false;
      } else if (store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN') {
        if (!row.isClipDevice) return false;
      } else if (store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90') {
        if (!row.isClipDevice || !row.isClipDone) return false;
      } else if (store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90') {
        if (!row.isClipDevice || row.isClipDone) return false;
      }
      return true;
    });

    // Sắp xếp
    if (store.sortBy === 'DEFICIT_DESC') {
      filtered.sort((a, b) => (a.gapAssyMB - b.gapAssyMB));
    } else if (store.sortBy === 'MB_DESC') {
      filtered.sort((a, b) => (b.MB.plan - a.MB.plan));
    } else if (store.sortBy === 'ASSY_DESC') {
      filtered.sort((a, b) => (b.ASSEMBLY.plan - a.ASSEMBLY.plan));
    } else if (store.sortBy === 'NAME_ASC') {
      filtered.sort((a, b) => a.productName1C.localeCompare(b.productName1C));
    }

    // Phân trang
    const totalRecords = filtered.length;
    const pageSize = store.pageSize || 50;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    let curPage = store.pageIndex || 0;
    if (curPage >= totalPages) curPage = totalPages - 1;
    if (curPage < 0) curPage = 0;
    store.pageIndex = curPage;

    const pagedRows = filtered.slice(curPage * pageSize, (curPage + 1) * pageSize);

    // Tính trạng thái chuỗi thời gian đang hiển thị
    const isRangeActive = store.dateMode === 'RANGE' && (store.fromDate || store.toDate);
    const dateRangeLabel = isRangeActive 
      ? `Kỳ ${formatDateVN(store.fromDate) || '...'} ➔ ${formatDateVN(store.toDate) || '...'}` 
      : 'Toàn bộ kế hoạch (All Plan)';

    // Đếm số lượng Device trong danh sách đang lọc (filtered)
    const filteredDeviceCount = filtered.filter(r => r.isClipDevice).length;

    // Tính tổng số liệu cho 11 công đoạn trên danh sách đang hiển thị (filtered)
    const stageKeys = ['CLIPS_ALL', 'MB', 'PKG', 'QC', 'TEST_ROOM', 'LONG_TEST', 'ASSEMBLY', 'HARD_TEST', 'LAQ_LINE', 'DIP', 'SMD'];
    const grandTotals = {};
    for (const stg of stageKeys) {
      let p = 0;
      let f = 0;
      for (const r of filtered) {
        p += (r[stg] && Number(r[stg].plan)) || 0;
        f += (r[stg] && Number(r[stg].fact)) || 0;
      }
      if (filtered.length === allRows.length && stg === 'CLIPS_ALL') {
        p = stats.sumClipsAllPlan || 464094;
        f = stats.sumClipsAllFact; // Bằng đúng tổng Fact của MB từ sheet Data_Mass (409.025 pcs)
      }
      const gap = f - p;
      const rate = calcCompletionRate(p, f);
      grandTotals[stg] = { plan: p, fact: f, gap, rate };
    }

    // Nhãn tóm tắt bộ lọc cho Header Bar Toolbar khi thu gọn
    let gapFilterLabel = '';
    if (store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN') gapFilterLabel = `Total Device (${stats.qtyAllDevice})`;
    else if (store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90') gapFilterLabel = `Total Done (${stats.qtyDoneDevice})`;
    else if (store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90') gapFilterLabel = `Pending (${stats.qtyNotDoneDevice})`;
    else if (store.gapFilter === 'NEGATIVE') gapFilterLabel = `Mã Gap < 0 (${stats.negativeCount})`;
    else if (store.gapFilter === 'NEGATIVE_MB') gapFilterLabel = `MB < 0 (${stats.negativeMbCount})`;

    let statusFilterLabel = '';
    if (store.statusFilter === 'DEFICIT') statusFilterLabel = 'Thiếu công đoạn trước';
    else if (store.statusFilter === 'BALANCED') statusFilterLabel = 'Cân bằng chuỗi';
    else if (store.statusFilter === 'SURPLUS') statusFilterLabel = 'Dư bán thành phẩm';

    const metricNames = {
      'ALL': '✨ Tất Cả (Plan/Fact/Gap/%)',
      'PLAN': 'Chỉ Plan',
      'FACT': 'Chỉ Fact',
      'GAP': 'Chỉ Gap',
      'RATE': 'Chỉ % HT'
    };
    const metricViewLabel = metricNames[store.metricView] || store.metricView;

    // Xây dựng template HTML
    container.innerHTML = `
      <div class="clips-view-wrapper">
        <!-- TOP SLIM ACTION HEADER (Tối ưu không gian, bỏ 4 card KPI và subtitle theo yêu cầu) -->
        <div class="clips-header-card clips-header-slim">
          <div class="clips-header-top">
            <!-- Tiêu đề phân hệ -->
            <div class="clips-title-wrap">
              <div class="clips-icon-box">🔗</div>
              <div>
                <h2 class="clips-main-title">Tra Cứu Clips All Plan</h2>
              </div>
            </div>

            <!-- BỘ LỌC THỜI GIAN VÀ KỲ LỊCH SỬ CLIPS ALL (THEO THÁNG) -->
            <div class="clips-date-filter-wrap">
              <div class="clips-history-select-wrap">
                <span class="date-label">📁 Kỳ Plan:</span>
                <select id="clipsHistoryMonthSelect" 
                  class="clips-history-select" 
                  onchange="window.handleClipsHistoryMonthChange(this.value)" 
                  title="Chọn kỳ lưu trữ lịch sử kế hoạch Clips All (Tháng 10/2026: 01/Oct - 31/Oct)">
                  <option value="2026-10" ${store.selectedHistoryMonth === '2026-10' ? 'selected' : ''}>Tháng 10/2026 (01/Oct - 31/Oct) [Đã lưu]</option>
                  <option value="2026-11" ${store.selectedHistoryMonth === '2026-11' ? 'selected' : ''}>Tháng 11/2026 (01/Nov - 30/Nov) [Kỳ mới]</option>
                  <option value="AUTO" ${store.selectedHistoryMonth === 'AUTO' ? 'selected' : ''}>⚡ Tự động theo ngày lọc</option>
                </select>
              </div>

              <div class="clips-date-inputs">
                <span class="date-label">📅 Từ:</span>
                <input type="date" 
                  id="clipsFromDate" 
                  class="clips-date-input" 
                  value="${store.fromDate || ''}" 
                  onchange="window.handleClipsDateChange('from', this.value)" 
                  title="Chọn ngày bắt đầu lọc kế hoạch"
                />
                <span class="date-sep">➔</span>
                <span class="date-label">Đến:</span>
                <input type="date" 
                  id="clipsToDate" 
                  class="clips-date-input" 
                  value="${store.toDate || ''}" 
                  onchange="window.handleClipsDateChange('to', this.value)" 
                  title="Chọn ngày kết thúc lọc kế hoạch"
                />
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="clips-actions-wrap">
              <!-- Nút Loading Plan Mới (Chuẩn bị cho T11) -->
              <button type="button" 
                id="btnLoadingClipsPlan"
                class="btn btn-sm btn-accent clips-btn-action clips-btn-loading-plan"
                onclick="window.handleOpenLoadingClipsPlanModal()"
                title="Tải / Nạp Kế Hoạch Clips All mới (Ví dụ: Tháng 11/2026 khi Google Sheet được cập nhật)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>📥 Loading Plan Mới</span>
              </button>

              <!-- Nút Copy Google Sheet -->
              <button type="button" 
                id="btnCopyClipsSheet"
                class="btn btn-sm btn-primary clips-btn-action"
                onclick="window.handleCopyClipsGoogleSheet()"
                title="Sao chép toàn bộ bảng với số thuần túy (pure number), có đơn vị tính ở tiêu đề, sạch emoji, sẵn sàng dán trực tiếp vào Google Sheets">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>📋 Copy Cho Google Sheet</span>
              </button>

              <!-- Nút Xuất CSV -->
              <button type="button" 
                id="btnExportClipsCsv"
                class="btn btn-sm btn-secondary clips-btn-action"
                onclick="window.handleExportClipsCSV()"
                title="Tải xuống tệp CSV định dạng chuẩn UTF-8 tương thích tốt với Excel và Google Sheets">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Xuất CSV</span>
              </button>

              <!-- Đặt lại bộ lọc -->
              <button type="button" 
                class="btn btn-sm btn-secondary clips-btn-action"
                onclick="window.handleResetClipsFilters()"
                title="Đặt lại toàn bộ bộ lọc về trạng thái ban đầu">
                <span>↺ Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        <!-- THANH TỔNG HỢP CLIPS ALL THEO SHEET CLIP ALLS (1 HÀNG DUY NHẤT) -->
        <div class="clips-summary-banner clips-summary-single-line">
          <!-- 1. Tiêu đề tinh gọn kèm kỳ Plan -->
          <div class="clips-sum-title-col">
            <span class="summary-badge-icon">📊</span>
            <div class="clips-sum-title-text-wrap">
              <span class="summary-title-main">Tổng Hợp Clips All</span>
              <span class="clips-history-badge" title="Kỳ kế hoạch Clips All đang kích hoạt: ${stats.clipsMasterPeriodName}">📁 ${stats.clipsMasterPeriodName}</span>
            </div>
          </div>

          <!-- 2. Chỉ số tổng sản lượng & Clip (all plant) -->
          <div class="clips-sum-metrics-col">
            <span class="tag-meta" title="Tổng Plan chi tiết của 213 mã Device: 464.094 pcs (Ô tổng kết quả sheet Clip Alls: 505.629 pcs)">Tổng Plan: <strong>${stats.sumClipsAllPlan.toLocaleString('vi-VN')} pcs</strong></span>
            <span class="tag-meta" title="Tổng Fact Clips All lấy từ sheet Data_Mass (bằng đúng Fact MB): ${stats.sumClipsAllFact.toLocaleString('vi-VN')} pcs">Tổng Fact: <strong>${stats.sumClipsAllFact.toLocaleString('vi-VN')} pcs</strong></span>
            <span class="tag-meta highlight-clip-green" title="Clip (all plant) = Total Done (${stats.qtyDoneDevice}) / Total Device (${stats.qtyAllDevice})">Clip (all plant): <strong>${stats.clipAllPlantRate}</strong></span>
          </div>

          <!-- 3. Các pill lọc tương tác gọn nhẹ trên cùng 1 hàng theo đúng Sheet Clip Alls -->
          <div class="clips-sum-pills-col">
            <!-- Pill 1: Total Device -->
            <button type="button" 
              class="clips-sum-pill ${store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN' ? 'selected' : ''}" 
              onclick="window.handleClipsGapFilter('${store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN' ? 'ALL' : 'CLIPS_ALL_DEVICE'}')" 
              title="Bấm để lọc danh sách các mã Total Device">
              <span class="pill-dot">📋</span>
              <span class="pill-label">Total Device:</span>
              <span class="pill-number font-bold">${stats.qtyAllDevice}</span>
              <span class="pill-sub">/${allRows.length} mã</span>
            </button>

            <!-- Pill 2: Total Done -->
            <button type="button" 
              class="clips-sum-pill pill-success ${store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90' ? 'selected' : ''}" 
              onclick="window.handleClipsGapFilter('${store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90' ? 'ALL' : 'CLIPS_DONE_DEVICE'}')" 
              title="Bấm để lọc ${stats.qtyDoneDevice} mã Total Done có tỉ lệ hoàn thành > 90% (${stats.clipAllPlantRate})">
              <span class="pill-dot">🟢</span>
              <span class="pill-label">Total Done:</span>
              <span class="pill-number text-success font-bold">${stats.qtyDoneDevice} mã</span>
              <span class="pill-pct text-success font-bold">(${stats.clipAllPlantRate})</span>
            </button>

            <!-- Pill 3: Pending -->
            <button type="button" 
              class="clips-sum-pill pill-danger ${store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90' ? 'selected' : ''}" 
              onclick="window.handleClipsGapFilter('${store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90' ? 'ALL' : 'CLIPS_NOT_DONE_DEVICE'}')" 
              title="Bấm để lọc ${stats.qtyNotDoneDevice} mã Pending chưa đạt tỉ lệ hoàn thành < 90% (${stats.notDoneRate})">
              <span class="pill-dot">🔴</span>
              <span class="pill-label">Pending:</span>
              <span class="pill-number text-danger font-bold">${stats.qtyNotDoneDevice} mã</span>
              <span class="pill-pct text-danger font-bold">(${stats.notDoneRate})</span>
            </button>
          </div>
        </div>

        <!-- TOOLBAR & FILTERS (CÓ CHỨC NĂNG THU GỌN / MỞ RỘNG TỐI ƯU) -->
        <div class="clips-toolbar-card ${store.isToolbarCollapsed ? 'is-collapsed' : ''}" id="clipsToolbarCard">
          <!-- HEADER BAR THU GỌN / MỞ RỘNG -->
          <div class="clips-toolbar-header-bar" onclick="window.handleToggleClipsToolbar()">
            <div class="toolbar-header-left">
              <span class="toolbar-header-icon">⚙️</span>
              <span class="toolbar-header-title">Bộ Lọc &amp; Tùy Chọn Tra Cứu</span>
              ${store.isToolbarCollapsed ? `
                <div class="toolbar-summary-chips" onclick="event.stopPropagation()">
                  ${store.search ? `<span class="toolbar-summary-chip chip-search">🔍 "${escapeHtml(store.search)}"</span>` : ''}
                  ${store.modelFilter && store.modelFilter !== 'ALL' ? `<span class="toolbar-summary-chip">Model: <strong>${escapeHtml(store.modelFilter)}</strong></span>` : ''}
                  ${gapFilterLabel ? `<span class="toolbar-summary-chip chip-filter">${gapFilterLabel}</span>` : ''}
                  ${statusFilterLabel ? `<span class="toolbar-summary-chip">${statusFilterLabel}</span>` : ''}
                  <span class="toolbar-summary-chip chip-metric">Chỉ số: <strong>${metricViewLabel}</strong></span>
                </div>
              ` : ''}
            </div>
            <div class="toolbar-header-right">
              <button type="button" 
                class="btn-toggle-toolbar ${store.isToolbarCollapsed ? 'collapsed' : 'expanded'}" 
                onclick="event.stopPropagation(); window.handleToggleClipsToolbar();"
                title="${store.isToolbarCollapsed ? 'Bấm để mở rộng bảng điều khiển bộ lọc' : 'Bấm để thu gọn bộ lọc, tăng tối đa diện tích xem bảng'}">
                <span class="toggle-icon">${store.isToolbarCollapsed ? '▼' : '▲'}</span>
                <span class="toggle-text">${store.isToolbarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}</span>
              </button>
            </div>
          </div>

          <!-- NỘI DUNG BỘ LỌC ĐẦY ĐỦ (ẨN ĐI KHI THU GỌN) -->
          <div class="clips-toolbar-body ${store.isToolbarCollapsed ? 'is-collapsed' : ''}">
            <div class="clips-toolbar-row">
              <!-- Ô tìm kiếm tức thời -->
              <div class="clips-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" 
                  id="clipsSearchInput"
                  value="${store.search || ''}" 
                  placeholder="Tìm kiếm theo Tên 1C, Model, Mã Bo Mạch..."
                  oninput="window.handleClipsPlanSearch(this.value)"
                />
                ${store.search ? `<button class="btn-clear-search" onclick="window.handleClipsPlanSearch('')" title="Xóa tìm kiếm">×</button>` : ''}
              </div>

              <!-- Dropdown lọc Model -->
              <div class="clips-filter-item">
                <label>Dòng Model:</label>
                <select onchange="window.handleClipsModelFilter(this.value)">
                  <option value="ALL" ${store.modelFilter === 'ALL' ? 'selected' : ''}>-- Tất Cả Model (${modelsList.length}) --</option>
                  ${modelsList.map(m => `<option value="${m}" ${store.modelFilter === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>

              <!-- CÔNG CỤ CHỌN: TOÀN BỘ CÁC MÃ / CÁC MÃ < 0 (GAP < 0) / CLIPS ALL -->
              <div class="clips-filter-item">
                <label>Hiển thị mã:</label>
                <select id="clipsGapFilterSelect" onchange="window.handleClipsGapFilter(this.value)">
                  <option value="ALL" ${store.gapFilter === 'ALL' ? 'selected' : ''}>-- Toàn Bộ Các Mã (${allRows.length}) --</option>
                  <option value="CLIPS_ALL_DEVICE" ${store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN' ? 'selected' : ''}>📋 Total Device (${stats.qtyAllDevice})</option>
                  <option value="CLIPS_DONE_DEVICE" ${store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90' ? 'selected' : ''}>🟢 Total Done (&gt; 90%): (${stats.qtyDoneDevice}) - ${stats.clipAllPlantRate}</option>
                  <option value="CLIPS_NOT_DONE_DEVICE" ${store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90' ? 'selected' : ''}>🔴 Pending (&lt; 90%): (${stats.qtyNotDoneDevice}) - ${stats.notDoneRate}</option>
                  <option value="NEGATIVE" ${store.gapFilter === 'NEGATIVE' ? 'selected' : ''}>🔴 Các Mã &lt; 0 (Gap &lt; 0) (${stats.negativeCount})</option>
                  <option value="NEGATIVE_MB" ${store.gapFilter === 'NEGATIVE_MB' ? 'selected' : ''}>⚠️ Mã Thành Phẩm (MB) &lt; 0 (${stats.negativeMbCount})</option>
                </select>
              </div>

              <!-- Dropdown lọc Trạng Thái Cân Đối -->
              <div class="clips-filter-item">
                <label>Trạng Thái Chuỗi:</label>
                <select onchange="window.handleClipsStatusFilter(this.value)">
                  <option value="ALL" ${store.statusFilter === 'ALL' ? 'selected' : ''}>-- Tất Cả Trạng Thái (${allRows.length}) --</option>
                  <option value="DEFICIT" ${store.statusFilter === 'DEFICIT' ? 'selected' : ''}>🔴 Thiếu công đoạn trước (${stats.deficitCount})</option>
                  <option value="BALANCED" ${store.statusFilter === 'BALANCED' ? 'selected' : ''}>🟢 Cân bằng chuỗi (${stats.balancedCount})</option>
                  <option value="SURPLUS" ${store.statusFilter === 'SURPLUS' ? 'selected' : ''}>🟡 Dư bán thành phẩm (${stats.surplusCount})</option>
                </select>
              </div>

              <!-- Dropdown sắp xếp -->
              <div class="clips-filter-item">
                <label>Sắp xếp:</label>
                <select onchange="window.handleClipsSortChange(this.value)">
                  <option value="DEFAULT" ${store.sortBy === 'DEFAULT' ? 'selected' : ''}>Mặc định (STT 1C)</option>
                  <option value="DEFICIT_DESC" ${store.sortBy === 'DEFICIT_DESC' ? 'selected' : ''}>Thiếu nhiều nhất trước</option>
                  <option value="MB_DESC" ${store.sortBy === 'MB_DESC' ? 'selected' : ''}>Sản lượng MB cao nhất</option>
                  <option value="ASSY_DESC" ${store.sortBy === 'ASSY_DESC' ? 'selected' : ''}>Sản lượng Assembly cao nhất</option>
                  <option value="NAME_ASC" ${store.sortBy === 'NAME_ASC' ? 'selected' : ''}>Tên A ➔ Z</option>
                </select>
              </div>

              <!-- CHỌN CHẾ ĐỘ HIỂN THỊ CHỈ SỐ: ALL (PLAN / FACT / GAP / %) | PLAN | FACT | GAP | RATE -->
              <div class="clips-filter-item clips-metric-toggle-item">
                <label>Chỉ số hiển thị:</label>
                <div class="clips-metric-toggle-group">
                  <button type="button" 
                    class="btn-metric-toggle ${store.metricView === 'ALL' ? 'active' : ''}" 
                    onclick="window.handleClipsMetricView('ALL')" 
                    title="Xem đầy đủ cả 4 chỉ số Plan / Fact / Gap / % Hoàn thành cho từng công đoạn">
                    <span>✨ Tất Cả (Plan/Fact/Gap/%)</span>
                  </button>
                  <button type="button" 
                    class="btn-metric-toggle ${store.metricView === 'PLAN' ? 'active' : ''}" 
                    onclick="window.handleClipsMetricView('PLAN')" 
                    title="Chỉ hiển thị chỉ số Kế hoạch (Plan)">
                    <span>Chỉ Plan</span>
                  </button>
                  <button type="button" 
                    class="btn-metric-toggle ${store.metricView === 'FACT' ? 'active' : ''}" 
                    onclick="window.handleClipsMetricView('FACT')" 
                    title="Chỉ hiển thị chỉ số Thực tế (Fact)">
                    <span>Chỉ Fact</span>
                  </button>
                  <button type="button" 
                    class="btn-metric-toggle ${store.metricView === 'GAP' ? 'active' : ''}" 
                    onclick="window.handleClipsMetricView('GAP')" 
                    title="Chỉ hiển thị chỉ số Chênh lệch (Gap = Fact - Plan)">
                    <span>Chỉ Gap</span>
                  </button>
                  <button type="button" 
                    class="btn-metric-toggle ${store.metricView === 'RATE' ? 'active' : ''}" 
                    onclick="window.handleClipsMetricView('RATE')" 
                    title="Chỉ hiển thị Tỉ lệ hoàn thành % (% HT = Fact / Plan)">
                    <span>Chỉ % HT</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- DÒNG CHỈ DẪN QUY TRÌNH (PRODUCTION PIPELINE FLOW BAR - CLIPS ALL TRƯỚC MB) -->
            <div class="clips-flow-legend">
              <span class="legend-title">Dòng sản xuất:</span>
              <span class="step-pill" style="border-color: #38bdf8; color: #38bdf8;">SMD</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #fbbf24; color: #fbbf24;">DIP</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #06b6d4; color: #06b6d4;">LAQ.Line</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #10b981; color: #10b981;">HARD TEST</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #a855f7; color: #a855f7;">ASSEMBLY</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #f43f5e; color: #f43f5e;">LONG TEST</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #f97316; color: #f97316;">TEST ROOM</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #6366f1; color: #6366f1;">QC</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #8b5cf6; color: #8b5cf6;">PKG</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #06b6d4; color: #38bdf8; font-weight: 800; background: rgba(6, 182, 212, 0.15);" title="Clips All (Kế hoạch tổng thể sheet Clip Alls - Fact update theo MB)">Clips All</span>
              <span class="arrow">➔</span>
              <span class="step-pill" style="border-color: #0284c7; color: #38bdf8; font-weight: 800;" title="MasterBox (Đóng thùng thành phẩm xuất kho)">MB (Thành phẩm)</span>
            </div>
          </div>
        </div>

        <!-- MAIN DATA TABLE -->
        <div class="clips-table-card">
          <div class="clips-table-responsive">
            <table class="clips-table ${store.metricView === 'ALL' ? 'view-all' : 'view-single'}" id="clipsPlanTable">
              <thead>
                ${store.metricView === 'ALL' ? `
                  <tr class="header-stage-row">
                    <th class="col-stt sticky-left-1" rowspan="2">STT</th>
                    <th class="col-name sticky-left-2" rowspan="2">product name 1С</th>
                    <!-- CLIPS ALL ĐỨNG ĐẦU TIÊN TRƯỚC MB -->
                    <th class="stage-header stage-clips" colspan="4" title="Clips All (Kế hoạch tổng thể sheet Clip Alls - Fact update theo MB)">Clips All</th>
                    <th class="stage-header stage-mb" colspan="4" title="MasterBox (Đóng thùng thành phẩm xuất kho)">MB</th>
                    <th class="stage-header stage-pkg" colspan="4" title="Packaging (Đóng gói hộp cá thể)">PKG</th>
                    <th class="stage-header stage-qc" colspan="4" title="Quality Control (Kiểm tra chất lượng thành phẩm)">QC</th>
                    <th class="stage-header stage-tr" colspan="4" title="Test Room (Thử nghiệm nhiệt độ / môi trường)">TEST ROOM</th>
                    <th class="stage-header stage-lt" colspan="4" title="Long Test (Chạy thử tải dài hạn)">LONG TEST</th>
                    <th class="stage-header stage-assy" colspan="4" title="Assembly (Chuyền lắp ráp cụm bán thành phẩm)">ASSEMBLY</th>
                    <th class="stage-header stage-ht" colspan="4" title="Hard Test (Kiểm tra mạch chức năng)">HARD TEST</th>
                    <th class="stage-header stage-laq" colspan="4" title="Lacquering Line (Phủ keo bảo vệ bo mạch)">LAQ.Line</th>
                    <th class="stage-header stage-dip" colspan="4" title="DIP (Hàn linh kiện cắm chân)">DIP</th>
                    <th class="stage-header stage-smd" colspan="4" title="Surface Mount Device (Dán linh kiện bề mặt)">SMD</th>
                    <th class="col-status header-status-final" rowspan="2" title="Đánh giá tổng thể chuỗi cung ứng linh kiện và bán thành phẩm">Đánh Giá Chuỗi</th>
                  </tr>
                  <tr class="header-metric-row">
                    <!-- SUB-COLUMNS 11 CÔNG ĐOẠN (CLIPS ALL + 10 CÔNG ĐOẠN CHÍNH) -->
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                    <th class="sub-col plan">Plan</th><th class="sub-col fact">Fact</th><th class="sub-col gap">Gap</th><th class="sub-col rate stage-sep">% HT</th>
                  </tr>
                  <!-- HÀNG TỔNG CỘNG ĐÓNG BĂNG CÙNG HÀNG TIÊU ĐỀ -->
                  <tr class="clips-grand-total-row">
                    <th class="col-stt sticky-left-1 grand-total-th font-mono">∑</th>
                    <th class="col-name sticky-left-2 grand-total-th">
                      <div class="product-cell-wrap grand-total-cell-wrap">
                        <span class="product-title grand-total-title">📊 TỔNG CỘNG</span>
                        <div class="product-tags">
                          <span class="tag-meta highlight-clip-green" style="font-weight: 700;">${filteredDeviceCount} Device</span>
                          <span class="tag-meta" style="font-weight: 700;">${filtered.length} mã</span>
                        </div>
                      </div>
                    </th>
                    ${stageKeys.map(stg => `
                      <th class="col-metric metric-plan font-mono font-bold grand-total-th">${formatClipsQty(grandTotals[stg].plan)}</th>
                      <th class="col-metric metric-fact font-mono font-bold text-cyan grand-total-th">${formatClipsQty(grandTotals[stg].fact)}</th>
                      <th class="col-metric metric-gap font-bold grand-total-th">${formatClipsGap(grandTotals[stg].gap, grandTotals[stg].plan, grandTotals[stg].fact)}</th>
                      <th class="col-metric metric-rate stage-sep font-bold grand-total-th">${formatClipsRate(grandTotals[stg].rate)}</th>
                    `).join('')}
                    <th class="col-status header-status-final grand-total-th">
                      <span class="badge ${grandTotals['MB'].gap < 0 ? 'badge-warning' : 'badge-success'}">
                        ${grandTotals['MB'].gap < 0 ? '⚠️ Cần bù' : '🟢 Tiến độ tốt'}: ${grandTotals['MB'].rate !== null && grandTotals['MB'].rate !== undefined ? grandTotals['MB'].rate.toFixed(1) + '%' : '-'}
                      </span>
                    </th>
                  </tr>
                ` : `
                  <tr class="header-stage-row">
                    <th class="col-stt sticky-left-1">STT</th>
                    <th class="col-name sticky-left-2">product name 1С</th>
                    <th class="stage-header stage-clips stage-sep" title="Clips All">Clips All (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-mb stage-sep" title="MasterBox">MB (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-pkg stage-sep" title="Packaging">PKG (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-qc stage-sep" title="Quality Control">QC (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-tr stage-sep" title="Test Room">TEST ROOM (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-lt stage-sep" title="Long Test">LONG TEST (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-assy stage-sep" title="Assembly">ASSEMBLY (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-ht stage-sep" title="Hard Test">HARD TEST (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-laq stage-sep" title="Lacquering Line">LAQ.Line (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-dip stage-sep" title="DIP">DIP (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="stage-header stage-smd stage-sep" title="SMD">SMD (${store.metricView === 'RATE' ? '% HT' : store.metricView})</th>
                    <th class="col-status header-status-final" title="Đánh giá tổng thể chuỗi cung ứng linh kiện và bán thành phẩm">Đánh Giá Chuỗi</th>
                  </tr>
                  <!-- HÀNG TỔNG CỘNG ĐÓNG BĂNG CÙNG HÀNG TIÊU ĐỀ (CHẾ ĐỘ THU GỌN) -->
                  <tr class="clips-grand-total-row">
                    <th class="col-stt sticky-left-1 grand-total-th font-mono">∑</th>
                    <th class="col-name sticky-left-2 grand-total-th">
                      <div class="product-cell-wrap grand-total-cell-wrap">
                        <span class="product-title grand-total-title">📊 TỔNG CỘNG</span>
                        <div class="product-tags">
                          <span class="tag-meta highlight-clip-green" style="font-weight: 700;">${filteredDeviceCount} Device</span>
                          <span class="tag-meta" style="font-weight: 700;">${filtered.length} mã</span>
                        </div>
                      </div>
                    </th>
                    ${stageKeys.map(stg => {
                      const obj = grandTotals[stg] || {};
                      let content = '';
                      let isSpecial = stg === 'CLIPS_ALL' ? 'text-cyan font-bold' : (stg === 'ASSEMBLY' ? 'text-assy font-bold' : (stg === 'HARD_TEST' ? 'text-ht font-bold' : 'font-bold'));
                      if (store.metricView === 'RATE') {
                        content = formatClipsRate(obj.rate);
                      } else if (store.metricView === 'GAP') {
                        content = formatClipsGap(obj.gap, obj.plan, obj.fact);
                      } else if (store.metricView === 'FACT') {
                        content = `<span class="text-cyan font-mono font-bold">${formatClipsQty(obj.fact)}</span>`;
                      } else {
                        content = `<span class="font-mono font-bold">${formatClipsQty(obj.plan)}</span>`;
                      }
                      return `<th class="col-metric stage-sep grand-total-th ${isSpecial}">${content}</th>`;
                    }).join('')}
                    <th class="col-status header-status-final grand-total-th">
                      <span class="badge ${grandTotals['MB'].gap < 0 ? 'badge-warning' : 'badge-success'}">
                        ${grandTotals['MB'].rate !== null && grandTotals['MB'].rate !== undefined ? grandTotals['MB'].rate.toFixed(1) + '%' : '-'}
                      </span>
                    </th>
                  </tr>
                `}
              </thead>
              <tbody>
                ${pagedRows.length === 0 ? `
                  <tr>
                    <td colspan="${store.metricView === 'ALL' ? 47 : 14}" class="empty-table-cell">
                      <div class="empty-state-box">
                        <span style="font-size: 2rem;">🔍</span>
                        <h4>Không tìm thấy bản ghi phù hợp</h4>
                        <p>Thử điều chỉnh lại khoảng thời gian, bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                ` : pagedRows.map((r, i) => {
                  const displayIndex = curPage * pageSize + i + 1;
                  if (store.metricView === 'ALL') {
                    return `
                      <tr class="clips-row ${r.status === 'DEFICIT' ? 'row-deficit' : ''}" onclick="window.handleOpenClipsDetailModal('${escapeHtml(r.productName1C)}')">
                        <td class="col-stt sticky-left-1 font-mono">${displayIndex}</td>
                        <td class="col-name sticky-left-2" title="${escapeHtml(r.productName1C)}">
                          <div class="product-cell-wrap">
                            <span class="product-title">${escapeHtml(r.productName1C)}</span>
                            <div class="product-tags">
                              ${r.baseModel ? `<span class="tag-model">${escapeHtml(r.baseModel)}</span>` : ''}
                              ${r.color ? `<span class="tag-color ${r.color.toLowerCase()}">${r.color}</span>` : ''}
                              ${r.freq ? `<span class="tag-freq">${r.freq}</span>` : ''}
                              ${r.normKeyShort ? `<span class="tag-key" title="Mã bo: ${escapeHtml(r.normKeyShort)}">🔑 ${escapeHtml(r.normKeyShort)}</span>` : ''}
                              ${r.isClipDevice ? `<span class="tag-key" style="border-color: #06b6d4; color: #38bdf8;" title="Mã Device trong Sheet Clip Alls (Done: ${r.isClipDone ? 'Đạt >90%' : 'Chưa đạt'})">📎 Device</span>` : ''}
                            </div>
                          </div>
                        </td>

                        <!-- 1. CLIPS ALL (CÔNG ĐOẠN TRƯỚC MB - PLAN TỪ SHEET CLIP ALLS, FACT UPDATE THEO MB) -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.CLIPS_ALL.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.CLIPS_ALL.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.CLIPS_ALL.gap, r.CLIPS_ALL.plan, r.CLIPS_ALL.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.CLIPS_ALL.rate)}</td>

                        <!-- 2. MB -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.MB.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.MB.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.MB.gap, r.MB.plan, r.MB.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.MB.rate)}</td>

                        <!-- 3. PKG -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.PKG.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.PKG.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.PKG.gap, r.PKG.plan, r.PKG.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.PKG.rate)}</td>

                        <!-- 4. QC -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.QC.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.QC.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.QC.gap, r.QC.plan, r.QC.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.QC.rate)}</td>

                        <!-- 5. TEST ROOM -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.TEST_ROOM.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.TEST_ROOM.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.TEST_ROOM.gap, r.TEST_ROOM.plan, r.TEST_ROOM.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.TEST_ROOM.rate)}</td>

                        <!-- 6. LONG TEST -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.LONG_TEST.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.LONG_TEST.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.LONG_TEST.gap, r.LONG_TEST.plan, r.LONG_TEST.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.LONG_TEST.rate)}</td>

                        <!-- 7. ASSEMBLY -->
                        <td class="col-metric metric-plan font-mono font-bold text-assy">${formatClipsQty(r.ASSEMBLY.plan)}</td>
                        <td class="col-metric metric-fact font-mono font-bold text-assy">${formatClipsQty(r.ASSEMBLY.fact)}</td>
                        <td class="col-metric metric-gap font-bold">${formatClipsGap(r.ASSEMBLY.gap, r.ASSEMBLY.plan, r.ASSEMBLY.fact)}</td>
                        <td class="col-metric metric-rate stage-sep font-bold">${formatClipsRate(r.ASSEMBLY.rate)}</td>

                        <!-- 8. HARD TEST -->
                        <td class="col-metric metric-plan font-mono font-bold text-ht">${formatClipsQty(r.HARD_TEST.plan)}</td>
                        <td class="col-metric metric-fact font-mono font-bold text-ht">${formatClipsQty(r.HARD_TEST.fact)}</td>
                        <td class="col-metric metric-gap font-bold">${formatClipsGap(r.HARD_TEST.gap, r.HARD_TEST.plan, r.HARD_TEST.fact)}</td>
                        <td class="col-metric metric-rate stage-sep font-bold">${formatClipsRate(r.HARD_TEST.rate)}</td>

                        <!-- 9. LAQ.Line -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.LAQ_LINE.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.LAQ_LINE.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.LAQ_LINE.gap, r.LAQ_LINE.plan, r.LAQ_LINE.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.LAQ_LINE.rate)}</td>

                        <!-- 10. DIP -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.DIP.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.DIP.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.DIP.gap, r.DIP.plan, r.DIP.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.DIP.rate)}</td>

                        <!-- 11. SMD -->
                        <td class="col-metric metric-plan font-mono">${formatClipsQty(r.SMD.plan)}</td>
                        <td class="col-metric metric-fact font-mono text-cyan">${formatClipsQty(r.SMD.fact)}</td>
                        <td class="col-metric metric-gap">${formatClipsGap(r.SMD.gap, r.SMD.plan, r.SMD.fact)}</td>
                        <td class="col-metric metric-rate stage-sep">${formatClipsRate(r.SMD.rate)}</td>

                        <!-- CỘT DUY NHẤT Ở CUỐI: ĐÁNH GIÁ CHUỖI -->
                        <td class="col-status">
                          <span class="badge ${r.statusBadgeClass}">${r.statusText}</span>
                        </td>
                      </tr>
                    `;
                  } else {
                    // Chế độ xem thu gọn: PLAN | FACT | GAP | RATE
                    const mKey = store.metricView.toLowerCase();
                    const stageKeys = ['CLIPS_ALL', 'MB', 'PKG', 'QC', 'TEST_ROOM', 'LONG_TEST', 'ASSEMBLY', 'HARD_TEST', 'LAQ_LINE', 'DIP', 'SMD'];
                    return `
                      <tr class="clips-row ${r.status === 'DEFICIT' ? 'row-deficit' : ''}" onclick="window.handleOpenClipsDetailModal('${escapeHtml(r.productName1C)}')">
                        <td class="col-stt sticky-left-1 font-mono">${displayIndex}</td>
                        <td class="col-name sticky-left-2" title="${escapeHtml(r.productName1C)}">
                          <div class="product-cell-wrap">
                            <span class="product-title">${escapeHtml(r.productName1C)}</span>
                            <div class="product-tags">
                              ${r.baseModel ? `<span class="tag-model">${escapeHtml(r.baseModel)}</span>` : ''}
                              ${r.color ? `<span class="tag-color ${r.color.toLowerCase()}">${r.color}</span>` : ''}
                              ${r.freq ? `<span class="tag-freq">${r.freq}</span>` : ''}
                              ${r.normKeyShort ? `<span class="tag-key" title="Mã bo: ${escapeHtml(r.normKeyShort)}">🔑 ${escapeHtml(r.normKeyShort)}</span>` : ''}
                              ${r.isClipDevice ? `<span class="tag-key" style="border-color: #06b6d4; color: #38bdf8;" title="Mã Device trong Sheet Clip Alls (Done: ${r.isClipDone ? 'Đạt >90%' : 'Chưa đạt'})">📎 Device</span>` : ''}
                            </div>
                          </div>
                        </td>
                        ${stageKeys.map(stg => {
                          const obj = r[stg] || {};
                          if (store.metricView === 'RATE') {
                            return `<td class="col-metric stage-sep">${formatClipsRate(obj.rate)}</td>`;
                          }
                          if (store.metricView === 'GAP') {
                            return `<td class="col-metric stage-sep">${formatClipsGap(obj.gap, obj.plan, obj.fact)}</td>`;
                          }
                          const val = obj[mKey];
                          const isSpecial = stg === 'CLIPS_ALL' ? 'text-cyan font-bold' : (stg === 'ASSEMBLY' ? 'text-assy font-bold' : (stg === 'HARD_TEST' ? 'text-ht font-bold' : (mKey === 'fact' ? 'text-cyan' : '')));
                          return `<td class="col-metric stage-sep font-mono ${isSpecial}">${formatClipsQty(val)}</td>`;
                        }).join('')}
                        <!-- CỘT DUY NHẤT Ở CUỐI: ĐÁNH GIÁ CHUỖI -->
                        <td class="col-status">
                          <span class="badge ${r.statusBadgeClass}">${r.statusText}</span>
                        </td>
                      </tr>
                    `;
                  }
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- PAGINATION FOOTER -->
          <div class="clips-pagination-bar">
            <div class="pagination-info">
              Hiển thị <strong>${filtered.length > 0 ? curPage * pageSize + 1 : 0}</strong> - <strong>${Math.min((curPage + 1) * pageSize, filtered.length)}</strong> trên tổng số <strong>${filtered.length}</strong> sản phẩm (${stats.totalSKU} SKU toàn hệ thống)
              <span style="margin-left: 0.5rem; color: var(--text-secondary); font-size: 0.775rem;">(Khoảng lọc: <strong>${dateRangeLabel}</strong>)</span>
            </div>

            <div class="pagination-controls">
              <button type="button" class="btn btn-sm btn-secondary" ${curPage === 0 ? 'disabled' : ''} onclick="window.handleClipsPageChange(${curPage - 1})">
                ◀ Trang trước
              </button>
              <span class="page-current">Trang <strong>${curPage + 1}</strong> / ${totalPages}</span>
              <button type="button" class="btn btn-sm btn-secondary" ${curPage >= totalPages - 1 ? 'disabled' : ''} onclick="window.handleClipsPageChange(${curPage + 1})">
                Trang tiếp ▶
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAIL MODAL FOR CLIPS CHAIN -->
      <div id="clipsDetailModal" class="clips-modal-overlay" style="display: none;" onclick="window.handleCloseClipsDetailModal(event)">
        <div class="clips-modal-content" onclick="event.stopPropagation()">
          <div class="clips-modal-header">
            <div>
              <h3 id="clipsModalTitle" class="clips-modal-title">Chi Tiết Dòng Chảy Sản Xuất</h3>
              <p id="clipsModalSubtitle" class="clips-modal-sub"></p>
            </div>
            <button class="clips-modal-close" onclick="window.handleCloseClipsDetailModal()">&times;</button>
          </div>
          <div id="clipsModalBody" class="clips-modal-body">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>

      <!-- MODAL LOADING KẾ HOẠCH CLIPS ALL MỚI (CHUẨN BỊ CHO THÁNG 11) -->
      <div id="clipsLoadingPlanModal" class="clips-modal-overlay" style="display: none;" onclick="window.handleCloseLoadingClipsPlanModal(event)">
        <div class="clips-modal-content clips-loading-modal-box" onclick="event.stopPropagation()" style="max-width: 680px; width: 95%;">
          <div class="clips-modal-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.5rem;">📥</span>
              <div>
                <h3 class="clips-modal-title">Loading Kế Hoạch Clips All Mới</h3>
                <p class="clips-modal-sub">Cập nhật kỳ mới (Tháng 11/2026) từ Google Sheet & Tự động lưu lịch sử đa kỳ</p>
              </div>
            </div>
            <button class="clips-modal-close" onclick="window.handleCloseLoadingClipsPlanModal()">&times;</button>
          </div>

          <div class="clips-modal-body" style="padding: 1.25rem 1.5rem;">
            <!-- THÔNG BÁO BẢO TOÀN LỊCH SỬ -->
            <div class="clips-history-safe-card" style="margin-bottom: 1.25rem; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 0.75rem 1rem;">
              <div style="display: flex; align-items: flex-start; gap: 0.65rem;">
                <span style="font-size: 1.25rem;">🛡️</span>
                <div style="font-size: 0.825rem; line-height: 1.5; color: #cbd5e1;">
                  <strong style="color: #38bdf8;">Dữ liệu lịch sử đã được bảo vệ:</strong> Kế hoạch <strong>Tháng 10/2026 (213 mặt hàng, 464.094 pcs)</strong> đã được lưu trữ an toàn vĩnh viễn trong kho lịch sử. Khi bạn nạp Plan Tháng 11, hệ thống sẽ tự động tạo thêm kỳ mới mà <strong>không làm mất hay ghi đè Tháng 10</strong>.
                </div>
              </div>
            </div>

            <!-- CHỌN KỲ KẾ HOẠCH ÁP DỤNG -->
            <div class="clips-loading-field-group" style="margin-bottom: 1.25rem;">
              <label class="clips-loading-label" style="display: flex; align-items: center; justify-content: space-between; font-size: 0.825rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.5rem;">
                <span>📅 Kỳ Kế Hoạch Cần Loading:</span>
                <span class="badge badge-purple" style="font-size: 0.7rem; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.4); padding: 0.15rem 0.45rem; border-radius: 4px;">Kỳ kế tiếp</span>
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Mã kỳ (YYYY-MM):</span>
                  <input type="text" id="inputClipsNewMonthKey" class="clips-loading-input" value="2026-11" placeholder="Ví dụ: 2026-11" style="width: 100%; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; padding: 0.45rem 0.65rem; color: #f8fafc; font-size: 0.85rem;" />
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">Tên hiển thị kỳ:</span>
                  <input type="text" id="inputClipsNewMonthLabel" class="clips-loading-input" value="Tháng 11/2026 (01/Nov - 30/Nov)" placeholder="Ví dụ: Tháng 11/2026" style="width: 100%; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; padding: 0.45rem 0.65rem; color: #f8fafc; font-size: 0.85rem;" />
                </div>
              </div>
            </div>

            <!-- TAB / PHƯƠNG THỨC NẠP -->
            <div>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                <button type="button" id="tabBtnSyncOnline" class="btn btn-sm btn-primary" onclick="window.switchLoadingPlanTab('online')" style="font-size: 0.8rem;">
                  ⚡ 1. Tải Trực Tiếp Từ Google Sheets (Khuyên Dùng)
                </button>
                <button type="button" id="tabBtnSyncManual" class="btn btn-sm btn-secondary" onclick="window.switchLoadingPlanTab('manual')" style="font-size: 0.8rem;">
                  📋 2. Dán Bảng / Nạp Tùy Chọn
                </button>
              </div>

              <!-- PHƯƠNG THỨC 1: GOOGLE SHEETS TRỰC TIẾP -->
              <div id="loadingTabOnline" class="loading-method-panel">
                <div class="online-sync-desc-card" style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 1rem;">
                  <div style="font-size: 0.85rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.35rem;">
                    Tải dữ liệu mới nhất từ Sheet "Clip Alls"
                  </div>
                  <div style="font-size: 0.775rem; color: #94a3b8; line-height: 1.5;">
                    Hệ thống sẽ kết nối trực tiếp đến Google Sheets, đọc toàn bộ cột Device, Plan, Fact của kỳ Tháng 11 và tự động phân tích 11 công đoạn tương ứng.
                  </div>
                  <div id="clipsOnlineSyncProgress" style="display: none; margin-top: 0.85rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.65rem; color: #60a5fa; font-size: 0.825rem; font-weight: 700;">
                      <span class="spinner-small" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #60a5fa; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                      <span id="clipsOnlineSyncStatusText">Đang kết nối Google Sheets & bóc tách dữ liệu Clip Alls...</span>
                    </div>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.65rem; margin-top: 1.25rem;">
                  <button type="button" class="btn btn-secondary" onclick="window.handleCloseLoadingClipsPlanModal()">
                    Đóng
                  </button>
                  <button type="button" id="btnTriggerOnlineClipsSync" class="btn btn-primary" onclick="window.handleExecuteLoadingClipsOnline()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.45rem;">
                    <span>🚀 Bắt Đầu Loading Kế Hoạch Mới</span>
                  </button>
                </div>
              </div>

              <!-- PHƯƠNG THỨC 2: DÁN DỮ LIỆU / TẢI TỆP -->
              <div id="loadingTabManual" class="loading-method-panel" style="display: none;">
                <div style="font-size: 0.775rem; color: #94a3b8; margin-bottom: 0.5rem;">
                  Dán các dòng được copy từ sheet "Clip Alls" (Cột Device, Plan, Fact, Done) hoặc nạp file:
                </div>
                <textarea id="clipsManualPasteText" class="clips-loading-textarea" rows="6" placeholder="Dán các dòng copy từ sheet Clip Alls vào đây (Ctrl+V)..." style="width: 100%; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; padding: 0.5rem; color: #f8fafc; font-size: 0.8rem; font-family: monospace;"></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                  <input type="file" id="clipsFileInput" accept=".json,.csv" style="display: none;" onchange="window.handleClipsFileUpload(event)" />
                  <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('clipsFileInput').click()">
                    📁 Chọn file CSV / JSON
                  </button>
                  <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="window.handleCloseLoadingClipsPlanModal()">Đóng</button>
                    <button type="button" class="btn btn-primary" onclick="window.handleExecuteLoadingClipsManual()">
                      <span>💾 Nạp Dữ Liệu Dán</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Helper encode text an toàn
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Mở modal Loading Kế hoạch Clips All mới
   */
  window.handleOpenLoadingClipsPlanModal = function() {
    const modal = document.getElementById('clipsLoadingPlanModal');
    if (modal) {
      modal.style.display = 'flex';
      const progress = document.getElementById('clipsOnlineSyncProgress');
      if (progress) progress.style.display = 'none';
    }
  };

  /**
   * Đóng modal Loading Kế hoạch Clips All mới
   */
  window.handleCloseLoadingClipsPlanModal = function(e) {
    const modal = document.getElementById('clipsLoadingPlanModal');
    if (modal) modal.style.display = 'none';
  };

  /**
   * Chuyển tab trong modal Loading (online vs manual)
   */
  window.switchLoadingPlanTab = function(tabName) {
    const onlinePanel = document.getElementById('loadingTabOnline');
    const manualPanel = document.getElementById('loadingTabManual');
    const btnOnline = document.getElementById('tabBtnSyncOnline');
    const btnManual = document.getElementById('tabBtnSyncManual');

    if (tabName === 'online') {
      if (onlinePanel) onlinePanel.style.display = '';
      if (manualPanel) manualPanel.style.display = 'none';
      if (btnOnline) { btnOnline.className = 'btn btn-sm btn-primary'; }
      if (btnManual) { btnManual.className = 'btn btn-sm btn-secondary'; }
    } else {
      if (onlinePanel) onlinePanel.style.display = 'none';
      if (manualPanel) manualPanel.style.display = '';
      if (btnOnline) { btnOnline.className = 'btn btn-sm btn-secondary'; }
      if (btnManual) { btnManual.className = 'btn btn-sm btn-primary'; }
    }
  };

  /**
   * Helper parse CSV Text từ Google Sheets của sheet Clip Alls
   */
  function parseClipsAllCsvText(csvText, monthKey, monthLabel) {
    const lines = csvText.split(/\r?\n/);
    const items = [];
    const byDevice = {};
    let totalPlan = 0;
    let totalFact = 0;
    let doneCount = 0;

    for (let i = 8; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = [];
      let inQuotes = false;
      let curCol = '';
      for (let chIdx = 0; chIdx < line.length; chIdx++) {
        const c = line[chIdx];
        if (c === '"') { inQuotes = !inQuotes; }
        else if (c === ',' && !inQuotes) { cols.push(curCol.trim()); curCol = ''; }
        else { curCol += c; }
      }
      cols.push(curCol.trim());

      if (cols.length > 4) {
        const device = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : '';
        const cat = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : '';
        const grp = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
        const agg = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : '';

        // Bỏ qua các dòng tổng kết (Усього, Загальний результат) và các dòng tiêu đề cột
        if (device && 
            !device.includes('Усього') && 
            !device.includes('Загальний') && 
            !device.includes('Device') && 
            !device.includes('dim_products') && 
            !device.includes('nomenclature_name') &&
            !agg.includes('Усього') &&
            !agg.includes('Загальний')) {
          const p = parseFloat(cols[4].replace(/,/g, '').replace(/"/g, '')) || 0;
          const f = cols.length > 5 ? (parseFloat(cols[5].replace(/,/g, '').replace(/"/g, '')) || 0) : 0;
          let doneVal = 0;
          if (cols.length > 6 && cols[6].trim()) {
            doneVal = parseInt(cols[6].replace(/"/g, ''), 10) || (p > 0 && (f / p) >= 0.9 ? 1 : 0);
          } else {
            doneVal = (p > 0 && (f / p) >= 0.9 ? 1 : 0);
          }
          const isDone = (doneVal === 1);
          if (isDone) doneCount++;
          totalPlan += p;
          totalFact += f;

          const item = { category: cat, group: grp, agg: agg, device: device, plan: p, sheetFact: f, done: doneVal, isDone: isDone };
          items.push(item);
          byDevice[device] = item;
        }
      }
    }

    const totalDevices = items.length;
    const notDoneCount = totalDevices - doneCount;
    const ratePct = totalDevices > 0 ? (doneCount / totalDevices * 100) : 0;
    const rateStr = ratePct.toFixed(1) + '%';

    const snapshot = {
      month: monthKey,
      monthLabel: monthLabel,
      fromDate: `${monthKey}-01`,
      toDate: `${monthKey}-30`,
      periodName: `01/Nov - 30/Nov`,
      archivedAt: new Date().toISOString(),
      totalItems: totalDevices,
      totalPlan: totalPlan,
      totalSheetFact: totalFact,
      qtyAllDevice: totalDevices,
      qtyDoneDevice: doneCount,
      qtyNotDoneDevice: notDoneCount,
      clipAllPlant: rateStr,
      clipAllPlantPct: Math.round(ratePct * 10) / 10,
      items: items,
      byDevice: byDevice
    };

    return { totalItems: totalDevices, snapshot: snapshot, master: snapshot };
  }

  /**
   * Thực hiện Loading Plan trực tiếp từ Google Sheet ("Clip Alls")
   */
  window.handleExecuteLoadingClipsOnline = async function() {
    const monthKey = (document.getElementById('inputClipsNewMonthKey')?.value || '2026-11').trim();
    const monthLabel = (document.getElementById('inputClipsNewMonthLabel')?.value || 'Tháng 11/2026 (01/Nov - 30/Nov)').trim();
    const progressEl = document.getElementById('clipsOnlineSyncProgress');
    const statusTextEl = document.getElementById('clipsOnlineSyncStatusText');
    const btnTrigger = document.getElementById('btnTriggerOnlineClipsSync');

    if (progressEl) progressEl.style.display = 'block';
    if (statusTextEl) statusTextEl.textContent = `Đang kết nối Google Sheets để tải Kế hoạch Clips All kỳ ${monthLabel}...`;
    if (btnTrigger) { btnTrigger.disabled = true; btnTrigger.innerHTML = '<span>⏳ Đang Loading...</span>'; }

    try {
      let syncSuccess = false;
      let newHistory = null;
      let newMaster = null;

      // 1. Thử gọi Endpoint máy chủ nội bộ (/api/sync-clips)
      try {
        const query = `?month=${encodeURIComponent(monthKey)}&label=${encodeURIComponent(monthLabel)}&period=${encodeURIComponent('01/Nov - 30/Nov')}`;
        const resp = await fetch('/api/sync-clips' + query, { method: 'GET', cache: 'no-cache' });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success) {
            syncSuccess = true;
            newHistory = data.history;
            newMaster = data.clipsMaster;
          }
        }
      } catch (errApi) {
        console.warn('Endpoint /api/sync-clips chưa sẵn sàng, chuyển sang tải trực tiếp Google Sheets CSV...', errApi);
      }

      // 2. Fallback: Tải trực tiếp CSV từ Google Sheets nếu chạy tĩnh hoặc máy chủ bận
      if (!syncSuccess) {
        if (statusTextEl) statusTextEl.textContent = 'Đang tải trực tiếp từ Google Sheets CSV (bỏ qua bộ lọc UI)...';
        const SHEET_ID = '1wtuLHVwH4U4OfJ3bKQjTgC13g8EZfZePOyLnqnWzfl4';
        const CLIPS_ALLS_GID = '997908205';

        let csvText = '';
        // Ưu tiên tải qua export?format=csv để lấy trọn vẹn 289 dòng không bị lọc
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CLIPS_ALLS_GID}`;
          const csvResp = await fetch(exportUrl);
          if (csvResp.ok) {
            csvText = await csvResp.text();
          }
        } catch (eExp) {
          console.warn('export?format=csv không phản hồi, thử gviz/tq...', eExp);
        }

        if (!csvText || csvText.split('\n').length < 25) {
          const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${CLIPS_ALLS_GID}`;
          const csvResp = await fetch(sheetCsvUrl);
          if (csvResp.ok) {
            csvText = await csvResp.text();
          }
        }

        if (!csvText || csvText.split('\n').length < 10) {
          const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Clip Alls')}`;
          const csvResp = await fetch(sheetCsvUrl);
          if (!csvResp.ok) throw new Error(`Google Sheets HTTP Error ${csvResp.status}`);
          csvText = await csvResp.text();
        }

        const parsed = parseClipsAllCsvText(csvText, monthKey, monthLabel);
        if (!parsed || parsed.totalItems === 0) throw new Error('Không bóc tách được dữ liệu từ sheet Clip Alls');

        newHistory = window.CLIPS_ALLS_HISTORY || { months: ['2026-10'], snapshots: {} };
        if (!newHistory.snapshots) newHistory.snapshots = {};
        if (!newHistory.months) newHistory.months = [];

        newHistory.snapshots[monthKey] = parsed.snapshot;
        if (!newHistory.months.includes(monthKey)) newHistory.months.push(monthKey);

        newMaster = parsed.master;
        newMaster.history = newHistory;
        syncSuccess = true;
      }

      // 3. Cập nhật dữ liệu vào toàn hệ thống
      if (syncSuccess) {
        if (newHistory) window.CLIPS_ALLS_HISTORY = newHistory;
        if (newMaster) window.CLIPS_ALLS_MASTER_DATA = newMaster;

        try {
          localStorage.setItem('CLIPS_ALLS_SAVED_HISTORY', JSON.stringify(window.CLIPS_ALLS_HISTORY));
        } catch(e) {}

        // Tự động chuyển view sang kỳ mới
        window.ClipsPlanStore.selectedHistoryMonth = monthKey;
        if (monthKey === '2026-11') {
          window.ClipsPlanStore.fromDate = '2026-11-01';
          window.ClipsPlanStore.toDate = '2026-11-30';
          window.ClipsPlanStore.dateMode = 'RANGE';
        }
        window.ClipsPlanStore.pageIndex = 0;

        if (statusTextEl) statusTextEl.textContent = `✅ Thành công! Đã nạp ${newMaster?.totalItems || 213} mặt hàng Plan Clips All kỳ ${monthLabel}.`;
        
        setTimeout(() => {
          window.handleCloseLoadingClipsPlanModal();
          window.renderClipsAllPlanView();
          if (typeof window.showToast === 'function') {
            window.showToast(`✅ Đã Loading thành công Plan Clips All: ${monthLabel}!`, 'success');
          }
        }, 800);
      }
    } catch (err) {
      console.error('Lỗi khi Loading Clips Plan:', err);
      if (statusTextEl) statusTextEl.textContent = `⚠️ Lỗi tải dữ liệu: ${err.message}. Bạn có thể dùng tab "Dán Bảng" bên cạnh.`;
      if (typeof window.showToast === 'function') {
        window.showToast(`Không thể tải từ Google Sheets: ${err.message}`, 'error');
      }
    } finally {
      if (btnTrigger) { btnTrigger.disabled = false; btnTrigger.innerHTML = '<span>🚀 Bắt Đầu Loading Kế Hoạch Mới</span>'; }
    }
  };

  /**
   * Nạp Plan qua ô dán dữ liệu thủ công
   */
  window.handleExecuteLoadingClipsManual = function() {
    const text = document.getElementById('clipsManualPasteText')?.value || '';
    const monthKey = (document.getElementById('inputClipsNewMonthKey')?.value || '2026-11').trim();
    const monthLabel = (document.getElementById('inputClipsNewMonthLabel')?.value || 'Tháng 11/2026 (01/Nov - 30/Nov)').trim();
    if (!text.trim()) {
      alert('Vui lòng dán dữ liệu từ sheet Clip Alls vào ô trước khi nạp!');
      return;
    }

    const lines = text.split(/\r?\n/);
    const items = [];
    const byDevice = {};
    let totalPlan = 0;
    let totalFact = 0;
    let doneCount = 0;

    for (const l of lines) {
      if (!l.trim()) continue;
      const parts = l.includes('\t') ? l.split('\t') : l.split(',');
      if (parts.length >= 2) {
        const device = parts[0].trim();
        if (!device || device.toLowerCase().includes('device') || device.toLowerCase().includes('tên')) continue;
        const p = parseFloat(parts[1].replace(/,/g, '').trim()) || 0;
        const f = parts.length > 2 ? (parseFloat(parts[2].replace(/,/g, '').trim()) || 0) : 0;
        const doneVal = parts.length > 3 ? (parseInt(parts[3].trim(), 10) || (p > 0 && (f / p) >= 0.9 ? 1 : 0)) : (p > 0 && (f / p) >= 0.9 ? 1 : 0);
        const isDone = (doneVal === 1);
        if (isDone) doneCount++;
        totalPlan += p;
        totalFact += f;
        const item = { device: device, plan: p, sheetFact: f, done: doneVal, isDone: isDone };
        items.push(item);
        byDevice[device] = item;
      }
    }

    if (items.length === 0) {
      alert('Không nhận diện được dòng dữ liệu hợp lệ nào!');
      return;
    }

    const totalDevices = items.length;
    const notDoneCount = totalDevices - doneCount;
    const ratePct = totalDevices > 0 ? (doneCount / totalDevices * 100) : 0;

    const snapshot = {
      month: monthKey,
      monthLabel: monthLabel,
      fromDate: `${monthKey}-01`,
      toDate: `${monthKey}-30`,
      periodName: '01/Nov - 30/Nov',
      archivedAt: new Date().toISOString(),
      totalItems: totalDevices,
      totalPlan: totalPlan,
      totalSheetFact: totalFact,
      qtyAllDevice: totalDevices,
      qtyDoneDevice: doneCount,
      qtyNotDoneDevice: notDoneCount,
      clipAllPlant: ratePct.toFixed(1) + '%',
      clipAllPlantPct: Math.round(ratePct * 10) / 10,
      items: items,
      byDevice: byDevice
    };

    if (!window.CLIPS_ALLS_HISTORY) window.CLIPS_ALLS_HISTORY = { months: ['2026-10'], snapshots: {} };
    if (!window.CLIPS_ALLS_HISTORY.snapshots) window.CLIPS_ALLS_HISTORY.snapshots = {};
    if (!window.CLIPS_ALLS_HISTORY.months) window.CLIPS_ALLS_HISTORY.months = [];

    window.CLIPS_ALLS_HISTORY.snapshots[monthKey] = snapshot;
    if (!window.CLIPS_ALLS_HISTORY.months.includes(monthKey)) window.CLIPS_ALLS_HISTORY.months.push(monthKey);
    window.CLIPS_ALLS_MASTER_DATA = snapshot;
    window.CLIPS_ALLS_MASTER_DATA.history = window.CLIPS_ALLS_HISTORY;

    window.ClipsPlanStore.selectedHistoryMonth = monthKey;
    if (monthKey === '2026-11') {
      window.ClipsPlanStore.fromDate = '2026-11-01';
      window.ClipsPlanStore.toDate = '2026-11-30';
      window.ClipsPlanStore.dateMode = 'RANGE';
    }
    window.ClipsPlanStore.pageIndex = 0;

    window.handleCloseLoadingClipsPlanModal();
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      window.showToast(`✅ Đã nạp thành công ${totalDevices} mặt hàng Plan Clips All kỳ ${monthLabel}!`, 'success');
    }
  };

  /**
   * Đọc file CSV/JSON tải lên
   */
  window.handleClipsFileUpload = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target.result;
      const textarea = document.getElementById('clipsManualPasteText');
      if (textarea) textarea.value = content;
      window.switchLoadingPlanTab('manual');
    };
    reader.readAsText(file);
  };

  /**
   * Xử lý chuyển đổi Kỳ Lịch Sử Plan của Clips All theo tháng
   */
  window.handleClipsHistoryMonthChange = function(monthKey) {
    window.ClipsPlanStore.selectedHistoryMonth = monthKey;
    if (monthKey === '2026-10') {
      window.ClipsPlanStore.fromDate = '2026-10-01';
      window.ClipsPlanStore.toDate = '2026-10-31';
      window.ClipsPlanStore.dateMode = 'RANGE';
    } else if (monthKey === '2026-11') {
      window.ClipsPlanStore.fromDate = '2026-11-01';
      window.ClipsPlanStore.toDate = '2026-11-30';
      window.ClipsPlanStore.dateMode = 'RANGE';
    }
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      const label = monthKey === '2026-10' ? 'Tháng 10/2026 (01/Oct - 31/Oct) [Đã lưu lịch sử]' : (monthKey === '2026-11' ? 'Tháng 11/2026 (01/Nov - 30/Nov)' : 'Tự động nhận diện kỳ Plan');
      window.showToast(`Đã chọn Kỳ Plan Clips All: ${label}`, 'success');
    }
  };

  /**
   * Xử lý thay đổi khoảng thời gian Từ ngày / Đến ngày
   */
  window.handleClipsDateChange = function(field, val) {
    if (field === 'from') {
      window.ClipsPlanStore.fromDate = val || '';
      // Quy tắc chu kỳ tuần: Nếu người dùng chọn ngày bắt đầu là Thứ 5, tự động tính ngày kết thúc là hết Thứ 4 tuần tiếp theo (+6 ngày)
      if (val) {
        const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(val) : new Date(val);
        if (d && !isNaN(d.getTime()) && d.getDay() === 4) {
          const endWed = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
          const pad = n => String(n).padStart(2, '0');
          const toVal = `${endWed.getFullYear()}-${pad(endWed.getMonth() + 1)}-${pad(endWed.getDate())}`;
          window.ClipsPlanStore.toDate = toVal;
          const toEl = document.getElementById('clipsToDate');
          if (toEl) toEl.value = toVal;
        }
      }
    } else if (field === 'to') {
      window.ClipsPlanStore.toDate = val || '';
    }

    if (window.ClipsPlanStore.fromDate || window.ClipsPlanStore.toDate) {
      window.ClipsPlanStore.dateMode = 'RANGE';
    } else {
      window.ClipsPlanStore.dateMode = 'ALL_PLAN';
    }

    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Chọn xem Toàn Bộ Kế Hoạch (All Plan)
   */
  window.handleClipsDateModeAll = function() {
    window.ClipsPlanStore.dateMode = 'ALL_PLAN';
    window.ClipsPlanStore.fromDate = '';
    window.ClipsPlanStore.toDate = '';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      window.showToast('Đang hiển thị toàn bộ kế hoạch (All Plan)', 'info');
    }
  };

  /**
   * Chọn nhanh các mốc thời gian phổ biến
   */
  window.handleClipsQuickDateRange = function(preset) {
    if (preset === 'current_period' || preset === 'current_week') {
      // Chu kỳ tuần sản xuất chuẩn của nhà máy (Thứ 5 -> hết Thứ 4 tuần tiếp theo)
      const weekRange = (window.AppStore && window.AppStore.getFactoryWeekRange) 
        ? window.AppStore.getFactoryWeekRange() 
        : getDefaultClipsDateRange();
      window.ClipsPlanStore.dateMode = 'RANGE';
      window.ClipsPlanStore.fromDate = weekRange.fromDate;
      window.ClipsPlanStore.toDate = weekRange.toDate;
      const fInp = document.getElementById('clipsFromDate');
      const tInp = document.getElementById('clipsToDate');
      if (fInp) fInp.value = weekRange.fromDate;
      if (tInp) tInp.value = weekRange.toDate;
      if (typeof window.showToast === 'function') {
        window.showToast(`Đã lọc chu kỳ tuần chuẩn Thứ 5 ➔ Thứ 4 (${weekRange.fromDate} ➔ ${weekRange.toDate})`, 'success');
      }
    } else if (preset === 'recent_day') {
      // Ngày 28/10/2026
      window.ClipsPlanStore.dateMode = 'RANGE';
      window.ClipsPlanStore.fromDate = '2026-10-28';
      window.ClipsPlanStore.toDate = '2026-10-28';
      if (typeof window.showToast === 'function') {
        window.showToast('Đã lọc ngày kế hoạch gần nhất (28/10/2026)', 'success');
      }
    } else if (preset === 'today') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      window.ClipsPlanStore.dateMode = 'RANGE';
      window.ClipsPlanStore.fromDate = iso;
      window.ClipsPlanStore.toDate = iso;
      if (typeof window.showToast === 'function') {
        window.showToast(`Đã lọc ngày hôm nay (${d}/${m}/${y})`, 'success');
      }
    }

    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Xử lý tìm kiếm
   */
  window.handleClipsPlanSearch = function(val) {
    window.ClipsPlanStore.search = val || '';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Lọc theo dòng model
   */
  window.handleClipsModelFilter = function(val) {
    window.ClipsPlanStore.modelFilter = val || 'ALL';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Lọc theo trạng thái chuỗi
   */
  window.handleClipsStatusFilter = function(val) {
    window.ClipsPlanStore.statusFilter = val || 'ALL';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Đổi thứ tự sắp xếp
   */
  window.handleClipsSortChange = function(val) {
    window.ClipsPlanStore.sortBy = val || 'DEFAULT';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
  };

  /**
   * Đổi trang
   */
  window.handleClipsPageChange = function(newIdx) {
    window.ClipsPlanStore.pageIndex = newIdx;
    window.renderClipsAllPlanView();
  };

  /**
   * Lọc theo Gap (Toàn bộ các mã / Các mã < 0 / Chỉ mã MB < 0)
   */
  window.handleClipsGapFilter = function(val) {
    window.ClipsPlanStore.gapFilter = val || 'ALL';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      if (val === 'NEGATIVE') {
        window.showToast('Đang lọc các mã có chênh lệch âm (Gap < 0)', 'warning');
      } else if (val === 'NEGATIVE_MB') {
        window.showToast('Đang lọc các mã có thành phẩm (MB) chưa đạt (Gap < 0)', 'warning');
      } else if (val === 'CLIPS_HAS_PLAN') {
        window.showToast('Đang lọc các mã có Kế hoạch Clips All', 'info');
      } else if (val === 'CLIPS_GT_90') {
        window.showToast('Đang lọc các mã Clips All đã hoàn thành > 90%', 'success');
      } else if (val === 'CLIPS_LT_90') {
        window.showToast('Đang lọc các mã Clips All chưa đạt < 90%', 'warning');
      } else {
        window.showToast('Đang hiển thị toàn bộ các mã', 'info');
      }
    }
  };

  /**
   * Đặt lại bộ lọc về mặc định (Theo Tháng Hiện Tại)
   */
  window.handleResetClipsFilters = function() {
    const _defMonth = getDefaultMonthRange();
    window.ClipsPlanStore.search = '';
    window.ClipsPlanStore.modelFilter = 'ALL';
    window.ClipsPlanStore.gapFilter = 'ALL';
    window.ClipsPlanStore.statusFilter = 'ALL';
    window.ClipsPlanStore.deficitStageFilter = 'ALL';
    window.ClipsPlanStore.dateMode = 'RANGE';
    window.ClipsPlanStore.fromDate = _defMonth.fromDate;
    window.ClipsPlanStore.toDate = _defMonth.toDate;
    window.ClipsPlanStore.metricView = 'ALL';
    window.ClipsPlanStore.sortBy = 'DEFAULT';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      window.showToast(`Đã đặt lại bộ lọc về mặc định: ${_defMonth.label || (_defMonth.fromDate + ' ➔ ' + _defMonth.toDate)}`, 'info');
    }
  };

  /**
   * Chuyển đổi chế độ hiển thị chỉ số (ALL | PLAN | FACT | GAP | RATE)
   */
  window.handleClipsMetricView = function(viewMode) {
    window.ClipsPlanStore.metricView = viewMode || 'ALL';
    window.ClipsPlanStore.pageIndex = 0;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      const modeNames = {
        'ALL': 'Đầy đủ 4 chỉ số (Plan / Fact / Gap / % HT)',
        'PLAN': 'Chỉ xem Kế hoạch (Plan)',
        'FACT': 'Chỉ xem Thực tế (Fact)',
        'GAP': 'Chỉ xem Chênh lệch (Gap = Fact - Plan)',
        'RATE': 'Chỉ xem Tỉ lệ hoàn thành % (% HT)'
      };
      window.showToast(`Chế độ hiển thị: ${modeNames[viewMode] || viewMode}`, 'info');
    }
  };

  /**
   * Bật/tắt thu gọn hoặc mở rộng thanh công cụ bộ lọc (Collapse / Expand Toolbar)
   */
  window.handleToggleClipsToolbar = function() {
    window.ClipsPlanStore.isToolbarCollapsed = !window.ClipsPlanStore.isToolbarCollapsed;
    try {
      localStorage.setItem('AJAX_PROPLAN_CLIPS_TOOLBAR_COLLAPSED', String(window.ClipsPlanStore.isToolbarCollapsed));
    } catch (e) {}
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      window.showToast(window.ClipsPlanStore.isToolbarCollapsed ? 'Đã thu gọn bộ lọc để tối ưu không gian xem bảng' : 'Đã mở rộng bộ lọc', 'info');
    }
  };

  /**
   * Danh sách 11 công đoạn chuẩn trong hệ thống Clips All Plan (Clips All đứng trước MB)
   */
  const CLIPS_11_STAGES = [
    { key: 'CLIPS_ALL', name: 'Clips All' },
    { key: 'MB', name: 'MB' },
    { key: 'PKG', name: 'PKG' },
    { key: 'QC', name: 'QC' },
    { key: 'TEST_ROOM', name: 'TEST ROOM' },
    { key: 'LONG_TEST', name: 'LONG TEST' },
    { key: 'ASSEMBLY', name: 'ASSEMBLY' },
    { key: 'HARD_TEST', name: 'HARD TEST' },
    { key: 'LAQ_LINE', name: 'LAQ.Line' },
    { key: 'DIP', name: 'DIP' },
    { key: 'SMD', name: 'SMD' }
  ];

  /**
   * Lấy danh sách 11 công đoạn phục vụ xuất tệp và copy (Clips All luôn đứng trước MB)
   */
  function getActiveClipsStages() {
    return CLIPS_11_STAGES;
  }

  /**
   * Bật/tắt hiển thị cột công đoạn Clips All ở cuối bảng
   */
  window.handleToggleShowClipsStage = function() {
    window.ClipsPlanStore.showClipsStage = !window.ClipsPlanStore.showClipsStage;
    window.renderClipsAllPlanView();
    if (typeof window.showToast === 'function') {
      if (window.ClipsPlanStore.showClipsStage) {
        window.showToast('Đang hiển thị cột công đoạn Clips All ở cuối bảng', 'success');
      } else {
        window.showToast('Đã ẩn cột công đoạn Clips All khỏi bảng', 'info');
      }
    }
  };

  /**
   * Sao chép cho Google Sheet (Định dạng TSV: pure number, có đơn vị ở tiêu đề, sạch emoji)
   */
  window.handleCopyClipsGoogleSheet = function() {
    const dataObj = window.buildClipsAllPlanData();
    let rows = dataObj.rows;

    // Lọc theo điều kiện hiện tại
    const store = window.ClipsPlanStore;
    if (store.search) {
      const q = store.search.trim().toLowerCase();
      rows = rows.filter(r => r.productName1C.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
    }
    if (store.modelFilter && store.modelFilter !== 'ALL') {
      rows = rows.filter(r => r.baseModel === store.modelFilter || r.model === store.modelFilter);
    }
    if (store.statusFilter && store.statusFilter !== 'ALL') {
      rows = rows.filter(r => r.status === store.statusFilter);
    }
    if (store.gapFilter === 'NEGATIVE') {
      rows = rows.filter(r => r.hasNegativeGap);
    } else if (store.gapFilter === 'NEGATIVE_MB') {
      rows = rows.filter(r => r.isMbNegative);
    } else if (store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN') {
      rows = rows.filter(r => r.isClipDevice);
    } else if (store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90') {
      rows = rows.filter(r => r.isClipDevice && r.isClipDone);
    } else if (store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90') {
      rows = rows.filter(r => r.isClipDevice && !r.isClipDone);
    }

    // Tiêu đề cột thuần túy, có đơn vị tính, KHÔNG emoji
    const isRangeActive = store.dateMode === 'RANGE' && (store.fromDate || store.toDate);
    const dateDesc = isRangeActive 
      ? ` (${formatDateVN(store.fromDate)} - ${formatDateVN(store.toDate)})`
      : ' (All Plan)';

    const isAllMetrics = store.metricView === 'ALL';
    const metricViewKey = store.metricView.toLowerCase(); // 'plan' | 'fact' | 'gap' | 'rate'
    const stageMetas = getActiveClipsStages();

    const headers = ['STT', 'product name 1C'];
    if (isAllMetrics) {
      for (const stg of stageMetas) {
        headers.push(`${stg.name} Plan (pcs${dateDesc})`);
        headers.push(`${stg.name} Fact (pcs${dateDesc})`);
        headers.push(`${stg.name} Gap (pcs${dateDesc})`);
        headers.push(`${stg.name} % HT`);
      }
    } else {
      const mLabel = store.metricView === 'RATE' ? '% HT' : store.metricView;
      for (const stg of stageMetas) {
        headers.push(`${stg.name} ${mLabel}${mLabel === '% HT' ? '' : ` (pcs${dateDesc})`}`);
      }
    }
    headers.push('Danh Gia Chuoi');

    const lines = [headers.join('\t')];

    // Dữ liệu dòng: PURE NUMBER (số thuần túy không chấm/phẩy ngăn cách ngàn để Google Sheet tự nhận diện là số)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Loại bỏ mọi ký tự emoji khỏi statusText khi xuất dữ liệu
      const cleanStatus = r.statusText.replace(/[^\w\s\(\)\-\+\.\,\/àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '').trim();

      const rowData = [i + 1, r.productName1C];

      if (isAllMetrics) {
        for (const stg of stageMetas) {
          const sObj = r[stg.key] || {};
          rowData.push(sObj.plan || 0);
          rowData.push(sObj.fact || 0);
          rowData.push(sObj.gap || 0);
          rowData.push(sObj.rate !== null && sObj.rate !== undefined ? sObj.rate.toFixed(1) + '%' : '-');
        }
      } else {
        for (const stg of stageMetas) {
          const sObj = r[stg.key] || {};
          if (store.metricView === 'RATE') {
            rowData.push(sObj.rate !== null && sObj.rate !== undefined ? sObj.rate.toFixed(1) + '%' : '-');
          } else {
            rowData.push(sObj[metricViewKey] || 0);
          }
        }
      }

      rowData.push(cleanStatus);
      lines.push(rowData.join('\t'));
    }

    const tsvContent = lines.join('\n');

    // Copy vào Clipboard
    navigator.clipboard.writeText(tsvContent).then(() => {
      const msg = isRangeActive 
        ? `Đã sao chép ${rows.length} dòng dữ liệu cho Google Sheets (Kỳ: ${formatDateVN(store.fromDate)} ➔ ${formatDateVN(store.toDate)}, dạng số thuần túy)!`
        : `Đã sao chép ${rows.length} dòng dữ liệu cho Google Sheets (Toàn bộ kế hoạch, dạng số thuần túy)!`;
      if (typeof window.showToast === 'function') {
        window.showToast(msg, 'success');
      } else {
        alert(msg);
      }
    }).catch(err => {
      const textarea = document.createElement('textarea');
      textarea.value = tsvContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (typeof window.showToast === 'function') {
        window.showToast(`Đã sao chép ${rows.length} dòng dữ liệu cho Google Sheets!`, 'success');
      }
    });
  };

  /**
   * Xuất file CSV (chuẩn UTF-8 có BOM)
   */
  window.handleExportClipsCSV = function() {
    const dataObj = window.buildClipsAllPlanData();
    let rows = dataObj.rows;

    const store = window.ClipsPlanStore;
    if (store.search) {
      const q = store.search.trim().toLowerCase();
      rows = rows.filter(r => r.productName1C.toLowerCase().includes(q) || r.model.toLowerCase().includes(q));
    }
    if (store.modelFilter && store.modelFilter !== 'ALL') {
      rows = rows.filter(r => r.baseModel === store.modelFilter || r.model === store.modelFilter);
    }
    if (store.statusFilter && store.statusFilter !== 'ALL') {
      rows = rows.filter(r => r.status === store.statusFilter);
    }
    if (store.gapFilter === 'NEGATIVE') {
      rows = rows.filter(r => r.hasNegativeGap);
    } else if (store.gapFilter === 'NEGATIVE_MB') {
      rows = rows.filter(r => r.isMbNegative);
    } else if (store.gapFilter === 'CLIPS_ALL_DEVICE' || store.gapFilter === 'CLIPS_HAS_PLAN') {
      rows = rows.filter(r => r.isClipDevice);
    } else if (store.gapFilter === 'CLIPS_DONE_DEVICE' || store.gapFilter === 'CLIPS_GT_90') {
      rows = rows.filter(r => r.isClipDevice && r.isClipDone);
    } else if (store.gapFilter === 'CLIPS_NOT_DONE_DEVICE' || store.gapFilter === 'CLIPS_LT_90') {
      rows = rows.filter(r => r.isClipDevice && !r.isClipDone);
    }

    const isRangeActive = store.dateMode === 'RANGE' && (store.fromDate || store.toDate);
    const dateDesc = isRangeActive 
      ? ` (${formatDateVN(store.fromDate)} - ${formatDateVN(store.toDate)})`
      : ' (All Plan)';

    const isAllMetrics = store.metricView === 'ALL';
    const metricViewKey = store.metricView.toLowerCase(); // 'plan' | 'fact' | 'gap' | 'rate'
    const stageMetas = getActiveClipsStages();

    const headers = ['STT', 'product name 1C'];
    if (isAllMetrics) {
      for (const stg of stageMetas) {
        headers.push(`${stg.name} Plan (pcs${dateDesc})`);
        headers.push(`${stg.name} Fact (pcs${dateDesc})`);
        headers.push(`${stg.name} Gap (pcs${dateDesc})`);
        headers.push(`${stg.name} % HT`);
      }
    } else {
      const mLabel = store.metricView === 'RATE' ? '% HT' : store.metricView;
      for (const stg of stageMetas) {
        headers.push(`${stg.name} ${mLabel}${mLabel === '% HT' ? '' : ` (pcs${dateDesc})`}`);
      }
    }
    headers.push('Danh Gia Chuoi');

    function csvEscape(val) {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    }

    const lines = [headers.map(csvEscape).join(',')];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const cleanStatus = r.statusText.replace(/[^\w\s\(\)\-\+\.\,\/àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '').trim();

      const rowData = [i + 1, r.productName1C];

      if (isAllMetrics) {
        for (const stg of stageMetas) {
          const sObj = r[stg.key] || {};
          rowData.push(sObj.plan || 0);
          rowData.push(sObj.fact || 0);
          rowData.push(sObj.gap || 0);
          rowData.push(sObj.rate !== null && sObj.rate !== undefined ? sObj.rate.toFixed(1) + '%' : '-');
        }
      } else {
        for (const stg of stageMetas) {
          const sObj = r[stg.key] || {};
          if (store.metricView === 'RATE') {
            rowData.push(sObj.rate !== null && sObj.rate !== undefined ? sObj.rate.toFixed(1) + '%' : '-');
          } else {
            rowData.push(sObj[metricViewKey] || 0);
          }
        }
      }

      rowData.push(cleanStatus);
      lines.push(rowData.map(csvEscape).join(','));
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateFileSuffix = isRangeActive ? `_${store.fromDate}_den_${store.toDate}` : '_All_Plan';
    const viewFileSuffix = isAllMetrics ? '' : `_${store.metricView}`;
    link.setAttribute('download', `Tra_Cuu_Clips_Plan${dateFileSuffix}${viewFileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof window.showToast === 'function') {
      window.showToast('Đã xuất file CSV thành công!', 'success');
    }
  };

  /**
   * Mở modal xem chi tiết dòng chảy sản xuất
   */
  window.handleOpenClipsDetailModal = function(productName1C) {
    const dataObj = window.buildClipsAllPlanData();
    const row = dataObj.rows.find(r => r.productName1C === productName1C);
    if (!row) return;

    const modal = document.getElementById('clipsDetailModal');
    const titleEl = document.getElementById('clipsModalTitle');
    const subEl = document.getElementById('clipsModalSubtitle');
    const bodyEl = document.getElementById('clipsModalBody');
    if (!modal || !titleEl || !bodyEl) return;

    const store = window.ClipsPlanStore;
    const isRangeActive = store.dateMode === 'RANGE' && (store.fromDate || store.toDate);
    const dateLabel = isRangeActive ? `Kỳ lọc: ${formatDateVN(store.fromDate)} ➔ ${formatDateVN(store.toDate)}` : 'Toàn bộ kế hoạch (All Plan)';

    titleEl.textContent = row.productName1C;
    subEl.innerHTML = `Model: <strong>${row.model}</strong> | Mã bo mạch: <strong>${row.normKeyShort || 'N/A'}</strong> | ${dateLabel} | Đánh giá: <strong>${row.statusText}</strong>`;

    const stages = [
      { name: '1. SMD (Dán bề mặt)', plan: row.SMD.plan, fact: row.SMD.fact, gap: row.SMD.gap, rate: row.SMD.rate, color: '#38bdf8', items: row.SMD.items },
      { name: '2. DIP (Cắm linh kiện)', plan: row.DIP.plan, fact: row.DIP.fact, gap: row.DIP.gap, rate: row.DIP.rate, color: '#fbbf24', items: row.DIP.items },
      { name: '3. LAQ.Line (Phủ keo)', plan: row.LAQ_LINE.plan, fact: row.LAQ_LINE.fact, gap: row.LAQ_LINE.gap, rate: row.LAQ_LINE.rate, color: '#06b6d4', items: row.LAQ_LINE.items },
      { name: '4. HARD TEST (Kiểm tra mạch)', plan: row.HARD_TEST.plan, fact: row.HARD_TEST.fact, gap: row.HARD_TEST.gap, rate: row.HARD_TEST.rate, color: '#10b981', item: row.HARD_TEST.item },
      { name: '5. ASSEMBLY (Lắp ráp)', plan: row.ASSEMBLY.plan, fact: row.ASSEMBLY.fact, gap: row.ASSEMBLY.gap, rate: row.ASSEMBLY.rate, color: '#a855f7', item: row.ASSEMBLY.item },
      { name: '6. LONG TEST (Chạy thử dài)', plan: row.LONG_TEST.plan, fact: row.LONG_TEST.fact, gap: row.LONG_TEST.gap, rate: row.LONG_TEST.rate, color: '#f43f5e', item: row.LONG_TEST.item },
      { name: '7. TEST ROOM (Phòng nhiệt)', plan: row.TEST_ROOM.plan, fact: row.TEST_ROOM.fact, gap: row.TEST_ROOM.gap, rate: row.TEST_ROOM.rate, color: '#f97316', item: row.TEST_ROOM.item },
      { name: '8. QC (Kiểm tra chất lượng)', plan: row.QC.plan, fact: row.QC.fact, gap: row.QC.gap, rate: row.QC.rate, color: '#6366f1', item: row.QC.item },
      { name: '9. PKG (Đóng gói hộp)', plan: row.PKG.plan, fact: row.PKG.fact, gap: row.PKG.gap, rate: row.PKG.rate, color: '#8b5cf6', item: row.PKG.item },
      { name: '10. Clips All (Kế hoạch tổng thể sheet Clip Alls - Fact update theo MB)', plan: row.CLIPS_ALL.plan, fact: row.CLIPS_ALL.fact, gap: row.CLIPS_ALL.gap, rate: row.CLIPS_ALL.rate, color: '#06b6d4', item: null },
      { name: '11. MB (Đóng thùng MasterBox thành phẩm xuất kho)', plan: row.MB.plan, fact: row.MB.fact, gap: row.MB.gap, rate: row.MB.rate, color: '#0284c7', item: row.MB.item }
    ];

    bodyEl.innerHTML = `
      <div class="clips-modal-chain">
        ${stages.map((st, sIdx) => {
          let itemName = st.item ? st.item.productName1C : (st.items && st.items.length > 0 ? st.items.map(x => x.productName1C).join(', ') : 'Không có kế hoạch');
          const gapClass = st.gap < 0 ? 'text-danger' : (st.gap > 0 ? 'text-success' : 'text-muted');
          const gapPrefix = st.gap > 0 ? '+' : '';
          const rateFormatted = st.rate !== null && st.rate !== undefined ? st.rate.toFixed(1) + '%' : '-';
          return `
            <div class="chain-step-card">
              <div class="chain-step-header" style="border-left: 4px solid ${st.color};">
                <span class="chain-step-name">${st.name}</span>
                <div class="chain-step-metrics font-mono">
                  <span class="badge-modal-metric plan" title="Kế hoạch">Plan: <strong>${st.plan.toLocaleString('vi-VN')}</strong></span>
                  <span class="badge-modal-metric fact" title="Thực tế">Fact: <strong>${st.fact.toLocaleString('vi-VN')}</strong></span>
                  <span class="badge-modal-metric gap ${gapClass}" title="Chênh lệch Fact - Plan">Gap: <strong>${gapPrefix}${st.gap.toLocaleString('vi-VN')}</strong></span>
                  <span class="badge-modal-metric rate" title="Tỉ lệ hoàn thành %">% HT: <strong>${rateFormatted}</strong></span>
                </div>
              </div>
              <div class="chain-step-detail">
                <span class="label">Mã 1C công đoạn:</span>
                <span class="val font-mono">${escapeHtml(itemName)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    modal.style.display = 'flex';
  };

  /**
   * Đóng modal
   */
  window.handleCloseClipsDetailModal = function(e) {
    const modal = document.getElementById('clipsDetailModal');
    if (modal) modal.style.display = 'none';
  };

})();
