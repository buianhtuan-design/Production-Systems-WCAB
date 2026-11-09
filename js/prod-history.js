/**
 * =========================================================================
 * AJAX PROPLAN MES - TRA CỨU LỊCH SỬ SẢN XUẤT (PROD HISTORY) MODULE
 * =========================================================================
 * Mục đích:
 * - So sánh dữ liệu Fact và đối chiếu Mã Model 1C giữa 2 CÔNG ĐOẠN BẤT KỲ:
 *     PKG (Đóng gói thành phẩm) vs ASSEMBLY (Bán thành phẩm lắp ráp)
 *     ASSEMBLY vs HARD TEST (Kiểm tra mạch)
 *     HARD TEST vs DIP (Cắm linh kiện)
 *     PKG vs DIP (Thành phẩm vs Đầu chuỗi)
 * - TỰ ĐỘNG GỘP CÁC MÃ BIẾN THỂ TỪ 1 MÃ BÁN THÀNH PHẨM GỐC:
 *     Ví dụ: 1 mã tại Assembly "Ajax KeyPad TouchScreen (9AU) white (напівфабрикат)"
 *            biến đổi thành 2 mã ở PKG:
 *            1. "Ajax KeyPad TouchScreen (9AU) white клавіатура"
 *            2. "Ajax KeyPad TouchScreen (9AU) BR white клавіатура"
 *     -> Tự động gộp 2 mã PKG này lại để tính Tổng Fact PKG và so sánh chính xác với Fact Assembly!
 * - Hỗ trợ lọc theo khoảng ngày (Từ ngày ... Đến ngày ...) hoặc xem toàn bộ
 * - Sao chép dữ liệu chuẩn cho Google Sheets và Xuất file CSV UTF-8
 * =========================================================================
 */

(function() {
  'use strict';

  /**
   * Lấy ngày hiện tại dạng ISO YYYY-MM-DD
   */
  function getTodayIsoString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Khởi tạo State lưu trữ của tab Tra Cứu Lịch Sử Sản Xuất
  // Thời gian mặc định: từ 22/09/2025 đến ngày hiện tại
  window.ProdHistoryStore = {
    stageA: 'PKG',          // Công đoạn 1 (mặc định PKG)
    stageB: 'ASSEMBLY',     // Công đoạn 2 (mặc định ASSEMBLY)
    search: '',
    modelFilter: 'ALL',
    gapFilter: 'ALL',       // 'ALL', 'HAS_GAP', 'BALANCED', 'PKG_GREATER', 'PKG_LESS', 'STAGE_A_GREATER', 'STAGE_B_GREATER'
    fromDate: '2025-09-22', // Mặc định từ 22/09/2025 (khởi đầu tập dữ liệu DataMass)
    toDate: getTodayIsoString(), // Đến ngày hiện tại
    page: 1,
    pageSize: 50,
    sortBy: 'model',        // 'model', 'factA', 'factB', 'gap'
    sortDir: 'asc'
  };

  // Cấu hình 4 công đoạn chính và cấp độ trong chuỗi sản xuất (1 = Đầu chuỗi, 4 = Cuối chuỗi)
  const STAGE_CONFIG = {
    'DIP': {
      label: 'DIP (Cắm Linh Kiện)',
      shortLabel: 'DIP',
      rank: 1,
      stages: ['DIP', 'DIP. SELECTIV', 'DIP. SELECTIV.PRE', 'DIP. SELECTIV.POST'],
      color: '#06b6d4',
      bgHeader: 'rgba(6, 182, 212, 0.12)',
      borderHeader: '#06b6d4'
    },
    'HARD TEST': {
      label: 'HARD TEST (Kiểm Tra Mạch)',
      shortLabel: 'HARD TEST',
      rank: 2,
      stages: ['HARD TEST'],
      color: '#3b82f6',
      bgHeader: 'rgba(59, 130, 246, 0.12)',
      borderHeader: '#3b82f6'
    },
    'ASSEMBLY': {
      label: 'ASSEMBLY (Lắp Ráp)',
      shortLabel: 'ASSEMBLY',
      rank: 3,
      stages: ['ASSEMBLY'],
      color: '#a855f7',
      bgHeader: 'rgba(168, 85, 247, 0.12)',
      borderHeader: '#a855f7'
    },
    'PKG': {
      label: 'PKG (Đóng Gói)',
      shortLabel: 'PKG',
      rank: 4,
      stages: ['PKG', 'COM PKG', 'COM PKG AUTO'],
      color: '#f59e0b',
      bgHeader: 'rgba(245, 158, 11, 0.12)',
      borderHeader: '#f59e0b'
    }
  };

  /**
   * Helper parse ngày từ key trong DataMass (dạng 'M/D/YYYY', ví dụ '9/22/2025') thành timestamp
   */
  function parseDateKeyToTime(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const m = parseInt(parts[0], 10) - 1; // 0-indexed month
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    // Đặt 12:00:00 trưa để tuyệt đối an toàn khỏi lệch múi giờ hoặc DST
    return new Date(y, m, d, 12, 0, 0).getTime();
  }

  /**
   * Helper parse bất kỳ định dạng ngày nào (ISO 'YYYY-MM-DD', dot 'DD.MM.YYYY', slash 'DD/MM/YYYY')
   */
  function parseAnyDateToTime(dateVal, isEndOfDay) {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') return dateVal;
    if (dateVal instanceof Date) return dateVal.getTime();
    if (typeof dateVal !== 'string') return null;

    const s = dateVal.trim();
    if (!s) return null;

    let y, m, d;

    // 1. ISO format: YYYY-MM-DD (từ input type="date")
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const parts = s.split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    }
    // 2. Dot format: DD.MM.YYYY (ví dụ: 01.09.2025, 28.10.2026)
    else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
      const parts = s.split('.');
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    }
    // 3. Slash format: DD/MM/YYYY hoặc M/D/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const parts = s.split('/');
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p0 > 12) {
        // Chắc chắn là DD/MM/YYYY
        d = p0;
        m = p1 - 1;
        y = p2;
      } else if (p1 > 12) {
        // M/D/YYYY
        m = p0 - 1;
        d = p1;
        y = p2;
      } else {
        d = p0;
        m = p1 - 1;
        y = p2;
      }
    } else {
      const p = Date.parse(s);
      if (!isNaN(p)) return p;
      return null;
    }

    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    const dt = new Date(y, m, d);
    if (isEndOfDay) {
      dt.setHours(23, 59, 59, 999);
    } else {
      dt.setHours(0, 0, 0, 0);
    }
    return dt.getTime();
  }

  /**
   * Helper chuyển chuỗi ngày bất kỳ sang định dạng YYYY-MM-DD chuẩn cho input type="date"
   */
  function toHtmlDateValue(val) {
    if (!val || typeof val !== 'string') return '';
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
      const p = s.split('.');
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const p = s.split('/');
      if (parseInt(p[0], 10) > 12) {
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      } else {
        return `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
      }
    }
    return '';
  }

  /**
   * Chuẩn hóa tên Bán thành phẩm Assembly để liên kết chính xác với BOM Plan và DataMass
   * (Ví dụ: golden sample, semi-finished product -> напівфабрикат)
   */
  function normalizeSfgAssyName(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim()
      .replace(/\s*\(golden sample\)/gi, ' (напівфабрикат)')
      .replace(/\s*\(semi-finished product\)/gi, ' (напівфабрикат)');
  }

  /**
   * Tính tổng sản lượng Fact của một item DataMass theo Khoảng thời gian
   */
  function calculateItemFact(item, fromDate, toDate) {
    if (!item) return 0;
    const factObj = item.fact;
    if (typeof factObj === 'number') return factObj;
    if (!factObj || typeof factObj !== 'object') return 0;

    // Nếu không nhập cả fromDate và toDate: tính tổng tất cả các ngày
    if (!fromDate && !toDate) {
      let sum = 0;
      for (const k in factObj) {
        if (Object.prototype.hasOwnProperty.call(factObj, k)) {
          const val = Number(factObj[k]);
          if (!isNaN(val)) sum += val;
        }
      }
      return sum;
    }

    const fromTime = fromDate ? parseAnyDateToTime(fromDate, false) : -Infinity;
    const toTime = toDate ? parseAnyDateToTime(toDate, true) : Infinity;

    let sum = 0;
    for (const k in factObj) {
      if (Object.prototype.hasOwnProperty.call(factObj, k)) {
        const t = parseDateKeyToTime(k);
        if (t !== null && t >= fromTime && t <= toTime) {
          const val = Number(factObj[k]);
          if (!isNaN(val)) sum += val;
        }
      }
    }
    return sum;
  }

  /**
   * Chuẩn hóa tên model cơ sở để nhóm và lọc
   */
  function cleanModelGroup(rawModel, rawProductName) {
    if (rawModel && typeof rawModel === 'string' && rawModel.trim()) {
      return rawModel.trim();
    }
    const name = String(rawProductName || '');
    const m = name.match(/Ajax\s+([A-Za-z0-9\-+]+)/i);
    if (m && m[1]) return m[1];
    return 'Khác';
  }

  /**
   * Xây dựng dữ liệu So Sánh 2 Công Đoạn với tính năng TỰ ĐỘNG GỘP (Group By Base SFG)
   * ĐẢM BẢO CHÍNH XÁC TUYỆT ĐỐI THEO SHEET DATA MASS:
   * - Phân tách độc lập 4 nhóm công đoạn: PKG, ASSEMBLY, HARD TEST, DIP
   * - Tuyệt đối không cộng gộp chéo từ các stage khác như LONG TEST, QC, MB
   */
  window.buildProdHistoryData = function() {
    const rawData = window.AppStore?.dataMass || window.DEFAULT_DATAMASS_DATA;
    if (!rawData || !Array.isArray(rawData.items)) {
      return { rows: [], stats: {}, models: [] };
    }

    const bomMaster = window.BOM_MASTER_DATA || {};
    const allItems = rawData.items;
    const store = window.ProdHistoryStore;
    const stageA = store.stageA || 'PKG';
    const stageB = store.stageB || 'ASSEMBLY';
    const fromDate = store.fromDate || '';
    const toDate = store.toDate || '';

    // Phân loại DataMass theo 4 công đoạn độc lập tuyệt đối
    const itemsByStage = {
      'DIP': [],
      'HARD TEST': [],
      'ASSEMBLY': [],
      'PKG': []
    };

    // Bản đồ tra cứu sản phẩm độc lập cho từng nhóm stage:
    // dmByStageGroup[stageKey] -> Map(productName1C -> Array of items)
    const dmByStageGroup = {
      'DIP': new Map(),
      'HARD TEST': new Map(),
      'ASSEMBLY': new Map(),
      'PKG': new Map()
    };

    const byNorm = {
      'DIP': new Map(),
      'HARD TEST': new Map(),
      'ASSEMBLY': new Map(),
      'PKG': new Map()
    };

    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      const stage = (it.stage || '').toUpperCase();
      const pName = (it.productName1C || '').trim();
      const norm = (it.normKeyShort || '').trim();

      for (const stKey in STAGE_CONFIG) {
        if (STAGE_CONFIG[stKey].stages.includes(stage)) {
          // Mã Model 1C của ASSEMBLY mặc định có phần "(напівфабрикат)" ở cuối
          // Tuyệt đối không nhận các bo mạch trung gian/DIP (như Ajax, MCO.001.OVB.001v8_DIP)
          if (stKey === 'ASSEMBLY' && !pName.includes('напівфабрикат') && !pName.toLowerCase().includes('semi-finished')) {
            break;
          }
          itemsByStage[stKey].push(it);
          if (pName) {
            if (!dmByStageGroup[stKey].has(pName)) dmByStageGroup[stKey].set(pName, []);
            dmByStageGroup[stKey].get(pName).push(it);
          }
          if (norm) {
            if (!byNorm[stKey].has(norm)) byNorm[stKey].set(norm, []);
            byNorm[stKey].get(norm).push(it);
          }
          break;
        }
      }
    }

    // Helper tính Fact chính xác chỉ trong nhóm Stage được chỉ định
    function getStageProductFact(stKey, prodName) {
      if (!stKey || !prodName) return 0;
      const list = dmByStageGroup[stKey]?.get(prodName) || [];
      let total = 0;
      for (let i = 0; i < list.length; i++) {
        total += calculateItemFact(list[i], fromDate, toDate);
      }
      return total;
    }

    // Xây dựng bản đồ quan hệ đa chiều từ BOM Plan:
    // 1. Assembly SFG -> Danh sách PKG sử dụng nó
    const assyToPkgsMap = new Map();
    // 2. Hard Test SFG -> Danh sách Assembly sử dụng nó
    const htToAssyMap = new Map();
    // 3. DIP SFG -> Danh sách Hard Test sử dụng nó
    const dipToHtMap = new Map();

    for (const code in bomMaster) {
      if (Object.prototype.hasOwnProperty.call(bomMaster, code)) {
        const b = bomMaster[code];
        const pName = (b.productName || '').trim();
        const stage = (b.stage || '').toUpperCase();
        const proc = (b.process || '').toUpperCase();
        const mats = b.materials || [];

        // Nếu sản phẩm b là PKG -> duyệt materials tìm Assembly SFG
        if (stage === 'PKG' || proc.includes('PKG')) {
          for (const m of mats) {
            const mname = (m.nomenclature || '').trim();
            if (mname.toLowerCase().includes('magnet')) continue; // Bỏ qua nam châm phụ
            const mst = (m.stage || '').toUpperCase();
            const mproc = (m.process || '').toUpperCase();
            if (
              mname.includes('напівфабрикат') ||
              mname.toLowerCase().includes('semi-finished') ||
              mname.toLowerCase().includes('golden sample') ||
              mst === 'ASSEMBLY' ||
              mproc.includes('ASSEMBLY')
            ) {
              const mnameNorm = normalizeSfgAssyName(mname);
              if (!assyToPkgsMap.has(mnameNorm)) assyToPkgsMap.set(mnameNorm, new Set());
              assyToPkgsMap.get(mnameNorm).add(pName);
            }
          }
        }

        // Nếu sản phẩm b là Assembly -> duyệt materials tìm Hard Test SFG
        if (stage === 'ASSEMBLY' || proc.includes('ASSEMBLY')) {
          for (const m of mats) {
            const mname = (m.nomenclature || '').trim();
            if (mname.includes('_HRD') || m.process === 'HARD TEST' || (m.stage || '').toUpperCase().includes('HARD TEST')) {
              if (!htToAssyMap.has(mname)) htToAssyMap.set(mname, new Set());
              htToAssyMap.get(mname).add(pName);
            }
          }
        }

        // Nếu sản phẩm b là Hard Test -> duyệt materials tìm DIP SFG
        if (stage === 'HARD TEST' || proc.includes('HARD TEST')) {
          for (const m of mats) {
            const mname = (m.nomenclature || '').trim();
            if (mname.includes('_DIP') || m.process === 'DIP' || (m.stage || '').toUpperCase().includes('DIP')) {
              if (!dipToHtMap.has(mname)) dipToHtMap.set(mname, new Set());
              dipToHtMap.get(mname).add(pName);
            }
          }
        }
      }
    }

    // Xác định vai trò của Stage A và Stage B:
    const rankA = STAGE_CONFIG[stageA].rank;
    const rankB = STAGE_CONFIG[stageB].rank;

    // Trường hợp 1: So sánh PKG (rank 4) vs ASSEMBLY (rank 3) (hoặc ngược lại)
    const rows = [];
    const modelSet = new Set();

    if ((stageA === 'PKG' && stageB === 'ASSEMBLY') || (stageA === 'ASSEMBLY' && stageB === 'PKG')) {
      // Nhóm theo Bán Thành Phẩm Assembly
      const uniqueAssy = [];
      const seenAssy = new Set();
      const assyPool = itemsByStage['ASSEMBLY'];

      for (let i = 0; i < assyPool.length; i++) {
        const a = assyPool[i];
        const nameA = (a.productName1C || '').trim();
        if (!nameA || seenAssy.has(nameA)) continue;
        // Mã Model 1C của ASSEMBLY mặc định có phần "(напівфабрикат)" ở cuối
        if (!nameA.includes('напівфабрикат') && !nameA.toLowerCase().includes('semi-finished')) continue;
        seenAssy.add(nameA);
        uniqueAssy.push(a);
      }

      for (let i = 0; i < uniqueAssy.length; i++) {
        const assyItem = uniqueAssy[i];
        const assyName = assyItem.productName1C.trim();
        const model = cleanModelGroup(assyItem.model, assyName);
        if (model) modelSet.add(model);
        const normKeyShort = (assyItem.normKeyShort || '').trim();

        // 1. Tính Fact của mã BTP Assembly (chỉ lấy đúng trong nhóm ASSEMBLY)
        const factAssy = getStageProductFact('ASSEMBLY', assyName);

        // 2. Tìm tất cả các mã PKG được biến đổi từ mã Assembly này
        let matchedPkgNames = Array.from(assyToPkgsMap.get(assyName) || []);

        // Nếu BOM chưa có liên kết trực tiếp, tra cứu fallback theo normKeyShort / model + màu sắc & tần số/khu vực
        if (matchedPkgNames.length === 0) {
          const aLower = assyName.toLowerCase();
          const isWhite = aLower.includes('white');
          const isBlack = aLower.includes('black');
          const isWl = aLower.includes('wl standard') || aLower.includes(' wl ') || aLower.includes('wl ');

          // Trích xuất mã tần số/khu vực như 8eu, 8in, 9na, 9au, 8ma, 8cl, 8tr, 9sa, eu
          const tokens = [];
          const mTokens = aLower.match(/\b(8eu|8in|9na|9au|8ma|8cl|8tr|9sa|eu)\b/g);
          if (mTokens) {
            for (let t = 0; t < mTokens.length; t++) tokens.push(mTokens[t]);
          }

          const candidates = normKeyShort ? (byNorm['PKG'].get(normKeyShort) || []) : [];
          const pool = candidates.length > 0 ? candidates : itemsByStage['PKG'].filter(p => (p.model || '').toLowerCase() === model.toLowerCase());

          const filtered = pool.filter(p => {
            const pName = (p.productName1C || '').toLowerCase();
            if (isWhite && !pName.includes('white')) return false;
            if (isBlack && !pName.includes('black')) return false;

            // Khớp chính xác khu vực / tần số nếu Assembly có quy định
            if (tokens.length > 0) {
              let hasToken = false;
              for (let t = 0; t < tokens.length; t++) {
                const tok = tokens[t];
                if (tok === 'eu' || tok === '8eu') {
                  if (pName.includes('8eu') || pName.includes(' eu')) hasToken = true;
                } else if (pName.includes(tok)) {
                  hasToken = true;
                }
              }
              if (!hasToken) return false;
            } else {
              // Nếu Assembly không có 8in/8ma/9na thì PKG con cũng không nên lẫn các mã thị trường đặc thù
              if (/\b(8in|8ma|9na|9au|8cl|8tr|9sa)\b/.test(pName)) return false;
            }

            // Kiểm tra biến thể WL Standard
            if (isWl) {
              if (!pName.includes('wl standard') && !pName.includes('wl')) return false;
            } else {
              if (pName.includes('wl standard') || pName.includes('kale guvenlik')) return false;
            }

            return true;
          });

          const chosen = filtered.length > 0 ? filtered : pool;
          const setPkg = new Set();
          for (const c of chosen) {
            setPkg.add(c.productName1C.trim());
          }
          matchedPkgNames = Array.from(setPkg);
        }

        // 3. Tính Fact cho từng mã PKG con và tổng Fact PKG gộp (chỉ lấy đúng trong nhóm PKG)
        const pkgDetails = [];
        let totalFactPkg = 0;

        for (const pName of matchedPkgNames) {
          const pFact = getStageProductFact('PKG', pName);
          totalFactPkg += pFact;
          pkgDetails.push({
            name: pName,
            fact: pFact
          });
        }

        // Gán vào cột A và B theo lựa chọn người dùng
        const isPkgStageA = (stageA === 'PKG');
        const factA = isPkgStageA ? totalFactPkg : factAssy;
        const factB = isPkgStageA ? factAssy : totalFactPkg;
        const nameA = isPkgStageA ? (pkgDetails.length > 0 ? pkgDetails[0].name : '(Chưa có mã PKG tương ứng)') : assyName;
        const nameB = isPkgStageA ? assyName : (pkgDetails.length > 0 ? pkgDetails[0].name : '(Chưa có mã PKG tương ứng)');

        const gap = factA - factB;
        const ratio = factB > 0 ? (factA / factB) * 100 : (factA > 0 ? 100 : 0);
        const pkgExcess = isPkgStageA ? (factA - factB) : (factB - factA);

        let statusText = 'Cân bằng';
        let statusClass = 'badge-flow-balanced';
        if (factA === 0 && factB === 0) {
          statusText = '⚪ Chưa có Fact';
          statusClass = 'badge-flow-nodata';
        } else if (Math.abs(gap) <= 10) {
          statusText = '🟢 Cân bằng';
          statusClass = 'badge-flow-balanced';
        } else if (gap > 0) {
          statusText = `⚡ ${STAGE_CONFIG[stageA].shortLabel} > ${STAGE_CONFIG[stageB].shortLabel}`;
          statusClass = 'badge-flow-excess';
        } else {
          statusText = `🔴 ${STAGE_CONFIG[stageA].shortLabel} < ${STAGE_CONFIG[stageB].shortLabel}`;
          statusClass = 'badge-flow-deficit';
        }

        rows.push({
          id: `ph_${i + 1}`,
          model,
          nameA,
          factA,
          nameB,
          factB,
          gap,
          pkgExcess,
          ratio,
          normKeyShort,
          statusText,
          statusClass,
          hasGap: gap !== 0,
          isPkgStageA,
          isMultiGroup: isPkgStageA ? (pkgDetails.length >= 2) : false,
          isMultiGroupB: !isPkgStageA ? (pkgDetails.length >= 2) : false,
          multiItems: pkgDetails,
          baseSFGName: assyName,
          baseSFGFact: factAssy
        });
      }
    } else {
      // Trường hợp các cặp khác (ví dụ: ASSEMBLY vs HARD TEST, HARD TEST vs DIP, PKG vs DIP...)
      // Tự động nhóm theo công đoạn có rank thấp hơn (gốc)
      const isALowerRank = rankA < rankB;
      const baseStage = isALowerRank ? stageA : stageB;
      const derivedStage = isALowerRank ? stageB : stageA;
      const basePool = itemsByStage[baseStage] || [];

      const uniqueBase = [];
      const seenBase = new Set();
      for (const item of basePool) {
        const name = (item.productName1C || '').trim();
        if (!name || seenBase.has(name)) continue;
        seenBase.add(name);
        uniqueBase.push(item);
      }

      for (let i = 0; i < uniqueBase.length; i++) {
        const baseItem = uniqueBase[i];
        const baseName = baseItem.productName1C.trim();
        const model = cleanModelGroup(baseItem.model, baseName);
        if (model) modelSet.add(model);
        const normKeyShort = (baseItem.normKeyShort || '').trim();

        // Fact công đoạn gốc (chỉ lấy đúng trong nhóm baseStage)
        const factBase = getStageProductFact(baseStage, baseName);

        // Tìm các mã derived tương ứng
        let derivedNames = [];
        if (baseStage === 'HARD TEST' && derivedStage === 'ASSEMBLY') {
          derivedNames = Array.from(htToAssyMap.get(baseName) || []);
        } else if (baseStage === 'DIP' && derivedStage === 'HARD TEST') {
          derivedNames = Array.from(dipToHtMap.get(baseName) || []);
        } else if (baseStage === 'DIP' && derivedStage === 'PKG') {
          // Gộp các PKG qua DIP
          const htList = Array.from(dipToHtMap.get(baseName) || []);
          const setPkgs = new Set();
          for (const ht of htList) {
            const assyList = Array.from(htToAssyMap.get(ht) || []);
            for (const as of assyList) {
              const pkgs = Array.from(assyToPkgsMap.get(as) || []);
              for (const p of pkgs) setPkgs.add(p);
            }
          }
          derivedNames = Array.from(setPkgs);
        }

        // Fallback theo normKeyShort nếu rỗng
        if (derivedNames.length === 0) {
          const candidates = normKeyShort ? (byNorm[derivedStage]?.get(normKeyShort) || []) : [];
          const setD = new Set();
          for (const c of candidates) setD.add(c.productName1C.trim());
          derivedNames = Array.from(setD);
        }

        const derivedDetails = [];
        let totalDerivedFact = 0;
        for (const dName of derivedNames) {
          const dFact = getStageProductFact(derivedStage, dName);
          totalDerivedFact += dFact;
          derivedDetails.push({ name: dName, fact: dFact });
        }

        const factA = isALowerRank ? factBase : totalDerivedFact;
        const factB = isALowerRank ? totalDerivedFact : factBase;
        const nameA = isALowerRank ? baseName : (derivedDetails.length > 0 ? derivedDetails[0].name : '(Chưa có mã tương ứng)');
        const nameB = isALowerRank ? (derivedDetails.length > 0 ? derivedDetails[0].name : '(Chưa có mã tương ứng)') : baseName;

        const gap = factA - factB;
        const ratio = factB > 0 ? (factA / factB) * 100 : (factA > 0 ? 100 : 0);
        const isPkgStageA = stageA === 'PKG';
        const isPkgStageB = stageB === 'PKG';
        const pkgExcess = isPkgStageA ? (factA - factB) : (isPkgStageB ? (factB - factA) : 0);

        let statusText = 'Cân bằng';
        let statusClass = 'badge-flow-balanced';
        if (factA === 0 && factB === 0) {
          statusText = '⚪ Chưa có Fact';
          statusClass = 'badge-flow-nodata';
        } else if (Math.abs(gap) <= 10) {
          statusText = '🟢 Cân bằng';
          statusClass = 'badge-flow-balanced';
        } else if (gap > 0) {
          statusText = `⚡ ${STAGE_CONFIG[stageA].shortLabel} > ${STAGE_CONFIG[stageB].shortLabel}`;
          statusClass = 'badge-flow-excess';
        } else {
          statusText = `🔴 ${STAGE_CONFIG[stageA].shortLabel} < ${STAGE_CONFIG[stageB].shortLabel}`;
          statusClass = 'badge-flow-deficit';
        }

        rows.push({
          id: `ph_${i + 1}`,
          model,
          nameA,
          factA,
          nameB,
          factB,
          gap,
          pkgExcess,
          ratio,
          normKeyShort,
          statusText,
          statusClass,
          hasGap: gap !== 0,
          isPkgStageA,
          isMultiGroup: (!isALowerRank && derivedDetails.length >= 2),
          isMultiGroupB: (isALowerRank && derivedDetails.length >= 2),
          multiItems: derivedDetails,
          baseSFGName: baseName,
          baseSFGFact: factBase
        });
      }
    }

    const sortedModels = Array.from(modelSet).sort((a, b) => a.localeCompare(b));

    const isPkgAssy = (stageA === 'PKG' && stageB === 'ASSEMBLY') || (stageA === 'ASSEMBLY' && stageB === 'PKG');
    const isPkgA = stageA === 'PKG';

    let stats = {
      total: rows.length,
      pkgGreater: 0,
      pkgLess: 0,
      balanced: 0
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isPkgAssy) {
        const pkgFact = isPkgA ? r.factA : r.factB;
        const assyFact = isPkgA ? r.factB : r.factA;
        if (pkgFact > assyFact) {
          stats.pkgGreater++;
        } else if (pkgFact < assyFact) {
          stats.pkgLess++;
        } else {
          stats.balanced++;
        }
      } else {
        if (r.gap > 0) stats.pkgGreater++;
        else if (r.gap < 0) stats.pkgLess++;
        else stats.balanced++;
      }
    }

    return {
      rows,
      models: sortedModels,
      stats
    };
  };

  /**
   * Render badge hiển thị số liệu chênh lệch GAP
   */
  function renderGapBadge(gapValue) {
    if (gapValue === 0) {
      return `<span class="ph-gap-zero">0</span>`;
    }
    if (gapValue > 0) {
      return `<span class="ph-gap-pos" title="Công đoạn 1 nhiều hơn +${gapValue.toLocaleString('vi-VN')}">+${gapValue.toLocaleString('vi-VN')}</span>`;
    }
    return `<span class="ph-gap-neg" title="Công đoạn 1 ít hơn ${gapValue.toLocaleString('vi-VN')}">${gapValue.toLocaleString('vi-VN')}</span>`;
  }

  /**
   * Render chính giao diện Tra Cứu Lịch Sử Sản Xuất
   */
  window.renderProdHistoryView = function(containerId) {
    const container = document.getElementById(containerId || 'prodHistoryContainer');
    if (!container) return;

    const data = window.buildProdHistoryData();
    const store = window.ProdHistoryStore;
    const stageAConf = STAGE_CONFIG[store.stageA || 'PKG'];
    const stageBConf = STAGE_CONFIG[store.stageB || 'ASSEMBLY'];

    // Lọc dữ liệu theo Search, Model và GAP Filter
    let filteredRows = data.rows.filter(r => {
      // 1. Lọc theo Model
      if (store.modelFilter !== 'ALL' && r.model !== store.modelFilter) {
        return false;
      }

      // 2. Lọc theo trạng thái GAP
      if (store.gapFilter === 'HAS_GAP' && !r.hasGap) {
        return false;
      }
      if (store.gapFilter === 'BALANCED' && !r.statusText.includes('Cân bằng')) {
        return false;
      }
      if (store.gapFilter === 'PKG_GREATER') {
        const isPkgAssy = (store.stageA === 'PKG' && store.stageB === 'ASSEMBLY') || (store.stageA === 'ASSEMBLY' && store.stageB === 'PKG');
        if (isPkgAssy) {
          const pkgFact = store.stageA === 'PKG' ? r.factA : r.factB;
          const assyFact = store.stageA === 'PKG' ? r.factB : r.factA;
          if (pkgFact <= assyFact) return false;
        } else {
          if (r.gap <= 0) return false;
        }
      }
      if (store.gapFilter === 'PKG_LESS') {
        const isPkgAssy = (store.stageA === 'PKG' && store.stageB === 'ASSEMBLY') || (store.stageA === 'ASSEMBLY' && store.stageB === 'PKG');
        if (isPkgAssy) {
          const pkgFact = store.stageA === 'PKG' ? r.factA : r.factB;
          const assyFact = store.stageA === 'PKG' ? r.factB : r.factA;
          if (pkgFact >= assyFact) return false;
        } else {
          if (r.gap >= 0) return false;
        }
      }
      if (store.gapFilter === 'STAGE_A_GREATER' && r.gap <= 0) {
        return false;
      }
      if (store.gapFilter === 'STAGE_B_GREATER' && r.gap >= 0) {
        return false;
      }

      // 3. Lọc theo Search text (Model, Mã 1C A, Mã 1C B, Các mã con gộp, Mã Bo Mạch)
      if (store.search) {
        const q = store.search.toLowerCase().trim();
        const multiNames = (r.multiItems || []).map(m => m.name).join(' ').toLowerCase();
        const searchStr = `${r.model} ${r.nameA} ${r.nameB} ${multiNames} ${r.normKeyShort}`.toLowerCase();
        if (!searchStr.includes(q)) return false;
      }

      return true;
    });

    // Sắp xếp
    filteredRows.sort((a, b) => {
      let vA = a[store.sortBy];
      let vB = b[store.sortBy];
      if (store.sortBy === 'model' || store.sortBy === 'nameA' || store.sortBy === 'nameB') {
        vA = String(vA || '');
        vB = String(vB || '');
        return store.sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      vA = Number(vA) || 0;
      vB = Number(vB) || 0;
      return store.sortDir === 'asc' ? vA - vB : vB - vA;
    });

    // Helper render icon sắp xếp cột
    function renderSortIcon(field) {
      if (store.sortBy === field) {
        return `<span class="ph-sort-icon ${store.sortDir === 'asc' ? 'ph-sort-asc' : 'ph-sort-desc'}">${store.sortDir === 'asc' ? '▲' : '▼'}</span>`;
      }
      return `<span class="ph-sort-icon ph-sort-inactive">⇅</span>`;
    }

    // Phân trang
    const totalFiltered = filteredRows.length;
    const pageSize = store.pageSize === 'ALL' ? totalFiltered : Number(store.pageSize);
    const totalPages = pageSize > 0 ? Math.ceil(totalFiltered / pageSize) : 1;
    if (store.page > totalPages) store.page = Math.max(1, totalPages);

    const startIndex = pageSize > 0 ? (store.page - 1) * pageSize : 0;
    const pageRows = pageSize > 0 ? filteredRows.slice(startIndex, startIndex + pageSize) : filteredRows;

    let html = `
      <style>
        .ph-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 4px;
          font-family: inherit;
        }
        .ph-header-bar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--bg-card, #1e293b);
          border: 1px solid var(--border-color, #334155);
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .ph-header-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ph-title-group h2 {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary, #f8fafc);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ph-stage-comparator-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          background: rgba(15, 23, 42, 0.6);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color, #334155);
        }
        .ph-stage-select-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ph-stage-select {
          background: #1e293b;
          border: 1px solid #475569;
          color: #f8fafc;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ph-swap-btn {
          background: #334155;
          color: #f8fafc;
          border: 1px solid #475569;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all 0.2s;
        }
        .ph-swap-btn:hover {
          background: #475569;
          transform: scale(1.05);
        }
        .ph-preset-btn {
          background: rgba(51, 65, 85, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ph-preset-btn:hover, .ph-preset-btn.active {
          background: var(--primary, #3b82f6);
          color: #fff;
          border-color: #60a5fa;
        }
        .ph-quick-filters {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 2px 0;
        }
        .ph-qfilter-btn {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid var(--border-color, #334155);
          color: #94a3b8;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ph-qfilter-btn:hover {
          border-color: #64748b;
          color: #f8fafc;
          transform: translateY(-1px);
        }
        .ph-qfilter-btn.active {
          background: #334155;
          color: #f8fafc;
          border-color: #94a3b8;
        }
        .ph-qfilter-excess {
          border-color: rgba(245, 158, 11, 0.4);
          color: #fde68a;
        }
        .ph-qfilter-excess:hover, .ph-qfilter-excess.active {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%) !important;
          border-color: #f59e0b !important;
          color: #fbbf24 !important;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
          font-weight: 700;
        }
        .ph-qfilter-deficit:hover, .ph-qfilter-deficit.active {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: #ef4444 !important;
          color: #f87171 !important;
        }
        .ph-qfilter-balanced:hover, .ph-qfilter-balanced.active {
          background: rgba(16, 185, 129, 0.2) !important;
          border-color: #10b981 !important;
          color: #34d399 !important;
        }
        .ph-th-sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.15s, color 0.15s;
        }
        .ph-th-sortable:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }
        .ph-sort-icon {
          display: inline-block;
          margin-left: 5px;
          font-size: 0.72rem;
          vertical-align: middle;
        }
        .ph-sort-icon.ph-sort-asc {
          color: #38bdf8;
        }
        .ph-sort-icon.ph-sort-desc {
          color: #fbbf24;
        }
        .ph-sort-inactive {
          opacity: 0.35;
          color: #94a3b8;
        }
        .ph-toolbar-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .ph-date-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.6);
          padding: 5px 8px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #334155);
        }
        .ph-date-inputs input[type="date"] {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary, #f8fafc);
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .ph-search-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color, #334155);
          color: var(--text-primary, #f8fafc);
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          min-width: 240px;
        }
        .ph-select {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color, #334155);
          color: var(--text-primary, #f8fafc);
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .ph-btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .ph-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #fff;
          border-color: #60a5fa;
        }
        .ph-btn-primary:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
        .ph-btn-secondary {
          background: rgba(51, 65, 85, 0.7);
          color: var(--text-primary, #f8fafc);
          border-color: #475569;
        }
        .ph-btn-secondary:hover {
          background: rgba(71, 85, 105, 0.9);
        }
        .ph-table-wrap {
          background: var(--bg-card, #1e293b);
          border: 1px solid var(--border-color, #334155);
          border-radius: 12px;
          overflow: auto;
          max-height: calc(100vh - 275px);
          min-height: 420px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          position: relative;
        }
        .ph-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.82rem;
          text-align: left;
        }
        .ph-table th, .ph-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color, #334155);
          vertical-align: top;
        }
        .ph-table th {
          background: #0f172a;
          color: var(--text-secondary, #94a3b8);
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 20;
          white-space: nowrap;
        }
        /* ĐÓNG BĂNG HÀNG ĐẦU TIÊN & CỘT STT, MODEL */
        .ph-col-stt {
          position: sticky;
          left: 0;
          width: 48px;
          min-width: 48px;
          max-width: 48px;
          text-align: center;
          z-index: 15;
          background: #1e293b;
        }
        th.ph-col-stt {
          top: 0;
          z-index: 35;
          background: #0f172a !important;
        }
        .ph-col-model {
          position: sticky;
          left: 48px;
          min-width: 145px;
          z-index: 15;
          background: #1e293b;
          box-shadow: 3px 0 8px rgba(0,0,0,0.3);
        }
        th.ph-col-model {
          top: 0;
          z-index: 35;
          background: #0f172a !important;
          box-shadow: 3px 0 8px rgba(0,0,0,0.3);
        }
        .ph-table tr:hover td {
          background: rgba(255, 255, 255, 0.04);
        }
        .ph-table tr:hover td.ph-col-stt,
        .ph-table tr:hover td.ph-col-model {
          background: #253346 !important;
        }
        .ph-th-stage-a {
          background: ${stageAConf.bgHeader} !important;
          color: ${stageAConf.color} !important;
          border-bottom: 2px solid ${stageAConf.borderHeader} !important;
        }
        .ph-th-stage-b {
          background: ${stageBConf.bgHeader} !important;
          color: ${stageBConf.color} !important;
          border-bottom: 2px solid ${stageBConf.borderHeader} !important;
        }
        .ph-th-gap {
          background: rgba(16, 185, 129, 0.08) !important;
          color: #6ee7b7 !important;
          border-bottom: 2px solid #10b981 !important;
          text-align: center;
        }
        .ph-table tr:hover td {
          background: rgba(255, 255, 255, 0.03);
        }
        .ph-num-col {
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .ph-gap-col {
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .ph-gap-pos {
          color: #34d399;
          background: rgba(16, 185, 129, 0.15);
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 700;
          display: inline-block;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .ph-gap-neg {
          color: #f87171;
          background: rgba(239, 68, 68, 0.15);
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 700;
          display: inline-block;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .ph-gap-zero {
          color: #64748b;
          font-weight: 500;
        }
        .ph-badge-multi {
          display: inline-block;
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ph-child-pkg-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 2px;
        }
        .ph-child-pkg-item {
          display: flex;
          align-items: baseline;
          gap: 5px;
          font-size: 0.77rem;
          color: #cbd5e1;
          line-height: 1.35;
        }
        .ph-dot {
          color: #f59e0b;
          font-weight: bold;
        }
        .ph-pkg-subfact {
          font-weight: 700;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .badge-flow-balanced {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }
        .badge-flow-excess {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.35);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }
        .badge-flow-deficit {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.35);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }
        .badge-flow-nodata {
          color: #64748b;
          font-size: 0.75rem;
        }
        .ph-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          padding: 12px 16px;
          background: var(--bg-card, #1e293b);
          border-top: 1px solid var(--border-color, #334155);
          font-size: 0.82rem;
          color: var(--text-secondary, #94a3b8);
        }
        .ph-page-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ph-page-btn {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color, #334155);
          color: var(--text-primary, #f8fafc);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .ph-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        /* Modal styles */
        .ph-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 100050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .ph-modal-content {
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 14px;
          max-width: 860px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          z-index: 100051;
          color: #f8fafc;
        }
        .ph-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ph-modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          color: #f8fafc;
        }
        .ph-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      </style>

      <div class="ph-wrapper">
        <!-- TOP TOOLBAR & CONTROLS (PHẦN THẺ STATS KPI ĐÃ ĐƯỢC BỎ THEO YÊU CẦU) -->
        <div class="ph-header-bar">
          <div class="ph-header-top">
            <div class="ph-title-group">
              <h2><span>🔄</span> Tra Cứu Lịch Sử Sản Xuất</h2>
            </div>

            <!-- BỘ CHỌN 2 CÔNG ĐOẠN SO SÁNH -->
            <div class="ph-stage-comparator-bar">
              <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600;">So sánh:</span>

              <div class="ph-stage-select-box">
                <select class="ph-stage-select" style="color: ${stageAConf.color}; border-color: ${stageAConf.borderHeader};" onchange="window.handleProdHistoryStageAChange(this.value)">
                  <option value="PKG" ${store.stageA === 'PKG' ? 'selected' : ''}>PKG (Đóng Gói)</option>
                  <option value="ASSEMBLY" ${store.stageA === 'ASSEMBLY' ? 'selected' : ''}>ASSEMBLY (Lắp Ráp)</option>
                  <option value="HARD TEST" ${store.stageA === 'HARD TEST' ? 'selected' : ''}>HARD TEST (Kiểm Tra Mạch)</option>
                  <option value="DIP" ${store.stageA === 'DIP' ? 'selected' : ''}>DIP (Cắm Linh Kiện)</option>
                </select>
              </div>

              <button class="ph-swap-btn" onclick="window.handleProdHistorySwapStages()" title="Đổi chiều so sánh 2 công đoạn">
                ⇄ Đổi Chiều
              </button>

              <div class="ph-stage-select-box">
                <select class="ph-stage-select" style="color: ${stageBConf.color}; border-color: ${stageBConf.borderHeader};" onchange="window.handleProdHistoryStageBChange(this.value)">
                  <option value="PKG" ${store.stageB === 'PKG' ? 'selected' : ''}>PKG (Đóng Gói)</option>
                  <option value="ASSEMBLY" ${store.stageB === 'ASSEMBLY' ? 'selected' : ''}>ASSEMBLY (Lắp Ráp)</option>
                  <option value="HARD TEST" ${store.stageB === 'HARD TEST' ? 'selected' : ''}>HARD TEST (Kiểm Tra Mạch)</option>
                  <option value="DIP" ${store.stageB === 'DIP' ? 'selected' : ''}>DIP (Cắm Linh Kiện)</option>
                </select>
              </div>

              <!-- CÁC NÚT CẶP SO SÁNH NHANH -->
              <div style="display: flex; gap: 4px; margin-left: 6px;">
                <button class="ph-preset-btn ${store.stageA === 'PKG' && store.stageB === 'ASSEMBLY' ? 'active' : ''}" onclick="window.setProdHistoryPair('PKG', 'ASSEMBLY')">PKG ⇄ ASSY</button>
                <button class="ph-preset-btn ${store.stageA === 'ASSEMBLY' && store.stageB === 'HARD TEST' ? 'active' : ''}" onclick="window.setProdHistoryPair('ASSEMBLY', 'HARD TEST')">ASSY ⇄ HT</button>
                <button class="ph-preset-btn ${store.stageA === 'HARD TEST' && store.stageB === 'DIP' ? 'active' : ''}" onclick="window.setProdHistoryPair('HARD TEST', 'DIP')">HT ⇄ DIP</button>
              </div>
            </div>
          </div>

          <!-- BỘ NÚT LỌC NHANH TRẠNG THÁI (ĐẶC BIỆT TẬP TRUNG PKG > ASSEMBLY) -->
          <div class="ph-quick-filters">
            <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; margin-right: 4px;">⚡ Lọc nhanh:</span>
            <button class="ph-qfilter-btn ${store.gapFilter === 'ALL' ? 'active' : ''}" onclick="window.setProdHistoryGapFilter('ALL')">
              📦 Tất cả (${data.stats.total})
            </button>
            <button class="ph-qfilter-btn ph-qfilter-excess ${store.gapFilter === 'PKG_GREATER' ? 'active' : ''}" onclick="window.setProdHistoryGapFilter('PKG_GREATER')" title="Tập trung xem các mã PKG Fact nhiều hơn Assembly Fact (Tự động sắp xếp chênh lệch lớn nhất lên đầu)">
              ⚡ PKG > Assembly (${data.stats.pkgGreater})
            </button>
            <button class="ph-qfilter-btn ph-qfilter-deficit ${store.gapFilter === 'PKG_LESS' ? 'active' : ''}" onclick="window.setProdHistoryGapFilter('PKG_LESS')" title="Xem các mã PKG Fact ít hơn Assembly Fact">
              🔴 PKG < Assembly (${data.stats.pkgLess})
            </button>
            <button class="ph-qfilter-btn ph-qfilter-balanced ${store.gapFilter === 'BALANCED' ? 'active' : ''}" onclick="window.setProdHistoryGapFilter('BALANCED')" title="Xem các mã cân bằng sản lượng">
              🟢 Cân bằng (${data.stats.balanced})
            </button>
          </div>

          <div class="ph-toolbar-controls">
            <!-- CHỌN KHOẢNG NGÀY (Từ ngày ... Đến ngày ...) -->
            <div class="ph-date-inputs">
              <span style="font-size: 0.78rem; color: #94a3b8;">Từ:</span>
              <input type="date" id="phFromDate" value="${toHtmlDateValue(store.fromDate)}" onchange="window.handleProdHistoryDateChange()" />
              <span style="font-size: 0.78rem; color: #94a3b8;">Đến:</span>
              <input type="date" id="phToDate" value="${toHtmlDateValue(store.toDate)}" onchange="window.handleProdHistoryDateChange()" />
              ${(store.fromDate !== '2025-09-22' || store.toDate !== getTodayIsoString()) ? `
                <button class="ph-preset-btn" style="padding: 2px 6px;" onclick="window.resetProdHistoryDefaultDates()" title="Quay về khoảng ngày mặc định (22/09/2025 - nay)">↺ Mặc định</button>
              ` : ''}
              ${store.fromDate || store.toDate ? `
                <button class="ph-preset-btn" style="padding: 2px 6px;" onclick="window.clearProdHistoryDates()" title="Xem toàn bộ lịch sử">✕ Xóa ngày</button>
              ` : ''}
            </div>

            <!-- Ô TÌM KIẾM -->
            <input type="text" class="ph-search-input" placeholder="🔍 Tìm Model, Mã 1C ${stageAConf.shortLabel}, Mã 1C ${stageBConf.shortLabel}..." value="${store.search}" oninput="window.handleProdHistorySearch(this.value)" />

            <!-- LỌC MODEL -->
            <select class="ph-select" onchange="window.handleProdHistoryModelFilter(this.value)">
              <option value="ALL">📦 Tất cả Model (${data.models.length})</option>
              ${data.models.map(m => `<option value="${m}" ${store.modelFilter === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>

            <!-- LỌC CHÊNH LỆCH GAP -->
            <select class="ph-select" onchange="window.handleProdHistoryGapFilter(this.value)">
              <option value="ALL" ${store.gapFilter === 'ALL' ? 'selected' : ''}>⚖️ Tất cả trạng thái GAP (${data.stats.total})</option>
              <option value="PKG_GREATER" ${store.gapFilter === 'PKG_GREATER' ? 'selected' : ''}>⚡ Chỉ xem PKG > Assembly (${data.stats.pkgGreater} mã)</option>
              <option value="PKG_LESS" ${store.gapFilter === 'PKG_LESS' ? 'selected' : ''}>🔴 Chỉ xem PKG < Assembly (${data.stats.pkgLess} mã)</option>
              <option value="HAS_GAP" ${store.gapFilter === 'HAS_GAP' ? 'selected' : ''}>⚠️ Chỉ xem có lệch GAP</option>
              <option value="BALANCED" ${store.gapFilter === 'BALANCED' ? 'selected' : ''}>🟢 Chỉ xem Cân bằng (${data.stats.balanced} mã)</option>
              <option value="STAGE_A_GREATER" ${store.gapFilter === 'STAGE_A_GREATER' ? 'selected' : ''}>🟡 ${stageAConf.shortLabel} > ${stageBConf.shortLabel}</option>
              <option value="STAGE_B_GREATER" ${store.gapFilter === 'STAGE_B_GREATER' ? 'selected' : ''}>🔴 ${stageAConf.shortLabel} < ${stageBConf.shortLabel}</option>
            </select>

            <!-- CÁC NÚT THAO TÁC -->
            <button class="ph-btn-action ph-btn-secondary" onclick="window.copyProdHistoryToGoogleSheet()" title="Copy dữ liệu dạng bảng để dán trực tiếp vào Google Sheets">
              <span>📋</span> Copy Google Sheet
            </button>
            <button class="ph-btn-action ph-btn-primary" onclick="window.exportProdHistoryCSV()" title="Tải file Excel / CSV UTF-8">
              <span>📥</span> Xuất CSV
            </button>
          </div>
        </div>

        <!-- BẢNG DỮ LIỆU SO SÁNH 2 CÔNG ĐOẠN (HIỂN THỊ TRỰC TIẾP SAU TOOLBAR) -->
        <div class="ph-table-wrap">
          <table class="ph-table">
            <thead>
              <tr>
                <th class="ph-col-stt" style="width: 48px; text-align: center;">STT</th>
                <th class="ph-col-model ph-th-sortable" onclick="window.handleProdHistorySort('model')" style="min-width: 145px;" title="Click để sắp xếp theo Model">
                  Model ${renderSortIcon('model')}
                </th>
                <th class="ph-th-stage-a" style="min-width: 300px;">Mã Model 1C (${stageAConf.shortLabel})</th>
                <th class="ph-th-stage-a ph-num-col ph-th-sortable" onclick="window.handleProdHistorySort('factA')" style="min-width: 110px;" title="Click để sắp xếp theo Fact ${stageAConf.shortLabel}">
                  Fact ${stageAConf.shortLabel} ${renderSortIcon('factA')}
                </th>
                <th class="ph-th-stage-b" style="min-width: 260px;">Mã Model 1C (${stageBConf.shortLabel})</th>
                <th class="ph-th-stage-b ph-num-col ph-th-sortable" onclick="window.handleProdHistorySort('factB')" style="min-width: 110px;" title="Click để sắp xếp theo Fact ${stageBConf.shortLabel}">
                  Fact ${stageBConf.shortLabel} ${renderSortIcon('factB')}
                </th>
                <th class="ph-th-gap ph-gap-col ph-th-sortable" onclick="window.handleProdHistorySort('gap')" style="min-width: 120px;" title="Click để sắp xếp theo Chênh Lệch GAP">
                  Chênh Lệch GAP ${renderSortIcon('gap')}<br/>
                  <span style="font-size: 0.68rem; font-weight: normal;">(${stageAConf.shortLabel} - ${stageBConf.shortLabel})</span>
                </th>
                <th class="ph-th-gap ph-gap-col ph-th-sortable" onclick="window.handleProdHistorySort('ratio')" style="min-width: 85px;" title="Click để sắp xếp theo Tỷ Lệ">
                  Tỷ Lệ (%) ${renderSortIcon('ratio')}
                </th>
                <th style="min-width: 130px; text-align: center;">Đánh Giá</th>
                <th style="min-width: 120px;">Mã Bo Mạch</th>
                <th style="width: 65px; text-align: center;">Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              ${pageRows.length === 0 ? `
                <tr>
                  <td colspan="11" style="text-align: center; padding: 40px; color: #94a3b8;">
                    Không tìm thấy dữ liệu phù hợp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ` : pageRows.map((r, idx) => `
                <tr>
                  <td class="ph-col-stt" style="text-align: center; color: #94a3b8;">${startIndex + idx + 1}</td>
                  <td class="ph-col-model"><strong style="color: #f8fafc;">${r.model}</strong></td>

                  <!-- CỘT CÔNG ĐOẠN 1 (A) -->
                  <td>
                    ${r.isMultiGroup ? `
                      <span class="ph-badge-multi">📦 ${r.multiItems.length} mã ${stageAConf.shortLabel} gộp</span>
                      <div class="ph-child-pkg-list">
                        ${r.multiItems.map(m => `
                          <div class="ph-child-pkg-item">
                            <span class="ph-dot">•</span>
                            <span style="flex: 1; word-break: break-word;">${m.name}</span>
                            <span class="ph-pkg-subfact" style="color: ${stageAConf.color};">(${m.fact.toLocaleString('vi-VN')})</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div style="font-weight: 600; color: #f8fafc; line-height: 1.4;">${r.nameA}</div>
                    `}
                  </td>
                  <td class="ph-num-col" style="color: ${stageAConf.color};">
                    ${r.factA.toLocaleString('vi-VN')}
                  </td>

                  <!-- CỘT CÔNG ĐOẠN 2 (B) -->
                  <td>
                    ${r.isMultiGroupB ? `
                      <span class="ph-badge-multi">📦 ${r.multiItems.length} mã ${stageBConf.shortLabel} gộp</span>
                      <div class="ph-child-pkg-list">
                        ${r.multiItems.map(m => `
                          <div class="ph-child-pkg-item">
                            <span class="ph-dot">•</span>
                            <span style="flex: 1; word-break: break-word;">${m.name}</span>
                            <span class="ph-pkg-subfact" style="color: ${stageBConf.color};">(${m.fact.toLocaleString('vi-VN')})</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div style="color: #cbd5e1; font-size: 0.82rem; line-height: 1.4;">${r.nameB}</div>
                    `}
                  </td>
                  <td class="ph-num-col" style="color: ${stageBConf.color};">
                    ${r.factB.toLocaleString('vi-VN')}
                  </td>

                  <!-- CHÊNH LỆCH GAP & TỶ LỆ -->
                  <td class="ph-gap-col">${renderGapBadge(r.gap)}</td>
                  <td class="ph-gap-col" style="color: #94a3b8; font-size: 0.78rem;">
                    ${r.factB > 0 ? `${r.ratio.toFixed(1)}%` : '-'}
                  </td>

                  <!-- ĐÁNH GIÁ & MÃ BO -->
                  <td style="text-align: center;">
                    <span class="${r.statusClass}">${r.statusText}</span>
                  </td>
                  <td>
                    <code style="background: rgba(15, 23, 42, 0.6); padding: 2px 6px; border-radius: 4px; color: #94a3b8; font-size: 0.76rem;">
                      ${r.normKeyShort || '-'}
                    </code>
                  </td>

                  <!-- NÚT CHI TIẾT -->
                  <td style="text-align: center;">
                    <button class="ph-btn-action ph-btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.viewProdHistoryModal('${r.id}')" title="Xem chi tiết phân tích">
                      🔍
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- PHÂN TRANG -->
          <div class="ph-pagination-bar">
            <div>
              Hiển thị <strong>${filteredRows.length > 0 ? startIndex + 1 : 0}</strong> - <strong>${Math.min(startIndex + pageSize, totalFiltered)}</strong> trên tổng số <strong>${totalFiltered}</strong> dòng
            </div>
            <div class="ph-page-buttons">
              <span style="margin-right: 8px;">Dòng/trang:</span>
              <select class="ph-select" style="padding: 2px 6px; font-size: 0.8rem;" onchange="window.handleProdHistoryPageSize(this.value)">
                <option value="25" ${store.pageSize === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${store.pageSize === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${store.pageSize === 100 ? 'selected' : ''}>100</option>
                <option value="ALL" ${store.pageSize === 'ALL' ? 'selected' : ''}>Tất cả</option>
              </select>

              <button class="ph-page-btn" ${store.page <= 1 ? 'disabled' : ''} onclick="window.handleProdHistoryPage(${store.page - 1})">◀</button>
              <span style="padding: 0 6px;">Trang <strong>${store.page}</strong> / ${totalPages}</span>
              <button class="ph-page-btn" ${store.page >= totalPages ? 'disabled' : ''} onclick="window.handleProdHistoryPage(${store.page + 1})">▶</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  };

  /**
   * Xem Modal chi tiết đối chiếu
   */
  window.viewProdHistoryModal = function(rowId) {
    const data = window.buildProdHistoryData();
    const item = data.rows.find(r => r.id === rowId);
    if (!item) return;

    let modalContainer = document.getElementById('phDetailModalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'phDetailModalContainer';
      document.body.appendChild(modalContainer);
    }

    const store = window.ProdHistoryStore;
    const stageAConf = STAGE_CONFIG[store.stageA || 'PKG'];
    const stageBConf = STAGE_CONFIG[store.stageB || 'ASSEMBLY'];

    modalContainer.innerHTML = `
      <div class="ph-modal-overlay" onclick="window.closeProdHistoryModal(event)">
        <div class="ph-modal-content" onclick="event.stopPropagation()">
          <div class="ph-modal-header">
            <h3>Đối Chiếu Chi Tiết: ${stageAConf.shortLabel} vs ${stageBConf.shortLabel} (${item.model})</h3>
            <button class="ph-btn-action ph-btn-secondary" onclick="window.closeProdHistoryModal()" style="padding: 4px 10px;">✕ Đóng</button>
          </div>
          <div class="ph-modal-body">
            <div style="background: rgba(15, 23, 42, 0.5); padding: 12px 16px; border-radius: 8px; border: 1px solid #334155;">
              <div style="font-size: 0.95rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">Model: ${item.model}</div>
              <div style="font-size: 0.8rem; color: #94a3b8;">
                Mã Bo Mạch: <code style="color: #60a5fa;">${item.normKeyShort || 'N/A'}</code> |
                Trạng Thái: <span class="${item.statusClass}">${item.statusText}</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <!-- BÊN TRÁI: CÔNG ĐOẠN 1 -->
              <div style="background: #0f172a; border: 1px solid #334155; border-top: 3px solid ${stageAConf.color}; border-radius: 10px; padding: 14px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: ${stageAConf.color}; text-transform: uppercase;">1. CÔNG ĐOẠN: ${stageAConf.label}</span>
                <div style="font-size: 1.5rem; font-weight: 700; color: ${stageAConf.color}; margin: 8px 0;">${item.factA.toLocaleString('vi-VN')}</div>
                <div style="font-size: 0.8rem; color: #e2e8f0; line-height: 1.4;">
                  <strong>Mã 1C:</strong><br/>
                  ${item.isMultiGroup ? `
                    <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                      <span class="ph-badge-multi">📦 ${item.multiItems.length} mã ${stageAConf.shortLabel} gộp:</span>
                      ${item.multiItems.map(m => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
                          <span>• ${m.name}</span>
                          <strong style="color: ${stageAConf.color}; margin-left: 8px;">${m.fact.toLocaleString('vi-VN')}</strong>
                        </div>
                      `).join('')}
                    </div>
                  ` : item.nameA}
                </div>
              </div>

              <!-- BÊN PHẢI: CÔNG ĐOẠN 2 -->
              <div style="background: #0f172a; border: 1px solid #334155; border-top: 3px solid ${stageBConf.color}; border-radius: 10px; padding: 14px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: ${stageBConf.color}; text-transform: uppercase;">2. CÔNG ĐOẠN: ${stageBConf.label}</span>
                <div style="font-size: 1.5rem; font-weight: 700; color: ${stageBConf.color}; margin: 8px 0;">${item.factB.toLocaleString('vi-VN')}</div>
                <div style="font-size: 0.8rem; color: #e2e8f0; line-height: 1.4; word-break: break-word;">
                  <strong>Mã 1C:</strong><br/>
                  ${item.isMultiGroupB ? `
                    <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                      <span class="ph-badge-multi">📦 ${item.multiItems.length} mã ${stageBConf.shortLabel} gộp:</span>
                      ${item.multiItems.map(m => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
                          <span>• ${m.name}</span>
                          <strong style="color: ${stageBConf.color}; margin-left: 8px;">${m.fact.toLocaleString('vi-VN')}</strong>
                        </div>
                      `).join('')}
                    </div>
                  ` : item.nameB}
                </div>
              </div>
            </div>

            <!-- PHÂN TÍCH CHÊNH LỆCH -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px;">
              <h4 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 0.9rem;">Kết Quả So Sánh Chênh Lệch:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.82rem; color: #cbd5e1; line-height: 1.7;">
                <li><strong>Chênh Lệch (GAP):</strong> <span style="font-weight: 700;">${item.gap > 0 ? `+${item.gap.toLocaleString('vi-VN')}` : item.gap.toLocaleString('vi-VN')}</span> (${stageAConf.shortLabel} vs ${stageBConf.shortLabel})</li>
                <li><strong>Tỷ Lệ Hoàn Thiện:</strong> ${item.factB > 0 ? `${item.ratio.toFixed(1)}%` : 'Không xác định'}</li>
                <li><strong>Phân Tích Dòng Chảy:</strong> ${item.gap > 0 ? `${stageAConf.shortLabel} có sản lượng nhiều hơn ${stageBConf.shortLabel} (+${item.gap.toLocaleString('vi-VN')} đơn vị). Điều này thể hiện việc sử dụng tồn cũ của ${stageBConf.shortLabel} để hoàn thiện ${stageAConf.shortLabel}.` : item.gap < 0 ? `${stageBConf.shortLabel} có sản lượng nhiều hơn ${stageAConf.shortLabel} (${item.gap.toLocaleString('vi-VN')} đơn vị). Điều này thể hiện có bán thành phẩm của ${stageBConf.shortLabel} đang dôi dư chờ hoàn thiện sang ${stageAConf.shortLabel}.` : 'Hai công đoạn hoàn toàn cân bằng sản lượng (GAP = 0).'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Đóng Modal
   */
  window.closeProdHistoryModal = function(e) {
    if (e && e.target && !e.target.classList.contains('ph-modal-overlay') && !e.target.innerText.includes('Đóng')) return;
    const modalContainer = document.getElementById('phDetailModalContainer');
    if (modalContainer) modalContainer.innerHTML = '';
  };

  /**
   * Chọn Stage A
   */
  window.handleProdHistoryStageAChange = function(val) {
    window.ProdHistoryStore.stageA = val;
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Chọn Stage B
   */
  window.handleProdHistoryStageBChange = function(val) {
    window.ProdHistoryStore.stageB = val;
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Đổi chiều so sánh 2 công đoạn
   */
  window.handleProdHistorySwapStages = function() {
    const temp = window.ProdHistoryStore.stageA;
    window.ProdHistoryStore.stageA = window.ProdHistoryStore.stageB;
    window.ProdHistoryStore.stageB = temp;
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Chọn cặp so sánh nhanh
   */
  window.setProdHistoryPair = function(stA, stB) {
    window.ProdHistoryStore.stageA = stA;
    window.ProdHistoryStore.stageB = stB;
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Thay đổi ngày lọc Từ ngày / Đến ngày
   */
  window.handleProdHistoryDateChange = function() {
    const f = document.getElementById('phFromDate');
    const t = document.getElementById('phToDate');
    if (f) window.ProdHistoryStore.fromDate = f.value ? f.value.trim() : '';
    if (t) window.ProdHistoryStore.toDate = t.value ? t.value.trim() : '';
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Đặt khoảng ngày lọc theo lập trình hoặc tương tác nhanh
   */
  window.setProdHistoryDateRange = function(fromDate, toDate) {
    window.ProdHistoryStore.fromDate = fromDate || '';
    window.ProdHistoryStore.toDate = toDate || '';
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Xóa bộ lọc ngày
   */
  window.clearProdHistoryDates = function() {
    window.ProdHistoryStore.fromDate = '';
    window.ProdHistoryStore.toDate = '';
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Đặt lại khoảng ngày mặc định (từ 22/09/2025 đến ngày hiện tại)
   */
  window.resetProdHistoryDefaultDates = function() {
    window.ProdHistoryStore.fromDate = '2025-09-22';
    window.ProdHistoryStore.toDate = getTodayIsoString();
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Xử lý tìm kiếm
   */
  window.handleProdHistorySearch = function(val) {
    window.ProdHistoryStore.search = val || '';
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Lọc theo model
   */
  window.handleProdHistoryModelFilter = function(val) {
    window.ProdHistoryStore.modelFilter = val || 'ALL';
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Lọc theo GAP
   */
  window.handleProdHistoryGapFilter = function(val) {
    window.ProdHistoryStore.gapFilter = val || 'ALL';
    if (val === 'PKG_GREATER') {
      window.ProdHistoryStore.sortBy = window.ProdHistoryStore.stageA === 'PKG' ? 'gap' : 'factB';
      window.ProdHistoryStore.sortDir = 'desc';
    }
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Đặt bộ lọc GAP từ nút lọc nhanh
   */
  window.setProdHistoryGapFilter = function(val) {
    window.ProdHistoryStore.gapFilter = val || 'ALL';
    if (val === 'PKG_GREATER') {
      window.ProdHistoryStore.sortBy = window.ProdHistoryStore.stageA === 'PKG' ? 'gap' : 'factB';
      window.ProdHistoryStore.sortDir = 'desc';
    } else if (val === 'ALL' && window.ProdHistoryStore.sortBy === 'gap') {
      window.ProdHistoryStore.sortBy = 'model';
      window.ProdHistoryStore.sortDir = 'asc';
    }
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Xử lý click header cột bảng để sắp xếp dữ liệu
   */
  window.handleProdHistorySort = function(field) {
    if (window.ProdHistoryStore.sortBy === field) {
      window.ProdHistoryStore.sortDir = window.ProdHistoryStore.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      window.ProdHistoryStore.sortBy = field;
      window.ProdHistoryStore.sortDir = (field === 'factA' || field === 'factB' || field === 'gap' || field === 'ratio') ? 'desc' : 'asc';
    }
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Phân trang
   */
  window.handleProdHistoryPage = function(page) {
    window.ProdHistoryStore.page = Math.max(1, page);
    window.renderProdHistoryView();
  };

  window.handleProdHistoryPageSize = function(size) {
    window.ProdHistoryStore.pageSize = size === 'ALL' ? 'ALL' : Number(size);
    window.ProdHistoryStore.page = 1;
    window.renderProdHistoryView();
  };

  /**
   * Copy dữ liệu ra Google Sheet dạng TSV
   */
  window.copyProdHistoryToGoogleSheet = function() {
    const data = window.buildProdHistoryData();
    const rows = data.rows;
    const store = window.ProdHistoryStore;
    const stageAShort = STAGE_CONFIG[store.stageA || 'PKG'].shortLabel;
    const stageBShort = STAGE_CONFIG[store.stageB || 'ASSEMBLY'].shortLabel;

    const headers = [
      'STT',
      'Model',
      `Mã Model 1C (${stageAShort})`,
      `Fact ${stageAShort}`,
      `Mã Model 1C (${stageBShort})`,
      `Fact ${stageBShort}`,
      `Chênh Lệch GAP (${stageAShort} - ${stageBShort})`,
      'Tỷ Lệ (%)',
      'Đánh Giá',
      'Mã Bo Mạch'
    ];

    const lines = [headers.join('\t')];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nameAText = r.isMultiGroup ? r.multiItems.map(m => `${m.name} (${m.fact})`).join('; ') : r.nameA;
      const nameBText = r.isMultiGroupB ? r.multiItems.map(m => `${m.name} (${m.fact})`).join('; ') : r.nameB;
      const line = [
        i + 1,
        r.model,
        nameAText,
        r.factA,
        nameBText,
        r.factB,
        r.gap,
        r.factB > 0 ? `${r.ratio.toFixed(1)}%` : '-',
        r.statusText.replace(/[🟢🟡🔴⚪]/g, '').trim(),
        r.normKeyShort
      ];
      lines.push(line.join('\t'));
    }

    const tsvContent = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent).then(() => {
        alert(`✅ Đã copy ${rows.length} dòng dữ liệu (${stageAShort} vs ${stageBShort}) vào Clipboard! Bạn có thể nhấn Ctrl+V / Cmd+V để dán trực tiếp vào Google Sheets hoặc Excel.`);
      }).catch(() => {
        prompt('Copy thủ công dữ liệu bên dưới:', tsvContent);
      });
    } else {
      prompt('Copy thủ công dữ liệu bên dưới:', tsvContent);
    }
  };

  /**
   * Xuất file CSV UTF-8
   */
  window.exportProdHistoryCSV = function() {
    const data = window.buildProdHistoryData();
    const rows = data.rows;
    const store = window.ProdHistoryStore;
    const stageAShort = STAGE_CONFIG[store.stageA || 'PKG'].shortLabel;
    const stageBShort = STAGE_CONFIG[store.stageB || 'ASSEMBLY'].shortLabel;

    const headers = [
      'STT',
      'Model',
      `Mã Model 1C (${stageAShort})`,
      `Fact ${stageAShort}`,
      `Mã Model 1C (${stageBShort})`,
      `Fact ${stageBShort}`,
      `Chênh Lệch GAP (${stageAShort} - ${stageBShort})`,
      'Tỷ Lệ (%)',
      'Đánh Giá',
      'Mã Bo Mạch'
    ];

    const escapeCsv = (str) => {
      const s = String(str == null ? '' : str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.map(escapeCsv).join(',')];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nameAText = r.isMultiGroup ? r.multiItems.map(m => `${m.name} (${m.fact})`).join('; ') : r.nameA;
      const nameBText = r.isMultiGroupB ? r.multiItems.map(m => `${m.name} (${m.fact})`).join('; ') : r.nameB;
      const line = [
        i + 1,
        r.model,
        nameAText,
        r.factA,
        nameBText,
        r.factB,
        r.gap,
        r.factB > 0 ? `${r.ratio.toFixed(1)}%` : '-',
        r.statusText.replace(/[🟢🟡🔴⚪]/g, '').trim(),
        r.normKeyShort
      ];
      lines.push(line.map(escapeCsv).join(','));
    }

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lich_Su_San_Xuat_${stageAShort}_vs_${stageBShort}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

})();
