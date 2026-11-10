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
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;

    // Try direct export first, then gviz, then CORS proxy if needed
    try {
      const res = await fetch(directUrl);
      if (res.ok) return await res.text();
    } catch(e) {}

    try {
      const res = await fetch(gvizUrl);
      if (res.ok) return await res.text();
    } catch(e) {}

    // Proxy fallback
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) return await res.text();
    } catch(e) {}

    throw new Error(`Không thể kết nối tải sheet GID: ${gid}`);
  },

  reloadScriptFile(basePath) {
    return new Promise((resolve) => {
      const ts = Date.now();
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

  async reloadDatamassScript() {
    const results = await Promise.all([
      this.reloadScriptFile('js/datamass-data.js'),
      this.reloadScriptFile('js/inventory-1c-data.js'),
      this.reloadScriptFile('js/bom-data.js'),
      this.reloadScriptFile('js/mass-history-data.js'),
      this.reloadScriptFile('js/kpi-data.js')
    ]);
    return results[0];
  },

  startStatusWatcher() {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const stat = await res.json();
          const currentV = (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA._v) || 0;
          
          if (stat.timestamp) {
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
              console.log('🔄 Máy chủ đã cập nhật bản Data_Mass mới:', stat.version, '-> Đang nạp...');
              await this.reloadDatamassScript();
              if (window.DEFAULT_DATAMASS_DATA) {
                window.AppStore.updateLiveCloudData({ dataMass: window.DEFAULT_DATAMASS_DATA });
                this.lastSyncTime = new Date();
                this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
                if (window.showToast) {
                  window.showToast('warning', `⚡ CẢNH BÁO: Phát hiện thay đổi Kế Hoạch Data_Mass lúc ${stat.timestamp}! Hệ thống đã cập nhật tự động.`);
                }
                if (typeof renderAttentionPointsSection === 'function') {
                  renderAttentionPointsSection(window.__LATEST_SCHEDULE__);
                }
              }
            } else if (typeof updateAttentionPlanAlertBox === 'function') {
              updateAttentionPlanAlertBox();
            }
          }
        }
      } catch (e) {}
    };

    // Kiểm tra ngay khi khởi động
    setTimeout(checkStatus, 1500);
    // Tự động kiểm tra máy chủ ngầm mỗi 30 giây xem có bản Data_Mass mới hơn không
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
      // 1. Ưu tiên gọi Endpoint máy chủ đồng bộ trực tiếp (/api/sync)
      let syncedViaServer = false;
      try {
        const srvRes = await fetch('/api/sync');
        if (srvRes.ok) {
          const sJson = await srvRes.json();
          if (sJson.success) {
            syncedViaServer = true;
            await this.reloadDatamassScript();
            if (window.DEFAULT_DATAMASS_DATA) {
              window.AppStore.updateLiveCloudData({ dataMass: window.DEFAULT_DATAMASS_DATA });
            }
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

      // 2. Chế độ Fallback: Tải trực tiếp từ trình duyệt (khi chạy Cloud Netlify/Vercel)
      // Fetch As Form (Assembly)
      const asCSV = await this.fetchSheetCSV(this.config.asGid);
      const asRows = this.parseCSV(asCSV);
      const parsedAsData = this.parseAsFormData(asRows);

      // Fetch HT Form (Hoan Thien)
      const htCSV = await this.fetchSheetCSV(this.config.htGid);
      const htRows = this.parseCSV(htCSV);
      const parsedHtData = this.parseHtFormData(htRows);

      // Fetch FTT (Quality Testing)
      const fttCSV = await this.fetchSheetCSV(this.config.fttGid);
      const fttRows = this.parseCSV(fttCSV);
      const parsedFttData = this.parseFttData(fttRows);

      // Fetch Data_Mass (Master Production Schedule - Stages, Daily Fact/Plan, Weekly Cycle)
      let parsedDataMass = null;
      try {
        if (this.config.dataMassGid) {
          const dataMassCSV = await this.fetchSheetCSV(this.config.dataMassGid);
          const dataMassRows = this.parseCSV(dataMassCSV);
          parsedDataMass = this.parseDataMass(dataMassRows);
        }
      } catch (dmErr) {
        console.warn('Data_Mass sync error:', dmErr);
      }

      this.lastSyncTime = new Date();
      localStorage.setItem('AJAX_PROPLAN_LAST_SYNC', this.lastSyncTime.toISOString());

      // Save to store
      window.AppStore.updateLiveCloudData({
        asPlan: parsedAsData,
        htPlan: parsedHtData,
        fttStats: parsedFttData,
        dataMass: parsedDataMass
      });

      this.updateStatusUI('online', `Đã đồng bộ ${this.formatTime(this.lastSyncTime)}`);
      if (!silent && window.showToast) {
        window.showToast('success', 'Đồng bộ Google Sheets thành công!');
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
      const stage = (r[0] || '').trim();
      const pname = (r[1] || '').trim();
      const model = (r[6] || '').trim();
      const pkey = (r[7] || '').trim().toLowerCase();
      const normName = (r[9] || '').trim();
      const norm = parseFloat((r[10] || '').trim().replace(/,/g, '')) || 0;

      if (!stage || !pname || (pkey !== 'plan' && pkey !== 'fact')) continue;
      if (pname.toLowerCase() === 'people' || pname.toLowerCase() === 'hours') continue;

      const key = `${stage}|||${model}|||${pname}`;
      if (!itemsDict[key]) {
        itemsDict[key] = {
          stage,
          model,
          productName1C: pname,
          norm,
          normName,
          plan: {},
          fact: {},
          planDay: {},
          planNight: {},
          factDay: {},
          factNight: {}
        };
      }

      targetWeeks.forEach(tw => {
        tw.days.forEach(d => {
          const raw = r[d.col] ? r[d.col].trim().replace(/,/g, '') : '';
          const num = parseFloat(raw) || 0;
          if (num > 0) {
            const rounded = Math.round(num);
            if (d.shift === 'Day') {
              itemsDict[key][`${pkey}Day`][d.date] = rounded;
              itemsDict[key][pkey][d.date] = (itemsDict[key][pkey][d.date] || 0) + rounded;
            } else if (d.shift === 'Night') {
              itemsDict[key][`${pkey}Night`][d.date] = rounded;
              itemsDict[key][pkey][d.date] = (itemsDict[key][pkey][d.date] || 0) + rounded;
            } else {
              itemsDict[key][pkey][d.date] = rounded;
              itemsDict[key][`${pkey}Day`][d.date] = Math.round(rounded * 0.6);
              itemsDict[key][`${pkey}Night`][d.date] = rounded - Math.round(rounded * 0.6);
            }
          }
        });
      });
    }

    const items = Object.values(itemsDict).filter(it => 
      Object.keys(it.plan).length > 0 || Object.keys(it.fact).length > 0
    );

    return {
      dates: Array.from(validDates),
      weeks: targetWeeks,
      manpower,
      items
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
