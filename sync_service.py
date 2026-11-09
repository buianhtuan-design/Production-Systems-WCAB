#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AJAX PROPLAN MES - GOOGLE SHEETS LIVE DATA SYNC SERVICE
Fetches Data_Mass from Google Sheets, parses Master Production Schedule,
and generates js/datamass-data.js with clean weekly cycles and model quantities.
"""

import csv
import json
import os
import ssl
import sys
import time
import urllib.request

SHEET_ID = '1wtuLHVwH4U4OfJ3bKQjTgC13g8EZfZePOyLnqnWzfl4'
DATA_MASS_GID = '1404131818'
MANPOWER_GID = '1491986705'
INVENTORY_1C_GID = '629613225'
MASS_HISTORY_GID = '568706266'
CLIPS_ALLS_GID = '997908205'
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(WORKSPACE_DIR, 'js', 'datamass-data.js')
MANPOWER_JSON_FILE = os.path.join(WORKSPACE_DIR, 'manpower_data.json')
INVENTORY_1C_JSON_FILE = os.path.join(WORKSPACE_DIR, 'inventory_1c_data.json')
INVENTORY_1C_JS_FILE = os.path.join(WORKSPACE_DIR, 'js', 'inventory-1c-data.js')
MASS_HISTORY_JSON_FILE = os.path.join(WORKSPACE_DIR, 'mass_history_data.json')
MASS_HISTORY_JS_FILE = os.path.join(WORKSPACE_DIR, 'js', 'mass-history-data.js')
HARDTEST_JSON_FILE = os.path.join(WORKSPACE_DIR, 'hardtest_data.json')
HARDTEST_JS_FILE = os.path.join(WORKSPACE_DIR, 'js', 'hardtest-capacity-data.js')
CLIPS_ALLS_JSON_FILE = os.path.join(WORKSPACE_DIR, 'clips_alls_data.json')
CLIPS_ALLS_HISTORY_JSON_FILE = os.path.join(WORKSPACE_DIR, 'clips_alls_history.json')
CLIPS_ALLS_JS_FILE = os.path.join(WORKSPACE_DIR, 'js', 'clips-alls-data.js')
STATUS_FILE = os.path.join(WORKSPACE_DIR, 'sync_status.json')

def fetch_and_parse_manpower(ctx):
    """
    Tải và bóc tách dữ liệu nhân lực theo từng kíp A, B, C, D từ sheet Manpower.
    - Assy Shift = Tổng các Line trong ca (ví dụ Shift A = 1A + 2A + 3A).
    - Hard Test = Tổng nhân lực Hard Test của từng shift.
    """
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={MANPOWER_GID}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        content = resp.read().decode('utf-8', errors='ignore')

    reader = list(csv.reader(content.splitlines()))
    if len(reader) < 15:
        return {}

    rows_by_label = {}
    for r in reader:
        if len(r) > 1 and r[1].strip():
            label = r[1].strip()
            if label not in rows_by_label:
                rows_by_label[label] = r

    def parse_num(v):
        try:
            return float(v.strip().replace(',', ''))
        except:
            return 0.0

    row_direct = rows_by_label.get('Nhân Lực Trực Tiếp', [])
    row_total  = rows_by_label.get('TOTAL', [])
    row_leader = rows_by_label.get('SFPD Line Leader', [])
    row_feeder = rows_by_label.get('Hard Test Feeder', [])
    row_cr     = rows_by_label.get('Cleanroom Operator', [])
    row_ht_op  = rows_by_label.get('Hard Test Operator', [])

    shift_configs = {
        'A': {'name': 'Shift A', 'lines': ['1A', '2A', '3A'], 'assy_cols': [2, 3, 4], 'ht_col': 5, 'total_col': 6},
        'B': {'name': 'Shift B', 'lines': ['1B', '2B'], 'assy_cols': [7, 8], 'ht_col': 10, 'total_col': 11},
        'C': {'name': 'Shift C', 'lines': ['1C', '2C', '3C'], 'assy_cols': [12, 13, 14], 'ht_col': 15, 'total_col': 16},
        'D': {'name': 'Shift D', 'lines': ['1D', '2D'], 'assy_cols': [17, 18], 'ht_col': 20, 'total_col': 21},
    }

    result = {}
    for s_code, cfg in shift_configs.items():
        direct_assy_lines = {}
        total_assy_lines = {}
        for idx, col_idx in enumerate(cfg['assy_cols']):
            line_name = cfg['lines'][idx]
            d_val = parse_num(row_direct[col_idx]) if col_idx < len(row_direct) else 0.0
            t_val = parse_num(row_total[col_idx]) if col_idx < len(row_total) else 0.0
            direct_assy_lines[line_name] = d_val
            total_assy_lines[line_name] = t_val

        ht_direct = parse_num(row_direct[cfg['ht_col']]) if cfg['ht_col'] < len(row_direct) else 0.0
        ht_total = parse_num(row_total[cfg['ht_col']]) if cfg['ht_col'] < len(row_total) else 0.0
        
        cr = parse_num(row_cr[cfg['ht_col']]) if cfg['ht_col'] < len(row_cr) else 0.0
        ht_op = parse_num(row_ht_op[cfg['ht_col']]) if cfg['ht_col'] < len(row_ht_op) else 0.0
        ht_feeder = parse_num(row_feeder[cfg['ht_col']]) if cfg['ht_col'] < len(row_feeder) else 0.0
        ht_leader = parse_num(row_leader[cfg['ht_col']]) if cfg['ht_col'] < len(row_leader) else 0.0

        result[s_code] = {
            'shift': s_code,
            'name': cfg['name'],
            'assyDirect': sum(direct_assy_lines.values()),
            'assyTotal': sum(total_assy_lines.values()),
            'assyLinesDirect': direct_assy_lines,
            'assyLinesTotal': total_assy_lines,
            'htDirect': ht_direct,
            'htTotal': ht_total,
            'htBreakdown': {
                'cleanroom': cr,
                'operator': ht_op,
                'feeder': ht_feeder,
                'leader': ht_leader
            }
        }

    # Bổ sung nhóm Hành Chính (Line 3D: Direct 11, Total 16 - làm việc Ca Ngày T2-T6)
    hc_direct = parse_num(row_direct[22]) if 22 < len(row_direct) else 11.0
    hc_total  = parse_num(row_total[22]) if 22 < len(row_total) else 16.0
    if hc_direct <= 0:
        hc_direct = 11.0
    if hc_total <= 0:
        hc_total = 16.0

    result['HC'] = {
        'shift': 'HC',
        'name': 'Hành Chính',
        'lines': ['3D'],
        'assyDirect': hc_direct,
        'assyTotal': hc_total,
        'assyLinesDirect': {'3D': hc_direct},
        'assyLinesTotal': {'3D': hc_total},
        'htDirect': 0.0,
        'htTotal': 0.0,
        'htBreakdown': {
            'cleanroom': 0.0,
            'operator': 0.0,
            'feeder': 0.0,
            'leader': 0.0
        },
        'workShift': 'Day',
        'workingDays': 'Mon-Fri'
    }

    return result

def fetch_and_parse_inventory_1c(ctx):
    """
    Tải và bóc tách dữ liệu tồn kho WIP theo thời gian thực từ sheet 'Inventory 1C'.
    Đặc biệt: Lấy chính xác dữ liệu từ cột 'Final balance' theo từng mặt hàng và từng kho.
    Hỗ trợ tra cứu nhanh cả theo Mã Code (Material Code) và Tên Nomenclature.
    """
    import urllib.parse
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('Inventory 1C')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Lưu ý: Không tải được sheet=Inventory 1C ({e}), thử export qua GID...")
        url_fb = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={INVENTORY_1C_GID}'
        req_fb = urllib.request.Request(url_fb, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_fb, context=ctx, timeout=35) as resp_fb:
            content = resp_fb.read().decode('utf-8', errors='ignore')

    reader = csv.reader(content.splitlines())
    inv_by_nomen = {}
    inv_by_code = {}
    all_nomens = set()
    current_wh = ''
    total_stock_all = 0.0
    final_bal_idx = 6  # Cột Final balance chuẩn trong sheet Inventory 1C (cột G, 0-indexed = 6)
    code_idx = 2       # Cột Code trong sheet Inventory 1C (cột C, 0-indexed = 2)

    for r in reader:
        if not r:
            continue
        # Tự động nhận diện cột Final balance và Code từ hàng tiêu đề
        lower_row = [c.strip().lower() for c in r]
        if any('final balance' in c for c in lower_row):
            for i, c in enumerate(r):
                c_low = c.strip().lower()
                if 'final balance' in c_low:
                    final_bal_idx = i
                elif c_low.startswith('code'):
                    code_idx = i
            continue

        col0 = r[0].strip()
        if not col0:
            continue

        unit_str = r[1].strip() if len(r) > 1 else ''
        code_raw = r[code_idx].strip() if len(r) > code_idx else ''
        arr_str = r[4].strip() if len(r) > 4 else ''
        exp_str = r[5].strip() if len(r) > 5 else ''
        val_str = r[final_bal_idx].replace(',', '').strip() if len(r) > final_bal_idx else ''

        # Quy tắc nhận diện dòng Header phân tách kho:
        # Tên kho ở cột 0, không có đơn vị (unit) và không có mã code, có số tổng ở các cột Arrival/Expense/Final balance
        if not unit_str and not code_raw and (arr_str or exp_str or val_str):
            current_wh = col0
            continue

        all_nomens.add(col0)
        nomen = col0

        if not val_str:
            continue
        try:
            val = float(val_str)
        except:
            continue
        if val == 0:
            continue

        # 1. Lưu theo Tên Nomenclature
        if nomen not in inv_by_nomen:
            inv_by_nomen[nomen] = {
                'nomen': nomen,
                'code': code_raw,
                'total': 0.0,
                'warehouses': {}
            }
        inv_by_nomen[nomen]['total'] = round(inv_by_nomen[nomen]['total'] + val, 2)
        inv_by_nomen[nomen]['warehouses'][current_wh] = round(inv_by_nomen[nomen]['warehouses'].get(current_wh, 0.0) + val, 2)
        if code_raw and not inv_by_nomen[nomen]['code']:
            inv_by_nomen[nomen]['code'] = code_raw

        # 2. Lưu theo Mã Code (đệm số 9 chữ số và dạng thường)
        if code_raw:
            code_clean = code_raw.lstrip('0')
            code_pad9 = code_clean.zfill(9) if code_clean.isdigit() else code_raw
            for k in set([code_raw, code_clean, code_pad9]):
                if k not in inv_by_code:
                    inv_by_code[k] = {
                        'nomen': nomen,
                        'code': code_raw,
                        'total': 0.0,
                        'warehouses': {}
                    }
                inv_by_code[k]['total'] = round(inv_by_code[k]['total'] + val, 2)
                inv_by_code[k]['warehouses'][current_wh] = round(inv_by_code[k]['warehouses'].get(current_wh, 0.0) + val, 2)

        total_stock_all += val

    # Bổ sung trường tiện ích cho 4 kho chính: WH ASSEMBLY_VTP, PKG_VTP, Repair of semi-finished products_VTP, Repair of board_VTP
    for m in [inv_by_nomen, inv_by_code]:
        for k, v in m.items():
            whs = v.get('warehouses', {})
            v['whAssembly'] = whs.get('WH ASSEMBLY_VTP', 0.0)
            v['whPkg'] = whs.get('PKG_VTP', 0.0)
            v['whRepairSemi'] = whs.get('Repair of semi-finished products_VTP', 0.0)
            v['whRepairBoard'] = whs.get('Repair of board_VTP', 0.0)
            v['whHardTest'] = whs.get('WH of Hard Test_VTP', 0.0)

    # Kết hợp mapping để tra cứu nhanh bằng cả Code và Nomen
    combined_master_map = dict(inv_by_nomen)
    for k, v in inv_by_code.items():
        if k not in combined_master_map:
            combined_master_map[k] = v

    return {
        'items': combined_master_map,
        'byNomen': inv_by_nomen,
        'byCode': inv_by_code,
        'allNomens': list(all_nomens),
        'totalItems': len(inv_by_nomen),
        'totalCodes': len(inv_by_code),
        'totalStock': round(total_stock_all, 2),
        'lastUpdated': time.strftime('%Y-%m-%d %H:%M:%S')
    }

def fetch_and_parse_mass_history(ctx):
    """
    Tải và bóc tách dữ liệu lịch sử sản xuất & nguyên nhân thiếu hụt sản lượng từ sheet Mass-History (gid: 568706266).
    - Cột 1: Date (M/D/YYYY)
    - Cột 2: Shift (day / night)
    - Cột 3: Workcell
    - Cột 4: Line
    - Cột 5: Process (Công đoạn: ASSEMBLY, HARD TEST, Selective, PKG, SMD, etc.)
    - Cột 6: Model (Tên model / mã 1C)
    - Cột 7: Specification_Code
    - Cột 8: Plan_Qty
    - Cột 9: Fact_Qty
    - Cột 10: Gap_Qty
    - Cột 14: Shortage_Reason (Nguyên nhân âm)
    - Cột 15: Quality_Issue
    - Cột 17: Corrective_Action
    - Cột 20: Status
    """
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={MASS_HISTORY_GID}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=40) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Lưu ý: Không tải được Mass-History qua GID ({e}), thử sheet=Mass-History...")
        url_fb = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('Mass-History')
        req_fb = urllib.request.Request(url_fb, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_fb, context=ctx, timeout=40) as resp_fb:
            content = resp_fb.read().decode('utf-8', errors='ignore')

    reader = list(csv.reader(content.splitlines()))
    if len(reader) < 2:
        return []

    records = []
    for r in reader[1:]:
        if len(r) < 11:
            continue
        date_raw = r[1].strip()
        if not date_raw:
            continue

        d_parts = date_raw.split('/')
        iso_date = ''
        if len(d_parts) == 3:
            try:
                m, d, y = int(d_parts[0]), int(d_parts[1]), int(d_parts[2])
                iso_date = f'{y:04d}-{m:02d}-{d:02d}'
            except:
                iso_date = date_raw
        else:
            iso_date = date_raw

        shift = r[2].strip().lower() # 'day' or 'night'
        workcell = r[3].strip() if len(r) > 3 else ''
        line = r[4].strip() if len(r) > 4 else ''
        process = r[5].strip() if len(r) > 5 else ''
        model = r[6].strip() if len(r) > 6 else ''
        spec_code = r[7].strip() if len(r) > 7 else ''

        def parse_float(val):
            try:
                return float(str(val).replace(',', '').strip())
            except:
                return 0.0

        plan = parse_float(r[8]) if len(r) > 8 else 0.0
        fact = parse_float(r[9]) if len(r) > 9 else 0.0
        gap = parse_float(r[10]) if len(r) > 10 else 0.0

        reason = r[14].strip() if len(r) > 14 else ''
        quality = r[15].strip() if len(r) > 15 else ''
        corrective = r[17].strip() if len(r) > 17 else ''
        status = r[20].strip() if len(r) > 20 else ''

        if reason or gap < 0 or quality:
            records.append({
                'date': iso_date,
                'rawDate': date_raw,
                'shift': shift,
                'workcell': workcell,
                'line': line,
                'process': process,
                'model': model,
                'specCode': spec_code,
                'plan': plan,
                'fact': fact,
                'gap': gap,
                'reason': reason,
                'qualityIssue': quality,
                'correctiveAction': corrective,
                'status': status
            })

    return records

def fetch_and_parse_assembly_capacity(ctx):
    """
    Tải và bóc tách dữ liệu định mức Cycle time & Performance từng Line từ sheet 'Assembly Data'.
    - Cột Norm: Cycle time tiêu chuẩn (giây/chiếc - seconds/pc)
    - Cột 1 đến 12: Hiệu suất (Performance) của Line đó đối với Group Model / Bo mạch
    - Actual Cycle Time = Norm / Performance
    - Plan Tiêu Chuẩn / Ngày (21.41h) = (21.41 * 3600) / Norm = 77076 / Norm
      (Trong đó: Ca Ngày 10.83h = 38988s | Ca Đêm 10.58h = 38088s)
    - Plan Thực Tế / Ngày trên Line L = Plan Tiêu Chuẩn * Performance(L)
    - Tên Line lấy chuẩn xác theo sheet: 1A, 2A, 1B, 2B, 1C, 2C, 1D, 2D, 3A, 3B...
    - Thêm Product Name 1C từ sheet As Form
    """
    # 1. Tải trước Sheet As Form để lấy ánh xạ Product Name 1C
    as_form_url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('As Form')
    as_form_map = {}
    as_form_lines_map = {}
    try:
        req_af = urllib.request.Request(as_form_url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req_af, context=ctx, timeout=20) as resp_af:
            af_content = resp_af.read().decode('utf-8', errors='ignore')
            for row in csv.reader(af_content.splitlines()):
                if len(row) > 3 and row[1].strip() and row[3].strip():
                    c1 = row[1].strip()
                    c3 = row[3].strip()
                    if c3 not in ['Cập Nhật Data ở đây Model', 'TỔNG', 'Max Capa']:
                        as_form_map[c1] = c3
                        if len(row) > 9 and row[9].strip():
                            as_form_lines_map[c1] = row[9].strip()
    except Exception as e:
        print(f"Lưu ý: Không tải được sheet As Form: {e}")

    # 2. Tải Sheet (Nor) để lấy Cycle time tiêu chuẩn (Norm / Xtimer ASM - cột CY/103 hoặc 101)
    nor_url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('(Nor)')
    nor_map = {}
    try:
        req_nor = urllib.request.Request(nor_url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req_nor, context=ctx, timeout=25) as resp_nor:
            nor_content = resp_nor.read().decode('utf-8', errors='ignore')
            for nrow in list(csv.reader(nor_content.splitlines()))[6:]:
                if len(nrow) > 2 and nrow[2].strip():
                    nbrd = nrow[2].strip().lower()
                    ngrp = nrow[1].strip().lower()
                    # Col 103 or 101 (Xtimer ASM / Col CY)
                    nval = nrow[103].strip() if len(nrow) > 103 and nrow[103].strip() else (nrow[101].strip() if len(nrow) > 101 and nrow[101].strip() else '')
                    # Fallback for PreAsm (col 96)
                    if not nval and 'preasm' in nbrd and len(nrow) > 96 and nrow[96].strip():
                        nval = nrow[96].strip()
                    if nval:
                        try:
                            fval = float(nval.replace(',', ''))
                            if fval > 0:
                                nor_map[nbrd] = fval
                                if ngrp:
                                    nor_map[f'{ngrp} - {nbrd}'] = fval
                        except:
                            pass
    except Exception as e:
        print(f"Lưu ý: Không tải được sheet (Nor): {e}")

    # 3. Tải Sheet Assembly Data
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('Assembly Data')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        content = resp.read().decode('utf-8', errors='ignore')

    reader = list(csv.reader(content.splitlines()))
    if len(reader) < 3:
        return {'items': [], 'groups': [], 'lines': []}

    # Bảng ánh xạ cột sang tên Line thực tế của nhà máy: 1A, 2A, 1B, 2B, 1C, 2C, 1D, 2D, 3A, 3B, 3C, 3D, Line Support
    LINE_NAMES_MAP = {
        8: '1A', 9: '2A', 10: '1B', 11: '2B',
        12: '1C', 13: '2C', 14: '1D', 15: '2D',
        16: '3A', 17: '3B', 18: '3C', 19: '3D',
        20: 'Support'
    }

    line_cols = {}
    for c_idx in range(8, 21):
        if c_idx in LINE_NAMES_MAP:
            line_id = LINE_NAMES_MAP[c_idx]
            line_cols[c_idx] = {'id': line_id, 'name': line_id}

    TOTAL_DAY_SECONDS = 77076.0      # 21.41 * 3600 (Ngày 10.83h + Đêm 10.58h)
    DAY_SHIFT_SECONDS = 38988.0      # 10.83 * 3600
    NIGHT_SHIFT_SECONDS = 38088.0    # 10.58 * 3600

    items = []
    groups_map = {}

    for r_idx in range(2, len(reader)):
        r = reader[r_idx]
        group = r[1].strip() if len(r) > 1 else ''
        board = r[2].strip() if len(r) > 2 else ''
        norm_str = r[3].strip() if len(r) > 3 else ''
        if not group and not board:
            continue

        try:
            norm = float(norm_str.replace(',', ''))
        except:
            norm = 0.0

        if norm <= 0:
            board_key = board.lower()
            group_board_key = f'{group.lower()} - {board_key}'
            norm = nor_map.get(board_key, 0.0) or nor_map.get(group_board_key, 0.0)

        uph_std = round(3600.0 / norm, 1) if norm > 0 else 0.0
        day_cap_std = round(TOTAL_DAY_SECONDS / norm) if norm > 0 else 0
        day_shift_cap_std = round(DAY_SHIFT_SECONDS / norm) if norm > 0 else 0
        night_shift_cap_std = round(NIGHT_SHIFT_SECONDS / norm) if norm > 0 else 0

        # Ánh xạ Product Name 1C
        pname1c = as_form_map.get(f'{group} - {board}', '')
        if not pname1c:
            for ak, val in as_form_map.items():
                if board.lower() in ak.lower():
                    pname1c = val
                    break
        if not pname1c:
            pname1c = f'Ajax {group} (напівфабрикат)'

        line_perfs = {}
        for c_idx, l_info in line_cols.items():
            if c_idx < len(r) and r[c_idx].strip():
                val_str = r[c_idx].strip().replace('%', '')
                try:
                    pct = float(val_str)
                    perf = pct / 100.0 if pct > 1.0 else pct
                    act_ct = round(norm / perf, 2) if perf > 0 and norm > 0 else 0.0
                    act_uph = round(3600.0 / act_ct, 1) if act_ct > 0 else 0.0
                    act_day_cap = round(TOTAL_DAY_SECONDS / act_ct) if act_ct > 0 else 0
                    act_day_shift_cap = round(DAY_SHIFT_SECONDS / act_ct) if act_ct > 0 else 0
                    act_night_shift_cap = round(NIGHT_SHIFT_SECONDS / act_ct) if act_ct > 0 else 0

                    perf_data = {
                        'perf': perf,
                        'perfPct': round(perf * 100, 1),
                        'actualCycleTime': act_ct,
                        'actualUph': act_uph,
                        'actualShiftCapacity': act_day_cap,  # tương thích ngược
                        'actualDayCapacity': act_day_cap,
                        'actualDayShiftCapacity': act_day_shift_cap,
                        'actualNightShiftCapacity': act_night_shift_cap
                    }
                    if l_info['id'] == 'Support':
                        line_perfs['Support'] = perf_data
                        line_perfs['Support 1'] = dict(perf_data)
                        line_perfs['Support 2'] = dict(perf_data)
                        line_perfs['Support 3'] = dict(perf_data)
                    else:
                        line_perfs[l_info['id']] = perf_data
                except:
                    pass

        assigned_line = as_form_lines_map.get(f'{group} - {board}', '')
        if not assigned_line:
            for ak, lval in as_form_lines_map.items():
                if board.lower() in ak.lower():
                    assigned_line = lval
                    break

        item = {
            'id': f'asm_{r_idx}',
            'group': group,
            'board': board,
            'productName1C': pname1c,
            'asFormLine': assigned_line,
            'norm': norm,
            'uphStandard': uph_std,
            'shiftCapacityStandard': day_cap_std,   # tương thích ngược
            'dayCapacityStandard': day_cap_std,
            'dayShiftCapacityStandard': day_shift_cap_std,
            'nightShiftCapacityStandard': night_shift_cap_std,
            'lines': line_perfs
        }
        items.append(item)

        if group not in groups_map:
            groups_map[group] = {
                'group': group,
                'boardsCount': 0,
                'norms': set(),
                'linesSupported': set()
            }
        groups_map[group]['boardsCount'] += 1
        if norm > 0:
            groups_map[group]['norms'].add(norm)
        for lid in line_perfs.keys():
            groups_map[group]['linesSupported'].add(lid)

    # Format summary list of groups
    groups_summary = []
    for g_name, g_info in sorted(groups_map.items()):
        groups_summary.append({
            'group': g_name,
            'boardsCount': g_info['boardsCount'],
            'norms': sorted(list(g_info['norms'])),
            'avgNorm': round(sum(g_info['norms']) / len(g_info['norms']), 2) if g_info['norms'] else 0.0,
            'linesSupported': sorted(list(g_info['linesSupported']))
        })

    lines_summary = []
    for c_idx in sorted(line_cols.keys()):
        lid = line_cols[c_idx]['id']
        if lid == 'Support':
            for s_id in ['Support 1', 'Support 2', 'Support 3']:
                supported_items = [it for it in items if s_id in it['lines']]
                avg_perf = 0.0
                if supported_items:
                    avg_perf = round(sum(it['lines'][s_id]['perfPct'] for it in supported_items) / len(supported_items), 1)
                lines_summary.append({
                    'id': s_id,
                    'name': s_id,
                    'supportedBoardsCount': len(supported_items),
                    'supportedGroupsCount': len(set(it['group'] for it in supported_items)),
                    'avgPerfPct': avg_perf
                })
        else:
            supported_items = [it for it in items if lid in it['lines']]
            avg_perf = 0.0
            if supported_items:
                avg_perf = round(sum(it['lines'][lid]['perfPct'] for it in supported_items) / len(supported_items), 1)
            lines_summary.append({
                'id': lid,
                'name': line_cols[c_idx]['name'],
                'supportedBoardsCount': len(supported_items),
                'supportedGroupsCount': len(set(it['group'] for it in supported_items)),
                'avgPerfPct': avg_perf
            })

    return {
        'stage': 'ASSEMBLY',
        'items': items,
        'groups': groups_summary,
        'lines': lines_summary,
        'asFormLines': as_form_lines_map,
        'totalItems': len(items),
        'totalGroups': len(groups_summary)
    }

def fetch_and_parse_hardtest_capacity(ctx):
    """
    Tải và bóc tách dữ liệu định mức Năng Lực Cụm Hard Test từ sheet 'Hardtest Data'.
    Gồm các mục: Hardtest / OPTICS ASM / FOCUS.
    Quy chuẩn theo yêu cầu:
    1. Lấy theo norming group / board or operation.
    2. 'Cyclle Time on NOR 1 Test Block' -> là thời gian tiêu chuẩn.
    3. 'Số Lượng TB Test Block Q'ty' -> là số lượng thiết bị tương ứng (xử lý chuẩn trộn ô / merged cells).
    4. Tính UPH -> Capa day shift (10.83 giờ) -> Capa night shift (10.58 giờ).
    5. FTT là tỉ lệ pass của từng loại sản phẩm.
    6. Cột Downtime (Máy + Vật tư).
    7. CT Thực Tế = CT_nor * (1 + (1 - FTT) + Downtime).
    """
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('Hardtest Data')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    
    content = None
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Lưu ý: Không tải được sheet Hardtest Data qua gviz: {e}")
        try:
            fallback_url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=1614030832'
            req_fb = urllib.request.Request(fallback_url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req_fb, context=ctx, timeout=30) as resp_fb:
                content = resp_fb.read().decode('utf-8', errors='ignore')
        except Exception as e2:
            print(f"Fallback GID Hardtest Data cũng lỗi: {e2}")

    if not content:
        if os.path.exists(HARDTEST_JSON_FILE):
            try:
                with open(HARDTEST_JSON_FILE, 'r', encoding='utf-8') as cf:
                    return json.load(cf)
            except:
                pass
        return {'stage': 'TOTAL_HARDTEST', 'items': [], 'groups': [], 'subStages': [], 'totalItems': 0, 'totalGroups': 0}

    reader = list(csv.reader(content.splitlines()))
    if len(reader) < 2:
        return {'stage': 'TOTAL_HARDTEST', 'items': [], 'groups': [], 'subStages': [], 'totalItems': 0, 'totalGroups': 0}

    def parse_num(v):
        if not v: return 0.0
        v = v.strip().replace(',', '').replace('%', '')
        try:
            return float(v)
        except:
            return 0.0

    def parse_pct(v):
        if not v: return 0.0
        v = v.strip().replace(',', '')
        is_pct = '%' in v
        try:
            val = float(v.replace('%', ''))
            return val / 100.0 if (is_pct or val > 1.0) else val
        except:
            return 0.0

    TOTAL_DAY_SECONDS = 77076.0      # 21.41 * 3600 (Ngày 10.83h + Đêm 10.58h)
    DAY_SHIFT_SECONDS = 38988.0      # 10.83 * 3600
    NIGHT_SHIFT_SECONDS = 38088.0    # 10.58 * 3600

    items = []
    groups_map = {}
    current_shared_tb_qty = 0
    last_norming_group = ''

    for r_idx in range(1, len(reader)):
        r = reader[r_idx]
        norming = r[4].strip() if len(r) > 4 else ''
        board = r[5].strip() if len(r) > 5 else ''
        
        if not norming and not board:
            continue
            
        if norming:
            last_norming_group = norming
        else:
            norming = last_norming_group

        col6_str = r[6].strip() if len(r) > 6 else ''
        col7_str = r[7].strip() if len(r) > 7 else ''
        
        # Merged cell handling cho Số lượng thiết bị Test Block
        if col6_str:
            current_shared_tb_qty = parse_num(col6_str)
        
        tb_qty = parse_num(col7_str) if col7_str else current_shared_tb_qty
        if tb_qty == 0 and current_shared_tb_qty > 0:
            tb_qty = current_shared_tb_qty

        ct_norm = parse_num(r[8]) if len(r) > 8 else 0.0
        sheet_ct_act = parse_num(r[9]) if len(r) > 9 else 0.0
        ftt = parse_pct(r[10]) if len(r) > 10 else 1.0
        dt_mch = parse_pct(r[11]) if len(r) > 11 else 0.0
        dt_mat = parse_pct(r[12]) if len(r) > 12 else 0.0
        dt_total = dt_mch + dt_mat
        note = r[15].strip() if len(r) > 15 else ''
        col16 = r[16].strip().upper() if len(r) > 16 else ''
        
        sub_stage = 'HARD TEST'
        if 'FOCUS' in col16:
            sub_stage = 'FOCUS'
        elif 'OPTICS' in col16:
            sub_stage = 'OPTICS ASM'

        # Cycle Time Thực tế theo công thức chuẩn: CT_nor * (1 + (1 - FTT) + dt_mch + dt_mat)
        calc_ct_act = round(ct_norm * (1.0 + (1.0 - ftt) + dt_total), 2) if ct_norm > 0 else 0.0
        effective_ct_act = sheet_ct_act if sheet_ct_act > 0 else calc_ct_act

        # 1. UPH Tiêu Chuẩn & UPH Thực Tế
        uph_std = round((3600.0 * tb_qty) / ct_norm, 1) if (ct_norm > 0 and tb_qty > 0) else (round(3600.0 / ct_norm, 1) if ct_norm > 0 else 0.0)
        uph_act = round((3600.0 * tb_qty) / effective_ct_act, 1) if (effective_ct_act > 0 and tb_qty > 0) else (round(3600.0 / effective_ct_act, 1) if effective_ct_act > 0 else 0.0)

        # 2. Capa Ca Ngày (10.83 giờ = 38,988s)
        day_shift_std = round((DAY_SHIFT_SECONDS * tb_qty) / ct_norm) if (ct_norm > 0 and tb_qty > 0) else 0
        day_shift_act = round((DAY_SHIFT_SECONDS * tb_qty) / effective_ct_act) if (effective_ct_act > 0 and tb_qty > 0) else 0

        # 3. Capa Ca Đêm (10.58 giờ = 38,088s)
        night_shift_std = round((NIGHT_SHIFT_SECONDS * tb_qty) / ct_norm) if (ct_norm > 0 and tb_qty > 0) else 0
        night_shift_act = round((NIGHT_SHIFT_SECONDS * tb_qty) / effective_ct_act) if (effective_ct_act > 0 and tb_qty > 0) else 0

        # 4. Capa Cả Ngày (Tổng 21.41 giờ = 77,076s)
        total_day_std = day_shift_std + night_shift_std
        total_day_act = day_shift_act + night_shift_act

        is_shared = (note == 'Dùng Chung' or (col6_str == '' and tb_qty > 0))

        item = {
            'id': f'ht_{r_idx}',
            'rowIdx': r_idx,
            'stage': sub_stage,
            'group': norming,
            'board': board,
            'tbQty': int(tb_qty),
            'tbQtyOriginal': parse_num(col6_str) if col6_str else None,
            'isShared': is_shared,
            'note': note or ('Dùng Chung' if is_shared else 'Riêng'),
            'ctNorm': ct_norm,
            'ctActual': effective_ct_act,
            'calcCtActual': calc_ct_act,
            'ftt': ftt,
            'fttPct': round(ftt * 100, 2),
            'dtMachinePct': round(dt_mch * 100, 2),
            'dtMaterialPct': round(dt_mat * 100, 2),
            'dtTotalPct': round(dt_total * 100, 2),
            'uphStandard': uph_std,
            'uphActual': uph_act,
            'dayShiftCapacityStandard': day_shift_std,
            'dayShiftCapacityActual': day_shift_act,
            'nightShiftCapacityStandard': night_shift_std,
            'nightShiftCapacityActual': night_shift_act,
            'totalDayCapacityStandard': total_day_std,
            'totalDayCapacityActual': total_day_act
        }
        items.append(item)

        if norming not in groups_map:
            groups_map[norming] = {
                'group': norming,
                'boardsCount': 0,
                'tbQtyMax': 0,
                'stages': set()
            }
        groups_map[norming]['boardsCount'] += 1
        groups_map[norming]['tbQtyMax'] = max(groups_map[norming]['tbQtyMax'], int(tb_qty))
        groups_map[norming]['stages'].add(sub_stage)

    # Format summary list of groups
    groups_summary = []
    for g_name, g_info in sorted(groups_map.items()):
        groups_summary.append({
            'group': g_name,
            'boardsCount': g_info['boardsCount'],
            'tbQty': g_info['tbQtyMax'],
            'stages': sorted(list(g_info['stages']))
        })

    sub_stages_summary = [
        {'id': 'ALL', 'name': 'Tất cả Công Đoạn', 'count': len(items)},
        {'id': 'HARD TEST', 'name': 'Hard Test', 'count': len([i for i in items if i['stage'] == 'HARD TEST'])},
        {'id': 'OPTICS ASM', 'name': 'Optics ASM', 'count': len([i for i in items if i['stage'] == 'OPTICS ASM'])},
        {'id': 'FOCUS', 'name': 'Focus', 'count': len([i for i in items if i['stage'] == 'FOCUS'])}
    ]

    total_tb = sum(g['tbQty'] for g in groups_summary)

    result = {
        'stage': 'TOTAL_HARDTEST',
        'title': 'Total Hardtest (Hard Test / Optics ASM / Focus)',
        'items': items,
        'groups': groups_summary,
        'subStages': sub_stages_summary,
        'totalItems': len(items),
        'totalGroups': len(groups_summary),
        'totalTbQty': total_tb
    }

    try:
        with open(HARDTEST_JSON_FILE, 'w', encoding='utf-8') as cf:
            json.dump(result, cf, indent=2, ensure_ascii=False)
    except:
        pass

    return result

def fetch_and_parse_clips_alls(ctx):
    """
    Tải và bóc tách dữ liệu Kế hoạch tổng thể từ sheet Clip Alls trong Google Sheets.
    Cung cấp Plan cho công đoạn Clips All và tổng hợp số lượng mã có plan, >90%, <90%.
    Ưu tiên tải qua endpoint export?format=csv&gid=997908205 để lấy trọn vẹn 100% dòng
    không bị ảnh hưởng bởi bộ lọc (Filter View) tạm thời trên giao diện Google Sheets.
    """
    import urllib.parse
    content = None

    # 1. Thử tải qua export?format=csv (Lấy đủ 289 dòng, bỏ qua UI filter trên sheet)
    try:
        url_export = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={CLIPS_ALLS_GID}'
        req = urllib.request.Request(url_export, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
    except Exception as e_exp:
        print(f"⚠️ export?format=csv thất bại ({e_exp}), chuyển sang gviz/tq...")

    # 2. Fallback qua gviz/tq nếu export bị lỗi
    if not content or len(content.splitlines()) < 20:
        try:
            url_gviz = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={CLIPS_ALLS_GID}'
            req = urllib.request.Request(url_gviz, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                content = resp.read().decode('utf-8', errors='ignore')
        except Exception as e_gviz:
            url_name = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + urllib.parse.quote('Clip Alls')
            req = urllib.request.Request(url_name, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                content = resp.read().decode('utf-8', errors='ignore')

    reader = list(csv.reader(content.splitlines()))
    items = []
    by_device = {}
    total_plan = 0.0
    total_fact = 0.0
    done_count = 0

    for r in reader[8:]:
        if len(r) > 4:
            device = r[3].strip() if len(r) > 3 else ''
            cat = r[0].strip() if len(r) > 0 else ''
            grp = r[1].strip() if len(r) > 1 else ''
            agg = r[2].strip() if len(r) > 2 else ''
            if device and not any(k in device for k in ['Усього', 'Загальний', 'dim_products', 'Device', 'nomenclature_name']) and not any(k in agg for k in ['Усього', 'Загальний']):
                try:
                    p = float(r[4].replace(',', '').replace(' ', '')) if r[4] else 0.0
                except:
                    p = 0.0
                try:
                    f = float(r[5].replace(',', '').replace(' ', '')) if len(r) > 5 and r[5] else 0.0
                except:
                    f = 0.0

                # Cột Done Device (r[6]): 1 là hoàn thành >90%, 0 là chưa đạt
                done_val = 0
                if len(r) > 6 and r[6].strip():
                    try:
                        done_val = int(float(r[6].strip().replace(',', '')))
                    except:
                        done_val = 1 if (p > 0 and (f / p) >= 0.9) else 0
                else:
                    done_val = 1 if (p > 0 and (f / p) >= 0.9) else 0

                is_done = (done_val == 1)
                if is_done:
                    done_count += 1

                total_plan += p
                total_fact += f

                it = {
                    'category': cat,
                    'group': grp,
                    'agg': agg,
                    'device': device,
                    'plan': p,
                    'sheetFact': f,
                    'done': done_val,
                    'isDone': is_done
                }
                items.append(it)
                by_device[device] = it

    total_devices = len(items) # 247 mã
    not_done_count = total_devices - done_count # 61 mã
    rate_pct = (done_count / total_devices * 100) if total_devices > 0 else 0.0 # 75.3%
    rate_str = f"{rate_pct:.1f}%"

    has_plan = [it for it in items if it['plan'] > 0]

    return {
        'items': items,
        'byDevice': by_device,
        'totalItems': total_devices,
        'qtyAllDevice': total_devices,
        'qtyDoneDevice': done_count,
        'qtyNotDoneDevice': not_done_count,
        'clipAllPlant': rate_str,
        'clipAllPlantPct': round(rate_pct, 1),
        'totalPlan': total_plan,
        'totalSheetFact': total_fact,
        'hasPlanCount': len(has_plan),
        'gt90Count': done_count,
        'lt90Count': not_done_count
    }

def fetch_and_parse_bom(ctx):
    """
    Tải và bóc tách dữ liệu Định Mức Nguyên Vật Liệu (BOM) từ sheet 'BOM-Plan' trong Google Sheets.
    - Cấu trúc cột:
      * Specification code: Mã quy cách sản phẩm (bỏ số 0 ở đầu)
      * Specification: Tên thành phẩm
      * Manufacturing stage: Công đoạn (ASSEMBLY, PKG...)
      * Code sub: Mã nguyên vật liệu (Material Code)
      * Specification sub: Tên/Quy cách nguyên vật liệu (Nomenclature)
      * Qty sub: Định mức (Quantity)
      * Các ô được bôi màu (#6fa8dc) chính là SFG, còn lại là Material.
    """
    import urllib.parse, io, csv, re
    bom_by_product = {}
    BOM_PLAN_GID = '433347313'
    url_html = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/htmlview/sheet?headers=true&gid={BOM_PLAN_GID}'
    req = urllib.request.Request(url_html, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        styles = {}
        for m in re.finditer(r'\.([a-zA-Z0-9_\-]+)\s*\{([^}]+)\}', html):
            cls = m.group(1)
            body = m.group(2)
            bg_m = re.search(r'background-color:\s*([^;]+)', body)
            if bg_m:
                styles[cls] = bg_m.group(1).strip().lower()

        sfg_classes = set()
        for c, col in styles.items():
            if col in ['#6fa8dc', 'rgb(111, 168, 220)', 'rgb(111,168,220)']:
                sfg_classes.add(c)

        tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
        td_pattern = re.compile(r'<td[^>]*class=\"([^\"]*)\"[^>]*>(.*?)</td>', re.DOTALL)

        for tr_m in tr_pattern.finditer(html):
            tr_content = tr_m.group(1)
            tds = []
            has_sfg_class = False
            for td_m in td_pattern.finditer(tr_content):
                clss = td_m.group(1).split()
                val = re.sub(r'<[^>]+>', '', td_m.group(2)).strip()
                is_sfg_cell = any(c in sfg_classes for c in clss)
                if is_sfg_cell:
                    has_sfg_class = True
                tds.append({'text': val, 'is_sfg': is_sfg_cell})

            texts = [td['text'] for td in tds]
            if len(texts) < 9 or 'Specification code' in texts:
                continue

            offset = 1 if texts[0].isdigit() and len(texts) > 10 else 0
            spec_code_raw = texts[offset + 3]
            spec_name = texts[offset + 4]
            stage = texts[offset + 5]
            code_sub = texts[offset + 6]
            spec_sub = texts[offset + 7]
            qty_sub_str = texts[offset + 8]

            if not spec_code_raw or not code_sub:
                continue

            try:
                qty_sub = float(qty_sub_str.replace(',', '').strip())
            except:
                qty_sub = 1.0

            # Quy tắc chuẩn: Cột Nomenclature (spec_sub) có chữ "Ajax" ở đầu thì đó mới là SFG
            is_ajax_sfg = spec_sub.strip().lower().startswith('ajax')
            cat = 'SFG' if is_ajax_sfg else 'Material'
            clean_code = spec_code_raw.lstrip('0') or spec_code_raw
            pad_code = clean_code.zfill(9) if clean_code.isdigit() else clean_code

            mat_item = {
                'materialCode': code_sub,
                'nomenclature': spec_sub,
                'spec': spec_sub,
                'quantity': qty_sub,
                'category': cat,
                'process': stage,
                'stage': stage
            }

            if clean_code not in bom_by_product:
                bom_by_product[clean_code] = {
                    'productCode': clean_code,
                    'specCode': clean_code,
                    'productName': spec_name,
                    'stage': stage,
                    'process': stage,
                    'materials': []
                }
            bom_by_product[clean_code]['materials'].append(mat_item)

            if pad_code != clean_code and pad_code not in bom_by_product:
                bom_by_product[pad_code] = bom_by_product[clean_code]

        # 2. Tải thêm từ Sheet 'BOM' để bổ sung các mã chưa có trong 'BOM-Plan' (ví dụ mã 57257)
        try:
            url_bom_csv = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=BOM'
            req_bom = urllib.request.Request(url_bom_csv, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req_bom, context=ctx, timeout=30) as resp_bom:
                content_bom = resp_bom.read().decode('utf-8', errors='ignore')
            reader_bom = csv.reader(io.StringIO(content_bom))
            rows_bom = list(reader_bom)
            added_from_bom_sheet = set()
            for r in rows_bom[1:]:
                if len(r) < 6:
                    continue
                prod_code_raw = r[0].strip()
                if not prod_code_raw or 'Product_code' in prod_code_raw:
                    continue
                clean_code = prod_code_raw.lstrip('0') or prod_code_raw
                pad_code = clean_code.zfill(9) if clean_code.isdigit() else clean_code

                # Nếu mã này đã có trong BOM-Plan (không phải do BOM sheet thêm vào) và có danh sách materials > 0 -> giữ nguyên BOM-Plan
                if clean_code in bom_by_product and clean_code not in added_from_bom_sheet and len(bom_by_product[clean_code].get('materials', [])) > 0:
                    continue

                stage = r[1].strip() if len(r) > 1 else ''
                pname = r[3].strip() if len(r) > 3 else ''
                mat_code = r[4].strip() if len(r) > 4 else ''
                nom = r[5].strip() if len(r) > 5 else ''
                spec = r[6].strip() if len(r) > 6 else nom
                qty_str = r[7].strip() if len(r) > 7 else '1'
                try:
                    qty = float(qty_str.replace(',', '').strip())
                except:
                    qty = 1.0

                cat = r[8].strip() if len(r) > 8 else ''
                if not cat:
                    cat = 'SFG' if nom.strip().lower().startswith('ajax') else 'Material'

                if clean_code not in bom_by_product:
                    bom_by_product[clean_code] = {
                        'productCode': clean_code,
                        'specCode': clean_code,
                        'productName': pname,
                        'stage': stage,
                        'process': stage,
                        'materials': [],
                        'source': 'BOM'
                    }
                    added_from_bom_sheet.add(clean_code)

                bom_by_product[clean_code]['materials'].append({
                    'materialCode': mat_code,
                    'nomenclature': nom,
                    'spec': spec,
                    'quantity': qty,
                    'category': cat,
                    'process': stage,
                    'stage': stage
                })

                if pad_code != clean_code:
                    bom_by_product[pad_code] = bom_by_product[clean_code]

            print(f"✅ Đã kết hợp thêm {len(added_from_bom_sheet)} mã sản phẩm từ Sheet BOM (trong đó có mã 57257)!")
        except Exception as bom_err:
            print(f"⚠️ Lỗi kết hợp Sheet BOM: {bom_err}")

        # Sắp xếp các SFG (có tên bắt đầu bằng 'Ajax') lên đầu danh sách nguyên vật liệu của mỗi sản phẩm
        for prod in bom_by_product.values():
            if 'materials' in prod and prod['materials']:
                prod['materials'].sort(
                    key=lambda m: 0 if (m.get('nomenclature') or m.get('spec') or '').strip().lower().startswith('ajax') else 1
                )

        print(f"✅ Đã tổng hợp Sheet BOM-Plan & Sheet BOM: {len(bom_by_product)} mã sản phẩm (Đã xếp SFG lên đầu)")
    except Exception as e:
        print(f"⚠️ Lỗi tải Sheet BOM: {e}")
        if os.path.exists('bom_data.json'):
            with open('bom_data.json', 'r', encoding='utf-8') as bf:
                bom_by_product = json.load(bf)

    if bom_by_product:
        with open('bom_data.json', 'w', encoding='utf-8') as bf:
            json.dump(bom_by_product, bf, ensure_ascii=False, indent=2)
        with open('js/bom-data.js', 'w', encoding='utf-8') as jf:
            jf.write('window.BOM_MASTER_DATA = ' + json.dumps(bom_by_product, ensure_ascii=False) + ';\n')
    return bom_by_product

def sync_datamass():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    t0 = time.time()
    
    # 0. Đồng bộ Sheet Manpower (Bảo toàn dữ liệu cũ nếu mạng lag hoặc timeout)
    try:
        manpower_sheet_data = fetch_and_parse_manpower(ctx)
        if manpower_sheet_data and len(manpower_sheet_data) > 0 and 'A' in manpower_sheet_data:
            with open(MANPOWER_JSON_FILE, 'w', encoding='utf-8') as mf:
                json.dump(manpower_sheet_data, mf, indent=2, ensure_ascii=False)
        else:
            raise ValueError("Sheet Manpower trả về rỗng")
    except Exception as me:
        print(f"⚠️ Không thể tải Sheet Manpower: {me} -> Đang giữ dữ liệu ca kíp hiện có")
        if os.path.exists(MANPOWER_JSON_FILE):
            try:
                with open(MANPOWER_JSON_FILE, 'r', encoding='utf-8') as mf:
                    manpower_sheet_data = json.load(mf)
            except:
                manpower_sheet_data = {}
        else:
            manpower_sheet_data = {}

    # 0b. Đồng bộ Sheet Assembly Data (Capacity & Line Performance)
    try:
        assembly_capacity_data = fetch_and_parse_assembly_capacity(ctx)
    except Exception as ce:
        print(f"⚠️ Không thể tải Sheet Assembly Data: {ce}")
        assembly_capacity_data = {'stage': 'ASSEMBLY', 'items': [], 'groups': [], 'lines': [], 'totalItems': 0, 'totalGroups': 0}

    # 0b2. Đồng bộ Sheet Hardtest Data (Total Hardtest: Hardtest, Optics ASM, Focus)
    try:
        hardtest_capacity_data = fetch_and_parse_hardtest_capacity(ctx)
        print(f"✅ Đã đồng bộ Sheet Hardtest Data: {hardtest_capacity_data['totalItems']} mã ({hardtest_capacity_data['totalGroups']} groups, {hardtest_capacity_data['totalTbQty']} test blocks)")
    except Exception as he:
        print(f"⚠️ Không thể tải Sheet Hardtest Data: {he}")
        hardtest_capacity_data = {'stage': 'TOTAL_HARDTEST', 'items': [], 'groups': [], 'subStages': [], 'totalItems': 0, 'totalGroups': 0, 'totalTbQty': 0}

    # 0c. Đồng bộ Sheet Inventory 1C (Tồn kho WIP cập nhật đầu ngày)
    inventory_1c_data = None
    try:
        inventory_1c_data = fetch_and_parse_inventory_1c(ctx)
        if inventory_1c_data and inventory_1c_data['totalItems'] > 0:
            with open(INVENTORY_1C_JSON_FILE, 'w', encoding='utf-8') as inv_f:
                json.dump(inventory_1c_data, inv_f, indent=2, ensure_ascii=False)
            with open(INVENTORY_1C_JS_FILE, 'w', encoding='utf-8') as inv_js:
                inv_js.write('// Tự động sinh từ Google Sheet Inventory 1C - Cập nhật đầu ngày làm việc\n')
                inv_js.write('window.INVENTORY_1C_MASTER_DATA = ' + json.dumps(inventory_1c_data['items'], ensure_ascii=False) + ';\n')
            print(f"✅ Đã đồng bộ Sheet Inventory 1C: {inventory_1c_data['totalItems']} mặt hàng ({inventory_1c_data['totalStock']:,.0f} pcs)")
    except Exception as ie:
        print(f"⚠️ Không thể tải Sheet Inventory 1C: {ie}")
        if os.path.exists(INVENTORY_1C_JSON_FILE):
            try:
                with open(INVENTORY_1C_JSON_FILE, 'r', encoding='utf-8') as inv_f:
                    inventory_1c_data = json.load(inv_f)
            except:
                inventory_1c_data = None

    # 0d. Đồng bộ Sheet Mass-History (Lịch sử thiếu hụt & nguyên nhân âm theo ca và ngày)
    mass_history_data = []
    try:
        mass_history_data = fetch_and_parse_mass_history(ctx)
        if mass_history_data and len(mass_history_data) > 0:
            with open(MASS_HISTORY_JSON_FILE, 'w', encoding='utf-8') as mh_f:
                json.dump(mass_history_data, mh_f, ensure_ascii=False)
            with open(MASS_HISTORY_JS_FILE, 'w', encoding='utf-8') as mh_js:
                mh_js.write('// Tự động sinh từ Google Sheet Mass-History - Cập nhật nguyên nhân âm sản lượng theo ca & ngày\n')
                mh_js.write('window.MASS_HISTORY_DATA = ' + json.dumps(mass_history_data, ensure_ascii=False) + ';\n')
            print(f"✅ Đã đồng bộ Sheet Mass-History: {len(mass_history_data)} bản ghi thiếu hụt / nguyên nhân âm")
    except Exception as mhe:
        print(f"⚠️ Không thể tải Sheet Mass-History: {mhe}")
        if os.path.exists(MASS_HISTORY_JSON_FILE):
            try:
                with open(MASS_HISTORY_JSON_FILE, 'r', encoding='utf-8') as mh_f:
                    mass_history_data = json.load(mh_f)
            except:
                mass_history_data = []

    # 0e. Đồng bộ Sheet Clip Alls (Kế hoạch tổng thể & chỉ tiêu công đoạn Clip All)
    clips_alls_data = None
    try:
        clips_alls_data = fetch_and_parse_clips_alls(ctx)
        if clips_alls_data and clips_alls_data['totalItems'] > 0:
            # 1. Nạp lịch sử các tháng đã lưu trước đó (Bảo toàn vĩnh viễn tháng 10 và các tháng cũ)
            history_data = {'months': ['2026-10'], 'snapshots': {}}
            if os.path.exists(CLIPS_ALLS_HISTORY_JSON_FILE):
                try:
                    with open(CLIPS_ALLS_HISTORY_JSON_FILE, 'r', encoding='utf-8') as h_f:
                        history_data = json.load(h_f)
                except Exception as ex_h:
                    print(f"⚠️ Không thể đọc lịch sử Clips All: {ex_h}")

            # 2. Xác định kỳ tháng của dữ liệu đồng bộ
            now_t = time.localtime()
            cur_month_key = f"{now_t.tm_year}-{now_t.tm_mon:02d}"

            # Lưu snapshot cho kỳ hiện tại vào history_data
            snapshot_cur = {
                'month': cur_month_key,
                'monthLabel': f"Tháng {now_t.tm_mon:02d}/{now_t.tm_year}",
                'archivedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
                'totalItems': clips_alls_data.get('totalItems', 0),
                'totalPlan': clips_alls_data.get('totalPlan', 0.0),
                'totalSheetFact': clips_alls_data.get('totalSheetFact', 0.0),
                'qtyAllDevice': clips_alls_data.get('qtyAllDevice', 0),
                'qtyDoneDevice': clips_alls_data.get('qtyDoneDevice', 0),
                'qtyNotDoneDevice': clips_alls_data.get('qtyNotDoneDevice', 0),
                'clipAllPlant': clips_alls_data.get('clipAllPlant', '0.0%'),
                'items': clips_alls_data.get('items', []),
                'byDevice': clips_alls_data.get('byDevice', {})
            }

            if 'snapshots' not in history_data:
                history_data['snapshots'] = {}
            history_data['snapshots'][cur_month_key] = snapshot_cur
            if cur_month_key not in history_data.get('months', []):
                history_data.setdefault('months', []).append(cur_month_key)

            # Gắn trường history vào clips_alls_data
            clips_alls_data['history'] = history_data

            # 3. Ghi ra tệp JSON lịch sử và tệp JS
            with open(CLIPS_ALLS_HISTORY_JSON_FILE, 'w', encoding='utf-8') as h_f:
                json.dump(history_data, h_f, indent=2, ensure_ascii=False)
            with open(CLIPS_ALLS_JSON_FILE, 'w', encoding='utf-8') as ca_f:
                json.dump(clips_alls_data, ca_f, indent=2, ensure_ascii=False)
            with open(CLIPS_ALLS_JS_FILE, 'w', encoding='utf-8') as ca_js:
                ca_js.write('// Tự động sinh từ Google Sheet Clip Alls - Kế hoạch tổng thể công đoạn Clips All\n')
                ca_js.write('// Đã lưu trữ lịch sử Plan theo từng tháng (Tháng 10/2026: 01/Oct - 31/Oct, Tháng 11/2026...)\n')
                ca_js.write('window.CLIPS_ALLS_HISTORY = ' + json.dumps(history_data, ensure_ascii=False) + ';\n')
                ca_js.write('window.CLIPS_ALLS_MASTER_DATA = ' + json.dumps(clips_alls_data, ensure_ascii=False) + ';\n')
                ca_js.write('if (window.CLIPS_ALLS_MASTER_DATA) { window.CLIPS_ALLS_MASTER_DATA.history = window.CLIPS_ALLS_HISTORY; }\n')

            print(f"✅ Đã đồng bộ Sheet Clip Alls: {clips_alls_data['totalItems']} mặt hàng (Plan: {clips_alls_data['totalPlan']:,.0f} pcs, {clips_alls_data['hasPlanCount']} có plan). Đã lưu lịch sử {len(history_data.get('months', []))} tháng.")
    except Exception as cae:
        print(f"⚠️ Không thể tải Sheet Clip Alls: {cae}")
        if os.path.exists(CLIPS_ALLS_JSON_FILE):
            try:
                with open(CLIPS_ALLS_JSON_FILE, 'r', encoding='utf-8') as ca_f:
                    clips_alls_data = json.load(ca_f)
            except:
                clips_alls_data = None

    # 0f. Đồng bộ Sheet BOM (Định mức nguyên vật liệu)
    try:
        fetch_and_parse_bom(ctx)
    except Exception as bome:
        print(f"⚠️ Lỗi khi đồng bộ BOM: {bome}")

    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={DATA_MASS_GID}'
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
    t_down = time.time()

    reader = csv.reader(content.splitlines())
    try:
        r1 = next(reader)
        r2 = next(reader)
        r3 = next(reader)
    except StopIteration:
        raise ValueError('Google Sheet CSV rỗng hoặc không đúng cấu trúc.')

    # 1. Phát hiện các chu kỳ tuần và các ca làm việc
    weeks = []
    currentDays = []
    for c in range(13, len(r2)):
        val = r2[c].strip()
        if not val:
            continue
        if 'deviation' in val:
            label = val.replace('deviation', '').strip()
            if len(currentDays) >= 5:
                weeks.append({'label': label, 'summaryCol': c, 'days': currentDays})
            currentDays = []
        elif '/' in val:
            shift = r3[c].strip() if c < len(r3) else ''
            currentDays.append({'date': val, 'col': c, 'shift': shift})

    # Nhóm các ngày còn lại từ 22/10 trở đi thành các chu kỳ 7 ngày (14 ca)
    if len(currentDays) > 0:
        chunk_size = 14
        for i in range(0, len(currentDays), chunk_size):
            chunk = currentDays[i:i + chunk_size]
            d_first = chunk[0]['date'].split('/')
            d_last = chunk[-1]['date'].split('/')
            label = f'{int(d_first[1]):02d}/{int(d_first[0]):02d}-{int(d_last[1]):02d}/{int(d_last[0]):02d}'
            weeks.append({'label': label, 'summaryCol': chunk[-1]['col'], 'days': chunk})

    validDates = []
    seen = set()
    for w in weeks:
        for d in w['days']:
            if d['date'] not in seen:
                seen.add(d['date'])
                validDates.append(d['date'])

    all_rows = list(reader)

    # 2. Bóc tách dữ liệu Nhân lực (Hàng 4 đến 40, index 0 đến 36)
    manpower = []
    for r_idx in range(len(all_rows)):
        row_num = r_idx + 4
        if row_num > 40:
            break
        r = all_rows[r_idx]
        stage = r[0].strip() if len(r) > 0 else ''
        metric = r[1].strip() if len(r) > 1 else ''
        if not stage:
            continue

        mpItem = {'stage': stage, 'metric': metric or 'People', 'daily': {}}
        for w in weeks:
            for d in w['days']:
                c = d['col']
                if c < len(r):
                    raw = r[c].replace(',', '').strip()
                    num = 0.0
                    if raw:
                        try:
                            num = float(raw)
                        except:
                            num = 0.0
                    rounded = round(num, 1)
                    if d['shift'] in ['Day', 'Night']:
                        mpItem['daily'][d['date'] + '_' + d['shift']] = rounded
                        mpItem['daily'][d['date']] = round(mpItem['daily'].get(d['date'], 0.0) + rounded, 1)
                    else:
                        if rounded != 0:
                            mpItem['daily'][d['date']] = rounded
                            d_val = round(rounded * 0.6, 1)
                            mpItem['daily'][d['date'] + '_Day'] = d_val
                            mpItem['daily'][d['date'] + '_Night'] = round(rounded - d_val, 1)
        manpower.append(mpItem)

    # 3. Bóc tách sản lượng chi tiết theo Model (Hàng 41 trở xuống, index 37 trở đi)
    itemsDict = {}
    for r_idx in range(len(all_rows)):
        row_num = r_idx + 4
        if row_num < 41:
            continue
        r = all_rows[r_idx]
        # Tự động thích ứng với cấu trúc cột của sheet Data_Mass (hỗ trợ cả cột 8 lẫn cột 7 cho plan/fact)
        if len(r) > 8 and r[8].strip().lower() in ['plan', 'fact']:
            stage = r[0].strip()
            pname = r[1].strip()
            pnameEng = r[2].strip() if len(r) > 2 else ''
            specCode = r[3].strip() if len(r) > 3 else ''
            fpArticule = r[5].strip() if len(r) > 5 else ''
            lastStep = r[6].strip() if len(r) > 6 else ''
            model = r[7].strip() if len(r) > 7 else ''
            pkey = r[8].strip().lower()
            normKey = r[9].strip() if len(r) > 9 else ''
            normName = r[10].strip() if len(r) > 10 else ''
            try:
                norm = float(r[11].replace(',', '').strip()) if len(r) > 11 else 0.0
            except:
                norm = 0.0
        else:
            stage = r[0].strip()
            pname = r[1].strip()
            pnameEng = r[2].strip() if len(r) > 2 else ''
            specCode = r[3].strip() if len(r) > 3 else ''
            fpArticule = r[4].strip() if len(r) > 4 else ''
            lastStep = r[5].strip() if len(r) > 5 else ''
            model = r[6].strip() if len(r) > 6 else ''
            pkey = r[7].strip().lower() if len(r) > 7 else ''
            normKey = r[8].strip() if len(r) > 8 else ''
            normName = r[9].strip() if len(r) > 9 else ''
            try:
                norm = float(r[10].replace(',', '').strip()) if len(r) > 10 else 0.0
            except:
                norm = 0.0

        if not stage or not pname or pkey not in ['plan', 'fact']:
            continue
        # Bỏ qua các hàng nhãn nhân lực / tổng hợp bị lẫn
        if pname.lower() in ['people', 'hours']:
            continue

        # Tách Norm Key: ví dụ "DoorProtect - DP.011.MBR.001v3" -> lấy sau dấu - thành "DP.011.MBR.001v3"
        normKeyShort = normKey.split(' - ')[-1].strip() if ' - ' in normKey else normKey.strip()

        # Tra cứu tồn kho WIP từ Inventory 1C
        matched_stock = 0.0
        matched_whs = {}
        if inventory_1c_data and 'items' in inventory_1c_data:
            inv_map = inventory_1c_data['items']
            all_nomens_set = set(inventory_1c_data.get('allNomens', []))
            matched_inv = None

            # 1. Khớp chính xác tên tiếng Ukraine hoặc tên tiếng Anh
            if pname in inv_map:
                matched_inv = inv_map[pname]
            elif pnameEng and pnameEng in inv_map:
                matched_inv = inv_map[pnameEng]
            elif pname in all_nomens_set or (pnameEng and pnameEng in all_nomens_set):
                # Mã này có trong danh mục 1C nhưng số tồn bằng 0 -> giữ nguyên 0, không mượn tồn của mã khác
                matched_inv = None
            else:
                # 2. Khớp sau khi bỏ hậu tố phụ (BOT)/(TOP)
                pname_clean = pname.replace('(BOT)', '').replace('(TOP)', '').strip()
                if pname_clean in inv_map:
                    matched_inv = inv_map[pname_clean]
                elif pname_clean in all_nomens_set:
                    matched_inv = None
                elif normKeyShort and normKeyShort != '-':
                    # Chỉ fallback cho công đoạn phôi mạch dùng chung (SMD, LAQ, DIP thô)
                    st = stage.upper()
                    if 'SMD' in st or 'LAQ' in st or 'DIP' in st:
                        for n, data_obj in inv_map.items():
                            if normKeyShort in n:
                                if ('SMD' in st or 'LAQ' in st) and ('board with components' in n or 'плата з комп' in n):
                                    matched_inv = data_obj
                                    break
                                elif 'DIP' in st and ('_DIP' in n):
                                    matched_inv = data_obj
                                    break
            if matched_inv:
                matched_stock = matched_inv.get('total', 0.0)
                matched_whs = matched_inv.get('warehouses', {})

        key = f'{stage}|||{model}|||{pname}'
        if key not in itemsDict:
            itemsDict[key] = {
                'stage': stage,
                'model': model,
                'productName1C': pname,
                'productNameEnglish': pnameEng,
                'specCode': specCode,
                'fpArticule': fpArticule,
                'normKey': normKey,
                'normKeyShort': normKeyShort,
                'lastStep': lastStep,
                'norm': norm,
                'normName': normName,
                'stock1C': matched_stock,
                'stock1CWarehouses': matched_whs,
                'plan': {},
                'fact': {},
                'planDay': {},
                'planNight': {},
                'factDay': {},
                'factNight': {}
            }
        else:
            if lastStep and not itemsDict[key].get('lastStep'):
                itemsDict[key]['lastStep'] = lastStep
            if normKey and not itemsDict[key].get('normKey'):
                itemsDict[key]['normKey'] = normKey
                itemsDict[key]['normKeyShort'] = normKeyShort

        for w in weeks:
            for d in w['days']:
                c = d['col']
                if c < len(r):
                    raw = r[c].replace(',', '').strip()
                    if raw:
                        try:
                            num = float(raw)
                            if num > 0:
                                rounded = round(num)
                                if d['shift'] == 'Day':
                                    itemsDict[key][f'{pkey}Day'][d['date']] = itemsDict[key][f'{pkey}Day'].get(d['date'], 0) + rounded
                                    itemsDict[key][pkey][d['date']] = itemsDict[key][pkey].get(d['date'], 0) + rounded
                                elif d['shift'] == 'Night':
                                    itemsDict[key][f'{pkey}Night'][d['date']] = itemsDict[key][f'{pkey}Night'].get(d['date'], 0) + rounded
                                    itemsDict[key][pkey][d['date']] = itemsDict[key][pkey].get(d['date'], 0) + rounded
                                else:
                                    itemsDict[key][pkey][d['date']] = itemsDict[key][pkey].get(d['date'], 0) + rounded
                                    d_val = round(rounded * 0.6)
                                    itemsDict[key][f'{pkey}Day'][d['date']] = itemsDict[key][f'{pkey}Day'].get(d['date'], 0) + d_val
                                    itemsDict[key][f'{pkey}Night'][d['date']] = itemsDict[key][f'{pkey}Night'].get(d['date'], 0) + (rounded - d_val)
                        except:
                            pass

    items = [it for it in itemsDict.values() if len(it['plan']) > 0 or len(it['fact']) > 0]

    v_timestamp = int(time.strftime('%Y%m%d%H%M'))
    data = {
        'dates': validDates,
        'weeks': weeks,
        'manpower': manpower,
        'manpowerSheet': manpower_sheet_data,
        'items': items,
        'assemblyCapacity': assembly_capacity_data,
        'hardtestCapacity': hardtest_capacity_data,
        'massHistory': mass_history_data,
        'clipsAlls': clips_alls_data,
        '_v': v_timestamp
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('window.DEFAULT_DATAMASS_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
        f.write('window.MANPOWER_MASTER_DATA = ' + json.dumps(manpower_sheet_data, ensure_ascii=False) + ';\n')
        f.write('window.ASSEMBLY_CAPACITY_DATA = ' + json.dumps(assembly_capacity_data, ensure_ascii=False) + ';\n')
        f.write('window.HARDTEST_CAPACITY_DATA = ' + json.dumps(hardtest_capacity_data, ensure_ascii=False) + ';\n')
        f.write('window.MASS_HISTORY_DATA = ' + json.dumps(mass_history_data, ensure_ascii=False) + ';\n')
        if clips_alls_data:
            f.write('window.CLIPS_ALLS_MASTER_DATA = ' + json.dumps(clips_alls_data, ensure_ascii=False) + ';\n')

    cap_file = os.path.join(WORKSPACE_DIR, 'js', 'assembly-capacity-data.js')
    with open(cap_file, 'w', encoding='utf-8') as cf:
        cf.write('window.ASSEMBLY_CAPACITY_DATA = ' + json.dumps(assembly_capacity_data, ensure_ascii=False) + ';\n')

    hardtest_cap_file = os.path.join(WORKSPACE_DIR, 'js', 'hardtest-capacity-data.js')
    with open(hardtest_cap_file, 'w', encoding='utf-8') as hf:
        hf.write('window.HARDTEST_CAPACITY_DATA = ' + json.dumps(hardtest_capacity_data, ensure_ascii=False) + ';\n')

    status = {
        'success': True,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'version': v_timestamp,
        'download_seconds': round(t_down - t0, 2),
        'total_seconds': round(time.time() - t0, 2),
        'items_count': len(items),
        'dates_count': len(validDates),
        'weeks_count': len(weeks),
        'inventory_items_count': inventory_1c_data['totalItems'] if inventory_1c_data else 0,
        'inventory_total_stock': inventory_1c_data['totalStock'] if inventory_1c_data else 0,
        'mass_history_count': len(mass_history_data),
        'hardtest_items_count': hardtest_capacity_data.get('totalItems', 0)
    }

    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

    return status

def sync_clips_alls_only(target_month='2026-11', period_name='01/Nov - 30/Nov', month_label='Tháng 11/2026 (01/Nov - 30/Nov)', from_date='2026-11-01', to_date='2026-11-30'):
    """
    Đồng bộ độc lập Kế hoạch Clips All từ sheet 'Clip Alls' trên Google Sheets.
    Lưu snapshot cho tháng mới (ví dụ Tháng 11/2026) mà không làm mất lịch sử Tháng 10.
    """
    t0 = time.time()
    ctx = ssl._create_unverified_context()
    clips_alls_data = fetch_and_parse_clips_alls(ctx)
    if not clips_alls_data or clips_alls_data.get('totalItems', 0) == 0:
        return {'success': False, 'error': 'Không thể tải hoặc sheet Clip Alls rỗng'}

    # 1. Nạp lịch sử các tháng đã lưu trước đó (Bảo toàn tháng 10 và các kỳ cũ)
    history_data = {'months': ['2026-10'], 'snapshots': {}}
    if os.path.exists(CLIPS_ALLS_HISTORY_JSON_FILE):
        try:
            with open(CLIPS_ALLS_HISTORY_JSON_FILE, 'r', encoding='utf-8') as h_f:
                history_data = json.load(h_f)
        except Exception as ex_h:
            print(f"⚠️ Không thể đọc lịch sử Clips All: {ex_h}")

    if 'snapshots' not in history_data:
        history_data['snapshots'] = {}
    if 'months' not in history_data:
        history_data['months'] = []

    # 2. Tạo snapshot cho kỳ mới
    snapshot_new = {
        'month': target_month,
        'monthLabel': month_label or f"Tháng {target_month}",
        'fromDate': from_date or f"{target_month}-01",
        'toDate': to_date or f"{target_month}-30",
        'periodName': period_name or f"Kỳ {target_month}",
        'archivedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
        'totalItems': clips_alls_data.get('totalItems', 0),
        'totalPlan': clips_alls_data.get('totalPlan', 0.0),
        'totalSheetFact': clips_alls_data.get('totalSheetFact', 0.0),
        'qtyAllDevice': clips_alls_data.get('qtyAllDevice', 0),
        'qtyDoneDevice': clips_alls_data.get('qtyDoneDevice', 0),
        'qtyNotDoneDevice': clips_alls_data.get('qtyNotDoneDevice', 0),
        'clipAllPlant': clips_alls_data.get('clipAllPlant', '0.0%'),
        'clipAllPlantPct': clips_alls_data.get('clipAllPlantPct', 0.0),
        'items': clips_alls_data.get('items', []),
        'byDevice': clips_alls_data.get('byDevice', {})
    }

    history_data['snapshots'][target_month] = snapshot_new
    if target_month not in history_data['months']:
        history_data['months'].append(target_month)

    # Gắn trường history vào clips_alls_data
    clips_alls_data['history'] = history_data

    # 3. Ghi ra các file JSON và JS
    with open(CLIPS_ALLS_HISTORY_JSON_FILE, 'w', encoding='utf-8') as h_f:
        json.dump(history_data, h_f, indent=2, ensure_ascii=False)
    with open(CLIPS_ALLS_JSON_FILE, 'w', encoding='utf-8') as ca_f:
        json.dump(clips_alls_data, ca_f, indent=2, ensure_ascii=False)
    with open(CLIPS_ALLS_JS_FILE, 'w', encoding='utf-8') as ca_js:
        ca_js.write('// Tự động sinh từ Google Sheet Clip Alls - Kế hoạch tổng thể công đoạn Clips All\n')
        ca_js.write('// Đã lưu trữ lịch sử Plan theo từng tháng (Tháng 10/2026: 01/Oct - 31/Oct, Tháng 11/2026...)\n')
        ca_js.write('window.CLIPS_ALLS_HISTORY = ' + json.dumps(history_data, ensure_ascii=False) + ';\n')
        ca_js.write('window.CLIPS_ALLS_MASTER_DATA = ' + json.dumps(clips_alls_data, ensure_ascii=False) + ';\n')
        ca_js.write('if (window.CLIPS_ALLS_MASTER_DATA) { window.CLIPS_ALLS_MASTER_DATA.history = window.CLIPS_ALLS_HISTORY; }\n')

    elapsed = round(time.time() - t0, 2)
    print(f"✅ [Sync Clips All Only] Đã nạp thành công kỳ {target_month}: {clips_alls_data['totalItems']} mã, Plan {clips_alls_data['totalPlan']:,.0f} pcs trong {elapsed}s.")

    return {
        'success': True,
        'targetMonth': target_month,
        'monthLabel': snapshot_new['monthLabel'],
        'periodName': snapshot_new['periodName'],
        'totalItems': clips_alls_data['totalItems'],
        'totalPlan': clips_alls_data['totalPlan'],
        'totalSheetFact': clips_alls_data['totalSheetFact'],
        'qtyAllDevice': clips_alls_data['qtyAllDevice'],
        'qtyDoneDevice': clips_alls_data['qtyDoneDevice'],
        'qtyNotDoneDevice': clips_alls_data['qtyNotDoneDevice'],
        'clipAllPlant': clips_alls_data['clipAllPlant'],
        'months': history_data['months'],
        'elapsed': elapsed,
        'history': history_data,
        'clipsMaster': clips_alls_data
    }

if __name__ == '__main__':
    print('Starting manual Google Sheets Data_Mass sync...')
    res = sync_datamass()
    print('Sync result:', json.dumps(res, indent=2, ensure_ascii=False))
