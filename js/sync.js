/* ====================================================================
   AJAX PROPLAN MES - CLOUD GOOGLE SHEETS LIVE SYNC
   Fetches and parses live data from Google Sheets endpoints
   ==================================================================== */

const DEFAULT_CONFIG = {
  sheetId: '1wtuLHVwH4U4OfJ3bKQjTgC13g8EZfZePOyLnqnWzfl4',
  asGid: '826027730',   // As Form (Assembly Planning)
  htGid: '136756709',   // HT Form (Hoan Thien & Packaging)
  fttGid: '954480354',  // FTT & Quality Testing
  dataMassGid: '1404131818', // Data_Mass Master Production Schedule
  autoSyncMinutes: 5,   // 5 mins default
  autoSyncEnabled: true
};

window.SyncService = {
  config: null,
  syncTimer: null,
  lastSyncTime: null,
  isSyncing: false,

  init() {
    this.loadConfig();
    const lastSync = localStorage.getItem('AJAX_PROPLAN_LAST_SYNC');
    if (lastSync) {
      try {
        this.lastSyncTime = new Date(lastSync);
        this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
      } catch (e) {
        this.updateStatusUI('online', 'Dữ liệu sẵn sàng');
      }
    } else {
      this.updateStatusUI('online', 'Dữ liệu sẵn sàng');
    }

    if (this.config.autoSyncEnabled && this.config.autoSyncMinutes > 0) {
      this.startAutoSync();
    }
    this.startStatusWatcher();
  },

  loadConfig() {
    const saved = localStorage.getItem('AJAX_PROPLAN_CONFIG');
    if (saved) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        return;
      } catch(e) {}
    }
    this.config = { ...DEFAULT_CONFIG };
  },

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('AJAX_PROPLAN_CONFIG', JSON.stringify(this.config));
    this.restartAutoSync();
  },

  restartAutoSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.config.autoSyncEnabled && this.config.autoSyncMinutes > 0) {
      this.startAutoSync();
    }
  },

  startAutoSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    const ms = Math.max(1, this.config.autoSyncMinutes) * 60 * 1000;
    this.syncTimer = setInterval(() => {
      console.log('Running background auto-sync with Google Sheets...');
      this.fetchLiveData(true);
    }, ms);
  },

  // Parse CSV text accurately
  parseCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let token = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          token += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(token.trim());
        token = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(token.trim());
        if (row.some(cell => cell.length > 0)) {
          lines.push(row);
        }
        row = [];
        token = '';
      } else {
        token += char;
      }
    }
    if (token.length > 0 || row.length > 0) {
      row.push(token.trim());
      lines.push(row);
    }
    return lines;
  },

  async fetchSheetCSV(gid) {
    const id = this.config.sheetId;
    const directUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const isDataMass = String(gid) === String(this.config.dataMassGid);

    const tryFetchCsv = async (url, fetchOpts, rejectShortGviz) => {
      try {
        const res = await fetch(url, fetchOpts);
        if (!res.ok) return null;
        const text = await res.text();
        if (!text || text.trimStart().startsWith('<')) return null;
        // Google gviz silently truncates large Data_Mass sheets (~367 rows) while returning HTTP 200
        if (rejectShortGviz && isDataMass && (text.match(/\n/g) || []).length < 1000) {
          console.warn(`⚠️ Bỏ qua gviz CSV bị cắt xén cho Data_Mass GID ${gid}`);
          return null;
        }
        return text;
      } catch(e) {
        return null;
      }
    };

    const directText = await tryFetchCsv(directUrl, { cache: 'no-store' }, false);
    if (directText) return directText;

    const proxyText = await tryFetchCsv(proxyUrl, { cache: 'no-store' }, false);
    if (proxyText) return proxyText;

    const gvizText = await tryFetchCsv(gvizUrl, { cache: 'no-store' }, true);
    if (gvizText) return gvizText;

    throw new Error(`Không thể kết nối tải sheet GID: ${gid}`);
  },

  reloadScriptFile(basePath, ver = null) {
    return new Promise((resolve) => {
      const ts = ver ? `${ver}_${Date.now()}` : Date.now();
      const oldScript = document.querySelector(`script[src*="${basePath}"]`);
      const newScript = document.createElement('script');
      newScript.src = `${basePath}?t=${ts}`;
      newScript.onload = () => resolve(true);
      newScript.onerror = () => resolve(false);
      if (oldScript && oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      } else {
        document.body.appendChild(newScript);
      }
    });
  },

  async reloadDatamassScript(ver = null) {
    const results = await Promise.all([
      this.reloadScriptFile('js/datamass-data.js', ver),
      this.reloadScriptFile('js/inventory-1c-data.js', ver),
      this.reloadScriptFile('js/bom-data.js', ver),
      this.reloadScriptFile('js/mass-history-data.js', ver),
      this.reloadScriptFile('js/kpi-data.js', ver),
      this.reloadScriptFile('js/clips-alls-data.js', ver),
      this.reloadScriptFile('js/assembly-capacity-data.js', ver),
      this.reloadScriptFile('js/hardtest-capacity-data.js', ver)
    ]);
    if (window.AppStore && window.ASSEMBLY_CAPACITY_DATA) {
      window.AppStore.assemblyCapacity = window.ASSEMBLY_CAPACITY_DATA;
    }
    return results[0];
  },

  refreshVisibleModulesAfterSync() {
    try {
      if (typeof renderAttentionPointsSection === 'function' && window.__LATEST_SCHEDULE__) {
        renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
      }
      if (typeof window.renderCapacityView === 'function') {
        const capTab = document.getElementById('tab-capacity');
        if (capTab && capTab.classList.contains('active')) window.renderCapacityView('capacityContainer');
      }
      if (typeof window.renderWipControlView === 'function') {
        const wipTab = document.getElementById('tab-wip');
        if (wipTab && wipTab.classList.contains('active')) window.renderWipControlView('wipContainer');
      }
      if (typeof window.renderClipsAllPlanView === 'function') {
        const clipsTab = document.getElementById('tab-clips-all-plan');
        if (clipsTab && clipsTab.classList.contains('active')) window.renderClipsAllPlanView('clipsAllPlanContainer');
      }
      if (typeof window.renderKpiResultView === 'function') {
        const kpiTab = document.getElementById('tab-kpi-result');
        if (kpiTab && kpiTab.classList.contains('active')) window.renderKpiResultView('kpiResultContainer');
      }
    } catch (e) {}
  },

  async fetchSyncStatusMeta() {
    const now = Date.now();
    const isGitHubPages = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
    if (!isGitHubPages) {
      try {
        const res = await fetch('/api/status?t=' + now, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    try {
      const res = await fetch('./sync_status.json?t=' + now, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  startStatusWatcher() {
    const checkStatus = async () => {
      try {
        const stat = await this.fetchSyncStatusMeta();
        const currentV = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA._v) || 0;
        const isGitHubPages = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');

        if (stat && stat.timestamp) {
          const prev = window.LAST_PLAN_CHANGE_INFO || {};
          const isNewer = (stat.version && stat.version > currentV) || (prev.timestamp && prev.timestamp !== stat.timestamp);

          window.LAST_PLAN_CHANGE_INFO = {
            timestamp: stat.timestamp,
            version: stat.version || currentV,
            itemsCount: stat.items_count || 0,
            datesCount: stat.dates_count || 0,
            detectedAt: new Date()
          };
          try {
            localStorage.setItem('AJAX_PROPLAN_LAST_PLAN_CHANGE', JSON.stringify(window.LAST_PLAN_CHANGE_INFO));
          } catch(e) {}

          if (isNewer && stat.version && stat.version > currentV) {
            console.log('🔄 Phát hiện bản Data_Mass mới:', stat.version, '-> Đang nạp...');
            await this.reloadDatamassScript(stat.version);
            if (window.DEFAULT_DATAMASS_DATA) {
              window.AppStore.updateLiveCloudData({ dataMass: window.DEFAULT_DATAMASS_DATA });
              this.lastSyncTime = new Date();
              this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
              if (window.showToast) {
                window.showToast('warning', `⚡ CẢNH BÁO: Phát hiện cập nhật Kế Hoạch Data_Mass lúc ${stat.timestamp}! Hệ thống đã tự làm mới dữ liệu.`);
              }
              this.refreshVisibleModulesAfterSync();
            }
          } else if (typeof updateAttentionPlanAlertBox === 'function') {
            updateAttentionPlanAlertBox();
          }

          // Nếu đang mở Web GitHub và bản tĩnh cũ hơn 12 phút (ví dụ máy Local đang tắt), tự kiểm tra live Google Sheets ngầm
          if (isGitHubPages && !this.isSyncing) {
            const parsedStatMs = Date.parse(String(stat.timestamp).replace(' ', 'T') + '+07:00');
            const isStale = !isNaN(parsedStatMs) && (Date.now() - parsedStatMs > 12 * 60 * 1000);
            const lastFb = this._lastCsvFallbackAt || 0;
            if (isStale && (Date.now() - lastFb > 5 * 60 * 1000)) {
              this._lastCsvFallbackAt = Date.now();
              this.fetchLiveData(true);
            }
          }
        }
      } catch (e) {}
    };

    // Kiểm tra ngay khi khởi động
    setTimeout(checkStatus, 1500);
    // Tự động kiểm tra ngầm mỗi 30 giây (trên Local qua /api/status, trên GitHub Pages qua sync_status.json + fallback Google Sheets)
    setInterval(checkStatus, 30000);
  },

  async fetchLiveData(silent = false) {
    if (!silent && window.UserAuth && !window.UserAuth.canSync()) {
      if (window.showToast) window.showToast('warning', '⚠️ Tài khoản ở chế độ Chỉ xem (Viewer). Bạn không có quyền kích hoạt Đồng Bộ Cloud!');
      return;
    }
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusUI('syncing', 'Đang kết nối...');

    try {
      // 1. Ưu tiên gọi Endpoint máy chủ đồng bộ trực tiếp (/api/sync) nếu chạy Web Local
      const isGitHubPages = typeof window !== 'undefined' && window.location && /\.github\.io$/i.test(window.location.hostname || '');
      let syncedViaServer = false;
      if (!isGitHubPages) {
        try {
          const srvRes = await fetch('/api/sync?t=' + Date.now(), { cache: 'no-store' });
          if (srvRes.ok) {
            const sJson = await srvRes.json();
            if (sJson.success) {
              syncedViaServer = true;
              await this.reloadDatamassScript(sJson.version || null);
              if (window.DEFAULT_DATAMASS_DATA) {
                window.AppStore.updateLiveCloudData({ dataMass: window.DEFAULT_DATAMASS_DATA });
              }
              this.refreshVisibleModulesAfterSync();
              this.lastSyncTime = new Date();
              localStorage.setItem('AJAX_PROPLAN_LAST_SYNC', this.lastSyncTime.toISOString());
              this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
              if (!silent && window.showToast) {
                window.showToast('success', `Đã đồng bộ Google Sheets thành công (${sJson.items_count} model trong ${sJson.total_seconds}s)!`);
              }
              return;
            }
          }
        } catch (srvErr) {
          // Máy chủ tĩnh hoặc Cloud không có /api/sync -> Chuyển sang fallback
        }
      } else {
        try {
          const stat = await this.fetchSyncStatusMeta();
          const currentV = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA._v) || 0;
          if (stat && stat.version && stat.version > currentV) {
            await this.reloadDatamassScript(stat.version);
            if (window.DEFAULT_DATAMASS_DATA) {
              window.AppStore.updateLiveCloudData({ dataMass: window.DEFAULT_DATAMASS_DATA });
            }
          }
        } catch (stErr) {}
      }

      // 2. Chế độ Fallback: Tải trực tiếp từ trình duyệt (GitHub Pages / web tĩnh)
      let parsedAsData = null, parsedHtData = null, parsedFttData = null, parsedDataMass = null;
      try {
        const asCSV = await this.fetchSheetCSV(this.config.asGid);
        parsedAsData = this.parseAsFormData(this.parseCSV(asCSV));
      } catch (e) {}
      try {
        const htCSV = await this.fetchSheetCSV(this.config.htGid);
        parsedHtData = this.parseHtFormData(this.parseCSV(htCSV));
      } catch (e) {}
      try {
        const fttCSV = await this.fetchSheetCSV(this.config.fttGid);
        parsedFttData = this.parseFttData(this.parseCSV(fttCSV));
      } catch (e) {}

      // Fetch Data_Mass (Master Production Schedule - Stages, Daily Fact/Plan, Weekly Cycle)
      try {
        if (this.config.dataMassGid) {
          const dataMassCSV = await this.fetchSheetCSV(this.config.dataMassGid);
          const dataMassRows = this.parseCSV(dataMassCSV);
          parsedDataMass = this.parseDataMass(dataMassRows);
        }
      } catch (dmErr) {
        console.warn('Data_Mass sync error:', dmErr);
      }

      if (!parsedDataMass && !parsedAsData && !parsedHtData && !parsedFttData) {
        throw new Error('Không thể tải dữ liệu trực tiếp từ Google Sheets');
      }

      this.lastSyncTime = new Date();
      localStorage.setItem('AJAX_PROPLAN_LAST_SYNC', this.lastSyncTime.toISOString());

      // Save to store (bảo toàn stock1C, manpowerSheet, capacity...)
      window.AppStore.updateLiveCloudData({
        asPlan: parsedAsData,
        htPlan: parsedHtData,
        fttStats: parsedFttData,
        dataMass: parsedDataMass
      });
      this.refreshVisibleModulesAfterSync();

      this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
      if (!silent && window.showToast) {
        const dmCount = parsedDataMass && Array.isArray(parsedDataMass.items) ? parsedDataMass.items.length : 0;
        window.showToast('success', dmCount > 0 ? `Đồng bộ trực tiếp Google Sheets thành công (${dmCount} models)!` : 'Đồng bộ Google Sheets thành công!');
      }
    } catch (err) {
      console.warn('Sync error:', err);
      this.updateStatusUI('offline', 'Dùng dữ liệu lưu tạm');
      if (!silent && window.showToast) {
        window.showToast('warning', 'Không thể kết nối Google Sheets live, đang dùng dữ liệu lưu tạm.');
      }
    } finally {
      this.isSyncing = false;
    }
  },

  // Parse Master Schedule (Data_Mass)
  // Cấu trúc sheet Data_mass theo xác nhận của người dùng:
  // - Hàng số 4 đến 40 (0-indexed 3 đến 39): Kế hoạch nhân lực & Giờ công đoạn (Manpower & Hours)
  // - Từ hàng 41 trở xuống (0-indexed 40+): Kế hoạch sản xuất chi tiết theo Model (Model planning)
  parseDataMass(rows) {
    if (!rows || rows.length < 5) return null;
    const r2 = rows[1];
    const r3 = rows[2] || [];
    if (!r2) return null;

    // 1. Detect week cycles and daily dates
    const weeks = [];
    let currentDays = [];
    for (let c = 13; c < r2.length; c++) {
      const val = (r2[c] || '').trim();
      if (!val) continue;
      if (val.includes('deviation')) {
        const label = val.replace('deviation', '').trim();
        if (currentDays.length >= 5) {
          weeks.push({
            label: label,
            summaryCol: c,
            days: currentDays
          });
        }
        currentDays = [];
      } else if (val.includes('/')) {
        const shift = (r3[c] || '').trim();
        currentDays.push({ date: val, col: c, shift: shift });
      }
    }

    // Group remaining dates after last deviation column (10/22 to 12/6) into standard 7-day cycles (14 shifts each)
    if (currentDays.length > 0) {
      const chunkSize = 14;
      for (let i = 0; i < currentDays.length; i += chunkSize) {
        const chunk = currentDays.slice(i, i + chunkSize);
        const dFirstParts = chunk[0].date.split('/');
        const dLastParts = chunk[chunk.length - 1].date.split('/');
        const pad = (n) => String(n).padStart(2, '0');
        const label = `${pad(dFirstParts[1])}/${pad(dFirstParts[0])}-${pad(dLastParts[1])}/${pad(dLastParts[0])}`;
        weeks.push({
          label: label,
          summaryCol: chunk[chunk.length - 1].col,
          days: chunk
        });
      }
    }

    const targetWeeks = weeks;
    const validDates = new Set();
    targetWeeks.forEach(w => w.days.forEach(d => validDates.add(d.date)));

    // 2. Extract Manpower summary rows: Hàng 4 đến 40 (0-indexed 3 đến 39)
    const manpower = [];
    for (let r_idx = 3; r_idx <= 39 && r_idx < rows.length; r_idx++) {
      const r = rows[r_idx];
      const stage = (r[0] || '').trim();
      const metric = (r[1] || '').trim();
      if (!stage) continue;

      const mpItem = { stage, metric: metric || 'People', daily: {} };
      targetWeeks.forEach(tw => {
        tw.days.forEach(d => {
          const raw = r[d.col] ? r[d.col].trim().replace(/,/g, '') : '';
          const num = parseFloat(raw) || 0;
          if (num !== 0) {
            const rounded = Math.round(num * 10) / 10;
            if (d.shift === 'Day' || d.shift === 'Night') {
              mpItem.daily[`${d.date}_${d.shift}`] = rounded;
              mpItem.daily[d.date] = Math.round(((mpItem.daily[d.date] || 0) + rounded) * 10) / 10;
            } else {
              mpItem.daily[d.date] = rounded;
              mpItem.daily[`${d.date}_Day`] = Math.round(rounded * 0.6 * 10) / 10;
              mpItem.daily[`${d.date}_Night`] = Math.round((rounded - Math.round(rounded * 0.6 * 10) / 10) * 10) / 10;
            }
          }
        });
      });
      manpower.push(mpItem);
    }

    // 3. Extract Model Item rows: Từ hàng 41 trở xuống (0-indexed 40+)
    const itemsDict = {};
    for (let r_idx = 40; r_idx < rows.length; r_idx++) {
      const r = rows[r_idx];
      if (r.length < 8) continue;
      let stage, pname, pnameEng, specCode, fpArticule, lastStep, model, pkey, normKey, normName, norm;
      const col8Key = (r[8] || '').trim().toLowerCase();
      if (r.length > 8 && (col8Key === 'plan' || col8Key === 'fact')) {
        stage = (r[0] || '').trim();
        pname = (r[1] || '').trim();
        pnameEng = (r[2] || '').trim();
        specCode = (r[3] || '').trim();
        fpArticule = (r[5] || '').trim();
        lastStep = (r[6] || '').trim();
        model = (r[7] || '').trim();
        pkey = col8Key;
        normKey = (r[9] || '').trim();
        normName = (r[10] || '').trim();
        norm = parseFloat((r[11] || '').trim().replace(/,/g, '')) || 0;
      } else {
        stage = (r[0] || '').trim();
        pname = (r[1] || '').trim();
        pnameEng = (r[2] || '').trim();
        specCode = (r[3] || '').trim();
        fpArticule = (r[4] || '').trim();
        lastStep = (r[5] || '').trim();
        model = (r[6] || '').trim();
        pkey = (r[7] || '').trim().toLowerCase();
        normKey = (r[8] || '').trim();
        normName = (r[9] || '').trim();
        norm = parseFloat((r[10] || '').trim().replace(/,/g, '')) || 0;
      }

      if (!stage || !pname || (pkey !== 'plan' && pkey !== 'fact')) continue;
      if (pname.toLowerCase() === 'people' || pname.toLowerCase() === 'hours') continue;

      const normKeyShort = normKey.includes(' - ') ? normKey.split(' - ').pop().trim() : normKey;
      const key = `${stage}|||${model}|||${pname}`;
      if (!itemsDict[key]) {
        itemsDict[key] = {
          stage,
          model,
          productName1C: pname,
          productNameEnglish: pnameEng,
          specCode,
          fpArticule,
          normKey,
          normKeyShort,
          lastStep,
          norm,
          normName,
          plan: {},
          fact: {},
          planDay: {},
          planNight: {},
          factDay: {},
          factNight: {}
        };
      } else {
        if (lastStep && !itemsDict[key].lastStep) itemsDict[key].lastStep = lastStep;
        if (normKey && !itemsDict[key].normKey) {
          itemsDict[key].normKey = normKey;
          itemsDict[key].normKeyShort = normKeyShort;
        }
      }

      targetWeeks.forEach(tw => {
        tw.days.forEach(d => {
          const raw = r[d.col] ? r[d.col].trim().replace(/,/g, '') : '';
          const num = parseFloat(raw) || 0;
          if (num > 0) {
            const rounded = Math.round(num);
            if (d.shift === 'Day') {
              itemsDict[key][`${pkey}Day`][d.date] = (itemsDict[key][`${pkey}Day`][d.date] || 0) + rounded;
              itemsDict[key][pkey][d.date] = (itemsDict[key][pkey][d.date] || 0) + rounded;
            } else if (d.shift === 'Night') {
              itemsDict[key][`${pkey}Night`][d.date] = (itemsDict[key][`${pkey}Night`][d.date] || 0) + rounded;
              itemsDict[key][pkey][d.date] = (itemsDict[key][pkey][d.date] || 0) + rounded;
            } else {
              itemsDict[key][pkey][d.date] = (itemsDict[key][pkey][d.date] || 0) + rounded;
              const dVal = Math.round(rounded * 0.6);
              itemsDict[key][`${pkey}Day`][d.date] = (itemsDict[key][`${pkey}Day`][d.date] || 0) + dVal;
              itemsDict[key][`${pkey}Night`][d.date] = (itemsDict[key][`${pkey}Night`][d.date] || 0) + (rounded - dVal);
            }
          }
        });
      });
    }

    const items = Object.values(itemsDict).filter(it => 
      Object.keys(it.plan).length > 0 || Object.keys(it.fact).length > 0
    );

    const dtNow = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const vStamp = Number(`${dtNow.getFullYear()}${pad2(dtNow.getMonth() + 1)}${pad2(dtNow.getDate())}${pad2(dtNow.getHours())}${pad2(dtNow.getMinutes())}`);
    return {
      dates: Array.from(validDates),
      weeks: targetWeeks,
      manpower,
      items,
      _v: vStamp,
      _fromBrowserCsv: true
    };
  },

  // Parse Assembly Planning Form (As Form)
  parseAsFormData(rows) {
    // Look for row 13/14 where headers are
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      if (rows[i].some(c => c && (c.includes('Plan Qty') || c.includes('product name 1С')))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) headerIdx = 12;

    const items = [];
    for (let i = headerIdx + 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      // Stop if reached summary / footer
      if (r[0] && r[0].includes('Khoá Hàng')) break;
      if (r[1] && (r[1].includes('#N/A') || r[1].trim() === '')) continue;

      const productName1C = r[1] || '';
      const normingGroup = r[2] || '';
      const modelName = r[3] || '';
      const planQty = parseFloat((r[4] || '0').replace(/,/g, '')) || 0;
      const factQty = parseFloat((r[5] || '0').replace(/,/g, '')) || 0;
      const gapQty = parseFloat((r[6] || '0').replace(/,/g, '')) || (factQty - planQty);
      const ctNorm = parseFloat(r[7]) || 5.0; // cycle time in seconds
      const hoursPlan = parseFloat(r[8]) || (Math.abs(gapQty) * ctNorm / 3600);
      const assignedLine = (r[9] || '').trim();
      const rawProd = r[10] || '';
      let prodPct = parseFloat(rawProd.replace('%', '')) || 0;

      // Auto-query matrix if productivity is missing or line changed
      if (assignedLine && prodPct === 0) {
        prodPct = window.MatrixService ? window.MatrixService.getProductivity(normingGroup, assignedLine) || 100 : 100;
      }

      const hoursActual = prodPct > 0 ? (hoursPlan / (prodPct / 100)) : hoursPlan;
      const totalPlan = parseFloat((r[12] || '0').replace(/,/g, '')) || Math.abs(gapQty);

      items.push({
        id: `AS-${i}`,
        productName1C,
        normingGroup,
        modelName,
        planQty,
        factQty,
        gapQty,
        ctNorm,
        hoursPlan: Math.round(hoursPlan * 100) / 100,
        assignedLine,
        productivity: prodPct,
        hoursActual: Math.round(hoursActual * 100) / 100,
        totalPlan
      });
    }
    return items;
  },

  // Parse Hoan Thien Form (HT Form)
  parseHtFormData(rows) {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      if (rows[i].some(c => c && (c.includes('Plan Qty') || c.includes('Số Lượng Test Block')))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 12;

    const items = [];
    for (let i = headerIdx + 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;
      if (r[1] && (r[1].includes('#N/A') || r[1].trim() === '')) continue;

      const productName1C = r[1] || '';
      const board = r[2] || '';
      const modelName = r[3] || '';
      const planQty = parseFloat((r[4] || '0').replace(/,/g, '')) || 0;
      const factQty = parseFloat((r[5] || '0').replace(/,/g, '')) || 0;
      const gapQty = parseFloat((r[6] || '0').replace(/,/g, '')) || 0;
      const ctNorm = parseFloat(r[7]) || 0;
      const hoursPlan = parseFloat(r[8]) || 0;
      const ctActual = parseFloat(r[9]) || ctNorm;
      const hoursActual = parseFloat(r[10]) || hoursPlan;
      const peopleRequired = parseFloat(r[11]) || 0;
      const testBlocks = parseFloat(r[12]) || 0;
      const targetOutputDay = parseFloat((r[17] || '0').replace(/,/g, '')) || 0;
      const targetOutputNight = parseFloat((r[22] || r[21] || '0').replace(/,/g, '')) || 0;

      items.push({
        id: `HT-${i}`,
        productName1C,
        board,
        modelName,
        planQty,
        factQty,
        gapQty,
        ctNorm,
        hoursPlan: Math.round(hoursPlan * 100) / 100,
        ctActual,
        hoursActual: Math.round(hoursActual * 100) / 100,
        peopleRequired,
        testBlocks,
        targetOutputDay,
        targetOutputNight
      });
    }
    return items;
  },

  // Parse FTT data
  parseFttData(rows) {
    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 7) continue;
      // Skip empty separator rows
      if (!r[1] || r[1].trim() === '' || r[1] === 'Product name') continue;

      const productName = r[1] || '';
      const mappedModel = r[2] || '';
      const allDevices = parseFloat((r[3] || '0').replace(/,/g, '')) || 0;
      const ftt = parseFloat((r[4] || '0').replace(/,/g, '')) || 0;
      const fttPct = r[5] || '0%';
      const allTest = parseFloat((r[6] || '0').replace(/,/g, '')) || 0;
      const finOK = parseFloat((r[7] || '0').replace(/,/g, '')) || 0;
      const finNOK = parseFloat((r[8] || '0').replace(/,/g, '')) || 0;
      const retest = parseFloat((r[9] || '0').replace(/,/g, '')) || 0;
      const retestPct = r[10] || '0%';

      list.push({
        productName,
        mappedModel,
        allDevices,
        ftt,
        fttPct,
        allTest,
        finOK,
        finNOK,
        retest,
        retestPct
      });
    }
    return list;
  },

  updateStatusUI(state, text) {
    const dot = document.getElementById('cloudStatusDot');
    const label = document.getElementById('cloudStatusText');
    const badge = document.getElementById('headerSyncBadge');
    if (dot) {
      dot.className = `status-dot ${state === 'syncing' ? 'syncing' : state === 'offline' ? 'error' : ''}`;
    }
    if (label) label.textContent = text;
    if (badge) {
      badge.innerHTML = `<span class="status-dot ${state === 'syncing' ? 'syncing' : ''}"></span> ${text}`;
    }
  },

  formatTime(d) {
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
};
