#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Helper module for automatically pushing synchronized production data files to GitHub.
Only tracks and commits data files (never unfinished feature code).
"""

import base64
import hashlib
import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.request

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
    'overtime_adjustment_latest.json',
    'overtime_adjustment_history.json',
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

def _github_api_request(url, token, method='GET', payload=None, timeout=25):
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Ajax-ProPlan-MES-Sync',
    }
    data_bytes = None
    if payload is not None:
        headers['Content-Type'] = 'application/json; charset=utf-8'
        data_bytes = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode('utf-8')
        return json.loads(raw) if raw else {}


def _git_blob_sha(raw_bytes):
    header = f"blob {len(raw_bytes)}\0".encode('utf-8')
    return hashlib.sha1(header + raw_bytes).hexdigest()


def push_files_via_github_api(file_paths, commit_msg=None, max_retries=3):
    """
    Đẩy trực tiếp danh sách file dữ liệu chỉ định lên nhánh GitHub qua GitHub Git Data API.
    - KHÔNG chạm vào .git cục bộ (miễn nhiễm 100% với .git/index.lock, non-fast-forward).
    - TUYỆT ĐỐI KHÔNG bao giờ đẩy nhầm code UI Local chưa commit lên GitHub.
    - Tự động thử lại nếu GitHub Actions vừa push song song.
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

    valid_files = []
    for rel_path in (file_paths or []):
        norm_rel = str(rel_path).strip().replace('\\', '/')
        abs_path = os.path.join(WORKSPACE_DIR, norm_rel)
        if os.path.isfile(abs_path):
            with open(abs_path, 'rb') as f:
                raw = f.read()
            valid_files.append((norm_rel, raw, _git_blob_sha(raw)))

    if not valid_files:
        return {'pushed': False, 'reason': 'Không tìm thấy file hợp lệ để đồng bộ'}

    api_base = f"https://api.github.com/repos/{owner}/{repo}"
    now_str = time.strftime('%Y-%m-%d %H:%M:%S')
    final_msg = commit_msg or f"Auto-sync: Cập nhật dữ liệu sản xuất mới nhất [{now_str}]"

    with _GIT_PUSH_LOCK:
        last_err = ''
        for attempt in range(1, max_retries + 1):
            try:
                ref_data = _github_api_request(f"{api_base}/git/ref/heads/{branch}", token)
                head_sha = ref_data['object']['sha']

                commit_data = _github_api_request(f"{api_base}/git/commits/{head_sha}", token)
                base_tree_sha = commit_data['tree']['sha']

                tree_entries = []
                for norm_rel, raw, _local_sha in valid_files:
                    blob_resp = _github_api_request(
                        f"{api_base}/git/blobs",
                        token,
                        method='POST',
                        payload={
                            'content': base64.b64encode(raw).decode('ascii'),
                            'encoding': 'base64',
                        },
                        timeout=30,
                    )
                    tree_entries.append({
                        'path': norm_rel,
                        'mode': '100644',
                        'type': 'blob',
                        'sha': blob_resp['sha'],
                    })

                tree_resp = _github_api_request(
                    f"{api_base}/git/trees",
                    token,
                    method='POST',
                    payload={
                        'base_tree': base_tree_sha,
                        'tree': tree_entries,
                    },
                    timeout=30,
                )
                new_tree_sha = tree_resp['sha']
                if new_tree_sha == base_tree_sha:
                    print(f"[GitHub API Sync] ℹ️ {len(valid_files)} file trên GitHub đã khớp hoàn toàn bản mới nhất.")
                    return {
                        'pushed': True,
                        'no_changes': True,
                        'timestamp': now_str,
                        'files_updated': 0,
                        'sha': head_sha,
                    }

                new_commit = _github_api_request(
                    f"{api_base}/git/commits",
                    token,
                    method='POST',
                    payload={
                        'message': final_msg,
                        'tree': new_tree_sha,
                        'parents': [head_sha],
                    },
                    timeout=25,
                )
                new_commit_sha = new_commit['sha']

                _github_api_request(
                    f"{api_base}/git/refs/heads/{branch}",
                    token,
                    method='PATCH',
                    payload={
                        'sha': new_commit_sha,
                        'force': False,
                    },
                    timeout=25,
                )
                print(f"[GitHub API Sync] 🚀 ĐÃ ĐẨY {len(valid_files)} FILE LÊN GITHUB THÀNH CÔNG ({new_commit_sha[:8]}) [{now_str}]!")
                return {
                    'pushed': True,
                    'timestamp': now_str,
                    'files_updated': len(valid_files),
                    'sha': new_commit_sha,
                    'method': 'github_api',
                }
            except urllib.error.HTTPError as he:
                body = ''
                try:
                    body = he.read().decode('utf-8', errors='replace')
                except Exception:
                    pass
                last_err = f"HTTP {he.code}: {body}".replace(token, 'ghp_***')
                if he.code in (409, 422) and attempt < max_retries:
                    print(f"[GitHub API Sync] 🔄 Remote vừa có commit mới (lần {attempt}), thử lại sau 1s...")
                    time.sleep(1.0)
                    continue
                print(f"[GitHub API Sync] ⚠️ Lỗi push API: {last_err}")
                return {'pushed': False, 'error': last_err}
            except Exception as e:
                last_err = str(e).replace(token, 'ghp_***')
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                print(f"[GitHub API Sync] ⚠️ Lỗi push API: {last_err}")
                return {'pushed': False, 'error': last_err}

        return {'pushed': False, 'error': last_err or 'Unknown error'}


def push_overtime_plan_to_github(planner_name='', stage_name='', ot_count=None):
    """Đẩy tức thời 2 file kế hoạch & lịch sử Overtime lên GitHub qua GitHub API."""
    now_str = time.strftime('%Y-%m-%d %H:%M:%S')
    detail_parts = []
    if stage_name:
        detail_parts.append(str(stage_name))
    if planner_name:
        detail_parts.append(str(planner_name))
    if ot_count is not None:
        detail_parts.append(f"{ot_count} ca OT")
    suffix = f" ({' • '.join(detail_parts)})" if detail_parts else ""
    msg = f"Auto-sync: Cập nhật kế hoạch Overtime{suffix} [{now_str}]"
    return push_files_via_github_api(
        ['overtime_adjustment_latest.json', 'overtime_adjustment_history.json'],
        commit_msg=msg,
    )


def auto_push_data_to_github():
    """
    Kiểm tra nếu có dữ liệu sản xuất mới thay đổi thì tự động đồng bộ lên GitHub.
    Chỉ tác động đến các file data (DATA_FILE_PATHS), tuyệt đối không đụng vào code UI Local.
    Ưu tiên đẩy qua GitHub API khi working tree có file UI chưa commit hoặc có .git/index.lock.
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

    # Kiểm tra nhanh các file data có thay đổi so với git HEAD (hoặc nếu working tree có code UI Local thì đi thẳng API)
    try:
        proc_data = subprocess.run(
            ['git', 'status', '--porcelain'] + DATA_FILE_PATHS,
            cwd=WORKSPACE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        changed_data_files = []
        for line in proc_data.stdout.strip().splitlines():
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                changed_data_files.append(parts[1])

        proc_all = subprocess.run(
            ['git', 'status', '--porcelain', '--untracked-files=no'],
            cwd=WORKSPACE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        data_set = set(DATA_FILE_PATHS)
        has_non_data_changes = False
        for line in proc_all.stdout.strip().splitlines():
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2 and parts[1] not in data_set:
                has_non_data_changes = True
                break

        index_lock_exists = os.path.exists(os.path.join(WORKSPACE_DIR, '.git', 'index.lock'))
        if has_non_data_changes or index_lock_exists:
            target_files = changed_data_files if changed_data_files else [
                'overtime_adjustment_latest.json',
                'overtime_adjustment_history.json',
                'manpower_data.json',
                'sync_status.json',
            ]
            print(f"[GitHub Auto-Sync] 🌐 Đẩy trực tiếp {len(target_files)} file dữ liệu qua GitHub API (bảo vệ nguyên vẹn UI Local)...")
            return push_files_via_github_api(target_files)
    except Exception as pre_err:
        print(f"[GitHub Auto-Sync] ⚠️ Fallback sang GitHub API do lỗi kiểm tra git ({pre_err})")
        return push_files_via_github_api(DATA_FILE_PATHS)

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
