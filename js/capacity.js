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
            ${currentStage === 'TOTAL_HARDTEST' ? `
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.35;">
                Quản trị năng lực cụm Total Hardtest: Cycle time tiêu chuẩn (Norm), số lượng thiết bị Test Block, tỉ lệ pass FTT, downtime máy/vật tư, UPH và công suất Ca Ngày (10.83h) / Ca Đêm (10.58h).
              </p>
            ` : ''}
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

  /**
   * RENDER INTERACTIVE CAPACITY SIMULATOR (GIẢ LẬP TẢI CHUYỀN THEO BẢNG 2)
   */
  function renderCapacitySimulator(allGroups, items, shiftHours, allLines) {
    if (!window.AppStore) return '';

    // Auto-restore draft from localStorage if not yet restored in this session
    if (!window.AppStore._simDraftRestored) {
      try {
        const savedDraftStr = localStorage.getItem('AJAX_SIM_PLAN_DRAFT');
        if (savedDraftStr) {
          const draft = JSON.parse(savedDraftStr);
          if (draft && typeof draft === 'object') {
            if (draft.plannerName && !window.AppStore.simPlannerName) {
              window.AppStore.simPlannerName = draft.plannerName;
            }
            if (draft.stageFilter && !window.AppStore.simStageFilter) {
              window.AppStore.simStageFilter = draft.stageFilter;
            }
            if (Array.isArray(draft.simWorkingLinesDay) && draft.simWorkingLinesDay.length > 0 && (!window.AppStore.simWorkingLinesDay || window.AppStore.simWorkingLinesDay.length === 0)) {
              window.AppStore.simWorkingLinesDay = [...draft.simWorkingLinesDay];
              window.AppStore._simLinesManualConfigured = true;
            }
            if (Array.isArray(draft.simWorkingLinesNight) && draft.simWorkingLinesNight.length > 0 && (!window.AppStore.simWorkingLinesNight || window.AppStore.simWorkingLinesNight.length === 0)) {
              window.AppStore.simWorkingLinesNight = [...draft.simWorkingLinesNight];
              window.AppStore._simLinesManualConfigured = true;
            }
            if (draft.simManualLinesDay && (!window.AppStore.simManualLinesDay || Object.keys(window.AppStore.simManualLinesDay).length === 0)) {
              window.AppStore.simManualLinesDay = { ...draft.simManualLinesDay };
            }
            if (draft.simManualLinesNight && (!window.AppStore.simManualLinesNight || Object.keys(window.AppStore.simManualLinesNight).length === 0)) {
              window.AppStore.simManualLinesNight = { ...draft.simManualLinesNight };
            }
            if (draft.simLineOverridesDay && (!window.AppStore.simLineOverridesDay || Object.keys(window.AppStore.simLineOverridesDay).length === 0)) {
              window.AppStore.simLineOverridesDay = { ...draft.simLineOverridesDay };
            }
            if (draft.simLineOverridesNight && (!window.AppStore.simLineOverridesNight || Object.keys(window.AppStore.simLineOverridesNight).length === 0)) {
              window.AppStore.simLineOverridesNight = { ...draft.simLineOverridesNight };
            }
            if (draft.simLineOverrides && (!window.AppStore.simLineOverrides || Object.keys(window.AppStore.simLineOverrides).length === 0)) {
              window.AppStore.simLineOverrides = { ...draft.simLineOverrides };
            }
            if (draft.simManualSeqsDay && (!window.AppStore.simManualSeqsDay || Object.keys(window.AppStore.simManualSeqsDay).length === 0)) {
              window.AppStore.simManualSeqsDay = { ...draft.simManualSeqsDay };
            }
            if (draft.simManualSeqsNight && (!window.AppStore.simManualSeqsNight || Object.keys(window.AppStore.simManualSeqsNight).length === 0)) {
              window.AppStore.simManualSeqsNight = { ...draft.simManualSeqsNight };
            }
            if (draft.simManualPfDay && (!window.AppStore.simManualPfDay || Object.keys(window.AppStore.simManualPfDay).length === 0)) {
              window.AppStore.simManualPfDay = { ...draft.simManualPfDay };
            }
            if (draft.simManualPfNight && (!window.AppStore.simManualPfNight || Object.keys(window.AppStore.simManualPfNight).length === 0)) {
              window.AppStore.simManualPfNight = { ...draft.simManualPfNight };
            }
            if (draft.simManualPlanDay && (!window.AppStore.simManualPlanDay || Object.keys(window.AppStore.simManualPlanDay).length === 0)) {
              window.AppStore.simManualPlanDay = { ...draft.simManualPlanDay };
            }
            if (draft.simManualPlanNight && (!window.AppStore.simManualPlanNight || Object.keys(window.AppStore.simManualPlanNight).length === 0)) {
              window.AppStore.simManualPlanNight = { ...draft.simManualPlanNight };
            }
            if (draft.simManualShifts && (!window.AppStore.simManualShifts || Object.keys(window.AppStore.simManualShifts).length === 0)) {
              window.AppStore.simManualShifts = { ...draft.simManualShifts };
            }
            if (draft.simManualNotes && (!window.AppStore.simManualNotes || Object.keys(window.AppStore.simManualNotes).length === 0)) {
              window.AppStore.simManualNotes = { ...draft.simManualNotes };
            }
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
                            (window.AppStore.simLineOverridesDay && window.AppStore.simLineOverridesDay[rowKey]);
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

      return {
        it,
        idx,
        capInfo,
        rowKey,
        shortage,
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

      // Dropdown options for Line SX (chỉ để tên Line)
      const allSelectableLines = [
        ...capInfo.capableLines.map(cl => cl.lineId),
        ...activeAssemblyLines.filter(lid => !capInfo.capableLines.some(cl => cl.lineId === lid))
      ];
      const uniqueLineOptions = Array.from(new Set(allSelectableLines));

      // Line dropdown for Day Shift
      const lineSelectDayHtml = `
        <select class="sim-table-line-select font-mono" onchange="handleTableLineDayChange('${rowKey}', this.value)" style="padding: 0.15rem 0.25rem; font-size: 0.775rem; font-weight: 800; color: ${assignedDayLineId ? '#38bdf8' : '#64748b'}; background: rgba(15, 23, 42, 0.9); border: 1px solid ${assignedDayLineId ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 6px; outline: none; cursor: pointer; text-align: center; min-width: 58px;">
          <option value="" ${!assignedDayLineId ? 'selected' : ''}>--</option>
          ${uniqueLineOptions.map(lid => {
            return `<option value="${lid}" ${assignedDayLineId === lid ? 'selected' : ''}>${lid}</option>`;
          }).join('')}
        </select>
      `;

      // Line dropdown for Night Shift
      const lineSelectNightHtml = `
        <select class="sim-table-line-select font-mono" onchange="handleTableLineNightChange('${rowKey}', this.value)" style="padding: 0.15rem 0.25rem; font-size: 0.775rem; font-weight: 800; color: ${assignedNightLineId ? '#c084fc' : '#64748b'}; background: rgba(15, 23, 42, 0.9); border: 1px solid ${assignedNightLineId ? 'rgba(192, 132, 252, 0.5)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 6px; outline: none; cursor: pointer; text-align: center; min-width: 58px;">
          <option value="" ${!assignedNightLineId ? 'selected' : ''}>--</option>
          ${uniqueLineOptions.map(lid => {
            return `<option value="${lid}" ${assignedNightLineId === lid ? 'selected' : ''}>${lid}</option>`;
          }).join('')}
        </select>
      `;

      const shiftDayText = (shortage > 0 || assignedDayLineId) ? 'Ca Ngày' : '';
      const shiftNightText = 'Ca Đêm';

      return `
        <tr class="hover-row">
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
            <input type="text" class="sim-table-seq-input font-mono" value="${seqDay || ''}" placeholder="--" onchange="handleTableSeqDayChange('${rowKey}', this.value)" style="width: 44px; padding: 0.15rem 0.2rem; font-size: 0.775rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập thứ tự sản xuất trên Line ca Ngày">
          </td>
          <td class="font-mono" style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
              <input type="text" class="sim-table-pf-input font-mono" value="${perfPctDay !== null && perfPctDay !== undefined && (assignedDayLineId || (window.AppStore.simManualPfDay && window.AppStore.simManualPfDay[rowKey])) ? perfPctDay : ''}" placeholder="${assignedDayLineId ? '100' : '--'}" onchange="handleTablePfDayChange('${rowKey}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 44px; padding: 0.15rem 0.15rem; font-size: 0.775rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập PF% Ca Ngày (mặc định 100%)">%
            </div>
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #38bdf8; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${actualHoursDay !== null && actualHoursDay > 0 ? actualHoursDay.toFixed(3) : ''}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${dayAvailHours !== null && dayAvailHours > 0 ? dayAvailHours.toFixed(2) : (assignedDayLineId && shortage > 0 ? '0.00' : '')}
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input font-mono" value="${planDay > 0 ? planDay.toLocaleString('vi-VN') : (shortage > 0 && assignedDayLineId ? '0' : '')}" placeholder="0" onchange="handleTablePlanDayChange('${rowKey}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 68px; padding: 0.15rem 0.3rem; font-size: 0.8rem; font-weight: 800; color: #38bdf8; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; outline: none; text-align: right;" title="Nhập Plan sản xuất Ca Ngày">
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
            <input type="text" class="sim-table-seq-input font-mono" value="${seqNight || ''}" placeholder="--" onchange="handleTableSeqNightChange('${rowKey}', this.value)" style="width: 44px; padding: 0.15rem 0.2rem; font-size: 0.775rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập thứ tự sản xuất trên Line ca Đêm">
          </td>
          <td class="font-mono" style="text-align: center; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
              <input type="text" class="sim-table-pf-input font-mono" value="${perfPctNight !== null && perfPctNight !== undefined && (assignedNightLineId || (window.AppStore.simManualPfNight && window.AppStore.simManualPfNight[rowKey])) ? perfPctNight : ''}" placeholder="${assignedNightLineId ? '100' : '--'}" onchange="handleTablePfNightChange('${rowKey}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 44px; padding: 0.15rem 0.15rem; font-size: 0.775rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: center;" title="Nhập PF% Ca Đêm (mặc định 100%)">%
            </div>
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #c084fc; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${actualHoursNight !== null && actualHoursNight > 0 ? actualHoursNight.toFixed(3) : ''}
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 700; color: #fbbf24; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${nightAvailHours !== null && nightAvailHours > 0 ? nightAvailHours.toFixed(2) : (assignedNightLineId && nightShortage > 0 ? '0.00' : '')}
          </td>
          <td class="font-mono" style="text-align: right; white-space: nowrap; padding: 0.25rem 0.25rem;">
            <input type="text" class="sim-table-plan-input font-mono" value="${planNight > 0 ? planNight.toLocaleString('vi-VN') : (nightShortage > 0 && assignedNightLineId ? '0' : '')}" placeholder="0" onchange="handleTablePlanNightChange('${rowKey}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" style="width: 68px; padding: 0.15rem 0.3rem; font-size: 0.8rem; font-weight: 800; color: #c084fc; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 6px; outline: none; text-align: right;" title="Nhập Plan sản xuất Ca Đêm">
          </td>
          <td class="font-mono" style="text-align: right; font-weight: 800; color: #f87171; font-size: 0.825rem; padding: 0.35rem 0.45rem;">
            ${finalShortage > 0 ? '-' + finalShortage.toLocaleString('vi-VN') : ''}
          </td>
          <td style="text-align: left; padding: 0.2rem 0.35rem; min-width: 140px;">
            <input type="text" class="sim-table-note-input" value="${(window.AppStore.simManualNotes && window.AppStore.simManualNotes[rowKey]) ? String(window.AppStore.simManualNotes[rowKey]).replace(/"/g, '&quot;') : ''}" placeholder="Nhập ghi chú..." onchange="handleTableNoteChange('${rowKey}', this.value)" onkeydown="if(event.key==='Enter') this.blur();" title="Ghi chú cho Model ${(it.productName1C || it.model || '').replace(/"/g, '&quot;')}">
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
              <button type="button" class="btn btn-secondary sim-btn-planner" onclick="handleEditPlannerName()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(15, 23, 42, 0.8); cursor: pointer;" title="Bấm để cập nhật tên Người lập Plan">
                <span>👤 Người lập Plan: <strong style="color: #fbbf24;">${plannerName}</strong></span>
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
              <button type="button" class="btn btn-secondary sim-btn-cloud-sync" onclick="handleForceSyncLatestPlan()" style="padding: 0.2rem 0.65rem; font-size: 0.725rem; font-weight: 700; color: #34d399; border-color: rgba(52, 211, 153, 0.45); display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 6px; background: rgba(52, 211, 153, 0.1); cursor: pointer;" title="Nạp ngay lập tức bản kế hoạch sản xuất mới nhất từ máy chủ">
                <span>🔄 Đồng Bộ Plan</span>
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <button type="button" class="sim-btn-export-sheet" onclick="handleExportCapacityScheduleGoogleSheet()" title="Xuất file CSV chuẩn UTF-8 tương thích Google Sheets &amp; Excel theo định dạng 26 cột kèm Ghi Chú">
                <span>📥 Xuất Google Sheets (CSV)</span>
              </button>
              <button type="button" class="sim-btn-copy-sheet" onclick="handleCopyCapacityScheduleClipboard()" title="Sao chép toàn bộ bảng điều độ 26 cột kèm Ghi Chú để dán ngay (Ctrl+V) vào Google Sheets">
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
                </tr>

                <!-- HÀNG 1: TIÊU ĐỀ 26 CỘT (STICKY TOP: 36px) VỚI TEXT WRAPPING GỌN GÀNG -->
                <tr class="sim-header-titles">
                  <th class="sticky-sim-stt" style="text-align: center; width: 45px;">STT</th>
                  <th class="sticky-sim-stage" style="text-align: center; width: 95px;">Công Đoạn</th>
                  <th class="sticky-sim-group" style="text-align: left; width: 140px;">Group Model</th>
                  <th class="sticky-sim-model" style="text-align: left; min-width: 300px;">Mã Model (1C)</th>
                  <th style="text-align: right; min-width: 65px; color: #60a5fa; padding: 0.35rem 0.35rem;">Kế Hoạch</th>
                  <th style="text-align: right; min-width: 65px; color: #34d399; padding: 0.35rem 0.35rem;">Thực Tế</th>
                  <th style="text-align: right; min-width: 65px; padding: 0.35rem 0.35rem;">Chênh Lệch</th>
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
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml.length > 0 ? tableRowsHtml : `
                  <tr>
                    <td colspan="26" style="text-align: center; padding: 3rem; color: var(--text-muted);">
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

    let match = null;

    // 1. Khớp theo mã bo mạch (Board / P1C code)
    if (p1c) {
      for (const c of htItems) {
        const bCode = (c.board || '').toLowerCase().trim();
        const bClean = bCode.replace(/\[.*?\]/g, '').replace(/[()]/g, '').trim();
        if (bClean && bClean.length > 5 && p1c.includes(bClean)) {
          match = c;
          break;
        }
        if (bCode && p1c.includes(bCode)) {
          match = c;
          break;
        }
      }
    }

    // 2. Khớp theo Model Group và đúng Công Đoạn con (HARD TEST, OPTICS ASM, FOCUS)
    if (!match && model) {
      const cleanModel = model.replace(/\(.*?\)/g, '').replace(/white|black/gi, '').trim();
      for (const c of htItems) {
        const cGrp = (c.group || '').toLowerCase().trim();
        const cStage = (c.stage || '').toUpperCase().trim();
        if (cStage === stage && (cGrp === cleanModel || cGrp.includes(cleanModel) || cleanModel.includes(cGrp))) {
          match = c;
          break;
        }
      }
    }

    // 3. Khớp theo Model Group (nới lỏng công đoạn)
    if (!match && model) {
      const cleanModel = model.replace(/\(.*?\)/g, '').replace(/white|black/gi, '').trim();
      for (const c of htItems) {
        const cGrp = (c.group || '').toLowerCase().trim();
        if (cGrp === cleanModel || cGrp.includes(cleanModel) || cleanModel.includes(cGrp)) {
          match = c;
          break;
        }
      }
    }

    const ctNorm = (match && match.ctNorm > 0) ? match.ctNorm : 60;
    const ctActual = (match && match.ctActual > 0) ? match.ctActual : ctNorm;
    const tbQty = (match && match.tbQty > 0) ? match.tbQty : 2;
    const board = (match && match.board) ? match.board : (it.productName1C || it.model);
    const normGroup = (match && match.group) ? match.group : it.model;
    const fttPct = (match && match.fttPct != null) ? match.fttPct : 95.0;
    const dtTotalPct = (match && match.dtTotalPct != null) ? match.dtTotalPct : 5.0;

    return {
      ctNorm,
      ctActual,
      availTb: tbQty,
      board,
      normGroup,
      fttPct,
      dtTotalPct,
      match
    };
  }

  /**
   * RENDER HARDTEST CAPACITY SIMULATOR (GIẢ LẬP TẢI TEST BLOCK & NHÂN LỰC TOÀN CỤM TOTAL HARDTEST)
   * Đồng bộ 100% kiến trúc với công đoạn Assembly: Lấy dữ liệu thực tế từng mã 1C từ Bảng 2
   */
  function renderHardtestCapacitySimulator(htData, items, shiftHours) {
    if (!window.AppStore) return '';

    const _defHtWeek = (window.AppStore && window.AppStore.getFactoryWeekRange) ? window.AppStore.getFactoryWeekRange() : null;
    const simFromDate = window.AppStore.hardtestSimFromDate || window.AppStore.simFromDate || window.AppStore.fromDate || (_defHtWeek ? _defHtWeek.fromDate : '2026-11-05');
    const simToDate = window.AppStore.hardtestSimToDate || window.AppStore.simToDate || window.AppStore.toDate || (_defHtWeek ? _defHtWeek.toDate : '2026-11-05');
    const simShiftType = window.AppStore.hardtestSimShiftType || 'FULL_DAY'; // 'DAY' | 'NIGHT' | 'FULL_DAY' | 'RANGE'
    const statusFilter = window.AppStore.hardtestSimStatusFilter || 'GAP_NEGATIVE'; // 'GAP_NEGATIVE' | 'GAP_POSITIVE' | 'HAS_PLAN' | 'ALL' | 'SHORTAGE'
    const groupFilter = window.AppStore.hardtestSimGroupFilter || 'ALL';
    const stageSubFilter = window.AppStore.hardtestSimStageFilter || 'ALL';
    const searchVal = (window.AppStore.hardtestSimSearchVal || '').trim().toLowerCase();

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

    // 3. Determine shift duration & seconds
    let shiftDurationHours = 21.41;
    let shiftDurationSeconds = 77076;
    let shiftTitle = 'Cả Ngày (21.41 Giờ: Ngày 10.83h + Đêm 10.58h)';
    if (simShiftType === 'DAY') {
      shiftDurationHours = 10.83;
      shiftDurationSeconds = 38988;
      shiftTitle = 'Ca Ngày (10.83 Giờ = 38,988s)';
    } else if (simShiftType === 'NIGHT') {
      shiftDurationHours = 10.58;
      shiftDurationSeconds = 38088;
      shiftTitle = 'Ca Đêm (10.58 Giờ = 38,088s)';
    } else if (simShiftType === 'RANGE') {
      let daysCount = 5;
      if (window.AppStore.getDatesInRange) {
        const dArr = window.AppStore.getDatesInRange(simFromDate, simToDate);
        if (dArr && dArr.length > 0) daysCount = dArr.length;
      }
      shiftDurationHours = 21.41 * daysCount;
      shiftDurationSeconds = 77076 * daysCount;
      shiftTitle = `Cả Giai Đoạn (${daysCount} ngày × 21.41h = ${shiftDurationHours.toFixed(1)}h)`;
    }

    if (!window.AppStore.hardtestPlanOverrides) window.AppStore.hardtestPlanOverrides = {};
    if (!window.AppStore.hardtestManualTb) window.AppStore.hardtestManualTb = {};
    if (!window.AppStore.hardtestManualMan) window.AppStore.hardtestManualMan = {};

    let grandAvailTb = 0;

    // 4. Map each 1C schedule item from Bảng 2 to its capacity norm (No cross-board duplication)
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
      const availTb = cap.availTb;
      grandAvailTb += availTb;

      const defaultPlan = it.cumPlanQty || 0;
      const defaultFact = it.cumFactQty || 0;
      const defaultGap = it.cumGapQty || 0;

      const hasPlanOverride = window.AppStore.hardtestPlanOverrides[rowId] !== undefined;
      const planQty = hasPlanOverride ? window.AppStore.hardtestPlanOverrides[rowId] : defaultPlan;
      const factQty = defaultFact;
      const gapQty = hasPlanOverride ? (factQty - planQty) : defaultGap;

      // Khối lượng cần giải quyết: nếu thiếu hụt thì tính theo lượng thiếu, ngược lại tính theo plan
      const targetQty = (gapQty < 0) ? Math.abs(gapQty) : planQty;

      // Năng lực 1 TB trong ca đã chọn
      const capaPer1TB = (ctActual > 0 && shiftDurationSeconds > 0) ? (shiftDurationSeconds / ctActual) : 0;

      // Đề xuất số Test Block (N_req tính theo targetQty)
      const reqTb = (targetQty > 0 && capaPer1TB > 0) ? Math.ceil(targetQty / capaPer1TB) : 0;

      // Đề xuất Nhân Lực (TIÊU CHUẨN 1 NGƯỜI DÙNG 2 TEST BLOCK)
      const reqMan = reqTb > 0 ? Math.ceil(reqTb / 2.0) : 0;

      // Bố trí thủ công (Manual Input Overrides)
      const hasTbOverride = window.AppStore.hardtestManualTb[rowId] !== undefined;
      const manualTb = hasTbOverride ? window.AppStore.hardtestManualTb[rowId] : (reqTb > 0 ? reqTb : availTb);

      const hasManOverride = window.AppStore.hardtestManualMan[rowId] !== undefined;
      const manualMan = hasManOverride ? window.AppStore.hardtestManualMan[rowId] : (manualTb > 0 ? Math.ceil(manualTb / 2.0) : 0);

      // Số liệu dựa trên bố trí thực tế
      const effectiveTb = manualTb;
      const effectiveMan = manualMan;

      const effectiveUph = (ctActual > 0 && effectiveTb > 0) ? Math.round(((3600.0 * effectiveTb) / ctActual) * 10) / 10 : 0;
      const hoursNeeded = effectiveUph > 0 ? (targetQty / effectiveUph) : 0;
      const shiftOutput = Math.min(targetQty, Math.round(effectiveUph * shiftDurationHours));
      const remainingShortage = Math.max(0, targetQty - shiftOutput);

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
        ctNorm,
        ctActual,
        planQty,
        factQty,
        gapQty,
        targetQty,
        hasPlanOverride,
        capaPer1TB,
        reqTb,
        reqMan,
        manualTb,
        hasTbOverride,
        manualMan,
        hasManOverride,
        effectiveTb,
        effectiveMan,
        effectiveUph,
        hoursNeeded,
        shiftOutput,
        remainingShortage
      };
    });

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

    // 6. Sorting: Sắp xếp các Model có Gap < 0 (thiếu hụt) lên đầu, âm nhiều nhất lên trước nhất (giống Assembly)
    filteredRows.sort((a, b) => {
      const aNeg = a.gapQty < 0;
      const bNeg = b.gapQty < 0;

      // 1. Mã âm lên đầu
      if (aNeg && !bNeg) return -1;
      if (!aNeg && bNeg) return 1;

      // 2. Cùng là mã âm: Sắp xếp theo âm nhiều nhất lên đầu (tăng dần: ví dụ -2080 < -92 < -60)
      if (aNeg && bNeg) {
        if (a.gapQty !== b.gapQty) return a.gapQty - b.gapQty;
        return b.planQty - a.planQty;
      }

      // 3. Cùng là không âm (Gap >= 0): Ưu tiên Kế hoạch lớn nhất (descending)
      if (b.planQty !== a.planQty) {
        return b.planQty - a.planQty;
      }
      return (a.group || '').localeCompare(b.group || '');
    });

    // 7. Re-index STT & accumulate grand totals for filtered rows
    let grandPlan = 0;
    let grandFact = 0;
    let grandGap = 0;
    let shortageCount = 0;
    let grandReqTb = 0;
    let grandReqMan = 0;
    let grandManualTb = 0;
    let grandManualMan = 0;
    let grandHours = 0;
    let grandOutput = 0;
    let grandShortage = 0;

    filteredRows.forEach((r, idx) => {
      r.displayIdx = idx + 1;
      grandPlan += r.planQty;
      grandFact += r.factQty;
      grandGap += r.gapQty;
      grandReqTb += r.reqTb;
      grandReqMan += r.reqMan;
      grandManualTb += r.effectiveTb;
      grandManualMan += r.effectiveMan;
      grandHours += r.hoursNeeded;
      grandOutput += r.shiftOutput;
      grandShortage += r.remainingShortage;
      if (r.gapQty < 0) shortageCount++;
    });

    window.AppStore.lastProcessedHardtestSimRows = filteredRows;

    // 8. Build Table Rows HTML
    const rowsHtml = filteredRows.map(r => {
      const isTbOverloaded = r.reqTb > r.availTb;
      const isManualChanged = r.hasTbOverride || r.hasManOverride || r.hasPlanOverride;
      const encodedRowId = encodeURIComponent(r.rowId);

      return `
        <tr class="hover-row">
          <td class="sticky-cap-stt" style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${r.displayIdx}</td>
          <td style="text-align: center; white-space: nowrap;">
            <span class="badge ${r.stage === 'HARD TEST' ? 'badge-stage-hardtest' : r.stage === 'OPTICS ASM' ? 'badge-stage-optics' : 'badge-stage-focus'}">${r.stage}</span>
          </td>
          <td class="sticky-ht-group">
            <span style="font-weight: 800; color: #f8fafc; font-size: 0.825rem;">${r.normGroup || r.group}</span>
          </td>
          <td class="sticky-ht-board">
            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
              <span class="font-mono" style="font-size: 0.775rem; font-weight: 700; color: #f1f5f9; word-break: break-all;" title="${r.model1c}">${r.model1c}</span>
              ${r.board && r.board !== r.model1c ? `<span class="font-mono" style="font-size: 0.68rem; color: #94a3b8;" title="Định mức Test Block theo bo mạch: ${r.board}">⚙️ ${r.board}</span>` : ''}
            </div>
          </td>
          <!-- Kế Hoạch (Plan Qty): Input cho phép sửa -->
          <td style="text-align: right; min-width: 105px;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem;">
              <input type="number" min="0" step="50" class="sim-manual-input sim-manual-input-plan font-mono" value="${r.planQty}" onchange="handleHardtestPlanQtyChange('${encodedRowId}', this.value)" title="Kế hoạch sản lượng (Pcs) trong giai đoạn đã chọn. Bấm để sửa nhanh.">
            </div>
            ${r.hasPlanOverride ? '<span style="color:#fbbf24; font-size:0.65rem; display:block; text-align:right;">✍️ Sửa</span>' : ''}
          </td>
          <!-- Thực Tế (Fact Qty) -->
          <td class="font-mono" style="text-align: right; font-size: 0.825rem; font-weight: 700; color: #34d399; min-width: 95px;" title="Sản lượng thực tế đã sản xuất trong giai đoạn">
            ${r.factQty.toLocaleString('vi-VN')}
          </td>
          <!-- Chênh Lệch (Gap Qty) -->
          <td class="font-mono" style="text-align: right; font-size: 0.825rem; font-weight: 800; min-width: 105px; color: ${r.gapQty < 0 ? '#f87171' : r.gapQty > 0 ? '#34d399' : 'var(--text-muted)'};" title="Chênh lệch Thực tế - Kế hoạch (Âm là thiếu hụt)">
            ${r.gapQty !== 0 ? (r.gapQty > 0 ? '+' : '') + r.gapQty.toLocaleString('vi-VN') : '0'}
          </td>
          <!-- CT Thực Tế -->
          <td style="text-align: right;" class="font-mono" title="CT Thực Tế: ${r.ctActual}s (Norm: ${r.ctNorm}s • FTT: ${r.it.fttPct || 95}% • DT: ${r.it.dtTotalPct || 5}%)">
            <span style="font-weight: 800; color: #38bdf8; font-size: 0.8rem;">${r.ctActual}s</span>
          </td>
          <!-- TB Sẵn Có -->
          <td style="text-align: center;">
            <span class="badge badge-ht-tb font-mono" title="Số lượng Test Block hiện có sẵn trong xưởng">${r.availTb} TB</span>
          </td>
          <!-- Đề Xuất: Số Block Cần -->
          <td style="text-align: center; min-width: 125px;">
            ${r.planQty > 0 || r.gapQty < 0 ? `
              <span class="badge ${!isTbOverloaded ? 'badge-green' : 'badge-red'} font-mono" style="font-weight: 800;" title="Năng lực 1 TB trong ca: ${Math.round(r.capaPer1TB).toLocaleString('vi-VN')} pcs ➔ Cần Math.ceil(${r.targetQty} ÷ ${Math.round(r.capaPer1TB)}) = ${r.reqTb} TB">
                ${r.reqTb} TB ${!isTbOverloaded ? '✅ (Đủ)' : `⚠️ (Thiếu +${r.reqTb - r.availTb})`}
              </span>
            ` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0 TB</span>`}
          </td>
          <!-- Đề Xuất: Nhân Lực Cần (Tiêu chuẩn 1 người dùng 2 test block) -->
          <td style="text-align: center; min-width: 120px;">
            ${r.reqTb > 0 ? `
              <span class="badge badge-purple font-mono" style="font-weight: 800;" title="Tiêu chuẩn: 1 người dùng 2 test block ➔ Math.ceil(${r.reqTb} ÷ 2) = ${r.reqMan} người">
                👥 ${r.reqMan} Người
              </span>
            ` : `<span style="color: var(--text-muted); font-size: 0.75rem;">0 Người</span>`}
          </td>
          <!-- Sắp Xếp Thủ Công: Số Block (Input) -->
          <td style="text-align: center; min-width: 95px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
              <input type="number" min="0" max="50" class="sim-manual-input font-mono" value="${r.manualTb}" onchange="handleHardtestManualTbChange('${encodedRowId}', this.value)" title="Tự nhập số Test Block muốn bố trí cho mã này">
            </div>
          </td>
          <!-- Sắp Xếp Thủ Công: Số Người (Input) -->
          <td style="text-align: center; min-width: 95px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
              <input type="number" min="0" max="50" class="sim-manual-input sim-manual-input-man font-mono" value="${r.manualMan}" onchange="handleHardtestManualManChange('${encodedRowId}', this.value)" title="Tự nhập số người muốn bố trí (Tiêu chuẩn là 1 người / 2 TB)">
            </div>
          </td>
          <!-- UPH theo TB bố trí -->
          <td style="text-align: right; color: #22d3ee; font-weight: 800;" class="font-mono" title="UPH = (3600 × ${r.effectiveTb} TB) ÷ ${r.ctActual}s">
            ${r.effectiveUph.toLocaleString('vi-VN')}
          </td>
          <!-- Giờ Máy Cần Chạy -->
          <td style="text-align: right; color: #fbbf24; font-weight: 700;" class="font-mono" title="Tổng giờ máy cần để chạy hết ${r.targetQty} pcs với ${r.effectiveTb} TB">
            ${r.hoursNeeded > 0 ? r.hoursNeeded.toFixed(1) + 'h' : '0h'}
          </td>
          <!-- Output & Còn Thiếu -->
          <td style="text-align: right; min-width: 125px; font-family: var(--font-mono);">
            ${r.targetQty > 0 ? `
              <div style="color: #34d399; font-weight: 800; font-size: 0.8rem;">
                +${r.shiftOutput.toLocaleString('vi-VN')} <span style="font-size: 0.68rem; color: #94a3b8;">pcs</span>
              </div>
              <div style="font-size: 0.72rem; font-weight: 800; margin-top: 0.15rem; color: ${r.remainingShortage > 0 ? '#f87171' : '#34d399'};">
                ${r.remainingShortage > 0 ? 'Thiếu: -' + r.remainingShortage.toLocaleString('vi-VN') : '✅ Đủ 100%'}
              </div>
            ` : `<span class="badge badge-green" style="font-size: 0.7rem;">0 pcs</span>`}
          </td>
          <!-- Đánh Giá Tiến Độ & Nhân Lực -->
          <td style="text-align: left; min-width: 195px;">
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <div>
                ${r.targetQty > 0 ? (
                  r.remainingShortage === 0 
                    ? `<span class="badge badge-green" style="font-size: 0.68rem;">✅ Đạt Mục Tiêu (${shiftDurationHours.toFixed(1)}h)</span>`
                    : `<span class="badge badge-red" style="font-size: 0.68rem;">⚠️ Thiếu CS (-${r.remainingShortage})</span>`
                ) : `<span style="color: var(--text-muted); font-size: 0.72rem;">--</span>`}
              </div>
              <div>
                ${r.effectiveTb > 0 ? (
                  r.effectiveMan * 2 < r.effectiveTb
                    ? `<span class="badge-manpower-warn" title="Quá tải: ${r.effectiveMan} người vận hành ${r.effectiveTb} TB (vượt chuẩn 1 người / 2 TB)">⚠️ 1 người / ${(r.effectiveTb/r.effectiveMan).toFixed(1)} TB</span>`
                    : r.effectiveMan > r.effectiveTb
                    ? `<span class="badge badge-amber" title="Thừa nhân lực: ${r.effectiveMan} người cho ${r.effectiveTb} TB">ℹ️ Thừa người</span>`
                    : `<span class="badge-manpower-ok" title="Đạt chuẩn: 1 người dùng 2 test block">✅ Chuẩn 1 người / 2 TB</span>`
                ) : `<span style="color: var(--text-muted); font-size: 0.72rem;">--</span>`}
              </div>
              ${isManualChanged ? `
                <div style="margin-top: 0.1rem;">
                  <a href="javascript:void(0)" onclick="handleResetHardtestRowManual('${encodedRowId}')" style="font-size: 0.62rem; color: #94a3b8; text-decoration: underline;">[↺ Đặt lại đề xuất]</a>
                </div>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!-- 1. HARDTEST SIMULATOR CONTROL & DISPATCH PANEL -->
      <div class="card" style="margin-bottom: 1.25rem; padding: 1.15rem; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-glass);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.15rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #22d3ee; display: flex; align-items: center; gap: 0.5rem;">
              <span>🧮</span> BẢNG GIẢ LẬP TẢI TEST BLOCK &amp; NHÂN LỰC (TOTAL HARDTEST)
            </h3>
            <p style="margin: 0.25rem 0 0; font-size: 0.775rem; color: #94a3b8;">
              Mô phỏng cân bằng Test Block và định mức <strong>1 người dùng 2 test block</strong> theo dữ liệu sản xuất thực tế Bảng 2.
            </p>
          </div>

          <!-- Date Range Picker (Từ Ngày Đến Ngày) -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.775rem; font-weight: 700; color: #38bdf8;">📅 Giai đoạn kế hoạch:</span>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(15,23,42,0.85); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid rgba(56,189,248,0.35);">
              <span style="font-size: 0.72rem; color: #94a3b8;">Từ:</span>
              <input type="date" id="hardtest-sim-from-date" class="font-mono select-filter" style="padding: 0.2rem 0.4rem; font-size: 0.775rem; color: #f8fafc; background: rgba(15,23,42,0.9); border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;" value="${simFromDate}" onchange="handleHardtestSimFromDateChange(this.value)">
              <span style="font-size: 0.72rem; color: #94a3b8;">Đến:</span>
              <input type="date" id="hardtest-sim-to-date" class="font-mono select-filter" style="padding: 0.2rem 0.4rem; font-size: 0.775rem; color: #f8fafc; background: rgba(15,23,42,0.9); border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;" value="${simToDate}" onchange="handleHardtestSimToDateChange(this.value)">
            </div>
          </div>
        </div>

        <!-- Toolbar & Shift Duration Filters -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <!-- Shift Duration Selector -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #fbbf24;">⏱️ Thời Gian Ca:</span>
              <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 175px;" onchange="handleHardtestSimShiftTypeChange(this.value)">
                <option value="FULL_DAY" ${simShiftType === 'FULL_DAY' ? 'selected' : ''}>⭐ Cả Ngày (21.41h: Ngày 10.83h + Đêm 10.58h)</option>
                <option value="DAY" ${simShiftType === 'DAY' ? 'selected' : ''}>☀️ Ca Ngày (10.83 Giờ)</option>
                <option value="NIGHT" ${simShiftType === 'NIGHT' ? 'selected' : ''}>🌙 Ca Đêm (10.58 Giờ)</option>
                <option value="RANGE" ${simShiftType === 'RANGE' ? 'selected' : ''}>📅 Cả Giai Đoạn Chọn</option>
              </select>
            </div>

            <!-- Sub Stage Filter -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #22d3ee;">🔬 Công Đoạn:</span>
              <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 140px;" onchange="handleHardtestSimStageFilterChange(this.value)">
                <option value="ALL" ${stageSubFilter === 'ALL' ? 'selected' : ''}>Tất cả Total Hardtest</option>
                <option value="HARD TEST" ${stageSubFilter === 'HARD TEST' ? 'selected' : ''}>Hard Test</option>
                <option value="OPTICS ASM" ${stageSubFilter === 'OPTICS ASM' ? 'selected' : ''}>Optics ASM</option>
                <option value="FOCUS" ${stageSubFilter === 'FOCUS' ? 'selected' : ''}>Focus</option>
              </select>
            </div>

            <!-- Group Model Filter -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #60a5fa;">🏷️ Group:</span>
              <select class="select-filter font-mono" style="font-size: 0.775rem; min-width: 155px;" onchange="handleHardtestSimGroupFilterChange(this.value)">
                <option value="ALL" ${groupFilter === 'ALL' ? 'selected' : ''}>Tất cả Group Model</option>
                ${(htData.groups || []).map(g => `<option value="${g.group}" ${groupFilter === g.group ? 'selected' : ''}>${g.group}</option>`).join('')}
              </select>
            </div>

            <!-- Plan Status Filter (Hỗ trợ lọc Gap < 0 như Assembly) -->
            <div style="display: flex; align-items: center; gap: 0.35rem;">
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button type="button" class="sim-btn-export-sheet" onclick="handleExportHardtestSimCSV()" title="Xuất toàn bộ bảng giả lập Total Hardtest ra file CSV">
              <span>📥 Xuất Sheet CSV</span>
            </button>
            <button type="button" class="sim-btn-copy-sheet" onclick="handleCopyHardtestSimClipboard()" title="Sao chép bảng giả lập Total Hardtest vào Clipboard">
              <span>📋 Copy Cho Google Sheet</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="handleResetAllHardtestManual()" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; color: #34d399; border-color: rgba(16, 185, 129, 0.4);" title="Đặt lại tất cả số TB &amp; Người về đề xuất chuẩn">
              <span>↺ Đặt lại đề xuất</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. SIMULATOR RESULT KPI CARDS -->
      <div class="capacity-kpi-grid" style="margin-bottom: 1.25rem;">
        <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #3b82f6, #60a5fa);">
          <div class="capacity-kpi-label"><span>📦 Kế Hoạch (Plan)</span></div>
          <div class="capacity-kpi-val" style="color: #60a5fa;">
            ${grandPlan.toLocaleString('vi-VN')} <span style="font-size: 0.8rem; color: #94a3b8;">pcs</span>
          </div>
          <div class="capacity-kpi-sub">Kỳ: <strong>${simFromDate} ➜ ${simToDate}</strong></div>
        </div>

        <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #10b981, #34d399);">
          <div class="capacity-kpi-label"><span>📊 Thực Tế (Fact)</span></div>
          <div class="capacity-kpi-val" style="color: #34d399;">
            ${grandFact.toLocaleString('vi-VN')} <span style="font-size: 0.8rem; color: #94a3b8;">pcs</span>
          </div>
          <div class="capacity-kpi-sub">Đạt <strong>${grandPlan > 0 ? Math.round(grandFact/grandPlan*100) : (grandFact > 0 ? 100 : 0)}%</strong> kế hoạch</div>
        </div>

        <div class="capacity-kpi-card" style="--kpi-accent: ${grandGap < 0 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)'};">
          <div class="capacity-kpi-label"><span>⚖️ Chênh Lệch (Gap)</span></div>
          <div class="capacity-kpi-val" style="color: ${grandGap < 0 ? '#f87171' : grandGap > 0 ? '#34d399' : '#cbd5e1'};">
            ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'} <span style="font-size: 0.8rem; color: #94a3b8;">pcs</span>
          </div>
          <div class="capacity-kpi-sub">${grandGap < 0 ? `⚠️ Thiếu hụt ${shortageCount} mã cần bù` : '✅ Đạt 100% kế hoạch'}</div>
        </div>

        <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #06b6d4, #22d3ee);">
          <div class="capacity-kpi-label"><span>💡 Đề Xuất Test Block</span></div>
          <div class="capacity-kpi-val" style="color: #22d3ee;">
            ${grandReqTb} TB <span style="font-size: 0.8rem; color: #94a3b8;">cần dùng</span>
          </div>
          <div class="capacity-kpi-sub">Tổng công suất Test Block cần vận hành</div>
        </div>

        <div class="capacity-kpi-card" style="--kpi-accent: linear-gradient(90deg, #8b5cf6, #c084fc);">
          <div class="capacity-kpi-label"><span>👥 Đề Xuất Nhân Lực</span></div>
          <div class="capacity-kpi-val" style="color: #c084fc;">
            ${grandReqMan} <span style="font-size: 0.8rem; color: #94a3b8;">Người</span>
          </div>
          <div class="capacity-kpi-sub">Chuẩn định mức: <strong>1 Người / 2 Test Block</strong></div>
        </div>
      </div>

      <!-- 3. MAIN SIMULATION TABLE -->
      <div class="capacity-table-wrap">
        <div style="padding: 0.65rem 1rem; background: rgba(11, 19, 41, 0.9); border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 800; color: #22d3ee; font-size: 0.875rem;">📋 BẢNG ĐIỀU ĐỘ TEST BLOCK &amp; NHÂN LỰC THEO GIAI ĐOẠN (${simFromDate} ➜ ${simToDate})</span>
            <span class="badge badge-blue" style="font-size: 0.72rem;">Đang hiển thị: ${filteredRows.length} Mã</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
            <span>Tiêu chuẩn: <strong style="color: #c084fc;">1 Người = 2 Test Block</strong> • Đề xuất: <strong style="color: #10b981;">N_req = Math.ceil(Target ÷ Capa 1 TB)</strong></span>
          </div>
        </div>

        <div style="overflow-x: auto; max-height: calc(100vh - 400px);">
          <table class="capacity-matrix-table" id="hardtest-sim-table">
            <thead>
              <tr>
                <th class="sticky-cap-stt">STT</th>
                <th style="min-width: 95px; text-align: center;">CÔNG ĐOẠN</th>
                <th class="sticky-ht-group" style="text-align: left;">NORMING GROUP</th>
                <th class="sticky-ht-board" style="text-align: left;">MÃ 1C &amp; BO MẠCH</th>
                <th style="min-width: 105px; text-align: right; color: #60a5fa;" title="Kế hoạch sản lượng (Pcs) trong giai đoạn đã chọn">
                  KẾ HOẠCH (PLAN)<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: #cbd5e1;">(Bấm để sửa)</span>
                </th>
                <th style="min-width: 95px; text-align: right; color: #34d399;" title="Sản lượng thực tế đã sản xuất trong giai đoạn">
                  THỰC TẾ (FACT)
                </th>
                <th style="min-width: 105px; text-align: right; color: #f87171;" title="Chênh lệch Thực tế - Kế hoạch (Âm là thiếu hụt)">
                  CHÊNH LỆCH (GAP)
                </th>
                <th style="min-width: 85px; text-align: right; color: #38bdf8;" title="Cycle Time Thực Tế sau bù FTT &amp; Downtime">CT THỰC TẾ</th>
                <th style="min-width: 85px; text-align: center; color: #38bdf8;" title="Số lượng khối thiết bị Test Block hiện có sẵn trong xưởng">TB SẴN CÓ</th>
                <th style="min-width: 125px; text-align: center; color: #10b981;" title="Số khối Test Block cần thiết để hoàn thành Kế hoạch / Thiếu hụt trong thời gian ca">
                  💡 ĐỀ XUẤT: SỐ BLOCK<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: #cbd5e1;">(Cần để bù/đạt plan)</span>
                </th>
                <th style="min-width: 125px; text-align: center; color: #c084fc;" title="Số lượng nhân lực cần thiết theo quy chuẩn: 1 người dùng 2 test block (Math.ceil(TB / 2))">
                  👥 ĐỀ XUẤT: NHÂN LỰC<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: #cbd5e1;">(Chuẩn 1 người / 2 TB)</span>
                </th>
                <th style="min-width: 95px; text-align: center; color: #38bdf8;" title="Tự nhập số Test Block muốn bố trí cho bo mạch này">
                  ✍️ THỦ CÔNG: SỐ TB<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: #cbd5e1;">(Input số block)</span>
                </th>
                <th style="min-width: 95px; text-align: center; color: #c084fc;" title="Tự nhập số người muốn bố trí (Tiêu chuẩn 1 người / 2 TB)">
                  ✍️ THỦ CÔNG: SỐ NGƯỜI<br>
                  <span style="font-size: 0.65rem; font-weight: normal; color: #cbd5e1;">(Input số người)</span>
                </th>
                <th style="min-width: 95px; text-align: right; color: #22d3ee;" title="Tốc độ UPH tính theo số Test Block đã bố trí">UPH (PCS/H)</th>
                <th style="min-width: 95px; text-align: right; color: #fbbf24;" title="Tổng thời gian cần để chạy hết Kế hoạch với số TB đã bố trí">GIỜ MÁY CẦN</th>
                <th style="min-width: 125px; text-align: right; color: #34d399;" title="Sản lượng làm được trong ca và số lượng còn thiếu">OUTPUT &amp; CÒN THIẾU</th>
                <th style="min-width: 195px; text-align: left;" title="Đánh giá khả năng đáp ứng Kế hoạch và cân bằng nhân lực">ĐÁNH GIÁ TIẾN ĐỘ &amp; NHÂN LỰC</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : `
                <tr>
                  <td colspan="17" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                    <div style="font-weight: 700; color: #f8fafc;">Không tìm thấy mã nào phù hợp với bộ lọc</div>
                  </td>
                </tr>
              `}
            </tbody>
            <tfoot>
              <tr style="background: rgba(15, 23, 42, 0.95); font-weight: 800; border-top: 2px solid var(--border-glass);">
                <td colspan="4" style="text-align: right; padding: 0.75rem 1rem; color: #f8fafc; font-size: 0.85rem;">
                  TỔNG CỘNG (${filteredRows.length} MÃ):
                </td>
                <td style="text-align: right; color: #60a5fa; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 800;">
                  ${grandPlan.toLocaleString('vi-VN')} pcs
                </td>
                <td style="text-align: right; color: #34d399; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 800;">
                  ${grandFact.toLocaleString('vi-VN')} pcs
                </td>
                <td style="text-align: right; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 800; color: ${grandGap < 0 ? '#f87171' : grandGap > 0 ? '#34d399' : 'var(--text-muted)'};">
                  ${grandGap !== 0 ? (grandGap > 0 ? '+' : '') + grandGap.toLocaleString('vi-VN') : '0'} pcs
                </td>
                <td style="text-align: right; color: var(--text-muted); font-size: 0.75rem;">--</td>
                <td style="text-align: center; color: #38bdf8; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandAvailTb} TB
                </td>
                <td style="text-align: center; color: #10b981; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandReqTb} TB
                </td>
                <td style="text-align: center; color: #c084fc; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandReqMan} Người
                </td>
                <td style="text-align: center; color: #38bdf8; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandManualTb} TB
                </td>
                <td style="text-align: center; color: #c084fc; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandManualMan} Người
                </td>
                <td style="text-align: right; color: #22d3ee; font-family: var(--font-mono); font-size: 0.8rem;">--</td>
                <td style="text-align: right; color: #fbbf24; font-family: var(--font-mono); font-size: 0.85rem;">
                  ${grandHours.toFixed(1)}h
                </td>
                <td style="text-align: right; color: #34d399; font-family: var(--font-mono); font-size: 0.85rem;">
                  +${grandOutput.toLocaleString('vi-VN')} pcs
                  ${grandShortage > 0 ? `<div style="color: #f87171; font-size: 0.75rem;">Thiếu: -${grandShortage.toLocaleString('vi-VN')}</div>` : ''}
                </td>
                <td style="text-align: left; color: ${grandShortage > 0 ? '#f87171' : '#34d399'}; font-size: 0.75rem;">
                  ${grandShortage > 0 ? `⚠️ Tổng còn thiếu -${grandShortage.toLocaleString('vi-VN')} pcs` : `✅ Đã đủ công suất 100%`}
                </td>
              </tr>
            </tfoot>
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
    window.renderCapacityView();
    window.showToast('info', `Đã cập nhật Kế hoạch: ${num.toLocaleString('vi-VN')} pcs`);
  };

  window.handleHardtestManualTbChange = function(rawRowId, val) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Test Block!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    const num = Math.max(0, parseInt(val, 10) || 0);
    if (!window.AppStore.hardtestManualTb) window.AppStore.hardtestManualTb = {};
    if (!window.AppStore.hardtestManualMan) window.AppStore.hardtestManualMan = {};
    window.AppStore.hardtestManualTb[rowId] = num;
    // Auto-update manpower according to standard 1 worker for 2 test blocks if user hasn't explicitly customized manpower
    if (window.AppStore.hardtestManualMan[rowId] === undefined) {
      window.AppStore.hardtestManualMan[rowId] = Math.ceil(num / 2.0);
    }
    window.renderCapacityView();
    window.showToast('info', `Đã bố trí thủ công: ${num} Test Block`);
  };

  window.handleHardtestManualManChange = function(rawRowId, val) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản của bạn là Viewer (Chỉ xem). Hãy đăng nhập để sửa Nhân lực!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    const num = Math.max(0, parseInt(val, 10) || 0);
    if (!window.AppStore.hardtestManualMan) window.AppStore.hardtestManualMan = {};
    window.AppStore.hardtestManualMan[rowId] = num;
    window.renderCapacityView();
    window.showToast('info', `Đã bố trí thủ công: ${num} Người vận hành`);
  };

  window.handleResetHardtestRowManual = function(rawRowId) {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản Viewer không có quyền đặt lại!');
      return;
    }
    const rowId = decodeURIComponent(rawRowId);
    if (window.AppStore.hardtestManualTb) delete window.AppStore.hardtestManualTb[rowId];
    if (window.AppStore.hardtestManualMan) delete window.AppStore.hardtestManualMan[rowId];
    if (window.AppStore.hardtestPlanOverrides) delete window.AppStore.hardtestPlanOverrides[rowId];
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại mã này về đề xuất chuẩn');
  };

  window.handleResetAllHardtestManual = function() {
    if (window.UserAuth && !window.UserAuth.canEdit()) {
      window.showToast('warning', '⚠️ Tài khoản Viewer không có quyền đặt lại!');
      return;
    }
    window.AppStore.hardtestManualTb = {};
    window.AppStore.hardtestManualMan = {};
    window.AppStore.hardtestPlanOverrides = {};
    window.renderCapacityView();
    window.showToast('success', 'Đã đặt lại toàn bộ TB &amp; Nhân lực về đề xuất chuẩn!');
  };

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

    const headers = [
      'STT', 'Công Đoạn', 'Group Model', 'Mã 1C', 'Bo Mạch Định Mức',
      'Kế Hoạch (Plan)', 'Thực Tế (Fact)', 'Chênh Lệch (Gap)',
      'CT Thực Tế (s)', 'TB Sẵn Có (Test Block)',
      'Đề Xuất Số TB', 'Đề Xuất Nhân Lực (1 Người / 2 TB)',
      'Thủ Công: Số TB', 'Thủ Công: Số Người',
      'UPH Bố Trí (pcs/h)', 'Giờ Máy Cần (h)', 'Sản Lượng Đạt (pcs)', 'Còn Thiếu (pcs)',
      'Đánh Giá Định Mức Ca', 'Đánh Giá Nhân Lực'
    ];

    let csv = '\uFEFF';
    csv += `# AJAX PROPLAN MES - GIẢ LẬP ĐIỀU ĐỘ TOTAL HARDTEST & TEST BLOCK & NHÂN LỰC\n`;
    csv += `# Giai đoạn: ${fromDate} ➜ ${toDate} | Xuất ngày: ${now.toLocaleString('vi-VN')}\n`;
    csv += `# Quy chuẩn: 1 Người phụ trách 2 Test Block | Ca Ngày 10.83h | Ca Đêm 10.58h\n\n`;
    csv += headers.map(h => `"${h}"`).join(',') + '\n';

    rows.forEach((r, idx) => {
      const evalCap = r.targetQty > 0 ? (r.remainingShortage === 0 ? 'Đạt 100%' : `Thiếu -${r.remainingShortage}`) : '--';
      const evalMan = r.effectiveTb > 0 
        ? (r.effectiveMan * 2 < r.effectiveTb ? `Quá tải (1 người / ${(r.effectiveTb/r.effectiveMan).toFixed(1)} TB)` : 'Đạt chuẩn 1 người / 2 TB')
        : '--';

      const row = [
        r.displayIdx || (idx + 1),
        `"${r.stage}"`,
        `"${(r.normGroup || r.group || '').replace(/"/g, '""')}"`,
        `"${(r.model1c || '').replace(/"/g, '""')}"`,
        `"${(r.board || '').replace(/"/g, '""')}"`,
        r.planQty != null ? r.planQty : 0,
        r.factQty != null ? r.factQty : 0,
        r.gapQty != null ? r.gapQty : 0,
        r.ctActual,
        r.availTb,
        r.reqTb,
        r.reqMan,
        r.effectiveTb,
        r.effectiveMan,
        r.effectiveUph,
        r.hoursNeeded.toFixed(2),
        r.shiftOutput,
        r.remainingShortage,
        `"${evalCap}"`,
        `"${evalMan}"`
      ];
      csv += row.join(',') + '\n';
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

    const headers = [
      'STT', 'Công Đoạn', 'Group Model', 'Mã 1C', 'Bo Mạch Định Mức',
      'Kế Hoạch (Plan)', 'Thực Tế (Fact)', 'Chênh Lệch (Gap)',
      'CT Thực Tế (s)', 'TB Sẵn Có (Test Block)',
      'Đề Xuất Số TB', 'Đề Xuất Nhân Lực (1 Người / 2 TB)',
      'Thủ Công: Số TB', 'Thủ Công: Số Người',
      'UPH Bố Trí (pcs/h)', 'Giờ Máy Cần (h)', 'Sản Lượng Đạt (pcs)', 'Còn Thiếu (pcs)',
      'Đánh Giá Định Mức Ca', 'Đánh Giá Nhân Lực'
    ];

    let tsv = headers.join('\t') + '\n';
    rows.forEach((r, idx) => {
      const evalCap = r.targetQty > 0 ? (r.remainingShortage === 0 ? 'Đạt 100%' : `Thiếu -${r.remainingShortage}`) : '--';
      const evalMan = r.effectiveTb > 0 
        ? (r.effectiveMan * 2 < r.effectiveTb ? `Quá tải (1 người / ${(r.effectiveTb/r.effectiveMan).toFixed(1)} TB)` : 'Đạt chuẩn 1 người / 2 TB')
        : '--';

      const row = [
        r.displayIdx || (idx + 1),
        r.stage,
        r.normGroup || r.group,
        r.model1c,
        r.board,
        r.planQty != null ? r.planQty : 0,
        r.factQty != null ? r.factQty : 0,
        r.gapQty != null ? r.gapQty : 0,
        r.ctActual,
        r.availTb,
        r.reqTb,
        r.reqMan,
        r.effectiveTb,
        r.effectiveMan,
        r.effectiveUph,
        r.hoursNeeded.toFixed(2),
        r.shiftOutput,
        r.remainingShortage,
        evalCap,
        evalMan
      ];
      tsv += row.join('\t') + '\n';
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

    const shortageItems = [];
    scheduleItems.forEach(it => {
      if (it.cumGapQty < 0) {
        const capInfo = resolveModelLineCapacity(it, capData);
        const rowKey = `${it.stage}___${it.model}___${it.productName1C}`.replace(/"/g, '&quot;');
        const shortage = Math.abs(it.cumGapQty);
        const estHours = (shortage * capInfo.optimalLine.actualCt) / 3600;
        shortageItems.push({ it, capInfo, rowKey, shortage, estHours });
      }
    });

    // Sort DoorProtect jobs first to utilize dedicated Line Support, then sort heavy jobs for packing
    shortageItems.sort((a, b) => {
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

  function getScheduledLineJobs() {
    const rows = window.AppStore.lastProcessedSimRows || [];
    const jobs = [];

    rows.forEach(r => {
      // 1. Day Shift scheduled job (từ kế hoạch hoàn thành hoặc đang lập)
      const dayLineId = r.assignedDayLineId || (r.chosenDayLine ? r.chosenDayLine.lineId : null);
      const dayQty = (r.planDay !== undefined && r.planDay !== null && r.planDay > 0) ? r.planDay : (r.dayOutput || 0);
      const dayH = (r.dayAvailHours !== undefined && r.dayAvailHours !== null && r.dayAvailHours > 0) ? r.dayAvailHours : (r.dayHours || 0);
      const dayCt = r.actualCtDay || (r.chosenDayLine ? r.chosenDayLine.actualCt : (r.norm || 0));
      const daySeq = (r.seqDay && !isNaN(parseInt(r.seqDay))) ? parseInt(r.seqDay) : ((r.seqDayNum && isFinite(r.seqDayNum)) ? r.seqDayNum : (r.daySeq || 99));
      const dayPerf = (r.perfPctDay !== undefined && r.perfPctDay !== null && r.perfPctDay !== '') ? r.perfPctDay : (r.chosenDayLine ? r.chosenDayLine.perfPct : 100);

      if (dayLineId && (dayQty > 0 || dayH > 0)) {
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
          quotaHours: 10.83
        });
      }

      // 2. Night Shift scheduled job (từ kế hoạch hoàn thành hoặc đang lập)
      const nightLineId = r.assignedNightLineId || (r.chosenNightLine ? r.chosenNightLine.lineId : null);
      const nightQty = (r.planNight !== undefined && r.planNight !== null && r.planNight > 0) ? r.planNight : (r.nightOutput || 0);
      const nightH = (r.nightAvailHours !== undefined && r.nightAvailHours !== null && r.nightAvailHours > 0) ? r.nightAvailHours : (r.nightHours || 0);
      const nightCt = r.actualCtNight || (r.chosenNightLine ? r.chosenNightLine.actualCt : (r.norm || 0));
      const nightSeq = (r.seqNight && !isNaN(parseInt(r.seqNight))) ? parseInt(r.seqNight) : ((r.seqNightNum && isFinite(r.seqNightNum)) ? r.seqNightNum : (r.nightSeq || 99));
      const nightPerf = (r.perfPctNight !== undefined && r.perfPctNight !== null && r.perfPctNight !== '') ? r.perfPctNight : (r.chosenNightLine ? r.chosenNightLine.perfPct : 100);

      if (nightLineId && (nightQty > 0 || nightH > 0)) {
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
          quotaHours: 10.58
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
      ''
    ];
    csv += totalRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(',') + '\n';

    // Row 1: Headers 26 cột
    const headers = [
      'STT',
      'Công Đoạn',
      'Group Model',
      'Mã Model (1C)',
      'Kế Hoạch',
      'Thực Tế',
      'Chênh Lệch',
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
      'Ghi Chú'
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
        cleanNote
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

    window.showToast('success', `📥 Đã xuất file CSV chuẩn 26 cột (${rows.length} Model kèm Ghi Chú)!`);
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
      'Ghi Chú'
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
        cleanNote
      ];
      tsv += row.join('\t') + '\n';
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        window.showToast('success', `📋 Đã sao chép bảng 26 cột (${rows.length} Model kèm Ghi Chú)! Mở Google Sheets và bấm Ctrl+V để dán ngay.`);
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
        window.showToast('success', `📋 Đã sao chép bảng 25 cột! Mở Google Sheets và bấm Ctrl+V để dán.`);
      } catch (e) {
        window.showToast('error', 'Không thể sao chép tự động. Vui lòng thử nút Xuất Google Sheets (CSV)!');
      }
      document.body.removeChild(ta);
    }
  };

  window.handleOpenLineSequenceModal = function() {
    const modal = document.getElementById('lineSequenceModal');
    if (!modal) return;

    // Populate line filter dropdown
    const select = document.getElementById('lineSeqFilterSelect');
    if (select) {
      const dayLines = window.AppStore.simWorkingLinesDay || [];
      const nightLines = window.AppStore.simWorkingLinesNight || [];
      const allActive = Array.from(new Set([...dayLines, ...nightLines])).sort();

      select.innerHTML = `<option value="ALL">-- Tất cả các Chuyền (${allActive.length}) --</option>` +
        allActive.map(lid => `<option value="${lid}">Line ${lid}</option>`).join('');
    }

    window.AppStore.lineSeqFilterLine = 'ALL';
    window.AppStore.lineSeqFilterShift = 'ALL';
    if (!window.AppStore.lineSeqViewMode) window.AppStore.lineSeqViewMode = 'CARDS';

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

    if (badge) badge.innerText = `${groupKeys.length} Chuyền/Ca (${filteredJobs.length} Model)`;
    if (summaryInfo) {
      const totalH = filteredJobs.reduce((s, j) => s + j.hours, 0);
      const totalQ = filteredJobs.reduce((s, j) => s + j.allocatedQty, 0);
      summaryInfo.innerHTML = `Tổng cộng: <strong>${filteredJobs.length} lượt chạy</strong> • <strong>${totalH.toFixed(1)} giờ máy</strong> • <strong>${totalQ.toLocaleString('vi-VN')} pcs</strong> hoàn thành.`;
    }

    if (groupKeys.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #cbd5e1;">Chưa có Model nào được phân bổ vào các Chuyền đi làm!</div>
          <div style="font-size: 0.8rem; margin-top: 0.35rem;">Vui lòng hoàn thành phân bổ Chuyền trên Bảng Kế Hoạch hoặc bật thêm Line đi làm.</div>
        </div>
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
              ${j.actualCt}s
            </td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: ${shiftColor}; font-size: 0.825rem;">
              ${j.hours.toFixed(1)}h
            </td>
            <td class="font-mono" style="text-align: center; color: #94a3b8; font-size: 0.75rem;">
              ${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h
            </td>
            <td style="text-align: center;">
              <span class="badge badge-green" style="font-size: 0.68rem; font-weight: 800;">
                ${j.isFullQuota ? '✅ Đầy ca' : '✅ Trong ca'}
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
              ${j.actualCt}s
            </td>
            <td class="font-mono" style="text-align: right; font-weight: 800; color: ${shiftColor}; font-size: 0.825rem;">
              ${j.hours.toFixed(1)}h
            </td>
            <td class="font-mono" style="text-align: center; color: #94a3b8; font-size: 0.72rem;">
              ${j.startHours.toFixed(1)}h ➔ ${j.endHours.toFixed(1)}h
            </td>
            <td style="text-align: center;">
              <span class="badge badge-green" style="font-size: 0.68rem; font-weight: 800;">
                ${j.isFullQuota ? '✅ Đầy ca' : '✅ Trong ca'}
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

    container.innerHTML = html;
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
      window.showToast('success', `📥 Đã xuất file CSV kế hoạch thứ tự Line (${filteredJobs.length} lượt chạy) thành công!`);
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
          window.showToast('success', `📋 Đã sao chép Kế hoạch thứ tự Line (${filteredJobs.length} lượt chạy) vào Clipboard! Dán ngay (Ctrl+V) vào Google Sheets.`);
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
        simManualNotes: { ...(window.AppStore.simManualNotes || {}) }
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
  let simPlanSyncChannel = null;
  try {
    simPlanSyncChannel = new BroadcastChannel('AJAX_PROPLAN_PLAN_SYNC');
    simPlanSyncChannel.onmessage = function(ev) {
      if (ev && ev.data && ev.data.type === 'NEW_COMPLETED_PLAN') {
        const remotePlan = ev.data.plan;
        const currentId = window.AppStore ? (window.AppStore._currentAppliedPlanId || localStorage.getItem('AJAX_CURRENT_APPLIED_PLAN_ID') || '') : '';
        if (remotePlan && remotePlan.id && remotePlan.id !== currentId) {
          if (window.AppStore) {
            window.AppStore._pendingRemotePlan = remotePlan;
            window.AppStore._hasPendingRemotePlan = true;
            window.AppStore._pendingRemotePlanDesc = `Người lập: <strong>${remotePlan.planner || 'Thành viên'}</strong> • Hoàn thành lúc: <strong>${remotePlan.dateStr || ''} ${remotePlan.timeStr || ''}</strong> • ${remotePlan.modelsCount || 0} Model (${(remotePlan.grandPlan || 0).toLocaleString('vi-VN')} pcs)`;
          }

          // Tự động cập nhật ngay cho Admin hoặc khi bật auto-sync
          const isAdmin = window.UserAuth && typeof window.UserAuth.isAdmin === 'function' ? window.UserAuth.isAdmin() : true;
          if (isAdmin || window.AppStore._autoSyncRemotePlan !== false) {
            console.log('⚡ [Live Sync] Tự động cập nhật kế hoạch mới cho Admin từ:', remotePlan.planner);
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
          }
        }
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  window.initPlanSyncWatcher = function() {
    if (window._simPlanSyncWatcherInitialized) return;
    window._simPlanSyncWatcherInitialized = true;

    // Kiểm tra ngay sau khi khởi tạo
    setTimeout(() => {
      if (window.handleCheckAndSyncCompletedPlan) {
        window.handleCheckAndSyncCompletedPlan(false);
      }
    }, 300);

    // Tự động kiểm tra ngay khi Admin quay lại cửa sổ trình duyệt
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
    fetch('/api/completed-plan?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data || !data.success || !data.latestPlan) return;
        const remotePlan = data.latestPlan;
        const currentAppliedId = window.AppStore._currentAppliedPlanId || (localStorage.getItem('AJAX_CURRENT_APPLIED_PLAN_ID') || '');

        // Bản kế hoạch trên server khác với bản hiện tại đang hiển thị -> Tự động nạp ngay
        if (remotePlan.id && remotePlan.id !== currentAppliedId) {
          console.log('⚡ [Auto Load] Phát hiện kế hoạch mới từ máy chủ, tự động áp dụng:', remotePlan.planner);
          window.AppStore._pendingRemotePlan = remotePlan;
          window.handleApplyLatestCompletedPlan(true, true);
        }
      })
      .catch(e => console.warn('Cannot auto check latest plan on load:', e));
  };

  window.handleForceSyncLatestPlan = function() {
    if (!window.AppStore) return;
    if (window.showToast) window.showToast('info', '🔄 Đang kiểm tra và nạp bản kế hoạch mới nhất từ máy chủ...');
    fetch('/api/completed-plan?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data || !data.success || !data.latestPlan) {
          if (window.showToast) window.showToast('warning', 'Chưa có bản kế hoạch nào được hoàn thành trên máy chủ.');
          return;
        }
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
    fetch('/api/completed-plan?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data || !data.success) return;
        if (data.latestPlan) {
          const remotePlan = data.latestPlan;
          const currentPlanId = window.AppStore._currentAppliedPlanId || (localStorage.getItem('AJAX_CURRENT_APPLIED_PLAN_ID') || '');

          if (remotePlan.id && remotePlan.id !== currentPlanId) {
            window.AppStore._pendingRemotePlan = remotePlan;
            window.AppStore._hasPendingRemotePlan = true;
            window.AppStore._pendingRemotePlanDesc = `Người lập: <strong>${remotePlan.planner || 'Thành viên'}</strong> • Hoàn thành lúc: <strong>${remotePlan.dateStr || ''} ${remotePlan.timeStr || ''}</strong> • ${remotePlan.modelsCount || 0} Model (${(remotePlan.grandPlan || 0).toLocaleString('vi-VN')} pcs)`;

            // Luôn tự động cập nhật ngay lập tức cho Admin và chế độ xem để màn hình không bị trễ
            const currentRole = window.UserAuth && typeof window.UserAuth.getCurrentRole === 'function' ? window.UserAuth.getCurrentRole() : 'admin';
            const isAdmin = currentRole === 'admin';
            if (isAdmin || window.AppStore._autoSyncRemotePlan !== false) {
              console.log('⚡ [Auto Sync] Tự động cập nhật kế hoạch cho Admin/User:', remotePlan.planner);
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
          } else {
            if (isManualClick && window.showToast) {
              window.showToast('info', '✅ Kế hoạch hiện tại đã là phiên bản mới nhất từ máy chủ!');
            }
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
      fetch('/api/completed-plan?t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && data.latestPlan && data.latestPlan.snapshot) {
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
    if (s.simFromDate) window.AppStore.simFromDate = s.simFromDate;
    if (s.simToDate) window.AppStore.simToDate = s.simToDate;
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
    window.AppStore.simManualShifts = { ...(s.simManualShifts || {}) };
    window.AppStore.simManualNotes = { ...(s.simManualNotes || {}) };

    window.AppStore._currentAppliedPlanId = plan.id;
    try { localStorage.setItem('AJAX_CURRENT_APPLIED_PLAN_ID', plan.id); } catch (e) {}
    window.AppStore._hasPendingRemotePlan = false;

    // Lưu vào draft để nếu F5 reload vẫn giữ đúng kế hoạch vừa nạp
    window.handleSaveSimPlanDraft(true);

    // Cập nhật giao diện Simulator nếu đang ở tab Capacity
    const activeTab = document.querySelector('.nav-link.active')?.getAttribute('data-tab');
    if (activeTab === 'capacity' && window.renderCapacityView) {
      window.renderCapacityView();
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
    const plannerName = (window.AppStore.simPlannerName !== undefined && window.AppStore.simPlannerName !== null)
      ? window.AppStore.simPlannerName
      : (localStorage.getItem('AJAX_SIM_PLANNER_NAME') || 'Bùi Anh Tuấn');

    const processedRows = window.AppStore.lastProcessedSimRows || [];
    const modelsCount = processedRows.length;
    let grandPlan = 0;
    let grandFact = 0;
    let grandPlanDay = 0;
    let grandPlanNight = 0;
    processedRows.forEach(r => {
      grandPlan += (r.it.cumPlanQty || 0);
      grandFact += (r.it.cumFactQty || 0);
      grandPlanDay += (r.planDay || 0);
      grandPlanNight += (r.planNight || 0);
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const confirmMsg = `XÁC NHẬN HOÀN THÀNH KẾ HOẠCH SẢN XUẤT:\n\n` +
      `• Người lập Plan: ${plannerName}\n` +
      `• Ngày / Giờ lập: ${dateStr} ${timeStr}\n` +
      `• Công đoạn: ${window.AppStore.simStageFilter || 'ASSEMBLY'}\n` +
      `• Tổng số Model: ${modelsCount} Model\n` +
      `• Tổng sản lượng Kế hoạch: ${grandPlan.toLocaleString('vi-VN')} pcs\n` +
      `• Đã xếp Ca Ngày: ${grandPlanDay.toLocaleString('vi-VN')} pcs | Ca Đêm: ${grandPlanNight.toLocaleString('vi-VN')} pcs\n\n` +
      `Kế hoạch sẽ được lưu vào mục LỊCH SỬ và đồng bộ ngay cho TẤT CẢ các User khác trên hệ thống!`;

    if (!window.confirm(confirmMsg)) return;

    // Snapshot object
    const historyItem = {
      id: 'PLAN_' + Date.now(),
      createdAt: now.toISOString(),
      dateStr: dateStr,
      timeStr: timeStr,
      planner: plannerName,
      stage: window.AppStore.simStageFilter || 'ASSEMBLY',
      modelsCount,
      grandPlan,
      grandFact,
      grandPlanDay,
      grandPlanNight,
      workingLinesDay: [...(window.AppStore.simWorkingLinesDay || [])],
      workingLinesNight: [...(window.AppStore.simWorkingLinesNight || [])],
      snapshot: {
        plannerName,
        stageFilter: window.AppStore.simStageFilter || 'ASSEMBLY',
        simFromDate: window.AppStore.simFromDate || window.AppStore.fromDate,
        simToDate: window.AppStore.simToDate || window.AppStore.toDate,
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
        simManualNotes: { ...(window.AppStore.simManualNotes || {}) }
      }
    };

    let history = [];
    try {
      const stored = localStorage.getItem('AJAX_SIM_PLAN_HISTORY');
      if (stored) history = JSON.parse(stored);
      if (!Array.isArray(history)) history = [];
    } catch (e) {
      history = [];
    }

    history.unshift(historyItem);
    try {
      localStorage.setItem('AJAX_SIM_PLAN_HISTORY', JSON.stringify(history));
      window.handleSaveSimPlanDraft(true);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // Đánh dấu bản hiện tại là do mình vừa hoàn thành
    window.AppStore._currentAppliedPlanId = historyItem.id;
    try { localStorage.setItem('AJAX_CURRENT_APPLIED_PLAN_ID', historyItem.id); } catch (e) {}
    window.AppStore._hasPendingRemotePlan = false;

    // Gửi đồng bộ lên máy chủ cho các User khác
    fetch('/api/completed-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyItem)
    }).then(res => res.json()).then(resp => {
      console.log('✅ Kế hoạch đã được lưu và đồng bộ lên server:', resp);
    }).catch(err => {
      console.warn('⚠️ Lỗi gửi đồng bộ lên server:', err);
    });

    // Phát broadcast real-time cho các tab/cửa sổ khác
    if (simPlanSyncChannel) {
      try {
        simPlanSyncChannel.postMessage({ type: 'NEW_COMPLETED_PLAN', plan: historyItem });
      } catch (e) {}
    }

    window.renderCapacityView();
    if (window.showToast) {
      window.showToast('success', `🎉 ĐÃ HOÀN THÀNH KẾ HOẠCH! Đã lưu và đồng bộ cho các User khác (${dateStr} ${timeStr} - ${plannerName})`);
    }
  };

  window.handleOpenSimPlanHistoryModal = function() {
    const modal = document.getElementById('simPlanHistoryModal');
    if (!modal) return;
    window.AppStore.simHistorySearchQuery = '';
    const searchInput = document.getElementById('simHistorySearchInput');
    if (searchInput) searchInput.value = '';
    window.renderSimPlanHistoryContent();
    modal.style.display = 'flex';

    // Đồng bộ thêm các bản ghi lịch sử từ server
    fetch('/api/completed-plan?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.history)) {
          let localHist = [];
          try {
            localHist = JSON.parse(localStorage.getItem('AJAX_SIM_PLAN_HISTORY') || '[]');
          } catch (e) {}
          const map = new Map();
          localHist.forEach(item => { if (item && item.id) map.set(item.id, item); });
          data.history.forEach(item => { if (item && item.id) map.set(item.id, item); });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          localStorage.setItem('AJAX_SIM_PLAN_HISTORY', JSON.stringify(merged));
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
    if (s.simWorkingLinesDay) window.AppStore.simWorkingLinesDay = [...s.simWorkingLinesDay];
    if (s.simWorkingLinesNight) window.AppStore.simWorkingLinesNight = [...s.simWorkingLinesNight];
    window.AppStore._simLinesManualConfigured = true;
    if (s.simManualLinesDay) window.AppStore.simManualLinesDay = { ...s.simManualLinesDay };
    if (s.simManualLinesNight) window.AppStore.simManualLinesNight = { ...s.simManualLinesNight };
    if (s.simLineOverridesDay) window.AppStore.simLineOverridesDay = { ...s.simLineOverridesDay };
    if (s.simLineOverridesNight) window.AppStore.simLineOverridesNight = { ...s.simLineOverridesNight };
    if (s.simLineOverrides) window.AppStore.simLineOverrides = { ...s.simLineOverrides };
    if (s.simManualSeqsDay) window.AppStore.simManualSeqsDay = { ...s.simManualSeqsDay };
    if (s.simManualSeqsNight) window.AppStore.simManualSeqsNight = { ...s.simManualSeqsNight };
    if (s.simManualPfDay) window.AppStore.simManualPfDay = { ...s.simManualPfDay };
    if (s.simManualPfNight) window.AppStore.simManualPfNight = { ...s.simManualPfNight };
    if (s.simManualPlanDay) window.AppStore.simManualPlanDay = { ...s.simManualPlanDay };
    if (s.simManualPlanNight) window.AppStore.simManualPlanNight = { ...s.simManualPlanNight };
    if (s.simManualShifts) window.AppStore.simManualShifts = { ...s.simManualShifts };
    if (s.simManualNotes) window.AppStore.simManualNotes = { ...s.simManualNotes };

    window.AppStore._currentAppliedPlanId = item.id;
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

