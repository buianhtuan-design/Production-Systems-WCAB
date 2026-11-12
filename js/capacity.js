/**
 * AJAX PROPLAN MES - CAPACITY PLANNING & CYCLE TIME MODULE
 * Quản trị Năng lực sản xuất theo Công đoạn (Assembly, Hard Test, Optics ASM, Focus).
 * Tính toán Cycle time tiêu chuẩn (Norm) -> Plan tiêu chuẩn / Ca (12h/8h/24h)
 * Cycle time thực tế = Norm / Line Performance (theo từng Group Model và từng Line).
 */

(function() {
  'use strict';

  // State local cache for search input
  let searchDebounceTimer = null;

  window.renderCapacityView = function(targetContainerId = 'capacityContainer') {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    if (!window.AppStore) {
      container.innerHTML = '<div class="alert alert-warning">Đang khởi tạo AppStore...</div>';
      return;
    }

    const data = window.AppStore.getAssemblyCapacityData();
    const currentStage = window.AppStore.selectedCapacityStage || 'ASSEMBLY';
    const shiftHours = parseFloat(window.AppStore.capacityShiftHours || 21.41);
    const viewMode = window.AppStore.capacityViewMode || 'MATRIX';
    const searchVal = (document.getElementById('capacitySearchInput')?.value || '').trim();
    const _defWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const simFromDate = window.AppStore.simFromDate || window.AppStore.fromDate || (_defWeek ? _defWeek.fromDate : '2026-11-05');
    const simToDate = window.AppStore.simToDate || window.AppStore.toDate || (_defWeek ? _defWeek.toDate : '2026-11-05');

    // 1. Dữ liệu Assembly (Lắp Ráp)
    const asmData = window.AppStore.getAssemblyCapacityData();
    const currentGroup = window.AppStore.selectedCapacityGroup || 'ALL';
    const currentLine = window.AppStore.selectedCapacityLine || 'ALL';
    const asmItems = window.AppStore.getFilteredCapacityItems({
      groupFilter: currentGroup,
      lineFilter: currentLine,
      search: searchVal,
      shiftHours
    });
    const allGroups = (asmData.groups || []);
    const allLines = (asmData.lines || []);

    const totalBoards = asmItems.length;
    const uniqueGroups = new Set(asmItems.map(i => i.group)).size;
    const validNorms = asmItems.filter(i => i.norm > 0).map(i => i.norm);
    const avgNorm = validNorms.length > 0 ? (validNorms.reduce((a, b) => a + b, 0) / validNorms.length).toFixed(1) : '0';
    const minNorm = validNorms.length > 0 ? Math.min(...validNorms) : 0;
    const maxNorm = validNorms.length > 0 ? Math.max(...validNorms) : 0;

    // 2. Dữ liệu Total Hardtest (Hard Test / Optics ASM / Focus)
    const htData = window.AppStore.getHardtestCapacityData();
    const currentHtSubStage = window.AppStore.selectedHardtestSubStage || 'ALL';
    const currentHtGroup = window.AppStore.selectedHardtestGroup || 'ALL';
    const currentHtMetricMode = window.AppStore.selectedHardtestMetricMode || 'ACTUAL';
    const htItems = window.AppStore.getFilteredHardtestCapacityItems({
      groupFilter: currentHtGroup,
      stageFilter: currentHtSubStage,
      search: searchVal,
      shiftHours,
      capMode: currentHtMetricMode
    });

    const htTotalBoards = htItems.length;
    const htUniqueGroups = new Set(htItems.map(i => i.group)).size;
    const htTotalTbQty = htItems.reduce((acc, i) => acc + (i.tbQty || 0), 0);
    const htValidNorms = htItems.filter(i => i.ctNorm > 0).map(i => i.ctNorm);
    const htAvgNorm = htValidNorms.length > 0 ? (htValidNorms.reduce((a, b) => a + b, 0) / htValidNorms.length).toFixed(1) : '0';
    const htMinNorm = htValidNorms.length > 0 ? Math.min(...htValidNorms) : 0;
    const htMaxNorm = htValidNorms.length > 0 ? Math.max(...htValidNorms) : 0;
    const htValidFtts = htItems.filter(i => i.ftt > 0).map(i => i.fttPct);
    const htAvgFtt = htValidFtts.length > 0 ? (htValidFtts.reduce((a, b) => a + b, 0) / htValidFtts.length).toFixed(1) : '0';
    const htValidDts = htItems.filter(i => i.dtTotalPct > 0).map(i => i.dtTotalPct);
    const htAvgDt = htValidDts.length > 0 ? (htValidDts.reduce((a, b) => a + b, 0) / htValidDts.length).toFixed(1) : '2.5';
    const htAvgUphStd = htAvgNorm > 0 ? Math.round(3600 / htAvgNorm) : 0;

    let html = `
      <div class="capacity-view-wrapper" style="padding: 0.25rem 0;">
        <!-- 1. TOP BANNER & STAGE SWITCHER -->
        <div class="capacity-card-banner" style="padding: 0.35rem 0.85rem; margin-bottom: 0.35rem;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.2rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 1.25rem;">⚡</span>
                <h2 style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #f8fafc; letter-spacing: -0.01em;">
                  BẢNG QUẢN TRỊ NĂNG LỰC SẢN XUẤT (CAPACITY PLANNING)
                </h2>
                <span class="badge badge-purple" style="font-weight: 800; font-size: 0.75rem;">
                  ${currentStage === 'TOTAL_HARDTEST' ? 'ĐỊNH MỨC TEST BLOCK &amp; UPH' : 'ĐỊNH MỨC IE &amp; PERFORMANCE LINE'}
                </span>

                <!-- 📅 VÙNG CHỌN NGÀY NẰM BÊN CẠNH CHỮ "ĐỊNH MỨC IE & PERFORMANCE LINE" -->
                <div style="display: inline-flex; align-items: center; gap: 0.3rem; background: rgba(15, 23, 42, 0.75); padding: 0.15rem 0.55rem; border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.35); margin-left: 0.25rem;">
                  <span style="font-size: 0.775rem; font-weight: 800; color: #38bdf8; display: inline-flex; align-items: center; gap: 0.2rem;">
                    📅 Ngày:
                  </span>
                  <span style="font-size: 0.725rem; color: #cbd5e1; font-weight: 600;">Từ</span>
                  <input type="date" 
                    id="simFromDateInput"
                    class="font-mono select-filter" 
                    style="padding: 0.15rem 0.45rem; font-size: 0.75rem; color: #f8fafc; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; outline: none; cursor: pointer;" 
                    value="${simFromDate}" 
                    onchange="handleSimFromDateChange(this.value)">
                  <span style="font-size: 0.725rem; color: #cbd5e1; font-weight: 600;">Đến</span>
                  <input type="date" 
                    id="simToDateInput"
                    class="font-mono select-filter" 
                    style="padding: 0.15rem 0.45rem; font-size: 0.75rem; color: #f8fafc; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; outline: none; cursor: pointer;" 
                    value="${simToDate}" 
                    onchange="handleSimToDateChange(this.value)">
                </div>
              </div>
            </div>
          </div>

          <!-- Controls Bar: View Mode Switcher + Stage Selection Tabs (Tối ưu sát lên trên) -->
          <div class="capacity-stage-nav" style="margin-top: 0.35rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.35rem; display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.65rem;">
            <!-- View Mode Switcher (Đẩy về bên trái) -->
            <div class="btn-group" id="capacityViewModeGroup" style="display: inline-flex; align-items: center;">
              <button type="button" class="btn-mode ${viewMode === 'MATRIX' ? 'active' : ''}" onclick="handleCapacityModeChange('MATRIX')" title="Ma trận năng lực chi tiết">
                📊 ${currentStage === 'TOTAL_HARDTEST' ? 'Ma Trận Hardtest' : 'Ma Trận Line'}
              </button>
              <button type="button" class="btn-mode ${viewMode === 'SIMULATOR' ? 'active' : ''}" onclick="handleCapacityModeChange('SIMULATOR')" title="Lập kế hoạch sản xuất theo Line">
                📋 Lập Kế Hoạch Sản Xuất
              </button>
            </div>

            <!-- Stage Selection Buttons -->
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; border-left: 1px solid rgba(255,255,255,0.12); padding-left: 0.85rem;">
              <span style="font-size: 0.775rem; font-weight: 800; color: #a78bfa; margin-right: 0.25rem;">
                🏭 CÔNG ĐOẠN:
              </span>
              <button type="button" class="btn-capacity-stage ${currentStage === 'ASSEMBLY' ? 'active' : ''}" onclick="handleCapacityStageChange('ASSEMBLY')">
                ASSEMBLY
              </button>
              <button type="button" class="btn-capacity-stage ${currentStage === 'TOTAL_HARDTEST' ? 'active' : ''}" onclick="handleCapacityStageChange('TOTAL_HARDTEST')" title="Toàn bộ Năng Lực Cụm Hard Test, Optics ASM &amp; Focus (119 Mã)">
                TOTAL HARDTEST
              </button>
            </div>

            <!-- Live Synced Plan Status Pill (Visible in both MATRIX & SIMULATOR) -->
            <div id="capacitySyncStatusBar" style="margin-left: auto; display: inline-flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              ${(() => {
                const meta = window.AppStore._lastSyncedPlanMeta;
                if (meta && meta.id) {
                  return `
                    <span class="badge" style="background: rgba(16, 185, 129, 0.14); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 0.725rem; font-weight: 700; padding: 0.25rem 0.6rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                      <span>🟢 KH mới nhất:</span>
                      <strong style="color: #f8fafc;">${meta.planner || 'Thành viên'}</strong>
                      <span style="color: #a7f3d0;">(${meta.dateStr || ''} ${meta.timeStr || ''})</span>
                    </span>
                    ${viewMode !== 'SIMULATOR' ? `
                      <button type="button" class="btn btn-primary" onclick="handleCapacityModeChange('SIMULATOR')" style="padding: 0.22rem 0.6rem; font-size: 0.725rem; font-weight: 800; background: linear-gradient(135deg, #059669, #10b981); border-color: #10b981; border-radius: 6px; color: #fff;">
                        📋 Xem Kế Hoạch
                      </button>
                    ` : ''}
                  `;
                }
                return `
                  <button type="button" class="btn btn-secondary" onclick="handleForceSyncLatestPlan()" style="padding: 0.22rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #34d399; border-color: rgba(52, 211, 153, 0.4); border-radius: 6px; background: rgba(52, 211, 153, 0.08);" title="Kiểm tra và đồng bộ bản kế hoạch mới nhất">
                    🔄 Đồng Bộ KH Mới Nhất
                  </button>
                `;
              })()}
            </div>
          </div>
        </div>
    `;

    // 4. MAIN CONTENT ACCORDING TO STAGE AND VIEW MODE
    if (currentStage === 'TOTAL_HARDTEST') {
      if (viewMode === 'MATRIX') {
        html += `
          <!-- 2. KPI SUMMARY CARDS (TOTAL HARDTEST) -->
          <div class="capacity-kpi-grid">
            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #06b6d4, #22d3ee);">
              <div class="capacity-kpi-label">
                <span>📦 Quy Mô Total Hardtest</span>
              </div>
              <div class="capacity-kpi-val" style="color: #22d3ee;">
                ${htUniqueGroups} <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Nhóm</span> / ${htTotalBoards} <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Mã</span>
              </div>
              <div class="capacity-kpi-sub">
                Bóc tách từ Sheet <strong>Hardtest Data</strong> (Hard Test, Optics, Focus)
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #0284c7, #38bdf8);">
              <div class="capacity-kpi-label">
                <span>🧪 Thiết Bị Test Block (TB Q'ty)</span>
              </div>
              <div class="capacity-kpi-val" style="color: #38bdf8;">
                ${htTotalTbQty} <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Khối TB</span>
              </div>
              <div class="capacity-kpi-sub">
                Đã kế thừa chuẩn ô trộn cho các mã dùng chung
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #f59e0b, #fbbf24);">
              <div class="capacity-kpi-label">
                <span>⏱️ Cycle Time Tiêu Chuẩn (Norm)</span>
              </div>
              <div class="capacity-kpi-val" style="color: #fbbf24;">
                TB ${htAvgNorm}s <span style="font-size: 0.8rem; font-weight: 600; color: #94a3b8;">(${htMinNorm}s → ${htMaxNorm}s)</span>
              </div>
              <div class="capacity-kpi-sub">
                UPH tiêu chuẩn TB: <strong>${htAvgUphStd} pcs/h/khối</strong>
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #10b981, #34d399);">
              <div class="capacity-kpi-label">
                <span>🎯 Tỉ Lệ Pass FTT &amp; Downtime</span>
              </div>
              <div class="capacity-kpi-val" style="color: #34d399;">
                FTT ${htAvgFtt}% <span style="font-size: 0.8rem; font-weight: 600; color: #94a3b8;">• DT ${htAvgDt}%</span>
              </div>
              <div class="capacity-kpi-sub">
                Downtime Máy: <strong>1.5%</strong> • Downtime Vật tư: <strong>1.0%</strong>
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #8b5cf6, #c084fc);">
              <div class="capacity-kpi-label">
                <span>💡 Quy Chuẩn Tính Toán (IE &amp; MES)</span>
              </div>
              <div class="capacity-kpi-val" style="font-size: 1.05rem; color: #c084fc; font-weight: 800;">
                UPH = (3600 × TB) ÷ CT
              </div>
              <div class="capacity-kpi-sub">
                Ca Ngày (10.83h) • Ca Đêm (10.58h) • Cả Ngày (21.41h)
              </div>
            </div>
          </div>

          <!-- 3. FILTER & TOOLBAR (TOTAL HARDTEST) -->
          <div class="card" style="margin-bottom: 1.25rem; padding: 0.85rem 1.15rem; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-glass);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; flex: 1;">
                <!-- Sub-Stage Select (Công đoạn) -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #22d3ee;">🔬 Công Đoạn:</span>
                  <select id="capacityHardtestSubStageSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 170px;" onchange="handleHardtestSubStageChange(this.value)">
                    ${(htData.subStages || []).map(st => `<option value="${st.id}" ${currentHtSubStage === st.id ? 'selected' : ''}>${st.name} (${st.count})</option>`).join('')}
                  </select>
                </div>

                <!-- Group Model Select -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #60a5fa;">🏷️ Group Model:</span>
                  <select id="capacityHardtestGroupSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 175px;" onchange="handleHardtestGroupChange(this.value)">
                    <option value="ALL" ${currentHtGroup === 'ALL' ? 'selected' : ''}>Tất cả Group Model (${(htData.groups || []).length})</option>
                    ${(htData.groups || []).map(g => `<option value="${g.group}" ${currentHtGroup === g.group ? 'selected' : ''}>${g.group} (${g.boardsCount} bo - ${g.tbQty} TB)</option>`).join('')}
                  </select>
                </div>

                <!-- Metric Mode Select (Thực tế vs Tiêu chuẩn vs Cả hai) -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #a78bfa;">📊 Hiển Thị:</span>
                  <select id="capacityHardtestMetricModeSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 195px;" onchange="handleHardtestMetricModeChange(this.value)">
                    <option value="ACTUAL" ${currentHtMetricMode === 'ACTUAL' ? 'selected' : ''}>⚡ Năng Lực Thực Tế (sau FTT &amp; DT)</option>
                    <option value="STANDARD" ${currentHtMetricMode === 'STANDARD' ? 'selected' : ''}>⏱️ Năng Lực Tiêu Chuẩn (Norm)</option>
                    <option value="BOTH" ${currentHtMetricMode === 'BOTH' ? 'selected' : ''}>📊 Song Song (Tiêu Chuẩn / Thực Tế)</option>
                  </select>
                </div>

                <!-- Quick Search Input -->
                <div class="search-box" style="min-width: 200px; flex: 1;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input id="capacitySearchInput" type="text" class="search-input" placeholder="Tìm theo Model, Bo mạch, Ghi chú..." value="${searchVal}" oninput="handleCapacitySearch(this.value)">
                </div>

                <!-- Reset Button -->
                <button type="button" class="btn btn-secondary" onclick="handleResetHardtestFilters()" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;" title="Đặt lại bộ lọc về mặc định">
                  <span>↺ Đặt lại</span>
                </button>
              </div>

              <!-- Export Buttons for Hardtest Table -->
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button type="button" class="sim-btn-export-sheet" onclick="handleExportHardtestCapacityCSV()" title="Xuất toàn bộ bảng Hardtest ra file CSV">
                  <span>📥 Xuất Sheet CSV</span>
                </button>
                <button type="button" class="sim-btn-copy-sheet" onclick="handleCopyHardtestCapacityClipboard()" title="Sao chép bảng Hardtest vào Clipboard để dán vào Google Sheets">
                  <span>📋 Sao Chép Google Sheets</span>
                </button>
              </div>
            </div>
          </div>
        `;
        html += renderMasterHardtestCapacityMatrix(htItems, shiftHours, currentHtMetricMode);
      } else if (viewMode === 'SIMULATOR') {
        html += renderHardtestCapacitySimulator(htData, htItems, shiftHours);
      }
    } else {
      // ASSEMBLY STAGE (GIỮ NGUYÊN 100% CẤU TRÚC VÀ LOGIC HIỆN TẠI)
      if (viewMode === 'MATRIX') {
        html += `
          <!-- 2. KPI SUMMARY CARDS (MATRIX MODE) -->
          <div class="capacity-kpi-grid">
            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #3b82f6, #60a5fa);">
              <div class="capacity-kpi-label">
                <span>📦 Quy Mô Danh Mục</span>
              </div>
              <div class="capacity-kpi-val">
                ${uniqueGroups} <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Nhóm</span> / ${totalBoards} <span style="font-size: 0.85rem; font-weight: 600; color: #94a3b8;">Bo Mạch</span>
              </div>
              <div class="capacity-kpi-sub">
                Toàn bộ dữ liệu bóc tách từ Sheet <strong>Assembly Data</strong>
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #10b981, #34d399);">
              <div class="capacity-kpi-label">
                <span>⏱️ Cycle Time Tiêu Chuẩn (Norm)</span>
              </div>
              <div class="capacity-kpi-val" style="color: #34d399;">
                TB ${avgNorm}s <span style="font-size: 0.8rem; font-weight: 600; color: #94a3b8;">(${minNorm}s → ${maxNorm}s)</span>
              </div>
              <div class="capacity-kpi-sub">
                UPH tiêu chuẩn trung bình: <strong>${avgNorm > 0 ? Math.round(3600 / avgNorm) : 0} pcs/h/line</strong>
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #8b5cf6, #a855f7);">
              <div class="capacity-kpi-label">
                <span>🏭 Khả Năng Đáp Ứng Của Line</span>
              </div>
              <div class="capacity-kpi-val" style="color: #c084fc;">
                10/12 Line <span style="font-size: 0.8rem; font-weight: 600; color: #94a3b8;">Hoạt động</span>
              </div>
              <div class="capacity-kpi-sub">
                Top hiệu suất: <strong>Line 1D (96.5%)</strong>, <strong>Line 2C (92.9%)</strong>, <strong>Line 1C (90.4%)</strong>
              </div>
            </div>

            <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #f59e0b, #fbbf24);">
              <div class="capacity-kpi-label">
                <span>💡 Quy Chuẩn Tính Toán (IE)</span>
              </div>
              <div class="capacity-kpi-val" style="font-size: 1.05rem; color: #fbbf24; font-weight: 800;">
                CT Thựctế = Norm ÷ Perf
              </div>
              <div class="capacity-kpi-sub">
                Plan STD / Ngày = 77.076s (21.41h) ÷ Norm (Ngày: 10.83h | Đêm: 10.58h)
              </div>
            </div>
          </div>

          <!-- 3. FILTER & TOOLBAR (MATRIX MODE) -->
          <div class="card" style="margin-bottom: 1.25rem; padding: 0.85rem 1.15rem; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-glass);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; flex: 1;">
                <!-- Group Model Select -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #60a5fa;">🏷️ Group Model:</span>
                  <select id="capacityGroupSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 175px;" onchange="handleCapacityGroupChange(this.value)">
                    <option value="ALL" ${currentGroup === 'ALL' ? 'selected' : ''}>Tất cả Group Model (${allGroups.length})</option>
                    ${allGroups.map(g => `<option value="${g.group}" ${currentGroup === g.group ? 'selected' : ''}>${g.group} (${g.boardsCount} bo)</option>`).join('')}
                  </select>
                </div>

                <!-- Line Select -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #a78bfa;">🏭 Line:</span>
                  <select id="capacityLineSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 145px;" onchange="handleCapacityLineChange(this.value)">
                    <option value="ALL" ${currentLine === 'ALL' ? 'selected' : ''}>Tất cả Line (${allLines.filter(l => l.supportedBoardsCount > 0).length})</option>
                    ${allLines.filter(l => l.supportedBoardsCount > 0).map(l => `<option value="${l.id}" ${currentLine === l.id ? 'selected' : ''}>${l.name} (${l.supportedBoardsCount} bo - TB ${l.avgPerfPct}%)</option>`).join('')}
                  </select>
                </div>

                <!-- Working Time Select -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #fbbf24;">⏱️ Thời Gian:</span>
                  <select id="capacityShiftHoursSelect" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 170px;" onchange="handleCapacityShiftHoursChange(this.value)">
                    <option value="21.41" ${shiftHours === 21.41 ? 'selected' : ''}>Cả Ngày (21.41h: Ngày 10.83 + Đêm 10.58)</option>
                    <option value="10.83" ${shiftHours === 10.83 ? 'selected' : ''}>Ca Ngày (10.83 Giờ)</option>
                    <option value="10.58" ${shiftHours === 10.58 ? 'selected' : ''}>Ca Đêm (10.58 Giờ)</option>
                    <option value="12.0" ${shiftHours === 12.0 ? 'selected' : ''}>Ca 12 Giờ</option>
                  </select>
                </div>

                <!-- Quick Search Input -->
                <div class="search-box" style="min-width: 200px; flex: 1;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input id="capacitySearchInput" type="text" class="search-input" placeholder="Tìm theo Product Name 1C, Model hoặc Bo mạch..." value="${searchVal}" oninput="handleCapacitySearch(this.value)">
                </div>

                <!-- Reset Button -->
                <button type="button" class="btn btn-secondary" onclick="handleResetCapacityFilters()" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem;" title="Đặt lại bộ lọc về mặc định">
                  <span>↺ Đặt lại</span>
                </button>
              </div>
            </div>
          </div>
        `;
        html += renderMasterCapacityMatrix(asmItems, allLines, shiftHours);
      } else if (viewMode === 'SIMULATOR') {
        html += renderCapacitySimulator(allGroups, asmItems, shiftHours, allLines);
      }
    }

    html += `</div>`;
    container.innerHTML = html;
    updateSimulatorStickyOffsets();
  };

  /**
   * Dynamically adjust simulator table sticky top offsets to ensure pixel-perfect freezing
   */
  function updateSimulatorStickyOffsets() {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const tbl = document.querySelector('.sim-table');
        if (!tbl) return;
        const r1 = tbl.querySelector('.sim-header-titles');
        const r2 = tbl.querySelector('.sim-sticky-totals-row');
        if (r1) {
          const h1 = r1.getBoundingClientRect().height || r1.offsetHeight;
          if (h1 > 0) tbl.style.setProperty('--sim-header-h', Math.round(h1) + 'px');
        }
        if (r2) {
          const h2 = r2.getBoundingClientRect().height || r2.offsetHeight;
          if (h2 > 0) tbl.style.setProperty('--sim-totals-h', Math.round(h2) + 'px');
        }
      });
    }
  }

  if (typeof window !== 'undefined' && !window._simResizeListenerAdded) {
    window.addEventListener('resize', updateSimulatorStickyOffsets);
    window._simResizeListenerAdded = true;
  }

  /**
   * RENDER MASTER CAPACITY MATRIX TABLE (FACTORY LINES: 1A, 2A...)
   */
  function renderMasterCapacityMatrix(items, allLines, shiftHours) {
    if (!items || items.length === 0) {
      return `
        <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-size: 1rem; font-weight: 700; color: #f8fafc;">Không tìm thấy bo mạch nào phù hợp với bộ lọc</div>
          <p style="font-size: 0.8rem; margin-top: 0.35rem;">Vui lòng thử chọn lại Group Model hoặc xóa từ khóa tìm kiếm.</p>
        </div>
      `;
    }

    let rowsHtml = items.map((it, idx) => {
      const uphStdText = it.uphStandard.toLocaleString('vi-VN');
      const planDayStd = it.dayCapacityStandard || it.shiftCapacityStandard || 0;
      const dayShiftStd = it.dayShiftCapacityStandard || Math.round(planDayStd * (10.83 / 21.41));
      const nightShiftStd = it.nightShiftCapacityStandard || Math.round(planDayStd * (10.58 / 21.41));

      let lineCellsHtml = allLines.map(line => {
        const lineInfo = it.lines && it.lines[line.id];
        if (!lineInfo) {
          return `<td class="perf-cell-empty">--</td>`;
        }

        const pct = lineInfo.perfPct;
        const pillClass = pct >= 100 ? 'perf-pill-100' :
                          pct >= 85 ? 'perf-pill-85' :
                          pct >= 65 ? 'perf-pill-70' : 'perf-pill-45';

        const dayCap = lineInfo.actualDayCapacity || lineInfo.actualShiftCapacity || 0;
        const dayShiftCap = lineInfo.actualDayShiftCapacity || Math.round(dayCap * (10.83 / 21.41));
        const nightShiftCap = lineInfo.actualNightShiftCapacity || Math.round(dayCap * (10.58 / 21.41));

        const tooltipText = `Line ${line.id} • Hiệu suất: ${pct}%\n⏱️ Cycle time thực tế: ${lineInfo.actualCycleTime}s (Norm: ${it.norm}s)\n📦 Plan Thực Tế / Ngày (21.41h): ${dayCap.toLocaleString('vi-VN')} pcs\n  ☀️ Ca Ngày (10.83h): ${dayShiftCap.toLocaleString('vi-VN')} pcs\n  🌙 Ca Đêm (10.58h): ${nightShiftCap.toLocaleString('vi-VN')} pcs`;

        return `
          <td title="${tooltipText.replace(/"/g, '&quot;')}">
            <div class="perf-cell-content">
              <span class="perf-pill ${pillClass}">${pct}%</span>
              <div class="perf-stat-stack">
                <span class="perf-stat-ct font-mono" title="Cycle time thực tế">⏱️ ${lineInfo.actualCycleTime}s</span>
                <span class="perf-stat-cap font-mono" title="Plan thực tế / Ngày (21.41h)">📦 ${dayCap.toLocaleString('vi-VN')}<span class="perf-stat-cap-unit">/ng</span></span>
              </div>
            </div>
          </td>
        `;
      }).join('');

      return `
        <tr class="hover-row">
          <td class="sticky-cap-stt" style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
          <td class="sticky-cap-group">
            <span style="font-weight: 800; color: #f8fafc; font-size: 0.825rem;">${it.group}</span>
          </td>
          <td class="sticky-cap-product1c" title="${it.productName1C || ''}">
            <span class="product-1c-badge">${it.productName1C || '--'}</span>
          </td>
          <td class="sticky-cap-board">
            <span class="font-mono" style="font-size: 0.775rem; color: #cbd5e1;" title="${it.board}">${it.board}</span>
          </td>
          <td class="sticky-cap-norm">
            <span class="badge badge-amber font-mono" style="font-weight: 800; font-size: 0.8rem;">
              ${it.norm}s
            </span>
          </td>
          <td style="text-align: right; font-weight: 700; color: #60a5fa;" class="font-mono">
            ${uphStdText}
          </td>
          <td style="text-align: right; font-weight: 800; color: #34d399;" class="font-mono" title="Plan Tiêu Chuẩn / Ngày (21.41h): ${planDayStd.toLocaleString('vi-VN')} pcs\n  ☀️ Ca Ngày (10.83h): ${dayShiftStd.toLocaleString('vi-VN')} pcs\n  🌙 Ca Đêm (10.58h): ${nightShiftStd.toLocaleString('vi-VN')} pcs">
            ${planDayStd.toLocaleString('vi-VN')}
          </td>
          ${lineCellsHtml}
        </tr>
      `;
    }).join('');

    return `
      <div class="capacity-table-wrap">
        <div style="padding: 0.65rem 1rem; background: rgba(11, 19, 41, 0.9); border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 800; color: #38bdf8; font-size: 0.875rem;">📋 MA TRẬN ĐỊNH MỨC CYCLE TIME &amp; TẢI LINE (ASSEMBLY)</span>
            <span class="badge badge-blue" style="font-size: 0.72rem;">Đang hiển thị: ${items.length} Bo Mạch</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
            <span>Chú thích ô Line: <span class="perf-pill perf-pill-100" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">Hiệu suất %</span> ➜ <span class="perf-stat-ct" style="font-size: 0.7rem;">⏱️ CT Thực tế</span> ➜ <span class="perf-stat-cap" style="font-size: 0.7rem;">📦 Plan / Ngày</span></span>
          </div>
        </div>

        <div style="overflow-x: auto; max-height: calc(100vh - 350px);">
          <table class="capacity-matrix-table">
            <thead>
              <tr>
                <th class="sticky-cap-stt">STT</th>
                <th class="sticky-cap-group" style="text-align: left;">GROUP MODEL</th>
                <th class="sticky-cap-product1c" style="text-align: left;">PRODUCT NAME 1C</th>
                <th class="sticky-cap-board" style="text-align: left;">MÃ BO MẠCH (BOARD)</th>
                <th class="sticky-cap-norm" title="Cycle time tiêu chuẩn từ sheet Assembly Data">NORM (s)</th>
                <th style="min-width: 80px; color: #60a5fa;" title="Units Per Hour Tiêu Chuẩn (3600 / Norm)">UPH STD</th>
                <th style="min-width: 120px; color: #34d399;" title="Plan Tiêu Chuẩn / Ngày khi đạt 100% hiệu suất (Ca Ngày 10.83h + Ca Đêm 10.58h = 21.41h = 77.076s)">
                  <div>PLAN STD / NGÀY</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #94a3b8;">(21.41h / Ngày)</div>
                </th>
                ${allLines.map(l => `
                  <th style="min-width: 84px;" title="Line ${l.name}: Hỗ trợ ${l.supportedBoardsCount} bo mạch • Hiệu suất TB ${l.avgPerfPct}%">
                    <div style="font-size: 0.85rem; font-weight: 800; color: #38bdf8;">${l.name}</div>
                    <div style="font-size: 0.68rem; font-weight: normal; color: #94a3b8;">${l.avgPerfPct > 0 ? l.avgPerfPct + '%' : '--'}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * RENDER MASTER CAPACITY MATRIX TABLE FOR TOTAL HARDTEST (Hard Test / Optics ASM / Focus)
   */
  function renderMasterHardtestCapacityMatrix(items, shiftHours, metricMode) {
    if (!items || items.length === 0) {
      return `
        <div class="card" style="padding: 3rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-size: 1rem; font-weight: 700; color: #f8fafc;">Không tìm thấy mã bo mạch / công đoạn nào phù hợp với bộ lọc</div>
          <p style="font-size: 0.8rem; margin-top: 0.35rem;">Vui lòng thử chọn lại Công đoạn, Group Model hoặc xóa từ khóa tìm kiếm.</p>
        </div>
      `;
    }

    // Calculations for totals
    let totalTbQty = 0;
    let totalDayShiftStd = 0;
    let totalDayShiftAct = 0;
    let totalNightShiftStd = 0;
    let totalNightShiftAct = 0;
    let totalFullDayStd = 0;
    let totalFullDayAct = 0;

    let rowsHtml = items.map((it, idx) => {
      const tbQty = it.tbQty || 0;
      totalTbQty += tbQty;

      const ctNormText = it.ctNorm > 0 ? `${it.ctNorm}s` : '--';
      const ctActualText = it.ctActual > 0 ? `${it.ctActual}s` : '--';
      const fttText = it.fttPct > 0 ? `${it.fttPct.toFixed(1)}%` : '--';
      const dtText = it.dtTotalPct > 0 ? `${it.dtTotalPct.toFixed(1)}%` : '2.5%';

      const uphStd = it.uphStandard || 0;
      const uphAct = it.uphActual || 0;
      const dayShiftStd = it.dayShiftCapacityStandard || 0;
      const dayShiftAct = it.dayShiftCapacityActual || 0;
      const nightShiftStd = it.nightShiftCapacityStandard || 0;
      const nightShiftAct = it.nightShiftCapacityActual || 0;
      const fullDayStd = it.totalDayCapacityStandard || (dayShiftStd + nightShiftStd);
      const fullDayAct = it.totalDayCapacityActual || (dayShiftAct + nightShiftAct);

      totalDayShiftStd += dayShiftStd;
      totalDayShiftAct += dayShiftAct;
      totalNightShiftStd += nightShiftStd;
      totalNightShiftAct += nightShiftAct;
      totalFullDayStd += fullDayStd;
      totalFullDayAct += fullDayAct;

      // Stage Badge
      let stageBadgeClass = 'badge-stage-hardtest';
      if (it.stage === 'OPTICS ASM') stageBadgeClass = 'badge-stage-optics';
      else if (it.stage === 'FOCUS') stageBadgeClass = 'badge-stage-focus';

      // Shared Note Badge
      const isShared = it.isShared || (it.note && it.note.toLowerCase().includes('dùng chung'));
      const noteBadgeHtml = isShared
        ? `<span class="badge badge-ht-shared" title="Dùng chung thiết bị Test Block cho nhóm bo mạch">🔗 Dùng Chung</span>`
        : `<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>`;

      // FTT Badge Style
      let fttBadgeClass = 'badge-blue';
      if (it.fttPct >= 95) fttBadgeClass = 'badge-green';
      else if (it.fttPct < 90) fttBadgeClass = 'badge-amber';

      // UPH Cell HTML based on metricMode
      let uphCellHtml = '';
      if (metricMode === 'STANDARD') {
        uphCellHtml = `<td style="text-align: right; font-weight: 800; color: #60a5fa;" class="font-mono" title="UPH Tiêu Chuẩn = (3600 × ${tbQty} TB) ÷ ${it.ctNorm}s">${uphStd.toLocaleString('vi-VN')}</td>`;
      } else if (metricMode === 'BOTH') {
        uphCellHtml = `<td style="text-align: right;" class="font-mono" title="Tiêu chuẩn: ${uphStd} | Thực tế: ${uphAct}"><span style="color: #60a5fa; font-weight: 700;">${uphStd.toLocaleString('vi-VN')}</span> <span style="color: #64748b;">/</span> <span style="color: #22d3ee; font-weight: 800;">${uphAct.toLocaleString('vi-VN')}</span></td>`;
      } else {
        uphCellHtml = `<td style="text-align: right; font-weight: 800; color: #22d3ee;" class="font-mono" title="UPH Thực Tế = (3600 × ${tbQty} TB) ÷ ${it.ctActual}s">${uphAct.toLocaleString('vi-VN')}</td>`;
      }

      // Day Shift Cell HTML (10.83h)
      let dayShiftCellHtml = '';
      if (it.ctNorm > 0) {
        if (metricMode === 'STANDARD') {
          dayShiftCellHtml = `<td style="text-align: right; font-weight: 800; color: #fbbf24;" class="font-mono" title="Ca Ngày Tiêu Chuẩn (10.83h = 38,988s) = (38,988 × ${tbQty}) ÷ ${it.ctNorm}s">${dayShiftStd.toLocaleString('vi-VN')}</td>`;
        } else if (metricMode === 'BOTH') {
          dayShiftCellHtml = `<td style="text-align: right;" class="font-mono" title="Ca Ngày: Tiêu chuẩn ${dayShiftStd} | Thực tế ${dayShiftAct}"><span style="color: #94a3b8;">${dayShiftStd.toLocaleString('vi-VN')}</span> <span style="color: #64748b;">/</span> <span style="color: #fbbf24; font-weight: 800;">${dayShiftAct.toLocaleString('vi-VN')}</span></td>`;
        } else {
          dayShiftCellHtml = `<td style="text-align: right; font-weight: 800; color: #fbbf24;" class="font-mono" title="Ca Ngày Thực Tế (10.83h = 38,988s) = (38,988 × ${tbQty}) ÷ ${it.ctActual}s">${dayShiftAct.toLocaleString('vi-VN')}</td>`;
        }
      } else {
        dayShiftCellHtml = `<td style="text-align: right; color: var(--text-muted); font-size: 0.75rem;">--</td>`;
      }

      // Night Shift Cell HTML (10.58h)
      let nightShiftCellHtml = '';
      if (it.ctNorm > 0) {
        if (metricMode === 'STANDARD') {
          nightShiftCellHtml = `<td style="text-align: right; font-weight: 800; color: #818cf8;" class="font-mono" title="Ca Đêm Tiêu Chuẩn (10.58h = 38,088s) = (38,088 × ${tbQty}) ÷ ${it.ctNorm}s">${nightShiftStd.toLocaleString('vi-VN')}</td>`;
        } else if (metricMode === 'BOTH') {
          nightShiftCellHtml = `<td style="text-align: right;" class="font-mono" title="Ca Đêm: Tiêu chuẩn ${nightShiftStd} | Thực tế ${nightShiftAct}"><span style="color: #94a3b8;">${nightShiftStd.toLocaleString('vi-VN')}</span> <span style="color: #64748b;">/</span> <span style="color: #818cf8; font-weight: 800;">${nightShiftAct.toLocaleString('vi-VN')}</span></td>`;
        } else {
          nightShiftCellHtml = `<td style="text-align: right; font-weight: 800; color: #818cf8;" class="font-mono" title="Ca Đêm Thực Tế (10.58h = 38,088s) = (38,088 × ${tbQty}) ÷ ${it.ctActual}s">${nightShiftAct.toLocaleString('vi-VN')}</td>`;
        }
      } else {
        nightShiftCellHtml = `<td style="text-align: right; color: var(--text-muted); font-size: 0.75rem;">--</td>`;
      }

      // Full Day Cell HTML (21.41h)
      let fullDayCellHtml = '';
      if (it.ctNorm > 0) {
        if (metricMode === 'STANDARD') {
          fullDayCellHtml = `<td style="text-align: right; font-weight: 900; color: #34d399;" class="font-mono" title="Cả Ngày Tiêu Chuẩn (21.41h = 77,076s) = Ca Ngày (${dayShiftStd}) + Ca Đêm (${nightShiftStd})">${fullDayStd.toLocaleString('vi-VN')}</td>`;
        } else if (metricMode === 'BOTH') {
          fullDayCellHtml = `<td style="text-align: right;" class="font-mono" title="Cả Ngày: Tiêu chuẩn ${fullDayStd} | Thực tế ${fullDayAct}"><span style="color: #94a3b8;">${fullDayStd.toLocaleString('vi-VN')}</span> <span style="color: #64748b;">/</span> <span style="color: #34d399; font-weight: 900;">${fullDayAct.toLocaleString('vi-VN')}</span></td>`;
        } else {
          fullDayCellHtml = `<td style="text-align: right; font-weight: 900; color: #34d399;" class="font-mono" title="Cả Ngày Thực Tế (21.41h = 77,076s) = Ca Ngày (${dayShiftAct}) + Ca Đêm (${nightShiftAct})">${fullDayAct.toLocaleString('vi-VN')}</td>`;
        }
      } else {
        fullDayCellHtml = `<td style="text-align: right; color: var(--text-muted); font-size: 0.75rem;">--</td>`;
      }

      return `
        <tr class="hover-row">
          <td class="sticky-cap-stt" style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
          <td style="text-align: center; white-space: nowrap;">
            <span class="badge ${stageBadgeClass}">${it.stage}</span>
          </td>
          <td class="sticky-ht-group">
            <span style="font-weight: 800; color: #f8fafc; font-size: 0.825rem;">${it.group}</span>
          </td>
          <td class="sticky-ht-board">
            <span class="font-mono" style="font-size: 0.775rem; color: #cbd5e1;" title="${it.board}">${it.board}</span>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            ${noteBadgeHtml}
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <span class="badge badge-ht-tb font-mono" title="Số lượng khối thiết bị Test Block tương ứng: ${tbQty} TB">${tbQty} TB</span>
          </td>
          <td class="sticky-cap-norm" style="text-align: right;">
            ${it.ctNorm > 0 ? `<span class="badge badge-amber font-mono" style="font-weight: 800; font-size: 0.8rem;" title="Cycle Time on NOR 1 Test Block: ${it.ctNorm}s">${ctNormText}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>`}
          </td>
          <td style="text-align: center;">
            ${it.fttPct > 0 ? `<span class="badge ${fttBadgeClass} font-mono" style="font-weight: 800;" title="First Time Through (% Pass): ${it.fttPct.toFixed(2)}%">${fttText}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>`}
          </td>
          <td style="text-align: center;">
            <span class="font-mono" style="font-size: 0.775rem; color: #f87171;" title="Downtime tổng hợp: Máy 1.5% + Vật tư 1.0% = ${dtText}">${dtText}</span>
          </td>
          <td style="text-align: right;" class="font-mono">
            ${it.ctActual > 0 ? `<span style="font-weight: 800; color: #38bdf8; font-size: 0.8rem;" title="Cycle Time Thực Tế = CT_nor × (1 + (1 - FTT) + DT) = ${it.ctActual}s">${ctActualText}</span>` : `<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>`}
          </td>
          ${uphCellHtml}
          ${dayShiftCellHtml}
          ${nightShiftCellHtml}
          ${fullDayCellHtml}
        </tr>
      `;
    }).join('');

    // Summary totals for footer
    const displayDayShiftTotal = metricMode === 'STANDARD' ? totalDayShiftStd.toLocaleString('vi-VN') : (metricMode === 'BOTH' ? `${totalDayShiftStd.toLocaleString('vi-VN')} / ${totalDayShiftAct.toLocaleString('vi-VN')}` : totalDayShiftAct.toLocaleString('vi-VN'));
    const displayNightShiftTotal = metricMode === 'STANDARD' ? totalNightShiftStd.toLocaleString('vi-VN') : (metricMode === 'BOTH' ? `${totalNightShiftStd.toLocaleString('vi-VN')} / ${totalNightShiftAct.toLocaleString('vi-VN')}` : totalNightShiftAct.toLocaleString('vi-VN'));
    const displayFullDayTotal = metricMode === 'STANDARD' ? totalFullDayStd.toLocaleString('vi-VN') : (metricMode === 'BOTH' ? `${totalFullDayStd.toLocaleString('vi-VN')} / ${totalFullDayAct.toLocaleString('vi-VN')}` : totalFullDayAct.toLocaleString('vi-VN'));

    return `
      <div class="capacity-table-wrap">
        <div style="padding: 0.65rem 1rem; background: rgba(11, 19, 41, 0.9); border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 800; color: #22d3ee; font-size: 0.875rem;">🔬 BẢNG ĐỊNH MỨC NĂNG LỰC TOTAL HARDTEST (TEST BLOCK &amp; UPH)</span>
            <span class="badge badge-blue" style="font-size: 0.72rem;">Đang hiển thị: ${items.length} Mã</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
            <span>CT Thực Tế = CT_NOR × (1 + (1 - FTT) + DT) ➜ <span style="color: #22d3ee; font-weight: 700;">UPH = (3600 × TB) ÷ CT</span></span>
          </div>
        </div>

        <div style="overflow-x: auto; max-height: calc(100vh - 350px);">
          <table class="capacity-matrix-table">
            <thead>
              <tr>
                <th class="sticky-cap-stt">STT</th>
                <th style="min-width: 100px; text-align: center;">CÔNG ĐOẠN</th>
                <th class="sticky-ht-group" style="text-align: left;">NORMING GROUP</th>
                <th class="sticky-ht-board" style="text-align: left;">BOARD OR OPERATION</th>
                <th style="min-width: 95px; text-align: center;">GHI CHÚ</th>
                <th style="min-width: 95px; text-align: center; color: #38bdf8;" title="Số lượng thiết bị Test Block tương ứng với mã (đã chuẩn hóa các mã dùng chung)">SỐ LƯỢNG TB</th>
                <th class="sticky-cap-norm" style="min-width: 90px; text-align: right;" title="Thời gian tiêu chuẩn 1 Test Block (Cycle Time on NOR 1 Test Block)">CT NOR (s)</th>
                <th style="min-width: 85px; text-align: center; color: #34d399;" title="Tỉ lệ pass kiểm tra lần đầu (First Time Through)">FTT (% PASS)</th>
                <th style="min-width: 80px; text-align: center; color: #f87171;" title="Downtime: Máy 1.5% + Vật tư 1.0% = 2.5%">DOWNTIME</th>
                <th style="min-width: 95px; text-align: right; color: #38bdf8;" title="Cycle Time Thực Tế sau bù hao phí FTT &amp; Downtime">CT THỰC TẾ</th>
                <th style="min-width: 105px; text-align: right; color: #22d3ee;" title="Units Per Hour = (3600 × TB Q'ty) ÷ CT">
                  <div>UPH (PCS/H)</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #94a3b8;">${metricMode === 'STANDARD' ? '(Tiêu chuẩn)' : (metricMode === 'BOTH' ? '(STD / Thực tế)' : '(Thực tế)')}</div>
                </th>
                <th style="min-width: 125px; text-align: right; color: #fbbf24;" title="Năng lực Ca Ngày (10.83 giờ = 38,988s) = (38,988 × TB Q'ty) ÷ CT">
                  <div>CAPA CA NGÀY</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #94a3b8;">(10.83 Giờ / Ca)</div>
                </th>
                <th style="min-width: 125px; text-align: right; color: #818cf8;" title="Năng lực Ca Đêm (10.58 giờ = 38,088s) = (38,088 × TB Q'ty) ÷ CT">
                  <div>CAPA CA ĐÊM</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #94a3b8;">(10.58 Giờ / Ca)</div>
                </th>
                <th style="min-width: 135px; text-align: right; color: #34d399;" title="Tổng năng lực Cả Ngày (Ca Ngày 10.83h + Ca Đêm 10.58h = 21.41h = 77,076s)">
                  <div>CAPA CẢ NGÀY</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #94a3b8;">(21.41 Giờ / Ngày)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: rgba(15, 23, 42, 0.95); font-weight: 800; border-top: 2px solid var(--border-glass);">
                <td colspan="5" style="text-align: right; padding: 0.75rem 1rem; color: #f8fafc; font-size: 0.85rem;">
                  TỔNG CỘNG (${items.length} MÃ):
                </td>
                <td style="text-align: center; color: #38bdf8; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${totalTbQty} TB
                </td>
                <td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">--</td>
                <td style="text-align: right; color: #22d3ee; font-family: var(--font-mono); font-size: 0.8rem;">--</td>
                <td style="text-align: right; color: #fbbf24; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${displayDayShiftTotal}
                </td>
                <td style="text-align: right; color: #818cf8; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${displayNightShiftTotal}
                </td>
                <td style="text-align: right; color: #34d399; font-family: var(--font-mono); font-size: 0.9rem; font-weight: 900;">
                  ${displayFullDayTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * KIỂM TRA MODEL THUỘC DÒNG DOORPROTECT (DoorProtect, DoorProtect U, Plus, Plus U)
   * Line Support chỉ chuyên trách & chạy ưu tiên cho các dòng Model này.
   */
  function isDoorProtectModel(it) {
    if (!it) return false;
    let text = '';
    if (typeof it === 'string') {
      text = it;
    } else {
      text = `${it.model || ''} ${it.group || ''} ${it.productName1C || ''} ${it.board || ''}`;
    }
    return text.toLowerCase().includes('doorprotect');
  }
  window.isDoorProtectModel = isDoorProtectModel;

  /**
   * RESOLVE CAPACITY AND CAPABLE LINES FOR A SCHEDULE ITEM
   */
  function resolveModelLineCapacity(it, capData) {
    const capItems = (capData && capData.items) ? capData.items : [];
    const p1c = (it.productName1C || '').trim().toLowerCase();
    const model = (it.model || '').trim();

    // 1. Exact match by productName1C
    let match = null;
    if (p1c) {
      match = capItems.find(c => c.productName1C && c.productName1C.trim().toLowerCase() === p1c);
    }

    // 2. Normalized group model match
    if (!match && model) {
      const cleanModel = model.replace(/\(.*?\)/g, '').replace(/white|black/gi, '').trim().toLowerCase();
      match = capItems.find(c => {
        const grp = (c.group || '').toLowerCase();
        return grp === cleanModel || grp.includes(cleanModel) || cleanModel.includes(grp);
      });
    }

    // Standard Norm
    const norm = match && match.norm > 0 ? match.norm : (typeof it.norm === 'number' && it.norm > 0 ? it.norm : 15);
    const asFormLine = (match && match.asFormLine) ? match.asFormLine.trim() : '';

    // Collect capable lines
    let capableLines = [];
    if (match && match.lines && Object.keys(match.lines).length > 0) {
      capableLines = Object.entries(match.lines).map(([lid, linfo]) => ({
        lineId: lid,
        lineName: 'Line ' + lid,
        perfPct: linfo.perfPct || 100,
        actualCt: linfo.actualCycleTime || parseFloat((norm / ((linfo.perfPct || 100) / 100)).toFixed(2)),
        isAsForm: asFormLine === lid
      }));
    } else if (window.PRODUCTIVITY_MATRIX) {
      const cleanGrp = model.replace(/\(.*?\)/g, '').replace(/white|black/gi, '').trim();
      let lineMap = window.PRODUCTIVITY_MATRIX[cleanGrp];
      if (!lineMap) {
        const foundKey = Object.keys(window.PRODUCTIVITY_MATRIX).find(k => k.toLowerCase() === cleanGrp.toLowerCase() || cleanGrp.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanGrp.toLowerCase()));
        if (foundKey) lineMap = window.PRODUCTIVITY_MATRIX[foundKey];
      }
      if (lineMap) {
        capableLines = Object.entries(lineMap).map(([lid, perf]) => ({
          lineId: lid,
          lineName: 'Line ' + lid,
          perfPct: perf,
          actualCt: parseFloat((norm / (perf / 100)).toFixed(2)),
          isAsForm: asFormLine === lid
        }));
      }
    }

    // Fallback if no specific lines mapped
    if (capableLines.length === 0) {
      const defaultLines = ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D'];
      capableLines = defaultLines.map(lid => ({
        lineId: lid,
        lineName: 'Line ' + lid,
        perfPct: 100,
        actualCt: norm,
        isAsForm: asFormLine === lid
      }));
    }

    // Line Support chỉ có thể chạy ưu tiên DoorProtect và DoorProtect U / DoorProtect Plus / DoorProtect Plus U
    const isDoorProtect = isDoorProtectModel(it);
    if (!isDoorProtect) {
      capableLines = capableLines.filter(cl => !cl.lineId.startsWith('Support') && cl.lineId !== 'Support');
    }

    // Sort capable lines: highest perf first, then isAsForm first, then lineId
    capableLines.sort((a, b) => {
      if (b.perfPct !== a.perfPct) return b.perfPct - a.perfPct;
      if (b.isAsForm !== a.isAsForm) return (b.isAsForm ? 1 : 0) - (a.isAsForm ? 1 : 0);
      return a.lineId.localeCompare(b.lineId);
    });

    // Best line: the first one
    const optimalLine = capableLines[0];

    return {
      norm,
      asFormLine,
      capableLines,
      optimalLine
    };
  }

  function getTodayPlanReference() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      todayIso: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      todayDisplay: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    };
  }

  /**
   * Xác định thông tin 2 cột "Date Plan" & "Shift Plan" cạnh cột Chênh Lệch:
   * - Hiển thị ngày hiện tại kèm các ca có kế hoạch (Plan > 0) trong ngày hiện tại ("Ngày", "Đêm", hoặc "Ngày + Đêm").
   * - Nếu ngày hiện tại không có Plan mà tổng lũy kế vẫn âm -> "Âm luỹ kế" & "--".
   */
  function resolvePlanDateAndShiftMeta(it, gapQty, todayRef, shiftFilter = 'ALL') {
    const { todayIso, todayDisplay } = todayRef || getTodayPlanReference();
    const dailyList = (it && Array.isArray(it.daily)) ? it.daily : [];
    const todayEntry = dailyList.find(d => {
      if (!d || d.isSelected === false) return false;
      const dIso = (window.AppStore && window.AppStore.toISODate) ? window.AppStore.toISODate(d.date) : d.date;
      return dIso === todayIso;
    });

    const plannedShifts = [];
    if (todayEntry) {
      const dayPlan = Number(todayEntry.planDay) || 0;
      const nightPlan = Number(todayEntry.planNight) || 0;

      if (shiftFilter !== 'NIGHT' && dayPlan > 0) {
        plannedShifts.push('Ngày');
      }
      if (shiftFilter !== 'DAY' && nightPlan > 0) {
        plannedShifts.push('Đêm');
      }
    }

    if (plannedShifts.length > 0) {
      return {
        datePlanLabel: todayDisplay,
        shiftPlanLabel: plannedShifts.join(' + '),
        isCumNegative: false,
        pendingShifts: plannedShifts
      };
    }

    if (gapQty < 0) {
      return {
        datePlanLabel: 'Âm luỹ kế',
        shiftPlanLabel: '--',
        isCumNegative: true,
        pendingShifts: []
      };
    }

    return {
      datePlanLabel: '--',
      shiftPlanLabel: '--',
      isCumNegative: false,
      pendingShifts: []
    };
  }

  function renderPlanDateAndShiftCellsHtml(meta) {
    const m = meta || { datePlanLabel: '--', shiftPlanLabel: '--', isCumNegative: false, pendingShifts: [] };
    const dateBadgeClass = m.isCumNegative ? 'badge-amber' : 'badge-blue';

    let shiftBadgeClass = '';
    if (m.pendingShifts.length === 2 || m.shiftPlanLabel === 'Đủ Plan') {
      shiftBadgeClass = 'badge-green';
    } else if (m.pendingShifts[0] === 'Ngày') {
      shiftBadgeClass = 'badge-blue';
    } else if (m.pendingShifts[0] === 'Đêm') {
      shiftBadgeClass = 'badge-purple';
    }

    const dateHtml = m.datePlanLabel === '--'
      ? `<span style="color: var(--text-muted); font-size: 0.775rem;">--</span>`
      : `<span class="badge ${dateBadgeClass} font-mono" style="font-size: 0.725rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 6px; white-space: nowrap;">${m.datePlanLabel}</span>`;

    const shiftHtml = m.shiftPlanLabel === '--'
      ? `<span style="color: var(--text-muted); font-size: 0.775rem;">--</span>`
      : `<span class="badge ${shiftBadgeClass}" style="font-size: 0.725rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 6px; white-space: nowrap;">${m.shiftPlanLabel}</span>`;

    return `
      <td style="text-align: center; white-space: nowrap; padding: 0.35rem 0.35rem;">${dateHtml}</td>
      <td style="text-align: center; white-space: nowrap; padding: 0.35rem 0.35rem;">${shiftHtml}</td>
    `;
  }

  function formatIsoToVnDate(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return isoStr || '--';
    const parts = isoStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  /**
   * Truy xuất nguồn ngày & ca sản xuất bắt đầu bị âm cho các Model "Âm luỹ kế":
   * - Duyệt theo thứ tự thời gian từng ca (Ngày -> Đêm) trong kỳ đang lọc.
   * - Tìm mốc cuối cùng tổng lũy kế (Fact - Plan) chuyển từ >= 0 sang < 0 và giữ âm liên tục tới cuối kỳ.
   */
  function resolveAccumulatedNegativeOrigin(it, shiftFilter = 'ALL') {
    const dailyList = (it && Array.isArray(it.daily)) ? it.daily : [];
    const slots = [];
    let running = 0;

    dailyList.forEach(d => {
      if (!d || d.isSelected === false) return;
      const dIso = (window.AppStore && window.AppStore.toISODate) ? window.AppStore.toISODate(d.date) : d.date;
      const dDisp = formatIsoToVnDate(dIso);

      if (shiftFilter !== 'NIGHT') {
        const pDay = Number(d.planDay) || 0;
        const fDay = Number(d.factDay) || 0;
        running += (fDay - pDay);
        slots.push({ dateIso: dIso, dateDisp: dDisp, shift: 'Ngày', plan: pDay, fact: fDay, running });
      }
      if (shiftFilter !== 'DAY') {
        const pNight = Number(d.planNight) || 0;
        const fNight = Number(d.factNight) || 0;
        running += (fNight - pNight);
        slots.push({ dateIso: dIso, dateDisp: dDisp, shift: 'Đêm', plan: pNight, fact: fNight, running });
      }
    });

    if (slots.length === 0 || running >= 0) {
      return { originDate: '', originShift: '', label: '--', tooltip: '' };
    }

    let streakStartIdx = -1;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i].running < 0) {
        streakStartIdx = i;
      } else {
        break;
      }
    }
    if (streakStartIdx < 0) {
      return { originDate: '', originShift: '', label: '--', tooltip: '' };
    }

    const startSlot = slots[streakStartIdx];
    const sameDayMissingShifts = [];
    for (let j = streakStartIdx; j < slots.length; j++) {
      if (slots[j].dateIso !== startSlot.dateIso) break;
      if (slots[j].plan > slots[j].fact && !sameDayMissingShifts.includes(slots[j].shift)) {
        sameDayMissingShifts.push(slots[j].shift);
      }
    }
    const originShift = sameDayMissingShifts.length > 0 ? sameDayMissingShifts.join(' + ') : startSlot.shift;
    const timelineNotes = slots
      .filter(s => s.plan > 0 || s.fact > 0)
      .map(s => `${s.dateDisp.slice(0, 5)} ${s.shift}: P=${s.plan} / F=${s.fact} (LK: ${s.running >= 0 ? '+' : ''}${s.running})`);

    return {
      originDate: startSlot.dateDisp,
      originShift,
      label: `${startSlot.dateDisp} • ${originShift}`,
      tooltip: timelineNotes.join(' | ')
    };
  }

  function renderAccumulatedNegativeOriginCellHtml(negMeta) {
    if (!negMeta || !negMeta.originDate) {
      return `<td style="text-align: center; color: var(--text-muted); font-size: 0.775rem; white-space: nowrap; padding: 0.35rem 0.35rem;">--</td>`;
    }
    const shiftBadgeClass = negMeta.originShift === 'Ngày + Đêm'
      ? 'badge-green'
      : negMeta.originShift === 'Ngày'
        ? 'badge-blue'
        : 'badge-purple';
    const titleAttr = (negMeta.tooltip || '').replace(/"/g, '&quot;');
    return `
      <td style="text-align: center; white-space: nowrap; padding: 0.35rem 0.4rem;" title="${titleAttr}">
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;">
          <span class="badge badge-amber font-mono" style="font-size: 0.725rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 6px;">${negMeta.originDate}</span>
          <span class="badge ${shiftBadgeClass}" style="font-size: 0.725rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 6px;">${negMeta.originShift}</span>
        </div>
      </td>
    `;
  }

  /**
   * Mã hóa/giải mã an toàn rowKey đưa vào inline HTML handler (tránh lỗi SyntaxError khi Data_Mass chứa \n, \r, ')
   */
  function encodeSimRowKey(key) {
    return encodeURIComponent(String(key || '')).replace(/'/g, '%27');
  }

  function sanitizeTsvCell(val) {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null) return '';
    return String(val).replace(/[\t\r\n]+/g, ' ').trim();
  }

  function hasSimRowPlanningNote(rowKey, model1c, modelGroup) {
    const notes = window.AppStore && window.AppStore.simManualNotes;
    if (!notes) return false;
    const rawNote = notes[rowKey] !== undefined
      ? notes[rowKey]
      : ((model1c && notes[model1c] !== undefined)
          ? notes[model1c]
          : (modelGroup && notes[modelGroup] !== undefined ? notes[modelGroup] : ''));
    return String(rawNote || '').trim().length > 0;
  }

  function getPlanningPriorityTier(gapQty, planMeta) {
    if (gapQty < 0) {
      return (planMeta && planMeta.isCumNegative) ? 0 : 1;
    }
    const hasTodayPlan = !!(planMeta && Array.isArray(planMeta.pendingShifts) && planMeta.pendingShifts.length > 0);
    return hasTodayPlan ? 2 : 3;
  }

  function comparePlanningEntries(aGap, aPlanMeta, aPlanQty, aTieNum, bGap, bPlanMeta, bPlanQty, bTieNum) {
    const aTier = getPlanningPriorityTier(aGap, aPlanMeta);
    const bTier = getPlanningPriorityTier(bGap, bPlanMeta);
    if (aTier !== bTier) return aTier - bTier;

    if (aGap < 0 && bGap < 0 && aGap !== bGap) {
      return aGap - bGap;
    }
    if (bPlanQty !== aPlanQty) {
      return bPlanQty - aPlanQty;
    }
    return aTieNum - bTieNum;
  }

  function compareAssemblyPriorityRows(a, b) {
    const aGap = a.cumGapQty !== undefined ? Number(a.cumGapQty || 0) : Number((a.it && a.it.cumGapQty) || 0);
    const bGap = b.cumGapQty !== undefined ? Number(b.cumGapQty || 0) : Number((b.it && b.it.cumGapQty) || 0);
    const aMeta = a._prePlanMeta || a.planMeta;
    const bMeta = b._prePlanMeta || b.planMeta;
    const aPlan = a.cumPlanQty !== undefined ? Number(a.cumPlanQty || 0) : Number((a.it && a.it.cumPlanQty) || 0);
    const bPlan = b.cumPlanQty !== undefined ? Number(b.cumPlanQty || 0) : Number((b.it && b.it.cumPlanQty) || 0);
    const aTie = a._preSortIdx !== undefined ? a._preSortIdx : (a.idx || 0);
    const bTie = b._preSortIdx !== undefined ? b._preSortIdx : (b.idx || 0);
    return comparePlanningEntries(aGap, aMeta, aPlan, aTie, bGap, bMeta, bPlan, bTie);
  }

  function compareHardtestPriorityRows(a, b) {
    const cmp = comparePlanningEntries(
      Number(a.gapQty || 0),
      a.planMeta,
      Number(a.planQty || 0),
      a.idx || 0,
      Number(b.gapQty || 0),
      b.planMeta,
      Number(b.planQty || 0),
      b.idx || 0
    );
    if (cmp !== 0) return cmp;
    return (a.group || '').localeCompare(b.group || '');
  }

  function hasLiveManualPlanOverride(rowKey, moduleType) {
    if (!window.AppStore) return false;
    if (moduleType === 'TOTAL_HARDTEST') {
      const pDay = window.AppStore.hardtestManualPlanDay && window.AppStore.hardtestManualPlanDay[rowKey];
      const pNight = window.AppStore.hardtestManualPlanNight && window.AppStore.hardtestManualPlanNight[rowKey];
      return (Number(pDay) || 0) > 0 || (Number(pNight) || 0) > 0;
    }
    const pDay = window.AppStore.simManualPlanDay && window.AppStore.simManualPlanDay[rowKey];
    const pNight = window.AppStore.simManualPlanNight && window.AppStore.simManualPlanNight[rowKey];
    return (Number(pDay) || 0) > 0 || (Number(pNight) || 0) > 0;
  }

  /**
   * Kiểm tra toàn bộ Model Âm luỹ kế đã được lập kế hoạch (>0) HOẶC có lý do ở cột Ghi Chú chưa.
   * Nếu còn bất kỳ Model Âm luỹ kế nào chưa xử lý -> khóa nhập kế hoạch cho các Model ngày hiện tại.
   */
  function evaluateCumNegativeGate(moduleType, visibleEntries, snapshotKey, isUnfiltered, extraFullCumNegItems) {
    if (!window.AppStore) {
      return { moduleType, totalCumNeg: 0, resolvedCumNeg: 0, pendingRows: [], pendingCount: 0, isBlocked: false, cumNegKeySet: new Set() };
    }
    if (!window.AppStore._cumNegSnapshots) window.AppStore._cumNegSnapshots = {};
    if (!window.AppStore._cumNegSnapshots[moduleType]) window.AppStore._cumNegSnapshots[moduleType] = {};
    if (!window.AppStore._cumNegGateState) window.AppStore._cumNegGateState = {};

    const storeSnapMap = window.AppStore._cumNegSnapshots[moduleType];
    const visibleByKey = new Map();
    const visibleCumNeg = [];

    (visibleEntries || []).forEach(entry => {
      visibleByKey.set(entry.rowKey, entry);
      if (entry.isCumNeg && entry.gapQty < 0) {
        visibleCumNeg.push(entry);
      }
    });

    if (isUnfiltered) {
      storeSnapMap[snapshotKey] = visibleCumNeg.map(e => ({
        rowKey: e.rowKey,
        modelName: e.modelName,
        group: e.group,
        gapQty: e.gapQty,
        isCumNeg: true,
        plannedOutput: e.plannedOutput || 0
      }));
    }

    const prevSnapList = storeSnapMap[snapshotKey] || [];
    const prevSnapByKey = new Map(prevSnapList.map(s => [s.rowKey, s]));
    const effectiveCumNegMap = new Map();

    if (isUnfiltered) {
      visibleCumNeg.forEach(e => effectiveCumNegMap.set(e.rowKey, e));
    } else if (Array.isArray(extraFullCumNegItems) && extraFullCumNegItems.length > 0) {
      extraFullCumNegItems.forEach(item => {
        const vis = visibleByKey.get(item.rowKey);
        if (vis) {
          effectiveCumNegMap.set(item.rowKey, vis);
        } else {
          const prevSnap = prevSnapByKey.get(item.rowKey);
          const manualOut = hasLiveManualPlanOverride(item.rowKey, moduleType) ? 1 : 0;
          effectiveCumNegMap.set(item.rowKey, {
            rowKey: item.rowKey,
            modelName: item.modelName,
            group: item.group,
            gapQty: item.gapQty,
            isCumNeg: true,
            plannedOutput: Math.max(manualOut, prevSnap ? (prevSnap.plannedOutput || 0) : 0),
            hasNote: hasSimRowPlanningNote(item.rowKey, item.modelName, item.group)
          });
        }
      });
    } else {
      prevSnapList.forEach(s => {
        const vis = visibleByKey.get(s.rowKey);
        if (vis) {
          effectiveCumNegMap.set(s.rowKey, vis);
        } else {
          const manualOut = hasLiveManualPlanOverride(s.rowKey, moduleType) ? 1 : 0;
          effectiveCumNegMap.set(s.rowKey, {
            rowKey: s.rowKey,
            modelName: s.modelName,
            group: s.group,
            gapQty: s.gapQty,
            isCumNeg: true,
            plannedOutput: Math.max(manualOut, s.plannedOutput || 0),
            hasNote: hasSimRowPlanningNote(s.rowKey, s.modelName, s.group)
          });
        }
      });
      visibleCumNeg.forEach(e => {
        if (!effectiveCumNegMap.has(e.rowKey)) {
          effectiveCumNegMap.set(e.rowKey, e);
        }
      });
    }

    const allCumNegRows = Array.from(effectiveCumNegMap.values());
    const cumNegKeySet = new Set(allCumNegRows.map(r => r.rowKey));
    const pendingRows = [];

    allCumNegRows.forEach(r => {
      const hasPlan = (Number(r.plannedOutput) || 0) > 0;
      const hasReason = !!r.hasNote;
      if (!hasPlan && !hasReason) {
        pendingRows.push(r);
      }
    });

    pendingRows.sort((a, b) => (a.gapQty || 0) - (b.gapQty || 0));

    const gateState = {
      moduleType,
      totalCumNeg: allCumNegRows.length,
      resolvedCumNeg: allCumNegRows.length - pendingRows.length,
      pendingRows,
      pendingCount: pendingRows.length,
      isBlocked: pendingRows.length > 0,
      cumNegKeySet
    };
    window.AppStore._cumNegGateState[moduleType] = gateState;
    return gateState;
  }

  function renderCumNegPriorityBannerHtml(gateState, moduleType) {
    if (!gateState || gateState.totalCumNeg === 0) return '';

    if (gateState.isBlocked) {
      const samplePills = gateState.pendingRows.slice(0, 4).map(r => {
        const shortName = String(r.modelName || r.group || '--').replace(/[\r\n]+/g, ' ');
        return `<span class="sim-cumneg-pending-pill">${shortName} (${Number(r.gapQty || 0).toLocaleString('vi-VN')})</span>`;
      }).join('');
      const moreCount = gateState.pendingCount - 4;

      return `
        <div class="sim-cumneg-gate-banner is-blocked" data-gate-module="${moduleType}">
          <div style="display: flex; align-items: flex-start; gap: 0.65rem; flex: 1; min-width: 280px;">
            <span style="font-size: 1.25rem; line-height: 1.1;">🔒</span>
            <div>
              <div style="font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <span>ƯU TIÊN ÂM LUỸ KẾ: Đang khóa lập kế hoạch ngày hiện tại</span>
                <span class="badge badge-amber font-mono" style="font-size: 0.7rem; font-weight: 800;">Đã xử lý ${gateState.resolvedCumNeg}/${gateState.totalCumNeg} • Còn ${gateState.pendingCount} mã</span>
              </div>
              <div style="font-size: 0.74rem; opacity: 0.92; margin-top: 0.2rem;">
                Phải nhập <strong>Plan (&gt; 0)</strong> hoặc nhập <strong>Lý do ở cột Ghi Chú</strong> cho tất cả Model <strong>Âm luỹ kế</strong> trước khi lập kế hoạch cho ngày hiện tại.
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem; align-items: center;">
                ${samplePills}
                ${moreCount > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; opacity: 0.9;">+${moreCount} mã khác</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <button type="button" class="btn btn-secondary" onclick="handleFocusCumNegRows('${moduleType}')" style="padding: 0.25rem 0.6rem; font-size: 0.725rem; font-weight: 800; color: #fbbf24; border-color: rgba(251, 191, 36, 0.55); background: rgba(15, 23, 42, 0.75); border-radius: 6px; cursor: pointer;">
              🎯 Hiện tất cả Âm luỹ kế
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="sim-cumneg-gate-banner is-unlocked" data-gate-module="${moduleType}">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.76rem;">
          <span>✅</span>
          <span>Đã xử lý xong <strong>${gateState.totalCumNeg}/${gateState.totalCumNeg} Model Âm luỹ kế</strong> (đều đã có Kế hoạch hoặc Lý do ở cột Ghi Chú) — Đã mở khóa lập kế hoạch ngày hiện tại.</span>
        </div>
      </div>
    `;
  }

  function assertCumNegPriorityUnlocked(rowKey, moduleType) {
    const stateMap = window.AppStore && window.AppStore._cumNegGateState;
    const gate = stateMap && stateMap[moduleType];
    if (!gate || !gate.isBlocked) return true;
    if (gate.cumNegKeySet && gate.cumNegKeySet.has(rowKey)) return true;

    const sampleNames = (gate.pendingRows || [])
      .slice(0, 2)
      .map(p => String(p.modelName || p.group || '').replace(/[\r\n]+/g, ' '))
      .filter(Boolean)
      .join(', ');
    const extra = gate.pendingCount > 2 ? ` (+${gate.pendingCount - 2} mã khác)` : '';
    if (window.showToast) {
      window.showToast(
        'warning',
        `🔒 Chưa thể lập kế hoạch ngày hiện tại! Còn ${gate.pendingCount} Model Âm luỹ kế (${sampleNames}${extra}) chưa có Plan (>0) hoặc Lý do ở cột Ghi Chú.`
      );
    }
    renderCapacityViewPreservingScroll();
    return false;
  }

  function renderCapacityViewPreservingScroll() {
    if (!window.renderCapacityView) return;
    const hasDom = typeof document !== 'undefined' && typeof document.getElementById === 'function';
    const asmWrap = hasDom ? document.getElementById('simTableScrollWrapper') : null;
    const htWrap = hasDom ? document.getElementById('hardtestSimTableScrollWrapper') : null;
    const asmScroll = asmWrap ? { top: asmWrap.scrollTop || 0, left: asmWrap.scrollLeft || 0 } : null;
    const htScroll = htWrap ? { top: htWrap.scrollTop || 0, left: htWrap.scrollLeft || 0 } : null;
    const winScrollY = (typeof window !== 'undefined' && typeof window.scrollY === 'number') ? window.scrollY : null;

    window.renderCapacityView();

    if (hasDom) {
      const asmAfter = document.getElementById('simTableScrollWrapper');
      if (asmAfter && asmScroll) {
        asmAfter.scrollTop = asmScroll.top;
        asmAfter.scrollLeft = asmScroll.left;
      }
      const htAfter = document.getElementById('hardtestSimTableScrollWrapper');
      if (htAfter && htScroll) {
        htAfter.scrollTop = htScroll.top;
        htAfter.scrollLeft = htScroll.left;
      }
    }
    if (winScrollY !== null && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo(window.scrollX || 0, winScrollY);
      } catch (e) {}
    }
  }

  window.handleFocusCumNegRows = function(moduleType) {
    if (!window.AppStore) return;
    if (moduleType === 'TOTAL_HARDTEST') {
      window.AppStore.hardtestSimStatusFilter = 'GAP_NEGATIVE';
      window.AppStore.hardtestSimStageFilter = 'ALL';
      window.AppStore.hardtestSimGroupFilter = 'ALL';
      window.AppStore.hardtestSimSearchVal = '';
    } else {
      window.AppStore.simPlanStatusFilter = 'GAP_NEGATIVE';
      window.AppStore.simGroupFilter = 'ALL';
      window.AppStore.simSearchVal = '';
      window.AppStore.simPageIndex = 0;
    }
    if (window.renderCapacityView) window.renderCapacityView();
  };

  /**
   * Chuyển từ bảng Capacity Planning sang tab WIP Control và lọc đúng Model + Công đoạn tương ứng
   */
  window.handleCheckModelWip = function(stageEnc, modelGroupEnc, product1CEnc, gapQty, fromDateStr, toDateStr) {
    const stage = decodeURIComponent(stageEnc || 'ASSEMBLY').trim() || 'ASSEMBLY';
    const modelGroup = decodeURIComponent(modelGroupEnc || '').trim();
    const product1C = decodeURIComponent(product1CEnc || '').trim();
    const wipSearchText = product1C || modelGroup;

    if (!window.WipStore) window.WipStore = {};
    window.WipStore.stageFilter = stage;
    window.WipStore.modelFilter = 'ALL';
    window.WipStore.lastStepFilter = 'ALL';
    window.WipStore.statusFilter = 'ALL';
    window.WipStore.gapFilter = (Number(gapQty) !== 0) ? 'HAS_GAP' : 'ALL';
    window.WipStore.sortBy = 'GAP_ASC';
    window.WipStore.warehouseFilter = 'ALL';
    window.WipStore.search = wipSearchText;
    window.WipStore.pageIndex = 0;

    if (fromDateStr) window.WipStore.fromDate = fromDateStr;
    if (toDateStr) {
      window.WipStore.toDate = toDateStr;
      window.WipStore.date = toDateStr;
    }

    const wipNavLink = document.querySelector('.nav-link[data-tab="wip"]');
    if (wipNavLink && typeof wipNavLink.click === 'function') {
      wipNavLink.click();
    } else {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      const tabWip = document.getElementById('tab-wip');
      if (tabWip) tabWip.classList.add('active');
      if (typeof window.renderWipControlView === 'function') {
        window.renderWipControlView('wipContainer');
      }
    }

    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {}
    if (typeof window.showToast === 'function') {
      window.showToast('info', `📦 Đang kiểm tra WIP [${stage}]: ${wipSearchText}`);
    }
  };

  function getSimPlannerName() {
    if (!window.AppStore) return 'Bùi Anh Tuấn';
    return (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');
  }

  function getSimHistoryCount() {
    try {
      const hList = JSON.parse(localStorage.getItem('AJAX_SIM_PLAN_HISTORY') || '[]');
      return Array.isArray(hList) ? hList.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function buildHardtestDraftState() {
    if (!window.AppStore) return {};
    return {
      hardtestSimFromDate: window.AppStore.hardtestSimFromDate || window.AppStore.simFromDate || window.AppStore.fromDate || '2026-11-05',
      hardtestSimToDate: window.AppStore.hardtestSimToDate || window.AppStore.simToDate || window.AppStore.toDate || '2026-11-05',
      hardtestSimShiftType: window.AppStore.hardtestSimShiftType || 'FULL_DAY',
      hardtestSimStageFilter: window.AppStore.hardtestSimStageFilter || 'ALL',
      hardtestSimGroupFilter: window.AppStore.hardtestSimGroupFilter || 'ALL',
      hardtestSimStatusFilter: window.AppStore.hardtestSimStatusFilter || 'GAP_NEGATIVE',
      hardtestSimSearchVal: window.AppStore.hardtestSimSearchVal || '',
      hardtestWorkingKipsDay: getHardtestSelectedKips('DAY'),
      hardtestWorkingKipsNight: getHardtestSelectedKips('NIGHT'),
      _htKipsManualConfigured: Boolean(window.AppStore._htKipsManualConfigured),
      hardtestManpowerOverrideDay: window.AppStore.hardtestManpowerOverrideDay ?? null,
      hardtestManpowerOverrideNight: window.AppStore.hardtestManpowerOverrideNight ?? null,
      hardtestPlanOverrides: { ...(window.AppStore.hardtestPlanOverrides || {}) },
      hardtestManualTbDay: { ...(window.AppStore.hardtestManualTbDay || {}) },
      hardtestManualManDay: { ...(window.AppStore.hardtestManualManDay || {}) },
      hardtestManualPlanDay: { ...(window.AppStore.hardtestManualPlanDay || {}) },
      hardtestManualTbNight: { ...(window.AppStore.hardtestManualTbNight || {}) },
      hardtestManualManNight: { ...(window.AppStore.hardtestManualManNight || {}) },
      hardtestManualPlanNight: { ...(window.AppStore.hardtestManualPlanNight || {}) },
      hardtestManualTb: { ...(window.AppStore.hardtestManualTb || {}) },
      hardtestManualMan: { ...(window.AppStore.hardtestManualMan || {}) }
    };
  }

  function applyHardtestDraftFields(hs, forceOverwrite = false) {
    if (!window.AppStore || !hs || typeof hs !== 'object') return;
    if (hs.hardtestSimFromDate && (forceOverwrite || !window.AppStore.hardtestSimFromDate)) window.AppStore.hardtestSimFromDate = hs.hardtestSimFromDate;
    if (hs.hardtestSimToDate && (forceOverwrite || !window.AppStore.hardtestSimToDate)) window.AppStore.hardtestSimToDate = hs.hardtestSimToDate;
    if (hs.hardtestSimShiftType && (forceOverwrite || !window.AppStore.hardtestSimShiftType)) window.AppStore.hardtestSimShiftType = hs.hardtestSimShiftType;
    if (hs.hardtestSimStageFilter && (forceOverwrite || !window.AppStore.hardtestSimStageFilter)) window.AppStore.hardtestSimStageFilter = hs.hardtestSimStageFilter;
    if (hs.hardtestSimGroupFilter && (forceOverwrite || !window.AppStore.hardtestSimGroupFilter)) window.AppStore.hardtestSimGroupFilter = hs.hardtestSimGroupFilter;
    if (hs.hardtestSimStatusFilter && (forceOverwrite || !window.AppStore.hardtestSimStatusFilter)) window.AppStore.hardtestSimStatusFilter = hs.hardtestSimStatusFilter;
    if (hs.hardtestSimSearchVal !== undefined && (forceOverwrite || !window.AppStore.hardtestSimSearchVal)) window.AppStore.hardtestSimSearchVal = hs.hardtestSimSearchVal;
    if (Array.isArray(hs.hardtestWorkingKipsDay) && (forceOverwrite || !window.AppStore._htKipsManualConfigured)) {
      window.AppStore.hardtestWorkingKipsDay = [...hs.hardtestWorkingKipsDay];
    }
    if (Array.isArray(hs.hardtestWorkingKipsNight) && (forceOverwrite || !window.AppStore._htKipsManualConfigured)) {
      window.AppStore.hardtestWorkingKipsNight = [...hs.hardtestWorkingKipsNight];
    }
    if (hs._htKipsManualConfigured && (forceOverwrite || !window.AppStore._htKipsManualConfigured)) {
      window.AppStore._htKipsManualConfigured = true;
    }
    if (hs.hardtestManpowerOverrideDay !== undefined && (forceOverwrite || window.AppStore.hardtestManpowerOverrideDay === undefined)) {
      window.AppStore.hardtestManpowerOverrideDay = hs.hardtestManpowerOverrideDay;
    }
    if (hs.hardtestManpowerOverrideNight !== undefined && (forceOverwrite || window.AppStore.hardtestManpowerOverrideNight === undefined)) {
      window.AppStore.hardtestManpowerOverrideNight = hs.hardtestManpowerOverrideNight;
    }

    const dictKeys = [
      'hardtestPlanOverrides',
      'hardtestManualTbDay',
      'hardtestManualManDay',
      'hardtestManualPlanDay',
      'hardtestManualTbNight',
      'hardtestManualManNight',
      'hardtestManualPlanNight',
      'hardtestManualTb',
      'hardtestManualMan'
    ];
    dictKeys.forEach(k => {
      if (hs[k] && (forceOverwrite || !window.AppStore[k] || Object.keys(window.AppStore[k]).length === 0)) {
        window.AppStore[k] = { ...hs[k] };
      }
    });
  }

  const HARDTEST_KIP_OPTIONS = ['HT A', 'HT B', 'HT C', 'HT D'];
  const DEFAULT_HT_KIP_HEADCOUNT = { A: 24, B: 23, C: 25, D: 24 };

  function getHardtestKipCode(kipLabel) {
    return String(kipLabel || '').replace(/^HT\s+/i, '').trim().toUpperCase();
  }

  function getHardtestKipHeadcount(kipLabelOrCode) {
    const code = getHardtestKipCode(kipLabelOrCode);
    const mp = window.MANPOWER_MASTER_DATA || {};
    const liveMp = (window.AppStore && window.AppStore.dataMass && window.AppStore.dataMass.manpowerSheet)
      ? window.AppStore.dataMass.manpowerSheet : {};
    const entry = mp[code] || liveMp[code];
    if (entry && typeof entry.htDirect === 'number') return entry.htDirect;
    if (liveMp[code] && typeof liveMp[code].htDirect === 'number') return liveMp[code].htDirect;
    return DEFAULT_HT_KIP_HEADCOUNT[code] !== undefined ? DEFAULT_HT_KIP_HEADCOUNT[code] : 0;
  }

  function getHardtestSelectedKips(shift) {
    if (!window.AppStore) return shift === 'DAY' ? ['HT A'] : ['HT B'];
    if (!window.AppStore._htKipsManualConfigured) {
      if (!Array.isArray(window.AppStore.hardtestWorkingKipsDay)) {
        window.AppStore.hardtestWorkingKipsDay = ['HT A'];
      }
      if (!Array.isArray(window.AppStore.hardtestWorkingKipsNight)) {
        window.AppStore.hardtestWorkingKipsNight = ['HT B'];
      }
    }
    const raw = shift === 'DAY'
      ? (window.AppStore.hardtestWorkingKipsDay || [])
      : (window.AppStore.hardtestWorkingKipsNight || []);
    const allowed = new Set(HARDTEST_KIP_OPTIONS);
    return HARDTEST_KIP_OPTIONS.filter(k => raw.includes(k) && allowed.has(k));
  }

  function sumHardtestKipsHeadcount(kips) {
    return (kips || []).reduce((sum, k) => sum + getHardtestKipHeadcount(k), 0);
  }

  function getHardtestTodaySheetKey() {
    const ref = getTodayPlanReference();
    if (ref && ref.sheetKey) return ref.sheetKey;
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  }

  function isSameCalendarDateKey(dateA, dateB) {
    if (!dateA || !dateB) return false;
    if (String(dateA).trim() === String(dateB).trim()) return true;
    if (window.AppStore && typeof window.AppStore.toISODate === 'function') {
      return window.AppStore.toISODate(dateA) === window.AppStore.toISODate(dateB);
    }
    return false;
  }

  function syncHardtestKipsToManpowerTab1(changedShift) {
    if (!window.AppStore || typeof window.AppStore.saveActualAttendance !== 'function') return;
    const todayKey = getHardtestTodaySheetKey();
    const dayKips = getHardtestSelectedKips('DAY');
    const nightKips = getHardtestSelectedKips('NIGHT');
    const dayPeople = sumHardtestKipsHeadcount(dayKips);
    const nightPeople = sumHardtestKipsHeadcount(nightKips);

    window.AppStore._syncingHtKipManpower = true;
    try {
      if (!window.AppStore.actualAttendance) window.AppStore.actualAttendance = {};
      // Seed opposite shift so internal _ALL calculation inside saveActualAttendance remains exact
      const oppShiftKey = changedShift === 'DAY' ? 'Night' : 'Day';
      const oppStorageKey = `${todayKey}_${oppShiftKey}`;
      const oppPeople = changedShift === 'DAY' ? nightPeople : dayPeople;
      if (!window.AppStore.actualAttendance[oppStorageKey] || window.AppStore.actualAttendance[oppStorageKey].hardtest_total === undefined) {
        window.AppStore.actualAttendance[oppStorageKey] = Object.assign({}, window.AppStore.actualAttendance[oppStorageKey] || {}, {
          hardtest_total: oppPeople
        });
      }

      const targetShiftKey = changedShift === 'DAY' ? 'Day' : 'Night';
      const targetKips = changedShift === 'DAY' ? dayKips : nightKips;
      const targetPeople = changedShift === 'DAY' ? dayPeople : nightPeople;
      const kipText = targetKips.length > 0 ? targetKips.join(' + ') : 'Nghỉ / Không chọn Kíp';
      const note = `Đồng bộ từ Total Hardtest (${changedShift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}: ${kipText} = ${targetPeople} ng)`;
      window.AppStore.saveActualAttendance(todayKey, targetShiftKey, 'HARDTEST_TOTAL', targetPeople, note);
    } finally {
      window.AppStore._syncingHtKipManpower = false;
    }

    if (typeof window.renderDataMassView === 'function') {
      window.renderDataMassView();
    }
    if (typeof window.updateAttendanceHistoryBadge === 'function') {
      window.updateAttendanceHistoryBadge();
    }
  }

  function matchHardtestKipsByHeadcount(targetNum) {
    if (targetNum === 0) return [];
    const singles = HARDTEST_KIP_OPTIONS.filter(k => getHardtestKipHeadcount(k) === targetNum);
    if (singles.length > 0) return [singles[0]];
    for (let i = 0; i < HARDTEST_KIP_OPTIONS.length; i++) {
      for (let j = i + 1; j < HARDTEST_KIP_OPTIONS.length; j++) {
        const pair = [HARDTEST_KIP_OPTIONS[i], HARDTEST_KIP_OPTIONS[j]];
        if (sumHardtestKipsHeadcount(pair) === targetNum) return pair;
      }
    }
    for (let i = 0; i < HARDTEST_KIP_OPTIONS.length; i++) {
      for (let j = i + 1; j < HARDTEST_KIP_OPTIONS.length; j++) {
        for (let m = j + 1; m < HARDTEST_KIP_OPTIONS.length; m++) {
          const tri = [HARDTEST_KIP_OPTIONS[i], HARDTEST_KIP_OPTIONS[j], HARDTEST_KIP_OPTIONS[m]];
          if (sumHardtestKipsHeadcount(tri) === targetNum) return tri;
        }
      }
    }
    if (sumHardtestKipsHeadcount(HARDTEST_KIP_OPTIONS) === targetNum) return [...HARDTEST_KIP_OPTIONS];
    return null;
  }

  window.syncManpowerTab1ToHardtestKips = function(dateStr, shift, stage, value) {
    if (!window.AppStore || window.AppStore._syncingHtKipManpower) return;
    const normStage = typeof window.AppStore._normalizeStageKey === 'function'
      ? window.AppStore._normalizeStageKey(stage)
      : String(stage || '').toLowerCase();
    if (normStage !== 'hardtest_total') return;

    const todayKey = getHardtestTodaySheetKey();
    if (!isSameCalendarDateKey(dateStr, todayKey)) return;

    const num = Math.max(0, Math.round((parseFloat(value) || 0) * 10) / 10);
    const applyShiftValue = (sKey, val) => {
      const curKips = getHardtestSelectedKips(sKey);
      const curSum = sumHardtestKipsHeadcount(curKips);
      if (val === curSum) {
        if (sKey === 'DAY') window.AppStore.hardtestManpowerOverrideDay = null;
        else window.AppStore.hardtestManpowerOverrideNight = null;
      } else {
        const matched = matchHardtestKipsByHeadcount(val);
        if (matched !== null) {
          if (sKey === 'DAY') {
            window.AppStore.hardtestWorkingKipsDay = matched;
            window.AppStore.hardtestManpowerOverrideDay = null;
          } else {
            window.AppStore.hardtestWorkingKipsNight = matched;
            window.AppStore.hardtestManpowerOverrideNight = null;
          }
          window.AppStore._htKipsManualConfigured = true;
        } else {
          if (sKey === 'DAY') window.AppStore.hardtestManpowerOverrideDay = val;
          else window.AppStore.hardtestManpowerOverrideNight = val;
        }
      }
    };

    if (shift === 'Day' || shift === 'DAY') {
      applyShiftValue('DAY', num);
    } else if (shift === 'Night' || shift === 'NIGHT') {
      applyShiftValue('NIGHT', num);
    } else if (shift === 'ALL') {
      const recDay = window.AppStore.actualAttendance && window.AppStore.actualAttendance[`${dateStr}_Day`];
      const recNight = window.AppStore.actualAttendance && window.AppStore.actualAttendance[`${dateStr}_Night`];
      if (recDay && recDay.hardtest_total !== undefined) applyShiftValue('DAY', recDay.hardtest_total);
      if (recNight && recNight.hardtest_total !== undefined) applyShiftValue('NIGHT', recNight.hardtest_total);
    }

    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    if (window.AppStore.selectedCapacityStage === 'TOTAL_HARDTEST' && window.AppStore.capacityViewMode === 'SIMULATOR' && window.renderCapacityView) {
      window.renderCapacityView();
    }
  };

  window.syncHardtestKipsOnMasterConfigChange = function() {
    if (!window.AppStore) return;
    if (window.AppStore._htKipsManualConfigured) {
      syncHardtestKipsToManpowerTab1('DAY');
      syncHardtestKipsToManpowerTab1('NIGHT');
    }
    if (window.AppStore.selectedCapacityStage === 'TOTAL_HARDTEST' && window.AppStore.capacityViewMode === 'SIMULATOR' && window.renderCapacityView) {
      window.renderCapacityView();
    }
  };

  window.handleToggleHardtestWorkingKip = function(shift, kipLabel) {
    if (!window.AppStore) return;
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản Viewer (Chỉ xem). Không thể thay đổi Kíp trực Total Hardtest!');
      return;
    }
    const isDay = (shift === 'DAY');
    const cur = getHardtestSelectedKips(shift);
    const set = new Set(cur);
    if (set.has(kipLabel)) set.delete(kipLabel);
    else set.add(kipLabel);
    const updated = HARDTEST_KIP_OPTIONS.filter(k => set.has(k));

    if (isDay) {
      window.AppStore.hardtestWorkingKipsDay = updated;
      window.AppStore.hardtestManpowerOverrideDay = null;
    } else {
      window.AppStore.hardtestWorkingKipsNight = updated;
      window.AppStore.hardtestManpowerOverrideNight = null;
    }
    window.AppStore._htKipsManualConfigured = true;

    syncHardtestKipsToManpowerTab1(shift);
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();

    const totalPeople = sumHardtestKipsHeadcount(updated);
    const shiftTitle = isDay ? 'Ca Ngày (10.83h)' : 'Ca Đêm (10.58h)';
    if (window.showToast) {
      const todayKey = getHardtestTodaySheetKey();
      const kipDesc = updated.length > 0 ? updated.join(' + ') : 'Không chọn Kíp';
      window.showToast('success', `✅ ${shiftTitle}: ${kipDesc} (${totalPeople} ng) ➜ Đã đồng bộ Phần 1 Nhân Lực (${todayKey})`);
    }
  };

  function ensureSimPlanDraftRestored() {
    if (!window.AppStore || window.AppStore._simDraftRestored) return;
    try {
      const savedDraftStr = localStorage.getItem('AJAX_SIM_PLAN_DRAFT');
      if (savedDraftStr) {
        const draft = JSON.parse(savedDraftStr);
        if (draft && typeof draft === 'object') {
          if (draft.plannerName && !window.AppStore.simPlannerName) window.AppStore.simPlannerName = draft.plannerName;
          if (draft.stageFilter && !window.AppStore.simStageFilter) window.AppStore.simStageFilter = draft.stageFilter;
          if (draft.simFromDate && !window.AppStore.simFromDate) {
            window.AppStore.simFromDate = draft.simFromDate;
            window.AppStore.fromDate = draft.simFromDate;
          }
          if (draft.simToDate && !window.AppStore.simToDate) {
            window.AppStore.simToDate = draft.simToDate;
            window.AppStore.toDate = draft.simToDate;
          }
          if (draft.simTargetDate && !window.AppStore.simTargetDate) window.AppStore.simTargetDate = draft.simTargetDate;
          if (draft.simScope && !window.AppStore.simScope) window.AppStore.simScope = draft.simScope;
          if (draft.simPlanStatusFilter && !window.AppStore.simPlanStatusFilter) window.AppStore.simPlanStatusFilter = draft.simPlanStatusFilter;
          if (draft.simGroupFilter && !window.AppStore.simGroupFilter) window.AppStore.simGroupFilter = draft.simGroupFilter;
          if (draft.simSearchVal !== undefined && !window.AppStore.simSearchVal) window.AppStore.simSearchVal = draft.simSearchVal;
          if (Array.isArray(draft.simWorkingLinesDay) && draft.simWorkingLinesDay.length > 0 && (!window.AppStore.simWorkingLinesDay || window.AppStore.simWorkingLinesDay.length === 0)) {
            window.AppStore.simWorkingLinesDay = [...draft.simWorkingLinesDay];
            window.AppStore._simLinesManualConfigured = true;
          }
          if (Array.isArray(draft.simWorkingLinesNight) && draft.simWorkingLinesNight.length > 0 && (!window.AppStore.simWorkingLinesNight || window.AppStore.simWorkingLinesNight.length === 0)) {
            window.AppStore.simWorkingLinesNight = [...draft.simWorkingLinesNight];
            window.AppStore._simLinesManualConfigured = true;
          }
          const asmDicts = [
            'simManualLinesDay', 'simManualLinesNight', 'simLineOverridesDay', 'simLineOverridesNight',
            'simLineOverrides', 'simManualSeqsDay', 'simManualSeqsNight', 'simManualPfDay', 'simManualPfNight',
            'simManualPlanDay', 'simManualPlanNight', 'simManualShifts', 'simManualNotes'
          ];
          asmDicts.forEach(k => {
            if (draft[k] && (!window.AppStore[k] || Object.keys(window.AppStore[k]).length === 0)) {
              window.AppStore[k] = { ...draft[k] };
            }
          });
          if (draft.hardtestState) applyHardtestDraftFields(draft.hardtestState, false);
        }
      }
    } catch (e) {
      console.warn('Error restoring sim draft:', e);
    }
    window.AppStore._simDraftRestored = true;
    if (window.initPlanSyncWatcher) window.initPlanSyncWatcher();
    if (!window.AppStore._checkedServerLatestOnOpen && window.handleAutoCheckLatestCompletedPlanOnLoad) {
      window.AppStore._checkedServerLatestOnOpen = true;
      window.handleAutoCheckLatestCompletedPlanOnLoad();
    }
  }

  function renderSimPlanActionButtonsHtml(plannerName, simHistoryCount) {
    return `
      <button type="button" class="btn btn-secondary sim-btn-planner" onclick="handleEditPlannerName()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); cursor: pointer;" title="Bấm để cập nhật tên Người lập Plan">
        <span>👤 Người lập Plan: <strong id="simPlannerBadgeName" style="color: #fbbf24;">${plannerName}</strong></span>
        <span style="font-size: 0.65rem; opacity: 0.8;">✏️</span>
      </button>
      <button type="button" class="btn btn-secondary sim-btn-draft" onclick="handleSaveSimPlanDraft()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(56, 189, 248, 0.12);" title="Lưu tạm tiến độ lập kế hoạch để không bị mất dữ liệu khi refresh">
        <span>💾 Lưu Tạm</span>
      </button>
      <button type="button" class="btn btn-secondary sim-btn-reset" onclick="handleResetSimPlan()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #f87171; border-color: rgba(248, 113, 113, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(248, 113, 113, 0.12); cursor: pointer;" title="Đặt lại (Reset) toàn bộ kế hoạch và phân bổ về mặc định">
        <span>🔄 Reset</span>
      </button>
      <button type="button" class="btn btn-primary sim-btn-complete" onclick="handleCompleteSimPlan()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-color: #10b981; display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);" title="Hoàn thành kế hoạch và lưu vào Lịch sử">
        <span>✅ Hoàn Thành</span>
      </button>
      <button type="button" class="btn btn-secondary sim-btn-history" onclick="handleOpenSimPlanHistoryModal()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #fbbf24; border-color: rgba(251, 191, 36, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(251, 191, 36, 0.1);" title="Xem lại lịch sử các lần lập kế hoạch và khôi phục khi cần">
        <span>📜 Lịch Sử Plan</span>
        <span id="simHistoryBadge" style="background: rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 0.05rem 0.35rem; border-radius: 9999px; font-size: 0.65rem; font-weight: 800;">${simHistoryCount}</span>
      </button>
      <button type="button" class="btn btn-secondary sim-btn-cloud-sync" onclick="handleForceSyncLatestPlan()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #34d399; border-color: rgba(52, 211, 153, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(52, 211, 153, 0.1); cursor: pointer;" title="Nạp ngay lập tức bản kế hoạch sản xuất mới nhất từ máy chủ / Cloud">
        <span>🔄 Đồng Bộ Plan</span>
      </button>
      <button type="button" class="btn btn-secondary sim-btn-cloud-setup" onclick="handleOpenCloudSyncModal()" style="padding: 0.2rem 0.6rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 6px; background: rgba(56, 189, 248, 0.1); cursor: pointer;" title="Cấu hình đồng bộ Cloud (GitHub Pages / Google Apps Script), xem link LAN và Xuất/Nhập file Plan (.json)">
        <span>☁️ Cloud / File</span>
      </button>
    `;
  }

  function renderSimNewPlanBannerHtml() {
    return `
      <div id="simNewPlanBanner" class="sim-new-plan-banner" style="margin: 0.6rem 0.75rem 0 0.75rem; display: ${window.AppStore._hasPendingRemotePlan ? 'flex' : 'none'};">
        <div class="banner-info">
          <span style="font-size: 1.35rem;">🔔</span>
          <div>
            <div style="font-weight: 800; color: #ffffff; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
              <span>Có Kế Hoạch Sản Xuất Mới Vừa Hoàn Thành!</span>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 4px;">Live Update</span>
            </div>
            <div id="simBannerDesc" style="color: #d1fae5; font-size: 0.75rem; margin-top: 0.15rem;">
              ${window.AppStore._pendingRemotePlanDesc || 'Đã có bản kế hoạch sản xuất mới từ thành viên khác.'}
            </div>
          </div>
        </div>
        <div class="banner-actions">
          <button type="button" class="sim-btn-apply-plan" onclick="handleApplyLatestCompletedPlan()">
            <span>⚡ Cập Nhật &amp; Xem Ngay</span>
          </button>
          <button type="button" class="btn btn-secondary" onclick="handleDismissNewPlanAlert()" style="padding: 0.25rem 0.55rem; font-size: 0.725rem; color: #d1fae5; border-color: rgba(209, 250, 229, 0.4); background: rgba(0,0,0,0.2); cursor: pointer;" title="Tạm ẩn thông báo này">
            <span>✕ Đóng</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * RENDER INTERACTIVE CAPACITY SIMULATOR (GIẢ LẬP TẢI CHUYỀN THEO BẢNG 2)
   */
  function renderCapacitySimulator(allGroups, items, shiftHours, allLines) {
    if (!window.AppStore) return '';

    ensureSimPlanDraftRestored();

    const capData = window.AppStore.getAssemblyCapacityData();
    const _defCapWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const simFromDate = window.AppStore.simFromDate || window.AppStore.fromDate || (_defCapWeek ? _defCapWeek.fromDate : '2026-11-05');
    const simToDate = window.AppStore.simToDate || window.AppStore.toDate || (_defCapWeek ? _defCapWeek.toDate : '2026-11-05');
    const fromDate = simFromDate;
    const toDate = simToDate;
    const shiftFilter = window.AppStore.currentShiftFilter || window.AppStore.datamassShiftFilter || 'ALL';
    const stageFilter = window.AppStore.simStageFilter || 'ASSEMBLY';
    const planStatusFilter = window.AppStore.simPlanStatusFilter || 'GAP_NEGATIVE';
    const groupFilter = window.AppStore.simGroupFilter || 'ALL';
    const searchVal = (window.AppStore.simSearchVal || '').trim();

    // Target simulation date & Scope state ('CUMULATIVE' | 'SINGLE')
    const simTargetDate = window.AppStore.simTargetDate || toDate || '2026-10-26';
    if (!window.AppStore.simTargetDate) {
      window.AppStore.simTargetDate = simTargetDate;
    }
    const simScope = window.AppStore.simScope || 'CUMULATIVE';

    const queryFromDate = (simScope === 'SINGLE') ? simTargetDate : simFromDate;
    const queryToDate = (simScope === 'SINGLE') ? simTargetDate : simToDate;

    // Query Master Schedule from Bảng 2 data source
    const schedule = window.AppStore.getDetailedSchedule({
      fromDate: queryFromDate,
      toDate: queryToDate,
      shiftFilter,
      stageFilter: stageFilter === 'ALL' ? 'ALL' : stageFilter,
      modelFilter: groupFilter === 'ALL' ? 'ALL' : groupFilter,
      planStatusFilter,
      search1C: searchVal,
      selectedDates: window.AppStore.getActiveSelectedDates ? window.AppStore.getActiveSelectedDates(queryFromDate, queryToDate) : null
    });

    // Deduplicate items by stage + productName1C to prevent duplicate planning rows for same physical product
    const uniqueScheduleMap = new Map();
    (schedule.items || []).forEach(it => {
      const p1cKey = (it.productName1C || it.model || '').trim().toLowerCase();
      const stageKey = (it.stage || '').trim().toUpperCase();
      const uKey = `${stageKey}___${p1cKey}`;
      if (!uniqueScheduleMap.has(uKey)) {
        uniqueScheduleMap.set(uKey, it);
      } else {
        const existing = uniqueScheduleMap.get(uKey);
        if ((it.model || '').length > (existing.model || '').length) {
          existing.model = it.model;
        }
      }
    });
    const scheduleItems = Array.from(uniqueScheduleMap.values());
    const todayPlanRefPreSort = getTodayPlanReference();
    scheduleItems.forEach((it, idx) => {
      const gapQty = Number(it.cumGapQty || 0);
      it._preSortIdx = idx;
      it._prePlanMeta = resolvePlanDateAndShiftMeta(it, gapQty, todayPlanRefPreSort, shiftFilter);
    });
    scheduleItems.sort(compareAssemblyPriorityRows);
    const selCount = schedule.kpis.selectedDaysCount || 5;
    const totCount = schedule.kpis.totalDaysCount || 5;

    const availableFactoryLines = ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D', '3A', '3C', '3D', 'Support 1', 'Support 2', 'Support 3'];
    const activeAssemblyLines = ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D', '3A', '3C', '3D', 'Support 1', 'Support 2', 'Support 3'];

    // Auto-migrate legacy 'Support' to 'Support 1'
    if (window.AppStore.simWorkingLinesDay) {
      window.AppStore.simWorkingLinesDay = window.AppStore.simWorkingLinesDay.map(l => l === 'Support' ? 'Support 1' : (l === '3B' ? '3C' : l));
    }
    if (window.AppStore.simWorkingLinesNight) {
      window.AppStore.simWorkingLinesNight = window.AppStore.simWorkingLinesNight.map(l => l === 'Support' ? 'Support 1' : (l === '3B' ? '3C' : l));
    }
    if (window.AppStore.simLineOverridesDay) {
      Object.keys(window.AppStore.simLineOverridesDay).forEach(k => {
        if (window.AppStore.simLineOverridesDay[k] === 'Support') window.AppStore.simLineOverridesDay[k] = 'Support 1';
        if (window.AppStore.simLineOverridesDay[k] === '3B') window.AppStore.simLineOverridesDay[k] = '3C';
      });
    }
    if (window.AppStore.simLineOverridesNight) {
      Object.keys(window.AppStore.simLineOverridesNight).forEach(k => {
        if (window.AppStore.simLineOverridesNight[k] === 'Support') window.AppStore.simLineOverridesNight[k] = 'Support 1';
        if (window.AppStore.simLineOverridesNight[k] === '3B') window.AppStore.simLineOverridesNight[k] = '3C';
      });
    }
    if (window.AppStore.simLineOverrides) {
      Object.keys(window.AppStore.simLineOverrides).forEach(k => {
        if (window.AppStore.simLineOverrides[k] === 'Support') window.AppStore.simLineOverrides[k] = 'Support 1';
        if (window.AppStore.simLineOverrides[k] === '3B') window.AppStore.simLineOverrides[k] = '3C';
      });
    }

    if (window.AppStore.simWorkingLinesDay === undefined || !window.AppStore._simLinesManualConfigured) {
      window.AppStore.simWorkingLinesDay = [];
      window.AppStore.simWorkingLinesNight = [];
      window.AppStore._simLinesManualConfigured = true;
    }

    const workingLinesDaySet = new Set(window.AppStore.simWorkingLinesDay || []);
    const workingLinesNightSet = new Set(window.AppStore.simWorkingLinesNight || []);
    const allWorkingLinesSet = new Set([...workingLinesDaySet, ...workingLinesNightSet]);

    const getShiftSupportCount = (linesArr) => {
      const set = new Set(linesArr || []);
      let cnt = 0;
      if (set.has('Support 1') || set.has('Support')) cnt++;
      if (set.has('Support 2')) cnt++;
      if (set.has('Support 3')) cnt++;
      return cnt;
    };
    const daySupportCount = getShiftSupportCount(window.AppStore.simWorkingLinesDay);
    const nightSupportCount = getShiftSupportCount(window.AppStore.simWorkingLinesNight);

    // Line workload accumulator
    // Line workload accumulator with strict per-shift tracking
    const lineWorkloads = {};
    const lineDayHoursUsed = {};
    const lineNightHoursUsed = {};
    const lineDaySeqCount = {};
    const lineNightSeqCount = {};
    const linesList = allLines && allLines.length > 0 ? allLines : (capData.lines || []);
    linesList.forEach(l => {
      const lid = l.name || l.id;
      lineDayHoursUsed[lid] = 0;
      lineNightHoursUsed[lid] = 0;
      lineDaySeqCount[lid] = 0;
      lineNightSeqCount[lid] = 0;
      lineWorkloads[lid] = { 
        id: lid, 
        leader: l.leader || '', 
        dayHours: 0, 
        nightHours: 0, 
        hours: 0, 
        models: 0, 
        qty: 0,
        dayQty: 0,
        nightQty: 0
      };
    });

    // Process all items for capacity & line calculations
    let grandPlan = 0;
    let grandFact = 0;
    let grandGap = 0;
    let totalReqHours = 0;
    let shortageCount = 0;
    let totalShortageQty = 0;

    let grandDayOutput = 0;
    let grandNightOutput = 0;
    let grandTotalOutput = 0;
    let grandRemainingNegative = 0;
    let grandDayHours = 0;
    let grandNightHours = 0;
    let grandStdHours = 0;
    let grandActualHours = 0;
    let grandActualHoursDay = 0;
    let grandDayAvailHours = 0;
    let grandPlanDay = 0;
    let grandNightShortage = 0;
    let grandActualHoursNight = 0;
    let grandNightAvailHours = 0;
    let grandPlanNight = 0;
    let grandFinalShortage = 0;
    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    if (!window.AppStore.simLineOverridesDay) window.AppStore.simLineOverridesDay = {};
    if (!window.AppStore.simLineOverridesNight) window.AppStore.simLineOverridesNight = {};
    if (!window.AppStore.simManualLinesDay) window.AppStore.simManualLinesDay = {};
    if (!window.AppStore.simManualLinesNight) window.AppStore.simManualLinesNight = {};
    if (!window.AppStore.simManualSeqsDay) window.AppStore.simManualSeqsDay = {};
    if (!window.AppStore.simManualSeqsNight) window.AppStore.simManualSeqsNight = {};
    if (!window.AppStore.simManualPfDay) window.AppStore.simManualPfDay = {};
    if (!window.AppStore.simManualPfNight) window.AppStore.simManualPfNight = {};
    if (!window.AppStore.simManualPlanDay) window.AppStore.simManualPlanDay = {};
    if (!window.AppStore.simManualPlanNight) window.AppStore.simManualPlanNight = {};

    const todayPlanRef = getTodayPlanReference();

    const processedRows = scheduleItems.map((it, idx) => {
      grandPlan += (it.cumPlanQty || 0);
      grandFact += (it.cumFactQty || 0);
      grandGap += (it.cumGapQty || 0);

      const capInfo = resolveModelLineCapacity(it, capData);
      const rowKey = `${it.stage}___${it.model}___${it.productName1C}`.replace(/"/g, '&quot;');
      const shortage = it.cumGapQty < 0 ? Math.abs(it.cumGapQty) : 0;

      if (it.cumGapQty < 0) {
        shortageCount++;
        totalShortageQty += shortage;
      }

      // 1. Day Shift Allocation
      const capableDayLines = capInfo.capableLines.filter(cl => workingLinesDaySet.has(cl.lineId));
      const defaultDayLine = capableDayLines[0] || capInfo.optimalLine;
      const manualDayOverride = (window.AppStore.simManualLinesDay && window.AppStore.simManualLinesDay[rowKey]);
      const selectedDayLineId = manualDayOverride ||
                                (window.AppStore.simLineOverridesDay && window.AppStore.simLineOverridesDay[rowKey]) || 
                                (window.AppStore.simLineOverrides && window.AppStore.simLineOverrides[rowKey]) || 
                                defaultDayLine.lineId;
      let chosenDayLine = capInfo.capableLines.find(l => l.lineId.toLowerCase() === (selectedDayLineId || '').toLowerCase());
      if (!chosenDayLine && selectedDayLineId && selectedDayLineId !== 'NONE') {
        chosenDayLine = { lineId: selectedDayLineId, lineName: 'Line ' + selectedDayLineId, perfPct: 100, actualCt: capInfo.norm, isAsForm: false };
      }
      if (!chosenDayLine) chosenDayLine = defaultDayLine;
      const isDayLineWorking = workingLinesDaySet.has(chosenDayLine.lineId);

      // 2. Night Shift Allocation
      const capableNightLines = capInfo.capableLines.filter(cl => workingLinesNightSet.has(cl.lineId));
      const defaultNightLine = capableNightLines[0] || (workingLinesNightSet.has(chosenDayLine.lineId) ? chosenDayLine : null);
      const manualNightOverride = (window.AppStore.simManualLinesNight && window.AppStore.simManualLinesNight[rowKey]);
      const selectedNightLineId = manualNightOverride !== undefined ? manualNightOverride : (
                                  window.AppStore.simLineOverridesNight && window.AppStore.simLineOverridesNight[rowKey] !== undefined
                                  ? window.AppStore.simLineOverridesNight[rowKey]
                                  : (defaultNightLine ? defaultNightLine.lineId : 'NONE')
                                );
      let chosenNightLine = selectedNightLineId !== 'NONE' ? capInfo.capableLines.find(l => l.lineId.toLowerCase() === (selectedNightLineId || '').toLowerCase()) : null;
      if (!chosenNightLine && selectedNightLineId && selectedNightLineId !== 'NONE') {
        chosenNightLine = { lineId: selectedNightLineId, lineName: 'Line ' + selectedNightLineId, perfPct: 100, actualCt: capInfo.norm, isAsForm: false };
      }
      if (!chosenNightLine && selectedNightLineId !== 'NONE') chosenNightLine = defaultNightLine;
      const isNightLineWorking = chosenNightLine ? workingLinesNightSet.has(chosenNightLine.lineId) : false;

      let reqHours = 0;
      let dayHours = 0;
      let dayOutput = 0;
      let nightHours = 0;
      let nightOutput = 0;
      let totalOutput = 0;
      let remainingNegative = 0;
      let cumDayLineHours = 0;
      let cumNightLineHours = 0;
      let daySeq = 0;
      let startDayLineHours = 0;
      let endDayLineHours = 0;
      let nightSeq = 0;
      let startNightLineHours = 0;
      let endNightLineHours = 0;

      if (shortage > 0) {
        const primaryCT = chosenDayLine.actualCt;
        reqHours = (shortage * primaryCT) / 3600;
        totalReqHours += reqHours;

        // 1. Day Shift capacity: Remaining quota of chosenDayLine in Day shift (Strict Max 10.83h total per line)
        if (isDayLineWorking) {
          const usedDaySoFar = lineDayHoursUsed[chosenDayLine.lineId] || 0;
          const remDayQuota = Math.max(0, 10.83 - usedDaySoFar);
          dayHours = Math.min(reqHours, remDayQuota);
          dayOutput = Math.min(shortage, Math.floor((dayHours * 3600) / primaryCT));
          startDayLineHours = usedDaySoFar;
          lineDayHoursUsed[chosenDayLine.lineId] = usedDaySoFar + dayHours;
          endDayLineHours = lineDayHoursUsed[chosenDayLine.lineId];
          cumDayLineHours = endDayLineHours;
          if (dayHours > 0) {
            lineDaySeqCount[chosenDayLine.lineId] = (lineDaySeqCount[chosenDayLine.lineId] || 0) + 1;
            daySeq = lineDaySeqCount[chosenDayLine.lineId];
          }
        }

        const remShortageAfterDay = shortage - dayOutput;

        // 2. Night Shift capacity: Remaining quota of chosenNightLine in Night shift (Strict Max 10.58h total per line)
        if (remShortageAfterDay > 0 && chosenNightLine && isNightLineWorking) {
          const usedNightSoFar = lineNightHoursUsed[chosenNightLine.lineId] || 0;
          const remNightQuota = Math.max(0, 10.58 - usedNightSoFar);
          const nightNeeded = (remShortageAfterDay * chosenNightLine.actualCt) / 3600;
          nightHours = Math.min(nightNeeded, remNightQuota);
          nightOutput = Math.min(remShortageAfterDay, Math.floor((nightHours * 3600) / chosenNightLine.actualCt));
          startNightLineHours = usedNightSoFar;
          lineNightHoursUsed[chosenNightLine.lineId] = usedNightSoFar + nightHours;
          endNightLineHours = lineNightHoursUsed[chosenNightLine.lineId];
          cumNightLineHours = endNightLineHours;
          if (nightHours > 0) {
            lineNightSeqCount[chosenNightLine.lineId] = (lineNightSeqCount[chosenNightLine.lineId] || 0) + 1;
            nightSeq = lineNightSeqCount[chosenNightLine.lineId];
          }
        }

        totalOutput = dayOutput + nightOutput;
        remainingNegative = shortage - totalOutput;

        grandDayHours += dayHours;
        grandNightHours += nightHours;
        grandDayOutput += dayOutput;
        grandNightOutput += nightOutput;
        grandTotalOutput += totalOutput;
        grandRemainingNegative += remainingNegative;

        // Accumulate workloads for each Line
        if (dayHours > 0 && lineWorkloads[chosenDayLine.lineId]) {
          lineWorkloads[chosenDayLine.lineId].dayHours += dayHours;
          lineWorkloads[chosenDayLine.lineId].hours += dayHours;
          lineWorkloads[chosenDayLine.lineId].models += 1;
          lineWorkloads[chosenDayLine.lineId].qty += dayOutput;
          lineWorkloads[chosenDayLine.lineId].dayQty += dayOutput;
        }
        if (nightHours > 0 && chosenNightLine && lineWorkloads[chosenNightLine.lineId]) {
          lineWorkloads[chosenNightLine.lineId].nightHours += nightHours;
          lineWorkloads[chosenNightLine.lineId].hours += nightHours;
          if (chosenNightLine.lineId !== chosenDayLine.lineId || dayHours === 0) {
            lineWorkloads[chosenNightLine.lineId].models += 1;
          }
          lineWorkloads[chosenNightLine.lineId].qty += nightOutput;
          lineWorkloads[chosenNightLine.lineId].nightQty += nightOutput;
        }
      }

      const norm = capInfo.norm || (typeof it.norm === 'number' && it.norm > 0 ? it.norm : 15);
      const stdHours = shortage > 0 ? (shortage * norm) / 3600 : 0;
      grandStdHours += stdHours;

      // Thông tin Chuyền và Thứ tự cho bảng 25 cột
      const manualDayLine = (window.AppStore.simManualLinesDay && window.AppStore.simManualLinesDay[rowKey]) ||
                            (window.AppStore.simLineOverridesDay && window.AppStore.simLineOverridesDay[rowKey]) ||
                            (window.AppStore.simLineOverrides && window.AppStore.simLineOverrides[rowKey]);
      let assignedDayLineId = '';
      if (manualDayLine && manualDayLine !== 'NONE') {
        assignedDayLineId = manualDayLine;
      }
      const seqDay = (window.AppStore.simManualSeqsDay && window.AppStore.simManualSeqsDay[rowKey]) || '';
      const mSeqDay = (seqDay || '').match(/\d+/);
      const seqDayNum = mSeqDay ? parseInt(mSeqDay[0], 10) : Infinity;

      let perfPctDay = null;
      let actualCtDay = norm;
      const manualPfDay = window.AppStore.simManualPfDay && window.AppStore.simManualPfDay[rowKey];
      if (manualPfDay !== undefined && !isNaN(manualPfDay) && manualPfDay > 0) {
        perfPctDay = manualPfDay;
        actualCtDay = norm / (perfPctDay / 100);
      } else if (assignedDayLineId) {
        const clDay = capInfo.capableLines.find(c => c.lineId.toLowerCase() === assignedDayLineId.toLowerCase());
        if (clDay) {
          perfPctDay = clDay.perfPct;
          actualCtDay = clDay.actualCt || (norm / (clDay.perfPct / 100));
        } else {
          perfPctDay = 100;
          actualCtDay = norm;
        }
      }
      const actualHoursDay = (shortage > 0 && (assignedDayLineId || manualPfDay !== undefined))
        ? (shortage * actualCtDay) / 3600
        : null;

      const manualPlanDay = window.AppStore.simManualPlanDay && window.AppStore.simManualPlanDay[rowKey];

      // Ca Đêm
      const manualNightLine = (window.AppStore.simManualLinesNight && window.AppStore.simManualLinesNight[rowKey]) ||
                              (window.AppStore.simLineOverridesNight && window.AppStore.simLineOverridesNight[rowKey]);
      let assignedNightLineId = '';
      if (manualNightLine && manualNightLine !== 'NONE') {
        assignedNightLineId = manualNightLine;
      }
      const seqNight = (window.AppStore.simManualSeqsNight && window.AppStore.simManualSeqsNight[rowKey]) || '';
      const mSeqNight = (seqNight || '').match(/\d+/);
      const seqNightNum = mSeqNight ? parseInt(mSeqNight[0], 10) : Infinity;

      let perfPctNight = null;
      let actualCtNight = norm;
      const manualPfNight = window.AppStore.simManualPfNight && window.AppStore.simManualPfNight[rowKey];
      if (manualPfNight !== undefined && !isNaN(manualPfNight) && manualPfNight > 0) {
        perfPctNight = manualPfNight;
        actualCtNight = norm / (perfPctNight / 100);
      } else if (assignedNightLineId) {
        const clNight = capInfo.capableLines.find(c => c.lineId.toLowerCase() === assignedNightLineId.toLowerCase());
        if (clNight) {
          perfPctNight = clNight.perfPct;
          actualCtNight = clNight.actualCt || (norm / (clNight.perfPct / 100));
        } else {
          perfPctNight = 100;
          actualCtNight = norm;
        }
      }

      const manualPlanNight = window.AppStore.simManualPlanNight && window.AppStore.simManualPlanNight[rowKey];

      const planMeta = resolvePlanDateAndShiftMeta(it, it.cumGapQty || 0, todayPlanRef, shiftFilter);
      const cumNegOriginMeta = planMeta.isCumNegative
        ? resolveAccumulatedNegativeOrigin(it, shiftFilter)
        : { originDate: '', originShift: '', label: '--', tooltip: '' };

      return {
        it,
        idx,
        capInfo,
        rowKey,
        shortage,
        planMeta,
        datePlanLabel: planMeta.datePlanLabel,
        shiftPlanLabel: planMeta.shiftPlanLabel,
        cumNegOriginMeta,
        cumNegOriginLabel: cumNegOriginMeta.label,
        norm,
        stdHours,
        assignedDayLineId,
        seqDay,
        seqDayNum,
        perfPctDay,
        actualCtDay,
        actualHoursDay,
        manualPlanDay,
        dayAvailHours: null,
        planDay: 0,
        nightShortage: 0,
        assignedNightLineId,
        seqNight,
        seqNightNum,
        perfPctNight,
        actualCtNight,
        actualHoursNight: null,
        manualPlanNight,
        nightAvailHours: null,
        planNight: 0,
        finalShortage: 0,
        shiftTextDay: (shortage > 0 || assignedDayLineId) ? 'Ca Ngày' : '',
        shiftTextNight: (shortage > 0 || assignedNightLineId) ? 'Ca Đêm' : '',
        // Legacy compatibility properties for other modules
        assignedLineId: assignedDayLineId,
        perfPct: perfPctDay,
        actualCt: actualCtDay,
        actualHours: actualHoursDay,
        shiftCode: 'DAY',
        shiftText: (shortage > 0 || assignedDayLineId) ? 'Ca Ngày' : '',
        chosenDayLine,
        isDayLineWorking,
        chosenNightLine,
        isNightLineWorking,
        reqHours,
        dayHours,
        dayOutput,
        cumDayLineHours,
        daySeq,
        startDayLineHours,
        endDayLineHours,
        nightHours,
        nightOutput,
        cumNightLineHours,
        nightSeq,
        startNightLineHours,
        endNightLineHours,
        totalOutput,
        remainingNegative
      };
    });

    // -----------------------------------------------------------------------------------------
    // QUY ĐỊNH THỜI GIAN LÀM VIỆC:
    // Line ca ngày: Tối đa 10.83h làm việc.
    // Line ca đêm: Tối đa 10.58h làm việc.
    // Khi xếp Line sản xuất -> Nếu quá thời gian tối đa -> Tự động cho thời gian về với số còn lại của Chuyền.
    // -----------------------------------------------------------------------------------------

    // 1. Phân bổ năng lực Ca Ngày theo từng Chuyền (Tối đa 10.83h)
    const lineDayGroups = {};
    processedRows.forEach(r => {
      if (r.assignedDayLineId) {
        if (!lineDayGroups[r.assignedDayLineId]) lineDayGroups[r.assignedDayLineId] = [];
        lineDayGroups[r.assignedDayLineId].push(r);
      }
    });

    Object.keys(lineDayGroups).forEach(lid => {
      const items = lineDayGroups[lid];
      // Sắp xếp thứ tự ưu tiên trên Chuyền: Thứ Tự SX (1, 2, 3...) nếu có -> theo thứ tự dòng idx
      items.sort((a, b) => {
        if (a.seqDayNum !== b.seqDayNum) return a.seqDayNum - b.seqDayNum;
        return a.idx - b.idx;
      });

      let remDayQuota = 10.83;
      items.forEach(r => {
        if (r.manualPlanDay !== undefined && !isNaN(r.manualPlanDay) && r.manualPlanDay >= 0) {
          r.planDay = r.manualPlanDay;
          r.dayAvailHours = (r.planDay * r.actualCtDay) / 3600;
          remDayQuota = Math.max(0, Math.round((remDayQuota - r.dayAvailHours) * 1000) / 1000);
        } else if (r.shortage > 0) {
          if (r.actualHoursDay > remDayQuota) {
            // Quá thời gian tối đa -> Tự động cho thời gian về với số còn lại của Chuyền
            r.dayAvailHours = remDayQuota;
            r.planDay = Math.min(r.shortage, Math.floor((r.dayAvailHours * 3600) / r.actualCtDay));
            remDayQuota = 0;
          } else {
            r.dayAvailHours = r.actualHoursDay;
            r.planDay = r.shortage;
            remDayQuota = Math.max(0, Math.round((remDayQuota - r.dayAvailHours) * 1000) / 1000);
          }
        } else {
          r.dayAvailHours = 0;
          r.planDay = 0;
        }
      });
    });

    // Các dòng không gán Chuyền Ca Ngày & Tính Kế hoạch còn thiếu Ca Đêm
    processedRows.forEach(r => {
      if (!r.assignedDayLineId) {
        if (r.manualPlanDay !== undefined && !isNaN(r.manualPlanDay) && r.manualPlanDay >= 0) {
          r.planDay = r.manualPlanDay;
          r.dayAvailHours = (r.planDay * r.actualCtDay) / 3600;
        } else {
          r.planDay = 0;
          r.dayAvailHours = null;
        }
      }
      // Cột Kế hoạch Còn Thiếu Ca Đêm mặc định bằng cột Chênh Lệch - Plan Ca ngày
      r.nightShortage = Math.max(0, r.shortage - r.planDay);
      if (r.nightShortage > 0) {
        r.actualHoursNight = (r.nightShortage * r.actualCtNight) / 3600;
      }
    });

    // 2. Phân bổ năng lực Ca Đêm theo từng Chuyền (Tối đa 10.58h)
    const lineNightGroups = {};
    processedRows.forEach(r => {
      if (r.assignedNightLineId) {
        if (!lineNightGroups[r.assignedNightLineId]) lineNightGroups[r.assignedNightLineId] = [];
        lineNightGroups[r.assignedNightLineId].push(r);
      }
    });

    Object.keys(lineNightGroups).forEach(lid => {
      const items = lineNightGroups[lid];
      // Sắp xếp thứ tự ưu tiên trên Chuyền ca đêm: Thứ Tự SX (1, 2, 3...) nếu có -> theo thứ tự dòng idx
      items.sort((a, b) => {
        if (a.seqNightNum !== b.seqNightNum) return a.seqNightNum - b.seqNightNum;
        return a.idx - b.idx;
      });

      let remNightQuota = 10.58;
      items.forEach(r => {
        if (r.manualPlanNight !== undefined && !isNaN(r.manualPlanNight) && r.manualPlanNight >= 0) {
          r.planNight = r.manualPlanNight;
          r.nightAvailHours = (r.planNight * r.actualCtNight) / 3600;
          remNightQuota = Math.max(0, Math.round((remNightQuota - r.nightAvailHours) * 1000) / 1000);
        } else if (r.nightShortage > 0) {
          if (r.actualHoursNight > remNightQuota) {
            // Quá thời gian tối đa -> Tự động cho thời gian về với số còn lại của Chuyền
            r.nightAvailHours = remNightQuota;
            r.planNight = Math.min(r.nightShortage, Math.floor((r.nightAvailHours * 3600) / r.actualCtNight));
            remNightQuota = 0;
          } else {
            r.nightAvailHours = r.actualHoursNight;
            r.planNight = r.nightShortage;
            remNightQuota = Math.max(0, Math.round((remNightQuota - r.nightAvailHours) * 1000) / 1000);
          }
        } else {
          r.nightAvailHours = 0;
          r.planNight = 0;
        }
      });
    });

    // Các dòng không gán Chuyền Ca Đêm & Tính Kế hoạch còn thiếu Tổng & Cộng dồn Grand Totals
    processedRows.forEach(r => {
      if (!r.assignedNightLineId) {
        if (r.manualPlanNight !== undefined && !isNaN(r.manualPlanNight) && r.manualPlanNight >= 0) {
          r.planNight = r.manualPlanNight;
          r.nightAvailHours = (r.planNight * r.actualCtNight) / 3600;
        } else {
          r.planNight = 0;
          r.nightAvailHours = null;
        }
      }
      // Cột Kế hoạch Còn Thiếu Tổng mặc định bằng Kế hoạch Còn thiếu ca đêm - Plan ca đêm
      r.finalShortage = Math.max(0, r.nightShortage - r.planNight);
      r.shiftTextDay = (r.shortage > 0 || r.assignedDayLineId) ? 'Ca Ngày' : '';
      r.shiftTextNight = (r.shortage > 0 || r.assignedNightLineId) ? 'Ca Đêm' : '';
      r.shiftCode = r.nightShortage > 0 ? 'BOTH' : 'DAY';
      r.shiftText = r.shiftTextDay;

      // Cộng dồn Grand Totals cho hàng 0 cố định
      if (r.actualHoursDay) {
        grandActualHoursDay += r.actualHoursDay;
        grandActualHours += r.actualHoursDay;
      }
      if (r.dayAvailHours) grandDayAvailHours += r.dayAvailHours;
      if (r.planDay) grandPlanDay += r.planDay;
      if (r.nightShortage) grandNightShortage += r.nightShortage;
      if (r.actualHoursNight) grandActualHoursNight += r.actualHoursNight;
      if (r.nightAvailHours) grandNightAvailHours += r.nightAvailHours;
      if (r.planNight) grandPlanNight += r.planNight;
      if (r.finalShortage) grandFinalShortage += r.finalShortage;
    });

    // Cache processed rows for Google Sheets export and Sequence modal
    window.AppStore.lastProcessedSimRows = processedRows;

    // Evaluate Âm luỹ kế priority gatekeeper across current Assembly scope (even if filtered)
    const isUnfilteredAsmStage = groupFilter === 'ALL' && !searchVal && (planStatusFilter === 'GAP_NEGATIVE' || planStatusFilter === 'ALL');
    let extraFullAsmCumNegItems = null;
    if (!isUnfilteredAsmStage && window.AppStore.getDetailedSchedule) {
      const fullSched = window.AppStore.getDetailedSchedule({
        fromDate: queryFromDate,
        toDate: queryToDate,
        shiftFilter: 'ALL',
        stageFilter: stageFilter === 'ALL' ? 'ALL' : stageFilter,
        modelFilter: 'ALL',
        planStatusFilter: 'GAP_NEGATIVE',
        search1C: '',
        selectedDates: window.AppStore.getActiveSelectedDates ? window.AppStore.getActiveSelectedDates(queryFromDate, queryToDate) : null
      });
      const fullUnique = new Map();
      (fullSched.items || []).forEach(it => {
        const uKey = `${(it.stage || '').trim().toUpperCase()}___${(it.productName1C || it.model || '').trim().toLowerCase()}`;
        if (!fullUnique.has(uKey)) fullUnique.set(uKey, it);
      });
      extraFullAsmCumNegItems = [];
      fullUnique.forEach(it => {
        const gap = Number(it.cumGapQty || 0);
        const mName = it.productName1C || it.model || '';
        const pm = resolvePlanDateAndShiftMeta(it, gap, todayPlanRef, 'ALL');
        if (pm.isCumNegative && gap < 0) {
          extraFullAsmCumNegItems.push({
            rowKey: `${it.stage}___${it.model}___${it.productName1C}`.replace(/"/g, '&quot;'),
            modelName: mName,
            group: it.model || '',
            gapQty: gap
          });
        }
      });
    }
    const asmGate = evaluateCumNegativeGate(
      'ASSEMBLY',
      processedRows.map(r => ({
        rowKey: r.rowKey,
        modelName: (r.it && (r.it.productName1C || r.it.model)) || '',
        group: (r.it && r.it.model) || '',
        gapQty: Number((r.it && r.it.cumGapQty) || 0),
        isCumNeg: !!(r.planMeta && r.planMeta.isCumNegative && r.it && r.it.cumGapQty < 0),
        plannedOutput: (r.planDay || 0) + (r.planNight || 0),
        hasNote: hasSimRowPlanningNote(r.rowKey, r.it && r.it.productName1C, r.it && r.it.model)
      })),
      `${stageFilter}_${queryFromDate}_${queryToDate}_${simScope}`,
      isUnfilteredAsmStage,
      extraFullAsmCumNegItems
    );

    // Mini summary table per line for Day and Night shifts (matching Image 2)
    const dayLineHoursMap = {};
    activeAssemblyLines.forEach(lid => { dayLineHoursMap[lid] = 0; });
    const nightLineHoursMap = {};
    activeAssemblyLines.forEach(lid => { nightLineHoursMap[lid] = 0; });

    processedRows.forEach(r => {
      if (r.assignedDayLineId && dayLineHoursMap[r.assignedDayLineId] !== undefined) {
        dayLineHoursMap[r.assignedDayLineId] = Math.round((dayLineHoursMap[r.assignedDayLineId] + (r.dayAvailHours || 0)) * 100) / 100;
      }
      if (r.assignedNightLineId && nightLineHoursMap[r.assignedNightLineId] !== undefined) {
        nightLineHoursMap[r.assignedNightLineId] = Math.round((nightLineHoursMap[r.assignedNightLineId] + (r.nightAvailHours || 0)) * 100) / 100;
      }
    });

    const activeDayLines = activeAssemblyLines.filter(lid => workingLinesDaySet.has(lid));
    const activeNightLines = activeAssemblyLines.filter(lid => workingLinesNightSet.has(lid));

    // Render Bảng Tổng Hợp Kế Hoạch (Chênh Lệch / Plan Ca Ngày / Plan Ca Đêm / KH còn Thiếu Tổng) - Theo yêu cầu ảnh 2
    const totalShortageQtyAbs = Math.abs(grandGap) || 1;
    const dayCoverPct = grandPlanDay > 0 ? ((grandPlanDay / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';
    const nightCoverPct = grandPlanNight > 0 ? ((grandPlanNight / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';
    const remainShortagePct = grandFinalShortage > 0 ? ((grandFinalShortage / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';

    const miniSummaryPlanTotalsHtml = `
      <div class="sim-mini-kpi-card sim-mini-plan-summary">
        <table class="sim-mini-kpi-table">
          <thead>
            <tr>
              <th class="mini-kpi-th-title" style="color: #38bdf8; font-weight: 800; padding: 0.2rem 0.5rem;" title="Bảng tổng hợp tiến độ bù thiếu và phân bổ kế hoạch">
                📊 Tổng Hợp KH
              </th>
              <th class="mini-kpi-th-line" style="color: #f87171; min-width: 80px; text-align: center;" title="Tổng sản lượng chênh lệch cần bù">Chênh Lệch</th>
              <th class="mini-kpi-th-line" style="color: #38bdf8; min-width: 82px; text-align: center;" title="Tổng sản lượng phân bổ Ca Ngày">Plan Ca Ngày</th>
              <th class="mini-kpi-th-line" style="color: #c084fc; min-width: 82px; text-align: center;" title="Tổng sản lượng phân bổ Ca Đêm">Plan Ca Đêm</th>
              <th class="mini-kpi-th-line" style="color: #f87171; min-width: 95px; text-align: center;" title="Tổng số lượng còn thiếu sau 2 ca">KH còn Thiếu Tổng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mini-kpi-label">Sản Lượng (pcs)</td>
              <td class="mini-kpi-val font-mono" style="color: #f87171; font-weight: 800;">
                ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 800;">
                ${grandPlanDay > 0 ? '+' + grandPlanDay.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 800;">
                ${grandPlanNight > 0 ? '+' + grandPlanNight.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #f87171; font-weight: 800;">
                ${grandFinalShortage > 0 ? '-' + grandFinalShortage.toLocaleString('vi-VN') : '0'}
              </td>
            </tr>
            <tr>
              <td class="mini-kpi-label">Tổng TG Máy (h)</td>
              <td class="mini-kpi-val font-mono" style="color: #fbbf24; font-weight: 700;">
                ${grandStdHours > 0 ? grandStdHours.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 700;">
                ${grandActualHoursDay > 0 ? grandActualHoursDay.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 700;">
                ${grandActualHoursNight > 0 ? grandActualHoursNight.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #94a3b8;">
                ${(grandPlanDay + grandPlanNight) > 0 ? (((grandPlanDay + grandPlanNight) / totalShortageQtyAbs) * 100).toFixed(1) + '%' : '0%'}
              </td>
            </tr>
            <tr>
              <td class="mini-kpi-label">Hiệu Quả Bù</td>
              <td class="mini-kpi-val font-mono" style="color: #94a3b8;">100%</td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 800;">
                ${dayCoverPct}%
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 800;">
                ${nightCoverPct}%
              </td>
              <td class="mini-kpi-val font-mono" style="${grandFinalShortage === 0 ? 'color: #34d399; font-weight: 800;' : 'color: #f87171; font-weight: 800;'}">
                ${grandFinalShortage === 0 ? '✅ Hết thiếu' : '⚠️ Thiếu ' + remainShortagePct + '%'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Render Ca Ngày Mini Table (Image 2 - Table 1)
    let miniSummaryDayHtml = '';
    if (activeDayLines.length === 0) {
      miniSummaryDayHtml = `
        <div class="sim-mini-kpi-card sim-mini-day">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca ngày</th>
                <th style="color: #64748b; font-size: 0.68rem; font-weight: normal; padding: 0.18rem 0.45rem;">(Chưa chọn Line)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="mini-kpi-label">Tổng TG có</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Tổng TG có KH</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Hiệu Suất</td><td class="mini-kpi-val">-</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      miniSummaryDayHtml = `
        <div class="sim-mini-kpi-card sim-mini-day">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca ngày</th>
                ${activeDayLines.map(lid => `<th class="mini-kpi-th-line">${lid}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mini-kpi-label">Tổng TG có</td>
                ${activeDayLines.map(() => `<td class="mini-kpi-val font-mono">10.83</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Tổng TG có KH</td>
                ${activeDayLines.map(lid => {
                  const h = dayLineHoursMap[lid] || 0;
                  return `<td class="mini-kpi-val font-mono" style="${h > 0 ? 'color: #38bdf8; font-weight: 700;' : 'color: #64748b;'}">${h > 0 ? h.toFixed(2) : ''}</td>`;
                }).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Hiệu Suất</td>
                ${activeDayLines.map(lid => {
                  const h = dayLineHoursMap[lid] || 0;
                  const pct = h > 0 ? ((h / 10.83) * 100).toFixed(2) : null;
                  return `<td class="mini-kpi-val font-mono" style="${pct ? 'color: #34d399; font-weight: 800;' : 'color: #64748b;'}">${pct ? pct + '%' : ''}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Render Ca Đêm Mini Table (Image 2 - Table 2)
    let miniSummaryNightHtml = '';
    if (activeNightLines.length === 0) {
      miniSummaryNightHtml = `
        <div class="sim-mini-kpi-card sim-mini-night">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca đêm</th>
                <th style="color: #64748b; font-size: 0.68rem; font-weight: normal; padding: 0.18rem 0.45rem;">(Chưa chọn Line)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="mini-kpi-label">Tổng TG có</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Tổng TG có KH</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Hiệu Suất</td><td class="mini-kpi-val">-</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      miniSummaryNightHtml = `
        <div class="sim-mini-kpi-card sim-mini-night">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca đêm</th>
                ${activeNightLines.map(lid => `<th class="mini-kpi-th-line">${lid}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mini-kpi-label">Tổng TG có</td>
                ${activeNightLines.map(() => `<td class="mini-kpi-val font-mono">10.58</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Tổng TG có KH</td>
                ${activeNightLines.map(lid => {
                  const h = nightLineHoursMap[lid] || 0;
                  return `<td class="mini-kpi-val font-mono" style="${h > 0 ? 'color: #c084fc; font-weight: 700;' : 'color: #64748b;'}">${h > 0 ? h.toFixed(2) : ''}</td>`;
                }).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Hiệu Suất</td>
                ${activeNightLines.map(lid => {
                  const h = nightLineHoursMap[lid] || 0;
                  const pct = h > 0 ? ((h / 10.58) * 100).toFixed(2) : null;
                  return `<td class="mini-kpi-val font-mono" style="${pct ? 'color: #34d399; font-weight: 800;' : 'color: #64748b;'}">${pct ? pct + '%' : ''}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Read history count
    let simHistoryCount = 0;
    try {
      const hList = JSON.parse(localStorage.getItem('AJAX_SIM_PLAN_HISTORY') || '[]');
      simHistoryCount = Array.isArray(hList) ? hList.length : 0;
    } catch (e) {
      simHistoryCount = 0;
    }

    // Feasibility & Summary Calculations
    const dayHoursCap = workingLinesDaySet.size * 10.83;
    const nightHoursCap = workingLinesNightSet.size * 10.58;
    const totalDailyCapHours = dayHoursCap + nightHoursCap;

    const totalScheduledHours = Object.values(lineWorkloads).reduce((sum, w) => sum + w.hours, 0);
    const linesRunningCount = Object.values(lineWorkloads).filter(w => w.hours > 0).length;

    // Time difference (Available - Required)
    const timeDiff = totalDailyCapHours - totalReqHours;
    const isDeficit = timeDiff < 0;
    const deficitHours = Math.abs(timeDiff);

    // Number of additional lines needed
    const addLinesFullDay = isDeficit ? Math.ceil(deficitHours / 21.41) : 0;
    const addLinesNight = isDeficit ? Math.ceil(deficitHours / 10.58) : 0;
    const addLinesDay = isDeficit ? Math.ceil(deficitHours / 10.83) : 0;
    const daysNeeded = totalDailyCapHours > 0 ? (totalReqHours / totalDailyCapHours).toFixed(1) : '∞';

    let unsupportedModelsCount = 0;
    const missingLinesNeeded = new Set();
    const lineNeedCounts = {};

    processedRows.forEach(r => {
      if (r.it.cumGapQty < 0) {
        const hasWorkingLine = r.capInfo.capableLines.some(cl => allWorkingLinesSet.has(cl.lineId));
        if (!hasWorkingLine) {
          unsupportedModelsCount++;
          missingLinesNeeded.add(r.capInfo.optimalLine.lineId);
        }
        r.capInfo.capableLines.forEach(cl => {
          lineNeedCounts[cl.lineId] = (lineNeedCounts[cl.lineId] || 0) + 1;
        });
      }
    });

    // Targeted inactive lines prioritized by how many shortage models they support
    const candidateLinesToOpen = activeAssemblyLines
      .filter(l => !workingLinesDaySet.has(l) || !workingLinesNightSet.has(l))
      .sort((a, b) => (lineNeedCounts[b] || 0) - (lineNeedCounts[a] || 0));

    let recTitle = '';
    let recBody = '';
    let recBadge = '';

    // Executive GAP -> Output -> Còn Âm Triple Block
    const gapOutputTripleBlockHtml = `
      <div class="sim-gap-output-row">
        <div class="sim-gap-box gap-neg">
          <span class="sim-kpi-sublabel">📉 TỔNG GAP THIẾU HỤT</span>
          <span class="sim-kpi-mainval font-mono" style="color: #f87171;">-${totalShortageQty.toLocaleString('vi-VN')} pcs</span>
          <span class="sim-kpi-desc">Tổng giờ máy cần: <strong>${totalReqHours.toFixed(1)}h</strong></span>
        </div>
        <div class="sim-gap-arrow">➔</div>
        <div class="sim-gap-box gap-out">
          <span class="sim-kpi-sublabel">🏭 TỔNG OUTPUT CÁC LINE ĐỀ XUẤT</span>
          <span class="sim-kpi-mainval font-mono" style="color: #34d399;">+${grandTotalOutput.toLocaleString('vi-VN')} pcs</span>
          <span class="sim-kpi-desc">Ca Ngày: <strong>+${grandDayOutput.toLocaleString('vi-VN')}</strong> • Ca Đêm: <strong>+${grandNightOutput.toLocaleString('vi-VN')}</strong></span>
        </div>
        <div class="sim-gap-arrow">➔</div>
        <div class="sim-gap-box gap-remain">
          <span class="sim-kpi-sublabel">⚠️ TỔNG CÒN ÂM (CHƯA BỔ SUNG LINE)</span>
          <span class="sim-kpi-mainval font-mono" style="color: ${grandRemainingNegative > 0 ? '#f87171' : '#34d399'};">
            ${grandRemainingNegative > 0 ? '-' + grandRemainingNegative.toLocaleString('vi-VN') + ' pcs' : '✅ 0 pcs (ĐÃ BÙ ĐỦ 100%)'}
          </span>
          <span class="sim-kpi-desc">${grandRemainingNegative > 0 ? `Thiếu ${deficitHours.toFixed(1)}h máy ➔ Cần mở thêm Line` : 'Đã đủ công suất hoàn thành 100% trong ngày'}</span>
        </div>
      </div>
    `;

    const allDayLinesUnderLimit = Array.from(workingLinesDaySet).every(lid => {
      const w = lineWorkloads[lid] || { dayHours: 0 };
      return (w.dayHours || 0) <= 10.83 + 0.05;
    });
    const allNightLinesUnderLimit = Array.from(workingLinesNightSet).every(lid => {
      const w = lineWorkloads[lid] || { nightHours: 0 };
      return (w.nightHours || 0) <= 10.58 + 0.05;
    });

    const dayQuotaPillsHtml = Array.from(workingLinesDaySet).map(lid => {
      const w = lineWorkloads[lid] || { dayHours: 0 };
      const h = w.dayHours || 0;
      const isOk = h <= 10.83 + 0.05;
      return `
        <div class="sim-shift-quota-pill ${isOk ? 'is-valid' : 'is-over'}" title="Line ${lid} ca ngày: ${h.toFixed(1)}h / 10.83h định mức">
          <span class="quota-line-name">Line ${lid}</span>
          <span class="quota-line-hours font-mono">${h.toFixed(1)}h / 10.83h</span>
          <span class="quota-line-badge">${isOk ? '✅ ≤ 10.83h' : '❌ Vượt ca'}</span>
        </div>
      `;
    }).join('') || '<span style="font-size:0.7rem; color:#64748b;">(Chưa chọn Line ngày)</span>';

    const nightQuotaPillsHtml = Array.from(workingLinesNightSet).map(lid => {
      const w = lineWorkloads[lid] || { nightHours: 0 };
      const h = w.nightHours || 0;
      const isOk = h <= 10.58 + 0.05;
      return `
        <div class="sim-shift-quota-pill ${isOk ? 'is-valid' : 'is-over'}" title="Line ${lid} ca đêm: ${h.toFixed(1)}h / 10.58h định mức">
          <span class="quota-line-name" style="color: #e2e8f0;">Line ${lid}</span>
          <span class="quota-line-hours font-mono" style="color: #c084fc;">${h.toFixed(1)}h / 10.58h</span>
          <span class="quota-line-badge">${isOk ? '✅ ≤ 10.58h' : '❌ Vượt ca'}</span>
        </div>
      `;
    }).join('') || '<span style="font-size:0.7rem; color:#64748b;">(Chưa chọn Line đêm)</span>';

    const quotaMonitorWidgetHtml = `
      <div class="sim-quota-monitor-container">
        <div class="sim-quota-monitor-header">
          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <span>🛡️ BẢNG GIÁM SÁT ĐỊNH MỨC CA (CA NGÀY ≤ 10.83H • CA ĐÊM ≤ 10.58H)</span>
          </div>
          <span style="font-size: 0.72rem; color: ${allDayLinesUnderLimit && allNightLinesUnderLimit ? '#34d399' : '#f87171'}; font-weight: 800;">
            ${allDayLinesUnderLimit && allNightLinesUnderLimit ? '✅ 100% Chuyền đi làm đều đạt chuẩn (Không vượt định mức ca)' : '⚠️ Cảnh báo có Chuyền vượt quá định mức ca'}
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; font-weight: 800; color: #fbbf24; min-width: 120px;">☀️ Ca Ngày (≤10.83h):</span>
            <div class="sim-quota-pills-row">
              ${dayQuotaPillsHtml}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; font-weight: 800; color: #c084fc; min-width: 120px;">🌙 Ca Đêm (≤10.58h):</span>
            <div class="sim-quota-pills-row">
              ${nightQuotaPillsHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    const scheduledSummaryHtml = `
      <div style="margin-top: 0.45rem; padding-top: 0.4rem; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 0.775rem; color: #cbd5e1;">
        📊 <strong>Sau khi sắp xếp:</strong> Toàn bộ <strong>${linesRunningCount} Line</strong> chạy hết tổng cộng <strong style="color: #fbbf24; font-family: var(--font-mono);">${totalScheduledHours.toFixed(1)} giờ máy</strong> (Ca Ngày: <strong style="color: #fbbf24;">${grandDayHours.toFixed(1)}h</strong> / ${dayHoursCap.toFixed(1)}h | Ca Đêm: <strong style="color: #c084fc;">${grandNightHours.toFixed(1)}h</strong> / ${nightHoursCap.toFixed(1)}h).
        <div style="margin-top: 0.25rem; font-weight: 700; color: ${allDayLinesUnderLimit && allNightLinesUnderLimit ? '#34d399' : '#f87171'};">
          ${allDayLinesUnderLimit && allNightLinesUnderLimit 
            ? '🛡️ Kiểm soát định mức: 100% Chuyền Ca Ngày đều làm việc ≤ 10.83h và Ca Đêm ≤ 10.58h (Đạt chuẩn công suất định mức).' 
            : '⚠️ Có Chuyền đang chạy vượt quá định mức ca!'}
        </div>
      </div>
    `;

    if (totalDailyCapHours === 0) {
      recBadge = `<span class="badge badge-red" style="font-weight: 800; font-size: 0.75rem;">⚠️ CHƯA CHỌN LINE ĐI LÀM</span>`;
      recTitle = `Vui lòng kích hoạt Line sản xuất đi làm`;
      recBody = `Hiện tại chưa có Chuyền nào được chọn đi làm vào ca Ngày hoặc ca Đêm. Vui lòng bấm chọn các Line bên trên để hệ thống tự động tính toán năng lực và số Chuyền cần bổ sung.`;
    } else if (!isDeficit) {
      const loadPct = Math.round((totalReqHours / totalDailyCapHours) * 100);
      recBadge = `<span class="badge badge-green" style="font-weight: 800; font-size: 0.75rem;">✅ ĐỦ CÔNG SUẤT TRONG NGÀY (DƯ +${timeDiff.toFixed(1)}H MÁY • ${loadPct}% TẢI)</span>`;
      recTitle = `Khả thi hoàn thành 100% trong ngày ${simTargetDate}`;
      recBody = `Tổng năng lực của <strong>${workingLinesDaySet.size} Line Ngày</strong> (${dayHoursCap.toFixed(1)}h) và <strong>${workingLinesNightSet.size} Line Đêm</strong> (${nightHoursCap.toFixed(1)}h) đạt <strong>${totalDailyCapHours.toFixed(1)} giờ máy/ngày</strong>, thặng dư <strong>+${timeDiff.toFixed(1)}h</strong> so với nhu cầu <strong>${totalReqHours.toFixed(1)}h</strong> (bù ${totalShortageQty.toLocaleString('vi-VN')} pcs). <br>👉 <strong>Đề xuất:</strong> <em>Không cần mở thêm Line</em>. Duy trì các Line đang chạy và bấm <em>"⚡ Đề Xuất Line Tối Ưu"</em> để tự động gán Model theo đúng Line đi làm tốt nhất.${scheduledSummaryHtml}`;
    } else {
      recBadge = `<span class="badge badge-red" style="font-weight: 800; font-size: 0.75rem;">⚠️ THIẾU ${deficitHours.toFixed(1)}H MÁY ➔ ĐỀ XUẤT THÊM +${addLinesFullDay} LINE (CẢ NGÀY) HOẶC +${addLinesNight} LINE (CA ĐÊM)</span>`;
      recTitle = `Nhu cầu sản xuất (${totalReqHours.toFixed(1)}h) vượt quá công suất hiện có (${totalDailyCapHours.toFixed(1)}h)`;
      recBody = `Tổng giờ máy cần để bù thiếu (<strong>${totalShortageQty.toLocaleString('vi-VN')} pcs</strong>) là <strong>${totalReqHours.toFixed(1)}h</strong> (~${(totalReqHours/10.83).toFixed(1)} ca), trong khi công suất hiện tại là <strong>${totalDailyCapHours.toFixed(1)}h</strong> ➔ <strong>Thiếu hụt ${deficitHours.toFixed(1)} giờ máy</strong>. <br>
      👉 <strong>Đề xuất số Line cần bổ sung để làm đủ kế hoạch ngay trong ngày:</strong>${scheduledSummaryHtml}`;
    }

    let targetedLineAdvice = '';
    if (isDeficit && candidateLinesToOpen.length > 0) {
      const topSuggestedLines = candidateLinesToOpen.slice(0, 3).map(lid => {
        const isCritical = missingLinesNeeded.has(lid);
        return `<strong style="color: ${isCritical ? '#f87171' : '#38bdf8'}; font-size: 0.8rem;">Line ${lid}</strong> (${lineNeedCounts[lid] || 0} Model${isCritical ? ' - <span style="color:#f87171;">Bắt buộc có</span>' : ''})`;
      }).join(', ');
      targetedLineAdvice = `
        <div style="margin-top: 0.5rem; padding-top: 0.45rem; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 0.775rem; color: #cbd5e1;">
          🎯 <strong>Gợi ý Chuyền ưu tiên mở thêm:</strong> ${topSuggestedLines}.
        </div>
      `;
    }

    if (unsupportedModelsCount > 0) {
      targetedLineAdvice += `
        <div style="margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px dashed rgba(239,68,68,0.4); color: #f87171; font-weight: 700; font-size: 0.75rem;">
          ⚠️ Lưu ý: Phát hiện <strong>${unsupportedModelsCount} Model</strong> thiếu hụt chưa có Line đi làm phù hợp hôm nay (Model cần: ${Array.from(missingLinesNeeded).map(l => 'Line ' + l).join(', ')}). Khuyến nghị mở thêm các Chuyền này!
        </div>
      `;
    }

    // Hiển thị tất cả model theo yêu cầu người dùng (không phân trang)
    const pagedRows = processedRows;

    // Active lines with assigned shortage models
    const activeLinesCount = Object.values(lineWorkloads).filter(w => w.models > 0).length;

    // Render Table Rows (Theo format 25 cột chuẩn Bảng 2 theo ảnh)
    const tableRowsHtml = pagedRows.map((r) => {
      const {
        it,
        idx,
        capInfo,
        rowKey,
        shortage,
        planMeta,
        cumNegOriginMeta,
        norm,
        stdHours,
        assignedDayLineId,
        seqDay,
        perfPctDay,
        actualHoursDay,
        dayAvailHours,
        planDay,
        nightShortage,
        assignedNightLineId,
        seqNight,
        perfPctNight,
        actualHoursNight,
        nightAvailHours,
        planNight,
        finalShortage
      } = r;

      const gapColor = it.cumGapQty < 0 ? 'color: var(--danger);' : it.cumGapQty > 0 ? 'color: var(--success);' : 'color: var(--text-muted);';
      const encodedRowKey = encodeSimRowKey(rowKey);
      const isAsmRowCumNeg = !!(planMeta && planMeta.isCumNegative && (it.cumGapQty || 0) < 0);
      const isAsmRowLocked = !!(asmGate && asmGate.isBlocked && !isAsmRowCumNeg);
      const asmLockAttr = isAsmRowLocked ? 'disabled' : '';
      const asmLockClass = isAsmRowLocked ? ' sim-input-locked' : '';
      const asmLockTitleSuffix = isAsmRowLocked
        ? ' [Đang khóa: Cần nhập Kế hoạch (>0) hoặc Lý do ở cột Ghi Chú cho các Model Âm luỹ kế trước]'
        : '';

      // Dropdown options for Line SX (chỉ để tên Line)
      const allSelectableLines = [
        ...capInfo.capableLines.map(cl => cl.lineId),
        ...activeAssemblyLines.filter(lid => !capInfo.capableLines.some(cl => cl.lineId === lid))
      ];
      const uniqueLineOptions = Array.from(new Set(allSelectableLines));

      // Line dropdown for Day Shift
      const lineSelectDayHtml = `
        <select class="sim-table-line-select${asmLockClass} font-mono" ${asmLockAttr} onchange="handleTableLineDayChange(decodeURIComponent('${encodedRowKey}'), this.value)" style="padding: 0.15rem 0.25rem; font-size: 0.775rem; font-weight: 800; color: ${assignedDayLineId ? '#38bdf8' : '#64748b'}; background: rgba(15, 23, 42, 0.9); border: 1px solid ${assignedDayLineId ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 6px; outline: none; cursor: pointer; text-align: center; min-width: 58px;" title="${isAsmRowLocked ? '🔒' + asmLockTitleSuffix : 'Chọn Line SX Ca Ngày'}">
          <option value="" ${!assignedDayLineId ? 'selected' : ''}>--</option>
          ${uniqueLineOptions.map(lid => {
            return `<option value="${lid}" ${assignedDayLineId === lid ? 'selected' : ''}>${lid}</option>`;
          }).join('')}
        </select>
      `;

      // Line dropdown for Night Shift
      const lineSelectNightHtml = `
        <select class="sim-table-line-select${asmLockClass} font-mono" ${asmLockAttr} onchange="handleTableLineNightChange(decodeURIComponent('${encodedRowKey}'), this.value)" style="padding: 0.15rem 0.25rem; font-size: 0.775rem; font-weight: 800; color: ${assignedNightLineId ? '#c084fc' : '#64748b'}; background: rgba(15, 23, 42, 0.9); border: 1px solid ${assignedNightLineId ? 'rgba(192, 132, 252, 0.5)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 6px; outline: none; cursor: pointer; text-align: center; min-width: 58px;" title="${isAsmRowLocked ? '🔒' + asmLockTitleSuffix : 'Chọn Line SX Ca Đêm'}">
          <option value="" ${!assignedNightLineId ? 'selected' : ''}>--</option>
          ${uniqueLineOptions.map(lid => {
            return `<option value="${lid}" ${assignedNightLineId === lid ? 'selected' : ''}>${lid}</option>`;
          }).join('')}
        </select>
      `;

      const shiftDayText = (shortage > 0 || assignedDayLineId) ? 'Ca Ngày' : '';
      const shiftNightText = 'Ca Đêm';

      return `
        <tr class="hover-row${isAsmRowCumNeg ? ' sim-row-cumneg-priority' : ''}${isAsmRowLocked ? ' sim-row-locked-current-day' : ''}" data-row-key="${encodedRowKey}" data-is-cumneg="${isAsmRowCumNeg ? '1' : '0'}" data-row-locked="${isAsmRowLocked ? '1' : '0'}">
          <td class="sticky-sim-stt" style="color: var(--text-muted); font-size: 0.8rem; text-align: center;">${idx + 1}</td>
          <td class="sticky-sim-stage" style="text-align: center; white-space: nowrap; font-size: 0.8rem; font-weight: 700; color: #f8fafc;">
            ${it.stage || 'ASSEMBLY'}
          </td>
          <td class="sticky-sim-group" style="white-space: nowrap; font-size: 0.825rem; font-weight: 700; color: #f8fafc;">
            ${it.model || '--'}
          </td>
          <td class="sticky-sim-model">
            <div style="font-family: Arial, sans-serif; font-size: 0.825rem; font-weight: 600; color: #f1f5f9; word-break: break-word; line-height: 1.35;">
              ${it.productName1C}
            </div>
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${(it.cumPlanQty || 0).toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #34d399; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${(it.cumFactQty || 0).toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; font-size: 0.825rem; padding: 0.35rem 0.45rem; ${gapColor}">
            ${it.cumGapQty !== 0 ? (it.cumGapQty > 0 ? '+' : '') + it.cumGapQty.toLocaleString('vi-VN') : '0'}
          </td>
          ${renderPlanDateAndShiftCellsHtml(planMeta || resolvePlanDateAndShiftMeta(it, it.cumGapQty || 0, todayPlanRef, shiftFilter))}
          <td class="font-mono" style="text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.825rem; padding: 0.35rem 0.35rem;">
            ${norm}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${stdHours > 0 ? stdHours.toFixed(2) : (shortage > 0 ? '0.00' : '')}
          </td>
          <!-- CỤM CA NGÀY -->
          <td style="text-align: center; font-size: 0.8rem; font-weight: 600; color: #cbd5e1; white-space: nowrap; padding: 0.35rem 0.25rem;">
            ${shiftDayText}
          </td>
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            ${lineSelectDayHtml}
          </td>
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-seq-input${asmLockClass} font-mono" ${asmLockAttr} value="${seqDay || ''}" placeholder="--" onchange="handleTableSeqDayChange(decodeURIComponent('${encodedRowKey}'), this.value)" style="width: 44px; padding: 0.15rem 0.2rem; font-size: 0.775rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập thứ tự sản xuất trên Line ca Ngày${asmLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
              <input type="text" class="sim-table-pf-input${asmLockClass} font-mono" ${asmLockAttr} value="${perfPctDay !== null && perfPctDay !== undefined && (assignedDayLineId || (window.AppStore.simManualPfDay && window.AppStore.simManualPfDay[rowKey])) ? perfPctDay : ''}" placeholder="${assignedDayLineId ? '100' : '--'}" onchange="handleTablePfDayChange(decodeURIComponent('${encodedRowKey}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 44px; padding: 0.15rem 0.15rem; font-size: 0.775rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập PF% Ca Ngày (mặc định 100%)${asmLockTitleSuffix}">%
            </div>
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #38bdf8; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${actualHoursDay !== null && actualHoursDay > 0 ? actualHoursDay.toFixed(3) : ''}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${dayAvailHours !== null && dayAvailHours > 0 ? dayAvailHours.toFixed(2) : (assignedDayLineId && shortage > 0 ? '0.00' : '')}
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input${asmLockClass} font-mono" ${asmLockAttr} value="${planDay > 0 ? planDay.toLocaleString('vi-VN') : (shortage > 0 && assignedDayLineId ? '0' : '')}" placeholder="0" onchange="handleTablePlanDayChange(decodeURIComponent('${encodedRowKey}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 68px; padding: 0.15rem 0.3rem; font-size: 0.8rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: right;" title="Nhập Plan sản xuất Ca Ngày${asmLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #f87171; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${nightShortage > 0 ? '-' + nightShortage.toLocaleString('vi-VN') : ''}
          </td>
          <!-- CỤM CA ĐÊM -->
          <td style="text-align: center; font-size: 0.8rem; font-weight: 600; color: #c084fc; white-space: nowrap; padding: 0.35rem 0.25rem;">
            ${shiftNightText}
          </td>
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            ${lineSelectNightHtml}
          </td>
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-seq-input${asmLockClass} font-mono" ${asmLockAttr} value="${seqNight || ''}" placeholder="--" onchange="handleTableSeqNightChange(decodeURIComponent('${encodedRowKey}'), this.value)" style="width: 44px; padding: 0.15rem 0.2rem; font-size: 0.775rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập thứ tự sản xuất trên Line ca Đêm${asmLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
              <input type="text" class="sim-table-pf-input${asmLockClass} font-mono" ${asmLockAttr} value="${perfPctNight !== null && perfPctNight !== undefined && (assignedNightLineId || (window.AppStore.simManualPfNight && window.AppStore.simManualPfNight[rowKey])) ? perfPctNight : ''}" placeholder="${assignedNightLineId ? '100' : '--'}" onchange="handleTablePfNightChange(decodeURIComponent('${encodedRowKey}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 44px; padding: 0.15rem 0.15rem; font-size: 0.775rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập PF% Ca Đêm (mặc định 100%)${asmLockTitleSuffix}">%
            </div>
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #c084fc; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${actualHoursNight !== null && actualHoursNight > 0 ? actualHoursNight.toFixed(3) : ''}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${nightAvailHours !== null && nightAvailHours > 0 ? nightAvailHours.toFixed(2) : (assignedNightLineId && nightShortage > 0 ? '0.00' : '')}
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input${asmLockClass} font-mono" ${asmLockAttr} value="${planNight > 0 ? planNight.toLocaleString('vi-VN') : (nightShortage > 0 && assignedNightLineId ? '0' : '')}" placeholder="0" onchange="handleTablePlanNightChange(decodeURIComponent('${encodedRowKey}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 68px; padding: 0.15rem 0.3rem; font-size: 0.8rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: right;" title="Nhập Plan sản xuất Ca Đêm${asmLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #f87171; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${finalShortage > 0 ? '-' + finalShortage.toLocaleString('vi-VN') : ''}
          </td>
          <td style="text-align: left; padding: 0.2rem 0.35rem; min-width: 140px;">
            <input type="text" class="sim-table-note-input" data-row-key="${encodedRowKey}" value="${(window.AppStore.simManualNotes && window.AppStore.simManualNotes[rowKey]) ? String(window.AppStore.simManualNotes[rowKey]).replace(/"/g, '&quot;') : ''}" placeholder="${isAsmRowCumNeg ? 'Nhập lý do / ghi chú...' : 'Nhập ghi chú...'}" onchange="handleTableNoteChange(decodeURIComponent('${encodedRowKey}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" title="Ghi chú cho Model ${(it.productName1C || it.model || '').replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ')}">
          </td>
          ${renderAccumulatedNegativeOriginCellHtml(cumNegOriginMeta)}
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.35rem;">
            <button type="button"
              class="btn btn-xs"
              onclick="handleCheckModelWip('${encodeSimRowKey(it.stage || 'ASSEMBLY')}', '${encodeSimRowKey(it.model || '')}', '${encodeSimRowKey(it.productName1C || it.model || '')}', ${Number(it.cumGapQty || 0)}, '${queryFromDate}', '${queryToDate}')"
              style="padding: 0.2rem 0.55rem; font-size: 0.725rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;"
              title="Mở WIP Control và lọc đúng Model ${(it.productName1C || it.model || '').replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ')} (${it.stage || 'ASSEMBLY'})">
              <span>📦 Check WIP</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bỏ nội dung thanh phân trang theo ảnh số 2, hiển thị tất cả các dòng
    const paginationHtml = '';

    const workloadViewMode = window.AppStore.simWorkloadViewMode || 'TABLE';
    if (window.AppStore.simWorkloadCollapsed === undefined) {
      try {
        window.AppStore.simWorkloadCollapsed = (localStorage.getItem('AJAX_SIM_WORKLOAD_COLLAPSED') === 'true');
      } catch (e) {
        window.AppStore.simWorkloadCollapsed = false;
      }
    }
    const isWorkloadCollapsed = !!window.AppStore.simWorkloadCollapsed;

    // 1. Line Workload Summary Table Rows HTML
    const workloadTableRowsHtml = linesList.map(l => {
      const lid = l.name || l.id;
      const w = lineWorkloads[lid] || { hours: 0, models: 0, qty: 0, dayHours: 0, nightHours: 0 };
      const hours = w.hours;
      const dayH = w.dayHours || 0;
      const nightH = w.nightHours || 0;
      const isLidDay = workingLinesDaySet.has(lid);
      const isLidNight = workingLinesNightSet.has(lid);
      const isLidWorking = isLidDay || isLidNight;
      
      const capHours = (isLidDay ? 10.83 : 0) + (isLidNight ? 10.58 : 0);
      const utilPct = capHours > 0 ? Math.round((hours / capHours) * 100) : (hours > 0 ? 999 : 0);
      const diffHours = parseFloat((capHours - hours).toFixed(1));

      const isOverloaded = (capHours === 0 && hours > 0) || (capHours > 0 && hours > capHours + 0.5) || (isLidDay && dayH > 10.83 + 0.05) || (isLidNight && nightH > 10.58 + 0.05);
      const isBusy = capHours > 0 && hours >= capHours * 0.85 && !isOverloaded;
      const isOk = capHours > 0 && hours > 0 && hours < capHours * 0.85 && !isOverloaded;
      const isEmpty = hours === 0;

      const shiftText = isLidWorking
        ? (isLidDay && isLidNight ? '<span style="color:#38bdf8; font-weight:800;">☀️🌙 Cả ngày</span>' : isLidDay ? '<span style="color:#fbbf24; font-weight:800;">☀️ Ca ngày</span>' : '<span style="color:#c084fc; font-weight:800;">🌙 Ca đêm</span>')
        : '<span style="color:#64748b;">⏸️ Nghỉ</span>';

      const progClass = isOverloaded ? 'prog-over' : isBusy ? 'prog-busy' : 'prog-ok';
      const progWidth = Math.min(100, Math.max(0, utilPct));

      let quotaAuditBadge = '';
      if (!isLidWorking && hours > 0) {
        quotaAuditBadge = '<span class="badge badge-red" style="font-size:0.7rem; font-weight:800;">⚠️ Line nghỉ có việc</span>';
      } else if (!isLidWorking) {
        quotaAuditBadge = '<span class="badge" style="background:rgba(255,255,255,0.05); color:#64748b; font-size:0.7rem;">⏸️ Nghỉ (0h)</span>';
      } else if (isEmpty) {
        quotaAuditBadge = '<span class="badge" style="background:rgba(255,255,255,0.06); color:#94a3b8; font-size:0.7rem;">⚪ Trống chuyền</span>';
      } else if (isOverloaded) {
        quotaAuditBadge = `<span class="badge badge-red" style="font-size:0.7rem; font-weight:800;">🔴 Vượt định mức ca</span>`;
      } else {
        quotaAuditBadge = `<span class="badge badge-green" style="font-size:0.7rem; font-weight:800;">✅ ≤ Định mức ca</span>`;
      }

      return `
        <tr>
          <td style="font-weight: 900; color: #f8fafc; font-size: 0.85rem;">
            Line ${lid}
          </td>
          <td style="color: #94a3b8; font-size: 0.75rem;">
            ${l.leader ? 'Tổ: ' + l.leader : 'Assembly'}
          </td>
          <td>
            ${shiftText}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #38bdf8;">
            ${capHours > 0 ? capHours.toFixed(2) + 'h' : '0.00h'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${dayH > 10.83 + 0.05 ? '#f87171' : dayH > 0 ? '#fbbf24' : '#64748b'};">
            ${isLidDay ? `${dayH.toFixed(1)}h <span style="font-size:0.68rem; color:#94a3b8;">/ 10.83h</span>` : '<span style="color:#64748b;">--</span>'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${nightH > 10.58 + 0.05 ? '#f87171' : nightH > 0 ? '#c084fc' : '#64748b'};">
            ${isLidNight ? `${nightH.toFixed(1)}h <span style="font-size:0.68rem; color:#94a3b8;">/ 10.58h</span>` : '<span style="color:#64748b;">--</span>'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 900; font-size: 0.9rem; color: ${hours > 0 ? (isOverloaded ? '#f87171' : '#34d399') : '#64748b'};">
            ${hours.toFixed(1)}h
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="sim-prog-bar-container">
                <div class="sim-prog-bar-fill ${progClass}" style="width: ${progWidth}%;"></div>
              </div>
              <span class="font-mono" style="font-size: 0.75rem; font-weight: 800; color: ${isOverloaded ? '#f87171' : isBusy ? '#34d399' : '#cbd5e1'}; min-width: 38px;">
                ${capHours > 0 ? utilPct + '%' : (hours > 0 ? '>100%' : '0%')}
              </span>
            </div>
          </td>
          <td class="font-mono" style="text-align: center; color: #cbd5e1;">
            ${w.models}
          </td>
          <td class="font-mono" style="text-align: right; color: #94a3b8;">
            ${w.qty.toLocaleString('vi-VN')}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${capHours === 0 && hours === 0 ? '#64748b' : diffHours > 0 ? '#34d399' : diffHours < 0 ? '#f87171' : '#cbd5e1'};">
            ${capHours === 0 && hours === 0 ? '0.0h' : diffHours > 0 ? '+' + diffHours.toFixed(1) + 'h' : diffHours.toFixed(1) + 'h'}
          </td>
          <td style="text-align: center;">
            ${quotaAuditBadge}
          </td>
        </tr>
      `;
    }).join('');

    // 2. Line Workload Cards HTML
    const workloadCardsHtml = linesList.map(l => {
      const lid = l.name || l.id;
      const w = lineWorkloads[lid] || { hours: 0, models: 0, qty: 0, dayHours: 0, nightHours: 0 };
      const hours = w.hours;
      const dayH = w.dayHours || 0;
      const nightH = w.nightHours || 0;
      const isLidDay = workingLinesDaySet.has(lid);
      const isLidNight = workingLinesNightSet.has(lid);
      const isLidWorking = isLidDay || isLidNight;
      
      const capHours = (isLidDay ? 10.83 : 0) + (isLidNight ? 10.58 : 0);
      const utilPct = capHours > 0 ? Math.round((hours / capHours) * 100) : (hours > 0 ? 999 : 0);
      const diffHours = parseFloat((capHours - hours).toFixed(1));

      const isOverloaded = (capHours === 0 && hours > 0) || (capHours > 0 && hours > capHours + 0.5) || (isLidDay && dayH > 10.83 + 0.05) || (isLidNight && nightH > 10.58 + 0.05);
      const isBusy = capHours > 0 && hours >= capHours * 0.85 && !isOverloaded;
      const isOk = capHours > 0 && hours > 0 && hours < capHours * 0.85 && !isOverloaded;
      const isEmpty = hours === 0;

      const cardClass = isOverloaded ? 'is-overloaded' : isBusy ? 'is-busy' : isOk ? 'is-ok' : '';
      const statusText = !isLidWorking && hours > 0 ? '🔴 Vượt ca' : isOverloaded ? '🔴 Vượt ca' : isBusy ? '🎯 Tối ưu' : isOk ? '🟢 Cân bằng' : !isLidWorking ? '⏸️ Nghỉ' : '⚪ Trống';
      const statusColor = isOverloaded ? '#f87171' : isBusy ? '#34d399' : isOk ? '#38bdf8' : '#64748b';

      const shiftWorkingBadge = isLidWorking
        ? `<span style="font-size: 0.65rem; color: #38bdf8;">${isLidDay && isLidNight ? '☀️🌙 21.41h' : isLidDay ? '☀️ 10.83h' : '🌙 10.58h'}</span>`
        : '<span style="font-size: 0.65rem; color: #64748b;">⏸️ Nghỉ</span>';

      const progClass = isOverloaded ? 'prog-over' : isBusy ? 'prog-busy' : 'prog-ok';
      const progWidth = Math.min(100, Math.max(0, utilPct));

      return `
        <div class="sim-workload-card ${cardClass}" style="${!isLidWorking ? 'opacity: 0.7;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
            <div>
              <div style="font-weight: 900; font-size: 0.95rem; color: #f8fafc; display: flex; align-items: center; gap: 0.35rem;">
                <span>Line ${lid}</span>
                ${shiftWorkingBadge}
              </div>
              <div style="font-size: 0.68rem; color: #94a3b8;">${l.leader ? 'Tổ: ' + l.leader : 'Assembly'}</div>
            </div>
            <span style="font-size: 0.65rem; font-weight: 800; color: ${statusColor};">
              ${statusText}
            </span>
          </div>

          <div style="margin: 0.4rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 1.25rem; font-weight: 900; color: ${hours > 0 ? (isOverloaded ? '#f87171' : '#fbbf24') : '#64748b'}; font-family: var(--font-mono);">
                ${hours.toFixed(1)}h
              </span>
              <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono);">
                / ${capHours.toFixed(1)}h
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem;">
              <div class="sim-prog-bar-container" style="height: 6px;">
                <div class="sim-prog-bar-fill ${progClass}" style="width: ${progWidth}%;"></div>
              </div>
              <span class="font-mono" style="font-size: 0.68rem; font-weight: 800; color: ${isOverloaded ? '#f87171' : '#cbd5e1'};">
                ${capHours > 0 ? utilPct + '%' : (hours > 0 ? '>100%' : '0%')}
              </span>
            </div>

            <div style="font-size: 0.68rem; color: #cbd5e1; margin-top: 0.35rem; display: flex; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 0.2rem 0.4rem; border-radius: 4px;">
              <span>☀️ Ngày: <strong style="color: ${dayH > 10.83 + 0.05 ? '#f87171' : '#fbbf24'};">${dayH.toFixed(1)}h</strong>/10.83h</span>
              <span>🌙 Đêm: <strong style="color: ${nightH > 10.58 + 0.05 ? '#f87171' : '#c084fc'};">${nightH.toFixed(1)}h</strong>/10.58h</span>
            </div>

            <div style="font-size: 0.7rem; color: #cbd5e1; margin-top: 0.25rem; display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Dư/thiếu:</span>
              <strong style="color: ${diffHours > 0 ? '#34d399' : diffHours < 0 ? '#f87171' : '#cbd5e1'}; font-family: var(--font-mono);">
                ${capHours === 0 && hours === 0 ? '0.0h' : diffHours > 0 ? '+' + diffHours.toFixed(1) + 'h' : diffHours.toFixed(1) + 'h'}
              </strong>
            </div>
          </div>

          <div style="font-size: 0.68rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.35rem; display: flex; justify-content: space-between;">
            <span>SL: <strong>${w.qty.toLocaleString('vi-VN')}</strong> pcs</span>
            <span><strong>${w.models}</strong> models</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="sim-container" style="padding-top: 0.05rem;">
        <!-- 2. STREAMLINED SHIFT & LINE WORKING FILTER (Tối ưu lên sát phía trên) -->
        <div class="sim-dispatch-card" style="padding: 0.35rem 0.65rem; margin-bottom: 0.35rem; display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: nowrap; overflow-x: auto;">
          <!-- Left Column: Shift selection and Line support controls -->
          <div style="display: flex; flex-direction: column; gap: 0.3rem; flex: 0 0 auto;">
            <!-- Ca Ngày (Day Shift) -->
            <div class="sim-shift-row" style="margin-bottom: 0; padding: 0.25rem 0.6rem; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.25); flex-wrap: nowrap;">
              <span class="sim-shift-badge-day" style="font-weight: 800; min-width: 130px; justify-content: center; padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                <span>☀️</span>
                <span>CA NGÀY (10.83h)</span>
              </span>

              <div class="sim-line-toggle-chips" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
                ${activeAssemblyLines.filter(lid => !lid.startsWith('Support')).map(lid => {
                  const isActive = workingLinesDaySet.has(lid);
                  return `
                    <span class="sim-line-toggle-chip ${isActive ? 'is-day-active' : ''}" onclick="handleToggleSimWorkingLine('DAY', '${lid}')" title="Bấm để bật/tắt Line ${lid} ca Ngày">
                      ${isActive ? '✓ ' : ''}${lid}
                    </span>
                  `;
                }).join('')}
              </div>

              <div style="width: 1px; height: 18px; background: rgba(255, 255, 255, 0.15); margin: 0 0.35rem;"></div>

              <!-- Quick Line Support Selector for Day Shift -->
              <div class="sim-support-selector" style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(56, 189, 248, 0.08); padding: 0.12rem 0.45rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3); white-space: nowrap;">
                <span style="font-size: 0.725rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 0.2rem;">
                  🛠️ Line Support:
                </span>
                <button type="button" class="btn ${daySupportCount === 0 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('DAY', 0)" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; font-weight: 800; min-width: 22px; ${daySupportCount === 0 ? 'background: #0284c7; color: #fff;' : ''}" title="Tắt toàn bộ Line Support ca Ngày">
                  0
                </button>
                <button type="button" class="btn ${daySupportCount === 1 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('DAY', 1)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${daySupportCount === 1 ? 'background: #0284c7; color: #fff;' : ''}" title="Huy động 1 Line Support ca Ngày">
                  1 Line
                </button>
                <button type="button" class="btn ${daySupportCount === 2 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('DAY', 2)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${daySupportCount === 2 ? 'background: #0284c7; color: #fff;' : ''}" title="Huy động 2 Line Support ca Ngày">
                  2 Line
                </button>
                <button type="button" class="btn ${daySupportCount === 3 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('DAY', 3)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${daySupportCount === 3 ? 'background: #0284c7; color: #fff;' : ''}" title="Huy động 3 Line Support ca Ngày">
                  3 Line
                </button>
              </div>
            </div>

            <!-- Ca Đêm (Night Shift) -->
            <div class="sim-shift-row" style="margin-bottom: 0; padding: 0.25rem 0.6rem; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.25); flex-wrap: nowrap;">
              <span class="sim-shift-badge-night" style="font-weight: 800; min-width: 130px; justify-content: center; padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                <span>🌙</span>
                <span>CA ĐÊM (10.58h)</span>
              </span>

              <div class="sim-line-toggle-chips" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
                ${activeAssemblyLines.filter(lid => !lid.startsWith('Support')).map(lid => {
                  const isActive = workingLinesNightSet.has(lid);
                  return `
                    <span class="sim-line-toggle-chip ${isActive ? 'is-night-active' : ''}" onclick="handleToggleSimWorkingLine('NIGHT', '${lid}')" title="Bấm để bật/tắt Line ${lid} ca Đêm">
                      ${isActive ? '✓ ' : ''}${lid}
                    </span>
                  `;
                }).join('')}
              </div>

              <div style="width: 1px; height: 18px; background: rgba(255, 255, 255, 0.15); margin: 0 0.35rem;"></div>

              <!-- Quick Line Support Selector for Night Shift -->
              <div class="sim-support-selector" style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(192, 132, 252, 0.08); padding: 0.12rem 0.45rem; border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.3); white-space: nowrap;">
                <span style="font-size: 0.725rem; font-weight: 800; color: #c084fc; display: flex; align-items: center; gap: 0.2rem;">
                  🛠️ Line Support:
                </span>
                <button type="button" class="btn ${nightSupportCount === 0 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('NIGHT', 0)" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; font-weight: 800; min-width: 22px; ${nightSupportCount === 0 ? 'background: #9333ea; color: #fff;' : ''}" title="Tắt toàn bộ Line Support ca Đêm">
                  0
                </button>
                <button type="button" class="btn ${nightSupportCount === 1 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('NIGHT', 1)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${nightSupportCount === 1 ? 'background: #9333ea; color: #fff;' : ''}" title="Huy động 1 Line Support ca Đêm">
                  1 Line
                </button>
                <button type="button" class="btn ${nightSupportCount === 2 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('NIGHT', 2)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${nightSupportCount === 2 ? 'background: #9333ea; color: #fff;' : ''}" title="Huy động 2 Line Support ca Đêm">
                  2 Line
                </button>
                <button type="button" class="btn ${nightSupportCount === 3 ? 'btn-primary' : 'btn-secondary'}" onclick="handleSetSimSupportLineCount('NIGHT', 3)" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 800; ${nightSupportCount === 3 ? 'background: #9333ea; color: #fff;' : ''}" title="Huy động 3 Line Support ca Đêm">
                  3 Line
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Bảng Tổng Hợp Kế Hoạch & Ngắn Gọn Theo Chuyền (Ảnh 2) -->
          <div class="sim-mini-kpis-wrapper" style="display: flex; gap: 0.5rem; align-items: stretch; justify-content: flex-end; flex-shrink: 0; margin-left: auto; flex-wrap: wrap;">
            ${miniSummaryPlanTotalsHtml}
            ${miniSummaryDayHtml}
            ${miniSummaryNightHtml}
          </div>
        </div>

        <!-- 4. SIMULATOR FILTER TOOLBAR (Tối ưu sát lên trên) -->
        <div class="card" style="padding: 0.35rem 0.75rem; margin-bottom: 0.35rem; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-glass);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; flex: 1;">
              <!-- Stage selector -->
              <div style="display: flex; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #a78bfa;">🏭 Công Đoạn:</span>
                <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 130px; padding: 0.2rem 0.45rem;" onchange="handleSimulatorStageFilterChange(this.value)">
                  <option value="ASSEMBLY" ${stageFilter === 'ASSEMBLY' ? 'selected' : ''}>ASSEMBLY</option>
                  <option value="HARD TEST" ${stageFilter === 'HARD TEST' ? 'selected' : ''}>HARD TEST</option>
                  <option value="LONG TEST" ${stageFilter === 'LONG TEST' ? 'selected' : ''}>LONG TEST</option>
                  <option value="TEST ROOM" ${stageFilter === 'TEST ROOM' ? 'selected' : ''}>TEST ROOM</option>
                  <option value="QC" ${stageFilter === 'QC' ? 'selected' : ''}>QC</option>
                  <option value="PKG" ${stageFilter === 'PKG' ? 'selected' : ''}>PKG</option>
                  <option value="COM PKG" ${stageFilter === 'COM PKG' ? 'selected' : ''}>COM PKG</option>
                  <option value="COM PKG AUTO" ${stageFilter === 'COM PKG AUTO' ? 'selected' : ''}>COM PKG AUTO</option>
                  <option value="MB" ${stageFilter === 'MB' ? 'selected' : ''}>MB</option>
                  <option value="ALL" ${stageFilter === 'ALL' ? 'selected' : ''}>Tất Cả Công Đoạn</option>
                </select>
              </div>

              <!-- Plan status selector -->
              <div style="display: flex; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #f87171;">📊 Kế Hoạch:</span>
                <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 165px; padding: 0.2rem 0.45rem;" onchange="handleSimulatorPlanStatusFilterChange(this.value)">
                  <option value="GAP_NEGATIVE" ${planStatusFilter === 'GAP_NEGATIVE' ? 'selected' : ''}>Đang Thiếu Hụt (Gap &lt; 0)</option>
                  <option value="ALL" ${planStatusFilter === 'ALL' ? 'selected' : ''}>Tất Cả Model</option>
                </select>
              </div>

              <!-- Group Model selector -->
              <div style="display: flex; align-items: center; gap: 0.3rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #60a5fa;">🏷️ Group Model:</span>
                <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 160px; padding: 0.2rem 0.45rem;" onchange="handleSimulatorGroupFilterChange(this.value)">
                  <option value="ALL" ${groupFilter === 'ALL' ? 'selected' : ''}>Tất cả Group Model (${allGroups.length})</option>
                  ${allGroups.map(g => `<option value="${g.group}" ${groupFilter === g.group ? 'selected' : ''}>${g.group}</option>`).join('')}
                </select>
              </div>

              <!-- Quick Search Input -->
              <div class="search-box" style="min-width: 170px; flex: 1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input id="simTableSearchInput" type="text" class="search-input" placeholder="Tìm theo Model hoặc Mã 1C..." value="${searchVal}" oninput="handleSimulatorSearch(this.value)" style="padding: 0.2rem 0.5rem 0.2rem 1.8rem; font-size: 0.775rem;">
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <button type="button" class="btn btn-secondary" onclick="handleResetSimulatorOptimalLines()" style="padding: 0.25rem 0.65rem; font-size: 0.725rem; display: inline-flex; align-items: center; gap: 0.3rem; color: #34d399; border-color: rgba(16, 185, 129, 0.4);" title="Khôi phục lại toàn bộ Line đề xuất tối ưu nhất của hệ thống">
                <span>↺ Đặt lại tất cả Line tối ưu</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 5. MAIN SCHEDULE & SIMULATION TABLE (THEO FORMAT 13 CỘT CHUẨN BẢNG 2) -->
        <div class="sim-table-wrap">
          <div class="sim-table-header" style="padding: 0.4rem 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 800; color: #38bdf8; font-size: 0.85rem;">
                📋 TIẾN ĐỘ SẢN LƯỢNG &amp; ĐỀ XUẤT LINE TẢI CHUYỀN (THEO BẢNG 2)
              </span>
              ${renderSimPlanActionButtonsHtml(plannerName, simHistoryCount)}
            </div>
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <button type="button" class="sim-btn-export-sheet" onclick="handleExportCapacityScheduleGoogleSheet()" title="Xuất file CSV chuẩn UTF-8 tương thích Google Sheets &amp; Excel theo định dạng 29 cột kèm Date Plan, Shift Plan, Ghi Chú &amp; Âm Từ Ngày / Ca">
                <span>📥 Xuất Google Sheets (CSV)</span>
              </button>
              <button type="button" class="sim-btn-copy-sheet" onclick="handleCopyCapacityScheduleClipboard()" title="Sao chép toàn bộ bảng điều độ 29 cột kèm Date Plan, Shift Plan, Ghi Chú &amp; Âm Từ Ngày / Ca để dán ngay (Ctrl+V) vào Google Sheets">
                <span>📋 Copy Cho Google Sheet</span>
              </button>
              <button type="button" class="btn btn-secondary" onclick="handleOpenLineSequenceModal()" style="padding: 0.25rem 0.55rem; font-size: 0.725rem; color: #fbbf24; border-color: rgba(251, 191, 36, 0.4); display: inline-flex; align-items: center; gap: 0.3rem;" title="Xem bảng phân bổ thứ tự sản xuất chi tiết gom theo từng Chuyền">
                <span>📑 Thứ Tự Theo Chuyền</span>
              </button>
              <span style="font-size: 0.725rem; color: var(--text-muted); margin-left: 0.2rem;">
                Đang hiển thị <strong>${scheduleItems.length}</strong> Model
              </span>
            </div>
          </div>

          <!-- BANNER THÔNG BÁO KẾ HOẠCH MỚI VỪA HOÀN THÀNH TỪ USER KHÁC (REAL-TIME SYNC) -->
          ${renderSimNewPlanBannerHtml()}
          ${renderCumNegPriorityBannerHtml(asmGate, 'ASSEMBLY')}

          <div id="simTableScrollWrapper" style="overflow-x: auto; max-height: calc(100vh - 270px);">
            <table class="sim-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
              <thead>
                <!-- HÀNG 0: TỔNG CHI TIẾT THEO TỪNG CỘT (STICKY TOP: 0) -->
                <tr class="sim-sticky-totals-row">
                  <th class="sticky-sim-stt"></th>
                  <th class="sticky-sim-stage"></th>
                  <th class="sticky-sim-group" style="text-align: center; color: #fbbf24; font-size: 0.725rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0.35rem 0.25rem;" title="Người lập Plan: ${plannerName}">
                    👤 ${plannerName}
                  </th>
                  <th class="sticky-sim-model" style="text-align: right; color: #f8fafc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.65rem;">
                    Tổng Cộng :
                  </th>
                  <th class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandPlan.toLocaleString('vi-VN')}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #34d399; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandFact.toLocaleString('vi-VN')}
                  </th>
                  <th class="font-mono" style="text-align: right; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem; ${grandGap < 0 ? 'color: var(--danger);' : grandGap > 0 ? 'color: var(--success);' : 'color: var(--text-muted);'}">
                    ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'}
                  </th>
                  <th style="padding: 0.35rem 0.35rem;"></th>
                  <th style="padding: 0.35rem 0.35rem;"></th>
                  <th style="padding: 0.35rem 0.35rem;"></th>
                  <th class="font-mono" style="text-align: right; color: #fbbf24; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandStdHours.toFixed(1)}
                  </th>
                  <!-- Cụm Ca Ngày -->
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th class="font-mono" style="text-align: right; color: #38bdf8; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandActualHoursDay > 0 ? grandActualHoursDay.toFixed(1) : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #fbbf24; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandDayAvailHours > 0 ? grandDayAvailHours.toFixed(2) : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #38bdf8; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandPlanDay > 0 ? grandPlanDay.toLocaleString('vi-VN') : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #f87171; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandNightShortage > 0 ? '-' + grandNightShortage.toLocaleString('vi-VN') : ''}
                  </th>
                  <!-- Cụm Ca Đêm -->
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th class="font-mono" style="text-align: right; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandActualHoursNight > 0 ? grandActualHoursNight.toFixed(1) : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #fbbf24; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandNightAvailHours > 0 ? grandNightAvailHours.toFixed(2) : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandPlanNight > 0 ? grandPlanNight.toLocaleString('vi-VN') : ''}
                  </th>
                  <th class="font-mono" style="text-align: right; color: #f87171; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                    ${grandFinalShortage > 0 ? '-' + grandFinalShortage.toLocaleString('vi-VN') : ''}
                  </th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                  <th style="padding: 0.35rem 0.25rem;"></th>
                </tr>

                <!-- HÀNG 1: TIÊU ĐỀ 30 CỘT (STICKY TOP: 36px) VỚI TEXT WRAPPING GỌN GÀNG -->
                <tr class="sim-header-titles">
                  <th class="sticky-sim-stt" style="text-align: center; width: 45px;">STT</th>
                  <th class="sticky-sim-stage" style="text-align: center; width: 95px;">Công Đoạn</th>
                  <th class="sticky-sim-group" style="text-align: left; width: 140px;">Group Model</th>
                  <th class="sticky-sim-model" style="text-align: left; min-width: 300px;">Mã Model (1C)</th>
                  <th style="text-align: right; min-width: 65px; color: #60a5fa; padding: 0.35rem 0.35rem;">Kế Hoạch</th>
                  <th style="text-align: right; min-width: 65px; color: #34d399; padding: 0.35rem 0.35rem;">Thực Tế</th>
                  <th style="text-align: right; min-width: 65px; padding: 0.35rem 0.35rem;">Chênh Lệch</th>
                  <th style="text-align: center; min-width: 90px; color: #38bdf8; padding: 0.35rem 0.35rem;" title="Ngày kế hoạch hiện tại; nếu hôm nay không có Plan hoặc đã chạy đủ Plan (âm do ngày cũ) mặc định là Âm luỹ kế">Date Plan</th>
                  <th style="text-align: center; min-width: 78px; color: #a78bfa; padding: 0.35rem 0.35rem;" title="Ca sản xuất trong ngày hiện tại mà Thực tế chưa chạy đủ Plan (Ngày / Đêm)">Shift Plan</th>
                  <th style="text-align: center; min-width: 65px; padding: 0.35rem 0.25rem;">Cycle Time<br>TC</th>
                  <th style="text-align: right; min-width: 75px; color: #fbbf24; padding: 0.35rem 0.25rem;">Tổng TG<br>Tiêu Chuẩn</th>
                  <!-- Cụm Ca Ngày -->
                  <th style="text-align: center; min-width: 60px; color: #cbd5e1; padding: 0.35rem 0.25rem;">Ca Làm<br>Việc</th>
                  <th style="text-align: center; min-width: 65px; color: #38bdf8; padding: 0.35rem 0.25rem;">Line SX</th>
                  <th style="text-align: center; min-width: 50px; color: #38bdf8; padding: 0.35rem 0.25rem;">Thứ Tự<br>SX</th>
                  <th style="text-align: center; min-width: 58px; padding: 0.35rem 0.25rem;">PF %</th>
                  <th style="text-align: right; min-width: 80px; color: #38bdf8; padding: 0.35rem 0.25rem;">Tổng TG Cần<br>Thực Tế 1</th>
                  <th style="text-align: right; min-width: 75px; color: #fbbf24; padding: 0.35rem 0.25rem;">Tổng TG Có<br>Ca Ngày</th>
                  <th style="text-align: right; min-width: 78px; color: #38bdf8; padding: 0.35rem 0.25rem;">Plan<br>Ca Ngày</th>
                  <th style="text-align: right; min-width: 85px; color: #f87171; padding: 0.35rem 0.25rem;">Kế hoạch Còn<br>Thiếu Ca Đêm</th>
                  <!-- Cụm Ca Đêm -->
                  <th style="text-align: center; min-width: 60px; color: #c084fc; padding: 0.35rem 0.25rem;">Ca Làm<br>Việc</th>
                  <th style="text-align: center; min-width: 65px; color: #c084fc; padding: 0.35rem 0.25rem;">Line SX</th>
                  <th style="text-align: center; min-width: 50px; color: #c084fc; padding: 0.35rem 0.25rem;">Thứ Tự<br>SX</th>
                  <th style="text-align: center; min-width: 58px; padding: 0.35rem 0.25rem;">PF %</th>
                  <th style="text-align: right; min-width: 80px; color: #c084fc; padding: 0.35rem 0.25rem;">Tổng TG Cần<br>Thực Tế 2</th>
                  <th style="text-align: right; min-width: 75px; color: #fbbf24; padding: 0.35rem 0.25rem;">Tổng TG Có<br>Ca Đêm</th>
                  <th style="text-align: right; min-width: 78px; color: #c084fc; padding: 0.35rem 0.25rem;">Plan<br>Ca Đêm</th>
                  <th style="text-align: right; min-width: 85px; color: #f87171; padding: 0.35rem 0.25rem;">Kế hoạch Còn<br>Thiếu Tổng</th>
                  <th style="text-align: left; min-width: 140px; color: #e2e8f0; padding: 0.35rem 0.35rem;">Ghi Chú</th>
                  <th style="text-align: center; min-width: 132px; color: #fbbf24; padding: 0.35rem 0.35rem;" title="Truy xuất ngày và ca sản xuất (Ngày / Đêm) bắt đầu bị âm cho các Model Âm luỹ kế">Âm Từ<br>Ngày / Ca</th>
                  <th style="text-align: center; min-width: 102px; color: #34d399; padding: 0.35rem 0.35rem;" title="Bấm để mở ngay tab WIP Control và lọc đúng Model này theo công đoạn">Check WIP</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml.length > 0 ? tableRowsHtml : `
                  <tr>
                    <td colspan="30" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                      <div style="font-weight: 700; color: #f8fafc;">Không tìm thấy Model nào theo tiêu chí lọc hiện tại</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      </div>
      <!-- Datalist for Assembly Line input autocomplete -->
      <datalist id="assemblyLinesList">
        <option value="1A">Line 1A</option>
        <option value="2A">Line 2A</option>
        <option value="1B">Line 1B</option>
        <option value="2B">Line 2B</option>
        <option value="1C">Line 1C</option>
        <option value="2C">Line 2C</option>
        <option value="1D">Line 1D</option>
        <option value="2D">Line 2D</option>
        <option value="3A">Line 3A</option>
        <option value="3B">Line 3B</option>
        <option value="3C">Line 3C</option>
        <option value="3D">Line 3D</option>
        <option value="Support 1">Line Support 1</option>
        <option value="Support 2">Line Support 2</option>
        <option value="Support 3">Line Support 3</option>
        <option value="NONE">Hủy xếp Line (NONE)</option>
      </datalist>
    `;
  }

  /**
   * RESOLVE HARDTEST ITEM CAPACITY & NORMS (ĐỒNG BỘ CHUẨN ASSEMBLY)
   * Ánh xạ chính xác từng mã 1C trong Bảng 2 sang bảng định mức Test Block & Cycle Time
   */
  function resolveHardtestItemCapacity(it, htData) {
    const htItems = (htData && htData.items) ? htData.items : [];
    const p1c = (it.productName1C || '').toLowerCase().trim();
    const model = (it.model || '').toLowerCase().trim();
    const stage = (it.stage || '').toUpperCase().trim();
    const cleanModel = model.replace(/\(.*?\)/g, '').replace(/white|black/gi, '').replace(/\s+/g, ' ').trim();
    const regionStr = p1c + ' ' + model;
    const is9xx = /\b9xx\b|9au|9sa|915|_9xx|9na|ula\b/.test(regionStr);
    const is8xx = /\b8xx\b|8eu|868|_8xx|ueu\b/.test(regionStr);
    const mv = model.match(/\bv(\d+)\b/i);

    function bandBonus(c) {
      const cb = (c.board || '').toLowerCase();
      const cHas9 = /9xx|9[a-z]{2}|ula/.test(cb);
      const cHas8 = /8xx|8[хx]{2}|868|ueu/.test(cb);
      if (is9xx && cHas9) return 20;
      if (is8xx && cHas8) return 20;
      if (is9xx && cHas8) return -5;
      if (is8xx && cHas9) return -5;
      return 0;
    }

    let match = null;
    let bestScore = -Infinity;

    for (const c of htItems) {
      const cStage = (c.stage || '').toUpperCase().trim();
      const stageScore = (cStage === stage) ? 10000 : 0;
      const bCode = (c.board || '').toLowerCase().trim();
      const bNoBr = bCode.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
      const bCore = bNoBr.replace(/_*dip\d*$/i, '').replace(/_+$/, '').trim();
      let matchScore = 0;

      // 1. Ưu tiên khớp chính xác theo Công Đoạn + Mã Bo Mạch
      if (p1c && bCode && p1c.includes(bCode)) {
        matchScore = 5000 + bCode.length;
      } else if (p1c && bNoBr.length > 5 && p1c.includes(bNoBr)) {
        matchScore = 4500 + bNoBr.length;
      } else if (p1c && bCore.length >= 8 && p1c.includes(bCore)) {
        matchScore = 4000 + bCore.length;
      } else if (cleanModel) {
        // 2. Khớp theo Group / AltGroup ưu tiên đúng tuyệt đối hoặc tên dài cụ thể hơn (vd DoorProtect Plus > DoorProtect)
        const grps = [c.group, c.altGroup].map(x => (x || '').toLowerCase().trim()).filter(Boolean);
        for (const cg of grps) {
          if (cg === cleanModel) {
            matchScore = Math.max(matchScore, 3000 + cg.length * 10);
          } else if (cleanModel.startsWith(cg + ' ') || cleanModel === cg) {
            matchScore = Math.max(matchScore, 2200 + cg.length * 10);
          } else if (cg.startsWith(cleanModel + ' ')) {
            matchScore = Math.max(matchScore, 1800 + cleanModel.length * 10);
          } else if (cleanModel.includes(cg) || cg.includes(cleanModel)) {
            matchScore = Math.max(matchScore, 1000 + Math.min(cg.length, cleanModel.length) * 10);
          }
        }
        if (mv && bCode.includes('v' + mv[1])) matchScore += 30;
      }

      if (matchScore <= 0) continue;
      const totalScore = stageScore + matchScore + bandBonus(c);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        match = c;
      }
    }

    const ctNorm = (match && match.ctNorm > 0) ? match.ctNorm : 60;
    const ctActual = (match && match.ctActual > 0) ? match.ctActual : ctNorm;
    const tbQty = (match && match.tbQty > 0) ? match.tbQty : 2;
    const board = (match && match.board) ? match.board : (it.productName1C || it.model);
    const normGroup = (match && match.group) ? match.group : it.model;
    const fttPct = (match && match.fttPct != null) ? match.fttPct : 95.0;
    const dtTotalPct = (match && match.dtTotalPct != null) ? match.dtTotalPct : 5.0;
    const isShared = Boolean(match && match.isShared);
    const note = (match && match.note) ? match.note : (isShared ? 'Dùng Chung' : 'Riêng');
    const poolId = match
      ? (match.poolId || `ht_pool_solo_${match.id || match.rowIdx || board}`)
      : `ht_pool_fallback_${stage}_${(normGroup || board).toLowerCase().trim()}`;

    return {
      ctNorm,
      ctActual,
      availTb: tbQty,
      board,
      normGroup,
      fttPct,
      dtTotalPct,
      isShared,
      note,
      poolId,
      match
    };
  }

  /**
   * PHÂN BỔ TEST BLOCK & CÔNG SUẤT THEO CA (10.83h NGÀY / 10.58h ĐÊM) CÓ KHỐNG CHẾ NHÓM "DÙNG CHUNG"
   * Đảm bảo tổng Số Test Block Dùng trong 1 ca của các Model cùng pool <= TB Sẵn Có.
   */
  function allocateHardtestShiftPool(priorityRows, shiftCfg) {
    const {
      shiftSide,
      shiftHours,
      shiftSeconds,
      manualTbMap,
      legacyManualTbMap,
      manualManMap,
      legacyManualManMap,
      manualPlanMap,
      getTargetQty
    } = shiftCfg;

    const poolUsage = {};
    const metaByRow = new Map();

    priorityRows.forEach(r => {
      const targetQty = getTargetQty(r);
      const capa1TB = (r.ctMachineWithFttDt > 0 && shiftSeconds > 0) ? (shiftSeconds / r.ctMachineWithFttDt) : 0;
      const tbOverrideRaw = manualTbMap[r.rowId] !== undefined
        ? manualTbMap[r.rowId]
        : (legacyManualTbMap ? legacyManualTbMap[r.rowId] : undefined);
      const hasTbOverride = tbOverrideRaw !== undefined;
      const planOverrideRaw = manualPlanMap ? manualPlanMap[r.rowId] : undefined;
      const hasPlanOverride = planOverrideRaw !== undefined && !isNaN(planOverrideRaw) && Number(planOverrideRaw) >= 0;
      const manOverrideRaw = manualManMap[r.rowId] !== undefined
        ? manualManMap[r.rowId]
        : (legacyManualManMap ? legacyManualManMap[r.rowId] : undefined);
      const hasManOverride = manOverrideRaw !== undefined;

      if (!poolUsage[r.poolId]) {
        poolUsage[r.poolId] = { usedTb: 0, availTb: r.availTb, peerCount: 0 };
      }
      if (targetQty > 0 || hasTbOverride || hasPlanOverride) {
        poolUsage[r.poolId].peerCount += 1;
      }

      metaByRow.set(r.rowId, {
        targetQty,
        capa1TB,
        tbOverrideRaw,
        hasTbOverride,
        planOverrideRaw,
        hasPlanOverride,
        manOverrideRaw,
        hasManOverride,
        tbUsed: 0
      });
    });

    // Pass 1: Ưu tiên giữ các dòng đã nhập tay Số TB hoặc Output Plan
    priorityRows.forEach(r => {
      const m = metaByRow.get(r.rowId);
      const pool = poolUsage[r.poolId];
      if (m.hasTbOverride) {
        m.tbUsed = Math.max(0, parseInt(m.tbOverrideRaw, 10) || 0);
        pool.usedTb += m.tbUsed;
      } else if (m.hasPlanOverride) {
        const planVal = Math.max(0, Number(m.planOverrideRaw) || 0);
        const remPool = Math.max(0, r.availTb - pool.usedTb);
        const reqForPlan = (planVal > 0 && m.capa1TB > 0) ? Math.ceil(planVal / m.capa1TB) : 0;
        m.tbUsed = Math.min(remPool, reqForPlan);
        pool.usedTb += m.tbUsed;
      }
    });

    // Pass 2: Tự động chia phần TB còn lại của pool cho các Model theo thứ tự ưu tiên
    priorityRows.forEach(r => {
      const m = metaByRow.get(r.rowId);
      if (m.hasTbOverride || m.hasPlanOverride) return;
      const pool = poolUsage[r.poolId];
      const remPool = Math.max(0, r.availTb - pool.usedTb);
      const idealTb = (m.targetQty > 0 && m.capa1TB > 0) ? Math.ceil(m.targetQty / m.capa1TB) : 0;
      m.tbUsed = Math.min(remPool, idealTb);
      pool.usedTb += m.tbUsed;
    });

    priorityRows.forEach(r => {
      const m = metaByRow.get(r.rowId);
      const pool = poolUsage[r.poolId];
      const output = m.hasPlanOverride
        ? Math.max(0, Number(m.planOverrideRaw) || 0)
        : ((m.targetQty > 0 && m.tbUsed > 0 && m.capa1TB > 0)
            ? Math.min(m.targetQty, Math.floor(m.tbUsed * m.capa1TB))
            : 0);
      const actualHours = (output > 0 && r.ctMachineWithFttDt > 0)
        ? (output * r.ctMachineWithFttDt) / 3600
        : 0;
      const manUsed = m.hasManOverride
        ? Math.max(0, parseInt(m.manOverrideRaw, 10) || 0)
        : (m.tbUsed > 0 ? Math.ceil(m.tbUsed / 2.0) : 0);
      const maxOutputAtTb = (m.tbUsed > 0 && m.capa1TB > 0) ? Math.floor(m.tbUsed * m.capa1TB) : 0;
      const isShiftCapOver = m.hasPlanOverride && (
        actualHours > (m.tbUsed * shiftHours) + 0.02 ||
        (m.tbUsed === 0 && output > 0) ||
        output > maxOutputAtTb
      );
      const isPoolTbOver = pool.usedTb > r.availTb;
      const isRowTbOver = (m.tbUsed > r.availTb) || (m.tbUsed > 0 && isPoolTbOver);

      if (shiftSide === 'DAY') {
        r.manualTbDay = m.tbUsed;
        r.manualManDay = manUsed;
        r.hasDayTbOverride = m.hasTbOverride;
        r.hasDayManOverride = m.hasManOverride;
        r.hasDayPlanOverride = m.hasPlanOverride;
        r.dayOutput = output;
        r.dayActualHours = actualHours;
        r.nightShortage = Math.max(0, m.targetQty - output);
        r.poolDayUsedTb = pool.usedTb;
        r.poolDayPeerCount = pool.peerCount;
        r.isPoolDayTbOver = isPoolTbOver;
        r.isDayTbOver = isRowTbOver;
        r.isDayShiftCapOver = isShiftCapOver;
        r.uphDay = (r.ctMachineWithFttDt > 0 && m.tbUsed > 0) ? ((3600.0 * m.tbUsed) / r.ctMachineWithFttDt) : 0;
      } else {
        r.manualTbNight = m.tbUsed;
        r.manualManNight = manUsed;
        r.hasNightTbOverride = m.hasTbOverride;
        r.hasNightManOverride = m.hasManOverride;
        r.hasNightPlanOverride = m.hasPlanOverride;
        r.nightOutput = output;
        r.nightActualHours = actualHours;
        r.finalShortage = Math.max(0, m.targetQty - output);
        r.poolNightUsedTb = pool.usedTb;
        r.poolNightPeerCount = pool.peerCount;
        r.isPoolNightTbOver = isPoolTbOver;
        r.isNightTbOver = isRowTbOver;
        r.isNightShiftCapOver = isShiftCapOver;
        r.uphNight = (r.ctMachineWithFttDt > 0 && m.tbUsed > 0) ? ((3600.0 * m.tbUsed) / r.ctMachineWithFttDt) : 0;
      }
    });
  }

  /**
   * RENDER HARDTEST CAPACITY SIMULATOR (GIẢ LẬP TẢI TEST BLOCK & NHÂN LỰC TOÀN CỤM TOTAL HARDTEST)
   * Đồng bộ 100% kiến trúc với công đoạn Assembly: Lấy dữ liệu thực tế từng mã 1C từ Bảng 2
   */
  function renderHardtestCapacitySimulator(htData, items, shiftHours) {
    if (!window.AppStore) return '';

    ensureSimPlanDraftRestored();

    const _defHtWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const simFromDate = window.AppStore.hardtestSimFromDate || window.AppStore.simFromDate || window.AppStore.fromDate || (_defHtWeek ? _defHtWeek.fromDate : '2026-11-05');
    const simToDate = window.AppStore.hardtestSimToDate || window.AppStore.simToDate || window.AppStore.toDate || (_defHtWeek ? _defHtWeek.toDate : '2026-11-05');
    const simShiftType = 'FULL_DAY'; // Mặc định Ca Ngày (10.83h) + Ca Đêm (10.58h) song song
    const statusFilter = window.AppStore.hardtestSimStatusFilter || 'GAP_NEGATIVE'; // 'GAP_NEGATIVE' | 'GAP_POSITIVE' | 'HAS_PLAN' | 'ALL' | 'SHORTAGE'
    const groupFilter = window.AppStore.hardtestSimGroupFilter || 'ALL';
    const stageSubFilter = window.AppStore.hardtestSimStageFilter || 'ALL';
    const searchVal = (window.AppStore.hardtestSimSearchVal || '').trim().toLowerCase();

    const plannerName = getSimPlannerName();
    const simHistoryCount = getSimHistoryCount();
    const todayPlanRef = getTodayPlanReference();

    // 2. Query Master Schedule from Bảng 2 data source (Total Hardtest cluster)
    const targetStageFilter = (stageSubFilter === 'ALL') ? 'TOTAL_HARDTEST' : stageSubFilter;
    const schedule = window.AppStore.getDetailedSchedule({
      fromDate: simFromDate,
      toDate: simToDate,
      shiftFilter: 'ALL',
      stageFilter: targetStageFilter,
      modelFilter: groupFilter === 'ALL' ? 'ALL' : groupFilter,
      planStatusFilter: 'ALL', // Query tất cả để áp dụng override và filter
      search1C: searchVal,
      selectedDates: window.AppStore.getActiveSelectedDates ? window.AppStore.getActiveSelectedDates(simFromDate, simToDate) : null
    });
    const scheduleItems = schedule.items || [];

    // 3. Determine shift duration & seconds (Tổng thể cho Đề xuất TB Cần + tách Ca Ngày / Ca Đêm song song)
    let daysCount = 5;
    if (window.AppStore.getDatesInRange) {
      const dArr = window.AppStore.getDatesInRange(simFromDate, simToDate);
      if (dArr && dArr.length > 0) daysCount = dArr.length;
    }

    let shiftDurationHours = 21.41;
    let shiftDurationSeconds = 77076;
    if (simShiftType === 'DAY') {
      shiftDurationHours = 10.83;
      shiftDurationSeconds = 38988;
    } else if (simShiftType === 'NIGHT') {
      shiftDurationHours = 10.58;
      shiftDurationSeconds = 38088;
    } else if (simShiftType === 'RANGE') {
      shiftDurationHours = 21.41 * daysCount;
      shiftDurationSeconds = 77076 * daysCount;
    }

    const daysMultiplier = (simShiftType === 'RANGE') ? daysCount : 1;
    const dayShiftHours = (simShiftType === 'NIGHT') ? 0 : (10.83 * daysMultiplier);
    const dayShiftSeconds = (simShiftType === 'NIGHT') ? 0 : (38988 * daysMultiplier);
    const nightShiftHours = (simShiftType === 'DAY') ? 0 : (10.58 * daysMultiplier);
    const nightShiftSeconds = (simShiftType === 'DAY') ? 0 : (38088 * daysMultiplier);

    if (!window.AppStore.hardtestPlanOverrides) window.AppStore.hardtestPlanOverrides = {};
    if (!window.AppStore.hardtestManualTbDay) window.AppStore.hardtestManualTbDay = {};
    if (!window.AppStore.hardtestManualManDay) window.AppStore.hardtestManualManDay = {};
    if (!window.AppStore.hardtestManualPlanDay) window.AppStore.hardtestManualPlanDay = {};
    if (!window.AppStore.hardtestManualTbNight) window.AppStore.hardtestManualTbNight = {};
    if (!window.AppStore.hardtestManualManNight) window.AppStore.hardtestManualManNight = {};
    if (!window.AppStore.hardtestManualPlanNight) window.AppStore.hardtestManualPlanNight = {};
    if (!window.AppStore.hardtestManualTb) window.AppStore.hardtestManualTb = {};
    if (!window.AppStore.hardtestManualMan) window.AppStore.hardtestManualMan = {};

    let grandAvailTb = 0;

    // 4. Map each 1C schedule item from Bảng 2 to its capacity norm & shared TB pool metadata
    let processedRows = scheduleItems.map((it, idx) => {
      const rowId = it.id || `${it.stage}___${it.model}___${it.productName1C}`;
      const stage = it.stage;
      const group = it.model;
      const model1c = it.productName1C || '';

      const cap = resolveHardtestItemCapacity(it, htData);
      const board = cap.board;
      const normGroup = cap.normGroup;
      const ctNorm = cap.ctNorm;
      const ctActual = cap.ctActual;
      const fttPct = (cap.fttPct != null) ? cap.fttPct : 100.0;
      const dtTotalPct = (cap.dtTotalPct != null) ? cap.dtTotalPct : 0.0;
      const availTb = cap.availTb;
      grandAvailTb += availTb;

      const defaultPlan = it.cumPlanQty || 0;
      const defaultFact = it.cumFactQty || 0;
      const defaultGap = it.cumGapQty || 0;

      // Kế Hoạch (Plan) giữ số mặc định, không cho phép sửa trực tiếp
      const hasPlanOverride = false;
      const planQty = defaultPlan;
      const factQty = defaultFact;
      const gapQty = defaultGap;

      const planMeta = resolvePlanDateAndShiftMeta(it, gapQty, todayPlanRef, 'ALL');
      const cumNegOriginMeta = planMeta.isCumNegative
        ? resolveAccumulatedNegativeOrigin(it, 'ALL')
        : { originDate: '', originShift: '', label: '--', tooltip: '' };

      // Khối lượng cần giải quyết: nếu thiếu hụt thì tính theo lượng thiếu, ngược lại tính theo plan
      const targetQty = (gapQty < 0) ? Math.abs(gapQty) : planQty;

      // Giờ máy cần tiêu chuẩn: KHÔNG tính FTT & Downtime, lấy trực tiếp theo CT Norm gốc trên sheet
      const baseCtNorm = ctNorm > 0 ? ctNorm : ctActual;
      const stdHours = (targetQty > 0 && baseCtNorm > 0) ? (targetQty * baseCtNorm) / 3600 : 0;

      // Cycle Time máy thực tế (có FTT & Downtime) dùng cho Giờ máy cần thực tế & công suất 10.83h / 10.58h:
      // ctMachineWithFttDt = CT_Norm * (1 + (1 - FTT) + TotalDownTime)
      const fttRatio = Math.max(0, Math.min(1, fttPct / 100));
      const dtRatio = Math.max(0, dtTotalPct / 100);
      const ctMachineWithFttDt = baseCtNorm > 0 ? baseCtNorm * (1 + (1 - fttRatio) + dtRatio) : ctActual;

      // Đề xuất số Test Block Cần tổng thể trong cấu hình thời gian ca đã chọn
      const capaPer1TB = (ctMachineWithFttDt > 0 && shiftDurationSeconds > 0) ? (shiftDurationSeconds / ctMachineWithFttDt) : 0;
      const reqTb = (targetQty > 0 && capaPer1TB > 0) ? Math.ceil(targetQty / capaPer1TB) : 0;
      const reqMan = reqTb > 0 ? Math.ceil(reqTb / 2.0) : 0;

      return {
        it,
        idx,
        displayIdx: idx + 1,
        rowId,
        stage,
        group,
        normGroup,
        model1c,
        board,
        availTb,
        poolId: cap.poolId,
        isSharedPool: cap.isShared,
        poolNote: cap.note,
        ctNorm: baseCtNorm,
        ctActual,
        ctMachineWithFttDt,
        fttPct,
        dtTotalPct,
        planQty,
        factQty,
        gapQty,
        planMeta,
        datePlanLabel: planMeta.datePlanLabel,
        shiftPlanLabel: planMeta.shiftPlanLabel,
        cumNegOriginMeta,
        cumNegOriginLabel: cumNegOriginMeta.label,
        targetQty,
        stdHours,
        hasPlanOverride,
        capaPer1TB,
        reqTb,
        reqMan,
        manualTbDay: 0,
        manualManDay: 0,
        hasDayTbOverride: false,
        hasDayManOverride: false,
        hasDayPlanOverride: false,
        dayOutput: 0,
        dayActualHours: 0,
        nightShortage: targetQty,
        poolDayUsedTb: 0,
        poolDayPeerCount: 0,
        isPoolDayTbOver: false,
        isDayTbOver: false,
        isDayShiftCapOver: false,
        uphDay: 0,
        manualTbNight: 0,
        manualManNight: 0,
        hasNightTbOverride: false,
        hasNightManOverride: false,
        hasNightPlanOverride: false,
        nightOutput: 0,
        nightActualHours: 0,
        finalShortage: targetQty,
        poolNightUsedTb: 0,
        poolNightPeerCount: 0,
        isPoolNightTbOver: false,
        isNightTbOver: false,
        isNightShiftCapOver: false,
        uphNight: 0,
        hoursNeeded: stdHours
      };
    });

    // 4b. Phân bổ Test Block theo Ca Ngày (10.83h) & Ca Đêm (10.58h) có khống chế nhóm "Dùng Chung"
    const priorityRows = processedRows
      .filter(r => {
        if (statusFilter === 'GAP_NEGATIVE') return r.gapQty < 0;
        if (statusFilter === 'GAP_POSITIVE') return r.gapQty >= 0 && (r.planQty > 0 || r.factQty > 0);
        return r.gapQty < 0 || r.planQty > 0;
      })
      .sort(compareHardtestPriorityRows);

    allocateHardtestShiftPool(priorityRows, {
      shiftSide: 'DAY',
      shiftHours: dayShiftHours,
      shiftSeconds: dayShiftSeconds,
      manualTbMap: window.AppStore.hardtestManualTbDay,
      legacyManualTbMap: window.AppStore.hardtestManualTb,
      manualManMap: window.AppStore.hardtestManualManDay,
      legacyManualManMap: window.AppStore.hardtestManualMan,
      manualPlanMap: window.AppStore.hardtestManualPlanDay,
      getTargetQty: r => r.targetQty
    });

    allocateHardtestShiftPool(priorityRows, {
      shiftSide: 'NIGHT',
      shiftHours: nightShiftHours,
      shiftSeconds: nightShiftSeconds,
      manualTbMap: window.AppStore.hardtestManualTbNight,
      legacyManualTbMap: null,
      manualManMap: window.AppStore.hardtestManualManNight,
      legacyManualManMap: null,
      manualPlanMap: window.AppStore.hardtestManualPlanNight,
      getTargetQty: r => r.nightShortage
    });

    processedRows.forEach(r => {
      r.manualTb = r.manualTbDay + r.manualTbNight;
      r.manualMan = r.manualManDay + r.manualManNight;
      r.hasTbOverride = r.hasDayTbOverride || r.hasNightTbOverride;
      r.hasManOverride = r.hasDayManOverride || r.hasNightManOverride;
      r.effectiveTb = r.manualTb;
      r.effectiveMan = r.manualMan;
      r.effectiveUph = Math.round(((r.uphDay || 0) + (r.uphNight || 0)) * 10) / 10;
      r.shiftOutput = (r.dayOutput || 0) + (r.nightOutput || 0);
      r.remainingShortage = r.finalShortage;
    });

    const isUnfilteredHardtestStage = stageSubFilter === 'ALL' && groupFilter === 'ALL' && !searchVal && (statusFilter === 'GAP_NEGATIVE' || statusFilter === 'ALL' || statusFilter === 'SHORTAGE');
    const htGate = evaluateCumNegativeGate(
      'TOTAL_HARDTEST',
      processedRows.map(r => ({
        rowKey: r.rowId,
        modelName: r.model1c || r.group || '',
        group: r.normGroup || r.group || '',
        gapQty: r.gapQty,
        isCumNeg: !!(r.planMeta && r.planMeta.isCumNegative && r.gapQty < 0),
        plannedOutput: (r.dayOutput || 0) + (r.nightOutput || 0),
        hasNote: hasSimRowPlanningNote(r.rowId, r.model1c, r.group)
      })),
      `${simFromDate}_${simToDate}`,
      isUnfilteredHardtestStage
    );

    // 5. Filtering logic
    let filteredRows = processedRows;
    if (stageSubFilter !== 'ALL') {
      filteredRows = filteredRows.filter(r => r.stage === stageSubFilter);
    }
    if (groupFilter !== 'ALL') {
      filteredRows = filteredRows.filter(r => r.group === groupFilter || r.normGroup === groupFilter);
    }
    if (statusFilter === 'GAP_NEGATIVE') {
      filteredRows = filteredRows.filter(r => r.gapQty < 0);
    } else if (statusFilter === 'GAP_POSITIVE') {
      filteredRows = filteredRows.filter(r => r.gapQty >= 0 && (r.planQty > 0 || r.factQty > 0));
    } else if (statusFilter === 'HAS_PLAN') {
      filteredRows = filteredRows.filter(r => r.planQty > 0);
    } else if (statusFilter === 'SHORTAGE') {
      filteredRows = filteredRows.filter(r => r.remainingShortage > 0 || r.reqTb > r.availTb || r.gapQty < 0);
    } else if (statusFilter === 'ALL') {
      // Khi chọn ALL, nếu không có search thì hiển thị các mã có phát sinh Kế hoạch hoặc Thực tế
      if (!searchVal) {
        filteredRows = filteredRows.filter(r => r.planQty > 0 || r.factQty > 0);
      }
    }
    if (searchVal) {
      filteredRows = filteredRows.filter(r =>
        (r.group || '').toLowerCase().includes(searchVal) ||
        (r.normGroup || '').toLowerCase().includes(searchVal) ||
        (r.model1c || '').toLowerCase().includes(searchVal) ||
        (r.board || '').toLowerCase().includes(searchVal) ||
        (r.stage || '').toLowerCase().includes(searchVal)
      );
    }

    // 6. Sorting: Ưu tiên Model Âm luỹ kế lên đầu, tiếp theo đến các Model thiếu hụt ngày hiện tại (âm nhiều nhất lên trước)
    filteredRows.sort(compareHardtestPriorityRows);

    // 7. Re-index STT & accumulate grand totals for filtered rows
    let grandPlan = 0;
    let grandFact = 0;
    let grandGap = 0;
    let shortageCount = 0;
    let grandReqTb = 0;
    let grandReqMan = 0;
    let grandStdHours = 0;
    let grandDayTb = 0;
    let grandDayMan = 0;
    let grandDayOutput = 0;
    let grandDayActualHours = 0;
    let grandNightShortage = 0;
    let grandNightTb = 0;
    let grandNightMan = 0;
    let grandNightOutput = 0;
    let grandNightActualHours = 0;
    let grandFinalShortage = 0;
    let grandDayTbHours = 0;
    let grandNightTbHours = 0;
    let grandDayManHours = 0;
    let grandNightManHours = 0;

    filteredRows.forEach((r, idx) => {
      r.displayIdx = idx + 1;
      grandPlan += r.planQty;
      grandFact += r.factQty;
      grandGap += r.gapQty;
      grandReqTb += r.reqTb;
      grandReqMan += r.reqMan;
      grandStdHours += r.stdHours;
      grandDayTb += r.manualTbDay;
      grandDayMan += r.manualManDay;
      grandDayOutput += r.dayOutput;
      grandDayActualHours += (r.dayActualHours || 0);
      grandNightShortage += r.nightShortage;
      grandNightTb += r.manualTbNight;
      grandNightMan += r.manualManNight;
      grandNightOutput += r.nightOutput;
      grandNightActualHours += (r.nightActualHours || 0);
      grandFinalShortage += r.finalShortage;

      const rowDayTbH = r.dayActualHours || 0;
      const rowNightTbH = r.nightActualHours || 0;
      const rowDayManH = (r.manualTbDay > 0 && r.manualManDay > 0) ? (rowDayTbH / r.manualTbDay) * r.manualManDay : 0;
      const rowNightManH = (r.manualTbNight > 0 && r.manualManNight > 0) ? (rowNightTbH / r.manualTbNight) * r.manualManNight : 0;
      grandDayTbHours += rowDayTbH;
      grandNightTbHours += rowNightTbH;
      grandDayManHours += rowDayManH;
      grandNightManHours += rowNightManH;

      if (r.gapQty < 0) shortageCount++;
    });

    window.AppStore.lastProcessedHardtestSimRows = filteredRows;

    // 8. Build Table Rows HTML (30 columns: Concept + FTT/Downtime + Giờ máy tiêu chuẩn/thực tế + Editable Output Plan + Pool Dùng Chung)
    const rowsHtml = filteredRows.map(r => {
      const isTbOverloaded = r.reqTb > r.availTb;
      const isDayTbOver = r.isDayTbOver || r.manualTbDay > r.availTb || r.isPoolDayTbOver;
      const isNightTbOver = r.isNightTbOver || r.manualTbNight > r.availTb || r.isPoolNightTbOver;
      const isDayManOver = r.manualTbDay > 0 && r.manualManDay * 2 < r.manualTbDay;
      const isNightManOver = r.manualTbNight > 0 && r.manualManNight * 2 < r.manualTbNight;
      const encodedRowId = encodeSimRowKey(r.rowId);
      const isHtRowCumNeg = !!(r.planMeta && r.planMeta.isCumNegative && r.gapQty < 0);
      const isHtRowLocked = !!(htGate && htGate.isBlocked && !isHtRowCumNeg);
      const htLockAttr = isHtRowLocked ? 'disabled' : '';
      const htLockClass = isHtRowLocked ? ' sim-input-locked' : '';
      const htLockTitleSuffix = isHtRowLocked
        ? ' [Đang khóa: Cần nhập Kế hoạch (>0) hoặc Lý do ở cột Ghi Chú cho các Model Âm luỹ kế trước]'
        : '';
      const gapColor = r.gapQty < 0 ? '#f87171' : r.gapQty > 0 ? '#34d399' : 'var(--text-muted)';
      const showPoolHint = r.isSharedPool || r.poolDayPeerCount > 1 || r.poolNightPeerCount > 1;
      const dayTbTitle = r.isPoolDayTbOver
        ? `⚠️ Nhóm ${r.poolNote || 'Dùng Chung'} đang dùng ${r.poolDayUsedTb}/${r.availTb} TB (vượt TB sẵn có!)`
        : (r.manualTbDay > r.availTb
            ? `⚠️ Đang dùng ${r.manualTbDay} TB vượt TB sẵn có (${r.availTb} TB)`
            : `Số Test Block Ca Ngày (Nhóm đang dùng ${r.poolDayUsedTb}/${r.availTb} TB • Tối đa 10.83h/TB)`);
      const nightTbTitle = r.isPoolNightTbOver
        ? `⚠️ Nhóm ${r.poolNote || 'Dùng Chung'} Ca Đêm đang dùng ${r.poolNightUsedTb}/${r.availTb} TB (vượt TB sẵn có!)`
        : (r.manualTbNight > r.availTb
            ? `⚠️ Đang dùng ${r.manualTbNight} TB vượt TB sẵn có (${r.availTb} TB)`
            : `Số Test Block Ca Đêm (Nhóm đang dùng ${r.poolNightUsedTb}/${r.availTb} TB • Tối đa 10.58h/TB)`);

      return `
        <tr class="hover-row${isHtRowCumNeg ? ' sim-row-cumneg-priority' : ''}${isHtRowLocked ? ' sim-row-locked-current-day' : ''}" data-row-key="${encodedRowId}" data-is-cumneg="${isHtRowCumNeg ? '1' : '0'}" data-row-locked="${isHtRowLocked ? '1' : '0'}">
          <td class="sticky-sim-stt" style="text-align: center; color: var(--text-muted); font-size: 0.78rem;">${r.displayIdx}</td>
          <td class="sticky-sim-stage" style="text-align: center; white-space: nowrap;">
            <span class="badge ${r.stage === 'HARD TEST' ? 'badge-stage-hardtest' : r.stage === 'OPTICS ASM' ? 'badge-stage-optics' : 'badge-stage-focus'}">${r.stage}</span>
          </td>
          <td class="sticky-sim-group" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.825rem; font-weight: 700; color: var(--text-primary);" title="${r.normGroup || r.group || '--'}">
            ${r.normGroup || r.group || '--'}
          </td>
          <td class="sticky-sim-model">
            <div style="display: flex; flex-direction: column; gap: 0.12rem;">
              <span class="font-mono" style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); word-break: break-word; line-height: 1.35;" title="${r.model1c}">${r.model1c}</span>
              ${r.board && r.board !== r.model1c ? `<span class="font-mono" style="font-size: 0.67rem; color: var(--text-muted);" title="Định mức Test Block theo bo mạch: ${r.board}">⚙️ ${r.board}</span>` : ''}
            </div>
          </td>
          <!-- Kế Hoạch (Plan): Số mặc định không chỉnh sửa -->
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #60a5fa; font-size: 0.825rem; padding: 0.35rem 0.45rem;" title="Kế hoạch sản lượng (Pcs) mặc định theo dữ liệu Bảng 2">
            ${r.planQty.toLocaleString('vi-VN')}
          </td>
          <!-- Thực Tế (Fact) -->
          <td class="font-mono" style="text-align: right; font-size: 0.825rem; font-weight: 700; color: #34d399; padding: 0.35rem 0.45rem;" title="Sản lượng thực tế đã sản xuất trong giai đoạn">
            ${r.factQty.toLocaleString('vi-VN')}
          </td>
          <!-- Chênh Lệch (Gap) -->
          <td class="font-mono" style="text-align: right; font-size: 0.825rem; font-weight: 800; padding: 0.35rem 0.45rem; color: ${gapColor};" title="Chênh lệch Thực tế - Kế hoạch (Âm là thiếu hụt)">
            ${r.gapQty !== 0 ? (r.gapQty > 0 ? '+' : '') + r.gapQty.toLocaleString('vi-VN') : '0'}
          </td>
          <!-- Date Plan & Shift Plan -->
          ${renderPlanDateAndShiftCellsHtml(r.planMeta)}
          <!-- Cycle Time Norm (CT Norm gốc trên sheet Hardtest Data, chưa gồm FTT/Downtime) -->
          <td style="text-align: right; padding: 0.35rem 0.45rem;" class="font-mono" title="Cycle Time Norm gốc trên sheet: ${r.ctNorm}s (CT Thực tế FTT+DT: ${r.ctMachineWithFttDt.toFixed(2)}s)">
            <span style="font-weight: 700; color: var(--text-primary); font-size: 0.825rem;">${r.ctNorm}</span>
          </td>
          <!-- FTT % (từ sheet Hardtest Data cột FTT %) -->
          <td style="text-align: right; padding: 0.35rem 0.45rem;" class="font-mono" title="Tỉ lệ Pass FTT % từ sheet Hardtest Data: ${r.fttPct}%">
            <span style="font-weight: 700; color: #34d399; font-size: 0.8rem;">${r.fttPct}%</span>
          </td>
          <!-- Downtime % (từ sheet Hardtest Data cột Total DownTime) -->
          <td style="text-align: right; padding: 0.35rem 0.45rem;" class="font-mono" title="Tổng Downtime (Total DownTime) từ sheet Hardtest Data: ${r.dtTotalPct}%">
            <span style="font-weight: 700; color: #f59e0b; font-size: 0.8rem;">${r.dtTotalPct}%</span>
          </td>
          <!-- TB Sẵn Có (Test Block) + Nhóm Dùng Chung -->
          <td style="text-align: center; padding: 0.3rem 0.35rem;" class="font-mono" title="Số lượng Test Block hiện có sẵn trong xưởng (${r.poolNote || 'Riêng'} • Ngày dùng ${r.poolDayUsedTb}/${r.availTb} • Đêm dùng ${r.poolNightUsedTb}/${r.availTb})">
            <span class="badge badge-ht-tb font-mono" style="font-weight: 800; ${r.isPoolDayTbOver || r.isPoolNightTbOver ? 'border-color: #f87171; color: #f87171;' : ''}">${r.availTb}</span>
            ${showPoolHint ? `<div style="font-size: 0.62rem; margin-top: 2px; font-weight: 700; color: ${r.isPoolDayTbOver || r.isPoolNightTbOver ? '#f87171' : '#38bdf8'}; white-space: nowrap;">Chung ${r.poolDayUsedTb}/${r.availTb}N</div>` : ''}
          </td>
          <!-- Số Test Block Cần -->
          <td style="text-align: center; padding: 0.35rem 0.35rem;" class="font-mono" title="Đề xuất Số Test Block cần = Math.ceil(${r.targetQty} ÷ ${Math.round(r.capaPer1TB)}) = ${r.reqTb} TB">
            ${r.reqTb > 0 ? `
              <span class="badge ${!isTbOverloaded ? 'badge-green' : 'badge-red'} font-mono" style="font-weight: 800;">${r.reqTb}</span>
            ` : `<span style="color: var(--text-muted); font-size: 0.78rem;">0</span>`}
          </td>
          <!-- Giờ máy cần tiêu chuẩn (KHÔNG tính FTT & Downtime): |Chênh Lệch| * CT_Norm / 3600 -->
          <td style="text-align: right; color: #fbbf24; font-weight: 800; font-size: 0.825rem; padding: 0.35rem 0.45rem;" class="font-mono" title="Giờ máy cần tiêu chuẩn (chưa tính FTT &amp; Downtime) = ${r.targetQty.toLocaleString('vi-VN')} × ${r.ctNorm}s ÷ 3600 = ${r.stdHours.toFixed(2)}h">
            ${r.stdHours > 0 ? r.stdHours.toFixed(1) : '0.0'}
          </td>

          <!-- CỤM CA NGÀY (10.83h) -->
          <td style="text-align: center; font-size: 0.8rem; font-weight: 600; color: ${dayShiftHours > 0 ? 'var(--text-secondary)' : '#64748b'}; white-space: nowrap; padding: 0.35rem 0.35rem;">
            Ca Ngày
          </td>
          <td style="text-align: center; padding: 0.25rem 0.3rem;">
            <input type="number" min="0" max="50" class="sim-manual-input${htLockClass} font-mono" ${htLockAttr} style="width: 58px; ${isDayTbOver ? 'border-color: #f87171; color: #f87171;' : ''}" value="${r.manualTbDay}" onchange="handleHardtestManualTbDayChange('${encodedRowId}', this.value)" title="${dayTbTitle}${htLockTitleSuffix}">
          </td>
          <td style="text-align: center; padding: 0.25rem 0.3rem;">
            <input type="number" min="0" max="50" class="sim-manual-input sim-manual-input-man${htLockClass} font-mono" ${htLockAttr} style="width: 58px; ${isDayManOver ? 'border-color: #fbbf24;' : ''}" value="${r.manualManDay}" onchange="handleHardtestManualManDayChange('${encodedRowId}', this.value)" title="${isDayManOver ? `⚠️ Quá tải: ${r.manualManDay} người vận hành ${r.manualTbDay} TB (chuẩn 1 người / 2 TB)` : 'Số người sử dụng Ca Ngày (Chuẩn 1 người / 2 TB)'}${htLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input${htLockClass} font-mono" ${htLockAttr} value="${r.dayOutput > 0 ? r.dayOutput.toLocaleString('vi-VN') : (r.targetQty > 0 ? '0' : '')}" placeholder="0" onchange="handleHardtestManualPlanDayChange('${encodedRowId}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 72px; padding: 0.16rem 0.32rem; font-size: 0.8rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid ${r.isDayShiftCapOver ? '#f87171' : (r.hasDayPlanOverride ? '#22d3ee' : 'rgba(56, 189, 248, 0.35)')}; border-radius: 6px; outline: none; text-align: right;" title="${r.isDayShiftCapOver ? `⚠️ Output ${r.dayOutput.toLocaleString('vi-VN')} cần ${r.dayActualHours.toFixed(1)}h vượt công suất ${r.manualTbDay} TB × 10.83h (${(r.manualTbDay * dayShiftHours).toFixed(1)}h)` : `Sửa OUTPUT PLAN DAY (Tối đa ${dayShiftHours.toFixed(2)}h/TB × ${r.manualTbDay} TB • Để trống để tự động tính)`}${htLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${r.isDayShiftCapOver ? '#f87171' : '#38bdf8'}; font-size: 0.825rem; padding: 0.35rem 0.45rem;" title="Giờ máy cần thực tế Ca Ngày (đã tính FTT ${r.fttPct}% &amp; Downtime ${r.dtTotalPct}%) = ${r.dayOutput.toLocaleString('vi-VN')} × ${r.ctMachineWithFttDt.toFixed(2)}s ÷ 3600 = ${r.dayActualHours.toFixed(2)}h${r.manualTbDay > 0 ? ` (${(r.dayActualHours / r.manualTbDay).toFixed(2)}h/TB)` : ''}">
            ${r.dayActualHours > 0 ? r.dayActualHours.toFixed(1) : '0.0'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; font-size: 0.825rem; padding: 0.35rem 0.45rem; color: ${r.nightShortage > 0 ? '#f87171' : '#34d399'};" title="Số lượng còn thiếu sau Ca Ngày (chuyển tiếp sang Ca Đêm)">
            ${r.nightShortage > 0 ? '-' + r.nightShortage.toLocaleString('vi-VN') : '0'}
          </td>

          <!-- CỤM CA ĐÊM (10.58h) -->
          <td style="text-align: center; font-size: 0.8rem; font-weight: 600; color: ${nightShiftHours > 0 ? '#c084fc' : '#64748b'}; white-space: nowrap; padding: 0.35rem 0.35rem;">
            Ca Đêm
          </td>
          <td style="text-align: center; padding: 0.25rem 0.3rem;">
            <input type="number" min="0" max="50" class="sim-manual-input sim-manual-input-night${htLockClass} font-mono" ${htLockAttr} style="width: 58px; ${isNightTbOver ? 'border-color: #f87171; color: #f87171;' : ''}" value="${r.manualTbNight}" onchange="handleHardtestManualTbNightChange('${encodedRowId}', this.value)" title="${nightTbTitle}${htLockTitleSuffix}">
          </td>
          <td style="text-align: center; padding: 0.25rem 0.3rem;">
            <input type="number" min="0" max="50" class="sim-manual-input sim-manual-input-man${htLockClass} font-mono" ${htLockAttr} style="width: 58px; ${isNightManOver ? 'border-color: #fbbf24;' : ''}" value="${r.manualManNight}" onchange="handleHardtestManualManNightChange('${encodedRowId}', this.value)" title="${isNightManOver ? `⚠️ Quá tải: ${r.manualManNight} người vận hành ${r.manualTbNight} TB (chuẩn 1 người / 2 TB)` : 'Số người sử dụng Ca Đêm (Chuẩn 1 người / 2 TB)'}${htLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input${htLockClass} font-mono" ${htLockAttr} value="${r.nightOutput > 0 ? r.nightOutput.toLocaleString('vi-VN') : (r.nightShortage > 0 ? '0' : '')}" placeholder="0" onchange="handleHardtestManualPlanNightChange('${encodedRowId}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 72px; padding: 0.16rem 0.32rem; font-size: 0.8rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid ${r.isNightShiftCapOver ? '#f87171' : (r.hasNightPlanOverride ? '#e879f9' : 'rgba(192, 132, 252, 0.35)')}; border-radius: 6px; outline: none; text-align: right;" title="${r.isNightShiftCapOver ? `⚠️ Output ${r.nightOutput.toLocaleString('vi-VN')} cần ${r.nightActualHours.toFixed(1)}h vượt công suất ${r.manualTbNight} TB × 10.58h (${(r.manualTbNight * nightShiftHours).toFixed(1)}h)` : `Output Plan Ca Đêm (${nightShiftHours.toFixed(2)}h/TB × ${r.manualTbNight} TB • Có thể nhập tay hoặc để trống để tự động tính)`}${htLockTitleSuffix}">
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: ${r.isNightShiftCapOver ? '#f87171' : '#c084fc'}; font-size: 0.825rem; padding: 0.35rem 0.45rem;" title="Giờ máy cần thực tế Ca Đêm (đã tính FTT ${r.fttPct}% &amp; Downtime ${r.dtTotalPct}%) = ${r.nightOutput.toLocaleString('vi-VN')} × ${r.ctMachineWithFttDt.toFixed(2)}s ÷ 3600 = ${r.nightActualHours.toFixed(2)}h${r.manualTbNight > 0 ? ` (${(r.nightActualHours / r.manualTbNight).toFixed(2)}h/TB)` : ''}">
            ${r.nightActualHours > 0 ? r.nightActualHours.toFixed(1) : '0.0'}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; font-size: 0.825rem; padding: 0.35rem 0.45rem; color: ${r.finalShortage > 0 ? '#f87171' : '#34d399'};" title="Số lượng còn thiếu tổng sau cả Ca Ngày & Ca Đêm">
            ${r.finalShortage > 0 ? '-' + r.finalShortage.toLocaleString('vi-VN') : '0'}
          </td>
          <!-- Ghi Chú -->
          <td style="text-align: left; padding: 0.2rem 0.35rem; min-width: 140px;">
            <input type="text" class="sim-table-note-input" data-row-key="${encodedRowId}" value="${(window.AppStore.simManualNotes && window.AppStore.simManualNotes[r.rowId]) ? String(window.AppStore.simManualNotes[r.rowId]).replace(/"/g, '&quot;') : ''}" placeholder="${isHtRowCumNeg ? 'Nhập lý do / ghi chú...' : 'Nhập ghi chú...'}" onchange="handleTableNoteChange(decodeURIComponent('${encodedRowId}'), this.value)" onkeydown="if(event.key==='Enter') this.blur();" title="Ghi chú cho Model ${(r.model1c || r.group || '').replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ')}">
          </td>
          <!-- Âm Từ Ngày / Ca -->
          ${renderAccumulatedNegativeOriginCellHtml(r.cumNegOriginMeta)}
          <!-- Check WIP -->
          <td style="text-align: center; white-space: nowrap; padding: 0.25rem 0.35rem;">
            <button type="button"
              class="btn btn-xs"
              onclick="handleCheckModelWip('${encodeSimRowKey(r.stage || 'HARD TEST')}', '${encodeSimRowKey(r.group || '')}', '${encodeSimRowKey(r.model1c || r.group || '')}', ${Number(r.gapQty || 0)}, '${simFromDate}', '${simToDate}')"
              style="padding: 0.2rem 0.55rem; font-size: 0.725rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;"
              title="Mở WIP Control và lọc đúng Model ${(r.model1c || r.group || '').replace(/"/g, '&quot;')} (${r.stage || 'HARD TEST'})">
              <span>📦 Check WIP</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // 8b. Compute Kíp Selection & Mini Summary Tables (Ảnh số 2 & Ảnh số 3 — đồng bộ 2 chiều Phần 1 Nhân Lực)
    const activeDayKips = getHardtestSelectedKips('DAY');
    const activeNightKips = getHardtestSelectedKips('NIGHT');
    const rawDayPeople = sumHardtestKipsHeadcount(activeDayKips);
    const rawNightPeople = sumHardtestKipsHeadcount(activeNightKips);
    const hasCustomDayPeople = window.AppStore.hardtestManpowerOverrideDay !== undefined && window.AppStore.hardtestManpowerOverrideDay !== null;
    const hasCustomNightPeople = window.AppStore.hardtestManpowerOverrideNight !== undefined && window.AppStore.hardtestManpowerOverrideNight !== null;
    const effectiveDayPeople = hasCustomDayPeople ? window.AppStore.hardtestManpowerOverrideDay : rawDayPeople;
    const effectiveNightPeople = hasCustomNightPeople ? window.AppStore.hardtestManpowerOverrideNight : rawNightPeople;
    const todaySheetKey = getHardtestTodaySheetKey();

    const totalShortageQtyAbs = Math.abs(grandGap) || 1;
    const dayCoverPct = grandDayOutput > 0 ? ((grandDayOutput / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';
    const nightCoverPct = grandNightOutput > 0 ? ((grandNightOutput / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';
    const remainShortagePct = grandFinalShortage > 0 ? ((grandFinalShortage / totalShortageQtyAbs) * 100).toFixed(1) : '0.0';
    const totalCoverPct = (grandDayOutput + grandNightOutput) > 0
      ? (((grandDayOutput + grandNightOutput) / totalShortageQtyAbs) * 100).toFixed(1)
      : '0.0';

    const htMiniSummaryPlanHtml = `
      <div class="sim-mini-kpi-card sim-mini-plan-summary">
        <table class="sim-mini-kpi-table">
          <thead>
            <tr>
              <th class="mini-kpi-th-title" style="color: #38bdf8; font-weight: 800; padding: 0.2rem 0.4rem;" title="Bảng tổng hợp tiến độ bù thiếu và phân bổ kế hoạch Total Hardtest">
                📊 Tổng Hợp KH
              </th>
              <th class="mini-kpi-th-line" style="color: #f87171; min-width: 66px; text-align: center;" title="Tổng sản lượng chênh lệch cần bù">Chênh Lệch</th>
              <th class="mini-kpi-th-line" style="color: #38bdf8; min-width: 68px; text-align: center;" title="Tổng Output Plan Ca Ngày">Plan Ca Ngày</th>
              <th class="mini-kpi-th-line" style="color: #c084fc; min-width: 68px; text-align: center;" title="Tổng Output Plan Ca Đêm">Plan Ca Đêm</th>
              <th class="mini-kpi-th-line" style="color: #f87171; min-width: 78px; text-align: center;" title="Tổng số lượng còn thiếu sau 2 ca">KH còn Thiếu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mini-kpi-label">Sản Lượng (pcs)</td>
              <td class="mini-kpi-val font-mono" style="color: #f87171; font-weight: 800;">
                ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 800;">
                ${grandDayOutput > 0 ? '+' + grandDayOutput.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 800;">
                ${grandNightOutput > 0 ? '+' + grandNightOutput.toLocaleString('vi-VN') : '0'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #f87171; font-weight: 800;">
                ${grandFinalShortage > 0 ? '-' + grandFinalShortage.toLocaleString('vi-VN') : '0'}
              </td>
            </tr>
            <tr>
              <td class="mini-kpi-label">Tổng TG Máy (h)</td>
              <td class="mini-kpi-val font-mono" style="color: #d97706; font-weight: 800;">
                ${grandStdHours > 0 ? grandStdHours.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 700;">
                ${grandDayTbHours > 0 ? grandDayTbHours.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 700;">
                ${grandNightTbHours > 0 ? grandNightTbHours.toFixed(1) + 'h' : '0.0h'}
              </td>
              <td class="mini-kpi-val font-mono" style="color: var(--text-muted);">
                ${(grandDayOutput + grandNightOutput) > 0 ? totalCoverPct + '%' : '0%'}
              </td>
            </tr>
            <tr>
              <td class="mini-kpi-label">Hiệu Quả Bù</td>
              <td class="mini-kpi-val font-mono" style="color: var(--text-muted);">100%</td>
              <td class="mini-kpi-val font-mono" style="color: #38bdf8; font-weight: 800;">
                ${dayCoverPct}%
              </td>
              <td class="mini-kpi-val font-mono" style="color: #c084fc; font-weight: 800;">
                ${nightCoverPct}%
              </td>
              <td class="mini-kpi-val font-mono" style="${grandFinalShortage === 0 ? 'color: #10b981; font-weight: 800;' : 'color: #f87171; font-weight: 800;'}">
                ${grandFinalShortage === 0 ? '✅ Hết thiếu' : '⚠️ Thiếu ' + remainShortagePct + '%'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Tổng TG có KH / Hiệu Suất tính theo đơn vị ca chuẩn (10.83h ngày / 10.58h đêm)
    const dayAvgShiftHours = (effectiveDayPeople > 0 && grandDayManHours > 0)
      ? Math.round((grandDayManHours / effectiveDayPeople) * 100) / 100
      : 0;
    const nightAvgShiftHours = (effectiveNightPeople > 0 && grandNightManHours > 0)
      ? Math.round((grandNightManHours / effectiveNightPeople) * 100) / 100
      : 0;

    let htMiniSummaryDayHtml = '';
    if (activeDayKips.length === 0) {
      htMiniSummaryDayHtml = `
        <div class="sim-mini-kpi-card sim-mini-day">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca ngày</th>
                <th style="color: #64748b; font-size: 0.68rem; font-weight: normal; padding: 0.18rem 0.45rem;">(Chưa chọn Kíp)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="mini-kpi-label">Tổng TG có</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Tổng TG có KH</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Hiệu Suất</td><td class="mini-kpi-val">-</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      const dayEffPct = dayAvgShiftHours > 0 ? ((dayAvgShiftHours / 10.83) * 100).toFixed(2) : null;
      const dayEffNum = dayEffPct ? parseFloat(dayEffPct) : 0;
      htMiniSummaryDayHtml = `
        <div class="sim-mini-kpi-card sim-mini-day">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca ngày</th>
                ${activeDayKips.map(kip => {
                  const hc = getHardtestKipHeadcount(kip);
                  return `<th class="mini-kpi-th-line">${kip} <span style="display: inline-block; margin-left: 0.2rem; padding: 0.05rem 0.3rem; font-size: 0.64rem; border-radius: 4px; background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.45); font-weight: 800;">${hc} ng</span></th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mini-kpi-label">Tổng TG có</td>
                ${activeDayKips.map(() => `<td class="mini-kpi-val font-mono">10.83</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Tổng TG có KH</td>
                ${activeDayKips.map(() => `<td class="mini-kpi-val font-mono" style="${dayAvgShiftHours > 0 ? 'color: #38bdf8; font-weight: 700;' : 'color: #64748b;'}" title="Tổng giờ công nhân lực Ca Ngày: ${grandDayManHours.toFixed(1)}h ÷ ${effectiveDayPeople} người">${dayAvgShiftHours > 0 ? dayAvgShiftHours.toFixed(2) : ''}</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Hiệu Suất</td>
                ${activeDayKips.map(() => `<td class="mini-kpi-val font-mono" style="${dayEffPct ? (dayEffNum > 100 ? 'color: #f87171; font-weight: 800;' : 'color: #34d399; font-weight: 800;') : 'color: #64748b;'}">${dayEffPct ? dayEffPct + '%' : ''}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    let htMiniSummaryNightHtml = '';
    if (activeNightKips.length === 0) {
      htMiniSummaryNightHtml = `
        <div class="sim-mini-kpi-card sim-mini-night">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca đêm</th>
                <th style="color: #64748b; font-size: 0.68rem; font-weight: normal; padding: 0.18rem 0.45rem;">(Chưa chọn Kíp)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="mini-kpi-label">Tổng TG có</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Tổng TG có KH</td><td class="mini-kpi-val">-</td></tr>
              <tr><td class="mini-kpi-label">Hiệu Suất</td><td class="mini-kpi-val">-</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      const nightEffPct = nightAvgShiftHours > 0 ? ((nightAvgShiftHours / 10.58) * 100).toFixed(2) : null;
      const nightEffNum = nightEffPct ? parseFloat(nightEffPct) : 0;
      htMiniSummaryNightHtml = `
        <div class="sim-mini-kpi-card sim-mini-night">
          <table class="sim-mini-kpi-table">
            <thead>
              <tr>
                <th class="mini-kpi-th-title">Ca đêm</th>
                ${activeNightKips.map(kip => {
                  const hc = getHardtestKipHeadcount(kip);
                  return `<th class="mini-kpi-th-line">${kip} <span style="display: inline-block; margin-left: 0.2rem; padding: 0.05rem 0.3rem; font-size: 0.64rem; border-radius: 4px; background: rgba(192, 132, 252, 0.18); border: 1px solid rgba(192, 132, 252, 0.45); font-weight: 800;">${hc} ng</span></th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mini-kpi-label">Tổng TG có</td>
                ${activeNightKips.map(() => `<td class="mini-kpi-val font-mono">10.58</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Tổng TG có KH</td>
                ${activeNightKips.map(() => `<td class="mini-kpi-val font-mono" style="${nightAvgShiftHours > 0 ? 'color: #c084fc; font-weight: 700;' : 'color: #64748b;'}" title="Tổng giờ công nhân lực Ca Đêm: ${grandNightManHours.toFixed(1)}h ÷ ${effectiveNightPeople} người">${nightAvgShiftHours > 0 ? nightAvgShiftHours.toFixed(2) : ''}</td>`).join('')}
              </tr>
              <tr>
                <td class="mini-kpi-label">Hiệu Suất</td>
                ${activeNightKips.map(() => `<td class="mini-kpi-val font-mono" style="${nightEffPct ? (nightEffNum > 100 ? 'color: #f87171; font-weight: 800;' : 'color: #34d399; font-weight: 800;') : 'color: #64748b;'}">${nightEffPct ? nightEffPct + '%' : ''}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    const activeDayKipSet = new Set(activeDayKips);
    const activeNightKipSet = new Set(activeNightKips);

    return `
      <!-- 1. CHỌN KÍP HARDTEST CA NGÀY / CA ĐÊM (ẢNH SỐ 2) & TỔNG HỢP KH (ẢNH SỐ 3) -->
      <div class="sim-dispatch-card" id="hardtestDispatchPanel" style="padding: 0.45rem 0.65rem; margin-bottom: 0.55rem; display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 0.55rem; flex-wrap: wrap;">
        <div style="display: flex; flex-direction: column; gap: 0.35rem; flex: 0 0 auto;">
          <!-- Ca Ngày (10.83h) -->
          <div class="sim-shift-row" style="margin-bottom: 0; padding: 0.25rem 0.5rem; flex-wrap: nowrap; gap: 0.4rem;">
            <span class="sim-shift-badge-day" style="font-weight: 800; min-width: 118px; justify-content: center; padding: 0.2rem 0.4rem; font-size: 0.72rem;">
              <span>☀️</span>
              <span>CA NGÀY (10.83h)</span>
            </span>
            <div class="sim-line-toggle-chips" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
              ${HARDTEST_KIP_OPTIONS.map(kip => {
                const isActive = activeDayKipSet.has(kip);
                const hc = getHardtestKipHeadcount(kip);
                return `
                  <span class="sim-line-toggle-chip ${isActive ? 'is-day-active' : ''}" data-ht-shift="DAY" data-ht-kip="${kip}" onclick="handleToggleHardtestWorkingKip('DAY', '${kip}')" title="Bấm để bật/tắt ${kip} (${hc} người) Ca Ngày • Tự đồng bộ Phần 1 (${todaySheetKey})">
                    ${isActive ? '✓ ' : ''}${kip}
                  </span>
                `;
              }).join('')}
            </div>
            ${hasCustomDayPeople ? `<span class="badge" style="margin-left: 0.25rem; font-size: 0.7rem; font-weight: 800; background: rgba(245, 158, 11, 0.14); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.35); padding: 0.18rem 0.45rem;" title="Nhân lực nhập trực tiếp tại Phần 1 (${todaySheetKey})">👥 ${effectiveDayPeople} ng (Tab 1)</span>` : ''}
          </div>

          <!-- Ca Đêm (10.58h) -->
          <div class="sim-shift-row" style="margin-bottom: 0; padding: 0.25rem 0.5rem; flex-wrap: nowrap; gap: 0.4rem;">
            <span class="sim-shift-badge-night" style="font-weight: 800; min-width: 118px; justify-content: center; padding: 0.2rem 0.4rem; font-size: 0.72rem;">
              <span>🌙</span>
              <span>CA ĐÊM (10.58h)</span>
            </span>
            <div class="sim-line-toggle-chips" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: nowrap;">
              ${HARDTEST_KIP_OPTIONS.map(kip => {
                const isActive = activeNightKipSet.has(kip);
                const hc = getHardtestKipHeadcount(kip);
                return `
                  <span class="sim-line-toggle-chip ${isActive ? 'is-night-active' : ''}" data-ht-shift="NIGHT" data-ht-kip="${kip}" onclick="handleToggleHardtestWorkingKip('NIGHT', '${kip}')" title="Bấm để bật/tắt ${kip} (${hc} người) Ca Đêm • Tự đồng bộ Phần 1 (${todaySheetKey})">
                    ${isActive ? '✓ ' : ''}${kip}
                  </span>
                `;
              }).join('')}
            </div>
            ${hasCustomNightPeople ? `<span class="badge" style="margin-left: 0.25rem; font-size: 0.7rem; font-weight: 800; background: rgba(168, 85, 247, 0.14); color: #9333ea; border: 1px solid rgba(168, 85, 247, 0.35); padding: 0.18rem 0.45rem;" title="Nhân lực nhập trực tiếp tại Phần 1 (${todaySheetKey})">👥 ${effectiveNightPeople} ng (Tab 1)</span>` : ''}
          </div>
        </div>

        <div class="sim-mini-kpis-wrapper" style="display: flex; gap: 0.4rem; align-items: stretch; justify-content: flex-end; flex-shrink: 0; margin-left: auto; flex-wrap: wrap;">
          ${htMiniSummaryPlanHtml}
          ${htMiniSummaryDayHtml}
          ${htMiniSummaryNightHtml}
        </div>
      </div>

      <!-- 2. HARDTEST SIMULATOR FILTER TOOLBAR -->
      <div class="card" style="margin-bottom: 0.65rem; padding: 0.65rem 0.9rem; border: 1px solid var(--border-glass);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: #22d3ee; display: flex; align-items: center; gap: 0.5rem;">
            <span>🧮</span> BẢNG GIẢ LẬP TẢI TEST BLOCK &amp; NHÂN LỰC (TOTAL HARDTEST)
          </h3>

          <!-- Date Range Picker (Từ Ngày Đến Ngày) -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.775rem; font-weight: 700; color: #38bdf8;">📅 Giai đoạn kế hoạch:</span>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid rgba(56,189,248,0.35);">
              <span style="font-size: 0.72rem; color: var(--text-muted);">Từ:</span>
              <input type="date" id="hardtest-sim-from-date" class="font-mono select-filter" style="padding: 0.2rem 0.4rem; font-size: 0.775rem; color: var(--text-primary); background: var(--bg-input); border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;" value="${simFromDate}" onchange="handleHardtestSimFromDateChange(this.value)">
              <span style="font-size: 0.72rem; color: var(--text-muted);">Đến:</span>
              <input type="date" id="hardtest-sim-to-date" class="font-mono select-filter" style="padding: 0.2rem 0.4rem; font-size: 0.775rem; color: var(--text-primary); background: var(--bg-input); border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;" value="${simToDate}" onchange="handleHardtestSimToDateChange(this.value)">
            </div>
          </div>
        </div>

        <!-- Toolbar & Filters -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem; padding-top: 0.5rem; border-top: 1px solid var(--border-glass);">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <!-- Sub Stage Filter -->
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #22d3ee;">🔬 Công Đoạn:</span>
              <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 140px;" onchange="handleHardtestSimStageFilterChange(this.value)">
                <option value="ALL" ${stageSubFilter === 'ALL' ? 'selected' : ''}>Tất cả Total Hardtest</option>
                <option value="HARD TEST" ${stageSubFilter === 'HARD TEST' ? 'selected' : ''}>Hard Test</option>
                <option value="OPTICS ASM" ${stageSubFilter === 'OPTICS ASM' ? 'selected' : ''}>Optics ASM</option>
                <option value="FOCUS" ${stageSubFilter === 'FOCUS' ? 'selected' : ''}>Focus</option>
              </select>
            </div>

            <!-- Group Model Filter -->
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #60a5fa;">🏷️ Group:</span>
              <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 155px;" onchange="handleHardtestSimGroupFilterChange(this.value)">
                <option value="ALL" ${groupFilter === 'ALL' ? 'selected' : ''}>Tất cả Group Model</option>
                ${(htData.groups || []).map(g => `<option value="${g.group}" ${groupFilter === g.group ? 'selected' : ''}>${g.group}</option>`).join('')}
              </select>
            </div>

            <!-- Plan Status Filter -->
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #f87171;">📊 Lọc Kế Hoạch:</span>
              <select id="hardtest-sim-status-filter" class="select-filter font-mono" style="font-size: 0.775rem; min-width: 175px;" onchange="handleHardtestSimStatusFilterChange(this.value)">
                <option value="GAP_NEGATIVE" ${statusFilter === 'GAP_NEGATIVE' ? 'selected' : ''}>⚠️ Đang Thiếu Hụt (Gap &lt; 0)</option>
                <option value="GAP_POSITIVE" ${statusFilter === 'GAP_POSITIVE' ? 'selected' : ''}>✅ Đang Thặng Dư (Gap ≥ 0)</option>
                <option value="HAS_PLAN" ${statusFilter === 'HAS_PLAN' ? 'selected' : ''}>📦 Có Kế Hoạch (Plan &gt; 0)</option>
                <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>Tất Cả Mã Phát Sinh</option>
              </select>
            </div>

            <!-- Search Box -->
            <div class="search-box" style="min-width: 170px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" class="search-input" placeholder="Tìm Model, mã 1C..." value="${searchVal}" oninput="handleHardtestSimSearch(this.value)">
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <button type="button" class="btn btn-secondary" onclick="handleResetAllHardtestManual()" style="padding: 0.3rem 0.6rem; font-size: 0.725rem; color: #34d399; border-color: rgba(16, 185, 129, 0.4);" title="Đặt lại tất cả số TB &amp; Người về đề xuất chuẩn">
              <span>↺ Đặt lại đề xuất</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. MAIN HARDTEST PLAN & SIMULATION TABLE (THEO CONCEPT ẢNH SỐ 2 + CA NGÀY / CA ĐÊM SONG SONG) -->
      <div class="sim-table-wrap">
        <div class="sim-table-header" style="padding: 0.4rem 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            ${renderSimPlanActionButtonsHtml(plannerName, simHistoryCount)}
          </div>
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            <button type="button" class="sim-btn-export-sheet" onclick="handleExportHardtestSimCSV()" title="Xuất toàn bộ bảng điều độ Total Hardtest ra file CSV (29 cột kèm FTT, Downtime, Giờ máy tiêu chuẩn/thực tế, Ghi Chú &amp; Âm Từ Ngày / Ca)">
              <span>📥 Xuất Sheet CSV</span>
            </button>
            <button type="button" class="sim-btn-copy-sheet" onclick="handleCopyHardtestSimClipboard()" title="Sao chép bảng điều độ Total Hardtest (29 cột) vào Clipboard để dán vào Google Sheets">
              <span>📋 Copy Cho Google Sheet</span>
            </button>
            <span style="font-size: 0.725rem; color: var(--text-muted); margin-left: 0.2rem;">
              Đang hiển thị: <strong>${filteredRows.length}</strong> Mã
            </span>
          </div>
        </div>

        <!-- BANNER THÔNG BÁO KẾ HOẠCH MỚI VỪA HOÀN THÀNH TỪ USER KHÁC -->
        ${renderSimNewPlanBannerHtml()}
        ${renderCumNegPriorityBannerHtml(htGate, 'TOTAL_HARDTEST')}

        <div id="hardtestSimTableScrollWrapper" style="overflow-x: auto; max-height: calc(100vh - 290px);">
          <table class="sim-table" id="hardtest-sim-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
            <thead>
              <!-- HÀNG 0: TỔNG CHI TIẾT THEO TỪNG CỘT (STICKY TOP: 0) -->
              <tr class="sim-sticky-totals-row">
                <th class="sticky-sim-stt"></th>
                <th class="sticky-sim-stage"></th>
                <th class="sticky-sim-group" style="text-align: center; color: #fbbf24; font-size: 0.725rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0.35rem 0.25rem;" title="Người lập Plan: ${plannerName}">
                  👤 ${plannerName}
                </th>
                <th class="sticky-sim-model" style="text-align: right; color: var(--text-primary); font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.65rem;">
                  Tổng Cộng :
                </th>
                <th class="font-mono" style="text-align: right; color: #60a5fa; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandPlan.toLocaleString('vi-VN')}
                </th>
                <th class="font-mono" style="text-align: right; color: #34d399; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandFact.toLocaleString('vi-VN')}
                </th>
                <th class="font-mono" style="text-align: right; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem; ${grandGap < 0 ? 'color: #f87171;' : grandGap > 0 ? 'color: #34d399;' : 'color: var(--text-muted);'}">
                  ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'}
                </th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th style="padding: 0.35rem 0.35rem;"></th>
                <th class="font-mono" style="text-align: right; color: #fbbf24; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;" title="Tổng Giờ máy cần tiêu chuẩn (chưa tính FTT &amp; Downtime)">
                  ${grandStdHours.toFixed(1)}
                </th>
                <!-- Cụm Ca Ngày -->
                <th style="padding: 0.35rem 0.25rem;"></th>
                <th class="font-mono" style="text-align: center; color: #38bdf8; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.3rem;">
                  ${grandDayTb > 0 ? grandDayTb.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: center; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.3rem;">
                  ${grandDayMan > 0 ? grandDayMan.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #38bdf8; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandDayOutput > 0 ? grandDayOutput.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #38bdf8; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;" title="Tổng Giờ máy cần thực tế Ca Ngày (đã tính FTT &amp; Downtime)">
                  ${grandDayActualHours > 0 ? grandDayActualHours.toFixed(1) : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #f87171; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandNightShortage > 0 ? '-' + grandNightShortage.toLocaleString('vi-VN') : ''}
                </th>
                <!-- Cụm Ca Đêm -->
                <th style="padding: 0.35rem 0.25rem;"></th>
                <th class="font-mono" style="text-align: center; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.3rem;">
                  ${grandNightTb > 0 ? grandNightTb.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: center; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.3rem;">
                  ${grandNightMan > 0 ? grandNightMan.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandNightOutput > 0 ? grandNightOutput.toLocaleString('vi-VN') : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #c084fc; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;" title="Tổng Giờ máy cần thực tế Ca Đêm (đã tính FTT &amp; Downtime)">
                  ${grandNightActualHours > 0 ? grandNightActualHours.toFixed(1) : ''}
                </th>
                <th class="font-mono" style="text-align: right; color: #f87171; font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.45rem;">
                  ${grandFinalShortage > 0 ? '-' + grandFinalShortage.toLocaleString('vi-VN') : ''}
                </th>
                <th style="padding: 0.35rem 0.25rem;"></th>
                <th style="padding: 0.35rem 0.25rem;"></th>
                <th style="padding: 0.35rem 0.25rem;"></th>
              </tr>

              <!-- HÀNG 1: TIÊU ĐỀ 30 CỘT CHUẨN CONCEPT + FTT/DOWNTIME + GIỜ MÁY TIÊU CHUẨN/THỰC TẾ + CA NGÀY / CA ĐÊM + GHI CHÚ / ÂM TỪ NGÀY CA / CHECK WIP -->
              <tr class="sim-header-titles">
                <th class="sticky-sim-stt" style="text-align: center;">STT</th>
                <th class="sticky-sim-stage" style="text-align: center;">Công Đoạn</th>
                <th class="sticky-sim-group" style="text-align: left;">Group Model</th>
                <th class="sticky-sim-model" style="text-align: left;">Mã 1C</th>
                <th style="text-align: right; min-width: 88px; color: #60a5fa; padding: 0.35rem 0.35rem;">Kế Hoạch<br>(Plan)</th>
                <th style="text-align: right; min-width: 80px; color: #34d399; padding: 0.35rem 0.35rem;">Thực Tế<br>(Fact)</th>
                <th style="text-align: right; min-width: 82px; color: #f87171; padding: 0.35rem 0.35rem;">Chênh Lệch<br>(Gap)</th>
                <th style="text-align: center; min-width: 90px; color: #38bdf8; padding: 0.35rem 0.35rem;">Date Plan</th>
                <th style="text-align: center; min-width: 78px; color: #a78bfa; padding: 0.35rem 0.35rem;">Shift Plan</th>
                <th style="text-align: right; min-width: 78px; color: #38bdf8; padding: 0.35rem 0.35rem;" title="Cycle Time Norm gốc trên sheet Hardtest Data (chưa gồm FTT &amp; Downtime)">Cycle Time<br>Norm</th>
                <th style="text-align: right; min-width: 68px; color: #34d399; padding: 0.35rem 0.35rem;" title="Tỉ lệ Pass FTT % lấy từ sheet Hardtest Data (cột FTT %)">FTT</th>
                <th style="text-align: right; min-width: 78px; color: #f59e0b; padding: 0.35rem 0.35rem;" title="Tổng Downtime lấy từ sheet Hardtest Data (cột Total DownTime)">Downtime</th>
                <th style="text-align: center; min-width: 96px; color: #38bdf8; padding: 0.35rem 0.3rem;" title="Số Test Block sẵn có trên sheet Hardtest Data (nhóm Dùng Chung giới hạn tổng TB/ca)">TB Sẵn Có<br>(Test Block)</th>
                <th style="text-align: center; min-width: 90px; color: #10b981; padding: 0.35rem 0.3rem;">Số Test Block<br>Cần</th>
                <th style="text-align: right; min-width: 96px; color: #fbbf24; padding: 0.35rem 0.35rem;" title="Giờ máy cần tiêu chuẩn (KHÔNG tính FTT &amp; Downtime) = |Chênh lệch| × CT Norm ÷ 3600">Giờ máy cần<br>tiêu chuẩn</th>
                <!-- Cụm Ca Ngày -->
                <th style="text-align: center; min-width: 72px; color: #cbd5e1; padding: 0.35rem 0.25rem;">Ca Làm<br>Việc</th>
                <th style="text-align: center; min-width: 82px; color: #38bdf8; padding: 0.35rem 0.25rem;">Số Test Block<br>Dùng</th>
                <th style="text-align: center; min-width: 82px; color: #c084fc; padding: 0.35rem 0.25rem;">Số Người<br>Sử Dụng</th>
                <th style="text-align: right; min-width: 92px; color: #38bdf8; padding: 0.35rem 0.35rem;" title="Output Plan Ca Ngày (có thể chỉnh sửa trực tiếp, tự tính lại thiếu ca đêm &amp; giờ máy thực tế)">OUTPUT PLAN<br>DAY</th>
                <th style="text-align: right; min-width: 96px; color: #38bdf8; padding: 0.35rem 0.35rem;" title="Giờ máy cần thực tế Ca Ngày (ĐÃ tính FTT &amp; Downtime) = OUTPUT PLAN DAY × CT_Thực_Tế ÷ 3600">Giờ máy cần<br>thực tế</th>
                <th style="text-align: right; min-width: 98px; color: #f87171; padding: 0.35rem 0.35rem;">Số lượng còn<br>thiếu ca đêm</th>
                <!-- Cụm Ca Đêm -->
                <th style="text-align: center; min-width: 72px; color: #c084fc; padding: 0.35rem 0.25rem;">Ca Làm<br>Việc</th>
                <th style="text-align: center; min-width: 82px; color: #c084fc; padding: 0.35rem 0.25rem;">Số Test Block<br>Dùng</th>
                <th style="text-align: center; min-width: 82px; color: #c084fc; padding: 0.35rem 0.25rem;">Số Người<br>Sử Dụng</th>
                <th style="text-align: right; min-width: 92px; color: #c084fc; padding: 0.35rem 0.35rem;" title="Output Plan Ca Đêm (tự động theo TB Ca Đêm hoặc chỉnh sửa trực tiếp)">Output Plan<br>ca đêm</th>
                <th style="text-align: right; min-width: 96px; color: #c084fc; padding: 0.35rem 0.35rem;" title="Giờ máy cần thực tế Ca Đêm (ĐÃ tính FTT &amp; Downtime) = Output Plan ca đêm × CT_Thực_Tế ÷ 3600">Giờ máy cần<br>thực tế</th>
                <th style="text-align: right; min-width: 98px; color: #f87171; padding: 0.35rem 0.35rem;">Số lượng còn<br>thiếu tổng</th>
                <!-- Cụm Trailing tương tự Assembly -->
                <th style="text-align: left; min-width: 140px; color: #e2e8f0; padding: 0.35rem 0.35rem;">Ghi Chú</th>
                <th style="text-align: center; min-width: 132px; color: #fbbf24; padding: 0.35rem 0.35rem;" title="Truy xuất ngày và ca sản xuất (Ngày / Đêm) bắt đầu bị âm cho các Model Âm luỹ kế">Âm Từ<br>Ngày / Ca</th>
                <th style="text-align: center; min-width: 102px; color: #34d399; padding: 0.35rem 0.35rem;" title="Bấm để mở ngay tab WIP Control và lọc đúng Model này theo công đoạn">Check WIP</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : `
                <tr>
                  <td colspan="30" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                    <div style="font-weight: 700; color: #f8fafc;">Không tìm thấy mã nào phù hợp với bộ lọc</div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  window.handleCapacityStageChange = function(stage) {
    if (stage !== 'ASSEMBLY' && stage !== 'TOTAL_HARDTEST') {
      window.showToast('info', 'Công đoạn ' + stage + ' đang chuẩn hóa dữ liệu định mức!');
      return;
    }
    window.AppStore.selectedCapacityStage = stage;
    window.renderCapacityView();
    window.showToast('success', stage === 'TOTAL_HARDTEST' ? 'Đã chuyển sang công đoạn Total Hardtest (Hard Test / Optics / Focus)' : 'Đã chuyển sang công đoạn Assembly (Lắp ráp)');
  };

  // ==========================================
  // HARDTEST SPECIFIC EVENT HANDLERS
  // ==========================================
  window.handleHardtestSubStageChange = function(subStage) {
    window.AppStore.selectedHardtestSubStage = subStage;
    window.renderCapacityView();
    window.showToast('info', subStage === 'ALL' ? 'Tất cả công đoạn Hardtest' : `Đã lọc: ${subStage}`);
  };

  window.handleHardtestGroupChange = function(grp) {
    window.AppStore.selectedHardtestGroup = grp;
    window.renderCapacityView();
    window.showToast('info', grp === 'ALL' ? 'Tất cả Group Model' : `Đã lọc: ${grp}`);
  };

  window.handleHardtestMetricModeChange = function(mode) {
    window.AppStore.selectedHardtestMetricMode = mode;
    window.renderCapacityView();
  };

  window.handleResetHardtestFilters = function() {
    window.AppStore.selectedHardtestSubStage = 'ALL';
    window.AppStore.selectedHardtestGroup = 'ALL';
    window.AppStore.selectedHardtestMetricMode = 'ACTUAL';
    const sInput = document.getElementById('capacitySearchInput');
    if (sInput) sInput.value = '';
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại bộ lọc Total Hardtest về mặc định!');
  };

  window.handleExportHardtestCapacityCSV = function() {
    const sInput = document.getElementById('capacitySearchInput');
    const searchVal = sInput ? sInput.value : '';
    const items = window.AppStore.getFilteredHardtestCapacityItems({
      groupFilter: window.AppStore.selectedHardtestGroup || 'ALL',
      stageFilter: window.AppStore.selectedHardtestSubStage || 'ALL',
      search: searchVal
    });

    const headers = [
      'STT', 'Công Đoạn', 'Norming Group', 'Board or Operation', 'Ghi Chú',
      'Số Lượng TB (Test Block)', 'CT NOR 1 TB (s)', 'FTT (% Pass)', 'Downtime (%)',
      'CT Thực Tế (s)', 'UPH STD (pcs/h)', 'UPH Thực Tế (pcs/h)',
      'Capa Ca Ngày STD (10.83h)', 'Capa Ca Ngày Thực Tế (10.83h)',
      'Capa Ca Đêm STD (10.58h)', 'Capa Ca Đêm Thực Tế (10.58h)',
      'Capa Cả Ngày STD (21.41h)', 'Capa Cả Ngày Thực Tế (21.41h)'
    ];

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    items.forEach((it, idx) => {
      const row = [
        idx + 1,
        `"${it.stage}"`,
        `"${(it.group || '').replace(/"/g, '""')}"`,
        `"${(it.board || '').replace(/"/g, '""')}"`,
        `"${(it.note || '').replace(/"/g, '""')}"`,
        it.tbQty,
        it.ctNorm,
        it.fttPct,
        it.dtTotalPct,
        it.ctActual,
        it.uphStandard,
        it.uphActual,
        it.dayShiftCapacityStandard,
        it.dayShiftCapacityActual,
        it.nightShiftCapacityStandard,
        it.nightShiftCapacityActual,
        it.totalDayCapacityStandard,
        it.totalDayCapacityActual
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Total_Hardtest_Capacity_Planning_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('success', `Đã xuất ${items.length} dòng Total Hardtest ra file CSV!`);
  };

  window.handleCopyHardtestCapacityClipboard = function() {
    const sInput = document.getElementById('capacitySearchInput');
    const searchVal = sInput ? sInput.value : '';
    const items = window.AppStore.getFilteredHardtestCapacityItems({
      groupFilter: window.AppStore.selectedHardtestGroup || 'ALL',
      stageFilter: window.AppStore.selectedHardtestSubStage || 'ALL',
      search: searchVal
    });

    const headers = [
      'STT', 'Công Đoạn', 'Norming Group', 'Board or Operation', 'Ghi Chú',
      'Số Lượng TB (Test Block)', 'CT NOR 1 TB (s)', 'FTT (%)', 'Downtime (%)',
      'CT Thực Tế (s)', 'UPH STD (pcs/h)', 'UPH Thực Tế (pcs/h)',
      'Capa Ca Ngày STD (10.83h)', 'Capa Ca Ngày Thực Tế (10.83h)',
      'Capa Ca Đêm STD (10.58h)', 'Capa Ca Đêm Thực Tế (10.58h)',
      'Capa Cả Ngày STD (21.41h)', 'Capa Cả Ngày Thực Tế (21.41h)'
    ];

    let tsvContent = headers.join('\t') + '\n';
    items.forEach((it, idx) => {
      const row = [
        idx + 1,
        it.stage,
        it.group,
        it.board,
        it.note || '',
        it.tbQty,
        it.ctNorm,
        it.fttPct,
        it.dtTotalPct,
        it.ctActual,
        it.uphStandard,
        it.uphActual,
        it.dayShiftCapacityStandard,
        it.dayShiftCapacityActual,
        it.nightShiftCapacityStandard,
        it.nightShiftCapacityActual,
        it.totalDayCapacityStandard,
        it.totalDayCapacityActual
      ];
      tsvContent += row.join('\t') + '\n';
    });

    navigator.clipboard.writeText(tsvContent).then(() => {
      window.showToast('success', `📋 Đã sao chép ${items.length} dòng! Dán (Ctrl+V) vào Google Sheets.`);
    }).catch(() => {
      window.showToast('error', 'Không thể sao chép vào Clipboard.');
    });
  };

  window.handleHardtestSimBoardChange = function(boardId) {
    window.AppStore.selectedHardtestSimBoardId = boardId;
    window.renderCapacityView();
  };

  window.handleHardtestSimPlanQtyChange = function(qty) {
    window.AppStore.hardtestSimPlanQty = Math.max(1, parseInt(qty) || 1);
    window.renderCapacityView();
  };

  window.handleHardtestSimShiftTypeChange = function(shiftType) {
    window.AppStore.hardtestSimShiftType = shiftType;
    window.renderCapacityView();
  };

  window.handleHardtestSimFromDateChange = function(val) {
    if (!val) return;
    window.AppStore.hardtestSimFromDate = val;
    // Nếu ngày bắt đầu là Thứ 5, tự động tính ngày kết thúc là hết Thứ 4 tuần tiếp theo (+6 ngày)
    const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(val) : new Date(val);
    if (d && !isNaN(d.getTime()) && d.getDay() === 4) {
      const endWed = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
      const pad = n => String(n).padStart(2, '0');
      const toVal = `${endWed.getFullYear()}-${pad(endWed.getMonth() + 1)}-${pad(endWed.getDate())}`;
      window.AppStore.hardtestSimToDate = toVal;
      const toInp = document.getElementById('hardtest-sim-to-date');
      if (toInp) toInp.value = toVal;
    }
    window.renderCapacityView();
    window.showToast('info', `Total Hardtest: Đã chuyển kỳ ${window.AppStore.hardtestSimFromDate} ➜ ${window.AppStore.hardtestSimToDate || val}`);
  };

  window.handleHardtestSimToDateChange = function(val) {
    if (!val) return;
    window.AppStore.hardtestSimToDate = val;
    window.renderCapacityView();
    window.showToast('info', `Total Hardtest: Đã chuyển ngày kết thúc ${val}`);
  };

  window.handleHardtestSimDatePreset = function(fromD, toD) {
    window.AppStore.hardtestSimFromDate = fromD;
    window.AppStore.hardtestSimToDate = toD;
    window.renderCapacityView();
    window.showToast('success', `Total Hardtest: Đã chọn giai đoạn ${fromD} ➜ ${toD}`);
  };

  window.handleHardtestSimStageFilterChange = function(stage) {
    window.AppStore.hardtestSimStageFilter = stage;
    window.renderCapacityView();
  };

  window.handleHardtestSimGroupFilterChange = function(grp) {
    window.AppStore.hardtestSimGroupFilter = grp;
    window.renderCapacityView();
  };

  window.handleHardtestSimStatusFilterChange = function(status) {
    window.AppStore.hardtestSimStatusFilter = status;
    window.renderCapacityView();
  };

  window.handleHardtestSimSearch = function(val) {
    window.AppStore.hardtestSimSearchVal = val;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      window.renderCapacityView();
    }, 250);
  };

  window.handleHardtestPlanQtyChange = function(rawRowId, val) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Kế hoạch!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    const num = Math.max(0, parseInt(val, 10) || 0);
    if (!window.AppStore.hardtestPlanOverrides) window.AppStore.hardtestPlanOverrides = {};
    window.AppStore.hardtestPlanOverrides[rowId] = num;
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    window.showToast('info', `Đã cập nhật Kế hoạch: ${num.toLocaleString('vi-VN')} pcs`);
  };

  function updateHardtestShiftManualTb(rawRowId, val, shiftSide) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Test Block!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    if (!assertCumNegPriorityUnlocked(rowId, 'TOTAL_HARDTEST')) return;
    const num = Math.max(0, parseInt(val, 10) || 0);
    const tbKey = shiftSide === 'NIGHT' ? 'hardtestManualTbNight' : 'hardtestManualTbDay';
    const manKey = shiftSide === 'NIGHT' ? 'hardtestManualManNight' : 'hardtestManualManDay';
    const planKey = shiftSide === 'NIGHT' ? 'hardtestManualPlanNight' : 'hardtestManualPlanDay';
    if (!window.AppStore[tbKey]) window.AppStore[tbKey] = {};
    if (!window.AppStore[manKey]) window.AppStore[manKey] = {};
    window.AppStore[tbKey][rowId] = num;
    // Khi sửa tay số TB, xóa override Output Plan ca tương ứng để tính lại theo số TB mới
    if (window.AppStore[planKey]) delete window.AppStore[planKey][rowId];
    if (window.AppStore[manKey][rowId] === undefined) {
      window.AppStore[manKey][rowId] = Math.ceil(num / 2.0);
    }
    if (shiftSide === 'DAY') {
      if (!window.AppStore.hardtestManualTb) window.AppStore.hardtestManualTb = {};
      window.AppStore.hardtestManualTb[rowId] = num;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    window.showToast('info', `Đã bố trí ${shiftSide === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}: ${num} Test Block`);
  }

  function updateHardtestShiftManualMan(rawRowId, val, shiftSide) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Nhân lực!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    if (!assertCumNegPriorityUnlocked(rowId, 'TOTAL_HARDTEST')) return;
    const num = Math.max(0, parseInt(val, 10) || 0);
    const manKey = shiftSide === 'NIGHT' ? 'hardtestManualManNight' : 'hardtestManualManDay';
    if (!window.AppStore[manKey]) window.AppStore[manKey] = {};
    window.AppStore[manKey][rowId] = num;
    if (shiftSide === 'DAY') {
      if (!window.AppStore.hardtestManualMan) window.AppStore.hardtestManualMan = {};
      window.AppStore.hardtestManualMan[rowId] = num;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    window.showToast('info', `Đã bố trí ${shiftSide === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}: ${num} Người sử dụng`);
  }

  function updateHardtestShiftManualPlan(rawRowId, val, shiftSide) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Output Plan!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    if (!assertCumNegPriorityUnlocked(rowId, 'TOTAL_HARDTEST')) return;
    const planKey = shiftSide === 'NIGHT' ? 'hardtestManualPlanNight' : 'hardtestManualPlanDay';
    if (!window.AppStore[planKey]) window.AppStore[planKey] = {};
    const raw = (val || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 0 || raw === '') {
      delete window.AppStore[planKey][rowId];
    } else {
      window.AppStore[planKey][rowId] = num;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      const label = shiftSide === 'NIGHT' ? 'Output Plan ca đêm' : 'OUTPUT PLAN DAY';
      window.showToast('info', !isNaN(num) && num >= 0 && raw !== '' ? `Đã cập nhật ${label}: ${num.toLocaleString('vi-VN')}` : `Đã khôi phục ${label} tự động`);
    }
  }

  window.handleHardtestManualTbDayChange = function(rawRowId, val) {
    updateHardtestShiftManualTb(rawRowId, val, 'DAY');
  };

  window.handleHardtestManualManDayChange = function(rawRowId, val) {
    updateHardtestShiftManualMan(rawRowId, val, 'DAY');
  };

  window.handleHardtestManualPlanDayChange = function(rawRowId, val) {
    updateHardtestShiftManualPlan(rawRowId, val, 'DAY');
  };

  window.handleHardtestManualTbNightChange = function(rawRowId, val) {
    updateHardtestShiftManualTb(rawRowId, val, 'NIGHT');
  };

  window.handleHardtestManualManNightChange = function(rawRowId, val) {
    updateHardtestShiftManualMan(rawRowId, val, 'NIGHT');
  };

  window.handleHardtestManualPlanNightChange = function(rawRowId, val) {
    updateHardtestShiftManualPlan(rawRowId, val, 'NIGHT');
  };

  window.handleHardtestManualTbChange = function(rawRowId, val) {
    updateHardtestShiftManualTb(rawRowId, val, 'DAY');
  };

  window.handleHardtestManualManChange = function(rawRowId, val) {
    updateHardtestShiftManualMan(rawRowId, val, 'DAY');
  };

  window.handleResetHardtestRowManual = function(rawRowId) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản Viewer không có quyền đặt lại!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    if (!assertCumNegPriorityUnlocked(rowId, 'TOTAL_HARDTEST')) return;
    [
      'hardtestManualTbDay', 'hardtestManualManDay', 'hardtestManualPlanDay',
      'hardtestManualTbNight', 'hardtestManualManNight', 'hardtestManualPlanNight',
      'hardtestManualTb', 'hardtestManualMan', 'hardtestPlanOverrides'
    ].forEach(k => {
      if (window.AppStore[k]) delete window.AppStore[k][rowId];
    });
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại mã này về đề xuất chuẩn');
  };

  window.handleResetAllHardtestManual = function() {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản Viewer không có quyền đặt lại!');
      return;
    }
    window.AppStore.hardtestManualTbDay = {};
    window.AppStore.hardtestManualManDay = {};
    window.AppStore.hardtestManualPlanDay = {};
    window.AppStore.hardtestManualTbNight = {};
    window.AppStore.hardtestManualManNight = {};
    window.AppStore.hardtestManualPlanNight = {};
    window.AppStore.hardtestManualTb = {};
    window.AppStore.hardtestManualMan = {};
    window.AppStore.hardtestPlanOverrides = {};
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại toàn bộ TB, Output Plan &amp; Nhân lực về đề xuất chuẩn!');
  };

  function getHardtestExportSpec(rows) {
    const headers = [
      'STT', 'Công Đoạn', 'Group Model', 'Mã 1C',
      'Kế Hoạch (Plan)', 'Thực Tế (Fact)', 'Chênh Lệch (Gap)',
      'Date Plan', 'Shift Plan', 'Cycle Time Norm', 'FTT (%)', 'Downtime (%)', 'TB Sẵn Có (Test Block)',
      'Số Test Block Cần', 'Giờ máy cần tiêu chuẩn',
      'Ca Làm Việc (Ngày)', 'Số Test Block Dùng (Ngày)', 'Số Người Sử Dụng (Ngày)', 'OUTPUT PLAN DAY', 'Giờ máy cần thực tế (Ngày)', 'Số lượng còn thiếu ca đêm',
      'Ca Làm Việc (Đêm)', 'Số Test Block Dùng (Đêm)', 'Số Người Sử Dụng (Đêm)', 'Output Plan ca đêm', 'Giờ máy cần thực tế (Đêm)', 'Số lượng còn thiếu tổng',
      'Ghi Chú', 'Âm Từ Ngày / Ca'
    ];
    const mapped = rows.map((r, idx) => ([
      r.displayIdx || (idx + 1),
      r.stage || '',
      r.normGroup || r.group || '',
      r.model1c || '',
      r.planQty != null ? r.planQty : 0,
      r.factQty != null ? r.factQty : 0,
      r.gapQty != null ? r.gapQty : 0,
      r.datePlanLabel || '--',
      r.shiftPlanLabel || '--',
      r.ctNorm != null ? r.ctNorm : (r.ctActual || 0),
      r.fttPct != null ? r.fttPct : 0,
      r.dtTotalPct != null ? r.dtTotalPct : 0,
      r.availTb || 0,
      r.reqTb || 0,
      Number((r.stdHours || 0).toFixed(1)),
      'Ca Ngày',
      r.manualTbDay || 0,
      r.manualManDay || 0,
      r.dayOutput || 0,
      Number((r.dayActualHours || 0).toFixed(1)),
      r.nightShortage > 0 ? -r.nightShortage : 0,
      'Ca Đêm',
      r.manualTbNight || 0,
      r.manualManNight || 0,
      r.nightOutput || 0,
      Number((r.nightActualHours || 0).toFixed(1)),
      r.finalShortage > 0 ? -r.finalShortage : 0,
      (window.AppStore && window.AppStore.simManualNotes && window.AppStore.simManualNotes[r.rowId]) ? window.AppStore.simManualNotes[r.rowId] : '',
      r.cumNegOriginLabel || '--'
    ]));
    return { headers, rows: mapped };
  }

  window.handleExportHardtestSimCSV = function() {
    const rows = window.AppStore.lastProcessedHardtestSimRows || [];
    if (rows.length === 0) {
      window.showToast('warning', 'Không có dữ liệu giả lập Total Hardtest để xuất!');
      return;
    }

    const _defExpWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const fromDate = window.AppStore.hardtestSimFromDate || window.AppStore.simFromDate || window.AppStore.fromDate || (_defExpWeek ? _defExpWeek.fromDate : '2026-11-05');
    const toDate = window.AppStore.hardtestSimToDate || window.AppStore.simToDate || window.AppStore.toDate || (_defExpWeek ? _defExpWeek.toDate : '2026-11-05');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    const spec = getHardtestExportSpec(rows);
    let csv = '\uFEFF';
    csv += `# AJAX PROPLAN MES - GIẢ LẬP ĐIỀU ĐỘ TOTAL HARDTEST & TEST BLOCK & NHÂN LỰC (29 CỘT)\n`;
    csv += `# Giai đoạn: ${fromDate} ➜ ${toDate} | Người lập: ${getSimPlannerName()} | Xuất ngày: ${now.toLocaleString('vi-VN')}\n`;
    csv += `# Quy chuẩn: 1 Người phụ trách 2 Test Block | Ca Ngày 10.83h | Ca Đêm 10.58h\n\n`;
    csv += spec.headers.map(h => `"${h}"`).join(',') + '\n';

    spec.rows.forEach(vals => {
      csv += vals.map(v => typeof v === 'number' ? v : `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gia_Lap_Tai_Total_Hardtest_${fromDate}_den_${toDate}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('success', `📥 Đã xuất file CSV Giả lập Total Hardtest (${rows.length} dòng)!`);
  };

  window.handleCopyHardtestSimClipboard = function() {
    const rows = window.AppStore.lastProcessedHardtestSimRows || [];
    if (rows.length === 0) {
      window.showToast('warning', 'Không có dữ liệu giả lập Total Hardtest để sao chép!');
      return;
    }

    const spec = getHardtestExportSpec(rows);
    let tsv = spec.headers.map(sanitizeTsvCell).join('\t') + '\n';
    spec.rows.forEach(vals => {
      tsv += vals.map(sanitizeTsvCell).join('\t') + '\n';
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        window.showToast('success', `📋 Đã sao chép ${rows.length} dòng! Mở Google Sheets và bấm Ctrl+V để dán.`);
      }).catch(() => {
        fallbackCopyText(tsv);
      });
    } else {
      fallbackCopyText(tsv);
    }

    function fallbackCopyText(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        window.showToast('success', `📋 Đã sao chép ${rows.length} dòng! Mở Google Sheets và bấm Ctrl+V để dán.`);
      } catch (e) {
        window.showToast('error', 'Không thể sao chép tự động. Vui lòng bấm nút Xuất Sheet CSV!');
      }
      document.body.removeChild(ta);
    }
  };

  window.handleCapacityGroupChange = function(grp) {
    window.AppStore.selectedCapacityGroup = grp;
    window.renderCapacityView();
    window.showToast('info', grp === 'ALL' ? 'Hiển thị tất cả Group Model' : `Đã lọc: ${grp}`);
  };

  window.handleCapacityLineChange = function(lineId) {
    window.AppStore.selectedCapacityLine = lineId;
    window.renderCapacityView();
    window.showToast('info', lineId === 'ALL' ? 'Hiển thị tất cả Line' : `Đã lọc: Line ${lineId}`);
  };

  window.handleCapacityShiftHoursChange = function(val) {
    window.AppStore.capacityShiftHours = parseFloat(val);
    window.renderCapacityView();
    window.showToast('success', `Đã cập nhật quy chuẩn thời gian ca: ${val} giờ`);
  };

  window.handleCapacityModeChange = function(mode) {
    window.AppStore.capacityViewMode = mode;
    window.renderCapacityView();
    if (mode === 'SIMULATOR' && typeof window.handleCheckAndSyncCompletedPlan === 'function') {
      window.handleCheckAndSyncCompletedPlan(false);
    }
  };

  window.handleCapacitySearch = function(val) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      window.renderCapacityView();
    }, 250);
  };

  window.handleResetCapacityFilters = function() {
    window.AppStore.selectedCapacityGroup = 'ALL';
    window.AppStore.selectedCapacityLine = 'ALL';
    window.AppStore.capacityShiftHours = 21.41;
    const sInput = document.getElementById('capacitySearchInput');
    if (sInput) sInput.value = '';
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại bộ lọc Capacity về mặc định!');
  };

  window.handleSimulatorGroupChange = function(grp) {
    window.AppStore.selectedSimulatorGroup = grp;
    const data = window.AppStore.getAssemblyCapacityData();
    const firstBoard = (data.items || []).find(it => it.group === grp);
    if (firstBoard) {
      window.AppStore.selectedSimulatorBoard = firstBoard.board;
    }
    window.renderCapacityView();
  };

  window.handleSimulatorBoardChange = function(board) {
    window.AppStore.selectedSimulatorBoard = board;
    window.renderCapacityView();
  };

  window.handleSimulatorRowLineChange = function(rowKey, newLineId) {
    if (!window.AppStore.simLineOverrides) {
      window.AppStore.simLineOverrides = {};
    }
    window.AppStore.simLineOverrides[rowKey] = newLineId;
    if (!window.AppStore.simLineOverridesDay) {
      window.AppStore.simLineOverridesDay = {};
    }
    window.AppStore.simLineOverridesDay[rowKey] = newLineId;
    window.renderCapacityView();
    window.showToast('info', `Đã chuyển sang Line ${newLineId} cho Model này.`);
  };

  window.handleSimulatorDayLineChange = function(rowKey, newLineId) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập quyền Chỉnh sửa hoặc Admin để thay đổi Line!');
      return;
    }
    if (newLineId && (newLineId.startsWith('Support') || newLineId === 'Support')) {
      if (!isDoorProtectModel(rowKey)) {
        window.showToast('warning', 'Line Support chỉ chuyên trách chạy các Model dòng DoorProtect (DoorProtect, DoorProtect U, Plus, Plus U)!');
        window.renderCapacityView();
        return;
      }
    }
    if (!window.AppStore.simLineOverridesDay) {
      window.AppStore.simLineOverridesDay = {};
    }
    window.AppStore.simLineOverridesDay[rowKey] = newLineId;
    window.renderCapacityView();
    window.showToast('info', newLineId === 'NONE' ? 'Đã hủy xếp Ca Ngày cho Model này.' : `Đã gán Line ${newLineId} [Ca Ngày].`);
  };

  window.handleSimulatorNightLineChange = function(rowKey, newLineId) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập quyền Chỉnh sửa hoặc Admin để thay đổi Line!');
      return;
    }
    if (newLineId && (newLineId.startsWith('Support') || newLineId === 'Support')) {
      if (!isDoorProtectModel(rowKey)) {
        window.showToast('warning', 'Line Support chỉ chuyên trách chạy các Model dòng DoorProtect (DoorProtect, DoorProtect U, Plus, Plus U)!');
        window.renderCapacityView();
        return;
      }
    }
    if (!window.AppStore.simLineOverridesNight) {
      window.AppStore.simLineOverridesNight = {};
    }
    window.AppStore.simLineOverridesNight[rowKey] = newLineId;
    window.renderCapacityView();
    window.showToast('info', newLineId === 'NONE' ? 'Đã hủy xếp Ca Đêm cho Model này.' : `Đã gán Line ${newLineId} [Ca Đêm].`);
  };

  window.handleResetSimulatorOptimalLines = function() {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Không thể đặt lại Line sản xuất!');
      return;
    }
    window.AppStore.simLineOverrides = {};
    window.AppStore.simLineOverridesDay = {};
    window.AppStore.simLineOverridesNight = {};
    window.AppStore.simManualLinesDay = {};
    window.AppStore.simManualLinesNight = {};
    window.AppStore.simManualSeqsDay = {};
    window.AppStore.simManualSeqsNight = {};
    window.AppStore.simManualPfDay = {};
    window.AppStore.simManualPfNight = {};
    window.AppStore.simManualPlanDay = {};
    window.AppStore.simManualPlanNight = {};
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại toàn bộ Line sản xuất Ca Ngày & Ca Đêm về đề xuất tối ưu nhất!');
  };

  window.handleSimulatorStageFilterChange = function(stage) {
    window.AppStore.simStageFilter = stage;
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
  };

  window.handleSimulatorPlanStatusFilterChange = function(status) {
    window.AppStore.simPlanStatusFilter = status;
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
  };

  window.handleSimulatorGroupFilterChange = function(grp) {
    window.AppStore.simGroupFilter = grp;
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
  };

  window.handleSimulatorSearch = function(val) {
    window.AppStore.simSearchVal = val;
    window.AppStore.simPageIndex = 0;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      window.renderCapacityView();
    }, 250);
  };

  window.handleSimulatorPageChange = function(pageIdx) {
    window.AppStore.simPageIndex = pageIdx;
    window.renderCapacityView();
  };

  window.handleSimulatorPageSizeChange = function(val) {
    window.AppStore.simPageSize = parseInt(val, 10);
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
  };

  // Assembly Simulator Date Range Handlers
  window.handleSimFromDateChange = function(val) {
    if (!val) return;
    window.AppStore.simFromDate = val;
    window.AppStore.fromDate = val;
    // Nếu ngày bắt đầu là Thứ 5, tự động tính ngày kết thúc là hết Thứ 4 tuần tiếp theo (+6 ngày)
    const d = (window.AppStore && window.AppStore.parseDate) ? window.AppStore.parseDate(val) : new Date(val);
    if (d && !isNaN(d.getTime()) && d.getDay() === 4) {
      const endWed = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
      const pad = n => String(n).padStart(2, '0');
      const toVal = `${endWed.getFullYear()}-${pad(endWed.getMonth() + 1)}-${pad(endWed.getDate())}`;
      window.AppStore.simToDate = toVal;
      window.AppStore.toDate = toVal;
      const toInp = document.getElementById('simToDateInput');
      if (toInp) toInp.value = toVal;
    }
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
    window.showToast('info', `Assembly: Đã cập nhật kỳ ${window.AppStore.simFromDate} ➜ ${window.AppStore.simToDate || val}`);
  };

  window.handleSimToDateChange = function(val) {
    if (!val) return;
    window.AppStore.simToDate = val;
    window.AppStore.toDate = val;
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
    window.showToast('info', `Assembly: Đã cập nhật ngày kết thúc ${val}`);
  };

  window.handleSimDateRangePreset = function(fromD, toD) {
    window.AppStore.simFromDate = fromD;
    window.AppStore.simToDate = toD;
    window.AppStore.fromDate = fromD;
    window.AppStore.toDate = toD;
    window.AppStore.simPageIndex = 0;
    window.renderCapacityView();
    window.showToast('success', `Assembly: Đã chọn giai đoạn ${fromD} ➜ ${toD}`);
  };

  // Assembly 21-Column Table Line Assignment Handlers
  window.handleTableLineDayChange = function(rowKey, lineId) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualLinesDay) window.AppStore.simManualLinesDay = {};
    if (!window.AppStore.simLineOverridesDay) window.AppStore.simLineOverridesDay = {};
    if (!window.AppStore.simLineOverrides) window.AppStore.simLineOverrides = {};

    const cleanVal = (lineId || '').trim();
    if (!cleanVal || cleanVal === 'NONE') {
      window.AppStore.simManualLinesDay[rowKey] = 'NONE';
      window.AppStore.simLineOverridesDay[rowKey] = 'NONE';
      window.AppStore.simLineOverrides[rowKey] = 'NONE';
    } else {
      window.AppStore.simManualLinesDay[rowKey] = cleanVal;
      window.AppStore.simLineOverridesDay[rowKey] = cleanVal;
      window.AppStore.simLineOverrides[rowKey] = cleanVal;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', cleanVal ? `Ca Ngày: Đã gán sang Chuyền ${cleanVal}` : 'Ca Ngày: Đã xóa gán Chuyền');
    }
  };

  window.handleTableLineNightChange = function(rowKey, lineId) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualLinesNight) window.AppStore.simManualLinesNight = {};
    if (!window.AppStore.simLineOverridesNight) window.AppStore.simLineOverridesNight = {};

    const cleanVal = (lineId || '').trim();
    if (!cleanVal || cleanVal === 'NONE') {
      window.AppStore.simManualLinesNight[rowKey] = 'NONE';
      window.AppStore.simLineOverridesNight[rowKey] = 'NONE';
    } else {
      window.AppStore.simManualLinesNight[rowKey] = cleanVal;
      window.AppStore.simLineOverridesNight[rowKey] = cleanVal;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', cleanVal ? `Ca Đêm: Đã gán sang Chuyền ${cleanVal}` : 'Ca Đêm: Đã xóa gán Chuyền');
    }
  };

  window.handleTableSeqDayChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualSeqsDay) window.AppStore.simManualSeqsDay = {};
    const cleanVal = (val || '').trim();
    if (!cleanVal) {
      delete window.AppStore.simManualSeqsDay[rowKey];
    } else {
      window.AppStore.simManualSeqsDay[rowKey] = cleanVal;
    }
    if (window.AppStore.lastProcessedSimRows) {
      const target = window.AppStore.lastProcessedSimRows.find(r => r.rowKey === rowKey);
      if (target) target.seqDay = cleanVal;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
  };

  window.handleTableSeqNightChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualSeqsNight) window.AppStore.simManualSeqsNight = {};
    const cleanVal = (val || '').trim();
    if (!cleanVal) {
      delete window.AppStore.simManualSeqsNight[rowKey];
    } else {
      window.AppStore.simManualSeqsNight[rowKey] = cleanVal;
    }
    if (window.AppStore.lastProcessedSimRows) {
      const target = window.AppStore.lastProcessedSimRows.find(r => r.rowKey === rowKey);
      if (target) target.seqNight = cleanVal;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
  };

  window.handleTablePfDayChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualPfDay) window.AppStore.simManualPfDay = {};
    const raw = (val || '').toString().replace(/%/g, '').replace(/,/g, '.').trim();
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0 || raw === '') {
      delete window.AppStore.simManualPfDay[rowKey];
    } else {
      window.AppStore.simManualPfDay[rowKey] = Math.round(num);
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', !isNaN(num) && num > 0 ? `Đã cập nhật PF% Ca Ngày: ${Math.round(num)}%` : 'Đã khôi phục PF% Ca Ngày mặc định');
    }
  };

  window.handleTablePfNightChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualPfNight) window.AppStore.simManualPfNight = {};
    const raw = (val || '').toString().replace(/%/g, '').replace(/,/g, '.').trim();
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0 || raw === '') {
      delete window.AppStore.simManualPfNight[rowKey];
    } else {
      window.AppStore.simManualPfNight[rowKey] = Math.round(num);
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', !isNaN(num) && num > 0 ? `Đã cập nhật PF% Ca Đêm: ${Math.round(num)}%` : 'Đã khôi phục PF% Ca Đêm mặc định');
    }
  };

  window.handleTablePlanDayChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualPlanDay) window.AppStore.simManualPlanDay = {};
    const raw = (val || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 0 || raw === '') {
      delete window.AppStore.simManualPlanDay[rowKey];
    } else {
      window.AppStore.simManualPlanDay[rowKey] = num;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', !isNaN(num) && num >= 0 ? `Đã cập nhật Plan Ca Ngày: ${num.toLocaleString('vi-VN')}` : 'Đã khôi phục Plan Ca Ngày mặc định');
    }
  };

  window.handleTablePlanNightChange = function(rowKey, val) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualPlanNight) window.AppStore.simManualPlanNight = {};
    const raw = (val || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 0 || raw === '') {
      delete window.AppStore.simManualPlanNight[rowKey];
    } else {
      window.AppStore.simManualPlanNight[rowKey] = num;
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', !isNaN(num) && num >= 0 ? `Đã cập nhật Plan Ca Đêm: ${num.toLocaleString('vi-VN')}` : 'Đã khôi phục Plan Ca Đêm mặc định');
    }
  };

  window.handleEditPlannerName = function() {
    const currentName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    const newName = window.prompt('Nhập họ tên Người lập Plan:', currentName);
    if (newName !== null) {
      const trimmed = newName.trim();
      const finalName = trimmed || 'Bùi Anh Tuấn';
      window.AppStore.simPlannerName = finalName;
      try {
        localStorage.setItem('AJAX_SIM_PLANNER_NAME', finalName);
      } catch (e) {
        console.warn('Cannot write to localStorage:', e);
      }
      if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
      window.renderCapacityView();
      if (window.showToast) {
        window.showToast('success', `👤 Đã cập nhật Người lập Plan: ${finalName}`);
      }
    }
  };

  // Backward compatibility alias
  window.handleTableLineChange = window.handleTableLineDayChange;

  window.handleTableShiftChange = function(rowKey, shift) {
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (!window.AppStore.simManualShifts) window.AppStore.simManualShifts = {};
    window.AppStore.simManualShifts[rowKey] = shift;
    window.renderCapacityView();
    if (window.showToast) {
      const sName = shift === 'NIGHT' ? 'Ca Đêm' : shift === 'BOTH' ? 'Cả 2 Ca' : 'Ca Ngày';
      window.showToast('info', `Đã cập nhật ca làm việc: ${sName}`);
    }
  };

  // Assembly Simulator Manual Line Assignment Handlers
  window.handleManualDayLineInput = function(rowKey, val) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sắp xếp thủ công Line!');
      return;
    }
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    const cleanVal = (val || '').trim();
    if (!window.AppStore.simManualLinesDay) window.AppStore.simManualLinesDay = {};
    if (!window.AppStore.simLineOverridesDay) window.AppStore.simLineOverridesDay = {};
    if (!window.AppStore.simLineOverrides) window.AppStore.simLineOverrides = {};

    if (!cleanVal) {
      delete window.AppStore.simManualLinesDay[rowKey];
      delete window.AppStore.simLineOverridesDay[rowKey];
      delete window.AppStore.simLineOverrides[rowKey];
    } else {
      let formattedVal = cleanVal.toUpperCase();
      if (formattedVal.startsWith('SUPPORT')) {
        const num = formattedVal.replace('SUPPORT', '').trim();
        formattedVal = num ? `Support ${num}` : 'Support 1';
      }
      window.AppStore.simManualLinesDay[rowKey] = formattedVal;
      window.AppStore.simLineOverridesDay[rowKey] = formattedVal;
      window.AppStore.simLineOverrides[rowKey] = formattedVal;
    }
    window.renderCapacityView();
    window.showToast('info', cleanVal ? `Đã gán thủ công [Ca Ngày]: Line ${window.AppStore.simManualLinesDay[rowKey]}` : 'Đã xóa gán thủ công [Ca Ngày]');
  };

  window.handleManualNightLineInput = function(rowKey, val) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sắp xếp thủ công Line!');
      return;
    }
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    const cleanVal = (val || '').trim();
    if (!window.AppStore.simManualLinesNight) window.AppStore.simManualLinesNight = {};
    if (!window.AppStore.simLineOverridesNight) window.AppStore.simLineOverridesNight = {};

    if (!cleanVal) {
      delete window.AppStore.simManualLinesNight[rowKey];
      delete window.AppStore.simLineOverridesNight[rowKey];
    } else {
      let formattedVal = cleanVal.toUpperCase();
      if (formattedVal.startsWith('SUPPORT')) {
        const num = formattedVal.replace('SUPPORT', '').trim();
        formattedVal = num ? `Support ${num}` : 'Support 1';
      }
      window.AppStore.simManualLinesNight[rowKey] = formattedVal;
      window.AppStore.simLineOverridesNight[rowKey] = formattedVal;
    }
    window.renderCapacityView();
    window.showToast('info', cleanVal ? `Đã gán thủ công [Ca Đêm]: Line ${window.AppStore.simManualLinesNight[rowKey]}` : 'Đã xóa gán thủ công [Ca Đêm]');
  };

  window.handleResetRowManualLine = function(rowKey) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Không thể đặt lại dữ liệu!');
      return;
    }
    if (!assertCumNegPriorityUnlocked(rowKey, 'ASSEMBLY')) return;
    if (window.AppStore.simManualLinesDay) delete window.AppStore.simManualLinesDay[rowKey];
    if (window.AppStore.simManualLinesNight) delete window.AppStore.simManualLinesNight[rowKey];
    if (window.AppStore.simLineOverridesDay) delete window.AppStore.simLineOverridesDay[rowKey];
    if (window.AppStore.simLineOverridesNight) delete window.AppStore.simLineOverridesNight[rowKey];
    if (window.AppStore.simLineOverrides) delete window.AppStore.simLineOverrides[rowKey];
    if (window.AppStore.simManualSeqsDay) delete window.AppStore.simManualSeqsDay[rowKey];
    if (window.AppStore.simManualSeqsNight) delete window.AppStore.simManualSeqsNight[rowKey];
    if (window.AppStore.simManualPfDay) delete window.AppStore.simManualPfDay[rowKey];
    if (window.AppStore.simManualPfNight) delete window.AppStore.simManualPfNight[rowKey];
    if (window.AppStore.simManualPlanDay) delete window.AppStore.simManualPlanDay[rowKey];
    if (window.AppStore.simManualPlanNight) delete window.AppStore.simManualPlanNight[rowKey];
    window.renderCapacityView();
    window.showToast('success', 'Đã khôi phục Model về giá trị mặc định');
  };

  // Workday & Line Dispatch Handlers
  window.handleSimTargetDateChange = function(dateStr) {
    window.AppStore.simTargetDate = dateStr;
    window.renderCapacityView();
    window.showToast('info', 'Đã chuyển ngày sản xuất giả lập sang ' + dateStr);
  };

  window.handleSimScopeChange = function(scope) {
    window.AppStore.simScope = scope;
    window.renderCapacityView();
    window.showToast('info', scope === 'SINGLE' 
      ? `Đã chuyển sang: Chỉ tính thiếu hụt ngày ${window.AppStore.simTargetDate || '2026-10-26'}` 
      : `Đã chuyển sang: Thiếu hụt lũy kế chu kỳ (${window.AppStore.fromDate || '2026-10-22'} ➜ ${window.AppStore.toDate || '2026-10-26'})`);
  };

  window.handleToggleSimWorkingLine = function(shift, lineId) {
    if (shift === 'DAY') {
      const arr = window.AppStore.simWorkingLinesDay || [];
      const set = new Set(arr);
      if (set.has(lineId)) set.delete(lineId);
      else set.add(lineId);
      window.AppStore.simWorkingLinesDay = Array.from(set);
    } else {
      const arr = window.AppStore.simWorkingLinesNight || [];
      const set = new Set(arr);
      if (set.has(lineId)) set.delete(lineId);
      else set.add(lineId);
      window.AppStore.simWorkingLinesNight = Array.from(set);
    }
    window.AppStore._simLinesManualConfigured = true;
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
  };

  function parseSimLinesFromText(txt) {
    const raw = (txt || '').split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const lines = [];
    for (let i = 0; i < raw.length; i++) {
      const token = raw[i];
      if (token === 'LINE' && raw[i + 1] === 'SUPPORT') {
        if (i + 2 < raw.length && ['1', '2', '3'].includes(raw[i + 2])) {
          lines.push('Support ' + raw[i + 2]);
          i += 2;
        } else {
          lines.push('Support 1');
          i++;
        }
      } else if (token === 'SUPPORT' || token === 'LINESUPPORT') {
        if (i + 1 < raw.length && ['1', '2', '3'].includes(raw[i + 1])) {
          lines.push('Support ' + raw[i + 1]);
          i++;
        } else {
          lines.push('Support 1');
        }
      } else if (token === 'SUPPORT1' || token === 'LINESUPPORT1' || token === 'SUPPORT-1') {
        lines.push('Support 1');
      } else if (token === 'SUPPORT2' || token === 'LINESUPPORT2' || token === 'SUPPORT-2') {
        lines.push('Support 2');
      } else if (token === 'SUPPORT3' || token === 'LINESUPPORT3' || token === 'SUPPORT-3') {
        lines.push('Support 3');
      } else {
        lines.push(token);
      }
    }
    return Array.from(new Set(lines));
  }

  window.handleSimDayLinesTextChange = function(txt) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Không thể thay đổi danh sách Line đi làm!');
      window.renderCapacityView();
      return;
    }
    window.AppStore.simWorkingLinesDay = parseSimLinesFromText(txt);
    window.AppStore._simLinesManualConfigured = true;
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
  };

  window.handleSimNightLinesTextChange = function(txt) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Không thể thay đổi danh sách Line đi làm!');
      window.renderCapacityView();
      return;
    }
    window.AppStore.simWorkingLinesNight = parseSimLinesFromText(txt);
    window.AppStore._simLinesManualConfigured = true;
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
  };

  window.handleSetSimSupportLineCount = function(shift, count) {
    const isDay = shift === 'DAY';
    let lines = isDay ? [...(window.AppStore.simWorkingLinesDay || [])] : [...(window.AppStore.simWorkingLinesNight || [])];
    lines = lines.filter(l => l !== 'Support' && l !== 'Support 1' && l !== 'Support 2' && l !== 'Support 3');
    if (count >= 1) lines.push('Support 1');
    if (count >= 2) lines.push('Support 2');
    if (count >= 3) lines.push('Support 3');

    if (isDay) {
      window.AppStore.simWorkingLinesDay = lines;
    } else {
      window.AppStore.simWorkingLinesNight = lines;
    }

    window.AppStore._simLinesManualConfigured = true;
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    window.renderCapacityView();
    const shiftLabel = isDay ? 'Ca Ngày (10.83h)' : 'Ca Đêm (10.58h)';
    if (count === 0) {
      window.showToast('info', `${shiftLabel}: Đã tắt toàn bộ Line Support.`);
    } else {
      const supLines = ['Support 1', 'Support 2', 'Support 3'].slice(0, count).join(', ');
      const totalH = (count * (isDay ? 10.83 : 10.58)).toFixed(1);
      window.showToast('success', `${shiftLabel}: Đã huy động ${count} Line Support (${supLines} • ${totalH}h)!`);
    }
  };

  window.handleSetAllSimWorkingLines = function(shift, action) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Không thể thay đổi danh sách Line đi làm!');
      return;
    }
    const standardLines = ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D', '3A', '3C', '3D'];
    if (shift === 'DAY') {
      if (action === 'ALL') window.AppStore.simWorkingLinesDay = [...standardLines, 'Support 1'];
      else if (action === 'NONE') window.AppStore.simWorkingLinesDay = [];
    } else {
      if (action === 'ALL') window.AppStore.simWorkingLinesNight = [...standardLines, 'Support 1'];
      else if (action === 'DEFAULT') window.AppStore.simWorkingLinesNight = ['1A', '2A', '1B', '2B', '1C'];
      else if (action === 'NONE') window.AppStore.simWorkingLinesNight = [];
    }
    window.renderCapacityView();
  };

  window.handleSimulatorWorkloadViewModeChange = function(mode) {
    window.AppStore.simWorkloadViewMode = mode;
    window.renderCapacityView();
  };

  window.handleToggleSimulatorWorkloadCollapse = function() {
    if (!window.AppStore) return;
    const isCollapsed = !window.AppStore.simWorkloadCollapsed;
    window.AppStore.simWorkloadCollapsed = isCollapsed;
    try {
      localStorage.setItem('AJAX_SIM_WORKLOAD_COLLAPSED', isCollapsed ? 'true' : 'false');
    } catch (e) {}
    if (window.renderCapacityView) {
      window.renderCapacityView();
    }
    if (window.showToast) {
      window.showToast(isCollapsed ? 'info' : 'success', isCollapsed ? '🔼 Đã thu hẹp phần Tổng hợp công suất các Line' : '🔽 Đã mở rộng phần Tổng hợp công suất các Line');
    }
  };

  window.handleAutoAllocateWorkingLines = function() {
    const capData = window.AppStore.getAssemblyCapacityData();
    const dayLines = new Set(window.AppStore.simWorkingLinesDay || []);
    const nightLines = new Set(window.AppStore.simWorkingLinesNight || []);

    if (!window.AppStore.simLineOverridesDay) window.AppStore.simLineOverridesDay = {};
    if (!window.AppStore.simLineOverridesNight) window.AppStore.simLineOverridesNight = {};
    if (!window.AppStore.simLineOverrides) window.AppStore.simLineOverrides = {};

    window.AppStore.simLineOverridesDay = {};
    window.AppStore.simLineOverridesNight = {};
    window.AppStore.simLineOverrides = {};
    window.AppStore.simManualLinesDay = {};
    window.AppStore.simManualLinesNight = {};
    window.AppStore.simManualShifts = {};

    const simScope = window.AppStore.simScope || 'CUMULATIVE';
    const _defSimWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const fromDate = window.AppStore.simFromDate || window.AppStore.fromDate || window.AppStore.datamassFromDate || (_defSimWeek ? _defSimWeek.fromDate : '2026-11-05');
    const toDate = window.AppStore.simToDate || window.AppStore.toDate || window.AppStore.datamassToDate || (_defSimWeek ? _defSimWeek.toDate : '2026-11-05');
    const shiftFilter = window.AppStore.currentShiftFilter || window.AppStore.datamassShiftFilter || 'ALL';
    const simTargetDate = window.AppStore.simTargetDate || toDate || '2026-10-26';
    const queryFromDate = (simScope === 'SINGLE') ? simTargetDate : fromDate;
    const queryToDate = (simScope === 'SINGLE') ? simTargetDate : toDate;
    const stageFilter = window.AppStore.simStageFilter || 'ASSEMBLY';
    const planStatusFilter = window.AppStore.simPlanStatusFilter || 'GAP_NEGATIVE';
    const groupFilter = window.AppStore.simGroupFilter || 'ALL';
    const searchVal = (window.AppStore.simSearchVal || '').trim();

    const schedule = window.AppStore.getDetailedSchedule({
      fromDate: queryFromDate,
      toDate: queryToDate,
      shiftFilter,
      stageFilter: stageFilter === 'ALL' ? 'ALL' : stageFilter,
      modelFilter: groupFilter === 'ALL' ? 'ALL' : groupFilter,
      planStatusFilter,
      search1C: searchVal,
      selectedDates: window.AppStore.getActiveSelectedDates ? window.AppStore.getActiveSelectedDates(queryFromDate, queryToDate) : null
    });

    const scheduleItems = schedule.items || [];
    let allocatedCount = 0;
    let unsupportedCount = 0;

    const assignedDayHours = {};
    const assignedNightHours = {};
    const allLineIds = ['1A', '2A', '1B', '2B', '1C', '2C', '1D', '2D', '3A', '3B', '3C', '3D', 'Support 1', 'Support 2', 'Support 3', 'Support'];
    allLineIds.forEach(lid => {
      assignedDayHours[lid] = 0;
      assignedNightHours[lid] = 0;
    });

    const todayPlanRefAuto = getTodayPlanReference();
    const shortageItems = [];
    scheduleItems.forEach(it => {
      if (it.cumGapQty < 0) {
        const capInfo = resolveModelLineCapacity(it, capData);
        const rowKey = `${it.stage}___${it.model}___${it.productName1C}`.replace(/"/g, '&quot;');
        const shortage = Math.abs(it.cumGapQty);
        const estHours = (shortage * capInfo.optimalLine.actualCt) / 3600;
        const meta = resolvePlanDateAndShiftMeta(it, Number(it.cumGapQty || 0), todayPlanRefAuto, shiftFilter || 'ALL');
        shortageItems.push({ it, capInfo, rowKey, shortage, estHours, isCumNeg: !!(meta && meta.isCumNegative) });
      }
    });

    // Prioritize Âm luỹ kế first, then DoorProtect jobs for Line Support, then heavy jobs for packing
    shortageItems.sort((a, b) => {
      if (a.isCumNeg !== b.isCumNeg) return a.isCumNeg ? -1 : 1;
      const aIsDp = isDoorProtectModel(a.it);
      const bIsDp = isDoorProtectModel(b.it);
      if (aIsDp !== bIsDp) return aIsDp ? -1 : 1;
      return b.estHours - a.estHours;
    });

    shortageItems.forEach(({ it, capInfo, rowKey, shortage }) => {
      const isDp = isDoorProtectModel(it);
      const capableDay = capInfo.capableLines.filter(cl => dayLines.has(cl.lineId));
      const capableNight = capInfo.capableLines.filter(cl => nightLines.has(cl.lineId));

      let chosenDay = null;
      let dayHoursUsed = 0;
      let dayOutputProduced = 0;

      // 1. Allocate to Day Shift (Strict Limit 10.83h)
      if (capableDay.length > 0) {
        const availDay = capableDay.filter(cl => (assignedDayHours[cl.lineId] || 0) < 10.83);
        if (availDay.length > 0) {
          availDay.sort((a, b) => {
            const aIsSup = a.lineId.startsWith('Support') || a.lineId === 'Support';
            const bIsSup = b.lineId.startsWith('Support') || b.lineId === 'Support';
            // Line Support priority for DoorProtect variants:
            if (isDp && aIsSup !== bIsSup) {
              return aIsSup ? -1 : 1;
            }
            if (b.perfPct !== a.perfPct) return b.perfPct - a.perfPct;
            return (assignedDayHours[a.lineId] || 0) - (assignedDayHours[b.lineId] || 0);
          });
          chosenDay = availDay[0];
          const maxHoursForDay = Math.max(0, 10.83 - (assignedDayHours[chosenDay.lineId] || 0));
          const reqH = (shortage * chosenDay.actualCt) / 3600;
          dayHoursUsed = Math.min(reqH, maxHoursForDay);
          dayOutputProduced = Math.min(shortage, Math.floor((dayHoursUsed * 3600) / chosenDay.actualCt));
          assignedDayHours[chosenDay.lineId] = (assignedDayHours[chosenDay.lineId] || 0) + dayHoursUsed;
        } else {
          capableDay.sort((a, b) => {
            const aIsSup = a.lineId.startsWith('Support') || a.lineId === 'Support';
            const bIsSup = b.lineId.startsWith('Support') || b.lineId === 'Support';
            if (isDp && aIsSup !== bIsSup) return aIsSup ? -1 : 1;
            return (assignedDayHours[a.lineId] || 0) - (assignedDayHours[b.lineId] || 0);
          });
          chosenDay = capableDay[0];
          dayHoursUsed = 0;
          dayOutputProduced = 0;
        }

        window.AppStore.simLineOverridesDay[rowKey] = chosenDay.lineId;
        window.AppStore.simLineOverrides[rowKey] = chosenDay.lineId;
      } else {
        window.AppStore.simLineOverridesDay[rowKey] = capInfo.optimalLine.lineId;
        window.AppStore.simLineOverrides[rowKey] = capInfo.optimalLine.lineId;
      }

      // 2. Allocate remaining shortage to Night Shift (Strict Limit 10.58h)
      const remShortage = shortage - dayOutputProduced;
      if (remShortage > 0 && capableNight.length > 0) {
        let chosenNight = null;
        if (chosenDay && nightLines.has(chosenDay.lineId) && (assignedNightHours[chosenDay.lineId] || 0) < 10.58) {
          chosenNight = capInfo.capableLines.find(cl => cl.lineId === chosenDay.lineId) || null;
        }

        if (!chosenNight) {
          const availNight = capableNight.filter(cl => (assignedNightHours[cl.lineId] || 0) < 10.58);
          if (availNight.length > 0) {
            availNight.sort((a, b) => {
              const aIsSup = a.lineId.startsWith('Support') || a.lineId === 'Support';
              const bIsSup = b.lineId.startsWith('Support') || b.lineId === 'Support';
              // Line Support priority for DoorProtect variants:
              if (isDp && aIsSup !== bIsSup) {
                return aIsSup ? -1 : 1;
              }
              if (b.perfPct !== a.perfPct) return b.perfPct - a.perfPct;
              return (assignedNightHours[a.lineId] || 0) - (assignedNightHours[b.lineId] || 0);
            });
            chosenNight = availNight[0];
          } else {
            capableNight.sort((a, b) => {
              const aIsSup = a.lineId.startsWith('Support') || a.lineId === 'Support';
              const bIsSup = b.lineId.startsWith('Support') || b.lineId === 'Support';
              if (isDp && aIsSup !== bIsSup) return aIsSup ? -1 : 1;
              return (assignedNightHours[a.lineId] || 0) - (assignedNightHours[b.lineId] || 0);
            });
            chosenNight = capableNight[0];
          }
        }

        if (chosenNight) {
          window.AppStore.simLineOverridesNight[rowKey] = chosenNight.lineId;
          const maxHoursForNight = Math.max(0, 10.58 - (assignedNightHours[chosenNight.lineId] || 0));
          if (maxHoursForNight > 0) {
            const reqHN = (remShortage * chosenNight.actualCt) / 3600;
            const nightHoursUsed = Math.min(reqHN, maxHoursForNight);
            assignedNightHours[chosenNight.lineId] = (assignedNightHours[chosenNight.lineId] || 0) + nightHoursUsed;
          }
        } else {
          window.AppStore.simLineOverridesNight[rowKey] = 'NONE';
        }
      } else {
        window.AppStore.simLineOverridesNight[rowKey] = 'NONE';
      }

      if (capableDay.length > 0 || capableNight.length > 0) {
        allocatedCount++;
      } else {
        unsupportedCount++;
      }
    });

    window.renderCapacityView();
    if (unsupportedCount > 0) {
      window.showToast('warning', `Đã tự động phân bổ ${allocatedCount} Model vào Ca Ngày (10.83h) & Ca Đêm (10.58h). Có ${unsupportedCount} Model chưa có Line đi làm phù hợp!`);
    } else {
      window.showToast('success', `Đã tự động phân bổ ${allocatedCount} Model tối ưu vào Ca Ngày (10.83h) & Ca Đêm (10.58h)!`);
    }
  };

  // ==========================================
  // GOOGLE SHEETS EXPORT & LINE SEQUENCE ORDER
  // ==========================================

  function resolveSimRowNote(r) {
    if (!r || !window.AppStore || !window.AppStore.simManualNotes) return '';
    const notes = window.AppStore.simManualNotes;
    const it = r.it || {};
    const rawKey = r.rowKey || `${it.stage || ''}___${it.model || ''}___${it.productName1C || ''}`.replace(/"/g, '&quot;');
    const unescapedKey = rawKey.replace(/&quot;/g, '"');
    const val = notes[rawKey] || notes[unescapedKey] || notes[it.productName1C] || notes[it.model] || '';
    return String(val).trim();
  }

  function getUnscheduledWarningModels() {
    const rows = window.AppStore.lastProcessedSimRows || [];
    const list = [];

    rows.forEach((r, i) => {
      const hasDay = !!(r.assignedDayLineId && r.assignedDayLineId !== 'NONE' && String(r.assignedDayLineId).trim() !== '');
      const hasNight = !!(r.assignedNightLineId && r.assignedNightLineId !== 'NONE' && String(r.assignedNightLineId).trim() !== '');
      const it = r.it || {};
      const gapQty = it.cumGapQty !== undefined ? it.cumGapQty : (r.shortage ? -r.shortage : 0);
      const shortage = r.shortage !== undefined ? r.shortage : (gapQty < 0 ? Math.abs(gapQty) : 0);

      // Các Model đang thiếu sản lượng nhưng CHƯA được nhập Line SX vào Ca Ngày hoặc Ca Đêm
      if (!hasDay && !hasNight && (shortage > 0 || gapQty < 0)) {
        const rowKey = r.rowKey || `${it.stage || 'ASSEMBLY'}___${it.model || ''}___${it.productName1C || ''}`.replace(/"/g, '&quot;');
        list.push({
          idx: r.idx !== undefined ? r.idx : i,
          rowKey,
          stage: it.stage || 'ASSEMBLY',
          modelGroup: it.model || '',
          productName1C: it.productName1C || '',
          planQty: it.cumPlanQty || 0,
          factQty: it.cumFactQty || 0,
          gapQty,
          shortage,
          norm: r.norm || 0,
          stdHours: Math.round(((r.stdHours || 0)) * 100) / 100,
          note: resolveSimRowNote(r)
        });
      }
    });

    return list;
  }
  window.getUnscheduledWarningModels = getUnscheduledWarningModels;

  function getScheduledLineJobs() {
    const rows = window.AppStore.lastProcessedSimRows || [];
    const jobs = [];

    rows.forEach(r => {
      // 1. Day Shift scheduled job - CHỈ lấy các Model thực sự đã được sắp xếp/gán Line SX sau khi lưu
      const dayLineId = (r.assignedDayLineId && r.assignedDayLineId !== 'NONE' && String(r.assignedDayLineId).trim() !== '')
        ? String(r.assignedDayLineId).trim()
        : null;
      if (dayLineId) {
        const dayQty = (r.planDay !== undefined && r.planDay !== null && r.planDay > 0) ? r.planDay : 0;
        const dayH = (r.dayAvailHours !== undefined && r.dayAvailHours !== null && r.dayAvailHours > 0) ? r.dayAvailHours : 0;
        const dayCt = r.actualCtDay || r.norm || 0;
        const daySeq = (r.seqDay && !isNaN(parseInt(r.seqDay))) ? parseInt(r.seqDay) : ((r.seqDayNum && isFinite(r.seqDayNum)) ? r.seqDayNum : 99);
        const dayPerf = (r.perfPctDay !== undefined && r.perfPctDay !== null && r.perfPctDay !== '') ? r.perfPctDay : 100;

        jobs.push({
          lineId: dayLineId,
          shiftName: 'Ca Ngày',
          shiftCode: 'DAY',
          seq: daySeq,
          idx: r.idx !== undefined ? r.idx : 0,
          stage: r.it.stage || 'ASSEMBLY',
          modelGroup: r.it.model || '',
          productName1C: r.it.productName1C || '',
          planQty: r.it.cumPlanQty || 0,
          factQty: r.it.cumFactQty || 0,
          gapQty: r.it.cumGapQty !== undefined ? r.it.cumGapQty : (r.shortage ? -r.shortage : 0),
          allocatedQty: dayQty,
          actualCt: dayCt,
          perfPct: dayPerf,
          hours: Math.round(dayH * 100) / 100,
          quotaHours: 10.83,
          isZeroQuota: (dayQty === 0 && dayH === 0)
        });
      }

      // 2. Night Shift scheduled job - CHỈ lấy các Model thực sự đã được sắp xếp/gán Line SX sau khi lưu
      const nightLineId = (r.assignedNightLineId && r.assignedNightLineId !== 'NONE' && String(r.assignedNightLineId).trim() !== '')
        ? String(r.assignedNightLineId).trim()
        : null;
      if (nightLineId) {
        const nightQty = (r.planNight !== undefined && r.planNight !== null && r.planNight > 0) ? r.planNight : 0;
        const nightH = (r.nightAvailHours !== undefined && r.nightAvailHours !== null && r.nightAvailHours > 0) ? r.nightAvailHours : 0;
        const nightCt = r.actualCtNight || r.norm || 0;
        const nightSeq = (r.seqNight && !isNaN(parseInt(r.seqNight))) ? parseInt(r.seqNight) : ((r.seqNightNum && isFinite(r.seqNightNum)) ? r.seqNightNum : 99);
        const nightPerf = (r.perfPctNight !== undefined && r.perfPctNight !== null && r.perfPctNight !== '') ? r.perfPctNight : 100;

        jobs.push({
          lineId: nightLineId,
          shiftName: 'Ca Đêm',
          shiftCode: 'NIGHT',
          seq: nightSeq,
          idx: r.idx !== undefined ? r.idx : 0,
          stage: r.it.stage || 'ASSEMBLY',
          modelGroup: r.it.model || '',
          productName1C: r.it.productName1C || '',
          planQty: r.it.cumPlanQty || 0,
          factQty: r.it.cumFactQty || 0,
          gapQty: r.nightShortage ? -r.nightShortage : (r.it.cumGapQty || 0),
          allocatedQty: nightQty,
          actualCt: nightCt,
          perfPct: nightPerf,
          hours: Math.round(nightH * 100) / 100,
          quotaHours: 10.58,
          isZeroQuota: (nightQty === 0 && nightH === 0)
        });
      }
    });

    // Group jobs by lineId and shiftCode to calculate sequential cumulative hours
    const lineShiftGroups = {};
    jobs.forEach(j => {
      const k = `${j.lineId}___${j.shiftCode}`;
      if (!lineShiftGroups[k]) lineShiftGroups[k] = [];
      lineShiftGroups[k].push(j);
    });

    Object.values(lineShiftGroups).forEach(groupJobs => {
      // Sort within the line by sequence ascending, then by original row index
      groupJobs.sort((a, b) => {
        const seqA = (a.seq !== undefined && isFinite(a.seq)) ? a.seq : 999;
        const seqB = (b.seq !== undefined && isFinite(b.seq)) ? b.seq : 999;
        if (seqA !== seqB) return seqA - seqB;
        return a.idx - b.idx;
      });

      let curH = 0;
      groupJobs.forEach((j, groupIdx) => {
        if (!isFinite(j.seq) || j.seq >= 99 || j.seq <= 0) {
          j.seq = groupIdx + 1;
        }
        j.startHours = Math.round(curH * 10) / 10;
        j.endHours = Math.round((curH + j.hours) * 10) / 10;
        curH = j.endHours;
        j.isFullQuota = j.endHours >= (j.quotaHours - 0.05);
      });
    });

    // Custom sorting: Shift (ALL DAY FIRST, then ALL NIGHT) -> Line ID -> Sequence ascending
    const lineOrder = { '1A': 1, '1B': 2, '1C': 3, '1D': 4, '2A': 5, '2B': 6, '2C': 7, '2D': 8, '3A': 9, '3B': 10, '3C': 11, '3D': 12, 'Support 1': 13, 'Support 2': 14, 'Support 3': 15, 'Support': 13 };
    jobs.sort((a, b) => {
      if (a.shiftCode !== b.shiftCode) return a.shiftCode === 'DAY' ? -1 : 1;
      const orderA = lineOrder[a.lineId] || 99;
      const orderB = lineOrder[b.lineId] || 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.seq !== b.seq) return a.seq - b.seq;
      return a.idx - b.idx;
    });

    return jobs;
  }
  window.getScheduledLineJobs = getScheduledLineJobs;

  window.handleExportCapacityScheduleGoogleSheet = function() {
    const rows = window.AppStore.lastProcessedSimRows || [];
    if (rows.length === 0) {
      window.showToast('warning', 'Chưa có Model nào trong bảng để xuất file!');
      return;
    }

    const _defSimExpWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const fromDate = window.AppStore.simFromDate || window.AppStore.fromDate || window.AppStore.datamassFromDate || (_defSimExpWeek ? _defSimExpWeek.fromDate : '2026-11-05');
    const toDate = window.AppStore.simToDate || window.AppStore.toDate || window.AppStore.datamassToDate || (_defSimExpWeek ? _defSimExpWeek.toDate : '2026-11-05');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    let grandPlan = 0;
    let grandFact = 0;
    let grandGap = 0;
    let grandStdHours = 0;
    let grandActualHoursDay = 0;
    let grandDayAvailHours = 0;
    let grandPlanDay = 0;
    let grandNightShortage = 0;
    let grandActualHoursNight = 0;
    let grandNightAvailHours = 0;
    let grandPlanNight = 0;
    let grandFinalShortage = 0;

    rows.forEach(r => {
      grandPlan += (r.it.cumPlanQty || 0);
      grandFact += (r.it.cumFactQty || 0);
      grandGap += (r.it.cumGapQty || 0);
      grandStdHours += (r.stdHours || 0);
      grandActualHoursDay += (r.actualHoursDay || 0);
      grandDayAvailHours += (r.dayAvailHours || 0);
      grandPlanDay += (r.planDay || 0);
      grandNightShortage += (r.nightShortage || 0);
      grandActualHoursNight += (r.actualHoursNight || 0);
      grandNightAvailHours += (r.nightAvailHours || 0);
      grandPlanNight += (r.planNight || 0);
      grandFinalShortage += (r.finalShortage || 0);
    });

    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    let csv = '\uFEFF'; // UTF-8 BOM
    // Row 0: Tổng Cộng
    const totalRow = [
      '',
      '',
      `Người lập: ${plannerName}`,
      'Tổng Cộng :',
      grandPlan,
      grandFact,
      grandGap,
      '',
      '',
      '',
      grandStdHours.toFixed(1),
      '',
      '',
      '',
      '',
      grandActualHoursDay > 0 ? grandActualHoursDay.toFixed(1) : '',
      grandDayAvailHours > 0 ? grandDayAvailHours.toFixed(2) : '',
      grandPlanDay > 0 ? grandPlanDay : '',
      grandNightShortage > 0 ? `-${grandNightShortage}` : '',
      '',
      '',
      '',
      '',
      grandActualHoursNight > 0 ? grandActualHoursNight.toFixed(1) : '',
      grandNightAvailHours > 0 ? grandNightAvailHours.toFixed(2) : '',
      grandPlanNight > 0 ? grandPlanNight : '',
      grandFinalShortage > 0 ? `-${grandFinalShortage}` : '',
      '',
      ''
    ];
    csv += totalRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(',') + '\n';

    // Row 1: Headers 28 cột
    const headers = [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Mã Model (1C)',
      'Kế Hoạch',
      'Thực Tế',
      'Chênh Lệch',
      'Date Plan',
      'Shift Plan',
      'Cycle Time TC',
      'Tổng TG Tiêu Chuẩn',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'PF %',
      'Tổng TG Cần Thực Tế 1',
      'Tổng TG Có Ca Ngày',
      'Plan Ca Ngày',
      'Kế hoạch Còn Thiếu Ca Đêm',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'PF %',
      'Tổng TG Cần Thực Tế 2',
      'Tổng TG Có Ca Đêm',
      'Plan Ca Đêm',
      'Kế hoạch Còn Thiếu Tổng',
      'Ghi Chú',
      'Âm Từ Ngày / Ca'
    ];
    csv += headers.map(h => `"${h}"`).join(',') + '\n';

    // Rows 2+: Data
    rows.forEach((r, idx) => {
      const cleanModel = (r.it.productName1C || '').replace(/"/g, '""');
      const cleanGroup = (r.it.model || '').replace(/"/g, '""');
      const stdHStr = r.stdHours > 0 ? r.stdHours.toFixed(2) : '';
      const actHDayStr = r.actualHoursDay > 0 ? r.actualHoursDay.toFixed(3) : '';
      const dayAvailHStr = r.dayAvailHours > 0 ? r.dayAvailHours.toFixed(2) : '';
      const nightShortageStr = r.nightShortage > 0 ? `-${r.nightShortage}` : '';
      const perfDayStr = r.perfPctDay !== null && r.perfPctDay !== undefined && r.assignedDayLineId ? `${r.perfPctDay}%` : '';

      const actHNightStr = r.actualHoursNight > 0 ? r.actualHoursNight.toFixed(3) : '';
      const nightAvailHStr = r.nightAvailHours > 0 ? r.nightAvailHours.toFixed(2) : '';
      const finalShortageStr = r.finalShortage > 0 ? `-${r.finalShortage}` : '';
      const perfNightStr = r.perfPctNight !== null && r.perfPctNight !== undefined && r.assignedNightLineId ? `${r.perfPctNight}%` : '';

      const rRowKey = `${r.it.stage}___${r.it.model}___${r.it.productName1C}`.replace(/"/g, '&quot;');
      const noteVal = (window.AppStore.simManualNotes && (window.AppStore.simManualNotes[rRowKey] || window.AppStore.simManualNotes[r.it.productName1C] || window.AppStore.simManualNotes[r.it.model])) || '';
      const cleanNote = String(noteVal).replace(/"/g, '""');

      const row = [
        idx + 1,
        r.it.stage || 'ASSEMBLY',
        cleanGroup,
        cleanModel,
        r.it.cumPlanQty || 0,
        r.it.cumFactQty || 0,
        r.it.cumGapQty || 0,
        r.datePlanLabel || '--',
        r.shiftPlanLabel || '--',
        r.norm || '',
        stdHStr,
        r.shiftTextDay || (r.shortage > 0 ? 'Ca Ngày' : ''),
        r.assignedDayLineId || '',
        r.seqDay || '',
        perfDayStr,
        actHDayStr,
        dayAvailHStr,
        r.planDay > 0 ? r.planDay : '',
        nightShortageStr,
        r.shiftTextNight || 'Ca Đêm',
        r.assignedNightLineId || '',
        r.seqNight || '',
        perfNightStr,
        actHNightStr,
        nightAvailHStr,
        r.planNight > 0 ? r.planNight : '',
        finalShortageStr,
        cleanNote,
        r.cumNegOriginLabel || '--'
      ];
      csv += row.map(v => typeof v === 'number' ? v : `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tien_Do_San_Luong_Va_De_Xuat_Line_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.showToast('success', `📥 Đã xuất file CSV chuẩn 29 cột (${rows.length} Model kèm Date Plan, Shift Plan, Ghi Chú & Âm Từ Ngày / Ca)!`);
  };

  window.handleCopyCapacityScheduleClipboard = function() {
    const rows = window.AppStore.lastProcessedSimRows || [];
    if (rows.length === 0) {
      window.showToast('warning', 'Chưa có Model nào trong bảng để sao chép!');
      return;
    }

    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    let grandPlan = 0;
    let grandFact = 0;
    let grandGap = 0;
    let grandStdHours = 0;
    let grandActualHoursDay = 0;
    let grandDayAvailHours = 0;
    let grandPlanDay = 0;
    let grandNightShortage = 0;
    let grandActualHoursNight = 0;
    let grandNightAvailHours = 0;
    let grandPlanNight = 0;
    let grandFinalShortage = 0;

    rows.forEach(r => {
      grandPlan += (r.it.cumPlanQty || 0);
      grandFact += (r.it.cumFactQty || 0);
      grandGap += (r.it.cumGapQty || 0);
      grandStdHours += (r.stdHours || 0);
      grandActualHoursDay += (r.actualHoursDay || 0);
      grandDayAvailHours += (r.dayAvailHours || 0);
      grandPlanDay += (r.planDay || 0);
      grandNightShortage += (r.nightShortage || 0);
      grandActualHoursNight += (r.actualHoursNight || 0);
      grandNightAvailHours += (r.nightAvailHours || 0);
      grandPlanNight += (r.planNight || 0);
      grandFinalShortage += (r.finalShortage || 0);
    });

    const headers = [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Mã Model (1C)',
      'Kế Hoạch',
      'Thực Tế',
      'Chênh Lệch',
      'Date Plan',
      'Shift Plan',
      'Cycle Time TC',
      'Tổng TG Tiêu Chuẩn',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'PF %',
      'Tổng TG Cần Thực Tế 1',
      'Tổng TG Có Ca Ngày',
      'Plan Ca Ngày',
      'Kế hoạch Còn Thiếu Ca Đêm',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'PF %',
      'Tổng TG Cần Thực Tế 2',
      'Tổng TG Có Ca Đêm',
      'Plan Ca Đêm',
      'Kế hoạch Còn Thiếu Tổng',
      'Ghi Chú',
      'Âm Từ Ngày / Ca'
    ];

    let tsv = '';
    // Row 0: Tổng Cộng
    const totalRow = [
      '',
      '',
      `Người lập: ${plannerName}`,
      'Tổng Cộng :',
      grandPlan,
      grandFact,
      grandGap,
      '',
      '',
      '',
      grandStdHours.toFixed(1),
      '',
      '',
      '',
      '',
      grandActualHoursDay > 0 ? grandActualHoursDay.toFixed(1) : '',
      grandDayAvailHours > 0 ? grandDayAvailHours.toFixed(2) : '',
      grandPlanDay > 0 ? grandPlanDay : '',
      grandNightShortage > 0 ? `-${grandNightShortage}` : '',
      '',
      '',
      '',
      '',
      grandActualHoursNight > 0 ? grandActualHoursNight.toFixed(1) : '',
      grandNightAvailHours > 0 ? grandNightAvailHours.toFixed(2) : '',
      grandPlanNight > 0 ? grandPlanNight : '',
      grandFinalShortage > 0 ? `-${grandFinalShortage}` : '',
      '',
      ''
    ];
    tsv += totalRow.join('\t') + '\n';

    // Row 1: Headers
    tsv += headers.join('\t') + '\n';

    // Rows 2+: Data
    rows.forEach((r, idx) => {
      const stdHStr = r.stdHours > 0 ? r.stdHours.toFixed(2) : '';
      const actHDayStr = r.actualHoursDay > 0 ? r.actualHoursDay.toFixed(3) : '';
      const dayAvailHStr = r.dayAvailHours > 0 ? r.dayAvailHours.toFixed(2) : '';
      const nightShortageStr = r.nightShortage > 0 ? `-${r.nightShortage}` : '';
      const perfDayStr = r.perfPctDay !== null && r.perfPctDay !== undefined && r.assignedDayLineId ? `${r.perfPctDay}%` : '';

      const actHNightStr = r.actualHoursNight > 0 ? r.actualHoursNight.toFixed(3) : '';
      const nightAvailHStr = r.nightAvailHours > 0 ? r.nightAvailHours.toFixed(2) : '';
      const finalShortageStr = r.finalShortage > 0 ? `-${r.finalShortage}` : '';
      const perfNightStr = r.perfPctNight !== null && r.perfPctNight !== undefined && r.assignedNightLineId ? `${r.perfPctNight}%` : '';

      const rRowKey = `${r.it.stage}___${r.it.model}___${r.it.productName1C}`.replace(/"/g, '&quot;');
      const noteVal = (window.AppStore.simManualNotes && (window.AppStore.simManualNotes[rRowKey] || window.AppStore.simManualNotes[r.it.productName1C] || window.AppStore.simManualNotes[r.it.model])) || '';
      const cleanNote = String(noteVal).replace(/[\t\r\n]/g, ' ');

      const row = [
        idx + 1,
        r.it.stage || 'ASSEMBLY',
        r.it.model || '',
        r.it.productName1C || '',
        r.it.cumPlanQty || 0,
        r.it.cumFactQty || 0,
        r.it.cumGapQty || 0,
        r.datePlanLabel || '--',
        r.shiftPlanLabel || '--',
        r.norm || '',
        stdHStr,
        r.shiftTextDay || (r.shortage > 0 ? 'Ca Ngày' : ''),
        r.assignedDayLineId || '',
        r.seqDay || '',
        perfDayStr,
        actHDayStr,
        dayAvailHStr,
        r.planDay > 0 ? r.planDay : '',
        nightShortageStr,
        r.shiftTextNight || 'Ca Đêm',
        r.assignedNightLineId || '',
        r.seqNight || '',
        perfNightStr,
        actHNightStr,
        nightAvailHStr,
        r.planNight > 0 ? r.planNight : '',
        finalShortageStr,
        cleanNote,
        r.cumNegOriginLabel || '--'
      ];
      tsv += row.map(sanitizeTsvCell).join('\t') + '\n';
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        window.showToast('success', `📋 Đã sao chép bảng 29 cột (${rows.length} Model kèm Date Plan, Shift Plan, Ghi Chú & Âm Từ Ngày / Ca)! Mở Google Sheets và bấm Ctrl+V để dán ngay.`);
      }).catch(err => {
        fallbackCopyText(tsv);
      });
    } else {
      fallbackCopyText(tsv);
    }

    function fallbackCopyText(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        window.showToast('success', `📋 Đã sao chép bảng 29 cột! Mở Google Sheets và bấm Ctrl+V để dán.`);
      } catch (e) {
        window.showToast('error', 'Không thể sao chép tự động. Vui lòng thử nút Xuất Google Sheets (CSV)!');
      }
      document.body.removeChild(ta);
    }
  };

  function populateLineSeqFilterOptions(allJobs) {
    const select = document.getElementById('lineSeqFilterSelect');
    if (!select) return [];
    const lineOrder = { '1A': 1, '1B': 2, '1C': 3, '1D': 4, '2A': 5, '2B': 6, '2C': 7, '2D': 8, '3A': 9, '3B': 10, '3C': 11, '3D': 12, 'Support 1': 13, 'Support 2': 14, 'Support 3': 15, 'Support': 13 };
    const scheduledLines = Array.from(new Set((allJobs || []).map(j => j.lineId).filter(Boolean))).sort((a, b) => {
      const oa = lineOrder[a] || 99;
      const ob = lineOrder[b] || 99;
      if (oa !== ob) return oa - ob;
      return String(a).localeCompare(String(b));
    });
    const currentVal = window.AppStore.lineSeqFilterLine || 'ALL';
    select.innerHTML = `<option value="ALL">-- Tất cả các Chuyền (${scheduledLines.length}) --</option>` +
      scheduledLines.map(lid => `<option value="${lid}">Line ${lid}</option>`).join('');
    if (currentVal !== 'ALL' && scheduledLines.includes(currentVal)) {
      select.value = currentVal;
    } else {
      window.AppStore.lineSeqFilterLine = 'ALL';
      select.value = 'ALL';
    }
    return scheduledLines;
  }

  window.handleLineSeqWarningNoteChange = function(inputEl, shouldSyncDraft = false) {
    if (!inputEl) return;
    const rawEnc = inputEl.getAttribute('data-row-key') || '';
    let rowKey = '';
    try { rowKey = decodeURIComponent(rawEnc); } catch (e) { rowKey = rawEnc; }
    if (!rowKey) return;

    const val = (inputEl.value || '').trim();
    const hasNote = val.length > 0;

    if (!window.AppStore.simManualNotes) window.AppStore.simManualNotes = {};
    if (!hasNote) {
      delete window.AppStore.simManualNotes[rowKey];
    } else {
      window.AppStore.simManualNotes[rowKey] = val;
    }

    inputEl.style.background = hasNote ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.14)';
    inputEl.style.borderColor = hasNote ? 'rgba(16, 185, 129, 0.6)' : 'rgba(248, 113, 113, 0.75)';

    const tr = inputEl.closest('tr');
    if (tr) {
      const pill = tr.querySelector('.line-seq-warning-status-pill');
      if (pill) {
        pill.className = `line-seq-warning-status-pill badge ${hasNote ? 'badge-green' : 'badge-red'}`;
        pill.textContent = hasNote ? '✅ Đã ghi chú' : '⚠️ Chưa có KH';
      }
    }

    // Đồng bộ giá trị ghi chú ngược lại bảng Simulator chính mà không làm mất focus ô đang nhập
    document.querySelectorAll('.sim-table-note-input').forEach(simInp => {
      if (simInp.getAttribute('data-row-key') === rawEnc) {
        simInp.value = val;
      }
    });

    // Cập nhật bộ đếm số model còn thiếu ghi chú trong modal
    const unscheduled = getUnscheduledWarningModels();
    const missingCount = unscheduled.filter(m => !m.note).length;
    const missingBadge = document.getElementById('lineSeqWarningMissingBadge');
    if (missingBadge) {
      if (missingCount > 0) {
        missingBadge.className = 'badge badge-red';
        missingBadge.innerHTML = `⚠️ Còn ${missingCount}/${unscheduled.length} Model chưa nhập Ghi Chú`;
      } else {
        missingBadge.className = 'badge badge-green';
        missingBadge.innerHTML = `✅ Đã nhập đủ Ghi Chú (${unscheduled.length}/${unscheduled.length})`;
      }
    }
    const footerWarnSpan = document.getElementById('lineSeqFooterWarnSpan');
    if (footerWarnSpan) {
      footerWarnSpan.innerHTML = unscheduled.length > 0
        ? `⚠️ ${unscheduled.length} Model chưa gán Line (${missingCount} thiếu ghi chú)`
        : '';
    }

    if (shouldSyncDraft && window.handleSaveSimPlanDraft) {
      window.handleSaveSimPlanDraft(true);
    }
  };

  window.handleExportUnscheduledWarningCSV = function() {
    const list = getUnscheduledWarningModels();
    if (list.length === 0) {
      if (window.showToast) window.showToast('info', 'Không có Model cảnh báo nào chưa có kế hoạch!');
      return;
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    let csv = '\uFEFF';
    csv += `"DANH SÁCH MODEL CẢNH BÁO CHƯA CÓ KẾ HOẠCH (CHƯA INPUT LINE) - TỔNG: ${list.length} MODEL"\n`;
    const headers = ['STT', 'Công Đoạn', 'Group Model', 'Mã Model (1C)', 'Kế Hoạch', 'Thực Tế', 'Bù Thiếu', 'TG Tiêu Chuẩn (h)', 'Trạng Thái', 'Ghi Chú'];
    csv += headers.map(h => `"${h}"`).join(',') + '\n';
    list.forEach((m, idx) => {
      const row = [
        idx + 1,
        m.stage,
        m.modelGroup,
        m.productName1C,
        m.planQty,
        m.factQty,
        m.gapQty,
        m.stdHours.toFixed(2),
        'Chưa nhập Line',
        m.note || '(Chưa nhập ghi chú)'
      ];
      csv += row.map(v => typeof v === 'number' ? v : `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Canh_Bao_Model_Chua_Co_Ke_Hoach_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (window.showToast) window.showToast('success', `📥 Đã xuất CSV danh sách ${list.length} Model chưa có kế hoạch!`);
  };

  window.handleCopyUnscheduledWarningClipboard = function() {
    const list = getUnscheduledWarningModels();
    if (list.length === 0) {
      if (window.showToast) window.showToast('info', 'Không có Model cảnh báo nào chưa có kế hoạch!');
      return;
    }
    let tsv = `DANH SÁCH MODEL CẢNH BÁO CHƯA CÓ KẾ HOẠCH (CHƯA INPUT LINE)\tTổng: ${list.length} Model\n`;
    tsv += ['STT', 'Công Đoạn', 'Group Model', 'Mã Model (1C)', 'Kế Hoạch', 'Thực Tế', 'Bù Thiếu', 'TG Tiêu Chuẩn (h)', 'Trạng Thái', 'Ghi Chú'].join('\t') + '\n';
    list.forEach((m, idx) => {
      tsv += [
        idx + 1,
        m.stage,
        m.modelGroup,
        m.productName1C,
        m.planQty,
        m.factQty,
        m.gapQty,
        m.stdHours.toFixed(2),
        'Chưa nhập Line',
        String(m.note || '(Chưa nhập ghi chú)').replace(/[\t\r\n]/g, ' ')
      ].join('\t') + '\n';
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        if (window.showToast) window.showToast('success', `📋 Đã sao chép ${list.length} Model cảnh báo chưa có kế hoạch!`);
      }).catch(() => {});
    }
  };

  function buildUnscheduledWarningSectionHtml(unscheduledModels) {
    if (!unscheduledModels || unscheduledModels.length === 0) return '';
    const missingCount = unscheduledModels.filter(m => !m.note).length;

    const rowsHtml = unscheduledModels.map((m, idx) => {
      const hasNote = !!(m.note && m.note.trim() !== '');
      const encKey = encodeURIComponent(m.rowKey);
      const safeNoteAttr = String(m.note || '').replace(/"/g, '&quot;');
      return `
        <tr data-warning-row-key="${encKey}">
          <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
          <td style="text-align: center;">
            <span class="badge badge-blue" style="font-size: 0.68rem; font-weight: 700;">${m.stage}</span>
          </td>
          <td style="font-weight: 800; color: #f8fafc; font-size: 0.78rem;">${m.modelGroup || '--'}</td>
          <td style="font-family: var(--font-mono); font-size: 0.72rem; color: #93c5fd; max-width: 210px; word-break: break-word;">${m.productName1C}</td>
          <td class="font-mono" style="text-align: right; color: #60a5fa; font-weight: 700;">${(m.planQty || 0).toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 700;">${(m.factQty || 0).toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; color: #f87171; font-weight: 800;">${(m.gapQty || 0).toLocaleString('vi-VN')}</td>
          <td class="font-mono" style="text-align: right; color: #fbbf24; font-weight: 700;">${m.stdHours.toFixed(2)}h</td>
          <td style="text-align: center; white-space: nowrap;">
            <span class="line-seq-warning-status-pill badge ${hasNote ? 'badge-green' : 'badge-red'}" style="font-size: 0.68rem; font-weight: 800;">
              ${hasNote ? '✅ Đã ghi chú' : '⚠️ Chưa có KH'}
            </span>
          </td>
          <td style="min-width: 185px; padding: 0.25rem 0.4rem;">
            <input
              type="text"
              class="line-seq-warning-note-input"
              data-row-key="${encKey}"
              value="${safeNoteAttr}"
              placeholder="⚠️ Bắt buộc nhập ghi chú..."
              required
              oninput="handleLineSeqWarningNoteChange(this, false)"
              onchange="handleLineSeqWarningNoteChange(this, true)"
              onkeydown="if(event.key==='Enter') this.blur();"
              style="width: 100%; padding: 0.3rem 0.5rem; font-size: 0.76rem; color: #f8fafc; background: ${hasNote ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.14)'}; border: 1px solid ${hasNote ? 'rgba(16, 185, 129, 0.6)' : 'rgba(248, 113, 113, 0.75)'}; border-radius: 6px; outline: none; box-sizing: border-box;"
              title="Yêu cầu nhập ghi chú cho Model chưa được input Line"
            >
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div id="lineSeqUnscheduledSection" style="margin-top: 1.5rem; border: 1px solid rgba(248, 113, 113, 0.45); border-radius: 10px; background: rgba(127, 29, 29, 0.14); overflow: hidden;">
        <div style="padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.12); border-bottom: 1px solid rgba(248, 113, 113, 0.3); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 1.15rem;">⚠️</span>
              <span style="font-weight: 900; font-size: 0.9rem; color: #fca5a5;">
                DANH SÁCH MODEL CẢNH BÁO CHƯA CÓ KẾ HOẠCH (${unscheduledModels.length} Model chưa input Line)
              </span>
              <span id="lineSeqWarningMissingBadge" class="badge ${missingCount > 0 ? 'badge-red' : 'badge-green'}" style="font-size: 0.72rem; font-weight: 800;">
                ${missingCount > 0 ? `⚠️ Còn ${missingCount}/${unscheduledModels.length} Model chưa nhập Ghi Chú` : `✅ Đã nhập đủ Ghi Chú (${unscheduledModels.length}/${unscheduledModels.length})`}
              </span>
            </div>
            <div style="font-size: 0.75rem; color: #fecaca; margin-top: 0.25rem;">
              Các Model thiếu sản lượng dưới đây chưa được nhập vào Line SX nào nên không xuất trong kế hoạch theo Line. Vui lòng nhập <strong>Ghi Chú</strong> lý do / hướng xử lý.
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <button type="button" class="btn btn-secondary" onclick="handleExportUnscheduledWarningCSV()" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; font-weight: 700; color: #fca5a5; border-color: rgba(248, 113, 113, 0.5); background: rgba(15, 23, 42, 0.75);">
              <span>📥 Xuất CSV Cảnh Báo</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="handleCopyUnscheduledWarningClipboard()" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; font-weight: 700; color: #fde68a; border-color: rgba(251, 191, 36, 0.45); background: rgba(15, 23, 42, 0.75);">
              <span>📋 Copy Cảnh Báo</span>
            </button>
          </div>
        </div>
        <div style="overflow-x: auto; max-height: 360px;">
          <table class="sim-seq-table" style="width: 100%;">
            <thead style="position: sticky; top: 0; z-index: 4; background: rgba(15, 23, 42, 0.98);">
              <tr>
                <th style="width: 38px; text-align: center;">STT</th>
                <th style="width: 78px; text-align: center;">CÔNG ĐOẠN</th>
                <th style="min-width: 105px;">GROUP MODEL</th>
                <th style="min-width: 185px;">MÃ MODEL (1C)</th>
                <th style="text-align: right; min-width: 68px; color: #60a5fa;">KẾ HOẠCH</th>
                <th style="text-align: right; min-width: 65px; color: #34d399;">THỰC TẾ</th>
                <th style="text-align: right; min-width: 72px; color: #f87171;">BÙ THIẾU</th>
                <th style="text-align: right; min-width: 65px; color: #fbbf24;">TG TC</th>
                <th style="text-align: center; min-width: 92px;">CẢNH BÁO</th>
                <th style="min-width: 185px; color: #fca5a5;">GHI CHÚ (YÊU CẦU NHẬP) *</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.handleOpenLineSequenceModal = function() {
    const modal = document.getElementById('lineSequenceModal');
    if (!modal) return;

    window.AppStore.lineSeqFilterLine = 'ALL';
    window.AppStore.lineSeqFilterShift = 'ALL';
    if (!window.AppStore.lineSeqViewMode) window.AppStore.lineSeqViewMode = 'CARDS';

    // Chỉ populate các Line thực sự đã được sắp xếp kế hoạch sau khi lưu
    populateLineSeqFilterOptions(getScheduledLineJobs());

    const shiftSelect = document.getElementById('lineSeqShiftFilterSelect');
    if (shiftSelect) shiftSelect.value = 'ALL';

    const viewSelect = document.getElementById('lineSeqViewModeSelect');
    if (viewSelect) viewSelect.value = window.AppStore.lineSeqViewMode;

    window.renderLineSequenceModalContent();
    modal.style.display = 'flex';
  };

  window.closeLineSequenceModal = function() {
    const modal = document.getElementById('lineSequenceModal');
    if (modal) modal.style.display = 'none';
  };
  window.handleCloseLineSequenceModal = window.closeLineSequenceModal;

  window.handleLineSeqFilterChange = function(lineId) {
    window.AppStore.lineSeqFilterLine = lineId;
    const select = document.getElementById('lineSeqFilterSelect');
    if (select && select.value !== lineId) select.value = lineId;
    window.renderLineSequenceModalContent();
  };

  window.handleLineSeqShiftFilterChange = function(shift) {
    window.AppStore.lineSeqFilterShift = shift;
    const select = document.getElementById('lineSeqShiftFilterSelect');
    if (select && select.value !== shift) select.value = shift;
    window.renderLineSequenceModalContent();
  };

  window.handleLineSeqViewModeChange = function(mode) {
    window.AppStore.lineSeqViewMode = mode;
    const select = document.getElementById('lineSeqViewModeSelect');
    if (select && select.value !== mode) select.value = mode;
    window.renderLineSequenceModalContent();
  };

  window.renderLineSequenceModalContent = function() {
    const container = document.getElementById('lineSeqModalBody');
    const badge = document.getElementById('lineSeqModalCountBadge');
    const summaryInfo = document.getElementById('lineSeqModalSummaryInfo');
    if (!container) return;

    const allJobs = getScheduledLineJobs();
    populateLineSeqFilterOptions(allJobs);
    const unscheduledModels = getUnscheduledWarningModels();
    const unscheduledWarningHtml = buildUnscheduledWarningSectionHtml(unscheduledModels);
    const missingNotesCount = unscheduledModels.filter(m => !m.note).length;

    const filterLine = window.AppStore.lineSeqFilterLine || 'ALL';
    const filterShift = window.AppStore.lineSeqFilterShift || 'ALL';
    const viewMode = window.AppStore.lineSeqViewMode || 'CARDS';

    const filteredJobs = allJobs.filter(j => {
      if (filterLine !== 'ALL' && j.lineId !== filterLine) return false;
      if (filterShift !== 'ALL' && j.shiftCode !== filterShift) return false;
      return true;
    });

    // Group jobs by Line + Shift key
    const groups = {};
    filteredJobs.forEach(j => {
      const groupKey = `${j.lineId}___${j.shiftCode}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          lineId: j.lineId,
          shiftCode: j.shiftCode,
          shiftName: j.shiftName,
          quotaHours: j.quotaHours,
          totalHours: 0,
          totalQty: 0,
          jobs: []
        };
      }
      groups[groupKey].jobs.push(j);
      groups[groupKey].totalHours += j.hours;
      groups[groupKey].totalQty += j.allocatedQty;
    });

    const lineOrder = { '1A': 1, '1B': 2, '1C': 3, '1D': 4, '2A': 5, '2B': 6, '2C': 7, '2D': 8, '3A': 9, '3B': 10, '3C': 11, '3D': 12, 'Support 1': 13, 'Support 2': 14, 'Support 3': 15, 'Support': 13 };
    const groupKeys = Object.keys(groups).sort((keyA, keyB) => {
      const grpA = groups[keyA];
      const grpB = groups[keyB];
      if (grpA.shiftCode !== grpB.shiftCode) {
        return grpA.shiftCode === 'DAY' ? -1 : 1;
      }
      const orderA = lineOrder[grpA.lineId] || 99;
      const orderB = lineOrder[grpB.lineId] || 99;
      return orderA - orderB;
    });

    if (badge) {
      badge.innerText = `${groupKeys.length} Chuyền/Ca (${filteredJobs.length} Model)` +
        (unscheduledModels.length > 0 ? ` • ⚠️ ${unscheduledModels.length} Chưa có KH` : '');
    }
    if (summaryInfo) {
      const totalH = filteredJobs.reduce((s, j) => s + j.hours, 0);
      const totalQ = filteredJobs.reduce((s, j) => s + j.allocatedQty, 0);
      const warnSuffix = unscheduledModels.length > 0
        ? ` • <span id="lineSeqFooterWarnSpan" style="color:#f87171; font-weight:700;">⚠️ ${unscheduledModels.length} Model chưa gán Line (${missingNotesCount} thiếu ghi chú)</span>`
        : '<span id="lineSeqFooterWarnSpan"></span>';
      summaryInfo.innerHTML = `Tổng cộng: <strong>${filteredJobs.length} lượt chạy</strong> • <strong>${totalH.toFixed(1)} giờ máy</strong> • <strong>${totalQ.toLocaleString('vi-VN')} pcs</strong> hoàn thành${warnSuffix}.`;
    }

    if (groupKeys.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1.75rem 1rem; color: #94a3b8; border: 1px dashed rgba(255,255,255,0.12); border-radius: 10px; background: rgba(15, 23, 42, 0.45);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #cbd5e1;">Chưa có Model nào được gán Line sản xuất sau khi lưu!</div>
          <div style="font-size: 0.8rem; margin-top: 0.35rem;">Chỉ những Model đã nhập <strong>Line SX</strong> mới xuất hiện trong kế hoạch theo Chuyền. Các Model chưa nhập Line nằm ở danh sách cảnh báo bên dưới.</div>
        </div>
        ${unscheduledWarningHtml}
      `;
      return;
    }

    // CHẾ ĐỘ 1: XEM DẠNG 1 BẢNG TỔNG HỢP DUY NHẤT THEO THỨ TỰ LINE (Đáp ứng yêu cầu tổng hợp thành 1 bảng đúng plan)
    if (viewMode === 'TABLE') {
      const tableRowsHtml = filteredJobs.map((j, idx) => {
        const isDay = j.shiftCode === 'DAY';
        const shiftColor = isDay ? '#fbbf24' : '#c084fc';
        return `
          <tr>
            <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
            <td style="text-align: center; font-weight: 800; color: ${shiftColor}; font-size: 0.775rem;">
              ${j.shiftName}
            </td>
            <td style="text-align: center; font-weight: 900; color: #f8fafc; font-size: 0.8rem;">
              Line ${j.lineId}
            </td>
            <td style="text-align: center; font-weight: 900;">
              <span class="sim-seq-badge ${isDay ? 'day-seq' : 'night-seq'}">#${j.seq}</span>
            </td>
            <td style="text-align: center;">
              <span class="badge badge-blue" style="font-size: 0.68rem; font-weight: 700;">${j.stage}</span>
            </td>
            <td style="font-weight: 800; color: #f8fafc; font-size: 0.8rem;">
              ${j.modelGroup}
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: #93c5fd; max-width: 300px; word-break: break-all;">
              ${j.productName1C}
            </td>
            <td class="font-mono" style="text-align: right; color: #f87171; font-weight: 700; font-size: 0.8rem;">
              ${j.gapQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800; font-size: 0.825rem;">
              +${j.allocatedQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono" style="text-align: right; color: #cbd5e1; font-size: 0.775rem;">
              ${Math.round((Number(j.actualCt) || 0) * 10) / 10}s
            </td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: ${shiftColor}; font-size: 0.825rem;">
              ${j.hours.toFixed(1)}h
            </td>
            <td class="font-mono" style="text-align: center; color: #94a3b8; font-size: 0.75rem;">
              ${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h
            </td>
            <td style="text-align: center;">
              <span class="badge ${j.isZeroQuota ? 'badge-red' : 'badge-green'}" style="font-size: 0.68rem; font-weight: 800;">
                ${j.isZeroQuota ? '⚠️ Chờ quota (0h)' : (j.isFullQuota ? '✅ Đầy ca' : '✅ Trong ca')}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="sim-seq-group-card" style="padding: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);">
          <div style="overflow-x: auto; max-height: 520px;">
            <table class="sim-seq-table" style="width: 100%;">
              <thead style="position: sticky; top: 0; z-index: 5; background: rgba(15, 23, 42, 0.98);">
                <tr>
                  <th style="width: 45px; text-align: center;">STT</th>
                  <th style="width: 85px; text-align: center;">CA</th>
                  <th style="width: 80px; text-align: center;">LINE</th>
                  <th style="width: 65px; text-align: center;">THỨ TỰ</th>
                  <th style="width: 85px; text-align: center;">CÔNG ĐOẠN</th>
                  <th style="min-width: 130px;">GROUP MODEL</th>
                  <th style="min-width: 260px;">MÃ MODEL (1C)</th>
                  <th style="text-align: right; min-width: 90px;">BÙ THIẾU</th>
                  <th style="text-align: right; min-width: 95px; color: #34d399;">SẢN LƯỢNG</th>
                  <th style="text-align: right; min-width: 55px;">CT</th>
                  <th style="text-align: right; min-width: 75px;">GIỜ CHẠY</th>
                  <th style="text-align: center; min-width: 115px;">LŨY KẾ GIỜ</th>
                  <th style="text-align: center; min-width: 95px;">ĐÁNH GIÁ</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
              <tfoot>
                <tr style="background: rgba(15, 23, 42, 0.95); font-weight: 800; border-top: 2px solid var(--border-glass);">
                  <td colspan="7" style="text-align: right; color: #fbbf24; font-size: 0.8rem; padding: 0.5rem 0.75rem;">
                    TỔNG CỘNG (${filteredJobs.length} Model):
                  </td>
                  <td class="font-mono" style="text-align: right; color: #f87171; font-weight: 800; padding: 0.5rem 0.5rem;">
                    ${filteredJobs.reduce((s, j) => s + (j.gapQty || 0), 0).toLocaleString('vi-VN')}
                  </td>
                  <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800; font-size: 0.85rem; padding: 0.5rem 0.5rem;">
                    +${filteredJobs.reduce((s, j) => s + (j.allocatedQty || 0), 0).toLocaleString('vi-VN')}
                  </td>
                  <td></td>
                  <td class="font-mono" style="text-align: right; color: #fbbf24; font-weight: 800; font-size: 0.85rem; padding: 0.5rem 0.5rem;">
                    ${filteredJobs.reduce((s, j) => s + (j.hours || 0), 0).toFixed(1)}h
                  </td>
                  <td colspan="2" style="text-align: center; color: #94a3b8; font-size: 0.75rem; padding: 0.5rem;">
                    Toàn bộ Chuyền &amp; Ca
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        ${unscheduledWarningHtml}
      `;
      return;
    }

    // CHẾ ĐỘ 2: GOM THEO TỪNG CHUYỀN (CARD VIEW NHƯ ẢNH ĐÍNH KÈM)
    let lastShiftCode = null;
    const html = groupKeys.map(key => {
      const grp = groups[key];
      const isDay = grp.shiftCode === 'DAY';
      const shiftIcon = isDay ? '☀️' : '🌙';
      const shiftColor = isDay ? '#fbbf24' : '#c084fc';
      const isUnder = grp.totalHours <= grp.quotaHours + 0.05;

      let sectionHeaderHtml = '';
      if (filterShift === 'ALL' && grp.shiftCode !== lastShiftCode) {
        lastShiftCode = grp.shiftCode;
        sectionHeaderHtml = `
          <div style="margin: ${isDay ? '0.25rem' : '1.75rem'} 0 0.85rem 0; padding: 0.6rem 1rem; background: ${isDay ? 'rgba(251, 191, 36, 0.08)' : 'rgba(192, 132, 252, 0.08)'}; border: 1px solid ${isDay ? 'rgba(251, 191, 36, 0.25)' : 'rgba(192, 132, 252, 0.25)'}; border-left: 5px solid ${shiftColor}; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.15rem;">${shiftIcon}</span>
              <span style="font-weight: 900; font-size: 0.875rem; color: ${shiftColor}; text-transform: uppercase; letter-spacing: 0.03em;">
                ${isDay ? 'CÁC CHUYỀN SẢN XUẤT CA NGÀY (QUY CHUẨN ≤ 10.83H / LINE)' : 'CÁC CHUYỀN SẢN XUẤT CA ĐÊM (QUY CHUẨN ≤ 10.58H / LINE)'}
              </span>
            </div>
            <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">
              ${isDay ? '☀️ Ưu tiên chạy trước đầu tiên trong ngày' : '🌙 Tiếp quản và chạy tiếp ca đêm'}
            </span>
          </div>
        `;
      }

      const rowsHtml = grp.jobs.map(j => {
        return `
          <tr>
            <td style="text-align: center; font-weight: 900;">
              <span class="sim-seq-badge ${isDay ? 'day-seq' : 'night-seq'}">#${j.seq}</span>
            </td>
            <td style="text-align: center;">
              <span class="badge badge-blue" style="font-size: 0.68rem; font-weight: 700;">${j.stage}</span>
            </td>
            <td style="font-weight: 800; color: #f8fafc;">
              ${j.modelGroup}
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.72rem; color: #93c5fd; max-width: 280px; word-break: break-all;">
              ${j.productName1C}
            </td>
            <td class="font-mono" style="text-align: right; color: #f87171; font-weight: 700;">
              ${j.gapQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono" style="text-align: right; color: #34d399; font-weight: 800;">
              +${j.allocatedQty.toLocaleString('vi-VN')}
            </td>
            <td class="font-mono" style="text-align: right; color: #cbd5e1;">
              ${Math.round((Number(j.actualCt) || 0) * 10) / 10}s
            </td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: ${shiftColor}; font-size: 0.825rem;">
              ${j.hours.toFixed(1)}h
            </td>
            <td class="font-mono" style="text-align: center; color: #94a3b8; font-size: 0.72rem;">
              ${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h
            </td>
            <td style="text-align: center;">
              <span class="badge ${j.isZeroQuota ? 'badge-red' : 'badge-green'}" style="font-size: 0.68rem; font-weight: 800;">
                ${j.isZeroQuota ? '⚠️ Chờ quota (0h)' : (j.isFullQuota ? '✅ Đầy ca' : '✅ Trong ca')}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        ${sectionHeaderHtml}
        <div class="sim-seq-group-card">
          <div class="sim-seq-group-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 900; font-size: 0.95rem; color: #f8fafc;">Line ${grp.lineId}</span>
              <span style="font-size: 0.8rem; font-weight: 800; color: ${shiftColor}; display: inline-flex; align-items: center; gap: 0.25rem;">
                <span>${shiftIcon}</span> <span>${grp.shiftName}</span>
              </span>
              <span class="font-mono" style="font-size: 0.8rem; color: #94a3b8;">
                (Tổng: <strong style="color: ${shiftColor};">${grp.totalHours.toFixed(1)}h</strong> / ${grp.quotaHours}h định mức)
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.75rem; color: #cbd5e1;">
                Sản lượng: <strong style="color: #34d399; font-family: var(--font-mono);">+${grp.totalQty.toLocaleString('vi-VN')} pcs</strong>
              </span>
              <span class="badge ${isUnder ? 'badge-green' : 'badge-red'}" style="font-size: 0.7rem; font-weight: 800;">
                ${isUnder ? `✅ ≤ ${grp.quotaHours}h (Đạt chuẩn)` : '❌ Vượt ca'}
              </span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="sim-seq-table">
              <thead>
                <tr>
                  <th style="width: 55px; text-align: center;">THỨ TỰ</th>
                  <th style="width: 85px; text-align: center;">CÔNG ĐOẠN</th>
                  <th style="min-width: 120px;">GROUP MODEL</th>
                  <th style="min-width: 250px;">MÃ MODEL (1C)</th>
                  <th style="text-align: right; min-width: 90px;">BÙ THIẾU</th>
                  <th style="text-align: right; min-width: 95px; color: #34d399;">SẢN LƯỢNG</th>
                  <th style="text-align: right; min-width: 60px;">CT</th>
                  <th style="text-align: right; min-width: 80px; color: ${shiftColor};">GIỜ CHẠY</th>
                  <th style="text-align: center; min-width: 110px;">LŨY KẾ GIỜ</th>
                  <th style="text-align: center; min-width: 95px;">ĐÁNH GIÁ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html + unscheduledWarningHtml;
  };

  /* ======================================================== */
  /* XUẤT CSV VÀ COPY GOOGLE SHEETS THEO THỨ TỰ LINE         */
  /* ======================================================== */
  window.handleExportLineSequenceGoogleSheet = function() {
    const allJobs = getScheduledLineJobs();
    const filterLine = window.AppStore.lineSeqFilterLine || 'ALL';
    const filterShift = window.AppStore.lineSeqFilterShift || 'ALL';

    const filteredJobs = allJobs.filter(j => {
      if (filterLine !== 'ALL' && j.lineId !== filterLine) return false;
      if (filterShift !== 'ALL' && j.shiftCode !== filterShift) return false;
      return true;
    });

    if (filteredJobs.length === 0) {
      if (window.showToast) window.showToast('warning', 'Chưa có Model nào được phân bổ vào các Chuyền đi làm để xuất file!');
      return;
    }

    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const dateDisplay = now.toLocaleDateString('vi-VN');

    const totalHours = filteredJobs.reduce((s, j) => s + (j.hours || 0), 0);
    const totalQty = filteredJobs.reduce((s, j) => s + (j.allocatedQty || 0), 0);
    const totalGap = filteredJobs.reduce((s, j) => s + (j.gapQty || 0), 0);

    let csv = '\uFEFF'; // UTF-8 BOM
    // Row 0: Metadata / Summary
    csv += `"KẾ HOẠCH & THỨ TỰ SẢN XUẤT CHI TIẾT THEO TỪNG LINE - NGƯỜI LẬP: ${plannerName} (${dateDisplay}) - TỔNG: ${filteredJobs.length} LƯỢT CHẠY • ${totalHours.toFixed(1)}H MÁY • ${totalQty.toLocaleString('vi-VN')} PCS"\n`;

    // Row 1: Headers
    const headers = [
      'STT',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'Công Đoạn',
      'Group Model',
      'Mã Model (1C)',
      'Bù Thiếu',
      'Sản Lượng Plan',
      'Cycle Time (s)',
      'Giờ Chạy (h)',
      'Lũy Kế Giờ',
      'Định Mức Ca',
      'Đánh Giá'
    ];
    csv += headers.map(h => `"${h}"`).join(',') + '\n';

    // Rows: Data
    filteredJobs.forEach((j, idx) => {
      const row = [
        idx + 1,
        j.shiftName,
        `Line ${j.lineId}`,
        `#${j.seq}`,
        j.stage,
        j.modelGroup,
        j.productName1C,
        j.gapQty,
        j.allocatedQty,
        `${j.actualCt}s`,
        j.hours.toFixed(1),
        `${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h`,
        `${j.quotaHours}h`,
        j.isFullQuota ? 'Đầy ca' : 'Trong ca'
      ];
      csv += row.map(v => typeof v === 'number' ? v : `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    // Total Row
    const totalRow = [
      'Tổng Cộng',
      '',
      '',
      '',
      '',
      '',
      `${filteredJobs.length} Model`,
      totalGap,
      totalQty,
      '',
      totalHours.toFixed(1),
      '',
      '',
      ''
    ];
    csv += totalRow.map(v => typeof v === 'number' ? v : `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    window.__lastExportedLineSeqCsv = csv;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Ke_Hoach_Thu_Tu_San_Xuat_Theo_Line_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) {
      const missingCount = getUnscheduledWarningModels().filter(m => !m.note).length;
      const warnMsg = missingCount > 0 ? ` ⚠️ Còn ${missingCount} Model chưa có kế hoạch đang thiếu Ghi Chú!` : '';
      window.showToast(missingCount > 0 ? 'warning' : 'success', `📥 Đã xuất file CSV kế hoạch thứ tự Line (${filteredJobs.length} lượt chạy) thành công!${warnMsg}`);
    }
  };

  window.handleCopyLineSequenceClipboard = function() {
    const allJobs = getScheduledLineJobs();
    const filterLine = window.AppStore.lineSeqFilterLine || 'ALL';
    const filterShift = window.AppStore.lineSeqFilterShift || 'ALL';

    const filteredJobs = allJobs.filter(j => {
      if (filterLine !== 'ALL' && j.lineId !== filterLine) return false;
      if (filterShift !== 'ALL' && j.shiftCode !== filterShift) return false;
      return true;
    });

    if (filteredJobs.length === 0) {
      if (window.showToast) window.showToast('warning', 'Chưa có Model nào được phân bổ vào các Chuyền đi làm để sao chép!');
      return;
    }

    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    const now = new Date();
    const dateDisplay = now.toLocaleDateString('vi-VN');
    const totalHours = filteredJobs.reduce((s, j) => s + (j.hours || 0), 0);
    const totalQty = filteredJobs.reduce((s, j) => s + (j.allocatedQty || 0), 0);
    const totalGap = filteredJobs.reduce((s, j) => s + (j.gapQty || 0), 0);

    const headers = [
      'STT',
      'Ca Làm Việc',
      'Line SX',
      'Thứ Tự SX',
      'Công Đoạn',
      'Group Model',
      'Mã Model (1C)',
      'Bù Thiếu',
      'Sản Lượng Plan',
      'Cycle Time (s)',
      'Giờ Chạy (h)',
      'Lũy Kế Giờ',
      'Định Mức Ca',
      'Đánh Giá'
    ];

    let tsv = '';
    // Row 0: Summary
    tsv += `KẾ HOẠCH & THỨ TỰ SẢN XUẤT CHI TIẾT THEO TỪNG LINE\tNgười lập: ${plannerName}\tNgày: ${dateDisplay}\tTổng: ${filteredJobs.length} lượt chạy\t${totalHours.toFixed(1)} giờ máy\t${totalQty.toLocaleString('vi-VN')} pcs\n`;
    
    // Row 1: Headers
    tsv += headers.join('\t') + '\n';

    // Rows: Data
    filteredJobs.forEach((j, idx) => {
      const row = [
        idx + 1,
        j.shiftName,
        `Line ${j.lineId}`,
        `#${j.seq}`,
        j.stage,
        j.modelGroup,
        j.productName1C,
        j.gapQty,
        j.allocatedQty,
        `${j.actualCt}s`,
        j.hours.toFixed(1),
        `${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h`,
        `${j.quotaHours}h`,
        j.isFullQuota ? 'Đầy ca' : 'Trong ca'
      ];
      tsv += row.join('\t') + '\n';
    });

    // Total Row
    const totalRow = [
      'Tổng Cộng',
      '',
      '',
      '',
      '',
      '',
      `${filteredJobs.length} Model`,
      totalGap,
      totalQty,
      '',
      totalHours.toFixed(1),
      '',
      '',
      ''
    ];
    tsv += totalRow.join('\t') + '\n';
    window.__lastCopiedLineSeqTsv = tsv;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        if (window.showToast) {
          const missingCount = getUnscheduledWarningModels().filter(m => !m.note).length;
          const warnMsg = missingCount > 0 ? ` ⚠️ Còn ${missingCount} Model chưa có kế hoạch đang thiếu Ghi Chú!` : '';
          window.showToast(missingCount > 0 ? 'warning' : 'success', `📋 Đã sao chép Kế hoạch thứ tự Line (${filteredJobs.length} lượt chạy) vào Clipboard! Dán ngay (Ctrl+V) vào Google Sheets.${warnMsg}`);
        }
      }).catch(err => {
        fallbackCopyText(tsv);
      });
    } else {
      fallbackCopyText(tsv);
    }

    function fallbackCopyText(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (window.showToast) {
          window.showToast('success', `📋 Đã sao chép Kế hoạch thứ tự Line! Mở Google Sheets và bấm Ctrl+V để dán.`);
        }
      } catch (e) {
        if (window.showToast) {
          window.showToast('error', 'Không thể sao chép tự động. Vui lòng thử nút Xuất Google Sheets (CSV)!');
        }
      }
      document.body.removeChild(ta);
    }
  };

  /* ======================================================== */
  /* SIMULATOR PLAN DRAFT & HISTORY MANAGEMENT               */
  /* ======================================================== */
  window.handleTableNoteChange = function(rowKey, val) {
    if (!window.AppStore) return;
    if (!window.AppStore.simManualNotes) window.AppStore.simManualNotes = {};
    if (val === undefined || val === null || val.trim() === '') {
      delete window.AppStore.simManualNotes[rowKey];
    } else {
      window.AppStore.simManualNotes[rowKey] = val.trim();
    }
    if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
    renderCapacityViewPreservingScroll();
  };

  window.handleSaveSimPlanDraft = function(isSilent = false) {
    if (!window.AppStore) return;
    try {
      const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
        ? window.AppStore.simPlannerName
        : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

      const draft = {
        savedAt: new Date().toISOString(),
        displayTime: new Date().toLocaleString('vi-VN'),
        plannerName,
        stageFilter: window.AppStore.simStageFilter || 'ASSEMBLY',
        simFromDate: window.AppStore.simFromDate || window.AppStore.fromDate || '2026-11-05',
        simToDate: window.AppStore.simToDate || window.AppStore.toDate || '2026-11-05',
        simTargetDate: window.AppStore.simTargetDate || window.AppStore.simToDate || window.AppStore.toDate || '2026-10-26',
        simScope: window.AppStore.simScope || 'CUMULATIVE',
        simPlanStatusFilter: window.AppStore.simPlanStatusFilter || 'GAP_NEGATIVE',
        simGroupFilter: window.AppStore.simGroupFilter || 'ALL',
        simSearchVal: window.AppStore.simSearchVal || '',
        appliedPlanId: window.AppStore._currentAppliedPlanId || '',
        simWorkingLinesDay: window.AppStore.simWorkingLinesDay ? [...window.AppStore.simWorkingLinesDay] : [],
        simWorkingLinesNight: window.AppStore.simWorkingLinesNight ? [...window.AppStore.simWorkingLinesNight] : [],
        _simLinesManualConfigured: window.AppStore._simLinesManualConfigured,
        simManualLinesDay: { ...(window.AppStore.simManualLinesDay || {}) },
        simManualLinesNight: { ...(window.AppStore.simManualLinesNight || {}) },
        simLineOverridesDay: { ...(window.AppStore.simLineOverridesDay || {}) },
        simLineOverridesNight: { ...(window.AppStore.simLineOverridesNight || {}) },
        simLineOverrides: { ...(window.AppStore.simLineOverrides || {}) },
        simManualSeqsDay: { ...(window.AppStore.simManualSeqsDay || {}) },
        simManualSeqsNight: { ...(window.AppStore.simManualSeqsNight || {}) },
        simManualPfDay: { ...(window.AppStore.simManualPfDay || {}) },
        simManualPfNight: { ...(window.AppStore.simManualPfNight || {}) },
        simManualPlanDay: { ...(window.AppStore.simManualPlanDay || {}) },
        simManualPlanNight: { ...(window.AppStore.simManualPlanNight || {}) },
        simManualShifts: { ...(window.AppStore.simManualShifts || {}) },
        simManualNotes: { ...(window.AppStore.simManualNotes || {}) },
        hardtestState: buildHardtestDraftState()
      };

      localStorage.setItem('AJAX_SIM_PLAN_DRAFT', JSON.stringify(draft));

      if (!isSilent && window.showToast) {
        window.showToast('success', `💾 Đã lưu tạm kế hoạch (${draft.displayTime})! Dữ liệu sẽ được bảo toàn khi refresh.`);
      }
    } catch (e) {
      console.warn('Cannot save sim draft:', e);
      if (!isSilent && window.showToast) {
        window.showToast('danger', 'Lỗi khi lưu tạm kế hoạch!');
      }
    }
  };

  window.handleResetSimPlan = function() {
    if (!window.AppStore) return;
    if (window.AppStore.selectedCapacityStage === 'TOTAL_HARDTEST') {
      const confirmHtMsg = 'BẠN CÓ CHẮC CHẮN MUỐN ĐẶT LẠI (RESET) KẾ HOẠCH TOTAL HARDTEST?\n\n' +
        '• Toàn bộ Kíp trực (về HT A Ngày / HT B Đêm), Số Test Block dùng và Số Người sử dụng Ca Ngày/Ca Đêm của Total Hardtest sẽ được đặt lại về đề xuất chuẩn.\n\n' +
        'Bấm OK để xác nhận Reset.';
      if (!window.confirm(confirmHtMsg)) return;
      window.AppStore.hardtestManualTbDay = {};
      window.AppStore.hardtestManualManDay = {};
      window.AppStore.hardtestManualTbNight = {};
      window.AppStore.hardtestManualManNight = {};
      window.AppStore.hardtestManualTb = {};
      window.AppStore.hardtestManualMan = {};
      window.AppStore.hardtestPlanOverrides = {};
      window.AppStore.hardtestWorkingKipsDay = ['HT A'];
      window.AppStore.hardtestWorkingKipsNight = ['HT B'];
      window.AppStore._htKipsManualConfigured = false;
      window.AppStore.hardtestManpowerOverrideDay = null;
      window.AppStore.hardtestManpowerOverrideNight = null;
      if (window.handleSaveSimPlanDraft) window.handleSaveSimPlanDraft(true);
      if (window.renderCapacityView) window.renderCapacityView();
      if (window.showToast) {
        window.showToast('info', '🔄 Đã đặt lại (Reset) kế hoạch Total Hardtest về đề xuất chuẩn!');
      }
      return;
    }

    const confirmMsg = 'BẠN CÓ CHẮC CHẮN MUỐN ĐẶT LẠI (RESET) KẾ HOẠCH SẢN XUẤT?\n\n' +
      '• Toàn bộ Line phân bổ thủ công, số lượng Plan Ca Ngày/Ca Đêm, Thứ tự sản xuất và Ghi chú sẽ được xóa bỏ để tính toán lại.\n' +
      '• Bản lưu tạm (Draft) hiện tại cũng sẽ được làm mới về ban đầu.\n\n' +
      'Bấm OK để xác nhận Reset.';
    if (!window.confirm(confirmMsg)) return;

    window.AppStore.simLineOverrides = {};
    window.AppStore.simLineOverridesDay = {};
    window.AppStore.simLineOverridesNight = {};
    window.AppStore.simManualLinesDay = {};
    window.AppStore.simManualLinesNight = {};
    window.AppStore.simManualSeqsDay = {};
    window.AppStore.simManualSeqsNight = {};
    window.AppStore.simManualPfDay = {};
    window.AppStore.simManualPfNight = {};
    window.AppStore.simManualPlanDay = {};
    window.AppStore.simManualPlanNight = {};
    window.AppStore.simManualShifts = {};
    window.AppStore.simManualNotes = {};

    try {
      localStorage.removeItem('AJAX_SIM_PLAN_DRAFT');
    } catch (e) {}

    if (window.renderCapacityView) window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', '🔄 Đã đặt lại (Reset) toàn bộ kế hoạch sản xuất về trạng thái ban đầu!');
    }
  };

  /* Multi-User Broadcast Channel & Watcher */
  function initAppliedPlanIdOnce() {
    if (!window.AppStore || window.AppStore._appliedPlanIdInitialized) return;
    window.AppStore._appliedPlanIdInitialized = true;
    if (window.AppStore._currentAppliedPlanId === undefined) {
      let seededId = '';
      try {
        const draftStr = localStorage.getItem('AJAX_SIM_PLAN_DRAFT');
        if (draftStr) {
          const parsedDraft = JSON.parse(draftStr);
          seededId = (parsedDraft && parsedDraft.appliedPlanId) || localStorage.getItem('AJAX_CURRENT_APPLIED_PLAN_ID') || '';
        }
      } catch (e) {
        seededId = '';
      }
      window.AppStore._currentAppliedPlanId = seededId;
    }
  }

  function getCurrentTabAppliedPlanId() {
    initAppliedPlanIdOnce();
    return (window.AppStore && window.AppStore._currentAppliedPlanId) ? window.AppStore._currentAppliedPlanId : '';
  }

  function mergeServerHistoryIntoLocal(historyList, latestPlan) {
    try {
      let localHist = [];
      try {
        localHist = JSON.parse(localStorage.getItem('AJAX_SIM_PLAN_HISTORY') || '[]');
      } catch (e) {}
      if (!Array.isArray(localHist)) localHist = [];
      const map = new Map();
      localHist.forEach(item => { if (item && item.id) map.set(item.id, item); });
      if (Array.isArray(historyList)) {
        historyList.forEach(item => { if (item && item.id) map.set(item.id, item); });
      }
      if (latestPlan && latestPlan.id) {
        map.set(latestPlan.id, latestPlan);
      }
      const merged = Array.from(map.values())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 50);
      localStorage.setItem('AJAX_SIM_PLAN_HISTORY', JSON.stringify(merged));
      const histBadge = document.getElementById('simHistoryBadge');
      if (histBadge) histBadge.textContent = String(merged.length);
      return merged;
    } catch (e) {
      return [];
    }
  }

  const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/buianhtuan-design/Production-Systems-WCAB/main/';
  const CLOUD_URL_STORAGE_KEY = 'AJAX_CLOUD_PLAN_SYNC_URL';

  function getStoredCloudPlanSyncUrl() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search && typeof URLSearchParams === 'function') {
        const sp = new URLSearchParams(window.location.search);
        const paramUrl = (sp.get('planSyncUrl') || '').trim();
        if (paramUrl && (paramUrl.startsWith('https://') || paramUrl.startsWith('http://'))) {
          try { localStorage.setItem(CLOUD_URL_STORAGE_KEY, paramUrl); } catch (e) {}
          if (window.AppStore) window.AppStore.cloudPlanSyncUrl = paramUrl;
          return paramUrl;
        }
      }
      if (window.AppStore && window.AppStore.cloudPlanSyncUrl) {
        return String(window.AppStore.cloudPlanSyncUrl).trim();
      }
      return (localStorage.getItem(CLOUD_URL_STORAGE_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  async function resolveCloudSyncConfigAsync() {
    const existing = getStoredCloudPlanSyncUrl();
    const now = Date.now();
    if (window.AppStore && window.AppStore._cloudCfgFetchedAt && (now - window.AppStore._cloudCfgFetchedAt) < 15000) {
      return existing || (window.AppStore.cloudPlanSyncUrl || '');
    }
    if (window.AppStore) window.AppStore._cloudCfgFetchedAt = now;

    const urlsToTry = [];
    const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    if (!isGh) urlsToTry.push('/api/cloud-sync-config?t=' + now);
    urlsToTry.push('./cloud_sync_config.json?t=' + now);
    if (isGh) urlsToTry.push(RAW_GITHUB_BASE + 'cloud_sync_config.json?t=' + now);

    for (const u of urlsToTry) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res && res.ok) {
          const cfg = await res.json();
          if (cfg && typeof cfg === 'object') {
            if (cfg.lanUrl && window.AppStore) window.AppStore._detectedLanUrl = cfg.lanUrl;
            if (cfg.cloudPlanSyncUrl && String(cfg.cloudPlanSyncUrl).trim()) {
              const cleanUrl = String(cfg.cloudPlanSyncUrl).trim();
              if (window.AppStore) window.AppStore.cloudPlanSyncUrl = cleanUrl;
              if (!existing) {
                try { localStorage.setItem(CLOUD_URL_STORAGE_KEY, cleanUrl); } catch (e) {}
              }
              return existing || cleanUrl;
            }
          }
        }
      } catch (e) {}
    }
    return existing;
  }

  function pickNewestPlan(candidates) {
    let best = null;
    let bestMs = -1;
    (candidates || []).forEach(p => {
      if (!p || !p.id) return;
      const ms = p.createdAt ? Date.parse(p.createdAt) : 0;
      const validMs = isNaN(ms) ? 0 : ms;
      if (!best || validMs > bestMs) {
        best = p;
        bestMs = validMs;
      }
    });
    return best;
  }

  async function safeFetchJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res || !res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function fetchStaticCompletedPlanFallback() {
    const bust = Date.now();
    const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    const calls = [
      safeFetchJson('./assembly_completed_plan_latest.json?t=' + bust),
      safeFetchJson('./assembly_plan_history.json?t=' + bust)
    ];
    if (isGh) {
      calls.push(safeFetchJson(RAW_GITHUB_BASE + 'assembly_completed_plan_latest.json?t=' + bust));
      calls.push(safeFetchJson(RAW_GITHUB_BASE + 'assembly_plan_history.json?t=' + bust));
    }

    const results = await Promise.all(calls);
    const localLatest = results[0] && results[0].id ? results[0] : null;
    const localHist = Array.isArray(results[1]) ? results[1] : [];
    const rawLatest = results[2] && results[2].id ? results[2] : null;
    const rawHist = Array.isArray(results[3]) ? results[3] : [];

    const histMap = new Map();
    [...localHist, ...rawHist].forEach(item => { if (item && item.id) histMap.set(item.id, item); });
    const mergedHist = Array.from(histMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const latestPlan = pickNewestPlan([localLatest, rawLatest, mergedHist[0]]);
    return {
      success: true,
      hasPlan: !!(latestPlan && latestPlan.id),
      latestPlan: (latestPlan && latestPlan.id) ? latestPlan : null,
      history: mergedHist,
      source: 'static'
    };
  }

  async function fetchCompletedPlanBundle() {
    const isGitHubPages = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    const cloudUrl = await resolveCloudSyncConfigAsync();

    const apiPromise = !isGitHubPages
      ? safeFetchJson('/api/completed-plan?t=' + Date.now())
      : Promise.resolve(null);

    const cloudPromise = cloudUrl
      ? safeFetchJson(cloudUrl + (cloudUrl.includes('?') ? '&' : '?') + 'action=get&t=' + Date.now())
      : Promise.resolve(null);

    const [apiData, cloudData] = await Promise.all([apiPromise, cloudPromise]);

    let staticData = null;
    const hasApi = !!(apiData && apiData.success);
    if (hasApi && apiData.lanUrl && window.AppStore) {
      window.AppStore._detectedLanUrl = apiData.lanUrl;
    }
    if (!hasApi) {
      staticData = await fetchStaticCompletedPlanFallback();
    }

    const candidates = [];
    const histMap = new Map();
    [apiData, staticData, cloudData].forEach(src => {
      if (!src || !src.success) return;
      if (src.latestPlan && src.latestPlan.id) candidates.push(src.latestPlan);
      if (Array.isArray(src.history)) {
        src.history.forEach(item => {
          if (item && item.id) histMap.set(item.id, item);
        });
      }
    });

    const newestPlan = pickNewestPlan(candidates);
    const mergedHistory = Array.from(histMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Nếu Web Local nhận được bản Cloud mới hơn bản Local -> tự đồng bộ ngược xuống /api/completed-plan
    if (!isGitHubPages && hasApi && cloudData && cloudData.latestPlan && cloudData.latestPlan.id) {
      const apiMs = (apiData.latestPlan && apiData.latestPlan.createdAt) ? Date.parse(apiData.latestPlan.createdAt) : 0;
      const cloudMs = cloudData.latestPlan.createdAt ? Date.parse(cloudData.latestPlan.createdAt) : 0;
      if (!isNaN(cloudMs) && (isNaN(apiMs) || cloudMs > apiMs)) {
        try {
          fetch('/api/completed-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudData.latestPlan)
          }).catch(() => {});
        } catch (e) {}
      }
    }

    return {
      success: true,
      hasPlan: !!(newestPlan && newestPlan.id),
      latestPlan: newestPlan || null,
      history: mergedHistory,
      lanUrl: (apiData && apiData.lanUrl) || (window.AppStore && window.AppStore._detectedLanUrl) || '',
      cloudUrl: cloudUrl || '',
      source: cloudData && cloudData.latestPlan === newestPlan ? 'cloud' : (hasApi ? 'api' : 'static')
    };
  }

  function handleIncomingCompletedPlan(remotePlan, isManualClick = false) {
    if (!window.AppStore || !remotePlan || !remotePlan.id) return false;
    const currentId = getCurrentTabAppliedPlanId();
    if (remotePlan.id === currentId) {
      // Vẫn cập nhật metadata nếu chưa có trên giao diện
      if (!window.AppStore._lastSyncedPlanMeta) {
        window.AppStore._lastSyncedPlanMeta = {
          id: remotePlan.id,
          planner: remotePlan.planner,
          dateStr: remotePlan.dateStr,
          timeStr: remotePlan.timeStr,
          modelsCount: remotePlan.modelsCount,
          grandPlan: remotePlan.grandPlan,
          grandPlanDay: remotePlan.grandPlanDay,
          grandPlanNight: remotePlan.grandPlanNight
        };
      }
      return false;
    }

    // Ngăn polling cũ/cache CDN ghi đè ngược bản mới hơn (ví dụ đã nhận qua BroadcastChannel nhưng server/CDN chưa cập nhật kịp)
    if (!isManualClick && currentId && currentId === window.AppStore._currentAppliedPlanMetaId &&
        window.AppStore._currentAppliedPlanCreatedAt && remotePlan.createdAt) {
      const remoteMs = Date.parse(remotePlan.createdAt);
      const curMs = Date.parse(window.AppStore._currentAppliedPlanCreatedAt);
      if (!isNaN(remoteMs) && !isNaN(curMs) && remoteMs <= curMs) {
        return false;
      }
    }

    window.AppStore._pendingRemotePlan = remotePlan;
    window.AppStore._hasPendingRemotePlan = true;
    window.AppStore._pendingRemotePlanDesc = `Người lập: <strong>${remotePlan.planner || 'Thành viên'}</strong> • Hoàn thành lúc: <strong>${remotePlan.dateStr || ''} ${remotePlan.timeStr || ''}</strong> • ${remotePlan.modelsCount || 0} Model (${(remotePlan.grandPlan || 0).toLocaleString('vi-VN')} pcs)`;

    // Tự động cập nhật ngay lập tức cho Admin và các User (trừ khi cố ý tắt _autoSyncRemotePlan)
    const currentRole = window.UserAuth && typeof window.UserAuth.getCurrentRole === 'function' ? window.UserAuth.getCurrentRole() : 'admin';
    const isAdmin = currentRole === 'admin';
    if (isAdmin || window.AppStore._autoSyncRemotePlan !== false) {
      console.log('⚡ [Auto Sync] Tự động cập nhật kế hoạch mới từ:', remotePlan.planner);
      window.handleApplyLatestCompletedPlan(true, true);
    } else {
      const banner = document.getElementById('simNewPlanBanner');
      const desc = document.getElementById('simBannerDesc');
      if (banner) {
        banner.style.display = 'flex';
        if (desc) desc.innerHTML = window.AppStore._pendingRemotePlanDesc;
      }
      const syncBtn = document.querySelector('.sim-btn-cloud-sync');
      if (syncBtn) syncBtn.classList.add('has-update');

      if (isManualClick && window.showToast) {
        window.showToast('info', `🔔 Phát hiện kế hoạch mới từ [${remotePlan.planner || 'Thành viên'}]! Bấm "Cập Nhật & Xem Ngay" trên banner.`);
      }
    }
    return true;
  }

  let simPlanSyncChannel = null;
  try {
    simPlanSyncChannel = new BroadcastChannel('AJAX_PROPLAN_PLAN_SYNC');
    simPlanSyncChannel.onmessage = function(ev) {
      if (ev && ev.data && ev.data.type === 'NEW_COMPLETED_PLAN') {
        handleIncomingCompletedPlan(ev.data.plan, false);
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  // Fallback cross-tab sync qua localStorage storage event cho cùng trình duyệt / origin
  if (!window._simStorageSyncBound) {
    window._simStorageSyncBound = true;
    window.addEventListener('storage', (ev) => {
      if (ev && ev.key === 'AJAX_LATEST_COMPLETED_PLAN_EVENT' && ev.newValue) {
        try {
          const payload = JSON.parse(ev.newValue);
          if (payload && payload.plan) {
            handleIncomingCompletedPlan(payload.plan, false);
          }
        } catch (e) {}
      }
    });
  }

  window.initPlanSyncWatcher = function() {
    initAppliedPlanIdOnce();
    if (window._simPlanSyncWatcherInitialized) return;
    window._simPlanSyncWatcherInitialized = true;

    // Kiểm tra ngay sau khi khởi tạo
    setTimeout(() => {
      if (window.handleCheckAndSyncCompletedPlan) {
        window.handleCheckAndSyncCompletedPlan(false);
      }
    }, 300);

    // Tự động kiểm tra ngay khi người dùng quay lại cửa sổ trình duyệt
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && window.handleCheckAndSyncCompletedPlan) {
        window.handleCheckAndSyncCompletedPlan(false);
      }
    });
    window.addEventListener('focus', () => {
      if (window.handleCheckAndSyncCompletedPlan) {
        window.handleCheckAndSyncCompletedPlan(false);
      }
    });

    // Polling ngầm liên tục mỗi 3 giây
    setInterval(() => {
      if (window.handleCheckAndSyncCompletedPlan) {
        window.handleCheckAndSyncCompletedPlan(false);
      }
    }, 3000);
  };

  window.handleAutoCheckLatestCompletedPlanOnLoad = function() {
    if (!window.AppStore) return;
    initAppliedPlanIdOnce();
    fetchCompletedPlanBundle()
      .then(data => {
        if (!data || !data.success) return;
        if (Array.isArray(data.history) || data.latestPlan) {
          mergeServerHistoryIntoLocal(data.history, data.latestPlan);
        }
        if (!data.latestPlan) return;
        const remotePlan = data.latestPlan;
        const currentAppliedId = getCurrentTabAppliedPlanId();

        // Bản kế hoạch trên server khác với bản hiện tại đang hiển thị -> Tự động nạp ngay
        if (remotePlan.id && remotePlan.id !== currentAppliedId) {
          console.log('⚡ [Auto Load] Phát hiện kế hoạch mới từ máy chủ, tự động áp dụng:', remotePlan.planner);
          handleIncomingCompletedPlan(remotePlan, false);
        } else if (remotePlan.id) {
          window.AppStore._lastSyncedPlanMeta = {
            id: remotePlan.id,
            planner: remotePlan.planner,
            dateStr: remotePlan.dateStr,
            timeStr: remotePlan.timeStr,
            modelsCount: remotePlan.modelsCount,
            grandPlan: remotePlan.grandPlan,
            grandPlanDay: remotePlan.grandPlanDay,
            grandPlanNight: remotePlan.grandPlanNight
          };
        }
      })
      .catch(e => console.warn('Cannot auto check latest plan on load:', e));
  };

  window.handleForceSyncLatestPlan = function() {
    if (!window.AppStore) return;
    if (window.showToast) window.showToast('info', '🔄 Đang kiểm tra và nạp bản kế hoạch mới nhất từ máy chủ...');
    fetchCompletedPlanBundle()
      .then(data => {
        if (!data || !data.success || !data.latestPlan) {
          if (window.showToast) window.showToast('warning', 'Chưa có bản kế hoạch nào được hoàn thành trên máy chủ.');
          return;
        }
        mergeServerHistoryIntoLocal(data.history, data.latestPlan);
        const plan = data.latestPlan;
        window.AppStore._pendingRemotePlan = plan;
        window.handleApplyLatestCompletedPlan(false, false);
      })
      .catch(err => {
        if (window.showToast) window.showToast('danger', 'Lỗi kết nối máy chủ: ' + err.message);
      });
  };

  window.handleCheckAndSyncCompletedPlan = function(isManualClick = false) {
    if (!window.AppStore) return;
    fetchCompletedPlanBundle()
      .then(data => {
        if (!data || !data.success) return;
        if (Array.isArray(data.history) || data.latestPlan) {
          mergeServerHistoryIntoLocal(data.history, data.latestPlan);
        }
        if (data.latestPlan) {
          const applied = handleIncomingCompletedPlan(data.latestPlan, isManualClick);
          if (!applied && isManualClick && window.showToast) {
            window.showToast('info', '✅ Kế hoạch hiện tại đã là phiên bản mới nhất từ máy chủ!');
          }
        } else {
          if (isManualClick && window.showToast) {
            window.showToast('info', 'Chưa có bản kế hoạch nào được hoàn thành trên hệ thống.');
          }
        }
      })
      .catch(err => {
        if (isManualClick && window.showToast) {
          window.showToast('warning', 'Không thể kết nối đến máy chủ để kiểm tra kế hoạch mới.');
        }
      });
  };

  window.handleApplyLatestCompletedPlan = function(isSilent = false, isAuto = false) {
    if (!window.AppStore) return;
    const plan = window.AppStore._pendingRemotePlan;
    if (!plan || !plan.snapshot) {
      fetchCompletedPlanBundle()
        .then(data => {
          if (data && data.latestPlan && data.latestPlan.snapshot) {
            mergeServerHistoryIntoLocal(data.history, data.latestPlan);
            window.AppStore._pendingRemotePlan = data.latestPlan;
            window.handleApplyLatestCompletedPlan(isSilent, isAuto);
          } else if (window.showToast && !isSilent) {
            window.showToast('warning', 'Không tìm thấy dữ liệu kế hoạch mới trên máy chủ!');
          }
        });
      return;
    }

    const s = plan.snapshot;
    if (s.plannerName) {
      window.AppStore.simPlannerName = s.plannerName;
      try { localStorage.setItem('AJAX_SIM_PLANNER_NAME', s.plannerName); } catch (e) {}
    }
    if (s.stageFilter) window.AppStore.simStageFilter = s.stageFilter;
    if (s.simFromDate) {
      window.AppStore.simFromDate = s.simFromDate;
      window.AppStore.fromDate = s.simFromDate;
    }
    if (s.simToDate) {
      window.AppStore.simToDate = s.simToDate;
      window.AppStore.toDate = s.simToDate;
    }
    if (s.simTargetDate) window.AppStore.simTargetDate = s.simTargetDate;
    if (s.simScope) window.AppStore.simScope = s.simScope;
    if (s.simPlanStatusFilter) window.AppStore.simPlanStatusFilter = s.simPlanStatusFilter;
    if (s.simGroupFilter) window.AppStore.simGroupFilter = s.simGroupFilter;
    if (s.simSearchVal !== undefined) window.AppStore.simSearchVal = s.simSearchVal;
    if (s.simWorkingLinesDay) window.AppStore.simWorkingLinesDay = [...s.simWorkingLinesDay];
    if (s.simWorkingLinesNight) window.AppStore.simWorkingLinesNight = [...s.simWorkingLinesNight];
    window.AppStore._simLinesManualConfigured = true;
    window.AppStore.simManualLinesDay = { ...(s.simManualLinesDay || {}) };
    window.AppStore.simManualLinesNight = { ...(s.simManualLinesNight || {}) };
    window.AppStore.simLineOverridesDay = { ...(s.simLineOverridesDay || {}) };
    window.AppStore.simLineOverridesNight = { ...(s.simLineOverridesNight || {}) };
    window.AppStore.simLineOverrides = { ...(s.simLineOverrides || {}) };
    window.AppStore.simManualSeqsDay = { ...(s.simManualSeqsDay || {}) };
    window.AppStore.simManualSeqsNight = { ...(s.simManualSeqsNight || {}) };
    window.AppStore.simManualPfDay = { ...(s.simManualPfDay || {}) };
    window.AppStore.simManualPfNight = { ...(s.simManualPfNight || {}) };
    window.AppStore.simManualPlanDay = { ...(s.simManualPlanDay || {}) };
    window.AppStore.simManualPlanNight = { ...(s.simManualPlanNight || {}) };
    if (s.simManualShifts) window.AppStore.simManualShifts = { ...(s.simManualShifts || {}) };
    if (s.simManualNotes) window.AppStore.simManualNotes = { ...(s.simManualNotes || {}) };
    if (s.hardtestState) {
      applyHardtestDraftFields(s.hardtestState, true);
    }

    window.AppStore._appliedPlanIdInitialized = true;
    window.AppStore._currentAppliedPlanId = plan.id;
    window.AppStore._currentAppliedPlanMetaId = plan.id;
    window.AppStore._currentAppliedPlanCreatedAt = plan.createdAt || new Date().toISOString();
    window.AppStore._lastSyncedPlanMeta = {
      id: plan.id,
      planner: plan.planner,
      dateStr: plan.dateStr,
      timeStr: plan.timeStr,
      modelsCount: plan.modelsCount,
      grandPlan: plan.grandPlan,
      grandPlanDay: plan.grandPlanDay,
      grandPlanNight: plan.grandPlanNight
    };
    try { localStorage.setItem('AJAX_CURRENT_APPLIED_PLAN_ID', plan.id); } catch (e) {}
    window.AppStore._hasPendingRemotePlan = false;

    mergeServerHistoryIntoLocal(null, plan);

    // Lưu vào draft để nếu F5 reload vẫn giữ đúng kế hoạch vừa nạp
    window.handleSaveSimPlanDraft(true);

    // Cập nhật giao diện Capacity nếu đang ở tab Capacity (cả Matrix status bar lẫn Simulator)
    const activeTab = document.querySelector('.nav-link.active')?.getAttribute('data-tab');
    if (activeTab === 'capacity' && window.renderCapacityView) {
      window.renderCapacityView();
    }

    // Cập nhật modal Thứ Tự Theo Chuyền nếu đang mở
    const lineSeqModal = document.getElementById('lineSequenceModal');
    if (lineSeqModal && lineSeqModal.style.display === 'flex' && typeof window.renderLineSequenceModalContent === 'function') {
      window.renderLineSequenceModalContent();
    }

    // Ẩn banner hoặc cập nhật trạng thái
    const banner = document.getElementById('simNewPlanBanner');
    if (banner) banner.style.display = 'none';
    const syncBtn = document.querySelector('.sim-btn-cloud-sync');
    if (syncBtn) syncBtn.classList.remove('has-update');

    if (window.showToast) {
      if (isAuto) {
        window.showToast('success', `⚡ TỰ ĐỘNG CẬP NHẬT KẾ HOẠCH MỚI NHẤT từ [${plan.planner || 'Thành viên'}] (${plan.dateStr} ${plan.timeStr})!`);
      } else if (!isSilent) {
        window.showToast('success', `⚡ ĐÃ ĐỒNG BỘ THÀNH CÔNG: Kế hoạch mới nhất của [${plan.planner || 'Hệ thống'}] (${plan.dateStr} ${plan.timeStr} - ${plan.modelsCount} Model)!`);
      }
    }
  };

  window.handleDismissNewPlanAlert = function() {
    if (window.AppStore) window.AppStore._hasPendingRemotePlan = false;
    const banner = document.getElementById('simNewPlanBanner');
    if (banner) banner.style.display = 'none';
    const syncBtn = document.querySelector('.sim-btn-cloud-sync');
    if (syncBtn) syncBtn.classList.remove('has-update');
  };

  window.handleCompleteSimPlan = function() {
    if (!window.AppStore) return;
    const plannerName = getSimPlannerName();
    const isHardtestStage = window.AppStore.selectedCapacityStage === 'TOTAL_HARDTEST';

    const processedRows = isHardtestStage
      ? (window.AppStore.lastProcessedHardtestSimRows || [])
      : (window.AppStore.lastProcessedSimRows || []);
    const modelsCount = processedRows.length;
    let grandPlan = 0;
    let grandFact = 0;
    let grandPlanDay = 0;
    let grandPlanNight = 0;
    if (isHardtestStage) {
      processedRows.forEach(r => {
        grandPlan += (r.planQty || 0);
        grandFact += (r.factQty || 0);
        grandPlanDay += (r.dayOutput || 0);
        grandPlanNight += (r.nightOutput || 0);
      });
    } else {
      processedRows.forEach(r => {
        grandPlan += (r.it.cumPlanQty || 0);
        grandFact += (r.it.cumFactQty || 0);
        grandPlanDay += (r.planDay || 0);
        grandPlanNight += (r.planNight || 0);
      });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const stageDisplay = isHardtestStage ? 'TOTAL HARDTEST' : (window.AppStore.simStageFilter || 'ASSEMBLY');

    const confirmMsg = `XÁC NHẬN HOÀN THÀNH KẾ HOẠCH SẢN XUẤT:\n\n` +
      `• Người lập Plan: ${plannerName}\n` +
      `• Ngày / Giờ lập: ${dateStr} ${timeStr}\n` +
      `• Công đoạn: ${stageDisplay}\n` +
      `• Tổng số Model: ${modelsCount} ${isHardtestStage ? 'Mã' : 'Model'}\n` +
      `• Tổng sản lượng Kế hoạch: ${grandPlan.toLocaleString('vi-VN')} pcs\n` +
      `• Đã xếp Ca Ngày: ${grandPlanDay.toLocaleString('vi-VN')} pcs | Ca Đêm: ${grandPlanNight.toLocaleString('vi-VN')} pcs\n\n` +
      `Kế hoạch sẽ được lưu vào mục LỊCH SỬ và đồng bộ ngay cho TẤT CẢ các User khác trên hệ thống!`;

    if (!window.confirm(confirmMsg)) return;

    // Snapshot object
    const historyItem = {
      id: 'PLAN_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      createdAt: now.toISOString(),
      dateStr: dateStr,
      timeStr: timeStr,
      planner: plannerName,
      stage: isHardtestStage ? 'TOTAL_HARDTEST' : (window.AppStore.simStageFilter || 'ASSEMBLY'),
      modelsCount,
      grandPlan,
      grandFact,
      grandPlanDay,
      grandPlanNight,
      workingLinesDay: [...(window.AppStore.simWorkingLinesDay || [])],
      workingLinesNight: [...(window.AppStore.simWorkingLinesNight || [])],
      snapshot: {
        plannerName,
        selectedCapacityStage: isHardtestStage ? 'TOTAL_HARDTEST' : 'ASSEMBLY',
        stageFilter: window.AppStore.simStageFilter || 'ASSEMBLY',
        simFromDate: window.AppStore.simFromDate || window.AppStore.fromDate,
        simToDate: window.AppStore.simToDate || window.AppStore.toDate,
        simTargetDate: window.AppStore.simTargetDate || window.AppStore.simToDate || window.AppStore.toDate,
        simScope: window.AppStore.simScope || 'CUMULATIVE',
        simPlanStatusFilter: window.AppStore.simPlanStatusFilter || 'GAP_NEGATIVE',
        simGroupFilter: window.AppStore.simGroupFilter || 'ALL',
        simSearchVal: window.AppStore.simSearchVal || '',
        simWorkingLinesDay: [...(window.AppStore.simWorkingLinesDay || [])],
        simWorkingLinesNight: [...(window.AppStore.simWorkingLinesNight || [])],
        simManualLinesDay: { ...(window.AppStore.simManualLinesDay || {}) },
        simManualLinesNight: { ...(window.AppStore.simManualLinesNight || {}) },
        simLineOverridesDay: { ...(window.AppStore.simLineOverridesDay || {}) },
        simLineOverridesNight: { ...(window.AppStore.simLineOverridesNight || {}) },
        simLineOverrides: { ...(window.AppStore.simLineOverrides || {}) },
        simManualSeqsDay: { ...(window.AppStore.simManualSeqsDay || {}) },
        simManualSeqsNight: { ...(window.AppStore.simManualSeqsNight || {}) },
        simManualPfDay: { ...(window.AppStore.simManualPfDay || {}) },
        simManualPfNight: { ...(window.AppStore.simManualPfNight || {}) },
        simManualPlanDay: { ...(window.AppStore.simManualPlanDay || {}) },
        simManualPlanNight: { ...(window.AppStore.simManualPlanNight || {}) },
        simManualShifts: { ...(window.AppStore.simManualShifts || {}) },
        simManualNotes: { ...(window.AppStore.simManualNotes || {}) },
        hardtestState: buildHardtestDraftState()
      }
    };

    // Đánh dấu bản hiện tại là do mình vừa hoàn thành trước khi lưu draft
    window.AppStore._appliedPlanIdInitialized = true;
    window.AppStore._currentAppliedPlanId = historyItem.id;
    window.AppStore._currentAppliedPlanMetaId = historyItem.id;
    window.AppStore._currentAppliedPlanCreatedAt = historyItem.createdAt;
    window.AppStore._lastSyncedPlanMeta = {
      id: historyItem.id,
      planner: historyItem.planner,
      dateStr: historyItem.dateStr,
      timeStr: historyItem.timeStr,
      modelsCount: historyItem.modelsCount,
      grandPlan: historyItem.grandPlan,
      grandPlanDay: historyItem.grandPlanDay,
      grandPlanNight: historyItem.grandPlanNight
    };
    window.AppStore._hasPendingRemotePlan = false;

    mergeServerHistoryIntoLocal(null, historyItem);
    try {
      window.handleSaveSimPlanDraft(true);
      localStorage.setItem('AJAX_CURRENT_APPLIED_PLAN_ID', historyItem.id);
      localStorage.setItem('AJAX_LATEST_COMPLETED_PLAN_EVENT', JSON.stringify({ id: historyItem.id, at: Date.now(), plan: historyItem }));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // Phát broadcast real-time cho các tab/cửa sổ cùng trình duyệt
    if (simPlanSyncChannel) {
      try {
        simPlanSyncChannel.postMessage({ type: 'NEW_COMPLETED_PLAN', plan: historyItem });
      } catch (e) {}
    }

    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', `💾 Đã lưu kế hoạch (${dateStr} ${timeStr}), đang đồng bộ lên máy chủ / Cloud cho các User khác...`);
    }

    const isGitHubPages = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    resolveCloudSyncConfigAsync().then(async (cloudUrl) => {
      let localSynced = false;
      let cloudSynced = false;

      if (!isGitHubPages) {
        try {
          const res = await fetch('/api/completed-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyItem)
          });
          if (res && res.ok) {
            const resp = await res.json();
            if (resp && resp.success) localSynced = true;
          }
        } catch (err) {
          console.warn('⚠️ Lỗi gửi đồng bộ lên server nội bộ:', err);
        }
      }

      if (cloudUrl) {
        try {
          // Dùng text/plain để Google Apps Script nhận trực tiếp qua CORS mà không bị block preflight
          const cRes = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(historyItem)
          });
          if (cRes && cRes.ok) {
            const cResp = await cRes.json().catch(() => ({ success: true }));
            if (!cResp || cResp.success !== false) cloudSynced = true;
          }
        } catch (cerr) {
          console.warn('⚠️ Lỗi gửi đồng bộ lên Cloud Apps Script:', cerr);
        }
      }

      window.AppStore._lastCompletedPlanObj = historyItem;

      if (localSynced || cloudSynced) {
        const targets = [];
        if (localSynced) targets.push('Web Server & GitHub');
        if (cloudSynced) targets.push('Google Cloud Sync');
        if (window.showToast) {
          window.showToast('success', `🎉 ĐÃ HOÀN THÀNH & ĐỒNG BỘ (${targets.join(' + ')})! Các User khác sẽ tự động thấy bản mới nhất (${dateStr} ${timeStr} - ${plannerName}).`);
        }
      } else {
        if (window.showToast) {
          window.showToast('warning', `⚠️ Đã lưu cục bộ trên máy này, NHƯNG chưa kết nối được Web Server nội bộ (/api/completed-plan) hoặc Cloud Sync nên User khác chưa tự thấy được!`);
        }
        if (isGitHubPages && typeof window.handleOpenCloudSyncModal === 'function') {
          window.handleOpenCloudSyncModal(true);
        }
      }
    });
  };

  window.handleExportPlanJsonFile = function() {
    if (!window.AppStore) return;
    let plan = window.AppStore._lastCompletedPlanObj || null;
    if (!plan) {
      try {
        const hist = JSON.parse(localStorage.getItem('AJAX_SIM_PLAN_HISTORY') || '[]');
        if (Array.isArray(hist) && hist.length > 0) plan = hist[0];
      } catch (e) {}
    }
    if (!plan) {
      if (window.showToast) window.showToast('warning', 'Hãy bấm "✅ Hoàn Thành" trước khi xuất file chia sẻ (.json)!');
      return;
    }
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePlanner = String(plan.planner || 'Planner').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `AJAX_Completed_Plan_${safePlanner}_${plan.id || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.showToast) {
      window.showToast('success', '📤 Đã tải xuống file Kế hoạch (.json). Gửi file này cho User khác hoặc máy chủ nạp trực tiếp!');
    }
  };

  window.handleImportPlanJsonFile = function(inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const parsed = JSON.parse(String(ev.target.result || '{}'));
        const plan = parsed.plan || parsed.latestPlan || parsed;
        if (!plan || !plan.id || !plan.snapshot) {
          throw new Error('File không đúng định dạng kế hoạch AJAX ProPlan (.json)');
        }
        window.AppStore._pendingRemotePlan = plan;
        window.handleApplyLatestCompletedPlan(false, false);

        const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
        if (!isGh) {
          fetch('/api/completed-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan)
          }).catch(() => {});
        }
        const modal = document.getElementById('planCloudSyncModal');
        if (modal) modal.style.display = 'none';
      } catch (err) {
        if (window.showToast) window.showToast('danger', 'Lỗi đọc file Plan: ' + err.message);
      }
      inputEl.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  window.handleSaveCloudPlanSyncUrl = async function() {
    const inp = document.getElementById('cloudPlanSyncUrlInput');
    if (!inp) return;
    const val = (inp.value || '').trim();
    if (val && !val.startsWith('https://') && !val.startsWith('http://')) {
      if (window.showToast) window.showToast('warning', 'Link Cloud phải bắt đầu bằng https:// hoặc http://');
      return;
    }
    try {
      if (val) localStorage.setItem(CLOUD_URL_STORAGE_KEY, val);
      else localStorage.removeItem(CLOUD_URL_STORAGE_KEY);
    } catch (e) {}
    if (window.AppStore) {
      window.AppStore.cloudPlanSyncUrl = val;
      window.AppStore._cloudCfgFetchedAt = 0;
    }

    const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    if (!isGh) {
      try {
        const res = await fetch('/api/cloud-sync-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloudPlanSyncUrl: val })
        });
        if (res && res.ok) {
          if (window.showToast) window.showToast('success', '✅ Đã lưu cấu hình Cloud Sync lên Server & tự đẩy lên GitHub cho tất cả User!');
          if (window.handleCheckAndSyncCompletedPlan) window.handleCheckAndSyncCompletedPlan(true);
          return;
        }
      } catch (e) {}
    }
    if (window.showToast) window.showToast('success', '✅ Đã lưu Link Cloud Sync trên trình duyệt này!');
    if (window.handleCheckAndSyncCompletedPlan) window.handleCheckAndSyncCompletedPlan(true);
  };

  window.handleCopyLanUrl = function(lanUrl) {
    if (!lanUrl || !navigator.clipboard) return;
    navigator.clipboard.writeText(lanUrl).then(() => {
      if (window.showToast) window.showToast('success', `📋 Đã sao chép link Web LAN: ${lanUrl}`);
    }).catch(() => {});
  };

  window.handleOpenCloudSyncModal = async function(isNotSyncedWarning = false) {
    if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return;
    const currentCloudUrl = await resolveCloudSyncConfigAsync();
    const isGh = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    const lanUrl = (window.AppStore && window.AppStore._detectedLanUrl) || (!isGh ? window.location.origin : 'http://10.84.165.2:8088');

    let modal = document.getElementById('planCloudSyncModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'planCloudSyncModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.78);backdrop-filter:blur(4px);z-index:10050;display:none;align-items:center;justify-content:center;padding:1rem;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#0f172a;border:1px solid rgba(56,189,248,0.35);border-radius:14px;max-width:660px;width:100%;padding:1.25rem;box-shadow:0 20px 50px rgba(0,0,0,0.65);color:#e2e8f0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;">
          <h3 style="margin:0;font-size:1rem;font-weight:900;color:#38bdf8;">☁️ ĐỒNG BỘ KẾ HOẠCH ĐA NGƯỜI DÙNG (WEB LOCAL • LAN • GITHUB PAGES)</h3>
          <button type="button" onclick="document.getElementById('planCloudSyncModal').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
        ${isNotSyncedWarning ? `
          <div style="padding:0.65rem 0.85rem;margin-bottom:0.85rem;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(248,113,113,0.55);color:#fecaca;font-size:0.8rem;line-height:1.45;">
            <strong>⚠️ Lưu ý:</strong> Bạn đang bấm Hoàn Thành trên <strong>GitHub Pages (web tĩnh)</strong> và chưa kết nối <strong>Cloud Sync URL</strong> nên kế hoạch hiện chỉ lưu trên máy bạn. Chọn 1 trong 3 cách dưới đây để gửi/đồng bộ cho cả nhóm:
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.8rem;">
          <div style="padding:0.7rem 0.85rem;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(52,211,153,0.3);">
            <div style="font-weight:800;color:#34d399;margin-bottom:0.25rem;">1️⃣ Cách nhanh nhất trong công ty (Cùng Wi-Fi / Mạng LAN):</div>
            <div style="color:#cbd5e1;margin-bottom:0.4rem;">Các User khác truy cập đúng địa chỉ LAN của máy chủ thay vì GitHub Pages để đồng bộ tức thì 2 chiều:</div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <code style="background:#020617;color:#38bdf8;padding:0.3rem 0.6rem;border-radius:6px;font-weight:800;">${lanUrl}</code>
              <button type="button" class="btn btn-secondary" onclick="handleCopyLanUrl('${lanUrl}')" style="padding:0.25rem 0.6rem;font-size:0.75rem;">📋 Copy Link LAN</button>
            </div>
          </div>

          <div style="padding:0.7rem 0.85rem;border-radius:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);">
            <div style="font-weight:800;color:#38bdf8;margin-bottom:0.25rem;">2️⃣ Đồng bộ qua Internet / GitHub Pages (Google Apps Script gắn Sheet nguồn):</div>
            <div style="color:#cbd5e1;margin-bottom:0.4rem;">Gắn script trong file <code>google_apps_script_plan_sync.gs</code> vào Google Sheet nguồn (Deploy Web App → Anyone) rồi dán URL vào đây 1 lần:</div>
            <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
              <input id="cloudPlanSyncUrlInput" type="text" value="${String(currentCloudUrl || '').replace(/"/g, '&quot;')}" placeholder="https://script.google.com/macros/s/.../exec" style="flex:1;min-width:240px;padding:0.35rem 0.6rem;border-radius:6px;border:1px solid rgba(56,189,248,0.45);background:#020617;color:#f8fafc;font-size:0.78rem;">
              <button type="button" class="btn btn-primary" onclick="handleSaveCloudPlanSyncUrl()" style="padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:800;">💾 Lưu Cloud URL</button>
            </div>
          </div>

          <div style="padding:0.7rem 0.85rem;border-radius:8px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <div style="font-weight:800;color:#fbbf24;">3️⃣ Gửi / Nạp nhanh qua File Kế Hoạch (.json):</div>
              <div style="color:#cbd5e1;font-size:0.75rem;">Xuất file từ máy người lập và nạp trực tiếp trên máy chủ để cả hệ thống đồng bộ theo.</div>
            </div>
            <div style="display:flex;gap:0.45rem;align-items:center;">
              <button type="button" class="btn btn-secondary" onclick="handleExportPlanJsonFile()" style="padding:0.3rem 0.65rem;font-size:0.75rem;font-weight:700;color:#fbbf24;border-color:rgba(251,191,36,0.45);">📤 Xuất File Plan</button>
              <label style="padding:0.3rem 0.65rem;font-size:0.75rem;font-weight:700;color:#34d399;border:1px solid rgba(52,211,153,0.45);border-radius:6px;background:rgba(52,211,153,0.12);cursor:pointer;">
                📥 Nạp File Plan
                <input type="file" accept=".json,application/json" onchange="handleImportPlanJsonFile(this)" style="display:none;">
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

  window.handleOpenSimPlanHistoryModal = function() {
    const modal = document.getElementById('simPlanHistoryModal');
    if (!modal) return;
    window.AppStore.simHistorySearchQuery = '';
    const searchInput = document.getElementById('simHistorySearchInput');
    if (searchInput) searchInput.value = '';
    window.renderSimPlanHistoryContent();
    modal.style.display = 'flex';

    // Đồng bộ thêm các bản ghi lịch sử từ server hoặc file tĩnh
    fetchCompletedPlanBundle()
      .then(data => {
        if (data && data.success && (Array.isArray(data.history) || data.latestPlan)) {
          mergeServerHistoryIntoLocal(data.history, data.latestPlan);
          window.renderSimPlanHistoryContent();
        }
      })
      .catch(e => console.warn('Could not sync history from server:', e));
  };

  window.handleCloseSimPlanHistoryModal = function() {
    const modal = document.getElementById('simPlanHistoryModal');
    if (modal) modal.style.display = 'none';
  };

  window.handleSearchSimPlanHistory = function(query) {
    window.AppStore.simHistorySearchQuery = (query || '').toLowerCase().trim();
    window.renderSimPlanHistoryContent();
  };

  window.handleClearAllSimPlanHistory = function() {
    if (!window.confirm('⚠️ Bạn có chắc chắn muốn XÓA TOÀN BỘ LỊCH SỬ KẾ HOẠCH? Hành động này không thể hoàn tác!')) return;
    try {
      localStorage.removeItem('AJAX_SIM_PLAN_HISTORY');
    } catch (e) {}
    window.renderSimPlanHistoryContent();
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('info', 'Đã xóa toàn bộ lịch sử kế hoạch.');
    }
  };

  window.handleRestoreSimPlanHistory = function(historyId) {
    let history = [];
    try {
      const stored = localStorage.getItem('AJAX_SIM_PLAN_HISTORY');
      if (stored) history = JSON.parse(stored);
    } catch (e) {}

    const item = history.find(h => h.id === historyId);
    if (!item || !item.snapshot) {
      window.alert('Không tìm thấy dữ liệu bản ghi lịch sử này!');
      return;
    }

    const confirmMsg = `Bạn có chắc muốn KHÔI PHỤC kế hoạch của [${item.planner}] ngày [${item.dateStr} ${item.timeStr}]?\nToàn bộ phân bổ chuyền, sản lượng, ghi chú và thông số hiện tại sẽ được cập nhật theo bản ghi này.`;
    if (!window.confirm(confirmMsg)) return;

    const s = item.snapshot;
    if (s.plannerName) {
      window.AppStore.simPlannerName = s.plannerName;
      try { localStorage.setItem('AJAX_SIM_PLANNER_NAME', s.plannerName); } catch (e) {}
    }
    if (s.stageFilter) window.AppStore.simStageFilter = s.stageFilter;
    if (s.simFromDate) {
      window.AppStore.simFromDate = s.simFromDate;
      window.AppStore.fromDate = s.simFromDate;
    }
    if (s.simToDate) {
      window.AppStore.simToDate = s.simToDate;
      window.AppStore.toDate = s.simToDate;
    }
    if (s.simTargetDate) window.AppStore.simTargetDate = s.simTargetDate;
    if (s.simScope) window.AppStore.simScope = s.simScope;
    if (s.simPlanStatusFilter) window.AppStore.simPlanStatusFilter = s.simPlanStatusFilter;
    if (s.simGroupFilter) window.AppStore.simGroupFilter = s.simGroupFilter;
    if (s.simSearchVal !== undefined) window.AppStore.simSearchVal = s.simSearchVal;
    if (s.simWorkingLinesDay) window.AppStore.simWorkingLinesDay = [...s.simWorkingLinesDay];
    if (s.simWorkingLinesNight) window.AppStore.simWorkingLinesNight = [...s.simWorkingLinesNight];
    window.AppStore._simLinesManualConfigured = true;
    window.AppStore.simManualLinesDay = { ...(s.simManualLinesDay || {}) };
    window.AppStore.simManualLinesNight = { ...(s.simManualLinesNight || {}) };
    window.AppStore.simLineOverridesDay = { ...(s.simLineOverridesDay || {}) };
    window.AppStore.simLineOverridesNight = { ...(s.simLineOverridesNight || {}) };
    window.AppStore.simLineOverrides = { ...(s.simLineOverrides || {}) };
    window.AppStore.simManualSeqsDay = { ...(s.simManualSeqsDay || {}) };
    window.AppStore.simManualSeqsNight = { ...(s.simManualSeqsNight || {}) };
    window.AppStore.simManualPfDay = { ...(s.simManualPfDay || {}) };
    window.AppStore.simManualPfNight = { ...(s.simManualPfNight || {}) };
    window.AppStore.simManualPlanDay = { ...(s.simManualPlanDay || {}) };
    window.AppStore.simManualPlanNight = { ...(s.simManualPlanNight || {}) };
    if (s.simManualShifts) window.AppStore.simManualShifts = { ...(s.simManualShifts || {}) };
    if (s.simManualNotes) window.AppStore.simManualNotes = { ...(s.simManualNotes || {}) };
    if (s.hardtestState) {
      applyHardtestDraftFields(s.hardtestState, true);
    }
    if (s.selectedCapacityStage === 'TOTAL_HARDTEST' || item.stage === 'TOTAL_HARDTEST') {
      window.AppStore.selectedCapacityStage = 'TOTAL_HARDTEST';
    } else if (s.selectedCapacityStage === 'ASSEMBLY' || item.stage === 'ASSEMBLY') {
      window.AppStore.selectedCapacityStage = 'ASSEMBLY';
    }

    window.AppStore._appliedPlanIdInitialized = true;
    window.AppStore._currentAppliedPlanId = item.id;
    window.AppStore._currentAppliedPlanMetaId = item.id;
    window.AppStore._currentAppliedPlanCreatedAt = item.createdAt || new Date().toISOString();
    window.AppStore._lastSyncedPlanMeta = {
      id: item.id,
      planner: item.planner,
      dateStr: item.dateStr,
      timeStr: item.timeStr,
      modelsCount: item.modelsCount,
      grandPlan: item.grandPlan,
      grandPlanDay: item.grandPlanDay,
      grandPlanNight: item.grandPlanNight
    };
    try { localStorage.setItem('AJAX_CURRENT_APPLIED_PLAN_ID', item.id); } catch (e) {}

    // Update draft to restored version
    window.handleSaveSimPlanDraft(true);
    window.handleCloseSimPlanHistoryModal();
    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('success', `↺ Đã khôi phục thành công kế hoạch ngày ${item.dateStr} của ${item.planner}!`);
    }
  };

  window.handleDeleteSimPlanHistory = function(historyId) {
    if (!window.confirm('Xóa bản ghi kế hoạch này khỏi Lịch Sử?')) return;
    let history = [];
    try {
      const stored = localStorage.getItem('AJAX_SIM_PLAN_HISTORY');
      if (stored) history = JSON.parse(stored);
    } catch (e) {}

    history = history.filter(h => h.id !== historyId);
    try {
      localStorage.setItem('AJAX_SIM_PLAN_HISTORY', JSON.stringify(history));
    } catch (e) {}

    window.renderSimPlanHistoryContent();
    // Update badge in main simulator
    const badge = document.getElementById('simHistoryBadge');
    if (badge) badge.innerText = history.length;
    if (window.showToast) {
      window.showToast('info', 'Đã xóa bản ghi lịch sử.');
    }
  };

  window.renderSimPlanHistoryContent = function() {
    const container = document.getElementById('simHistoryModalBody');
    const badge = document.getElementById('simHistoryModalBadge');
    const summaryInfo = document.getElementById('simHistoryModalSummaryInfo');
    if (!container) return;

    let history = [];
    try {
      const stored = localStorage.getItem('AJAX_SIM_PLAN_HISTORY');
      if (stored) history = JSON.parse(stored);
      if (!Array.isArray(history)) history = [];
    } catch (e) {
      history = [];
    }

    const q = (window.AppStore.simHistorySearchQuery || '').toLowerCase();
    const filtered = q
      ? history.filter(h =>
          (h.planner || '').toLowerCase().includes(q) ||
          (h.dateStr || '').toLowerCase().includes(q) ||
          (h.timeStr || '').toLowerCase().includes(q) ||
          (h.stage || '').toLowerCase().includes(q)
        )
      : history;

    if (badge) badge.innerText = `${filtered.length} Bản ghi`;
    if (summaryInfo) {
      summaryInfo.innerText = `Tổng cộng ${history.length} bản kế hoạch đã được lưu lại trong lịch sử.`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.7;">📜</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #e2e8f0; margin-bottom: 0.25rem;">
            ${q ? 'Không tìm thấy bản ghi phù hợp với từ khóa' : 'Chưa có kế hoạch nào được hoàn thành trong Lịch Sử'}
          </div>
          <div style="font-size: 0.8rem; color: #64748b; max-width: 480px; margin: 0 auto;">
            Khi bạn ấn nút <strong style="color: #10b981;">✅ Hoàn Thành</strong> cạnh Người lập Plan, hệ thống sẽ tự động lưu một bản ghi lịch sử đầy đủ để bạn tra cứu và khôi phục lại bất cứ lúc nào.
          </div>
        </div>
      `;
      return;
    }

    const rowsHtml = filtered.map((h, idx) => {
      const dayLinesStr = (h.workingLinesDay && h.workingLinesDay.length > 0) ? h.workingLinesDay.join(', ') : 'Chưa chọn';
      const nightLinesStr = (h.workingLinesNight && h.workingLinesNight.length > 0) ? h.workingLinesNight.join(', ') : 'Chưa chọn';

      return `
        <tr>
          <td style="text-align: center; font-weight: 800; color: #94a3b8; font-family: monospace;">${idx + 1}</td>
          <td>
            <div style="font-weight: 700; color: #f8fafc; font-size: 0.825rem;">📅 ${h.dateStr}</div>
            <div style="font-size: 0.725rem; color: #94a3b8; font-family: monospace;">🕒 ${h.timeStr}</div>
          </td>
          <td>
            <div style="font-weight: 800; color: #38bdf8; display: inline-flex; align-items: center; gap: 0.25rem;">
              <span>👤</span> <span>${h.planner || 'Chưa đặt tên'}</span>
            </div>
          </td>
          <td style="text-align: center;">
            <span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-size: 0.725rem; font-weight: 700;">
              ${h.stage || 'ASSEMBLY'}
            </span>
          </td>
          <td style="text-align: center; font-weight: 800; color: #fbbf24; font-family: monospace;">
            ${h.modelsCount} Model
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">
            <div style="color: #60a5fa;">KH: ${(h.grandPlan || 0).toLocaleString('vi-VN')}</div>
            <div style="color: #34d399; font-size: 0.725rem;">TT: ${(h.grandFact || 0).toLocaleString('vi-VN')}</div>
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 0.75rem;">
            <div style="color: #f59e0b;">☀️ Ngày: <strong>${(h.grandPlanDay || 0).toLocaleString('vi-VN')}</strong></div>
            <div style="color: #c084fc;">🌙 Đêm: <strong>${(h.grandPlanNight || 0).toLocaleString('vi-VN')}</strong></div>
          </td>
          <td style="font-size: 0.725rem; color: #cbd5e1;">
            <div>☀️ Day: <span style="color: #f59e0b; font-weight: 700;">${dayLinesStr}</span></div>
            <div>🌙 Night: <span style="color: #c084fc; font-weight: 700;">${nightLinesStr}</span></div>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <button type="button" class="btn btn-primary" onclick="handleRestoreSimPlanHistory('${h.id}')" style="padding: 0.2rem 0.55rem; font-size: 0.725rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; margin-right: 0.35rem;" title="Khôi phục lại toàn bộ dữ liệu của kế hoạch này vào bảng">
              <span>↺ Nạp lại Plan</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="handleDeleteSimPlanHistory('${h.id}')" style="padding: 0.2rem 0.45rem; font-size: 0.725rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.35);" title="Xóa bản ghi này">
              <span>🗑️</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="sim-history-table">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">STT</th>
            <th style="min-width: 125px;">NGÀY / GIỜ LẬP</th>
            <th style="min-width: 140px;">NGƯỜI LẬP PLAN</th>
            <th style="width: 95px; text-align: center;">CÔNG ĐOẠN</th>
            <th style="width: 85px; text-align: center;">SỐ MODEL</th>
            <th style="text-align: right; min-width: 105px;">TỔNG KH / TT</th>
            <th style="text-align: right; min-width: 120px;">XẾP CA NGÀY / ĐÊM</th>
            <th style="min-width: 150px;">CHUYỀN HOẠT ĐỘNG</th>
            <th style="width: 140px; text-align: center;">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  };

  // Start plan sync watcher
  if (window.initPlanSyncWatcher) {
    window.initPlanSyncWatcher();
  }

})();

