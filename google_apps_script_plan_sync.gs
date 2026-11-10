/**
 * AJAX PROPLAN MES - GOOGLE APPS SCRIPT CLOUD SYNC (2 CHIỀU CHO GITHUB PAGES & WEB LOCAL)
 * Hướng dẫn gắn vào Google Sheet nguồn (1wtuLHVwH4U4OfJ3bKQjTgC13g8EZfZePOyLnqnWzfl4):
 * 1. Mở Google Sheet -> Menu [Tiện ích mở rộng] (Extensions) -> [Apps Script]
 * 2. Dán toàn bộ đoạn code này vào file Code.gs (thay thế code cũ) -> Bấm Lưu (Ctrl+S)
 * 3. Bấm [Triển khai] (Deploy) -> [Tùy chọn triển khai mới] (New deployment)
 *    - Loại: Ứng dụng web (Web app)
 *    - Thực thi dưới danh nghĩa (Execute as): Tôi (Me)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 4. Copy URL dạng https://script.google.com/macros/s/.../exec
 * 5. Dán URL này vào nút [☁️ Sync / Cloud] trên giao diện Web để bật đồng bộ 2 chiều ngay cả trên GitHub Pages!
 */

var MES_SYNC_SHEET_NAME = 'MES_COMPLETED_PLANS';
var CHUNK_SIZE = 45000;

function getOrCreateSyncSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MES_SYNC_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MES_SYNC_SHEET_NAME);
    sheet.getRange(1, 1, 1, 5).setValues([['planId', 'createdAt', 'planner', 'dateTime', 'jsonChunks']]);
  }
  return sheet;
}

function splitPlanChunks_(planObj) {
  var jsonStr = JSON.stringify(planObj);
  var chunks = [];
  for (var i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
    chunks.push(jsonStr.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function writeAllPlansBatch_(sheet, plansList) {
  var rows = [];
  var maxNeededCols = 5;
  for (var i = 0; i < plansList.length; i++) {
    var planObj = plansList[i];
    var chunks = splitPlanChunks_(planObj);
    var row = [
      planObj.id || '',
      planObj.createdAt || '',
      planObj.planner || '',
      ((planObj.dateStr || '') + ' ' + (planObj.timeStr || '')).trim()
    ].concat(chunks);
    if (row.length > maxNeededCols) maxNeededCols = row.length;
    rows.push(row);
  }

  var maxCols = sheet.getMaxColumns();
  if (maxNeededCols > maxCols) {
    sheet.insertColumnsAfter(maxCols, maxNeededCols - maxCols);
  }
  for (var r = 0; r < rows.length; r++) {
    while (rows[r].length < maxNeededCols) rows[r].push('');
  }

  var existingLastRow = sheet.getLastRow();
  if (existingLastRow >= 2) {
    sheet.getRange(2, 1, existingLastRow - 1, sheet.getMaxColumns()).clearContent();
  }
  if (rows.length > 0) {
    var targetRange = sheet.getRange(2, 1, rows.length, maxNeededCols);
    targetRange.setNumberFormat('@');
    targetRange.setValues(rows);
  }
}

function readPlanFromRow_(rowArr) {
  if (!rowArr || rowArr.length < 5) return null;
  var jsonStr = '';
  for (var c = 4; c < rowArr.length; c++) {
    if (rowArr[c]) jsonStr += String(rowArr[c]);
  }
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

function readAllPlans_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 5) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var list = [];
  var seen = {};
  for (var r = 0; r < data.length; r++) {
    var plan = readPlanFromRow_(data[r]);
    if (plan && plan.id && !seen[plan.id]) {
      seen[plan.id] = true;
      list.push(plan);
    }
  }
  list.sort(function(a, b) {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  return list;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var sheet = getOrCreateSyncSheet_();
    var plans = readAllPlans_(sheet);
    var latestPlan = plans.length > 0 ? plans[0] : null;
    return jsonOutput_({
      success: true,
      hasPlan: !!latestPlan,
      latestPlan: latestPlan,
      history: plans.slice(0, 30),
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return jsonOutput_({ success: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
    var plan = payload.plan || payload;
    if (!plan || !plan.id) {
      return jsonOutput_({ success: false, error: 'Missing plan.id' });
    }

    var sheet = getOrCreateSyncSheet_();
    var plans = readAllPlans_(sheet);
    var merged = [plan];
    for (var i = 0; i < plans.length; i++) {
      if (plans[i] && plans[i].id && plans[i].id !== plan.id) {
        merged.push(plans[i]);
      }
    }
    merged.sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    merged = merged.slice(0, 30);

    // Ghi đè gọn từ hàng 2 trở đi bằng 1 lần ghi batch + plain text '@'
    writeAllPlansBatch_(sheet, merged);

    return jsonOutput_({
      success: true,
      id: plan.id,
      planner: plan.planner || '',
      count: merged.length,
      savedAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonOutput_({ success: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (le) {}
  }
}
