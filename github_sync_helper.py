#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Helper module for automatically pushing synchronized production data files to GitHub.
Only tracks and commits data files (never unfinished feature code).
"""

import json
import os
import subprocess
import threading
import time

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(WORKSPACE_DIR, 'sync_credentials.json')
_GIT_PUSH_LOCK = threading.Lock()

DATA_FILE_PATHS = [
    'js/datamass-data.js',
    'js/inventory-1c-data.js',
    'js/mass-history-data.js',
    'js/hardtest-capacity-data.js',
    'js/assembly-capacity-data.js',
    'js/clips-alls-data.js',
    'js/bom-data.js',
    'js/kpi-data.js',
    'manpower_data.json',
    'inventory_1c_data.json',
    'mass_history_data.json',
    'hardtest_data.json',
    'clips_alls_data.json',
    'clips_alls_history.json',
    'bom_data.json',
    'kpi_data.json',
    'sync_status.json',
    'assembly_completed_plan_latest.json',
    'assembly_plan_history.json',
    'cloud_sync_config.json'
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
    with _GIT_PUSH_LOCK:
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

            # 4. Push lên GitHub sử dụng Token an toàn (tự rebase nếu remote có commit đồng bộ mới)
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

            if proc_push.returncode != 0 and any(k in (proc_push.stderr or '').lower() for k in ('fetch first', 'non-fast-forward', 'rejected')):
                git_env = os.environ.copy()
                git_env['GIT_EDITOR'] = 'true'
                git_env['GIT_SEQUENCE_EDITOR'] = 'true'
                git_env['GIT_MERGE_AUTOEDIT'] = 'no'

                def _run_git(args, check=False, timeout=25):
                    return subprocess.run(
                        ['git'] + args,
                        cwd=WORKSPACE_DIR,
                        env=git_env,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        check=check,
                        timeout=timeout,
                    )

                # Chỉ đồng bộ nhánh khi không có file code đang sửa dở trong working tree
                clean_chk = _run_git(['status', '--porcelain', '--untracked-files=no'], timeout=10)
                if clean_chk.stdout.strip():
                    print("[GitHub Auto-Sync] ℹ️ Bỏ qua đồng bộ nhánh vì working tree có thay đổi chưa commit.")
                else:
                    fetch_proc = _run_git(['fetch', remote_url, branch], timeout=45)
                    if fetch_proc.returncode != 0:
                        print(f"[GitHub Auto-Sync] ⚠️ Lỗi fetch remote: {(fetch_proc.stderr or '').strip()}")
                    else:
                        data_set = set(DATA_FILE_PATHS)
                        mb_proc = _run_git(['merge-base', 'FETCH_HEAD', 'HEAD'], timeout=15)
                        mb_head = mb_proc.stdout.strip() if mb_proc.returncode == 0 else ''
                        subj_range = f"{mb_head}..HEAD" if mb_head else "FETCH_HEAD..HEAD"
                        subjects = [
                            s.strip()
                            for s in _run_git(['log', '--format=%s', subj_range], timeout=15).stdout.splitlines()
                            if s.strip()
                        ]
                        changed_files = [
                            f.strip()
                            for f in _run_git(['diff', '--name-only', subj_range], timeout=15).stdout.splitlines()
                            if f.strip()
                        ]

                        # Nhánh A: toàn bộ commit chưa đẩy chỉ là Auto-sync dữ liệu -> gộp nhanh lên đỉnh FETCH_HEAD, tránh merge conflict JSON lớn
                        if subjects and all(s.startswith('Auto-sync') for s in subjects) and all(f in data_set for f in changed_files):
                            orig_head = _run_git(['rev-parse', 'HEAD'], timeout=10).stdout.strip()
                            orig_msg = _run_git(['log', '-1', '--format=%s', orig_head], timeout=10).stdout.strip()
                            try:
                                print(f"[GitHub Auto-Sync] 🔄 Đồng bộ {len(subjects)} commit dữ liệu lên đầu FETCH_HEAD...")
                                _run_git(['reset', '--hard', 'FETCH_HEAD'], check=True, timeout=30)
                                ls_proc = _run_git(['ls-tree', '-r', '--name-only', orig_head, '--'] + list(DATA_FILE_PATHS), timeout=15)
                                restore_files = [p.strip() for p in ls_proc.stdout.splitlines() if p.strip()]
                                if restore_files:
                                    _run_git(['checkout', orig_head, '--'] + restore_files, check=True, timeout=30)
                                if _run_git(['diff', '--cached', '--quiet'], timeout=15).returncode != 0:
                                    _run_git(['commit', '-m', orig_msg], check=True, timeout=30)
                                    proc_push = subprocess.run(push_cmd, cwd=WORKSPACE_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
                                else:
                                    print("[GitHub Auto-Sync] ℹ️ Dữ liệu trên GitHub đã khớp hoàn toàn bản mới nhất.")
                                    proc_push = subprocess.CompletedProcess(push_cmd, 0, stdout='', stderr='')
                            except Exception as sync_err:
                                print(f"[GitHub Auto-Sync] ⚠️ Lỗi gộp Auto-sync ({sync_err}), đang khôi phục HEAD...")
                                if orig_head:
                                    _run_git(['reset', '--hard', orig_head], timeout=30)
                        else:
                            # Nhánh B: có commit code/thủ công cục bộ -> rebase tuần tự từng commit, chỉ auto-resolve conflict thuộc DATA_FILE_PATHS
                            reb = _run_git(['rebase', 'FETCH_HEAD'], timeout=45)
                            for _ in range(15):
                                if reb.returncode == 0:
                                    break
                                conf_files = [
                                    c.strip()
                                    for c in _run_git(['diff', '--name-only', '--diff-filter=U'], timeout=15).stdout.splitlines()
                                    if c.strip()
                                ]
                                if conf_files:
                                    if all(cf in data_set for cf in conf_files):
                                        _run_git(['checkout', '--theirs', '--'] + conf_files, check=True, timeout=20)
                                        _run_git(['add', '--'] + conf_files, check=True, timeout=20)
                                    else:
                                        _run_git(['rebase', '--abort'], timeout=15)
                                        break
                                elif 'empty' not in ((reb.stdout or '') + (reb.stderr or '')).lower():
                                    _run_git(['rebase', '--abort'], timeout=15)
                                    break
                                reb = _run_git(['-c', 'core.editor=true', 'rebase', '--continue'], timeout=30)
                                if reb.returncode != 0 and 'empty' in ((reb.stdout or '') + (reb.stderr or '')).lower():
                                    reb = _run_git(['rebase', '--skip'], timeout=25)
                            if reb.returncode == 0:
                                proc_push = subprocess.run(push_cmd, cwd=WORKSPACE_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
                            else:
                                _run_git(['rebase', '--abort'], timeout=15)

            if proc_push.returncode != 0:
                err_msg = proc_push.stderr.strip()
                # Giấu token khỏi log lỗi để bảo mật
                clean_err = err_msg.replace(token, 'ghp_***')
                print(f"[GitHub Auto-Sync] ⚠️ Lỗi push: {clean_err}")
                return {'pushed': False, 'error': clean_err}

            subprocess.run(['git', 'update-ref', f'refs/remotes/origin/{branch}', 'HEAD'], cwd=WORKSPACE_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
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
