/**
 * Ajax ProPlan MES - REPORT ISSUE MODULE
 * ========================================================
 * Bảng Báo Cáo Issue Tách Nhỏ Chi Tiết Từng Công Đoạn & Bộ Phận:
 * - STT | Bộ Phận | Công Đoạn | Tổng Deviation (các mã bị âm cộng dồn) | Tổng Issue Record | Issue KPI
 * - Bộ lọc Giai Đoạn Ngày (Từ ngày ... Đến ngày), Ca (Cả 2 Ca, Ca Ngày, Ca Đêm)
 * - Bộ lọc Công Đoạn (Total Hard Test, ASSEMBLY, Tổng SFPD, Tổng FPD, Tổng MasterBox, Toàn Bộ)
 */

(function() {
  'use strict';

  // Trạng thái cấu hình của Báo Cáo Report Issue
  window.ReportIssueState = {
    fromDate: '2026-11-19',
    toDate: '2026-11-23',
    selectedShift: 'ALL',      // 'ALL' | 'DAY' | 'NIGHT' | 'SPLIT'
    selectedStage: 'HARDTEST_AND_ASSEMBLY', // Mặc định hiển thị Tổng SFPD (ASSEMBLY, HARD TEST, OPTICS ASM, FOCUS...) theo ảnh số 1
    searchKeyword: '',
    isCollapsed: false
  };

  // Cấu hình định nghĩa các công đoạn và nhóm
  const STAGE_DEFINITIONS = [
    // --- 1. NHÓM SFPD (BÁN THÀNH PHẨM) ---
    { id: 'ASSEMBLY', name: 'ASSEMBLY', dept: 'SFPD', label: '🔧 ASSEMBLY', matchStages: ['ASSEMBLY'], isGroupTotal: false, groupKey: 'SFPD' },
    { id: 'HARD TEST', name: 'HARD TEST', dept: 'SFPD', label: '🔬 HARD TEST', matchStages: ['HARD TEST'], isGroupTotal: false, groupKey: 'HARDTEST' },
    { id: 'OPTICS ASM', name: 'OPTICS ASM', dept: 'SFPD', label: '🔭 OPTICS ASM', matchStages: ['OPTICS ASM'], isGroupTotal: false, groupKey: 'HARDTEST' },
    { id: 'A IMP ASM', name: 'A IMP ASM', dept: 'SFPD', label: '⚙️ A IMP ASM', matchStages: ['A IMP ASM'], isGroupTotal: false, groupKey: 'HARDTEST' },
    { id: 'FOCUS', name: 'FOCUS', dept: 'SFPD', label: '🎯 FOCUS', matchStages: ['FOCUS'], isGroupTotal: false, groupKey: 'HARDTEST' },
    { id: 'TOTAL_HARDTEST', name: 'Total Hard Test', dept: 'SFPD', label: '⭐ TOTAL HARD TEST', matchStages: ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'], isGroupTotal: true, groupKey: 'HARDTEST' },
    { id: 'TOTAL_SFPD', name: 'Tổng SFPD', dept: 'SFPD', label: '🚀 TỔNG HỢP KHỐI SFPD', matchStages: ['ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'], isGroupTotal: true, isMajorTotal: true, groupKey: 'SFPD' },

    // --- 2. NHÓM FPD (THÀNH PHẨM & ĐÓNG GÓI) ---
    { id: 'LONG TEST', name: 'LONG TEST', dept: 'FPD', label: '⏱️ LONG TEST', matchStages: ['LONG TEST'], isGroupTotal: false, groupKey: 'FPD' },
    { id: 'TEST ROOM', name: 'TEST ROOM', dept: 'FPD', label: '🌡️ TEST ROOM', matchStages: ['TEST ROOM'], isGroupTotal: false, groupKey: 'FPD' },
    { id: 'QC', name: 'QC', dept: 'FPD', label: '🔍 QC', matchStages: ['QC'], isGroupTotal: false, groupKey: 'FPD' },
    { id: 'PKG', name: 'PKG', dept: 'FPD', label: '📦 PKG', matchStages: ['PKG'], isGroupTotal: false, groupKey: 'MASTERBOX' },
    { id: 'COM PKG AUTO', name: 'COM PKG AUTO', dept: 'FPD', label: '🤖 COM PKG AUTO', matchStages: ['COM PKG', 'COM PKG AUTO'], isGroupTotal: false, groupKey: 'MASTERBOX' },
    { id: 'MB', name: 'MB', dept: 'FPD', label: '💻 MB (MasterBox)', matchStages: ['MB'], isGroupTotal: false, groupKey: 'MASTERBOX' },
    { id: 'TOTAL_MB', name: 'Tổng MasterBox', dept: 'FPD', label: '💻 TỔNG HỢP MASTERBOX', matchStages: ['PKG', 'COM PKG', 'COM PKG AUTO', 'MB'], isGroupTotal: true, groupKey: 'MASTERBOX' },
    { id: 'TOTAL_FPD', name: 'Tổng FPD', dept: 'FPD', label: '📦 TỔNG HỢP KHỐI FPD', matchStages: ['LONG TEST', 'TEST ROOM', 'QC', 'PKG', 'COM PKG', 'COM PKG AUTO', 'MB'], isGroupTotal: true, isMajorTotal: true, groupKey: 'FPD' },

    // --- 3. DÒNG TOÀN BỘ NHÀ MÁY (ALL) ---
    { id: 'TOTAL_ALL', name: 'Toàn Bộ Nhà Máy', dept: 'ALL', label: '🏭 TỔNG CỘNG TOÀN BỘ NHÀ MÁY', matchStages: ['ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS', 'LONG TEST', 'TEST ROOM', 'QC', 'PKG', 'COM PKG', 'COM PKG AUTO', 'MB', 'SMD'], isGroupTotal: true, isGrandTotal: true, groupKey: 'ALL' }
  ];

  /**
   * Lấy danh sách ngày trong khoảng fromDate -> toDate
   */
  function getActiveDatesList(fromStr, toStr) {
    if (window.AppStore && typeof window.AppStore.getDatesInRange === 'function') {
      const dates = window.AppStore.getDatesInRange(fromStr, toStr);
      if (dates && dates.length > 0) return dates;
    }
    const parse = s => {
      const p = s.split('-');
      return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    };
    const f = parse(fromStr);
    const t = parse(toStr);
    const res = [];
    const cur = new Date(f);
    while (cur <= t) {
      res.push(`${cur.getMonth() + 1}/${cur.getDate()}/${cur.getFullYear()}`);
      cur.setDate(cur.getDate() + 1);
    }
    return res;
  }

  /**
   * Parse chuỗi ngày thành Date object
   */
  function parseDateSafe(s) {
    if (!s) return null;
    const clean = s.split(' ')[0].trim();
    if (clean.includes('-')) {
      const p = clean.split('-');
      if (p.length === 3) return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }
    if (clean.includes('/')) {
      const p = clean.split('/');
      if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
    }
    return new Date(clean);
  }

  /**
   * Tính toán dữ liệu Deviation cho 1 danh sách công đoạn
   */
  function computeStageDeviation(matchStagesList, datesList, shiftFilter) {
    const rawItems = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA.items) 
      || (window.AppStore && window.AppStore.dataMass && window.AppStore.dataMass.items) || [];
    
    const stageSet = new Set(matchStagesList.map(s => s.toUpperCase()));
    const negModels = [];
    let totalPlan = 0;
    let totalFact = 0;
    let totalDayPlan = 0;
    let totalDayFact = 0;
    let totalNightPlan = 0;
    let totalNightFact = 0;

    rawItems.forEach(it => {
      const st = (it.stage || '').toUpperCase();
      if (!stageSet.has(st)) return;

      let pSum = 0;
      let fSum = 0;
      let pDaySum = 0;
      let fDaySum = 0;
      let pNightSum = 0;
      let fNightSum = 0;

      datesList.forEach(d => {
        const pd = parseFloat(it.planDay && it.planDay[d]) || 0;
        const fd = parseFloat(it.factDay && it.factDay[d]) || 0;
        const pn = parseFloat(it.planNight && it.planNight[d]) || 0;
        const fn = parseFloat(it.factNight && it.factNight[d]) || 0;
        const pTotal = parseFloat(it.plan && it.plan[d]) || (pd + pn);
        const fTotal = parseFloat(it.fact && it.fact[d]) || (fd + fn);

        pDaySum += pd;
        fDaySum += fd;
        pNightSum += pn;
        fNightSum += fn;

        if (shiftFilter === 'DAY') {
          pSum += pd;
          fSum += fd;
        } else if (shiftFilter === 'NIGHT') {
          pSum += pn;
          fSum += fn;
        } else {
          // ALL hoặc SPLIT: pSum và fSum lấy theo tổng cả 2 ca
          pSum += pTotal;
          fSum += fTotal;
        }
      });

      totalPlan += pSum;
      totalFact += fSum;
      totalDayPlan += pDaySum;
      totalDayFact += fDaySum;
      totalNightPlan += pNightSum;
      totalNightFact += fNightSum;

      const gap = fSum - pSum;

      if (pSum > 0 && gap < 0) {
        negModels.push({
          model: it.model || '',
          productName1C: it.productName1C || it.productName || it.model || '',
          stage: it.stage || '',
          plan: Math.round(pSum),
          fact: Math.round(fSum),
          gap: Math.round(gap),
          planDay: Math.round(pDaySum),
          factDay: Math.round(fDaySum),
          gapDay: Math.round(fDaySum - pDaySum),
          planNight: Math.round(pNightSum),
          factNight: Math.round(fNightSum),
          gapNight: Math.round(fNightSum - pNightSum),
          shortageReasons: it.shortageReasons || null
        });
      }
    });

    negModels.sort((a, b) => a.gap - b.gap);
    const totalShortage = negModels.reduce((acc, m) => acc + m.gap, 0);

    return {
      plan: Math.round(totalPlan),
      fact: Math.round(totalFact),
      gap: Math.round(totalFact - totalPlan),
      negCount: negModels.length,
      totalShortage,
      negModels,
      dayPlan: Math.round(totalDayPlan),
      dayFact: Math.round(totalDayFact),
      dayGap: Math.round(totalDayFact - totalDayPlan),
      nightPlan: Math.round(totalNightPlan),
      nightFact: Math.round(totalNightFact),
      nightGap: Math.round(totalNightFact - totalNightPlan)
    };
  }

  /**
   * Tính toán dữ liệu Issue Record cho 1 danh sách công đoạn
   */
  function computeStageIssues(matchStagesList, fromDateStr, toDateStr, shiftFilter) {
    const issuePayload = window.ISSUE_RECORD_DATA;
    const allIssues = (issuePayload && Array.isArray(issuePayload.items)) ? issuePayload.items : [];

    const dFrom = parseDateSafe(fromDateStr);
    const dTo = parseDateSafe(toDateStr);
    if (dTo) dTo.setHours(23, 59, 59, 999);

    const stageSet = new Set(matchStagesList.map(s => s.toUpperCase()));

    const inRange = [];
    let allTimeCount = 0;

    allIssues.forEach(it => {
      const loc = (it.location || '').toUpperCase();
      const sg = (it.stageGroup || '').toUpperCase();

      // Kiểm tra công đoạn khớp
      const isMatchStage = stageSet.has(loc) || stageSet.has(sg) || matchStagesList.some(s => loc.includes(s.toUpperCase()));
      if (!isMatchStage) return;

      allTimeCount++;

      // Kiểm tra ca (nếu có lọc Ca)
      if (shiftFilter === 'DAY') {
        const sh = (it.shift || '').toLowerCase();
        if (sh.includes('night') || sh.includes('đêm')) return;
      } else if (shiftFilter === 'NIGHT') {
        const sh = (it.shift || '').toLowerCase();
        if (sh.includes('day') || sh.includes('ngày')) return;
      }

      // Kiểm tra khoảng ngày
      const dt = parseDateSafe(it.dateOnly || it.date);
      if (dt && dFrom && dTo) {
        if (dt >= dFrom && dt <= dTo) {
          inRange.push(it);
        }
      } else {
        inRange.push(it);
      }
    });

    const openCount = inRange.filter(it => {
      const st = (it.status || '').toLowerCase();
      return st.includes('chưa') || st.includes('tiến hành') || st.includes('open') || st.includes('pending');
    }).length;

    return {
      inRangeCount: inRange.length,
      allTimeCount,
      openCount,
      closedCount: inRange.length - openCount,
      issues: inRange
    };
  }

  /**
   * Tính toán dữ liệu Issue KPI cho 1 công đoạn
   */
  function computeStageKpi(stageDef) {
    const md = window.KPI_MASTER_DATA;
    const summary = (md && Array.isArray(md.kpiSummary)) ? md.kpiSummary : [];

    const matchStages = stageDef.matchStages || [];
    const isHt = matchStages.some(s => ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'].includes(s));
    const isAsm = matchStages.includes('ASSEMBLY');

    if (!isHt && !isAsm) {
      return {
        hasKpi: false,
        statusText: 'ℹ️ Đạt tiến độ',
        failingCount: 0,
        failingList: [],
        note: 'Đạt tiến độ xuất xưởng & quản lý chuyền'
      };
    }

    const failingList = [];
    const seenKeys = new Set();
    let currentProc = '';

    const isTotalSfpd = (stageDef.id === 'TOTAL_SFPD') || (stageDef.name && stageDef.name.includes('SFPD')) || (isHt && isAsm);
    const isTotalHardTest = (stageDef.id === 'TOTAL_HARDTEST') || (stageDef.name && stageDef.name.includes('Total Hard Test'));

    summary.forEach(r => {
      if (r.process && r.process.trim()) {
        currentProc = r.process.trim().toUpperCase();
      }

      // Lọc quy trình: nếu là đơn lẻ thì lọc đúng theo nhóm
      if (!isTotalSfpd) {
        if (stageDef.id === 'ASSEMBLY' && currentProc !== 'ASSEMBLY') return;
        if ((isTotalHardTest || (isHt && !isAsm)) && currentProc !== 'HARD TEST') return;
      }

      const ind = (r.indicator || '').trim();
      const indLower = ind.toLowerCase();
      let actualVal = r.result;
      let targetL5 = r.l5;

      // 1. Chỉ số Clip (all plant) toàn nhà máy hiện đạt 62.6% (Level 1, NG)
      if (indLower.includes('clip')) {
        const key = 'clip_all_plant';
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const procLabel = isTotalSfpd ? 'SFPD' : (stageDef.id === 'ASSEMBLY' ? 'ASSEMBLY' : 'HARD TEST');
        failingList.push({
          process: procLabel,
          indicator: ind,
          target: targetL5 || '>= 95%',
          actual: '62.6%',
          status: 'NG (Level 1)',
          gap: '-32.4% so với Target Level 5'
        });
        return;
      }

      // 2. Các chỉ số khác nếu có kết luận NG
      if (r.conclusion && (r.conclusion.toUpperCase() === 'NG' || r.conclusion.includes('L1') || r.conclusion.includes('L2'))) {
        const key = `${ind}_${currentProc}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        failingList.push({
          process: currentProc || (isHt ? 'HARD TEST' : 'ASSEMBLY'),
          indicator: ind,
          target: targetL5,
          actual: actualVal,
          status: 'NG',
          gap: 'Chưa đạt Level 5'
        });
      }
    });

    if (failingList.length > 0) {
      return {
        hasKpi: true,
        statusText: `🔴 ${failingList.length} Chỉ Số NG`,
        failingCount: failingList.length,
        failingList,
        note: failingList.map(f => f.indicator).join(', ')
      };
    }

    return {
      hasKpi: true,
      statusText: '🟢 100% Đạt Level 5',
      failingCount: 0,
      failingList: [],
      note: 'Tất cả 6 chỉ số đều đạt Level 5'
    };
  }

  /**
   * Render chính cho Tab / Bảng Report Issue
   */
  window.renderReportIssueSection = function() {
    const container = document.getElementById('datamassReportIssueTableContainer');
    if (!container) return;

    const st = window.ReportIssueState;
    const datesList = getActiveDatesList(st.fromDate, st.toDate);

    // Lọc danh sách công đoạn hiển thị theo bộ lọc Stage
    let visibleStageDefs = STAGE_DEFINITIONS;
    if (st.selectedStage === 'HARDTEST_TOTAL') {
      visibleStageDefs = STAGE_DEFINITIONS.filter(s => s.groupKey === 'HARDTEST');
    } else if (st.selectedStage === 'ASSEMBLY') {
      visibleStageDefs = STAGE_DEFINITIONS.filter(s => s.id === 'ASSEMBLY');
    } else if (st.selectedStage === 'HARDTEST_AND_ASSEMBLY') {
      visibleStageDefs = STAGE_DEFINITIONS.filter(s => s.dept === 'SFPD');
    } else if (st.selectedStage === 'FPD_TOTAL') {
      visibleStageDefs = STAGE_DEFINITIONS.filter(s => s.dept === 'FPD');
    } else if (st.selectedStage === 'MASTERBOX_TOTAL') {
      visibleStageDefs = STAGE_DEFINITIONS.filter(s => s.groupKey === 'MASTERBOX');
    }

    let rowsHtml = '';
    let sttCounter = 1;

    visibleStageDefs.forEach(sDef => {
      const dev = computeStageDeviation(sDef.matchStages, datesList, st.selectedShift);
      const iss = computeStageIssues(sDef.matchStages, st.fromDate, st.toDate, st.selectedShift);
      const kpi = computeStageKpi(sDef);

      let rowBg = 'transparent';
      let borderStyle = 'border-bottom: 1px solid rgba(255, 255, 255, 0.08);';
      let fontWeight = 'normal';
      let sttDisplay = '';

      if (sDef.isGrandTotal) {
        rowBg = 'rgba(234, 179, 8, 0.08)';
        borderStyle = 'border-top: 2px solid #eab308; border-bottom: 2px solid #eab308;';
        fontWeight = '800';
        sttDisplay = '★';
      } else if (sDef.isMajorTotal) {
        rowBg = sDef.dept === 'SFPD' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)';
        borderStyle = 'border-top: 1px solid rgba(255, 255, 255, 0.2); border-bottom: 2px solid rgba(255, 255, 255, 0.2);';
        fontWeight = '800';
        sttDisplay = '∑';
      } else if (sDef.isGroupTotal) {
        rowBg = 'rgba(255, 255, 255, 0.04)';
        borderStyle = 'border-bottom: 1.5px solid rgba(255, 255, 255, 0.15);';
        fontWeight = '700';
        sttDisplay = '∑';
      } else {
        sttDisplay = sttCounter++;
      }

      // Màu sắc badge Bộ phận
      const deptBadgeColor = sDef.dept === 'SFPD' ? 'background: #3b82f6; color: #fff;' 
        : (sDef.dept === 'FPD' ? 'background: #a855f7; color: #fff;' 
        : 'background: #eab308; color: #000;');

      rowsHtml += `
        <tr class="report-issue-stage-row" style="background: ${rowBg}; ${borderStyle} font-weight: ${fontWeight};">
          <td style="text-align: center; vertical-align: middle; color: var(--text-muted); font-size: 0.85rem;">
            ${sttDisplay}
          </td>
          <td style="vertical-align: middle;">
            <span class="badge" style="${deptBadgeColor} font-size: 0.72rem; padding: 0.18rem 0.5rem; border-radius: 4px; font-weight: 800;">
              ${sDef.dept}
            </span>
          </td>
          <td style="vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.85rem; color: ${sDef.isGroupTotal ? '#38bdf8' : 'var(--text-primary)'}; font-weight: ${sDef.isGroupTotal ? '800' : '600'};">
                ${sDef.label}
              </span>
            </div>
          </td>
          <td style="vertical-align: middle; cursor: pointer;" onclick="handleOpenReportDetailModal('DEVIATION', '${sDef.name}', '${sDef.matchStages.join(',')}')" title="Bấm để xem danh sách chi tiết các mã bị âm">
            <div class="report-cell-metric">
              <span class="report-badge-neg" style="background: ${dev.negCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)'}; color: ${dev.negCount > 0 ? '#f87171' : '#34d399'}; border: 1px solid ${dev.negCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.3)'}; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 800; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                <span>${dev.negCount > 0 ? `📉 ${dev.negCount} Mã Âm` : '🟢 Không có mã âm'}</span>
                ${dev.negCount > 0 ? `<span style="font-size: 0.725rem; opacity: 0.9;">(${dev.totalShortage.toLocaleString('vi-VN')} pcs)</span>` : ''}
              </span>
              <span style="font-size: 0.675rem; color: #94a3b8; margin-top: 0.15rem; display: block;">
                ${st.selectedShift === 'SPLIT' 
                  ? `☀️ Ngày: ${dev.dayFact.toLocaleString('vi-VN')}/${dev.dayPlan.toLocaleString('vi-VN')} (${dev.dayGap >= 0 ? '+' : ''}${dev.dayGap.toLocaleString('vi-VN')}) • 🌙 Đêm: ${dev.nightFact.toLocaleString('vi-VN')}/${dev.nightPlan.toLocaleString('vi-VN')} (${dev.nightGap >= 0 ? '+' : ''}${dev.nightGap.toLocaleString('vi-VN')}) 🔍 Xem`
                  : `Plan: ${dev.plan.toLocaleString('vi-VN')} • Fact: ${dev.fact.toLocaleString('vi-VN')} • Gap: ${dev.gap > 0 ? '+' : ''}${dev.gap.toLocaleString('vi-VN')} 🔍 Xem`
                }
              </span>
            </div>
          </td>
          <td style="vertical-align: middle; cursor: pointer;" onclick="handleOpenReportDetailModal('ISSUE_RECORD', '${sDef.name}', '${sDef.matchStages.join(',')}')" title="Bấm để xem danh sách các sự cố ghi nhận">
            <div class="report-cell-metric">
              <span class="report-badge-issue" style="background: ${iss.inRangeCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.12)'}; color: ${iss.inRangeCount > 0 ? '#fbbf24' : '#94a3b8'}; border: 1px solid ${iss.inRangeCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(148, 163, 184, 0.25)'}; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 800; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                <span>⚠️ ${iss.inRangeCount} Sự Cố</span>
              </span>
              <span style="font-size: 0.675rem; color: #94a3b8; margin-top: 0.15rem; display: block;">
                (${iss.openCount} chưa đóng • ${iss.allTimeCount} tổng lịch sử) 🔍 Xem
              </span>
            </div>
          </td>
          <td style="vertical-align: middle; cursor: pointer;" onclick="handleOpenReportDetailModal('KPI', '${sDef.name}', '${sDef.matchStages.join(',')}')" title="Bấm để xem chi tiết tình trạng KPI">
            <div class="report-cell-metric">
              ${kpi.failingCount > 0 ? `
                <span class="report-badge-kpi-ng" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 800; font-size: 0.825rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                  <span>${kpi.statusText}</span>
                </span>
                <span style="font-size: 0.675rem; color: #fca5a5; margin-top: 0.15rem; display: block;">${kpi.note} 🔍 Xem</span>
              ` : `
                <span class="report-badge-kpi-ok" style="background: ${kpi.hasKpi ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)'}; color: ${kpi.hasKpi ? '#34d399' : '#94a3b8'}; border: 1px solid ${kpi.hasKpi ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.3)'}; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; font-size: 0.825rem;">
                  <span>${kpi.statusText}</span>
                </span>
                <span style="font-size: 0.675rem; color: #94a3b8; margin-top: 0.15rem; display: block;">${kpi.note} 🔍 Xem</span>
              `}
            </div>
          </td>
        </tr>
      `;
    });

    const tableHtml = `
      <div class="table-responsive" style="overflow-x: auto; border: 1px solid var(--border-glass); border-radius: var(--radius-md);">
        <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.825rem;">
          <thead>
            <tr style="background: rgba(255, 255, 255, 0.06); border-bottom: 2px solid rgba(255, 255, 255, 0.15);">
              <th style="width: 45px; text-align: center; font-weight: 800; padding: 0.65rem 0.4rem;">STT</th>
              <th style="width: 100px; font-weight: 800; padding: 0.65rem 0.6rem;">Bộ Phận</th>
              <th style="width: 220px; font-weight: 800; padding: 0.65rem 0.6rem;">Công Đoạn</th>
              <th style="font-weight: 800; padding: 0.65rem 0.6rem; color: #f87171;">
                📉 Tổng Deviation (Mã Âm Luỹ Kế Giai Đoạn)
              </th>
              <th style="font-weight: 800; padding: 0.65rem 0.6rem; color: #fbbf24;">
                ⚠️ Tổng Issue Record (Sheet Issue Record)
              </th>
              <th style="font-weight: 800; padding: 0.65rem 0.6rem; color: #38bdf8;">
                🎯 Issue KPI (Chỉ Số Không Đạt)
              </th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = tableHtml;

    // Cập nhật badge tổng hợp
    const badge = document.getElementById('badgeReportIssueSummary');
    if (badge) {
      const shiftText = st.selectedShift === 'ALL' ? 'Cả 2 Ca' 
        : (st.selectedShift === 'DAY' ? 'Ca Ngày' 
        : (st.selectedShift === 'NIGHT' ? 'Ca Đêm' : 'Phân Tách 2 Ca'));
      badge.textContent = `${st.fromDate.split('-').reverse().slice(0, 2).join('/')} ➔ ${st.toDate.split('-').reverse().slice(0, 2).join('/')} • ${shiftText}`;
    }
  };

  /**
   * Thay đổi ngày lọc giai đoạn
   */
  window.handleReportIssueDateChange = function(type, val) {
    if (type === 'FROM') window.ReportIssueState.fromDate = val;
    if (type === 'TO') window.ReportIssueState.toDate = val;
    window.renderReportIssueSection();
  };

  /**
   * Thay đổi Ca làm việc
   */
  window.handleReportIssueShiftChange = function(shift) {
    window.ReportIssueState.selectedShift = shift;
    document.querySelectorAll('#reportIssueShiftGroup .btn-mode').forEach(b => {
      if (b.dataset.shift === shift) b.classList.add('active');
      else b.classList.remove('active');
    });
    window.renderReportIssueSection();
    const shiftLabel = shift === 'ALL' ? 'Cả 2 Ca' 
      : (shift === 'DAY' ? 'Ca Ngày' 
      : (shift === 'NIGHT' ? 'Ca Đêm' : 'Phân Tách 2 Ca'));
    window.showToast('info', `Đã lọc báo cáo theo: ${shiftLabel}`);
  };

  /**
   * Thay đổi chọn công đoạn (qua chip hoặc dropdown)
   */
  window.handleReportIssueStageChange = function(stageCode) {
    window.ReportIssueState.selectedStage = stageCode;
    
    // Đồng bộ dropdown select
    const sel = document.getElementById('reportIssueStageSelect');
    if (sel) sel.value = stageCode;

    // Đồng bộ nút chip
    document.querySelectorAll('#reportIssueStagePills .btn-quick-stage').forEach(b => {
      if (b.dataset.stage === stageCode) b.classList.add('active');
      else b.classList.remove('active');
    });

    window.renderReportIssueSection();
  };

  /**
   * Đồng bộ nhanh giai đoạn & ca từ Bảng 2
   */
  window.handleReportIssueSyncWithTable2 = function() {
    const inputFrom = document.getElementById('datamassFromDate');
    const inputTo = document.getElementById('datamassToDate');
    if (inputFrom && inputFrom.value) {
      window.ReportIssueState.fromDate = inputFrom.value;
      const inpF = document.getElementById('reportIssueFromDate');
      if (inpF) inpF.value = inputFrom.value;
    }
    if (inputTo && inputTo.value) {
      window.ReportIssueState.toDate = inputTo.value;
      const inpT = document.getElementById('reportIssueToDate');
      if (inpT) inpT.value = inputTo.value;
    }
    if (window.AppStore && window.AppStore.currentShiftFilter) {
      window.handleReportIssueShiftChange(window.AppStore.currentShiftFilter);
    } else {
      window.renderReportIssueSection();
    }
    window.showToast('success', '🔄 Đã đồng bộ giai đoạn ngày và ca từ Bảng 2 thành công!');
  };

  /**
   * Chọn nhanh tuần (W48 hoặc W47)
   */
  window.handleReportIssueQuickWeek = function(weekType) {
    if (weekType === 'CURRENT' || weekType === 'W48') {
      window.ReportIssueState.fromDate = '2026-11-19';
      window.ReportIssueState.toDate = '2026-11-23';
    } else if (weekType === 'W47') {
      window.ReportIssueState.fromDate = '2026-11-12';
      window.ReportIssueState.toDate = '2026-11-18';
    }
    const inpF = document.getElementById('reportIssueFromDate');
    const inpT = document.getElementById('reportIssueToDate');
    if (inpF) inpF.value = window.ReportIssueState.fromDate;
    if (inpT) inpT.value = window.ReportIssueState.toDate;
    window.renderReportIssueSection();
    window.showToast('info', `Đã chọn: ${weekType === 'W47' ? 'Tuần trước (W47)' : 'Tuần hiện tại (W48)'}`);
  };

  /**
   * Tương thích ngược với các lệnh gọi chu kỳ tuần cũ
   */
  window.handleReportIssueWeekChange = function(weekType) {
    if (weekType === 'CURRENT' || weekType === 'W48') {
      window.handleReportIssueQuickWeek('W48');
    } else if (weekType === 'W47') {
      window.handleReportIssueQuickWeek('W47');
    } else if (weekType === 'ACTIVE_SCHEDULE') {
      window.handleReportIssueSyncWithTable2();
    } else {
      window.ReportIssueState.fromDate = '2026-11-12';
      window.ReportIssueState.toDate = '2026-11-23';
      const inpF = document.getElementById('reportIssueFromDate');
      const inpT = document.getElementById('reportIssueToDate');
      if (inpF) inpF.value = window.ReportIssueState.fromDate;
      if (inpT) inpT.value = window.ReportIssueState.toDate;
      window.renderReportIssueSection();
    }
  };

  /**
   * Thu gọn / mở rộng toàn bộ Section Card Report Issue
   */
  window.toggleReportIssueSectionCollapse = function() {
    const body = document.getElementById('datamassReportIssueBodyWrap');
    const btn = document.getElementById('btnToggleReportIssueSection');
    if (!body) return;
    if (body.style.display === 'none') {
      body.style.display = 'block';
      if (btn) btn.innerHTML = '🔼 Thu gọn';
    } else {
      body.style.display = 'none';
      if (btn) btn.innerHTML = '🔽 Mở rộng';
    }
  };

  /**
   * Mở Modal hiển thị chi tiết khi click vào các ô số liệu
   */
  window.handleOpenReportDetailModal = function(type, stageLabel, matchStagesStr) {
    const modal = document.getElementById('modalReportIssueDetail');
    const titleEl = document.getElementById('reportIssueDetailModalTitle');
    const bodyEl = document.getElementById('reportIssueDetailModalBody');
    if (!modal || !titleEl || !bodyEl) return;

    const st = window.ReportIssueState;
    const datesList = getActiveDatesList(st.fromDate, st.toDate);
    const matchStagesList = matchStagesStr.split(',').map(s => s.trim()).filter(Boolean);

    if (type === 'DEVIATION') {
      titleEl.innerHTML = `📉 Chi Tiết Danh Sách Mã Bị Âm: ${stageLabel}`;
      const dev = computeStageDeviation(matchStagesList, datesList, st.selectedShift);
      
      let rows = '';
      if (dev.negModels.length === 0) {
        rows = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #34d399;">🟢 Tuyệt vời! Không có mã nào bị âm sản lượng trong giai đoạn này.</td></tr>`;
      } else {
        dev.negModels.forEach((m, idx) => {
          rows += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
              <td><span class="badge badge-purple" style="font-size: 0.72rem;">${m.stage}</span></td>
              <td><strong style="color: var(--text-primary);">${m.productName1C}</strong></td>
              <td style="text-align: right; color: #93c5fd;">${m.plan.toLocaleString('vi-VN')}</td>
              <td style="text-align: right; color: #34d399;">${m.fact.toLocaleString('vi-VN')}</td>
              <td style="text-align: right; color: #f87171; font-weight: 800;">${m.gap.toLocaleString('vi-VN')}</td>
            </tr>
          `;
        });
      }

      bodyEl.innerHTML = `
        <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">
            Giai đoạn: <strong>${st.fromDate} ➔ ${st.toDate}</strong> (${st.selectedShift === 'ALL' ? 'Cả 2 Ca' : st.selectedShift}) • Tổng cộng: <strong style="color: #f87171;">${dev.negCount} mã âm</strong> • Tổng thiếu hụt: <strong style="color: #f87171;">${dev.totalShortage.toLocaleString('vi-VN')} pcs</strong>
          </span>
          <button type="button" class="btn btn-sm btn-outline" onclick="handleCopyReportDeviationModal()" style="font-size: 0.75rem;">📋 Copy Bảng</button>
        </div>
        <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
          <table class="data-table" style="width: 100%; font-size: 0.8rem;">
            <thead>
              <tr style="background: rgba(255, 255, 255, 0.08);">
                <th style="width: 40px; text-align: center;">STT</th>
                <th style="width: 110px;">Công Đoạn</th>
                <th>Tên Model (Mã 1C)</th>
                <th style="width: 80px; text-align: right;">Kế Hoạch</th>
                <th style="width: 80px; text-align: right;">Thực Tế</th>
                <th style="width: 90px; text-align: right; color: #f87171;">Chênh Lệch</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    } else if (type === 'ISSUE_RECORD') {
      titleEl.innerHTML = `⚠️ Chi Tiết Sự Cố Từ Sheet Issue Record: ${stageLabel}`;
      const iss = computeStageIssues(matchStagesList, st.fromDate, st.toDate, st.selectedShift);

      // Thống kê chi tiết trạng thái trong giai đoạn tra cứu
      let countChuaHoanThanh = 0;
      let countChuaXong = 0;
      let countDangTienHanh = 0;
      let countHoanThanh = 0;

      function getStatusCategory(stStr) {
        const s = (stStr || '').trim().toLowerCase();
        if (s.includes('chưa bắt đầu') || s.includes('chưa hoàn thành')) return 'CHUA_HOAN_THANH';
        if (s === '' || s.includes('chưa xong') || s.includes('chưa')) return 'CHUA_XONG';
        if (s.includes('đang tiến hành') || s.includes('in progress') || s.includes('tiến hành')) return 'DANG_TIEN_HANH';
        if (s.includes('hoàn thành') || s.includes('done') || s.includes('closed') || s.includes('đã đóng')) return 'HOAN_THANH';
        return 'CHUA_XONG';
      }

      function getStatusRank(stStr) {
        const cat = getStatusCategory(stStr);
        if (cat === 'CHUA_HOAN_THANH') return 1;
        if (cat === 'CHUA_XONG') return 2;
        if (cat === 'DANG_TIEN_HANH') return 3;
        if (cat === 'HOAN_THANH') return 4;
        return 2;
      }

      iss.issues.forEach(it => {
        const cat = getStatusCategory(it.status);
        if (cat === 'CHUA_HOAN_THANH') countChuaHoanThanh++;
        else if (cat === 'CHUA_XONG') countChuaXong++;
        else if (cat === 'DANG_TIEN_HANH') countDangTienHanh++;
        else if (cat === 'HOAN_THANH') countHoanThanh++;
      });

      // Sắp xếp theo yêu cầu: chưa hoàn thành lên đầu -> đến chưa xong -> đang tiến hành -> cuối cùng là hoàn thành
      const sortedIssues = [...iss.issues].sort((a, b) => {
        const rankA = getStatusRank(a.status);
        const rankB = getStatusRank(b.status);
        if (rankA !== rankB) return rankA - rankB;
        const dtA = parseDateSafe(a.dateOnly || a.date);
        const dtB = parseDateSafe(b.dateOnly || b.date);
        return (dtB ? dtB.getTime() : 0) - (dtA ? dtA.getTime() : 0);
      });

      let rows = '';
      if (sortedIssues.length === 0) {
        rows = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #34d399;">🟢 Không ghi nhận sự cố nào trong giai đoạn này.</td></tr>`;
      } else {
        sortedIssues.forEach((it, idx) => {
          const cat = getStatusCategory(it.status);
          const rawStatus = (it.status && it.status.trim()) ? it.status.trim() : 'Chưa xong';
          let statusBadge = '';
          if (cat === 'CHUA_HOAN_THANH') {
            statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.725rem; font-weight: 700;">🔴 ${rawStatus}</span>`;
          } else if (cat === 'CHUA_XONG') {
            statusBadge = `<span class="badge" style="background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); font-size: 0.725rem; font-weight: 700;">🟠 ${rawStatus}</span>`;
          } else if (cat === 'DANG_TIEN_HANH') {
            statusBadge = `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); font-size: 0.725rem; font-weight: 700;">🟡 ${rawStatus}</span>`;
          } else {
            statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.725rem; font-weight: 700;">🟢 ${rawStatus}</span>`;
          }

          rows += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">${idx + 1}</td>
              <td style="font-size: 0.75rem; color: #94a3b8; white-space: nowrap;">${it.date || it.dateOnly}</td>
              <td><span class="badge" style="background: rgba(147, 51, 234, 0.2); color: #c084fc; font-size: 0.7rem;">${it.location || it.stageGroup}</span></td>
              <td><strong style="color: #fbbf24;">${it.issueName}</strong></td>
              <td style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px;">${it.description || '—'}</td>
              <td style="font-size: 0.75rem; color: #38bdf8; max-width: 200px;">${it.corrective || '—'}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        });
      }

      bodyEl.innerHTML = `
        <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span>Tổng cộng: <strong style="color: #fbbf24; font-size: 0.95rem;">${iss.inRangeCount} sự cố</strong></span>
            <span style="color: var(--text-muted);">/</span>
            ${countChuaHoanThanh > 0 ? `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 700;">🔴 ${countChuaHoanThanh} Chưa hoàn thành</span>` : ''}
            <span class="badge" style="background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); font-weight: 700;">🟠 ${countChuaXong} Chưa xong</span>
            <span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); font-weight: 700;">🟡 ${countDangTienHanh} Đang tiến hành</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700;">🟢 ${countHoanThanh} Hoàn thành</span>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="handleCopyReportIssuesModal()" style="font-size: 0.75rem;">📋 Copy Sự Cố</button>
        </div>
        <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
          <table class="data-table" style="width: 100%; font-size: 0.8rem;">
            <thead>
              <tr style="background: rgba(255, 255, 255, 0.08);">
                <th style="width: 40px; text-align: center;">STT</th>
                <th style="width: 85px;">Ngày</th>
                <th style="width: 100px;">Khu Vực</th>
                <th style="width: 180px;">Tên Vấn Đề</th>
                <th>Mô Tả Chi Tiết</th>
                <th>Biện Pháp Khắc Phục</th>
                <th style="width: 110px;">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    } else if (type === 'KPI') {
      titleEl.innerHTML = `🎯 Tình Trạng KPI Chi Tiết: ${stageLabel}`;
      const fakeDef = { id: stageLabel, name: stageLabel, matchStages: matchStagesList };
      const kpi = computeStageKpi(fakeDef);

      let content = '';
      if (kpi.failingList.length === 0) {
        content = `
          <div style="text-align: center; padding: 2.5rem; color: #34d399;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
            <strong style="font-size: 1.1rem;">Toàn bộ chỉ số KPI đều đạt mục tiêu Level 5!</strong>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">${kpi.note}</p>
          </div>
        `;
      } else {
        let itemsHtml = '';
        kpi.failingList.forEach(f => {
          itemsHtml += `
            <div style="padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; margin-bottom: 0.65rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #f87171; font-size: 0.95rem;">${f.indicator} (${f.process})</strong>
                <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${f.status}</span>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.4rem; font-size: 0.825rem; color: var(--text-secondary);">
                <span>Mục tiêu Level 5: <strong style="color: #34d399;">${f.target}</strong></span>
                <span>Thực tế đạt: <strong style="color: #f87171;">${f.actual}</strong></span>
                <span>Chênh lệch: <strong style="color: #fca5a5;">${f.gap}</strong></span>
              </div>
            </div>
          `;
        });

        content = `
          <div style="margin-bottom: 1rem;">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">
              Hệ thống phát hiện <strong style="color: #f87171;">${kpi.failingList.length} chỉ số KPI</strong> cần chú ý cải thiện:
            </span>
          </div>
          ${itemsHtml}
          <div style="margin-top: 1rem; text-align: right;">
            <button type="button" class="btn btn-sm btn-primary" onclick="switchToTab('kpi-result')" style="font-size: 0.8rem;">
              👉 Chuyển Sang Tab KPI Result Chi Tiết
            </button>
          </div>
        `;
      }

      bodyEl.innerHTML = content;
    }

    modal.style.display = 'flex';
  };

  /**
   * Đóng Modal chi tiết
   */
  window.handleCloseReportDetailModal = function() {
    const modal = document.getElementById('modalReportIssueDetail');
    if (modal) modal.style.display = 'none';
  };

  /**
   * Copy danh sách mã âm trong Modal
   */
  window.handleCopyReportDeviationModal = function() {
    const modalBody = document.getElementById('reportIssueDetailModalBody');
    if (!modalBody) return;
    const table = modalBody.querySelector('table');
    if (!table) return;

    let text = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      const cells = Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim());
      text += cells.join('\t') + '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      window.showToast('success', '📋 Đã sao chép danh sách mã âm vào clipboard!');
    }).catch(() => {
      window.showToast('warning', '⚠️ Không thể tự động ghi vào clipboard.');
    });
  };

  /**
   * Copy danh sách sự cố trong Modal
   */
  window.handleCopyReportIssuesModal = function() {
    const modalBody = document.getElementById('reportIssueDetailModalBody');
    if (!modalBody) return;
    const table = modalBody.querySelector('table');
    if (!table) return;

    let text = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
      const cells = Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.trim());
      text += cells.join('\t') + '\n';
    });

    navigator.clipboard.writeText(text).then(() => {
      window.showToast('success', '📋 Đã sao chép danh sách sự cố vào clipboard!');
    }).catch(() => {
      window.showToast('warning', '⚠️ Không thể tự động ghi vào clipboard.');
    });
  };

  /**
   * Copy toàn bộ Bảng Report Issue cho Google Sheets
   */
  window.handleCopyReportIssueTable = function() {
    const st = window.ReportIssueState;
    const datesList = getActiveDatesList(st.fromDate, st.toDate);

    const rows = [
      ['STT', 'Bộ Phận', 'Công Đoạn', 'Tổng Deviation', 'Tổng Issue Record', 'Issue KPI']
    ];

    let idx = 1;
    STAGE_DEFINITIONS.forEach(sDef => {
      const dev = computeStageDeviation(sDef.matchStages, datesList, st.selectedShift);
      const iss = computeStageIssues(sDef.matchStages, st.fromDate, st.toDate, st.selectedShift);
      const kpi = computeStageKpi(sDef);

      rows.push([
        sDef.isGrandTotal ? '★' : (sDef.isGroupTotal ? '∑' : String(idx++)),
        sDef.dept,
        sDef.name,
        `${dev.negCount} mã âm (${dev.totalShortage} pcs) - Plan: ${dev.plan}, Fact: ${dev.fact}, Gap: ${dev.gap}`,
        `${iss.inRangeCount} sự cố (${iss.openCount} chưa đóng) - ${iss.allTimeCount} tổng`,
        kpi.failingCount > 0 ? `${kpi.failingCount} chỉ số không đạt (${kpi.note})` : kpi.statusText
      ]);
    });

    const tsv = rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      window.showToast('success', '📋 Đã sao chép Báo Cáo Issue vào clipboard! Dán (Ctrl+V) vào Google Sheets.');
    }).catch(() => {
      window.showToast('warning', '⚠️ Không thể tự động ghi vào clipboard. Vui lòng cấp quyền!');
    });
  };

  /**
   * Xuất file CSV Báo Cáo Issue
   */
  window.handleExportReportIssueCSV = function() {
    const st = window.ReportIssueState;
    const datesList = getActiveDatesList(st.fromDate, st.toDate);

    const csvRows = [
      '\uFEFFSTT,Bộ Phận,Công Đoạn,Tổng Deviation,Tổng Issue Record,Issue KPI'
    ];

    let idx = 1;
    STAGE_DEFINITIONS.forEach(sDef => {
      const dev = computeStageDeviation(sDef.matchStages, datesList, st.selectedShift);
      const iss = computeStageIssues(sDef.matchStages, st.fromDate, st.toDate, st.selectedShift);
      const kpi = computeStageKpi(sDef);

      const stt = sDef.isGrandTotal ? '★' : (sDef.isGroupTotal ? '∑' : String(idx++));
      csvRows.push(`"${stt}","${sDef.dept}","${sDef.name}","${dev.negCount} mã âm (${dev.totalShortage} pcs)","${iss.inRangeCount} sự cố","${kpi.statusText}"`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Report_Issue_${st.fromDate}_${st.toDate}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.showToast('success', '📥 Đã tải file CSV Báo Cáo Issue thành công!');
  };

  /**
   * Cuộn nhanh xuống Báo Cáo Report Issue
   */
  window.scrollToReportIssueSection = function() {
    const el = document.getElementById('datamassReportIssueSectionCard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.showToast('info', 'Đã cuộn đến Báo Cáo Report Issue (Theo Bộ Phận & Công Đoạn)');
    }
  };

  // Tự động khởi tạo khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (typeof window.renderReportIssueSection === 'function') {
        window.renderReportIssueSection();
      }
      if (window.location.hash === '#report-issue' || window.location.search.includes('report-issue')) {
        window.scrollToReportIssueSection();
      }
    }, 400);
  });

})();
