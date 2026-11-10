#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Helper module for automatically pushing synchronized production data files to GitHub.
Only tracks and commits data files (never unfinished feature code).
"""

import json
import os
import subprocess
import time

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(WORKSPACE_DIR, 'sync_credentials.json')

DATA_FILE_PATHS = [
    'js/datamass-data.js',
    'js/inventory-1c-data.js',
    'js/mass-history-data.js',
    'js/hardtest-capacity-data.js',
    'js/assembly-capacity-data.js',
    'js/clips-alls-data.js',
    'js/kpi-data.js',
    'manpower_data.json',
    'inventory_1c_data.json',
    'mass_history_data.json',
    'hardtest_data.json',
    'clips_alls_data.json',
    'clips_alls_history.json',
    'kpi_data.json',
    'sync_status.json'
]

def load_credentials():
    if not os.path.exists(CREDENTIALS_FILE):
        return None
    try:
        with open(CREDENTIALS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[GitHub Auto-Sync] ⚠️ Lỗi đọc {CREDENTIALS_FILE}: {e}")
        return None

def auto_push_data_to_github():
    """
    Kiểm tra nếu có dữ liệu sản xuất mới thay đổi thì tự động commit và push lên GitHub.
    Chỉ tác động đến các file data, tuyệt đối không đụng vào code tính năng chưa hoàn thiện.
    """
    creds = load_credentials()
    if not creds or not creds.get('auto_push_data_enabled'):
        return {'pushed': False, 'reason': 'Auto push disabled or credentials not found'}

    token = creds.get('token', '').strip()
    owner = creds.get('repo_owner', 'buianhtuan-design').strip()
    repo = creds.get('repo_name', 'Production-Systems-WCAB').strip()
    branch = creds.get('branch', 'main').strip()

    if not token:
        return {'pushed': False, 'reason': 'GitHub token is missing'}

    # 1. Kiểm tra trạng thái git của các file dữ liệu
    try:
        cmd_status = ['git', 'status', '--porcelain'] + DATA_FILE_PATHS
        proc_status = subprocess.run(
            cmd_status,
            cwd=WORKSPACE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        changed_lines = proc_status.stdout.strip().splitlines()
        if not changed_lines:
            return {'pushed': False, 'reason': 'Dữ liệu không có thay đổi, không cần push'}

        print(f"[GitHub Auto-Sync] 📦 Phát hiện {len(changed_lines)} file dữ liệu thay đổi, chuẩn bị đẩy lên GitHub...")

        # 2. Chỉ stage các file dữ liệu có thay đổi
        files_to_add = []
        for line in changed_lines:
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                files_to_add.append(parts[1])

        if not files_to_add:
            files_to_add = DATA_FILE_PATHS

        cmd_add = ['git', 'add'] + files_to_add
        subprocess.run(cmd_add, cwd=WORKSPACE_DIR, check=True, timeout=15)

        # 3. Commit dữ liệu mới
        now_str = time.strftime('%Y-%m-%d %H:%M:%S')
        commit_msg = f"Auto-sync: Cập nhật dữ liệu sản xuất mới nhất [{now_str}]"
        subprocess.run(
            ['git', 'commit', '-m', commit_msg],
            cwd=WORKSPACE_DIR,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )

        # 4. Push lên GitHub sử dụng Token an toàn
        remote_url = f"https://{owner}:{token}@github.com/{owner}/{repo}.git"
        push_cmd = ['git', 'push', remote_url, branch]
        proc_push = subprocess.run(
            push_cmd,
            cwd=WORKSPACE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )

        if proc_push.returncode != 0:
            err_msg = proc_push.stderr.strip()
            # Giấu token khỏi log lỗi để bảo mật
            clean_err = err_msg.replace(token, 'ghp_***')
            print(f"[GitHub Auto-Sync] ⚠️ Lỗi push: {clean_err}")
            return {'pushed': False, 'error': clean_err}

        print(f"[GitHub Auto-Sync] 🚀 ĐÃ TỰ ĐỘNG ĐẨY DỮ LIỆU LÊN GITHUB THÀNH CÔNG [{now_str}]!")
        return {
            'pushed': True,
            'timestamp': now_str,
            'files_updated': len(files_to_add)
        }

    except Exception as e:
        err_str = str(e).replace(token, 'ghp_***')
        print(f"[GitHub Auto-Sync] ⚠️ Lỗi khi đồng bộ lên GitHub: {err_str}")
        return {'pushed': False, 'error': err_str}

if __name__ == '__main__':
    res = auto_push_data_to_github()
    print("Test Auto-Push Result:", res)
